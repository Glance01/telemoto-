import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  InAppCallSession,
  CallStatus,
  inAppCallManager,
  markMissedCallsAsViewed,
} from '../services/callService';
import { callAudioSynthesizer } from '../services/callAudioSynthesizer';

interface CallContextType {
  activeCall: InAppCallSession | null;
  incomingCall: InAppCallSession | null;
  isCalling: boolean;
  callDuration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  missedCallsCount: number;
  clearMissedCalls: () => Promise<void>;
  startCall: (params: {
    tripId: string;
    receiverId: string;
    receiverName: string;
    receiverRole: 'passenger' | 'driver';
    receiverPhoto?: string;
  }) => Promise<void>;
  answerCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
}

const CallContext = createContext<CallContextType>({} as CallContextType);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, role } = useAuth();
  const [activeCall, setActiveCall] = useState<InAppCallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<InAppCallSession | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [missedCallsCount, setMissedCallsCount] = useState<number>(0);

  const timerRef = useRef<any>(null);
  const activeCallIdRef = useRef<string | null>(null);

  // Subscribe to unviewed missed calls for current user
  useEffect(() => {
    if (!user) {
      setMissedCallsCount(0);
      return;
    }

    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      where('receiverId', '==', user.uid),
      where('receiverViewed', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const missed = snapshot.docs.filter((d) => {
        const data = d.data() as InAppCallSession;
        return data.status === 'missed' || data.status === 'declined' || !data.connectedAt;
      });
      setMissedCallsCount(missed.length);
    }, (err) => {
      console.warn('Missed call listener error:', err);
    });

    return () => unsubscribe();
  }, [user]);

  const clearMissedCalls = async () => {
    if (!user) return;
    setMissedCallsCount(0);
    await markMissedCallsAsViewed(user.uid);
  };

  // Keep active call ref in sync
  useEffect(() => {
    activeCallIdRef.current = activeCall ? activeCall.id : null;
  }, [activeCall]);

  // Duration timer for connected calls
  useEffect(() => {
    if (activeCall && activeCall.status === 'connected') {
      const startTime = activeCall.connectedAt || Date.now();
      timerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeCall?.status, activeCall?.connectedAt]);

  // Listen for incoming calls where receiverId === user.uid
  useEffect(() => {
    if (!user) {
      setIncomingCall(null);
      return;
    }

    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      where('receiverId', '==', user.uid),
      where('status', 'in', ['calling', 'ringing'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const firstDoc = snapshot.docs[0];
        const callData = firstDoc.data() as InAppCallSession;
        setIncomingCall(callData);
        // Start ringtone
        callAudioSynthesizer.startIncomingRingtone();
      } else {
        setIncomingCall(null);
        if (!activeCallIdRef.current) {
          callAudioSynthesizer.stopIncomingRingtone();
        }
      }
    }, (err) => {
      console.warn('Incoming call listener error:', err);
    });

    return () => {
      unsubscribe();
      callAudioSynthesizer.stopIncomingRingtone();
    };
  }, [user]);

  // Listen to active call changes (status updates by peer)
  useEffect(() => {
    if (!activeCall?.id) return;

    const callDocRef = doc(db, 'calls', activeCall.id);
    const unsubscribe = onSnapshot(callDocRef, (snap) => {
      if (snap.exists()) {
        const updated = snap.data() as InAppCallSession;
        setActiveCall(updated);

        if (updated.status === 'connected') {
          callAudioSynthesizer.stopAll();
        } else if (
          updated.status === 'ended' ||
          updated.status === 'declined' ||
          updated.status === 'missed'
        ) {
          callAudioSynthesizer.stopAll();
          callAudioSynthesizer.playCallEndedTone();
          inAppCallManager.cleanup();
          setTimeout(() => {
            setActiveCall(null);
          }, 1500);
        }
      } else {
        setActiveCall(null);
        callAudioSynthesizer.stopAll();
        inAppCallManager.cleanup();
      }
    });

    return () => unsubscribe();
  }, [activeCall?.id]);

  const startCall = async (params: {
    tripId: string;
    receiverId: string;
    receiverName: string;
    receiverRole: 'passenger' | 'driver';
    receiverPhoto?: string;
  }) => {
    if (!user) return;

    const callerName = userProfile?.fullName || (role === 'driver' ? 'Motorista TeleMoto+' : 'Passageiro');
    const callerPhoto = userProfile?.photoUrl || undefined;

    const callId = await inAppCallManager.startCall({
      tripId: params.tripId,
      callerId: user.uid,
      callerName,
      callerRole: (role === 'driver' ? 'driver' : 'passenger'),
      callerPhoto,
      receiverId: params.receiverId,
      receiverName: params.receiverName,
      receiverRole: params.receiverRole,
      receiverPhoto: params.receiverPhoto,
    });

    const session: InAppCallSession = {
      id: callId,
      tripId: params.tripId,
      callerId: user.uid,
      callerName,
      callerRole: (role === 'driver' ? 'driver' : 'passenger'),
      callerPhoto,
      receiverId: params.receiverId,
      receiverName: params.receiverName,
      receiverRole: params.receiverRole,
      receiverPhoto: params.receiverPhoto,
      status: 'calling',
      startedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setActiveCall(session);
    setIsMuted(false);
    setIsSpeakerOn(true);
  };

  const answerCall = async () => {
    if (!incomingCall) return;
    const callToAnswer = { ...incomingCall };
    setIncomingCall(null);
    callAudioSynthesizer.stopIncomingRingtone();
    setActiveCall(callToAnswer);
    await inAppCallManager.answerCall(callToAnswer);
  };

  const declineCall = async () => {
    if (!incomingCall) return;
    const callToDecline = incomingCall;
    setIncomingCall(null);
    callAudioSynthesizer.stopIncomingRingtone();
    await inAppCallManager.declineCall(callToDecline.id);
  };

  const endCall = async () => {
    if (!activeCall) return;
    const callToEnd = activeCall;
    setActiveCall(null);
    await inAppCallManager.endCall(callToEnd);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    inAppCallManager.toggleMicrophone(nextMuted);
    setIsMuted(nextMuted);
  };

  const toggleSpeaker = () => {
    const nextSpeaker = !isSpeakerOn;
    inAppCallManager.toggleSpeaker(nextSpeaker);
    setIsSpeakerOn(nextSpeaker);
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        isCalling: !!activeCall || !!incomingCall,
        callDuration,
        isMuted,
        isSpeakerOn,
        missedCallsCount,
        clearMissedCalls,
        startCall,
        answerCall,
        declineCall,
        endCall,
        toggleMute,
        toggleSpeaker,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);

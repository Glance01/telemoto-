import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  limit,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { callAudioSynthesizer } from './callAudioSynthesizer';
import { notifyMissedCall } from './notificationService';
import { removeUndefinedFields } from '../utils/firestoreHelper';

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'declined'
  | 'missed'
  | 'busy';

export interface InAppCallSession {
  id: string;
  tripId: string;
  callerId: string;
  callerName: string;
  callerRole: 'passenger' | 'driver';
  callerPhoto?: string;
  receiverId: string;
  receiverName: string;
  receiverRole: 'passenger' | 'driver';
  receiverPhoto?: string;
  status: CallStatus;
  startedAt: number;
  connectedAt?: number;
  endedAt?: number;
  durationSec?: number;
  isMuted?: boolean;
  isSpeakerOn?: boolean;
  sdpOffer?: string;
  sdpAnswer?: string;
  receiverViewed?: boolean;
  createdAt: number;
  updatedAt: number;
}

// WebRTC Peer Connection Configuration with Google STUN
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

class InAppCallManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;
    }
  }

  /**
   * Initializes local microphone stream
   */
  private async getLocalMicrophone(): Promise<MediaStream | null> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        this.localStream = stream;
        return stream;
      }
    } catch (err) {
      console.warn('Microphone permission not granted or unavailable:', err);
    }
    return null;
  }

  /**
   * Initiates a new In-App VoIP Call via Internet
   */
  async startCall(params: {
    tripId: string;
    callerId: string;
    callerName: string;
    callerRole: 'passenger' | 'driver';
    callerPhoto?: string;
    receiverId: string;
    receiverName: string;
    receiverRole: 'passenger' | 'driver';
    receiverPhoto?: string;
  }): Promise<string> {
    callAudioSynthesizer.stopAll();
    callAudioSynthesizer.startOutgoingRingback();

    const callsRef = collection(db, 'calls');
    const newCallDoc = doc(callsRef);
    const now = Date.now();

    const newCall: InAppCallSession = {
      id: newCallDoc.id,
      tripId: params.tripId,
      callerId: params.callerId,
      callerName: params.callerName,
      callerRole: params.callerRole,
      callerPhoto: params.callerPhoto,
      receiverId: params.receiverId,
      receiverName: params.receiverName,
      receiverRole: params.receiverRole,
      receiverPhoto: params.receiverPhoto,
      status: 'calling',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Prepare WebRTC offer
    try {
      const stream = await this.getLocalMicrophone();
      if (typeof RTCPeerConnection !== 'undefined') {
        this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

        if (stream) {
          stream.getTracks().forEach((track) => {
            this.peerConnection?.addTrack(track, stream);
          });
        }

        this.peerConnection.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            this.remoteStream = event.streams[0];
            if (this.audioElement) {
              this.audioElement.srcObject = event.streams[0];
              this.audioElement.play().catch(() => {});
            }
          }
        };

        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await this.peerConnection.setLocalDescription(offer);
        newCall.sdpOffer = JSON.stringify(offer);
      }
    } catch (webrtcErr) {
      console.warn('WebRTC initialization optional fallback active:', webrtcErr);
    }

    await setDoc(newCallDoc, removeUndefinedFields(newCall));
    return newCallDoc.id;
  }

  /**
   * Accepts an incoming In-App Call
   */
  async answerCall(call: InAppCallSession): Promise<void> {
    callAudioSynthesizer.stopAll();
    callAudioSynthesizer.playConnectedChime();

    const now = Date.now();
    const callRef = doc(db, 'calls', call.id);

    try {
      const stream = await this.getLocalMicrophone();
      if (typeof RTCPeerConnection !== 'undefined') {
        this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

        if (stream) {
          stream.getTracks().forEach((track) => {
            this.peerConnection?.addTrack(track, stream);
          });
        }

        this.peerConnection.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            this.remoteStream = event.streams[0];
            if (this.audioElement) {
              this.audioElement.srcObject = event.streams[0];
              this.audioElement.play().catch(() => {});
            }
          }
        };

        if (call.sdpOffer) {
          const remoteOffer = JSON.parse(call.sdpOffer);
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer));
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);

          await updateDoc(callRef, {
            status: 'connected',
            connectedAt: now,
            sdpAnswer: JSON.stringify(answer),
            updatedAt: now,
          });
          return;
        }
      }
    } catch (err) {
      console.warn('WebRTC answer fallback:', err);
    }

    await updateDoc(callRef, {
      status: 'connected',
      connectedAt: now,
      updatedAt: now,
    });
  }

  /**
   * Declines an incoming call
   */
  async declineCall(callId: string): Promise<void> {
    callAudioSynthesizer.stopAll();
    this.cleanup();

    try {
      const callRef = doc(db, 'calls', callId);
      const snap = await getDoc(callRef);
      if (snap.exists()) {
        const callData = snap.data() as InAppCallSession;
        await updateDoc(callRef, {
          status: 'declined',
          receiverViewed: false,
          endedAt: Date.now(),
          updatedAt: Date.now(),
        });

        notifyMissedCall({
          recipientId: callData.receiverId,
          callerName: callData.callerName,
          callerRole: callData.callerRole,
          tripId: callData.tripId,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to decline call:', err);
    }
  }

  /**
   * Ends an active call or hangs up
   */
  async endCall(call: InAppCallSession): Promise<void> {
    callAudioSynthesizer.stopAll();
    callAudioSynthesizer.playCallEndedTone();
    this.cleanup();

    const now = Date.now();
    const duration = call.connectedAt ? Math.floor((now - call.connectedAt) / 1000) : 0;
    const isMissed = !call.connectedAt;

    try {
      const callRef = doc(db, 'calls', call.id);
      await updateDoc(callRef, {
        status: isMissed ? 'missed' : 'ended',
        receiverViewed: isMissed ? false : true,
        endedAt: now,
        durationSec: duration,
        updatedAt: now,
      });

      if (isMissed) {
        notifyMissedCall({
          recipientId: call.receiverId,
          callerName: call.callerName,
          callerRole: call.callerRole,
          tripId: call.tripId,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to end call:', err);
    }
  }

  /**
   * Toggle local microphone mute state
   */
  toggleMicrophone(muted: boolean): boolean {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    return !muted;
  }

  /**
   * Toggle speaker / volume output
   */
  toggleSpeaker(speakerOn: boolean): boolean {
    if (this.audioElement) {
      this.audioElement.volume = speakerOn ? 1.0 : 0.4;
    }
    return speakerOn;
  }

  /**
   * Clean up local WebRTC audio tracks & connections
   */
  cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => t.stop());
      this.remoteStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.audioElement) {
      this.audioElement.srcObject = null;
    }
  }
}

export const inAppCallManager = new InAppCallManager();

/**
 * Clears/marks missed calls as viewed for a user
 */
export async function markMissedCallsAsViewed(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', userId),
      where('receiverViewed', '==', false)
    );
    const snap = await getDocs(q);
    const promises = snap.docs.map((d) => updateDoc(d.ref, { receiverViewed: true }));
    await Promise.all(promises);
  } catch (err) {
    console.warn('Could not mark missed calls as viewed:', err);
  }
}

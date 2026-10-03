import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  Trip,
  DriverProfile,
  ChatMessage,
  LocationPoint,
  TripFareBreakdown,
  PaymentMethodType,
  PlatformPricing,
} from '../types';
import {
  createTripRequest,
  cancelTrip,
  sendChatMessage,
  findNearbyDrivers,
  acceptTrip,
  updateTripStatus,
} from '../services/rideService';
import { calculateFare, calculateHaversineDistance, DEFAULT_PRICING } from '../services/pricingService';
import {
  handlePassengerCancellationPenalty,
  handleDriverCancellationPenalty,
} from '../services/antiAbuseService';
import { DEFAULT_CENTER } from '../lib/googleMaps';
import { getDistrictCoordinates, addCoordinateJitter } from '../lib/mozambiqueLocations';
import {
  showWebPushNotification,
  playNotificationSound,
  triggerHapticFeedback,
  requestWebNotificationPermission,
} from '../services/notificationService';

interface RideContextType {
  activeTrip: Trip | null;
  nearbyDrivers: DriverProfile[];
  messages: ChatMessage[];
  originPoint: LocationPoint | null;
  destinationPoint: LocationPoint | null;
  selectedSpot: string;
  selectedProvince: string;
  selectedDistrict: string;
  distanceKm: number;
  estimatedDurationMin: number;
  fareBreakdown: TripFareBreakdown | null;
  paymentMethod: PaymentMethodType;
  isSearching: boolean;
  searchTimedOut: boolean;
  searchTimeRemaining: number;
  setSearchTimedOut: (val: boolean) => void;
  updateCalculatedRoute: (distKm: number, durMin: number) => void;
  pushPermission: NotificationPermission | 'unsupported';
  requestPushPermission: () => Promise<NotificationPermission>;
  setOriginPoint: (point: LocationPoint | null) => void;
  setDestinationPoint: (point: LocationPoint | null) => void;
  setSelectedSpot: (spot: string) => void;
  setSelectedProvince: (prov: string) => void;
  setSelectedDistrict: (dist: string) => void;
  setPaymentMethod: (method: PaymentMethodType) => void;
  requestRide: (preferredDriver?: DriverProfile) => Promise<string | null>;
  cancelCurrentTrip: (reason?: string) => Promise<boolean>;
  sendMessage: (text: string) => Promise<void>;
  refreshNearbyDrivers: (lat: number, lng: number, province?: string, district?: string) => Promise<void>;
}

const RideContext = createContext<RideContextType>({} as RideContextType);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, role, updateUserProfile } = useAuth();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<DriverProfile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchTimedOut, setSearchTimedOut] = useState<boolean>(false);
  const [searchTimeRemaining, setSearchTimeRemaining] = useState<number>(300); // 5 minutes (300s)

  // Push notification permission state
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const prevTripStatusRef = useRef<string | null>(null);
  const prevTripIdRef = useRef<string | null>(null);

  // Search & booking state
  const [pricingConfig, setPricingConfig] = useState<PlatformPricing>(DEFAULT_PRICING);
  const [selectedProvince, setSelectedProvince] = useState<string>('Inhambane');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Massinga');
  const [originPoint, setOriginPoint] = useState<LocationPoint | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<LocationPoint | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<string>('Paragem');
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [estimatedDurationMin, setEstimatedDurationMin] = useState<number>(0);
  const [fareBreakdown, setFareBreakdown] = useState<TripFareBreakdown | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Subscribe to real-time pricing configurations set by the Admin
  useEffect(() => {
    const docRef = doc(db, 'pricing', 'default');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setPricingConfig(snap.data() as PlatformPricing);
      }
    }, (err) => {
      console.warn('Could not listen to pricing configuration, using default values:', err);
    });
    return () => unsubscribe();
  }, []);

  const requestPushPermission = async (): Promise<NotificationPermission> => {
    const result = await requestWebNotificationPermission();
    setPushPermission(result);
    return result;
  };

  // Recalculate distance and fare when points change or pricing is modified
  useEffect(() => {
    if (originPoint && destinationPoint) {
      // Calculate Haversine road estimate
      const R = 6371;
      const dLat = ((destinationPoint.lat - originPoint.lat) * Math.PI) / 180;
      const dLon = ((destinationPoint.lng - originPoint.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((originPoint.lat * Math.PI) / 180) *
          Math.cos((destinationPoint.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = Math.max(0.8, Math.round(R * c * 1.35 * 10) / 10);
      const duration = Math.max(3, Math.round(dist * 2.5));

      setDistanceKm(dist);
      setEstimatedDurationMin(duration);
      
      let baseFareObj = calculateFare(dist, pricingConfig);
      const penalty = userProfile?.pendingPenaltyFee || 0;
      if (penalty > 0) {
        baseFareObj = {
          ...baseFareObj,
          totalFare: baseFareObj.totalFare + penalty,
          driverNetEarnings: baseFareObj.driverNetEarnings + penalty,
        };
      }
      setFareBreakdown(baseFareObj);
    } else {
      setDistanceKm(0);
      setEstimatedDurationMin(0);
      setFareBreakdown(null);
    }
  }, [originPoint, destinationPoint, pricingConfig, userProfile?.pendingPenaltyFee]);

  const updateCalculatedRoute = (distKm: number, durMin: number) => {
    if (distKm > 0) {
      setDistanceKm(distKm);
      setEstimatedDurationMin(durMin);
      let baseFareObj = calculateFare(distKm, pricingConfig);
      const penalty = userProfile?.pendingPenaltyFee || 0;
      if (penalty > 0) {
        baseFareObj = {
          ...baseFareObj,
          totalFare: baseFareObj.totalFare + penalty,
          driverNetEarnings: baseFareObj.driverNetEarnings + penalty,
        };
      }
      setFareBreakdown(baseFareObj);
    }
  };

  // Listen to active trip for current user and trigger Web Push when driver accepts
  useEffect(() => {
    if (!user) {
      setActiveTrip(null);
      prevTripStatusRef.current = null;
      prevTripIdRef.current = null;
      return;
    }

    const tripsRef = collection(db, 'trips');
    const fieldToMatch = role === 'driver' ? 'driverId' : 'passengerId';
    const q = query(
      tripsRef,
      where(fieldToMatch, '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const trip = snapshot.docs[0].data() as Trip;
        const terminalStates = [
          'paid',
          'cancelled_by_passenger',
          'cancelled_by_driver',
          'cancelled_by_system',
        ];

        // Zero-cost Push Notification for Passenger when Driver Accepts or Updates Status
        if (role === 'passenger' || !role) {
          const prevStatus = prevTripStatusRef.current;
          const isSameTrip = prevTripIdRef.current === trip.id;

          // Event 1: Driver accepts the ride
          if (
            (trip.status === 'driver_assigned' || trip.status === 'driver_arriving') &&
            (prevStatus === 'searching_driver' || prevStatus === 'requested' || (!isSameTrip && trip.driverId))
          ) {
            const driverName = trip.driverName || 'O seu moto-taxista';
            const motoInfo = trip.bikeBrand ? `[${trip.bikeBrand} ${trip.bikeModel || ''} - ${trip.plateNumber || ''}]` : '';

            showWebPushNotification(`🏍️ Corrida Aceite por ${driverName}!`, {
              body: `${driverName} aceitou o teu pedido e está a caminho ${motoInfo}. Abre o TeleMoto+ para ver no mapa.`,
              tag: `driver-accepted-${trip.id}`,
              data: { tripId: trip.id },
            });
            playNotificationSound('success');
            triggerHapticFeedback([250, 100, 250, 100, 300]);
          }

          // Event 2: Driver arrived at pickup
          if (trip.status === 'driver_arrived' && prevStatus !== 'driver_arrived') {
            const driverName = trip.driverName || 'O seu motorista';
            showWebPushNotification(`🏁 ${driverName} Chegou ao Ponto de Encontro!`, {
              body: `O condutor já está no local de partida com a mota ${trip.plateNumber || ''}. Vá ter com ele com segurança.`,
              tag: `driver-arrived-${trip.id}`,
              data: { tripId: trip.id },
            });
            playNotificationSound('alert');
            triggerHapticFeedback([300, 100, 300]);
          }

          // Event 3: Trip completed
          if (trip.status === 'trip_completed' && prevStatus !== 'trip_completed') {
            showWebPushNotification(`✅ Viagem Concluída!`, {
              body: `Chegou ao seu destino. Valor a pagar: ${trip.fareAmount} MT (Pagamento em Mão / Dinheiro Vivo).`,
              tag: `trip-completed-${trip.id}`,
              data: { tripId: trip.id },
            });
            playNotificationSound('success');
          }

          prevTripStatusRef.current = trip.status;
          prevTripIdRef.current = trip.id;
        }

        // If trip is still active or in rating phase, keep it
        if (!terminalStates.includes(trip.status) || (trip.status === 'paid' && !trip.passengerRated)) {
          setActiveTrip(trip);
          setIsSearching(trip.status === 'searching_driver');
        } else {
          setActiveTrip(null);
          setIsSearching(false);
          prevTripStatusRef.current = null;
        }
      } else {
        setActiveTrip(null);
        setIsSearching(false);
        prevTripStatusRef.current = null;
      }
    });

    return () => unsubscribe();
  }, [user, role]);

  // 5-minute search timeout monitoring
  useEffect(() => {
    if (
      !activeTrip ||
      activeTrip.status !== 'searching_driver' ||
      (activeTrip.driverId && activeTrip.biddingStatus === 'accepted')
    ) {
      setSearchTimeRemaining(300);
      return;
    }

    const checkTimeout = () => {
      const now = Date.now();
      const elapsedSec = Math.floor((now - activeTrip.createdAt) / 1000);
      const remaining = Math.max(0, 300 - elapsedSec);
      setSearchTimeRemaining(remaining);

      if (remaining <= 0) {
        // 5 minutes reached without accepted driver!
        cancelTrip(activeTrip.id, 'system', 'no_drivers_available');
        setSearchTimedOut(true);
        setActiveTrip(null);
        setIsSearching(false);
      }
    };

    checkTimeout();
    const timer = setInterval(checkTimeout, 1000);
    return () => clearInterval(timer);
  }, [activeTrip]);

  // Listen to messages for active trip
  useEffect(() => {
    if (!activeTrip) {
      setMessages([]);
      return;
    }

    const msgRef = collection(db, 'messages');
    const q = query(
      msgRef,
      where('tripId', '==', activeTrip.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        msgs.push(docSnap.data() as ChatMessage);
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeTrip?.id]);

  // Real-time synchronization of registered drivers from Firestore
  useEffect(() => {
    const driversRef = collection(db, 'drivers');
    const unsubscribe = onSnapshot(driversRef, (snapshot) => {
      const targetProv = (selectedProvince || userProfile?.province || 'Inhambane').trim();
      const targetDist = (selectedDistrict || userProfile?.city || userProfile?.district || 'Massinga').trim();
      const distCoords = getDistrictCoordinates(targetProv, targetDist);
      const currentLat = originPoint?.lat ?? distCoords.lat;
      const currentLng = originPoint?.lng ?? distCoords.lng;

      const clean = (str: string) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      const cleanTargetProv = clean(targetProv);
      const cleanTargetDist = clean(targetDist);

      const list: DriverProfile[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DriverProfile;

        // 1. Never show the current logged-in passenger as a driver to themselves
        if (user?.uid && (data.id === user.uid || data.userId === user.uid)) {
          return;
        }

        // 2. Strictly only real approved drivers (filter out any demo/mock entries)
        if (
          data.fullName &&
          data.id &&
          !data.id.startsWith('driver_') &&
          !data.email?.endsWith('@telemoto.mz') &&
          data.status === 'approved'
        ) {
          const driverProv = clean(data.province || '');
          const driverDist = clean(data.district || data.city || '');

          // Check District & Province Match
          const isDistMatch = driverDist && cleanTargetDist &&
            (driverDist.includes(cleanTargetDist) || cleanTargetDist.includes(driverDist));
          const isProvMatch = !driverProv || !cleanTargetProv ||
            (driverProv.includes(cleanTargetProv) || cleanTargetProv.includes(driverProv));

          // If driver coordinates are missing/empty, default to driver's OWN registered district coordinates
          let dLat = data.currentLat;
          let dLng = data.currentLng;

          if (!dLat || !dLng) {
            const districtCoords = getDistrictCoordinates(data.province || selectedProvince || 'Inhambane', data.district || data.city || selectedDistrict || 'Massinga');
            dLat = districtCoords.lat;
            dLng = districtCoords.lng;
          }

          const distKm = calculateHaversineDistance(currentLat, currentLng, dLat, dLng);

          // STRICT REGIONAL FILTER:
          // A driver appears ONLY if (District Match AND Province Match) OR (Same Province AND distance <= 15 km)
          if ((isDistMatch && isProvMatch) || (isProvMatch && distKm <= 15)) {
            list.push({
              ...data,
              currentLat: dLat,
              currentLng: dLng,
              distance: Math.round(distKm * 10) / 10,
            });
          }
        }
      });

      list.sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return (a.distance || 0) - (b.distance || 0);
      });

      setNearbyDrivers(list);
    }, (err) => {
      console.warn('Real-time drivers listener error:', err);
    });

    return () => unsubscribe();
  }, [originPoint?.lat, originPoint?.lng, selectedProvince, selectedDistrict, user?.uid, userProfile?.city, userProfile?.district, userProfile?.province]);

  const refreshNearbyDrivers = async (lat: number, lng: number, province?: string, district?: string) => {
    const prov = province || selectedProvince || userProfile?.province || 'Inhambane';
    const dist = district || selectedDistrict || userProfile?.city || userProfile?.district || 'Massinga';
    if (province) setSelectedProvince(province);
    if (district) setSelectedDistrict(district);
    const list = await findNearbyDrivers(lat, lng, 15, user?.uid, dist, prov);
    setNearbyDrivers(list);
  };

  // Real-time trip status synchronization is handled via Firestore listener on 'trips' collection

  const requestRide = async (preferredDriver?: DriverProfile): Promise<string | null> => {
    if (!user || !userProfile || !originPoint || !destinationPoint || !fareBreakdown) {
      return null;
    }

    setSearchTimedOut(false);
    setSearchTimeRemaining(300);
    setIsSearching(true);
    try {
      const tripId = await createTripRequest({
        passengerId: user.uid,
        passengerName: userProfile.fullName,
        passengerPhone: userProfile.phone,
        passengerPhoto: userProfile.photoUrl,
        origin: { ...originPoint, spotType: selectedSpot },
        destination: destinationPoint,
        distanceKm,
        estimatedDurationMin,
        fareBreakdown,
        paymentMethod,
        preferredDriver,
      });
      if (tripId && updateUserProfile) {
        // Clear pending penalty fee after successful creation
        await updateUserProfile({ pendingPenaltyFee: 0 });
      }
      return tripId;
    } catch (err) {
      console.error('Failed to request ride:', err);
      setIsSearching(false);
      return null;
    }
  };

  const cancelCurrentTrip = async (reason?: string): Promise<boolean> => {
    if (!activeTrip) return false;
    const cancelledBy = role === 'driver' ? 'driver' : 'passenger';
    const success = await cancelTrip(activeTrip.id, cancelledBy, reason);
    if (success) {
      try {
        if (cancelledBy === 'passenger' && user) {
          await handlePassengerCancellationPenalty(
            user.uid,
            userProfile?.fullName || 'Passageiro',
            userProfile?.phone || ''
          );
        } else if (cancelledBy === 'driver' && user) {
          await handleDriverCancellationPenalty(user.uid, activeTrip.id);
        }
      } catch (err) {
        console.warn('Error applying cancellation penalty:', err);
      }
      setActiveTrip(null);
      setIsSearching(false);
      setSearchTimedOut(false);
    }
    return success;
  };

  const sendMessage = async (text: string) => {
    if (!activeTrip || !user || !userProfile) return;
    const senderRole = role === 'driver' ? 'driver' : 'passenger';
    await sendChatMessage(
      activeTrip.id,
      user.uid,
      senderRole,
      userProfile.fullName,
      text
    );
  };

  return (
    <RideContext.Provider
      value={{
        activeTrip,
        nearbyDrivers,
        messages,
        originPoint,
        destinationPoint,
        selectedSpot,
        selectedProvince,
        selectedDistrict,
        distanceKm,
        estimatedDurationMin,
        fareBreakdown,
        paymentMethod,
        isSearching,
        searchTimedOut,
        searchTimeRemaining,
        setSearchTimedOut,
        updateCalculatedRoute,
        pushPermission,
        requestPushPermission,
        setOriginPoint,
        setDestinationPoint,
        setSelectedSpot,
        setSelectedProvince,
        setSelectedDistrict,
        setPaymentMethod,
        requestRide,
        cancelCurrentTrip,
        sendMessage,
        refreshNearbyDrivers,
      }}
    >
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => useContext(RideContext);

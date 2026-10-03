import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import {
  Trip,
  TripStatus,
  LocationPoint,
  PaymentMethodType,
  TripFareBreakdown,
  DriverProfile,
  RatingRecord,
  ChatMessage,
  ComplaintRecord,
  RideRequest,
  RideBid,
} from '../types';
import { calculateHaversineDistance } from './pricingService';
import { getDistrictCoordinates } from '../lib/mozambiqueLocations';
import {
  notifyTripRequested,
  notifyPassengerRideAccepted,
  notifyDriverPriceAcceptedByPassenger,
  notifyDriverArrived,
  notifyDriverPassengerConfirmedArrival,
  notifyTripStarted,
  notifyTripCompleted,
  notifyTripCancelled,
  notifyChatMessage,
} from './notificationService';
import { removeUndefinedFields } from '../utils/firestoreHelper';
import { processTripCompletedPayment } from './paymentService';

/**
 * Creates a new trip request by a passenger
 */
export async function createTripRequest(params: {
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  passengerPhoto?: string;
  origin: LocationPoint;
  destination: LocationPoint;
  distanceKm: number;
  estimatedDurationMin: number;
  fareBreakdown: TripFareBreakdown;
  paymentMethod: PaymentMethodType;
  preferredDriver?: DriverProfile;
}): Promise<string> {
  const tripsRef = collection(db, 'trips');
  const newTripRef = doc(tripsRef);
  const now = Date.now();

  const isDirectRequest = !!params.preferredDriver;

  const newTrip: Trip = {
    id: newTripRef.id,
    passengerId: params.passengerId,
    passengerName: params.passengerName,
    passengerPhone: params.passengerPhone,
    passengerPhoto: params.passengerPhoto,
    driverId: params.preferredDriver?.id || null,
    driverName: params.preferredDriver?.fullName || null,
    driverPhone: params.preferredDriver?.phone || null,
    driverPhoto: params.preferredDriver?.photoUrl || null,
    driverBikePhoto: params.preferredDriver?.bikePhotoUrl || null,
    driverBio: params.preferredDriver?.bio || null,
    driverHelmetProvided: params.preferredDriver?.helmetProvided ?? true,
    bikeBrand: params.preferredDriver?.bikeBrand || '',
    bikeModel: params.preferredDriver?.bikeModel || '',
    bikeColor: params.preferredDriver?.bikeColor || '',
    plateNumber: params.preferredDriver?.plateNumber || '',
    preferredDriverId: params.preferredDriver?.id || null,
    origin: params.origin,
    destination: params.destination,
    distanceKm: params.distanceKm,
    estimatedDurationMin: params.estimatedDurationMin,
    fareBreakdown: params.fareBreakdown,
    fareAmount: params.preferredDriver?.baseFare || params.preferredDriver?.customFare || params.fareBreakdown.totalFare,
    currency: 'MT',
    paymentMethod: params.paymentMethod,
    paymentStatus: 'pending',
    status: 'searching_driver',
    biddingStatus: isDirectRequest ? 'requested' : null,
    biddingPrice: null, // Direct requests can set price via driver or passenger negotiation
    statusTimestamps: {
      requested: now,
      searching_driver: now,
    },
    emergencyAlert: false,
    passengerRated: false,
    driverRated: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newTripRef, removeUndefinedFields(newTrip));
  return newTripRef.id;
}

export async function createRideRequest(params: {
  passengerId: string;
  passengerName: string;
  origin: LocationPoint;
  destination: LocationPoint;
}): Promise<string> {
  const requestsRef = collection(db, 'rideRequests');
  const newRequestRef = doc(requestsRef);
  const now = Date.now();

  const newRequest: RideRequest = {
    id: newRequestRef.id,
    passengerId: params.passengerId,
    passengerName: params.passengerName,
    origin: params.origin,
    destination: params.destination,
    status: 'searching',
    createdAt: now,
  };

  await setDoc(newRequestRef, newRequest);
  return newRequestRef.id;
}

export async function submitRideBid(params: {
  requestId: string;
  driverId: string;
  driverName: string;
  bikeBrand: string;
  plateNumber: string;
  proposedPrice: number;
}): Promise<string> {
  const bidsRef = collection(db, 'rideBids');
  const newBidRef = doc(bidsRef);
  const now = Date.now();

  const newBid: RideBid = {
    id: newBidRef.id,
    requestId: params.requestId,
    driverId: params.driverId,
    driverName: params.driverName,
    bikeBrand: params.bikeBrand,
    plateNumber: params.plateNumber,
    proposedPrice: params.proposedPrice,
    status: 'proposed',
    createdAt: now,
  };

  await setDoc(newBidRef, newBid);
  return newBidRef.id;
}

export async function acceptRideBid(bidId: string, requestId: string): Promise<void> {
  const bidRef = doc(db, 'rideBids', bidId);
  const requestRef = doc(db, 'rideRequests', requestId);

  await updateDoc(bidRef, { status: 'accepted' });
  await updateDoc(requestRef, { status: 'completed' });
  
  // Trip creation logic should follow...
}

/**
 * Finds available, approved, online drivers near the passenger origin
 */
export async function findNearbyDrivers(
  lat: number,
  lng: number,
  radiusKm = 15,
  excludeUserId?: string,
  passengerDistrict?: string,
  passengerProvince?: string
): Promise<DriverProfile[]> {
  try {
    const driversRef = collection(db, 'drivers');
    const snap = await getDocs(driversRef);
    const drivers: (DriverProfile & { distance: number })[] = [];

    const clean = (str: string) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const cleanTargetDist = clean(passengerDistrict || '');
    const cleanTargetProv = clean(passengerProvince || '');

    snap.forEach((docSnap) => {
      const data = docSnap.data() as DriverProfile;

      // Filter out current passenger's own user ID
      if (excludeUserId && (data.id === excludeUserId || data.userId === excludeUserId)) {
        return;
      }

      // Exclude drivers who are currently occupied / working on an active trip
      if (data.isBusy || data.currentTripId) {
        return;
      }

      // Strictly only real approved drivers (no demo drivers)
      if (
        data.fullName &&
        data.id &&
        !data.id.startsWith('driver_') &&
        !data.email?.endsWith('@telemoto.mz') &&
        data.status === 'approved'
      ) {
        const driverProv = clean(data.province || '');
        const driverDist = clean(data.district || data.city || '');

        const isDistMatch = driverDist && cleanTargetDist &&
          (driverDist.includes(cleanTargetDist) || cleanTargetDist.includes(driverDist));
        const isProvMatch = !driverProv || !cleanTargetProv ||
          (driverProv.includes(cleanTargetProv) || cleanTargetProv.includes(driverProv));

        let dLat = data.currentLat;
        let dLng = data.currentLng;

        if (typeof dLat !== 'number' || typeof dLng !== 'number') {
          const coords = getDistrictCoordinates(data.province || 'Inhambane', data.district || data.city || 'Massinga');
          dLat = coords.lat;
          dLng = coords.lng;
        }

        const dist = calculateHaversineDistance(lat, lng, dLat, dLng);

        // Strict regional match: District & Province match OR (Same province AND within 15km)
        if ((isDistMatch && isProvMatch) || (isProvMatch && dist <= radiusKm)) {
          drivers.push({
            ...data,
            currentLat: dLat,
            currentLng: dLng,
            distance: Math.round(dist * 10) / 10,
          });
        }
      }
    });

    drivers.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.distance - b.distance;
    });

    return drivers;
  } catch (err: any) {
    if (err?.code !== 'unavailable') {
      console.warn('Could not fetch nearby drivers:', err?.message || err);
    }
    return [];
  }
}

export async function acceptTrip(
  tripId: string,
  driver: DriverProfile
): Promise<boolean> {
  const tripRef = doc(db, 'trips', tripId);
  const now = Date.now();

  try {
    await updateDoc(tripRef, {
      driverId: driver.id,
      driverName: driver.fullName,
      driverPhone: driver.phone,
      driverPhoto: driver.photoUrl || null,
      driverBikePhoto: driver.bikePhotoUrl || null,
      driverBio: driver.bio || null,
      driverHelmetProvided: driver.helmetProvided ?? true,
      driverYearsExperience: driver.yearsExperience || null,
      driverRating: driver.rating || 5.0,
      driverTotalRides: driver.totalRides || 0,
      bikeBrand: driver.bikeBrand,
      bikeModel: driver.bikeModel,
      bikeColor: driver.bikeColor,
      plateNumber: driver.plateNumber,
      ...(driver.baseFare || driver.customFare ? { fareAmount: driver.baseFare || driver.customFare } : {}),
      status: 'driver_assigned',
      'statusTimestamps.driver_assigned': now,
      updatedAt: now,
    });

    // Mark driver as occupied
    await updateDoc(doc(db, 'drivers', driver.id), {
      currentTripId: tripId,
      isBusy: true,
      updatedAt: now,
    });

    // Notify passenger and admin
    try {
      const tripSnap = await getDoc(tripRef);
      if (tripSnap.exists()) {
        const tripData = tripSnap.data() as Trip;
        await notifyPassengerRideAccepted({
          id: tripId,
          passengerId: tripData.passengerId,
          passengerName: tripData.passengerName,
          driverName: driver.fullName,
          bikeBrand: driver.bikeBrand,
          bikeModel: driver.bikeModel,
          plateNumber: driver.plateNumber,
          fareAmount: tripData.fareAmount,
        });
      }
    } catch (notifErr) {
      console.warn('Could not dispatch passenger notification from acceptTrip:', notifErr);
    }

    return true;
  } catch (error) {
    console.error('Failed to accept trip:', error);
    return false;
  }
}

/**
 * Update trip lifecycle status (driver arriving, arrived, trip started, etc.)
 */
export async function updateTripStatus(
  tripId: string,
  newStatus: TripStatus,
  extraData?: Partial<Trip>
): Promise<boolean> {
  const tripRef = doc(db, 'trips', tripId);
  const now = Date.now();

  try {
    const payload = removeUndefinedFields({
      status: newStatus,
      [`statusTimestamps.${newStatus}`]: now,
      updatedAt: now,
      ...(extraData || {}),
    });
    await updateDoc(tripRef, payload);

    // Fetch trip info to dispatch appropriate event push notifications
    try {
      const tripSnap = await getDoc(tripRef);
      if (tripSnap.exists()) {
        const trip = tripSnap.data() as Trip;

        if (newStatus === 'driver_arrived') {
          await notifyDriverArrived({
            id: tripId,
            passengerId: trip.passengerId,
            driverName: trip.driverName,
            plateNumber: trip.plateNumber,
          });
        } else if (newStatus === 'trip_started') {
          await notifyTripStarted({
            id: tripId,
            passengerId: trip.passengerId,
            driverName: trip.driverName,
            destinationName: trip.destination?.address,
          });
        } else if (newStatus === 'trip_completed' || newStatus === 'paid') {
          await notifyTripCompleted({
            id: tripId,
            passengerId: trip.passengerId,
            driverId: trip.driverId,
            fareAmount: trip.fareAmount,
            paymentMethod: trip.paymentMethod,
          });
        } else if (newStatus.startsWith('cancelled')) {
          const cancelledBy = newStatus === 'cancelled_by_passenger' ? 'passenger' : 'driver';
          await notifyTripCancelled({
            id: tripId,
            passengerId: trip.passengerId,
            driverId: trip.driverId,
            cancelledBy,
            reason: (extraData as any)?.cancellationReason,
          });
        }

        // If trip completed or cancelled, release driver
        if (
          newStatus === 'trip_completed' ||
          newStatus === 'paid' ||
          newStatus.startsWith('cancelled')
        ) {
          if (trip.driverId) {
            await updateDoc(doc(db, 'drivers', trip.driverId), {
              currentTripId: null,
              isBusy: false,
              updatedAt: now,
            });
          }
        }
      }
    } catch (notifErr) {
      console.warn('Notice when dispatching trip update notification:', notifErr);
    }

    return true;
  } catch (err) {
    console.error(`Error updating trip status to ${newStatus}:`, err);
    return false;
  }
}

/**
 * Cancel trip by passenger, driver or system timeout
 */
export async function cancelTrip(
  tripId: string,
  cancelledBy: 'passenger' | 'driver' | 'system',
  reason?: string
): Promise<boolean> {
  let status: TripStatus = 'cancelled_by_passenger';
  if (cancelledBy === 'driver') status = 'cancelled_by_driver';
  if (cancelledBy === 'system') status = 'cancelled_by_system';

  return updateTripStatus(tripId, status, {
    cancellationReason:
      reason ||
      (cancelledBy === 'system'
        ? 'no_drivers_available'
        : 'Cancelado pelo utilizador'),
  });
}

/**
 * Real-time chat messaging
 */
export async function sendChatMessage(
  tripId: string,
  senderId: string,
  senderRole: 'passenger' | 'driver',
  senderName: string,
  text: string
): Promise<string> {
  const msgRef = doc(collection(db, 'messages'));
  const newMsg: ChatMessage = {
    id: msgRef.id,
    tripId,
    senderId,
    senderRole,
    senderName,
    text: text.trim(),
    createdAt: Date.now(),
    read: false,
  };
  await setDoc(msgRef, newMsg);

  // Notify the other participant
  try {
    const tripSnap = await getDoc(doc(db, 'trips', tripId));
    if (tripSnap.exists()) {
      const trip = tripSnap.data() as Trip;
      const recipientId = senderRole === 'passenger' ? trip.driverId : trip.passengerId;
      if (recipientId) {
        await notifyChatMessage({
          tripId,
          senderName,
          senderRole,
          recipientId,
          text: text.trim(),
        });
      }
    }
  } catch (chatNotifErr) {
    console.warn('Could not dispatch chat notification:', chatNotifErr);
  }

  return msgRef.id;
}

/**
 * Submit real rating
 */
export async function submitRating(params: {
  tripId: string;
  fromUserId: string;
  toUserId: string;
  fromRole: 'passenger' | 'driver';
  toRole: 'passenger' | 'driver';
  score: number;
  comment?: string;
}): Promise<boolean> {
  try {
    const ratingRef = doc(collection(db, 'ratings'));
    const newRating: RatingRecord = {
      id: ratingRef.id,
      tripId: params.tripId,
      fromUserId: params.fromUserId,
      toUserId: params.toUserId,
      fromRole: params.fromRole,
      toRole: params.toRole,
      score: Math.min(5, Math.max(1, params.score)),
      comment: params.comment?.trim() || '',
      createdAt: Date.now(),
    };

    await setDoc(ratingRef, removeUndefinedFields(newRating));

    // Update trip rated flag
    const tripUpdateKey =
      params.fromRole === 'passenger' ? 'passengerRated' : 'driverRated';
    await updateDoc(doc(db, 'trips', params.tripId), {
      [tripUpdateKey]: true,
      updatedAt: Date.now(),
    });

    // If passenger evaluated driver, update driver's average rating & total rides
    if (params.toRole === 'driver') {
      const driverRef = doc(db, 'drivers', params.toUserId);
      const dSnap = await getDoc(driverRef);
      if (dSnap.exists()) {
        const d = dSnap.data() as DriverProfile;
        const count = (d.totalRatingsCount || 0) + 1;
        const currentSum = (d.rating || 5.0) * (d.totalRatingsCount || 0);
        const newAvg = Math.round(((currentSum + params.score) / count) * 10) / 10;
        await updateDoc(driverRef, {
          rating: newAvg,
          totalRatingsCount: count,
          updatedAt: Date.now(),
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to submit rating:', error);
    return false;
  }
}

/**
 * Get all ratings & comments for a specific driver
 */
export async function getDriverRatings(driverId: string): Promise<RatingRecord[]> {
  try {
    const q = query(
      collection(db, 'ratings'),
      where('toUserId', '==', driverId),
      where('toRole', '==', 'driver')
    );
    const snap = await getDocs(q);
    const list: RatingRecord[] = [];
    snap.forEach((d) => {
      list.push(d.data() as RatingRecord);
    });
    return list.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Failed to get driver ratings:', error);
    return [];
  }
}

/**
 * Submit safety complaint / report
 */
export async function submitComplaint(
  params: Omit<ComplaintRecord, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const ref = doc(collection(db, 'complaints'));
  const complaint: ComplaintRecord = {
    ...params,
    id: ref.id,
    status: 'pending',
    createdAt: Date.now(),
  };
  await setDoc(ref, removeUndefinedFields(complaint));
  return ref.id;
}

/**
 * Submits a driver's bargaining price bid for a ride
 */
export async function submitDriverBid(
  tripId: string,
  driver: DriverProfile,
  price: number
): Promise<boolean> {
  const tripRef = doc(db, 'trips', tripId);
  const now = Date.now();
  try {
    await updateDoc(tripRef, {
      driverId: driver.id,
      driverName: driver.fullName,
      driverPhone: driver.phone,
      driverPhoto: driver.photoUrl || null,
      driverBikePhoto: driver.bikePhotoUrl || null,
      driverBio: driver.bio || null,
      driverHelmetProvided: driver.helmetProvided ?? true,
      driverYearsExperience: driver.yearsExperience || null,
      driverRating: driver.rating || 5,
      driverTotalRides: driver.totalRides || 0,
      bikeBrand: driver.bikeBrand || '',
      bikeModel: driver.bikeModel || '',
      bikeColor: driver.bikeColor || '',
      plateNumber: driver.plateNumber || '',
      fareAmount: price,
      biddingPrice: price,
      biddingStatus: 'offered',
      updatedAt: now,
    });
    return true;
  } catch (err) {
    console.error('Failed to submit driver bid:', err);
    return false;
  }
}

/**
 * Passenger accepts the driver's bargained price bid and sets payment method
 */
export async function acceptDriverBid(
  tripId: string,
  price: number,
  paymentMethod?: PaymentMethodType
): Promise<boolean> {
  const tripRef = doc(db, 'trips', tripId);
  const now = Date.now();

  const platformCommission = Math.round(price * 0.15); // 15% commission
  const gatewayFee = Math.round(price * 0.08); // 8% fee
  const driverNetEarnings = price - platformCommission;

  const fareBreakdown: TripFareBreakdown = {
    baseFare: price,
    distanceFare: 0,
    totalFare: price,
    platformCommission,
    gatewayFee,
    driverNetEarnings,
  };

  try {
    const updatePayload: any = {
      fareAmount: price,
      fareBreakdown,
      status: 'driver_assigned',
      biddingStatus: 'accepted',
      'statusTimestamps.driver_assigned': now,
      updatedAt: now,
    };

    if (paymentMethod) {
      updatePayload.paymentMethod = paymentMethod;
    }

    await updateDoc(tripRef, updatePayload);

    // Mark driver as occupied
    try {
      const snap = await getDoc(tripRef);
      if (snap.exists()) {
        const tripData = snap.data() as Trip;
        if (tripData.driverId) {
          await updateDoc(doc(db, 'drivers', tripData.driverId), {
            currentTripId: tripId,
            isBusy: true,
            updatedAt: now,
          });

          await notifyDriverPriceAcceptedByPassenger({
            id: tripId,
            driverId: tripData.driverId,
            passengerName: tripData.passengerName || 'Passageiro',
            originAddress: tripData.origin?.address || 'Ponto de Partida',
            destinationAddress: tripData.destination?.address || 'Destino',
            fareAmount: price,
          });
        }
      }
    } catch (notifErr) {
      console.warn('Could not dispatch driver price acceptance notification:', notifErr);
    }

    return true;
  } catch (err) {
    console.error('Failed to accept driver bid:', err);
    return false;
  }
}

/**
 * Passenger rejects driver bid as too high
 */
export async function rejectDriverBidTooHigh(tripId: string): Promise<boolean> {
  const tripRef = doc(db, 'trips', tripId);
  const now = Date.now();
  try {
    await updateDoc(tripRef, {
      biddingStatus: 'too_high',
      updatedAt: now,
    });
    return true;
  } catch (err) {
    console.error('Failed to mark bid as too high:', err);
    return false;
  }
}

/**
 * Cancels/declines/gives up on a live bargaining bid
 */
export async function declineDriverBid(
  tripId: string,
  role: 'passenger' | 'driver'
): Promise<boolean> {
  const tripRef = doc(db, 'trips', tripId);
  const now = Date.now();
  try {
    if (role === 'passenger') {
      await updateDoc(tripRef, {
        status: 'cancelled_by_passenger',
        biddingStatus: 'declined_by_passenger',
        updatedAt: now,
      });
    } else {
      // Driver desists: Reset driver fields so other drivers can bid on this trip request
      await updateDoc(tripRef, {
        driverId: null,
        driverName: null,
        driverPhone: null,
        driverPhoto: null,
        driverBikePhoto: null,
        driverBio: null,
        bikeBrand: null,
        bikeModel: null,
        bikeColor: null,
        plateNumber: null,
        biddingPrice: null,
        biddingStatus: null,
        updatedAt: now,
      });
    }
    return true;
  } catch (err) {
    console.error('Failed to decline bid:', err);
    return false;
  }
}

/**
 * Passenger confirms that driver has arrived at the pickup location -> Releases boarding phase
 */
export async function confirmPassengerArrival(tripId: string): Promise<boolean> {
  const tripRef = doc(db, 'trips', tripId);
  const now = Date.now();
  try {
    const snap = await getDoc(tripRef);
    const tripData = snap.exists() ? (snap.data() as Trip) : null;

    const updatePayload: Record<string, any> = {
      passengerConfirmedArrival: true,
      passengerConfirmedArrivalTimestamp: now,
      updatedAt: now,
    };

    if (tripData && (tripData.status === 'driver_assigned' || tripData.status === 'driver_arriving')) {
      updatePayload.status = 'driver_arrived';
      updatePayload['statusTimestamps.driver_arrived'] = now;
    }

    await updateDoc(tripRef, updatePayload);

    // Notify driver that boarding has been released
    try {
      if (tripData?.driverId) {
        await notifyDriverPassengerConfirmedArrival({
          id: tripId,
          driverId: tripData.driverId,
          passengerName: tripData.passengerName,
        });
      }
    } catch (notifErr) {
      console.warn('Could not dispatch boarding released notification:', notifErr);
    }

    return true;
  } catch (err) {
    console.error('Failed to confirm driver arrival by passenger:', err);
    return false;
  }
}

/**
 * Driver marks trip as ended and requests destination confirmation from passenger
 */
export async function driverEndTrip(tripId: string): Promise<boolean> {
  const tripRef = doc(db, 'trips', tripId);
  const now = Date.now();
  try {
    await updateDoc(tripRef, {
      driverEndedTrip: true,
      driverEndedTripTimestamp: now,
      status: 'payment_pending',
      'statusTimestamps.payment_pending': now,
      updatedAt: now,
    });
    return true;
  } catch (err) {
    console.error('Failed to mark trip ended by driver:', err);
    return false;
  }
}

/**
 * Passenger confirms arrival at destination ("Chegou ao destino?").
 * This completes payment, updates driver wallet, marks trip completed, releases driver, and triggers rating.
 */
export async function confirmPassengerDestinationReached(tripId: string): Promise<boolean> {
  const tripRef = doc(db, 'trips', tripId);
  const now = Date.now();
  try {
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) return false;
    const trip = tripSnap.data() as Trip;

    // Process payment and wallet credit
    if (trip.driverId) {
      await processTripCompletedPayment(
        trip.id,
        trip.driverId,
        trip.fareAmount,
        trip.paymentMethod || 'cash',
        trip.fareBreakdown
      );
    }

    await updateDoc(tripRef, {
      passengerConfirmedDestination: true,
      passengerConfirmedDestinationTimestamp: now,
      status: 'paid',
      paymentStatus: 'paid',
      'statusTimestamps.trip_completed': now,
      'statusTimestamps.paid': now,
      updatedAt: now,
    });

    // Release driver and increment driver totalRides
    if (trip.driverId) {
      const driverRef = doc(db, 'drivers', trip.driverId);
      const dSnap = await getDoc(driverRef);
      let newTotalRides = 1;
      if (dSnap.exists()) {
        newTotalRides = ((dSnap.data() as any).totalRides || 0) + 1;
      }
      await updateDoc(driverRef, {
        currentTripId: null,
        isBusy: false,
        totalRides: newTotalRides,
        updatedAt: now,
      });
    }

    // Dispatch completion notification
    try {
      await notifyTripCompleted({
        id: tripId,
        passengerId: trip.passengerId,
        driverId: trip.driverId,
        fareAmount: trip.fareAmount,
        paymentMethod: trip.paymentMethod,
      });
    } catch (nErr) {
      console.warn('Could not dispatch completion notification:', nErr);
    }

    return true;
  } catch (err) {
    console.error('Failed to confirm passenger destination reached:', err);
    return false;
  }
}

/**
 * Marks unread messages in a trip as read
 */
export async function markTripMessagesAsRead(tripId: string, currentUserId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'messages'),
      where('tripId', '==', tripId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    const promises = snap.docs
      .filter((d) => (d.data() as ChatMessage).senderId !== currentUserId)
      .map((d) => updateDoc(d.ref, { read: true }));
    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to mark messages as read:', err);
  }
}



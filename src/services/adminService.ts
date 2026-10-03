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
} from 'firebase/firestore';
import {
  DriverProfile,
  DriverStatus,
  Trip,
  PaymentRecord,
  ComplaintRecord,
  AdminLog,
  PlatformPricing,
  CityConfig,
} from '../types';

export interface AdminStats {
  onlineDrivers: number;
  totalDrivers: number;
  pendingDrivers: number;
  totalPassengers: number;
  tripsToday: number;
  tripsCompleted: number;
  tripsCancelled: number;
  totalVolumeMT: number;
  totalCommissionMT: number;
  pendingPaymentsCount: number;
}

/**
 * Calculates platform statistics from real Firestore documents
 */
export async function getAdminPlatformStats(): Promise<AdminStats> {
  const stats: AdminStats = {
    onlineDrivers: 0,
    totalDrivers: 0,
    pendingDrivers: 0,
    totalPassengers: 0,
    tripsToday: 0,
    tripsCompleted: 0,
    tripsCancelled: 0,
    totalVolumeMT: 0,
    totalCommissionMT: 0,
    pendingPaymentsCount: 0,
  };

  try {
    // Drivers
    const driversSnap = await getDocs(collection(db, 'drivers'));
    driversSnap.forEach((docSnap) => {
      const d = docSnap.data() as DriverProfile;
      stats.totalDrivers++;
      if (d.status === 'pending') stats.pendingDrivers++;
      if (d.isOnline && d.status === 'approved') stats.onlineDrivers++;
    });

    // Users (passengers)
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'passenger'))
    );
    stats.totalPassengers = usersSnap.size;

    // Trips
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const tripsSnap = await getDocs(collection(db, 'trips'));
    tripsSnap.forEach((docSnap) => {
      const t = docSnap.data() as Trip;
      if (t.createdAt >= startOfDay.getTime()) {
        stats.tripsToday++;
      }
      if (t.status === 'paid' || t.status === 'trip_completed') {
        stats.tripsCompleted++;
        const fare = t.fareAmount || 0;
        const comm = t.fareBreakdown?.platformCommission ?? Math.round(fare * 0.15);
        stats.totalVolumeMT += fare;
        stats.totalCommissionMT += comm;
      }
      if (t.status.startsWith('cancelled')) {
        stats.tripsCancelled++;
      }
    });

    // Confirmed gateway payments (M-Pesa, e-Mola, Card, Cash)
    const confirmedPaymentsSnap = await getDocs(
      query(collection(db, 'payments'), where('status', '==', 'paid'))
    );
    confirmedPaymentsSnap.forEach((docSnap) => {
      const p = docSnap.data();
      // Ensure commission from standalone payment records is accounted for if not already in trips
      if (!tripsSnap.docs.some((td) => td.id === p.tripId)) {
        stats.totalVolumeMT += p.amount || 0;
        stats.totalCommissionMT += p.platformCommission || Math.round((p.amount || 0) * 0.15);
      }
    });

    // Payments pending
    const paymentsSnap = await getDocs(
      query(collection(db, 'payments'), where('status', '==', 'pending'))
    );
    stats.pendingPaymentsCount = paymentsSnap.size;

    return stats;
  } catch (error: any) {
    if (error?.code !== 'unavailable') {
      console.warn('Notice computing admin platform stats:', error?.message || error);
    }
    return stats;
  }
}

import { notifyDriverStatusChanged } from './notificationService';

/**
 * Admin audits and modifies driver status
 */
export async function updateDriverVerificationStatus(
  adminId: string,
  adminName: string,
  driverId: string,
  newStatus: DriverStatus,
  reason?: string
): Promise<boolean> {
  try {
    const driverRef = doc(db, 'drivers', driverId);
    await updateDoc(driverRef, {
      status: newStatus,
      rejectionReason: reason || null,
      updatedAt: Date.now(),
    });

    if (newStatus === 'approved') {
      const userRef = doc(db, 'users', driverId);
      await updateDoc(userRef, {
        role: 'driver'
      }).catch(err => console.warn('Could not update user role to driver on approval:', err));
    }

    // Notify driver about status update
    try {
      await notifyDriverStatusChanged({
        driverId,
        status: newStatus as any,
        reason,
      });
    } catch (notifErr) {
      console.warn('Could not dispatch driver status notification:', notifErr);
    }

    // Log admin audit action
    const logRef = doc(collection(db, 'adminLogs'));
    const log: AdminLog = {
      id: logRef.id,
      adminId,
      adminName,
      action: `DRIVER_STATUS_${newStatus.toUpperCase()}`,
      targetType: 'driver',
      targetId: driverId,
      details: reason ? `Motivo: ${reason}` : `Estado alterado para ${newStatus}`,
      createdAt: Date.now(),
    };
    await setDoc(logRef, log);

    return true;
  } catch (err) {
    console.error('Error updating driver status:', err);
    return false;
  }
}

/**
 * Updates platform pricing configuration
 */
export async function updatePricingConfig(
  adminId: string,
  adminName: string,
  pricing: PlatformPricing
): Promise<boolean> {
  try {
    await setDoc(doc(db, 'pricing', 'default'), pricing, { merge: true });

    // Log action
    const logRef = doc(collection(db, 'adminLogs'));
    await setDoc(logRef, {
      id: logRef.id,
      adminId,
      adminName,
      action: 'UPDATE_PRICING',
      targetType: 'pricing',
      targetId: 'default',
      details: `Tarifa base: ${pricing.baseFare} MT, Km: ${pricing.pricePerKm} MT, Comissão: ${pricing.platformCommissionPercent}%`,
      createdAt: Date.now(),
    });

    return true;
  } catch (err) {
    console.error('Failed to update pricing:', err);
    return false;
  }
}

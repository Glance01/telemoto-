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
import { calculateHaversineDistance } from './pricingService';

export interface AntiAbuseSettings {
  maxCancellations: number; // e.g. 3
  timeWindowMin: number; // e.g. 30 minutes
  gpsCheckEnabled: boolean;
  gpsDistanceToleranceMeters: number; // e.g. 500 meters
  passengerPenaltyFee: number; // e.g. 50 MT
  driverPenaltyFee: number; // e.g. 15 MT
  suspensionDurationMin: number; // e.g. 60 minutes
}

export interface AbuseReport {
  id: string;
  tripId: string;
  driverId: string;
  driverName: string;
  passengerId: string;
  passengerName: string;
  reporterRole: 'driver' | 'passenger' | 'admin';
  category: 'fake_call' | 'no_show' | 'excessive_cancellation' | 'malicious_behavior';
  description: string;
  createdAt: number;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;
}

export interface PenalizedUser {
  id: string;
  fullName: string;
  phone: string;
  role: 'passenger' | 'driver';
  strikesCount: number;
  suspendedUntil: number | null;
  suspensionReason?: string;
  pendingPenaltyFee?: number;
}

const DEFAULT_SETTINGS: AntiAbuseSettings = {
  maxCancellations: 3,
  timeWindowMin: 30,
  gpsCheckEnabled: true,
  gpsDistanceToleranceMeters: 500,
  passengerPenaltyFee: 50,
  driverPenaltyFee: 15,
  suspensionDurationMin: 60,
};

/**
 * Gets anti-abuse config or returns default settings
 */
export async function getAntiAbuseSettings(): Promise<AntiAbuseSettings> {
  try {
    const docRef = doc(db, 'settings', 'anti_abuse');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_SETTINGS, ...snap.data() } as AntiAbuseSettings;
    }
    // If not found, write defaults
    await setDoc(docRef, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (err) {
    console.warn('Error fetching anti-abuse settings:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Updates anti-abuse config
 */
export async function updateAntiAbuseSettings(
  adminId: string,
  adminName: string,
  settings: AntiAbuseSettings
): Promise<boolean> {
  try {
    await setDoc(doc(db, 'settings', 'anti_abuse'), settings, { merge: true });

    // Log admin action
    const logRef = doc(collection(db, 'adminLogs'));
    await setDoc(logRef, {
      id: logRef.id,
      adminId,
      adminName,
      action: 'UPDATE_ANTI_ABUSE_SETTINGS',
      targetType: 'pricing', // General settings
      targetId: 'anti_abuse',
      details: `Max cancel: ${settings.maxCancellations}, Janela: ${settings.timeWindowMin}min, GPS Tolerancia: ${settings.gpsDistanceToleranceMeters}m, Multa Passageiro: ${settings.passengerPenaltyFee} MT`,
      createdAt: Date.now(),
    });

    return true;
  } catch (err) {
    console.error('Failed to update anti-abuse settings:', err);
    return false;
  }
}

/**
 * Verifies if user is suspended and returns suspension info
 */
export function checkSuspensionStatus(suspendedUntil?: number): {
  isSuspended: boolean;
  timeLeftMin: number;
} {
  if (!suspendedUntil) return { isSuspended: false, timeLeftMin: 0 };
  const now = Date.now();
  if (now >= suspendedUntil) {
    return { isSuspended: false, timeLeftMin: 0 };
  }
  const diffMs = suspendedUntil - now;
  return {
    isSuspended: true,
    timeLeftMin: Math.ceil(diffMs / 1000 / 60),
  };
}

/**
 * Validates distance between current physical coordinates and requested origin address
 * Returns true if within limits, or distance details
 */
export function validateOriginDistance(
  currentLat: number,
  currentLng: number,
  originLat: number,
  originLng: number,
  toleranceMeters: number = 500
): {
  isWithinBounds: boolean;
  distanceMeters: number;
} {
  const distKm = calculateHaversineDistance(currentLat, currentLng, originLat, originLng);
  const distanceMeters = Math.round(distKm * 1000);
  return {
    isWithinBounds: distanceMeters <= toleranceMeters,
    distanceMeters,
  };
}

/**
 * Increments cancellation count and issues penalties if threshold exceeded
 */
export async function handlePassengerCancellationPenalty(
  userId: string,
  userFullName: string,
  userPhone: string
): Promise<{
  penalized: boolean;
  strikes: number;
  suspendedUntil: number | null;
}> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return { penalized: false, strikes: 0, suspendedUntil: null };
    }

    const userData = userSnap.data();
    const settings = await getAntiAbuseSettings();

    const now = Date.now();
    const windowMs = settings.timeWindowMin * 60 * 1000;
    
    let strikes = userData.strikesCount || 0;
    let cancelsInWindow = userData.cancellationsInWindow || 0;
    const lastCancel = userData.lastCancellationTimestamp || 0;

    // Reset window counter if last cancellation was outside time window
    if (now - lastCancel > windowMs) {
      cancelsInWindow = 1;
    } else {
      cancelsInWindow += 1;
    }

    let suspendedUntil: number | null = userData.suspendedUntil || null;
    let penalized = false;
    let reason = '';

    // If cancels exceed limit in window, issue a strike and suspend
    if (cancelsInWindow >= settings.maxCancellations) {
      strikes += 1;
      const suspensionMs = settings.suspensionDurationMin * 60 * 1000;
      suspendedUntil = now + suspensionMs;
      cancelsInWindow = 0; // reset
      penalized = true;
      reason = `Cancelamentos excessivos (${settings.maxCancellations} em menos de ${settings.timeWindowMin} min).`;
      
      // Auto report abuse
      const reportRef = doc(collection(db, 'abuseReports'));
      await setDoc(reportRef, {
        id: reportRef.id,
        tripId: 'system_auto',
        driverId: 'system',
        driverName: 'TeleMoto+ Seguridade',
        passengerId: userId,
        passengerName: userFullName,
        reporterRole: 'admin',
        category: 'excessive_cancellation',
        description: `O passageiro foi suspenso automaticamente por cancelar ${settings.maxCancellations} viagens num curto intervalo de tempo.`,
        createdAt: now,
        status: 'pending',
      } as AbuseReport);
    }

    // Apply a standard cancellation fee of passengerPenaltyFee to passenger on next trip
    const currentPenaltyFee = userData.pendingPenaltyFee || 0;
    const newPenaltyFee = currentPenaltyFee + settings.passengerPenaltyFee;

    const updates: Record<string, any> = {
      strikesCount: strikes,
      cancellationsInWindow: cancelsInWindow,
      lastCancellationTimestamp: now,
      pendingPenaltyFee: newPenaltyFee,
      updatedAt: now,
    };

    if (suspendedUntil) {
      updates.suspendedUntil = suspendedUntil;
      updates.suspensionReason = reason;
    }

    await updateDoc(userRef, updates);

    return { penalized, strikes, suspendedUntil };
  } catch (err) {
    console.error('Error handling passenger cancellation penalty:', err);
    return { penalized: false, strikes: 0, suspendedUntil: null };
  }
}

/**
 * Handles driver cancellation penalty (wallet deduction and strike)
 */
export async function handleDriverCancellationPenalty(
  driverId: string,
  tripId: string
): Promise<void> {
  try {
    const driverRef = doc(db, 'drivers', driverId);
    const driverSnap = await getDoc(driverRef);
    if (!driverSnap.exists()) return;

    const data = driverSnap.data();
    const settings = await getAntiAbuseSettings();

    // Deduct driver wallet
    const walletRef = doc(db, 'wallets', driverId);
    const walletSnap = await getDoc(walletRef);
    const currentBalance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0;
    const newBalance = Math.max(-500, currentBalance - settings.driverPenaltyFee);

    await setDoc(walletRef, {
      id: driverId,
      userId: driverId,
      balance: newBalance,
      currency: 'MT',
      updatedAt: Date.now(),
    }, { merge: true });

    // Log wallet transaction
    const txRef = doc(collection(db, 'walletTransactions'));
    await setDoc(txRef, {
      id: txRef.id,
      walletId: driverId,
      driverId,
      tripId,
      type: 'adjustment',
      amount: -settings.driverPenaltyFee,
      balanceAfter: newBalance,
      description: `Multa por cancelamento de viagem activa (${tripId})`,
      createdAt: Date.now(),
    });

    // Update driver profile strikes
    const strikes = (data.strikesCount || 0) + 1;
    await updateDoc(driverRef, {
      strikesCount: strikes,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Error applying driver cancellation penalty:', err);
  }
}

/**
 * Driver reports passenger as No-Show / Fake Call
 * Triggers strike, passenger suspension, and gives penalty fee
 */
export async function reportFakeCall(params: {
  tripId: string;
  driverId: string;
  driverName: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  description: string;
}): Promise<boolean> {
  try {
    const now = Date.now();
    const settings = await getAntiAbuseSettings();

    // 1. Save Abuse Report document
    const reportRef = doc(collection(db, 'abuseReports'));
    const report: AbuseReport = {
      id: reportRef.id,
      tripId: params.tripId,
      driverId: params.driverId,
      driverName: params.driverName,
      passengerId: params.passengerId,
      passengerName: params.passengerName,
      reporterRole: 'driver',
      category: 'fake_call',
      description: params.description || 'Passageiro ausente / Chamada falsa no ponto de partida.',
      createdAt: now,
      status: 'pending',
    };
    await setDoc(reportRef, report);

    // 2. Increase passenger strikes and suspend
    const passengerRef = doc(db, 'users', params.passengerId);
    const passengerSnap = await getDoc(passengerRef);
    if (passengerSnap.exists()) {
      const pData = passengerSnap.data();
      const currentStrikes = (pData.strikesCount || 0) + 1;
      
      // Auto suspend passenger for 1 hour on first fake call, or longer based on strikes
      const suspensionDurationMultiplier = currentStrikes;
      const suspensionMs = settings.suspensionDurationMin * suspensionDurationMultiplier * 60 * 1000;
      const suspendedUntil = now + suspensionMs;

      // Add penalty fee
      const currentPenaltyFee = pData.pendingPenaltyFee || 0;
      const newPenaltyFee = currentPenaltyFee + settings.passengerPenaltyFee;

      await updateDoc(passengerRef, {
        strikesCount: currentStrikes,
        suspendedUntil,
        suspensionReason: `Chamada Falsa / Ausência no local reportada pelo motorista (${params.driverName}).`,
        pendingPenaltyFee: newPenaltyFee,
        updatedAt: now,
      });

      // 3. Create platform notification for the passenger
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        userId: params.passengerId,
        title: '⚠️ Alerta de Abuso e Penalização',
        body: `A sua conta foi suspensa temporariamente por ausência no local de partida. Multa aplicada: ${settings.passengerPenaltyFee} MT.`,
        type: 'abuse_alert',
        read: false,
        createdAt: now,
      });
    }

    return true;
  } catch (err) {
    console.error('Failed to report fake call abuse:', err);
    return false;
  }
}

/**
 * Gets a list of all penalized users (strikes > 0 or suspended)
 */
export async function getPenalizedUsers(): Promise<PenalizedUser[]> {
  const penalizedList: PenalizedUser[] = [];
  try {
    const now = Date.now();
    // 1. Query users with strikes or suspension
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('strikesCount', '>', 0))
    );
    usersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      penalizedList.push({
        id: docSnap.id,
        fullName: data.fullName || 'Passageiro',
        phone: data.phone || '',
        role: 'passenger',
        strikesCount: data.strikesCount || 0,
        suspendedUntil: data.suspendedUntil || null,
        suspensionReason: data.suspensionReason || '',
        pendingPenaltyFee: data.pendingPenaltyFee || 0,
      });
    });

    // Also include currently suspended users who might have 0 strikes but are suspended
    const suspendedUsersSnap = await getDocs(
      query(collection(db, 'users'), where('suspendedUntil', '>', now))
    );
    suspendedUsersSnap.forEach((docSnap) => {
      if (!penalizedList.some((p) => p.id === docSnap.id)) {
        const data = docSnap.data();
        penalizedList.push({
          id: docSnap.id,
          fullName: data.fullName || 'Passageiro',
          phone: data.phone || '',
          role: 'passenger',
          strikesCount: data.strikesCount || 0,
          suspendedUntil: data.suspendedUntil || null,
          suspensionReason: data.suspensionReason || '',
          pendingPenaltyFee: data.pendingPenaltyFee || 0,
        });
      }
    });

    // 2. Query drivers with strikes
    const driversSnap = await getDocs(
      query(collection(db, 'drivers'), where('strikesCount', '>', 0))
    );
    driversSnap.forEach((docSnap) => {
      const data = docSnap.data();
      penalizedList.push({
        id: docSnap.id,
        fullName: data.fullName || 'Motorista',
        phone: data.phone || '',
        role: 'driver',
        strikesCount: data.strikesCount || 0,
        suspendedUntil: data.suspendedUntil || null,
        suspensionReason: data.suspensionReason || '',
        pendingPenaltyFee: 0,
      });
    });

    return penalizedList;
  } catch (err) {
    console.warn('Error fetching penalized users:', err);
    return penalizedList;
  }
}

/**
 * Gets all abuse reports
 */
export async function getAbuseReports(): Promise<AbuseReport[]> {
  const reportsList: AbuseReport[] = [];
  try {
    const snap = await getDocs(
      query(collection(db, 'abuseReports'), orderBy('createdAt', 'desc'), limit(50))
    );
    snap.forEach((docSnap) => {
      reportsList.push({ id: docSnap.id, ...docSnap.data() } as AbuseReport);
    });
    return reportsList;
  } catch (err) {
    console.warn('Error fetching abuse reports:', err);
    return reportsList;
  }
}

/**
 * Clears penalties and lifts suspensions for a user
 */
export async function liftUserPenalties(
  adminId: string,
  adminName: string,
  userId: string,
  role: 'passenger' | 'driver'
): Promise<boolean> {
  try {
    const now = Date.now();
    if (role === 'passenger') {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        strikesCount: 0,
        suspendedUntil: null,
        suspensionReason: null,
        pendingPenaltyFee: 0,
        cancellationsInWindow: 0,
        updatedAt: now,
      });
    } else {
      const driverRef = doc(db, 'drivers', userId);
      await updateDoc(driverRef, {
        strikesCount: 0,
        suspendedUntil: null,
        suspensionReason: null,
        updatedAt: now,
      });
    }

    // Log admin action
    const logRef = doc(collection(db, 'adminLogs'));
    await setDoc(logRef, {
      id: logRef.id,
      adminId,
      adminName,
      action: 'LIFT_PENALTIES',
      targetType: role === 'passenger' ? 'user' : 'driver',
      targetId: userId,
      details: `Penalizações e suspensões perdoadas pelo Administrador.`,
      createdAt: now,
    });

    return true;
  } catch (err) {
    console.error('Failed to lift penalties:', err);
    return false;
  }
}

/**
 * Manually resolves an abuse report
 */
export async function resolveAbuseReport(
  adminId: string,
  adminName: string,
  reportId: string,
  status: 'resolved' | 'dismissed',
  adminNotes: string
): Promise<boolean> {
  try {
    const reportRef = doc(db, 'abuseReports', reportId);
    await updateDoc(reportRef, {
      status,
      adminNotes,
      updatedAt: Date.now(),
    });

    // Log action
    const logRef = doc(collection(db, 'adminLogs'));
    await setDoc(logRef, {
      id: logRef.id,
      adminId,
      adminName,
      action: `RESOLVE_REPORT_${status.toUpperCase()}`,
      targetType: 'pricing', // Config context
      targetId: reportId,
      details: `Relatório ${reportId} marcado como ${status}. Notas: ${adminNotes}`,
      createdAt: Date.now(),
    });

    return true;
  } catch (err) {
    console.error('Failed to resolve abuse report:', err);
    return false;
  }
}

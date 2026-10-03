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
  runTransaction,
} from 'firebase/firestore';
import {
  DriverProfile,
  DriverWallet,
  WalletTransaction,
  DriverStatus,
  WithdrawalRequest,
  PayoutWalletType,
} from '../types';
import { removeUndefinedFields } from '../utils/firestoreHelper';
import { notifyAdminNewDriverApplication } from './notificationService';
import { getDistrictCoordinates, addCoordinateJitter } from '../lib/mozambiqueLocations';

/**
 * Legacy sample driver seeding disabled - only real registered drivers allowed
 */
export async function seedSampleDriversToFirestore(_centerLat = -25.968, _centerLng = 32.573): Promise<DriverProfile[]> {
  return [];
}

let lastBroadcastTime = 0;
const MIN_UPDATE_INTERVAL_MS = 6000; // Throttle to 6 seconds to prevent excessive writes

/**
 * Registers a new driver application
 */
export async function registerDriverProfile(
  data: Omit<
    DriverProfile,
    | 'status'
    | 'rating'
    | 'totalRatingsCount'
    | 'totalRides'
    | 'isOnline'
    | 'createdAt'
    | 'updatedAt'
  > & { currentLat?: number; currentLng?: number }
): Promise<boolean> {
  const driverRef = doc(db, 'drivers', data.id);
  const now = Date.now();

  let lat = data.currentLat;
  let lng = data.currentLng;

  if (!lat || !lng) {
    const coords = addCoordinateJitter(getDistrictCoordinates(data.province, data.district || data.city));
    lat = coords.lat;
    lng = coords.lng;
  }

  const driverDoc: DriverProfile = {
    ...data,
    currentLat: lat,
    currentLng: lng,
    status: 'approved',
    rating: 5.0,
    totalRatingsCount: 0,
    totalRides: 0,
    isOnline: true,
    lastLocationUpdate: now,
    currentTripId: null,
    createdAt: now,
    updatedAt: now,
  };

  const cleanDriverDoc = removeUndefinedFields(driverDoc);
  await setDoc(driverRef, cleanDriverDoc);

  // Update user role in Firestore to ensure it represents a driver
  try {
    await updateDoc(doc(db, 'users', data.id), {
      role: 'driver',
      hasSubmittedDocuments: true,
      driverRegistered: true,
      province: data.province,
      city: data.district || data.city,
    });
  } catch (err) {
    console.warn('Could not update user role to driver during registration:', err);
  }

  // Also write to tripLocations for real-time location streaming
  if (lat && lng) {
    try {
      await setDoc(
        doc(db, 'tripLocations', data.id),
        {
          driverId: data.id,
          lat,
          lng,
          heading: 0,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not write initial tripLocation:', e);
    }
  }

  // Initialize driver wallet
  const walletRef = doc(db, 'wallets', data.id);
  const walletDoc: DriverWallet = {
    id: data.id,
    driverId: data.id,
    balance: 0,
    pendingBalance: 0,
    totalEarned: 0,
    totalCommissionPaid: 0,
    totalTripsCount: 0,
    currency: 'MT',
    updatedAt: now,
  };
  await setDoc(walletRef, removeUndefinedFields(walletDoc), { merge: true });

  // Notify Admins about new driver submission
  try {
    await notifyAdminNewDriverApplication({
      id: data.id,
      fullName: data.fullName,
      phone: data.phone,
      province: data.province,
      bikeBrand: data.bikeBrand,
      plateNumber: data.plateNumber,
    });
  } catch (notifErr) {
    console.warn('Could not dispatch admin driver application notification:', notifErr);
  }

  return true;
}

/**
 * Updates driver presentation and photos in Firestore
 */
export async function updateDriverPresentation(
  driverId: string,
  data: Partial<DriverProfile>
): Promise<boolean> {
  try {
    const driverRef = doc(db, 'drivers', driverId);
    const cleanData = removeUndefinedFields({
      ...data,
      updatedAt: Date.now(),
    });
    await updateDoc(driverRef, cleanData);

    if (data.currentLat && data.currentLng) {
      try {
        await setDoc(
          doc(db, 'tripLocations', driverId),
          {
            driverId,
            lat: data.currentLat,
            lng: data.currentLng,
            heading: 0,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (locErr) {
        console.warn('Could not sync tripLocation:', locErr);
      }
    }

    if (data.photoUrl || data.fullName || data.phone || data.bikeBrand || data.plateNumber) {
      try {
        const userUpdates: any = {};
        if (data.photoUrl) userUpdates.photoUrl = data.photoUrl;
        if (data.fullName) userUpdates.fullName = data.fullName;
        if (data.phone) userUpdates.phone = data.phone;
        if (data.bikeBrand) userUpdates.bikeBrand = data.bikeBrand;
        if (data.bikeModel) userUpdates.bikeModel = data.bikeModel;
        if (data.plateNumber) userUpdates.plateNumber = data.plateNumber;
        if (data.province) userUpdates.province = data.province;
        if (data.district || data.city) userUpdates.city = data.district || data.city;
        await updateDoc(doc(db, 'users', driverId), userUpdates);
      } catch (err) {
        // user doc sync fallback
      }
    }

    // Sync to local storage cache for instant persistence across reloads
    const localKey = `telemoto_driver_${driverId}`;
    const local = localStorage.getItem(localKey);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        const merged = { ...parsed, ...cleanData };
        localStorage.setItem(localKey, JSON.stringify(merged));
      } catch (e) {}
    }
    return true;
  } catch (err) {
    console.error('Failed to update driver presentation:', err);
    return false;
  }
}

/**
 * Gets driver profile by user ID
 */
export async function getDriverProfile(
  driverId: string
): Promise<DriverProfile | null> {
  const snap = await getDoc(doc(db, 'drivers', driverId));
  if (snap.exists()) {
    return snap.data() as DriverProfile;
  }
  return null;
}

/**
 * Updates driver online status
 */
export async function setDriverOnlineStatus(
  driverId: string,
  isOnline: boolean
): Promise<boolean> {
  try {
    await setDoc(
      doc(db, 'drivers', driverId),
      {
        isOnline,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Failed to update driver online status:', err);
    return false;
  }
}

/**
 * Updates driver's live GPS coordinates with throttling
 */
export async function updateDriverLocation(
  driverId: string,
  lat: number,
  lng: number,
  heading?: number,
  force = false
): Promise<void> {
  const now = Date.now();
  if (!force && now - lastBroadcastTime < MIN_UPDATE_INTERVAL_MS) {
    return;
  }
  lastBroadcastTime = now;

  try {
    // Update driver doc with merge to prevent failure if doc is being provisioned
    await setDoc(
      doc(db, 'drivers', driverId),
      {
        currentLat: lat,
        currentLng: lng,
        lastLocationUpdate: now,
        updatedAt: now,
      },
      { merge: true }
    );

    // Update tripLocations doc
    await setDoc(
      doc(db, 'tripLocations', driverId),
      {
        driverId,
        lat,
        lng,
        heading: heading || 0,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error updating driver location:', err);
  }
}

/**
 * Gets driver's financial wallet and ledger
 */
export async function getDriverWallet(
  driverId: string
): Promise<DriverWallet | null> {
  const snap = await getDoc(doc(db, 'wallets', driverId));
  if (snap.exists()) {
    return snap.data() as DriverWallet;
  }
  return null;
}

/**
 * Gets driver's transaction history
 */
export async function getDriverTransactions(
  driverId: string,
  maxItems = 30
): Promise<WalletTransaction[]> {
  try {
    const q = query(
      collection(db, 'walletTransactions'),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    const list: WalletTransaction[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as WalletTransaction);
    });
    return list;
  } catch (err) {
    console.error('Error getting driver transactions:', err);
    return [];
  }
}

export interface RequestWithdrawalParams {
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverEmail: string;
  amount: number;
  walletType: PayoutWalletType;
  accountDetails: {
    phoneNumber?: string;
    accountHolderName: string;
    bankName?: string;
    accountNumber?: string;
    nib?: string;
  };
}

/**
 * Driver requests payout/withdrawal from their TeleMoto+ digital balance.
 * 1. Atomically validates available balance >= amount.
 * 2. Deducts the amount immediately from wallets/{driverId}.
 * 3. Records deduction in walletTransactions.
 * 4. Stores request in withdrawalRequests with estimated time "Dentro de minutos".
 * 5. Notifies server API which dispatches email to brunomuhacha016@gmail.com.
 */
export async function requestDriverWithdrawal(params: RequestWithdrawalParams): Promise<{
  success: boolean;
  message: string;
  requestId?: string;
  balanceAfter?: number;
}> {
  const { driverId, driverName, driverPhone, driverEmail, amount, walletType, accountDetails } = params;

  if (!amount || amount < 50) {
    return { success: false, message: 'O valor mínimo para saque é de 50 MT.' };
  }

  const walletRef = doc(db, 'wallets', driverId);
  const transRef = doc(collection(db, 'walletTransactions'));
  const requestRef = doc(collection(db, 'withdrawalRequests'));

  let newBalance = 0;
  let prevBalance = 0;

  try {
    await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      if (!walletDoc.exists()) {
        throw new Error('Carteira não encontrada. Realize viagens para acumular saldo.');
      }

      const w = walletDoc.data() as DriverWallet;
      prevBalance = w.balance || 0;

      if (prevBalance < amount) {
        throw new Error(
          `Saldo insuficiente na sua carteira TeleMoto+. Saldo atual: ${prevBalance} MT.`
        );
      }

      newBalance = prevBalance - amount;

      // 1. Deduct immediately from driver's wallet
      transaction.update(walletRef, {
        balance: newBalance,
        updatedAt: Date.now(),
      });

      // 2. Format description based on method
      let destLabel = 'M-Pesa';
      let destAccount = accountDetails.phoneNumber || '';
      if (walletType === 'emola') {
        destLabel = 'e-Mola';
        destAccount = accountDetails.phoneNumber || '';
      } else if (walletType === 'bank') {
        destLabel = `Banco (${accountDetails.bankName || 'Bancário'})`;
        destAccount = accountDetails.nib || accountDetails.accountNumber || '';
      }

      // 3. Register transaction in ledger
      transaction.set(transRef, {
        id: transRef.id,
        walletId: driverId,
        driverId,
        type: 'payout_withdrawal',
        amount: -amount,
        balanceAfter: newBalance,
        description: `Saque solicitado para ${destLabel}: ${destAccount} (${accountDetails.accountHolderName})`,
        createdAt: Date.now(),
      });

      // 4. Save withdrawal request document
      const withdrawalData: WithdrawalRequest = {
        id: requestRef.id,
        driverId,
        driverName,
        driverPhone,
        driverEmail: driverEmail || '',
        amount,
        currency: 'MT',
        walletType,
        accountDetails,
        balanceBefore: prevBalance,
        balanceAfter: newBalance,
        status: 'pending',
        estimatedProcessingTime: 'Dentro de minutos',
        adminNotificationEmail: 'brunomuhacha016@gmail.com',
        adminEmailSent: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      transaction.set(requestRef, removeUndefinedFields(withdrawalData));
    });

    // 5. Dispatch notification to server endpoint which emails brunomuhacha016@gmail.com
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      await fetch(`${baseUrl}/api/payouts/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: requestRef.id,
          driverId,
          driverName,
          driverPhone,
          driverEmail,
          amount,
          walletType,
          accountDetails,
          balanceBefore: prevBalance,
          balanceAfter: newBalance,
          createdAt: Date.now(),
        }),
      });
    } catch (apiErr) {
      console.warn('Could not contact /api/payouts/request endpoint:', apiErr);
    }

    return {
      success: true,
      message:
        'Pedido de saque submetido com sucesso! O valor foi descontado da sua carteira e será transferido dentro de minutos.',
      requestId: requestRef.id,
      balanceAfter: newBalance,
    };
  } catch (err: any) {
    console.error('Error requesting driver withdrawal:', err);
    return {
      success: false,
      message: err.message || 'Falha ao solicitar saque. Tente novamente.',
    };
  }
}

/**
 * Gets driver withdrawal requests
 */
export async function getDriverWithdrawalRequests(
  driverId: string
): Promise<WithdrawalRequest[]> {
  try {
    const q = query(
      collection(db, 'withdrawalRequests'),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    const list: WithdrawalRequest[] = [];
    snap.forEach((d) => list.push(d.data() as WithdrawalRequest));
    return list;
  } catch (err) {
    console.error('Error fetching driver withdrawal requests:', err);
    return [];
  }
}

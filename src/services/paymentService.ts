import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  runTransaction,
} from 'firebase/firestore';
import { PaymentRecord, PaymentMethodType, TripFareBreakdown } from '../types';

export interface PaymentInitiationResult {
  success: boolean;
  paymentId?: string;
  gatewayReference?: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'requires_config';
  message: string;
  checkoutUrl?: string;
}

export interface GatewayConfigStatus {
  configured: boolean;
  hasMerchantId: boolean;
  hasWalletId: boolean;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  gateway: string;
  supportedMethods: string[];
}

/**
 * Checks server ZumboPay configuration status
 */
export async function checkGatewayConfigStatus(): Promise<GatewayConfigStatus> {
  try {
    const res = await fetch('/api/payments/config-status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not check gateway config status:', err);
  }
  return {
    configured: false,
    hasMerchantId: false,
    hasWalletId: false,
    hasApiKey: false,
    hasWebhookSecret: false,
    gateway: 'zumbopay',
    supportedMethods: ['mpesa', 'emola', 'card'],
  };
}

/**
 * Verifies transaction with ZumboPay gateway
 */
export async function verifyPaymentStatus(
  reference: string
): Promise<{ paid: boolean; status: string }> {
  try {
    const res = await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`);
    if (res.ok) {
      const data = await res.json();
      return { paid: Boolean(data.paid), status: data.status || 'pending' };
    }
  } catch (err) {
    console.error('Error verifying payment status:', err);
  }
  return { paid: false, status: 'pending' };
}

/**
 * Initiates payment for a trip through ZumboPay or digital wallet
 */
export async function initiateTripPayment(
  tripId: string,
  passengerId: string,
  driverId: string,
  amount: number,
  method: PaymentMethodType,
  fareBreakdown: TripFareBreakdown,
  phoneNumber?: string
): Promise<PaymentInitiationResult> {
  const paymentRef = doc(collection(db, 'payments'));
  const paymentId = paymentRef.id;

  // Hand cash payment ("Pagamento a mão em dinheiro") for phase 1
  if (method === 'cash') {
    return {
      success: true,
      paymentId,
      gatewayReference: `cash_${tripId.slice(0, 8)}`,
      status: 'paid',
      message: 'Pagamento em dinheiro vivo (em mão) selecionado.',
    };
  }

  // Mobile Money (M-Pesa, e-Mola) or Card via ZumboPay
  try {
    const response = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        passengerId,
        driverId,
        amount,
        method,
        phone: phoneNumber,
        fareBreakdown,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        paymentId: data.paymentId,
        gatewayReference: data.reference,
        status: data.status,
        message: data.message || 'Pagamento iniciado com sucesso.',
        checkoutUrl: data.checkoutUrl,
      };
    } else {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        status: err.status || (err.requiresConfig ? 'requires_config' : 'failed'),
        message: err.message || 'Não foi possível contactar o gateway ZumboPay. Verifique a configuração.',
      };
    }
  } catch (error: any) {
    console.warn('Notice contacting payment API:', error.message || error);
    return {
      success: false,
      status: 'requires_config',
      message: 'A integração com o gateway ZumboPay requer configuração das credenciais no servidor.',
    };
  }
}

/**
 * Driver confirms cash received after trip completion.
 * Server or client ledger transaction updates driver balance:
 * deducting platform commission since driver holds full cash.
 */
export async function confirmCashPaymentCollected(
  tripId: string,
  driverId: string,
  fareBreakdown: TripFareBreakdown,
  customFareAmount?: number
): Promise<boolean> {
  const fare = customFareAmount !== undefined ? customFareAmount : (fareBreakdown?.totalFare || 0);
  const result = await processTripCompletedPayment(
    tripId,
    driverId,
    fare,
    'cash',
    fareBreakdown
  );
  return result.success;
}

/**
 * Processes completed trip payment (Digital or Cash)
 * - Calculates 15% platform commission and 85% driver net earnings
 * - For digital (M-Pesa, e-Mola, Card, Wallet): Credits 85% directly to driver's balance and records payment/commission for Admin.
 * - For cash: Adjusts driver balance by -15% commission (since driver holds full cash) and logs total earned.
 */
export async function processTripCompletedPayment(
  tripId: string,
  driverId: string,
  fareAmount: number,
  paymentMethod: PaymentMethodType = 'cash',
  customBreakdown?: TripFareBreakdown
): Promise<{ success: boolean; netEarnings: number; commission: number }> {
  const tripRef = doc(db, 'trips', tripId);
  const tripSnap = await getDoc(tripRef);

  if (tripSnap.exists()) {
    const tripData = tripSnap.data();
    if (tripData.paymentStatus === 'paid' || tripData.status === 'paid') {
      return { success: true, netEarnings: fareAmount || 0, commission: 0 };
    }
  }

  const fare = fareAmount || 0;
  const commission = customBreakdown?.platformCommission ?? Math.round(fare * 0.15);
  // Full fare charged is retained in cash by driver
  const driverNetEarnings = fare;

  const walletRef = doc(db, 'wallets', driverId);
  const driverRef = doc(db, 'drivers', driverId);
  const transRef = doc(collection(db, 'walletTransactions'));
  const paymentRef = doc(collection(db, 'payments'));

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  await runTransaction(db, async (transaction) => {
    // 1. ALL READS FIRST
    const walletDoc = await transaction.get(walletRef);
    const driverDoc = await transaction.get(driverRef);

    // 2. COMPUTE VALUES
    let currentBalance = 0;
    let totalEarned = 0;
    let monthlyEarnings = 0;
    let totalCommissionPaid = 0;
    let totalTrips = 0;

    if (walletDoc.exists()) {
      const w = walletDoc.data() as any;
      currentBalance = w.balance || 0;
      totalEarned = w.totalEarned || 0;
      totalCommissionPaid = w.totalCommissionPaid || 0;
      totalTrips = w.totalTripsCount || 0;
      if (w.currentMonth === currentMonthKey) {
        monthlyEarnings = (w.monthlyEarnings || 0) + fare;
      } else {
        monthlyEarnings = fare;
      }
    } else {
      monthlyEarnings = fare;
    }

    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let todayEarnings = fare;

    if (driverDoc.exists()) {
      const d = driverDoc.data() as any;
      if (d.todayDate === todayKey) {
        todayEarnings = (d.todayEarnings || 0) + fare;
      }
    }

    // 3. ALL WRITES AFTER
    // As requested by user:
    // "o valor que o motorista cobrou deve entrar na conta dele,
    // não como saldo disponível pra levantamento, mas como rendimento feito este mes"
    // Balance for withdrawal remains unaffected (stays as is, not credited nor penalized),
    // while monthlyEarnings and totalEarned track the full cash revenue.
    transaction.set(
      walletRef,
      {
        id: driverId,
        driverId,
        balance: currentBalance, // Stays unchanged for cash
        pendingBalance: 0,
        totalEarned: totalEarned + fare,
        monthlyEarnings: monthlyEarnings,
        currentMonth: currentMonthKey,
        totalCommissionPaid: totalCommissionPaid,
        totalTripsCount: totalTrips + 1,
        currency: 'MT',
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    // Sync todayEarnings, monthlyEarnings & totalEarned directly into the driver profile
    transaction.set(
      driverRef,
      {
        todayEarnings: todayEarnings,
        todayDate: todayKey,
        monthlyEarnings: monthlyEarnings,
        totalEarned: totalEarned + fare,
        currentMonth: currentMonthKey,
        totalRides: totalTrips + 1,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    transaction.set(transRef, {
      id: transRef.id,
      walletId: driverId,
      driverId,
      tripId,
      type: 'cash_ride_earning',
      amount: fare,
      balanceAfter: currentBalance,
      description: `Corrida em dinheiro vivo #${tripId.slice(0, 6)} (+${fare} MT rendimento este mês)`,
      createdAt: Date.now(),
    });

    // Create payment record for audit and tracking
    const passengerId = tripSnap.exists() ? tripSnap.data().passengerId : 'passenger';
    transaction.set(paymentRef, {
      id: paymentRef.id,
      tripId,
      passengerId,
      driverId,
      amount: fare,
      currency: 'MT',
      method: 'cash',
      gateway: 'cash',
      status: 'paid',
      gatewayConfirmed: true,
      platformCommission: commission,
      driverEarnings: fare,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        note: `Pagamento de ${fare} MT recebido em dinheiro vivo em mão no destino`,
        confirmedAt: Date.now(),
      },
    });

    transaction.update(tripRef, {
      paymentId: paymentRef.id,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      status: 'paid',
      updatedAt: Date.now(),
    });
  });

  return { success: true, netEarnings: fare, commission: 0 };
}

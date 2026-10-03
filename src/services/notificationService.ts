/**
 * Zero-cost Web Push & Real-Time Notification Engine for TeleMoto+
 * Uses:
 * 1. Standard Web Notifications API (navigator.serviceWorker.showNotification / new Notification)
 * 2. Web Audio Synthesizer (Instant audible chimes for every event type)
 * 3. Vibration API (Haptic feedback on mobile devices)
 * 4. Firestore real-time notification records in 'notifications' collection
 */

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { removeUndefinedFields } from '../utils/firestoreHelper';
import { Trip, DriverProfile, ChatMessage } from '../types';

export type NotificationType =
  | 'trip_requested'
  | 'driver_accepted'
  | 'driver_arrived'
  | 'trip_started'
  | 'trip_completed'
  | 'trip_cancelled'
  | 'chat_message'
  | 'missed_call'
  | 'driver_registered'
  | 'driver_approved'
  | 'driver_rejected'
  | 'driver_suspended'
  | 'sos_alert'
  | 'wallet_topup'
  | 'system';

export interface AppNotification {
  id?: string;
  userId: string; // target user UID or 'admin_broadcast' or 'drivers_broadcast'
  recipientRole?: 'passenger' | 'driver' | 'admin' | 'all';
  tripId?: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
  sound?: 'success' | 'alert' | 'ping' | 'radar';
  read: boolean;
  createdAt: number;
}

/**
 * Synthesizes an audible notification chime using Web Audio API (100% free, no external audio files required)
 */
export function playNotificationSound(type: 'success' | 'alert' | 'ping' | 'radar' = 'success') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (type === 'success') {
      // Cheerful 3-note ascending chime (Ding-dang-dong!)
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
      });
    } else if (type === 'alert') {
      // Urgent dual-tone alert chime (for SOS, cancellation or arrival)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'ping') {
      // Crystal clear subtle pop for chat messages
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.08); // E6
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'radar') {
      // Sonar radar pulse for new incoming ride requests
      [0, 0.2].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime + offset);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + offset + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.25);
      });
    }
  } catch (err) {
    console.warn('Audio chime notice:', err);
  }
}

/**
 * Triggers device vibration if supported (Haptic feedback)
 */
export function triggerHapticFeedback(pattern: number[] = [200, 100, 200]) {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    // ignore
  }
}

/**
 * Request notification permission from the user
 */
export async function requestWebNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Could not request notification permission:', err);
    return 'denied';
  }
}

/**
 * Shows an immediate System Web Push Notification (via Service Worker or Notification constructor)
 * Works robustly when the app is in another tab, minimized, screen locked or backgrounded!
 */
export async function showWebPushNotification(title: string, options: {
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  soundType?: 'success' | 'alert' | 'ping' | 'radar';
  data?: any;
}) {
  playNotificationSound(options.soundType || 'success');
  triggerHapticFeedback([300, 100, 300]);

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  // If permission is still default, try prompting once
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (e) {
      // ignore
    }
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const notificationOptions = {
    body: options.body,
    icon: options.icon || '/icon-192.png',
    badge: options.badge || '/favicon.svg',
    tag: options.tag || ('telemoto-' + Date.now()),
    vibrate: [300, 100, 300, 100, 300],
    data: options.data || { url: '/' },
    requireInteraction: true,
    renotify: true,
  };

  try {
    // 1. Send to Service Worker controller if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: notificationOptions,
      });
    }

    // 2. Direct Service Worker registration showNotification
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, notificationOptions as any);
        return;
      }
    }

    // 3. Fallback to window Notification constructor
    new Notification(title, notificationOptions as any);
  } catch (err) {
    console.warn('Failed to display native Web Notification:', err);
  }
}

/**
 * Schedule a background notification test after a given delay in seconds.
 * Allows users to minimize the browser or lock their phone to test background push!
 */
export function scheduleTestBackgroundNotification(delaySeconds: number = 5) {
  setTimeout(() => {
    showWebPushNotification('🔔 TeleMoto+ (Notificação em Segundo Plano)', {
      body: 'Funciona perfeitamente! Recebeste esta notificação mesmo estando fora da aplicação TeleMoto+.',
      soundType: 'success',
      tag: 'test-bg-notification',
      data: { url: '/' },
    });
  }, delaySeconds * 1000);
}

/**
 * Record notification in Firestore for persistent in-app notifications
 */
export async function createFirestoreNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
  try {
    const colRef = collection(db, 'notifications');
    const cleanPayload = removeUndefinedFields({
      ...notification,
      read: false,
      createdAt: Date.now(),
    });
    await addDoc(colRef, cleanPayload);
  } catch (err) {
    console.warn('Could not record notification in Firestore:', err);
  }
}

/**
 * Helper to notify all admin accounts in Firestore
 */
export async function notifyAdmins(title: string, body: string, type: NotificationType, data?: Record<string, any>) {
  try {
    // 1. Broadcast notification record for admin role
    await createFirestoreNotification({
      userId: 'admin_broadcast',
      recipientRole: 'admin',
      title,
      body,
      type,
      data,
      sound: type === 'sos_alert' ? 'alert' : 'success',
    });

    // 2. Also fetch all users with admin or super_admin role and create records
    const qAdmin = query(collection(db, 'users'), where('role', 'in', ['admin', 'super_admin']));
    const snap = await getDocs(qAdmin);
    snap.forEach(async (d) => {
      await createFirestoreNotification({
        userId: d.id,
        recipientRole: 'admin',
        title,
        body,
        type,
        data,
        sound: type === 'sos_alert' ? 'alert' : 'success',
      });
    });
  } catch (err) {
    console.warn('Could not notify admins:', err);
  }
}

/**
 * EVENT 1: Passenger requests a ride (Alguém à procura de táxi)
 * - Notifies all online drivers
 * - Notifies admins
 */
export async function notifyTripRequested(trip: {
  id: string;
  passengerName: string;
  originName: string;
  destinationName: string;
  fareAmount: number;
}) {
  const title = `🔔 Novo Pedido de Corrida (${trip.fareAmount} MT)!`;
  const body = `Passageiro ${trip.passengerName} procura táxi: ${trip.originName} ➔ ${trip.destinationName}. Toque para aceitar!`;

  // 1. Broadcast notification to all online drivers
  await createFirestoreNotification({
    userId: 'drivers_broadcast',
    recipientRole: 'driver',
    tripId: trip.id,
    title,
    body,
    type: 'trip_requested',
    sound: 'radar',
    data: { tripId: trip.id, fare: trip.fareAmount },
  });

  // 2. Notify Admins
  await notifyAdmins(
    `📍 Nova Corrida Solicitada (${trip.fareAmount} MT)`,
    `${trip.passengerName} pediu mototáxi de ${trip.originName} para ${trip.destinationName}.`,
    'trip_requested',
    { tripId: trip.id }
  );
}

/**
 * EVENT 2: Driver accepts a ride
 * - Notifies Passenger
 * - Notifies Admins
 */
export async function notifyPassengerRideAccepted(trip: {
  id: string;
  passengerId: string;
  passengerName?: string;
  driverName?: string | null;
  bikeBrand?: string;
  bikeModel?: string;
  plateNumber?: string;
  fareAmount?: number;
}) {
  const driverName = trip.driverName || 'O seu moto-taxista';
  const vehicle = trip.plateNumber ? `[${trip.plateNumber}]` : '';

  const title = `🏍️ Corrida Aceite por ${driverName}!`;
  const body = `${driverName} está a caminho na sua mota ${trip.bikeBrand || ''} ${trip.bikeModel || ''} ${vehicle}. Prepare-se no ponto de partida!`;

  // In-app Firestore notification for Passenger
  await createFirestoreNotification({
    userId: trip.passengerId,
    recipientRole: 'passenger',
    tripId: trip.id,
    title,
    body,
    type: 'driver_accepted',
    sound: 'success',
    data: {
      tripId: trip.id,
      driverName: trip.driverName,
      plateNumber: trip.plateNumber,
    },
  });

  // Native Web Push notification
  await showWebPushNotification(title, {
    body,
    soundType: 'success',
    tag: `trip-accepted-${trip.id}`,
    data: { tripId: trip.id },
  });

  // Notify Admins
  await notifyAdmins(
    `✅ Corrida #[${trip.id.slice(-4)}] Aceite`,
    `Motorista ${driverName} aceitou o pedido de ${trip.passengerName || 'Passageiro'} (${trip.fareAmount || 0} MT).`,
    'driver_accepted',
    { tripId: trip.id }
  );
}

/**
 * EVENT 2.1: Passenger accepts driver's price/proposal ("VAI BUSCAR O CLIENTE")
 * - Notifies Driver with pickup action and chat recommendation
 * - Notifies Admins
 */
export async function notifyDriverPriceAcceptedByPassenger(trip: {
  id: string;
  driverId: string;
  passengerName: string;
  originAddress: string;
  destinationAddress: string;
  fareAmount: number;
}) {
  const origShort = (trip.originAddress || '').split('•')[0]?.trim() || 'ponto de partida';
  const destShort = (trip.destinationAddress || '').split('•')[0]?.trim() || 'destino';
  const title = `🚨 VAI BUSCAR! ${trip.passengerName} Aceitou o Preço (${trip.fareAmount} MT)`;
  const body = `O passageiro concordou com o preço! Vá recolher no ponto "${origShort}" para levar a "${destShort}". Dica: Se ao chegar não o vir, use o Chat do TeleMoto+ para enviar mensagens.`;

  // 1. In-app Firestore notification for Driver
  await createFirestoreNotification({
    userId: trip.driverId,
    recipientRole: 'driver',
    tripId: trip.id,
    title,
    body,
    type: 'driver_accepted',
    sound: 'radar',
    data: {
      tripId: trip.id,
      passengerName: trip.passengerName,
      fareAmount: trip.fareAmount,
      origin: trip.originAddress,
      destination: trip.destinationAddress,
    },
  });

  // 2. Native Web Push notification for Driver
  await showWebPushNotification(title, {
    body,
    soundType: 'radar',
    tag: `price-accepted-driver-${trip.id}`,
    data: { tripId: trip.id },
  });

  // 3. Notify Admins
  await notifyAdmins(
    `🤝 Preço Acordado (${trip.fareAmount} MT)`,
    `${trip.passengerName} aceitou o preço com o motorista para a rota de ${origShort} para ${destShort}.`,
    'driver_accepted',
    { tripId: trip.id }
  );
}

/**
 * EVENT 3: Driver arrived at pickup spot
 * - Notifies Passenger
 * - Notifies Admins
 */
export async function notifyDriverArrived(trip: {
  id: string;
  passengerId: string;
  driverName?: string | null;
  plateNumber?: string;
}) {
  const driverName = trip.driverName || 'O seu condutor';
  const title = `🏁 ${driverName} Chegou ao Ponto de Partida!`;
  const body = `O teu motorista já está no local de encontro com a mota ${trip.plateNumber || ''}. Por favor dirija-se até ele.`;

  await createFirestoreNotification({
    userId: trip.passengerId,
    recipientRole: 'passenger',
    tripId: trip.id,
    title,
    body,
    type: 'driver_arrived',
    sound: 'alert',
    data: { tripId: trip.id },
  });

  await showWebPushNotification(title, {
    body,
    soundType: 'alert',
    tag: `driver-arrived-${trip.id}`,
    data: { tripId: trip.id },
  });

  await notifyAdmins(
    `📍 Motorista Chegou ao Ponto de Embarque`,
    `${driverName} chegou para recolher o passageiro na viagem #[${trip.id.slice(-4)}].`,
    'driver_arrived',
    { tripId: trip.id }
  );
}

/**
 * EVENT 3.1: Passenger confirms driver arrival -> Releases boarding phase
 * - Notifies Driver that passenger confirmed presence and boarding is released
 * - Notifies Admins
 */
export async function notifyDriverPassengerConfirmedArrival(trip: {
  id: string;
  driverId: string;
  passengerName?: string;
}) {
  const passengerName = trip.passengerName || 'O Passageiro';
  const title = `🏍️ Embarque Liberado! ${passengerName} Confirmou o Encontro`;
  const body = `${passengerName} confirmou que está consigo no ponto de encontro. A fase de embarque está liberada! Pode iniciar a viagem.`;

  await createFirestoreNotification({
    userId: trip.driverId,
    recipientRole: 'driver',
    tripId: trip.id,
    title,
    body,
    type: 'driver_arrived',
    sound: 'success',
    data: { tripId: trip.id },
  });

  await showWebPushNotification(title, {
    body,
    soundType: 'success',
    tag: `boarding-released-${trip.id}`,
    data: { tripId: trip.id },
  });

  await notifyAdmins(
    `🤝 Embarque Liberado #[${trip.id.slice(-4)}]`,
    `${passengerName} confirmou o encontro com o motorista. Fase de embarque liberada.`,
    'driver_arrived',
    { tripId: trip.id }
  );
}

/**
 * EVENT 4: Trip Started
 * - Notifies Passenger
 * - Notifies Admins
 */
export async function notifyTripStarted(trip: {
  id: string;
  passengerId: string;
  driverName?: string | null;
  destinationName?: string;
}) {
  const title = `🚀 Viagem Iniciada!`;
  const body = `Estão a caminho do destino (${trip.destinationName || 'Destino'}). Tenha uma viagem segura!`;

  await createFirestoreNotification({
    userId: trip.passengerId,
    recipientRole: 'passenger',
    tripId: trip.id,
    title,
    body,
    type: 'trip_started',
    sound: 'success',
    data: { tripId: trip.id },
  });

  await showWebPushNotification(title, {
    body,
    soundType: 'success',
    tag: `trip-started-${trip.id}`,
    data: { tripId: trip.id },
  });

  await notifyAdmins(
    `🚀 Viagem em Andamento #[${trip.id.slice(-4)}]`,
    `A viagem com destino a ${trip.destinationName || 'Destino'} foi iniciada.`,
    'trip_started',
    { tripId: trip.id }
  );
}

/**
 * EVENT 5: Trip Completed
 * - Notifies Passenger
 * - Notifies Driver
 * - Notifies Admins
 */
export async function notifyTripCompleted(trip: {
  id: string;
  passengerId: string;
  driverId?: string | null;
  fareAmount: number;
  paymentMethod: string;
}) {
  const titlePassenger = `✅ Viagem Concluída com Sucesso!`;
  const bodyPassenger = `Chegou ao seu destino. Total a pagar: ${trip.fareAmount} MT (${trip.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Dinheiro'}). Por favor avalie o motorista.`;

  await createFirestoreNotification({
    userId: trip.passengerId,
    recipientRole: 'passenger',
    tripId: trip.id,
    title: titlePassenger,
    body: bodyPassenger,
    type: 'trip_completed',
    sound: 'success',
    data: { tripId: trip.id, fare: trip.fareAmount },
  });

  await showWebPushNotification(titlePassenger, {
    body: bodyPassenger,
    soundType: 'success',
    tag: `trip-completed-${trip.id}`,
    data: { tripId: trip.id },
  });

  if (trip.driverId) {
    const titleDriver = `💰 Viagem Concluída! (+${trip.fareAmount} MT)`;
    const bodyDriver = `Parabéns pela corrida! ${trip.fareAmount} MT adicionados à tua carteira de ganhos.`;

    await createFirestoreNotification({
      userId: trip.driverId,
      recipientRole: 'driver',
      tripId: trip.id,
      title: titleDriver,
      body: bodyDriver,
      type: 'trip_completed',
      sound: 'success',
      data: { tripId: trip.id, fare: trip.fareAmount },
    });
  }

  await notifyAdmins(
    `🏁 Viagem #[${trip.id.slice(-4)}] Concluída`,
    `Viagem finalizada com sucesso no valor de ${trip.fareAmount} MT (${trip.paymentMethod.toUpperCase()}).`,
    'trip_completed',
    { tripId: trip.id }
  );
}

/**
 * EVENT 6: Trip Cancelled
 * - Notifies the other party
 * - Notifies Admins
 */
export async function notifyTripCancelled(trip: {
  id: string;
  passengerId: string;
  driverId?: string | null;
  cancelledBy: 'passenger' | 'driver' | 'system';
  reason?: string;
}) {
  const reasonText = trip.reason ? ` Motivo: ${trip.reason}` : '';

  if (trip.cancelledBy === 'passenger' && trip.driverId) {
    const title = `⚠️ Corrida Cancelada pelo Passageiro`;
    const body = `O passageiro cancelou o pedido de viagem #[${trip.id.slice(-4)}].${reasonText}`;

    await createFirestoreNotification({
      userId: trip.driverId,
      recipientRole: 'driver',
      tripId: trip.id,
      title,
      body,
      type: 'trip_cancelled',
      sound: 'alert',
      data: { tripId: trip.id },
    });

    await showWebPushNotification(title, {
      body,
      soundType: 'alert',
      tag: `trip-cancelled-${trip.id}`,
      data: { tripId: trip.id },
    });
  } else if (trip.cancelledBy === 'driver') {
    const title = `⚠️ Corrida Cancelada pelo Motorista`;
    const body = `O condutor cancelou a viagem #[${trip.id.slice(-4)}].${reasonText} Pode solicitar outro táxi de imediato.`;

    await createFirestoreNotification({
      userId: trip.passengerId,
      recipientRole: 'passenger',
      tripId: trip.id,
      title,
      body,
      type: 'trip_cancelled',
      sound: 'alert',
      data: { tripId: trip.id },
    });

    await showWebPushNotification(title, {
      body,
      soundType: 'alert',
      tag: `trip-cancelled-${trip.id}`,
      data: { tripId: trip.id },
    });
  }

  await notifyAdmins(
    `❌ Viagem Cancelada #[${trip.id.slice(-4)}]`,
    `Viagem cancelada por ${trip.cancelledBy}.${reasonText}`,
    'trip_cancelled',
    { tripId: trip.id }
  );
}

/**
 * EVENT 7: Chat Message Sent
 * - Notifies Recipient with crystal pop sound and message preview
 */
export async function notifyChatMessage(params: {
  tripId: string;
  senderName: string;
  senderRole: 'passenger' | 'driver';
  recipientId: string;
  text: string;
}) {
  const roleLabel = params.senderRole === 'passenger' ? 'Passageiro' : 'Condutor';
  const title = `💬 Mensagem de ${params.senderName} (${roleLabel})`;
  const body = params.text.length > 80 ? `${params.text.slice(0, 77)}...` : params.text;

  await createFirestoreNotification({
    userId: params.recipientId,
    tripId: params.tripId,
    title,
    body,
    type: 'chat_message',
    sound: 'ping',
    data: { tripId: params.tripId, text: params.text },
  });

  await showWebPushNotification(title, {
    body,
    soundType: 'ping',
    tag: `chat-${params.tripId}`,
    data: { tripId: params.tripId },
  });
}

/**
 * EVENT 8: New Driver Submits Application / Documents
 * - Notifies Admins immediately
 */
export async function notifyAdminNewDriverApplication(driver: {
  id: string;
  fullName: string;
  phone: string;
  province?: string;
  bikeBrand?: string;
  plateNumber?: string;
}) {
  const title = `📑 Novo Motorista Submeteu Documentos!`;
  const body = `${driver.fullName} (${driver.phone}) registou a mota ${driver.bikeBrand || ''} [${driver.plateNumber || ''}] em ${driver.province || 'Moçambique'}. Abra o Painel para aprovar.`;

  await notifyAdmins(title, body, 'driver_registered', { driverId: driver.id });
}

/**
 * EVENT 9: Admin Updates Driver Status (Approved, Rejected, Suspended)
 * - Notifies the Driver
 */
export async function notifyDriverStatusChanged(params: {
  driverId: string;
  status: 'approved' | 'rejected' | 'suspended' | 'pending';
  reason?: string;
}) {
  let title = '';
  let body = '';
  let soundType: 'success' | 'alert' = 'success';

  if (params.status === 'approved') {
    title = `🎉 Conta de Motorista Aprovada!`;
    body = `Parabéns! A tua candidatura foi aprovada pela TeleMoto+. Já podes ficar online, receber passageiros e lucrar!`;
    soundType = 'success';
  } else if (params.status === 'rejected') {
    title = `⚠️ Candidatura Rejeitada`;
    body = `A tua candidatura não foi aprovada. ${params.reason ? `Motivo: ${params.reason}` : 'Por favor contacta o suporte.'}`;
    soundType = 'alert';
  } else if (params.status === 'suspended') {
    title = `⛔ Conta Temporariamente Suspensa`;
    body = `A tua conta de motorista foi suspensa pela administração. ${params.reason ? `Motivo: ${params.reason}` : ''}`;
    soundType = 'alert';
  }

  if (title) {
    await createFirestoreNotification({
      userId: params.driverId,
      recipientRole: 'driver',
      title,
      body,
      type: `driver_${params.status}` as NotificationType,
      sound: soundType,
      data: { status: params.status, reason: params.reason },
    });

    await showWebPushNotification(title, {
      body,
      soundType,
      tag: `driver-status-${params.driverId}`,
      data: { status: params.status },
    });
  }
}

/**
 * EVENT 10: SOS Emergency Triggered
 * - High priority alert for all Admins & SOS Contacts
 */
export async function notifySOSAlert(params: {
  sosId: string;
  userName: string;
  userRole: string;
  phone: string;
  lat: number;
  lng: number;
  address?: string;
}) {
  const title = `🚨 ALERTA SOS ATIVADO! (${params.userName})`;
  const body = `EMERGÊNCIA! ${params.userName} (${params.userRole.toUpperCase()} - ${params.phone}) acionou o botão SOS em ${params.address || 'Coordenadas disponíveis'}. Verifique imediatamente!`;

  await notifyAdmins(title, body, 'sos_alert', {
    sosId: params.sosId,
    lat: params.lat,
    lng: params.lng,
    phone: params.phone,
  });

  await showWebPushNotification(title, {
    body,
    soundType: 'alert',
    tag: `sos-${params.sosId}`,
    data: { sosId: params.sosId },
  });
}

/**
 * EVENT 11: Wallet Transaction (Top-Up, Payment, Cashout)
 */
export async function notifyWalletTransaction(params: {
  userId: string;
  amount: number;
  type: 'deposit' | 'payment' | 'earnings';
  description?: string;
}) {
  const title = params.type === 'deposit'
    ? `💳 Depósito Confirmado (+${params.amount} MT)`
    : params.type === 'earnings'
    ? `💰 Ganhos Recebidos (+${params.amount} MT)`
    : `💸 Pagamento Efetuado (-${params.amount} MT)`;

  const body = params.description || `A tua carteira TeleMoto+ foi atualizada com sucesso.`;

  await createFirestoreNotification({
    userId: params.userId,
    title,
    body,
    type: 'wallet_topup',
    sound: 'success',
    data: { amount: params.amount, type: params.type },
  });

  await showWebPushNotification(title, {
    body,
    soundType: 'success',
    tag: `wallet-${Date.now()}`,
    data: { amount: params.amount },
  });
}

/**
 * EVENT 12: Missed VoIP Call
 */
export async function notifyMissedCall(params: {
  recipientId: string;
  callerName: string;
  callerRole: 'passenger' | 'driver';
  tripId: string;
}) {
  const title = `📞 Chamada de Voz Perdida`;
  const body = `Perdeu uma chamada de voz em tempo real de ${params.callerName}.`;

  await createFirestoreNotification({
    userId: params.recipientId,
    title,
    body,
    type: 'missed_call',
    sound: 'alert',
    data: { tripId: params.tripId, callerName: params.callerName },
  });

  await showWebPushNotification(title, {
    body,
    soundType: 'alert',
    tag: `missed-call-${params.tripId}-${Date.now()}`,
    data: { tripId: params.tripId },
  });
}

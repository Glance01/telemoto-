import React, { useEffect, useState, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  AppNotification,
  playNotificationSound,
  triggerHapticFeedback,
  showWebPushNotification,
  requestWebNotificationPermission,
  scheduleTestBackgroundNotification,
} from '../../services/notificationService';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Bike,
  Compass,
  X,
  ShieldAlert,
  Wallet,
  Volume2,
  Sparkles,
} from 'lucide-react';

interface ToastItem {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: number;
}

export const GlobalNotificationListener: React.FC = () => {
  const { user, role, driverProfile } = useAuth();
  const [activeToasts, setActiveToasts] = useState<ToastItem[]>([]);
  const [showPermissionBanner, setShowPermissionBanner] = useState<boolean>(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const sessionStartTime = useRef<number>(Date.now() - 3000); // Only notify for new events
  const processedNotifIds = useRef<Set<string>>(new Set());

  // Check if browser push notification permission is needed
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setShowPermissionBanner(true), 2500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleEnablePush = async () => {
    const res = await requestWebNotificationPermission();
    if (res === 'granted') {
      setShowPermissionBanner(false);
      playNotificationSound('success');
      showWebPushNotification('✅ Notificações em Segundo Plano Ativadas!', {
        body: 'Agora receberá alertas de motoristas, viagens e mensagens mesmo fora da aplicação.',
        soundType: 'success',
      });
    } else {
      setShowPermissionBanner(false);
    }
  };

  const handleTestBackgroundPush = () => {
    setTestCountdown(5);
    scheduleTestBackgroundNotification(5);

    const interval = setInterval(() => {
      setTestCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Listen to Firestore real-time notifications targeted to this user or role
  useEffect(() => {
    if (!user) return;

    // Build query conditions
    const targetUserIds = [user.uid];
    if (role === 'driver' || driverProfile) {
      targetUserIds.push('drivers_broadcast');
    }
    if (role === 'admin' || role === 'super_admin') {
      targetUserIds.push('admin_broadcast');
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', targetUserIds),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = change.doc.data() as AppNotification;
          const notifId = change.doc.id;

          // Only fire for notifications created during this active session
          if (notif.createdAt > sessionStartTime.current && !processedNotifIds.current.has(notifId)) {
            processedNotifIds.current.add(notifId);

            // Determine sound & vibration based on notification
            const soundType = notif.sound || (
              notif.type === 'sos_alert' || notif.type === 'trip_cancelled' || notif.type === 'driver_arrived'
                ? 'alert'
                : notif.type === 'chat_message'
                ? 'ping'
                : notif.type === 'trip_requested'
                ? 'radar'
                : 'success'
            );

            playNotificationSound(soundType);
            triggerHapticFeedback(soundType === 'alert' ? [300, 100, 300] : [200, 100, 200]);

            // Dispatch native Web Push Notification
            showWebPushNotification(notif.title, {
              body: notif.body,
              soundType,
              tag: `notif-${notifId}`,
              data: notif.data,
            });

            // Add in-app toast
            const newToast: ToastItem = {
              id: notifId,
              title: notif.title,
              body: notif.body,
              type: notif.type,
              createdAt: notif.createdAt,
            };

            setActiveToasts((prev) => [newToast, ...prev.slice(0, 2)]);

            // Auto-dismiss toast after 6 seconds
            setTimeout(() => {
              setActiveToasts((prev) => prev.filter((t) => t.id !== notifId));
            }, 6500);
          }
        }
      });
    }, (err) => {
      console.warn('Real-time notifications listener error:', err);
    });

    return () => unsubscribe();
  }, [user, role, driverProfile]);

  const dismissToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'sos_alert':
        return <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />;
      case 'chat_message':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'trip_requested':
        return <Compass className="w-5 h-5 text-amber-500 animate-bounce" />;
      case 'driver_accepted':
      case 'driver_approved':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'driver_arrived':
      case 'trip_started':
        return <Bike className="w-5 h-5 text-amber-500" />;
      case 'trip_cancelled':
      case 'driver_rejected':
      case 'driver_suspended':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'wallet_topup':
        return <Wallet className="w-5 h-5 text-emerald-500" />;
      default:
        return <Bell className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <>
      {/* PUSH PERMISSION PROMPT BANNER */}
      {showPermissionBanner && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-neutral-900 text-white p-4 rounded-2xl shadow-2xl border border-neutral-700 flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-100">Ativar Notificações Fora do App</p>
              <p className="text-[11px] text-neutral-400 leading-tight">
                Receba alertas instantâneos no telemóvel mesmo com a tela bloqueada ou noutra aba.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleEnablePush}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-transform active:scale-95"
            >
              Ativar
            </button>
            <button
              onClick={() => setShowPermissionBanner(false)}
              className="text-neutral-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BACKGROUND NOTIFICATION TEST BANNER / COUNTDOWN */}
      {testCountdown !== null && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-neutral-950 font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 animate-spin" />
          <span className="text-xs">
            Teste em <strong>{testCountdown}s</strong>! Mude de aba ou bloqueie a tela agora para testar.
          </span>
        </div>
      )}

      {/* FLOATING IN-APP NOTIFICATION TOASTS */}
      {activeToasts.length > 0 && (
        <div className="fixed top-18 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 space-y-2 pointer-events-none">
          {activeToasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl p-3.5 flex items-start gap-3 animate-slide-down transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 shadow-xs">
                {getToastIcon(toast.type)}
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-black text-neutral-900 dark:text-white tracking-tight leading-snug">
                  {toast.title}
                </p>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-0.5 leading-normal line-clamp-2">
                  {toast.body}
                </p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 cursor-pointer rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

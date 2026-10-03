import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  X, 
  User, 
  LogOut, 
  Sun, 
  Moon, 
  Compass, 
  Wallet, 
  Route, 
  Bike, 
  ChevronRight, 
  Download,
  Bell,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AppNotification } from '../../services/notificationService';
import { useIsStandalone } from '../../hooks/useIsStandalone';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSOS?: () => void;
  onOpenDownloadModal?: () => void;
  onOpenEditProfile?: () => void;
  onNavigateHome?: () => void;
  onNavigateTrips?: () => void;
  onNavigateWallet?: () => void;
  onNavigateProfile?: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ 
  isOpen, 
  onClose,
  onOpenSOS,
  onOpenDownloadModal,
  onOpenEditProfile,
  onNavigateHome,
  onNavigateTrips,
  onNavigateWallet,
  onNavigateProfile,
}) => {
  const { user, userProfile, driverProfile, role, logout, switchActiveRole } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const isStandalone = useIsStandalone();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const targetUserIds = [user.uid];
    if (role === 'driver') {
      targetUserIds.push('drivers_broadcast');
    }
    if (role === 'admin' || role === 'super_admin') {
      targetUserIds.push('admin_broadcast');
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', targetUserIds),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setNotifications(list);
    }, (err) => {
      console.warn('HamburgerMenu notifications stream warning:', err);
    });

    return () => unsubscribe();
  }, [user, role]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read && n.id);
      for (const n of unread) {
        if (n.id) {
          await updateDoc(doc(db, 'notifications', n.id), { read: true });
        }
      }
    } catch (e) {
      console.warn('Could not mark notifications read:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />
      
      {/* Menu Drawer Panel */}
      <div 
        ref={menuRef}
        className="relative w-84 sm:w-96 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white h-full shadow-2xl border-l border-neutral-200 dark:border-neutral-800 animate-slide-left p-5 flex flex-col overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shadow-sm">
              <Bike className="w-4 h-4" />
            </div>
            <h2 className="text-base font-black uppercase tracking-tight text-neutral-900 dark:text-white">
              Menu TeleMoto+
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Card */}
        <div className="p-4 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800/80 dark:to-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-700/80 my-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-xl overflow-hidden border-2 border-red-500/40 shrink-0 shadow-md">
              {userProfile?.photoUrl || driverProfile?.photoUrl ? (
                <img 
                  src={userProfile?.photoUrl || driverProfile?.photoUrl} 
                  alt="Perfil" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                userProfile?.fullName?.[0]?.toUpperCase() || driverProfile?.fullName?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-neutral-900 dark:text-white truncate">
                {driverProfile?.fullName || userProfile?.fullName || 'Utilizador TeleMoto+'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60">
                  {role === 'driver' ? 'Motorista Oficial 🏍️' : role === 'admin' || role === 'super_admin' ? 'Administrador 🛡️' : 'Passageiro 🚶'}
                </span>
              </div>
              {role === 'driver' && driverProfile?.plateNumber && (
                <p className="text-[11px] font-mono font-bold text-neutral-500 dark:text-neutral-400 mt-1">
                  Matrícula: {driverProfile.plateNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
          {/* Home / Cockpit Navigation */}
          <button
            onClick={() => {
              if (onNavigateHome) onNavigateHome();
              else window.location.href = '/';
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-red-600 dark:text-red-400">
                <Compass className="w-4 h-4" />
              </div>
              <span>{role === 'driver' ? 'Painel de Condução' : 'Página Inicial / Mapa'}</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          {/* My Trips */}
          <button
            onClick={() => {
              if (onNavigateTrips) onNavigateTrips();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-red-600 dark:text-red-400">
                <Route className="w-4 h-4" />
              </div>
              <span>Histórico de Viagens</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          {/* Wallet (for driver and passenger) */}
          <button
            onClick={() => {
              if (onNavigateWallet) onNavigateWallet();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-red-600 dark:text-red-400">
                <Wallet className="w-4 h-4" />
              </div>
              <span>Carteira & Rendimentos</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          {/* Profile & Vehicle presentation */}
          <button
            onClick={() => {
              if (onOpenEditProfile) onOpenEditProfile();
              else if (onNavigateProfile) onNavigateProfile();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-red-600 dark:text-red-400">
                <User className="w-4 h-4" />
              </div>
              <span>{role === 'driver' ? 'Editar Perfil & Moto' : 'Meu Perfil'}</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          {/* SOS EMERGENCY BUTTON (INSIDE MENU) */}
          {onOpenSOS && (
            <button
              onClick={() => {
                onOpenSOS();
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all cursor-pointer shadow-md shadow-red-600/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20 text-white">
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                </div>
                <span>Emergência SOS 24/7</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded-md">Ativar</span>
            </button>
          )}

          {/* Download App (Hidden in standalone app mode) */}
          {!isStandalone && onOpenDownloadModal && (
            <button
              onClick={() => {
                onOpenDownloadModal();
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800/60"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                  <Download className="w-4 h-4" />
                </div>
                <span>Instalar / Baixar App</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>
          )}

          {/* THEME SELECTOR */}
          <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block px-1">
              Tema da Aplicação
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-neutral-900 text-white border-red-500 shadow-sm ring-1 ring-red-500/40'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Escuro</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-neutral-950 border-red-500 shadow-sm ring-1 ring-red-500/40'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Claro</span>
              </button>
            </div>
          </div>

          {/* NOTIFICATIONS STREAM */}
          <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-red-500" /> Notificações
              </span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer">
                  Marcar lidas ({unreadCount})
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
              {notifications.length === 0 ? (
                <p className="text-[11px] text-neutral-400 text-center py-2 italic">Sem novas notificações</p>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-2.5 rounded-xl text-xs border transition-colors ${
                      n.read 
                        ? 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200/60 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400' 
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-neutral-900 dark:text-white font-medium'
                    }`}
                  >
                    <p className="font-bold leading-snug">{n.title}</p>
                    {(n.body || (n as any).message) && (
                      <p className="text-[11px] opacity-80 leading-snug mt-0.5">
                        {n.body || (n as any).message}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* LOGOUT BUTTON */}
        <button
          onClick={() => { logout(); onClose(); }}
          className="w-full mt-4 py-3.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-colors border border-red-200 dark:border-red-900/50 cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
      </div>
    </div>
  );
};

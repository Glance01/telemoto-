import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '../../types';
import telemotoLogo from '../../assets/images/telemoto_app_logo.png';
import {
  Shield,
  User,
  LogOut,
  LogIn,
  AlertTriangle,
  Bell,
  BellRing,
  Sun,
  Moon,
  Menu,
  X,
  Compass,
  Wallet,
  Route,
  Bike,
  ChevronRight,
  Download,
  Sparkles,
} from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AppNotification } from '../../services/notificationService';
import { useIsStandalone } from '../../hooks/useIsStandalone';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenSOS: () => void;
  onNavigateLanding?: () => void;
  onNavigateTab?: (tab: 'home' | 'trips' | 'wallet' | 'profile') => void;
  activeTab?: string;
  onOpenDownloadModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenSOS,
  onNavigateLanding,
  onNavigateTab,
  activeTab = 'home',
  onOpenDownloadModal,
}) => {
  const { user, userProfile, role, logout, switchActiveRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isStandalone = useIsStandalone();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-hide navbar on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 70) {
        setIsVisible(false);
        setMenuOpen(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Real-time listener for user notifications in Firestore
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
      limit(15)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setNotifications(list);
      },
      (err) => {
        console.warn('Notifications stream warning:', err);
      }
    );

    return () => unsubscribe();
  }, [user, role]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 h-16 sm:h-20 transition-all duration-500 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="h-full px-4 sm:px-8 flex items-center justify-center">
        <div className="w-full max-w-7xl ios-glass dark:bg-neutral-900/80 h-14 sm:h-16 rounded-2xl sm:rounded-[1.25rem] border border-white/20 dark:border-white/5 shadow-2xl flex items-center justify-between px-3 sm:px-5">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateLanding}
              className="flex items-center gap-3 hover:opacity-80 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-lg border-2 border-red-500/30 bg-black flex items-center justify-center group-hover:scale-105 transition-transform">
                <img src={telemotoLogo} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg sm:text-xl tracking-tighter text-neutral-950 dark:text-white uppercase italic">
                  Tele<span className="text-red-600">Moto+</span>
                </span>
                <span className="hidden xs:inline-block px-1.5 py-0.5 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-[8px] font-black rounded uppercase">MZ</span>
              </div>
            </button>
          </div>

          {/* Nav Items - Centered Pill */}
          {user && onNavigateTab && (
            <nav className="hidden md:flex items-center bg-neutral-200/40 dark:bg-neutral-800/40 p-1 rounded-2xl border border-white/10">
              <button
                onClick={() => onNavigateTab('home')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'home' ? 'bg-white dark:bg-neutral-700 text-neutral-950 dark:text-white shadow-lg' : 'text-neutral-500'
                }`}
              >
                {role === 'driver' ? 'Painel' : 'Mapa'}
              </button>
              <button
                onClick={() => onNavigateTab(role === 'driver' ? 'wallet' : 'trips')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === (role === 'driver' ? 'wallet' : 'trips') ? 'bg-white dark:bg-neutral-700 text-neutral-950 dark:text-white shadow-lg' : 'text-neutral-500'
                }`}
              >
                {role === 'driver' ? 'Carteira' : 'Viagens'}
              </button>
              <button
                onClick={() => onNavigateTab('profile')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'profile' ? 'bg-white dark:bg-neutral-700 text-neutral-950 dark:text-white shadow-lg' : 'text-neutral-500'
                }`}
              >
                Perfil
              </button>
            </nav>
          )}

          {/* Action Tools */}
          <div className="flex items-center gap-2" ref={menuRef}>
            {/* SOS Trigger */}
            <button
              onClick={onOpenSOS}
              className="px-3.5 py-2 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 hover:bg-red-700 transition-all active:scale-95 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">SOS</span>
            </button>

            {/* Auth/Menu Trigger */}
            <div className="relative">
              {user ? (
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all cursor-pointer relative"
                >
                  {userProfile?.photoUrl ? (
                    <img src={userProfile.photoUrl} alt="Me" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-neutral-500" />
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-600 border-2 border-white dark:border-neutral-900 rounded-full" />
                  )}
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 ios-glass border border-neutral-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-900 dark:text-white shadow-sm hover:bg-white dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  Entrar
                </button>
              )}

              {/* Menu Dropdown */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-64 ios-glass dark:bg-neutral-900 rounded-[1.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/5 py-4 overflow-hidden"
                  >
                    <div className="px-4 pb-4 mb-4 border-b border-white/10">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Conta Ativa</p>
                      <p className="font-black text-neutral-900 dark:text-white truncate italic">{userProfile?.fullName || 'Utilizador'}</p>
                    </div>

                    <div className="px-2 space-y-1">
                      <button 
                        onClick={() => { setMenuOpen(false); toggleTheme(); }}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/40 dark:hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-500" />}
                          <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Modo {theme === 'dark' ? 'Claro' : 'Escuro'}</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => { setMenuOpen(false); logout(); }}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-500/10 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">Sair</span>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

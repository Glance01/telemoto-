import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RideProvider, useRide } from './context/RideContext';
import { CallProvider } from './context/CallContext';
import { InAppAudioCallModal } from './components/common/InAppAudioCallModal';
import { UserRole } from './types';
import { Navbar } from './components/common/Navbar';
import { GlobalNotificationListener } from './components/common/GlobalNotificationListener';
import { QuotaNotice } from './components/common/QuotaNotice';
import { OfflineNotice } from './components/common/OfflineNotice';
import { EmergencyModal } from './components/common/EmergencyModal';
import { AuthModal } from './components/common/AuthModal';
import { PassengerHome } from './components/passenger/PassengerHome';
import { DriverDashboard } from './components/driver/DriverDashboard';
import { DriverRegistration } from './components/driver/DriverRegistration';
import { DriverWalletView } from './components/driver/DriverWalletView';
import { DriverProfileView } from './components/driver/DriverProfileView';
import { PassengerProfileView } from './components/passenger/PassengerProfileView';
import { MyTripsHistoryView } from './components/passenger/MyTripsHistoryView';
import { AdminPanel } from './components/admin/AdminPanel';
import { LandingPage } from './components/landing/LandingPage';
import { DownloadAppModal } from './components/common/DownloadAppModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useIsStandalone } from './hooks/useIsStandalone';
import {
  MapPin,
  Route,
  Wallet,
  User,
  Shield,
  Bike,
  Compass,
  Home,
  Clock,
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, userProfile, driverProfile, role, switchActiveRole, loading } = useAuth();
  const { activeTrip } = useRide();
  const isStandalone = useIsStandalone();

  // Navigation states: When opened as installed app/PWA, launch directly into the app
  const [viewMode, setViewMode] = useState<'landing' | 'app'>(() => {
    if (isStandalone) return 'app';
    const saved = localStorage.getItem('telemoto_view_mode');
    if (saved === 'app') return 'app';
    return 'landing';
  });
  const [activeTab, setActiveTab] = useState<'home' | 'trips' | 'wallet' | 'profile'>(
    'home'
  );

  // When user is running the app as PWA, installed shortcut, or inside the active ride app, hide all download prompts
  const isUsingAsApp = isStandalone || viewMode === 'app' || !!user;
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('register');
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('passenger');
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isDownloadAppOpen, setIsDownloadAppOpen] = useState(false);

  const openAuthModal = (
    mode: 'login' | 'register' = 'register',
    roleTarget: UserRole = 'passenger',
    prompt?: string
  ) => {
    setAuthInitialMode(mode);
    setAuthInitialRole(roleTarget);
    setAuthPromptMessage(prompt || null);
    setIsAuthOpen(true);
  };

  // If user is not logged in, restrict view strictly to landing page. If logged in, allow app view.
  useEffect(() => {
    if (!loading) {
      if (!user) {
        setViewMode('landing');
        localStorage.setItem('telemoto_view_mode', 'landing');
      } else {
        setIsAuthOpen(false);
        setViewMode('app');
        localStorage.setItem('telemoto_view_mode', 'app');
      }
    }
  }, [user, loading]);

  // Splash screen during initial authentication handshake
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center space-y-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-red-600/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-2xl">
            <Bike className="w-10 h-10 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">
            Tele<span className="text-red-600">Moto+</span>
          </h1>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Conectando Moçambique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5] dark:bg-neutral-950 text-[#171717] dark:text-neutral-100 w-full transition-colors duration-200">
      {/* Offline Status Tracker */}
      <OfflineNotice />

      {/* Global Real-Time Push & In-App Notification System */}
      <GlobalNotificationListener />

      {/* Top Navbar */}
      <Navbar
        onOpenAuth={() => openAuthModal('login', role, undefined)}
        onOpenSOS={() => setIsEmergencyOpen(true)}
        onOpenDownloadModal={isUsingAsApp ? undefined : () => setIsDownloadAppOpen(true)}
        activeTab={activeTab}
        onNavigateTab={(tab) => {
          setViewMode('app');
          setActiveTab(tab);
          localStorage.setItem('telemoto_view_mode', 'app');
        }}
        onNavigateLanding={() => {
          if (user || isStandalone) {
            setViewMode('app');
            setActiveTab('home');
          } else {
            setViewMode('landing');
            localStorage.setItem('telemoto_view_mode', 'landing');
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {viewMode === 'landing' ? (
          <div className="w-full h-full">
            <LandingPage
              onStartRide={() => {
                if (!user) {
                  openAuthModal(
                    'register',
                    'passenger',
                    'Cria a tua conta no TeleMoto+ para pedir uma moto e acompanhar o motorista em tempo real.'
                  );
                } else {
                  setViewMode('app');
                }
              }}
              onBeDriver={() => {
                if (!user) {
                  openAuthModal(
                    'register',
                    'driver',
                    'Cria a tua conta de condutor no TeleMoto+ para começar a receber viagens e faturar.'
                  );
                } else {
                  setViewMode('app');
                }
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            {/* PASSENGER ROLE */}
            {role === 'passenger' && (
              <div className="flex-1 flex flex-col">
                {activeTab === 'home' && (
                  <PassengerHome
                    onOpenSOS={() => setIsEmergencyOpen(true)}
                    onOpenAuth={(mode, roleTarget, prompt) =>
                      openAuthModal(mode || 'register', roleTarget || 'passenger', prompt)
                    }
                    onNavigateTab={(tab) => {
                      setViewMode('app');
                      setActiveTab(tab);
                    }}
                  />
                )}

                {activeTab === 'trips' && (
                  <MyTripsHistoryView
                    onNavigateHome={() => setActiveTab('home')}
                    onOpenAuth={(mode, roleTarget, prompt) =>
                      openAuthModal(mode || 'login', roleTarget || 'passenger', prompt)
                    }
                  />
                )}

                {activeTab === 'profile' && (
                  <PassengerProfileView onOpenSOS={() => setIsEmergencyOpen(true)} />
                )}
              </div>
            )}

            {/* DRIVER ROLE */}
            {role === 'driver' && (
              <div className="flex-1 flex flex-col">
                {activeTab === 'home' && (
                  <DriverDashboard onOpenSOS={() => setIsEmergencyOpen(true)} />
                )}
                {activeTab === 'trips' && (
                  <MyTripsHistoryView
                    onNavigateHome={() => setActiveTab('home')}
                    onOpenAuth={(mode, roleTarget, prompt) =>
                      openAuthModal(mode || 'login', roleTarget || 'driver', prompt)
                    }
                  />
                )}
                {activeTab === 'wallet' && <DriverWalletView />}
                {activeTab === 'profile' && <DriverProfileView />}
              </div>
            )}

            {/* ADMIN ROLE */}
            {(role === 'admin' || role === 'super_admin') && (
              <div className="flex-1 h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] overflow-y-auto pb-24 scrollbar-thin">
                <AdminPanel />
              </div>
            )}
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {viewMode === 'app' && (
        <nav
          aria-label="Navegação Principal"
          className="md:hidden fixed bottom-4 left-4 right-4 z-[70] ios-glass dark:bg-neutral-900/95 rounded-[2rem] border border-white/20 dark:border-white/10 py-2.5 px-6 flex items-center justify-around shadow-[0_20px_50px_-10px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 pointer-events-auto"
        >
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-all active:scale-90 cursor-pointer ${
              activeTab === 'home' ? 'text-red-600 scale-105' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Compass className={`w-5 h-5 ${activeTab === 'home' ? 'fill-red-600/10' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{role === 'driver' ? 'Painel' : 'Mapa'}</span>
          </button>

          {role === 'driver' ? (
            <button
              type="button"
              onClick={() => setActiveTab('wallet')}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 cursor-pointer ${
                activeTab === 'wallet' ? 'text-red-600 scale-105' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Wallet className={`w-5 h-5 ${activeTab === 'wallet' ? 'fill-red-600/10' : ''}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">Carteira</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('trips')}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 cursor-pointer ${
                activeTab === 'trips' ? 'text-red-600 scale-105' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Route className={`w-5 h-5 ${activeTab === 'trips' ? 'fill-red-600/10' : ''}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">Viagens</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEmergencyOpen(true)}
            className="flex flex-col items-center gap-1 text-red-600 active:scale-90 transition-transform cursor-pointer"
            title="Botão de Emergência SOS"
          >
            <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 -mt-7 border-4 border-white dark:border-neutral-900">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">SOS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 transition-all active:scale-90 cursor-pointer ${
              activeTab === 'profile' ? 'text-red-600 scale-105' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <User className={`w-5 h-5 ${activeTab === 'profile' ? 'fill-red-600/10' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">Perfil</span>
          </button>
        </nav>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authInitialMode}
        initialRole={authInitialRole}
        promptMessage={authPromptMessage}
      />

      {/* Emergency Modal */}
      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        activeTrip={activeTrip}
      />

      {/* Automatic Download & Install App Popup (Hidden completely when running as installed app or inside app mode) */}
      {!isUsingAsApp && (
        <DownloadAppModal
          forceOpen={isDownloadAppOpen}
          onClose={() => setIsDownloadAppOpen(false)}
        />
      )}

      {/* Global In-App VoIP Call Modal */}
      <InAppAudioCallModal />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RideProvider>
            <CallProvider>
              <MainAppContent />
            </CallProvider>
          </RideProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useRide } from '../../context/RideContext';
import { useTheme } from '../../context/ThemeContext';
import { ProfessionalFleetMap } from './ProfessionalFleetMap';
import { ActiveRideView } from './ActiveRideView';
import { ChatModal } from './ChatModal';
import { TripReceiptModal } from './TripReceiptModal';
import { PostTripRatingModal } from './PostTripRatingModal';
import { DriverSelectionCarousel } from './DriverSelectionCarousel';
import { DriverListView } from './DriverListView';
import { HamburgerMenu } from '../common/HamburgerMenu';
import { LocationPoint, UserRole, DriverProfile } from '../../types';
import {
  MOZAMBIQUE_ADMIN_DIVISIONS,
  PROVINCES_LIST,
  getDistrictCoordinates,
  searchMozambiquePlaces,
  getPlacesForDistrict,
  MozambiquePlace,
  PlaceCategory,
} from '../../lib/mozambiqueLocations';
import { playNotificationSound } from '../../services/notificationService';
import {
  getAntiAbuseSettings,
  checkSuspensionStatus,
  validateOriginDistance,
  AntiAbuseSettings,
} from '../../services/antiAbuseService';
import {
  MapPin,
  Navigation,
  Search,
  Bike,
  Shield,
  AlertCircle,
  BellRing,
  Sparkles,
  X,
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Smartphone,
  CreditCard,
  Clock,
  Navigation2,
  Layers,
  Store,
  Bus,
  Hospital,
  GraduationCap,
  Fuel,
  Building2,
  Palmtree,
  Map,
  Zap,
  Menu,
} from 'lucide-react';

interface PassengerHomeProps {
  onOpenSOS: () => void;
  onOpenAuth: (mode?: 'login' | 'register', role?: UserRole, prompt?: string) => void;
  onNavigateTab?: (tab: 'home' | 'trips' | 'wallet' | 'profile') => void;
}

export const PassengerHome: React.FC<PassengerHomeProps> = ({ onOpenSOS, onOpenAuth, onNavigateTab }) => {
  const { user, userProfile } = useAuth();
  const {
    activeTrip,
    nearbyDrivers,
    originPoint,
    destinationPoint,
    distanceKm,
    estimatedDurationMin,
    fareBreakdown,
    paymentMethod,
    isSearching,
    searchTimedOut,
    setSearchTimedOut,
    pushPermission,
    requestPushPermission,
    setOriginPoint,
    setDestinationPoint,
    setPaymentMethod,
    requestRide,
    cancelCurrentTrip,
    refreshNearbyDrivers,
  } = useRide();

  // Regional & Anti-Abuse state
  const [antiAbuseSettings, setAntiAbuseSettings] = useState<AntiAbuseSettings | null>(null);
  const [gpsWarning, setGpsWarning] = useState<{ show: boolean; distanceMeters: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    getAntiAbuseSettings().then(setAntiAbuseSettings).catch(console.warn);
  }, []);

  const handleCorrectOriginToGps = (lat: number, lng: number) => {
    const addr = `Localização Atual (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    setOriginInput(addr);
    setOriginPoint({
      address: addr,
      lat,
      lng,
    });
    setGpsWarning(null);
    setViewMode('selection');
    showToast('Ponto de partida corrigido para a sua localização real!');
  };

  const suspension = checkSuspensionStatus(userProfile?.suspendedUntil || 0);

  // Region & District selector
  const [selectedProvince, setSelectedProvince] = useState<string>('Inhambane');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Massinga');
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState<boolean>(false);

  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number }>(() =>
    getDistrictCoordinates('Inhambane', 'Massinga')
  );
  const [locating, setLocating] = useState<boolean>(false);
  const [originInput, setOriginInput] = useState<string>('');
  const [destinationInput, setDestinationInput] = useState<string>('');
  const [originHighlight, setOriginHighlight] = useState<boolean>(false);
  const originInputRef = useRef<HTMLInputElement>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [receiptTrip, setReceiptTrip] = useState<any | null>(null);
  const [dismissedRatingTripId, setDismissedRatingTripId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [focusedInput, setFocusedInput] = useState<'origin' | 'destination' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory>('all');
  const [isSheetMinimized, setIsSheetMinimized] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'search' | 'selection'>('search');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to create/resolve a LocationPoint from any custom manually typed text in Mozambique
  const resolveLocationPoint = (text: string, isOrigin: boolean = false): LocationPoint => {
    const clean = text.trim();
    const districtCoords = getDistrictCoordinates(selectedProvince, selectedDistrict);
    
    // Check if place matches any registered landmark in Mozambique
    const matches = searchMozambiquePlaces(clean, selectedProvince, selectedDistrict, 'all');
    if (matches.length > 0) {
      return {
        address: `${matches[0].name} • ${matches[0].district}`,
        lat: matches[0].lat,
        lng: matches[0].lng,
      };
    }

    // Otherwise create coordinate with realistic district offset
    const offset = isOrigin ? 0 : 0.012;
    return {
      address: clean.includes('•') ? clean : `${clean} • ${selectedDistrict}`,
      lat: Number((districtCoords.lat + offset).toFixed(6)),
      lng: Number((districtCoords.lng + (isOrigin ? 0 : 0.008)).toFixed(6)),
    };
  };

  // Categories list for fast filtering
  const categoriesList: { id: PlaceCategory; label: string; icon: string }[] = [
    { id: 'all', label: 'Todos', icon: '⚡' },
    { id: 'market', label: 'Mercados', icon: '🛒' },
    { id: 'transport', label: 'Paragens', icon: '🚐' },
    { id: 'health', label: 'Saúde', icon: '🏥' },
    { id: 'education', label: 'Escolas', icon: '🏫' },
    { id: 'fuel', label: 'Bombas', icon: '⛽' },
    { id: 'bank', label: 'Bancos / M-Pesa', icon: '🏦' },
    { id: 'beach', label: 'Praias', icon: '🏖️' },
    { id: 'neighborhood', label: 'Bairros', icon: '📍' },
    { id: 'public', label: 'Serviços', icon: '🏛️' },
  ];

  // Dynamic places computed from rich Mozambique database & search input
  const activeSearchQuery = focusedInput === 'origin' ? originInput : destinationInput;
  const searchedPlaces = useMemo(() => {
    return searchMozambiquePlaces(
      activeSearchQuery,
      selectedProvince,
      selectedDistrict,
      selectedCategory
    );
  }, [activeSearchQuery, selectedProvince, selectedDistrict, selectedCategory]);

  const handleDistrictChange = (prov: string, dist: string) => {
    setSelectedProvince(prov);
    setSelectedDistrict(dist);
    const coords = getDistrictCoordinates(prov, dist);
    setCurrentLocation(coords);
    setOriginInput('');
    setOriginPoint(null);
    setDestinationInput('');
    setDestinationPoint(null);
    refreshNearbyDrivers(coords.lat, coords.lng, prov, dist);
    setIsLocationPickerOpen(false);
  };

  // Initialize default location on load (leaving pickup point empty for passenger to type)
  useEffect(() => {
    const coords = getDistrictCoordinates(selectedProvince, selectedDistrict);
    refreshNearbyDrivers(coords.lat, coords.lng, selectedProvince, selectedDistrict);
    setOriginInput('');
    setOriginPoint(null);
  }, []);

  const handleOriginChange = (val: string) => {
    setOriginInput(val);
    if (val.trim()) {
      setOriginHighlight(false);
      // Automatically construct and save location point from manual input
      const point = resolveLocationPoint(val, true);
      setOriginPoint(point);
    } else {
      setOriginPoint(null);
    }
  };

  const handleDestinationChange = (val: string) => {
    setDestinationInput(val);
    setSearchFocused(true);
    if (val.trim()) {
      const point = resolveLocationPoint(val, false);
      setDestinationPoint(point);
    } else {
      setDestinationPoint(null);
    }
  };

  const handleLocateMe = () => {
    if ('geolocation' in navigator) {
      setLocating(true);
      showToast('A obter localização atual...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const addr = `Localização Atual (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          setOriginInput(addr);
          setOriginPoint({
            address: addr,
            lat,
            lng,
          });
          setOriginHighlight(false);
          showToast('Ponto de partida definido via GPS!');
        },
        (err) => {
          setLocating(false);
          console.warn('Geolocation error:', err);
          showToast('GPS indisponível. Por favor, escreva onde você está.');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      showToast('Por favor, escreva manualmente onde você está.');
    }
  };

  const handleSelectPlace = (place: MozambiquePlace) => {
    const fullAddress = `${place.name} • ${place.district}`;
    
    if (focusedInput === 'origin') {
      setOriginInput(fullAddress);
      setOriginPoint({
        address: fullAddress,
        lat: place.lat,
        lng: place.lng,
      });
      setFocusedInput(null);
      setOriginHighlight(false);
      showToast('Ponto de partida guardado!');
      if (!destinationInput.trim()) {
        setFocusedInput('destination');
        setSearchFocused(true);
      }
      return;
    }

    setDestinationInput(fullAddress);
    setDestinationPoint({
      address: fullAddress,
      lat: place.lat,
      lng: place.lng,
    });
    setSearchFocused(false);
    setIsSheetMinimized(false);

    // If starting point is not provided yet, keep on search view and focus origin
    if (!originInput.trim()) {
      showToast('Destino guardado! Agora escreva onde você está (Ponto de Partida).');
      originInputRef.current?.focus();
      setOriginHighlight(true);
      setTimeout(() => setOriginHighlight(false), 3500);
      setViewMode('search');
    } else {
      if (!originPoint) {
        setOriginPoint(resolveLocationPoint(originInput, true));
      }
      setViewMode('selection');
    }
  };

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    setIsSheetMinimized(false);
    if (!originPoint) {
      const addr = `Ponto Marcado (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
      setOriginInput(addr);
      setOriginPoint({
        address: addr,
        lat: coords.lat,
        lng: coords.lng,
      });
      showToast('Ponto de partida marcado! Agora escolha o destino.');
    } else {
      const addr = `Ponto no Mapa (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
      setDestinationInput(addr);
      setDestinationPoint({
        address: addr,
        lat: coords.lat,
        lng: coords.lng,
      });
      setSearchFocused(false);
    }
  };

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let effectiveOrigin = originPoint;
    if (originInput.trim() && !effectiveOrigin) {
      effectiveOrigin = resolveLocationPoint(originInput, true);
      setOriginPoint(effectiveOrigin);
    }

    if (!originInput.trim() || !effectiveOrigin) {
      showToast('Por favor, escreva onde você está (Ponto de Partida).');
      originInputRef.current?.focus();
      setOriginHighlight(true);
      setTimeout(() => setOriginHighlight(false), 3500);
      return;
    }

    let effectiveDestination = destinationPoint;
    if (destinationInput.trim() && !effectiveDestination) {
      effectiveDestination = resolveLocationPoint(destinationInput, false);
      setDestinationPoint(effectiveDestination);
    }

    if (!destinationInput.trim() || !effectiveDestination) {
      showToast('Por favor, escreva o local de destino.');
      return;
    }

    setSearchFocused(false);
    showToast('Rota definida! A encontrar os melhores motoristas.');
    setViewMode('selection');
    setIsSheetMinimized(false);
  };

  const handleRequestRide = async (preferredDriver?: DriverProfile) => {
    if (!user) {
      onOpenAuth(
        'register',
        'passenger',
        'Para pedir uma mototáxi e acompanhar a tua viagem em tempo real, cria a tua conta no TeleMoto+.'
      );
      return;
    }

    let effectiveOrigin = originPoint;
    if (originInput.trim() && !effectiveOrigin) {
      effectiveOrigin = resolveLocationPoint(originInput, true);
      setOriginPoint(effectiveOrigin);
    }

    if (!originInput.trim() || !effectiveOrigin) {
      showToast('Por favor, escreva onde você está (Ponto de Partida).');
      setViewMode('search');
      originInputRef.current?.focus();
      setOriginHighlight(true);
      setTimeout(() => setOriginHighlight(false), 3500);
      return;
    }

    let effectiveDestination = destinationPoint;
    if (destinationInput.trim() && !effectiveDestination) {
      effectiveDestination = resolveLocationPoint(destinationInput, false);
      setDestinationPoint(effectiveDestination);
    }

    if (!destinationInput.trim() || !effectiveDestination) {
      showToast('Por favor, defina o local de destino primeiro.');
      return;
    }

    try {
      showToast('A enviar o seu pedido...');
      playNotificationSound('radar');
      const tripId = await requestRide(preferredDriver);
      if (!tripId) {
        showToast('Não foi possível iniciar o pedido. Verifique a sua ligação.');
      }
    } catch (err) {
      console.error('Request ride error:', err);
      showToast('Erro ao solicitar viagem. Tente novamente.');
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-neutral-100 dark:bg-neutral-950 overflow-hidden flex flex-col lg:flex-row font-sans">
      {/* 1. IMMERSIVE RADAR HUD */}
      <div className="flex-1 relative w-full h-full">
        <ProfessionalFleetMap
          origin={originPoint}
          destination={destinationPoint}
          nearbyDrivers={nearbyDrivers}
          isSearching={isSearching}
          activeTrip={activeTrip}
          selectedDistrict={selectedDistrict}
          selectedProvince={selectedProvince}
          hideDrivers={isLocationPickerOpen}
          onSelectDriver={(driver) => handleRequestRide(driver)}
          onPromptOrigin={() => {
            setIsSheetMinimized(false);
            originInputRef.current?.focus();
            setOriginHighlight(true);
            setTimeout(() => setOriginHighlight(false), 3500);
            showToast('Por favor, escreva onde você está (Ponto de Partida).');
          }}
          onSimulateSelectDestination={(name, lat, lng) => {
            const fullAddress = `${name} • ${selectedDistrict}`;
            setDestinationInput(fullAddress);
            setDestinationPoint({
              address: fullAddress,
              lat,
              lng,
            });
            if (!originInput.trim() || !originPoint) {
              showToast('Destino selecionado! Agora por favor escreva onde você está.');
              originInputRef.current?.focus();
              setOriginHighlight(true);
              setTimeout(() => setOriginHighlight(false), 3500);
              setIsSheetMinimized(false);
              setViewMode('search');
            } else {
              setViewMode('selection');
            }
          }}
        />

        {/* TOP FLOATING OVERLAYS */}
        <div className="absolute top-20 sm:top-24 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-2">
          {/* Region Picker Pill */}
          <div className="relative pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsLocationPickerOpen(!isLocationPickerOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-neutral-200/90 dark:border-neutral-700 text-xs font-black text-neutral-900 dark:text-white transition-transform active:scale-95 cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span>{selectedDistrict}</span>
              <span className="text-[10px] text-neutral-400 font-normal">({selectedProvince})</span>
            </button>
          </div>

          {/* Right Tools (Nearby Drivers Pill + SOS) */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900/90 text-white rounded-2xl shadow-lg border border-neutral-700 text-xs font-bold backdrop-blur-md">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${nearbyDrivers.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${nearbyDrivers.length > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="text-[11px] font-extrabold whitespace-nowrap">
                {nearbyDrivers.length > 0 ? `${nearbyDrivers.length} Motos Online` : 'Radar ativo'}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenSOS}
              className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-2xl shadow-lg shadow-red-600/30 text-xs font-black uppercase tracking-wider transition-transform cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 animate-pulse" />
              <span>SOS</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. FLOATING QUICK SEARCH PILL WHEN SHEET IS MINIMIZED (MOBILE ONLY) */}
      <AnimatePresence>
        {isSheetMinimized && !activeTrip && !isSearching && viewMode !== 'selection' && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="lg:hidden fixed bottom-24 left-4 right-4 z-50 pointer-events-auto"
          >
            <button
              type="button"
              onClick={() => {
                setIsSheetMinimized(false);
                setFocusedInput('destination');
                setSearchFocused(true);
              }}
              className="w-full p-3.5 ios-glass dark:bg-neutral-900/95 rounded-[2rem] border border-white/30 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.35)] flex items-center justify-between text-left group cursor-pointer active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Pedir Mototáxi</p>
                  <p className="text-sm font-black text-neutral-900 dark:text-white truncate">Para onde vamos em {selectedDistrict}?</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm shrink-0">
                Buscar
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. NATIVE-FEELING iOS BOTTOM SHEET */}
      <AnimatePresence>
        {!activeTrip && !isSearching && viewMode !== 'selection' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: isSheetMinimized ? '100%' : 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-40 lg:left-6 lg:top-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:w-[420px] lg:h-fit pointer-events-auto"
          >
            <div className="ios-glass shadow-2xl rounded-t-[40px] lg:rounded-[40px] border-t lg:border border-white/40 dark:border-white/10 overflow-hidden flex flex-col max-h-[78vh] lg:max-h-[90vh]">
              {/* iOS Drag Handle */}
              <div 
                className="w-full pt-3 pb-2 cursor-pointer flex flex-col items-center gap-1 group"
                onClick={() => setIsSheetMinimized(!isSheetMinimized)}
              >
                <div className="w-10 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full group-hover:bg-red-500 transition-colors" />
              </div>

              {/* SHEET CONTENT */}
              <div className="flex-1 overflow-y-auto px-5 pb-32 sm:pb-36 lg:pb-8 space-y-5 no-scrollbar">
                {!isSheetMinimized && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center justify-between pt-1">
                      <h2 className="text-2xl font-black tracking-tighter text-neutral-900 dark:text-white uppercase leading-none">
                        {destinationPoint ? 'Quase lá' : 'Para onde vamos?'}
                      </h2>
                      <button 
                        onClick={() => setIsSheetMinimized(true)}
                        className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>

                    {/* SEARCH INTERFACE */}
                    <form onSubmit={handleCustomSearchSubmit} className="space-y-3">
                      {/* ORIGIN BOX */}
                      <div className="relative group">
                        <div className={`ios-glass dark:bg-neutral-800/50 rounded-3xl p-1 transition-all ${originHighlight ? 'ring-2 ring-amber-500' : 'focus-within:ring-2 focus-within:ring-emerald-500/40'}`}>
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${originPoint ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-neutral-400'} shrink-0`} />
                            <input
                              ref={originInputRef}
                              type="text"
                              value={originInput}
                              onFocus={() => setFocusedInput('origin')}
                              onChange={(e) => handleOriginChange(e.target.value)}
                              placeholder="Onde estás agora? (ex: Mercado, Paragem, Rua)"
                              className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-neutral-800 dark:text-white placeholder:text-neutral-400"
                            />
                            {originInput ? (
                              <div className="flex items-center gap-1">
                                {originPoint && (
                                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span className="hidden sm:inline">Guardado</span>
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOriginInput('');
                                    setOriginPoint(null);
                                  }}
                                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                                  title="Limpar ponto de partida"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={handleLocateMe}
                                className="p-1.5 bg-white dark:bg-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-600 rounded-xl text-emerald-600 shadow-sm transition-transform active:scale-90 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                title="Usar GPS atual"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">GPS</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* DESTINATION BOX */}
                      <div className="relative group">
                        <div className="ios-glass dark:bg-neutral-800/50 rounded-3xl p-1 focus-within:ring-2 focus-within:ring-red-500 shadow-lg">
                          <div className="flex items-center gap-3 px-3 py-3">
                            <div className="w-3 h-3 rounded-md bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)] shrink-0" />
                            <input
                              type="text"
                              value={destinationInput}
                              onFocus={() => {
                                setFocusedInput('destination');
                                setSearchFocused(true);
                              }}
                              onChange={(e) => handleDestinationChange(e.target.value)}
                              placeholder="Qual é o destino? (ex: Hospital, Praia, Bairro 3)"
                              className="flex-1 bg-transparent border-none outline-none text-base font-black text-neutral-900 dark:text-white placeholder:text-neutral-400"
                            />
                            {destinationInput ? (
                              <div className="flex items-center gap-1.5">
                                {destinationPoint && (
                                  <span className="text-[10px] font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800/50 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span className="hidden sm:inline">Guardado</span>
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDestinationInput('');
                                    setDestinationPoint(null);
                                    setSearchFocused(true);
                                  }}
                                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                                  title="Limpar destino"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <Search className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </form>

                    {/* DYNAMIC RESULTS OR CONFIRMATION */}
                    {!destinationPoint || searchFocused || focusedInput === 'origin' ? (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                            {focusedInput === 'origin' ? '📍 Escolher Ponto de Partida' : '🏁 Sugestões e Locais Populares'}
                          </span>
                          {focusedInput === 'origin' && originInput && (
                            <button
                              type="button"
                              onClick={() => {
                                setFocusedInput(null);
                                if (!destinationInput) {
                                  setFocusedInput('destination');
                                  setSearchFocused(true);
                                }
                              }}
                              className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase hover:underline cursor-pointer"
                            >
                              Confirmar "{originInput.slice(0, 15)}..."
                            </button>
                          )}
                          {focusedInput === 'destination' && destinationInput && (
                            <button
                              type="button"
                              onClick={() => {
                                const point = resolveLocationPoint(destinationInput, false);
                                setDestinationPoint(point);
                                setSearchFocused(false);
                                setFocusedInput(null);
                                if (!originInput.trim()) {
                                  showToast('Destino guardado! Agora escreva onde você está.');
                                  originInputRef.current?.focus();
                                  setOriginHighlight(true);
                                } else {
                                  showToast('Destino guardado com sucesso!');
                                }
                              }}
                              className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Confirmar Destino</span>
                            </button>
                          )}
                        </div>

                        {/* Top quick manual location card when typing custom destination */}
                        {destinationInput.trim() && (focusedInput === 'destination' || searchFocused) && (
                          <button
                            type="button"
                            onClick={() => {
                              const point = resolveLocationPoint(destinationInput, false);
                              setDestinationPoint(point);
                              setSearchFocused(false);
                              setFocusedInput(null);
                              if (!originInput.trim()) {
                                showToast('Destino guardado! Agora escreva onde você está.');
                                originInputRef.current?.focus();
                                setOriginHighlight(true);
                              } else {
                                showToast('Destino guardado com sucesso!');
                              }
                            }}
                            className="w-full flex items-center gap-3 p-3.5 rounded-[24px] bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/60 transition-all text-left group cursor-pointer shadow-xs"
                          >
                            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center text-lg shadow-md group-hover:scale-105 transition-transform shrink-0">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Usar destino digitado</span>
                                <span className="text-[9px] font-bold bg-white dark:bg-neutral-800 px-1.5 py-0.5 rounded-md text-neutral-500 border border-neutral-200 dark:border-neutral-700">Manual</span>
                              </div>
                              <h4 className="text-sm font-black text-neutral-900 dark:text-white truncate uppercase tracking-tight">
                                "{destinationInput}"
                              </h4>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bold">
                                Guardar como destino em {selectedDistrict}
                              </p>
                            </div>
                            <div className="px-3.5 py-2 bg-red-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-xs group-hover:bg-red-700 transition-colors shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Guardar</span>
                            </div>
                          </button>
                        )}

                        {/* Top quick manual location card when typing custom origin */}
                        {originInput.trim() && focusedInput === 'origin' && (
                          <button
                            type="button"
                            onClick={() => {
                              const point = resolveLocationPoint(originInput, true);
                              setOriginPoint(point);
                              setFocusedInput(null);
                              setOriginHighlight(false);
                              showToast('Ponto de partida guardado!');
                              if (!destinationInput.trim()) {
                                setFocusedInput('destination');
                                setSearchFocused(true);
                              }
                            }}
                            className="w-full flex items-center gap-3 p-3.5 rounded-[24px] bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/60 transition-all text-left group cursor-pointer shadow-xs"
                          >
                            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-md group-hover:scale-105 transition-transform shrink-0">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Usar partida digitada</span>
                                <span className="text-[9px] font-bold bg-white dark:bg-neutral-800 px-1.5 py-0.5 rounded-md text-neutral-500 border border-neutral-200 dark:border-neutral-700">Manual</span>
                              </div>
                              <h4 className="text-sm font-black text-neutral-900 dark:text-white truncate uppercase tracking-tight">
                                "{originInput}"
                              </h4>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bold">
                                Guardar como ponto de partida em {selectedDistrict}
                              </p>
                            </div>
                            <div className="px-3.5 py-2 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-xs group-hover:bg-emerald-700 transition-colors shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Guardar</span>
                            </div>
                          </button>
                        )}

                        {/* Categories */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                          {categoriesList.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`px-4 py-2 rounded-2xl text-[11px] font-black whitespace-nowrap transition-all border cursor-pointer ${
                                selectedCategory === cat.id
                                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-lg'
                                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                              }`}
                            >
                              {cat.icon} {cat.label}
                            </button>
                          ))}
                        </div>

                        {/* Search Results */}
                        <div className="grid grid-cols-1 gap-2">
                          {searchedPlaces.map((place) => (
                            <button
                              key={place.id}
                              onClick={() => handleSelectPlace(place)}
                              className="flex items-center gap-3 p-3 rounded-[24px] hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left group border border-transparent hover:border-neutral-100 dark:hover:border-neutral-700 cursor-pointer"
                            >
                              <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                                {place.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-neutral-900 dark:text-white truncate uppercase tracking-tight">{place.name}</h4>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bold uppercase opacity-80">{place.categoryLabel}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-red-500 transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="space-y-4 pt-2"
                      >
                        <div className="p-6 bg-gradient-to-br from-red-600 to-red-700 rounded-[32px] text-white shadow-2xl relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                           <div className="relative z-10 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                                <Bike className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Destino Definido</p>
                                <h3 className="text-lg font-black tracking-tight truncate">{(destinationPoint.address || '').split('•')[0]}</h3>
                              </div>
                           </div>
                           
                           <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-black">
                                <Clock className="w-4 h-4 text-amber-300" />
                                <span>~{estimatedDurationMin} min de viagem</span>
                              </div>
                              <button onClick={() => setSearchFocused(true)} className="px-3 py-1.5 bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-wider">Alterar</button>
                           </div>
                        </div>

                        {userProfile?.pendingPenaltyFee && userProfile.pendingPenaltyFee > 0 ? (
                          <div className="p-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20 text-xs font-bold space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="uppercase tracking-wide text-[10px]">Multa Pendente Aplicada:</span>
                              <span className="font-black">+{userProfile.pendingPenaltyFee} MT</span>
                            </div>
                            <p className="text-[10px] text-neutral-500 leading-normal">
                              Este valor foi adicionado à estimativa de preço devido a cancelamentos anteriores fora das regras da plataforma.
                            </p>
                          </div>
                        ) : null}

                        {suspension.isSuspended ? (
                          <div className="p-5 bg-neutral-900 text-white rounded-[32px] border border-red-500/30 space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
                                <AlertCircle className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">CONTA LIMITADA</p>
                                <h4 className="text-sm font-black uppercase tracking-tight text-white leading-tight">Pedido Bloqueado Temporariamente</h4>
                                <p className="text-xs text-neutral-400 mt-1">
                                  {userProfile?.suspensionReason || 'Suspenso por infração às diretrizes de segurança e cancelamentos excessivos.'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs font-mono font-bold">
                              <span className="text-neutral-400">Tempo de espera:</span>
                              <span className="text-amber-400 font-black animate-pulse flex items-center gap-1.5 bg-amber-400/10 px-2.5 py-1 rounded-xl">
                                <Clock className="w-3.5 h-3.5" />
                                ~{suspension.timeLeftMin} min restantes
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 text-center">
                              A barreira de segurança e penalizações protege o ecossistema contra abusos e chamadas falsas.
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setViewMode('selection');
                            }}
                            className="w-full py-5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-black text-lg uppercase tracking-widest rounded-[32px] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 group"
                          >
                            <Zap className="w-6 h-6 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform" />
                            <span>Ver Motoristas</span>
                            <ChevronRight className="w-6 h-6" />
                          </button>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. FULL SCREEN DRIVER SELECTION OVERLAY */}
      <AnimatePresence>
        {viewMode === 'selection' && destinationPoint && !activeTrip && !isSearching && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 flex flex-col"
          >
            <DriverListView
              drivers={nearbyDrivers}
              destination={destinationPoint}
              fareBreakdown={fareBreakdown}
              onSelectDriver={(driver) => handleRequestRide(driver)}
              onSelectNextAvailable={() => handleRequestRide()}
              onBack={() => setViewMode('search')}
              onOpenMenu={() => setIsMenuOpen(true)}
              loading={isSearching}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. ACTIVE TRIP & RADAR FULLSCREEN OVERLAYS */}
      {(activeTrip || isSearching) && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 animate-fade-in flex flex-col overflow-y-auto">
          {activeTrip ? (
            <div className="flex-1 flex flex-col">
              <div className="bg-red-600 p-6 pt-10 rounded-b-[40px] shadow-lg flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors"
                  >
                    <Menu className="w-6 h-6" />
                  </button>
                  <h2 className="text-white font-black text-xl uppercase tracking-tighter">Viagem Ativa</h2>
                </div>
                <button onClick={onOpenSOS} className="p-3 bg-white/20 text-white rounded-2xl font-black text-xs">SOS</button>
              </div>
              <div className="flex-1 p-6">
                <ActiveRideView
                  trip={activeTrip}
                  onOpenChat={() => setIsChatOpen(true)}
                  onOpenSOS={onOpenSOS}
                  onCancel={() => cancelCurrentTrip()}
                  onShare={() => {
                    const text = `Acompanha a minha viagem em tempo real no TeleMoto+: ${window.location.origin}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                />
              </div>
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
                {/* Minimal Header for Radar */}
                <div className="absolute top-20 sm:top-24 left-6 z-20">
                  <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-700"
                  >
                    <Menu className="w-6 h-6" />
                  </button>
                </div>

                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                  <div className="absolute inset-4 rounded-full bg-red-500/30 animate-pulse" />
                  <div className="relative w-20 h-20 rounded-3xl bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-600/40">
                    <Bike className="w-10 h-10 animate-bounce" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter">
                    Conectando ao Motorista...
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                    Estamos a enviar o seu pedido em {selectedDistrict}.<br/>Aguarde um momento.
                  </p>
                </div>

                {destinationPoint && (
                  <div className="w-full p-6 bg-neutral-100 dark:bg-neutral-900 rounded-[32px] border border-neutral-200 dark:border-neutral-800 text-left space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Destino</p>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                          {(destinationPoint.address || '').split('•')[0] || 'Destino'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    cancelCurrentTrip('Cancelado pelo utilizador');
                    setViewMode('selection');
                  }}
                  className="w-full py-5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-black text-sm uppercase tracking-widest rounded-3xl transition-all active:scale-95"
                >
                  Cancelar Pedido
                </button>
             </div>
          )}
        </div>
      )}

      {/* Real-Time Chat Modal */}
      {isChatOpen && activeTrip && (
        <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      )}

      {/* Hamburger Menu Sidebar */}
      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpenSOS={onOpenSOS}
        onNavigateHome={() => {
          setIsMenuOpen(false);
          onNavigateTab?.('home');
        }}
        onNavigateTrips={() => {
          setIsMenuOpen(false);
          onNavigateTab?.('trips');
        }}
        onNavigateProfile={() => {
          setIsMenuOpen(false);
          onNavigateTab?.('profile');
        }}
      />

      {/* Post-Trip Evaluation Modal */}
      {activeTrip &&
        (activeTrip.status === 'trip_completed' || activeTrip.status === 'paid') &&
        !activeTrip.passengerRated &&
        dismissedRatingTripId !== activeTrip.id && (
          <PostTripRatingModal
            trip={activeTrip}
            onClose={() => setDismissedRatingTripId(activeTrip.id)}
            currentUserId={user?.uid || ''}
          />
        )}

      {/* Receipt Modal */}
      {receiptTrip && (
        <TripReceiptModal
          trip={receiptTrip}
          onClose={() => setReceiptTrip(null)}
          currentUserId={user?.uid || ''}
        />
      )}

      {/* Region Modal Dialog (Root level overlay) */}
      {isLocationPickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in pointer-events-auto">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600" />
                Mudar de Região 🇲🇿
              </span>
              <button
                type="button"
                onClick={() => setIsLocationPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5">
                  Província
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    const newProv = e.target.value;
                    const distList = MOZAMBIQUE_ADMIN_DIVISIONS[newProv] || [];
                    handleDistrictChange(newProv, distList[0] || 'Distrito Central');
                  }}
                  className="w-full text-sm p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
                >
                  {PROVINCES_LIST.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1.5">
                  Distrito / Cidade
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(selectedProvince, e.target.value)}
                  className="w-full text-sm p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
                >
                  {(MOZAMBIQUE_ADMIN_DIVISIONS[selectedProvince] || []).map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsLocationPickerOpen(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-red-600/30 transition-transform cursor-pointer"
              >
                Confirmar Região 📍
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. GEOLOCATION DIVERGENCE WARNING MODAL */}
      <AnimatePresence>
        {gpsWarning?.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 rounded-[36px] border border-neutral-100 dark:border-neutral-800 p-6 shadow-2xl max-w-sm w-full text-center space-y-5"
            >
              <div className="w-16 h-16 bg-amber-500/15 text-amber-500 rounded-[24px] border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Barreira de Segurança (GPS)</p>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter leading-none">Divergência de Ponto</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-bold">
                  Você está a cerca de <span className="text-neutral-900 dark:text-white font-black">{gpsWarning.distanceMeters} metros</span> de distância do local de recolha escolhido.
                </p>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  Chamar um motorista para um local onde você não se encontra pode resultar em **multas e suspensão** de conta por chamada falsa.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={() => handleCorrectOriginToGps(gpsWarning.lat, gpsWarning.lng)}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  📍 Corrigir para minha Posição Real
                </button>
                <button
                  onClick={() => {
                    setGpsWarning(null);
                    setViewMode('selection');
                  }}
                  className="w-full py-3.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs uppercase tracking-wider rounded-2xl active:scale-95 transition-all cursor-pointer"
                >
                  Continuar Mesmo Assim
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Toast Alerts */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 px-4 py-3 rounded-2xl shadow-2xl border border-red-600/30 flex items-center gap-2.5 animate-fade-in text-xs font-black tracking-wide max-w-[90vw] text-center">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0"></div>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

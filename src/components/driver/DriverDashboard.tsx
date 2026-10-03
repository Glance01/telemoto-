import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { DriverProfile, Trip } from '../../types';
import {
  setDriverOnlineStatus,
  updateDriverLocation,
  updateDriverPresentation,
} from '../../services/driverService';
import { compressImageToBase64 } from '../../utils/imageCompressor';
import {
  acceptTrip,
  updateTripStatus,
  cancelTrip,
  submitDriverBid,
  declineDriverBid,
  driverEndTrip,
} from '../../services/rideService';
import { confirmCashPaymentCollected, processTripCompletedPayment } from '../../services/paymentService';
import { reportFakeCall } from '../../services/antiAbuseService';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AnimatedDriverRadar } from './AnimatedDriverRadar';
import { ProfessionalFleetMap } from '../passenger/ProfessionalFleetMap';
import { ChatModal } from '../passenger/ChatModal';
import { checkDriverProfileComplete } from '../../utils/driverProfileValidator';
import { PROVINCES_LIST, MOZAMBIQUE_ADMIN_DIVISIONS } from '../../lib/mozambiqueLocations';
import {
  playNotificationSound,
  requestWebNotificationPermission,
  showWebPushNotification,
} from '../../services/notificationService';
import { DEFAULT_CENTER } from '../../lib/googleMaps';
import {
  Power,
  Bike,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Upload,
  X,
  Award,
  User,
  UserCheck,
  FileText,
  XCircle,
  AlertCircle,
  Sparkles,
  Lock,
  ChevronDown,
  Camera,
  ChevronUp,
  Map as MapIcon,
  Navigation2,
  ExternalLink,
  DollarSign,
  Compass,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useRide } from '../../context/RideContext';
import { useCall } from '../../context/CallContext';
import { HamburgerMenu } from '../common/HamburgerMenu';

interface DriverDashboardProps {
  onOpenSOS: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onOpenSOS }) => {
  const { user, driverProfile, refreshProfiles } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const { messages } = useRide();
  const { startCall, missedCallsCount, clearMissedCalls } = useCall();
  
  const unreadMessagesCount = messages.filter(
    (m) => m.senderId !== user?.uid && !m.read
  ).length;

  const [isHamburgerOpen, setIsHamburgerOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(driverProfile?.isOnline || false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(
    driverProfile?.currentLat && driverProfile?.currentLng
      ? { lat: driverProfile.currentLat, lng: driverProfile.currentLng }
      : DEFAULT_CENTER
  );
  const [incomingTrips, setIncomingTrips] = useState<Trip[]>([]);
  const [incomingBids, setIncomingBids] = useState<Record<string, string>>({});
  const [counterPrice, setCounterPrice] = useState<string>('');
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [dismissedTripIds, setDismissedTripIds] = useState<string[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [cashCollected, setCashCollected] = useState<boolean>(false);
  const [mapViewMode, setMapViewMode] = useState<'map' | 'radar'>('map');
  const [tripElapsedSeconds, setTripElapsedSeconds] = useState<number>(0);

  // Minimum 2-minute trip countdown timer
  useEffect(() => {
    if (currentTrip?.status === 'trip_started') {
      const startedAt =
        currentTrip.statusTimestamps?.trip_started ||
        (currentTrip as any).startedAt ||
        currentTrip.updatedAt ||
        Date.now();

      const updateElapsed = () => {
        const diffSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        setTripElapsedSeconds(diffSec);
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    } else {
      setTripElapsedSeconds(0);
    }
  }, [currentTrip?.status, currentTrip?.statusTimestamps?.trip_started, currentTrip?.updatedAt]);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [paymentModalState, setPaymentModalState] = useState<'none' | 'processing' | 'success'>('none');
  const [selectedReferencePhoto, setSelectedReferencePhoto] = useState<string | null>(null);
  const [processedFareData, setProcessedFareData] = useState<{
    totalFare: number;
    commission: number;
    netEarnings: number;
    method: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile Bottom Sheet states: 'minimized' (peek, 85% map) | 'half' (48vh) | 'full' (86vh)
  const [mobileSheetState, setMobileSheetState] = useState<'minimized' | 'half' | 'full'>('half');
  const [cockpitMapExpanded, setCockpitMapExpanded] = useState<boolean>(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleReportFakeCallAndCancel = async () => {
    if (!currentTrip || !user) return;
    setProcessingAction(true);
    try {
      const success = await reportFakeCall({
        tripId: currentTrip.id,
        driverId: user.uid,
        driverName: driverProfile?.fullName || 'Motorista',
        passengerId: currentTrip.passengerId,
        passengerName: currentTrip.passengerName,
        passengerPhone: currentTrip.passengerPhone,
        description: `O motorista chegou ao ponto de encontro e reportou ausência do passageiro / chamada falsa após o tempo regulamentar de espera de 5 minutos.`,
      });
      if (success) {
        await cancelTrip(currentTrip.id, 'driver', 'Chamada Falsa / Passageiro Ausente');
        showToast('Chamada falsa reportada com sucesso! Passageiro penalizado.');
      } else {
        showToast('Não foi possível processar o relatório de abuso.');
      }
    } catch (err) {
      console.error('Error reporting fake call:', err);
      showToast('Ocorreu um erro ao reportar a chamada falsa.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Profile validation status
  const profileStatus = checkDriverProfileComplete(driverProfile);
  const [showIncompleteProfileModal, setShowIncompleteProfileModal] = useState<boolean>(!profileStatus.isComplete);

  // Driver Presentation & Profile Edit state
  const [showEditPresentation, setShowEditPresentation] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>(driverProfile?.fullName || '');
  const [editPhone, setEditPhone] = useState<string>(driverProfile?.phone || '');
  const [editIdNumber, setEditIdNumber] = useState<string>(driverProfile?.idNumber || '');
  const [editBikeBrand, setEditBikeBrand] = useState<string>(driverProfile?.bikeBrand || '');
  const [editBikeModel, setEditBikeModel] = useState<string>(driverProfile?.bikeModel || '');
  const [editBikeColor, setEditBikeColor] = useState<string>(driverProfile?.bikeColor || '');
  const [editPlateNumber, setEditPlateNumber] = useState<string>(driverProfile?.plateNumber || '');
  const [editProvince, setEditProvince] = useState<string>(driverProfile?.province || 'Inhambane');
  const [editDistrict, setEditDistrict] = useState<string>(driverProfile?.district || driverProfile?.city || 'Massinga');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>(driverProfile?.photoUrl || '');
  const [editBikePhotoUrl, setEditBikePhotoUrl] = useState<string>(driverProfile?.bikePhotoUrl || '');
  const [editBio, setEditBio] = useState<string>(
    driverProfile?.bio ||
      'Olá! Sou condutor atencioso no TeleMoto+, garanto condução defensiva e conheço bem a zona.'
  );
  const [editYearsExp, setEditYearsExp] = useState<number>(driverProfile?.yearsExperience || 3);
  const [editHelmet, setEditHelmet] = useState<boolean>(driverProfile?.helmetProvided ?? true);
  const [savingPresentation, setSavingPresentation] = useState<boolean>(false);
  const [compressingTarget, setCompressingTarget] = useState<string | null>(null);
  const [presentationMsg, setPresentationMsg] = useState<string | null>(null);

  useEffect(() => {
    if (driverProfile) {
      setEditFullName(driverProfile.fullName || '');
      setEditPhone(driverProfile.phone || '');
      setEditIdNumber(driverProfile.idNumber || '');
      setEditBikeBrand(driverProfile.bikeBrand || '');
      setEditBikeModel(driverProfile.bikeModel || '');
      setEditBikeColor(driverProfile.bikeColor || '');
      setEditPlateNumber(driverProfile.plateNumber || '');
      setEditProvince(driverProfile.province || 'Inhambane');
      setEditDistrict(driverProfile.district || driverProfile.city || 'Massinga');
      setEditPhotoUrl(driverProfile.photoUrl || '');
      setEditBikePhotoUrl(driverProfile.bikePhotoUrl || '');
      setEditBio(
        driverProfile.bio ||
          'Olá! Sou condutor atencioso no TeleMoto+, garanto condução defensiva e conheço bem a zona.'
      );
      setEditYearsExp(driverProfile.yearsExperience || 3);
      setEditHelmet(driverProfile.helmetProvided ?? true);
    }
  }, [driverProfile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'driver' | 'bike') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingTarget(target);
    try {
      const base64 = await compressImageToBase64(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
      if (target === 'driver') {
        setEditPhotoUrl(base64);
      } else {
        setEditBikePhotoUrl(base64);
      }
    } catch (err) {
      console.error('Error compressing image:', err);
      showToast('Erro ao processar imagem. Tente uma foto menor.');
    } finally {
      setCompressingTarget(null);
    }
  };

  const handleSavePresentation = async () => {
    if (!user) return;
    setSavingPresentation(true);
    setPresentationMsg(null);

    const success = await updateDriverPresentation(user.uid, {
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
      idNumber: editIdNumber.trim(),
      bikeBrand: editBikeBrand.trim(),
      bikeModel: editBikeModel.trim(),
      bikeColor: editBikeColor.trim(),
      plateNumber: editPlateNumber.trim().toUpperCase(),
      province: editProvince,
      district: editDistrict,
      city: editDistrict,
      photoUrl: editPhotoUrl,
      bikePhotoUrl: editBikePhotoUrl,
      bio: editBio,
      yearsExperience: editYearsExp,
      helmetProvided: editHelmet,
    });

    if (success) {
      setPresentationMsg('Perfil atualizado e verificado com sucesso!');
      await refreshProfiles();
      setTimeout(() => {
        setShowEditPresentation(false);
        setShowIncompleteProfileModal(false);
        setPresentationMsg(null);
      }, 1500);
    } else {
      setPresentationMsg('Erro ao guardar perfil. Tente novamente.');
    }
    setSavingPresentation(false);
  };

  // Sync online state
  useEffect(() => {
    if (driverProfile) {
      if (!profileStatus.isComplete) {
        setIsOnline(false);
      } else {
        setIsOnline(driverProfile.isOnline);
      }
    }
  }, [driverProfile?.isOnline, profileStatus.isComplete]);

  // GPS geolocation tracking
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentCoords({ lat, lng });
          if (user) {
            updateDriverLocation(user.uid, lat, lng, pos.coords.heading || 0);
          }
        },
        (err) => console.warn('Driver initial GPS notice:', err),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    }

    let watchId: number | null = null;
    if (isOnline && user && profileStatus.isComplete) {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setCurrentCoords({ lat, lng });
            updateDriverLocation(user.uid, lat, lng, pos.coords.heading || 0);
          },
          (err) => console.warn('Driver GPS watch error:', err),
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 }
        );
      }
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline, user, profileStatus.isComplete]);

  // Listen to incoming trip requests
  useEffect(() => {
    if (!isOnline || driverProfile?.status !== 'approved' || currentTrip || !profileStatus.isComplete) {
      setIncomingTrips([]);
      return;
    }

    const MAX_SEARCH_AGE_MS = 5 * 60 * 1000;
    const tripsRef = collection(db, 'trips');
    const q = query(tripsRef, where('status', '==', 'searching_driver'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const available: Trip[] = [];
      snapshot.forEach((d) => {
        const t = d.data() as Trip;
        const age = now - t.createdAt;
        if (t.status === 'searching_driver' && age < MAX_SEARCH_AGE_MS) {
          available.push(t);
        } else if (age >= MAX_SEARCH_AGE_MS) {
          cancelTrip(t.id, 'system', 'no_drivers_available').catch(() => {});
        }
      });
      setIncomingTrips(available);
      if (available.length > 0) {
        playNotificationSound('alert');
        setMobileSheetState('full');
        // Dispatch native web push notifications so backgrounded drivers get alerted
        available.forEach((t) => {
          showWebPushNotification(`🚨 Novo Pedido de Corrida (${t.fareAmount || (t as any).proposedPrice || 0} MT)!`, {
            body: `Passageiro ${t.passengerName || 'Cliente'} procura táxi. Toque para abrir e aceitar!`,
            soundType: 'radar',
            tag: `incoming-trip-${t.id}`,
            data: { tripId: t.id },
          });
        });
      }
    });

    return () => unsubscribe();
  }, [isOnline, driverProfile?.status, currentTrip, profileStatus.isComplete]);

  // Listen to driver's active trip
  useEffect(() => {
    if (!user) return;

    const tripsRef = collection(db, 'trips');
    const q = query(
      tripsRef,
      where('driverId', '==', user.uid),
      where('status', 'in', [
        'searching_driver',
        'driver_assigned',
        'driver_arriving',
        'driver_arrived',
        'trip_started',
        'trip_completed',
        'payment_pending',
      ])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const activeDocs = snapshot.docs
          .map((d) => d.data() as Trip)
          .filter((t) => !dismissedTripIds.includes(t.id) && t.status !== 'paid');

        if (activeDocs.length > 0) {
          const trip = activeDocs[0];
          const MAX_SEARCH_AGE_MS = 5 * 60 * 1000;
          if (trip.status === 'searching_driver' && (Date.now() - trip.createdAt) >= MAX_SEARCH_AGE_MS) {
            cancelTrip(trip.id, 'system', 'no_drivers_available').catch(() => {});
            setCurrentTrip(null);
            setCounterPrice('');
          } else {
            setCurrentTrip(trip);
            setMobileSheetState('full');
          }
        } else {
          setCurrentTrip(null);
          setCounterPrice('');
        }
      } else {
        if (currentTrip && (currentTrip.status === 'searching_driver' || currentTrip.status === 'driver_assigned')) {
          showToast('O pedido de viagem foi cancelado pelo passageiro ou expirou.');
        }
        setCurrentTrip(null);
        setCounterPrice('');
      }
    });

    return () => unsubscribe();
  }, [user, dismissedTripIds, currentTrip?.status]);

  const toggleOnline = async () => {
    if (!user || driverProfile?.status !== 'approved') return;

    const nextStatus = !isOnline;

    if (nextStatus && !profileStatus.isComplete) {
      setShowIncompleteProfileModal(true);
      return;
    }

    setIsOnline(nextStatus);
    await setDriverOnlineStatus(user.uid, nextStatus);

    if (nextStatus) {
      // Prompt for Web Push Notification permission so driver gets alerted outside the app
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          await requestWebNotificationPermission();
        }
        if (Notification.permission === 'granted') {
          showWebPushNotification('⚡ Modo Online Ativado — TeleMoto+', {
            body: 'Agora receberá alertas de corridas mesmo com o ecrã bloqueado ou fora do app.',
            soundType: 'success',
            tag: 'driver-online-confirm',
          });
        }
      }
      if (currentCoords) {
        await updateDriverLocation(user.uid, currentCoords.lat, currentCoords.lng, 0, true);
      }
      showToast('Estás ONLINE e a monitorizar o radar! 🔔 Notificações em segundo plano ativas.');
    } else {
      showToast('Ficaste OFFLINE.');
    }
  };

  const handleAcceptTrip = async (trip: Trip) => {
    if (!driverProfile) return;
    setProcessingAction(true);
    await acceptTrip(trip.id, driverProfile);
    setProcessingAction(false);
  };

  const handleProposal = async (customPrice?: number) => {
    if (!currentTrip || !driverProfile) return;
    const price = customPrice !== undefined ? customPrice : parseInt(counterPrice, 10);
    if (isNaN(price) || price <= 0) {
      showToast('Por favor, introduza um preço válido.');
      setProcessingAction(false);
      return;
    }
    setProcessingAction(true);
    const success = await submitDriverBid(currentTrip.id, driverProfile, price);
    if (success) {
      showToast(`Preço de ${price} MT enviado ao passageiro!`);
      playNotificationSound('success');
      setCounterPrice('');
      setCurrentTrip({
        ...currentTrip,
        biddingPrice: price,
        biddingStatus: 'offered',
      });
    } else {
      showToast('Erro ao enviar proposta.');
    }
    setProcessingAction(false);
  };

  const handleProposalForTrip = async (trip: Trip, customPrice?: number) => {
    if (!driverProfile) return;
    const pStr = customPrice !== undefined ? String(customPrice) : (incomingBids[trip.id] || counterPrice);
    const price = parseInt(pStr, 10);
    if (isNaN(price) || price <= 0) {
      showToast('Por favor, introduza um valor válido.');
      return;
    }
    setProcessingAction(true);
    const success = await submitDriverBid(trip.id, driverProfile, price);
    if (success) {
      showToast(`Preço de ${price} MT definido! Aguardando o passageiro aceitar.`);
      playNotificationSound('success');
      setCurrentTrip({
        ...trip,
        biddingPrice: price,
        biddingStatus: 'offered',
        driverId: driverProfile.id,
        driverName: driverProfile.fullName,
      });
      setIncomingTrips((prev) => prev.filter((t) => t.id !== trip.id));
    } else {
      showToast('Erro ao definir preço.');
    }
    setProcessingAction(false);
  };

  const handleArrived = async () => {
    if (!currentTrip) return;
    setProcessingAction(true);
    await updateTripStatus(currentTrip.id, 'driver_arrived');
    setProcessingAction(false);
    showToast('Notificação de chegada enviada ao passageiro!');
  };

  const handleStartTrip = async () => {
    if (!currentTrip) return;
    setProcessingAction(true);
    await updateTripStatus(currentTrip.id, 'trip_started');
    setProcessingAction(false);
    showToast('Viagem iniciada! Conduza com atenção.');
  };

  const handleCompleteTrip = async () => {
    if (!currentTrip || !user) return;
    setProcessingAction(true);
    const fare = currentTrip.fareAmount || (currentTrip.biddingPrice || 0);
    try {
      // 1. Credit earnings in driver wallet & profile
      await processTripCompletedPayment(
        currentTrip.id,
        user.uid,
        fare,
        'cash',
        currentTrip.fareBreakdown
      );

      // 2. Update Firestore trip status to 'trip_completed'
      await updateTripStatus(currentTrip.id, 'trip_completed', {
        paymentStatus: 'paid',
        status: 'trip_completed',
      });

      // 3. Update local state immediately for instant feedback
      setCurrentTrip((prev) =>
        prev ? { ...prev, status: 'trip_completed', paymentStatus: 'paid' } : null
      );

      showToast(`Corrida finalizada! +${fare} MT somados aos seus rendimentos deste mês.`);
      playNotificationSound('success');
      setCashCollected(true);
    } catch (e) {
      console.error('Error completing trip:', e);
      showToast('Erro ao concluir corrida. Tente novamente.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDismissCompletedTrip = async () => {
    if (!currentTrip || !user) {
      setCurrentTrip(null);
      setCashCollected(false);
      return;
    }

    const tripIdToDismiss = currentTrip.id;
    setDismissedTripIds((prev) => [...prev, tripIdToDismiss]);
    setCurrentTrip(null);
    setCashCollected(false);

    try {
      // 1. Update trip status in Firestore to 'paid' if not already
      const tripRef = doc(db, 'trips', tripIdToDismiss);
      await updateDoc(tripRef, {
        status: 'paid',
        paymentStatus: 'paid',
        updatedAt: Date.now(),
      });

      // 2. Free driver in Firestore and maintain active online status on radar
      const driverRef = doc(db, 'drivers', user.uid);
      await updateDoc(driverRef, {
        currentTripId: null,
        isBusy: false,
        isOnline: true,
        updatedAt: Date.now(),
      });

      setIsOnline(true);
      await refreshProfiles();
      showToast('Voltou ao Radar TeleMoto+! Pronto para novas viagens.');
    } catch (err) {
      console.warn('Error releasing driver after trip completion:', err);
    }
  };

  const handleConfirmCashCollected = async () => {
    if (!currentTrip || !user) return;
    setProcessingAction(true);
    const fare = currentTrip.fareAmount || (currentTrip.biddingPrice || 0);
    await confirmCashPaymentCollected(
      currentTrip.id,
      user.uid,
      currentTrip.fareBreakdown,
      fare
    );
    showToast(`Pagamento em mão de ${fare} MT registado no rendimento do mês!`);
    playNotificationSound('success');
    setCashCollected(true);
    setTimeout(async () => {
      setDismissedTripIds((prev) => [...prev, currentTrip.id]);
      setCurrentTrip(null);
      setCashCollected(false);
      setIsOnline(true);
      if (user) {
        await updateDoc(doc(db, 'drivers', user.uid), {
          currentTripId: null,
          isBusy: false,
          isOnline: true,
          updatedAt: Date.now(),
        });
      }
      await refreshProfiles();
    }, 2000);
    setProcessingAction(false);
  };

  // Touch drag gesture handlers for bottom drawer
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null || !e.changedTouches || !e.changedTouches[0]) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY;

    if (diff > 45) {
      if (mobileSheetState === 'full') setMobileSheetState('half');
      else if (mobileSheetState === 'half') setMobileSheetState('minimized');
    } else if (diff < -45) {
      if (mobileSheetState === 'minimized') setMobileSheetState('half');
      else if (mobileSheetState === 'half') setMobileSheetState('full');
    }
    setTouchStartY(null);
  };

  // Dynamic Map Route endpoints based on driver's status and active trip
  let mapOrigin: { address: string; lat: number; lng: number } | null = null;
  let mapDestination: { address: string; lat: number; lng: number } | null = null;

  if (currentTrip) {
    if (currentTrip.status === 'driver_assigned' || currentTrip.status === 'driver_arrived') {
      // Driver on the way to passenger: Route from Driver's GPS location -> Passenger Pickup Point
      mapOrigin = {
        address: 'Minha Posição (Motorista)',
        lat: currentCoords.lat,
        lng: currentCoords.lng,
      };
      mapDestination = {
        address: currentTrip.origin.address,
        lat: currentTrip.origin.lat,
        lng: currentTrip.origin.lng,
      };
    } else if (currentTrip.status === 'trip_started') {
      // Trip in progress: Route from Driver/Pickup Point -> Final Destination
      mapOrigin = {
        address: currentTrip.origin.address,
        lat: currentTrip.origin.lat,
        lng: currentTrip.origin.lng,
      };
      mapDestination = {
        address: currentTrip.destination.address,
        lat: currentTrip.destination.lat,
        lng: currentTrip.destination.lng,
      };
    } else {
      mapOrigin = {
        address: currentTrip.origin.address,
        lat: currentTrip.origin.lat,
        lng: currentTrip.origin.lng,
      };
      mapDestination = {
        address: currentTrip.destination.address,
        lat: currentTrip.destination.lat,
        lng: currentTrip.destination.lng,
      };
    }
  } else if (incomingTrips.length > 0 && incomingTrips[0]) {
    mapOrigin = {
      address: 'Minha Posição (Motorista)',
      lat: currentCoords.lat,
      lng: currentCoords.lng,
    };
    mapDestination = {
      address: incomingTrips[0]?.origin?.address || 'Destino',
      lat: incomingTrips[0]?.origin?.lat || currentCoords.lat,
      lng: incomingTrips[0]?.origin?.lng || currentCoords.lng,
    };
  }

  if (!driverProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // SCENARIO A: ACTIVE TRIP IMMERSIVE FULLSCREEN COCKPIT
  // When working with a client, the cockpit takes over the entire screen (100% immersive, no map)
  // -------------------------------------------------------------------------
  if (currentTrip) {
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-white flex flex-col font-sans overflow-hidden animate-fade-in transition-colors duration-200">
        {/* IMMERSIVE TOP HEADER BAR */}
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-800 px-4 py-3 sm:px-6 sm:py-3.5 shadow-2xl flex items-center justify-between border-b border-white/10 shrink-0 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner">
              <Bike className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm sm:text-base uppercase tracking-tight text-white flex items-center gap-1.5">
                  TeleMoto+ MZ
                </h2>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <p className="text-[10px] text-red-100 font-bold uppercase tracking-wider">
                {currentTrip.status === 'searching_driver' && 'Proposta de Preço'}
                {currentTrip.status === 'driver_assigned' && 'A Caminho do Cliente 🚨'}
                {currentTrip.status === 'driver_arrived' && 'No Ponto de Encontro 📍'}
                {currentTrip.status === 'trip_started' && 'Viagem em Curso 🏍️'}
                {(currentTrip.status === 'trip_completed' || currentTrip.status === 'payment_pending' || currentTrip.status === 'paid') && 'Viagem Concluída 🏁'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Fare badge */}
            <div className="hidden sm:flex flex-col items-end px-3 py-1 bg-black/30 backdrop-blur-md rounded-2xl border border-white/15">
              <span className="text-[10px] text-red-200 font-bold uppercase">Preço Combinado</span>
              <span className="text-sm font-black font-mono text-white">{currentTrip.fareAmount || currentTrip.biddingPrice} MT</span>
            </div>

            {/* THEME TOGGLE BUTTON (LIGHT / DARK) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-black text-xs backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer shadow-sm"
              title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-white" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>
            </button>

            {/* In-App Internet Call button with passenger */}
            <button
              type="button"
              onClick={() => {
                if (!currentTrip?.passengerId) return;
                clearMissedCalls();
                startCall({
                  tripId: currentTrip.id,
                  receiverId: currentTrip.passengerId,
                  receiverName: currentTrip.passengerName || 'Passageiro',
                  receiverRole: 'passenger',
                  receiverPhoto: currentTrip.passengerPhoto || undefined,
                });
              }}
              className="relative p-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 rounded-2xl font-black text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center border border-emerald-400"
              title="Ligar via Internet (Grátis)"
            >
              <Phone className="w-4 h-4 fill-neutral-950" />
              {missedCallsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-red-600 text-white font-black text-[10px] rounded-full animate-bounce shadow-md border-2 border-white">
                  {missedCallsCount}
                </span>
              )}
            </button>

            {/* Direct Chat button with passenger */}
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="relative p-2.5 bg-white text-red-600 hover:bg-red-50 rounded-2xl font-black text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center"
              title="Abrir Chat com o Passageiro"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadMessagesCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-red-600 text-white font-black text-[10px] rounded-full animate-bounce shadow-md border-2 border-white">
                  {unreadMessagesCount}
                </span>
              ) : (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              )}
            </button>

            {/* HAMBURGER MENU BUTTON */}
            <button
              type="button"
              onClick={() => setIsHamburgerOpen(true)}
              className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-2xl font-black text-xs border border-white/20 shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center backdrop-blur-md"
              title="Menu Principal"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* COCKPIT BODY: 100% IMMERSIVE CONTROLS DECK WITHOUT MAP */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-2xl mx-auto w-full scrollbar-thin">
          {/* Stepper Progress Indicator */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 shadow-md flex items-center justify-between text-[10px] sm:text-[11px] font-extrabold text-neutral-500 dark:text-neutral-400">
            <span className={currentTrip.status === 'driver_assigned' ? 'text-red-600 dark:text-red-500 font-black' : ''}>
              1. A Caminho
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">➔</span>
            <span className={currentTrip.status === 'driver_arrived' ? 'text-amber-600 dark:text-amber-400 font-black' : ''}>
              2. No Local
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">➔</span>
            <span className={currentTrip.status === 'trip_started' ? 'text-blue-600 dark:text-blue-400 font-black' : ''}>
              3. Em Viagem
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">➔</span>
            <span className={currentTrip.status === 'trip_completed' || currentTrip.status === 'paid' ? 'text-emerald-600 dark:text-emerald-400 font-black' : ''}>
              4. Concluído
            </span>
          </div>

          {/* Passenger & Price Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border-2 border-red-500/80 flex items-center justify-center font-black text-lg text-neutral-800 dark:text-white overflow-hidden shrink-0 shadow-md">
                  {currentTrip.passengerPhoto ? (
                    <img src={currentTrip.passengerPhoto} alt={currentTrip.passengerName} className="w-full h-full object-cover" />
                  ) : (
                    currentTrip.passengerName?.[0] || 'P'
                  )}
                </div>
                <div>
                  <h3 className="font-black text-base text-neutral-900 dark:text-white uppercase tracking-tight">
                    {currentTrip.passengerName || 'Passageiro'}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    {currentTrip.passengerPhone || 'Telefone do Passageiro'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                  {currentTrip.fareAmount || currentTrip.biddingPrice} MT
                </span>
                <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold uppercase bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800/60">
                  Dinheiro em Mão
                </span>
              </div>
            </div>

            {/* Quick In-App Call and Chat Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  if (!currentTrip?.passengerId) return;
                  clearMissedCalls();
                  startCall({
                    tripId: currentTrip.id,
                    receiverId: currentTrip.passengerId,
                    receiverName: currentTrip.passengerName || 'Passageiro',
                    receiverRole: 'passenger',
                    receiverPhoto: currentTrip.passengerPhoto || undefined,
                  });
                }}
                className="relative py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md"
              >
                <Phone className="w-3.5 h-3.5 fill-white" />
                <span>Ligar Net (Grátis)</span>
                {missedCallsCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-400 text-neutral-950 font-black text-[10px] rounded-full animate-bounce shadow-sm">
                    {missedCallsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="relative py-3 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat TeleMoto+</span>
                {unreadMessagesCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-400 text-neutral-950 font-black text-[10px] rounded-full animate-bounce shadow-sm">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            </div>

            {/* Passenger's Local Reference Photo */}
            {currentTrip.pickupReferencePhotoUrl ? (
              <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400">
                  <Camera className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="uppercase tracking-wider text-[9px] font-black">Ponto de Referência Enviado pelo Cliente</span>
                </div>
                <div 
                  className="relative w-full h-36 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-black cursor-zoom-in group"
                  onClick={() => setSelectedReferencePhoto(currentTrip.pickupReferencePhotoUrl || null)}
                >
                  <img 
                    src={currentTrip.pickupReferencePhotoUrl} 
                    alt="Ponto de Referência do Passageiro" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                  />
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/75 text-white rounded-lg text-[9px] font-black uppercase tracking-wider">
                    Toque para Ampliar 🔍
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950/80 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                ⏳ Aguardando foto de referência do local do passageiro...
              </div>
            )}

            {/* Route points */}
            <div className="bg-neutral-50 dark:bg-neutral-950/80 rounded-2xl p-3.5 space-y-2.5 text-xs border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-start gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase">Ponto de Recolha (Partida)</p>
                  <p className="font-bold text-neutral-900 dark:text-white text-xs truncate">{currentTrip.origin.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <span className="w-2.5 h-2.5 rounded-md bg-red-500 mt-1 shrink-0"></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase">Destino Final</p>
                  <p className="font-bold text-neutral-900 dark:text-white text-xs truncate">{currentTrip.destination.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION STAGES */}
          {currentTrip.status === 'searching_driver' && (
            <div className="p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-3xl border-2 border-red-500 shadow-xl space-y-4">
              {currentTrip.biddingStatus === 'offered' && currentTrip.biddingPrice ? (
                <div className="py-2 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-300 dark:border-red-800">
                    <DollarSign className="w-6 h-6 stroke-[3]" />
                  </div>
                  <p className="text-sm font-black text-neutral-900 dark:text-white">
                    Preço Definido: <span className="text-red-600 dark:text-red-400">{currentTrip.biddingPrice} MT</span>
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Aguardando o passageiro aceitar ou responder à sua proposta.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Defina o seu Preço para este Percurso:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-600 font-black text-base">MT</span>
                      <input
                        type="number"
                        value={counterPrice}
                        onChange={(e) => setCounterPrice(e.target.value)}
                        placeholder={String(driverProfile?.baseFare || currentTrip.fareAmount || 50)}
                        className="w-full pl-11 pr-3 py-3 bg-neutral-100 dark:bg-neutral-800 border-2 border-red-500 rounded-2xl font-black text-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleProposal()}
                      disabled={processingAction || !counterPrice}
                      className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-transform active:scale-95 shadow-lg shadow-red-600/30 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>DEFINIR</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">Atalhos:</span>
                    {[50, 60, 75, 100, 150].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setCounterPrice(String(preset));
                          handleProposal(preset);
                        }}
                        className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950 text-neutral-800 dark:text-neutral-200 hover:text-red-600 dark:hover:text-red-400 text-xs font-black rounded-xl border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                      >
                        {preset} MT
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={async () => {
                  if (!currentTrip) return;
                  setProcessingAction(true);
                  await cancelTrip(currentTrip.id, 'driver', 'motorista_indisponivel');
                  setCurrentTrip(null);
                  setProcessingAction(false);
                  showToast('Solicitação recusada.');
                }}
                disabled={processingAction}
                className="w-full py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-300 font-bold text-xs uppercase tracking-wider rounded-2xl cursor-pointer"
              >
                Recusar Pedido
              </button>
            </div>
          )}

          {currentTrip.status === 'driver_assigned' && (
            <div className="space-y-3">
              <div className="p-4 sm:p-5 bg-gradient-to-br from-red-600 via-red-600 to-rose-700 text-white rounded-3xl shadow-xl shadow-red-600/30 border-2 border-red-500 space-y-3.5 animate-scale-up">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 text-white rounded-full text-[11px] font-black uppercase tracking-wider backdrop-blur-xs">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span>Preço Concordado! 🚨</span>
                  </div>
                  <span className="font-mono font-black text-sm bg-black/30 px-3 py-1 rounded-xl">
                    {currentTrip.fareAmount} MT
                  </span>
                </div>

                <div>
                  <h3 className="font-black text-base sm:text-lg uppercase tracking-tight leading-snug">
                    VAI BUSCAR {currentTrip.passengerName}!
                  </h3>
                  <p className="text-xs text-red-100 font-medium leading-relaxed mt-1">
                    O passageiro <strong>concordou com o seu preço ({currentTrip.fareAmount} MT)</strong>. Deve ir recolher no ponto de partida para levar até ao destino.
                  </p>
                </div>

                {!currentTrip.pickupReferencePhotoUrl ? (
                  <div className="p-3 bg-amber-500/20 text-amber-200 rounded-2xl border border-amber-500/30 flex items-start gap-2.5 text-xs">
                    <Camera className="w-4 h-4 text-amber-300 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-0.5">
                      <p className="font-black text-amber-300 text-[11px] uppercase tracking-wider">
                        Aguardando Foto de Referência:
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        Para evitar chamadas falsas e abusos, o passageiro está obrigado a <strong>tirar uma foto de algo famoso no local</strong>. Aguarde o envio para ver a foto e poder ir recolhê-lo!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/20 text-emerald-200 rounded-2xl border border-emerald-500/30 flex items-start gap-2.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-black text-emerald-300 text-[11px] uppercase tracking-wider">
                        Foto de Referência Recebida!
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        O passageiro enviou a foto do local. Veja a foto de referência abaixo para o localizar com facilidade e inicie a deslocação.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="w-full py-3 bg-white text-red-600 hover:bg-red-50 font-black text-xs uppercase tracking-wider rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Mandar Mensagem no Chat ao Cliente 💬</span>
                </button>
              </div>

              {currentTrip.pickupReferencePhotoUrl ? (
                <button
                  type="button"
                  onClick={handleArrived}
                  disabled={processingAction}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>CHEGUEI AO PONTO DE ENCONTRO 📍</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl border border-neutral-200 dark:border-neutral-700 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Clock className="w-5 h-5 animate-spin" />
                    <span>Aguardando Foto de Referência do Cliente... 📸</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!currentTrip) return;
                      setProcessingAction(true);
                      try {
                        const tripRef = doc(db, 'trips', currentTrip.id);
                        await updateDoc(tripRef, {
                          pickupReferencePhotoUrl: 'skipped_by_driver',
                          updatedAt: Date.now(),
                        });
                        showToast('Foto de referência ignorada. A avançar para o encontro!');
                      } catch (e) {
                        showToast('Erro ao avançar.');
                      } finally {
                        setProcessingAction(false);
                      }
                    }}
                    disabled={processingAction}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>⚡ FORÇAR AVANÇO / CONTINUAR SEM FOTO</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {currentTrip.status === 'driver_arrived' && (
            <div className="space-y-3 animate-fade-in">
              {!currentTrip.passengerConfirmedArrival ? (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-500/15 via-white to-amber-500/10 dark:from-amber-500/15 dark:via-neutral-900 dark:to-amber-500/10 rounded-3xl border-2 border-amber-500 shadow-xl space-y-3.5 text-left">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500 text-neutral-950 rounded-full text-[11px] font-black uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Aguardando Confirmação ⏳</span>
                    </div>
                    <span className="text-xs font-mono font-black text-amber-800 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2.5 py-1 rounded-xl">
                      Ponto de Encontro
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-base sm:text-lg text-neutral-900 dark:text-white uppercase tracking-tight">
                      Chegou ao Ponto de Encontro!
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed mt-1">
                      Avisámos <strong className="text-neutral-900 dark:text-white">{currentTrip.passengerName}</strong> que já está no local. <strong>O passageiro deve confirmar a sua presença no telemóvel dele</strong> para que a <strong>fase de embarque</strong> seja liberada.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-black text-amber-800 dark:text-amber-300 text-[11px] uppercase tracking-wider">
                        Não está a ver o cliente?
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        Use o <strong>Chat do TeleMoto+</strong> para lhe enviar mensagens e combinar o ponto exato onde estacionou.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Deseja mesmo cancelar esta viagem e reportar Chamada Falsa? O passageiro será penalizado com multa e suspenso temporariamente por abuso.")) {
                        handleReportFakeCallAndCancel();
                      }
                    }}
                    disabled={processingAction}
                    className="w-full py-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-200 dark:border-red-900/50"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>⚠️ PASSAGEIRO NÃO APARECEU / CHAMADA FALSA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsChatOpen(true)}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Mandar Mensagem no Chat ao Passageiro 💬</span>
                  </button>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleStartTrip}
                      disabled={processingAction}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Bike className="w-5 h-5" />
                      <span>INICIAR VIAGEM / PASSAGEIRO A BORDO 🏍️</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-500/20 via-white to-emerald-500/10 dark:from-emerald-500/20 dark:via-neutral-900 dark:to-emerald-500/10 rounded-3xl border-2 border-emerald-500 shadow-2xl space-y-4 text-left animate-scale-up">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600 text-white rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Embarque Liberado! 🚀</span>
                    </div>
                    <span className="font-mono font-black text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-xl">
                      {currentTrip.fareAmount} MT (Dinheiro em Mão)
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-base sm:text-lg text-emerald-900 dark:text-emerald-100 uppercase tracking-tight">
                      Passageiro Confirmou o Encontro!
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed mt-1">
                      <strong className="text-neutral-900 dark:text-white">{currentTrip.passengerName}</strong> confirmou a sua presença no local. Clique no botão abaixo para arrancar.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartTrip}
                    disabled={processingAction}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 animate-pulse"
                  >
                    <Bike className="w-5 h-5" />
                    <span>INICIAR VIAGEM / PASSAGEIRO EMBARCADO 🏍️</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {currentTrip.status === 'trip_started' && (() => {
            const minTripDurationSec = 120; // 2 minutes rule
            const remainingSec = Math.max(0, minTripDurationSec - tripElapsedSeconds);
            const canComplete = remainingSec === 0;
            const minsLeft = Math.floor(remainingSec / 60);
            const secsLeft = remainingSec % 60;
            const timeFormatted = `${minsLeft}:${String(secsLeft).padStart(2, '0')}`;
            const progressPercent = Math.min(100, Math.floor((tripElapsedSeconds / minTripDurationSec) * 100));

            return (
              <div className="space-y-3 animate-fade-in">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/60 rounded-3xl border-2 border-blue-500 text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-wider">
                    <Bike className="w-4 h-4 animate-bounce" /> VIAGEM EM ANDAMENTO
                  </div>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                    A caminho de: <strong className="text-neutral-900 dark:text-white">{currentTrip.destination.address}</strong>
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">Conduza com prudência e garanta a segurança do passageiro.</p>
                </div>

                {/* 2-MINUTE MINIMUM TIME BANNER */}
                {!canComplete && (
                  <div className="p-3.5 bg-neutral-900 text-white rounded-2xl border border-white/10 text-xs text-center space-y-2 shadow-lg">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-neutral-300">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <Clock className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Tempo Mínimo de Corrida</span>
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30">
                        Disponível em {timeFormatted}
                      </span>
                    </div>

                    <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden border border-white/5">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-1000"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <p className="text-[10px] text-neutral-400 font-medium">
                      O botão de finalizar fica ativo após 2 minutos de viagem para validar o trajeto percorrido.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCompleteTrip}
                  disabled={processingAction || !canComplete}
                  className={`w-full py-4 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    canComplete
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 cursor-pointer animate-pulse'
                      : 'bg-neutral-600 dark:bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed opacity-80'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {processingAction
                      ? 'A FINALIZAR CORRIDA...'
                      : canComplete
                      ? `FINALIZAR CORRIDA & CONFIRMAR VALOR EM MÃO (${currentTrip.fareAmount} MT) 🏁`
                      : `FINALIZAR CORRIDA (DISPONÍVEL EM ${timeFormatted}) ⏳`}
                  </span>
                </button>
              </div>
            );
          })()}

          {(currentTrip.status === 'trip_completed' || currentTrip.status === 'payment_pending' || currentTrip.status === 'paid') && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 rounded-3xl text-center space-y-2 shadow-lg">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-emerald-900 dark:text-emerald-200 uppercase">
                  Corrida Concluída com Sucesso!
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  Valor de <strong>{currentTrip.fareAmount} MT</strong> recebido em mão e somado aos seus rendimentos deste mês.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDismissCompletedTrip}
                className="w-full py-4 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl cursor-pointer shadow-xl transition-transform active:scale-95"
              >
                Concluir e Voltar ao Radar 🚀
              </button>
            </div>
          )}
        </div>

        {/* Real-time Chat Modal */}
        {isChatOpen && currentTrip && (
          <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        )}

        {/* Hamburger Menu Drawer */}
        <HamburgerMenu
          isOpen={isHamburgerOpen}
          onClose={() => setIsHamburgerOpen(false)}
          onOpenSOS={onOpenSOS}
          onOpenEditProfile={() => setShowEditPresentation(true)}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-neutral-100 dark:bg-neutral-950 overflow-hidden flex flex-col lg:flex-row font-sans">
      
      {/* 1. IMMERSIVE PILOT MAP & RADAR HUD */}
      <div className="absolute inset-0 lg:relative lg:flex-1 h-full w-full z-0">
        {mapViewMode === 'map' ? (
          <ProfessionalFleetMap
            origin={(currentTrip as any)?.origin || null}
            destination={(currentTrip as any)?.destination || null}
            nearbyDrivers={[]}
            isSearching={false}
            activeTrip={currentTrip}
            selectedDistrict={driverProfile.district || 'Massinga'}
            selectedProvince={driverProfile.province || 'Inhambane'}
            hideDrivers={false}
          />
        ) : (
          <AnimatedDriverRadar
            isOnline={isOnline}
            currentTrip={currentTrip}
            incomingTrips={incomingTrips}
            driverProfile={driverProfile}
          />
        )}

        {/* TOP FLOATING COCKPIT BAR: Clean, Overflow-Proof Pilot Bar */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
          {/* ONLINE / OFFLINE TOGGLE & MAP/RADAR SWITCH */}
          <div className="pointer-events-auto shrink-0 flex items-center gap-2">
            <button
              onClick={toggleOnline}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-xl border cursor-pointer ${
                isOnline && profileStatus.isComplete
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-400 shadow-red-600/40 ring-2 ring-red-500/30'
                  : 'bg-neutral-900/90 text-neutral-300 border-neutral-700 backdrop-blur-md hover:bg-neutral-800'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline && profileStatus.isComplete ? 'bg-white animate-ping' : 'bg-neutral-500'}`}></span>
              <span>{isOnline && profileStatus.isComplete ? 'PILOTO ONLINE' : 'OFFLINE'}</span>
            </button>

            <button
              onClick={() => setMapViewMode(prev => prev === 'map' ? 'radar' : 'map')}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 bg-neutral-900/95 dark:bg-neutral-900/95 backdrop-blur-md text-white rounded-2xl shadow-xl border border-neutral-700/80 text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-neutral-800 transition-all active:scale-95 shrink-0"
              title="Alternar entre Visão de Mapa e Radar"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>{mapViewMode === 'map' ? 'Radar' : 'Mapa'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto min-w-0">
            {/* COMPACT DRIVER STATS BADGE */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900/95 dark:bg-neutral-900/95 backdrop-blur-md text-white rounded-2xl shadow-xl border border-neutral-700/80 text-xs font-bold truncate">
              <span className="flex items-center gap-1 text-amber-400 font-black shrink-0">
                <Star className="w-3.5 h-3.5 fill-current" />
                {(driverProfile.totalRatingsCount || driverProfile.totalRatings || 0) > 0 && driverProfile.rating !== undefined
                  ? driverProfile.rating.toFixed(1)
                  : 'Novo'}
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-200 text-[11px] font-mono font-bold shrink-0">
                {driverProfile.totalRides || 0} corridas
              </span>
              <span className="hidden sm:inline text-neutral-600">·</span>
              <span className="hidden sm:inline text-emerald-400 text-[11px] font-mono font-black truncate">
                {driverProfile.monthlyEarnings || 0} MT/mês
              </span>
            </div>

            {/* THEME TOGGLE BUTTON */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center p-2 bg-neutral-900/90 hover:bg-neutral-800 text-white rounded-2xl shadow-xl border border-neutral-700 backdrop-blur-md text-xs font-black transition-transform active:scale-95 cursor-pointer shrink-0"
              title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
        </div>

      </div>

      {/* 2. FLOATING DRIVER CONTROL DECK / BOTTOM SHEET */}
      <div
        className={`z-40 transition-all duration-300 ease-out flex flex-col ${
          mobileSheetState === 'minimized'
            ? 'h-14 max-h-14 bg-neutral-900 text-white shadow-2xl border-2 border-emerald-500/80 rounded-2xl mx-2 bottom-[62px] sm:bottom-[68px]'
            : mobileSheetState === 'half'
            ? 'h-[48vh] sm:h-[50vh] bottom-[56px] sm:bottom-[60px] rounded-t-[32px]'
            : 'top-16 sm:top-20 bottom-[56px] sm:bottom-[60px] max-h-[calc(100vh-7.5rem)] h-[calc(100vh-7.5rem)] rounded-t-[28px]'
        } lg:h-[calc(100vh-6rem)] lg:w-[460px] lg:my-auto lg:ml-6 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl lg:rounded-3xl shadow-2xl border-t lg:border border-neutral-200/80 dark:border-neutral-800 overflow-hidden pointer-events-auto absolute left-0 right-0 lg:static`}
      >
        
        {/* Mobile Tactile Drag Bar & Quick Toggle - STICKY TOP */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`lg:hidden w-full pt-2.5 pb-2 px-4 flex items-center justify-between select-none sticky top-0 z-50 ${
            mobileSheetState === 'minimized'
              ? 'bg-neutral-900 text-white'
              : 'border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-xs cursor-grab active:cursor-grabbing'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {currentTrip ? 'Viagem Ativa' : isOnline ? 'Radar de Passageiros' : 'Motorista Offline'}
          </span>

          <div 
            onClick={() => {
              if (mobileSheetState === 'minimized') setMobileSheetState('half');
              else if (mobileSheetState === 'half') setMobileSheetState('full');
              else setMobileSheetState('half');
            }}
            className="w-14 h-2 bg-neutral-300 dark:bg-neutral-600 rounded-full hover:bg-neutral-400 transition-colors cursor-pointer"
          />

          <button
            type="button"
            onClick={() => {
              if (mobileSheetState === 'full') setMobileSheetState('half');
              else if (mobileSheetState === 'half') setMobileSheetState('minimized');
              else setMobileSheetState('half');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-xl shadow-xs transition-all cursor-pointer ${
              mobileSheetState === 'minimized'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/80'
            }`}
          >
            {mobileSheetState === 'minimized' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{mobileSheetState === 'minimized' ? 'Expandir' : 'Abaixar ⬇️'}</span>
          </button>
        </div>

        {/* MINIMIZED PEEK STATE */}
        {mobileSheetState === 'minimized' ? (
          <div className="p-3 space-y-2 lg:hidden">
            <div 
              onClick={() => setMobileSheetState('half')}
              className="flex items-center justify-between gap-3 bg-neutral-100 dark:bg-neutral-800/80 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isOnline ? 'bg-emerald-500 text-white' : 'bg-neutral-600 text-white'}`}>
                  <Bike className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-black text-neutral-900 dark:text-white truncate">
                    {isOnline ? 'Online e a monitorizar radar' : 'Offline'}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate">
                    Toque para abrir controlos de condução
                  </p>
                </div>
              </div>
              <div className={`px-2.5 py-1 text-[10px] font-black rounded-xl uppercase tracking-wider shrink-0 ${isOnline ? 'bg-emerald-500 text-white' : 'bg-neutral-700 text-white'}`}>
                {isOnline ? 'Ativo' : 'Offline'}
              </div>
            </div>
          </div>
        ) : (
          /* SCROLLABLE MAIN PILOT DECK BODY */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
            
            {/* PROMINENT ONLINE / OFFLINE TOGGLE CARD - ELITE DESIGN */}
            <div className={`p-4 sm:p-5 rounded-[28px] border transition-all shadow-2xl relative overflow-hidden backdrop-blur-xl ${
              isOnline && profileStatus.isComplete
                ? 'bg-gradient-to-r from-emerald-950/95 via-neutral-900 to-neutral-900 border-emerald-500/60 text-white shadow-emerald-950/40'
                : 'bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-900 border-red-500/30 text-white shadow-red-950/20'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform ${
                    isOnline && profileStatus.isComplete
                      ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30 animate-pulse'
                      : 'bg-red-600 text-white ring-4 ring-red-600/20'
                  }`}>
                    <Power className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isOnline && profileStatus.isComplete ? 'bg-emerald-400 animate-ping' : 'bg-red-500'
                      }`} />
                      <h3 className="text-xs font-black uppercase tracking-wider text-white truncate">
                        {isOnline && profileStatus.isComplete ? 'Modo Online Ativo' : 'Piloto Offline'}
                      </h3>
                    </div>
                    <p className="text-[11px] text-neutral-300 mt-0.5 leading-tight truncate font-medium">
                      {isOnline && profileStatus.isComplete
                        ? 'Radar ativo • Pronto para receber chamadas de passageiros.'
                        : 'Ative o modo online para começar a faturar hoje.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleOnline}
                  className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95 cursor-pointer shrink-0 border ${
                    isOnline && profileStatus.isComplete
                      ? 'bg-neutral-950 hover:bg-neutral-900 text-white border-neutral-700 hover:border-red-500/50 shadow-black'
                      : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white border-red-500 shadow-red-600/50 font-black'
                  }`}
                >
                  {isOnline && profileStatus.isComplete ? 'Ficar Offline' : 'Ficar Online ⚡'}
                </button>
              </div>
            </div>

            {/* INCOMPLETE PROFILE ALERT BANNER */}
            {!profileStatus.isComplete && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border-2 border-red-500 rounded-2xl flex flex-col gap-2 text-xs text-red-900 dark:text-red-200 animate-fade-in shadow-md">
                <div className="flex items-center gap-2 font-black text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
                  <span className="text-xs">Perfil Incompleto — Corridas Bloqueadas</span>
                </div>
                <p className="text-[11px] text-red-800 dark:text-red-300 leading-snug">
                  Preencha o seu perfil e fotos da moto para ser ativado no TeleMoto+.
                </p>
                <button
                  type="button"
                  onClick={() => setShowEditPresentation(true)}
                  className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 uppercase cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Preencher Perfil Agora</span>
                </button>
              </div>
            )}

            {/* ULTRA-MODERN ELITE RED DRIVER PROFILE HERO CARD */}
            <div className="relative overflow-hidden p-5 sm:p-6 bg-gradient-to-br from-red-600 via-red-600 to-rose-700 text-white rounded-[32px] shadow-2xl shadow-red-600/30 border border-red-500/50">
              {/* Abstract glowing glass effects */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/25 rounded-full -ml-10 -mb-10 blur-2xl pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-16 h-16 rounded-2xl bg-white text-red-600 flex items-center justify-center font-black text-2xl overflow-hidden border-2 border-white/90 shrink-0 shadow-2xl">
                    {driverProfile.photoUrl ? (
                      <img
                        src={driverProfile.photoUrl}
                        alt={driverProfile.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      driverProfile?.fullName?.[0]?.toUpperCase() || 'M'
                    )}
                    {isOnline && (
                      <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full ring-2 ring-emerald-500/60 shadow-md"></span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-lg tracking-tight truncate max-w-[170px] sm:max-w-[220px] drop-shadow-sm">
                        {driverProfile.fullName}
                      </h3>
                      <span className="bg-black/30 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 border border-white/20 shadow-inner">
                        <ShieldCheck className="w-3 h-3 text-emerald-300" />
                        <span>Oficial</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-red-100 font-bold mt-1.5 flex-wrap">
                      <span className="bg-white/15 px-2.5 py-0.5 rounded-lg backdrop-blur-xs border border-white/10">
                        {driverProfile.bikeBrand || 'TeleMoto'} {driverProfile.bikeModel}
                      </span>
                      <span className="bg-black/30 text-white px-2.5 py-0.5 rounded-lg font-mono text-xs border border-white/20 tracking-wider">
                        {driverProfile.plateNumber || 'Sem Matrícula'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditPresentation(true)}
                  className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl text-xs font-black backdrop-blur-xl border border-white/35 transition-all active:scale-90 cursor-pointer shadow-lg shrink-0 uppercase tracking-wider"
                  title="Editar dados da moto e apresentação"
                >
                  Editar
                </button>
              </div>

              {/* High-end telemetry metrics inside the card */}
              <div className="relative z-10 grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-white/20 text-center">
                <div className="bg-black/25 rounded-2xl py-2.5 px-1.5 backdrop-blur-md border border-white/15 shadow-inner">
                  <div className="flex items-center justify-center gap-1 text-amber-300 text-sm font-black">
                    <Star className="w-4 h-4 fill-current drop-shadow" />
                    <span>{driverProfile.rating?.toFixed(1) || '5.0'}</span>
                  </div>
                  <p className="text-[10px] text-red-100 uppercase font-black tracking-wider mt-0.5">Avaliação</p>
                </div>

                <div className="bg-black/25 rounded-2xl py-2.5 px-1.5 backdrop-blur-md border border-white/15 shadow-inner">
                  <span className="text-white text-sm font-black font-mono">
                    {driverProfile.totalRides || 0}
                  </span>
                  <p className="text-[10px] text-red-100 uppercase font-black tracking-wider mt-0.5">Corridas</p>
                </div>

                <div className="bg-black/25 rounded-2xl py-2.5 px-1.5 backdrop-blur-md border border-white/15 shadow-inner">
                  <span className="text-emerald-300 text-sm font-black font-mono">
                    {driverProfile.monthlyEarnings || 0} MT
                  </span>
                  <p className="text-[10px] text-red-100 uppercase font-black tracking-wider mt-0.5">Este Mês</p>
                </div>
              </div>
            </div>

            {/* Toast Notifications */}
            {toastMessage && (
              <div className="p-3 bg-red-600 text-white rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{toastMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="p-1 hover:bg-white/20 rounded-lg text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* RADAR & INCOMING RIDES LIST (WHEN NO ACTIVE TRIP) */}
            <div className="space-y-3">
                {!profileStatus.isComplete ? (
                  <div className="p-6 bg-amber-50 dark:bg-amber-950/40 rounded-3xl border border-amber-200 dark:border-amber-800 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-neutral-900 dark:text-white text-sm">
                      Corridas Desativadas
                    </h4>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
                      Para receber clientes e solicitações de corridas, você deve preencher as informações do seu perfil.
                    </p>
                    <button
                      onClick={() => setShowEditPresentation(true)}
                      className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      <span>Preencher Perfil Agora</span>
                    </button>
                  </div>
                ) : !isOnline ? (
                  /* MODERN OFFLINE STATE - RED THEMED */
                  <div className="p-6 bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-900/90 rounded-3xl border-2 border-red-500/20 text-center space-y-4 shadow-lg">
                    <div className="relative w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto shadow-inner ring-8 ring-red-500/10">
                      <Power className="w-8 h-8 stroke-[2.5]" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-black text-neutral-900 dark:text-white text-base tracking-tight uppercase">
                        Estás Offline
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
                        Fica online para apareceres no mapa de <strong className="text-neutral-800 dark:text-neutral-200">{driverProfile.district || 'Massinga'}</strong> e começares a receber pedidos dos passageiros em tempo real.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={toggleOnline}
                      className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-red-600/30 transition-transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Bike className="w-4 h-4" />
                      <span>FICAR ONLINE AGORA 🚀</span>
                    </button>
                  </div>
                ) : incomingTrips.length === 0 ? (
                  /* MODERN RADAR STATE - RED DOMINANT & MODERN */
                  <div className="p-6 bg-gradient-to-b from-red-50/60 via-white to-red-50/30 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900/90 rounded-3xl border-2 border-red-500/30 text-center space-y-4 shadow-xl relative overflow-hidden">
                    {/* Red radar ripple effect */}
                    <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></div>
                      <div className="absolute inset-2 rounded-full bg-red-500/30 animate-pulse"></div>
                      <div className="relative w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40">
                        <Bike className="w-7 h-7" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-950/80 text-red-600 rounded-full text-[11px] font-black uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                        <span>Radar TeleMoto+ Ativo</span>
                      </div>
                      <h4 className="font-black text-neutral-900 dark:text-white text-base tracking-tight pt-1">
                        Pronto para Receber Corridas
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
                        A monitorizar pedidos em <strong className="text-neutral-800 dark:text-neutral-200">{driverProfile.district || 'Massinga'}</strong>. Você receberá um sinal imediato com a partida e destino para definir o seu preço!
                      </p>
                    </div>

                    {/* Quick feature tags */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-left">
                      <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-2xl border border-red-100 dark:border-neutral-700 shadow-xs flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-600"></div>
                        <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">Preço Definido por Si</span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-2xl border border-red-100 dark:border-neutral-700 shadow-xs flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">GPS Conectado</span>
                      </div>
                    </div>

                    {/* Minimize / View Map Quick Button */}
                    {mobileSheetState === 'full' && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setMobileSheetState('half')}
                          className="w-full py-3 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-black text-xs uppercase tracking-wider rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-neutral-200 dark:border-neutral-700"
                        >
                          <ChevronDown className="w-4 h-4 text-red-500" />
                          <span>Abaixar Painel (Ver Mapa Completo) 🗺️</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* INCOMING TRIP REQUEST CARDS - BRAND NEW RED-DOMINANT BIDDING FORM */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-red-600 flex items-center gap-1.5 animate-pulse">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                        {incomingTrips.length} Nova(s) Solicitação(ões) de Viagem!
                      </h4>
                    </div>

                    {incomingTrips.map((trip) => (
                      <div
                        key={trip.id}
                        className="bg-white dark:bg-neutral-900 rounded-[32px] border-2 border-red-600 shadow-2xl shadow-red-600/20 overflow-hidden space-y-4 animate-scale-up"
                      >
                        {/* Red Gradient Card Header */}
                        <div className="bg-gradient-to-r from-red-600 via-red-600 to-red-700 px-5 py-3.5 text-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-3 w-3 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                            </span>
                            <span className="font-black text-xs uppercase tracking-wider drop-shadow-sm">
                              Hora de trabalho! 🚨
                            </span>
                          </div>
                          <div className="text-[11px] font-mono font-bold bg-black/25 px-2.5 py-0.5 rounded-full border border-white/20">
                            ~{trip.distanceKm.toFixed(1)} km
                          </div>
                        </div>

                        <div className="p-4 sm:p-5 pt-0 space-y-4">
                          {/* The requested speech banner */}
                          <div className="p-4 bg-red-50/80 dark:bg-red-950/60 rounded-2xl border-2 border-red-500/40 space-y-2">
                            <p className="text-sm font-extrabold text-neutral-900 dark:text-white leading-snug">
                              <span className="text-red-600 font-black">Hora de trabalho!</span><br />
                              <span className="font-black">{trip.passengerName || 'Passageiro'}</span> quer saber quanto cobra para sair de <span className="text-red-600 font-black">{(trip.origin?.address || '').split('•')[0] || 'origem'}</span> para <span className="text-red-600 font-black">{(trip.destination?.address || '').split('•')[0] || 'destino'}</span>, defina o preço no campo abaixo.
                            </p>

                            {/* Route Timing */}
                            <div className="pt-1 flex items-center justify-between text-xs">
                              <span className="text-neutral-500 text-[11px]">Duração estimada: ~{trip.estimatedDurationMin} min</span>
                              <span className="text-red-600 font-bold text-[11px]">TeleMoto+ Direto</span>
                            </div>
                          </div>

                          {/* Route details preview */}
                          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 space-y-2 text-xs">
                            <div className="flex items-start gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-neutral-400 font-bold uppercase">Ponto de Partida (Passageiro)</p>
                                <p className="font-bold text-neutral-800 dark:text-neutral-200 truncate">{trip.origin.address}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2.5 pt-1.5 border-t border-neutral-100 dark:border-neutral-700/60">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-600 mt-1 shrink-0"></span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-neutral-400 font-bold uppercase">Destino</p>
                                <p className="font-bold text-neutral-800 dark:text-neutral-200 truncate">{trip.destination.address}</p>
                              </div>
                            </div>
                          </div>

                          {/* Price input & quick preset chips */}
                          <div className="space-y-2.5">
                            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                              Defina o seu Preço:
                            </label>

                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-600 font-black text-base">MT</span>
                                <input
                                  type="number"
                                  value={incomingBids[trip.id] ?? ''}
                                  onChange={(e) => setIncomingBids((prev) => ({ ...prev, [trip.id]: e.target.value }))}
                                  placeholder={String(driverProfile?.baseFare || trip.fareAmount || 50)}
                                  className="w-full pl-11 pr-3 py-3 bg-white dark:bg-neutral-900 border-2 border-red-500 rounded-2xl font-black text-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 shadow-inner"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleProposalForTrip(trip)}
                                disabled={processingAction || !incomingBids[trip.id]}
                                className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-transform active:scale-95 shadow-lg shadow-red-600/30 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                              >
                                <DollarSign className="w-4 h-4" />
                                <span>DEFINIR PREÇO</span>
                              </button>
                            </div>

                            {/* Fast preset buttons for driver convenience */}
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] font-bold text-neutral-400">Atalhos:</span>
                              {[50, 60, 75, 100, 150].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => {
                                    setIncomingBids((prev) => ({ ...prev, [trip.id]: String(preset) }));
                                    handleProposalForTrip(trip, preset);
                                  }}
                                  className="px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-red-50 hover:text-red-600 text-neutral-700 dark:text-neutral-200 text-xs font-black rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-2xs transition-colors"
                                >
                                  {preset} MT
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Reject action */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIncomingTrips((prev) => prev.filter((t) => t.id !== trip.id));
                              }}
                              className="w-full py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                            >
                              RECUSAR PEDIDO
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          </div>
        )}
      </div>

      {/* Zoom / Full Screen Reference Photo Expand Overlay */}
      <AnimatePresence>
        {selectedReferencePhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 font-sans"
            onClick={() => setSelectedReferencePhoto(null)}
          >
            <button 
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReferencePhoto(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>
            <div className="max-w-md w-full text-center space-y-4" onClick={(e) => e.stopPropagation()}>
              <motion.img 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                src={selectedReferencePhoto} 
                alt="Ponto de Referência" 
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border-2 border-white/10"
              />
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-white/80 leading-normal font-bold">
                📸 Procura por isto ao chegares! O passageiro enviou esta foto do local de recolha.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Driver Chat Modal */}
      {isChatOpen && currentTrip && (
        <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      )}

      {/* FULL DRIVER PROFILE EDIT MODAL */}
      {showEditPresentation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 pb-36 shadow-2xl relative border border-neutral-200 dark:border-neutral-800 max-h-[92vh] overflow-y-auto space-y-4 my-auto">
            <button
              onClick={() => setShowEditPresentation(false)}
              className="absolute right-4 top-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="p-2 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                  Preencher / Editar Perfil de Condutor
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Insira os seus dados completos para ser ativado e receber corridas
                </p>
              </div>
            </div>

            {presentationMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  presentationMsg.includes('sucesso')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{presentationMsg}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Ex: Mateus Langa"
                    className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Telefone de Contacto *
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+258 84 123 4567"
                    className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Número do BI / Documento *
                  </label>
                  <input
                    type="text"
                    value={editIdNumber}
                    onChange={(e) => setEditIdNumber(e.target.value)}
                    placeholder="Ex: 110100987654A"
                    className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Matrícula da Moto *
                  </label>
                  <input
                    type="text"
                    value={editPlateNumber}
                    onChange={(e) => setEditPlateNumber(e.target.value)}
                    placeholder="Ex: MM-12-34"
                    className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1 text-[11px]">
                    Marca *
                  </label>
                  <input
                    type="text"
                    value={editBikeBrand}
                    onChange={(e) => setEditBikeBrand(e.target.value)}
                    placeholder="TVS / Honda"
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1 text-[11px]">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={editBikeModel}
                    onChange={(e) => setEditBikeModel(e.target.value)}
                    placeholder="HLX 150"
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1 text-[11px]">
                    Cor
                  </label>
                  <input
                    type="text"
                    value={editBikeColor}
                    onChange={(e) => setEditBikeColor(e.target.value)}
                    placeholder="Vermelha"
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Upload Fotos */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-center space-y-1.5">
                  <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 block">
                    Foto de Perfil *
                  </span>
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-neutral-200 dark:bg-neutral-700 overflow-hidden border border-neutral-300 dark:border-neutral-600 relative">
                    {editPhotoUrl ? (
                      <img src={editPhotoUrl} alt="Rosto" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px]">
                        Sem foto
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                    <Upload className="w-3 h-3" />
                    <span>{compressingTarget === 'driver' ? 'A carregar...' : 'Trocar Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, 'driver')}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-center space-y-1.5">
                  <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 block">
                    Foto da Moto *
                  </span>
                  <div className="w-24 h-20 mx-auto rounded-2xl bg-neutral-200 dark:bg-neutral-700 overflow-hidden border border-neutral-300 dark:border-neutral-600 relative">
                    {editBikePhotoUrl ? (
                      <img src={editBikePhotoUrl} alt="Moto" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px]">
                        Sem foto
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                    <Upload className="w-3 h-3" />
                    <span>{compressingTarget === 'bike' ? 'A carregar...' : 'Trocar Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, 'bike')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Apresentação Pessoal aos Passageiros (Bio) *
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Ex: Olá! Sou motorista experiente, atencioso e conheço bem as rotas."
                  className="w-full text-xs p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* PREFERÊNCIA DE TEMA VISUAL DO MOTORISTA */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/70 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                <label className="block font-bold text-neutral-800 dark:text-neutral-200">
                  Tema Visual da Aplicação:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-neutral-900 text-white border-red-500 shadow-md ring-2 ring-red-500/30'
                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Modo Escuro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white text-neutral-950 border-red-500 shadow-md ring-2 ring-red-500/30'
                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Modo Claro</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSavePresentation}
                  disabled={savingPresentation || compressingTarget !== null}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savingPresentation ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guardar Perfil e Ativar Corridas</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Hamburger Menu Drawer */}
      <HamburgerMenu
        isOpen={isHamburgerOpen}
        onClose={() => setIsHamburgerOpen(false)}
        onOpenSOS={onOpenSOS}
        onOpenEditProfile={() => setShowEditPresentation(true)}
      />
    </div>
  );
};

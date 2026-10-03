import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trip, PaymentMethodType } from '../../types';
import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { DriverPresentationModal } from '../common/DriverPresentationModal';
import { calculateHaversineDistance } from '../../services/pricingService';
import { processTripCompletedPayment } from '../../services/paymentService';
import {
  acceptDriverBid,
  rejectDriverBidTooHigh,
  declineDriverBid,
  confirmPassengerArrival,
  confirmPassengerDestinationReached,
  submitRating,
  updateTripReferencePhoto,
} from '../../services/rideService';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { compressImageToBase64 } from '../../utils/imageCompressor';
import {
  Phone,
  MessageSquare,
  Share2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Bike,
  Award,
  CheckCircle2,
  CreditCard,
  Smartphone,
  ChevronRight,
  ArrowLeft,
  Navigation,
  Gauge,
  Sparkles,
  Check,
  Lock,
  Zap,
  Camera,
  X,
} from 'lucide-react';

interface ActiveRideViewProps {
  trip: Trip;
  onOpenChat: () => void;
  onOpenSOS: () => void;
  onCancel: () => void;
  onShare: () => void;
}

export const ActiveRideView: React.FC<ActiveRideViewProps> = ({
  trip,
  onOpenChat,
  onOpenSOS,
  onCancel,
  onShare,
}) => {
  const { user } = useAuth();
  const { searchTimeRemaining, messages } = useRide();
  const { startCall, missedCallsCount, clearMissedCalls } = useCall();

  const isDriverArrived = trip.status === 'driver_arrived' || trip.status === 'trip_started';
  
  const unreadCount = messages.filter(
    (m) => m.senderId !== user?.uid && !m.read
  ).length;

  const [showPresentationModal, setShowPresentationModal] = useState<boolean>(false);
  const [confirmingBoarding, setConfirmingBoarding] = useState<boolean>(false);
  const [confirmingDestination, setConfirmingDestination] = useState<boolean>(false);
  const [acceptingBid, setAcceptingBid] = useState<boolean>(false);

  // Reference Photo States
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [sendingPhoto, setSendingPhoto] = useState<boolean>(false);

  const handleCapturePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Compress
    try {
      const base64 = await compressImageToBase64(file);
      setPhotoBase64(base64);
    } catch (err) {
      console.error('Failed to compress reference photo:', err);
    }
  };

  const handleSendReferencePhoto = async () => {
    if (!photoBase64 || sendingPhoto) return;
    setSendingPhoto(true);
    const ok = await updateTripReferencePhoto(trip.id, photoBase64);
    setSendingPhoto(false);
    if (ok) {
      setPhotoPreview(null);
      setPhotoBase64('');
    }
  };

  const renderReferencePhotoCard = () => {
    return (
      <div className="ios-glass p-5 rounded-3xl border border-neutral-200/80 dark:border-white/5 space-y-4">
        {!trip.pickupReferencePhotoUrl ? (
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                <Camera className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Verificação de Presença</span>
                <h4 className="text-sm font-black text-neutral-900 dark:text-white leading-tight uppercase tracking-tight mt-0.5">📸 Prove que está no Local</h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal mt-1">
                  Tire uma foto de algo famoso à sua volta (estabelecimento, placa de loja, paragem, restaurante...) para o motorista localizá-lo rápido e provar que está lá!
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {photoPreview ? (
                <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-black">
                  <img src={photoPreview} alt="Ponto de Referência" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhotoPreview(null); setPhotoBase64(''); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full py-4 border-2 border-dashed border-neutral-300 dark:border-neutral-800 hover:border-amber-500 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-neutral-50 hover:bg-neutral-100/50 dark:bg-neutral-900 dark:hover:bg-neutral-850/50 transition-colors">
                  <Camera className="w-6 h-6 text-neutral-400" />
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Tirar Foto do Ponto de Referência</span>
                  <span className="text-[10px] text-neutral-400">Use a câmera do seu telemóvel</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCapturePhoto}
                    className="hidden"
                  />
                </label>
              )}

              {photoBase64 && (
                <button
                  type="button"
                  onClick={handleSendReferencePhoto}
                  disabled={sendingPhoto}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{sendingPhoto ? 'A Enviar Foto...' : 'Enviar Foto de Referência'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20 text-xs font-bold flex items-center gap-3 text-left">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            <div>
              <p className="uppercase tracking-wide text-[9px] font-black">Referência Visual Enviada!</p>
              <p className="text-[10px] text-neutral-500 leading-normal mt-0.5">
                O motorista recebeu a foto de referência e irá utilizá-la para o encontrar ao chegar ao local.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Telemetry
  const [liveSpeed, setLiveSpeed] = useState<number>(32);
  const [remainingKm, setRemainingKm] = useState<number>(trip.distanceKm || 1.5);

  useEffect(() => {
    if (trip.status === 'trip_started') {
      const interval = setInterval(() => {
        setLiveSpeed(Math.floor(Math.random() * 15) + 25);
        setRemainingKm(prev => Math.max(0.1, prev - 0.05));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [trip.status]);

  const mins = Math.floor(searchTimeRemaining / 60);
  const secs = searchTimeRemaining % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const getProgressStep = () => {
    switch (trip.status) {
      case 'requested':
      case 'searching_driver': return 1;
      case 'driver_assigned':
      case 'driver_arriving': return 2;
      case 'driver_arrived': return 3;
      case 'trip_started': return 4;
      case 'trip_completed':
      case 'payment_pending':
      case 'paid': return 5;
      default: return 1;
    }
  };

  const currentStep = getProgressStep();

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* 1. iOS STEPPER HUB */}
      <div className="px-5 py-4 ios-glass dark:bg-neutral-900/80 rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-2xl mb-4">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 px-1">
          <span className={currentStep === 1 ? 'text-red-600' : ''}>Busca</span>
          <span className={currentStep === 2 ? 'text-amber-500' : ''}>Caminho</span>
          <span className={currentStep === 3 ? 'text-emerald-500' : ''}>Local</span>
          <span className={currentStep === 4 ? 'text-blue-500' : ''}>Viagem</span>
          <span className={currentStep === 5 ? 'text-emerald-500' : ''}>Fim</span>
        </div>
        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex gap-1 p-0.5">
          {[1, 2, 3, 4, 5].map(step => (
            <div 
              key={step}
              className={`h-full flex-1 rounded-full transition-all duration-700 ${
                step <= currentStep 
                  ? step === 1 ? 'bg-red-500' : step === 2 ? 'bg-amber-500' : step === 4 ? 'bg-blue-500' : 'bg-emerald-500'
                  : 'bg-neutral-200 dark:bg-neutral-700 opacity-30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 2. DYNAMIC CONTENT AREA */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        <AnimatePresence mode="wait">
          
          {/* SEARCHING MODE */}
          {(trip.status === 'requested' || trip.status === 'searching_driver') && (
            <motion.div 
              key="searching"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-4"
            >
              {trip.biddingStatus === 'offered' ? (
                <div className="ios-glass p-8 rounded-[3rem] border-2 border-red-500 shadow-2xl text-center space-y-6">
                  <div className="w-20 h-20 bg-red-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                    <Bike className="w-10 h-10 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Proposta Recebida</h3>
                    <p className="text-sm text-neutral-500 font-medium">O motorista definiu o valor da viagem</p>
                  </div>
                  <div className="py-4 px-10 bg-neutral-900 text-white rounded-3xl inline-block shadow-2xl border-4 border-white/10">
                    <span className="text-4xl font-black font-mono tracking-tighter">{trip.biddingPrice} MT</span>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => acceptDriverBid(trip.id, trip.biddingPrice!, 'cash')}
                      className="w-full py-5 bg-emerald-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Aceitar Proposta</span>
                    </button>
                    <button
                      onClick={() => declineDriverBid(trip.id, 'passenger')}
                      className="w-full py-4 text-neutral-400 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors"
                    >
                      Recusar Oferta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ios-glass p-10 rounded-[3rem] border border-white/20 shadow-2xl text-center space-y-6">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                    <div className="relative w-full h-full bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl">
                      <Zap className="w-10 h-10 fill-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white uppercase">Radar Ativo</h3>
                    <p className="text-sm text-neutral-500 font-medium max-w-[200px] mx-auto leading-relaxed">
                      Procurando pilotos credenciados em {trip.origin?.address?.split('•')[0]}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-white/5 rounded-full text-xs font-black font-mono">
                    <Clock className="w-4 h-4 text-red-500 animate-pulse" />
                    <span>Tempo: {timeStr}</span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onCancel}
                      className="w-full py-4 px-6 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-widest rounded-2xl border border-red-200 dark:border-red-800/60 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancelar Pedido</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* DRIVER ASSIGNED & ARRIVING MODE */}
          {(trip.status === 'driver_assigned' || trip.status === 'driver_arriving') && (
            <motion.div 
              key="assigned"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {!trip.pickupReferencePhotoUrl ? (
                <div className="ios-glass p-8 rounded-[3rem] border-2 border-amber-500 shadow-2xl text-center space-y-6">
                  <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20">
                    <Camera className="w-10 h-10 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Verificação de Presença Obrigatória</span>
                    <h3 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white uppercase leading-tight mt-1">📸 Prove que está no Local</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mt-2">
                      A proposta de <strong className="text-amber-600 dark:text-amber-400">{trip.fareAmount} MT</strong> foi aceite!
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mt-2 max-w-xs mx-auto">
                      Para sua segurança e do motorista, por favor <b>tire uma foto de algo muito famoso ou notável</b> à sua volta (um estabelecimento, restaurante, planta, casa, paragem de autocarro...).
                    </p>
                  </div>

                  <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 text-left space-y-2">
                    <div className="flex gap-2.5 text-[11px] text-amber-800 dark:text-amber-400 font-bold">
                      <span className="shrink-0 text-amber-600">1️⃣</span>
                      <span>Facilita ao motorista localizá-lo rapidamente no ponto de recolha.</span>
                    </div>
                    <div className="flex gap-2.5 text-[11px] text-amber-800 dark:text-amber-400 font-bold">
                      <span className="shrink-0 text-amber-600">2️⃣</span>
                      <span>Confirma que você está realmente no local combinado.</span>
                    </div>
                    <div className="flex gap-2.5 text-[11px] text-amber-800 dark:text-amber-400 font-bold">
                      <span className="shrink-0 text-amber-600">3️⃣</span>
                      <span>Evita abusos e chamar motoristas para locais onde você não está.</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {photoPreview ? (
                      <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 bg-black shadow-inner">
                        <img src={photoPreview} alt="Ponto de Referência" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setPhotoPreview(null); setPhotoBase64(''); }}
                          className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/85 text-white rounded-full cursor-pointer transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-800 hover:border-amber-500 rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer bg-neutral-50 hover:bg-neutral-100/50 dark:bg-neutral-900 dark:hover:bg-neutral-850/50 transition-all group">
                        <Camera className="w-8 h-8 text-neutral-400 group-hover:text-amber-500 group-hover:scale-110 transition-all" />
                        <span className="text-xs font-black text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Tirar Foto do Ponto Famoso / Local 📸</span>
                        <span className="text-[10px] text-neutral-400">Clique para abrir a câmera do seu telemóvel</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleCapturePhoto}
                          className="hidden"
                        />
                      </label>
                    )}

                    {photoBase64 ? (
                      <button
                        type="button"
                        onClick={handleSendReferencePhoto}
                        disabled={sendingPhoto}
                        className="w-full py-4.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{sendingPhoto ? 'A Enviar Foto...' : 'Enviar Foto e Chamar Motorista 🚀'}</span>
                      </button>
                    ) : null}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onCancel}
                      className="w-full py-3.5 px-6 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-widest rounded-2xl border border-red-200 dark:border-red-800/60 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancelar Corrida</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ios-glass p-6 rounded-[2.5rem] border border-white/20 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-neutral-200 overflow-hidden border-2 border-amber-500 shadow-lg shrink-0">
                        {trip.driverPhoto ? <img src={trip.driverPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-xl text-neutral-400">M</div>}
                      </div>
                      <div>
                        <h4 className="font-black text-lg text-neutral-900 dark:text-white leading-tight uppercase italic">{trip.driverName}</h4>
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 mt-1">
                          <span className="flex items-center gap-1 text-amber-500">
                            <Star className="w-3 h-3 fill-amber-500" /> {trip.driverRating || '5.0'}
                          </span>
                          <span>•</span>
                          <span className="text-red-500">{trip.bikeBrand}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="px-3 py-1.5 bg-neutral-950 text-white font-mono font-black text-xs rounded-xl shadow-lg border border-white/10 uppercase tracking-tighter">
                        {trip.plateNumber}
                      </div>
                      <p className="text-[8px] font-black text-neutral-400 uppercase mt-1 tracking-widest">Matrícula</p>
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-100 dark:bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
                        <Navigation className="w-5 h-5 animate-spin-slow" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Aproximando-se</p>
                        <p className="text-sm font-black text-neutral-900 dark:text-white tracking-tight">Cerca de 3 minutos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Preço</p>
                      <p className="text-lg font-black text-emerald-500 font-mono tracking-tighter">{trip.biddingPrice || trip.fareAmount} MT</p>
                    </div>
                  </div>

                  {/* Local Photo Verification Step */}
                  {renderReferencePhotoCard()}

                  {/* PASSENGER CAN CONFIRM DRIVER HAS ARRIVED */}
                  <div className="pt-1">
                    {isDriverArrived ? (
                      <button
                        type="button"
                        onClick={async () => {
                          setConfirmingBoarding(true);
                          await confirmPassengerArrival(trip.id);
                          setConfirmingBoarding(false);
                        }}
                        disabled={confirmingBoarding || trip.passengerConfirmedArrival}
                        className={`w-full py-3.5 px-4 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                          trip.passengerConfirmedArrival
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500 cursor-default'
                            : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>
                          {confirmingBoarding
                            ? 'A Confirmar...'
                            : trip.passengerConfirmedArrival
                            ? 'Presença Confirmada ✓'
                            : 'Confirmar Chegada do Motorista 📍'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-3.5 px-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700 font-black text-xs uppercase tracking-widest rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>Aguardando o motorista chegar ao local... ⏳</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={onCancel}
                      className="w-full py-3 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span>Cancelar Corrida</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* DRIVER ARRIVED MODE (DRIVER AT MEETING POINT) */}
          {trip.status === 'driver_arrived' && (
            <motion.div 
              key="arrived"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="ios-glass p-6 rounded-[2.5rem] border-2 border-emerald-500 shadow-2xl space-y-5">
                
                {/* ARRIVAL BADGE & ALERT */}
                <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/40 rounded-2xl border border-emerald-500/30 flex items-center gap-3">
                  <div className="relative w-10 h-10 shrink-0">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-30" />
                    <div className="relative w-full h-full bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                      <MapPin className="w-5 h-5 fill-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">O Motorista Chegou!</h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">O piloto está no ponto de encontro à sua espera.</p>
                  </div>
                </div>

                {/* DRIVER CARD */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-200 overflow-hidden border-2 border-emerald-500 shadow-lg shrink-0">
                      {trip.driverPhoto ? <img src={trip.driverPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-xl text-neutral-400">M</div>}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-neutral-900 dark:text-white leading-tight uppercase italic">{trip.driverName}</h4>
                      <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 mt-1">
                        <span className="flex items-center gap-1 text-amber-500">
                          <Star className="w-3 h-3 fill-amber-500" /> {trip.driverRating || '5.0'}
                        </span>
                        <span>•</span>
                        <span className="text-red-500 font-bold">{trip.bikeBrand || 'Mototaxi'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1.5 bg-neutral-950 text-white font-mono font-black text-xs rounded-xl shadow-lg border border-white/10 uppercase tracking-tighter">
                      {trip.plateNumber || '---'}
                    </div>
                    <p className="text-[8px] font-black text-neutral-400 uppercase mt-1 tracking-widest">Matrícula</p>
                  </div>
                </div>

                {/* MEETING POINT & PRICE INFO */}
                <div className="p-4 bg-neutral-100 dark:bg-white/5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-2">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Ponto de Encontro</span>
                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 truncate max-w-[180px] text-right">
                      {trip.origin?.address || 'Local Definido'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Preço Combinado</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tighter">
                      {trip.biddingPrice || trip.fareAmount} MT
                    </span>
                  </div>
                </div>

                {/* Local Photo Verification Step */}
                {renderReferencePhotoCard()}

                {/* CONFIRM ARRIVAL / BOARDING BUTTON (PRIMARY) */}
                <div className="space-y-2 pt-1">
                  {isDriverArrived ? (
                    <button
                      type="button"
                      onClick={async () => {
                        setConfirmingBoarding(true);
                        await confirmPassengerArrival(trip.id);
                        setConfirmingBoarding(false);
                      }}
                      disabled={confirmingBoarding || trip.passengerConfirmedArrival}
                      className={`w-full py-4.5 px-6 font-black text-xs sm:text-sm uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer ${
                        trip.passengerConfirmedArrival
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>
                        {confirmingBoarding
                          ? 'A Confirmar Chegada...'
                          : trip.passengerConfirmedArrival
                          ? 'Presença e Embarque Confirmados ✓'
                          : 'Confirmar Chegada do Motorista 📍'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full py-4.5 px-6 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700 font-black text-xs sm:text-sm uppercase tracking-widest rounded-2xl cursor-not-allowed flex items-center justify-center gap-2.5"
                    >
                      <Clock className="w-5 h-5 animate-spin" />
                      <span>Aguardando o motorista chegar ao local... ⏳</span>
                    </button>
                  )}
                  {trip.passengerConfirmedArrival && (
                    <p className="text-[11px] text-center font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                      ✓ Presença confirmada! O motorista já pode iniciar a corrida.
                    </p>
                  )}
                </div>

                {/* SAFETY NOTE */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Confirme a matrícula <b>{trip.plateNumber}</b> antes de subir na mota.</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => trip.driverId && startCall({ tripId: trip.id, receiverId: trip.driverId, receiverName: trip.driverName || 'Piloto', receiverRole: 'driver' })}
                    disabled={!trip.driverId}
                    className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Ligar</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenChat}
                    className="py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer relative"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat</span>
                    {unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                    )}
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="w-full py-3 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>Cancelar Corrida</span>
                  </button>
                </div>

              </div>
            </motion.div>
          )}

          {/* TRIP IN PROGRESS MODE (CYBER HUD) */}
          {trip.status === 'trip_started' && (
            <motion.div 
              key="started"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="bg-neutral-950 p-6 rounded-[3rem] shadow-2xl border border-blue-500/30 text-white space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
                
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Em Trânsito</h3>
                      <p className="text-xs font-bold text-neutral-400">Monitorizado via Satélite</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-amber-400">{trip.fareAmount} MT</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Velocidade', val: `${liveSpeed}`, unit: 'km/h', icon: <Gauge className="w-3.5 h-3.5" />, color: 'text-amber-400' },
                    { label: 'Restante', val: `${remainingKm.toFixed(1)}`, unit: 'km', icon: <MapPin className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
                    { label: 'Tempo', val: '~4', unit: 'min', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-blue-400' },
                  ].map(stat => (
                    <div key={stat.label} className="p-4 rounded-[2rem] bg-white/5 border border-white/5 text-center space-y-1">
                      <div className={`mx-auto mb-1 ${stat.color}`}>{stat.icon}</div>
                      <div className="text-xl font-black font-mono tracking-tighter">{stat.val}</div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500">{stat.unit}</div>
                    </div>
                  ))}
                </div>

                <div className="p-4 ios-glass-dark rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-red-500" />
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest truncate">Destino: {trip.destination?.address}</span>
                  </div>
                </div>

                {/* PASSENGER CAN CONFIRM ARRIVAL AT DESTINATION */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setConfirmingDestination(true);
                      await confirmPassengerDestinationReached(trip.id);
                      setConfirmingDestination(false);
                    }}
                    disabled={confirmingDestination || trip.passengerConfirmedDestination}
                    className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      {confirmingDestination
                        ? 'A Concluir...'
                        : trip.passengerConfirmedDestination
                        ? 'Chegada ao Destino Confirmada ✓'
                        : 'Confirmar Chegada ao Destino 🏁'}
                    </span>
                  </button>
                </div>

              </div>
            </motion.div>
          )}

          {/* COMPLETED MODE */}
          {(trip.status === 'trip_completed' || trip.status === 'payment_pending' || trip.status === 'paid') && (
            <motion.div 
              key="completed"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="ios-glass p-8 rounded-[3rem] border-2 border-emerald-500 shadow-2xl text-center space-y-6">
                <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl border-4 border-white dark:border-neutral-900">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white uppercase">Chegada em Segurança</h3>
                  <p className="text-sm text-neutral-500 font-medium">Viagem #{trip.id.slice(0, 8)} concluída</p>
                </div>

                {!trip.passengerConfirmedDestination ? (
                  <div className="space-y-4 pt-2">
                    <div className="p-5 bg-neutral-900 text-white rounded-3xl border border-white/10 shadow-xl space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total a pagar em mão</p>
                      <p className="text-3xl font-black font-mono text-emerald-400 tracking-tighter">{trip.fareAmount} MT</p>
                    </div>
                    <button
                      onClick={() => confirmPassengerDestinationReached(trip.id)}
                      disabled={confirmingDestination}
                      className="w-full py-5 bg-emerald-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Confirmar Pagamento em Mão</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 space-y-4">
                    <p className="text-sm font-black text-emerald-600 uppercase tracking-widest italic animate-pulse">Avalie a sua experiência no ecrã de avaliação!</p>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'trips', trip.id), {
                            passengerRated: true,
                            updatedAt: Date.now(),
                          });
                        } catch (err) {
                          console.error('Failed to clear active trip and return to menu:', err);
                        }
                      }}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Voltar ao Menu Principal 🏠</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 3. FIXED BOTTOM QUICK TOOLS HUB */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 pointer-events-none">
        <div className="ios-glass dark:bg-neutral-900/90 rounded-[2rem] p-2.5 border border-white/20 dark:border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex items-center justify-between pointer-events-auto">
          
          {/* CALL */}
          <button
            onClick={() => trip.driverId && startCall({ tripId: trip.id, receiverId: trip.driverId, receiverName: trip.driverName || 'Piloto', receiverRole: 'driver' })}
            disabled={!trip.driverId}
            className="flex-1 flex flex-col items-center justify-center py-2 rounded-2xl hover:bg-white/10 dark:hover:bg-white/5 transition-all cursor-pointer group"
          >
            <Phone className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mt-1">Ligar</span>
          </button>

          {/* CHAT */}
          <button
            onClick={onOpenChat}
            className="flex-1 flex flex-col items-center justify-center py-2 rounded-2xl hover:bg-white/10 dark:hover:bg-white/5 transition-all cursor-pointer group relative"
          >
            <MessageSquare className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mt-1">Chat</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-1/4 w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white dark:border-neutral-900 shadow-sm">{unreadCount}</span>
            )}
          </button>

          {/* SHARE */}
          <button
            onClick={onShare}
            className="flex-1 flex flex-col items-center justify-center py-2 rounded-2xl hover:bg-white/10 dark:hover:bg-white/5 transition-all cursor-pointer group"
          >
            <Share2 className="w-5 h-5 text-neutral-400 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mt-1">Link</span>
          </button>

          {/* SOS */}
          <button
            onClick={onOpenSOS}
            className="flex-1 flex flex-col items-center justify-center py-2 rounded-2xl hover:bg-red-500/10 transition-all cursor-pointer group"
          >
            <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-widest text-red-600 mt-1">SOS</span>
          </button>

        </div>
      </div>
    </div>
  );
};

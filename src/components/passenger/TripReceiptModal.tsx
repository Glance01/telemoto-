import React, { useState } from 'react';
import { Trip } from '../../types';
import { submitRating } from '../../services/rideService';
import { CheckCircle2, Star, ShieldCheck, MapPin, Calendar, Clock, CreditCard, X, Bike } from 'lucide-react';
import telemotoLogo from '../../assets/images/telemoto_app_logo.png';

interface TripReceiptModalProps {
  trip: Trip;
  onClose: () => void;
  currentUserId: string;
  isDriver?: boolean;
}

export const TripReceiptModal: React.FC<TripReceiptModalProps> = ({
  trip,
  onClose,
  currentUserId,
  isDriver = false,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submittedRating, setSubmittedRating] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const dateStr = new Date(trip.createdAt).toLocaleDateString('pt-MZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = new Date(trip.createdAt).toLocaleTimeString('pt-MZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleRate = async () => {
    if (submitting) return;
    setSubmitting(true);

    const fromRole = isDriver ? 'driver' : 'passenger';
    const toRole = isDriver ? 'passenger' : 'driver';
    const toUserId = isDriver ? trip.passengerId : trip.driverId || '';

    if (toUserId) {
      await submitRating({
        tripId: trip.id,
        fromUserId: currentUserId,
        toUserId,
        fromRole,
        toRole,
        score: rating,
        comment,
      });
      setSubmittedRating(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative border border-neutral-100 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Receipt Header */}
        <div className="text-center pb-4 border-b border-dashed border-neutral-200">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden shadow-md shadow-red-500/20 mb-2 border border-red-500/30 bg-black">
            <img
              src={telemotoLogo}
              alt="TeleMoto+"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight">TELEMOTO+</h2>
          <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold mt-0.5">
            Recibo Oficial de Viagem
          </p>
          <div className="mt-3 inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
            Viagem Concluída com Sucesso
          </div>
        </div>

        {/* Amount Big Display */}
        <div className="text-center py-4 bg-neutral-50 rounded-2xl my-4 border border-neutral-100">
          <span className="text-xs text-neutral-500 uppercase font-semibold">Valor Total Pago</span>
          <p className="text-3xl font-black text-neutral-900 font-mono mt-0.5">
            {trip.fareAmount}{' '}
            <span className="text-base font-bold text-red-600">MT</span>
          </p>
          <p className="text-[11px] text-neutral-500 mt-1 capitalize">
            Método: <span className="font-semibold text-neutral-800">{trip.paymentMethod}</span>
          </p>
        </div>

        {/* Route Details */}
        <div className="space-y-3 text-xs text-neutral-700 py-2 border-b border-neutral-100">
          <div className="flex items-start gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1"></div>
            <div>
              <span className="text-neutral-400 font-medium">Origem:</span>
              <p className="font-semibold text-neutral-900">{trip.origin?.address || 'Sem endereço'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1"></div>
            <div>
              <span className="text-neutral-400 font-medium">Destino:</span>
              <p className="font-semibold text-neutral-900">{trip.destination?.address || 'Sem endereço'}</p>
            </div>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-3 text-xs text-neutral-600 border-b border-neutral-100">
          <div>
            <span className="text-neutral-400">Motorista:</span>
            <p className="font-semibold text-neutral-800">{trip.driverName || 'TeleMoto+'}</p>
          </div>
          <div>
            <span className="text-neutral-400">Matrícula:</span>
            <p className="font-mono font-semibold text-neutral-800">{trip.plateNumber || 'N/A'}</p>
          </div>
          <div>
            <span className="text-neutral-400">Data e Hora:</span>
            <p className="font-semibold text-neutral-800">{dateStr}, {timeStr}</p>
          </div>
          <div>
            <span className="text-neutral-400">Distância:</span>
            <p className="font-semibold text-neutral-800">{trip.distanceKm.toFixed(1)} km</p>
          </div>
          <div className="col-span-2 pt-1 font-mono text-[10px] text-neutral-400 break-all">
            ID da Viagem: {trip.id}
          </div>
        </div>

        {/* Rating Section */}
        <div className="pt-4">
          {submittedRating || trip.passengerRated ? (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl text-xs text-center font-medium border border-emerald-200">
              Obrigado pela tua avaliação! A tua opinião mantém a rede TeleMoto+ segura e de confiança.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-xs font-bold text-neutral-700">
                Como correu a viagem com {isDriver ? trip.passengerName : trip.driverName}?
              </p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-400 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= rating ? 'fill-amber-400 stroke-amber-500' : 'stroke-neutral-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Comentário opcional (ex: pontual, condução calma)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full text-xs p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={handleRate}
                disabled={submitting}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                {submitting ? 'A registar...' : 'Enviar Avaliação'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

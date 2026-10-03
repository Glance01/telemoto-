import React, { useState, useEffect } from 'react';
import { LocationPoint, PaymentMethodType, TripFareBreakdown } from '../../types';
import {
  Banknote,
  Smartphone,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Loader2,
  Check,
  Shield,
  Clock,
} from 'lucide-react';

interface RideFareEstimateProps {
  origin: LocationPoint;
  destination: LocationPoint;
  distanceKm: number;
  estimatedDurationMin: number;
  fareBreakdown: TripFareBreakdown;
  paymentMethod: PaymentMethodType;
  onSelectPaymentMethod: (m: PaymentMethodType) => void;
  onRequestRide: () => void;
  loading?: boolean;
}

export const RideFareEstimate: React.FC<RideFareEstimateProps> = ({
  origin,
  destination,
  distanceKm,
  estimatedDurationMin,
  fareBreakdown,
  paymentMethod,
  onSelectPaymentMethod,
  onRequestRide,
  loading = false,
}) => {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 shadow-xl border border-neutral-100 dark:border-neutral-800 space-y-4">
      {/* Route Header */}
      <div className="space-y-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Origem</p>
            <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{origin.address}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            B
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Destino</p>
            <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{destination.address}</p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 py-1 text-center bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl p-3 border border-neutral-100 dark:border-neutral-800/80">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Distância</p>
          <p className="text-sm sm:text-base font-extrabold text-neutral-800 dark:text-white font-mono mt-0.5">
            {distanceKm.toFixed(1)} km
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tempo Estimado</p>
          <p className="text-sm sm:text-base font-extrabold text-neutral-800 dark:text-white font-mono mt-0.5">
            ~{estimatedDurationMin} min
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/40 rounded-xl p-1 border border-red-200 dark:border-red-900/40">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Preço Determinado</p>
          <p className="text-sm sm:text-base font-black text-red-600 dark:text-red-400 font-mono mt-0.5">
            {fareBreakdown.totalFare} MT
          </p>
        </div>
      </div>

      {/* OFFICIAL FARE BREAKDOWN BOX */}
      <div className="p-4 bg-gradient-to-br from-neutral-900 via-neutral-900 to-red-950 rounded-3xl border border-red-500/30 text-white space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-wide uppercase">Cálculo de Preço Oficial</h4>
              <p className="text-[10px] text-neutral-400">Tarifa Transparente TeleMoto+</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black font-mono text-red-400">
              {fareBreakdown.totalFare} MT
            </span>
          </div>
        </div>

        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between text-neutral-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              Tarifa Base (até {fareBreakdown.includedBaseKm ?? 5} km):
            </span>
            <span className="font-mono font-bold text-white">{fareBreakdown.baseFare} MT</span>
          </div>

          <div className="flex items-center justify-between text-neutral-300">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  distanceKm > 5 ? 'bg-amber-400' : 'bg-neutral-500'
                }`}
              ></span>
              Km Adicional (&gt; 5 km):
            </span>
            {distanceKm > 5 ? (
              <span className="font-mono font-bold text-amber-300">
                +{(distanceKm - 5).toFixed(1)} km × 15 MT = +{fareBreakdown.distanceFare} MT
              </span>
            ) : (
              <span className="font-mono text-neutral-400 text-[11px]">
                0 MT (Incluído nos primeiros 5 km)
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between font-black text-sm">
            <span className="text-white">Valor Total Determinado:</span>
            <span className="font-mono text-red-400 text-base">{fareBreakdown.totalFare} MT</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-neutral-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Valor fixado pelo sistema: cabe ao motorista aceitar a corrida com este valor exato.</span>
        </div>
      </div>

      {/* Payment Selection */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
          Método de Pagamento (Oficial)
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onSelectPaymentMethod('mpesa')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
              paymentMethod === 'mpesa'
                ? 'border-red-500 bg-red-50/80 dark:bg-red-500/15 text-red-600 dark:text-red-400 font-bold shadow-xs ring-2 ring-red-500/20'
                : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <Smartphone className="w-6 h-6 mb-1.5 text-red-600" />
            <span className="text-xs font-bold">M-Pesa</span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Vodacom Moçambique</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPaymentMethod('card')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
              paymentMethod === 'card'
                ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold shadow-xs ring-2 ring-blue-500/20'
                : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <CreditCard className="w-6 h-6 mb-1.5 text-blue-600" />
            <span className="text-xs font-bold">Cartão Bancário</span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Visa / Mastercard / BIM</span>
          </button>
        </div>
      </div>

      {/* Safety & Commission Transparency Badge */}
      <div className="flex items-center gap-2 p-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl text-neutral-500 dark:text-neutral-400 text-[11px]">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Pagamentos exclusivamente via M-Pesa e Cartão Bancário para garantia de segurança e comissão automática da plataforma.</span>
      </div>

      {/* Submit Button */}
      <button
        onClick={onRequestRide}
        disabled={loading}
        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-red-500/25 transition-transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        ) : (
          <>
            <span>PEDIR MOTOTÁXI • {fareBreakdown.totalFare} MT</span>
            <ChevronRight className="w-5 h-5" />
          </>
        )}
      </button>
    </div>
  );
};

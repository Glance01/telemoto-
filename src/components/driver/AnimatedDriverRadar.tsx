import React, { useState, useEffect } from 'react';
import { Bike, Navigation, ShieldCheck, Zap, Radio, DollarSign } from 'lucide-react';

interface AnimatedDriverRadarProps {
  isOnline: boolean;
  currentTrip: any | null;
  incomingTrips: any[];
  driverProfile: any;
}

export const AnimatedDriverRadar: React.FC<AnimatedDriverRadarProps> = ({
  isOnline,
  currentTrip,
  incomingTrips,
  driverProfile,
}) => {
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScale((prev) => (prev === 1 ? 1.08 : 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[420px] lg:min-h-full bg-gradient-to-br from-neutral-50 via-white to-emerald-50/30 text-neutral-900 overflow-hidden flex flex-col items-center justify-center p-6 select-none shadow-inner">
      {/* BACKGROUND AMBIENT GLOWS */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* RADAR CONCENTRIC RINGS */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] rounded-full border border-neutral-200 absolute animate-ping opacity-30" style={{ animationDuration: '4s' }} />
        <div className="w-[260px] h-[260px] sm:w-[360px] sm:h-[360px] rounded-full border border-emerald-200 absolute" />
        <div className="w-[180px] h-[180px] sm:w-[240px] sm:h-[240px] rounded-full border border-neutral-300 absolute border-dashed" style={{ animation: 'spin 30s linear infinite' }} />
        <div className="w-[90px] h-[90px] sm:w-[120px] sm:h-[120px] rounded-full border border-emerald-300 absolute bg-emerald-50/60" />
      </div>

      {/* CENTRAL PULSING RADAR ICON */}
      <div className="relative z-20 flex flex-col items-center mb-6">
        <div className="relative">
          <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
          
          <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr ${isOnline ? 'from-emerald-600 to-emerald-500 shadow-emerald-600/30' : 'from-neutral-700 to-neutral-600 shadow-neutral-700/30'} shadow-xl flex items-center justify-center border-2 border-white transform transition-transform duration-500`} style={{ transform: `scale(${pulseScale})` }}>
            {currentTrip ? (
              <Bike className="w-10 h-10 text-white animate-bounce" />
            ) : isOnline ? (
              <Radio className="w-10 h-10 text-white animate-pulse" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-white" />
            )}
          </div>
        </div>

        <div className="mt-4 text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white backdrop-blur-md rounded-full border border-neutral-200 shadow-sm text-xs font-black text-emerald-700">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-neutral-400'}`} />
            <span>{isOnline ? 'Radar de Condutor Ativo' : 'Condutor Offline'}</span>
          </div>
          <h2 className="text-sm sm:text-base font-black tracking-wide text-neutral-800">
            {currentTrip
              ? `Viagem Ativa • ${currentTrip.fare} MT`
              : isOnline
              ? incomingTrips.length > 0
                ? `${incomingTrips.length} Solicitação(ões) Pendente(s)`
                : 'Aguardando passageiros na região...'
              : 'Ative o modo online para receber viagens'}
          </h2>
        </div>
      </div>

      {/* DRIVER STATS CARD */}
      {(() => {
        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const realTodayEarnings = driverProfile?.todayDate === todayKey ? (driverProfile?.todayEarnings || 0) : 0;
        const totalRatings = driverProfile?.totalRatingsCount || driverProfile?.totalRatings || 0;
        const hasRatings = totalRatings > 0 && driverProfile?.rating !== undefined;
        const realRatingText = hasRatings ? `★ ${driverProfile.rating.toFixed(1)}` : 'Novo';
        const realRides = driverProfile?.totalRides || 0;

        return (
          <div className="relative z-20 w-full max-w-sm bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200/90 dark:border-neutral-800 rounded-3xl p-4 shadow-2xl animate-fade-in text-center">
            <div className="flex items-center justify-around text-xs font-bold">
              <div className="flex-1 text-center">
                <span className="text-[10px] text-neutral-400 font-black uppercase tracking-wider block mb-0.5">Ganhos Hoje</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black text-base">{realTodayEarnings} MT</span>
              </div>
              <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-800 shrink-0" />
              <div className="flex-1 text-center px-1">
                <span className="text-[10px] text-neutral-400 font-black uppercase tracking-wider block mb-0.5">Avaliação</span>
                <span className="font-mono text-amber-500 font-black text-base">{realRatingText}</span>
              </div>
              <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-800 shrink-0" />
              <div className="flex-1 text-center">
                <span className="text-[10px] text-neutral-400 font-black uppercase tracking-wider block mb-0.5">Corridas</span>
                <span className="font-mono text-neutral-900 dark:text-white font-black text-base">{realRides}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

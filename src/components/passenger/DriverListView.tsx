import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DriverProfile, LocationPoint, TripFareBreakdown } from '../../types';
import {
  Bike,
  Star,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  MapPin,
  Zap,
  Sparkles,
  Info,
  Menu,
  LayoutGrid,
  X,
  Check,
} from 'lucide-react';

interface DriverListViewProps {
  drivers: DriverProfile[];
  destination: LocationPoint;
  fareBreakdown: TripFareBreakdown | null;
  onSelectDriver: (driver: DriverProfile) => void;
  onSelectNextAvailable: () => void;
  onBack: () => void;
  onOpenMenu?: () => void;
  loading?: boolean;
}

export const DriverListView: React.FC<DriverListViewProps> = ({
  drivers,
  destination,
  fareBreakdown,
  onSelectDriver,
  onSelectNextAvailable,
  onBack,
  onOpenMenu,
  loading = false,
}) => {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-50 dark:bg-neutral-950 font-sans overflow-hidden">
      {/* Full Screen Image Overlay */}
      <AnimatePresence>
        {selectedImageUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedImageUrl(null)}
          >
            <button 
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageUrl(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImageUrl} 
              alt="Visualização" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section - iOS 26 Aesthetic */}
      <div className="bg-red-600 pt-10 pb-8 px-6 rounded-b-[48px] shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl backdrop-blur-md transition-all active:scale-90 shadow-lg border border-white/10 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 stroke-[3]" />
            </button>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Escolher Mota</h2>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 rounded-full backdrop-blur-md border border-white/10 text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest">{drivers.length} Online</span>
          </div>
        </div>

        <div className="relative z-10">
           <div className="ios-glass-dark p-4 rounded-3xl flex items-center gap-3 border border-white/5">
              <div className="w-10 h-10 rounded-2xl bg-red-500/30 flex items-center justify-center text-white shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-red-200 uppercase tracking-widest">Para:</p>
                <p className="text-sm font-bold text-white truncate">{(destination?.address || 'Destino').split('•')[0]}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28 space-y-6 no-scrollbar relative max-w-2xl mx-auto w-full">
        {/* Quick Option Card */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onSelectNextAvailable}
          disabled={loading}
          className="w-full p-5 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-[32px] shadow-xl shadow-red-600/20 flex items-center justify-between group relative overflow-hidden border-b-4 border-red-800"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform">
              <Zap className="w-7 h-7 fill-amber-300 text-amber-300 animate-pulse" />
            </div>
            <div className="text-left">
              <h4 className="font-black text-base uppercase tracking-tighter">
                {loading ? 'A processar...' : 'Atribuição Express'}
              </h4>
              <p className="text-[10px] text-red-100 font-bold uppercase tracking-widest opacity-80">
                Ligar à mota mais rápida agora
              </p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
        </motion.button>

        {/* DRIVER LIST */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Motoristas Disponíveis</h3>
             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          </div>

          {drivers.length > 0 ? (
            <motion.div 
              layout
              className="space-y-4"
            >
              {drivers.map((driver, idx) => (
                <motion.div
                  key={driver.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="ios-glass dark:bg-neutral-900/50 rounded-[40px] p-5 shadow-sm border border-neutral-100 dark:border-white/5 group relative overflow-hidden"
                >
                  <div className="flex items-start gap-5">
                    {/* Left: Driver Profile Photo */}
                    <div 
                      className="w-20 h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-inner overflow-hidden shrink-0 border-2 border-white dark:border-neutral-700 relative group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (driver.photoUrl) setSelectedImageUrl(driver.photoUrl);
                      }}
                    >
                      {driver.photoUrl ? (
                        <img 
                          src={driver.photoUrl} 
                          alt={driver.fullName} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.fullName)}&background=fef2f2&color=dc2626&bold=true`;
                          }}
                        />
                      ) : (
                        <div className="text-3xl opacity-40">👤</div>
                      )}
                      <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-2 border-white dark:border-neutral-900 rounded-full flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white stroke-[4]" />
                      </div>
                    </div>

                    {/* Middle: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-base text-neutral-900 dark:text-white uppercase truncate tracking-tighter">
                          {driver.fullName.split(' ')[0]} {driver.fullName.split(' ')[1] || ''}
                        </h4>
                        <div className="flex items-center gap-1.5">
                          {driver.baseFare ? (
                            <span className="text-xs font-black font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-xl border border-red-200 dark:border-red-900/50">
                              {driver.baseFare} MT
                            </span>
                          ) : null}
                          {driver.rating && (
                            <div className="flex items-center gap-1 font-black text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/50">
                              <Star className="w-3 h-3 fill-amber-500" />
                              <span className="text-[11px]">{driver.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-0.5">
                        {driver.bikeBrand} {driver.bikeModel}
                      </p>
                      
                      <div className="mt-2 inline-block px-3 py-1 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-100 dark:border-red-900/50">
                         <p className="text-[10px] font-black text-red-600 dark:text-red-400 font-mono tracking-wider">
                           {driver.plateNumber || 'T+ MATRÍCULA'}
                         </p>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                         {driver.bikePhotoUrl && (
                           <div 
                            className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white dark:border-neutral-800 shadow-sm active:scale-150 transition-transform cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageUrl(driver.bikePhotoUrl!);
                            }}
                          >
                            <img src={driver.bikePhotoUrl} alt="Moto" className="w-full h-full object-cover" />
                          </div>
                         )}
                         <div className="flex-1 flex flex-col">
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Viagens</span>
                            <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">{driver.totalRides || 0}+ Concluídas</span>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-white/5 flex items-center gap-4">
                     <div className="flex-1 flex items-center gap-2 px-4 py-3.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-2xl text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-tighter">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Verificado</span>
                     </div>
                     
                     <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => onSelectDriver(driver)}
                      disabled={loading}
                      className="flex-[2] py-4 bg-red-600 hover:bg-red-700 text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>PEDIR AGORA</span>
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="py-20 text-center space-y-6 ios-glass dark:bg-neutral-900/50 rounded-[48px] p-8">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-[32px] flex items-center justify-center mx-auto text-4xl shadow-inner">
                🛵
              </div>
              <div className="space-y-2">
                <h4 className="font-black text-neutral-900 dark:text-white text-xl tracking-tighter uppercase">Nenhuma Mota Disponível</h4>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[240px] mx-auto font-medium">
                  Não existem condutores ativos neste momento. Ative o Radar Geral.
                </p>
              </div>
              <button
                onClick={onSelectNextAvailable}
                className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-widest rounded-3xl shadow-xl shadow-red-600/40 transition-all active:scale-95"
              >
                Ativar Radar Geral
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


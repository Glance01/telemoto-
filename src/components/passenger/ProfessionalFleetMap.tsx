import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bike,
  Navigation,
  MapPin,
  Compass,
  Zap,
  ShieldCheck,
  Star,
  Radio,
  Phone,
  CheckCircle,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  User,
  Clock,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { DriverProfile } from '../../types';

interface ProfessionalFleetMapProps {
  origin: { address: string; lat: number; lng: number } | null;
  destination: { address: string; lat: number; lng: number } | null;
  nearbyDrivers: DriverProfile[];
  isSearching: boolean;
  activeTrip: any | null;
  selectedDistrict: string;
  selectedProvince: string;
  hideDrivers?: boolean;
  onSimulateSelectDestination?: (name: string, lat: number, lng: number) => void;
  onSelectDriver?: (driver: DriverProfile) => void;
  onPromptOrigin?: () => void;
}

export const ProfessionalFleetMap: React.FC<ProfessionalFleetMapProps> = ({
  origin,
  destination,
  nearbyDrivers,
  isSearching,
  activeTrip,
  selectedDistrict,
  selectedProvince,
  hideDrivers,
  onSimulateSelectDestination,
  onSelectDriver,
  onPromptOrigin,
}) => {
  const [zoomLevel, setZoomLevel] = useState(14);
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const displayDrivers = hideDrivers ? [] : (nearbyDrivers || []);
  const onlineCount = displayDrivers.filter((d) => d.isOnline).length;

  return (
    <div className="relative w-full h-full min-h-[520px] lg:min-h-full bg-white text-neutral-800 overflow-hidden flex flex-col justify-between select-none font-sans border-r border-neutral-200/50">
      {/* 1. IMMERSIVE TERRAIN */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-neutral-50 to-neutral-100" />
        
        {/* Street Grid Matrix */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0, 0, 0, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 0, 0, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: `${50 * (zoomLevel / 14)}px ${50 * (zoomLevel / 14)}px`,
          }}
        />

        {/* Ambient Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      {/* 2. TOP HUD */}
      <div className="relative z-20 p-6 flex items-center justify-between pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-2.5 ios-glass rounded-2xl border border-neutral-200/80 shadow-2xl pointer-events-auto"
        >
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-800">
              {(selectedDistrict || 'Moçambique').toUpperCase()}
            </span>
            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-tighter">
              {onlineCount} Pilotos Online
            </span>
          </div>
        </motion.div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setZoomLevel((z) => Math.min(18, z + 1))}
            className="w-10 h-10 rounded-xl ios-glass border border-neutral-200/80 flex items-center justify-center hover:bg-neutral-50 text-neutral-800 transition-all active:scale-90"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(10, z - 1))}
            className="w-10 h-10 rounded-xl ios-glass border border-neutral-200/80 flex items-center justify-center hover:bg-neutral-50 text-neutral-800 transition-all active:scale-90"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. CENTRAL NODES */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          
          {/* USER ORIGIN NODE */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute z-20 flex flex-col items-center"
          >
            <div className="absolute -inset-8 bg-red-600/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-14 h-14 rounded-[1.5rem] bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-[0_20px_40px_-5px_rgba(220,38,38,0.5)] flex items-center justify-center border-2 border-white/50">
              <Navigation className="w-6 h-6 transform rotate-45" />
            </div>
            <div className="mt-3 px-3 py-1 ios-glass rounded-full border border-neutral-200/80 shadow-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-800 italic">Sua Posição</span>
            </div>
          </motion.div>

          {/* DRIVER NODES */}
          <AnimatePresence>
            {displayDrivers.map((driver, index) => {
              const driverId = driver.id || String(index);
              
              // Calculate position on the fly instead of storing in a state
              const angle = (index * (360 / Math.max(1, displayDrivers.length))) * (Math.PI / 180);
              const radius = 100 + (index % 3) * 50;
              const x = Math.round(Math.cos(angle) * radius);
              const y = Math.round(Math.sin(angle) * radius);
              
              return (
                <motion.div
                  key={driverId}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    x: x,
                    y: y
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  whileHover={{ scale: 1.1, zIndex: 50 }}
                  className="absolute z-10 cursor-pointer pointer-events-auto group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDriver(driver);
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-all absolute -top-10 whitespace-nowrap ios-glass px-3 py-1 rounded-xl border border-neutral-200/80 shadow-2xl">
                      <span className="text-[10px] font-black uppercase tracking-tighter text-neutral-800">
                        {driver.fullName?.split(' ')[0]} • {driver.rating?.toFixed(1) || '5.0'} ★
                      </span>
                    </div>

                    {/* Marker */}
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-2xl blur-xs opacity-50 group-hover:opacity-100" />
                      <div className="relative w-11 h-11 rounded-2xl bg-white border-2 border-emerald-500 flex items-center justify-center shadow-2xl overflow-hidden">
                        {driver.photoUrl ? (
                          <img 
                            src={driver.photoUrl} 
                            alt={driver.fullName} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <Bike className="w-5 h-5 text-emerald-600 absolute" />
                      </div>
                    </div>

                    <div className="px-2 py-0.5 bg-white/95 rounded-full border border-neutral-200/80 shadow-lg">
                      <span className="text-[9px] font-black text-neutral-700 uppercase tracking-tighter">
                        {driver.bikeBrand || 'Moto'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* DRIVER MINI PROFILE MODAL */}
          <AnimatePresence>
            {selectedDriver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="absolute bottom-24 z-50 w-full max-w-[280px] ios-glass p-5 rounded-[2.5rem] border border-neutral-200 shadow-2xl space-y-4 pointer-events-auto text-neutral-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-16 h-16 rounded-2xl bg-neutral-100 border-2 border-emerald-500/50 overflow-hidden cursor-zoom-in"
                    onClick={() => {
                      if (selectedDriver.photoUrl) setSelectedImageUrl(selectedDriver.photoUrl);
                    }}
                  >
                    {selectedDriver.photoUrl ? (
                      <img src={selectedDriver.photoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-neutral-400" /></div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-neutral-900 truncate">{selectedDriver.fullName}</h4>
                    <p className="text-[10px] text-neutral-600 font-bold">{selectedDriver.bikeBrand} {selectedDriver.bikeModel}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-black text-amber-500">{selectedDriver.rating?.toFixed(1) || '5.0'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (selectedDriver.bikePhotoUrl) setSelectedImageUrl(selectedDriver.bikePhotoUrl);
                    }}
                    className="py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-[9px] font-black uppercase tracking-wider border border-neutral-200 transition-all"
                  >
                    Ver Moto 🏍️
                  </button>
                  <button
                    onClick={() => onSelectDriver?.(selectedDriver)}
                    className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-lg transition-all"
                  >
                    Pedir Agora
                  </button>
                </div>

                <button 
                  onClick={() => setSelectedDriver(null)}
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white border border-neutral-200 text-neutral-800 flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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

      {/* 4. BOTTOM BAR (DESKTOP ONLY) */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="hidden lg:flex relative z-20 p-6 ios-glass border-t border-neutral-200/80 items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-red-600 border border-neutral-200/80 shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.1em] text-neutral-800">TeleMoto+ Matrix</h4>
            <p className="text-[9px] text-neutral-500 font-bold uppercase">Operação em tempo real via Satélite</p>
          </div>
        </div>

        <div className="hidden xs:flex items-center gap-3">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-neutral-100 flex items-center justify-center overflow-hidden">
                <User className="w-3 h-3 text-neutral-400" />
              </div>
            ))}
          </div>
          <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">+ {onlineCount} Pilotos</span>
        </div>
      </motion.div>
    </div>
  );
};

export const GoogleMapContainer = ProfessionalFleetMap;
export const OpenSourceMapContainer = ProfessionalFleetMap;

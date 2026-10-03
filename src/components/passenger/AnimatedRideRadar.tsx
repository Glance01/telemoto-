import React, { useState, useEffect } from 'react';
import {
  Bike,
  Navigation,
  MapPin,
  Sparkles,
  Compass,
  Zap,
  ShieldCheck,
  Star,
  Radio,
  X,
  Phone,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { DriverProfile } from '../../types';

interface AnimatedRideRadarProps {
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

export const AnimatedRideRadar: React.FC<AnimatedRideRadarProps> = ({
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
  const [pulseScale, setPulseScale] = useState(1);
  const [selectedDriverPopup, setSelectedDriverPopup] = useState<DriverProfile | null>(null);
  const [driverOffsets, setDriverOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingDriverId, setDraggingDriverId] = useState<string | null>(null);
  const dragStartRef = React.useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, driverId: string, currentX: number, currentY: number) => {
    e.stopPropagation();
    setDraggingDriverId(driverId);
    const current = driverOffsets[driverId] || { x: currentX, y: currentY };
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: current.x,
      initialY: current.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, driverId: string) => {
    if (draggingDriverId !== driverId || !dragStartRef.current) return;
    e.stopPropagation();
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.startX;
    const dy = e.clientY - start.startY;
    setDriverOffsets((prev) => ({
      ...prev,
      [driverId]: {
        x: start.initialX + dx,
        y: start.initialY + dy,
      },
    }));
  };

  const handlePointerUp = (e: React.PointerEvent, driverId: string) => {
    if (draggingDriverId === driverId) {
      setDraggingDriverId(null);
      dragStartRef.current = null;
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScale((prev) => (prev === 1 ? 1.08 : 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const baseLat = origin?.lat || -25.9692;
  const baseLng = origin?.lng || 32.5732;

  // Real drivers only (strictly filtered by district/province)
  const displayDrivers = hideDrivers ? [] : (nearbyDrivers || []);
  const onlineCount = displayDrivers.filter((d) => d.isOnline).length;

  const handleDriverClick = (driver: DriverProfile) => {
    setSelectedDriverPopup(driver);
  };

  const originShort = (origin?.address || '').split('•')[0]?.trim() || '';
  const destShort = (destination?.address || '').split('•')[0]?.trim() || '';

  return (
    <div className="relative w-full h-full min-h-[520px] lg:min-h-full bg-[#eef6ff] text-neutral-900 overflow-hidden flex flex-col items-center justify-between p-3 sm:p-5 select-none shadow-inner border border-blue-200 font-sans">
      {/* 1. BACKGROUND AMBIENT RADAR SCAN GLOWS & GRID */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1.2s' }}
        />
        {/* Subtle high-tech grid dots */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* 2. RADAR CONCENTRIC RINGS (Futuristic Light Blue HUD) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[380px] h-[380px] sm:w-[520px] sm:h-[520px] rounded-full border border-red-500/20 absolute animate-ping opacity-25"
          style={{ animationDuration: '4.5s' }}
        />
        <div className="w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] rounded-full border border-red-500/30 absolute" />
        <div
          className="w-[230px] h-[230px] sm:w-[320px] sm:h-[320px] rounded-full border border-blue-300/60 absolute border-dashed"
          style={{ animation: 'spin 40s linear infinite' }}
        />
        <div className="w-[130px] h-[130px] sm:w-[170px] sm:h-[170px] rounded-full border border-red-500/40 absolute bg-red-100/40 backdrop-blur-xs" />

        {/* Crosshair guidelines */}
        <div className="w-[380px] sm:w-[500px] h-[1px] bg-blue-200/80 absolute" />
        <div className="h-[380px] sm:h-[500px] w-[1px] bg-blue-200/80 absolute" />
      </div>

      {/* 3. TOP RADAR HEADER */}
      <div className="relative z-20 flex flex-col items-center pt-2 sm:pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full border border-blue-200 shadow-md text-xs font-black text-red-600">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>RADAR DIGITAL DE {(selectedDistrict || 'MOÇAMBIQUE').toUpperCase()} 🇲🇿</span>
        </div>

        <h2 className="mt-1.5 text-sm sm:text-base font-black tracking-tight text-neutral-900 text-center">
          {activeTrip
            ? 'Viagem em Andamento'
            : isSearching
            ? 'A procurar mototáxi próximo...'
            : destination
            ? 'Rota traçada — Escolha sua Mototáxi'
            : onlineCount > 0
            ? `${onlineCount} Mototáxi(s) Online em ${selectedDistrict}`
            : `Radar Ativo em ${selectedDistrict}`}
        </h2>

        {/* Tip for passenger */}
        {displayDrivers.length > 0 && !activeTrip && (
          <p className="text-[11px] text-neutral-600 font-medium flex items-center gap-1 mt-0.5 animate-fade-in">
            <span>Toque na moto flutuante 🛵 para ver perfil e pedir corrida</span>
          </p>
        )}
      </div>

      {/* 4. CENTRAL RADAR HUD AREA WITH FLOATING MOTORCYCLES 🛵 */}
      <div className="relative z-30 w-full flex-1 min-h-[320px] max-w-xl flex items-center justify-center my-2">
        {/* CENTER USER / DISTRICT BEACON */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="absolute -inset-3 bg-red-600/30 rounded-full blur-lg animate-pulse" />
          <div
            className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-tr from-red-600 to-red-500 shadow-xl shadow-red-600/40 flex items-center justify-center border-2 border-white/90 transform transition-transform duration-500 cursor-pointer"
            style={{ transform: `scale(${pulseScale})` }}
          >
            {activeTrip ? (
              <Bike className="w-7 h-7 text-white animate-bounce" />
            ) : isSearching ? (
              <Sparkles className="w-7 h-7 text-white animate-spin" />
            ) : (
              <Radio className="w-7 h-7 text-white animate-pulse" />
            )}
          </div>
          <span className="mt-1 px-2.5 py-0.5 bg-neutral-900/95 text-neutral-200 text-[10px] font-black uppercase tracking-wider rounded-full border border-neutral-700 shadow-sm">
            {origin ? 'Você Está Aqui 📍' : `${selectedDistrict} 🇲🇿`}
          </span>
        </div>

        {/* FLOATING MOTORCYCLE ICONS 🛵 WITH NAMES ON TOP */}
        {displayDrivers.length > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {displayDrivers.map((driver, index) => {
              const fullName = driver.fullName || (driver as any).name || 'Condutor';
              const firstName = fullName.split(' ')[0] || 'Motorista';
              const isOnline = driver.isOnline;
              const bikeBrand = driver.bikeBrand ? `${driver.bikeBrand} ${driver.bikeModel || ''}` : 'Mota';
              const plate = driver.plateNumber || '';
              const hasRating =
                (driver.totalRatingsCount || driver.totalRatings || 0) > 0 &&
                driver.rating !== undefined;

              // Orbital positioning math for natural, cute floating arrangement
              const total = displayDrivers.length;
              const angleDeg = (index * (360 / Math.max(1, total))) - 70;
              const angleRad = (angleDeg * Math.PI) / 180;

              // Generous radius so motos float around the center beacon without colliding
              const ringRadius = total === 1 ? 120 : total === 2 ? 130 : 110 + (index % 3) * 35;
              const defaultX = Math.round(Math.cos(angleRad) * ringRadius);
              const defaultY = Math.round(Math.sin(angleRad) * ringRadius);
              const driverId = driver.id || String(index);
              const currentPos = driverOffsets[driverId] || { x: defaultX, y: defaultY };

              const animClass = `animate-float-moto-${index % 5}`;

              return (
                <div
                  key={driverId}
                  style={{
                    transform: `translate(${currentPos.x}px, ${currentPos.y}px)`,
                    touchAction: 'none',
                  }}
                  className="absolute pointer-events-auto z-30 flex flex-col items-center cursor-grab active:cursor-grabbing select-none group"
                  onPointerDown={(e) => handlePointerDown(e, driverId, defaultX, defaultY)}
                  onPointerMove={(e) => handlePointerMove(e, driverId)}
                  onPointerUp={(e) => handlePointerUp(e, driverId)}
                  onClick={() => handleDriverClick(driver)}
                >
                  <div className={`flex flex-col items-center ${animClass}`}>
                    {/* 1. FLOATING NAME BADGE ON TOP 🏷️ (Nome em cima) */}
                    <div className="px-2.5 py-1 bg-neutral-900/95 hover:bg-neutral-800 text-white rounded-full shadow-xl border border-neutral-700 flex items-center gap-1.5 mb-1 transform group-hover:scale-110 group-hover:-translate-y-1 transition-all">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="text-xs font-black truncate max-w-[95px] sm:max-w-[120px] text-white">
                        {firstName}
                      </span>
                      {hasRating && (
                        <span className="text-[10px] font-black text-amber-400 font-mono flex items-center gap-0.5">
                          <span>★</span>
                          <span>{driver.rating?.toFixed(1)}</span>
                        </span>
                      )}
                    </div>

                    {/* 2. FLOATING MOTORCYCLE ICON 🛵 (Cute & Iconic) */}
                    <div className="relative group-hover:scale-125 transition-transform duration-300">
                      {/* Glow ring */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-2xl blur-xs opacity-70 group-hover:opacity-100 transition-opacity" />

                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-600/40 flex items-center justify-center border-2 border-white/90">
                        <span className="text-2xl sm:text-3xl filter drop-shadow-sm select-none" role="img" aria-label="mototaxi">
                          🛵
                        </span>
                        {/* Little pulsing online badge */}
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-neutral-900"></span>
                        </span>
                      </div>
                    </div>

                    {/* 3. FLOATING SHADOW BENEATH MOTORCYCLE */}
                    <div
                      className="w-8 h-2 bg-black/60 rounded-full blur-[1.5px] mt-1"
                      style={{ animation: 'floatShadow 3.2s ease-in-out infinite' }}
                    />

                    {/* 4. OPTIONAL COMPACT BIKE MODEL / PLATE PILL */}
                    <div className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-neutral-700 shadow-md pointer-events-none">
                      {bikeBrand} {plate ? `• ${plate}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-3xl p-5 text-center space-y-2 shadow-2xl max-w-sm animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl border border-amber-500/30">
              🛵
            </div>
            <p className="text-xs font-black text-white">
              Nenhum motorista online em {selectedDistrict}
            </p>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              As motos flutuantes 🛵 aparecerão aqui em tempo real assim que os motoristas cadastrados entrarem online.
            </p>
          </div>
        )}
      </div>

      {/* 5. BOTTOM SECTION: JOURNEY PATH & POPULAR DESTINATIONS */}
      <div className="relative z-20 w-full max-w-md space-y-2 pb-2">
        {/* JOURNEY PATH SUMMARY IF SET */}
        {origin && destination && (
          <div className="w-full bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl p-3 shadow-xl space-y-1.5 animate-fade-in text-white">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-300 border-b border-neutral-800 pb-1.5">
              <span className="flex items-center gap-1.5 text-emerald-400 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> De: {originShort || 'Ponto de Partida'}
              </span>
              <span className="font-mono text-emerald-400 font-black shrink-0 text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/80">
                Partida
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-neutral-100">
              <span className="flex items-center gap-1.5 text-red-400 truncate">
                <Compass className="w-3.5 h-3.5 shrink-0" /> Para: {destShort || 'Destino'}
              </span>
              <span className="text-[10px] font-mono bg-red-950/60 text-red-400 px-2 py-0.5 rounded-full border border-red-800/80 shrink-0">
                Destino
              </span>
            </div>
          </div>
        )}

        {/* QUICK SUGGESTED DESTINATIONS (When nothing is typed yet) */}
        {!origin && !destination && !isSearching && !activeTrip && (
          <div className="w-full text-center space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center justify-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              Destinos Rápidos em {selectedDistrict}:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                { name: 'Mercado Central', lat: baseLat + 0.015, lng: baseLng + 0.015 },
                { name: 'Terminal / Paragem', lat: baseLat - 0.012, lng: baseLng - 0.012 },
                { name: 'Hospital Distrital', lat: baseLat + 0.02, lng: baseLng + 0.008 },
                { name: 'Praça Principal', lat: baseLat - 0.018, lng: baseLng + 0.018 },
              ].map((spot) => (
                <button
                  key={spot.name}
                  type="button"
                  onClick={() => onSimulateSelectDestination?.(spot.name, spot.lat, spot.lng)}
                  className="px-2.5 py-1 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 rounded-xl text-xs font-bold border border-neutral-700 shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <MapPin className="w-3 h-3 text-red-500" />
                  <span>{spot.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. INTERACTIVE MODAL / POPOVER FOR CLICKED FLOATING MOTORCYCLE 🛵 */}
      {selectedDriverPopup && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedDriverPopup(null)}
        >
          <div
            className="w-full max-w-sm bg-neutral-900 text-white rounded-[32px] p-5 shadow-2xl border border-neutral-800 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center text-3xl shadow-lg border-2 border-white/20 shrink-0">
                  🛵
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-base text-white">
                      {selectedDriverPopup.fullName}
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-red-400">
                    Mototáxi em {selectedDriverPopup.district || selectedDistrict}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriverPopup(null)}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vehicle & Rating details */}
            <div className="bg-neutral-800/80 rounded-2xl p-3.5 space-y-2 border border-neutral-700/80">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-neutral-400">Mota:</span>
                <span className="text-white font-extrabold">
                  {selectedDriverPopup.bikeBrand} {selectedDriverPopup.bikeModel || ''}
                </span>
              </div>
              {selectedDriverPopup.plateNumber && (
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-neutral-400">Matrícula:</span>
                  <span className="font-mono bg-neutral-700 px-2 py-0.5 rounded text-[11px] font-black text-white">
                    {selectedDriverPopup.plateNumber}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-neutral-400">Classificação:</span>
                <span className="text-amber-400 font-extrabold flex items-center gap-1">
                  <span>★</span>
                  <span>
                    {(selectedDriverPopup.totalRatingsCount || selectedDriverPopup.totalRatings || 0) > 0 &&
                    selectedDriverPopup.rating !== undefined
                      ? selectedDriverPopup.rating.toFixed(1)
                      : 'Novo Motorista'}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-neutral-400">Estado:</span>
                <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Pronto e Disponível</span>
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div>
              {origin && destination ? (
                <button
                  type="button"
                  onClick={() => {
                    const d = selectedDriverPopup;
                    setSelectedDriverPopup(null);
                    onSelectDriver?.(d);
                  }}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-red-600/40 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-lg">🛵</span>
                  <span>PEDIR ESTA MOTOTÁXI AGORA</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDriverPopup(null);
                      onPromptOrigin?.();
                    }}
                    className="w-full py-3.5 bg-neutral-800 hover:bg-neutral-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-neutral-700"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Definir Ponto de Partida e Destino</span>
                  </button>
                  <p className="text-[10px] text-center text-neutral-400">
                    Escreva onde você está e para onde vai para chamar {selectedDriverPopup.fullName.split(' ')[0]}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

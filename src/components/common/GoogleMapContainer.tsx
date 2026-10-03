import React, { useState, useEffect, useRef } from 'react';
import { DriverProfile, LocationPoint } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import {
  Bike,
  Navigation,
  MapPin,
  Sparkles,
  Compass,
  Zap,
  Radio,
  Plus,
  Minus,
  Layers,
  Shield,
  Clock,
  Gauge,
  ArrowRight,
} from 'lucide-react';

interface InteractiveRadarDisplayProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  userLocation?: { lat: number; lng: number } | null;
  drivers?: DriverProfile[];
  origin?: LocationPoint | null;
  destination?: LocationPoint | null;
  driverLocation?: { lat: number; lng: number } | null;
  onMapClick?: (e: { lat: number; lng: number }) => void;
  onRouteCalculated?: (distanceKm: number, durationMin: number) => void;
  onStepsCalculated?: (steps: Array<{ instruction: string; distance: string }>) => void;
  className?: string;
  showRouteBadge?: boolean;
}

export const InteractiveRadarDisplay: React.FC<InteractiveRadarDisplayProps> = ({
  center = { lat: -23.3283, lng: 35.3789 },
  zoom = 14,
  userLocation,
  drivers = [],
  origin,
  destination,
  driverLocation,
  onMapClick,
  onRouteCalculated,
  className = 'w-full h-full relative',
}) => {
  const { theme, toggleTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);
  const [radarZoom, setRadarZoom] = useState<number>(zoom);
  const [displayMode, setDisplayMode] = useState<'radar' | 'futuristic'>('radar');

  // Trigger route calculation simulation if origin & destination exist
  useEffect(() => {
    if (origin && destination && onRouteCalculated) {
      const dLat = (destination.lat - origin.lat) * 111;
      const dLng = (destination.lng - origin.lng) * 111 * Math.cos((origin.lat * Math.PI) / 180);
      const km = Math.max(0.8, Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10);
      const min = Math.ceil(km * 2.8);
      onRouteCalculated(km, min);
    }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, onRouteCalculated]);

  // High-performance canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 600);

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // 1. Grid pattern
      ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
      ctx.lineWidth = 1;
      const step = 45;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Concentric Radar Rings
      angle += 0.02;
      const ringColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(220, 38, 38, 0.2)';

      [80, 160, 240, 320].forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = idx === 1 ? 2 : 1;
        if (idx === 2) ctx.setLineDash([6, 6]);
        else ctx.setLineDash([]);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 3. Radar Sweeping Beam
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 320, angle, angle + 0.6);
      ctx.lineTo(cx, cy);
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 320);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // 4. Route Polyline (if origin and destination exist)
      if (origin && destination) {
        const startX = cx - 110;
        const startY = cy + 70;
        const endX = cx + 130;
        const endY = cy - 90;

        // Glow line
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cx + 20, cy + 30, endX, endY);
        ctx.stroke();

        // Core Line
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cx + 20, cy + 30, endX, endY);
        ctx.stroke();

        // Origin Dot
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(startX, startY, 7, 0, Math.PI * 2);
        ctx.fill();

        // Destination Dot
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(endX, endY, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [theme, origin, destination]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!onMapClick) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert click offsets to simulated lat/lng around current center
    const latOffset = (y - rect.height / 2) * -0.0001;
    const lngOffset = (x - rect.width / 2) * 0.0001;
    onMapClick({
      lat: Number((center.lat + latOffset).toFixed(6)),
      lng: Number((center.lng + lngOffset).toFixed(6)),
    });
  };

  return (
    <div
      className={`relative w-full h-full min-h-[420px] bg-gradient-to-br ${
        theme === 'dark'
          ? 'from-neutral-950 via-neutral-900 to-black text-white'
          : 'from-neutral-100 via-white to-zinc-200 text-neutral-900'
      } overflow-hidden flex items-center justify-center select-none font-sans ${className}`}
    >
      {/* 1. ANIMATED CANVAS RADAR */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="absolute inset-0 w-full h-full cursor-crosshair z-0"
      />

      {/* 2. TOP FLOATING BRAND & PILOT STATUS HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-2">
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 bg-neutral-900/90 dark:bg-neutral-900/90 text-white rounded-2xl shadow-2xl border border-red-500/40 backdrop-blur-md text-xs font-black tracking-wider uppercase">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span>RADAR TELEMOTO+ 🇲🇿</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {/* Active Drivers Found Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md rounded-2xl text-xs font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{drivers.length > 0 ? `${drivers.length} Pilotos Ativos` : 'Radar Ativo'}</span>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 bg-neutral-900/90 text-white rounded-2xl shadow-xl border border-neutral-700 backdrop-blur-md hover:bg-neutral-800 transition-transform active:scale-95 cursor-pointer text-xs font-bold"
            title="Mudar Tema"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* 3. CENTER ORBITING MOTORCYCLE DRIVERS */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        {/* Central User Location Node */}
        <div className="relative flex flex-col items-center">
          <div className="absolute -inset-4 bg-red-500/30 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-tr from-red-600 to-red-500 shadow-2xl shadow-red-600/40 flex items-center justify-center border-2 border-white">
            <Bike className="w-8 h-8 text-white animate-bounce" />
          </div>
          <span className="mt-2 px-2.5 py-1 bg-neutral-900/90 text-white text-[10px] font-black uppercase tracking-wider rounded-xl border border-red-500/30 shadow-md">
            Você Está Aqui 📍
          </span>
        </div>

        {/* Dynamic Simulated Active Drivers Orbiting on Radar */}
        {drivers.length > 0 ? (
          drivers.slice(0, 5).map((driver, index) => {
            const offsets = [
              { x: -130, y: -70 },
              { x: 140, y: -90 },
              { x: -110, y: 110 },
              { x: 120, y: 80 },
              { x: 0, y: -150 },
            ];
            const offset = offsets[index % offsets.length];
            return (
              <div
                key={driver.id || index}
                style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
                className="absolute pointer-events-auto cursor-pointer group"
                onClick={() => setSelectedDriver(driver)}
              >
                <div className="relative flex flex-col items-center">
                  <div className="w-9 h-9 rounded-2xl bg-neutral-900 border-2 border-red-500 shadow-xl flex items-center justify-center text-white text-xs hover:scale-110 transition-transform">
                    🏍️
                  </div>
                  <div className="mt-1 bg-neutral-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap border border-neutral-700 shadow-md group-hover:border-red-500 transition-colors">
                    {driver.fullName?.split(' ')[0] || 'Piloto'} • ⭐ {driver.rating?.toFixed(1) || '5.0'}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* Default Nearby Drivers Display */
          <>
            <div
              style={{ transform: 'translate(-120px, -80px)' }}
              className="absolute pointer-events-auto cursor-pointer group"
            >
              <div className="relative flex flex-col items-center">
                <div className="w-9 h-9 rounded-2xl bg-neutral-900 border-2 border-red-500 shadow-xl flex items-center justify-center text-white text-xs">
                  🏍️
                </div>
                <div className="mt-1 bg-neutral-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap border border-neutral-700 shadow-md">
                  Afonso • 350m
                </div>
              </div>
            </div>

            <div
              style={{ transform: 'translate(130px, 90px)' }}
              className="absolute pointer-events-auto cursor-pointer group"
            >
              <div className="relative flex flex-col items-center">
                <div className="w-9 h-9 rounded-2xl bg-neutral-900 border-2 border-red-500 shadow-xl flex items-center justify-center text-white text-xs">
                  🏍️
                </div>
                <div className="mt-1 bg-neutral-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap border border-neutral-700 shadow-md">
                  Mateus • 800m
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. ROUTE INFO OVERLAY CARD (When origin & destination are selected) */}
      {origin && destination && (
        <div className="absolute bottom-16 left-4 right-4 sm:left-auto sm:right-4 z-20 pointer-events-auto bg-neutral-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-red-500/40 max-w-sm backdrop-blur-xl animate-slide-up">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Rota Calculada pelo Radar
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md">
              Trânsito Livre 🟢
            </span>
          </div>

          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[11px]">De:</span>
              <span className="font-bold truncate max-w-[180px]">{origin.address}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[11px]">Para:</span>
              <span className="font-bold text-red-400 truncate max-w-[180px]">{destination.address}</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. INTERACTIVE RADAR CONTROL BUTTONS */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRadarZoom((z) => Math.min(z + 1, 18))}
          className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xl border border-neutral-800 hover:bg-neutral-800 active:scale-95 transition-transform cursor-pointer text-xs font-bold"
          title="Aproximar Radar"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setRadarZoom((z) => Math.max(z - 1, 8))}
          className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xl border border-neutral-800 hover:bg-neutral-800 active:scale-95 transition-transform cursor-pointer text-xs font-bold"
          title="Afastar Radar"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (onMapClick) {
              onMapClick({ lat: center.lat, lng: center.lng });
            }
          }}
          className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-xl active:scale-95 transition-transform cursor-pointer text-xs font-black uppercase tracking-wider"
          title="Selecionar Local"
        >
          <MapPin className="w-4 h-4" />
          <span>Escolher Local</span>
        </button>
      </div>
    </div>
  );
};

// Export aliases so any imports of GoogleMapContainer or OpenSourceMapContainer work flawlessly
export const GoogleMapContainer = InteractiveRadarDisplay;
export const OpenSourceMapContainer = InteractiveRadarDisplay;

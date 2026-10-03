import React, { useState } from 'react';
import { DriverProfile } from '../../types';
import {
  Bike,
  Star,
  CheckCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  MapPin,
  X,
  UserCheck,
  Award,
  Sparkles,
} from 'lucide-react';

interface DriverSelectionCarouselProps {
  drivers: DriverProfile[];
  onSelectDriver: (driver: DriverProfile) => void;
  onSelectNextAvailable: () => void;
  loading?: boolean;
}

export const DriverSelectionCarousel: React.FC<DriverSelectionCarouselProps> = ({
  drivers,
  onSelectDriver,
  onSelectNextAvailable,
  loading = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedDriverModal, setSelectedDriverModal] = useState<DriverProfile | null>(null);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : drivers.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < drivers.length - 1 ? prev + 1 : 0));
  };

  const currentDriver = drivers[currentIndex];

  if (drivers.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 font-bold text-xs text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
          <Bike className="w-4 h-4 text-red-600" />
          <span>MOTORISTAS NA ÁREA</span>
        </div>
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl text-center space-y-2 border border-neutral-100 dark:border-neutral-800">
          <Info className="w-6 h-6 text-neutral-400 mx-auto" />
          <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
            Nenhum motorista cadastrado disponível nesta região no momento.
          </p>
          <button
            type="button"
            onClick={onSelectNextAvailable}
            disabled={loading}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            SOLICITAR O PRÓXIMO DISPONÍVEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-2xl">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <span>ESCOLHA O SEU MOTORISTA</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                {drivers.length} no Distrito
              </span>
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Deslize para ver a foto da moto, perfil e avaliação
            </p>
          </div>
        </div>

        {/* Navigation Arrows */}
        {drivers.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white rounded-xl transition-colors cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-neutral-500 px-1">
              {currentIndex + 1}/{drivers.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white rounded-xl transition-colors cursor-pointer"
              title="Seguinte"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Active Driver Card Slider */}
      {currentDriver && (
        <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 rounded-2xl p-4 space-y-3 relative overflow-hidden transition-all">
          {/* Driver Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-700 border-2 border-red-500 shrink-0 shadow-sm">
                {currentDriver.photoUrl ? (
                  <img
                    src={currentDriver.photoUrl}
                    alt={currentDriver.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-xl text-neutral-500">
                    {currentDriver.fullName?.[0] || 'M'}
                  </div>
                )}
                {currentDriver.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                )}
              </div>

              <div>
                <h4 className="font-black text-sm text-neutral-900 dark:text-white leading-tight">
                  {currentDriver.fullName}
                </h4>
                <div className="flex items-center gap-2 mt-0.5 text-xs">
                  <span className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {(currentDriver.totalRatingsCount || currentDriver.totalRatings || 0) > 0 && currentDriver.rating !== undefined
                      ? currentDriver.rating.toFixed(1)
                      : 'Novo'}
                  </span>
                  <span className="text-neutral-400">•</span>
                  <span className="text-neutral-600 dark:text-neutral-300 font-semibold text-[11px]">
                    {currentDriver.totalRides || 0} corridas
                  </span>
                </div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-500" />
                  <span>
                    {(currentDriver as any).distance && (currentDriver as any).distance < 80
                      ? `${(currentDriver as any).distance} km de distância`
                      : 'Próximo de si'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDriverModal(currentDriver)}
              className="text-[10px] text-red-600 dark:text-red-400 font-bold hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Ver Detalhes</span>
            </button>
          </div>

          {/* Motorcycle Showcase Section */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Bike className="w-3.5 h-3.5 text-red-600" />
                MOTO DO MOTORISTA
              </span>
              <span className="text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-700 dark:text-neutral-300">
                {currentDriver.plateNumber || 'M-00-00-AA'}
              </span>
            </div>

            {/* Bike Photo Banner or Vehicle Specification */}
            {currentDriver.bikePhotoUrl ? (
              <div className="relative h-28 w-full rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 group cursor-pointer" onClick={() => setSelectedDriverModal(currentDriver)}>
                <img
                  src={currentDriver.bikePhotoUrl}
                  alt={`Moto de ${currentDriver.fullName}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2.5">
                  <div className="text-white text-xs font-bold leading-tight">
                    <span>{currentDriver.bikeBrand || 'TVS'} {currentDriver.bikeModel || 'HLX 150'}</span>
                    <span className="text-[10px] font-normal text-neutral-300 block">Cor: {currentDriver.bikeColor || 'Preto'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white">
                    {currentDriver.bikeBrand || 'TVS'} {currentDriver.bikeModel || 'HLX 150'}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Cor: {currentDriver.bikeColor || 'Vermelho / Preto'}
                  </p>
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-950 text-red-600 rounded-xl">
                  <Bike className="w-6 h-6" />
                </div>
              </div>
            )}

            {/* Driver Bio / Description */}
            {currentDriver.bio ? (
              <p className="text-xs text-neutral-600 dark:text-neutral-300 italic line-clamp-2 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg border border-neutral-100 dark:border-neutral-800">
                "{currentDriver.bio}"
              </p>
            ) : (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic">
                "Moto-taxista verificado pela TeleMoto+, focado em chegar a horas e com segurança."
              </p>
            )}

            {/* Features Row */}
            <div className="flex items-center gap-3 pt-1 text-[11px] text-neutral-600 dark:text-neutral-300 font-medium">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Viagem Segura</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Documentos Validados</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSelectDriver(currentDriver)}
              disabled={loading}
              className={`w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-transform flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}`}
            >
              <Sparkles className="w-4 h-4 fill-current text-amber-300" />
              <span>{loading ? 'A processar...' : 'SOLICITAR ESTE MOTORISTA'}</span>
            </button>

            <button
              type="button"
              onClick={onSelectNextAvailable}
              disabled={loading}
              className={`w-full py-3 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {loading ? 'Aguarde...' : 'PRÓXIMO MAIS PERTO'}
            </button>
          </div>
        </div>
      )}

      {/* Driver Full Profile & Motorcycle Modal */}
      {selectedDriverModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedDriverModal(null)}
              className="absolute top-4 right-4 p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-20 h-20 mx-auto rounded-3xl overflow-hidden border-4 border-red-500 shadow-lg bg-neutral-100">
                {selectedDriverModal.photoUrl ? (
                  <img
                    src={selectedDriverModal.photoUrl}
                    alt={selectedDriverModal.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-2xl text-neutral-500">
                    {selectedDriverModal.fullName?.[0]}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                  {selectedDriverModal.fullName}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Moto-taxista Verificado TeleMoto+
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span>{selectedDriverModal.rating ? selectedDriverModal.rating.toFixed(1) : '5.0'} ({selectedDriverModal.totalRides || 0} Viagens)</span>
              </div>
            </div>

            {/* Motorcycle Image & Tech Spec */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                Foto e Detalhes da Moto
              </h4>
              {selectedDriverModal.bikePhotoUrl ? (
                <div className="rounded-2xl overflow-hidden border-2 border-neutral-200 dark:border-neutral-700 h-44 w-full">
                  <img
                    src={selectedDriverModal.bikePhotoUrl}
                    alt="Moto"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl text-center space-y-1">
                  <Bike className="w-8 h-8 text-neutral-400 mx-auto" />
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    {selectedDriverModal.bikeBrand} {selectedDriverModal.bikeModel}
                  </p>
                </div>
              )}

              <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Marca & Modelo:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{selectedDriverModal.bikeBrand || 'TVS'} {selectedDriverModal.bikeModel || 'HLX 150'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Cor da Moto:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{selectedDriverModal.bikeColor || 'Preto'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Matrícula:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">{selectedDriverModal.plateNumber || 'M-00-00-AA'}</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            {selectedDriverModal.bio && (
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                  Apresentação Pessoal
                </h4>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 italic">
                  "{selectedDriverModal.bio}"
                </p>
              </div>
            )}

            {/* Direct Selection Button */}
            <button
              type="button"
              onClick={() => {
                const drv = selectedDriverModal;
                setSelectedDriverModal(null);
                onSelectDriver(drv);
              }}
              disabled={loading}
              className={`w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-transform flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}`}
            >
              <Sparkles className="w-4 h-4 fill-current text-amber-300" />
              <span>{loading ? 'A PROCESSAR...' : `CONFIRMAR E SOLICITAR ${selectedDriverModal.fullName?.toUpperCase()}`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

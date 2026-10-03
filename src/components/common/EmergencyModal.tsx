import React, { useState } from 'react';
import { AlertTriangle, Phone, Share2, Shield, X, Check, Copy, Radio, CheckCircle2 } from 'lucide-react';
import { Trip } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { notifySOSAlert } from '../../services/notificationService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTrip?: Trip | null;
  currentLat?: number;
  currentLng?: number;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  activeTrip,
  currentLat,
  currentLng,
}) => {
  const { user, userProfile, role } = useAuth();
  const [copied, setCopied] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);

  if (!isOpen) return null;

  const lat = currentLat || activeTrip?.origin?.lat || -25.968;
  const lng = currentLng || activeTrip?.origin?.lng || 32.573;

  const shareText = `ALERTA TELEMOTO+: Preciso de assistência! ${
    activeTrip
      ? `Estou numa viagem com o motorista ${activeTrip.driverName || 'TeleMoto+'} (Moto ${activeTrip.bikeBrand || ''} ${activeTrip.bikeColor || ''}, Matrícula: ${activeTrip.plateNumber || 'N/A'}). Viagem ID: ${activeTrip.id}`
      : 'Localização atual de emergência.'
  } Coordenadas: https://maps.google.com/?q=${lat},${lng}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const shareViaWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleTriggerCentralSOS = async () => {
    if (sendingSos) return;
    setSendingSos(true);
    try {
      const sosId = `sos_${Date.now()}`;
      await notifySOSAlert({
        sosId,
        userName: userProfile?.fullName || user?.displayName || 'Utilizador TeleMoto+',
        userRole: role || 'passageiro',
        phone: userProfile?.phone || user?.phoneNumber || '+258 84 000 0000',
        lat,
        lng,
        address: activeTrip?.origin?.address || 'Moçambique',
      });

      if (activeTrip?.id) {
        await updateDoc(doc(db, 'trips', activeTrip.id), {
          emergencyAlert: true,
          updatedAt: Date.now(),
        }).catch(() => {});
      }

      setSosSent(true);
    } catch (err) {
      console.error('Error triggering SOS:', err);
    } finally {
      setSendingSos(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-[95vw] sm:max-w-md w-full p-5 sm:p-6 shadow-2xl border border-red-200 dark:border-red-900/50 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-neutral-900 dark:text-white">Centro de Emergência SOS</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">TeleMoto+ Proteção e Resposta Imediata</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Central SOS Button */}
          {sosSent ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-slide-down">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold">Alerta SOS Transmitido!</p>
                <p className="text-[11px] leading-tight text-emerald-700 dark:text-emerald-400">
                  A Central de Segurança e os Administradores receberam as tuas coordenadas com prioridade máxima.
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleTriggerCentralSOS}
              disabled={sendingSos}
              className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Radio className="w-4 h-4 animate-spin" />
              <span>{sendingSos ? 'A transmitir alerta...' : '🚨 Disparar Alerta para a Central TeleMoto+'}</span>
            </button>
          )}

          {/* Official Mozambique Emergency Numbers */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href="tel:112"
              className="flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-neutral-800 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-2xl font-bold text-xs shadow-xs hover:bg-red-100 transition-transform active:scale-95 text-center"
            >
              <Phone className="w-4 h-4" />
              <span>112 - Polícia (PRM)</span>
            </a>
            <a
              href="tel:198"
              className="flex items-center justify-center gap-2 p-3 bg-neutral-900 dark:bg-neutral-800 text-white rounded-2xl font-bold text-xs shadow-xs hover:bg-neutral-800 transition-transform active:scale-95 text-center"
            >
              <Phone className="w-4 h-4" />
              <span>198 - Bombeiros</span>
            </a>
          </div>

          {/* Active Trip Identification Card */}
          {activeTrip && (
            <div className="bg-red-50/60 dark:bg-neutral-800/80 border border-red-200 dark:border-neutral-700 rounded-2xl p-3.5 text-xs text-neutral-800 dark:text-neutral-200 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 font-bold text-red-800 dark:text-red-400">
                <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Dados da Viagem em Curso</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-neutral-700 dark:text-neutral-300 text-[11px]">
                <div>
                  <span className="text-neutral-400">Motorista: </span>
                  <span className="font-semibold">{activeTrip.driverName || 'Atribuído'}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Canal: </span>
                  <span className="font-semibold text-red-600">Central TeleMoto+ (Protegido)</span>
                </div>
                <div>
                  <span className="text-neutral-400">Moto: </span>
                  <span className="font-semibold">
                    {activeTrip.bikeBrand} {activeTrip.bikeModel}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400">Matrícula: </span>
                  <span className="font-bold text-neutral-900 dark:text-white">{activeTrip.plateNumber}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={shareViaWhatsApp}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Partilhar Situação no WhatsApp
            </button>

            <button
              onClick={copyShareLink}
              className="w-full py-2.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Copiado para a área de transferência!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Informações de Emergência
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

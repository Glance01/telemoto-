import React from 'react';
import { useCall } from '../../context/CallContext';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bike,
  User,
  ShieldCheck,
  Wifi,
} from 'lucide-react';

export const InAppAudioCallModal: React.FC = () => {
  const {
    activeCall,
    incomingCall,
    callDuration,
    isMuted,
    isSpeakerOn,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  } = useCall();

  if (!activeCall && !incomingCall) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // INCOMING CALL MODAL OVERLAY
  if (incomingCall && !activeCall) {
    return (
      <div className="fixed inset-0 z-[280] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in font-sans">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Glowing Animated Background Effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black uppercase tracking-wider animate-pulse">
              <Wifi className="w-3.5 h-3.5" />
              <span>Chamada de Voz via Internet</span>
            </div>

            {/* Avatar Pulsing Container */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-emerald-500/40 animate-pulse" />
              <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-emerald-500 text-white flex items-center justify-center text-2xl font-black shadow-xl overflow-hidden relative z-10">
                {incomingCall.callerPhoto ? (
                  <img
                    src={incomingCall.callerPhoto}
                    alt={incomingCall.callerName}
                    className="w-full h-full object-cover"
                  />
                ) : incomingCall.callerRole === 'driver' ? (
                  <Bike className="w-9 h-9 text-emerald-400" />
                ) : (
                  <User className="w-9 h-9 text-emerald-400" />
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                {incomingCall.callerName}
              </h3>
              <p className="text-xs text-neutral-400 font-medium mt-1">
                {incomingCall.callerRole === 'driver'
                  ? 'O teu Moto-Taxista está a ligar...'
                  : 'O teu Passageiro está a ligar...'}
              </p>
            </div>

            <p className="text-[11px] text-emerald-400/90 font-mono font-bold bg-emerald-950/60 p-2 rounded-xl border border-emerald-800/60">
              Chamada Grátis TeleMoto+ MZ • Sem Custo de Saldo
            </p>

            {/* Answer & Decline Controls */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={declineCall}
                className="py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneOff className="w-5 h-5" />
                <span>Recusar</span>
              </button>

              <button
                type="button"
                onClick={answerCall}
                className="py-4 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/40 transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer animate-bounce"
              >
                <Phone className="w-5 h-5 fill-neutral-950" />
                <span>Atender</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE CALL SCREEN (OUTGOING / CONNECTED / ENDING)
  if (!activeCall) return null;

  const isConnected = activeCall.status === 'connected';
  const isEnded = activeCall.status === 'ended' || activeCall.status === 'declined';

  return (
    <div className="fixed inset-0 z-[280] bg-neutral-950/95 backdrop-blur-2xl flex flex-col items-center justify-between p-6 sm:p-8 animate-fade-in text-white font-sans">
      {/* Top Header */}
      <div className="w-full max-w-sm flex items-center justify-between text-xs font-black uppercase text-neutral-400">
        <div className="flex items-center gap-2 text-emerald-400">
          <Wifi className="w-4 h-4 animate-pulse" />
          <span>TeleMoto+ Voz Net</span>
        </div>
        <div className="flex items-center gap-1 text-neutral-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Encriptado</span>
        </div>
      </div>

      {/* Main Caller Profile & Sound Waves */}
      <div className="w-full max-w-sm text-center space-y-6 my-auto">
        <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
          {/* Animated Frequency Ring */}
          {isConnected && (
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-ping" />
          )}
          {!isConnected && !isEnded && (
            <div className="absolute inset-0 rounded-full border-2 border-amber-500/40 animate-pulse" />
          )}

          <div className="w-28 h-28 rounded-full bg-neutral-900 border-4 border-emerald-500/80 shadow-2xl overflow-hidden flex items-center justify-center relative">
            {activeCall.receiverPhoto || activeCall.callerPhoto ? (
              <img
                src={activeCall.receiverPhoto || activeCall.callerPhoto}
                alt="Interlocutor"
                className="w-full h-full object-cover"
              />
            ) : (
              <Bike className="w-12 h-12 text-emerald-400" />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tight">
            {activeCall.receiverName || activeCall.callerName}
          </h2>

          <div className="text-sm font-mono font-bold">
            {isEnded ? (
              <span className="text-red-400">Chamada Terminada</span>
            ) : isConnected ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-950/80 border border-emerald-700/60 rounded-full text-emerald-400 shadow-inner">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{formatDuration(callDuration)}</span>
              </div>
            ) : (
              <span className="text-amber-400 animate-pulse">A chamar condutor/passageiro...</span>
            )}
          </div>
        </div>

        {/* Live Audio Equalizer Waveform Animation */}
        {isConnected && (
          <div className="flex items-center justify-center gap-1.5 h-8">
            {[40, 70, 30, 90, 50, 80, 40, 60, 100, 40].map((h, i) => (
              <span
                key={i}
                className="w-1.5 bg-emerald-400 rounded-full animate-pulse"
                style={{
                  height: `${isMuted ? 8 : h}%`,
                  animationDelay: `${i * 0.1}s`,
                  transition: 'height 0.2s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="w-full max-w-sm space-y-4">
        {isConnected && (
          <div className="grid grid-cols-2 gap-4 pb-2">
            <button
              type="button"
              onClick={toggleMute}
              className={`p-4 rounded-2xl border font-bold text-xs uppercase flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isMuted
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6 text-amber-400" /> : <Mic className="w-6 h-6 text-emerald-400" />}
              <span>{isMuted ? 'Microf. Desligado' : 'Microfone Ativo'}</span>
            </button>

            <button
              type="button"
              onClick={toggleSpeaker}
              className={`p-4 rounded-2xl border font-bold text-xs uppercase flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isSpeakerOn
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              {isSpeakerOn ? (
                <Volume2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <VolumeX className="w-6 h-6 text-neutral-400" />
              )}
              <span>{isSpeakerOn ? 'Altifalante On' : 'Altifalante Baixo'}</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={endCall}
          className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl shadow-red-600/40 transition-transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
        >
          <PhoneOff className="w-6 h-6" />
          <span>TERMINAR CHAMADA</span>
        </button>
      </div>
    </div>
  );
};

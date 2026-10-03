import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRide } from '../../context/RideContext';
import { useCall } from '../../context/CallContext';
import { markTripMessagesAsRead } from '../../services/rideService';
import { X, Send, User, Bike, Phone, Wifi } from 'lucide-react';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile, role } = useAuth();
  const { activeTrip, messages, sendMessage } = useRide();
  const { startCall, missedCallsCount, clearMissedCalls } = useCall();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && activeTrip && user) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      markTripMessagesAsRead(activeTrip.id, user.uid);
    }
  }, [isOpen, messages, activeTrip?.id, user?.uid]);

  if (!isOpen || !activeTrip) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(inputText.trim());
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const recipientName =
    role === 'driver'
      ? activeTrip.passengerName
      : activeTrip.driverName || 'Motorista';

  const recipientId =
    role === 'driver' ? activeTrip.passengerId : activeTrip.driverId;

  const handleStartCall = () => {
    if (!recipientId) return;
    clearMissedCalls();
    startCall({
      tripId: activeTrip.id,
      receiverId: recipientId,
      receiverName: recipientName,
      receiverRole: role === 'driver' ? 'passenger' : 'driver',
      receiverPhoto: (role === 'driver' ? activeTrip.passengerPhoto : activeTrip.driverPhoto) || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full h-[580px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="p-4 bg-neutral-900 dark:bg-neutral-950 text-white flex items-center justify-between shrink-0 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              {recipientName[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight uppercase leading-tight">{recipientName}</h3>
              <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Chat Oficial TeleMoto+</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* In-App Internet Call Button */}
            {recipientId && (
              <button
                type="button"
                onClick={handleStartCall}
                className="relative flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow-md cursor-pointer"
                title="Ligar por Internet (Grátis)"
              >
                <Phone className="w-3.5 h-3.5 fill-white" />
                <span className="hidden sm:inline">Ligar</span>
                {missedCallsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-red-600 text-white font-black text-[10px] rounded-full animate-bounce shadow-md border border-white">
                    {missedCallsCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-50 dark:bg-neutral-900/90 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 dark:text-neutral-500 p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
                <Wifi className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Sem mensagens gravadas</p>
              <p className="text-[11px] max-w-xs leading-relaxed">
                Envie uma mensagem em tempo real para combinar o ponto exato de encontro ou tirar dúvidas.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId === user?.uid;
              const timeStr = new Date(m.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-xs ${
                      isMine
                        ? 'bg-red-600 text-white rounded-br-none font-medium'
                        : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-none border border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <p className="break-words leading-relaxed">{m.text}</p>
                    <span
                      className={`block text-[9px] mt-1 font-mono text-right ${
                        isMine ? 'text-red-200' : 'text-neutral-400'
                      }`}
                    >
                      {timeStr}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form
          onSubmit={handleSend}
          className="p-3 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            placeholder="Escreva uma mensagem..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all placeholder:text-neutral-400"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="w-11 h-11 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white flex items-center justify-center shadow-md shrink-0 transition-transform active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

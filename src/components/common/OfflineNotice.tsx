import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineNotice: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      const timer = setTimeout(() => setJustReconnected(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !justReconnected) return null;

  if (justReconnected) {
    return (
      <div className="bg-emerald-600 text-white text-xs py-1.5 px-4 text-center flex items-center justify-center gap-2 sticky top-0 z-50">
        <Wifi className="w-3.5 h-3.5" />
        <span>Ligação restabelecida com sucesso.</span>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 text-white text-xs py-2 px-4 text-center flex items-center justify-center gap-2 sticky top-0 z-50 border-b border-neutral-700">
      <WifiOff className="w-4 h-4 text-amber-400" />
      <span>
        Você está offline. Operações e dados sincronizarão assim que a internet voltar.
      </span>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Share } from 'lucide-react';
import { useIsStandalone } from '../../hooks/useIsStandalone';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const isStandalone = useIsStandalone();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => isStandalone);

  useEffect(() => {
    if (isStandalone) {
      setIsInstalled(true);
      setShowPrompt(false);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Listen for beforeinstallprompt event (Android Chrome, Edge, Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt banner if user hasn't dismissed it in this session
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto bg-neutral-900 text-white rounded-2xl p-4 shadow-2xl border border-emerald-500/40 backdrop-blur-md animate-slide-up">
      <div className="flex items-start gap-3">
        {/* App Icon */}
        <img
          src="/favicon.svg"
          alt="TeleMoto+"
          className="w-12 h-12 rounded-2xl shadow-lg shrink-0 object-contain bg-white"
        />

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
              <span>Instalar TeleMoto+</span>
              <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full">
                App
              </span>
            </h4>
            <button
              onClick={handleDismiss}
              className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-neutral-300 leading-snug">
            {isIOS
              ? 'Toca no botão Partilhar e escolhe "Adicionar ao Ecrã Principal" para usar como app.'
              : 'Instala o app de mototáxi no teu telemóvel para um acesso mais rápido e sem ocupar memória.'}
          </p>

          <div className="pt-2 flex items-center gap-2">
            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full py-2 px-3 bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar Agora</span>
              </button>
            )}

            {isIOS && (
              <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400 bg-neutral-800/80 px-2.5 py-1.5 rounded-xl border border-neutral-700 w-full justify-center">
                <Share className="w-3.5 h-3.5 text-emerald-400" />
                <span>Partilhar ➔ Adicionar ao Ecrã Principal</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

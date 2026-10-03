import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  X,
  Share,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import telemotoLogo from '../../assets/images/telemoto_app_logo.png';
import { useIsStandalone } from '../../hooks/useIsStandalone';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface DownloadAppModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  forceOpen,
  onClose,
}) => {
  const isStandalone = useIsStandalone();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandalone);
  const [installing, setInstalling] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  useEffect(() => {
    if (isStandalone) {
      setIsInstalled(true);
      setIsOpen(false);
      return;
    }

    // 2. Detect OS
    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(iosDevice);

    // 3. Listen for browser PWA beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 4. Auto show compact popup at bottom on entering site
    const dismissedThisSession = sessionStorage.getItem('telemoto_download_prompt_dismissed_session');
    
    const timer = setTimeout(() => {
      if (!dismissedThisSession && !isStandalone) {
        setIsOpen(true);
      }
    }, 800);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle manual force open
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setShowIOSGuide(false);
    }
  }, [forceOpen]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide((prev) => !prev);
      return;
    }

    setInstalling(true);

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setInstallSuccess(true);
          setTimeout(() => {
            handleClose();
          }, 1800);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      // Fallback guide for Android / Chrome without window.alert
      setShowIOSGuide(true);
    }
    setInstalling(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('telemoto_download_prompt_dismissed_session', 'true');
    localStorage.setItem('telemoto_download_prompt_dismissed_at', Date.now().toString());
    if (onClose) onClose();
  };

  if (isStandalone || isInstalled) return null;
  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-xs z-40 pointer-events-none animate-slide-up"
      role="region"
      aria-label="Atalho para instalar aplicativo TeleMoto+"
    >
      <div className="pointer-events-auto bg-neutral-900/95 text-white backdrop-blur-md rounded-2xl py-2 px-3 shadow-xl border border-neutral-700/80 flex items-center justify-between gap-2.5 transition-all duration-200">
        {/* Logo & Text */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-xs border border-neutral-700 bg-black shrink-0 flex items-center justify-center">
            <img
              src={telemotoLogo}
              alt="TeleMoto+"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-black text-xs text-white tracking-tight truncate">
                Tele<span className="text-red-500">Moto+</span>
              </span>
              <span className="px-1 py-0.2 rounded text-[7px] font-black uppercase bg-red-500/20 text-red-400">
                App
              </span>
            </div>
            <p className="text-[9px] text-neutral-400 truncate leading-tight">
              {installSuccess ? 'Instalado!' : 'Instalar no ecrã'}
            </p>
          </div>
        </div>

        {/* Action Button & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!installSuccess ? (
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installing}
              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>{isIOS ? 'Instalar' : 'Baixar'}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> OK
            </span>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* IN-APP INSTALL TOOLTIP (Only shown if tapped without native prompt) */}
      {showIOSGuide && !installSuccess && (
        <div className="pointer-events-auto mt-1.5 p-2.5 bg-neutral-900/98 text-white rounded-xl border border-neutral-700 text-[10px] space-y-1 animate-fade-in shadow-xl">
          {isIOS ? (
            <p className="text-neutral-300">
              No Safari: toque em <strong>Partilhar</strong> (<Share className="w-2.5 h-2.5 inline text-blue-400 mx-0.5" />) e depois em <strong>"Adicionar ao Ecrã Principal"</strong>.
            </p>
          ) : (
            <p className="text-neutral-300">
              Toque no menu do navegador (<strong>⋮</strong>) e escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar ao ecrã inicial"</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';

/**
 * Checks if the application is currently running as an installed PWA / standalone application
 * (e.g. added to Home Screen on Android/iOS, opened via WebAPK, TWA, or standalone window).
 */
export function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Standard CSS display-mode media queries
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreenMedia = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUIMedia = window.matchMedia('(display-mode: minimal-ui)').matches;

  // 2. iOS Safari standalone property
  const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  // 3. Android TWA / WebAPK / external app wrapper detection
  const isAndroidApp = document.referrer?.includes('android-app://') || false;

  // 4. URL query parameters (when opened from shortcut or installed launcher)
  let isParamMode = false;
  try {
    const params = new URLSearchParams(window.location.search);
    isParamMode =
      params.get('mode') === 'standalone' ||
      params.get('mode') === 'pwa' ||
      params.get('source') === 'pwa' ||
      params.get('source') === 'app' ||
      params.get('standalone') === 'true' ||
      params.get('utm_source') === 'homescreen' ||
      params.get('utm_source') === 'pwa';
  } catch {
    // ignore
  }

  // 5. Stored preference if the user installed the app earlier on this device
  const isStored =
    localStorage.getItem('telemoto_is_installed_pwa') === 'true' ||
    sessionStorage.getItem('telemoto_is_installed_pwa') === 'true';

  // 6. Window controls overlay or browser app window
  const isWCO = window.matchMedia('(display-mode: window-controls-overlay)').matches;

  return (
    isStandaloneMedia ||
    isFullscreenMedia ||
    isMinimalUIMedia ||
    isIOSStandalone ||
    isAndroidApp ||
    isParamMode ||
    isStored ||
    isWCO
  );
}

/**
 * React hook that returns true when the user is running the website as an installed application.
 * All download/install banners and buttons should be hidden when this returns true.
 */
export function useIsStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState<boolean>(() => checkIsStandalone());

  useEffect(() => {
    const update = () => {
      const standalone = checkIsStandalone();
      setIsStandalone(standalone);
      if (standalone) {
        localStorage.setItem('telemoto_is_installed_pwa', 'true');
      }
    };

    update();

    const mediaQueries = [
      window.matchMedia('(display-mode: standalone)'),
      window.matchMedia('(display-mode: fullscreen)'),
      window.matchMedia('(display-mode: minimal-ui)'),
    ];

    mediaQueries.forEach((mq) => {
      try {
        mq.addEventListener('change', update);
      } catch {
        mq.addListener?.(update);
      }
    });

    const handleAppInstalled = () => {
      localStorage.setItem('telemoto_is_installed_pwa', 'true');
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQueries.forEach((mq) => {
        try {
          mq.removeEventListener('change', update);
        } catch {
          mq.removeListener?.(update);
        }
      });
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return isStandalone;
}

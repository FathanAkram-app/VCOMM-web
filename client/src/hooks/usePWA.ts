import { useEffect, useState } from 'react';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showManualPrompt, setShowManualPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                               (window.navigator as any).standalone ||
                               document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      console.log('NXZZ-VComm: PWA standalone mode:', isStandaloneMode);
    };

    checkStandalone();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('NXZZ-VComm: Service Worker registered successfully:', registration);
          // Always show manual prompt for installation guidance
          setTimeout(() => {
            if (!isStandalone) {
              setShowManualPrompt(true);
              console.log('NXZZ-VComm: Showing PWA install options');
            }
          }, 1000);
        })
        .catch((error) => {
          console.log('NXZZ-VComm: Service Worker registration failed:', error);
          // Even if SW fails, show manual prompt for iOS/other browsers
          setTimeout(() => {
            if (!isStandalone) {
              setShowManualPrompt(true);
            }
          }, 1000);
        });
    } else {
      // No service worker support, still show manual prompt
      setTimeout(() => {
        if (!isStandalone) {
          setShowManualPrompt(true);
        }
      }, 1000);
    }

    // Handle PWA install prompt (Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setShowManualPrompt(false); // Hide manual prompt if native prompt available
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('NXZZ-VComm: PWA install result:', outcome);
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return {
    isInstallable,
    showManualPrompt,
    isStandalone,
    installPWA
  };
}
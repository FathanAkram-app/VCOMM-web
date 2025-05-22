import { useEffect, useState } from 'react';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showManualPrompt, setShowManualPrompt] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('NXZZ-VComm: Service Worker registered successfully:', registration);
            // Show manual prompt after service worker is ready
            setTimeout(() => {
              // Only show manual prompt if beforeinstallprompt hasn't fired
              if (!deferredPrompt) {
                setShowManualPrompt(true);
              }
            }, 3000);
          })
          .catch((error) => {
            console.log('NXZZ-VComm: Service Worker registration failed:', error);
            // Even if SW fails, show manual prompt for iOS
            setTimeout(() => {
              setShowManualPrompt(true);
            }, 3000);
          });
      });
    } else {
      // No service worker support, show manual prompt
      setTimeout(() => {
        setShowManualPrompt(true);
      }, 3000);
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
    installPWA
  };
}
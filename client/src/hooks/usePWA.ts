import { useEffect, useState } from 'react';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showManualPrompt, setShowManualPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    console.log('NXZZ-VComm: PWA hook initializing...');
    
    // Check if already installed as PWA
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                               (window.navigator as any).standalone ||
                               document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      console.log('NXZZ-VComm: PWA standalone mode:', isStandaloneMode);
      console.log('NXZZ-VComm: User agent:', navigator.userAgent);
      console.log('NXZZ-VComm: Service Worker support:', 'serviceWorker' in navigator);
    };

    checkStandalone();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('NXZZ-VComm: Service Worker registered successfully:', registration);
          console.log('NXZZ-VComm: Service Worker state:', registration.installing, registration.waiting, registration.active);
          // Always enable manual prompt for installation guidance
          if (!isStandalone) {
            setShowManualPrompt(true);
            console.log('NXZZ-VComm: PWA install button ready');
          }
        })
        .catch((error) => {
          console.error('NXZZ-VComm: Service Worker registration failed:', error);
          console.error('NXZZ-VComm: SW Error details:', error.message, error.stack);
          // Even if SW fails, enable install button
          if (!isStandalone) {
            setShowManualPrompt(true);
          }
        });
    } else {
      // No service worker support, still enable install button
      if (!isStandalone) {
        setShowManualPrompt(true);
      }
    }

    // Handle PWA install prompt (Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('NXZZ-VComm: beforeinstallprompt event fired', e);
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setShowManualPrompt(true); // Keep manual prompt as backup
      console.log('NXZZ-VComm: PWA install prompt ready');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    try {
      if (deferredPrompt) {
        console.log('NXZZ-VComm: Triggering direct PWA installation...');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('NXZZ-VComm: PWA installation accepted');
          // Update standalone status
          setTimeout(() => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                                     (window.navigator as any).standalone ||
                                     document.referrer.includes('android-app://');
            setIsStandalone(isStandaloneMode);
          }, 1000);
        } else {
          console.log('NXZZ-VComm: PWA installation dismissed');
        }
        
        setDeferredPrompt(null);
        setIsInstallable(false);
      } else {
        // Manual installation guide for browsers that don't support beforeinstallprompt
        console.log('NXZZ-VComm: No install prompt available, showing manual guide');
        const userAgent = navigator.userAgent.toLowerCase();
        
        let instructions = '';
        if (userAgent.includes('android')) {
          instructions = 'Install aplikasi:\n\n1. Tekan menu browser (⋮)\n2. Pilih "Add to Home screen"\n3. Konfirmasi instalasi';
        } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          instructions = 'Install aplikasi:\n\n1. Tekan tombol Share (□↗)\n2. Pilih "Add to Home Screen"\n3. Konfirmasi instalasi';
        } else {
          instructions = 'Install aplikasi:\n\nCari opsi "Install" atau "Add to Home screen" di menu browser Anda.';
        }
        
        alert(instructions);
      }
    } catch (error) {
      console.error('NXZZ-VComm: PWA installation error:', error);
      alert('Terjadi kesalahan saat install aplikasi. Coba lagi nanti.');
    }
  };

  return {
    isInstallable,
    showManualPrompt,
    isStandalone,
    installPWA
  };
}
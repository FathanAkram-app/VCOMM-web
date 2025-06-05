import { useEffect, useState } from 'react';

export function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      setIsSupported(true);
      
      // Register service worker
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[SW] Service Worker registered successfully:', reg);
          setRegistration(reg);
          setIsRegistered(true);
          
          // Listen for service worker updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, refresh the page
                  console.log('[SW] New content available, refreshing...');
                  window.location.reload();
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[SW] Service Worker registration failed:', error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'answer_call':
            // Handle answer call from notification
            console.log('[SW] Answer call request from notification:', data);
            // This would trigger the call answer logic
            window.dispatchEvent(new CustomEvent('sw-answer-call', { detail: data }));
            break;
            
          case 'reject_call':
            // Handle reject call from notification  
            console.log('[SW] Reject call request from notification:', data);
            window.dispatchEvent(new CustomEvent('sw-reject-call', { detail: data }));
            break;
        }
      });
    } else {
      console.warn('[SW] Service Workers not supported in this browser');
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('[SW] Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  // Send message to service worker
  const sendMessage = (message: any) => {
    if (registration && registration.active) {
      registration.active.postMessage(message);
    }
  };

  // Register for push notifications (would need backend implementation)
  const registerForPushNotifications = async () => {
    if (!registration) {
      console.warn('[SW] Service Worker not registered');
      return false;
    }

    try {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        console.warn('[SW] Notification permission denied');
        return false;
      }

      // This would typically involve getting a push subscription
      // and sending it to your backend server
      console.log('[SW] Ready for push notifications');
      return true;
    } catch (error) {
      console.error('[SW] Failed to register for push notifications:', error);
      return false;
    }
  };

  // Show local notification
  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!registration) {
      console.warn('[SW] Service Worker not registered');
      return;
    }

    const defaultOptions: NotificationOptions = {
      badge: '/icon-192x192.png',
      icon: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      ...options
    };

    registration.showNotification(title, defaultOptions);
  };

  // Keep connection alive
  const keepAlive = () => {
    sendMessage({ type: 'KEEP_ALIVE' });
  };

  // Register for call notifications
  const registerForCalls = () => {
    sendMessage({ type: 'REGISTER_FOR_CALLS' });
  };

  // Notify call state change
  const notifyCallStateChange = (callId: string, state: string, userId: number) => {
    sendMessage({ 
      type: 'CALL_STATE_CHANGE', 
      data: { callId, state, userId } 
    });
  };

  return {
    isSupported,
    isRegistered,
    registration,
    requestNotificationPermission,
    registerForPushNotifications,
    showNotification,
    sendMessage,
    keepAlive,
    registerForCalls,
    notifyCallStateChange
  };
}
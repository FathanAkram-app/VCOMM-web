// Service Worker for NXZZ-VComm - Background Operations
const CACHE_NAME = 'nxzz-vcomm-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Event - Serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Push Event - Handle incoming call notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received:', event);
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = { title: 'NXZZ-VComm', body: event.data.text() };
    }
  }

  // Handle different types of notifications
  const { type, title, body, callId, fromUser, callType } = notificationData;
  
  let notificationOptions = {
    badge: '/icon-192x192.png',
    icon: '/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: callId || 'general',
    actions: []
  };

  if (type === 'incoming_call') {
    notificationOptions = {
      ...notificationOptions,
      title: `📞 Panggilan Masuk`,
      body: `${fromUser} sedang menelepon (${callType === 'video' ? 'Video' : 'Audio'})`,
      data: { type, callId, fromUser, callType },
      actions: [
        {
          action: 'answer',
          title: '✅ Jawab',
          icon: '/icon-192x192.png'
        },
        {
          action: 'reject',
          title: '❌ Tolak',
          icon: '/icon-192x192.png'
        }
      ]
    };
  } else {
    notificationOptions.title = title || 'NXZZ-VComm';
    notificationOptions.body = body || 'Notifikasi baru';
  }

  event.waitUntil(
    self.registration.showNotification(notificationOptions.title, notificationOptions)
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const { action, notification } = event;
  const { data } = notification;
  
  if (data && data.type === 'incoming_call') {
    const { callId, fromUser, callType } = data;
    
    if (action === 'answer') {
      // Open app and answer call
      event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
          // Check if app is already open
          for (let client of clientList) {
            if (client.url.includes('/')) {
              client.focus();
              client.postMessage({
                type: 'answer_call',
                callId,
                fromUser,
                callType
              });
              return;
            }
          }
          
          // Open new window if app is not open
          clients.openWindow('/').then((client) => {
            if (client) {
              client.postMessage({
                type: 'answer_call',
                callId,
                fromUser,
                callType
              });
            }
          });
        })
      );
    } else if (action === 'reject') {
      // Reject call via background message
      event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
          for (let client of clientList) {
            client.postMessage({
              type: 'reject_call',
              callId
            });
          }
          
          // If no client is open, we can't reject the call
          // The call will timeout naturally
        })
      );
    }
  } else {
    // General notification - open app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].focus();
        } else {
          clients.openWindow('/');
        }
      })
    );
  }
});

// Background Sync Event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background synchronization tasks
      syncData()
    );
  }
});

// Keep connection alive for calls
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'KEEP_ALIVE':
      // Respond to keep connection alive
      event.ports[0].postMessage({ type: 'KEEP_ALIVE_RESPONSE' });
      break;
      
    case 'REGISTER_FOR_CALLS':
      // Register client for call notifications
      console.log('[SW] Client registered for call notifications');
      break;
      
    case 'CALL_STATE_CHANGE':
      // Handle call state changes
      handleCallStateChange(data);
      break;
  }
});

// Background sync function
async function syncData() {
  try {
    // Sync any pending messages or call history
    console.log('[SW] Performing background sync...');
    
    // This would typically sync with your backend
    // For now, we'll just log that sync is happening
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}

// Handle call state changes
function handleCallStateChange(data) {
  const { callId, state, userId } = data;
  
  console.log(`[SW] Call ${callId} state changed to ${state} for user ${userId}`);
  
  // Could implement additional background call handling here
  // such as updating cached call history
}

// Periodic background task (experimental)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(
      syncData()
    );
  }
});

console.log('[SW] Service Worker loaded and ready');
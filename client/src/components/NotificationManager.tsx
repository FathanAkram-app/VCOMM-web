import { useEffect, useState } from 'react';
import { useNotification } from '../hooks/useNotification';

export default function NotificationManager() {
  const { notifications, removeNotification } = useNotification();
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Notifikasi sound
  useEffect(() => {
    if (notifications.length > 0 && audioEnabled) {
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    }
  }, [notifications, audioEnabled]);

  return (
    <>
      {/* Toast notifications */}
      <div className="fixed top-0 right-0 p-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div 
            key={notification.id}
            className={`max-w-sm p-4 rounded-lg shadow-lg border border-green-800
                      animate-fadeIn bg-zinc-800 text-white transition-all`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                {notification.type === 'message' && (
                  <span className="text-green-500 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                {notification.type === 'call' && (
                  <span className="text-blue-500 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </span>
                )}
                <div>
                  <h3 className="font-medium">{notification.title}</h3>
                  <p className="text-sm text-zinc-300">{notification.message}</p>
                </div>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {/* Auto-dismiss progress bar */}
            <div className="w-full bg-zinc-700 h-1 mt-2 rounded">
              <div 
                className="bg-green-500 h-1 rounded animate-shrink"
                style={{ animationDuration: '5000ms' }} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* Audio toggle (untuk testing) */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`p-2 rounded-full ${
            audioEnabled ? 'bg-green-700 text-white' : 'bg-zinc-700 text-zinc-300'
          }`}
          title={audioEnabled ? 'Matikan Suara Notifikasi' : 'Aktifkan Suara Notifikasi'}
        >
          {audioEnabled ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
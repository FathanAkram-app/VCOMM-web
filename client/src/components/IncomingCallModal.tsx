import { useState, useEffect } from 'react';

interface IncomingCallModalProps {
  callerName: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({ callerName, callType, onAccept, onReject }: IncomingCallModalProps) {
  const [ringing, setRinging] = useState(true);
  
  // Efek suara panggilan masuk
  useEffect(() => {
    // Buat elemen audio dan mainkan suara
    const audio = new Audio('/sounds/incoming_call.mp3');
    audio.loop = true;
    
    // Atur volume rendah agar tidak terlalu berisik
    audio.volume = 0.3;
    
    // Coba mainkan suara
    if (ringing) {
      const playPromise = audio.play();
      
      // Tangani kasus di mana browser memblokir autoplay
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Autoplay prevented:', error);
        });
      }
    }
    
    // Bersihkan audio saat komponen di-unmount
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [ringing]);
  
  // Hentikan ringing jika panggilan diterima/ditolak
  const handleAccept = () => {
    setRinging(false);
    onAccept();
  };
  
  const handleReject = () => {
    setRinging(false);
    onReject();
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-green-900/30 rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
        <div className="bg-zinc-800 p-4 text-center">
          <div className="h-16 w-16 bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
            {callType === 'video' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            )}
          </div>
          <h2 className="text-lg font-bold text-white">
            {callType === 'video' ? 'INCOMING VIDEO CALL' : 'INCOMING VOICE CALL'}
          </h2>
          <p className="text-green-400 text-sm font-medium mt-1">{callerName}</p>
        </div>
        
        <div className="p-5 space-y-4">
          {/* Wave animation untuk visualisasi panggilan masuk */}
          <div className="flex justify-center space-x-1 h-8 items-center">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="w-1 bg-green-500 rounded-full"
                style={{
                  height: `${16 + Math.sin(i / 2) * 16}px`,
                  animationDelay: `${i * 0.1}s`,
                  animation: 'wave 1s ease-in-out infinite alternate',
                }}
              ></div>
            ))}
          </div>
          
          <p className="text-zinc-300 text-center text-sm">
            {callType === 'video' ? 
              'Secure tactical video communication channel initiated.' : 
              'Secure tactical audio communication channel initiated.'}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800">
          <button
            onClick={handleReject}
            className="py-3 px-4 bg-red-700 hover:bg-red-600 rounded text-white font-medium flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            REJECT
          </button>
          
          <button
            onClick={handleAccept}
            className="py-3 px-4 bg-green-700 hover:bg-green-600 rounded text-white font-medium flex items-center justify-center"
          >
            {callType === 'video' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            )}
            ACCEPT
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes wave {
          0% {
            height: 8px;
          }
          100% {
            height: 24px;
          }
        }
      `}</style>
    </div>
  );
}
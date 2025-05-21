import { useState, useEffect, useRef } from 'react';

interface AudioCallProps {
  callerId?: number;
  callerName?: string;
  onEndCall: () => void;
}

/**
 * Komponen panggilan audio - versi sederhana untuk implementasi
 * 
 * Menangani komunikasi audio-only untuk meningkatkan kinerja dan keandalan
 * pada koneksi jaringan terbatas.
 */
export default function AudioCall({ callerId, callerName, onEndCall }: AudioCallProps) {
  const [muted, setMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Efek untuk menangani koneksi audio
  useEffect(() => {
    // Simulasi waktu koneksi
    const connectTimeout = setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      
      // Mainkan efek suara koneksi berhasil
      const connectSound = new Audio('/sounds/call_connected.mp3');
      connectSound.volume = 0.3;
      connectSound.play().catch(err => console.log('Audio play failed:', err));
    }, 2000);
    
    return () => {
      clearTimeout(connectTimeout);
    };
  }, []);
  
  // Efek untuk menghitung durasi panggilan
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (connected) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [connected]);
  
  // Format durasi panggilan
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Toggle mute audio
  const toggleMute = () => {
    setMuted(!muted);
    
    // Dalam implementasi lengkap, ini akan memanggil WebRTC API untuk mute/unmute
    if (audioRef.current) {
      audioRef.current.muted = !muted;
    }
  };
  
  // Akhiri panggilan
  const handleEndCall = () => {
    // Mainkan efek suara akhir panggilan
    const disconnectSound = new Audio('/sounds/call_ended.mp3');
    disconnectSound.volume = 0.3;
    disconnectSound.play().catch(err => console.log('Audio play failed:', err));
    
    // Tunda sedikit untuk memungkinkan efek suara diputar
    setTimeout(() => {
      onEndCall();
    }, 500);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <div className="bg-zinc-900 border border-green-900/30 rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-800 p-4 text-center">
          <h2 className="text-lg font-bold text-white mb-1">SECURE VOICE CHANNEL</h2>
          <div className="flex items-center justify-center text-green-500 text-sm animate-pulse">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            ENCRYPTED CONNECTION
          </div>
        </div>
        
        {/* Caller Info */}
        <div className="p-6 text-center">
          {connecting ? (
            <div className="my-6">
              <div className="w-20 h-20 rounded-full bg-zinc-800 mx-auto flex items-center justify-center animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <p className="text-white mt-4">ESTABLISHING SECURE CONNECTION...</p>
              <p className="text-zinc-400 text-sm mt-2">ENCRYPTING AUDIO CHANNEL</p>
            </div>
          ) : (
            <>
              <div className="w-24 h-24 rounded-full bg-green-900/20 border border-green-900/30 mx-auto flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">{callerName || "COMMAND"}</h3>
              <p className="text-green-400 font-medium mt-1">CALL CONNECTED</p>
              
              {/* Audio Visualizer */}
              <div className="flex justify-center my-4 h-12 items-end space-x-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <div
                    key={i}
                    className="w-1 bg-green-500 rounded-full"
                    style={{
                      height: `${4 + Math.random() * 24}px`,
                      opacity: muted ? 0.3 : 1,
                      animationDelay: `${i * 0.1}s`,
                      animation: muted ? 'none' : 'soundwave 1s ease-in-out infinite alternate',
                    }}
                  ></div>
                ))}
              </div>
              
              <p className="text-green-400 font-mono mt-2">{formatDuration(callDuration)}</p>
              
              <div className="mt-2 text-zinc-500 text-xs flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                AES-256 ENCRYPTION
              </div>
            </>
          )}
        </div>
        
        {/* Audio element - tidak terlihat tapi digunakan untuk menerima audio */}
        <audio ref={audioRef} autoPlay />
        
        {/* Call Controls */}
        <div className="p-4 bg-zinc-800 flex justify-center space-x-4">
          <button 
            onClick={toggleMute}
            className={`p-4 rounded-full ${muted ? 'bg-red-700' : 'bg-zinc-700'}`} 
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          
          <button 
            onClick={handleEndCall}
            className="p-4 bg-red-700 hover:bg-red-600 rounded-full" 
            title="End call"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
          
          <button 
            className="p-4 bg-zinc-700 rounded-full" 
            title="Speaker"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes soundwave {
          0% {
            height: 4px;
          }
          100% {
            height: 24px;
          }
        }
      `}</style>
    </div>
  );
}
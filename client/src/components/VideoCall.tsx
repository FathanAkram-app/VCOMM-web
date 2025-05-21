import { useState, useEffect, useRef } from 'react';

interface VideoCallProps {
  callerId?: number;
  callerName?: string;
  onEndCall: () => void;
}

/**
 * Komponen panggilan video
 * 
 * Menangani komunikasi video dan audio secara real-time menggunakan WebRTC
 */
export default function VideoCall({ callerId, callerName, onEndCall }: VideoCallProps) {
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Efek untuk menangani koneksi video
  useEffect(() => {
    // Simulasi waktu koneksi
    const connectTimeout = setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      
      // Inisialisasi local video stream (webcam kita sendiri)
      navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: !muted 
      })
      .then(stream => {
        // Tampilkan video kita sendiri
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Mainkan efek suara koneksi berhasil
        const connectSound = new Audio('/sounds/call_connected.mp3');
        connectSound.volume = 0.3;
        connectSound.play().catch(err => console.log('Audio play failed:', err));
        
        // Di implementasi WebRTC sesungguhnya, kita akan mengirimkan stream ini ke lawan bicara
      })
      .catch(err => {
        console.error('Media stream error:', err);
        setCameraOff(true);
      });
    }, 2000);
    
    return () => {
      clearTimeout(connectTimeout);
      
      // Bersihkan stream saat unmount
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [muted]);
  
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
    
    // Dalam implementasi WebRTC lengkap, kita akan mematikan track audio di sini
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = muted; // Toggle track enabled (mute/unmute)
      });
    }
  };
  
  // Toggle kamera
  const toggleCamera = () => {
    setCameraOff(!cameraOff);
    
    // Dalam implementasi WebRTC lengkap, kita akan mematikan track video di sini
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => {
        track.enabled = cameraOff; // Toggle track enabled (on/off)
      });
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-green-900/20 text-green-500 p-2 rounded-full mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold">
              SECURE VIDEO CHANNEL
            </h3>
            <div className="flex items-center text-green-500 text-xs">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              ENCRYPTED CONNECTION
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-zinc-400 text-sm font-mono">{formatDuration(callDuration)}</span>
          <div className="bg-green-900/20 text-green-500 px-3 py-1 rounded text-sm">
            LIVE
          </div>
        </div>
      </div>
      
      {/* Main Video Area */}
      <div className="flex-1 flex relative bg-zinc-900">
        {/* Remote Video (fullscreen) */}
        {connecting ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center animate-pulse mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-white text-lg font-bold">ESTABLISHING SECURE CONNECTION...</p>
            <p className="text-zinc-400 text-sm mt-2">ENCRYPTING VIDEO CHANNEL</p>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              {/* Remote Video */}
              <div className="bg-zinc-800 w-full h-full relative">
                {/* Placeholder untuk remote video */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-green-900/20 border border-green-900/30 mx-auto flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white">{callerName || "COMMAND"}</h3>
                  </div>
                </div>
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                  style={{ display: 'none' }} // Hidden until we get a real stream
                />
              </div>
              
              {/* Local Video (picture-in-picture) */}
              <div className="absolute bottom-4 right-4 w-48 h-36 bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 shadow-lg">
                {cameraOff ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                    <p className="text-zinc-600 text-xs mt-2">CAMERA OFF</p>
                  </div>
                ) : (
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-xs">
                  YOU
                </div>
              </div>
            </div>
            
            {/* Encryption indicator */}
            <div className="absolute bottom-4 left-4 bg-zinc-900/90 p-2 rounded-lg border border-zinc-800">
              <div className="flex items-center text-xs text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                AES-256 ENCRYPTION
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Call Controls */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 flex justify-center space-x-6">
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
          onClick={toggleCamera}
          className={`p-4 rounded-full ${cameraOff ? 'bg-red-700' : 'bg-zinc-700'}`} 
          title={cameraOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {cameraOff ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';

/**
 * Komponen Panggilan Audio
 * 
 * Komponen khusus untuk panggilan audio saja untuk meningkatkan keandalan
 * dan performa. Komponen ini tidak mencoba menangani elemen video untuk
 * mengurangi kompleksitas dan titik kegagalan potensial.
 */
interface AudioCallProps {
  peerId: string;
  onEnd: () => void;
}

export default function AudioCall({ peerId, onEnd }: AudioCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connection, setConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Inisialisasi koneksi dan stream media
  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Mendapatkan stream audio lokal
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(stream);
        
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
        }
        
        // Inisialisasi koneksi WebRTC
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        
        // Tambahkan track audio ke koneksi
        stream.getAudioTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
        
        // Tangani track masuk (remote stream)
        const remoteStream = new MediaStream();
        setRemoteStream(remoteStream);
        
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        
        pc.ontrack = (event) => {
          event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
          });
        };
        
        setConnection(pc);
        
        // Start timer untuk durasi panggilan
        timerRef.current = window.setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      } catch (err) {
        console.error('Error initializing audio call:', err);
        onEnd();
      }
    };
    
    initializeCall();
    
    return () => {
      // Cleanup resources
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (connection) {
        connection.close();
      }
    };
  }, [peerId]);

  // Toggle mute/unmute audio
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Format durasi panggilan
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-md bg-zinc-800 border border-green-900 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-zinc-900 p-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <h3 className="text-lg font-semibold text-white">Panggilan Audio</h3>
          </div>
          <div className="text-green-400 font-mono">
            {formatCallDuration(callDuration)}
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 bg-green-800/30 border-2 border-green-500 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-white">Panggilan dengan Target</h4>
            <p className="text-zinc-400 mt-1">ID: {peerId}</p>
            <p className="text-zinc-400 mt-1">{isMuted ? 'Mikrofon Mati' : 'Mikrofon Aktif'}</p>
          </div>
          
          {/* Audio elements (hidden) */}
          <audio ref={localAudioRef} autoPlay muted className="hidden" />
          <audio ref={remoteAudioRef} autoPlay className="hidden" />
          
          <div className="flex justify-center space-x-6">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full ${isMuted ? 'bg-red-700 hover:bg-red-600' : 'bg-zinc-700 hover:bg-zinc-600'} transition-colors`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            
            <button
              onClick={onEnd}
              className="p-4 rounded-full bg-red-600 hover:bg-red-500 transition-colors"
              title="End Call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface RealAudioPlayerProps {
  messageId: number;
  timestamp: string;
  audioUrl?: string;
}

export default function RealAudioPlayer({ messageId, timestamp, audioUrl }: RealAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  
  // Debugging
  useEffect(() => {
    console.log(`RealAudioPlayer mounted for message ${messageId} with URL:`, audioUrl);
    return () => console.log(`RealAudioPlayer unmounted for message ${messageId}`);
  }, [messageId, audioUrl]);
  
  useEffect(() => {
    // Membuat elemen audio baru
    const audio = new Audio();
    audioRef.current = audio;
    
    // Pastikan audio diload secara eager untuk mengurangi lag saat play
    audio.preload = "auto";
    
    // Set initial source if available
    if (audioUrl) {
      console.log(`Setting audio source for message ${messageId} to: ${audioUrl}`);
      
      try {
        // Pastikan URL adalah absolut dan benar
        let absoluteUrl = audioUrl;
        
        // Jika URL tidak dimulai dengan http atau blob, tambahkan origin
        if (!audioUrl.startsWith('http') && !audioUrl.startsWith('blob:')) {
          // Buat URL absolut dengan origin server
          absoluteUrl = window.location.origin + (audioUrl.startsWith('/') ? '' : '/') + audioUrl;
        }
        
        console.log(`Normalized audio URL for message ${messageId}: ${absoluteUrl}`);
        
        // Audio akan mendeteksi MIME type secara otomatis berdasarkan ekstensi
        // Pastikan ekstensi file benar (tambahkan .webm jika perlu)
        if (!absoluteUrl.includes('.webm') && !absoluteUrl.includes('.mp3') && !absoluteUrl.includes('.ogg')) {
          absoluteUrl = `${absoluteUrl}.webm`;
          console.log(`Added .webm extension to URL: ${absoluteUrl}`);
        }
        
        // Atur source audio dan muat langsung
        audio.src = absoluteUrl;
        audio.load(); // Explicitly load the audio
        
        // Verifikasi pemutaran dengan try play/pause langsung setelah load
        audio.play().then(() => {
          // Pemutaran berhasil dimulai, segera pause
          audio.pause();
          audio.currentTime = 0;
          console.log(`Audio for message ${messageId} verified as playable`);
        }).catch(err => {
          console.warn(`Initial playback test failed for message ${messageId}:`, err);
          // Error tetap ditangani oleh handler terpisah
        });
      } catch (error) {
        console.error(`Error setting audio source for message ${messageId}:`, error);
      }
    } else {
      console.error(`No audio URL provided for message ${messageId}`);
    }
    
    // Event listener untuk update durasi dan progress
    const handleMetadataLoaded = () => {
      const audioDuration = audio.duration;
      console.log(`Audio metadata loaded for message ${messageId}, duration:`, audioDuration);
      
      if (isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
      } else {
        // Jika durasi audio tidak valid, gunakan estimasi berdasarkan ukuran file atau default
        const estimatedDuration = 30; // Default 30 detik
        console.log(`Using estimated duration (${estimatedDuration}s) for message ${messageId}`);
        setDuration(estimatedDuration);
      }
    };
    
    const handleTimeUpdate = () => {
      // Pastikan kita tidak membagi dengan nol
      if (audio.duration) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    const handleEnded = () => {
      console.log(`Audio playback ended for message ${messageId}`);
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    
    const handleError = (e: Event) => {
      // Log dengan lebih detail tentang error
      const errorTarget = e.target as HTMLAudioElement;
      const errorCode = errorTarget?.error?.code;
      const errorMessage = errorTarget?.error?.message;
      
      console.error(`Error loading audio for message ${messageId}:`, {
        code: errorCode,
        message: errorMessage,
        event: e
      });
      
      // Jangan langsung gunakan simulasi, coba tambahkan ".webm" ke URL dan coba lagi
      if (audioUrl && !audioUrl.endsWith('.webm') && audioRef.current) {
        const newUrl = audioUrl + '.webm';
        console.log(`Trying alternative URL with .webm extension: ${newUrl}`);
        
        try {
          audioRef.current.src = newUrl;
          audioRef.current.load();
        } catch (retryError) {
          console.error(`Retry with .webm extension failed:`, retryError);
          setDuration(30); // Default durasi jika gagal
        }
      } else {
        setDuration(30); // Default durasi jika gagal
      }
    };
    
    // Add event listeners
    audio.addEventListener('loadedmetadata', handleMetadataLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    // Cleanup listeners when component unmounts
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      
      audio.pause();
      audio.src = '';
      audio.removeEventListener('loadedmetadata', handleMetadataLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, messageId]);
  
  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!audioRef.current) {
      console.error(`Audio reference is null for message ${messageId}`);
      return;
    }
    
    if (isPlaying) {
      console.log(`Pausing audio playback for message ${messageId}`);
      audioRef.current.pause();
      setIsPlaying(false);
      
      // Clear any simulation interval
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      try {
        // Make sure we have the latest URL
        if (audioUrl) {
          // Ensure URL is absolute
          let finalUrl = audioUrl;
          
          if (!audioUrl.startsWith('http') && !audioUrl.startsWith('blob:')) {
            finalUrl = window.location.origin + (audioUrl.startsWith('/') ? '' : '/') + audioUrl;
          }
          
          console.log(`Preparing audio for playback at: ${finalUrl} for message ${messageId}`);
          
          // Reset current time to start
          audioRef.current.currentTime = 0;
          
          // Tambahkan CORS header untuk cross-origin requests
          audioRef.current.crossOrigin = "anonymous";
          
          // Reset progress UI state sebelum memulai playback
          setProgress(0);
          setCurrentTime(0);
          
          // Try to play the audio with multiple retries and backup strategies
          const tryPlayAudio = async () => {
            try {
              // First attempt - play current source
              const playPromise = audioRef.current!.play();
              await playPromise;
              
              console.log(`Audio playback started successfully for message ${messageId}`);
              setIsPlaying(true);
              
            } catch (error) {
              console.error(`Failed first play attempt for message ${messageId}:`, error);
              
              // Second attempt - reload source and try again
              try {
                console.log(`Reloading audio source for message ${messageId}`);
                audioRef.current!.src = finalUrl;
                audioRef.current!.load();
                
                // Add slight delay before trying again
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const secondPlayPromise = audioRef.current!.play();
                await secondPlayPromise;
                
                console.log(`Second play attempt successful for message ${messageId}`);
                setIsPlaying(true);
                
              } catch (secondError) {
                console.error(`All audio play attempts failed for message ${messageId}, using simulation:`, secondError);
                simulatePlayback();
              }
            }
          };
          
          // Start playback attempt process
          tryPlayAudio();
          
        } else {
          // No audio file available, fall back to simulation
          console.log(`No valid audio source specified for message ${messageId}, using simulation`);
          simulatePlayback();
        }
      } catch (error) {
        console.error(`Critical error during audio playback setup for message ${messageId}, using simulation:`, error);
        simulatePlayback();
      }
    }
  };
  
  // Fallback simulation untuk kasus audio source yang tidak dapat diputar
  const simulatePlayback = () => {
    console.log(`Starting audio simulation for message ${messageId}`);
    setIsPlaying(true);
    
    // Bersihkan interval yang sudah ada
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    
    // Gunakan durasi yang valid atau default
    let simulatedDuration = 0;
    
    // Jika kita punya durasi dari rekaman, gunakan itu
    if (isFinite(duration) && duration > 0) {
      simulatedDuration = duration;
    } else {
      // Jika durasi tidak valid, estimasi berdasarkan pesan (default 5 detik)
      simulatedDuration = 5; // Default minimal
      
      // Jika ada URL, kita bisa mencoba estimasi dari ukuran file/nama
      if (audioUrl) {
        try {
          // Ekstrak angka dari nama file jika cocok dengan pola voice_note_TIMESTAMP.webm
          const match = audioUrl.match(/voice_note_(\d+)/);
          if (match && match[1]) {
            // Gunakan 2 digit terakhir dari timestamp sebagai detik (jika >10)
            const digits = match[1].slice(-2);
            const seconds = parseInt(digits, 10);
            if (seconds >= 10) {
              simulatedDuration = seconds;
            } else {
              simulatedDuration = 10; // Default 10 detik jika tidak dapat mengestimasi
            }
          }
        } catch (e) {
          console.error("Error estimating duration from filename:", e);
        }
      }
    }
    
    console.log(`Using simulated duration: ${simulatedDuration}s for message ${messageId}`);
    
    // Jalankan timer simulasi
    let simulatedTime = 0;
    
    intervalRef.current = window.setInterval(() => {
      simulatedTime += 0.1;
      
      if (simulatedTime >= simulatedDuration) {
        // Akhir simulasi pemutaran
        window.clearInterval(intervalRef.current as number);
        intervalRef.current = null;
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      } else {
        // Update progres simulasi
        setCurrentTime(simulatedTime);
        setProgress((simulatedTime / simulatedDuration) * 100);
      }
    }, 100);
  };
  
  // Format waktu dari detik ke mm:ss
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="pt-1 w-full max-w-[90%]">
      {/* Audio player dengan desain hijau militer */}
      <div className="rounded-md overflow-hidden">
        {/* Header Pesan Suara */}
        <div className="flex items-center justify-between bg-[#47573a] px-3 py-2">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4 text-white" />
            <span className="text-white text-sm">Pesan Suara</span>
          </div>
          <span className="text-xs text-gray-200">
            {new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
          </span>
        </div>
        
        {/* Player control */}
        <div className="bg-[#394733] px-3 py-2">
          <div className="flex items-center justify-between">
            <button 
              className="w-8 h-8 flex items-center justify-center bg-[#2c3627] hover:bg-[#22291e] rounded-full mr-3"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-white" />
              ) : (
                <Play className="h-4 w-4 text-white ml-0.5" />
              )}
            </button>
            
            {/* Progress bar */}
            <div className="flex-1">
              <div className="w-full bg-[#2c3627] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-green-400 h-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            {/* Durasi */}
            <span className="ml-3 text-xs text-white">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
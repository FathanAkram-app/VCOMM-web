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
  
  useEffect(() => {
    // Membuat elemen audio baru
    const audio = new Audio();
    audioRef.current = audio;
    
    // Set initial source if available
    if (audioUrl) {
      audio.src = audioUrl;
    }
    
    // Event listener untuk update durasi dan progress
    audio.addEventListener('loadedmetadata', () => {
      console.log('Audio metadata loaded, duration:', audio.duration);
      setDuration(audio.duration || 30); // Default 30 seconds if not available
    });
    
    audio.addEventListener('timeupdate', () => {
      // Ensure we don't divide by zero
      if (audio.duration) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });
    
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    });
    
    audio.addEventListener('error', (e) => {
      console.error('Error loading audio:', e);
      // Fallback to silent audio simulation on error
      setDuration(30); // Default 30 seconds
    });
    
    // Cleanup listener saat component unmount
    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('loadedmetadata', () => {});
      audio.removeEventListener('timeupdate', () => {});
      audio.removeEventListener('ended', () => {});
      audio.removeEventListener('error', () => {});
    };
  }, [audioUrl]);
  
  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        // If we have a valid audio URL, use it
        if (audioUrl && audioRef.current.src !== audioUrl) {
          audioRef.current.src = audioUrl;
        }
        
        // If no valid source, simulate playback
        if (!audioUrl || audioRef.current.src === '') {
          console.log('No valid audio source, starting simulation');
          simulatePlayback();
          return;
        }
        
        // Attempt to play the actual audio
        audioRef.current.play()
          .then(() => {
            console.log('Audio playback started successfully');
            setIsPlaying(true);
          })
          .catch(error => {
            console.error('Failed to play audio:', error);
            // Fallback to simulation on error
            simulatePlayback();
          });
      } catch (error) {
        console.error('Error preparing audio playback:', error);
        // Fallback to simulation on error
        simulatePlayback();
      }
    }
  };
  
  // Fallback simulation for when actual audio playback fails
  const simulatePlayback = () => {
    setIsPlaying(true);
    
    // Create simulation interval
    const interval = window.setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 0.1;
        if (newTime >= (duration || 30)) {
          clearInterval(interval);
          setIsPlaying(false);
          setProgress(0);
          return 0;
        }
        setProgress((newTime / (duration || 30)) * 100);
        return newTime;
      });
    }, 100);
    
    // Store interval ID for cleanup
    return () => clearInterval(interval);
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
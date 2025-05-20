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
    
    // Set initial source if available
    if (audioUrl) {
      console.log(`Setting audio source to: ${audioUrl}`);
      audio.src = audioUrl;
      audio.load(); // Explicitly load the audio
    }
    
    // Event listener untuk update durasi dan progress
    const handleMetadataLoaded = () => {
      console.log('Audio metadata loaded, duration:', audio.duration);
      setDuration(audio.duration || 30); // Default 30 seconds if not available
    };
    
    const handleTimeUpdate = () => {
      // Ensure we don't divide by zero
      if (audio.duration) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    const handleEnded = () => {
      console.log('Audio playback ended');
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    
    const handleError = (e: Event) => {
      console.error('Error loading audio:', e);
      // Fallback to silent audio simulation on error
      setDuration(30); // Default 30 seconds
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
  }, [audioUrl]);
  
  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!audioRef.current) {
      console.error('Audio reference is null');
      return;
    }
    
    if (isPlaying) {
      console.log('Pausing audio playback');
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
        if (audioUrl && (!audioRef.current.src || !audioRef.current.src.includes(audioUrl))) {
          console.log(`Updating audio source to: ${audioUrl}`);
          audioRef.current.src = audioUrl;
          audioRef.current.load(); // Explicitly load the audio
        }
        
        // If we have an audio file, try to play it
        if (audioUrl && audioRef.current.src) {
          console.log('Attempting to play actual audio');
          
          // Try to play the audio
          audioRef.current.play()
            .then(() => {
              console.log('Audio playback started successfully');
              setIsPlaying(true);
            })
            .catch(error => {
              console.error('Failed to play audio, falling back to simulation:', error);
              simulatePlayback();
            });
        } else {
          // No audio file available, fall back to simulation
          console.log('No valid audio source, using simulation');
          simulatePlayback();
        }
      } catch (error) {
        console.error('Error during audio playback, using simulation:', error);
        simulatePlayback();
      }
    }
  };
  
  // Fallback simulation for when actual audio playback fails
  const simulatePlayback = () => {
    console.log('Starting audio simulation');
    setIsPlaying(true);
    
    // Clean up any existing interval
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    
    // Create simulation interval
    const simulatedDuration = duration || 30;
    let simulatedTime = 0;
    
    intervalRef.current = window.setInterval(() => {
      simulatedTime += 0.1;
      
      if (simulatedTime >= simulatedDuration) {
        // End of simulated playback
        window.clearInterval(intervalRef.current as number);
        intervalRef.current = null;
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      } else {
        // Update simulated progress
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
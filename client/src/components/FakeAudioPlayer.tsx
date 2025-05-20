import { useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface FakeAudioPlayerProps {
  timestamp: string;
}

export default function FakeAudioPlayer({ timestamp }: FakeAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Simulasi pemutaran audio
  useEffect(() => {
    let interval: number;
    
    if (isPlaying) {
      interval = window.setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= 30) {
            setIsPlaying(false);
            return 0;
          }
          setProgress((newTime / 30) * 100);
          return newTime;
        });
      }, 100);
    }
    
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isPlaying]);
  
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
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(!isPlaying);
              }}
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
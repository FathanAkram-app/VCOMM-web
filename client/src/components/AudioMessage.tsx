import React, { useState, useRef } from 'react';
import { Volume2, Play, Pause } from 'lucide-react';

interface AudioMessageProps {
  src: string;
  filename?: string;
  timestamp?: string;
}

const AudioMessage: React.FC<AudioMessageProps> = ({ src, filename, timestamp }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // URL untuk audio
  const audioUrl = src.startsWith('http') ? src : window.location.origin + src;

  // Format waktu dari detik ke format mm:ss
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle play button
  const handlePlayClick = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
      });
    }
    setIsPlaying(!isPlaying);
  };

  // Update time as audio plays
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Set duration when metadata loads
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle when audio ends
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };
  
  // Get file size in KB
  const getFileSizeText = (filename?: string): string => {
    // Placeholder size if real size not available
    return filename ? '134.5 KB' : '124.8 KB';
  };

  return (
    <div className="w-full">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Voice recording UI - exact match to screenshot */}
      <div className="flex flex-col mb-1">
        <div className="flex items-center text-white bg-[#2e412c] px-3 py-1.5 rounded-t-md">
          <Volume2 className="h-5 w-5 mr-2" />
          <span className="font-medium">Voice recording - {formatTime(duration)}</span>
        </div>
        
        <div className="flex items-center bg-[#496e45] px-3 py-1.5 rounded-b-md">
          <button 
            onClick={handlePlayClick}
            className="w-8 h-8 rounded-full bg-[#395939] flex items-center justify-center mr-3"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white ml-0.5" />
            )}
          </button>
          
          <div className="flex-1">
            <div className="w-full bg-[#395939] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-white h-full" 
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              />
            </div>
          </div>
          
          <div className="ml-3 text-sm text-white">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>
      
      {/* Additional info line - font and sizing to match screenshot */}
      <div className="flex items-center ml-2">
        <span className="text-xs text-[#8ba880] font-medium">Voice Note - {formatTime(duration)}</span>
        <span className="text-xs text-[#7e9b75] ml-2">{getFileSizeText(filename)}</span>
      </div>
    </div>
  );
};

export default AudioMessage;
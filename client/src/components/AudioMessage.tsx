import React, { useState, useRef } from 'react';
import { Volume2, Play, Pause, MoreVertical } from 'lucide-react';

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

      {/* Green bubble header - exactly like screenshot */}
      <div className="rounded-t-md bg-[#506a3e] px-3 py-2 flex items-center justify-between">
        <div className="flex items-center">
          <Volume2 className="h-4 w-4 text-white/90 mr-2" />
          <span className="text-white text-sm font-medium">Pesan Suara</span>
        </div>
        <MoreVertical className="h-4 w-4 text-white/70" />
      </div>
      
      {/* Classification subtitle - exactly like screenshot */}
      <div className="bg-[#3f5232] px-3 py-1">
        <div className="flex items-center">
          <div className="h-2 w-2 rounded-full bg-green-400 mr-1"></div>
          <span className="text-xs text-green-300 uppercase">UNCLASSIFIED</span>
          <span className="text-xs text-white/70 ml-1">kurang dari 1 menit yang lalu</span>
        </div>
      </div>
      
      {/* Audio player - hidden but functional */}
      <div className="hidden">
        <button onClick={handlePlayClick}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );
};

export default AudioMessage;
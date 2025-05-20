import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface AudioPlayerInlineProps {
  src: string;
  filename?: string;
  fileSize?: number;
  timestamp?: string;
}

const AudioPlayerInline: React.FC<AudioPlayerInlineProps> = ({ 
  src, 
  filename, 
  fileSize,
  timestamp
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Format waktu audio (mm:ss)
  const formatAudioTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  };
  
  // URL lengkap untuk file audio
  const audioUrl = src.startsWith('http') ? src : window.location.origin + src;

  // Toggle play/pause
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Error playing audio:", err));
    }
  };

  // Update time display
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Set duration when metadata is loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle audio ended
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Update isPlaying state when audio plays/pauses
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  return (
    <div className="w-full">
      {/* Audio element tersembunyi */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Header dengan ikon dan text */}
      <div 
        className="flex items-center justify-between bg-[#47573a] rounded-t-md px-3 py-2"
        onClick={handlePlayPause}
      >
        <div className="flex items-center space-x-2">
          {isPlaying ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white" />
          )}
          <span className="text-white text-sm">Pesan Suara</span>
        </div>
        <MoreVertical className="h-4 w-4 text-white/70" />
      </div>
      
      {/* UNCLASSIFIED status dan durasi */}
      <div className="flex items-center justify-between bg-[#394733] rounded-b-md px-3 py-1">
        <div className="flex items-center space-x-1">
          <div className="h-2 w-2 bg-green-400 rounded-full"></div>
          <span className="text-xs text-green-300 uppercase">UNCLASSIFIED</span>
        </div>
        <span className="text-xs text-gray-300">
          {formatAudioTime(duration)} yang lalu
        </span>
      </div>
    </div>
  );
};

export default AudioPlayerInline;
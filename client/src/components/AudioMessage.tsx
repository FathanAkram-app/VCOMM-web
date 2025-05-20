import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, MoreVertical } from 'lucide-react';

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
  
  // Format waktu audio (mm:ss)
  const formatAudioTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  };
  
  // Kalkulasi berapa lama waktu audio yang tersisa
  const getTimeDisplay = () => {
    if (duration <= 0) return "0:00";
    return formatAudioTime(duration);
  };
  
  // URL untuk audio
  const audioUrl = src.startsWith('http') ? src : window.location.origin + src;
  
  // Toggle play/pause
  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  };
  
  // Update waktu ketika audio diputar
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  // Set durasi ketika metadata dimuat
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  // Handle audio berakhir
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };
  
  // Update state isPlaying ketika audio play/pause
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
    <div className="w-full flex flex-col">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      
      {/* Pesan Suara header - with green background */}
      <div className="flex items-center justify-between bg-[#47573a] p-2 rounded-t-md">
        <div className="flex items-center space-x-2">
          {isPlaying ? 
            <Pause className="h-4 w-4 text-white" /> : 
            <Play className="h-4 w-4 text-white" />
          }
          <span className="text-white text-sm">Pesan Suara</span>
        </div>
        <MoreVertical className="h-4 w-4 text-white" />
      </div>
      
      {/* UNCLASSIFIED status and duration */}
      <div 
        className="flex items-center justify-between bg-[#394733] p-1 rounded-b-md text-xs"
        onClick={togglePlayPause}
      >
        <div className="flex items-center space-x-1">
          <div className="h-2 w-2 bg-green-400 rounded-full"></div>
          <span className="text-green-300 uppercase">UNCLASSIFIED</span>
        </div>
        <span className="text-gray-300">{getTimeDisplay()} yang lalu</span>
      </div>
    </div>
  );
};

export default AudioMessage;
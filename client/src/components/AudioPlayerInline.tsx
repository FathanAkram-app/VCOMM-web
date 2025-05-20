import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, MoreVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerInlineProps {
  src: string;
  filename: string;
  fileSize?: number;
}

const AudioPlayerInline: React.FC<AudioPlayerInlineProps> = ({ src, filename, fileSize }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // URL lengkap untuk file audio
  const audioUrl = src.startsWith('http') ? src : window.location.origin + src;

  // Format ukuran file
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Format waktu dari detik ke format mm:ss
  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error('Play error:', err);
      });
      setIsPlaying(true);
    }
  };
  
  // Menangani perubahan slider
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    const newProgress = parseFloat(e.target.value);
    const newTime = (newProgress / 100) * duration;
    
    audioRef.current.currentTime = newTime;
    setProgress(newProgress);
    setCurrentTime(newTime);
  };

  return (
    <div className="w-full mt-1 mb-1">
      {/* Header pesan suara dengan ikon dan waktu */}
      <div className="flex items-center mb-2">
        <Pencil className="h-4 w-4 text-gray-400 mr-1" />
        <span className="text-xs text-gray-300">Voice Note - 00:00</span>
        {fileSize && (
          <span className="text-xs text-gray-400 ml-2">{formatFileSize(fileSize)}</span>
        )}
      </div>
      
      {/* Audio element tersembunyi */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {/* Player control seperti WhatsApp */}
      <div className="w-full bg-white/10 rounded-full flex items-center px-2 py-1">
        <button 
          onClick={togglePlay}
          className="flex-shrink-0 h-8 w-8 flex items-center justify-center"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 text-white" />
          ) : (
            <Play className="h-5 w-5 text-white" />
          )}
        </button>

        <div className="mx-2 text-xs text-white/90 flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Progress bar */}
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleProgressChange}
          className="w-full h-1 bg-gray-400/30 rounded-full overflow-hidden appearance-none cursor-pointer accent-white"
        />

        <button className="ml-2 flex-shrink-0">
          <Volume2 className="h-5 w-5 text-white" />
        </button>

        <button className="ml-1 flex-shrink-0">
          <MoreVertical className="h-5 w-5 text-white/70" />
        </button>
      </div>
    </div>
  );
};

export default AudioPlayerInline;
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Mic } from 'lucide-react';

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

  return (
    <div className="w-full">
      {/* Audio element tersembunyi */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {/* Player interface yang mirip dengan yang di NXZZ-VComm */}
      <div className="flex flex-col w-full">
        {/* Player control dengan background hijau */}
        <div className="bg-[#223920] rounded-t-md p-2 flex items-center">
          <div className="flex items-center text-sm text-white space-x-1">
            <Mic className="h-4 w-4 mr-1" />
            <span>Voice recording - {formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Bagian player utama dengan background putih transparan */}
        <div className="bg-white/10 rounded-b-md p-1 flex items-center">
          <button 
            onClick={togglePlay}
            className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-white/10 rounded-full"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white" />
            )}
          </button>

          <div className="mx-2 text-xs text-white flex-grow flex items-center space-x-2">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
            
            {/* Progress bar */}
            <div className="w-full bg-white/20 h-1 rounded-full mx-2 relative">
              <div 
                className="absolute top-0 left-0 h-full bg-white/70 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <Volume2 className="h-4 w-4 text-white/70" />
          </div>
        </div>
        
        {/* Info file */}
        <div className="mt-1 bg-[#223920]/80 text-white/80 text-xs p-1 flex items-center rounded-md">
          <Mic className="h-3 w-3 mr-1 text-white/60" />
          <span>Voice Note - {formatTime(duration)}</span>
          {fileSize && (
            <span className="ml-auto">{formatFileSize(fileSize)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayerInline;
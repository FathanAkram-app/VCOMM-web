import React, { useState, useRef, useEffect } from 'react';
import { Volume2, MoreVertical, Play, Pause } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface AudioPlayerInlineProps {
  src: string;
  filename: string;
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
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // URL lengkap untuk file audio
  const audioUrl = src.startsWith('http') ? src : window.location.origin + src;

  // Format waktu relatif
  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'kurang dari 1 menit yang lalu';
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true,
        locale: id
      }).replace('sekitar ', '');
    } catch (e) {
      return 'kurang dari 1 menit yang lalu';
    }
  };

  // Format ukuran file
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Format waktu dari detik ke format mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' + secs : secs}`;
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
      setCurrentTime(0);
      setProgress(0);
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

  // Handle progress bar click
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    const newProgress = parseFloat(e.target.value);
    const newTime = (newProgress / 100) * duration;
    
    audioRef.current.currentTime = newTime;
    setProgress(newProgress);
    setCurrentTime(newTime);
  };

  return (
    <div className="w-full">
      {/* Audio element tersembunyi */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {/* Header dengan warna hijau militer */}
      <div className="flex items-center justify-between p-2 bg-[#223920] rounded-t-md">
        <div className="flex items-center">
          <Volume2 className="h-4 w-4 text-white/90 mr-2" />
          <span className="text-white font-medium text-sm">Pesan Suara</span>
        </div>
        <div className="flex items-center text-white/70 text-xs">
          <span>{timestamp ? getRelativeTime(timestamp) : 'kurang dari 1 menit yang lalu'}</span>
          <button className="ml-2">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Classification - hijau terang di bawah header */}
      <div className="bg-[#2e4e2a] px-2 py-1">
        <div className="flex items-center">
          <span className="text-xs text-green-300">UNCLASSIFIED</span>
        </div>
      </div>

      {/* Audio player dan controls */}
      <div className="bg-[#1a1a1a] p-2 rounded-b-md">
        <div className="flex items-center mb-2">
          <button 
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-2 hover:bg-white/20"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white ml-0.5" />
            )}
          </button>
          
          <div className="flex-1 mx-2">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleProgressChange}
              className="w-full h-1 bg-white/20 rounded-full overflow-hidden appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
        
        {fileSize && (
          <div className="text-xs text-white/60 flex justify-end">
            {formatFileSize(fileSize)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioPlayerInline;
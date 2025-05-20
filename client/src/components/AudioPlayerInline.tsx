import React, { useState, useRef, useEffect } from 'react';
import { Play, MoreVertical, Volume2 } from 'lucide-react';
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
  
  // URL lengkap untuk file audio
  const audioUrl = src.startsWith('http') ? src : window.location.origin + src;

  // Format waktu relatif
  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'baru saja';
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true,
        locale: id
      }).replace('sekitar ', '');
    } catch (e) {
      return 'baru saja';
    }
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
    };

    const handleEnded = () => {
      setIsPlaying(false);
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

      {/* Simple header seperti di screenshot */}
      <div className="flex items-center justify-between bg-[#2c2c2c] p-2 rounded-md">
        <div className="flex items-center">
          <Volume2 className="h-4 w-4 text-white mr-2" />
          <span className="text-white text-sm font-medium">Pesan Suara</span>
        </div>
        <div className="flex text-xs text-white/60">
          <span>{timestamp ? getRelativeTime(timestamp) : 'kurang dari 1 menit yang lalu'}</span>
          <button className="ml-2">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Audio controls below */}
      <div className="hidden">
        {isPlaying ? (
          <button onClick={togglePlay}>Pause</button>
        ) : (
          <button onClick={togglePlay}>Play</button>
        )}
      </div>
    </div>
  );
};

export default AudioPlayerInline;
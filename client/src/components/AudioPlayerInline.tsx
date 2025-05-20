import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerInlineProps {
  src: string;
  filename: string;
}

const AudioPlayerInline: React.FC<AudioPlayerInlineProps> = ({ src, filename }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // URL lengkap untuk file audio
  const audioUrl = src.startsWith('http') ? src : window.location.origin + src;

  // Menangani perubahan pada audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Event listeners
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

    // Tambahkan event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Cleanup
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Format waktu dari detik ke format mm:ss
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  };

  // Menangani tombol play/pause
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

      <div className="flex items-center space-x-2 mt-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 p-0 flex-shrink-0"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white" />
          )}
        </Button>

        {/* Progress bar */}
        <div className="w-full">
          <div className="relative h-1.5 bg-black/20 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-white/40 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-white/80">
              {formatTime(currentTime)}
            </span>
            <span className="text-[10px] text-white/80">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayerInline;
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
  src: string;
  filename: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, filename }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL lengkap untuk file audio
  const audioUrl = src.startsWith('http') ? src : window.location.origin + src;

  // Menangani perubahan pada audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      console.log('Audio metadata loaded, duration:', audio.duration);
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

    const handleError = (e: any) => {
      console.error('Audio error:', e);
      setError('Gagal memuat audio. Silakan coba unduh file.');
    };

    // Tambahkan event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Cleanup
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
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
        setError('Gagal memutar audio. Silakan coba unduh file.');
      });
      setIsPlaying(true);
    }
  };

  // Menangani tombol mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
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
    <div className="w-full bg-[#2C2C2C] rounded-lg p-3 my-2">
      {/* Audio element tersembunyi */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onCanPlay={() => console.log('Audio can play')}
        onLoadStart={() => console.log('Audio load started')}
      />

      {/* Header player */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <span className="text-sm font-medium text-green-500">
            {isPlaying ? 'Sedang Diputar' : 'Pesan Suara'}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-[#3A3A3A] hover:bg-green-800 p-0"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white" />
          )}
        </Button>

        {/* Progress bar */}
        <div className="flex-1 px-1">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleProgressChange}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[#444] accent-green-600"
          />
        </div>

        {/* Volume control */}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-[#3A3A3A] hover:bg-green-800 p-0"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-white" />
          ) : (
            <Volume2 className="h-4 w-4 text-white" />
          )}
        </Button>
      </div>

      {/* Error message if any */}
      {error && (
        <div className="mt-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Download option */}
      <div className="mt-2 text-center">
        <a
          href={audioUrl}
          download={filename}
          className="text-xs text-green-500 hover:text-green-400 hover:underline"
        >
          Unduh Audio
        </a>
      </div>
    </div>
  );
};

export default AudioPlayer;
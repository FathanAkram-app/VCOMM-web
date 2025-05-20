import React, { useState, useRef, useEffect } from 'react';
import { Volume2, MoreVertical } from 'lucide-react';
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

  // Event listeners untuk mendapatkan durasi audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  // Toggle play/pause
  const handlePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Error playing audio:", err));
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="w-full">
      {/* Audio element tersembunyi */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {/* Bubble yang persis sama seperti screenshot - dengan warna hijau army */}
      <div className="rounded-md overflow-hidden bg-[#486c42]">
        {/* Header pesan audio */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center">
            <Volume2 className="h-5 w-5 text-white mr-2" />
            <span className="text-white font-medium">Pesan Suara</span>
          </div>
          <div>
            <button>
              <MoreVertical className="h-5 w-5 text-white/70" />
            </button>
          </div>
        </div>
        
        {/* Klasifikasi dan timestamp */}
        <div className="bg-[#405e3a] px-3 py-1 flex items-center">
          <div className="flex items-center">
            <span className="h-2 w-2 rounded-full bg-green-400 mr-1"></span>
            <span className="text-xs text-green-300 uppercase">
              UNCLASSIFIED
            </span>
            <span className="text-xs text-white/70 ml-1">
              {timestamp ? getRelativeTime(timestamp) : "kurang dari 1 menit yang lalu"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayerInline;
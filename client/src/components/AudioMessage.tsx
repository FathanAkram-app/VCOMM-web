import { useState, useRef } from "react";
import { Volume2, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

interface AudioMessageProps {
  src: string;
  filename?: string;
  timestamp?: string;
}

const AudioMessage = ({ src, filename, timestamp }: AudioMessageProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // URL lengkap untuk file audio
  const audioUrl = src.startsWith("http") ? src : window.location.origin + src;

  // Format waktu relatif
  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return "kurang dari 1 menit yang lalu";
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true,
        locale: id
      }).replace("sekitar ", "");
    } catch (e) {
      return "kurang dari 1 menit yang lalu";
    }
  };

  return (
    <div className="w-full relative">
      {/* Audio element tersembunyi */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      {/* Header dengan ikon speaker dan teks "Pesan Suara" */}
      <div className="flex items-center justify-between p-2 pb-1">
        <div className="flex items-center">
          <Volume2 className="h-5 w-5 text-white mr-2" />
          <span className="text-white font-medium">Pesan Suara</span>
        </div>
        <div className="flex items-center">
          <button>
            <MoreVertical className="h-5 w-5 text-white/70" />
          </button>
        </div>
      </div>
      
      {/* Bagian klasifikasi - UNCLASSIFIED */}
      <div className="flex items-center px-2 py-0.5">
        <span className="text-xs text-green-400">
          UNCLASSIFIED {timestamp ? getRelativeTime(timestamp) : "kurang dari 1 menit yang lalu"}
        </span>
      </div>
    </div>
  );
};

export default AudioMessage;
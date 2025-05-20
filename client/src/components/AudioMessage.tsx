import React, { useState } from 'react';
import { Volume2, MoreVertical } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

interface AudioMessageProps {
  src: string;
  filename?: string;
  timestamp?: string;
}

const AudioMessage: React.FC<AudioMessageProps> = ({ src, filename, timestamp }) => {
  // Konversi timestamp ke "time ago" (misalnya "2 menit yang lalu")
  const getTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'kurang dari 1 menit yang lalu';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'kurang dari 1 menit yang lalu';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} menit yang lalu`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} jam yang lalu`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} hari yang lalu`;
    }
  };

  return (
    <div className="w-full">
      {/* Header bubble */}
      <div className="rounded-t-md bg-[#506a3e] px-3 py-2 flex items-center justify-between">
        <div className="flex items-center">
          <Volume2 className="h-4 w-4 text-white/90 mr-2" />
          <span className="text-white text-sm font-medium">Pesan Suara</span>
        </div>
        <MoreVertical className="h-4 w-4 text-white/70" />
      </div>
      
      {/* Subtitle */}
      <div className="bg-[#3f5232] px-3 py-1">
        <div className="flex items-center">
          <div className="h-2 w-2 rounded-full bg-green-400 mr-1"></div>
          <span className="text-xs text-green-300 uppercase">UNCLASSIFIED</span>
          <span className="text-xs text-white/70 ml-1">{getTimeAgo(timestamp)}</span>
        </div>
      </div>
      
      {/* Audio Player */}
      <AudioPlayer src={src} />
    </div>
  );
};

export default AudioMessage;
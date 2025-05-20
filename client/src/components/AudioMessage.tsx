import React from 'react';
import { Volume2, MoreVertical } from 'lucide-react';

interface AudioMessageProps {
  src: string;
  filename?: string;
  timestamp?: string;
}

const AudioMessage: React.FC<AudioMessageProps> = ({ src, filename, timestamp }) => {
  // Format timestamp - sederhana saja
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'kurang dari 1 menit yang lalu';
    return 'kurang dari 1 menit yang lalu';
  };

  return (
    <div className="rounded-md overflow-hidden max-w-[80%] md:max-w-[70%] lg:max-w-[60%] ml-auto">
      <div className="bg-[#5a7646] px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-white" />
          <span className="text-white text-sm font-medium">Pesan Suara</span>
        </div>
        <MoreVertical className="h-4 w-4 text-white/70" />
      </div>
      <div className="bg-[#5a7646]/80 px-3 py-1">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-400"></div>
          <span className="text-xs text-green-200 uppercase">UNCLASSIFIED</span>
          <span className="text-xs text-white/70">{formatTimestamp(timestamp)}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioMessage;
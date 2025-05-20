import React from 'react';
import { Play, Volume2, MoreVertical } from 'lucide-react';

// Mengganti tampilan pesan suara dengan sesuatu yang sama persis seperti screenshot
// yang menggunakan warna hijau militer dan label UNCLASSIFIED
interface AudioPlayerInlineProps {
  src: string;
  filename?: string;
  fileSize?: number;
  timestamp?: string;
}

const AudioPlayerInline: React.FC<AudioPlayerInlineProps> = ({ 
  src, 
  filename, 
  fileSize,
  timestamp
}) => {
  // Hard-code tampilan dulu untuk melihat apakah masalah ini ada pada pengambilan data
  // atau pada tampilan komponen
  
  return (
    <div className="w-full max-w-[90%]">
      {/* Header Pesan Suara - dengan warna hijau militer */}
      <div className="flex items-center justify-between bg-[#47573a] rounded-t-md px-3 py-2">
        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4 text-white" />
          <span className="text-white text-sm">Pesan Suara</span>
        </div>
        <MoreVertical className="h-4 w-4 text-white/70" />
      </div>
      
      {/* UNCLASSIFIED status dan durasi */}
      <div className="flex items-center justify-between bg-[#394733] rounded-b-md px-3 py-1">
        <div className="flex items-center space-x-1">
          <div className="h-2 w-2 bg-green-400 rounded-full"></div>
          <span className="text-xs text-green-300 uppercase">UNCLASSIFIED</span>
        </div>
        <span className="text-xs text-gray-300">
          0:05 yang lalu
        </span>
      </div>
    </div>
  );
};

export default AudioPlayerInline;
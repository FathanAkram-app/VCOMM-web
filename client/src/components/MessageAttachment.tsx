import React, { useState, useRef, useEffect } from 'react';
import { File, FileText, Image, Music, Video, Download, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageAttachmentProps {
  attachmentType: string;
  attachmentUrl: string;
  attachmentName: string;
  attachmentSize?: number;
}

export default function MessageAttachment({
  attachmentType,
  attachmentUrl,
  attachmentName,
  attachmentSize
}: MessageAttachmentProps) {
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = () => {
    switch (attachmentType) {
      case 'image':
        return <Image className="h-5 w-5 text-green-500" />;
      case 'video':
        return <Video className="h-5 w-5 text-blue-500" />;
      case 'audio':
        return <Music className="h-5 w-5 text-purple-500" />;
      case 'document':
        return <FileText className="h-5 w-5 text-orange-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderContent = () => {
    switch (attachmentType) {
      case 'image':
        return (
          <div className="mb-1">
            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
              <img 
                src={attachmentUrl} 
                alt={attachmentName} 
                className="max-h-56 max-w-full rounded-md object-contain" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/broken-image.svg';
                  (e.target as HTMLImageElement).classList.add('max-h-32');
                }}
              />
            </a>
          </div>
        );
      case 'video':
        return (
          <div className="mb-1">
            <video 
              controls 
              className="max-h-56 max-w-full rounded-md" 
              preload="metadata"
            >
              <source src={attachmentUrl} />
              Browser Anda tidak mendukung tag video.
            </video>
          </div>
        );
      case 'audio':
        // Perbaiki URL audio
        const audioUrl = attachmentUrl.startsWith('http') 
          ? attachmentUrl 
          : window.location.origin + attachmentUrl;
          
        console.log('Audio URL untuk player:', audioUrl);
        
        return (
          <div className="mb-1">
            <div className="bg-[#222222] rounded-lg p-3">
              {/* Header */}
              <div className="flex items-center justify-center mb-2">
                <Music className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm font-medium text-green-400">Pesan Suara</span>
              </div>
              
              {/* Audio Player Standar */}
              <audio 
                controls 
                className="w-full" 
                controlsList="nodownload"
                style={{ 
                  backgroundColor: '#333', 
                  borderRadius: '8px',
                  color: 'white',
                  padding: '4px'
                }}
              >
                <source src={audioUrl} type="audio/webm" />
                <source src={audioUrl} type="audio/mpeg" />
                <source src={audioUrl} type="audio/mp4" />
                <source src={audioUrl} type="audio/ogg" />
                Browser Anda tidak mendukung pemutar audio.
              </audio>
              
              {/* Tombol alternatif */}
              <div className="flex justify-between mt-3">
                <Button
                  size="sm" 
                  variant="outline"
                  className="bg-green-900 text-white hover:bg-green-800 border-green-700 w-[48%]"
                  onClick={() => {
                    // Buka di tab baru
                    window.open(audioUrl, '_blank');
                  }}
                >
                  <Music className="h-4 w-4 mr-1" />
                  <span className="text-xs">Putar di Tab Baru</span>
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-[#2A2A2A] text-gray-300 hover:text-white hover:bg-[#3A3A3A] border-[#444] w-[48%]"
                  asChild
                >
                  <a href={audioUrl} download={attachmentName} rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1" />
                    <span className="text-xs">Unduh Audio</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col mb-1">
      {renderContent()}
      
      <div className="flex items-center p-2 bg-[#202020] rounded-md mb-1">
        <div className="mr-2">
          {getFileIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {attachmentName}
          </div>
          {attachmentSize && (
            <div className="text-xs text-gray-400">
              {formatFileSize(attachmentSize)}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="ml-2 text-gray-300 hover:text-white"
          asChild
        >
          <a href={attachmentUrl} download={attachmentName} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
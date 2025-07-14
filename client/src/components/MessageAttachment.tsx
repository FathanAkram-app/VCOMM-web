import React, { useState, useRef, useEffect } from 'react';
import { File, FileText, Image, Music, Video, Download, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AudioPlayer from '@/components/AudioPlayer';

interface MessageAttachmentProps {
  attachmentType: string;
  attachmentUrl: string;
  attachmentName: string;
  attachmentSize?: number;
  onImageClick?: (imageUrl: string) => void;
}

export default function MessageAttachment({
  attachmentType,
  attachmentUrl,
  attachmentName,
  attachmentSize,
  onImageClick
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
            <img 
              src={attachmentUrl} 
              alt={attachmentName} 
              className="max-h-56 max-w-full rounded-md object-contain cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onImageClick?.(attachmentUrl)} 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/broken-image.svg';
                  (e.target as HTMLImageElement).classList.add('max-h-32');
                }}
              />
          </div>
        );
      case 'video':
        return (
          <div className="mb-1">
            <video 
              controls 
              className="max-h-56 max-w-full rounded-md bg-black border border-gray-600 object-cover" 
              preload="metadata"
              playsInline
              muted={false}
              style={{
                minHeight: '200px',
                backgroundColor: '#000000',
                display: 'block'
              }}
              onError={(e) => {
                console.error('❌ Video playback error:', e);
                console.error('❌ Video URL:', attachmentUrl);
              }}
              onLoadStart={() => {
                console.log('📹 Video loading started:', attachmentUrl);
              }}
              onCanPlay={() => {
                console.log('✅ Video can play:', attachmentUrl);
              }}
              onLoadedMetadata={() => {
                console.log('📊 Video metadata loaded:', attachmentUrl);
              }}
              onLoadedData={() => {
                console.log('💾 Video data loaded:', attachmentUrl);
              }}
            >
              <source src={attachmentUrl} type="video/mp4" />
              <source src={attachmentUrl} type="video/webm" />
              <source src={attachmentUrl} type="video/ogg" />
              <source src={attachmentUrl} type="video/avi" />
              Browser Anda tidak mendukung tag video. 
              <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                Klik untuk mendownload video
              </a>
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
            <div className="bg-[#222222] rounded-lg p-2">
              {/* Gunakan AudioPlayer Custom */}
              <div className="flex items-center mb-2 px-2">
                <Volume2 className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm font-medium text-gray-300">Pesan Suara</span>
              </div>
              
              {/* Import AudioPlayer component untuk audio yang lebih bagus */}
              <div className="mb-2">
                <AudioPlayer src={audioUrl} filename={attachmentName} />
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
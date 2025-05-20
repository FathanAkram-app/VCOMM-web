import React from 'react';
import { File, FileText, Image, Music, Video, Download } from 'lucide-react';
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
        // Perbaiki URL audio jika perlu
        const audioUrl = attachmentUrl.startsWith('http') 
          ? attachmentUrl 
          : window.location.origin + attachmentUrl;
          
        // Debug informasi untuk audio
        console.log('Audio URL:', audioUrl);
        console.log('Attachment name:', attachmentName);
          
        return (
          <div className="mb-1">
            <div className="bg-[#222222] rounded-lg p-2">
              <div className="flex items-center justify-center">
                <Music className="h-5 w-5 text-purple-500 mr-2" />
                <span className="text-sm text-green-400 font-medium">Pesan Suara</span>
              </div>
              
              {/* Player audio dengan src langsung */}
              <audio 
                src={audioUrl}
                controls 
                className="w-full mt-2" 
                preload="auto"
                controlsList="nodownload"
                style={{ 
                  backgroundColor: '#333',
                  borderRadius: '8px',
                  padding: '4px',
                }}
                onError={(e) => {
                  console.error('Error saat memuat audio:', e);
                }}
                onLoadStart={() => console.log('Audio loading started')}
                onCanPlay={() => console.log('Audio can be played')}
              />
              
              {/* Tombol alternatif untuk unduh dan putar */}
              <div className="flex justify-center space-x-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-[#2C2C2C] text-gray-300 hover:text-white hover:bg-[#3A3A3A] border-[#444]"
                  asChild
                >
                  <a href={audioUrl} download={attachmentName} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3 mr-1" />
                    <span className="text-xs">Unduh Audio</span>
                  </a>
                </Button>
                
                {/* Tombol putar alternatif */}
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-green-900 text-gray-200 hover:bg-green-800 border-green-700"
                  onClick={() => {
                    // Buka audio di tab baru sebagai fallback
                    window.open(audioUrl, '_blank');
                  }}
                >
                  <Music className="h-3 w-3 mr-1" />
                  <span className="text-xs">Putar di Tab Baru</span>
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
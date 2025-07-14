import React, { useState, useRef, useEffect } from 'react';
import { File, FileText, Image, Music, Video, Download, Play, Pause, Volume2, VolumeX, X, Maximize, Minimize } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleFullscreenToggle = () => {
    if (!videoRef.current) return;
    
    if (!isFullscreen) {
      // Enter fullscreen
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      } else if ((videoRef.current as any).mozRequestFullScreen) {
        (videoRef.current as any).mozRequestFullScreen();
      } else if ((videoRef.current as any).msRequestFullscreen) {
        (videoRef.current as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleFullscreenChange = () => {
    const isCurrentlyFullscreen = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    setIsFullscreen(isCurrentlyFullscreen);
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

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
          <div 
            className="mb-1 overflow-hidden rounded-md" 
            style={{ 
              maxWidth: '260px',
              width: '100%',
              minWidth: '200px'
            }}
          >
            <img 
              src={attachmentUrl} 
              alt={attachmentName} 
              className="rounded-md object-contain cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '180px',
                display: 'block',
                boxSizing: 'border-box'
              }}
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
          <div 
            className="mb-1 relative overflow-hidden rounded-md" 
            style={{ 
              maxWidth: '260px',
              width: '100%',
              minWidth: '200px'
            }}
          >
            <video 
              ref={videoRef}
              controls 
              className="rounded-md bg-black border border-gray-600 object-contain" 
              preload="metadata"
              playsInline
              muted={false}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '180px',
                minHeight: '140px',
                backgroundColor: '#000000',
                display: 'block',
                boxSizing: 'border-box'
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
            
            {/* Fullscreen Toggle Button */}
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-sm"
              onClick={handleFullscreenToggle}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
            
            {/* Fullscreen Close Button Overlay */}
            {isFullscreen && (
              <div 
                className="fixed inset-0 bg-black/95 flex items-center justify-center"
                style={{ zIndex: 9999 }}
              >
                {/* Close Button - Fixed positioning with high z-index */}
                <Button
                  size="lg"
                  variant="ghost"
                  className="fixed top-4 right-4 bg-red-600/80 hover:bg-red-700/90 text-white border-2 border-white/50 backdrop-blur-sm shadow-2xl"
                  style={{ 
                    zIndex: 10000,
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    fontSize: '24px',
                    fontWeight: 'bold'
                  }}
                  onClick={handleFullscreenToggle}
                  title="Close Fullscreen"
                >
                  <X className="h-8 w-8" />
                </Button>
                
                {/* Video Container */}
                <div className="w-full h-full flex items-center justify-center p-4">
                  <video 
                    controls 
                    className="max-w-full max-h-full object-contain bg-black rounded-lg" 
                    preload="metadata"
                    playsInline
                    autoPlay
                    src={attachmentUrl}
                    style={{ zIndex: 9998 }}
                  >
                    <source src={attachmentUrl} type="video/mp4" />
                    <source src={attachmentUrl} type="video/webm" />
                    <source src={attachmentUrl} type="video/ogg" />
                    <source src={attachmentUrl} type="video/avi" />
                    Browser Anda tidak mendukung tag video.
                  </video>
                </div>
                
                {/* Alternative close area - tap anywhere outside video */}
                <div 
                  className="absolute inset-0 cursor-pointer"
                  style={{ zIndex: 9997 }}
                  onClick={(e) => {
                    // Only close if clicking outside the video
                    if (e.target === e.currentTarget) {
                      handleFullscreenToggle();
                    }
                  }}
                />
              </div>
            )}
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
          className="h-8 w-8 p-0 text-[#8ba742] hover:bg-[#333333]"
          onClick={() => {
            const link = document.createElement('a');
            link.href = attachmentUrl;
            link.download = attachmentName;
            link.click();
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
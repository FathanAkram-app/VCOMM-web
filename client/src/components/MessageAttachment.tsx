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
        // Perbaiki URL audio jika perlu
        const audioUrl = attachmentUrl.startsWith('http') 
          ? attachmentUrl 
          : window.location.origin + attachmentUrl;
          
        // Gunakan AudioPlayer langsung di komponen ini
        // Ini adalah implementasi inline untuk memastikan perubahan terlihat
        const CustomAudioPlayer = () => {
          const audioRef = useRef<HTMLAudioElement>(null);
          const [isPlaying, setIsPlaying] = useState(false);
          const [progress, setProgress] = useState(0);
          const [duration, setDuration] = useState(0);
          const [currentTime, setCurrentTime] = useState(0);
          const [isMuted, setIsMuted] = useState(false);
          
          // Format waktu mm:ss
          const formatTime = (time: number) => {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
          };
          
          // Effect untuk event handlers
          useEffect(() => {
            const audio = audioRef.current;
            if (!audio) return;
            
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
            
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('ended', handleEnded);
            
            return () => {
              audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
              audio.removeEventListener('timeupdate', handleTimeUpdate);
              audio.removeEventListener('ended', handleEnded);
            };
          }, []);
          
          // Toggle play/pause
          const togglePlay = () => {
            if (!audioRef.current) return;
            
            if (isPlaying) {
              audioRef.current.pause();
              setIsPlaying(false);
            } else {
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch(err => {
                  console.error('Play error:', err);
                });
              }
              setIsPlaying(true);
            }
          };
          
          // Toggle mute
          const toggleMute = () => {
            if (!audioRef.current) return;
            
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
          };
          
          // Update progress bar
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
              {/* Hidden audio element */}
              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
              />
              
              {/* Player header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Music className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-green-500">
                    {isPlaying ? 'Sedang Diputar' : 'Pesan Suara'}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatTime(currentTime)} / {formatTime(duration || 0)}
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
              
              {/* Download option */}
              <div className="mt-2 text-center">
                <a
                  href={audioUrl}
                  download={attachmentName}
                  className="text-xs text-green-500 hover:text-green-400 hover:underline"
                >
                  Unduh Audio
                </a>
              </div>
            </div>
          );
        };
          
        return (
          <div className="mb-1">
            <CustomAudioPlayer />
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
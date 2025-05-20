import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface SimpleAudioPlayerProps {
  audioUrl: string;
  messageId: number;
  timestamp: string;
}

export default function SimpleAudioPlayer({ audioUrl, messageId, timestamp }: SimpleAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Pastikan URL audio lengkap
  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    return window.location.origin + (url.startsWith('/') ? '' : '/') + url;
  };

  // Format time dari seconds ke mm:ss
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update progress saat audio dimainkan
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    // Register event listeners
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      // Cleanup
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Perbaiki masalah pemutaran audio pada browser
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Audio berhasil diputar');
          setIsPlaying(true);
        }).catch(error => {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
          
          // Informasi debugging
          console.log("Attempted playback of:", audioUrl);
          console.log("Browser:", navigator.userAgent);
          
          if (error.name === 'NotAllowedError') {
            console.log("Browser tidak mengizinkan pemutaran audio otomatis");
          } else if (error.name === 'NotSupportedError') {
            console.log("Format audio tidak didukung oleh browser");
          } else if (error.name === 'AbortError') {
            console.log("Pemutaran audio dibatalkan");
          }
          
          // Jangan gunakan alert yang mengganggu UX
          console.error("Tidak dapat memutar audio. Silakan coba lagi.");
        });
      } else {
        // Browser tidak mendukung Promise untuk audio.play()
        console.log("Browser tidak mendukung Promise untuk audio.play()");
        setIsPlaying(true);
      }
    }
  };

  // Jump to position when progress bar is clicked
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = offsetX / rect.width;
    const newTime = percentage * audio.duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(percentage * 100);
  };

  // Check if audio URL exists
  const hasAudio = !!audioUrl;

  return (
    <div className="pt-1 w-full max-w-[90%]">
      {/* Pemutar audio dengan desain militer */}
      <div className="rounded-md overflow-hidden">
        {/* Header Pesan Suara */}
        <div className="flex items-center justify-between bg-[#47573a] px-3 py-2">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4 text-white" />
            <span className="text-white text-sm">Pesan Suara</span>
          </div>
          <span className="text-xs text-gray-200">
            {new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
          </span>
        </div>
        
        {/* Audio element - hidden but functional */}
        <audio 
          ref={audioRef}
          preload="metadata"
          style={{ display: 'none' }}
        >
          {/* Coba cari file di lokasi yang benar di intranet lokal */}
          {audioUrl.includes('voice_note') ? (
            // Format file dengan pattern voice_note_ID.webm
            <>
              <source src={`/uploads/${audioUrl.split('/').pop()}`} type="audio/webm" />
              <source src={`/uploads/${audioUrl.split('/').pop()?.replace('.webm', '.mp3')}`} type="audio/mpeg" />
            </>
          ) : (
            // URL langsung ke file yang sudah disimpan dengan UUID
            <>
              <source src={audioUrl} type="audio/webm" />
              <source src={audioUrl.replace('.webm', '.mp3')} type="audio/mpeg" />
            </>
          )}
          Browser Anda tidak mendukung pemutaran audio.
        </audio>
        
        {/* Player control */}
        <div className="bg-[#394733] px-3 py-2">
          <div className="flex items-center justify-between">
            <button 
              className="w-8 h-8 flex items-center justify-center bg-[#2c3627] hover:bg-[#22291e] rounded-full mr-3"
              onClick={togglePlayPause}
              disabled={!hasAudio}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-white" />
              ) : (
                <Play className="h-4 w-4 text-white ml-0.5" />
              )}
            </button>
            
            {/* Progress bar */}
            <div className="flex-1">
              <div 
                className="w-full bg-[#2c3627] h-1.5 rounded-full overflow-hidden cursor-pointer"
                onClick={handleProgressBarClick}
              >
                <div
                  className="bg-green-400 h-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            {/* Duration */}
            <span className="ml-3 text-xs text-white">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
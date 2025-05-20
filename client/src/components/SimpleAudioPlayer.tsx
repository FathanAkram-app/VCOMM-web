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

  // Pastikan URL audio lengkap dan benar
  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    
    // Normalisasi URL
    let normalizedUrl = url;
    
    // Jika URL sudah berisi "uploads/" di tengahnya (seperti /api/uploads/...)
    if (url.includes('/uploads/')) {
      // Ambil hanya bagian filename-nya
      normalizedUrl = '/uploads/' + url.split('/uploads/').pop();
    } 
    // Jika URL tidak dimulai dengan "/"
    else if (!url.startsWith('/')) {
      normalizedUrl = '/' + url;
    }
    
    return window.location.origin + normalizedUrl;
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
    // Hindari penghentian event propagation untuk memungkinkan klik
    // e.stopPropagation();
    // e.preventDefault();
    
    console.log("Tombol play/pause diklik");
    
    const audio = audioRef.current;
    if (!audio) {
      console.error("Elemen audio tidak ditemukan");
      return;
    }

    if (isPlaying) {
      console.log("Menghentikan pemutaran audio");
      audio.pause();
      setIsPlaying(false);
    } else {
      console.log("Mencoba memutar audio:", audioUrl);
      
      // Log status audio sebelum memainkan
      console.log("Audio status - paused:", audio.paused, "readyState:", audio.readyState);
      
      // Pastikan audio sudah dimuat
      if (audio.readyState === 0) {
        console.log("Audio belum dimuat, mencoba memuat ulang");
        audio.load();
      }
      
      // Coba putar audio
      try {
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Audio berhasil diputar');
            setIsPlaying(true);
          }).catch(error => {
            console.error("Error playing audio:", error);
            setIsPlaying(false);
            
            // Informasi debugging lebih detail
            console.log("Detail audio yang diputar:");
            console.log("- URL:", audioUrl);
            console.log("- Duration:", audio.duration);
            console.log("- Error name:", error.name);
            console.log("- Error message:", error.message);
            
            if (error.name === 'NotAllowedError') {
              console.log("Browser tidak mengizinkan pemutaran audio otomatis");
            } else if (error.name === 'NotSupportedError') {
              console.log("Format audio tidak didukung oleh browser");
            } else if (error.name === 'AbortError') {
              console.log("Pemutaran audio dibatalkan");
            }
          });
        } else {
          console.log("Browser tidak mendukung Promise untuk audio.play()");
          setIsPlaying(true);
        }
      } catch (e) {
        console.error("Exception saat memutar audio:", e);
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
          {/* Log URL untuk debugging */}
          {console.log(`Trying to play audio from URL: ${audioUrl}`)}
          {console.log(`File name extracted: ${audioUrl.split('/').pop()}`)}
          
          {/* Coba dengan berbagai format file dan path */}
          {/* Format WEBM */}
          <source src={audioUrl} type="audio/webm" />
          <source src={`/uploads/${audioUrl.split('/').pop()}`} type="audio/webm" />
          
          {/* Format MP3 sebagai fallback */}
          <source src={audioUrl.replace('.webm', '.mp3')} type="audio/mpeg" />
          <source src={`/uploads/${audioUrl.split('/').pop()?.replace('.webm', '.mp3')}`} type="audio/mpeg" />
          
          {/* Cari berdasarkan ID file jika menggunakan format voice_note_xxx.webm */}
          {audioUrl.includes('voice_note_') && (
            <>
              <source 
                src={`/uploads/${Array.from(audioUrl.matchAll(/voice_note_(\d+)/g))[0]?.[1]}.webm`}
                type="audio/webm" 
              />
              <source 
                src={`/uploads/${Array.from(audioUrl.matchAll(/voice_note_(\d+)/g))[0]?.[1]}.mp3`}
                type="audio/mpeg" 
              />
            </>
          )}
          
          {/* URL dengan lokasi absolut */}
          <source src={getFullUrl(audioUrl)} type="audio/webm" />
          <source src={getFullUrl(audioUrl.replace('.webm', '.mp3'))} type="audio/mpeg" />
          
          {/* Pesan fallback jika audio tidak didukung */}
          Browser Anda tidak mendukung pemutaran audio.
        </audio>
        
        {/* Player control */}
        <div className="bg-[#394733] px-3 py-2">
          <div className="flex items-center justify-between">
            <div 
              className="w-10 h-10 flex items-center justify-center bg-[#2c3627] hover:bg-[#22291e] rounded-full mr-3 cursor-pointer"
              onClick={togglePlayPause}
              style={{pointerEvents: hasAudio ? 'auto' : 'none'}}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-white" />
              ) : (
                <Play className="h-5 w-5 text-white ml-0.5" />
              )}
            </div>
            
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
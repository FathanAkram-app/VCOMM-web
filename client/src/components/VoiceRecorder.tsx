import React, { useState } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { Mic, StopCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onSendAudio: (audioBlob: Blob, audioUrl: string) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSendAudio, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    clearBlobUrl
  } = useReactMediaRecorder({
    audio: true,
    video: false,
    onStop: (blobUrl, blob) => {
      console.log('Recording stopped, blob URL:', blobUrl);
      if (blob) {
        setRecordedBlob(blob);
      }
    },
  });
  
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const handleStartRecording = () => {
    setIsRecording(true);
    startRecording();
    
    // Mulai timer untuk durasi rekaman
    setAudioDuration(0);
    const interval = setInterval(() => {
      setAudioDuration(prev => prev + 1);
    }, 1000);
    
    setTimerInterval(interval);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    stopRecording();
    
    // Hentikan timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
    clearBlobUrl();
    onCancel();
  };

  // Format durasi ke format mm:ss
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSendAudio = () => {
    if (recordedBlob && mediaBlobUrl) {
      console.log('Voice recording complete. Blob:', recordedBlob, 'URL:', mediaBlobUrl);
      console.log('Uploading and sending voice message...');
      
      // Deteksi tipe MIME untuk memastikan format yang benar
      const fileType = recordedBlob.type || 'audio/wav';
      console.log('Detected audio blob type:', fileType);
      
      // Bentuk nama file berdasarkan waktu
      const fileName = `voice_note_${Date.now()}.mp3`;
      console.log('Creating audio file with name:', fileName, 'and type:', fileType);
      
      onSendAudio(recordedBlob, mediaBlobUrl);
    } else if (mediaBlobUrl) {
      // Jika recordedBlob tidak tersedia, buat dari URL
      fetch(mediaBlobUrl)
        .then(response => response.blob())
        .then(blob => {
          const fileType = blob.type || 'audio/wav';
          const fileName = `voice_note_${Date.now()}.mp3`;
          console.log('Creating audio file with name:', fileName, 'and type:', fileType);
          
          onSendAudio(blob, mediaBlobUrl);
        })
        .catch(err => console.error('Error creating blob from URL:', err));
    }
  };

  return (
    <div className="flex items-center w-full p-2 bg-[#262626] rounded-lg">
      {/* Indikator merekam */}
      <div className="flex-1 flex items-center">
        {isRecording ? (
          <>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
              <span className="text-white text-sm">Merekam...</span>
            </div>
            <span className="ml-3 text-sm text-gray-400">{formatDuration(audioDuration)}</span>
          </>
        ) : status === 'stopped' ? (
          <>
            <Mic className="mr-2 h-5 w-5 text-green-500" />
            <span className="text-white text-sm">Pesan suara siap dikirim</span>
            <span className="ml-3 text-sm text-gray-400">{formatDuration(audioDuration)}</span>
          </>
        ) : (
          <>
            <Mic className="mr-2 h-5 w-5 text-[#a6c455]" />
            <span className="text-white text-sm">Klik tombol mikrofon untuk mulai merekam</span>
          </>
        )}
      </div>

      {/* Tombol aksi */}
      <div className="flex space-x-2">
        {/* Tombol rekam/stop */}
        {isRecording ? (
          <Button 
            type="button"
            size="icon"
            variant="destructive"
            onClick={handleStopRecording}
            title="Berhenti merekam"
          >
            <StopCircle className="h-5 w-5" />
          </Button>
        ) : status !== 'stopped' ? (
          <Button 
            type="button"
            size="icon"
            variant="default"
            className="bg-[#596e2d] hover:bg-[#6a8336]"
            onClick={handleStartRecording}
            title="Mulai merekam"
          >
            <Mic className="h-5 w-5" />
          </Button>
        ) : null}

        {/* Tombol kirim (hanya setelah rekaman selesai) */}
        {status === 'stopped' && mediaBlobUrl && (
          <Button 
            type="button"
            size="icon"
            variant="default"
            className="bg-[#596e2d] hover:bg-[#6a8336]"
            onClick={handleSendAudio}
            title="Kirim pesan suara"
          >
            <Send className="h-5 w-5" />
          </Button>
        )}

        {/* Tombol batal */}
        <Button 
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          title="Batal"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
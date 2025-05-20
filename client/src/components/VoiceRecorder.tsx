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
      // Kita akan menggunakan tombol kirim manual
      console.log('Recording stopped, blob URL:', blobUrl);
      // Simpan blob ke state lokal supaya bisa diakses nanti
      if (blob) {
        setRecordedBlob(blob);
      }
    },
  });
  
  // Simpan blob audio yang direkam dalam state
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
            onClick={() => {
              if (recordedBlob && mediaBlobUrl) {
                console.log('Sending audio with blob:', recordedBlob);
                onSendAudio(recordedBlob, mediaBlobUrl);
              } else if (mediaBlobUrl) {
                // Buat audio blob dari URL jika recordedBlob tidak tersedia
                fetch(mediaBlobUrl as string)
                  .then(response => response.blob())
                  .then(blob => {
                    console.log('Created blob from URL:', blob);
                    if (mediaBlobUrl) {
                      onSendAudio(blob, mediaBlobUrl);
                    }
                  })
                  .catch(err => console.error('Error fetching audio blob:', err));
              }
            }}
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
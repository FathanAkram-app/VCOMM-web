import { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onSendAudio: (blob: Blob, url: string) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSendAudio, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordingComplete, setRecordingComplete] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-start recording
  useEffect(() => {
    startRecording();
    return () => {
      // Cleanup if component unmounts
      stopRecording();
      clearTimerInterval();
    };
  }, []);
  
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });
      
      mediaRecorder.addEventListener('stop', () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          setRecordingComplete(true);
        }
        
        stream.getTracks().forEach(track => track.stop());
      });
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Automatically stop after 5 minutes (300 seconds)
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 300000);
      
    } catch (error) {
      console.error('Error starting voice recording:', error);
      alert('Tidak dapat memulai perekaman. Pastikan mikrofon Anda terhubung dan izin diberikan.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearTimerInterval();
    }
  };
  
  const clearTimerInterval = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  const handleSendAudio = () => {
    if (audioUrl) {
      // Get the blob from audioChunksRef
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      onSendAudio(audioBlob, audioUrl);
    }
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  return (
    <div className="p-2 bg-[#252525] rounded-md border border-[#444444]">
      <div className="flex items-center justify-between">
        {isRecording ? (
          <>
            {/* Recording state */}
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-[#cccccc] text-sm">
                Merekam... {formatTime(recordingTime)}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-400 hover:bg-[#333333]"
              onClick={stopRecording}
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          </>
        ) : recordingComplete ? (
          <>
            {/* Preview state */}
            <div className="flex items-center space-x-2">
              <div className="text-[#a6c455] text-sm">
                <span>Pesan Suara {formatTime(recordingTime)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="text-gray-400 hover:text-white hover:bg-[#333333]"
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-[#a6c455] hover:text-green-400 hover:bg-[#333333]"
                onClick={handleSendAudio}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Initial state - should not be visible as we auto-start */}
            <div className="flex items-center space-x-2">
              <span className="text-[#cccccc] text-sm">Siap untuk merekam</span>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="text-gray-400 hover:text-white hover:bg-[#333333]"
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-[#a6c455] hover:text-green-400 hover:bg-[#333333]"
                onClick={startRecording}
              >
                <Mic className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
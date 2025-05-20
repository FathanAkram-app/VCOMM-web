import { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onSendAudio: (blob: Blob, url: string, duration?: number) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSendAudio, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordingComplete, setRecordingComplete] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const actualDurationRef = useRef<number>(0);
  
  // Logging for debugging
  useEffect(() => {
    console.log("VoiceRecorder mounted, isRecording:", isRecording);
    return () => console.log("VoiceRecorder unmounted");
  }, []);
  
  // Auto-start recording when component mounts
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
      console.log("Starting voice recording...");
      audioChunksRef.current = [];
      setRecordingTime(0);
      actualDurationRef.current = 0;
      
      // Request audio permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // Set up MediaRecorder with appropriate options
      const options = { mimeType: 'audio/webm;codecs=opus' };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
        console.log("Using WebM audio format");
      } catch (e) {
        // Fallback to default format if WebM not supported
        recorder = new MediaRecorder(stream);
        console.log("Using default audio format");
      }
      
      mediaRecorderRef.current = recorder;
      
      // Set up dataavailable event handler
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) {
          console.log(`Received audio chunk of size: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        }
      });
      
      // Set up stop event handler
      recorder.addEventListener('stop', () => {
        console.log("MediaRecorder stopped, processing recorded audio...");
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length > 0) {
          // Save the final recording duration
          const finalDuration = recordingTime;
          actualDurationRef.current = finalDuration;
          
          // Create blob and URL from collected chunks
          const audioType = 'audio/webm'; // This format is widely supported
          const blob = new Blob(audioChunksRef.current, { type: audioType });
          
          // Create a temporary audio element to get actual duration
          const tempAudio = new Audio();
          const tempUrl = URL.createObjectURL(blob);
          tempAudio.src = tempUrl;
          
          // Ensure we have a valid duration
          actualDurationRef.current = finalDuration > 0 ? finalDuration : 1;
          
          // Listen for metadata to retrieve actual duration
          tempAudio.addEventListener('loadedmetadata', () => {
            const actualDuration = Math.ceil(tempAudio.duration);
            if (actualDuration > 0) {
              console.log(`Audio duration from metadata: ${actualDuration}s`);
              actualDurationRef.current = actualDuration;
              
              // Update the UI to show the correct duration
              setRecordingTime(actualDuration);
            } else {
              console.log(`Using timer-based duration: ${finalDuration}s`);
            }
            
            // Clean up the temporary URL
            URL.revokeObjectURL(tempUrl);
          });
          
          const url = URL.createObjectURL(blob);
          console.log(`Created audio blob of size: ${blob.size} bytes, timer duration: ${finalDuration}s`);
          
          setAudioBlob(blob);
          setAudioUrl(url);
          setRecordingComplete(true);
        } else {
          console.error("No audio data recorded");
          alert("Tidak ada audio yang terekam. Silakan coba lagi.");
          setIsRecording(false);
        }
      });
      
      // Set up recorder with small timeslice for more frequent dataavailable events
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      console.log("MediaRecorder started");
      
      // Start timer for UI display
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          return newTime;
        });
      }, 1000);
      
      // Safety mechanism: automatically stop after 2 minutes
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          console.log("Auto-stopping recording after timeout");
          stopRecording();
        }
      }, 120000);
      
    } catch (error) {
      console.error('Error starting voice recording:', error);
      alert('Tidak dapat memulai perekaman. Pastikan mikrofon Anda terhubung dan izin diberikan.');
      onCancel();
    }
  };
  
  const stopRecording = () => {
    console.log("Stopping recording, current state:", 
                mediaRecorderRef.current ? mediaRecorderRef.current.state : "no recorder");
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
        console.log("MediaRecorder stopped successfully");
      } catch (e) {
        console.error("Error stopping MediaRecorder:", e);
      }
    }
    
    setIsRecording(false);
    clearTimerInterval();
  };
  
  const clearTimerInterval = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  const handleSendAudio = () => {
    if (audioUrl && audioBlob) {
      // Ensure we have the final duration before sending
      if (actualDurationRef.current === 0 && recordingTime > 0) {
        actualDurationRef.current = recordingTime;
      }
      
      console.log(`Sending audio, duration: ${actualDurationRef.current}s, size: ${audioBlob.size} bytes`);
      onSendAudio(audioBlob, audioUrl, actualDurationRef.current);
    } else {
      console.error("Cannot send audio: missing blob or URL");
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
            {/* Preview state - after recording */}
            <div className="flex items-center space-x-2">
              <div className="text-[#a6c455] text-sm">
                <span>Pesan Suara {formatTime(actualDurationRef.current)}</span>
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
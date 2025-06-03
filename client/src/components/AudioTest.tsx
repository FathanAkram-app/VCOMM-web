import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Mic, MicOff, Volume2, VolumeX, Play, Square } from "lucide-react";

export default function AudioTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [testResults, setTestResults] = useState<string[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startMicrophoneTest = async () => {
    try {
      addTestResult("🎤 Testing microphone access...");
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setStream(mediaStream);
      addTestResult("✅ Microphone access granted");
      
      // Setup audio level monitoring
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(mediaStream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      microphone.connect(analyser);
      
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        
        // Draw waveform
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#4a7c59';
            ctx.beginPath();
            
            const sliceWidth = canvas.width / bufferLength;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
              const v = dataArray[i] / 128.0;
              const y = v * canvas.height / 2;
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              
              x += sliceWidth;
            }
            
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      addTestResult("🔊 Audio level monitoring started");
      
      // Setup recording
      const mediaRecorder = new MediaRecorder(mediaStream);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setRecordedBlob(blob);
        addTestResult("📁 Recording saved");
      };
      
      mediaRecorderRef.current = mediaRecorder;
      
    } catch (error) {
      addTestResult(`❌ Microphone test failed: ${error}`);
      console.error('Microphone test error:', error);
    }
  };

  const startRecording = () => {
    if (mediaRecorderRef.current && stream) {
      setIsRecording(true);
      mediaRecorderRef.current.start();
      addTestResult("🔴 Recording started");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsRecording(false);
      mediaRecorderRef.current.stop();
      addTestResult("⏹️ Recording stopped");
    }
  };

  const playRecording = () => {
    if (recordedBlob && audioRef.current) {
      const url = URL.createObjectURL(recordedBlob);
      audioRef.current.src = url;
      audioRef.current.play();
      setIsPlaying(true);
      addTestResult("▶️ Playing recording");
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
        addTestResult("⏹️ Playback finished");
      };
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      addTestResult("⏹️ Playback stopped");
    }
  };

  const testSpeakers = () => {
    addTestResult("🔊 Testing speakers with test tone...");
    
    // Create test tone
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 440; // A4 note
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    
    setTimeout(() => {
      oscillator.stop();
      addTestResult("✅ Speaker test tone completed");
    }, 1000);
  };

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsRecording(false);
    setIsPlaying(false);
    setAudioLevel(0);
    addTestResult("🧹 Cleanup completed");
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return (
    <div className="p-4 space-y-4">
      <Card className="bg-gray-800 border-green-600">
        <CardHeader>
          <CardTitle className="text-green-400">Audio System Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Microphone Test */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-green-300">Microphone Test</h3>
            <div className="flex gap-2">
              <Button 
                onClick={startMicrophoneTest}
                disabled={!!stream}
                className="bg-green-600 hover:bg-green-700"
              >
                <Mic className="w-4 h-4 mr-2" />
                Start Mic Test
              </Button>
              
              <Button 
                onClick={cleanup}
                disabled={!stream}
                variant="destructive"
              >
                <MicOff className="w-4 h-4 mr-2" />
                Stop Test
              </Button>
            </div>
            
            {stream && (
              <div className="space-y-2">
                <div className="bg-gray-700 p-2 rounded">
                  <p className="text-sm text-green-300">Audio Level: {Math.round(audioLevel)}</p>
                  <div className="w-full bg-gray-600 rounded h-2">
                    <div 
                      className="bg-green-500 h-2 rounded transition-all duration-100"
                      style={{ width: `${Math.min(100, (audioLevel / 128) * 100)}%` }}
                    />
                  </div>
                </div>
                
                <canvas 
                  ref={canvasRef}
                  width={400}
                  height={100}
                  className="w-full border border-green-600 rounded bg-gray-900"
                />
              </div>
            )}
          </div>

          {/* Recording Test */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-green-300">Recording Test</h3>
            <div className="flex gap-2">
              <Button 
                onClick={startRecording}
                disabled={!stream || isRecording}
                className="bg-red-600 hover:bg-red-700"
              >
                <Mic className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
              
              <Button 
                onClick={stopRecording}
                disabled={!isRecording}
                variant="outline"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>
            </div>
          </div>

          {/* Playback Test */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-green-300">Speaker Test</h3>
            <div className="flex gap-2">
              <Button 
                onClick={testSpeakers}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Test Speakers
              </Button>
              
              <Button 
                onClick={playRecording}
                disabled={!recordedBlob || isPlaying}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Play Recording
              </Button>
              
              <Button 
                onClick={stopPlayback}
                disabled={!isPlaying}
                variant="outline"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Playback
              </Button>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-green-300">Test Results</h3>
            <div className="bg-gray-900 p-3 rounded max-h-40 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm text-gray-300 font-mono">
                  {result}
                </div>
              ))}
            </div>
          </div>

          <audio ref={audioRef} className="hidden" />
        </CardContent>
      </Card>
    </div>
  );
}
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Phone, Camera } from 'lucide-react';
import { useCall } from '@/hooks/useCall';
import { useLocation } from 'wouter';

/**
 * GroupVideoCallSimple - Sistem group video call yang bersih dan sederhana
 * 
 * Pendekatan baru:
 * 1. Video dan audio aktif dari awal
 * 2. Stream management yang lebih simple
 * 3. Error handling yang lebih baik
 * 4. State management yang clear
 */
export default function GroupVideoCallSimple() {
  const { activeCall, hangupCall, toggleCallAudio, toggleCallVideo, switchCallCamera } = useCall();
  const [, setLocation] = useLocation();
  
  // Local video refs and state
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  // Remote participants state
  const [participants, setParticipants] = useState<Array<{
    userId: number;
    userName: string;
    stream: MediaStream | null;
    videoRef: React.RefObject<HTMLVideoElement>;
  }>>([]);

  // Initialize local media stream saat component mount
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        console.log('[GroupVideoCallSimple] Initializing media with video enabled from start...');
        
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1
          },
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: 'user'
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('[GroupVideoCallSimple] ✅ Got media stream:', {
          id: stream.id,
          active: stream.active,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length
        });

        setLocalStream(stream);

        // Ensure video track is enabled
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          setIsVideoEnabled(true);
          console.log('[GroupVideoCallSimple] ✅ Video enabled from start');
        }

        // Attach to local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(console.warn);
          console.log('[GroupVideoCallSimple] ✅ Local video attached and playing');
        }

      } catch (error) {
        console.error('[GroupVideoCallSimple] ❌ Failed to get media:', error);
        alert('Gagal mengakses kamera/mikrofon. Pastikan izin sudah diberikan.');
      }
    };

    initializeMedia();

    // Cleanup saat component unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        console.log('[GroupVideoCallSimple] 🧹 Local stream cleaned up');
      }
    };
  }, []);

  // Update local video ref saat stream berubah
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(console.warn);
    }
  }, [localStream]);

  // Update participants dari activeCall
  useEffect(() => {
    if (activeCall?.participants) {
      console.log('[GroupVideoCallSimple] Updating participants:', activeCall.participants);
      
      const newParticipants = activeCall.participants
        .filter(p => p.userId !== activeCall.groupId) // Filter out self
        .map(p => ({
          userId: p.userId,
          userName: p.userName,
          stream: p.stream,
          videoRef: React.createRef<HTMLVideoElement>()
        }));
      
      setParticipants(newParticipants);
    }
  }, [activeCall?.participants]);

  // Handle video toggle
  const handleVideoToggle = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('[GroupVideoCallSimple] Video toggled:', videoTrack.enabled);
      }
    }
    toggleCallVideo();
  };

  // Handle audio toggle
  const handleAudioToggle = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('[GroupVideoCallSimple] Audio toggled:', audioTrack.enabled);
      }
    }
    toggleCallAudio();
  };

  // Handle camera switch
  const handleCameraSwitch = async () => {
    try {
      console.log('[GroupVideoCallSimple] Switching camera...');
      await switchCallCamera();
    } catch (error) {
      console.error('[GroupVideoCallSimple] Camera switch failed:', error);
    }
  };

  // Handle hangup
  const handleHangup = () => {
    console.log('[GroupVideoCallSimple] Hanging up call...');
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    hangupCall();
    setLocation('/chat');
  };

  if (!activeCall || !activeCall.isGroupCall) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-xl mb-4">Tidak ada panggilan grup aktif</h2>
          <Button onClick={() => setLocation('/chat')} variant="outline">
            Kembali ke Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{activeCall.groupName}</h2>
          <p className="text-sm text-gray-400">
            Panggilan Grup • {participants.length + 1} peserta
          </p>
        </div>
        <div className="text-sm text-gray-400">
          Status: {activeCall.status}
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 grid gap-4" style={{ 
        gridTemplateColumns: participants.length === 0 ? '1fr' : 
                            participants.length === 1 ? '1fr 1fr' :
                            participants.length <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'
      }}>
        {/* Local Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // Mirror effect
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
            Anda {isVideoEnabled ? '' : '(Video Off)'}
          </div>
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
              <VideoOff size={32} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* Remote Participants */}
        {participants.map((participant) => (
          <ParticipantVideo key={participant.userId} participant={participant} />
        ))}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex items-center justify-center gap-4">
        <Button
          variant={isAudioEnabled ? "default" : "destructive"}
          size="lg"
          onClick={handleAudioToggle}
          className="rounded-full w-12 h-12 p-0"
        >
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </Button>

        <Button
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
          onClick={handleVideoToggle}
          className="rounded-full w-12 h-12 p-0"
        >
          {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </Button>

        {isVideoEnabled && (
          <Button
            variant="outline"
            size="lg"
            onClick={handleCameraSwitch}
            className="rounded-full w-12 h-12 p-0"
          >
            <Camera size={20} />
          </Button>
        )}

        <Button
          variant="destructive"
          size="lg"
          onClick={handleHangup}
          className="rounded-full w-12 h-12 p-0"
        >
          <Phone size={20} />
        </Button>
      </div>
    </div>
  );
}

// Component untuk menampilkan video participant
function ParticipantVideo({ participant }: { 
  participant: {
    userId: number;
    userName: string;
    stream: MediaStream | null;
    videoRef: React.RefObject<HTMLVideoElement>;
  }
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
      videoRef.current.play().catch(console.warn);
      
      const videoTracks = participant.stream.getVideoTracks();
      setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);
      
      console.log(`[ParticipantVideo] Stream attached for ${participant.userName}:`, {
        streamId: participant.stream.id,
        videoTracks: videoTracks.length,
        videoEnabled: videoTracks[0]?.enabled
      });
    }
  }, [participant.stream]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      {participant.stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2 mx-auto">
              <span className="text-xl font-semibold">
                {participant.userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-sm">{participant.userName}</p>
            {!hasVideo && <p className="text-xs text-gray-400 mt-1">Video Off</p>}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
        {participant.userName}
      </div>
    </div>
  );
}
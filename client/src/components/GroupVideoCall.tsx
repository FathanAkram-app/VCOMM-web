import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface GroupVideoCallProps {
  groupCallId: string;
  onBack: () => void;
}

export default function GroupVideoCall({ groupCallId, onBack }: GroupVideoCallProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [participants, setParticipants] = useState<any[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    initializeGroupVideoCall();
    return () => {
      cleanup();
    };
  }, [groupCallId]);

  const initializeGroupVideoCall = async () => {
    try {
      console.log('[GroupVideoCall] Initializing group video call:', groupCallId);
      
      // Get video and audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setLocalStream(stream);
      
      // Set local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Connect to WebSocket for group call
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[GroupVideoCall] WebSocket connected');
        // Join the group call
        ws.send(JSON.stringify({
          type: 'join_group_call',
          payload: {
            groupCallId,
            userId: user?.id,
            callType: 'video'
          }
        }));
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      ws.onclose = () => {
        console.log('[GroupVideoCall] WebSocket disconnected');
        setIsConnected(false);
      };

    } catch (error) {
      console.error('[GroupVideoCall] Error initializing group video call:', error);
      alert('Gagal mengakses camera/microphone. Periksa permissions browser Anda.');
    }
  };

  const handleWebSocketMessage = (message: any) => {
    console.log('[GroupVideoCall] Received message:', message);
    
    switch (message.type) {
      case 'group_call_participant_joined':
        console.log('[GroupVideoCall] Participant joined:', message.payload);
        setParticipants(prev => {
          const existingIndex = prev.findIndex(p => p.userId === message.payload.userId);
          if (existingIndex >= 0) {
            return prev;
          }
          return [...prev, message.payload];
        });
        break;
        
      case 'group_call_participant_left':
        console.log('[GroupVideoCall] Participant left:', message.payload);
        setParticipants(prev => prev.filter(p => p.userId !== message.payload.userId));
        break;
        
      case 'group_call_ended':
        console.log('[GroupVideoCall] Group call ended');
        onBack();
        break;
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        // Notify other participants
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'group_call_mute_status',
            payload: {
              groupCallId,
              userId: user?.id,
              isMuted: !audioTrack.enabled
            }
          }));
        }
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        // Notify other participants
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'group_call_video_status',
            payload: {
              groupCallId,
              userId: user?.id,
              isVideoEnabled: videoTrack.enabled
            }
          }));
        }
      }
    }
  };

  const endCall = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'leave_group_call',
        payload: {
          groupCallId,
          userId: user?.id
        }
      }));
    }
    cleanup();
    onBack();
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#171717] text-white">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-[#333333] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-[#a6c455] hover:bg-[#333333] h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h3 className="text-white font-semibold">Group Video Call</h3>
            <p className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Local video */}
        <div className="relative bg-[#2a2a2a] rounded-lg overflow-hidden aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 rounded px-2 py-1">
            <span className="text-sm text-white">{user?.callsign || 'You'}</span>
            {isMuted && <span className="ml-2 text-red-400">🔇</span>}
            {!isVideoEnabled && <span className="ml-2 text-red-400">📹</span>}
          </div>
        </div>

        {/* Participant videos */}
        {participants.map((participant, index) => (
          <div key={participant.userId} className="relative bg-[#2a2a2a] rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            {/* Placeholder for participant video */}
            <div className="w-20 h-20 bg-[#555555] rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {participant.username?.substring(0, 2).toUpperCase() || `U${index + 1}`}
              </span>
            </div>
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 rounded px-2 py-1">
              <span className="text-sm text-white">{participant.username || `User ${index + 1}`}</span>
              {participant.isMuted && <span className="ml-2 text-red-400">🔇</span>}
              {!participant.isVideoEnabled && <span className="ml-2 text-red-400">📹</span>}
            </div>
          </div>
        ))}

        {/* Empty slots for more participants */}
        {participants.length < 5 && (
          <div className="bg-[#2a2a2a] rounded-lg aspect-video flex items-center justify-center border-2 border-dashed border-[#444444]">
            <p className="text-gray-400 text-center">
              Waiting for more<br />participants...
            </p>
          </div>
        )}
      </div>

      {/* Call Status */}
      <div className="text-center py-4">
        <p className="text-sm text-gray-400">
          {participants.length + 1} participant{participants.length !== 0 ? 's' : ''} in call
        </p>
      </div>

      {/* Call Controls */}
      <div className="bg-[#1a1a1a] border-t border-[#333333] p-6">
        <div className="flex justify-center space-x-6">
          <Button
            variant={isMuted ? "destructive" : "outline"}
            size="lg"
            onClick={toggleMute}
            className="rounded-full w-16 h-16"
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          
          <Button
            variant={!isVideoEnabled ? "destructive" : "outline"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-16 h-16"
          >
            {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          
          <Button
            variant="destructive"
            size="lg"
            onClick={endCall}
            className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
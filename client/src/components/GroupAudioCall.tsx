import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface GroupAudioCallProps {
  groupCallId: string;
  onBack: () => void;
}

export default function GroupAudioCall({ groupCallId, onBack }: GroupAudioCallProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    initializeGroupAudioCall();
    return () => {
      cleanup();
    };
  }, [groupCallId]);

  const initializeGroupAudioCall = async () => {
    try {
      console.log('[GroupAudioCall] Initializing group audio call:', groupCallId);
      
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      
      // Connect to WebSocket for group call
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[GroupAudioCall] WebSocket connected');
        // Join the group call
        ws.send(JSON.stringify({
          type: 'join_group_call',
          payload: {
            groupCallId,
            userId: user?.id,
            callType: 'audio'
          }
        }));
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      ws.onclose = () => {
        console.log('[GroupAudioCall] WebSocket disconnected');
        setIsConnected(false);
      };

    } catch (error) {
      console.error('[GroupAudioCall] Error initializing group audio call:', error);
      alert('Gagal mengakses microphone. Periksa permissions browser Anda.');
    }
  };

  const handleWebSocketMessage = (message: any) => {
    console.log('[GroupAudioCall] Received message:', message);
    
    switch (message.type) {
      case 'group_call_participant_joined':
        console.log('[GroupAudioCall] Participant joined:', message.payload);
        setParticipants(prev => {
          const existingIndex = prev.findIndex(p => p.userId === message.payload.userId);
          if (existingIndex >= 0) {
            return prev;
          }
          return [...prev, message.payload];
        });
        break;
        
      case 'group_call_participant_left':
        console.log('[GroupAudioCall] Participant left:', message.payload);
        setParticipants(prev => prev.filter(p => p.userId !== message.payload.userId));
        break;
        
      case 'group_call_ended':
        console.log('[GroupAudioCall] Group call ended');
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
            <h3 className="text-white font-semibold">Group Audio Call</h3>
            <p className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {/* Current user */}
          <div className="flex flex-col items-center p-4 bg-[#2a2a2a] rounded-lg border border-[#333333]">
            <div className="w-16 h-16 bg-[#a6c455] rounded-full flex items-center justify-center mb-3">
              <span className="text-xl font-bold text-[#171717]">
                {user?.callsign?.substring(0, 2).toUpperCase() || 'ME'}
              </span>
            </div>
            <p className="text-sm font-medium text-center">{user?.callsign || 'You'}</p>
            <p className="text-xs text-gray-400">{isMuted ? 'Muted' : 'Speaking'}</p>
          </div>

          {/* Other participants */}
          {participants.map((participant, index) => (
            <div key={participant.userId} className="flex flex-col items-center p-4 bg-[#2a2a2a] rounded-lg border border-[#333333]">
              <div className="w-16 h-16 bg-[#555555] rounded-full flex items-center justify-center mb-3">
                <span className="text-xl font-bold text-white">
                  {participant.username?.substring(0, 2).toUpperCase() || `U${index + 1}`}
                </span>
              </div>
              <p className="text-sm font-medium text-center">{participant.username || `User ${index + 1}`}</p>
              <p className="text-xs text-gray-400">{participant.isMuted ? 'Muted' : 'Speaking'}</p>
            </div>
          ))}
        </div>

        {/* Call Status */}
        <div className="text-center mb-8">
          <p className="text-lg font-medium mb-2">Group Audio Call Active</p>
          <p className="text-sm text-gray-400">
            {participants.length + 1} participant{participants.length !== 0 ? 's' : ''} connected
          </p>
        </div>
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
            variant="destructive"
            size="lg"
            onClick={endCall}
            className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Hidden audio element for remote streams */}
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
    </div>
  );
}
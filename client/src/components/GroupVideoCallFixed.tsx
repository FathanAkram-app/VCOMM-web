import React, { useState, useRef, useEffect, memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCall } from '@/hooks/useCall';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Users, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface GroupParticipant {
  userId: number;
  userName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  stream?: MediaStream | null;
}

// Optimized participant video component
const ParticipantVideo = memo(({ 
  participant, 
  videoRef,
  stream
}: { 
  participant: GroupParticipant; 
  videoRef: (el: HTMLVideoElement | null) => void;
  stream?: MediaStream | null;
}) => {
  return (
    <div className="relative bg-[#111] rounded-lg overflow-hidden border-2 border-[#333] aspect-[4/3] min-h-[120px] max-h-[160px]">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
        style={{ backgroundColor: '#111' }}
      />
      
      {/* User info overlay */}
      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        {participant.userName}
      </div>
      
      {/* Video/Audio status indicators */}
      <div className="absolute top-2 right-2 flex gap-1">
        {!participant.videoEnabled && (
          <div className="bg-red-500 rounded-full p-1">
            <VideoOff size={12} className="text-white" />
          </div>
        )}
        {!participant.audioEnabled && (
          <div className="bg-red-500 rounded-full p-1">
            <MicOff size={12} className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
});

export default function GroupVideoCallFixed() {
  const { user } = useAuth();
  const { activeCall, hangUpCall, isVideoEnabled, isAudioEnabled, toggleVideo, toggleAudio } = useCall();
  
  // State management
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [userId: number]: MediaStream }>({});
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<{ [userId: number]: RTCPeerConnection }>({});
  const videoRefs = useRef<{ [userId: number]: HTMLVideoElement | null }>({});

  // Extract group info
  const groupName = activeCall?.groupName || 'Group Call';

  // Get all users for name mapping
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/all-users'],
    enabled: !!activeCall?.participants
  });

  console.log('[GroupVideoCallFixed] Rendering with activeCall:', activeCall);

  // Initialize local media stream
  useEffect(() => {
    const initializeMedia = async () => {
      if (!activeCall) return;
      
      try {
        console.log('[GroupVideoCallFixed] Initializing local media...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true
        });
        
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log('[GroupVideoCallFixed] Local video attached');
        }
      } catch (error) {
        console.error('[GroupVideoCallFixed] Error getting media:', error);
      }
    };

    initializeMedia();

    return () => {
      // Cleanup on unmount
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeCall]);

  // Update participants list
  useEffect(() => {
    if (!activeCall?.participants || !Array.isArray(activeCall.participants)) {
      setParticipants([]);
      return;
    }

    const updatedParticipants = activeCall.participants.map((p: any) => {
      const userInfo = allUsers.find(u => u.id === p.userId);
      return {
        userId: p.userId,
        userName: userInfo?.callsign || `User ${p.userId}`,
        audioEnabled: p.audioEnabled !== false,
        videoEnabled: p.videoEnabled !== false,
        stream: remoteStreams[p.userId] || null
      };
    }).filter((p: any) => p.userId !== user?.id); // Exclude self

    setParticipants(updatedParticipants);
    console.log('[GroupVideoCallFixed] Updated participants:', updatedParticipants.length);
  }, [activeCall?.participants, allUsers, user?.id, remoteStreams]);

  // WebRTC peer connection setup
  useEffect(() => {
    if (!localStream || !participants.length) return;

    participants.forEach(participant => {
      if (peerConnections.current[participant.userId]) return; // Already exists

      console.log('[GroupVideoCallFixed] Creating peer connection for:', participant.userId);
      
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local tracks
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('[GroupVideoCallFixed] Received remote stream from:', participant.userId);
        const [remoteStream] = event.streams;
        
        if (remoteStream && remoteStream.active) {
          setRemoteStreams(prev => ({
            ...prev,
            [participant.userId]: remoteStream
          }));
          
          // Attach to video element
          const videoElement = videoRefs.current[participant.userId];
          if (videoElement) {
            videoElement.srcObject = remoteStream;
            videoElement.play().catch(console.error);
          }
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate via WebSocket
          const websocket = (window as any).__callWebSocket;
          if (websocket?.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
              type: 'group_webrtc_ice_candidate',
              payload: {
                callId: activeCall?.callId,
                candidate: event.candidate,
                targetUserId: participant.userId,
                fromUserId: user?.id
              }
            }));
          }
        }
      };

      peerConnections.current[participant.userId] = peerConnection;

      // Create offer only if we have lower ID (to avoid conflicts)
      if (user?.id && user.id < participant.userId) {
        setTimeout(() => {
          peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          }).then(offer => {
            return peerConnection.setLocalDescription(offer);
          }).then(() => {
            // Send offer via WebSocket
            const websocket = (window as any).__callWebSocket;
            if (websocket?.readyState === WebSocket.OPEN) {
              websocket.send(JSON.stringify({
                type: 'group_webrtc_offer',
                payload: {
                  callId: activeCall?.callId,
                  offer: peerConnection.localDescription,
                  targetUserId: participant.userId,
                  fromUserId: user.id
                }
              }));
            }
          }).catch(console.error);
        }, participant.userId * 200); // Staggered timing
      }
    });

    // Cleanup removed participants
    Object.keys(peerConnections.current).forEach(userIdStr => {
      const userId = parseInt(userIdStr);
      if (!participants.some(p => p.userId === userId)) {
        peerConnections.current[userId]?.close();
        delete peerConnections.current[userId];
        setRemoteStreams(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    });
  }, [participants, localStream, activeCall?.callId, user?.id]);

  // WebRTC signal handlers
  useEffect(() => {
    const handleOffer = async (event: CustomEvent) => {
      const { callId, offer, fromUserId } = event.detail;
      
      if (!activeCall || activeCall.callId !== callId) return;
      
      let peerConnection = peerConnections.current[fromUserId];
      if (!peerConnection && localStream) {
        // Create new peer connection for incoming offer
        peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        // Add local tracks
        localStream.getTracks().forEach(track => {
          peerConnection!.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          const [remoteStream] = event.streams;
          if (remoteStream && remoteStream.active) {
            setRemoteStreams(prev => ({
              ...prev,
              [fromUserId]: remoteStream
            }));
          }
        };

        peerConnections.current[fromUserId] = peerConnection;
      }

      try {
        await peerConnection!.setRemoteDescription(offer);
        const answer = await peerConnection!.createAnswer();
        await peerConnection!.setLocalDescription(answer);

        // Send answer via WebSocket
        const websocket = (window as any).__callWebSocket;
        if (websocket?.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            type: 'group_webrtc_answer',
            payload: {
              callId: activeCall.callId,
              answer: peerConnection!.localDescription,
              targetUserId: fromUserId,
              fromUserId: user?.id
            }
          }));
        }
      } catch (error) {
        console.error('[GroupVideoCallFixed] Error handling offer:', error);
      }
    };

    const handleAnswer = async (event: CustomEvent) => {
      const { callId, answer, fromUserId } = event.detail;
      
      if (!activeCall || activeCall.callId !== callId) return;
      
      const peerConnection = peerConnections.current[fromUserId];
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(answer);
        } catch (error) {
          console.error('[GroupVideoCallFixed] Error handling answer:', error);
        }
      }
    };

    const handleIceCandidate = async (event: CustomEvent) => {
      const { callId, candidate, fromUserId } = event.detail;
      
      if (!activeCall || activeCall.callId !== callId) return;
      
      const peerConnection = peerConnections.current[fromUserId];
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.error('[GroupVideoCallFixed] Error adding ICE candidate:', error);
        }
      }
    };

    window.addEventListener('group_webrtc_offer', handleOffer as EventListener);
    window.addEventListener('group_webrtc_answer', handleAnswer as EventListener);
    window.addEventListener('group_webrtc_ice_candidate', handleIceCandidate as EventListener);

    return () => {
      window.removeEventListener('group_webrtc_offer', handleOffer as EventListener);
      window.removeEventListener('group_webrtc_answer', handleAnswer as EventListener);
      window.removeEventListener('group_webrtc_ice_candidate', handleIceCandidate as EventListener);
    };
  }, [activeCall, localStream, user?.id]);

  // Video ref callback
  const setVideoRef = (userId: number) => (el: HTMLVideoElement | null) => {
    videoRefs.current[userId] = el;
    if (el && remoteStreams[userId]) {
      el.srcObject = remoteStreams[userId];
      el.play().catch(console.error);
    }
  };

  if (!activeCall) {
    return <div className="text-white">No active group call</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#111] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#333]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-[#8d9c6b] hover:bg-[#262626]"
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[#8d9c6b]" />
            <h1 className="text-lg font-semibold text-[#8d9c6b]">{groupName}</h1>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          {participants.length + 1} participants
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-full">
          {/* Local video */}
          <div className="relative bg-[#111] rounded-lg overflow-hidden border-2 border-[#8d9c6b] aspect-[4/3]">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
              style={{ backgroundColor: '#111' }}
            />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
              You
            </div>
          </div>

          {/* Remote videos */}
          {participants.map(participant => (
            <ParticipantVideo
              key={participant.userId}
              participant={participant}
              videoRef={setVideoRef(participant.userId)}
              stream={remoteStreams[participant.userId]}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 border-t border-[#333]">
        <Button
          variant="ghost"
          size="lg"
          onClick={toggleAudio}
          className={`rounded-full p-3 ${
            isAudioEnabled
              ? 'bg-[#262626] text-white hover:bg-[#333]'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={toggleVideo}
          className={`rounded-full p-3 ${
            isVideoEnabled
              ? 'bg-[#262626] text-white hover:bg-[#333]'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={hangUpCall}
          className="rounded-full p-3 bg-red-500 text-white hover:bg-red-600"
        >
          <PhoneOff size={20} />
        </Button>
      </div>
    </div>
  );
}
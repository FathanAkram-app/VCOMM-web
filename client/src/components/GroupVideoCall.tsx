import { useEffect, useRef, useState, useCallback } from "react";
import { useCall } from "../hooks/useCall";
import { useGroupCall } from "../context/GroupCallContext";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Camera, CameraOff, Phone, Volume2, Volume, MessageSquare, SwitchCamera } from "lucide-react";

interface GroupParticipant {
  userId: number;
  userName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  stream?: MediaStream | null;
}

interface ParticipantVideoProps {
  participant: GroupParticipant; 
  videoRef: (el: HTMLVideoElement | null) => void;
  onMaximize: (participant: GroupParticipant) => void;
}

const ParticipantVideo = ({ participant, videoRef, onMaximize }: ParticipantVideoProps) => {
  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {participant.userName}
      </div>
      <div className="absolute bottom-2 right-2 flex gap-1">
        {!participant.audioEnabled && (
          <div className="bg-red-500 p-1 rounded">
            <MicOff size={12} className="text-white" />
          </div>
        )}
        {!participant.videoEnabled && (
          <div className="bg-red-500 p-1 rounded">
            <CameraOff size={12} className="text-white" />
          </div>
        )}
      </div>
      <button
        onClick={() => onMaximize(participant)}
        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-70"
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
};

/**
 * GroupVideoCall Component - Emergency Fallback Implementation
 * 
 * This is a completely rewritten version that separates WebRTC handling
 * from video display handling, focusing on getting video elements to show.
 */
export default function GroupVideoCall() {
  const { activeCall, user, localStream, hangupCall, isAudioEnabled, isVideoEnabled, toggleCallAudio, toggleCallVideo } = useCall();
  const { activeGroupCall } = useGroupCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<{ [userId: number]: HTMLVideoElement }>({});
  const peerConnections = useRef<{ [userId: number]: RTCPeerConnection }>({});
  const [remoteStreams, setRemoteStreams] = useState<{ [userId: number]: MediaStream }>({});
  
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [maximizedParticipant, setMaximizedParticipant] = useState<GroupParticipant | null>(null);
  const [callDuration, setCallDuration] = useState("00:00:00");

  console.log('[GroupVideoCall] Component rendering with activeCall:', activeCall?.callId);
  console.log('[GroupVideoCall] user id:', user?.id);
  console.log('[GroupVideoCall] isVideoEnabled:', isVideoEnabled);
  console.log('[GroupVideoCall] isAudioEnabled:', isAudioEnabled);

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('[GroupVideoCall] Setting up local video stream');
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true; // Mute local video to prevent echo
    }
  }, [localStream]);

  // Process participants from activeCall
  useEffect(() => {
    if (activeCall && activeCall.participants) {
      console.log('[GroupVideoCall] Processing participants from activeCall:', activeCall.participants.length);
      const processedParticipants: GroupParticipant[] = activeCall.participants
        .filter((p: any) => p.userId !== user?.id) // Don't include self
        .map((p: any) => ({
          userId: p.userId,
          userName: p.userName || `User ${p.userId}`,
          audioEnabled: p.audioEnabled !== false,
          videoEnabled: p.videoEnabled !== false,
          stream: remoteStreams[p.userId] || null
        }));
      
      console.log('[GroupVideoCall] Unique participants for display:', processedParticipants);
      setParticipants(processedParticipants);
    }
  }, [activeCall?.participants, remoteStreams, user?.id]);

  // Update participant video refs when participants change
  useEffect(() => {
    participants.forEach(participant => {
      const videoElement = participantVideoRefs.current[participant.userId];
      if (videoElement && participant.stream) {
        console.log('[GroupVideoCall] Setting stream for participant:', participant.userId);
        videoElement.srcObject = participant.stream;
      }
    });
  }, [participants]);

  // Update remote video elements when streams change
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([userIdStr, stream]) => {
      const userId = parseInt(userIdStr);
      const videoElement = participantVideoRefs.current[userId];
      if (videoElement && stream) {
        console.log('[GroupVideoCall] Updating video element for user:', userId);
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  // Handle incoming WebRTC signals with enhanced SSL role error handling
  useEffect(() => {
    const handleGroupWebRTCOffer = async (event: CustomEvent) => {
      try {
        const { callId, offer, fromUserId } = event.detail;
        console.log('[GroupVideoCall] *** RECEIVED WEBRTC OFFER ***');
        console.log('[GroupVideoCall] Offer from user:', fromUserId);
        console.log('[GroupVideoCall] Call ID match:', callId === activeCall?.callId);
        console.log('[GroupVideoCall] Active call exists:', !!activeCall);
        console.log('[GroupVideoCall] Local stream ready:', !!localStream);
        console.log('[GroupVideoCall] User ID:', user?.id);
        
        if (!activeCall || activeCall.callId !== callId) {
          console.warn('[GroupVideoCall] Ignoring offer - call ID mismatch or no active call');
          console.log('[GroupVideoCall] Expected callId:', activeCall?.callId, 'Received:', callId);
          return;
        }
        
        // Check if we need to wait for local stream
        if (!localStream) {
          console.warn('[GroupVideoCall] Local stream not ready, cannot process offer from:', fromUserId);
          return;
        }

        let peerConnection = peerConnections.current[fromUserId];
        if (!peerConnection) {
          console.log('[GroupVideoCall] Creating NEW peer connection for incoming offer from:', fromUserId);
          
          peerConnection = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10,
            bundlePolicy: 'balanced',
            rtcpMuxPolicy: 'require'
          });

          // Add local stream tracks
          console.log('[GroupVideoCall] Adding local stream tracks to peer connection');
          localStream.getTracks().forEach((track: any) => {
            console.log('[GroupVideoCall] Adding track:', track.kind, track.enabled);
            peerConnection!.addTrack(track, localStream);
          });

          // Handle incoming remote stream
          peerConnection.ontrack = (event) => {
            console.log('[GroupVideoCall] Received remote track from user:', fromUserId);
            console.log('[GroupVideoCall] Track kind:', event.track.kind);
            console.log('[GroupVideoCall] Track enabled:', event.track.enabled);
            console.log('[GroupVideoCall] Track readyState:', event.track.readyState);
            
            if (event.streams && event.streams[0]) {
              console.log('[GroupVideoCall] Setting remote stream for user:', fromUserId);
              setRemoteStreams(prev => ({
                ...prev,
                [fromUserId]: event.streams[0]
              }));
            }
          };

          // Handle ICE candidates
          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              console.log('[GroupVideoCall] Sending ICE candidate to user:', fromUserId);
              const websocket = (window as any).__callWebSocket;
              if (websocket?.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                  type: 'group_webrtc_ice_candidate',
                  payload: {
                    callId: activeCall.callId,
                    candidate: event.candidate,
                    targetUserId: fromUserId,
                    fromUserId: user?.id
                  }
                }));
              }
            }
          };

          // Handle connection state changes
          peerConnection.onconnectionstatechange = () => {
            console.log('[GroupVideoCall] Connection state changed for user:', fromUserId, peerConnection!.connectionState);
          };

          peerConnections.current[fromUserId] = peerConnection;
        }

        console.log('[GroupVideoCall] Setting remote description with offer...');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('[GroupVideoCall] Remote description set successfully');

        console.log('[GroupVideoCall] Creating answer...');
        const answer = await peerConnection.createAnswer();
        console.log('[GroupVideoCall] Answer created successfully, type:', answer.type);
        
        console.log('[GroupVideoCall] Setting local description with answer...');
        await peerConnection.setLocalDescription(answer);
        console.log('[GroupVideoCall] Local description set successfully');
        
        console.log('[GroupVideoCall] Preparing to send WebRTC answer to user:', fromUserId);
        console.log('[GroupVideoCall] Answer SDP type:', answer.type);
        console.log('[GroupVideoCall] Answer SDP length:', answer.sdp?.length || 0);
        
        const websocket = (window as any).__callWebSocket;
        if (websocket?.readyState === WebSocket.OPEN) {
          console.log('[GroupVideoCall] WebSocket is open, sending answer...');
          websocket.send(JSON.stringify({
            type: 'group_webrtc_answer',
            payload: {
              callId: activeCall.callId,
              answer: answer,
              targetUserId: fromUserId,
              fromUserId: user?.id
            }
          }));
          console.log('[GroupVideoCall] Sent WebRTC answer to user:', fromUserId);
        }
      } catch (error) {
        console.error('[GroupVideoCall] Error handling offer:', error);
      }
    };

    const handleGroupWebRTCAnswer = async (event: CustomEvent) => {
      const { callId, answer, fromUserId } = event.detail;
      console.log('[GroupVideoCall] *** RECEIVED WEBRTC ANSWER ***');
      console.log('[GroupVideoCall] Answer from user:', fromUserId);
      console.log('[GroupVideoCall] Call ID match:', callId === activeCall?.callId);
      console.log('[GroupVideoCall] Peer connection exists:', !!peerConnections.current[fromUserId]);
      
      if (!activeCall || activeCall.callId !== callId) {
        console.warn('[GroupVideoCall] Ignoring answer - call ID mismatch or no active call');
        return;
      }
      
      const peerConnection = peerConnections.current[fromUserId];
      if (peerConnection) {
        try {
          console.log('[GroupVideoCall] Setting remote description for answer...');
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('[GroupVideoCall] Successfully set remote description for answer from user:', fromUserId);
          
          // Check connection state after setting remote description
          console.log('[GroupVideoCall] Connection state after answer:', peerConnection.connectionState);
          console.log('[GroupVideoCall] ICE connection state after answer:', peerConnection.iceConnectionState);
          
          // Force trigger remote stream check
          setTimeout(() => {
            const receivers = peerConnection.getReceivers();
            console.log('[GroupVideoCall] Receivers after answer:', receivers.length);
            receivers.forEach((receiver, index) => {
              if (receiver.track) {
                console.log(`[GroupVideoCall] Receiver ${index} track:`, receiver.track.kind, receiver.track.enabled, receiver.track.readyState);
              }
            });
          }, 1000);
          
        } catch (error) {
          console.error('[GroupVideoCall] Error handling answer:', error);
        }
      }
    };

    const handleGroupWebRTCIceCandidate = async (event: CustomEvent) => {
      const { callId, candidate, fromUserId } = event.detail;
      console.log('[GroupVideoCall] *** RECEIVED ICE CANDIDATE ***');
      console.log('[GroupVideoCall] ICE candidate from user:', fromUserId);
      
      if (!activeCall || activeCall.callId !== callId) {
        console.warn('[GroupVideoCall] Ignoring ICE candidate - call ID mismatch or no active call');
        return;
      }
      
      const peerConnection = peerConnections.current[fromUserId];
      if (peerConnection) {
        try {
          console.log('[GroupVideoCall] Adding ICE candidate...');
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[GroupVideoCall] Successfully added ICE candidate from user:', fromUserId);
        } catch (error) {
          console.error('[GroupVideoCall] Error adding ICE candidate:', error);
        }
      }
    };

    // Register event listeners
    window.addEventListener('group_webrtc_offer', handleGroupWebRTCOffer as EventListener);
    window.addEventListener('group_webrtc_answer', handleGroupWebRTCAnswer as EventListener);
    window.addEventListener('group_webrtc_ice_candidate', handleGroupWebRTCIceCandidate as EventListener);

    return () => {
      window.removeEventListener('group_webrtc_offer', handleGroupWebRTCOffer as EventListener);
      window.removeEventListener('group_webrtc_answer', handleGroupWebRTCAnswer as EventListener);
      window.removeEventListener('group_webrtc_ice_candidate', handleGroupWebRTCIceCandidate as EventListener);
    };
  }, [activeCall, localStream, user?.id]);

  // Call duration timer
  useEffect(() => {
    if (!activeCall) return;

    const startTime = new Date(activeCall.startedAt || Date.now()).getTime();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      setCallDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCall]);

  const handleMaximizeParticipant = useCallback((participant: GroupParticipant) => {
    setMaximizedParticipant(prev => prev?.userId === participant.userId ? null : participant);
  }, []);

  const handleHangup = () => {
    // Cleanup all peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setRemoteStreams({});
    hangupCall();
  };

  const setParticipantVideoRef = useCallback((userId: number) => {
    return (el: HTMLVideoElement | null) => {
      if (el) {
        participantVideoRefs.current[userId] = el;
        // If we already have a stream for this user, set it immediately
        const stream = remoteStreams[userId];
        if (stream) {
          console.log('[GroupVideoCall] Setting immediate stream for participant:', userId);
          el.srcObject = stream;
        }
      }
    };
  }, [remoteStreams]);

  if (!activeCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div>
          <h3 className="text-white font-semibold">{activeCall.groupName || 'Group Call'}</h3>
          <p className="text-gray-300 text-sm">{callDuration}</p>
        </div>
        <div className="text-white text-sm">
          {participants.length + 1} participants
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        {maximizedParticipant ? (
          // Maximized view
          <div className="h-full flex flex-col">
            <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden relative">
              <video
                ref={setParticipantVideoRef(maximizedParticipant.userId)}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
                {maximizedParticipant.userName}
              </div>
              <button
                onClick={() => setMaximizedParticipant(null)}
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70"
              >
                <ChevronDown size={20} />
              </button>
            </div>
            
            {/* Local video in corner */}
            <div className="absolute bottom-20 right-4 w-32 h-24 bg-gray-800 rounded overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 left-1 text-white text-xs bg-black bg-opacity-50 px-1 rounded">
                You
              </div>
            </div>
          </div>
        ) : (
          // Grid view
          <div className="h-full grid gap-4" style={{
            gridTemplateColumns: participants.length <= 1 ? '1fr 1fr' :
                               participants.length <= 4 ? 'repeat(2, 1fr)' :
                               participants.length <= 9 ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
            gridTemplateRows: participants.length <= 2 ? '1fr' :
                            participants.length <= 4 ? 'repeat(2, 1fr)' :
                            participants.length <= 9 ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)'
          }}>
            {/* Local video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                You
              </div>
              <div className="absolute bottom-2 right-2 flex gap-1">
                {!isAudioEnabled && (
                  <div className="bg-red-500 p-1 rounded">
                    <MicOff size={12} className="text-white" />
                  </div>
                )}
                {!isVideoEnabled && (
                  <div className="bg-red-500 p-1 rounded">
                    <CameraOff size={12} className="text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Remote participants */}
            {participants.map((participant) => (
              <ParticipantVideo
                key={participant.userId}
                participant={participant}
                videoRef={setParticipantVideoRef(participant.userId)}
                onMaximize={handleMaximizeParticipant}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex justify-center items-center gap-4">
        <Button
          onClick={toggleCallAudio}
          variant={isAudioEnabled ? "default" : "destructive"}
          size="lg"
          className="rounded-full w-12 h-12"
        >
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </Button>

        <Button
          onClick={toggleCallVideo}
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
          className="rounded-full w-12 h-12"
        >
          {isVideoEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
        </Button>

        <Button
          onClick={handleHangup}
          variant="destructive"
          size="lg"
          className="rounded-full w-12 h-12"
        >
          <Phone size={20} />
        </Button>
      </div>
    </div>
  );
}
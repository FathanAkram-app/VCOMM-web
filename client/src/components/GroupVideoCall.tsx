import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
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
    <div 
      className="relative aspect-video bg-black/80 rounded-lg overflow-hidden border-2 border-accent/30 cursor-pointer hover:border-accent/50 transition-all duration-200"
      onClick={() => onMaximize(participant)}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
      />
      
      {/* Participant Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <div className="flex items-center justify-between text-white text-sm">
          <span className="font-medium truncate">{participant.userName}</span>
          <div className="flex items-center gap-1">
            {participant.audioEnabled ? (
              <Mic className="w-3 h-3 text-green-400" />
            ) : (
              <MicOff className="w-3 h-3 text-red-400" />
            )}
            {participant.videoEnabled ? (
              <Camera className="w-3 h-3 text-green-400" />
            ) : (
              <CameraOff className="w-3 h-3 text-red-400" />
            )}
          </div>
        </div>
      </div>
      
      {/* No Video Overlay */}
      {!participant.videoEnabled && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-2 mx-auto">
              <span className="text-2xl font-bold text-accent">
                {participant.userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-400">{participant.userName}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * GroupVideoCall Component - Simplified Implementation
 * 
 * Displays group video call interface with participant video streams
 */
export default function GroupVideoCall() {
  const { user } = useAuth();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<{ [userId: number]: HTMLVideoElement }>({});
  const peerConnections = useRef<{ [userId: number]: RTCPeerConnection }>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [userId: number]: MediaStream }>({});
  const [participants, setParticipants] = useState<GroupParticipant[]>([
    {
      userId: 2,
      userName: "ALPHA1",
      audioEnabled: true,
      videoEnabled: true,
      stream: null
    },
    {
      userId: 3,
      userName: "BRAVO2", 
      audioEnabled: true,
      videoEnabled: false,
      stream: null
    }
  ]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [maximizedParticipant, setMaximizedParticipant] = useState<GroupParticipant | null>(null);

  // Initialize local media stream and WebRTC connections
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        console.log('[GroupVideoCall] Local media initialized successfully');
        
        // Start WebRTC connections with other participants
        participants.forEach(participant => {
          if (participant.userId !== user?.id) {
            createPeerConnection(participant.userId, stream);
          }
        });
        
      } catch (error) {
        console.error('[GroupVideoCall] Failed to initialize media:', error);
      }
    };

    initializeMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      // Clean up peer connections
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, []);

  // Create peer connection for a participant
  const createPeerConnection = async (participantId: number, localStream: MediaStream) => {
    try {
      console.log(`[GroupVideoCall] Creating peer connection for participant ${participantId}`);
      
      const peerConnection = new RTCPeerConnection({
        iceServers: [], // Local network only for intranet
        iceTransportPolicy: 'all'
      });

      // Add local stream tracks
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log(`[GroupVideoCall] Received remote stream from participant ${participantId}`);
        const [remoteStream] = event.streams;
        
        setRemoteStreams(prev => ({
          ...prev,
          [participantId]: remoteStream
        }));

        // Update participant with stream
        setParticipants(prev => prev.map(p => 
          p.userId === participantId 
            ? { ...p, stream: remoteStream }
            : p
        ));
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`[GroupVideoCall] Sending ICE candidate to participant ${participantId}`);
          // Send ICE candidate via WebSocket
          const ws = (window as any).groupCallWebSocket;
          if (ws) {
            ws.send(JSON.stringify({
              type: 'group_webrtc_ice_candidate',
              payload: {
                candidate: event.candidate,
                targetUserId: participantId,
                fromUserId: user?.id
              }
            }));
          }
        }
      };

      peerConnections.current[participantId] = peerConnection;

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      console.log(`[GroupVideoCall] Sending WebRTC offer to participant ${participantId}`);
      const ws = (window as any).groupCallWebSocket;
      if (ws) {
        ws.send(JSON.stringify({
          type: 'group_webrtc_offer',
          payload: {
            offer,
            targetUserId: participantId,
            fromUserId: user?.id
          }
        }));
      }

    } catch (error) {
      console.error(`[GroupVideoCall] Failed to create peer connection for participant ${participantId}:`, error);
    }
  };

  // Handle WebRTC events
  useEffect(() => {
    const handleGroupWebRTCOffer = async (event: CustomEvent) => {
      const { offer, fromUserId } = event.detail;
      console.log(`[GroupVideoCall] Received WebRTC offer from participant ${fromUserId}`);

      try {
        if (!localStream) return;

        const peerConnection = new RTCPeerConnection({
          iceServers: [],
          iceTransportPolicy: 'all'
        });

        // Add local stream
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          const [remoteStream] = event.streams;
          setRemoteStreams(prev => ({
            ...prev,
            [fromUserId]: remoteStream
          }));

          setParticipants(prev => prev.map(p => 
            p.userId === fromUserId 
              ? { ...p, stream: remoteStream }
              : p
          ));
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            const ws = (window as any).groupCallWebSocket;
            if (ws) {
              ws.send(JSON.stringify({
                type: 'group_webrtc_ice_candidate',
                payload: {
                  candidate: event.candidate,
                  targetUserId: fromUserId,
                  fromUserId: user?.id
                }
              }));
            }
          }
        };

        peerConnections.current[fromUserId] = peerConnection;

        // Set remote description and create answer
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send answer
        const ws = (window as any).groupCallWebSocket;
        if (ws) {
          ws.send(JSON.stringify({
            type: 'group_webrtc_answer',
            payload: {
              answer,
              targetUserId: fromUserId,
              fromUserId: user?.id
            }
          }));
        }

      } catch (error) {
        console.error(`[GroupVideoCall] Failed to handle WebRTC offer from ${fromUserId}:`, error);
      }
    };

    const handleGroupWebRTCAnswer = async (event: CustomEvent) => {
      const { answer, fromUserId } = event.detail;
      console.log(`[GroupVideoCall] Received WebRTC answer from participant ${fromUserId}`);

      try {
        const peerConnection = peerConnections.current[fromUserId];
        if (peerConnection) {
          await peerConnection.setRemoteDescription(answer);
        }
      } catch (error) {
        console.error(`[GroupVideoCall] Failed to handle WebRTC answer from ${fromUserId}:`, error);
      }
    };

    const handleGroupWebRTCIceCandidate = async (event: CustomEvent) => {
      const { candidate, fromUserId } = event.detail;
      console.log(`[GroupVideoCall] Received ICE candidate from participant ${fromUserId}`);

      try {
        const peerConnection = peerConnections.current[fromUserId];
        if (peerConnection) {
          await peerConnection.addIceCandidate(candidate);
        }
      } catch (error) {
        console.error(`[GroupVideoCall] Failed to handle ICE candidate from ${fromUserId}:`, error);
      }
    };

    // Add event listeners
    window.addEventListener('group_webrtc_offer', handleGroupWebRTCOffer as EventListener);
    window.addEventListener('group_webrtc_answer', handleGroupWebRTCAnswer as EventListener);
    window.addEventListener('group_webrtc_ice_candidate', handleGroupWebRTCIceCandidate as EventListener);

    return () => {
      window.removeEventListener('group_webrtc_offer', handleGroupWebRTCOffer as EventListener);
      window.removeEventListener('group_webrtc_answer', handleGroupWebRTCAnswer as EventListener);
      window.removeEventListener('group_webrtc_ice_candidate', handleGroupWebRTCIceCandidate as EventListener);
    };
  }, [localStream, user?.id]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleMaximizeParticipant = useCallback((participant: GroupParticipant) => {
    setMaximizedParticipant(participant);
  }, []);

  const handleEndCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    // Navigate back to previous page
    window.history.back();
  }, [localStream]);

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-black/90 backdrop-blur-sm border-b border-accent/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">GROUP VIDEO CALL</h1>
            <p className="text-sm text-gray-400">ALPHA SQUAD - 3 participants</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-400">● CONNECTED</span>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 p-4">
        {maximizedParticipant ? (
          /* Maximized View */
          <div className="h-full flex gap-4">
            <div className="flex-1 relative">
              <video
                autoPlay
                playsInline
                muted={false}
                className="w-full h-full object-cover rounded-lg bg-black"
              />
              <div className="absolute top-4 left-4 bg-black/70 rounded px-3 py-1">
                <span className="text-white font-medium">{maximizedParticipant.userName}</span>
              </div>
              <Button
                onClick={() => setMaximizedParticipant(null)}
                className="absolute top-4 right-4 bg-black/70 hover:bg-black/90"
                size="sm"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Thumbnail strip */}
            <div className="w-48 flex flex-col gap-2">
              {/* Local video thumbnail */}
              <div className="relative aspect-video bg-black rounded border-2 border-accent/30">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded"
                />
                <div className="absolute bottom-1 left-1 text-xs text-white bg-black/70 px-1 rounded">
                  YOU
                </div>
              </div>
              
              {/* Other participants */}
              {participants.filter(p => p.userId !== maximizedParticipant.userId).map(participant => (
                <div
                  key={participant.userId}
                  className="relative aspect-video bg-gray-800 rounded border-2 border-accent/30 cursor-pointer"
                  onClick={() => handleMaximizeParticipant(participant)}
                >
                  {participant.videoEnabled ? (
                    <video
                      autoPlay
                      playsInline
                      muted={false}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-accent">
                          {participant.userName.charAt(0)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 text-xs text-white bg-black/70 px-1 rounded">
                    {participant.userName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="h-full grid grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Local Video */}
            <div className="relative aspect-video bg-black rounded-lg border-2 border-accent/30">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1">
                <span className="text-white text-sm font-medium">YOU ({user?.callsign || "USER"})</span>
              </div>
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                      <span className="text-2xl font-bold text-accent">
                        {(user?.callsign || "U").charAt(0)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">Camera Off</p>
                  </div>
                </div>
              )}
            </div>

            {/* Remote Participants */}
            {participants.map(participant => (
              <ParticipantVideo
                key={participant.userId}
                participant={participant}
                videoRef={(el) => {
                  if (el && remoteStreams[participant.userId]) {
                    el.srcObject = remoteStreams[participant.userId];
                  }
                }}
                onMaximize={handleMaximizeParticipant}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/90 backdrop-blur-sm border-t border-accent/20 p-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={toggleAudio}
            className={`w-12 h-12 rounded-full ${isAudioEnabled ? 'bg-accent hover:bg-accent/80' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          <Button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full ${isVideoEnabled ? 'bg-accent hover:bg-accent/80' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isVideoEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </Button>

          <Button
            onClick={handleEndCall}
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700"
          >
            <Phone className="w-5 h-5" />
          </Button>

          <Button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full ${!isMuted ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {!isMuted ? <Volume2 className="w-5 h-5" /> : <Volume className="w-5 h-5" />}
          </Button>

          <Button className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-700">
            <MessageSquare className="w-5 h-5" />
          </Button>

          <Button className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-700">
            <SwitchCamera className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
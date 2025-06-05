import { useState, useEffect, useRef, useCallback } from 'react';
import { useCall } from '@/hooks/useCall';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Phone, ArrowLeft, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';

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
  const hasVideo = participant.stream && participant.videoEnabled;
  const videoElementRef = useRef<HTMLVideoElement>(null);
  
  // Ensure stream is attached to video element
  useEffect(() => {
    if (videoElementRef.current && participant.stream) {
      console.log('[ParticipantVideo] Attaching stream to video element for user:', participant.userId);
      videoElementRef.current.srcObject = participant.stream;
      videoElementRef.current.play().catch(e => 
        console.error('[ParticipantVideo] Error playing video for user:', participant.userId, e)
      );
    }
  }, [participant.stream, participant.userId]);
  
  // Forward ref to parent component
  useEffect(() => {
    if (videoElementRef.current) {
      videoRef(videoElementRef.current);
    }
  }, [videoRef]);
  
  return (
    <div className="relative bg-[#1a1a1a] rounded-lg overflow-hidden border-2 border-[#4a7c59] shadow-lg aspect-video">
      {hasVideo ? (
        <video
          ref={videoElementRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Avatar className="h-20 w-20 bg-[#7d9f7d] border-3 border-[#a6c455] shadow-lg">
            <AvatarFallback className="bg-gradient-to-br from-[#7d9f7d] to-[#5d7f5d] text-white text-xl font-bold">
              {participant.userName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      <div className="absolute bottom-1 left-1 bg-black/80 px-2 py-1 rounded border border-[#7d9f7d]/50">
        <p className="text-[#a6c455] text-xs font-medium">{participant.userName}</p>
      </div>
      
      <button
        onClick={() => onMaximize(participant)}
        className="absolute top-1 right-1 bg-black/70 p-1 rounded hover:bg-[#4a7c59]/30 transition-colors border border-[#4a7c59]/30"
      >
        <Maximize2 className="w-3 h-3 text-[#a6c455]" />
      </button>
    </div>
  );
};

export default function GroupVideoCall() {
  const { activeCall, hangupCall } = useCall();
  const { user } = useAuth();
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [maximizedParticipant, setMaximizedParticipant] = useState<GroupParticipant | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<{ [userId: number]: HTMLVideoElement }>({});
  const peerConnections = useRef<{ [userId: number]: RTCPeerConnection }>({});
  const [remoteStreams, setRemoteStreams] = useState<{ [userId: number]: MediaStream }>({});
  const createdConnections = useRef<Set<number>>(new Set());
  const connectionQueue = useRef<number[]>([]);
  const isProcessingConnection = useRef(false);

  const groupName = activeCall?.groupName || 'Unknown Group';

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/all-users'],
    enabled: !!activeCall?.participants
  });
  
  const PARTICIPANTS_PER_PAGE = 5;
  const otherParticipants = participants.filter(p => p.userId !== user?.id);
  const totalPages = Math.max(1, Math.ceil(otherParticipants.length / PARTICIPANTS_PER_PAGE));
  const startIndex = currentPage * PARTICIPANTS_PER_PAGE;
  const endIndex = startIndex + PARTICIPANTS_PER_PAGE;
  const currentPageParticipants = otherParticipants.slice(startIndex, endIndex);

  console.log('[GroupVideoCall] Component rendering with activeCall:', activeCall);
  console.log('[GroupVideoCall] user?.id:', user?.id);
  console.log('[GroupVideoCall] isVideoEnabled:', isVideoEnabled);
  console.log('[GroupVideoCall] localStream:', localStream);

  // Get user media when component mounts
  useEffect(() => {
    const getLocalMedia = async () => {
      try {
        console.log('[GroupVideoCall] Getting local media stream...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true
        });
        
        console.log('[GroupVideoCall] Got local media stream:', stream);
        console.log('[GroupVideoCall] Video tracks:', stream.getVideoTracks().length);
        console.log('[GroupVideoCall] Audio tracks:', stream.getAudioTracks().length);
        
        setLocalStream(stream);
        setIsVideoEnabled(true);
        
        // Ensure local video element gets the stream
        setTimeout(() => {
          if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.autoplay = true;
            localVideoRef.current.playsInline = true;
            localVideoRef.current.muted = true;
            console.log('[GroupVideoCall] Local video element configured');
          }
        }, 100);
      } catch (error) {
        console.error('[GroupVideoCall] Error getting local media:', error);
      }
    };

    // Only get media if we don't already have it
    if (!localStream) {
      getLocalMedia();
    }

    return () => {
      // Don't cleanup here as it causes stream to be lost
    };
  }, []);

  // Process participants when activeCall changes
  useEffect(() => {
    console.log('[GroupVideoCall] Processing participants from activeCall:', activeCall?.participants?.length);
    
    if (activeCall?.participants && allUsers.length > 0) {
      const newParticipants = activeCall.participants.map((p: any) => ({
        userId: p.userId,
        userName: allUsers.find(u => u.id === p.userId)?.callsign || p.userName || `User${p.userId}`,
        audioEnabled: true,
        videoEnabled: true,
        stream: p.userId === user?.id ? localStream : remoteStreams[p.userId] || null
      }));
      
      console.log('[GroupVideoCall] Unique participants created:', newParticipants.length);
      setParticipants(newParticipants);
    } else if (activeCall && user && allUsers.length > 0) {
      // If no participants yet, create at least the current user
      console.log('[GroupVideoCall] No participants found, creating current user participant');
      const currentUserParticipant = {
        userId: user.id,
        userName: user.callsign || 'You',
        audioEnabled: true,
        videoEnabled: true,
        stream: localStream
      };
      setParticipants([currentUserParticipant]);
    }
  }, [activeCall?.participants, user?.id, allUsers, localStream, remoteStreams]);

  // Sequential WebRTC connection setup to prevent SSL role conflicts
  useEffect(() => {
    if (participants.length > 0 && localStream && activeCall?.callId) {
      console.log('[GroupVideoCall] Setting up WebRTC connections sequentially');
      
      const otherParticipants = participants.filter(p => p.userId !== user?.id);
      
      // Add to queue
      otherParticipants.forEach(participant => {
        if (!peerConnections.current[participant.userId] && !createdConnections.current.has(participant.userId)) {
          if (!connectionQueue.current.includes(participant.userId)) {
            connectionQueue.current.push(participant.userId);
          }
        }
      });
      
      // Process queue
      processConnectionQueue();
    }
  }, [participants, localStream, activeCall?.callId]);

  // Sequential connection processing to avoid SSL role errors
  const processConnectionQueue = async () => {
    if (isProcessingConnection.current || connectionQueue.current.length === 0) {
      return;
    }
    
    isProcessingConnection.current = true;
    const userId = connectionQueue.current.shift()!;
    
    console.log('[GroupVideoCall] Processing connection for user:', userId);
    
    if (!peerConnections.current[userId] && !createdConnections.current.has(userId)) {
      try {
        console.log('[GroupVideoCall] Creating peer connection for user:', userId);
        createdConnections.current.add(userId);
        
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10,
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
          iceTransportPolicy: 'all'
        });

        // Add local stream tracks
        if (localStream) {
          localStream.getTracks().forEach(track => {
            console.log('[GroupVideoCall] Adding local track to peer connection:', track.kind);
            peerConnection.addTrack(track, localStream);
          });
        }

        // Handle incoming remote stream
        peerConnection.ontrack = (event) => {
          console.log('[GroupVideoCall] Received remote stream from user:', userId);
          console.log('[GroupVideoCall] Remote stream tracks:', event.streams[0].getTracks().length);
          console.log('[GroupVideoCall] Track details:', event.streams[0].getTracks().map(t => `${t.kind}:${t.enabled}`));
          
          const [remoteStream] = event.streams;
          
          if (remoteStream && remoteStream.active) {
            console.log('[GroupVideoCall] Setting remote stream for user:', userId);
            setRemoteStreams(prev => {
              const updated = { ...prev, [userId]: remoteStream };
              console.log('[GroupVideoCall] Updated remoteStreams keys:', Object.keys(updated));
              return updated;
            });
            
            // Update participants with new stream immediately
            setParticipants(prevParticipants => {
              const updated = prevParticipants.map(p => 
                p.userId === userId 
                  ? { ...p, stream: remoteStream }
                  : p
              );
              console.log('[GroupVideoCall] Updated participants with remote stream for user:', userId);
              return updated;
            });
            
            // Also directly attach to video element as backup
            setTimeout(() => {
              const videoElement = participantVideoRefs.current[userId];
              if (videoElement && remoteStream) {
                videoElement.srcObject = remoteStream;
                videoElement.autoplay = true;
                videoElement.playsInline = true;
                videoElement.play().catch(e => console.error('[GroupVideoCall] Error playing remote video:', e));
                console.log('[GroupVideoCall] Remote video element configured for user:', userId);
              }
            }, 100);
          }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            const websocket = (window as any).__callWebSocket;
            if (websocket?.readyState === WebSocket.OPEN) {
              websocket.send(JSON.stringify({
                type: 'group_webrtc_ice_candidate',
                payload: {
                  callId: activeCall?.callId,
                  candidate: event.candidate,
                  targetUserId: userId,
                  fromUserId: user?.id
                }
              }));
            }
          }
        };

        // Enhanced connection state handling
        peerConnection.onconnectionstatechange = () => {
          const state = peerConnection.connectionState;
          console.log('[GroupVideoCall] Connection state for user', userId, ':', state);
          
          if (state === 'failed' || state === 'disconnected') {
            console.warn(`[GroupVideoCall] Connection ${state} for user ${userId}, cleaning up`);
            cleanupConnection(userId);
          } else if (state === 'connected') {
            console.log(`[GroupVideoCall] Successfully connected to user ${userId}`);
          }
        };

        peerConnections.current[userId] = peerConnection;

        // Create and send offer
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        await peerConnection.setLocalDescription(offer);
        
        // Send offer via WebSocket
        const websocket = (window as any).__callWebSocket;
        if (websocket?.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            type: 'group_webrtc_offer',
            payload: {
              callId: activeCall?.callId,
              offer: offer,
              targetUserId: userId,
              fromUserId: user?.id
            }
          }));
          console.log('[GroupVideoCall] Sent WebRTC offer to user:', userId);
        }
        
        // Wait between connections to avoid SSL role conflicts
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('[GroupVideoCall] Error creating connection for user:', userId, error);
        createdConnections.current.delete(userId);
      }
    }
    
    isProcessingConnection.current = false;
    
    // Process next in queue
    if (connectionQueue.current.length > 0) {
      setTimeout(() => processConnectionQueue(), 100);
    }
  };

  // Clean up connection
  const cleanupConnection = (userId: number) => {
    if (peerConnections.current[userId]) {
      try {
        peerConnections.current[userId].close();
      } catch (error) {
        console.warn(`[GroupVideoCall] Error closing connection:`, error);
      }
      delete peerConnections.current[userId];
      createdConnections.current.delete(userId);
      
      setRemoteStreams(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    }
  };

  // Update video elements when remote streams change
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      const videoElement = participantVideoRefs.current[parseInt(userId)];
      if (videoElement && stream) {
        if (videoElement.srcObject !== stream) {
          console.log('[GroupVideoCall] Updating video element for user:', userId);
          videoElement.srcObject = stream;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = false;
          
          const playPromise = videoElement.play();
          if (playPromise !== undefined) {
            playPromise.catch((error: any) => {
              console.warn(`[GroupVideoCall] Autoplay failed for user ${userId}, trying muted play`);
              videoElement.muted = true;
              videoElement.play().catch((muteErr: any) => {
                console.warn(`[GroupVideoCall] Muted play failed for user ${userId}:`, muteErr);
              });
            });
          }
        }
      }
    });
  }, [remoteStreams]);

  // Handle incoming WebRTC signals with enhanced SSL role error handling
  useEffect(() => {
    const handleGroupWebRTCOffer = async (event: CustomEvent) => {
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
        
        try {
          peerConnection = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            iceTransportPolicy: 'all'
          });

          // Add local stream tracks
          localStream.getTracks().forEach(track => {
            peerConnection!.addTrack(track, localStream);
          });

          // Handle incoming remote stream with comprehensive debugging
          peerConnection.ontrack = (event) => {
            console.log('[GroupVideoCall] *** ONTRACK EVENT TRIGGERED ***');
            console.log('[GroupVideoCall] Received remote stream from user:', fromUserId);
            console.log('[GroupVideoCall] Event details:', event);
            console.log('[GroupVideoCall] Streams count:', event.streams.length);
            
            if (event.streams.length > 0) {
              const [remoteStream] = event.streams;
              console.log('[GroupVideoCall] Remote stream ID:', remoteStream.id);
              console.log('[GroupVideoCall] Remote stream active:', remoteStream.active);
              console.log('[GroupVideoCall] Remote stream tracks:', remoteStream.getTracks().length);
              console.log('[GroupVideoCall] Track details:', remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
              
              if (remoteStream && remoteStream.active) {
                console.log('[GroupVideoCall] Setting remote stream for user:', fromUserId);
                setRemoteStreams(prev => {
                  const updated = { ...prev, [fromUserId]: remoteStream };
                  console.log('[GroupVideoCall] Updated remoteStreams keys:', Object.keys(updated));
                  return updated;
                });
                
                // Update participants with new stream immediately
                setParticipants(prevParticipants => {
                  const updated = prevParticipants.map(p => 
                    p.userId === fromUserId 
                      ? { ...p, stream: remoteStream }
                      : p
                  );
                  console.log('[GroupVideoCall] Updated participants with remote stream for user:', fromUserId);
                  return updated;
                });
                
                // Immediately try to attach to video element
                setTimeout(() => {
                  const videoElement = participantVideoRefs.current[fromUserId];
                  console.log('[GroupVideoCall] Video element for user', fromUserId, ':', !!videoElement);
                  if (videoElement && remoteStream) {
                    console.log('[GroupVideoCall] Attaching stream to video element for user:', fromUserId);
                    videoElement.srcObject = remoteStream;
                    videoElement.autoplay = true;
                    videoElement.playsInline = true;
                    videoElement.muted = false;
                    
                    const playPromise = videoElement.play();
                    if (playPromise !== undefined) {
                      playPromise
                        .then(() => {
                          console.log('[GroupVideoCall] Video playing successfully for user:', fromUserId);
                        })
                        .catch((e) => {
                          console.error('[GroupVideoCall] Error playing remote video for user:', fromUserId, e);
                          // Try muted play
                          videoElement.muted = true;
                          return videoElement.play();
                        })
                        .catch((e2) => {
                          console.error('[GroupVideoCall] Muted play also failed for user:', fromUserId, e2);
                        });
                    }
                  }
                }, 100);
              }
            } else {
              console.warn('[GroupVideoCall] No streams in ontrack event from user:', fromUserId);
            }
          };

          // Handle ICE candidates
          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
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

          // Enhanced connection state handling with detailed debugging
          peerConnection.onconnectionstatechange = () => {
            const state = peerConnection!.connectionState;
            console.log('[GroupVideoCall] Connection state for user', fromUserId, ':', state);
            console.log('[GroupVideoCall] Local description set:', !!peerConnection!.localDescription);
            console.log('[GroupVideoCall] Remote description set:', !!peerConnection!.remoteDescription);
            console.log('[GroupVideoCall] ICE connection state:', peerConnection!.iceConnectionState);
            console.log('[GroupVideoCall] ICE gathering state:', peerConnection!.iceGatheringState);
            
            // Log current receivers and senders
            const receivers = peerConnection!.getReceivers();
            const senders = peerConnection!.getSenders();
            console.log('[GroupVideoCall] Active receivers:', receivers.length);
            console.log('[GroupVideoCall] Active senders:', senders.length);
            
            receivers.forEach((receiver, index) => {
              console.log(`[GroupVideoCall] Receiver ${index}:`, receiver.track?.kind, receiver.track?.enabled);
            });
            
            if (state === 'failed' || state === 'disconnected') {
              console.warn(`[GroupVideoCall] Connection ${state} for user ${fromUserId}, cleaning up`);
              cleanupConnection(fromUserId);
            } else if (state === 'connected') {
              console.log(`[GroupVideoCall] Successfully connected to user ${fromUserId}`);
              // Force check for remote streams when connected
              setTimeout(() => {
                const currentRemoteStreams = peerConnection!.getReceivers()
                  .map(receiver => receiver.track)
                  .filter(track => track !== null);
                console.log('[GroupVideoCall] Remote tracks after connection:', currentRemoteStreams.length);
              }, 1000);
            }
          };

          peerConnections.current[fromUserId] = peerConnection;
          
          console.log('[GroupVideoCall] Setting remote description with offer...');
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('[GroupVideoCall] Remote description set successfully');
          
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
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
          
          // Enhanced error recovery for SSL role errors
          if ((error as Error).message?.includes('SSL role') || (error as Error).message?.includes('transport')) {
            console.log('[GroupVideoCall] SSL role error detected, cleaning up connection for user:', fromUserId);
            cleanupConnection(fromUserId);
            
            // Retry after delay
            setTimeout(async () => {
              console.log('[GroupVideoCall] Retrying connection setup for user:', fromUserId);
              connectionQueue.current.push(fromUserId);
              processConnectionQueue();
            }, 2000);
          }
        }
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
          
          // Enhanced error recovery for SSL role errors
          if ((error as Error).message?.includes('SSL role') || (error as Error).message?.includes('transport')) {
            console.log('[GroupVideoCall] SSL role error detected, cleaning up connection for user:', fromUserId);
            cleanupConnection(fromUserId);
          }
        }
      } else {
        console.error('[GroupVideoCall] No peer connection found for user:', fromUserId);
      }
    };

    const handleGroupWebRTCIceCandidate = async (event: CustomEvent) => {
      const { callId, candidate, fromUserId } = event.detail;
      
      if (!activeCall || activeCall.callId !== callId) {
        return;
      }
      
      const peerConnection = peerConnections.current[fromUserId];
      if (peerConnection && candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[GroupVideoCall] Added ICE candidate from user:', fromUserId);
        } catch (error) {
          console.error('[GroupVideoCall] Error adding ICE candidate:', error);
        }
      }
    };

    console.log('[GroupVideoCall] Setting up WebRTC event listeners...');
    
    window.addEventListener('group_webrtc_offer', handleGroupWebRTCOffer as any);
    window.addEventListener('group_webrtc_answer', handleGroupWebRTCAnswer as any);
    window.addEventListener('group_webrtc_ice_candidate', handleGroupWebRTCIceCandidate as any);
    
    console.log('[GroupVideoCall] WebRTC event listeners registered successfully');

    return () => {
      window.removeEventListener('group_webrtc_offer', handleGroupWebRTCOffer as any);
      window.removeEventListener('group_webrtc_answer', handleGroupWebRTCAnswer as any);
      window.removeEventListener('group_webrtc_ice_candidate', handleGroupWebRTCIceCandidate as any);
    };
  }, [activeCall, localStream, user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(peerConnections.current).forEach(pc => {
        try {
          pc.close();
        } catch (error) {
          console.warn('Error closing peer connection:', error);
        }
      });
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      setRemoteStreams({});
    };
  }, []);

  // Control functions
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.style.display = isVideoEnabled ? 'none' : 'block';
    }
  };

  const handleEndCall = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close all peer connections
    Object.values(peerConnections.current).forEach(pc => {
      try {
        pc.close();
      } catch (error) {
        console.warn('Error closing peer connection:', error);
      }
    });
    
    // Clear video elements
    Object.values(participantVideoRefs.current).forEach(video => {
      if (video) {
        video.pause();
        video.srcObject = null;
        video.load();
      }
    });
    
    // Reset state
    setLocalStream(null);
    setIsVideoEnabled(false);
    setIsAudioEnabled(true);
    setParticipants([]);
    
    // Clear refs
    participantVideoRefs.current = {};
    peerConnections.current = {};
    
    hangupCall();
  };

  const nextPage = () => {
    setCurrentPage(prev => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage(prev => (prev - 1 + totalPages) % totalPages);
  };

  const handleMaximizeParticipant = useCallback((participant: GroupParticipant) => {
    setMaximizedParticipant(participant);
    setIsMaximized(true);
  }, []);

  const handleMinimize = () => {
    setIsMaximized(false);
    setMaximizedParticipant(null);
  };

  if (!activeCall || !user) {
    return null;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#1a1a1a] to-[#0d1b0d] text-white p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-[#4a7c59] p-2 rounded-lg">
            <Video className="h-6 w-6 text-[#a6c455]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#a6c455]">Video Call - {groupName}</h1>
            <p className="text-sm text-gray-400">{participants.length} participants</p>
          </div>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button onClick={prevPage} variant="outline" size="sm" className="border-[#4a7c59] text-[#a6c455]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-400">
              {currentPage + 1} / {totalPages}
            </span>
            <Button onClick={nextPage} variant="outline" size="sm" className="border-[#4a7c59] text-[#a6c455]">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Maximized View */}
      {isMaximized && maximizedParticipant && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#a6c455]">
              {maximizedParticipant.userName}
            </h2>
            <Button onClick={handleMinimize} variant="outline" size="sm" className="border-[#4a7c59] text-[#a6c455]">
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 bg-[#1a1a1a] rounded-lg overflow-hidden border-2 border-[#4a7c59] shadow-lg">
            {maximizedParticipant.userId === user.id ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : remoteStreams[maximizedParticipant.userId] && maximizedParticipant.videoEnabled ? (
              <video
                ref={(el) => {
                  if (el) participantVideoRefs.current[maximizedParticipant.userId] = el;
                }}
                autoPlay
                playsInline
                muted={false}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Avatar className="h-32 w-32 bg-[#7d9f7d] border-4 border-[#a6c455] shadow-lg">
                  <AvatarFallback className="bg-gradient-to-br from-[#7d9f7d] to-[#5d7f5d] text-white text-4xl font-bold">
                    {maximizedParticipant.userName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid View */}
      {!isMaximized && (
        <div className="flex-1 grid grid-cols-2 grid-rows-3 gap-4">
          {/* Current user video (always first slot) */}
          <div className="relative bg-[#1a1a1a] rounded-lg overflow-hidden border-2 border-[#4a7c59] shadow-lg">
            {isVideoEnabled && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Avatar className="h-20 w-20 bg-[#7d9f7d] border-3 border-[#a6c455] shadow-lg">
                  <AvatarFallback className="bg-gradient-to-br from-[#7d9f7d] to-[#5d7f5d] text-white text-xl font-bold">
                    {user.callsign?.substring(0, 2).toUpperCase() || 'ME'}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            
            <div className="absolute bottom-1 left-1 bg-black/80 px-2 py-1 rounded border border-[#7d9f7d]/50">
              <p className="text-[#a6c455] text-xs font-medium">{user.callsign || 'You'}</p>
            </div>
            
            <button
              onClick={() => handleMaximizeParticipant({
                userId: user.id,
                userName: user.callsign || 'You',
                audioEnabled: isAudioEnabled,
                videoEnabled: isVideoEnabled,
                stream: localStream
              })}
              className="absolute top-1 right-1 bg-black/70 p-1 rounded hover:bg-[#4a7c59]/30 transition-colors border border-[#4a7c59]/30"
            >
              <Maximize2 className="w-3 h-3 text-[#a6c455]" />
            </button>
          </div>

          {/* Other participants */}
          {currentPageParticipants.map((participant) => (
            <ParticipantVideo
              key={participant.userId}
              participant={{
                ...participant,
                stream: remoteStreams[participant.userId] || null
              }}
              videoRef={(el) => {
                if (el) participantVideoRefs.current[participant.userId] = el;
              }}
              onMaximize={handleMaximizeParticipant}
            />
          ))}

          {/* Empty slots */}
          {Array.from({ length: 5 - currentPageParticipants.length }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-[#0d1a0d] rounded-lg border-2 border-dashed border-[#4a7c59]/30 flex items-center justify-center"
            >
              <p className="text-gray-500 text-sm">Empty Slot</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4 mt-6">
        <Button
          onClick={toggleAudio}
          variant={isAudioEnabled ? "default" : "destructive"}
          size="lg"
          className={`w-14 h-14 rounded-full border-2 ${
            isAudioEnabled 
              ? 'bg-[#4a7c59] border-[#a6c455] hover:bg-[#5d7f5d]' 
              : 'bg-red-600 border-red-500 hover:bg-red-700'
          }`}
        >
          {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>

        <Button
          onClick={toggleVideo}
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
          className={`w-14 h-14 rounded-full border-2 ${
            isVideoEnabled 
              ? 'bg-[#4a7c59] border-[#a6c455] hover:bg-[#5d7f5d]' 
              : 'bg-red-600 border-red-500 hover:bg-red-700'
          }`}
        >
          {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </Button>

        <Button
          onClick={handleEndCall}
          variant="destructive"
          size="lg"
          className="w-14 h-14 rounded-full bg-red-600 border-2 border-red-500 hover:bg-red-700"
        >
          <Phone className="h-6 w-6 rotate-[135deg]" />
        </Button>
      </div>
    </div>
  );
}
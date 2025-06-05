import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCall } from '@/hooks/useCall';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Users, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface GroupParticipant {
  userId: number;
  userName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  stream?: MediaStream | null;
}

// Stable video component to prevent stream disconnection during re-renders
const StableParticipantVideo = memo(({ 
  participant, 
  stream, 
  onMaximize 
}: { 
  participant: GroupParticipant; 
  stream?: MediaStream | null;
  onMaximize: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Attach stream once and keep it stable
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  return (
    <div className="relative bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] rounded-lg overflow-hidden border-2 border-[#4a7c59] aspect-[4/3] min-h-[120px] max-h-[160px]">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
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
        onClick={onMaximize}
        className="absolute top-1 right-1 bg-black/70 p-1 rounded hover:bg-[#4a7c59]/30 transition-colors border border-[#4a7c59]/30"
      >
        <svg className="w-3 h-3 text-[#a6c455]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  );
});

export default function GroupVideoCall() {
  const { activeCall, hangupCall } = useCall();
  const { user } = useAuth();
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<{ [userId: number]: HTMLVideoElement }>({});
  const peerConnections = useRef<{ [userId: number]: RTCPeerConnection }>({});
  const [remoteStreams, setRemoteStreams] = useState<{ [userId: number]: MediaStream }>({});

  // Extract group info
  const groupName = activeCall?.groupName || 'Unknown Group';

  // Fetch all users to get real names
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/all-users'],
    enabled: !!activeCall?.participants
  });
  
  // Pagination constants - 2x3 grid (6 total slots, 1 for current user + 5 for participants)
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
        
        // Enable video by default for group calls
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          console.log('[GroupVideoCall] Video track enabled by default for group calls');
        }
        
        setLocalStream(stream);
        
        // Attach stream to video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log('[GroupVideoCall] Set local video source');
        }
      } catch (error) {
        console.error('[GroupVideoCall] Error getting local media:', error);
      }
    };

    if (activeCall) {
      getLocalMedia();
    }

    return () => {
      // Cleanup streams when activeCall changes or component unmounts
      console.log('[GroupVideoCall] useEffect cleanup triggered');
      cleanupMediaTracks();
    };
  }, [activeCall]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      console.log('[GroupVideoCall] Component unmounting - final cleanup');
      cleanupMediaTracks();
    };
  }, []);

  // Update local video ref when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      console.log('[GroupVideoCall] Local video stream attached to element');
      
      // Set initial video state based on track
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        setIsVideoEnabled(videoTrack.enabled);
        console.log('[GroupVideoCall] Initial video state:', videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Update participants from activeCall with stable references
  const participantsRef = useRef<string>('');
  
  useEffect(() => {
    if (activeCall?.participants && Array.isArray(activeCall.participants)) {
      // Create stable string representation to avoid unnecessary re-renders
      const participantsStr = JSON.stringify(activeCall.participants.sort());
      
      // Only update if participants actually changed
      if (participantsRef.current === participantsStr) {
        return;
      }
      
      participantsRef.current = participantsStr;
      console.log('[GroupVideoCall] Processing participants from activeCall:', activeCall.participants);
      
      // Extract participant objects and filter out current user
      const otherParticipants = activeCall.participants.filter((participant: any) => {
        // Handle both object format and ID format
        const participantId = typeof participant === 'object' ? participant.userId : participant;
        return Number(participantId) !== user?.id;
      });
      
      console.log('[GroupVideoCall] Other participants:', otherParticipants);
      
      setParticipants(prevParticipants => {
        const updatedParticipants = otherParticipants.map((participant: any) => {
          // Handle both object format and ID format
          const participantId = typeof participant === 'object' ? participant.userId : participant;
          const existingParticipant = prevParticipants.find(p => p.userId === Number(participantId));
          
          // Get real user name from allUsers data
          const realUser = allUsers.find((u: any) => u.id === Number(participantId));
          const participantName = realUser?.callsign || realUser?.fullName || `User ${participantId}`;
          
          return {
            userId: Number(participantId),
            userName: participantName,
            audioEnabled: typeof participant === 'object' ? participant.audioEnabled : true,
            videoEnabled: true, // Always enable video for all participants
            stream: existingParticipant?.stream || undefined
          };
        });
        
        console.log('[GroupVideoCall] Updated participants list:', updatedParticipants);
        return updatedParticipants;
      });
    }
  }, [activeCall?.participants, user?.id, allUsers]);

  // Track created peer connections to prevent duplicates
  const createdConnections = useRef<Set<number>>(new Set());
  
  // Setup WebRTC peer connections for group video call participants with stream preservation
  useEffect(() => {
    if (participants.length > 0 && localStream && activeCall?.callId) {
      console.log('[GroupVideoCall] Setting up WebRTC connections for participants:', participants.map(p => p.userId));
      
      participants.forEach(participant => {
        // Only create if not already created and not currently being processed
        if (!peerConnections.current[participant.userId] && !createdConnections.current.has(participant.userId)) {
          console.log('[GroupVideoCall] Creating peer connection for user:', participant.userId);
          createdConnections.current.add(participant.userId);
          
          const peerConnection = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
          });

          // Add local stream tracks to peer connection
          localStream.getTracks().forEach(track => {
            console.log('[GroupVideoCall] Adding local track to peer connection:', track.kind);
            peerConnection.addTrack(track, localStream);
          });

          // Handle incoming remote stream with stable reference
          peerConnection.ontrack = (event) => {
            console.log('[GroupVideoCall] Received remote stream from user:', participant.userId);
            const [remoteStream] = event.streams;
            
            if (remoteStream && remoteStream.active) {
              // Use callback to prevent state conflicts during re-renders
              setRemoteStreams(prev => {
                // Check if stream is already set to avoid unnecessary updates
                if (prev[participant.userId] === remoteStream) {
                  return prev;
                }
                
                return {
                  ...prev,
                  [participant.userId]: remoteStream
                };
              });
              
              console.log('[GroupVideoCall] Remote stream added to state for user:', participant.userId);
            }
          };

          // Handle ICE candidates
          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              console.log('[GroupVideoCall] Sending ICE candidate to user:', participant.userId);
              const websocket = (window as any).__callWebSocket;
              if (websocket?.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                  type: 'group_webrtc_ice_candidate',
                  payload: {
                    callId: activeCall.callId,
                    candidate: event.candidate,
                    targetUserId: participant.userId,
                    fromUserId: user?.id
                  }
                }));
              }
            }
          };

          // Handle connection state changes with restart mechanism
          peerConnection.onconnectionstatechange = () => {
            console.log('[GroupVideoCall] Connection state for user', participant.userId, ':', peerConnection.connectionState);
            
            if (peerConnection.connectionState === 'failed') {
              console.warn(`[GroupVideoCall] Connection failed for user ${participant.userId}, attempting restart`);
              
              // Restart connection after delay
              setTimeout(() => {
                if (peerConnection.connectionState === 'failed') {
                  console.log(`[GroupVideoCall] Restarting ICE for user ${participant.userId}`);
                  peerConnection.restartIce();
                }
              }, 2000);
            }
          };

          peerConnections.current[participant.userId] = peerConnection;
          
          // Create and send offer to participant
          peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          }).then(offer => {
            return peerConnection.setLocalDescription(offer);
          }).then(() => {
            console.log('[GroupVideoCall] Sending offer to user:', participant.userId);
            console.log('[GroupVideoCall] Offer details:', peerConnection.localDescription);
            
            // Send WebRTC offer through CallContext WebSocket
            const sendWebRTCOffer = () => {
              const websocket = (window as any).__callWebSocket;
              if (websocket?.readyState === WebSocket.OPEN) {
                const message = {
                  type: 'group_webrtc_offer',
                  payload: {
                    callId: activeCall.callId,
                    offer: peerConnection.localDescription,
                    targetUserId: participant.userId,
                    fromUserId: user?.id
                  }
                };
                console.log('[GroupVideoCall] ✅ Sending WebRTC offer to user', participant.userId, ':', message);
                websocket.send(JSON.stringify(message));
              } else {
                console.log('[GroupVideoCall] ⚠️ WebSocket not ready, state:', websocket?.readyState, 'retrying in 1s...');
                setTimeout(sendWebRTCOffer, 1000);
              }
            };
            
            sendWebRTCOffer();
          }).catch(error => {
            console.error('[GroupVideoCall] Error creating offer for user', participant.userId, ':', error);
          });
        }
      });

      // Cleanup connections for participants who left
      Object.keys(peerConnections.current).forEach(userIdStr => {
        const userId = parseInt(userIdStr);
        if (!participants.some(p => p.userId === userId)) {
          console.log('[GroupVideoCall] Cleaning up connection for user who left:', userId);
          peerConnections.current[userId]?.close();
          delete peerConnections.current[userId];
          setRemoteStreams(prev => {
            const updated = { ...prev };
            delete updated[userId];
            return updated;
          });
        }
      });
    }
  }, [participants, localStream, activeCall?.callId, user?.id]);

  // Auto-initiate WebRTC connections when participants change - Only if current user has lower ID to avoid conflicts
  useEffect(() => {
    if (participants.length > 0 && localStream && activeCall?.callId && user?.id) {
      console.log('[GroupVideoCall] Auto-initiating WebRTC connections for all participants');
      
      participants.forEach(participant => {
        // Only initiate if current user has lower ID to avoid simultaneous offers
        if (user.id < participant.userId) {
          const existingConnection = peerConnections.current[participant.userId];
          if (existingConnection && existingConnection.signalingState === 'stable') {
            console.log('[GroupVideoCall] Auto-creating offer for participant:', participant.userId);
            
            // Small delay to ensure proper timing
            setTimeout(() => {
              // Double check signaling state before creating offer
              if (existingConnection.signalingState === 'stable') {
                existingConnection.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true
                }).then(offer => {
                  return existingConnection.setLocalDescription(offer);
                }).then(() => {
                  console.log('[GroupVideoCall] Auto-sending offer to participant:', participant.userId);
                  const ws = (window as any).__callWebSocket;
                  if (ws?.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                      type: 'group_webrtc_offer',
                      payload: {
                        callId: activeCall.callId,
                        offer: existingConnection.localDescription,
                        targetUserId: participant.userId,
                        fromUserId: user?.id
                      }
                    }));
                  }
                }).catch(error => {
                  console.error('[GroupVideoCall] Error auto-creating offer for participant:', participant.userId, error);
                });
              }
            }, 500 + Math.random() * 1000); // Random delay to avoid conflicts
          }
        }
      });
    }
  }, [participants.length, localStream, activeCall?.callId, user?.id]);

  // Attach remote streams to video elements when streams are available
  useEffect(() => {
    Object.keys(remoteStreams).forEach(userIdStr => {
      const userId = parseInt(userIdStr);
      const stream = remoteStreams[userId];
      const videoElement = participantVideoRefs.current[userId];
      
      if (stream && videoElement && stream.active) {
        console.log(`[GroupVideoCall] Attaching stream to video element for user ${userId}`);
        
        // Prevent multiple attachments
        if (videoElement.srcObject !== stream) {
          videoElement.srcObject = stream;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = false;
          
          // Try to play with fallback
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

  // Handle incoming WebRTC signals for group video call
  useEffect(() => {
    const handleGroupWebRTCOffer = async (event: CustomEvent) => {
      const { callId, offer, fromUserId } = event.detail;
      console.log('[GroupVideoCall] Received WebRTC offer from user:', fromUserId);
      
      if (!activeCall || activeCall.callId !== callId) {
        console.log('[GroupVideoCall] Call ID mismatch, ignoring offer');
        return;
      }
      
      let peerConnection = peerConnections.current[fromUserId];
      if (!peerConnection && localStream) {
        console.log('[GroupVideoCall] Creating peer connection for new participant:', fromUserId);
        
        // Create peer connection for this user
        peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        });

        // Add local stream tracks
        localStream.getTracks().forEach(track => {
          console.log('[GroupVideoCall] Adding local track to new peer connection:', track.kind);
          peerConnection!.addTrack(track, localStream);
        });

        // Handle incoming remote stream
        peerConnection.ontrack = (event) => {
          console.log('[GroupVideoCall] Received remote stream from user:', fromUserId);
          const [remoteStream] = event.streams;
          
          if (remoteStream && remoteStream.active) {
            setRemoteStreams(prev => ({
              ...prev,
              [fromUserId]: remoteStream
            }));
            console.log('[GroupVideoCall] Remote stream added to state for user:', fromUserId);
          }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('[GroupVideoCall] Sending ICE candidate to user:', fromUserId);
            const ws = (window as any).__callWebSocket;
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'group_webrtc_ice_candidate',
                payload: {
                  callId: activeCall?.callId,
                  candidate: event.candidate,
                  targetUserId: fromUserId,
                  fromUserId: user?.id
                }
              }));
            }
          }
        };

        // Handle connection state changes with restart mechanism
        peerConnection.onconnectionstatechange = () => {
          console.log('[GroupVideoCall] Connection state for user', fromUserId, ':', peerConnection!.connectionState);
          
          if (peerConnection!.connectionState === 'failed') {
            console.warn(`[GroupVideoCall] Connection failed for user ${fromUserId}, attempting restart`);
            setTimeout(() => {
              if (peerConnection!.connectionState === 'failed') {
                console.log(`[GroupVideoCall] Restarting ICE for user ${fromUserId}`);
                peerConnection!.restartIce();
              }
            }, 2000);
          }
        };

        peerConnections.current[fromUserId] = peerConnection;
      }
      
      if (!peerConnection) {
        console.log('[GroupVideoCall] Still no peer connection available for user:', fromUserId);
        return;
      }
      
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('[GroupVideoCall] Set remote description from offer');
        
        // Create and send answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        console.log('[GroupVideoCall] Sending answer to user:', fromUserId);
        const sendAnswer = () => {
          const websocket = (window as any).__callWebSocket;
          if (websocket?.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
              type: 'group_webrtc_answer',
              payload: {
                callId: activeCall.callId,
                answer: peerConnection.localDescription,
                targetUserId: fromUserId,
                fromUserId: user?.id
              }
            }));
          } else {
            console.log('[GroupVideoCall] WebSocket not ready for answer, retrying...');
            setTimeout(sendAnswer, 500);
          }
        };
        sendAnswer();
      } catch (error) {
        console.error('[GroupVideoCall] Error handling offer:', error);
      }
    };

    const handleGroupWebRTCAnswer = async (event: CustomEvent) => {
      const { callId, answer, fromUserId } = event.detail;
      console.log('[GroupVideoCall] Received WebRTC answer from user:', fromUserId);
      
      if (activeCall?.callId !== callId) {
        console.log('[GroupVideoCall] Call ID mismatch, ignoring answer');
        return;
      }
      
      const peerConnection = peerConnections.current[fromUserId];
      if (!peerConnection) {
        console.log('[GroupVideoCall] No peer connection found for user:', fromUserId);
        return;
      }
      
      try {
        // Check if peer connection is in correct state for setting remote description
        if (peerConnection.signalingState === 'have-local-offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('[GroupVideoCall] Set remote description from answer');
        } else {
          console.warn('[GroupVideoCall] Ignoring answer - peer connection not in correct state:', peerConnection.signalingState);
        }
      } catch (error) {
        console.error('[GroupVideoCall] Error handling answer:', error);
      }
    };

    const handleGroupWebRTCIceCandidate = async (event: CustomEvent) => {
      const { callId, candidate, fromUserId } = event.detail;
      console.log('[GroupVideoCall] Received ICE candidate from user:', fromUserId);
      
      if (activeCall?.callId !== callId) {
        console.log('[GroupVideoCall] Call ID mismatch, ignoring ICE candidate');
        return;
      }
      
      const peerConnection = peerConnections.current[fromUserId];
      if (!peerConnection) {
        console.log('[GroupVideoCall] No peer connection found for user:', fromUserId);
        return;
      }
      
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[GroupVideoCall] Added ICE candidate for user:', fromUserId);
      } catch (error) {
        console.error('[GroupVideoCall] Error adding ICE candidate:', error);
      }
    };

    // Add event listeners
    window.addEventListener('group-webrtc-offer', handleGroupWebRTCOffer as any);
    window.addEventListener('group-webrtc-answer', handleGroupWebRTCAnswer as any);
    window.addEventListener('group-webrtc-ice-candidate', handleGroupWebRTCIceCandidate as any);

    // Cleanup function
    return () => {
      window.removeEventListener('group-webrtc-offer', handleGroupWebRTCOffer as any);
      window.removeEventListener('group-webrtc-answer', handleGroupWebRTCAnswer as any);
      window.removeEventListener('group-webrtc-ice-candidate', handleGroupWebRTCIceCandidate as any);
    };
  }, [activeCall?.callId, user?.id]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('[GroupVideoCall] Component unmounting, cleaning up streams');
      cleanupMediaTracks();
      
      // Clean up peer connections
      Object.values(peerConnections.current).forEach(pc => {
        if (pc) {
          pc.close();
        }
      });
      peerConnections.current = {};
      
      // Clean up remote streams
      Object.values(remoteStreams).forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      setRemoteStreams({});
      
      // Force cleanup of all media tracks in the browser
      navigator.mediaDevices.enumerateDevices().then(devices => {
        console.log('[GroupVideoCall] Available devices:', devices.length);
      }).catch(err => {
        console.log('[GroupVideoCall] Could not enumerate devices:', err);
      });
    };
  }, []); // Empty dependency array means this runs only on unmount

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('[GroupVideoCall] Video toggled:', videoTrack.enabled);
        
        // Force video element update
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          console.log('[GroupVideoCall] Video element updated');
        }
      }
    }
  };

  const cleanupMediaTracks = () => {
    console.log('[GroupVideoCall] Cleaning up media tracks');
    
    // Stop all tracks in the current stream
    if (localStream) {
      console.log('[GroupVideoCall] Stopping localStream tracks');
      localStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log('[GroupVideoCall] Stopped track:', track.kind, 'readyState:', track.readyState);
        }
      });
    }
    
    // Clear video element and remove srcObject
    if (localVideoRef.current) {
      const videoElement = localVideoRef.current;
      console.log('[GroupVideoCall] Clearing video element');
      videoElement.pause();
      videoElement.srcObject = null;
      videoElement.load(); // Force reload to clear any cached stream
      console.log('[GroupVideoCall] Cleared and reloaded video element');
    }
    
    // Clear participant video refs
    Object.values(participantVideoRefs.current).forEach(videoElement => {
      if (videoElement && videoElement.srcObject) {
        console.log('[GroupVideoCall] Clearing participant video element');
        videoElement.pause();
        videoElement.srcObject = null;
        videoElement.load();
      }
    });
    
    // Reset all states
    setLocalStream(null);
    setIsVideoEnabled(false);
    setIsAudioEnabled(true);
    setParticipants([]);
    
    // Clear participant refs
    participantVideoRefs.current = {};
    
    console.log('[GroupVideoCall] All media cleanup completed');
  };

  const handleEndCall = () => {
    console.log('[GroupVideoCall] Ending call');
    cleanupMediaTracks();
    hangupCall();
  };

  const handleBack = () => {
    console.log('[GroupVideoCall] Going back');
    cleanupMediaTracks();
    hangupCall();
  };

  const nextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  const prevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  if (!activeCall || !user) {
    return null;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#1a2f1a] via-[#0f1f0f] to-black flex flex-col">
      {/* Header - Compact for Mobile */}
      <div className="bg-gradient-to-r from-[#2d4a2d] to-[#1e3a1e] border-b border-[#4a7c59]/30 p-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-full bg-black/20 hover:bg-[#4a7c59]/30 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-[#a6c455]" />
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-full bg-[#4a7c59]/20">
              <Users className="h-4 w-4 text-[#a6c455]" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-[#a6c455]">{groupName}</h3>
              <p className="text-[10px] text-[#7d9f7d]">Video Call • {participants.length} peserta</p>
            </div>
          </div>
          
          <div className="w-8" />
        </div>
      </div>

      {/* Video Layout - 2x3 Grid with Smaller Frames for Mobile */}
      <div className="flex-1 flex flex-col p-1 bg-black">
        {!isMaximized ? (
          <>
            {/* Main 2x3 Grid - Flexible for Mobile */}
            <div className="flex-1 mb-2">
              <div className="grid grid-cols-2 gap-2 h-full">
                {/* Current User - Always first position */}
                {user && activeCall && (
                  <div className="relative bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] rounded-lg overflow-hidden border-2 border-[#4a7c59] aspect-[4/3] min-h-[120px] max-h-[160px]">
                    {/* Video element - always present */}
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ display: isVideoEnabled ? 'block' : 'none' }}
                    />
                    {/* Avatar overlay when video is disabled */}
                    {!isVideoEnabled && (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d4a2d] to-[#1e3a1e]">
                        <Avatar className="h-12 w-12 bg-[#4a7c59] border-2 border-[#a6c455]">
                          <AvatarFallback className="bg-[#4a7c59] text-white text-sm font-bold">
                            {(user.callsign || user.fullName || 'A').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 bg-black/80 px-2 py-1 rounded border border-[#4a7c59]/50">
                      <p className="text-[#a6c455] text-xs font-bold">Anda</p>
                    </div>
                    {/* Maximize button */}
                    <button
                      onClick={() => setIsMaximized(true)}
                      className="absolute top-1 right-1 bg-black/70 p-1 rounded hover:bg-[#4a7c59]/30 transition-colors border border-[#4a7c59]/30"
                    >
                      <svg className="w-3 h-3 text-[#a6c455]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Current Page Participants */}
                {currentPageParticipants.map(participant => (
                  <div 
                    key={participant.userId} 
                    className="relative bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] rounded-lg overflow-hidden border-2 border-[#7d9f7d] aspect-[4/3] min-h-[120px] max-h-[160px]"
                  >
                    {/* Participant video display */}
                    <div className="w-full h-full relative bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] overflow-hidden">
                      {/* Actual video element for remote stream */}
                      <video
                        ref={(el) => {
                          if (el) {
                            participantVideoRefs.current[participant.userId] = el;
                            // Let useEffect handle stream attachment to avoid conflicts
                          }
                        }}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        muted={false}
                        style={{ 
                          display: 'block'
                        }}
                      />
                      
                      {/* Fallback avatar when no video stream */}
                      {!remoteStreams[participant.userId] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2d4a2d] via-[#1e3a1e] to-[#0f1f0f]">
                          <Avatar className="h-20 w-20 bg-[#7d9f7d] border-3 border-[#a6c455] shadow-lg">
                            <AvatarFallback className="bg-gradient-to-br from-[#7d9f7d] to-[#5d7f5d] text-white text-xl font-bold">
                              {participant.userName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      

                    </div>
                    
                    <div className="absolute bottom-1 left-1 bg-black/80 px-2 py-1 rounded border border-[#7d9f7d]/50">
                      <p className="text-[#a6c455] text-xs font-medium">{participant.userName}</p>
                    </div>
                    
                    {/* Maximize button */}
                    <button
                      onClick={() => setIsMaximized(true)}
                      className="absolute top-1 right-1 bg-black/70 p-1 rounded hover:bg-[#4a7c59]/30 transition-colors border border-[#4a7c59]/30"
                    >
                      <svg className="w-3 h-3 text-[#a6c455]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                    
                    {/* Participant controls indicator */}
                    <div className="absolute bottom-1 right-1 flex space-x-1">
                      <div className="w-4 h-4 bg-black/60 rounded-full flex items-center justify-center border border-[#7d9f7d]/30">
                        <svg className="w-2 h-2 text-[#a6c455]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.814L4.75 13.5H2a1 1 0 01-1-1v-5a1 1 0 011-1h2.75l3.633-3.314a1 1 0 01.617-.186z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="w-4 h-4 bg-black/60 rounded-full flex items-center justify-center border border-[#7d9f7d]/30">
                        <svg className="w-2 h-2 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Fill remaining slots for current page */}
                {Array.from({ 
                  length: Math.max(0, PARTICIPANTS_PER_PAGE - currentPageParticipants.length) 
                }).map((_, index) => (
                  <div 
                    key={`waiting-${index}`} 
                    className="relative bg-gradient-to-br from-[#0a1a0a] to-[#0f1f0f] rounded-lg overflow-hidden border-2 border-dashed border-[#4a7c59]/40 aspect-[4/3] min-h-[120px] max-h-[160px] flex items-center justify-center opacity-50"
                  >
                    <div className="text-[#7d9f7d] text-center">
                      <Users className="h-6 w-6 mx-auto mb-1" />
                      <p className="text-xs font-medium">Waiting...</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Controls - Compact */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 py-1 bg-gradient-to-r from-[#2d4a2d]/50 to-[#1e3a1e]/50 rounded border border-[#4a7c59]/30">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className="p-1.5 rounded-full bg-[#4a7c59]/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#4a7c59]/40 transition-colors border border-[#4a7c59]/50"
                >
                  <ChevronLeft className="w-3 h-3 text-[#a6c455]" />
                </button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index)}
                      className={`w-6 h-6 rounded-full text-[10px] font-bold transition-colors border ${
                        currentPage === index 
                          ? 'bg-[#4a7c59] text-white border-[#a6c455]' 
                          : 'bg-[#2d4a2d] text-[#a6c455] border-[#4a7c59]/50 hover:bg-[#4a7c59]/30'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages - 1}
                  className="p-1.5 rounded-full bg-[#4a7c59]/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#4a7c59]/40 transition-colors border border-[#4a7c59]/50"
                >
                  <ChevronRight className="w-3 h-3 text-[#a6c455]" />
                </button>
              </div>
            )}
          </>
        ) : (
          /* Maximized Mode - Full Screen Current User */
          <div className="w-full h-full relative">
            {user && activeCall && (
              <div className="relative bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] rounded-lg overflow-hidden border-2 border-[#4a7c59] h-full w-full">
                {/* Video element - always present in maximized mode */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ display: isVideoEnabled ? 'block' : 'none' }}
                />
                {/* Avatar overlay when video is disabled */}
                {!isVideoEnabled && (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d4a2d] to-[#1e3a1e]">
                    <Avatar className="h-32 w-32 bg-[#4a7c59] border-4 border-[#a6c455]">
                      <AvatarFallback className="bg-[#4a7c59] text-white text-4xl font-bold">
                        {(user.callsign || user.fullName || 'A').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black/80 px-4 py-2 rounded-lg border border-[#4a7c59]/50">
                  <p className="text-[#a6c455] text-lg font-bold">Anda</p>
                </div>
                {/* Toggle minimize button */}
                <button
                  onClick={() => setIsMaximized(false)}
                  className="absolute top-3 right-3 bg-black/70 p-2 rounded-full hover:bg-[#4a7c59]/30 transition-colors border border-[#4a7c59]/50"
                >
                  <svg className="w-5 h-5 text-[#a6c455]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls - Compact for Mobile */}
      <div className="bg-gradient-to-r from-[#2d4a2d] to-[#1e3a1e] backdrop-blur-sm p-2 flex justify-center space-x-3 flex-shrink-0 border-t border-[#4a7c59]/30">
        <Button
          onClick={toggleAudio}
          variant="ghost"
          size="sm"
          className={`rounded-full w-10 h-10 border transition-all ${
            isAudioEnabled 
              ? 'bg-[#4a7c59]/20 border-[#4a7c59] text-[#a6c455] hover:bg-[#4a7c59]/40' 
              : 'bg-red-900/30 border-red-600 text-red-400 hover:bg-red-900/50'
          }`}
        >
          {isAudioEnabled ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
        </Button>

        <Button
          onClick={toggleVideo}
          variant="ghost"
          size="sm"
          className={`rounded-full w-10 h-10 border transition-all ${
            isVideoEnabled 
              ? 'bg-[#4a7c59]/20 border-[#4a7c59] text-[#a6c455] hover:bg-[#4a7c59]/40' 
              : 'bg-red-900/30 border-red-600 text-red-400 hover:bg-red-900/50'
          }`}
        >
          {isVideoEnabled ? (
            <Video className="h-4 w-4" />
          ) : (
            <VideoOff className="h-4 w-4" />
          )}
        </Button>

        <Button
          onClick={handleEndCall}
          variant="ghost"
          size="sm"
          className="rounded-full w-10 h-10 bg-red-900/40 border border-red-600 text-red-400 hover:bg-red-900/60 transition-all"
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
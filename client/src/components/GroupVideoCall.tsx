import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCall } from '@/hooks/useCall';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Users, ArrowLeft, ChevronLeft, ChevronRight, Settings, SwitchCamera } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
// Removed GroupManagement import - menu removed from video call interface

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
  onMaximize,
  participantVideoRefs
}: { 
  participant: GroupParticipant; 
  stream?: MediaStream | null;
  onMaximize: (participant: GroupParticipant) => void;
  participantVideoRefs: React.MutableRefObject<{ [userId: number]: HTMLVideoElement }>;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Register video ref with main refs object - keep ref stable during UI transitions
  useEffect(() => {
    if (videoRef.current) {
      participantVideoRefs.current[participant.userId] = videoRef.current;
      console.log(`[StableParticipantVideo] Registered video ref for user ${participant.userId}`);
    }
    
    // Don't unregister on unmount to preserve refs during UI transitions
    // Only clean up when component is truly destroyed
  }, [participant.userId, participantVideoRefs]);
  
  // Attach stream directly when available - with enhanced debugging and autoplay fix
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log(`[StableParticipantVideo] 🎬 Attaching stream for user ${participant.userId}`);
      console.log(`[StableParticipantVideo] Stream details:`, {
        id: stream.id,
        active: stream.active,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoTrackEnabled: stream.getVideoTracks()[0]?.enabled
      });
      
      console.log(`[StableParticipantVideo] 🔍 Video element ready state:`, videoRef.current.readyState);
      console.log(`[StableParticipantVideo] 🔍 Current srcObject:`, videoRef.current.srcObject);
      
      const videoElement = videoRef.current;
      videoElement.srcObject = stream;
      
      // Enhanced autoplay setup for better compatibility
      videoElement.muted = true; // Required for autoplay in most browsers
      videoElement.playsInline = true; // Required for mobile
      videoElement.autoplay = true;
      
      // Force play with multiple attempts
      const attemptPlay = async () => {
        try {
          await videoElement.play();
          console.log(`[StableParticipantVideo] ✅ Video playing successfully for user ${participant.userId}`);
          console.log(`[StableParticipantVideo] 📹 Video dimensions:`, {
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            clientWidth: videoElement.clientWidth,
            clientHeight: videoElement.clientHeight
          });
          
        } catch (error) {
          console.warn(`[StableParticipantVideo] ⚠️ Video play failed for user ${participant.userId}:`, error);
          
          // Retry with delay
          setTimeout(() => {
            if (videoElement && videoElement.srcObject) {
              videoElement.play().catch(retryError => {
                console.warn(`[StableParticipantVideo] Retry play failed for user ${participant.userId}:`, retryError);
              });
            }
          }, 1000);
        }
      };
      
      // Multiple strategies to ensure video plays
      const strategies = [
        // Strategy 1: If metadata already loaded
        () => {
          if (videoElement.readyState >= 1) {
            return attemptPlay();
          }
          return Promise.reject("Metadata not ready");
        },
        
        // Strategy 2: Wait for metadata
        () => new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject("Metadata load timeout"), 3000);
          videoElement.addEventListener('loadedmetadata', () => {
            clearTimeout(timeout);
            resolve(attemptPlay());
          }, { once: true });
        }),
        
        // Strategy 3: Force immediate play attempt
        () => {
          setTimeout(() => attemptPlay(), 100);
          return Promise.resolve();
        }
      ];
      
      // Try each strategy in sequence
      strategies.reduce((promise, strategy) => 
        promise.catch(() => strategy()), 
        Promise.reject()
      ).catch(() => {
        console.warn(`[StableParticipantVideo] All play strategies failed for user ${participant.userId}`);
      });
      
    } else if (videoRef.current && !stream) {
      console.log(`[StableParticipantVideo] 🧹 Clearing stream for user ${participant.userId}`);
      videoRef.current.srcObject = null;
    } else if (!videoRef.current) {
      console.log(`[StableParticipantVideo] ⚠️ No video ref available for user ${participant.userId}`);
    } else if (!stream) {
      console.log(`[StableParticipantVideo] ⚠️ No stream available for user ${participant.userId}`);
    }
  }, [stream, participant.userId]);
  
  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 aspect-[4/3] min-h-[120px] max-h-[160px]">
      {/* Always render video element with enhanced autoplay support */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={true}
        controls={false}
        preload="auto"
        className="w-full h-full object-cover"
        style={{ display: stream ? 'block' : 'none' }}
        onLoadedMetadata={() => {
          console.log(`[StableParticipantVideo] Video metadata loaded for user ${participant.userId}`);
        }}
        onCanPlay={() => {
          console.log(`[StableParticipantVideo] Video can play for user ${participant.userId}`);
        }}
        onPlay={() => {
          console.log(`[StableParticipantVideo] ✅ Video started playing for user ${participant.userId}`);
          
          // Visual verification - check if video is actually displaying content
          if (videoRef.current) {
            setTimeout(() => {
              const video = videoRef.current!;
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = video.videoWidth || 320;
              canvas.height = video.videoHeight || 240;
              
              try {
                ctx?.drawImage(video, 0, 0);
                const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
                const hasContent = imageData?.data.some((pixel, index) => 
                  index % 4 !== 3 && pixel > 0 // Check RGB channels (not alpha)
                );
                
                console.log(`[StableParticipantVideo] 📺 Visual verification for user ${participant.userId}:`, {
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                  hasVisualContent: hasContent,
                  readyState: video.readyState,
                  currentTime: video.currentTime
                });
              } catch (error) {
                console.warn(`[StableParticipantVideo] ⚠️ Visual verification failed for user ${participant.userId}:`, error);
              }
            }, 1000);
          }
        }}
        onError={(e) => {
          console.error(`[StableParticipantVideo] ❌ Video error for user ${participant.userId}:`, e);
        }}
        onWaiting={() => {
          console.log(`[StableParticipantVideo] ⏳ Video waiting for user ${participant.userId}`);
        }}
        onStalled={() => {
          console.log(`[StableParticipantVideo] ⚠️ Video stalled for user ${participant.userId}`);
        }}
        onTimeUpdate={() => {
          // Periodic check to ensure video is progressing
          if (videoRef.current && videoRef.current.currentTime > 0) {
            const video = videoRef.current;
            console.log(`[StableParticipantVideo] 🔄 Video progressing for user ${participant.userId}: ${video.currentTime.toFixed(1)}s`);
          }
        }}
      />
      
      {/* Show avatar when no stream or video is disabled */}
      {!stream && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d4a2d] to-[#1e3a1e]">
          <div className="text-center">
            <Avatar className="h-16 w-16 bg-[#4a7c59] border-2 border-[#a6c455] shadow-lg mx-auto mb-2">
              <AvatarFallback className="bg-[#4a7c59] text-white text-lg font-bold">
                {participant.userName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-[#7d9f7d] text-xs">Connecting...</p>
          </div>
        </div>
      )}
      
      {/* Stream status indicator */}
      {stream && (
        <div className="absolute top-1 left-1 bg-green-500/80 px-1.5 py-0.5 rounded text-xs text-white font-medium">
          LIVE
        </div>
      )}
      
      <div className="absolute bottom-1 left-1 bg-black/80 px-2 py-1 rounded border border-[#7d9f7d]/50">
        <p className="text-[#a6c455] text-xs font-medium">{participant.userName}</p>
      </div>
      
      <button
        onClick={() => onMaximize(participant)}
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
  const [maximizedParticipant, setMaximizedParticipant] = useState<GroupParticipant | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  // Removed group management state - menu removed from video call interface
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<{ [userId: number]: HTMLVideoElement }>({});
  const peerConnections = useRef<{ [userId: number]: RTCPeerConnection }>({});
  const pendingIceCandidates = useRef<{ [userId: number]: RTCIceCandidate[] }>({});
  const [remoteStreams, setRemoteStreams] = useState<{ [userId: number]: MediaStream }>({});
  
  // WebRTC configuration - OFFLINE INTRANET ONLY (no external STUN servers)
  const rtcConfig = {
    iceServers: [
      // Empty for local intranet - no external STUN servers needed
      // All communication happens within the same network
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all'
  };
  
  // Create peer connection for a specific user
  const createPeerConnection = async (userId: number) => {
    console.log(`[GroupVideoCall] Creating peer connection for user ${userId}`);
    
    try {
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnections.current[userId] = pc;
      
      // Add local stream tracks to peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
        console.log(`[GroupVideoCall] Added local tracks to peer connection for user ${userId}`);
      } else if (activeCall?.localStream) {
        activeCall.localStream.getTracks().forEach(track => {
          pc.addTrack(track, activeCall.localStream!);
        });
        console.log(`[GroupVideoCall] Added activeCall local tracks to peer connection for user ${userId}`);
      }
      
      // Handle incoming streams - Enhanced debugging and reliability
      pc.ontrack = (event) => {
        console.log(`[GroupVideoCall] 🎥 Received remote track from user: ${userId}`);
        console.log(`[GroupVideoCall] Track details:`, {
          kind: event.track.kind,
          enabled: event.track.enabled,
          id: event.track.id
        });
        console.log(`[GroupVideoCall] Event streams count:`, event.streams.length);
        
        if (event.streams.length > 0) {
          const [remoteStream] = event.streams;
          console.log(`[GroupVideoCall] Remote stream details:`, {
            id: remoteStream.id,
            active: remoteStream.active,
            tracks: remoteStream.getTracks().length,
            videoTracks: remoteStream.getVideoTracks().length,
            audioTracks: remoteStream.getAudioTracks().length
          });
          
          // Force immediate state update
          setRemoteStreams(prev => {
            const updated = {
              ...prev,
              [userId]: remoteStream
            };
            console.log(`[GroupVideoCall] Remote stream added to state for user: ${userId}`);
            console.log(`[GroupVideoCall] Updated remote streams state:`, Object.keys(updated));
            return updated;
          });
          
          // Also attach directly to video element if available
          setTimeout(() => {
            const videoElement = participantVideoRefs.current[userId];
            if (videoElement) {
              videoElement.srcObject = remoteStream;
              videoElement.play().catch(e => 
                console.warn(`[GroupVideoCall] Error playing remote video for user ${userId}:`, e)
              );
              console.log(`[GroupVideoCall] ✅ Direct attachment of remote stream for user ${userId}`);
            }
          }, 100);
          
        } else {
          console.warn(`[GroupVideoCall] ⚠️ No streams in track event for user ${userId}`);
        }
      };
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`[GroupVideoCall] Sending ICE candidate to user ${userId}`);
          // Send ICE candidate via WebSocket
          const message = {
            type: 'group_webrtc_ice_candidate',
            payload: {
              callId: activeCall?.callId,
              candidate: event.candidate,
              targetUserId: userId,
              fromUserId: user?.id
            }
          };
          
          // Send via custom event to CallContext WebSocket
          window.dispatchEvent(new CustomEvent('send-websocket-message', {
            detail: message
          }));
        }
      };
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`[GroupVideoCall] Connection state with user ${userId}: ${pc.connectionState}`);
      };
      
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log(`[GroupVideoCall] Created offer for user ${userId}`);
      
      // Send offer via WebSocket
      const offerMessage = {
        type: 'group_webrtc_offer',
        payload: {
          callId: activeCall?.callId,
          offer: offer,
          targetUserId: userId,
          fromUserId: user?.id
        }
      };
      
      window.dispatchEvent(new CustomEvent('send-websocket-message', {
        detail: offerMessage
      }));
      
      console.log(`[GroupVideoCall] Sent offer to user ${userId}`);
      
    } catch (error) {
      console.error(`[GroupVideoCall] Error creating peer connection for user ${userId}:`, error);
    }
  };

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

  // Get user media when component mounts - Use activeCall.localStream if available
  useEffect(() => {
    const getLocalMedia = async () => {
      try {
        // First check if activeCall already has a local stream
        if (activeCall?.localStream) {
          console.log('[GroupVideoCall] Using existing local stream from activeCall');
          const existingStream = activeCall.localStream;
          
          console.log('[GroupVideoCall] Existing stream details:', {
            id: existingStream.id,
            active: existingStream.active,
            videoTracks: existingStream.getVideoTracks().length,
            audioTracks: existingStream.getAudioTracks().length
          });
          
          setLocalStream(existingStream);
          
          // Enable video by default for group calls
          const videoTrack = existingStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = true;
            console.log('[GroupVideoCall] Video track enabled by default for group calls');
          }
          
          // Attach stream to video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = existingStream;
            console.log('[GroupVideoCall] Set local video source from existing stream');
          }
          return;
        }
        
        // If no existing stream, get a new one
        console.log('[GroupVideoCall] Getting new local media stream...');
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

    // DON'T cleanup on activeCall changes - only when component truly unmounts
    return () => {
      console.log('[GroupVideoCall] Effect cleanup - activeCall changed but preserving streams');
    };
  }, [activeCall]);

  // Only cleanup when component truly unmounts (not on re-renders)
  useEffect(() => {
    return () => {
      console.log('[GroupVideoCall] Component unmounting - performing final cleanup');
      cleanupMediaTracks();
    };
  }, []);

  // Update local video ref when stream changes - with enhanced debugging
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('[GroupVideoCall] Local video stream attached to element');
      console.log('[GroupVideoCall] Local stream details:', {
        id: localStream.id,
        active: localStream.active,
        videoTracks: localStream.getVideoTracks().length,
        audioTracks: localStream.getAudioTracks().length,
        videoTrackEnabled: localStream.getVideoTracks()[0]?.enabled
      });
      
      localVideoRef.current.srcObject = localStream;
      
      // Set initial video state based on track
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        setIsVideoEnabled(videoTrack.enabled);
        console.log('[GroupVideoCall] Initial video state:', videoTrack.enabled);
      }
      
      // Force play local video
      localVideoRef.current.play().then(() => {
        console.log('[GroupVideoCall] ✅ Local video playing successfully');
      }).catch(error => {
        console.warn('[GroupVideoCall] ⚠️ Local video play failed:', error);
      });
    } else {
      if (!localVideoRef.current) {
        console.log('[GroupVideoCall] ⚠️ No local video ref available');
      }
      if (!localStream) {
        console.log('[GroupVideoCall] ⚠️ No local stream available');
      
      // Try to get stream from activeCall as fallback
      if (activeCall?.localStream) {
        setLocalStream(activeCall.localStream);
        console.log('[GroupVideoCall] ✅ Recovered local stream from activeCall');
      }
      }
    }
  }, [localStream]);

  // Update participants from activeCall with stable references  
  const participantsRef = useRef<string>('');
  
  // Listen for participants update events from CallContext
  useEffect(() => {
    const handleParticipantsUpdate = (event: CustomEvent) => {
      console.log('[GroupVideoCall] 🔥 Participants update event received:', event.detail);
      const { participants: updatedParticipants, userMap } = event.detail;
      
      if (updatedParticipants && updatedParticipants.length > 0) {
        const otherParticipants = updatedParticipants.filter((p: any) => p.userId !== user?.id);
        console.log('[GroupVideoCall] 🔥 Setting other participants:', otherParticipants);
        setParticipants(otherParticipants);
        
        // Start WebRTC connections for each participant
        otherParticipants.forEach((participant: any) => {
          console.log('[GroupVideoCall] 🔥 Starting WebRTC for participant:', participant.userId);
          createPeerConnection(participant.userId);
        });
      }
    };
    
    const handleWebRTCInit = (event: CustomEvent) => {
      console.log('[GroupVideoCall] 🚀 Force WebRTC init event received:', event.detail);
      const { currentUserId, userMap } = event.detail;
      
      // Force immediate WebRTC setup for all other users in the group
      if (activeCall?.participants) {
        const otherParticipants = activeCall.participants.filter(p => p.userId !== currentUserId);
        console.log('[GroupVideoCall] 🚀 Force creating peer connections for:', otherParticipants);
        
        otherParticipants.forEach((participant) => {
          createPeerConnection(participant.userId);
        });
      }
    };
    
    const handleAutoInitiateWebRTC = (event: CustomEvent) => {
      console.log('[GroupVideoCall] 🚀 Auto WebRTC initiation received:', event.detail);
      const { callId, allParticipants, yourUserId, activeCall: currentCall } = event.detail;
      
      if (!currentCall || !localStream) {
        console.log('[GroupVideoCall] ❌ No activeCall or localStream for auto WebRTC initiation');
        return;
      }
      
      console.log('[GroupVideoCall] 🎯 Auto-starting WebRTC for participants:', allParticipants);
      
      // Start WebRTC connections for all other participants
      allParticipants.forEach((participantId: number) => {
        if (participantId !== yourUserId) {
          console.log('[GroupVideoCall] 🚀 Auto-creating peer connection for user:', participantId);
          createPeerConnection(participantId);
        }
      });
    };
    
    // Add the critical group-participants-update listener
    const handleGroupParticipantsUpdate = (event: CustomEvent) => {
      const { callId, participants: newParticipants, triggerWebRTC, groupId } = event.detail;
      console.log('[GroupVideoCall] 🎯 Group participants update received:', { 
        callId, 
        participants: newParticipants, 
        triggerWebRTC, 
        groupId,
        activeCallId: activeCall?.callId,
        activeGroupId: activeCall?.groupId
      });
      
      if (activeCall?.callId === callId || (activeCall && callId.includes(`_${activeCall.groupId}_`)) || (activeCall && groupId === activeCall.groupId)) {
        console.log('[GroupVideoCall] ✅ Processing group participants update for matching call');
        
        // Ensure participants are in the correct format
        const formattedParticipants = (newParticipants || []).map((p: any) => {
          if (typeof p === 'number') {
            return {
              userId: p,
              userName: `User ${p}`,
              audioEnabled: true,
              videoEnabled: true
            };
          } else if (p && typeof p === 'object' && p.userId) {
            return p;
          }
          return p;
        });
        
        // Filter out current user from participants list
        const otherParticipants = formattedParticipants.filter((p: any) => p.userId !== user?.id);
        console.log('[GroupVideoCall] 📊 Setting participants after group update:', otherParticipants);
        setParticipants(otherParticipants);
        
        // Force WebRTC setup if trigger flag is set
        if (triggerWebRTC && otherParticipants.length > 0 && localStream) {
          console.log('[GroupVideoCall] 🚀 Auto-triggering WebRTC from group participants update');
          setTimeout(() => {
            otherParticipants.forEach((participant: any, index: number) => {
              if (participant.userId !== user?.id) {
                setTimeout(() => {
                  console.log(`[GroupVideoCall] 🎯 Auto-creating WebRTC for participant: ${participant.userId}`);
                  createPeerConnection(participant.userId);
                }, index * 300); // Staggered timing
              }
            });
          }, 500);
        }
      }
    };
    
    window.addEventListener('participants-updated', handleParticipantsUpdate as EventListener);
    window.addEventListener('force-webrtc-init', handleWebRTCInit as EventListener);
    window.addEventListener('auto-initiate-webrtc', handleAutoInitiateWebRTC as EventListener);
    window.addEventListener('group-participants-update', handleGroupParticipantsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('participants-updated', handleParticipantsUpdate as EventListener);
      window.removeEventListener('force-webrtc-init', handleWebRTCInit as EventListener);
      window.removeEventListener('auto-initiate-webrtc', handleAutoInitiateWebRTC as EventListener);
      window.removeEventListener('group-participants-update', handleGroupParticipantsUpdate as EventListener);
    };
  }, [user?.id, activeCall?.participants]);

  useEffect(() => {
    console.log('[GroupVideoCall] 📊 Participants effect triggered');
    console.log('[GroupVideoCall] 📊 activeCall:', activeCall);
    console.log('[GroupVideoCall] 📊 activeCall?.participants:', activeCall?.participants);
    console.log('[GroupVideoCall] 📊 user?.id:', user?.id);
    
    if (activeCall?.participants && Array.isArray(activeCall.participants)) {
      // Create stable string representation to avoid unnecessary re-renders
      const participantsStr = JSON.stringify(activeCall.participants.sort());
      
      console.log('[GroupVideoCall] 📊 Current participants string:', participantsRef.current);
      console.log('[GroupVideoCall] 📊 New participants string:', participantsStr);
      
      // Only update if participants actually changed
      if (participantsRef.current === participantsStr) {
        console.log('[GroupVideoCall] 📊 Participants unchanged, skipping update');
        return;
      }
      
      participantsRef.current = participantsStr;
      console.log('[GroupVideoCall] 📊 Processing participants from activeCall:', activeCall.participants);
      
      // Extract participant objects and filter out current user
      const otherParticipants = activeCall.participants.filter((participant: any) => {
        // Handle both object format and ID format
        const participantId = typeof participant === 'object' ? participant.userId : participant;
        const isCurrentUser = Number(participantId) === user?.id;
        console.log(`[GroupVideoCall] Checking participant ${participantId}, is current user: ${isCurrentUser}`);
        return !isCurrentUser;
      });
      
      console.log('[GroupVideoCall] 📊 Other participants after filtering:', otherParticipants);
      
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
        
        console.log('[GroupVideoCall] 📊 Updated participants list:', updatedParticipants);
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
              // Empty for local intranet - no external STUN servers needed
              // All communication happens within the same network
            ],
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            iceTransportPolicy: 'all'
          });

          // Add local stream tracks to peer connection
          localStream.getTracks().forEach(track => {
            console.log('[GroupVideoCall] Adding local track to peer connection:', track.kind);
            peerConnection.addTrack(track, localStream);
          });

          // Handle incoming remote stream with enhanced debugging
          peerConnection.ontrack = (event) => {
            console.log('[GroupVideoCall] 🎥 Received remote track from user:', participant.userId);
            console.log('[GroupVideoCall] Track kind:', event.track.kind);
            console.log('[GroupVideoCall] Event streams:', event.streams.length);
            
            const [remoteStream] = event.streams;
            
            if (remoteStream) {
              console.log('[GroupVideoCall] 🎬 Remote stream details:', {
                id: remoteStream.id,
                active: remoteStream.active,
                tracks: remoteStream.getTracks().length,
                videoTracks: remoteStream.getVideoTracks().length,
                audioTracks: remoteStream.getAudioTracks().length
              });
              
              // Update remote streams state immediately
              setRemoteStreams(prev => {
                const updated = {
                  ...prev,
                  [participant.userId]: remoteStream
                };
                console.log('[GroupVideoCall] 📺 Updated remote streams state:', Object.keys(updated));
                return updated;
              });
              
              // Also update participant list with stream
              setParticipants(prevParticipants => {
                return prevParticipants.map(p => {
                  if (p.userId === participant.userId) {
                    console.log(`[GroupVideoCall] 🔄 Updated participant ${p.userId} with new stream`);
                    return { ...p, stream: remoteStream };
                  }
                  return p;
                });
              });
              
              // Force immediate video element attachment with multiple retries
              const attachVideoStream = (retryCount = 0) => {
                const videoElement = participantVideoRefs.current[participant.userId];
                console.log(`[GroupVideoCall] 🎯 Attempt ${retryCount + 1}: Looking for video element for user ${participant.userId}:`, !!videoElement);
                
                if (videoElement && remoteStream) {
                  console.log(`[GroupVideoCall] ✅ ATTACHING stream to video element for user ${participant.userId}`);
                  videoElement.srcObject = remoteStream;
                  videoElement.play().then(() => {
                    console.log(`[GroupVideoCall] ✅ Video playing successfully for user ${participant.userId}`);
                  }).catch(e => {
                    console.warn(`[GroupVideoCall] ⚠️ Video play failed for user ${participant.userId}:`, e);
                  });
                } else if (retryCount < 5) {
                  // Retry up to 5 times with increasing delays
                  setTimeout(() => attachVideoStream(retryCount + 1), (retryCount + 1) * 200);
                } else {
                  console.error(`[GroupVideoCall] ❌ Failed to attach video after 5 retries for user ${participant.userId}`);
                }
              };
              
              // Start attachment attempts immediately and with retries
              attachVideoStream();
              
              console.log('[GroupVideoCall] 🎊 Remote stream processing completed for user:', participant.userId);
            } else {
              console.error('[GroupVideoCall] ❌ No remote stream received for user:', participant.userId);
            }
          };

          // Handle ICE candidates with priority handling
          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              console.log('[GroupVideoCall] Sending ICE candidate to user:', participant.userId, 'Type:', event.candidate.type || 'unknown');
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
                console.log('[GroupVideoCall] ✅ ICE candidate sent to user:', participant.userId);
              } else {
                console.warn('[GroupVideoCall] ❌ WebSocket not ready for ICE candidate to user:', participant.userId);
              }
            } else {
              console.log('[GroupVideoCall] 🏁 ICE gathering complete for user:', participant.userId);
            }
          };

          // Handle connection state changes with delayed cleanup
          peerConnection.onconnectionstatechange = () => {
            console.log('[GroupVideoCall] 🔄 Connection state for user', participant.userId, ':', peerConnection.connectionState);
            
            if (peerConnection.connectionState === 'failed') {
              console.warn(`[GroupVideoCall] ❌ Connection failed for user ${participant.userId}, will retry in 5 seconds`);
              
              // Delay cleanup to allow for potential recovery via answer processing
              setTimeout(() => {
                // Only clean up if still failed and no successful connection established
                if (peerConnection.connectionState === 'failed') {
                  console.log(`[GroupVideoCall] 🧹 Cleaning up persistently failed connection for user ${participant.userId}`);
                  
                  // Clean up failed connection
                  delete peerConnections.current[participant.userId];
                  
                  // Remove from remote streams to trigger UI update
                  setRemoteStreams(prev => {
                    const updated = { ...prev };
                    delete updated[participant.userId];
                    return updated;
                  });
                }
              }, 5000); // Give 5 seconds for potential recovery
            } else if (peerConnection.connectionState === 'connected') {
              console.log(`[GroupVideoCall] 🎉 Connection established with user ${participant.userId}`);
            } else if (peerConnection.connectionState === 'connecting') {
              console.log(`[GroupVideoCall] ⏳ Connection in progress for user ${participant.userId}`);
              // Set timeout for connecting state
              setTimeout(() => {
                if (peerConnection.connectionState === 'connecting') {
                  console.warn(`[GroupVideoCall] ⚠️ Connection timeout for user ${participant.userId}, restarting ICE`);
                  peerConnection.restartIce();
                }
              }, 12000); // 12 second timeout
            }
          };
          
          // Enhanced ICE connection state monitoring
          peerConnection.oniceconnectionstatechange = () => {
            console.log('[GroupVideoCall] 🧊 ICE state for user', participant.userId, ':', peerConnection.iceConnectionState);
            
            if (peerConnection.iceConnectionState === 'failed') {
              console.warn(`[GroupVideoCall] ❌ ICE failed for user ${participant.userId}, restarting`);
              peerConnection.restartIce();
            } else if (peerConnection.iceConnectionState === 'connected') {
              console.log(`[GroupVideoCall] 🎉 ICE connected with user ${participant.userId}`);
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

  // Auto-initiate WebRTC connections when participants change with enhanced debugging
  useEffect(() => {
    if (participants.length > 0 && localStream && activeCall?.callId && user?.id) {
      console.log('[GroupVideoCall] 🚀 Auto-initiating WebRTC connections for all participants');
      console.log('[GroupVideoCall] Current user ID:', user.id);
      console.log('[GroupVideoCall] Participants to connect:', participants.map(p => ({ id: p.userId, name: p.userName })));
      
      participants.forEach(participant => {
        console.log(`[GroupVideoCall] 🔍 Checking participant ${participant.userId} - user ID: ${user.id}`);
        
        // Always try to initiate regardless of ID to ensure connections are established
        const existingConnection = peerConnections.current[participant.userId];
        console.log(`[GroupVideoCall] Existing connection for ${participant.userId}:`, !!existingConnection);
        console.log(`[GroupVideoCall] Connection state:`, existingConnection?.signalingState);
        
        if (existingConnection && existingConnection.signalingState === 'stable') {
          console.log(`[GroupVideoCall] 📞 Creating offer for participant: ${participant.userId}`);
          
          // Small delay to ensure proper timing
          setTimeout(() => {
            // Double check signaling state before creating offer
            if (existingConnection.signalingState === 'stable') {
              existingConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
              }).then(offer => {
                console.log(`[GroupVideoCall] ✅ Offer created for ${participant.userId}`);
                return existingConnection.setLocalDescription(offer);
              }).then(() => {
                console.log(`[GroupVideoCall] 📤 Sending offer to participant: ${participant.userId}`);
                const ws = (window as any).__callWebSocket;
                if (ws?.readyState === WebSocket.OPEN) {
                  const message = {
                    type: 'group_webrtc_offer',
                    payload: {
                      callId: activeCall.callId,
                      offer: existingConnection.localDescription,
                      targetUserId: participant.userId,
                      fromUserId: user?.id
                    }
                  };
                  console.log(`[GroupVideoCall] 🔊 WebSocket sending:`, message);
                  ws.send(JSON.stringify(message));
                } else {
                  console.error(`[GroupVideoCall] ❌ WebSocket not ready, state: ${ws?.readyState}`);
                }
              }).catch(error => {
                console.error(`[GroupVideoCall] ❌ Error creating offer for participant ${participant.userId}:`, error);
              });
            } else {
              console.warn(`[GroupVideoCall] ⚠️ Connection not stable for ${participant.userId}: ${existingConnection.signalingState}`);
            }
          }, 1000 + (participant.userId * 200)); // Staggered delay to avoid conflicts
        } else if (!existingConnection) {
          console.warn(`[GroupVideoCall] ❌ No peer connection found for participant ${participant.userId}`);
        } else {
          console.warn(`[GroupVideoCall] ⚠️ Connection not in stable state for ${participant.userId}: ${existingConnection.signalingState}`);
        }
      });
    } else {
      console.log('[GroupVideoCall] ⏳ Auto-initiation not ready:', {
        participantsCount: participants.length,
        hasLocalStream: !!localStream,
        hasActiveCall: !!activeCall?.callId,
        hasUser: !!user?.id
      });
      
      // Force initiate WebRTC for group call initiator when no participants yet
      if (activeCall && user && (localStream || activeCall?.localStream) && participants.length === 0) {
        console.log('[GroupVideoCall] 🚀 Force-initiating WebRTC for group call initiator');
        setTimeout(() => {
          if (activeCall && !activeCall.isIncoming) {
            console.log('[GroupVideoCall] 🔥 Triggering participant detection for initiator');
            // Trigger server to send participant updates
            const ws = (window as any).__callWebSocket;
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'request_group_participants',
                payload: {
                  callId: activeCall.callId,
                  groupId: activeCall.groupId,
                  userId: user.id
                }
              }));
              console.log('[GroupVideoCall] 📡 Requested group participants from server');
            }
          }
        }, 1000);
        
        // Additional force trigger after longer delay to ensure participants are detected
        setTimeout(() => {
          if (activeCall && participants.length === 0) {
            console.log('[GroupVideoCall] 🔥 Secondary participant detection trigger');
            const ws = (window as any).__callWebSocket;
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'request_group_participants',
                payload: {
                  callId: activeCall.callId,
                  groupId: activeCall.groupId,
                  userId: user.id
                }
              }));
            }
          }
        }, 2000);
        
        // Final aggressive trigger if still no participants
        setTimeout(() => {
          if (activeCall && participants.length === 0) {
            console.log('[GroupVideoCall] 🔥 Final aggressive participant detection trigger');
            const ws = (window as any).__callWebSocket;
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'request_group_participants',
                payload: {
                  callId: activeCall.callId,
                  groupId: activeCall.groupId,
                  userId: user.id
                }
              }));
            }
          }
        }, 4000);
      }
    }
  }, [participants.length, localStream, activeCall?.callId, user?.id]);

  // Stream attachment is now handled directly in StableParticipantVideo component
  // This prevents attachment conflicts and race conditions
  useEffect(() => {
    console.log('[GroupVideoCall] Stream state updated:', {
      remoteStreams: Object.keys(remoteStreams),
      participants: participants.map(p => p.userId)
    });
  }, [remoteStreams, participants]);

  // Handle incoming WebRTC signals for group video call
  useEffect(() => {
    const handleGroupWebRTCOffer = async (event: CustomEvent) => {
      const { callId, offer, fromUserId } = event.detail;
      console.log('[GroupVideoCall] Received WebRTC offer from user:', fromUserId);
      
      if (!activeCall || activeCall.callId !== callId) {
        console.log('[GroupVideoCall] Call ID mismatch, ignoring offer');
        return;
      }
      
      // Try to get local stream from multiple sources with aggressive fallback
      let availableStream = localStream || activeCall?.localStream;
      
      // If no stream available, request new one
      if (!availableStream) {
        console.log('[GroupVideoCall] ❌ No local stream available, requesting new stream for offer processing');
        try {
          availableStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: true
          });
          console.log('[GroupVideoCall] ✅ Created new local stream for offer processing');
        } catch (error) {
          console.error('[GroupVideoCall] ❌ Failed to get local stream:', error);
          return;
        }
      }
      
      console.log('[GroupVideoCall] ✅ Using stream for WebRTC offer processing:', {
        fromLocalStream: !!localStream,
        fromActiveCall: !!activeCall?.localStream,
        streamId: availableStream.id
      });

      let peerConnection = peerConnections.current[fromUserId];
      if (!peerConnection) {
        console.log('[GroupVideoCall] 🔧 Creating peer connection for new participant:', fromUserId);
        
        // Create peer connection for this user
        peerConnection = new RTCPeerConnection({
          iceServers: [
            // Empty for local intranet - no external STUN servers needed
            // All communication happens within the same network
          ],
          iceCandidatePoolSize: 10
        });

        // Add local stream tracks with verification
        console.log('[GroupVideoCall] 🎵 Adding local tracks to peer connection for user:', fromUserId);
        console.log('[GroupVideoCall] Available stream tracks:', availableStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
        
        availableStream.getTracks().forEach(track => {
          console.log('[GroupVideoCall] ➕ Adding local track to peer connection:', track.kind, 'enabled:', track.enabled);
          peerConnection!.addTrack(track, availableStream);
        });

        // Handle incoming remote stream with enhanced debugging
        peerConnection.ontrack = (event) => {
          console.log('[GroupVideoCall] 🎥 Received remote track from user:', fromUserId);
          console.log('[GroupVideoCall] Track details:', { kind: event.track.kind, enabled: event.track.enabled, id: event.track.id });
          console.log('[GroupVideoCall] Event streams count:', event.streams.length);
          
          const [remoteStream] = event.streams;
          
          if (remoteStream) {
            console.log('[GroupVideoCall] Remote stream details:', {
              id: remoteStream.id,
              active: remoteStream.active,
              tracks: remoteStream.getTracks().length,
              videoTracks: remoteStream.getVideoTracks().length,
              audioTracks: remoteStream.getAudioTracks().length
            });
            
            if (remoteStream.active) {
              setRemoteStreams(prev => {
                const updated = {
                  ...prev,
                  [fromUserId]: remoteStream
                };
                console.log('[GroupVideoCall] Updated remote streams state:', Object.keys(updated));
                return updated;
              });
              
              // Immediately try to attach to video element
              setTimeout(() => {
                const videoElement = participantVideoRefs.current[fromUserId];
                if (videoElement && remoteStream) {
                  videoElement.srcObject = remoteStream;
                  videoElement.play().catch(e => console.error('[GroupVideoCall] Error playing remote video:', e));
                  console.log('[GroupVideoCall] Direct video attachment for user:', fromUserId);
                }
              }, 100);
              
              console.log('[GroupVideoCall] Remote stream added to state for user:', fromUserId);
            } else {
              console.warn('[GroupVideoCall] Remote stream is not active for user:', fromUserId);
            }
          } else {
            console.error('[GroupVideoCall] No remote stream received for user:', fromUserId);
          }
        };

        // Handle ICE candidates with immediate sending
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('[GroupVideoCall] Sending ICE candidate to user:', fromUserId, event.candidate.type);
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
              console.log('[GroupVideoCall] ✅ ICE candidate sent successfully to user:', fromUserId);
            } else {
              console.warn('[GroupVideoCall] ❌ WebSocket not ready, cannot send ICE candidate');
            }
          } else {
            console.log('[GroupVideoCall] 🏁 ICE gathering completed for user:', fromUserId);
          }
        };

        // Handle connection state changes with restart mechanism and timeout
        peerConnection.onconnectionstatechange = () => {
          console.log('[GroupVideoCall] 🔄 Connection state for user', fromUserId, ':', peerConnection!.connectionState);
          
          if (peerConnection!.connectionState === 'connected') {
            console.log('[GroupVideoCall] 🎉 Connection established successfully with user:', fromUserId);
          } else if (peerConnection!.connectionState === 'failed') {
            console.warn(`[GroupVideoCall] ❌ Connection failed for user ${fromUserId}, attempting restart`);
            setTimeout(() => {
              if (peerConnection!.connectionState === 'failed') {
                console.log(`[GroupVideoCall] 🔄 Restarting ICE for user ${fromUserId}`);
                peerConnection!.restartIce();
              }
            }, 2000);
          } else if (peerConnection!.connectionState === 'connecting') {
            console.log(`[GroupVideoCall] ⏳ Connection in progress for user ${fromUserId}`);
            // Set a timeout for connecting state to prevent indefinite waiting
            setTimeout(() => {
              if (peerConnection!.connectionState === 'connecting') {
                console.warn(`[GroupVideoCall] ⚠️ Connection timeout for user ${fromUserId}, attempting ICE restart`);
                peerConnection!.restartIce();
              }
            }, 15000); // 15 second timeout
          }
        };
        
        // Enhanced ICE connection state monitoring
        peerConnection.oniceconnectionstatechange = () => {
          console.log('[GroupVideoCall] 🧊 ICE connection state for user', fromUserId, ':', peerConnection!.iceConnectionState);
          
          if (peerConnection!.iceConnectionState === 'failed') {
            console.warn(`[GroupVideoCall] ❌ ICE connection failed for user ${fromUserId}`);
            peerConnection!.restartIce();
          } else if (peerConnection!.iceConnectionState === 'connected') {
            console.log(`[GroupVideoCall] 🎉 ICE connected successfully with user ${fromUserId}`);
          } else if (peerConnection!.iceConnectionState === 'checking') {
            console.log(`[GroupVideoCall] 🔍 ICE checking candidates for user ${fromUserId}`);
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
        
        // Process any pending ICE candidates now that remote description is set
        if (pendingIceCandidates.current[fromUserId]) {
          console.log('[GroupVideoCall] Processing', pendingIceCandidates.current[fromUserId].length, 'pending ICE candidates for user:', fromUserId);
          for (const candidate of pendingIceCandidates.current[fromUserId]) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
              console.log('[GroupVideoCall] ✅ Added pending ICE candidate for user:', fromUserId);
            } catch (error) {
              console.error('[GroupVideoCall] ❌ Error adding pending ICE candidate:', error);
            }
          }
          pendingIceCandidates.current[fromUserId] = [];
        }
        
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
        console.log('[GroupVideoCall] Current signaling state:', peerConnection.signalingState);
        console.log('[GroupVideoCall] Current connection state:', peerConnection.connectionState);
        
        // Handle answer based on signaling state with proper error recovery
        if (peerConnection.signalingState === 'have-local-offer') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('[GroupVideoCall] Successfully set remote description from answer');
          
          // Process any pending ICE candidates now that remote description is set
          if (pendingIceCandidates.current[fromUserId]) {
            console.log('[GroupVideoCall] Processing', pendingIceCandidates.current[fromUserId].length, 'pending ICE candidates for user:', fromUserId);
            for (const candidate of pendingIceCandidates.current[fromUserId]) {
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('[GroupVideoCall] ✅ Added pending ICE candidate for user:', fromUserId);
              } catch (error) {
                console.error('[GroupVideoCall] ❌ Error adding pending ICE candidate:', error);
              }
            }
            pendingIceCandidates.current[fromUserId] = [];
          }
        } else if (peerConnection.signalingState === 'stable') {
          console.warn('[GroupVideoCall] Peer connection already stable, ignoring duplicate answer');
          return; // Don't process duplicate answers
        } else if (peerConnection.signalingState === 'have-remote-offer') {
          console.warn('[GroupVideoCall] Got answer but we have remote offer, creating fresh connection');
          // Clean up and recreate connection to resolve signaling conflict
          peerConnection.close();
          delete peerConnections.current[fromUserId];
          createdConnections.current.delete(fromUserId);
          return;
        } else {
          console.warn('[GroupVideoCall] Invalid signaling state for answer:', peerConnection.signalingState);
          return; // Don't attempt recovery that could make things worse
        }
      } catch (error) {
        console.error('[GroupVideoCall] Error handling answer:', error);
        
        // Attempt recovery by restarting ICE if SSL role error
        if ((error as Error).message?.includes('SSL role') || (error as Error).message?.includes('transport')) {
          console.log('[GroupVideoCall] SSL role error detected, recreating connection for user:', fromUserId);
          
          // Close current connection and create new one
          if (peerConnections.current[fromUserId]) {
            peerConnections.current[fromUserId].close();
            delete peerConnections.current[fromUserId];
            createdConnections.current.delete(fromUserId);
          }
          
          // Retry after delay to allow cleanup
          setTimeout(() => {
            console.log('[GroupVideoCall] Retrying connection setup for user:', fromUserId);
            if (localStream && activeCall) {
              // Force re-create connection for this user
              const retryParticipants = [{ userId: fromUserId, userName: '', audioEnabled: true, videoEnabled: true }];
              // Re-create the peer connection manually
              if (!peerConnections.current[fromUserId] && !createdConnections.current.has(fromUserId)) {
                console.log('[GroupVideoCall] Re-creating peer connection for user:', fromUserId);
                createdConnections.current.add(fromUserId);
                
                const peerConnection = new RTCPeerConnection({
                  iceServers: [
                    // Empty for local intranet - no external STUN servers needed
                    // All communication happens within the same network
                  ],
                  iceCandidatePoolSize: 10,
                  bundlePolicy: 'max-bundle',
                  rtcpMuxPolicy: 'require',
                  iceTransportPolicy: 'all'
                });

                // Add local stream tracks
                localStream.getTracks().forEach(track => {
                  console.log('[GroupVideoCall] Adding local track to retried peer connection:', track.kind);
                  peerConnection.addTrack(track, localStream);
                });

                peerConnections.current[fromUserId] = peerConnection;
              }
            }
          }, 1000);
        }
      }
    };

    const handleGroupWebRTCIceCandidate = async (event: CustomEvent) => {
      const { callId, candidate, fromUserId } = event.detail;
      console.log('[GroupVideoCall] 🧊 Received ICE candidate from user:', fromUserId, 'Type:', candidate?.type || 'unknown');
      
      if (activeCall?.callId !== callId) {
        console.log('[GroupVideoCall] Call ID mismatch, ignoring ICE candidate');
        return;
      }
      
      const peerConnection = peerConnections.current[fromUserId];
      if (!peerConnection) {
        console.log('[GroupVideoCall] ❌ No peer connection found for user:', fromUserId);
        return;
      }
      
      try {
        // Check if we can add the candidate immediately
        if (peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[GroupVideoCall] ✅ Added ICE candidate immediately for user:', fromUserId);
        } else {
          console.log('[GroupVideoCall] ⏳ Remote description not set, queuing ICE candidate for user:', fromUserId);
          // Store candidate for later when remote description is available
          if (!pendingIceCandidates.current[fromUserId]) {
            pendingIceCandidates.current[fromUserId] = [];
          }
          pendingIceCandidates.current[fromUserId].push(candidate);
        }
      } catch (error) {
        console.error('[GroupVideoCall] ❌ Error adding ICE candidate for user:', fromUserId, error);
        // Try to add it later if it failed
        if (!pendingIceCandidates.current[fromUserId]) {
          pendingIceCandidates.current[fromUserId] = [];
        }
        pendingIceCandidates.current[fromUserId].push(candidate);
      }
    };

    // Enhanced event handler for force WebRTC initiation
    const handleInitiateGroupWebRTC = (event: CustomEvent) => {
      const { callId, participants, forceInit } = event.detail;
      console.log('[GroupVideoCall] 🚀 Force WebRTC initiation received:', { callId, participants, forceInit });
      
      if (activeCall?.callId === callId && localStream && user) {
        console.log('[GroupVideoCall] 🔥 Force-initiating WebRTC connections to all participants');
        
        // Force create peer connections for all participants
        participants.forEach((participant: any, index: number) => {
          if (participant.userId !== user.id) {
            setTimeout(() => {
              console.log(`[GroupVideoCall] 🎯 Force-creating WebRTC offer for participant: ${participant.userId}`);
              
              // Force create peer connection if not exists
              if (!peerConnections.current[participant.userId]) {
                const peerConnection = new RTCPeerConnection({
                  iceServers: [],
                  iceCandidatePoolSize: 10
                });
                
                // Add local stream
                localStream.getTracks().forEach(track => {
                  peerConnection.addTrack(track, localStream);
                });
                
                peerConnections.current[participant.userId] = peerConnection;
                console.log(`[GroupVideoCall] ✅ Created forced peer connection for ${participant.userId}`);
              }
              
              // Force create and send offer
              const peerConnection = peerConnections.current[participant.userId];
              if (peerConnection) {
                peerConnection.createOffer().then(offer => {
                  return peerConnection.setLocalDescription(offer);
                }).then(() => {
                  const ws = (window as any).__callWebSocket;
                  if (ws?.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                      type: 'group_webrtc_offer',
                      payload: {
                        callId: activeCall.callId,
                        offer: peerConnection.localDescription,
                        targetUserId: participant.userId,
                        fromUserId: user.id
                      }
                    }));
                    console.log(`[GroupVideoCall] 🚀 Force-sent offer to participant: ${participant.userId}`);
                  }
                }).catch(error => {
                  console.error(`[GroupVideoCall] ❌ Force offer error for ${participant.userId}:`, error);
                });
              }
            }, index * 300); // Staggered timing
          }
        });
      }
    };

    // Add event listeners
    window.addEventListener('group-webrtc-offer', handleGroupWebRTCOffer as any);
    window.addEventListener('group-webrtc-answer', handleGroupWebRTCAnswer as any);
    window.addEventListener('group-webrtc-ice-candidate', handleGroupWebRTCIceCandidate as any);
    window.addEventListener('initiate-group-webrtc', handleInitiateGroupWebRTC as any);

    // Cleanup function
    return () => {
      window.removeEventListener('group-webrtc-offer', handleGroupWebRTCOffer as any);
      window.removeEventListener('group-webrtc-answer', handleGroupWebRTCAnswer as any);
      window.removeEventListener('group-webrtc-ice-candidate', handleGroupWebRTCIceCandidate as any);
      window.removeEventListener('initiate-group-webrtc', handleInitiateGroupWebRTC as any);
    };
  }, [activeCall?.callId, user?.id]);

  // Simplified cleanup - no automatic cleanup to prevent component instability
  // Manual cleanup only when user explicitly ends call

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

  const switchCamera = async () => {
    console.log('[GroupVideoCall] 🔥 GROUP SWITCH CAMERA FUNCTION CALLED!');
    
    // Always show alert for mobile debugging
    alert(`📱 GROUP Camera Switch diklik!\n\nLocalStream: ${!!localStream}\nActiveCall stream: ${!!activeCall?.localStream}\nComponent: GroupVideoCall`);
    
    const streamToUse = localStream || activeCall?.localStream;
    if (!streamToUse) {
      console.log('[GroupVideoCall] No local stream available');
      alert('❌ Tidak ada stream video aktif untuk mengganti kamera.');
      return;
    }

    try {
      // Get all video devices with mobile debugging
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('[GroupVideoCall] Available video devices:', videoDevices.length);
      
      // Mobile debugging - show camera info for PWA users  
      const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobileDevice) {
        const cameraInfo = videoDevices.map((device, index) => 
          `Camera ${index + 1}: ${device.label || 'Unknown'}`
        ).join('\n');
        alert(`📱 GROUP Debug Info:\nDevice: Mobile\nKamera ditemukan: ${videoDevices.length}\n${cameraInfo}`);
      }
      
      if (videoDevices.length <= 1) {
        console.log('[GroupVideoCall] Only one camera available');
        alert(`❌ GROUP: Hanya ${videoDevices.length} kamera tersedia.\n\nHP ini mungkin tidak memiliki kamera belakang.`);
        return;
      }
      
      const currentVideoTrack = streamToUse.getVideoTracks()[0];
      if (!currentVideoTrack) {
        console.log('[GroupVideoCall] No video track found');
        return;
      }

      const currentSettings = currentVideoTrack.getSettings();
      const currentDeviceId = currentSettings.deviceId;
      
      // Find current camera index
      const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      const nextDevice = videoDevices[nextIndex];
      
      // Determine facing mode based on device label more accurately
      let isFrontCamera: boolean;
      let nextFacingMode: string;
      
      if (nextDevice.label.toLowerCase().includes('back') || 
          nextDevice.label.toLowerCase().includes('rear') || 
          nextDevice.label.toLowerCase().includes('environment')) {
        isFrontCamera = false;
        nextFacingMode = 'environment';
      } else if (nextDevice.label.toLowerCase().includes('front') || 
                 nextDevice.label.toLowerCase().includes('user')) {
        isFrontCamera = true;
        nextFacingMode = 'user';
      } else {
        // Fallback: assume first device is front, others are back
        isFrontCamera = nextIndex === 0;
        nextFacingMode = isFrontCamera ? 'user' : 'environment';
      }
      
      console.log('[GroupVideoCall] Switching from camera', currentIndex, 'to camera', nextIndex);
      console.log('[GroupVideoCall] Device label:', nextDevice.label, 'facingMode:', nextFacingMode);
      
      // Create new video constraints with fallback options
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 720 },
        height: { ideal: 1280 },
        aspectRatio: { ideal: 9/16 }
      };
      
      // Try deviceId first, then facingMode as fallback
      if (nextDevice.deviceId) {
        videoConstraints.deviceId = { exact: nextDevice.deviceId };
      } else {
        videoConstraints.facingMode = nextFacingMode;
      }

      // Get new stream with next camera - try multiple approaches if needed
      let newStream: MediaStream;
      try {
        // First attempt: use exact deviceId
        newStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });
      } catch (error) {
        console.log('[GroupVideoCall] First attempt failed, trying facingMode only:', error);
        // Second attempt: use only facingMode without deviceId
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: nextFacingMode,
              width: { ideal: 720 },
              height: { ideal: 1280 }
            },
            audio: false
          });
        } catch (error2) {
          console.log('[GroupVideoCall] Second attempt failed, trying basic constraints:', error2);
          // Third attempt: minimal constraints with fallback
          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: nextFacingMode
              },
              audio: false
            });
          } catch (error3) {
            console.log('[GroupVideoCall] Third attempt failed, trying any camera:', error3);
            // Fourth attempt: any camera
            newStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          }
        }
      }
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      console.log('[GroupVideoCall] Got new video track:', newVideoTrack.id);

      // Replace video track in all peer connections
      console.log('[GroupVideoCall] Current peer connections:', Object.keys(peerConnections.current || {}));
      if (peerConnections.current && Object.keys(peerConnections.current).length > 0) {
        for (const [peerId, pc] of Object.entries(peerConnections.current)) {
          if (pc && typeof pc.getSenders === 'function') {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              await sender.replaceTrack(newVideoTrack);
              console.log(`[GroupVideoCall] Replaced video track for peer ${peerId}`);
            }
          }
        }
      } else {
        console.log('[GroupVideoCall] No peer connections available for track replacement');
      }

      // Replace track in the stream we're using
      streamToUse.removeTrack(currentVideoTrack);
      streamToUse.addTrack(newVideoTrack);
      
      // Update local video element with the updated stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = streamToUse;
        console.log('[GroupVideoCall] Updated local video element with new stream');
      }

      // Update both state references to maintain consistency
      if (localStream === streamToUse) {
        setLocalStream(streamToUse);
      }
      
      // Stop old track after replacement
      currentVideoTrack.stop();
      
      console.log('[GroupVideoCall] Camera switched successfully to', isFrontCamera ? 'front' : 'back', 'camera');
      
    } catch (error) {
      console.error('[GroupVideoCall] Error switching camera:', error);
      
      // User-friendly error messages with more specific details
      const errorMessage = error instanceof Error && error.name === 'NotAllowedError' 
        ? 'Izin kamera diperlukan. Buka Pengaturan browser → Izin situs → Kamera → Izinkan.'
        : error instanceof Error && error.name === 'NotFoundError'
        ? 'Kamera belakang tidak tersedia pada perangkat ini. Perangkat mungkin hanya memiliki kamera depan.'
        : error instanceof Error && error.name === 'NotReadableError'
        ? 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi kamera lain dan coba lagi.'
        : error instanceof Error && error.name === 'OverconstrainedError'
        ? 'Kamera belakang tidak mendukung resolusi yang diminta. Menggunakan pengaturan default.'
        : `Gagal mengganti kamera: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`;
      
      console.log('[GroupVideoCall] Camera switch error details:', error);
      alert(errorMessage);
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
    
    // DON'T clear participant refs to preserve them for UI transitions
    // participantVideoRefs.current = {};
    
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

  // Handle maximize participant
  const handleMaximizeParticipant = useCallback((participant: GroupParticipant) => {
    setMaximizedParticipant(participant);
    setIsMaximized(true);
  }, []);

  // Handle minimize back to grid
  const handleMinimize = useCallback(() => {
    console.log('[GroupVideoCall] Minimizing to grid view - preserving existing streams');
    setIsMaximized(false);
    setMaximizedParticipant(null);
    
    // DON'T force re-attachment - let existing streams continue working
    // The StableParticipantVideo components will handle their own streams
    console.log('[GroupVideoCall] Minimize completed - streams preserved');
  }, []);

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
          
          {/* Group management button removed from video call interface */}
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
                  <div className="relative bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 aspect-[4/3] min-h-[120px] max-h-[160px]">
                    {/* Video element - always present */}
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ display: isVideoEnabled ? 'block' : 'none' }}
                      onLoadedMetadata={() => {
                        console.log(`[GroupVideoCall] Local video metadata loaded`);
                      }}
                      onCanPlay={() => {
                        console.log(`[GroupVideoCall] Local video can play`);
                      }}
                      onPlay={() => {
                        console.log(`[GroupVideoCall] ✅ Local video started playing`);
                      }}
                      onError={(e) => {
                        console.error(`[GroupVideoCall] ❌ Local video error:`, e);
                      }}
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

                {/* Current Page Participants - Using StableParticipantVideo */}
                {currentPageParticipants.map(participant => {
                  const participantStream = remoteStreams[participant.userId];
                  console.log(`[GroupVideoCall] Rendering participant ${participant.userId}:`, {
                    hasStream: !!participantStream,
                    streamActive: participantStream?.active,
                    streamId: participantStream?.id,
                    videoTracks: participantStream?.getVideoTracks()?.length || 0,
                    audioTracks: participantStream?.getAudioTracks()?.length || 0
                  });
                  
                  return (
                    <StableParticipantVideo
                      key={participant.userId}
                      participant={{
                        ...participant,
                        stream: participantStream || participant.stream
                      }}
                      stream={participantStream || participant.stream}
                      onMaximize={handleMaximizeParticipant}
                      participantVideoRefs={participantVideoRefs}
                    />
                  );
                })}

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
          /* Maximized Mode - Full Screen Selected Participant */
          <div className="w-full h-full relative">
            {maximizedParticipant && (
              <div className="relative bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] rounded-lg overflow-hidden border-2 border-[#4a7c59] h-full w-full">
                {/* Video element for maximized participant */}
                {remoteStreams[maximizedParticipant.userId] ? (
                  <video
                    ref={(el) => {
                      if (el && remoteStreams[maximizedParticipant.userId]) {
                        el.srcObject = remoteStreams[maximizedParticipant.userId];
                      }
                    }}
                    autoPlay
                    playsInline
                    muted={false}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  /* Avatar fallback when no video stream */
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d4a2d] to-[#1e3a1e]">
                    <Avatar className="h-32 w-32 bg-[#7d9f7d] border-4 border-[#a6c455]">
                      <AvatarFallback className="bg-gradient-to-br from-[#7d9f7d] to-[#5d7f5d] text-white text-4xl font-bold">
                        {maximizedParticipant.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                
                <div className="absolute bottom-4 left-4 bg-black/80 px-4 py-2 rounded-lg border border-[#7d9f7d]/50">
                  <p className="text-[#a6c455] text-lg font-bold">{maximizedParticipant.userName}</p>
                </div>
                
                {/* Toggle minimize button */}
                <button
                  onClick={handleMinimize}
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
          onClick={() => {
            console.log('[GroupVideoCall] 🔥 GROUP SWITCH CAMERA BUTTON CLICKED!');
            alert(`🔥 GROUP Switch Camera diklik!\n\nVideo enabled: ${isVideoEnabled}\nComponent: GroupVideoCall`);
            if (!isVideoEnabled) {
              alert('❌ Video tidak aktif di group call!\nNyalakan video dulu.');
              return;
            }
            switchCamera();
          }}
          variant="ghost"
          size="sm"
          className="rounded-full w-10 h-10 border bg-[#4a7c59]/20 border-[#4a7c59] text-[#a6c455] hover:bg-[#4a7c59]/40 transition-all"
        >
          <SwitchCamera className="h-4 w-4" />
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

      {/* Group Management removed from video call interface */}
    </div>
  );
}
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Phone, Camera, RefreshCw } from 'lucide-react';
import { useCall } from '@/hooks/useCall';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

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
  const { activeCall, hangupCall, toggleCallAudio, toggleCallVideo, switchCallCamera, ws } = useCall();
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
  
  // Use useRef for persistent data to avoid setState timing issues
  const peerConnectionsRef = useRef(new Map<number, RTCPeerConnection>());
  const pendingICECandidatesRef = useRef(new Map<number, RTCIceCandidate[]>());
  const remoteStreamsRef = useRef(new Map<string, MediaStream>());
  
  // State untuk trigger re-renders
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerConnections, setPeerConnections] = useState<Map<number, RTCPeerConnection>>(new Map());
  const [pendingICECandidates, setPendingICECandidates] = useState<Map<number, RTCIceCandidate[]>>(new Map());
  
  // Track offer creation state to prevent duplicates
  const offerCreationStateRef = useRef(new Map<number, 'creating' | 'created' | 'idle'>());
  
  // Connection timeout tracking for auto-recovery
  const connectionTimeouts = useRef(new Map<number, NodeJS.Timeout>());

  // Enhanced video attachment with retry mechanism untuk mengatasi AbortError
  const attachVideoStreamWithRetry = async (
    videoElement: HTMLVideoElement, 
    stream: MediaStream, 
    label: string,
    maxRetries: number = 3
  ): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[GroupVideoCallSimple] 🔄 Attempting ${label} video attach (${attempt}/${maxRetries})`);
        
        // Validate stream dan element
        if (!stream || !stream.active) {
          console.warn(`[GroupVideoCallSimple] ⚠️ ${label} stream is not active`);
          return false;
        }
        
        if (!videoElement) {
          console.warn(`[GroupVideoCallSimple] ⚠️ ${label} video element not available`);
          return false;
        }
        
        // Clear previous stream dengan proper cleanup
        if (videoElement.srcObject) {
          videoElement.srcObject = null;
          videoElement.load();
          // Wait for cleanup to complete
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Attach new stream
        videoElement.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Timeout waiting for loadeddata')), 3000);
          
          const onLoadedData = () => {
            clearTimeout(timeoutId);
            videoElement.removeEventListener('loadeddata', onLoadedData);
            resolve(void 0);
          };
          
          videoElement.addEventListener('loadeddata', onLoadedData);
          
          // If already loaded, resolve immediately
          if (videoElement.readyState >= 2) {
            clearTimeout(timeoutId);
            resolve(void 0);
          }
        });
        
        // Try to play with error handling
        await new Promise((resolve, reject) => {
          const playPromise = videoElement.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log(`[GroupVideoCallSimple] ✅ ${label} video playing successfully (attempt ${attempt})`);
                resolve(void 0);
              })
              .catch((error: Error) => {
                console.warn(`[GroupVideoCallSimple] ⚠️ ${label} play failed (attempt ${attempt}):`, error.message);
                
                // For AbortError, wait and try again
                if (error.name === 'AbortError') {
                  setTimeout(() => reject(error), 200 * attempt); // Exponential backoff
                } else {
                  reject(error);
                }
              });
          } else {
            resolve(void 0);
          }
        });
        
        return true; // Success
        
      } catch (error: any) {
        console.warn(`[GroupVideoCallSimple] ⚠️ ${label} video attach attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          console.error(`[GroupVideoCallSimple] ❌ ${label} video attach failed after ${maxRetries} attempts`);
          return false;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 300 * attempt));
      }
    }
    
    return false;
  };

  // Reusable media initialization function  
  const initializeMediaStream = async () => {
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

        // Ensure video track is enabled
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          setIsVideoEnabled(true);
          console.log('[GroupVideoCallSimple] ✅ Video enabled from start');
        }

        // Attach to local video element dengan enhanced error handling
        if (localVideoRef.current) {
          await attachVideoStreamWithRetry(localVideoRef.current, stream, 'Local');
        }

      setLocalStream(stream);
      setStreamInitialized(true);
      console.log('[GroupVideoCallSimple] 📊 Media stream set in state and marked as initialized');
      return stream;

    } catch (error) {
      console.error('[GroupVideoCallSimple] ❌ Failed to get media:', error);
      alert('Gagal mengakses kamera/mikrofon. Pastikan izin sudah diberikan.');
      throw error;
    }
  };

  // Initialize local media stream saat component mount dengan enhanced stability
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    
    const initWithRetry = async () => {
      while (mounted && retryCount < 3) {
        try {
          await initializeMediaStream();
          break; // Success
        } catch (error) {
          retryCount++;
          console.warn(`[GroupVideoCallSimple] ⚠️ Media initialization attempt ${retryCount} failed:`, error);
          
          if (retryCount < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          } else {
            console.error('[GroupVideoCallSimple] ❌ Media initialization failed after 3 attempts');
          }
        }
      }
    };
    
    initWithRetry();

    // Cleanup saat component unmount
    return () => {
      mounted = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        console.log('[GroupVideoCallSimple] 🧹 Local stream cleaned up');
      }
    };
  }, []);

  // Update local video ref saat stream berubah dengan retry mechanism
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      attachVideoStreamWithRetry(localVideoRef.current, localStream, 'Local-Update');
    }
  }, [localStream]);

  // Enhanced stream state tracking untuk better timing
  const [streamInitialized, setStreamInitialized] = useState(false);
  
  useEffect(() => {
    if (localStream && localStream.active) {
      setStreamInitialized(true);
      console.log('[GroupVideoCallSimple] 📊 Stream initialized and ready for WebRTC');
    }
  }, [localStream]);

  // Get current user ID for filtering
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Update participants dari activeCall dan remoteStreams state
  useEffect(() => {
    if (activeCall?.participants && currentUser) {
      console.log('[GroupVideoCallSimple] Updating participants:', activeCall.participants);
      console.log('[GroupVideoCallSimple] Current user ID:', currentUser.id);
      console.log('[GroupVideoCallSimple] Available remote streams:', remoteStreams);
      
      // Get remote streams as array dari state
      const remoteStreamsArray = Array.from(remoteStreams.values());
      console.log('[GroupVideoCallSimple] Remote streams array:', remoteStreamsArray);
      
      // Filter out current user from participants to avoid duplication
      console.log('[GroupVideoCallSimple] 🔍 Before filtering participants:', activeCall.participants.map(p => `${p.userName}(${p.userId})`));
      console.log('[GroupVideoCallSimple] 🔍 Current user to filter out:', currentUser.id);
      
      const filteredParticipants = activeCall.participants.filter(p => p.userId !== currentUser.id);
      console.log('[GroupVideoCallSimple] 🔍 After filtering participants:', filteredParticipants.map(p => `${p.userName}(${p.userId})`));
      
      const newParticipants = filteredParticipants.map((p) => {
          const streamKey = `user_${p.userId}`;
          const userStream = remoteStreams.get(streamKey);
          
          console.log(`[GroupVideoCallSimple] 🔍 Mapping participant ${p.userName} (${p.userId}):`, {
            streamKey,
            hasStream: !!userStream,
            streamId: userStream?.id,
            streamActive: userStream?.active,
            videoTracks: userStream?.getVideoTracks().length || 0,
            audioTracks: userStream?.getAudioTracks().length || 0
          });
          
          return {
            userId: p.userId,
            userName: p.userName,
            stream: userStream || null,
            videoRef: React.createRef<HTMLVideoElement>()
          };
        });
      
      console.log('[GroupVideoCallSimple] 📋 Final participants list:', newParticipants.map(p => ({
        userName: p.userName,
        userId: p.userId,
        hasStream: !!p.stream
      })));
      
      setParticipants(newParticipants);
    }
  }, [activeCall?.participants, remoteStreams, currentUser]);

  // Add WebRTC event listeners for group calls
  useEffect(() => {
    const handleGroupWebRTCOffer = (event: CustomEvent) => {
      console.log('[GroupVideoCallSimple] Received group WebRTC offer:', event.detail);
      // Create WebRTC answer for incoming offer
      handleIncomingWebRTCOffer(event.detail);
    };

    const handleGroupWebRTCAnswer = (event: CustomEvent) => {
      console.log('[GroupVideoCallSimple] Received group WebRTC answer:', event.detail);
      // Process WebRTC answer
      handleIncomingWebRTCAnswer(event.detail);
    };

    const handleGroupWebRTCIceCandidate = (event: CustomEvent) => {
      console.log('[GroupVideoCallSimple] Received group WebRTC ICE candidate:', event.detail);
      // Process ICE candidate
      handleIncomingICECandidate(event.detail);
    };

    const handleInitiateWebRTC = (event: CustomEvent) => {
      console.log('[GroupVideoCallSimple] Initiating WebRTC for group call:', event.detail);
      // Start WebRTC connection with other participants
      initiateWebRTCConnections(event.detail);
    };

    // Add listeners for participant updates yang trigger WebRTC initiation
    const handleGroupParticipantsUpdate = (event: CustomEvent) => {
      console.log('[GroupVideoCallSimple] Participants update received, triggerWebRTC:', event.detail.triggerWebRTC);
      if (event.detail.triggerWebRTC) {
        setTimeout(() => {
          initiateWebRTCConnections(event.detail);
        }, 1000);
      }
    };

    // Handle participant refresh requests
    const handleParticipantRefresh = (event: CustomEvent) => {
      const data = event.detail;
      console.log(`[GroupVideoCallSimple] Received participant refresh request:`, data);
      
      // If this is for us, refresh our connection back
      if (data.targetUserId === currentUser?.id) {
        console.log(`[GroupVideoCallSimple] 🔄 Responding to refresh request from user ${data.fromUserId}`);
        // Refresh our connection to the requesting user
        refreshParticipantConnection(data.fromUserId);
      }
    };

    window.addEventListener('group-webrtc-offer', handleGroupWebRTCOffer as EventListener);
    window.addEventListener('group-webrtc-answer', handleGroupWebRTCAnswer as EventListener);
    window.addEventListener('group-webrtc-ice-candidate', handleGroupWebRTCIceCandidate as EventListener);
    window.addEventListener('initiate-group-webrtc', handleInitiateWebRTC as EventListener);
    window.addEventListener('group-participants-update', handleGroupParticipantsUpdate as EventListener);
    window.addEventListener('group-participant-refresh', handleParticipantRefresh as EventListener);

    return () => {
      window.removeEventListener('group-webrtc-offer', handleGroupWebRTCOffer as EventListener);
      window.removeEventListener('group-webrtc-answer', handleGroupWebRTCAnswer as EventListener);
      window.removeEventListener('group-webrtc-ice-candidate', handleGroupWebRTCIceCandidate as EventListener);
      window.removeEventListener('initiate-group-webrtc', handleInitiateWebRTC as EventListener);
      window.removeEventListener('group-participants-update', handleGroupParticipantsUpdate as EventListener);
      window.removeEventListener('group-participant-refresh', handleParticipantRefresh as EventListener);
    };
  }, [activeCall]);

  // WebRTC Handler Functions (Updated for multiple peer connections)
  const handleIncomingWebRTCOffer = async (offerData: any) => {
    console.log('[GroupVideoCallSimple] 📥 PROCESSING WEBRTC OFFER from user:', offerData.fromUserId);
    console.log('[GroupVideoCallSimple] 📥 Offer data:', {
      fromUserId: offerData.fromUserId,
      hasOffer: !!offerData.offer,
      offerType: offerData.offer?.type,
      callId: offerData.callId
    });
    
    if (!currentUser) {
      console.log('[GroupVideoCallSimple] ❌ No current user available');
      return;
    }

    // Get or create dedicated peer connection untuk user ini
    const pc = getOrCreatePeerConnection(offerData.fromUserId);
    
    // Check current signaling state to prevent collision
    if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
      console.log(`[GroupVideoCallSimple] ⚠️ Peer connection for user ${offerData.fromUserId} not in correct state for offer:`, pc.signalingState);
      // If we're in the middle of another negotiation, queue this offer
      setTimeout(() => handleIncomingWebRTCOffer(offerData), 1000);
      return;
    }

    // Enhanced stream availability check untuk incoming offers
    let streamToUse = localStream;
    let streamWaitAttempts = 0;
    
    // Wait for existing stream first
    while (!streamToUse && streamWaitAttempts < 5) {
      streamWaitAttempts++;
      console.log(`[GroupVideoCallSimple] ⏳ Waiting for existing stream... (attempt ${streamWaitAttempts}/5)`);
      await new Promise(resolve => setTimeout(resolve, 100));
      streamToUse = localStream;
    }
    
    // If still no stream, try to initialize
    if (!streamToUse) {
      console.log('[GroupVideoCallSimple] ⚠️ Local stream not ready, initializing...');
      try {
        streamToUse = await initializeMediaStream();
        // Give a moment for the stream to be set in state
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Use the returned stream directly if state hasn't updated yet
        if (!localStream && streamToUse) {
          console.log('[GroupVideoCallSimple] 📦 Using newly initialized stream directly');
        }
      } catch (error) {
        console.error('[GroupVideoCallSimple] ❌ Failed to initialize media for incoming offer:', error);
        return;
      }
    }

    // Final check - use either localStream or the newly created one
    const finalStream = localStream || streamToUse;
    if (!finalStream) {
      console.log('[GroupVideoCallSimple] ❌ Still no stream available after initialization');
      return;
    }

    try {
      // Ensure local tracks are added before setting remote description
      if (finalStream) {
        const senders = pc.getSenders();
        console.log(`[GroupVideoCallSimple] 📊 Current senders before answer for user ${offerData.fromUserId}:`, senders.length);
        
        // Only add tracks if they haven't been added yet
        if (senders.length === 0) {
          finalStream.getTracks().forEach(track => {
            const sender = pc.addTrack(track, finalStream);
            console.log(`[GroupVideoCallSimple] ✅ Added local track for answer to user ${offerData.fromUserId}:`, {
              trackKind: track.kind,
              trackEnabled: track.enabled,
              senderId: sender ? 'created' : 'failed'
            });
          });
        } else {
          console.log(`[GroupVideoCallSimple] ℹ️ Tracks already added for answer to user ${offerData.fromUserId}`);
        }
      } else {
        console.log(`[GroupVideoCallSimple] ⚠️ No stream available when creating answer for user ${offerData.fromUserId}`);
      }
      
      console.log('[GroupVideoCallSimple] 🔗 Peer connection state before setting remote description:', {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState
      });
      
      await pc.setRemoteDescription(new RTCSessionDescription(offerData.offer));
      console.log('[GroupVideoCallSimple] ✅ Set remote description for offer from user:', offerData.fromUserId);

      // Process any pending ICE candidates now that remote description is set
      await processPendingICECandidates(offerData.fromUserId, pc);

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[GroupVideoCallSimple] ✅ Created and set local answer for user:', offerData.fromUserId);
      console.log('[GroupVideoCallSimple] 📤 Answer details:', {
        type: answer.type,
        hasAnswer: !!answer.sdp
      });

      // Send answer via WebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'group_webrtc_answer',
          payload: {
            callId: activeCall?.callId,
            answer,
            fromUserId: currentUser.id,
            targetUserId: offerData.fromUserId
          }
        }));
        console.log('[GroupVideoCallSimple] 📤 Sent WebRTC answer to user:', offerData.fromUserId);
      } else {
        console.log('[GroupVideoCallSimple] ❌ WebSocket not ready to send answer');
      }
      
      console.log('[GroupVideoCallSimple] 🔗 Peer connection state after answer:', {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState
      });
    } catch (error) {
      console.error('[GroupVideoCallSimple] ❌ Error processing WebRTC offer from user', offerData.fromUserId, ':', error);
    }
  };

  const handleIncomingWebRTCAnswer = async (answerData: any) => {
    console.log('[GroupVideoCallSimple] 📥 PROCESSING WEBRTC ANSWER from user:', answerData.fromUserId);
    console.log('[GroupVideoCallSimple] 📥 Answer data:', {
      fromUserId: answerData.fromUserId,
      hasAnswer: !!answerData.answer,
      answerType: answerData.answer?.type,
      callId: answerData.callId
    });
    
    // Get existing peer connection untuk user ini
    const pc = peerConnectionsRef.current.get(answerData.fromUserId);
    if (!pc) {
      console.log('[GroupVideoCallSimple] ❌ No peer connection found for user:', answerData.fromUserId);
      console.log('[GroupVideoCallSimple] 🔍 Available peer connections:', Array.from(peerConnectionsRef.current.keys()));
      return;
    }

    console.log('[GroupVideoCallSimple] 🔗 Peer connection state before setting remote description:', {
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      signalingState: pc.signalingState
    });

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answerData.answer));
      console.log('[GroupVideoCallSimple] ✅ Set remote description for answer from user:', answerData.fromUserId);
      
      // Reset offer creation state after successful answer
      offerCreationStateRef.current.set(answerData.fromUserId, 'idle');
      
      // Process any pending ICE candidates now that remote description is set
      await processPendingICECandidates(answerData.fromUserId, pc);
      
      console.log('[GroupVideoCallSimple] 🔗 Peer connection state after answer:', {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState
      });
    } catch (error) {
      console.error('[GroupVideoCallSimple] ❌ Error processing WebRTC answer from user', answerData.fromUserId, ':', error);
    }
  };

  const handleIncomingICECandidate = async (candidateData: any) => {
    console.log('[GroupVideoCallSimple] 🧊 Processing ICE candidate from user:', candidateData.fromUserId);
    
    // Get existing peer connection untuk user ini - don't create new one here
    const pc = peerConnectionsRef.current.get(candidateData.fromUserId);
    if (!pc) {
      console.log('[GroupVideoCallSimple] ⏳ No peer connection found for user:', candidateData.fromUserId, '- queueing ICE candidate');
      
      // Queue ICE candidate untuk diproses nanti saat peer connection dibuat
      if (!pendingICECandidatesRef.current.has(candidateData.fromUserId)) {
        pendingICECandidatesRef.current.set(candidateData.fromUserId, []);
      }
      pendingICECandidatesRef.current.get(candidateData.fromUserId)!.push(new RTCIceCandidate(candidateData.candidate));
      
      setPendingICECandidates(prev => {
        const newMap = new Map(prev);
        if (!newMap.has(candidateData.fromUserId)) {
          newMap.set(candidateData.fromUserId, []);
        }
        newMap.get(candidateData.fromUserId)!.push(new RTCIceCandidate(candidateData.candidate));
        return newMap;
      });
      return;
    }

    try {
      // Check if remote description is set before adding ICE candidate
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidateData.candidate));
        console.log('[GroupVideoCallSimple] ✅ Added ICE candidate from user:', candidateData.fromUserId);
      } else {
        console.log('[GroupVideoCallSimple] ⏳ Queuing ICE candidate (no remote description yet) for user:', candidateData.fromUserId);
        
        // Queue ICE candidate untuk diproses nanti
        if (!pendingICECandidatesRef.current.has(candidateData.fromUserId)) {
          pendingICECandidatesRef.current.set(candidateData.fromUserId, []);
        }
        pendingICECandidatesRef.current.get(candidateData.fromUserId)!.push(new RTCIceCandidate(candidateData.candidate));
        
        setPendingICECandidates(prev => {
          const newMap = new Map(prev);
          if (!newMap.has(candidateData.fromUserId)) {
            newMap.set(candidateData.fromUserId, []);
          }
          newMap.get(candidateData.fromUserId)!.push(new RTCIceCandidate(candidateData.candidate));
          return newMap;
        });
      }
    } catch (error) {
      console.error('[GroupVideoCallSimple] ❌ Error adding ICE candidate from user', candidateData.fromUserId, ':', error);
    }
  };

  // Process pending ICE candidates untuk user setelah remote description di-set
  const processPendingICECandidates = async (userId: number, pc: RTCPeerConnection) => {
    const candidates = pendingICECandidatesRef.current.get(userId);
    if (candidates && candidates.length > 0) {
      console.log(`[GroupVideoCallSimple] 🧊 Processing ${candidates.length} pending ICE candidates for user:`, userId);
      
      for (const candidate of candidates) {
        try {
          await pc.addIceCandidate(candidate);
          console.log('[GroupVideoCallSimple] ✅ Added pending ICE candidate for user:', userId);
        } catch (error) {
          console.error('[GroupVideoCallSimple] ❌ Error adding pending ICE candidate for user', userId, ':', error);
        }
      }
      
      // Clear processed candidates from both ref and state
      pendingICECandidatesRef.current.delete(userId);
      setPendingICECandidates(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    }
  };

  // Create or get peer connection for specific user
  const getOrCreatePeerConnection = (userId: number): RTCPeerConnection => {
    let pc = peerConnectionsRef.current.get(userId);
    
    if (!pc) {
      console.log('[GroupVideoCallSimple] Creating new peer connection for user:', userId);
      
      pc = new RTCPeerConnection({
        iceServers: [], // Offline mode - no external STUN servers
        iceCandidatePoolSize: 10,
        iceGatheringTimeout: 5000
      });
      
      // Setup ontrack event untuk menerima remote stream
      pc.ontrack = (event) => {
        console.log('[GroupVideoCallSimple] 🎥 RECEIVED REMOTE TRACK from user', userId, ':', event.track.kind);
        console.log('[GroupVideoCallSimple] 🎥 Event streams:', event.streams);
        
        const remoteStream = event.streams[0];
        if (remoteStream) {
          console.log('[GroupVideoCallSimple] 📦 STORING REMOTE STREAM for user', userId, ':', {
            streamId: remoteStream.id,
            active: remoteStream.active,
            videoTracks: remoteStream.getVideoTracks().length,
            audioTracks: remoteStream.getAudioTracks().length
          });
          
          // Update remote streams both in ref and state
          remoteStreamsRef.current.set(`user_${userId}`, remoteStream);
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(`user_${userId}`, remoteStream);
            console.log('[GroupVideoCallSimple] 📦 Updated remoteStreams map, total streams:', newMap.size);
            return newMap;
          });
          
          // Force re-render dengan delay untuk memastikan state sudah update
          setTimeout(() => {
            setParticipants(prevParticipants => {
              console.log('[GroupVideoCallSimple] 🔄 FORCE RE-RENDER participants for user', userId);
              return [...prevParticipants];
            });
          }, 100);
        } else {
          console.log('[GroupVideoCallSimple] ❌ No remote stream in ontrack event for user', userId);
        }
      };
      
      // Setup ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'group_webrtc_ice_candidate',
            payload: {
              callId: activeCall?.callId,
              candidate: event.candidate,
              fromUserId: currentUser?.id,
              targetUserId: userId
            }
          }));
          console.log('[GroupVideoCallSimple] Sent ICE candidate to user:', userId);
        }
      };
      
      // Enhanced connection state monitoring dengan auto-recovery
      pc.onconnectionstatechange = () => {
        console.log('[GroupVideoCallSimple] Connection state for user', userId, ':', pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          console.log('[GroupVideoCallSimple] ✅ Successfully connected to user', userId);
          // Reset any recovery timers
          if (connectionTimeouts.current.has(userId)) {
            clearTimeout(connectionTimeouts.current.get(userId));
            connectionTimeouts.current.delete(userId);
          }
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.log('[GroupVideoCallSimple] ❌ Connection failed for user', userId, '- attempting restart');
          try {
            pc.restartIce();
          } catch (error) {
            console.error('[GroupVideoCallSimple] Error restarting ICE for user', userId, ':', error);
          }
        } else if (pc.connectionState === 'connecting') {
          // Set timeout untuk stuck connections
          const timeoutId = setTimeout(() => {
            if (pc.connectionState === 'connecting') {
              console.log('[GroupVideoCallSimple] ⏰ Connection timeout for user', userId, '- restarting');
              try {
                pc.restartIce();
              } catch (error) {
                console.error('[GroupVideoCallSimple] Error restarting stuck connection for user', userId, ':', error);
              }
            }
          }, 15000); // 15 seconds timeout
          
          connectionTimeouts.current.set(userId, timeoutId);
        }
      };
      
      // Add local tracks to this peer connection dengan fallback stream detection
      const availableStream = localStream;
      if (availableStream) {
        availableStream.getTracks().forEach(track => {
          const sender = pc!.addTrack(track, availableStream);
          console.log('[GroupVideoCallSimple] ✅ Added local track to peer connection for user', userId, ':', {
            trackKind: track.kind,
            trackEnabled: track.enabled,
            trackReadyState: track.readyState,
            senderId: sender ? 'created' : 'failed'
          });
        });
        
        console.log('[GroupVideoCallSimple] 📊 Peer connection state for user', userId, ':', {
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          iceGatheringState: pc.iceGatheringState,
          signalingState: pc.signalingState,
          localTracks: availableStream.getTracks().length
        });
      } else {
        console.log('[GroupVideoCallSimple] ⚠️ No local stream available when creating peer connection for user', userId);
      }
      
      // Store peer connection in both ref and state
      peerConnectionsRef.current.set(userId, pc!);
      setPeerConnections(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, pc!);
        console.log('[GroupVideoCallSimple] 📊 Updated peerConnections map, total connections:', newMap.size);
        console.log('[GroupVideoCallSimple] 📊 Stored connection for users:', Array.from(newMap.keys()));
        return newMap;
      });
    }
    
    return pc;
  };

  const initiateWebRTCConnections = async (data: any) => {
    console.log('[GroupVideoCallSimple] 🚀 Initiating WebRTC connections with participants:', data.participants);
    
    if (!currentUser) {
      console.log('[GroupVideoCallSimple] ❌ Missing current user for WebRTC initiation');
      return;
    }

    // Enhanced stream waiting mechanism dengan timeout
    let currentStream = localStream;
    let streamWaitAttempts = 0;
    
    // Wait for stream to be ready dengan polling
    while (!currentStream && streamWaitAttempts < 10) {
      streamWaitAttempts++;
      console.log(`[GroupVideoCallSimple] ⏳ Waiting for stream initialization... (attempt ${streamWaitAttempts}/10)`);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      currentStream = localStream;
      
      if (!currentStream) {
        // Check if stream is being initialized
        const streamInitInProgress = !streamInitialized;
        console.log(`[GroupVideoCallSimple] 📊 Stream status check: initialized=${streamInitialized}, attempt=${streamWaitAttempts}`);
        
        if (streamInitInProgress && streamWaitAttempts < 5) {
          continue; // Keep waiting if initialization is in progress
        }
        
        // Try to initialize if not already started
        if (streamWaitAttempts === 5) {
          console.log('[GroupVideoCallSimple] ⚠️ Stream wait timeout, forcing initialization...');
          try {
            currentStream = await initializeMediaStream();
            if (currentStream) {
              console.log('[GroupVideoCallSimple] ✅ Forced stream initialization successful');
              break;
            }
          } catch (error) {
            console.error('[GroupVideoCallSimple] ❌ Forced stream initialization failed:', error);
          }
        }
      }
    }

    // Final fallback check
    if (!currentStream && localStream) {
      currentStream = localStream;
      console.log('[GroupVideoCallSimple] 🔄 Using fallback local stream from state');
    }

    if (!currentStream) {
      console.log('[GroupVideoCallSimple] ❌ Stream not available after all attempts');
      return;
    }

    console.log('[GroupVideoCallSimple] 📊 Local stream ready for offers:', {
      streamId: currentStream.id,
      active: currentStream.active,
      videoTracks: currentStream.getVideoTracks().length,
      audioTracks: currentStream.getAudioTracks().length,
      videoEnabled: currentStream.getVideoTracks()[0]?.enabled,
      audioEnabled: currentStream.getAudioTracks()[0]?.enabled
    });

    try {
      // Create peer connection dan offer untuk setiap participant
      for (const participant of data.participants) {
        if (participant.userId !== currentUser.id) {
          try {
            console.log(`[GroupVideoCallSimple] 🔗 Creating offer for participant: ${participant.userName} (${participant.userId})`);
            
            const pc = getOrCreatePeerConnection(participant.userId);
            
            // Check signaling state and offer creation state to prevent collision
            const currentOfferState = offerCreationStateRef.current.get(participant.userId);
            if (pc.signalingState !== 'stable' || currentOfferState === 'creating') {
              console.log(`[GroupVideoCallSimple] ⚠️ Skipping offer creation for user ${participant.userId}, signaling state: ${pc.signalingState}, offer state: ${currentOfferState}`);
              continue;
            }
            
            // Mark offer as being created
            offerCreationStateRef.current.set(participant.userId, 'creating');
            
            // Ensure local tracks are added before creating offer
            if (currentStream) {
              const senders = pc.getSenders();
              console.log(`[GroupVideoCallSimple] 📊 Current senders for user ${participant.userId}:`, senders.length);
              
              // Only add tracks if they haven't been added yet
              if (senders.length === 0) {
                currentStream.getTracks().forEach(track => {
                  const sender = pc.addTrack(track, currentStream);
                  console.log(`[GroupVideoCallSimple] ✅ Re-added local track for offer to user ${participant.userId}:`, {
                    trackKind: track.kind,
                    trackEnabled: track.enabled,
                    senderId: sender ? 'created' : 'failed'
                  });
                });
              } else {
                console.log(`[GroupVideoCallSimple] ℹ️ Tracks already added for user ${participant.userId}`);
              }
            }
            
            // Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log('[GroupVideoCallSimple] ✅ Created and set local offer for user:', participant.userId);

            // Send offer via WebSocket
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'group_webrtc_offer',
                payload: {
                  callId: activeCall?.callId,
                  offer,
                  fromUserId: currentUser.id,
                  targetUserId: participant.userId
                }
              }));
              console.log('[GroupVideoCallSimple] Sent WebRTC offer to user:', participant.userId);
              
              // Mark offer as created
              offerCreationStateRef.current.set(participant.userId, 'created');
            } else {
              // Reset state if sending failed
              offerCreationStateRef.current.set(participant.userId, 'idle');
            }
          } catch (participantError) {
            console.error(`[GroupVideoCallSimple] Error creating offer for participant ${participant.userId}:`, participantError);
            // Reset offer state on error
            offerCreationStateRef.current.set(participant.userId, 'idle');
          }
        }
      }
    } catch (error) {
      console.error('[GroupVideoCallSimple] Error initiating WebRTC connections:', error);
    }
  };

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

  // Cleanup peer connections
  const cleanupPeerConnections = () => {
    console.log('[GroupVideoCallSimple] Cleaning up peer connections...');
    peerConnectionsRef.current.forEach((pc, userId) => {
      try {
        pc.close();
        console.log('[GroupVideoCallSimple] Closed peer connection for user:', userId);
      } catch (error) {
        console.error('[GroupVideoCallSimple] Error closing peer connection for user', userId, ':', error);
      }
    });
    
    // Clear both ref and state
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    pendingICECandidatesRef.current.clear();
    
    setPeerConnections(new Map());
    setRemoteStreams(new Map());
    setPendingICECandidates(new Map());
  };

  // Cleanup effect on component unmount ONLY
  useEffect(() => {
    return () => {
      // Only cleanup on actual unmount, not on re-renders
      console.log('[GroupVideoCallSimple] 🧹 Component unmounting - final cleanup');
      cleanupPeerConnections();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty dependency array to prevent re-running

  // Individual participant refresh function untuk re-request WebRTC connection
  const refreshParticipantConnection = async (userId: number) => {
    console.log(`[GroupVideoCallSimple] 🔄 Refreshing bidirectional connection for user ${userId}`);
    
    try {
      // Reset status untuk participant yang di-refresh
      setParticipants(prev => prev.map(p => {
        if (p.userId === userId) {
          return { ...p, connectionStatus: 'loading' };
        }
        return p;
      }));
      
      // Close existing peer connection for this user
      const existingPc = peerConnectionsRef.current.get(userId);
      if (existingPc) {
        console.log(`[GroupVideoCallSimple] 🗑️ Closing existing connection for user ${userId}`);
        existingPc.close();
        peerConnectionsRef.current.delete(userId);
      }
      
      // Remove existing remote stream
      remoteStreamsRef.current.delete(`user_${userId}`);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(`user_${userId}`);
        return newMap;
      });
      
      // Clear any timeout for this user
      if (connectionTimeouts.current.has(userId)) {
        clearTimeout(connectionTimeouts.current.get(userId));
        connectionTimeouts.current.delete(userId);
      }
      
      // Wait a moment untuk cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send bidirectional refresh request
      if (currentUser && ws && ws.readyState === WebSocket.OPEN) {
        console.log(`[GroupVideoCallSimple] 🔄 Sending bidirectional refresh request to user ${userId}`);
        
        // Send refresh request message untuk trigger mutual refresh
        ws.send(JSON.stringify({
          type: 'group_participant_refresh',
          payload: {
            callId: activeCall?.callId,
            fromUserId: currentUser.id,
            targetUserId: userId
          }
        }));
        
        // Also create new offer dari current user
        if (localStream) {
          const pc = getOrCreatePeerConnection(userId);
          
          // Create and send new offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          console.log(`[GroupVideoCallSimple] 📤 Sending refresh offer to user ${userId}`);
          
          ws.send(JSON.stringify({
            type: 'group_webrtc_offer',
            payload: {
              callId: activeCall?.callId,
              offer,
              fromUserId: currentUser.id,
              targetUserId: userId
            }
          }));
        }
        
        console.log(`[GroupVideoCallSimple] ✅ Bidirectional refresh initiated for user ${userId}`);
      }
    } catch (error) {
      console.error(`[GroupVideoCallSimple] ❌ Error refreshing connection for user ${userId}:`, error);
    }
  };

  // Handle hangup
  const handleHangup = () => {
    console.log('[GroupVideoCallSimple] Hanging up call...');
    
    // Cleanup peer connections
    cleanupPeerConnections();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
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
          <ParticipantVideo 
            key={participant.userId} 
            participant={participant} 
            onRefreshConnection={() => refreshParticipantConnection(participant.userId)}
          />
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
            title="Ganti Kamera"
          >
            <Camera size={20} />
          </Button>
        )}

        <Button
          variant="outline"
          size="lg"
          onClick={async () => {
            console.log('[GroupVideoCallSimple] 🔄 Enhanced manual video refresh initiated');
            
            // Enhanced refresh for all participant videos
            for (const participant of participants) {
              if (participant.stream && participant.videoRef?.current) {
                console.log(`[GroupVideoCallSimple] 🔄 Enhanced refresh for ${participant.userName}`);
                await localAttachWithRetry(
                  participant.videoRef.current,
                  participant.stream,
                  `${participant.userName}-ManualRefresh`
                );
              }
            }
            
            // Enhanced refresh for local video
            if (localStream && localVideoRef.current) {
              console.log('[GroupVideoCallSimple] 🔄 Enhanced refresh for local video');
              await attachVideoStreamWithRetry(localVideoRef.current, localStream, 'Local-ManualRefresh');
            }
          }}
          className="rounded-full w-12 h-12 p-0"
          title="Refresh Video"
        >
          <RefreshCw size={20} />
        </Button>

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

// Local fallback retry function for ParticipantVideo
const localAttachWithRetry = async (
  videoElement: HTMLVideoElement,
  stream: MediaStream,
  userName: string,
  maxRetries: number = 3
): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[ParticipantVideo] 🔄 Attempting ${userName} video attach (${attempt}/${maxRetries})`);
      
      if (!stream || !stream.active) {
        console.warn(`[ParticipantVideo] ⚠️ ${userName} stream is not active`);
        return false;
      }
      
      // Clear previous stream
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
        videoElement.load();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Attach new stream
      videoElement.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Timeout')), 3000);
        
        const onLoadedData = () => {
          clearTimeout(timeoutId);
          videoElement.removeEventListener('loadeddata', onLoadedData);
          resolve(void 0);
        };
        
        videoElement.addEventListener('loadeddata', onLoadedData);
        
        if (videoElement.readyState >= 2) {
          clearTimeout(timeoutId);
          resolve(void 0);
        }
      });
      
      // Try to play
      await videoElement.play();
      console.log(`[ParticipantVideo] ✅ ${userName} video playing successfully (attempt ${attempt})`);
      
      // Force update after successful play - dispatch both events
      videoElement.dispatchEvent(new Event('loadeddata'));
      videoElement.dispatchEvent(new Event('playing'));
      
      return true;
      
    } catch (error: any) {
      console.warn(`[ParticipantVideo] ⚠️ ${userName} video attach attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error(`[ParticipantVideo] ❌ ${userName} video attach failed after ${maxRetries} attempts`);
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300 * attempt));
    }
  }
  
  return false;
};

// ParticipantVideo Component dengan enhanced stream handling dan individual refresh
function ParticipantVideo({ participant, onRefreshConnection }: { 
  participant: {
    userId: number;
    userName: string;
    stream: MediaStream | null;
    videoRef: React.RefObject<HTMLVideoElement>;
  };
  onRefreshConnection: () => void;
}) {
  const [hasVideo, setHasVideo] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'failed'>('loading');
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Callback ref untuk memastikan video element terdaftar
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    setVideoElement(node);
    if (participant.videoRef) {
      (participant.videoRef as any).current = node;
    }
  }, [participant.videoRef]);

  useEffect(() => {
    console.log(`[ParticipantVideo] Effect triggered for ${participant.userName}:`, {
      hasVideoElement: !!videoElement,
      hasStream: !!participant.stream,
      streamId: participant.stream?.id,
      streamActive: participant.stream?.active
    });
    
    if (videoElement && participant.stream) {
      console.log(`[ParticipantVideo] Attaching stream for ${participant.userName}`);
      
      // Use enhanced retry mechanism dari parent component
      const attachVideo = async () => {
        try {
          const success = await localAttachWithRetry(videoElement, participant.stream, participant.userName);
          if (success) {
            setHasVideo(true);
            setConnectionStatus('connected');
            setShowRefreshButton(false);
            console.log(`[ParticipantVideo] ✅ Video playing successfully for ${participant.userName} - STATUS SET TO CONNECTED`);
          } else {
            setHasVideo(false);
            setConnectionStatus('failed');
            setShowRefreshButton(true);
            console.log(`[ParticipantVideo] ❌ Failed to attach video for ${participant.userName} - ENABLING REFRESH BUTTON`);
          }
        } catch (error) {
          console.error(`[ParticipantVideo] Error attaching video for ${participant.userName}:`, error);
          setHasVideo(false);
          setConnectionStatus('failed');
          setShowRefreshButton(true);
          console.log(`[ParticipantVideo] ❌ Exception in video attach for ${participant.userName} - ENABLING REFRESH BUTTON`);
        }
      };
      
      // Start video attachment
      attachVideo();
      
      const videoTracks = participant.stream.getVideoTracks();
      const hasVideoEnabled = videoTracks.length > 0 && videoTracks[0].enabled;
      
      console.log(`[ParticipantVideo] Stream details for ${participant.userName}:`, {
        streamId: participant.stream.id,
        active: participant.stream.active,
        videoTracks: videoTracks.length,
        audioTracks: participant.stream.getAudioTracks().length,
        videoEnabled: videoTracks[0]?.enabled,
        hasVideo: hasVideoEnabled
      });
      
      // Add event listeners for video events
      const handleLoadedData = () => {
        console.log(`[ParticipantVideo] ✅ Video loaded for ${participant.userName} - UPDATING STATUS TO CONNECTED`);
        
        // Clear any existing timeout yang bisa interfere
        if (timeoutRef.current) {
          console.log(`[ParticipantVideo] 🚫 Clearing timeout for ${participant.userName} - video loaded successfully`);
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        setHasVideo(true);
        setConnectionStatus('connected');
        setShowRefreshButton(false);
      };
      
      const handleError = (event: Event) => {
        console.warn(`[ParticipantVideo] Video error for ${participant.userName}:`, event);
        setHasVideo(false);
        setConnectionStatus('failed');
        setShowRefreshButton(true);
        console.log(`[ParticipantVideo] 🔄 Enabling refresh button for ${participant.userName} due to video error`);
      };

      const handlePlaying = () => {
        console.log(`[ParticipantVideo] ✅ Video PLAYING event for ${participant.userName} - CONFIRMING STATUS TO CONNECTED`);
        
        // Clear any timeout yang masih berjalan
        if (timeoutRef.current) {
          console.log(`[ParticipantVideo] 🚫 Clearing timeout for ${participant.userName} - video playing confirmed`);
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        setHasVideo(true);
        setConnectionStatus('connected');
        setShowRefreshButton(false);
      };
      
      videoElement.addEventListener('loadeddata', handleLoadedData);
      videoElement.addEventListener('playing', handlePlaying);
      videoElement.addEventListener('error', handleError);
      
      // Cleanup event listeners dan timeout
      return () => {
        // Clear timeout jika ada
        if (timeoutRef.current) {
          console.log(`[ParticipantVideo] 🧹 Cleaning up timeout for ${participant.userName}`);
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        if (videoElement) {
          videoElement.removeEventListener('loadeddata', handleLoadedData);
          videoElement.removeEventListener('playing', handlePlaying);
          videoElement.removeEventListener('error', handleError);
        }
      };
      
    } else {
      console.log(`[ParticipantVideo] No stream or video element for ${participant.userName}`);
      setHasVideo(false);
      setConnectionStatus(participant.stream ? 'loading' : 'failed');
      
      // Show refresh button immediately if no stream, or after timeout for loading
      if (!participant.stream) {
        setShowRefreshButton(true);
        setConnectionStatus('failed');
      } else {
        // If there's a stream but no video element, wait a bit then show refresh
        // Clear any existing timeout terlebih dahulu
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          // Check jika status masih belum connected sebelum set failed
          setConnectionStatus(prevStatus => {
            if (prevStatus !== 'connected') {
              console.log(`[ParticipantVideo] ⏰ Timeout reached for ${participant.userName} - ENABLING REFRESH BUTTON`);
              setShowRefreshButton(true);
              return 'failed';
            } else {
              console.log(`[ParticipantVideo] ⏰ Timeout reached but ${participant.userName} already connected - IGNORING`);
              return prevStatus;
            }
          });
        }, 3000); // Reduced to 3 seconds
      }
    }
  }, [participant.stream, participant.userName, videoElement]);

  // Debug logging untuk refresh button visibility
  console.log(`[ParticipantVideo] ${participant.userName} render state:`, {
    hasVideo,
    connectionStatus,
    showRefreshButton,
    hasStream: !!participant.stream,
    shouldShowRefresh: showRefreshButton || connectionStatus === 'failed'
  });

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      {participant.stream ? (
        <video
          ref={videoCallbackRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full object-cover bg-black"
          style={{ backgroundColor: '#000' }}
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
            <p className="text-xs text-gray-400 mt-1">
              {connectionStatus === 'loading' ? 'Connecting...' : 'Video Off'}
            </p>
            {showRefreshButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshConnection}
                className="mt-2"
                title={`Refresh connection untuk ${participant.userName}`}
              >
                <RefreshCw size={16} className="mr-1" />
                Refresh
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Individual refresh button untuk video yang bermasalah */}
      {(showRefreshButton || connectionStatus === 'failed') && (
        <div className="absolute top-2 right-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshConnection}
            className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white border-gray-600"
            title={`Refresh connection untuk ${participant.userName}`}
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
        {participant.userName}
        {connectionStatus === 'connected' && hasVideo && (
          <span className="ml-1 text-green-400" title="Video Active">● LIVE</span>
        )}
        {connectionStatus === 'loading' && (
          <span className="ml-1 text-yellow-400" title="Loading Video">⏳ Connecting</span>
        )}
        {connectionStatus === 'failed' && (
          <span className="ml-1 text-red-400" title="Connection Failed">● Failed</span>
        )}
      </div>
    </div>
  );
}
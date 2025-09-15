import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff, Users, Radio, Shield, Zap, Headphones, Speaker, Volume2 } from 'lucide-react';
import { useCall } from '@/hooks/useCall';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { audioManager, setPreferredAudioOutput, isEarphoneConnected, getCurrentAudioOutput } from '@/utils/audioManager';

interface GroupCallProps {
  groupId: number;
  groupName: string;
  callType?: 'audio' | 'video';
}

/**
 * GroupCall - Sistem group audio call yang menggunakan proven logic dari GroupVideoCallSimple
 * 
 * Pendekatan yang telah terbukti:
 * 1. Audio aktif dari awal dengan retry mechanisms
 * 2. Stream management yang clean dan reliable  
 * 3. Error handling yang robust
 * 4. State management yang clear
 * 5. Proper cleanup dan connection management
 */
export default function GroupCall({ groupId, groupName, callType = 'audio' }: GroupCallProps) {
  const { activeCall, hangupCall, toggleCallAudio, ws } = useCall();
  const [, setLocation] = useLocation();
  
  // Local audio state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  // Audio output management state
  const [currentAudioOutput, setCurrentAudioOutput] = useState<'earpiece' | 'speaker' | 'earphone'>('speaker');
  const [isEarphoneDetected, setIsEarphoneDetected] = useState(false);
  const [audioVolume, setAudioVolume] = useState(1.0);
  
  // Remote participants state dengan audio-only focus
  const [participants, setParticipants] = useState<Array<{
    userId: number;
    userName: string;
    stream: MediaStream | null;
    audioRef: React.RefObject<HTMLAudioElement>;
    audioEnabled: boolean;
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
  
  // Reconnection state tracking to prevent loops
  const reconnectionState = useRef(new Map<number, { 
    isReconnecting: boolean, 
    lastAttempt: number, 
    attemptCount: number 
  }>());
  
  // Refresh tracking untuk prevent bidirectional refresh loops
  const refreshTracker = useRef(new Map<number, { 
    lastRefresh: number, 
    isRefreshing: boolean,
    refreshSource: 'manual' | 'bidirectional' | 'auto'
  }>());

  // Audio device detection pada mount
  useEffect(() => {
    const detectAudioDevices = async () => {
      const hasEarphones = isEarphoneConnected();
      const currentOutput = getCurrentAudioOutput() as 'earpiece' | 'speaker' | 'earphone';
      
      setIsEarphoneDetected(hasEarphones);
      setCurrentAudioOutput(hasEarphones ? 'earphone' : currentOutput);
      
      console.log('[GroupCall] 🎧 Audio device detection:', {
        hasEarphones,
        currentOutput: hasEarphones ? 'earphone' : currentOutput
      });
      
      // Set optimal output untuk device yang terdeteksi
      if (hasEarphones) {
        setPreferredAudioOutput('earphone');
      }
    };
    
    detectAudioDevices();
  }, []);

  // Function untuk switch audio output
  const switchAudioOutput = useCallback(() => {
    const newOutput = currentAudioOutput === 'speaker' ? 'earphone' : 'speaker';
    setCurrentAudioOutput(newOutput);
    setPreferredAudioOutput(newOutput);
    
    console.log(`[GroupCall] 🔊 Switched audio output to: ${newOutput}`);
    
    // Update volume untuk device yang berbeda
    if (newOutput === 'earphone') {
      setAudioVolume(0.9); // Higher volume for earphones
    } else {
      setAudioVolume(1.0); // Full volume for speakers
    }
  }, [currentAudioOutput]);

  // Function untuk increase volume
  const increaseVolume = useCallback(() => {
    const newVolume = Math.min(1.0, audioVolume + 0.2);
    setAudioVolume(newVolume);
    
    // Apply ke semua audio elements
    participants.forEach(participant => {
      if (participant.audioRef.current) {
        participant.audioRef.current.volume = newVolume;
      }
    });
    
    console.log(`[GroupCall] 🔊 Volume increased to: ${newVolume}`);
  }, [audioVolume, participants]);

  // Enhanced audio attachment with retry mechanism (adapted dari video logic)
  const attachAudioStreamWithRetry = async (
    audioElement: HTMLAudioElement, 
    stream: MediaStream, 
    label: string,
    maxRetries: number = 3
  ): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[GroupCall] 🔄 Attempting ${label} audio attach (${attempt}/${maxRetries})`);
        
        // Validate stream dan element
        if (!stream || !stream.active) {
          console.warn(`[GroupCall] ⚠️ ${label} stream is not active`);
          return false;
        }
        
        if (!audioElement) {
          console.warn(`[GroupCall] ⚠️ ${label} audio element not available`);
          return false;
        }
        
        // Clear previous stream dengan proper cleanup
        if (audioElement.srcObject) {
          audioElement.srcObject = null;
          audioElement.load();
          // Wait for cleanup to complete
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Attach new stream
        audioElement.srcObject = stream;
        
        // Wait for audio to be ready
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Timeout waiting for loadeddata')), 3000);
          
          const onLoadedData = () => {
            clearTimeout(timeoutId);
            audioElement.removeEventListener('loadeddata', onLoadedData);
            resolve(void 0);
          };
          
          audioElement.addEventListener('loadeddata', onLoadedData);
          
          // If already loaded, resolve immediately
          if (audioElement.readyState >= 2) {
            clearTimeout(timeoutId);
            resolve(void 0);
          }
        });
        
        // Enhanced audio settings untuk better volume dan routing
        audioElement.volume = audioVolume; // Apply current volume setting
        audioElement.playsInline = true;
        audioElement.autoplay = true;
        
        // Apply device-specific optimizations
        if (currentAudioOutput === 'earphone') {
          audioElement.volume = Math.min(audioVolume, 0.9); // Protect ears
        } else {
          audioElement.volume = audioVolume; // Full configured volume for speakers
        }
        
        console.log(`[GroupCall] 🎵 Audio settings applied: volume=${audioElement.volume}, output=${currentAudioOutput}`);
        
        // Try to play with error handling
        await new Promise((resolve, reject) => {
          const playPromise = audioElement.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log(`[GroupCall] ✅ ${label} audio playing successfully (attempt ${attempt})`);
                resolve(void 0);
              })
              .catch((error: Error) => {
                console.warn(`[GroupCall] ⚠️ ${label} play failed (attempt ${attempt}):`, error.message);
                
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
        console.warn(`[GroupCall] ⚠️ ${label} audio attach attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          console.error(`[GroupCall] ❌ ${label} audio attach failed after ${maxRetries} attempts`);
          return false;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 300 * attempt));
      }
    }
    
    return false;
  };

  // Media initialization function untuk audio-only calls
  const initializeMediaStream = async () => {
    try {
      console.log('[GroupCall] Initializing media with audio-only from start...');
      
      // Detect mobile device
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log(`[GroupCall] Initializing media for ${isMobile ? 'mobile' : 'desktop'} device`);
      
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Mobile-optimized audio settings
          sampleRate: isMobile ? 16000 : 48000,
          channelCount: 1,
          latency: isMobile ? 0.02 : 0.01
        },
        video: false // Audio-only untuk group calls
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('[GroupCall] ✅ Got media stream:', {
        id: stream.id,
        active: stream.active,
        audioTracks: stream.getAudioTracks().length
      });

      // Ensure audio track is enabled
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        setIsAudioEnabled(true);
        console.log('[GroupCall] ✅ Audio enabled from start');
      }

      setLocalStream(stream);
      setStreamInitialized(true);
      console.log('[GroupCall] 📊 Media stream set in state and marked as initialized');
      return stream;

    } catch (error) {
      console.error('[GroupCall] ❌ Failed to get media:', error);
      alert('Gagal mengakses mikrofon untuk panggilan grup. Pastikan izin sudah diberikan.');
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
          console.warn(`[GroupCall] ⚠️ Media initialization attempt ${retryCount} failed:`, error);
          
          if (retryCount < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          } else {
            console.error('[GroupCall] ❌ Media initialization failed after 3 attempts');
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
        console.log('[GroupCall] 🧹 Local stream cleaned up');
      }
      
      // Clear all connection timeouts
      connectionTimeouts.current.forEach(timeout => clearTimeout(timeout));
      connectionTimeouts.current.clear();
      
      // Clear reconnection state
      reconnectionState.current.clear();
      
      // Clear refresh tracking
      refreshTracker.current.clear();
      
      console.log('[GroupCall] 🧹 Connection timeouts, reconnection state, and refresh tracking cleaned up');
    };
  }, []);

  // Enhanced stream state tracking untuk better timing
  const [streamInitialized, setStreamInitialized] = useState(false);
  
  useEffect(() => {
    if (localStream && localStream.active) {
      setStreamInitialized(true);
      console.log('[GroupCall] 📊 Stream initialized and ready for WebRTC');
    }
  }, [localStream]);

  // Get current user ID for filtering
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Enhanced participant data event listener
  useEffect(() => {
    const handleParticipantDataUpdate = (event: CustomEvent) => {
      console.log('[GroupCall] 🔥 Participant data update event received:', event.detail);
      const { participants: updatedParticipants, isNewMember, fullSync } = event.detail;
      
      if (fullSync && isNewMember) {
        console.log('[GroupCall] 🎯 Full sync for new member - updating participant list');
        // Convert to component-specific format untuk audio calls
        const newParticipants = updatedParticipants.map((p: any) => ({
          userId: p.userId,
          userName: p.userName,
          stream: null,
          audioRef: React.createRef<HTMLAudioElement>(),
          audioEnabled: true
        }));
        setParticipants(newParticipants);
      }
    };
    
    window.addEventListener('participant-data-updated', handleParticipantDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('participant-data-updated', handleParticipantDataUpdate as EventListener);
    };
  }, []);

  // Update participants dari activeCall dan remoteStreams state
  useEffect(() => {
    if (activeCall?.participants && currentUser) {
      console.log('[GroupCall] Updating participants:', activeCall.participants);
      console.log('[GroupCall] Current user ID:', currentUser.id);
      console.log('[GroupCall] Available remote streams:', remoteStreams);
      
      // Get remote streams as array dari state
      const remoteStreamsArray = Array.from(remoteStreams.values());
      console.log('[GroupCall] Remote streams array:', remoteStreamsArray);
      
      // Filter out current user from participants to avoid duplication
      console.log('[GroupCall] 🔍 Before filtering participants:', activeCall.participants.map(p => `${p.userName}(${p.userId})`));
      console.log('[GroupCall] 🔍 Current user to filter out:', currentUser.id);
      
      const filteredParticipants = activeCall.participants.filter(p => p.userId !== currentUser.id);
      console.log('[GroupCall] 🔍 After filtering participants:', filteredParticipants.map(p => `${p.userName}(${p.userId})`));
      
      const newParticipants = filteredParticipants.map((p) => {
          const streamKey = `user_${p.userId}`;
          const userStream = remoteStreams.get(streamKey);
          
          console.log(`[GroupCall] 🔍 Mapping participant ${p.userName} (${p.userId}):`, {
            streamKey,
            hasStream: !!userStream,
            streamId: userStream?.id,
            streamActive: userStream?.active,
            audioTracks: userStream?.getAudioTracks().length || 0
          });
          
          return {
            userId: p.userId,
            userName: p.userName,
            stream: userStream || null,
            audioRef: React.createRef<HTMLAudioElement>(),
            audioEnabled: !!userStream
          };
        });
      
      console.log('[GroupCall] 📋 Final participants list:', newParticipants.map(p => ({
        userName: p.userName,
        userId: p.userId,
        hasStream: !!p.stream,
        audioEnabled: p.audioEnabled
      })));
      
      setParticipants(newParticipants);
    }
  }, [activeCall?.participants, remoteStreams, currentUser]);

  // WebRTC connection utilities
  const getOrCreatePeerConnection = useCallback((userId: number): RTCPeerConnection => {
    let pc = peerConnectionsRef.current.get(userId);
    
    if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
      console.log(`[GroupCall] Creating new peer connection for user ${userId}`);
      
      pc = new RTCPeerConnection({
        iceServers: [], // Offline mode - no external STUN servers
        iceCandidatePoolSize: 10
      });

      // Set up event handlers
      pc.onicecandidate = (event) => {
        if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
          console.log(`[GroupCall] Sending ICE candidate to user ${userId}`);
          ws.send(JSON.stringify({
            type: 'group_webrtc_ice_candidate',
            payload: {
              candidate: event.candidate,
              targetUserId: userId,
              fromUserId: currentUser?.id,
              callId: activeCall?.callId
            }
          }));
        }
      };

      pc.ontrack = (event) => {
        console.log(`[GroupCall] 🎥 RECEIVED REMOTE TRACK from user ${userId}:`, event.track.kind);
        console.log('[GroupCall] 🎥 Event streams:', event.streams);
        
        const remoteStream = event.streams[0];
        if (remoteStream) {
          console.log(`[GroupCall] 📦 STORING REMOTE STREAM for user ${userId}:`, {
            streamId: remoteStream.id,
            active: remoteStream.active,
            audioTracks: remoteStream.getAudioTracks().length
          });
          
          // Update remote streams both in ref and state
          remoteStreamsRef.current.set(`user_${userId}`, remoteStream);
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(`user_${userId}`, remoteStream);
            console.log('[GroupCall] 📦 Updated remoteStreams map, total streams:', newMap.size);
            return newMap;
          });
          
          // Force re-render dengan delay untuk memastikan state sudah update
          setTimeout(() => {
            setParticipants(prevParticipants => {
              console.log(`[GroupCall] 🔄 FORCE RE-RENDER participants for user ${userId}`);
              return [...prevParticipants];
            });
          }, 100);
        } else {
          console.log(`[GroupCall] ❌ No remote stream in ontrack event for user ${userId}`);
        }
      };

      pc.onconnectionstatechange = () => {
        const currentPc = peerConnectionsRef.current.get(userId);
        if (!currentPc) return;
        
        console.log(`[GroupCall] Connection state changed for user ${userId}:`, currentPc.connectionState);
        
        if (currentPc.connectionState === 'connected') {
          console.log(`[GroupCall] ✅ Successfully connected to user ${userId}`);
        } else if (currentPc.connectionState === 'failed' || currentPc.connectionState === 'disconnected') {
          console.log(`[GroupCall] ❌ Connection failed/disconnected for user ${userId}`);
          // Auto-recovery logic could go here
        }
      };

      peerConnectionsRef.current.set(userId, pc);
      setPeerConnections(new Map(peerConnectionsRef.current));
    }
    
    return pc;
  }, [currentUser, activeCall, ws]);

  // Process pending ICE candidates
  const processPendingICECandidates = async (userId: number, pc: RTCPeerConnection) => {
    const candidates = pendingICECandidatesRef.current.get(userId) || [];
    
    if (candidates.length > 0) {
      console.log(`[GroupCall] Processing ${candidates.length} pending ICE candidates for user ${userId}`);
      
      for (const candidate of candidates) {
        try {
          await pc.addIceCandidate(candidate);
          console.log(`[GroupCall] ✅ Added pending ICE candidate for user ${userId}`);
        } catch (error) {
          console.error(`[GroupCall] ❌ Failed to add pending ICE candidate for user ${userId}:`, error);
        }
      }
      
      pendingICECandidatesRef.current.delete(userId);
      setPendingICECandidates(new Map(pendingICECandidatesRef.current));
    }
  };

  // Add WebRTC event listeners for group calls
  useEffect(() => {
    const handleGroupWebRTCOffer = (event: CustomEvent) => {
      console.log('[GroupCall] Received group WebRTC offer:', event.detail);
      handleIncomingWebRTCOffer(event.detail);
    };

    const handleGroupWebRTCAnswer = (event: CustomEvent) => {
      console.log('[GroupCall] Received group WebRTC answer:', event.detail);
      handleIncomingWebRTCAnswer(event.detail);
    };

    const handleGroupWebRTCIceCandidate = (event: CustomEvent) => {
      console.log('[GroupCall] Received group WebRTC ICE candidate:', event.detail);
      handleIncomingICECandidate(event.detail);
    };

    const handleInitiateWebRTC = (event: CustomEvent) => {
      console.log('[GroupCall] Initiating WebRTC for group call:', event.detail);
      initiateWebRTCConnections(event.detail);
    };

    const handleGroupParticipantsUpdate = (event: CustomEvent) => {
      console.log('[GroupCall] Participants update received, triggerWebRTC:', event.detail.triggerWebRTC);
      if (event.detail.triggerWebRTC) {
        setTimeout(() => {
          initiateWebRTCConnections(event.detail);
        }, 1000);
      }
    };

    const handleParticipantRefresh = (event: CustomEvent) => {
      const data = event.detail;
      console.log(`[GroupCall] Received participant refresh request:`, data);
      
      if (data.targetUserId === currentUser?.id) {
        console.log(`[GroupCall] 🔄 Responding to refresh request from user ${data.fromUserId}`);
        refreshParticipantConnection(data.fromUserId, 'bidirectional');
      }
    };

    const handleForceWebRTCReconnect = (event: CustomEvent) => {
      const data = event.detail;
      console.log(`[GroupCall] 🔄 Force WebRTC reconnect triggered for new member:`, data);
      
      if (data.newMember && data.newMember !== currentUser?.id) {
        console.log(`[GroupCall] 🚀 Forcing WebRTC connection to new member ${data.newMember}`);
        
        setTimeout(() => {
          initiateWebRTCConnections(data);
        }, 200);
        
        setTimeout(() => {
          console.log(`[GroupCall] 🔄 Secondary WebRTC trigger for new member visibility`);
          initiateWebRTCConnections({
            ...data,
            forceInit: true,
            timestamp: Date.now()
          });
        }, 1000);
      }
    };

    window.addEventListener('group-webrtc-offer', handleGroupWebRTCOffer as EventListener);
    window.addEventListener('group-webrtc-answer', handleGroupWebRTCAnswer as EventListener);
    window.addEventListener('group-webrtc-ice-candidate', handleGroupWebRTCIceCandidate as EventListener);
    window.addEventListener('auto-initiate-webrtc', handleInitiateWebRTC as EventListener);
    window.addEventListener('group-participants-update', handleGroupParticipantsUpdate as EventListener);
    window.addEventListener('group-participant-refresh', handleParticipantRefresh as EventListener);
    window.addEventListener('force-webrtc-reconnect', handleForceWebRTCReconnect as EventListener);

    return () => {
      window.removeEventListener('group-webrtc-offer', handleGroupWebRTCOffer as EventListener);
      window.removeEventListener('group-webrtc-answer', handleGroupWebRTCAnswer as EventListener);
      window.removeEventListener('group-webrtc-ice-candidate', handleGroupWebRTCIceCandidate as EventListener);
      window.removeEventListener('auto-initiate-webrtc', handleInitiateWebRTC as EventListener);
      window.removeEventListener('group-participants-update', handleGroupParticipantsUpdate as EventListener);
      window.removeEventListener('group-participant-refresh', handleParticipantRefresh as EventListener);
      window.removeEventListener('force-webrtc-reconnect', handleForceWebRTCReconnect as EventListener);
    };
  }, [activeCall]);

  // WebRTC Handler Functions (Adapted from GroupVideoCallSimple)
  const handleIncomingWebRTCOffer = async (offerData: any) => {
    console.log('[GroupCall] 📥 PROCESSING WEBRTC OFFER from user:', offerData.fromUserId);
    
    if (!currentUser) {
      console.log('[GroupCall] ❌ No current user available');
      return;
    }

    const pc = getOrCreatePeerConnection(offerData.fromUserId);
    
    if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
      console.log(`[GroupCall] ⚠️ Peer connection for user ${offerData.fromUserId} not in correct state for offer:`, pc.signalingState);
      setTimeout(() => handleIncomingWebRTCOffer(offerData), 1000);
      return;
    }

    // Enhanced stream availability check
    let streamToUse = localStream;
    let streamWaitAttempts = 0;
    
    while (!streamToUse && streamWaitAttempts < 5) {
      streamWaitAttempts++;
      console.log(`[GroupCall] ⏳ Waiting for existing stream... (attempt ${streamWaitAttempts}/5)`);
      await new Promise(resolve => setTimeout(resolve, 100));
      streamToUse = localStream;
    }
    
    if (!streamToUse) {
      console.log('[GroupCall] ⚠️ Local stream not ready, initializing...');
      try {
        streamToUse = await initializeMediaStream();
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('[GroupCall] ❌ Failed to initialize media for incoming offer:', error);
        return;
      }
    }

    const finalStream = localStream || streamToUse;
    if (!finalStream) {
      console.log('[GroupCall] ❌ Still no stream available after initialization');
      return;
    }

    try {
      // Ensure local tracks are added before setting remote description
      if (finalStream) {
        const senders = pc.getSenders();
        console.log(`[GroupCall] 📊 Current senders before answer for user ${offerData.fromUserId}:`, senders.length);
        
        if (senders.length === 0) {
          finalStream.getTracks().forEach(track => {
            const sender = pc.addTrack(track, finalStream);
            console.log(`[GroupCall] ✅ Added local track for answer to user ${offerData.fromUserId}:`, {
              trackKind: track.kind,
              trackEnabled: track.enabled,
              senderId: sender ? 'created' : 'failed'
            });
          });
        }
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offerData.offer));
      console.log('[GroupCall] ✅ Set remote description for offer from user:', offerData.fromUserId);

      await processPendingICECandidates(offerData.fromUserId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[GroupCall] ✅ Created and set local answer for user:', offerData.fromUserId);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'group_webrtc_answer',
          payload: {
            answer: answer,
            targetUserId: offerData.fromUserId,
            fromUserId: currentUser.id,
            callId: activeCall?.callId
          }
        }));
        console.log('[GroupCall] ✅ Sent WebRTC answer to user:', offerData.fromUserId);
      }

    } catch (error) {
      console.error(`[GroupCall] ❌ Error handling incoming offer from user ${offerData.fromUserId}:`, error);
    }
  };

  const handleIncomingWebRTCAnswer = async (answerData: any) => {
    console.log('[GroupCall] 📥 PROCESSING WEBRTC ANSWER from user:', answerData.fromUserId);
    
    const pc = peerConnectionsRef.current.get(answerData.fromUserId);
    if (!pc) {
      console.log(`[GroupCall] ❌ No peer connection found for user ${answerData.fromUserId}`);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answerData.answer));
      console.log('[GroupCall] ✅ Set remote description for answer from user:', answerData.fromUserId);
      
      await processPendingICECandidates(answerData.fromUserId, pc);
      
    } catch (error) {
      console.error(`[GroupCall] ❌ Error handling incoming answer from user ${answerData.fromUserId}:`, error);
    }
  };

  const handleIncomingICECandidate = async (candidateData: any) => {
    console.log('[GroupCall] 📥 PROCESSING ICE CANDIDATE from user:', candidateData.fromUserId);
    
    const pc = peerConnectionsRef.current.get(candidateData.fromUserId);
    if (!pc) {
      console.log(`[GroupCall] ⚠️ No peer connection for user ${candidateData.fromUserId}, queueing ICE candidate`);
      const candidates = pendingICECandidatesRef.current.get(candidateData.fromUserId) || [];
      candidates.push(candidateData.candidate);
      pendingICECandidatesRef.current.set(candidateData.fromUserId, candidates);
      setPendingICECandidates(new Map(pendingICECandidatesRef.current));
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidateData.candidate));
      console.log('[GroupCall] ✅ Added ICE candidate for user:', candidateData.fromUserId);
    } catch (error) {
      console.error(`[GroupCall] ❌ Error adding ICE candidate for user ${candidateData.fromUserId}:`, error);
    }
  };

  const initiateWebRTCConnections = async (data: any) => {
    if (!activeCall?.participants || !currentUser || !streamInitialized) {
      console.log('[GroupCall] ❌ Cannot initiate WebRTC: missing requirements');
      return;
    }

    console.log('[GroupCall] 🚀 Initiating WebRTC connections for participants');
    
    // Filter participants to exclude current user
    const otherParticipants = activeCall.participants.filter(p => p.userId !== currentUser.id);
    
    for (const participant of otherParticipants) {
      const userId = participant.userId;
      
      // Skip if already creating offer for this user
      if (offerCreationStateRef.current.get(userId) === 'creating') {
        console.log(`[GroupCall] ⏭️ Skipping user ${userId}, offer already being created`);
        continue;
      }
      
      offerCreationStateRef.current.set(userId, 'creating');
      
      try {
        console.log(`[GroupCall] 🎯 Creating WebRTC connection for participant: ${participant.userName} (${userId})`);
        
        const pc = getOrCreatePeerConnection(userId);
        
        // Add local stream tracks
        if (localStream && pc.getSenders().length === 0) {
          localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
            console.log(`[GroupCall] ✅ Added local ${track.kind} track for user ${userId}`);
          });
        }

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'group_webrtc_offer',
            payload: {
              offer: offer,
              targetUserId: userId,
              fromUserId: currentUser.id,
              callId: activeCall.callId
            }
          }));
          console.log(`[GroupCall] ✅ Sent WebRTC offer to user ${userId}`);
        }
        
        offerCreationStateRef.current.set(userId, 'created');
        
      } catch (error) {
        console.error(`[GroupCall] ❌ Failed to create WebRTC connection for user ${userId}:`, error);
        offerCreationStateRef.current.set(userId, 'idle');
      }
      
      // Small delay between offers to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const refreshParticipantConnection = async (userId: number, source: 'manual' | 'bidirectional' | 'auto' = 'manual') => {
    const now = Date.now();
    const tracker = refreshTracker.current.get(userId);
    
    // Anti-loop protection
    if (tracker && (now - tracker.lastRefresh < 2000)) {
      console.log(`[GroupCall] ⏭️ Skipping refresh for user ${userId}, too recent (${now - tracker.lastRefresh}ms ago)`);
      return;
    }
    
    // Set refresh tracking
    refreshTracker.current.set(userId, {
      lastRefresh: now,
      isRefreshing: true,
      refreshSource: source
    });
    
    console.log(`[GroupCall] 🔄 Refreshing connection for user ${userId} (source: ${source})`);
    
    try {
      // Close existing connection
      const existingPc = peerConnectionsRef.current.get(userId);
      if (existingPc) {
        existingPc.close();
        peerConnectionsRef.current.delete(userId);
      }
      
      // Create new connection and initiate offer
      const pc = getOrCreatePeerConnection(userId);
      
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'group_webrtc_offer',
          payload: {
            offer: offer,
            targetUserId: userId,
            fromUserId: currentUser?.id,
            callId: activeCall?.callId,
            isRefresh: true
          }
        }));
      }
      
      console.log(`[GroupCall] ✅ Connection refreshed for user ${userId}`);
      
    } catch (error) {
      console.error(`[GroupCall] ❌ Failed to refresh connection for user ${userId}:`, error);
    } finally {
      // Clear refresh tracking after a delay
      setTimeout(() => {
        const currentTracker = refreshTracker.current.get(userId);
        if (currentTracker && currentTracker.lastRefresh === now) {
          refreshTracker.current.set(userId, {
            ...currentTracker,
            isRefreshing: false
          });
        }
      }, 3000);
    }
  };

  // Attach audio streams untuk remote participants
  useEffect(() => {
    participants.forEach((participant) => {
      if (participant.stream && participant.audioRef.current) {
        attachAudioStreamWithRetry(
          participant.audioRef.current,
          participant.stream,
          `Participant-${participant.userName}`
        );
      }
    });
  }, [participants]);

  // Toggle audio
  const toggleAudio = () => {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  // Leave group call
  const leaveCall = () => {
    console.log('[GroupCall] Leaving group call...');
    
    // Cleanup all peer connections
    peerConnectionsRef.current.forEach((pc, userId) => {
      console.log(`[GroupCall] Closing peer connection for user ${userId}`);
      pc.close();
    });
    peerConnectionsRef.current.clear();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Call the hangup function
    hangupCall();
    
    // Navigate back to chat
    setLocation('/chat');
  };

  if (!activeCall) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Panggilan grup tidak ditemukan</p>
          <Button onClick={() => setLocation('/chat')} className="mt-4">
            Kembali ke Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="group-call-container">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold" data-testid="group-name">
              {groupName || activeCall.groupName || 'Panggilan Grup'}
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="participants-count">
              {participants.length + 1} peserta
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
            <Radio className="w-3 h-3 text-green-600 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">LIVE</span>
          </div>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {/* Current User */}
          <div className="flex flex-col items-center p-4 rounded-lg bg-card border" data-testid="local-participant">
            <Avatar className="w-16 h-16 mb-3">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {currentUser?.callsign?.[0] || currentUser?.fullName?.[0] || 'A'}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-medium text-center mb-2" data-testid="local-participant-name">
              {currentUser?.callsign || currentUser?.fullName || 'Anda'}
            </p>
            <div className="flex items-center space-x-2">
              {isAudioEnabled ? (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Mic className="w-3 h-3 text-green-600" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30">
                  <MicOff className="w-3 h-3 text-red-600" />
                </div>
              )}
              <span className="text-xs text-muted-foreground">(Anda)</span>
            </div>
          </div>

          {/* Remote Participants */}
          {participants.map((participant) => (
            <div key={participant.userId} className="flex flex-col items-center p-4 rounded-lg bg-card border" data-testid={`participant-${participant.userId}`}>
              <Avatar className="w-16 h-16 mb-3">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-lg">
                  {participant.userName[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm font-medium text-center mb-2" data-testid={`participant-name-${participant.userId}`}>
                {participant.userName}
              </p>
              <div className="flex items-center space-x-2">
                {participant.audioEnabled ? (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Mic className="w-3 h-3 text-green-600" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30">
                    <MicOff className="w-3 h-3 text-red-600" />
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {participant.stream ? 'Terhubung' : 'Menghubungkan...'}
                </span>
              </div>
              
              {/* Audio element untuk participant (hidden) */}
              <audio
                ref={participant.audioRef}
                autoPlay
                playsInline
                muted={false}
                className="hidden"
                data-testid={`participant-audio-${participant.userId}`}
              />
            </div>
          ))}
        </div>

        {/* Connection Status */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
            <Shield className="w-3 h-3" />
            <span>Audio terenkrip end-to-end</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-card border-t">
        <div className="flex items-center justify-center space-x-4 max-w-md mx-auto">
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full w-14 h-14"
            data-testid="button-toggle-audio"
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </Button>

          {/* Audio Output Switch */}
          <Button
            onClick={switchAudioOutput}
            variant="outline"
            size="lg"
            className="rounded-full w-14 h-14"
            data-testid="button-switch-audio-output"
            title={`Switch to ${currentAudioOutput === 'speaker' ? 'headphone' : 'speaker'}`}
          >
            {currentAudioOutput === 'speaker' ? (
              <Speaker className="w-6 h-6" />
            ) : (
              <Headphones className="w-6 h-6" />
            )}
          </Button>

          {/* Volume Control */}
          <Button
            onClick={increaseVolume}
            variant="outline"
            size="lg"
            className="rounded-full w-14 h-14"
            data-testid="button-increase-volume"
            title={`Volume: ${Math.round(audioVolume * 100)}%`}
          >
            <Volume2 className="w-6 h-6" />
          </Button>

          <Button
            onClick={leaveCall}
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
            data-testid="button-hangup"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>

        {/* Audio Status Display */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <span className="flex items-center space-x-1">
              {currentAudioOutput === 'speaker' ? (
                <Speaker className="w-3 h-3" />
              ) : (
                <Headphones className="w-3 h-3" />
              )}
              <span>{currentAudioOutput === 'speaker' ? 'Speaker' : 'Headphones'}</span>
            </span>
            <span>•</span>
            <span>Volume: {Math.round(audioVolume * 100)}%</span>
            {isEarphoneDetected && (
              <>
                <span>•</span>
                <span className="text-green-600">🎧 Headset Detected</span>
              </>
            )}
          </div>
        </div>
        
        {/* Additional Info */}
        <div className="mt-2 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center space-x-4">
            <span>Kualitas: HD Audio</span>
            <span>•</span>
            <span>Enkripsi: E2E</span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>Real-time</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
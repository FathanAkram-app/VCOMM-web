import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Phone, Camera } from 'lucide-react';
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
  
  // Remote streams state for force re-render
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  // Peer connections untuk setiap participant
  const [peerConnections, setPeerConnections] = useState<Map<number, RTCPeerConnection>>(new Map());

  // Initialize local media stream saat component mount
  useEffect(() => {
    const initializeMedia = async () => {
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

        setLocalStream(stream);

        // Ensure video track is enabled
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          setIsVideoEnabled(true);
          console.log('[GroupVideoCallSimple] ✅ Video enabled from start');
        }

        // Attach to local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(console.warn);
          console.log('[GroupVideoCallSimple] ✅ Local video attached and playing');
        }

        // If activeCall has a peer connection, add tracks and setup ontrack
        if (activeCall?.peerConnection) {
          // Add local tracks to peer connection
          stream.getTracks().forEach(track => {
            activeCall.peerConnection?.addTrack(track, stream);
            console.log('[GroupVideoCallSimple] ✅ Added track to peer connection:', track.kind);
          });

          // Setup ontrack event handler for receiving remote streams
          activeCall.peerConnection.ontrack = (event) => {
            console.log('[GroupVideoCallSimple] 🎥 Received remote track:', event.track.kind, 'from stream:', event.streams[0].id);
            
            const remoteStream = event.streams[0];
            
            // Initialize remoteStreams Map if not exists
            if (!activeCall.remoteStreams) {
              activeCall.remoteStreams = new Map();
            }
            
            // Store remote stream
            activeCall.remoteStreams.set(remoteStream.id, remoteStream);
            console.log('[GroupVideoCallSimple] 📦 Stored remote stream:', remoteStream.id);
            
            // Force re-render by updating state
            setRemoteStreams(new Map(activeCall.remoteStreams));
            
            console.log('[GroupVideoCallSimple] 🔄 Updated remote streams state for re-render');
          };

          console.log('[GroupVideoCallSimple] 🎯 Configured ontrack event handler for remote streams');
        }

      } catch (error) {
        console.error('[GroupVideoCallSimple] ❌ Failed to get media:', error);
        alert('Gagal mengakses kamera/mikrofon. Pastikan izin sudah diberikan.');
      }
    };

    initializeMedia();

    // Cleanup saat component unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        console.log('[GroupVideoCallSimple] 🧹 Local stream cleaned up');
      }
    };
  }, []);

  // Update local video ref saat stream berubah
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(console.warn);
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
      const newParticipants = activeCall.participants
        .filter(p => p.userId !== currentUser.id) // Filter out current user
        .map((p) => ({
          userId: p.userId,
          userName: p.userName,
          stream: remoteStreams.get(`user_${p.userId}`) || null, // Get stream berdasarkan user ID
          videoRef: React.createRef<HTMLVideoElement>()
        }));
      
      console.log('[GroupVideoCallSimple] Filtered participants (excluding self):', newParticipants);
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

    window.addEventListener('group-webrtc-offer', handleGroupWebRTCOffer as EventListener);
    window.addEventListener('group-webrtc-answer', handleGroupWebRTCAnswer as EventListener);
    window.addEventListener('group-webrtc-ice-candidate', handleGroupWebRTCIceCandidate as EventListener);
    window.addEventListener('initiate-group-webrtc', handleInitiateWebRTC as EventListener);
    window.addEventListener('group-participants-update', handleGroupParticipantsUpdate as EventListener);

    return () => {
      window.removeEventListener('group-webrtc-offer', handleGroupWebRTCOffer as EventListener);
      window.removeEventListener('group-webrtc-answer', handleGroupWebRTCAnswer as EventListener);
      window.removeEventListener('group-webrtc-ice-candidate', handleGroupWebRTCIceCandidate as EventListener);
      window.removeEventListener('initiate-group-webrtc', handleInitiateWebRTC as EventListener);
      window.removeEventListener('group-participants-update', handleGroupParticipantsUpdate as EventListener);
    };
  }, [activeCall]);

  // WebRTC Handler Functions (Updated for multiple peer connections)
  const handleIncomingWebRTCOffer = async (offerData: any) => {
    console.log('[GroupVideoCallSimple] Processing WebRTC offer from user:', offerData.fromUserId);
    
    if (!localStream || !currentUser) {
      console.log('[GroupVideoCallSimple] No local stream or current user available');
      return;
    }

    try {
      // Get or create dedicated peer connection untuk user ini
      const pc = getOrCreatePeerConnection(offerData.fromUserId);
      
      await pc.setRemoteDescription(new RTCSessionDescription(offerData.offer));
      console.log('[GroupVideoCallSimple] Set remote description for offer from user:', offerData.fromUserId);

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[GroupVideoCallSimple] Created and set local answer for user:', offerData.fromUserId);

      // Send answer via WebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'group_webrtc_answer',
          payload: {
            callId: activeCall?.callId,
            answer,
            fromUserId: currentUser.id,
            toUserId: offerData.fromUserId
          }
        }));
        console.log('[GroupVideoCallSimple] Sent WebRTC answer to user:', offerData.fromUserId);
      }
    } catch (error) {
      console.error('[GroupVideoCallSimple] Error processing WebRTC offer from user', offerData.fromUserId, ':', error);
    }
  };

  const handleIncomingWebRTCAnswer = async (answerData: any) => {
    console.log('[GroupVideoCallSimple] Processing WebRTC answer from user:', answerData.fromUserId);
    
    // Get existing peer connection untuk user ini
    const pc = peerConnections.get(answerData.fromUserId);
    if (!pc) {
      console.log('[GroupVideoCallSimple] No peer connection found for user:', answerData.fromUserId);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answerData.answer));
      console.log('[GroupVideoCallSimple] Set remote description for answer from user:', answerData.fromUserId);
    } catch (error) {
      console.error('[GroupVideoCallSimple] Error processing WebRTC answer from user', answerData.fromUserId, ':', error);
    }
  };

  const handleIncomingICECandidate = async (candidateData: any) => {
    console.log('[GroupVideoCallSimple] Processing ICE candidate from user:', candidateData.fromUserId);
    
    // Get existing peer connection untuk user ini
    const pc = peerConnections.get(candidateData.fromUserId);
    if (!pc) {
      console.log('[GroupVideoCallSimple] No peer connection found for user:', candidateData.fromUserId);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidateData.candidate));
      console.log('[GroupVideoCallSimple] Added ICE candidate from user:', candidateData.fromUserId);
    } catch (error) {
      console.error('[GroupVideoCallSimple] Error adding ICE candidate from user', candidateData.fromUserId, ':', error);
    }
  };

  // Create or get peer connection for specific user
  const getOrCreatePeerConnection = (userId: number): RTCPeerConnection => {
    let pc = peerConnections.get(userId);
    
    if (!pc) {
      console.log('[GroupVideoCallSimple] Creating new peer connection for user:', userId);
      
      pc = new RTCPeerConnection({
        iceServers: [] // Offline mode - no external STUN servers
      });
      
      // Setup ontrack event untuk menerima remote stream
      pc.ontrack = (event) => {
        console.log('[GroupVideoCallSimple] 🎥 Received remote track from user', userId, ':', event.track.kind);
        
        const remoteStream = event.streams[0];
        if (remoteStream) {
          console.log('[GroupVideoCallSimple] 📦 Storing remote stream for user', userId, ':', remoteStream.id);
          
          // Update remote streams state
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(`user_${userId}`, remoteStream);
            return newMap;
          });
          
          // Force component re-render to update participant video
          setParticipants(prevParticipants => [...prevParticipants]);
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
              toUserId: userId
            }
          }));
          console.log('[GroupVideoCallSimple] Sent ICE candidate to user:', userId);
        }
      };
      
      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log('[GroupVideoCallSimple] Connection state for user', userId, ':', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.log('[GroupVideoCallSimple] Connection failed for user', userId, '- attempting restart');
          // Restart ICE untuk recovery
          pc.restartIce();
        }
      };
      
      // Add local tracks to this peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc!.addTrack(track, localStream);
          console.log('[GroupVideoCallSimple] ✅ Added local track to peer connection for user', userId, ':', track.kind);
        });
      }
      
      // Store peer connection
      setPeerConnections(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, pc!);
        return newMap;
      });
    }
    
    return pc;
  };

  const initiateWebRTCConnections = async (data: any) => {
    console.log('[GroupVideoCallSimple] Initiating WebRTC connections with participants:', data.participants);
    
    if (!localStream || !currentUser) {
      console.log('[GroupVideoCallSimple] Missing requirements for WebRTC initiation');
      return;
    }

    try {
      // Create peer connection dan offer untuk setiap participant
      for (const participant of data.participants) {
        if (participant.userId !== currentUser.id) {
          const pc = getOrCreatePeerConnection(participant.userId);
          
          // Create offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log('[GroupVideoCallSimple] Created and set local offer for user:', participant.userId);

          // Send offer via WebSocket
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'group_webrtc_offer',
              payload: {
                callId: activeCall?.callId,
                offer,
                fromUserId: currentUser.id,
                toUserId: participant.userId
              }
            }));
            console.log('[GroupVideoCallSimple] Sent WebRTC offer to user:', participant.userId);
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
    peerConnections.forEach((pc, userId) => {
      try {
        pc.close();
        console.log('[GroupVideoCallSimple] Closed peer connection for user:', userId);
      } catch (error) {
        console.error('[GroupVideoCallSimple] Error closing peer connection for user', userId, ':', error);
      }
    });
    setPeerConnections(new Map());
    setRemoteStreams(new Map());
  };

  // Cleanup effect on component unmount
  useEffect(() => {
    return () => {
      cleanupPeerConnections();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
          <ParticipantVideo key={participant.userId} participant={participant} />
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
          >
            <Camera size={20} />
          </Button>
        )}

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

// Component untuk menampilkan video participant
function ParticipantVideo({ participant }: { 
  participant: {
    userId: number;
    userName: string;
    stream: MediaStream | null;
    videoRef: React.RefObject<HTMLVideoElement>;
  }
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    console.log(`[ParticipantVideo] Effect triggered for ${participant.userName}:`, {
      hasVideoRef: !!videoRef.current,
      hasStream: !!participant.stream,
      streamId: participant.stream?.id,
      streamActive: participant.stream?.active
    });
    
    if (videoRef.current && participant.stream) {
      console.log(`[ParticipantVideo] Attaching stream for ${participant.userName}`);
      videoRef.current.srcObject = participant.stream;
      
      videoRef.current.play()
        .then(() => {
          console.log(`[ParticipantVideo] ✅ Video playing successfully for ${participant.userName}`);
        })
        .catch(error => {
          console.warn(`[ParticipantVideo] ❌ Video play failed for ${participant.userName}:`, error);
        });
      
      const videoTracks = participant.stream.getVideoTracks();
      const hasVideoEnabled = videoTracks.length > 0 && videoTracks[0].enabled;
      setHasVideo(hasVideoEnabled);
      
      console.log(`[ParticipantVideo] Stream details for ${participant.userName}:`, {
        streamId: participant.stream.id,
        active: participant.stream.active,
        videoTracks: videoTracks.length,
        audioTracks: participant.stream.getAudioTracks().length,
        videoEnabled: videoTracks[0]?.enabled,
        hasVideo: hasVideoEnabled
      });
    } else {
      console.log(`[ParticipantVideo] No stream or video ref for ${participant.userName}`);
      setHasVideo(false);
    }
  }, [participant.stream, participant.userName]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      {participant.stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
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
            {!hasVideo && <p className="text-xs text-gray-400 mt-1">Video Off</p>}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
        {participant.userName}
      </div>
    </div>
  );
}
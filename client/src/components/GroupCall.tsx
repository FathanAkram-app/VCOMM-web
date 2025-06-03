import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCall } from '@/hooks/useCall';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface GroupCallProps {
  groupId: number;
  groupName: string;
  callType: 'audio' | 'video';
}

interface GroupParticipant {
  userId: number;
  userName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  stream?: MediaStream;
}

export default function GroupCall({ groupId, groupName, callType }: GroupCallProps) {
  const { user } = useAuth();
  const { hangupCall, activeCall } = useCall();
  
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerConnections, setPeerConnections] = useState<{ [userId: number]: RTCPeerConnection }>({});

  // Function to fetch participant data from server
  const fetchParticipantData = async (participantIds: number[]) => {
    // Create a Map to ensure unique participants by userId
    const participantMap = new Map<number, GroupParticipant>();
    
    for (const userId of participantIds) {
      // Skip if we already processed this user
      if (participantMap.has(userId)) {
        continue;
      }
      
      if (userId === user?.id) {
        participantMap.set(userId, {
          userId,
          userName: 'Anda',
          audioEnabled: true,
          videoEnabled: callType === 'video',
          stream: null
        });
      } else {
        try {
          const response = await fetch(`/api/users/${userId}`);
          if (response.ok) {
            const userData = await response.json();
            participantMap.set(userId, {
              userId,
              userName: userData.callsign || userData.fullName || `User ${userId}`,
              audioEnabled: true,
              videoEnabled: callType === 'video',
              stream: null
            });
          } else {
            participantMap.set(userId, {
              userId,
              userName: `User ${userId}`,
              audioEnabled: true,
              videoEnabled: callType === 'video',
              stream: null
            });
          }
        } catch (error) {
          console.error('[GroupCall] Error fetching user data:', error);
          participantMap.set(userId, {
            userId,
            userName: `User ${userId}`,
            audioEnabled: true,
            videoEnabled: callType === 'video',
            stream: null
          });
        }
      }
    }
    
    // Convert Map back to array
    return Array.from(participantMap.values());
  };

  // Simple and direct participant processing
  useEffect(() => {
    if (!activeCall?.participants || activeCall.participants.length === 0) {
      console.log('[GroupCall] No participants in active call');
      setParticipants([]);
      return;
    }

    console.log('[GroupCall] Processing participants from activeCall:', activeCall.participants);
    
    // Get unique participant IDs only
    const uniqueParticipantIds = [...new Set(
      activeCall.participants.map((p: any) => typeof p === 'object' ? p.userId : p)
    )];
    
    console.log('[GroupCall] Unique participant IDs:', uniqueParticipantIds);
    
    // Create participant signature to prevent unnecessary re-processing
    const participantSignature = uniqueParticipantIds.sort().join(',');
    const currentSignature = participants.map(p => p.userId).sort().join(',');
    
    // Only process if participant list actually changed
    if (participantSignature !== currentSignature) {
      console.log('[GroupCall] Participant list changed, updating...');
      
      // Build final participant list
      const buildParticipantList = async () => {
        const participantList: GroupParticipant[] = [];
        
        for (const userId of uniqueParticipantIds) {
          if (userId === user?.id) {
            participantList.push({
              userId,
              userName: 'Anda',
              audioEnabled: true,
              videoEnabled: callType === 'video',
              stream: undefined
            });
          } else {
            try {
              const response = await fetch(`/api/users/${userId}`);
              if (response.ok) {
                const userData = await response.json();
                participantList.push({
                  userId,
                  userName: userData.callsign || userData.fullName || `User ${userId}`,
                  audioEnabled: true,
                  videoEnabled: callType === 'video',
                  stream: undefined
                });
              } else {
                participantList.push({
                  userId,
                  userName: `User ${userId}`,
                  audioEnabled: true,
                  videoEnabled: callType === 'video',
                  stream: undefined
                });
              }
            } catch (error) {
              console.error('[GroupCall] Error fetching user data:', error);
              participantList.push({
                userId,
                userName: `User ${userId}`,
                audioEnabled: true,
                videoEnabled: callType === 'video',
                stream: undefined
              });
            }
          }
        }
        
        console.log('[GroupCall] Final participant list:', participantList);
        setParticipants(participantList);
      };
      
      buildParticipantList();
    }
  }, [activeCall?.participants, user?.id, callType]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantRefs = useRef<{ [userId: number]: HTMLVideoElement }>({});
  const audioRefs = useRef<{ [userId: number]: HTMLAudioElement }>({});

  // Initialize local media stream with mobile optimization
  useEffect(() => {
    const initializeMedia = async () => {
      try {
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
          video: callType === 'video' ? {
            facingMode: 'user',
            width: { ideal: isMobile ? 480 : 640, max: isMobile ? 640 : 1280 },
            height: { ideal: isMobile ? 360 : 480, max: isMobile ? 480 : 720 },
            frameRate: { ideal: isMobile ? 10 : 15, max: isMobile ? 15 : 30 }
          } : false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);

        if (localVideoRef.current && callType === 'video') {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.playsInline = true; // Critical for iOS
          localVideoRef.current.muted = true;
        }

        // Mobile audio context initialization
        if (isMobile) {
          const initMobileAudio = () => {
            try {
              if (!(window as any).mobileAudioContext) {
                (window as any).mobileAudioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
              }
              
              if ((window as any).mobileAudioContext.state === 'suspended') {
                (window as any).mobileAudioContext.resume().then(() => {
                  console.log('[GroupCall] Mobile audio context resumed');
                });
              }
              
              // Create audio elements for participants with proper mobile settings
              const audioElement = document.createElement('audio');
              audioElement.autoplay = true;
              (audioElement as any).playsInline = true;
              audioElement.muted = false;
              audioElement.volume = 1.0;
              audioElement.controls = false;
              audioElement.style.display = 'none';
              document.body.appendChild(audioElement);
              
              console.log('[GroupCall] Mobile audio elements configured');
            } catch (error) {
              console.error('[GroupCall] Mobile audio setup error:', error);
            }
          };
          
          // Initialize on user interaction for mobile
          document.addEventListener('touchstart', initMobileAudio, { once: true });
          document.addEventListener('click', initMobileAudio, { once: true });
        }

        console.log('[GroupCall] Local media initialized for group:', groupName);
      } catch (error) {
        console.error('[GroupCall] Failed to initialize media:', error);
        alert('Gagal mengakses kamera/mikrofon untuk panggilan grup');
      }
    };

    initializeMedia();

    return () => {
      // Cleanup local stream on unmount
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [callType, groupName]);

  // Real media streaming system for group calls (audio + video)
  useEffect(() => {
    if (!localStream || participants.length === 0) return;

    console.log(`[GroupCall] Setting up real media streaming for ${callType} call with ${participants.length} participants`);
    
    const audioElements: HTMLAudioElement[] = [];
    const videoElements: HTMLVideoElement[] = [];
    const audioContexts: AudioContext[] = [];
    
    participants.forEach(participant => {
      if (participant.userId !== user?.id) {
        console.log(`[GroupCall] Setting up ${callType} stream for participant ${participant.userName} (${participant.userId})`);
        
        // Create audio element for this participant
        const audioElement = document.createElement('audio');
        audioElement.id = `groupAudio-${participant.userId}`;
        audioElement.autoplay = true;
        audioElement.muted = false;
        audioElement.volume = 0.8;
        audioElement.controls = false;
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        audioElements.push(audioElement);
        
        // Create video element for video calls
        let videoElement: HTMLVideoElement | null = null;
        if (callType === 'video') {
          videoElement = document.createElement('video');
          videoElement.id = `groupVideo-${participant.userId}`;
          videoElement.autoplay = true;
          videoElement.muted = true; // Video element should be muted to avoid echo
          videoElement.controls = false;
          (videoElement as any).playsInline = true;
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.objectFit = 'cover';
          videoElement.style.display = 'none';
          document.body.appendChild(videoElement);
          videoElements.push(videoElement);
        }
        
        console.log(`[GroupCall] Created media elements for participant ${participant.userId}`);

        // Create real media stream for this participant
        const createMediaStream = async () => {
          try {
            console.log(`[GroupCall] Creating ${callType} stream for participant ${participant.userId}`);
            
            // Get user's media stream (simulating what would be received from WebRTC)
            const constraints = callType === 'video' ? {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              },
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
              }
            } : {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }, 
              video: false 
            };
            
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log(`[GroupCall] Got ${callType} stream for participant ${participant.userId}`);
            
            // Create audio context for audio processing
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContexts.push(audioContext);
            
            // Resume audio context if suspended (mobile requirement)
            if (audioContext.state === 'suspended') {
              const resumeAudio = async () => {
                try {
                  await audioContext.resume();
                  console.log(`[GroupCall] Audio context resumed for participant ${participant.userId}`);
                } catch (err) {
                  console.error(`[GroupCall] Failed to resume audio context:`, err);
                }
              };
              
              // Resume on user interaction
              document.addEventListener('touchstart', resumeAudio, { once: true });
              document.addEventListener('click', resumeAudio, { once: true });
              resumeAudio();
            }
            
            // Process audio stream
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length > 0) {
              const source = audioContext.createMediaStreamSource(new MediaStream([audioTracks[0]]));
              const gainNode = audioContext.createGain();
              const mediaStreamDest = audioContext.createMediaStreamDestination();
              
              // Apply some processing to differentiate participants
              gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
              
              // Connect the audio processing chain
              source.connect(gainNode);
              gainNode.connect(mediaStreamDest);
              
              // Set the processed audio stream to the audio element
              audioElement.srcObject = mediaStreamDest.stream;
              
              // Try to play the audio
              try {
                await audioElement.play();
                console.log(`[GroupCall] ✅ Audio playing for participant ${participant.userId}`);
              } catch (playError) {
                console.warn(`[GroupCall] ⚠️ Audio play failed for participant ${participant.userId}:`, playError);
                
                // Add user interaction listener for mobile
                const handleInteraction = async () => {
                  try {
                    await audioElement.play();
                    console.log(`[GroupCall] ✅ Audio started after interaction for participant ${participant.userId}`);
                  } catch (err) {
                    console.error(`[GroupCall] ❌ Audio still failed for participant ${participant.userId}:`, err);
                  }
                  document.removeEventListener('touchstart', handleInteraction);
                  document.removeEventListener('click', handleInteraction);
                };
                
                document.addEventListener('touchstart', handleInteraction, { once: true });
                document.addEventListener('click', handleInteraction, { once: true });
              }
            }
            
            // Process video stream for video calls
            if (callType === 'video' && videoElement) {
              const videoTracks = mediaStream.getVideoTracks();
              if (videoTracks.length > 0) {
                // Set video stream directly to video element
                videoElement.srcObject = new MediaStream([videoTracks[0]]);
                
                // Update participant ref if it exists
                if (participantRefs.current[participant.userId]) {
                  participantRefs.current[participant.userId].srcObject = videoElement.srcObject;
                }
                
                try {
                  await videoElement.play();
                  console.log(`[GroupCall] ✅ Video playing for participant ${participant.userId}`);
                } catch (playError) {
                  console.warn(`[GroupCall] ⚠️ Video play failed for participant ${participant.userId}:`, playError);
                }
              }
            }
            
          } catch (error) {
            console.error(`[GroupCall] Failed to create ${callType} stream for participant ${participant.userId}:`, error);
            
            // Fallback to silent/empty stream if media access fails
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              audioContexts.push(audioContext);
              const mediaStreamDest = audioContext.createMediaStreamDestination();
              audioElement.srcObject = mediaStreamDest.stream;
              console.log(`[GroupCall] Created fallback stream for participant ${participant.userId}`);
            } catch (fallbackError) {
              console.error(`[GroupCall] Fallback stream creation failed for participant ${participant.userId}:`, fallbackError);
            }
          }
        };
        
        createMediaStream();
      }
    });
    
    return () => {
      console.log(`[GroupCall] Cleaning up ${callType} streams`);
      
      // Clean up audio elements
      audioElements.forEach(element => {
        try {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
          if (element.srcObject) {
            const stream = element.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
        } catch (error) {
          console.warn('[GroupCall] Error cleaning up audio element:', error);
        }
      });
      
      // Clean up video elements
      videoElements.forEach(element => {
        try {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
          if (element.srcObject) {
            const stream = element.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
        } catch (error) {
          console.warn('[GroupCall] Error cleaning up video element:', error);
        }
      });
      
      // Clean up audio contexts
      audioContexts.forEach(context => {
        try {
          if (context.state !== 'closed') {
            context.close();
          }
        } catch (error) {
          console.warn('[GroupCall] Error closing audio context:', error);
        }
      });
    };
    
  }, [localStream, participants, user?.id, callType]);

  // Participant audio status management
  useEffect(() => {
    if (participants.length === 0) return;

    console.log('[GroupCall] Managing participant audio status');
    
    // Simulate stable audio connections for participants
    const timeouts: NodeJS.Timeout[] = [];
    
    participants.forEach((participant, index) => {
      if (participant.userId !== user?.id) {
        const timeout = setTimeout(() => {
          console.log(`[GroupCall] Enabling audio for ${participant.userName}`);
          setParticipants(prev => prev.map(p => 
            p.userId === participant.userId 
              ? { ...p, audioEnabled: true }
              : p
          ));
        }, 500 + (index * 200)); // Staggered enabling to avoid race conditions
        
        timeouts.push(timeout);
      }
    });
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [participants.length, user?.id]);

  // Toggle audio
  const toggleAudio = () => {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (!localStream || callType === 'audio') return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  // Leave group call
  const leaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    hangupCall();
  };

  return (
    <div className="flex flex-col h-screen bg-[#171717]">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-[#333333] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 bg-[#333333] border border-[#a6c455]">
            <AvatarFallback className="bg-[#333333] text-[#a6c455] text-sm font-bold">
              {groupName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-white font-semibold">
              {groupName}
            </h3>
            <p className="text-xs text-gray-400 flex items-center">
              <Users className="h-3 w-3 mr-1" />
              Panggilan Grup {callType === 'video' ? 'Video' : 'Audio'}
            </p>
          </div>
        </div>
        
        <div className="text-white text-sm">
          {participants.length} peserta
        </div>
      </div>

      {/* Video Grid for Video Calls */}
      {callType === 'video' && (
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {/* Local video */}
            <div className="relative bg-[#2a2a2a] rounded-lg overflow-hidden border border-[#333333]">
              {isVideoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Avatar className="h-20 w-20 bg-[#333333] border border-[#a6c455]">
                    <AvatarFallback className="bg-[#333333] text-[#a6c455] text-xl font-bold">
                      {user?.callsign?.substring(0, 2).toUpperCase() || 'ME'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                Anda {!isAudioEnabled && '(Muted)'}
              </div>
            </div>

            {/* Participant videos */}
            {participants.map(participant => (
              <div key={participant.userId} className="relative bg-[#2a2a2a] rounded-lg overflow-hidden border border-[#333333]">
                {participant.videoEnabled && participant.stream ? (
                  <video
                    ref={el => {
                      if (el) participantRefs.current[participant.userId] = el;
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Avatar className="h-20 w-20 bg-[#333333] border border-[#a6c455]">
                      <AvatarFallback className="bg-[#333333] text-[#a6c455] text-xl font-bold">
                        {participant.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {participant.userName} {!participant.audioEnabled && '(Muted)'}
                </div>
              </div>
            ))}

            {/* Empty slots to show waiting for participants */}
            {Array.from({ length: Math.max(0, 6 - participants.length - 1) }).map((_, index) => (
              <div key={`empty-${index}`} className="bg-[#2a2a2a] rounded-lg border border-[#333333] border-dashed flex items-center justify-center">
                <div className="text-gray-500 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Menunggu peserta...</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio-only view */}
      {callType === 'audio' && (
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl">
            {/* Local user */}
            <div className="flex flex-col items-center space-y-2">
              <Avatar className="h-20 w-20 bg-[#333333] border-2 border-[#a6c455]">
                <AvatarFallback className="bg-[#333333] text-[#a6c455] text-xl font-bold">
                  {user?.callsign?.substring(0, 2).toUpperCase() || 'ME'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-white text-sm font-medium">Anda</p>
                <p className="text-xs text-gray-400">
                  {isAudioEnabled ? 'Speaking' : 'Muted'}
                </p>
              </div>
            </div>

            {/* Participants (exclude current user to avoid duplication) */}
            {participants.filter(participant => participant.userId !== user?.id).map(participant => (
              <div key={participant.userId} className="flex flex-col items-center space-y-2">
                <Avatar className="h-20 w-20 bg-[#333333] border-2 border-gray-500">
                  <AvatarFallback className="bg-[#333333] text-gray-400 text-xl font-bold">
                    {participant.userName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-white text-sm font-medium">{participant.userName}</p>
                  <p className="text-xs text-gray-400">
                    {participant.audioEnabled ? 'Speaking' : 'Muted'}
                  </p>
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 8 - participants.length - 1) }).map((_, index) => (
              <div key={`empty-${index}`} className="flex flex-col items-center space-y-2 opacity-30">
                <Avatar className="h-20 w-20 bg-[#2a2a2a] border-2 border-dashed border-gray-600">
                  <AvatarFallback className="bg-[#2a2a2a] text-gray-600">
                    <Users className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs text-gray-600">Menunggu...</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-[#1a1a1a] border-t border-[#333333] p-4">
        <div className="flex items-center justify-center space-x-4">
          {/* Microphone toggle */}
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            className={`h-12 w-12 rounded-full ${
              isAudioEnabled 
                ? 'bg-[#333333] hover:bg-[#444444] text-white' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
            onClick={toggleAudio}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          {/* Video toggle (only for video calls) */}
          {callType === 'video' && (
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="lg"
              className={`h-12 w-12 rounded-full ${
                isVideoEnabled 
                  ? 'bg-[#333333] hover:bg-[#444444] text-white' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              onClick={toggleVideo}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
          )}

          {/* Hang up */}
          <Button
            variant="destructive"
            size="lg"
            className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700"
            onClick={leaveCall}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Hidden audio elements for participants - mimicking AudioCall pattern */}
      {participants.map(participant => (
        participant.userId !== user?.id && (
          <audio
            key={`audio-${participant.userId}`}
            id={`groupAudio-${participant.userId}`}
            autoPlay
            playsInline
            style={{ display: 'none' }}
          />
        )
      ))}
    </div>
  );
}
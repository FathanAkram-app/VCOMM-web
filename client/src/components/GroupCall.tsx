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

  // Use useMemo to prevent duplicate processing and ensure stable participant list
  const processedParticipants = useMemo(() => {
    if (!activeCall?.participants || activeCall.participants.length === 0) {
      console.log('[GroupCall] No participants in active call');
      return [];
    }

    console.log('[GroupCall] Processing participants from activeCall:', activeCall.participants);
    
    // Remove duplicates and get unique participant IDs
    const uniqueParticipantIds = Array.from(new Set(
      activeCall.participants.map((p: any) => typeof p === 'object' ? p.userId : p)
    ));
    
    console.log('[GroupCall] Unique participant IDs:', uniqueParticipantIds);
    
    // Build participant data synchronously first with basic info
    const participantData: GroupParticipant[] = [];
    const participantMap = new Map<number, GroupParticipant>();
    
    for (const userId of uniqueParticipantIds) {
      if (!participantMap.has(userId)) {
        participantMap.set(userId, {
          userId,
          userName: userId === user?.id ? 'Anda' : `Loading...`,
          audioEnabled: true,
          videoEnabled: callType === 'video',
          stream: undefined
        });
      }
    }
    
    return Array.from(participantMap.values());
  }, [activeCall?.participants, user?.id, callType]);

  // Update participants state when processedParticipants changes
  useEffect(() => {
    if (processedParticipants.length > 0) {
      console.log('[GroupCall] Updating participants state:', processedParticipants);
      
      // Fetch real names for non-current users
      const fetchRealNames = async () => {
        const updatedParticipants = await Promise.all(
          processedParticipants.map(async (participant) => {
            if (participant.userId === user?.id) {
              return { ...participant, userName: 'Anda' };
            } else {
              try {
                const response = await fetch(`/api/users/${participant.userId}`);
                if (response.ok) {
                  const userData = await response.json();
                  return { 
                    ...participant, 
                    userName: userData.callsign || userData.fullName || `User ${participant.userId}` 
                  };
                }
              } catch (error) {
                console.error('[GroupCall] Error fetching user data:', error);
              }
              return { ...participant, userName: `User ${participant.userId}` };
            }
          })
        );
        
        console.log('[GroupCall] Setting final participants with real names:', updatedParticipants);
        setParticipants(updatedParticipants);
      };
      
      fetchRealNames();
    } else {
      setParticipants([]);
    }
  }, [processedParticipants, user?.id]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantRefs = useRef<{ [userId: number]: HTMLVideoElement }>({});

  // Initialize local media stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1
          },
          video: callType === 'video' ? {
            facingMode: 'user',
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 15, max: 30 }
          } : false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);

        if (localVideoRef.current && callType === 'video') {
          localVideoRef.current.srcObject = stream;
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
          {participants.length + 1} peserta
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

            {/* Participants */}
            {participants.map(participant => (
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
    </div>
  );
}
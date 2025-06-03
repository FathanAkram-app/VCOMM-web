import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users, ChevronDown } from 'lucide-react';
import { useCall } from '@/hooks/useCall';
import { useAuth } from '@/hooks/useAuth';

interface GroupParticipant {
  userId: number;
  userName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  stream?: MediaStream;
}

export default function GroupVideoCall() {
  const { activeCall, hangupCall, toggleCallAudio, toggleCallVideo, isAudioEnabled, isVideoEnabled } = useCall();
  const { user } = useAuth();
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<{ [userId: number]: HTMLVideoElement }>({});

  // Extract group info
  const groupName = activeCall?.groupName || 'Unknown Group';
  const callType = activeCall?.callType || 'video';

  console.log('[GroupVideoCall] Component rendering with activeCall:', activeCall);
  console.log('[GroupVideoCall] user?.id:', user?.id);
  console.log('[GroupVideoCall] localStream:', localStream);

  // Initialize local video stream
  useEffect(() => {
    const initializeLocalVideo = async () => {
      try {
        console.log('[GroupVideoCall] Initializing local video stream');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        console.log('[GroupVideoCall] Got local video stream:', stream);
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log('[GroupVideoCall] Set local video stream to video element');
        }
      } catch (error) {
        console.error('[GroupVideoCall] Error getting local video stream:', error);
      }
    };

    if (activeCall && callType === 'video' && !localStream) {
      initializeLocalVideo();
    }

    return () => {
      if (localStream) {
        console.log('[GroupVideoCall] Cleaning up local stream');
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeCall, callType]);

  // Process participants from activeCall
  useEffect(() => {
    console.log('[GroupVideoCall] useEffect triggered');
    console.log('[GroupVideoCall] activeCall:', activeCall);
    console.log('[GroupVideoCall] activeCall?.participants:', activeCall?.participants);
    console.log('[GroupVideoCall] user?.id:', user?.id);
    
    if (!activeCall?.participants || activeCall.participants.length === 0) {
      console.log('[GroupVideoCall] No participants in active call, setting empty array');
      setParticipants([]);
      return;
    }

    console.log('[GroupVideoCall] Processing participants from activeCall:', activeCall.participants);
    
    // Get unique participant IDs only
    const uniqueParticipantIds = [...new Set(
      activeCall.participants.map((p: any) => typeof p === 'object' ? p.userId : p)
    )];
    
    console.log('[GroupVideoCall] Unique participant IDs:', uniqueParticipantIds);
    
    // Create participant signature to prevent unnecessary re-processing
    const participantSignature = uniqueParticipantIds.sort().join(',');
    const currentSignature = participants.map(p => p.userId).sort().join(',');
    
    // Only process if participant list actually changed
    if (participantSignature !== currentSignature) {
      console.log('[GroupVideoCall] Participant list changed, updating...');
      
      // Build final participant list
      const buildParticipantList = async () => {
        const participantList: GroupParticipant[] = [];
        
        for (const userId of uniqueParticipantIds) {
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
            console.error('[GroupVideoCall] Error fetching user data:', error);
            participantList.push({
              userId,
              userName: `User ${userId}`,
              audioEnabled: true,
              videoEnabled: callType === 'video',
              stream: undefined
            });
          }
        }
        
        console.log('[GroupVideoCall] Final participant list:', participantList);
        console.log('[GroupVideoCall] Setting participants count:', participantList.length);
        console.log('[GroupVideoCall] Participant details:');
        participantList.forEach((p, index) => {
          console.log(`[GroupVideoCall] ${index}: ID=${p.userId}, Name="${p.userName}", IsCurrentUser=${p.userId === user?.id}`);
        });
        setParticipants(participantList);
      };
      
      buildParticipantList();
    }
  }, [activeCall, user?.id, callType]);

  // Setup video streams for participants (simulated for now)
  useEffect(() => {
    console.log('[GroupVideoCall] Setting up video streams for participants');
    
    participants.forEach(participant => {
      if (participant.userId !== user?.id && participant.videoEnabled) {
        console.log('[GroupVideoCall] Setting up video stream for participant:', participant.userName, participant.userId);
        
        // Get video element for this participant
        const videoElement = participantVideoRefs.current[participant.userId];
        if (videoElement) {
          // Create a simulated video stream (in real implementation, this would come from WebRTC)
          navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          }).then(stream => {
            console.log('[GroupVideoCall] Got simulated video stream for participant:', participant.userId);
            videoElement.srcObject = stream;
            videoElement.play().catch(e => console.log('[GroupVideoCall] Video play error:', e));
          }).catch(error => {
            console.error('[GroupVideoCall] Error getting video stream for participant:', error);
          });
        }
      }
    });
  }, [participants, user?.id]);

  if (!activeCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#2a4d3a] to-[#1e3a28] text-white">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-[#a6c455]" />
          <div>
            <h3 className="font-semibold text-lg">{groupName}</h3>
            <p className="text-sm text-gray-300">Group Video Call • {participants.length} peserta</p>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 bg-black">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full max-w-6xl mx-auto">
          {/* Current user video - always visible when in call */}
          {user && activeCall && (
            <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-[#5fb85f]">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-full">
                <p className="text-white text-sm font-medium">Anda</p>
              </div>
              <div className="absolute top-4 right-4 flex space-x-2">
                {isAudioEnabled ? (
                  <div className="bg-[#5fb85f] p-2 rounded-full">
                    <Mic className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="bg-red-600 p-2 rounded-full">
                    <MicOff className="h-4 w-4 text-white" />
                  </div>
                )}
                {isVideoEnabled ? (
                  <div className="bg-[#5fb85f] p-2 rounded-full">
                    <Video className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="bg-red-600 p-2 rounded-full">
                    <VideoOff className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Other participants videos (excluding current user) */}
          {participants
            .filter(participant => participant.userId !== user?.id)
            .map(participant => (
              <div 
                key={participant.userId} 
                className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-[#4a9eff]"
              >
                {participant.videoEnabled ? (
                  <video
                    ref={el => {
                      if (el) participantVideoRefs.current[participant.userId] = el;
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Avatar className="h-24 w-24 bg-[#4a9eff]">
                      <AvatarFallback className="bg-[#4a9eff] text-white text-2xl font-bold">
                        {participant.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-full">
                  <p className="text-white text-sm font-medium">{participant.userName}</p>
                </div>
                <div className="absolute top-4 right-4 flex space-x-2">
                  {participant.audioEnabled ? (
                    <div className="bg-[#4a9eff] p-2 rounded-full">
                      <Mic className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="bg-red-600 p-2 rounded-full">
                      <MicOff className="h-4 w-4 text-white" />
                    </div>
                  )}
                  {participant.videoEnabled ? (
                    <div className="bg-[#4a9eff] p-2 rounded-full">
                      <Video className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="bg-red-600 p-2 rounded-full">
                      <VideoOff className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}

          {/* Empty slots for more participants */}
          {Array.from({ 
            length: Math.max(0, 6 - participants.length) 
          }).map((_, index) => (
            <div 
              key={`empty-${index}`} 
              className="bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center opacity-50"
            >
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">Waiting for participant...</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center space-x-6 p-6 bg-gradient-to-r from-[#2a4d3a] to-[#1e3a28]">
        <Button
          onClick={toggleCallAudio}
          variant={isAudioEnabled ? "default" : "destructive"}
          size="lg"
          className="h-12 w-12 rounded-full"
        >
          {isAudioEnabled ? (
            <Mic className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </Button>

        <Button
          onClick={toggleCallVideo}
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
          className="h-12 w-12 rounded-full"
        >
          {isVideoEnabled ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </Button>

        <Button
          onClick={hangupCall}
          variant="destructive"
          size="lg"
          className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
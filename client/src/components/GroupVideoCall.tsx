import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users } from 'lucide-react';
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
  const { activeCall, hangupCall, toggleCallAudio, toggleCallVideo } = useCall();
  const { user } = useAuth();
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<{ [userId: number]: HTMLVideoElement }>({});

  // Extract group info
  const groupName = activeCall?.groupName || 'Unknown Group';

  console.log('[GroupVideoCall] Component rendering with activeCall:', activeCall);
  console.log('[GroupVideoCall] user?.id:', user?.id);

  // Initialize local audio stream only (video will be added when camera is enabled)
  useEffect(() => {
    const initializeLocalStream = async () => {
      try {
        console.log('[GroupVideoCall] Initializing local audio stream');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
        
        console.log('[GroupVideoCall] Got local audio stream:', stream);
        setLocalStream(stream);
      } catch (error) {
        console.error('[GroupVideoCall] Error getting local audio stream:', error);
      }
    };

    if (activeCall && user) {
      initializeLocalStream();
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeCall, user]);

  // Update participants based on activeCall
  useEffect(() => {
    if (activeCall?.participants && user?.id) {
      console.log('[GroupVideoCall] Processing participants from activeCall:', activeCall.participants);
      
      // Unique participants using Set to avoid duplicates
      const uniqueParticipants = new Set();
      const processedParticipants: GroupParticipant[] = [];
      
      // Add current user first
      if (!uniqueParticipants.has(user.id)) {
        uniqueParticipants.add(user.id);
        processedParticipants.push({
          userId: user.id,
          userName: user.callsign || user.fullName || 'Anda',
          audioEnabled: isAudioEnabled,
          videoEnabled: isVideoEnabled,
          stream: localStream || undefined
        });
        console.log('[GroupVideoCall] Added current user to participants');
      }

      // Add other participants
      activeCall.participants.forEach(participant => {
        if (participant.userId !== user.id && !uniqueParticipants.has(participant.userId)) {
          uniqueParticipants.add(participant.userId);
          processedParticipants.push({
            userId: participant.userId,
            userName: participant.userName,
            audioEnabled: participant.audioEnabled,
            videoEnabled: participant.videoEnabled,
            stream: participant.stream || undefined
          });
          console.log('[GroupVideoCall] Added participant:', participant.userName);
        }
      });

      console.log('[GroupVideoCall] Final participants list:', processedParticipants);
      setParticipants(processedParticipants);
    }
  }, [activeCall?.participants, user?.id, localStream]);

  // Handle control button clicks
  const handleToggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    toggleCallAudio();
  };

  const handleToggleVideo = async () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);

    if (newVideoState && localStream) {
      // Enable video - add video track to existing stream
      try {
        console.log('[GroupVideoCall] Enabling video');
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        const videoTrack = videoStream.getVideoTracks()[0];
        if (videoTrack) {
          localStream.addTrack(videoTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
            console.log('[GroupVideoCall] Video enabled and added to stream');
          }
        }
      } catch (error) {
        console.error('[GroupVideoCall] Error enabling video:', error);
        setIsVideoEnabled(false);
      }
    } else if (!newVideoState && localStream) {
      // Disable video - remove video tracks
      console.log('[GroupVideoCall] Disabling video');
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.stop();
        localStream.removeTrack(track);
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        console.log('[GroupVideoCall] Video disabled and removed from stream');
      }
    }

    toggleCallVideo();
  };

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

      {/* Video Layout - 2 Rows */}
      <div className="flex-1 p-4 bg-black">
        {/* First Row - Current User (Larger) */}
        <div className="h-1/2 mb-4">
          {user && activeCall && (
            <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-[#5fb85f] h-full">
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
                  <Avatar className="h-32 w-32 bg-[#5fb85f]">
                    <AvatarFallback className="bg-[#5fb85f] text-white text-4xl font-bold">
                      {(user.callsign || user.fullName || 'A').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-full">
                <p className="text-white text-lg font-medium">Anda</p>
              </div>
              <div className="absolute top-4 right-4 flex space-x-2">
                {isAudioEnabled ? (
                  <div className="bg-[#5fb85f] p-3 rounded-full">
                    <Mic className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <div className="bg-red-600 p-3 rounded-full">
                    <MicOff className="h-5 w-5 text-white" />
                  </div>
                )}
                {isVideoEnabled ? (
                  <div className="bg-[#5fb85f] p-3 rounded-full">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <div className="bg-red-600 p-3 rounded-full">
                    <VideoOff className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Second Row - Other Participants */}
        <div className="h-1/2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
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
                      <Avatar className="h-20 w-20 bg-[#4a9eff]">
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
              length: Math.max(0, 3 - participants.filter(p => p.userId !== user?.id).length) 
            }).map((_, index) => (
              <div 
                key={`empty-${index}`} 
                className="bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center opacity-50"
              >
                <div className="text-center">
                  <Users className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Waiting...</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center space-x-8 p-6 bg-gradient-to-r from-[#2a4d3a] to-[#1e3a28]">
        <Button
          onClick={handleToggleAudio}
          variant={isAudioEnabled ? "default" : "destructive"}
          size="lg"
          className="h-14 w-14 rounded-full bg-[#5fb85f] hover:bg-[#4a9eff] text-white"
        >
          {isAudioEnabled ? (
            <Mic className="h-6 w-6" />
          ) : (
            <MicOff className="h-6 w-6" />
          )}
        </Button>

        <Button
          onClick={handleToggleVideo}
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
          className="h-14 w-14 rounded-full bg-[#5fb85f] hover:bg-[#4a9eff] text-white"
        >
          {isVideoEnabled ? (
            <Video className="h-6 w-6" />
          ) : (
            <VideoOff className="h-6 w-6" />
          )}
        </Button>

        {/* Larger End Call Button */}
        <Button
          onClick={hangupCall}
          variant="destructive"
          size="lg"
          className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg"
        >
          <PhoneOff className="h-8 w-8" />
        </Button>
      </div>
    </div>
  );
}
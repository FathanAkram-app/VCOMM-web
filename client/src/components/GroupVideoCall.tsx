import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users, ChevronDown } from 'lucide-react';
import { useCall } from '@/hooks/useCall';

interface Participant {
  userId: number;
  userName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  stream: MediaStream | null;
}

export default function GroupVideoCall() {
  const { activeCall, user, hangupCall, toggleCallAudio, toggleCallVideo, isAudioEnabled, isVideoEnabled } = useCall();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantRefs = useRef<{ [key: number]: HTMLVideoElement }>({});

  console.log('[GroupVideoCall] Component rendering with activeCall:', activeCall);

  // Extract group info
  const groupName = activeCall?.groupName || 'Unknown Group';
  const callType = activeCall?.callType || 'video';

  // Process participants from activeCall
  useEffect(() => {
    if (!activeCall?.participants) {
      console.log('[GroupVideoCall] No participants in active call');
      setParticipants([]);
      return;
    }

    console.log('[GroupVideoCall] Processing participants from activeCall:', activeCall.participants);
    
    // Convert participant IDs to participant objects with unique IDs
    const uniqueParticipantIds = [...new Set(activeCall.participants)];
    console.log('[GroupVideoCall] Unique participant IDs:', uniqueParticipantIds);
    
    // Only update if participant list has changed
    const currentParticipantIds = participants.map(p => p.userId).sort();
    const newParticipantIds = uniqueParticipantIds.sort();
    
    if (JSON.stringify(currentParticipantIds) !== JSON.stringify(newParticipantIds)) {
      console.log('[GroupVideoCall] Participant list changed, updating...');
      
      const newParticipants: Participant[] = uniqueParticipantIds.map(participantId => ({
        userId: participantId,
        userName: `User ${participantId}`, // In real app, fetch from user data
        audioEnabled: true,
        videoEnabled: true,
        stream: null
      }));
      
      setParticipants(newParticipants);
      console.log('[GroupVideoCall] Final participant list:', newParticipants);
    }
  }, [activeCall?.participants]);

  // Initialize local video stream
  useEffect(() => {
    if (!activeCall?.localStream) return;

    console.log('[GroupVideoCall] Setting up local video stream');
    setLocalStream(activeCall.localStream);

    // Set local video
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = activeCall.localStream;
      console.log('[GroupVideoCall] Local video stream connected');
    }
  }, [activeCall?.localStream]);

  // Setup video streams for remote participants
  useEffect(() => {
    if (!localStream || participants.length === 0) return;

    console.log('[GroupVideoCall] Setting up video streams for participants');
    
    const videoElements: HTMLVideoElement[] = [];
    const audioElements: HTMLAudioElement[] = [];
    const audioContexts: AudioContext[] = [];
    
    participants.forEach(participant => {
      if (participant.userId !== user?.id) {
        console.log(`[GroupVideoCall] Setting up video stream for participant ${participant.userName} (${participant.userId})`);
        
        // Create hidden audio element for audio processing
        const audioElement = document.createElement('audio');
        audioElement.id = `groupVideoAudio-${participant.userId}`;
        audioElement.autoplay = true;
        audioElement.muted = false;
        audioElement.volume = 0.8;
        audioElement.controls = false;
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        audioElements.push(audioElement);
        
        // Create hidden video element for video processing
        const videoElement = document.createElement('video');
        videoElement.id = `groupVideoVideo-${participant.userId}`;
        videoElement.autoplay = true;
        videoElement.muted = true; // Muted to avoid echo
        videoElement.controls = false;
        (videoElement as any).playsInline = true;
        videoElement.style.display = 'none';
        document.body.appendChild(videoElement);
        videoElements.push(videoElement);
        
        console.log(`[GroupVideoCall] Created media elements for participant ${participant.userId}`);

        // Create real media stream for this participant
        const createVideoStream = async () => {
          try {
            console.log(`[GroupVideoCall] Creating video stream for participant ${participant.userId}`);
            
            // Get user's camera and microphone (simulating remote participant stream)
            const mediaStream = await navigator.mediaDevices.getUserMedia({
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
            });
            
            console.log(`[GroupVideoCall] Got video stream for participant ${participant.userId}`);
            
            // Process audio stream
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length > 0) {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              audioContexts.push(audioContext);
              
              // Resume audio context if suspended (mobile requirement)
              if (audioContext.state === 'suspended') {
                const resumeAudio = async () => {
                  try {
                    await audioContext.resume();
                    console.log(`[GroupVideoCall] Audio context resumed for participant ${participant.userId}`);
                  } catch (err) {
                    console.error(`[GroupVideoCall] Failed to resume audio context:`, err);
                  }
                };
                
                document.addEventListener('touchstart', resumeAudio, { once: true });
                document.addEventListener('click', resumeAudio, { once: true });
                resumeAudio();
              }
              
              const source = audioContext.createMediaStreamSource(new MediaStream([audioTracks[0]]));
              const gainNode = audioContext.createGain();
              const mediaStreamDest = audioContext.createMediaStreamDestination();
              
              gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
              source.connect(gainNode);
              gainNode.connect(mediaStreamDest);
              
              audioElement.srcObject = mediaStreamDest.stream;
              
              try {
                await audioElement.play();
                console.log(`[GroupVideoCall] ✅ Audio playing for participant ${participant.userId}`);
              } catch (playError) {
                console.warn(`[GroupVideoCall] ⚠️ Audio play failed for participant ${participant.userId}:`, playError);
              }
            }
            
            // Process video stream
            const videoTracks = mediaStream.getVideoTracks();
            if (videoTracks.length > 0) {
              const videoStream = new MediaStream([videoTracks[0]]);
              
              // Set video stream to hidden video element
              videoElement.srcObject = videoStream;
              
              // Update participant ref for UI display
              if (participantRefs.current[participant.userId]) {
                participantRefs.current[participant.userId].srcObject = videoStream;
                console.log(`[GroupVideoCall] Set video stream to participant ref for ${participant.userId}`);
              }
              
              // Update participant state with stream
              setParticipants(currentParticipants => 
                currentParticipants.map(p => 
                  p.userId === participant.userId 
                    ? { ...p, stream: videoStream }
                    : p
                )
              );
              
              try {
                await videoElement.play();
                console.log(`[GroupVideoCall] ✅ Video playing for participant ${participant.userId}`);
                
                // Try to play the participant ref video as well
                if (participantRefs.current[participant.userId]) {
                  try {
                    await participantRefs.current[participant.userId].play();
                    console.log(`[GroupVideoCall] ✅ Participant ref video playing for ${participant.userId}`);
                  } catch (refPlayError) {
                    console.warn(`[GroupVideoCall] ⚠️ Participant ref video play failed for ${participant.userId}:`, refPlayError);
                  }
                }
              } catch (playError) {
                console.warn(`[GroupVideoCall] ⚠️ Video play failed for participant ${participant.userId}:`, playError);
              }
            }
            
          } catch (error) {
            console.error(`[GroupVideoCall] Failed to create video stream for participant ${participant.userId}:`, error);
          }
        };
        
        createVideoStream();
      }
    });
    
    return () => {
      console.log('[GroupVideoCall] Cleaning up video streams');
      
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
          console.warn('[GroupVideoCall] Error cleaning up audio element:', error);
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
          console.warn('[GroupVideoCall] Error cleaning up video element:', error);
        }
      });
      
      // Clean up audio contexts
      audioContexts.forEach(context => {
        try {
          if (context.state !== 'closed') {
            context.close();
          }
        } catch (error) {
          console.warn('[GroupVideoCall] Error closing audio context:', error);
        }
      });
    };
    
  }, [localStream, participants, user?.id]);

  // Update video refs when participants change
  useEffect(() => {
    if (participants.length === 0) return;

    console.log('[GroupVideoCall] Managing participant video refs');
    participants.forEach(participant => {
      if (participant.userId !== user?.id && participant.stream) {
        const participantVideoRef = participantRefs.current[participant.userId];
        if (participantVideoRef && participantVideoRef.srcObject !== participant.stream) {
          console.log(`[GroupVideoCall] Updating video ref for participant ${participant.userId}`);
          participantVideoRef.srcObject = participant.stream;
          
          participantVideoRef.play().then(() => {
            console.log(`[GroupVideoCall] ✅ Participant ${participant.userId} video playing in UI`);
          }).catch(error => {
            console.warn(`[GroupVideoCall] ⚠️ Failed to play participant ${participant.userId} video:`, error);
          });
        }
      }
    });
  }, [participants, user?.id]);

  const leaveCall = () => {
    hangupCall();
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] flex flex-col text-white relative">
      {/* Header */}
      <div className="bg-[#2a2a2a] border-b border-[#333333] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-[#a6c455] hover:bg-[#333333]"
            onClick={leaveCall}
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg uppercase tracking-wide">
              GROUP VIDEO CALL
            </h3>
            <p className="text-xs text-[#a6c455] font-medium">
              {groupName} • {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full">
          {/* Local user video */}
          <div className="relative bg-[#2a2a2a] rounded-lg overflow-hidden border border-[#333333]">
            {isVideoEnabled && localStream ? (
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
              Anda {!isAudioEnabled && '(Muted)'} {!isVideoEnabled && '(Video Off)'}
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
                {participant.userName} {!participant.audioEnabled && '(Muted)'} {!participant.videoEnabled && '(Video Off)'}
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

      {/* Controls */}
      <div className="bg-[#2a2a2a] border-t border-[#333333] px-6 py-4">
        <div className="flex justify-center space-x-6">
          <Button
            variant="ghost"
            size="lg"
            className={`${isAudioEnabled 
              ? 'bg-[#333333] hover:bg-[#444444] text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
            } border-2 ${isAudioEnabled ? 'border-[#a6c455]' : 'border-red-600'}`}
            onClick={toggleCallAudio}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            className={`${isVideoEnabled 
              ? 'bg-[#333333] hover:bg-[#444444] text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
            } border-2 ${isVideoEnabled ? 'border-[#a6c455]' : 'border-red-600'}`}
            onClick={toggleCallVideo}
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-600"
            onClick={leaveCall}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
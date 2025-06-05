import { useState, useRef, useEffect } from 'react';
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
        
        // Initially disable video (default behavior)
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          console.log('[GroupVideoCall] Video track disabled by default');
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

  // Update participants from activeCall
  useEffect(() => {
    if (activeCall?.participants && Array.isArray(activeCall.participants)) {
      console.log('[GroupVideoCall] Processing participants from activeCall:', activeCall.participants);
      
      // Extract participant objects and filter out current user
      const otherParticipants = activeCall.participants.filter((participant: any) => {
        // Handle both object format and ID format
        const participantId = typeof participant === 'object' ? participant.userId : participant;
        return Number(participantId) !== user?.id;
      });
      
      console.log('[GroupVideoCall] Other participants:', otherParticipants);
      
      const updatedParticipants = otherParticipants.map((participant: any) => {
        // Handle both object format and ID format
        const participantId = typeof participant === 'object' ? participant.userId : participant;
        const existingParticipant = participants.find(p => p.userId === Number(participantId));
        
        // Get real user name from allUsers data
        const realUser = allUsers.find((u: any) => u.id === Number(participantId));
        const participantName = realUser?.callsign || realUser?.fullName || `User ${participantId}`;
        
        return {
          userId: Number(participantId),
          userName: participantName,
          audioEnabled: typeof participant === 'object' ? participant.audioEnabled : true,
          videoEnabled: typeof participant === 'object' ? participant.videoEnabled : false,
          stream: existingParticipant?.stream || undefined
        };
      });
      
      setParticipants(updatedParticipants);
      console.log('[GroupVideoCall] Updated participants list:', updatedParticipants);
    }
  }, [activeCall?.participants, user?.id, allUsers]);

  // For group video call, display participants without full WebRTC implementation
  // Full WebRTC requires complex signaling server implementation for mesh or SFU architecture
  useEffect(() => {
    if (participants.length > 0) {
      console.log('[GroupVideoCall] Displaying participants in group call:', participants.map(p => p.userId));
      // Each participant displays their own video locally
      // In a production system, this would use a media server (SFU) like Janus, Kurento, or mediasoup
      // for scalable multi-party video calling
    }
  }, [participants]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('[GroupVideoCall] Component unmounting, cleaning up streams');
      cleanupMediaTracks();
      
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
                    {/* Simulated participant video with animated avatar */}
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d4a2d] to-[#1e3a1e] relative">
                      <Avatar className="h-16 w-16 bg-[#7d9f7d] border-2 border-[#a6c455] transition-all duration-300 hover:scale-105">
                        <AvatarFallback className="bg-[#7d9f7d] text-white text-lg font-bold">
                          {participant.userName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Audio level indicator */}
                      <div className="absolute top-2 right-2">
                        <div className="flex space-x-1">
                          <div className="w-1 h-3 bg-[#a6c455] rounded-full animate-pulse"></div>
                          <div className="w-1 h-4 bg-[#a6c455] rounded-full animate-pulse delay-100"></div>
                          <div className="w-1 h-2 bg-[#a6c455] rounded-full animate-pulse delay-200"></div>
                        </div>
                      </div>
                      
                      {/* Connection status */}
                      <div className="absolute top-2 left-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-1 left-1 bg-black/80 px-2 py-1 rounded border border-[#7d9f7d]/50">
                      <p className="text-[#a6c455] text-xs font-medium">{participant.userName}</p>
                    </div>
                    
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
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCall } from '@/hooks/useCall';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Users, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface GroupParticipant {
  userId: number;
  userName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  stream?: MediaStream;
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

  // Extract group info
  const groupName = activeCall?.groupName || 'Unknown Group';
  
  // Pagination constants - 2x3 grid (6 total slots, 1 for current user + 5 for participants)
  const PARTICIPANTS_PER_PAGE = 5;
  const otherParticipants = participants.filter(p => p.userId !== user?.id);
  const totalPages = Math.max(1, Math.ceil(otherParticipants.length / PARTICIPANTS_PER_PAGE));
  const startIndex = currentPage * PARTICIPANTS_PER_PAGE;
  const endIndex = startIndex + PARTICIPANTS_PER_PAGE;
  const currentPageParticipants = otherParticipants.slice(startIndex, endIndex);

  console.log('[GroupVideoCall] Component rendering with activeCall:', activeCall);
  console.log('[GroupVideoCall] user?.id:', user?.id);

  // Get user media when component mounts
  useEffect(() => {
    const getLocalMedia = async () => {
      try {
        console.log('[GroupVideoCall] Getting local media stream...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        console.log('[GroupVideoCall] Got local media stream:', stream);
        setLocalStream(stream);
        
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
      // Cleanup streams
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeCall]);

  // Update local video ref when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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
      }
    }
  };

  const handleEndCall = () => {
    console.log('[GroupVideoCall] Ending call');
    hangupCall();
  };

  const handleBack = () => {
    console.log('[GroupVideoCall] Going back');
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
            {/* Main 2x3 Grid - Compact for Mobile */}
            <div className="flex-1 mb-2">
              <div className="grid grid-cols-2 gap-1.5 h-full">
                {/* Current User - Always first position */}
                {user && activeCall && (
                  <div className="relative bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] rounded-md overflow-hidden border border-[#4a7c59] aspect-[4/3] max-h-28">
                    {isVideoEnabled ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d4a2d] to-[#1e3a1e]">
                        <Avatar className="h-8 w-8 bg-[#4a7c59] border border-[#a6c455]">
                          <AvatarFallback className="bg-[#4a7c59] text-white text-xs font-bold">
                            {(user.callsign || user.fullName || 'A').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    <div className="absolute bottom-0.5 left-0.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] border border-[#4a7c59]/50">
                      <p className="text-[#a6c455] font-bold">Anda</p>
                    </div>
                    {/* Maximize button */}
                    <button
                      onClick={() => setIsMaximized(true)}
                      className="absolute top-0.5 right-0.5 bg-black/70 p-0.5 rounded hover:bg-[#4a7c59]/30 transition-colors border border-[#4a7c59]/30"
                    >
                      <svg className="w-2.5 h-2.5 text-[#a6c455]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Current Page Participants */}
                {currentPageParticipants.map(participant => (
                  <div 
                    key={participant.userId} 
                    className="relative bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] rounded-md overflow-hidden border border-[#7d9f7d] aspect-[4/3] max-h-28"
                  >
                    {participant.videoEnabled && participant.stream ? (
                      <video
                        ref={el => {
                          if (el) participantVideoRefs.current[participant.userId] = el;
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d4a2d] to-[#1e3a1e]">
                        <Avatar className="h-8 w-8 bg-[#7d9f7d] border border-[#a6c455]">
                          <AvatarFallback className="bg-[#7d9f7d] text-white text-xs font-bold">
                            {participant.userName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    <div className="absolute bottom-0.5 left-0.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] border border-[#7d9f7d]/50">
                      <p className="text-[#a6c455] font-medium">{participant.userName}</p>
                    </div>
                  </div>
                ))}

                {/* Fill remaining slots for current page */}
                {Array.from({ 
                  length: Math.max(0, PARTICIPANTS_PER_PAGE - currentPageParticipants.length) 
                }).map((_, index) => (
                  <div 
                    key={`waiting-${index}`} 
                    className="relative bg-gradient-to-br from-[#0a1a0a] to-[#0f1f0f] rounded-md overflow-hidden border border-dashed border-[#4a7c59]/40 aspect-[4/3] max-h-28 flex items-center justify-center opacity-50"
                  >
                    <div className="text-[#7d9f7d] text-center">
                      <Users className="h-4 w-4 mx-auto mb-0.5" />
                      <p className="text-[8px] font-medium">Waiting...</p>
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
                {isVideoEnabled ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2d4a2d] to-[#1e3a1e]">
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
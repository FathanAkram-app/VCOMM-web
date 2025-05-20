import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Camera, CameraOff, Phone, Users, UserPlus, Check, X } from "lucide-react";

/**
 * SimplifiedGroupVideo Component
 * 
 * A simple group video component that focuses on displaying your own video feed
 * while showing placeholders for other participants. This avoids the WebRTC
 * issues and at least gives users visual feedback.
 */
export default function SimplifiedGroupVideo() {
  // References for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  // UI state
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState("00:00:00");
  const [callStartTime] = useState(new Date());
  const [showParticipantSelector, setShowParticipantSelector] = useState(true);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [featuredParticipants, setFeaturedParticipants] = useState<string[]>([]);
  
  // Available participants (for prototype)
  const availableParticipants = ["ALPHA1", "BRAVO2", "CHARLIE3", "DELTA4", "ECHO5", "FOXTROT6", "GOLF7", "HOTEL8"];
  
  // Active participants (selected participants or default if none selected)
  const participantNames = selectedParticipants.length > 0 
    ? selectedParticipants 
    : ["ALPHA1", "BRAVO2", "CHARLIE3", "DELTA4", "ECHO5"];
  
  // Function to get media stream
  const getMediaStream = async () => {
    try {
      if (localStream) {
        // If we already have a stream, clean it up first
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Very basic constraints to maximize compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 480 },
          height: { ideal: 640 }
        }, 
        audio: true 
      });
      
      console.log("[SimplifiedGroupVideo] Media obtained:", stream.getTracks().map(t => t.kind));
      
      // Set the stream
      setLocalStream(stream);
      
      // Attach to video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Force play
        localVideoRef.current.play().catch(e => {
          console.error("[SimplifiedGroupVideo] Error playing video:", e);
        });
      }
    } catch (error) {
      console.error("[SimplifiedGroupVideo] Error getting user media:", error);
    }
  };
  
  // Try to get media stream immediately after the participant selection is complete
  useEffect(() => {
    if (!showParticipantSelector) {
      // Small delay to ensure component is fully rendered
      setTimeout(() => {
        getMediaStream();
      }, 500);
    }
    
    // Cleanup function
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        console.log("[SimplifiedGroupVideo] Local tracks stopped");
      }
    };
  }, [showParticipantSelector]);
  
  // Update call duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      const duration = new Date().getTime() - callStartTime.getTime();
      const hours = Math.floor(duration / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((duration % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((duration % 60000) / 1000).toString().padStart(2, '0');
      setCallDuration(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [callStartTime]);
  
  // Toggle video on/off
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };
  
  // Toggle audio on/off
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };
  
  // Toggle participant selection
  const toggleParticipantSelection = (participant: string) => {
    setSelectedParticipants(prev => {
      if (prev.includes(participant)) {
        return prev.filter(p => p !== participant);
      } else {
        // Limit selection to 5 participants
        if (prev.length < 5) {
          return [...prev, participant];
        }
        return prev;
      }
    });
  };
  
  // Start group call with selected participants
  const startGroupCall = () => {
    if (selectedParticipants.length === 0) {
      // If no participants selected, use the first 5 available
      setSelectedParticipants(availableParticipants.slice(0, 5));
    }
    
    // Set the first participant as featured (shown in top row)
    if (selectedParticipants.length > 0) {
      setFeaturedParticipants([selectedParticipants[0]]);
    }
    
    // Mark we're done with participant selection - this will trigger the media stream request
    setShowParticipantSelector(false);
    
    // Add a small delay then try to manually initiate the media stream
    setTimeout(() => {
      getMediaStream();
    }, 1000);
  };
  
  // Swap a bottom participant to the featured position (top row)
  const swapToFeatured = (participant: string) => {
    setFeaturedParticipants([participant]);
  };
  
  // Special handler for when user's own video is featured
  const renderFeaturedVideo = () => {
    if (featuredParticipants.includes("YOU")) {
      return (
        <div className="relative aspect-[9/16] bg-black border-2 border-accent rounded-sm overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            controls={false}
            disablePictureInPicture
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <div className="absolute bottom-1 left-1 bg-background/80 px-1 py-0.5 text-xs font-bold">
            YOU (FEATURED)
          </div>
          
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <CameraOff className="text-accent h-6 w-6" />
            </div>
          )}
        </div>
      );
    }
    return null;
  };
  
  // End call and release media
  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    window.history.back();
  };
  
  // Render placeholder for remote participants
  const renderPlaceholder = (name: string, index: number, isClickable = false) => (
    <div 
      key={`remote-${index}`} 
      className={`relative aspect-[9/16] bg-black border-2 border-accent rounded-sm overflow-hidden ${isClickable ? 'cursor-pointer' : ''}`}
      onClick={isClickable ? () => swapToFeatured(name) : undefined}
    >
      <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-none bg-accent/30 flex items-center justify-center border border-accent mb-2">
            <span className="font-bold text-xl">
              {name.substring(0, 2)}
            </span>
          </div>
          <p className="text-xs font-bold uppercase text-accent">
            {name}
          </p>
          {isClickable && (
            <p className="text-[8px] mt-1 text-accent/70">TAP TO FOCUS</p>
          )}
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {showParticipantSelector ? (
        // Participant Selector UI
        <div className="flex flex-col h-full">
          <div className="bg-accent px-4 py-3 text-white">
            <h3 className="font-bold uppercase text-lg tracking-wider text-center">SELECT OPERATORS</h3>
            <p className="text-xs text-center mt-1">Choose up to 5 operators for the tactical group</p>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-2 gap-4">
              {availableParticipants.map((participant) => (
                <div 
                  key={participant}
                  onClick={() => toggleParticipantSelection(participant)}
                  className={`p-3 border-2 rounded flex items-center justify-between cursor-pointer transition-colors ${
                    selectedParticipants.includes(participant) 
                      ? 'border-accent bg-accent/20' 
                      : 'border-muted bg-muted/20'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-none bg-accent/30 flex items-center justify-center border border-accent mr-3">
                      <span className="font-bold text-xl">
                        {participant.substring(0, 2)}
                      </span>
                    </div>
                    <span className="font-bold uppercase">{participant}</span>
                  </div>
                  
                  {selectedParticipants.includes(participant) ? (
                    <Check className="h-5 w-5 text-accent" />
                  ) : (
                    <UserPlus className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 bg-muted/80 border-t border-accent">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-bold">{selectedParticipants.length}/5 Operators Selected</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedParticipants([])} 
                className="text-xs"
              >
                CLEAR ALL
              </Button>
            </div>
            <Button 
              onClick={startGroupCall} 
              className="w-full military-button"
              disabled={selectedParticipants.length === 0}
            >
              ESTABLISH TACTICAL GROUP
            </Button>
          </div>
        </div>
      ) : (
        // Group Video Call UI
        <>
          {/* Header */}
          <div className="bg-accent px-4 py-3 text-white flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-2 text-white hover:bg-accent/80" 
                onClick={() => window.history.back()}
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
              <div>
                <h3 className="font-bold uppercase text-sm tracking-wider">TACTICAL GROUP</h3>
                <p className="text-xs opacity-90">
                  {callDuration} • {participantNames.length + 1} OPERATORS
                </p>
              </div>
            </div>
          </div>
          
          {/* Mobile-Optimized Video Layout - 2 on top, 4 below */}
          <div className="flex-1 bg-muted/30 p-2 overflow-auto">
            <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
              {/* Top Row - 2 Videos Side by Side - Only Featured Participants */}
              <div className="grid grid-cols-2 gap-2 w-full">
                {/* If user's video is featured, render it specially */}
                {featuredParticipants.includes("YOU") && renderFeaturedVideo()}
                
                {/* Other featured participants that are not the user */}
                {featuredParticipants
                  .filter(name => name !== "YOU")
                  .map((name, index) => renderPlaceholder(name, index))}
                
                {/* If we don't have enough featured participants, fill in with other participants */}
                {Array(2 - featuredParticipants.length).fill(0).map((_, index) => (
                  renderPlaceholder(
                    participantNames
                      .filter(name => !featuredParticipants.includes(name))[index], 
                    index + featuredParticipants.length
                  )
                ))}
              </div>
              
              {/* Bottom Row - 4 Videos in a Grid */}
              <div className="grid grid-cols-4 gap-1 w-full">
                {/* User's own video at the first position in the bottom row - only if not featured */}
                {!featuredParticipants.includes("YOU") && (
                  <div className="relative aspect-[9/16] bg-black border-2 border-accent rounded-sm overflow-hidden cursor-pointer"
                       onClick={() => setFeaturedParticipants(["YOU"])}>
                    {/* Full size camera */}
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      controls={false}
                      disablePictureInPicture
                      className="w-full h-full object-cover transform -scale-x-100"
                      onLoadedMetadata={(e) => {
                        console.log("[SimplifiedGroupVideo] Video metadata loaded", e.currentTarget.videoWidth, e.currentTarget.videoHeight);
                        // Force play
                        e.currentTarget.play().catch(err => console.error("Video play error:", err));
                      }}
                    />
                    
                    <div className="absolute bottom-1 left-1 bg-background/80 px-1 py-0.5 text-xs font-bold">
                      YOU
                    </div>
                    
                    {/* Overlay when video is disabled */}
                    {!isVideoEnabled && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <CameraOff className="text-accent h-6 w-6" />
                      </div>
                    )}
                    <p className="text-[8px] absolute top-1 right-1 text-accent/70 bg-background/40 px-1 rounded">TAP TO FOCUS</p>
                  </div>
                )}
                
                {/* Remaining placeholders - exclude the featured participant */}
                {participantNames
                  .filter(name => !featuredParticipants.includes(name))
                  // If user is featured, show more participants; otherwise, show fewer
                  .slice(0, featuredParticipants.includes("YOU") ? 4 : 3)
                  .map((name, index) => (
                    renderPlaceholder(name, index + (featuredParticipants.includes("YOU") ? 0 : 1), true) // pass true to make it clickable
                  ))}
              </div>
            </div>
          </div>
          
          {/* Call Controls */}
          <div className="bg-muted/80 py-4 flex justify-center items-center space-x-4 border-t border-accent relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <p className="text-xs font-mono uppercase text-accent/70">SECURE-CHANNEL</p>
            </div>
            
            <Button 
              variant={isAudioEnabled ? "outline" : "destructive"}
              size="icon" 
              onClick={toggleAudio}
              className="h-12 w-12 rounded-full shadow-md"
            >
              {isAudioEnabled ? <Mic /> : <MicOff />}
            </Button>
            
            <Button 
              variant={isVideoEnabled ? "outline" : "destructive"}
              size="icon" 
              onClick={toggleVideo}
              className="h-12 w-12 rounded-full shadow-md"
            >
              {isVideoEnabled ? <Camera /> : <CameraOff />}
            </Button>
            
            <Button 
              variant="destructive" 
              size="icon" 
              className="h-14 w-14 rounded-full shadow-lg"
              onClick={endCall}
            >
              <Phone className="h-6 w-6 rotate-135" />
            </Button>
            
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <p className="text-xs font-mono uppercase text-accent/70">TACTICAL-OPS</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
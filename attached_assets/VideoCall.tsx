import { useEffect, useRef, useState } from "react";
import { useCall } from "../hooks/useCall";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Camera, CameraOff, Phone, Volume2, Volume, MessageSquare, SwitchCamera } from "lucide-react";
import { formatDuration } from "date-fns";

export default function VideoCall() {
  const { activeCall, hangupCall, toggleCallAudio, toggleCallVideo, toggleMute, switchCallCamera } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<number, HTMLVideoElement | null>>(new Map());
  const [callDuration, setCallDuration] = useState("00:00:00");
  const [isPortraitMode, setIsPortraitMode] = useState(true); // Default to portrait mode (9:16)
  
  console.log("[VideoCall] Component rendering with activeCall:", activeCall);
  
  // Attach local stream to video element
  useEffect(() => {
    console.log("[VideoCall] Local stream changed:", activeCall?.localStream);
    if (activeCall?.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = activeCall.localStream;
      console.log("[VideoCall] Local stream attached to video element");
    }
  }, [activeCall?.localStream]);
  
  // Attach remote streams to video elements
  useEffect(() => {
    console.log("[VideoCall] Remote streams changed:", activeCall?.remoteStreams);
    if (activeCall) {
      activeCall.remoteStreams.forEach((stream, peerId) => {
        const videoElement = remoteVideoRefs.current.get(peerId);
        if (videoElement && videoElement.srcObject !== stream) {
          videoElement.srcObject = stream;
          console.log(`[VideoCall] Remote stream attached for peer ${peerId}`);
        }
      });
    }
  }, [activeCall?.remoteStreams]);
  
  // Update call duration timer
  useEffect(() => {
    if (!activeCall) return;
    
    console.log("[VideoCall] Setting up call duration timer");
    const interval = setInterval(() => {
      const duration = new Date().getTime() - activeCall.startTime.getTime();
      const hours = Math.floor(duration / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((duration % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((duration % 60000) / 1000).toString().padStart(2, '0');
      setCallDuration(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    
    return () => {
      console.log("[VideoCall] Cleaning up call duration timer");
      clearInterval(interval);
    };
  }, [activeCall]);
  
  // Safety check - if no activeCall, show a fallback UI
  if (!activeCall) {
    console.log("[VideoCall] No active call, showing fallback UI");
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold uppercase mb-4">CONNECTION INTERRUPTED</h2>
          <p className="mb-6">Call data not available. Please try again.</p>
          <Button 
            onClick={() => window.history.back()}
            className="military-button"
          >
            RETURN TO COMMS
          </Button>
        </div>
      </div>
    );
  }
  
  // Get the main remote stream for display
  const mainRemoteStream = activeCall.remoteStreams.size > 0 
    ? activeCall.remoteStreams.values().next().value 
    : null;
  
  // Create elements for additional remote streams
  const additionalRemoteStreams = Array.from(activeCall.remoteStreams.entries())
    .slice(1);
  
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Video Call UI */}
      <div className="relative flex-1">
        {/* Call Info Banner */}
        <div className="absolute top-0 inset-x-0 z-20 military-header px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2 text-foreground hover:bg-muted/50" 
              onClick={() => {}}
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
            <div>
              <h3 className="font-bold uppercase tracking-wide">{activeCall.peerName}</h3>
              <p className="text-xs font-medium">{callDuration} | {activeCall.callType.toUpperCase()} TRANSMISSION</p>
            </div>
          </div>
          <div>
            <Button 
              variant="outline" 
              size="icon" 
              className="text-foreground hover:bg-muted/50 border border-accent" 
              onClick={switchCallCamera}
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Main Video Area - Portrait Optimized */}
        <div className="absolute inset-0 bg-accent/10 flex items-center justify-center border-b-2 border-accent">
          {/* Remote Video (Full Screen) - optimized for portrait mode (9:16) */}
          {mainRemoteStream ? (
            <div className={`w-full h-full ${isPortraitMode ? 'flex items-center justify-center' : ''}`}>
              <video
                ref={(element) => {
                  if (element) {
                    remoteVideoRefs.current.set(
                      Array.from(activeCall.remoteStreams.keys())[0], 
                      element
                    );
                  }
                }}
                autoPlay
                playsInline
                muted={activeCall.isMuted}
                className={`${isPortraitMode ? 'h-full max-w-full object-contain' : 'w-full h-full object-cover'}`}
              />
            </div>
          ) : (
            <div className="text-foreground flex flex-col items-center justify-center">
              <div className="w-28 h-28 rounded-none bg-secondary border-2 border-accent flex items-center justify-center mb-4">
                <span className="text-4xl font-bold text-secondary-foreground">
                  {activeCall.peerName.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="bg-muted px-4 py-2 border border-accent">
                <p className="text-accent uppercase font-bold">
                  {activeCall.status === 'connecting' 
                    ? 'ESTABLISHING CONNECTION...' 
                    : activeCall.status === 'reconnecting'
                    ? 'RE-ESTABLISHING CONNECTION...'
                    : ''}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Additional remote videos (for group calls) */}
        <div className="absolute top-20 right-4 z-10 flex flex-col space-y-2">
          {additionalRemoteStreams.map(([peerId, stream]) => (
            <div 
              key={peerId} 
              className="w-28 h-36 bg-secondary border-2 border-accent overflow-hidden"
            >
              <video
                ref={(element) => {
                  if (element) {
                    remoteVideoRefs.current.set(peerId, element);
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        
        {/* Local Video (Picture-in-Picture) - Positioned for mobile portrait view */}
        <div className={`absolute z-10 ${
          isPortraitMode 
            ? 'bottom-24 right-4 w-1/3 rounded-md aspect-[9/16]' // Portrait (9:16) format
            : 'bottom-24 right-4 w-1/3 aspect-video' // Standard (16:9) format
        } bg-secondary border-2 border-accent overflow-hidden`}>
          {activeCall.videoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="flex flex-col items-center">
                <CameraOff className="text-accent h-8 w-8 mb-2" />
                <p className="text-xs font-bold uppercase text-accent">Camera Off</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Call Controls */}
      <div className="bg-background px-4 py-5 flex justify-around items-center border-t-2 border-accent">
        <Button 
          variant="outline" 
          size="icon" 
          className={`w-14 h-14 rounded-sm ${
            activeCall.audioEnabled 
              ? 'bg-secondary border border-accent' 
              : 'bg-destructive text-destructive-foreground'
          }`}
          onClick={toggleCallAudio}
        >
          {activeCall.audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          className={`w-14 h-14 rounded-sm ${
            activeCall.videoEnabled 
              ? 'bg-secondary border border-accent' 
              : 'bg-destructive text-destructive-foreground'
          }`}
          onClick={toggleCallVideo}
        >
          {activeCall.videoEnabled ? <Camera className="h-6 w-6" /> : <CameraOff className="h-6 w-6" />}
        </Button>
        
        <Button 
          variant="destructive" 
          size="icon" 
          className="w-16 h-16 rounded-sm font-bold uppercase"
          onClick={hangupCall}
        >
          <Phone className="h-7 w-7 rotate-135" />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          className={`w-14 h-14 rounded-sm ${
            !activeCall.isMuted 
              ? 'bg-secondary border border-accent' 
              : 'bg-destructive text-destructive-foreground'
          }`}
          onClick={toggleMute}
        >
          {!activeCall.isMuted ? <Volume2 className="h-6 w-6" /> : <Volume className="h-6 w-6" />}
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          className="w-14 h-14 rounded-sm bg-secondary text-foreground border border-accent"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

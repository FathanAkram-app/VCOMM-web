import { useEffect, useRef, useState } from "react";
import { useCall } from "../hooks/useCall";
import useGroupCall from "../hooks/useGroupCall";
import { useAuth } from "../hooks/use-auth";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Camera, CameraOff, Phone, Volume2, Volume, MessageSquare, SwitchCamera, Users } from "lucide-react";

/**
 * GroupVideoCall Component - Emergency Fallback Implementation
 * 
 * This is a completely rewritten version that separates WebRTC handling
 * from video display handling, focusing on getting video elements to show.
 */
export default function GroupVideoCall() {
  // Get the core data and functions
  const { activeCall, hangupCall, toggleCallAudio, toggleCallVideo, toggleMute, switchCallCamera } = useCall();
  const { activeGroupCall, leaveGroupCall, endGroupCallForAll } = useGroupCall();
  const { user } = useAuth();
  
  // State for debug info
  const [debugInfo, setDebugInfo] = useState<{
    localStream: boolean;
    localVideoTracks: number;
    localAudioTracks: number;
    remoteStreamsCount: number;
    remoteVideoTracks: number[];
    remoteAudioTracks: number[];
  }>({
    localStream: false,
    localVideoTracks: 0,
    localAudioTracks: 0,
    remoteStreamsCount: 0,
    remoteVideoTracks: [],
    remoteAudioTracks: []
  });
  
  // Video references
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<HTMLVideoElement[]>([]);
  
  // Basic UI state
  const [callDuration, setCallDuration] = useState("00:00:00");
  const [showDebug, setShowDebug] = useState(false);
  
  // Logging function for better debugging
  const logEvent = (event: string, data?: any) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[GroupVideoCall] ${timestamp} - ${event}`, data || '');
  };
  
  // Set up all the media streams
  useEffect(() => {
    if (!activeCall) return;
    
    // Log call info
    logEvent('Call active', {
      callType: activeCall.callType,
      hasLocalStream: !!activeCall.localStream,
      remoteStreamsCount: activeCall.remoteStreams?.size || 0
    });
    
    // Handle local stream
    if (activeCall.localStream && localVideoRef.current) {
      // Set srcObject on video element
      localVideoRef.current.srcObject = activeCall.localStream;
      localVideoRef.current.muted = true; // Always mute local video
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        localStream: true,
        localVideoTracks: activeCall.localStream?.getVideoTracks().length || 0,
        localAudioTracks: activeCall.localStream?.getAudioTracks().length || 0
      }));
      
      logEvent('Local stream attached to video element');
    }
    
    // Handle remote streams
    const remoteStreamsArray = Array.from(activeCall.remoteStreams.values());
    setDebugInfo(prev => ({
      ...prev,
      remoteStreamsCount: remoteStreamsArray.length,
      remoteVideoTracks: remoteStreamsArray.map(s => s?.getVideoTracks().length || 0),
      remoteAudioTracks: remoteStreamsArray.map(s => s?.getAudioTracks().length || 0)
    }));
    
    // Attach each remote stream to a video element
    remoteStreamsArray.forEach((stream, index) => {
      if (stream && remoteVideoRefs.current[index]) {
        remoteVideoRefs.current[index].srcObject = stream;
        logEvent(`Remote stream ${index} attached`);
      } else {
        logEvent(`Failed to attach remote stream ${index}`, { 
          streamExists: !!stream, 
          refExists: !!remoteVideoRefs.current[index] 
        });
      }
    });
  }, [activeCall, activeCall?.localStream, activeCall?.remoteStreams]);
  
  // Handle call duration timer
  useEffect(() => {
    if (!activeCall?.startTime) return;
    
    const interval = setInterval(() => {
      const duration = new Date().getTime() - activeCall.startTime.getTime();
      const hours = Math.floor(duration / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((duration % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((duration % 60000) / 1000).toString().padStart(2, '0');
      setCallDuration(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeCall?.startTime]);
  
  // Show loading state if no group call data
  if (!activeGroupCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold uppercase mb-4">GROUP DATA UNAVAILABLE</h2>
          <p className="mb-6">Tactical group information not available.</p>
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
  
  // Safety check - if no activeCall, show a loading UI
  if (!activeCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold uppercase mb-4">INITIALIZING VIDEO LINK</h2>
          <p className="mb-6">Establishing tactical video communications...</p>
          <div className="w-10 h-10 border-2 border-accent rounded-full border-t-transparent animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }
  
  // Get data for rendering
  const remoteStreams = Array.from(activeCall.remoteStreams.entries());
  const totalParticipants = remoteStreams.length + 1; // +1 for local user
  
  // Handle end call
  const handleEndCall = () => {
    logEvent('Ending call');
    leaveGroupCall();
    hangupCall();
  };

  // Simplified video rendering
  const renderLocalVideo = () => (
    <div className="relative bg-black border-2 border-accent rounded-sm overflow-hidden" 
         style={{ aspectRatio: "16/9" }}>
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-1 left-1 bg-background/80 px-1 py-0.5 text-xs font-bold">
        YOU
      </div>
      {!activeCall.videoEnabled && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <CameraOff className="text-accent h-6 w-6" />
        </div>
      )}
    </div>
  );

  // Create ref setter function for remote videos
  const setRemoteVideoRef = (index: number) => (el: HTMLVideoElement | null) => {
    if (el) {
      // Store reference in array (not using Map anymore)
      if (!remoteVideoRefs.current) {
        remoteVideoRefs.current = [];
      }
      remoteVideoRefs.current[index] = el;
      
      // Get stream if available
      const streams = Array.from(activeCall.remoteStreams.values());
      const stream = streams[index];
      
      // Attach stream to video element if both exist
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream;
        logEvent(`Stream attached to remote video ${index}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
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
            <h3 className="font-bold uppercase text-sm tracking-wider">{activeGroupCall?.name || 'TACTICAL GROUP'}</h3>
            <p className="text-xs opacity-90">
              {callDuration} • {totalParticipants} OPERATORS
            </p>
          </div>
        </div>
        
        {/* Debug button */}
        <Button 
          variant="ghost"
          size="sm"
          onClick={() => setShowDebug(!showDebug)}
          className="text-white hover:bg-accent/80 text-xs"
        >
          DEBUG
        </Button>
      </div>
      
      {/* Debug info panel */}
      {showDebug && (
        <div className="bg-black/90 text-green-400 p-2 text-xs font-mono overflow-auto max-h-40">
          <div>Local stream: {debugInfo.localStream ? 'YES' : 'NO'}</div>
          <div>Local video tracks: {debugInfo.localVideoTracks}</div>
          <div>Local audio tracks: {debugInfo.localAudioTracks}</div>
          <div>Remote streams: {debugInfo.remoteStreamsCount}</div>
          <div>Remote video tracks: {JSON.stringify(debugInfo.remoteVideoTracks)}</div>
          <div>Remote audio tracks: {JSON.stringify(debugInfo.remoteAudioTracks)}</div>
          <div>Call type: {activeCall.callType}</div>
          <div>Video enabled: {activeCall.videoEnabled ? 'YES' : 'NO'}</div>
          <div>Audio enabled: {activeCall.audioEnabled ? 'YES' : 'NO'}</div>
        </div>
      )}
      
      {/* Ultra simplified video grid - Just a 2x2 grid regardless of participant count */}
      <div className="flex-1 bg-muted/30 p-2 overflow-auto">
        <div className="grid grid-cols-2 gap-2 w-full max-w-md mx-auto">
          {/* Local video always in top left */}
          {renderLocalVideo()}
          
          {/* Remote videos in remaining slots - simplified to just loop through 3 slots */}
          {[0, 1, 2].map(index => (
            <div key={`video-slot-${index}`} className="relative bg-black border-2 border-accent rounded-sm overflow-hidden"
                 style={{ aspectRatio: "16/9" }}>
              <video
                ref={setRemoteVideoRef(index)}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 left-1 bg-background/80 px-1 py-0.5 text-xs font-bold">
                REMOTE {index + 1}
              </div>
              
              {/* Overlay for empty slots */}
              {index >= activeCall.remoteStreams.size && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
                  <p className="text-xs text-accent/60 uppercase font-bold">Awaiting</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Call Controls - simplified */}
      <div className="bg-background py-4 flex justify-center space-x-4 border-t border-accent">
        <Button 
          variant={activeCall?.audioEnabled ? "outline" : "destructive"}
          size="icon" 
          onClick={toggleCallAudio}
          className="h-12 w-12 rounded-full"
        >
          {activeCall?.audioEnabled ? <Mic /> : <MicOff />}
        </Button>
        
        <Button 
          variant={activeCall?.videoEnabled ? "outline" : "destructive"}
          size="icon" 
          onClick={toggleCallVideo}
          className="h-12 w-12 rounded-full"
        >
          {activeCall?.videoEnabled ? <Camera /> : <CameraOff />}
        </Button>
        
        <Button 
          variant="destructive" 
          size="icon" 
          className="h-14 w-14 rounded-full"
          onClick={handleEndCall}
        >
          <Phone className="h-6 w-6 rotate-135" />
        </Button>
        
        {/* Only show the End Call for All button if user is the creator or has admin rights */}
        {activeGroupCall && user && (activeGroupCall.creatorId === user.id) && (
          <Button 
            variant="destructive" 
            size="icon" 
            className="h-12 w-12 rounded-full ml-2"
            onClick={() => {
              // Confirm before ending call for everyone
              if (window.confirm("Are you sure you want to end this call for ALL participants?")) {
                endGroupCallForAll();
                hangupCall();
              }
            }}
            title="End call for all participants"
          >
            <Users className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
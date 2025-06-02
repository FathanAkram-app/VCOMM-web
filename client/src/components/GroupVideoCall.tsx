import React, { useRef, useEffect, useState } from 'react';
import { useCall } from '@/hooks/useCall';
import { useGroupCall } from '@/context/GroupCallContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Phone,
  Users,
  ChevronDown
} from 'lucide-react';

interface GroupVideoCallProps {
  groupCallId: string;
  onEndCall: () => void;
}

export default function GroupVideoCall({ groupCallId, onEndCall }: GroupVideoCallProps) {
  const { user } = useAuth();
  const { activeCall, hangupCall, toggleCallAudio, toggleCallVideo } = useCall();
  const { activeGroupCall, leaveGroupCall, endGroupCallForAll } = useGroupCall();
  
  // Video references
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  
  // UI state
  const [callDuration, setCallDuration] = useState("00:00:00");
  const [showDebug, setShowDebug] = useState(false);

  // Set up local video stream
  useEffect(() => {
    if (!activeCall?.localStream || !localVideoRef.current) return;
    
    localVideoRef.current.srcObject = activeCall.localStream;
    localVideoRef.current.muted = true;
  }, [activeCall?.localStream]);

  // Set up remote video streams
  useEffect(() => {
    if (!activeCall?.remoteStreams) return;
    
    activeCall.remoteStreams.forEach((stream, peerId) => {
      const videoElement = remoteVideoRefs.current[peerId];
      if (videoElement && stream) {
        videoElement.srcObject = stream;
      }
    });
  }, [activeCall?.remoteStreams]);

  // Call duration timer
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

  // Handle end call
  const handleEndCall = () => {
    leaveGroupCall();
    hangupCall();
  };

  // Safety checks
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

  const remoteStreamsArray = Array.from(activeCall.remoteStreams?.entries() || []);
  const totalParticipants = remoteStreamsArray.length + 1;

  // Create video element for remote stream
  const createRemoteVideoElement = (peerId: string, index: number) => (
    <div 
      key={peerId} 
      className="relative bg-black border-2 border-accent rounded-sm overflow-hidden"
      style={{ aspectRatio: "16/9" }}
    >
      <video
        ref={(el) => {
          if (el) {
            remoteVideoRefs.current[peerId] = el;
            const [, stream] = remoteStreamsArray[index] || [];
            if (stream && el.srcObject !== stream) {
              el.srcObject = stream;
            }
          }
        }}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-1 left-1 bg-background/80 px-1 py-0.5 text-xs font-bold">
        REMOTE {index + 1}
      </div>
    </div>
  );

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
            <h3 className="font-bold uppercase text-sm tracking-wider">
              {activeGroupCall.name}
            </h3>
            <p className="text-xs opacity-90">
              {callDuration} • {totalParticipants} OPERATORS
            </p>
          </div>
        </div>
        
        <Button 
          variant="ghost"
          size="sm"
          onClick={() => setShowDebug(!showDebug)}
          className="text-white hover:bg-accent/80 text-xs"
        >
          DEBUG
        </Button>
      </div>
      
      {/* Debug info */}
      {showDebug && (
        <div className="bg-black/90 text-green-400 p-2 text-xs font-mono">
          <div>Local stream: {activeCall.localStream ? 'YES' : 'NO'}</div>
          <div>Remote streams: {activeCall.remoteStreams?.size || 0}</div>
          <div>Call type: {activeCall.callType}</div>
          <div>Video enabled: {activeCall.videoEnabled ? 'YES' : 'NO'}</div>
          <div>Audio enabled: {activeCall.audioEnabled ? 'YES' : 'NO'}</div>
        </div>
      )}
      
      {/* Video Grid */}
      <div className="flex-1 bg-muted/30 p-2 overflow-auto">
        <div className="grid grid-cols-2 gap-2 w-full max-w-4xl mx-auto">
          {/* Local video */}
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
              YOU ({user?.callsign || 'LOCAL'})
            </div>
            {!activeCall.videoEnabled && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <CameraOff className="text-accent h-8 w-8" />
              </div>
            )}
          </div>
          
          {/* Remote videos */}
          {remoteStreamsArray.slice(0, 3).map(([peerId], index) => 
            createRemoteVideoElement(peerId, index)
          )}
          
          {/* Empty slots for additional participants */}
          {Array.from({ length: Math.max(0, 3 - remoteStreamsArray.length) }, (_, index) => (
            <div 
              key={`empty-${index}`}
              className="relative bg-black border-2 border-accent/50 rounded-sm overflow-hidden flex items-center justify-center"
              style={{ aspectRatio: "16/9" }}
            >
              <p className="text-xs text-accent/60 uppercase font-bold">Awaiting Connection</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Call Controls */}
      <div className="bg-background py-4 flex justify-center space-x-4 border-t border-accent">
        <Button 
          variant={activeCall.audioEnabled ? "outline" : "destructive"}
          size="icon" 
          onClick={toggleCallAudio}
          className="h-12 w-12 rounded-full"
        >
          {activeCall.audioEnabled ? <Mic /> : <MicOff />}
        </Button>
        
        <Button 
          variant={activeCall.videoEnabled ? "outline" : "destructive"}
          size="icon" 
          onClick={toggleCallVideo}
          className="h-12 w-12 rounded-full"
        >
          {activeCall.videoEnabled ? <Camera /> : <CameraOff />}
        </Button>
        
        <Button 
          variant="destructive" 
          size="icon" 
          className="h-14 w-14 rounded-full"
          onClick={handleEndCall}
        >
          <Phone className="h-6 w-6 rotate-135" />
        </Button>
        
        {/* End Call for All - only for group creator */}
        {activeGroupCall && user && (activeGroupCall.creatorId === user.id) && (
          <Button 
            variant="destructive" 
            size="icon" 
            className="h-12 w-12 rounded-full ml-2"
            onClick={() => {
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
import { useEffect, useRef, useState } from "react";
import { useCall } from "../hooks/useCall";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Video, VideoOff, Phone, Volume2, VolumeX, SwitchCamera } from "lucide-react";
import { useLocation } from "wouter";

export default function VideoCall() {
  const { activeCall, hangupCall, toggleCallAudio, toggleCallVideo, toggleMute, switchCallCamera, remoteAudioStream } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState("00:00:00");
  const [, setLocation] = useLocation();
  
  console.log("[VideoCall] Component rendering with activeCall:", activeCall);
  
  // Attach local stream to video element
  useEffect(() => {
    console.log("[VideoCall] Local stream changed:", activeCall?.localStream);
    if (localVideoRef.current && activeCall?.localStream) {
      localVideoRef.current.srcObject = activeCall.localStream;
      console.log("[VideoCall] Local stream attached to video element");
    }
  }, [activeCall?.localStream]);
  
  // Handle remote streams - use same system as audio call
  useEffect(() => {
    console.log("[VideoCall] Remote stream changed:", remoteAudioStream);
    if (remoteVideoRef.current && remoteAudioStream) {
      console.log("[VideoCall] Setting remote stream to video element");
      remoteVideoRef.current.srcObject = remoteAudioStream;
      
      // Attempt to play the video
      remoteVideoRef.current.play().then(() => {
        console.log("[VideoCall] ✅ Remote video playing successfully");
      }).catch(error => {
        console.error("[VideoCall] ❌ Remote video play failed:", error);
      });
    }
  }, [remoteAudioStream]);
  
  // Update call duration timer
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') return;
    
    console.log("[VideoCall] Setting up call duration timer");
    const interval = setInterval(() => {
      const duration = new Date().getTime() - (activeCall.startTime?.getTime() || 0);
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
  
  const handleEndCall = () => {
    hangupCall();
    // Navigate back to chat page instead of login
    setLocation('/chat');
  };
  
  const handleBackButton = () => {
    // Navigate to chat page
    setLocation('/chat');
  };
  
  if (!activeCall) {
    console.log("[VideoCall] No active call, redirecting to chat");
    setLocation('/chat');
    return null;
  }
  
  const getStatusText = () => {
    switch (activeCall.status) {
      case 'calling':
        return 'CONNECTING...';
      case 'ringing':
        return 'RINGING...';
      case 'connected':
        return `CONNECTED • ${callDuration}`;
      default:
        return 'ESTABLISHING CONNECTION...';
    }
  };
  
  const hasRemoteStream = activeCall.remoteStreams?.size > 0;
  
  return (
    <div className="fixed inset-0 z-50 bg-[#171717] flex flex-col">
      {/* Call Info Header */}
      <div className="bg-[#2a2a2a] border-b border-[#444444] p-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-3 text-[#a6c455] hover:bg-[#333333]" 
          onClick={handleBackButton}
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg uppercase tracking-wide">
            {activeCall.peerName || 'UNKNOWN OPERATOR'}
          </h3>
          <p className="text-xs text-[#a6c455] font-medium">
            {getStatusText()} | VIDEO TRANSMISSION
          </p>
        </div>
      </div>
      
      {/* Main Video Area */}
      <div className="flex-1 relative bg-[#1a1a1a] overflow-hidden">
        {/* Remote Video (Full Screen Background) */}
        {hasRemoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-40 h-40 bg-[#333333] border-4 border-[#a6c455] flex items-center justify-center mx-auto mb-6">
                <span className="text-6xl font-bold text-[#a6c455]">
                  {activeCall.peerName ? activeCall.peerName.substring(0, 2).toUpperCase() : '??'}
                </span>
              </div>
              <div className="bg-[#2a2a2a] px-6 py-3 border border-[#a6c455] inline-block">
                <p className="text-[#a6c455] uppercase font-bold">
                  {getStatusText()}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Local Video (Picture in Picture) */}
        <div className="absolute top-6 right-6 w-36 h-48 bg-[#333333] border-3 border-[#a6c455] overflow-hidden z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {/* Call Controls - Fixed at bottom */}
      <div className="bg-[#2a2a2a] border-t border-[#444444] px-8 py-6">
        <div className="flex justify-center items-center space-x-8">
          {/* Mute Microphone */}
          <Button 
            variant="outline" 
            size="icon" 
            className={`w-16 h-16 rounded-full border-2 ${
              activeCall.audioEnabled 
                ? 'bg-[#333333] border-[#a6c455] text-[#a6c455] hover:bg-[#444444]' 
                : 'bg-red-600 text-white border-red-600 hover:bg-red-700'
            }`}
            onClick={toggleCallAudio}
          >
            {activeCall.audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          
          {/* End Call */}
          <Button 
            variant="destructive" 
            size="icon" 
            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 border-2 border-red-700"
            onClick={handleEndCall}
          >
            <Phone className="h-8 w-8 rotate-135" />
          </Button>
          
          {/* Toggle Camera */}
          <Button 
            variant="outline" 
            size="icon" 
            className={`w-16 h-16 rounded-full border-2 ${
              activeCall.videoEnabled 
                ? 'bg-[#333333] border-[#a6c455] text-[#a6c455] hover:bg-[#444444]' 
                : 'bg-red-600 text-white border-red-600 hover:bg-red-700'
            }`}
            onClick={toggleCallVideo}
          >
            {activeCall.videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
        </div>
        
        {/* Secondary Controls */}
        <div className="flex justify-center items-center space-x-6 mt-4">
          <Button 
            variant="outline" 
            size="icon" 
            className="w-12 h-12 rounded-full text-[#a6c455] border-[#a6c455] hover:bg-[#333333]"
            onClick={switchCallCamera}
          >
            <SwitchCamera className="h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className={`w-12 h-12 rounded-full ${
              !activeCall.isMuted 
                ? 'text-[#a6c455] border-[#a6c455]' 
                : 'text-red-500 border-red-500'
            } hover:bg-[#333333]`}
            onClick={toggleMute}
          >
            {!activeCall.isMuted ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
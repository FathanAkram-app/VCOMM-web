import { useEffect, useRef, useState } from "react";
import { useCall } from "../hooks/useCall";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Video, VideoOff, Phone, Volume2, VolumeX, SwitchCamera } from "lucide-react";

export default function VideoCall() {
  const { activeCall, hangupCall, toggleCallAudio, toggleCallVideo, toggleMute, switchCallCamera } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState("00:00:00");
  
  console.log("[VideoCall] Component rendering with activeCall:", activeCall);
  
  // Attach local stream to video element
  useEffect(() => {
    console.log("[VideoCall] Local stream changed:", activeCall?.localStream);
    if (localVideoRef.current && activeCall?.localStream) {
      localVideoRef.current.srcObject = activeCall.localStream;
      console.log("[VideoCall] Local stream attached to video element");
    }
  }, [activeCall?.localStream]);
  
  // Handle remote streams
  useEffect(() => {
    console.log("[VideoCall] Remote streams changed:", activeCall?.remoteStreams);
    if (remoteVideoRef.current && activeCall?.remoteStreams) {
      const firstRemoteStream = Array.from(activeCall.remoteStreams.values())[0];
      if (firstRemoteStream) {
        remoteVideoRef.current.srcObject = firstRemoteStream;
      }
    }
  }, [activeCall?.remoteStreams]);
  
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
  
  if (!activeCall) {
    console.log("[VideoCall] No active call, showing fallback UI");
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold uppercase mb-4 text-[#a6c455]">CONNECTION INTERRUPTED</h2>
          <p className="mb-6 text-white">Call data not available. Please try again.</p>
          <Button 
            onClick={() => window.history.back()}
            className="bg-[#a6c455] text-black hover:bg-[#8fa644] font-bold"
          >
            RETURN TO COMMS
          </Button>
        </div>
      </div>
    );
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
    <div className="h-full w-full flex flex-col bg-[#171717]">
      {/* Call Info Header */}
      <div className="bg-[#1a1a1a] border-b border-[#333333] p-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-3 text-[#a6c455] hover:bg-[#333333]" 
          onClick={() => window.history.back()}
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
      <div className="flex-1 relative bg-[#1a1a1a]">
        {/* Remote Video (Main Area) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {hasRemoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <div className="w-32 h-32 rounded-none bg-[#333333] border-4 border-[#a6c455] flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl font-bold text-[#a6c455]">
                  {activeCall.peerName ? activeCall.peerName.substring(0, 2).toUpperCase() : '??'}
                </span>
              </div>
              <div className="bg-[#2a2a2a] px-4 py-2 border border-[#a6c455]">
                <p className="text-[#a6c455] uppercase font-bold text-sm">
                  {getStatusText()}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Local Video (Picture in Picture) */}
        <div className="absolute top-4 right-4 w-40 h-30 bg-[#333333] border-2 border-[#a6c455] rounded-none overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {/* Call Controls */}
      <div className="bg-[#1a1a1a] px-6 py-8 flex justify-around items-center border-t border-[#333333]">
        <Button 
          variant="outline" 
          size="icon" 
          className={`w-16 h-16 rounded-sm ${
            activeCall.audioEnabled 
              ? 'bg-[#333333] border-[#a6c455] text-[#a6c455]' 
              : 'bg-red-600 text-white border-red-600'
          }`}
          onClick={toggleCallAudio}
        >
          {activeCall.audioEnabled ? <Mic className="h-7 w-7" /> : <MicOff className="h-7 w-7" />}
        </Button>
        
        <Button 
          variant="destructive" 
          size="icon" 
          className="w-20 h-20 rounded-sm bg-red-600 hover:bg-red-700 font-bold uppercase"
          onClick={hangupCall}
        >
          <Phone className="h-8 w-8 rotate-135" />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          className={`w-16 h-16 rounded-sm ${
            activeCall.videoEnabled 
              ? 'bg-[#333333] border-[#a6c455] text-[#a6c455]' 
              : 'bg-red-600 text-white border-red-600'
          }`}
          onClick={toggleCallVideo}
        >
          {activeCall.videoEnabled ? <Video className="h-7 w-7" /> : <VideoOff className="h-7 w-7" />}
        </Button>
      </div>
      
      {/* Bottom Actions */}
      <div className="bg-[#171717] px-4 py-3 flex justify-center space-x-4">
        <Button 
          variant="outline" 
          size="icon" 
          className="text-[#a6c455] border-[#a6c455] hover:bg-[#333333]"
          onClick={switchCallCamera}
        >
          <SwitchCamera className="h-5 w-5" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className={`${
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
  );
}
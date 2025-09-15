import { useEffect, useState, useRef } from "react";
import { useCall } from "../hooks/useCall";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Phone, Volume2, VolumeX, MessageSquare, Speaker, Headphones } from "lucide-react";
import { useLocation } from "wouter";

// 🎯 NEW APPROACH: Use proven VideoCall.tsx logic for AudioCall
// This leverages the working video call implementation for reliable audio

export default function AudioCall() {
  const { activeCall, hangupCall, toggleCallAudio, toggleMute, remoteAudioStream } = useCall();
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [callDuration, setCallDuration] = useState("00:00:00");
  const [, setLocation] = useLocation();
  
  console.log("[AudioCall] Component rendering with activeCall:", activeCall);
  
  // 🎯 USING PROVEN VIDEO CALL LOGIC: Handle remote streams - same system as video call
  useEffect(() => {
    console.log("[AudioCall] Remote stream changed:", remoteAudioStream);
    if (remoteAudioRef.current && remoteAudioStream) {
      console.log("[AudioCall] ✅ Setting remote stream to audio element");
      console.log("[AudioCall] Remote stream details:", {
        id: remoteAudioStream.id,
        active: remoteAudioStream.active,
        audioTracks: remoteAudioStream.getAudioTracks().length,
        videoTracks: remoteAudioStream.getVideoTracks().length
      });
      
      // Log track details
      remoteAudioStream.getTracks().forEach((track, index) => {
        console.log(`[AudioCall] Track ${index}:`, {
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          id: track.id
        });
      });
      
      remoteAudioRef.current.srcObject = remoteAudioStream;
      
      // Enable autoplay and set volume - SAME AS VIDEO CALL
      remoteAudioRef.current.autoplay = true;
      remoteAudioRef.current.muted = false; // Don't mute - we want audio!
      remoteAudioRef.current.volume = 1.0;
      
      // Attempt to play the audio - SAME RETRY LOGIC AS VIDEO CALL
      remoteAudioRef.current.play().then(() => {
        console.log("[AudioCall] ✅ Remote audio playing successfully");
      }).catch(error => {
        console.error("[AudioCall] ❌ Remote audio play failed:", error);
        // Try muted autoplay as fallback - SAME AS VIDEO CALL
        if (remoteAudioRef.current) {
          remoteAudioRef.current.muted = true;
          remoteAudioRef.current.play().then(() => {
            console.log("[AudioCall] ✅ Remote audio playing (muted fallback)");
            // Unmute after starting - SAME AS VIDEO CALL
            setTimeout(() => {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.muted = false;
                console.log("[AudioCall] 🔊 Unmuted remote audio after autoplay");
              }
            }, 100);
          }).catch(err => {
            console.error("[AudioCall] ❌ Even muted autoplay failed:", err);
          });
        }
      });
    } else if (!remoteAudioStream) {
      console.log("[AudioCall] ⏳ Waiting for remote stream...");
    } else if (!remoteAudioRef.current) {
      console.log("[AudioCall] ⏳ Waiting for audio element...");
    }
  }, [remoteAudioStream]);
  
  // Update call duration timer - FIXED for consistent timing
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') {
      setCallDuration("00:00:00");
      return;
    }
    
    // 🚀 FIXED: Use consistent start time reference
    const callStartTime = activeCall.startTime?.getTime() || Date.now();
    console.log("[AudioCall] Setting up call duration timer with startTime:", new Date(callStartTime));
    
    const interval = setInterval(() => {
      const duration = Date.now() - callStartTime;
      const hours = Math.floor(duration / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((duration % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((duration % 60000) / 1000).toString().padStart(2, '0');
      setCallDuration(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    
    return () => {
      console.log("[AudioCall] Cleaning up call duration timer");
      clearInterval(interval);
    };
  }, [activeCall?.status, activeCall?.startTime]); // 🚀 FIXED: More specific dependencies
  
  // Cleanup on component unmount - SAME AS VIDEO CALL
  useEffect(() => {
    return () => {
      console.log('[AudioCall] Component unmounting, cleaning up streams');
      if (activeCall?.localStream) {
        activeCall.localStream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
            console.log('[AudioCall] Cleanup on unmount - stopped track:', track.kind);
          }
        });
      }
    };
  }, []);

  const cleanupMediaTracks = () => {
    console.log('[AudioCall] Cleaning up media tracks');
    
    // Stop local stream tracks
    if (activeCall?.localStream) {
      activeCall.localStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log('[AudioCall] Stopped local track:', track.kind, 'readyState:', track.readyState);
        }
      });
    }
    
    // Clear audio element - SIMILAR TO VIDEO CALL CLEANUP
    if (remoteAudioRef.current) {
      const audioElement = remoteAudioRef.current;
      audioElement.pause();
      audioElement.srcObject = null;
      audioElement.load();
      console.log('[AudioCall] Cleared remote audio element');
    }
  };

  const handleEndCall = () => {
    console.log('[AudioCall] Ending call');
    cleanupMediaTracks();
    hangupCall();
    setLocation('/chat');
  };

  const handleBackButton = () => {
    console.log('[AudioCall] Going back');
    cleanupMediaTracks();
    setLocation('/chat');
  };
  
  if (!activeCall) {
    console.log("[AudioCall] No active call, redirecting to chat");
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
  
  const hasRemoteStream = !!remoteAudioStream;
  
  return (
    <div className="fixed inset-0 z-50 bg-[#171717] flex flex-col">
      {/* Call Info Header */}
      <div className="bg-[#2a2a2a] border-b border-[#444444] p-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-3 text-[#a6c455] hover:bg-[#333333]" 
          onClick={handleBackButton}
          data-testid="button-back"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg uppercase tracking-wide">
            {activeCall.peerName || 'UNKNOWN OPERATOR'}
          </h3>
          <p className="text-xs text-[#a6c455] font-medium">
            {getStatusText()} | AUDIO TRANSMISSION
          </p>
        </div>
      </div>
      
      {/* Main Audio Area */}
      <div className="flex-1 relative bg-[#1a1a1a] overflow-hidden">
        {/* Audio Visualization */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-40 h-40 bg-[#333333] border-4 border-[#a6c455] flex items-center justify-center mx-auto mb-6 rounded-full">
              <span className="text-6xl font-bold text-[#a6c455]">
                {activeCall.peerName ? activeCall.peerName.substring(0, 2).toUpperCase() : '??'}
              </span>
            </div>
            <div className="bg-[#2a2a2a] px-6 py-3 border border-[#a6c455] inline-block">
              <p className="text-[#a6c455] uppercase font-bold">
                {getStatusText()}
              </p>
            </div>
            {!hasRemoteStream && (
              <div className="mt-4 text-[#888888] text-sm">
                Waiting for audio connection...
              </div>
            )}
          </div>
        </div>
        
        {/* Hidden audio element - CRITICAL FOR AUDIO PLAYBACK */}
        <audio
          ref={remoteAudioRef}
          id="remoteAudio"
          autoPlay
          playsInline
          style={{ display: 'none' }}
          data-testid="audio-remote"
        />
      </div>
      
      {/* Call Controls */}
      <div className="bg-[#2a2a2a] border-t border-[#444444] p-6">
        <div className="flex items-center justify-center space-x-8">
          {/* Mute Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={`w-16 h-16 rounded-full border-2 ${
              activeCall.isMuted
                ? 'bg-red-500 border-red-400 text-white'
                : 'bg-[#333333] border-[#555555] text-[#a6c455] hover:bg-[#444444]'
            }`}
            onClick={toggleMute}
            data-testid="button-mute"
          >
            {activeCall.isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          
          {/* End Call */}
          <Button
            variant="ghost"
            size="icon"
            className="w-20 h-20 rounded-full bg-red-500 border-2 border-red-400 text-white hover:bg-red-600"
            onClick={handleEndCall}
            data-testid="button-hangup"
          >
            <Phone className="h-8 w-8 rotate-[135deg]" />
          </Button>
          
          {/* Audio Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={`w-16 h-16 rounded-full border-2 ${
              !activeCall.audioEnabled
                ? 'bg-red-500 border-red-400 text-white'
                : 'bg-[#333333] border-[#555555] text-[#a6c455] hover:bg-[#444444]'
            }`}
            onClick={toggleCallAudio}
            data-testid="button-audio"
          >
            {activeCall.audioEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
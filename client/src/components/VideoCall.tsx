import { useEffect, useRef, useState } from "react";
import { useCall } from "../hooks/useCall";
import { protectInterval, unprotectInterval } from "../context/CallContext";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Video, VideoOff, Phone, SwitchCamera } from "lucide-react";
import { useLocation } from "wouter";

export default function VideoCall() {
  const { activeCall, hangupCall, toggleCallAudio, toggleCallVideo, switchCallCamera, remoteAudioStream } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState("00:00:00");
  const [, setLocation] = useLocation();
  
  // 🚀 WATCHDOG: Track timer health
  const lastTickTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  
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
      console.log("[VideoCall] ✅ Setting remote stream to video element");
      console.log("[VideoCall] Remote stream details:", {
        id: remoteAudioStream.id,
        active: remoteAudioStream.active,
        audioTracks: remoteAudioStream.getAudioTracks().length,
        videoTracks: remoteAudioStream.getVideoTracks().length
      });
      
      // Log track details
      remoteAudioStream.getTracks().forEach((track, index) => {
        console.log(`[VideoCall] Track ${index}:`, {
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          id: track.id
        });
      });
      
      remoteVideoRef.current.srcObject = remoteAudioStream;
      
      // Enable autoplay and set volume
      remoteVideoRef.current.autoplay = true;
      remoteVideoRef.current.playsInline = true;
      remoteVideoRef.current.muted = false; // Don't mute - we want audio!
      remoteVideoRef.current.volume = 1.0;
      
      // Attempt to play the video
      remoteVideoRef.current.play().then(() => {
        console.log("[VideoCall] ✅ Remote video playing successfully with audio");
      }).catch(error => {
        console.error("[VideoCall] ❌ Remote video play failed:", error);
        // Try muted autoplay as fallback
        if (remoteVideoRef.current) {
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().then(() => {
            console.log("[VideoCall] ✅ Remote video playing (muted fallback)");
            // Unmute after starting
            setTimeout(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.muted = false;
                console.log("[VideoCall] 🔊 Unmuted remote video after autoplay");
              }
            }, 100);
          }).catch(err => {
            console.error("[VideoCall] ❌ Even muted autoplay failed:", err);
          });
        }
      });
    } else if (!remoteAudioStream) {
      console.log("[VideoCall] ⏳ Waiting for remote stream...");
    } else if (!remoteVideoRef.current) {
      console.log("[VideoCall] ⏳ Waiting for video element...");
    }
  }, [remoteAudioStream]);
  
  // 🚀 RESILIENT TIMER - Uses activeCall.startTime with centralized protection
  useEffect(() => {
    console.log("[VideoCall] 🕐 Resilient timer check - activeCall:", !!activeCall, "status:", activeCall?.status, "startTime:", activeCall?.startTime);
    
    // Only run timer when call is active and connected
    if (!activeCall || activeCall.status !== 'connected') {
      console.log("[VideoCall] 🕐 No active connected call, clearing timer");
      setCallDuration("00:00:00");
      return;
    }
    
    // Use activeCall.startTime if available, fallback to Date.now()
    const callStartTime = activeCall.startTime ? activeCall.startTime.getTime() : Date.now();
    console.log("[VideoCall] 🕐 STARTING RESILIENT TIMER for callId:", activeCall.callId, "startTime:", new Date(callStartTime));
    
    let timerActive = true;
    
    const tick = () => {
      if (!timerActive) return;
      
      const elapsed = Date.now() - callStartTime;
      const sec = Math.floor(elapsed / 1000);
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const secs = sec % 60;
      
      const formatted = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      console.log("[VideoCall] 🕐 RESILIENT TICK:", formatted, "elapsed ms:", elapsed);
      setCallDuration(formatted);
      
      // 🚀 WATCHDOG: Update last tick time
      lastTickTimeRef.current = Date.now();
    };
    
    // First tick immediately
    tick();
    
    // Then every second
    const interval = setInterval(tick, 1000);
    console.log("[VideoCall] 🕐 Resilient timer interval created:", interval);
    
    // 🚀 PROTECT using centralized system
    protectInterval(interval);
    
    // 🚀 WATCHDOG: Store interval reference
    timerIntervalRef.current = interval;
    
    return () => {
      console.log("[VideoCall] 🕐 Cleaning up resilient timer");
      timerActive = false;
      clearInterval(interval);
      // Remove from centralized protection
      unprotectInterval(interval);
      timerIntervalRef.current = null;
    };
  }, [activeCall?.status, activeCall?.callId, activeCall?.startTime]); // Watch for status, callId, and startTime changes
  
  // 🚀 WATCHDOG: Monitor timer health and recover if stuck
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') {
      return;
    }
    
    console.log("[VideoCall] 🐕 WATCHDOG: Starting timer health monitor");
    
    const watchdogInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastTick = now - lastTickTimeRef.current;
      
      console.log("[VideoCall] 🐕 WATCHDOG: Check - timeSinceLastTick:", timeSinceLastTick + "ms");
      
      // If no tick for more than 1500ms while connected, recover
      if (timeSinceLastTick > 1500 && activeCall?.status === 'connected') {
        console.warn("[VideoCall] 🐕 WATCHDOG: Timer stuck! Attempting recovery...");
        console.log("[VideoCall] 🐕 WATCHDOG: Active call:", !!activeCall, "Interval ref:", !!timerIntervalRef.current);
        
        // 🚀 ACTUAL RECOVERY: Restart timer immediately
        console.log("[VideoCall] 🐕 WATCHDOG: Restarting stuck timer NOW");
        
        // Clear existing interval if still running
        if (timerIntervalRef.current) {
          console.log("[VideoCall] 🐕 WATCHDOG: Clearing stuck interval:", timerIntervalRef.current);
          clearInterval(timerIntervalRef.current);
          unprotectInterval(timerIntervalRef.current);
        }
        
        // Create fresh timer with current startTime
        const callStartTime = activeCall.startTime ? activeCall.startTime.getTime() : Date.now();
        const newInterval = setInterval(() => {
          const elapsed = Date.now() - callStartTime;
          const sec = Math.floor(elapsed / 1000);
          const hrs = Math.floor(sec / 3600);
          const mins = Math.floor((sec % 3600) / 60);
          const secs = sec % 60;
          
          const formatted = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          console.log("[VideoCall] 🐕 WATCHDOG RECOVERY TICK:", formatted);
          setCallDuration(formatted);
          lastTickTimeRef.current = Date.now();
        }, 1000);
        
        protectInterval(newInterval);
        timerIntervalRef.current = newInterval;
        console.log("[VideoCall] 🐕 WATCHDOG: Timer restarted successfully with interval:", newInterval);
      }
    }, 2000); // Check every 2 seconds
    
    return () => {
      console.log("[VideoCall] 🐕 WATCHDOG: Cleaning up health monitor");
      clearInterval(watchdogInterval);
    };
  }, [activeCall?.status, activeCall]); // Watch call status
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('[VideoCall] Component unmounting, cleaning up streams');
      if (activeCall?.localStream) {
        activeCall.localStream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
            console.log('[VideoCall] Cleanup on unmount - stopped track:', track.kind);
          }
        });
      }
    };
  }, []);

  const cleanupMediaTracks = () => {
    console.log('[VideoCall] Cleaning up media tracks');
    
    // Stop local stream tracks
    if (activeCall?.localStream) {
      activeCall.localStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log('[VideoCall] Stopped local track:', track.kind, 'readyState:', track.readyState);
        }
      });
    }
    
    // Clear video elements
    if (localVideoRef.current) {
      const videoElement = localVideoRef.current;
      videoElement.pause();
      videoElement.srcObject = null;
      videoElement.load();
      console.log('[VideoCall] Cleared local video element');
    }
    
    if (remoteVideoRef.current) {
      const videoElement = remoteVideoRef.current;
      videoElement.pause();
      videoElement.srcObject = null;
      videoElement.load();
      console.log('[VideoCall] Cleared remote video element');
    }
  };

  const handleEndCall = () => {
    console.log('[VideoCall] Ending call');
    cleanupMediaTracks();
    hangupCall();
    setLocation('/chat');
  };

  const handleBackButton = () => {
    console.log('[VideoCall] Going back');
    cleanupMediaTracks();
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
            className="absolute inset-0 w-full h-full object-contain bg-black"
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
            className="w-full h-full object-contain"
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
          {/* Switch Camera - Always show with debug info */}
          <Button 
            variant="outline" 
            size="icon" 
            className="w-12 h-12 rounded-full text-[#a6c455] border-[#a6c455] hover:bg-[#333333]"
            onClick={() => {
              console.log('[VideoCall] Switch camera button clicked');
              
              if (!activeCall.videoEnabled) {
                console.log('[VideoCall] Video not enabled, cannot switch camera');
                return;
              }
              
              switchCallCamera();
            }}
          >
            <SwitchCamera className="h-5 w-5" />
          </Button>

        </div>
      </div>
    </div>
  );
}
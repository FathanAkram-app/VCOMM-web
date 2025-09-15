import { useEffect, useState, useRef } from "react";
import { useCall } from "../hooks/useCall";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Phone, Volume2, VolumeX, MessageSquare, Speaker, Headphones } from "lucide-react";
import { audioManager, isEarphoneConnected, getCurrentAudioOutput } from '@/utils/audioManager';

// Helper functions for audio management
const forceUnlockAudio = (audioElement: HTMLAudioElement) => {
  console.log("[AudioCall] 🔓 Force unlocking audio...");
  
  // Set maximum volume
  audioElement.volume = 1.0;
  audioElement.muted = false;
  
  // Try to resume any suspended audio context
  if (window.AudioContext || (window as any).webkitAudioContext) {
    try {
      const audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log("[AudioCall] ✅ Audio context resumed");
        }).catch((err: any) => {
          console.log("[AudioCall] ⚠️ Could not resume audio context:", err);
        });
      }
    } catch (e) {
      console.log("[AudioCall] ⚠️ Audio context creation failed:", e);
    }
  }
  
  // Force play with user gesture simulation
  setTimeout(() => {
    audioElement.play().catch(err => {
      console.log("[AudioCall] ⚠️ Force play failed:", err);
    });
  }, 100);
};

const checkAudioOutput = (audioElement: HTMLAudioElement) => {
  console.log("[AudioCall] 🔍 Checking audio output...");
  
  // Check system volume (if available)
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      console.log("[AudioCall] 🔊 Available audio outputs:", audioOutputs.length);
      audioOutputs.forEach((device, index) => {
        console.log(`[AudioCall] Output ${index}:`, {
          deviceId: device.deviceId,
          label: device.label,
          groupId: device.groupId
        });
      });
    }).catch(err => {
      console.log("[AudioCall] ⚠️ Could not enumerate audio devices:", err);
    });
  }
  
  // Log current audio element state
  console.log("[AudioCall] 📊 Current audio state:", {
    paused: audioElement.paused,
    muted: audioElement.muted,
    volume: audioElement.volume,
    currentTime: audioElement.currentTime,
    duration: audioElement.duration,
    readyState: audioElement.readyState,
    networkState: audioElement.networkState
  });
};

export default function AudioCall() {
  const { activeCall, remoteAudioStream, hangupCall, toggleCallAudio, toggleMute } = useCall();
  const [callDuration, setCallDuration] = useState("00:00:00");
  const [isLoudspeaker, setIsLoudspeaker] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isEarphoneDetected, setIsEarphoneDetected] = useState(false);
  const [audioOutput, setAudioOutput] = useState<string>("speaker");
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const [audioDiagnostics, setAudioDiagnostics] = useState<{
    canPlay: boolean;
    playing: boolean;
    stalled: boolean;
    suspended: boolean;
    error: string | null;
  }>({ canPlay: false, playing: false, stalled: false, suspended: false, error: null });
  
  console.log("[AudioCall] Component rendering with activeCall:", activeCall);
  console.log("[AudioCall] remoteAudioStream:", remoteAudioStream);
  
  // Toggle speaker mode function
  const toggleSpeakerMode = async () => {
    if (!isMobileDevice) return;
    
    console.log("[AudioCall] Toggling speaker mode from:", isLoudspeaker);
    setIsLoudspeaker(!isLoudspeaker);
    
    // Apply audio routing changes
    try {
      const newOutput = !isLoudspeaker ? 'speaker' : 'earpiece';
      await audioManager.setAudioOutput(newOutput);
      setAudioOutput(newOutput);
      console.log("[AudioCall] Audio output changed to:", newOutput);
    } catch (error) {
      console.error("[AudioCall] Failed to change audio output:", error);
    }
  };
  
  // Detect mobile device and earphone on component mount
  useEffect(() => {
    const checkMobileDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
      setIsMobileDevice(isMobile);
      console.log("[AudioCall] Mobile device detected:", isMobile);
    };
    
    const checkEarphoneConnection = () => {
      const isConnected = isEarphoneConnected();
      const currentOutput = getCurrentAudioOutput();
      setIsEarphoneDetected(isConnected);
      setAudioOutput(currentOutput);
      console.log("[AudioCall] Earphone connected:", isConnected, "Current output:", currentOutput);
    };
    
    checkMobileDevice();
    checkEarphoneConnection();
    
    // Listen for device changes
    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', checkEarphoneConnection);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', checkEarphoneConnection);
      };
    }
  }, []);

  // Setup remote audio stream - direct connection without mobile optimization
  useEffect(() => {
    console.log("[AudioCall] Remote stream effect triggered, remoteAudioStream:", remoteAudioStream);
    
    if (!remoteAudioStream) {
      console.log("[AudioCall] ❌ No remote audio stream available, waiting for stream...");
      return;
    }
    
    console.log("[AudioCall] Setting up remote audio stream...");
    const audioElement = audioElementRef.current;
    
    if (audioElement) {
      console.log("[AudioCall] ✅ Found remote audio element, setting stream");
      audioElement.srcObject = remoteAudioStream;
      audioElement.volume = 1.0;
      audioElement.autoplay = true;
      audioElement.muted = false;
      
      // Mobile-specific audio routing
      if (isMobileDevice) {
        // Start with earpiece (phone speaker) for mobile calls
        audioElement.setAttribute('playsinline', 'true');
        audioElement.setAttribute('webkit-playsinline', 'true');
        
        // Audio routing for mobile - always use display:block for proper audio routing
        if (!isLoudspeaker) {
          // Earpiece mode - optimize for phone speaker
          audioElement.volume = 0.8;
          audioElement.style.display = 'block'; // Always keep display block for audio routing
          console.log("[AudioCall] 📱 Mobile earpiece mode enabled");
        } else {
          // Loudspeaker mode - optimize for external speaker
          audioElement.volume = 1.0;
          audioElement.style.display = 'block'; // Always keep display block for audio routing
          console.log("[AudioCall] 🔊 Mobile loudspeaker mode enabled");
        }
        
        // Add mobile-specific audio attributes
        audioElement.setAttribute('preload', 'auto');
        audioElement.setAttribute('controls', 'false');
      }
      
      // Add comprehensive audio diagnostics
      const addAudioDiagnostics = () => {
        if (!audioElement) return;
        
        // Reset diagnostics
        setAudioDiagnostics({ canPlay: false, playing: false, stalled: false, suspended: false, error: null });
        
        const handleCanPlay = () => {
          console.log('[AudioCall] 🔊 Audio can play - ready state:', audioElement.readyState);
          setAudioDiagnostics(prev => ({ ...prev, canPlay: true }));
        };
        
        const handlePlaying = () => {
          console.log('[AudioCall] 🎵 Audio is playing - currentTime:', audioElement.currentTime);
          setAudioDiagnostics(prev => ({ ...prev, playing: true, stalled: false, suspended: false }));
        };
        
        const handleStalled = () => {
          console.log('[AudioCall] ⚠️ Audio stalled - network issue detected');
          setAudioDiagnostics(prev => ({ ...prev, stalled: true }));
        };
        
        const handleSuspend = () => {
          console.log('[AudioCall] ⏸️ Audio suspended - playback paused by browser');
          setAudioDiagnostics(prev => ({ ...prev, suspended: true }));
        };
        
        const handleError = (e: Event) => {
          const error = (e.target as HTMLAudioElement).error;
          const errorMsg = error ? `${error.code}: ${error.message}` : 'Unknown audio error';
          console.error('[AudioCall] ❌ Audio error:', errorMsg);
          setAudioDiagnostics(prev => ({ ...prev, error: errorMsg }));
        };
        
        const handleLoadStart = () => console.log('[AudioCall] 🔄 Audio load started');
        const handleLoadedData = () => console.log('[AudioCall] 📊 Audio data loaded');
        const handleLoadedMetadata = () => console.log('[AudioCall] 📋 Audio metadata loaded');
        const handleProgress = () => console.log('[AudioCall] 📈 Audio loading progress');
        const handleWaiting = () => console.log('[AudioCall] ⏳ Audio waiting for data');
        const handleEnded = () => console.log('[AudioCall] 🔚 Audio playback ended');
        
        // Add all event listeners
        audioElement.addEventListener('canplay', handleCanPlay);
        audioElement.addEventListener('playing', handlePlaying);
        audioElement.addEventListener('stalled', handleStalled);
        audioElement.addEventListener('suspend', handleSuspend);
        audioElement.addEventListener('error', handleError);
        audioElement.addEventListener('loadstart', handleLoadStart);
        audioElement.addEventListener('loadeddata', handleLoadedData);
        audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.addEventListener('progress', handleProgress);
        audioElement.addEventListener('waiting', handleWaiting);
        audioElement.addEventListener('ended', handleEnded);
        
        console.log('[AudioCall] 🎧 Audio diagnostics enabled');
      };
      
      addAudioDiagnostics();
      
      // Force audio to play with multiple attempts and debugging
      const tryPlay = async (attempt = 1) => {
        try {
          // Add browser environment debugging
          console.log(`[AudioCall] 🌐 Browser environment:`, {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            isSecureContext: window.isSecureContext,
            protocol: window.location.protocol,
            hostname: window.location.hostname
          });
          
          console.log(`[AudioCall] 🔊 Attempt ${attempt} - Audio element state:`, {
            paused: audioElement.paused,
            muted: audioElement.muted,
            volume: audioElement.volume,
            readyState: audioElement.readyState,
            networkState: audioElement.networkState,
            currentTime: audioElement.currentTime,
            srcObject: !!audioElement.srcObject,
            autoplay: audioElement.autoplay,
            controls: audioElement.controls
          });
          
          // Check if stream has audio tracks
          if (remoteAudioStream) {
            const audioTracks = remoteAudioStream.getAudioTracks();
            console.log(`[AudioCall] 🎤 Remote stream info:`, {
              tracksCount: audioTracks.length,
              streamActive: remoteAudioStream.active,
              streamId: remoteAudioStream.id
            });
            audioTracks.forEach((track, index) => {
              console.log(`[AudioCall] Track ${index}:`, {
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                kind: track.kind,
                id: track.id,
                label: track.label
              });
            });
          }
          
          // Check for browser audio policy restrictions
          console.log(`[AudioCall] 🎮 Checking autoplay policy...`);
          
          // Force audio context resume and volume max
          forceUnlockAudio(audioElement);
          
          // Test user interaction requirement
          let userInteractionRequired = false;
          try {
            const testPlay = audioElement.play();
            if (testPlay instanceof Promise) {
              await testPlay;
            }
            console.log(`[AudioCall] ✅ Remote audio playing successfully (attempt ${attempt})`);
          } catch (error: any) {
            if (error.name === 'NotAllowedError') {
              userInteractionRequired = true;
              console.log(`[AudioCall] ⚠️ User interaction required for audio playback`);
              
              // Add user interaction listener
              const handleUserInteraction = () => {
                console.log(`[AudioCall] 🖱️ User interaction detected, attempting audio play...`);
                audioElement.play().then(() => {
                  console.log(`[AudioCall] ✅ Audio started after user interaction`);
                  forceUnlockAudio(audioElement);
                }).catch(err => {
                  console.error(`[AudioCall] ❌ Audio still failed after user interaction:`, err);
                });
                // Remove listeners after first interaction
                document.removeEventListener('click', handleUserInteraction);
                document.removeEventListener('keydown', handleUserInteraction);
                document.removeEventListener('touchstart', handleUserInteraction);
              };
              
              document.addEventListener('click', handleUserInteraction);
              document.addEventListener('keydown', handleUserInteraction);
              document.addEventListener('touchstart', handleUserInteraction);
              
              console.log(`[AudioCall] 👋 Click anywhere to enable audio playback`);
            } else {
              throw error; // Re-throw other errors
            }
          }
          
          // Additional check after play
          setTimeout(() => {
            console.log(`[AudioCall] 📊 Audio status after play:`, {
              paused: audioElement.paused,
              currentTime: audioElement.currentTime,
              volume: audioElement.volume
            });
            
            // Check if audio is actually playing and fix volume issues
            if (audioElement.currentTime === 0 && !audioElement.paused) {
              console.log('[AudioCall] ⚠️ Audio element shows playing but currentTime is 0 - trying audio fix');
              forceUnlockAudio(audioElement);
            } else {
              console.log('[AudioCall] ✅ HTML5 audio working correctly, currentTime:', audioElement.currentTime);
            }
            
            // Additional volume and audio output checks
            checkAudioOutput(audioElement);
          }, 1000);
          
        } catch (e) {
          console.log(`[AudioCall] Remote audio play failed attempt ${attempt}:`, e);
          if (attempt < 5) {
            setTimeout(() => tryPlay(attempt + 1), 1000);
          } else {
            console.log('[AudioCall] ❌ Failed to play remote audio after 5 attempts');
            
            // Try creating a new audio element as last resort
            console.log('[AudioCall] 🆘 Trying last resort: new audio element');
            try {
              const newAudio = new Audio();
              newAudio.srcObject = remoteAudioStream;
              newAudio.autoplay = true;
              newAudio.volume = 1.0;
              await newAudio.play();
              console.log('[AudioCall] ✅ New audio element worked!');
            } catch (lastError) {
              console.log('[AudioCall] ❌ Last resort failed:', lastError);
            }
          }
        }
      };
      
      // Removed Web Audio API fallback - causes more issues than it solves
      // Keep using direct HTML5 audio element for better compatibility

      tryPlay();
    } else {
      console.log("[AudioCall] ❌ Remote audio element not found");
    }
  }, [remoteAudioStream, isLoudspeaker, isMobileDevice]);

  // Toggle loudspeaker function for mobile devices
  const toggleLoudspeaker = async () => {
    const newLoudspeakerState = !isLoudspeaker;
    setIsLoudspeaker(newLoudspeakerState);
    
    const audioElement = audioElementRef.current;
    if (audioElement && isMobileDevice && remoteAudioStream) {
      try {
        console.log(`[AudioCall] Switching to ${newLoudspeakerState ? 'LOUDSPEAKER' : 'EARPIECE'} mode`);
        
        // Stop current audio stream temporarily
        audioElement.pause();
        audioElement.srcObject = null;
        
        // For mobile devices, we need to recreate the audio context with proper routing
        if (newLoudspeakerState) {
          // LOUDSPEAKER MODE - Use external speakers
          audioElement.volume = 1.0;
          audioElement.setAttribute('playsinline', 'true');
          audioElement.setAttribute('webkit-playsinline', 'true');
          audioElement.removeAttribute('autoplay');
          
          // Set audio to use loudspeaker with proper setSinkId API
          if ('setSinkId' in audioElement && typeof audioElement.setSinkId === 'function') {
            try {
              await audioElement.setSinkId('default');
              console.log('[AudioCall] ✓ setSinkId to default (loudspeaker)');
            } catch (sinkError) {
              console.warn('[AudioCall] setSinkId not supported or failed:', sinkError);
            }
          } else {
            console.warn('[AudioCall] setSinkId API not available');
          }
          
          console.log("[AudioCall] 🔊 Configured for LOUDSPEAKER");
        } else {
          // EARPIECE MODE - Use phone speaker (receiver)
          audioElement.volume = 0.8;
          audioElement.removeAttribute('playsinline');
          audioElement.removeAttribute('webkit-playsinline');
          audioElement.setAttribute('autoplay', 'true');
          
          // Set audio to use earpiece/receiver with proper setSinkId API
          if ('setSinkId' in audioElement && typeof audioElement.setSinkId === 'function') {
            try {
              await audioElement.setSinkId('communications');
              console.log('[AudioCall] ✓ setSinkId to communications (earpiece)');
            } catch (sinkError) {
              console.warn('[AudioCall] setSinkId not supported or failed:', sinkError);
            }
          } else {
            console.warn('[AudioCall] setSinkId API not available');
          }
          
          console.log("[AudioCall] 📱 Configured for EARPIECE");
        }
        
        // Reapply the stream after configuration
        await new Promise(resolve => setTimeout(resolve, 200));
        audioElement.srcObject = remoteAudioStream;
        
        // Force play with user gesture
        try {
          await audioElement.play();
          console.log(`[AudioCall] ✓ Audio playing in ${newLoudspeakerState ? 'LOUDSPEAKER' : 'EARPIECE'} mode`);
        } catch (playError) {
          console.error("[AudioCall] Play error:", playError);
          
          // Alternative approach: create new audio element
          const newAudioElement = document.createElement('audio');
          newAudioElement.id = 'remoteAudio';
          newAudioElement.autoplay = !newLoudspeakerState;
          newAudioElement.volume = newLoudspeakerState ? 1.0 : 0.8;
          newAudioElement.srcObject = remoteAudioStream;
          
          if (newLoudspeakerState) {
            newAudioElement.setAttribute('playsinline', 'true');
          } else {
            newAudioElement.removeAttribute('playsinline');
          }
          
          // Replace old audio element
          const oldElement = document.querySelector('#remoteAudio');
          if (oldElement?.parentNode) {
            oldElement.parentNode.replaceChild(newAudioElement, oldElement);
          }
          
          await newAudioElement.play();
          console.log(`[AudioCall] ✓ New audio element playing in ${newLoudspeakerState ? 'LOUDSPEAKER' : 'EARPIECE'} mode`);
        }
        
      } catch (toggleError) {
        console.error("[AudioCall] Error during speaker toggle:", toggleError);
        
        // Emergency fallback - basic volume adjustment
        if (audioElement) {
          audioElement.volume = newLoudspeakerState ? 1.0 : 0.7;
          audioElement.srcObject = remoteAudioStream;
          try {
            await audioElement.play();
          } catch (playErr) {
            console.error("[AudioCall] Emergency fallback play failed:", playErr);
          }
        }
      }
    } else {
      console.log("[AudioCall] Speaker toggle not available - missing requirements");
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('[AudioCall] Component unmounting, cleaning up streams');
      
      // Stop any active media streams
      if (activeCall?.localStream) {
        activeCall.localStream.getTracks().forEach((track: MediaStreamTrack) => {
          if (track.readyState !== 'ended') {
            track.stop();
            console.log('[AudioCall] Cleanup on unmount - stopped track:', track.kind);
          }
        });
      }
      
      // Clean up audio element
      const audioElement = audioElementRef.current;
      if (audioElement) {
        audioElement.pause();
        audioElement.srcObject = null;
        console.log('[AudioCall] Cleaned up audio element');
      }
      
      // Clean up Web Audio API if it was used
      if ((window as any).currentAudioContext) {
        (window as any).currentAudioContext.close();
        console.log('[AudioCall] Closed Web Audio Context');
      }
    };
  }, [activeCall]);

  // Update call duration timer
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') return;
    
    console.log("[AudioCall] Setting up call duration timer");
    const interval = setInterval(() => {
      const duration = new Date().getTime() - (activeCall.startTime?.getTime() || 0);
      const hours = Math.floor(duration / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((duration % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((duration % 60000) / 1000).toString().padStart(2, '0');
      setCallDuration(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    
    return () => {
      console.log("[AudioCall] Cleaning up call duration timer");
      clearInterval(interval);
    };
  }, [activeCall]);
  
  // Auto-redirect when call ends
  useEffect(() => {
    if (!activeCall) {
      console.log("[AudioCall] No active call, redirecting to chat");
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        window.history.back();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeCall]);

  // Safety check - if no activeCall, show loading state briefly
  if (!activeCall) {
    console.log("[AudioCall] No active call, showing loading state");
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center p-8">
          <div className="animate-pulse">
            <h2 className="text-xl font-bold uppercase mb-4 text-[#8d9c6b]">ENDING CALL...</h2>
            <p className="text-gray-400">Returning to chat...</p>
          </div>
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
  
  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Single managed audio element for remote stream */}
      <audio 
        ref={audioElementRef}
        autoPlay
        playsInline
        style={{ 
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          display: 'block' // Explicitly set to block for proper audio routing
        }}
        onCanPlay={() => setAudioDiagnostics(prev => ({ ...prev, canPlay: true }))}
        onPlaying={() => setAudioDiagnostics(prev => ({ ...prev, playing: true }))}
        onStalled={() => setAudioDiagnostics(prev => ({ ...prev, stalled: true }))}
        onSuspend={() => setAudioDiagnostics(prev => ({ ...prev, suspended: true }))}
        onError={(e) => setAudioDiagnostics(prev => ({ ...prev, error: (e.target as HTMLAudioElement).error?.message || 'Unknown error' }))}
      />
      
      {/* Audio Call UI */}
      <div className="flex-1 flex flex-col">
        {/* Call Info Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center">
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
              AUDIO TRANSMISSION
            </h3>
            <p className="text-xs text-[#a6c455] font-medium">
              {getStatusText()}
            </p>
          </div>
        </div>
        
        {/* Main Call Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
          {/* Contact Avatar */}
          <div className="w-32 h-32 rounded-none bg-[#333333] border-4 border-[#a6c455] flex items-center justify-center mb-4">
            <span className="text-4xl font-bold text-[#a6c455]">
              {activeCall.peerName ? activeCall.peerName.substring(0, 2).toUpperCase() : '??'}
            </span>
          </div>
          
          {/* Contact Name */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">
              {activeCall.peerName || 'UNKNOWN OPERATOR'}
            </h2>
            <div className="bg-[#2a2a2a] px-4 py-2 border border-[#a6c455] mb-3">
              <p className="text-[#a6c455] uppercase font-bold text-sm">
                {getStatusText()}
              </p>
            </div>
            
            {/* Earphone Recommendation for Mobile */}
            {isMobileDevice && !isEarphoneDetected && (
              <div className="bg-amber-900/20 border border-amber-600 rounded p-3 mt-3">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Headphones className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-300 font-semibold text-sm">REKOMENDASI AUDIO</span>
                </div>
                <p className="text-amber-200 text-xs">
                  Gunakan earphone atau headset untuk kualitas audio yang lebih baik dan privasi panggilan.
                </p>
              </div>
            )}
            
            {/* Earphone Connected Status */}
            {isMobileDevice && isEarphoneDetected && (
              <div className="bg-green-900/20 border border-green-600 rounded p-2 mt-3">
                <div className="flex items-center justify-center space-x-2">
                  <Headphones className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 font-medium text-xs">EARPHONE TERHUBUNG</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Call Status Indicators */}
          <div className="flex space-x-4 text-center">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${
                activeCall.audioEnabled ? 'bg-green-500' : 'bg-red-500'
              } mb-1`}></div>
              <span className="text-xs text-gray-400">MIC</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${
                !activeCall.isMuted ? 'bg-green-500' : 'bg-red-500'
              } mb-1`}></div>
              <span className="text-xs text-gray-400">VOLUME</span>
            </div>
            {/* Audio Output Indicator */}
            {isMobileDevice && (
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${
                  isEarphoneDetected ? 'bg-purple-500' : 
                  isLoudspeaker ? 'bg-[#a6c455]' : 'bg-blue-500'
                } mb-1`}></div>
                <span className="text-xs text-gray-400">
                  {isEarphoneDetected ? 'PHONE' : 
                   isLoudspeaker ? 'LOUD' : 'EAR'}
                </span>
              </div>
            )}
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
          
          {/* Audio Output Toggle - Only on mobile */}
          {isMobileDevice ? (
            <Button 
              variant="outline" 
              size="icon" 
              className={`w-16 h-16 rounded-sm ${
                isEarphoneDetected 
                  ? 'bg-purple-600 border-purple-500 text-white' 
                  : isLoudspeaker 
                    ? 'bg-[#a6c455] border-[#a6c455] text-black' 
                    : 'bg-blue-600 border-blue-500 text-white'
              }`}
              onClick={toggleSpeakerMode}
            >
              {isEarphoneDetected ? (
                <Headphones className="h-7 w-7" />
              ) : isLoudspeaker ? (
                <Speaker className="h-7 w-7" />
              ) : (
                <Volume2 className="h-7 w-7" />
              )}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="icon" 
              className={`w-16 h-16 rounded-sm ${
                !activeCall.isMuted 
                  ? 'bg-[#333333] border-[#a6c455] text-[#a6c455]' 
                  : 'bg-red-600 text-white border-red-600'
              }`}
              onClick={toggleMute}
            >
              {!activeCall.isMuted ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
            </Button>
          )}

          {/* Speaker Toggle Button - Only show on mobile */}
          {isMobileDevice && (
            <Button 
              variant="outline" 
              size="icon" 
              className={`w-16 h-16 rounded-sm ${
                isLoudspeaker 
                  ? 'bg-[#a6c455] border-[#a6c455] text-black' 
                  : 'bg-[#333333] border-[#a6c455] text-[#a6c455]'
              }`}
              onClick={toggleLoudspeaker}
              title={isLoudspeaker ? "Switch to Earpiece" : "Switch to Loudspeaker"}
            >
              <Speaker className="h-7 w-7" />
            </Button>
          )}
        </div>
        
        {/* Bottom Actions */}
        <div className="bg-[#171717] px-4 py-3 flex justify-center">
          <Button 
            variant="outline" 
            size="icon" 
            className="text-[#a6c455] border-[#a6c455] hover:bg-[#333333]"
            onClick={() => window.history.back()}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
    </div>
  );
}
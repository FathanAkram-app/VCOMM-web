import { useEffect, useState } from "react";
import { useCall } from "../hooks/useCall";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Phone, Volume2, VolumeX, MessageSquare, Speaker, Headphones } from "lucide-react";
import { audioManager, optimizeStreamForMobile, createMobileAudioElement, isEarphoneConnected, getCurrentAudioOutput } from '@/utils/audioManager';

export default function AudioCall() {
  const { activeCall, remoteAudioStream, hangupCall, toggleCallAudio, toggleMute } = useCall();
  const [callDuration, setCallDuration] = useState("00:00:00");
  const [isLoudspeaker, setIsLoudspeaker] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isEarphoneDetected, setIsEarphoneDetected] = useState(false);
  const [audioOutput, setAudioOutput] = useState<string>("speaker");
  
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

  // Setup remote audio stream with mobile optimization
  useEffect(() => {
    console.log("[AudioCall] Remote stream effect triggered, remoteAudioStream:", remoteAudioStream);
    
    if (remoteAudioStream && isMobileDevice) {
      console.log("[AudioCall] Optimizing audio stream for mobile device");
      
      // Optimize stream using audio manager
      optimizeStreamForMobile(remoteAudioStream).then(optimizedStream => {
        console.log("[AudioCall] Audio stream optimized for mobile");
        
        // Create optimized audio element
        createMobileAudioElement().then(audioElement => {
          audioElement.srcObject = optimizedStream;
          audioElement.play().then(() => {
            console.log("[AudioCall] Optimized audio playing successfully");
          }).catch(error => {
            console.error("[AudioCall] Error playing optimized audio:", error);
          });
        });
      }).catch(error => {
        console.error("[AudioCall] Error optimizing audio stream:", error);
      });
    }
    if (!remoteAudioStream) {
      console.log("[AudioCall] ❌ No remote audio stream available, waiting for stream...");
      return;
    }
    
    console.log("[AudioCall] Setting up remote audio stream...");
    const audioElement = document.querySelector('#remoteAudio') as HTMLAudioElement;
    
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
        
        // Force audio to use earpiece by default on mobile
        if (!isLoudspeaker) {
          // Earpiece mode - optimize for phone speaker
          audioElement.volume = 0.8;
          audioElement.style.display = 'none'; // Hide completely to force system audio routing
          console.log("[AudioCall] 📱 Mobile earpiece mode enabled");
        } else {
          // Loudspeaker mode - optimize for external speaker
          audioElement.volume = 1.0;
          audioElement.style.display = 'block';
          console.log("[AudioCall] 🔊 Mobile loudspeaker mode enabled");
        }
        
        // Add mobile-specific audio attributes
        audioElement.setAttribute('preload', 'auto');
        audioElement.setAttribute('controls', 'false');
      }
      
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
            
            // If currentTime is still 0, try Web Audio API as alternative
            if (audioElement.currentTime === 0) {
              console.log('[AudioCall] 🚨 currentTime still 0, trying Web Audio API...');
              console.log('[AudioCall] 🔧 Audio element not processing stream data, forcing Web Audio API');
              
              // Force stop HTML5 audio and switch to Web Audio API immediately
              audioElement.pause();
              audioElement.srcObject = null;
              console.log('[AudioCall] 🛑 Stopped HTML5 audio element');
              
              tryWebAudioAPI();
            } else {
              console.log('[AudioCall] ✅ HTML5 audio working correctly, currentTime:', audioElement.currentTime);
            }
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
      
      // Web Audio API fallback function
      const tryWebAudioAPI = async () => {
        try {
          console.log('[AudioCall] 🔧 Trying Web Audio API approach...');
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // Resume audio context if suspended
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log('[AudioCall] AudioContext resumed');
          }
          
          // Create media stream source from remote stream
          const source = audioContext.createMediaStreamSource(remoteAudioStream);
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 1.0;
          
          // Connect to destination (speakers)
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          console.log('[AudioCall] ✅ Web Audio API setup complete');
          
          // Store reference for cleanup
          (window as any).currentAudioContext = audioContext;
          (window as any).currentAudioSource = source;
          
        } catch (webAudioError) {
          console.log('[AudioCall] ❌ Web Audio API failed:', webAudioError);
        }
      };

      tryPlay();
    } else {
      console.log("[AudioCall] ❌ Remote audio element not found");
    }
  }, [remoteAudioStream, isLoudspeaker, isMobileDevice]);

  // Toggle loudspeaker function for mobile devices
  const toggleLoudspeaker = async () => {
    const newLoudspeakerState = !isLoudspeaker;
    setIsLoudspeaker(newLoudspeakerState);
    
    const audioElement = document.querySelector('#remoteAudio') as HTMLAudioElement;
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
          
          // Set audio to use loudspeaker
          Object.defineProperty(audioElement, 'sinkId', {
            value: 'default',
            writable: true
          });
          
          console.log("[AudioCall] 🔊 Configured for LOUDSPEAKER");
        } else {
          // EARPIECE MODE - Use phone speaker (receiver)
          audioElement.volume = 0.8;
          audioElement.removeAttribute('playsinline');
          audioElement.removeAttribute('webkit-playsinline');
          audioElement.setAttribute('autoplay', 'true');
          
          // Set audio to use earpiece/receiver
          Object.defineProperty(audioElement, 'sinkId', {
            value: 'communications',
            writable: true
          });
          
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
      const audioElement = document.querySelector('#remoteAudio') as HTMLAudioElement;
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
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#a6c455] via-transparent to-[#a6c455]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#a6c455] rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#a6c455] rounded-full blur-3xl opacity-10"></div>
      </div>
      {/* Hidden audio element for remote stream */}
      <audio 
        id="remoteAudio"
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
      
      {/* Audio Call UI */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Enhanced Call Info Header */}
        <div className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 backdrop-blur-sm border-b border-[#a6c455]/20 p-4 flex items-center shadow-lg">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-3 text-[#a6c455] hover:bg-[#333333]/50 transition-colors duration-200" 
            onClick={() => window.history.back()}
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg uppercase tracking-wide drop-shadow-sm">
              AUDIO TRANSMISSION
            </h3>
            <p className="text-xs text-[#a6c455] font-medium">
              {getStatusText()}
            </p>
          </div>
        </div>
        
        {/* Main Call Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          {/* Enhanced Contact Avatar dengan Glow Effect */}
          <div className="relative">
            {/* Glow ring untuk connected state */}
            {activeCall.status === 'connected' && (
              <div className="absolute inset-0 w-40 h-40 rounded-full bg-[#a6c455] opacity-20 animate-pulse scale-110"></div>
            )}
            {/* Main Avatar */}
            <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-[#4a5d2a] to-[#2a3318] border-4 border-[#a6c455] flex items-center justify-center shadow-2xl">
              <span className="text-5xl font-bold text-[#a6c455] drop-shadow-lg">
                {activeCall.peerName ? activeCall.peerName.substring(0, 2).toUpperCase() : '??'}
              </span>
              {/* Active indicator ring */}
              {activeCall.status === 'connected' && (
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white animate-ping"></div>
                </div>
              )}
            </div>
          </div>
          
          {/* Enhanced Contact Info */}
          <div className="text-center space-y-4">
            <div className="relative">
              <h2 className="text-3xl font-bold text-white uppercase tracking-wider mb-2 drop-shadow-md">
                {activeCall.peerName || 'UNKNOWN OPERATOR'}
              </h2>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-[#a6c455] to-transparent"></div>
            </div>
            
            {/* Status dengan desain yang lebih menarik */}
            <div className="relative">
              <div className="bg-gradient-to-r from-[#2a2a2a] via-[#3a3a3a] to-[#2a2a2a] px-6 py-3 border border-[#a6c455] rounded-lg shadow-lg">
                <div className="flex items-center justify-center space-x-2">
                  {activeCall.status === 'connected' && (
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  )}
                  {activeCall.status === 'calling' && (
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce"></div>
                  )}
                  {activeCall.status === 'ringing' && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  )}
                  <p className="text-[#a6c455] uppercase font-bold text-sm tracking-wider">
                    {getStatusText()}
                  </p>
                </div>
              </div>
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
          
          {/* Enhanced Call Status Indicators */}
          <div className="flex space-x-8 text-center">
            <div className="flex flex-col items-center space-y-2">
              <div className={`relative w-5 h-5 rounded-full ${
                activeCall.audioEnabled ? 'bg-green-500' : 'bg-red-500'
              } shadow-lg`}>
                {activeCall.audioEnabled && (
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
                )}
              </div>
              <span className="text-xs text-gray-300 font-medium uppercase tracking-wide">MIC</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className={`relative w-5 h-5 rounded-full ${
                !activeCall.isMuted ? 'bg-green-500' : 'bg-red-500'
              } shadow-lg`}>
                {!activeCall.isMuted && (
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
                )}
              </div>
              <span className="text-xs text-gray-300 font-medium uppercase tracking-wide">VOLUME</span>
            </div>
            {/* Enhanced Audio Output Indicator */}
            {isMobileDevice && (
              <div className="flex flex-col items-center space-y-2">
                <div className={`relative w-5 h-5 rounded-full ${
                  isEarphoneDetected ? 'bg-purple-500' : 
                  isLoudspeaker ? 'bg-[#a6c455]' : 'bg-blue-500'
                } shadow-lg`}>
                  <div className={`absolute inset-0 rounded-full ${
                    isEarphoneDetected ? 'bg-purple-500' : 
                    isLoudspeaker ? 'bg-[#a6c455]' : 'bg-blue-500'
                  } animate-ping opacity-75`}></div>
                </div>
                <span className="text-xs text-gray-300 font-medium uppercase tracking-wide">
                  {isEarphoneDetected ? 'PHONE' : 
                   isLoudspeaker ? 'LOUD' : 'EAR'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Enhanced Call Controls */}
        <div className="bg-gradient-to-t from-[#0a0a0a] to-[#1a1a1a] px-6 py-10 flex justify-around items-center border-t border-[#333333] shadow-2xl">
          <Button 
            variant="outline" 
            size="icon" 
            className={`w-20 h-20 rounded-full transition-all duration-300 transform hover:scale-105 ${
              activeCall.audioEnabled 
                ? 'bg-[#333333] border-[#a6c455] text-[#a6c455] shadow-lg shadow-[#a6c455]/20' 
                : 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/30'
            }`}
            onClick={toggleCallAudio}
          >
            {activeCall.audioEnabled ? <Mic className="h-8 w-8" /> : <MicOff className="h-8 w-8" />}
          </Button>
          
          <Button 
            variant="destructive" 
            size="icon" 
            className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 font-bold uppercase shadow-2xl shadow-red-600/40 transition-all duration-300 transform hover:scale-105 active:scale-95"
            onClick={hangupCall}
          >
            <Phone className="h-10 w-10 rotate-135" />
          </Button>
          
          {/* Enhanced Audio Output Toggle - Only on mobile */}
          {isMobileDevice ? (
            <Button 
              variant="outline" 
              size="icon" 
              className={`w-20 h-20 rounded-full transition-all duration-300 transform hover:scale-105 ${
                isEarphoneDetected 
                  ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30' 
                  : isLoudspeaker 
                    ? 'bg-[#a6c455] border-[#a6c455] text-black shadow-lg shadow-[#a6c455]/30' 
                    : 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
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
              className={`w-20 h-20 rounded-full transition-all duration-300 transform hover:scale-105 ${
                !activeCall.isMuted 
                  ? 'bg-[#333333] border-[#a6c455] text-[#a6c455] shadow-lg shadow-[#a6c455]/20' 
                  : 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/30'
              }`}
              onClick={toggleMute}
            >
              {!activeCall.isMuted ? <Volume2 className="h-8 w-8" /> : <VolumeX className="h-8 w-8" />}
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
      
      {/* Hidden audio element for remote stream */}
      <audio id="remoteAudio" autoPlay playsInline style={{ display: 'none' }} />
    </div>
  );
}
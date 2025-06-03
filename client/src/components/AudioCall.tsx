import { useEffect, useState } from "react";
import { useCall } from "../hooks/useCall";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Phone, Volume2, VolumeX, MessageSquare } from "lucide-react";

export default function AudioCall() {
  const { activeCall, remoteAudioStream, hangupCall, toggleCallAudio, toggleMute } = useCall();
  const [callDuration, setCallDuration] = useState("00:00:00");
  
  console.log("[AudioCall] Component rendering with activeCall:", activeCall);
  console.log("[AudioCall] remoteAudioStream:", remoteAudioStream);
  
  // Setup remote audio stream when component mounts
  useEffect(() => {
    console.log("[AudioCall] Remote stream effect triggered, remoteAudioStream:", remoteAudioStream);
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
  }, [remoteAudioStream]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('[AudioCall] Component unmounting, cleaning up streams');
      
      // Stop any active media streams
      if (activeCall?.localStream) {
        activeCall.localStream.getTracks().forEach(track => {
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
  }, []);

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
    <div className="h-full w-full flex flex-col bg-[#171717]">
      {/* Hidden audio element for remote stream */}
      <audio 
        id="remoteAudio"
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
      
      {/* Audio Call UI */}
      <div className="flex-1 flex flex-col">
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
            <div className="bg-[#2a2a2a] px-4 py-2 border border-[#a6c455]">
              <p className="text-[#a6c455] uppercase font-bold text-sm">
                {getStatusText()}
              </p>
            </div>
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
              <span className="text-xs text-gray-400">SPEAKER</span>
            </div>
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
              !activeCall.isMuted 
                ? 'bg-[#333333] border-[#a6c455] text-[#a6c455]' 
                : 'bg-red-600 text-white border-red-600'
            }`}
            onClick={toggleMute}
          >
            {!activeCall.isMuted ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
          </Button>
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
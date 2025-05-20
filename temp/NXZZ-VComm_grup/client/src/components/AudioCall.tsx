import { useEffect, useRef, useState } from "react";
import { useCall } from "../hooks/useCall";
import { Button } from "./ui/button";
import { Mic, MicOff, Phone, Volume2, Volume } from "lucide-react";
import { logConnectionState, getConnectionDiagnostics } from "../lib/webrtc";

/**
 * Audio Call Component
 * 
 * Specialized component for audio-only calls to improve reliability and performance.
 * This component doesn't attempt to handle any video elements, reducing complexity
 * and potential points of failure for audio-only communication.
 */
export default function AudioCall() {
  const { activeCall, hangupCall, toggleCallAudio, toggleMute } = useCall();
  const [callDuration, setCallDuration] = useState("00:00:00");
  const [connectionInfo, setConnectionInfo] = useState<string>("");
  
  console.log("[AudioCall] Component rendering with activeCall:", activeCall);
  
  // Update call duration timer
  useEffect(() => {
    if (!activeCall) return;
    
    console.log("[AudioCall] Setting up call duration timer");
    const interval = setInterval(() => {
      const duration = new Date().getTime() - activeCall.startTime.getTime();
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

  // Log connection diagnostics regularly for troubleshooting
  useEffect(() => {
    if (!activeCall) return;
    
    console.log("[AudioCall] Setting up connection diagnostics logger");
    const logInterval = setInterval(() => {
      // Log detailed connection state
      logConnectionState();
      
      // Get diagnostics to display in the UI
      const diagnostics = getConnectionDiagnostics();
      if (diagnostics.length > 0) {
        const mainPeer = diagnostics[0];
        setConnectionInfo(
          `${mainPeer.connectionState} | ICE: ${mainPeer.iceConnectionState} | Signal: ${mainPeer.signalingState}`
        );
        console.log("[AudioCall] Connection info updated:", connectionInfo);
      }
    }, 5000);
    
    return () => {
      console.log("[AudioCall] Cleaning up connection diagnostics logger");
      clearInterval(logInterval);
    };
  }, [activeCall]);
  
  // Safety check - if no activeCall, show a fallback UI
  if (!activeCall) {
    console.log("[AudioCall] No active call, showing fallback UI");
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold uppercase mb-4">CONNECTION INTERRUPTED</h2>
          <p className="mb-6">Audio call data not available. Please try again.</p>
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
  
  // Check if it's the right call type
  if (activeCall.callType !== 'audio') {
    console.log("[AudioCall] Call type is not audio, not rendering audio interface");
    return null;
  }
  
  // Ensure we're only showing audio call UI for audio calls
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Audio Call UI - Visual representation of audio call */}
      <div className="flex-1 flex flex-col bg-accent/10 border-t-2 border-b-2 border-accent">
        {/* Call Banner */}
        <div className="military-header px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center">
            <div>
              <h3 className="font-bold uppercase tracking-wide">{activeCall.peerName}</h3>
              <p className="text-xs font-medium">{callDuration} | SECURE VOICE CHANNEL</p>
            </div>
          </div>
        </div>
        
        {/* Audio Call Visual */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {/* Caller/Room Identification */}
          <div className="w-36 h-36 rounded-none bg-secondary border-4 border-accent flex items-center justify-center mb-8">
            <span className="text-5xl font-bold text-secondary-foreground">
              {activeCall.peerName.substring(0, 2).toUpperCase()}
            </span>
          </div>
          
          {/* Call Type */}
          <div className="bg-muted px-6 py-3 border-2 border-accent mb-8">
            <p className="text-lg font-bold uppercase tracking-wide text-accent">
              VOICE TRANSMISSION
            </p>
          </div>
          
          {/* Connection Status */}
          <div className="bg-muted px-6 py-3 border-2 border-accent mb-4">
            <p className="text-sm uppercase font-bold tracking-wide text-accent">
              {activeCall.status === 'connecting' 
                ? 'ESTABLISHING CONNECTION...' 
                : activeCall.status === 'reconnecting'
                ? 'RE-ESTABLISHING CONNECTION...'
                : activeCall.status === 'connected'
                ? 'CONNECTION SECURE'
                : 'CONNECTION LOST'}
            </p>
          </div>
          
          {/* Technical Connection Info */}
          {connectionInfo && (
            <div className="bg-muted px-6 py-2 border border-accent">
              <p className="text-xs uppercase font-mono text-accent/80">
                {connectionInfo}
              </p>
            </div>
          )}
          
          {/* Audio Visualization (Fake waveform) */}
          <div className="flex items-center justify-center space-x-2 mt-8">
            {Array.from({ length: 16 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-${Math.floor(Math.random() * 16) + 4} bg-accent animate-pulse`}
                style={{ 
                  height: `${Math.floor(Math.random() * 20) + 10}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Call Controls */}
      <div className="p-4 grid grid-cols-3 gap-4">
        {/* Mic Toggle */}
        <Button
          onClick={toggleCallAudio}
          className={`py-8 ${activeCall.audioEnabled ? 'bg-accent/20 hover:bg-accent/30' : 'bg-destructive text-destructive-foreground'}`}
          variant="outline"
        >
          {activeCall.audioEnabled ? (
            <>
              <Mic className="mr-2 h-5 w-5" />
              <span>MICROPHONE ON</span>
            </>
          ) : (
            <>
              <MicOff className="mr-2 h-5 w-5" />
              <span>MICROPHONE OFF</span>
            </>
          )}
        </Button>
        
        {/* End Call */}
        <Button
          onClick={hangupCall}
          className="py-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          <Phone className="mr-2 h-5 w-5" />
          <span>END TRANSMISSION</span>
        </Button>
        
        {/* Speaker Toggle */}
        <Button
          onClick={toggleMute}
          className={`py-8 ${!activeCall.isMuted ? 'bg-accent/20 hover:bg-accent/30' : 'bg-destructive text-destructive-foreground'}`}
          variant="outline"
        >
          {!activeCall.isMuted ? (
            <>
              <Volume2 className="mr-2 h-5 w-5" />
              <span>SPEAKER ON</span>
            </>
          ) : (
            <>
              <Volume className="mr-2 h-5 w-5" />
              <span>SPEAKER OFF</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
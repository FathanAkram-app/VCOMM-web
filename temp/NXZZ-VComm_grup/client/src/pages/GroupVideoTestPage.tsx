import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

/**
 * GroupVideoTestPage
 * 
 * A simple diagnostic page to test multiple video elements working together.
 * This bypasses all the complex WebRTC logic and just tests the video rendering itself.
 */
export default function GroupVideoTestPage() {
  const { toast } = useToast();
  
  // Video refs for local and simulated remote streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const simulatedVideoRefs = [
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null)
  ];
  
  // State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  
  // Initialize media for testing
  const startVideoTest = async () => {
    try {
      // Request user media with both audio and video
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      setIsStarted(true);
      
      console.log("[GroupVideoTestPage] Successfully obtained media stream");
      
      toast({
        title: "Video Test Started",
        description: "Successfully initialized video stream"
      });
      
    } catch (error) {
      console.error("[GroupVideoTestPage] Error accessing media devices:", error);
      
      toast({
        title: "Media Access Failed",
        description: "Could not access camera and microphone",
        variant: "destructive"
      });
    }
  };
  
  // Stop all media streams
  const stopVideoTest = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      setIsStarted(false);
      
      toast({
        title: "Video Test Stopped",
        description: "All media streams released"
      });
    }
  };
  
  // Attach local stream to video elements
  useEffect(() => {
    if (!localStream) return;
    
    // Attach to local video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      console.log("[GroupVideoTestPage] Local stream attached to video element");
    }
    
    // Also attach the same stream to all simulated remote videos
    // In a real call, these would be different remote streams
    simulatedVideoRefs.forEach((ref, index) => {
      if (ref.current) {
        ref.current.srcObject = localStream;
        console.log(`[GroupVideoTestPage] Stream attached to simulated remote video ${index + 1}`);
      }
    });
    
    // Cleanup on unmount
    return () => {
      stopVideoTest();
    };
  }, [localStream]);
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="bg-accent px-4 py-3 text-white">
        <h1 className="font-bold text-lg">VIDEO GRID TEST</h1>
        <p className="text-sm">Testing multiple video elements in a grid layout</p>
      </div>
      
      {!isStarted ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Video Grid Diagnostic Test</h2>
            <p className="mb-6">This test will display multiple video feeds in a grid.</p>
            <Button onClick={startVideoTest}>
              Start Video Test
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile-Optimized Video Layout - 2 on top, 4 below */}
          <div className="flex-1 bg-muted/20 flex items-center justify-center overflow-auto">
            <div className="flex flex-col gap-2 p-4 w-full max-w-md">
              {/* Top Row - 2 Videos Side by Side */}
              <div className="grid grid-cols-2 gap-2 w-full">
                {/* Local Video */}
                <div className="relative aspect-video bg-black border-2 border-accent rounded-sm overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 bg-background/80 px-1 py-0.5 text-xs font-bold rounded-sm">
                    YOU
                  </div>
                </div>
                
                {/* First Remote Video */}
                <div className="relative aspect-video bg-black border-2 border-accent rounded-sm overflow-hidden">
                  <video
                    ref={simulatedVideoRefs[0]}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 bg-background/80 px-1 py-0.5 text-xs font-bold rounded-sm">
                    REMOTE 1
                  </div>
                </div>
              </div>
              
              {/* Bottom Row - 4 Videos in a Grid */}
              <div className="grid grid-cols-4 gap-1 w-full">
                {/* Remaining Remote Videos */}
                {simulatedVideoRefs.slice(1).map((ref, index) => (
                  <div 
                    key={`remote-${index + 2}`} 
                    className="relative aspect-video bg-black border-2 border-accent rounded-sm overflow-hidden"
                  >
                    <video
                      ref={ref}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 bg-background/80 px-1 py-0.5 text-[8px] font-bold rounded-sm">
                      R{index + 2}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="bg-background px-4 py-4 flex justify-center gap-4 border-t">
            <Button onClick={stopVideoTest} variant="destructive">
              Stop Video Test
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
import { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";
import {
  addEventListener,
  removeEventListener,
  sendCallOffer,
  sendCallAnswer,
  sendIceCandidate,
  endCall,
} from "../lib/websocket";
import {
  initializeLocalMedia,
  createOffer,
  handleOffer,
  handleAnswer,
  addIceCandidate,
  setOnIceCandidate,
  setOnRemoteStream,
  setOnConnectionStateChange,
  closeAllConnections,
  toggleAudio,
  toggleVideo,
  switchCamera,
  getLocalStream,
} from "../lib/webrtc";
import { useToast } from "../hooks/use-toast";

interface IncomingCall {
  id: number;
  callerId: number;
  callerName: string;
  isRoom: boolean;
  roomId?: number;
  roomName?: string;
  callType: 'video' | 'audio';
  sdp: RTCSessionDescriptionInit;
}

interface ActiveCall {
  id: number;
  peerId: number;
  peerName: string;
  isRoom: boolean;
  roomId?: number;
  roomName?: string;
  callType: 'video' | 'audio';
  startTime: Date;
  status: 'connecting' | 'connected' | 'reconnecting' | 'ended';
  localStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isMuted: boolean;
  callState?: 'active' | 'hold' | 'ended';
}

interface CallContextProps {
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;
  isCallLoading: boolean;
  startCall: (userId: number, callType: 'video' | 'audio') => Promise<void>;
  startRoomCall: (roomId: number, roomName: string, callType: 'video' | 'audio') => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  hangupCall: () => void;
  toggleCallAudio: () => void;
  toggleCallVideo: () => void;
  toggleMute: () => void;
  switchCallCamera: () => Promise<void>;
}

export const CallContext = createContext<CallContextProps | undefined>(undefined);

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCallLoading, setIsCallLoading] = useState(false);

  // Initialize WebRTC event listeners
  useEffect(() => {
    // Handle ICE candidates
    setOnIceCandidate((peerId, candidate) => {
      // Use the current active call type to make the ICE candidate exchange
      if (activeCall) {
        // Make sure to include the callType in ICE candidate messages for proper routing
        sendIceCandidate(peerId, candidate, activeCall.callType);
        
        // Log successful ICE candidate generation
        console.log(`ICE candidate sent for ${activeCall.callType} call to peer ${peerId}`);
      }
    });

    // Handle remote stream received
    setOnRemoteStream((stream, peerId) => {
      if (activeCall) {
        const newRemoteStreams = new Map(activeCall.remoteStreams);
        newRemoteStreams.set(peerId, stream);
        
        setActiveCall({
          ...activeCall,
          remoteStreams: newRemoteStreams,
          status: 'connected',
        });
      }
    });

    // Handle connection state changes
    setOnConnectionStateChange((state, peerId) => {
      if (activeCall) {
        let status: 'connecting' | 'connected' | 'reconnecting' | 'ended' = activeCall.status;
        
        switch (state) {
          case 'connecting':
          case 'new':
            status = 'connecting';
            break;
          case 'connected':
            status = 'connected';
            break;
          case 'disconnected':
            status = 'reconnecting';
            break;
          case 'failed':
          case 'closed':
            if (activeCall.isRoom) {
              // For group calls, only update status if all connections are closed
              const allClosed = Array.from(activeCall.remoteStreams.keys())
                .every(id => id === peerId);
              
              if (allClosed) {
                status = 'ended';
              }
            } else {
              status = 'ended';
            }
            break;
        }
        
        setActiveCall({
          ...activeCall,
          status,
        });
      }
    });
  }, [activeCall]);

  // Initialize WebSocket event listeners
  useEffect(() => {
    // Handle incoming call
    const handleIncomingCall = (data: any) => {
      // Ignore if already in a call
      if (activeCall) {
        return;
      }
      
      setIncomingCall({
        id: data.call.id,
        callerId: data.call.caller.id,
        callerName: data.call.caller.username,
        isRoom: data.call.isRoom,
        roomId: data.call.roomId,
        roomName: data.call.roomName,
        callType: data.call.callType,
        sdp: data.call.sdp,
      });
    };

    // Handle call answered
    const handleCallAnswered = async (data: any) => {
      if (activeCall && data.callId === activeCall.id) {
        try {
          console.log(`Received call answer for ${activeCall.callType} call from user ${data.userId}`);
          
          // Parse SDP if it's a string
          const sdp = typeof data.sdp === 'string' 
            ? JSON.parse(data.sdp) 
            : data.sdp;
            
          console.log(`Processing answer SDP for ${activeCall.callType} call`);
          await handleAnswer(data.userId, sdp);
          
          console.log(`Successfully processed answer for ${activeCall.callType} call`);
        } catch (error) {
          console.error("Failed to process call answer:", error);
          toast({
            title: "Call Error",
            description: "Failed to establish connection with peer.",
            variant: "destructive",
          });
        }
      }
    };

    // Handle ICE candidate received
    const handleIceCandidateReceived = async (data: any) => {
      if (activeCall) {
        try {
          console.log(`Received ICE candidate for ${activeCall.callType} call from peer ${data.userId}`);
          
          // Parse candidate if it's a string
          const candidate = typeof data.candidate === 'string' 
            ? JSON.parse(data.candidate) 
            : data.candidate;
            
          await addIceCandidate(data.userId, candidate);
          console.log("Successfully added ICE candidate");
        } catch (error) {
          console.error("Failed to add ICE candidate:", error);
        }
      }
    };

    // Handle call ended by peer
    const handleCallEnded = (data: any) => {
      if (activeCall && data.callId === activeCall.id) {
        closeAllConnections();
        
        setActiveCall(prev => {
          if (!prev) return null;
          return { ...prev, status: 'ended' };
        });
        
        toast({
          title: "Call Ended",
          description: "The call has been ended by the other participant.",
        });
        
        // Reset call state after a brief delay
        setTimeout(() => {
          setActiveCall(null);
        }, 2000);
      }
    };

    // Handle call failed
    const handleCallFailed = (data: any) => {
      if (activeCall && data.callId === activeCall.id) {
        closeAllConnections();
        
        setActiveCall(null);
        setIsCallLoading(false);
        
        toast({
          title: "Call Failed",
          description: data.reason || "Failed to establish call",
          variant: "destructive",
        });
      }
    };

    // Register event handlers
    addEventListener("call_incoming", handleIncomingCall);
    addEventListener("call_answered", handleCallAnswered);
    addEventListener("call_ice_candidate", handleIceCandidateReceived);
    addEventListener("call_ended", handleCallEnded);
    addEventListener("call_failed", handleCallFailed);

    // Cleanup event listeners
    return () => {
      removeEventListener("call_incoming", handleIncomingCall);
      removeEventListener("call_answered", handleCallAnswered);
      removeEventListener("call_ice_candidate", handleIceCandidateReceived);
      removeEventListener("call_ended", handleCallEnded);
      removeEventListener("call_failed", handleCallFailed);
    };
  }, [toast, activeCall]);

  // Start a call with a user
  const startCall = async (userId: number, callType: 'video' | 'audio') => {
    try {
      // Immediately set up a minimal active call state to show UI
      // even before full initialization completes
      console.log(`[Call] Starting ${callType} call with user ${userId}`);
      
      setActiveCall({
        id: -1, // Temporary ID until we get the real one
        peerId: userId,
        peerName: "Connecting...", // Will be updated with real name
        isRoom: false,
        callType,
        startTime: new Date(),
        status: 'connecting',
        localStream: null, // Will be updated with real stream
        remoteStreams: new Map(),
        audioEnabled: true,
        videoEnabled: callType === 'video',
        isMuted: false,
      });
      
      setIsCallLoading(true);
      
      // Initialize local media with portrait mode for video calls
      console.log(`[Call] Initializing local media for ${callType} call with portrait mode`);
      const localStream = await initializeLocalMedia({
        audio: true,
        video: callType === 'video',
      }, callType === 'video');
      console.log(`[Call] Local media initialized successfully`);
      
      // Update active call with local stream
      setActiveCall(prev => {
        if (!prev) return null;
        return {
          ...prev,
          localStream,
        };
      });
      
      // Create offer
      console.log(`[Call] Creating ${callType} call offer for user ${userId}`);
      const offer = await createOffer(userId);
      console.log(`[Call] Created ${callType} call offer for user ${userId}`);
      
      // Send offer to peer
      console.log(`[Call] Sending ${callType} call offer to user ${userId}`);
      sendCallOffer(userId, false, JSON.stringify(offer), callType);
      
      // Register one-time handler for call initiated
      console.log(`[Call] Registering one-time handler for call initiated event`);
      const handleCallInitiated = (data: any) => {
        console.log(`[Call] Call initiated event received:`, data);
        
        // Update with official call details
        setActiveCall(prev => {
          if (!prev) return null;
          return {
            ...prev,
            id: data.callId,
            peerName: data.peerName || "Unknown User",
          };
        });
        
        console.log(`[Call] Active call state updated with official call ID and peer name`);
        setIsCallLoading(false);
        removeEventListener("call_initiated", handleCallInitiated);
      };
      
      addEventListener("call_initiated", handleCallInitiated);
    } catch (error) {
      console.error("[Call] Error starting call:", error);
      setActiveCall(null);
      setIsCallLoading(false);
      toast({
        title: "Call Error",
        description: "Failed to access media devices. Please check your camera and microphone permissions.",
        variant: "destructive",
      });
    }
  };

  // Start a call in a room
  const startRoomCall = async (roomId: number, roomName: string, callType: 'video' | 'audio') => {
    try {
      // ENHANCED DEBUGGING: Add more detailed logs for video calls
      if (callType === 'video') {
        console.log(`[Call] 🎥 Starting VIDEO room call with room ${roomId} - ASSERTING VIDEO MODE`);
        console.log(`[Call] 📊 Call diagnostics - Room ID: ${roomId}, Call Type: ${callType}`);
      } else {
        console.log(`[Call] Starting ${callType} room call with room ${roomId}`);
      }
      
      // Immediately set up a minimal active call state to show UI
      // even before full initialization completes
      setActiveCall({
        id: -1, // Temporary ID until we get the real one
        peerId: -1, // Room calls don't have a single peer ID
        peerName: roomName || "Group Call",
        isRoom: true,
        roomId,
        roomName: roomName || "Group Call",
        callType, // This is critical for determining call type
        startTime: new Date(),
        status: 'connecting', // We use status for call state tracking
        localStream: null, // Will be updated with real stream
        remoteStreams: new Map(),
        audioEnabled: true,
        videoEnabled: callType === 'video', // Ensure this is set correctly based on call type
        isMuted: false,
      });
      
      setIsCallLoading(true);
      
      // Initialize local media with portrait mode for video calls
      console.log(`[Call] Initializing local media for ${callType} room call with portrait mode=${callType === 'video'}`);
      
      // CRITICAL FIX: Ensure proper video configuration for group video calls
      const mediaConfig = {
        audio: true,
        // This must be true for video calls and false for audio-only calls
        video: callType === 'video'
      };
      
      if (callType === 'video') {
        console.log(`[Call] 🎥 VIDEO CALL: Explicitly enabling video in media configuration`, mediaConfig);
      }
      
      // Pass the portrait mode flag as true for video calls to ensure 9:16 aspect ratio
      const localStream = await initializeLocalMedia(
        mediaConfig, 
        callType === 'video' // portraitMode=true for video calls
      );
      
      // Verify we got video tracks for video calls
      if (callType === 'video') {
        let videoTracks = localStream.getVideoTracks();
        console.log(`[Call] 🎥 Video tracks obtained: ${videoTracks.length}`);
        
        // If no video tracks, try to create a fallback
        if (videoTracks.length === 0) {
          console.warn(`[Call] 🎥 ⚠️ No video tracks found in stream for video call! Adding fallback...`);
          
          try {
            // Try one more time to get access to camera
            console.log(`[Call] 🎥 Attempting to get camera access directly`);
            const videoStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 720 },
                height: { ideal: 1280 },
                aspectRatio: { ideal: 9/16 },
                facingMode: 'user'
              }
            });
            
            // Add these tracks to our existing stream
            const newVideoTracks = videoStream.getVideoTracks();
            newVideoTracks.forEach(track => {
              console.log(`[Call] 🎥 Adding video track ${track.id} to localStream`);
              localStream.addTrack(track);
            });
            
            // Update our tracks list
            videoTracks = localStream.getVideoTracks();
            console.log(`[Call] 🎥 After direct camera access: ${videoTracks.length} video tracks`);
          } catch (cameraError) {
            console.error(`[Call] 🎥 Failed to get camera access:`, cameraError);
            
            // Create a fallback canvas video track
            try {
              console.log(`[Call] 🎥 Creating fallback canvas video track`);
              const canvas = document.createElement('canvas');
              canvas.width = 720;
              canvas.height = 1280;
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                // Draw a placeholder image
                ctx.fillStyle = '#2a3b4c'; // Dark blue background
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Add military-style header
                ctx.fillStyle = '#3f704d'; // Military green
                ctx.fillRect(0, 0, canvas.width, 80);
                
                // Add text
                ctx.font = 'bold 28px sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText('TACTICAL VIDEO FEED', canvas.width/2, 50);
                
                // Create message
                ctx.font = '24px sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('Camera Access Unavailable', canvas.width/2, canvas.height/2 - 20);
                ctx.fillText('Using Fallback Feed', canvas.width/2, canvas.height/2 + 20);
                
                // Add a frame
                ctx.strokeStyle = '#3f704d';
                ctx.lineWidth = 10;
                ctx.strokeRect(20, 100, canvas.width - 40, canvas.height - 120);
                
                // Create a video track from the canvas
                // @ts-ignore - captureStream might not be fully typed
                const canvasStream = canvas.captureStream(15); // 15 fps
                const canvasTrack = canvasStream.getVideoTracks()[0];
                
                if (canvasTrack) {
                  console.log(`[Call] 🎥 Adding canvas fallback video track to localStream`);
                  localStream.addTrack(canvasTrack);
                  
                  // Update our tracks list
                  videoTracks = localStream.getVideoTracks();
                  console.log(`[Call] 🎥 After canvas fallback: ${videoTracks.length} video tracks`);
                }
              }
            } catch (canvasError) {
              console.error(`[Call] 🎥 Failed to create canvas fallback:`, canvasError);
            }
          }
        }
        
        // Now ensure all video tracks are enabled
        if (videoTracks.length > 0) {
          console.log(`[Call] 🎥 ✓ Video tracks available - enabling all ${videoTracks.length} tracks`);
          videoTracks.forEach(track => {
            track.enabled = true;
            console.log(`[Call] 🎥 Enabled video track: ${track.id} (${track.label})`);
          });
        } else {
          console.error(`[Call] 🎥 ❌ Could not obtain any video tracks for video call despite attempts!`);
        }
      }
      
      console.log(`[Call] Local media initialized successfully for room call`);
      
      // Update active call with local stream
      setActiveCall(prev => {
        if (!prev) return null;
        return {
          ...prev,
          localStream,
        };
      });
      
      // Create offers (will be done once peers join the call)
      // For now, just send initial offer to the room
      const dummyOffer = { type: 'offer', sdp: '' };
      console.log(`[Call] Created dummy ${callType} call offer for room ${roomId}`);
      
      // Send offer to room
      console.log(`[Call] Sending ${callType} call offer to room ${roomId}`);
      sendCallOffer(roomId, true, JSON.stringify(dummyOffer), callType);
      
      // Register one-time handler for call initiated
      console.log(`[Call] Registering one-time handler for room call initiated event`);
      const handleCallInitiated = (data: any) => {
        console.log(`[Call] Room call initiated event received:`, data);
        
        // Update with official call details
        setActiveCall(prev => {
          if (!prev) return null;
          return {
            ...prev,
            id: data.callId,
          };
        });
        
        console.log(`[Call] Active room call state updated with official call ID`);
        setIsCallLoading(false);
        removeEventListener("call_initiated", handleCallInitiated);
      };
      
      addEventListener("call_initiated", handleCallInitiated);
    } catch (error) {
      console.error("[Call] Error starting room call:", error);
      setActiveCall(null);
      setIsCallLoading(false);
      toast({
        title: "Call Error",
        description: "Failed to access media devices. Please check your camera and microphone permissions.",
        variant: "destructive",
      });
    }
  };

  // Answer an incoming call
  const answerCall = async () => {
    if (!incomingCall) return;
    
    try {
      setIsCallLoading(true);
      
      // Initialize local media with portrait mode for video calls
      const localStream = await initializeLocalMedia({
        audio: true,
        video: incomingCall.callType === 'video',
      }, incomingCall.callType === 'video');
      
      // Create answer
      console.log(`Creating ${incomingCall.callType} call answer for call ${incomingCall.id}`);
      const parsedSdp = typeof incomingCall.sdp === 'string' ? JSON.parse(incomingCall.sdp) : incomingCall.sdp;
      const answer = await handleOffer(incomingCall.callerId, parsedSdp);
      
      // Send answer
      console.log(`Sending ${incomingCall.callType} call answer to call ${incomingCall.id}`);
      sendCallAnswer(incomingCall.id, JSON.stringify(answer), incomingCall.callType);
      
      // Update state
      setActiveCall({
        id: incomingCall.id,
        peerId: incomingCall.callerId,
        peerName: incomingCall.callerName,
        isRoom: incomingCall.isRoom,
        roomId: incomingCall.roomId,
        roomName: incomingCall.roomName,
        callType: incomingCall.callType,
        startTime: new Date(),
        status: 'connecting',
        localStream,
        remoteStreams: new Map(),
        audioEnabled: true,
        videoEnabled: incomingCall.callType === 'video',
        isMuted: false,
      });
      
      setIncomingCall(null);
      setIsCallLoading(false);
    } catch (error) {
      setIsCallLoading(false);
      toast({
        title: "Call Error",
        description: "Failed to access media devices. Please check your camera and microphone permissions.",
        variant: "destructive",
      });
    }
  };

  // Reject an incoming call
  const rejectCall = () => {
    if (!incomingCall) return;
    
    endCall(incomingCall.id, incomingCall.callType);
    setIncomingCall(null);
  };

  // End the active call
  const hangupCall = () => {
    if (!activeCall) return;
    
    endCall(activeCall.id, activeCall.callType);
    closeAllConnections();
    
    setActiveCall(prev => {
      if (!prev) return null;
      return { ...prev, status: 'ended' };
    });
    
    // Reset call state after a brief delay
    setTimeout(() => {
      setActiveCall(null);
    }, 1000);
  };

  // Toggle audio in call
  const toggleCallAudio = () => {
    if (!activeCall) return;
    
    const newState = !activeCall.audioEnabled;
    toggleAudio(newState);
    
    setActiveCall({
      ...activeCall,
      audioEnabled: newState,
    });
  };

  // Toggle video in call
  const toggleCallVideo = () => {
    if (!activeCall) return;
    
    const newState = !activeCall.videoEnabled;
    toggleVideo(newState);
    
    setActiveCall({
      ...activeCall,
      videoEnabled: newState,
    });
  };

  // Toggle mute (audio output)
  const toggleMute = () => {
    if (!activeCall) return;
    
    setActiveCall({
      ...activeCall,
      isMuted: !activeCall.isMuted,
    });
  };

  // Switch camera (preserving portrait mode)
  const switchCallCamera = async () => {
    if (!activeCall) return;
    
    try {
      // Pass true to maintain portrait mode (9:16) when switching cameras
      await switchCamera(true);
    } catch (error) {
      console.error("Error switching camera:", error);
      toast({
        title: "Camera Error",
        description: "Failed to switch camera.",
        variant: "destructive",
      });
    }
  };

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        activeCall,
        isCallLoading,
        startCall,
        startRoomCall,
        answerCall,
        rejectCall,
        hangupCall,
        toggleCallAudio,
        toggleCallVideo,
        toggleMute,
        switchCallCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

// Hook has been moved to useCall.ts

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

// Utility function to check mobile device compatibility
const checkMobileCompatibility = () => {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isHTTPS = location.protocol === 'https:';
  const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  
  console.log('[CallContext] Mobile compatibility check:', {
    isMobile,
    isHTTPS,
    hasMediaDevices,
    userAgent: navigator.userAgent
  });
  
  return { isMobile, isHTTPS, hasMediaDevices };
};

// Function to get mobile-specific error message
const getMobileErrorMessage = (error: any) => {
  const { isMobile, isHTTPS, hasMediaDevices } = checkMobileCompatibility();
  
  let message = 'Gagal memulai panggilan. ';
  
  if (!hasMediaDevices) {
    message += 'Browser Anda tidak mendukung fitur media. Gunakan Chrome, Firefox, atau Safari terbaru.';
    return message;
  }
  
  if (isMobile && !isHTTPS) {
    message += 'Untuk keamanan, gunakan HTTPS (https://) di mobile device.';
    return message;
  }
  
  switch (error.name) {
    case 'NotAllowedError':
      if (isMobile) {
        message += 'Di mobile: Buka Settings browser → Site permissions → Camera/Microphone → Izinkan untuk situs ini. Lalu refresh halaman.';
      } else {
        message += 'Klik ikon kamera/microphone di address bar dan pilih "Allow".';
      }
      break;
    case 'NotFoundError':
      message += isMobile 
        ? 'Pastikan microphone dan camera tidak sedang digunakan aplikasi lain di HP Anda.'
        : 'Periksa apakah microphone dan camera terhubung dengan benar.';
      break;
    case 'NotSupportedError':
      message += isMobile
        ? 'Gunakan Chrome atau Firefox terbaru di mobile device Anda.'
        : 'Browser tidak mendukung WebRTC. Gunakan Chrome atau Firefox.';
      break;
    case 'NotReadableError':
      message += 'Microphone/camera sedang digunakan aplikasi lain. Tutup aplikasi tersebut dan coba lagi.';
      break;
    default:
      message += isMobile
        ? 'Pastikan browser mendukung WebRTC dan permission media diizinkan.'
        : 'Periksa koneksi microphone dan camera.';
  }
  
  return message;
};

interface CallState {
  callId?: string;
  callType: 'audio' | 'video';
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  isIncoming: boolean;
  peerUserId?: number;
  peerName?: string;
  localStream?: MediaStream;
  remoteStreams: Map<number, MediaStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isMuted: boolean;
  startTime?: Date;
}

interface CallContextType {
  activeCall: CallState | null;
  incomingCall: CallState | null;
  startCall: (peerUserId: number, peerName: string, callType: 'audio' | 'video') => void;
  acceptCall: () => void;
  rejectCall: () => void;
  hangupCall: () => void;
  toggleCallAudio: () => void;
  toggleCallVideo: () => void;
  toggleMute: () => void;
  switchCallCamera: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallState | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Simple WebSocket connection for calls - just like in Chat.tsx
  useEffect(() => {
    if (!user) return;

    console.log('[CallContext] Initializing WebSocket for calls...');
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('[CallContext] WebSocket connected successfully for calls');
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[CallContext] Received message:', message);
        
        // Handle call-specific messages
        switch (message.type) {
          case 'incoming_call':
            handleIncomingCall(message);
            break;
          case 'call_accepted':
            handleCallAccepted(message);
            break;
          case 'call_rejected':
            handleCallRejected(message);
            break;
          case 'call_ended':
            handleCallEnded(message);
            break;
          case 'webrtc_offer':
            handleWebRTCOffer(message);
            break;
          case 'webrtc_answer':
            handleWebRTCAnswer(message);
            break;
          case 'webrtc_ice_candidate':
            handleWebRTCIceCandidate(message);
            break;
        }
      } catch (error) {
        // Ignore non-JSON messages (they might be for chat)
      }
    };

    websocket.onclose = () => {
      console.log('[CallContext] WebSocket disconnected');
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('[CallContext] WebSocket error:', error);
      setWs(null);
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
        websocket.close();
      }
    };
  }, [user]);

  const handleIncomingCall = (message: any) => {
    console.log('[CallContext] Incoming call from:', message.fromUserName);
    setIncomingCall({
      callId: message.callId,
      callType: message.callType,
      status: 'ringing',
      isIncoming: true,
      peerUserId: message.fromUserId,
      peerName: message.fromUserName,
      remoteStreams: new Map(),
      audioEnabled: true,
      videoEnabled: message.callType === 'video',
      isMuted: false,
    });
  };

  const handleCallAccepted = (message: any) => {
    console.log('[CallContext] Call accepted');
    if (activeCall) {
      setActiveCall({
        ...activeCall,
        status: 'connected',
        startTime: new Date(),
      });
    }
  };

  const handleCallRejected = (message: any) => {
    console.log('[CallContext] Call rejected');
    setActiveCall(null);
    alert('Panggilan ditolak');
  };

  const handleCallEnded = (message: any) => {
    console.log('[CallContext] Call ended');
    setActiveCall(null);
    setIncomingCall(null);
    
    // Clean up media streams
    if (activeCall?.localStream) {
      activeCall.localStream.getTracks().forEach(track => track.stop());
    }
  };

  const handleWebRTCOffer = (message: any) => {
    console.log('[CallContext] Received WebRTC offer');
    // TODO: Implement WebRTC offer handling
  };

  const handleWebRTCAnswer = (message: any) => {
    console.log('[CallContext] Received WebRTC answer');
    // TODO: Implement WebRTC answer handling
  };

  const handleWebRTCIceCandidate = (message: any) => {
    console.log('[CallContext] Received ICE candidate');
    // TODO: Implement ICE candidate handling
  };

  const startCall = async (peerUserId: number, peerName: string, callType: 'audio' | 'video') => {
    if (!user) {
      console.error('[CallContext] User not available');
      alert('User tidak tersedia. Silakan login ulang.');
      return;
    }

    // Enhanced WebSocket check with simple retry
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('[CallContext] WebSocket not connected, please refresh page');
      alert('Koneksi terputus. Refresh halaman (F5) dan coba lagi.');
      return;
    }

    console.log(`[CallContext] Starting ${callType} call to:`, peerName);
    
    // Check mobile compatibility first
    const { isMobile, isHTTPS, hasMediaDevices } = checkMobileCompatibility();
    
    if (!hasMediaDevices) {
      alert('Browser Anda tidak mendukung akses media. Gunakan Chrome atau Safari terbaru.');
      return;
    }

    try {
      // Ultra-simple constraints for maximum mobile compatibility
      let constraints;
      if (callType === 'video') {
        constraints = { 
          audio: true, 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        };
      } else {
        constraints = { audio: true };
      }

      console.log('[CallContext] Requesting media permissions with mobile-optimized constraints:', constraints);
      console.log('[CallContext] Device info:', { isMobile, isHTTPS, hasMediaDevices });
      
      // Try to get media stream with better error handling
      const localStream = await navigator.mediaDevices.getUserMedia(constraints).catch(async (error) => {
        console.error('[CallContext] Failed with optimized constraints, trying fallback:', error);
        
        // Fallback to most basic constraints
        const fallbackConstraints = callType === 'video' 
          ? { audio: true, video: true }
          : { audio: true };
          
        return await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      });
      console.log('[CallContext] ✅ Successfully got media stream:', {
        audioTracks: localStream.getAudioTracks().length,
        videoTracks: localStream.getVideoTracks().length
      });

      const callId = `call_${Date.now()}_${user.id}_${peerUserId}`;

      const newCall: CallState = {
        callId,
        callType,
        status: 'calling',
        isIncoming: false,
        peerUserId,
        peerName,
        localStream,
        remoteStreams: new Map(),
        audioEnabled: true,
        videoEnabled: callType === 'video',
        isMuted: false,
      };

      setActiveCall(newCall);

      // Send call initiation message (ws is guaranteed to be connected at this point)
      ws!.send(JSON.stringify({
        type: 'initiate_call',
        callId,
        toUserId: peerUserId,
        callType,
        fromUserId: user.id,
        fromUserName: user.callsign,
      }));

      // Navigate to call interface with a small delay to ensure state is set
      setTimeout(() => {
        setLocation(callType === 'video' ? '/video-call' : '/audio-call');
      }, 100);

    } catch (error: any) {
      console.error('[CallContext] Error starting call:', error);
      alert(getMobileErrorMessage(error));
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !ws || !user) {
      console.error('[CallContext] No incoming call or WebSocket not connected');
      return;
    }

    console.log('[CallContext] Accepting call');

    try {
      // Enhanced mobile-friendly media constraints for accepting calls
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: incomingCall.callType === 'video' ? {
          facingMode: 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 }
        } : false
      };

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported on this browser');
      }

      console.log('[CallContext] Requesting media permissions for mobile (accept call)...');
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[CallContext] Got local media stream for incoming call');

      // Accept the call
      setActiveCall({
        ...incomingCall,
        status: 'connected',
        localStream,
        startTime: new Date(),
      });

      setIncomingCall(null);

      // Send call acceptance message
      ws.send(JSON.stringify({
        type: 'accept_call',
        callId: incomingCall.callId,
        toUserId: incomingCall.peerUserId,
        fromUserId: user.id,
      }));

      // Navigate to call interface with a small delay to ensure state is set
      setTimeout(() => {
        setLocation(incomingCall.callType === 'video' ? '/video-call' : '/audio-call');
      }, 100);

    } catch (error: any) {
      console.error('[CallContext] Error accepting call:', error);
      alert(getMobileErrorMessage(error).replace('Gagal memulai panggilan', 'Gagal menerima panggilan'));
    }
  };

  const rejectCall = () => {
    if (!incomingCall || !ws || !user) {
      console.error('[CallContext] No incoming call or WebSocket not connected');
      return;
    }

    console.log('[CallContext] Rejecting call');

    // Send call rejection message
    ws.send(JSON.stringify({
      type: 'reject_call',
      callId: incomingCall.callId,
      toUserId: incomingCall.peerUserId,
      fromUserId: user.id,
    }));

    setIncomingCall(null);
  };

  const hangupCall = () => {
    console.log('[CallContext] Hanging up call - start');
    
    try {
      // Stop local media stream safely
      if (activeCall?.localStream) {
        console.log('[CallContext] Stopping media tracks');
        activeCall.localStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            console.warn('[CallContext] Error stopping track:', err);
          }
        });
      }

      // Send call end message safely
      if (ws && ws.readyState === WebSocket.OPEN && activeCall && user) {
        try {
          ws.send(JSON.stringify({
            type: 'end_call',
            callId: activeCall.callId,
            toUserId: activeCall.peerUserId,
            fromUserId: user.id,
          }));
        } catch (err) {
          console.warn('[CallContext] Error sending end call message:', err);
        }
      }

      // Clear call state
      setActiveCall(null);
      
      console.log('[CallContext] Call ended successfully, staying on current page');
      
    } catch (error) {
      console.error('[CallContext] Error during hangup:', error);
      // Still clear the call state even if there's an error
      setActiveCall(null);
    }
  };

  const toggleCallAudio = () => {
    if (!activeCall?.localStream) return;

    const audioTrack = activeCall.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setActiveCall({
        ...activeCall,
        audioEnabled: audioTrack.enabled,
      });
    }
  };

  const toggleCallVideo = () => {
    if (!activeCall?.localStream) return;

    const videoTrack = activeCall.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setActiveCall({
        ...activeCall,
        videoEnabled: videoTrack.enabled,
      });
    }
  };

  const toggleMute = () => {
    if (!activeCall?.localStream) return;

    const audioTrack = activeCall.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !activeCall.isMuted;
      setActiveCall({
        ...activeCall,
        isMuted: !activeCall.isMuted,
      });
    }
  };

  const switchCallCamera = async () => {
    if (!activeCall?.localStream || activeCall.callType !== 'video') return;

    try {
      // Get video track
      const videoTrack = activeCall.localStream.getVideoTracks()[0];
      if (!videoTrack) return;

      // Stop current video track
      videoTrack.stop();

      // Get new video stream with different camera
      const constraints = {
        audio: false,
        video: {
          facingMode: videoTrack.getSettings().facingMode === 'user' ? 'environment' : 'user'
        }
      };

      const newVideoStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newVideoStream.getVideoTracks()[0];

      // Replace video track in local stream
      const sender = activeCall.localStream.getVideoTracks()[0];
      if (sender) {
        activeCall.localStream.removeTrack(sender);
        activeCall.localStream.addTrack(newVideoTrack);
      }

    } catch (error) {
      console.error('[CallContext] Error switching camera:', error);
    }
  };

  return (
    <CallContext.Provider value={{
      activeCall,
      incomingCall,
      startCall,
      acceptCall,
      rejectCall,
      hangupCall,
      toggleCallAudio,
      toggleCallVideo,
      toggleMute,
      switchCallCamera,
    }}>
      {children}
    </CallContext.Provider>
  );
}

export { CallContext };
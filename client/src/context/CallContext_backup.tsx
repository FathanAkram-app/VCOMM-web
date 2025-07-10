import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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

interface CallState {
  callId?: string;
  callType: 'audio' | 'video';
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  isIncoming: boolean;
  peerUserId?: number;
  peerName?: string;
  localStream?: MediaStream;
  remoteStreams: Map<number, MediaStream>;
  peerConnection?: RTCPeerConnection;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isMuted: boolean;
  startTime?: Date;
  // Group call specific fields
  isGroupCall?: boolean;
  groupId?: number;
  groupName?: string;
  participants?: Array<{
    userId: number;
    userName: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
    stream: MediaStream | null;
  }>;
}

interface CallContextType {
  activeCall: CallState | null;
  incomingCall: CallState | null;
  remoteAudioStream: MediaStream | null;
  ws: WebSocket | null;
  startCall: (peerUserId: number, peerName: string, callType: 'audio' | 'video') => void;
  startGroupCall: (groupId: number, groupName: string, callType: 'audio' | 'video') => void;
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
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallState | null>(null);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [ringtoneAudio, setRingtoneAudio] = useState<HTMLAudioElement | null>(null);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Use refs to maintain access to current values in event handlers
  const activeCallRef = useRef<CallState | null>(null);
  const incomingCallRef = useRef<CallState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingOffers = useRef<Map<string, any>>(new Map());
  const pendingIceCandidates = useRef<Map<string, any[]>>(new Map());

  // Function to play notification sound (from Chat.tsx)
  const playNotificationSound = async () => {
    try {
      // Buat audio context untuk notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context jika suspended (required by modern browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Buat double beep notification yang lebih jelas
      const playBeep = (frequency: number, startTime: number, duration: number, volume: number = 0.15) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Gunakan sine wave untuk suara yang lebih lembut
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        // Envelope untuk attack dan release yang smooth
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + duration - 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Double beep pattern: tinggi-rendah untuk notifikasi yang mudah dikenali
      const currentTime = audioContext.currentTime;
      playBeep(880, currentTime, 0.12, 0.25);      // Beep pertama (A5 note)
      playBeep(659, currentTime + 0.18, 0.12, 0.25); // Beep kedua (E5 note)
      
      console.log('[CallContext] Notification sound played');
    } catch (error) {
      console.log('[CallContext] Could not play notification sound:', error);
      
      // Fallback: try simple HTML5 audio beep
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2+LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUfCCyBzvLZiTYIG2m99+OZSA0PUKjk7bZiFgU2k9n0y3QtCCl+zO/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq9+OOaRw0NUarg7rhpGAU9k9n01XMuCCl9y+/eizEJHWq7');
        audio.play().catch(e => console.log("Autoplay prevented:", e));
      } catch (error) {
        console.error("Error playing notification sound:", error);
      }
    }
  };

  // WebSocket connection setup
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('[CallContext] WebSocket connected successfully for calls');
      setWs(websocket);
      wsRef.current = websocket;
      
      // Send authentication message
      websocket.send(JSON.stringify({
        type: 'auth',
        userId: user.id,
        callsign: user.callsign
      }));
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('[CallContext] Received message:', message);

      if (message.type === 'incoming_call') {
        console.log('[CallContext] Incoming call from:', message.fromUserName);
        
        // Play notification sound for incoming call
        playNotificationSound();
        
        const newCall: CallState = {
          callId: message.callId,
          callType: message.callType,
          status: 'ringing',
          isIncoming: true,
          peerUserId: message.fromUserId,
          peerName: message.fromUserName,
          localStream: undefined,
          remoteStreams: new Map(),
          peerConnection: undefined,
          audioEnabled: true,
          videoEnabled: message.callType === 'video',
          isMuted: false,
          startTime: new Date(),
          isGroupCall: false
        };
        
        setIncomingCall(newCall);
      } else if (message.type === 'incoming_group_call') {
        console.log('[CallContext] Incoming group call received:', message.payload);
        
        // Play notification sound for incoming group call
        playNotificationSound();
        
        const groupCallState: CallState = {
          callId: message.payload.callId,
          callType: message.payload.callType,
          status: 'ringing',
          isIncoming: true,
          peerUserId: message.payload.fromUserId,
          peerName: message.payload.fromUserName,
          localStream: undefined,
          remoteStreams: new Map(),
          peerConnection: undefined,
          audioEnabled: true,
          videoEnabled: message.payload.callType === 'video',
          isMuted: false,
          startTime: new Date(),
          isGroupCall: true,
          groupId: message.payload.groupId,
          groupName: message.payload.groupName,
          participants: []
        };
        
        setIncomingCall(groupCallState);
      } else if (message.type === 'call_rejected') {
        console.log('[CallContext] Call rejected');
        setActiveCall(null);
        setIncomingCall(null);
      } else if (message.type === 'call_ended') {
        console.log('[CallContext] Call ended');
        setActiveCall(null);
        setIncomingCall(null);
      }
    };

    websocket.onclose = () => {
      console.log('[CallContext] WebSocket disconnected');
      setWs(null);
      wsRef.current = null;
    };

    websocket.onerror = (error) => {
      console.error('[CallContext] WebSocket error:', error);
    };

    return () => {
      websocket.close();
    };
  }, [user]);

  // Keep refs in sync with state
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  const startCall = (peerUserId: number, peerName: string, callType: 'audio' | 'video') => {
    if (!ws || !user) return;

    const callId = `call_${Date.now()}_${user.id}_${peerUserId}`;
    
    const newCall: CallState = {
      callId,
      callType,
      status: 'calling',
      isIncoming: false,
      peerUserId,
      peerName,
      localStream: undefined,
      remoteStreams: new Map(),
      peerConnection: undefined,
      audioEnabled: true,
      videoEnabled: callType === 'video',
      isMuted: false,
      startTime: new Date(),
      isGroupCall: false
    };

    setActiveCall(newCall);

    // Send call initiation message
    ws.send(JSON.stringify({
      type: 'call_user',
      callId,
      targetUserId: peerUserId,
      callType,
      fromUserId: user.id,
      fromUserName: user.callsign || user.fullName
    }));

    console.log('[CallContext] Starting call to:', peerName);
  };

  const startGroupCall = (groupId: number, groupName: string, callType: 'audio' | 'video') => {
    if (!ws || !user) return;

    const callId = `group_call_${Date.now()}_${groupId}_${user.id}`;
    
    const groupCallState: CallState = {
      callId,
      callType,
      status: 'calling',
      isIncoming: false,
      localStream: undefined,
      remoteStreams: new Map(),
      peerConnection: undefined,
      audioEnabled: true,
      videoEnabled: callType === 'video',
      isMuted: false,
      startTime: new Date(),
      isGroupCall: true,
      groupId,
      groupName,
      participants: []
    };

    setActiveCall(groupCallState);

    // Send group call initiation message
    ws.send(JSON.stringify({
      type: 'start_group_call',
      callId,
      groupId,
      groupName,
      callType,
      fromUserId: user.id,
      fromUserName: user.callsign || user.fullName
    }));

    console.log('[CallContext] Starting group call:', groupName);
  };

  const acceptCall = () => {
    if (!incomingCall || !ws) return;

    setActiveCall(incomingCall);
    setIncomingCall(null);

    // Send acceptance message
    ws.send(JSON.stringify({
      type: 'accept_call',
      callId: incomingCall.callId,
      acceptedBy: user?.id
    }));

    console.log('[CallContext] Accepted call:', incomingCall.callId);
  };

  const rejectCall = () => {
    if (!incomingCall || !ws) return;

    // Send rejection message
    ws.send(JSON.stringify({
      type: 'reject_call',
      callId: incomingCall.callId,
      rejectedBy: user?.id
    }));

    setIncomingCall(null);
    console.log('[CallContext] Rejected call:', incomingCall.callId);
  };

  const hangupCall = () => {
    if (!activeCall || !ws) return;

    // Send hangup message
    ws.send(JSON.stringify({
      type: 'end_call',
      callId: activeCall.callId,
      endedBy: user?.id
    }));

    setActiveCall(null);
    setIncomingCall(null);
    console.log('[CallContext] Hung up call:', activeCall.callId);
  };

  const toggleCallAudio = () => {
    if (!activeCall) return;
    
    setActiveCall(prev => prev ? {
      ...prev,
      audioEnabled: !prev.audioEnabled
    } : null);
  };

  const toggleCallVideo = () => {
    if (!activeCall) return;
    
    setActiveCall(prev => prev ? {
      ...prev,
      videoEnabled: !prev.videoEnabled
    } : null);
  };

  const toggleMute = () => {
    if (!activeCall) return;
    
    setActiveCall(prev => prev ? {
      ...prev,
      isMuted: !prev.isMuted
    } : null);
  };

  const switchCallCamera = () => {
    // Implementation for camera switching
    console.log('[CallContext] Switch camera requested');
  };

  return (
    <CallContext.Provider value={{
      activeCall,
      incomingCall,
      remoteAudioStream,
      ws,
      startCall,
      startGroupCall,
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
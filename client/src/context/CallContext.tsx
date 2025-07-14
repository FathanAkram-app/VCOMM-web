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
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallState | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [ringtoneAudio, setRingtoneAudio] = useState<HTMLAudioElement | null>(null);
  const [waitingToneInterval, setWaitingToneInterval] = useState<NodeJS.Timeout | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  // Add ref for pending participant updates
  const pendingParticipantUpdatesRef = useRef<Array<{type: string, payload: any}>>([]);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  
  // Audio notification function for new messages
  const playNewMessageSound = async () => {
    console.log('[CallContext] 🔊 Attempting to play new message sound');
    
    try {
      // Method 1: Web Audio API (most reliable)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Create a simple beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // High-low double beep pattern
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      console.log('[CallContext] ✅ Audio notification played successfully');
      
    } catch (error) {
      console.log('[CallContext] ❌ Web Audio API failed, trying HTML5 Audio fallback');
      
      try {
        // Method 2: HTML5 Audio fallback
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjqY4PCBEDTUJJjXe');
        audio.volume = 0.3;
        await audio.play();
        
        console.log('[CallContext] ✅ HTML5 Audio notification played successfully');
        
      } catch (audioError) {
        console.log('[CallContext] ❌ HTML5 Audio failed, trying browser notification');
        
        // Method 3: Browser notification as fallback
        if (Notification.permission === 'granted') {
          new Notification('New Message', {
            body: 'You have a new message',
            icon: '/icon-192x192.png'
          });
        }
        
        // Method 4: Vibration API as last resort (mobile)
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      }
    }
  };

  // Restore group call state from localStorage when on group-call page
  useEffect(() => {
    if (location === '/group-call' && !activeCall && user) {
      const storedCall = localStorage.getItem('activeGroupCall');
      if (storedCall) {
        try {
          const callData = JSON.parse(storedCall);
          console.log('[CallContext] Restoring group call state from localStorage:', callData);
          
          // Recreate the call state for group call page
          const restoredCall: CallState = {
            callId: callData.callId,
            callType: callData.callType,
            status: 'connected',
            isIncoming: false,
            localStream: undefined,
            remoteStreams: new Map(),
            audioEnabled: true,
            videoEnabled: callData.callType === 'video',
            isMuted: false,
            startTime: new Date(),
            isGroupCall: true,
            groupId: callData.groupId,
            groupName: callData.groupName,
            participants: []
          };
          
          setActiveCall(restoredCall);
          console.log('[CallContext] Group call state restored successfully');
        } catch (error) {
          console.error('[CallContext] Error restoring group call state:', error);
          localStorage.removeItem('activeGroupCall');
        }
      }
    }
  }, [location, activeCall, user]);

  // Message handler function for WebSocket messages
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'incoming_call':
        handleIncomingCall(message);
        break;
      case 'incoming_group_call':
        handleIncomingGroupCall(message);
        break;
      case 'call_accepted':
        handleCallAccepted(message);
        break;
      case 'call_ended':
        handleCallEnded(message);
        break;
      case 'group_call_ended':
        handleGroupCallEnded(message);
        break;
      case 'group_call_user_left':
        handleGroupCallUserLeft(message);
        break;
      case 'group_call_participants_update':
        handleGroupCallParticipantsUpdate(message);
        break;
      case 'initiate_group_webrtc':
        handleInitiateGroupWebRTC(message);
        break;
      case 'group_call_no_participants':
        handleGroupCallNoParticipants(message);
        break;
      case 'webrtc_ready':
        handleWebRTCReady(message);
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
      default:
        // Ignore other message types (chat, user_status, etc.)
        break;
    }
  };
  
  // Use refs to store stable call state that won't be lost during re-renders
  const activeCallRef = useRef<CallState | null>(null);
  const incomingCallRef = useRef<CallState | null>(null);
  
  // Queue for ICE candidates that arrive before remote description is set
  const pendingIceCandidates = useRef<any[]>([]);
  
  // Queue for WebRTC offers that arrive before incoming call is created
  const pendingOffers = useRef<any[]>([]);

  // Function to aggressively stop all ringtones (using waiting tone pattern)
  const stopAllRingtones = () => {
    console.log('[CallContext] 🔇 STOPPING ALL RINGTONES - comprehensive cleanup');
    
    // Stop HTML5 ringtone audio - same pattern as waiting tone
    if (ringtoneAudio) {
      try {
        console.log('[CallContext] Stopping HTML5 ringtone audio');
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
        ringtoneAudio.volume = 0;
        ringtoneAudio.muted = true;
        ringtoneAudio.src = '';
        ringtoneAudio.srcObject = null;
        ringtoneAudio.load();
        setRingtoneAudio(null);
        console.log('[CallContext] ✅ HTML5 ringtone stopped and cleared');
      } catch (e) {
        console.log('[CallContext] Error stopping HTML5 ringtone:', e);
      }
    }
    
    // Stop current global ringtone reference (same pattern as oscillator)
    if ((window as any).__currentRingtone) {
      try {
        console.log('[CallContext] Force stopping current global ringtone');
        (window as any).__currentRingtone.pause();
        (window as any).__currentRingtone.currentTime = 0;
        (window as any).__currentRingtone.volume = 0;
        (window as any).__currentRingtone.muted = true;
        (window as any).__currentRingtone.src = '';
        (window as any).__currentRingtone.load();
        (window as any).__currentRingtone = null;
        console.log('[CallContext] ✅ Global ringtone reference stopped');
      } catch (e) {
        console.log('[CallContext] Global ringtone already stopped or error:', e);
      }
    }
    
    // Find and stop ALL audio elements playing ringtones
    try {
      const audioElements = document.querySelectorAll('audio');
      let stoppedCount = 0;
      audioElements.forEach((audio: HTMLAudioElement, index: number) => {
        // Stop any audio that's currently playing or has ringtone-related source
        if (!audio.paused || (audio.src && (audio.src.includes('ringtone') || audio.src.includes('ring')))) {
          console.log(`[CallContext] Force stopping audio element ${index}:`, audio.src || 'no src');
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0;
          audio.muted = true;
          audio.src = '';
          audio.srcObject = null;
          audio.load();
          stoppedCount++;
        }
      });
      console.log(`[CallContext] ✅ Stopped ${stoppedCount} audio elements`);
    } catch (e) {
      console.log('[CallContext] Error stopping audio elements:', e);
    }
    
    // Stop Web Audio API ringtone gain node (same pattern as waiting tone)
    if ((window as any).__currentRingtoneGainNode) {
      try {
        console.log('[CallContext] Force disconnecting current ringtone gain node');
        (window as any).__currentRingtoneGainNode.disconnect();
        (window as any).__currentRingtoneGainNode = null;
        console.log('[CallContext] ✅ Ringtone gain node disconnected');
      } catch (e) {
        console.log('[CallContext] Ringtone gain node already disconnected or error:', e);
      }
    }
    
    // Stop Web Audio API ringtone source (same pattern as waiting tone)
    if ((window as any).__ringtoneSource) {
      try {
        console.log('[CallContext] Force stopping ringtone source');
        (window as any).__ringtoneSource.stop();
        (window as any).__ringtoneSource.disconnect();
        (window as any).__ringtoneSource = null;
        console.log('[CallContext] ✅ Ringtone source stopped');
      } catch (e) {
        console.log('[CallContext] Ringtone source already stopped or error:', e);
      }
    }
    
    // Clear any ringtone-related intervals (same pattern as waiting tone)
    if ((window as any).__ringtoneIntervalId) {
      console.log('[CallContext] Clearing stored ringtone interval');
      clearInterval((window as any).__ringtoneIntervalId);
      (window as any).__ringtoneIntervalId = null;
    }
    
    // Clear any ringtone-related timeouts
    if ((window as any).__ringtoneTimeout) {
      clearTimeout((window as any).__ringtoneTimeout);
      (window as any).__ringtoneTimeout = null;
      console.log('[CallContext] ✅ Ringtone timeout cleared');
    }
    
    console.log('[CallContext] ✅ RINGTONE CLEANUP COMPLETED');
  };

  // Function to create waiting tone (tuuutt sound)
  const createWaitingTone = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    }
    return audioContext;
  };

  // Function to play waiting tone
  const playWaitingTone = () => {
    try {
      const ctx = createWaitingTone();
      
      // Create oscillator for the "tuuutt" sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Set frequency for waiting tone (400Hz - typical phone waiting tone)
      oscillator.frequency.value = 400;
      oscillator.type = 'sine';
      
      // Set volume
      gainNode.gain.value = 0.3;
      
      // Store oscillator globally for emergency cleanup
      (window as any).__currentOscillator = oscillator;
      (window as any).__currentGainNode = gainNode;
      
      // Start and stop the tone (0.8 seconds on, 0.8 seconds off)
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.8);
      
      // Clear references when oscillator ends
      oscillator.onended = () => {
        (window as any).__currentOscillator = null;
        (window as any).__currentGainNode = null;
      };
      
      console.log('[CallContext] Playing waiting tone - tuuutt');
    } catch (error) {
      console.error('[CallContext] Error playing waiting tone:', error);
    }
  };

  // Function to start waiting tone interval
  const startWaitingTone = () => {
    if (waitingToneInterval) {
      clearInterval(waitingToneInterval);
    }
    
    // Clear any existing global waiting tone interval
    if ((window as any).__waitingToneIntervalId) {
      clearInterval((window as any).__waitingToneIntervalId);
    }
    
    console.log('[CallContext] Starting waiting tone sequence');
    playWaitingTone(); // Play immediately
    
    // Then play every 2400ms (0.8s tone + 1.6s silence)
    const interval = setInterval(() => {
      playWaitingTone();
    }, 2400);
    
    setWaitingToneInterval(interval);
    // Store globally for emergency cleanup
    (window as any).__waitingToneIntervalId = interval;
  };

  // Function to stop waiting tone
  const stopWaitingTone = () => {
    console.log('[CallContext] 🔇 AGGRESSIVE AUDIO CLEANUP - STOPPING ALL AUDIO');
    
    // Clear the main waiting tone interval
    if (waitingToneInterval) {
      console.log('[CallContext] Clearing waiting tone interval');
      clearInterval(waitingToneInterval);
      setWaitingToneInterval(null);
    }
    
    // Stop current oscillator if playing
    if ((window as any).__currentOscillator) {
      try {
        console.log('[CallContext] Force stopping current oscillator');
        (window as any).__currentOscillator.stop();
        (window as any).__currentOscillator.disconnect();
        (window as any).__currentOscillator = null;
      } catch (e) {
        console.log('[CallContext] Oscillator already stopped or error:', e);
      }
    }
    
    // Disconnect current gain node
    if ((window as any).__currentGainNode) {
      try {
        console.log('[CallContext] Force disconnecting current gain node');
        (window as any).__currentGainNode.disconnect();
        (window as any).__currentGainNode = null;
      } catch (e) {
        console.log('[CallContext] Gain node already disconnected or error:', e);
      }
    }
    
    // NUCLEAR OPTION: Close ALL AudioContext instances in the browser
    try {
      console.log('[CallContext] 💥 NUCLEAR AUDIO CLEANUP - Closing ALL AudioContext instances');
      
      // Close the main audio context
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      
      // Force close ALL possible AudioContext instances
      const contextTypes = ['AudioContext', 'webkitAudioContext', 'mozAudioContext'];
      contextTypes.forEach(contextType => {
        if ((window as any)[contextType]) {
          try {
            // Create a temporary context just to get access to close all
            const tempContext = new (window as any)[contextType]();
            tempContext.close();
            console.log(`[CallContext] ✅ Closed ${contextType}`);
          } catch (e) {
            console.log(`[CallContext] No ${contextType} to close`);
          }
        }
      });
      
      // Clear any global audio context references
      if ((window as any).globalAudioContext) {
        try {
          (window as any).globalAudioContext.close();
          delete (window as any).globalAudioContext;
        } catch (e) {
          console.log('[CallContext] Error closing global audio context');
        }
      }
      
    } catch (e) {
      console.log('[CallContext] Error in nuclear audio cleanup:', e);
    }
    
    // Store interval ID when creating waiting tone to clear it specifically
    if ((window as any).__waitingToneIntervalId) {
      console.log('[CallContext] Clearing stored waiting tone interval');
      clearInterval((window as any).__waitingToneIntervalId);
      (window as any).__waitingToneIntervalId = null;
    }
    
    // Clear ALL intervals and timeouts (extreme measure)
    try {
      console.log('[CallContext] 💥 NUCLEAR INTERVAL CLEANUP - Clearing ALL intervals');
      const highestIntervalId = setInterval(() => {}, 9999) as unknown as number;
      for (let i = 1; i <= highestIntervalId; i++) {
        clearInterval(i);
      }
      clearInterval(highestIntervalId);
      
      const highestTimeoutId = setTimeout(() => {}, 9999) as unknown as number;
      for (let i = 1; i <= highestTimeoutId; i++) {
        clearTimeout(i);
      }
      clearTimeout(highestTimeoutId);
      
      console.log('[CallContext] ✅ Nuclear interval cleanup completed');
    } catch (e) {
      console.log('[CallContext] Error in nuclear interval cleanup:', e);
    }
    
    console.log('[CallContext] ✅ AGGRESSIVE AUDIO CLEANUP COMPLETED');
  };

  // Function to fetch participant names asynchronously
  const fetchParticipantNames = async (participantIds: number[], currentCall: CallState) => {
    try {
      const updatedParticipants = await Promise.all(
        participantIds.map(async (userId: number) => {
          if (userId === user?.id) {
            return {
              userId,
              userName: user?.callsign || user?.fullName || 'You',
              audioEnabled: true,
              videoEnabled: false,
              stream: null
            };
          } else {
            try {
              const response = await fetch(`/api/users/${userId}`);
              if (response.ok) {
                const userData = await response.json();
                return {
                  userId,
                  userName: userData.callsign || userData.fullName || `User ${userId}`,
                  audioEnabled: true,
                  videoEnabled: false,
                  stream: null
                };
              }
            } catch (error) {
              console.error('[CallContext] Error fetching user data:', error);
            }
            return {
              userId,
              userName: `User ${userId}`,
              audioEnabled: true,
              videoEnabled: false,
              stream: null
            };
          }
        })
      );

      // Update the call with proper names
      setActiveCall(prev => {
        if (prev && prev.callId === currentCall.callId) {
          return {
            ...prev,
            participants: updatedParticipants
          };
        }
        return prev;
      });

      console.log('[CallContext] Updated participant names:', updatedParticipants);
    } catch (error) {
      console.error('[CallContext] Error fetching participant names:', error);
    }
  };

  // Keep refs in sync with state
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Initialize ringtone audio once on mount
  useEffect(() => {
    if (ringtoneAudio) return;
    
    try {
      const audio = new Audio();
      const ringtoneData = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2+LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhC';
      
      audio.src = ringtoneData;
      audio.loop = true;
      audio.volume = 0.8;
      audio.preload = 'auto';
      audio.load();
      
      setRingtoneAudio(audio);
      console.log('[CallContext] Ringtone audio created successfully');
      
      // Setup user interaction for audio unlock
      const unlockAudio = () => {
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          console.log('[CallContext] Audio unlocked via user interaction');
        }).catch(() => {});
      };
      
      document.addEventListener('click', unlockAudio, { once: true });
      document.addEventListener('touchstart', unlockAudio, { once: true });
      
    } catch (error) {
      console.log('[CallContext] Could not create ringtone audio:', error);
    }
  }, []); // Only run once on mount

  // Simple WebSocket connection - no reconnection, just stable connection
  useEffect(() => {
    if (!user) return;

    console.log('[CallContext] Creating stable WebSocket for calls...');
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('[CallContext] WebSocket connected successfully for calls');
      setWs(websocket);
      
      // Set global WebSocket reference for GroupVideoCallSimple
      (window as any).__callWebSocket = websocket;
      
      // Listen for WebSocket message requests from GroupVideoCallSimple
      const handleSendWebSocketMessage = (event: CustomEvent) => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify(event.detail));
          console.log('[CallContext] Sent WebSocket message:', event.detail.type);
        }
      };
      
      window.addEventListener('send-websocket-message', handleSendWebSocketMessage as EventListener);
      
      // Authenticate user with WebSocket
      if (user?.id) {
        websocket.send(JSON.stringify({
          type: 'auth',
          payload: {
            userId: user.id
          }
        }));
        console.log(`[CallContext] Authenticated user ${user.id} with WebSocket`);
      }
      
      // Send any pending WebRTC offer
      if ((window as any).__pendingWebRTCOffer) {
        websocket.send(JSON.stringify((window as any).__pendingWebRTCOffer));
        console.log('[CallContext] ✅ Sent pending WebRTC offer after connection');
        (window as any).__pendingWebRTCOffer = null;
      }
      
      // Notify that WebSocket is ready
      window.dispatchEvent(new CustomEvent('websocket-ready', {
        detail: { websocket }
      }));
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[CallContext] Received message:', message);
        
        // Debug log specifically for incoming group call messages
        if (message.type === 'incoming_group_call') {
          console.log('[CallContext] 🚨 INCOMING GROUP CALL MESSAGE DETECTED - USER ID:', user?.id);
          console.log('[CallContext] 🚨 MESSAGE PAYLOAD:', JSON.stringify(message, null, 2));
        }
        
        // Handle session termination (single session enforcement)
        if (message.type === 'session_terminated') {
          console.log('[CallContext] Session terminated:', message.payload);
          alert('Sesi Anda telah dihentikan karena Anda login dari perangkat lain');
          
          // Redirect to login page
          window.location.href = '/api/login';
          return;
        }
        
        // Handle real-time chat messages (for ChatRoom component) - CRITICAL SECTION
        if (message.type === 'new_message') {
          console.log('[CallContext] 🔥 REAL-TIME MESSAGE RECEIVED:', message.payload);
          console.log('[CallContext] 🔥 Message sender:', message.payload?.senderId);
          console.log('[CallContext] 🔥 Current user:', user?.id);
          console.log('[CallContext] 🔥 Message conversation ID:', message.payload?.conversationId);
          console.log('[CallContext] 🔥 Broadcasting to ChatRoom via custom event');
          
          // Play audio notification for new messages from other users
          if (message.payload?.senderId !== user?.id) {
            console.log('[CallContext] 🔊 Playing audio notification for new message');
            playNewMessageSound();
          }
          
          // Dispatch multiple events for maximum reliability
          window.dispatchEvent(new CustomEvent('websocket-message', {
            detail: message
          }));
          
          // Also dispatch with different event name for fallback
          window.dispatchEvent(new CustomEvent('new-message-realtime', {
            detail: message
          }));
          
          // Dispatch event specifically for ChatList updates
          window.dispatchEvent(new CustomEvent('chatlist-update', {
            detail: message
          }));
          
          // Force immediate DOM update dispatch
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('force-message-refresh', {
              detail: message
            }));
          }, 100);
          
          console.log('[CallContext] 🔥 Multiple custom events dispatched successfully');
        }
        
        // Handle user status updates
        if (message.type === 'user_status') {
          console.log('[CallContext] Received user status update:', message.payload);
          window.dispatchEvent(new CustomEvent('websocket-message', {
            detail: message
          }));
        }
        
        // Handle call-specific messages - server uses payload wrapper
        switch (message.type) {

          case 'incoming_call':
            handleIncomingCall(message.payload || message);
            // Trigger call history update
            window.dispatchEvent(new CustomEvent('callHistoryUpdate', { 
              detail: { type: 'incoming_call', data: message.payload || message } 
            }));
            break;
          case 'incoming_group_call':
            console.log('[CallContext] Received incoming_group_call:', message.payload || message);
            handleIncomingGroupCall(message.payload || message);
            break;
          case 'call_accepted':
            handleCallAccepted(message.payload || message);
            break;
          case 'call_rejected':
            handleCallRejected(message.payload || message);
            break;
          case 'call_ended':
            handleCallEnded(message.payload || message);
            // Trigger call history update
            window.dispatchEvent(new CustomEvent('callHistoryUpdate', { 
              detail: { type: 'call_ended', data: message.payload || message } 
            }));
            break;
          case 'group_call_ended':
            handleGroupCallEnded(message.payload || message);
            break;
          case 'group_call_user_left':
            handleGroupCallUserLeft(message);
            break;
          case 'group_call_participants_update':
            console.log('[CallContext] 🔥 GROUP_CALL_PARTICIPANTS_UPDATE received:', message);
            handleGroupCallParticipantsUpdate(message);
            break;
          case 'group_update':
            handleGroupUpdate(message);
            break;
          case 'webrtc_ready':
            handleWebRTCReady(message.payload || message);
            break;
          case 'webrtc_offer':
            console.log('[CallContext] 🎯 Processing webrtc_offer message:', message);
            handleWebRTCOffer(message.payload || message);
            break;
          case 'webrtc_answer':
            console.log('[CallContext] 🎯 Processing webrtc_answer message:', message);
            handleWebRTCAnswer(message.payload || message);
            break;
          case 'webrtc_ice_candidate':
            handleWebRTCIceCandidate(message.payload || message);
            break;
          case 'group_webrtc_offer':
            // Forward group WebRTC offer to GroupVideoCallSimple component
            console.log('[CallContext] Forwarding group WebRTC offer:', message.payload || message);
            window.dispatchEvent(new CustomEvent('group-webrtc-offer', {
              detail: message.payload || message
            }));
            break;
          case 'group_webrtc_answer':
            // Forward group WebRTC answer to GroupVideoCallSimple component
            console.log('[CallContext] Forwarding group WebRTC answer:', message.payload || message);
            window.dispatchEvent(new CustomEvent('group-webrtc-answer', {
              detail: message.payload || message
            }));
            break;
          case 'group_webrtc_ice_candidate':
            // Forward group WebRTC ICE candidate to GroupVideoCallSimple component
            console.log('[CallContext] Forwarding group WebRTC ICE candidate:', message.payload || message);
            window.dispatchEvent(new CustomEvent('group-webrtc-ice-candidate', {
              detail: message.payload || message
            }));
            break;
          case 'group_call_initiated':
            console.log('[CallContext] Group call initiated confirmation:', message.payload);
            // Optional: Show success message to initiator
            break;
          case 'group_call_no_participants':
            console.log('[CallContext] No participants available for group call:', message.payload);
            alert(message.payload?.message || 'Tidak ada anggota grup yang online saat ini.');
            break;
          case 'new_message':
            // Forward new message to Chat component for real-time updates
            console.log('[CallContext] Forwarding new message for Chat:', message.payload || message);
            window.dispatchEvent(new CustomEvent('new-message', {
              detail: message.payload || message
            }));
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
    
    // Play ringtone for incoming call with global reference pattern (same as waiting tone)
    const playRingtone = async () => {
      console.log('[CallContext] 🔊 Starting ringtone for incoming call');
      try {
        if (ringtoneAudio) {
          // Store global reference for aggressive cleanup (same pattern as waiting tone)
          (window as any).__currentRingtone = ringtoneAudio;
          
          ringtoneAudio.currentTime = 0;
          console.log('[CallContext] Attempting to play ringtone...');
          
          // First try: Direct play
          try {
            await ringtoneAudio.play();
            console.log('[CallContext] ✅ Ringtone playing successfully');
            return;
          } catch (error) {
            console.log('[CallContext] Direct play failed, trying autoplay bypass techniques...');
          }
          
          // Second try: Reset audio and play with muted then unmuted
          ringtoneAudio.muted = true;
          await ringtoneAudio.play();
          ringtoneAudio.muted = false;
          console.log('[CallContext] ✅ Ringtone playing with mute bypass');
          return;
        }
      } catch (error) {
        console.log('[CallContext] ❌ HTML5 audio failed, trying Web Audio API...');
      }
      
      // Fallback 1: Advanced Web Audio API with user gesture simulation
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        // Create a more complex ringtone pattern
        const createRingtonePattern = () => {
          const duration = 3;
          const sampleRate = audioContext.sampleRate;
          const length = sampleRate * duration;
          const buffer = audioContext.createBuffer(1, length, sampleRate);
          const data = buffer.getChannelData(0);
          
          for (let i = 0; i < length; i++) {
            const time = i / sampleRate;
            let signal = 0;
            
            // Create ringtone pattern: ring ring pause ring ring
            if ((time % 1.5 < 0.3) || (time % 1.5 > 0.5 && time % 1.5 < 0.8)) {
              // Mix of frequencies for richer sound
              signal = (
                Math.sin(2 * Math.PI * 800 * time) * 0.3 +
                Math.sin(2 * Math.PI * 1000 * time) * 0.2 +
                Math.sin(2 * Math.PI * 600 * time) * 0.2
              );
              
              // Add envelope for smoother sound
              const envelope = Math.sin((time % 0.3) * Math.PI / 0.3);
              signal *= envelope;
            }
            
            data[i] = signal;
          }
          
          return buffer;
        };
        
        const buffer = createRingtonePattern();
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set volume
        gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
        
        // Play with looping
        source.loop = true;
        source.start();
        
        // Store source for cleanup (same pattern as waiting tone oscillator)
        (window as any).__ringtoneSource = source;
        (window as any).__currentRingtoneGainNode = gainNode;
        
        console.log('[CallContext] ✅ Web Audio API ringtone playing');
        return;
        
      } catch (webAudioError) {
        console.log('[CallContext] ❌ Web Audio API failed:', webAudioError);
      }
      
      // Fallback 2: Browser notification with sound
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('📞 Panggilan Masuk', {
            body: `${message.fromUserName} sedang menelpon`,
            icon: '/favicon.ico',
            tag: 'incoming-call',
            requireInteraction: true,
            silent: false
          });
          console.log('[CallContext] ✅ Notification displayed');
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          // Request notification permission
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('📞 Panggilan Masuk', {
                body: `${message.fromUserName} sedang menelpon`,
                icon: '/favicon.ico',
                tag: 'incoming-call',
                requireInteraction: true
              });
            }
          });
        }
      } catch (notificationError) {
        console.log('[CallContext] ❌ Notification failed:', notificationError);
      }
      
      // Fallback 3: Simple oscillator beep
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
        
        console.log('[CallContext] ✅ Fallback beep played');
      } catch (beepError) {
        console.log('[CallContext] ❌ All audio methods failed:', beepError);
      }
    };
    
    playRingtone();
    
    // Create RTCPeerConnection for incoming call (offline/intranet mode)
    const peerConnection = new RTCPeerConnection({
      iceServers: [], // Empty array for local network only - no STUN/TURN servers
      iceTransportPolicy: 'all', // Allow both UDP and TCP
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    // Setup ICE candidate handling for incoming call
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'webrtc_ice_candidate',
          callId: message.callId,
          candidate: event.candidate
        }));
      }
    };

    // Setup remote stream handling for incoming call
    peerConnection.ontrack = (event) => {
      console.log('[CallContext] Received remote stream in incoming call setup');
      const remoteStream = event.streams[0];
      console.log('[CallContext] Remote stream tracks:', remoteStream.getTracks().length);
      
      // Store remote stream for AudioCall component
      console.log('[CallContext] 📡 Storing remote stream globally');
      setRemoteAudioStream(remoteStream);
    };

    setIncomingCall({
      callId: message.callId,
      callType: message.callType,
      status: 'ringing',
      isIncoming: true,
      peerUserId: message.fromUserId,
      peerName: message.fromUserName,
      remoteStreams: new Map(),
      peerConnection,
      audioEnabled: true,
      videoEnabled: message.callType === 'video',
      isMuted: false,
    });

    // Process any pending WebRTC offers for this call
    setTimeout(() => {
      console.log('[CallContext] Checking for pending offers for callId:', message.callId);
      console.log('[CallContext] Total pending offers:', pendingOffers.current.length);
      console.log('[CallContext] Pending offer callIds:', pendingOffers.current.map(o => o.callId));
      
      const pendingOffer = pendingOffers.current.find(offer => offer.callId === message.callId);
      if (pendingOffer) {
        console.log('[CallContext] ✅ Found pending WebRTC offer for callId:', message.callId);
        console.log('[CallContext] Processing pending offer...');
        handleWebRTCOffer(pendingOffer);
        
        // Remove the processed offer from queue
        pendingOffers.current = pendingOffers.current.filter(offer => offer.callId !== message.callId);
        console.log('[CallContext] Removed processed offer, remaining pending:', pendingOffers.current.length);
      } else {
        console.log('[CallContext] ❌ No pending offer found for callId:', message.callId);
      }
    }, 100); // Small delay to ensure incoming call state is set
  };

  const handleCallAccepted = async (message: any) => {
    console.log('[CallContext] Call accepted, payload:', message);
    console.log('[CallContext] Current activeCall (state):', activeCall);
    console.log('[CallContext] Current activeCall (ref):', activeCallRef.current);
    console.log('[CallContext] Current incomingCall:', incomingCall);
    
    // FORCE STOP ALL WAITING TONES AND RINGTONES IMMEDIATELY
    console.log('[CallContext] FORCE STOPPING ALL RINGTONES - call accepted');
    stopAllRingtones();
    stopWaitingTone();
    
    // Additional comprehensive audio cleanup
    if (waitingToneInterval) {
      clearInterval(waitingToneInterval);
      setWaitingToneInterval(null);
      console.log('[CallContext] ✅ Waiting tone interval cleared');
    }
    
    // Stop any running audio contexts or oscillators
    if (audioContext) {
      try {
        audioContext.close();
        setAudioContext(null);
        console.log('[CallContext] ✅ Audio context closed');
      } catch (e) {
        console.log('[CallContext] Audio context already closed');
      }
    }
    
    // Use ref for stable call reference
    const currentActiveCall = activeCallRef.current || activeCall;
    
    if (currentActiveCall && currentActiveCall.peerConnection) {
      console.log('[CallContext] Updating call status to connected');
      
      // Stop ALL ringtone sources when call is accepted
      console.log('[CallContext] Stopping ALL ringtone sources - call accepted');
      
      // Force stop HTML5 Audio
      if (ringtoneAudio) {
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
        ringtoneAudio.loop = false;
        ringtoneAudio.volume = 0;
        ringtoneAudio.src = '';
        ringtoneAudio.load();
        console.log('[CallContext] ✅ HTML5 ringtone force stopped');
      }
      
      // Force stop Web Audio API source
      if ((window as any).__ringtoneSource) {
        try {
          (window as any).__ringtoneSource.stop();
          (window as any).__ringtoneSource.disconnect();
          (window as any).__ringtoneSource = null;
          console.log('[CallContext] ✅ Web Audio API ringtone stopped');
        } catch (e) {
          console.log('[CallContext] Web Audio API source already stopped');
        }
      }
      
      // Close audio context completely
      if ((window as any).__audioContext) {
        try {
          (window as any).__audioContext.close();
          (window as any).__audioContext = null;
          console.log('[CallContext] ✅ Audio context closed');
        } catch (e) {
          console.log('[CallContext] Audio context already closed');
        }
      }
      
      // Clear any notifications
      if ('Notification' in window) {
        // Clear any existing notifications with our tag
        try {
          navigator.serviceWorker?.ready.then(registration => {
            registration.getNotifications({ tag: 'incoming-call' }).then(notifications => {
              notifications.forEach(notification => notification.close());
            });
          });
        } catch (e) {
          console.log('[CallContext] Could not clear notifications');
        }
      }

      // Update call status first
      setActiveCall(prevCall => {
        if (!prevCall) return prevCall;
        return {
          ...prevCall,
          status: 'connected' as const,
          startTime: new Date(),
        };
      });
      
      // Don't create offer here, wait for webrtc_ready signal from receiver
      console.log('[CallContext] Waiting for receiver to be ready for WebRTC...');
      
      // Add fallback mechanism - if no webrtc_ready signal received within 3 seconds, proceed anyway
      const fallbackTimeout = setTimeout(() => {
        console.log('[CallContext] ⚠️ No WebRTC ready signal received, proceeding with fallback offer creation');
        const fallbackActiveCall = activeCallRef.current;
        if (fallbackActiveCall && fallbackActiveCall.peerConnection) {
          fallbackActiveCall.peerConnection!.createOffer()
            .then(offer => {
              fallbackActiveCall.peerConnection!.setLocalDescription(offer);
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'webrtc_offer',
                  callId: fallbackActiveCall.callId,
                  offer: offer
                }));
                console.log('[CallContext] ✅ Fallback WebRTC offer sent');
              }
            })
            .catch(error => {
              console.error('[CallContext] ❌ Fallback offer creation failed:', error);
            });
        }
      }, 3000);
      
      // Store timeout so we can clear it if webrtc_ready is received
      (window as any).__webrtcFallbackTimeout = fallbackTimeout;
    } else {
      console.error('[CallContext] ❌ No activeCall or peerConnection when call accepted');
      console.error('[CallContext] activeCall (state):', activeCall);
      console.error('[CallContext] activeCall (ref):', activeCallRef.current);
      console.error('[CallContext] incomingCall:', incomingCall);
    }
  };

  const handleWebRTCReady = async (message: any) => {
    console.log('[CallContext] Received WebRTC ready signal, payload:', message);
    console.log('[CallContext] Current activeCall (state):', activeCall);
    console.log('[CallContext] Current activeCall (ref):', activeCallRef.current);
    
    // Use ref for stable call reference
    const currentActiveCall = activeCallRef.current || activeCall;
    
    if (currentActiveCall && currentActiveCall.peerConnection) {
      console.log('[CallContext] ✅ Found activeCall and peerConnection for WebRTC ready');
      
      // Clear the fallback timeout since we received the ready signal
      if ((window as any).__webrtcFallbackTimeout) {
        clearTimeout((window as any).__webrtcFallbackTimeout);
        (window as any).__webrtcFallbackTimeout = null;
        console.log('[CallContext] ✅ Cleared fallback timeout - received ready signal');
      }
      
      // Now create and send WebRTC offer since receiver is ready
      try {
        console.log('[CallContext] Creating WebRTC offer after receiver ready...');
        const offer = await currentActiveCall.peerConnection.createOffer();
        await currentActiveCall.peerConnection.setLocalDescription(offer);
        console.log('[CallContext] Local description set successfully');

        // Try WebSocket first, fallback to HTTP API
        const offerData = {
          type: 'webrtc_offer',
          callId: currentActiveCall.callId,
          offer: offer
        };
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(offerData));
          console.log('[CallContext] ✅ Sent WebRTC offer via WebSocket');
        } else {
          console.log('[CallContext] ⚠️ WebSocket not ready, using HTTP API fallback');
          
          // Use HTTP API as fallback
          try {
            const response = await fetch('/api/webrtc/offer', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                callId: currentActiveCall.callId,
                targetUserId: currentActiveCall.peerUserId,
                offer: offer
              })
            });
            
            if (response.ok) {
              console.log('[CallContext] ✅ Sent WebRTC offer via HTTP API fallback');
            } else {
              throw new Error('HTTP API failed');
            }
          } catch (error) {
            console.error('[CallContext] ❌ Both WebSocket and HTTP API failed:', error);
            hangupCall();
          }
        }
      } catch (error) {
        console.error('[CallContext] ❌ Error creating WebRTC offer after receiver ready:', error);
      }
    } else {
      console.error('[CallContext] ❌ No activeCall or peerConnection when receiver ready');
      console.error('[CallContext] activeCall (state):', activeCall);
      console.error('[CallContext] activeCall (ref):', activeCallRef.current);
    }
  };

  const handleCallRejected = (message: any) => {
    console.log('[CallContext] Call rejected');
    
    // FORCE STOP ALL WAITING TONES AND RINGTONES IMMEDIATELY
    console.log('[CallContext] FORCE STOPPING ALL RINGTONES - call rejected');
    stopAllRingtones();
    stopWaitingTone();
    
    // Additional comprehensive audio cleanup for call rejected
    if (waitingToneInterval) {
      clearInterval(waitingToneInterval);
      setWaitingToneInterval(null);
      console.log('[CallContext] ✅ Waiting tone interval cleared on call rejected');
    }
    
    // Stop any running audio contexts or oscillators
    if (audioContext) {
      try {
        audioContext.close();
        setAudioContext(null);
        console.log('[CallContext] ✅ Audio context closed on call rejected');
      } catch (e) {
        console.log('[CallContext] Audio context already closed');
      }
    }
    
    // Clear stored interval ID
    if ((window as any).__waitingToneIntervalId) {
      console.log('[CallContext] Clearing stored waiting tone interval on call rejected');
      clearInterval((window as any).__waitingToneIntervalId);
      (window as any).__waitingToneIntervalId = null;
    }
    
    setActiveCall(null);
    console.log('[CallContext] Call rejected');
  };

  const handleIncomingGroupCall = async (message: any) => {
    console.log('[CallContext] 🔔 Incoming group call received:', message);
    const { callId, groupId, groupName, callType, fromUserId, fromUserName } = message.payload || message;

    console.log('[CallContext] Extracted call details:', { callId, groupId, groupName, callType });
    console.log('[CallContext] Current activeCall:', activeCall?.callId);

    // Skip if user is already in an active call
    if (activeCall) {
      console.log('[CallContext] User already in active call, ignoring incoming group call');
      return;
    }

    // Play notification sound for incoming group call
    console.log('[CallContext] 🔊 Playing notification sound for incoming group call');
    
    try {
      // Play simple notification beep for incoming group call
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log('[CallContext] ✅ Notification beep played successfully');
    } catch (error) {
      console.error('[CallContext] ❌ Error playing notification sound:', error);
      // Continue even if sound fails
    }

    console.log('[CallContext] 🔧 Creating RTCPeerConnection for group call');
    
    let peerConnection;
    try {
      // Create RTCPeerConnection for group call (same as handleIncomingCall)
      peerConnection = new RTCPeerConnection({
        iceServers: [], // Empty array for local network only - no STUN/TURN servers
        iceTransportPolicy: 'all', // Allow both UDP and TCP
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      
      console.log('[CallContext] ✅ RTCPeerConnection created successfully');
    } catch (error) {
      console.error('[CallContext] ❌ Error creating RTCPeerConnection:', error);
      return; // Exit if can't create peer connection
    }

    try {
      // Setup ICE candidate handling for group call
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'webrtc_ice_candidate',
            callId: callId,
            candidate: event.candidate
          }));
        }
      };
      
      console.log('[CallContext] ✅ ICE candidate handler setup successfully');
    } catch (error) {
      console.error('[CallContext] ❌ Error setting up ICE candidate handler:', error);
    }

    // Pre-create local stream with video enabled for incoming group calls
    console.log('[CallContext] 🎥 Pre-creating local stream for incoming group call...');
    let localStream: MediaStream | undefined;
    
    try {
      // Create stream with video enabled for video calls
      if (callType === 'video') {
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1
          },
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: 'user'
          }
        };
        
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('[CallContext] ✅ Pre-created video+audio stream for incoming group call');
        
        // Ensure video track is enabled
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          console.log('[CallContext] ✅ Video track enabled in pre-created stream');
        }
      }
    } catch (error) {
      console.error('[CallContext] ⚠️ Failed to pre-create stream, will create on accept:', error);
      // Continue without localStream, will be created on accept
    }

    // Show incoming group call modal instead of auto-joining
    console.log('[CallContext] 🔥 BEFORE setIncomingCall - current state:', incomingCall);
    
    try {
      // Create incoming call state exactly like handleIncomingCall does
      const groupCallState = {
        callId,
        callType,
        status: 'ringing',
        isIncoming: true,
        peerUserId: fromUserId,
        peerName: fromUserName,
        remoteStreams: new Map(),
        peerConnection,
        localStream, // Include pre-created stream if available
        audioEnabled: true,
        videoEnabled: callType === 'video',
        isMuted: false,
        isGroupCall: true,
        groupId,
        groupName,
        participants: []
      };
      
      console.log('[CallContext] 🔥 About to call setIncomingCall with:', groupCallState);
      setIncomingCall(groupCallState);
      console.log('[CallContext] 🔥 setIncomingCall called successfully');
      
    } catch (error) {
      console.error('[CallContext] ❌ Error setting incoming call state:', error);
      console.error('[CallContext] Error details:', error.message, error.stack);
    }
    
    console.log('[CallContext] 🔥 AFTER setIncomingCall - created incoming group call');
    console.log('[CallContext] 🎯 Set incoming group call modal for:', groupName);
    
    // Debug: Check state immediately after setting
    setTimeout(() => {
      console.log('[CallContext] 🔍 DEBUG: incomingCall state after 100ms:', incomingCall);
      console.log('[CallContext] 🔍 DEBUG: incomingCallRef after 100ms:', incomingCallRef.current);
    }, 100);
  };

  const handleGroupCallEnded = (message: any) => {
    console.log('[CallContext] Group call ended:', message);
    
    // Stop ringtone
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }

    // Clean up active call if it matches
    if (activeCall && activeCall.callId === message.payload.callId) {
      if (activeCall.localStream) {
        activeCall.localStream.getTracks().forEach(track => track.stop());
      }
      setActiveCall(null);
      setLocation('/chat');
    }

    // Clean up incoming call if it matches, but only if call was in progress
    // Don't clear incoming call modal if user hasn't responded yet
    if (incomingCall?.callId === message.payload.callId) {
      console.log('[CallContext] Group call ended - checking if should clear incoming call modal');
      console.log('[CallContext] Incoming call status:', incomingCall.status);
      
      // Only clear if call was actually in progress (accepted), not just ringing
      if (incomingCall.status !== 'ringing') {
        console.log('[CallContext] Clearing incoming call modal because call was in progress');
        setIncomingCall(null);
      } else {
        console.log('[CallContext] Keeping incoming call modal because call was only ringing (not accepted yet)');
      }
    }

    // Clear localStorage when group call ends
    localStorage.removeItem('activeGroupCall');
    console.log('[CallContext] Cleared group call data from localStorage');
  };

  const handleGroupCallUserLeft = (message: any) => {
    console.log('[CallContext] User left group call:', message);
    const { userId, roomId, callType } = message;
    
    // Get current active call
    const currentActiveCall = activeCallRef.current;
    
    if (currentActiveCall && currentActiveCall.isGroupCall && currentActiveCall.groupId === roomId) {
      console.log(`[CallContext] Removing user ${userId} from group call participants`);
      
      // Remove the user from participants list  
      const currentParticipants = currentActiveCall.participants || [];
      const updatedParticipants = currentParticipants.filter((participant: any) => 
        typeof participant === 'object' ? participant.userId !== userId : participant !== userId
      );
      
      const updatedCall = {
        ...currentActiveCall,
        participants: updatedParticipants
      };
      
      setActiveCall(updatedCall);
      console.log(`[CallContext] Updated participants after user ${userId} left:`, updatedParticipants);
      
      // Don't end call if current user is still in it - let them decide when to hang up
      // Only end if there are literally no participants (shouldn't happen in normal flow)
      if (updatedParticipants.length === 0) {
        console.log('[CallContext] No participants left, ending group call');
        handleGroupCallEnded({ payload: { callId: currentActiveCall.callId } });
      } else {
        console.log(`[CallContext] ${updatedParticipants.length} participant(s) remaining, call continues`);
      }
    } else {
      console.log('[CallContext] No matching active group call found for user left event');
    }
  };

  // Handle group update notifications for real-time cache invalidation
  const handleGroupUpdate = (message: any) => {
    console.log('[CallContext] Group update received:', message);
    
    if (message.payload) {
      const { groupId, updateType } = message.payload;
      console.log(`[CallContext] Processing group update: ${updateType} for group ${groupId}`);
      
      // Trigger a custom event that GroupManagement can listen to
      window.dispatchEvent(new CustomEvent('group-update', {
        detail: {
          groupId,
          updateType,
          data: message.payload.data
        }
      }));
    }
  };

  const handleGroupCallParticipantsUpdate = (message: any) => {
    console.log('[CallContext] Group call participants update:', message);
    const { callId, participants, newParticipant } = message.payload;
    
    // Use ref to get current activeCall state to avoid race conditions
    const currentActiveCall = activeCallRef.current;
    console.log('[CallContext] Comparing callIds - message:', callId, 'activeCall:', currentActiveCall?.callId);
    console.log('[CallContext] ActiveCall groupId:', currentActiveCall?.groupId);
    
    // Also check localStorage for active group call if activeCall is null
    let groupCallToUpdate = currentActiveCall;
    if (!groupCallToUpdate || !groupCallToUpdate.isGroupCall) {
      const storedCall = localStorage.getItem('activeGroupCall');
      if (storedCall) {
        try {
          const storedData = JSON.parse(storedCall);
          console.log('[CallContext] Using stored group call data:', storedData);
          
          // Create a minimal call state from localStorage
          groupCallToUpdate = {
            callId: storedData.callId,
            callType: storedData.callType,
            status: 'connected',
            isIncoming: false,
            groupId: storedData.groupId,
            groupName: storedData.groupName,
            isGroupCall: true,
            participants: [],
            remoteStreams: new Map(),
            audioEnabled: true,
            videoEnabled: storedData.callType === 'video',
            isMuted: false
          };
        } catch (error) {
          console.error('[CallContext] Error parsing stored call data:', error);
        }
      }
    }
    
    // For group calls, match by groupId rather than exact callId since the server may use different callIds
    if (groupCallToUpdate && groupCallToUpdate.isGroupCall) {
      // Extract groupId from the callId (format: group_call_timestamp_groupId_userId)
      const callIdParts = callId.split('_');
      const messageGroupId = callIdParts[3]; // Fourth part is groupId (index 3)
      const activeGroupId = String(groupCallToUpdate.groupId);
      
      console.log('[CallContext] Extracted groupIds - message:', messageGroupId, 'active:', activeGroupId);
      console.log('[CallContext] CallId parts:', callIdParts);
      
      if (messageGroupId === activeGroupId) {
        console.log('[CallContext] Group IDs match, updating participants:', participants);
        
        // Handle both array of IDs and array of participant objects
        let processedParticipants = participants;
        if (participants && participants.length > 0 && typeof participants[0] === 'object' && participants[0].userId) {
          // Already in participant object format, extract IDs for deduplication
          processedParticipants = participants.map((p: any) => p.userId);
        }
        
        // Remove duplicates from participants list
        const uniqueParticipants = Array.from(new Set(processedParticipants));
        console.log('[CallContext] Unique participants after deduplication:', uniqueParticipants);
        
        // Fetch user names for participants
        console.log('[CallContext] 🔍 Fetching user names for participants:', uniqueParticipants);
        fetch('/api/all-users').then(response => response.json()).then(allUsers => {
          console.log('[CallContext] 📊 Got all users data:', allUsers.length);
          const userMap = new Map();
          allUsers.forEach((user: any) => {
            userMap.set(user.id, user.callsign || user.fullName || `User ${user.id}`);
          });
          
          // Convert participant IDs to participant objects with real names
          const participantObjects = uniqueParticipants.map((participantId: any) => ({
            userId: Number(participantId),
            userName: userMap.get(Number(participantId)) || `User ${participantId}`,
            audioEnabled: true,
            videoEnabled: groupCallToUpdate.callType === 'video',
            stream: null
          }));
          
          console.log('[CallContext] 📋 Created participant objects:', participantObjects);
          
          const updatedCall = {
            ...groupCallToUpdate,
            participants: participantObjects,
            callId: callId // Update to the server's active callId
          };
          
          setActiveCall(updatedCall);
          console.log('[CallContext] ✅ Updated participants with names:', participantObjects);
          
          // Trigger WebRTC setup in GroupVideoCall component with multiple event types for reliability
          window.dispatchEvent(new CustomEvent('participants-updated', {
            detail: {
              callId: callId,
              participants: participantObjects,
              userMap
            }
          }));
          
          // Enhanced trigger for WebRTC initiation with immediate dispatch
          console.log('[CallContext] 🚀 Dispatching group-participants-update event:', participantObjects);
          console.log('[CallContext] 🚀 Event details:', { callId, groupId: groupCallToUpdate.groupId });
          
          // Use setTimeout to ensure event is dispatched after component is ready
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('group-participants-update', {
              detail: { 
                callId: callId,
                participants: participantObjects,
                triggerWebRTC: true,
                groupId: groupCallToUpdate.groupId
              }
            }));
            console.log('[CallContext] ✅ group-participants-update event dispatched successfully');
          }, 100);
          
          // Direct WebRTC initiation trigger
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('initiate-group-webrtc', {
              detail: { 
                callId: callId,
                participants: participantObjects,
                forceInit: true
              }
            }));
          }, 500);
        }).catch(error => {
          console.error('[CallContext] Error fetching user names:', error);
          
          // Fallback without names
          const participantObjects = uniqueParticipants.map((participantId: any) => ({
            userId: Number(participantId),
            userName: `User ${participantId}`,
            audioEnabled: true,
            videoEnabled: groupCallToUpdate.callType === 'video',
            stream: null
          }));
          
          const updatedCall = {
            ...groupCallToUpdate,
            participants: participantObjects,
            callId: callId
          };
          
          setActiveCall(updatedCall);
          console.log('[CallContext] Updated participants without names:', uniqueParticipants);
        });
        
        // Clear any pending updates since we processed this one
        localStorage.removeItem('pendingParticipantUpdate');
      } else {
        console.log('[CallContext] Group IDs do not match');
      }
    } else {
      console.log('[CallContext] No active group call found for participant update');
      // Store pending participant update for processing when activeCall becomes available
      localStorage.setItem('pendingParticipantUpdate', JSON.stringify({
        callId,
        participants,
        timestamp: Date.now()
      }));
      console.log('[CallContext] Stored pending participant update for later processing');
    }
  };

  const handleInitiateGroupWebRTC = (message: any) => {
    console.log('[CallContext] 🚀 Group WebRTC initiation received:', message);
    const { callId, allParticipants, yourUserId } = message.payload;
    
    // Get current active call
    const currentActiveCall = activeCallRef.current || activeCall;
    
    if (!currentActiveCall || !currentActiveCall.isGroupCall) {
      console.log('[CallContext] ❌ No active group call found for WebRTC initiation');
      return;
    }
    
    console.log('[CallContext] 🎯 Auto-triggering WebRTC setup for group call participants:', allParticipants);
    
    // Dispatch event to GroupVideoCall to auto-start WebRTC connections
    window.dispatchEvent(new CustomEvent('auto-initiate-webrtc', {
      detail: {
        callId,
        allParticipants,
        yourUserId,
        activeCall: currentActiveCall
      }
    }));
    
    console.log('[CallContext] ✅ WebRTC auto-initiation event dispatched');
  };

  const handleGroupCallNoParticipants = (message: any) => {
    console.log('[CallContext] ⚠️ No participants available for group call:', message);
    const { callId, message: warningMessage } = message.payload;
    
    // Show warning to user that no group members are online
    if (warningMessage) {
      // Create a toast notification or alert
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            title: 'Group Call Notice',
            description: warningMessage,
            variant: 'warning'
          }
        }));
      }
    }
    
    // End the current call since no one is available
    setTimeout(() => {
      if (activeCallRef.current && activeCallRef.current.callId === callId) {
        console.log('[CallContext] Auto-ending group call due to no participants');
        hangupCall();
      }
    }, 3000); // Wait 3 seconds to show the message
  };

  const handleCallEnded = (message: any) => {
    console.log('[CallContext] ❌ Call ended unexpectedly, payload:', message);
    console.log('[CallContext] Current activeCall status:', activeCall?.status);
    console.log('[CallContext] Current incomingCall status:', incomingCall?.status);
    
    // FORCE STOP ALL WAITING TONES AND RINGTONES IMMEDIATELY
    console.log('[CallContext] FORCE STOPPING ALL RINGTONES - call ended');
    stopWaitingTone();
    
    // Additional comprehensive audio cleanup for call ended
    if (waitingToneInterval) {
      clearInterval(waitingToneInterval);
      setWaitingToneInterval(null);
      console.log('[CallContext] ✅ Waiting tone interval cleared on call ended');
    }
    
    // Stop any running audio contexts or oscillators
    if (audioContext) {
      try {
        audioContext.close();
        setAudioContext(null);
        console.log('[CallContext] ✅ Audio context closed on call ended');
      } catch (e) {
        console.log('[CallContext] Audio context already closed');
      }
    }
    
    // Stop ALL ringtone sources immediately
    console.log('[CallContext] Stopping ALL ringtone sources - call ended');
    try {
      // Stop HTML5 audio
      if (ringtoneAudio) {
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
      }
      
      // Stop Web Audio API
      if ((window as any).__ringtoneSource) {
        (window as any).__ringtoneSource.stop();
        (window as any).__ringtoneSource = null;
      }
      
      // Clear fallback timeout
      if ((window as any).__webrtcFallbackTimeout) {
        clearTimeout((window as any).__webrtcFallbackTimeout);
        (window as any).__webrtcFallbackTimeout = null;
      }
    } catch (error) {
      console.log('[CallContext] Error stopping audio sources:', error);
    }
    
    setActiveCall(null);
    setIncomingCall(null);
    
    // Clean up media streams
    if (activeCall?.localStream) {
      activeCall.localStream.getTracks().forEach(track => track.stop());
    }
  };

  const handleWebRTCOffer = async (message: any) => {
    console.log('[CallContext] Received WebRTC offer for callId:', message.callId);
    
    // Use ref for more stable reference
    const currentActiveCall = activeCallRef.current || activeCall;
    const currentIncomingCall = incomingCallRef.current || incomingCall;
    const currentCall = currentActiveCall || currentIncomingCall;
    
    console.log('[CallContext] Current activeCall:', currentActiveCall?.callId);
    console.log('[CallContext] Current incomingCall:', currentIncomingCall?.callId);
    console.log('[CallContext] Looking for callId:', message.callId);
    
    // If no call exists yet or callId doesn't match, queue the offer
    if (!currentCall || !currentCall.peerConnection || currentCall.callId !== message.callId) {
      console.log('[CallContext] No matching call found, queuing WebRTC offer for callId:', message.callId);
      
      // Initialize pending offers array if not exists
      if (!pendingOffers.current) {
        pendingOffers.current = [];
      }
      
      // Store the offer for later processing
      pendingOffers.current.push(message);
      console.log('[CallContext] Queued offer, total pending:', pendingOffers.current.length);
      return;
    }

    try {
      console.log('[CallContext] Processing WebRTC offer...');
      await currentCall.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
      console.log('[CallContext] ✅ Remote description set successfully');
      
      // Process any pending ICE candidates for this call now that remote description is set
      const callCandidates = pendingIceCandidates.current.filter(item => item.callId === currentCall.callId);
      if (callCandidates.length > 0) {
        console.log('[CallContext] Processing', callCandidates.length, 'pending ICE candidates for callId:', currentCall.callId);
        for (const item of callCandidates) {
          try {
            await currentCall.peerConnection.addIceCandidate(new RTCIceCandidate(item.candidate));
            console.log('[CallContext] ✅ Added pending ICE candidate');
          } catch (error) {
            console.error('[CallContext] Error adding pending ICE candidate:', error);
          }
        }
        // Remove processed candidates from queue
        pendingIceCandidates.current = pendingIceCandidates.current.filter(item => item.callId !== currentCall.callId);
      }
      
      const answer = await currentCall.peerConnection.createAnswer();
      await currentCall.peerConnection.setLocalDescription(answer);
      console.log('[CallContext] ✅ Local description (answer) set successfully');

      // Send answer back - try WebSocket first, fallback to HTTP API
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'webrtc_answer',
          callId: currentCall.callId,
          answer: answer
        }));
        console.log('[CallContext] ✅ Sent WebRTC answer via WebSocket');
      } else {
        console.log('[CallContext] ⚠️ WebSocket not ready for answer, using HTTP API fallback');
        
        // Use HTTP API as fallback for answer
        try {
          const response = await fetch('/api/webrtc/answer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              callId: currentCall.callId,
              targetUserId: currentCall.peerUserId,
              answer: answer
            })
          });
          
          if (response.ok) {
            console.log('[CallContext] ✅ Sent WebRTC answer via HTTP API fallback');
          } else {
            throw new Error('HTTP API failed for answer');
          }
        } catch (error) {
          console.error('[CallContext] ❌ Failed to send WebRTC answer:', error);
        }
      }
    } catch (error) {
      console.error('[CallContext] Error handling WebRTC offer:', error);
    }
  };

  const handleWebRTCAnswer = async (message: any) => {
    console.log('[CallContext] 📡 Received WebRTC answer for callId:', message.callId);
    
    // Use ref for stable call reference
    const currentActiveCall = activeCallRef.current || activeCall;
    console.log('[CallContext] Current activeCall for answer:', currentActiveCall?.callId);
    
    if (!currentActiveCall || !currentActiveCall.peerConnection) {
      console.error('[CallContext] ❌ No activeCall or peerConnection for answer');
      return;
    }

    if (currentActiveCall.callId !== message.callId) {
      console.error('[CallContext] ❌ CallId mismatch for answer. Expected:', currentActiveCall.callId, 'Got:', message.callId);
      return;
    }

    try {
      console.log('[CallContext] 📡 Setting remote description (answer) on caller side');
      await currentActiveCall.peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
      console.log('[CallContext] ✅ Remote description (answer) set successfully on caller side');
      
      // The ontrack handler should now be triggered for the caller to receive audio
      console.log('[CallContext] 🎯 Waiting for ontrack event to provide remote stream to caller...');
      
    } catch (error) {
      console.error('[CallContext] ❌ Error handling WebRTC answer:', error);
    }
  };

  const handleWebRTCIceCandidate = async (message: any) => {
    console.log('[CallContext] Received ICE candidate for callId:', message.callId);
    
    // Use ref for more stable reference
    const currentActiveCall = activeCallRef.current || activeCall;
    const currentIncomingCall = incomingCallRef.current || incomingCall;
    const currentCall = currentActiveCall || currentIncomingCall;
    
    console.log('[CallContext] Current activeCall for ICE:', currentActiveCall?.callId);
    console.log('[CallContext] Current incomingCall for ICE:', currentIncomingCall?.callId);
    console.log('[CallContext] Looking for callId:', message.callId);
    
    // If no current call matches the callId, queue the candidate for later
    if (!currentCall || !currentCall.peerConnection || currentCall.callId !== message.callId) {
      console.log('[CallContext] No matching call found, queuing ICE candidate for callId:', message.callId);
      console.log('[CallContext] Available calls:', { 
        activeCallId: currentActiveCall?.callId, 
        incomingCallId: currentIncomingCall?.callId 
      });
      pendingIceCandidates.current.push({
        callId: message.callId,
        candidate: message.candidate
      });
      return;
    }

    try {
      // Check if remote description is set
      if (!currentCall.peerConnection.remoteDescription) {
        console.log('[CallContext] Remote description not set yet, queuing ICE candidate');
        pendingIceCandidates.current.push(message.candidate);
        return;
      }
      
      await currentCall.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
      console.log('[CallContext] ✅ Added ICE candidate successfully');
    } catch (error) {
      console.error('[CallContext] Error handling ICE candidate:', error);
    }
  };

  const startCall = async (peerUserId: number, peerName: string, callType: 'audio' | 'video') => {
    if (!user) {
      console.error('[CallContext] User not available');
      return;
    }

    // Enhanced WebSocket check with simple retry
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('[CallContext] WebSocket not connected, please refresh page');
      return;
    }

    console.log(`[CallContext] 📱 MOBILE: Starting ${callType} call to:`, peerName, 'from mobile device');
    
    // Check mobile compatibility first
    const { isMobile, isHTTPS, hasMediaDevices } = checkMobileCompatibility();
    
    if (!hasMediaDevices) {
      console.error('[CallContext] Media devices not supported');
      return;
    }

    try {
      // Ultra-simple constraints for maximum mobile compatibility
      let constraints;
      if (callType === 'video') {
        // Try progressively simpler video constraints for mobile
        constraints = { 
          audio: true, 
          video: isMobile ? {
            width: { max: 640 },
            height: { max: 480 },
            facingMode: 'user',
            frameRate: { max: 15 }
          } : {
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
        
        // First fallback - very basic video constraints
        if (callType === 'video') {
          try {
            console.log('[CallContext] 📱 Mobile video fallback 1: basic constraints');
            return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          } catch (error2) {
            console.error('[CallContext] 📱 Mobile video fallback 1 failed:', error2);
            
            // Second fallback - try rear camera
            try {
              console.log('[CallContext] 📱 Mobile video fallback 2: rear camera');
              return await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: { facingMode: 'environment' }
              });
            } catch (error3) {
              console.error('[CallContext] 📱 Mobile video fallback 2 failed:', error3);
              
              // Final fallback - audio only for video calls
              console.log('[CallContext] 📱 Mobile video fallback 3: audio only');
              return await navigator.mediaDevices.getUserMedia({ audio: true });
            }
          }
        } else {
          // Audio call fallback
          return await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      });
      console.log('[CallContext] ✅ Successfully got media stream:', {
        audioTracks: localStream.getAudioTracks().length,
        videoTracks: localStream.getVideoTracks().length,
        callType: callType
      });
      
      // Debug track details for video calls
      if (callType === 'video') {
        console.log('[CallContext] 📹 Video call tracks details:');
        localStream.getTracks().forEach((track, index) => {
          console.log(`[CallContext] Local track ${index}:`, {
            kind: track.kind,
            enabled: track.enabled,
            readyState: track.readyState,
            id: track.id,
            label: track.label
          });
        });
      }

      const callId = `call_${Date.now()}_${user.id}_${peerUserId}`;

      // Create RTCPeerConnection for intranet/offline mode (no internet required)
      const peerConnection = new RTCPeerConnection({
        iceServers: [], // Empty array for local network only - no internet connection needed
        iceTransportPolicy: 'all', // Allow both UDP and TCP
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });

      // Add local stream to peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // Handle incoming remote stream for caller
      peerConnection.ontrack = (event) => {
        console.log('[CallContext] 📡 CALLER: Received remote stream in startCall');
        const remoteStream = event.streams[0];
        console.log('[CallContext] 📡 CALLER: Remote stream details:', {
          id: remoteStream.id,
          active: remoteStream.active,
          audioTracks: remoteStream.getAudioTracks().length,
          videoTracks: remoteStream.getVideoTracks().length
        });
        
        // Store remote stream globally for AudioCall component
        console.log('[CallContext] 📡 CALLER: Storing remote stream globally');
        setRemoteAudioStream(remoteStream);
        
        // Stop waiting tone when remote audio stream is received
        console.log('[CallContext] Remote audio received - stopping waiting tone');
        stopWaitingTone();
        
        // Find and setup audio element for remote stream
        setTimeout(() => {
          const audioElement = document.querySelector('#remoteAudio') as HTMLAudioElement;
          if (audioElement) {
            audioElement.srcObject = remoteStream;
            audioElement.volume = 1.0;
            audioElement.play().then(() => {
              console.log('[CallContext] ✅ CALLER: Remote audio playing successfully in startCall');
            }).catch(e => {
              console.log('[CallContext] CALLER: Remote audio autoplay failed in startCall:', e);
            });
          } else {
            console.log('[CallContext] ❌ CALLER: Remote audio element not found in startCall');
          }
        }, 100);
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'webrtc_ice_candidate',
            callId: callId,
            candidate: event.candidate
          }));
        }
      };

      const newCall: CallState = {
        callId,
        callType,
        status: 'calling',
        isIncoming: false,
        peerUserId,
        peerName,
        localStream,
        remoteStreams: new Map(),
        peerConnection,
        audioEnabled: true,
        videoEnabled: callType === 'video',
        isMuted: false,
      };

      setActiveCall(newCall);

      // Start waiting tone for outgoing call
      console.log('[CallContext] Starting waiting tone for outgoing call');
      startWaitingTone();

      // Create and send WebRTC offer
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        // Send offer via WebSocket
        ws.send(JSON.stringify({
          type: 'webrtc_offer',
          callId: callId,
          offer: offer
        }));
      } catch (error) {
        console.error('[CallContext] Error creating WebRTC offer:', error);
      }

      // Send call initiation message (ws is guaranteed to be connected at this point)
      ws!.send(JSON.stringify({
        type: 'initiate_call',
        payload: {
          callId,
          toUserId: peerUserId,
          callType,
          fromUserId: user.id,
          fromUserName: user.callsign,
        }
      }));

      // Navigate to call interface with a small delay to ensure state is set
      setTimeout(() => {
        setLocation(callType === 'video' ? '/video-call' : '/audio-call');
      }, 100);

    } catch (error: any) {
      console.error('[CallContext] Error starting call:', error);
    }
  };

  const acceptCall = async () => {
    console.log('[CallContext] acceptCall function called');
    console.log('[CallContext] incomingCall:', incomingCall);
    console.log('[CallContext] ws connected:', ws?.readyState === WebSocket.OPEN);
    console.log('[CallContext] user:', user);
    
    if (!incomingCall || !ws || !user) {
      console.error('[CallContext] No incoming call or WebSocket not connected');
      return;
    }

    // If it's a group call, use joinGroupCall instead
    if (incomingCall.isGroupCall && incomingCall.callId) {
      console.log('[CallContext] Accepting group call - redirecting to joinGroupCall');
      setIncomingCall(null); // Clear the modal first
      await joinGroupCall(
        incomingCall.callId,
        incomingCall.groupId!,
        incomingCall.groupName!,
        incomingCall.callType
      );
      return;
    }

    console.log('[CallContext] Accepting call');
    
    // IMMEDIATE ringtone stop - use the comprehensive stopAllRingtones function
    console.log('[CallContext] 🔇 FORCE STOPPING ALL RINGTONES - Call accepted');
    stopAllRingtones();

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

      // Use existing peerConnection from incomingCall (already setup)
      const peerConnection = incomingCall.peerConnection;
      if (!peerConnection) {
        throw new Error('No peerConnection found in incoming call');
      }

      // Add local stream to existing peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      console.log('[CallContext] Added local stream to existing peerConnection');

      // Setup remote stream handler for receiver
      peerConnection.ontrack = (event) => {
        console.log('[CallContext] 📡 RECEIVER: Received remote stream');
        const remoteStream = event.streams[0];
        console.log('[CallContext] 📡 RECEIVER: Remote stream details:', {
          id: remoteStream.id,
          active: remoteStream.active,
          audioTracks: remoteStream.getAudioTracks().length,
          videoTracks: remoteStream.getVideoTracks().length
        });
        
        // Store remote stream globally for AudioCall component
        console.log('[CallContext] 📡 RECEIVER: Storing remote stream globally');
        setRemoteAudioStream(remoteStream);
        
        // Stop waiting tone when remote audio stream is received
        console.log('[CallContext] Remote audio received - stopping waiting tone');
        stopWaitingTone();
        
        // Find and setup audio element for remote stream
        setTimeout(() => {
          const audioElement = document.querySelector('#remoteAudio') as HTMLAudioElement;
          if (audioElement) {
            audioElement.srcObject = remoteStream;
            audioElement.volume = 1.0;
            audioElement.play().then(() => {
              console.log('[CallContext] ✅ RECEIVER: Remote audio playing successfully');
            }).catch(e => {
              console.log('[CallContext] RECEIVER: Remote audio autoplay failed:', e);
            });
          } else {
            console.log('[CallContext] ❌ RECEIVER: Remote audio element not found');
          }
        }, 100);
      };

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
        payload: {
          callId: incomingCall.callId,
          toUserId: incomingCall.peerUserId,
          fromUserId: user.id,
        }
      }));

      // If it's a group call, send join notification
      if (incomingCall.isGroupCall) {
        console.log('[CallContext] Joining group call:', incomingCall.callId);
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'join_group_call',
            payload: {
              callId: incomingCall.callId,
              groupId: incomingCall.groupId,
              fromUserId: user.id
            }
          }));
          console.log('[CallContext] Sent join group call message for accepted call');
        }, 200);
      }

      // Store callId and peerUserId before clearing incomingCall
      const callId = incomingCall.callId;
      const peerUserId = incomingCall.peerUserId;

      // Send ready signal after a short delay to ensure everything is set up
      setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          console.log('[CallContext] 📤 Sending WebRTC ready signal to caller:', peerUserId);
          ws.send(JSON.stringify({
            type: 'webrtc_ready',
            payload: {
              callId: callId,
              toUserId: peerUserId,
            }
          }));
          console.log('[CallContext] ✅ WebRTC ready signal sent successfully');
        } else {
          console.error('[CallContext] ❌ Cannot send WebRTC ready - WebSocket not connected');
        }
      }, 200);

      // Store callType before clearing incomingCall
      const callType = incomingCall.callType;
      
      // Navigate to call interface with a small delay to ensure state is set
      setTimeout(() => {
        setLocation(callType === 'video' ? '/video-call' : '/audio-call');
      }, 100);

    } catch (error: any) {
      console.error('[CallContext] Error accepting call:', error);
    }
  };

  const rejectCall = () => {
    if (!incomingCall || !ws || !user) {
      console.error('[CallContext] No incoming call or WebSocket not connected');
      return;
    }

    console.log('[CallContext] Rejecting call');
    
    // FORCE STOP ALL WAITING TONES AND RINGTONES IMMEDIATELY
    console.log('[CallContext] FORCE STOPPING ALL RINGTONES - reject call');
    stopAllRingtones();
    stopWaitingTone();
    
    // Additional comprehensive audio cleanup for reject
    if (waitingToneInterval) {
      clearInterval(waitingToneInterval);
      setWaitingToneInterval(null);
      console.log('[CallContext] ✅ Waiting tone interval cleared on reject');
    }
    
    // Stop any running audio contexts or oscillators
    if (audioContext) {
      try {
        audioContext.close();
        setAudioContext(null);
        console.log('[CallContext] ✅ Audio context closed on reject');
      } catch (e) {
        console.log('[CallContext] Audio context already closed');
      }
    }

    // Stop ringtone when call is rejected
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }

    // Send call rejection message
    ws.send(JSON.stringify({
      type: 'reject_call',
      payload: {
        callId: incomingCall.callId,
        toUserId: incomingCall.peerUserId,
        fromUserId: user.id,
      }
    }));

    setIncomingCall(null);
  };

  const hangupCall = () => {
    console.log('[CallContext] Hanging up call - start');
    
    // FORCE STOP ALL WAITING TONES AND RINGTONES IMMEDIATELY
    console.log('[CallContext] FORCE STOPPING ALL RINGTONES - hangup call');
    stopAllRingtones();
    stopWaitingTone();
    
    // Additional comprehensive audio cleanup for hangup
    if (waitingToneInterval) {
      clearInterval(waitingToneInterval);
      setWaitingToneInterval(null);
      console.log('[CallContext] ✅ Waiting tone interval cleared on hangup');
    }
    
    // Clear stored interval ID for waiting tone
    if ((window as any).__waitingToneIntervalId) {
      console.log('[CallContext] Clearing stored waiting tone interval on hangup');
      clearInterval((window as any).__waitingToneIntervalId);
      (window as any).__waitingToneIntervalId = null;
    }
    
    // Stop any running audio contexts or oscillators
    if (audioContext) {
      try {
        audioContext.close();
        setAudioContext(null);
        console.log('[CallContext] ✅ Audio context closed on hangup');
      } catch (e) {
        console.log('[CallContext] Audio context already closed');
      }
    }
    
    // Force stop all audio elements on the page
    try {
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach((audio: HTMLAudioElement) => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0;
        audio.muted = true;
      });
      console.log('[CallContext] ✅ All page audio elements forcefully stopped on hangup');
    } catch (e) {
      console.log('[CallContext] Error stopping all audio elements:', e);
    }
    
    // Stop ringtone when call is ended
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }
    
    try {
      // Stop local media stream safely
      if (activeCall?.localStream) {
        console.log('[CallContext] Stopping local media tracks');
        activeCall.localStream.getTracks().forEach(track => {
          try {
            track.stop();
            console.log('[CallContext] Stopped local track:', track.kind);
          } catch (err) {
            console.warn('[CallContext] Error stopping local track:', err);
          }
        });
      }

      // Clean up all remote audio elements for group calls
      if (activeCall?.isGroupCall && activeCall?.participants) {
        console.log('[CallContext] Cleaning up group call audio elements');
        activeCall.participants.forEach(participant => {
          const audioElement = document.getElementById(`groupAudio-${participant.userId}`);
          if (audioElement) {
            try {
              const audioEl = audioElement as HTMLAudioElement;
              // Stop the audio stream
              if (audioEl.srcObject) {
                const stream = audioEl.srcObject as MediaStream;
                stream.getTracks().forEach(track => {
                  track.stop();
                  console.log('[CallContext] Stopped remote audio track for participant:', participant.userId);
                });
                audioEl.srcObject = null;
              }
              // Remove the audio element
              audioElement.remove();
              console.log('[CallContext] Removed audio element for participant:', participant.userId);
            } catch (err) {
              console.warn('[CallContext] Error cleaning up audio for participant:', participant.userId, err);
            }
          }
        });
      }

      // Clean up any remaining group audio elements
      const allGroupAudioElements = document.querySelectorAll('[id^="groupAudio-"]');
      allGroupAudioElements.forEach(element => {
        try {
          const audioEl = element as HTMLAudioElement;
          if (audioEl.srcObject) {
            const stream = audioEl.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            audioEl.srcObject = null;
          }
          element.remove();
          console.log('[CallContext] Cleaned up remaining group audio element');
        } catch (err) {
          console.warn('[CallContext] Error cleaning up remaining audio element:', err);
        }
      });

      // Clean up any remaining group video elements
      const allGroupVideoElements = document.querySelectorAll('[id^="groupVideo-"]');
      allGroupVideoElements.forEach(element => {
        try {
          const videoEl = element as HTMLVideoElement;
          if (videoEl.srcObject) {
            const stream = videoEl.srcObject as MediaStream;
            stream.getTracks().forEach(track => {
              track.stop();
              console.log('[CallContext] Stopped video track:', track.kind);
            });
            videoEl.srcObject = null;
          }
          element.remove();
          console.log('[CallContext] Cleaned up remaining group video element');
        } catch (err) {
          console.warn('[CallContext] Error cleaning up remaining video element:', err);
        }
      });

      // Force cleanup of all video elements that might still have active streams
      const allVideoElements = document.querySelectorAll('video');
      allVideoElements.forEach(videoEl => {
        try {
          if (videoEl.srcObject) {
            const stream = videoEl.srcObject as MediaStream;
            stream.getTracks().forEach(track => {
              if (track.readyState !== 'ended') {
                track.stop();
                console.log('[CallContext] Force stopped remaining video track:', track.kind);
              }
            });
            videoEl.srcObject = null;
            videoEl.load(); // Force reload
          }
        } catch (err) {
          console.warn('[CallContext] Error force cleaning video element:', err);
        }
      });

      // Send call end message safely
      if (ws && ws.readyState === WebSocket.OPEN && activeCall && user) {
        try {
          // Check if it's a group call
          if (activeCall.isGroupCall) {
            console.log('[CallContext] Ending group call:', activeCall.callId);
            ws.send(JSON.stringify({
              type: 'end_call',
              payload: {
                callId: activeCall.callId,
                fromUserId: user.id,
                isGroupCall: true,
                groupId: activeCall.groupId
              }
            }));
          } else {
            // Regular 1-on-1 call
            ws.send(JSON.stringify({
              type: 'end_call',
              payload: {
                callId: activeCall.callId,
                toUserId: activeCall.peerUserId,
                fromUserId: user.id,
              }
            }));
          }
        } catch (err) {
          console.warn('[CallContext] Error sending end call message:', err);
        }
      }

      // Clear call state and navigate back to chat
      setActiveCall(null);
      setRemoteAudioStream(null);
      setIncomingCall(null);
      
      // Additional cleanup - request browser to release all media devices
      setTimeout(() => {
        try {
          // Force stop all active media tracks by accessing global MediaStreamTrack objects
          if (window.navigator?.mediaDevices) {
            console.log('[CallContext] Requesting media device cleanup');
          }
        } catch (err) {
          console.warn('[CallContext] Media device cleanup warning:', err);
        }
      }, 200);
      
      setLocation('/chat');
      
      console.log('[CallContext] Call ended successfully, all audio streams stopped, navigated back to chat');
      
    } catch (error) {
      console.error('[CallContext] Error during hangup:', error);
      // Still clear the call state even if there's an error
      setActiveCall(null);
      setLocation('/chat');
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
    console.log('[CallContext] 🔥 SWITCH CAMERA FUNCTION CALLED!');
    console.log('[CallContext] Current activeCall:', activeCall);
    console.log('[CallContext] Has localStream:', !!activeCall?.localStream);
    console.log('[CallContext] Call type:', activeCall?.callType);
    
    if (!activeCall?.localStream || activeCall.callType !== 'video') {
      console.log('[CallContext] No active video call or stream available');
      return;
    }

    try {
      console.log('[CallContext] Starting camera switch...');
      
      // Mobile device detection and debugging
      const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const debugInfo = `Device: ${isMobileDevice ? 'Mobile' : 'Desktop'}\nUser Agent: ${navigator.userAgent.slice(0, 80)}...`;
      console.log('[CallContext] Device detection:', debugInfo);
      
      if (isMobileDevice) {
        console.log('[CallContext] Mobile device detected, checking permissions...');
        try {
          const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log('[CallContext] Camera permission state:', permissions.state);
          if (permissions.state === 'denied') {
            console.log('[CallContext] Camera permission denied');
            return;
          }
        } catch (permError) {
          console.log('[CallContext] Permission check not supported, continuing...');
        }
      }
      
      // Get current video track
      const currentVideoTrack = activeCall.localStream.getVideoTracks()[0];
      if (!currentVideoTrack) {
        console.log('[CallContext] No video track found in current stream');
        return;
      }

      // Get current settings to determine which camera is active
      const currentSettings = currentVideoTrack.getSettings();
      const currentFacingMode = currentSettings.facingMode;
      console.log('[CallContext] Current camera facingMode:', currentFacingMode);

      // Enumerate available video devices with mobile debugging
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('[CallContext] Available video devices:', videoDevices.length);
      
      // Log camera info for debugging
      console.log(`[CallContext] Mobile device camera detection: ${videoDevices.length} cameras found`);
      
      videoDevices.forEach((device, index) => {
        console.log(`[CallContext] Camera ${index + 1}:`, {
          label: device.label,
          deviceId: device.deviceId.slice(0, 8),
          groupId: device.groupId?.slice(0, 8)
        });
      });

      // Check camera count for switching strategy
      if (videoDevices.length <= 1) {
        console.log('[CallContext] Only one camera detected');
        
        if (isMobileDevice) {
          console.log('[CallContext] Mobile device detected - attempting force switch');
          // On mobile, try to switch even with 1 detected camera
          // Some mobile browsers don't properly enumerate all cameras
        } else {
          console.log('[CallContext] Desktop device - cannot switch with only 1 camera');
          return;
        }
      } else {
        console.log(`[CallContext] ${videoDevices.length} cameras detected - normal switch`);
      }

      // NEW STRATEGY: For HP with 4 cameras, specifically target back camera
      let nextFacingMode: string;
      let targetDeviceId: string | undefined;
      let rearCameras: MediaDeviceInfo[] = [];
      let frontCameras: MediaDeviceInfo[] = [];
      
      if (videoDevices.length > 1) {
        // Multiple cameras detected - ENHANCED STRATEGY for 4-camera phones
        const currentDeviceId = currentSettings.deviceId;
        console.log('[CallContext] Current device ID:', currentDeviceId?.slice(0, 8));
        
        // ENHANCED: Find ALL possible rear cameras - be MORE SELECTIVE
        rearCameras = videoDevices.filter(device => {
          const label = device.label.toLowerCase();
          return (
            label.includes('back') || 
            label.includes('rear') || 
            label.includes('environment') ||
            (label.includes('camera') && (label.includes('2') || label.includes('0'))) ||
            // Exclude definite front cameras
            (!label.includes('front') && !label.includes('user') && !label.includes('selfie') && !label.includes('1'))
          );
        });
        
        // Find front cameras
        frontCameras = videoDevices.filter(device => 
          device.label.toLowerCase().includes('front') || 
          device.label.toLowerCase().includes('user') ||
          device.label.toLowerCase().includes('selfie') ||
          device.label.toLowerCase().includes('1') // Sometimes front is camera1
        );
        
        // Log camera analysis for debugging (console only)
        console.log('[CallContext] Camera Analysis:');
        console.log('Rear cameras:', rearCameras.map(c => c.label));
        console.log('Front cameras:', frontCameras.map(c => c.label));
        
        // Choose primary cameras
        const rearCamera = rearCameras[0]; // Take first rear camera
        const frontCamera = frontCameras[0]; // Take first front camera
        
        // Determine if current camera is front or back
        const isCurrentlyFront = currentFacingMode === 'user' || 
                                currentSettings.deviceId === frontCamera?.deviceId;
        
        if (isCurrentlyFront && rearCamera) {
          // Switch TO rear camera
          nextFacingMode = 'environment';
          targetDeviceId = rearCamera.deviceId;
          console.log('[CallContext] Switching TO rear camera:', rearCamera.label, 'ID:', targetDeviceId?.slice(0, 8));
        } else if (!isCurrentlyFront && frontCamera) {
          // Switch TO front camera
          nextFacingMode = 'user';
          targetDeviceId = frontCamera.deviceId;
          console.log('[CallContext] Switching TO front camera:', frontCamera.label, 'ID:', targetDeviceId?.slice(0, 8));
        } else {
          // Fallback: cycle through devices
          const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
          const nextIndex = (currentIndex + 1) % videoDevices.length;
          const nextDevice = videoDevices[nextIndex];
          nextFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
          targetDeviceId = nextDevice.deviceId;
          console.log('[CallContext] Fallback cycling to device:', nextDevice.label);
        }
      } else {
        // Single camera or mobile force switch - toggle facing mode
        nextFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        console.log('[CallContext] Force switching from facingMode:', currentFacingMode, 'to:', nextFacingMode);
        
        if (isMobileDevice && nextFacingMode === 'environment') {
          console.log('[CallContext] 📱 Attempting to access rear camera on mobile device');
        }
        
        // For single camera devices, still try to populate camera arrays
        if (nextFacingMode === 'environment') {
          rearCameras = videoDevices; // Assume current device might be rear
        } else {
          frontCameras = videoDevices; // Assume current device might be front
        }
      }

      // For mobile devices with rear camera attempt, use more specific constraints
      const isMobileRearCamera = isMobileDevice && nextFacingMode === 'environment';
      console.log('[CallContext] Is mobile rear camera attempt:', isMobileRearCamera);

      // Get new video stream with 4-tier fallback system (like CameraTestSimple)
      let newVideoStream: MediaStream;
      let newVideoTrack: MediaStreamTrack;
      
      // SIMPLIFIED STRATEGY: Focus on basic rear camera access
      const strategies = [];
      
      if (isMobileRearCamera) {
        console.log('[CallContext] Attempting rear camera access with simplified strategies');
        
        // Strategy 1: Just exact environment - paling basic
        strategies.push({
          video: { facingMode: { exact: 'environment' } }
        });
        
        // Strategy 2: Basic environment tanpa exact
        strategies.push({
          video: { facingMode: 'environment' }
        });
        
        // Strategy 3: Try specific device IDs jika ada
        if (rearCameras && rearCameras.length > 0) {
          rearCameras.forEach((camera) => {
            strategies.push({
              video: { deviceId: { exact: camera.deviceId } }
            });
          });
        }
        
        // Strategy 4: Force rear with minimal constraints
        strategies.push({
          video: { 
            facingMode: { exact: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        
      } else {
        // Front camera strategies (keep simple)
        if (targetDeviceId) {
          strategies.push({
            video: { deviceId: { exact: targetDeviceId } }
          });
        }
        
        strategies.push({
          video: { facingMode: { exact: 'user' } }
        });
        
        strategies.push({
          video: { facingMode: 'user' }
        });
      }
      
      // Always add fallback
      strategies.push({
        video: true
      });

      let lastError: Error | null = null;
      let strategySucceeded = false;

      for (const [index, strategy] of strategies.entries()) {
        try {
          console.log(`[CallContext] Trying camera switch strategy ${index + 1} for ${isMobileRearCamera ? 'rear' : 'front'} camera:`, strategy);
          
          newVideoStream = await navigator.mediaDevices.getUserMedia(strategy);
          newVideoTrack = newVideoStream.getVideoTracks()[0];
          console.log(`[CallContext] Strategy ${index + 1} SUCCESS! Got video track:`, newVideoTrack.id);
          
          // Log success for debugging
          const newSettings = newVideoTrack.getSettings();
          const cameraType = newSettings.facingMode === 'environment' ? 'rear' : 
                            newSettings.facingMode === 'user' ? 'front' : 'unknown';
          console.log(`[CallContext] Camera switch successful - Type: ${cameraType}, Resolution: ${newSettings.width}x${newSettings.height}`);
          
          strategySucceeded = true;
          break;
        } catch (err) {
          console.log(`[CallContext] Strategy ${index + 1} failed:`, err);
          lastError = err as Error;
          
          // Debug: show which strategy failed for mobile users
          if (isMobileDevice && isMobileRearCamera) {
            const errorName = (err as Error).name || 'Unknown';
            console.log(`[CallContext] Mobile strategy ${index + 1} error: ${errorName}`);
          }
        }
      }

      if (!strategySucceeded || !newVideoStream) {
        // Log failure for debugging and show simple error message
        console.error('[CallContext] Camera switch failed:', lastError);
        if (isMobileDevice && isMobileRearCamera) {
          // Only show simple message for rear camera failures on mobile
          console.log('[CallContext] Rear camera access blocked - falling back to front camera');
        }
        throw lastError || new Error('Semua strategi camera switch gagal');
      }

      // Replace video track in peer connection with safety checks
      if (activeCall.peerConnection && typeof activeCall.peerConnection.getSenders === 'function') {
        try {
          const senders = activeCall.peerConnection.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender && typeof videoSender.replaceTrack === 'function') {
            await videoSender.replaceTrack(newVideoTrack);
            console.log('[CallContext] Video track replaced in peer connection');
          } else {
            console.log('[CallContext] No video sender found in peer connection');
          }
        } catch (error) {
          console.error('[CallContext] Error replacing track in peer connection:', error);
        }
      } else {
        console.log('[CallContext] No valid peer connection available for track replacement');
      }

      // Remove old track from local stream and add new one
      activeCall.localStream.removeTrack(currentVideoTrack);
      activeCall.localStream.addTrack(newVideoTrack);
      
      // Stop the old track
      currentVideoTrack.stop();
      
      // Update activeCall state with new stream
      setActiveCall(prev => prev ? {
        ...prev,
        localStream: activeCall.localStream
      } : null);

      console.log('[CallContext] Camera switch completed successfully');

    } catch (error) {
      console.error('[CallContext] Error switching camera:', error);
      
      // Show user-friendly error message with mobile-specific tips
      let errorMessage = 'Gagal mengganti kamera: ';
      if (error instanceof Error && error.name === 'NotAllowedError') {
        errorMessage += 'Izin kamera diperlukan. Buka Pengaturan browser → Izin situs → Kamera → Izinkan.';
      } else if (error instanceof Error && error.name === 'NotFoundError') {
        errorMessage += nextFacingMode === 'environment' 
          ? 'Kamera belakang tidak ditemukan. HP ini mungkin hanya memiliki kamera depan.'
          : 'Kamera depan tidak ditemukan.';
      } else if (error instanceof Error && error.name === 'NotReadableError') {
        errorMessage += 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi kamera lain dan coba lagi.';
      } else if (error instanceof Error && error.name === 'OverconstrainedError') {
        errorMessage += 'Kamera tidak mendukung resolusi yang diminta. Coba restart browser.';
      } else {
        errorMessage += error instanceof Error ? error.message : 'Error tidak diketahui. Coba restart browser atau HP.';
      }
      
      console.log('[CallContext] Camera switch error details:', error);
      alert(errorMessage);
    }
  };

  // Start group call function
  const startGroupCall = async (groupId: number, groupName: string, callType: 'audio' | 'video') => {
    console.log('[CallContext] Starting group call:', { groupId, groupName, callType });
    
    if (!user || !ws) {
      console.error('[CallContext] Cannot start group call - user not authenticated or WebSocket not connected');
      alert('Tidak dapat memulai panggilan grup. Pastikan Anda terhubung ke server.');
      return;
    }

    try {
      // Check mobile compatibility
      const { isMobile, isHTTPS, hasMediaDevices } = checkMobileCompatibility();
      console.log('[CallContext] Mobile compatibility check for group call:', { isMobile, isHTTPS, hasMediaDevices });

      if (!hasMediaDevices) {
        throw new Error('Media devices not supported');
      }

      // Full audio and video enabled from start for group calls
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user' // Front camera for group calls
        }
      };

      console.log('[CallContext] Requesting full media permissions for group call (audio + video enabled)...');
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[CallContext] Got audio and video stream for group call - full media enabled from start');

      const callId = `group_call_${Date.now()}_${groupId}_${user.id}`;

      // Enhanced RTCPeerConnection for group calls with better stability
      const peerConnection = new RTCPeerConnection({
        iceServers: [], // Empty array for local intranet operation
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 10, // Pre-gather candidates for faster connection
        iceGatheringTimeout: 5000  // Reduce gathering timeout
      });

      // Enhanced connection state monitoring for group calls
      peerConnection.onconnectionstatechange = () => {
        console.log('[CallContext] Group call connection state:', peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          console.log('[CallContext] ✅ Group call WebRTC connection established successfully');
          setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          console.log('[CallContext] ❌ Group call connection failed/disconnected - attempting recovery');
          
          // Auto-recovery for failed connections
          setTimeout(() => {
            if (peerConnection.connectionState === 'failed') {
              console.log('[CallContext] Restarting ICE for group call recovery...');
              peerConnection.restartIce();
            }
          }, 2000);
        }
      };

      // Enhanced ICE connection state monitoring with timeout
      peerConnection.oniceconnectionstatechange = () => {
        console.log('[CallContext] Group call ICE connection state:', peerConnection.iceConnectionState);
        
        if (peerConnection.iceConnectionState === 'checking') {
          setActiveCall(prev => prev ? { ...prev, status: 'calling' } : null);
          
          // Set timeout for checking state - auto-recovery if stuck
          setTimeout(() => {
            if (peerConnection.iceConnectionState === 'checking') {
              console.log('[CallContext] ICE checking timeout - attempting restart');
              peerConnection.restartIce();
            }
          }, 15000); // 15 second timeout
          
        } else if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
          console.log('[CallContext] ✅ Group call ICE connection established successfully');
          setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        } else if (peerConnection.iceConnectionState === 'failed') {
          console.log('[CallContext] ❌ ICE connection failed - attempting immediate recovery');
          setTimeout(() => {
            console.log('[CallContext] Executing ICE restart for failed connection');
            peerConnection.restartIce();
          }, 1000);
        } else if (peerConnection.iceConnectionState === 'disconnected') {
          console.log('[CallContext] ICE disconnected - monitoring for reconnection');
          setTimeout(() => {
            if (peerConnection.iceConnectionState === 'disconnected') {
              console.log('[CallContext] ICE still disconnected - attempting restart');
              peerConnection.restartIce();
            }
          }, 5000);
        }
      };

      // Enhanced ICE candidate gathering with timeout
      peerConnection.onicegatheringstatechange = () => {
        console.log('[CallContext] ICE gathering state:', peerConnection.iceGatheringState);
        
        if (peerConnection.iceGatheringState === 'complete') {
          console.log('[CallContext] ✅ ICE candidate gathering completed for group call');
        }
      };

      // Add ontrack event for receiving remote streams
      peerConnection.ontrack = (event) => {
        console.log('[CallContext] ✅ Received remote track for group call:', event.track.kind);
        const [remoteStream] = event.streams;
        
        if (remoteStream) {
          setActiveCall(prev => {
            if (prev?.isGroupCall) {
              const newRemoteStreams = new Map(prev.remoteStreams);
              newRemoteStreams.set(Date.now(), remoteStream);
              return { ...prev, remoteStreams: newRemoteStreams };
            }
            return prev;
          });
        }
      };

      // Add local stream to peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
        console.log('[CallContext] Added local track to group call:', track.kind);
      });

      // Set up group call state
      const groupCallState: CallState = {
        callId,
        callType,
        status: 'calling',
        isIncoming: false,
        localStream,
        remoteStreams: new Map(),
        peerConnection,
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

      // Send group call invitation to server
      ws.send(JSON.stringify({
        type: 'start_group_call',
        payload: {
          callId,
          groupId,
          groupName,
          callType,
          fromUserId: user.id,
          fromUserName: user.callsign || user.fullName || 'Unknown'
        }
      }));

      console.log('[CallContext] Group call invitation sent');
      
      // Auto-join the group call as the initiator
      setTimeout(() => {
        const joinMessage = {
          type: 'join_group_call',
          payload: {
            callId,
            groupId,
            fromUserId: user.id
          }
        };
        
        ws.send(JSON.stringify(joinMessage));
        console.log('[CallContext] Auto-joined group call as initiator:', joinMessage);
      }, 500); // Small delay to ensure call is created first

      // Note: Participant detection now works through automatic group_call_participants_update
      // No need for manual request_group_participants messages

      // Navigate to appropriate group call interface based on call type
      setTimeout(() => {
        if (callType === 'video') {
          setLocation('/group-video-call');
        } else {
          setLocation('/group-call');
        }
      }, 100);

    } catch (error: any) {
      console.error('[CallContext] Error starting group call:', error);
      alert(getMobileErrorMessage(error).replace('Gagal memulai panggilan', 'Gagal memulai panggilan grup'));
    }
  };

  // Join an existing group call
  const joinGroupCall = async (callId: string, groupId: number, groupName: string, callType: 'audio' | 'video') => {
    try {
      console.log('[CallContext] Joining existing group call:', { callId, groupId, groupName, callType });
      
      if (!user?.id || !ws) {
        throw new Error('User not authenticated or WebSocket not connected');
      }

      // Try to reuse existing stream from incoming call if available, otherwise create new one
      let localStream: MediaStream;
      
      if (incomingCall?.localStream) {
        console.log('[CallContext] Reusing existing stream from incoming call - preserving video state');
        localStream = incomingCall.localStream;
        
        // Ensure video track is enabled if it exists
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          console.log('[CallContext] ✅ Video track enabled from existing stream for group call');
        }
      } else {
        // Create new stream with full media enabled
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1
          },
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: 'user' // Front camera for group calls
          }
        };

        console.log('[CallContext] Creating new stream for joining group call (audio + video enabled)...');
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('[CallContext] Got new audio and video stream for joining group call - full media enabled from start');
      }

      // Enhanced RTCPeerConnection for joining group calls
      const peerConnection = new RTCPeerConnection({
        iceServers: [], // Empty array for local intranet operation
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 10,
        iceGatheringTimeout: 5000
      });

      // Connection monitoring for joining group call
      peerConnection.onconnectionstatechange = () => {
        console.log('[CallContext] Join group call connection state:', peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          console.log('[CallContext] ✅ Successfully joined group call');
          setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        } else if (peerConnection.connectionState === 'failed') {
          console.log('[CallContext] ❌ Failed to join group call - attempting recovery');
          setTimeout(() => peerConnection.restartIce(), 2000);
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('[CallContext] Join group call ICE state:', peerConnection.iceConnectionState);
      };

      // Add local stream to peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
        console.log('[CallContext] Added local track for joining group call:', track.kind);
      });

      // Set up group call state
      const groupCallState: CallState = {
        callId,
        callType,
        status: 'connected',
        isIncoming: false,
        localStream,
        remoteStreams: new Map(),
        peerConnection,
        audioEnabled: true,
        videoEnabled: callType === 'video',
        isMuted: false,
        startTime: new Date(),
        isGroupCall: true,
        groupId,
        groupName,
        participants: []
      };

      // Set active call state immediately for immediate participant sync
      setActiveCall(groupCallState);
      console.log('[CallContext] Active call state set for group:', groupId, 'callId:', callId);
      
      // Check for pending participant updates that arrived before activeCall was set
      setTimeout(() => {
        const pendingUpdate = localStorage.getItem('pendingParticipantUpdate');
        if (pendingUpdate) {
          try {
            const updateData = JSON.parse(pendingUpdate);
            const updateParts = updateData.callId.split('_');
            const updateGroupId = updateParts[2];
            
            if (updateGroupId === String(groupId)) {
              console.log('[CallContext] Processing pending participant update:', updateData);
              handleGroupCallParticipantsUpdate({ payload: updateData });
              localStorage.removeItem('pendingParticipantUpdate');
            }
          } catch (error) {
            console.error('[CallContext] Error processing pending participant update:', error);
          }
        }
      }, 100);

      // Send join message to server
      setTimeout(() => {
        const joinMessage = {
          type: 'join_group_call',
          payload: {
            callId,
            groupId,
            fromUserId: user.id
          }
        };
        
        ws.send(JSON.stringify(joinMessage));
        console.log('[CallContext] Sent join group call message for recipient:', joinMessage);
      }, 400); // Delay to ensure call state is set

      console.log('[CallContext] Joined group call successfully');
      console.log('[CallContext] Active call state after joining:', groupCallState);

      // Process any pending participant updates that arrived before activeCall was created
      console.log('[CallContext] 📊 Processing pending participant updates after join...');
      setTimeout(() => {
        // Force request participant update after joining
        const requestParticipantsMessage = {
          type: 'request_group_participants',
          payload: {
            callId,
            groupId,
            requestingUserId: user.id
          }
        };
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(requestParticipantsMessage));
          console.log('[CallContext] 📊 Requested updated participant list:', requestParticipantsMessage);
        }
      }, 500); // Wait for join to complete
      
      // Also immediately trigger WebRTC setup for current participants
      setTimeout(async () => {
        try {
          // Get updated participant names from server
          const response = await fetch('/api/all-users');
          const allUsers = await response.json();
          
          // Create user map for name lookups
          const userMap = new Map();
          allUsers.forEach((user: any) => {
            userMap.set(user.id, user.callsign || user.fullName || `User ${user.id}`);
          });
          
          // Dispatch event to GroupVideoCall to start WebRTC connections
          window.dispatchEvent(new CustomEvent('force-webrtc-init', {
            detail: {
              callId: groupCallState.callId,
              groupId: groupCallState.groupId,
              currentUserId: user.id,
              userMap
            }
          }));
          
          console.log('[CallContext] 🚀 Triggered WebRTC initialization for group call');
        } catch (error) {
          console.error('[CallContext] Error triggering WebRTC init:', error);
        }
      }, 1000);

      // Store the call state in localStorage to persist through navigation
      localStorage.setItem('activeGroupCall', JSON.stringify({
        callId: groupCallState.callId,
        groupId: groupCallState.groupId,
        groupName: groupCallState.groupName,
        callType: groupCallState.callType
      }));

      // Navigate to appropriate group call interface based on call type
      setTimeout(() => {
        if (callType === 'video') {
          setLocation('/group-video-call');
        } else {
          setLocation('/group-call');
        }
      }, 200);

    } catch (error: any) {
      console.error('[CallContext] Error joining group call:', error);
      // Only show alert for critical errors, not connection issues
      if (error.name === 'NotAllowedError' || error.name === 'NotFoundError' || error.name === 'NotSupportedError') {
        alert(getMobileErrorMessage(error).replace('Gagal memulai panggilan', 'Gagal bergabung ke panggilan grup'));
      } else {
        console.log('[CallContext] Non-critical error, continuing with call setup');
      }
    }
  };

  // Monitor state changes with useEffect
  useEffect(() => {
    console.log('[CallContext] 🔥 INCOMING CALL STATE CHANGED:', incomingCall);
    if (incomingCall) {
      console.log('[CallContext] 🔥 INCOMING CALL DETAILS:', {
        callId: incomingCall.callId,
        groupName: incomingCall.groupName,
        callType: incomingCall.callType,
        isGroupCall: incomingCall.isGroupCall
      });
    }
  }, [incomingCall]);

  // Debug logging for Context Provider value
  console.log('[CallContext] 🔥 PROVIDER VALUE UPDATE:', {
    incomingCall: incomingCall,
    activeCall: activeCall,
    hasIncomingCall: !!incomingCall,
    incomingCallId: incomingCall?.callId
  });

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
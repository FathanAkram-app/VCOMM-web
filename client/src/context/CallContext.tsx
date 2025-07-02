import { createContext, ReactNode } from 'react';

// Minimal call context to prevent React hook errors during login
// Full functionality will be restored after authentication system is stable

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
  // Minimal provider to prevent React hook crashes
  const contextValue: CallContextType = {
    activeCall: null,
    incomingCall: null,
    remoteAudioStream: null,
    ws: null,
    startCall: () => console.log('Call functionality temporarily disabled'),
    startGroupCall: () => console.log('Group call functionality temporarily disabled'),
    acceptCall: () => console.log('Accept call functionality temporarily disabled'),
    rejectCall: () => console.log('Reject call functionality temporarily disabled'),
    hangupCall: () => console.log('Hangup call functionality temporarily disabled'),
    toggleCallAudio: () => console.log('Toggle audio functionality temporarily disabled'),
    toggleCallVideo: () => console.log('Toggle video functionality temporarily disabled'),
    toggleMute: () => console.log('Toggle mute functionality temporarily disabled'),
    switchCallCamera: () => console.log('Switch camera functionality temporarily disabled')
  };

  return (
    <CallContext.Provider value={contextValue}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = CallContext;
  if (context === undefined) {
    // Return default empty values if context not available
    return {
      activeCall: null,
      incomingCall: null,
      remoteAudioStream: null,
      ws: null,
      startCall: () => {},
      startGroupCall: () => {},
      acceptCall: () => {},
      rejectCall: () => {},
      hangupCall: () => {},
      toggleCallAudio: () => {},
      toggleCallVideo: () => {},
      toggleMute: () => {},
      switchCallCamera: () => {}
    };
  }
  return context;
}
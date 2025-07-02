import { createContext, ReactNode } from 'react';

// Simple minimal call context to avoid React hook issues during login
interface SimpleCallContextType {
  activeCall: null;
  incomingCall: null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isMuted: boolean;
  startCall: () => void;
  startVideoCall: () => void;
  startGroupCall: () => void;
  acceptCall: () => void;
  rejectCall: () => void;
  hangupCall: () => void;
  toggleCallAudio: () => void;
  toggleCallVideo: () => void;
  toggleMute: () => void;
  switchCallCamera: () => void;
}

const SimpleCallContext = createContext<SimpleCallContextType | undefined>(undefined);

export function SimpleCallProvider({ children }: { children: ReactNode }) {
  const contextValue: SimpleCallContextType = {
    activeCall: null,
    incomingCall: null,
    isAudioEnabled: true,
    isVideoEnabled: false,
    isMuted: false,
    startCall: () => console.log('Call functionality disabled during login'),
    startVideoCall: () => console.log('Video call functionality disabled during login'),
    startGroupCall: () => console.log('Group call functionality disabled during login'),
    acceptCall: () => console.log('Accept call functionality disabled during login'),
    rejectCall: () => console.log('Reject call functionality disabled during login'),
    hangupCall: () => console.log('Hangup call functionality disabled during login'),
    toggleCallAudio: () => console.log('Toggle audio functionality disabled during login'),
    toggleCallVideo: () => console.log('Toggle video functionality disabled during login'),
    toggleMute: () => console.log('Toggle mute functionality disabled during login'),
    switchCallCamera: () => console.log('Switch camera functionality disabled during login')
  };

  return (
    <SimpleCallContext.Provider value={contextValue}>
      {children}
    </SimpleCallContext.Provider>
  );
}

export function useSimpleCall() {
  const context = SimpleCallContext;
  if (context === undefined) {
    return {
      activeCall: null,
      incomingCall: null,
      isAudioEnabled: true,
      isVideoEnabled: false,
      isMuted: false,
      startCall: () => {},
      startVideoCall: () => {},
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
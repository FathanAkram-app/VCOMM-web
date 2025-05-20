import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useWebSocket } from './WebSocketContext';

interface GroupCallState {
  isInCall: boolean;
  isAudioOnly: boolean;
  roomId: number | null;
  roomName: string | null;
  participantCount: number;
  localStream: MediaStream | null;
  participants: Map<string, MediaStream>;
}

interface GroupCallContextType {
  groupCallState: GroupCallState;
  joinGroupCall: (roomId: number, roomName: string, isAudioOnly: boolean) => Promise<boolean>;
  leaveGroupCall: () => void;
  createGroupCall: (roomId: number, roomName: string, isAudioOnly: boolean) => Promise<boolean>;
}

const defaultGroupCallState: GroupCallState = {
  isInCall: false,
  isAudioOnly: false,
  roomId: null,
  roomName: null,
  participantCount: 0,
  localStream: null,
  participants: new Map()
};

export const GroupCallContext = createContext<GroupCallContextType | undefined>(undefined);

interface GroupCallProviderProps {
  children: ReactNode;
}

export function GroupCallProvider({ children }: GroupCallProviderProps) {
  const [groupCallState, setGroupCallState] = useState<GroupCallState>(defaultGroupCallState);
  const { isConnected, sendMessage } = useWebSocket();

  // Fungsi untuk melepaskan dan mengosongkan stream media
  const cleanupMediaStream = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, []);

  // Fungsi untuk membersihkan state setelah call selesai
  const resetCallState = useCallback(() => {
    cleanupMediaStream(groupCallState.localStream);
    
    // Bersihkan semua participant streams
    groupCallState.participants.forEach(stream => {
      cleanupMediaStream(stream);
    });
    
    setGroupCallState(defaultGroupCallState);
  }, [groupCallState, cleanupMediaStream]);

  // Tangani event group call dari WebSocket
  useEffect(() => {
    const handleGroupCallEvent = (event: CustomEvent) => {
      const data = event.detail;
      
      if (data.type === 'group_call_participant_joined') {
        // Seseorang bergabung ke panggilan group
        if (groupCallState.isInCall && groupCallState.roomId === data.roomId) {
          setGroupCallState(prev => ({
            ...prev,
            participantCount: prev.participantCount + 1
          }));
        }
      } else if (data.type === 'group_call_participant_left') {
        // Seseorang meninggalkan panggilan group
        if (groupCallState.isInCall && groupCallState.roomId === data.roomId) {
          // Update jumlah peserta
          setGroupCallState(prev => {
            // Remove participant stream if exists
            const updatedParticipants = new Map(prev.participants);
            if (data.userId && updatedParticipants.has(data.userId.toString())) {
              updatedParticipants.delete(data.userId.toString());
            }
            
            return {
              ...prev,
              participantCount: Math.max(prev.participantCount - 1, 0),
              participants: updatedParticipants
            };
          });
        }
      } else if (data.type === 'group_call_ended') {
        // Panggilan group diakhiri
        if (groupCallState.isInCall && groupCallState.roomId === data.roomId) {
          resetCallState();
        }
      }
    };
    
    // Register event listener
    window.addEventListener('ws-message', handleGroupCallEvent as EventListener);
    
    return () => {
      window.removeEventListener('ws-message', handleGroupCallEvent as EventListener);
    };
  }, [groupCallState, resetCallState]);

  // Function to join an existing group call
  const joinGroupCall = useCallback(async (roomId: number, roomName: string, isAudioOnly: boolean): Promise<boolean> => {
    if (!isConnected || groupCallState.isInCall) return false;
    
    try {
      // Get user media
      const constraints = {
        audio: true,
        video: !isAudioOnly
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Send join group call message to server
      sendMessage({
        type: 'group_call_join',
        roomId,
        callType: isAudioOnly ? 'audio' : 'video'
      });
      
      // Update group call state
      setGroupCallState({
        isInCall: true,
        isAudioOnly,
        roomId,
        roomName,
        participantCount: 1, // Start with just yourself
        localStream: stream,
        participants: new Map()
      });
      
      return true;
    } catch (error) {
      console.error('Error joining group call:', error);
      return false;
    }
  }, [isConnected, groupCallState.isInCall, sendMessage]);

  // Function to leave a group call
  const leaveGroupCall = useCallback(() => {
    if (!groupCallState.isInCall || !groupCallState.roomId) return;
    
    // Send leave message to server
    sendMessage({
      type: 'group_call_leave',
      roomId: groupCallState.roomId
    });
    
    // Reset call state
    resetCallState();
  }, [groupCallState.isInCall, groupCallState.roomId, sendMessage, resetCallState]);

  // Function to create a new group call
  const createGroupCall = useCallback(async (roomId: number, roomName: string, isAudioOnly: boolean): Promise<boolean> => {
    if (!isConnected || groupCallState.isInCall) return false;
    
    try {
      // Get user media
      const constraints = {
        audio: true,
        video: !isAudioOnly
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Send create group call message to server
      sendMessage({
        type: 'group_call_create',
        roomId,
        callType: isAudioOnly ? 'audio' : 'video'
      });
      
      // Update group call state
      setGroupCallState({
        isInCall: true,
        isAudioOnly,
        roomId,
        roomName,
        participantCount: 1, // Start with just yourself
        localStream: stream,
        participants: new Map()
      });
      
      return true;
    } catch (error) {
      console.error('Error creating group call:', error);
      return false;
    }
  }, [isConnected, groupCallState.isInCall, sendMessage]);

  // Clean up media streams on unmount
  useEffect(() => {
    return () => {
      if (groupCallState.localStream) {
        cleanupMediaStream(groupCallState.localStream);
      }
      
      groupCallState.participants.forEach(stream => {
        cleanupMediaStream(stream);
      });
    };
  }, []);

  const value = {
    groupCallState,
    joinGroupCall,
    leaveGroupCall,
    createGroupCall
  };

  return (
    <GroupCallContext.Provider value={value}>
      {children}
    </GroupCallContext.Provider>
  );
}
import { createContext, useState, useRef, useEffect, ReactNode } from 'react';
import { useWebSocket } from './WebSocketContext';

interface GroupCallParticipant {
  userId: number;
  userName: string;
  stream?: MediaStream;
  callType: 'video' | 'audio';
}

interface GroupCallState {
  activeGroupCall: {
    roomId: number | null;
    roomName: string | null;
    participants: GroupCallParticipant[];
    localStream: MediaStream | null;
  } | null;
  incomingGroupCall: {
    roomId: number | null;
    roomName: string | null;
    callerId: number | null;
    callerName: string | null;
  } | null;
}

interface GroupCallContextType {
  groupCallState: GroupCallState;
  joinGroupCall: (roomId: number, roomName: string, callType: 'video' | 'audio') => Promise<boolean>;
  leaveGroupCall: () => void;
  acceptGroupCall: () => Promise<boolean>;
  rejectGroupCall: () => void;
  isInGroupCall: boolean;
}

export const GroupCallContext = createContext<GroupCallContextType | undefined>(undefined);

interface GroupCallProviderProps {
  children: ReactNode;
}

export function GroupCallProvider({ children }: GroupCallProviderProps) {
  const [groupCallState, setGroupCallState] = useState<GroupCallState>({
    activeGroupCall: null,
    incomingGroupCall: null
  });
  
  const { sendMessage, isConnected } = useWebSocket();
  const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  
  // Computed value untuk menentukan apakah user sedang dalam group call
  const isInGroupCall = !!groupCallState.activeGroupCall;
  
  // Konfigurasi ICE server
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };
  
  // Efek untuk mendengarkan event group call
  useEffect(() => {
    // Handler untuk event group call
    const handleGroupCallEvent = (event: CustomEvent) => {
      const { type, data } = event.detail;
      
      switch (type) {
        case 'group_call_invite':
          handleGroupCallInvite(data);
          break;
        case 'group_call_accepted':
          handleGroupCallAccepted(data);
          break;
        case 'group_call_rejected':
          handleGroupCallRejected(data);
          break;
        case 'group_call_user_joined':
          handleGroupCallUserJoined(data);
          break;
        case 'group_call_user_left':
          handleGroupCallUserLeft(data);
          break;
        case 'group_call_offer':
          handleGroupCallOffer(data);
          break;
        case 'group_call_answer':
          handleGroupCallAnswer(data);
          break;
        case 'group_call_ice_candidate':
          handleGroupCallIceCandidate(data);
          break;
        case 'group_call_ended':
          handleGroupCallEnded();
          break;
      }
    };
    
    // Daftarkan event listener
    window.addEventListener('group_call_event', handleGroupCallEvent as EventListener);
    
    // Cleanup saat unmount
    return () => {
      window.removeEventListener('group_call_event', handleGroupCallEvent as EventListener);
    };
  }, [groupCallState]);
  
  // Handler untuk undangan group call
  const handleGroupCallInvite = (data: any) => {
    // Jika sedang dalam call, tolak undangan
    if (isInGroupCall) {
      sendMessage({
        type: 'group_call_busy',
        data: {
          roomId: data.roomId,
          userId: data.callerId
        }
      });
      return;
    }
    
    // Set state panggilan grup masuk
    setGroupCallState(prev => ({
      ...prev,
      incomingGroupCall: {
        roomId: data.roomId,
        roomName: data.roomName,
        callerId: data.callerId,
        callerName: data.callerName
      }
    }));
    
    // Putar suara notifikasi
    const ringtone = new Audio('/sounds/incoming-call.mp3');
    ringtone.play().catch(err => {
      console.warn('Failed to play ringtone:', err);
    });
  };
  
  // Handler untuk respon penerimaan group call
  const handleGroupCallAccepted = async (data: any) => {
    // Buat koneksi peer untuk semua peserta yang sudah terhubung
    for (const participant of data.participants) {
      if (participant.userId === data.currentUserId) continue;
      
      try {
        await createPeerConnection(participant.userId);
        
        // Buat penawaran untuk koneksi
        const peerConnection = peerConnectionsRef.current.get(participant.userId);
        if (peerConnection) {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          
          // Kirim penawaran
          sendMessage({
            type: 'group_call_offer',
            data: {
              roomId: data.roomId,
              targetId: participant.userId,
              offer
            }
          });
        }
      } catch (error) {
        console.error(`Error creating peer connection with ${participant.userId}:`, error);
      }
    }
  };
  
  // Handler untuk respon penolakan group call
  const handleGroupCallRejected = (data: any) => {
    console.log(`User ${data.userId} rejected the group call`);
  };
  
  // Handler untuk user baru bergabung ke group call
  const handleGroupCallUserJoined = async (data: any) => {
    if (!groupCallState.activeGroupCall) return;
    
    // Tambahkan user baru ke daftar peserta
    setGroupCallState(prev => {
      if (!prev.activeGroupCall) return prev;
      
      return {
        ...prev,
        activeGroupCall: {
          ...prev.activeGroupCall,
          participants: [
            ...prev.activeGroupCall.participants,
            {
              userId: data.userId,
              userName: data.userName,
              callType: data.callType
            }
          ]
        }
      };
    });
    
    // Buat peer connection dengan user baru
    await createPeerConnection(data.userId);
  };
  
  // Handler untuk user meninggalkan group call
  const handleGroupCallUserLeft = (data: any) => {
    if (!groupCallState.activeGroupCall) return;
    
    // Hapus user dari daftar peserta
    setGroupCallState(prev => {
      if (!prev.activeGroupCall) return prev;
      
      return {
        ...prev,
        activeGroupCall: {
          ...prev.activeGroupCall,
          participants: prev.activeGroupCall.participants.filter(
            participant => participant.userId !== data.userId
          )
        }
      };
    });
    
    // Bersihkan peer connection
    const peerConnection = peerConnectionsRef.current.get(data.userId);
    if (peerConnection) {
      peerConnection.close();
      peerConnectionsRef.current.delete(data.userId);
    }
  };
  
  // Handler untuk penawaran koneksi
  const handleGroupCallOffer = async (data: any) => {
    if (!groupCallState.activeGroupCall) return;
    
    try {
      // Buat peer connection jika belum ada
      if (!peerConnectionsRef.current.has(data.userId)) {
        await createPeerConnection(data.userId);
      }
      
      const peerConnection = peerConnectionsRef.current.get(data.userId);
      if (!peerConnection) return;
      
      // Set remote description dari penawaran
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      // Buat jawaban
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Kirim jawaban
      sendMessage({
        type: 'group_call_answer',
        data: {
          roomId: groupCallState.activeGroupCall.roomId,
          targetId: data.userId,
          answer
        }
      });
    } catch (error) {
      console.error('Error handling group call offer:', error);
    }
  };
  
  // Handler untuk jawaban koneksi
  const handleGroupCallAnswer = async (data: any) => {
    if (!groupCallState.activeGroupCall) return;
    
    try {
      const peerConnection = peerConnectionsRef.current.get(data.userId);
      if (!peerConnection) return;
      
      // Set remote description dari jawaban
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
      console.error('Error handling group call answer:', error);
    }
  };
  
  // Handler untuk ice candidate
  const handleGroupCallIceCandidate = async (data: any) => {
    if (!groupCallState.activeGroupCall) return;
    
    try {
      const peerConnection = peerConnectionsRef.current.get(data.userId);
      if (!peerConnection) return;
      
      // Tambahkan ice candidate
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error handling ice candidate:', error);
    }
  };
  
  // Handler untuk group call berakhir
  const handleGroupCallEnded = () => {
    // Bersihkan semua koneksi peer
    peerConnectionsRef.current.forEach((peerConnection, userId) => {
      peerConnection.close();
    });
    
    peerConnectionsRef.current.clear();
    
    // Hentikan local stream
    if (groupCallState.activeGroupCall?.localStream) {
      groupCallState.activeGroupCall.localStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    // Reset state
    setGroupCallState({
      activeGroupCall: null,
      incomingGroupCall: null
    });
  };
  
  // Fungsi untuk bergabung ke group call
  const joinGroupCall = async (roomId: number, roomName: string, callType: 'video' | 'audio'): Promise<boolean> => {
    // Jika sedang dalam call, tidak bisa bergabung call lain
    if (isInGroupCall) return false;
    
    try {
      // Dapatkan akses ke audio/video device
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      
      // Update state
      setGroupCallState({
        incomingGroupCall: null,
        activeGroupCall: {
          roomId,
          roomName,
          participants: [],
          localStream: stream
        }
      });
      
      // Kirim permintaan untuk bergabung ke group call
      sendMessage({
        type: 'join_group_call',
        data: {
          roomId,
          callType
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error joining group call:', error);
      return false;
    }
  };
  
  // Fungsi untuk meninggalkan group call
  const leaveGroupCall = () => {
    if (!groupCallState.activeGroupCall) return;
    
    // Kirim notifikasi bahwa user meninggalkan group call
    sendMessage({
      type: 'leave_group_call',
      data: {
        roomId: groupCallState.activeGroupCall.roomId
      }
    });
    
    // Bersihkan koneksi dan state
    handleGroupCallEnded();
  };
  
  // Fungsi untuk menerima group call
  const acceptGroupCall = async (): Promise<boolean> => {
    if (!groupCallState.incomingGroupCall) return false;
    
    try {
      // Dapatkan akses ke audio/video device (default untuk audio)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      // Update state
      const { roomId, roomName, callerId, callerName } = groupCallState.incomingGroupCall;
      
      setGroupCallState({
        incomingGroupCall: null,
        activeGroupCall: {
          roomId,
          roomName,
          participants: [
            {
              userId: callerId!,
              userName: callerName!,
              callType: 'audio'
            }
          ],
          localStream: stream
        }
      });
      
      // Kirim penerimaan
      sendMessage({
        type: 'accept_group_call',
        data: {
          roomId,
          callerId
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error accepting group call:', error);
      return false;
    }
  };
  
  // Fungsi untuk menolak group call
  const rejectGroupCall = () => {
    if (!groupCallState.incomingGroupCall) return;
    
    // Kirim penolakan
    sendMessage({
      type: 'reject_group_call',
      data: {
        roomId: groupCallState.incomingGroupCall.roomId,
        callerId: groupCallState.incomingGroupCall.callerId
      }
    });
    
    // Reset state
    setGroupCallState(prev => ({
      ...prev,
      incomingGroupCall: null
    }));
  };
  
  // Fungsi untuk membuat koneksi peer dengan user tertentu
  const createPeerConnection = async (userId: number): Promise<RTCPeerConnection> => {
    // Jika koneksi sudah ada, kembalikan koneksi tersebut
    if (peerConnectionsRef.current.has(userId)) {
      return peerConnectionsRef.current.get(userId)!;
    }
    
    // Pastikan ada local stream
    if (!groupCallState.activeGroupCall?.localStream) {
      throw new Error('No local stream available');
    }
    
    // Buat koneksi baru
    const peerConnection = new RTCPeerConnection(rtcConfig);
    
    // Tambahkan local stream
    groupCallState.activeGroupCall.localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, groupCallState.activeGroupCall!.localStream!);
    });
    
    // Listener untuk ice candidate
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && groupCallState.activeGroupCall?.roomId) {
        sendMessage({
          type: 'group_call_ice_candidate',
          data: {
            roomId: groupCallState.activeGroupCall.roomId,
            targetId: userId,
            candidate: event.candidate
          }
        });
      }
    };
    
    // Listener untuk track yang diterima
    peerConnection.ontrack = (event) => {
      // Update participant stream
      setGroupCallState(prev => {
        if (!prev.activeGroupCall) return prev;
        
        const updatedParticipants = prev.activeGroupCall.participants.map(participant => {
          if (participant.userId === userId) {
            return {
              ...participant,
              stream: event.streams[0]
            };
          }
          return participant;
        });
        
        return {
          ...prev,
          activeGroupCall: {
            ...prev.activeGroupCall,
            participants: updatedParticipants
          }
        };
      });
    };
    
    // Simpan koneksi
    peerConnectionsRef.current.set(userId, peerConnection);
    
    return peerConnection;
  };
  
  const contextValue: GroupCallContextType = {
    groupCallState,
    joinGroupCall,
    leaveGroupCall,
    acceptGroupCall,
    rejectGroupCall,
    isInGroupCall
  };
  
  return (
    <GroupCallContext.Provider value={contextValue}>
      {children}
    </GroupCallContext.Provider>
  );
}
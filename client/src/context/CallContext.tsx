import { createContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useWebSocket } from './WebSocketContext';

interface CallState {
  incomingCall: {
    callerId: number | null;
    callerName: string | null;
    callType: 'video' | 'audio' | null;
  } | null;
  activeCall: {
    peerId: number | null;
    peerName: string | null;
    callType: 'video' | 'audio';
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
  } | null;
}

interface CallContextType {
  callState: CallState;
  handleIncomingCall: (callData: { callerId: number; callerName: string; callType: 'video' | 'audio' }) => void;
  acceptCall: () => Promise<boolean>;
  rejectCall: () => void;
  makeCall: (userId: number, userName: string, callType: 'video' | 'audio') => Promise<boolean>;
  endCall: () => void;
}

export const CallContext = createContext<CallContextType | undefined>(undefined);

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  // State untuk panggilan
  const [callState, setCallState] = useState<CallState>({
    incomingCall: null,
    activeCall: null
  });
  
  // Ref untuk koneksi WebRTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const { sendMessage, isConnected } = useWebSocket();
  
  // Konfigurasi ICE server
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };
  
  // Efek untuk menambahkan event listener untuk pesan masuk terkait panggilan
  useEffect(() => {
    // Mendaftarkan event listener untuk pesan masuk terkait panggilan
    const handleCallEvent = (event: CustomEvent) => {
      const { type, data } = event.detail;
      
      switch (type) {
        case 'incoming_call':
          // Panggilan masuk
          handleIncomingCall(data);
          break;
        case 'call_rejected':
          // Panggilan ditolak
          handleCallRejected();
          break;
        case 'call_accepted':
          // Panggilan diterima, mulai setup koneksi
          handleCallAccepted(data);
          break;
        case 'ice_candidate':
          // Menerima ICE candidate dari peer
          handleIceCandidate(data);
          break;
        case 'call_offer':
          // Menerima penawaran koneksi (offer)
          handleCallOffer(data);
          break;
        case 'call_answer':
          // Menerima jawaban koneksi (answer)
          handleCallAnswer(data);
          break;
        case 'call_ended':
          // Panggilan diakhiri oleh peer
          handleCallEnded();
          break;
      }
    };
    
    // Mendaftarkan event listener
    window.addEventListener('call_event', handleCallEvent as EventListener);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('call_event', handleCallEvent as EventListener);
    };
  }, [callState]); // Gunakan callState sebagai dependency
  
  // Handler untuk panggilan masuk
  const handleIncomingCall = (callData: { callerId: number; callerName: string; callType: 'video' | 'audio' }) => {
    // Jika sudah ada panggilan aktif, tolak panggilan masuk ini
    if (callState.activeCall) {
      sendMessage({
        type: 'call_busy',
        data: {
          targetId: callData.callerId
        }
      });
      return;
    }
    
    // Simpan informasi panggilan masuk
    setCallState(prev => ({
      ...prev,
      incomingCall: {
        callerId: callData.callerId,
        callerName: callData.callerName,
        callType: callData.callType
      }
    }));
    
    // Memainkan suara notifikasi
    const ringtone = new Audio('/sounds/incoming-call.mp3');
    ringtone.play().catch(err => {
      console.warn('Failed to play ringtone:', err);
    });
  };
  
  // Handler saat panggilan ditolak
  const handleCallRejected = () => {
    // Bersihkan koneksi peer
    cleanupPeerConnection();
    
    // Reset state panggilan aktif
    setCallState(prev => ({
      ...prev,
      activeCall: null
    }));
  };
  
  // Handler saat panggilan diterima oleh peer yang dipanggil
  const handleCallAccepted = async (data: any) => {
    try {
      // Mulai koneksi dan buat penawaran (offer)
      await setupPeerConnection();
      
      // Panggilan sudah disetujui, sekarang buat penawaran (offer)
      const offer = await peerConnectionRef.current?.createOffer();
      
      if (!offer) return;
      
      await peerConnectionRef.current?.setLocalDescription(offer);
      
      // Kirim penawaran ke peer yang dituju
      sendMessage({
        type: 'call_offer',
        data: {
          targetId: callState.activeCall?.peerId,
          offer: offer
        }
      });
    } catch (error) {
      console.error('Error creating call offer:', error);
      endCall();
    }
  };
  
  // Handler untuk ICE candidate yang diterima
  const handleIceCandidate = async (data: any) => {
    try {
      if (!peerConnectionRef.current || !data.candidate) return;
      
      // Tambahkan ICE candidate yang diterima
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };
  
  // Handler untuk penawaran (offer) panggilan yang diterima
  const handleCallOffer = async (data: any) => {
    try {
      if (!peerConnectionRef.current) return;
      
      // Set penawaran yang diterima sebagai remote description
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      // Buat jawaban (answer)
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      // Kirim jawaban ke peer
      sendMessage({
        type: 'call_answer',
        data: {
          targetId: callState.activeCall?.peerId || callState.incomingCall?.callerId,
          answer: answer
        }
      });
    } catch (error) {
      console.error('Error handling call offer:', error);
      endCall();
    }
  };
  
  // Handler untuk jawaban (answer) yang diterima
  const handleCallAnswer = async (data: any) => {
    try {
      if (!peerConnectionRef.current) return;
      
      // Set jawaban yang diterima sebagai remote description
      const remoteDesc = new RTCSessionDescription(data.answer);
      await peerConnectionRef.current.setRemoteDescription(remoteDesc);
    } catch (error) {
      console.error('Error handling call answer:', error);
      endCall();
    }
  };
  
  // Handler saat panggilan diakhiri oleh peer
  const handleCallEnded = () => {
    // Bersihkan koneksi peer
    cleanupPeerConnection();
    
    // Reset state panggilan aktif
    setCallState(prev => ({
      incomingCall: null,
      activeCall: null
    }));
  };
  
  // Fungsi untuk menerima panggilan
  const acceptCall = async (): Promise<boolean> => {
    if (!callState.incomingCall) return false;
    
    try {
      // Mulai koneksi peer
      const success = await setupPeerConnection();
      
      if (!success) {
        throw new Error('Failed to set up media devices');
      }
      
      // Beri tahu pemanggil bahwa panggilan diterima
      sendMessage({
        type: 'call_accepted',
        data: {
          targetId: callState.incomingCall.callerId
        }
      });
      
      // Perbarui state panggilan
      setCallState(prev => ({
        incomingCall: null,
        activeCall: {
          peerId: prev.incomingCall?.callerId || null,
          peerName: prev.incomingCall?.callerName || null,
          callType: prev.incomingCall?.callType || 'audio',
          localStream: prev.activeCall?.localStream || null,
          remoteStream: prev.activeCall?.remoteStream || null
        }
      }));
      
      return true;
    } catch (error) {
      console.error('Error accepting call:', error);
      return false;
    }
  };
  
  // Fungsi untuk menolak panggilan
  const rejectCall = () => {
    if (!callState.incomingCall) return;
    
    // Beri tahu pemanggil bahwa panggilan ditolak
    sendMessage({
      type: 'call_rejected',
      data: {
        targetId: callState.incomingCall.callerId
      }
    });
    
    // Reset state panggilan masuk
    setCallState(prev => ({
      ...prev,
      incomingCall: null
    }));
  };
  
  // Fungsi untuk memulai panggilan
  const makeCall = async (userId: number, userName: string, callType: 'video' | 'audio'): Promise<boolean> => {
    // Jika sudah ada panggilan aktif, batalkan
    if (callState.activeCall) return false;
    
    try {
      // Mulai koneksi peer
      const success = await setupPeerConnection(callType);
      
      if (!success) {
        throw new Error('Failed to set up media devices');
      }
      
      // Kirim permintaan panggilan
      sendMessage({
        type: 'outgoing_call',
        data: {
          targetId: userId,
          callType
        }
      });
      
      // Perbarui state panggilan
      setCallState(prev => ({
        ...prev,
        activeCall: {
          peerId: userId,
          peerName: userName,
          callType,
          localStream: prev.activeCall?.localStream || null,
          remoteStream: prev.activeCall?.remoteStream || null
        }
      }));
      
      return true;
    } catch (error) {
      console.error('Error making call:', error);
      return false;
    }
  };
  
  // Fungsi untuk mengakhiri panggilan
  const endCall = () => {
    // Jika tidak ada panggilan aktif, tidak perlu melakukan apa-apa
    if (!callState.activeCall && !callState.incomingCall) return;
    
    // Jika ada panggilan yang sedang aktif, beri tahu peer bahwa panggilan berakhir
    if (callState.activeCall) {
      sendMessage({
        type: 'call_end',
        data: {
          targetId: callState.activeCall.peerId
        }
      });
    }
    
    // Bersihkan koneksi peer
    cleanupPeerConnection();
    
    // Reset state panggilan
    setCallState({
      incomingCall: null,
      activeCall: null
    });
  };
  
  // Fungsi untuk mengatur koneksi peer
  const setupPeerConnection = async (callType: 'video' | 'audio' = 'audio'): Promise<boolean> => {
    try {
      // Dapatkan stream media (audio/video)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      
      // Buat koneksi peer baru
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;
      
      // Tambahkan tracks dari stream ke koneksi peer
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Listener untuk ICE candidate yang dihasilkan
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Kirim ICE candidate ke peer
          const targetId = callState.activeCall?.peerId || callState.incomingCall?.callerId;
          
          if (targetId) {
            sendMessage({
              type: 'ice_candidate',
              data: {
                targetId,
                candidate: event.candidate
              }
            });
          }
        }
      };
      
      // Listener untuk perubahan koneksi ICE
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        
        // Jika koneksi terputus atau gagal, akhiri panggilan
        if (pc.iceConnectionState === 'disconnected' || 
            pc.iceConnectionState === 'failed' || 
            pc.iceConnectionState === 'closed') {
          endCall();
        }
      };
      
      // Listener untuk track yang diterima dari peer
      pc.ontrack = (event) => {
        // Simpan remote stream
        setCallState(prev => {
          if (!prev.activeCall) return prev;
          
          return {
            ...prev,
            activeCall: {
              ...prev.activeCall,
              remoteStream: event.streams[0]
            }
          };
        });
      };
      
      // Perbarui state dengan stream lokal
      setCallState(prev => {
        // Jika panggilan masuk yang diterima
        if (prev.incomingCall) {
          return {
            incomingCall: null,
            activeCall: {
              peerId: prev.incomingCall.callerId,
              peerName: prev.incomingCall.callerName,
              callType: prev.incomingCall.callType || 'audio',
              localStream: stream,
              remoteStream: null
            }
          };
        }
        
        // Jika ada panggilan aktif, perbarui stream lokalnya
        if (prev.activeCall) {
          return {
            incomingCall: null,
            activeCall: {
              ...prev.activeCall,
              localStream: stream
            }
          };
        }
        
        return prev;
      });
      
      return true;
    } catch (error) {
      console.error('Error setting up peer connection:', error);
      return false;
    }
  };
  
  // Fungsi untuk membersihkan koneksi peer dan stream media
  const cleanupPeerConnection = () => {
    // Hentikan semua track media lokal
    callState.activeCall?.localStream?.getTracks().forEach(track => {
      track.stop();
    });
    
    // Tutup koneksi peer
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };
  
  // Nilai yang disediakan context
  const contextValue: CallContextType = {
    callState,
    handleIncomingCall,
    acceptCall,
    rejectCall,
    makeCall,
    endCall
  };
  
  return (
    <CallContext.Provider value={contextValue}>
      {children}
    </CallContext.Provider>
  );
}
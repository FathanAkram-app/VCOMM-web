import { createContext, ReactNode, useCallback, useEffect, useState } from 'react';
import { useNotification } from '../hooks/useNotification';
import { useWebSocket } from '../hooks/useWebSocket';

// Interface untuk data panggilan
export interface CallData {
  callId: string;
  callerId: number;
  callerName: string;
  receiverId: number;
  callType: 'audio' | 'video';
  status: 'incoming' | 'outgoing' | 'connected' | 'ended';
}

// Interface untuk context
interface CallContextType {
  activeCall: CallData | null;
  incomingCall: CallData | null;
  startCall: (userId: number, callType: 'audio' | 'video') => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

// Default context
export const CallContext = createContext<CallContextType>({
  activeCall: null,
  incomingCall: null,
  startCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  endCall: () => {},
  toggleAudio: () => {},
  toggleVideo: () => {},
  isAudioEnabled: true,
  isVideoEnabled: true,
  localStream: null,
  remoteStream: null,
});

// Props provider
interface CallProviderProps {
  children: ReactNode;
}

// Provider
export const CallProvider = ({ children }: CallProviderProps) => {
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  
  const { sendMessage, lastMessage, isConnected } = useWebSocket();
  const { addNotification } = useNotification();

  // Inisialisasi WebRTC
  const initializePeerConnection = useCallback(() => {
    // Konfigurasi ICE servers (STUN/TURN)
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    // Buat peer connection baru
    const pc = new RTCPeerConnection(configuration);

    // Event handlers
    pc.onicecandidate = (event) => {
      if (event.candidate && activeCall) {
        // Kirim ICE candidate ke peer lain
        sendMessage({
          type: 'ice_candidate',
          targetId: activeCall.callerId === activeCall.receiverId ? activeCall.receiverId : activeCall.callerId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      // Tambahkan track ke remote stream
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('RTC Connection State:', pc.connectionState);
    };

    pc.onicecandidateerror = (event) => {
      console.error('ICE Candidate Error:', event);
    };

    setPeerConnection(pc);
    return pc;
  }, [activeCall, sendMessage]);

  // Efek untuk mendengarkan pesan WebSocket
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'incoming_call':
          // Notifikasi panggilan masuk
          const incomingCallData: CallData = {
            callId: lastMessage.callId,
            callerId: lastMessage.callerId,
            callerName: lastMessage.callerName,
            receiverId: Number(localStorage.getItem('userId') || '0'),
            callType: lastMessage.callType,
            status: 'incoming'
          };
          
          setIncomingCall(incomingCallData);
          
          // Play ringtone
          const audio = new Audio('/sounds/ringtone.mp3');
          audio.loop = true;
          audio.play().catch(error => {
            console.warn('Failed to play ringtone:', error);
          });
          
          // Tambahkan notification
          addNotification(
            'Panggilan Masuk', 
            `${lastMessage.callerName} memanggil (${lastMessage.callType === 'video' ? 'Video' : 'Audio'})`, 
            'call'
          );
          break;
          
        case 'call_accepted':
          if (activeCall && activeCall.status === 'outgoing') {
            // Update status panggilan
            setActiveCall({
              ...activeCall,
              status: 'connected'
            });
            
            // Jika ini adalah penelepon, mulai proses WebRTC
            createAndSendOffer();
          }
          break;
          
        case 'call_rejected':
          // Panggilan ditolak, reset state
          cleanupCall();
          addNotification('Panggilan Berakhir', 'Panggilan ditolak', 'call');
          break;
          
        case 'call_ended':
          // Panggilan diakhiri oleh peer
          cleanupCall();
          addNotification('Panggilan Berakhir', 'Panggilan telah berakhir', 'call');
          break;
          
        case 'call_offer':
          // Terima offer dan buat answer
          handleIncomingOffer(lastMessage.offer);
          break;
          
        case 'call_answer':
          // Terapkan answer
          handleIncomingAnswer(lastMessage.answer);
          break;
          
        case 'ice_candidate':
          // Tambahkan ICE candidate
          handleIncomingIceCandidate(lastMessage.candidate);
          break;
      }
    }
  }, [lastMessage, sendMessage, activeCall, addNotification]);

  // Bersihkan panggilan
  const cleanupCall = useCallback(() => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }
    
    // Reset state
    setActiveCall(null);
    setIncomingCall(null);
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
  }, [localStream, peerConnection]);

  // Mulai panggilan baru
  const startCall = useCallback(async (userId: number, callType: 'audio' | 'video') => {
    try {
      // Dapatkan media stream
      const constraints = {
        audio: true,
        video: callType === 'video'
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setIsAudioEnabled(true);
      setIsVideoEnabled(callType === 'video');
      
      // Buat data panggilan
      const myUserId = Number(localStorage.getItem('userId') || '0');
      const myName = localStorage.getItem('userName') || 'User';
      
      const newCall: CallData = {
        callId: `call_${Date.now()}`,
        callerId: myUserId,
        callerName: myName,
        receiverId: userId,
        callType,
        status: 'outgoing'
      };
      
      setActiveCall(newCall);
      
      // Kirim pesan WebSocket untuk memulai panggilan
      sendMessage({
        type: 'outgoing_call',
        targetId: userId,
        callType
      });
    } catch (error) {
      console.error('Error starting call:', error);
      addNotification(
        'Gagal Memulai Panggilan', 
        'Tidak dapat mengakses kamera atau mikrofon. Cek izin perangkat.', 
        'system'
      );
    }
  }, [sendMessage, addNotification]);

  // Terima panggilan masuk
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    
    try {
      // Dapatkan media stream
      const constraints = {
        audio: true,
        video: incomingCall.callType === 'video'
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setIsAudioEnabled(true);
      setIsVideoEnabled(incomingCall.callType === 'video');
      
      // Kirim pesan WebSocket untuk menerima panggilan
      sendMessage({
        type: 'call_accepted',
        targetId: incomingCall.callerId
      });
      
      // Update status panggilan
      setActiveCall({
        ...incomingCall,
        status: 'connected'
      });
      
      // Reset panggilan masuk
      setIncomingCall(null);
      
      // Stop ringtone
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      
      // Inisialisasi peer connection
      initializePeerConnection();
    } catch (error) {
      console.error('Error accepting call:', error);
      addNotification(
        'Gagal Menerima Panggilan', 
        'Tidak dapat mengakses kamera atau mikrofon. Cek izin perangkat.', 
        'system'
      );
    }
  }, [incomingCall, sendMessage, initializePeerConnection, addNotification]);

  // Tolak panggilan masuk
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    
    // Kirim pesan WebSocket untuk menolak panggilan
    sendMessage({
      type: 'call_rejected',
      targetId: incomingCall.callerId
    });
    
    // Reset panggilan masuk
    setIncomingCall(null);
    
    // Stop ringtone
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, [incomingCall, sendMessage]);

  // Akhiri panggilan aktif
  const endCall = useCallback(() => {
    if (!activeCall) return;
    
    // Kirim pesan WebSocket untuk mengakhiri panggilan
    sendMessage({
      type: 'call_end',
      targetId: activeCall.callerId === activeCall.receiverId ? activeCall.receiverId : activeCall.callerId
    });
    
    // Bersihkan panggilan
    cleanupCall();
  }, [activeCall, sendMessage, cleanupCall]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(audioTracks[0]?.enabled || false);
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(videoTracks[0]?.enabled || false);
    }
  }, [localStream]);

  // Buat dan kirim offer WebRTC
  const createAndSendOffer = useCallback(async () => {
    if (!peerConnection || !activeCall || !localStream) return;
    
    try {
      // Tambahkan local stream ke peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
      
      // Buat offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Kirim offer ke peer lain
      sendMessage({
        type: 'call_offer',
        targetId: activeCall.callerId === activeCall.receiverId ? activeCall.receiverId : activeCall.callerId,
        offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [peerConnection, activeCall, localStream, sendMessage]);

  // Handle offer yang masuk
  const handleIncomingOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnection || !activeCall || !localStream) {
      // Inisialisasi peer connection jika belum ada
      const pc = initializePeerConnection();
      
      // Tambahkan local stream ke peer connection
      localStream?.getTracks().forEach(track => {
        pc?.addTrack(track, localStream);
      });
      
      if (pc) {
        try {
          // Set remote description
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          
          // Buat answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          // Kirim answer ke peer lain
          sendMessage({
            type: 'call_answer',
            targetId: activeCall.callerId === activeCall.receiverId ? activeCall.receiverId : activeCall.callerId,
            answer
          });
        } catch (error) {
          console.error('Error handling offer:', error);
        }
      }
    } else {
      try {
        // Tambahkan local stream ke peer connection
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
        
        // Set remote description
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Buat answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        // Kirim answer ke peer lain
        sendMessage({
          type: 'call_answer',
          targetId: activeCall.callerId === activeCall.receiverId ? activeCall.receiverId : activeCall.callerId,
          answer
        });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    }
  }, [peerConnection, activeCall, localStream, sendMessage, initializePeerConnection]);

  // Handle answer yang masuk
  const handleIncomingAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnection) return;
    
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, [peerConnection]);

  // Handle ICE candidate yang masuk
  const handleIncomingIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerConnection) return;
    
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, [peerConnection]);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleAudio,
        toggleVideo,
        isAudioEnabled,
        isVideoEnabled,
        localStream,
        remoteStream,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
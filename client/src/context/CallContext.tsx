import { createContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";

// Tipe data untuk panggilan aktif
interface Call {
  callId: string;
  peerId: number;
  peerName: string;
  callType: 'audio' | 'video';
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  startTime: Date;
  localStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isMuted: boolean;
  isRoom: boolean;
  roomId?: number;
}

// Tipe data untuk panggilan masuk
interface IncomingCall {
  callId: string;
  callerId: number;
  callerName: string;
  callType: 'audio' | 'video';
  isRoom: boolean;
  roomId?: number;
  roomName?: string;
}

// Interface untuk CallContext
interface CallContextProps {
  // State
  activeCall: Call | null;
  incomingCall: IncomingCall | null;
  isCallLoading: boolean;
  
  // Actions
  initiateCall: (userId: number, userName: string, callType: 'audio' | 'video') => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  hangupCall: () => Promise<void>;
  toggleCallAudio: () => void;
  toggleCallVideo: () => void;
  toggleMute: () => void;
  switchCallCamera: () => void;
}

// Membuat konteks dengan nilai default undefined
export const CallContext = createContext<CallContextProps | undefined>(undefined);

// Props untuk CallProvider
interface CallProviderProps {
  children: ReactNode;
}

// Provider component untuk Call Context
export const CallProvider = ({ children }: CallProviderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // State untuk panggilan
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isCallLoading, setIsCallLoading] = useState(false);
  
  // Untuk menyimpan media stream
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
  
  // Efek untuk membersihkan media stream saat komponen di-unmount
  useEffect(() => {
    return () => {
      if (localMediaStream) {
        localMediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Mendapatkan media stream lokal (kamera & mikrofon)
  const getLocalStream = async (video: boolean, audio: boolean) => {
    try {
      // Hentikan stream yang ada jika ada
      if (localMediaStream) {
        localMediaStream.getTracks().forEach(track => track.stop());
      }
      
      // Dapatkan stream baru
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { facingMode: 'user' } : false,
        audio
      });
      
      setLocalMediaStream(stream);
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast({
        title: "Media Access Error",
        description: "Failed to access camera or microphone. Please check permissions.",
        variant: "destructive",
      });
      return null;
    }
  };
  
  // Memulai panggilan ke pengguna lain
  const initiateCall = async (userId: number, userName: string, callType: 'audio' | 'video') => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to make calls.",
        variant: "destructive",
      });
      return;
    }
    
    if (activeCall) {
      toast({
        title: "Call in Progress",
        description: "Please end your current call before starting a new one.",
        variant: "destructive",
      });
      return;
    }
    
    setIsCallLoading(true);
    
    try {
      // Dapatkan media stream lokal
      const stream = await getLocalStream(callType === 'video', true);
      if (!stream) {
        throw new Error("Failed to access media devices");
      }
      
      // Buat ID panggilan unik
      const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Buat objek panggilan
      const newCall: Call = {
        callId,
        peerId: userId,
        peerName: userName,
        callType,
        status: 'connecting',
        startTime: new Date(),
        localStream: stream,
        remoteStreams: new Map(),
        audioEnabled: true,
        videoEnabled: callType === 'video',
        isMuted: false,
        isRoom: false
      };
      
      // Update state
      setActiveCall(newCall);
      
      // Navigasi ke halaman panggilan yang sesuai
      navigate(`/${callType}-call`);
      
      // Untuk implementasi sebenarnya, kirim sinyal panggilan ke server melalui WebSocket
      
      // Simulasi koneksi berhasil setelah beberapa detik
      setTimeout(() => {
        if (setActiveCall) {
          setActiveCall(prev => 
            prev ? { ...prev, status: 'connected' } : null
          );
        }
      }, 2000);
      
    } catch (error) {
      console.error("Error initiating call:", error);
      toast({
        title: "Call Failed",
        description: "Failed to initiate call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCallLoading(false);
    }
  };
  
  // Menjawab panggilan yang masuk
  const answerCall = async () => {
    if (!incomingCall) {
      console.error("No incoming call to answer");
      return;
    }
    
    setIsCallLoading(true);
    
    try {
      // Dapatkan media stream lokal
      const stream = await getLocalStream(incomingCall.callType === 'video', true);
      if (!stream) {
        throw new Error("Failed to access media devices");
      }
      
      // Buat objek panggilan aktif
      const newCall: Call = {
        callId: incomingCall.callId,
        peerId: incomingCall.callerId,
        peerName: incomingCall.callerName,
        callType: incomingCall.callType,
        status: 'connecting',
        startTime: new Date(),
        localStream: stream,
        remoteStreams: new Map(),
        audioEnabled: true,
        videoEnabled: incomingCall.callType === 'video',
        isMuted: false,
        isRoom: incomingCall.isRoom,
        roomId: incomingCall.roomId
      };
      
      // Update state
      setActiveCall(newCall);
      setIncomingCall(null);
      
      // Navigasi ke halaman panggilan yang sesuai
      if (incomingCall.isRoom) {
        navigate(`/group-${incomingCall.callType}-call`);
      } else {
        navigate(`/${incomingCall.callType}-call`);
      }
      
      // Untuk implementasi sebenarnya, kirim sinyal jawaban ke server melalui WebSocket
      
      // Simulasi koneksi berhasil setelah beberapa detik
      setTimeout(() => {
        if (setActiveCall) {
          setActiveCall(prev => 
            prev ? { ...prev, status: 'connected' } : null
          );
        }
      }, 2000);
      
    } catch (error) {
      console.error("Error answering call:", error);
      toast({
        title: "Call Failed",
        description: "Failed to answer call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCallLoading(false);
    }
  };
  
  // Menolak panggilan masuk
  const rejectCall = () => {
    if (!incomingCall) return;
    
    // Untuk implementasi sebenarnya, kirim sinyal penolakan ke server melalui WebSocket
    
    setIncomingCall(null);
    
    toast({
      title: "Call Rejected",
      description: "Incoming call has been rejected.",
    });
  };
  
  // Menutup panggilan yang sedang aktif
  const hangupCall = () => {
    if (!activeCall) return;
    
    // Hentikan stream lokal
    if (activeCall.localStream) {
      activeCall.localStream.getTracks().forEach(track => track.stop());
    }
    
    // Untuk implementasi sebenarnya, kirim sinyal hangup ke server melalui WebSocket
    
    setActiveCall(null);
    
    // Kembali ke halaman sebelumnya
    navigate(-1);
    
    toast({
      title: "Call Ended",
      description: "Call has been terminated.",
    });
  };
  
  // Toggle audio pada panggilan
  const toggleCallAudio = () => {
    if (!activeCall || !activeCall.localStream) return;
    
    const audioTracks = activeCall.localStream.getAudioTracks();
    const newAudioEnabled = !activeCall.audioEnabled;
    
    audioTracks.forEach(track => {
      track.enabled = newAudioEnabled;
    });
    
    setActiveCall({
      ...activeCall,
      audioEnabled: newAudioEnabled
    });
    
    // Untuk implementasi sebenarnya, kirim informasi ke server melalui WebSocket
  };
  
  // Toggle video pada panggilan
  const toggleCallVideo = () => {
    if (!activeCall || !activeCall.localStream || activeCall.callType !== 'video') return;
    
    const videoTracks = activeCall.localStream.getVideoTracks();
    const newVideoEnabled = !activeCall.videoEnabled;
    
    videoTracks.forEach(track => {
      track.enabled = newVideoEnabled;
    });
    
    setActiveCall({
      ...activeCall,
      videoEnabled: newVideoEnabled
    });
    
    // Untuk implementasi sebenarnya, kirim informasi ke server melalui WebSocket
  };
  
  // Toggle mute speaker pada panggilan
  const toggleMute = () => {
    if (!activeCall) return;
    
    setActiveCall({
      ...activeCall,
      isMuted: !activeCall.isMuted
    });
    
    // Untuk implementasi sebenarnya, kirim informasi ke server melalui WebSocket
  };
  
  // Beralih kamera (depan/belakang) pada panggilan video
  const switchCallCamera = async () => {
    if (!activeCall || activeCall.callType !== 'video' || !activeCall.localStream) return;
    
    try {
      // Hentikan video track yang ada
      const videoTracks = activeCall.localStream.getVideoTracks();
      videoTracks.forEach(track => track.stop());
      
      // Tentukan facing mode baru (beralih antara user/environment)
      const currentFacingMode = activeCall.localStream.getVideoTracks()[0]?.getSettings().facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      // Dapatkan stream baru dengan facing mode yang diubah
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: activeCall.audioEnabled
      });
      
      // Dapatkan track audio dari stream yang ada
      const audioTracks = activeCall.localStream.getAudioTracks();
      
      // Tambahkan track audio ke stream baru (jika ada)
      audioTracks.forEach(track => {
        newStream.addTrack(track.clone());
      });
      
      // Ganti stream lokal
      const updatedCall = {
        ...activeCall,
        localStream: newStream
      };
      
      setActiveCall(updatedCall);
      setLocalMediaStream(newStream);
      
      toast({
        title: "Camera Switched",
        description: `Switched to ${newFacingMode === 'user' ? 'front' : 'back'} camera.`,
      });
      
    } catch (error) {
      console.error("Error switching camera:", error);
      toast({
        title: "Camera Switch Failed",
        description: "Failed to switch camera. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Menangani panggilan masuk dari WebSocket
  useEffect(() => {
    if (!user) return;
    
    const handleIncomingCall = (data: any) => {
      if (activeCall) {
        // Jika sudah ada panggilan aktif, kirim sinyal "sibuk"
        // Implementasi sebenarnya akan mengirim pesan ke server
        console.log("Rejecting incoming call, already in a call");
        return;
      }
      
      const incomingCallData: IncomingCall = {
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        callType: data.callType,
        isRoom: data.isRoom || false,
        roomId: data.roomId,
        roomName: data.roomName
      };
      
      setIncomingCall(incomingCallData);
      
      // Putar nada dering
      const ringtone = new Audio('/sounds/ringtone.mp3');
      ringtone.loop = true;
      ringtone.play().catch(err => console.error("Error playing ringtone:", err));
      
      // Hentikan nada dering setelah 30 detik (jika tidak dijawab)
      const timeout = setTimeout(() => {
        ringtone.pause();
        ringtone.currentTime = 0;
        setIncomingCall(null);
      }, 30000);
      
      // Hentikan nada dering ketika panggilan diterima atau ditolak
      const clearRingtone = () => {
        ringtone.pause();
        ringtone.currentTime = 0;
        clearTimeout(timeout);
      };
      
      // Tambahkan event listener satu kali
      const handleAnswerBtnClick = () => clearRingtone();
      const handleRejectBtnClick = () => clearRingtone();
      
      document.addEventListener('call-answered', handleAnswerBtnClick, { once: true });
      document.addEventListener('call-rejected', handleRejectBtnClick, { once: true });
      
      return () => {
        clearRingtone();
        document.removeEventListener('call-answered', handleAnswerBtnClick);
        document.removeEventListener('call-rejected', handleRejectBtnClick);
      };
    };
    
    // Daftarkan listener untuk event panggilan
    if (window.wsClient) {
      window.wsClient.addMessageListener('call', handleIncomingCall);
      
      return () => {
        window.wsClient.removeMessageListener('call', handleIncomingCall);
      };
    }
  }, [activeCall, user]);
  
  return (
    <CallContext.Provider value={{
      activeCall,
      incomingCall,
      isCallLoading,
      initiateCall,
      answerCall,
      rejectCall,
      hangupCall,
      toggleCallAudio,
      toggleCallVideo,
      toggleMute,
      switchCallCamera
    }}>
      {children}
    </CallContext.Provider>
  );
};
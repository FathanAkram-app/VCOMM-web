import { createContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "wouter";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";

// Definisi interface untuk inisialisasi panggilan
interface IncomingCall {
  id: number;
  callerId: number;
  callerName: string;
  isRoom: boolean;
  roomId?: number;
  roomName?: string;
  callType: 'video' | 'audio';
  sdp?: RTCSessionDescriptionInit;
}

// Definisi interface untuk panggilan aktif
interface ActiveCall {
  id: number;
  peerId: number;
  peerName: string;
  isRoom: boolean;
  roomId?: number;
  roomName?: string;
  callType: 'video' | 'audio';
  startTime: Date;
  status: 'connecting' | 'connected' | 'reconnecting' | 'ended';
  localStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isMuted: boolean;
}

// Definisi interface untuk context call
interface CallContextType {
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;
  isCallLoading: boolean;
  startCall: (userId: number, callType: 'video' | 'audio') => Promise<void>;
  startRoomCall: (roomId: number, callType: 'video' | 'audio') => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  hangupCall: () => Promise<void>;
  toggleCallAudio: () => void;
  toggleCallVideo: () => void;
  toggleMute: () => void;
  switchCallCamera: () => Promise<void>;
}

export const CallContext = createContext<CallContextType | undefined>(undefined);

interface CallProviderProps {
  children: ReactNode;
}

export const CallProvider = ({ children }: CallProviderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State untuk panggilan
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCallLoading, setIsCallLoading] = useState(false);
  
  // Membuat panggilan ke pengguna lain
  const startCall = async (userId: number, callType: 'video' | 'audio') => {
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
      // Get user info untuk display
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error("Failed to get user information");
      const userInfo = await response.json();
      
      // Inisialisasi panggilan dengan WebRTC
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      
      setActiveCall({
        id: Date.now(),
        peerId: userId,
        peerName: userInfo.callsign || "UNKNOWN",
        isRoom: false,
        callType,
        startTime: new Date(),
        status: 'connecting',
        localStream,
        remoteStreams: new Map(),
        audioEnabled: true,
        videoEnabled: callType === 'video',
        isMuted: false,
      });
      
      // Navigate ke halaman call
      navigate(`/${callType}-call`);
      
      // Kirim signal ke server untuk memulai panggilan
      const callSignal = {
        type: 'call-offer',
        callerId: user.id,
        callerName: user.callsign,
        targetId: userId,
        callType: callType,
        isRoom: false,
        // sdp: sdpOffer - ini akan ditambahkan saat WebRTC diimplementasikan sepenuhnya
      };

      // Kirim ke server melalui WebSocket (akan diimplementasikan)
      // socket.send(JSON.stringify(callSignal));
      console.log('Sending call signal:', callSignal);
    } catch (error) {
      console.error("Error starting call:", error);
      toast({
        title: "Call Failed",
        description: "Failed to establish connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCallLoading(false);
    }
  };
  
  // Membuat panggilan ke group
  const startRoomCall = async (roomId: number, callType: 'video' | 'audio') => {
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
      // Get room info untuk display
      const response = await fetch(`/api/conversations/${roomId}`);
      if (!response.ok) throw new Error("Failed to get room information");
      const roomInfo = await response.json();
      
      // Inisialisasi panggilan dengan WebRTC
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      
      setActiveCall({
        id: Date.now(),
        peerId: roomId, // Menggunakan roomId sebagai peerId
        peerName: roomInfo.name || "GROUP CALL",
        isRoom: true,
        roomId,
        roomName: roomInfo.name,
        callType,
        startTime: new Date(),
        status: 'connecting',
        localStream,
        remoteStreams: new Map(),
        audioEnabled: true,
        videoEnabled: callType === 'video',
        isMuted: false,
      });
      
      // Navigate ke halaman call
      navigate(`/group-${callType}-call`);
      
      // Kirim signal ke server untuk memulai panggilan group
      const roomCallSignal = {
        type: 'room-call-start',
        callerId: user.id,
        callerName: user.callsign,
        roomId: roomId,
        callType: callType,
        isRoom: true,
      };

      // Kirim ke server melalui WebSocket (akan diimplementasikan)
      // socket.send(JSON.stringify(roomCallSignal));
      console.log('Sending room call signal:', roomCallSignal);
    } catch (error) {
      console.error("Error starting room call:", error);
      toast({
        title: "Group Call Failed",
        description: "Failed to establish connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCallLoading(false);
    }
  };
  
  // Menjawab panggilan masuk
  const answerCall = async () => {
    if (!incomingCall) return;
    
    setIsCallLoading(true);
    
    try {
      // Inisialisasi panggilan dengan WebRTC
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.callType === 'video',
      });
      
      setActiveCall({
        id: incomingCall.id,
        peerId: incomingCall.callerId,
        peerName: incomingCall.callerName,
        isRoom: incomingCall.isRoom,
        roomId: incomingCall.roomId,
        roomName: incomingCall.roomName,
        callType: incomingCall.callType,
        startTime: new Date(),
        status: 'connecting',
        localStream,
        remoteStreams: new Map(),
        audioEnabled: true,
        videoEnabled: incomingCall.callType === 'video',
        isMuted: false,
      });
      
      // Navigate ke halaman call yang sesuai
      if (incomingCall.isRoom) {
        navigate(`/group-${incomingCall.callType}-call`);
      } else {
        navigate(`/${incomingCall.callType}-call`);
      }
      
      // Reset incoming call state
      setIncomingCall(null);
      
      // Kirim signal ke server untuk menjawab panggilan (akan diimplementasikan)
      // const callAnswerSignal = {
      //   type: 'call-answer',
      //   targetId: incomingCall.callerId,
      //   isRoom: incomingCall.isRoom,
      //   roomId: incomingCall.roomId,
      //   sdp: sdpAnswer
      // };
      // socket.send(JSON.stringify(callAnswerSignal));
    } catch (error) {
      console.error("Error answering call:", error);
      toast({
        title: "Call Failed",
        description: "Failed to establish connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCallLoading(false);
    }
  };
  
  // Menolak panggilan masuk
  const rejectCall = () => {
    if (!incomingCall) return;
    
    // Kirim signal ke server untuk menolak panggilan (akan diimplementasikan)
    // const callRejectSignal = {
    //   type: 'call-reject',
    //   targetId: incomingCall.callerId,
    //   isRoom: incomingCall.isRoom,
    //   roomId: incomingCall.roomId
    // };
    // socket.send(JSON.stringify(callRejectSignal));
    
    // Reset incoming call state
    setIncomingCall(null);
  };
  
  // Mengakhiri panggilan aktif
  const hangupCall = async () => {
    if (!activeCall) return;
    
    try {
      // Kirim signal ke server untuk mengakhiri panggilan (akan diimplementasikan)
      // const callEndSignal = {
      //   type: 'call-end',
      //   targetId: activeCall.peerId,
      //   isRoom: activeCall.isRoom,
      //   roomId: activeCall.roomId
      // };
      // socket.send(JSON.stringify(callEndSignal));
      
      // Cleanup local streams
      if (activeCall.localStream) {
        activeCall.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Cleanup remote streams
      activeCall.remoteStreams.forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      
      // Reset active call state
      setActiveCall(null);
      
      // Navigate back
      navigate("/chat");
    } catch (error) {
      console.error("Error ending call:", error);
      toast({
        title: "Error",
        description: "Failed to properly end call. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Toggle audio pada panggilan aktif
  const toggleCallAudio = () => {
    if (!activeCall) return;
    
    const newAudioEnabled = !activeCall.audioEnabled;
    
    // Update tracks pada local stream
    if (activeCall.localStream) {
      activeCall.localStream.getAudioTracks().forEach(track => {
        track.enabled = newAudioEnabled;
      });
    }
    
    // Update state
    setActiveCall({
      ...activeCall,
      audioEnabled: newAudioEnabled,
    });
  };
  
  // Toggle video pada panggilan aktif
  const toggleCallVideo = () => {
    if (!activeCall || activeCall.callType !== 'video') return;
    
    const newVideoEnabled = !activeCall.videoEnabled;
    
    // Update tracks pada local stream
    if (activeCall.localStream) {
      activeCall.localStream.getVideoTracks().forEach(track => {
        track.enabled = newVideoEnabled;
      });
    }
    
    // Update state
    setActiveCall({
      ...activeCall,
      videoEnabled: newVideoEnabled,
    });
  };
  
  // Toggle mute pada panggilan aktif (mute speaker, bukan mikrofon)
  const toggleMute = () => {
    if (!activeCall) return;
    
    // Update state
    setActiveCall({
      ...activeCall,
      isMuted: !activeCall.isMuted,
    });
  };
  
  // Switch camera (front/back) pada perangkat mobile
  const switchCallCamera = async () => {
    if (!activeCall || activeCall.callType !== 'video') return;
    
    try {
      // Get current video track
      const currentVideoTrack = activeCall.localStream?.getVideoTracks()[0];
      if (!currentVideoTrack) return;
      
      // Check if we're using front or back camera
      const currentFacingMode = currentVideoTrack.getSettings().facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      // Get new stream with switched camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: activeCall.audioEnabled,
      });
      
      // Replace video track
      const newVideoTrack = newStream.getVideoTracks()[0];
      const audioTracks = activeCall.localStream?.getAudioTracks() || [];
      
      // Create a new stream with the new video track and existing audio tracks
      const newLocalStream = new MediaStream([newVideoTrack, ...audioTracks]);
      
      // Stop old video track
      currentVideoTrack.stop();
      
      // Update state with new stream
      setActiveCall({
        ...activeCall,
        localStream: newLocalStream,
      });
      
      // Update WebRTC connection - ini akan diimplementasikan saat WebRTC terintegrasi sepenuhnya
      // peerConnection.getSenders().find(sender => sender.track.kind === 'video').replaceTrack(newVideoTrack);
    } catch (error) {
      console.error("Error switching camera:", error);
      toast({
        title: "Camera Error",
        description: "Failed to switch camera. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Event handlers untuk WebSocket messages - ini akan diimplementasikan saat WebSocket terintegrasi
  useEffect(() => {
    // Mock handler untuk panggilan masuk untuk simulasi
    const simulateIncomingCall = () => {
      if (activeCall) return; // Jika sudah dalam panggilan, abaikan
      
      // Uncomment untuk mensimulasikan panggilan masuk setelah 5 detik
      // setTimeout(() => {
      //   if (!activeCall && !incomingCall) {
      //     setIncomingCall({
      //       id: 12345,
      //       callerId: 2, // User ID pemanggil
      //       callerName: "BRAVO2", // Nama pemanggil
      //       isRoom: false,
      //       callType: 'audio',
      //     });
      //   }
      // }, 5000);
    };
    
    simulateIncomingCall();
    
    // Cleanup function
    return () => {
      // Pembersihan event handler WebSocket akan ditambahkan nanti
    };
  }, [activeCall, incomingCall]);
  
  return (
    <CallContext.Provider
      value={{
        incomingCall,
        activeCall,
        isCallLoading,
        startCall,
        startRoomCall,
        answerCall,
        rejectCall,
        hangupCall,
        toggleCallAudio,
        toggleCallVideo,
        toggleMute,
        switchCallCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
import { useState, useEffect } from 'react';
import IncomingCallModal from './IncomingCallModal';
import AudioCall from './AudioCall';
import VideoCall from './VideoCall';
import { useLocation } from 'wouter';

/**
 * CallManager Component
 * 
 * Komponen ini mengatur navigasi antara interface panggilan video dan audio
 * berdasarkan tipe panggilan aktif. Juga menangani menampilkan modal panggilan masuk
 * ketika ada panggilan masuk tapi belum ada panggilan aktif.
 */
export default function CallManager() {
  const [callStatus, setCallStatus] = useState<{
    isActive: boolean;
    callType: 'audio' | 'video' | null;
    callerId?: number;
    callerName?: string;
    roomId?: number;
    isIncoming: boolean;
  }>({
    isActive: false,
    callType: null,
    isIncoming: false
  });
  
  const [, setLocation] = useLocation();

  // Fungsi untuk menerima panggilan
  const handleAcceptCall = () => {
    if (!callStatus.callType) return;
    
    setCallStatus(prev => ({
      ...prev,
      isActive: true,
      isIncoming: false
    }));
  };
  
  // Fungsi untuk menolak/mengakhiri panggilan
  const handleRejectCall = () => {
    setCallStatus({
      isActive: false,
      callType: null,
      isIncoming: false
    });
  };
  
  // Pantau WebSocket untuk panggilan masuk
  useEffect(() => {
    // Demo - simulasi panggilan masuk setelah delay
    // Akan diganti dengan logika WebSocket nyata
    const demoIncomingCall = setTimeout(() => {
      if (Math.random() > 0.7) {
        console.log("Demo: Incoming call simulation");
        // Ganti ini dengan logika WebSocket nyata
      }
    }, 15000);
    
    return () => clearTimeout(demoIncomingCall);
  }, []);

  // Tidak ada UI jika tidak ada panggilan aktif atau masuk
  if (!callStatus.isActive && !callStatus.isIncoming) {
    return null;
  }
  
  // Tampilkan modal panggilan masuk
  if (callStatus.isIncoming && !callStatus.isActive) {
    return (
      <IncomingCallModal
        callerName={callStatus.callerName || "Unknown"}
        callType={callStatus.callType || "audio"}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    );
  }
  
  // Tampilkan interface panggilan berdasarkan tipe
  if (callStatus.isActive && callStatus.callType) {
    return callStatus.callType === 'audio' ? (
      <AudioCall 
        callerId={callStatus.callerId}
        callerName={callStatus.callerName}
        onEndCall={handleRejectCall}
      />
    ) : (
      <VideoCall
        callerId={callStatus.callerId}
        callerName={callStatus.callerName}
        onEndCall={handleRejectCall}
      />
    );
  }
  
  return null;
}
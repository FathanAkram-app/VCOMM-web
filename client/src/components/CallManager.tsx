import { useEffect } from "react";
import { useCall } from "../hooks/useCall";
import AudioCall from "./AudioCall";
import VideoCall from "./VideoCall";
import IncomingCallModal from "./IncomingCallModal";

/**
 * CallManager Component
 * 
 * Komponen ini secara cerdas merutekan antara antarmuka panggilan video dan audio
 * berdasarkan jenis panggilan yang aktif. Komponen ini juga menangani tampilan modal panggilan masuk
 * ketika ada panggilan masuk tetapi belum ada panggilan aktif.
 */
export default function CallManager() {
  const { activeCall, incomingCall } = useCall();
  
  useEffect(() => {
    console.log("[CallManager] Active call:", activeCall);
    console.log("[CallManager] Incoming call:", incomingCall);
  }, [activeCall, incomingCall]);
  
  // Tampilkan modal panggilan masuk jika ada panggilan masuk dan tidak ada panggilan aktif
  if (incomingCall && !activeCall) {
    return <IncomingCallModal />;
  }
  
  // Arahkan ke komponen yang sesuai berdasarkan jenis panggilan aktif
  if (activeCall) {
    if (activeCall.callType === 'audio') {
      return <AudioCall />;
    } else {
      return <VideoCall />;
    }
  }
  
  // Tidak ada UI yang ditampilkan jika tidak ada panggilan aktif atau masuk
  return null;
}
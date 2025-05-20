import { useCall } from '@/hooks/useCall';
import VideoCall from './VideoCall';
import AudioCall from './AudioCall';
import IncomingCallModal from './IncomingCallModal';

/**
 * CallManager Component
 * 
 * Komponen ini bertanggung jawab untuk mengarahkan ke antarmuka panggilan video atau audio
 * berdasarkan jenis panggilan yang sedang aktif. Komponen ini juga menangani tampilan modal
 * panggilan masuk ketika ada panggilan masuk tetapi belum ada panggilan aktif.
 */
export default function CallManager() {
  const { callState } = useCall();
  
  // Jika ada panggilan aktif, tampilkan komponen panggilan yang sesuai
  if (callState.activeCall) {
    // Panggilan video aktif
    if (callState.activeCall.callType === 'video') {
      return <VideoCall />;
    }
    
    // Panggilan audio aktif
    return <AudioCall />;
  }
  
  // Jika ada panggilan masuk, tampilkan modal panggilan masuk
  if (callState.incomingCall) {
    return <IncomingCallModal />;
  }
  
  // Jika tidak ada panggilan aktif atau panggilan masuk, tidak tampilkan apa-apa
  return null;
}
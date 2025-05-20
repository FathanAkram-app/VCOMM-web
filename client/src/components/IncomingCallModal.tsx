import { useEffect } from 'react';
import { useCall } from '@/hooks/useCall';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';

/**
 * IncomingCallModal Component
 * 
 * Menampilkan modal panggilan masuk dengan opsi untuk menerima atau menolak
 * panggilan. Modal ini akan muncul ketika ada panggilan masuk dan
 * tidak ada panggilan aktif lainnya.
 */
export default function IncomingCallModal() {
  const { callState, acceptCall, rejectCall } = useCall();
  
  // Jika tidak ada panggilan masuk, tidak tampilkan apa-apa
  if (!callState.incomingCall) return null;
  
  // Putar suara panggilan masuk
  useEffect(() => {
    // Audio element untuk memutar nada dering
    const ringtone = new Audio('/sounds/incoming-call.mp3');
    ringtone.loop = true;
    
    try {
      // Putar nada dering
      ringtone.play().catch(err => {
        console.warn('Failed to play ringtone:', err);
      });
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
    
    // Cleanup saat komponen unmount atau panggilan dijawab/ditolak
    return () => {
      ringtone.pause();
      ringtone.currentTime = 0;
    };
  }, []);
  
  // Handler saat panggilan diterima
  const handleAcceptCall = async () => {
    await acceptCall();
  };
  
  // Handler saat panggilan ditolak
  const handleRejectCall = () => {
    rejectCall();
  };
  
  // Tentukan teks jenis panggilan
  const callTypeText = callState.incomingCall.callType === 'video' 
    ? 'Panggilan Video' 
    : 'Panggilan Audio';
  
  // Icon berdasarkan jenis panggilan
  const CallTypeIcon = callState.incomingCall.callType === 'video' ? Video : Phone;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-zinc-900 p-6 rounded-lg shadow-lg max-w-md w-full border border-zinc-700">
        <div className="flex flex-col items-center space-y-4">
          {/* Indikator panggilan masuk dan animasi */}
          <div className="w-24 h-24 rounded-full bg-emerald-800 flex items-center justify-center mb-2 animate-pulse">
            <CallTypeIcon size={40} className="text-white" />
          </div>
          
          {/* Informasi pemanggil */}
          <h2 className="text-2xl font-bold text-white">{callState.incomingCall.callerName}</h2>
          <p className="text-zinc-400">{callTypeText} masuk...</p>
          
          {/* Tombol aksi */}
          <div className="flex space-x-4 mt-6">
            {/* Tombol tolak panggilan */}
            <Button 
              variant="destructive" 
              size="lg" 
              className="rounded-full w-16 h-16 flex items-center justify-center" 
              onClick={handleRejectCall}
            >
              <PhoneOff size={28} />
            </Button>
            
            {/* Tombol terima panggilan */}
            <Button 
              variant="success" 
              size="lg" 
              className="rounded-full w-16 h-16 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleAcceptCall}
            >
              <Phone size={28} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
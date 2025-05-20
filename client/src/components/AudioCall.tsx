import { useEffect, useRef, useState } from 'react';
import { useCall } from '@/hooks/useCall';
import { Button } from '@/components/ui/button';
import { Phone, Mic, MicOff } from 'lucide-react';

/**
 * AudioCall Component
 * 
 * Komponen khusus untuk panggilan audio saja untuk meningkatkan
 * keandalan dan performa. Komponen ini tidak mencoba menangani
 * elemen video, mengurangi kompleksitas dan titik potensi kegagalan
 * untuk komunikasi audio saja.
 */
export default function AudioCall() {
  const { callState, endCall } = useCall();
  const [isMuted, setIsMuted] = useState(false);
  
  // Pastikan ada panggilan aktif, jika tidak, jangan render apapun
  if (!callState.activeCall) return null;
  
  // Handle mute/unmute
  const toggleMute = () => {
    if (!callState.activeCall?.localStream) return;
    
    callState.activeCall.localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    
    setIsMuted(!isMuted);
  };
  
  // Handle mengakhiri panggilan
  const handleEndCall = () => {
    endCall();
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header dengan nama lawan bicara */}
      <div className="bg-zinc-900 p-4 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className="text-lg font-semibold">{callState.activeCall.peerName}</h3>
        </div>
        <p className="text-zinc-400 text-sm">Panggilan Audio</p>
      </div>
      
      {/* Area tengah - tampilan audio call */}
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-800">
        <div className="w-32 h-32 rounded-full bg-emerald-800 flex items-center justify-center mb-4 animate-pulse">
          <span className="text-4xl font-bold text-white">
            {callState.activeCall.peerName?.charAt(0) || 'U'}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{callState.activeCall.peerName}</h2>
        <p className="text-zinc-400">Durasi panggilan: 00:00</p>
      </div>
      
      {/* Controls (bagian bawah) */}
      <div className="bg-zinc-900 p-4 flex items-center justify-center space-x-4">
        {/* Toggle mute button */}
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full w-12 h-12 ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-800 hover:bg-zinc-700'}`}
          onClick={toggleMute}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </Button>
        
        {/* End call button */}
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
          onClick={handleEndCall}
        >
          <Phone size={26} className="rotate-135" />
        </Button>
      </div>
    </div>
  );
}
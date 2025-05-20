import { useEffect, useRef, useState } from 'react';
import { useGroupCall } from '@/hooks/useGroupCall';
import { Button } from '@/components/ui/button';
import { Phone, Mic, MicOff, Video, VideoOff, Users } from 'lucide-react';

/**
 * GroupVideoCall Component
 * 
 * Komponen ini menampilkan antarmuka panggilan video grup dengan:
 * - Grid tampilan video untuk semua peserta
 * - Tampilan video lokal
 * - Kontrol untuk mute/unmute dan enable/disable video
 * - Tombol untuk meninggalkan panggilan
 */
export default function GroupVideoCall() {
  const { groupCallState, leaveGroupCall } = useGroupCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  // Pastikan ada panggilan grup aktif
  if (!groupCallState.activeGroupCall) return null;
  
  // Set stream video lokal ke elemen video
  useEffect(() => {
    if (localVideoRef.current && groupCallState.activeGroupCall?.localStream) {
      localVideoRef.current.srcObject = groupCallState.activeGroupCall.localStream;
    }
  }, [groupCallState.activeGroupCall?.localStream]);
  
  // Toggle mute/unmute mikrofon
  const toggleMute = () => {
    if (!groupCallState.activeGroupCall?.localStream) return;
    
    groupCallState.activeGroupCall.localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    
    setIsMuted(!isMuted);
  };
  
  // Toggle on/off kamera
  const toggleVideo = () => {
    if (!groupCallState.activeGroupCall?.localStream) return;
    
    groupCallState.activeGroupCall.localStream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    
    setIsVideoOff(!isVideoOff);
  };
  
  // Handle meninggalkan panggilan grup
  const handleLeaveCall = () => {
    leaveGroupCall();
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header dengan nama grup */}
      <div className="bg-zinc-900 p-4 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className="text-lg font-semibold">
            {groupCallState.activeGroupCall.roomName} 
            <span className="text-sm text-zinc-400 ml-2">
              ({groupCallState.activeGroupCall.participants.length + 1} peserta)
            </span>
          </h3>
        </div>
        <p className="text-zinc-400 text-sm">Panggilan Grup</p>
      </div>
      
      {/* Area utama dengan grid video */}
      <div className="flex-1 bg-zinc-900 p-2 overflow-auto">
        {/* Grid untuk video peserta */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 h-full ${
          groupCallState.activeGroupCall.participants.length > 0 ? 'auto-rows-fr' : 'auto-rows-auto'
        }`}>
          {/* Video lokal */}
          <div className="relative bg-zinc-800 rounded overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
            />
            
            {/* Placeholder jika video dimatikan */}
            {isVideoOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center mb-2">
                  <Users size={24} className="text-zinc-500" />
                </div>
                <span className="text-zinc-400">Saya (Video dimatikan)</span>
              </div>
            )}
            
            {/* Label nama */}
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-sm text-white">
              Saya
            </div>
          </div>
          
          {/* Video peserta lain */}
          {groupCallState.activeGroupCall.participants.map(participant => (
            <div 
              key={participant.userId} 
              className="relative bg-zinc-800 rounded overflow-hidden"
            >
              {participant.stream ? (
                <div className="w-full h-full">
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    ref={(el) => {
                      if (el && participant.stream) {
                        el.srcObject = participant.stream;
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center mb-2">
                    <Users size={24} className="text-zinc-500" />
                  </div>
                  <span className="text-zinc-400">Menghubungkan...</span>
                </div>
              )}
              
              {/* Label nama */}
              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-sm text-white">
                {participant.userName}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Kontrol (bagian bawah) */}
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
        
        {/* Leave call button */}
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
          onClick={handleLeaveCall}
        >
          <Phone size={26} className="rotate-135" />
        </Button>
        
        {/* Toggle video button */}
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full w-12 h-12 ${isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-800 hover:bg-zinc-700'}`}
          onClick={toggleVideo}
        >
          {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
        </Button>
      </div>
    </div>
  );
}
import { useEffect, useRef, useState } from 'react';
import { useCall } from '@/hooks/useCall';
import { Button } from '@/components/ui/button';
import { Phone, Mic, MicOff, Video, VideoOff, MoreVertical } from 'lucide-react';

/**
 * VideoCall Component
 * 
 * Komponen ini menampilkan antarmuka panggilan video dengan fitur:
 * - Tampilan video lokal dan remote
 * - Tombol untuk mengakhiri panggilan
 * - Tombol untuk mematikan/menyalakan mikrofon
 * - Tombol untuk mematikan/menyalakan kamera
 */
export default function VideoCall() {
  const { callState, endCall } = useCall();
  
  // Refs untuk elemen video
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // State untuk mikrofon dan kamera
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  // Mengatur video stream ke elemen video
  useEffect(() => {
    if (!callState.activeCall) return;
    
    // Set local video stream
    if (localVideoRef.current && callState.activeCall.localStream) {
      localVideoRef.current.srcObject = callState.activeCall.localStream;
    }
    
    // Set remote video stream
    if (remoteVideoRef.current && callState.activeCall.remoteStream) {
      remoteVideoRef.current.srcObject = callState.activeCall.remoteStream;
    }
  }, [callState.activeCall]);
  
  // Handle mematikan/menyalakan mikrofon
  const toggleMute = () => {
    if (!callState.activeCall?.localStream) return;
    
    callState.activeCall.localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    
    setIsMuted(!isMuted);
  };
  
  // Handle mematikan/menyalakan kamera
  const toggleVideo = () => {
    if (!callState.activeCall?.localStream) return;
    
    callState.activeCall.localStream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    
    setIsVideoOff(!isVideoOff);
  };
  
  // Handle mengakhiri panggilan
  const handleEndCall = () => {
    endCall();
  };
  
  // Jika tidak ada panggilan aktif, tidak perlu render apapun
  if (!callState.activeCall) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header dengan nama lawan bicara */}
      <div className="bg-zinc-900 p-4 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className="text-lg font-semibold">{callState.activeCall.peerName}</h3>
        </div>
        <p className="text-zinc-400 text-sm">Panggilan Video</p>
      </div>
      
      {/* Area video */}
      <div className="flex-1 relative">
        {/* Remote video (tampilan besar) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover bg-zinc-800 ${
            !callState.activeCall.remoteStream ? 'hidden' : ''
          }`}
        />
        
        {/* Placeholder jika belum ada remote stream */}
        {!callState.activeCall.remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-zinc-700 flex items-center justify-center mb-4">
                <Video size={40} className="text-zinc-500" />
              </div>
              <p className="text-zinc-400">Menghubungkan ke {callState.activeCall.peerName}...</p>
            </div>
          </div>
        )}
        
        {/* Local video (tampilan kecil, pojok kanan atas) */}
        <div className="absolute top-4 right-4 w-32 h-48 md:w-48 md:h-72 bg-zinc-800 rounded overflow-hidden border border-zinc-700 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
          
          {/* Placeholder untuk local video jika kamera dimatikan */}
          {isVideoOff && (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center">
                <Video size={20} className="text-zinc-500" />
              </div>
            </div>
          )}
        </div>
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
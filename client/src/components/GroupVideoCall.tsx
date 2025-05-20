import { useEffect, useRef, useState } from "react";
import useGroupCall from "../hooks/useGroupCall";
import { Button } from "./ui/button";
import { ChevronDown, Mic, MicOff, Camera, CameraOff, Phone, Volume2, Volume, MessageSquare, SwitchCamera, UserPlus, UserMinus } from "lucide-react";

/**
 * GroupVideoCall Component
 * 
 * Komponen ini menampilkan antarmuka panggilan video grup, menampilkan video dari semua peserta
 * dan menyediakan kontrol untuk manajemen panggilan.
 */
export default function GroupVideoCall() {
  const { activeGroupCall, leaveGroupCall, endGroupCallForAll, toggleMemberMute, addMemberToCall, removeMemberFromCall } = useGroupCall();
  const [callDuration, setCallDuration] = useState("00:00:00");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // State untuk tracking status mikrofon dan kamera
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  
  useEffect(() => {
    console.log("[GroupVideoCall] Component rendered with activeGroupCall:", activeGroupCall);
    
    // Start timer untuk durasi panggilan
    if (activeGroupCall) {
      const interval = setInterval(() => {
        const duration = new Date().getTime() - activeGroupCall.startTime.getTime();
        const hours = Math.floor(duration / 3600000).toString().padStart(2, '0');
        const minutes = Math.floor((duration % 3600000) / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((duration % 60000) / 1000).toString().padStart(2, '0');
        setCallDuration(`${hours}:${minutes}:${seconds}`);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [activeGroupCall]);
  
  // Inisialisasi stream kamera lokal
  useEffect(() => {
    async function setupLocalVideo() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera/microphone:", error);
      }
    }
    
    setupLocalVideo();
    
    // Cleanup
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Toggle mikrofon
  const toggleMicrophone = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isMicEnabled;
      });
      setIsMicEnabled(!isMicEnabled);
    }
  };
  
  // Toggle kamera
  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isCameraEnabled;
      });
      setIsCameraEnabled(!isCameraEnabled);
    }
  };
  
  // Ganti kamera (depan/belakang)
  const switchCamera = async () => {
    if (!localStream) return;
    
    try {
      // Hentikan video track yang ada
      localStream.getVideoTracks().forEach(track => track.stop());
      
      // Tentukan mode kamera baru
      const currentFacingMode = localStream.getVideoTracks()[0]?.getSettings().facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      // Dapatkan stream baru dengan kamera yang berbeda
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: true
      });
      
      // Tambahkan track audio ke stream baru
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        newStream.addTrack(track.clone());
      });
      
      // Update stream lokal
      setLocalStream(newStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error("Error switching camera:", error);
    }
  };
  
  // Keluar dari panggilan
  const handleLeaveCall = () => {
    if (activeGroupCall) {
      // Tanyakan konfirmasi jika pengguna adalah pembuat panggilan
      if (activeGroupCall.creatorId === 1) { // Gunakan user ID sebenarnya
        if (window.confirm("Apakah Anda ingin mengakhiri panggilan untuk semua anggota?")) {
          endGroupCallForAll();
        } else {
          leaveGroupCall();
        }
      } else {
        leaveGroupCall();
      }
    }
  };
  
  // Tampilkan pesan jika tidak ada panggilan aktif
  if (!activeGroupCall) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold mb-4">TIDAK ADA PANGGILAN GRUP AKTIF</h2>
          <p className="mb-6">Tidak ada panggilan grup yang sedang berlangsung.</p>
          <Button onClick={() => window.history.back()}>
            KEMBALI
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <header className="bg-black px-4 py-3 text-white flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2 text-white hover:bg-muted/20" 
            onClick={() => window.history.back()}
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
          <div>
            <h3 className="font-bold uppercase">{activeGroupCall.name}</h3>
            <p className="text-xs">
              {callDuration} | {activeGroupCall.callType.toUpperCase()} CHANNEL | 
              {activeGroupCall.members.filter(m => m.hasJoined).length} ANGGOTA
            </p>
          </div>
        </div>
        <div>
          <Button 
            variant="outline" 
            size="icon" 
            className="text-foreground hover:bg-muted/20 border-accent"
            onClick={switchCamera}
          >
            <SwitchCamera className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      {/* Area Video */}
      <div className="flex-1 relative bg-accent/5 p-1">
        {/* Grid Video */}
        <div className="w-full h-full grid grid-cols-2 gap-1">
          {/* Video lokal */}
          <div className="relative bg-secondary border border-accent overflow-hidden">
            {isCameraEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-none bg-secondary border-2 border-accent flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-secondary-foreground">YOU</span>
                  </div>
                  <CameraOff className="text-accent h-6 w-6 mb-2" />
                  <p className="text-xs font-bold uppercase text-accent">Camera Off</p>
                </div>
              </div>
            )}
            
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 text-xs font-bold uppercase text-white">
              YOU {!isMicEnabled && <MicOff className="h-3 w-3 inline ml-1" />}
            </div>
          </div>
          
          {/* Anggota grup lainnya */}
          {activeGroupCall.members
            .filter(member => member.id !== 1 && member.hasJoined) // Ganti dengan user ID sebenarnya
            .map((member, index) => (
              <div 
                key={member.id} 
                className="relative bg-secondary border border-accent overflow-hidden"
              >
                {/* Placeholder untuk video anggota - dalam implementasi sebenarnya ini akan menampilkan video dari anggota */}
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-none bg-secondary border-2 border-accent flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-secondary-foreground">
                        {member.callsign.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-bold uppercase text-accent">
                      {member.isActive ? "CONNECTED" : "CONNECTING..."}
                    </p>
                  </div>
                </div>
                
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 text-xs font-bold uppercase text-white">
                  {member.callsign} {member.isMuted && <MicOff className="h-3 w-3 inline ml-1" />}
                </div>
                
                {/* Admin controls */}
                {activeGroupCall.creatorId === 1 && ( // Ganti dengan user ID sebenarnya
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70"
                      onClick={() => toggleMemberMute(member.id)}
                    >
                      {member.isMuted ? <Volume className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70"
                      onClick={() => removeMemberFromCall(member.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
          {/* Placeholder untuk slot kosong */}
          {Array.from({ length: Math.max(0, 4 - activeGroupCall.members.filter(m => m.hasJoined).length) }).map((_, i) => (
            <div 
              key={`empty-${i}`} 
              className="bg-muted/20 border border-accent flex items-center justify-center"
            >
              <div className="text-center">
                <UserPlus className="h-12 w-12 text-accent/30 mx-auto mb-2" />
                <p className="text-xs uppercase text-accent/50 font-bold">Slot Tersedia</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Kontrol Tambahkan Anggota */}
        {isAddingMember && (
          <div className="absolute inset-0 bg-black/80 z-10 flex items-center justify-center p-4">
            <div className="bg-background border-2 border-accent p-4 w-full max-w-md">
              <h3 className="font-bold text-lg mb-3 uppercase">Tambah Anggota</h3>
              <div className="max-h-60 overflow-y-auto mb-4">
                <div className="space-y-2">
                  {/* Daftar anggota yang belum bergabung */}
                  {activeGroupCall.members
                    .filter(member => !member.hasJoined)
                    .map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center justify-between p-2 bg-muted hover:bg-accent/10"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-none bg-secondary border border-accent flex items-center justify-center mr-3">
                            <span className="text-sm font-bold">{member.callsign.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <span className="font-medium">{member.callsign}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-accent text-accent hover:bg-accent hover:text-white"
                          onClick={() => addMemberToCall(member.id)}
                        >
                          Panggil
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setIsAddingMember(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Kontrol Panggilan */}
      <div className="bg-black/90 px-4 py-5 flex justify-around items-center border-t-2 border-accent">
        <Button 
          variant="outline" 
          size="icon"
          className={`w-14 h-14 rounded-none ${
            isMicEnabled 
              ? 'bg-secondary border border-accent' 
              : 'bg-destructive text-destructive-foreground'
          }`}
          onClick={toggleMicrophone}
        >
          {isMicEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>
        
        <Button 
          variant="outline" 
          size="icon"
          className={`w-14 h-14 rounded-none ${
            isCameraEnabled 
              ? 'bg-secondary border border-accent' 
              : 'bg-destructive text-destructive-foreground'
          }`}
          onClick={toggleCamera}
        >
          {isCameraEnabled ? <Camera className="h-6 w-6" /> : <CameraOff className="h-6 w-6" />}
        </Button>
        
        <Button 
          variant="destructive" 
          size="icon"
          className="w-16 h-16 rounded-none"
          onClick={handleLeaveCall}
        >
          <Phone className="h-7 w-7 rotate-135" />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon"
          className="w-14 h-14 rounded-none bg-secondary border border-accent"
          onClick={() => window.history.back()}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon"
          className="w-14 h-14 rounded-none bg-secondary border border-accent"
          onClick={() => setIsAddingMember(true)}
        >
          <UserPlus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
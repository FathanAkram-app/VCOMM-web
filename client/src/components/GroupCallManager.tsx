import { useEffect } from "react";
import useGroupCall from "../hooks/useGroupCall";
import GroupVideoCall from "./GroupVideoCall";
import GroupAudioCall from "./GroupAudioCall"; // Catatan: Kita harus membuat komponen ini nanti
import { Button } from "./ui/button";
import { UserPlus, Users } from "lucide-react";
import { useAuth } from "../hooks/use-auth";

/**
 * GroupCallManager Component
 * 
 * Komponen ini mengelola UI panggilan grup, termasuk:
 * - Membuat grup taktis baru
 * - Mengelola anggota dalam grup taktis
 * - Melihat status grup taktis aktif
 * - Bergabung dengan grup taktis yang ada
 */
export default function GroupCallManager() {
  const { activeGroupCall, availableGroups, isCreatingCall, createGroupCall, joinGroupCall } = useGroupCall();
  const { user } = useAuth();
  
  useEffect(() => {
    console.log("[GroupCallManager] Active group call:", activeGroupCall);
    console.log("[GroupCallManager] Available groups:", availableGroups);
  }, [activeGroupCall, availableGroups]);
  
  // Tampilkan komponen yang sesuai berdasarkan jenis panggilan
  if (activeGroupCall) {
    if (activeGroupCall.callType === 'audio') {
      // Implementasi fallback untuk panggilan grup audio
      // Untuk saat ini, kita tampilkan pesan bahwa fitur ini akan segera hadir
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold uppercase mb-4">AUDIO GROUP CHANNEL</h2>
            <p className="mb-6">Fitur panggilan grup audio masih dalam pengembangan.</p>
            <p className="mb-6">Untuk saat ini, silahkan gunakan panggilan grup video.</p>
            <Button 
              onClick={() => window.history.back()}
              className="military-button"
            >
              KEMBALI KE COMMS
            </Button>
          </div>
        </div>
      );
      
      // Nantinya kita akan menggunakan komponen GroupAudioCall
      // return <GroupAudioCall />;
    } else {
      return <GroupVideoCall />;
    }
  }
  
  // Tampilkan daftar grup yang tersedia atau UI untuk membuat grup baru
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <header className="bg-black px-4 py-3 text-white">
        <h1 className="font-bold text-lg uppercase">TACTICAL GROUPS</h1>
        <p className="text-xs">Buat atau bergabung dengan grup taktis untuk komunikasi tim</p>
      </header>
      
      {/* Konten */}
      <div className="flex-1 p-4">
        {/* Grup yang tersedia */}
        {availableGroups.length > 0 ? (
          <div className="space-y-4">
            <h2 className="font-bold uppercase text-sm border-b border-accent pb-2">GRUP AKTIF</h2>
            
            {availableGroups.map(group => (
              <div 
                key={group.id} 
                className="border border-accent bg-secondary/10 p-3"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold uppercase">{group.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {group.callType.toUpperCase()} CHANNEL | 
                      {group.members.filter(m => m.hasJoined).length} ANGGOTA AKTIF
                    </p>
                  </div>
                  <Button
                    disabled={isCreatingCall || !!activeGroupCall}
                    onClick={() => joinGroupCall(group.id)}
                    className="military-button"
                  >
                    BERGABUNG
                  </Button>
                </div>
                
                {/* Daftar anggota grup */}
                <div className="mt-3 pt-2 border-t border-accent/30">
                  <p className="text-xs font-medium mb-2">ANGGOTA:</p>
                  <div className="flex flex-wrap">
                    {group.members.map(member => (
                      <div 
                        key={member.id} 
                        className={`text-xs px-2 py-1 mr-2 mb-2 ${
                          member.hasJoined
                          ? 'bg-accent/20 border border-accent'
                          : 'bg-muted/30 border border-muted'
                        }`}
                      >
                        {member.callsign}
                        {member.id === group.creatorId && " (CREATOR)"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <Users className="h-16 w-16 text-accent/30 mb-4" />
            <h2 className="text-xl font-bold uppercase mb-2">TIDAK ADA GRUP AKTIF</h2>
            <p className="text-center mb-6">Buat grup taktis baru untuk memulai</p>
          </div>
        )}
      </div>
      
      {/* Tombol Buat Grup Baru */}
      <div className="p-4 border-t border-accent">
        <Button
          className="w-full py-6"
          disabled={isCreatingCall || !!activeGroupCall}
          onClick={() => {
            // Untuk demo, buat grup dengan anggota sampel
            // Di implementasi sebenarnya, ini akan menampilkan UI pemilihan anggota
            if (user) {
              createGroupCall(
                "Tactical Team Alpha", 
                [1, 2, 3, 4], // ID pengguna sampel
                'video'
              );
            }
          }}
        >
          <UserPlus className="mr-2 h-5 w-5" />
          BUAT GRUP TAKTIS BARU
        </Button>
      </div>
    </div>
  );
}
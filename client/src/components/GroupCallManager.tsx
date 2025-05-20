import { useState } from 'react';
import { useGroupCall } from '@/hooks/useGroupCall';
import GroupVideoCall from './GroupVideoCall';
import { Button } from '@/components/ui/button';
import { Phone, Users, X } from 'lucide-react';

/**
 * GroupCallManager Component
 * 
 * Komponen ini mengelola UI panggilan grup, termasuk:
 * - Membuat grup tactical baru
 * - Mengelola anggota grup tactical
 * - Melihat status grup tactical aktif
 * - Bergabung dengan grup tactical yang ada
 */
export default function GroupCallManager() {
  const { 
    groupCallState, 
    isInGroupCall, 
    joinGroupCall, 
    leaveGroupCall, 
    acceptGroupCall, 
    rejectGroupCall 
  } = useGroupCall();
  
  // Tampilkan UI berdasarkan state panggilan grup
  
  // Jika ada panggilan grup aktif, tampilkan antarmuka panggilan grup
  if (isInGroupCall && groupCallState.activeGroupCall) {
    return <GroupVideoCall />;
  }
  
  // Jika ada panggilan grup masuk, tampilkan modal undangan panggilan grup
  if (groupCallState.incomingGroupCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-zinc-900 p-6 rounded-lg shadow-lg max-w-md w-full border border-zinc-700">
          <div className="flex flex-col items-center space-y-4">
            {/* Icon dan animasi */}
            <div className="w-24 h-24 rounded-full bg-emerald-800 flex items-center justify-center mb-2 animate-pulse">
              <Users size={40} className="text-white" />
            </div>
            
            {/* Informasi panggilan grup */}
            <h2 className="text-2xl font-bold text-white">{groupCallState.incomingGroupCall.roomName}</h2>
            <p className="text-zinc-400">Panggilan grup dari {groupCallState.incomingGroupCall.callerName}</p>
            
            {/* Tombol aksi */}
            <div className="flex space-x-4 mt-6">
              {/* Tombol tolak panggilan */}
              <Button 
                variant="destructive" 
                size="lg" 
                className="rounded-full w-16 h-16 flex items-center justify-center" 
                onClick={() => rejectGroupCall()}
              >
                <X size={28} />
              </Button>
              
              {/* Tombol terima panggilan */}
              <Button 
                variant="default" 
                size="lg" 
                className="rounded-full w-16 h-16 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700" 
                onClick={() => acceptGroupCall()}
              >
                <Phone size={28} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Tampilan untuk melihat dan bergabung dengan grup tactical
  return null; // Tampilan default (tidak menampilkan apa-apa)
}
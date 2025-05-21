import { useState, useEffect } from 'react';

/**
 * GroupCallManager Component
 * 
 * Komponen ini mengelola antarmuka panggilan grup, termasuk:
 * - Membuat grup taktis baru
 * - Mengelola anggota dalam grup taktis
 * - Melihat status grup taktis aktif
 * - Bergabung dengan grup taktis yang ada
 */

interface GroupCallProps {
  roomId?: number;
  callType?: 'audio' | 'video';
}

export default function GroupCallManager({ roomId, callType }: GroupCallProps = {}) {
  const [activeCall, setActiveCall] = useState<{
    id: string;
    roomId: number;
    callType: 'audio' | 'video';
    participants: { id: number; name: string; audioEnabled: boolean; videoEnabled: boolean }[];
  } | null>(null);
  
  // Demo data untuk pengujian UI
  const [availableGroups] = useState([
    { id: 1, name: 'ALPHA TEAM', memberCount: 5, isActive: true, callType: 'audio' },
    { id: 2, name: 'BRAVO SQUAD', memberCount: 3, isActive: true, callType: 'video' },
    { id: 3, name: 'COMMAND CENTER', memberCount: 8, isActive: false, callType: null }
  ]);
  
  // Cek apakah ada parameter grup dari prop
  useEffect(() => {
    if (roomId && callType) {
      handleJoinGroup(roomId, callType);
    }
  }, [roomId, callType]);
  
  // Bergabung dengan grup
  const handleJoinGroup = (groupId: number, callType: 'audio' | 'video') => {
    // Simulasi bergabung dengan grup
    const selectedGroup = availableGroups.find(g => g.id === groupId);
    if (!selectedGroup) return;
    
    setActiveCall({
      id: `call_${Date.now()}`,
      roomId: groupId,
      callType,
      participants: [
        { id: 1, name: 'YOUR CALLSIGN', audioEnabled: true, videoEnabled: callType === 'video' },
        { id: 2, name: 'ALPHA-1', audioEnabled: true, videoEnabled: callType === 'video' },
        { id: 3, name: 'BRAVO-2', audioEnabled: false, videoEnabled: false },
        { id: 4, name: 'DELTA-7', audioEnabled: true, videoEnabled: false },
      ]
    });
  };
  
  // Keluar dari panggilan grup
  const handleLeaveCall = () => {
    setActiveCall(null);
  };
  
  // UI bergantung pada status panggilan aktif
  if (!activeCall) {
    return null; // Tidak ada panggilan aktif, tidak menampilkan apa-apa
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="w-full max-w-4xl bg-zinc-900 border border-green-900/30 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-green-800/30 text-green-500 p-2 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold">
                GROUP TACTICAL {activeCall.callType.toUpperCase()} CALL
              </h3>
              <p className="text-zinc-400 text-sm">ROOM ID: {activeCall.roomId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-green-900/20 text-green-500 px-3 py-1 rounded text-sm animate-pulse">
              LIVE
            </div>
            <button
              onClick={handleLeaveCall}
              className="bg-red-600 hover:bg-red-500 text-white p-2 rounded"
              title="Leave call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Participants Grid */}
        <div className="p-4 bg-black">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {activeCall.participants.map(participant => (
              <div key={participant.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                {/* Video placeholder atau indikator audio */}
                <div className="w-full aspect-video bg-zinc-800 flex items-center justify-center">
                  {activeCall.callType === 'video' && participant.videoEnabled ? (
                    <div className="w-full h-full bg-gradient-to-br from-green-900/20 to-black flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                      <div className="w-20 h-20 bg-green-900/20 border border-green-900/30 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Participant info */}
                <div className="p-3 flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{participant.name}</p>
                    <div className="flex space-x-2 mt-1">
                      {participant.audioEnabled ? (
                        <span className="text-green-500 text-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-red-500 text-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        </span>
                      )}
                      
                      {activeCall.callType === 'video' && (
                        <>
                          {participant.videoEnabled ? (
                            <span className="text-green-500 text-xs">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </span>
                          ) : (
                            <span className="text-red-500 text-xs">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                              </svg>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {participant.id === 1 && (
                    <div className="flex space-x-2">
                      <button className={`p-2 rounded-full ${participant.audioEnabled ? 'bg-zinc-700' : 'bg-red-700'}`} title={participant.audioEnabled ? 'Mute' : 'Unmute'}>
                        {participant.audioEnabled ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        )}
                      </button>
                      {activeCall.callType === 'video' && (
                        <button className={`p-2 rounded-full ${participant.videoEnabled ? 'bg-zinc-700' : 'bg-red-700'}`} title={participant.videoEnabled ? 'Turn off video' : 'Turn on video'}>
                          {participant.videoEnabled ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Call controls */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-center space-x-4">
          <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full" title="Toggle screen share">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
          
          <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full" title="Toggle audio">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          {activeCall.callType === 'video' && (
            <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full" title="Toggle video">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          
          <button
            onClick={handleLeaveCall}
            className="p-3 bg-red-600 hover:bg-red-500 rounded-full"
            title="End call"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
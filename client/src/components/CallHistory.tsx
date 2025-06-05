import { useState } from 'react';
import { Phone, Video, Users, Clock, Calendar, ArrowLeft, PhoneCall, VideoIcon, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface CallHistoryProps {
  onBack: () => void;
}

interface CallHistoryItem {
  id: number;
  callId: string;
  callType: string;
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  contactName: string;
  isOutgoing: boolean;
  status: string;
  duration: number;
  timestamp: string;
}

export default function CallHistory({ onBack }: CallHistoryProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'audio' | 'video' | 'group'>('all');

  // Fetch call history
  const { data: callHistory = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/call-history'],
    enabled: !!user,
    refetchInterval: 3000, // Auto-refresh every 3 seconds
  });

  const getCallIcon = (callType: string) => {
    switch (callType) {
      case 'audio':
        return <Phone className="w-5 h-5 text-green-600" />;
      case 'video':
        return <Video className="w-5 h-5 text-blue-600" />;
      case 'group_audio':
        return (
          <div className="flex items-center">
            <Users className="w-4 h-4 text-green-600 mr-1" />
            <Phone className="w-4 h-4 text-green-600" />
          </div>
        );
      case 'group_video':
        return (
          <div className="flex items-center">
            <Users className="w-4 h-4 text-blue-600 mr-1" />
            <Video className="w-4 h-4 text-blue-600" />
          </div>
        );
      default:
        return <PhoneCall className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'missed':
        return 'text-red-600';
      case 'rejected':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Selesai';
      case 'missed':
        return 'Terlewat';
      case 'rejected':
        return 'Ditolak';
      case 'failed':
        return 'Gagal';
      default:
        return status;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredHistory = Array.isArray(callHistory) ? callHistory.filter((call: any) => {
    // Hanya tampilkan missed calls dan incoming calls (bukan outgoing)
    const isIncomingOrMissed = call.status === 'missed' || (call.status === 'accepted' && !call.isOutgoing);
    
    if (!isIncomingOrMissed) return false;
    
    if (filter === 'all') return true;
    if (filter === 'audio') return call.callType === 'audio';
    if (filter === 'video') return call.callType === 'video';
    if (filter === 'group') return call.callType?.startsWith('group_');
    return true;
  }) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat riwayat panggilan...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-3 text-white hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center">
          <PhoneCall className="w-6 h-6 mr-2 text-green-500" />
          <h1 className="text-xl font-semibold">Riwayat Panggilan</h1>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex p-4 space-x-2 border-b border-gray-700">
        <Button
          variant={filter === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-green-600 hover:bg-green-700' : 'text-gray-300 hover:bg-gray-700'}
        >
          Semua
        </Button>
        <Button
          variant={filter === 'audio' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('audio')}
          className={filter === 'audio' ? 'bg-green-600 hover:bg-green-700' : 'text-gray-300 hover:bg-gray-700'}
        >
          <Phone className="w-4 h-4 mr-1" />
          Audio
        </Button>
        <Button
          variant={filter === 'video' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('video')}
          className={filter === 'video' ? 'bg-green-600 hover:bg-green-700' : 'text-gray-300 hover:bg-gray-700'}
        >
          <Video className="w-4 h-4 mr-1" />
          Video
        </Button>
        <Button
          variant={filter === 'group' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('group')}
          className={filter === 'group' ? 'bg-green-600 hover:bg-green-700' : 'text-gray-300 hover:bg-gray-700'}
        >
          <Users className="w-4 h-4 mr-1" />
          Grup
        </Button>
      </div>

      {/* Call History List */}
      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <PhoneCall className="w-12 h-12 mb-4 opacity-50" />
            <p>Tidak ada riwayat panggilan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredHistory.map((call: CallHistoryItem) => (
              <div key={call.id} className="p-4 hover:bg-gray-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    {/* Call Icon */}
                    <div className="mr-3">
                      {getCallIcon(call.callType)}
                    </div>

                    {/* Call Info */}
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="font-medium text-white">
                          {call.contactName || 'Unknown'}
                        </h3>
                        {call.callType.includes('group') && (
                          <span className="ml-2 px-2 py-1 text-xs bg-gray-700 rounded-full text-gray-300">
                            Group
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center mt-1 text-sm text-gray-400">
                        {/* Arah panggilan dengan icon */}
                        <div className="flex items-center mr-2">
                          {call.status === 'missed' && (
                            <>
                              <PhoneOff className="w-4 h-4 mr-1 text-red-500" />
                              <span className="text-red-500">Missed call</span>
                            </>
                          )}
                          {call.status === 'initiated' && (
                            <>
                              <PhoneCall className="w-4 h-4 mr-1 text-green-500 rotate-45" />
                              <span>Outgoing</span>
                            </>
                          )}
                          {call.status === 'accepted' && (
                            <>
                              <PhoneCall className="w-4 h-4 mr-1 text-blue-500 -rotate-45" />
                              <span>Incoming</span>
                            </>
                          )}
                          {!['missed', 'initiated', 'accepted'].includes(call.status) && (
                            <>
                              <PhoneCall className="w-4 h-4 mr-1" />
                              <span>{call.status}</span>
                            </>
                          )}
                        </div>
                        
                        {call.duration > 0 && (
                          <>
                            <span className="mx-2">•</span>
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{formatDuration(call.duration)}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>
                          {(() => {
                            try {
                              const date = new Date(call.timestamp || call.startTime);
                              if (isNaN(date.getTime())) {
                                return 'Waktu tidak valid';
                              }
                              return formatDistanceToNow(date, { 
                                addSuffix: true, 
                                locale: id 
                              });
                            } catch (error) {
                              return 'Baru saja';
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Participants (for group calls) */}
                  {call.callType.startsWith('group_') && call.participantNames.length > 0 && (
                    <div className="flex -space-x-2 ml-4">
                      {call.participantNames.slice(0, 3).map((name, index) => (
                        <Avatar key={index} className="w-8 h-8 border-2 border-gray-700">
                          <AvatarFallback className="bg-gray-600 text-white text-xs">
                            {name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {call.participantNames.length > 3 && (
                        <div className="w-8 h-8 bg-gray-600 border-2 border-gray-700 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white">
                            +{call.participantNames.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
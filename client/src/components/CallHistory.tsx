import { useState, useEffect } from 'react';
import { Phone, Video, Users, Clock, Calendar, ArrowLeft, PhoneCall, VideoIcon, PhoneOff, Trash2, MoreVertical, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { useCall } from '@/hooks/useCall';
import { useToast } from '@/hooks/use-toast';

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
  startTime?: string;
  participantNames?: string[];
}

export default function CallHistory({ onBack }: CallHistoryProps) {
  const { user } = useAuth();
  const { startCall, startGroupCall } = useCall();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'audio' | 'video' | 'group'>('all');

  // Force refresh handler - aggressive cache clearing
  const handleForceRefresh = () => {
    // Clear all cache related to call history
    queryClient.removeQueries({ queryKey: ['/api/call-history'] });
    queryClient.invalidateQueries({ queryKey: ['/api/call-history'] });
    queryClient.refetchQueries({ queryKey: ['/api/call-history'] });
    // Force component rerender by calling refetch
    refetch();
    
    // Also try window reload as fallback
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Fetch call history with fresh data from database
  const { data: callHistory = [], isLoading, refetch, error } = useQuery<any[]>({
    queryKey: ['/api/call-history'],
    enabled: !!user,
    retry: 1,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Real-time updates - listen for call events via WebSocket
  useEffect(() => {
    const handleCallUpdate = (event: any) => {
      if (event.detail && (
        event.detail.type === 'call_ended' || 
        event.detail.type === 'call_missed' ||
        event.detail.type === 'incoming_call'
      )) {
        console.log('[CallHistory] Call event received, refreshing data:', event.detail);
        // Auto-refresh call history when call events occur
        queryClient.invalidateQueries({ queryKey: ['/api/call-history'] });
        refetch();
      }
    };

    // Listen for custom call events
    window.addEventListener('callHistoryUpdate', handleCallUpdate);
    
    return () => {
      window.removeEventListener('callHistoryUpdate', handleCallUpdate);
    };
  }, [queryClient, refetch]);

  // Delete call history mutation
  const deleteCallMutation = useMutation({
    mutationFn: async (callId: number) => {
      const response = await fetch(`/api/call-history/${callId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete call history');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/call-history'] });
      toast({
        title: "Call deleted",
        description: "Call history entry has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: "Failed to delete call history entry.",
        variant: "destructive",
      });
    },
  });

  // Callback functions
  const handleCallback = async (call: CallHistoryItem) => {
    try {
      if (call.callType?.startsWith('group_')) {
        // For group calls, use the group ID and name
        const groupId = call.isOutgoing ? call.toUserId : call.fromUserId;
        const groupName = call.contactName;
        const callType = call.callType.includes('video') ? 'video' : 'audio';
        startGroupCall(groupId, groupName, callType);
      } else {
        // For direct calls, use startCall with user ID, name, and call type
        const targetUserId = call.isOutgoing ? call.toUserId : call.fromUserId;
        const targetName = call.contactName;
        const callType = call.callType?.includes('video') ? 'video' : 'audio';
        startCall(targetUserId, targetName, callType);
      }
      
      toast({
        title: "Call initiated",
        description: `Calling ${call.contactName}...`,
      });
    } catch (error) {
      toast({
        title: "Call failed",
        description: "Failed to initiate callback.",
        variant: "destructive",
      });
    }
  };

  // Force console logging for debugging
  console.log('[CallHistory] Component rendered');
  console.log('[CallHistory] User:', user);
  console.log('[CallHistory] Data received:', callHistory);
  console.log('[CallHistory] IsLoading:', isLoading);
  console.log('[CallHistory] Error:', error);
  
  // Force show data if we have any
  const hasData = Array.isArray(callHistory) && callHistory.length > 0;

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
      case 'incoming':
        return 'text-green-600';
      case 'missed call':
        return 'text-red-600';
      case 'reject':
        return 'text-yellow-600';
      case 'outgoing':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'incoming':
        return 'Masuk';
      case 'missed call':
        return 'Terlewat';
      case 'reject':
        return 'Ditolak';
      case 'outgoing':
        return 'Keluar';
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

  // Debug: log the first few entries to understand data structure
  if (Array.isArray(callHistory) && callHistory.length > 0) {
    console.log('[CallHistory] First entry structure:', callHistory[0]);
    console.log('[CallHistory] All entries:', callHistory.map(c => ({ id: c.id, callType: c.callType, status: c.status, contactName: c.contactName })));
  }

  const filteredHistory = Array.isArray(callHistory) ? callHistory.filter((call: any) => {
    // Show all incoming calls since backend already filters for incoming only
    // Backend query: WHERE initiator_id != userId (already incoming calls only)
    
    if (filter === 'all') return true;
    if (filter === 'audio') return call.callType === 'audio';
    if (filter === 'video') return call.callType === 'video';
    if (filter === 'group') return call.callType?.startsWith('group_');
    return true;
  }) : [];

  // Show loading only when actually loading and no data
  if (isLoading && callHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat riwayat panggilan...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#111] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#333]">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mr-3 text-white hover:bg-[#262626]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center">
            <PhoneCall className="w-6 h-6 mr-2 text-[#8d9c6b]" />
            <h1 className="text-xl font-semibold text-[#8d9c6b]">Riwayat Panggilan</h1>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleForceRefresh}
          className="text-[#8d9c6b] hover:text-[#a5b87a] hover:bg-[#262626]"
          title="Refresh data"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
      </div>

      {/* Filter Buttons */}
      <div className="flex p-4 space-x-2 border-b border-[#333]">
        <Button
          variant={filter === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338]' : 'text-gray-300 hover:bg-[#262626]'}
        >
          Semua
        </Button>
        <Button
          variant={filter === 'audio' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('audio')}
          className={filter === 'audio' ? 'bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338]' : 'text-gray-300 hover:bg-[#262626]'}
        >
          <Phone className="w-4 h-4 mr-1" />
          Audio
        </Button>
        <Button
          variant={filter === 'video' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('video')}
          className={filter === 'video' ? 'bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338]' : 'text-gray-300 hover:bg-[#262626]'}
        >
          <Video className="w-4 h-4 mr-1" />
          Video
        </Button>
        <Button
          variant={filter === 'group' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('group')}
          className={filter === 'group' ? 'bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338]' : 'text-gray-300 hover:bg-[#262626]'}
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
          <div className="divide-y divide-[#333]">
            {filteredHistory.map((call: CallHistoryItem) => (
              <div key={call.id} className="p-4 hover:bg-[#1a1a1a] transition-colors">
                <div className="flex items-start justify-between">
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
                              const dateString = call.timestamp || call.startTime || '';
                              const date = new Date(dateString);
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
                  {call.callType?.startsWith('group_') && call.participantNames && call.participantNames.length > 0 && (
                    <div className="flex -space-x-2 ml-4">
                      {call.participantNames.slice(0, 3).map((name: string, index: number) => (
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
                  {/* Action Buttons - Positioned at the far right */}
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {/* Callback Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCallback(call)}
                      className="p-2 h-8 w-8 text-[#8d9c6b] hover:text-[#a5b87a] hover:bg-[#2d3328]/20"
                      title="Call back"
                    >
                      {call.callType?.includes('video') ? (
                        <VideoIcon className="w-4 h-4" />
                      ) : call.callType?.startsWith('group_') ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        <Phone className="w-4 h-4" />
                      )}
                    </Button>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCallMutation.mutate(call.id)}
                      disabled={deleteCallMutation.isPending}
                      className="p-2 h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Delete call history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useNotification } from '@/hooks/useNotification';
import { useWebSocket } from '@/context/WebSocketContext';
import { useCall } from '@/hooks/useCall';
import { useGroupCall } from '@/hooks/useGroupCall';

/**
 * NotificationManager Component
 * 
 * Komponen ini bertanggung jawab untuk mendengarkan pesan dari WebSocket
 * dan memicu notifikasi yang sesuai. Tidak merender UI apapun, hanya
 * mengelola logika notifikasi.
 */
export default function NotificationManager() {
  const { addNotification, playNotificationSound } = useNotification();
  const { events } = useWebSocket();
  const { handleIncomingCall } = useCall();
  const { groupCallState } = useGroupCall();
  const [, setLocation] = useLocation();

  // Mendengarkan event WebSocket untuk menghasilkan notifikasi
  useEffect(() => {
    if (!events) return;

    const handleWebSocketMessage = (event: CustomEvent) => {
      const data = event.detail;
      
      // Tangani pesan yang masuk
      if (data.type === 'new_message' && data.message) {
        // Hanya tampilkan notifikasi jika pesan dari pengguna lain (bukan diri sendiri)
        if (data.message.senderId !== data.currentUserId) {
          const isGroup = data.message.isRoom || false;
          const chatType = isGroup ? 'group' : 'pribadi';
          
          addNotification({
            type: 'message',
            title: `Pesan ${chatType} baru dari ${data.message.senderName || 'Pengguna'}`,
            message: data.message.content || '[Lampiran Media]',
            data: {
              chatId: data.message.conversationId,
              isRoom: isGroup,
              senderId: data.message.senderId,
              messageId: data.message.id
            }
          });
          
          // Putar suara notifikasi pesan
          playNotificationSound('message');
        }
      }
      
      // Tangani permintaan panggilan masuk
      else if (data.type === 'call_incoming' && !groupCallState.isInCall) {
        handleIncomingCall({
          callerId: data.callerId,
          callerName: data.callerName,
          callType: data.callType
        });
        
        // Putar suara notifikasi panggilan
        playNotificationSound('call');
      }
      
      // Tangani informasi panggilan grup baru
      else if (data.type === 'group_call_created' && !groupCallState.isInCall) {
        addNotification({
          type: 'groupCall',
          title: 'Panggilan Grup Baru',
          message: `${data.creatorName || 'Seseorang'} memulai panggilan di grup ${data.roomName || 'konferensi'}`,
          data: {
            roomId: data.roomId,
            roomName: data.roomName,
            creatorId: data.creatorId,
            callType: data.callType
          }
        });
        
        // Putar suara notifikasi panggilan grup
        playNotificationSound('groupCall');
      }
      
      // Tangani notifikasi sistem
      else if (data.type === 'system_notification') {
        addNotification({
          type: 'system',
          title: data.title || 'Notifikasi Sistem',
          message: data.message || 'Pesan dari sistem'
        });
        
        // Putar suara notifikasi sistem
        playNotificationSound('system');
      }
    };
    
    window.addEventListener('ws-message', handleWebSocketMessage as EventListener);
    
    return () => {
      window.removeEventListener('ws-message', handleWebSocketMessage as EventListener);
    };
  }, [addNotification, playNotificationSound, handleIncomingCall, events, groupCallState.isInCall]);

  // Komponen ini tidak merender UI apapun
  return null;
}
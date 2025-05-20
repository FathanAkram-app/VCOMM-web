import { useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';
import { ToastNotification } from './ui/toast-notification';
import { useWebSocket } from '@/context/WebSocketContext';
import { useCall } from '@/hooks/useCall';

/**
 * NotificationManager Component
 * 
 * Komponen ini menangani tampilan notifikasi di aplikasi, termasuk:
 * - Menampilkan toast notifications untuk pesan baru
 * - Menampilkan notifikasi untuk panggilan masuk
 * - Memainkan suara notifikasi
 */
export default function NotificationManager() {
  const { notifications, addNotification, markAsRead } = useNotification();
  const { events, isConnected } = useWebSocket();
  const { handleIncomingCall } = useCall();
  
  // Listen untuk event dari WebSocket
  useEffect(() => {
    if (!events) return;
    
    // Handle pesan masuk
    if (events.newMessage) {
      const { senderId, senderName, message, roomId, roomName, isRoom } = events.newMessage;
      
      // Buat notifikasi untuk pesan baru
      addNotification({
        type: 'message',
        title: isRoom ? roomName : senderName,
        message: message,
        action: {
          label: 'Lihat',
          onClick: () => {
            // Navigasi ke chat yang relevan
            window.dispatchEvent(new CustomEvent('navigate_to_chat', {
              detail: { id: isRoom ? roomId : senderId, isRoom }
            }));
            
            // Tandai notifikasi sebagai sudah dibaca
            markAsRead(Date.now().toString());
          }
        }
      });
    }
    
    // Handle panggilan masuk
    if (events.incomingCall) {
      const { callerId, callerName, callType } = events.incomingCall;
      
      // Lempar event ke CallContext
      handleIncomingCall({
        callerId,
        callerName,
        callType
      });
      
      // Buat notifikasi untuk panggilan masuk
      addNotification({
        type: 'call',
        title: 'Panggilan Masuk',
        message: `${callerName} sedang memanggil Anda`,
        action: {
          label: 'Jawab',
          onClick: () => {
            // Navigasi ke komponen panggilan
            window.dispatchEvent(new CustomEvent('handle_incoming_call'));
            
            // Tandai notifikasi sebagai sudah dibaca
            markAsRead(Date.now().toString());
          }
        }
      });
    }
    
    // Reset events setelah diproses
    events.newMessage = null;
    events.incomingCall = null;
    
  }, [events, addNotification, markAsRead, handleIncomingCall]);
  
  // Tampilkan toast notifications untuk setiap notifikasi
  return (
    <>
      {notifications.map((notification) => (
        <ToastNotification
          key={notification.id}
          id={notification.id}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onAction={notification.action?.onClick}
          actionLabel={notification.action?.label}
          onClose={() => markAsRead(notification.id)}
        />
      ))}
    </>
  );
}
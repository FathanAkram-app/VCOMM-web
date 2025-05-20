import { createContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import MessageNotification from '../components/MessageNotification';
import { useToast } from '../hooks/use-toast';

// Tipe untuk satu notifikasi pesan
interface MessageNotificationData {
  id: string;
  sender: string;
  message: string;
  conversationId: number;
  isRoom: boolean;
  timestamp: Date;
}

// Tipe untuk context notifikasi
interface NotificationContextType {
  // Fungsi untuk menambahkan notifikasi pesan baru
  addMessageNotification: (
    sender: string,
    message: string,
    conversationId: number,
    isRoom: boolean
  ) => void;
  
  // Fungsi untuk menghapus semua notifikasi
  clearAllNotifications: () => void;
  
  // Enable/disable notifikasi
  isNotificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  
  // Fungsi untuk membunyikan notifikasi
  playNotificationSound: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  // State untuk menyimpan semua notifikasi aktif
  const [notifications, setNotifications] = useState<MessageNotificationData[]>([]);
  // State untuk menyimpan apakah notifikasi diaktifkan
  const [isNotificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  // Untuk mendapatkan lokasi saat ini
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Element audio untuk suara notifikasi
  const [notificationSound, setNotificationSound] = useState<HTMLAudioElement | null>(null);
  
  // Inisialisasi audio saat mount
  useEffect(() => {
    const audio = new Audio('/sounds/notification.mp3');
    setNotificationSound(audio);
    
    // Cleanup pada unmount
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);
  
  // Fungsi untuk membunyikan notifikasi
  const playNotificationSound = () => {
    if (notificationSound && isNotificationsEnabled) {
      notificationSound.currentTime = 0;
      notificationSound.play().catch(err => {
        console.error('Error playing notification sound:', err);
      });
    }
  };
  
  // Fungsi untuk menambahkan notifikasi pesan baru
  const addMessageNotification = (
    sender: string,
    message: string,
    conversationId: number,
    isRoom: boolean
  ) => {
    // Jika pengguna sedang berada di halaman chat yang sama, jangan tampilkan notifikasi
    const currentPath = location.split('?')[0]; // hilangkan query parameters
    const isOnChatPage = currentPath === `/chat/${conversationId}`;
    
    if (isOnChatPage) {
      return;
    }
    
    // Buat ID unik untuk notifikasi
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Buat data notifikasi baru
    const newNotification: MessageNotificationData = {
      id,
      sender,
      message,
      conversationId,
      isRoom,
      timestamp: new Date()
    };
    
    // Tambahkan ke daftar notifikasi
    setNotifications(prev => [...prev, newNotification]);
    
    // Putar suara notifikasi
    playNotificationSound();
  };
  
  // Fungsi untuk menghapus notifikasi
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
  // Fungsi untuk menghapus semua notifikasi
  const clearAllNotifications = () => {
    setNotifications([]);
  };
  
  return (
    <NotificationContext.Provider
      value={{
        addMessageNotification,
        clearAllNotifications,
        isNotificationsEnabled,
        setNotificationsEnabled,
        playNotificationSound
      }}
    >
      {children}
      
      {/* Render semua notifikasi aktif */}
      {notifications.map((notification, index) => (
        <MessageNotification
          key={notification.id}
          sender={notification.sender}
          message={notification.message}
          conversationId={notification.conversationId}
          isRoom={notification.isRoom}
          timestamp={notification.timestamp}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  );
};
import { createContext, useState, ReactNode, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';

type NotificationType = 'message' | 'call' | 'info' | 'warning' | 'error';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { isConnected } = useWebSocket();
  
  // Hitung jumlah notifikasi yang belum dibaca
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  // Tambahkan notifikasi baru
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Putar suara notifikasi berdasarkan jenis
    playNotificationSound(notification.type);
  };
  
  // Putar suara notifikasi berdasarkan jenisnya
  const playNotificationSound = (type: NotificationType) => {
    let sound: HTMLAudioElement;
    
    switch (type) {
      case 'message':
        sound = new Audio('/sounds/message.mp3');
        break;
      case 'call':
        // Untuk panggilan, suara dikelola oleh CallContext
        return;
      case 'warning':
        sound = new Audio('/sounds/warning.mp3');
        break;
      case 'error':
        sound = new Audio('/sounds/error.mp3');
        break;
      default:
        sound = new Audio('/sounds/notification.mp3');
        break;
    }
    
    sound.play().catch(err => {
      console.warn('Failed to play notification sound:', err);
    });
  };
  
  // Tandai notifikasi sebagai sudah dibaca
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };
  
  // Tandai semua notifikasi sebagai sudah dibaca
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };
  
  // Hapus notifikasi tertentu
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
  // Hapus semua notifikasi
  const clearAllNotifications = () => {
    setNotifications([]);
  };
  
  // Tampilkan notifikasi konektivitas WebSocket
  useEffect(() => {
    if (!isConnected) {
      addNotification({
        type: 'warning',
        title: 'Koneksi Terputus',
        message: 'Koneksi ke server terputus. Mencoba menghubungkan kembali...'
      });
    }
  }, [isConnected]);
  
  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications
  };
  
  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationContext;
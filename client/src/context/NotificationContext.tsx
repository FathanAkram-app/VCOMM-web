import { createContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// Definisi jenis notifikasi
export type NotificationType = 'message' | 'call' | 'groupCall' | 'system';

// Interface untuk data notifikasi
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any; // Data tambahan spesifik untuk jenis notifikasi
  read: boolean;
  timestamp: Date;
}

// Interface untuk context
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  playNotificationSound: (type: NotificationType) => void;
}

// Context
export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider Props
interface NotificationProviderProps {
  children: ReactNode;
}

// Provider Component
export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
  
  // Preload audio files
  const [audioFiles, setAudioFiles] = useState<Record<NotificationType, HTMLAudioElement | null>>({
    message: null,
    call: null,
    groupCall: null,
    system: null
  });
  
  // Hitung jumlah notifikasi yang belum dibaca
  const unreadCount = notifications.filter(notif => !notif.read).length;
  
  // Load audio files once on component mount
  useEffect(() => {
    const loadAudio = () => {
      try {
        const messageAudio = new Audio('/sounds/message-notification.mp3');
        const callAudio = new Audio('/sounds/call-notification.mp3');
        const groupCallAudio = new Audio('/sounds/group-call-notification.mp3');
        const systemAudio = new Audio('/sounds/system-notification.mp3');
        
        setAudioFiles({
          message: messageAudio,
          call: callAudio,
          groupCall: groupCallAudio,
          system: systemAudio
        });
      } catch (error) {
        console.error('Failed to load notification sounds:', error);
      }
    };
    
    loadAudio();
    
    // Cleanup audio elements
    return () => {
      Object.values(audioFiles).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, []);
  
  // Fungsi untuk menambahkan notifikasi baru
  const addNotification = (notificationData: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: Date.now().toString(),
      read: false,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Tampilkan toast notifikasi
    toast({
      title: newNotification.title,
      description: newNotification.message,
      variant: newNotification.type === 'system' ? 'destructive' : 'default',
    });
    
    // Putar suara notifikasi
    playNotificationSound(newNotification.type);
  };
  
  // Fungsi untuk menandai notifikasi sebagai sudah dibaca
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };
  
  // Fungsi untuk menandai semua notifikasi sebagai sudah dibaca
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };
  
  // Fungsi untuk menghapus semua notifikasi
  const clearNotifications = () => {
    setNotifications([]);
  };
  
  // Fungsi untuk memutar suara notifikasi
  const playNotificationSound = (type: NotificationType) => {
    const audio = audioFiles[type];
    if (audio) {
      // Reset playback position
      audio.currentTime = 0;
      
      // Attempt to play the sound
      audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    }
  };
  
  // Value untuk context provider
  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    playNotificationSound
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
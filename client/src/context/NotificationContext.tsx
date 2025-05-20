import { createContext, ReactNode, useEffect, useState } from 'react';

// Tipe notifikasi
export type NotificationType = 'message' | 'call' | 'system';

// Interface notifikasi
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
}

// Interface context
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (title: string, message: string, type: NotificationType) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

// Default context
export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Props provider
interface NotificationProviderProps {
  children: ReactNode;
}

// Provider
export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Otomatis hapus notifikasi setelah 5 detik
  useEffect(() => {
    const timer = setInterval(() => {
      setNotifications(prevNotifications => {
        // Filter notifikasi yang lebih lama dari 5 detik
        const now = new Date();
        return prevNotifications.filter(notification => {
          const diff = now.getTime() - notification.timestamp.getTime();
          return diff < 5000; // 5 detik
        });
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Tambah notifikasi baru
  const addNotification = (title: string, message: string, type: NotificationType) => {
    const newNotification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type,
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  // Hapus notifikasi berdasarkan ID
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Hapus semua notifikasi
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
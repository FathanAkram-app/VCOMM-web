import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Bell, MessageSquare, Phone, AlertTriangle, Info } from 'lucide-react';
import { Button } from './button';
import { useLocation } from 'wouter';

interface ToastNotificationProps {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'call' | 'info' | 'warning' | 'error';
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
  duration?: number;
}

export function ToastNotification({
  id,
  title,
  message,
  type,
  onClose,
  onAction,
  actionLabel,
  duration = 5000,
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [, navigate] = useLocation();
  
  // Otomatis tutup notifikasi setelah durasi tertentu
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration]);
  
  // Handle animasi selesai, panggil onClose
  const handleAnimationComplete = () => {
    if (!isVisible) {
      onClose();
    }
  };
  
  // Tentukan ikon berdasarkan jenis notifikasi
  const getIcon = () => {
    switch (type) {
      case 'message':
        return <MessageSquare className="text-white" size={20} />;
      case 'call':
        return <Phone className="text-white" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-amber-500" size={20} />;
      case 'error':
        return <AlertTriangle className="text-red-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };
  
  // Tentukan warna latar belakang berdasarkan jenis notifikasi
  const getBgColor = () => {
    switch (type) {
      case 'message':
        return 'bg-emerald-800';
      case 'call':
        return 'bg-blue-800';
      case 'warning':
        return 'bg-amber-800';
      case 'error':
        return 'bg-red-800';
      default:
        return 'bg-zinc-800';
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={handleAnimationComplete}
          className="fixed top-4 right-4 z-50 max-w-md w-full"
        >
          <div className={`flex items-start p-4 rounded-lg shadow-lg border border-zinc-700 ${getBgColor()}`}>
            {/* Icon */}
            <div className="mr-3 mt-0.5">
              {getIcon()}
            </div>
            
            {/* Content */}
            <div className="flex-1 mr-2">
              <h4 className="font-medium text-white">{title}</h4>
              <p className="text-zinc-200 text-sm mt-1">{message}</p>
              
              {/* Action button */}
              {onAction && actionLabel && (
                <Button
                  variant="default"
                  size="sm"
                  className="mt-2 bg-white/20 hover:bg-white/30 text-white"
                  onClick={onAction}
                >
                  {actionLabel}
                </Button>
              )}
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setIsVisible(false)}
              className="text-zinc-300 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
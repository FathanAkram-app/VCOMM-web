import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { MdMessage, MdPerson, MdGroup } from 'react-icons/md';

interface MessageNotificationProps {
  sender: string;
  message: string;
  conversationId: number;
  isRoom: boolean;
  timestamp: Date;
  onClose: () => void;
}

export default function MessageNotification({
  sender,
  message,
  conversationId,
  isRoom,
  timestamp,
  onClose
}: MessageNotificationProps) {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [timeAgo, setTimeAgo] = useState('');
  
  // Auto dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Format time ago
  useEffect(() => {
    const updateTimeAgo = () => {
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
      
      if (diffSeconds < 60) {
        setTimeAgo(`${diffSeconds} detik yang lalu`);
      } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        setTimeAgo(`${minutes} menit yang lalu`);
      } else {
        const hours = Math.floor(diffSeconds / 3600);
        setTimeAgo(`${hours} jam yang lalu`);
      }
    };
    
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000); // Update tiap 30 detik
    
    return () => clearInterval(interval);
  }, [timestamp]);
  
  const handleView = () => {
    setLocation(`/chat/${conversationId}`);
    handleClose();
  };
  
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Beri waktu untuk animasi
  };
  
  // Batasi pesan jika terlalu panjang
  const truncateMessage = (text: string, maxLength = 60) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };
  
  return (
    <AlertDialog open={isVisible} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent className="notification-popup">
        <div className="flex items-start">
          <div className="bg-primary-600 rounded-full p-2 mr-4">
            {isRoom ? <MdGroup size={24} /> : <MdPerson size={24} />}
          </div>
          <div className="flex-1">
            <AlertDialogTitle className="mb-1 flex justify-between">
              <span>{sender}</span>
              <span className="text-sm text-gray-500">{timeAgo}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="mb-4">
              <div className="flex items-center gap-2">
                <MdMessage size={16} className="text-gray-400" />
                <span>{truncateMessage(message)}</span>
              </div>
            </AlertDialogDescription>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={handleClose} className="px-3 py-1 h-8">
                Tutup
              </AlertDialogCancel>
              <Button onClick={handleView} size="sm" className="px-3 py-1 h-8">
                Lihat
              </Button>
            </div>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
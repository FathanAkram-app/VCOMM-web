import { useState, useEffect } from "react";
import { MessageCircleIcon, Radio, Users, Settings, LogOut } from "lucide-react";
import { cn } from "../lib/utils";
import militaryLogo from "../assets/military-chat-icon.png";
import { Badge } from "./ui/badge";

interface NavBarProps {
  onLogout: () => void;
  unreadCount?: number;
}

export default function NavBar({ onLogout, unreadCount = 0 }: NavBarProps) {
  // State untuk menyimpan jumlah pesan yang belum dibaca
  const [localUnreadCount, setLocalUnreadCount] = useState<number>(unreadCount);
  
  // Update localUnreadCount ketika prop unreadCount berubah
  useEffect(() => {
    setLocalUnreadCount(unreadCount);
  }, [unreadCount]);
  
  // Effect untuk mendengarkan perubahan pesan belum dibaca dari localStorage
  useEffect(() => {
    // Fungsi untuk memperbarui jumlah pesan belum dibaca dari localStorage
    const updateUnreadCount = () => {
      try {
        const storedCount = localStorage.getItem('totalUnreadMessages');
        if (storedCount) {
          setLocalUnreadCount(parseInt(storedCount, 10));
        }
      } catch (error) {
        console.error("Error reading unread count from localStorage:", error);
      }
    };
    
    // Jalankan sekali saat komponen mount
    updateUnreadCount();
    
    // Tambahkan event listener untuk chatListUpdated
    const handleChatListUpdated = (event: CustomEvent) => {
      if (event.detail && event.detail.totalUnread !== undefined) {
        setLocalUnreadCount(event.detail.totalUnread);
      } else {
        updateUnreadCount();
      }
    };
    
    window.addEventListener('chatListUpdated', handleChatListUpdated as EventListener);
    
    // Cleanup saat komponen unmount
    return () => {
      window.removeEventListener('chatListUpdated', handleChatListUpdated as EventListener);
    };
  }, []);

  return (
    <div className="h-[60px] bg-[#323232] border-b border-accent/30 flex items-center justify-between px-4">
      <div className="flex items-center">
        <img 
          src={militaryLogo}
          alt="Military Chat" 
          className="h-10 w-10 mr-3"
        />
        <h1 className="text-lg font-bold text-white">TACTICAL COMM SYSTEM</h1>
        
        {/* Tampilkan notifikasi bila ada pesan belum dibaca */}
        {localUnreadCount > 0 && (
          <div className="flex items-center ml-4">
            <Badge className="bg-red-500 text-white px-2 py-1 rounded-full">
              {localUnreadCount > 99 ? "99+" : localUnreadCount}
            </Badge>
            <span className="ml-2 text-white text-sm">Pesan Belum Dibaca</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Logout button */}
        <button
          onClick={onLogout}
          className="text-[#e74c3c] hover:text-[#c0392b] transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
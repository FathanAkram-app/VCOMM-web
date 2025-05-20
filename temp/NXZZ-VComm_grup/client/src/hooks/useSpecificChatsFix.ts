// useSpecificChatsFix.ts - Hook untuk memastikan chat spesifik antara Aji dan Eko selalu ada
import { useState, useEffect } from 'react';

interface ChatItem {
  id: number;
  name: string;
  isRoom: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  otherUserId?: number;
  user1Id?: number;
  user2Id?: number;
}

export function useSpecificChatsFix() {
  const [isFixed, setIsFixed] = useState(false);
  const [ekoAjiChat, setEkoAjiChat] = useState<ChatItem | null>(null);
  
  useEffect(() => {
    function fixEkoAjiChat() {
      try {
        // Cek apakah user adalah Aji
        const userData = localStorage.getItem('user');
        if (!userData) return;
        
        const userObj = JSON.parse(userData);
        if (userObj.id !== 9) return; // Aji ID = 9
        
        console.log("[SPECIFIC_CHATS_FIX] Current user is Aji, applying specific fixes");
        
        // Dapatkan daftar direct chats dari localStorage
        let directChats: ChatItem[] = [];
        const directChatsStr = localStorage.getItem('directChats');
        if (directChatsStr) {
          try {
            directChats = JSON.parse(directChatsStr);
          } catch (e) {
            console.error("[SPECIFIC_CHATS_FIX] Failed to parse directChats", e);
            directChats = [];
          }
        }
        
        // Cek apakah Aji-Eko chat sudah ada
        const hasEkoChat = directChats.some(chat => 
          chat.id === 17 || 
          (chat.otherUserId === 7) ||
          (chat.user1Id === 7 && chat.user2Id === 9) ||
          (chat.user1Id === 9 && chat.user2Id === 7)
        );
        
        if (!hasEkoChat) {
          // Buat chat Eko-Aji secara manual
          const newEkoAjiChat: ChatItem = {
            id: 17,
            name: "Eko",
            isRoom: false,
            lastMessage: "Secure direct communication established.",
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0,
            otherUserId: 7,
            user1Id: 7,
            user2Id: 9
          };
          
          // Tambahkan ke daftar
          directChats.push(newEkoAjiChat);
          localStorage.setItem('directChats', JSON.stringify(directChats));
          
          // Ciptakan pesan default
          const messageKey = `messages_direct_17`;
          if (!localStorage.getItem(messageKey)) {
            const defaultMessages = [
              {
                id: Date.now(),
                text: "Halo Aji, ini Eko. Saluran komunikasi sudah tersedia.",
                sender: "Eko",
                timestamp: new Date().toISOString(),
                isRead: false
              }
            ];
            localStorage.setItem(messageKey, JSON.stringify(defaultMessages));
          }
          
          console.log("[SPECIFIC_CHATS_FIX] Added Eko-Aji chat to directChats");
          setEkoAjiChat(newEkoAjiChat);
        } else {
          console.log("[SPECIFIC_CHATS_FIX] Eko-Aji chat already exists");
          const existing = directChats.find(chat => 
            chat.id === 17 || 
            (chat.otherUserId === 7) ||
            (chat.user1Id === 7 && chat.user2Id === 9) ||
            (chat.user1Id === 9 && chat.user2Id === 7)
          );
          if (existing) setEkoAjiChat(existing);
        }
        
        setIsFixed(true);
      } catch (error) {
        console.error("[SPECIFIC_CHATS_FIX] Error fixing chats:", error);
      }
    }
    
    fixEkoAjiChat();
    
    // Periksa setiap 3 detik untuk memastikan chat tetap ada
    const interval = setInterval(fixEkoAjiChat, 3000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  return { isFixed, ekoAjiChat };
}
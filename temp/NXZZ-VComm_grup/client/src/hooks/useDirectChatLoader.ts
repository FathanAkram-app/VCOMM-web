// useDirectChatLoader.ts - Hook untuk memuat chat dari database
import { useState, useEffect } from 'react';
import { getAuthData } from '../lib/authUtils';

interface DirectChat {
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

interface Room {
  id: number;
  name: string;
  isRoom: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  members?: number;
}

export function useDirectChatLoader() {
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  async function loadChats() {
    try {
      setIsLoading(true);
      const userData = getAuthData();
      
      if (!userData || !userData.id) {
        setError("User tidak terautentikasi");
        setIsLoading(false);
        return;
      }
      
      console.log("[CHAT_LOADER] Memuat chat untuk user ID:", userData.id);
      
      // Ambil semua chat dari API
      const response = await fetch('/api/user/chats', {
        headers: {
          'Authorization': `Bearer ${userData.id}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error mengambil chat: ${response.status}`);
      }
      
      const chats = await response.json();
      
      // Filter untuk direct chats dan rooms
      const directChatsData = chats.filter((chat: any) => !chat.isRoom);
      const roomsData = chats.filter((chat: any) => chat.isRoom);
      
      console.log("[CHAT_LOADER] Ditemukan direct chats:", directChatsData.length);
      console.log("[CHAT_LOADER] Ditemukan rooms:", roomsData.length);
      
      // Update state
      setDirectChats(directChatsData);
      setRooms(roomsData);
      setError(null);
      setLastFetched(new Date());
      
      // Simpan ke localStorage sebagai fallback
      localStorage.setItem('directChats', JSON.stringify(directChatsData));
      localStorage.setItem('rooms', JSON.stringify(roomsData));
    } catch (err: any) {
      console.error("[CHAT_LOADER] Error:", err);
      setError(err.message || "Gagal memuat chat");
      
      // Coba ambil dari localStorage jika ada
      try {
        const directChatsStr = localStorage.getItem('directChats');
        const roomsStr = localStorage.getItem('rooms');
        
        if (directChatsStr) {
          setDirectChats(JSON.parse(directChatsStr));
        }
        
        if (roomsStr) {
          setRooms(JSON.parse(roomsStr));
        }
      } catch (e) {
        console.error("[CHAT_LOADER] Error mengambil dari localStorage:", e);
      }
    } finally {
      setIsLoading(false);
    }
  }
  
  // Periksa chat yang belum dibaca
  async function checkUnreadMessages() {
    try {
      const userData = getAuthData();
      if (!userData || !userData.id) return;
      
      // Periksa pesan yang belum dibaca untuk setiap direct chat
      for (const chat of directChats) {
        if (!chat.id) continue;
        
        try {
          const response = await fetch(`/api/chat/direct-chats/${chat.id}/messages`, {
            headers: {
              'Authorization': `Bearer ${userData.id}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const messages = await response.json();
            
            // Hitung pesan yang belum dibaca
            const unreadCount = messages.filter((msg: any) => 
              !msg.isRead && msg.senderId !== userData.id
            ).length;
            
            // Update count jika berbeda
            if (unreadCount !== chat.unreadCount) {
              setDirectChats(prev => 
                prev.map(c => 
                  c.id === chat.id 
                    ? { ...c, unreadCount } 
                    : c
                )
              );
            }
          }
        } catch (err) {
          console.warn(`[CHAT_LOADER] Error memeriksa pesan untuk chat ${chat.id}:`, err);
        }
      }
      
      // Sama untuk rooms
      for (const room of rooms) {
        if (!room.id) continue;
        
        try {
          const response = await fetch(`/api/chat/rooms/${room.id}/messages`, {
            headers: {
              'Authorization': `Bearer ${userData.id}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const messages = await response.json();
            
            // Hitung pesan yang belum dibaca
            const unreadCount = messages.filter((msg: any) => 
              !msg.isRead && msg.senderId !== userData.id
            ).length;
            
            // Update count jika berbeda
            if (unreadCount !== room.unreadCount) {
              setRooms(prev => 
                prev.map(r => 
                  r.id === room.id 
                    ? { ...r, unreadCount } 
                    : r
                )
              );
            }
          }
        } catch (err) {
          console.warn(`[CHAT_LOADER] Error memeriksa pesan untuk room ${room.id}:`, err);
        }
      }
    } catch (err) {
      console.error("[CHAT_LOADER] Error memeriksa pesan yang belum dibaca:", err);
    }
  }

  // Load chats saat komponen mount dan set interval untuk polling
  useEffect(() => {
    loadChats();
    
    // Polling setiap 10 detik
    const interval = setInterval(() => {
      loadChats();
    }, 10000);
    
    // Check unread messages setiap 5 detik
    const unreadInterval = setInterval(() => {
      checkUnreadMessages();
    }, 5000);
    
    return () => {
      clearInterval(interval);
      clearInterval(unreadInterval);
    };
  }, []);

  return {
    directChats,
    rooms,
    isLoading,
    error,
    lastFetched,
    refresh: loadChats
  };
}
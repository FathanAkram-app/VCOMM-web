// useDynamicChatFix.ts - Perbaikan untuk pengambilan dan tampilan chat yang lebih dinamis
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

export function useDynamicChatFix() {
  const [isFixed, setIsFixed] = useState(false);
  
  useEffect(() => {
    async function fixChatLists() {
      try {
        // 1. Ambil semua data yang relevan dari API
        const userData = localStorage.getItem('user');
        if (!userData) return;
        
        const userObj = JSON.parse(userData);
        const userId = userObj.id;
        
        console.log("[DYNAMIC_CHAT_FIX] Running dynamic fix for user ID:", userId);
        
        // 2. Pastikan kita memiliki data user dari server
        try {
          const userResponse = await fetch('/api/users', {
            headers: {
              'Authorization': `Bearer ${userId}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (userResponse.ok) {
            const users = await userResponse.json();
            localStorage.setItem('allUsers', JSON.stringify(users));
            console.log("[DYNAMIC_CHAT_FIX] Updated user list in localStorage");
          }
        } catch (error) {
          console.warn("[DYNAMIC_CHAT_FIX] Could not fetch users:", error);
        }
        
        // 3. Ambil semua chat dari server
        try {
          const chatsResponse = await fetch('/api/user/chats', {
            headers: {
              'Authorization': `Bearer ${userId}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (chatsResponse.ok) {
            const chats = await chatsResponse.json();
            
            // Pisahkan chat berdasarkan tipe
            const directChats = chats.filter((chat: any) => !chat.isRoom);
            const rooms = chats.filter((chat: any) => chat.isRoom);
            
            // Simpan ke localStorage sebagai fallback
            localStorage.setItem('directChats', JSON.stringify(directChats));
            localStorage.setItem('rooms', JSON.stringify(rooms));
            
            console.log("[DYNAMIC_CHAT_FIX] Updated chat lists in localStorage");
          }
        } catch (error) {
          console.warn("[DYNAMIC_CHAT_FIX] Could not fetch chats:", error);
          
          // Jika gagal mengambil dari server, periksa apakah ada data di localStorage
          const directChatsStr = localStorage.getItem('directChats');
          const roomsStr = localStorage.getItem('rooms');
          
          if (!directChatsStr && !roomsStr) {
            console.log("[DYNAMIC_CHAT_FIX] No local chat data found, creating empty chat lists");
            localStorage.setItem('directChats', JSON.stringify([]));
            localStorage.setItem('rooms', JSON.stringify([]));
          }
        }
        
        // 4. Lakukan polling API untuk direct chat
        const allUsersStr = localStorage.getItem('allUsers');
        if (allUsersStr) {
          const allUsers = JSON.parse(allUsersStr);
          
          // Jika kita memiliki daftar pengguna, periksa direct chat dengan setiap pengguna
          for (const user of allUsers) {
            // Skip diri sendiri
            if (user.id === userId) continue;
            
            // Periksa apakah kita sudah memiliki direct chat dengan pengguna ini
            const directChatsStr = localStorage.getItem('directChats');
            let directChats = directChatsStr ? JSON.parse(directChatsStr) : [];
            
            const hasDirectChat = directChats.some((chat: any) => 
              (chat.otherUserId === user.id) || 
              (chat.user1Id === user.id && chat.user2Id === userId) || 
              (chat.user1Id === userId && chat.user2Id === user.id)
            );
            
            if (!hasDirectChat) {
              console.log(`[DYNAMIC_CHAT_FIX] No direct chat found with user ${user.username}, trying to fetch`);
              
              try {
                // Coba dapatkan/buat chat dengan pengguna ini dari server
                const directChatResponse = await fetch('/api/chat/direct-chats', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${userId}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ userId: user.id })
                });
                
                if (directChatResponse.ok) {
                  const newChat = await directChatResponse.json();
                  console.log(`[DYNAMIC_CHAT_FIX] Successfully created direct chat with ${user.username}:`, newChat);
                  
                  // Perbarui daftar di localStorage
                  directChats.push(newChat);
                  localStorage.setItem('directChats', JSON.stringify(directChats));
                }
              } catch (error) {
                console.warn(`[DYNAMIC_CHAT_FIX] Failed to create direct chat with ${user.username}:`, error);
              }
            }
          }
        }
        
        setIsFixed(true);
      } catch (error) {
        console.error("[DYNAMIC_CHAT_FIX] Error:", error);
      }
    }
    
    fixChatLists();
    
    // Jalankan perbaikan setiap 30 detik untuk memastikan data tetap segar
    const interval = setInterval(fixChatLists, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  return { isFixed };
}
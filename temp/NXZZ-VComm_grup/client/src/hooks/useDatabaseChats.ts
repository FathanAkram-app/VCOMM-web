/**
 * useDatabaseChats.ts - Hook untuk mengakses daftar chat langsung dari database
 * 
 * Hook ini menyediakan metode untuk mendapatkan daftar chat (direct chat dan room)
 * langsung dari database, dengan fallback ke storage lokal jika diperlukan.
 */

import { useState, useEffect, useCallback } from 'react';
import { addAuthHeaders, getAuthData } from '../lib/authUtils';
import { ChatItem, fixChatList } from '../lib/chatFixer';

interface UseDatabaseChatsResult {
  chats: ChatItem[];
  directChats: ChatItem[];
  rooms: ChatItem[];
  isLoading: boolean;
  error: Error | null;
  refreshChats: () => Promise<void>;
}

/**
 * Mengambil daftar direct chat dari database
 */
async function loadDirectChatsFromDB(): Promise<ChatItem[]> {
  try {
    const authData = getAuthData();
    if (!authData) throw new Error('Not authenticated');
    
    const userId = authData.id;
    const response = await fetch(`/api/chat/direct-chats/user/${userId}`, {
      method: 'GET',
      ...addAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch direct chats: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform data into our ChatItem format
    const directChats: ChatItem[] = data.map((chat: any) => ({
      id: chat.id,
      type: 'direct',
      name: chat.otherUserName || chat.name || `Chat ${chat.id}`,
      lastMessage: chat.lastMessage?.content || '',
      lastMessageTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp) : new Date(),
      unreadCount: chat.unreadCount || 0,
      otherUserId: chat.otherUserId || chat.userId || null,
      otherUserName: chat.otherUserName || chat.userName || null,
      isOnline: chat.isOnline || false
    }));
    
    // Cache the result
    localStorage.setItem('direct_chats', JSON.stringify(directChats));
    
    return directChats;
  } catch (error) {
    console.error('Error loading direct chats from DB:', error);
    
    // Try loading from localStorage as fallback
    const cachedChats = localStorage.getItem('direct_chats');
    if (cachedChats) {
      try {
        return JSON.parse(cachedChats);
      } catch (e) {
        console.error('Error parsing cached direct chats:', e);
      }
    }
    
    return [];
  }
}

/**
 * Mengambil daftar rooms dari database
 */
async function loadRoomsFromDB(): Promise<ChatItem[]> {
  try {
    const response = await fetch('/api/user/rooms', {
      method: 'GET',
      ...addAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rooms: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform data into our ChatItem format
    const rooms: ChatItem[] = data.map((room: any) => ({
      id: room.id,
      type: 'room',
      name: room.name || `Room ${room.id}`,
      lastMessage: room.lastMessage?.content || '',
      lastMessageTime: room.lastMessage?.timestamp ? new Date(room.lastMessage.timestamp) : new Date(),
      unreadCount: room.unreadCount || 0,
      members: room.members || []
    }));
    
    // Cache the result
    localStorage.setItem('rooms', JSON.stringify(rooms));
    
    return rooms;
  } catch (error) {
    console.error('Error loading rooms from DB:', error);
    
    // Try loading from localStorage as fallback
    const cachedRooms = localStorage.getItem('rooms');
    if (cachedRooms) {
      try {
        return JSON.parse(cachedRooms);
      } catch (e) {
        console.error('Error parsing cached rooms:', e);
      }
    }
    
    return [];
  }
}

/**
 * Hook untuk mendapatkan daftar chat dari database
 */
export function useDatabaseChats(): UseDatabaseChatsResult {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [directChats, setDirectChats] = useState<ChatItem[]>([]);
  const [rooms, setRooms] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fungsi untuk memuat ulang daftar chat
  const refreshChats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Muat direct chats dan rooms secara parallel
      const [directChatsResult, roomsResult] = await Promise.all([
        loadDirectChatsFromDB(),
        loadRoomsFromDB()
      ]);
      
      setDirectChats(directChatsResult);
      setRooms(roomsResult);
      
      // Gabungkan dan perbaiki daftar
      const allChats = [...directChatsResult, ...roomsResult];
      const fixedChats = fixChatList(allChats);
      setChats(fixedChats);
    } catch (err) {
      console.error('Error refreshing chats:', err);
      setError(err instanceof Error ? err : new Error('Unknown error refreshing chats'));
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Load chats when component mounts
  useEffect(() => {
    refreshChats();
  }, [refreshChats]);
  
  return {
    chats,
    directChats,
    rooms,
    isLoading,
    error,
    refreshChats
  };
}
/**
 * useDirectChatFix.ts - Hook khusus untuk memastikan direct chat antara pengguna
 * selalu muncul dengan benar
 * 
 * Hook ini akan memeriksa apakah chat tertentu ada di database, dan jika tidak,
 * akan mencoba membuatnya atau menyediakan tampilan sementara.
 */

import { useState, useEffect } from 'react';
import { getAuthData } from '../lib/authUtils';
import { ensureDirectChatExists, getUserInfo } from '../lib/chatDB';

interface UseDirectChatFixResult {
  chatExists: boolean;
  chatData: any | null;
  otherUserData: any | null;
  isLoading: boolean;
  error: Error | null;
  refreshChat: () => Promise<void>;
}

/**
 * Hook untuk memastikan direct chat antara dua pengguna ada dan bisa diakses
 * 
 * @param otherUserId ID pengguna lain yang ingin dichat
 * @returns Object dengan status chat dan data terkait
 */
export function useDirectChatFix(otherUserId: number): UseDirectChatFixResult {
  const [chatData, setChatData] = useState<any | null>(null);
  const [otherUserData, setOtherUserData] = useState<any | null>(null);
  const [chatExists, setChatExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fungsi untuk me-refresh data chat
  const refreshChat = async () => {
    const authData = getAuthData();
    
    if (!authData || !authData.id) {
      setError(new Error('User not authenticated'));
      setIsLoading(false);
      return;
    }
    
    if (!otherUserId) {
      setError(new Error('Invalid other user ID'));
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Coba dapatkan info pengguna lain secara parallel dengan pemeriksaan chat
      const [directChatResult, userInfoResult] = await Promise.all([
        ensureDirectChatExists(authData.id, otherUserId),
        getUserInfo(otherUserId)
      ]);
      
      // Update user info
      setOtherUserData(userInfoResult);
      
      if (directChatResult) {
        setChatData(directChatResult);
        setChatExists(true);
      } else {
        // Chat tidak berhasil dibuat
        setChatExists(false);
        
        // Tapi kita bisa membuat chat local sementara jika kita punya info user
        if (userInfoResult) {
          const tempChat = {
            id: -Date.now(), // ID negatif temporari
            user1Id: authData.id,
            user2Id: otherUserId,
            otherUserId: otherUserId,
            isRoom: false,
            name: userInfoResult.username || `User ${otherUserId}`,
            lastMessage: 'Chat belum tersedia di database',
            lastMessageTime: new Date().toISOString(),
            isTemporary: true
          };
          
          setChatData(tempChat);
        }
      }
    } catch (err) {
      console.error('Error in useDirectChatFix:', err);
      setError(err instanceof Error ? err : new Error('Unknown error checking direct chat'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Periksa chat saat mount atau saat pengguna/otherUserId berubah
  useEffect(() => {
    refreshChat();
  }, [otherUserId]);
  
  return {
    chatExists,
    chatData,
    otherUserData,
    isLoading,
    error,
    refreshChat
  };
}
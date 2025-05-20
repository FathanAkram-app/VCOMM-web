/**
 * useDirectMessages.ts - Hook untuk mengakses dan mengelola pesan chat dari database
 * 
 * Hook ini menyediakan cara untuk mengakses pesan dalam chat langsung dari database
 * dengan fallback ke localStorage saat koneksi server bermasalah
 */

import { useState, useEffect, useCallback } from 'react';
import { getAuthData } from '../lib/authUtils';
import { getMessagesFromDB, addLocalMessage } from '../lib/chatDB';
import { ensureDefaultMessages } from '../lib/chatFixer';

interface UseDirectMessagesResult {
  messages: any[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (text: string) => Promise<any>;
  refreshMessages: () => Promise<void>;
}

/**
 * Hook untuk mengakses dan mengelola pesan dalam chat
 * 
 * @param chatId ID chat yang pesannya ingin diakses
 * @param isRoom True jika chat adalah grup, false jika direct chat
 * @returns Object dengan pesan dan fungsi untuk mengelolanya
 */
export function useDirectMessages(chatId: number, isRoom: boolean): UseDirectMessagesResult {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fungsi untuk me-refresh pesan
  const refreshMessages = useCallback(async () => {
    if (!chatId) {
      setError(new Error('Invalid chat ID'));
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Pastikan pesan default tersedia untuk chat ini
      ensureDefaultMessages(chatId, isRoom);
      
      // Ambil pesan dari database (dengan fallback ke localStorage)
      const fetchedMessages = await getMessagesFromDB(chatId, isRoom);
      
      if (Array.isArray(fetchedMessages)) {
        setMessages(fetchedMessages);
      } else {
        console.error('Fetched messages is not an array:', fetchedMessages);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error loading messages in useDirectMessages:', err);
      setError(err instanceof Error ? err : new Error('Unknown error loading messages'));
      
      // Coba ambil dari localStorage sebagai fallback
      const storageKey = isRoom ? `messages_room_${chatId}` : `messages_direct_${chatId}`;
      const localMessages = localStorage.getItem(storageKey);
      
      if (localMessages) {
        try {
          const parsedMessages = JSON.parse(localMessages);
          if (Array.isArray(parsedMessages)) {
            setMessages(parsedMessages);
          }
        } catch (e) {
          console.error('Error parsing local messages:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [chatId, isRoom]);
  
  // Fungsi untuk mengirim pesan
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) {
      return null;
    }
    
    if (!chatId) {
      throw new Error('Invalid chat ID');
    }
    
    try {
      // Kirim pesan ke server dan simpan ke localStorage
      const result = await addLocalMessage(chatId, isRoom, text.trim());
      
      if (result) {
        // Tambahkan pesan baru ke state
        setMessages(prevMessages => [...prevMessages, result]);
        return result;
      }
      
      throw new Error('Failed to send message');
    } catch (err) {
      console.error('Error sending message in useDirectMessages:', err);
      throw err;
    }
  }, [chatId, isRoom]);
  
  // Load messages saat component mount atau chat berubah
  useEffect(() => {
    refreshMessages();
  }, [chatId, isRoom, refreshMessages]);
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refreshMessages
  };
}
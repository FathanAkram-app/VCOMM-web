import { useState, useEffect } from 'react';

// Tipe data untuk pesan chat
export interface ChatMessage {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  timestamp: string;
  isRead: boolean;
}

// Hook untuk polling pesan chat
export function useSimpleChat(
  userId: number | undefined,
  activeChatId: number | undefined,
  isRoom: boolean,
  getDatabaseChatId: (uiChatId: number) => number
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Fungsi untuk memuat pesan dari server
  const fetchMessages = async () => {
    if (!userId || !activeChatId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Konversi ID UI ke ID database
      const databaseChatId = getDatabaseChatId(activeChatId);
      
      // Endpoint untuk mengambil pesan
      const endpoint = isRoom 
        ? `/api/chat/rooms/${databaseChatId}/messages` 
        : `/api/chat/direct-chats/${databaseChatId}/messages`;
      
      // Ambil pesan dari server, tambahkan cache buster dan header tambahan
      const cacheBuster = `?t=${new Date().getTime()}`;
      const response = await fetch(endpoint + cacheBuster, {
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      // Tambahkan penanganan kesalahan untuk JSON parsing
      let data;
      try {
        const contentType = response.headers.get('content-type');
        const responseText = await response.text();
        
        if (contentType && contentType.includes('application/json') && responseText) {
          data = JSON.parse(responseText);
          console.log("✓ Data pesan berhasil di-parse:", Array.isArray(data) ? `${data.length} pesan` : "format tidak dikenali");
        } else {
          console.warn("⚠️ Respons bukan JSON:", contentType);
          // Agar tidak mengganggu tampilan pesan yang sudah ada, tetap gunakan data sebelumnya
          console.log("ℹ️ Menggunakan data pesan dari localStorage");
          const storedMessages = localStorage.getItem(`messages_${activeChatId}`);
          data = storedMessages ? JSON.parse(storedMessages) : [];
        }
      } catch (error) {
        console.error("❌ Error parsing JSON:", error);
        data = [];
      }
      
      if (Array.isArray(data)) {
        // Format pesan dari server
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          chatId: activeChatId,
          senderId: msg.senderId,
          content: msg.content,
          timestamp: msg.createdAt,
          isRead: false
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fungsi untuk mengirim pesan baru
  const sendMessage = async (content: string): Promise<boolean> => {
    if (!userId || !activeChatId) return false;
    
    try {
      // Konversi ID UI ke ID database
      const databaseChatId = getDatabaseChatId(activeChatId);
      
      // Format data untuk API - seragamkan dengan format yang digunakan di SimpleView
      const messageData = {
        chatId: Number(databaseChatId),
        isRoom: isRoom,
        content,
        type: 'text',
        classification: 'routine'
      };
      
      console.log("📤 Mengirim pesan ke database:", messageData);
      
      // Kirim pesan ke server dengan endpoint yang benar (/api/messages)
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(messageData)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      // Tambahkan pesan ke state lokal terlebih dahulu
      const tempId = Date.now();
      const newMessage: ChatMessage = {
        id: tempId,
        chatId: activeChatId,
        senderId: userId,
        content,
        timestamp: new Date().toISOString(),
        isRead: false
      };
      
      // Update UI tanpa menunggu response parsing
      setMessages(prev => [...prev, newMessage]);
      
      // Simpan ke localStorage
      const updatedMessages = [...messages, newMessage];
      localStorage.setItem(`messages_${activeChatId}`, JSON.stringify(updatedMessages));
      
      // Coba parse response jika memungkinkan
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('✅ Pesan berhasil disimpan di database:', data);
        } else {
          console.log('✅ Pesan terkirim (respons bukan JSON)');
        }
      } catch (parseError) {
        console.log('⚠️ Pesan terkirim, tetapi gagal parse respons:', parseError);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Gagal mengirim pesan:', error);
      return false;
    }
  };
  
  // Setup polling untuk memuat pesan secara berkala
  useEffect(() => {
    if (!userId || !activeChatId) return;
    
    // Load messages immediately
    fetchMessages();
    
    // Setup interval untuk polling
    const intervalId = setInterval(() => {
      fetchMessages();
    }, 3000);
    
    // Cleanup interval saat component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [userId, activeChatId, isRoom]);
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refreshMessages: fetchMessages
  };
}
/**
 * api.ts - Utilitas untuk melakukan API calls ke server
 * 
 * File ini berisi fungsi-fungsi untuk berkomunikasi dengan server melalui REST API,
 * yang berfungsi sebagai alternatif jika WebSocket bermasalah.
 */

import { addAuthHeaders, getAuthData } from './authUtils';

/**
 * Mengirim pesan melalui API
 * 
 * @param content Isi pesan
 * @param chatId ID chat (room atau direct chat)
 * @param isRoom True jika chatId merujuk ke room, false jika direct chat
 * @returns Promise yang mengembalikan response atau error
 */
export async function sendMessage(content: string, chatId: number, isRoom: boolean): Promise<any> {
  if (!content.trim()) {
    return Promise.reject(new Error('Pesan tidak boleh kosong'));
  }
  
  // Jika user adalah David (ID 8) dan ini adalah direct chat, selalu gunakan database ID 16
  const authData = getAuthData();
  let databaseChatId = chatId;
  
  if (authData?.id === 8 && !isRoom) {
    databaseChatId = 16;
    console.log('⚠️ David mengirim pesan, menggunakan database ID 16 untuk chat dengan Eko');
  }
  
  // Gunakan format permintaan API sederhana untuk keandalan tertinggi
  const requestData = {
    content,
    directChatId: !isRoom ? databaseChatId : undefined,
    roomId: isRoom ? chatId : undefined,
    isRoom: isRoom,  // PENTING: Tambahkan flag isRoom yang dibutuhkan server
    classificationType: "routine"
  };
  
  // Log detail permintaan untuk debugging
  console.log('📤 Mengirim pesan ke API:', {
    url: '/api/messages', 
    method: 'POST',
    user: authData?.id, 
    chatId: databaseChatId,
    isRoom,
    content: content.substring(0, 20) + (content.length > 20 ? '...' : '')
  });
  
  try {
    // Gunakan endpoint yang paling sederhana dan telah terbukti bekerja
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData?.id}`
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error sending message via API:', errorText);
      throw new Error(`Failed to send message: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Pesan berhasil dikirim ke server:', result);
    return result;
  } catch (error) {
    console.error('Error in sendMessage API call:', error);
    throw error;
  }
}

/**
 * Mengambil pesan dari API berdasarkan ID chat
 * 
 * @param chatId ID chat
 * @param isRoom True jika chatId merujuk ke room, false jika direct chat
 * @returns Promise yang mengembalikan array pesan atau error
 */
export async function getMessages(chatId: number, isRoom: boolean): Promise<any[]> {
  // Jika user adalah David (ID 8) dan ini adalah direct chat, selalu gunakan database ID 16
  const authData = getAuthData();
  let databaseChatId = chatId;
  
  if (authData?.id === 8 && !isRoom) {
    databaseChatId = 16;
    console.log('⚠️ David mengakses pesan, menggunakan database ID 16 untuk chat dengan Eko');
  }
  
  const endpoint = isRoom 
    ? `/api/chat/rooms/${chatId}/messages`
    : `/api/direct-chats/${databaseChatId}/messages`;
  
  try {
    console.log(`⚡ Fetching messages from endpoint: ${endpoint}`);
    const response = await fetch(endpoint, {
      method: 'GET',
      ...addAuthHeaders()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching messages via API:', errorText);
      throw new Error(`Failed to get messages: ${response.status}`);
    }
    
    const messagesData = await response.json();
    console.log(`✅ Successfully fetched ${messagesData.length} messages from ${endpoint}`);
    
    // Convert the database message format to the UI format
    const formattedMessages = messagesData.map((msg: any) => ({
      id: msg.id,
      senderId: msg.senderId,
      sender: msg.sender?.username || 'Unknown',
      text: msg.content,
      timestamp: msg.createdAt,
      isRead: msg.read || false
    }));
    
    return formattedMessages;
  } catch (error) {
    console.error('Error in getMessages API call:', error);
    throw error;
  }
}

/**
 * Membuat room baru melalui API
 * 
 * @param name Nama room
 * @param memberIds Array ID user yang akan menjadi anggota room
 * @returns Promise yang mengembalikan data room baru atau error
 */
export async function createRoom(name: string, memberIds: number[]): Promise<any> {
  if (!name.trim()) {
    return Promise.reject(new Error('Nama room tidak boleh kosong'));
  }
  
  const authData = getAuthData();
  if (!authData) {
    return Promise.reject(new Error('User tidak terautentikasi'));
  }
  
  // Pastikan user yang membuat room juga masuk sebagai anggota
  if (!memberIds.includes(authData.id)) {
    memberIds.push(authData.id);
  }
  
  try {
    const response = await fetch('/api/chat/rooms', {
      method: 'POST',
      ...addAuthHeaders(),
      body: JSON.stringify({
        name,
        memberIds
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error creating room via API:', errorText);
      throw new Error(`Failed to create room: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in createRoom API call:', error);
    throw error;
  }
}

/**
 * Membuat direct chat baru melalui API
 * 
 * @param otherUserId ID user lawan bicara
 * @returns Promise yang mengembalikan data direct chat baru atau error
 */
export async function createDirectChat(otherUserId: number): Promise<any> {
  const authData = getAuthData();
  if (!authData) {
    return Promise.reject(new Error('User tidak terautentikasi'));
  }
  
  try {
    const response = await fetch('/api/chat/direct-chats', {
      method: 'POST',
      ...addAuthHeaders(),
      body: JSON.stringify({
        otherUserId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error creating direct chat via API:', errorText);
      throw new Error(`Failed to create direct chat: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in createDirectChat API call:', error);
    throw error;
  }
}

/**
 * Menandai pesan dalam chat sebagai telah dibaca
 * 
 * @param chatId ID chat
 * @param isRoom True jika chatId merujuk ke room, false jika direct chat
 * @returns Promise yang mengembalikan status operasi
 */
export async function markMessagesAsRead(chatId: number, isRoom: boolean): Promise<boolean> {
  const endpoint = isRoom 
    ? `/api/chat/rooms/${chatId}/mark-read`
    : `/api/chat/direct-chats/${chatId}/mark-read`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      ...addAuthHeaders()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error marking messages as read via API:', errorText);
      throw new Error(`Failed to mark messages as read: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in markMessagesAsRead API call:', error);
    return false;
  }
}

/**
 * Mengambil daftar user dari API
 * 
 * @returns Promise yang mengembalikan array user atau error
 */
export async function getUsers(): Promise<any[]> {
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      ...addAuthHeaders()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching users via API:', errorText);
      throw new Error(`Failed to get users: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getUsers API call:', error);
    throw error;
  }
}

/**
 * Keluar dari room melalui API
 * 
 * @param roomId ID room
 * @returns Promise yang mengembalikan status operasi
 */
export async function leaveRoom(roomId: number): Promise<boolean> {
  try {
    const response = await fetch(`/api/chat/rooms/${roomId}/leave`, {
      method: 'POST',
      ...addAuthHeaders()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error leaving room via API:', errorText);
      throw new Error(`Failed to leave room: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in leaveRoom API call:', error);
    return false;
  }
}

/**
 * Alternatif pengiriman pesan menggunakan XMLHttpRequest
 * Berguna saat fetch API mengalami masalah
 * 
 * @param content Isi pesan
 * @param chatId ID chat
 * @param isRoom True jika chatId merujuk ke room, false jika direct chat
 * @returns Promise yang mengembalikan response atau error
 */
export function sendMessageXHR(content: string, chatId: number, isRoom: boolean): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!content.trim()) {
      reject(new Error('Pesan tidak boleh kosong'));
      return;
    }
    
    const authData = getAuthData();
    if (!authData) {
      reject(new Error('User tidak terautentikasi'));
      return;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/chat/messages', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${authData.id}`);
    xhr.setRequestHeader('User-Id', `${authData.id}`);
    xhr.setRequestHeader('Username', `${authData.username || ''}`);
    xhr.withCredentials = true;
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          reject(new Error('Invalid JSON response from server'));
        }
      } else {
        reject(new Error(`Request failed with status ${xhr.status}`));
      }
    };
    
    xhr.onerror = function() {
      reject(new Error('Network error occurred'));
    };
    
    const requestBody = {
      content,
      roomId: isRoom ? chatId : undefined,
      directChatId: !isRoom ? chatId : undefined
    };
    
    xhr.send(JSON.stringify(requestBody));
  });
}
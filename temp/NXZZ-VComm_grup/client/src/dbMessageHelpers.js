/**
 * File: dbMessageHelpers.js
 * 
 * Fungsi pembantu untuk menyimpan pesan ke database tanpa bergantung pada hook React
 */

// Fungsi untuk mengirim pesan ke database
export function saveMessageToDatabase(userId, chatId, messageText) {
  console.log(`Mengirim pesan dari pengguna ${userId} ke chat ${chatId}: ${messageText}`);
  
  // Tentukan ID chat di database berdasarkan ID UI
  let databaseChatId = chatId;
  
  // Pemetaan hardcoded untuk chat yang sudah diketahui
  if (chatId === 1747549792121) {
    databaseChatId = 16; // Chat Eko-David
    console.log(`Menggunakan ID database 16 untuk chat Eko-David`);
  } else if (chatId === 1747541508854) {
    databaseChatId = 17; // Chat Eko-Aji
    console.log(`Menggunakan ID database 17 untuk chat Eko-Aji`);
  }
  
  // Persiapkan data untuk API
  const messageData = {
    directChatId: databaseChatId,
    isRoom: false,
    content: messageText,
    classificationType: "routine"
  };
  
  console.log(`Data pesan yang akan dikirim:`, messageData);
  
  // Kirim ke database menggunakan XMLHttpRequest
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/messages', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${userId}`);
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      console.log('✅ Pesan berhasil disimpan ke database!', xhr.responseText);
      try {
        const response = JSON.parse(xhr.responseText);
        console.log(`✅ ID pesan di database: ${response.id}`);
      } catch (e) {
        console.error('Error parsing response:', e);
      }
    } else {
      console.error('❌ Gagal menyimpan pesan ke database. Status:', xhr.status);
    }
  };
  
  xhr.onerror = function() {
    console.error('❌ Network error saat mengirim pesan ke database');
  };
  
  // Kirim request
  xhr.send(JSON.stringify(messageData));
  
  // Return ID pesan untuk UI
  return Date.now();
}

// Fungsi untuk load pesan dari database
export function loadMessagesFromDatabase(userId, chatId, callback) {
  // Tentukan ID chat di database
  let databaseChatId = chatId;
  
  // Pemetaan untuk chat yang sudah diketahui
  if (chatId === 1747549792121) {
    databaseChatId = 16; // Chat Eko-David
  } else if (chatId === 1747541508854) {
    databaseChatId = 17; // Chat Eko-Aji
  }
  
  // Fetch dari API
  const xhr = new XMLHttpRequest();
  xhr.open('GET', `/api/direct-chats/${databaseChatId}/messages`, true);
  xhr.setRequestHeader('Authorization', `Bearer ${userId}`);
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const messages = JSON.parse(xhr.responseText);
        callback(messages);
      } catch (e) {
        console.error('Error parsing messages:', e);
        callback([]);
      }
    } else {
      console.error('Failed to load messages. Status:', xhr.status);
      callback([]);
    }
  };
  
  xhr.onerror = function() {
    console.error('Network error loading messages');
    callback([]);
  };
  
  xhr.send();
}
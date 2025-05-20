// Script ini akan dijalankan dari halaman HTML untuk mengirim pesan
function sendMessageToDatabase(userId, chatId, content) {
  // Tentukan ID chat di database berdasarkan user ID
  let databaseChatId = chatId; // Default ke ID dari UI
  
  // Pemetaan khusus untuk chat yang sudah kita ketahui ID database-nya
  // Chat antara Eko-David
  if ((userId === 7 && chatId === 1747549792121) || 
      (userId === 8 && chatId === 1747549792121)) {
    databaseChatId = 16; // ID di database untuk chat Eko-David
    console.log("Menggunakan chat ID 16 untuk percakapan Eko-David");
  } 
  // Chat antara Eko-Aji
  else if ((userId === 7 && chatId === 1747541508854) || 
          (userId === 9 && chatId === 1747541508854)) {
    databaseChatId = 17; // ID di database untuk chat Eko-Aji
    console.log("Menggunakan chat ID 17 untuk percakapan Eko-Aji");
  }
  
  console.log("[DATABASE] Mengirim pesan ke chat database ID=" + databaseChatId + " (dari UI ID=" + chatId + ")");
  
  // Lakukan request ke server dengan vanilla JavaScript
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/messages', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', 'Bearer ' + userId);
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      console.log('Pesan berhasil dikirim ke server:', xhr.responseText);
    } else {
      console.error('XHR gagal dengan status:', xhr.status);
    }
  };
  xhr.onerror = function() {
    console.error('Terjadi error saat XHR request');
  };
  xhr.send(JSON.stringify({
    directChatId: databaseChatId,
    isRoom: false,
    content: content,
    classificationType: "routine"
  }));
}
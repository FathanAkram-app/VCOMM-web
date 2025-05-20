const http = require('http');

const TARGET_MESSAGES = [
  {
    userId: 7, // Eko
    chatId: 16, // Eko-David chat
    message: "Ini adalah pesan penting dari Eko untuk David"
  },
  {
    userId: 8, // David
    chatId: 16, // Eko-David chat
    message: "David menerima pesan dan membalas ke Eko"
  },
  {
    userId: 7, // Eko
    chatId: 17, // Eko-Aji chat
    message: "Pesan dari Eko ke Aji"
  },
  {
    userId: 9, // Aji
    chatId: 17, // Eko-Aji chat
    message: "Pesan balasan dari Aji ke Eko"
  }
];

function sendMessage(message, callback) {
  const data = JSON.stringify({
    directChatId: message.chatId,
    isRoom: false,
    content: message.message,
    classificationType: "routine"
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': `Bearer ${message.userId}`
    }
  };

  const req = http.request(options, (res) => {
    console.log(`[${message.userId} -> ${message.chatId}] Status: ${res.statusCode}`);
    
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log(`Response: ${responseData}`);
      callback(null, responseData);
    });
  });

  req.on('error', (error) => {
    console.error(`Error: ${error}`);
    callback(error);
  });

  req.write(data);
  req.end();
}

// Kirim pesan satu per satu secara berurutan
function sendMessagesSequentially(index = 0) {
  if (index >= TARGET_MESSAGES.length) {
    console.log('Semua pesan berhasil dikirim!');
    return;
  }

  const message = TARGET_MESSAGES[index];
  console.log(`Mengirim pesan dari ${message.userId} ke chat ${message.chatId}: "${message.message}"`);
  
  sendMessage(message, (error) => {
    if (error) {
      console.error(`Gagal mengirim pesan ${index + 1}/${TARGET_MESSAGES.length}`);
    } else {
      console.log(`Pesan ${index + 1}/${TARGET_MESSAGES.length} berhasil dikirim`);
    }
    
    // Lanjut ke pesan berikutnya setelah jeda 1 detik
    setTimeout(() => {
      sendMessagesSequentially(index + 1);
    }, 1000);
  });
}

// Mulai pengiriman pesan
sendMessagesSequentially();

import React from 'react';

interface Message {
  id: number;
  senderId: number;
  content: string;
  timestamp: string;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: number;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center text-sm text-[#8d9c6b] my-4">
        Belum ada pesan. Silakan kirim pesan baru untuk memulai percakapan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        // Format waktu dengan validasi dan fallback yang lebih ketat
        let timeString = "00:00";
        try {
          // Pastikan timestamp ada dan merupakan string valid
          const timestamp = message.timestamp || new Date().toISOString();
          
          // Konversi ke Date object dengan validasi
          const date = new Date(timestamp);
          
          // Periksa apakah tanggal valid (bukan NaN)
          if (!isNaN(date.getTime())) {
            const hour = date.getHours().toString().padStart(2, '0');
            const minute = date.getMinutes().toString().padStart(2, '0');
            timeString = `${hour}:${minute}`;
          } else {
            // Gunakan waktu saat ini jika tidak valid
            const now = new Date();
            timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          }
        } catch (error) {
          console.error("Error memformat waktu:", error);
          // Gunakan waktu saat ini sebagai fallback
          const now = new Date();
          timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        }
        
        // Tentukan apakah pesan dari pengguna saat ini
        const isFromMe = message.senderId === currentUserId;
        
        return (
          <div key={message.id} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-3`}>
            <div className={`max-w-[75%] rounded-lg px-4 py-2 ${isFromMe ? 'bg-[#1e4620]' : 'bg-[#1e1e1e]'}`}>
              <div className="text-sm text-[#e4e6e3]">{message.content}</div>
              <div className="text-right text-xs text-[#7d8172] mt-1">{timeString}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
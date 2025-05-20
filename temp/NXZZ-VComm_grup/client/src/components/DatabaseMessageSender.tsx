import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface DatabaseMessageSenderProps {
  userId: number;
  currentChatId: number;
}

export default function DatabaseMessageSender({ userId, currentChatId }: DatabaseMessageSenderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatId, setChatId] = useState(String(currentChatId || '16'));
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({
    type: null,
    message: ''
  });

  // Fungsi untuk mengirim pesan ke database
  const sendMessageToDatabase = () => {
    if (!message.trim()) {
      setStatus({
        type: 'error',
        message: 'Pesan tidak boleh kosong!'
      });
      return;
    }

    // Convert chat ID ke format yang diharapkan
    let databaseChatId = parseInt(chatId);
    
    // Memastikan chat ID sesuai dengan data yang ada di database
    // Pemetaan chat ID dari UI ke database
    if ((userId === 7 && databaseChatId === 1747549792121) || 
        (userId === 8 && databaseChatId === 1747549792121)) {
      databaseChatId = 16; // Eko-David chat
    } else if ((userId === 7 && databaseChatId === 1747541508854) || 
               (userId === 9 && databaseChatId === 1747541508854)) {
      databaseChatId = 17; // Eko-Aji chat
    }

    setStatus({
      type: 'info',
      message: 'Mengirim pesan...'
    });

    // Gunakan XMLHttpRequest untuk mengirim pesan
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/messages', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${userId}`);
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        setStatus({
          type: 'success',
          message: 'Pesan berhasil disimpan ke database!'
        });
        console.log('Pesan berhasil dikirim:', xhr.responseText);
        setMessage('');
      } else {
        setStatus({
          type: 'error',
          message: `Error: ${xhr.status} - ${xhr.statusText}`
        });
        console.error('Gagal mengirim pesan:', xhr.status, xhr.statusText);
      }
    };
    
    xhr.onerror = function() {
      setStatus({
        type: 'error',
        message: 'Terjadi kesalahan jaringan'
      });
      console.error('Network error');
    };
    
    xhr.send(JSON.stringify({
      directChatId: databaseChatId,
      isRoom: false,
      content: message,
      classificationType: "routine"
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="fixed right-4 bottom-20 z-50 bg-green-800 text-white hover:bg-green-700"
        >
          DB Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle>Kirim Pesan ke Database</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="chat-id">Chat ID:</Label>
            <Select
              value={chatId}
              onValueChange={setChatId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih chat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16">Eko-David Chat (ID: 16)</SelectItem>
                <SelectItem value="17">Eko-Aji Chat (ID: 17)</SelectItem>
                {currentChatId && (
                  <SelectItem value={String(currentChatId)}>Chat Saat Ini (ID: {currentChatId})</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="message">Pesan:</Label>
            <Input
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ketik pesan yang akan disimpan ke database..."
              className="dark:bg-gray-700"
            />
          </div>
          
          {status.type && (
            <div className={`p-2 rounded ${
              status.type === 'success' ? 'bg-green-900' :
              status.type === 'error' ? 'bg-red-900' :
              'bg-blue-900'
            }`}>
              {status.message}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            Batal
          </Button>
          <Button 
            variant="default" 
            onClick={sendMessageToDatabase}
            className="bg-green-800 hover:bg-green-700"
          >
            Kirim ke Database
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { useAuth } from '../hooks/use-auth';

export default function MessageSender() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [selectedChatId, setSelectedChatId] = useState('16'); // Default ke Eko-David chat
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({
    type: null,
    message: ''
  });

  // Daftar chat yang tersedia di database
  const availableChats = [
    { id: '16', name: 'Eko-David Chat' },
    { id: '17', name: 'Eko-Aji Chat' }
  ];

  const handleSendMessage = () => {
    if (!message.trim() || !user?.id) {
      setStatus({
        type: 'error',
        message: 'Pesan tidak boleh kosong dan user harus login'
      });
      return;
    }

    // Gunakan XHR untuk mengirim data
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/messages', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${user.id}`);
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        setStatus({
          type: 'success',
          message: 'Pesan berhasil dikirim ke database!'
        });
        console.log('Respons server:', xhr.responseText);
        
        // Clear input setelah berhasil
        setMessage('');
      } else {
        setStatus({
          type: 'error',
          message: `Gagal mengirim pesan. Status: ${xhr.status}`
        });
        console.error('Gagal mengirim pesan. Status:', xhr.status);
      }
    };
    
    xhr.onerror = function() {
      setStatus({
        type: 'error',
        message: 'Terjadi kesalahan saat mengirim pesan'
      });
      console.error('XHR error');
    };
    
    xhr.send(JSON.stringify({
      directChatId: parseInt(selectedChatId),
      isRoom: false,
      content: message.trim(),
      classificationType: "routine"
    }));
    
    setStatus({
      type: 'info',
      message: 'Mengirim pesan...'
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Kirim Pesan ke Database</CardTitle>
          <CardDescription>Tool untuk mengirim pesan langsung ke PostgreSQL Database</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chat">Pilih Chat:</Label>
            <Select
              value={selectedChatId}
              onValueChange={setSelectedChatId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih chat" />
              </SelectTrigger>
              <SelectContent>
                {availableChats.map(chat => (
                  <SelectItem key={chat.id} value={chat.id}>{chat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Pesan:</Label>
            <Input
              id="message"
              placeholder="Ketik pesan Anda di sini..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          
          {status.type && (
            <div className={`p-2 rounded ${
              status.type === 'success' ? 'bg-green-800 text-white' :
              status.type === 'error' ? 'bg-red-800 text-white' :
              'bg-blue-800 text-white'
            }`}>
              {status.message}
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <Button 
            className="w-full"
            onClick={handleSendMessage}
          >
            Kirim Pesan ke Database
          </Button>
        </CardFooter>
      </Card>
      
      <div className="mt-4 text-gray-400 text-sm">
        <p>User ID: {user?.id || 'Belum login'}</p>
        <p>Username: {user?.username || 'Belum login'}</p>
        <p>Chat ID: {selectedChatId}</p>
      </div>
    </div>
  );
}
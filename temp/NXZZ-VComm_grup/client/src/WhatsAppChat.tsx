import React, { useState, useEffect } from 'react';
import { useLocation, useRoute, Link, navigate } from 'wouter';
import { useAuth } from './hooks/use-auth';
import { X, PlusCircle, ArrowLeft, SendHorizontal, Paperclip, Mic } from 'lucide-react';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import Header from './components/Header';
import MainMenu from './components/MainMenu';

// Kunci localStorage untuk menyimpan pesan dan chat
const MESSAGES_KEY = 'whatsapp_messages';
const CHATS_KEY = 'whatsapp_chats';

// Tipe data untuk chat
interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

// Tipe data untuk pesan
interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

// Fungsi untuk memuat chat dari localStorage
const loadChats = (): Chat[] => {
  const savedChats = localStorage.getItem(CHATS_KEY);
  if (savedChats) {
    return JSON.parse(savedChats);
  }
  return [];
};

// Fungsi untuk menyimpan chat ke localStorage
const saveChats = (chats: Chat[]) => {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
};

// Fungsi untuk memuat pesan dari localStorage
const loadMessages = (): Message[] => {
  const savedMessages = localStorage.getItem(MESSAGES_KEY);
  if (savedMessages) {
    return JSON.parse(savedMessages);
  }
  return [];
};

// Fungsi untuk menyimpan pesan ke localStorage
const saveMessages = (messages: Message[]) => {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
};

// Komponen untuk daftar chat (seperti layar utama WhatsApp)
const ChatList = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  
  // Muat daftar chat saat komponen dipasang
  useEffect(() => {
    if (user) {
      const loadedChats = loadChats();
      // Urutkan chat berdasarkan timestamp terbaru
      loadedChats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setChats(loadedChats);
    }
  }, [user]);
  
  // Jika belum ada chat, buat chat default
  useEffect(() => {
    if (user && chats.length === 0) {
      // Buat chat dengan Eko sebagai default
      const defaultChat: Chat = {
        id: '1',
        name: 'Eko',
        lastMessage: 'Secure communication established',
        timestamp: new Date().toISOString(),
        unread: 1
      };
      
      setChats([defaultChat]);
      saveChats([defaultChat]);
      
      // Tambahkan pesan awal
      const initialMessage: Message = {
        id: '1',
        chatId: '1',
        senderId: 'system',
        text: 'Secure communication established',
        timestamp: new Date().toISOString(),
        read: false
      };
      
      const messages = loadMessages();
      messages.push(initialMessage);
      saveMessages(messages);
    }
  }, [user, chats.length]);
  
  return (
    <div className="flex flex-col h-full bg-[#1f201c]">
      {/* Header */}
      <div className="bg-[#2a2b25] px-4 py-3 flex justify-between items-center">
        <h1 className="text-[#e0e0e0] font-bold">COMMS</h1>
        <Button size="sm" variant="ghost" className="text-[#e0e0e0]">
          <PlusCircle size={20} />
        </Button>
      </div>
      
      {/* Daftar Chat */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-[#969692]">
            <p>Tidak ada chat aktif</p>
            <p className="text-sm mt-2">Mulai chat baru dengan tombol + di atas</p>
          </div>
        ) : (
          <div className="divide-y divide-[#3d3f35]/40">
            {chats.map(chat => (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <a className="flex items-center p-3 hover:bg-[#2c2d27] cursor-pointer">
                  {/* Avatar */}
                  <div className="mr-3 relative">
                    <Avatar className="h-12 w-12 bg-[#3d5a65]">
                      <AvatarFallback className="text-white">
                        {chat.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Badge untuk pesan belum dibaca */}
                    {chat.unread > 0 && (
                      <div className="absolute -top-1 -right-1 bg-[#566c57] rounded-full h-5 w-5 flex items-center justify-center text-xs text-white">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                  
                  {/* Informasi Chat */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-[#e0e0e0] truncate">{chat.name}</h3>
                      <span className="text-xs text-[#969692]">
                        {new Date(chat.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <p className="text-sm text-[#969692] truncate mt-1">{chat.lastMessage}</p>
                  </div>
                </a>
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* Main Menu */}
      <MainMenu />
    </div>
  );
};

// Komponen untuk ruang chat (seperti layar chat WhatsApp)
const ChatRoom = () => {
  const { user } = useAuth();
  const [, params] = useRoute('/chat/:id');
  const chatId = params?.id || '';
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  
  // Muat pesan dan informasi chat saat komponen dipasang atau chatId berubah
  useEffect(() => {
    if (user && chatId) {
      // Muat semua pesan
      const allMessages = loadMessages();
      // Filter pesan untuk chat ini
      const chatMessages = allMessages.filter(msg => msg.chatId === chatId);
      setMessages(chatMessages);
      
      // Muat informasi chat
      const loadedChats = loadChats();
      setChats(loadedChats);
      const chat = loadedChats.find(c => c.id === chatId);
      setCurrentChat(chat || null);
      
      // Tandai pesan sebagai sudah dibaca
      if (chat && chat.unread > 0) {
        const updatedChats = loadedChats.map(c => 
          c.id === chatId ? { ...c, unread: 0 } : c
        );
        setChats(updatedChats);
        saveChats(updatedChats);
      }
    }
  }, [user, chatId]);
  
  // Fungsi untuk mengirim pesan
  const sendMessage = () => {
    if (!user || !newMessage.trim() || !currentChat) return;
    
    // Buat pesan baru
    const message: Message = {
      id: Date.now().toString(),
      chatId,
      senderId: user.id.toString(),
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // Tambahkan ke daftar pesan
    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    
    // Simpan ke localStorage
    const allMessages = loadMessages();
    allMessages.push(message);
    saveMessages(allMessages);
    
    // Perbarui informasi chat
    const updatedChats = chats.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            lastMessage: newMessage.trim(),
            timestamp: new Date().toISOString()
          } 
        : chat
    );
    setChats(updatedChats);
    saveChats(updatedChats);
    
    // Reset input
    setNewMessage('');
  };
  
  return (
    <div className="flex flex-col h-full bg-[#1f201c]">
      {/* Header */}
      <div className="bg-[#2a2b25] px-4 py-3 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-2 text-[#e0e0e0]"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={20} />
        </Button>
        
        <Avatar className="h-8 w-8 mr-3 bg-[#3d5a65]">
          <AvatarFallback className="text-white">
            {currentChat?.name.substring(0, 2).toUpperCase() || 'CH'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h2 className="text-[#e0e0e0] font-medium">{currentChat?.name || 'Chat'}</h2>
        </div>
      </div>
      
      {/* Area Pesan */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 text-[#969692]">
            <p>Tidak ada pesan</p>
            <p className="text-sm mt-2">Kirim pesan untuk memulai percakapan</p>
          </div>
        ) : (
          messages.map(message => {
            const isMine = message.senderId === user?.id.toString();
            const isSystem = message.senderId === 'system';
            
            if (isSystem) {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="bg-[#2c2d27] text-[#969692] rounded-lg px-3 py-1 text-xs">
                    {message.text}
                  </div>
                </div>
              );
            }
            
            return (
              <div 
                key={message.id} 
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] rounded-lg px-3 py-2 
                    ${isMine 
                      ? 'bg-[#354c36] text-white rounded-tr-none' 
                      : 'bg-[#2c2d27] text-[#e0e0e0] rounded-tl-none'}
                  `}
                >
                  <div className="text-sm break-words">{message.text}</div>
                  <div className="flex justify-end items-center mt-1">
                    <span className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    {isMine && (
                      <span className="text-xs ml-1">
                        {message.read ? <span className="text-blue-400">✓✓</span> : <span className="opacity-70">✓</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Input Pesan */}
      <div className="p-3 bg-[#2a2b25] flex items-end">
        <Button variant="ghost" size="icon" className="text-[#969692]">
          <Paperclip size={20} />
        </Button>
        
        <Textarea 
          className="mx-2 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0] min-h-[40px] max-h-[120px]"
          placeholder="Ketik pesan..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-[#969692]"
          onClick={sendMessage}
          disabled={!newMessage.trim()}
        >
          {newMessage.trim() ? <SendHorizontal size={20} /> : <Mic size={20} />}
        </Button>
      </div>
    </div>
  );
};

// Komponen utama yang menggabungkan keduanya
const WhatsAppChat = () => {
  const [match] = useRoute('/chat/:id');
  
  // Jika di halaman chat tertentu, tampilkan ChatRoom, jika tidak, tampilkan ChatList
  return match ? <ChatRoom /> : <ChatList />;
};

export default WhatsAppChat;
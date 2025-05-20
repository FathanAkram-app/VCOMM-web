import React, { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { ArrowLeft, Send, Paperclip, Mic, Phone, Video, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../hooks/use-auth';
import MainMenu from '../components/MainMenu';

// Impor fungsi-fungsi chat
import { 
  getMessagesForChat, 
  addMessage, 
  markMessagesAsRead,
  getUserChats,
  initializeChats
} from '../lib/sharedChat';

const ChatView: React.FC = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [matchChat, params] = useRoute('/chat/:chatId');
  const chatId = params ? parseInt(params.chatId) : null;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatName, setChatName] = useState('Chat');
  const [isRoom, setIsRoom] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Inisialisasi data chat jika belum ada
  useEffect(() => {
    initializeChats();
  }, []);
  
  // Muat data chat dan pesan
  useEffect(() => {
    if (!chatId || !user) return;
    
    // Muat info chat
    loadChatInfo();
    
    // Muat pesan chat
    loadMessages();
    
    // Tandai pesan sebagai telah dibaca
    markMessagesAsRead(chatId, user.id);
    
    // Set interval untuk memeriksa pesan baru
    const interval = setInterval(refreshMessages, 2000);
    
    return () => clearInterval(interval);
  }, [chatId, user]);
  
  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Muat informasi chat
  const loadChatInfo = () => {
    if (!chatId || !user) return;
    
    // Ambil daftar chat pengguna
    const userChats = getUserChats(user.id);
    
    // Cari chat yang sesuai
    const chat = userChats.find((c: any) => c.id === chatId);
    
    if (chat) {
      setChatName(chat.name);
      setIsRoom(chat.isRoom);
    } else {
      setChatName(`Chat ${chatId}`);
      setIsRoom(false);
    }
  };
  
  // Muat pesan chat
  const loadMessages = () => {
    if (!chatId) return;
    
    // Ambil pesan-pesan untuk chat ini
    const chatMessages = getMessagesForChat(chatId);
    setMessages(chatMessages);
  };
  
  // Refresh pesan
  const refreshMessages = () => {
    if (!chatId || !user) return;
    
    // Periksa pesan baru
    const latestMessages = getMessagesForChat(chatId);
    
    // Jika ada pesan baru, update
    if (latestMessages.length > messages.length) {
      setMessages(latestMessages);
      
      // Tandai sebagai telah dibaca
      markMessagesAsRead(chatId, user.id);
    }
  };
  
  // Kirim pesan baru
  const sendMessage = () => {
    if (!chatId || !user || !newMessage.trim()) return;
    
    // Tambahkan pesan
    addMessage(chatId, user.id, user.username || 'Me', newMessage.trim());
    
    // Refresh tampilan
    loadMessages();
    
    // Reset input
    setNewMessage('');
    
    // Tandai pesan sebagai telah dibaca
    markMessagesAsRead(chatId, user.id);
  };
  
  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };
  
  // Kembali ke daftar chat
  const goBack = () => {
    setLocation('/comms');
  };
  
  // Jika tidak ada chatId atau user, tampilkan pesan error
  if (!chatId || !user) {
    return (
      <div className="flex flex-col h-screen bg-[#1f201c] text-white justify-center items-center">
        <p className="text-lg mb-4">Chat tidak ditemukan</p>
        <Button onClick={() => setLocation('/comms')}>
          Kembali ke Daftar Chat
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-[#1f201c]">
      {/* Header */}
      <div className="bg-[#2a2b25] px-4 py-3 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 text-[#bdc1c0] hover:text-white hover:bg-[#3d3f35]"
          onClick={goBack}
        >
          <ArrowLeft size={20} />
        </Button>
        
        <Avatar className="h-10 w-10 mr-3 bg-[#3d5a65]">
          <AvatarFallback className="text-white">
            {chatName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h2 className="text-[#e0e0e0] font-medium">{chatName}</h2>
          <p className="text-xs text-[#bdc1c0]">
            {isTyping ? 'Typing...' : isRoom ? 'Group Chat' : 'Online'}
          </p>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" className="text-[#bdc1c0] hover:text-white hover:bg-[#3d3f35]">
            <Phone size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-[#bdc1c0] hover:text-white hover:bg-[#3d3f35]">
            <Video size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-[#bdc1c0] hover:text-white hover:bg-[#3d3f35]">
            <MoreVertical size={20} />
          </Button>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-[#242520] to-[#1f201c]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#969692]">Tidak ada pesan</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isSystem = msg.senderId === 0;
            const isMe = msg.senderId === user.id;
            
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-[#2c2d27] text-[#969692] rounded-lg px-3 py-1 text-xs">
                    {msg.content}
                  </div>
                </div>
              );
            }
            
            return (
              <div 
                key={msg.id} 
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] rounded-lg px-3 py-2 
                    ${isMe 
                      ? 'bg-[#354c36] text-white rounded-tr-none' 
                      : 'bg-[#2c2d27] text-[#e0e0e0] rounded-tl-none'}
                  `}
                >
                  {/* Nama pengirim untuk pesan dari orang lain di room */}
                  {!isMe && isRoom && (
                    <div className="text-xs font-medium text-[#8b9c8c] mb-1">
                      {msg.senderName}
                    </div>
                  )}
                  
                  <div className="text-sm break-words">{msg.content}</div>
                  <div className="flex justify-end items-center mt-1">
                    <span className="text-xs opacity-70">
                      {formatTime(msg.timestamp)}
                    </span>
                    {isMe && (
                      <span className="text-xs ml-1">
                        {msg.isRead 
                          ? <span className="text-blue-400">✓✓</span> 
                          : <span className="opacity-70">✓</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="p-3 bg-[#2a2b25] flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="text-[#969692]">
          <Paperclip size={20} />
        </Button>
        
        <Input
          type="text"
          placeholder="Ketik pesan..."
          className="flex-1 bg-[#1f201c] border-[#3d3f35] focus:border-[#566c57] focus:ring-[#566c57] text-[#e0e0e0]"
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
          {newMessage.trim() ? <Send size={20} /> : <Mic size={20} />}
        </Button>
      </div>
      
      {/* Main Menu */}
      <MainMenu activeTab="comms" />
    </div>
  );
};

export default ChatView;
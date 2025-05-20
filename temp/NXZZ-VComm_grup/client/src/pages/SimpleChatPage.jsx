import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Send, Paperclip, Phone, Video, MoreVertical, User, Users, Search } from 'lucide-react';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/dialog';
import { useAuth } from '../hooks/use-auth';
import MainMenu from '../components/MainMenu';

// Import chat storage functions
import { 
  getUserChats,
  getChatMessages, 
  createMessage, 
  markChatAsRead,
  createDirectChat,
  initializeData
} from '../utils/chatStorage';

export default function SimpleChatPage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Parse chat ID from URL
  useEffect(() => {
    // Initialize data
    initializeData();
    
    // Get chat ID from URL if available
    const match = location.match(/\/chat\/(\d+)/);
    if (match && match[1]) {
      const chatId = parseInt(match[1]);
      handleOpenChat(chatId);
    } else {
      setView('list');
      loadChats();
    }
  }, [location]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Refresh chats and messages periodically
  useEffect(() => {
    if (!user) return;

    // Initial load
    loadChats();
    loadAllUsers();
    
    // Set up refresh intervals
    const chatsInterval = setInterval(loadChats, 3000);
    const messagesInterval = setInterval(() => {
      if (activeChat) {
        loadMessages(activeChat.id);
      }
    }, 2000);

    return () => {
      clearInterval(chatsInterval);
      clearInterval(messagesInterval);
    };
  }, [user, activeChat]);

  const loadChats = () => {
    if (!user) return;
    
    const userChats = getUserChats(user.id);
    setChats(userChats);
  };

  const loadMessages = (chatId) => {
    if (!chatId) return;
    
    const chatMessages = getChatMessages(chatId);
    setMessages(chatMessages);
    
    // Mark messages as read
    markChatAsRead(chatId, user.id);
  };

  const loadAllUsers = () => {
    try {
      const usersStr = localStorage.getItem('all_users');
      if (usersStr) {
        const users = JSON.parse(usersStr);
        // Filter out current user
        const filteredUsers = users.filter(u => u.id !== user?.id);
        setAllUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleOpenChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setActiveChat(chat);
      loadMessages(chatId);
      setView('chat');
      
      // Update URL without refreshing
      window.history.pushState(null, '', `/chat/${chatId}`);
    }
  };

  const handleBackToList = () => {
    setActiveChat(null);
    setView('list');
    setLocation('/comms');
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeChat || !user) return;
    
    // Create new message
    createMessage(activeChat.id, user.id, newMessage.trim());
    
    // Reload messages
    loadMessages(activeChat.id);
    
    // Clear input
    setNewMessage('');
  };

  const handleCreateDirectChat = () => {
    if (!user || selectedUserId === null) return;
    
    // Create chat
    const chat = createDirectChat(user.id, selectedUserId);
    
    // Close dialog
    setShowNewChatDialog(false);
    setSelectedUserId(null);
    
    // Refresh and open new chat
    loadChats();
    
    // Small delay to ensure chat is loaded
    setTimeout(() => {
      handleOpenChat(chat.id);
    }, 300);
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };

  // Format date for chat list
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      
      // If today, show time
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // If yesterday, show "Kemarin"
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Kemarin';
      }
      
      // Otherwise show date
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    } catch (error) {
      return '';
    }
  };

  // Filter chats by search query
  const filteredChats = searchQuery 
    ? chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats;

  // Render Chat List View
  if (view === 'list') {
    return (
      <div className="flex flex-col h-screen bg-[#1f201c]">
        {/* Header */}
        <div className="bg-[#2a2b25] px-4 py-3 flex justify-between items-center">
          <h1 className="text-[#e0e0e0] font-bold">COMMS</h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white"
            onClick={() => setShowNewChatDialog(true)}
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="p-2 bg-[#2a2b25]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#969692]" />
            <Input
              placeholder="Cari pesan atau kontak..."
              className="pl-9 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <p className="text-[#969692] mb-2">Tidak ada obrolan</p>
              <p className="text-[#969692]/70 text-sm">Mulai obrolan baru dengan tombol + di atas</p>
            </div>
          ) : (
            <div className="divide-y divide-[#3d3f35]/40">
              {filteredChats.map(chat => (
                <div
                  key={chat.id}
                  className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]"
                  onClick={() => handleOpenChat(chat.id)}
                >
                  {/* Avatar */}
                  <div className="relative mr-3">
                    <Avatar className={`h-12 w-12 ${chat.isGroup ? 'bg-[#566c57]' : 'bg-[#3d5a65]'}`}>
                      <AvatarFallback className="text-white font-medium">
                        {chat.name ? chat.name.substring(0, 2).toUpperCase() : 'CH'}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Badge for group chats */}
                    {chat.isGroup && (
                      <div className="absolute -top-1 -right-1 bg-[#8b9c8c] rounded-full h-5 w-5 flex items-center justify-center text-xs text-white">
                        <Users className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  
                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-[#e0e0e0] truncate pr-2">
                        {chat.name || (chat.isGroup ? 'Group Chat' : 'Direct Chat')}
                      </h3>
                      <span className="text-xs text-[#969692] flex-shrink-0">
                        {formatDate(chat.lastMessageTime)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-sm truncate pr-2 ${chat.unread > 0 ? 'text-[#e0e0e0] font-medium' : 'text-[#969692]'}`}>
                        {chat.lastMessage || "Tidak ada pesan"}
                      </p>
                      
                      {chat.unread > 0 && (
                        <div className="bg-[#566c57] text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                          {chat.unread}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* New Chat Dialog */}
        <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
          <DialogContent className="bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]">
            <DialogHeader>
              <DialogTitle>Chat Langsung Baru</DialogTitle>
            </DialogHeader>
            
            <div className="max-h-[300px] overflow-y-auto py-2 space-y-1">
              {allUsers.length === 0 ? (
                <p className="text-center py-4 text-[#969692]">Tidak ada kontak tersedia</p>
              ) : (
                allUsers.map((otherUser) => (
                  <div
                    key={otherUser.id}
                    className={`flex items-center p-2 rounded cursor-pointer
                      ${selectedUserId === otherUser.id ? 'bg-[#354c36]' : 'hover:bg-[#2c2d27]'}`}
                    onClick={() => setSelectedUserId(otherUser.id)}
                  >
                    <Avatar className="h-10 w-10 mr-3 bg-[#3d5a65]">
                      <AvatarFallback className="text-white">
                        {otherUser.username ? otherUser.username.substring(0, 2).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{otherUser.username || `User ${otherUser.id}`}</p>
                      {otherUser.pangkat && (
                        <p className="text-xs text-[#969692]">{otherUser.pangkat}, {otherUser.kesatuan || 'Military'}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                className="border-[#3d3f35] text-[#e0e0e0] hover:bg-[#2c2d27]"
                onClick={() => {
                  setShowNewChatDialog(false);
                  setSelectedUserId(null);
                }}
              >
                Batal
              </Button>
              <Button
                className="bg-[#354c36] hover:bg-[#455c46] text-white"
                disabled={selectedUserId === null}
                onClick={handleCreateDirectChat}
              >
                Mulai Chat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Main Menu */}
        <MainMenu activeTab="comms" />
      </div>
    );
  }
  
  // Render Chat View
  return (
    <div className="flex flex-col h-screen bg-[#1f201c]">
      {/* Header */}
      <div className="bg-[#2a2b25] px-4 py-3 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 text-[#bdc1c0] hover:text-white hover:bg-[#3d3f35]"
          onClick={handleBackToList}
        >
          <ArrowLeft size={20} />
        </Button>
        
        <Avatar className="h-10 w-10 mr-3 bg-[#3d5a65]">
          <AvatarFallback className="text-white">
            {activeChat?.name ? activeChat.name.substring(0, 2).toUpperCase() : 'CH'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h2 className="text-[#e0e0e0] font-medium">{activeChat?.name || 'Chat'}</h2>
          <p className="text-xs text-[#bdc1c0]">
            {activeChat?.isGroup ? 'Group Chat' : 'Online'}
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
          messages.map((msg) => {
            const isSystem = msg.senderId === 0;
            const isMe = msg.senderId === user?.id;
            
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-[#2c2d27] text-[#969692] rounded-lg px-3 py-1 text-xs">
                    {msg.text}
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
                  {/* Sender name for group chats */}
                  {!isMe && activeChat?.isGroup && (
                    <div className="text-xs font-medium text-[#8b9c8c] mb-1">
                      {(() => {
                        const sender = allUsers.find(u => u.id === msg.senderId);
                        return sender ? sender.username : `User ${msg.senderId}`;
                      })()}
                    </div>
                  )}
                  
                  <div className="text-sm break-words">{msg.text}</div>
                  <div className="flex justify-end items-center mt-1">
                    <span className="text-xs opacity-70">
                      {formatTime(msg.timestamp)}
                    </span>
                    {isMe && (
                      <span className="text-xs ml-1">
                        {activeChat && msg.readBy && msg.readBy.some(id => id !== user.id) 
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
          className="flex-1 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-[#969692]"
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <Send size={20} />
        </Button>
      </div>
      
      {/* Main Menu */}
      <MainMenu activeTab="comms" />
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { MessageSquare, PhoneIcon, User, Users, Search, ArrowLeft, Send, PlusCircle } from 'lucide-react';
import { useAuth } from './hooks/use-auth';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from './components/ui/dialog';
import { Badge } from './components/ui/badge';

export default function SimpleChatApp() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const messagesEndRef = useRef(null);
  
  // Initialize data and handle URL
  useEffect(() => {
    if (user) {
      initializeDefaultData();
      loadAllUsers();
      loadChats();
      
      // Check URL for chat ID
      const chatMatch = location.match(/\/chat\/(\d+)/);
      if (chatMatch && chatMatch[1]) {
        const chatId = parseInt(chatMatch[1]);
        openChat(chatId);
      }
    }
  }, [user, location]);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Initialize default data if none exists
  const initializeDefaultData = () => {
    // Create users if they don't exist
    if (!localStorage.getItem('simple_chat_users')) {
      const defaultUsers = [
        { id: 7, username: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces' },
        { id: 8, username: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces' },
        { id: 9, username: 'Aji', pangkat: 'Major', kesatuan: 'Communications' }
      ];
      localStorage.setItem('simple_chat_users', JSON.stringify(defaultUsers));
    }
    
    // Create chats if they don't exist
    if (!localStorage.getItem('simple_chat_chats')) {
      const defaultChats = [
        {
          id: 1001,
          type: 'group',
          name: 'Special Forces Team',
          participants: [7, 8, 9],
          createdAt: new Date().toISOString()
        },
        {
          id: 1002,
          type: 'direct',
          user1Id: 7, // Eko
          user2Id: 9, // Aji
          createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        },
        {
          id: 1003,
          type: 'direct',
          user1Id: 8, // David
          user2Id: 9, // Aji
          createdAt: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
        }
      ];
      localStorage.setItem('simple_chat_chats', JSON.stringify(defaultChats));
    }
    
    // Create messages if they don't exist
    if (!localStorage.getItem('simple_chat_messages')) {
      const defaultMessages = [
        // Group chat messages
        {
          id: 2001,
          chatId: 1001,
          senderId: 0, // System
          sender: 'System',
          content: 'Group chat created',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          isRead: true
        },
        {
          id: 2002,
          chatId: 1001,
          senderId: 7, // Eko
          sender: 'Eko',
          content: 'Mission briefing tomorrow at 0800',
          timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
          isRead: true
        },
        {
          id: 2003,
          chatId: 1001,
          senderId: 8, // David
          sender: 'David',
          content: 'Roger that',
          timestamp: new Date(Date.now() - 40000000).toISOString(),
          isRead: true
        },
        
        // Eko-Aji chat
        {
          id: 2004,
          chatId: 1002,
          senderId: 0, // System
          sender: 'System',
          content: 'Secure communication established',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isRead: true
        },
        {
          id: 2005,
          chatId: 1002,
          senderId: 7, // Eko
          sender: 'Eko',
          content: 'Aji, status laporan?',
          timestamp: new Date(Date.now() - 3500000).toISOString(),
          isRead: true
        },
        {
          id: 2006,
          chatId: 1002,
          senderId: 9, // Aji
          sender: 'Aji',
          content: 'Siap, laporan sudah disiapkan Pak',
          timestamp: new Date(Date.now() - 3400000).toISOString(),
          isRead: true
        },
        
        // David-Aji chat
        {
          id: 2007,
          chatId: 1003,
          senderId: 0, // System
          sender: 'System',
          content: 'Secure communication established',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          isRead: true
        },
        {
          id: 2008,
          chatId: 1003,
          senderId: 8, // David
          sender: 'David',
          content: 'Persiapan untuk operasi besok sudah selesai?',
          timestamp: new Date(Date.now() - 7100000).toISOString(),
          isRead: true
        },
        {
          id: 2009,
          chatId: 1003,
          senderId: 9, // Aji
          sender: 'Aji',
          content: 'Siap Pak, semua equipment sudah disiapkan',
          timestamp: new Date(Date.now() - 7000000).toISOString(),
          isRead: true
        }
      ];
      localStorage.setItem('simple_chat_messages', JSON.stringify(defaultMessages));
    }
  };
  
  // Load all users
  const loadAllUsers = () => {
    try {
      const usersStr = localStorage.getItem('simple_chat_users');
      if (usersStr) {
        const allUsers = JSON.parse(usersStr);
        // Filter out current user
        setAllUsers(allUsers.filter(u => u.id !== user?.id));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };
  
  // Load all chats
  const loadChats = () => {
    try {
      const chatsStr = localStorage.getItem('simple_chat_chats');
      if (!chatsStr) return;
      
      const allChats = JSON.parse(chatsStr);
      
      // Filter chats for current user
      const userChats = allChats.filter(chat => {
        if (chat.type === 'group') {
          return chat.participants.includes(user.id);
        } else {
          return chat.user1Id === user.id || chat.user2Id === user.id;
        }
      });
      
      // Process chats to add display info
      const processedChats = userChats.map(chat => {
        // Get chat name
        let displayName = chat.name;
        let otherUserId = null;
        
        if (chat.type === 'direct') {
          otherUserId = chat.user1Id === user.id ? chat.user2Id : chat.user1Id;
          const otherUser = getUserById(otherUserId);
          if (otherUser) {
            displayName = otherUser.username;
          } else {
            displayName = `User ${otherUserId}`;
          }
        }
        
        // Get last message
        const chatMessages = getChatMessages(chat.id);
        const lastMessage = chatMessages.length > 0 ? 
          chatMessages[chatMessages.length - 1] : null;
        
        // Count unread messages
        const unreadCount = chatMessages.filter(msg => 
          !msg.isRead && msg.senderId !== user.id
        ).length;
        
        return {
          ...chat,
          displayName,
          otherUserId,
          lastMessage: lastMessage ? lastMessage.content : '',
          lastMessageTime: lastMessage ? lastMessage.timestamp : chat.createdAt,
          unread: unreadCount
        };
      });
      
      // Sort by most recent message
      processedChats.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
      
      setChats(processedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };
  
  // Get user by ID
  const getUserById = (userId) => {
    try {
      const usersStr = localStorage.getItem('simple_chat_users');
      if (usersStr) {
        const users = JSON.parse(usersStr);
        return users.find(u => u.id === userId);
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
    return null;
  };
  
  // Get messages for a chat
  const getChatMessages = (chatId) => {
    try {
      const messagesStr = localStorage.getItem('simple_chat_messages');
      if (messagesStr) {
        const allMessages = JSON.parse(messagesStr);
        return allMessages
          .filter(msg => msg.chatId === chatId)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }
    } catch (error) {
      console.error('Error getting messages:', error);
    }
    return [];
  };
  
  // Load messages for a chat
  const loadMessages = (chatId) => {
    const chatMessages = getChatMessages(chatId);
    setMessages(chatMessages);
    
    // Mark messages as read
    markMessagesAsRead(chatId);
  };
  
  // Mark messages as read
  const markMessagesAsRead = (chatId) => {
    try {
      const messagesStr = localStorage.getItem('simple_chat_messages');
      if (!messagesStr) return;
      
      const allMessages = JSON.parse(messagesStr);
      let updated = false;
      
      // Update isRead status
      const updatedMessages = allMessages.map(msg => {
        if (msg.chatId === chatId && msg.senderId !== user.id && !msg.isRead) {
          updated = true;
          return { ...msg, isRead: true };
        }
        return msg;
      });
      
      // Save if changes were made
      if (updated) {
        localStorage.setItem('simple_chat_messages', JSON.stringify(updatedMessages));
        // Refresh chat list
        loadChats();
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  // Open a chat
  const openChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setActiveChat(chat);
      setView('chat');
      loadMessages(chatId);
      
      // Update URL without refreshing
      setLocation(`/chat/${chatId}`);
    }
  };
  
  // Create a new direct chat
  const createDirectChat = () => {
    if (!selectedUser) return;
    
    try {
      // Check if chat already exists
      const existingChat = chats.find(chat => 
        chat.type === 'direct' && 
        ((chat.user1Id === user.id && chat.user2Id === selectedUser.id) ||
         (chat.user1Id === selectedUser.id && chat.user2Id === user.id))
      );
      
      if (existingChat) {
        // Close dialog and open existing chat
        setShowNewChatDialog(false);
        setSelectedUser(null);
        openChat(existingChat.id);
        return;
      }
      
      // Get all chats
      const chatsStr = localStorage.getItem('simple_chat_chats');
      const allChats = chatsStr ? JSON.parse(chatsStr) : [];
      
      // Create new chat
      const newChatId = Date.now();
      const newChat = {
        id: newChatId,
        type: 'direct',
        user1Id: user.id,
        user2Id: selectedUser.id,
        createdAt: new Date().toISOString()
      };
      
      // Add to chats
      allChats.push(newChat);
      localStorage.setItem('simple_chat_chats', JSON.stringify(allChats));
      
      // Create system message
      const messagesStr = localStorage.getItem('simple_chat_messages');
      const allMessages = messagesStr ? JSON.parse(messagesStr) : [];
      
      allMessages.push({
        id: Date.now(),
        chatId: newChatId,
        senderId: 0, // System
        sender: 'System',
        content: 'Secure communication established',
        timestamp: new Date().toISOString(),
        isRead: true
      });
      
      localStorage.setItem('simple_chat_messages', JSON.stringify(allMessages));
      
      // Close dialog
      setShowNewChatDialog(false);
      setSelectedUser(null);
      
      // Refresh and open new chat
      loadChats();
      setTimeout(() => openChat(newChatId), 300);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };
  
  // Send a message
  const sendMessage = () => {
    if (!activeChat || !newMessage.trim()) return;
    
    try {
      // Get all messages
      const messagesStr = localStorage.getItem('simple_chat_messages');
      const allMessages = messagesStr ? JSON.parse(messagesStr) : [];
      
      // Create new message
      const newMsg = {
        id: Date.now(),
        chatId: activeChat.id,
        senderId: user.id,
        sender: user.username,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        isRead: false
      };
      
      // Add to messages
      allMessages.push(newMsg);
      localStorage.setItem('simple_chat_messages', JSON.stringify(allMessages));
      
      // Clear input
      setNewMessage('');
      
      // Reload messages
      loadMessages(activeChat.id);
      
      // Create auto-response for demo
      if (activeChat.type === 'direct' && activeChat.otherUserId) {
        setTimeout(() => {
          createAutoResponse(activeChat.id, activeChat.otherUserId);
        }, Math.random() * 2000 + 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Create auto response
  const createAutoResponse = (chatId, responderId) => {
    try {
      // Get responder info
      const responder = getUserById(responderId);
      if (!responder) return;
      
      // Get all messages
      const messagesStr = localStorage.getItem('simple_chat_messages');
      const allMessages = messagesStr ? JSON.parse(messagesStr) : [];
      
      // Response options
      const responses = [
        'Siap, laksanakan!',
        'Perintah diterima.',
        'Roger that.',
        'Akan segera dilaksanakan.',
        'Copy that, standing by.',
        'Mengerti, Pak.',
        'Affirmative.',
        'Sedang diproses saat ini.'
      ];
      
      // Create response message
      const newMsg = {
        id: Date.now(),
        chatId: chatId,
        senderId: responderId,
        sender: responder.username,
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString(),
        isRead: true // Already read since we're in the chat
      };
      
      // Add to messages
      allMessages.push(newMsg);
      localStorage.setItem('simple_chat_messages', JSON.stringify(allMessages));
      
      // Reload messages
      loadMessages(chatId);
    } catch (error) {
      console.error('Error creating auto response:', error);
    }
  };
  
  // Format time for messages
  const formatMessageTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };
  
  // Format time for chat list
  const formatChatTime = (timestamp) => {
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
      
      // If within a week, show day name
      const dayDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      }
      
      // Otherwise show date
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    } catch (error) {
      return '';
    }
  };
  
  // Filter chats by search
  const filteredChats = searchQuery.trim() 
    ? chats.filter(chat => 
        chat.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats;
  
  // Back to chat list
  const goBack = () => {
    setView('list');
    setActiveChat(null);
    setLocation('/comms');
  };
  
  // Render chat list view
  if (view === 'list') {
    return (
      <div className="flex flex-col h-screen bg-[#1f201c]">
        {/* Header */}
        <div className="bg-[#2a2b25] px-4 py-3 flex justify-between items-center">
          <h1 className="text-[#e0e0e0] font-bold">COMMS</h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#bdc1c0] hover:text-white hover:bg-[#3d3f35]"
            onClick={() => setShowNewChatDialog(true)}
          >
            <PlusCircle size={20} />
          </Button>
        </div>
        
        {/* Search bar */}
        <div className="p-2 bg-[#2a2b25]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#969692]" />
            <Input 
              placeholder="Search messages or contacts..."
              className="pl-9 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0] focus:ring-[#566c57] focus:border-[#566c57]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <MessageSquare className="h-12 w-12 text-[#566c57] mb-4" />
              <p className="text-[#969692] mb-2">No communications available</p>
              <p className="text-[#969692]/70 text-sm">Start a new communication to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-[#3d3f35]/40">
              {filteredChats.map(chat => (
                <div
                  key={chat.id}
                  className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]"
                  onClick={() => openChat(chat.id)}
                >
                  {/* Avatar */}
                  <div className="relative mr-3">
                    <Avatar className={`h-12 w-12 ${chat.type === 'group' ? 'bg-[#566c57]' : 'bg-[#3d5a65]'}`}>
                      <AvatarFallback className="text-white font-medium">
                        {chat.displayName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Badge for groups */}
                    {chat.type === 'group' && (
                      <div className="absolute -top-1 -right-1 bg-[#8b9c8c] rounded-full h-5 w-5 flex items-center justify-center text-xs text-white">
                        <Users className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  
                  {/* Chat details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-[#e0e0e0] truncate pr-2">
                        {chat.displayName}
                      </h3>
                      <span className="text-xs text-[#969692] flex-shrink-0">
                        {formatChatTime(chat.lastMessageTime)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-sm truncate pr-2 ${chat.unread > 0 ? 'text-[#e0e0e0] font-medium' : 'text-[#969692]'}`}>
                        {chat.lastMessage || "No messages"}
                      </p>
                      
                      {chat.unread > 0 && (
                        <Badge className="bg-[#566c57] hover:bg-[#566c57] text-white">
                          {chat.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* New chat dialog */}
        <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
          <DialogContent className="bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]">
            <DialogHeader>
              <DialogTitle>New Direct Chat</DialogTitle>
            </DialogHeader>
            
            <div className="max-h-[300px] overflow-y-auto py-2 space-y-1">
              {allUsers.length === 0 ? (
                <p className="text-center py-4 text-[#969692]">No contacts available</p>
              ) : (
                allUsers.map(u => (
                  <div
                    key={u.id}
                    className={`flex items-center p-2 rounded cursor-pointer
                      ${selectedUser?.id === u.id ? 'bg-[#354c36]' : 'hover:bg-[#2c2d27]'}`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <Avatar className="h-10 w-10 mr-3 bg-[#3d5a65]">
                      <AvatarFallback className="text-white">
                        {u.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{u.username}</p>
                      {u.pangkat && (
                        <p className="text-xs text-[#969692]">{u.pangkat}, {u.kesatuan}</p>
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
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#354c36] hover:bg-[#455c46] text-white"
                disabled={!selectedUser}
                onClick={createDirectChat}
              >
                Start Chat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Bottom navigation */}
        <div className="h-16 bg-[#2a2b25] border-t border-[#3d3f35] flex justify-around items-center">
          <div className="flex flex-col items-center text-white bg-[#354c36] px-4 py-2 rounded-md">
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs mt-1">COMMS</span>
          </div>
          
          <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
            <PhoneIcon className="h-5 w-5" />
            <span className="text-xs mt-1">CALL</span>
          </div>
          
          <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">PERSONNEL</span>
          </div>
          
          <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
            <Users className="h-5 w-5" />
            <span className="text-xs mt-1">CONFIG</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Render chat view
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
            {activeChat?.displayName ? activeChat.displayName.substring(0, 2).toUpperCase() : 'CH'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h2 className="text-[#e0e0e0] font-medium">{activeChat?.displayName || 'Chat'}</h2>
          <p className="text-xs text-[#bdc1c0]">
            {activeChat?.type === 'group' ? 'Group Chat' : 'Online'}
          </p>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-[#242520] to-[#1f201c]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#969692]">No messages yet</p>
          </div>
        ) : (
          messages.map(msg => {
            const isSystem = msg.senderId === 0;
            const isMe = msg.senderId === user?.id;
            
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
                  {/* Show sender name for group chats */}
                  {!isMe && activeChat?.type === 'group' && (
                    <div className="text-xs font-medium text-[#8b9c8c] mb-1">
                      {msg.sender}
                    </div>
                  )}
                  
                  <div className="text-sm break-words">{msg.content}</div>
                  <div className="flex justify-end items-center mt-1">
                    <span className="text-xs opacity-70">
                      {formatMessageTime(msg.timestamp)}
                    </span>
                    {isMe && (
                      <span className="text-xs ml-1">
                        {msg.isRead ? <span className="text-blue-400">✓✓</span> : <span className="opacity-70">✓</span>}
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
      
      {/* Input area */}
      <div className="p-3 bg-[#2a2b25] flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Type a message..."
          className="flex-1 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0] focus:ring-[#566c57] focus:border-[#566c57]"
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
          <Send size={20} />
        </Button>
      </div>
      
      {/* Bottom navigation */}
      <div className="h-16 bg-[#2a2b25] border-t border-[#3d3f35] flex justify-around items-center">
        <div className="flex flex-col items-center text-white bg-[#354c36] px-4 py-2 rounded-md">
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs mt-1">COMMS</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <PhoneIcon className="h-5 w-5" />
          <span className="text-xs mt-1">CALL</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <User className="h-5 w-5" />
          <span className="text-xs mt-1">PERSONNEL</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <Users className="h-5 w-5" />
          <span className="text-xs mt-1">CONFIG</span>
        </div>
      </div>
    </div>
  );
}
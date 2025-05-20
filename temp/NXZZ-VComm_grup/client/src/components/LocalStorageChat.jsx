import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquare, User, Users, Phone, PlusCircle, Send, Search } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { useLocation } from 'wouter';
import { getAuthData } from '../lib/authUtils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from './ui/dialog';

/**
 * Simple Chat Application Component
 * 
 * This component provides a chat application with locally stored messages
 * that can be synchronized between different users.
 */
export default function LocalStorageChat() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [chatList, setChatList] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const messagesEndRef = useRef(null);
  
  // Initialize chat data
  useEffect(() => {
    if (user || getAuthData()) {
      const currentUser = user || getAuthData();
      console.log("Initializing chat data for user:", currentUser.id);
      initializeChatData();
      loadChatList();
      loadAvailableUsers();
      
      // Check URL params for chat ID
      const match = location.match(/\/chat\/(\d+)/);
      if (match && match[1]) {
        const chatId = parseInt(match[1]);
        console.log("Opening chat from URL:", chatId);
        handleOpenChat(chatId);
      }
    }
  }, [user, location]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Refresh chats and messages periodically
  useEffect(() => {
    if (!user) return;
    
    const chatsInterval = setInterval(() => {
      if (view === 'list') {
        loadChatList();
      }
    }, 3000);
    
    const messagesInterval = setInterval(() => {
      if (view === 'chat' && activeChat) {
        loadMessages(activeChat.id);
      }
    }, 2000);
    
    return () => {
      clearInterval(chatsInterval);
      clearInterval(messagesInterval);
    };
  }, [user, view, activeChat]);
  
  // Initialize chat data
  const initializeChatData = () => {
    // Local storage keys
    const usersKey = 'mil_comm_users';
    const chatsKey = 'mil_comm_chats';
    const messagesKey = 'mil_comm_messages';
    
    // Create users if they don't exist
    if (!localStorage.getItem(usersKey)) {
      const defaultUsers = [
        { id: 7, username: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces' },
        { id: 8, username: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces' },
        { id: 9, username: 'Aji', pangkat: 'Major', kesatuan: 'Communications' }
      ];
      localStorage.setItem(usersKey, JSON.stringify(defaultUsers));
    }
    
    // Create chats if they don't exist
    if (!localStorage.getItem(chatsKey)) {
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
      localStorage.setItem(chatsKey, JSON.stringify(defaultChats));
    }
    
    // Create messages if they don't exist
    if (!localStorage.getItem(messagesKey)) {
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
      localStorage.setItem(messagesKey, JSON.stringify(defaultMessages));
    }
  };
  
  // Load chat list for current user
  const loadChatList = () => {
    if (!user) return;
    
    try {
      // Get all chats
      const chats = JSON.parse(localStorage.getItem('mil_comm_chats') || '[]');
      
      // Filter chats for current user
      const userChats = chats.filter(chat => {
        if (chat.type === 'group') {
          return chat.participants && chat.participants.includes(user.id);
        } else {
          return chat.user1Id === user.id || chat.user2Id === user.id;
        }
      });
      
      // Get all messages
      const allMessages = JSON.parse(localStorage.getItem('mil_comm_messages') || '[]');
      
      // Process each chat
      const processedChats = userChats.map(chat => {
        let displayName = chat.name || '';
        let otherUserId = null;
        
        if (chat.type === 'direct') {
          // For direct chats, get the other user's info
          otherUserId = chat.user1Id === user.id ? chat.user2Id : chat.user1Id;
          const otherUser = getUserById(otherUserId);
          
          if (otherUser) {
            displayName = otherUser.username;
          } else {
            displayName = `User ${otherUserId}`;
          }
        }
        
        // Get messages for this chat
        const chatMessages = allMessages.filter(msg => msg.chatId === chat.id);
        
        // Sort by timestamp (newest first)
        chatMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Get last message
        const lastMessage = chatMessages.length > 0 ? chatMessages[0] : null;
        
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
          unreadCount
        };
      });
      
      // Sort by newest message first
      processedChats.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
      
      setChatList(processedChats);
    } catch (error) {
      console.error('Error loading chat list:', error);
    }
  };
  
  // Load available users for new chat
  const loadAvailableUsers = () => {
    if (!user) return;
    
    try {
      const allUsers = JSON.parse(localStorage.getItem('mil_comm_users') || '[]');
      // Filter out current user
      const filteredUsers = allUsers.filter(u => u.id !== user.id);
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  };
  
  // Get user by ID
  const getUserById = (userId) => {
    try {
      const allUsers = JSON.parse(localStorage.getItem('mil_comm_users') || '[]');
      return allUsers.find(u => u.id === userId);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  };
  
  // Load messages for a chat
  const loadMessages = (chatId) => {
    try {
      const allMessages = JSON.parse(localStorage.getItem('mil_comm_messages') || '[]');
      
      // Filter for this chat
      const chatMessages = allMessages.filter(msg => msg.chatId === chatId);
      
      // Sort by timestamp (oldest first)
      chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      setMessages(chatMessages);
      
      // Mark messages as read
      markMessagesAsRead(chatId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  // Mark messages as read
  const markMessagesAsRead = (chatId) => {
    if (!user) return;
    
    try {
      const allMessages = JSON.parse(localStorage.getItem('mil_comm_messages') || '[]');
      let updated = false;
      
      // Mark messages from others as read
      const updatedMessages = allMessages.map(msg => {
        if (msg.chatId === chatId && msg.senderId !== user.id && !msg.isRead) {
          updated = true;
          return { ...msg, isRead: true };
        }
        return msg;
      });
      
      // Save if updated
      if (updated) {
        localStorage.setItem('mil_comm_messages', JSON.stringify(updatedMessages));
        // Refresh chat list to update unread counts
        loadChatList();
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  // Open a chat
  const handleOpenChat = (chatId) => {
    const chat = chatList.find(c => c.id === chatId);
    
    if (chat) {
      setActiveChat(chat);
      setView('chat');
      loadMessages(chatId);
      // Update URL for deep linking
      setLocation(`/chat/${chatId}`);
    }
  };
  
  // Go back to chat list
  const handleBack = () => {
    setActiveChat(null);
    setView('list');
    setLocation('/comms');
  };
  
  // Create new direct chat
  const handleCreateDirectChat = () => {
    if (!selectedUser || !user) return;
    
    try {
      // Check if chat exists
      const allChats = JSON.parse(localStorage.getItem('mil_comm_chats') || '[]');
      
      const existingChat = allChats.find(chat => 
        chat.type === 'direct' && 
        ((chat.user1Id === user.id && chat.user2Id === selectedUser.id) ||
         (chat.user1Id === selectedUser.id && chat.user2Id === user.id))
      );
      
      if (existingChat) {
        // Just open existing chat
        setShowNewChatDialog(false);
        setSelectedUser(null);
        handleOpenChat(existingChat.id);
        return;
      }
      
      // Create new chat
      const newChatId = Date.now();
      const newChat = {
        id: newChatId,
        type: 'direct',
        user1Id: user.id,
        user2Id: selectedUser.id,
        createdAt: new Date().toISOString()
      };
      
      // Save chat
      allChats.push(newChat);
      localStorage.setItem('mil_comm_chats', JSON.stringify(allChats));
      
      // Create initial system message
      const allMessages = JSON.parse(localStorage.getItem('mil_comm_messages') || '[]');
      
      allMessages.push({
        id: Date.now(),
        chatId: newChatId,
        senderId: 0, // System
        sender: 'System',
        content: 'Secure communication established',
        timestamp: new Date().toISOString(),
        isRead: true
      });
      
      localStorage.setItem('mil_comm_messages', JSON.stringify(allMessages));
      
      // Close dialog
      setShowNewChatDialog(false);
      setSelectedUser(null);
      
      // Refresh and open new chat
      loadChatList();
      setTimeout(() => handleOpenChat(newChatId), 100);
    } catch (error) {
      console.error('Error creating direct chat:', error);
    }
  };
  
  // Send a message
  const handleSendMessage = () => {
    if (!activeChat || !user || !newMessage.trim()) return;
    
    try {
      const allMessages = JSON.parse(localStorage.getItem('mil_comm_messages') || '[]');
      
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
      localStorage.setItem('mil_comm_messages', JSON.stringify(allMessages));
      
      // Clear input
      setNewMessage('');
      
      // Refresh messages
      loadMessages(activeChat.id);
      
      // Create auto-response
      if (activeChat.type === 'direct' && activeChat.otherUserId) {
        setTimeout(() => {
          createAutoResponse(activeChat.id, activeChat.otherUserId);
        }, Math.random() * 2000 + 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Create auto-response for demo
  const createAutoResponse = (chatId, responderId) => {
    try {
      const responder = getUserById(responderId);
      if (!responder) return;
      
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
      
      const allMessages = JSON.parse(localStorage.getItem('mil_comm_messages') || '[]');
      
      // Create response message
      const responseMsg = {
        id: Date.now(),
        chatId: chatId,
        senderId: responderId,
        sender: responder.username,
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString(),
        isRead: true // Already read since we're in the chat
      };
      
      // Add to messages
      allMessages.push(responseMsg);
      localStorage.setItem('mil_comm_messages', JSON.stringify(allMessages));
      
      // Refresh messages
      loadMessages(chatId);
    } catch (error) {
      console.error('Error creating auto response:', error);
    }
  };
  
  // Format time for chat list
  const formatChatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      
      // Today, show time
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // Yesterday, show "Kemarin"
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Kemarin';
      }
      
      // Within a week, show day name
      const dayDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      }
      
      // Older, show date
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    } catch (error) {
      return '';
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
  
  // Filter chats by search
  const filteredChats = searchQuery.trim() 
    ? chatList.filter(chat => 
        (chat.displayName && chat.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chatList;
  
  // Render chat list
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
              placeholder="Cari pesan atau kontak..."
              className="pl-9 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]"
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
                  onClick={() => handleOpenChat(chat.id)}
                >
                  {/* Avatar */}
                  <div className="relative mr-3">
                    <Avatar className={`h-12 w-12 ${chat.type === 'group' ? 'bg-[#566c57]' : 'bg-[#3d5a65]'}`}>
                      <AvatarFallback className="text-white font-medium">
                        {chat.displayName && chat.displayName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Badge for groups */}
                    {chat.type === 'group' && (
                      <div className="absolute -top-1 -right-1 bg-[#8b9c8c] rounded-full h-5 w-5 flex items-center justify-center text-xs text-white">
                        <Users className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  
                  {/* Chat info */}
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
                      <p className={`text-sm truncate pr-2 ${chat.unreadCount > 0 ? 'text-[#e0e0e0] font-medium' : 'text-[#969692]'}`}>
                        {chat.lastMessage || "No messages"}
                      </p>
                      
                      {chat.unreadCount > 0 && (
                        <Badge className="bg-[#566c57] hover:bg-[#566c57] text-white">
                          {chat.unreadCount}
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
              {availableUsers.length === 0 ? (
                <p className="text-center py-4 text-[#969692]">No contacts available</p>
              ) : (
                availableUsers.map(u => (
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
                onClick={handleCreateDirectChat}
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
            <Phone className="h-5 w-5" />
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
  
  // Render chat room
  return (
    <div className="flex flex-col h-screen bg-[#1f201c]">
      {/* Header */}
      <div className="bg-[#2a2b25] px-4 py-3 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 text-[#bdc1c0] hover:text-white hover:bg-[#3d3f35]"
          onClick={handleBack}
        >
          <ArrowLeft size={20} />
        </Button>
        
        <Avatar className={`h-10 w-10 mr-3 ${activeChat?.type === 'group' ? 'bg-[#566c57]' : 'bg-[#3d5a65]'}`}>
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
      
      {/* Bottom navigation */}
      <div className="h-16 bg-[#2a2b25] border-t border-[#3d3f35] flex justify-around items-center">
        <div className="flex flex-col items-center text-white bg-[#354c36] px-4 py-2 rounded-md">
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs mt-1">COMMS</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <Phone className="h-5 w-5" />
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
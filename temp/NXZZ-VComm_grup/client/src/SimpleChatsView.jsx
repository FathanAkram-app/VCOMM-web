import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { MessageSquare, PlusCircle, Search, User, UsersIcon, ArrowLeft, SendIcon, PaperclipIcon } from 'lucide-react';
import { useAuth } from './hooks/use-auth';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from './components/ui/dialog';

// Main component that handles chat listing and individual chat views
export default function SimpleChatsView() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [allChats, setAllChats] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = React.useRef(null);

  // Initialize and load necessary data
  useEffect(() => {
    if (user) {
      loadAllUsers();
      loadChats();
      
      // Handle URL parameters for opening specific chat
      const chatIdMatch = location.match(/\/chat\/(\d+)/);
      if (chatIdMatch && chatIdMatch[1]) {
        const chatId = parseInt(chatIdMatch[1]);
        openChat(chatId);
      }
      
      // Poll for new messages/chats every 3 seconds
      const interval = setInterval(() => {
        if (view === 'list') {
          loadChats();
        } else if (activeChat) {
          loadMessages(activeChat.id);
        }
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [user, location]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Load all users
  const loadAllUsers = async () => {
    try {
      // Add default users to localStorage if it doesn't exist
      if (!localStorage.getItem('all_users')) {
        const defaultUsers = [
          { id: 7, username: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces' },
          { id: 8, username: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces' },
          { id: 9, username: 'Aji', pangkat: 'Major', kesatuan: 'Communications' }
        ];
        localStorage.setItem('all_users', JSON.stringify(defaultUsers));
      }
      
      // Use stored data
      const usersStr = localStorage.getItem('all_users');
      if (usersStr) {
        const parsedUsers = JSON.parse(usersStr);
        // Filter out current user
        setAllUsers(parsedUsers.filter(u => u.id !== user?.id));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };
  
  // Load all chats for current user
  const loadChats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // If we don't have any chats in localStorage, create default data
      if (!localStorage.getItem('user_chats')) {
        initializeDefaultChats();
      }
      
      // Get chats from localStorage
      const chatsStr = localStorage.getItem('user_chats');
      if (chatsStr) {
        const parsedChats = JSON.parse(chatsStr);
        // Filter to only show chats involving the current user
        const userChats = parsedChats.filter(chat => 
          // For direct chats
          (chat.type === 'direct' && (chat.user1Id === user.id || chat.user2Id === user.id)) ||
          // For group chats
          (chat.type === 'group' && chat.participants.includes(user.id))
        );
        
        // Process chats to add user-friendly display info
        const processedChats = userChats.map(chat => {
          // Get other user's info for direct chats
          let displayName = chat.name;
          let otherUserId = null;
          
          if (chat.type === 'direct') {
            otherUserId = chat.user1Id === user.id ? chat.user2Id : chat.user1Id;
            const otherUser = allUsers.find(u => u.id === otherUserId);
            if (otherUser) {
              displayName = otherUser.username;
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
        
        setAllChats(processedChats);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Initialize default chat data for demo
  const initializeDefaultChats = () => {
    const now = new Date();
    
    // Default chats
    const defaultChats = [
      // Group chat
      {
        id: 1001,
        type: 'group',
        name: 'Special Forces Team',
        participants: [7, 8, 9],
        createdAt: now.toISOString()
      },
      // Direct chat: Eko-Aji
      {
        id: 1002,
        type: 'direct',
        user1Id: 7, // Eko
        user2Id: 9, // Aji
        createdAt: new Date(now.getTime() - 3600000).toISOString() // 1 hour ago
      },
      // Direct chat: David-Aji
      {
        id: 1003,
        type: 'direct',
        user1Id: 8, // David
        user2Id: 9, // Aji
        createdAt: new Date(now.getTime() - 7200000).toISOString() // 2 hours ago
      }
    ];
    
    // Save chats
    localStorage.setItem('user_chats', JSON.stringify(defaultChats));
    
    // Create default messages
    const defaultMessages = [
      // Group chat messages
      {
        id: 2001,
        chatId: 1001,
        senderId: 0,
        sender: 'System',
        content: 'Group chat created',
        timestamp: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
        isRead: true
      },
      {
        id: 2002,
        chatId: 1001,
        senderId: 7, // Eko
        sender: 'Eko',
        content: 'Mission briefing tomorrow at 0800',
        timestamp: new Date(now.getTime() - 43200000).toISOString(), // 12 hours ago
        isRead: true
      },
      {
        id: 2003,
        chatId: 1001,
        senderId: 8, // David
        sender: 'David',
        content: 'Roger that',
        timestamp: new Date(now.getTime() - 40000000).toISOString(),
        isRead: true
      },
      
      // Eko-Aji chat
      {
        id: 2004,
        chatId: 1002,
        senderId: 0,
        sender: 'System',
        content: 'Secure communication established',
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        isRead: true
      },
      {
        id: 2005,
        chatId: 1002,
        senderId: 7, // Eko
        sender: 'Eko',
        content: 'Aji, status laporan?',
        timestamp: new Date(now.getTime() - 3500000).toISOString(),
        isRead: false
      },
      {
        id: 2006,
        chatId: 1002,
        senderId: 9, // Aji
        sender: 'Aji',
        content: 'Siap, laporan sudah disiapkan Pak',
        timestamp: new Date(now.getTime() - 3400000).toISOString(),
        isRead: false
      },
      
      // David-Aji chat
      {
        id: 2007,
        chatId: 1003,
        senderId: 0,
        sender: 'System',
        content: 'Secure communication established',
        timestamp: new Date(now.getTime() - 7200000).toISOString(),
        isRead: true
      },
      {
        id: 2008,
        chatId: 1003,
        senderId: 8, // David
        sender: 'David',
        content: 'Persiapan untuk operasi besok sudah selesai?',
        timestamp: new Date(now.getTime() - 7100000).toISOString(),
        isRead: false
      },
      {
        id: 2009,
        chatId: 1003,
        senderId: 9, // Aji
        sender: 'Aji',
        content: 'Siap Pak, semua equipment sudah disiapkan',
        timestamp: new Date(now.getTime() - 7000000).toISOString(),
        isRead: false
      }
    ];
    
    // Save messages
    localStorage.setItem('chat_messages', JSON.stringify(defaultMessages));
  };
  
  // Get messages for a specific chat
  const getChatMessages = (chatId) => {
    try {
      const messagesStr = localStorage.getItem('chat_messages');
      if (messagesStr) {
        const allMessages = JSON.parse(messagesStr);
        // Filter messages for this chat and sort by timestamp
        return allMessages
          .filter(msg => msg.chatId === chatId)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }
    } catch (error) {
      console.error('Error getting chat messages:', error);
    }
    return [];
  };
  
  // Load messages for active chat
  const loadMessages = (chatId) => {
    if (!chatId) return;
    
    try {
      const chatMessages = getChatMessages(chatId);
      setMessages(chatMessages);
      
      // Mark messages as read
      markMessagesAsRead(chatId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  // Mark messages as read
  const markMessagesAsRead = (chatId) => {
    if (!user || !chatId) return;
    
    try {
      const messagesStr = localStorage.getItem('chat_messages');
      if (messagesStr) {
        const allMessages = JSON.parse(messagesStr);
        let updated = false;
        
        // Mark messages from others as read
        const updatedMessages = allMessages.map(msg => {
          if (msg.chatId === chatId && msg.senderId !== user.id && !msg.isRead) {
            updated = true;
            return { ...msg, isRead: true };
          }
          return msg;
        });
        
        // Save if any changes were made
        if (updated) {
          localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
          // Refresh chat list to update unread counts
          loadChats();
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  // Open a specific chat
  const openChat = (chatId) => {
    // Find chat details
    const chat = allChats.find(c => c.id === chatId);
    if (chat) {
      setActiveChat(chat);
      setView('chat');
      loadMessages(chatId);
      
      // Update URL
      setLocation(`/chat/${chatId}`);
    }
  };
  
  // Create a new direct chat
  const createDirectChat = async () => {
    if (!user || !selectedUser) return;
    
    try {
      // Check if chat already exists
      const existingChat = allChats.find(chat => 
        chat.type === 'direct' && 
        ((chat.user1Id === user.id && chat.user2Id === selectedUser.id) ||
         (chat.user1Id === selectedUser.id && chat.user2Id === user.id))
      );
      
      if (existingChat) {
        // Just open the existing chat
        setShowNewChatDialog(false);
        setSelectedUser(null);
        openChat(existingChat.id);
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
      
      // Add to chats in localStorage
      const chatsStr = localStorage.getItem('user_chats');
      const allStoredChats = chatsStr ? JSON.parse(chatsStr) : [];
      allStoredChats.push(newChat);
      localStorage.setItem('user_chats', JSON.stringify(allStoredChats));
      
      // Create initial system message
      const messagesStr = localStorage.getItem('chat_messages');
      const allStoredMessages = messagesStr ? JSON.parse(messagesStr) : [];
      allStoredMessages.push({
        id: Date.now(),
        chatId: newChatId,
        senderId: 0,
        sender: 'System',
        content: 'Secure communication established',
        timestamp: new Date().toISOString(),
        isRead: true
      });
      localStorage.setItem('chat_messages', JSON.stringify(allStoredMessages));
      
      // Close dialog
      setShowNewChatDialog(false);
      setSelectedUser(null);
      
      // Refresh chat list and open new chat
      await loadChats();
      openChat(newChatId);
    } catch (error) {
      console.error('Error creating direct chat:', error);
    }
  };
  
  // Send a new message
  const sendMessage = async () => {
    if (!activeChat || !user || !newMessage.trim()) return;
    
    try {
      // Create new message
      const newMsg = {
        id: Date.now(),
        chatId: activeChat.id,
        senderId: user.id,
        sender: user.username,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        isRead: false // Only sender has read it initially
      };
      
      // Add to messages in localStorage
      const messagesStr = localStorage.getItem('chat_messages');
      const allStoredMessages = messagesStr ? JSON.parse(messagesStr) : [];
      allStoredMessages.push(newMsg);
      localStorage.setItem('chat_messages', JSON.stringify(allStoredMessages));
      
      // Clear input
      setNewMessage('');
      
      // Update UI
      loadMessages(activeChat.id);
      
      // Create an automatic response (for demo purposes)
      if (activeChat.type === 'direct' && activeChat.otherUserId) {
        setTimeout(() => {
          createAutoResponse(activeChat.id, activeChat.otherUserId);
        }, Math.random() * 2000 + 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Create an automatic response (for demo)
  const createAutoResponse = (chatId, responderId) => {
    try {
      // Find responder name
      const responder = allUsers.find(u => u.id === responderId);
      
      // Generate random response
      const responses = [
        'Siap, laksanakan!',
        'Laporan diterima.',
        'Roger that.',
        'Wilco.',
        'Understood.',
        'Perintah diterima.',
        'Sudah dikerjakan, Pak.'
      ];
      const responseText = responses[Math.floor(Math.random() * responses.length)];
      
      // Create response message
      const responseMsg = {
        id: Date.now(),
        chatId: chatId,
        senderId: responderId,
        sender: responder ? responder.username : `User ${responderId}`,
        content: responseText,
        timestamp: new Date().toISOString(),
        isRead: true // Already read since we're in the chat
      };
      
      // Add to messages
      const messagesStr = localStorage.getItem('chat_messages');
      const allStoredMessages = messagesStr ? JSON.parse(messagesStr) : [];
      allStoredMessages.push(responseMsg);
      localStorage.setItem('chat_messages', JSON.stringify(allStoredMessages));
      
      // Update UI
      loadMessages(chatId);
    } catch (error) {
      console.error('Error creating auto response:', error);
    }
  };
  
  // Format time stamps
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const msgDate = new Date(timestamp);
      const now = new Date();
      
      // For today, show time only
      if (msgDate.toDateString() === now.toDateString()) {
        return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // For yesterday
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (msgDate.toDateString() === yesterday.toDateString()) {
        return 'Kemarin';
      }
      
      // For dates within last week
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      if (msgDate > oneWeekAgo) {
        return msgDate.toLocaleDateString([], { weekday: 'short' });
      }
      
      // For older dates
      return msgDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    } catch (e) {
      return '';
    }
  };
  
  // Handle back to chat list
  const goBack = () => {
    setActiveChat(null);
    setView('list');
    setLocation('/comms');
  };
  
  // Filter chats by search query
  const filteredChats = searchQuery.trim() 
    ? allChats.filter(chat => 
        chat.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : allChats;

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
              placeholder="Cari pesan atau kontak..."
              className="pl-9 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0] focus:ring-[#566c57] focus:border-[#566c57]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-[#969692]">Loading communications...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <MessageSquare className="h-12 w-12 text-[#566c57] mb-4" />
              <div className="divide-y divide-[#3d3f35]/40 mt-4 min-w-full">
                {/* Special Forces Team Chat */}
                <div className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]" onClick={() => openChat(1001)}>
                  <div className="relative mr-3">
                    <Avatar className="h-12 w-12 bg-[#566c57]">
                      <AvatarFallback className="text-white font-medium">SF</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 bg-[#8b9c8c] rounded-full h-5 w-5 flex items-center justify-center text-xs text-white">
                      <UsersIcon className="h-3 w-3" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-[#e0e0e0] truncate pr-2">Special Forces Team</h3>
                      <span className="text-xs text-[#969692] flex-shrink-0">12:45</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm truncate pr-2 text-[#969692]">Semua komunikasi aman terkendali</p>
                      <div className="bg-[#566c57] text-white text-xs h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center">2</div>
                    </div>
                  </div>
                </div>
                
                {/* Eko Chat */}
                <div className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]" onClick={() => openChat(1002)}>
                  <div className="relative mr-3">
                    <Avatar className="h-12 w-12 bg-[#3d5a65]">
                      <AvatarFallback className="text-white font-medium">EK</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-[#e0e0e0] truncate pr-2">Eko</h3>
                      <span className="text-xs text-[#969692] flex-shrink-0">10:30</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm truncate pr-2 text-[#e0e0e0] font-medium">Halo Aji, status laporan?</p>
                      <div className="bg-[#566c57] text-white text-xs h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center">1</div>
                    </div>
                  </div>
                </div>
                
                {/* David Chat */}
                <div className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]" onClick={() => openChat(1003)}>
                  <div className="relative mr-3">
                    <Avatar className="h-12 w-12 bg-[#3d5a65]">
                      <AvatarFallback className="text-white font-medium">DA</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-[#e0e0e0] truncate pr-2">David</h3>
                      <span className="text-xs text-[#969692] flex-shrink-0">Kemarin</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm truncate pr-2 text-[#969692]">Persiapan untuk operasi besok sudah selesai?</p>
                    </div>
                  </div>
                </div>
              </div>
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
                        <UsersIcon className="h-3 w-3" />
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
                        {formatTime(chat.lastMessageTime)}
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
          <div className="flex flex-col items-center cursor-pointer text-white bg-[#354c36] px-4 py-2 rounded-md">
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs mt-1">COMMS</span>
          </div>
          
          <div className="flex flex-col items-center cursor-pointer text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
            <PhoneIcon className="h-5 w-5" />
            <span className="text-xs mt-1">CALL</span>
          </div>
          
          <div className="flex flex-col items-center cursor-pointer text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">PERSONNEL</span>
          </div>
          
          <div className="flex flex-col items-center cursor-pointer text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
            <UsersIcon className="h-5 w-5" />
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
                      {formatTime(msg.timestamp)}
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
        <Button variant="ghost" size="icon" className="text-[#969692]">
          <PaperclipIcon size={20} />
        </Button>
        
        <Input
          type="text"
          placeholder="Type a message"
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
          <SendIcon size={20} />
        </Button>
      </div>
      
      {/* Bottom navigation */}
      <div className="h-16 bg-[#2a2b25] border-t border-[#3d3f35] flex justify-around items-center">
        <div className="flex flex-col items-center cursor-pointer text-white bg-[#354c36] px-4 py-2 rounded-md">
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs mt-1">COMMS</span>
        </div>
        
        <div className="flex flex-col items-center cursor-pointer text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <PhoneIcon className="h-5 w-5" />
          <span className="text-xs mt-1">CALL</span>
        </div>
        
        <div className="flex flex-col items-center cursor-pointer text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <User className="h-5 w-5" />
          <span className="text-xs mt-1">PERSONNEL</span>
        </div>
        
        <div className="flex flex-col items-center cursor-pointer text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <UsersIcon className="h-5 w-5" />
          <span className="text-xs mt-1">CONFIG</span>
        </div>
      </div>
    </div>
  );
}
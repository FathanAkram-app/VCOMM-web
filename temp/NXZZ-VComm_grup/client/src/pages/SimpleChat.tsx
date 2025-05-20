import React, { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { ArrowLeft, Send, Search, UserPlus, Users, Plus, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '../components/ui/dialog';
import { useAuth } from '../hooks/use-auth';
import MainMenu from '../components/MainMenu';

// Chat message type
interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

// Chat type
interface Chat {
  id: number;
  name: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  otherUserId?: number;
}

// User type
interface ChatUser {
  id: number;
  username: string;
  pangkat?: string;
  kesatuan?: string;
}

const SimpleChat: React.FC = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState<'list' | 'chat'>('list');
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // For URL parsing
  const [matchChat, chatParams] = useRoute('/chat/:id');
  const chatId = chatParams?.id ? Number(chatParams.id) : null;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize data
  useEffect(() => {
    initializeData();
    loadUsers();
    
    // If URL has chat ID, open that chat
    if (chatId) {
      openChat(chatId);
    } else {
      setActiveView('list');
      loadChats();
    }
  }, [chatId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Refresh chats and messages periodically
  useEffect(() => {
    if (!user) return;
    
    loadChats();
    
    const chatInterval = setInterval(loadChats, 3000);
    const messageInterval = setInterval(() => {
      if (activeChat) {
        loadMessages(activeChat.id);
      }
    }, 2000);
    
    return () => {
      clearInterval(chatInterval);
      clearInterval(messageInterval);
    };
  }, [user, activeChat]);

  // Load all users
  const loadUsers = () => {
    try {
      // Create default users if none exist
      if (!localStorage.getItem('all_users')) {
        const defaultUsers = [
          { id: 7, username: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces', nrp: '1001' },
          { id: 8, username: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces', nrp: '1002' },
          { id: 9, username: 'Aji', pangkat: 'Major', kesatuan: 'Communications', nrp: '1003' }
        ];
        localStorage.setItem('all_users', JSON.stringify(defaultUsers));
      }
      
      // Load users from storage
      const usersStr = localStorage.getItem('all_users');
      if (usersStr) {
        const parsedUsers = JSON.parse(usersStr);
        // Filter out current user
        const filteredUsers = parsedUsers.filter((u: ChatUser) => u.id !== user?.id);
        setAllUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Initialize data
  const initializeData = () => {
    // Check if we already have data
    if (localStorage.getItem('all_chats') && localStorage.getItem('all_messages')) {
      return;
    }
    
    console.log('Initializing chat data...');
    
    // Create default chats
    const defaultChats = [
      {
        id: 1001,
        name: 'Special Forces Team',
        isGroup: true,
        participants: [7, 8, 9],
        createdAt: new Date().toISOString()
      },
      {
        id: 1002,
        name: '',
        isGroup: false,
        user1Id: 7, // Eko
        user2Id: 9, // Aji
        createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      },
      {
        id: 1003,
        name: '',
        isGroup: false,
        user1Id: 8, // David
        user2Id: 9, // Aji
        createdAt: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
      }
    ];
    
    // Save chats
    localStorage.setItem('all_chats', JSON.stringify(defaultChats));
    
    // Create default messages
    const defaultMessages = [
      // Group chat messages
      {
        id: 2001,
        chatId: 1001,
        senderId: 0,
        text: 'Group chat created',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        readBy: [7, 8, 9]
      },
      {
        id: 2002,
        chatId: 1001,
        senderId: 7,
        text: 'Mission briefing tomorrow at 0800',
        timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        readBy: [7, 8, 9]
      },
      {
        id: 2003,
        chatId: 1001,
        senderId: 8,
        text: 'Roger that',
        timestamp: new Date(Date.now() - 40000000).toISOString(),
        readBy: [7, 8, 9]
      },
      
      // Eko-Aji chat
      {
        id: 2004,
        chatId: 1002,
        senderId: 0,
        text: 'Secure communication established',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        readBy: [7, 9]
      },
      {
        id: 2005,
        chatId: 1002,
        senderId: 7,
        text: 'Aji, status laporan?',
        timestamp: new Date(Date.now() - 3500000).toISOString(),
        readBy: [7, 9]
      },
      {
        id: 2006,
        chatId: 1002,
        senderId: 9,
        text: 'Siap, laporan sudah disiapkan Pak',
        timestamp: new Date(Date.now() - 3400000).toISOString(),
        readBy: [7, 9]
      },
      
      // David-Aji chat
      {
        id: 2007,
        chatId: 1003,
        senderId: 0,
        text: 'Secure communication established',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        readBy: [8, 9]
      },
      {
        id: 2008,
        chatId: 1003,
        senderId: 8,
        text: 'Persiapan untuk operasi besok sudah selesai?',
        timestamp: new Date(Date.now() - 7100000).toISOString(),
        readBy: [8, 9]
      },
      {
        id: 2009,
        chatId: 1003,
        senderId: 9,
        text: 'Siap Pak, semua equipment sudah disiapkan',
        timestamp: new Date(Date.now() - 7000000).toISOString(),
        readBy: [8, 9]
      }
    ];
    
    // Save messages
    localStorage.setItem('all_messages', JSON.stringify(defaultMessages));
    
    console.log('Chat data initialized');
  };

  // Load user's chats
  const loadChats = () => {
    if (!user) return;
    
    try {
      const allChats = JSON.parse(localStorage.getItem('all_chats') || '[]');
      const allMessages = JSON.parse(localStorage.getItem('all_messages') || '[]');
      
      // Filter chats for this user
      const userChats = allChats.filter((chat: any) => {
        if (chat.isGroup) {
          return chat.participants && chat.participants.includes(user.id);
        } else {
          return chat.user1Id === user.id || chat.user2Id === user.id;
        }
      });
      
      // Add additional info to each chat
      const processedChats = userChats.map((chat: any) => {
        // Find all messages for this chat
        const chatMessages = allMessages.filter((msg: any) => msg.chatId === chat.id);
        
        // Sort messages by timestamp
        chatMessages.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        // Get last message
        const lastMessage = chatMessages.length > 0 ? chatMessages[0] : null;
        
        // Count unread messages
        const unread = chatMessages.filter((msg: any) => 
          msg.senderId !== user.id && 
          (!msg.readBy || !msg.readBy.includes(user.id))
        ).length;
        
        // Determine chat name
        let chatName = chat.name;
        let otherUserId;
        
        if (!chat.isGroup) {
          otherUserId = chat.user1Id === user.id ? chat.user2Id : chat.user1Id;
          const otherUser = allUsers.find(u => u.id === otherUserId);
          if (otherUser) {
            chatName = otherUser.username;
          } else {
            chatName = `User ${otherUserId}`;
          }
        }
        
        return {
          id: chat.id,
          name: chatName,
          isGroup: chat.isGroup,
          lastMessage: lastMessage ? lastMessage.text : '',
          lastMessageTime: lastMessage ? lastMessage.timestamp : chat.createdAt,
          unread,
          otherUserId
        };
      });
      
      // Sort chats by last message time
      processedChats.sort((a: Chat, b: Chat) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
      
      setChats(processedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  // Load messages for a specific chat
  const loadMessages = (chatId: number) => {
    try {
      const allMessages = JSON.parse(localStorage.getItem('all_messages') || '[]');
      
      // Filter messages for this chat
      let chatMessages = allMessages.filter((msg: any) => msg.chatId === chatId);
      
      // Sort messages by timestamp
      chatMessages.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Add sender names
      chatMessages = chatMessages.map((msg: any) => {
        // For system messages
        if (msg.senderId === 0) {
          return {
            ...msg,
            senderName: 'System'
          };
        }
        
        // For user messages
        const users = JSON.parse(localStorage.getItem('all_users') || '[]');
        const sender = users.find((u: any) => u.id === msg.senderId);
        
        return {
          ...msg,
          senderName: sender ? sender.username : `User ${msg.senderId}`
        };
      });
      
      setMessages(chatMessages);
      
      // Mark messages as read
      if (user) {
        markChatAsRead(chatId);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Mark messages as read
  const markChatAsRead = (chatId: number) => {
    if (!user) return;
    
    try {
      const allMessages = JSON.parse(localStorage.getItem('all_messages') || '[]');
      let updated = false;
      
      // Update readBy for each message
      const updatedMessages = allMessages.map((msg: any) => {
        if (msg.chatId === chatId && msg.senderId !== user.id) {
          // If readBy doesn't exist or doesn't include current user
          if (!msg.readBy || !msg.readBy.includes(user.id)) {
            updated = true;
            return {
              ...msg,
              readBy: msg.readBy ? [...msg.readBy, user.id] : [user.id]
            };
          }
        }
        return msg;
      });
      
      // Save if any messages were updated
      if (updated) {
        localStorage.setItem('all_messages', JSON.stringify(updatedMessages));
        // Refresh the chat list to update unread counts
        loadChats();
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Open a chat
  const openChat = (chatId: number) => {
    // Find the chat
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setActiveChat(chat);
      loadMessages(chatId);
      setActiveView('chat');
      
      // Update URL
      setLocation(`/chat/${chatId}`);
    } else {
      // Try to load chats first if not found
      loadChats();
      setTimeout(() => {
        const refreshedChat = chats.find(c => c.id === chatId);
        if (refreshedChat) {
          setActiveChat(refreshedChat);
          loadMessages(chatId);
          setActiveView('chat');
        }
      }, 300);
    }
  };

  // Send a new message
  const sendMessage = () => {
    if (!activeChat || !user || !newMessage.trim()) return;
    
    try {
      const allMessages = JSON.parse(localStorage.getItem('all_messages') || '[]');
      
      // Create new message
      const newMsg = {
        id: Date.now(),
        chatId: activeChat.id,
        senderId: user.id,
        text: newMessage.trim(),
        timestamp: new Date().toISOString(),
        readBy: [user.id] // Sender has read their own message
      };
      
      // Add to messages
      allMessages.push(newMsg);
      localStorage.setItem('all_messages', JSON.stringify(allMessages));
      
      // Clear input
      setNewMessage('');
      
      // Reload messages
      loadMessages(activeChat.id);
      
      // Auto response for demo (after 1-3 seconds)
      if (!activeChat.isGroup && activeChat.otherUserId) {
        setTimeout(() => {
          createAutoResponse(activeChat.id, activeChat.otherUserId);
        }, Math.random() * 2000 + 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Create an automatic response for demo purposes
  const createAutoResponse = (chatId: number, responderId: number) => {
    try {
      const allMessages = JSON.parse(localStorage.getItem('all_messages') || '[]');
      
      // Find responder name
      const users = JSON.parse(localStorage.getItem('all_users') || '[]');
      const responder = users.find((u: any) => u.id === responderId);
      const responderName = responder ? responder.username : `User ${responderId}`;
      
      // Generate a response
      const responses = [
        'Siap, Pak.',
        'Perintah diterima.',
        'Roger that.',
        'Akan segera dilaksanakan.',
        'Copy that, standing by.',
        'Mengerti, Pak.',
        'Affirmative.',
        'Sedang diproses saat ini.'
      ];
      
      const responseText = responses[Math.floor(Math.random() * responses.length)];
      
      // Create response message
      const responseMsg = {
        id: Date.now(),
        chatId: chatId,
        senderId: responderId,
        text: responseText,
        timestamp: new Date().toISOString(),
        readBy: [responderId, user?.id] // Both have read it
      };
      
      // Add to messages
      allMessages.push(responseMsg);
      localStorage.setItem('all_messages', JSON.stringify(allMessages));
      
      // Reload messages
      loadMessages(chatId);
    } catch (error) {
      console.error('Error creating auto response:', error);
    }
  };

  // Create a new direct chat
  const createDirectChat = () => {
    if (!user || selectedUserId === null) return;
    
    try {
      // Get all chats
      const allChats = JSON.parse(localStorage.getItem('all_chats') || '[]');
      
      // Check if chat already exists
      const existingChat = allChats.find((chat: any) => 
        !chat.isGroup && 
        ((chat.user1Id === user.id && chat.user2Id === selectedUserId) ||
         (chat.user1Id === selectedUserId && chat.user2Id === user.id))
      );
      
      if (existingChat) {
        // Close dialog
        setShowNewChatDialog(false);
        setSelectedUserId(null);
        
        // Open existing chat
        openChat(existingChat.id);
        return;
      }
      
      // Create new chat
      const newChat = {
        id: Date.now(),
        name: '',
        isGroup: false,
        user1Id: user.id,
        user2Id: selectedUserId,
        createdAt: new Date().toISOString()
      };
      
      // Add to chats
      allChats.push(newChat);
      localStorage.setItem('all_chats', JSON.stringify(allChats));
      
      // Create initial system message
      const allMessages = JSON.parse(localStorage.getItem('all_messages') || '[]');
      allMessages.push({
        id: Date.now(),
        chatId: newChat.id,
        senderId: 0,
        text: 'Secure communication established',
        timestamp: new Date().toISOString(),
        readBy: [user.id, selectedUserId]
      });
      localStorage.setItem('all_messages', JSON.stringify(allMessages));
      
      // Close dialog
      setShowNewChatDialog(false);
      setSelectedUserId(null);
      
      // Refresh chats and open new chat
      loadChats();
      setTimeout(() => openChat(newChat.id), 300);
    } catch (error) {
      console.error('Error creating direct chat:', error);
    }
  };

  // Format time for display in messages
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };

  // Format date for chat list
  const formatDate = (timestamp: string) => {
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

  // Filter chats by search query
  const filteredChats = searchQuery 
    ? chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats;

  // Go back to chat list
  const handleBackToList = () => {
    setActiveChat(null);
    setActiveView('list');
    setLocation('/comms');
  };

  // Render Chat List View
  if (activeView === 'list') {
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
            <Plus size={20} />
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="p-2 bg-[#2a2b25]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#969692]" />
            <Input
              placeholder="Cari obrolan atau kontak..."
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
                  onClick={() => openChat(chat.id)}
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
                  
                  {/* Action Menu */}
                  <div className="ml-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#969692] hover:bg-[#3d3f35] hover:text-white"
                    >
                      <MoreVertical size={16} />
                    </Button>
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
                      <p className="font-medium">{otherUser.username}</p>
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
                onClick={createDirectChat}
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
                      {msg.senderName}
                    </div>
                  )}
                  
                  <div className="text-sm break-words">{msg.text}</div>
                  <div className="flex justify-end items-center mt-1">
                    <span className="text-xs opacity-70">
                      {formatTime(msg.timestamp)}
                    </span>
                    {isMe && (
                      <span className="text-xs ml-1">
                        {msg.isRead || (msg.readBy && msg.readBy.length > 1)
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
        <Input
          type="text"
          placeholder="Ketik pesan..."
          className="flex-1 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]"
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
      
      {/* Main Menu */}
      <MainMenu activeTab="comms" />
    </div>
  );
};

export default SimpleChat;
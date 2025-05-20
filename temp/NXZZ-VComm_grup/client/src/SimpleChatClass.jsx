import React from 'react';
import { ArrowLeft, MessageSquare, User, Users, Phone, PlusCircle, Send, Search } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from './components/ui/dialog';

// Prefix untuk localStorage
const LS_PREFIX = 'milcomm_';

// Kunci-kunci untuk localStorage
const USERS_KEY = `${LS_PREFIX}users`;
const CHATS_KEY = `${LS_PREFIX}chats`;
const MESSAGES_KEY = `${LS_PREFIX}messages`;

/**
 * Implementasi chat sederhana menggunakan React Class Component
 */
class SimpleChatClass extends React.Component {
  constructor(props) {
    super(props);
    
    // State awal
    this.state = {
      view: 'list', // 'list' or 'chat'
      activeChat: null,
      chatList: [],
      messages: [],
      newMessage: '',
      currentUser: null,
      searchQuery: '',
      showNewChatDialog: false,
      availableUsers: [],
      selectedUser: null,
      loading: true
    };
    
    // Refs
    this.messagesEndRef = React.createRef();
    
    // Bind methods
    this.handleBack = this.handleBack.bind(this);
    this.handleOpenChat = this.handleOpenChat.bind(this);
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.handleCreateDirectChat = this.handleCreateDirectChat.bind(this);
    this.loadChatList = this.loadChatList.bind(this);
    this.loadMessages = this.loadMessages.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }
  
  // Lifecycle methods
  componentDidMount() {
    console.log('SimpleChatClass: Initializing...');
    document.title = "Military Chat - COMMS";
    
    // Inisialisasi pengguna
    this.initializeUser();
    
    // Inisialisasi data chat
    this.initializeChatData();
    
    // Set up refresh interval
    this.refreshTimer = setInterval(() => {
      if (this.state.view === 'list') {
        this.loadChatList();
      } else if (this.state.view === 'chat' && this.state.activeChat) {
        this.loadMessages(this.state.activeChat.id);
      }
    }, 5000);
    
    // Check URL for chatId
    const match = window.location.pathname.match(/\/chat\/(\d+)/);
    if (match && match[1]) {
      const chatId = parseInt(match[1]);
      console.log('SimpleChatClass: Opening chat from URL:', chatId);
      
      // First load the chat list, then open the chat
      this.loadChatList(() => {
        this.handleOpenChat(chatId);
      });
    } else {
      // Just load the chat list
      this.loadChatList();
    }
  }
  
  componentDidUpdate(prevProps, prevState) {
    // Scroll to bottom when messages change
    if (this.messagesEndRef.current && prevState.messages !== this.state.messages) {
      this.messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Check if we need to reload messages when active chat changes
    if (prevState.activeChat !== this.state.activeChat && this.state.activeChat) {
      this.loadMessages(this.state.activeChat.id);
    }
  }
  
  componentWillUnmount() {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }
  
  // Initialize current user
  initializeUser() {
    // Default user for demo
    const defaultUser = {
      id: 9,
      username: 'Aji',
      nrp: '1003',
      pangkat: 'Major',
      kesatuan: 'Communications'
    };
    
    // Try to get user from authCredentials
    try {
      const authData = localStorage.getItem('authCredentials');
      if (authData) {
        const user = JSON.parse(authData);
        if (user && user.id) {
          console.log('SimpleChatClass: Using logged in user:', user);
          this.setState({ currentUser: user, loading: false });
        } else {
          console.log('SimpleChatClass: Using default user (Aji)');
          this.setState({ currentUser: defaultUser, loading: false });
        }
      } else {
        console.log('SimpleChatClass: No user found, using default');
        this.setState({ currentUser: defaultUser, loading: false });
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      this.setState({ currentUser: defaultUser, loading: false });
    }
  }
  
  // Initialize chat data
  initializeChatData() {
    console.log("Initializing chat data");
    
    // Buat data pengguna jika belum ada
    if (!localStorage.getItem(USERS_KEY)) {
      const defaultUsers = [
        { id: 7, username: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces' },
        { id: 8, username: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces' },
        { id: 9, username: 'Aji', pangkat: 'Major', kesatuan: 'Communications' }
      ];
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    }
    
    // Buat data chat jika belum ada
    if (!localStorage.getItem(CHATS_KEY)) {
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
          createdAt: new Date(Date.now() - 3600000).toISOString() // 1 jam yang lalu
        },
        {
          id: 1003,
          type: 'direct',
          user1Id: 8, // David
          user2Id: 9, // Aji
          createdAt: new Date(Date.now() - 7200000).toISOString() // 2 jam yang lalu
        }
      ];
      localStorage.setItem(CHATS_KEY, JSON.stringify(defaultChats));
    }
    
    // Buat data pesan jika belum ada
    if (!localStorage.getItem(MESSAGES_KEY)) {
      const defaultMessages = [
        // Pesan grup
        {
          id: 2001,
          chatId: 1001,
          senderId: 0, // Sistem
          sender: 'System',
          content: 'Group chat created',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 hari yang lalu
          isRead: true
        },
        {
          id: 2002,
          chatId: 1001,
          senderId: 7, // Eko
          sender: 'Eko',
          content: 'Mission briefing tomorrow at 0800',
          timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 jam yang lalu
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
        
        // Chat Eko-Aji
        {
          id: 2004,
          chatId: 1002,
          senderId: 0, // Sistem
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
        
        // Chat David-Aji
        {
          id: 2007,
          chatId: 1003,
          senderId: 0, // Sistem
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
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(defaultMessages));
    }
    
    console.log("Chat data initialized");
    
    // Load available users
    this.loadAvailableUsers();
  }
  
  // Get user by ID
  getUserById(userId) {
    try {
      const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return allUsers.find(u => u.id === userId);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }
  
  // Load chat list
  loadChatList(callback) {
    const { currentUser } = this.state;
    if (!currentUser) return;
    
    try {
      // Get all chats
      const chats = JSON.parse(localStorage.getItem(CHATS_KEY) || '[]');
      console.log("All chats:", chats);
      
      // Filter chats for current user
      const userChats = chats.filter(chat => {
        if (chat.type === 'group') {
          return chat.participants && chat.participants.includes(currentUser.id);
        } else {
          return chat.user1Id === currentUser.id || chat.user2Id === currentUser.id;
        }
      });
      console.log("User chats:", userChats);
      
      // Get all messages
      const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
      
      // Process each chat
      const processedChats = userChats.map(chat => {
        let displayName = chat.name || '';
        let otherUserId = null;
        
        if (chat.type === 'direct') {
          // For direct chats, get the other user's info
          otherUserId = chat.user1Id === currentUser.id ? chat.user2Id : chat.user1Id;
          const otherUser = this.getUserById(otherUserId);
          
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
          !msg.isRead && msg.senderId !== currentUser.id
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
      
      console.log("Processed chats:", processedChats);
      
      this.setState({ chatList: processedChats }, () => {
        if (callback) callback();
      });
    } catch (error) {
      console.error('Error loading chat list:', error);
    }
  }
  
  // Load available users
  loadAvailableUsers() {
    const { currentUser } = this.state;
    if (!currentUser) return;
    
    try {
      const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      // Filter out current user
      const filteredUsers = allUsers.filter(u => u.id !== currentUser.id);
      this.setState({ availableUsers: filteredUsers });
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  }
  
  // Load messages for a chat
  loadMessages(chatId) {
    const { currentUser } = this.state;
    if (!chatId) return;
    
    try {
      const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
      
      // Filter for this chat
      const chatMessages = allMessages.filter(msg => msg.chatId === chatId);
      
      // Sort by timestamp (oldest first)
      chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      this.setState({ messages: chatMessages });
      
      // Mark messages as read
      this.markMessagesAsRead(chatId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }
  
  // Mark messages as read
  markMessagesAsRead(chatId) {
    const { currentUser } = this.state;
    if (!currentUser) return;
    
    try {
      const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
      let updated = false;
      
      // Mark messages from others as read
      const updatedMessages = allMessages.map(msg => {
        if (msg.chatId === chatId && msg.senderId !== currentUser.id && !msg.isRead) {
          updated = true;
          return { ...msg, isRead: true };
        }
        return msg;
      });
      
      // Save if updated
      if (updated) {
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(updatedMessages));
        // Refresh chat list to update unread counts
        this.loadChatList();
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }
  
  // Open a chat
  handleOpenChat(chatId) {
    const { chatList } = this.state;
    const chat = chatList.find(c => c.id === chatId);
    
    if (chat) {
      console.log('SimpleChatClass: Opening chat:', chat);
      this.setState({ 
        activeChat: chat, 
        view: 'chat' 
      });
      
      // Update URL for deep linking
      window.history.pushState({}, '', `/chat/${chatId}`);
    } else {
      console.log('SimpleChatClass: Chat not found:', chatId);
    }
  }
  
  // Go back to chat list
  handleBack() {
    this.setState({ 
      activeChat: null, 
      view: 'list',
      messages: []
    });
    
    // Update URL
    window.history.pushState({}, '', '/comms');
  }
  
  // Create new direct chat
  handleCreateDirectChat() {
    const { selectedUser, currentUser } = this.state;
    if (!selectedUser || !currentUser) return;
    
    try {
      // Check if chat exists
      const allChats = JSON.parse(localStorage.getItem(CHATS_KEY) || '[]');
      
      const existingChat = allChats.find(chat => 
        chat.type === 'direct' && 
        ((chat.user1Id === currentUser.id && chat.user2Id === selectedUser.id) ||
         (chat.user1Id === selectedUser.id && chat.user2Id === currentUser.id))
      );
      
      if (existingChat) {
        // Just open existing chat
        this.setState({ 
          showNewChatDialog: false,
          selectedUser: null
        }, () => {
          this.handleOpenChat(existingChat.id);
        });
        return;
      }
      
      // Create new chat
      const newChatId = Date.now();
      const newChat = {
        id: newChatId,
        type: 'direct',
        user1Id: currentUser.id,
        user2Id: selectedUser.id,
        createdAt: new Date().toISOString()
      };
      
      // Save chat
      allChats.push(newChat);
      localStorage.setItem(CHATS_KEY, JSON.stringify(allChats));
      
      // Create initial system message
      const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
      
      allMessages.push({
        id: Date.now(),
        chatId: newChatId,
        senderId: 0, // System
        sender: 'System',
        content: 'Secure communication established',
        timestamp: new Date().toISOString(),
        isRead: true
      });
      
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages));
      
      // Close dialog
      this.setState({ 
        showNewChatDialog: false,
        selectedUser: null
      }, () => {
        // Refresh and open new chat
        this.loadChatList(() => {
          this.handleOpenChat(newChatId);
        });
      });
    } catch (error) {
      console.error('Error creating direct chat:', error);
    }
  }
  
  // Send a message
  handleSendMessage() {
    const { activeChat, currentUser, newMessage } = this.state;
    if (!activeChat || !currentUser || !newMessage.trim()) return;
    
    try {
      const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
      
      // Create new message
      const newMsg = {
        id: Date.now(),
        chatId: activeChat.id,
        senderId: currentUser.id,
        sender: currentUser.username,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        isRead: false
      };
      
      // Add to messages
      allMessages.push(newMsg);
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages));
      
      // Clear input
      this.setState({ newMessage: '' });
      
      // Refresh messages
      this.loadMessages(activeChat.id);
      
      // Create auto-response
      if (activeChat.type === 'direct' && activeChat.otherUserId) {
        setTimeout(() => {
          this.createAutoResponse(activeChat.id, activeChat.otherUserId);
        }, Math.random() * 2000 + 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
  
  // Create auto-response for demo
  createAutoResponse(chatId, responderId) {
    try {
      const responder = this.getUserById(responderId);
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
      
      const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
      
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
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages));
      
      // Refresh messages
      this.loadMessages(chatId);
    } catch (error) {
      console.error('Error creating auto response:', error);
    }
  }
  
  // Format time for chat list
  formatChatTime(timestamp) {
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
  }
  
  // Format time for messages
  formatMessageTime(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  }
  
  // Handle key presses in message input
  handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
    }
  }
  
  render() {
    const { 
      view, 
      activeChat, 
      chatList, 
      messages, 
      newMessage,
      currentUser, 
      searchQuery,
      showNewChatDialog,
      availableUsers,
      selectedUser,
      loading
    } = this.state;
    
    // Filter chats by search
    const filteredChats = searchQuery.trim() 
      ? chatList.filter(chat => 
          (chat.displayName && chat.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : chatList;
    
    // If still loading, show loading screen
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#1f201c] p-5">
          <div className="text-[#bdc1c0] text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-[#566c57]" />
            <h2 className="text-xl font-bold mb-3">Military Secure Communication</h2>
            <p className="mb-4">Loading communication system...</p>
          </div>
        </div>
      );
    }
    
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
              onClick={() => this.setState({ showNewChatDialog: true })}
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
                onChange={(e) => this.setState({ searchQuery: e.target.value })}
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
                    onClick={() => this.handleOpenChat(chat.id)}
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
                          {this.formatChatTime(chat.lastMessageTime)}
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
          <Dialog open={showNewChatDialog} onOpenChange={(open) => this.setState({ showNewChatDialog: open })}>
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
                      onClick={() => this.setState({ selectedUser: u })}
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
                  onClick={() => this.setState({ showNewChatDialog: false, selectedUser: null })}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#354c36] hover:bg-[#455c46] text-white"
                  disabled={!selectedUser}
                  onClick={this.handleCreateDirectChat}
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
    
    // Render chat view
    return (
      <div className="flex flex-col h-screen bg-[#1f201c]">
        {/* Header */}
        <div className="bg-[#2a2b25] px-4 py-3 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 text-[#bdc1c0] hover:text-white hover:bg-[#3d3f35]"
            onClick={this.handleBack}
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
              const isMe = msg.senderId === currentUser?.id;
              
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
                        {this.formatMessageTime(msg.timestamp)}
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
          <div ref={this.messagesEndRef} />
        </div>
        
        {/* Input area */}
        <div className="p-3 bg-[#2a2b25] flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            className="flex-1 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]"
            value={newMessage}
            onChange={(e) => this.setState({ newMessage: e.target.value })}
            onKeyDown={this.handleKeyPress}
          />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-[#969692]"
            onClick={this.handleSendMessage}
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
}

export default SimpleChatClass;
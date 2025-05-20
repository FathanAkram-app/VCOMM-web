import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquare, User, Users, Phone, PlusCircle, Send, Search } from 'lucide-react';
import { useLocation } from 'wouter';
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

// Import SimplifiedChat functions
import * as ChatUtils from './SimplifiedChat';

export default function BasicChatUI() {
  // State for chat view
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [activeChat, setActiveChat] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Refs
  const messagesEndRef = useRef(null);
  const chatListRef = useRef(null);
  const refreshTimerRef = useRef(null);
  
  // Location for routing
  const [location, setLocation] = useLocation();
  
  // Initialize data on mount
  useEffect(() => {
    document.title = "Military Chat - COMMS";
    console.log('BasicChatUI: Initializing...');
    
    // Initialize default user if not already set
    const defaultUser = {
      id: 9,
      username: 'Aji',
      nrp: '1003',
      pangkat: 'Major',
      kesatuan: 'Communications'
    };
    
    // Try to get user from storage
    try {
      const authData = localStorage.getItem('authCredentials');
      if (authData) {
        const user = JSON.parse(authData);
        if (user && user.id) {
          console.log('BasicChatUI: Using logged in user:', user);
          setCurrentUser(user);
        } else {
          console.log('BasicChatUI: Using default user (Aji)');
          setCurrentUser(defaultUser);
        }
      } else {
        console.log('BasicChatUI: No user found, using default');
        setCurrentUser(defaultUser);
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      setCurrentUser(defaultUser);
    }
    
    // Initialize chat data
    ChatUtils.initializeChatData();
    
    return () => {
      console.log('BasicChatUI: Cleaning up...');
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);
  
  // Load chat list when user changes
  useEffect(() => {
    if (currentUser) {
      console.log('BasicChatUI: User set, loading data for user:', currentUser.id);
      loadChatList();
      loadAvailableUsers();
      
      // Set up refresh timer
      refreshTimerRef.current = setInterval(() => {
        if (view === 'list') {
          loadChatList();
        } else if (view === 'chat' && activeChat) {
          loadMessages(activeChat.id);
        }
      }, 5000);
      
      // Check URL for chatId parameter
      const match = location.match(/\/chat\/(\d+)/);
      if (match && match[1]) {
        const chatId = parseInt(match[1]);
        console.log('BasicChatUI: Opening chat from URL:', chatId);
        handleOpenChat(chatId);
      }
    }
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [currentUser, location]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Load chat list
  const loadChatList = () => {
    if (!currentUser) return;
    
    console.log('BasicChatUI: Loading chat list for user:', currentUser.id);
    const chats = ChatUtils.getChatList(currentUser.id);
    setChatList(chats);
  };
  
  // Load available users
  const loadAvailableUsers = () => {
    if (!currentUser) return;
    
    const users = ChatUtils.getAllUsers(currentUser.id);
    setAvailableUsers(users);
  };
  
  // Load messages
  const loadMessages = (chatId) => {
    if (!chatId) return;
    
    console.log('BasicChatUI: Loading messages for chat:', chatId);
    const msgs = ChatUtils.getChatMessages(chatId);
    setMessages(msgs);
    
    // Mark messages as read
    if (currentUser) {
      ChatUtils.markMessagesAsRead(chatId, currentUser.id);
    }
  };
  
  // Open a chat
  const handleOpenChat = (chatId) => {
    const chat = chatList.find(c => c.id === chatId);
    
    if (chat) {
      console.log('BasicChatUI: Opening chat:', chat);
      setActiveChat(chat);
      setView('chat');
      loadMessages(chatId);
      setLocation(`/chat/${chatId}`);
    } else {
      console.log('BasicChatUI: Chat not found:', chatId);
      
      // Try to get chat directly from storage
      const fullChat = ChatUtils.getChatById(chatId);
      if (fullChat) {
        // Process chat for display
        let displayName = fullChat.name || '';
        let otherUserId = null;
        
        if (fullChat.type === 'direct' && currentUser) {
          otherUserId = fullChat.user1Id === currentUser.id ? fullChat.user2Id : fullChat.user1Id;
          const otherUser = ChatUtils.getUserById(otherUserId);
          displayName = otherUser ? otherUser.username : `User ${otherUserId}`;
        }
        
        const processedChat = {
          ...fullChat,
          displayName,
          otherUserId
        };
        
        setActiveChat(processedChat);
        setView('chat');
        loadMessages(chatId);
      }
    }
  };
  
  // Go back to chat list
  const handleBack = () => {
    setActiveChat(null);
    setView('list');
    setLocation('/comms');
  };
  
  // Send a message
  const handleSendMessage = () => {
    if (!activeChat || !currentUser || !newMessage.trim()) return;
    
    console.log('BasicChatUI: Sending message to chat:', activeChat.id);
    
    // Send message
    const sentMsg = ChatUtils.sendMessage(
      activeChat.id,
      currentUser.id,
      currentUser.username,
      newMessage
    );
    
    // Clear input
    setNewMessage('');
    
    // Reload messages
    if (sentMsg) {
      loadMessages(activeChat.id);
      
      // Create auto-response for demo
      if (activeChat.type === 'direct' && activeChat.otherUserId) {
        setTimeout(() => {
          ChatUtils.createAutoResponse(activeChat.id, activeChat.otherUserId);
          loadMessages(activeChat.id);
        }, Math.random() * 2000 + 1000);
      }
    }
  };
  
  // Create new direct chat
  const handleCreateDirectChat = () => {
    if (!selectedUser || !currentUser) return;
    
    console.log('BasicChatUI: Creating chat with user:', selectedUser.id);
    
    const newChat = ChatUtils.createDirectChat(
      currentUser.id,
      selectedUser.id
    );
    
    // Close dialog
    setShowNewChatDialog(false);
    setSelectedUser(null);
    
    // Refresh and open new chat
    if (newChat) {
      loadChatList();
      setTimeout(() => handleOpenChat(newChat.id), 100);
    }
  };
  
  // Filter chats by search
  const filteredChats = searchQuery.trim() 
    ? chatList.filter(chat => 
        (chat.displayName && chat.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chatList;
  
  // Handle key presses
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // If the user is not loaded yet, show loading
  if (!currentUser) {
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
      <div className="flex flex-col h-screen bg-[#1f201c]" ref={chatListRef}>
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
              <div className="divide-y divide-[#3d3f35]/40 mt-4 min-w-full">
                {/* Special Forces Team Chat */}
                <div className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]" onClick={() => handleOpenChat(1001)}>
                  <div className="relative mr-3">
                    <Avatar className="h-12 w-12 bg-[#566c57]">
                      <AvatarFallback className="text-white font-medium">SF</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 bg-[#8b9c8c] rounded-full h-5 w-5 flex items-center justify-center text-xs text-white">
                      <Users className="h-3 w-3" />
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
                <div className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]" onClick={() => handleOpenChat(1002)}>
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
                <div className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]" onClick={() => handleOpenChat(1003)}>
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
                        {ChatUtils.formatChatTime(chat.lastMessageTime)}
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
  
  // Render chat view
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
                      {ChatUtils.formatMessageTime(msg.timestamp)}
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
          onKeyDown={handleKeyPress}
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
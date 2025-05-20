import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, PlusCircle, Users, User, PhoneIcon } from 'lucide-react';
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
import { Badge } from '../components/ui/badge';

export default function ChatList({ onSelectChat, currentUser }) {
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  
  // Load chats on mount and every 3 seconds
  useEffect(() => {
    if (!currentUser) return;
    
    loadChats();
    loadUsers();
    
    const interval = setInterval(loadChats, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);
  
  // Load all chats involving current user
  const loadChats = () => {
    try {
      // Get all chats
      const chatsStr = localStorage.getItem('mcomm_chats');
      if (!chatsStr) return;
      
      const allChats = JSON.parse(chatsStr);
      
      // Filter for current user
      const userChats = allChats.filter(chat => {
        if (chat.type === 'group') {
          return chat.participants && chat.participants.includes(currentUser.id);
        } else {
          return chat.user1Id === currentUser.id || chat.user2Id === currentUser.id;
        }
      });
      
      // Get messages for unread count and last message
      const messagesStr = localStorage.getItem('mcomm_messages');
      const allMessages = messagesStr ? JSON.parse(messagesStr) : [];
      
      // Process chats
      const processedChats = userChats.map(chat => {
        // Get chat name
        let displayName = chat.name || '';
        let otherUserId = null;
        
        if (chat.type === 'direct') {
          otherUserId = chat.user1Id === currentUser.id ? chat.user2Id : chat.user1Id;
          const otherUser = getUserById(otherUserId);
          if (otherUser) {
            displayName = otherUser.username;
          } else {
            displayName = `User ${otherUserId}`;
          }
        }
        
        // Filter messages for this chat
        const chatMessages = allMessages.filter(msg => msg.chatId === chat.id);
        
        // Sort by timestamp
        chatMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Get last message
        const lastMessage = chatMessages.length > 0 ? chatMessages[0] : null;
        
        // Count unread
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
      
      // Sort by last message time
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
  
  // Load users
  const loadUsers = () => {
    try {
      const usersStr = localStorage.getItem('mcomm_users');
      if (!usersStr) return;
      
      const users = JSON.parse(usersStr);
      // Filter out current user
      setAllUsers(users.filter(u => u.id !== currentUser.id));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };
  
  // Get user by ID
  const getUserById = (userId) => {
    try {
      const usersStr = localStorage.getItem('mcomm_users');
      if (!usersStr) return null;
      
      const users = JSON.parse(usersStr);
      return users.find(u => u.id === userId);
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  };
  
  // Create a new direct chat
  const createDirectChat = () => {
    if (!selectedUser || !currentUser) return;
    
    try {
      // Check if chat already exists
      const chatsStr = localStorage.getItem('mcomm_chats');
      const allChats = chatsStr ? JSON.parse(chatsStr) : [];
      
      const existingChat = allChats.find(chat => 
        chat.type === 'direct' && 
        ((chat.user1Id === currentUser.id && chat.user2Id === selectedUser.id) ||
         (chat.user1Id === selectedUser.id && chat.user2Id === currentUser.id))
      );
      
      if (existingChat) {
        // Open existing chat
        setShowNewChatDialog(false);
        setSelectedUser(null);
        onSelectChat(existingChat.id);
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
      
      // Save to localStorage
      allChats.push(newChat);
      localStorage.setItem('mcomm_chats', JSON.stringify(allChats));
      
      // Create initial system message
      const messagesStr = localStorage.getItem('mcomm_messages');
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
      
      localStorage.setItem('mcomm_messages', JSON.stringify(allMessages));
      
      // Close dialog
      setShowNewChatDialog(false);
      setSelectedUser(null);
      
      // Refresh and open new chat
      loadChats();
      setTimeout(() => onSelectChat(newChatId), 100);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };
  
  // Format time for display
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
  
  // Filter chats by search
  const filteredChats = searchQuery.trim() 
    ? chats.filter(chat => 
        chat.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats;
  
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
                onClick={() => onSelectChat(chat.id)}
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
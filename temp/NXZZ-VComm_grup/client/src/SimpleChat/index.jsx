import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/use-auth';
import ChatList from './ChatList';
import ChatRoom from './ChatRoom';

// Simple chat app component with two main views: list and chat
export default function SimpleChat() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [activeChat, setActiveChat] = useState(null);
  const [needsInit, setNeedsInit] = useState(true);
  
  // Initialize data on first load
  useEffect(() => {
    if (user && needsInit) {
      initializeData();
      setNeedsInit(false);
      
      // Check URL for chat ID
      const chatMatch = location.match(/\/chat\/(\d+)/);
      if (chatMatch && chatMatch[1]) {
        const chatId = parseInt(chatMatch[1]);
        openChat(chatId);
      }
    }
  }, [user, location, needsInit]);
  
  // Initialize demo data
  const initializeData = () => {
    // Default users
    if (!localStorage.getItem('mcomm_users')) {
      const defaultUsers = [
        { id: 7, username: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces' },
        { id: 8, username: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces' },
        { id: 9, username: 'Aji', pangkat: 'Major', kesatuan: 'Communications' }
      ];
      localStorage.setItem('mcomm_users', JSON.stringify(defaultUsers));
    }
    
    // Default chats
    if (!localStorage.getItem('mcomm_chats')) {
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
      localStorage.setItem('mcomm_chats', JSON.stringify(defaultChats));
    }
    
    // Default messages
    if (!localStorage.getItem('mcomm_messages')) {
      const defaultMessages = [
        // Group messages
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
        
        // Eko-Aji messages
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
        
        // David-Aji messages
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
      localStorage.setItem('mcomm_messages', JSON.stringify(defaultMessages));
    }
  };
  
  // Open a chat
  const openChat = (chatId) => {
    const chatsStr = localStorage.getItem('mcomm_chats');
    if (!chatsStr) return;
    
    try {
      const allChats = JSON.parse(chatsStr);
      const chat = allChats.find(c => c.id === chatId);
      
      if (chat) {
        // Get other user's name for direct chats
        if (chat.type === 'direct') {
          const otherUserId = chat.user1Id === user.id ? chat.user2Id : chat.user1Id;
          const usersStr = localStorage.getItem('mcomm_users');
          if (usersStr) {
            const users = JSON.parse(usersStr);
            const otherUser = users.find(u => u.id === otherUserId);
            if (otherUser) {
              chat.displayName = otherUser.username;
              chat.otherUserId = otherUserId;
            }
          }
        } else {
          chat.displayName = chat.name;
        }
        
        setActiveChat(chat);
        setView('chat');
        
        // Update URL
        setLocation(`/chat/${chatId}`);
        
        // Mark messages as read
        markMessagesAsRead(chatId);
      }
    } catch (error) {
      console.error('Error opening chat:', error);
    }
  };
  
  // Mark messages as read
  const markMessagesAsRead = (chatId) => {
    if (!user) return;
    
    try {
      const messagesStr = localStorage.getItem('mcomm_messages');
      if (!messagesStr) return;
      
      const allMessages = JSON.parse(messagesStr);
      let updated = false;
      
      // Update read status
      const updatedMessages = allMessages.map(msg => {
        if (msg.chatId === chatId && msg.senderId !== user.id && !msg.isRead) {
          updated = true;
          return { ...msg, isRead: true };
        }
        return msg;
      });
      
      // Save if changed
      if (updated) {
        localStorage.setItem('mcomm_messages', JSON.stringify(updatedMessages));
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  // Back to chat list
  const handleBackToList = () => {
    setActiveChat(null);
    setView('list');
    setLocation('/comms');
  };
  
  // Choose which view to show
  if (view === 'chat' && activeChat) {
    return (
      <ChatRoom 
        chat={activeChat} 
        onBack={handleBackToList} 
        currentUser={user}
      />
    );
  } else {
    return (
      <ChatList 
        onSelectChat={openChat} 
        currentUser={user}
      />
    );
  }
}
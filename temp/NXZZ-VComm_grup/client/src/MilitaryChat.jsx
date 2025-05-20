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

// Prefiks untuk localStorage
const LS_PREFIX = 'mil_comm_';

/**
 * MilitaryChat - Aplikasi chat untuk komunikasi militer yang aman
 */
export default function MilitaryChat() {
  // State untuk pengguna saat ini
  const [currentUser, setCurrentUser] = useState(null);
  
  // State untuk navigasi dan tampilan
  const [location, setLocation] = useLocation();
  const [view, setView] = useState('list'); // 'list' atau 'chat'
  
  // State untuk data chat
  const [chatList, setChatList] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // State untuk UI
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Referensi untuk auto-scroll ke pesan terbaru
  const messagesEndRef = useRef(null);
  
  // Load pengguna dari localStorage saat komponen dimuat
  useEffect(() => {
    // Memanfaatkan fixed data untuk demo
    // Gunakan data yang ada di localStorage jika tersedia
    // Atau gunakan data default untuk keperluan pengujian
    
    // Coba dapatkan data dari authCredentials
    const userData = localStorage.getItem('authCredentials');
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log("User loaded from localStorage:", user);
        
        // Pastikan user memiliki ID
        if (user && user.id) {
          setCurrentUser(user);
        } else {
          // Default ke user Aji untuk demo jika tidak ada ID
          setCurrentUser({
            id: 9,
            username: 'Aji',
            nrp: '1003',
            pangkat: 'Major',
            kesatuan: 'Communications'
          });
          console.log("Using default user (Aji) for demo");
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        // Default ke user Aji untuk demo jika parsing error
        setCurrentUser({
          id: 9,
          username: 'Aji',
          nrp: '1003',
          pangkat: 'Major',
          kesatuan: 'Communications'
        });
      }
    } else {
      // Default ke user Aji untuk demo jika tidak ada data
      console.log("No user data in localStorage, using default user");
      setCurrentUser({
        id: 9,
        username: 'Aji',
        nrp: '1003',
        pangkat: 'Major',
        kesatuan: 'Communications'
      });
    }
  }, []);
  
  // Inisialisasi data chat saat komponen dimuat
  useEffect(() => {
    if (currentUser) {
      console.log("Initializing chat data for user:", currentUser.id);
      initializeChatData();
      loadChatList();
      loadAvailableUsers();
      
      // Periksa URL untuk ID chat
      const match = location.match(/\/chat\/(\d+)/);
      if (match && match[1]) {
        const chatId = parseInt(match[1]);
        console.log("Opening chat from URL:", chatId);
        handleOpenChat(chatId);
      }
    }
  }, [currentUser, location]);
  
  // Auto-scroll ke bawah saat pesan berubah
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Refresh chat list dan pesan secara periodik
  useEffect(() => {
    if (!currentUser) return;
    
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
  }, [currentUser, view, activeChat]);
  
  // Inisialisasi data chat (pengguna, chat, pesan)
  const initializeChatData = () => {
    // Kunci localStorage
    const usersKey = `${LS_PREFIX}users`;
    const chatsKey = `${LS_PREFIX}chats`;
    const messagesKey = `${LS_PREFIX}messages`;
    
    // Buat data pengguna jika belum ada
    if (!localStorage.getItem(usersKey)) {
      const defaultUsers = [
        { id: 7, username: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces' },
        { id: 8, username: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces' },
        { id: 9, username: 'Aji', pangkat: 'Major', kesatuan: 'Communications' }
      ];
      localStorage.setItem(usersKey, JSON.stringify(defaultUsers));
    }
    
    // Buat data chat jika belum ada
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
      localStorage.setItem(chatsKey, JSON.stringify(defaultChats));
    }
    
    // Buat data pesan jika belum ada
    if (!localStorage.getItem(messagesKey)) {
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
      localStorage.setItem(messagesKey, JSON.stringify(defaultMessages));
    }
  };
  
  // Load daftar chat untuk pengguna saat ini
  const loadChatList = () => {
    if (!currentUser) return;
    
    try {
      // Ambil semua chat
      const chats = JSON.parse(localStorage.getItem(`${LS_PREFIX}chats`) || '[]');
      console.log("All chats:", chats);
      
      // Filter chat untuk pengguna saat ini
      const userChats = chats.filter(chat => {
        if (chat.type === 'group') {
          return chat.participants && chat.participants.includes(currentUser.id);
        } else {
          return chat.user1Id === currentUser.id || chat.user2Id === currentUser.id;
        }
      });
      console.log("User chats:", userChats);
      
      // Ambil semua pesan
      const allMessages = JSON.parse(localStorage.getItem(`${LS_PREFIX}messages`) || '[]');
      
      // Proses setiap chat
      const processedChats = userChats.map(chat => {
        let displayName = chat.name || '';
        let otherUserId = null;
        
        if (chat.type === 'direct') {
          // Untuk chat langsung, dapatkan info pengguna lain
          otherUserId = chat.user1Id === currentUser.id ? chat.user2Id : chat.user1Id;
          const otherUser = getUserById(otherUserId);
          
          if (otherUser) {
            displayName = otherUser.username;
          } else {
            displayName = `User ${otherUserId}`;
          }
        }
        
        // Dapatkan pesan untuk chat ini
        const chatMessages = allMessages.filter(msg => msg.chatId === chat.id);
        
        // Urutkan berdasarkan timestamp (terbaru dulu)
        chatMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Dapatkan pesan terakhir
        const lastMessage = chatMessages.length > 0 ? chatMessages[0] : null;
        
        // Hitung pesan yang belum dibaca
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
      
      // Urutkan berdasarkan pesan terbaru
      processedChats.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
      
      console.log("Processed chats:", processedChats);
      setChatList(processedChats);
    } catch (error) {
      console.error('Error loading chat list:', error);
    }
  };
  
  // Load pengguna yang tersedia untuk chat baru
  const loadAvailableUsers = () => {
    if (!currentUser) return;
    
    try {
      const allUsers = JSON.parse(localStorage.getItem(`${LS_PREFIX}users`) || '[]');
      // Filter pengguna saat ini
      const filteredUsers = allUsers.filter(u => u.id !== currentUser.id);
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  };
  
  // Dapatkan pengguna berdasarkan ID
  const getUserById = (userId) => {
    try {
      const allUsers = JSON.parse(localStorage.getItem(`${LS_PREFIX}users`) || '[]');
      return allUsers.find(u => u.id === userId);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  };
  
  // Load pesan untuk chat
  const loadMessages = (chatId) => {
    try {
      const allMessages = JSON.parse(localStorage.getItem(`${LS_PREFIX}messages`) || '[]');
      
      // Filter untuk chat ini
      const chatMessages = allMessages.filter(msg => msg.chatId === chatId);
      
      // Urutkan berdasarkan timestamp (terlama dulu)
      chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      setMessages(chatMessages);
      
      // Tandai pesan sebagai dibaca
      markMessagesAsRead(chatId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  // Tandai pesan sebagai dibaca
  const markMessagesAsRead = (chatId) => {
    if (!currentUser) return;
    
    try {
      const allMessages = JSON.parse(localStorage.getItem(`${LS_PREFIX}messages`) || '[]');
      let updated = false;
      
      // Tandai pesan dari orang lain sebagai dibaca
      const updatedMessages = allMessages.map(msg => {
        if (msg.chatId === chatId && msg.senderId !== currentUser.id && !msg.isRead) {
          updated = true;
          return { ...msg, isRead: true };
        }
        return msg;
      });
      
      // Simpan jika diperbarui
      if (updated) {
        localStorage.setItem(`${LS_PREFIX}messages`, JSON.stringify(updatedMessages));
        // Refresh daftar chat untuk memperbarui jumlah yang belum dibaca
        loadChatList();
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  // Buka chat
  const handleOpenChat = (chatId) => {
    const chat = chatList.find(c => c.id === chatId);
    
    if (chat) {
      setActiveChat(chat);
      setView('chat');
      loadMessages(chatId);
      // Update URL untuk deep linking
      setLocation(`/chat/${chatId}`);
    }
  };
  
  // Kembali ke daftar chat
  const handleBack = () => {
    setActiveChat(null);
    setView('list');
    setLocation('/comms');
  };
  
  // Buat chat langsung baru
  const handleCreateDirectChat = () => {
    if (!selectedUser || !currentUser) return;
    
    try {
      // Periksa apakah chat sudah ada
      const allChats = JSON.parse(localStorage.getItem(`${LS_PREFIX}chats`) || '[]');
      
      const existingChat = allChats.find(chat => 
        chat.type === 'direct' && 
        ((chat.user1Id === currentUser.id && chat.user2Id === selectedUser.id) ||
         (chat.user1Id === selectedUser.id && chat.user2Id === currentUser.id))
      );
      
      if (existingChat) {
        // Buka chat yang sudah ada
        setShowNewChatDialog(false);
        setSelectedUser(null);
        handleOpenChat(existingChat.id);
        return;
      }
      
      // Buat chat baru
      const newChatId = Date.now();
      const newChat = {
        id: newChatId,
        type: 'direct',
        user1Id: currentUser.id,
        user2Id: selectedUser.id,
        createdAt: new Date().toISOString()
      };
      
      // Simpan chat
      allChats.push(newChat);
      localStorage.setItem(`${LS_PREFIX}chats`, JSON.stringify(allChats));
      
      // Buat pesan sistem awal
      const allMessages = JSON.parse(localStorage.getItem(`${LS_PREFIX}messages`) || '[]');
      
      allMessages.push({
        id: Date.now(),
        chatId: newChatId,
        senderId: 0, // Sistem
        sender: 'System',
        content: 'Secure communication established',
        timestamp: new Date().toISOString(),
        isRead: true
      });
      
      localStorage.setItem(`${LS_PREFIX}messages`, JSON.stringify(allMessages));
      
      // Tutup dialog
      setShowNewChatDialog(false);
      setSelectedUser(null);
      
      // Refresh dan buka chat baru
      loadChatList();
      setTimeout(() => handleOpenChat(newChatId), 100);
    } catch (error) {
      console.error('Error creating direct chat:', error);
    }
  };
  
  // Kirim pesan
  const handleSendMessage = () => {
    if (!activeChat || !currentUser || !newMessage.trim()) return;
    
    try {
      const allMessages = JSON.parse(localStorage.getItem(`${LS_PREFIX}messages`) || '[]');
      
      // Buat pesan baru
      const newMsg = {
        id: Date.now(),
        chatId: activeChat.id,
        senderId: currentUser.id,
        sender: currentUser.username,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        isRead: false
      };
      
      // Tambahkan ke pesan
      allMessages.push(newMsg);
      localStorage.setItem(`${LS_PREFIX}messages`, JSON.stringify(allMessages));
      
      // Kosongkan input
      setNewMessage('');
      
      // Refresh pesan
      loadMessages(activeChat.id);
      
      // Buat auto-response
      if (activeChat.type === 'direct' && activeChat.otherUserId) {
        setTimeout(() => {
          createAutoResponse(activeChat.id, activeChat.otherUserId);
        }, Math.random() * 2000 + 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Buat auto-response untuk demo
  const createAutoResponse = (chatId, responderId) => {
    try {
      const responder = getUserById(responderId);
      if (!responder) return;
      
      // Opsi respons
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
      
      const allMessages = JSON.parse(localStorage.getItem(`${LS_PREFIX}messages`) || '[]');
      
      // Buat pesan respons
      const responseMsg = {
        id: Date.now(),
        chatId: chatId,
        senderId: responderId,
        sender: responder.username,
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString(),
        isRead: true // Sudah dibaca karena kita berada di chat
      };
      
      // Tambahkan ke pesan
      allMessages.push(responseMsg);
      localStorage.setItem(`${LS_PREFIX}messages`, JSON.stringify(allMessages));
      
      // Refresh pesan
      loadMessages(chatId);
    } catch (error) {
      console.error('Error creating auto response:', error);
    }
  };
  
  // Format waktu untuk daftar chat
  const formatChatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      
      // Hari ini, tampilkan waktu
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // Kemarin, tampilkan "Kemarin"
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Kemarin';
      }
      
      // Dalam satu minggu, tampilkan nama hari
      const dayDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      }
      
      // Lebih lama, tampilkan tanggal
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    } catch (error) {
      return '';
    }
  };
  
  // Format waktu untuk pesan
  const formatMessageTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };
  
  // Filter chat berdasarkan pencarian
  const filteredChats = searchQuery.trim() 
    ? chatList.filter(chat => 
        (chat.displayName && chat.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chatList;
  
  // Jika tidak ada pengguna, tampilkan pesan login
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1f201c] p-5">
        <div className="text-[#bdc1c0] text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-[#566c57]" />
          <h2 className="text-xl font-bold mb-3">Military Secure Communication</h2>
          <p className="mb-4">Silahkan login terlebih dahulu untuk mengakses komunikasi aman.</p>
          <Button 
            className="bg-[#354c36] hover:bg-[#455c46] text-white"
            onClick={() => setLocation('/')}
          >
            Login
          </Button>
        </div>
      </div>
    );
  }
  
  // Render daftar chat
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
  
  // Render ruang chat
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
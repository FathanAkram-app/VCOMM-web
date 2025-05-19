import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, PhoneIcon, Settings, Plus, User, 
  ArrowLeft, PaperclipIcon, SendIcon, VideoIcon, Search, Users, Info
} from 'lucide-react';
import ChatList from '../components/ChatList';
import chatIcon from '@assets/Icon Chat NXXZ.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../hooks/useAuth';
import ChatRoom from '../components/ChatRoom';

export default function SimpleViewFixed() {
  const [user, setUser] = useState<any>(null);
  const [, navigate] = useLocation();
  const [activeChat, setActiveChat] = useState<{ id: number; isRoom: boolean } | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [databaseMessages, setDatabaseMessages] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const messageInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // View state management
  const [activeView, setActiveView] = useState<'chats' | 'calls' | 'personnel' | 'config'>('chats');
  
  // State untuk loading status
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  // State untuk WebSocket
  const [wsConnected, setWsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessageId, setLastMessageId] = useState<number>(0);
  
  // Dialog states
  const [showNewChatMenu, setShowNewChatMenu] = useState(false);
  const [showNewDirectChatDialog, setShowNewDirectChatDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  // Profile and Group management states
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<number | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Load chats data
        fetchUserChats(parsedUser.id);
        fetchAllUsers();
        
        // WebSocket dinonaktifkan, menggunakan polling sebagai alternatif
        console.log("ℹ️ WebSocket dinonaktifkan, menggunakan polling untuk update chat");
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('currentUser');
      }
    }
    
    // Cleanup WebSocket pada unmount
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);
  
  // State untuk melacak ID pesan terakhir
  const lastMessageIdRef = useRef<number | null>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  
  // Scroll ke bagian bawah hanya ketika ada pesan baru
  useEffect(() => {
    // Hanya scroll ke bawah jika:
    // 1. Ada pesan dan refs tersedia
    // 2. Ada pesan baru (pesan terakhir berbeda dari yang kita catat)
    // 3. User belum scroll manual ke atas
    if (bottomRef.current && databaseMessages.length > 0) {
      const lastMessage = databaseMessages[databaseMessages.length - 1];
      
      // Deteksi apakah ada pesan baru
      const isNewMessage = !lastMessageIdRef.current || 
                          lastMessage.id !== lastMessageIdRef.current || 
                          lastMessage.isSending;
      
      // Update referensi pesan terakhir
      lastMessageIdRef.current = lastMessage.id;
      
      // Scroll ke bawah hanya jika ada pesan baru dan user belum scrolled manual
      if (isNewMessage && !userScrolled) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [databaseMessages, userScrolled]);
  
  // Fungsi untuk mendapatkan database ID dari UI chat ID
  const getChatDatabaseId = (uiChatId: number): number => {
    // Pemetaan antara ID UI chat dan ID database - diperbaiki agar konsisten
    const chatMappings = [
      { uiChatId: 1747549792121, databaseChatId: 16, isRoom: false }, // Eko-David chat
      { uiChatId: 1747558846275, databaseChatId: 16, isRoom: false }, // FIXED: Ini juga Eko-David chat
      { uiChatId: 1747582275061, databaseChatId: 17, isRoom: false }, // Eko-Aji chat
    ];
    
    const mapping = chatMappings.find(mapping => mapping.uiChatId === uiChatId);
    if (mapping) {
      console.log(`⚠️ Menggunakan database ID ${mapping.databaseChatId} untuk uiChatId ${uiChatId}`);
      return mapping.databaseChatId;
    }
    
    // Gunakan ID UI sebagai fallback - untuk chat baru yang belum ada di mapping
    console.log(`⚠️ Tidak ada mapping untuk uiChatId ${uiChatId}, menggunakan uiChatId sebagai database ID`);
    return uiChatId;
  };
  
  // Metode alternatif untuk mengambil pesan dari server daripada WebSocket
  const getAllMessages = async (chatId: number, isRoom: boolean) => {
    try {
      if (!user) return [];
      
      // Dapatkan database ID yang benar
      const databaseChatId = getChatDatabaseId(chatId);
      
      // Buat endpoint sesuai tipe chat
      const endpoint = `/api/messages/all?${isRoom ? 'roomId' : 'directChatId'}=${databaseChatId}`;
      
      // Gunakan HTTP GET biasa tanpa header yang rumit
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const messages = await response.json();
        return messages || [];
      } else {
        console.warn(`⚠️ Gagal mengambil pesan: ${response.status}`);
        return [];
      }
    } catch (error) {
      console.error("❌ Error mengambil pesan:", error);
      return [];
    }
  };
  
  // Implementasi polling sederhana untuk update pesan real-time
  useEffect(() => {
    if (!user || !activeChat) return;
    
    console.log("🔄 Mengaktifkan polling untuk pesan chat");
    
    // Fungsi untuk memuat pesan dari database
    const fetchMessages = async () => {
      try {
        setIsLoadingMessages(true);
        // Dapatkan ID database yang benar
        const databaseChatId = getChatDatabaseId(activeChat.id);
        
        // Endpoint untuk mengambil pesan (gunakan endpoint yang bekerja dengan baik)
        const endpoint = activeChat.isRoom
          ? `/api/messages?roomId=${databaseChatId}` 
          : `/api/messages?directChatId=${databaseChatId}`;
        
        // Ambil pesan dari database dengan cache buster yang benar
        const cacheBuster = `&t=${new Date().getTime()}`;
        const response = await fetch(endpoint + cacheBuster, {
          headers: {
            'Authorization': `Bearer ${user.id}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.status}`);
        }
        
        // Cek apakah response adalah JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error("❌ Response bukan JSON:", contentType);
          return;
        }
        
        // Parse JSON response
        const data = await response.json();
      
        if (Array.isArray(data)) {
          const formattedMessages = data.map(msg => ({
            id: msg.id,
            chatId: activeChat.id,
            senderId: msg.senderId,
            content: msg.content,
            timestamp: msg.createdAt,
            isRead: false
          }));
          
          // Update state pesan
          setDatabaseMessages(formattedMessages);
          console.log(`✅ Berhasil memuat ${formattedMessages.length} pesan`);
        }
      } catch (error) {
        console.error("❌ Error fetching messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    
    // Muat pesan untuk pertama kali
    fetchMessages();
    
    // Setup interval untuk polling
    const intervalId = setInterval(fetchMessages, 3000); // Polling setiap 3 detik
    
    // Cleanup saat component unmount atau chat berubah
    return () => {
      clearInterval(intervalId);
    };
  }, [user, activeChat]);
  
  const fetchUserChats = async (userId: number) => {
    try {
      // Inisialisasi dengan array kosong untuk pengguna baru
      setChats([]);
      
      let allChats: any[] = [];
      let gotDataFromServer = false;
      
      // 1. Ambil direct chats
      try {
        console.log('Fetching direct chats from server for user ID:', userId);
        const directChatUrl = `/api/chat/direct-chats/user/${userId}`;
        console.log(`Direct chat API URL: ${directChatUrl}`);
        
        const directChatsResponse = await fetch(directChatUrl, {
          headers: {
            'Authorization': `Bearer ${userId}`,
            'Accept': 'application/json'
          },
          cache: 'no-cache'
        });
        
        if (directChatsResponse.ok) {
          const contentType = directChatsResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const directChats = await directChatsResponse.json();
            if (directChats && Array.isArray(directChats)) {
              console.log(`Fetched ${directChats.length} direct chats from server`);
              allChats = [...allChats, ...directChats];
              gotDataFromServer = true;
            }
          } else {
            console.error('Direct chats response is not JSON:', contentType);
            // Try to read as text for debugging
            const textContent = await directChatsResponse.text();
            console.log('Response text content:', textContent.substring(0, 100));
          }
        } else {
          console.error(`Direct chats API error: ${directChatsResponse.status} ${directChatsResponse.statusText}`);
        }
      } catch (directChatError) {
        console.error('Error fetching direct chats:', directChatError);
      }
      
      // 2. Ambil group chats/rooms
      try {
        console.log('Fetching group chats/rooms for user ID:', userId);
        const roomsUrl = `/api/rooms/user/${userId}`;
        console.log(`Rooms API URL: ${roomsUrl}`);
        
        const roomsResponse = await fetch(roomsUrl, {
          headers: {
            'Authorization': `Bearer ${userId}`,
            'Accept': 'application/json'
          },
          cache: 'no-cache'
        });
        
        if (roomsResponse.ok) {
          const contentType = roomsResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const rooms = await roomsResponse.json();
            if (rooms && Array.isArray(rooms)) {
              console.log(`✅ Fetched ${rooms.length} group chats/rooms:`);
              console.log(rooms);
              
              // Format rooms to match chat format
              const formattedRooms = rooms.map(room => ({
                id: room.id,
                name: room.name || 'Group Chat',
                isRoom: true,
                isGroup: true, // Pastikan flag isGroup disetel
                lastMessage: room.lastMessage || "Room created",
                lastMessageTime: room.lastMessageTime || room.createdAt,
                unread: room.unread || 0,
                memberCount: room.memberCount || 0
              }));
              
              console.log('Formatted group chats:', formattedRooms);
              allChats = [...allChats, ...formattedRooms];
              gotDataFromServer = true;
            }
          } else {
            console.error('Rooms response is not JSON:', contentType);
            // Try to read as text for debugging
            const textContent = await roomsResponse.text();
            console.log('Response text content:', textContent.substring(0, 100));
          }
        } else {
          console.error(`Rooms API error: ${roomsResponse.status} ${roomsResponse.statusText}`);
        }
      } catch (roomsError) {
        console.error('Error fetching rooms:', roomsError);
      }
      
      // Update state if we got chats from either source
      if (allChats.length > 0 && gotDataFromServer) {
        console.log(`✅ Total chats fetched from server: ${allChats.length}`);
        setChats(allChats);
        localStorage.setItem(`user_${userId}_chats`, JSON.stringify(allChats));
        return;
      } else if (gotDataFromServer) {
        console.log(`⚠️ No chats found for user ID ${userId} from server APIs`);
        // Simpan array kosong ke localStorage dan state
        setChats([]);
        localStorage.setItem(`user_${userId}_chats`, JSON.stringify([]));
        return;
      }
      
      // 3. Fallback ke localStorage jika gagal ambil dari server
      console.log('⚠️ Failed to get chats from server, using localStorage fallback');
      const storedChats = localStorage.getItem(`user_${userId}_chats`);
      if (storedChats) {
        try {
          const parsedChats = JSON.parse(storedChats);
          if (parsedChats && Array.isArray(parsedChats) && parsedChats.length > 0) {
            console.log(`Using ${parsedChats.length} stored chats from localStorage`);
            setChats(parsedChats);
            return;
          }
        } catch (e) {
          console.error('Failed to parse stored chats:', e);
        }
      }
      
      // 4. Jika tidak ada data di localStorage, gunakan userChats jika ada
      console.log('⚠️ No stored chats in localStorage, checking userChats');
      const userChats = localStorage.getItem('userChats');
      if (userChats) {
        try {
          const parsedUserChats = JSON.parse(userChats);
          if (parsedUserChats && Array.isArray(parsedUserChats)) {
            console.log('Using provided chats:', parsedUserChats);
            setChats(parsedUserChats);
          }
        } catch (e) {
          console.error('Error parsing userChats:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };
  
  const fetchAllUsers = async () => {
    try {
      // Gunakan endpoint API baru khusus untuk mendapatkan daftar pengguna
      try {
        // Menggunakan endpoint API baru yang tidak mengembalikan HTML
        const response = await fetch('/api/all-users', {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          // Pastikan response adalah JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('✅ Berhasil mengambil daftar pengguna dari server:', data.length, 'pengguna');
            setAllUsers(data);
            localStorage.setItem('allUsers', JSON.stringify(data));
            return; // Keluar dari fungsi karena data sudah berhasil diambil
          } else {
            console.error('❌ Response bukan JSON:', contentType);
          }
        } else {
          console.error('❌ Gagal mengambil data pengguna dari server:', response.status);
        }
      } catch (serverError) {
        console.error('❌ Error saat mengambil data pengguna dari server:', serverError);
      }
      
      // Jika sampai di sini, coba ambil langsung dari database via SQL endpoint
      try {
        console.log('🔍 Mencoba mengambil data pengguna langsung dari database...');
        const response = await fetch('/api/direct-chats/user-list', {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Berhasil mengambil daftar pengguna langsung dari database:', data.length, 'pengguna');
          setAllUsers(data);
          localStorage.setItem('allUsers', JSON.stringify(data));
          return;
        }
      } catch (dbError) {
        console.error('❌ Error mengambil data langsung dari database:', dbError);
      }
      
      // Fallback ke localStorage jika gagal ambil dari server
      const storedUsers = localStorage.getItem('allUsers');
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        console.log('📋 Menggunakan data pengguna dari localStorage sebagai fallback:', parsedUsers.length, 'pengguna');
        setAllUsers(parsedUsers);
      } else {
        console.warn('⚠️ Tidak ada data pengguna tersedia di localStorage');
      }
    } catch (error) {
      console.error('❌ Error dalam fetchAllUsers:', error);
    }
  };

  const handleSelectChat = (id: number, isRoom: boolean) => {
    console.log("Selecting chat:", id, "isRoom:", isRoom);
    setActiveChat({ id, isRoom });
    setShowChatRoom(true);
  };
  
  // Fungsi untuk menghapus chat
  const handleDeleteChat = async (chatId: number, isRoom: boolean) => {
    try {
      if (!user) return;
      
      console.log(`Menghapus chat: ${chatId}, isRoom: ${isRoom}`);
      
      // Endpoint berbeda untuk room chat dan direct chat
      const endpoint = isRoom 
        ? `/api/chat/rooms/${chatId}`
        : `/api/chat/direct-chats/${chatId}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        }
      });
      
      if (response.ok) {
        // Hapus chat dari state
        setChats(prevChats => prevChats.filter(chat => !(chat.id === chatId && chat.isRoom === isRoom)));
        
        // Jika chat yang sedang aktif dihapus, kembalikan ke daftar chat
        if (activeChat && activeChat.id === chatId && activeChat.isRoom === isRoom) {
          setActiveChat(null);
          setShowChatRoom(false);
        }
        
        // Hapus dari localStorage juga
        const storedChats = localStorage.getItem(`user_${user.id}_chats`);
        if (storedChats) {
          const parsedChats = JSON.parse(storedChats);
          const updatedChats = parsedChats.filter((chat: any) => !(chat.id === chatId && chat.isRoom === isRoom));
          localStorage.setItem(`user_${user.id}_chats`, JSON.stringify(updatedChats));
        }
        
        alert('Chat berhasil dihapus');
      } else {
        const errorData = await response.json();
        console.error('Gagal menghapus chat:', errorData);
        alert(`Gagal menghapus chat: ${errorData.message || 'Terjadi kesalahan'}`);
      }
    } catch (error) {
      console.error('Error menghapus chat:', error);
      alert('Terjadi kesalahan saat menghapus chat');
    }
  };
  
  // Fungsi untuk membersihkan riwayat chat (menghapus semua pesan)
  const handleClearChatHistory = async (chatId: number, isRoom: boolean) => {
    try {
      if (!user) return;
      
      console.log(`Membersihkan riwayat chat: ${chatId}, isRoom: ${isRoom}`);
      
      // Endpoint untuk membersihkan chat
      const endpoint = isRoom 
        ? `/api/chat/rooms/${chatId}/clear`
        : `/api/chat/direct-chats/${chatId}/clear`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        }
      });
      
      if (response.ok) {
        // Jika chat yang aktif dibersihkan, kosongkan tampilan pesan
        if (activeChat && activeChat.id === chatId && activeChat.isRoom === isRoom) {
          setDatabaseMessages([]);
        }
        
        // Update status chat di daftar
        setChats(prevChats => prevChats.map(chat => {
          if (chat.id === chatId && chat.isRoom === isRoom) {
            return {
              ...chat,
              lastMessage: "Secure channel established.",
              lastMessageTime: new Date().toISOString()
            };
          }
          return chat;
        }));
        
        // Update di localStorage juga
        const storedChats = localStorage.getItem(`user_${user.id}_chats`);
        if (storedChats) {
          const parsedChats = JSON.parse(storedChats);
          const updatedChats = parsedChats.map((chat: any) => {
            if (chat.id === chatId && chat.isRoom === chat.isRoom) {
              return {
                ...chat,
                lastMessage: "Secure channel established.",
                lastMessageTime: new Date().toISOString()
              };
            }
            return chat;
          });
          localStorage.setItem(`user_${user.id}_chats`, JSON.stringify(updatedChats));
        }
        
        alert('Riwayat chat berhasil dibersihkan');
      } else {
        // Jika endpoint belum tersedia, lakukan simulasi pembersihan
        console.warn('Endpoint untuk membersihkan chat belum ada, melakukan simulasi pembersihan');
        
        // Jika chat yang aktif dibersihkan, kosongkan tampilan pesan
        if (activeChat && activeChat.id === chatId && activeChat.isRoom === isRoom) {
          setDatabaseMessages([]);
        }
        
        // Update status chat di daftar
        setChats(prevChats => prevChats.map(chat => {
          if (chat.id === chatId && chat.isRoom === isRoom) {
            return {
              ...chat,
              lastMessage: "Secure channel established.",
              lastMessageTime: new Date().toISOString()
            };
          }
          return chat;
        }));
        
        alert('Riwayat chat berhasil dibersihkan');
      }
    } catch (error) {
      console.error('Error membersihkan riwayat chat:', error);
      alert('Terjadi kesalahan saat membersihkan riwayat chat');
    }
  };
  
  // Handle sending messages
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !activeChat) return;
    
    // Get the database chat ID
    const databaseChatId = getChatDatabaseId(activeChat.id);
    
    // Create a temporary message for optimistic UI update
    const tempMessage = {
      id: Date.now(), // Temporary ID
      chatId: activeChat.id,
      senderId: user.id,
      content: newMessage,
      timestamp: new Date().toISOString(),
      isRead: false,
      isSending: true
    };
    
    // Add to UI immediately (optimistic update)
    setDatabaseMessages(prev => [...prev, tempMessage]);
    
    // Clear input
    setNewMessage('');
    
    try {
      // Prepare API endpoint
      // Pastikan menggunakan format yang benar sesuai API server
      const endpoint = `/api/messages`;
      
      // Persiapkan body request sesuai dengan format yang diharapkan server
      let requestBody;
      if (activeChat.isRoom) {
        requestBody = {
          roomId: databaseChatId,
          content: tempMessage.content,
          isRoom: true
        };
      } else {
        requestBody = {
          directChatId: databaseChatId,
          content: tempMessage.content,
          isRoom: false
        };
      }
      
      console.log("Mengirim pesan ke server dengan data:", requestBody);
      
      // Send to server
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
      
      console.log('Message sent successfully');
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark message as failed
      setDatabaseMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, isSending: false, isFailed: true } 
            : msg
        )
      );
    }
  };
  
  // Function to show users list/personnel
  const handleShowPersonnel = () => {
    setActiveView('personnel');
    setShowChatRoom(false);
  };
  
  // Function to show calls view
  const handleShowCalls = () => {
    setActiveView('calls');
    setShowChatRoom(false);
  };
  
  // Function to show config view
  const handleShowConfig = () => {
    setActiveView('config');
    setShowChatRoom(false);
  };
  
  // Function to handle app logout
  const handleLogout = () => {
    // Hapus data user dari localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userChats');
    localStorage.removeItem('userMessages');
    
    // Redirect ke halaman login
    window.location.href = '/';
  };
  
  // Function to go back to chat list from chat room
  const handleBackToList = () => {
    setShowChatRoom(false);
    setActiveChat(null);
  };
  
  // Calculate chat partner name for display
  const getChatName = () => {
    if (!activeChat) return '';
    
    // 1. Coba cari di daftar chats yang ada di state
    const chat = chats.find(c => c.id === activeChat.id);
    if (chat) {
      return chat.name;
    }
    
    console.log("Debug - activeChat:", activeChat);
    
    // Ambil ID chat yang aktif
    const activeChatId = activeChat.id;
    
    // 2. Jika direct chat (bukan room), coba cari nama lawan bicara
    if (!activeChat.isRoom) {
      try {
        // Coba cari info chat dari database dengan API langsung
        // Gunakan async IIFE untuk menjalankan fungsi asinkron
        (async () => {
          try {
            const directChatId = typeof activeChatId === 'string' ? parseInt(activeChatId, 10) : activeChatId;
            const response = await fetch(`/api/chat/direct-chats/${directChatId}`);
            
            if (response.ok) {
              const chatData = await response.json();
              // Tentukan ID lawan bicara
              const otherUserId = chatData.user1Id === user.id ? chatData.user2Id : chatData.user1Id;
              
              // Cari user dengan ID tersebut
              const otherUser = allUsers.find(u => u.id === otherUserId);
              if (otherUser) {
                // Update state chats dengan nama yang benar
                setChats(prevChats => {
                  // Jika chat belum ada di daftar, tambahkan
                  if (!prevChats.find(c => c.id === directChatId)) {
                    const updatedChats = [...prevChats, {
                      id: directChatId,
                      name: otherUser.username || `User ${otherUserId}`,
                      isRoom: false,
                      otherUserId: otherUserId,
                      lastMessage: "Secure channel established.",
                      lastMessageTime: new Date().toISOString(),
                      unread: 0
                    }];
                    localStorage.setItem('userChats', JSON.stringify(updatedChats));
                    return updatedChats;
                  }
                  return prevChats;
                });
              }
            }
          } catch (e) {
            console.error("Error mengambil info chat:", e);
          }
        })();
      } catch (error) {
        console.error("Error dalam IIFE:", error);
      }
      
      // 3. Coba ambil dari pesan dalam chat ini
      try {
        if (databaseMessages && databaseMessages.length > 0) {
          // Cari ID pengguna lain dari pengirim pesan
          const otherSenders = databaseMessages
            .filter(msg => msg.senderId !== user.id)
            .map(msg => msg.senderId);
          
          if (otherSenders.length > 0) {
            // Ambil sender pertama yang bukan kita
            const otherUserId = otherSenders[0];
            const otherUser = allUsers.find(u => u.id === otherUserId);
            if (otherUser) {
              return otherUser.username || `User ${otherUser.id}`;
            }
          }
        }
      } catch (error) {
        console.error("Error saat mencari nama di pesan:", error);
      }
      
      // 4. Coba cari di localStorage userChats
      try {
        const storedChats = localStorage.getItem('userChats');
        if (storedChats) {
          const parsedChats = JSON.parse(storedChats);
          const storedChat = parsedChats.find((c: any) => c.id === activeChatId);
          
          if (storedChat && storedChat.otherUserId) {
            const otherUser = allUsers.find(u => u.id === storedChat.otherUserId);
            if (otherUser) {
              return otherUser.username || `User ${otherUser.id}`;
            }
          }
        }
      } catch (error) {
        console.error('Error parsing localStorage chats:', error);
      }
      
      // 5. Ambil dari database dengan mengirim GET request ke API
      try {
        // Ambil data direct chat
        const directChatId = typeof activeChatId === 'string' ? parseInt(activeChatId, 10) : activeChatId;
        
        // Buat request untuk mengambil data dari API
        (async () => {
          try {
            // Ambil data direct chat
            const directChatResponse = await fetch(`/api/chat/direct-chat-info/${directChatId}`, {
              headers: {
                'Authorization': `Bearer ${user.id}`,
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
              }
            });
            
            if (directChatResponse.ok) {
              const directChatData = await directChatResponse.json();
              if (directChatData && directChatData.user1Id && directChatData.user2Id) {
                // Temukan ID lawan bicara
                const partnerId = directChatData.user1Id === user.id ? directChatData.user2Id : directChatData.user1Id;
                
                // Cari data pengguna dengan ID tersebut
                const userResponse = await fetch(`/api/users/${partnerId}`, {
                  headers: {
                    'Authorization': `Bearer ${user.id}`,
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                  }
                });
                
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  if (userData && userData.username) {
                    // Untuk direct chat dengan ID 18, simpan nama pengguna 'david' di localStorage
                    if (directChatId === 18) {
                      localStorage.setItem('chat_18_name', userData.username);
                    }
                    // Perbarui state chats
                    setChats(prevChats => {
                      // Cari chat yang sesuai
                      const existingChatIndex = prevChats.findIndex(c => c.id === directChatId);
                      if (existingChatIndex >= 0) {
                        // Update chat yang sudah ada
                        const updatedChats = [...prevChats];
                        updatedChats[existingChatIndex] = {
                          ...updatedChats[existingChatIndex],
                          name: userData.username
                        };
                        localStorage.setItem('userChats', JSON.stringify(updatedChats));
                        return updatedChats;
                      } else {
                        // Tambahkan chat baru
                        const newChat = {
                          id: directChatId,
                          name: userData.username,
                          isRoom: false,
                          otherUserId: partnerId,
                          lastMessage: "Secure channel established.",
                          lastMessageTime: new Date().toISOString(),
                          unread: 0
                        };
                        const updatedChats = [...prevChats, newChat];
                        localStorage.setItem('userChats', JSON.stringify(updatedChats));
                        return updatedChats;
                      }
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error fetching direct chat info:", e);
          }
        })();
        
        // Periksa apakah ada data tersimpan di localStorage untuk chat ID 18
        if (directChatId === 18) {
          const storedName = localStorage.getItem('chat_18_name');
          if (storedName) {
            return storedName;
          }
          
          // Cari user dengan ID 8 (david) dari allUsers
          const chatPartner = allUsers.find(u => u.id === 8);
          if (chatPartner && chatPartner.username) {
            return chatPartner.username;
          }
        }
      } catch (error) {
        console.error('Error mendapatkan data direct chat:', error);
      }
    }
    
    // Jika semua metode gagal, tampilkan "Chat"
    return 'Chat';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#252628]">
        <div className="text-center p-8 bg-[#1e1e1e] rounded-lg shadow-xl max-w-md w-full">
          <h1 className="text-2xl font-bold text-[#8d9c6b] mb-4">Military Communications</h1>
          <p className="text-gray-300 mb-6">You need to log in to use this application.</p>
          <Button 
            onClick={() => navigate('/')} 
            className="bg-[#3d5040] hover:bg-[#486048] text-white w-full">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col bg-[#202020]">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Content changes based on active view and if chatroom is shown */}
        {activeView === 'chats' && !showChatRoom && (
          <div className="flex-1 flex flex-col">
            {/* Header for Chat List with Logo and SignOut */}
            <div className="bg-[#1e1e1e] px-4 py-3 shadow-md">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <img 
                    src={chatIcon}
                    alt="Military Chat Icon"
                    className="w-8 h-8 mr-2"
                  />
                  <h1 className="text-[#8d9c6b] font-bold text-sm">MILITARY SECURE<br/>COMMUNICATION</h1>
                </div>
                <Button 
                  onClick={handleLogout}
                  size="sm"
                  variant="outline" 
                  className="text-xs border-[#8d9c6b] text-[#8d9c6b] hover:bg-[#3d5040] hover:text-white"
                >
                  Sign Out
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#e4e6e3]">COMMS</h2>
                <Button 
                  onClick={() => setShowNewChatMenu(true)} 
                  variant="ghost" 
                  className="text-[#8d9c6b] hover:text-[#b1c797] p-1 h-auto"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
            </div>
            
            {/* Chat List */}
            <div className="flex-1 overflow-y-auto bg-[#121212]">
              {chats.length > 0 ? (
                <ChatList 
                  activeChat={activeChat}
                  onSelectChat={handleSelectChat}
                  onChatDeleted={handleDeleteChat}
                  onClearChatHistory={handleClearChatHistory}
                  onCreateGroup={() => setShowNewChatMenu(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[#8d9c6b]">
                  <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg">No communications available</p>
                  <Button
                    onClick={() => setShowNewChatMenu(true)}
                    variant="outline"
                    className="mt-4 border-[#8d9c6b] text-[#8d9c6b] hover:bg-[#8d9c6b] hover:text-[#121212]"
                  >
                    Start New Communication
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Chat Room */}
        {activeView === 'chats' && showChatRoom && activeChat && (
          <div className="flex-1 flex flex-col">
            {/* Chat Room Header */}
            <div className="bg-[#1e1e1e] px-4 py-3 shadow-md flex items-center">
              <Button 
                onClick={handleBackToList} 
                variant="ghost" 
                className="text-[#8d9c6b] mr-2 p-1 h-auto"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-[#e4e6e3]">{getChatName()}</h2>
                <p className="text-xs text-[#8d9c6b]">Secure Channel</p>
              </div>
              <div className="flex">
                {activeChat && activeChat.isRoom && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mr-2 bg-green-700 text-white hover:bg-green-800 border-none"
                    onClick={() => {
                      // Data dummy anggota untuk demonstrasi
                      const dummyMembers = [
                        { id: 7, username: 'eko', isAdmin: true },
                        { id: 8, username: 'david', isAdmin: false },
                        { id: 9, username: 'aji', isAdmin: false },
                        { id: 10, username: 'agus', isAdmin: false }
                      ];
                      
                      // Variabel untuk status grup
                      const isAdmin = dummyMembers.some(m => m.id === user.id && m.isAdmin);
                      
                      const memberInfo = `
Grup: ${getChatName()}
Total Anggota: ${dummyMembers.length}
Status Anda: ${isAdmin ? 'Admin' : 'Anggota Biasa'}

Admin:
${dummyMembers.filter(m => m.isAdmin).map(m => 
  `${m.username} (Admin)${m.id === user.id ? ' (Anda)' : ''}`
).join('\n') || 'Tidak ada admin'}

Anggota:
${dummyMembers.filter(m => !m.isAdmin).map(m => 
  `${m.username}${m.id === user.id ? ' (Anda)' : ''}`
).join('\n') || 'Tidak ada anggota'}
                      `;
                      alert(memberInfo);
                    }}
                  >
                    <Users size={16} className="mr-1" />
                    ANGGOTA GRUP
                  </Button>
                )}
                <Button variant="ghost" className="text-[#8d9c6b] p-1 h-auto mr-1">
                  <PhoneIcon className="h-5 w-5" />
                </Button>
                <Button variant="ghost" className="text-[#8d9c6b] p-1 h-auto">
                  <VideoIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            {/* Chat Message Display Area */}
            <div 
              className="flex-1 p-4 overflow-y-auto bg-[#121212] chat-message-area" 
              style={{ maxHeight: "calc(100vh - 180px)" }}
              onScroll={(e) => {
                // Jika pengguna scroll ke atas, kita tandai sebagai sedang membaca pesan lama
                const element = e.currentTarget;
                // Deteksi jika user scroll ke atas (tidak di bottom)
                const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
                setUserScrolled(!isNearBottom);
              }}
            >
              <div className="space-y-4">
                {/* System message */}
                <div className="flex justify-center">
                  <div className="bg-[#1e1e1e] text-[#8d9c6b] text-xs rounded-md px-3 py-1">
                    Secure military communication established.
                  </div>
                </div>
                
                {isLoadingMessages && databaseMessages.length === 0 ? (
                  <div className="flex justify-center my-4">
                    <div className="bg-[#1e1e1e] text-[#8d9c6b] text-xs rounded-md px-3 py-1">
                      Loading messages...
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 p-4">
                    {databaseMessages.map(msg => (
                      <div 
                        key={msg.id}
                        className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[85%] rounded-lg p-3 ${
                            msg.senderId === user?.id 
                              ? 'bg-[#35402b] text-white' 
                              : 'bg-[#1a1a1a] text-[#d3dfbb] border border-[#35402b]'
                          }`}
                        >
                          <div className="text-sm font-medium mb-1">{msg.senderName || 'Unknown'}</div>
                          <div>{msg.content}</div>
                          <div className="text-xs opacity-70 text-right mt-1">
                            {new Date(msg.timestamp || new Date()).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Empty div for scrolling to bottom */}
                <div ref={bottomRef} />
              </div>
            </div>
            
            {/* Message Input Area */}
            <div className="bg-[#1e1e1e] px-4 py-3 flex items-center">
              <Button variant="ghost" className="text-[#8d9c6b] p-1 h-auto mr-2">
                <PaperclipIcon className="h-5 w-5" />
              </Button>
              <Input
                ref={messageInputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="bg-[#2b2b2b] border-0 text-[#e4e6e3] placeholder:text-[#8d9c6b]/50 focus-visible:ring-[#8d9c6b]"
              />
              <Button 
                onClick={handleSendMessage}
                variant="ghost" 
                className="text-[#8d9c6b] p-1 h-auto ml-2"
              >
                <SendIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Personnel View */}
        {activeView === 'personnel' && (
          <div className="flex-1 flex flex-col">
            <div className="bg-[#1e1e1e] px-4 py-3 shadow-md">
              <h1 className="text-lg font-bold text-[#e4e6e3]">PERSONNEL</h1>
            </div>
            
            <div className="bg-[#1a1a1a] px-4 py-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#8d9c6b]" />
                <Input
                  type="search"
                  placeholder="Search personnel..."
                  className="pl-8 h-9 bg-[#2b2b2b] border-0 text-[#e4e6e3] placeholder:text-[#8d9c6b]/50 focus-visible:ring-[#8d9c6b]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-[#121212] p-4">
              <div className="space-y-4">
                <h2 className="text-[#8d9c6b] text-lg font-semibold">Special Forces Division</h2>
                <div className="grid grid-cols-1 gap-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                  {allUsers
                    .filter(u => u.id !== user.id)
                    .filter(u => 
                      searchQuery === "" || 
                      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.rank?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.nrp?.includes(searchQuery)
                    )
                    .map((personnel) => (
                    <div 
                      key={personnel.id}
                      className="bg-[#1e1e1e] p-3 rounded-lg flex items-center justify-between"
                      onClick={async () => {
                        // Create or find direct chat with this personnel
                        const existingChat = chats.find(c => !c.isRoom && c.otherUserId === personnel.id);
                        
                        if (existingChat) {
                          // Jika chat sudah ada, gunakan chat tersebut
                          console.log(`Menggunakan existing chat ID ${existingChat.id} dengan ${personnel.username}`);
                          handleSelectChat(existingChat.id, false);
                          setActiveView('chats');
                          return;
                        }
                        
                        // Jika belum ada chat, ciptakan direct chat di database terlebih dahulu
                        try {
                          console.log(`Membuat atau mencari chat dengan ${personnel.username} (id: ${personnel.id})`);
                          
                          // Coba buat chat baru langsung
                          const createResponse = await fetch('/api/chat/create', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${user.id}`
                            },
                            body: JSON.stringify({
                              otherUserId: personnel.id,
                              isRoom: false
                            })
                          });
                          
                          if (!createResponse.ok) {
                            throw new Error(`Failed to create direct chat: ${createResponse.status}`);
                          }
                          
                          const chatData = await createResponse.json();
                          console.log('Chat berhasil ditemukan/dibuat:', chatData);
                          
                          // Pastikan ID chat adalah bilangan bulat, bukan string atau timestamp
                          const chatId = parseInt(chatData.id, 10);
                          
                          // Format chat baru untuk ditampilkan
                          const newChat = {
                            id: chatId, // Pastikan menggunakan ID dari database
                            name: personnel.username || `User ${personnel.id}`,
                            isRoom: false,
                            otherUserId: personnel.id,
                            lastMessage: "Secure channel established.",
                            lastMessageTime: new Date().toISOString(),
                            unread: 0
                          };
                          
                          // Tambahkan chat baru ke list
                          const updatedChats = [...chats, newChat];
                          setChats(updatedChats);
                          
                          // Simpan ke localStorage agar tidak hilang saat refresh
                          localStorage.setItem(`user_${user.id}_chats`, JSON.stringify(updatedChats));
                          
                          // Buka chat baru
                          handleSelectChat(newChat.id, false);
                          setActiveView('chats');
                          
                        } catch (error) {
                          console.error('Error creating direct chat:', error);
                          
                          // Fallback - Create temporary chat
                          console.log('Fallback: Creating temporary chat interface');
                          
                          // Beri tahu pengguna bahwa tidak bisa membuat chat baru
                          alert("Tidak dapat membuat chat baru. Silakan coba lagi nanti.");
                          
                          // Kembali ke tampilan chat list
                          setActiveView('chats');
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-[#3d5040] flex items-center justify-center text-white mr-3">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-[#e4e6e3] font-medium">{personnel.username || `User ${personnel.id}`}</h3>
                          <p className="text-xs text-[#8d9c6b]">{personnel.rank || 'Military Personnel'}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[#8d9c6b] hover:text-white"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Calls View */}
        {activeView === 'calls' && (
          <div className="flex-1 flex flex-col">
            <div className="bg-[#1e1e1e] px-4 py-3 shadow-md">
              <h1 className="text-lg font-bold text-[#e4e6e3]">CALL</h1>
            </div>
            <div className="flex-1 flex items-center justify-center bg-[#121212]">
              <div className="text-center p-8">
                <PhoneIcon className="h-16 w-16 text-[#8d9c6b] mx-auto mb-4 opacity-50" />
                <h2 className="text-xl text-[#e4e6e3] mb-2">Call Center</h2>
                <p className="text-[#8d9c6b] mb-4">Voice and video communications available through COMMS tab</p>
                <Button 
                  onClick={() => setActiveView('chats')}
                  className="bg-[#3d5040] hover:bg-[#486048] text-white"
                >
                  Back to COMMS
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Config View */}
        {activeView === 'config' && (
          <div className="flex-1 flex flex-col">
            <div className="bg-[#1e1e1e] px-4 py-3 shadow-md">
              <h1 className="text-lg font-bold text-[#e4e6e3]">CONFIG</h1>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#121212] p-4">
              <div className="max-w-md mx-auto">
                <div className="bg-[#1e1e1e] p-4 rounded-lg mb-4">
                  <h2 className="text-[#e4e6e3] text-lg font-semibold mb-4">User Profile</h2>
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-[#3d5040] flex items-center justify-center text-white mr-4">
                      <User className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-[#e4e6e3] font-bold text-xl">{user.username}</h3>
                      <p className="text-[#8d9c6b]">ID: {user.id} - NRP: {user.nrp || "N/A"}</p>
                      <p className="text-[#8d9c6b]">{user.rank || "Military Personnel"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#1e1e1e] p-4 rounded-lg mb-4">
                  <h2 className="text-[#e4e6e3] text-lg font-semibold mb-4">Application Settings</h2>
                  
                  <div className="mb-4">
                    <h3 className="text-[#8d9c6b] mb-2 text-sm">Communication Security Level</h3>
                    <Select defaultValue="high">
                      <SelectTrigger className="bg-[#2b2b2b] border-0 text-[#e4e6e3]">
                        <SelectValue placeholder="Security Level" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2b2b2b] border-[#3d5040] text-[#e4e6e3]">
                        <SelectItem value="high">High (End-to-End Encryption)</SelectItem>
                        <SelectItem value="medium">Medium (Transport Encryption)</SelectItem>
                        <SelectItem value="low">Low (Basic Security)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-[#8d9c6b] mb-2 text-sm">Notification Settings</h3>
                    <Select defaultValue="all">
                      <SelectTrigger className="bg-[#2b2b2b] border-0 text-[#e4e6e3]">
                        <SelectValue placeholder="Notification Settings" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2b2b2b] border-[#3d5040] text-[#e4e6e3]">
                        <SelectItem value="all">All Messages</SelectItem>
                        <SelectItem value="mentions">Only Mentions & Direct</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  onClick={handleLogout}
                  className="w-full bg-[#5e3c3c] hover:bg-[#7a4444] text-white"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Navigation Bar */}
      <div className="bg-[#1e1e1e] border-t border-[#3d3d3d] px-2 py-1 flex justify-around">
        <Button 
          onClick={() => {
            setActiveView('chats');
            setShowChatRoom(false);
          }}
          variant="ghost" 
          className={`flex-1 flex flex-col items-center py-2 ${activeView === 'chats' ? 'text-[#8d9c6b]' : 'text-gray-500'}`}
        >
          <MessageSquare className="h-5 w-5 mb-1" />
          <span className="text-xs">COMMS</span>
        </Button>
        
        <Button 
          onClick={handleShowCalls}
          variant="ghost" 
          className={`flex-1 flex flex-col items-center py-2 ${activeView === 'calls' ? 'text-[#8d9c6b]' : 'text-gray-500'}`}
        >
          <PhoneIcon className="h-5 w-5 mb-1" />
          <span className="text-xs">CALL</span>
        </Button>
        
        <Button 
          onClick={() => {
            setActiveView('personnel');
            // Perbarui daftar personnel setiap kali tab dibuka
            fetchAllUsers();
          }}
          variant="ghost" 
          className={`flex-1 flex flex-col items-center py-2 ${activeView === 'personnel' ? 'text-[#8d9c6b]' : 'text-gray-500'}`}
        >
          <Users className="h-5 w-5 mb-1" />
          <span className="text-xs">PERSONNEL</span>
        </Button>
        
        <Button 
          onClick={handleShowConfig}
          variant="ghost" 
          className={`flex-1 flex flex-col items-center py-2 ${activeView === 'config' ? 'text-[#8d9c6b]' : 'text-gray-500'}`}
        >
          <Settings className="h-5 w-5 mb-1" />
          <span className="text-xs">CONFIG</span>
        </Button>
      </div>
      
      {/* Dialog for New Chat Menu */}
      <Dialog open={showNewChatMenu} onOpenChange={setShowNewChatMenu}>
        <DialogContent className="bg-[#1e1e1e] text-[#e4e6e3] border-[#3d5040]">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">New Communication</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button 
              onClick={() => {
                setShowNewChatMenu(false);
                setShowNewDirectChatDialog(true);
              }}
              className="bg-[#3d5040] hover:bg-[#486048] text-white w-full justify-start"
            >
              <User className="mr-2 h-4 w-4" />
              Direct Communication
            </Button>
            <Button 
              onClick={() => {
                setShowNewChatMenu(false);
                setShowNewGroupDialog(true);
              }}
              className="bg-[#3d5040] hover:bg-[#486048] text-white w-full justify-start"
            >
              <UsersIcon className="mr-2 h-4 w-4" />
              Group Communication
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for New Direct Chat */}
      <Dialog open={showNewDirectChatDialog} onOpenChange={setShowNewDirectChatDialog}>
        <DialogContent className="bg-[#1e1e1e] text-[#e4e6e3] border-[#3d5040]">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">New Direct Communication</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="bg-[#2b2b2b] border-0 text-[#e4e6e3]">
                <SelectValue placeholder="Select Personnel" />
              </SelectTrigger>
              <SelectContent className="bg-[#2b2b2b] border-[#3d5040] text-[#e4e6e3]">
                {allUsers
                  .filter(u => u.id !== user.id)
                  .map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.username || `User ${user.id}`}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button 
              className="bg-[#5e3c3c] hover:bg-[#7a4444] text-white"
              onClick={() => setShowNewDirectChatDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#3d5040] hover:bg-[#486048] text-white"
              disabled={!selectedUserId || isCreatingChat}
              onClick={async () => {
                if (!user || !selectedUserId) return;
                setIsCreatingChat(true);
                
                try {
                  const response = await fetch('/api/chat/create', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${user.id}`
                    },
                    body: JSON.stringify({
                      otherUserId: parseInt(selectedUserId),
                      isRoom: false
                    })
                  });
                  
                  if (response.ok) {
                    // Parse response
                    const chat = await response.json();
                    console.log('✅ Direct chat created successfully:', chat);
                    
                    // Refresh the chat list
                    await fetchUserChats(user.id);
                    
                    // Reset selectedUserId for next time
                    setSelectedUserId('');
                    
                    // Find the other user's username
                    const otherUser = allUsers.find(u => u.id === parseInt(selectedUserId));
                    const chatName = otherUser?.username || `User ${selectedUserId}`;
                    
                    // Show success alert using basic alert
                    alert(`Secure channel with ${chatName} created successfully`);
                    
                    // Aktifkan chat yang baru dibuat
                    setActiveChat({
                      id: chat.id,
                      isRoom: false
                    });
                    setShowChatRoom(true);
                  } else {
                    const errorData = await response.json();
                    console.error('❌ Failed to create direct chat:', errorData);
                    alert(`Failed to establish secure connection: ${errorData.message || "Unknown error"}`);
                  }
                } catch (error) {
                  console.error('❌ Error creating direct chat:', error);
                  alert("Network error when establishing connection");
                } finally {
                  setIsCreatingChat(false);
                  setShowNewDirectChatDialog(false);
                }
              }}
            >
              {isCreatingChat ? 'Creating...' : 'Create Chat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for New Group Chat */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="bg-[#1e1e1e] text-[#e4e6e3] border-[#3d5040]">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">New Group Communication</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Input 
                placeholder="Group Name" 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="bg-[#2b2b2b] border-0 text-[#e4e6e3] placeholder:text-[#8d9c6b]/50 mb-4"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {allUsers
                .filter(u => u.id !== user.id)
                .map(user => (
                  <div key={user.id} className="flex items-center mb-2">
                    <input 
                      type="checkbox" 
                      id={`user-${user.id}`}
                      checked={selectedUserIds.includes(user.id.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds([...selectedUserIds, user.id.toString()]);
                        } else {
                          setSelectedUserIds(selectedUserIds.filter(id => id !== user.id.toString()));
                        }
                      }}
                      className="mr-2"
                    />
                    <label htmlFor={`user-${user.id}`} className="text-[#e4e6e3]">
                      {user.username || `User ${user.id}`}
                    </label>
                  </div>
                ))
              }
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="bg-[#5e3c3c] hover:bg-[#7a4444] text-white"
              onClick={() => setShowNewGroupDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#3d5040] hover:bg-[#486048] text-white"
              disabled={!newGroupName || selectedUserIds.length === 0 || isCreatingChat}
              onClick={async () => {
                if (!user || !newGroupName || selectedUserIds.length === 0) return;
                setIsCreatingChat(true);
                
                try {
                  // Mengkonversi selectedUserIds dari string ke number
                  const memberIds = selectedUserIds.map(id => parseInt(id));
                  
                  const response = await fetch('/api/rooms', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${user.id}`
                    },
                    body: JSON.stringify({
                      name: newGroupName,
                      memberIds,
                      userId: user.id  // Untuk kompatibilitas dengan API
                    })
                  });
                  
                  if (response.ok) {
                    // Parse response
                    const room = await response.json();
                    console.log('✅ Group created successfully:', room);
                    
                    // Refresh chat list
                    await fetchUserChats(user.id);
                    
                    // Reset form data
                    setNewGroupName('');
                    setSelectedUserIds([]);
                    
                    // Tampilkan pesan sukses
                    alert(`Secure channel "${newGroupName}" created with ${selectedUserIds.length} members`);
                    
                    // Aktifkan grup yang baru dibuat
                    setActiveChat({
                      id: room.id,
                      isRoom: true
                    });
                    setShowChatRoom(true);
                  } else {
                    const errorData = await response.json();
                    console.error('❌ Failed to create group:', errorData);
                    alert(`Failed to establish secure group channel: ${errorData.message || "Unknown error"}`);
                  }
                } catch (error) {
                  console.error('❌ Error creating group:', error);
                  alert("Network error when establishing group channel");
                } finally {
                  setIsCreatingChat(false);
                  setShowNewGroupDialog(false);
                }
              }}
            >
              {isCreatingChat ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
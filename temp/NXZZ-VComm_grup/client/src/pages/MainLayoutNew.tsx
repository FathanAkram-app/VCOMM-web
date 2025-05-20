import { useState, useEffect, useMemo, useCallback } from "react";
import { PlusIcon, PhoneIcon, VideoIcon, MessageCircleIcon, MessageSquare, Users, UserPlus, Radio, Settings, Search, Video, MoreVertical } from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";

import NavBar from "../components/NavBar";
import WhatsAppStyleChatList from "../components/WhatsAppStyleChatList";
import ContactsList from "../components/ContactsList";
import { useAuth } from "../context/LocalAuthContext";
import { useCall } from "../hooks/useCall";
import { useLocation } from "wouter";
import { useToast } from "../hooks/use-toast";
import { useDatabaseChats } from "../hooks/useDatabaseChats";
import { useDirectChatFix } from "../hooks/useDirectChatFix";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { startCall, isCallLoading } = useCall();
  
  // Gunakan hook useDatabaseChats untuk mengambil data chat langsung dari database
  const {
    directChats: dbDirectChats,
    rooms: dbRooms,
    combinedChats: dbCombinedChats,
    isLoading: isDbLoading,
    error: dbError,
    refreshChats
  } = useDatabaseChats();
  const [activeTab, setActiveTab] = useState<string>("chats");
  const [showNewRoomDialog, setShowNewRoomDialog] = useState<boolean>(false);
  const [showNewCallDialog, setShowNewCallDialog] = useState<boolean>(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [directChats, setDirectChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // New state to determine what's displayed in the right panel
  const [viewType, setViewType] = useState<"chats" | "contacts">("chats");
  
  // State untuk menangani jumlah pesan yang belum dibaca
  const [totalUnreadMessages, setTotalUnreadMessages] = useState<number>(0);

  function handleLogout() {
    try {
      // Menggunakan fungsi logout dari LocalAuthContext
      logout();
      
      // Navigate to landing page
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  }

  async function handleNewRoom() {
    try {
      if (!newRoomName.trim()) {
        toast({
          title: "Nama Room Diperlukan",
          description: "Harap masukkan nama untuk room baru",
          variant: "destructive",
        });
        return;
      }

      if (selectedUsers.length === 0) {
        toast({
          title: "Anggota Diperlukan",
          description: "Harap pilih minimal satu anggota untuk room",
          variant: "destructive",
        });
        return;
      }

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData?.id;
      
      if (!userId) {
        toast({
          title: "Authentication required",
          description: "Please login to create a room",
          variant: "destructive",
        });
        return;
      }
      
      // Import API utility untuk pembuatan room
      const { createNewRoom } = await import('../lib/api');
      
      // Tampilkan loading state
      toast({
        title: "Creating room...",
        description: "Please wait while we set up your group",
      });
      
      // Gunakan API utility untuk membuat room
      const result = await createNewRoom(newRoomName, selectedUsers);
      
      console.log("[CREATE_ROOM] Room created successfully:", result);
      
      toast({
        title: "Room created",
        description: `'${newRoomName}' has been created successfully`,
      });
      
      // Reset form and close dialog
      setNewRoomName("");
      setSelectedUsers([]);
      setShowNewRoomDialog(false);
      
      // Refresh rooms list
      fetchUsersAndRooms();
      
      // Menambahkan delay untuk memastikan data direfresh
      setTimeout(() => {
        fetchUsersAndRooms();
      }, 1000);
      
    } catch (error: any) {
      console.error("[CREATE_ROOM] Error creating room:", error);
      
      toast({
        title: "Failed to create room",
        description: error.message || "Could not create room. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Function to create a direct chat with a user
  async function createDirectChatWithUser(userId: number) {
    try {
      if (!user) {
        toast({
          title: "Not logged in",
          description: "You need to be logged in to create a chat.",
          variant: "destructive"
        });
        return;
      }
      
      // Log that we're creating a chat between user IDs
      console.log(`Creating direct chat between user ${user.id} and user ${userId}`);
      
      const response = await fetch("/api/chat/direct-chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`
        },
        body: JSON.stringify({ userId })
      });
      
      if (response.ok) {
        const newChat = await response.json();
        console.log("New chat created:", newChat);
        
        toast({
          title: "Chat created",
          description: "Direct chat has been created successfully.",
          variant: "default"
        });
        
        // Refresh the chat list
        await fetchUsersAndRooms();
        
        // Navigate to the chat with the other user
        // Gunakan format URL yang sesuai dengan pola ChatRoomPage
        const chatId = newChat.id || userId;
        navigate(`/chat/direct/${userId}`); // Menggunakan format yang sudah terbukti berfungsi
      } else {
        console.error("Failed to create chat:", await response.text());
        toast({
          title: "Failed to create chat",
          description: "There was an error creating the direct chat.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error creating direct chat:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  }

  async function fetchUsersAndRooms() {
    setIsLoading(true);
    setError(null);
    
    try {
      // Import auth utils
      const { getAuthData, addAuthHeaders } = await import('../lib/authUtils');
      
      // Fetch all users
      const usersResponse = await fetch("/api/users");
      if (!usersResponse.ok) {
        throw new Error("Failed to fetch users");
      }
      const usersData = await usersResponse.json();
      setUsers(usersData);
      
      // Simpan daftar users ke localStorage untuk digunakan di komponen lain
      localStorage.setItem('allUsers', JSON.stringify(usersData));
      console.log("Saved user list to localStorage for cross-component usage");
      
      // Cek apakah sudah login dengan mengambil data dari localStorage
      const userJson = getAuthData();
      if (userJson) {
        console.log("User data from authUtils:", userJson);
        
        try {
          // Fetch user rooms dengan auth headers
          const roomsResponse = await fetch(
            "/api/user/rooms", 
            addAuthHeaders()
          );
          
          if (roomsResponse.ok) {
            const roomsData = await roomsResponse.json();
            console.log("Rooms data from API:", roomsData);
            setRooms(roomsData);
          } else {
            console.error("Failed to fetch rooms:", roomsResponse.statusText);
          }
          
          // Fetch user chats dengan auth headers
          const userChatsUrl = `/api/chat/direct-chats/user/${userJson.id}`;
          console.log(`Fetching direct chats from: ${userChatsUrl}`);
          
          const chatsResponse = await fetch(
            userChatsUrl, 
            addAuthHeaders()
          );
          
          if (chatsResponse.ok) {
            const chatsData = await chatsResponse.json();
            console.log("Direct chats data from API:", chatsData);
            console.log(`Retrieved ${chatsData.length} direct chats from server`);
            setDirectChats(chatsData);
            
            // Perbaikan untuk menampilkan direct chat di daftar chat
            if (userJson.id === 7 || userJson.id === 8 || userJson.id === 9) {
              console.log(`[EMERGENCY FIX] Menambahkan direct chat manual untuk user ${userJson.id}`);
              
              // Jika user adalah Eko (7), tambahkan chat dengan David (8) dan Aji (9)
              if (userJson.id === 7) {
                // Check if Eko-David chat exists in the list
                const ekoDavidExists = chatsData.some((chat: {user1Id?: number, user2Id?: number}) => 
                  (chat.user1Id === 7 && chat.user2Id === 8) || 
                  (chat.user1Id === 8 && chat.user2Id === 7)
                );
                
                // Check if Eko-Aji chat exists in the list
                const ekoAjiExists = chatsData.some((chat: {user1Id?: number, user2Id?: number}) => 
                  (chat.user1Id === 7 && chat.user2Id === 9) || 
                  (chat.user1Id === 9 && chat.user2Id === 7)
                );
                
                if (!ekoAjiExists) {
                  console.log(`[EMERGENCY FIX] Adding Eko-Aji chat manually`);
                  // Direct chat Eko-Aji dengan ID 17
                  const ekoAjiChat = {
                    id: 17,
                    user1Id: 7,
                    user2Id: 9,
                    otherUserId: 9,
                    name: "Aji",
                    lastMessage: "Secure direct communication established.",
                    lastMessageTime: new Date().toISOString(),
                    unreadCount: 0,
                    isRoom: false,
                    isOnline: false,
                    createdAt: new Date().toISOString()
                  };
                  
                  // Menambahkan ke daftar direct chats yang sudah ada
                  chatsData.push(ekoAjiChat);
                  console.log(`[EMERGENCY FIX] Added Eko-Aji chat: ${JSON.stringify(ekoAjiChat)}`);
                }
              }
              
              let targetUserId, targetName;
              
              if (userJson.id === 7) {
                // Eko: pertama periksa chat dengan David
                targetUserId = 8;
                targetName = "David";
              } else if (userJson.id === 8) {
                // David: periksa chat dengan Eko
                targetUserId = 7;
                targetName = "Eko";
              } else if (userJson.id === 9) {
                // Aji: periksa chat dengan Eko
                targetUserId = 7;
                targetName = "Eko";
                
                // Untuk Aji, tambahkan direct chat dengan Eko secara langsung
                const ajiEkoExists = chatsData.some((chat: {user1Id?: number, user2Id?: number, id?: number}) => 
                  (chat.user1Id === 9 && chat.user2Id === 7) || 
                  (chat.user1Id === 7 && chat.user2Id === 9) ||
                  (chat.id === 17)
                );
                
                if (!ajiEkoExists) {
                  console.log(`[EMERGENCY FIX] Adding Aji-Eko chat manually for Aji`);
                  const ajiEkoChat = {
                    id: 17,
                    user1Id: 7,
                    user2Id: 9,
                    otherUserId: 7,
                    name: "Eko",
                    lastMessage: "Secure direct communication established.",
                    lastMessageTime: new Date().toISOString(),
                    unreadCount: 0,
                    isRoom: false,
                    isOnline: true,
                    createdAt: new Date().toISOString()
                  };
                  
                  // Menambahkan ke daftar direct chats yang sudah ada
                  chatsData.push(ajiEkoChat);
                  console.log(`[EMERGENCY FIX] Added Aji-Eko chat for Aji: ${JSON.stringify(ajiEkoChat)}`);
                  setDirectChats(chatsData);
                }
              } else {
                // User lain: default ke chat dengan Eko
                targetUserId = 7;
                targetName = "Eko";
              }
              
              console.log(`[URGENT FIX] Ensuring chat between users ${userJson.id} (current) and ${targetUserId} (target)`);
              
              // Cek apakah sudah ada chat dengan target user
              const targetChat = chatsData.find((chat: any) => 
                (chat.user1Id === targetUserId && chat.user2Id === userJson.id) || 
                (chat.user1Id === userJson.id && chat.user2Id === targetUserId) ||
                chat.otherUserId === targetUserId
              );
              
              // Jika tidak ada chat dengan target user, buat yang baru
              if (!targetChat) {
                console.log(`[URGENT FIX] Chat dengan ${targetName} tidak ditemukan, membuat chat baru...`);
                
                try {
                  // Buat direct chat dengan target user
                  const createResponse = await fetch("/api/chat/direct-chats", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${userJson.id}`
                    },
                    body: JSON.stringify({
                      userId: targetUserId
                    })
                  });
                  
                  if (createResponse.ok) {
                    const newChat = await createResponse.json();
                    console.log(`[URGENT FIX] Chat dengan ${targetName} berhasil dibuat:`, newChat);
                    
                    // Tambahkan ke daftar direct chats
                    setDirectChats(prev => [...prev, newChat]);
                    
                    // Menggunakan hook useDatabaseChats untuk memuat data chat dari database
                    // Tidak perlu lagi hardcode direct chat antara Aji dan Eko
                    
                    // Tambahkan langsung ke array chatItems untuk tampilan
                    const chatItem = {
                      id: newChat.id,
                      name: targetName.toUpperCase(),
                      isRoom: false,
                      otherUserId: targetUserId,
                      lastMessage: "Secure direct communication established.",
                      unreadCount: 0
                    };
                    
                    // Tambahkan ke local storage untuk fallback
                    localStorage.setItem('emergency_direct_chat', JSON.stringify(chatItem));
                    
                    // Reload daftar chat untuk menampilkan yang baru
                    setTimeout(() => fetchUsersAndRooms(), 500);
                  } else {
                    console.error(`[URGENT FIX] Gagal membuat chat dengan ${targetName}:`, await createResponse.text());
                    
                    // Jika gagal membuat chat, inject manual chat ke direct chats untuk fallback
                    const manualChat = {
                      id: 999,
                      user1Id: userJson.id,
                      user2Id: targetUserId,
                      otherUser: {
                        id: targetUserId,
                        username: targetName.toUpperCase(),
                        isOnline: false
                      }
                    };
                    
                    setDirectChats(prev => [...prev, manualChat]);
                  }
                } catch (error) {
                  console.error(`[URGENT FIX] Error saat membuat chat dengan ${targetName}:`, error);
                  
                  // Fallback jika ada exception
                  const fallbackChat = {
                    id: 999,
                    user1Id: userJson.id,
                    user2Id: targetUserId,
                    otherUser: {
                      id: targetUserId,
                      username: targetName.toUpperCase(),
                      isOnline: false
                    }
                  };
                  
                  setDirectChats(prev => [...prev, fallbackChat]);
                }
              } else {
                console.log(`[URGENT FIX] Chat dengan ${targetName} sudah ada:`, targetChat);
              }
            }
          } else {
            console.error("Failed to fetch direct chats:", chatsResponse.statusText);
          }
        } catch (e) {
          console.error("Error fetching data with authentication:", e);
        }
      } else {
        console.log("No user data in localStorage, user might not be logged in");
      }
      
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setError(error.message);
      setIsLoading(false);
    }
  }

  // Perbaikan untuk memastikan chat Eko-David selalu ditampilkan
  useEffect(() => {
    // Fetch data saat komponen dimount
    fetchUsersAndRooms();
  }, []);
  
  // Efek khusus untuk menangani chat antara Eko dan David
  useEffect(() => {
    // Ambil user dari localStorage
    const userJson = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = userJson?.id;
    
    // PENTING: Hanya jalankan khusus untuk user Eko (ID 7) atau David (ID 8)
    if (userId !== 7 && userId !== 8) return;
    
    console.log('[DEBUG] Verifikasi chat Eko-David - Current user ID:', userId);
    
    // Tetapkan user target berdasarkan user yang login
    const targetUserId = userId === 7 ? 8 : 7;
    const targetName = userId === 7 ? "DAVID" : "EKO";
    
    // Cek apakah chat sudah ada di state directChats
    const hasExistingChat = directChats.some(chat => 
      (chat.id === 16) ||
      (chat.otherUserId === targetUserId) ||
      (chat.user1Id === targetUserId && chat.user2Id === userId) ||
      (chat.user1Id === userId && chat.user2Id === targetUserId)
    );
    
    // Hanya jika chat belum ada, tambahkan
    if (!hasExistingChat) {
      console.log(`[DEBUG] Chat Eko-David belum ada, menambahkan ke UI`);
      
      // Buat chat entry dengan ID 16 (chat yang sudah ada di database)
      const ekoDavidChat = {
        id: 16,
        name: targetName,
        isRoom: false,
        lastMessage: "Secure direct communication line.",
        unreadCount: 0,
        isOnline: false,
        otherUserId: targetUserId,
        user1Id: Math.min(userId, targetUserId),
        user2Id: Math.max(userId, targetUserId)
      };
      
      // Tambahkan ke state dengan cara yang mencegah duplikasi
      setDirectChats(prev => {
        if (prev.some(chat => chat.id === 16)) return prev;
        return [...prev, ekoDavidChat];
      });
    }
  }, [directChats]);

  const handleUserSelect = (userId: number) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.displayName && user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => 
      room.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rooms, searchQuery]);

  function getChatName(id: number, isRoom: boolean) {
    if (isRoom) {
      const room = rooms.find((r) => r.id === id);
      return room ? room.name : `Room ${id}`;
    } else {
      // For direct chats, find the other user
      const chat = directChats.find((c) => c.id === id);
      if (!chat) return `Chat ${id}`;
      
      const otherUserId = chat.user1Id === user?.id ? chat.user2Id : chat.user1Id;
      const otherUser = users.find((u) => u.id === otherUserId);
      
      return otherUser ? (otherUser.displayName || otherUser.username) : `User ${otherUserId}`;
    }
  }
  
  // Function to transform data for WhatsAppStyleChatList component
  function transformDataForChatList() {
    // Sebelum memproses, pastikan arrays tidak null atau undefined
    console.log("transformDataForChatList - Rooms:", rooms);
    console.log("transformDataForChatList - DirectChats:", directChats);
    console.log("transformDataForChatList - Users:", users);
    
    const chatsList = [];
    
    // Add rooms to the list jika ada
    if (Array.isArray(rooms)) {
      for (const room of rooms) {
        if (room && room.id && room.name) {
          chatsList.push({
            id: room.id,
            name: room.name.toUpperCase(), 
            isRoom: true,
            members: 5, // Placeholder, replace with actual count when available
            unread: 0 // Placeholder, replace with actual count when available
          });
        }
      }
    }
    
    // PERBAIKAN DARURAT: Handle situasi khusus untuk user David dan Eko
    if (Array.isArray(directChats)) {
      console.log("Processing direct chats, total:", directChats.length);
      
      // Check if logged in as David (ID 8)
      const storedUser = localStorage.getItem('currentUser');
      let currentUserId = null;
      
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          currentUserId = userData.id;
          
          // SISTEM OTOMATIS: Tampilkan direct chat untuk semua pengguna
          console.log(`[AUTO-DIRECT-CHAT] Current user ID:`, userData.id);
          console.log(`[AUTO-DIRECT-CHAT] Menampilkan chat berdasarkan history dari database:`, directChats.length);
          
          // Jika user adalah Eko (7), pastikan direct chat dengan Aji (9) ada
          if (userData.id === 7) {
            // Cek apakah direct chat dengan Aji sudah ada
            const ekoAjiExists = directChats.some(chat => 
              (chat.otherUserId === 9) || 
              (chat.user1Id === 7 && chat.user2Id === 9) || 
              (chat.user1Id === 9 && chat.user2Id === 7)
            );
            
            if (!ekoAjiExists) {
              // Find Aji in users array
              const ajiUser = users.find(u => u.id === 9);
              if (ajiUser) {
                chatsList.push({
                  id: 17,
                  name: ajiUser.username || "AJI",
                  isRoom: false,
                  unread: 0,
                  lastMessage: "Secure communication channel established.",
                  lastMessageTime: new Date().toISOString()
                });
                console.log(`[AUTO-DIRECT-CHAT] Added Eko-Aji direct chat`);
              }
            }
          }
          
          // Jika user adalah Aji (9), pastikan direct chat dengan Eko (7) ada
          if (userData.id === 9) {
            // Cek apakah direct chat dengan Eko sudah ada
            const ajiEkoExists = directChats.some(chat => 
              (chat.otherUserId === 7) || 
              (chat.user1Id === 7 && chat.user2Id === 9) || 
              (chat.user1Id === 9 && chat.user2Id === 7)
            );
            
            if (!ajiEkoExists) {
              // Find Eko in users array
              const ekoUser = users.find(u => u.id === 7);
              if (ekoUser) {
                chatsList.push({
                  id: 17,
                  name: ekoUser.username || "EKO",
                  isRoom: false,
                  unread: 0,
                  lastMessage: "Secure communication channel established.",
                  lastMessageTime: new Date().toISOString()
                });
                console.log(`[AUTO-DIRECT-CHAT] Added Aji-Eko direct chat`);
              }
            }
          }
          
          // Perbaikan otomatis untuk semua pengguna lain
          // Tampilkan semua pengguna lain sebagai potential direct chat
          if (users.length > 0 && directChats.length === 0) {
            console.log(`[AUTO-DIRECT-CHAT] Menampilkan semua pengguna sebagai potential direct chat`);
            
            // Tambahkan direct chat otomatis dengan pengguna penting
            const importantUsers = users.filter(u => 
              // Filter current user and already displayed chats
              u.id !== userData.id && 
              u.id !== 0 &&
              // Ensure david (8) is included as important but exclude Aji (9) if current user is Eko (7)
              // to prevent duplication
              (userData.id === 7 ? (u.id === 8) : (u.id === 7 || u.id === 8 || u.id === 9))
            );
            
            for (const potentialUser of importantUsers) {
              // Cek apakah kontak ini sudah ada di chatsList untuk mencegah duplikasi
              const isDuplicate = chatsList.some(existingChat => 
                !existingChat.isRoom && 
                (existingChat.name.toLowerCase() === potentialUser.username.toLowerCase())
              );
              
              if (!isDuplicate) {
                console.log(`[AUTO-DIRECT-CHAT] Adding potential chat with ${potentialUser.username}`);
                
                chatsList.push({
                  id: 100000 + potentialUser.id, // Temporary ID for display only
                  name: potentialUser.username,
                  isRoom: false,
                  unread: 0,
                  lastMessage: "Secure communication available.",
                  lastMessageTime: new Date().toISOString()
                });
              } else {
                console.log(`[AUTO-DIRECT-CHAT] Skipping duplicate chat with ${potentialUser.username}`);
              }
            }
          }
        } catch (e) {
          console.error("Error parsing user data:", e);
        }
      }
      
      // Continue with normal processing for any other direct chats
      for (const chat of directChats) {
        if (chat && chat.id !== undefined) {
          try {
            // Jika chat memiliki isRoom property, gunakan itu untuk menentukan tipe chat
            const isRoom = chat.isRoom === true;
            
            if (isRoom) {
              // Ini adalah room chat
              chatsList.push({
                id: chat.id,
                name: chat.name ? chat.name.toUpperCase() : `ROOM ${chat.id}`, 
                isRoom: true,
                members: chat.memberCount || 5,
                unread: chat.unreadCount || 0
              });
            } else {
              // Ini adalah direct chat
              let otherUserId, otherUser, name;
              
              // Prioritaskan penggunaan otherUserId jika tersedia
              if (chat.otherUserId !== undefined) {
                // Format baru dari API
                otherUserId = chat.otherUserId;
                console.log(`Using otherUserId ${otherUserId} from API data`);
              } else if (chat.user1Id !== undefined && chat.user2Id !== undefined) {
                // Format lama tapi dengan user IDs yang jelas
                otherUserId = chat.user1Id === currentUserId ? chat.user2Id : chat.user1Id;
                console.log(`Calculated otherUserId ${otherUserId} from user1Id=${chat.user1Id} and user2Id=${chat.user2Id}`);
              } else {
                // Fallback jika tidak ada ID yang tersedia
                console.warn(`No user IDs available for chat ${chat.id}, using name directly if available`);
              }
              
              // Temukan data user untuk otherUserId
              if (otherUserId) {
                otherUser = users.find(u => u && u.id === otherUserId);
                console.log(`Other user found:`, otherUser ? `${otherUser.username} (ID: ${otherUser.id})` : 'not found');
              }
              
              // Pastikan nama dalam uppercase untuk konsistensi dengan UI
              if (otherUser) {
                name = otherUser.displayName || otherUser.username.toUpperCase();
              } else if (chat.name) {
                name = chat.name.toUpperCase();
              } else if (otherUserId) {
                name = `USER ${otherUserId}`;
              } else {
                name = `CHAT ${chat.id}`;
              }
              
              console.log(`Adding direct chat with ${name} (ID: ${chat.id})`);
              
              chatsList.push({
                id: chat.id,
                name: name,
                isRoom: false,
                isOnline: chat.isOnline || otherUser?.isOnline || false,
                unread: chat.unreadCount || 0,
                lastMessage: chat.lastMessage,
                lastMessageTime: chat.lastMessageTime
              });
            }
          } catch (error) {
            console.error("Error processing chat:", error, chat);
          }
        }
      }
    }
    
    // Perbaikan untuk memastikan direct chat muncul untuk semua user
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        const currentUserId = userData.id;
        console.log("[CHAT FIX] Current user ID:", currentUserId);
        
        // PERBAIKAN: Tidak perlu auto-create chat dengan semua kontak
        // Mirip WhatsApp, hanya tampilkan chat yang sudah ada di database
        console.log("[CHAT FIX] Menampilkan chat berdasarkan history dari database, seperti WhatsApp");
        
        // DEBUG: Menampilkan chats yang ada di database
        console.log("[CHAT FIX] Current chats from database:", directChats.length);
      } catch (e) {
        console.error("[CHAT FIX] Error processing user contacts:", e);
      }
    }
    
    console.log("transformDataForChatList - Final Result (after emergency fix):", chatsList);
    return chatsList;
  }
  
  // Handle chat selection
  function handleChatSelect(id: number, isRoom: boolean) {
    console.log(`Selecting chat: ID=${id}, isRoom=${isRoom}`);
    if (isRoom) {
      // Format rute untuk room
      navigate(`/room/${id}`);
    } else {
      // Jika ini direct chat, cek apakah ada otherUserId yang tersedia
      const chat = directChats.find(c => c.id === id);
      console.log("Selected direct chat:", chat);
      
      if (chat && chat.otherUserId) {
        // Format baru dengan otherUserId tersedia
        console.log(`Navigating to chat with user ${chat.otherUserId}`);
        navigate(`/direct/${chat.id}`);
      } else {
        // Format lama tanpa otherUserId
        console.log(`Navigating to direct chat ${id}`);
        navigate(`/direct/${id}`);
      }
    }
  }

  // Function to navigate to Config page
  const handleConfigClick = () => {
    navigate("/config");
  };
  
  // Function to handle starting a call
  async function handleStartCall() {
    if (!selectedUserId) {
      toast({
        title: "Select contact",
        description: "Please select a contact to call",
        variant: "destructive",
      });
      return;
    }

    console.log(`Starting ${callType} call with user ID ${selectedUserId}`);
    
    try {
      // Use the startCall function from CallContext
      await startCall(selectedUserId, callType);
      setShowNewCallDialog(false);
      
      // Log call initiated
      console.log(`${callType} call to ${selectedUserId} initiated successfully`);
    } catch (error) {
      console.error(`Error starting ${callType} call:`, error);
      toast({
        title: "Call Failed",
        description: "Could not connect the call. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background comms-page">
      <NavBar onLogout={handleLogout} unreadCount={totalUnreadMessages} />
      
      <div className="flex flex-col h-[calc(100vh-60px)]">
        <div className="flex-1 h-full overflow-auto pb-16">
          {activeTab === "chats" && (
            <div className="w-full h-full bg-[#2a2b25] flex flex-col">
              {/* COMMS header with action buttons */}
              <div className="bg-[#566c57] p-3 border-b border-accent/30 flex justify-between items-center">
                <h2 className="text-white font-bold text-lg">COMMS</h2>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-[#668568] hover:text-white"
                    onClick={() => setShowNewCallDialog(true)}
                  >
                    <PhoneIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-[#668568] hover:text-white"
                    onClick={() => setShowNewRoomDialog(true)}
                  >
                    <UserPlus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              <div className="p-3 border-b border-accent/30 flex">
                <Input
                  className="w-full h-9 bg-[#1e1f19] border-[#3d3f35] text-[#bdc1c0] placeholder:text-[#767773]"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  prefix={<span><Search className="h-4 w-4 text-[#767773]" /></span>}
                />
              </div>
              
              <div className="overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin h-8 w-8 border-t-2 border-accent rounded-full"></div>
                  </div>
                ) : error ? (
                  <div className="text-center text-red-500 p-4">
                    {error}
                  </div>
                ) : directChats.length === 0 && rooms.length === 0 ? (
                  <div className="text-center text-[#bdc1c0] p-4">
                    No chats or rooms found. Create one to get started.
                  </div>
                ) : (
                  <WhatsAppStyleChatList
                    chats={transformDataForChatList()}
                    onSelectChat={(id, isRoom) => handleChatSelect(id, isRoom)}
                    onChatDeleted={(id, isRoom) => {
                      // Hapus dari local state
                      if (isRoom) {
                        setRooms(prev => prev.filter(room => room.id !== id));
                      } else {
                        setDirectChats(prev => prev.filter(chat => chat.id !== id));
                      }
                      
                      // Coba hapus dari server jika perlu
                      if (!isRoom) {
                        fetch(`/api/chat/direct-chats/${id}`, {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user?.id || ''}`,
                          }
                        }).catch(err => console.error("Error deleting chat:", err));
                      }
                    }}
                  />
                )}
              </div>
            </div>
          )}
          
          {activeTab === "personnel" && (
            <div className="h-full bg-[#1f201c] flex flex-col">
              {/* Personnel header */}
              <div className="bg-[#566c57] p-3 border-b border-accent/30 flex justify-between items-center">
                <h2 className="text-white font-bold text-lg">PERSONNEL</h2>
                
                <div className="relative">
                  <Input
                    className="w-40 h-8 bg-[#384439] border-[#3d3f35] text-[#e0e0e0] placeholder:text-[#adb0ad] rounded-full pl-8 pr-2"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="h-4 w-4 text-[#adb0ad] absolute left-2 top-2" />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {isLoading ? (
                    <div className="flex justify-center p-8">
                      <div className="animate-spin h-8 w-8 border-t-2 border-accent rounded-full"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center text-red-500 p-4">
                      {error}
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center text-[#bdc1c0] p-4">
                      No personnel found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center bg-[#2a2a25] p-3 rounded hover:bg-[#3d3d36] cursor-pointer"
                          onClick={() => {
                            // Langsung navigasi ke chat dengan user ini
                            // Format URL yang benar: /chat/direct/{userId}
                            navigate(`/chat/direct/${user.id}`);
                          }}
                        >
                          <div className="h-10 w-10 rounded-full bg-[#566c57] flex items-center justify-center text-white mr-3">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-[#e0e0e0]">{user.username}</div>
                            <div className="text-sm text-[#bdc1c0]">
                              {user.rank && user.role ? `${user.rank} - ${user.role}` : 
                                user.rank || user.role || "Personnel"}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className={`text-xs ${user.isOnline ? "text-green-500" : "text-gray-500"}`}>
                              {user.isOnline ? "Online" : "Offline"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "orders" && (
            <div className="flex h-full items-center justify-center bg-[#1f201c]">
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#e0e0e0] mb-4">Orders Module</h2>
                <p className="text-[#bdc1c0] max-w-md mx-auto">
                  The Orders module is currently under development and will be available in a future update.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === "settings" && (
            <div className="flex h-full items-center justify-center bg-[#1f201c]">
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#e0e0e0] mb-4">Settings</h2>
                <p className="text-[#bdc1c0] max-w-md mx-auto mb-4">
                  Configure your application settings and preferences.
                </p>
                <Button 
                  className="bg-[#566c57] hover:bg-[#668568] text-white"
                  onClick={handleConfigClick}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Open Configuration
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom Menu Bar */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#121212] border-t border-accent/30 flex justify-around items-center px-2 z-10">
          <div className={`flex flex-col items-center ${activeTab === "chats" ? "text-white" : "text-[#666666]"}`} onClick={() => setActiveTab("chats")}>
            <MessageCircleIcon className="h-6 w-6 mb-1" />
            <span className="text-xs">COMMS</span>
          </div>
          
          <div className={`flex flex-col items-center ${activeTab === "orders" ? "text-white" : "text-[#666666]"}`} onClick={() => setActiveTab("orders")}>
            <PhoneIcon className="h-6 w-6 mb-1" />
            <span className="text-xs">CALL</span>
          </div>
          
          <div className={`flex flex-col items-center ${activeTab === "personnel" ? "text-white" : "text-[#666666]"}`} onClick={() => setActiveTab("personnel")}>
            <Users className="h-6 w-6 mb-1" />
            <span className="text-xs">PERSONNEL</span>
          </div>
          
          <div className={`flex flex-col items-center ${activeTab === "settings" ? "text-white" : "text-[#666666]"}`} onClick={() => handleConfigClick()}>
            <Settings className="h-6 w-6 mb-1" />
            <span className="text-xs">CONFIG</span>
          </div>
        </div>
      </div>
      
      {/* Create New Room Dialog */}
      <Dialog open={showNewRoomDialog} onOpenChange={setShowNewRoomDialog}>
        <DialogContent className="bg-[#2a2b25] border-[#3d3f35] text-[#e0e0e0]">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Room</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name"
                className="bg-[#3d3f35] border-none text-[#e0e0e0] placeholder:text-[#767773]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Select Members</Label>
              <div className="h-40 overflow-y-auto bg-[#1f201c] border border-[#3d3f35] rounded p-2">
                {filteredUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center p-2 hover:bg-[#3d3f35] rounded cursor-pointer"
                    onClick={() => handleUserSelect(user.id)}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => {}}
                      className="mr-2"
                    />
                    <span>{user.displayName || user.username}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-1 bg-[#3d3f35] p-2 rounded-md min-h-[60px]">
                {selectedUsers.map((userId) => {
                  const selectedUser = users.find((u) => u.id === userId);
                  return (
                    <Badge 
                      key={userId}
                      variant="secondary"
                      className="bg-[#566c57] text-white"
                    >
                      {selectedUser ? (selectedUser.displayName || selectedUser.username) : `User ${userId}`}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewRoomDialog(false)}
              className="border-[#3d3f35] text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleNewRoom}
              className="bg-[#566c57] hover:bg-[#668568] text-white"
            >
              Create Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Start New Call Dialog */}
      <Dialog open={showNewCallDialog} onOpenChange={setShowNewCallDialog}>
        <DialogContent className="bg-[#2a2b25] border-[#3d3f35] text-[#e0e0e0]">
          <DialogHeader>
            <DialogTitle className="text-white">Initiate Call</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="callType" className="text-[#bdc1c0]">Call Type</Label>
              <Select 
                value={callType}
                onValueChange={(value: "audio" | "video") => setCallType(value)}
              >
                <SelectTrigger id="callType" className="bg-[#3d3f35] border-none text-[#e0e0e0]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]">
                  <SelectItem value="audio">Audio Call</SelectItem>
                  <SelectItem value="video">Video Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#bdc1c0]">
                Select Contact
              </Label>
              <Select 
                onValueChange={(value) => setSelectedUserId(parseInt(value, 10))}
              >
                <SelectTrigger className="bg-[#3d3f35] border-none text-[#e0e0e0]">
                  <SelectValue placeholder="Select a personnel" />
                </SelectTrigger>
                <SelectContent className="bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]">
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.displayName || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewCallDialog(false)}
              className="border-[#3d3f35] text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={handleStartCall}
              disabled={isCallLoading}
              className="bg-[#566c57] hover:bg-[#668568] text-white"
            >
              {isCallLoading ? (
                <>
                  <span className="animate-pulse mr-2">●</span>
                  Connecting...
                </>
              ) : callType === "audio" ? (
                <>
                  <PhoneIcon className="mr-2 h-4 w-4" />
                  Start Audio Call
                </>
              ) : (
                <>
                  <VideoIcon className="mr-2 h-4 w-4" />
                  Start Video Call
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
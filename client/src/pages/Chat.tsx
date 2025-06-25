import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, PhoneIcon, Settings, Plus, User, 
  ArrowLeft, PaperclipIcon, SendIcon, Users, Search, Info, FileText,
  Upload, Camera, X
} from 'lucide-react';
import ChatList from '../components/ChatList';
import chatIcon from '@assets/Icon Chat NXXZ.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import ChatRoom from '../components/ChatRoom';
import IncomingCallModal from '../components/IncomingCallModal';
import GroupCall from '../components/GroupCall';
import GroupVideoCall from '../components/GroupVideoCall';
import CallHistory from '../components/CallHistory';
import { useCall } from '../hooks/useCall';
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Chat() {
  const [user, setUser] = useState<any>(null);
  const [, navigate] = useLocation();
  const { activeCall } = useCall();
  const { toast } = useToast();
  const [activeChat, setActiveChat] = useState<{ id: number; isGroup: boolean } | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [databaseMessages, setDatabaseMessages] = useState<any[]>([]);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messageInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // View management
  const [activeView, setActiveView] = useState<'chats' | 'calls' | 'lapsit' | 'personnel' | 'config'>('chats');
  
  // Personnel state
  const [filterText, setFilterText] = useState("");
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);
  
  // State untuk loading status
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  // Lapsit states
  const [showLapsitCategoryModal, setShowLapsitCategoryModal] = useState(false);
  const [showLapsitSubCategoryModal, setShowLapsitSubCategoryModal] = useState(false);
  const [showLapsitReportForm, setShowLapsitReportForm] = useState(false);
  const [selectedLapsitCategory, setSelectedLapsitCategory] = useState<any>(null);
  const [selectedLapsitSubCategory, setSelectedLapsitSubCategory] = useState<any>(null);
  const [lapsitReportData, setLapsitReportData] = useState({
    title: '',
    content: '',
    location: '',
    priority: 'normal',
    classification: 'UNCLASSIFIED'
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lapsitReports, setLapsitReports] = useState<any[]>([]);
  
  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle camera capture
  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera
    input.onchange = handleImageSelect;
    input.click();
  };

  // Handle report submission
  const handleSubmitLapsitReport = async () => {
    if (!lapsitReportData.title || !lapsitReportData.content) {
      toast({
        title: "Error",
        description: "Judul dan isi laporan harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Upload image if exists
      let attachmentUrl = null;
      if (selectedImage) {
        // For now, we'll skip image upload and implement it later
        console.log('Image selected but upload not implemented yet:', selectedImage.name);
      }

      const reportPayload = {
        categoryId: selectedLapsitCategory.id,
        subCategoryId: null, // Will be mapped from database
        title: lapsitReportData.title,
        content: lapsitReportData.content,
        priority: lapsitReportData.priority,
        classification: lapsitReportData.classification,
        location: lapsitReportData.location || null,
        attachmentUrl: attachmentUrl
      };

      const formData = new FormData();
      formData.append('categoryId', selectedLapsitCategory.id.toString());
      formData.append('title', lapsitReportData.title);
      formData.append('content', lapsitReportData.content);
      formData.append('priority', lapsitReportData.priority);
      formData.append('classification', lapsitReportData.classification);
      if (lapsitReportData.location) {
        formData.append('location', lapsitReportData.location);
      }
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch('/api/lapsit/reports', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Berhasil",
          description: "Laporan situasi berhasil dibuat",
        });
        
        // Reset form
        setShowLapsitReportForm(false);
        setSelectedLapsitCategory(null);
        setSelectedLapsitSubCategory(null);
        setLapsitReportData({
          title: '',
          content: '',
          location: '',
          priority: 'normal',
          classification: 'UNCLASSIFIED'
        });
        setSelectedImage(null);
        setImagePreview(null);
        
        // Reload reports to show the new one
        loadLapsitReports();
      }
    } catch (error) {
      console.error('Error submitting lapsit report:', error);
      toast({
        title: "Error",
        description: "Gagal membuat laporan situasi",
        variant: "destructive",
      });
    }
  };
  
  // Load lapsit reports
  const loadLapsitReports = async () => {
    try {
      console.log('Loading lapsit reports...');
      const reports = await apiRequest('/api/lapsit/reports');
      console.log('Loaded reports:', reports);
      setLapsitReports(reports || []);
    } catch (error) {
      console.error('Error loading lapsit reports:', error);
      setLapsitReports([]);
    }
  };

  // State untuk WebSocket
  const [wsConnected, setWsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessageId, setLastMessageId] = useState<number>(0);
  
  // Dialog states
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [showNewDirectChatDialog, setShowNewDirectChatDialog] = useState(false);
  const [showNewChatMenu, setShowNewChatMenu] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  // Profile and Group management states
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<number | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // State untuk melacak ID pesan terakhir
  const lastMessageIdRef = useRef<number | null>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  
  // Authentication check
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log("User data from session:", userData);
          setUser(userData);
          
          // Load chats data
          fetchUserChats(userData.id);
          fetchAllUsers();
        } else {
          console.error('Failed to get user session, redirecting to login');
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        window.location.href = '/login';
      }
    }
    
    checkAuth();
  }, []);

  // Load lapsit reports when lapsit view is active
  useEffect(() => {
    if (activeView === 'lapsit') {
      loadLapsitReports();
    }
  }, [activeView]);
  
  // Fetch user chats
  const fetchUserChats = async (userId: number) => {
    try {
      setChats([]);
      
      let allChats: any[] = [];
      
      // 1. Fetch all conversations (direct and group chats)
      try {
        console.log('Fetching all conversations for user ID:', userId);
        const conversationsUrl = `/api/conversations`;
        
        const conversationsResponse = await fetch(conversationsUrl, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          },
          cache: 'no-cache'
        });
        
        if (conversationsResponse.ok) {
          const conversations = await conversationsResponse.json();
          console.log('All conversations from server:', conversations);
          
          if (conversations && Array.isArray(conversations)) {
            // Save all conversations for processing
            allChats = [...allChats, ...conversations];
          }
        }
      } catch (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
      }
      
      // 2. Fetch direct chats (as backup if conversations API doesn't return all chats)
      try {
        console.log('Fetching direct chats from server for user ID:', userId);
        const directChatUrl = `/api/direct-chats`;
        
        const directChatsResponse = await fetch(directChatUrl, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          },
          cache: 'no-cache'
        });
        
        if (directChatsResponse.ok) {
          const directChats = await directChatsResponse.json();
          if (directChats && Array.isArray(directChats)) {
            console.log(`Fetched ${directChats.length} direct chats from server`);
            
            // Transform direct chats to match ChatList component format
            const formattedDirectChats = directChats.map(chat => ({
              id: chat.id,
              name: chat.name || `Chat ${chat.id}`,
              isGroup: false,
              lastMessage: chat.lastMessage || "",
              lastMessageTime: chat.lastMessageTime || chat.createdAt,
              unread: chat.unread || 0,
              otherUserId: chat.otherUserId
            }));
            
            // Add direct chats that aren't already in the allChats array
            formattedDirectChats.forEach(directChat => {
              if (!allChats.some(chat => chat.id === directChat.id)) {
                allChats.push(directChat);
              }
            });
          }
        }
      } catch (directChatError) {
        console.error('Error fetching direct chats:', directChatError);
      }
      
      // 2. Fetch group chats/rooms
      try {
        console.log('Fetching group chats/rooms for user ID:', userId);
        const roomsUrl = `/api/rooms`;
        
        const roomsResponse = await fetch(roomsUrl, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          },
          cache: 'no-cache'
        });
        
        if (roomsResponse.ok) {
          const rooms = await roomsResponse.json();
          if (rooms && Array.isArray(rooms)) {
            console.log(`Fetched ${rooms.length} group chats/rooms`);
            
            // Format rooms to match chat format
            const formattedRooms = rooms.map(room => ({
              id: room.id,
              name: room.name || 'Group Chat',
              isGroup: true,
              lastMessage: room.lastMessage || "Room created",
              lastMessageTime: room.lastMessageTime || room.createdAt,
              unread: room.unread || 0,
              memberCount: room.memberCount || 0
            }));
            
            allChats = [...allChats, ...formattedRooms];
          }
        }
      } catch (roomsError) {
        console.error('Error fetching rooms:', roomsError);
      }
      
      // Update state with fetched chats
      setChats(allChats);
      
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };
  
  // Fetch all users for personnel list
  const fetchAllUsers = async () => {
    try {
      setIsLoadingPersonnel(true);
      const response = await fetch('/api/all-users', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Fetched ${data.length} users for personnel list`);
        setAllUsers(data);
      } else {
        console.error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching all users:', error);
    } finally {
      setIsLoadingPersonnel(false);
    }
  };
  
  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: number) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const messages = await response.json();
        setDatabaseMessages(messages);
      } else {
        console.error('Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Start a direct chat with another user
  const handleStartDirectChat = async (otherUserId: number) => {
    if (!user) return;
    
    try {
      setIsCreatingChat(true);
      
      // Find the user we want to chat with
      const otherUser = allUsers.find(u => u.id === otherUserId);
      if (!otherUser) {
        console.error(`Cannot find user with ID ${otherUserId}`);
        return;
      }
      
      // First check if we already have a direct chat with this user
      const existingChat = chats.find(
        chat => !chat.isGroup && chat.otherUserId === otherUserId
      );
      
      if (existingChat) {
        console.log(`Direct chat with user ${otherUserId} already exists, opening existing chat`);
        setActiveChat({ id: existingChat.id, isGroup: false });
        setShowChatRoom(true);
        setActiveView('chats');
        setShowNewDirectChatDialog(false);
        setSelectedUserId(null);
        return;
      }
      
      // Create a new direct chat
      console.log(`Creating new direct chat with user ${otherUserId}`);
      const response = await fetch('/api/direct-chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          otherUserId: Number(otherUserId) // Pastikan ini adalah number
        })
      });
      
      if (!response.ok) {
        console.error(`Failed to create direct chat: ${response.status}`);
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`Failed to create direct chat: ${errorText}`);
      }
      
      const newChat = await response.json();
      console.log('Direct chat created successfully:', newChat);
      
      // Refresh chat list
      fetchUserChats(user.id);
      setShowNewDirectChatDialog(false);
      setSelectedUserId(null);
      
      // Buka chat baru yang dibuat
      if (newChat && newChat.id) {
        setActiveChat({ id: newChat.id, isGroup: false });
        setShowChatRoom(true);
        setActiveView('chats');
        fetchMessagesForChat(newChat.id, false);
      }
    } catch (error) {
      console.error('Error creating direct chat:', error);
      alert('Gagal membuat chat. Silakan coba lagi.');
    } finally {
      setIsCreatingChat(false);
      setShowNewDirectChatDialog(false);
    }
  };
  
  // Create a new group chat
  const handleCreateGroupChat = async () => {
    if (!user || !newGroupName || selectedUserIds.length === 0 || isCreatingChat) return;
    
    try {
      setIsCreatingChat(true);
      
      // Create the room
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newGroupName,
          isGroup: true,
          members: [user.id, ...selectedUserIds]
        })
      });
      
      if (response.ok) {
        const newGroup = await response.json();
        
        // Add this group to our list
        const formattedGroup = {
          id: newGroup.id,
          name: newGroupName,
          isGroup: true,
          lastMessage: "Group created",
          lastMessageTime: new Date().toISOString(),
          unread: 0,
          memberCount: selectedUserIds.length + 1
        };
        
        // Update chats list
        const updatedChats = [...chats, formattedGroup];
        setChats(updatedChats);
        
        // Open the new group
        setActiveChat({ id: newGroup.id, isGroup: true });
        setShowChatRoom(true);
        setActiveView('chats');
        
        // Refresh chat list to get the new group
        fetchUserChats(user.id);
        
        // Reset state
        setNewGroupName("");
        setSelectedUserIds([]);
      } else {
        console.error(`Failed to create group: ${response.status} ${response.statusText}`);
        alert("Failed to create group. Please try again.");
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsCreatingChat(false);
      setShowNewGroupDialog(false);
    }
  };
  
  // Handle selecting a chat
  const handleSelectChat = (id: number, isGroup: boolean) => {
    console.log(`Selecting chat: id=${id}, isGroup=${isGroup}`);
    setActiveChat({ id, isGroup });
    setShowChatRoom(true);
    
    // Jika kita memiliki chat aktif, kita harus memuat pesan-pesan untuk chat tersebut
    if (id) {
      fetchMessagesForChat(id, isGroup);
    }
  };
  
  // Fungsi untuk mengambil pesan-pesan untuk chat tertentu
  const fetchMessagesForChat = async (chatId: number, isGroup: boolean) => {
    try {
      setIsLoadingMessages(true);
      console.log(`Fetching messages for chat ID: ${chatId}, isGroup: ${isGroup}`);
      
      // Buat endpoint sesuai tipe chat
      const endpoint = `/api/conversations/${chatId}/messages`;
      
      const response = await fetch(endpoint, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const messages = await response.json();
        console.log(`Fetched ${messages.length} messages for chat ${chatId}`);
        
        // Format pesan-pesan untuk tampilan
        const formattedMessages = messages.map((msg: any) => ({
          id: msg.id,
          chatId: chatId,
          senderId: msg.senderId,
          content: msg.content,
          timestamp: msg.createdAt,
          isRead: msg.isRead || false
        }));
        
        // Update state pesan
        setDatabaseMessages(formattedMessages);
      } else {
        console.error(`Failed to fetch messages: ${response.status}`);
        setDatabaseMessages([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setDatabaseMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  // Handle going back to chat list
  const handleBackToList = () => {
    setActiveChat(null);
    setShowChatRoom(false);
    setDatabaseMessages([]);
  };
  
  // View switchers
  const handleShowChats = () => {
    setActiveView('chats');
    setShowChatRoom(false);
  };
  
  const handleShowCalls = () => {
    setActiveView('calls');
  };
  
  const handleShowLapsit = () => {
    setActiveView('lapsit');
  };
  
  const handleShowPersonnel = () => {
    setActiveView('personnel');
    fetchAllUsers(); // Refresh personnel list
  };
  
  const handleShowConfig = () => {
    setActiveView('config');
  };
  
  // Fungsi untuk mengirim pesan
  const handleSendMessage = async () => {
    if (!activeChat || !newMessage.trim() || !user) return;
    
    try {
      console.log(`Mengirim pesan ke chat ${activeChat.id} (${activeChat.isGroup ? 'Group' : 'Direct'}): ${newMessage}`);
      
      // Tambahkan pesan lokal terlebih dahulu untuk UX yang responsif
      const tempId = Date.now();
      const tempMessage = {
        id: tempId,
        chatId: activeChat.id,
        senderId: user.id,
        content: newMessage,
        timestamp: new Date().toISOString(),
        isRead: false,
        isSending: true // Flag untuk menandai bahwa pesan sedang dikirim
      };
      
      // Update tampilan dengan pesan baru
      setDatabaseMessages(prev => [...prev, tempMessage]);
      
      // Reset input
      setNewMessage('');
      
      // Kirim pesan ke server
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: activeChat.id,
          content: tempMessage.content
        })
      });
      
      if (response.ok) {
        const sentMessage = await response.json();
        console.log('Pesan berhasil dikirim:', sentMessage);
        
        // Update message list dengan mengganti pesan sementara dengan pesan yang benar dari server
        setDatabaseMessages(prev => prev.map(msg => 
          msg.id === tempId ? { 
            ...msg, 
            id: sentMessage.id,
            timestamp: sentMessage.createdAt,
            isSending: false
          } : msg
        ));
        
        // Refresh chat list untuk memperbarui pesan terakhir
        fetchUserChats(user.id);
      } else {
        console.error(`Failed to send message: ${response.status}`);
        
        // Tandai pesan sebagai gagal kirim
        setDatabaseMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, isSending: false, isError: true } : msg
        ));
      }
    } catch (error) {
      console.error('Error mengirim pesan:', error);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' 
      });
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-black text-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center p-3 bg-[#1a1a1a] border-b border-[#333] h-16">
        <div className="flex items-center">
          <img src={chatIcon} alt="NXZZ" className="h-8 w-8 mr-2" />
          <h1 className="text-2xl font-bold text-[#8d9c6b]">NXZZ-VComm</h1>
        </div>
        
        <div className="flex space-x-2">
          {user && (
            <div className="flex items-center">
              <span className="mr-2 text-sm hidden md:inline">{user.callsign || user.firstName}</span>
              <Avatar className="h-8 w-8 bg-[#2d3328] text-[#8d9c6b]">
                <AvatarFallback>{user.callsign ? user.callsign[0].toUpperCase() : (user.firstName ? user.firstName[0].toUpperCase() : 'U')}</AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex flex-col w-16 bg-[#1a1a1a] border-r border-[#333]">
          <div className="flex flex-col items-center space-y-6 mt-6">
            <button 
              className={`p-3 rounded-lg ${activeView === 'chats' ? 'bg-[#2d3328] text-[#8d9c6b]' : 'text-gray-500 hover:bg-[#262626]'}`}
              onClick={handleShowChats}
            >
              <MessageSquare className="h-6 w-6" />
            </button>
            
            <button 
              className={`p-3 rounded-lg ${activeView === 'calls' ? 'bg-[#2d3328] text-[#8d9c6b]' : 'text-gray-500 hover:bg-[#262626]'}`}
              onClick={handleShowCalls}
            >
              <PhoneIcon className="h-6 w-6" />
            </button>
            
            <button 
              className={`p-3 rounded-lg ${activeView === 'lapsit' ? 'bg-[#2d3328] text-[#8d9c6b]' : 'text-gray-500 hover:bg-[#262626]'}`}
              onClick={handleShowLapsit}
            >
              <FileText className="h-6 w-6" />
            </button>
            
            <button 
              className={`p-3 rounded-lg ${activeView === 'personnel' ? 'bg-[#2d3328] text-[#8d9c6b]' : 'text-gray-500 hover:bg-[#262626]'}`}
              onClick={handleShowPersonnel}
            >
              <User className="h-6 w-6" />
            </button>
            
            <button 
              className={`p-3 rounded-lg ${activeView === 'config' ? 'bg-[#2d3328] text-[#8d9c6b]' : 'text-gray-500 hover:bg-[#262626]'}`}
              onClick={handleShowConfig}
            >
              <Settings className="h-6 w-6" />
            </button>
          </div>
          
          <div className="mt-auto mb-6 flex justify-center">
            <button 
              className="p-3 text-red-500 hover:bg-[#2d2121] rounded-lg"
              onClick={handleLogout}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#333] flex justify-around p-2 z-10">
          <button 
            className={`p-3 rounded-lg ${activeView === 'chats' ? 'text-[#8d9c6b]' : 'text-gray-500'}`}
            onClick={handleShowChats}
          >
            <MessageSquare className="h-6 w-6" />
          </button>
          
          <button 
            className={`p-3 rounded-lg ${activeView === 'calls' ? 'text-[#8d9c6b]' : 'text-gray-500'}`}
            onClick={handleShowCalls}
          >
            <PhoneIcon className="h-6 w-6" />
          </button>
          
          <button 
            className={`p-3 rounded-lg ${activeView === 'lapsit' ? 'text-[#8d9c6b]' : 'text-gray-500'}`}
            onClick={handleShowLapsit}
          >
            <FileText className="h-6 w-6" />
          </button>
          
          <button 
            className={`p-3 rounded-lg ${activeView === 'personnel' ? 'text-[#8d9c6b]' : 'text-gray-500'}`}
            onClick={handleShowPersonnel}
          >
            <User className="h-6 w-6" />
          </button>
          
          <button 
            className={`p-3 rounded-lg ${activeView === 'config' ? 'text-[#8d9c6b]' : 'text-gray-500'}`}
            onClick={handleShowConfig}
          >
            <Settings className="h-6 w-6" />
          </button>
        </div>
        
        {/* Main View Area */}
        <div className="flex-1 flex flex-col bg-[#111]">
          {/* Chat View */}
          {activeView === 'chats' && (
            <>
              {!showChatRoom ? (
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center p-4 border-b border-[#333]">
                    <h2 className="text-xl font-semibold text-[#8d9c6b]">Chat</h2>
                    <Button 
                      variant="outline" 
                      className="bg-[#2d3328] text-[#8d9c6b] border-none hover:bg-[#3d4338]"
                      onClick={() => setShowNewChatMenu(true)}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    <ChatList 
                      activeChat={activeChat}
                      onSelectChat={handleSelectChat}
                      onChatDeleted={async (id, isGroup) => {
                        try {
                          const response = await apiRequest('POST', `/api/conversations/${id}/delete`);
                          
                          console.log(`Chat ${id} berhasil dihapus`);
                          // Invalidate and refetch chat lists to update UI immediately
                          queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/direct-chats'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
                          
                          // If this is the active chat, navigate back to chat list
                          if (activeChat?.id === id) {
                            setActiveChat(null);
                            setShowChatRoom(false);
                          }
                        } catch (error) {
                          console.error('Error menghapus chat:', error);
                          alert('Terjadi kesalahan saat menghapus chat');
                        }
                      }}
                      onClearChatHistory={async (id, isGroup) => {
                        try {
                          const response = await apiRequest('POST', `/api/conversations/${id}/clear`);
                          
                          console.log(`Riwayat chat ${id} berhasil dibersihkan`);
                          // Invalidate and refetch messages for immediate update
                          if (activeChat?.id === id) {
                            queryClient.invalidateQueries({ queryKey: [`/api/conversations/${id}/messages`] });
                          }
                          // Also invalidate conversation list to update last message
                          queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/direct-chats'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
                        } catch (error) {
                          console.error('Error membersihkan riwayat chat:', error);
                          alert('Terjadi kesalahan saat membersihkan riwayat chat');
                        }
                      }}
                      onCreateGroup={() => setShowNewGroupDialog(true)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {activeChat && (
                    <ChatRoom 
                      chatId={activeChat.id} 
                      isGroup={activeChat.isGroup} 
                      onBack={handleBackToList}
                    />
                  )}
                </div>
              )}
            </>
          )}
          
          {/* Call View */}
          {activeView === 'calls' && (
            <CallHistory onBack={() => setActiveView('chats')} />
          )}
          
          {/* Lapsit View */}
          {activeView === 'lapsit' && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center p-4 border-b border-[#333]">
                <h2 className="text-xl font-semibold text-[#8d9c6b]">Laporan Situasi</h2>
                <Button 
                  size="sm" 
                  className="bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338]"
                  onClick={() => setShowLapsitCategoryModal(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Buat Laporan
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <Button 
                      onClick={loadLapsitReports}
                      variant="outline"
                      size="sm"
                      className="border-[#333] text-gray-300 hover:bg-[#262626]"
                    >
                      🔄 Refresh Laporan
                    </Button>
                    <span className="ml-2 text-xs text-gray-500">
                      Total: {lapsitReports.length} laporan
                    </span>
                  </div>
                  <Button 
                    className="bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338]"
                    onClick={() => setShowLapsitCategoryModal(true)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Laporan Baru
                  </Button>
                </div>
                
                {lapsitReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="max-w-md">
                      <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">Belum Ada Laporan Situasi</h3>
                      <p className="text-sm text-gray-500 mb-6">
                        Mulai buat laporan situasi pertama Anda untuk melacak kejadian di lapangan.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lapsitReports.map((report) => (
                      <div key={report.id} className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333] hover:border-[#8d9c6b] transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-[#8d9c6b]">{report.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${
                            report.priority === 'urgent' ? 'bg-red-900 text-red-200' :
                            report.priority === 'high' ? 'bg-orange-900 text-orange-200' :
                            report.priority === 'normal' ? 'bg-blue-900 text-blue-200' :
                            'bg-green-900 text-green-200'
                          }`}>
                            {report.priority?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">
                          {report.content}
                        </p>
                        {report.location && (
                          <p className="text-xs text-gray-500 mb-2">
                            📍 {report.location}
                          </p>
                        )}
                        {report.classification && (
                          <p className="text-xs text-yellow-400 mb-2">
                            🔒 {report.classification}
                          </p>
                        )}
                        {report.attachmentUrl && (
                          <div className="mb-2">
                            <img 
                              src={report.attachmentUrl} 
                              alt={report.attachmentName || 'Attachment'}
                              className="max-w-full max-h-32 rounded border border-[#333] cursor-pointer hover:border-[#8d9c6b]"
                              onClick={() => window.open(report.attachmentUrl, '_blank')}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              📎 {report.attachmentName}
                            </p>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{report.categoryName} {report.subCategoryName && `- ${report.subCategoryName}`}</span>
                          <span>oleh {report.reporterCallsign}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(report.createdAt).toLocaleString('id-ID')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Personnel/Users View */}
          {activeView === 'personnel' && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center p-4 border-b border-[#333]">
                <h2 className="text-xl font-semibold text-[#8d9c6b]">Personel</h2>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input 
                    className="pl-8 bg-[#262626] border-[#333] text-gray-300 w-[200px]"
                    placeholder="Cari personel..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {isLoadingPersonnel ? (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-gray-400">Memuat daftar personel...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allUsers
                      .filter(u => u.id !== user?.id) // Exclude current user
                      .filter(personnel => {
                        // Filter berdasarkan input pencarian
                        if (!filterText) return true;
                        return (
                          (personnel.callsign && personnel.callsign.toLowerCase().includes(filterText.toLowerCase())) ||
                          (personnel.firstName && personnel.firstName.toLowerCase().includes(filterText.toLowerCase())) ||
                          (personnel.lastName && personnel.lastName.toLowerCase().includes(filterText.toLowerCase())) ||
                          (personnel.rank && personnel.rank.toLowerCase().includes(filterText.toLowerCase())) ||
                          (personnel.branch && personnel.branch.toLowerCase().includes(filterText.toLowerCase()))
                        );
                      })
                      .map(personnel => (
                        <div key={personnel.id} className="bg-[#1a1a1a] rounded-lg p-3 border border-[#333] hover:border-[#8d9c6b] transition-colors">
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-12 w-12 bg-[#2d3328] text-[#8d9c6b]">
                              <AvatarFallback>{personnel.callsign ? personnel.callsign[0].toUpperCase() : (personnel.firstName ? personnel.firstName[0].toUpperCase() : 'U')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-semibold text-[#8d9c6b]">{personnel.callsign || "Unnamed"}</h3>
                                  <p className="text-xs text-gray-400">
                                    {personnel.rank && <span className="mr-1">{personnel.rank}</span>}
                                    {personnel.firstName} {personnel.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {personnel.branch && <span className="mr-1">{personnel.branch}</span>}
                                    {personnel.nrp && <span>NRP: {personnel.nrp}</span>}
                                  </p>
                                </div>
                                <Badge className="bg-[#2d3328] text-[#8d9c6b]">
                                  {personnel.status || "Aktif"}
                                </Badge>
                              </div>
                              <div className="flex justify-end mt-2">
                                <Button 
                                  size="sm" 
                                  className="bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338] mt-2 self-end"
                                  onClick={() => handleStartDirectChat(personnel.id)}
                                  disabled={isCreatingChat}
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  Chat
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Config View */}
          {activeView === 'config' && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center p-4 border-b border-[#333]">
                <h2 className="text-xl font-semibold text-[#8d9c6b]">Pengaturan</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-medium text-[#8d9c6b] mb-2">Profil Pengguna</h3>
                  {user && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16 bg-[#2d3328] text-[#8d9c6b]">
                          <AvatarFallback>{user.callsign?.[0] || user.firstName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-[#8d9c6b]">{user.callsign}</h4>
                          <p className="text-sm text-gray-400">
                            {user.rank} {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.branch} • NRP: {user.nrp}
                          </p>
                        </div>
                      </div>
                      
                      <Separator className="bg-[#333]" />
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Informasi Kontak</h4>
                        <p className="text-sm">
                          <span className="text-gray-500">Email:</span> {user.email || 'Tidak tersedia'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-medium text-[#8d9c6b] mb-2">Pengaturan Aplikasi</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Status</label>
                      <Select defaultValue="active">
                        <SelectTrigger className="bg-[#262626] border-[#333] text-gray-300">
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#262626] border-[#333] text-gray-300">
                          <SelectItem value="active">Aktif</SelectItem>
                          <SelectItem value="busy">Sibuk</SelectItem>
                          <SelectItem value="away">Tidak di tempat</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Tema</label>
                      <Select defaultValue="dark">
                        <SelectTrigger className="bg-[#262626] border-[#333] text-gray-300">
                          <SelectValue placeholder="Pilih tema" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#262626] border-[#333] text-gray-300">
                          <SelectItem value="dark">Gelap (Default)</SelectItem>
                          <SelectItem value="high-contrast">Kontras Tinggi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-medium text-[#8d9c6b] mb-2">Test Audio & Video</h3>
                  <p className="text-sm text-gray-400 mb-3">Uji fungsi mikrofon dan speaker Anda</p>
                  <Button 
                    className="w-full bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338]"
                    onClick={() => navigate('/settings')}
                  >
                    Buka Test Audio
                  </Button>
                </div>
                
                <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-medium text-[#8d9c6b] mb-2">Keamanan</h3>
                  <Button className="w-full bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338]">
                    Ubah Kata Sandi
                  </Button>
                </div>
                
                <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-medium text-[#8d9c6b] mb-2">Sesi</h3>
                  <Button 
                    variant="destructive" 
                    className="w-full bg-[#3b2828] text-red-400 hover:bg-[#4b3434]"
                    onClick={handleLogout}
                  >
                    Keluar
                  </Button>
                </div>
                
                <div className="text-center text-xs text-gray-600 mt-6">
                  <p>NXZZ-VComm v1.0</p>
                  <p>© {new Date().getFullYear()} Restricted Military Use</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* New Chat Menu Dialog */}
      <Dialog open={showNewChatMenu} onOpenChange={setShowNewChatMenu}>
        <DialogContent className="bg-[#1a1a1a] text-white border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">Pesan Baru</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col space-y-3 mt-4">
            <Button 
              className="bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338] justify-start"
              onClick={() => {
                setShowNewChatMenu(false);
                setShowNewDirectChatDialog(true);
              }}
            >
              <User className="mr-2 h-5 w-5" />
              Chat Langsung dengan Personel
            </Button>
            
            <Button 
              className="bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338] justify-start"
              onClick={() => {
                setShowNewChatMenu(false);
                setShowNewGroupDialog(true);
              }}
            >
              <Users className="mr-2 h-5 w-5" />
              Buat Grup Baru
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* New Direct Chat Dialog */}
      <Dialog open={showNewDirectChatDialog} onOpenChange={setShowNewDirectChatDialog}>
        <DialogContent className="bg-[#1a1a1a] text-white border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">Chat Langsung</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm mb-1 block">Pilih Personel</label>
              <select 
                className="w-full bg-[#262626] border border-[#333] rounded-md p-2 focus:border-[#8d9c6b] focus:ring-[#8d9c6b]"
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
              >
                <option value="">Pilih personel...</option>
                {allUsers
                  .filter(u => u.id !== user?.id)
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.callsign || user.firstName || `User ${user.id}`}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewDirectChatDialog(false)}
              className="border-[#333] text-gray-300 hover:bg-[#262626]"
            >
              Batal
            </Button>
            
            <Button 
              onClick={() => {
                if (selectedUserId) {
                  handleStartDirectChat(selectedUserId);
                }
              }}
              disabled={!selectedUserId || isCreatingChat}
              className="bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338]"
            >
              {isCreatingChat ? "Memproses..." : "Mulai Chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Group Dialog */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="bg-[#1a1a1a] text-white border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">Buat Grup Baru</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm mb-1 block">Nama Grup</label>
              <Input 
                className="bg-[#262626] border-[#333] text-gray-300"
                placeholder="Masukkan nama grup"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm mb-1 block">Pilih Anggota</label>
              <div className="max-h-40 overflow-y-auto bg-[#262626] border border-[#333] rounded-md p-2">
                {allUsers
                  .filter(u => u.id !== user?.id)
                  .map(user => (
                    <div key={user.id} className="flex items-center p-1">
                      <input 
                        type="checkbox" 
                        id={`user-${user.id}`}
                        className="mr-2"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds(prev => [...prev, user.id]);
                          } else {
                            setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                      />
                      <label htmlFor={`user-${user.id}`}>
                        {user.callsign || user.firstName || `User ${user.id}`}
                      </label>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewGroupDialog(false)}
              className="border-[#333] text-gray-300 hover:bg-[#262626]"
            >
              Batal
            </Button>
            
            <Button 
              onClick={handleCreateGroupChat}
              disabled={!newGroupName || selectedUserIds.length === 0 || isCreatingChat}
              className="bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338]"
            >
              {isCreatingChat ? "Memproses..." : "Buat Grup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incoming Call Modal */}
      <IncomingCallModal />
      
      {/* Group Call Components - Dynamic routing based on call type */}
      {activeCall && activeCall.callType === 'audio' && activeCall.groupId && (
        <GroupCall 
          groupId={activeCall.groupId} 
          groupName={activeCall.groupName || 'Unknown Group'} 
        />
      )}
      
      {activeCall && activeCall.callType === 'video' && activeCall.groupId && (
        <GroupVideoCall />
      )}

      {/* Lapsit Category Selection Modal */}
      <Dialog open={showLapsitCategoryModal} onOpenChange={setShowLapsitCategoryModal}>
        <DialogContent className="bg-[#1a1a1a] text-white border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">Pilih Kategori Laporan</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 space-y-3">
            <Button 
              className="w-full bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338] justify-start text-left h-auto p-4"
              onClick={() => {
                setShowLapsitCategoryModal(false);
                setSelectedLapsitCategory({id: 10, name: 'Situasi Umum'});
                setShowLapsitSubCategoryModal(true);
              }}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">1. Situasi Umum</span>
                <span className="text-xs text-gray-400 mt-1">Laporan situasi umum dan kondisi keseluruhan area operasi</span>
              </div>
            </Button>
            
            <Button 
              className="w-full bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338] justify-start text-left h-auto p-4"
              onClick={() => {
                setShowLapsitCategoryModal(false);
                setSelectedLapsitCategory({id: 11, name: 'Situasi Lapangan'});
                setShowLapsitSubCategoryModal(true);
              }}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">2. Situasi Lapangan</span>
                <span className="text-xs text-gray-400 mt-1">Laporan kondisi lapangan, medan, dan infrastruktur</span>
              </div>
            </Button>
            
            <Button 
              className="w-full bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338] justify-start text-left h-auto p-4"
              onClick={() => {
                setShowLapsitCategoryModal(false);
                setSelectedLapsitCategory({id: 12, name: 'Situasi Operasi/Tempur'});
                setShowLapsitSubCategoryModal(true);
              }}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">3. Situasi Operasi/Tempur</span>
                <span className="text-xs text-gray-400 mt-1">Laporan aktivitas operasi, kontak musuh, dan situasi tempur</span>
              </div>
            </Button>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowLapsitCategoryModal(false)}
              className="border-[#333] text-gray-300 hover:bg-[#262626]"
            >
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lapsit Sub Category Selection Modal */}
      <Dialog open={showLapsitSubCategoryModal} onOpenChange={setShowLapsitSubCategoryModal}>
        <DialogContent className="bg-[#1a1a1a] text-white border-[#333] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">
              Pilih Sub Kategori - {selectedLapsitCategory?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {selectedLapsitCategory?.id === 10 && (
              <>
                {/* Situasi Umum Sub Categories */}
                {[
                  'Lokasi Pengamatan',
                  'Kondisi Cuaca dan Alam', 
                  'Kondisi Sosial',
                  'Kondisi Keamanan',
                  'Kondisi Kekuatan Sendiri',
                  'Kesimpulan Situasi'
                ].map((subCat, index) => (
                  <Button
                    key={index}
                    className="w-full bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338] justify-start text-left h-auto p-3"
                    onClick={() => {
                      setShowLapsitSubCategoryModal(false);
                      setSelectedLapsitSubCategory({name: subCat, index: index + 1});
                      setShowLapsitReportForm(true);
                    }}
                  >
                    <span className="text-sm">{index + 1}. {subCat}</span>
                  </Button>
                ))}
              </>
            )}
            
            {selectedLapsitCategory?.id === 11 && (
              <>
                {/* Situasi Lapangan Sub Categories */}
                {[
                  'Situasi Keamanan Terkini',
                  'Situasi Lingkungan Sekitar',
                  'Ancaman Tersembunyi',
                  'Gangguan Operasional',
                  'Situasi Pasukan Sendiri',
                  'Kesimpulan Situasi Lapangan'
                ].map((subCat, index) => (
                  <Button
                    key={index}
                    className="w-full bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338] justify-start text-left h-auto p-3"
                    onClick={() => {
                      setShowLapsitSubCategoryModal(false);
                      setSelectedLapsitSubCategory({name: subCat, index: index + 1});
                      setShowLapsitReportForm(true);
                    }}
                  >
                    <span className="text-sm">{index + 1}. {subCat}</span>
                  </Button>
                ))}
              </>
            )}
            
            {selectedLapsitCategory?.id === 12 && (
              <>
                {/* Situasi Operasi/Tempur Sub Categories */}
                {[
                  'Situasi Kontak Tempur',
                  'Situasi Kekuatan Pasukan',
                  'Situasi Kondisi Musuh',
                  'Kondisi Hilang/Rusak',
                  'Analisa Taktis',
                  'Situasi Pasca Tempur',
                  'Kebutuhan Darurat'
                ].map((subCat, index) => (
                  <Button
                    key={index}
                    className="w-full bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338] justify-start text-left h-auto p-3"
                    onClick={() => {
                      setShowLapsitSubCategoryModal(false);
                      setSelectedLapsitSubCategory({name: subCat, index: index + 1});
                      setShowLapsitReportForm(true);
                    }}
                  >
                    <span className="text-sm">{index + 1}. {subCat}</span>
                  </Button>
                ))}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowLapsitSubCategoryModal(false);
                setShowLapsitCategoryModal(true);
              }}
              className="border-[#333] text-gray-300 hover:bg-[#262626]"
            >
              Kembali
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowLapsitSubCategoryModal(false);
                setSelectedLapsitCategory(null);
              }}
              className="border-[#333] text-gray-300 hover:bg-[#262626]"
            >
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lapsit Report Form Modal */}
      <Dialog open={showLapsitReportForm} onOpenChange={setShowLapsitReportForm}>
        <DialogContent className="bg-[#1a1a1a] text-white border-[#333] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">
              Buat Laporan - {selectedLapsitCategory?.name} - {selectedLapsitSubCategory?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Judul Laporan</label>
              <input
                type="text"
                value={lapsitReportData.title}
                onChange={(e) => setLapsitReportData({...lapsitReportData, title: e.target.value})}
                className="w-full p-3 bg-[#2d2d2d] border border-[#333] rounded-lg text-white focus:border-[#8d9c6b] focus:outline-none"
                placeholder="Masukkan judul laporan..."
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-2">Isi Laporan</label>
              <textarea
                value={lapsitReportData.content}
                onChange={(e) => setLapsitReportData({...lapsitReportData, content: e.target.value})}
                className="w-full p-3 bg-[#2d2d2d] border border-[#333] rounded-lg text-white focus:border-[#8d9c6b] focus:outline-none h-32 resize-none"
                placeholder="Masukkan detail laporan situasi..."
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">Lokasi (Opsional)</label>
              <input
                type="text"
                value={lapsitReportData.location}
                onChange={(e) => setLapsitReportData({...lapsitReportData, location: e.target.value})}
                className="w-full p-3 bg-[#2d2d2d] border border-[#333] rounded-lg text-white focus:border-[#8d9c6b] focus:outline-none"
                placeholder="Masukkan lokasi atau koordinat..."
              />
            </div>

            {/* Priority and Classification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Prioritas</label>
                <select
                  value={lapsitReportData.priority}
                  onChange={(e) => setLapsitReportData({...lapsitReportData, priority: e.target.value})}
                  className="w-full p-3 bg-[#2d2d2d] border border-[#333] rounded-lg text-white focus:border-[#8d9c6b] focus:outline-none"
                >
                  <option value="low">Rendah</option>
                  <option value="normal">Normal</option>
                  <option value="high">Tinggi</option>
                  <option value="urgent">Mendesak</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Klasifikasi</label>
                <select
                  value={lapsitReportData.classification}
                  onChange={(e) => setLapsitReportData({...lapsitReportData, classification: e.target.value})}
                  className="w-full p-3 bg-[#2d2d2d] border border-[#333] rounded-lg text-white focus:border-[#8d9c6b] focus:outline-none"
                >
                  <option value="UNCLASSIFIED">UNCLASSIFIED</option>
                  <option value="RESTRICTED">RESTRICTED</option>
                  <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                  <option value="SECRET">SECRET</option>
                </select>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Lampiran Foto (Opsional)</label>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="border-[#333] text-gray-300 hover:bg-[#262626] flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Pilih dari Galeri
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCameraCapture}
                  className="border-[#333] text-gray-300 hover:bg-[#262626] flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Ambil Foto
                </Button>
              </div>
              
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {imagePreview && (
                <div className="mt-3">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full max-h-48 rounded-lg border border-[#333]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white border-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowLapsitReportForm(false);
                setShowLapsitSubCategoryModal(true);
              }}
              className="border-[#333] text-gray-300 hover:bg-[#262626]"
            >
              Kembali
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowLapsitReportForm(false);
                setSelectedLapsitCategory(null);
                setSelectedLapsitSubCategory(null);
                setLapsitReportData({
                  title: '',
                  content: '',
                  location: '',
                  priority: 'normal',
                  classification: 'UNCLASSIFIED'
                });
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="border-[#333] text-gray-300 hover:bg-[#262626]"
            >
              Batal
            </Button>
            <Button 
              onClick={handleSubmitLapsitReport}
              className="bg-[#8d9c6b] text-black hover:bg-[#9dad7b]"
            >
              Kirim Laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
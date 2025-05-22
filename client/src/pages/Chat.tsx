import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, PhoneIcon, Settings, Plus, User, 
  ArrowLeft, PaperclipIcon, SendIcon, Users, Search, Info
} from 'lucide-react';
import ChatList from '../components/ChatList';
import chatIcon from '@assets/Icon Chat NXXZ.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '../hooks/useAuth';
import ChatRoom from '../components/ChatRoom';
import IncomingCallModal from '../components/IncomingCallModal';
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Chat() {
  const [user, setUser] = useState<any>(null);
  const [, navigate] = useLocation();
  const [activeChat, setActiveChat] = useState<{ id: number; isGroup: boolean } | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [databaseMessages, setDatabaseMessages] = useState<any[]>([]);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messageInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // View management
  const [activeView, setActiveView] = useState<'chats' | 'calls' | 'personnel' | 'config'>('chats');
  
  // Personnel state
  const [filterText, setFilterText] = useState("");
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);
  
  // State untuk loading status
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
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
                      onChatDeleted={(id, isGroup) => {
                        // Handle chat deletion
                        console.log(`Delete chat: ${id}, isGroup: ${isGroup}`);
                        // Refresh chat list
                        if (user) fetchUserChats(user.id);
                      }}
                      onClearChatHistory={(id, isGroup) => {
                        // Handle clearing chat history
                        console.log(`Clear chat history: ${id}, isGroup: ${isGroup}`);
                        // Refresh chat list and messages if this is active chat
                        if (user) fetchUserChats(user.id);
                        if (activeChat?.id === id) {
                          setDatabaseMessages([]);
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
            <div className="flex flex-col items-center justify-center h-full">
              <div className="bg-[#1a1a1a] p-8 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-[#8d9c6b] mb-4">Fitur Panggilan</h2>
                <p className="text-gray-400 mb-4">Fitur panggilan sedang dalam pengembangan.</p>
                <div className="flex justify-center">
                  <PhoneIcon className="h-24 w-24 text-[#8d9c6b] opacity-50" />
                </div>
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
    </div>
  );
}
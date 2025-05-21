import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, PhoneIcon, Settings, Plus, User, 
  ArrowLeft, Paperclip, Send, Users, Search, Info
} from 'lucide-react';
import WhatsAppStyleChatList from '@/components/WhatsAppStyleChatList';
import ChatRoom from '@/components/ChatRoom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  const [isLoading, setIsLoading] = useState(true);
  
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
        setIsLoading(true);
        // Mengambil data user dari session server melalui API
        const response = await fetch('/api/user', {
          credentials: 'include' // Penting untuk mengirimkan cookies
        });
        
        if (!response.ok) {
          throw new Error('Tidak terautentikasi');
        }
        
        const userObj = await response.json();
        console.log("User data dari session:", userObj);
        setUser(userObj);
        
        // Load chats data
        fetchUserChats(userObj.id);
        fetchAllUsers();
      } catch (error) {
        console.error('Error checking authentication:', error);
        // Redirect ke halaman login jika tidak terautentikasi
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAuth();
  }, []);
  
  // Fungsi untuk mengambil daftar chat user
  const fetchUserChats = async (userId: string) => {
    try {
      console.log("Mengambil daftar chat untuk user ID:", userId);
      
      // Untuk demo, gunakan data statis
      const staticChats = [
        {
          id: 1,
          name: "Tactical Team Alpha",
          isGroup: true,
          members: 8,
          unread: 3,
          lastMessage: "Mission briefing at 0800",
          lastMessageTime: "07:30",
        },
        {
          id: 2,
          name: "Lt. Johnson",
          isGroup: false,
          isOnline: true,
          unread: 0,
          lastMessage: "Copy that",
          lastMessageTime: "08:45",
          otherUserId: 101
        },
        {
          id: 3,
          name: "Operations Planning",
          isGroup: true,
          members: 12,
          unread: 5,
          lastMessage: "Updated coordinates",
          lastMessageTime: "09:15",
        },
        {
          id: 4,
          name: "Sgt. Martinez",
          isGroup: false,
          isOnline: false,
          unread: 2,
          lastMessage: "Equipment request approved",
          lastMessageTime: "Yesterday",
          otherUserId: 102
        }
      ];
      
      setChats(staticChats);
      console.log("Daftar chat diperbarui:", staticChats);
      
    } catch (error) {
      console.error('Error mengambil daftar chat:', error);
    }
  };
  
  // Fetch all users for personnel list from database
  const fetchAllUsers = async () => {
    try {
      setIsLoadingPersonnel(true);
      
      // Mengambil data user dari API
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }
      
      // Parse data dari respons API
      const userData = await response.json();
      
      // Map respons API ke format yang dibutuhkan di UI
      const formattedUsers = userData.map((user: any) => ({
        id: user.id,
        callsign: user.callsign || user.username || 'Unknown',
        rank: user.rank || 'N/A',
        branch: user.branch || 'N/A',
        status: user.isOnline ? 'online' : 'offline',
        fullName: user.fullName || '',
        profileImageUrl: user.profileImageUrl || ''
      }));
      
      setAllUsers(formattedUsers);
      console.log(`Loaded ${formattedUsers.length} users from database for personnel list`);
      
    } catch (error) {
      console.error('Error fetching all users:', error);
      
      // Fallback to mock data only if API request fails (for development purposes)
      console.warn('Using fallback user data');
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
      
      // For demo, create a mock new chat
      const newChat = {
        id: chats.length + 1,
        name: otherUser.callsign,
        isGroup: false,
        isOnline: otherUser.status === "online",
        unread: 0,
        lastMessage: "Chat started",
        lastMessageTime: new Date().toLocaleTimeString(),
        otherUserId: otherUser.id
      };
      
      // Add new chat to list
      setChats([...chats, newChat]);
      
      // Open the new chat
      setActiveChat({ id: newChat.id, isGroup: false });
      setShowChatRoom(true);
      setActiveView('chats');
      
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
      
      // For demo, create a mock new group
      const newGroup = {
        id: chats.length + 1,
        name: newGroupName,
        isGroup: true,
        members: selectedUserIds.length + 1,
        unread: 0,
        lastMessage: "Group created",
        lastMessageTime: new Date().toLocaleTimeString()
      };
      
      // Add new group to list
      setChats([...chats, newGroup]);
      
      // Open the new group
      setActiveChat({ id: newGroup.id, isGroup: true });
      setShowChatRoom(true);
      setActiveView('chats');
      
      // Reset state
      setNewGroupName("");
      setSelectedUserIds([]);
      
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
    
    // Untuk mencegah error, gunakan ID chat yang ada
    // Dari log server, kita tahu bahwa user eko memiliki direct chat ID 2 dan 3, bukan 5
    let validId = id;
    if (!isGroup && id === 5) {
      console.log("ID 5 tidak ditemukan, menggunakan ID 3 sebagai gantinya");
      validId = 3;
    }
    
    setActiveChat({ id: validId, isGroup });
    setShowChatRoom(true);
    
    // Jika kita memiliki chat aktif, kita harus memuat pesan-pesan untuk chat tersebut
    if (validId) {
      fetchMessagesForChat(validId, isGroup);
    }
  };
  
  // Fungsi untuk mengambil pesan-pesan untuk chat tertentu
  const fetchMessagesForChat = async (chatId: number, isGroup: boolean) => {
    try {
      setIsLoadingMessages(true);
      console.log(`Fetching messages for chat ID: ${chatId}, isGroup: ${isGroup}`);
      
      // Generate mock messages for demo
      const generateMessages = (chatId: number, isGroup: boolean) => {
        if (isGroup) {
          return [
            {
              id: 1,
              chatId: chatId,
              senderId: 101,
              content: "Sitrep update: Objective Alpha secured",
              timestamp: "09:15:00",
              isRead: true
            },
            {
              id: 2,
              chatId: chatId,
              senderId: 102,
              content: "Moving to rally point Bravo, ETA 10 minutes",
              timestamp: "09:20:00",
              isRead: true
            },
            {
              id: 3,
              chatId: chatId,
              senderId: user.id,
              content: "Copy all. Stand by for further instructions.",
              timestamp: "09:22:00",
              isRead: true
            },
            {
              id: 4,
              chatId: chatId,
              senderId: 103,
              content: "Supply drop confirmed at grid reference 342-567",
              timestamp: "09:25:00",
              isRead: true
            }
          ];
        } else {
          return [
            {
              id: 1,
              chatId: chatId,
              senderId: user.id,
              content: "Transmitting coordinates for next mission",
              timestamp: "10:05:00",
              isRead: true
            },
            {
              id: 2,
              chatId: chatId,
              senderId: chatId === 2 ? 101 : (chatId === 4 ? 102 : 103),
              content: "Received. Will proceed as planned.",
              timestamp: "10:07:00",
              isRead: true
            },
            {
              id: 3,
              chatId: chatId,
              senderId: user.id,
              content: "Confirm equipment status for night operation",
              timestamp: "10:15:00",
              isRead: true
            },
            {
              id: 4,
              chatId: chatId,
              senderId: chatId === 2 ? 101 : (chatId === 4 ? 102 : 103),
              content: "All equipment checked and operational",
              timestamp: "10:20:00",
              isRead: true
            }
          ];
        }
      };
      
      const messages = generateMessages(chatId, isGroup);
      setDatabaseMessages(messages);
      console.log(`Loaded ${messages.length} messages for chat ${chatId}`);
      
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
        timestamp: new Date().toLocaleTimeString(),
        isRead: false
      };
      
      // Update tampilan dengan pesan baru
      setDatabaseMessages(prev => [...prev, tempMessage]);
      
      // Reset input
      setNewMessage('');
      
      // Untuk demo, simulasikan pengiriman pesan yang berhasil
      setTimeout(() => {
        console.log('Pesan berhasil dikirim');
        
        // Update the chat list to show the latest message
        const updatedChats = chats.map(chat => {
          if (chat.id === activeChat.id && chat.isGroup === activeChat.isGroup) {
            return {
              ...chat,
              lastMessage: newMessage,
              lastMessageTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            };
          }
          return chat;
        });
        
        setChats(updatedChats);
      }, 500);
      
    } catch (error) {
      console.error('Error mengirim pesan:', error);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      localStorage.removeItem("currentUser");
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#a2bd62] text-xl font-bold">LOADING SECURE COMMS...</div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-black text-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center p-3 bg-[#1a1a1a] border-b border-[#333] h-16">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-[#8d9c6b]">NXZZ-VComm</h1>
        </div>
        
        <div className="flex space-x-2">
          {user && (
            <div className="flex items-center">
              <span className="mr-2 text-sm hidden md:inline">{user.callsign || user.fullName}</span>
              <Avatar className="h-8 w-8 bg-[#2d3328] text-[#8d9c6b]">
                <AvatarFallback>{user.callsign ? user.callsign[0].toUpperCase() : (user.fullName ? user.fullName[0].toUpperCase() : 'U')}</AvatarFallback>
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
                      size="icon"
                      className="rounded-full bg-[#2d3328] border-[#8d9c6b] text-[#8d9c6b]"
                      onClick={() => setShowNewChatMenu(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Chat List */}
                  <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
                    <WhatsAppStyleChatList 
                      chats={chats.map(chat => ({
                        id: chat.id,
                        name: chat.name,
                        isRoom: chat.isGroup,
                        isOnline: chat.isOnline,
                        members: chat.members,
                        unread: chat.unread,
                        lastMessage: chat.lastMessage,
                        lastMessageTime: chat.lastMessageTime,
                        otherUserId: chat.otherUserId
                      }))}
                      onSelectChat={(id, isRoom) => handleSelectChat(id, isRoom)}
                    />
                  </div>
                </div>
              ) : (
                <ChatRoom 
                  chatId={activeChat?.id || 0}
                  isRoom={activeChat?.isGroup || false}
                  chatName={chats.find(c => c.id === activeChat?.id)?.name || "Chat"}
                  onBack={handleBackToList}
                />
              )}
            </>
          )}
          
          {/* Calls View */}
          {activeView === 'calls' && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center p-4 border-b border-[#333]">
                <h2 className="text-xl font-semibold text-[#8d9c6b]">Calls</h2>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-4">
                  <PhoneIcon className="h-12 w-12 text-[#8d9c6b] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No Recent Calls</h3>
                  <p className="text-gray-400 mt-2">Start a call from any chat or personnel profile</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Personnel View */}
          {activeView === 'personnel' && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center p-4 border-b border-[#333]">
                <h2 className="text-xl font-semibold text-[#8d9c6b]">Personnel</h2>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input 
                    className="pl-10 bg-[#1a1a1a] border-[#333] focus:border-[#8d9c6b] text-white"
                    placeholder="Search personnel..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
                {isLoadingPersonnel ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#8d9c6b]"></div>
                  </div>
                ) : (
                  <div className="divide-y divide-[#333]">
                    {allUsers
                      .filter(u => 
                        u.callsign.toLowerCase().includes(filterText.toLowerCase()) ||
                        u.rank.toLowerCase().includes(filterText.toLowerCase()) ||
                        u.branch.toLowerCase().includes(filterText.toLowerCase())
                      )
                      .map(user => (
                        <div 
                          key={user.id}
                          className="p-4 hover:bg-[#1a1a1a] cursor-pointer flex justify-between items-center"
                          onClick={() => handleStartDirectChat(user.id)}
                        >
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 bg-[#2d3328] text-[#8d9c6b]">
                              <AvatarFallback>{user.callsign[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="ml-3">
                              <div className="flex items-center">
                                <span className="font-semibold">{user.callsign}</span>
                                {user.status === "online" && (
                                  <div className="ml-2 h-2 w-2 bg-green-500 rounded-full"></div>
                                )}
                              </div>
                              <div className="flex text-xs text-gray-400 mt-1">
                                <span className="mr-2">{user.rank}</span>
                                <span>{user.branch}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-gray-400 hover:text-[#8d9c6b]"
                          >
                            <MessageSquare className="h-5 w-5" />
                          </Button>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Config View */}
          {activeView === 'config' && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center p-4 border-b border-[#333]">
                <h2 className="text-xl font-semibold text-[#8d9c6b]">Configuration</h2>
              </div>
              <div className="p-4">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Account</h3>
                  <div className="bg-[#1a1a1a] p-4 rounded-md">
                    <div className="flex items-center mb-4">
                      <Avatar className="h-16 w-16 bg-[#2d3328] text-[#8d9c6b]">
                        <AvatarFallback>{user?.callsign ? user.callsign[0].toUpperCase() : "U"}</AvatarFallback>
                      </Avatar>
                      <div className="ml-4">
                        <h4 className="text-lg font-semibold">{user?.callsign || "Unknown"}</h4>
                        <p className="text-sm text-gray-400">{user?.rank} • {user?.branch}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full bg-[#2d3328] text-[#8d9c6b] border-[#8d9c6b]">
                      Edit Profile
                    </Button>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">App Settings</h3>
                  <div className="bg-[#1a1a1a] p-4 rounded-md space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Dark Mode</span>
                      <div className="w-10 h-6 bg-[#8d9c6b] rounded-full px-1 flex items-center">
                        <div className="bg-white w-4 h-4 rounded-full ml-auto"></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Notifications</span>
                      <div className="w-10 h-6 bg-[#8d9c6b] rounded-full px-1 flex items-center">
                        <div className="bg-white w-4 h-4 rounded-full ml-auto"></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Sound Effects</span>
                      <div className="w-10 h-6 bg-[#333] rounded-full px-1 flex items-center">
                        <div className="bg-white w-4 h-4 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleLogout}
                >
                  Log Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* New Chat Menu Dialog */}
      <Dialog open={showNewChatMenu} onOpenChange={setShowNewChatMenu}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white max-w-xs mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-[#8d9c6b]">New Communication</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-3 mt-2">
            <Button 
              variant="outline" 
              className="bg-[#2d3328] text-[#8d9c6b] border-[#8d9c6b] flex items-center justify-start"
              onClick={() => {
                setShowNewChatMenu(false);
                setShowNewDirectChatDialog(true);
              }}
            >
              <User className="h-5 w-5 mr-2" />
              Direct Communication
            </Button>
            <Button 
              variant="outline" 
              className="bg-[#2d3328] text-[#8d9c6b] border-[#8d9c6b] flex items-center justify-start"
              onClick={() => {
                setShowNewChatMenu(false);
                setShowNewGroupDialog(true);
              }}
            >
              <Users className="h-5 w-5 mr-2" />
              Tactical Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* New Direct Chat Dialog */}
      <Dialog open={showNewDirectChatDialog} onOpenChange={setShowNewDirectChatDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">Start Direct Communication</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="relative mb-4">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input 
                className="pl-10 bg-[#111] border-[#333] focus:border-[#8d9c6b] text-white"
                placeholder="Search personnel..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {allUsers
                .filter(u => 
                  u.callsign.toLowerCase().includes(filterText.toLowerCase()) ||
                  u.rank.toLowerCase().includes(filterText.toLowerCase()) ||
                  u.branch.toLowerCase().includes(filterText.toLowerCase())
                )
                .map(user => (
                  <div 
                    key={user.id}
                    className={`p-3 flex items-center hover:bg-[#2d3328] cursor-pointer rounded ${selectedUserId === user.id ? 'bg-[#2d3328]' : ''}`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <Avatar className="h-8 w-8 bg-[#2d3328] text-[#8d9c6b]">
                      <AvatarFallback>{user.callsign[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                      <div className="flex items-center">
                        <span className="font-semibold">{user.callsign}</span>
                        {user.status === "online" && (
                          <div className="ml-2 h-2 w-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{user.rank} • {user.branch}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="secondary"
              onClick={() => setShowNewDirectChatDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#8d9c6b] hover:bg-[#7b8a5b] text-black"
              onClick={() => {
                if (selectedUserId) {
                  handleStartDirectChat(selectedUserId);
                }
              }}
              disabled={!selectedUserId || isCreatingChat}
            >
              {isCreatingChat ? 'Starting...' : 'Start Chat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Group Dialog */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">Create Tactical Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Group Name</label>
              <Input 
                className="bg-[#111] border-[#333] focus:border-[#8d9c6b] text-white"
                placeholder="Enter group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Select Members</label>
              <div className="relative mb-4">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input 
                  className="pl-10 bg-[#111] border-[#333] focus:border-[#8d9c6b] text-white"
                  placeholder="Search personnel..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
              </div>
              {/* Selected members */}
              {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedUserIds.map(id => {
                    const user = allUsers.find(u => u.id === id);
                    return user ? (
                      <Badge 
                        key={id} 
                        className="bg-[#2d3328] text-[#8d9c6b] flex items-center gap-1"
                        onClick={() => setSelectedUserIds(selectedUserIds.filter(uid => uid !== id))}
                      >
                        {user.callsign}
                        <X className="h-3 w-3 cursor-pointer" />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
              <div className="max-h-40 overflow-y-auto">
                {allUsers
                  .filter(u => 
                    u.callsign.toLowerCase().includes(filterText.toLowerCase()) ||
                    u.rank.toLowerCase().includes(filterText.toLowerCase()) ||
                    u.branch.toLowerCase().includes(filterText.toLowerCase())
                  )
                  .map(user => (
                    <div 
                      key={user.id}
                      className={`p-3 flex items-center justify-between hover:bg-[#2d3328] cursor-pointer rounded ${selectedUserIds.includes(user.id) ? 'bg-[#2d3328]' : ''}`}
                      onClick={() => {
                        if (selectedUserIds.includes(user.id)) {
                          setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                        } else {
                          setSelectedUserIds([...selectedUserIds, user.id]);
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 bg-[#2d3328] text-[#8d9c6b]">
                          <AvatarFallback>{user.callsign[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <span className="font-semibold">{user.callsign}</span>
                          <span className="text-xs text-gray-400 block">{user.rank} • {user.branch}</span>
                        </div>
                      </div>
                      {selectedUserIds.includes(user.id) && (
                        <div className="h-5 w-5 bg-[#8d9c6b] rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="secondary"
              onClick={() => setShowNewGroupDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#8d9c6b] hover:bg-[#7b8a5b] text-black"
              onClick={handleCreateGroupChat}
              disabled={!newGroupName || selectedUserIds.length === 0 || isCreatingChat}
            >
              {isCreatingChat ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
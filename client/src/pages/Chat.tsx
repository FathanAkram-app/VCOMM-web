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
      
      // 1. Fetch direct chats
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
            
            allChats = [...allChats, ...formattedDirectChats];
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
        body: JSON.stringify({ otherUserId })
      });
      
      if (response.ok) {
        const newChat = await response.json();
        console.log(`Created new direct chat:`, newChat);
        
        // Add this chat to our list
        const formattedChat = {
          id: newChat.id,
          name: otherUser.callsign || otherUser.firstName || `User ${otherUserId}`,
          isGroup: false,
          lastMessage: "Secure channel established.",
          lastMessageTime: new Date().toISOString(),
          unread: 0,
          otherUserId
        };
        
        // Update chats list
        const updatedChats = [...chats, formattedChat];
        setChats(updatedChats);
        
        // Open the new chat
        setActiveChat({ id: newChat.id, isGroup: false });
        setShowChatRoom(true);
        setActiveView('chats');
        
        // Refresh chat list to get the new chat
        fetchUserChats(user.id);
      } else {
        console.error(`Failed to create direct chat: ${response.status} ${response.statusText}`);
        alert("Failed to create direct chat. Please try again.");
      }
    } catch (error) {
      console.error('Error creating direct chat:', error);
      alert("An error occurred. Please try again.");
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
          msg.id === tempId ? { ...sentMessage, chatId: activeChat.id, isSending: false } : msg
        ));
        
        // Refresh chat list untuk memperbarui lastMessage dan lastMessageTime
        fetchUserChats(user.id);
      } else {
        console.error(`Gagal mengirim pesan: ${response.status}`);
        
        // Update tampilan, tandai pesan sebagai gagal
        setDatabaseMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, isSending: false, isError: true } : msg
        ));
      }
    } catch (error) {
      console.error('Error mengirim pesan:', error);
    }
  };
  
  // Fungsi untuk memulai direct chat dengan pengguna lain
  const handleStartDirectChat = async (otherUserId: number) => {
    if (!otherUserId || !user) {
      console.error('Invalid otherUserId or currentUser');
      return;
    }

    try {
      setIsCreatingChat(true);
      console.log('Creating new direct chat with user ID:', otherUserId);
      
      const response = await fetch('/api/direct-chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          otherUserId: Number(otherUserId) // Pastikan ini adalah number
        }),
        credentials: 'include'
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
      <div className="flex justify-between items-center p-3 bg-[#1a1a1a] border-b border-[#333]">
        <div className="flex items-center">
          <img src={chatIcon} alt="NXZZ-VComm" className="h-8 w-8 mr-2" />
          <h1 className="text-xl font-bold text-[#8d9c6b]">NXZZ-VComm</h1>
        </div>
        
        {user && (
          <div className="flex items-center space-x-2">
            <span className="text-sm hidden md:inline">{user.callsign || user.email}</span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImageUrl} />
              <AvatarFallback className="bg-[#2d3328] text-[#8d9c6b]">
                {user.callsign?.substring(0, 2) || user.firstName?.substring(0, 1) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="md:w-16 bg-[#1a1a1a] flex md:flex-col items-center justify-between p-2 border-r border-[#333]">
          <div className="flex md:flex-col space-x-3 md:space-x-0 md:space-y-4">
            <Button
              variant={activeView === 'chats' ? "default" : "ghost"}
              size="icon"
              className={activeView === 'chats' ? "bg-[#2d3328] text-[#8d9c6b]" : "text-gray-500"}
              onClick={handleShowChats}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            
            <Button
              variant={activeView === 'calls' ? "default" : "ghost"}
              size="icon"
              className={activeView === 'calls' ? "bg-[#2d3328] text-[#8d9c6b]" : "text-gray-500"}
              onClick={handleShowCalls}
            >
              <PhoneIcon className="h-5 w-5" />
            </Button>
            
            <Button
              variant={activeView === 'personnel' ? "default" : "ghost"}
              size="icon"
              className={activeView === 'personnel' ? "bg-[#2d3328] text-[#8d9c6b]" : "text-gray-500"}
              onClick={handleShowPersonnel}
            >
              <Users className="h-5 w-5" />
            </Button>
            
            <Button
              variant={activeView === 'config' ? "default" : "ghost"}
              size="icon"
              className={activeView === 'config' ? "bg-[#2d3328] text-[#8d9c6b]" : "text-gray-500"}
              onClick={handleShowConfig}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 md:mt-auto"
            onClick={handleLogout}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Main Panel */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'chats' && !showChatRoom && (
            <div className="h-full flex flex-col">
              <div className="p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#8d9c6b]">Komunikasi</h2>
                <Button 
                  size="sm" 
                  onClick={() => setShowNewChatMenu(true)}
                  className="bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338]"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span className="text-xs">PESAN BARU</span>
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <ChatList
                  activeChat={activeChat}
                  onSelectChat={handleSelectChat}
                  onChatDeleted={(id, isGroup) => fetchUserChats(user?.id)}
                  onClearChatHistory={(id, isGroup) => fetchUserChats(user?.id)}
                  onCreateGroup={() => setShowNewGroupDialog(true)}
                />
              </div>
            </div>
          )}
          
          {activeView === 'chats' && showChatRoom && activeChat && (
            <div className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="p-3 border-b border-[#333] bg-[#1a1a1a] flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="mr-2"
                  onClick={handleBackToList}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-[#8d9c6b]">
                    {chats.find(c => c.id === activeChat.id)?.name || `Chat ${activeChat.id}`}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {activeChat.isGroup ? 'Group Chat' : 'Direct Message'}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  {activeChat.isGroup && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowGroupInfo(true)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Memuat pesan...</p>
                  </div>
                ) : databaseMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Belum ada pesan. Mulai percakapan?</p>
                  </div>
                ) : (
                  databaseMessages.map((message) => {
                    const isCurrentUser = message.senderId === user?.id;
                    return (
                      <div 
                        key={message.id} 
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isCurrentUser 
                              ? 'bg-[#2d3328] text-white ml-12' 
                              : 'bg-[#1a1a1a] text-white mr-12'
                          }`}
                        >
                          {!isCurrentUser && (
                            <div className="text-xs text-[#8d9c6b] mb-1">
                              {allUsers.find(u => u.id === message.senderId)?.callsign || `User ${message.senderId}`}
                            </div>
                          )}
                          <div className="text-sm">{message.content}</div>
                          <div className="text-xs text-gray-500 text-right mt-1">
                            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
              
              {/* Message Input */}
              <div className="p-3 border-t border-[#333] bg-[#1a1a1a] flex items-center">
                <Button variant="ghost" size="icon" className="text-gray-400">
                  <PaperclipIcon className="h-5 w-5" />
                </Button>
                
                <Input
                  ref={messageInputRef}
                  placeholder="Ketik pesan..."
                  className="mx-2 bg-[#0a0a0a] border-[#333]"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-[#8d9c6b]"
                  disabled={!newMessage.trim()}
                  onClick={handleSendMessage}
                >
                  <SendIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          
          {activeView === 'personnel' && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-[#333]">
                <h2 className="text-xl font-bold text-[#8d9c6b]">Personnel</h2>
                <p className="text-sm text-gray-400">Daftar personel yang terdaftar dalam sistem</p>
              </div>
              
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Cari personel..."
                    className="pl-10 bg-[#1a1a1a] border-[#333]"
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isLoadingPersonnel ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-400">Memuat daftar personel...</p>
                    </div>
                  ) : allUsers.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-400">Tidak ada personel yang terdaftar</p>
                    </div>
                  ) : (
                    allUsers
                      .filter(p => !filterText || 
                        p.callsign?.toLowerCase().includes(filterText.toLowerCase()) ||
                        p.firstName?.toLowerCase().includes(filterText.toLowerCase()) ||
                        p.lastName?.toLowerCase().includes(filterText.toLowerCase()) ||
                        p.rank?.toLowerCase().includes(filterText.toLowerCase())
                      )
                      .map(personnel => (
                        <div 
                          key={personnel.id}
                          className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333] flex flex-col"
                        >
                          <div className="flex items-center mb-3">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarImage src={personnel.profileImageUrl} />
                              <AvatarFallback className="bg-[#2d3328] text-[#8d9c6b]">
                                {personnel.callsign?.substring(0, 2) || personnel.firstName?.substring(0, 1) || "P"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold">{personnel.callsign || personnel.firstName}</h3>
                              <p className="text-xs text-[#8d9c6b]">{personnel.rank || 'Military Personnel'}</p>
                            </div>
                          </div>
                          
                          {personnel.id !== user?.id && (
                            <Button 
                              size="sm" 
                              className="bg-[#2d3328] text-[#8d9c6b] hover:bg-[#3d4338] mt-2 self-end"
                              onClick={() => handleStartDirectChat(personnel.id)}
                              disabled={isCreatingChat}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              <span className="text-xs">CHAT</span>
                            </Button>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeView === 'calls' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <PhoneIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-[#8d9c6b] mb-2">Panggilan</h2>
                <p className="text-gray-400">Fitur panggilan akan segera tersedia</p>
              </div>
            </div>
          )}
          
          {activeView === 'config' && (
            <div className="h-full flex flex-col p-4">
              <h2 className="text-xl font-bold text-[#8d9c6b] mb-4">Pengaturan</h2>
              
              {user && (
                <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333]">
                  <h3 className="font-semibold mb-4">Profil Pengguna</h3>
                  
                  <div className="flex items-center mb-4">
                    <Avatar className="h-16 w-16 mr-4">
                      <AvatarImage src={user.profileImageUrl} />
                      <AvatarFallback className="bg-[#2d3328] text-[#8d9c6b] text-xl">
                        {user.callsign?.substring(0, 2) || user.firstName?.substring(0, 1) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h4 className="font-bold text-lg">{user.callsign || user.firstName}</h4>
                      <p className="text-[#8d9c6b]">{user.rank || "Military Personnel"}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  
                  <Separator className="my-4 bg-[#333]" />
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Status</h4>
                      <Badge className="bg-green-700 hover:bg-green-800">Online</Badge>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Keamanan</h4>
                      <Badge className="bg-blue-700 hover:bg-blue-800">End-to-End Encrypted</Badge>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-6 bg-[#a01919] hover:bg-[#b02929] text-white"
                    onClick={handleLogout}
                  >
                    Keluar
                  </Button>
                </div>
              )}
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
                placeholder="Masukkan nama grup..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="bg-[#262626] border-[#333]"
              />
            </div>
            
            <div>
              <label className="text-sm mb-1 block">Pilih Anggota</label>
              <div className="max-h-48 overflow-y-auto bg-[#262626] border border-[#333] rounded-md p-2">
                {allUsers
                  .filter(u => u.id !== user?.id)
                  .map(user => (
                    <div key={user.id} className="flex items-center py-2">
                      <input
                        type="checkbox"
                        id={`user-${user.id}`}
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => {
                          if (selectedUserIds.includes(user.id)) {
                            setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                          } else {
                            setSelectedUserIds([...selectedUserIds, user.id]);
                          }
                        }}
                        className="mr-2"
                      />
                      <label htmlFor={`user-${user.id}`} className="flex-1">
                        {user.callsign || user.firstName || `User ${user.id}`}
                      </label>
                    </div>
                  ))}
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
    </div>
  );
}

// Pindahkan state variabel ke dalam komponen utama
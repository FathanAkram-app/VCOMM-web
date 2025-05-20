import { useState, useEffect, useMemo } from "react";
import { PlusIcon, PhoneIcon, VideoIcon, MessageCircleIcon, Users, UserPlus, Radio, Settings, Search, Video, MoreVertical } from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";

import NavBar from "../components/NavBar";
import ChatList from "../components/ChatList";
import SimpleWhatsAppStyleChatList from "../components/SimpleWhatsAppStyleChatList";
import SimpleChatRoom from "../components/SimpleChatRoom";
import ContactsList from "../components/ContactsList";
import { useAuth } from "../hooks/use-auth";
import { useCall } from "../hooks/useCall";
import { useLocation } from "wouter";
import { useToast } from "../hooks/use-toast";

export default function MainLayout() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  // Default ke tab chats (communications) untuk tampilan fullscreen
  const [activeTab, setActiveTab] = useState("chats");
  const [activeChat, setActiveChat] = useState<{id: number, isRoom: boolean} | null>(null);
  
  // Efek untuk melacak perubahan activeChat
  useEffect(() => {
    console.log("activeChat state telah berubah:", activeChat);
  }, [activeChat]);
  const [_, navigate] = useLocation();
  
  // Dialog state
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showNewCallDialog, setShowNewCallDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [chatType, setChatType] = useState<"direct" | "room">("direct");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  
  // Personnel filter state
  const [personnelSearchQuery, setPersonnelSearchQuery] = useState('');
  const [personnelBranchFilter, setPersonnelBranchFilter] = useState('all');
  const [personnelBattalionFilter, setPersonnelBattalionFilter] = useState('all');
  const [personnelAreaFilter, setPersonnelAreaFilter] = useState('all');
  
  // Data users untuk debug
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  // Fetch data users
  useEffect(() => {
    if (activeTab === 'personnel') {
      setIsLoading(true);
      setError(null);
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          console.log('Users loaded:', data.length);
          setUsers(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error loading users:', err);
          setError(err);
          setIsLoading(false);
        });
    }
  }, [activeTab]);
  
  // Forwarding state
  const [forwardedMessage, setForwardedMessage] = useState<any>(null);
  const [sourceChat, setSourceChat] = useState<{id: number, isRoom: boolean} | null>(null);
  
  // Profile editing state
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  
  // State for edit profile form
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    rank: "CAPTAIN",
    unit: "1ST TACTICAL",
    branch: "ARMY",
    battalion: "1ST INFANTRY",
    deploymentArea: "NORTHERN SECTOR"
  });
  
  // State for change password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  // Mock chats for demonstration purposes
  const [mockChats, setMockChats] = useState([
    { id: 1, name: "OPERATION ALPHA", isRoom: true },
    { id: 3, name: "TACTICAL UNIT B", isRoom: true }, // Ubah ID menjadi 3 untuk menghindari konflik
    { id: 8, name: "DAVID", isRoom: false }, // David dengan ID 8 (konsisten dengan API)
    { id: 101, name: "BRAVO2", isRoom: false },
    { id: 102, name: "CHARLIE3", isRoom: false }
  ]);
  
  // Function to get chat name based on chat ID and type - with improved logging
  const getChatName = (chatId: number, isRoom: boolean): string => {
    console.log(`Looking for chat: id=${chatId}, isRoom=${isRoom}`);
    console.log(`Available chats:`, mockChats);
    
    const chat = mockChats.find(c => c.id === chatId && c.isRoom === isRoom);
    
    if (!chat) {
      console.warn(`Chat not found for id=${chatId}, isRoom=${isRoom}`);
      
      // Special case for user with id=8 (david)
      if (chatId === 8 && !isRoom) {
        return "DAVID";
      }
    }
    
    return chat?.name || `CHAT ${chatId}`;
  };
  
  // Initialize room data and direct chat in localStorage if it doesn't exist
  useEffect(() => {
    try {
      console.log("Initializing chat data in localStorage...");
      
      // Selalu reset data pesan untuk memastikan data yang benar
      // Initialize room messages
      const mockData = {
        1: [
          { id: 1, text: "Mission briefing at 0800", sender: "ALPHA1", timestamp: "08:00", isRead: true },
          { id: 2, text: "All units confirm receipt", sender: "CHARLIE3", timestamp: "08:01", isRead: true },
          { id: 3, text: "Confirmed, standing by", sender: "BRAVO2", timestamp: "08:02", isRead: true },
          { id: 4, text: "Intel update: target location confirmed", sender: "ALPHA1", timestamp: "08:05", isRead: true },
          { id: 5, text: "Weather conditions nominal for operation", sender: "DELTA4", timestamp: "08:07", isRead: true },
        ],
        3: [ // ID berubah dari 2 menjadi 3 untuk TACTICAL UNIT B
          { id: 11, text: "Supply convoy ETA 1200 hours", sender: "BRAVO2", timestamp: "10:00", isRead: true },
          { id: 12, text: "Acknowledged, preparing landing zone", sender: "ECHO5", timestamp: "10:05", isRead: true },
          { id: 13, text: "Security perimeter established", sender: "DELTA4", timestamp: "10:10", isRead: true },
        ]
      };
      localStorage.setItem('roomMockMessages', JSON.stringify(mockData));
      console.log("Room messages initialized:", mockData);
      
      // Initialize direct messages
      const directMockData = {
        8: [ // David with ID 8 (sesuai API)
          { 
            id: 1, 
            text: "Secure direct communication established with DAVID.", 
            sender: "SYSTEM", 
            timestamp: "10:30", 
            isRead: true 
          },
          { 
            id: 3, 
            text: "Intel report received. Awaiting your orders, Colonel.", 
            sender: "DAVID", 
            timestamp: "10:40", 
            isRead: true 
          }
        ],
        101: [ // BRAVO2
          { 
            id: 1, 
            text: "Secure direct communication established with BRAVO2.", 
            sender: "SYSTEM", 
            timestamp: "09:30", 
            isRead: true 
          },
          { 
            id: 16, 
            text: "Status report needed ASAP", 
            sender: "ALPHA1", 
            timestamp: "09:00", 
            isRead: true 
          },
        ],
        102: [ // CHARLIE3
          { 
            id: 1, 
            text: "Secure direct communication established with CHARLIE3.", 
            sender: "SYSTEM", 
            timestamp: "09:35", 
            isRead: true 
          },
          { 
            id: 19, 
            text: "Communications check", 
            sender: "ALPHA1", 
            timestamp: "07:30", 
            isRead: true 
          },
        ]
      };
      localStorage.setItem('directMockMessages', JSON.stringify(directMockData));
      console.log("Direct messages initialized:", directMockData);
    } catch (error) {
      console.error("Error initializing mock data:", error);
    }
  }, []);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const handleStartCall = () => {
    if (!selectedContactId) {
      toast({
        title: "No Contact Selected",
        description: "Please select a contact to call",
        variant: "destructive"
      });
      return;
    }
    
    // Log the contact ID for starting the call
    console.log(`Starting ${callType} call with contact ID: ${selectedContactId}`);
    
    // Set call state and redirect to call page
    if (callType === "audio") {
      window.localStorage.setItem("activeAudioCall", JSON.stringify({
        recipientId: selectedContactId,
        recipientName: `User-${selectedContactId}`, // We should replace this with actual name from API
        startTime: new Date().toISOString()
      }));
      navigate("/audio-call");
    } else {
      window.localStorage.setItem("activeVideoCall", JSON.stringify({
        recipientId: selectedContactId,
        recipientName: `User-${selectedContactId}`, // We should replace this with actual name from API
        startTime: new Date().toISOString()
      }));
      navigate("/video-call");
    }
    
    setShowNewCallDialog(false);
  };

  const handleCreateNewChat = () => {
    if (chatType === "direct" && !selectedContactId) {
      toast({
        title: "No Contact Selected",
        description: "Please select a contact to start a chat",
        variant: "destructive"
      });
      return;
    }
    
    if (chatType === "room" && !newRoomName.trim()) {
      toast({
        title: "Missing Room Name",
        description: "Please enter a name for the chat room",
        variant: "destructive"
      });
      return;
    }
    
    if (chatType === "direct") {
      // In a real implementation, we would create the direct chat in the database
      // For now we'll just simulate it with mock data
      console.log(`Creating direct chat with contact: ${selectedContactId}`);
      
      // Check if this chat already exists in our mock data
      const existingChat = mockChats.find(c => !c.isRoom && c.id === selectedContactId);
      
      if (!existingChat) {
        // Add new chat to mock chats
        const newChat = { 
          id: selectedContactId || 0, 
          name: `User-${selectedContactId}`, // Replace with actual name
          isRoom: false 
        };
        setMockChats(prev => [...prev, newChat]);
      }
      
      // Set this as the active chat
      if (selectedContactId) {
        setActiveChat({id: selectedContactId, isRoom: false});
      }
      setActiveTab("chats");
    } else {
      // Create a new room chat
      console.log(`Creating room chat: ${newRoomName} with members:`, selectedContactIds);
      
      // Generate a new room ID
      const newRoomId = Math.max(...mockChats.filter(c => c.isRoom).map(c => c.id), 0) + 1;
      
      // Add new room to mock chats
      const newRoom = { id: newRoomId, name: newRoomName, isRoom: true };
      setMockChats(prev => [...prev, newRoom]);
      
      // Set this as the active chat
      setActiveChat({id: newRoomId, isRoom: true});
      setActiveTab("chats");
      
      // Initialize empty message list for this room
      try {
        const roomMessages = JSON.parse(localStorage.getItem('roomMockMessages') || '{}');
        roomMessages[newRoomId] = [];
        localStorage.setItem('roomMockMessages', JSON.stringify(roomMessages));
      } catch (error) {
        console.error("Error initializing new room messages:", error);
      }
    }
    
    // Reset and close dialog
    setNewRoomName("");
    setSelectedContactId(null);
    setSelectedContactIds([]);
    setShowNewChatDialog(false);
  };
  
  const handleSaveProfile = () => {
    // In a real app, this would update the user profile in the database
    console.log("Saving profile:", profileForm);
    
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated",
    });
    
    setShowEditProfileDialog(false);
  };
  
  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, this would update the password in the database
    console.log("Changing password");
    
    toast({
      title: "Password Changed",
      description: "Your password has been successfully updated",
    });
    
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    
    setShowChangePasswordDialog(false);
  };
  
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Side Navigation */}
        <div className="w-16 flex-shrink-0 border-r border-accent flex flex-col items-center py-4 bg-muted/30">
          <Button 
            variant={activeTab === "chats" ? "default" : "ghost"} 
            size="icon" 
            onClick={() => setActiveTab("chats")} 
            className="mb-2"
            title="Communications"
          >
            <MessageCircleIcon className="h-5 w-5" />
          </Button>
          
          <Button 
            variant={activeTab === "personnel" ? "default" : "ghost"} 
            size="icon" 
            onClick={() => setActiveTab("personnel")} 
            className="mb-2"
            title="Personnel"
          >
            <Users className="h-5 w-5" />
          </Button>
          
          <Button 
            variant={activeTab === "calls" ? "default" : "ghost"} 
            size="icon" 
            onClick={() => setActiveTab("calls")} 
            className="mb-2"
            title="Calls"
          >
            <PhoneIcon className="h-5 w-5" />
          </Button>
          
          <Button 
            variant={activeTab === "radio" ? "default" : "ghost"} 
            size="icon" 
            onClick={() => setActiveTab("radio")}
            className="mb-2"
            title="Radio"
          >
            <Radio className="h-5 w-5" />
          </Button>
          
          <div className="flex-1"></div>
          
          <Button 
            variant={activeTab === "settings" ? "default" : "ghost"}
            size="icon" 
            onClick={() => setActiveTab("settings")}
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chats Tab - Using two column layout */}
          {activeTab === "chats" && (
            <div className="flex w-full">
              {/* Left Column - Chat List */}
              <div className="w-1/4 min-w-[280px] border-r border-accent/50 bg-[#2a2b25]">
                <div className="p-3 border-b border-accent/50 flex justify-between items-center">
                  <h2 className="font-bold uppercase text-[#bdc1c0] tracking-wide">COMMUNICATIONS</h2>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowNewChatDialog(true)}
                    className="hover:bg-[#566c57]/20"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span className="sr-only">New</span>
                  </Button>
                </div>
                
                <div className="overflow-y-auto h-[calc(100vh-120px)]">
                  {/* Selalu tampilkan daftar chat hardcoded */}
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto">
                      {/* Special Forces Team */}
                      <div 
                        className="flex items-center p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800"
                        onClick={() => navigate('/chat/room/1')}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-900">
                            <span className="text-white text-xs font-semibold">5</span>
                          </div>
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                          <div className="flex justify-between items-center">
                            <h3 className="text-white font-medium truncate">
                              Special Forces Team
                              <span className="ml-2 text-xs font-normal text-gray-400">(5 members)</span>
                            </h3>
                            <span className="text-xs text-gray-400">08:00</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-gray-400 text-sm truncate">Mission briefing tomorrow at 0800</p>
                            <span className="ml-2 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              2
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Aji (untuk semua pengguna) */}
                      <div 
                        className="flex items-center p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800"
                        onClick={() => navigate('/chat/direct/9')}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-900">
                            <span className="text-white text-xs font-semibold">AJ</span>
                          </div>
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                          <div className="flex justify-between items-center">
                            <h3 className="text-white font-medium truncate">Aji</h3>
                            <span className="text-xs text-gray-400">09:45</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-gray-400 text-sm truncate">Laporan sudah selesai Pak</p>
                            <span className="ml-2 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              1
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Eko (untuk semua pengguna) */}
                      <div 
                        className="flex items-center p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800"
                        onClick={() => navigate('/chat/direct/7')}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-900">
                            <span className="text-white text-xs font-semibold">EK</span>
                          </div>
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                          <div className="flex justify-between items-center">
                            <h3 className="text-white font-medium truncate">Eko</h3>
                            <span className="text-xs text-gray-400">09:30</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-gray-400 text-sm truncate">Aji, status laporan?</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* David */}
                      <div 
                        className="flex items-center p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800"
                        onClick={() => navigate('/chat/direct/8')}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-900">
                            <span className="text-white text-xs font-semibold">DA</span>
                          </div>
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                          <div className="flex justify-between items-center">
                            <h3 className="text-white font-medium truncate">David</h3>
                            <span className="text-xs text-gray-400">10:15</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-gray-400 text-sm truncate">Persiapan untuk operasi besok sudah selesai?</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* New chat button */}
                    <div className="p-3 border-t border-gray-700">
                      <Button onClick={() => setShowNewChatDialog(true)} variant="outline" className="w-full">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        New Communication
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Halaman ChatRoom jika activeChat dipilih, jika tidak tampilkan instruksi */}
              <div className="flex-1 bg-[#1f201c]">
                {activeChat ? (
                  <>
                    {console.log("Navigating to chat room:", {
                      chatId: activeChat.id,
                      isRoom: activeChat.isRoom,
                      chatName: getChatName(activeChat.id, activeChat.isRoom)
                    })}
                    <SimpleChatRoom 
                      chatId={activeChat.id}
                      isRoom={activeChat.isRoom}
                      chatName={getChatName(activeChat.id, activeChat.isRoom)}
                      onBack={() => setActiveChat(null)}
                    />
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <img 
                        src="https://www.pngitem.com/pimgs/m/17-170242_military-silhouette-png-military-radio-icon-transparent-png.png" 
                        alt="Military Communication" 
                        className="w-48 h-48 mx-auto mb-6 opacity-20"
                      />
                      <p className="text-[#bdc1c0] mb-4">Select a contact from the list or start a new communication</p>
                      <Button 
                        onClick={() => setShowNewChatDialog(true)}
                        className="bg-[#566c57] hover:bg-[#668568] border-none px-6 text-white"
                      >
                        <PlusIcon className="mr-2 h-4 w-4" />
                        START NEW COMMUNICATION
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Personnel Tab */}
          {activeTab === "personnel" && (
            <div className="flex-1 overflow-hidden flex flex-col bg-[#2a2b25]">
              <header className="p-3 py-4 border-b border-accent/50 bg-[#566c57] flex justify-between items-center">
                <h2 className="font-bold uppercase text-white tracking-wide">PERSONNEL DIRECTORY</h2>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
                  >
                    <UserPlus className="mr-1 h-4 w-4" />
                    ADD CONTACT
                  </Button>
                </div>
              </header>
              
              <div className="p-4 border-b border-accent/50 bg-[#3d3f35]">
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search Personnel..." 
                      className="pl-8 bg-[#2a2b25] border-accent/50"
                      value={personnelSearchQuery}
                      onChange={(e) => setPersonnelSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Select value={personnelBranchFilter} onValueChange={setPersonnelBranchFilter}>
                    <SelectTrigger className="w-auto bg-[#2a2b25] border-accent/50 h-8">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      <SelectItem value="army">Army</SelectItem>
                      <SelectItem value="navy">Navy</SelectItem>
                      <SelectItem value="airforce">Air Force</SelectItem>
                      <SelectItem value="marines">Marines</SelectItem>
                      <SelectItem value="specialforces">Special Forces</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={personnelBattalionFilter} onValueChange={setPersonnelBattalionFilter}>
                    <SelectTrigger className="w-auto bg-[#2a2b25] border-accent/50 h-8">
                      <SelectValue placeholder="Battalion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Battalions</SelectItem>
                      <SelectItem value="1st">1st Infantry</SelectItem>
                      <SelectItem value="2nd">2nd Armored</SelectItem>
                      <SelectItem value="3rd">3rd Reconnaissance</SelectItem>
                      <SelectItem value="4th">4th Signal</SelectItem>
                      <SelectItem value="5th">5th Engineering</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={personnelAreaFilter} onValueChange={setPersonnelAreaFilter}>
                    <SelectTrigger className="w-auto bg-[#2a2b25] border-accent/50 h-8">
                      <SelectValue placeholder="Area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Areas</SelectItem>
                      <SelectItem value="north">Northern Sector</SelectItem>
                      <SelectItem value="south">Southern Sector</SelectItem>
                      <SelectItem value="east">Eastern Sector</SelectItem>
                      <SelectItem value="west">Western Sector</SelectItem>
                      <SelectItem value="central">Central Command</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                <ContactsList 
                  users={users}
                  isLoading={isLoading}
                  error={error}
                  onContactSelected={(userId) => {
                    console.log(`Selected contact: ${userId}`);
                    
                    // Check if chat already exists
                    const existingChat = mockChats.find(chat => !chat.isRoom && chat.id === userId);
                    
                    if (!existingChat) {
                      // Add new chat
                      const newChat = { id: userId, name: `User-${userId}`, isRoom: false };
                      setMockChats(prev => [...prev, newChat]);
                    }
                    
                    // Navigate to chat
                    setActiveChat({ id: userId, isRoom: false });
                    setActiveTab("chats");
                  }}
                />
                <div className="h-12 w-full"></div>
              </div>
            </div>
          )}
          
          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-hidden flex flex-col bg-[#2a2b25]">
              <header className="p-3 py-4 border-b border-accent/50 bg-[#566c57] flex justify-between items-center">
                <h2 className="font-bold uppercase text-white tracking-wide">SYSTEM SETTINGS</h2>
              </header>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-3 text-[#bdc1c0]">PROFILE INFORMATION</h3>
                    
                    <div className="mb-6 p-4 border border-accent rounded-md">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="display-username" className="text-xs">USERNAME</Label>
                          <div id="display-username" className="p-2 bg-muted rounded-md text-sm">{user?.username || "Unknown"}</div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="display-rank" className="text-xs">RANK</Label>
                          <div id="display-rank" className="p-2 bg-muted rounded-md text-sm">COLONEL</div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="display-unit" className="text-xs">UNIT</Label>
                          <div id="display-unit" className="p-2 bg-muted rounded-md text-sm">SPECIAL FORCES</div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="display-branch" className="text-xs">BRANCH</Label>
                          <div id="display-branch" className="p-2 bg-muted rounded-md text-sm">ARMY</div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <Button 
                          onClick={() => setShowEditProfileDialog(true)}
                          className="bg-[#566c57] hover:bg-[#668568] border-none text-white"
                          size="sm"
                        >
                          EDIT PROFILE
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-3 text-[#bdc1c0]">SECURITY SETTINGS</h3>
                    
                    <div className="mb-4 p-4 border border-accent rounded-md">
                      <div className="mb-4">
                        <Label className="text-xs block mb-1">PASSWORD</Label>
                        <div className="p-2 bg-muted rounded-md text-sm">••••••••</div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button 
                          onClick={() => setShowChangePasswordDialog(true)}
                          className="bg-[#566c57] hover:bg-[#668568] border-none text-white"
                          size="sm"
                        >
                          CHANGE PASSWORD
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-3 text-[#bdc1c0]">SYSTEM ACTIONS</h3>
                    
                    <Button 
                      variant="destructive" 
                      onClick={handleLogout}
                      className="w-full"
                    >
                      SECURE LOGOUT
                    </Button>
                  </div>
                </div>
                <div className="h-16 w-full"></div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Dialogs */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {forwardedMessage ? "FORWARD MESSAGE" : "NEW COMMUNICATION"}
            </DialogTitle>
          </DialogHeader>
          
          {!forwardedMessage && (
            <div className="mb-4">
              <Label htmlFor="chat-type" className="text-xs font-bold mb-1 block">COMMUNICATION TYPE</Label>
              <Select value={chatType} onValueChange={(value) => setChatType(value as "direct" | "room")}>
                <SelectTrigger id="chat-type" className="w-full border-accent">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">DIRECT (PRIVATE)</SelectItem>
                  <SelectItem value="room">ROOM (GROUP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {chatType === "direct" && (
            <div>
              <Label htmlFor="contact" className="text-xs font-bold mb-1 block">SELECT CONTACT</Label>
              <Select onValueChange={(value) => setSelectedContactId(Number(value))}>
                <SelectTrigger id="contact" className="w-full border-accent">
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">DAVID [COLONEL]</SelectItem>
                  <SelectItem value="101">BRAVO2 [MAJOR]</SelectItem>
                  <SelectItem value="102">CHARLIE3 [CAPTAIN]</SelectItem>
                  <SelectItem value="103">DELTA4 [LIEUTENANT]</SelectItem>
                  <SelectItem value="104">ECHO5 [SERGEANT]</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {chatType === "room" && (
            <div>
              <div className="mb-4">
                <Label htmlFor="room-name" className="text-xs font-bold mb-1 block">ROOM NAME</Label>
                <Input
                  id="room-name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="border-accent"
                  placeholder="Enter room name"
                />
              </div>
              
              <Label className="text-xs font-bold mb-1 block">SELECT MEMBERS</Label>
              <div className="mb-2 flex items-center">
                <Input
                  id="search-members" 
                  placeholder="Search members..."
                  className="border-accent"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2 border-accent"
                  onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                >
                  {isMultiSelectMode ? "FINISH" : "SELECT MULTIPLE"}
                </Button>
              </div>
              
              <div className="border border-accent rounded-md h-40 overflow-y-auto p-2">
                {[
                  { id: 8, name: "DAVID", rank: "COLONEL" },
                  { id: 101, name: "BRAVO2", rank: "MAJOR" },
                  { id: 102, name: "CHARLIE3", rank: "CAPTAIN" },
                  { id: 103, name: "DELTA4", rank: "LIEUTENANT" },
                  { id: 104, name: "ECHO5", rank: "SERGEANT" }
                ].map((contact) => (
                  <div 
                    key={contact.id}
                    className="flex items-center justify-between p-2 hover:bg-accent/10 rounded cursor-pointer"
                    onClick={() => {
                      if (isMultiSelectMode) {
                        setSelectedContactIds(prev => 
                          prev.includes(contact.id) 
                            ? prev.filter(id => id !== contact.id) 
                            : [...prev, contact.id]
                        );
                      } else {
                        setSelectedContactId(contact.id);
                        handleCreateNewChat();
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
                      <span>{contact.name}</span>
                      <Badge className="ml-2 bg-[#566c57] text-xs" variant="secondary">
                        {contact.rank}
                      </Badge>
                    </div>
                    {isMultiSelectMode && (
                      <div className={`h-4 w-4 rounded border ${
                        selectedContactIds.includes(contact.id) 
                          ? 'bg-primary border-primary' 
                          : 'border-accent'
                      }`}>
                        {selectedContactIds.includes(contact.id) && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-primary-foreground">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => setShowNewChatDialog(false)} 
              variant="outline" 
              className="border-accent"
            >
              CANCEL
            </Button>
            <Button 
              onClick={handleCreateNewChat}
              className="bg-[#566c57] hover:bg-[#668568] border-none text-white"
            >
              {forwardedMessage ? "FORWARD" : "START"} COMMUNICATION
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showNewCallDialog} onOpenChange={setShowNewCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>NEW CALL</DialogTitle>
          </DialogHeader>
          
          <div className="mb-4">
            <Label htmlFor="call-type" className="text-xs font-bold mb-1 block">CALL TYPE</Label>
            <Select value={callType} onValueChange={(value) => setCallType(value as "audio" | "video")}>
              <SelectTrigger id="call-type" className="w-full border-accent">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audio">AUDIO CALL</SelectItem>
                <SelectItem value="video">VIDEO CALL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="call-contact" className="text-xs font-bold mb-1 block">SELECT CONTACT</Label>
            <Select onValueChange={(value) => setSelectedContactId(Number(value))}>
              <SelectTrigger id="call-contact" className="w-full border-accent">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">DAVID [COLONEL]</SelectItem>
                <SelectItem value="101">BRAVO2 [MAJOR]</SelectItem>
                <SelectItem value="102">CHARLIE3 [CAPTAIN]</SelectItem>
                <SelectItem value="103">DELTA4 [LIEUTENANT]</SelectItem>
                <SelectItem value="104">ECHO5 [SERGEANT]</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowNewCallDialog(false)} 
              variant="outline" 
              className="border-accent"
            >
              CANCEL
            </Button>
            <Button 
              onClick={handleStartCall}
              className="bg-[#566c57] hover:bg-[#668568] border-none text-white"
            >
              START CALL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showEditProfileDialog} onOpenChange={setShowEditProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>EDIT PROFILE</DialogTitle>
          </DialogHeader>
          
          <div className="mb-4">
            <Label htmlFor="profile-username" className="text-xs font-bold mb-1 block">USERNAME</Label>
            <Input
              id="profile-username"
              value={profileForm.username}
              onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
              className="border-accent"
              disabled
            />
            <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
          </div>
          
          <div className="mb-4">
            <Label htmlFor="profile-rank" className="text-xs font-bold mb-1 block">RANK</Label>
            <Select 
              value={profileForm.rank} 
              onValueChange={(value) => setProfileForm({...profileForm, rank: value})}
            >
              <SelectTrigger id="profile-rank" className="border-accent">
                <SelectValue placeholder="Select rank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">PRIVATE</SelectItem>
                <SelectItem value="CORPORAL">CORPORAL</SelectItem>
                <SelectItem value="SERGEANT">SERGEANT</SelectItem>
                <SelectItem value="LIEUTENANT">LIEUTENANT</SelectItem>
                <SelectItem value="CAPTAIN">CAPTAIN</SelectItem>
                <SelectItem value="MAJOR">MAJOR</SelectItem>
                <SelectItem value="COLONEL">COLONEL</SelectItem>
                <SelectItem value="GENERAL">GENERAL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="mb-4">
            <Label htmlFor="profile-branch" className="text-xs font-bold mb-1 block">BRANCH</Label>
            <Select 
              value={profileForm.branch} 
              onValueChange={(value) => setProfileForm({...profileForm, branch: value})}
            >
              <SelectTrigger id="profile-branch" className="border-accent">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARMY">ARMY</SelectItem>
                <SelectItem value="NAVY">NAVY</SelectItem>
                <SelectItem value="AIR FORCE">AIR FORCE</SelectItem>
                <SelectItem value="MARINES">MARINES</SelectItem>
                <SelectItem value="SPECIAL FORCES">SPECIAL FORCES</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowEditProfileDialog(false)} 
              variant="outline" 
              className="border-accent"
            >
              CANCEL
            </Button>
            <Button 
              onClick={handleSaveProfile}
              className="bg-[#566c57] hover:bg-[#668568] border-none text-white"
            >
              SAVE PROFILE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CHANGE PASSWORD</DialogTitle>
          </DialogHeader>
          
          <div className="mb-4">
            <Label htmlFor="current-password" className="text-xs font-bold mb-1 block">CURRENT PASSWORD</Label>
            <Input
              id="current-password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
              className="border-accent"
            />
          </div>
          
          <div className="mb-4">
            <Label htmlFor="new-password" className="text-xs font-bold mb-1 block">NEW PASSWORD</Label>
            <Input
              id="new-password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
              className="border-accent"
            />
          </div>
          
          <div className="mb-4">
            <Label htmlFor="confirm-password" className="text-xs font-bold mb-1 block">CONFIRM NEW PASSWORD</Label>
            <Input
              id="confirm-password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
              className="border-accent"
            />
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowChangePasswordDialog(false)} 
              variant="outline" 
              className="border-accent"
            >
              CANCEL
            </Button>
            <Button 
              onClick={handleChangePassword}
              className="bg-[#566c57] hover:bg-[#668568] border-none text-white"
            >
              UPDATE PASSWORD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
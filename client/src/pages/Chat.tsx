import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import WhatsAppStyleChatList from '@/components/WhatsAppStyleChatList';
import ChatRoom from '@/components/ChatRoom';

export default function Chat() {
  const [, setLocation] = useLocation();
  const [activeChat, setActiveChat] = useState<{id: number, isRoom: boolean, name: string} | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock chat data untuk tampilan awal
  const [chats, setChats] = useState<any[]>([
    {
      id: 1,
      name: "Tactical Team Alpha",
      isRoom: true,
      members: 8,
      unread: 3,
      lastMessage: "Mission briefing at 0800",
      lastMessageTime: "07:30",
    },
    {
      id: 2,
      name: "Lt. Johnson",
      isRoom: false,
      isOnline: true,
      unread: 0,
      lastMessage: "Copy that",
      lastMessageTime: "08:45",
      otherUserId: 101
    },
    {
      id: 3,
      name: "Operations Planning",
      isRoom: true,
      members: 12,
      unread: 5,
      lastMessage: "Updated coordinates",
      lastMessageTime: "09:15",
    },
    {
      id: 4,
      name: "Sgt. Martinez",
      isRoom: false,
      isOnline: false,
      unread: 2,
      lastMessage: "Equipment request approved",
      lastMessageTime: "Yesterday",
      otherUserId: 102
    }
  ]);

  // Cek autentikasi user
  useEffect(() => {
    const userData = localStorage.getItem("currentUser");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        setIsLoading(false);
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("currentUser");
        setLocation("/login");
      }
    } else {
      setLocation("/login");
    }
  }, [setLocation]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    setLocation("/login");
  };

  // Handle pemilihan chat
  const handleSelectChat = (id: number, isRoom: boolean) => {
    const selectedChat = chats.find(chat => chat.id === id && chat.isRoom === isRoom);
    if (selectedChat) {
      setActiveChat({
        id: selectedChat.id,
        isRoom: selectedChat.isRoom,
        name: selectedChat.name
      });
    }
  };

  // Handle back dari chat aktif
  const handleBackToList = () => {
    setActiveChat(null);
  };

  // Handle navigasi ke chat lain (untuk fitur forward pesan)
  const handleNavigateToChat = (targetId: number, isTargetRoom: boolean, forwardedMsg?: any) => {
    const targetChat = chats.find(chat => chat.id === targetId && chat.isRoom === isTargetRoom);
    if (targetChat) {
      setActiveChat({
        id: targetChat.id,
        isRoom: targetChat.isRoom,
        name: targetChat.name
      });
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
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-[#2c2c2c] p-3 flex justify-between items-center">
        <div className="flex items-center">
          <img src="/assets/Icon Chat NXXZ.png" alt="NXXZ Comms" className="h-8 w-8 mr-2" />
          <h1 className="text-lg font-bold text-[#a2bd62]">SECURE COMMS</h1>
        </div>
        <div className="flex items-center">
          <div className="mr-4 text-sm">
            <span className="text-gray-400 mr-1">{currentUser?.rank || ""}</span>
            <span className="text-[#a2bd62]">{currentUser?.callsign || "User"}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-[#353535] hover:bg-[#454545] text-white px-3 py-1 text-sm rounded"
          >
            LOGOUT
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Tampilkan daftar chat saat tidak ada chat aktif atau tampilkan dalam panel samping */}
        {!activeChat && (
          <div className="w-full flex flex-col">
            <div className="p-3 bg-[#1a1a1a] border-b border-[#2c2c2c]">
              <h2 className="text-md font-bold">COMMUNICATIONS</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <WhatsAppStyleChatList 
                chats={chats}
                activeChat={activeChat ? { id: activeChat.id, isRoom: activeChat.isRoom } : null}
                onSelectChat={handleSelectChat}
              />
            </div>
          </div>
        )}
        
        {/* Tampilkan chat room bila ada chat aktif */}
        {activeChat && (
          <div className="w-full flex">
            {/* Sidebar kecil (opsional) */}
            <div className="w-1/4 hidden md:block border-r border-[#2c2c2c]">
              <div className="p-3 bg-[#1a1a1a] border-b border-[#2c2c2c]">
                <h2 className="text-md font-bold">CHANNELS</h2>
              </div>
              <div className="overflow-y-auto">
                <WhatsAppStyleChatList 
                  chats={chats}
                  activeChat={{ id: activeChat.id, isRoom: activeChat.isRoom }}
                  onSelectChat={handleSelectChat}
                />
              </div>
            </div>
            
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              <ChatRoom 
                chatId={activeChat.id}
                isRoom={activeChat.isRoom}
                chatName={activeChat.name}
                onBack={handleBackToList}
                onNavigateToChat={handleNavigateToChat}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
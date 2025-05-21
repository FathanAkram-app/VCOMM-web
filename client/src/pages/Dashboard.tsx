import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import WhatsAppStyleChatList from "@/components/WhatsAppStyleChatList";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dummy chat data for initial display
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
  
  const [activeChat, setActiveChat] = useState<{ id: number; isRoom: boolean } | null>(null);

  // Check user authentication
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
        setLocation("/");
      }
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    setLocation("/");
  };

  // Handle selecting a chat
  const handleSelectChat = (id: number, isRoom: boolean) => {
    setActiveChat({ id, isRoom });
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
        {/* Chat List */}
        <div className="w-1/3 border-r border-[#2c2c2c] flex flex-col">
          <div className="p-3 bg-[#1a1a1a] border-b border-[#2c2c2c]">
            <h2 className="text-md font-bold">COMMUNICATIONS</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <WhatsAppStyleChatList 
              chats={chats}
              activeChat={activeChat}
              onSelectChat={handleSelectChat}
            />
          </div>
        </div>
        
        {/* Chat Area / Empty State */}
        <div className="flex-1 flex flex-col">
          {activeChat ? (
            <div className="p-4 flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="mb-2">Select a conversation to start messaging</p>
                <p className="text-xs">Chat functionality will be implemented in the next phase</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#121212]">
              <div className="text-center">
                <div className="mb-4">
                  <img src="/assets/Icon Chat NXXZ.png" alt="NXXZ Comms" className="h-20 w-20 mx-auto opacity-30" />
                </div>
                <h3 className="text-[#a2bd62] text-xl font-bold mb-2">WELCOME TO SECURE COMMS</h3>
                <p className="text-gray-500 max-w-md">
                  Select a conversation from the list to begin secure communication
                </p>
                <div className="mt-6 flex justify-center">
                  <div className="bg-[#1a1a1a] inline-block px-3 py-2 rounded border border-[#2c2c2c]">
                    <p className="text-xs text-[#a2bd62] mb-1">STATUS: SECURE CONNECTION</p>
                    <p className="text-xs text-gray-400">ENCRYPTION PROTOCOL: ACTIVE</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { MessageSquare, MoreVertical, PlusIcon, Trash } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { getAuthData } from "../lib/authUtils";

// Interface untuk item chat
interface ChatItem {
  id: number;
  name: string;
  isRoom: boolean;
  isOnline?: boolean;
  members?: number;
  unread?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  otherUserId?: number;
}

// Props untuk komponen chat list
interface ChatListProps {
  activeChat?: { id: number; isRoom: boolean } | null;
  onSelectChat?: (id: number, isRoom: boolean) => void;
  onChatDeleted?: (id: number, isRoom: boolean) => void;
  onStartDirectChat?: (userId: number) => void;
}

// Komponen utama
export default function SimpleWhatsAppStyleChatList({
  activeChat,
  onSelectChat,
  onChatDeleted,
  onStartDirectChat
}: ChatListProps) {
  // State untuk komponen
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  
  // Load chat list saat komponen dimount
  useEffect(() => {
    const userData = getAuthData();
    const userId = userData?.id;
    
    if (userId) {
      console.log("Current user ID:", userId);
      
      // Hardcoded chat list berdasarkan user ID
      if (userId === 7) { // Eko
        setChatItems([
          {
            id: 1,
            name: "Special Forces Team",
            isRoom: true,
            isOnline: false,
            members: 5,
            unread: 2,
            lastMessage: "Mission briefing tomorrow at 0800",
            lastMessageTime: new Date().toISOString()
          },
          {
            id: 1001,
            name: "Aji",
            isRoom: false,
            isOnline: true,
            unread: 1,
            lastMessage: "Laporan sudah selesai Pak",
            lastMessageTime: new Date().toISOString(),
            otherUserId: 9
          },
          {
            id: 1002,
            name: "David",
            isRoom: false,
            isOnline: false,
            unread: 0,
            lastMessage: "Persiapan untuk operasi besok sudah selesai?",
            lastMessageTime: new Date().toISOString(),
            otherUserId: 8
          }
        ]);
      } 
      else if (userId === 9) { // Aji
        setChatItems([
          {
            id: 1,
            name: "Special Forces Team",
            isRoom: true,
            isOnline: false,
            members: 5,
            unread: 2,
            lastMessage: "Mission briefing tomorrow at 0800",
            lastMessageTime: new Date().toISOString()
          },
          {
            id: 2001,
            name: "Eko",
            isRoom: false,
            isOnline: true,
            unread: 0,
            lastMessage: "Aji, status laporan?",
            lastMessageTime: new Date().toISOString(),
            otherUserId: 7
          }
        ]);
      }
      else {
        // User lain
        setChatItems([
          {
            id: 1,
            name: "Special Forces Team",
            isRoom: true,
            isOnline: false,
            members: 5,
            unread: 0,
            lastMessage: "Welcome to Special Forces Team",
            lastMessageTime: new Date().toISOString()
          }
        ]);
      }
    }
    
    // Selesai loading
    setIsLoadingChats(false);
  }, []);
  
  // Handler untuk memilih chat
  const handleSelectChat = (id: number, isRoom: boolean) => {
    if (onSelectChat) {
      onSelectChat(id, isRoom);
    }
  };
  
  // Handler untuk menghapus chat
  const handleDeleteChat = (id: number, isRoom: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChatDeleted) {
      onChatDeleted(id, isRoom);
    }
  };
  
  // Handler untuk membuat chat baru
  const handleNewChat = () => {
    // Hardcoded untuk demo - mulai chat dengan Aji jika user adalah Eko
    const userData = getAuthData();
    if (userData?.id === 7 && onStartDirectChat) {
      onStartDirectChat(9); // Start chat dengan Aji (ID: 9)
    }
    // Jika user adalah Aji, mulai chat dengan Eko
    else if (userData?.id === 9 && onStartDirectChat) {
      onStartDirectChat(7); // Start chat dengan Eko (ID: 7)
    }
  };
  
  // Format tanggal untuk tampilan
  const formatLastMessageTime = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (e) {
      return "";
    }
  };
  
  // Render loading state
  if (isLoadingChats) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 space-y-4">
        <div className="animate-pulse flex flex-col w-full space-y-3">
          <div className="h-10 bg-gray-700 rounded w-3/4"></div>
          <div className="h-10 bg-gray-700 rounded w-full"></div>
          <div className="h-10 bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }
  
  // Render empty state
  if (chatItems.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 space-y-4">
        <MessageSquare className="w-12 h-12 text-gray-400" />
        <p className="text-gray-400 text-center">No communications available</p>
        <Button onClick={handleNewChat} variant="outline" className="mt-2">
          <PlusIcon className="h-4 w-4 mr-2" />
          New Communication
        </Button>
      </div>
    );
  }
  
  // Render chat list
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {chatItems.map((chat) => (
          <div 
            key={`${chat.isRoom ? 'room' : 'direct'}-${chat.id}`}
            className={`flex items-center p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors ${
              activeChat && activeChat.id === chat.id && activeChat.isRoom === chat.isRoom
                ? "bg-gray-800"
                : ""
            }`}
            onClick={() => handleSelectChat(chat.id, chat.isRoom)}
          >
            {/* Avatar/Icon */}
            <div className="relative flex-shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                chat.isRoom ? "bg-green-900" : "bg-blue-900"
              }`}>
                {chat.isRoom ? (
                  <span className="text-white text-xs font-semibold">
                    {chat.members || 2}
                  </span>
                ) : (
                  <span className="text-white text-xs font-semibold">
                    {chat.name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Online indicator */}
              {!chat.isRoom && chat.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
              )}
            </div>
            
            {/* Chat details */}
            <div className="ml-3 flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-medium truncate">
                  {chat.name}
                  {chat.isRoom && 
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({chat.members} members)
                    </span>
                  }
                </h3>
                <span className="text-xs text-gray-400">
                  {chat.lastMessageTime ? formatLastMessageTime(chat.lastMessageTime) : ""}
                </span>
              </div>
              
              <div className="flex justify-between items-center mt-1">
                <p className="text-gray-400 text-sm truncate">
                  {chat.lastMessage || "No messages yet"}
                </p>
                
                {chat.unread && chat.unread > 0 ? (
                  <span className="ml-2 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {chat.unread}
                  </span>
                ) : null}
              </div>
            </div>
            
            {/* Actions dropdown */}
            <div onClick={(e) => e.stopPropagation()} className="ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    className="text-red-500 cursor-pointer"
                    onClick={(e) => handleDeleteChat(chat.id, chat.isRoom, e as any)}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete {chat.isRoom ? "Group" : "Chat"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
      
      {/* New chat button */}
      <div className="p-3 border-t border-gray-700">
        <Button onClick={handleNewChat} variant="outline" className="w-full">
          <PlusIcon className="h-4 w-4 mr-2" />
          New Communication
        </Button>
      </div>
    </div>
  );
}
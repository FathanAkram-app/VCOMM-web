import { useState, useEffect } from "react";
import { MessageSquare, MoreVertical, PlusIcon, Trash } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

// Interface untuk item chat
export interface ChatItem {
  id: number;
  name: string;
  isGroup: boolean;
  isOnline?: boolean;
  members?: number;
  unread?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  otherUserId?: number;
}

// Props untuk komponen chat list
interface ChatListProps {
  activeChat?: { id: number; isGroup: boolean } | null;
  onSelectChat?: (id: number, isGroup: boolean) => void;
  onChatDeleted?: (id: number, isGroup: boolean) => void;
  onClearChatHistory?: (id: number, isGroup: boolean) => void;
  onCreateGroup?: () => void;
}

// Format tanggal untuk tampilan
const formatLastMessageTime = (isoDate: string) => {
  try {
    const date = new Date(isoDate);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } catch (e) {
    return "";
  }
};

// Komponen utama
export default function ChatList({
  activeChat,
  onSelectChat,
  onChatDeleted,
  onClearChatHistory,
  onCreateGroup
}: ChatListProps) {
  const { user } = useAuth();
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  
  // Fetch conversations from API
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: !!user,
  });
  
  // Load chat list from API
  useEffect(() => {
    if (isLoading) {
      setIsLoadingChats(true);
      return;
    }
    
    if (conversations && conversations.length > 0) {
      const formattedChats = conversations.map((conversation: any) => ({
        id: conversation.id,
        name: conversation.name || 'Unnamed Chat',
        isGroup: conversation.isGroup,
        members: conversation.memberCount || 2,
        lastMessage: conversation.lastMessage?.content || '',
        lastMessageTime: conversation.lastMessage?.createdAt,
        unread: conversation.unreadCount || 0,
        isOnline: false, // We'll set this separately
      }));
      
      setChatItems(formattedChats);
    } else {
      setChatItems([]);
    }
    
    setIsLoadingChats(false);
  }, [conversations, isLoading]);
  
  // Handler untuk memilih chat
  const handleSelectChat = (id: number, isGroup: boolean) => {
    if (onSelectChat) {
      onSelectChat(id, isGroup);
    }
  };
  
  // Handler untuk menghapus chat
  const handleDeleteChat = (id: number, isGroup: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChatDeleted) {
      onChatDeleted(id, isGroup);
    }
  };
  
  // Handler untuk membuat chat baru
  const handleNewChat = () => {
    if (onCreateGroup) {
      onCreateGroup();
    }
  };
  
  // Render loading state
  if (isLoadingChats) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 space-y-4">
        <div className="animate-pulse flex flex-col w-full space-y-3">
          <div className="h-10 bg-[#292929] rounded w-3/4"></div>
          <div className="h-10 bg-[#292929] rounded w-full"></div>
          <div className="h-10 bg-[#292929] rounded w-5/6"></div>
        </div>
      </div>
    );
  }
  
  // Render empty state
  if (chatItems.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 space-y-4">
        <MessageSquare className="w-12 h-12 text-[#a6c455]" />
        <p className="text-gray-400 text-center">Belum ada komunikasi yang tersedia</p>
        <Button onClick={handleNewChat} variant="outline" className="mt-2 bg-[#4d5d30] text-white hover:bg-[#5a6b38] border-none">
          <PlusIcon className="h-4 w-4 mr-2" />
          Komunikasi Baru
        </Button>
      </div>
    );
  }
  
  // Deduplikasi chat items
  // Pertama, ambil chat group
  const groupChats = chatItems.filter(chat => chat.isGroup);
  
  // Kemudian ambil direct chats tanpa duplikasi nama
  const uniqueUserNames = new Set();
  const uniqueDirectChats = [];
  
  // Filter direct chats
  chatItems.filter(chat => !chat.isGroup).forEach(chat => {
    const lowerName = chat.name?.toLowerCase();
    if (lowerName && !uniqueUserNames.has(lowerName)) {
      uniqueUserNames.add(lowerName);
      uniqueDirectChats.push(chat);
    }
  });
  
  // Gabungkan keduanya untuk tampilan final
  const finalChatList = [...groupChats, ...uniqueDirectChats];
  
  // Render chat list
  return (
    <div className="flex flex-col h-full bg-[#171717]">
      <div className="flex-1 overflow-y-auto">
        {finalChatList.map((chat) => (
          <div 
            key={`${chat.isGroup ? 'group' : 'direct'}-${chat.id}`}
            className={`flex items-center p-3 border-b border-[#333333] cursor-pointer hover:bg-[#222222] transition-colors ${
              activeChat && activeChat.id === chat.id && activeChat.isGroup === chat.isGroup
                ? "bg-[#222222]"
                : ""
            }`}
            onClick={() => handleSelectChat(chat.id, chat.isGroup)}
          >
            {/* Avatar/Icon */}
            <div className="relative flex-shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                chat.isGroup ? "bg-[#4d5d30]" : "bg-[#5a6b38]"
              }`}>
                {chat.isGroup ? (
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
              {!chat.isGroup && chat.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#171717]"></div>
              )}
            </div>
            
            {/* Chat details */}
            <div className="ml-3 flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-medium truncate">
                  {chat.name}
                  {chat.isGroup && 
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({chat.members} anggota)
                    </span>
                  }
                </h3>
                <span className="text-xs text-gray-400">
                  {chat.lastMessageTime ? formatLastMessageTime(chat.lastMessageTime) : ""}
                </span>
              </div>
              
              <div className="flex justify-between items-center mt-1">
                <p className="text-gray-400 text-sm truncate">
                  {chat.lastMessage || "Belum ada pesan"}
                </p>
                
                {chat.unread && chat.unread > 0 ? (
                  <span className="ml-2 bg-[#4d5d30] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {chat.unread}
                  </span>
                ) : null}
              </div>
            </div>
            
            {/* Actions dropdown */}
            <div onClick={(e) => e.stopPropagation()} className="ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8d9c6b] hover:text-white">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#1e1e1e] border-[#3d5040] text-[#e4e6e3]">
                  <DropdownMenuItem 
                    className="hover:bg-[#3d5040] cursor-pointer focus:bg-[#3d5040] focus:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Feature: Bersihkan riwayat chat
                      if (confirm(`Apakah Anda yakin ingin membersihkan riwayat chat dengan ${chat.name}? Semua pesan akan dihapus.`)) {
                        if (onClearChatHistory) {
                          onClearChatHistory(chat.id, chat.isGroup);
                        }
                      }
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Bersihkan Chat
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    className="text-red-500 cursor-pointer hover:bg-[#3d5040] focus:bg-[#3d5040] focus:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Apakah Anda yakin ingin menghapus chat dengan ${chat.name}?`)) {
                        handleDeleteChat(chat.id, chat.isGroup, e as React.MouseEvent);
                      }
                    }}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Hapus {chat.isGroup ? "Grup" : "Chat"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
      
      {/* New chat button */}
      <div className="p-3 border-t border-[#333333]">
        <Button onClick={handleNewChat} variant="outline" className="w-full bg-[#4d5d30] hover:bg-[#5a6b38] text-white border-none">
          <PlusIcon className="h-4 w-4 mr-2" />
          Komunikasi Baru
        </Button>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { User, Users, MoreVertical, Search, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useAuth } from '../hooks/use-auth';

interface ChatItem {
  id: number;
  type: 'direct' | 'room';
  name: string;
  otherUserId?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isActive?: boolean;
}

interface SimpleChatListProps {
  onSelectChat: (id: number, type: 'direct' | 'room') => void;
  activeChat?: { id: number, type: 'direct' | 'room' } | null;
}

const SimpleChatList: React.FC<SimpleChatListProps> = ({ onSelectChat, activeChat }) => {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // Fetch and initialize chat data
  useEffect(() => {
    if (!user?.id) return;
    
    // Ambil data chat dari localStorage
    const chatKey = `user_${user.id}_chats`;
    const storedChats = localStorage.getItem(chatKey);
    
    if (storedChats) {
      try {
        const parsedChats = JSON.parse(storedChats);
        
        // Konversi ke format yang kita butuhkan
        const formattedChats: ChatItem[] = parsedChats.map((chat: any) => ({
          id: chat.id,
          type: chat.isRoom ? 'room' : 'direct',
          name: chat.name,
          otherUserId: chat.otherUserId,
          lastMessage: chat.lastMessage,
          lastMessageTime: chat.lastMessageTime,
          unreadCount: chat.unread || 0,
          isActive: (activeChat?.id === chat.id && 
                    activeChat?.type === (chat.isRoom ? 'room' : 'direct'))
        }));
        
        // Urutkan dari yang terbaru
        formattedChats.sort((a, b) => {
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        });
        
        setChats(formattedChats);
        console.log('Loaded chats from localStorage:', formattedChats);
      } catch (error) {
        console.error('Error parsing stored chats:', error);
      }
    }
    
    // Jika tidak ada chat, buat chat default untuk demo
    if (!storedChats || JSON.parse(storedChats).length === 0) {
      createDefaultChats();
    }
    
    // Ambil data pengguna
    fetchUsers();
  }, [user, activeChat]);
  
  // Fungsi untuk membuat chat default
  const createDefaultChats = () => {
    if (!user?.id) return;
    
    // Contoh chat default dengan Eko dan David
    const defaultChats: ChatItem[] = [
      {
        id: 1001,
        type: 'direct',
        name: 'Eko (Colonel)',
        otherUserId: 7, // ID Eko
        lastMessage: 'Secure communication established',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 1
      },
      {
        id: 1002,
        type: 'direct',
        name: 'David (Colonel)',
        otherUserId: 8, // ID David
        lastMessage: 'Siap, komandan!',
        lastMessageTime: new Date(Date.now() - 3600000).toISOString(), // 1 jam yang lalu
        unreadCount: 0
      },
      {
        id: 2001,
        type: 'room',
        name: 'Special Forces Team',
        lastMessage: 'Meeting tomorrow at 0800',
        lastMessageTime: new Date(Date.now() - 86400000).toISOString(), // 1 hari yang lalu
        unreadCount: 3
      }
    ];
    
    // Simpan ke localStorage
    const chatKey = `user_${user.id}_chats`;
    localStorage.setItem(chatKey, JSON.stringify(defaultChats.map(chat => ({
      id: chat.id,
      isRoom: chat.type === 'room',
      name: chat.name,
      otherUserId: chat.otherUserId,
      lastMessage: chat.lastMessage,
      lastMessageTime: chat.lastMessageTime,
      unread: chat.unreadCount
    }))));
    
    setChats(defaultChats);
    console.log('Created default chats:', defaultChats);
    
    // Juga buat pesan default untuk setiap chat
    defaultChats.forEach(chat => {
      const messagesKey = `chat_messages_${chat.type === 'room' ? 'room' : 'direct'}_${chat.id}`;
      
      if (!localStorage.getItem(messagesKey)) {
        const initialMessages = [
          {
            id: Date.now(),
            senderId: 0, // ID 0 untuk system
            sender: 'System',
            text: 'Secure communication established.',
            timestamp: new Date().toISOString(),
            isRead: true
          }
        ];
        
        // Tambahkan pesan sesuai dengan lastMessage pada chat
        if (chat.lastMessage && chat.lastMessage !== 'Secure communication established') {
          initialMessages.push({
            id: Date.now() + 1,
            senderId: chat.type === 'direct' ? chat.otherUserId || 7 : 7, // Default sender Eko
            sender: chat.type === 'direct' ? chat.name.split(' ')[0] : 'Eko',
            text: chat.lastMessage,
            timestamp: chat.lastMessageTime || new Date().toISOString(),
            isRead: chat.unreadCount === 0
          });
        }
        
        localStorage.setItem(messagesKey, JSON.stringify(initialMessages));
        console.log(`Created default messages for ${chat.type} chat ${chat.id}`);
      }
    });
  };
  
  // Ambil data pengguna
  const fetchUsers = () => {
    // Untuk demo, kita gunakan data statis
    const users = [
      { id: 7, username: 'Eko', nama: 'Eko', pangkat: 'Colonel', kesatuan: 'Special Forces', nrp: '1001' },
      { id: 8, username: 'David', nama: 'David', pangkat: 'Colonel', kesatuan: 'Special Forces', nrp: '1002' },
      { id: 9, username: 'Aji', nama: 'Aji', pangkat: 'Major', kesatuan: 'Communications', nrp: '1003' }
    ];
    
    // Simpan ke localStorage untuk digunakan komponen lain
    localStorage.setItem('allUsers', JSON.stringify(users));
    
    // Filter untuk tidak menampilkan diri sendiri
    const filteredUsers = users.filter(u => u.id !== user?.id);
    setAllUsers(filteredUsers);
  };
  
  // Filter chat berdasarkan pencarian
  const filteredChats = searchQuery 
    ? chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats;
  
  // Membuat chat baru
  const createNewChat = () => {
    if (!selectedUserId || !user?.id) return;
    
    // Temukan user yang dipilih
    const selectedUser = allUsers.find(u => u.id === selectedUserId);
    if (!selectedUser) return;
    
    // Generate ID unik
    const newChatId = Date.now();
    
    // Buat chat baru
    const newChat: ChatItem = {
      id: newChatId,
      type: 'direct',
      name: `${selectedUser.nama} (${selectedUser.pangkat})`,
      otherUserId: selectedUser.id,
      lastMessage: 'Secure communication established',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0
    };
    
    // Tambahkan ke state dan localStorage
    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    
    const chatKey = `user_${user.id}_chats`;
    localStorage.setItem(chatKey, JSON.stringify(updatedChats.map(chat => ({
      id: chat.id,
      isRoom: chat.type === 'room',
      name: chat.name,
      otherUserId: chat.otherUserId,
      lastMessage: chat.lastMessage,
      lastMessageTime: chat.lastMessageTime,
      unread: chat.unreadCount
    }))));
    
    // Buat pesan awal
    const messagesKey = `chat_messages_direct_${newChatId}`;
    const initialMessages = [
      {
        id: Date.now(),
        senderId: 0, // ID 0 untuk system
        sender: 'System',
        text: 'Secure communication established.',
        timestamp: new Date().toISOString(),
        isRead: true
      }
    ];
    localStorage.setItem(messagesKey, JSON.stringify(initialMessages));
    
    // Tutup dialog dan reset selection
    setShowNewChatDialog(false);
    setSelectedUserId(null);
    
    // Redirect ke chat baru
    onSelectChat(newChatId, 'direct');
  };
  
  // Format waktu relatif
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    
    const date = new Date(timeString);
    const now = new Date();
    
    // Jika hari ini, tampilkan jam:menit
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Jika kemarin, tampilkan "Kemarin"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    }
    
    // Jika dalam minggu ini, tampilkan nama hari
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return date.toLocaleDateString(undefined, { weekday: 'long' });
    }
    
    // Jika lebih lama, tampilkan tanggal
    return date.toLocaleDateString();
  };
  
  return (
    <div className="flex flex-col h-full bg-[#1f201c] text-[#e0e0e0]">
      {/* Header */}
      <div className="bg-[#2a2b25] p-3 flex justify-between items-center">
        <h1 className="text-[#e0e0e0] text-lg font-bold">COMMS</h1>
        <div className="flex items-center space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-[#e0e0e0]"
            onClick={() => setShowNewChatDialog(true)}
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="p-2 bg-[#2a2b25]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#969692]" />
          <Input
            placeholder="Cari pesan atau kontak..."
            className="pl-9 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0] focus:ring-[#566c57] focus:border-[#566c57]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 p-4">
            <p className="text-[#969692]">Tidak ada chat yang ditemukan</p>
            <Button
              variant="outline"
              className="mt-4 bg-[#354c36] hover:bg-[#455c46] border-[#354c36] text-white"
              onClick={() => setShowNewChatDialog(true)}
            >
              Mulai Chat Baru
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#3d3f35]/40">
            {filteredChats.map((chat) => (
              <div
                key={`${chat.type}-${chat.id}`}
                className={`flex items-center p-3 cursor-pointer
                  ${chat.isActive ? 'bg-[#3d3f35]' : 'hover:bg-[#2c2d27]'}`}
                onClick={() => onSelectChat(chat.id, chat.type)}
              >
                {/* Avatar */}
                <div className="relative">
                  <Avatar className={`h-12 w-12 mr-3 
                    ${chat.type === 'room' ? 'bg-[#566c57]' : 'bg-[#3d5a65]'}`}
                  >
                    <AvatarFallback className="text-white font-medium">
                      {chat.name.split(' ')[0].substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Badge untuk grup */}
                  {chat.type === 'room' && (
                    <div className="absolute -top-1 -right-1 bg-[#566c57] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      <Users className="h-3 w-3" />
                    </div>
                  )}
                </div>
                
                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium truncate pr-2">
                      {chat.name}
                    </h3>
                    <span className="text-xs text-[#969692] flex-shrink-0">
                      {formatTime(chat.lastMessageTime)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-sm truncate pr-2 ${chat.unreadCount && chat.unreadCount > 0 ? 'text-[#e0e0e0] font-medium' : 'text-[#969692]'}`}>
                      {chat.lastMessage || "No messages"}
                    </p>
                    
                    {chat.unreadCount && chat.unreadCount > 0 && (
                      <Badge className="bg-[#566c57] hover:bg-[#566c57] text-white">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-[#969692] hover:bg-[#3d3f35] hover:text-[#e0e0e0]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-[160px] bg-[#2a2b25] border-[#3d3f35]">
                    <DropdownMenuItem className="text-[#e0e0e0] focus:bg-[#3d3f35] focus:text-[#e0e0e0] cursor-pointer">
                      Arsipkan Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-[#e0e0e0] focus:bg-[#3d3f35] focus:text-[#e0e0e0] cursor-pointer">
                      Tandai Dibaca
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500 focus:bg-red-500/10 focus:text-red-500 cursor-pointer">
                      Hapus Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Dialog: New Chat */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]">
          <DialogHeader>
            <DialogTitle>Chat Baru</DialogTitle>
            <DialogDescription className="text-[#969692]">
              Pilih kontak untuk memulai chat baru.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto py-2 space-y-1">
            {allUsers.map(user => (
              <div
                key={user.id}
                className={`flex items-center p-2 rounded cursor-pointer
                  ${selectedUserId === user.id ? 'bg-[#354c36]' : 'hover:bg-[#2c2d27]'}`}
                onClick={() => setSelectedUserId(user.id)}
              >
                <Avatar className="h-10 w-10 mr-3 bg-[#3d5a65]">
                  <AvatarFallback className="text-white">
                    {user.nama.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.nama}</p>
                  <p className="text-xs text-[#969692]">{user.pangkat}, {user.kesatuan}</p>
                </div>
              </div>
            ))}
            
            {allUsers.length === 0 && (
              <p className="text-center py-4 text-[#969692]">Tidak ada kontak tersedia</p>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              className="border-[#3d3f35] text-[#e0e0e0] hover:bg-[#2c2d27]"
              onClick={() => {
                setShowNewChatDialog(false);
                setSelectedUserId(null);
              }}
            >
              Batal
            </Button>
            <Button
              className="bg-[#354c36] hover:bg-[#455c46] text-white"
              disabled={selectedUserId === null}
              onClick={createNewChat}
            >
              Mulai Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleChatList;
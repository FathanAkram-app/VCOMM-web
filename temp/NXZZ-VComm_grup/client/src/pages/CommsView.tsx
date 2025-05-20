import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Search, UserPlus, Users, MoreVertical, Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import MainMenu from '../components/MainMenu';
import { useAuth } from '../hooks/use-auth';

// Impor fungsi-fungsi chat
import { getUserChats, createDirectChat, initializeChats } from '../lib/sharedChat';

const CommsView: React.FC = () => {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [chats, setChats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // Inisialisasi data chat jika belum ada
  useEffect(() => {
    initializeChats();
  }, []);
  
  // Muat daftar chat pengguna
  useEffect(() => {
    if (!user) return;
    
    loadUserChats();
    loadAllUsers();
    
    // Refresh daftar chat setiap 3 detik
    const interval = setInterval(loadUserChats, 3000);
    
    return () => clearInterval(interval);
  }, [user]);
  
  // Muat daftar chat pengguna
  const loadUserChats = () => {
    if (!user) return;
    
    // Ambil daftar chat pengguna
    const userChats = getUserChats(user.id);
    
    // Urutkan berdasarkan waktu pesan terakhir
    userChats.sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
    
    setChats(userChats);
  };
  
  // Muat daftar semua pengguna
  const loadAllUsers = () => {
    try {
      // Cek di localStorage
      const usersStr = localStorage.getItem('allUsers');
      if (usersStr) {
        const users = JSON.parse(usersStr);
        
        // Filter untuk tidak menampilkan diri sendiri
        const filteredUsers = users.filter((u: any) => u.id !== user?.id);
        setAllUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };
  
  // Buat chat langsung baru
  const handleCreateDirectChat = () => {
    if (!user || selectedUserId === null) return;
    
    // Buat chat baru
    const chatId = createDirectChat(user.id, selectedUserId);
    
    // Tutup dialog
    setShowNewChatDialog(false);
    setSelectedUserId(null);
    
    // Refresh daftar chat
    loadUserChats();
    
    // Navigasi ke chat baru
    setLocation(`/chat/${chatId}`);
  };
  
  // Format waktu relatif
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      
      // Jika hari yang sama, tampilkan waktu
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
        return date.toLocaleDateString(undefined, { weekday: 'short' });
      }
      
      // Jika lebih lama, tampilkan tanggal
      return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
    } catch (error) {
      return '';
    }
  };
  
  // Filter chat berdasarkan pencarian
  const filteredChats = searchQuery 
    ? chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats;
  
  return (
    <div className="flex flex-col h-screen bg-[#1f201c]">
      {/* Header */}
      <div className="bg-[#2a2b25] px-4 py-3 flex justify-between items-center">
        <h1 className="text-[#e0e0e0] font-bold">COMMS</h1>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white"
            >
              <Plus size={24} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#2a2b25] border-[#3d3f35]">
            <DropdownMenuItem 
              className="text-[#e0e0e0] focus:bg-[#3d3f35] focus:text-white cursor-pointer"
              onClick={() => setShowNewChatDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Chat Langsung
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-[#e0e0e0] focus:bg-[#3d3f35] focus:text-white cursor-pointer"
              onClick={() => setShowNewGroupDialog(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              Chat Grup
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Search Bar */}
      <div className="p-2 bg-[#2a2b25]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#969692]" />
          <Input
            placeholder="Cari obrolan atau kontak..."
            className="pl-9 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0] focus:ring-[#566c57] focus:border-[#566c57]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <p className="text-[#969692] mb-2">Tidak ada obrolan</p>
            <p className="text-[#969692]/70 text-sm">Mulai obrolan baru dengan tombol + di atas</p>
          </div>
        ) : (
          <div className="divide-y divide-[#3d3f35]/40">
            {filteredChats.map(chat => (
              <div
                key={chat.id}
                className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]"
                onClick={() => setLocation(`/chat/${chat.id}`)}
              >
                {/* Avatar */}
                <div className="relative mr-3">
                  <Avatar className={`h-12 w-12 ${chat.isRoom ? 'bg-[#566c57]' : 'bg-[#3d5a65]'}`}>
                    <AvatarFallback className="text-white font-medium">
                      {chat.name.split(' ')[0].substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Badge untuk room */}
                  {chat.isRoom && (
                    <div className="absolute -top-1 -right-1 bg-[#8b9c8c] rounded-full h-5 w-5 flex items-center justify-center text-xs text-white">
                      <Users className="h-3 w-3" />
                    </div>
                  )}
                </div>
                
                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium text-[#e0e0e0] truncate pr-2">
                      {chat.name}
                    </h3>
                    <span className="text-xs text-[#969692] flex-shrink-0">
                      {formatTime(chat.lastMessageTime)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-sm truncate pr-2 ${chat.unread > 0 ? 'text-[#e0e0e0] font-medium' : 'text-[#969692]'}`}>
                      {chat.lastMessage || "Tidak ada pesan"}
                    </p>
                    
                    {chat.unread > 0 && (
                      <div className="bg-[#566c57] text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Menu Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[#969692] hover:bg-[#3d3f35] hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical size={20} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#2a2b25] border-[#3d3f35]">
                    <DropdownMenuItem className="text-[#e0e0e0] focus:bg-[#3d3f35] focus:text-white cursor-pointer">
                      Tandai sudah dibaca
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-[#e0e0e0] focus:bg-[#3d3f35] focus:text-white cursor-pointer">
                      Notifikasi diam
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500 focus:bg-red-500/10 focus:text-red-500 cursor-pointer">
                      Hapus chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Dialog: New Direct Chat */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]">
          <DialogHeader>
            <DialogTitle>Chat Langsung Baru</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto py-2 space-y-1">
            {allUsers.length === 0 ? (
              <p className="text-center py-4 text-[#969692]">Tidak ada kontak tersedia</p>
            ) : (
              allUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center p-2 rounded cursor-pointer
                    ${selectedUserId === user.id ? 'bg-[#354c36]' : 'hover:bg-[#2c2d27]'}`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <Avatar className="h-10 w-10 mr-3 bg-[#3d5a65]">
                    <AvatarFallback className="text-white">
                      {user.username ? user.username.substring(0, 2).toUpperCase() : user.id}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.username || user.nama || `User ${user.id}`}</p>
                    {user.pangkat && (
                      <p className="text-xs text-[#969692]">{user.pangkat}, {user.kesatuan || 'Military'}</p>
                    )}
                  </div>
                </div>
              ))
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
              onClick={handleCreateDirectChat}
            >
              Mulai Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Main Menu */}
      <MainMenu activeTab="comms" />
    </div>
  );
};

export default CommsView;
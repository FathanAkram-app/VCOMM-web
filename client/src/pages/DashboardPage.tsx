import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import WhatsAppStyleChatList from '../components/WhatsAppStyleChatList';
import ChatRoom from '../components/ChatRoom';
import { ChatListItem } from '../../shared/schema';

/**
 * DashboardPage Component
 * 
 * Halaman utama aplikasi yang menampilkan daftar chat dan ruang chat aktif
 * dengan tema militer sesuai desain yang diminta.
 */
export default function DashboardPage() {
  const [location, setLocation] = useLocation();
  const [activeChat, setActiveChat] = useState<{id: number, isRoom: boolean} | null>(null);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [forwardMessage, setForwardMessage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Cek apakah user sudah login
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/user');
        if (!response.ok) {
          // Jika belum login, arahkan ke halaman login
          setLocation('/');
          return;
        }
        
        const userData = await response.json();
        setUser(userData);
        
        // Ambil daftar chat
        fetchChatList();
      } catch (error) {
        console.error('Authentication error:', error);
        setLocation('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [setLocation]);

  const fetchChatList = async () => {
    try {
      // Fetch direct chats
      const directChatsResponse = await fetch('/api/direct-chats', {
        credentials: 'include'
      });
      
      let directChats = [];
      if (directChatsResponse.ok) {
        directChats = await directChatsResponse.json();
        console.log("Direct chats berhasil diambil:", directChats);
      } else {
        console.error("Error mengambil direct chats:", await directChatsResponse.text());
      }
      
      // Fetch rooms
      const roomsResponse = await fetch('/api/rooms', {
        credentials: 'include'
      });
      
      let rooms = [];
      if (roomsResponse.ok) {
        rooms = await roomsResponse.json();
        console.log("Rooms berhasil diambil:", rooms);
      } else {
        console.error("Error mengambil rooms:", await roomsResponse.text());
      }
      
      // Gabungkan dua array
      const combinedList = [...directChats, ...rooms];
      console.log("Kombinasi chat list:", combinedList);
      
      setChatList(combinedList);
    } catch (error) {
      console.error('Error fetching chat list:', error);
    }
  };

  const handleSelectChat = (id: number, isRoom: boolean) => {
    setActiveChat({ id, isRoom });
    setIsSidebarOpen(false);
  };

  const handleBackToList = () => {
    setActiveChat(null);
    setIsSidebarOpen(true);
  };

  const handleChatDeleted = (id: number, isRoom: boolean) => {
    setChatList(prev => prev.filter(chat => 
      !(chat.id === id && chat.isRoom === isRoom)
    ));
    setActiveChat(null);
    setIsSidebarOpen(true);
    fetchChatList();
  };

  const handleClearChatHistory = async (id: number, isRoom: boolean) => {
    try {
      await fetch(`/api/${isRoom ? 'rooms' : 'chats'}/${id}/messages`, {
        method: 'DELETE'
      });
      fetchChatList();
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  const handleStartDirectChat = async (userId: number) => {
    try {
      const response = await fetch('/api/direct-chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otherUserId: userId })
      });
      
      if (response.ok) {
        const data = await response.json();
        fetchChatList();
        handleSelectChat(data.id, false);
      }
    } catch (error) {
      console.error('Error starting direct chat:', error);
    }
  };

  const handleNavigateToChat = (targetId: number, isTargetRoom: boolean, forwardedMsg?: any) => {
    setActiveChat({ id: targetId, isRoom: isTargetRoom });
    if (forwardedMsg) {
      setForwardMessage(forwardedMsg);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1b1c16] flex items-center justify-center">
        <div className="text-white font-bold text-2xl uppercase">
          <div className="flex space-x-2">
            <div className="w-3 h-8 bg-[#5c6249] animate-pulse"></div>
            <div className="w-3 h-8 bg-[#5c6249] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-8 bg-[#5c6249] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <div className="w-3 h-8 bg-[#5c6249] animate-pulse" style={{ animationDelay: '0.6s' }}></div>
          </div>
          <div className="mt-4 text-[#8d9c6b]">LOADING SECURE COMMS</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1b1c16] text-white flex flex-col">
      {/* Header - common for all screens */}
      <header className="bg-[#3f4433] py-3 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-[#5c6249] rounded-full flex items-center justify-center text-xs mr-3">
            {user?.firstName?.charAt(0) || user?.callsign?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-[#9eb36b] font-bold uppercase">{user?.callsign || 'User'}</h1>
            <div className="text-xs text-gray-300">{user?.rank || ''} {user?.nrp || ''}</div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="w-8 h-8 bg-[#5c6249] rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button 
            onClick={() => {
              // Logout
              fetch('/api/logout', { method: 'POST' })
                .then(() => setLocation('/'))
                .catch(err => console.error('Logout error:', err));
            }}
            className="w-8 h-8 bg-[#5c6249] rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content - responsive layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat list - collapsible on mobile */}
        <div 
          className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[320px] border-r border-[#414438] bg-[#1f1f1e]`}
        >
          <div className="p-2 bg-[#2a2b23] border-b border-[#414438]">
            <input 
              type="text" 
              placeholder="Search contacts or chats..." 
              className="w-full bg-[#414438] border-none rounded-md py-2 px-3 text-sm text-white placeholder:text-gray-400"
            />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <WhatsAppStyleChatList 
              chats={chatList}
              activeChat={activeChat}
              onSelectChat={handleSelectChat}
              onChatDeleted={handleChatDeleted}
              onClearChatHistory={handleClearChatHistory}
              onStartDirectChat={handleStartDirectChat}
            />
          </div>
          <div className="p-3 bg-[#2a2b23] border-t border-[#414438] text-xs text-center text-[#8d9c6b]">
            TACTICAL COMMUNICATIONS • CLASSIFIED
          </div>
        </div>

        {/* Chat area */}
        <div className={`${!isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-[#1f1f1e]`}>
          {activeChat ? (
            <ChatRoom 
              chatId={activeChat.id}
              isRoom={activeChat.isRoom}
              chatName={chatList.find(c => c.id === activeChat.id && c.isRoom === activeChat.isRoom)?.name || 'Chat'}
              onBack={handleBackToList}
              onNavigateToChat={handleNavigateToChat}
              forwardedMessage={forwardMessage}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-24 h-24 bg-[#3f4433] rounded-full flex items-center justify-center border-4 border-[#5c6249] mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#9eb36b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#9eb36b] uppercase mb-2">SECURE COMMUNICATIONS</h2>
              <p className="text-gray-400 mb-6 max-w-md">
                Select a contact or group from the list to start a secure conversation.
              </p>
              <div className="flex gap-4">
                <button className="military-button px-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  NEW GROUP
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
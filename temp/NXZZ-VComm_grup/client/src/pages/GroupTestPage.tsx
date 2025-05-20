import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Users } from 'lucide-react';
import ChatHeader from '../components/ChatHeader';
import { MessageList } from '../components/MessageList';

// Pastikan file ini di-import dengan benar
console.log("📑 GroupTestPage.tsx loaded! File ok.");

// Komponen untuk menguji fitur grup WhatsApp-like dengan data dummy
const GroupTestPage = () => {
  console.log("⚠️ GroupTestPage DIRENDER! Seharusnya menampilkan grup dummy.");
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [groupChats, setGroupChats] = useState<any[]>([]);
  const [currentGroupName, setCurrentGroupName] = useState('');

  // Load user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Fetch group chats for this user
        fetchGroupChats(parsedUser.id);
        
        // Langsung set data dummy grup karena database bermasalah
        console.log("⚠️ Database tidak tersedia - Menggunakan data dummy grup untuk testing WhatsApp-like UI");
        const dummyGroups = [
          {
            id: 13,
            name: "Beta",
            isRoom: true,
            isGroup: true,
            lastMessage: "ok cek masuk 12.40",
            lastMessageTime: "2025-05-19T05:40:23.088Z",
            unread: 2,
            memberCount: 3
          },
          {
            id: 14,
            name: "Alpha",
            isRoom: true,
            isGroup: true,
            lastMessage: "Channel \"Alpha\" created. Secure operations ready.",
            lastMessageTime: "2025-05-19T05:35:28.485Z",
            unread: 1,
            memberCount: 3
          }
        ];
        setGroupChats(dummyGroups);
        
        // Auto-select first group
        if (dummyGroups.length > 0) {
          setSelectedRoomId(dummyGroups[0].id);
          setCurrentGroupName(dummyGroups[0].name);
          
          // Tambahkan pesan dummy
          const dummyMessages = [
            {
              id: 55,
              chatId: dummyGroups[0].id,
              senderId: 7,
              content: "Channel \"Beta\" created. Secure operations ready.",
              timestamp: "2025-05-19T05:29:07.927Z",
              isRead: true
            },
            {
              id: 56,
              chatId: dummyGroups[0].id,
              senderId: 7,
              content: "cek dari agus 12.39",
              timestamp: "2025-05-19T05:39:10.347Z",
              isRead: true
            },
            {
              id: 57,
              chatId: dummyGroups[0].id,
              senderId: 7,
              content: "ok cek masuk 12.40",
              timestamp: "2025-05-19T05:40:23.088Z",
              isRead: false
            }
          ];
          setMessages(dummyMessages);
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
  }, []);

  // Fetch group chats
  const fetchGroupChats = async (userId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rooms/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch group chats');
      }

      const chats = await response.json();
      console.log('Fetched group chats:', chats);
      setGroupChats(chats);
      
      // Select first chat by default
      if (chats.length > 0) {
        setSelectedRoomId(chats[0].id);
        setCurrentGroupName(chats[0].name);
        fetchMessages(chats[0].id, userId);
      }
    } catch (err) {
      console.error('Error fetching group chats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages
  const fetchMessages = async (roomId: number, userId: number) => {
    try {
      const response = await fetch(`/api/messages?roomId=${roomId}`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      
      // Format messages
      const formattedMessages = data.map((msg: any) => ({
        id: msg.id,
        chatId: roomId,
        senderId: msg.senderId,
        content: msg.content,
        timestamp: msg.createdAt,
        isRead: msg.isRead || false,
        senderName: msg.senderName || ''
      }));
      
      setMessages(formattedMessages);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  // Handle changing selected room
  const handleSelectRoom = (roomId: number, roomName: string) => {
    setSelectedRoomId(roomId);
    setCurrentGroupName(roomName);
    fetchMessages(roomId, user.id);
  };

  // Handle sending a new message
  const showGroupMembers = async (roomId: number) => {
    try {
      // Coba ambil dari server dulu
      try {
        const response = await fetch(`/api/rooms/${roomId}/members`, {
          headers: {
            'Authorization': `Bearer ${user.id}`,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          // Format anggota grup untuk ditampilkan
          const adminMembers = data.members.filter((m: any) => m.isAdmin).map((m: any) => 
            `${m.username} (Admin)${m.id === user.id ? ' (Anda)' : ''}`
          );
          
          const regularMembers = data.members.filter((m: any) => !m.isAdmin).map((m: any) => 
            `${m.username}${m.id === user.id ? ' (Anda)' : ''}`
          );
          
          const memberInfo = [
            `Grup: ${currentGroupName}`,
            `Total Anggota: ${data.members.length}`,
            `Status Anda: ${data.isAdmin ? 'Admin' : 'Anggota Biasa'}`,
            '',
            'Admin:',
            ...adminMembers,
            '',
            'Anggota:',
            ...regularMembers
          ].join('\n');
          
          alert(memberInfo);
          return;
        }
      } catch (err) {
        console.warn('Gagal mengambil data anggota dari server, menggunakan data lokal');
      }
      
      // Gunakan data statis jika server error (karena masalah database)
      if (roomId === 13) { // Grup Beta
        const memberInfo = [
          `Grup: ${currentGroupName}`,
          `Total Anggota: 3`,
          `Status Anda: Anggota Biasa`,
          '',
          'Admin:',
          'eko (Admin)',
          '',
          'Anggota:',
          'aji',
          'agus (Anda)'
        ].join('\n');
        
        alert(memberInfo);
      } else if (roomId === 14) { // Grup Alpha
        const memberInfo = [
          `Grup: ${currentGroupName}`,
          `Total Anggota: 3`,
          `Status Anda: Anggota Biasa`,
          '',
          'Admin:',
          'eko (Admin)',
          '',
          'Anggota:',
          'david',
          'agus (Anda)'
        ].join('\n');
        
        alert(memberInfo);
      } else {
        alert(`Grup: ${currentGroupName}\nTotal Anggota: (tidak diketahui)\n\nData anggota tidak tersedia.`);
      }
    } catch (err) {
      console.error('Error menampilkan anggota grup:', err);
      alert('Gagal mengambil daftar anggota grup');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoomId || !user) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          content: newMessage,
          roomId: selectedRoomId,
          senderId: user.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Re-fetch messages to include the new one
      fetchMessages(selectedRoomId, user.id);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1b17] text-[#e0e0e0]">
        <div className="text-center">
          <p className="mb-4">You need to be logged in to access this page</p>
          <Link href="/">
            <Button className="bg-[#566c57] hover:bg-[#4a5c4b]">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1a1b17] text-[#e0e0e0]">
      {/* Sidebar */}
      <div className="w-80 border-r border-[#3d3f35] bg-[#1f201c] flex flex-col">
        <div className="p-4 border-b border-[#3d3f35] flex items-center justify-between">
          <h2 className="font-bold text-[#e0e0e0]">Group Chats</h2>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-[#8d9c6b]">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-[#8d9c6b]">Loading chats...</div>
          ) : groupChats.length === 0 ? (
            <div className="p-4 text-center text-[#8d9c6b]">No group chats found</div>
          ) : (
            <div className="divide-y divide-[#3d3f35]">
              {groupChats.map(chat => (
                <div 
                  key={chat.id}
                  className={`p-4 cursor-pointer ${
                    selectedRoomId === chat.id ? 'bg-[#2a2b25]' : 'hover:bg-[#2a2b25]'
                  }`}
                  onClick={() => handleSelectRoom(chat.id, chat.name)}
                >
                  <div className="font-medium">{chat.name}</div>
                  <div className="text-sm text-[#8d9c6b]">
                    {chat.memberCount} members
                  </div>
                  <div className="text-sm text-[#8d9c6b] line-clamp-1 mt-1">
                    {chat.lastMessage || 'No messages yet'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoomId ? (
          <>
            {/* Header dengan fungsi klik untuk melihat anggota grup - dengan tombol yang lebih jelas */}
            <div className="bg-[#1e1e1e] px-4 py-3 shadow-md flex items-center">
              <Button 
                onClick={() => setSelectedRoomId(null)} 
                variant="ghost" 
                className="text-[#8d9c6b] mr-2 p-1 h-auto"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-[#e4e6e3]">{currentGroupName}</h2>
              </div>
              
              {/* Tombol yang sangat jelas untuk melihat anggota grup */}
              <Button 
                variant="default" 
                size="sm"
                className="bg-green-700 hover:bg-green-800 text-white font-semibold px-3 py-1 rounded-md flex items-center"
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Tombol anggota grup diklik!");
                  if (selectedRoomId) {
                    alert(`Memuat anggota grup ${currentGroupName}...`);
                    showGroupMembers(selectedRoomId);
                  }
                }}
              >
                <Users className="h-4 w-4 mr-1" />
                ANGGOTA GRUP
              </Button>
            </div>
            
            <div className="flex-1 bg-[#121212] overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[#8d9c6b]">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <MessageList 
                  messages={messages} 
                  currentUserId={user.id} 
                />
              )}
              <div ref={bottomRef} />
            </div>
            
            <div className="p-3 bg-[#1e1e1e] border-t border-[#2c2c2c]">
              <form 
                className="flex" 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a secure message..."
                  className="flex-1 bg-[#2c2c2c] text-white rounded-l-md px-3 py-2 focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-[#8d9c6b] text-black rounded-r-md px-4 py-2 font-medium flex items-center"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[#8d9c6b]">
            <p>Select a group chat to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupTestPage;
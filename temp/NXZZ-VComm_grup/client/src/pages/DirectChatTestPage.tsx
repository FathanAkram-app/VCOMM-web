import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Phone, Video } from 'lucide-react';
import ChatHeader from '../components/ChatHeader';
import { MessageList } from '../components/MessageList';

const DirectChatTestPage = () => {
  const [user, setUser] = useState<any>(null);
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [directChats, setDirectChats] = useState<any[]>([]);

  // Load user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Fetch direct chats for this user
        fetchDirectChats(parsedUser.id);
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
  }, []);

  // Fetch direct chats
  const fetchDirectChats = async (userId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chat/direct-chats/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch direct chats');
      }

      const chats = await response.json();
      console.log('Fetched direct chats:', chats);
      
      // Only include direct chats, not rooms
      const directChatsOnly = chats.filter((chat: any) => !chat.isRoom);
      setDirectChats(directChatsOnly);
      
      // Select first chat by default
      if (directChatsOnly.length > 0) {
        setSelectedChatId(directChatsOnly[0].id);
        fetchChatPartner(directChatsOnly[0].otherUserId, userId);
        fetchMessages(directChatsOnly[0].id, userId);
      }
    } catch (err) {
      console.error('Error fetching direct chats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch chat partner details
  const fetchChatPartner = async (partnerId: number, currentUserId: number) => {
    try {
      const response = await fetch(`/api/users/${partnerId}`, {
        headers: {
          'Authorization': `Bearer ${currentUserId}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chat partner details');
      }

      const data = await response.json();
      setChatPartner(data);
    } catch (err) {
      console.error('Error fetching chat partner:', err);
    }
  };

  // Fetch messages
  const fetchMessages = async (chatId: number, userId: number) => {
    try {
      const response = await fetch(`/api/messages?directChatId=${chatId}`, {
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
        chatId: chatId,
        senderId: msg.senderId,
        content: msg.content,
        timestamp: msg.createdAt,
        isRead: msg.isRead || false
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

  // Handle changing selected chat
  const handleSelectChat = (chatId: number, otherUserId: number) => {
    setSelectedChatId(chatId);
    fetchChatPartner(otherUserId, user.id);
    fetchMessages(chatId, user.id);
  };

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId || !user) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          content: newMessage,
          directChatId: selectedChatId,
          senderId: user.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Re-fetch messages to include the new one
      fetchMessages(selectedChatId, user.id);
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
          <h2 className="font-bold text-[#e0e0e0]">Direct Chats</h2>
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
          ) : directChats.length === 0 ? (
            <div className="p-4 text-center text-[#8d9c6b]">No direct chats found</div>
          ) : (
            <div className="divide-y divide-[#3d3f35]">
              {directChats.map(chat => (
                <div 
                  key={chat.id}
                  className={`p-4 cursor-pointer ${
                    selectedChatId === chat.id ? 'bg-[#2a2b25]' : 'hover:bg-[#2a2b25]'
                  }`}
                  onClick={() => handleSelectChat(chat.id, chat.otherUserId)}
                >
                  <div className="font-medium">{chat.name}</div>
                  <div className="text-sm text-[#8d9c6b] line-clamp-1">
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
        {selectedChatId && chatPartner ? (
          <>
            <div className="bg-[#1e1e1e] px-4 py-3 shadow-md flex items-center">
              <Button 
                onClick={() => setSelectedChatId(null)} 
                variant="ghost" 
                className="text-[#8d9c6b] mr-2 p-1 h-auto"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div 
                className="flex-1 cursor-pointer" 
                onClick={() => {
                  if (chatPartner) {
                    // Tampilkan dialog profil sederhana
                    alert(`Profil Pengguna: ${chatPartner.username}\nID: ${chatPartner.id}\nStatus: ${chatPartner.isOnline ? 'Online' : 'Offline'}`);
                  }
                }}
              >
                <h2 className="text-lg font-bold text-[#e4e6e3]">{chatPartner?.username}</h2>
                <p className="text-xs text-[#8d9c6b]">Secure Direct Channel</p>
              </div>
              <div className="flex">
                <Button variant="ghost" className="text-[#8d9c6b] p-1 h-auto mr-1">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" className="text-[#8d9c6b] p-1 h-auto">
                  <Video className="h-5 w-5" />
                </Button>
              </div>
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
            <p>Select a chat to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectChatTestPage;
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Paperclip, MoreVertical, Shield } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { type Conversation, type Message } from '@shared/schema';

// Interface untuk data chat
interface ChatData {
  id: number;
  name: string;
  isGroup: boolean;
}

// Interface untuk pesan chat
interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  classification?: string;
}

interface ChatRoomProps {
  chatId: number;
  isGroup: boolean;
  onBack: () => void;
}

export default function ChatRoom({ chatId, isGroup, onBack }: ChatRoomProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch chat data
  const { data: chat } = useQuery({
    queryKey: [`/api/conversations/${chatId}`],
    enabled: !!chatId && !!user,
  });
  
  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: [`/api/conversations/${chatId}/messages`],
    enabled: !!chatId && !!user,
    refetchInterval: 3000, // Polling every 3 seconds
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: chatId,
          content,
          classification: 'UNCLASSIFIED'
        }),
        credentials: 'include'
      }).then(res => {
        if (!res.ok) throw new Error('Failed to send message');
        return res.json();
      });
    },
    onSuccess: () => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${chatId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    }
  });
  
  // Fetch all users to find the other user in direct chats
  const { data: allUsers } = useQuery({
    queryKey: [`/api/all-users`],
    enabled: !!user && !isGroup,
  });

  // Fetch conversation members
  const { data: conversationMembers } = useQuery({
    queryKey: [`/api/conversations/${chatId}/members`],
    enabled: !!chatId && !!user,
  });

  // Update chat data when chat changes
  useEffect(() => {
    if (chat && typeof chat === 'object') {
      const chatObj = chat as Conversation;
      
      // Default chat name
      let chatName = chatObj.name || 'Chat';
      
      if (!isGroup && conversationMembers && Array.isArray(conversationMembers) && allUsers && Array.isArray(allUsers)) {
        // Find the other member in the conversation (not the current user)
        const otherMemberId = conversationMembers.find(member => member.userId !== user?.id)?.userId;
        
        if (otherMemberId) {
          // Find the other user's data
          const otherUser = allUsers.find(u => u.id === otherMemberId);
          
          if (otherUser) {
            // Use the other user's callsign for the chat name
            chatName = otherUser.callsign || chatName;
            console.log("Setting chat name to other user's callsign:", chatName);
          }
        }
      }
      
      setChatData({
        id: chatObj.id || chatId,
        name: chatName,
        isGroup: typeof chatObj.isGroup === 'boolean' ? chatObj.isGroup : isGroup
      });
    }
  }, [chat, isGroup, chatId, conversationMembers, allUsers, user?.id]);
  
  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Handle sending messages
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user) return;
    
    sendMessageMutation.mutate(message);
    setMessage('');
  };
  
  // Format timestamp
  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: id });
    } catch (e) {
      return '';
    }
  };
  
  // Group messages by date
  const groupMessagesByDate = (messageData: any[]) => {
    if (!Array.isArray(messageData)) return [];
    
    const groups: { [key: string]: ChatMessage[] } = {};
    
    messageData.forEach((msg: any) => {
      if (!msg || !msg.timestamp) return;
      
      try {
        const date = new Date(msg.timestamp);
        const dateStr = date.toDateString();
        
        if (!groups[dateStr]) {
          groups[dateStr] = [];
        }
        
        groups[dateStr].push({
          id: msg.id || Math.random(),
          senderId: msg.senderId || 0,
          senderName: msg.senderName || 'Unknown',
          content: msg.content || '',
          timestamp: msg.timestamp,
          isRead: msg.isRead || false,
          classification: msg.classification || 'UNCLASSIFIED'
        });
      } catch (e) {
        console.error('Error processing message:', e);
      }
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages
    }));
  };
  
  const messageGroups = groupMessagesByDate(Array.isArray(messages) ? messages : []);
  
  return (
    <div className="flex flex-col h-screen bg-[#171717] relative">
      {/* Chat header */}
      <div className="flex items-center px-4 py-3 border-b border-[#333333] bg-[#1a1a1a]">
        <Button onClick={onBack} variant="ghost" size="icon" className="mr-2 text-[#a6c455]">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="relative flex-shrink-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
            isGroup ? "bg-[#4d5d30]" : "bg-[#5a6b38]"
          }`}>
            {isGroup ? (
              <span className="text-white text-xs font-semibold">G</span>
            ) : (
              <span className="text-white text-xs font-semibold">
                {chatData?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-[#9bb26b] font-medium truncate">{chatData?.name || 'Chat'}</h3>
          <p className="text-gray-400 text-xs">
            {isGroup ? 'Group chat' : 'Direct message'}
          </p>
        </div>
        
        <Button variant="ghost" size="icon" className="text-[#a6c455]">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Messages container with space for input at bottom */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-6">
        {messageGroups.map(group => (
          <div key={group.date} className="space-y-3">
            <div className="flex justify-center">
              <span className="text-xs bg-[#2a2a2a] text-gray-400 px-2 py-1 rounded-md">
                {new Date(group.date).toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            
            {group.messages.map(msg => {
              const isOwnMessage = msg.senderId === user?.id;
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isOwnMessage 
                        ? 'bg-[#4d5d30] text-white rounded-br-none' 
                        : 'bg-[#333333] text-white rounded-bl-none'
                    }`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-medium text-[#a6c455]">{msg.senderName}</p>
                    )}
                    
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    
                    <div className="flex justify-end items-center mt-1 space-x-1">
                      {msg.classification && (
                        <div className="flex items-center">
                          <Shield className="h-3 w-3 text-[#a6c455] mr-1" />
                          <span className="text-[10px] text-[#a6c455]">{msg.classification}</span>
                        </div>
                      )}
                      <span className="text-[10px] text-gray-300">
                        {formatMessageTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Shield className="h-12 w-12 text-[#a6c455] mb-3" />
            <h3 className="text-[#a6c455] text-lg font-medium mb-1">Saluran Komunikasi Aman</h3>
            <p className="text-gray-400 text-sm max-w-md">
              Komunikasi aman point-to-point dengan enkripsi militer. Pesan Anda dilindungi dengan tingkat keamanan tertinggi.
            </p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input - positioned fixed for mobile */}
      <div className="border-t border-[#333333] p-3 bg-[#1a1a1a] fixed bottom-0 left-0 right-0 z-10">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Button 
            type="button"
            variant="ghost" 
            size="icon"
            className="text-[#a6c455]"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ketik pesan..."
            className="flex-1 bg-[#252525] border-[#444444] text-white placeholder-gray-500 focus-visible:ring-[#4d5d30]"
          />
          
          <Button 
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            variant="ghost"
            size="icon"
            className="text-[#a6c455]"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, MoreVertical, Shield, Trash, Reply, Forward, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { type Conversation, type Message } from '@shared/schema';
import AttachmentUploader from './AttachmentUploader';
import MessageAttachment from './MessageAttachment';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";

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
  // Attachment fields
  hasAttachment?: boolean;
  attachmentType?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
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
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [conversations, setConversations] = useState<{id: number, name: string}[]>([]);
  
  // Fetch chat data
  const { data: chat } = useQuery({
    queryKey: [`/api/conversations/${chatId}`],
    enabled: !!chatId && !!user,
  });
  
  // Fetch messages
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: [`/api/conversations/${chatId}/messages`],
    enabled: !!chatId && !!user,
    refetchInterval: 3000, // Polling every 3 seconds
    retry: 3, // Coba lagi jika gagal
    staleTime: 10 * 1000, // Data dianggap stale setelah 10 detik
  });
  
  // Memastikan pesan dimuat ulang saat chat diubah
  useEffect(() => {
    if (chatId) {
      refetchMessages();
    }
  }, [chatId, refetchMessages]);
  
  // Add console log to debug message data
  useEffect(() => {
    console.log("Messages data received:", messages);
    if (Array.isArray(messages)) {
      console.log(`Fetched ${messages.length} messages for chat ${chatId}`);
    }
  }, [messages, chatId]);
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string | Record<string, any>) => {
      let payload;
      
      if (typeof content === 'string') {
        // Simple text message
        payload = {
          conversationId: chatId,
          content,
          classification: 'UNCLASSIFIED',
          replyToId: replyToMessage ? replyToMessage.id : undefined
        };
      } else {
        // Message with attachment
        payload = {
          conversationId: chatId,
          content: content.content,
          classification: 'UNCLASSIFIED',
          hasAttachment: content.hasAttachment,
          attachmentType: content.attachmentType,
          attachmentUrl: content.attachmentUrl,
          attachmentName: content.attachmentName,
          attachmentSize: content.attachmentSize,
          replyToId: replyToMessage ? replyToMessage.id : undefined
        };
      }
      
      return fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
  
  // State for attachment
  const [attachment, setAttachment] = useState<{
    url: string;
    name: string;
    type: string;
    size: number;
    mimetype: string;
  } | null>(null);

  // Handle file upload complete
  const handleFileUploaded = (fileData: {
    url: string;
    name: string;
    type: string;
    size: number;
    mimetype: string;
  }) => {
    setAttachment(fileData);
  };

  // Handle sending messages
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!message.trim() && !attachment) || !user) return;
    
    // If we have an attachment, include it in the message
    if (attachment) {
      const messageData = {
        content: message.trim() || `[File: ${attachment.name}]`,
        hasAttachment: true,
        attachmentType: attachment.type,
        attachmentUrl: attachment.url,
        attachmentName: attachment.name,
        attachmentSize: attachment.size
      };
      
      sendMessageMutation.mutate(messageData);
      setAttachment(null);
    } else {
      // Send normal text message
      sendMessageMutation.mutate(message);
    }
    
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
    if (!Array.isArray(messageData)) {
      console.log("messageData is not an array:", messageData);
      return [];
    }
    
    console.log("Processing message data for grouping:", messageData);
    console.log("Total messages to process:", messageData.length);
    
    // Sortir pesan berdasarkan waktu (dari yang terlama ke yang terbaru)
    const sortedMessages = [...messageData].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt).getTime();
      const timeB = new Date(b.timestamp || b.createdAt).getTime();
      return timeA - timeB;
    });
    
    const groups: { [key: string]: ChatMessage[] } = {};
    
    sortedMessages.forEach((msg: any) => {
      // For messages from the server, createdAt is used instead of timestamp
      const timestamp = msg.timestamp || msg.createdAt;
      
      if (!msg || !timestamp) {
        console.log("Skipping message without timestamp:", msg);
        return;
      }
      
      try {
        const date = new Date(timestamp);
        const dateStr = date.toDateString();
        
        if (!groups[dateStr]) {
          groups[dateStr] = [];
        }
        
        // Try to get the sender name from allUsers
        let senderName = 'Unknown';
        if (allUsers && Array.isArray(allUsers)) {
          const sender = allUsers.find(u => u.id === msg.senderId);
          if (sender) {
            senderName = sender.callsign || sender.fullName || 'Unknown';
          }
        }
        
        groups[dateStr].push({
          id: msg.id || Math.random(),
          senderId: msg.senderId || 0,
          senderName: senderName,
          content: msg.content || '',
          timestamp: timestamp,
          isRead: msg.isRead || false,
          classification: msg.classification || 'UNCLASSIFIED',
          // Attachment fields
          hasAttachment: msg.hasAttachment || false,
          attachmentType: msg.attachmentType || '',
          attachmentUrl: msg.attachmentUrl || '',
          attachmentName: msg.attachmentName || '',
          attachmentSize: msg.attachmentSize || 0
        });
      } catch (e) {
        console.error('Error processing message:', e, msg);
      }
    });
    
    const result = Object.entries(groups).map(([date, messages]) => ({
      date,
      messages
    }));
    
    console.log("Grouped messages:", result);
    console.log("Total date groups:", result.length);
    if (result.length > 0) {
      console.log("Total messages in first group:", result[0].messages.length);
    }
    return result;
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
                    
                    {/* Render attachment if present */}
                    {msg.hasAttachment && msg.attachmentUrl && (
                      <MessageAttachment 
                        attachmentType={msg.attachmentType || 'document'} 
                        attachmentUrl={msg.attachmentUrl} 
                        attachmentName={msg.attachmentName || 'file'} 
                        attachmentSize={msg.attachmentSize}
                      />
                    )}
                    
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
        <form onSubmit={handleSendMessage} className="flex flex-col">
          {/* Show attachment preview if any */}
          {attachment && (
            <div className="flex items-center justify-between mb-2 bg-[#2a2a2a] p-2 rounded">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-white truncate max-w-[200px]">
                  {attachment.name}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAttachment(null)}
                className="text-gray-400 hover:text-white h-6 w-6 p-0"
              >
                <span className="sr-only">Cancel</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <AttachmentUploader onFileUploaded={handleFileUploaded} />
            
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ketik pesan..."
              className="flex-1 bg-[#252525] border-[#444444] text-white placeholder-gray-500 focus-visible:ring-[#4d5d30]"
            />
            
            <Button 
              type="submit"
              disabled={(!message.trim() && !attachment) || sendMessageMutation.isPending}
              variant="ghost"
              size="icon"
              className="text-[#a6c455]"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
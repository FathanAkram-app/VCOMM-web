import { useState, useEffect, useRef } from 'react';
import { Send, MoreVertical, Shield, Trash, Reply, Forward, X, User, Users, ArrowLeft, Mic, Volume2, Play, Pause } from 'lucide-react';
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
import VoiceRecorder from './VoiceRecorder';
import AudioPlayerInline from './AudioPlayerInline';
import RealAudioPlayer from './RealAudioPlayer';
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
  // Reply functionality
  replyToId?: number;
  // Reply info yang ditambahkan dari server
  replyInfo?: {
    content: string;
    senderName: string;
    hasAttachment?: boolean;
    attachmentName?: string;
  };
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
  const [conversations, setConversations] = useState<{id: number, name: string, isGroup?: boolean}[]>([]);
  
  // State untuk voice recording
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceAttachment, setVoiceAttachment] = useState<{
    blob: Blob;
    url: string;
    duration?: number;
  } | null>(null);
  
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
    // Tambahkan console log untuk membantu debugging
    onSuccess: (data) => {
      console.log("Messages loaded:", data);
      // Cek apakah ada pesan dengan replyToId
      const repliedMessages = data.filter((m: any) => m.replyToId);
      if (repliedMessages.length > 0) {
        console.log("Messages with replies:", repliedMessages);
      }
    }
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
  
  // Fungsi untuk handle voice recording
  const handleStartVoiceRecording = () => {
    setIsVoiceRecording(true);
  };
  
  const handleVoiceRecordingComplete = (audioBlob: Blob, audioUrl: string, duration?: number) => {
    console.log("Voice recording complete. Blob:", audioBlob, "URL:", audioUrl, "Duration:", duration);
    
    // Pastikan durasi adalah angka valid
    let safeDuration = 0;
    
    if (duration !== undefined && isFinite(duration)) {
      safeDuration = duration;
    } else if (audioBlob && audioBlob.size) {
      // Estimasi durasi berdasarkan ukuran file jika tidak ada durasi yang valid
      // Asumsi rata-rata bitrate WebM Opus ~12KB per detik
      safeDuration = Math.ceil(audioBlob.size / 12000);
      console.log(`Estimated duration from blob size: ${safeDuration}s`);
    }
    
    setVoiceAttachment({
      blob: audioBlob,
      url: audioUrl,
      duration: safeDuration
    });
    setIsVoiceRecording(false);
    
    // Langsung kirim pesan suara ketika selesai merekam
    const sendVoiceMessage = async () => {
      console.log("Uploading and sending voice message...");
      try {
        const audioAttachment = await uploadVoiceAttachment(audioBlob);
        if (audioAttachment) {
          // Format durasi untuk ditampilkan di pesan
          const minutes = Math.floor(safeDuration / 60);
          const seconds = Math.floor(safeDuration % 60);
          const durationText = ` (${minutes}:${seconds.toString().padStart(2, '0')})`;
          
          // Buat pesan dengan format yang memperlihatkan pesan suara sesuai dengan desain yang diinginkan
          const payload = {
            conversationId: chatId,
            content: `🔊 Pesan Suara${durationText}`,
            classification: 'UNCLASSIFIED',
            hasAttachment: true,
            attachmentType: 'audio',
            attachmentUrl: audioAttachment.url,
            attachmentName: audioAttachment.name,
            attachmentSize: audioAttachment.size,
            replyToId: replyToMessage ? replyToMessage.id : undefined
          };
          
          console.log("Sending voice message with payload:", payload);
          sendMessageMutation.mutate(payload);
          setReplyToMessage(null);
        } else {
          console.error("Failed to upload voice attachment");
        }
      } catch (error) {
        console.error("Error sending voice message:", error);
      }
    };
    
    sendVoiceMessage();
  };
  
  const handleCancelVoiceRecording = () => {
    setIsVoiceRecording(false);
    setVoiceAttachment(null);
  };
  
  // Upload voice attachment
  const uploadVoiceAttachment = async (blob: Blob): Promise<{ name: string; url: string; type: string; size: number } | null> => {
    const formData = new FormData();
    // Deteksi MIME type yang lebih umum diterima oleh server
    const audioType = blob.type || 'audio/webm';
    console.log("Detected audio blob type:", audioType);
    
    // Gunakan ekstensi file yang sesuai dengan tipe MIME
    const fileExt = audioType.includes('webm') ? 'webm' : 
                   audioType.includes('ogg') ? 'ogg' : 
                   audioType.includes('mp4') ? 'm4a' : 'mp3';
                   
    const audioFile = new File(
      [blob], 
      `voice_note_${Date.now()}.${fileExt}`, 
      { type: audioType }
    );
    
    console.log("Creating audio file with name:", audioFile.name, "and type:", audioFile.type);
    formData.append('file', audioFile);
    
    try {
      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload voice attachment');
      }
      
      const data = await response.json();
      return {
        name: data.filename,
        url: data.path,
        type: 'audio',
        size: audioFile.size
      };
      
    } catch (error) {
      console.error('Error uploading voice attachment:', error);
      return null;
    }
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string | Record<string, any>) => {
      // Handle voice attachment first if present
      let audioAttachment = null;
      if (voiceAttachment?.blob) {
        audioAttachment = await uploadVoiceAttachment(voiceAttachment.blob);
      }
      
      let payload;
      
      if (audioAttachment) {
        // Voice message
        payload = {
          conversationId: chatId,
          content: "🔊 Pesan Suara",
          classification: 'UNCLASSIFIED',
          hasAttachment: true,
          attachmentType: audioAttachment.type,
          attachmentUrl: audioAttachment.url,
          attachmentName: audioAttachment.name,
          attachmentSize: audioAttachment.size,
          replyToId: replyToMessage ? replyToMessage.id : undefined
        };
      } else if (typeof content === 'string') {
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

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedMessage(null);
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${chatId}/messages`] });
    },
  });
  
  // Forward message mutation
  const forwardMessageMutation = useMutation({
    mutationFn: async ({ messageId, targetConversationId }: { messageId: number, targetConversationId: number }) => {
      const response = await fetch(`/api/messages/${messageId}/forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId: targetConversationId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to forward message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsForwardDialogOpen(false);
      setSelectedMessage(null);
    },
  });
  
  // Load conversations for forward dialog
  useEffect(() => {
    if (isForwardDialogOpen) {
      // Fetch all users first
      fetch('/api/all-users')
        .then(res => res.json())
        .then(users => {
          console.log("All users:", users);
          
          // Fetch direct chats
          fetch('/api/direct-chats')
            .then(res => res.json())
            .then(directChats => {
              console.log("Direct chats:", directChats);
              
              // Fetch group chats
              fetch('/api/rooms')
                .then(res => res.json())
                .then(rooms => {
                  console.log("Rooms:", rooms);
                  
                  // For each direct chat, load its members
                  const memberPromises = directChats.map((chat: any) => 
                    fetch(`/api/conversations/${chat.id}/members`)
                      .then(res => res.json())
                  );
                  
                  Promise.all(memberPromises)
                    .then(memberResults => {
                      console.log("All member results:", memberResults);
                      
                      // Cari nama personel yang benar untuk setiap chat
                      const allConversations: { id: number; name: string; isGroup: boolean }[] = [];
                      
                      // Tambahkan direct chats dengan nama pengguna dari users yang diambil
                      if (Array.isArray(directChats)) {
                        directChats.forEach((chat: any, idx: number) => {
                          // Get the members for this chat
                          const members = memberResults[idx] || [];
                          console.log(`Chat ${chat.id} members:`, members);
                          
                          // Find the other user in the conversation
                          const otherMember = members.find((m: any) => m.userId !== user?.id);
                          const otherUserId = otherMember?.userId;
                          
                          console.log(`For chat ${chat.id} - User ID: ${user?.id}, Other user ID: ${otherUserId}`);
                          
                          // Cari data pengguna lain dari daftar users
                          let otherUserName = 'Chat Langsung';
                          if (otherUserId && Array.isArray(users)) {
                            const otherUser = users.find((u: any) => u.id === otherUserId);
                            if (otherUser) {
                              // Format: Callsign (Nama Lengkap)
                              otherUserName = `${otherUser.callsign || 'Pengguna'} ${otherUser.fullName ? `(${otherUser.fullName})` : ''}`;
                              console.log(`Found user for ID ${otherUserId}:`, otherUserName);
                            }
                          }
                          
                          console.log(`Adding direct chat: ${chat.id} with user: ${otherUserId}, name: ${otherUserName}`);
                          
                          // Jika kita tidak bisa mendapatkan nama yang valid, coba gunakan nama dari chat sendiri
                          if (otherUserName === 'Chat Langsung' && chat.name && !chat.name.startsWith('Direct chat')) {
                            otherUserName = chat.name;
                          }
                          
                          allConversations.push({
                            id: chat.id,
                            name: otherUserName,
                            isGroup: false
                          });
                        });
                      }
                      
                      // Tambahkan grup chats
                      if (Array.isArray(rooms)) {
                        rooms.forEach((room: any) => {
                          allConversations.push({
                            id: room.id,
                            name: room.name || 'Grup Chat',
                            isGroup: true
                          });
                        });
                      }
                      
                      console.log("Final conversations list for forward:", allConversations);
                      setConversations(allConversations);
                    })
                    .catch(error => console.error('Error fetching conversation members:', error));
                })
                .catch(error => console.error('Error fetching rooms:', error));
            })
            .catch(error => console.error('Error fetching direct chats:', error));
        })
        .catch(error => console.error('Error fetching all users:', error));
    }
  }, [isForwardDialogOpen, user?.id]);
  
  // Handle sending messages
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!message.trim() && !attachment) || !user) return;
    
    // Log actual reply information
    console.log("Current reply state:", replyToMessage);
    
    // If we have an attachment, include it in the message
    if (attachment) {
      const messageData = {
        content: message.trim() || `[File: ${attachment.name}]`,
        hasAttachment: true,
        attachmentType: attachment.type,
        attachmentUrl: attachment.url,
        attachmentName: attachment.name,
        attachmentSize: attachment.size,
        replyToId: replyToMessage ? replyToMessage.id : undefined
      };
      
      console.log("Sending message with attachment and reply data:", messageData);
      sendMessageMutation.mutate(messageData);
      setAttachment(null);
    } else {
      // Send normal text message with reply info if applicable
      const messageData = {
        content: message.trim(),
        replyToId: replyToMessage ? replyToMessage.id : undefined,
        conversationId: chatId
      };
      
      console.log("Sending text message with reply data:", messageData);
      sendMessageMutation.mutate(messageData);
    }
    
    setMessage('');
    setReplyToMessage(null); // Reset reply state after sending
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
    
    // Debug: inspect all messages with replyToId to see if they exist
    const repliesMessages = messageData.filter(m => m.replyToId);
    if (repliesMessages.length > 0) {
      console.log("Messages with replies:", repliesMessages);
    }
    
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
          attachmentSize: msg.attachmentSize || 0,
          // Reply, Forward fields
          replyToId: msg.replyToId || undefined,
          forwardedFromId: msg.forwardedFromId || undefined,
          isDeleted: msg.isDeleted || false
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
  
  // UI untuk reply message
  const ReplyPreview = () => {
    if (!replyToMessage) return null;

    return (
      <div className="px-4 py-2 bg-[#2a2a2a] border-t border-[#333333] flex items-start">
        <div className="flex-1">
          <p className="text-xs text-[#a6c455] flex items-center">
            <Reply className="h-3 w-3 mr-1" />
            Membalas {replyToMessage.senderId === user?.id ? 'pesan Anda' : replyToMessage.senderName}
          </p>
          <p className="text-xs text-gray-400 truncate">{replyToMessage.content}</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5"
          onClick={() => setReplyToMessage(null)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#171717] relative">
      {/* Chat header */}
      
      {/* Delete Message Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#333333] text-white">
          <DialogHeader>
            <DialogTitle>Hapus Pesan</DialogTitle>
            <DialogDescription className="text-gray-400">
              Apakah Anda yakin ingin menghapus pesan ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-[#2a2a2a] p-3 rounded-md max-h-[100px] overflow-auto my-2">
            <p className="text-sm">{selectedMessage?.content}</p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedMessage && deleteMessageMutation.mutate(selectedMessage.id)}
              disabled={deleteMessageMutation.isPending}
            >
              {deleteMessageMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward Message Dialog */}
      <Dialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#333333] text-white">
          <DialogHeader>
            <DialogTitle>Teruskan Pesan</DialogTitle>
            <DialogDescription className="text-gray-400">
              Pilih percakapan tujuan untuk meneruskan pesan ini.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-[#2a2a2a] p-3 rounded-md max-h-[100px] overflow-auto my-2">
            <p className="text-sm">{selectedMessage?.content}</p>
            {selectedMessage?.hasAttachment && (
              <p className="text-xs text-[#a6c455] mt-1">
                📎 {selectedMessage.attachmentName}
              </p>
            )}
          </div>
          <div className="max-h-[200px] overflow-auto">
            {conversations.length === 0 ? (
              <p className="text-gray-400 text-center py-2">Memuat percakapan...</p>
            ) : (
              <div className="space-y-1">
                {conversations
                  .filter(conv => conv.id !== chatId) // Filter out current chat
                  .map(conv => (
                    <Button
                      key={conv.id}
                      variant="ghost"
                      className="w-full justify-start text-left"
                      onClick={() => selectedMessage && forwardMessageMutation.mutate({
                        messageId: selectedMessage.id,
                        targetConversationId: conv.id
                      })}
                      disabled={forwardMessageMutation.isPending}
                    >
                      {conv.isGroup ? (
                        <Users className="h-4 w-4 mr-2 inline-block" />
                      ) : (
                        <User className="h-4 w-4 mr-2 inline-block" />
                      )}
                      {conv.name}
                    </Button>
                  ))
                }
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsForwardDialogOpen(false)}
            >
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                    
                    {/* Format balasan pesan seperti WhatsApp style */}
                    {msg.replyToId && (
                      <div className="mb-2">
                        <div className="flex items-center text-xs mb-1">
                          <ArrowLeft className="h-3 w-3 mr-1 text-[#8ba742]" /> 
                          {(() => {
                            try {
                              // Mencari pesan yang dibalas dari array pesan
                              if (!Array.isArray(messages)) return <span className="text-gray-400">Membalas pesan</span>;
                              
                              for (let i = 0; i < messages.length; i++) {
                                if (messages[i].id === msg.replyToId) {
                                  // Pesan ditemukan
                                  return (
                                    <span className="text-gray-400">
                                      {messages[i].senderName === msg.senderName ? 'Membalas diri sendiri' : `Membalas ${messages[i].senderName}`}
                                    </span>
                                  );
                                }
                              }
                              return <span className="text-gray-400">Membalas pesan</span>;
                            } catch (err) {
                              console.error("Error rendering reply header:", err);
                              return <span className="text-gray-400">Membalas pesan</span>;
                            }
                          })()}
                        </div>
                        
                        {/* Preview pesan yang dibalas dengan kotak dan garis hijau di sisi kiri */}
                        <div className="bg-[#2a2a2a] rounded-md p-1.5 border-l-4 border-[#8ba742] mb-1.5">
                          {(() => {
                            try {
                              // Cari di messages dulu
                              if (Array.isArray(messages)) {
                                for (let i = 0; i < messages.length; i++) {
                                  if (messages[i].id === msg.replyToId) {
                                    // Pesan ditemukan di array pesan
                                    return messages[i].hasAttachment ? (
                                      <div className="text-xs text-gray-400 line-clamp-1">
                                        <span className="text-[#8ba742] mr-1">📎</span>
                                        <span>{messages[i].attachmentName || 'File'}</span>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400 line-clamp-1">{messages[i].content || '<Pesan kosong>'}</p>
                                    );
                                  }
                                }
                              }
                              
                              // Jika tidak ditemukan di messages tapi ada replyInfo
                              if (msg.replyInfo) {
                                return msg.replyInfo.hasAttachment ? (
                                  <div className="text-xs text-gray-400 line-clamp-1">
                                    <span className="text-[#8ba742] mr-1">📎</span>
                                    <span>{msg.replyInfo.attachmentName || 'File'}</span>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 line-clamp-1">{msg.replyInfo.content || '<Pesan kosong>'}</p>
                                );
                              }
                              
                              // Fallback jika tidak ada di keduanya
                              return <p className="text-xs text-gray-400 line-clamp-1">Pesan yang dibalas tidak tersedia</p>;
                            } catch (err) {
                              console.error("Error rendering reply preview:", err);
                              return <p className="text-xs text-gray-400 line-clamp-1">Error menampilkan pesan</p>;
                            }
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {/* Tampilkan isi pesan jika bukan pesan suara */}
                    {!(msg.hasAttachment && msg.attachmentType === 'audio') && (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                    
                    {/* Render attachment jika ada */}
                    {msg.hasAttachment && (
                      <>
                        {/* Pesan audio ditampilkan dengan tampilan militer hijau sesuai gambar */}
                        {msg.attachmentType === 'audio' ? (
                          <RealAudioPlayer 
                            messageId={msg.id}
                            timestamp={msg.timestamp}
                            audioUrl={msg.attachmentUrl ? msg.attachmentUrl : `/uploads/voice_note_${msg.id}.webm`}
                          />
                        ) : (
                          <MessageAttachment 
                            attachmentType={msg.attachmentType || 'document'} 
                            attachmentUrl={msg.attachmentUrl} 
                            attachmentName={msg.attachmentName || 'file'} 
                            attachmentSize={msg.attachmentSize}
                          />
                        )}
                      </>
                    )}
                    
                    {/* Message action dropdown menu */}
                    <div className="relative">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-0 -top-6 h-6 w-6 opacity-50 hover:opacity-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            // Set reply message
                            console.log("Setting reply to message:", msg);
                            setReplyToMessage(msg);
                            
                            // Focus on message input after a small delay to ensure DOM is updated
                            setTimeout(() => {
                              const input = document.getElementById("message-input");
                              if (input) {
                                console.log("Focusing input element");
                                input.focus();
                              } else {
                                console.warn("Input element not found");
                              }
                            }, 100);
                          }}>
                            <Reply className="mr-2 h-4 w-4" />
                            Balas
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedMessage(msg);
                            setIsForwardDialogOpen(true);
                          }}>
                            <Forward className="mr-2 h-4 w-4" />
                            Teruskan
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedMessage(msg);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-red-500 focus:text-red-500"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
          {/* Show reply preview if replying to a message - WhatsApp style */}
          {replyToMessage && (
            <div className="flex items-center bg-[#212121] rounded-lg p-2 mb-2 border-l-4 border-[#8ba742]">
              <div className="flex-1">
                <div className="flex items-center text-[#a6c455] text-xs mb-1">
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  <span>Membalas {replyToMessage.senderId === user?.id ? 'diri sendiri' : replyToMessage.senderName}</span>
                </div>
                {replyToMessage.hasAttachment ? (
                  <div className="flex items-center text-xs text-gray-300">
                    <span className="text-[#8ba742] mr-1">📎</span>
                    <span>{replyToMessage.attachmentName || 'File'}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 line-clamp-1">{replyToMessage.content || '<Pesan kosong>'}</p>
                )}
              </div>
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                className="text-gray-400 hover:text-white h-6 w-6 p-0"
                onClick={() => setReplyToMessage(null)}
              >
                <span className="sr-only">Batal</span>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
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
          
          {isVoiceRecording || voiceAttachment ? (
            <VoiceRecorder
              onSendAudio={handleVoiceRecordingComplete}
              onCancel={handleCancelVoiceRecording}
            />
          ) : (
            <div className="flex items-center space-x-2">
              <AttachmentUploader onFileUploaded={handleFileUploaded} />
              
              <Input
                id="message-input"
                ref={(el) => {
                  // Store the input element reference
                  if (el) {
                    (window as any).messageInputRef = el;
                  }
                }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={replyToMessage ? "Ketik balasan..." : "Ketik pesan..."}
                className="flex-1 bg-[#252525] border-[#444444] text-white placeholder-gray-500 focus-visible:ring-[#4d5d30]"
              />
              
              {/* Tombol rekam suara */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-[#a6c455]"
                onClick={handleStartVoiceRecording}
              >
                <Mic className="h-5 w-5" />
              </Button>
              
              <Button 
                type="submit"
                disabled={(!message.trim() && !attachment && !voiceAttachment) || sendMessageMutation.isPending}
                variant="ghost"
                size="icon"
                className="text-[#a6c455]"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
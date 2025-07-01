import { useState, useEffect, useRef } from 'react';
import { Send, Shield, Trash, Reply, Forward, X, User, Users, ArrowLeft, Mic, Volume2, Play, Pause, CornerDownRight, Phone, Video } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCall } from '@/hooks/useCall';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { type Conversation, type Message } from '@shared/schema';
import AttachmentUploader from './AttachmentUploader';
import MessageAttachment from './MessageAttachment';
import VoiceRecorder from './VoiceRecorder';
import AudioPlayerInline from './AudioPlayerInline';
import SimpleAudioPlayer from './SimpleAudioPlayer';
import GroupManagementMobile from './GroupManagementMobile';

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
  const { startCall, startGroupCall, ws } = useCall();
  const [message, setMessage] = useState('');
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [isGroupManagementOpen, setIsGroupManagementOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
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

  // Fetch chat members
  const { data: chatMembers } = useQuery({
    queryKey: [`/api/conversations/${chatId}/members`],
    enabled: !!chatId && !!user && !isGroup,
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

  // Listen for real-time group updates
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'group_update' && message.payload?.groupId === chatId) {
          const { updateType, data } = message.payload;
          
          if (updateType === 'name_updated') {
            // Invalidate queries to refresh chat data and conversations list
            queryClient.invalidateQueries({ queryKey: [`/api/conversations/${chatId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
            queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
          } else if (updateType === 'member_removed' || updateType === 'members_added') {
            // Refresh member list when members change
            queryClient.invalidateQueries({ queryKey: [`/api/conversations/${chatId}/members`] });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message in ChatRoom:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, chatId]);
  
  // Add console log to debug message data
  useEffect(() => {
    console.log("Messages data received:", messages);
    if (Array.isArray(messages)) {
      console.log(`Fetched ${messages.length} messages for chat ${chatId}`);
    }
  }, [messages, chatId]);

  // Debug replyToMessage state changes
  useEffect(() => {
    console.log("ReplyToMessage state changed:", replyToMessage);
  }, [replyToMessage]);
  
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
    
    // Format durasi untuk ditampilkan di pesan
    const minutes = Math.floor(safeDuration / 60);
    const seconds = Math.floor(safeDuration % 60);
    const durationText = ` (${minutes}:${seconds.toString().padStart(2, '0')})`;
    
    // Kirim pesan suara dengan mengirimkan langsung payload tanpa melalui voiceAttachment
    const sendDirectVoiceMessage = async () => {
      console.log("Uploading and sending voice message directly...");
      try {
        // Upload file audio
        const formData = new FormData();
        const audioType = audioBlob.type || 'audio/webm';
        const fileExt = audioType.includes('webm') ? 'webm' : 
                      audioType.includes('ogg') ? 'ogg' : 
                      audioType.includes('mp4') ? 'm4a' : 'mp3';
        
        // Buat nama file yang unik dengan timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `voice_note_${timestamp}.${fileExt}`;
        
        const audioFile = new File([audioBlob], fileName, { type: audioType });
        formData.append('file', audioFile);
        
        // Upload file
        const response = await fetch('/api/attachments/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload voice attachment');
        }
        
        const data = await response.json();
        
        // Langsung kirim pesan dengan file yang sudah diupload
        const payload = {
          conversationId: chatId,
          content: `🔊 Pesan Suara${durationText}`,
          classification: 'UNCLASSIFIED',
          hasAttachment: true,
          attachmentType: 'audio',
          attachmentUrl: data.file.url,
          attachmentName: data.file.name,
          attachmentSize: data.file.size,
          replyToId: replyToMessage ? replyToMessage.id : undefined
        };
        
        console.log("Sending voice message with payload:", payload);
        
        // Gunakan fetch langsung untuk mengirim pesan
        const messageResponse = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
        
        if (!messageResponse.ok) {
          throw new Error('Failed to send voice message');
        }
        
        // Refresh messages setelah berhasil kirim
        refetchMessages();
        setReplyToMessage(null);
      } catch (error) {
        console.error("Error sending voice message:", error);
      }
    };
    
    // Eksekusi pengiriman pesan langsung
    sendDirectVoiceMessage();
    
    // Reset state
    setIsVoiceRecording(false);
    setVoiceAttachment(null); // Pastikan voiceAttachment null agar tidak terjadi double upload
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
    
    // Mendapatkan timestamp untuk nama file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Ambil data user dari session yang aktif
    // Format: NRP_Callsign_Timestamp.ext
    const fileName = `personel_${timestamp}.${fileExt}`;
                   
    const audioFile = new File(
      [blob], 
      fileName, 
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
        // Message with attachment or complex object
        payload = {
          conversationId: chatId,
          content: content.content,
          classification: 'UNCLASSIFIED',
          hasAttachment: content.hasAttachment,
          attachmentType: content.attachmentType,
          attachmentUrl: content.attachmentUrl,
          attachmentName: content.attachmentName,
          attachmentSize: content.attachmentSize,
          replyToId: content.replyToId || (replyToMessage ? replyToMessage.id : undefined)
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
    mutationFn: async ({ messageId, deleteForEveryone }: { messageId: number, deleteForEveryone: boolean }) => {
      console.log(`Deleting message ${messageId}, deleteForEveryone: ${deleteForEveryone}`);
      
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deleteForEveryone }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete failed:', errorText);
        throw new Error(`Failed to delete message: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Delete response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Delete successful:', data);
      setIsDeleteDialogOpen(false);
      setSelectedMessage(null);
      setDeleteForEveryone(false);
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${chatId}/messages`] });
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
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
          replyToId: msg.replyToId,
          forwardedFromId: msg.forwardedFromId,
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
  
  // UI untuk reply message (tampilan sudah mengikuti WhatsApp style)
  const ReplyPreview = () => {
    if (!replyToMessage) return null;

    return (
      <div className="px-4 py-2 bg-[#2a2a2a] border-t border-[#333333] flex items-start">
        <div className="flex-1">
          <div className="flex items-center">
            <div className="w-1 h-full bg-[#a6c455] mr-2"></div>
            <div className="flex-1">
              <p className="text-xs text-[#a6c455] flex items-center">
                <Reply className="h-3 w-3 mr-1" />
                Membalas {replyToMessage.senderId === user?.id ? 'pesan Anda' : replyToMessage.senderName}
              </p>
              
              {/* Preview konten sesuai dengan jenis pesan balasan */}
              {replyToMessage.hasAttachment ? (
                <div className="text-xs text-gray-400 flex items-center">
                  <span className="text-[#a6c455] mr-1">
                    {replyToMessage.attachmentType === 'audio' ? '🔊' : '📎'}
                  </span>
                  <span className="truncate">
                    {replyToMessage.attachmentType === 'audio' 
                      ? 'Pesan Suara' 
                      : (replyToMessage.attachmentName || 'File')}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 truncate max-w-[90%]">
                  {replyToMessage.content || '<Pesan kosong>'}
                </p>
              )}
            </div>
          </div>
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
      <div className="bg-[#1a1a1a] border-b border-[#333333] p-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-[#a6c455] hover:bg-[#333333] h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8 bg-[#333333] border border-[#a6c455]">
              <AvatarFallback className="bg-[#333333] text-[#a6c455] text-sm font-bold">
                {chatData?.name ? chatData.name.substring(0, 2).toUpperCase() : '??'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-white font-semibold text-sm">
                {chatData?.name || 'Loading...'}
              </h3>
              <p className="text-xs text-gray-400">
                {isGroup ? 'Grup Chat' : 'Online'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Call buttons and menu */}
        <div className="flex items-center space-x-2">
          {!isGroup ? (
            // Direct chat - call specific user
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#a6c455] hover:bg-[#333333] h-8 w-8"
                onClick={() => {
                  if (chatData && chatMembers) {
                    // Get the other user's ID from chat members
                    const otherMember = chatMembers.find((member: any) => member.userId !== user?.id);
                    if (otherMember) {
                      startCall(otherMember.userId, chatData.name, 'audio');
                    }
                  }
                }}
                title="Audio Call"
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#a6c455] hover:bg-[#333333] h-8 w-8"
                onClick={() => {
                  if (chatData && chatMembers) {
                    // Get the other user's ID from chat members
                    const otherMember = chatMembers.find((member: any) => member.userId !== user?.id);
                    if (otherMember) {
                      startCall(otherMember.userId, chatData.name, 'video');
                    }
                  }
                }}
                title="Video Call"
              >
                <Video className="h-4 w-4" />
              </Button>
            </>
          ) : (
            // Group chat - start group calls
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#a6c455] hover:bg-[#333333] h-8 w-8"
                onClick={() => {
                  if (chatData && isGroup) {
                    console.log('Starting group audio call for group:', chatData.name);
                    startGroupCall(chatId, chatData.name, 'audio');
                  }
                }}
                title="Group Audio Call"
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#a6c455] hover:bg-[#333333] h-8 w-8"
                onClick={() => {
                  if (chatData && isGroup) {
                    console.log('Starting group video call for group:', chatData.name);
                    startGroupCall(chatId, chatData.name, 'video');
                  }
                }}
                title="Group Video Call"
              >
                <Video className="h-4 w-4" />
              </Button>
              {/* Group members button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-[#a6c455] hover:bg-[#333333] h-8 w-8"
                onClick={() => {
                  console.log('Show group members for:', chatData?.name);
                  setIsGroupManagementOpen(true);
                }}
                title="Group Members"
              >
                <Users className="h-4 w-4" />
              </Button>
            </>
          )}

        </div>
      </div>
      
      {/* Delete Message Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#333333] text-white">
          <DialogHeader>
            <DialogTitle>Hapus Pesan</DialogTitle>
            <DialogDescription className="text-gray-400">
              Pilih cara menghapus pesan ini. Tindakan ini tidak dapat dibatalkan.
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
          <div className="space-y-3 my-4">
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-left border-[#444444] hover:bg-[#2a2a2a] text-white"
                onClick={() => {
                  console.log("Hapus untuk saya clicked:", selectedMessage);
                  if (selectedMessage) {
                    deleteMessageMutation.mutate({ 
                      messageId: selectedMessage.id, 
                      deleteForEveryone: false 
                    });
                  }
                }}
                disabled={deleteMessageMutation.isPending}
              >
                <Trash className="mr-2 h-4 w-4" />
                Hapus untuk saya
              </Button>
              <p className="text-xs text-gray-400 ml-6">
                Pesan akan dihapus hanya dari perangkat Anda
              </p>
            </div>
            
            {selectedMessage?.senderId === user?.id && (
              <div className="space-y-2">
                <Button
                  variant="destructive"
                  className="w-full justify-start text-left"
                  onClick={() => {
                    if (selectedMessage) {
                      deleteMessageMutation.mutate({ 
                        messageId: selectedMessage.id, 
                        deleteForEveryone: true 
                      });
                    }
                  }}
                  disabled={deleteMessageMutation.isPending}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Hapus untuk semua
                </Button>
                <p className="text-xs text-gray-400 ml-6">
                  Pesan akan dihapus untuk semua orang dalam chat ini
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteForEveryone(false);
              }}
              disabled={deleteMessageMutation.isPending}
            >
              Batal
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
      
      {/* Messages container with space for input at bottom */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-6">
        {messageGroups.map(group => {
          // Buat array semua pesan untuk mencari referenced messages
          const allMessages = messageGroups.flatMap(g => g.messages);
          
          return (
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
                
                // Debug logging untuk setiap pesan
                console.log(`[Message Debug] Message ID: ${msg.id}, replyToId: ${msg.replyToId}, content: ${msg.content}`);
                
                // Log raw message object untuk melihat semua field
                if (msg.id === 205) {
                  console.log(`[DEBUG] Full message 205 object:`, msg);
                }
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                >
                  <div 
                    className={`relative max-w-[70%] rounded-lg px-4 py-2 ${
                      isOwnMessage 
                        ? 'bg-[#4d5d30] text-white rounded-br-none' 
                        : 'bg-[#333333] text-white rounded-bl-none'
                    }`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-medium text-[#a6c455]">{msg.senderName}</p>
                    )}
                    
                    {/* Reply message format seperti WhatsApp */}
                    {msg.replyToId && (
                      <div className="bg-black/30 rounded-md p-2 mb-2 border-l-4 border-[#8ba742]">
                        <div className="text-xs font-medium text-[#8ba742] mb-1">
                          {(() => {
                            console.log(`[Reply Debug] Message ${msg.id} has replyToId: ${msg.replyToId}`);
                            console.log(`[Reply Debug] All messages:`, allMessages);
                            
                            const repliedMessage = allMessages.find((m: any) => m.id === msg.replyToId);
                            console.log(`[Reply Debug] Found replied message:`, repliedMessage);
                            
                            return repliedMessage?.senderName || 'Unknown User';
                          })()}
                        </div>
                        <div className="text-xs text-gray-300 opacity-90">
                          {(() => {
                            const repliedMessage = allMessages.find((m: any) => m.id === msg.replyToId);
                            
                            if (repliedMessage?.hasAttachment) {
                              return `📎 ${repliedMessage.attachmentName || 'File'}`;
                            }
                            return repliedMessage?.content || 'Pesan tidak ditemukan';
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
                          <SimpleAudioPlayer 
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
                            onImageClick={setSelectedImageModal}
                          />
                        )}
                      </>
                    )}
                    
                    {/* Message action buttons - simplified approach */}
                    <div className="absolute right-2 top-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-[#444444] text-white"
                        onClick={() => {
                          console.log("REPLY BUTTON CLICKED - Setting reply to message:", msg);
                          console.log("Current replyToMessage state:", replyToMessage);
                          setReplyToMessage(msg);
                          console.log("After setting reply, new state should be:", msg);
                          
                          setTimeout(() => {
                            const input = document.getElementById("message-input");
                            if (input) {
                              input.focus();
                              console.log("Input focused successfully");
                            }
                          }, 100);
                        }}
                        title="Balas"
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-[#444444] text-white"
                        onClick={() => {
                          setSelectedMessage(msg);
                          setIsForwardDialogOpen(true);
                        }}
                        title="Teruskan"
                      >
                        <Forward className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-[#444444] text-red-400 hover:text-red-300"
                        onClick={() => {
                          setSelectedMessage(msg);
                          setIsDeleteDialogOpen(true);
                        }}
                        title="Hapus"
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
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
          );
        })}
        
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
            <div className="flex items-center bg-[#212121] rounded-lg p-3 mb-3 border-l-4 border-[#8ba742] mx-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center text-[#a6c455] text-sm font-medium mb-1">
                  <CornerDownRight className="h-4 w-4 mr-2" />
                  <span>Membalas {replyToMessage.senderId === user?.id ? 'diri sendiri' : replyToMessage.senderName}</span>
                </div>
                {replyToMessage.hasAttachment ? (
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="text-[#8ba742] mr-2">📎</span>
                    <span className="truncate">{replyToMessage.attachmentName || 'File'}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-300 truncate">{replyToMessage.content || '<Pesan kosong>'}</p>
                )}
              </div>
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                className="text-gray-400 hover:text-white h-8 w-8 p-0 ml-2 shrink-0"
                onClick={() => {
                  console.log("Canceling reply");
                  setReplyToMessage(null);
                }}
              >
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

      {/* Group Management Dialog */}
      {isGroupManagementOpen && chatData && user && (
        <GroupManagementMobile
          groupId={chatId}
          groupName={chatData.name}
          onClose={() => setIsGroupManagementOpen(false)}
          currentUserId={user.id}
        />
      )}

      {/* Image Modal Fullscreen */}
      {selectedImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setSelectedImageModal(null)}
        >
          <div className="relative max-w-full max-h-full p-4">
            <Button
              className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white border-none z-10"
              size="sm"
              onClick={() => setSelectedImageModal(null)}
            >
              <X className="w-4 h-4" />
            </Button>
            <img 
              src={selectedImageModal} 
              alt="Chat image" 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ArrowLeft, Paperclip, Send, Mic, StopCircle, Reply, Forward, Trash2, MoreVertical, X, CornerDownRight, Phone, Video, Users, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface ChatRoomProps {
  chatId: number;
  isRoom: boolean;
  chatName: string;
  onBack: () => void;
  onNavigateToChat?: (targetId: number, isTargetRoom: boolean, forwardedMsg?: any) => void;
  forwardedMessage?: any;
}

export default function ChatRoom({ chatId, isRoom, chatName, onBack, onNavigateToChat, forwardedMessage }: ChatRoomProps) {
  const [message, setMessage] = useState("");
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  
  // State untuk menyimpan data user dari session
  const [user, setUser] = useState<any>({ id: '', callsign: '' });
  
  // Ambil data user dari session saat komponen dimuat
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include' // Penting untuk mengirimkan cookies
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log("User data dari session di ChatRoom:", userData);
          setUser(userData);
        } else {
          console.error("Gagal mengambil data user di ChatRoom");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  // State untuk menyimpan data room/chat
  const [roomData, setRoomData] = useState<any>({
    id: chatId,
    name: chatName,
    members: []
  });
  
  // Ambil data room dari API
  useEffect(() => {
    const fetchRoomData = async () => {
      if (isRoom) {
        try {
          const response = await fetch(`/api/rooms/${chatId}`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("Room data from API:", data);
            setRoomData(data);
          } else {
            console.error("Failed to fetch room data:", await response.text());
          }
        } catch (error) {
          console.error("Error fetching room data:", error);
        }
      } else {
        // For direct chats, just use the props data
        setRoomData({
          id: chatId,
          name: chatName,
          isDirect: true
        });
      }
    };
    
    fetchRoomData();
  }, [chatId, isRoom, chatName]);
  
  // Fungsi untuk scroll ke bawah chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Fungsi untuk mengambil pesan dari database
  const fetchMessages = async () => {
    try {
      console.log(`Mengambil pesan untuk chat ID ${chatId} (isRoom: ${isRoom})`);
      const response = await fetch(`/api/chats/${chatId}/messages?isRoom=${isRoom}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Pesan dari API:", data);
      
      // Format pesan untuk ditampilkan
      const formattedMessages = data.map((msg: any) => {
        return {
          id: msg.id,
          content: msg.content,
          sender: {
            id: msg.sender?.id || msg.senderId,
            callsign: msg.sender?.callsign || 'User'
          },
          timestamp: msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
          isRead: msg.status === 'read',
          attachments: msg.attachment ? [msg.attachment] : [],
          type: msg.type || 'text',
          replyTo: msg.replyToId ? {
            id: msg.replyToId,
            content: msg.replyInfo?.content || 'Pesan sebelumnya',
            sender: msg.replyInfo?.senderName || 'User'
          } : null
        };
      });
      
      setMessages(formattedMessages);
      // Scroll ke pesan terakhir
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error fetching messages:", error);
      // Gunakan array kosong sebagai fallback jika terjadi error
      setMessages([]);
    }
  };
  
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<any[]>([]);
  
  // Ambil daftar semua pengguna untuk menampilkan nama pengirim
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', {
          credentials: 'include'
        });
        if (response.ok) {
          const usersData = await response.json();
          console.log("Loaded", usersData.length, "users from database for personnel list");
          setUsers(usersData);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    
    fetchUsers();
  }, []);
  
  // State untuk menyimpan ID chat aktual dari database
  const [actualChatId, setActualChatId] = useState<number | null>(null);

  // Memastikan direct chat sudah ada antara user saat ini dan user target
  const ensureDirectChatExists = async (targetUserId: number | string) => {
    console.log(`Memastikan direct chat dengan pengguna ID ${targetUserId} sudah ada`);
    
    if (!user.id) {
      console.error("User belum login, tidak bisa membuat direct chat");
      return null;
    }
    
    try {
      // Dapatkan pengguna sebelum membuat direct chat
      const usersResponse = await fetch('/api/users', {
        credentials: 'include'
      });
      
      if (!usersResponse.ok) {
        console.error("Failed to fetch users:", await usersResponse.text());
        return null;
      }
      
      const usersList = await usersResponse.json();
      console.log("Daftar pengguna:", usersList);
      
      // Cari pengguna target
      const targetUser = usersList.find((u: any) => u.id === targetUserId);
      
      if (!targetUser) {
        console.error(`Pengguna dengan ID ${targetUserId} tidak ditemukan`);
        // Jika target user tidak ditemukan, coba direct-chat dengan ID 1bb756f5-dd07-49ff-a12d-60785456aaab (eko)
        const defaultTarget = usersList.find((u: any) => u.callsign === "eko");
        if (!defaultTarget) {
          console.error("Default target user (eko) juga tidak ditemukan");
          return null;
        }
        console.log("Menggunakan default target user:", defaultTarget);
        targetUserId = defaultTarget.id;
      } else {
        console.log("Target user ditemukan:", targetUser);
      }
      
      // Cari direct chat yang sudah ada dulu
      const directChatsResponse = await fetch('/api/direct-chats', {
        credentials: 'include'
      });
      
      if (directChatsResponse.ok) {
        const directChats = await directChatsResponse.json();
        const existingChat = directChats.find((chat: any) => 
          (chat.user1Id === user.id && chat.user2Id === targetUserId) || 
          (chat.user1Id === targetUserId && chat.user2Id === user.id)
        );
        
        if (existingChat) {
          console.log("Direct chat sudah ada:", existingChat);
          setActualChatId(existingChat.id);
          return existingChat.id;
        }
      }
      
      // Jika tidak ada, buat direct chat baru
      const response = await fetch('/api/direct-chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user2Id: targetUserId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error("Failed to create direct chat:", await response.text());
        return null;
      }
      
      const directChat = await response.json();
      console.log("Direct chat dibuat atau ditemukan:", directChat);
      
      // Set actual chat ID untuk digunakan dalam pengiriman dan pengambilan pesan
      if (directChat && directChat.id) {
        console.log(`Mengupdate chatId dari ${chatId} menjadi ${directChat.id} untuk pengiriman pesan`);
        setActualChatId(directChat.id);
        return directChat.id;
      }
      
      return null;
    } catch (error) {
      console.error("Error ensuring direct chat exists:", error);
      return null;
    }
  };
  
  // Saat component mount atau chatId berubah, pastikan direct chat exists jika tidak berupa room
  // Saat component mount atau chatId berubah, pastikan direct chat exists jika tidak berupa room
  useEffect(() => {
    if (user && user.id) {
      if (chatId && !isRoom) {
        console.log(`Memastikan direct chat untuk user ID ${user.id} dengan target ID ${chatId}`);
        // Untuk direct chat, cari atau buat direct chat dengan ID yang sesuai
        ensureDirectChatExists(chatId);
      } else if (chatId && isRoom) {
        // Untuk room, gunakan ID yang ada langsung
        console.log(`Menggunakan room ID ${chatId} langsung`);
        setActualChatId(chatId);
      }
    }
  }, [chatId, isRoom, user]);

  // Fetch messages from the server
  useEffect(() => {
    // Jika actualChatId belum tersedia, tunggu
    if (!actualChatId) return;
    
    const fetchMessages = async () => {
      try {
        // URL for API request
        const url = isRoom 
          ? `/api/rooms/${actualChatId}/messages` 
          : `/api/chats/${actualChatId}/messages`;
          
        console.log(`Fetching messages from ${url}`);
        
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const messagesData = await response.json();
          console.log("Pesan dari server:", messagesData);
          
          // Proses pesan dari server
          const processedMessages = messagesData.map((msg: any) => {
            // Cari data pengirim
            const senderUser = users.find(u => u.id === msg.senderId);
            const senderName = senderUser?.callsign || 'Unknown';
            
            // Format waktu
            const timestamp = msg.timestamp || msg.sentAt || new Date();
            const formattedTime = new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit', 
              minute: '2-digit'
            });
            
            return {
              ...msg,
              sender: { 
                id: msg.senderId, 
                callsign: senderName 
              },
              timestamp: formattedTime
            };
          });
          
          if (processedMessages.length > 0) {
            setMessages(processedMessages);
          } else if (messages.length === 0) {
            // Hanya gunakan pesan contoh jika memang belum ada pesan sama sekali
            setMessages(getInitialMessages());
          }
        } else {
          console.error("Failed to fetch messages:", await response.text());
          // Tidak mengganti pesan yang sudah ada jika gagal mengambil dari server
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    
    fetchMessages();
    
    // Setup polling for new messages - refresh every 5 seconds
    const intervalId = setInterval(() => {
      fetchMessages();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [actualChatId, isRoom, users]);
  
  // Enhanced attachment type to handle different file types
  type Attachment = {
    url: string;
    name: string;
    type: string;
    size: number;
    file: File;
  };
  
  // Message action states
  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<any | null>(null);
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);
  
  // Voice recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle forwarded message if provided
  useEffect(() => {
    if (forwardedMessage) {
      // If this component was rendered with a forwarded message, add it to the messages
      setMessages(prevMessages => [...prevMessages, forwardedMessage]);
    }
  }, [forwardedMessage]);
  
  // Function to format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  // Get file icon based on file type
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('zip') || type.includes('compressed')) return '📦';
    return '📎';
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Handle file attachment selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Create attachment objects with all necessary data
    const newAttachments = Array.from(files).map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size,
      file: file
    }));
    
    setAttachments([...attachments, ...newAttachments]);
    
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  // Handle voice recording
  const handleVoiceRecording = async () => {
    if (isRecording && mediaRecorder) {
      // Stop recording
      mediaRecorder.stop();
      setIsRecording(false);
      
      // We don't reset timer immediately to show the final duration
      setTimeout(() => {
        setRecordingTime(0);
      }, 1000);
      
    } else {
      // Start recording
      try {
        audioChunks.current = [];
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunks.current.push(e.data);
          }
        };
        
        recorder.onstop = () => {
          // Create audio blob and URL
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setAudioURL(url);
          
          // Create a File object from the Blob for easier handling
          const audioFile = new File(
            [audioBlob], 
            `voice_recording_${new Date().getTime()}.webm`, 
            { type: 'audio/webm' }
          );
          
          // Process the audio recording as an attachment
          const audioAttachment = {
            url: url,
            name: `Voice Note - ${formatTime(recordingTime)}`,
            type: 'audio/webm',
            size: audioBlob.size,
            file: audioFile
          };
          
          // Add the audio attachment
          setAttachments([...attachments, audioAttachment]);
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        };
        
        setMediaRecorder(recorder);
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Could not access microphone. Please check permissions.");
      }
    }
  };
  
  // Handle message actions
  const handleMessageLongPress = (messageId: number) => {
    setActiveMessageId(messageId);
    setShowMessageActions(true);
  };
  
  const handleReply = (msg: any) => {
    setReplyingToMessage(msg);
    setShowReplyForm(true);
    setShowMessageActions(false);
  };
  
  const handleForward = (msg: any) => {
    setForwardingMessage(msg);
    setShowForwardDialog(true);
    setShowMessageActions(false);
  };
  
  const handleDelete = (messageId: number) => {
    setMessages(messages.filter(msg => msg.id !== messageId));
    setShowMessageActions(false);
  };
  
  // Helper function to generate a unique message ID
  const generateUniqueId = () => {
    return Date.now() + Math.floor(Math.random() * 1000);
  };
  
  // Send message function
  const sendMessage = async () => {
    if (message.trim() === '' && attachments.length === 0) return;
    
    let content = message;
    let replyToId = null;
    
    // Jika ada attachment tapi tidak ada teks
    if (message.trim() === '' && attachments.length > 0) {
      content = "Sent attachment";
    }
    
    // Handle reply case
    if (showReplyForm && replyingToMessage) {
      replyToId = replyingToMessage.id;
    }
    
    try {
      if (attachments.length > 0) {
        // Kirim pesan dengan attachment
        const formData = new FormData();
        formData.append('content', content);
        formData.append('isRoom', isRoom.toString());
        
        if (replyToId) {
          formData.append('replyToId', replyToId.toString());
        }
        
        // Tambahkan semua file attachment
        attachments.forEach((attachment, index) => {
          if (attachment.file) {
            formData.append('file', attachment.file);
          }
        });
        
        // Tampilkan pesan loading
        console.log("Mengirim pesan dengan attachment...");
        
        // Tambahkan pesan sementara ke daftar
        const tempId = generateUniqueId();
        const tempMessage = {
          id: tempId,
          content: content,
          sender: { id: user.id, callsign: user.callsign },
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          isRead: true,
          attachments: attachments.length > 0 ? [...attachments] : undefined,
          replyTo: showReplyForm ? replyingToMessage : undefined,
          status: 'sending'
        };
        
        setMessages(prev => [...prev, tempMessage]);
        
        // Kirim pesan ke server
        const response = await fetch(`/api/chats/${chatId}/attachments`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error sending message: ${response.status} ${response.statusText}`);
        }
        
        const sentMessage = await response.json();
        console.log("Pesan dengan attachment berhasil dikirim:", sentMessage);
        
        // Update pesan temp dengan data dari server
        setMessages(prev => prev.map(msg => msg.id === tempId ? sentMessage : msg));
        
      } else {
        // Jika bukan room, pastikan direct chat sudah dibuat terlebih dahulu
        if (!isRoom) {
          try {
            console.log(`Memastikan direct chat dengan pengguna ID ${chatId} sudah ada`);
            
            // Coba buat direct chat jika belum ada
            // Di mode non-group, chatId pada komponen ini sebenarnya adalah targetUserId
            // Tapi kita perlu memperoleh UUID yang tepat dari user yang tersedia
            // Coba dapatkan daftar pengguna dari server
            const usersResponse = await fetch('/api/users', {
              credentials: 'include'
            });
            
            if (!usersResponse.ok) {
              console.error("Gagal mendapatkan daftar pengguna");
              throw new Error("Gagal mendapatkan daftar pengguna");
            }
            
            const users = await usersResponse.json();
            console.log("Daftar pengguna:", users);
            
            // Cari user dengan ID atau callsign yang cocok (asumsi chatName adalah callsign)
            const targetUser = users.find((u: any) => 
              u.id === chatId.toString() || u.callsign === chatName
            );
            
            if (!targetUser) {
              console.error(`Pengguna dengan ID ${chatId} atau callsign ${chatName} tidak ditemukan`);
              throw new Error(`Pengguna dengan ID ${chatId} atau callsign ${chatName} tidak ditemukan`);
            }
            
            console.log(`Target user ditemukan:`, targetUser);
            
            // Buat direct chat dengan user yang ditemukan
            const createChatResponse = await fetch('/api/direct-chats', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ otherUserId: targetUser.id }),
              credentials: 'include'
            });
            
            if (!createChatResponse.ok) {
              console.warn(`Gagal membuat direct chat: ${createChatResponse.status} ${createChatResponse.statusText}`);
            } else {
              const directChat = await createChatResponse.json();
              console.log("Direct chat dibuat atau ditemukan:", directChat);
              
              // Perbarui chatId untuk mengirim pesan
              const directChatId = directChat.id;
              console.log(`Mengupdate chatId dari ${chatId} menjadi ${directChatId} untuk pengiriman pesan`);
              chatId = directChatId;
            }
          } catch (chatError) {
            console.error("Error saat memastikan direct chat:", chatError);
          }
        }
        
        // Kirim pesan teks biasa
        const messageData = {
          content,
          isRoom,
          replyToId
        };
        
        // Tambahkan pesan sementara ke daftar
        const tempId = generateUniqueId();
        const tempMessage = {
          id: tempId,
          content,
          sender: { id: user.id, callsign: user.callsign },
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          isRead: true,
          replyTo: showReplyForm ? replyingToMessage : undefined,
          status: 'sending'
        };
        
        setMessages(prev => [...prev, tempMessage]);
        
        console.log(`Mengirim pesan ke chatId=${chatId}, isRoom=${isRoom}`, messageData);
        
        // Kirim pesan ke server
        const response = await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData),
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.error(`Error server: ${response.status} ${response.statusText}`);
          const errorData = await response.text();
          console.error(`Response error: ${errorData}`);
          throw new Error(`Error sending message: ${response.status} ${response.statusText}`);
        }
        
        const sentMessage = await response.json();
        console.log("Pesan berhasil dikirim:", sentMessage);
        
        // Update pesan temp dengan data dari server
        setMessages(prev => prev.map(msg => msg.id === tempId ? sentMessage : msg));
      }
    } catch (error) {
      console.error("Gagal mengirim pesan:", error);
      alert("Gagal mengirim pesan. Silakan coba lagi.");
    }
    
    // Reset state
    setMessage('');
    setAttachments([]);
    setShowReplyForm(false);
    setReplyingToMessage(null);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Mock startCall function
  const startCall = (isVideo: boolean) => {
    alert(`${isVideo ? 'Video' : 'Audio'} call with ${chatName} initiated!`);
  };
  
  // Generate a list of contacts for the forward dialog
  const getContacts = () => {
    return [
      { id: 101, name: "ALPHA SQUAD", isRoom: true },
      { id: 102, name: "SUPPORT TEAM", isRoom: true },
      { id: 103, name: "COMMAND CENTER", isRoom: true },
      { id: 2, name: "BRAVO2", isRoom: false },
      { id: 3, name: "CHARLIE3", isRoom: false },
      { id: 4, name: "DELTA4", isRoom: false }
    ];
  };
  
  // Render the room members dialog
  const renderMembersDialog = () => {
    // Menggunakan roomData state yang sudah kita definisikan
    return (
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2c2c2c] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#a2bd62]">{roomData.name} - MEMBERS</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <ul className="divide-y divide-[#2c2c2c]">
              {Array.isArray(roomData.members) && roomData.members.length > 0 ? (
                roomData.members.map((member: any) => (
                  <li key={member.id} className="py-2 flex items-center">
                    <div className="w-8 h-8 bg-[#353535] rounded-full flex items-center justify-center text-xs mr-3">
                      {member.callsign ? member.callsign.substring(0, 2) : "??"}
                    </div>
                    <span>{member.callsign || "Unknown Member"}</span>
                  </li>
                ))
              ) : (
                <li className="py-2 text-center">
                  <span className="text-gray-400">No members available</span>
                </li>
              )}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Render the forward dialog
  const renderForwardDialog = () => {
    const contacts = getContacts();
    
    return (
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2c2c2c] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#a2bd62]">FORWARD MESSAGE</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <div className="bg-[#0c0c0c] p-3 rounded mb-4 border border-[#2c2c2c]">
              <p className="text-xs text-gray-400 mb-1">FORWARDING:</p>
              <p className="text-sm">{forwardingMessage?.content}</p>
            </div>
            <p className="text-sm mb-2">Select recipient:</p>
            <ul className="divide-y divide-[#2c2c2c]">
              {contacts.map(contact => (
                <li
                  key={`${contact.isRoom ? 'room' : 'chat'}-${contact.id}`}
                  className="py-2 hover:bg-[#252525] cursor-pointer flex items-center"
                  onClick={() => {
                    if (onNavigateToChat) {
                      onNavigateToChat(contact.id, contact.isRoom, forwardingMessage);
                    }
                    setShowForwardDialog(false);
                  }}
                >
                  <div className="w-8 h-8 bg-[#353535] rounded-full flex items-center justify-center mr-3">
                    {contact.isRoom ? <Users size={14} /> : <User size={14} />}
                  </div>
                  <span>{contact.name}</span>
                  {contact.isRoom && (
                    <span className="ml-2 text-xs text-gray-400">(Group)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-[#2c2c2c] p-3 flex justify-between items-center">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2 text-white hover:bg-[#252525]"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#353535] rounded-full flex items-center justify-center mr-2">
              <span className="text-[#a2bd62] text-xs font-bold">
                {chatName.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-bold text-white">{chatName}</h2>
              <p className="text-xs text-gray-400">
                {isRoom ? 'Tactical Channel' : 'Direct Comms'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-[#252525]"
            onClick={() => startCall(false)}
          >
            <Phone size={18} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-[#252525]"
            onClick={() => startCall(true)}
          >
            <Video size={18} />
          </Button>
          {isRoom && (
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-[#252525]"
              onClick={() => setShowMembersDialog(true)}
            >
              <Users size={18} />
            </Button>
          )}
        </div>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#0c0c0c] pb-16">
        {messages.map((msg) => {
          // Pastikan struktur pesan yang konsisten antara pesan lokal dan dari server
          const sender = msg.sender || { id: msg.senderId, callsign: 'User' };
          const isCurrentUser = sender.id === user.id;
          
          return (
            <div
              key={msg.id}
              className={`mb-4 ${isCurrentUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}
            >
              {/* Message container */}
              <div 
                className={`relative max-w-[80%] ${isCurrentUser ? 'bg-[#1e3a14] rounded-tl-lg rounded-tr-lg rounded-bl-lg' : 'bg-[#1a1a1a] rounded-tr-lg rounded-tl-lg rounded-br-lg'}`}
                onClick={() => handleMessageLongPress(msg.id)}
              >
                {/* Reply indicator */}
                {msg.replyTo && (
                  <div className="border-l-2 border-[#a2bd62] bg-[#1c1c1c] px-3 py-1 mt-1 mx-1 rounded text-xs text-gray-400 flex items-center">
                    <CornerDownRight size={12} className="mr-1" />
                    <div className="truncate">
                      <span className="text-[#a2bd62] mr-1">{msg.replyTo.sender?.callsign || 'User'}:</span>
                      {msg.replyTo.content.substring(0, 40)}{msg.replyTo.content.length > 40 ? '...' : ''}
                    </div>
                  </div>
                )}
                
                {/* Message content */}
                <div className="px-3 py-2">
                  {!isCurrentUser && (
                    <div className="text-xs text-[#a2bd62] font-bold mb-1">{sender.callsign}</div>
                  )}
                  <div className="break-words">{msg.content}</div>
                  
                  {/* Attachments */}
                  {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.attachments.map((attachment: any, index: number) => (
                        <div 
                          key={index}
                          className="bg-[#252525] p-2 rounded flex items-center text-sm"
                        >
                          <span className="mr-2 text-lg">
                            {attachment.icon || getFileIcon(attachment.type)}
                          </span>
                          <div className="flex-1 overflow-hidden">
                            <div className="truncate">{attachment.name}</div>
                            <div className="text-xs text-gray-400">
                              {formatFileSize(attachment.size)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Audio attachment */}
                  {msg.audioUrl && (
                    <div className="mt-2">
                      <audio src={msg.audioUrl} controls className="w-full h-10" />
                    </div>
                  )}
                </div>
                
                {/* Timestamp */}
                <div className={`text-xs text-gray-400 px-3 pb-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp}
                </div>
                
                {/* Message actions - visible when a message is long-pressed/selected */}
                {activeMessageId === msg.id && showMessageActions && (
                  <div className="absolute top-0 right-0 mt-2 mr-2 bg-[#252525] rounded shadow-lg z-10">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-white p-1 h-auto"
                      onClick={() => setShowMessageActions(false)}
                    >
                      <X size={14} />
                    </Button>
                    <div className="p-1 flex">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-white p-1 h-auto"
                        onClick={() => handleReply(msg)}
                      >
                        <Reply size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-white p-1 h-auto"
                        onClick={() => handleForward(msg)}
                      >
                        <Forward size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-white p-1 h-auto"
                        onClick={() => handleDelete(msg.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Reply form */}
      {showReplyForm && replyingToMessage && (
        <div className="bg-[#1a1a1a] border-t border-[#2c2c2c] p-2 flex items-start">
          <div className="flex-1 pl-2 border-l-2 border-[#a2bd62]">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#a2bd62]">
                Replying to {replyingToMessage.sender.callsign}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                className="p-0 h-6 w-6 text-gray-400 hover:text-white"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyingToMessage(null);
                }}
              >
                <X size={14} />
              </Button>
            </div>
            <p className="text-xs text-gray-400 truncate">{replyingToMessage.content}</p>
          </div>
        </div>
      )}
      
      {/* File attachments preview */}
      {attachments.length > 0 && (
        <div className="bg-[#1a1a1a] border-t border-[#2c2c2c] p-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div 
              key={index}
              className="bg-[#252525] rounded p-2 flex items-center text-sm"
            >
              <span className="mr-2 text-lg">{getFileIcon(attachment.type)}</span>
              <div className="max-w-[120px] overflow-hidden">
                <div className="truncate">{attachment.name}</div>
                <div className="text-xs text-gray-400">
                  {formatFileSize(attachment.size)}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="ml-2 p-0 h-6 w-6 text-gray-400 hover:text-white"
                onClick={() => {
                  const newAttachments = [...attachments];
                  newAttachments.splice(index, 1);
                  setAttachments(newAttachments);
                }}
              >
                <X size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {/* Input area - fixed for mobile display */}
      <div className="bg-[#1a1a1a] border-t border-[#2c2c2c] p-3 flex items-center w-full fixed bottom-0 left-0 right-0 z-50">
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          ref={fileInputRef}
          className="hidden"
        />
        <Button 
          variant="ghost" 
          size="sm"
          className="text-gray-400 hover:text-white flex-shrink-0 w-10 h-10 p-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={20} />
        </Button>
        
        <div className="flex-1 mx-2 min-w-0">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-[#252525] border-[#353535] text-white focus:border-[#a2bd62] w-full h-10"
          />
        </div>
        
        {message.trim() === '' && attachments.length === 0 ? (
          <Button 
            variant="ghost" 
            size="sm"
            className={`${isRecording ? 'text-red-500' : 'text-gray-400 hover:text-white'} flex-shrink-0 w-10 h-10 p-0`}
            onClick={handleVoiceRecording}
          >
            {isRecording ? (
              <>
                <StopCircle size={20} />
                <span className="sr-only">Stop recording</span>
              </>
            ) : (
              <>
                <Mic size={20} />
                <span className="sr-only">Start recording</span>
              </>
            )}
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm"
            className="text-[#a2bd62] hover:text-[#b8d670] flex-shrink-0 w-10 h-10 p-0"
            onClick={sendMessage}
          >
            <Send size={20} />
          </Button>
        )}
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute bottom-16 left-0 right-0 bg-red-900 bg-opacity-80 text-white py-2 px-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-red-500 mr-2 animate-pulse"></div>
              <span>Recording voice message</span>
            </div>
            <span>{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>
      
      {/* Dialogs */}
      {renderMembersDialog()}
      {renderForwardDialog()}
    </div>
  );
}
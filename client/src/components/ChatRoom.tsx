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
  
  // Mock messages based on chat type
  const getInitialMessages = () => {
    if (isRoom) {
      // Group chat messages
      return [
        {
          id: 1,
          content: "Awaiting further instructions for Operation Alpha.",
          sender: { id: 2, callsign: "BRAVO2" },
          timestamp: "10:45",
          isRead: true
        },
        {
          id: 2,
          content: "Coordinates received. Moving to rendezvous point.",
          sender: { id: 3, callsign: "CHARLIE3" },
          timestamp: "10:46",
          isRead: true
        },
        {
          id: 3,
          content: "Supplies will be at the designated location at 1200 hours.",
          sender: { id: 1, callsign: "ALPHA1" },
          timestamp: "10:50",
          isRead: true
        },
        {
          id: 4,
          content: "Roger that. Will proceed with caution.",
          sender: { id: 4, callsign: "DELTA4" },
          timestamp: "10:52",
          isRead: true
        },
        {
          id: 5,
          content: "UAV surveillance confirms area is clear. Proceed with mission.",
          sender: { id: 1, callsign: "ALPHA1" },
          timestamp: "10:55",
          isRead: true
        }
      ];
    } else {
      // Direct chat messages
      // Determine the other user based on chatName
      const otherUsername = chatName;
      const otherUserId = chatId;
      
      return [
        {
          id: 1,
          content: `Secure direct communication established with ${otherUsername}.`,
          sender: { id: 1, callsign: "ALPHA1" },
          timestamp: "09:30",
          isRead: true
        },
        {
          id: 2,
          content: "Status report requested for your current position.",
          sender: { id: otherUserId, callsign: otherUsername },
          timestamp: "09:32",
          isRead: true
        },
        {
          id: 3,
          content: "All systems nominal. Maintaining position at grid reference Delta-7.",
          sender: { id: 1, callsign: "ALPHA1" },
          timestamp: "09:35",
          isRead: true
        },
        {
          id: 4,
          content: "Acknowledged. Stand by for further instructions.",
          sender: { id: otherUserId, callsign: otherUsername },
          timestamp: "09:40",
          isRead: true
        }
      ];
    }
  };
  
  const [messages, setMessages] = useState(getInitialMessages());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
    const room = getRoomData();
    
    return (
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2c2c2c] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#a2bd62]">{room.name} - MEMBERS</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <ul className="divide-y divide-[#2c2c2c]">
              {room.members.map((member: any) => (
                <li key={member.id} className="py-2 flex items-center">
                  <div className="w-8 h-8 bg-[#353535] rounded-full flex items-center justify-center text-xs mr-3">
                    {member.callsign.substring(0, 2)}
                  </div>
                  <span>{member.callsign}</span>
                </li>
              ))}
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
      <div className="flex-1 overflow-y-auto p-4 bg-[#0c0c0c]">
        {messages.map((msg) => {
          const isCurrentUser = msg.sender.id === user.id;
          
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
                      <span className="text-[#a2bd62] mr-1">{msg.replyTo.sender.callsign}:</span>
                      {msg.replyTo.content.substring(0, 40)}{msg.replyTo.content.length > 40 ? '...' : ''}
                    </div>
                  </div>
                )}
                
                {/* Message content */}
                <div className="px-3 py-2">
                  {!isCurrentUser && (
                    <div className="text-xs text-[#a2bd62] font-bold mb-1">{msg.sender.callsign}</div>
                  )}
                  <div className="break-words">{msg.content}</div>
                  
                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
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
      
      {/* Input area */}
      <div className="bg-[#1a1a1a] border-t border-[#2c2c2c] p-3 flex items-center">
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          ref={fileInputRef}
          className="hidden"
        />
        <Button 
          variant="ghost" 
          size="icon"
          className="text-gray-400 hover:text-white"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={20} />
        </Button>
        
        <div className="flex-1 mx-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-[#252525] border-[#353535] text-white focus:border-[#a2bd62]"
          />
        </div>
        
        {message.trim() === '' && attachments.length === 0 ? (
          <Button 
            variant="ghost" 
            size="icon"
            className={`${isRecording ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
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
            size="icon"
            className="text-[#a2bd62] hover:text-[#b8d670]"
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
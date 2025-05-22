import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ArrowLeft, PaperclipIcon, SendIcon, Mic, StopCircle, Reply, Forward, Trash2, MoreVertical, X, CornerDownRight, PhoneIcon, VideoIcon, Users, User } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { useCall } from "../hooks/useCall";
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
  const { user } = useAuth();
  const { startCall } = useCall();
  const [message, setMessage] = useState("");
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  
  // Get room data from local storage or parent component props
  const getRoomData = () => {
    try {
      // Try to get room data from local storage first
      const storedRooms = localStorage.getItem('roomData');
      if (storedRooms) {
        const rooms = JSON.parse(storedRooms);
        const room = rooms.find((r: any) => r.id === chatId);
        if (room) return room;
      }
      
      // Fallback to mock data if necessary
      return {
        id: chatId,
        name: chatName,
        members: Array.from({ length: Math.floor(Math.random() * 10) + 3 }, (_, i) => ({
          id: i + 1,
          username: `OPERATOR-${i+1}`
        }))
      };
    } catch (error) {
      console.error("Error getting room data:", error);
      return {
        id: chatId,
        name: chatName,
        members: []
      };
    }
  };
  
  // Mock messages based on chat type
  const getInitialMessages = () => {
    if (isRoom) {
      // Group chat messages
      return [
        {
          id: 1,
          content: "Awaiting further instructions for Operation Alpha.",
          sender: { id: 2, username: "BRAVO2" },
          timestamp: "10:45",
          isRead: true
        },
        {
          id: 2,
          content: "Coordinates received. Moving to rendezvous point.",
          sender: { id: 3, username: "CHARLIE3" },
          timestamp: "10:46",
          isRead: true
        },
        {
          id: 3,
          content: "Supplies will be at the designated location at 1200 hours.",
          sender: { id: 1, username: "ALPHA1" },
          timestamp: "10:50",
          isRead: true
        },
        {
          id: 4,
          content: "Roger that. Will proceed with caution.",
          sender: { id: 4, username: "DELTA4" },
          timestamp: "10:52",
          isRead: true
        },
        {
          id: 5,
          content: "UAV surveillance confirms area is clear. Proceed with mission.",
          sender: { id: 1, username: "ALPHA1" },
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
          sender: { id: 1, username: "ALPHA1" },
          timestamp: "09:30",
          isRead: true
        },
        {
          id: 2,
          content: "Status report requested for your current position.",
          sender: { id: otherUserId, username: otherUsername },
          timestamp: "09:32",
          isRead: true
        },
        {
          id: 3,
          content: "All systems nominal. Maintaining position at grid reference Delta-7.",
          sender: { id: 1, username: "ALPHA1" },
          timestamp: "09:35",
          isRead: true
        },
        {
          id: 4,
          content: "Acknowledged. Stand by for further instructions.",
          sender: { id: otherUserId, username: otherUsername },
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
            id: Math.random().toString(36).substring(2, 9),
            name: `Voice Note - ${formatTime(recordingTime)}`,
            type: 'audio/webm',
            size: audioBlob.size,
            url: url,
            icon: '🎤'
          };
          
          // Send the audio message
          const newMessage = {
            id: messages.length + 1,
            content: "🎤 Voice recording - " + formatTime(recordingTime),
            sender: { id: user?.id || 1, username: user?.username || "ALPHA1" },
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            isRead: true,
            audioUrl: url,
            attachments: [audioAttachment]
          };
          
          setMessages([...messages, newMessage]);
          
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
  

  
  const handleSendForward = (targetId: number, isTargetRoom: boolean) => {
    if (!forwardingMessage) return;
    
    // Create a forwarded version of the message
    const forwardedContent = `FORWARDED MESSAGE FROM ${forwardingMessage.sender.username} (${forwardingMessage.timestamp})`;
    
    // Process attachments if any
    let forwardedAttachments = [];
    if ('attachments' in forwardingMessage && forwardingMessage.attachments && forwardingMessage.attachments.length > 0) {
      forwardedAttachments = forwardingMessage.attachments.map((attachment: any) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        url: attachment.url,
        icon: attachment.icon || getFileIcon(attachment.type)
      }));
    }
    
    // Forward any audio recording
    let audioUrl = undefined;
    if ('audioUrl' in forwardingMessage && forwardingMessage.audioUrl) {
      audioUrl = forwardingMessage.audioUrl;
    }
    
    // Create the forwarded message object that would go to the recipient
    const newForwardedMessage = {
      id: Date.now(), // Use timestamp for unique ID
      content: forwardedContent,
      sender: { id: user?.id || 1, username: user?.username || "ALPHA1" },
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      isRead: true,
      forwardedMessage: {
        content: forwardingMessage.content,
        sender: forwardingMessage.sender,
        timestamp: forwardingMessage.timestamp,
        attachments: forwardedAttachments.length > 0 ? forwardedAttachments : undefined,
        audioUrl: audioUrl
      }
    };
    
    // Get recipient info for display
    let recipientName = "Unknown";
    let recipientMessages = [];
    
    if (isTargetRoom) {
      // Find room details from tactical channels list
      const tacticalChannels = [
        { 
          id: 101, 
          name: "ALPHA SQUAD", 
          isRoom: true,
          messages: [
            {
              id: 1,
              content: "Status report, all units.",
              sender: { id: 5, username: "COMMANDER" },
              timestamp: "09:15",
              isRead: true
            },
            {
              id: 2,
              content: "Sector 7 clear, proceeding to checkpoint Bravo.",
              sender: { id: 2, username: "BRAVO2" },
              timestamp: "09:18",
              isRead: true
            }
          ]
        },
        { 
          id: 102, 
          name: "SUPPORT TEAM", 
          isRoom: true,
          messages: [
            {
              id: 1,
              content: "Supply drop confirmed at coordinates 35.4, -12.8",
              sender: { id: 6, username: "LOGISTICS" },
              timestamp: "08:45",
              isRead: true
            }
          ]
        },
        { 
          id: 103, 
          name: "COMMAND CENTER", 
          isRoom: true,
          messages: [
            {
              id: 1,
              content: "Satellite imagery updated. Transmitting now.",
              sender: { id: 7, username: "INTEL" },
              timestamp: "10:02",
              isRead: true
            }
          ]
        }
      ];
      
      const room = tacticalChannels.find(room => room.id === targetId);
      if (room) {
        recipientName = room.name;
        recipientMessages = [...room.messages];
      }
    } else {
      // Find user details from operators list
      const operators = [
        { 
          id: 2, 
          name: "BRAVO2", 
          isRoom: false,
          messages: [
            {
              id: 1,
              content: "Patrol route confirmed for tonight.",
              sender: { id: 2, username: "BRAVO2" },
              timestamp: "11:30",
              isRead: true
            }
          ]
        },
        { 
          id: 3, 
          name: "CHARLIE3", 
          isRoom: false,
          messages: [
            {
              id: 1,
              content: "Equipment check completed, all systems nominal.",
              sender: { id: 3, username: "CHARLIE3" },
              timestamp: "10:15",
              isRead: true
            }
          ]
        },
        { 
          id: 4, 
          name: "DELTA4", 
          isRoom: false,
          messages: [
            {
              id: 1,
              content: "Perimeter secured, standing by for further instructions.",
              sender: { id: 4, username: "DELTA4" },
              timestamp: "09:45",
              isRead: true
            }
          ]
        }
      ];
      
      const person = operators.find(person => person.id === targetId);
      if (person) {
        recipientName = person.name;
        recipientMessages = [...person.messages];
      }
    }
    
    // For the demo, let's create a simulation of the target chat
    // Get the existing messages of the target
    const targetMessages = [...recipientMessages];
    
    // Add the forwarded message to the target's messages
    targetMessages.push(newForwardedMessage);
    
    // Show confirmation message in current chat
    const confirmationMessage = {
      id: messages.length + 1,
      content: `Message forwarded to ${isTargetRoom ? "TACTICAL CHANNEL" : "OPERATOR"}: ${recipientName}`,
      sender: { id: 0, username: "SYSTEM" },
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      isRead: true,
      isSystemMessage: true
    };
    
    // Update current chat with confirmation
    setMessages([...messages, confirmationMessage]);
    
    // Close dialog
    setShowForwardDialog(false);
    setForwardingMessage(null);
    
    // Display a brief confirmation toast
    alert(`Message forwarded to ${recipientName}!`);
    
    // In a real app with proper state management, we'd navigate to the target chat,
    // show it briefly, then return to the original chat using context or navigation
    if (onNavigateToChat) {
      // Use the provided callback from parent to handle navigation between chats
      // Pass the forwarded message to display in the target chat
      onNavigateToChat(targetId, isTargetRoom, newForwardedMessage);
    }
  };
  
  const handleCancelReply = () => {
    setShowReplyForm(false);
    setReplyingToMessage(null);
  };
  
  const handleSendReply = () => {
    if (message.trim() || attachments.length > 0) {
      // Process attachments for reply
      const fileAttachments = attachments.map(attachment => ({
        id: Math.random().toString(36).substring(2, 9),
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        url: attachment.url,
        icon: getFileIcon(attachment.type)
      }));
      
      // Create reply message
      const newMessage = {
        id: messages.length + 1,
        content: message,
        sender: { id: user?.id || 1, username: user?.username || "ALPHA1" },
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        isRead: true,
        attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
        replyTo: replyingToMessage
      };
      
      setMessages([...messages, newMessage]);
      setMessage("");
      setAttachments([]); 
      setShowReplyForm(false);
      setReplyingToMessage(null);
    }
  };
  
  const handleSendMessage = () => {
    if (showReplyForm) {
      handleSendReply();
      return;
    }
    
    if (message.trim() || attachments.length > 0) {
      console.log(`Sending message: ${message}`);
      
      // Prepare content based on message and attachments
      let content = message;
      
      if (attachments.length > 0) {
        if (message.trim()) {
          content += `\n[${attachments.length} attachment${attachments.length > 1 ? 's' : ''}]`;
        } else {
          content = `[${attachments.length} attachment${attachments.length > 1 ? 's' : ''}]`;
        }
      }
      
      // Process attachments for display
      const fileAttachments = attachments.map(attachment => ({
        id: Math.random().toString(36).substring(2, 9),
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        url: attachment.url,
        icon: getFileIcon(attachment.type)
      }));
      
      // Add the message to the chat (simulated for demo)
      const newMessage = {
        id: messages.length + 1,
        content: content,
        sender: { id: user?.id || 1, username: user?.username || "ALPHA1" },
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        isRead: true,
        attachments: fileAttachments.length > 0 ? fileAttachments : undefined
      };
      
      setMessages([...messages, newMessage]);
      setMessage("");
      setAttachments([]); // Clear attachments after sending
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="military-header px-4 py-3 flex items-center shadow-md">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-2 text-primary-foreground hover:bg-accent/30"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex items-center">
          <div className="w-10 h-10 rounded-sm bg-secondary text-secondary-foreground flex items-center justify-center mr-3 border border-accent">
            <span className="font-bold">OP</span>
          </div>
          <div>
            <h1 className="text-base font-bold uppercase tracking-wider text-primary-foreground">{chatName}</h1>
            <p className="text-xs text-primary-foreground/80">
              {isRoom ? "TACTICAL CHANNEL" : "DIRECT COMMS"} • {isRoom ? `${getRoomData().members?.length || 0} OPERATORS` : "SECURE LINE"}
            </p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          {/* Room members button (only for rooms) */}
          {isRoom && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-accent/30"
              onClick={() => setShowMembersDialog(true)}
            >
              <Users className="h-5 w-5" />
            </Button>
          )}
          
          {/* Voice and Video Call Buttons (only for direct messages) */}
          {!isRoom && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-primary-foreground hover:bg-accent/30"
                onClick={() => {
                  console.log("[ChatRoom] Starting audio call with chatId:", chatId);
                  if (startCall) {
                    try {
                      startCall(chatId, 'audio');
                    } catch (error) {
                      console.error("[ChatRoom] Error starting audio call:", error);
                    }
                  } else {
                    console.error("[ChatRoom] startCall function is not available");
                  }
                }}
              >
                <PhoneIcon className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-primary-foreground hover:bg-accent/30"
                onClick={() => {
                  console.log("[ChatRoom] Starting video call with chatId:", chatId);
                  if (startCall) {
                    try {
                      startCall(chatId, 'video');
                    } catch (error) {
                      console.error("[ChatRoom] Error starting video call:", error);
                    }
                  } else {
                    console.error("[ChatRoom] startCall function is not available");
                  }
                }}
              >
                <VideoIcon className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </header>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-background p-4 space-y-4 pb-20">
        {messages.map((msg, idx) => {
          // System message (forwarding confirmation)
          if ('isSystemMessage' in msg && msg.isSystemMessage) {
            return (
              <div key={idx} className="flex justify-center">
                <div className="bg-accent/30 text-muted-foreground text-xs px-3 py-1 rounded-sm border border-accent">
                  <span>{msg.content}</span>
                </div>
              </div>
            );
          }
          
          // Normal user message
          return (
            <div 
              key={idx}
              className={`flex ${msg.sender.id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender.id !== user?.id && (
                <div className="w-8 h-8 rounded-sm bg-secondary text-secondary-foreground flex items-center justify-center mr-2 border border-accent self-end">
                  <span className="text-xs font-bold">{msg.sender.username.substring(0, 2)}</span>
                </div>
              )}
              
              <div className="max-w-[75%] flex flex-col">
                {msg.sender.id !== user?.id && (
                  <span className="text-xs font-bold ml-1 mb-1">{msg.sender.username}</span>
                )}
                
                <div 
                  className={`group relative px-3 py-2 ${msg.sender.id === user?.id 
                    ? 'chat-bubble-sent' 
                    : 'chat-bubble-received'}`}
                  onClick={() => handleMessageLongPress(msg.id)}
              >
                {/* Reply indicator */}
                {'replyTo' in msg && msg.replyTo && (
                  <div className="flex flex-col mb-2 p-1.5 bg-accent/20 rounded-sm border-l-2 border-accent text-xs">
                    <div className="flex items-center mb-1 text-muted-foreground">
                      <CornerDownRight className="h-3 w-3 mr-1" />
                      <span className="font-bold uppercase">{msg.replyTo.sender.username}</span>
                      <span className="ml-1 text-[10px]">{msg.replyTo.timestamp}</span>
                    </div>
                    <span className="truncate pl-4">{msg.replyTo.content.substring(0, 50)}{msg.replyTo.content.length > 50 ? '...' : ''}</span>
                  </div>
                )}
                
                {/* Forwarded message indicator */}
                {'forwardedMessage' in msg && msg.forwardedMessage && (
                  <div className="flex flex-col mb-2 p-2 bg-accent/10 rounded-sm border border-accent text-xs">
                    <div className="flex items-center mb-1 text-muted-foreground">
                      <Forward className="h-3 w-3 mr-1" />
                      <span className="font-bold uppercase">FORWARDED FROM {msg.forwardedMessage.sender.username}</span>
                      <span className="ml-1 text-[10px]">{msg.forwardedMessage.timestamp}</span>
                    </div>
                    <p className="pl-4 mb-2">{msg.forwardedMessage.content}</p>
                    
                    {/* Forwarded audio */}
                    {'audioUrl' in msg.forwardedMessage && msg.forwardedMessage.audioUrl && (
                      <div className="mt-1 ml-4">
                        <div className="flex flex-col">
                          <audio controls className="w-full h-8">
                            <source src={msg.forwardedMessage.audioUrl} type="audio/webm" />
                            Your browser does not support audio playback.
                          </audio>
                          <a 
                            href={msg.forwardedMessage.audioUrl} 
                            download={`Voice_Recording_forwarded.webm`}
                            className="text-xs text-primary underline mt-1 hover:text-primary/80"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Download Voice Recording
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {/* Forwarded attachments */}
                    {'attachments' in msg.forwardedMessage && msg.forwardedMessage.attachments && msg.forwardedMessage.attachments.length > 0 && (
                      <div className="mt-1 ml-4 grid grid-cols-2 gap-2">
                        {msg.forwardedMessage.attachments.map((attachment: any) => (
                          <a 
                            key={attachment.id} 
                            href={attachment.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            download={attachment.name}
                            className="flex items-center p-2 border border-accent rounded-sm bg-background/30 hover:bg-background/50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="mr-2 text-xl">{attachment.icon}</div>
                            <div className="overflow-hidden">
                              <div className="text-xs font-medium truncate">{attachment.name}</div>
                              <div className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-sm">{msg.content}</p>
                
                {/* Audio player for voice messages */}
                {'audioUrl' in msg && msg.audioUrl && (
                  <div className="mt-2">
                    <div className="flex flex-col">
                      <audio controls className="w-full h-8 mt-1">
                        <source src={msg.audioUrl} type="audio/webm" />
                        Your browser does not support audio playback.
                      </audio>
                      
                      <a 
                        href={msg.audioUrl} 
                        download={`Voice_Recording_${msg.id}.webm`}
                        className="text-xs text-primary underline mt-1 hover:text-primary/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Download Voice Recording
                      </a>
                    </div>
                  </div>
                )}
                
                {/* File attachments */}
                {'attachments' in msg && msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {msg.attachments.map((attachment: any) => (
                      <a 
                        key={attachment.id} 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        download={attachment.name}
                        className="flex items-center p-2 border border-accent rounded-sm bg-background/30 hover:bg-background/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="mr-2 text-xl">{attachment.icon}</div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-medium truncate">{attachment.name}</div>
                          <div className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
                
                {/* Message actions */}
                <div className="absolute -top-3 -right-1 hidden group-hover:flex bg-background border border-accent rounded-sm shadow-md">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); handleReply(msg); }}
                  >
                    <Reply className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); handleForward(msg); }}
                  >
                    <Forward className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className={`flex items-center text-xs text-muted-foreground mt-1 ${
                msg.sender.id === user?.id ? 'justify-end' : 'justify-start'
              }`}>
                <span>{msg.timestamp}</span>
              </div>
            </div>
          </div>
          )}
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="absolute bottom-16 left-0 right-0 bg-background border-t border-accent p-2">
        {isRecording && (
          <div className="flex items-center justify-between bg-muted py-2 px-3 mb-2 rounded-sm border border-accent">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse mr-2"></div>
              <span className="text-sm font-medium">RECORDING</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm font-mono mr-3">{formatTime(recordingTime)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={handleVoiceRecording}
              >
                <StopCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      
        <div className="flex items-center space-x-2">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/x-zip-compressed"
            multiple
          />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:bg-accent/20"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon className="h-5 w-5" />
          </Button>
          
          <Input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a secure message..."
            className="flex-1 bg-muted border-accent"
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            disabled={isRecording}
          />
          
          {message.trim() ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary hover:bg-accent/20"
              onClick={handleSendMessage}
            >
              <SendIcon className="h-5 w-5" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className={`${isRecording ? 'text-destructive' : 'text-muted-foreground'} hover:bg-accent/20`}
              onClick={handleVoiceRecording}
            >
              {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          )}
        </div>
        
        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <div key={index} className="relative w-28 h-28 bg-muted rounded-sm border border-accent overflow-hidden">
                  {attachment.type.startsWith('image/') ? (
                    // Image preview
                    <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
                  ) : (
                    // File type preview
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      <div className="text-3xl">{getFileIcon(attachment.type)}</div>
                      <div className="text-xs mt-1 text-center truncate w-full">{attachment.name}</div>
                      <div className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0 bg-background/50 hover:bg-background/70 p-0 h-6 w-6"
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                  >
                    <span className="text-xs">×</span>
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Send button for attachments */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSendMessage}
                className="military-button text-sm"
              >
                SEND ATTACHMENTS
              </Button>
            </div>
          </div>
        )}

        {/* Reply form */}
        {showReplyForm && replyingToMessage && (
          <div className="flex flex-col mt-2 mb-2 p-2 bg-accent/20 rounded-sm border-l-2 border-accent">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <div className="flex items-center text-xs text-muted-foreground">
                  <CornerDownRight className="h-3 w-3 mr-1" />
                  <span className="font-bold uppercase">{replyingToMessage.sender.username}</span>
                  <span className="ml-1 text-[10px]">{replyingToMessage.timestamp}</span>
                </div>
                <span className="text-xs pl-4 truncate">{replyingToMessage.content.substring(0, 60)}{replyingToMessage.content.length > 60 ? '...' : ''}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 -mt-1 -mr-1"
                onClick={handleCancelReply}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Forward Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent className="bg-background border-accent">
          <DialogHeader>
            <DialogTitle className="text-center uppercase tracking-wider font-bold">FORWARD TRANSMISSION</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              <div className="text-xs uppercase font-bold mb-2">TACTICAL CHANNELS</div>
              {/* Mock channels */}
              {[
                { id: 101, name: "ALPHA SQUAD", isRoom: true },
                { id: 102, name: "SUPPORT TEAM", isRoom: true },
                { id: 103, name: "COMMAND CENTER", isRoom: true }
              ].map(channel => (
                <div 
                  key={channel.id}
                  className="flex items-center p-2 border border-accent rounded-sm hover:bg-accent/10 cursor-pointer"
                  onClick={() => handleSendForward(channel.id, true)}
                >
                  <div className="w-8 h-8 rounded-sm bg-secondary text-secondary-foreground flex items-center justify-center mr-3 border border-accent">
                    <span className="text-xs font-bold">#{channel.id}</span>
                  </div>
                  <span className="font-medium">{channel.name}</span>
                </div>
              ))}
              
              <div className="text-xs uppercase font-bold mb-2 mt-4">OPERATORS</div>
              {/* Available users based on chat type */}
              {[
                { id: 2, name: "BRAVO2", isRoom: false },
                { id: 3, name: "CHARLIE3", isRoom: false },
                { id: 4, name: "DELTA4", isRoom: false }
              ]
              .filter(person => !isRoom || person.id !== Number(chatId)) // Filter out current user in direct chats
              .map(person => (
                <div 
                  key={person.id}
                  className="flex items-center p-2 border border-accent rounded-sm hover:bg-accent/10 cursor-pointer"
                  onClick={() => handleSendForward(person.id, false)}
                >
                  <div className="w-8 h-8 rounded-sm bg-secondary text-secondary-foreground flex items-center justify-center mr-3 border border-accent">
                    <span className="text-xs font-bold">{person.name.substring(0, 2)}</span>
                  </div>
                  <span className="font-medium">{person.name}</span>
                </div>
              ))}
            </div>
            
            <Button 
              className="w-full mt-4 military-button"
              variant="outline"
              onClick={() => setShowForwardDialog(false)}
            >
              CANCEL
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="bg-background border-accent">
          <DialogHeader>
            <DialogTitle className="text-center uppercase tracking-wider font-bold">CHANNEL MEMBERS</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold">TOTAL: {getRoomData().members?.length || 0} OPERATORS</h3>
              {getRoomData().members?.length > 10 && (
                <Input 
                  type="text" 
                  placeholder="Search members..." 
                  className="max-w-[200px]"
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    // Client-side search in the member list
                    const memberElements = document.querySelectorAll('.member-item');
                    memberElements.forEach(el => {
                      const username = el.getAttribute('data-username')?.toLowerCase() || '';
                      if (username.includes(searchTerm)) {
                        (el as HTMLElement).style.display = 'flex';
                      } else {
                        (el as HTMLElement).style.display = 'none';
                      }
                    });
                  }}
                />
              )}
            </div>
            
            <div className="border border-accent rounded-sm max-h-60 overflow-y-auto custom-scrollbar">
              {getRoomData().members?.map((member: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center p-2 border-b last:border-b-0 border-accent/30 member-item"
                  data-username={member.username}
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-sm border border-accent mr-3">
                    <span className="font-bold text-xs">{member.username?.substring(0, 2)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{member.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.random() > 0.3 ? "ONLINE" : "OFFLINE"} • ID: {member.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              className="w-full mt-4 military-button"
              variant="outline"
              onClick={() => setShowMembersDialog(false)}
            >
              CLOSE
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
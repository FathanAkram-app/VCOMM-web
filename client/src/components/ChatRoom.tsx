import { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';

interface ChatRoomProps {
  chatId: number;
  isRoom: boolean;
  chatName: string;
  onBack: () => void;
  onNavigateToChat?: (targetId: number, isTargetRoom: boolean, forwardedMsg?: any) => void;
  forwardedMessage?: any;
}

interface Message {
  id: number;
  senderId: number;
  content: string;
  timestamp: string;
  attachments?: {
    url: string;
    name: string;
    type: string;
  }[];
  replyToId?: number;
  replyToContent?: string;
}

interface MessageWithSender extends Message {
  sender: {
    id: number;
    callsign: string;
    rank?: string;
    profileImageUrl?: string;
  };
}

export default function ChatRoom({ 
  chatId, 
  isRoom, 
  chatName, 
  onBack, 
  onNavigateToChat,
  forwardedMessage
}: ChatRoomProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentUser, setCurrentUser] = useState<{id: number, callsign: string} | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Ambil informasi user
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  useEffect(() => {
    // Ambil pesan ketika chat dibuka
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const endpoint = isRoom ? `/api/rooms/${chatId}/messages` : `/api/chats/${chatId}/messages`;
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
        // Tunggu sampai render selesai, lalu scroll ke bawah
        setTimeout(() => scrollToBottom(), 100);
      }
    };
    
    fetchMessages();
    
    // Jika ada pesan yang diteruskan, isi input message
    if (forwardedMessage) {
      setInputMessage('[Diteruskan] ' + forwardedMessage.content);
    }
    
    // Clean up
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [chatId, isRoom, forwardedMessage]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim() && attachments.length === 0) return;
    
    try {
      // Jika ada attachment, kirim dengan FormData
      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('content', inputMessage);
        
        if (replyTo) {
          formData.append('replyToId', replyTo.id.toString());
        }
        
        attachments.forEach(file => {
          formData.append('attachments', file);
        });
        
        const endpoint = isRoom ? `/api/rooms/${chatId}/messages` : `/api/chats/${chatId}/messages`;
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const newMessage = await response.json();
          setMessages(prev => [...prev, newMessage]);
          setInputMessage('');
          setAttachments([]);
          setReplyTo(null);
          scrollToBottom();
        }
      } else {
        // Kirim pesan teks biasa
        const endpoint = isRoom ? `/api/rooms/${chatId}/messages` : `/api/chats/${chatId}/messages`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: inputMessage,
            replyToId: replyTo?.id
          })
        });
        
        if (response.ok) {
          const newMessage = await response.json();
          setMessages(prev => [...prev, newMessage]);
          setInputMessage('');
          setReplyTo(null);
          scrollToBottom();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
      
      // Reset input value agar event change terpicu lagi untuk file yang sama
      e.target.value = '';
    }
  };
  
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleReply = (message: MessageWithSender) => {
    setReplyTo(message);
  };
  
  const cancelReply = () => {
    setReplyTo(null);
  };
  
  const handleMessageDelete = async (messageId: number) => {
    try {
      const endpoint = isRoom ? `/api/rooms/${chatId}/messages/${messageId}` : `/api/chats/${chatId}/messages/${messageId}`;
      const response = await fetch(endpoint, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };
  
  const handleForwardMessage = (message: MessageWithSender) => {
    // Buka dialog untuk memilih chat tujuan
    // Implementasi di versi selanjutnya
  };
  
  const handleVoiceRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mpeg' });
          
          // Berikan nama file yang unik dengan timestamp
          const timestamp = new Date().getTime();
          const file = new File([audioBlob], `voice_note_${timestamp}.mp3`, { type: 'audio/mpeg' });
          
          // Auto send audio message
          const formData = new FormData();
          formData.append('content', '🎤 Voice Message');
          formData.append('attachments', file);
          
          const endpoint = isRoom ? `/api/rooms/${chatId}/messages` : `/api/chats/${chatId}/messages`;
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              body: formData
            });
            
            if (response.ok) {
              const newMessage = await response.json();
              setMessages(prev => [...prev, newMessage]);
              scrollToBottom();
            }
          } catch (error) {
            console.error('Error sending voice message:', error);
          }
          
          // Stop tracks
          stream.getTracks().forEach(track => track.stop());
          setRecordingTime(0);
        };
        
        mediaRecorder.start();
        setIsRecording(true);
        
        // Update timer
        let seconds = 0;
        recordingTimerRef.current = setInterval(() => {
          seconds++;
          setRecordingTime(seconds);
        }, 1000);
      } catch (error) {
        console.error('Error starting voice recording:', error);
      }
    }
  };
  
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat header */}
      <div className="chat-header">
        <div className="flex items-center">
          <button 
            onClick={onBack} 
            className="mr-2 p-1 rounded-full hover:bg-[#5c6249] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#5c6249] rounded-full flex items-center justify-center mr-2">
              {isRoom ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ) : (
                chatName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="font-medium">{chatName}</h3>
              <div className="text-xs text-gray-300">
                {isRoom ? 'Tactical Group' : 'Direct Message'}
              </div>
            </div>
          </div>
        </div>
        <div className="flex">
          <button 
            className="p-2 rounded-full hover:bg-[#5c6249] transition-colors"
            onClick={() => alert('Audio call feature coming soon')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button 
            className="p-2 rounded-full hover:bg-[#5c6249] transition-colors"
            onClick={() => alert('Video call feature coming soon')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#28292a] space-y-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-[#8d9c6b] animate-pulse">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-[#3f4433] rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#9eb36b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-[#9eb36b] font-bold uppercase mb-2">SECURE LINE ESTABLISHED</h3>
            <p className="text-gray-400 text-sm max-w-xs">This is the beginning of your secure conversation. All messages are encrypted.</p>
          </div>
        ) : (
          messages.map(message => (
            <ChatMessage
              key={message.id}
              message={message}
              isMine={message.senderId === currentUser?.id}
              onDelete={() => handleMessageDelete(message.id)}
              onReply={() => handleReply(message)}
              onForward={() => handleForwardMessage(message)}
            />
          ))
        )}
        
        {/* Invisible div for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Reply preview */}
      {replyTo && (
        <div className="bg-[#3f4433] p-2 mx-2 rounded-t-md flex justify-between items-start">
          <div className="flex-1 overflow-hidden">
            <div className="text-xs text-[#9eb36b] font-medium mb-1">
              Replying to {replyTo.sender?.callsign || 'User'}
            </div>
            <div className="text-sm text-white truncate">{replyTo.content}</div>
          </div>
          <button 
            onClick={cancelReply}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div className="bg-[#3f4433] p-2 mx-2 flex-wrap flex gap-2">
          {attachments.map((file, index) => (
            <div 
              key={index} 
              className="bg-[#5c6249] rounded p-1 text-xs flex items-center"
            >
              <span className="truncate max-w-[120px]">{file.name}</span>
              <button 
                onClick={() => removeAttachment(index)}
                className="ml-1 text-white hover:text-red-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Input area */}
      <div className="chat-footer">
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-[#3f4433] rounded-lg p-3">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
              <span className="text-white">Recording... {formatRecordingTime(recordingTime)}</span>
            </div>
            <button 
              onClick={handleVoiceRecording}
              className="bg-[#5c6249] text-white rounded-full p-2 hover:bg-[#4a4e3a]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <button 
              onClick={handleAttachmentClick}
              className="p-2 text-white hover:bg-[#3f4433] rounded-full mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              multiple 
            />
            <textarea 
              className="message-input resize-none focus:outline-none"
              placeholder="Type a secure message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={1}
            />
            {inputMessage.trim() || attachments.length > 0 ? (
              <button 
                onClick={handleSendMessage}
                className="p-2 text-white hover:bg-[#3f4433] rounded-full ml-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            ) : (
              <button 
                onClick={handleVoiceRecording}
                className="p-2 text-white hover:bg-[#3f4433] rounded-full ml-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
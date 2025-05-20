import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ArrowLeft, SendIcon } from "lucide-react";
import { useAuth } from "../hooks/use-auth";

interface SimpleChatRoomProps {
  chatId: number;
  isRoom: boolean;
  chatName: string;
  onBack: () => void;
}

export default function SimpleChatRoom({ chatId, isRoom, chatName, onBack }: SimpleChatRoomProps) {
  console.log("SimpleChatRoom rendered with:", { chatId, isRoom, chatName });
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<any[]>([]);
  
  // Get messages from localStorage
  useEffect(() => {
    try {
      console.log("Loading messages for:", { chatId, isRoom });
      
      if (isRoom) {
        const roomMessages = JSON.parse(localStorage.getItem('roomMockMessages') || '{}');
        console.log("Room messages from localStorage:", roomMessages);
        console.log("Messages for this room:", roomMessages[chatId]);
        setMessages(roomMessages[chatId] || []);
      } else {
        const directMessages = JSON.parse(localStorage.getItem('directMockMessages') || '{}');
        console.log("Direct messages from localStorage:", directMessages);
        console.log("Messages for this direct chat:", directMessages[chatId]);
        setMessages(directMessages[chatId] || []);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    }
  }, [chatId, isRoom]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    try {
      const newMessage = {
        id: Date.now(),
        text: message,
        sender: user?.username || "USER",
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        isRead: true
      };
      
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      
      // Save to localStorage
      if (isRoom) {
        const roomMessages = JSON.parse(localStorage.getItem('roomMockMessages') || '{}');
        roomMessages[chatId] = updatedMessages;
        localStorage.setItem('roomMockMessages', JSON.stringify(roomMessages));
      } else {
        const directMessages = JSON.parse(localStorage.getItem('directMockMessages') || '{}');
        directMessages[chatId] = updatedMessages;
        localStorage.setItem('directMockMessages', JSON.stringify(directMessages));
      }
      
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-[#1f201c]">
      {/* Header */}
      <div className="p-3 py-4 border-b border-accent/50 bg-[#566c57] flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-bold uppercase text-white tracking-wide">{chatName}</h2>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {console.log("Rendering messages:", messages)}
        {messages && messages.length > 0 ? (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === user?.username ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[75%] p-3 rounded-lg ${
                  msg.sender === user?.username 
                    ? 'bg-[#566c57] text-white rounded-tr-none' 
                    : 'bg-[#3d3f35] text-[#e0e0e0] rounded-tl-none'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs">{msg.sender}</span>
                  <span className="text-xs opacity-70">{msg.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#bdc1c0] text-center">No messages yet. Send the first message!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="border-t border-accent/30 p-3 bg-[#2a2b25]">
        <div className="flex items-center">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message"
            className="flex-1 bg-[#1f201c] border-accent/50 text-white"
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon" 
            className="ml-2 bg-[#566c57] hover:bg-[#668568] border-none"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
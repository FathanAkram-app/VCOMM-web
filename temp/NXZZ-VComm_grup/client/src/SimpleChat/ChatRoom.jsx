import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback } from '../components/ui/avatar';

export default function ChatRoom({ chat, onBack, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // Load messages on mount and every 2 seconds
  useEffect(() => {
    if (!chat || !currentUser) return;
    
    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    
    return () => clearInterval(interval);
  }, [chat, currentUser]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Load messages for active chat
  const loadMessages = () => {
    try {
      const messagesStr = localStorage.getItem('mcomm_messages');
      if (!messagesStr) return;
      
      const allMessages = JSON.parse(messagesStr);
      
      // Filter messages for this chat
      const chatMessages = allMessages.filter(msg => msg.chatId === chat.id);
      
      // Sort by timestamp
      chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      setMessages(chatMessages);
      
      // Mark as read
      markMessagesAsRead();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  // Mark messages as read
  const markMessagesAsRead = () => {
    try {
      const messagesStr = localStorage.getItem('mcomm_messages');
      if (!messagesStr) return;
      
      const allMessages = JSON.parse(messagesStr);
      let updated = false;
      
      // Mark messages from others as read
      const updatedMessages = allMessages.map(msg => {
        if (msg.chatId === chat.id && msg.senderId !== currentUser.id && !msg.isRead) {
          updated = true;
          return { ...msg, isRead: true };
        }
        return msg;
      });
      
      // Save if updated
      if (updated) {
        localStorage.setItem('mcomm_messages', JSON.stringify(updatedMessages));
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  // Send a new message
  const sendMessage = () => {
    if (!newMessage.trim() || !chat || !currentUser) return;
    
    try {
      const messagesStr = localStorage.getItem('mcomm_messages');
      const allMessages = messagesStr ? JSON.parse(messagesStr) : [];
      
      // Create new message
      const newMsg = {
        id: Date.now(),
        chatId: chat.id,
        senderId: currentUser.id,
        sender: currentUser.username,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        isRead: false
      };
      
      // Add to messages
      allMessages.push(newMsg);
      localStorage.setItem('mcomm_messages', JSON.stringify(allMessages));
      
      // Clear input
      setNewMessage('');
      
      // Update UI
      loadMessages();
      
      // Create auto-reply for demo
      if (chat.type === 'direct' && chat.otherUserId) {
        setTimeout(() => {
          createAutoResponse(chat.otherUserId);
        }, Math.random() * 2000 + 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Auto-response for demo
  const createAutoResponse = (responderId) => {
    try {
      // Get responder info
      const usersStr = localStorage.getItem('mcomm_users');
      if (!usersStr) return;
      
      const users = JSON.parse(usersStr);
      const responder = users.find(u => u.id === responderId);
      if (!responder) return;
      
      // Response options
      const responses = [
        'Siap, laksanakan!',
        'Perintah diterima.',
        'Roger that.',
        'Akan segera dilaksanakan.',
        'Copy that, standing by.',
        'Mengerti, Pak.',
        'Affirmative.',
        'Sedang diproses saat ini.'
      ];
      
      // Create response message
      const messagesStr = localStorage.getItem('mcomm_messages');
      const allMessages = messagesStr ? JSON.parse(messagesStr) : [];
      
      const responseMsg = {
        id: Date.now(),
        chatId: chat.id,
        senderId: responderId,
        sender: responder.username,
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString(),
        isRead: true // Already read since we're in the chat
      };
      
      // Add to messages
      allMessages.push(responseMsg);
      localStorage.setItem('mcomm_messages', JSON.stringify(allMessages));
      
      // Update UI
      loadMessages();
    } catch (error) {
      console.error('Error creating auto response:', error);
    }
  };
  
  // Format time for display
  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-[#1f201c]">
      {/* Header */}
      <div className="bg-[#2a2b25] px-4 py-3 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 text-[#bdc1c0] hover:text-white hover:bg-[#3d3f35]"
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </Button>
        
        <Avatar className={`h-10 w-10 mr-3 ${chat.type === 'group' ? 'bg-[#566c57]' : 'bg-[#3d5a65]'}`}>
          <AvatarFallback className="text-white">
            {chat.displayName ? chat.displayName.substring(0, 2).toUpperCase() : 'CH'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h2 className="text-[#e0e0e0] font-medium">{chat.displayName || 'Chat'}</h2>
          <p className="text-xs text-[#bdc1c0]">
            {chat.type === 'group' ? 'Group Chat' : 'Online'}
          </p>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-[#242520] to-[#1f201c]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#969692]">No messages yet</p>
          </div>
        ) : (
          messages.map(msg => {
            const isSystem = msg.senderId === 0;
            const isMe = msg.senderId === currentUser?.id;
            
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-[#2c2d27] text-[#969692] rounded-lg px-3 py-1 text-xs">
                    {msg.content}
                  </div>
                </div>
              );
            }
            
            return (
              <div 
                key={msg.id} 
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] rounded-lg px-3 py-2 
                    ${isMe 
                      ? 'bg-[#354c36] text-white rounded-tr-none' 
                      : 'bg-[#2c2d27] text-[#e0e0e0] rounded-tl-none'}
                  `}
                >
                  {/* Show sender name for group chats */}
                  {!isMe && chat.type === 'group' && (
                    <div className="text-xs font-medium text-[#8b9c8c] mb-1">
                      {msg.sender}
                    </div>
                  )}
                  
                  <div className="text-sm break-words">{msg.content}</div>
                  <div className="flex justify-end items-center mt-1">
                    <span className="text-xs opacity-70">
                      {formatTime(msg.timestamp)}
                    </span>
                    {isMe && (
                      <span className="text-xs ml-1">
                        {msg.isRead ? <span className="text-blue-400">✓✓</span> : <span className="opacity-70">✓</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="p-3 bg-[#2a2b25] flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Type a message..."
          className="flex-1 bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0]"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-[#969692]"
          onClick={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Send size={20} />
        </Button>
      </div>
      
      {/* Bottom navigation */}
      <div className="h-16 bg-[#2a2b25] border-t border-[#3d3f35] flex justify-around items-center">
        <div className="flex flex-col items-center text-white bg-[#354c36] px-4 py-2 rounded-md">
          <Send className="h-5 w-5" />
          <span className="text-xs mt-1">COMMS</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <Send className="h-5 w-5" />
          <span className="text-xs mt-1">CALL</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <Send className="h-5 w-5" />
          <span className="text-xs mt-1">PERSONNEL</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <Users className="h-5 w-5" />
          <span className="text-xs mt-1">CONFIG</span>
        </div>
      </div>
    </div>
  );
}
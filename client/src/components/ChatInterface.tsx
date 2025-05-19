import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@shared/schema';
import { PaperclipIcon, Smile, Send, Phone, Video, Info } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatInterface() {
  const { 
    currentConversation, 
    messages, 
    isLoadingMessages, 
    sendMessage, 
    users,
    typingUsers,
    sendTypingIndicator,
    userPresence
  } = useChat();
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      sendTypingIndicator(true);
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTypingIndicator(false);
      }, 3000);
    } else {
      sendTypingIndicator(false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, sendTypingIndicator]);

  // Get the other user in a direct message
  const getOtherUser = (): User | undefined => {
    if (!currentConversation || currentConversation.isGroup || !user) return undefined;
    
    // For DMs, try to find the other user based on conversation name
    // This is a simplification - in a real app, you'd have proper conversation members
    return users.find(u => u.id !== user.id);
  };

  const otherUser = getOtherUser();

  // Format timestamp
  const formatMessageTime = (date: Date | string) => {
    return format(new Date(date), 'h:mm a');
  };

  // Handle message input change
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    
    if (e.target.value.trim() && !isTyping) {
      setIsTyping(true);
    } else if (!e.target.value.trim() && isTyping) {
      setIsTyping(false);
    }
    
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Handle message submission
  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentConversation) return;
    
    sendMessage(messageInput);
    setMessageInput('');
    setIsTyping(false);
    
    // Reset textarea height
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.style.height = 'auto';
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get typing users in current conversation
  const getTypingUsers = () => {
    return Array.from(typingUsers.entries())
      .filter(([userId]) => userId !== user?.id)
      .map(([userId]) => {
        return users.find(u => u.id === userId);
      })
      .filter(Boolean) as User[];
  };

  const typingUsersList = getTypingUsers();

  // Render user status indicator
  const renderUserStatus = (status: string) => {
    let statusText = 'Offline';
    let statusColor = 'bg-gray-300';
    
    if (status === 'online') {
      statusText = 'Online';
      statusColor = 'bg-green-500';
    } else if (status === 'away') {
      statusText = 'Away';
      statusColor = 'bg-yellow-400';
    } else if (status === 'busy') {
      statusText = 'Do Not Disturb';
      statusColor = 'bg-red-500';
    }
    
    return (
      <div className="flex items-center">
        <div className={`w-2 h-2 rounded-full ${statusColor} mr-1.5`}></div>
        <p className="text-xs text-gray-500">{statusText}</p>
      </div>
    );
  };

  if (!currentConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Select a conversation</h2>
        <p className="text-gray-500 text-center max-w-md">
          Choose an existing conversation from the sidebar or start a new one to begin messaging.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex-1">
          <div className="flex items-center">
            <div className="relative mr-3">
              {otherUser?.profileImageUrl ? (
                <img
                  src={otherUser.profileImageUrl}
                  alt={otherUser.username}
                  className="rounded-full w-9 h-9 object-cover"
                />
              ) : currentConversation.isGroup ? (
                <div className="w-9 h-9 rounded-md bg-primary-100 flex items-center justify-center text-primary-600">
                  <Users className="h-5 w-5" />
                </div>
              ) : (
                <div className="rounded-full w-9 h-9 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 font-medium">{otherUser?.username?.charAt(0) || '?'}</span>
                </div>
              )}
              
              {otherUser && userPresence.has(otherUser.id) && (
                <div className={`absolute bottom-0 right-0 w-3 h-3 ${
                  userPresence.get(otherUser.id) === 'online' ? 'bg-green-500' : 
                  userPresence.get(otherUser.id) === 'away' ? 'bg-yellow-400' : 
                  'bg-gray-300'
                } rounded-full border-2 border-white`}></div>
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold">{currentConversation.name || otherUser?.username || 'Conversation'}</h2>
              <div>
                {otherUser && userPresence.has(otherUser.id) ? (
                  renderUserStatus(userPresence.get(otherUser.id) || 'offline')
                ) : (
                  <p className="text-xs text-gray-500">
                    {currentConversation.isGroup ? 'Group chat' : 'Conversation'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
            <Info className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-full">
            {isLoadingMessages ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center py-10">
                <p className="text-gray-500">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <>
                {/* Date Separator */}
                <div className="flex items-center justify-center">
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                    Today
                  </div>
                </div>
                
                {/* Messages */}
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isSelf = message.senderId === user?.id;
                    const sender = users.find(u => u.id === message.senderId);
                    
                    if (isSelf) {
                      return (
                        <div key={message.id} className="flex items-start justify-end space-x-2">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center justify-end space-x-1 mb-1">
                              <span className="text-xs text-gray-500">{formatMessageTime(message.createdAt)}</span>
                              <span className="text-sm font-medium text-gray-900">You</span>
                            </div>
                            <div 
                              className="bg-primary text-white shadow-sm rounded-tl-lg rounded-tr-lg rounded-bl-lg p-3 text-sm"
                              style={{ maxWidth: '80%', wordBreak: 'break-word' }}
                            >
                              <p>{message.content}</p>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={message.id} className="flex items-start space-x-2 max-w-[85%]">
                          {sender?.profileImageUrl ? (
                            <img 
                              src={sender.profileImageUrl} 
                              alt={sender.username} 
                              className="rounded-full w-8 h-8 mt-1 object-cover"
                            />
                          ) : (
                            <div className="rounded-full w-8 h-8 mt-1 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 font-medium">{sender?.username?.charAt(0) || '?'}</span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center space-x-1 mb-1">
                              <span className="text-sm font-medium text-gray-900">{sender?.username || 'User'}</span>
                              <span className="text-xs text-gray-500">{formatMessageTime(message.createdAt)}</span>
                            </div>
                            <div 
                              className="bg-white shadow-sm rounded-tr-lg rounded-br-lg rounded-bl-lg p-3 text-sm"
                              style={{ maxWidth: '100%', wordBreak: 'break-word' }}
                            >
                              <p>{message.content}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
                  
                  {/* Typing Indicator */}
                  {typingUsersList.length > 0 && (
                    <div className="flex items-start space-x-2 max-w-[85%]">
                      {typingUsersList[0]?.profileImageUrl ? (
                        <img 
                          src={typingUsersList[0].profileImageUrl} 
                          alt={typingUsersList[0].username} 
                          className="rounded-full w-8 h-8 mt-1 object-cover"
                        />
                      ) : (
                        <div className="rounded-full w-8 h-8 mt-1 bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-medium">{typingUsersList[0]?.username?.charAt(0) || '?'}</span>
                        </div>
                      )}
                      <div className="bg-white shadow-sm rounded-tr-lg rounded-br-lg rounded-bl-lg py-3 px-4 text-sm">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Message Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-end space-x-2">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <PaperclipIcon className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <Textarea
              placeholder="Type a message..."
              className="min-h-10 max-h-32 w-full border border-gray-300 rounded-2xl pl-4 pr-12 py-3 resize-none"
              value={messageInput}
              onChange={handleMessageInputChange}
              onKeyDown={handleKeyPress}
              rows={1}
            />
            <div className="absolute right-3 bottom-3">
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 h-6 w-6">
                <Smile className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            className="bg-primary text-white p-3 rounded-full hover:bg-primary/90 transition-colors"
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

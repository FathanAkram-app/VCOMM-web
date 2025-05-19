import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import { Conversation, Message, User, InsertConversation, ConversationMember } from '@shared/schema';

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation | null) => void;
  messages: Message[];
  isLoadingMessages: boolean;
  users: User[];
  sendMessage: (content: string) => Promise<void>;
  createConversation: (data: {
    name: string;
    description?: string;
    isGroup: boolean;
    members: string[];
  }) => Promise<Conversation>;
  typingUsers: Map<string, boolean>;
  sendTypingIndicator: (isTyping: boolean) => void;
  userPresence: Map<string, string>;
}

const ChatContext = createContext<ChatContextType | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map());
  const [userPresence, setUserPresence] = useState<Map<string, string>>(new Map());
  
  const { isConnected, sendTypingIndicator: wsSendTypingIndicator, addMessageListener } = useWebSocket();

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: !!user,
  });

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
  });

  // Fetch messages for current conversation
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
  } = useQuery({
    queryKey: ['/api/conversations', currentConversation?.id, 'messages'],
    enabled: !!currentConversation,
  });

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (data: { content: string; conversationId: number }) => {
      const res = await apiRequest('POST', '/api/messages', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', currentConversation?.id, 'messages'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to send message: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: InsertConversation & { members: string[] }) => {
      const res = await apiRequest('POST', '/api/conversations', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create conversation: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Send message handler
  const sendMessage = async (content: string) => {
    if (!currentConversation || !content.trim()) return;
    
    await createMessageMutation.mutateAsync({
      content,
      conversationId: currentConversation.id,
    });
  };

  // Create conversation handler
  const createConversation = async (data: {
    name: string;
    description?: string;
    isGroup: boolean;
    members: string[];
  }): Promise<Conversation> => {
    return await createConversationMutation.mutateAsync(data);
  };

  // Send typing indicator
  const sendTypingIndicator = (isTyping: boolean) => {
    if (!currentConversation) return;
    wsSendTypingIndicator(currentConversation.id, isTyping);
  };

  // WebSocket message listener
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = addMessageListener((data) => {
      switch (data.type) {
        case 'new_message':
          if (currentConversation && data.payload.conversationId === currentConversation.id) {
            queryClient.invalidateQueries({ queryKey: ['/api/conversations', currentConversation.id, 'messages'] });
          }
          break;
        
        case 'typing':
          if (data.payload.userId !== user?.id) {
            setTypingUsers((prev) => {
              const newMap = new Map(prev);
              if (data.payload.isTyping) {
                newMap.set(data.payload.userId, true);
              } else {
                newMap.delete(data.payload.userId);
              }
              return newMap;
            });
          }
          break;
        
        case 'user_status':
          setUserPresence((prev) => {
            const newMap = new Map(prev);
            newMap.set(data.payload.userId, data.payload.status);
            return newMap;
          });
          break;
          
        default:
          break;
      }
    });

    return unsubscribe;
  }, [isConnected, addMessageListener, currentConversation, queryClient, user?.id]);

  // Initialize user presence when users are loaded
  useEffect(() => {
    if (users.length > 0) {
      const newPresenceMap = new Map<string, string>();
      users.forEach((user) => {
        newPresenceMap.set(user.id, user.status || 'offline');
      });
      setUserPresence(newPresenceMap);
    }
  }, [users]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversation,
        setCurrentConversation,
        messages,
        isLoadingMessages,
        users,
        sendMessage,
        createConversation,
        typingUsers,
        sendTypingIndicator,
        userPresence,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

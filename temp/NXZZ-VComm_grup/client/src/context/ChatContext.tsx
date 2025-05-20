import { createContext, useState, useEffect, ReactNode, useContext } from "react";
import { ChatListItem, MessageWithSender, User, RoomWithMembers } from "@shared/schema";
import {
  addEventListener,
  removeEventListener,
  getUserChats,
  getContacts,
  getDirectChat,
  getRoomMessages,
  sendChatMessage,
  getRoomDetails,
  createRoom,
  authenticate,
} from "../lib/websocket";

// Import polling context and functionality
import { PollingContext, usePolling } from "./PollingContext";
import { useToast } from "../hooks/use-toast";
import { sendMessageViaHttp } from "../lib/polling";

interface ChatContextProps {
  user: User | null;
  chats: ChatListItem[];
  activeChat: {
    id: number;
    isRoom: boolean;
    messages: MessageWithSender[];
  } | null;
  otherUser: User | null;
  roomDetails: RoomWithMembers | null;
  contacts: User[];
  onlineUsers: User[];
  isLoading: boolean;
  loadingMessage: string;
  authenticating: boolean;
  loginUser: (username: string, password: string, deviceInfo?: string) => Promise<void>;
  sendMessage: (content: string) => void;
  openChat: (chatId: number, isRoom: boolean) => void;
  clearActiveChat: () => void;
  createNewRoom: (name: string, memberIds?: number[]) => void;
  openDirectChat: (userId: number) => void;
  refreshChats: () => void;
}

export const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [activeChat, setActiveChat] = useState<{
    id: number;
    isRoom: boolean;
    messages: MessageWithSender[];
  } | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [roomDetails, setRoomDetails] = useState<RoomWithMembers | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  // Initialize event listeners
  useEffect(() => {
    // Handle authentication success
    const handleAuthSuccess = (data: any) => {
      setUser(data.user);
      setAuthenticating(false);
      
      // Load initial data
      getUserChats();
      getContacts();
    };

    // Handle errors
    const handleError = (data: any) => {
      toast({
        title: "Error",
        description: data.message,
        variant: "destructive",
      });
      setAuthenticating(false);
    };

    // Handle chats update
    const handleChatsUpdate = (data: any) => {
      setChats(data.chats);
    };

    // Handle contacts update
    const handleContactsUpdate = (data: any) => {
      setContacts(data.contacts);
    };

    // Handle online users update
    const handleOnlineUsersUpdate = (data: any) => {
      setOnlineUsers(data.users);
    };

    // Handle direct chat loaded
    const handleDirectChatLoaded = (data: any) => {
      setActiveChat({
        id: data.chat.id,
        isRoom: false,
        messages: data.messages,
      });
      setOtherUser(data.otherUser);
      setRoomDetails(null);
      setIsLoading(false);
    };

    // Handle room messages loaded
    const handleRoomMessagesLoaded = (data: any) => {
      setActiveChat({
        id: data.roomId,
        isRoom: true,
        messages: data.messages,
      });
      setOtherUser(null);
      setIsLoading(false);
    };

    // Handle new message received
    const handleNewMessageReceived = (data: any) => {
      // Add message to active chat if it's the current one
      if (
        activeChat &&
        ((data.isDirectMessage && !activeChat.isRoom && activeChat.id === data.message.directChatId) ||
          (!data.isDirectMessage && activeChat.isRoom && activeChat.id === data.message.roomId))
      ) {
        setActiveChat(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            messages: [...prev.messages, data.message],
          };
        });
      }
      
      // Refresh the chat list to update unread counts
      getUserChats();
    };

    // Handle message sent confirmation
    const handleMessageSent = (data: any) => {
      // Add the sent message to active chat
      if (activeChat) {
        setActiveChat(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            messages: [...prev.messages, data.message],
          };
        });
      }
    };

    // Handle room details loaded
    const handleRoomDetailsLoaded = (data: any) => {
      setRoomDetails(data.room);
    };

    // Handle room created
    const handleRoomCreated = (data: any) => {
      toast({
        title: "Success",
        description: `Room "${data.room.name}" created successfully.`,
      });
      getUserChats();
    };

    // Handle room updated
    const handleRoomUpdated = (data: any) => {
      if (activeChat && activeChat.isRoom && activeChat.id === data.room.id) {
        setRoomDetails(data.room);
      }
      getUserChats();
    };

    // Register event handlers
    addEventListener("auth_success", handleAuthSuccess);
    addEventListener("error", handleError);
    addEventListener("chats_updated", handleChatsUpdate);
    addEventListener("contacts_updated", handleContactsUpdate);
    addEventListener("online_users_updated", handleOnlineUsersUpdate);
    addEventListener("direct_chat_loaded", handleDirectChatLoaded);
    addEventListener("room_messages_loaded", handleRoomMessagesLoaded);
    addEventListener("new_message_received", handleNewMessageReceived);
    addEventListener("message_sent", handleMessageSent);
    addEventListener("room_details_loaded", handleRoomDetailsLoaded);
    addEventListener("room_created", handleRoomCreated);
    addEventListener("room_updated", handleRoomUpdated);

      // Load initial data if we have a user
    if (user) {
      getUserChats();
      getContacts();
    }

    // Cleanup event listeners
    return () => {
      removeEventListener("auth_success", handleAuthSuccess);
      removeEventListener("error", handleError);
      removeEventListener("chats_updated", handleChatsUpdate);
      removeEventListener("contacts_updated", handleContactsUpdate);
      removeEventListener("online_users_updated", handleOnlineUsersUpdate);
      removeEventListener("direct_chat_loaded", handleDirectChatLoaded);
      removeEventListener("room_messages_loaded", handleRoomMessagesLoaded);
      removeEventListener("new_message_received", handleNewMessageReceived);
      removeEventListener("message_sent", handleMessageSent);
      removeEventListener("room_details_loaded", handleRoomDetailsLoaded);
      removeEventListener("room_created", handleRoomCreated);
      removeEventListener("room_updated", handleRoomUpdated);
    };
  }, [toast, activeChat, user]);

  // Login function using WebSocket authentication
  const loginUser = async (username: string, password: string, deviceInfo?: string) => {
    setAuthenticating(true);
    try {
      await authenticate(username, password, deviceInfo);
      // Note: setAuthenticating(false) is handled by the auth_success event listener
    } catch (error) {
      setAuthenticating(false);
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : "Invalid credentials. Access denied.",
        variant: "destructive",
      });
    }
  };

  // Use polling context for WebSocket fallback
  const { isPolling } = usePolling();

  // Send message function with WebSocket fallback to HTTP
  const sendMessage = async (content: string) => {
    if (!activeChat) return;
    
    try {
      if (isPolling) {
        // Use HTTP fallback when WebSockets are unavailable
        const message = {
          content,
          senderId: user?.id,
          directChatId: activeChat.isRoom ? undefined : activeChat.id,
          roomId: activeChat.isRoom ? activeChat.id : undefined,
          senderUsername: user?.username,
          timestamp: new Date().toISOString(),
          classificationType: 'routine' // Default classification
        };
        
        // Send via HTTP and handle response
        const response = await sendMessageViaHttp(message);
        
        // Manually update the active chat with the new message
        if (activeChat) {
          setActiveChat(prev => {
            if (!prev) return null;
            
            return {
              ...prev,
              messages: [...prev.messages, response],
            };
          });
        }
        
        toast({
          title: "Message Sent",
          description: "Message sent successfully using HTTP fallback.",
          variant: "default",
        });
      } else {
        // Use WebSocket when available
        if (activeChat.isRoom) {
          sendChatMessage(content, undefined, activeChat.id);
        } else {
          sendChatMessage(content, activeChat.id);
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Message Failed",
        description: "Could not send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Open chat function
  const openChat = (chatId: number, isRoom: boolean) => {
    setIsLoading(true);
    setLoadingMessage(isRoom ? "Loading room..." : "Loading conversation...");
    
    if (isRoom) {
      getRoomMessages(chatId);
      getRoomDetails(chatId);
    } else {
      // For direct chats, we need to find the other user ID
      const chat = chats.find(c => !c.isRoom && c.id === chatId);
      if (chat) {
        const contact = contacts.find(c => c.username === chat.name);
        if (contact) {
          getDirectChat(contact.id);
        }
      }
    }
  };

  // Clear active chat
  const clearActiveChat = () => {
    setActiveChat(null);
    setOtherUser(null);
    setRoomDetails(null);
  };

  // Create new room
  const createNewRoom = (name: string, memberIds?: number[]) => {
    createRoom(name, memberIds);
  };

  // Open direct chat with a user
  const openDirectChat = (userId: number) => {
    setIsLoading(true);
    setLoadingMessage("Loading conversation...");
    getDirectChat(userId);
  };

  // Refresh chats list
  const refreshChats = () => {
    getUserChats();
  };

  return (
    <ChatContext.Provider
      value={{
        user,
        chats,
        activeChat,
        otherUser,
        roomDetails,
        contacts,
        onlineUsers,
        isLoading,
        loadingMessage,
        authenticating,
        loginUser,
        sendMessage,
        openChat,
        clearActiveChat,
        createNewRoom,
        openDirectChat,
        refreshChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// Hook has been moved to useChat.ts

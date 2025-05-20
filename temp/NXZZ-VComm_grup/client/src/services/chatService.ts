// Chat service for API communication
import { toast } from "../hooks/use-toast";

const API_BASE_URL = '';  // Empty base for relative paths

interface CreateRoomRequest {
  name: string;
  memberIds: number[];
}

interface CreateDirectChatRequest {
  userId: number;
}

interface SendMessageRequest {
  content: string;
  chatId: number;
  isRoom: boolean;
  classification?: string;
}

export const chatService = {
  // Create a new room/channel
  async createRoom(roomData: CreateRoomRequest): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create channel');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast({
        title: "Channel creation failed",
        description: error.message || "Could not create channel. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  },
  
  // Create or get a direct chat with another user
  async createDirectChat(data: CreateDirectChatRequest): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/direct-chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create direct communication');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error creating direct chat:', error);
      toast({
        title: "Direct communication failed",
        description: error.message || "Could not establish direct communication. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  },
  
  // Send a message (works for both direct chats and rooms)
  async sendMessage(messageData: SendMessageRequest): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Don't show toast for message failures as it can be disruptive during chat
      throw error;
    }
  },
  
  // Get all user chats (both direct and rooms)
  async getUserChats(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/chats`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch chats');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user chats:', error);
      throw error;
    }
  },
  
  // Get messages for a specific chat
  async getChatMessages(chatId: number, isRoom: boolean): Promise<any> {
    try {
      const endpoint = isRoom 
        ? `/api/rooms/${chatId}/messages` 
        : `/api/direct-chats/${chatId}/messages`;
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch messages');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },
  
  // Mark messages as read
  async markMessagesAsRead(chatId: number, isRoom: boolean): Promise<void> {
    try {
      const endpoint = isRoom 
        ? `/api/rooms/${chatId}/mark-read` 
        : `/api/direct-chats/${chatId}/mark-read`;
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark messages as read');
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // Silent fail - no need to show error to user
    }
  }
};
import { queryClient } from './queryClient';
import { MessageWithSender, User, ChatListItem } from '@shared/schema';

// Cache last poll timestamps to avoid duplicate requests
let lastPollTimestamps = {
  chats: 0,
  messages: {} as Record<string, number>,
  onlineUsers: 0
};

/**
 * Fetches user chats via API and updates query cache
 * @param userId The ID of the current user
 * @returns Array of chat list items
 */
export async function fetchChats(userId: number): Promise<ChatListItem[]> {
  // Don't poll more than once per second for the same resource
  const now = Date.now();
  if (now - lastPollTimestamps.chats < 1000) {
    // Return from cache instead
    return queryClient.getQueryData(['/api/user/chats']) || [];
  }
  
  try {
    // Update timestamp before making request
    lastPollTimestamps.chats = now;
    
    // Fetch the latest chats
    const response = await fetch('/api/user/chats', { credentials: 'include' as RequestCredentials });
    const chats = await response.json() as ChatListItem[];
    
    // Update the query cache
    queryClient.setQueryData(['/api/user/chats'], chats);
    
    return chats;
  } catch (error) {
    console.error('Error polling chats:', error);
    // Return the cached data or empty array
    return queryClient.getQueryData(['/api/user/chats']) || [];
  }
}

/**
 * Fetches messages for a specific chat and updates query cache
 * @param chatId ID of the chat or room
 * @param isRoom Whether this is a room or direct chat
 * @returns Array of messages with sender information
 */
export async function fetchMessages(chatId: number, isRoom: boolean): Promise<MessageWithSender[]> {
  const endpoint = isRoom 
    ? `/api/rooms/${chatId}/messages` 
    : `/api/direct-chats/${chatId}/messages`;
  
  const cacheKey = `${isRoom ? 'room' : 'direct'}_${chatId}`;
  
  // Don't poll more than once per second for the same resource
  const now = Date.now();
  if (now - (lastPollTimestamps.messages[cacheKey] || 0) < 1000) {
    // Return from cache instead
    return queryClient.getQueryData([endpoint]) || [];
  }
  
  try {
    // Update timestamp before making request
    lastPollTimestamps.messages[cacheKey] = now;
    
    // Fetch the latest messages
    const response = await fetch(endpoint, { credentials: 'include' as RequestCredentials });
    const messages = await response.json() as MessageWithSender[];
    
    // Update the query cache
    queryClient.setQueryData([endpoint], messages);
    
    return messages;
  } catch (error) {
    console.error(`Error polling messages for ${cacheKey}:`, error);
    // Return the cached data or empty array
    return queryClient.getQueryData([endpoint]) || [];
  }
}

/**
 * Fetches list of online users and updates query cache
 * @returns Array of online users
 */
export async function fetchOnlineUsers(): Promise<User[]> {
  // Don't poll more than once per 2 seconds for online users
  const now = Date.now();
  if (now - lastPollTimestamps.onlineUsers < 2000) {
    // Return from cache instead
    return queryClient.getQueryData(['/api/users/online']) || [];
  }
  
  try {
    // Update timestamp before making request
    lastPollTimestamps.onlineUsers = now;
    
    // Fetch the latest online users
    const response = await fetch('/api/users/online', { credentials: 'include' as RequestCredentials });
    const users = await response.json() as User[];
    
    // Update the query cache
    queryClient.setQueryData(['/api/users/online'], users);
    
    return users;
  } catch (error) {
    console.error('Error polling online users:', error);
    // Return the cached data or empty array
    return queryClient.getQueryData(['/api/users/online']) || [];
  }
}

/**
 * Sends a message using HTTP instead of WebSocket
 * @param message The message to send
 * @returns The created message
 */
export async function sendMessageViaHttp(message: any): Promise<any> {
  try {
    
    // Make the HTTP request with credentials included
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message),
      credentials: 'include' as RequestCredentials
    }).then(res => res.json());
    
    // Invalidate message cache for the relevant chat
    const endpoint = message.roomId 
      ? `/api/rooms/${message.roomId}/messages`
      : `/api/direct-chats/${message.directChatId}/messages`;
    
    queryClient.invalidateQueries({ queryKey: [endpoint] });
    
    // Also invalidate chats list to update last message
    queryClient.invalidateQueries({ queryKey: ['/api/user/chats'] });
    
    return response;
  } catch (error) {
    console.error('Error sending message via HTTP:', error);
    throw error;
  }
}
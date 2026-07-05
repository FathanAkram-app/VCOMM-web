import { WebSocket } from 'ws';
import { WebSocketMessage } from '@shared/schema';
import { IStorage } from '../../storage';
import { ClientsMap } from './types';

export function createBroadcastFunctions(storage: IStorage, clients: ClientsMap) {
  // Helper to send to all connections of a user
  function sendToUser(userId: number, message: string): number {
    const userClients = clients.get(userId);
    if (!userClients) return 0;

    let sentCount = 0;
    userClients.forEach((client, source) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.log(`[BROADCAST] ⚠️ Failed to send to user ${userId} (${source}):`, error);
        }
      }
    });
    return sentCount;
  }

  async function broadcastToConversation(conversationId: number, message: WebSocketMessage) {
    try {
      const members = await storage.getConversationMembers(conversationId);
      const messageStr = JSON.stringify(message);

      let sentCount = 0;
      for (const member of members) {
        const userClients = clients.get(member.userId);
        if (userClients && userClients.size > 0) {
          const sent = sendToUser(member.userId, messageStr);
          sentCount += sent > 0 ? 1 : 0;
        }
      }

      if (sentCount < members.length) {
        console.log(`[BROADCAST] ${message.type} to conv ${conversationId}: ${sentCount}/${members.length} members reached`);
      }
    } catch (error) {
      console.error('Error broadcasting to conversation:', error);
    }
  }

  async function broadcastGroupUpdate(groupId: number, updateType: string, data: any) {
    try {
      const members = await storage.getConversationMembers(groupId);
      const messageStr = JSON.stringify({
        type: 'group_update',
        payload: {
          groupId,
          updateType,
          data
        }
      });

      for (const member of members) {
        sendToUser(member.userId, messageStr);
      }
      console.log(`[Group Update] Broadcasted ${updateType} to ${members.length} members of group ${groupId}`);
    } catch (error) {
      console.error(`[Group Update] Error broadcasting ${updateType}:`, error);
    }
  }

  function broadcastToAll(message: WebSocketMessage, excludeUserId?: number) {
    const messageStr = JSON.stringify(message);
    clients.forEach((userClients, userId) => {
      if (excludeUserId !== undefined && userId === excludeUserId) return;
      userClients.forEach((client, source) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    });
  }

  return {
    broadcastToConversation,
    broadcastGroupUpdate,
    broadcastToAll
  };
}

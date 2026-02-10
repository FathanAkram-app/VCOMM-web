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
          console.log(`[BROADCAST] ✅ Message sent to user ${userId} (${source})`);
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
      console.log(`[BROADCAST] ========== Broadcasting ${message.type} to conversation ${conversationId} ==========`);
      console.log(`[BROADCAST] Found ${members.length} members in conversation ${conversationId}`);
      console.log(`[BROADCAST] Member list: [${members.map(m => m.userId).join(', ')}]`);
      console.log(`[BROADCAST] Active WebSocket users: ${clients.size}`);
      console.log(`[BROADCAST] Active user IDs: [${Array.from(clients.keys()).join(', ')}]`);

      let sentCount = 0;
      const messageStr = JSON.stringify(message);

      for (const member of members) {
        const userClients = clients.get(member.userId);
        const hasConnections = userClients && userClients.size > 0;
        console.log(`[BROADCAST] Member ${member.userId}: has connections=${hasConnections}, count=${userClients?.size || 0}`);

        if (userClients && userClients.size > 0) {
          const sent = sendToUser(member.userId, messageStr);
          sentCount += sent > 0 ? 1 : 0;  // Count users, not connections
        } else {
          console.log(`[BROADCAST] ❌ Cannot send to user ${member.userId} - no active connections`);
        }
      }

      console.log(`[BROADCAST] Successfully sent message to ${sentCount}/${members.length} members`);

      // Additional verification - check if all expected clients received the message
      if (sentCount < members.length) {
        console.log(`[BROADCAST] ⚠️ Not all members received message. Expected: ${members.length}, Sent: ${sentCount}`);
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

  function broadcastToAll(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    clients.forEach((userClients, userId) => {
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

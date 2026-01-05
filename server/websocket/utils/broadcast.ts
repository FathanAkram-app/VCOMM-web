import { WebSocket } from 'ws';
import { WebSocketMessage } from '@shared/schema';
import { IStorage } from '../../storage';
import { ClientsMap } from './types';

export function createBroadcastFunctions(storage: IStorage, clients: ClientsMap) {
  async function broadcastToConversation(conversationId: number, message: WebSocketMessage) {
    try {
      const members = await storage.getConversationMembers(conversationId);
      console.log(`[BROADCAST] Found ${members.length} members in conversation ${conversationId}`);
      console.log(`[BROADCAST] Member list: [${members.map(m => m.userId).join(', ')}]`);
      console.log(`[BROADCAST] Active WebSocket clients: ${clients.size}`);

      let sentCount = 0;
      const maxRetries = 3;

      for (const member of members) {
        const client = clients.get(member.userId);
        console.log(`[BROADCAST] Member ${member.userId}: client exists=${!!client}, connected=${client?.readyState === WebSocket.OPEN}`);

        if (client && client.readyState === WebSocket.OPEN) {
          let retryCount = 0;
          let messageSent = false;

          while (retryCount < maxRetries && !messageSent) {
            try {
              console.log(`[BROADCAST] Sending message to user ${member.userId} (attempt ${retryCount + 1}): ${JSON.stringify(message).substring(0, 100)}...`);
              client.send(JSON.stringify(message));
              sentCount++;
              messageSent = true;
              console.log(`[BROADCAST] ✅ Message sent to user ${member.userId}`);
            } catch (error) {
              retryCount++;
              console.log(`[BROADCAST] ⚠️ Send failed for user ${member.userId}, retry ${retryCount}/${maxRetries}`);

              if (retryCount < maxRetries) {
                // Wait 50ms before retry
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            }
          }

          if (!messageSent) {
            console.log(`[BROADCAST] ❌ Failed to send to user ${member.userId} after ${maxRetries} attempts`);
          }
        } else {
          console.log(`[BROADCAST] ❌ Cannot send to user ${member.userId} - client not available or not connected`);
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
      for (const member of members) {
        const client = clients.get(member.userId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'group_update',
            payload: {
              groupId,
              updateType,
              data
            }
          }));
        }
      }
      console.log(`[Group Update] Broadcasted ${updateType} to ${members.length} members of group ${groupId}`);
    } catch (error) {
      console.error(`[Group Update] Error broadcasting ${updateType}:`, error);
    }
  }

  function broadcastToAll(message: WebSocketMessage) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  return {
    broadcastToConversation,
    broadcastGroupUpdate,
    broadcastToAll
  };
}

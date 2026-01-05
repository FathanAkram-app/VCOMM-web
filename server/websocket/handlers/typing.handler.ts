import { WebSocketMessage } from '@shared/schema';
import { AuthenticatedWebSocket } from '../utils/types';

export function createTypingHandler(
  broadcastToConversation: (conversationId: number, message: WebSocketMessage) => Promise<void>
) {
  return async function handleTyping(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { conversationId, isTyping } = data.payload;

    if (conversationId) {
      await broadcastToConversation(conversationId, {
        type: 'typing',
        payload: {
          userId: ws.userId,
          conversationId,
          isTyping
        }
      });
    }
  };
}

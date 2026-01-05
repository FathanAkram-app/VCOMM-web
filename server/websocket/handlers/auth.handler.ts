import { WebSocket } from 'ws';
import { IStorage } from '../../storage';
import { AuthenticatedWebSocket, ClientsMap, SessionsMap } from '../utils/types';
import { WebSocketMessage } from '@shared/schema';

export function createAuthHandler(
  storage: IStorage,
  clients: ClientsMap,
  activeSessions: SessionsMap,
  broadcastToAll: (message: WebSocketMessage) => void
) {
  return async function handleAuth(ws: AuthenticatedWebSocket, data: any) {
    const { userId } = data.payload;
    if (!userId) return;

    // Check for existing session - implement single session login
    const existingSession = activeSessions.get(userId);
    if (existingSession) {
      console.log(`[SINGLE SESSION] User ${userId} already has active session, terminating previous connection`);

      // Close existing WebSocket connection
      if (existingSession.ws && existingSession.ws.readyState === WebSocket.OPEN) {
        existingSession.ws.send(JSON.stringify({
          type: 'session_terminated',
          payload: {
            reason: 'login_elsewhere',
            message: 'Sesi Anda telah dihentikan karena Anda login dari perangkat lain'
          }
        }));
        existingSession.ws.close();
        console.log(`[SINGLE SESSION] Closed previous WebSocket connection for user ${userId}`);
      }

      // Remove from clients map
      clients.delete(userId);
      console.log(`[SINGLE SESSION] Removed previous client for user ${userId}`);
    }

    // Generate new session ID
    const sessionId = `session_${userId}_${Date.now()}`;

    console.log(`User ${userId} authenticated via WebSocket with session ${sessionId}`);
    console.log(`[WebSocket] Current clients before adding: [${Array.from(clients.keys()).join(', ')}]`);

    ws.userId = userId;
    clients.set(userId, ws);
    activeSessions.set(userId, {
      sessionId,
      timestamp: Date.now(),
      ws
    });

    console.log(`[WebSocket] Current clients after adding: [${Array.from(clients.keys()).join(', ')}]`);
    console.log(`[WebSocket] User ${userId} WebSocket readyState: ${ws.readyState}`);
    console.log(`[SINGLE SESSION] Created new session ${sessionId} for user ${userId}`);

    // Update user status to online
    await storage.updateUserStatus(userId, 'online');

    // Broadcast user status change
    broadcastToAll({
      type: 'user_status',
      payload: {
        userId,
        status: 'online'
      }
    });
  };
}

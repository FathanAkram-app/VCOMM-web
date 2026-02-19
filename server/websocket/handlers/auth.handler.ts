import { WebSocket } from 'ws';
import { IStorage } from '../../storage';
import { AuthenticatedWebSocket, ClientsMap, SessionsMap } from '../utils/types';
import { WebSocketMessage } from '@shared/schema';

export function createAuthHandler(
  storage: IStorage,
  clients: ClientsMap,
  activeSessions: SessionsMap,
  broadcastToAll: (message: WebSocketMessage, excludeUserId?: number) => void
) {
  return async function handleAuth(ws: AuthenticatedWebSocket, data: any) {
    const { userId, source = 'foreground' } = data.payload;
    if (!userId) return;

    // Validate source
    const connectionSource = (source === 'background') ? 'background' : 'foreground';

    // Get or create the user's connections map
    let userClients = clients.get(userId);
    let userSessions = activeSessions.get(userId);

    if (!userClients) {
      userClients = new Map();
      clients.set(userId, userClients);
    }

    if (!userSessions) {
      userSessions = new Map();
      activeSessions.set(userId, userSessions);
    }

    // Check for existing session from the SAME source only
    // (allows foreground + background to coexist, but not two foregrounds)
    const existingSession = userSessions.get(connectionSource);
    if (existingSession) {
      console.log(`[SINGLE SESSION] User ${userId} already has active ${connectionSource} session, terminating previous connection`);

      // Close existing WebSocket connection from same source
      if (existingSession.ws && existingSession.ws.readyState === WebSocket.OPEN) {
        // Flag old ws so its close handler skips cleanup (new session replaces it)
        existingSession.ws.closedByServer = true;
        existingSession.ws.send(JSON.stringify({
          type: 'session_terminated',
          payload: {
            reason: 'login_elsewhere',
            message: 'Sesi Anda telah dihentikan karena Anda login dari perangkat lain'
          }
        }));
        existingSession.ws.close();
        console.log(`[SINGLE SESSION] Closed previous ${connectionSource} WebSocket connection for user ${userId}`);
      }

      // Remove from clients map
      userClients.delete(connectionSource);
      console.log(`[SINGLE SESSION] Removed previous ${connectionSource} client for user ${userId}`);
    }

    // Generate new session ID
    const sessionId = `session_${userId}_${connectionSource}_${Date.now()}`;

    console.log(`User ${userId} authenticated via WebSocket (${connectionSource}) with session ${sessionId}`);
    console.log(`[WebSocket] User ${userId} connections: [${Array.from(userClients.keys()).join(', ')}]`);

    ws.userId = userId;
    ws.source = connectionSource;
    userClients.set(connectionSource, ws);
    userSessions.set(connectionSource, {
      sessionId,
      timestamp: Date.now(),
      ws,
      source: connectionSource
    });

    console.log(`[WebSocket] User ${userId} connections after adding: [${Array.from(userClients.keys()).join(', ')}]`);
    console.log(`[WebSocket] User ${userId} ${connectionSource} WebSocket readyState: ${ws.readyState}`);
    console.log(`[SINGLE SESSION] Created new ${connectionSource} session ${sessionId} for user ${userId}`);

    // Update user status to online
    await storage.updateUserStatus(userId, 'online');

    // Broadcast user status change (skip sending to the user themselves)
    broadcastToAll({
      type: 'user_status',
      payload: {
        userId,
        status: 'online'
      }
    }, userId);

    // Deliver any missed call notifications from while user was offline
    try {
      const missedCalls = await storage.getRecentMissedCalls(userId, 5);
      if (missedCalls.length > 0) {
        console.log(`[Auth] Delivering ${missedCalls.length} missed call notification(s) to user ${userId}`);
        for (const call of missedCalls) {
          ws.send(JSON.stringify({
            type: 'call_missed',
            payload: {
              callId: call.callId,
              callType: call.callType,
              fromUserId: call.fromUserId,
              fromUserName: call.fromUserName,
              timestamp: call.timestamp,
              reason: 'offline',
            }
          }));
        }
      }
    } catch (error) {
      console.error(`[Auth] Error delivering missed calls for user ${userId}:`, error);
    }
  };
}

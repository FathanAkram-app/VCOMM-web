import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { IStorage } from '../storage';
import { WebSocketMessage } from '@shared/schema';
import { AuthenticatedWebSocket, ClientsMap, SessionsMap, GroupCallsMap } from './utils/types';
import { createBroadcastFunctions } from './utils/broadcast';
import { createSendToUser } from './utils/send';
import { createAuthHandler } from './handlers/auth.handler';
import { createTypingHandler } from './handlers/typing.handler';
import { createCallHandlers } from './handlers/call.handler';
import { createWebRTCHandlers } from './handlers/webrtc.handler';
import { createGroupCallHandlers } from './handlers/group-call.handler';
import { createGroupWebRTCHandlers } from './handlers/group-webrtc.handler';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 10000;  // 10 seconds to respond

export function setupWebSocketServer(httpServer: Server, storage: IStorage) {
  console.log("Setting up WebSocket server on path /ws");

  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    clientTracking: true
  });

  // Store active connections
  const clients: ClientsMap = new Map();
  const activeSessions: SessionsMap = new Map();
  const activeGroupCalls: GroupCallsMap = new Map();
  // Reverse lookup: callId → conversationId (groupId)
  const callConversationMap: Map<string, number> = new Map();

  // Create utility functions
  const { broadcastToConversation, broadcastGroupUpdate, broadcastToAll } = createBroadcastFunctions(storage, clients);
  const sendToUser = createSendToUser(clients);

  // Create message handlers
  const handleAuth = createAuthHandler(storage, clients, activeSessions, broadcastToAll);
  const handleTyping = createTypingHandler(broadcastToConversation);

  const callHandlers = createCallHandlers(storage, clients, activeGroupCalls, broadcastToAll, callConversationMap);
  const webrtcHandlers = createWebRTCHandlers(storage, clients);
  const groupCallHandlers = createGroupCallHandlers(storage, clients, activeGroupCalls, callConversationMap);
  const groupWebRTCHandlers = createGroupWebRTCHandlers(storage, clients, activeGroupCalls);

  // ─── Server startup: reset all users to offline ───
  storage.resetAllUsersOffline().then(() => {
    console.log('[WebSocket] All users set to offline on server startup');
  }).catch((err) => {
    console.error('[WebSocket] Error resetting user statuses on startup:', err);
  });

  // ─── Heartbeat: detect dead connections ───
  const heartbeatInterval = setInterval(() => {
    clients.forEach((userClients, userId) => {
      userClients.forEach((ws, source) => {
        if (ws.isAlive === false) {
          // Did not respond to last ping — connection is dead
          console.log(`[Heartbeat] User ${userId} (${source}) did not respond to ping, terminating`);
          ws.terminate();
          return;
        }

        // Mark as not alive, wait for pong to set it back
        ws.isAlive = false;
        ws.ping();
      });
    });
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // WebSocket connection handler
  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log("WebSocket connection received");

    // Initialize heartbeat tracking
    ws.isAlive = true;

    // Respond to server-level pong (binary ping/pong frames)
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('error', (error) => console.error('WebSocket error:', error));

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString()) as WebSocketMessage;

        // Route messages to appropriate handlers
        switch (data.type) {
          case 'auth':
            await handleAuth(ws, data);
            break;

          case 'typing':
            await handleTyping(ws, data);
            break;

          // 1-to-1 Call handlers
          case 'initiate_call':
            await callHandlers.handleInitiateCall(ws, data);
            break;

          case 'accept_call':
            await callHandlers.handleAcceptCall(ws, data);
            break;

          case 'reject_call':
            await callHandlers.handleRejectCall(ws, data);
            break;

          case 'end_call':
            await callHandlers.handleEndCall(ws, data);
            break;

          case 'webrtc_ready':
            await callHandlers.handleWebRTCReady(ws, data);
            break;

          // WebRTC signaling (1-to-1)
          case 'webrtc_offer':
            await webrtcHandlers.handleWebRTCOffer(ws, data);
            break;

          case 'webrtc_answer':
            await webrtcHandlers.handleWebRTCAnswer(ws, data);
            break;

          case 'webrtc_ice_candidate':
            await webrtcHandlers.handleWebRTCIceCandidate(ws, data);
            break;

          // Group Call handlers
          case 'start_group_call':
            await groupCallHandlers.handleStartGroupCall(ws, data);
            break;

          case 'join_group_call':
            await groupCallHandlers.handleJoinGroupCall(ws, data);
            break;

          case 'leave_group_call':
            await groupCallHandlers.handleLeaveGroupCall(ws, data);
            break;

          case 'reject_group_call':
            await groupCallHandlers.handleRejectGroupCall(ws, data);
            break;

          case 'request_group_participants':
            await groupCallHandlers.handleRequestGroupParticipants(ws, data);
            break;

          // Group WebRTC signaling
          case 'group_webrtc_offer':
            await groupWebRTCHandlers.handleGroupWebRTCOffer(ws, data);
            break;

          case 'group_webrtc_answer':
            await groupWebRTCHandlers.handleGroupWebRTCAnswer(ws, data);
            break;

          case 'group_webrtc_ice_candidate':
            await groupWebRTCHandlers.handleGroupWebRTCIceCandidate(ws, data);
            break;

          case 'group_participant_refresh':
            await groupWebRTCHandlers.handleGroupParticipantRefresh(ws, data);
            break;

          case 'ping':
            // Respond to client-level keepalive pings (JSON)
            ws.isAlive = true;
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            console.log(`[WebSocket] Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Handle WebSocket close
    ws.on('close', async () => {
      if (ws.userId) {
        const source = ws.source || 'foreground';
        console.log(`WebSocket closed for user ${ws.userId} (${source})`);

        // Skip cleanup if this connection was replaced by a new one (session re-auth)
        if (ws.closedByServer) {
          console.log(`[WebSocket] Skipping cleanup for user ${ws.userId} (${source}) - replaced by new session`);
          return;
        }

        // Remove this specific connection only if it's still the same ws instance
        const userClients = clients.get(ws.userId);
        const userSessions = activeSessions.get(ws.userId);

        if (userClients) {
          // Only delete if this ws is still the registered one (not replaced)
          const currentWs = userClients.get(source);
          if (currentWs === ws) {
            userClients.delete(source);
            if (userClients.size === 0) {
              clients.delete(ws.userId);
            }
          }
        }

        if (userSessions) {
          const currentSession = userSessions.get(source);
          if (currentSession?.ws === ws) {
            userSessions.delete(source);
            if (userSessions.size === 0) {
              activeSessions.delete(ws.userId);
            }
          }
        }

        // Only mark user as offline if they have no remaining connections
        const remainingClients = clients.get(ws.userId);
        if (!remainingClients || remainingClients.size === 0) {
          try {
            await storage.updateUserStatus(ws.userId, 'offline');

            // Broadcast user status change (skip the disconnecting user)
            broadcastToAll({
              type: 'user_status',
              payload: {
                userId: ws.userId,
                status: 'offline'
              }
            }, ws.userId);
            console.log(`[WebSocket] User ${ws.userId} is now offline (no remaining connections)`);
          } catch (error) {
            console.error('Error updating user status on disconnect:', error);
          }
        } else {
          console.log(`[WebSocket] User ${ws.userId} still has ${remainingClients.size} connection(s) active`);
        }
      }
    });
  });

  // Return utilities that may be needed elsewhere
  return {
    wss,
    clients,
    activeGroupCalls,
    callConversationMap,
    sendToUser,
    broadcastToConversation,
    broadcastGroupUpdate,
    broadcastToAll
  };
}

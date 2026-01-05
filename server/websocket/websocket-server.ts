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

  // Create utility functions
  const { broadcastToConversation, broadcastGroupUpdate, broadcastToAll } = createBroadcastFunctions(storage, clients);
  const sendToUser = createSendToUser(clients);

  // Create message handlers
  const handleAuth = createAuthHandler(storage, clients, activeSessions, broadcastToAll);
  const handleTyping = createTypingHandler(broadcastToConversation);

  const callHandlers = createCallHandlers(storage, clients, activeGroupCalls, broadcastToAll);
  const webrtcHandlers = createWebRTCHandlers(storage, clients);
  const groupCallHandlers = createGroupCallHandlers(storage, clients, activeGroupCalls);
  const groupWebRTCHandlers = createGroupWebRTCHandlers(storage, clients, activeGroupCalls);

  // WebSocket connection handler
  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log("WebSocket connection received");

    // Log connection status for debugging
    ws.on('open', () => console.log('WebSocket connection opened'));
    ws.on('error', (error) => console.error('WebSocket error:', error));
    ws.on('close', () => console.log('WebSocket connection closed'));

    ws.on('message', async (message) => {
      try {
        console.log('Received message:', message.toString());
        const data = JSON.parse(message.toString()) as WebSocketMessage;

        // Debug log for group call messages
        if (data.type === 'start_group_call') {
          console.log('[DEBUG] ✅ START_GROUP_CALL message received:', JSON.stringify(data, null, 2));
        }

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
        console.log(`WebSocket closed for user ${ws.userId}`);
        clients.delete(ws.userId);
        activeSessions.delete(ws.userId);

        // Update user status to offline
        try {
          await storage.updateUserStatus(ws.userId, 'offline');

          // Broadcast user status change
          broadcastToAll({
            type: 'user_status',
            payload: {
              userId: ws.userId,
              status: 'offline'
            }
          });
        } catch (error) {
          console.error('Error updating user status on disconnect:', error);
        }
      }
    });
  });

  // Return utilities that may be needed elsewhere
  return {
    wss,
    clients,
    sendToUser,
    broadcastToConversation,
    broadcastGroupUpdate,
    broadcastToAll
  };
}

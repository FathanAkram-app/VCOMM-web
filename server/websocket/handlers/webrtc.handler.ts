import { WebSocket } from 'ws';
import { IStorage } from '../../storage';
import { AuthenticatedWebSocket, ClientsMap } from '../utils/types';
import { sendToClient, getUserClient } from '../utils/send';

// Helper to send to all connections of a user
function sendToAllUserConnections(clients: ClientsMap, userId: number, message: any): boolean {
  const userClients = clients.get(userId);
  if (!userClients) return false;

  const messageStr = JSON.stringify(message);
  let sent = false;
  userClients.forEach((client, source) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
      sent = true;
    }
  });
  return sent;
}

export function createWebRTCHandlers(
  storage: IStorage,
  clients: ClientsMap
) {
  async function handleWebRTCOffer(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    console.log('[WebRTC] Received offer, data.payload:', data.payload ? 'exists' : 'missing');
    console.log('[WebRTC] Payload keys:', data.payload ? Object.keys(data.payload) : 'N/A');
    const { callId, toUserId, offer, callType, callerUserId, callerName, conversationId } = data.payload || data;
    console.log(`[WebRTC] Extracted values - callId: ${callId}, callerUserId: ${callerUserId}, toUserId: ${toUserId}, callType: ${callType}`);
    console.log(`[WebRTC] Relaying offer for call ${callId}`);

    const offerMessage = {
      type: 'webrtc_offer',
      payload: {
        callId,
        offer,
        callType,
        callerUserId,
        callerName,
        conversationId
      }
    };

    if (toUserId) {
      // Send to specific user (1-on-1 call)
      if (sendToAllUserConnections(clients, toUserId, offerMessage)) {
        console.log(`[WebRTC] Sent offer to user ${toUserId}`);
      } else {
        console.log(`[WebRTC] Target user ${toUserId} not found or not connected`);
      }
    } else {
      // Broadcast to all (fallback for group calls or legacy behavior)
      clients.forEach((userClients, userId) => {
        if (userId !== ws.userId) {
          sendToAllUserConnections(clients, userId, offerMessage);
        }
      });
      console.log(`[WebRTC] Broadcast offer to all users (no toUserId specified)`);
    }
  }

  async function handleWebRTCAnswer(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId, answer } = data.payload || data;
    console.log(`[WebRTC] Relaying answer for call ${callId} to user ${toUserId}`);

    const answerMessage = {
      type: 'webrtc_answer',
      payload: {
        callId,
        answer
      }
    };

    if (toUserId) {
      // Send to specific user (the original caller)
      if (sendToAllUserConnections(clients, toUserId, answerMessage)) {
        console.log(`[WebRTC] Sent answer to user ${toUserId}`);
      } else {
        console.log(`[WebRTC] Target user ${toUserId} not found or not connected`);
      }
    } else {
      // Broadcast to all (fallback)
      clients.forEach((userClients, userId) => {
        if (userId !== ws.userId) {
          sendToAllUserConnections(clients, userId, answerMessage);
        }
      });
      console.log(`[WebRTC] Broadcast answer to all users (no toUserId specified)`);
    }
  }

  async function handleWebRTCIceCandidate(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, candidate, targetUserId, fromUserId } = data.payload || data;
    console.log(`[WebRTC] Relaying ICE candidate for call ${callId} from ${fromUserId || ws.userId} to ${targetUserId || 'all'}`);

    if (targetUserId) {
      // Send to specific user (for group calls)
      const iceMessage = {
        type: 'webrtc_ice_candidate',
        payload: {
          callId,
          candidate,
          fromUserId: fromUserId || ws.userId
        }
      };
      if (sendToAllUserConnections(clients, targetUserId, iceMessage)) {
        console.log(`[WebRTC] ICE candidate sent to user ${targetUserId}`);
      } else {
        console.log(`[WebRTC] Target user ${targetUserId} not found or not connected`);
      }
    } else {
      // Broadcast to all participants (fallback for 1-on-1 calls)
      let sentCount = 0;
      const iceMessage = {
        type: 'webrtc_ice_candidate',
        payload: {
          callId,
          candidate
        }
      };
      clients.forEach((userClients, userId) => {
        if (userId !== ws.userId) {
          if (sendToAllUserConnections(clients, userId, iceMessage)) {
            sentCount++;
          }
        }
      });
      console.log(`[WebRTC] ICE candidate broadcast to ${sentCount} users`);
    }
  }

  return {
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleWebRTCIceCandidate
  };
}

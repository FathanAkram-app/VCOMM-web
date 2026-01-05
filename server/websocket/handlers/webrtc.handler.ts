import { WebSocket } from 'ws';
import { IStorage } from '../../storage';
import { AuthenticatedWebSocket, ClientsMap } from '../utils/types';
import { sendToClient } from '../utils/send';

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

    if (toUserId) {
      // Send to specific user (1-on-1 call)
      const targetClient = clients.get(toUserId);
      if (targetClient && targetClient.readyState === targetClient.OPEN) {
        targetClient.send(JSON.stringify({
          type: 'webrtc_offer',
          payload: {
            callId,
            offer,
            callType,
            callerUserId,
            callerName,
            conversationId
          }
        }));
        console.log(`[WebRTC] Sent offer to specific user ${toUserId}`);
      } else {
        console.log(`[WebRTC] Target user ${toUserId} not found or not connected`);
      }
    } else {
      // Broadcast to all (fallback for group calls or legacy behavior)
      clients.forEach((client, userId) => {
        if (userId !== ws.userId && client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'webrtc_offer',
            payload: {
              callId,
              offer,
              callType,
              callerUserId,
              callerName,
              conversationId
            }
          }));
        }
      });
      console.log(`[WebRTC] Broadcast offer to all users (no toUserId specified)`);
    }
  }

  async function handleWebRTCAnswer(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId, answer } = data.payload || data;
    console.log(`[WebRTC] Relaying answer for call ${callId} to user ${toUserId}`);

    if (toUserId) {
      // Send to specific user (the original caller)
      const targetClient = clients.get(toUserId);
      if (targetClient && targetClient.readyState === targetClient.OPEN) {
        targetClient.send(JSON.stringify({
          type: 'webrtc_answer',
          payload: {
            callId,
            answer
          }
        }));
        console.log(`[WebRTC] Sent answer to specific user ${toUserId}`);
      } else {
        console.log(`[WebRTC] Target user ${toUserId} not found or not connected`);
      }
    } else {
      // Broadcast to all (fallback)
      clients.forEach((client, userId) => {
        if (userId !== ws.userId && client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'webrtc_answer',
            payload: {
              callId,
              answer
            }
          }));
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
      const targetClient = clients.get(targetUserId);
      if (targetClient && targetClient.readyState === targetClient.OPEN) {
        targetClient.send(JSON.stringify({
          type: 'webrtc_ice_candidate',
          payload: {
            callId,
            candidate,
            fromUserId: fromUserId || ws.userId
          }
        }));
        console.log(`[WebRTC] ICE candidate sent to user ${targetUserId}`);
      } else {
        console.log(`[WebRTC] Target user ${targetUserId} not found or not connected`);
      }
    } else {
      // Broadcast to all participants (fallback for 1-on-1 calls)
      let sentCount = 0;
      clients.forEach((client, userId) => {
        if (userId !== ws.userId && client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'webrtc_ice_candidate',
            payload: {
              callId,
              candidate
            }
          }));
          sentCount++;
        }
      });
      console.log(`[WebRTC] ICE candidate broadcast to ${sentCount} participants`);
    }
  }

  return {
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleWebRTCIceCandidate
  };
}

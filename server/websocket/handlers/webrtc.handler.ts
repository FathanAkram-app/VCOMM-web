import { WebSocket } from 'ws';
import { IStorage } from '../../storage';
import { AuthenticatedWebSocket, ClientsMap, OneOnOneCallsMap } from '../utils/types';
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
  clients: ClientsMap,
  activeOneOnOneCalls?: OneOnOneCallsMap
) {
  // Resolve the peer to relay 1:1 signaling to. Prefer an explicit target (the mobile app sends
  // one); otherwise look up the other party of this callId (the web client sends signaling
  // untargeted). Returns null only when the call is unknown.
  function resolvePeer(callId: string, senderId: number, explicitTarget?: number): number | null {
    if (explicitTarget) return explicitTarget;
    const info = activeOneOnOneCalls?.get(callId);
    if (info) return info.caller === senderId ? info.callee : info.caller;
    return null;
  }

  // Record the call pair so later answer/ICE (which the web client sends untargeted) can be routed.
  function rememberCall(callId: string, caller: number, callee: number) {
    if (!activeOneOnOneCalls || !callId || !caller || !callee) return;
    if (!activeOneOnOneCalls.has(callId)) {
      activeOneOnOneCalls.set(callId, { caller, callee });
    }
  }

  async function handleWebRTCOffer(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId, offer, callType, callerUserId, callerName, conversationId } = data.payload || data;
    console.log(`[WebRTC] Relaying offer for call ${callId} (from ${ws.userId}, target ${toUserId ?? 'lookup'})`);

    // Remember the pair from the offer so the answer/ICE can be routed even if the peer omits a target.
    if (toUserId) rememberCall(callId, ws.userId, toUserId);

    const offerMessage = {
      type: 'webrtc_offer',
      payload: { callId, offer, callType, callerUserId, callerName, conversationId, fromUserId: ws.userId }
    };

    const peer = resolvePeer(callId, ws.userId, toUserId);
    if (peer) {
      if (sendToAllUserConnections(clients, peer, offerMessage)) {
        console.log(`[WebRTC] Sent offer to user ${peer}`);
      } else {
        console.log(`[WebRTC] Peer ${peer} not connected for offer on call ${callId}`);
      }
    } else {
      // Unknown call and no target: last-resort broadcast (legacy web flow). Receivers filter by
      // callId. fromUserId is included so they can also discriminate by sender.
      clients.forEach((_userClients, userId) => {
        if (userId !== ws.userId) sendToAllUserConnections(clients, userId, offerMessage);
      });
      console.log(`[WebRTC] Broadcast offer for unknown call ${callId} (no target)`);
    }
  }

  async function handleWebRTCAnswer(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId, answer } = data.payload || data;
    // The answerer is the callee; record the pair so subsequent ICE routes correctly.
    if (toUserId) rememberCall(callId, toUserId, ws.userId);

    const answerMessage = {
      type: 'webrtc_answer',
      payload: { callId, answer, fromUserId: ws.userId }
    };

    const peer = resolvePeer(callId, ws.userId, toUserId);
    console.log(`[WebRTC] Relaying answer for call ${callId} to user ${peer ?? 'broadcast'}`);
    if (peer) {
      if (!sendToAllUserConnections(clients, peer, answerMessage)) {
        console.log(`[WebRTC] Peer ${peer} not connected for answer on call ${callId}`);
      }
    } else {
      clients.forEach((_userClients, userId) => {
        if (userId !== ws.userId) sendToAllUserConnections(clients, userId, answerMessage);
      });
      console.log(`[WebRTC] Broadcast answer for unknown call ${callId} (no target)`);
    }
  }

  async function handleWebRTCIceCandidate(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, candidate, targetUserId, fromUserId } = data.payload || data;
    const iceMessage = {
      type: 'webrtc_ice_candidate',
      payload: { callId, candidate, fromUserId: fromUserId || ws.userId }
    };

    const peer = resolvePeer(callId, ws.userId, targetUserId);
    console.log(`[WebRTC] Relaying ICE for call ${callId} from ${fromUserId || ws.userId} to ${peer ?? 'broadcast'}`);
    if (peer) {
      if (!sendToAllUserConnections(clients, peer, iceMessage)) {
        console.log(`[WebRTC] Peer ${peer} not connected for ICE on call ${callId}`);
      }
    } else {
      let sentCount = 0;
      clients.forEach((_userClients, userId) => {
        if (userId !== ws.userId) {
          if (sendToAllUserConnections(clients, userId, iceMessage)) sentCount++;
        }
      });
      console.log(`[WebRTC] ICE broadcast for unknown call ${callId} to ${sentCount} users`);
    }
  }

  return {
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleWebRTCIceCandidate
  };
}

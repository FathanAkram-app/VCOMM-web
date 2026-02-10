import { WebSocket } from 'ws';
import { IStorage } from '../../storage';
import { AuthenticatedWebSocket, ClientsMap, GroupCallsMap } from '../utils/types';
import { sendToClient, getUserClient } from '../utils/send';

// Helper to send to all connections of a user
function sendToAllUserConnections(clients: ClientsMap, userId: number, message: any): boolean {
  const userClients = clients.get(userId);
  if (!userClients) return false;

  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  let sent = false;
  userClients.forEach((client, source) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
      sent = true;
    }
  });
  return sent;
}

export function createGroupWebRTCHandlers(
  storage: IStorage,
  clients: ClientsMap,
  activeGroupCalls: GroupCallsMap
) {
  async function handleGroupWebRTCOffer(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, offer, targetUserId, fromUserId } = data.payload;
    console.log(`[Group WebRTC] Relaying offer for call ${callId} from ${fromUserId} to ${targetUserId}`);

    sendToAllUserConnections(clients, targetUserId, {
      type: 'group_webrtc_offer',
      payload: {
        callId,
        offer,
        fromUserId
      }
    });
  }

  async function handleGroupWebRTCAnswer(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, answer, targetUserId, fromUserId } = data.payload;
    console.log(`[Group WebRTC] Relaying answer for call ${callId} from ${fromUserId} to ${targetUserId}`);

    sendToAllUserConnections(clients, targetUserId, {
      type: 'group_webrtc_answer',
      payload: {
        callId,
        answer,
        fromUserId
      }
    });
  }

  async function handleGroupWebRTCIceCandidate(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, candidate, targetUserId, fromUserId } = data.payload;
    console.log(`[Group WebRTC] Relaying ICE candidate for call ${callId} from ${fromUserId} to ${targetUserId}`);

    sendToAllUserConnections(clients, targetUserId, {
      type: 'group_webrtc_ice_candidate',
      payload: {
        callId,
        candidate,
        fromUserId
      }
    });
  }

  async function handleGroupParticipantRefresh(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, fromUserId, targetUserId } = data.payload;
    console.log(`[Group WebRTC] Relaying participant refresh request for call ${callId} from ${fromUserId} to ${targetUserId}`);

    if (sendToAllUserConnections(clients, targetUserId, {
      type: 'group_participant_refresh',
      payload: {
        callId,
        fromUserId,
        targetUserId
      }
    })) {
      console.log(`[Group WebRTC] Participant refresh request sent to user ${targetUserId}`);
    } else {
      console.log(`[Group WebRTC] Cannot send refresh request to user ${targetUserId} - client not available`);
    }
  }

  return {
    handleGroupWebRTCOffer,
    handleGroupWebRTCAnswer,
    handleGroupWebRTCIceCandidate,
    handleGroupParticipantRefresh
  };
}

import { WebSocket } from 'ws';
import { IStorage } from '../../storage';
import { AuthenticatedWebSocket, ClientsMap, GroupCallsMap } from '../utils/types';
import { sendToClient, getUserClient } from '../utils/send';
import { gotifyService } from '../../services/gotify.service';

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

export function createCallHandlers(
  storage: IStorage,
  clients: ClientsMap,
  activeGroupCalls: GroupCallsMap,
  broadcastToAll: (message: any) => void
) {
  // Track calls that have been resolved (answered/rejected/ended) to prevent
  // the 30s timeout from overriding an already-processed call (#7 Call Decline State Sync)
  const processedCalls = new Set<string>();

  // Auto-cleanup processedCalls after 60s to prevent memory leak
  function markCallProcessed(callId: string) {
    processedCalls.add(callId);
    setTimeout(() => processedCalls.delete(callId), 60000);
  }

  async function handleInitiateCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId, callType, fromUserId, fromUserName } = data.payload;
    console.log(`[Call] User ${fromUserId} (${fromUserName}) initiating ${callType} call to ${toUserId}`);

    // Get target user's name
    const targetUser = await storage.getUser(toUserId);
    const targetUserName = targetUser ? (targetUser.callsign || targetUser.fullName || 'Unknown') : 'Unknown';

    const targetClient = getUserClient(clients, toUserId);
    if (targetClient) {
      // Log call history as incoming (user is online)
      await storage.addCallHistory({
        callId,
        callType,
        initiatorId: fromUserId,
        conversationId: data.payload.conversationId || null,
        participants: [fromUserId.toString(), toUserId.toString()],
        status: 'incoming',
        startTime: new Date(),
        endTime: null,
        duration: null
      });
      // Send WebSocket notification to all connections of the target user
      const userClients = clients.get(toUserId);
      if (userClients) {
        const messageStr = JSON.stringify({
          type: 'incoming_call',
          payload: {
            callId,
            callType,
            fromUserId,
            fromUserName,
            conversationId: data.payload.conversationId
          }
        });
        userClients.forEach((client, source) => {
          if (client.readyState === client.OPEN) {
            client.send(messageStr);
            console.log(`[Call] Sent incoming call notification to user ${toUserId} (${source}) via WebSocket`);
          }
        });
      }

      // Note: Notifications are handled via WebSocket - when user is online, they receive
      // incoming_call message. When backgrounded, the mobile app's WebSocket service
      // will show a notification.

      // Set timeout for unanswered calls (30 seconds)
      setTimeout(async () => {
        try {
          // Skip if call was already processed (accepted/rejected) before timeout
          if (processedCalls.has(callId)) {
            console.log(`[Call] Call ${callId} already processed, skipping timeout`);
            return;
          }

          // Check if call is still in "incoming" status (not answered)
          const existingCall = await storage.getCallByCallId(callId);
          if (existingCall && existingCall.status === 'incoming') {
            // Update to missed call status
            await storage.updateCallStatus(callId, 'missed');
            console.log(`[Call] Call ${callId} marked as missed (timeout)`);

            // Notify both users that call was missed
            [fromUserId, toUserId].forEach(userId => {
              const userClients = clients.get(userId);
              if (userClients) {
                const missedMessage = JSON.stringify({
                  type: 'call_missed',
                  payload: { callId, reason: 'timeout' }
                });
                userClients.forEach((client, source) => {
                  if (client.readyState === client.OPEN) {
                    client.send(missedMessage);
                  }
                });
              }
            });
          }
        } catch (error) {
          console.error('[Call] Error handling call timeout:', error);
        }
      }, 30000); // 30 seconds timeout
    } else {
      // User is offline (no WebSocket connection)
      console.log(`[Call] User ${toUserId} is offline (no WebSocket), sending Gotify push`);

      // Log as missed call
      await storage.addCallHistory({
        callId,
        callType,
        initiatorId: fromUserId,
        conversationId: null,
        participants: [fromUserId.toString(), toUserId.toString()],
        status: 'missed',
        startTime: new Date(),
        endTime: null,
        duration: null
      });

      // Send Gotify push notification
      try {
        // Fetch user's Gotify client token
        const userGotifyToken = await storage.getUserGotifyToken(toUserId);

        if (userGotifyToken) {
          await gotifyService.sendCallNotification(
            userGotifyToken,  // User's client token
            callId,
            fromUserId.toString(),
            fromUserName,
            callType,
            false  // isGroupCall
          );
          console.log(`[Call] Gotify push notification sent to offline user ${toUserId}`);
        } else {
          console.warn(`[Call] User ${toUserId} has no Gotify token configured`);
        }
      } catch (error) {
        console.error(`[Call] Error sending Gotify push notification:`, error);
      }

      // Notify caller that user is offline
      ws.send(JSON.stringify({
        type: 'call_failed',
        payload: {
          callId,
          reason: 'User is offline'
        }
      }));
      console.log(`[Call] User ${toUserId} is offline, notified caller`);
    }
  }

  async function handleAcceptCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId } = data.payload;
    console.log(`[Call] User ${ws.userId} accepted call ${callId}, notifying user ${toUserId}`);

    // Mark call as processed so timeout won't fire
    markCallProcessed(callId);

    // Update call history status to accepted
    await storage.updateCallStatus(callId, 'accepted');

    // Check if target user has connections
    const targetClients = clients.get(toUserId);
    console.log(`[Call] Target user ${toUserId} has ${targetClients ? targetClients.size : 0} connection(s)`);

    if (sendToAllUserConnections(clients, toUserId, {
      type: 'call_accepted',
      payload: { callId }
    })) {
      console.log(`[Call] ✅ Sent call_accepted to user ${toUserId} for call ${callId}`);
    } else {
      console.log(`[Call] ❌ Target user ${toUserId} not connected for call_accepted`);
    }
  }

  async function handleRejectCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId, reason } = data.payload;
    console.log(`[Call] User ${ws.userId} rejected call ${callId}`, reason ? `(reason: ${reason})` : '(no reason)');

    // Mark call as processed so timeout won't fire
    markCallProcessed(callId);

    // Update call history status - use 'missed' if user didn't explicitly reject
    const status = reason === 'busy' ? 'rejected' : 'missed';
    console.log(`[Call] Updating call ${callId} status to: ${status}`);

    try {
      await storage.updateCallStatus(callId, status);
      console.log(`[Call] Successfully updated call ${callId} to ${status}`);
    } catch (error) {
      console.error(`[Call] Failed to update call ${callId} status:`, error);
    }

    // Get the user's name for a personalized message
    const rejectingUser = await storage.getUser(ws.userId);
    const userName = rejectingUser?.callsign || rejectingUser?.fullName || 'User';

    if (sendToAllUserConnections(clients, toUserId, {
      type: reason === 'busy' ? 'call_failed' : 'call_rejected',
      payload: {
        callId,
        reason: reason || 'declined',
        message: reason === 'busy' ? `${userName} is currently on another call` : undefined
      }
    })) {
      console.log(`[Call] Sent call ${reason === 'busy' ? 'failed (busy)' : 'rejected'} notification to user ${toUserId}`);
    }
  }

  async function handleEndCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId, groupId } = data.payload;
    console.log(`[Call] User ${ws.userId} ended call ${callId}`);

    // Mark call as processed so timeout won't fire
    markCallProcessed(callId);

    // Update call history status to ended
    await storage.updateCallStatus(callId, 'ended');

    // Check if it's a group call
    if (callId.includes('group_call_')) {
      console.log(`[Group Call] Handling group call end for ${callId}`);

      // Try direct callId lookup first, fall back to groupId search
      let foundCallId = null;
      if (activeGroupCalls.has(callId) && activeGroupCalls.get(callId)!.has(ws.userId)) {
        foundCallId = callId;
      } else if (groupId) {
        for (const [activeCallId, participants] of activeGroupCalls.entries()) {
          if (activeCallId.includes(`_${groupId}_`) && participants.has(ws.userId)) {
            foundCallId = activeCallId;
            break;
          }
        }
      }

      if (foundCallId) {
        // Remove user from group call participants
        activeGroupCalls.get(foundCallId)!.delete(ws.userId);
        const remainingParticipants = activeGroupCalls.get(foundCallId)!.size;

        console.log(`[Group Call] User ${ws.userId} left call ${foundCallId}, ${remainingParticipants} participants remaining`);

        if (remainingParticipants === 0) {
          // No participants left, end the entire call
          activeGroupCalls.delete(foundCallId);
          console.log(`[Group Call] Removed empty group call ${foundCallId}`);

          broadcastToAll({
            type: 'group_call_ended',
            payload: {
              callId: foundCallId,
              endedByUserId: ws.userId
            }
          });
          console.log(`[Group Call] Broadcasted group call end for ${foundCallId}`);
        } else {
          // Some participants still remain, just notify user left
          broadcastToAll({
            type: 'group_call_user_left',
            userId: ws.userId,
            roomId: groupId,
            callType: data.payload.callType || 'audio'
          });
          console.log(`[Group Call] Broadcasted user ${ws.userId} left group call ${foundCallId}`);
        }
      } else {
        console.log(`[Group Call] No active group call found for user ${ws.userId} in group ${groupId}`);
      }
    } else {
      // For individual calls, notify specific user (all connections)
      if (sendToAllUserConnections(clients, toUserId, {
        type: 'call_ended',
        payload: { callId }
      })) {
        console.log(`[Call] Sent call ended notification to user ${toUserId}`);
      }
    }
  }

  async function handleWebRTCReady(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId } = data.payload;
    console.log(`[WebRTC] User ${ws.userId} is ready for WebRTC on call ${callId}`);

    sendToAllUserConnections(clients, toUserId, {
      type: 'webrtc_ready',
      payload: { callId }
    });
    console.log(`[WebRTC] Sent ready signal to user ${toUserId}`);
  }

  return {
    handleInitiateCall,
    handleAcceptCall,
    handleRejectCall,
    handleEndCall,
    handleWebRTCReady
  };
}

import { WebSocket } from 'ws';
import { IStorage } from '../../storage';
import { AuthenticatedWebSocket, ClientsMap, GroupCallsMap } from '../utils/types';
import { sendToClient } from '../utils/send';
import { fcmService } from '../../services/fcm.service';

export function createCallHandlers(
  storage: IStorage,
  clients: ClientsMap,
  activeGroupCalls: GroupCallsMap,
  broadcastToAll: (message: any) => void
) {
  async function handleInitiateCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId, callType, fromUserId, fromUserName } = data.payload;
    console.log(`[Call] User ${fromUserId} (${fromUserName}) initiating ${callType} call to ${toUserId}`);

    // Get target user's name
    const targetUser = await storage.getUser(toUserId);
    const targetUserName = targetUser ? (targetUser.callsign || targetUser.fullName || 'Unknown') : 'Unknown';

    // Log call initiation
    await storage.addCallHistory({
      callId,
      callType,
      initiatorId: fromUserId,
      conversationId: null,
      participants: [fromUserId.toString(), toUserId.toString()],
      status: 'incoming',
      startTime: new Date(),
      endTime: null,
      duration: null
    });

    const targetClient = clients.get(toUserId);
    if (targetClient && targetClient.readyState === targetClient.OPEN) {
      targetClient.send(JSON.stringify({
        type: 'incoming_call',
        payload: {
          callId,
          callType,
          fromUserId,
          fromUserName
        }
      }));
      console.log(`[Call] Sent incoming call notification to user ${toUserId}`);

      // Set timeout for unanswered calls (30 seconds)
      setTimeout(async () => {
        try {
          // Check if call is still in "incoming" status (not answered)
          const existingCall = await storage.getCallByCallId(callId);
          if (existingCall && existingCall.status === 'incoming') {
            // Update to missed call status
            await storage.updateCallStatus(callId, 'missed');
            console.log(`[Call] Call ${callId} marked as missed (timeout)`);

            // Notify both users that call was missed
            [fromUserId, toUserId].forEach(userId => {
              const client = clients.get(userId);
              if (client && client.readyState === client.OPEN) {
                client.send(JSON.stringify({
                  type: 'call_missed',
                  payload: { callId, reason: 'timeout' }
                }));
              }
            });
          }
        } catch (error) {
          console.error('[Call] Error handling call timeout:', error);
        }
      }, 30000); // 30 seconds timeout
    } else {
      // User is offline, log missed call AND send push notification
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

      // Send push notification to offline user
      console.log(`[Call] User ${toUserId} is offline, sending push notification`);
      try {
        await fcmService.sendCallNotification(
          toUserId,
          fromUserName,
          callType,
          callId,
          fromUserId
        );
        console.log(`[Call] Push notification sent to user ${toUserId}`);
      } catch (error) {
        console.error(`[Call] Error sending push notification:`, error);
      }

      // Send failure response
      ws.send(JSON.stringify({
        type: 'call_failed',
        payload: {
          callId,
          reason: 'User is offline'
        }
      }));
      console.log(`[Call] User ${toUserId} is offline, call failed`);
    }
  }

  async function handleAcceptCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId } = data.payload;
    console.log(`[Call] User ${ws.userId} accepted call ${callId}`);

    // Update call history status to accepted
    await storage.updateCallStatus(callId, 'accepted');

    const targetClient = clients.get(toUserId);
    if (targetClient && targetClient.readyState === targetClient.OPEN) {
      targetClient.send(JSON.stringify({
        type: 'call_accepted',
        payload: { callId }
      }));
      console.log(`[Call] Sent call accepted notification to user ${toUserId}`);
    }
  }

  async function handleRejectCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId, reason } = data.payload;
    console.log(`[Call] User ${ws.userId} rejected call ${callId}`, reason ? `(reason: ${reason})` : '(no reason)');
    console.log(`[Call] Reject payload:`, JSON.stringify(data.payload));

    // Update call history status - use 'missed' if user didn't explicitly reject
    const status = reason === 'busy' ? 'rejected' : 'missed';
    console.log(`[Call] Updating call ${callId} status to: ${status}`);

    try {
      await storage.updateCallStatus(callId, status);
      console.log(`[Call] Successfully updated call ${callId} to ${status}`);
    } catch (error) {
      console.error(`[Call] Failed to update call ${callId} status:`, error);
    }

    const targetClient = clients.get(toUserId);
    if (targetClient && targetClient.readyState === targetClient.OPEN) {
      // Get the user's name for a personalized message
      const rejectingUser = await storage.getUser(ws.userId);
      const userName = rejectingUser?.callsign || rejectingUser?.fullName || 'User';

      targetClient.send(JSON.stringify({
        type: reason === 'busy' ? 'call_failed' : 'call_rejected',
        payload: {
          callId,
          reason: reason || 'declined',
          message: reason === 'busy' ? `${userName} is currently on another call` : undefined
        }
      }));
      console.log(`[Call] Sent call ${reason === 'busy' ? 'failed (busy)' : 'rejected'} notification to user ${toUserId}`);
    }
  }

  async function handleEndCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId, groupId } = data.payload;
    console.log(`[Call] User ${ws.userId} ended call ${callId}`);

    // Update call history status to ended
    await storage.updateCallStatus(callId, 'ended');

    // Check if it's a group call
    if (callId.includes('group_call_')) {
      console.log(`[Group Call] Handling group call end for ${callId}`);

      // Find the correct active group call for this groupId
      let foundCallId = null;
      for (const [activeCallId, participants] of activeGroupCalls.entries()) {
        if (activeCallId.includes(`_${groupId}_`) && participants.has(ws.userId)) {
          foundCallId = activeCallId;
          break;
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
      // For individual calls, notify specific user
      const targetClient = clients.get(toUserId);
      if (targetClient && targetClient.readyState === targetClient.OPEN) {
        targetClient.send(JSON.stringify({
          type: 'call_ended',
          payload: { callId }
        }));
        console.log(`[Call] Sent call ended notification to user ${toUserId}`);
      }
    }
  }

  async function handleWebRTCReady(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, toUserId } = data.payload;
    console.log(`[WebRTC] User ${ws.userId} is ready for WebRTC on call ${callId}`);

    const targetClient = clients.get(toUserId);
    if (targetClient && targetClient.readyState === targetClient.OPEN) {
      targetClient.send(JSON.stringify({
        type: 'webrtc_ready',
        payload: { callId }
      }));
      console.log(`[WebRTC] Sent ready signal to user ${toUserId}`);
    }
  }

  return {
    handleInitiateCall,
    handleAcceptCall,
    handleRejectCall,
    handleEndCall,
    handleWebRTCReady
  };
}

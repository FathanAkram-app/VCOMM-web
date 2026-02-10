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

export function createGroupCallHandlers(
  storage: IStorage,
  clients: ClientsMap,
  activeGroupCalls: GroupCallsMap
) {
  async function handleStartGroupCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, groupId, groupName, callType, fromUserId, fromUserName } = data.payload;
    console.log(`[Group Call] User ${fromUserId} (${fromUserName}) starting ${callType} group call in group ${groupId} (${groupName})`);

    // Check if there's already an active group call for this group
    let existingCallId = null;
    for (const [activeCallId, participants] of activeGroupCalls.entries()) {
      if (activeCallId.includes(`_${groupId}_`) && participants.size > 0) {
        existingCallId = activeCallId;
        break;
      }
    }

    if (existingCallId) {
      console.log(`[Group Call] Found existing group call ${existingCallId} for group ${groupId}`);
      // Join existing call instead of creating new one
      activeGroupCalls.get(existingCallId)!.add(fromUserId);

      // Get current participants list
      const participants = Array.from(activeGroupCalls.get(existingCallId) || []);
      console.log(`[Group Call] User ${fromUserId} joined existing call, participants:`, participants);

      try {
        // Get group members to notify
        const members = await storage.getConversationMembers(groupId);

        // Send incoming group call notifications to ALL members (not just the joiner)
        // This allows members to see the incoming call modal and choose to join
        let invitationsSent = 0;
        for (const member of members) {
          if (member.userId !== fromUserId) { // Don't send to the person starting the call
            if (sendToAllUserConnections(clients, member.userId, {
                type: 'incoming_group_call',
                payload: {
                  callId: existingCallId,
                  groupId,
                  groupName,
                  callType,
                  fromUserId,
                  fromUserName
                }
              })) {
              invitationsSent++;
              console.log(`[Group Call] Sent group call invitation to user ${member.userId}`);
            }
          }
        }
        console.log(`[Group Call] Sent ${invitationsSent} group call invitations for existing call ${existingCallId}`);

        // Broadcast participant update to all group members
        for (const member of members) {
          sendToAllUserConnections(clients, member.userId, {
            type: 'group_call_participants_update',
            payload: {
              callId: existingCallId,
              participants,
              newParticipant: fromUserId
            }
          });
        }
      } catch (error) {
        console.error(`[Group Call] Error broadcasting participant update:`, error);
      }
      return;
    }

    try {
      // Create new group call with enhanced stability
      activeGroupCalls.set(callId, new Set([fromUserId]));

      // Auto-cleanup abandoned group calls after 30 minutes
      setTimeout(() => {
        if (activeGroupCalls.has(callId)) {
          console.log(`[Group Call] Auto-cleaning up inactive group call ${callId}`);
          activeGroupCalls.delete(callId);
        }
      }, 30 * 60 * 1000);

      // Get group members
      const members = await storage.getConversationMembers(groupId);
      console.log(`[Group Call] Found ${members.length} members in group ${groupId}`);

      // Send group call invitation to all members except the initiator
      let invitationsSent = 0;
      let onlineMembers = 0;

      console.log(`[Group Call] Checking ${members.length} members:`, members.map(m => ({ userId: m.userId, role: m.role })));
      console.log(`[Group Call] Connected clients:`, Array.from(clients.keys()));

      for (const member of members) {
        if (member.userId !== fromUserId) {
          const userClients = clients.get(member.userId);
          const hasConnection = userClients && userClients.size > 0;
          console.log(`[Group Call] Checking member ${member.userId}: hasConnection=${hasConnection}`);

          if (hasConnection) {
            onlineMembers++;

            const inviteMessage = {
              type: 'incoming_group_call',
              payload: {
                callId,
                groupId,
                groupName,
                callType,
                fromUserId,
                fromUserName,
                totalMembers: members.length,
                onlineMembers: onlineMembers + 1, // +1 for initiator
                connectionTimeout: 15000 // 15 second timeout for better UX
              }
            };

            console.log(`[Group Call] 📤 Sending enhanced invite to user ${member.userId}`);
            if (sendToAllUserConnections(clients, member.userId, inviteMessage)) {
              invitationsSent++;
              console.log(`[Group Call] ✅ Sent enhanced group call invitation to user ${member.userId}`);
            }
          } else {
            console.log(`[Group Call] ❌ Cannot send to user ${member.userId}: no active connections`);
          }
        } else {
          console.log(`[Group Call] Skipping initiator ${member.userId}`);
        }
      }

      // Send confirmation to initiator with enhanced info
      sendToAllUserConnections(clients, fromUserId, {
        type: 'group_call_initiated',
        payload: {
          callId,
          groupId,
          totalMembers: members.length,
          onlineMembers: onlineMembers + 1,
          invitationsSent,
          success: true,
          message: `Group call started. ${invitationsSent} invitations sent to online members.`
        }
      });

      console.log(`[Group Call] Enhanced group call ${callId} initiated: ${invitationsSent} invitations sent to ${onlineMembers} online members`);

      // If no invitations were sent, notify the initiator
      if (invitationsSent === 0) {
        sendToAllUserConnections(clients, fromUserId, {
          type: 'group_call_no_participants',
          payload: {
            callId,
            message: 'No group members are currently online to receive the call invitation. Please try again when other members are active.'
          }
        });
        console.log(`[Group Call] ⚠️ Notified initiator ${fromUserId} that no members are online`);
      }

      // Log group call initiation to call history
      await storage.addCallHistory({
        callId,
        callType: `group_${callType}`,
        initiatorId: fromUserId,
        conversationId: groupId,
        participants: [fromUserId.toString()],
        status: 'incoming',
        startTime: new Date(),
        endTime: null,
        duration: null
      });

      // Add the initiator to the group call participants
      if (!activeGroupCalls.has(callId)) {
        activeGroupCalls.set(callId, new Set());
      }
      activeGroupCalls.get(callId)!.add(fromUserId);
      console.log(`[Group Call] Added initiator ${fromUserId} to call ${callId}`);
    } catch (error) {
      console.error(`[Group Call] Error getting group members for group ${groupId}:`, error);
    }
  }

  async function handleJoinGroupCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, groupId, fromUserId } = data.payload;
    const userId = fromUserId || ws.userId; // Use fromUserId from payload or fallback to ws.userId
    console.log(`[Group Call] User ${userId} joining group call ${callId}`);

    // Add user to the group call participants
    if (!activeGroupCalls.has(callId)) {
      activeGroupCalls.set(callId, new Set());
    }
    activeGroupCalls.get(callId)!.add(userId);

    // Get current participants list
    const participants = Array.from(activeGroupCalls.get(callId) || []);
    console.log(`[Group Call] Current participants in ${callId}:`, participants);

    // Update participants in call history
    await storage.updateGroupCallParticipants(callId, participants.map(id => id.toString()));

    try {
      // Send participants update ONLY to current call participants (not all group members)
      console.log(`[Group Call] Sending participant update to ${participants.length} call participants`);

      for (const participantId of participants) {
        const updateMessage = {
          type: 'group_call_participants_update',
          payload: {
            callId,
            participants,
            newParticipant: userId
          }
        };

        if (sendToAllUserConnections(clients, participantId, updateMessage)) {
          console.log(`[Group Call] ✅ Participants update sent to user ${participantId}`);
        } else {
          console.log(`[Group Call] ❌ Cannot send participants update to user ${participantId}: no active connections`);
        }
      }

      // Send ONE initiate_group_webrtc ONLY to the new joiner (after 500ms delay)
      // The new joiner will create offers to all existing participants
      setTimeout(async () => {
        // Resolve display names server-side (#10)
        const participantData = await Promise.all(
          participants.map(async (pId) => {
            const user = await storage.getUser(pId);
            return {
              userId: pId,
              userName: user?.callsign || user?.fullName || `User ${pId}`,
            };
          })
        );

        const webrtcMessage = {
          type: 'initiate_group_webrtc',
          payload: {
            callId,
            participants: participantData,
            timestamp: Date.now()
          }
        };
        console.log(`[Group Call] 🚀 Sending WebRTC initiation to new joiner ${userId}`);
        sendToAllUserConnections(clients, userId, webrtcMessage);
      }, 500);

      console.log(`[Group Call] Broadcasted participant update for call ${callId}`);
    } catch (error) {
      console.error(`[Group Call] Error broadcasting participant update:`, error);
    }
  }

  async function handleLeaveGroupCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId } = data.payload;
    const userId = ws.userId;
    console.log(`[Group Call] User ${userId} leaving group call ${callId}`);

    // Remove user from the group call participants
    if (activeGroupCalls.has(callId)) {
      activeGroupCalls.get(callId)!.delete(userId);

      // Get updated participants list
      const participants = Array.from(activeGroupCalls.get(callId) || []);
      console.log(`[Group Call] Remaining participants in ${callId}:`, participants);

      // If no participants left, remove the call entirely
      if (participants.length === 0) {
        activeGroupCalls.delete(callId);
        console.log(`[Group Call] Call ${callId} has no participants, removing from active calls`);

        // Update call status to ended
        try {
          await storage.updateCallStatus(callId, 'ended');
        } catch (error) {
          console.error('[Group Call] Error updating call status:', error);
        }
      } else {
        // Update participants in call history
        try {
          await storage.updateGroupCallParticipants(callId, participants.map(id => id.toString()));
        } catch (error) {
          console.error('[Group Call] Error updating group call participants:', error);
        }

        // Notify remaining participants that this user left
        participants.forEach(participantId => {
          sendToAllUserConnections(clients, participantId, {
            type: 'participant_left',
            payload: {
              callId,
              userId,
              participants
            }
          });
        });
        console.log(`[Group Call] Notified ${participants.length} participants that user ${userId} left`);
      }
    } else {
      console.log(`[Group Call] Call ${callId} not found in active calls`);
    }
  }

  async function handleRejectGroupCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, groupId, fromUserId, userName } = data.payload;
    console.log(`[Group Call] User ${fromUserId} (${userName}) rejected group call ${callId} in group ${groupId}`);

    try {
      // CRITICAL FIX: Remove rejecting user from active group calls to prevent auto-join
      console.log(`[Group Call] 🚫 Removing user ${fromUserId} from ALL active group calls for group ${groupId}`);

      // Find and remove user from any active group call for this group
      for (const [activeCallId, participants] of activeGroupCalls.entries()) {
        if (activeCallId.includes(`_${groupId}_`) && participants.has(fromUserId)) {
          participants.delete(fromUserId);
          console.log(`[Group Call] 🗑️ Removed user ${fromUserId} from call ${activeCallId}, remaining participants:`, Array.from(participants));

          // If no participants left, remove the call entirely
          if (participants.size === 0) {
            activeGroupCalls.delete(activeCallId);
            console.log(`[Group Call] 🗑️ Removed empty group call ${activeCallId}`);
          }
        }
      }

      // Update call history status to rejected (only for the rejecting user's record)
      await storage.updateCallStatus(callId, 'rejected');

      // Get group members to notify about rejection
      const members = await storage.getConversationMembers(groupId);

      // Notify other group members that this user rejected the call
      let notificationsSent = 0;
      for (const member of members) {
        if (member.userId !== fromUserId) { // Don't send to the person who rejected
          if (sendToAllUserConnections(clients, member.userId, {
            type: 'group_call_rejected',
            payload: {
              callId,
              groupId,
              rejectedByUserId: fromUserId,
              rejectedByUserName: userName
            }
          })) {
            notificationsSent++;
            console.log(`[Group Call] Sent rejection notification to user ${member.userId}`);
          }
        }
      }
      console.log(`[Group Call] Sent ${notificationsSent} group call rejection notifications`);

    } catch (error) {
      console.error('[Group Call] Error handling group call rejection:', error);
    }
  }

  async function handleRequestGroupParticipants(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, groupId, requestingUserId } = data.payload;
    console.log(`[Group Call] User ${requestingUserId} requesting participants for call ${callId}`);

    // Get current participants list
    const participants = Array.from(activeGroupCalls.get(callId) || []);
    console.log(`[Group Call] Current participants in ${callId}:`, participants);

    if (participants.length > 0) {
      try {
        // Get participant names
        const participantNames = await Promise.all(
          participants.map(async (userId) => {
            const user = await storage.getUser(userId);
            return {
              userId: userId,
              userName: user?.callsign || user?.fullName || `User ${userId}`,
              audioEnabled: true,
              videoEnabled: true,
              stream: null
            };
          })
        );

        // Send participant update to requesting user
        const participantUpdateMessage = {
          type: 'group_call_participants_update',
          payload: {
            callId,
            participants: participants,
            participantData: participantNames,
            fullSync: true,
            timestamp: Date.now()
          }
        };

        console.log(`[Group Call] 🔄 Sending participant update to user ${requestingUserId}:`, participantUpdateMessage);
        sendToAllUserConnections(clients, requestingUserId, participantUpdateMessage);

      } catch (error) {
        console.error(`[Group Call] Error processing participant request:`, error);
      }
    } else {
      console.log(`[Group Call] No participants found for call ${callId}`);
    }
  }

  return {
    handleStartGroupCall,
    handleJoinGroupCall,
    handleLeaveGroupCall,
    handleRejectGroupCall,
    handleRequestGroupParticipants
  };
}

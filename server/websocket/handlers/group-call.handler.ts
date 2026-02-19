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

// Reverse lookup: find active group call for a given conversationId
export function getActiveCallForConversation(
  activeGroupCalls: GroupCallsMap,
  callConversationMap: Map<string, number>,
  conversationId: number
): { callId: string; participants: number[] } | null {
  // Use the callConversationMap for reliable lookup
  for (const [callId, convId] of callConversationMap.entries()) {
    if (convId === conversationId && activeGroupCalls.has(callId)) {
      const participantSet = activeGroupCalls.get(callId)!;
      if (participantSet.size > 0) {
        return {
          callId,
          participants: Array.from(participantSet),
        };
      }
    }
  }
  return null;
}

export function createGroupCallHandlers(
  storage: IStorage,
  clients: ClientsMap,
  activeGroupCalls: GroupCallsMap,
  callConversationMap: Map<string, number>
) {
  async function handleStartGroupCall(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    const { callId, groupId, groupName, callType, fromUserId, fromUserName } = data.payload;
    console.log(`[Group Call] User ${fromUserId} (${fromUserName}) starting ${callType} group call in group ${groupId} (${groupName})`);

    // Check if there's already an active group call for this group using the conversation map
    let existingCallId = null;
    for (const [activeCallId, convId] of callConversationMap.entries()) {
      if (convId === groupId && activeGroupCalls.has(activeCallId) && activeGroupCalls.get(activeCallId)!.size > 0) {
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

        // Send incoming group call notifications ONLY to members NOT already in the call
        // Members already in the call would reject the notification, which would
        // incorrectly remove them from the participant set
        const existingParticipants = activeGroupCalls.get(existingCallId)!;
        let invitationsSent = 0;
        for (const member of members) {
          // Skip the rejoiner AND anyone already in the call
          if (member.userId !== fromUserId && !existingParticipants.has(member.userId)) {
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

        // Resolve participant names server-side
        const participantData = await Promise.all(
          participants.map(async (pId: number) => {
            const u = await storage.getUser(pId);
            return { userId: pId, userName: u?.callsign || u?.fullName || `User ${pId}` };
          })
        );

        // Broadcast participant update to all group members (with names)
        for (const member of members) {
          sendToAllUserConnections(clients, member.userId, {
            type: 'group_call_participants_update',
            payload: {
              callId: existingCallId,
              participants,
              participantData,
              newParticipant: fromUserId
            }
          });
        }

        // Send group_call_initiated to the rejoiner with the EXISTING callId
        // so the mobile app can update its local state
        sendToAllUserConnections(clients, fromUserId, {
          type: 'group_call_initiated',
          payload: {
            callId: existingCallId,
            originalCallId: callId, // The callId the mobile sent (so it knows to update)
            groupId,
            totalMembers: members.length,
            onlineMembers: participants.length,
            invitationsSent,
            success: true,
            isRejoin: true,
            message: `Joined existing group call with ${participants.length} participants.`
          }
        });

        // Send initiate_group_webrtc to the rejoiner after a delay
        // so they know which participants to create WebRTC connections with
        setTimeout(async () => {
          const participantData = await Promise.all(
            participants.map(async (pId) => {
              const user = await storage.getUser(pId);
              return {
                userId: pId,
                userName: user?.callsign || user?.fullName || `User ${pId}`,
              };
            })
          );

          sendToAllUserConnections(clients, fromUserId, {
            type: 'initiate_group_webrtc',
            payload: {
              callId: existingCallId,
              participants: participantData,
              timestamp: Date.now()
            }
          });
          console.log(`[Group Call] 🚀 Sent WebRTC initiation to rejoiner ${fromUserId} for existing call ${existingCallId}`);
        }, 500);

      } catch (error) {
        console.error(`[Group Call] Error broadcasting participant update:`, error);
      }
      return;
    }

    try {
      // Create new group call with enhanced stability
      activeGroupCalls.set(callId, new Set([fromUserId]));
      callConversationMap.set(callId, groupId);
      console.log(`[Group Call] Mapped callId ${callId} → conversationId ${groupId}`);

      // Auto-cleanup abandoned group calls after 30 minutes
      setTimeout(() => {
        if (activeGroupCalls.has(callId)) {
          console.log(`[Group Call] Auto-cleaning up inactive group call ${callId}`);
          activeGroupCalls.delete(callId);
          callConversationMap.delete(callId);
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

    const { callId: requestedCallId, groupId, fromUserId } = data.payload;
    const userId = fromUserId || ws.userId; // Use fromUserId from payload or fallback to ws.userId
    console.log(`[Group Call] User ${userId} joining group call ${requestedCallId}`);

    // Resolve the actual callId — if the requested callId doesn't exist,
    // look up by groupId in the callConversationMap (handles rejoin case
    // where mobile sends a locally-generated callId)
    let callId = requestedCallId;
    if (!activeGroupCalls.has(callId) && groupId) {
      for (const [activeCallId, convId] of callConversationMap.entries()) {
        if (convId === groupId && activeGroupCalls.has(activeCallId) && activeGroupCalls.get(activeCallId)!.size > 0) {
          console.log(`[Group Call] Resolved callId ${callId} → existing ${activeCallId} via groupId ${groupId}`);
          callId = activeCallId;
          break;
        }
      }
    }

    // Check if user is already a participant (e.g., handleStartGroupCall already added them for rejoin)
    const alreadyInCall = activeGroupCalls.has(callId) && activeGroupCalls.get(callId)!.has(userId);

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

    // If user was already added by handleStartGroupCall (rejoin case), skip duplicate WebRTC initiation
    if (alreadyInCall) {
      console.log(`[Group Call] User ${userId} already in call ${callId} (rejoin), skipping duplicate WebRTC init`);
      return;
    }

    try {
      // Resolve participant names server-side
      const participantData = await Promise.all(
        participants.map(async (pId: number) => {
          const u = await storage.getUser(pId);
          return { userId: pId, userName: u?.callsign || u?.fullName || `User ${pId}` };
        })
      );

      // Send participants update ONLY to current call participants (with names)
      console.log(`[Group Call] Sending participant update to ${participants.length} call participants`);

      for (const participantId of participants) {
        const updateMessage = {
          type: 'group_call_participants_update',
          payload: {
            callId,
            participants,
            participantData,
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
    // Get the conversationId from the map before we potentially delete it
    const conversationIdForCall = callConversationMap.get(callId);
    console.log(`[Group Call] User ${userId} leaving group call ${callId} (conversation: ${conversationIdForCall})`);

    // Remove user from the group call participants
    if (activeGroupCalls.has(callId)) {
      activeGroupCalls.get(callId)!.delete(userId);

      // Get updated participants list
      const participants = Array.from(activeGroupCalls.get(callId) || []);
      console.log(`[Group Call] Remaining participants in ${callId}:`, participants);

      // If no participants left, remove the call entirely
      if (participants.length === 0) {
        activeGroupCalls.delete(callId);
        callConversationMap.delete(callId);
        console.log(`[Group Call] Call ${callId} has no participants, removing from active calls`);

        // Update call status to ended
        try {
          await storage.updateCallStatus(callId, 'ended');
        } catch (error) {
          console.error('[Group Call] Error updating call status:', error);
        }

        // Broadcast group_call_ended to all conversation members
        if (conversationIdForCall) {
          try {
            const members = await storage.getConversationMembers(conversationIdForCall);
            for (const member of members) {
              sendToAllUserConnections(clients, member.userId, {
                type: 'group_call_ended',
                payload: { callId, groupId: conversationIdForCall }
              });
            }
            console.log(`[Group Call] Broadcasted group_call_ended for call ${callId}`);
          } catch (error) {
            console.error('[Group Call] Error broadcasting group_call_ended:', error);
          }
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
      for (const [activeCallId, convId] of callConversationMap.entries()) {
        if (convId === groupId && activeGroupCalls.has(activeCallId)) {
          const participants = activeGroupCalls.get(activeCallId)!;
          if (participants.has(fromUserId)) {
            participants.delete(fromUserId);
            console.log(`[Group Call] 🗑️ Removed user ${fromUserId} from call ${activeCallId}, remaining participants:`, Array.from(participants));

            // If no participants left, remove the call entirely
            if (participants.size === 0) {
              activeGroupCalls.delete(activeCallId);
              callConversationMap.delete(activeCallId);
              console.log(`[Group Call] 🗑️ Removed empty group call ${activeCallId}`);
            }
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

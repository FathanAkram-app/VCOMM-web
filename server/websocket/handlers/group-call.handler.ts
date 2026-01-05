import { WebSocket } from 'ws';
import { IStorage } from '../../storage';
import { AuthenticatedWebSocket, ClientsMap, GroupCallsMap } from '../utils/types';
import { sendToClient } from '../utils/send';

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
            const targetClient = clients.get(member.userId);
            if (targetClient && targetClient.readyState === targetClient.OPEN) {
              targetClient.send(JSON.stringify({
                type: 'incoming_group_call',
                payload: {
                  callId: existingCallId,
                  groupId,
                  groupName,
                  callType,
                  fromUserId,
                  fromUserName
                }
              }));
              invitationsSent++;
              console.log(`[Group Call] Sent group call invitation to user ${member.userId}`);
            }
          }
        }
        console.log(`[Group Call] Sent ${invitationsSent} group call invitations for existing call ${existingCallId}`);

        // Broadcast participant update to all group members
        for (const member of members) {
          const targetClient = clients.get(member.userId);
          if (targetClient && targetClient.readyState === targetClient.OPEN) {
            targetClient.send(JSON.stringify({
              type: 'group_call_participants_update',
              payload: {
                callId: existingCallId,
                participants,
                newParticipant: fromUserId
              }
            }));
          }
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
          const targetClient = clients.get(member.userId);
          console.log(`[Group Call] Checking member ${member.userId}: client=${!!targetClient}, readyState=${targetClient?.readyState}`);

          if (targetClient && targetClient.readyState === targetClient.OPEN) {
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
            targetClient.send(JSON.stringify(inviteMessage));
            invitationsSent++;
            console.log(`[Group Call] ✅ Sent enhanced group call invitation to user ${member.userId}`);
          } else {
            console.log(`[Group Call] ❌ Cannot send to user ${member.userId}: client=${!!targetClient}, readyState=${targetClient?.readyState || 'N/A'}`);
          }
        } else {
          console.log(`[Group Call] Skipping initiator ${member.userId}`);
        }
      }

      // Send confirmation to initiator with enhanced info
      const initiatorClient = clients.get(fromUserId);
      if (initiatorClient && initiatorClient.readyState === initiatorClient.OPEN) {
        initiatorClient.send(JSON.stringify({
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
        }));
      }

      console.log(`[Group Call] Enhanced group call ${callId} initiated: ${invitationsSent} invitations sent to ${onlineMembers} online members`);

      // If no invitations were sent, notify the initiator
      if (invitationsSent === 0) {
        if (initiatorClient && initiatorClient.readyState === initiatorClient.OPEN) {
          initiatorClient.send(JSON.stringify({
            type: 'group_call_no_participants',
            payload: {
              callId,
              message: 'No group members are currently online to receive the call invitation. Please try again when other members are active.'
            }
          }));
          console.log(`[Group Call] ⚠️ Notified initiator ${fromUserId} that no members are online`);
        }
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
      // Get group members to notify
      const members = await storage.getConversationMembers(groupId);

      // Broadcast participant update to all group members
      console.log(`[Group Call] Broadcasting participant update to ${members.length} members for call ${callId}`);
      console.log(`[Group Call] Participants to broadcast:`, participants);

      for (const member of members) {
        const targetClient = clients.get(member.userId);
        if (targetClient && targetClient.readyState === targetClient.OPEN) {
          const updateMessage = {
            type: 'group_call_participants_update',
            payload: {
              callId,
              participants,
              newParticipant: userId
            }
          };

          console.log(`[Group Call] 📤 Sending participants update to user ${member.userId}:`, updateMessage);
          targetClient.send(JSON.stringify(updateMessage));
          console.log(`[Group Call] ✅ Participants update sent to user ${member.userId}`);

          // 🚀 CRITICAL FIX: Force bidirectional WebRTC initiation for new members
          // This ensures all existing members can see the new member that just joined
          setTimeout(() => {
            const webrtcMessage = {
              type: 'initiate_group_webrtc',
              payload: {
                callId,
                participants: participants.map(p => ({ userId: p, userName: `User ${p}` })),
                forceInit: true,
                newMember: userId, // Mark who is the new member
                timestamp: Date.now()
              }
            };

            console.log(`[Group Call] 🔄 Forcing WebRTC initiation for user ${member.userId} due to new member ${userId}`);
            targetClient.send(JSON.stringify(webrtcMessage));
          }, 500); // Small delay to ensure participant update is processed first

          // 🔥 NEW: Additional force reconnect for better synchronization
          setTimeout(() => {
            const forceReconnectMessage = {
              type: 'force_webrtc_reconnect',
              payload: {
                callId,
                participants: participants.map(p => ({ userId: p, userName: `User ${p}` })),
                newMember: userId,
                forceInit: true,
                timestamp: Date.now()
              }
            };

            console.log(`[Group Call] 🔥 Sending force reconnect to user ${member.userId} for new member ${userId}`);
            targetClient.send(JSON.stringify(forceReconnectMessage));
          }, 1000); // 1 second delay
        } else {
          console.log(`[Group Call] ❌ Cannot send participants update to user ${member.userId}: client=${!!targetClient}, readyState=${targetClient?.readyState || 'N/A'}`);
        }
      }

      // 🔥 NEW: Auto-initiate WebRTC connections for group calls
      // After broadcasting participants, automatically trigger WebRTC setup
      console.log(`[Group Call] 🚀 Auto-initiating WebRTC for ${participants.length} participants`);

      // Send WebRTC initiation signals to all participants
      for (const participantId of participants) {
        const participantClient = clients.get(participantId);
        if (participantClient && participantClient.readyState === participantClient.OPEN) {
          const webrtcInitMessage = {
            type: 'initiate_group_webrtc',
            payload: {
              callId,
              allParticipants: participants,
              yourUserId: participantId
            }
          };

          console.log(`[Group Call] 🎯 Sending WebRTC initiation to user ${participantId}`);
          participantClient.send(JSON.stringify(webrtcInitMessage));
        }
      }
      console.log(`[Group Call] Broadcasted participant update for call ${callId}`);

      // 🔥 CRITICAL FIX: Send detailed participant data to new member
      // This ensures the new member can see all existing participants
      setTimeout(async () => {
        try {
          console.log(`[Group Call] 🎯 Sending detailed participant data to new member ${userId}`);

          // Get user data for all participants
          const participantData = [];
          for (const participantId of participants) {
            try {
              const userData = await storage.getUser(participantId.toString());
              participantData.push({
                userId: participantId,
                userName: userData?.callsign || userData?.fullName || `User ${participantId}`,
                audioEnabled: true,
                videoEnabled: data.payload.callType === 'video'
              });
            } catch (error) {
              console.error(`[Group Call] Error getting user data for ${participantId}:`, error);
              participantData.push({
                userId: participantId,
                userName: `User ${participantId}`,
                audioEnabled: true,
                videoEnabled: data.payload.callType === 'video'
              });
            }
          }

          // Send detailed participant update to new member
          const detailedUpdateMessage = {
            type: 'group_call_participants_update',
            payload: {
              callId,
              participants: participantData,
              isNewMember: true,
              fullSync: true // Flag to indicate this is a full sync for new member
            }
          };

          console.log(`[Group Call] 📤 Sending detailed participant data to new member ${userId}:`, detailedUpdateMessage);
          const newMemberClient = clients.get(userId);
          if (newMemberClient && newMemberClient.readyState === newMemberClient.OPEN) {
            newMemberClient.send(JSON.stringify(detailedUpdateMessage));

            // Also send force WebRTC initiation to new member
            setTimeout(() => {
              const webrtcMessage = {
                type: 'initiate_group_webrtc',
                payload: {
                  callId,
                  participants: participantData,
                  forceInit: true,
                  isNewMember: true,
                  timestamp: Date.now()
                }
              };

              console.log(`[Group Call] 🚀 Forcing WebRTC initiation for new member ${userId}`);
              newMemberClient.send(JSON.stringify(webrtcMessage));
            }, 500);

            // Additional force reconnect for new member
            setTimeout(() => {
              const forceReconnectMessage = {
                type: 'force_webrtc_reconnect',
                payload: {
                  callId,
                  participants: participantData,
                  isNewMember: true,
                  forceInit: true,
                  timestamp: Date.now()
                }
              };

              console.log(`[Group Call] 🔥 Sending force reconnect to new member ${userId}`);
              newMemberClient.send(JSON.stringify(forceReconnectMessage));
            }, 1500);
          }

        } catch (error) {
          console.error(`[Group Call] Error sending detailed participant data to new member:`, error);
        }
      }, 1000); // 1 second delay to ensure everything is set up

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
          const participantClient = clients.get(participantId);
          if (participantClient && participantClient.readyState === participantClient.OPEN) {
            participantClient.send(JSON.stringify({
              type: 'participant_left',
              payload: {
                callId,
                userId,
                participants
              }
            }));
          }
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
          const targetClient = clients.get(member.userId);
          if (targetClient && targetClient.readyState === targetClient.OPEN) {
            targetClient.send(JSON.stringify({
              type: 'group_call_rejected',
              payload: {
                callId,
                groupId,
                rejectedByUserId: fromUserId,
                rejectedByUserName: userName
              }
            }));
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
            const user = await storage.getUser(userId.toString());
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
        const requestingClient = clients.get(requestingUserId);
        if (requestingClient && requestingClient.readyState === requestingClient.OPEN) {
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
          requestingClient.send(JSON.stringify(participantUpdateMessage));
        }

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

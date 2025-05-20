// Handle call-related messages from any WebSocket connection
const handleCallMessage = async (client: WebSocketClient, data: any, ws: WebSocket, clients: WebSocketClient[], chatClients: WebSocketClient[], voiceCallClients: WebSocketClient[], videoCallClients: WebSocketClient[]) => {
  // Process call-related messages
  switch (data.type) {
    case 'call_offer':
      // Initiate a call
      if (!data.targetId || !data.sdp || !data.callType) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid call data' }));
        return;
      }
      
      try {
        // Create call record
        const callData = {
          callerId: client.userId,
          receiverId: data.isRoom ? undefined : data.targetId,
          roomId: data.isRoom ? data.targetId : undefined,
          type: data.callType || 'video',
          status: 'pending',
        };
        
        const call = await storage.createCall(callData);
        
        // Send offer to target user(s)
        if (data.isRoom) {
          // Group call - send to all room members
          const roomMembers = await storage.getRoomMembers(data.targetId);
          const caller = await storage.getUser(client.userId);
          
          if (!caller) {
            ws.send(JSON.stringify({ type: 'error', message: 'Caller not found' }));
            return;
          }
          
          const roomData = await storage.getRoom(data.targetId);
          if (!roomData) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            return;
          }
          
          // Send to all members except caller using intelligent routing
          for (const member of roomMembers) {
            if (member.id !== client.userId) {
              sendDirectMessage(member.id, {
                type: 'call_incoming',
                call: {
                  id: call.id,
                  callType: data.callType,
                  isRoom: true,
                  roomId: data.targetId,
                  roomName: roomData.name,
                  caller: {
                    id: caller.id,
                    username: caller.username,
                  },
                  sdp: data.sdp,
                },
              });
            }
          }
        } else {
          // Direct call - send to recipient
          const caller = await storage.getUser(client.userId);
          
          if (!caller) {
            ws.send(JSON.stringify({ type: 'error', message: 'Caller not found' }));
            return;
          }
          
          // Use intelligent routing to send to the appropriate client connection
          sendDirectMessage(data.targetId, {
            type: 'call_incoming',
            call: {
              id: call.id,
              callType: data.callType,
              isRoom: false,
              caller: {
                id: caller.id,
                username: caller.username,
              },
              sdp: data.sdp,
            },
          });
        }
        
        // Return call data to caller
        ws.send(JSON.stringify({
          type: 'call_initiated',
          callId: call.id,
        }));
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to initiate call' }));
      }
      break;
    
    case 'call_answer':
      // Answer a call
      if (!data.callId || !data.sdp) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid answer data' }));
        return;
      }
      
      try {
        // Update call status
        await storage.updateCallStatus(data.callId, 'answered');
        
        // Get call details
        const call = await storage.getCall(data.callId);
        
        if (!call) {
          ws.send(JSON.stringify({ type: 'error', message: 'Call not found' }));
          return;
        }
        
        // Send answer to caller using intelligent routing
        sendDirectMessage(call.callerId, {
          type: 'call_answered',
          callId: data.callId,
          userId: client.userId,
          callType: call.type, // 'audio' or 'video'
          sdp: data.sdp,
        });
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to answer call' }));
      }
      break;
    
    case 'call_ice_candidate':
      // Exchange ICE candidates
      if (!data.targetId || !data.candidate) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid ICE candidate data' }));
        return;
      }
      
      try {
        // Use intelligent routing to send ICE candidate to the appropriate connection
        sendDirectMessage(data.targetId, {
          type: 'call_ice_candidate',
          userId: client.userId,
          candidate: data.candidate
        });
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to exchange ICE candidate' }));
      }
      break;
    
    case 'call_end':
      // End a call
      if (!data.callId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid request' }));
        return;
      }
      
      try {
        // Update call status and record end time
        const endTime = new Date();
        const call = await storage.getCall(data.callId);
        
        if (!call) {
          ws.send(JSON.stringify({ type: 'error', message: 'Call not found' }));
          return;
        }
        
        // Calculate duration - use 0 if startTime is null to avoid errors
        const duration = call.startTime ? Math.floor((endTime.getTime() - call.startTime.getTime()) / 1000) : 0;
        
        await storage.updateCallStatus(data.callId, 'ended', endTime, duration);
        
        if (call.receiverId) {
          // Direct call
          const otherUserId = call.callerId === client.userId ? call.receiverId : call.callerId;
          
          // Notify other user that call has ended
          sendDirectMessage(otherUserId, {
            type: 'call_ended',
            callId: data.callId,
            reason: data.reason || 'Call ended by user',
          });
        } else if (call.roomId) {
          // Group call
          const roomMembers = await storage.getRoomMembers(call.roomId);
          
          // Notify all room members except the one ending the call
          for (const member of roomMembers) {
            if (member.id !== client.userId) {
              sendDirectMessage(member.id, {
                type: 'call_ended',
                callId: data.callId,
                reason: data.reason || 'Call ended by user',
              });
            }
          }
        }
        
        ws.send(JSON.stringify({
          type: 'call_end_success',
          callId: data.callId,
        }));
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to end call' }));
      }
      break;
    
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown call message type' }));
  }
};
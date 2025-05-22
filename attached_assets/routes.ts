import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { seedMockData } from "./mockData";
import { 
  insertUserSchema, insertRoomSchema, insertRoomMemberSchema, 
  insertDirectChatSchema, insertMessageSchema, insertCallSchema 
} from "@shared/schema";

// Client connection tracking
interface WebSocketClient {
  userId: number;
  socket: WebSocket;
  lastHeartbeat: number;
}

// Group call management structures
interface GroupCallParticipant {
  userId: number;
  callType: 'video' | 'audio';
  peerId?: string; // Optional peer ID for WebRTC connections
  joinedAt: Date;
}

interface GroupCall {
  roomId: number;
  callId: number;
  callType: 'video' | 'audio';
  participants: GroupCallParticipant[];
  startTime: Date;
  endTime?: Date;
  active: boolean;
}

// Active group calls collection
const activeGroupCalls: Map<number, GroupCall> = new Map();

// Forward declarations
let sendDirectMessage: (userId: number, message: any) => Promise<void>;


export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  // Seed mock data only in development mode
  if (process.env.NODE_ENV === "development") {
    console.log("Seeding mock data for testing...");
    await seedMockData();
    console.log("Mock data seeding complete.");
  }
  
  const httpServer = createServer(app);
  
  // Create separate WebSocket servers for different functions
  const chatWss = new WebSocketServer({ server: httpServer, path: '/ws/chat' });
  const voiceCallWss = new WebSocketServer({ server: httpServer, path: '/ws/call/voice' });
  const videoCallWss = new WebSocketServer({ server: httpServer, path: '/ws/call/video' });
  
  // For backward compatibility during migration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Track connected clients - separate collections for each WebSocket type
  const clients: WebSocketClient[] = []; // Legacy clients
  const chatClients: WebSocketClient[] = [];
  const voiceCallClients: WebSocketClient[] = [];
  const videoCallClients: WebSocketClient[] = [];
  
  // Set up chat WebSocket server handlers
  chatWss.on('connection', (ws) => {
    let client: WebSocketClient | undefined;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Common auth handling similar to main WebSocket handler
        if (data.type === 'auth') {
          // Authenticate user
          if (!data.username || !data.password) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid authentication data' }));
            return;
          }
          
          let user = await storage.getUserByUsername(data.username);
          if (!user) {
            // Create new user
            user = await storage.createUser({
              username: data.username,
              password: data.password,
              deviceInfo: data.deviceInfo || 'Unknown device',
            });
          } else {
            // Update online status
            user = await storage.updateUserOnlineStatus(user.id, true);
          }
          
          // Create client and add to chat clients
          client = {
            userId: user.id,
            socket: ws,
            lastHeartbeat: Date.now(),
          };
          chatClients.push(client);
          
          // Send auth success response with user data
          ws.send(JSON.stringify({
            type: 'auth_success',
            user: { id: user.id, username: user.username, isOnline: user.isOnline, deviceInfo: user.deviceInfo },
          }));
          
          // Broadcast online users update
          broadcastOnlineUsers();
        }
        
        // Handle chat-specific message types here
        // For now, these would be the same as the main WebSocket handler's message functionality
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      if (client) {
        // Remove client from chat clients list
        const index = chatClients.findIndex(c => c.userId === client?.userId);
        if (index !== -1) {
          chatClients.splice(index, 1);
        }
        
        // Update user online status
        storage.updateUserOnlineStatus(client.userId, false)
          .then(() => broadcastOnlineUsers())
          .catch(err => console.error('Error updating user status:', err));
      }
    });
  });
  
  // Set up voice call WebSocket server handlers
  voiceCallWss.on('connection', (ws) => {
    let client: WebSocketClient | undefined;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Auth handling similar to main handler
        if (data.type === 'auth') {
          let user;
          
          // Check if username is provided
          if (!data.username) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid authentication data' }));
            return;
          }
          
          // Allow for sessionless authentication during development
          user = await storage.getUserByUsername(data.username);
          if (!user) {
            // Only create a new user if password is provided (in development)
            if (data.password) {
              user = await storage.createUser({
                username: data.username,
                password: data.password,
                deviceInfo: data.deviceInfo || 'Unknown device',
              });
            } else {
              ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
              return;
            }
          }
          
          // Update online status
          await storage.updateUserOnlineStatus(user.id, true);
          
          // Create client and add to voice call clients
          client = {
            userId: user.id,
            socket: ws,
            lastHeartbeat: Date.now(),
          };
          voiceCallClients.push(client);
          
          // Send auth success response
          ws.send(JSON.stringify({
            type: 'auth_success',
            user: { id: user.id, username: user.username, isOnline: user.isOnline, deviceInfo: user.deviceInfo },
          }));
        }
        
        // Handle voice call specific message types
        // Will primarily deal with WebRTC signaling for audio-only calls
        if (client && data.type) {
          // Handle according to message type
          switch (data.type) {
            case 'call_offer':
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
                  type: data.callType || 'audio', // Force audio for voice call socket
                  status: 'pending',
                };
                
                const call = await storage.createCall(callData);
                
                // Forward to main message handler which already has intelligent routing
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
                  
                  // Send to all members except caller
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
                  callType: call.type,
                  sdp: data.sdp,
                });
              } catch (err) {
                ws.send(JSON.stringify({ type: 'error', message: 'Failed to answer call' }));
              }
              break;
              
            case 'call_ice_candidate':
              if (!data.targetId || !data.candidate) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid ICE candidate data' }));
                return;
              }
              
              try {
                // Use intelligent routing to send ICE candidate
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
                
                // Calculate duration safely
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
          }
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      if (client) {
        // Remove client from voice call clients list
        const index = voiceCallClients.findIndex(c => c.userId === client?.userId);
        if (index !== -1) {
          voiceCallClients.splice(index, 1);
        }
        
        // We don't update user online status here as they may still be connected to other WebSockets
      }
    });
  });
  
  // Set up video call WebSocket server handlers
  videoCallWss.on('connection', (ws) => {
    let client: WebSocketClient | undefined;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Auth handling similar to main handler
        if (data.type === 'auth') {
          let user;
          
          // Check if username is provided
          if (!data.username) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid authentication data' }));
            return;
          }
          
          // Allow for sessionless authentication during development
          user = await storage.getUserByUsername(data.username);
          if (!user) {
            // Only create a new user if password is provided (in development)
            if (data.password) {
              user = await storage.createUser({
                username: data.username,
                password: data.password,
                deviceInfo: data.deviceInfo || 'Unknown device',
              });
            } else {
              ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
              return;
            }
          }
          
          // Update online status
          await storage.updateUserOnlineStatus(user.id, true);
          
          // Create client and add to video call clients
          client = {
            userId: user.id,
            socket: ws,
            lastHeartbeat: Date.now(),
          };
          videoCallClients.push(client);
          
          // Send auth success response
          ws.send(JSON.stringify({
            type: 'auth_success',
            user: { id: user.id, username: user.username, isOnline: user.isOnline, deviceInfo: user.deviceInfo },
          }));
        }
        
        // Handle video call specific message types
        // Will primarily deal with WebRTC signaling for video calls
        if (client && data.type) {
          // Handle according to message type
          switch (data.type) {
            // Group call specific handlers for server-managed approach
            case 'group_call_offer':
              if (!data.roomId || !data.peerId || !data.sdp || !data.callType) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid group call offer data' }));
                return;
              }
              
              // Safety check: ensure client is defined
              if (!client) {
                ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
                return;
              }
              
              try {
                // Get room details 
                const room = await storage.getRoom(data.roomId);
                if (!room) {
                  ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
                  return;
                }
                
                // Find or create a group call for this room
                let groupCall = activeGroupCalls.get(data.roomId);
                if (!groupCall) {
                  // Create a new call record in the database
                  const call = await storage.createCall({
                    callerId: client.userId,
                    roomId: data.roomId,
                    type: data.callType,
                    status: 'active'
                  });
                  
                  // Create a new group call in memory
                  groupCall = {
                    roomId: data.roomId,
                    callId: call.id,
                    callType: data.callType as 'video' | 'audio',
                    participants: [{
                      userId: client.userId,
                      callType: data.callType as 'video' | 'audio',
                      joinedAt: new Date()
                    }],
                    startTime: new Date(),
                    active: true
                  };
                  
                  activeGroupCalls.set(data.roomId, groupCall);
                  
                  console.log(`New group ${data.callType} call created for room ${data.roomId}`);
                  
                  // Notify all room members about the new call (except initiator) using multi-path delivery
                  const roomMembers = await storage.getRoomMembers(data.roomId);
                  const callStartMessage = {
                    type: 'group_call_started',
                    roomId: data.roomId,
                    callId: call.id,
                    callType: data.callType,
                    initiator: client.userId
                  };
                  
                  console.log(`Broadcasting new group ${data.callType} call started in room ${data.roomId} by user ${client.userId}`);
                  
                  // Send to all members except the initiator
                  for (const member of roomMembers) {
                    if (member.id !== client.userId) {
                      // Flag to track delivery
                      let memberNotified = false;
                      
                      // 1. Try appropriate call-type specific connection
                      const targetClients = data.callType === 'video' ? videoCallClients : voiceCallClients;
                      const targetClient = targetClients.find(c => c.userId === member.id);
                      if (targetClient && targetClient.socket.readyState === WebSocket.OPEN) {
                        targetClient.socket.send(JSON.stringify(callStartMessage));
                        memberNotified = true;
                      }
                      
                      // 2. Try the alternate call-type as backup
                      const backupClients = data.callType === 'video' ? voiceCallClients : videoCallClients;
                      const backupClient = backupClients.find(c => c.userId === member.id);
                      if (backupClient && backupClient.socket.readyState === WebSocket.OPEN) {
                        backupClient.socket.send(JSON.stringify(callStartMessage));
                        memberNotified = true;
                      }
                      
                      // 3. Try chat connection as another backup
                      const chatClient = chatClients.find(c => c.userId === member.id);
                      if (chatClient && chatClient.socket.readyState === WebSocket.OPEN) {
                        chatClient.socket.send(JSON.stringify(callStartMessage));
                        memberNotified = true;
                      }
                      
                      // 4. Try legacy connection as another backup
                      const legacyClient = clients.find(c => c.userId === member.id);
                      if (legacyClient && legacyClient.socket.readyState === WebSocket.OPEN) {
                        legacyClient.socket.send(JSON.stringify(callStartMessage));
                        memberNotified = true;
                      }
                      
                      // 5. Finally fallback to direct message routing as last resort
                      if (!memberNotified) {
                        sendDirectMessage(member.id, callStartMessage);
                      }
                    }
                  }
                  
                  console.log(`Group call start notifications sent to all room members`);
                } else {
                  // Add this user to the participants if they're not already there
                  if (!groupCall.participants.some(p => p.userId === client.userId)) {
                    groupCall.participants.push({
                      userId: client.userId,
                      callType: data.callType as 'video' | 'audio',
                      joinedAt: new Date()
                    });
                  }
                }
                
                // Forward the offer to the specific peer - using multi-path approach for reliability
                const offerMessage = {
                  type: 'group_call_offer',
                  roomId: data.roomId,
                  peerId: client.userId, // Sender's ID
                  sdp: data.sdp,
                  callType: data.callType
                };
                
                console.log(`Processing group ${data.callType} call offer from ${client.userId} to ${data.peerId} in room ${data.roomId}`);
                
                // IMPROVED: Multi-path delivery for group call offers
                let delivered = false;
                
                // 1. Try the appropriate specialized client collection based on call type
                const targetClients = data.callType === 'video' ? videoCallClients : voiceCallClients;
                const targetClient = targetClients.find(c => c.userId === data.peerId);
                
                if (targetClient && targetClient.socket.readyState === WebSocket.OPEN) {
                  targetClient.socket.send(JSON.stringify(offerMessage));
                  console.log(`Group call offer sent via primary ${data.callType} channel`);
                  delivered = true;
                }
                
                // 2. Try the other specialized client collection as backup
                const backupClients = data.callType === 'video' ? voiceCallClients : videoCallClients;
                const backupClient = backupClients.find(c => c.userId === data.peerId);
                
                if (backupClient && backupClient.socket.readyState === WebSocket.OPEN) {
                  backupClient.socket.send(JSON.stringify(offerMessage));
                  console.log(`Group call offer sent via backup ${data.callType === 'video' ? 'voice' : 'video'} channel`);
                  delivered = true;
                }
                
                // 3. Try the standard chat clients as another backup channel
                const chatClient = chatClients.find(c => c.userId === data.peerId);
                if (chatClient && chatClient.socket.readyState === WebSocket.OPEN) {
                  chatClient.socket.send(JSON.stringify(offerMessage));
                  console.log(`Group call offer sent via chat channel backup`);
                  delivered = true;
                }
                
                // 4. Try the legacy clients as a last resort
                const legacyClient = clients.find(c => c.userId === data.peerId);
                if (legacyClient && legacyClient.socket.readyState === WebSocket.OPEN) {
                  legacyClient.socket.send(JSON.stringify(offerMessage));
                  console.log(`Group call offer sent via legacy channel backup`);
                  delivered = true;
                }
                
                // 5. Finally use the generalized routing mechanism
                if (!delivered) {
                  // Use the standard direct message function as a fallback
                  sendDirectMessage(data.peerId, offerMessage);
                  console.log(`Group call offer sent via general routing`);
                }
                
                console.log(`Group call offer from ${client.userId} to ${data.peerId} in room ${data.roomId} forwarding complete`);
                
                // Return success to the caller
                ws.send(JSON.stringify({
                  type: 'group_call_offer_sent',
                  peerId: data.peerId
                }));
                
              } catch (error) {
                console.error('Error handling group call offer:', error);
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Failed to process group call offer' 
                }));
              }
              break;
              
            case 'group_call_answer':
              if (!data.roomId || !data.peerId || !data.sdp || !data.callType) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid group call answer data' }));
                return;
              }
              
              // Safety check: ensure client is defined
              if (!client) {
                ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
                return;
              }
              
              try {
                // Get the group call
                const groupCall = activeGroupCalls.get(data.roomId);
                if (!groupCall) {
                  ws.send(JSON.stringify({ type: 'error', message: 'Group call not found' }));
                  return;
                }
                
                // Add this user to participants if not already there
                if (!groupCall.participants.some(p => p.userId === client.userId)) {
                  groupCall.participants.push({
                    userId: client.userId,
                    callType: data.callType as 'video' | 'audio',
                    joinedAt: new Date()
                  });
                  
                  // Notify others about the new participant using enhanced multi-path delivery
                  const joinMessage = {
                    type: 'group_call_user_joined',
                    roomId: data.roomId,
                    userId: client.userId,
                    callType: data.callType
                  };
                  
                  console.log(`Broadcasting user ${client.userId} joined group call in room ${data.roomId}`);
                  
                  // Send to all participants (except the joining user)
                  for (const participant of groupCall.participants) {
                    if (participant.userId !== client.userId) {
                      // Flag to track delivery
                      let participantNotified = false;
                      
                      // 1. Try appropriate call-type specific connection
                      const targetClients = data.callType === 'video' ? videoCallClients : voiceCallClients;
                      const targetClient = targetClients.find(c => c.userId === participant.userId);
                      if (targetClient && targetClient.socket.readyState === WebSocket.OPEN) {
                        targetClient.socket.send(JSON.stringify(joinMessage));
                        participantNotified = true;
                      }
                      
                      // 2. Try the alternate call-type as backup
                      const backupClients = data.callType === 'video' ? voiceCallClients : videoCallClients;
                      const backupClient = backupClients.find(c => c.userId === participant.userId);
                      if (backupClient && backupClient.socket.readyState === WebSocket.OPEN) {
                        backupClient.socket.send(JSON.stringify(joinMessage));
                        participantNotified = true;
                      }
                      
                      // 3. Try chat connection as another backup
                      const chatClient = chatClients.find(c => c.userId === participant.userId);
                      if (chatClient && chatClient.socket.readyState === WebSocket.OPEN) {
                        chatClient.socket.send(JSON.stringify(joinMessage));
                        participantNotified = true;
                      }
                      
                      // 4. Finally fallback to direct message routing as last resort
                      if (!participantNotified) {
                        sendDirectMessage(participant.userId, joinMessage);
                      }
                    }
                  }
                  
                  console.log(`User ${client.userId} join notifications sent to all group call participants`);
                }
                
                // Forward the answer to the specific peer - using multi-path approach for reliability
                const answerMessage = {
                  type: 'group_call_answer',
                  roomId: data.roomId,
                  peerId: client.userId, // Sender's ID
                  sdp: data.sdp,
                  callType: data.callType
                };
                
                console.log(`Processing group ${data.callType} call answer from ${client.userId} to ${data.peerId} in room ${data.roomId}`);
                
                // IMPROVED: Multi-path delivery for group call answers
                let delivered = false;
                
                // 1. Try the appropriate specialized client collection based on call type
                const targetClients = data.callType === 'video' ? videoCallClients : voiceCallClients;
                const targetClient = targetClients.find(c => c.userId === data.peerId);
                
                if (targetClient && targetClient.socket.readyState === WebSocket.OPEN) {
                  targetClient.socket.send(JSON.stringify(answerMessage));
                  console.log(`Group call answer sent via primary ${data.callType} channel`);
                  delivered = true;
                }
                
                // 2. Try the other specialized client collection as backup
                const backupClients = data.callType === 'video' ? voiceCallClients : videoCallClients;
                const backupClient = backupClients.find(c => c.userId === data.peerId);
                
                if (backupClient && backupClient.socket.readyState === WebSocket.OPEN) {
                  backupClient.socket.send(JSON.stringify(answerMessage));
                  console.log(`Group call answer sent via backup ${data.callType === 'video' ? 'voice' : 'video'} channel`);
                  delivered = true;
                }
                
                // 3. Try the standard chat clients as another backup channel
                const chatClient = chatClients.find(c => c.userId === data.peerId);
                if (chatClient && chatClient.socket.readyState === WebSocket.OPEN) {
                  chatClient.socket.send(JSON.stringify(answerMessage));
                  console.log(`Group call answer sent via chat channel backup`);
                  delivered = true;
                }
                
                // 4. Try the legacy clients as a last resort
                const legacyClient = clients.find(c => c.userId === data.peerId);
                if (legacyClient && legacyClient.socket.readyState === WebSocket.OPEN) {
                  legacyClient.socket.send(JSON.stringify(answerMessage));
                  console.log(`Group call answer sent via legacy channel backup`);
                  delivered = true;
                }
                
                // 5. Finally use the generalized routing mechanism
                if (!delivered) {
                  // Use the standard direct message function as a fallback
                  sendDirectMessage(data.peerId, answerMessage);
                  console.log(`Group call answer sent via general routing`);
                }
                
                console.log(`Group call answer from ${client.userId} to ${data.peerId} in room ${data.roomId} forwarding complete`);
                
                // Return success to the caller
                ws.send(JSON.stringify({
                  type: 'group_call_answer_sent',
                  peerId: data.peerId
                }));
                
              } catch (error) {
                console.error('Error handling group call answer:', error);
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Failed to process group call answer' 
                }));
              }
              break;
              
            case 'group_call_ice_candidate':
              if (!data.roomId || !data.peerId || !data.candidate || !data.callType) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid group call ICE candidate data' }));
                return;
              }
              
              // Safety check: ensure client is defined
              if (!client) {
                ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
                return;
              }
              
              try {
                const iceMessage = {
                  type: 'group_call_ice_candidate',
                  roomId: data.roomId,
                  peerId: client.userId, // Sender's ID
                  candidate: data.candidate,
                  callType: data.callType
                };
                
                console.log(`Processing ICE candidate from ${client.userId} to ${data.peerId} in room ${data.roomId}`);
                
                // IMPROVED: Multi-path delivery for ICE candidates to ensure reliable signaling
                let delivered = false;
                
                // 1. Try the appropriate specialized client collection based on call type
                const targetClients = data.callType === 'video' ? videoCallClients : voiceCallClients;
                const targetClient = targetClients.find(c => c.userId === data.peerId);
                
                if (targetClient && targetClient.socket.readyState === WebSocket.OPEN) {
                  targetClient.socket.send(JSON.stringify(iceMessage));
                  console.log(`ICE candidate sent via primary ${data.callType} channel`);
                  delivered = true;
                }
                
                // 2. Try the other specialized client collection as backup
                const backupClients = data.callType === 'video' ? voiceCallClients : videoCallClients;
                const backupClient = backupClients.find(c => c.userId === data.peerId);
                
                if (backupClient && backupClient.socket.readyState === WebSocket.OPEN) {
                  backupClient.socket.send(JSON.stringify(iceMessage));
                  console.log(`ICE candidate sent via backup ${data.callType === 'video' ? 'voice' : 'video'} channel`);
                  delivered = true;
                }
                
                // 3. Try the standard chat clients as another backup channel
                const chatClient = chatClients.find(c => c.userId === data.peerId);
                if (chatClient && chatClient.socket.readyState === WebSocket.OPEN) {
                  chatClient.socket.send(JSON.stringify(iceMessage));
                  console.log(`ICE candidate sent via chat channel backup`);
                  delivered = true;
                }
                
                // 4. Try the legacy clients as a last resort
                const legacyClient = clients.find(c => c.userId === data.peerId);
                if (legacyClient && legacyClient.socket.readyState === WebSocket.OPEN) {
                  legacyClient.socket.send(JSON.stringify(iceMessage));
                  console.log(`ICE candidate sent via legacy channel backup`);
                  delivered = true;
                }
                
                // 5. Finally use the generalized routing mechanism
                if (!delivered) {
                  // Use the standard direct message function as a fallback
                  sendDirectMessage(data.peerId, iceMessage);
                  console.log(`ICE candidate sent via general routing`);
                }
                
                console.log(`Group call ICE candidate from ${client.userId} to ${data.peerId} in room ${data.roomId} forwarding complete`);
              } catch (error) {
                console.error('Error handling group call ICE candidate:', error);
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Failed to process group call ICE candidate' 
                }));
              }
              break;
              
            case 'group_call_user_left':
              if (!data.roomId || !data.callType) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid group call leave data' }));
                return;
              }
              
              // Safety check: ensure client is defined
              if (!client) {
                ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
                return;
              }
              
              try {
                // Get the group call
                const groupCall = activeGroupCalls.get(data.roomId);
                if (!groupCall) {
                  ws.send(JSON.stringify({ type: 'error', message: 'Group call not found' }));
                  return;
                }
                
                // Remove user from participants
                const participantIndex = groupCall.participants.findIndex(p => p.userId === client.userId);
                if (participantIndex !== -1) {
                  groupCall.participants.splice(participantIndex, 1);
                  
                  // Notify others about the participant leaving using enhanced multi-path delivery
                  const leaveMessage = {
                    type: 'group_call_user_left',
                    roomId: data.roomId,
                    userId: client.userId,
                    callType: data.callType
                  };
                  
                  console.log(`Broadcasting user ${client.userId} left group call in room ${data.roomId}`);
                  
                  // Send to all remaining participants
                  for (const participant of groupCall.participants) {
                    // Flag to track delivery
                    let participantNotified = false;
                    
                    // 1. Try appropriate call-type specific connection
                    const targetClients = data.callType === 'video' ? videoCallClients : voiceCallClients;
                    const targetClient = targetClients.find(c => c.userId === participant.userId);
                    if (targetClient && targetClient.socket.readyState === WebSocket.OPEN) {
                      targetClient.socket.send(JSON.stringify(leaveMessage));
                      participantNotified = true;
                    }
                    
                    // 2. Try the alternate call-type as backup
                    const backupClients = data.callType === 'video' ? voiceCallClients : videoCallClients;
                    const backupClient = backupClients.find(c => c.userId === participant.userId);
                    if (backupClient && backupClient.socket.readyState === WebSocket.OPEN) {
                      backupClient.socket.send(JSON.stringify(leaveMessage));
                      participantNotified = true;
                    }
                    
                    // 3. Try chat connection as another backup
                    const chatClient = chatClients.find(c => c.userId === participant.userId);
                    if (chatClient && chatClient.socket.readyState === WebSocket.OPEN) {
                      chatClient.socket.send(JSON.stringify(leaveMessage));
                      participantNotified = true;
                    }
                    
                    // 4. Finally fallback to direct message routing as last resort
                    if (!participantNotified) {
                      sendDirectMessage(participant.userId, leaveMessage);
                    }
                  }
                  
                  console.log(`User ${client.userId} leave notifications sent to all remaining group call participants`);
                  
                  console.log(`User ${client.userId} left group call in room ${data.roomId}`);
                  
                  // If no participants left, end the call
                  if (groupCall.participants.length === 0) {
                    const endTime = new Date();
                    const duration = Math.floor((endTime.getTime() - groupCall.startTime.getTime()) / 1000);
                    
                    await storage.updateCallStatus(groupCall.callId, 'ended', endTime, duration);
                    activeGroupCalls.delete(data.roomId);
                    
                    console.log(`Group call in room ${data.roomId} ended (no participants left)`);
                  }
                }
                
                // Return success to the caller
                ws.send(JSON.stringify({
                  type: 'group_call_leave_success',
                  roomId: data.roomId
                }));
                
              } catch (error) {
                console.error('Error handling group call leave:', error);
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'Failed to process group call leave' 
                }));
              }
              break;
              
            // Regular call handlers
            case 'call_offer':
              if (!data.targetId || !data.sdp || !data.callType) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid call data' }));
                return;
              }
              
              try {
                // Create call record
                // Safety check: ensure client is defined (should be redundant given outer check)
                if (!client) {
                  ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
                  return;
                }
                
                const callData = {
                  callerId: client.userId,
                  receiverId: data.isRoom ? undefined : data.targetId,
                  roomId: data.isRoom ? data.targetId : undefined,
                  type: data.callType || 'video', // Force video for video call socket
                  status: 'pending',
                };
                
                const call = await storage.createCall(callData);
                
                // Forward to main message handler which already has intelligent routing
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
                  
                  // Send to all members except caller
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
                  callType: call.type,
                  sdp: data.sdp,
                });
              } catch (err) {
                ws.send(JSON.stringify({ type: 'error', message: 'Failed to answer call' }));
              }
              break;
              
            case 'call_ice_candidate':
              if (!data.targetId || !data.candidate) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid ICE candidate data' }));
                return;
              }
              
              try {
                // Use intelligent routing to send ICE candidate
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
                
                // Calculate duration safely
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
          }
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      if (client) {
        // Remove client from video call clients list
        const index = videoCallClients.findIndex(c => c.userId === client?.userId);
        if (index !== -1) {
          videoCallClients.splice(index, 1);
        }
        
        // Check if user is in any active group calls and handle disconnect
        activeGroupCalls.forEach((groupCall, roomId) => {
          const participantIndex = groupCall.participants.findIndex(p => p.userId === client.userId);
          if (participantIndex !== -1) {
            console.log(`User ${client.userId} left group call in room ${roomId} due to disconnect`);
            
            // Remove user from the participants list
            groupCall.participants.splice(participantIndex, 1);
            
            // Notify others about the participant leaving
            for (const participant of groupCall.participants) {
              sendDirectMessage(participant.userId, {
                type: 'group_call_user_left',
                roomId,
                userId: client.userId,
                callType: groupCall.callType,
                reason: 'disconnected'
              });
            }
            
            // If no participants left, end the call
            if (groupCall.participants.length === 0) {
              const endTime = new Date();
              const duration = Math.floor((endTime.getTime() - groupCall.startTime.getTime()) / 1000);
              
              storage.updateCallStatus(groupCall.callId, 'ended', endTime, duration)
                .then(() => {
                  console.log(`Group call in room ${roomId} ended (no participants left)`);
                  activeGroupCalls.delete(roomId);
                })
                .catch(err => console.error('Error updating call status:', err));
            }
          }
        });
        
        // We don't update user online status here as they may still be connected to other WebSockets
      }
    });
  });
  
  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    let client: WebSocketClient | undefined;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'auth':
            // Authenticate user
            if (!data.username) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid authentication data' }));
              return;
            }
            
            // Check if user exists, create if needed
            let user = await storage.getUserByUsername(data.username);
            if (!user) {
              // Only create a new user if password is provided
              if (data.password) {
                // Create new user
                user = await storage.createUser({
                  username: data.username,
                  password: data.password,
                  deviceInfo: data.deviceInfo || 'Unknown device',
                });
              } else {
                ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
                return;
              }
            } else if (data.password === 'SESSION_AUTHENTICATED') {
              // User is already authenticated via session cookie
              console.log(`User ${data.username} authenticated via session`);
            } else {
              // In a military system, we'd have proper password encryption
              // For this demo, we're allowing any password for testing
              // This simulates the training/development environment
              console.log(`User ${data.username} authenticated with password`);
            }
            
            // Update online status
            user = await storage.updateUserOnlineStatus(user.id, true);
            
            // Create client and add to active clients
            client = {
              userId: user.id,
              socket: ws,
              lastHeartbeat: Date.now(),
            };
            clients.push(client);
            
            // Send auth success response with user data
            ws.send(JSON.stringify({
              type: 'auth_success',
              user: { id: user.id, username: user.username, isOnline: user.isOnline, deviceInfo: user.deviceInfo },
            }));
            
            // Broadcast online users update
            broadcastOnlineUsers();
            break;
          
          case 'heartbeat':
            // Update client heartbeat time
            if (client) {
              client.lastHeartbeat = Date.now();
            }
            ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
            break;
          
          case 'get_contacts':
            // Get all users except the requesting user
            if (!client) {
              ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
              return;
            }
            
            const users = await storage.getAllUsers();
            const contacts = users
              .filter(user => user.id !== client?.userId)
              .map(user => ({
                id: user.id,
                username: user.username,
                isOnline: user.isOnline,
                deviceInfo: user.deviceInfo,
              }));
            
            ws.send(JSON.stringify({ type: 'contacts', contacts }));
            break;
          
          case 'get_chats':
            // Get user's chats
            if (!client) {
              ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
              return;
            }
            
            const chats = await storage.getUserChats(client.userId);
            ws.send(JSON.stringify({ type: 'chats', chats }));
            break;
          
          case 'get_room_details':
            // Get room details including members
            if (!client || !data.roomId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid request' }));
              return;
            }
            
            const roomWithMembers = await storage.getRoomWithMembers(data.roomId);
            if (!roomWithMembers) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
              return;
            }
            
            ws.send(JSON.stringify({ type: 'room_details', room: roomWithMembers }));
            break;
          
          case 'create_room':
            // Create a new chat room
            if (!client || !data.name) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid room data' }));
              return;
            }
            
            try {
              const roomData = insertRoomSchema.parse({ name: data.name });
              const newRoom = await storage.createRoom(roomData);
              
              // Add creator to the room
              await storage.addUserToRoom({
                roomId: newRoom.id,
                userId: client.userId,
              });
              
              // Add any other users if specified
              if (Array.isArray(data.memberIds)) {
                for (const memberId of data.memberIds) {
                  try {
                    await storage.addUserToRoom({
                      roomId: newRoom.id,
                      userId: memberId,
                    });
                  } catch (err) {
                    // Ignore errors adding members
                  }
                }
              }
              
              // Send room created response
              ws.send(JSON.stringify({ type: 'room_created', room: newRoom }));
              
              // Notify members that they've been added to a room
              broadcastToRoom(newRoom.id, {
                type: 'room_update',
                room: await storage.getRoomWithMembers(newRoom.id),
              });
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to create room' }));
            }
            break;
          
          case 'join_room':
            // Join an existing room
            if (!client || !data.roomId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid request' }));
              return;
            }
            
            try {
              await storage.addUserToRoom({
                roomId: data.roomId,
                userId: client.userId,
              });
              
              ws.send(JSON.stringify({ type: 'room_joined', roomId: data.roomId }));
              
              // Broadcast room update to all members
              broadcastToRoom(data.roomId, {
                type: 'room_update',
                room: await storage.getRoomWithMembers(data.roomId),
              });
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to join room' }));
            }
            break;
          
          case 'leave_room':
            // Leave a room
            if (!client || !data.roomId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid request' }));
              return;
            }
            
            try {
              const success = await storage.removeUserFromRoom(client.userId, data.roomId);
              
              if (success) {
                ws.send(JSON.stringify({ type: 'room_left', roomId: data.roomId }));
                
                // Broadcast room update to remaining members
                broadcastToRoom(data.roomId, {
                  type: 'room_update',
                  room: await storage.getRoomWithMembers(data.roomId),
                });
              } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Not a member of the room' }));
              }
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to leave room' }));
            }
            break;
          
          case 'get_direct_chat':
            // Get or create a direct chat with another user
            if (!client || !data.otherUserId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid request' }));
              return;
            }
            
            try {
              const otherUser = await storage.getUser(data.otherUserId);
              if (!otherUser) {
                ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
                return;
              }
              
              // Get chat between users or create if it doesn't exist
              let directChat = await storage.getDirectChatByUsers(client.userId, data.otherUserId);
              
              if (!directChat) {
                directChat = await storage.createDirectChat({
                  user1Id: client.userId,
                  user2Id: data.otherUserId,
                });
              }
              
              // Mark messages as read
              await storage.markMessagesAsRead(directChat.id, false, client.userId);
              
              // Get messages for the chat
              const messages = await storage.getDirectChatMessages(directChat.id);
              
              ws.send(JSON.stringify({
                type: 'direct_chat',
                chat: directChat,
                otherUser: {
                  id: otherUser.id,
                  username: otherUser.username,
                  isOnline: otherUser.isOnline,
                  deviceInfo: otherUser.deviceInfo,
                },
                messages,
              }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to get direct chat' }));
            }
            break;
          
          case 'get_room_messages':
            // Get messages for a room
            if (!client || !data.roomId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid request' }));
              return;
            }
            
            try {
              // Check if user is a member of the room
              const isMember = await storage.isUserInRoom(client.userId, data.roomId);
              if (!isMember) {
                ws.send(JSON.stringify({ type: 'error', message: 'Not a member of the room' }));
                return;
              }
              
              // Mark messages as read
              await storage.markMessagesAsRead(data.roomId, true, client.userId);
              
              // Get messages for the room
              const messages = await storage.getRoomMessages(data.roomId);
              
              ws.send(JSON.stringify({
                type: 'room_messages',
                roomId: data.roomId,
                messages,
              }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to get room messages' }));
            }
            break;
          
          case 'send_message':
            // Send a message to a direct chat or room
            if (!client || !data.content || (!data.directChatId && !data.roomId)) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid message data' }));
              return;
            }
            
            try {
              // Validate target chat exists
              if (data.directChatId) {
                const chat = await storage.getDirectChat(data.directChatId);
                if (!chat || (chat.user1Id !== client.userId && chat.user2Id !== client.userId)) {
                  ws.send(JSON.stringify({ type: 'error', message: 'Chat not found or not authorized' }));
                  return;
                }
              } else if (data.roomId) {
                const isMember = await storage.isUserInRoom(client.userId, data.roomId);
                if (!isMember) {
                  ws.send(JSON.stringify({ type: 'error', message: 'Not a member of the room' }));
                  return;
                }
              }
              
              // Create message
              const message = await storage.createMessage({
                content: data.content,
                senderId: client.userId,
                directChatId: data.directChatId,
                roomId: data.roomId,
              });
              
              // Get sender data to include with message
              const sender = await storage.getUser(client.userId);
              
              if (!sender) {
                ws.send(JSON.stringify({ type: 'error', message: 'Sender not found' }));
                return;
              }
              
              const messageWithSender = {
                ...message,
                sender,
              };
              
              // Confirm message sent to sender
              ws.send(JSON.stringify({
                type: 'message_sent',
                message: messageWithSender,
              }));
              
              // Deliver message to recipient(s)
              if (data.directChatId) {
                const chat = await storage.getDirectChat(data.directChatId);
                if (chat) {
                  const recipientId = chat.user1Id === client.userId ? chat.user2Id : chat.user1Id;
                  
                  // Use sendDirectMessage to deliver to the appropriate connection
                  // Regardless of which client type they're connected with
                  sendDirectMessage(recipientId, {
                    type: 'new_message',
                    message: messageWithSender,
                    isDirectMessage: true,
                  });
                  
                  // Log delivery for debugging/testing
                  console.log(`Message ${message.id} sent to user ${recipientId} via intelligent routing`);
                }
              } else if (data.roomId) {
                // Broadcast to all room members except sender using improved room broadcasting
                broadcastToRoom(data.roomId, {
                  type: 'new_message',
                  message: messageWithSender,
                  isDirectMessage: false,
                }, [client.userId]); // Exclude sender
              }
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message' }));
            }
            break;
          
          case 'call_offer':
            // Initiate a call
            if (!client || !data.targetId || !data.sdp || !data.type) {
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
                
                // Send to all members except caller
                for (const member of roomMembers) {
                  if (member.id !== client.userId) {
                    const memberClient = clients.find(c => c.userId === member.id);
                    
                    if (memberClient && memberClient.socket.readyState === WebSocket.OPEN) {
                      memberClient.socket.send(JSON.stringify({
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
                      }));
                    }
                  }
                }
              } else {
                // Direct call - send to recipient
                const caller = await storage.getUser(client.userId);
                const target = await storage.getUser(data.targetId);
                
                if (!caller || !target) {
                  ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
                  return;
                }
                
                // Check if user has any active connections across all client types
                const hasActiveConnections = 
                  clients.some(c => c.userId === data.targetId && c.socket.readyState === WebSocket.OPEN) ||
                  chatClients.some(c => c.userId === data.targetId && c.socket.readyState === WebSocket.OPEN) ||
                  voiceCallClients.some(c => c.userId === data.targetId && c.socket.readyState === WebSocket.OPEN) ||
                  videoCallClients.some(c => c.userId === data.targetId && c.socket.readyState === WebSocket.OPEN);
                
                if (hasActiveConnections) {
                  // Use our intelligent routing system to send to appropriate client
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
                  
                  console.log(`Call ${call.id} offer sent to user ${data.targetId} via intelligent routing`);
                } else {
                  // Recipient offline
                  ws.send(JSON.stringify({
                    type: 'call_failed',
                    reason: 'User offline',
                    callId: call.id,
                  }));
                  
                  // Update call status
                  await storage.updateCallStatus(call.id, 'missed', new Date(), 0);
                }
              }
              
              // Return call data to caller with more information for UI
              const additionalCallInfo = data.isRoom 
                ? { 
                    peerName: (await storage.getRoom(data.targetId))?.name || "Group Call"
                  }
                : { 
                    peerName: (await storage.getUser(data.targetId))?.username || "Unknown User"
                  };
                
              ws.send(JSON.stringify({
                type: 'call_initiated',
                callId: call.id,
                ...additionalCallInfo,
              }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to initiate call' }));
            }
            break;
          
          case 'call_answer':
            // Answer a call
            if (!client || !data.callId || !data.sdp) {
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
              
              console.log(`Call ${data.callId} answer sent to caller ${call.callerId} via intelligent routing`);
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to answer call' }));
            }
            break;
          
          case 'call_ice_candidate':
            // Exchange ICE candidates
            if (!client || !data.targetId || !data.candidate) {
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
              
              // Log for testing/debugging
              console.log(`ICE candidate from user ${client.userId} sent to user ${data.targetId} via intelligent routing`);
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to exchange ICE candidate' }));
            }
            break;
          
          case 'call_end':
            // End a call
            if (!client || !data.callId) {
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
              
              // Calculate duration with null safety
              const duration = call.startTime 
                ? Math.floor((endTime.getTime() - call.startTime.getTime()) / 1000) 
                : 0;
              
              await storage.updateCallStatus(data.callId, 'ended', endTime, duration);
              
              if (call.receiverId) {
                // Direct call
                const otherUserId = call.callerId === client.userId ? call.receiverId : call.callerId;
                
                // Use our new function to send to the appropriate client(s)
                sendDirectMessage(otherUserId, {
                  type: 'call_ended',
                  callId: data.callId,
                  userId: client.userId
                });
              } else if (call.roomId) {
                // Room call - notify all room members
                broadcastToRoom(call.roomId, {
                  type: 'call_ended',
                  callId: data.callId,
                  userId: client.userId,
                }, [client.userId]); // Exclude sender
              }
              
              // Confirm to caller
              ws.send(JSON.stringify({
                type: 'call_end_confirmed',
                callId: data.callId,
              }));
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to end call' }));
            }
            break;
          
          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    // Handle WebSocket closed
    ws.on('close', async () => {
      if (client) {
        // Update user's online status
        await storage.updateUserOnlineStatus(client.userId, false);
        
        // Remove client from active clients
        const index = clients.findIndex(c => c.userId === client?.userId);
        if (index !== -1) {
          clients.splice(index, 1);
        }
        
        // Broadcast online users update
        broadcastOnlineUsers();
      }
    });
  });
  
  // Helper functions
  
  // Broadcast online users to all connected clients
  async function broadcastOnlineUsers() {
    const onlineUsers = await storage.getOnlineUsers();
    const message = JSON.stringify({
      type: 'online_users',
      users: onlineUsers.map(user => ({
        id: user.id,
        username: user.username,
        deviceInfo: user.deviceInfo,
      })),
    });
    
    // Broadcast to all connected clients across all WebSocket types
    broadcastToAllClients(message);
  }
  
  // Broadcast message to all connected clients regardless of connection type
  function broadcastToAllClients(message: string | object) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    // Legacy clients
    for (const client of clients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageStr);
      }
    }
    
    // Chat clients
    for (const client of chatClients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageStr);
      }
    }
    
    // Voice call clients
    for (const client of voiceCallClients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageStr);
      }
    }
    
    // Video call clients
    for (const client of videoCallClients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageStr);
      }
    }
  }
  
  // Send a message to a specific user across all their connected client types
  function sendToUser(userId: number, message: any) {
    const messageStr = JSON.stringify(message);
    let messageSent = false;
    
    // Determine message type to decide where to send
    const messageType = message.type || '';
    const isCallRelated = messageType.startsWith('call_');
    const isVideoCall = isCallRelated && message.callType === 'video';
    const isVoiceCall = isCallRelated && message.callType === 'audio';
    
    // Try to prioritize sending to the most appropriate client type first
    if (isVideoCall) {
      // First try to send to video client if this is video call related
      const videoClient = videoCallClients.find(c => c.userId === userId);
      if (videoClient && videoClient.socket.readyState === WebSocket.OPEN) {
        videoClient.socket.send(messageStr);
        messageSent = true;
      }
    } else if (isVoiceCall) {
      // First try to send to voice client if this is voice call related
      const voiceClient = voiceCallClients.find(c => c.userId === userId);
      if (voiceClient && voiceClient.socket.readyState === WebSocket.OPEN) {
        voiceClient.socket.send(messageStr);
        messageSent = true;
      }
    }
    
    // If message hasn't been sent to a specialized client, try the chat client
    if (!messageSent) {
      const chatClient = chatClients.find(c => c.userId === userId);
      if (chatClient && chatClient.socket.readyState === WebSocket.OPEN) {
        chatClient.socket.send(messageStr);
        messageSent = true;
      }
    }
    
    // As a last resort, try the legacy client
    if (!messageSent) {
      const legacyClient = clients.find(c => c.userId === userId);
      if (legacyClient && legacyClient.socket.readyState === WebSocket.OPEN) {
        legacyClient.socket.send(messageStr);
      }
    }
  }
  
  // Broadcast message to all members of a room
  async function broadcastToRoom(roomId: number, message: any, excludeUserIds: number[] = []) {
    try {
      const members = await storage.getRoomMembers(roomId);
      
      for (const member of members) {
        if (!excludeUserIds.includes(member.id)) {
          sendToUser(member.id, message);
        }
      }
    } catch (err) {
      console.error('Error broadcasting to room:', err);
    }
  }
  
  // Send direct message to a specific user
  async function sendDirectMessage(userId: number, message: any) {
    try {
      sendToUser(userId, message);
    } catch (err) {
      console.error('Error sending direct message:', err);
    }
  }
  
  // Heartbeat interval to clean up stale connections
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const HEARTBEAT_TIMEOUT = 2 * HEARTBEAT_INTERVAL; // 1 minute
  
  setInterval(() => {
    const now = Date.now();
    let userStatusUpdates = new Map<number, boolean>();
    
    // Check legacy clients
    for (let i = clients.length - 1; i >= 0; i--) {
      const client = clients[i];
      
      if (now - client.lastHeartbeat > HEARTBEAT_TIMEOUT) {
        // Connection is stale, remove client
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.close();
        }
        
        clients.splice(i, 1);
        
        // Mark this user for status update if they're not connected elsewhere
        if (!userStatusUpdates.has(client.userId)) {
          userStatusUpdates.set(client.userId, false);
        }
      }
    }
    
    // Check chat clients
    for (let i = chatClients.length - 1; i >= 0; i--) {
      const client = chatClients[i];
      
      if (now - client.lastHeartbeat > HEARTBEAT_TIMEOUT) {
        // Connection is stale, remove client
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.close();
        }
        
        chatClients.splice(i, 1);
        
        // Mark this user for status update if they're not connected elsewhere
        if (!userStatusUpdates.has(client.userId)) {
          userStatusUpdates.set(client.userId, false);
        }
      } else {
        // Client is active, mark as online
        userStatusUpdates.set(client.userId, true);
      }
    }
    
    // Check voice call clients
    for (let i = voiceCallClients.length - 1; i >= 0; i--) {
      const client = voiceCallClients[i];
      
      if (now - client.lastHeartbeat > HEARTBEAT_TIMEOUT) {
        // Connection is stale, remove client
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.close();
        }
        
        voiceCallClients.splice(i, 1);
      } else {
        // Client is active, mark as online
        userStatusUpdates.set(client.userId, true);
      }
    }
    
    // Check video call clients
    for (let i = videoCallClients.length - 1; i >= 0; i--) {
      const client = videoCallClients[i];
      
      if (now - client.lastHeartbeat > HEARTBEAT_TIMEOUT) {
        // Connection is stale, remove client
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.close();
        }
        
        videoCallClients.splice(i, 1);
      } else {
        // Client is active, mark as online
        userStatusUpdates.set(client.userId, true);
      }
    }
    
    // Apply all status updates
    if (userStatusUpdates.size > 0) {
      Promise.all(
        Array.from(userStatusUpdates.entries()).map(([userId, isOnline]) => 
          storage.updateUserOnlineStatus(userId, isOnline)
        )
      )
      .then(() => {
        // Broadcast updated online status to all clients
        broadcastOnlineUsers();
      })
      .catch(err => {
        console.error('Error updating user statuses:', err);
      });
    }
  }, HEARTBEAT_INTERVAL);
  
  // Register HTTP API routes
  
  // Get user by ID
  app.get('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        isOnline: user.isOnline,
        deviceInfo: user.deviceInfo,
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get all users
  app.get('/api/users', async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      
      res.json(users.map(user => ({
        id: user.id,
        username: user.username,
        isOnline: user.isOnline,
        deviceInfo: user.deviceInfo,
      })));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // API endpoint to get active group calls in a room
  app.get('/api/rooms/:roomId/active-call', async (req: Request, res: Response) => {
    try {
      const roomId = parseInt(req.params.roomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ error: 'Invalid room ID' });
      }
      
      // For new group calls with client-side generated room IDs,
      // we'll support dynamic room creation to avoid 404 errors
      let room = await storage.getRoom(roomId);
      
      // Handle special case for client-side generated rooms
      if (!room && req.query.allowCreate === 'true') {
        console.log(`Creating dynamic room for client-side generated ID: ${roomId}`);
        
        try {
          // Create room on-the-fly for client-generated IDs
          room = await storage.createRoom({
            name: `Dynamic Group ${roomId}`,
            creatorId: 1, // Default to system user
            isPrivate: false,
            createdAt: new Date()
          });
          
          console.log(`Successfully created dynamic room: ${room.id}`);
        } catch (createError) {
          console.error(`Failed to create dynamic room: ${createError}`);
          // Continue even if room creation fails - we'll use the group call directly
        }
      } else if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      // Check for active group call in this room
      let groupCall = activeGroupCalls.get(roomId);
      
      // If no active call but allowCreate parameter is present, create a placeholder call
      if (!groupCall && req.query.allowCreate === 'true' && req.query.callType) {
        console.log(`Creating placeholder group call for room ${roomId}`);
        const callType = req.query.callType as 'audio' | 'video';
        
        // Create placeholder group call
        groupCall = {
          roomId,
          callId: Date.now(), // Use timestamp as temporary call ID
          callType: callType,
          participants: [],
          startTime: new Date(),
          active: true
        };
        
        // Store in active group calls map
        activeGroupCalls.set(roomId, groupCall);
        console.log(`Created placeholder group call for room ${roomId}`);
      } else if (!groupCall) {
        return res.status(404).json({ error: 'No active call in this room' });
      }
      
      // Return active call with participants
      res.json({
        roomId: groupCall.roomId,
        callId: groupCall.callId,
        callType: groupCall.callType,
        startTime: groupCall.startTime,
        participants: groupCall.participants.map(p => ({ 
          userId: p.userId,
          callType: p.callType,
          joinedAt: p.joinedAt
        })),
        active: groupCall.active
      });
    } catch (error) {
      console.error('Error fetching active group call:', error);
      res.status(500).json({ error: 'Failed to fetch active group call' });
    }
  });
  
  // API endpoint to get all active group calls
  app.get('/api/active-calls', async (_req: Request, res: Response) => {
    try {
      const activeCalls = [];
      
      // Convert Map to array of active calls in a way compatible with older JS versions
      Array.from(activeGroupCalls.entries()).forEach(([roomId, groupCall]) => {
        activeCalls.push({
          roomId,
          callId: groupCall.callId,
          callType: groupCall.callType,
          startTime: groupCall.startTime,
          participantCount: groupCall.participants.length,
          active: groupCall.active
        });
      });
      
      res.json(activeCalls);
    } catch (error) {
      console.error('Error fetching active calls:', error);
      res.status(500).json({ error: 'Failed to fetch active calls' });
    }
  });
  
  return httpServer;
}

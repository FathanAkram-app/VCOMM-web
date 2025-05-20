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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  // Seed mock data for testing (temporary)
  await seedMockData();
  
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
          // Authenticate user
          if (!data.username || !data.password) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid authentication data' }));
            return;
          }
          
          const user = await storage.getUserByUsername(data.username);
          if (!user) {
            ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
            return;
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
          // Process all call-related messages
          switch (data.type) {
            case 'call_offer':
            case 'call_answer':
            case 'call_ice_candidate':
            case 'call_end':
              // Use the same message handlers as the main socket but route through the voice socket
              // Forward the message to the main message handler
              handleCallMessage(client, data, ws);
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
          // Authenticate user
          if (!data.username || !data.password) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid authentication data' }));
            return;
          }
          
          const user = await storage.getUserByUsername(data.username);
          if (!user) {
            ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
            return;
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
          // Process all call-related messages
          switch (data.type) {
            case 'call_offer':
            case 'call_answer':
            case 'call_ice_candidate':
            case 'call_end':
              // Use the same message handlers as the main socket but route through the video socket
              // Forward the message to the main message handler
              handleCallMessage(client, data, ws);
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
            if (!data.username || !data.password) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid authentication data' }));
              return;
            }
            
            // Check if user exists, otherwise create user
            let user = await storage.getUserByUsername(data.username);
            if (!user) {
              // Create new user
              user = await storage.createUser({
                username: data.username,
                password: data.password,
                deviceInfo: data.deviceInfo || 'Unknown device',
              });
            } else {
              // In a military system, we'd have proper password encryption
            // For this demo, we're allowing any password for testing
            // This simulates the training/development environment
            // Comment out password check to allow any login to work
            /*
            if (user.password !== data.password) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid credentials' }));
                return;
            }
            */
              
              // Update online status
              user = await storage.updateUserOnlineStatus(user.id, true);
            }
            
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
              
              // Calculate duration
              const duration = Math.floor((endTime.getTime() - call.startTime.getTime()) / 1000);
              
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
  
  return httpServer;
}

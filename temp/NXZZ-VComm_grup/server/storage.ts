import {
  User, InsertUser, Room, InsertRoom, RoomMember, InsertRoomMember,
  DirectChat, InsertDirectChat, Message, InsertMessage, Call, InsertCall,
  ContactWithStatus, MessageWithSender, RoomWithMembers, ChatListItem
} from "@shared/schema";

// Define the storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserOnlineStatus(id: number, isOnline: boolean): Promise<User>;
  getOnlineUsers(): Promise<User[]>;
  
  // Room operations
  getRoom(id: number): Promise<Room | undefined>;
  getRoomsByUserId(userId: number): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;
  deleteRoom(roomId: number): Promise<boolean>;
  getRoomMembers(roomId: number): Promise<User[]>;
  getRoomWithMembers(roomId: number): Promise<RoomWithMembers | undefined>;
  
  // Room members operations
  addUserToRoom(member: InsertRoomMember): Promise<RoomMember>;
  removeUserFromRoom(userId: number, roomId: number): Promise<boolean>;
  isUserInRoom(userId: number, roomId: number): Promise<boolean>;
  
  // Direct chat operations
  getDirectChat(id: number): Promise<DirectChat | undefined>;
  getDirectChatByUsers(user1Id: number, user2Id: number): Promise<DirectChat | undefined>;
  createDirectChat(chat: InsertDirectChat): Promise<DirectChat>;
  getDirectChatsByUserId(userId: number): Promise<DirectChat[]>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getDirectChatMessages(directChatId: number): Promise<MessageWithSender[]>;
  getRoomMessages(roomId: number): Promise<MessageWithSender[]>;
  markMessagesAsRead(chatId: number, isRoom: boolean, userId: number): Promise<void>;
  
  // Call operations
  createCall(call: InsertCall): Promise<Call>;
  getCall(id: number): Promise<Call | undefined>;
  updateCallStatus(id: number, status: string, endTime?: Date, duration?: number): Promise<Call>;
  getCallsByUserId(userId: number): Promise<Call[]>;
  
  // Composite operations
  getUserChats(userId: number): Promise<ChatListItem[]>;
}

// In-memory implementation of the storage interface
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rooms: Map<number, Room>;
  private roomMembers: Map<number, RoomMember>;
  private directChats: Map<number, DirectChat>;
  private messages: Map<number, Message>;
  private calls: Map<number, Call>;
  
  private userIdCounter: number;
  private roomIdCounter: number;
  private roomMemberIdCounter: number;
  private directChatIdCounter: number;
  private messageIdCounter: number;
  private callIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.roomMembers = new Map();
    this.directChats = new Map();
    this.messages = new Map();
    this.calls = new Map();
    
    this.userIdCounter = 1;
    this.roomIdCounter = 1;
    this.roomMemberIdCounter = 1;
    this.directChatIdCounter = 1;
    this.messageIdCounter = 1;
    this.callIdCounter = 1;
    
    // Add some initial rooms
    this.createRoom({ name: "Dev Team" });
    this.createRoom({ name: "UI/UX Team" });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = {
      id,
      ...user,
      isOnline: true,
      lastSeen: new Date(),
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async updateUserOnlineStatus(id: number, isOnline: boolean): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    const updatedUser = {
      ...user,
      isOnline,
      lastSeen: isOnline ? user.lastSeen : new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getOnlineUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isOnline);
  }
  
  // Room operations
  async getRoom(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }
  
  async getRoomsByUserId(userId: number): Promise<Room[]> {
    const userRoomMembers = Array.from(this.roomMembers.values())
      .filter(member => member.userId === userId);
    
    const rooms: Room[] = [];
    for (const member of userRoomMembers) {
      const room = await this.getRoom(member.roomId);
      if (room) {
        rooms.push(room);
      }
    }
    
    return rooms;
  }
  
  async createRoom(room: InsertRoom): Promise<Room> {
    const id = this.roomIdCounter++;
    const newRoom: Room = {
      id,
      ...room,
      createdAt: new Date(),
    };
    this.rooms.set(id, newRoom);
    return newRoom;
  }
  
  async deleteRoom(roomId: number): Promise<boolean> {
    console.log(`[MemStorage] Deleting room ${roomId}`);
    
    // Remove all room members for this room
    for (const member of Array.from(this.roomMembers.values())) {
      if (member.roomId === roomId) {
        this.roomMembers.delete(member.id);
      }
    }
    
    // Remove all messages for this room
    for (const message of Array.from(this.messages.values())) {
      if (message.roomId === roomId) {
        this.messages.delete(message.id);
      }
    }
    
    // Delete the room
    return this.rooms.delete(roomId);
  }
  
  async getRoomMembers(roomId: number): Promise<User[]> {
    const memberRecords = Array.from(this.roomMembers.values())
      .filter(member => member.roomId === roomId);
    
    const members: User[] = [];
    for (const member of memberRecords) {
      const user = await this.getUser(member.userId);
      if (user) {
        members.push(user);
      }
    }
    
    return members;
  }
  
  async getRoomWithMembers(roomId: number): Promise<RoomWithMembers | undefined> {
    const room = await this.getRoom(roomId);
    if (!room) return undefined;
    
    const members = await this.getRoomMembers(roomId);
    const onlineCount = members.filter(member => member.isOnline).length;
    
    return {
      ...room,
      members,
      onlineCount,
    };
  }
  
  // Room members operations
  async addUserToRoom(member: InsertRoomMember): Promise<RoomMember> {
    // Check if the user is already in the room
    const isAlreadyMember = await this.isUserInRoom(member.userId, member.roomId);
    if (isAlreadyMember) {
      throw new Error(`User ${member.userId} is already a member of room ${member.roomId}`);
    }
    
    const id = this.roomMemberIdCounter++;
    const newMember: RoomMember = {
      id,
      ...member,
    };
    this.roomMembers.set(id, newMember);
    return newMember;
  }
  
  async removeUserFromRoom(userId: number, roomId: number): Promise<boolean> {
    for (const [id, member] of this.roomMembers.entries()) {
      if (member.userId === userId && member.roomId === roomId) {
        this.roomMembers.delete(id);
        return true;
      }
    }
    return false;
  }
  
  async isUserInRoom(userId: number, roomId: number): Promise<boolean> {
    for (const member of this.roomMembers.values()) {
      if (member.userId === userId && member.roomId === roomId) {
        return true;
      }
    }
    return false;
  }
  
  // Direct chat operations
  async getDirectChat(id: number): Promise<DirectChat | undefined> {
    return this.directChats.get(id);
  }
  
  async getDirectChatByUsers(user1Id: number, user2Id: number): Promise<DirectChat | undefined> {
    for (const chat of this.directChats.values()) {
      if ((chat.user1Id === user1Id && chat.user2Id === user2Id) ||
          (chat.user1Id === user2Id && chat.user2Id === user1Id)) {
        return chat;
      }
    }
    return undefined;
  }
  
  async createDirectChat(chat: InsertDirectChat): Promise<DirectChat> {
    // Check if chat already exists between these users
    const existingChat = await this.getDirectChatByUsers(chat.user1Id, chat.user2Id);
    if (existingChat) {
      return existingChat;
    }
    
    // Create new chat if it doesn't exist
    const id = this.directChatIdCounter++;
    const newChat: DirectChat = {
      id,
      ...chat,
      createdAt: new Date(),
    };
    this.directChats.set(id, newChat);
    return newChat;
  }
  
  async getDirectChatsByUserId(userId: number): Promise<DirectChat[]> {
    return Array.from(this.directChats.values())
      .filter(chat => chat.user1Id === userId || chat.user2Id === userId);
  }
  
  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const newMessage: Message = {
      id,
      ...message,
      createdAt: new Date(),
      read: false,
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }
  
  async getDirectChatMessages(directChatId: number): Promise<MessageWithSender[]> {
    const chatMessages = Array.from(this.messages.values())
      .filter(message => message.directChatId === directChatId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    const messagesWithSender: MessageWithSender[] = [];
    for (const message of chatMessages) {
      const sender = await this.getUser(message.senderId);
      if (sender) {
        messagesWithSender.push({
          ...message,
          sender,
        });
      }
    }
    
    return messagesWithSender;
  }
  
  async getRoomMessages(roomId: number): Promise<MessageWithSender[]> {
    const roomMessages = Array.from(this.messages.values())
      .filter(message => message.roomId === roomId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    const messagesWithSender: MessageWithSender[] = [];
    for (const message of roomMessages) {
      const sender = await this.getUser(message.senderId);
      if (sender) {
        messagesWithSender.push({
          ...message,
          sender,
        });
      }
    }
    
    return messagesWithSender;
  }
  
  async markMessagesAsRead(chatId: number, isRoom: boolean, userId: number): Promise<void> {
    for (const [id, message] of this.messages.entries()) {
      if (isRoom) {
        if (message.roomId === chatId && message.senderId !== userId && !message.read) {
          this.messages.set(id, { ...message, read: true });
        }
      } else {
        if (message.directChatId === chatId && message.senderId !== userId && !message.read) {
          this.messages.set(id, { ...message, read: true });
        }
      }
    }
  }
  
  // Call operations
  async createCall(call: InsertCall): Promise<Call> {
    const id = this.callIdCounter++;
    const newCall: Call = {
      id,
      ...call,
      startTime: new Date(),
      endTime: undefined,
      duration: undefined,
    };
    this.calls.set(id, newCall);
    return newCall;
  }
  
  async getCall(id: number): Promise<Call | undefined> {
    return this.calls.get(id);
  }
  
  async updateCallStatus(id: number, status: string, endTime?: Date, duration?: number): Promise<Call> {
    const call = this.calls.get(id);
    if (!call) {
      throw new Error(`Call with id ${id} not found`);
    }
    
    const updatedCall: Call = {
      ...call,
      status,
      endTime: endTime || call.endTime,
      duration: duration || call.duration,
    };
    this.calls.set(id, updatedCall);
    return updatedCall;
  }
  
  async getCallsByUserId(userId: number): Promise<Call[]> {
    return Array.from(this.calls.values())
      .filter(call => call.callerId === userId || call.receiverId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }
  
  // Composite operations
  async getUserChats(userId: number): Promise<ChatListItem[]> {
    const chatItems: ChatListItem[] = [];
    
    // Get user's direct chats
    const directChats = await this.getDirectChatsByUserId(userId);
    for (const chat of directChats) {
      const otherUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
      const otherUser = await this.getUser(otherUserId);
      
      if (otherUser) {
        const messages = await this.getDirectChatMessages(chat.id);
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
        
        const unreadCount = messages.filter(
          msg => msg.senderId !== userId && !msg.read
        ).length;
        
        chatItems.push({
          id: chat.id,
          name: otherUser.username,
          lastMessage: lastMessage ? lastMessage.content : undefined,
          lastMessageTime: lastMessage ? lastMessage.createdAt.toISOString() : undefined,
          unreadCount,
          isRoom: false,
          isOnline: otherUser.isOnline,
        });
      }
    }
    
    // Get user's rooms
    const userRooms = await this.getRoomsByUserId(userId);
    for (const room of userRooms) {
      const roomWithMembers = await this.getRoomWithMembers(room.id);
      const messages = await this.getRoomMessages(room.id);
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
      
      const unreadCount = messages.filter(
        msg => msg.senderId !== userId && !msg.read
      ).length;
      
      chatItems.push({
        id: room.id,
        name: room.name,
        lastMessage: lastMessage ? 
          `${lastMessage.sender.username}: ${lastMessage.content}` : 
          undefined,
        lastMessageTime: lastMessage ? lastMessage.createdAt.toISOString() : undefined,
        unreadCount,
        isRoom: true,
        isOnline: roomWithMembers ? roomWithMembers.onlineCount > 0 : false,
      });
    }
    
    // Sort by last message time (most recent first)
    return chatItems.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
  }
}

// Import the DatabaseStorage implementation
import { DatabaseStorage } from './DatabaseStorage';

// Export the storage instance
// Uncomment the line below to use database storage
export const storage = new DatabaseStorage();

// Comment out the line below when using database storage
// export const storage = new MemStorage();

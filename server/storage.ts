import {
  users,
  rooms,
  roomMembers,
  directChats,
  messages,
  type User,
  type UpsertUser,
  type Room,
  type InsertRoom,
  type RoomMember,
  type InsertRoomMember,
  type DirectChat,
  type InsertDirectChat,
  type Message,
  type InsertMessage,
  type RegisterUser,
  type Conversation,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, inArray } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByCallsign(callsign: string): Promise<User | undefined>;
  getUserByNrp(nrp: string): Promise<User | undefined>;
  createUser(user: RegisterUser): Promise<User>;
  updateUserStatus(userId: number, status: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Room operations (group chats)
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(data: InsertRoom): Promise<Room>;
  getUserRooms(userId: number): Promise<Room[]>;
  deleteRoom(id: number): Promise<void>;
  
  // Room members operations
  addMemberToRoom(data: InsertRoomMember): Promise<RoomMember>;
  getRoomMembers(roomId: number): Promise<RoomMember[]>;
  
  // Direct chat operations
  getDirectChat(id: number): Promise<DirectChat | undefined>;
  createDirectChat(data: InsertDirectChat): Promise<DirectChat>;
  getUserDirectChats(userId: number): Promise<DirectChat[]>;
  deleteDirectChat(id: number): Promise<void>;
  
  // Generic conversation operations (works for both rooms and direct chats)
  getConversation(id: number, isGroup: boolean): Promise<Conversation | undefined>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  
  // Message operations
  createMessage(data: InsertMessage): Promise<Message>;
  getMessagesByRoom(roomId: number): Promise<Message[]>;
  getMessagesByDirectChat(directChatId: number): Promise<Message[]>;
  clearRoomMessages(roomId: number): Promise<void>;
  clearDirectChatMessages(directChatId: number): Promise<void>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByCallsign(callsign: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.callsign, callsign));
    return user;
  }

  async getUserByNrp(nrp: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.nrp, nrp));
    return user;
  }

  async createUser(userData: RegisterUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
      })
      .returning();
    return user;
  }

  async updateUserStatus(userId: number, status: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        status: status,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Room operations (group chats)
  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(data: InsertRoom): Promise<Room> {
    const [room] = await db
      .insert(rooms)
      .values({
        ...data,
      })
      .returning();
    return room;
  }

  async getUserRooms(userId: number): Promise<Room[]> {
    // Find all room members for this user
    const members = await db
      .select()
      .from(roomMembers)
      .where(eq(roomMembers.userId, userId));
    
    if (members.length === 0) {
      return [];
    }
    
    // Get all rooms for those memberships
    const roomIds = members.map(member => member.roomId);
    if (roomIds.length === 0) return [];
    
    return await db
      .select()
      .from(rooms)
      .where(inArray(rooms.id, roomIds));
  }
  
  async deleteRoom(id: number): Promise<void> {
    // First delete all messages referencing this room
    await db
      .delete(messages)
      .where(eq(messages.roomId, id));
    
    // Then delete all members
    await db
      .delete(roomMembers)
      .where(eq(roomMembers.roomId, id));
    
    // Finally delete the room
    await db
      .delete(rooms)
      .where(eq(rooms.id, id));
  }

  // Room members operations
  async addMemberToRoom(data: InsertRoomMember): Promise<RoomMember> {
    // Check if member already exists
    const [existingMember] = await db
      .select()
      .from(roomMembers)
      .where(
        and(
          eq(roomMembers.roomId, data.roomId),
          eq(roomMembers.userId, data.userId)
        )
      );
    
    if (existingMember) {
      return existingMember;
    }
    
    // Add new member
    const [member] = await db
      .insert(roomMembers)
      .values({
        ...data,
      })
      .returning();
    return member;
  }

  async getRoomMembers(roomId: number): Promise<RoomMember[]> {
    return await db
      .select()
      .from(roomMembers)
      .where(eq(roomMembers.roomId, roomId));
  }
  
  // Direct chat operations
  async getDirectChat(id: number): Promise<DirectChat | undefined> {
    const [directChat] = await db
      .select()
      .from(directChats)
      .where(eq(directChats.id, id));
    return directChat;
  }
  
  async createDirectChat(data: InsertDirectChat): Promise<DirectChat> {
    // Check if a chat already exists between these users
    // In both directions (user1<->user2 and user2<->user1)
    const [existingChat] = await db
      .select()
      .from(directChats)
      .where(
        or(
          and(
            eq(directChats.user1Id, data.user1Id),
            eq(directChats.user2Id, data.user2Id)
          ),
          and(
            eq(directChats.user1Id, data.user2Id),
            eq(directChats.user2Id, data.user1Id)
          )
        )
      );
    
    if (existingChat) {
      return existingChat;
    }
    
    // Create new direct chat
    const [directChat] = await db
      .insert(directChats)
      .values({
        ...data,
      })
      .returning();
    return directChat;
  }
  
  async getUserDirectChats(userId: number): Promise<DirectChat[]> {
    return await db
      .select()
      .from(directChats)
      .where(
        or(
          eq(directChats.user1Id, userId),
          eq(directChats.user2Id, userId)
        )
      );
  }
  
  async deleteDirectChat(id: number): Promise<void> {
    // First delete all messages
    await db
      .delete(messages)
      .where(eq(messages.directChatId, id));
    
    // Then delete the direct chat
    await db
      .delete(directChats)
      .where(eq(directChats.id, id));
  }
  
  // Generic conversation operations
  async getConversation(id: number, isGroup: boolean): Promise<Conversation | undefined> {
    if (isGroup) {
      return this.getRoom(id);
    } else {
      return this.getDirectChat(id);
    }
  }
  
  async getUserConversations(userId: number): Promise<Conversation[]> {
    // Get user's rooms
    const userRooms = await this.getUserRooms(userId);
    
    // Get user's direct chats
    const userDirectChats = await this.getUserDirectChats(userId);
    
    // Combine and return
    return [...userRooms, ...userDirectChats];
  }

  // Message operations
  async createMessage(data: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...data,
      })
      .returning();
    return message;
  }

  async getMessagesByRoom(roomId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(messages.createdAt);
  }
  
  async getMessagesByDirectChat(directChatId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.directChatId, directChatId))
      .orderBy(messages.createdAt);
  }
  
  async clearRoomMessages(roomId: number): Promise<void> {
    await db
      .delete(messages)
      .where(eq(messages.roomId, roomId));
  }
  
  async clearDirectChatMessages(directChatId: number): Promise<void> {
    await db
      .delete(messages)
      .where(eq(messages.directChatId, directChatId));
  }
}

// In-memory storage implementation for development/testing
export class MemStorage implements IStorage {
  private usersStore: Map<number, User>;
  private conversationsStore: Map<number, Conversation>;
  private conversationMembersStore: Map<number, ConversationMember>;
  private messagesStore: Map<number, Message>;
  private userIdCounter: number;
  private convIdCounter: number;
  private convMemberIdCounter: number;
  private messageIdCounter: number;

  constructor() {
    this.usersStore = new Map();
    this.conversationsStore = new Map();
    this.conversationMembersStore = new Map();
    this.messagesStore = new Map();
    this.userIdCounter = 1;
    this.convIdCounter = 1;
    this.convMemberIdCounter = 1;
    this.messageIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.usersStore.get(id);
  }

  async getUserByCallsign(callsign: string): Promise<User | undefined> {
    return Array.from(this.usersStore.values()).find(
      (user) => user.callsign === callsign
    );
  }

  async getUserByNrp(nrp: string): Promise<User | undefined> {
    return Array.from(this.usersStore.values()).find(
      (user) => user.nrp === nrp
    );
  }

  async createUser(userData: RegisterUser): Promise<User> {
    const id = this.userIdCounter++;
    
    const user: User = {
      ...userData,
      id,
      profileImageUrl: null,
      status: "offline",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.usersStore.set(id, user);
    return user;
  }

  async updateUserStatus(userId: number, status: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      status,
      updatedAt: new Date(),
    };
    
    this.usersStore.set(userId, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.usersStore.values());
  }

  // Conversation operations
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversationsStore.get(id);
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const id = this.convIdCounter++;
    const conversation: Conversation = {
      ...data,
      id,
      name: data.name || null,
      description: data.description || null,
      isGroup: data.isGroup || false,
      classification: data.classification || "UNCLASSIFIED",
      createdById: data.createdById || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.conversationsStore.set(id, conversation);
    return conversation;
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    const memberEntries = Array.from(this.conversationMembersStore.values())
      .filter(member => member.userId === userId);
    
    const conversations = await Promise.all(
      memberEntries.map(async member => {
        const conversation = await this.getConversation(member.conversationId);
        return conversation;
      })
    );
    
    return conversations.filter(Boolean) as Conversation[];
  }

  // Conversation members operations
  async addMemberToConversation(data: InsertConversationMember): Promise<ConversationMember> {
    // Check if member already exists
    const existingMember = Array.from(this.conversationMembersStore.values()).find(
      member => member.conversationId === data.conversationId && member.userId === data.userId
    );
    
    if (existingMember) {
      return existingMember;
    }
    
    const id = this.convMemberIdCounter++;
    const member: ConversationMember = {
      ...data,
      id,
      joinedAt: new Date(),
    };
    
    this.conversationMembersStore.set(id, member);
    return member;
  }

  async getConversationMembers(conversationId: number): Promise<ConversationMember[]> {
    return Array.from(this.conversationMembersStore.values())
      .filter(member => member.conversationId === conversationId);
  }

  // Message operations
  async createMessage(data: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const message: Message = {
      ...data,
      id,
      classification: data.classification || "UNCLASSIFIED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.messagesStore.set(id, message);
    return message;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return Array.from(this.messagesStore.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }
  
  async clearConversationMessages(conversationId: number): Promise<void> {
    // Filter messages by conversation ID and remove them from the store
    Array.from(this.messagesStore.entries()).forEach(([id, message]) => {
      if (message.conversationId === conversationId) {
        this.messagesStore.delete(id);
      }
    });
  }
  
  async deleteConversation(id: number): Promise<void> {
    // First delete all messages for this conversation
    await this.clearConversationMessages(id);
    
    // Then delete all conversation members
    Array.from(this.conversationMembersStore.entries()).forEach(([memberId, member]) => {
      if (member.conversationId === id) {
        this.conversationMembersStore.delete(memberId);
      }
    });
    
    // Finally delete the conversation itself
    this.conversationsStore.delete(id);
  }
}

// Use DatabaseStorage for production, MemStorage for development
export const storage = new DatabaseStorage();

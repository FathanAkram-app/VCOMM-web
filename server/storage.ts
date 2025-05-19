import {
  users,
  conversations,
  conversationMembers,
  messages,
  type User,
  type UpsertUser,
  type Conversation,
  type InsertConversation,
  type ConversationMember,
  type InsertConversationMember,
  type Message,
  type InsertMessage,
  type RegisterUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByCallsign(callsign: string): Promise<User | undefined>;
  getUserByNrp(nrp: string): Promise<User | undefined>;
  createUser(user: RegisterUser): Promise<User>;
  updateUserStatus(userId: number, status: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Conversation operations
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  deleteConversation(id: number): Promise<void>;
  
  // Conversation members operations
  addMemberToConversation(data: InsertConversationMember): Promise<ConversationMember>;
  getConversationMembers(conversationId: number): Promise<ConversationMember[]>;
  
  // Message operations
  createMessage(data: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  clearConversationMessages(conversationId: number): Promise<void>;
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
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUserStatus(userId: number, status: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        status, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Conversation operations
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return conversation;
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    // Find all conversation members for this user
    const members = await db
      .select()
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId));
    
    if (members.length === 0) {
      return [];
    }
    
    // Get all conversations for those memberships
    const conversationIds = members.map(member => member.conversationId);
    const userConversations = await Promise.all(
      conversationIds.map(async (id) => {
        const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
        return conv;
      })
    );
    
    return userConversations.filter(Boolean) as Conversation[];
  }

  // Conversation members operations
  async addMemberToConversation(data: InsertConversationMember): Promise<ConversationMember> {
    // Check if member already exists
    const [existingMember] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, data.conversationId),
          eq(conversationMembers.userId, data.userId)
        )
      );
    
    if (existingMember) {
      return existingMember;
    }
    
    // Add new member
    const [member] = await db
      .insert(conversationMembers)
      .values({
        ...data,
        joinedAt: new Date(),
      })
      .returning();
    return member;
  }

  async getConversationMembers(conversationId: number): Promise<ConversationMember[]> {
    return await db
      .select()
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId));
  }

  // Message operations
  async createMessage(data: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return message;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }
  
  async clearConversationMessages(conversationId: number): Promise<void> {
    await db
      .delete(messages)
      .where(eq(messages.conversationId, conversationId));
  }
  
  async deleteConversation(id: number): Promise<void> {
    // First delete all messages
    await this.clearConversationMessages(id);
    
    // Then delete all members
    await db
      .delete(conversationMembers)
      .where(eq(conversationMembers.conversationId, id));
    
    // Finally delete the conversation
    await db
      .delete(conversations)
      .where(eq(conversations.id, id));
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

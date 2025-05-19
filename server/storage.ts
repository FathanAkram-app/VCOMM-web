import {
  users,
  conversations,
  conversationMembers,
  messages,
  type User,
  type UpsertUser,
  type Message,
  type InsertMessage,
  type RegisterUser,
  type Conversation,
  type InsertConversation,
  type ConversationMember,
  type InsertConversationMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, inArray, desc } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByCallsign(callsign: string): Promise<User | undefined>;
  getUserByNrp(nrp: string): Promise<User | undefined>;
  createUser(user: RegisterUser): Promise<User>;
  updateUserStatus(userId: number, status: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Conversation operations (both groups and direct)
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
        status: "offline",
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
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
  
  // Conversation operations
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }
  
  async createConversation(data: InsertConversation): Promise<Conversation> {
    // Di schema, createdById diperlukan tetapi tidak ada di insertConversationSchema
    // Gunakan placeholder userId = 1 untuk sementara
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...data,
        createdById: 1, // Default to admin user
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return conversation;
  }
  
  async getUserConversations(userId: number): Promise<Conversation[]> {
    console.log(`[Storage] Getting conversations for user ID: ${userId}`);
    
    // Get all conversations where user is a member
    const members = await db
      .select()
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId));

    console.log(`[Storage] Found ${members.length} memberships for user ${userId}`);
    
    if (members.length === 0) {
      console.log(`[Storage] No memberships found for user ${userId}`);
      return [];
    }

    const conversationIds = members.map(member => member.conversationId);
    console.log(`[Storage] Found conversation IDs for user ${userId}:`, conversationIds);
    
    const userConversations = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, conversationIds));
    
    console.log(`[Storage] Retrieved ${userConversations.length} conversations for user ${userId}`);
    
    return userConversations;
  }
  
  async deleteConversation(id: number): Promise<void> {
    // First delete all messages in this conversation
    await db
      .delete(messages)
      .where(eq(messages.conversationId, id));
    
    // Then delete all members
    await db
      .delete(conversationMembers)
      .where(eq(conversationMembers.conversationId, id));
    
    // Finally delete the conversation itself
    await db
      .delete(conversations)
      .where(eq(conversations.id, id));
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
        joinedAt: new Date()
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
    // Begin a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Insert the new message
      const [message] = await tx
        .insert(messages)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      // Now update the conversation with the latest message
      await tx
        .update(conversations)
        .set({
          updatedAt: new Date(),
          lastMessage: message.content,
          lastMessageTime: message.createdAt
        })
        .where(eq(conversations.id, message.conversationId));
      
      return message;
    });
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
}

// Export DatabaseStorage instance to be used in the application
export const storage = new DatabaseStorage();
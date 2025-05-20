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
import { sql } from "drizzle-orm";
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
  
  // Message operations for delete, reply, and forward
  deleteMessage(messageId: number): Promise<Message>;
  getMessage(messageId: number): Promise<Message | undefined>;
  forwardMessage(originalMessageId: number, newConversationId: number, senderId: number): Promise<Message>;
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
    // Insert the new message
    const [message] = await db
      .insert(messages)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Tentukan teks yang akan ditampilkan di preview pesan
    let lastMessagePreview = message.content;
    
    // Jika pesan berisi attachment, tambahkan informasi itu ke preview
    if (message.hasAttachment) {
      const attachmentType = message.attachmentType || 'file';
      // Jika pesan kosong, gunakan teks indikator file saja
      if (!lastMessagePreview || lastMessagePreview.trim() === '') {
        lastMessagePreview = `[${attachmentType.charAt(0).toUpperCase() + attachmentType.slice(1)}]`;
      } 
      // Jika ada teks, gabungkan dengan indikator file
      else {
        lastMessagePreview = `${lastMessagePreview} [${attachmentType}]`;
      }
    }
    
    // Now update the conversation with the latest message
    await db.execute(
      sql`UPDATE conversations 
          SET updated_at = NOW(), 
              last_message = ${lastMessagePreview}, 
              last_message_time = NOW() 
          WHERE id = ${message.conversationId}`
    );
    
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
  
  // Message operations for delete, reply, and forward
  async getMessage(messageId: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
    
    return message;
  }
  
  async deleteMessage(messageId: number): Promise<Message> {
    // Get the message first to check if it has attachments
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
    
    if (!message) {
      throw new Error(`Message with ID ${messageId} not found`);
    }
    
    // Soft delete message by setting isDeleted flag to true
    // Also clear attachment information if present
    const [updatedMessage] = await db
      .update(messages)
      .set({
        isDeleted: true,
        content: "[Pesan ini telah dihapus]",
        hasAttachment: false,
        attachmentUrl: null,
        attachmentType: null,
        attachmentName: null,
        attachmentSize: null,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();
    
    return updatedMessage;
  }
  
  async forwardMessage(originalMessageId: number, newConversationId: number, senderId: number): Promise<Message> {
    // Get the original message
    const originalMessage = await this.getMessage(originalMessageId);
    
    if (!originalMessage) {
      throw new Error("Pesan asli tidak ditemukan");
    }
    
    // Create a new message with the same content and attachments but in the new conversation
    const forwardData: InsertMessage = {
      content: originalMessage.content,
      senderId: senderId,
      conversationId: newConversationId,
      classification: originalMessage.classification,
      hasAttachment: originalMessage.hasAttachment,
      attachmentType: originalMessage.attachmentType,
      attachmentUrl: originalMessage.attachmentUrl,
      attachmentName: originalMessage.attachmentName,
      attachmentSize: originalMessage.attachmentSize,
      forwardedFromId: originalMessageId,
    };
    
    // Insert the new message
    const newMessage = await this.createMessage(forwardData);
    return newMessage;
  }
}

// Export DatabaseStorage instance to be used in the application
export const storage = new DatabaseStorage();
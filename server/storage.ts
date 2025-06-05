import {
  users,
  conversations,
  conversationMembers,
  messages,
  callHistory,
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
import { eq, and, or, inArray, desc, exists } from "drizzle-orm";

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
  getConversationMembership(userId: number, conversationId: number): Promise<ConversationMember | undefined>;
  addConversationMember(userId: number, conversationId: number, role: string): Promise<ConversationMember>;
  removeConversationMember(userId: number, conversationId: number): Promise<void>;
  updateConversationMemberRole(userId: number, conversationId: number, role: string): Promise<ConversationMember>;
  updateConversation(conversationId: number, data: Partial<Conversation>): Promise<Conversation>;
  isUserMemberOfConversation(userId: number, conversationId: number): Promise<boolean>;
  removeUserFromConversation(userId: number, conversationId: number): Promise<void>;
  
  // Message operations
  createMessage(data: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  clearConversationMessages(conversationId: number): Promise<void>;
  
  // Call history operations
  getCallHistory(userId: number): Promise<any[]>;
  addCallHistory(callData: any): Promise<void>;
  
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

  async getConversationMembership(userId: number, conversationId: number): Promise<ConversationMember | undefined> {
    const [member] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.userId, userId),
          eq(conversationMembers.conversationId, conversationId)
        )
      );
    return member;
  }

  async addConversationMember(userId: number, conversationId: number, role: string): Promise<ConversationMember> {
    const [member] = await db
      .insert(conversationMembers)
      .values({
        userId,
        conversationId,
        role,
        joinedAt: new Date()
      })
      .returning();
    return member;
  }

  async removeConversationMember(userId: number, conversationId: number): Promise<void> {
    await db
      .delete(conversationMembers)
      .where(
        and(
          eq(conversationMembers.userId, userId),
          eq(conversationMembers.conversationId, conversationId)
        )
      );
  }

  async updateConversationMemberRole(userId: number, conversationId: number, role: string): Promise<ConversationMember> {
    const [member] = await db
      .update(conversationMembers)
      .set({ role })
      .where(
        and(
          eq(conversationMembers.userId, userId),
          eq(conversationMembers.conversationId, conversationId)
        )
      )
      .returning();
    return member;
  }

  async updateConversation(conversationId: number, data: Partial<Conversation>): Promise<Conversation> {
    const [conversation] = await db
      .update(conversations)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId))
      .returning();
    return conversation;
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
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    
    console.log(`Found ${result.length} messages for conversation ${conversationId}`);
    if (result.length > 0) {
      console.log(`Sample message fields:`, Object.keys(result[0]));
    }
    
    return result;
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
      // Tambahkan indikator "Diteruskan" di awal pesan
      content: `[Diteruskan] ${originalMessage.content}`,
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

  async clearConversationMessages(conversationId: number): Promise<void> {
    try {
      // First get all message IDs in this conversation
      const messageIds = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.conversationId, conversationId));
      
      const idsToDelete = messageIds.map(m => m.id);
      
      if (idsToDelete.length === 0) {
        console.log(`No messages to clear in conversation ${conversationId}`);
        return;
      }
      
      console.log(`Clearing ${idsToDelete.length} messages from conversation ${conversationId}`);
      
      // Update any messages that reference the messages we're about to delete
      if (idsToDelete.length > 0) {
        await db
          .update(messages)
          .set({ forwardedFromId: null })
          .where(inArray(messages.forwardedFromId, idsToDelete));
      }
      
      // Now delete all messages in the conversation
      await db
        .delete(messages)
        .where(eq(messages.conversationId, conversationId));
        
      // Clear the last message info from the conversation
      await db
        .update(conversations)
        .set({ 
          lastMessage: null,
          lastMessageTime: null,
          updatedAt: new Date()
        })
        .where(eq(conversations.id, conversationId));
        
      console.log(`Successfully cleared messages from conversation ${conversationId}`);
    } catch (error) {
      console.error(`Error clearing messages from conversation ${conversationId}:`, error);
      throw error;
    }
  }

  async deleteConversation(conversationId: number): Promise<void> {
    // Delete all messages in the conversation first
    await this.clearConversationMessages(conversationId);
    
    // Delete all conversation members
    await db
      .delete(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId));
    
    // Delete the conversation itself
    await db
      .delete(conversations)
      .where(eq(conversations.id, conversationId));
  }

  async isUserMemberOfConversation(userId: number, conversationId: number): Promise<boolean> {
    const [membership] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.userId, userId),
          eq(conversationMembers.conversationId, conversationId)
        )
      );
    return !!membership;
  }

  async removeUserFromConversation(userId: number, conversationId: number): Promise<void> {
    await db
      .delete(conversationMembers)
      .where(
        and(
          eq(conversationMembers.userId, userId),
          eq(conversationMembers.conversationId, conversationId)
        )
      );
  }

  // Call history using database storage
  async getCallHistory(userId: number): Promise<any[]> {
    try {
      // Get calls where user is either initiator or participant  
      const calls = await db
        .select()
        .from(callHistory)
        .where(
          or(
            eq(callHistory.initiatorId, userId),
            sql`${callHistory.participants} @> ARRAY[${userId.toString()}]::text[]`
          )
        )
        .orderBy(desc(callHistory.startTime));

      // Enrich with contact names
      const enrichedCalls = await Promise.all(calls.map(async (call) => {
        let contactName = 'Unknown';
        let isOutgoing = call.initiatorId === userId;

        if (call.conversationId) {
          // Group call - get conversation name
          const [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, call.conversationId));
          contactName = conversation?.name || 'Group Call';
        } else {
          // Individual call - get other user's name
          if (call.initiatorId !== userId) {
            // This is an incoming call - get caller's name
            const [callerUser] = await db
              .select()
              .from(users)
              .where(eq(users.id, call.initiatorId));
            contactName = callerUser ? (callerUser.callsign || callerUser.fullName || 'Unknown') : 'Unknown';
          } else {
            // This is an outgoing call - need target user info from participants
            const targetUserId = call.participants?.find(id => parseInt(id) !== userId);
            if (targetUserId) {
              const [targetUser] = await db
                .select()
                .from(users)
                .where(eq(users.id, parseInt(targetUserId)));
              contactName = targetUser ? (targetUser.callsign || targetUser.fullName || 'Unknown') : 'Unknown';
            }
          }
        }

        return {
          id: call.id,
          callId: call.callId,
          callType: call.callType,
          fromUserId: call.initiatorId,
          toUserId: call.conversationId || call.participants?.find(id => parseInt(id) !== call.initiatorId),
          contactName,
          isOutgoing,
          status: call.status,
          duration: call.duration || 0,
          timestamp: call.startTime.toISOString(),
          toUserName: isOutgoing ? contactName : undefined,
          fromUserName: !isOutgoing ? contactName : undefined
        };
      }));

      return enrichedCalls;
    } catch (error) {
      console.error('Error getting call history:', error);
      return [];
    }
  }

  async addCallHistory(callData: any): Promise<void> {
    try {
      const isGroupCall = callData.callType?.startsWith('group_') || callData.callType === 'video' && callData.toUserId > 10;
      
      await db.insert(callHistory).values({
        callId: callData.callId,
        callType: callData.callType,
        initiatorId: callData.fromUserId,
        conversationId: isGroupCall ? callData.toUserId : null,
        participants: callData.participants || [callData.fromUserId.toString(), callData.toUserId?.toString()].filter(Boolean),
        status: callData.status,
        startTime: new Date(),
        duration: callData.duration || 0
      });
      
      console.log(`[Storage] Added call history: ${callData.callId} (${callData.callType}) - ${callData.status} - isGroupCall: ${isGroupCall}`);
    } catch (error) {
      console.error('Error adding call history:', error);
    }
  }
}

// Export DatabaseStorage instance to be used in the application
export const storage = new DatabaseStorage();
import {
  users,
  conversations,
  conversationMembers,
  messages,
  callHistory,
  lapsitCategories,
  lapsitSubCategories,
  lapsitReports,
  deletedMessagesPerUser,
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
import { eq, ne, and, or, inArray, desc, exists } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByCallsign(callsign: string): Promise<User | undefined>;
  getUserByNrp(nrp: string): Promise<User | undefined>;
  createUser(user: RegisterUser): Promise<User>;
  updateUserStatus(userId: number, status: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // User settings operations
  getUserSettings(userId: number): Promise<any>;
  updateUserSettings(userId: number, settings: any): Promise<any>;

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
  updateCallStatus(callId: string, status: string): Promise<void>;
  deleteCallHistory(callId: number, userId: number): Promise<void>;
  
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

  async markMessageAsDeletedForUser(messageId: number, userId: number): Promise<void> {
    try {
      // Insert record into deletedMessagesPerUser table
      await db
        .insert(deletedMessagesPerUser)
        .values({
          messageId: messageId,
          userId: userId,
        })
        .onConflictDoNothing(); // Prevent duplicate entries
      
      console.log(`Message ${messageId} marked as deleted for user ${userId} (local delete)`);
    } catch (error) {
      console.error(`Error marking message ${messageId} as deleted for user ${userId}:`, error);
      throw new Error("Failed to mark message as deleted for user");
    }
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

  // Delete call history entry
  async deleteCallHistory(callId: number, userId: number): Promise<void> {
    try {
      // Only allow users to delete their own call history entries
      await db
        .delete(callHistory)
        .where(
          and(
            eq(callHistory.id, callId),
            or(
              eq(callHistory.initiatorId, userId),
              sql`${callHistory.participants} @> ARRAY[${userId.toString()}]::text[]`
            )
          )
        );
      console.log(`[Storage] Deleted call history entry ${callId} for user ${userId}`);
    } catch (error) {
      console.error(`Error deleting call history ${callId}:`, error);
      throw error;
    }
  }



  // Call history using database storage
  async getCallHistory(userId: number): Promise<any[]> {
    try {
      // Only show calls where user received the call (not initiated)
      const calls = await db
        .select()
        .from(callHistory)
        .where(
          and(
            // User is in participants but not the initiator
            sql`${callHistory.participants} @> ARRAY[${userId.toString()}]::text[]`,
            ne(callHistory.initiatorId, userId)
            // Show all incoming calls regardless of status
          )
        )
        .orderBy(desc(callHistory.startTime));

      // Enrich with contact names
      const enrichedCalls = await Promise.all(calls.map(async (call) => {
        let contactName = 'Unknown';
        const isIncoming = call.initiatorId !== userId; // Since we only show incoming calls

        if (call.conversationId) {
          // Group call - get conversation name
          const [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, call.conversationId));
          contactName = conversation?.name || 'Group Call';
        } else {
          // Individual call - get caller's name (since this is incoming)
          const [callerUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, call.initiatorId));
          contactName = callerUser ? (callerUser.callsign || callerUser.fullName || 'Unknown') : 'Unknown';
        }

        // Map database status to display status
        let displayStatus = call.status;
        if (call.status === 'ended') {
          displayStatus = isIncoming ? 'incoming' : 'outgoing';
        } else if (call.status === 'initiated') {
          displayStatus = 'missed call';
        } else if (call.status === 'rejected') {
          displayStatus = 'reject';
        }

        return {
          id: call.id,
          callId: call.callId,
          callType: call.callType,
          fromUserId: call.initiatorId,
          toUserId: userId,
          contactName,
          isOutgoing: false, // Always false since we only show incoming calls
          status: displayStatus,
          duration: call.duration || 0,
          timestamp: call.startTime.toISOString(),
          fromUserName: contactName
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
      await db.insert(callHistory).values({
        callId: callData.callId,
        callType: callData.callType,
        initiatorId: callData.initiatorId,
        conversationId: callData.conversationId,
        participants: callData.participants,
        status: callData.status,
        startTime: callData.startTime,
        endTime: callData.endTime,
        duration: callData.duration
      });
      
      console.log(`[Storage] Added call history: ${callData.callId} (${callData.callType}) - ${callData.status}`);
    } catch (error) {
      console.error('Error adding call history:', error);
    }
  }

  // Update call status method
  async updateCallStatus(callId: string, status: string): Promise<void> {
    try {
      await db
        .update(callHistory)
        .set({ status })
        .where(eq(callHistory.callId, callId));
      console.log(`[Storage] Updated call status for ${callId} to ${status}`);
    } catch (error) {
      console.error(`Error updating call status for ${callId}:`, error);
    }
  }

  async getCallHistoryById(callId: string): Promise<any | null> {
    try {
      const [call] = await db
        .select()
        .from(callHistory)
        .where(eq(callHistory.callId, callId));
      return call || null;
    } catch (error) {
      console.error('Error getting single call history:', error);
      return null;
    }
  }

  async updateCallStatus(callId: string, status: string): Promise<void> {
    try {
      await db
        .update(callHistory)
        .set({ 
          status,
          endTime: status === 'missed' || status === 'ended' || status === 'rejected' ? new Date() : undefined 
        })
        .where(eq(callHistory.callId, callId));
      
      console.log(`[Storage] Updated call ${callId} status to ${status}`);
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  }

  // User settings methods
  async getUserSettings(userId: number): Promise<any> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error('User not found');
      }

      // Return default settings structure based on Settings.tsx interface
      return {
        id: userId,
        theme: 'dark',
        status: user.status || 'online',
        statusMessage: user.statusMessage || '',
        language: 'id',
        notifications: {
          push: true,
          sound: true,
          vibration: true,
          calls: true,
          messages: true,
          groups: true,
        },
        privacy: {
          showOnline: true,
          showLastSeen: true,
          readReceipts: true,
          profilePhoto: true,
          allowGroups: true,
        },
        security: {
          twoFactor: false,
          sessionTimeout: 30,
          autoLock: false,
          biometric: false,
        },
        network: {
          autoDownload: true,
          dataUsage: 'medium',
          wifiOnly: false,
        }
      };
    } catch (error) {
      console.error('Error fetching user settings:', error);
      throw error;
    }
  }

  async updateUserSettings(userId: number, settings: any): Promise<any> {
    try {
      // Update user status if provided
      if (settings.status || settings.statusMessage) {
        await db.update(users)
          .set({
            status: settings.status,
            statusMessage: settings.statusMessage,
          })
          .where(eq(users.id, userId));
      }

      // Return updated settings (in a real app, you'd store these in a user_settings table)
      return await this.getUserSettings(userId);
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  // Lapsit operations
  async getLapsitCategories() {
    const categories = await db
      .select({
        id: lapsitCategories.id,
        name: lapsitCategories.name,
        description: lapsitCategories.description
      })
      .from(lapsitCategories)
      .orderBy(lapsitCategories.id);
    return categories;
  }

  async createLapsitReport(reportData: any) {
    const [report] = await db
      .insert(lapsitReports)
      .values({
        categoryId: reportData.categoryId,
        subCategoryId: reportData.subCategoryId,
        title: reportData.title,
        content: reportData.content,
        priority: reportData.priority,
        classification: reportData.classification,
        location: reportData.location,
        attachmentUrl: reportData.attachmentUrl,
        attachmentName: reportData.attachmentName,
        reportedById: reportData.reportedById
      })
      .returning();
    return report;
  }

  async getLapsitReports() {
    console.log('[Storage] Getting lapsit reports from database');
    const reports = await db
      .select({
        id: lapsitReports.id,
        title: lapsitReports.title,
        content: lapsitReports.content,
        priority: lapsitReports.priority,
        classification: lapsitReports.classification,
        location: lapsitReports.location,
        attachmentUrl: lapsitReports.attachmentUrl,
        attachmentName: lapsitReports.attachmentName,
        createdAt: lapsitReports.createdAt,
        categoryName: lapsitCategories.name,
        subCategoryName: lapsitSubCategories.name,
        reporterCallsign: users.callsign,
        reportedById: lapsitReports.reportedById
      })
      .from(lapsitReports)
      .leftJoin(lapsitCategories, eq(lapsitReports.categoryId, lapsitCategories.id))
      .leftJoin(lapsitSubCategories, eq(lapsitReports.subCategoryId, lapsitSubCategories.id))
      .leftJoin(users, eq(lapsitReports.reportedById, users.id))
      .orderBy(desc(lapsitReports.createdAt));
    
    console.log(`[Storage] Found ${reports.length} lapsit reports`);
    return reports;
  }

  // Filter messages for user - exclude deleted messages for specific user
  async filterMessagesForUser(messages: any[], userId: number): Promise<any[]> {
    try {
      // Get all deleted message IDs for this user
      const deletedMessageResults = await db
        .select({ messageId: deletedMessagesPerUser.messageId })
        .from(deletedMessagesPerUser)
        .where(eq(deletedMessagesPerUser.userId, userId));
      
      const deletedMessageIdSet = new Set(deletedMessageResults.map((dm: any) => dm.messageId));
      
      // Filter out messages that are deleted for this user or globally deleted
      return messages.filter(msg => {
        // If message is deleted globally, hide it for everyone
        if (msg.isDeleted) return false;
        
        // If message is deleted for this specific user, hide it only for them
        if (deletedMessageIdSet.has(msg.id)) return false;
        
        return true;
      });
    } catch (error) {
      console.error("Error filtering messages for user:", error);
      return messages; // Return original messages if filtering fails
    }
  }
}

// Export DatabaseStorage instance to be used in the application
export const storage = new DatabaseStorage();
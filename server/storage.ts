import bcrypt from 'bcryptjs';
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
  isUserOnline(userId: number): Promise<boolean>;
  
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
  hideConversationForUser(userId: number, conversationId: number): Promise<void>;
  unhideConversationForUser(userId: number, conversationId: number): Promise<void>;
  findHiddenDirectChatBetweenUsers(userId: number, otherUserId: number): Promise<Conversation | undefined>;
  clearChatHistoryForUser(userId: number, conversationId: number): Promise<void>;
  
  // Message operations
  createMessage(data: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  getMessagesByConversationForUser(conversationId: number, userId: number, limit?: number, offset?: number): Promise<{messages: Message[], total: number, hasMore: boolean}>;
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
  
  // User settings operations
  updateUserStatus(userId: number, status: string): Promise<void>;
  changeUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }>;
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

  async isUserOnline(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.status === 'online';
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
  
  async getUserConversations(userId: number): Promise<any[]> {
    console.log(`[Storage] Getting conversations for user ID: ${userId}`);
    
    // Get all conversations where user is a member and not hidden
    const members = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.userId, userId),
          eq(conversationMembers.isHidden, false)
        )
      );

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
    
    // Add unread count, member count, and personal last message for each conversation
    const conversationsWithUnreadAndMembers = await Promise.all(
      userConversations.map(async (conv) => {
        // Get unread message count for this user in this conversation
        const unreadCount = await this.getUnreadMessageCount(conv.id, userId);
        
        // Get member count for this conversation
        const members = await this.getConversationMembers(conv.id);
        const memberCount = members.length;
        
        // Get personal last message (that hasn't been deleted by this user)
        const personalLastMessage = await this.getPersonalLastMessage(conv.id, userId);
        
        // Determine what to show as last message
        let displayLastMessage = "Belum ada pesan";
        let displayLastMessageTime = conv.lastMessageTime;
        
        if (personalLastMessage) {
          // User has visible messages, show the latest one
          displayLastMessage = personalLastMessage.content;
          displayLastMessageTime = personalLastMessage.createdAt;
        } else if (conv.lastMessage) {
          // User has no visible messages but conversation has messages (user cleared them)
          displayLastMessage = "Belum ada pesan";
          displayLastMessageTime = null;
        }
        
        return {
          ...conv,
          unreadCount,
          memberCount,
          lastMessage: displayLastMessage,
          lastMessageTime: displayLastMessageTime
        };
      })
    );
    
    return conversationsWithUnreadAndMembers;
  }

  // Helper function to get unread message count for a user in a conversation
  async getUnreadMessageCount(conversationId: number, userId: number): Promise<number> {
    try {
      // Get all messages in this conversation that are not read by this user
      const unreadMessages = await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            ne(messages.senderId, userId), // Don't count user's own messages
            eq(messages.isRead, false), // Only unread messages
            eq(messages.isDeleted, false) // Don't count deleted messages
          )
        );
      
      // Also filter out messages deleted by this specific user
      const deletedByUser = await db
        .select({ messageId: deletedMessagesPerUser.messageId })
        .from(deletedMessagesPerUser)
        .where(eq(deletedMessagesPerUser.userId, userId));
      
      const deletedMessageIds = new Set(deletedByUser.map(d => d.messageId));
      
      // Filter out messages deleted by this user
      const actualUnreadMessages = unreadMessages.filter(msg => !deletedMessageIds.has(msg.id));
      
      console.log(`[Storage] Unread count for user ${userId} in conversation ${conversationId}: ${actualUnreadMessages.length}`);
      return actualUnreadMessages.length;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // Mark messages as read for a specific user in a conversation
  async markConversationMessagesAsRead(conversationId: number, userId: number): Promise<void> {
    try {
      console.log(`[Storage] Marking messages as read for user ${userId} in conversation ${conversationId}`);
      
      // Update all unread messages in this conversation (except user's own messages) to read
      await db
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.conversationId, conversationId),
            ne(messages.senderId, userId), // Don't mark user's own messages
            eq(messages.isRead, false) // Only update unread messages
          )
        );
      
      console.log(`[Storage] Messages marked as read for user ${userId} in conversation ${conversationId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
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

  async getConversationMembers(conversationId: number): Promise<any[]> {
    const members = await db
      .select({
        id: conversationMembers.id,
        conversationId: conversationMembers.conversationId,
        userId: conversationMembers.userId,
        role: conversationMembers.role,
        joinedAt: conversationMembers.joinedAt,
        isHidden: conversationMembers.isHidden,
        // Include user details
        callsign: users.callsign,
        fullName: users.fullName,
        rank: users.rank,
        branch: users.branch,
        status: users.status,
        profileImageUrl: users.profileImageUrl,
      })
      .from(conversationMembers)
      .leftJoin(users, eq(conversationMembers.userId, users.id))
      .where(eq(conversationMembers.conversationId, conversationId));

    return members;
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

  async getMessagesByConversationForUser(conversationId: number, userId: number, limit?: number, offset?: number): Promise<{messages: Message[], total: number, hasMore: boolean}> {
    try {
      // Get all messages for the conversation ordered by creation time (ascending for chronological order)
      const allMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      // Get messages deleted by this specific user
      const deletedByUser = await db
        .select({ messageId: deletedMessagesPerUser.messageId })
        .from(deletedMessagesPerUser)
        .where(eq(deletedMessagesPerUser.userId, userId));

      const deletedMessageIds = new Set(deletedByUser.map(d => d.messageId));

      // Filter out messages deleted by this user
      const visibleMessages = allMessages.filter(msg => !deletedMessageIds.has(msg.id));

      const total = visibleMessages.length;

      // If pagination is requested, apply limit and offset
      let paginatedMessages = visibleMessages;
      if (limit !== undefined && offset !== undefined) {
        // For pagination, we want the most recent messages, so we slice from the end
        // If offset=0 and limit=15, get last 15 messages
        // If offset=15 and limit=15, get 15 messages before the last 15
        const startIndex = Math.max(0, total - offset - limit);
        const endIndex = total - offset;
        paginatedMessages = visibleMessages.slice(startIndex, endIndex);

        console.log(`[Storage] Pagination: total=${total}, offset=${offset}, limit=${limit}, startIndex=${startIndex}, endIndex=${endIndex}, returned=${paginatedMessages.length}`);
      }

      const hasMore = offset !== undefined ? (offset + (limit || 0)) < total : false;

      console.log(`[Storage] User ${userId} sees ${paginatedMessages.length}/${total} messages in conversation ${conversationId}`);
      console.log(`[Storage] User ${userId} has ${deletedMessageIds.size} deleted messages`);
      console.log(`[Storage] hasMore=${hasMore}`);

      return {
        messages: paginatedMessages,
        total,
        hasMore
      };
    } catch (error) {
      console.error(`Error getting messages for user ${userId} in conversation ${conversationId}:`, error);
      return {
        messages: [],
        total: 0,
        hasMore: false
      };
    }
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

  async hideConversationForUser(userId: number, conversationId: number): Promise<void> {
    try {
      // Update the conversation member record to set isHidden = true
      await db
        .update(conversationMembers)
        .set({ isHidden: true })
        .where(
          and(
            eq(conversationMembers.userId, userId),
            eq(conversationMembers.conversationId, conversationId)
          )
        );
      
      console.log(`[Storage] Hidden conversation ${conversationId} for user ${userId}`);
    } catch (error) {
      console.error(`Error hiding conversation ${conversationId} for user ${userId}:`, error);
      throw new Error("Failed to hide conversation for user");
    }
  }

  async unhideConversationForUser(userId: number, conversationId: number): Promise<void> {
    try {
      // Update the conversation member record to set isHidden = false
      await db
        .update(conversationMembers)
        .set({ isHidden: false })
        .where(
          and(
            eq(conversationMembers.userId, userId),
            eq(conversationMembers.conversationId, conversationId)
          )
        );
      
      console.log(`[Storage] Unhidden conversation ${conversationId} for user ${userId}`);
    } catch (error) {
      console.error(`Error unhiding conversation ${conversationId} for user ${userId}:`, error);
      throw new Error("Failed to unhide conversation for user");
    }
  }

  async findHiddenDirectChatBetweenUsers(userId: number, otherUserId: number): Promise<Conversation | undefined> {
    try {
      // Query untuk mencari conversation yang disembunyikan antara dua user
      const hiddenConversations = await db
        .select({
          conversation: conversations,
          member: conversationMembers
        })
        .from(conversations)
        .innerJoin(conversationMembers, eq(conversations.id, conversationMembers.conversationId))
        .where(
          and(
            eq(conversations.isGroup, false), // Direct chat saja
            eq(conversationMembers.userId, userId),
            eq(conversationMembers.isHidden, true) // Yang disembunyikan
          )
        );

      console.log(`[Storage] Found ${hiddenConversations.length} hidden conversations for user ${userId}`);

      // Untuk setiap conversation yang disembunyikan, cek apakah ada otherUserId sebagai member
      for (const hiddenConv of hiddenConversations) {
        const members = await this.getConversationMembers(hiddenConv.conversation.id);
        const memberIds = members.map(m => m.userId);
        
        // Jika conversation berisi tepat 2 member dan salah satunya adalah otherUserId
        if (memberIds.length === 2 && 
            memberIds.includes(userId) && 
            memberIds.includes(otherUserId)) {
          console.log(`[Storage] Found hidden direct chat ${hiddenConv.conversation.id} between users ${userId} and ${otherUserId}`);
          return hiddenConv.conversation;
        }
      }

      console.log(`[Storage] No hidden direct chat found between users ${userId} and ${otherUserId}`);
      return undefined;
    } catch (error) {
      console.error(`Error finding hidden direct chat between users ${userId} and ${otherUserId}:`, error);
      return undefined;
    }
  }

  async clearChatHistoryForUser(userId: number, conversationId: number): Promise<void> {
    try {
      // Tandai semua pesan dalam conversation ini sebagai "deleted for this user"
      const conversationMessages = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.conversationId, conversationId));

      console.log(`[Storage] Found ${conversationMessages.length} messages to clear for user ${userId} in conversation ${conversationId}`);

      // Untuk setiap pesan, tandai sebagai deleted untuk user ini
      for (const message of conversationMessages) {
        await this.markMessageAsDeletedForUser(message.id, userId);
      }

      // Update last_message di conversation untuk user ini dengan mengecek pesan terakhir yang masih terlihat
      await this.updateLastMessageAfterClear(conversationId, userId);

      console.log(`[Storage] Cleared chat history for user ${userId} in conversation ${conversationId}`);
    } catch (error) {
      console.error(`Error clearing chat history for user ${userId} in conversation ${conversationId}:`, error);
      throw new Error("Failed to clear chat history for user");
    }
  }

  async updateLastMessageAfterClear(conversationId: number, userId: number): Promise<void> {
    try {
      // Get remaining visible messages for this user
      const result = await this.getMessagesByConversationForUser(conversationId, userId);
      const visibleMessages = result.messages;

      if (visibleMessages.length === 0) {
        // Jika tidak ada pesan yang tersisa untuk user ini, set last_message ke null untuk conversation member
        // Tapi kita tidak bisa update per-user di table conversations, jadi kita skip update ini
        // Last message akan ter-update ketika ada pesan baru
        console.log(`[Storage] No visible messages left for user ${userId} in conversation ${conversationId}`);
      } else {
        // Ada pesan yang masih terlihat, ambil yang terakhir
        const lastMessage = visibleMessages[visibleMessages.length - 1];
        console.log(`[Storage] Last visible message for user ${userId}: "${lastMessage.content}"`);
      }
    } catch (error) {
      console.error(`Error updating last message after clear for user ${userId}:`, error);
    }
  }

  async getPersonalLastMessage(conversationId: number, userId: number): Promise<any | null> {
    try {
      // Get all visible messages for this user
      const result = await this.getMessagesByConversationForUser(conversationId, userId);
      const visibleMessages = result.messages;

      console.log(`[Storage] Personal last message check for user ${userId} in conversation ${conversationId}: ${visibleMessages.length} visible messages`);

      if (visibleMessages.length === 0) {
        console.log(`[Storage] No visible messages for user ${userId} in conversation ${conversationId} - returning null`);
        return null; // No visible messages for this user
      }

      // Return the last visible message
      const lastMessage = visibleMessages[visibleMessages.length - 1];
      console.log(`[Storage] Last visible message for user ${userId}: "${lastMessage.content}"`);
      return lastMessage;
    } catch (error) {
      console.error(`Error getting personal last message for user ${userId}:`, error);
      return null;
    }
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



  // Get single call by callId for status checking
  async getCallByCallId(callId: string): Promise<any> {
    try {
      const [call] = await db
        .select()
        .from(callHistory)
        .where(eq(callHistory.callId, callId))
        .limit(1);
      
      return call || null;
    } catch (error) {
      console.error(`Error getting call by callId ${callId}:`, error);
      throw error;
    }
  }

  // Call history using database storage
  async getCallHistory(userId: number): Promise<any[]> {
    try {
      // Show ALL calls where user participated (including calls they initiated)
      const calls = await db
        .select()
        .from(callHistory)
        .where(
          or(
            // User is in participants
            sql`${callHistory.participants} @> ARRAY[${userId.toString()}]::text[]`,
            // User is the initiator
            eq(callHistory.initiatorId, userId)
          )
        )
        .orderBy(desc(callHistory.startTime));

      // Enrich with contact names
      const enrichedCalls = await Promise.all(calls.map(async (call) => {
        let contactName = 'Unknown';
        const isIncoming = call.initiatorId !== userId; // Check if call is incoming or outgoing

        if (call.conversationId) {
          // Group call - get conversation name
          const [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, call.conversationId));
          contactName = conversation?.name || 'Group Call';
        } else {
          // Individual call - get the other user's name
          if (isIncoming) {
            // Incoming call - show caller's name
            const [callerUser] = await db
              .select()
              .from(users)
              .where(eq(users.id, call.initiatorId));
            contactName = callerUser ? (callerUser.callsign || callerUser.fullName || 'Unknown') : 'Unknown';
          } else {
            // Outgoing call - show recipient's name
            const otherParticipant = call.participants?.find((id: string) => parseInt(id) !== userId);
            if (otherParticipant) {
              const [recipientUser] = await db
                .select()
                .from(users)
                .where(eq(users.id, parseInt(otherParticipant)));
              contactName = recipientUser ? (recipientUser.callsign || recipientUser.fullName || 'Unknown') : 'Unknown';
            }
          }
        }

        // Map database status to display status
        let displayStatus = call.status;
        if (call.status === 'ended') {
          displayStatus = 'ended';
        } else if (call.status === 'accepted') {
          displayStatus = 'accepted';
        } else if (call.status === 'missed') {
          // Missed call - show as missed for both caller and receiver
          displayStatus = isIncoming ? 'missed' : 'cancelled';
        } else if (call.status === 'rejected') {
          displayStatus = isIncoming ? 'missed' : 'declined';
        } else if (call.status === 'incoming') {
          // Still ringing/unanswered - shouldn't normally be in history but treat as missed
          displayStatus = 'missed';
        }

        // Get participant names for group calls
        let participantNames: string[] = [];
        if (call.participants && call.participants.length > 0) {
          try {
            const participantUsers = await db
              .select()
              .from(users)
              .where(inArray(users.id, call.participants.map((id: string) => parseInt(id))));
            participantNames = participantUsers.map(user => user.callsign || user.fullName || 'Unknown');
          } catch (error) {
            console.error('Error getting participant names:', error);
          }
        }

        return {
          id: call.id,
          callId: call.callId,
          callType: call.callType,
          fromUserId: call.initiatorId,
          toUserId: userId,
          contactName,
          isOutgoing: !isIncoming, // True if user initiated the call
          status: displayStatus,
          duration: call.duration || 0,
          timestamp: call.startTime.toISOString(),
          fromUserName: contactName,
          participants: call.participants || [],
          participantNames
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

  // Update group call participants
  async updateGroupCallParticipants(callId: string, participants: string[]): Promise<void> {
    try {
      await db
        .update(callHistory)
        .set({ participants })
        .where(eq(callHistory.callId, callId));
      console.log(`[Storage] Updated participants for call ${callId}:`, participants);
    } catch (error) {
      console.error(`Error updating participants for call ${callId}:`, error);
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

  // Update user status
  async updateUserStatus(userId: number, status: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Change user password
  async changeUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get current user to verify password
      const user = await this.getUser(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Hash new password
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await db
        .update(users)
        .set({ 
          password: hashedNewPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Error changing password:', error);
      return { success: false, message: 'Failed to change password' };
    }
  }

  // Get groups that a user is a member of
  async getUserGroups(userId: number): Promise<any[]> {
    try {
      console.log(`[Storage] Getting groups for user ${userId}`);
      
      const userGroups = await db
        .select({
          groupId: conversationMembers.conversationId,
          groupName: conversations.name,
          isRoom: conversations.isRoom
        })
        .from(conversationMembers)
        .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
        .where(
          and(
            eq(conversationMembers.userId, userId),
            eq(conversations.isRoom, true) // Only get group rooms
          )
        );

      console.log(`[Storage] Found ${userGroups.length} groups for user ${userId}:`, userGroups);
      return userGroups;
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  }

  // Get group members (for group calls)
  async getGroupMembers(groupId: number): Promise<number[]> {
    try {
      console.log(`[Storage] Getting members for group ${groupId}`);
      
      const members = await db
        .select({ userId: conversationMembers.userId })
        .from(conversationMembers)
        .where(eq(conversationMembers.conversationId, groupId));

      const memberIds = members.map(m => m.userId);
      console.log(`[Storage] Found ${memberIds.length} members for group ${groupId}:`, memberIds);
      return memberIds;
    } catch (error) {
      console.error('Error getting group members:', error);
      return [];
    }
  }

  // Get online users from a list of user IDs
  async getOnlineUsers(userIds: number[]): Promise<number[]> {
    try {
      // For now, just return all users as online since we don't have real-time status tracking
      // In a real system, you'd check WebSocket connections or last_seen timestamps
      console.log(`[Storage] Checking online status for users:`, userIds);
      
      const onlineUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, userIds));

      const onlineIds = onlineUsers.map(u => u.id);
      console.log(`[Storage] Online users:`, onlineIds);
      return onlineIds;
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }
}

// Export DatabaseStorage instance to be used in the application
export const storage = new DatabaseStorage();
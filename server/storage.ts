import {
  users,
  rooms,
  roomMembers,
  directChats,
  messages,
  calls,
  groupCalls,
  groupCallParticipants,
  type User,
  type InsertUser,
  type Message,
  type InsertMessage,
  type Room,
  type InsertRoom,
  type RoomMember,
  type InsertRoomMember,
  type DirectChat,
  type InsertDirectChat,
  type Call,
  type InsertCall,
  type GroupCall,
  type InsertGroupCall,
  type GroupCallParticipant,
  type InsertGroupCallParticipant,
} from "@shared/schema";
import { db, pool } from "./db";
import { sql, eq, and, or, inArray, desc, isNull, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByCallsign(callsign: string): Promise<User | undefined>;
  getUserByNrp(nrp: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  updateUserLastOnline(userId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: InsertUser): Promise<User>;
  verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean>;

  // Room operations
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(data: InsertRoom): Promise<Room>;
  getUserRooms(userId: string): Promise<Room[]>;
  deleteRoom(id: number): Promise<void>;
  
  // Room members operations
  addMemberToRoom(data: InsertRoomMember): Promise<RoomMember>;
  getRoomMembers(roomId: number): Promise<RoomMember[]>;
  getUsersInRoom(roomId: number): Promise<User[]>;
  isUserInRoom(userId: string, roomId: number): Promise<boolean>;
  
  // Direct chat operations
  getDirectChat(id: number): Promise<DirectChat | undefined>;
  getDirectChatBetweenUsers(userId1: string, userId2: string): Promise<DirectChat | undefined>;
  createDirectChat(data: InsertDirectChat): Promise<DirectChat>;
  getUserDirectChats(userId: string): Promise<DirectChat[]>;
  
  // Verifikasi akses ke chat
  isUserInChat(userId: string, chatId: number, isRoom: boolean): Promise<boolean>;
  
  // Message operations
  createMessage(data: InsertMessage): Promise<Message>;
  getMessagesByRoomId(roomId: number): Promise<Message[]>;
  getMessagesByDirectChatId(directChatId: number): Promise<Message[]>;
  clearChatHistory(roomId?: number, directChatId?: number): Promise<void>;
  
  // Message actions (delete, reply, forward)
  deleteMessage(messageId: number): Promise<Message>;
  getMessage(messageId: number): Promise<Message | undefined>;
  forwardMessage(originalMessageId: number, targetRoomId?: number, targetDirectChatId?: number, senderId?: string): Promise<Message>;
  
  // Call operations
  createCall(data: InsertCall): Promise<Call>;
  updateCallStatus(callId: number, status: string, endTime?: Date): Promise<Call | undefined>;
  getActiveCallsByUser(userId: string): Promise<Call[]>;
  
  // Group call operations
  createGroupCall(data: InsertGroupCall): Promise<GroupCall>;
  getActiveGroupCallInRoom(roomId: number): Promise<GroupCall | undefined>;
  endGroupCall(groupCallId: number): Promise<GroupCall | undefined>;
  addParticipantToGroupCall(data: InsertGroupCallParticipant): Promise<GroupCallParticipant>;
  removeParticipantFromGroupCall(groupCallId: number, userId: string): Promise<void>;
  getGroupCallParticipants(groupCallId: number): Promise<GroupCallParticipant[]>;
  getAllActiveGroupCalls(): Promise<GroupCall[]>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      return isValid;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  async getUserByCallsign(callsign: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.callsign, callsign));
    return user;
  }

  async getUserByNrp(nrp: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.nrp, nrp));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Gunakan password yang sudah di-hash dari userData
    // ID harus ada dalam userData dari routes.ts (UUID)
    
    console.log("Creating user with data:", {
      ...userData,
      password: "*****" // Sembunyikan password untuk logging
    });
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastOnline: new Date()
      })
      .returning();
    
    console.log("User created successfully with ID:", user.id);
    return user;
  }

  async updateUserLastOnline(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        lastOnline: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async upsertUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastOnline: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  // Room operations
  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.id, id));
    return room;
  }
  
  async createRoom(data: InsertRoom): Promise<Room> {
    const [room] = await db
      .insert(rooms)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return room;
  }
  
  async getUserRooms(userId: string): Promise<Room[]> {
    // Get all roomIds where user is a member
    const memberOf = await db
      .select()
      .from(roomMembers)
      .where(eq(roomMembers.userId, userId));
    
    if (memberOf.length === 0) {
      return [];
    }

    const roomIds = memberOf.map(m => m.roomId);
    
    // Get all rooms for these roomIds
    const userRooms = await db
      .select()
      .from(rooms)
      .where(inArray(rooms.id, roomIds));
    
    return userRooms;
  }
  
  async deleteRoom(id: number): Promise<void> {
    // First delete all messages in this room
    await db
      .delete(messages)
      .where(eq(messages.roomId, id));
    
    // Then delete all members
    await db
      .delete(roomMembers)
      .where(eq(roomMembers.roomId, id));
    
    // Finally delete the room itself
    await db
      .delete(rooms)
      .where(eq(rooms.id, id));
  }
  
  // Room members operations
  async addMemberToRoom(data: InsertRoomMember): Promise<RoomMember> {
    const [member] = await db
      .insert(roomMembers)
      .values({
        ...data,
        joinedAt: new Date()
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
  
  async getUsersInRoom(roomId: number): Promise<User[]> {
    const roomMembersData = await db
      .select({
        userId: roomMembers.userId
      })
      .from(roomMembers)
      .where(eq(roomMembers.roomId, roomId));
    
    if (roomMembersData.length === 0) {
      return [];
    }
    
    const userIds = roomMembersData.map(member => member.userId);
    
    return await db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));
  }
  
  async isUserInRoom(userId: string, roomId: number): Promise<boolean> {
    const [membership] = await db
      .select()
      .from(roomMembers)
      .where(
        and(
          eq(roomMembers.roomId, roomId),
          eq(roomMembers.userId, userId)
        )
      );
    
    return !!membership;
  }
  
  // Direct chat operations
  async getDirectChat(id: number): Promise<DirectChat | undefined> {
    const [directChat] = await db
      .select()
      .from(directChats)
      .where(eq(directChats.id, id));
    return directChat;
  }
  
  async getDirectChatBetweenUsers(userId1: string, userId2: string): Promise<DirectChat | undefined> {
    // Check both combinations of user1 and user2
    const [chat] = await db
      .select()
      .from(directChats)
      .where(
        or(
          and(
            eq(directChats.user1Id, userId1),
            eq(directChats.user2Id, userId2)
          ),
          and(
            eq(directChats.user1Id, userId2),
            eq(directChats.user2Id, userId1)
          )
        )
      );
    
    return chat;
  }
  
  async createDirectChat(data: InsertDirectChat): Promise<DirectChat> {
    const [directChat] = await db
      .insert(directChats)
      .values({
        ...data,
        createdAt: new Date()
      })
      .returning();
    return directChat;
  }
  
  async getUserDirectChats(userId: string): Promise<DirectChat[]> {
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
  
  // Verifikasi akses ke chat
  async isUserInChat(userId: string, chatId: number, isRoom: boolean): Promise<boolean> {
    console.log(`[isUserInChat] Checking access for user ${userId} to chat ${chatId} (isRoom: ${isRoom})`);
    
    try {
      if (isRoom) {
        // Verifikasi apakah user adalah anggota room
        const isInRoom = await this.isUserInRoom(userId, chatId);
        console.log(`[isUserInChat] Room check result: ${isInRoom}`);
        return isInRoom;
      } else {
        // Verifikasi apakah chat direct ini milik user
        const [directChat] = await db
          .select()
          .from(directChats)
          .where(
            and(
              eq(directChats.id, chatId),
              or(
                eq(directChats.user1Id, userId),
                eq(directChats.user2Id, userId)
              )
            )
          );
        
        const hasAccess = !!directChat;
        console.log(`[isUserInChat] Direct chat check result: ${hasAccess}`);
        
        if (!hasAccess) {
          // Debug: Cari chat dengan ID ini
          const [checkChat] = await db.select().from(directChats).where(eq(directChats.id, chatId));
          console.log(`[isUserInChat] Direct chat exists: ${!!checkChat}`, checkChat || 'Not found');
          
          // Debug: Periksa semua direct chat milik user ini
          const userChats = await db
            .select()
            .from(directChats)
            .where(
              or(
                eq(directChats.user1Id, userId),
                eq(directChats.user2Id, userId)
              )
            );
          console.log(`[isUserInChat] User ${userId} has ${userChats.length} direct chats:`, 
            userChats.map(c => `ID: ${c.id}, user1: ${c.user1Id}, user2: ${c.user2Id}`));
        }
        
        return hasAccess;
      }
    } catch (error) {
      console.error(`[isUserInChat] Error checking access:`, error);
      return false;
    }
  }
  
  // Message operations
  async createMessage(data: any): Promise<any> {
    console.log("[DEBUG] createMessage called with data:", data);
    
    try {
      // Jika ini direct chat, perlu pastikan kita gunakan directChatId, bukan roomId
      if (data.roomId && !data.isRoom) {
        console.log(`[DEBUG] Ini direct chat (ID: ${data.roomId}), memeriksa apakah perlu penyesuaian...`);
        
        // Periksa apakah ID ada di tabel direct_chats
        const directChatResult = await pool.query(
          `SELECT * FROM direct_chats WHERE id = $1`,
          [data.roomId]
        );
        
        if (directChatResult.rows.length > 0) {
          console.log(`[DEBUG] ID ${data.roomId} ditemukan di tabel direct_chats, mengubah ke directChatId`);
          // Ini adalah direct chat, gunakan directChatId dan hapus roomId
          data.directChatId = data.roomId;
          delete data.roomId;
        } else {
          console.log(`[DEBUG] ID ${data.roomId} tidak ditemukan di tabel direct_chats, mencari di tabel rooms...`);
          // Cek apakah ID ada di tabel rooms
          const roomResult = await pool.query(
            `SELECT * FROM rooms WHERE id = $1`,
            [data.roomId]
          );
          
          if (roomResult.rows.length === 0) {
            console.log(`[DEBUG] ID ${data.roomId} juga tidak ditemukan di tabel rooms, mencari di conversations...`);
            
            // Coba cari direct_chat dengan kedua user
            if (data.senderId) {
              // Coba temukan direct_chat yang sesuai dari senderId
              const matchResult = await pool.query(
                `SELECT * FROM direct_chats WHERE 
                 (user1_id = $1 OR user2_id = $1)`,
                [data.senderId]
              );
              
              if (matchResult.rows.length > 0) {
                const directChat = matchResult.rows[0];
                console.log(`[DEBUG] Menemukan direct_chat yang cocok: ${directChat.id}`);
                data.directChatId = directChat.id;
                delete data.roomId;
              }
            }
          }
        }
      }
      
      // Jika ada conversationId, ini adalah pesan ke conversation lama
      if (data.conversationId) {
        // Pastikan conversation ada
        const conversationId = data.conversationId;
        delete data.conversationId; // Hapus dari object karena schema tidak mengenalnya
        
        console.log(`[DEBUG] Mencoba mencari conversation dengan ID: ${conversationId}`);
        // Gunakan nama table literal karena kita tahu bahwa tabel 'conversations' ada di database
        // tapi mungkin tidak didefinisikan dalam model
        // Gunakan pool yang sudah diimpor dari db.ts
        const result = await pool.query(
          `SELECT * FROM conversations WHERE id = $1`,
          [conversationId]
        );
        
        const conversations = result.rows;
        console.log(`[DEBUG] Query conversation result:`, conversations);
        
        if (!conversations || conversations.length === 0) {
          console.log(`[DEBUG] Conversation dengan ID ${conversationId} tidak ditemukan`);
          throw new Error(`Conversation dengan ID ${conversationId} tidak ditemukan`);
        }
        
        // Cek apakah ini direct chat
        if (conversations[0].name && conversations[0].name.startsWith('Direct Chat')) {
          console.log(`[DEBUG] Conversation ini mungkin direct chat, cek tabel direct_chats`);
          
          // Cari apakah ada direct chat dengan ID ini
          const directChatResult = await pool.query(
            `SELECT * FROM direct_chats WHERE id = $1`,
            [conversationId]
          );
          
          if (directChatResult.rows.length > 0) {
            console.log(`[DEBUG] Menemukan direct chat dengan ID ${conversationId}`);
            data.directChatId = conversationId;
          } else {
            data.roomId = conversationId;
          }
        } else {
          // Gunakan roomId untuk room biasa
          data.roomId = conversationId;
        }
      }
      
      console.log(`[DEBUG] Nilai akhir yang akan disimpan:`, data);
      
      // Insert pesan ke database
      const messageData = { 
        ...data,
        sentAt: new Date(),
        updatedAt: new Date()
      };
      
      // Hapus isRoom karena tidak termasuk dalam skema database
      if (messageData.isRoom !== undefined) {
        delete messageData.isRoom;
      }
      
      const [message] = await db
        .insert(messages)
        .values(messageData)
        .returning();
      
      console.log(`[DEBUG] Pesan berhasil dibuat dengan ID: ${message.id}`);
      
      // Update conversation dengan pesan terakhir
      if (message.roomId) {
        try {
          // Gunakan pool untuk update conversation
          await pool.query(
            `UPDATE conversations 
             SET last_message = $1, 
                 last_message_time = $2, 
                 updated_at = $3 
             WHERE id = $4`,
            [data.content, new Date(), new Date(), message.roomId]
          );
          
          console.log(`[DEBUG] Conversation ${message.roomId} diupdate dengan pesan terakhir`);
        } catch (updateError) {
          console.error(`[DEBUG] Gagal update conversation:`, updateError);
        }
      }
      
      return message;
    } catch (error) {
      console.error(`[DEBUG] Error dalam createMessage:`, error);
      throw error;
    }
  }

  async getMessagesByRoomId(roomId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(asc(messages.sentAt));
  }
  
  async getMessagesByDirectChatId(directChatId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.directChatId, directChatId))
      .orderBy(asc(messages.sentAt));
  }
  
  async clearChatHistory(roomId?: number, directChatId?: number): Promise<void> {
    if (roomId) {
      await db
        .delete(messages)
        .where(eq(messages.roomId, roomId));
    } else if (directChatId) {
      await db
        .delete(messages)
        .where(eq(messages.directChatId, directChatId));
    }
  }
  
  // Message actions (delete, reply, forward)
  async getMessage(messageId: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
    
    return message;
  }
  
  async deleteMessage(messageId: number): Promise<Message> {
    // Update message status to deleted
    const [updatedMessage] = await db
      .update(messages)
      .set({
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();
    
    return updatedMessage;
  }
  
  async forwardMessage(originalMessageId: number, targetRoomId?: number, targetDirectChatId?: number, senderId?: string): Promise<Message> {
    // Get the original message
    const originalMessage = await this.getMessage(originalMessageId);
    
    if (!originalMessage) {
      throw new Error("Pesan asli tidak ditemukan");
    }
    
    // Create a new message with the same content and attachments
    const forwardData: InsertMessage = {
      content: `[Diteruskan] ${originalMessage.content}`,
      senderId: senderId || originalMessage.senderId,
      // Exactly one of roomId or directChatId must be set
      roomId: targetRoomId,
      directChatId: targetDirectChatId,
      type: originalMessage.type,
      attachment: originalMessage.attachment,
      forwardedFromId: originalMessageId,
    };
    
    // Insert the new message
    const newMessage = await this.createMessage(forwardData);
    return newMessage;
  }
  
  // Call operations
  async createCall(data: InsertCall): Promise<Call> {
    const [call] = await db
      .insert(calls)
      .values({
        ...data,
        startTime: new Date(),
      })
      .returning();
    return call;
  }
  
  async updateCallStatus(callId: number, status: string, endTime?: Date): Promise<Call | undefined> {
    const updateData: Partial<Call> = { status };
    
    if (endTime || status === "ended" || status === "missed" || status === "rejected") {
      updateData.endTime = endTime || new Date();
    }
    
    const [call] = await db
      .update(calls)
      .set(updateData)
      .where(eq(calls.id, callId))
      .returning();
    
    return call;
  }
  
  async getActiveCallsByUser(userId: string): Promise<Call[]> {
    return await db
      .select()
      .from(calls)
      .where(
        and(
          or(
            eq(calls.callerId, userId),
            eq(calls.receiverId, userId)
          ),
          isNull(calls.endTime),
          or(
            eq(calls.status, "initiated"),
            eq(calls.status, "connected")
          )
        )
      );
  }
  
  // Group call operations
  async createGroupCall(data: InsertGroupCall): Promise<GroupCall> {
    const [groupCall] = await db
      .insert(groupCalls)
      .values({
        ...data,
        startTime: new Date(),
        active: true
      })
      .returning();
    
    return groupCall;
  }
  
  async getActiveGroupCallInRoom(roomId: number): Promise<GroupCall | undefined> {
    const [groupCall] = await db
      .select()
      .from(groupCalls)
      .where(
        and(
          eq(groupCalls.roomId, roomId),
          eq(groupCalls.active, true)
        )
      );
    
    return groupCall;
  }
  
  async endGroupCall(groupCallId: number): Promise<GroupCall | undefined> {
    const [groupCall] = await db
      .update(groupCalls)
      .set({
        active: false,
        endTime: new Date()
      })
      .where(eq(groupCalls.id, groupCallId))
      .returning();
    
    return groupCall;
  }
  
  async addParticipantToGroupCall(data: InsertGroupCallParticipant): Promise<GroupCallParticipant> {
    const [participant] = await db
      .insert(groupCallParticipants)
      .values({
        ...data,
        joinedAt: new Date()
      })
      .returning();
    
    return participant;
  }
  
  async removeParticipantFromGroupCall(groupCallId: number, userId: string): Promise<void> {
    await db
      .update(groupCallParticipants)
      .set({
        leftAt: new Date()
      })
      .where(
        and(
          eq(groupCallParticipants.groupCallId, groupCallId),
          eq(groupCallParticipants.userId, userId)
        )
      );
  }
  
  async getGroupCallParticipants(groupCallId: number): Promise<GroupCallParticipant[]> {
    return await db
      .select()
      .from(groupCallParticipants)
      .where(
        and(
          eq(groupCallParticipants.groupCallId, groupCallId),
          isNull(groupCallParticipants.leftAt)
        )
      );
  }
  
  async getAllActiveGroupCalls(): Promise<GroupCall[]> {
    return await db
      .select()
      .from(groupCalls)
      .where(eq(groupCalls.active, true));
  }
}

// Export DatabaseStorage instance to be used in the application
export const storage = new DatabaseStorage();
import { IStorage } from './storage';
import { 
  User, InsertUser, Room, InsertRoom, RoomMember, InsertRoomMember,
  DirectChat, InsertDirectChat, Message, InsertMessage, Call, InsertCall,
  MessageWithSender, RoomWithMembers, ChatListItem,
  users, rooms, roomMembers, directChats, messages, calls
} from '@shared/schema';
import { db } from './db';
import { eq, or, and, desc, asc, isNull, not } from 'drizzle-orm';
import { calculateExpirationDate } from './messageExpirationService';
import connectPg from 'connect-pg-simple';
import session from 'express-session';
import { pool } from './db';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserOnlineStatus(id: number, isOnline: boolean): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        isOnline, 
        lastSeen: isOnline ? undefined : new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async getOnlineUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isOnline, true));
  }

  // Room operations
  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async getRoomsByUserId(userId: number): Promise<Room[]> {
    try {
      console.log(`Fetching rooms for user ${userId}`);
      // Hanya pilih kolom yang benar-benar ada di tabel rooms
      const userRooms = await db
        .select({
          id: rooms.id,
          name: rooms.name,
          createdAt: rooms.createdAt
        })
        .from(roomMembers)
        .innerJoin(rooms, eq(roomMembers.roomId, rooms.id))
        .where(eq(roomMembers.userId, userId));
      
      return userRooms;
    } catch (error) {
      console.error(`Error in getRoomsByUserId:`, error);
      // Return empty array as fallback to prevent app from crashing
      return [];
    }
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async deleteRoom(roomId: number): Promise<boolean> {
    console.log(`Deleting room with ID ${roomId} from database`);
    
    // First, delete all room members to avoid foreign key constraints
    await db
      .delete(roomMembers)
      .where(eq(roomMembers.roomId, roomId));
    
    // Then, delete all messages in the room
    await db
      .delete(messages)
      .where(eq(messages.roomId, roomId));
    
    // Finally, delete the room itself
    const result = await db
      .delete(rooms)
      .where(eq(rooms.id, roomId));
    
    return result.count > 0;
  }

  async getRoomMembers(roomId: number): Promise<User[]> {
    const members = await db
      .select({ user: users })
      .from(roomMembers)
      .innerJoin(users, eq(roomMembers.userId, users.id))
      .where(eq(roomMembers.roomId, roomId));
    
    return members.map(m => m.user);
  }

  async getRoomWithMembers(roomId: number): Promise<RoomWithMembers | undefined> {
    const room = await this.getRoom(roomId);
    if (!room) return undefined;
    
    const members = await this.getRoomMembers(roomId);
    const onlineCount = members.filter(member => member.isOnline).length;
    
    return {
      ...room,
      members,
      onlineCount
    };
  }

  // Room members operations
  async addUserToRoom(member: InsertRoomMember): Promise<RoomMember> {
    // Check if the user is already in the room
    const isAlreadyMember = await this.isUserInRoom(member.userId, member.roomId);
    if (isAlreadyMember) {
      throw new Error(`User ${member.userId} is already a member of room ${member.roomId}`);
    }
    
    const [newMember] = await db.insert(roomMembers).values(member).returning();
    return newMember;
  }

  async removeUserFromRoom(userId: number, roomId: number): Promise<boolean> {
    const result = await db
      .delete(roomMembers)
      .where(
        and(
          eq(roomMembers.userId, userId),
          eq(roomMembers.roomId, roomId)
        )
      );
    
    return result.count > 0;
  }

  async isUserInRoom(userId: number, roomId: number): Promise<boolean> {
    const [member] = await db
      .select()
      .from(roomMembers)
      .where(
        and(
          eq(roomMembers.userId, userId),
          eq(roomMembers.roomId, roomId)
        )
      );
    
    return !!member;
  }
  
  async isUserRoomAdmin(userId: number, roomId: number): Promise<boolean> {
    const [member] = await db
      .select()
      .from(roomMembers)
      .where(
        and(
          eq(roomMembers.userId, userId),
          eq(roomMembers.roomId, roomId)
        )
      );
    
    return member ? member.isAdmin : false;
  }
  
  async getRoomMembersWithAdminStatus(roomId: number): Promise<any[]> {
    const membersWithStatus = await db
      .select({
        id: users.id,
        username: users.username,
        nrp: users.nrp,
        rank: users.rank,
        isOnline: users.isOnline,
        isAdmin: roomMembers.isAdmin,
        joinedAt: roomMembers.joinedAt
      })
      .from(roomMembers)
      .innerJoin(users, eq(roomMembers.userId, users.id))
      .where(eq(roomMembers.roomId, roomId))
      .orderBy(desc(roomMembers.isAdmin), asc(users.username));
    
    return membersWithStatus;
  }
  
  async updateRoomMemberRole(userId: number, roomId: number, isAdmin: boolean): Promise<boolean> {
    const result = await db
      .update(roomMembers)
      .set({ isAdmin })
      .where(
        and(
          eq(roomMembers.userId, userId),
          eq(roomMembers.roomId, roomId)
        )
      );
    
    return result.count > 0;
  }

  // Direct chat operations
  async getDirectChat(id: number): Promise<DirectChat | undefined> {
    const [chat] = await db.select().from(directChats).where(eq(directChats.id, id));
    return chat;
  }

  async getDirectChatByUsers(user1Id: number, user2Id: number): Promise<DirectChat | undefined> {
    const [chat] = await db
      .select()
      .from(directChats)
      .where(
        or(
          and(
            eq(directChats.user1Id, user1Id),
            eq(directChats.user2Id, user2Id)
          ),
          and(
            eq(directChats.user1Id, user2Id),
            eq(directChats.user2Id, user1Id)
          )
        )
      );
    
    return chat;
  }

  async deleteDirectChat(chatId: number): Promise<boolean> {
    console.log(`Deleting direct chat with ID ${chatId} from database`);
    
    // First, delete all messages in the chat to maintain referential integrity
    await db
      .delete(messages)
      .where(eq(messages.directChatId, chatId));
    
    // Then delete the direct chat itself
    const result = await db
      .delete(directChats)
      .where(eq(directChats.id, chatId));
    
    return result.count > 0;
  }

  async createDirectChat(chat: InsertDirectChat): Promise<DirectChat> {
    // Check if chat already exists between these users
    const existingChat = await this.getDirectChatByUsers(chat.user1Id, chat.user2Id);
    if (existingChat) {
      return existingChat;
    }
    
    // Create new chat if it doesn't exist
    const [newChat] = await db.insert(directChats).values(chat).returning();
    return newChat;
  }

  async getDirectChatsByUserId(userId: number): Promise<DirectChat[]> {
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

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.id, id),
          eq(messages.isDeleted, false)
        )
      );
    
    return message;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    // Calculate message expiration time based on classification
    let expiresAt: Date | undefined = undefined;
    
    if (message.classificationType) {
      expiresAt = calculateExpirationDate(message.classificationType);
    } else {
      // Default to routine classification if not specified
      expiresAt = calculateExpirationDate('routine');
    }
    
    const messageWithExpiration = {
      ...message,
      expiresAt
    };
    
    const [newMessage] = await db.insert(messages).values(messageWithExpiration).returning();
    return newMessage;
  }

  async getDirectChatMessages(directChatId: number): Promise<MessageWithSender[]> {
    const messagesWithSenders = await db
      .select({
        message: messages,
        sender: users
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.directChatId, directChatId),
          eq(messages.isDeleted, false)
        )
      )
      .orderBy(asc(messages.createdAt));
    
    return messagesWithSenders.map(m => ({
      ...m.message,
      sender: m.sender
    }));
  }

  async getRoomMessages(roomId: number): Promise<MessageWithSender[]> {
    const messagesWithSenders = await db
      .select({
        message: messages,
        sender: users
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.roomId, roomId),
          eq(messages.isDeleted, false)
        )
      )
      .orderBy(asc(messages.createdAt));
    
    return messagesWithSenders.map(m => ({
      ...m.message,
      sender: m.sender
    }));
  }

  async markMessagesAsRead(chatId: number, isRoom: boolean, userId: number): Promise<void> {
    if (isRoom) {
      await db
        .update(messages)
        .set({ read: true })
        .where(
          and(
            eq(messages.roomId, chatId),
            not(eq(messages.senderId, userId)),
            eq(messages.read, false)
          )
        );
    } else {
      await db
        .update(messages)
        .set({ read: true })
        .where(
          and(
            eq(messages.directChatId, chatId),
            not(eq(messages.senderId, userId)),
            eq(messages.read, false)
          )
        );
    }
  }

  // Call operations
  async createCall(call: InsertCall): Promise<Call> {
    const [newCall] = await db.insert(calls).values(call).returning();
    return newCall;
  }
  
  async getCall(id: number): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call || undefined;
  }

  async updateCallStatus(id: number, status: string, endTime?: Date, duration?: number): Promise<Call> {
    const [updatedCall] = await db
      .update(calls)
      .set({
        status,
        endTime,
        duration
      })
      .where(eq(calls.id, id))
      .returning();
    
    return updatedCall;
  }

  async getCallsByUserId(userId: number): Promise<Call[]> {
    return await db
      .select()
      .from(calls)
      .where(
        or(
          eq(calls.callerId, userId),
          eq(calls.receiverId, userId)
        )
      )
      .orderBy(desc(calls.startTime));
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
          name: otherUser.username || "Unknown User",
          lastMessage: lastMessage ? lastMessage.content : undefined,
          lastMessageTime: lastMessage ? lastMessage.createdAt.toISOString() : undefined,
          unreadCount,
          isRoom: false,
          isOnline: otherUser.isOnline || false,
          otherUserId: otherUser.id,  // Store the other user's ID for easier reference
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
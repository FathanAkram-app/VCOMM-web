import { pgTable, text, serial, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  nrp: text("nrp"),                         // ID Personel/NRP
  fullName: text("full_name"),              // Nama lengkap
  rank: text("rank"),                       // Pangkat
  branch: text("branch"),                   // Cabang/Unit
  role: text("role").default("user"),       // Role (admin, user)
  isOnline: boolean("is_online").default(false),
  deviceInfo: text("device_info"),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  nrp: true,
  fullName: true,
  rank: true,
  branch: true,
  role: true,
  deviceInfo: true,
});

// Rooms (group chats) table
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // Hanya gunakan kolom yang benar-benar ada di database
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  name: true,
});

// Room members table
export const roomMembers = pgTable("room_members", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => rooms.id),
  userId: integer("user_id").notNull().references(() => users.id),
  isAdmin: boolean("is_admin").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => {
  return {
    roomUserUnique: unique().on(table.roomId, table.userId),
  };
});

export const insertRoomMemberSchema = createInsertSchema(roomMembers).pick({
  roomId: true,
  userId: true,
  isAdmin: true,
});

// Direct chats (one-to-one) table
export const directChats = pgTable("direct_chats", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull().references(() => users.id),
  user2Id: integer("user2_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userPairUnique: unique().on(table.user1Id, table.user2Id),
  };
});

export const insertDirectChatSchema = createInsertSchema(directChats).pick({
  user1Id: true,
  user2Id: true,
});

// Messages table (works for both direct chats and room chats)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  directChatId: integer("direct_chat_id").references(() => directChats.id),
  roomId: integer("room_id").references(() => rooms.id),
  createdAt: timestamp("created_at").defaultNow(),
  read: boolean("read").default(false),
  // Message forwarding
  replyToId: integer("reply_to_id").references(() => messages.id),
  forwardedFromId: integer("forwarded_from_id").references(() => messages.id),
  // Message classification and retention
  classificationType: text("classification_type").default("routine"), // routine, sensitive, classified
  expiresAt: timestamp("expires_at"), // When null, message doesn't expire
  isDeleted: boolean("is_deleted").default(false), // Soft delete flag
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  senderId: true,
  directChatId: true,
  roomId: true,
  replyToId: true,
  forwardedFromId: true,
  classificationType: true,
  expiresAt: true,
});

// Call history table
export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callerId: integer("caller_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id),
  roomId: integer("room_id").references(() => rooms.id),
  type: text("type").notNull(), // 'audio' or 'video'
  status: text("status").notNull(), // 'missed', 'answered', 'declined'
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
});

export const insertCallSchema = createInsertSchema(calls).pick({
  callerId: true,
  receiverId: true,
  roomId: true,
  type: true,
  status: true,
});

// Export types for the schema
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type RoomMember = typeof roomMembers.$inferSelect;
export type InsertRoomMember = z.infer<typeof insertRoomMemberSchema>;

export type DirectChat = typeof directChats.$inferSelect;
export type InsertDirectChat = z.infer<typeof insertDirectChatSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

// Frontend types
export interface ChatListItem {
  id: number;
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isRoom: boolean;
  isOnline: boolean;
  avatar?: string;
  otherUserId?: number; // ID of the other user in a direct chat
}

export interface ContactWithStatus extends User {
  isOnline: boolean;
}

export interface MessageWithSender extends Message {
  sender: User;
}

export interface RoomWithMembers extends Room {
  members: User[];
  onlineCount: number;
}

export interface WebRTCSession {
  peer: string;
  type: 'video' | 'audio';
  initiator: boolean;
}

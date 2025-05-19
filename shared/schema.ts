import {
  pgTable,
  text,
  varchar,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  callsign: text("callsign").notNull().unique(),
  password: text("password").notNull(), 
  nrp: text("nrp"),                         // ID Personel/NRP
  fullName: varchar("full_name"),           // Nama lengkap
  rank: varchar("rank"),                    // Pangkat
  branch: varchar("branch"),                // Cabang/Unit
  status: varchar("status").default("offline"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rooms (group chats) table
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

// Schema types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Create schema for user registration
export const registerUserSchema = createInsertSchema(users).pick({
  callsign: true,
  password: true,
  nrp: true,
  fullName: true,
  rank: true,
  branch: true,
});
export type RegisterUser = z.infer<typeof registerUserSchema>;

// Login schema
export const loginSchema = z.object({
  callsign: z.string().min(1, "Call sign is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginCredentials = z.infer<typeof loginSchema>;

// Room types
export type Room = typeof rooms.$inferSelect;
export const insertRoomSchema = createInsertSchema(rooms).pick({
  name: true,
});
export type InsertRoom = z.infer<typeof insertRoomSchema>;

// Room member types
export type RoomMember = typeof roomMembers.$inferSelect;
export const insertRoomMemberSchema = createInsertSchema(roomMembers).pick({
  roomId: true,
  userId: true,
  isAdmin: true,
});
export type InsertRoomMember = z.infer<typeof insertRoomMemberSchema>;

// Direct chat types
export type DirectChat = typeof directChats.$inferSelect;
export const insertDirectChatSchema = createInsertSchema(directChats).pick({
  user1Id: true,
  user2Id: true,
});
export type InsertDirectChat = z.infer<typeof insertDirectChatSchema>;

// Message types
export type Message = typeof messages.$inferSelect;
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
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Call types
export type Call = typeof calls.$inferSelect;
export const insertCallSchema = createInsertSchema(calls).pick({
  callerId: true,
  receiverId: true,
  roomId: true,
  type: true,
  status: true,
});
export type InsertCall = z.infer<typeof insertCallSchema>;

// For backward compatibility with existing code
export type Conversation = Room | DirectChat;
export type ConversationMember = RoomMember;

// WebSocket message types
export type WebSocketMessage = {
  type: 'new_message' | 'user_status' | 'typing' | 'read_receipt';
  payload: any;
};

// Military ranks for dropdown select
export const RANKS = [
  "PVT", "PFC", "SPC", "CPL", "SGT", "SSG", "SFC", "MSG", "1SG", "SGM", "CSM",
  "2LT", "1LT", "CPT", "MAJ", "LTC", "COL", "BG", "MG", "LTG", "GEN"
] as const;

// Military branches for dropdown select
export const BRANCHES = [
  "ARMY", "NAVY", "AIR FORCE", "MARINES", "SPECIAL FORCES", "INTELLIGENCE", "CYBER"
] as const;

// Classification levels for messages and conversations
export const CLASSIFICATION_LEVELS = [
  "UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP SECRET"
] as const;
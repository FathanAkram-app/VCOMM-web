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

// Conversations table (both group chats and direct chats)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isGroup: boolean("is_group").default(false),
  name: varchar("name"),
  description: text("description"),
  classification: varchar("classification"),
  lastMessage: text("last_message"),
  lastMessageTime: timestamp("last_message_time"),
});

// Conversation members table
export const conversationMembers = pgTable("conversation_members", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  conversationId: integer("conversation_id").references(() => conversations.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  classification: varchar("classification"),
  // Attachment fields
  hasAttachment: boolean("has_attachment").default(false),
  attachmentType: varchar("attachment_type"), // 'image', 'document', 'audio', 'video'
  attachmentUrl: varchar("attachment_url"),
  attachmentName: varchar("attachment_name"),
  attachmentSize: integer("attachment_size"), // in bytes
  // Reply, Forward, Delete features
  replyToId: integer("reply_to_id").references(() => messages.id),
  forwardedFromId: integer("forwarded_from_id").references(() => messages.id),
  isDeleted: boolean("is_deleted").default(false),
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

// Message types
export type Message = typeof messages.$inferSelect;
export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  senderId: true,
  conversationId: true,
  classification: true,
  hasAttachment: true,
  attachmentType: true,
  attachmentUrl: true,
  attachmentName: true,
  attachmentSize: true,
  replyToId: true,
  forwardedFromId: true,
  isDeleted: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Create schema for conversations
export type Conversation = typeof conversations.$inferSelect;
export const insertConversationSchema = createInsertSchema(conversations).pick({
  name: true,
  isGroup: true,
  description: true,
  classification: true,
});
export type InsertConversation = z.infer<typeof insertConversationSchema>;

// Conversation members types
export type ConversationMember = typeof conversationMembers.$inferSelect;
export const insertConversationMemberSchema = createInsertSchema(conversationMembers).pick({
  conversationId: true,
  userId: true,
});
export type InsertConversationMember = z.infer<typeof insertConversationMemberSchema>;

// Group calls table
export const groupCalls = pgTable("group_calls", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  callType: varchar("call_type").notNull(), // 'audio' | 'video'
  creatorId: integer("creator_id").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

// Group call members table
export const groupCallMembers = pgTable("group_call_members", {
  id: serial("id").primaryKey(),
  groupCallId: integer("group_call_id").references(() => groupCalls.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  hasJoined: boolean("has_joined").default(false),
  isActive: boolean("is_active").default(false),
  isMuted: boolean("is_muted").default(false),
  joinedAt: timestamp("joined_at"),
  leftAt: timestamp("left_at"),
}, (table) => [
  unique().on(table.groupCallId, table.userId)
]);

// Group call types
export type GroupCall = typeof groupCalls.$inferSelect;
export type GroupCallMember = typeof groupCallMembers.$inferSelect;

export const insertGroupCallSchema = createInsertSchema(groupCalls).pick({
  name: true,
  callType: true,
  creatorId: true,
});
export type InsertGroupCall = z.infer<typeof insertGroupCallSchema>;

export const insertGroupCallMemberSchema = createInsertSchema(groupCallMembers).pick({
  groupCallId: true,
  userId: true,
});
export type InsertGroupCallMember = z.infer<typeof insertGroupCallMemberSchema>;

// WebSocket message types
export type WebSocketMessage = {
  type: 'new_message' | 'user_status' | 'typing' | 'read_receipt' | 'group_call_created' | 'group_call_joined' | 'group_call_left' | 'group_call_ended';
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
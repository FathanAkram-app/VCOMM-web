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
  role: varchar("role").default("member"), // 'admin' or 'member'
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
  isRead: boolean("is_read").default(false),
});

// Call history table
export const callHistory = pgTable("call_history", {
  id: serial("id").primaryKey(),
  callId: varchar("call_id").notNull(), // unique identifier for the call
  callType: varchar("call_type").notNull(), // 'audio', 'video', 'group_audio', 'group_video'
  initiatorId: integer("initiator_id").references(() => users.id).notNull(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  participants: text("participants").array(), // array of user IDs who participated
  status: varchar("status").notNull(), // 'completed', 'missed', 'rejected', 'failed'
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Lapsit Categories table
export const lapsitCategories = pgTable("lapsit_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lapsit Reports table
export const lapsitReports = pgTable("lapsit_reports", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => lapsitCategories.id).notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  reportedById: integer("reported_by_id").references(() => users.id).notNull(),
  status: varchar("status").default("pending"), // 'pending', 'reviewed', 'approved', 'rejected'
  classification: varchar("classification").default("UNCLASSIFIED"), // same as message classifications
  priority: varchar("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  location: varchar("location"), // optional location info
  coordinates: varchar("coordinates"), // optional GPS coordinates
  attachmentUrl: varchar("attachment_url"), // optional file attachment
  attachmentName: varchar("attachment_name"),
  reviewedById: integer("reviewed_by_id").references(() => users.id), // who reviewed the report
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"), // notes from reviewer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type CallHistory = typeof callHistory.$inferSelect;
export type InsertCallHistory = typeof callHistory.$inferInsert;
export type LapsitCategory = typeof lapsitCategories.$inferSelect;
export type InsertLapsitCategory = typeof lapsitCategories.$inferInsert;
export type LapsitReport = typeof lapsitReports.$inferSelect;
export type InsertLapsitReport = typeof lapsitReports.$inferInsert;

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

// WebSocket message types
export type WebSocketMessage = {
  type: 'new_message' | 'user_status' | 'typing' | 'read_receipt' | 
        'webrtc_offer' | 'webrtc_answer' | 'webrtc_ice_candidate' |
        'group_webrtc_offer' | 'group_webrtc_answer' | 'group_webrtc_ice_candidate' |
        'start_group_call' | 'join_group_call' | 'end_call' | 
        'incoming_group_call' | 'group_call_participants_update' | 'group_call_ended' |
        'group_update';
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

// Lapsit report status options
export const LAPSIT_STATUS = [
  "pending", "reviewed", "approved", "rejected"
] as const;

// Lapsit priority levels
export const LAPSIT_PRIORITY = [
  "low", "normal", "high", "urgent"
] as const;

// Lapsit category schemas
export const insertLapsitCategorySchema = createInsertSchema(lapsitCategories).pick({
  name: true,
  description: true,
});
export type InsertLapsitCategoryData = z.infer<typeof insertLapsitCategorySchema>;

// Lapsit report schemas
export const insertLapsitReportSchema = createInsertSchema(lapsitReports).pick({
  categoryId: true,
  title: true,
  content: true,
  classification: true,
  priority: true,
  location: true,
  coordinates: true,
  attachmentUrl: true,
  attachmentName: true,
});
export type InsertLapsitReportData = z.infer<typeof insertLapsitReportSchema>;
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
  role: varchar("role").default("user"),    // user, admin, super_admin
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
  isHidden: boolean("is_hidden").default(false), // Hide conversation from user's list
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

// Deleted messages per user table (for "delete for me" functionality)
export const deletedMessagesPerUser = pgTable("deleted_messages_per_user", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  deletedAt: timestamp("deleted_at").defaultNow(),
}, (table) => ({
  uniqueUserMessage: unique().on(table.messageId, table.userId),
}));

// Lapsit Categories table
export const lapsitCategories = pgTable("lapsit_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lapsit Sub Categories table
export const lapsitSubCategories = pgTable("lapsit_subcategories", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => lapsitCategories.id),
  name: varchar("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lapsit Reports table
export const lapsitReports = pgTable("lapsit_reports", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => lapsitCategories.id).notNull(),
  subCategoryId: integer("sub_category_id").references(() => lapsitSubCategories.id),
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
export type LapsitSubCategory = typeof lapsitSubCategories.$inferSelect;
export type InsertLapsitSubCategory = typeof lapsitSubCategories.$inferInsert;
export type LapsitReport = typeof lapsitReports.$inferSelect;
export type InsertLapsitReport = typeof lapsitReports.$inferInsert;

// CMS Reference Tables for Military Administration

// Military Ranks Reference Table
export const militaryRanks = pgTable("military_ranks", {
  id: serial("id").primaryKey(),
  rankCode: varchar("rank_code", { length: 10 }).notNull().unique(),
  rankName: varchar("rank_name", { length: 100 }).notNull(),
  branch: varchar("branch", { length: 50 }).notNull(), // TNI AD, TNI AU, TNI AL, POLRI
  level: integer("level").notNull(), // 1-20 for hierarchy
  isOfficer: boolean("is_officer").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Military Branches Reference Table
export const militaryBranches = pgTable("military_branches", {
  id: serial("id").primaryKey(),
  branchCode: varchar("branch_code", { length: 10 }).notNull().unique(),
  branchName: varchar("branch_name", { length: 100 }).notNull(),
  branchFullName: varchar("branch_full_name", { length: 200 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Military Units Reference Table
export const militaryUnits = pgTable("military_units", {
  id: serial("id").primaryKey(),
  unitCode: varchar("unit_code", { length: 20 }).notNull().unique(),
  unitName: varchar("unit_name", { length: 200 }).notNull(),
  branchId: integer("branch_id").references(() => militaryBranches.id),
  parentUnitId: integer("parent_unit_id").references(() => militaryUnits.id),
  unitType: varchar("unit_type", { length: 50 }), // Kodam, Korem, Kodim, Koramil, dll
  location: varchar("location", { length: 200 }),
  commanderNrp: varchar("commander_nrp", { length: 20 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Configuration Table for Menu and App Settings
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: text("config_value").notNull(),
  configDescription: text("config_description"),
  configType: varchar("config_type", { length: 20 }).default("string"), // string, number, boolean, json
  category: varchar("category", { length: 50 }).default("general"), // menu, security, feature, etc
  isEditable: boolean("is_editable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Activity Logs
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: varchar("admin_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetTable: varchar("target_table", { length: 50 }),
  targetId: varchar("target_id", { length: 50 }),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports for CMS tables
export type MilitaryRank = typeof militaryRanks.$inferSelect;
export type InsertMilitaryRank = typeof militaryRanks.$inferInsert;
export type MilitaryBranch = typeof militaryBranches.$inferSelect;
export type InsertMilitaryBranch = typeof militaryBranches.$inferInsert;
export type MilitaryUnit = typeof militaryUnits.$inferSelect;
export type InsertMilitaryUnit = typeof militaryUnits.$inferInsert;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;
export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;

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
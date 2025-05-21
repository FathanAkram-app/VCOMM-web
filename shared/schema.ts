import { pgTable, serial, varchar, text, timestamp, boolean, integer, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Skema untuk users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  callsign: varchar("callsign", { length: 50 }).notNull().unique(),
  nrp: varchar("nrp", { length: 50 }).notNull(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  rank: varchar("rank", { length: 50 }).notNull(),
  branch: varchar("branch", { length: 50 }).notNull(), // Cabang militer: AD, AU, AL, dll
  password: text("password").notNull(),
  profileImageUrl: text("profile_image_url"),
  status: varchar("status", { length: 20 }).default("offline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Skema untuk conversation (bisa grup atau one-on-one)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }),
  isGroup: boolean("is_group").notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  lastMessage: text("last_message"),
  lastMessageTime: timestamp("last_message_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Skema untuk anggota percakapan
export const conversationMembers = pgTable("conversation_members", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  isAdmin: boolean("is_admin").default(false),
  joinedAt: timestamp("joined_at").defaultNow()
}, (table) => {
  return {
    conversationUserIdx: uniqueIndex("conversation_user_idx").on(table.conversationId, table.userId)
  };
});

// Skema untuk pesan
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  content: text("content"),
  classification: varchar("classification", { length: 20 }).default("normal"),
  hasAttachment: boolean("has_attachment").default(false),
  attachmentUrl: text("attachment_url"),
  attachmentType: varchar("attachment_type", { length: 50 }),
  attachmentName: varchar("attachment_name", { length: 255 }),
  attachmentSize: integer("attachment_size"),
  forwardedFromId: integer("forwarded_from_id").references(() => messages.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isDeleted: boolean("is_deleted").default(false)
});

// Insert schema dan types

// User
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Registration schema with password confirmation
export const registerUserSchema = insertUserSchema.extend({
  passwordConfirm: z.string().min(6)
}).refine(data => data.password === data.passwordConfirm, {
  message: "Passwords do not match",
  path: ["passwordConfirm"]
});
export type RegisterUser = z.infer<typeof registerUserSchema>;

// Conversation
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true, lastMessage: true, lastMessageTime: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Conversation Member
export const insertConversationMemberSchema = createInsertSchema(conversationMembers).omit({ id: true, joinedAt: true });
export type InsertConversationMember = z.infer<typeof insertConversationMemberSchema>;
export type ConversationMember = typeof conversationMembers.$inferSelect;

// Message
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, updatedAt: true, isDeleted: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Tipe untuk direct chat (tidak ada tabel khusus, hanya untuk abstraksi frontend)
export type DirectChat = {
  id: number; // ID user lain
  isRoom: false;
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderId: number;
  };
  unreadCount: number;
};

// Tipe untuk result dari getChatsForUser
export type ChatInfo = {
  id: number;
  name: string;
  isRoom: boolean;
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderId: number;
  };
  unreadCount: number;
};

// Skema untuk panggilan
export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callerId: integer("caller_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  callType: varchar("call_type", { length: 10 }).notNull(), // 'audio' atau 'video'
  status: varchar("status", { length: 20 }).notNull(), // 'missed', 'answered', 'declined'
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // durasi dalam detik
  metadata: jsonb("metadata")    // untuk menyimpan detail tambahan jika diperlukan
});

// Skema untuk panggilan grup
export const groupCalls = pgTable("group_calls", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => conversations.id),
  initiatorId: integer("initiator_id").notNull().references(() => users.id),
  callType: varchar("call_type", { length: 10 }).notNull(), // 'audio' atau 'video'
  status: varchar("status", { length: 20 }).notNull(), // 'active', 'ended'
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // durasi dalam detik
  maxParticipants: integer("max_participants").default(9),
  metadata: jsonb("metadata")    // untuk menyimpan detail tambahan
});

// Skema untuk anggota panggilan grup
export const groupCallParticipants = pgTable("group_call_participants", {
  id: serial("id").primaryKey(),
  groupCallId: integer("group_call_id").notNull().references(() => groupCalls.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinTime: timestamp("join_time").defaultNow(),
  leaveTime: timestamp("leave_time"),
  status: varchar("status", { length: 20 }).notNull(), // 'joined', 'left', 'kicked'
  audioEnabled: boolean("audio_enabled").default(true),
  videoEnabled: boolean("video_enabled").default(true)
}, (table) => {
  return {
    groupCallUserIdx: uniqueIndex("group_call_user_idx").on(table.groupCallId, table.userId)
  };
});

// Insert schema dan types untuk calls
export const insertCallSchema = createInsertSchema(calls).omit({ id: true, startTime: true, endTime: true, duration: true });
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

// Insert schema dan types untuk group calls
export const insertGroupCallSchema = createInsertSchema(groupCalls).omit({ id: true, startTime: true, endTime: true, duration: true });
export type InsertGroupCall = z.infer<typeof insertGroupCallSchema>;
export type GroupCall = typeof groupCalls.$inferSelect;

// Insert schema dan types untuk group call participants
export const insertGroupCallParticipantSchema = createInsertSchema(groupCallParticipants).omit({ id: true, joinTime: true, leaveTime: true });
export type InsertGroupCallParticipant = z.infer<typeof insertGroupCallParticipantSchema>;
export type GroupCallParticipant = typeof groupCallParticipants.$inferSelect;

// Tipe untuk panggilan dengan info tambahan
export type CallWithUser = Call & {
  caller: {
    id: number;
    callsign: string;
    fullName?: string;
    rank?: string;
    profileImageUrl?: string;
  };
  receiver: {
    id: number;
    callsign: string;
    fullName?: string;
    rank?: string;
    profileImageUrl?: string;
  };
};

// Tipe untuk panggilan grup dengan detail
export type GroupCallWithDetails = GroupCall & {
  initiator: {
    id: number;
    callsign: string;
    fullName?: string;
    rank?: string;
    profileImageUrl?: string;
  };
  participants: GroupCallParticipant[];
  room: {
    id: number;
    name: string;
  };
};

// Tipe untuk message dengan user info
export type MessageWithSender = Message & {
  sender: {
    id: number;
    callsign: string;
    nrp?: string;
    fullName?: string;
    rank?: string;
    profileImageUrl?: string;
  };
  isRead: boolean;
};

// Tipe untuk daftar chat yang ditampilkan di UI
export interface ChatListItem {
  id: number;
  name: string;
  isRoom: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline?: boolean;
  otherUserId?: number;
}
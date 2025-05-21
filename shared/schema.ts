import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  serial,
  jsonb,
  index,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sessions table for authentication
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
  id: text("id").primaryKey().notNull(),
  callsign: varchar("callsign", { length: 50 }).notNull().unique(),
  nrp: varchar("nrp", { length: 50 }),
  fullName: varchar("full_name", { length: 255 }),
  rank: varchar("rank", { length: 50 }),
  branch: varchar("branch", { length: 100 }).default("ARM"),
  password: varchar("password", { length: 255 }).notNull(),
  profileImageUrl: varchar("profile_image_url", { length: 255 }),
  role: varchar("role", { length: 50 }).default("user"),
  status: varchar("status", { length: 50 }).default("offline"),
  lastOnline: timestamp("last_online").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rooms (Group Chats) table
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(true),
  creatorId: text("creator_id").references(() => users.id),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room Members table
export const roomMembers = pgTable("room_members", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
}, (table) => ({
  uniqueUserPerRoom: primaryKey(table.roomId, table.userId),
}));

// Direct Chats table
export const directChats = pgTable("direct_chats", {
  id: serial("id").primaryKey(),
  user1Id: text("user1_id").references(() => users.id).notNull(),
  user2Id: text("user2_id").references(() => users.id).notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    user1IdIndex: index("direct_chat_user1_idx").on(table.user1Id),
    user2IdIndex: index("direct_chat_user2_idx").on(table.user2Id),
  };
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  senderId: text("sender_id").references(() => users.id).notNull(),
  roomId: integer("room_id").references(() => rooms.id),
  directChatId: integer("direct_chat_id").references(() => directChats.id),
  replyToId: integer("reply_to_id").references((): any => messages.id),
  forwardedFromId: integer("forwarded_from_id").references((): any => messages.id),
  type: varchar("type", { length: 50 }).default("text"),
  attachment: jsonb("attachment"),
  status: varchar("status", { length: 50 }).default("sent"),
  sentAt: timestamp("sent_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    roomIdIndex: index("message_room_idx").on(table.roomId),
    directChatIdIndex: index("message_direct_chat_idx").on(table.directChatId),
    senderIdIndex: index("message_sender_idx").on(table.senderId),
  };
});

// Message Reads table
export const messageReads = pgTable("message_reads", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  readAt: timestamp("read_at").defaultNow(),
}, (table) => ({
  uniqueReadPerUser: primaryKey(table.messageId, table.userId),
}));

// Calls table
export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callerId: text("caller_id").references(() => users.id).notNull(),
  receiverId: text("receiver_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).default("audio"),
  status: varchar("status", { length: 50 }).default("initiated"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  metadata: jsonb("metadata"),
}, (table) => {
  return {
    callerIdIndex: index("call_caller_idx").on(table.callerId),
    receiverIdIndex: index("call_receiver_idx").on(table.receiverId),
  };
});

// Group Calls table
export const groupCalls = pgTable("group_calls", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  initiatorId: text("initiator_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).default("audio"),
  name: varchar("name", { length: 100 }),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  active: boolean("active").default(true),
  metadata: jsonb("metadata"),
}, (table) => {
  return {
    roomIdIndex: index("group_call_room_idx").on(table.roomId),
    initiatorIdIndex: index("group_call_initiator_idx").on(table.initiatorId),
  };
});

// Group Call Participants table
export const groupCallParticipants = pgTable("group_call_participants", {
  id: serial("id").primaryKey(),
  groupCallId: integer("group_call_id").references(() => groupCalls.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  role: varchar("role", { length: 50 }).default("participant"),
}, (table) => {
  return {
    groupCallIdIndex: index("participant_group_call_idx").on(table.groupCallId),
    userIdIndex: index("participant_user_idx").on(table.userId),
  };
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 50 }).default("message"),
  relatedId: integer("related_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdIndex: index("notification_user_idx").on(table.userId),
  };
});

// Schemas for data insertion
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  lastOnline: true 
});

export const insertRoomSchema = createInsertSchema(rooms).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertRoomMemberSchema = createInsertSchema(roomMembers).omit({ 
  id: true, 
  joinedAt: true, 
  leftAt: true 
});

export const insertDirectChatSchema = createInsertSchema(directChats).omit({ 
  id: true, 
  createdAt: true,
  lastActivityAt: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({ 
  id: true, 
  sentAt: true, 
  updatedAt: true, 
  status: true, 
  forwardedFromId: true 
});

export const insertCallSchema = createInsertSchema(calls).omit({ 
  id: true, 
  startTime: true, 
  endTime: true, 
  status: true 
});

export const insertGroupCallSchema = createInsertSchema(groupCalls).omit({ 
  id: true, 
  startTime: true, 
  endTime: true, 
  active: true 
});

export const insertGroupCallParticipantSchema = createInsertSchema(groupCallParticipants).omit({ 
  id: true, 
  joinedAt: true, 
  leftAt: true 
});

// Types for database entities
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

export type MessageRead = typeof messageReads.$inferSelect;
export type InsertMessageRead = typeof messageReads.$inferInsert;

export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

export type GroupCall = typeof groupCalls.$inferSelect;
export type InsertGroupCall = z.infer<typeof insertGroupCallSchema>;

export type GroupCallParticipant = typeof groupCallParticipants.$inferSelect;
export type InsertGroupCallParticipant = z.infer<typeof insertGroupCallParticipantSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Helper type for messages with sender info
export type MessageWithSender = Message & {
  sender: User;
  repliedTo?: MessageWithSender;
};
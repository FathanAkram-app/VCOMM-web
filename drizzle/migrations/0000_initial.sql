-- Hapus tabel yang sudah ada (jika ada)
DROP TABLE IF EXISTS group_call_participants CASCADE;
DROP TABLE IF EXISTS group_calls CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS direct_chats CASCADE;
DROP TABLE IF EXISTS room_members CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Buat tabel sessions
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar PRIMARY KEY,
  "sess" jsonb NOT NULL,
  "expire" timestamp NOT NULL
);

-- Buat index untuk sessions
CREATE INDEX "IDX_session_expire" ON "sessions" ("expire");

-- Buat tabel users
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "callsign" varchar(50) NOT NULL UNIQUE,
  "nrp" varchar(50),
  "full_name" varchar(255),
  "rank" varchar(50),
  "branch" varchar(100) DEFAULT 'ARM',
  "password" varchar(255) NOT NULL,
  "profile_image_url" varchar(255),
  "role" varchar(50) DEFAULT 'user',
  "status" varchar(50) DEFAULT 'offline',
  "last_online" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Buat tabel rooms
CREATE TABLE IF NOT EXISTS "rooms" (
  "id" serial PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "description" text,
  "is_public" boolean DEFAULT true,
  "creator_id" text REFERENCES "users" ("id"),
  "avatar_url" varchar(255),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Buat tabel room_members
CREATE TABLE IF NOT EXISTS "room_members" (
  "id" serial,
  "room_id" integer NOT NULL REFERENCES "rooms" ("id"),
  "user_id" text NOT NULL REFERENCES "users" ("id"),
  "role" varchar(50) DEFAULT 'member',
  "joined_at" timestamp DEFAULT now(),
  "left_at" timestamp,
  CONSTRAINT "room_members_room_id_user_id_pk" PRIMARY KEY ("room_id", "user_id")
);

-- Buat tabel direct_chats
CREATE TABLE IF NOT EXISTS "direct_chats" (
  "id" serial PRIMARY KEY,
  "user1_id" text NOT NULL REFERENCES "users" ("id"),
  "user2_id" text NOT NULL REFERENCES "users" ("id"),
  "last_activity_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now()
);

-- Buat index untuk direct_chats
CREATE INDEX "direct_chat_user1_idx" ON "direct_chats" ("user1_id");
CREATE INDEX "direct_chat_user2_idx" ON "direct_chats" ("user2_id");

-- Buat tabel messages
CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY,
  "content" text NOT NULL,
  "sender_id" text NOT NULL REFERENCES "users" ("id"),
  "room_id" integer REFERENCES "rooms" ("id"),
  "direct_chat_id" integer REFERENCES "direct_chats" ("id"),
  "reply_to_id" integer REFERENCES "messages" ("id"),
  "forwarded_from_id" integer REFERENCES "messages" ("id"),
  "type" varchar(50) DEFAULT 'text',
  "attachment" jsonb,
  "status" varchar(50) DEFAULT 'sent',
  "sent_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Buat index untuk messages
CREATE INDEX "message_room_idx" ON "messages" ("room_id");
CREATE INDEX "message_direct_chat_idx" ON "messages" ("direct_chat_id");
CREATE INDEX "message_sender_idx" ON "messages" ("sender_id");

-- Buat tabel message_reads
CREATE TABLE IF NOT EXISTS "message_reads" (
  "id" serial,
  "message_id" integer NOT NULL REFERENCES "messages" ("id"),
  "user_id" text NOT NULL REFERENCES "users" ("id"),
  "read_at" timestamp DEFAULT now(),
  CONSTRAINT "message_reads_message_id_user_id_pk" PRIMARY KEY ("message_id", "user_id")
);

-- Buat tabel calls
CREATE TABLE IF NOT EXISTS "calls" (
  "id" serial PRIMARY KEY,
  "caller_id" text NOT NULL REFERENCES "users" ("id"),
  "receiver_id" text NOT NULL REFERENCES "users" ("id"),
  "type" varchar(50) DEFAULT 'audio',
  "status" varchar(50) DEFAULT 'initiated',
  "start_time" timestamp DEFAULT now(),
  "end_time" timestamp,
  "metadata" jsonb
);

-- Buat index untuk calls
CREATE INDEX "call_caller_idx" ON "calls" ("caller_id");
CREATE INDEX "call_receiver_idx" ON "calls" ("receiver_id");

-- Buat tabel group_calls
CREATE TABLE IF NOT EXISTS "group_calls" (
  "id" serial PRIMARY KEY,
  "room_id" integer NOT NULL REFERENCES "rooms" ("id"),
  "initiator_id" text NOT NULL REFERENCES "users" ("id"),
  "type" varchar(50) DEFAULT 'audio',
  "name" varchar(100),
  "start_time" timestamp DEFAULT now(),
  "end_time" timestamp,
  "active" boolean DEFAULT true,
  "metadata" jsonb
);

-- Buat index untuk group_calls
CREATE INDEX "group_call_room_idx" ON "group_calls" ("room_id");
CREATE INDEX "group_call_initiator_idx" ON "group_calls" ("initiator_id");

-- Buat tabel group_call_participants
CREATE TABLE IF NOT EXISTS "group_call_participants" (
  "id" serial PRIMARY KEY,
  "group_call_id" integer NOT NULL REFERENCES "group_calls" ("id"),
  "user_id" text NOT NULL REFERENCES "users" ("id"),
  "joined_at" timestamp DEFAULT now(),
  "left_at" timestamp,
  "role" varchar(50) DEFAULT 'participant'
);

-- Buat index untuk group_call_participants
CREATE INDEX "participant_group_call_idx" ON "group_call_participants" ("group_call_id");
CREATE INDEX "participant_user_idx" ON "group_call_participants" ("user_id");

-- Buat tabel notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users" ("id"),
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "type" varchar(50) DEFAULT 'message',
  "related_id" integer,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

-- Buat index untuk notifications
CREATE INDEX "notification_user_idx" ON "notifications" ("user_id");

-- Add is_muted column to conversation_members table
-- This allows users to mute notifications for specific conversations

ALTER TABLE conversation_members
  ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE;

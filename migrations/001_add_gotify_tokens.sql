-- Add Gotify client token support to users table
-- Run this migration in your PostgreSQL database

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gotify_client_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS gotify_token_updated_at TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_gotify_token ON users(gotify_client_token);

-- Verify migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE 'gotify%';

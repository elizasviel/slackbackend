-- Add vector column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS vector vector(1536);
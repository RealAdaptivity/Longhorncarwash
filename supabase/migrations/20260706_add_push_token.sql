-- Add push_token column to users table to support Expo push notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token text;

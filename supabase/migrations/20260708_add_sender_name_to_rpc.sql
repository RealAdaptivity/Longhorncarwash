-- Update send_push_notification RPC function to support appending the manager's name (sender_name) to the notification body
CREATE OR REPLACE FUNCTION send_push_notification(message text, sender_name text)
RETURNS text AS $$
DECLARE
  expo_payload json;
  resp_content text;
  full_body text;
BEGIN
  -- Enable HTTP extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS http;

  -- Construct body with sender signature
  IF sender_name IS NOT NULL AND sender_name <> '' THEN
    full_body := message || ' - ' || sender_name;
  ELSE
    full_body := message;
  END IF;

  -- 1. Gather all push tokens from approved users in Expo's payload format
  SELECT json_agg(
    json_build_object(
      'to', push_token,
      'sound', 'default',
      'title', 'New Shift Announcement',
      'body', full_body,
      'data', json_build_object('type', 'announcement', 'message', message)
    )
  )
  INTO expo_payload
  FROM users
  WHERE is_approved = true AND push_token IS NOT NULL;

  -- 2. If there are no tokens, return early
  IF expo_payload IS NULL THEN
    RETURN 'No registered push tokens found';
  END IF;

  -- 3. Send HTTP POST request to Expo Push API
  SELECT content INTO resp_content
  FROM http_post(
    'https://exp.host/--/api/v2/push/send',
    expo_payload::text,
    'application/json'
  );

  RETURN 'Push notification response: ' || resp_content;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

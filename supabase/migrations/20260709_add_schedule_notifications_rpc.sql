-- Create database RPC function to securely broadcast schedule push notifications to specific employees, bypassing browser CORS
CREATE OR REPLACE FUNCTION send_schedule_notifications(employee_names text[], week_range text)
RETURNS text AS $$
DECLARE
  expo_payload json;
  resp_content text;
  body_text text;
BEGIN
  -- Enable HTTP extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS http;

  body_text := 'Your schedule for the week ' || week_range || ' has been posted/updated.';

  -- 1. Gather push tokens for the specific employees whose names are listed in the schedule
  SELECT json_agg(
    json_build_object(
      'to', push_token,
      'sound', 'default',
      'title', '📅 Schedule Posted/Updated',
      'body', body_text,
      'data', json_build_object('type', 'schedule', 'weekRange', week_range)
    )
  )
  INTO expo_payload
  FROM users
  WHERE is_approved = true 
    AND push_token IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM unnest(employee_names) AS name 
      WHERE users.name ILIKE name
    );

  -- 2. If no tokens found, return early
  IF expo_payload IS NULL THEN
    RETURN 'No registered push tokens found for scheduled employees';
  END IF;

  -- 3. Send HTTP POST request to Expo Push API
  SELECT content INTO resp_content
  FROM http_post(
    'https://exp.host/--/api/v2/push/send',
    expo_payload::text,
    'application/json'
  );

  RETURN 'Schedule push notifications response: ' || resp_content;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

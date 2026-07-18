-- Finish the shift-swap workflow.
--
-- The request modal collects a teammate and free-text details; persist both so
-- a manager can act on the request. week_range records which week it concerns.
ALTER TABLE public.shift_swaps
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS week_range text;

-- Targeted push notification: notify a specific set of users (the two employees
-- involved in a swap) when a manager approves or denies it. Distinct from
-- send_push_notification, which broadcasts to everyone.
CREATE OR REPLACE FUNCTION public.send_targeted_notification(user_ids uuid[], title text, body text)
RETURNS text AS $$
DECLARE
  expo_payload json;
  resp_content text;
BEGIN
  CREATE EXTENSION IF NOT EXISTS http;

  SELECT json_agg(
    json_build_object(
      'to', push_token,
      'sound', 'default',
      'title', title,
      'body', body,
      'data', json_build_object('type', 'shift_swap')
    )
  )
  INTO expo_payload
  FROM public.users
  WHERE push_token IS NOT NULL
    AND id = ANY(user_ids);

  IF expo_payload IS NULL THEN
    RETURN 'No registered push tokens found for targets';
  END IF;

  SELECT content INTO resp_content
  FROM http_post(
    'https://exp.host/--/api/v2/push/send',
    expo_payload::text,
    'application/json'
  );

  RETURN 'Targeted push response: ' || resp_content;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

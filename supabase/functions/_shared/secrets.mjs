// Edge-function secrets. Prefer Deno.env; chat ID and webhook secret fall back
// to legacy literals until they are configured in the dashboard.
// The bot token has no fallback: it must be set as TELEGRAM_BOT_TOKEN in
// Supabase (Edge Functions -> Secrets). Never commit a bot token here; this
// repo is public.

const LEGACY_CHAT = '-5595038862';
const LEGACY_SECRET = 'lcw-punch-notify-2026';

export function getTelegramBotToken() {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!token) console.error('TELEGRAM_BOT_TOKEN secret is not set; Telegram messages will fail.');
  return token ?? '';
}

export function getTelegramChatId() {
  return Deno.env.get('TELEGRAM_CHAT_ID') || LEGACY_CHAT;
}

export function getWebhookSecret() {
  return Deno.env.get('WEBHOOK_SECRET') || LEGACY_SECRET;
}

export function assertWebhookSecret(req) {
  return req.headers.get('x-webhook-secret') === getWebhookSecret();
}

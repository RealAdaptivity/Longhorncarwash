import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT = '8729010258:AAEh2We1rFbEiC1WoEbz0Gz5qOyDr5Kyo4c';
const CHAT = '-5595038862';
const SECRET = 'lcw-punch-notify-2026';
const TZ = 'America/Chicago';
const OT_THRESHOLD = 36;

async function tg(msg: string) {
  await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT, text: msg }),
  });
}

function getWeekStart(): string {
  // Week starts on Wednesday (business rule)
  const now = new Date();
  const ct = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const day = ct.getDay(); // 0=Sun, 3=Wed
  const daysFromWed = (day + 7 - 3) % 7;
  const ws = new Date(ct);
  ws.setDate(ct.getDate() - daysFromWed);
  return ws.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function calcHours(logs: Array<{ action: string; created_at: string }>): number {
  const sorted = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let total = 0, lastIn: number | null = null;
  for (const l of sorted) {
    const t = new Date(l.created_at).getTime();
    if (l.action === 'IN' || l.action === 'END_LUNCH') { lastIn = t; }
    else if ((l.action === 'START_LUNCH' || l.action === 'OUT') && lastIn !== null) {
      total += (t - lastIn) / 3600000; lastIn = null;
    }
  }
  return total;
}

Deno.serve(async (req: Request) => {
  if (req.headers.get('x-webhook-secret') !== SECRET) return new Response('Unauthorized', { status: 401 });

  const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const weekStart = getWeekStart();

  const { data: users } = await sb.from('users').select('id,name').eq('is_approved', true);
  if (!users?.length) return new Response('No users', { status: 200 });

  // Fetch 8 days of logs to safely cover the full week regardless of DST
  const since = new Date(Date.now() - 8 * 86400000).toISOString();
  const { data: allLogs } = await sb.from('time_logs')
    .select('user_id,action,created_at')
    .gte('created_at', since)
    .in('action', ['IN', 'OUT', 'START_LUNCH', 'END_LUNCH'])
    .order('created_at', { ascending: true });

  // Only keep logs from this week (Wednesday onward) in CT
  const logs = (allLogs ?? []).filter(l =>
    new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: TZ }) >= weekStart
  );

  const { data: sent } = await sb.from('notifications_sent')
    .select('user_id').eq('notification_type', 'overtime_warning').eq('shift_date', weekStart);
  const sentSet = new Set((sent ?? []).map((n: any) => n.user_id));

  const byUser: Record<string, typeof logs> = {};
  for (const l of logs) {
    if (!byUser[l.user_id]) byUser[l.user_id] = [];
    byUser[l.user_id].push(l);
  }

  for (const user of users) {
    if (sentSet.has(user.id)) continue;
    const hrs = calcHours(byUser[user.id] ?? []);
    if (hrs >= OT_THRESHOLD) {
      await tg(`Overtime Alert: ${user.name} has ${hrs.toFixed(1)} hrs this week - approaching overtime`);
      await sb.from('notifications_sent').insert({
        user_id: user.id, notification_type: 'overtime_warning', shift_date: weekStart,
      });
    }
  }

  return new Response('OK', { status: 200 });
});

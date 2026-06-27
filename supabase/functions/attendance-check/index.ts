import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT = '8729010258:AAEh2We1rFbEiC1WoEbz0Gz5qOyDr5Kyo4c';
const CHAT = '-5595038862';
const SECRET = 'lcw-punch-notify-2026';
const TZ = 'America/Chicago';

function nowCT() {
  const s = new Date().toLocaleString('en-US', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
  const [dp, tp] = s.split(', ');
  const [mo, dy, yr] = dp.split('/');
  const [h, m] = tp.split(':').map(Number);
  return { date: `${yr}-${mo}-${dy}`, mins: h * 60 + m, mo: +mo, dy: +dy, yr: +yr };
}

function parseT(s: string): number | null {
  s = s.trim();
  const a = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (a) {
    let h = +a[1]; const m = a[2] ? +a[2] : 0; const p = a[3].toLowerCase();
    if (p === 'pm' && h !== 12) h += 12;
    if (p === 'am' && h === 12) h = 0;
    return h * 60 + m;
  }
  const b = s.match(/^(\d{1,2}):(\d{2})$/); if (b) return +b[1] * 60 + +b[2];
  const c = s.match(/^(\d{1,2})$/); if (c) return +c[1] * 60;
  return null;
}

function parseShift(raw: string): { s: number; e: number } | null {
  if (!raw || /^(off|-)$/i.test(raw.trim()) || !raw.trim()) return null;
  const pts = raw.split(/\s*[-–]\s*/);
  if (pts.length < 2) return null;
  let s = parseT(pts[0]), e = parseT(pts[pts.length - 1]);
  if (s === null || e === null) return null;
  if (e <= s && !/am|pm/i.test(raw)) e += 720;
  return { s, e };
}

function hdrMatch(h: string, mo: number, dy: number, yr: number): boolean {
  for (const a of [h, `${h}, ${yr}`, `${h} ${yr}`]) {
    try {
      const d = new Date(a);
      if (!isNaN(d.getTime()) && d.getMonth() + 1 === mo && d.getDate() === dy) return true;
    } catch { /**/ }
  }
  const m = h.match(/(\d{1,2})\/(\d{1,2})/);
  return !!(m && +m[1] === mo && +m[2] === dy);
}

function fmt(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

async function tg(msg: string) {
  await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT, text: msg }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.headers.get('x-webhook-secret') !== SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  const sb = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  try {
    const { date, mins, mo, dy, yr } = nowCT();

    const { data: scheds } = await sb.from('schedules')
      .select('content').order('created_at', { ascending: false }).limit(10);
    if (!scheds?.length) return new Response('No schedules', { status: 200 });

    let idx = -1, rows: any[] = [];
    for (const s of scheds) {
      try {
        const p = JSON.parse(s.content);
        const i = (p.headers ?? []).findIndex((h: string) => hdrMatch(h, mo, dy, yr));
        if (i >= 0) { idx = i; rows = p.rows ?? []; break; }
      } catch { /**/ }
    }
    if (idx < 0) return new Response('No schedule for today', { status: 200 });

    const { data: users } = await sb.from('users')
      .select('id,name').eq('is_approved', true);
    if (!users?.length) return new Response('No users', { status: 200 });

    const since = new Date(Date.now() - 20 * 3600000).toISOString();
    const { data: logs } = await sb.from('time_logs')
      .select('user_id,action,created_at')
      .gte('created_at', since)
      .in('action', ['IN', 'OUT', 'START_LUNCH', 'END_LUNCH'])
      .order('created_at', { ascending: true });

    const status: Record<string, string> = {};
    for (const l of logs ?? []) {
      if (new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: TZ }) === date) {
        status[l.user_id] = l.action;
      }
    }

    const { data: sent } = await sb.from('notifications_sent')
      .select('user_id,notification_type').eq('shift_date', date);
    const sentSet = new Set((sent ?? []).map((n: any) => `${n.user_id}:${n.notification_type}`));

    for (const row of rows) {
      const shift = parseShift(row.shifts?.[idx]);
      if (!shift) continue;
      const user = users.find((u: any) =>
        u.name.trim().toLowerCase() === row.employee?.trim().toLowerCase()
      );
      if (!user) continue;
      const last = status[user.id] ?? null;
      const inToday = last !== null;
      const stillIn = last === 'IN' || last === 'END_LUNCH' || last === 'START_LUNCH';

      if (mins >= shift.s + 3 && mins < shift.e && !inToday) {
        const k = `${user.id}:late_clock_in`;
        if (!sentSet.has(k)) {
          await tg(`${user.name} has not clocked in - shift started at ${fmt(shift.s)}`);
          await sb.from('notifications_sent').insert({
            user_id: user.id, notification_type: 'late_clock_in', shift_date: date,
          });
          sentSet.add(k);
        }
      }

      if (mins >= shift.e + 5 && stillIn) {
        const k = `${user.id}:forgot_clock_out`;
        if (!sentSet.has(k)) {
          await tg(`${user.name} forgot to clock out - shift ended at ${fmt(shift.e)}`);
          await sb.from('notifications_sent').insert({
            user_id: user.id, notification_type: 'forgot_clock_out', shift_date: date,
          });
          sentSet.add(k);
        }
      }
    }
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('Error', { status: 500 });
  }
});

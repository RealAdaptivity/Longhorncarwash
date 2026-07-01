// Shared time-log math for Supabase edge functions.
//
// Kept as plain JS (no TS types) so it can be imported by the Deno edge
// functions AND unit-tested directly with `node --test` without a build step.

/**
 * Sum worked hours from a list of punch logs.
 *
 * Pairs each clock-in (IN / END_LUNCH) with the next clock-out
 * (START_LUNCH / OUT) and accumulates the elapsed time. Logs are sorted by
 * timestamp first, so callers may pass them in any order.
 *
 * @param {Array<{ action: string, created_at: string }>} logs
 * @returns {number} total worked hours
 */
export function calcHours(logs) {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  let total = 0;
  let lastIn = null;
  for (const l of sorted) {
    const t = new Date(l.created_at).getTime();
    if (l.action === 'IN' || l.action === 'END_LUNCH') {
      lastIn = t;
    } else if ((l.action === 'START_LUNCH' || l.action === 'OUT') && lastIn !== null) {
      total += (t - lastIn) / 3600000;
      lastIn = null;
    }
  }
  return total;
}

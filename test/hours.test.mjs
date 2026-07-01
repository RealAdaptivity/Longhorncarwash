import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calcHours } from '../supabase/functions/_shared/hours.mjs';

const log = (action, t) => ({ action, created_at: t });

test('calcHours: simple in/out is the elapsed span', () => {
  const logs = [log('IN', '2026-07-01T09:00:00Z'), log('OUT', '2026-07-01T17:00:00Z')];
  assert.equal(calcHours(logs), 8);
});

test('calcHours: lunch break is not counted as worked time', () => {
  const logs = [
    log('IN', '2026-07-01T09:00:00Z'),
    log('START_LUNCH', '2026-07-01T12:00:00Z'),
    log('END_LUNCH', '2026-07-01T12:30:00Z'),
    log('OUT', '2026-07-01T17:00:00Z'),
  ];
  // 3h before lunch + 4.5h after = 7.5
  assert.equal(calcHours(logs), 7.5);
});

test('calcHours: unsorted input is sorted before pairing', () => {
  const logs = [log('OUT', '2026-07-01T17:00:00Z'), log('IN', '2026-07-01T09:00:00Z')];
  assert.equal(calcHours(logs), 8);
});

test('calcHours: a dangling clock-in with no clock-out contributes nothing', () => {
  const logs = [log('IN', '2026-07-01T09:00:00Z')];
  assert.equal(calcHours(logs), 0);
});

test('calcHours: empty input is zero', () => {
  assert.equal(calcHours([]), 0);
});

// calcHours does not mutate the array it is given.
test('calcHours: does not mutate its input order', () => {
  const logs = [log('OUT', '2026-07-01T17:00:00Z'), log('IN', '2026-07-01T09:00:00Z')];
  const before = logs.map((l) => l.action);
  calcHours(logs);
  assert.deepEqual(logs.map((l) => l.action), before);
});

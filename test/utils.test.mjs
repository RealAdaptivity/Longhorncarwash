import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateTotalHoursForLogs,
  calculateEstimatedTaxes,
  calculatePayWithOvertime,
  formatNameLastFirst,
  parseShiftHours,
  parseShiftStartTime,
  getStartOfWeek,
  getBiweeklyWeeks,
  getDistanceInMeters,
} from '../modules/utils.js';

const log = (action, t) => ({ action, created_at: t });
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

test('calculateTotalHoursForLogs: pairs in/out into worked hours', () => {
  const logs = [log('IN', '2026-07-01T09:00:00Z'), log('OUT', '2026-07-01T17:00:00Z')];
  assert.equal(calculateTotalHoursForLogs(logs), 8);
});

test('calculateTotalHoursForLogs: CLOCK_IN/CLOCK_OUT aliases count', () => {
  const logs = [log('CLOCK_IN', '2026-07-01T09:00:00Z'), log('CLOCK_OUT', '2026-07-01T13:00:00Z')];
  assert.equal(calculateTotalHoursForLogs(logs), 4);
});

test('calculateTotalHoursForLogs: TIMESHEET_APPROVED rows are ignored', () => {
  const logs = [
    log('IN', '2026-07-01T09:00:00Z'),
    log('TIMESHEET_APPROVED', '2026-07-01T10:00:00Z'),
    log('OUT', '2026-07-01T17:00:00Z'),
  ];
  assert.equal(calculateTotalHoursForLogs(logs), 8);
});

test('calculatePayWithOvertime: straight time under 40h', () => {
  assert.equal(calculatePayWithOvertime([40], 10), 400);
});

test('calculatePayWithOvertime: overtime past 40h pays 1.5x', () => {
  // 40*10 + 10*15 = 550
  assert.equal(calculatePayWithOvertime([50], 10), 550);
});

test('calculatePayWithOvertime: sums multiple weeks independently', () => {
  // (40*10 + 5*15) + (30*10) = 475 + 300 = 775
  assert.equal(calculatePayWithOvertime([45, 30], 10), 775);
});

test('calculateEstimatedTaxes: zero or negative gross is zero', () => {
  assert.equal(calculateEstimatedTaxes(0, 'Single', true), 0);
  assert.equal(calculateEstimatedTaxes(-100, 'Single', true), 0);
});

test('calculateEstimatedTaxes: single filer salary, known brackets', () => {
  // annual 100000; FICA 7650; taxable 85400 → fed 13841; total 21491
  close(calculateEstimatedTaxes(100000, 'Single', true), 21491);
});

test('calculateEstimatedTaxes: married bracket differs from single', () => {
  const single = calculateEstimatedTaxes(100000, 'Single', true);
  const married = calculateEstimatedTaxes(100000, 'Married Filing Jointly', true);
  assert.ok(married < single, 'married-filing-jointly should owe less than single at 100k');
});

test('formatNameLastFirst: reorders to "Last, First"', () => {
  assert.equal(formatNameLastFirst('John Smith'), 'Smith, John');
});

test('formatNameLastFirst: leaves already-formatted names alone', () => {
  assert.equal(formatNameLastFirst('Smith, John'), 'Smith, John');
});

test('formatNameLastFirst: single token and empty are passed through', () => {
  assert.equal(formatNameLastFirst('Cher'), 'Cher');
  assert.equal(formatNameLastFirst(''), '');
});

test('parseShiftHours: explicit am/pm span', () => {
  assert.equal(parseShiftHours('9am-5pm'), 8);
});

test('parseShiftHours: bare numbers infer pm end', () => {
  assert.equal(parseShiftHours('9-5'), 8);
});

test('parseShiftHours: off/blank days are zero', () => {
  assert.equal(parseShiftHours('OFF'), 0);
  assert.equal(parseShiftHours('-'), 0);
  assert.equal(parseShiftHours(''), 0);
});

test('parseShiftStartTime: returns 24h hour/minute', () => {
  assert.deepEqual(parseShiftStartTime('9am-5pm'), { hour: 9, minute: 0 });
  assert.deepEqual(parseShiftStartTime('2:30pm-6pm'), { hour: 14, minute: 30 });
});

test('parseShiftStartTime: off/invalid returns null', () => {
  assert.equal(parseShiftStartTime('OFF'), null);
  assert.equal(parseShiftStartTime(''), null);
});

test('getStartOfWeek: always a Wednesday at midnight', () => {
  const d = getStartOfWeek();
  assert.equal(d.getDay(), 3, 'day 3 = Wednesday');
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
  assert.equal(d.getSeconds(), 0);
});

test('getBiweeklyWeeks: Wed Jul 1 2026 resolves to the Jun 17 cycle', () => {
  const { week1Start, week2Start } = getBiweeklyWeeks(new Date(2026, 6, 1));
  assert.deepEqual(
    [week1Start.getFullYear(), week1Start.getMonth(), week1Start.getDate()],
    [2026, 5, 17],
  );
  assert.deepEqual(
    [week2Start.getFullYear(), week2Start.getMonth(), week2Start.getDate()],
    [2026, 5, 24],
  );
});

test('getBiweeklyWeeks: advances one cycle two weeks later', () => {
  const { week1Start, week2Start } = getBiweeklyWeeks(new Date(2026, 6, 15));
  assert.deepEqual(
    [week1Start.getFullYear(), week1Start.getMonth(), week1Start.getDate()],
    [2026, 6, 1],
  );
  assert.deepEqual(
    [week2Start.getFullYear(), week2Start.getMonth(), week2Start.getDate()],
    [2026, 6, 8],
  );
});

test('getDistanceInMeters: identical points are zero', () => {
  close(getDistanceInMeters(33.06734, -97.29654, 33.06734, -97.29654), 0);
});

test('getDistanceInMeters: ~111km per degree of latitude', () => {
  const d = getDistanceInMeters(0, 0, 1, 0);
  assert.ok(Math.abs(d - 111195) < 500, `expected ~111195m, got ${d}`);
});

// Shared mutable application state
export const state = {
  currentPin: '',
  currentUser: null,
  managerLoggedIn: false,
  currentManager: null,
  currentManagerRole: null,
  pending2FAUser: null,
  pendingLoginTarget: 'manager',
  employeeMap: {},
  currentPortalEmployee: null,
  selectedEmployeeForLogs: null,
  editingScheduleId: null,
  // Snapshot of the schedule editor taken when editing begins, so a save that
  // changes nothing can skip re-notifying employees.
  editingScheduleOriginalContent: null,
  editingChecklistId: null,
  currentEditingPunchId: null,
  activeAnnouncement: null,
  cameraStream: null,
  idleTimeout: null,
  laborHoursChart: null,
  statusDistributionChart: null,
  dailyRevenueGoal: 0,
  laborCostGoalPercent: 25,
  CAR_WASH_LAT: 33.06734,
  CAR_WASH_LON: -97.29654,
  ALLOWED_RADIUS_METERS: 100,
  GEOFENCE_ENABLED: true,
  ANTI_BUDDY_ENABLED: true,
  EARLY_CLOCKIN_BLOCK_ENABLED: true,
  customPayrollFormat: { current: '', next: '' },
  comm_single_good: 50,
  comm_single_better: 100,
  comm_single_best: 150,
  comm_membership_good: 200,
  comm_membership_better: 300,
  comm_membership_best: 400,
  // Resolves once fetchSettings() has finished loading remote settings (geofence
  // radius, WiFi lock, etc.) into state. Punch flows await this so the first
  // punch after page load doesn't run against the hardcoded defaults.
  settingsReady: Promise.resolve(),
};

// Actions that mean the employee is currently on the clock (working or on a
// paid break that still counts as "in"). Kept here so the timeclock UI, the
// punch validator, and the auto-sweep all agree on what "clocked in" means.
const CLOCKED_IN_ACTIONS = ['IN', 'END_LUNCH', 'CLOCK_IN'];
const CLOCKED_OUT_ACTIONS = ['OUT', 'CLOCK_OUT'];

// Pure validator for a punch transition. Given the employee's last recorded
// action (or null/undefined if they have none) and the action they're
// attempting, returns a human-readable error string if the transition is
// invalid, or null if it's allowed. Shared by the online and offline punch
// paths so both enforce the same rules.
export function getPunchTransitionError(lastAction, action) {
  if (lastAction === null || lastAction === undefined) {
    return action === 'IN' ? null : 'You must clock in first.';
  }
  const isIn = CLOCKED_IN_ACTIONS.includes(lastAction);
  const isOut = CLOCKED_OUT_ACTIONS.includes(lastAction);
  const isLunch = lastAction === 'START_LUNCH';

  if (action === 'IN' && isIn) return 'You are already clocked in.';
  if (action === 'OUT' && isOut) return 'You are already clocked out.';
  if (action === 'START_LUNCH' && isLunch) return 'You are already on lunch.';
  if (action === 'END_LUNCH' && !isLunch) return 'You must be on lunch to end lunch.';
  if ((action === 'START_LUNCH' || action === 'OUT') && !isIn && !isLunch) {
    return 'You must clock in first.';
  }
  return null;
}

// The punch types an employee can file a missed-punch request for.
export const MISSED_PUNCH_ACTIONS = ['IN', 'OUT', 'START_LUNCH', 'END_LUNCH'];

// How far back a missed-punch request may reach. Older corrections go through a
// manager directly rather than the self-service request flow.
const MISSED_PUNCH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Pure validator for a missed-punch request. Returns an error string if the
// request is invalid, or null if it's acceptable. `now` is injectable for tests.
export function getMissedPunchRequestError(action, when, now = new Date()) {
  if (!MISSED_PUNCH_ACTIONS.includes(action)) return 'Choose which punch you missed.';
  const t = when instanceof Date ? when : new Date(when);
  if (isNaN(t.getTime())) return 'Enter a valid date and time.';
  // Allow a minute of slack for clock skew between the device and server.
  if (t.getTime() > now.getTime() + 60 * 1000) {
    return "The punch time can't be in the future.";
  }
  if (now.getTime() - t.getTime() > MISSED_PUNCH_MAX_AGE_MS) {
    return 'Requests are limited to the last 30 days. Ask a manager to add older punches.';
  }
  return null;
}

// --- Toast ---
export function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  if (type === 'error') {
    toast.style.backgroundColor = 'var(--danger)';
  } else if (type === 'warning') {
    toast.style.backgroundColor = '#f39c12';
  } else {
    toast.style.backgroundColor = 'var(--primary)';
  }
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// --- Date Utilities ---
export function getStartOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diffToWed = day >= 3 ? day - 3 : day + 4;
  const wednesday = new Date(d.setDate(d.getDate() - diffToWed));
  wednesday.setHours(0, 0, 0, 0);
  return wednesday;
}

export function getBiweeklyWeeks(date) {
  // Delay the cycle calculation by 24 hours so that if today is Wednesday,
  // we still show the previous cycle until midnight (end of Wednesday).
  const effectiveDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);

  // Anchor on Wednesday June 17, 2026 — each week runs Wed–Tue (ends Tuesday midnight),
  // the 14-day cycle resets Wednesday, and payday is the Friday after the cycle ends.
  const anchor = new Date(2026, 5, 17);
  anchor.setHours(0, 0, 0, 0);

  // Use UTC day arithmetic to avoid DST drift
  const utcDate = Date.UTC(
    effectiveDate.getFullYear(),
    effectiveDate.getMonth(),
    effectiveDate.getDate(),
  );
  const utcAnchor = Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const diffDays = Math.floor((utcDate - utcAnchor) / (24 * 60 * 60 * 1000));
  const cycleIndex = Math.floor(diffDays / 14);

  const week1Start = new Date(anchor);
  week1Start.setDate(anchor.getDate() + cycleIndex * 14);
  week1Start.setHours(0, 0, 0, 0);

  const week2Start = new Date(week1Start);
  week2Start.setDate(week1Start.getDate() + 7);
  week2Start.setHours(0, 0, 0, 0);

  return { week1Start, week2Start };
}

export function formatNameLastFirst(fullName) {
  if (!fullName) return '';
  if (fullName.includes(',')) return fullName;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const lastName = parts.pop();
  return `${lastName}, ${parts.join(' ')}`;
}

// --- Calculation Utilities ---
export function calculateTotalHoursForLogs(logsArray) {
  let totalMs = 0;
  let currentStatus = 'OUT';
  let lastIn = null;
  logsArray.forEach((log) => {
    if (log.action === 'TIMESHEET_APPROVED') return;
    const time = new Date(log.created_at).getTime();
    if (log.action === 'IN' || log.action === 'END_LUNCH' || log.action === 'CLOCK_IN') {
      currentStatus = 'IN';
      lastIn = time;
    } else if (log.action === 'OUT' || log.action === 'START_LUNCH' || log.action === 'CLOCK_OUT') {
      if (currentStatus === 'IN' && lastIn) totalMs += time - lastIn;
      currentStatus = 'OUT';
    }
  });
  return totalMs / (1000 * 60 * 60);
}

export function calculateEstimatedTaxes(grossPay, taxStatus, isSalary, payPeriod = 26) {
  if (!grossPay || grossPay <= 0) return 0;
  const annualGross = isSalary ? grossPay : grossPay * payPeriod;
  const ficaTaxAnnual = annualGross * 0.0765;

  let standardDeduction = 14600;
  let brackets = [
    { limit: 11600, rate: 0.1 },
    { limit: 47150, rate: 0.12 },
    { limit: 100525, rate: 0.22 },
    { limit: 191950, rate: 0.24 },
    { limit: 243725, rate: 0.32 },
    { limit: 609350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ];

  if (taxStatus === 'Married Filing Jointly') {
    standardDeduction = 29200;
    brackets = [
      { limit: 23200, rate: 0.1 },
      { limit: 94300, rate: 0.12 },
      { limit: 201050, rate: 0.22 },
      { limit: 383900, rate: 0.24 },
      { limit: 487450, rate: 0.32 },
      { limit: 731200, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ];
  } else if (taxStatus === 'Head of Household') {
    standardDeduction = 21900;
    brackets = [
      { limit: 16550, rate: 0.1 },
      { limit: 63100, rate: 0.12 },
      { limit: 100500, rate: 0.22 },
      { limit: 191950, rate: 0.24 },
      { limit: 243700, rate: 0.32 },
      { limit: 609350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ];
  }

  const taxableIncome = Math.max(0, annualGross - standardDeduction);
  let federalTaxAnnual = 0;
  let previousLimit = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= previousLimit) break;
    const amt = Math.min(taxableIncome - previousLimit, bracket.limit - previousLimit);
    federalTaxAnnual += amt * bracket.rate;
    previousLimit = bracket.limit;
  }

  const totalAnnualTax = ficaTaxAnnual + federalTaxAnnual;
  return isSalary ? totalAnnualTax : totalAnnualTax / payPeriod;
}

export function calculatePayWithOvertime(weekHrsArray, rate) {
  let total = 0;
  for (const hrs of weekHrsArray) {
    total += Math.min(40, hrs) * rate + Math.max(0, hrs - 40) * rate * 1.5;
  }
  return total;
}

// --- Geolocation ---
// A reading fuzzier than this is treated as unusable regardless of the geofence
// radius. Decoupled from the radius so a tight geofence doesn't reject normal
// phone GPS (which is typically accurate to ~5-65 m but can drift indoors).
const MAX_GPS_ACCURACY_METERS = 150;

export function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function checkLocation() {
  return new Promise((resolve, reject) => {
    if (!state.GEOFENCE_ENABLED) {
      resolve(null);
      return;
    }
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    showToast('Verifying your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        // GPS accuracy (how fuzzy the reading is) and the geofence radius (how
        // close to the site you must be) are independent concepts — the old
        // code compared accuracy directly against the radius, so tightening the
        // radius would start rejecting normal punches as "signal too weak."
        // Gate weak signal on its own threshold, never stricter than the radius.
        const accuracyLimit = Math.max(state.ALLOWED_RADIUS_METERS, MAX_GPS_ACCURACY_METERS);
        if (accuracy > accuracyLimit) {
          const accFt = Math.round(accuracy * 3.28084);
          reject(
            new Error(
              `GPS signal too weak to verify location (accuracy: ~${accFt} ft). Step outside and try again.`,
            ),
          );
          return;
        }
        const dist = getDistanceInMeters(
          state.CAR_WASH_LAT,
          state.CAR_WASH_LON,
          latitude,
          longitude,
        );
        // Give the reading the benefit of its own accuracy margin: allow the
        // punch if the employee could plausibly be within the radius.
        if (dist - accuracy <= state.ALLOWED_RADIUS_METERS) {
          resolve({ lat: latitude, lon: longitude, accuracy });
        } else {
          const feetAway = Math.round(dist * 3.28084);
          reject(new Error(`You are too far away! (${feetAway} feet from the site)`));
        }
      },
      (error) => {
        const msgs = {
          1: 'Please allow location access to clock in.',
          2: 'Location unavailable (GPS signal lost).',
          3: 'Location request timed out.',
        };
        reject(new Error(msgs[error.code] || 'Could not get location.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

// --- Schedule Parsing ---
export function parseShiftStartTime(shiftStr) {
  if (!shiftStr || typeof shiftStr !== 'string') return null;
  const s = shiftStr.trim();
  if (!s || s === '-' || s.toUpperCase() === 'OFF' || s.toUpperCase() === 'OC') return null;
  const dashIdx = s.indexOf('-');
  if (dashIdx < 0) return null;
  const startPart = s.substring(0, dashIdx).trim().toLowerCase();
  const isPM = startPart.includes('pm') || (startPart.endsWith('p') && !startPart.endsWith('am'));
  const isAM = startPart.includes('am') || startPart.endsWith('a');
  const clean = startPart.replace(/[a-z]/g, '');
  const [hStr, mStr] = clean.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return null;
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return { hour: h, minute: isNaN(m) ? 0 : m };
}

export function parseShiftHours(shiftStr) {
  if (!shiftStr || typeof shiftStr !== 'string') return 0;
  const s = shiftStr.trim().toUpperCase();
  if (s === '-' || s === 'OFF' || s === 'OC' || s === '') return 0;
  const parts = s.split('-');
  if (parts.length !== 2) return 0;

  function toDecimal(timeStr) {
    let t = timeStr.toLowerCase().replace(/\s+/g, '');
    const isPM = t.includes('pm') || t.includes('p');
    const isAM = t.includes('am') || t.includes('a');
    t = t.replace(/[a-z]/g, '');
    let [h, m] = t.split(':').map(Number);
    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return { val: h + m / 60, explicitAmPm: isAM || isPM };
  }

  try {
    const startObj = toDecimal(parts[0]);
    const endObj = toDecimal(parts[1]);
    let start = startObj.val;
    let end = endObj.val;
    if (!endObj.explicitAmPm) {
      if (end <= start) end += 12;
      else if (end - start <= 5 && end <= 11) end += 12;
    }
    return Math.max(0, end - start);
  } catch (e) {
    return 0;
  }
}

// --- CSV Download Helper ---
export function downloadCsv(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- Save Setting (upsert) ---
export async function saveSettingRobust(key, value) {
  const db = window.supabaseClient;
  const { data, error: updateErr } = await db
    .from('settings')
    .update({ value })
    .eq('id', key)
    .select();
  if (!updateErr && data && data.length > 0) return true;
  await db.from('settings').delete().eq('id', key);
  const { error: insertErr } = await db.from('settings').insert({ id: key, value });
  if (insertErr) throw insertErr;
  return true;
}

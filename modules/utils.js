// Shared mutable application state
export const state = {
  currentPin: '',
  currentUser: null,
  managerLoggedIn: false,
  currentManager: null,
  pending2FAUser: null,
  pendingLoginTarget: 'manager',
  employeeMap: {},
  currentPortalEmployee: null,
  selectedEmployeeForLogs: null,
  editingScheduleId: null,
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
  customPayrollFormat: { current: '', next: '' },
};

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
  const diffToTue = (day >= 2) ? (day - 2) : (day + 5);
  const tuesday = new Date(d.setDate(d.getDate() - diffToTue));
  tuesday.setHours(0, 0, 0, 0);
  return tuesday;
}

export function getBiweeklyWeeks(date) {
  // Anchor on Tuesday May 19, 2026 (start of first bi-weekly cycle)
  const anchor = new Date(2026, 4, 19);
  anchor.setHours(0, 0, 0, 0);

  // Use UTC day arithmetic to avoid DST drift
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
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
  logsArray.forEach(log => {
    if (log.action === 'TIMESHEET_APPROVED') return;
    const time = new Date(log.created_at).getTime();
    if (log.action === 'IN' || log.action === 'END_LUNCH' || log.action === 'CLOCK_IN') {
      currentStatus = 'IN';
      lastIn = time;
    } else if (log.action === 'OUT' || log.action === 'START_LUNCH' || log.action === 'CLOCK_OUT') {
      if (currentStatus === 'IN' && lastIn) totalMs += (time - lastIn);
      currentStatus = 'OUT';
    }
  });
  return totalMs / (1000 * 60 * 60);
}

export function calculateEstimatedTaxes(grossPay, taxStatus, isSalary, payPeriod = 26) {
  if (!grossPay || grossPay <= 0) return 0;
  const annualGross = isSalary ? grossPay : (grossPay * payPeriod);
  const ficaTaxAnnual = annualGross * 0.0765;

  let standardDeduction = 14600;
  let brackets = [
    { limit: 11600, rate: 0.10 }, { limit: 47150, rate: 0.12 },
    { limit: 100525, rate: 0.22 }, { limit: 191950, rate: 0.24 },
    { limit: 243725, rate: 0.32 }, { limit: 609350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 }
  ];

  if (taxStatus === 'Married Filing Jointly') {
    standardDeduction = 29200;
    brackets = [
      { limit: 23200, rate: 0.10 }, { limit: 94300, rate: 0.12 },
      { limit: 201050, rate: 0.22 }, { limit: 383900, rate: 0.24 },
      { limit: 487450, rate: 0.32 }, { limit: 731200, rate: 0.35 },
      { limit: Infinity, rate: 0.37 }
    ];
  } else if (taxStatus === 'Head of Household') {
    standardDeduction = 21900;
    brackets = [
      { limit: 16550, rate: 0.10 }, { limit: 63100, rate: 0.12 },
      { limit: 100500, rate: 0.22 }, { limit: 191950, rate: 0.24 },
      { limit: 243700, rate: 0.32 }, { limit: 609350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 }
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
  return isSalary ? totalAnnualTax : (totalAnnualTax / payPeriod);
}

export function calculatePayWithOvertime(weekHrsArray, rate) {
  let total = 0;
  for (const hrs of weekHrsArray) {
    total += (Math.min(40, hrs) * rate) + (Math.max(0, hrs - 40) * rate * 1.5);
  }
  return total;
}

// --- Geolocation ---
export function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function checkLocation() {
  return new Promise((resolve, reject) => {
    if (!state.GEOFENCE_ENABLED) { resolve(null); return; }
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    showToast('Verifying your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (accuracy > state.ALLOWED_RADIUS_METERS) {
          const accFt = Math.round(accuracy * 3.28084);
          reject(new Error(`GPS signal too weak to verify location (accuracy: ~${accFt} ft). Step outside and try again.`));
          return;
        }
        const dist = getDistanceInMeters(state.CAR_WASH_LAT, state.CAR_WASH_LON, latitude, longitude);
        if (dist <= state.ALLOWED_RADIUS_METERS) {
          resolve({ lat: latitude, lon: longitude, accuracy });
        } else {
          const feetAway = Math.round(dist * 3.28084);
          reject(new Error(`You are too far away! (${feetAway} feet from the site)`));
        }
      },
      (error) => {
        const msgs = { 1: 'Please allow location access to clock in.', 2: 'Location unavailable (GPS signal lost).', 3: 'Location request timed out.' };
        reject(new Error(msgs[error.code] || 'Could not get location.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

// --- Schedule Parsing ---
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
    return { val: h + (m / 60), explicitAmPm: isAM || isPM };
  }

  try {
    const startObj = toDecimal(parts[0]);
    const endObj = toDecimal(parts[1]);
    let start = startObj.val;
    let end = endObj.val;
    if (!endObj.explicitAmPm) {
      if (end <= start) end += 12;
      else if ((end - start) <= 5 && end <= 11) end += 12;
    }
    return Math.max(0, end - start);
  } catch (e) { return 0; }
}

// --- Weather ---
export async function loadWeather() {
  const weatherIcon = document.getElementById('weather-icon');
  const weatherTemp = document.getElementById('weather-temp');
  const weatherDesc = document.getElementById('weather-desc');
  if (!weatherIcon || !weatherTemp || !weatherDesc) return;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${state.CAR_WASH_LAT}&longitude=${state.CAR_WASH_LON}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather fetch failed');
    const data = await response.json();
    const weather = data.current_weather;
    if (!weather) throw new Error('No weather data');

    const code = weather.weathercode;
    let icon = '☁️', desc = 'Cloudy';
    if (code === 0) { icon = '☀️'; desc = 'Clear'; }
    else if (code <= 3) { icon = '⛅'; desc = 'Partly Cloudy'; }
    else if (code <= 48) { icon = '🌫️'; desc = 'Fog'; }
    else if (code <= 67) { icon = '🌧️'; desc = 'Rain'; }
    else if (code <= 82) { icon = '❄️'; desc = 'Snow'; }
    else if (code >= 95) { icon = '⛈️'; desc = 'Thunderstorm'; }

    weatherIcon.textContent = icon;
    weatherTemp.textContent = `${Math.round(weather.temperature)}°F`;
    weatherDesc.textContent = desc;
  } catch (e) {
    if (weatherDesc) weatherDesc.textContent = 'Weather Unavailable';
    if (weatherTemp) weatherTemp.textContent = '--°F';
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
  const { data, error: updateErr } = await db.from('settings').update({ value }).eq('id', key).select();
  if (!updateErr && data && data.length > 0) return;
  await db.from('settings').delete().eq('id', key);
  const { error: insertErr } = await db.from('settings').insert({ id: key, value });
  if (insertErr) throw insertErr;
}

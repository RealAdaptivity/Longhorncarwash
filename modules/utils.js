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
  WIFI_LOCK_ENABLED: false,
  WIFI_IP_ADDRESS: '',
  customPayrollFormat: { current: '', next: '' },
  currentSite: 'Site 1 - Justin TX',
};

// Initialize site selectors
const siteSelector = document.getElementById('site-selector');
const mobileSiteSelector = document.getElementById('mobile-site-selector');

async function handleSiteChange(newSite) {
  state.currentSite = newSite;
  if (siteSelector) siteSelector.value = newSite;
  if (mobileSiteSelector) mobileSiteSelector.value = newSite;
  
  console.log('Site changed to:', state.currentSite);
  showToast(`Switched to ${state.currentSite}`);
  
  if (state.managerLoggedIn) {
    const { loadEmployees, loadTimesheets } = await import('./manager.js');
    const { initSettings } = await import('./settings.js');
    loadEmployees();
    loadTimesheets();
    initSettings();
  }
}

if (siteSelector) {
  siteSelector.addEventListener('change', (e) => handleSiteChange(e.target.value));
}
if (mobileSiteSelector) {
  mobileSiteSelector.addEventListener('change', (e) => handleSiteChange(e.target.value));
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
  const { data, error: updateErr } = await db.from('settings').update({ value }).eq('id', key).eq('site', state.currentSite).select();
  if (!updateErr && data && data.length > 0) return true;
  await db.from('settings').delete().eq('id', key).eq('site', state.currentSite);
  const { error: insertErr } = await db.from('settings').insert({ id: key, value, site: state.currentSite });
  if (insertErr) throw insertErr;
  return true;
}

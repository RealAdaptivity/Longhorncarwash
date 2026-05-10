// Supabase client instance is available at window.supabaseClient

// --- DOM Elements ---
// Navigation
const navTimeclock = document.getElementById('nav-timeclock');
const navEmployee = document.getElementById('nav-employee');
const navManager = document.getElementById('nav-manager');
const navPayroll = document.getElementById('nav-payroll');
const navSchedule = document.getElementById('nav-schedule');
const viewTimeclock = document.getElementById('view-timeclock');
const viewEmployee = document.getElementById('view-employee');
const viewManager = document.getElementById('view-manager');
const viewPayroll = document.getElementById('view-payroll');
const viewSchedule = document.getElementById('view-schedule');

// Clock
const clockDisplay = document.getElementById('clock-display');
const dateDisplay = document.getElementById('date-display');

// PIN Pad
const pinDisplay = document.getElementById('pin-display');
const pinBtns = document.querySelectorAll('.pin-btn:not(.btn-clear):not(.btn-primary)');
const btnClear = document.getElementById('btn-clear');
const btnSubmit = document.getElementById('btn-submit');
const actionButtons = document.getElementById('action-buttons');
const employeeWelcome = document.getElementById('employee-welcome');
const btnClockIn = document.getElementById('btn-clock-in');
const btnStartLunch = document.getElementById('btn-start-lunch');
const btnEndLunch = document.getElementById('btn-end-lunch');
const btnClockOut = document.getElementById('btn-clock-out');
const btnCancelAction = document.getElementById('btn-cancel-action');

// Anti-Buddy Punching DOM
const photoVideo = document.getElementById('photo-video');
const photoCanvas = document.getElementById('photo-canvas');
const cameraContainer = document.getElementById('camera-container');
let cameraStream = null;

async function startCamera() {
  if (!photoVideo || !ANTI_BUDDY_ENABLED) return;
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    photoVideo.srcObject = cameraStream;
    if (cameraContainer) cameraContainer.style.display = 'block';
  } catch (err) {
    console.error("Camera access denied or unavailable", err);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  if (cameraContainer) cameraContainer.style.display = 'none';
}

function capturePhoto() {
  if (!ANTI_BUDDY_ENABLED || !cameraStream || !photoVideo || !photoCanvas) return null;
  const context = photoCanvas.getContext('2d');

  const targetWidth = 320;
  const targetHeight = 240;
  photoCanvas.width = targetWidth;
  photoCanvas.height = targetHeight;

  context.drawImage(photoVideo, 0, 0, targetWidth, targetHeight);
  return photoCanvas.toDataURL('image/jpeg', 0.5);
}

// Employee Portal
const employeeAuth = document.getElementById('employee-auth');
const employeeDashboard = document.getElementById('employee-dashboard');
const employeeUsernameInput = document.getElementById('employee-username-input');
const employeePinInput = document.getElementById('employee-pin-input');
const btnEmployeeLogin = document.getElementById('btn-employee-login');
const employeePortalWelcome = document.getElementById('employee-portal-welcome');
const empThisWeek = document.getElementById('emp-this-week');
const empLastWeek = document.getElementById('emp-last-week');
const btnEmployeeLogout = document.getElementById('btn-employee-logout');

// Time Off (Employee)
const btnShowRequestTimeoff = document.getElementById('btn-show-request-timeoff');
const modalRequestTimeoff = document.getElementById('modal-request-timeoff');
const timeoffStart = document.getElementById('timeoff-start');
const timeoffEnd = document.getElementById('timeoff-end');
const timeoffReason = document.getElementById('timeoff-reason');
const btnCancelTimeoff = document.getElementById('btn-cancel-timeoff');
const btnSubmitTimeoff = document.getElementById('btn-submit-timeoff');
const empTimeoffBody = document.getElementById('emp-timeoff-body');

let currentPortalEmployee = null;

// Manager
const managerAuth = document.getElementById('manager-auth');
const managerUsernameInput = document.getElementById('manager-username-input');
const managerPasswordInput = document.getElementById('manager-password-input');
const managerRememberMe = document.getElementById('manager-remember-me');
const btnManagerLogin = document.getElementById('btn-manager-login');
const managerDashboard = document.getElementById('manager-dashboard');
const timesheetBody = document.getElementById('timesheet-body');

// Payroll
const payrollAuth = document.getElementById('payroll-auth');
const payrollDashboard = document.getElementById('payroll-dashboard');
const btnPayrollLogin = document.getElementById('btn-payroll-login');
const payrollUsernameInput = document.getElementById('payroll-username-input');
const payrollPasswordInput = document.getElementById('payroll-password-input');
const biweeklyHistoryBody = document.getElementById('biweekly-history-body-payroll');
const monthlyArchiveBody = document.getElementById('monthly-archive-body-payroll');
const btnShowCreateUser = document.getElementById('btn-show-create-user');

// Create User Modal
const modalCreateUser = document.getElementById('modal-create-user');
const btnConfirmCreate = document.getElementById('btn-confirm-create');
const btnCancelCreate = document.getElementById('btn-cancel-create');
const newUserFirstName = document.getElementById('new-user-first-name');
const newUserLastName = document.getElementById('new-user-last-name');
const newUserLoginName = document.getElementById('new-user-login-name');
const newUserPin = document.getElementById('new-user-pin');
const newUserPassword = document.getElementById('new-user-password');

document.querySelectorAll('input[name="new-user-role"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'Manager') {
      newUserPassword.classList.remove('hidden');
    } else {
      newUserPassword.classList.add('hidden');
      newUserPassword.value = '';
    }
  });
});

// Toast
const toast = document.getElementById('toast');

// Forgot PIN
const btnForgotPin = document.getElementById('btn-forgot-pin');
const modalForgotPin = document.getElementById('modal-forgot-pin');
const forgotPinName = document.getElementById('forgot-pin-name');
const forgotPinNew = document.getElementById('forgot-pin-new');
const btnCancelForgot = document.getElementById('btn-cancel-forgot');
const btnSubmitForgot = document.getElementById('btn-submit-forgot');
const pendingPinsSection = document.getElementById('pending-pins-section');
const pendingPinsBody = document.getElementById('pending-pins-body');

// Time Off (Manager)
const pendingTimeoffSection = document.getElementById('pending-timeoff-section');
const managerTimeoffBody = document.getElementById('manager-timeoff-body');

// Forgot Password
const btnForgotPwd = document.getElementById('btn-forgot-password');
const modalForgotPwd = document.getElementById('modal-forgot-password');
const forgotPwdName = document.getElementById('forgot-password-name');
const forgotPwdNew = document.getElementById('forgot-password-new');
const btnCancelPwdReset = document.getElementById('btn-cancel-password-reset');
const btnSubmitPwdReset = document.getElementById('btn-submit-password-reset');

// Manage Logs Modal
const modalManageLogs = document.getElementById('modal-manage-logs');
const manageLogsTitle = document.getElementById('manage-logs-title');
const manageLogsBody = document.getElementById('manage-logs-body');
const btnCloseManage = document.getElementById('btn-close-manage');
const btnDeleteEmployee = document.getElementById('btn-delete-employee');
const newLogAction = document.getElementById('new-log-action');
const newLogTime = document.getElementById('new-log-time');
const btnAddLog = document.getElementById('btn-add-log');

// Schedules
const btnShowPostSchedule = document.getElementById('btn-show-post-schedule');
const postScheduleSection = document.getElementById('post-schedule-section');
const scheduleWeekRange = document.getElementById('schedule-week-range');
const scheduleEditorBody = document.getElementById('schedule-editor-body');
const scheduleHeaderInputs = document.querySelectorAll('.schedule-header-input');
const btnSubmitSchedule = document.getElementById('btn-submit-schedule');
const aiFab = document.getElementById('ai-fab');
const aiChatPanel = document.getElementById('ai-chat-panel');
const btnCloseAi = document.getElementById('btn-close-ai');
const aiChatHistory = document.getElementById('ai-chat-history');
const aiChatInput = document.getElementById('ai-chat-input');
const btnSendAi = document.getElementById('btn-send-ai');
const btnUploadAi = document.getElementById('btn-upload-ai');
const aiChatFile = document.getElementById('ai-chat-file');
const aiImagePreviewContainer = document.getElementById('ai-image-preview-container');
const aiImagePreviewName = document.getElementById('ai-image-preview-name');
const btnRemoveAiImage = document.getElementById('btn-remove-ai-image');

let aiSelectedImageBase64 = null;
let aiSelectedImageMime = null;
const scheduleList = document.getElementById('schedule-list');
const btnScheduleManagerLogin = document.getElementById('btn-schedule-manager-login');
const scheduleManagerAuth = document.getElementById('schedule-manager-auth');
const scheduleManagerUsername = document.getElementById('schedule-manager-username');
const scheduleManagerPassword = document.getElementById('schedule-manager-password');
const btnScheduleLoginSubmit = document.getElementById('btn-schedule-login-submit');

let selectedEmployeeForLogs = null;
let editingScheduleId = null;

// Announcements
const modalAnnouncement = document.getElementById('modal-announcement');
const announcementText = document.getElementById('announcement-text');
const btnAcknowledgeAnnouncement = document.getElementById('btn-acknowledge-announcement');
const announcementInput = document.getElementById('announcement-input');
const btnPostAnnouncement = document.getElementById('btn-post-announcement');
const btnClearAnnouncement = document.getElementById('btn-clear-announcement');

// Geofence
const geofenceInput = document.getElementById('geofence-input');
const geofenceLatInput = document.getElementById('geofence-lat');
const geofenceLonInput = document.getElementById('geofence-lon');
const btnSaveGeofence = document.getElementById('btn-save-geofence');
const btnToggleGeofence = document.getElementById('btn-toggle-geofence');
const geofenceStatusText = document.getElementById('geofence-status-text');

const modalEditPunch = document.getElementById('modal-edit-punch');
const editPunchAction = document.getElementById('edit-punch-action');
const editPunchDatetime = document.getElementById('edit-punch-datetime');
const btnCancelEditPunch = document.getElementById('btn-cancel-edit-punch');
const btnSaveEditPunch = document.getElementById('btn-save-edit-punch');

let currentEditingPunchId = null;
let activeAnnouncement = null;

// --- State ---
let currentPin = '';
let currentUser = null; // The employee currently using the terminal
let managerLoggedIn = false;
let currentManager = null; // Track who is currently logged into the dashboard
let pending2FAUser = null; // For login flow
let pendingLoginTarget = 'manager'; // 'manager' or 'payroll'
let employeeMap = {}; // Global employee data map

window.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('managerRememberUser');
  const savedPass = localStorage.getItem('managerRememberPass');
  if (savedUser && savedPass && managerRememberMe) {
    if (managerUsernameInput) managerUsernameInput.value = savedUser;
    if (managerPasswordInput) managerPasswordInput.value = savedPass;
    managerRememberMe.checked = true;
  }
});

// --- 2FA DOM Elements ---
const btnShowSecurity = document.getElementById('btn-show-security');
const modalSecurity = document.getElementById('modal-security');
const enable2FA = document.getElementById('enable-2fa');
const setup2FASection = document.getElementById('setup-2fa-section');
const setup2FAPin = document.getElementById('setup-2fa-pin');
const btnCloseSecurity = document.getElementById('btn-close-security');
const btnSaveSecurity = document.getElementById('btn-save-security');
const modal2FAVerify = document.getElementById('modal-2fa-verify');
const verify2FAPin = document.getElementById('verify-2fa-pin');
const btnSubmit2FA = document.getElementById('btn-submit-2fa');

// --- Analytics DOM ---
const btnShowAnalytics = document.getElementById('btn-show-analytics');
const btnCloseAnalytics = document.getElementById('btn-close-analytics');
const managerAnalyticsSection = document.getElementById('manager-analytics-section');
const dailyRevenueInput = document.getElementById('daily-revenue-input');
const laborGoalInput = document.getElementById('labor-goal-input');
const btnSaveRevenueGoals = document.getElementById('btn-save-revenue-goals');
const analyticsLaborCost = document.getElementById('analytics-labor-cost');
const analyticsLaborPercent = document.getElementById('analytics-labor-percent');
const analyticsNetProfit = document.getElementById('analytics-net-profit');

// --- Digital Ops DOM ---
const navOps = document.getElementById('nav-ops');
const viewOps = document.getElementById('view-ops');
const checklistsContainer = document.getElementById('checklists-container');
const siteLogsContainer = document.getElementById('site-logs-container');
const btnShowMaintenanceForm = document.getElementById('btn-show-maintenance-form');
const btnShowIncidentForm = document.getElementById('btn-show-incident-form');
const modalMaintenance = document.getElementById('modal-maintenance');
const modalIncident = document.getElementById('modal-incident');
const btnSubmitMaint = document.getElementById('btn-submit-maint');
const btnSubmitIncident = document.getElementById('btn-submit-incident');
const btnCancelMaint = document.getElementById('btn-cancel-maint');
const btnCancelIncident = document.getElementById('btn-cancel-incident');
const maintPhotoInput = document.getElementById('maint-photo');
const incidentPhotoInput = document.getElementById('incident-photo');

// --- Create Checklist DOM ---
const btnCreateChecklist = document.getElementById('btn-create-checklist');
const modalCreateChecklist = document.getElementById('modal-create-checklist');
const btnCancelCreateChecklist = document.getElementById('btn-cancel-create-checklist');
const btnSaveChecklist = document.getElementById('btn-save-checklist');
const checklistTitleInput = document.getElementById('checklist-title');
const checklistDescInput = document.getElementById('checklist-desc');
const checklistRoleInput = document.getElementById('checklist-role');
const btnAddTaskRow = document.getElementById('btn-add-task-row');
const checklistTasksInputContainer = document.getElementById('checklist-tasks-input-container');

let editingChecklistId = null;

// --- Execute Checklist DOM ---
const modalExecuteChecklist = document.getElementById('modal-execute-checklist');
const executeChecklistTitle = document.getElementById('execute-checklist-title');
const executeChecklistDesc = document.getElementById('execute-checklist-desc');
const executeChecklistTasks = document.getElementById('execute-checklist-tasks');
const btnCancelExecute = document.getElementById('btn-cancel-execute');
const btnSubmitCompletion = document.getElementById('btn-submit-completion');
const checklistHistoryContainer = document.getElementById('checklist-history-container');

let laborHoursChart = null;
let statusDistributionChart = null;
let dailyRevenueGoal = 0;
let laborCostGoalPercent = 25;

// --- Geofencing Configuration ---
// TO DO: Replace these with the actual Latitude and Longitude of the Car Wash building
let CAR_WASH_LAT = 33.06734; // Longhorn Car Wash Latitude
let CAR_WASH_LON = -97.29654; // Longhorn Car Wash Longitude
let ALLOWED_RADIUS_METERS = 100; // ~328 feet radius
let GEOFENCE_ENABLED = true;
let ANTI_BUDDY_ENABLED = true;

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function checkLocation() {
  return new Promise((resolve, reject) => {
    if (!GEOFENCE_ENABLED) {
      resolve(true); // Geofence is turned off, bypass completely
      return;
    }

    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    showToast("Verifying your location...", "success"); // Show temporary toast while loading GPS

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const dist = getDistanceInMeters(
          CAR_WASH_LAT,
          CAR_WASH_LON,
          position.coords.latitude,
          position.coords.longitude
        );

        if (dist <= ALLOWED_RADIUS_METERS) {
          resolve(true); // Within range!
        } else {
          // Convert meters to feet for easier reading
          const feetAway = Math.round(dist * 3.28084);
          reject(new Error(`You are too far away! (${feetAway} feet away from the site)`));
        }
      },
      (error) => {
        let msg = "Could not get location.";
        if (error.code === 1) msg = "Please allow location access to clock in.";
        if (error.code === 2) msg = "Location unavailable (GPS signal lost).";
        if (error.code === 3) msg = "Location request timed out.";
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// --- Clock Logic ---
function updateClock() {
  const now = new Date();
  clockDisplay.textContent = now.toLocaleTimeString('en-US', { hour12: true, timeZone: 'America/Chicago' });
  dateDisplay.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });
}
setInterval(updateClock, 1000);
updateClock();

// --- Navigation ---
function switchView(view) {
  if (typeof aiFab !== 'undefined' && aiFab) { aiFab.classList.toggle('hidden', view !== 'manager' && view !== 'schedule'); }
  viewTimeclock.classList.remove('active');
  viewManager.classList.remove('active');
  viewEmployee.classList.remove('active');
  viewPayroll.classList.remove('active');
  viewSchedule.classList.remove('active');
  viewOps.classList.remove('active');
  navTimeclock.classList.remove('active');
  navManager.classList.remove('active');
  navEmployee.classList.remove('active');
  navPayroll.classList.remove('active');
  navSchedule.classList.remove('active');
  navOps.classList.remove('active');

  if (view === 'timeclock') {
    viewTimeclock.classList.add('active');
    navTimeclock.classList.add('active');
    resetTimeclockState();
    logoutManager();
    logoutEmployeePortal();
  } else if (view === 'manager') {
    viewManager.classList.add('active');
    navManager.classList.add('active');
    if (managerLoggedIn) {
      managerAuth.classList.add('hidden');
      managerDashboard.classList.remove('hidden');
      loadTimesheets();
    } else {
      managerAuth.classList.remove('hidden');
      managerDashboard.classList.add('hidden');
    }
  } else if (view === 'employee') {
    viewEmployee.classList.add('active');
    navEmployee.classList.add('active');
    if (currentPortalEmployee) {
      loadEmployeePortal(currentPortalEmployee.id, currentPortalEmployee.name);
    }
  } else if (view === 'payroll') {
    viewPayroll.classList.add('active');
    navPayroll.classList.add('active');
    if (managerLoggedIn) {
      payrollAuth.classList.add('hidden');
      payrollDashboard.classList.remove('hidden');
      loadTimesheets();
    } else {
      payrollAuth.classList.remove('hidden');
      payrollDashboard.classList.add('hidden');
    }
  } else if (view === 'schedule') {
    viewSchedule.classList.add('active');
    navSchedule.classList.add('active');
    loadSchedules();
  } else if (view === 'ops') {
    viewOps.classList.add('active');
    navOps.classList.add('active');
    loadOps();
  }
}

navTimeclock.addEventListener('click', () => switchView('timeclock'));
navEmployee.addEventListener('click', () => switchView('employee'));
navManager.addEventListener('click', () => {
  pendingLoginTarget = 'manager';
  switchView('manager');
});
navPayroll.addEventListener('click', () => {
  pendingLoginTarget = 'payroll';
  switchView('payroll');
});
navSchedule.addEventListener('click', () => switchView('schedule'));
navOps.addEventListener('click', () => switchView('ops'));

// --- Toast Utility ---
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.style.backgroundColor = type === 'error' ? 'var(--danger)' : 'var(--primary)';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// --- PIN Pad Logic ---
pinBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentPin.length < 4) {
      currentPin += btn.dataset.val;
      updatePinDisplay();
    }
  });
});

btnClear.addEventListener('click', () => {
  currentPin = '';
  updatePinDisplay();
});

function updatePinDisplay() {
  pinDisplay.value = currentPin;
}

btnSubmit.addEventListener('click', async () => {
  if (currentPin.length !== 4) {
    showToast('PIN must be 4 digits', 'error');
    return;
  }

  // Authenticate against Supabase
  try {
    const { data, error } = await window.supabaseClient
      .from('users')
      .select('*')
      .eq('pin', currentPin)
      .single();

    if (error || !data) {
      showToast('Invalid PIN', 'error');
      currentPin = '';
      updatePinDisplay();
      return;
    }

    // Success
    currentUser = data;
    employeeWelcome.textContent = `Welcome, ${data.name}`;
    document.querySelector('.pin-pad').classList.add('hidden');
    pinDisplay.classList.add('hidden');

    // Check for active announcement
    if (activeAnnouncement && activeAnnouncement.trim() !== '') {
      announcementText.textContent = activeAnnouncement;
      modalAnnouncement.classList.remove('hidden');
    } else {
      actionButtons.classList.remove('hidden');
      startCamera();
    }
    resetIdleTimeout();

  } catch (err) {
    showToast('Network error. Check configuration.', 'error');
  }
});

let idleTimeout = null;
function resetIdleTimeout() {
  if (idleTimeout) clearTimeout(idleTimeout);
  if (currentUser && !managerLoggedIn) {
    idleTimeout = setTimeout(() => {
      resetTimeclockState();
      showToast('Session expired due to inactivity', 'warning');
    }, 45000); // 45 seconds
  }
}

// Global click listener to reset idle timeout if they are tapping around
document.addEventListener('click', () => {
  if (currentUser && !managerLoggedIn) resetIdleTimeout();
});

function resetTimeclockState() {
  if (idleTimeout) clearTimeout(idleTimeout);
  stopCamera();
  currentPin = '';
  currentUser = null;
  updatePinDisplay();
  const pp = document.querySelector('.pin-pad');
  if (pp) pp.classList.remove('hidden');
  if (pinDisplay) pinDisplay.classList.remove('hidden');
  if (actionButtons) actionButtons.classList.add('hidden');
  if (modalAnnouncement) modalAnnouncement.classList.add('hidden');
}

btnCancelAction.addEventListener('click', resetTimeclockState);

// --- Digital Timesheet Sign-Offs ---
const btnShowSignTimesheet = document.getElementById('btn-show-sign-timesheet');
const modalSignTimesheet = document.getElementById('modal-sign-timesheet');
const signTimesheetBody = document.getElementById('sign-timesheet-body');
const signTimesheetLoading = document.getElementById('sign-timesheet-loading');
const signTimesheetTotal = document.getElementById('sign-timesheet-total');
const btnCancelSign = document.getElementById('btn-cancel-sign');
const btnApproveSign = document.getElementById('btn-approve-sign');

function calculateTotalHoursForLogs(logsArray) {
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
      if (currentStatus === 'IN' && lastIn) {
        totalMs += (time - lastIn);
      }
      currentStatus = 'OUT';
    }
  });

  return totalMs / (1000 * 60 * 60);
}

if (btnShowSignTimesheet) {
  btnShowSignTimesheet.addEventListener('click', async () => {
    if (!currentUser) return;
    modalSignTimesheet.classList.remove('hidden');
    signTimesheetBody.innerHTML = '';
    signTimesheetLoading.classList.remove('hidden');
    signTimesheetTotal.textContent = '0.00';

    stopCamera();

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await window.supabaseClient
        .from('time_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      signTimesheetLoading.classList.add('hidden');

      let html = '';
      data.forEach(log => {
        if (log.action === 'TIMESHEET_APPROVED') return;

        const d = new Date(log.created_at);
        const dateStr = d.toLocaleDateString('en-US');
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        let actionColor = 'var(--text)';
        if (log.action === 'IN' || log.action === 'CLOCK_IN') actionColor = 'var(--success)';
        if (log.action === 'OUT' || log.action === 'CLOCK_OUT') actionColor = 'var(--danger)';
        if (log.action === 'START_LUNCH') actionColor = 'var(--warning)';
        if (log.action === 'END_LUNCH') actionColor = 'var(--primary)';

        html += `
          <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 8px 5px;">${dateStr}</td>
            <td style="padding: 8px 5px; color: ${actionColor}; font-weight: bold;">${log.action.replace('_', ' ')}</td>
            <td style="padding: 8px 5px;">${timeStr}</td>
          </tr>
        `;
      });

      if (html === '') {
        html = '<tr><td colspan="3" style="text-align:center; padding: 20px; color: var(--text-muted);">No logs found for the last 7 days.</td></tr>';
      }

      signTimesheetBody.innerHTML = html;

      const totalHours = calculateTotalHoursForLogs(data);
      signTimesheetTotal.textContent = totalHours.toFixed(2);

    } catch (err) {
      signTimesheetLoading.textContent = 'Error loading logs.';
    }
  });
}

if (btnCancelSign) {
  btnCancelSign.addEventListener('click', () => {
    modalSignTimesheet.classList.add('hidden');
    startCamera(); // Resume camera for punching
  });
}

if (btnApproveSign) {
  btnApproveSign.addEventListener('click', async () => {
    if (!currentUser) return;

    btnApproveSign.disabled = true;
    btnApproveSign.textContent = 'Approving...';

    try {
      const { error } = await window.supabaseClient.from('time_logs').insert([
        { user_id: currentUser.id, action: 'TIMESHEET_APPROVED' }
      ]);

      if (error) throw error;

      showToast('Timesheet Digitally Signed!', 'success');
      modalSignTimesheet.classList.add('hidden');

      resetTimeclockState();

    } catch (err) {
      showToast('Failed to sign timesheet.', 'error');
    } finally {
      btnApproveSign.disabled = false;
      btnApproveSign.innerHTML = '<span>✍️</span> Digitally Sign & Approve';
    }
  });
}

btnAcknowledgeAnnouncement.addEventListener('click', () => {
  modalAnnouncement.classList.add('hidden');
  actionButtons.classList.remove('hidden');
});

// --- Clock In / Out Logic ---
async function logTime(action, tips = 0) {
  if (!currentUser) return;

  let btn = btnClockIn;
  if (action === 'OUT') btn = btnClockOut;
  if (action === 'START_LUNCH') btn = btnStartLunch;
  if (action === 'END_LUNCH') btn = btnEndLunch;

  btn.disabled = true;
  btn.style.opacity = '0.5';

  try {
    // 1. Check if they are already in the requested state
    if (navigator.onLine) {
      const { data: lastLog, error: logErr } = await window.supabaseClient.from('time_logs')
        .select('action')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!logErr && lastLog && lastLog.length > 0) {
        const lastAction = lastLog[0].action;
        const isCurrentlyIn = lastAction === 'IN' || lastAction === 'END_LUNCH';
        const isCurrentlyOut = lastAction === 'OUT';
        const isCurrentlyLunch = lastAction === 'START_LUNCH';

        if (action === 'IN' && isCurrentlyIn) throw new Error("You are already clocked in.");
        if (action === 'OUT' && isCurrentlyOut) throw new Error("You are already clocked out.");
        if (action === 'START_LUNCH' && isCurrentlyLunch) throw new Error("You are already on lunch.");
        if (action === 'END_LUNCH' && !isCurrentlyLunch) throw new Error("You must be on lunch to end lunch.");
        if ((action === 'START_LUNCH' || action === 'OUT') && !isCurrentlyIn && !isCurrentlyLunch) {
          throw new Error("You must clock in first.");
        }
      } else if (action === 'OUT' || action === 'START_LUNCH' || action === 'END_LUNCH') {
        throw new Error("You must clock in first.");
      }
    }

    // 2. Check if the employee is physically at the location
    await checkLocation();

    // 3. Check online status
    if (!navigator.onLine) {
      const offlineLogs = JSON.parse(localStorage.getItem('offlineLogs') || '[]');
      offlineLogs.push({ user_id: currentUser.id, action: action, created_at: new Date().toISOString() });
      localStorage.setItem('offlineLogs', JSON.stringify(offlineLogs));

      let actText = action.replace('_', ' ');
      showToast(`Offline: Saved ${actText} locally.`, 'success');
      resetTimeclockState();
      return;
    }

    // 4. If online, proceed with clocking
    const photoData = capturePhoto();
    const payload = { user_id: currentUser.id, action: action };
    if (photoData) payload.photo_base64 = photoData;
    if (action === 'OUT' && tips > 0) payload.tips_declared = tips;

    const { error } = await window.supabaseClient
      .from('time_logs')
      .insert([payload]);

    if (error) throw error;

    let actText = action.replace('_', ' ');
    showToast(`Successfully Logged ${actText}!`);
    resetTimeclockState();
    if (managerLoggedIn) {
      loadTimesheets();
    }
  } catch (err) {
    showToast(err.message || 'Error saving log.', 'error');
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

// Offline Sync Listeners
window.addEventListener('online', syncOfflineLogs);
window.addEventListener('load', syncOfflineLogs);

async function syncOfflineLogs() {
  const offlineLogs = JSON.parse(localStorage.getItem('offlineLogs') || '[]');
  if (offlineLogs.length === 0) return;

  if (navigator.onLine) {
    showToast(`Syncing ${offlineLogs.length} offline punches...`);
    try {
      const { error } = await window.supabaseClient.from('time_logs').insert(offlineLogs);
      if (error) throw error;
      localStorage.removeItem('offlineLogs');
      showToast('Offline punches synced successfully!', 'success');
      if (managerLoggedIn) loadTimesheets();
    } catch (err) {
      console.error('Failed to sync offline logs:', err);
      showToast('Failed to sync offline punches. Will try again later.', 'error');
    }
  }
}

btnClockIn.addEventListener('click', () => logTime('IN'));

btnClockOut.addEventListener('click', () => {
  const modalTipDeclaration = document.getElementById('modal-tip-declaration');
  const tipAmountInput = document.getElementById('tip-amount-input');
  if (modalTipDeclaration && tipAmountInput) {
    modalTipDeclaration.classList.remove('hidden');
    tipAmountInput.value = '';
    tipAmountInput.focus();
    stopCamera();
  } else {
    logTime('OUT');
  }
});

const btnSkipTips = document.getElementById('btn-skip-tips');
const btnSubmitTips = document.getElementById('btn-submit-tips');
const modalTipDeclaration = document.getElementById('modal-tip-declaration');
const tipAmountInput = document.getElementById('tip-amount-input');

if (btnSkipTips) {
  btnSkipTips.addEventListener('click', () => {
    modalTipDeclaration.classList.add('hidden');
    startCamera(); // restart camera for the punch
    logTime('OUT', 0);
  });
}

if (btnSubmitTips) {
  btnSubmitTips.addEventListener('click', () => {
    modalTipDeclaration.classList.add('hidden');
    startCamera(); // restart camera for the punch
    let tips = parseFloat(tipAmountInput.value) || 0;
    logTime('OUT', tips);
  });
}

btnStartLunch.addEventListener('click', () => logTime('START_LUNCH'));
btnEndLunch.addEventListener('click', () => logTime('END_LUNCH'));

// --- Forgot PIN Logic ---
btnForgotPin.addEventListener('click', () => {
  modalForgotPin.classList.remove('hidden');
});

btnCancelForgot.addEventListener('click', () => {
  modalForgotPin.classList.add('hidden');
  forgotPinName.value = '';
  forgotPinNew.value = '';
});

btnSubmitForgot.addEventListener('click', async () => {
  const name = forgotPinName.value;
  const newPin = forgotPinNew.value;
  if (!name || newPin.length !== 4) {
    showToast('Enter your name and a 4-digit PIN', 'error');
    return;
  }

  try {
    const { data: user, error } = await window.supabaseClient.from('users').select('id').eq('name', name).single();
    if (error || !user) {
      showToast('User not found', 'error');
      return;
    }

    const { data: existing } = await window.supabaseClient.from('users').select('id').eq('pin', newPin).single();
    if (existing) {
      showToast('PIN is already in use', 'error');
      return;
    }

    const { error: updateError } = await window.supabaseClient.from('users').update({ pending_pin: newPin }).eq('id', user.id);
    if (updateError) throw updateError;

    showToast('PIN change requested! Waiting for manager approval.');
    modalForgotPin.classList.add('hidden');
    forgotPinName.value = '';
    forgotPinNew.value = '';
  } catch (err) {
    showToast('Failed to request PIN change', 'error');
  }
});

// --- Manager Logic ---
btnManagerLogin.addEventListener('click', async () => {
  const username = managerUsernameInput.value.trim();
  const password = managerPasswordInput.value;
  if (!username || !password) return;

  if (managerRememberMe && managerRememberMe.checked) {
    localStorage.setItem('managerRememberUser', username);
    localStorage.setItem('managerRememberPass', password);
  } else {
    localStorage.removeItem('managerRememberUser');
    localStorage.removeItem('managerRememberPass');
  }

  try {
    const { data: rawData, error } = await window.supabaseClient
      .from('users')
      .select('*')
      .eq('name', username)
      .eq('password', password)
      .eq('role', 'Manager')
      .eq('is_approved', true)
      .not('password', 'is', null)
      .limit(1);

    if (error || !rawData || rawData.length === 0) {
      if (error) console.error("Login Error:", error);
      showToast('Invalid Manager Username or Password', 'error');
      return;
    }

    const data = rawData[0];

    // Check 2FA
    if (data.two_factor_enabled) {
      pending2FAUser = data;
      modal2FAVerify.classList.remove('hidden');
      verify2FAPin.value = '';
      verify2FAPin.focus();
      return;
    }

    completeManagerLogin(data);
  } catch (err) {
    showToast('Error during login.', 'error');
  }
});

btnPayrollLogin.addEventListener('click', async () => {
  const username = payrollUsernameInput.value.trim();
  const password = payrollPasswordInput.value;
  if (!username || !password) return;

  try {
    const { data: rawData, error } = await window.supabaseClient
      .from('users')
      .select('*')
      .eq('name', username)
      .eq('password', password)
      .eq('role', 'Manager')
      .eq('is_approved', true)
      .not('password', 'is', null)
      .limit(1);

    if (error || !rawData || rawData.length === 0) {
      showToast('Invalid Manager Username or Password', 'error');
      return;
    }

    const data = rawData[0];

    // Check 2FA
    if (data.two_factor_enabled) {
      pending2FAUser = data;
      modal2FAVerify.classList.remove('hidden');
      verify2FAPin.value = '';
      verify2FAPin.focus();
      return;
    }

    completeManagerLogin(data);
  } catch (err) {
    showToast('Error during login.', 'error');
  }
});

function completeManagerLogin(data) {
  managerLoggedIn = true;
  currentManager = data;
  if (btnShowPostSchedule) btnShowPostSchedule.classList.remove('hidden');
  if (btnScheduleManagerLogin) btnScheduleManagerLogin.classList.add('hidden');
  
  if (pendingLoginTarget === 'payroll') {
    if (payrollAuth) payrollAuth.classList.add('hidden');
    if (payrollDashboard) payrollDashboard.classList.remove('hidden');
    if (payrollUsernameInput) payrollUsernameInput.value = '';
    if (payrollPasswordInput) payrollPasswordInput.value = '';
  } else {
    managerAuth.classList.add('hidden');
    managerDashboard.classList.remove('hidden');
    managerUsernameInput.value = '';
    managerPasswordInput.value = '';
  }
  loadTimesheets();
}

btnSubmit2FA.addEventListener('click', () => {
  if (!pending2FAUser) return;
  if (verify2FAPin.value === pending2FAUser.two_factor_pin) {
    const user = pending2FAUser;
    pending2FAUser = null;
    modal2FAVerify.classList.add('hidden');
    completeManagerLogin(user);
  } else {
    showToast('Invalid 2-Step PIN', 'error');
    verify2FAPin.value = '';
  }
});

function logoutManager() {
  managerLoggedIn = false;
  currentManager = null;
  pending2FAUser = null;
  if (btnShowPostSchedule) btnShowPostSchedule.classList.add('hidden');
  if (postScheduleSection) postScheduleSection.classList.add('hidden');
  if (btnScheduleManagerLogin) btnScheduleManagerLogin.classList.remove('hidden');
  if (scheduleManagerAuth) scheduleManagerAuth.classList.add('hidden');
  if (managerDashboard) managerDashboard.classList.add('hidden');
  if (managerAuth) managerAuth.classList.remove('hidden');
  if (managerUsernameInput) managerUsernameInput.value = '';
  if (managerPasswordInput) managerPasswordInput.value = '';
  if (modalCreateUser) modalCreateUser.classList.add('hidden');
}

// --- Employee Portal Logic ---
btnEmployeeLogin.addEventListener('click', async () => {
  const username = employeeUsernameInput.value;
  const pin = employeePinInput.value;

  if (!username || !pin) {
    showToast('Please enter Name and PIN', 'error');
    return;
  }

  try {
    const { data: user, error } = await window.supabaseClient.from('users')
      .select('id, name').eq('name', username).eq('pin', pin).single();

    if (error || !user) {
      showToast('Invalid Name or PIN', 'error');
      return;
    }

    currentPortalEmployee = user;
    employeeUsernameInput.value = '';
    employeePinInput.value = '';
    employeeAuth.classList.add('hidden');
    employeeDashboard.classList.remove('hidden');

    loadMySchedule();
    loadEmployeePortal(user.id, user.name);
  } catch (err) {
    showToast('Error logging in', 'error');
  }
});

btnEmployeeLogout.addEventListener('click', logoutEmployeePortal);

function logoutEmployeePortal() {
  currentPortalEmployee = null;
  employeeDashboard.classList.add('hidden');
  employeeAuth.classList.remove('hidden');
  employeeUsernameInput.value = '';
  employeePinInput.value = '';
}

async function loadEmployeePortal(userId, name) {
  employeePortalWelcome.textContent = `Welcome, ${name}`;
  try {
    const { data: logsData, error } = await window.supabaseClient.from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const startOfWeek = getStartOfWeek().getTime();
    const startOfLastWeek = startOfWeek - (7 * 24 * 60 * 60 * 1000);

    let currentStatus = 'OUT';
    let lastIn = null;
    let thisWeekMs = 0;
    let lastWeekMs = 0;

    logsData.forEach(log => {
      const time = new Date(log.created_at).getTime();
      if (log.action === 'IN' || log.action === 'END_LUNCH') {
        currentStatus = 'IN';
        lastIn = time;
      } else if (log.action === 'OUT' || log.action === 'START_LUNCH') {
        if (currentStatus === 'IN' && lastIn) {
          const duration = time - lastIn;
          if (lastIn >= startOfWeek) {
            thisWeekMs += duration;
          } else if (lastIn >= startOfLastWeek && lastIn < startOfWeek) {
            lastWeekMs += duration;
          } else if (time >= startOfWeek) {
            thisWeekMs += (time - startOfWeek);
          }
        }
        currentStatus = log.action === 'START_LUNCH' ? 'LUNCH' : 'OUT';
        lastIn = null;
      }
    });

    if (currentStatus === 'IN' && lastIn) {
      const activeMs = Date.now() - lastIn;
      if (lastIn >= startOfWeek) {
        thisWeekMs += activeMs;
      } else if (lastIn >= startOfLastWeek && lastIn < startOfWeek) {
        lastWeekMs += activeMs;
      } else {
        thisWeekMs += (Date.now() - startOfWeek);
      }
    }

    empThisWeek.textContent = (thisWeekMs / (1000 * 60 * 60)).toFixed(2);
    empLastWeek.textContent = (lastWeekMs / (1000 * 60 * 60)).toFixed(2);

    // Load Time Off requests
    const { data: timeoffs, error: toError } = await window.supabaseClient.from('time_off_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!toError && timeoffs) {
      empTimeoffBody.innerHTML = '';
      timeoffs.forEach(req => {
        const tr = document.createElement('tr');
        let statusColor = 'var(--text-muted)';
        if (req.status === 'Approved') statusColor = 'var(--success)';
        if (req.status === 'Denied') statusColor = 'var(--danger)';
        if (req.status === 'Pending') statusColor = 'var(--warning)';

        tr.innerHTML = `
          <td>${req.start_date} to ${req.end_date}</td>
          <td>${req.reason}</td>
          <td style="color: ${statusColor}; font-weight: bold;">${req.status}</td>
        `;
        empTimeoffBody.appendChild(tr);
      });
    }

    // Load Checklists for Employee Dashboard
    const empChecklistsContainer = document.getElementById('emp-checklists-container');
    if (empChecklistsContainer) {
      try {
        const { data: checklists, error: checkError } = await window.supabaseClient.from('checklists').select('*').order('created_at', { ascending: true });
        if (!checkError && checklists) {
          empChecklistsContainer.innerHTML = '';
          const myChecklists = checklists.filter(c => c.role_required === 'Employee');
          
          if (myChecklists.length === 0) {
            empChecklistsContainer.innerHTML = '<p style="color: var(--text-muted);">No checklists assigned to you.</p>';
          } else {
            myChecklists.forEach(list => {
              const div = document.createElement('div');
              div.style = 'background: var(--surface); padding: 15px; border-radius: 10px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: transform 0.2s;';
              div.innerHTML = `
                <div style="text-align: left;">
                  <strong style="color: var(--primary); display: block;">${list.title}</strong>
                  <span style="font-size: 0.8rem; color: var(--text-muted);">${list.description || 'No description'}</span>
                </div>
                <button class="btn-primary" style="padding: 5px 15px; font-size: 0.8rem; border-radius: 6px; border: none;">Start</button>
              `;
              div.onmouseover = () => div.style.transform = 'translateY(-2px)';
              div.onmouseout = () => div.style.transform = 'translateY(0)';
              div.onclick = () => showChecklistExecution(list);
              empChecklistsContainer.appendChild(div);
            });
          }
        }
      } catch (e) { }
    }

  } catch (err) {
    showToast('Failed to load portal data', 'error');
  }
}

function getStartOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diffToWed = (day >= 3) ? (day - 3) : (day + 4);
  const wednesday = new Date(d.setDate(d.getDate() - diffToWed));
  wednesday.setHours(0, 0, 0, 0);
  return wednesday;
}

function formatNameLastFirst(fullName) {
  if (!fullName) return '';
  // If already has a comma, assume it's already "Last, First"
  if (fullName.includes(',')) return fullName;
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const lastName = parts.pop();
  const firstName = parts.join(' ');
  return `${lastName}, ${firstName}`;
}

// --- Weather Integration ---
const weatherIcon = document.getElementById('weather-icon');
const weatherTemp = document.getElementById('weather-temp');
const weatherDesc = document.getElementById('weather-desc');

async function loadWeather() {
  if (!weatherIcon || !weatherTemp || !weatherDesc) return;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${CAR_WASH_LAT}&longitude=${CAR_WASH_LON}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();

    const weather = data.current_weather;
    if (!weather) throw new Error('No weather data');

    const temp = Math.round(weather.temperature);
    const code = weather.weathercode;

    // WMO Weather interpretation codes
    let icon = '☁️';
    let desc = 'Cloudy';
    if (code === 0) { icon = '☀️'; desc = 'Clear'; }
    else if (code === 1 || code === 2 || code === 3) { icon = '⛅'; desc = 'Partly Cloudy'; }
    else if (code >= 45 && code <= 48) { icon = '🌫️'; desc = 'Fog'; }
    else if (code >= 51 && code <= 67) { icon = '🌧️'; desc = 'Rain'; }
    else if (code >= 71 && code <= 82) { icon = '❄️'; desc = 'Snow'; }
    else if (code >= 95) { icon = '⛈️'; desc = 'Thunderstorm'; }

    weatherIcon.textContent = icon;
    weatherTemp.textContent = `${temp}°F`;
    weatherDesc.textContent = desc;

  } catch (e) {
    weatherDesc.textContent = 'Weather Unavailable';
    weatherTemp.textContent = '--°F';
  }
}

// --- Schedule Helpers ---
function parseShiftHours(shiftStr) {
  if (!shiftStr || typeof shiftStr !== 'string') return 0;
  const s = shiftStr.trim().toUpperCase();
  if (s === '-' || s === 'OFF' || s === 'OC' || s === '') return 0;

  const parts = s.split('-');
  if (parts.length !== 2) return 0;

  function toDecimal(time) {
    let [h, m] = time.split(':').map(Number);
    if (isNaN(m)) m = 0;
    return h + (m / 60);
  }

  try {
    let start = toDecimal(parts[0].trim());
    let end = toDecimal(parts[1].trim());

    // If end time is same or numerically smaller than start (e.g. 7-7 or 8-5),
    // assume the end time is in the afternoon (add 12 hours).
    if (end <= start) {
      end += 12;
    }

    return Math.max(0, end - start);
  } catch (e) { return 0; }
}

// --- Schedule Logic ---
async function loadTimesheets() {
  try {
    const { data: usersData, error: usersError } = await window.supabaseClient.from('users').select('*');
    const { data: logsData, error: logsError } = await window.supabaseClient.from('time_logs').select('*').order('created_at', { ascending: true });

    if (usersError || logsError) throw new Error('Fetch failed');

    const startOfWeek = getStartOfWeek().getTime();
    const startOfLastWeek = startOfWeek - (7 * 24 * 60 * 60 * 1000);
    const startOf2WeeksAgo = startOfWeek - (14 * 24 * 60 * 60 * 1000);
    const startOf3WeeksAgo = startOfWeek - (21 * 24 * 60 * 60 * 1000);
    const startOf4WeeksAgo = startOfWeek - (28 * 24 * 60 * 60 * 1000);
    employeeMap = {};

    // Perform automated 30-day purge in the background
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    window.supabaseClient.from('time_logs')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .then(({error}) => { if (error) console.error("Purge error", error); });

    // Wire up CSV Export Buttons
    const exportBtns = [
      document.getElementById('btn-export-csv')
    ];

    exportBtns.forEach(btn => {
      if (btn) {
        // Remove old listeners to avoid multiple fires
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => {
          const rows = document.querySelectorAll('#timesheet-body tr');
          if (rows.length === 0) {
            showToast('No data to export', 'warning');
            return;
          }

          let csv = "#,Employee,Status,Mon,Tue,Wed,Thu,Fri,Sat,Sun,Total This Week,Last Week Total,Biweekly Total\n";
          let count = 1;
          rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            let rowData = [];
            cols.forEach((col, index) => {
              if (index === cols.length - 1) return; // Skip Action buttons
              let text = col.textContent.replace(/(\r\n|\n|\r)/gm, "").trim();
              if (index === 0) text = formatNameLastFirst(text); // Format name
              text = text.replace(/"/g, '""');
              rowData.push(`"${text}"`);
            });

            // Calculate and append Biweekly Total
            const thisWeek = parseFloat(rowData[9] ? rowData[9].replace(/"/g, '') : 0) || 0;
            const lastWeek = parseFloat(rowData[10] ? rowData[10].replace(/"/g, '') : 0) || 0;
            const biweeklyTotalVal = thisWeek + lastWeek;
            
            // Skip if Biweekly Total is 0
            if (biweeklyTotalVal === 0) return;

            const biweeklyTotal = biweeklyTotalVal.toFixed(2);
            rowData.push(`"${biweeklyTotal}"`);

            // Prepend sequence number
            rowData.unshift(`"${count++}"`);

            csv += rowData.join(",") + "\n";
          });

          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", `Payroll_Export_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast('Payroll CSV Downloaded!', 'success');
        });
      }
    });

    // Wire up Biweekly CSV Export
    const btnExportBiweekly = document.getElementById('btn-export-biweekly');
    if (btnExportBiweekly) {
      const newBtnBiweekly = btnExportBiweekly.cloneNode(true);
      btnExportBiweekly.parentNode.replaceChild(newBtnBiweekly, btnExportBiweekly);
      newBtnBiweekly.addEventListener('click', () => {
        const rows = document.querySelectorAll('#biweekly-history-body-payroll tr');
        if (rows.length === 0) {
          showToast('No data to export', 'warning');
          return;
        }

        let csv = "#,Employee,Last Week (Hrs),This Week (Hrs),Biweekly Total (Hrs),Type,Rate/Salary,Est. Gross Pay\n";
        let count = 1;
        rows.forEach(row => {
          const cols = row.querySelectorAll('td');
          if (cols.length < 4) return;

          // Check Biweekly Total (index 3)
          const biweeklyTotalText = cols[3].textContent.trim();
          const biweeklyTotal = parseFloat(biweeklyTotalText) || 0;
          if (biweeklyTotal === 0) return;

          let rowData = [`"${count++}"`];
          cols.forEach((col, index) => {
            if (index >= 4) return; // Skip Actions column
            let text = col.textContent.replace(/(\r\n|\n|\r)/gm, "").trim();
            if (index === 0) text = formatNameLastFirst(text); // Format name
            text = text.replace(/"/g, '""');
            rowData.push(`"${text}"`);
          });

          const manageBtn = row.querySelector('.btn-manage-logs');
          const empId = manageBtn ? manageBtn.dataset.id : null;
          const emp = (empId && employeeMap[empId]) ? employeeMap[empId] : { pay_rate: 0, is_salary: false };
          const totalHrs = parseFloat(cols[3].textContent) || 0;
          const estPay = emp.is_salary ? emp.pay_rate.toFixed(2) : (totalHrs * emp.pay_rate).toFixed(2);
          
          rowData.push(`"${emp.is_salary ? 'Salary' : 'Hourly'}"`);
          rowData.push(`"${emp.pay_rate}"`);
          rowData.push(`"${estPay}"`);

          csv += rowData.join(",") + "\n";
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Biweekly_Payroll_Export_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Biweekly CSV Downloaded!', 'success');
      });
    }

    // Wire up Monthly CSV Export
    const btnExportMonthly = document.getElementById('btn-export-monthly');
    if (btnExportMonthly) {
      const newBtnMonthly = btnExportMonthly.cloneNode(true);
      btnExportMonthly.parentNode.replaceChild(newBtnMonthly, btnExportMonthly);
      newBtnMonthly.addEventListener('click', () => {
        const rows = document.querySelectorAll('#monthly-archive-body-payroll tr');
        if (rows.length === 0) {
          showToast('No data to export', 'warning');
          return;
        }

        let csv = "#,Employee,4 Weeks Ago,3 Weeks Ago,2 Weeks Ago,Last Week,This Week,Monthly Total (Hrs),Type,Rate/Salary,Est. Gross Pay\n";
        let count = 1;
        rows.forEach(row => {
          const cols = row.querySelectorAll('td');
          if (cols.length < 7) return;

          // Check Monthly Total (index 6)
          const monthlyTotalText = cols[6].textContent.trim();
          const monthlyTotal = parseFloat(monthlyTotalText) || 0;
          if (monthlyTotal === 0) return;

          let rowData = [`"${count++}"`];
          cols.forEach((col, index) => {
            if (index >= 7) return; // Skip Actions column
            let text = col.textContent.replace(/(\r\n|\n|\r)/gm, "").trim();
            if (index === 0) text = formatNameLastFirst(text); // Format name
            text = text.replace(/"/g, '""');
            rowData.push(`"${text}"`);
          });

          const manageBtn = row.querySelector('.btn-manage-logs');
          const empId = manageBtn ? manageBtn.dataset.id : null;
          const emp = (empId && employeeMap[empId]) ? employeeMap[empId] : { pay_rate: 0, is_salary: false };
          const totalHrs = parseFloat(cols[6].textContent) || 0;
          const estPay = emp.is_salary ? emp.pay_rate.toFixed(2) : (totalHrs * emp.pay_rate).toFixed(2);
          
          rowData.push(`"${emp.is_salary ? 'Salary' : 'Hourly'}"`);
          rowData.push(`"${emp.pay_rate}"`);
          rowData.push(`"${estPay}"`);

          csv += rowData.join(",") + "\n";
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Monthly_Payroll_Export_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Monthly CSV Downloaded!', 'success');
      });
    }

    usersData.forEach(u => {
      employeeMap[u.id] = { 
        id: u.id, name: u.name, 
        payroll_name: u.payroll_name, // Store payroll_name
        pay_rate: u.pay_rate || 0, // Store pay_rate
        is_salary: u.is_salary || false, // Store salary flag
        weekMs: [0, 0, 0, 0, 0, 0, 0], 
        lastWeekMs: 0, 
        week2Ms: 0,
        week3Ms: 0,
        week4Ms: 0,
        currentStatus: 'OUT', lastIn: null 
      };
    });

    logsData.forEach(log => {
      const emp = employeeMap[log.user_id];
      if (!emp) return;

      const time = new Date(log.created_at).getTime();

      if (log.action === 'IN' || log.action === 'END_LUNCH') {
        emp.currentStatus = 'IN';
        emp.lastIn = time;
      } else if (log.action === 'OUT' || log.action === 'START_LUNCH') {
        if (emp.currentStatus === 'IN' && emp.lastIn) {
          const duration = time - emp.lastIn;
          if (emp.lastIn >= startOfWeek) {
            const dayIndex = (new Date(emp.lastIn).getDay() + 6) % 7;
            emp.weekMs[dayIndex] += duration;
          } else if (emp.lastIn >= startOfLastWeek && emp.lastIn < startOfWeek) {
            emp.lastWeekMs += duration;
          } else if (emp.lastIn >= startOf2WeeksAgo && emp.lastIn < startOfLastWeek) {
            emp.week2Ms += duration;
          } else if (emp.lastIn >= startOf3WeeksAgo && emp.lastIn < startOf2WeeksAgo) {
            emp.week3Ms += duration;
          } else if (emp.lastIn >= startOf4WeeksAgo && emp.lastIn < startOf3WeeksAgo) {
            emp.week4Ms += duration;
          } else if (time >= startOfWeek) {
            emp.weekMs[0] += (time - startOfWeek);
          }
        }
        emp.currentStatus = log.action === 'START_LUNCH' ? 'LUNCH' : 'OUT';
        emp.lastIn = null;
      }
    });

    timesheetBody.innerHTML = '';
    if (biweeklyHistoryBody) biweeklyHistoryBody.innerHTML = '';
    if (monthlyArchiveBody) monthlyArchiveBody.innerHTML = '';
    let overtimeCount = 0;
    Object.values(employeeMap).forEach(emp => {
      if (emp.currentStatus === 'IN' && emp.lastIn) {
        const activeMs = Date.now() - emp.lastIn;
        if (emp.lastIn >= startOfWeek) {
          const dayIndex = (new Date(emp.lastIn).getDay() + 6) % 7;
          emp.weekMs[dayIndex] += activeMs;
        } else if (emp.lastIn >= startOfLastWeek && emp.lastIn < startOfWeek) {
          emp.lastWeekMs += activeMs;
        } else if (emp.lastIn >= startOf2WeeksAgo && emp.lastIn < startOfLastWeek) {
          emp.week2Ms += activeMs;
        } else if (emp.lastIn >= startOf3WeeksAgo && emp.lastIn < startOf2WeeksAgo) {
          emp.week3Ms += activeMs;
        } else if (emp.lastIn >= startOf4WeeksAgo && emp.lastIn < startOf3WeeksAgo) {
          emp.week4Ms += activeMs;
        } else {
          emp.weekMs[0] += (Date.now() - startOfWeek);
        }
      }

      const daysStr = emp.weekMs.map(ms => {
        const hrs = ms / (1000 * 60 * 60);
        return `<td>${hrs > 0 ? hrs.toFixed(1) : '-'}</td>`;
      }).join('');

      const totalWeekMs = emp.weekMs.reduce((sum, val) => sum + val, 0);
      const totalWeekHrsVal = totalWeekMs / (1000 * 60 * 60);
      const totalWeekHrs = totalWeekHrsVal.toFixed(2);
      const totalLastWeekHrs = (emp.lastWeekMs / (1000 * 60 * 60)).toFixed(2);

      let totalColor = 'var(--primary)';
      if (totalWeekHrsVal >= 40) {
        totalColor = 'var(--danger)';
        overtimeCount++;
      } else if (totalWeekHrsVal >= 36) {
        totalColor = 'var(--warning)';
        overtimeCount++;
      }

      let statusColor = 'var(--danger)';
      if (emp.currentStatus === 'IN') statusColor = 'var(--success)';
      if (emp.currentStatus === 'LUNCH') statusColor = 'var(--warning)';

      const tr = document.createElement('tr');
      const displayName = emp.payroll_name || emp.name;
      tr.innerHTML = `
        <td>${displayName}</td>
        <td><span style="color: ${statusColor}; font-weight: bold;">${emp.currentStatus}</span></td>
        ${daysStr}
        <td style="font-weight: bold; color: ${totalColor};">${totalWeekHrs}</td>
        <td style="color: var(--text-muted);">${totalLastWeekHrs}</td>
        <td><button class="btn-primary btn-manage-logs" data-id="${emp.id}" data-name="${displayName.replace(/"/g, '&quot;')}" style="padding: 5px 10px; font-size: 0.8rem; cursor: pointer; border-radius: 4px; border: none;">Manage</button></td>
      `;
      timesheetBody.appendChild(tr);

      if (biweeklyHistoryBody) {
        const biweeklyTotalHrs = (Number(totalWeekHrs) + Number(totalLastWeekHrs)).toFixed(2);
        const estBiweeklyPay = emp.is_salary ? emp.pay_rate.toFixed(2) : (biweeklyTotalHrs * emp.pay_rate).toFixed(2);
        const trBiweekly = document.createElement('tr');
        const displayName = emp.payroll_name || emp.name;
        trBiweekly.innerHTML = `
          <td>${displayName}</td>
          <td>${totalLastWeekHrs}</td>
          <td>${totalWeekHrs}</td>
          <td style="font-weight: bold; color: var(--primary);">${biweeklyTotalHrs}</td>
          <td style="font-weight: bold; color: var(--success);">$${estBiweeklyPay}${emp.is_salary ? ' <span style="font-size:0.7rem; color:var(--text-muted)">(Fixed)</span>' : ''}</td>
          <td><button class="btn-primary btn-manage-logs" data-id="${emp.id}" data-name="${displayName.replace(/"/g, '&quot;')}" style="padding: 5px 10px; font-size: 0.8rem; cursor: pointer; border-radius: 4px; border: none;">Manage</button></td>
        `;
        biweeklyHistoryBody.appendChild(trBiweekly);
      }

      if (monthlyArchiveBody) {
        const week2Hrs = (emp.week2Ms / (1000 * 60 * 60)).toFixed(2);
        const week3Hrs = (emp.week3Ms / (1000 * 60 * 60)).toFixed(2);
        const week4Hrs = (emp.week4Ms / (1000 * 60 * 60)).toFixed(2);
        const monthlyTotalHrs = (Number(totalWeekHrs) + Number(totalLastWeekHrs) + Number(week2Hrs) + Number(week3Hrs) + Number(week4Hrs)).toFixed(2);
        const estMonthlyPay = emp.is_salary ? emp.pay_rate.toFixed(2) : (monthlyTotalHrs * emp.pay_rate).toFixed(2);

        const trMonthly = document.createElement('tr');
        const displayName = emp.payroll_name || emp.name;
        trMonthly.innerHTML = `
          <td>${displayName}</td>
          <td>${week4Hrs}</td>
          <td>${week3Hrs}</td>
          <td>${week2Hrs}</td>
          <td>${totalLastWeekHrs}</td>
          <td>${totalWeekHrs}</td>
          <td style="font-weight: bold; color: var(--primary);">${monthlyTotalHrs}</td>
          <td style="font-weight: bold; color: var(--success);">$${estMonthlyPay}${emp.is_salary ? ' <span style="font-size:0.7rem; color:var(--text-muted)">(Fixed)</span>' : ''}</td>
          <td><button class="btn-primary btn-manage-logs" data-id="${emp.id}" data-name="${displayName.replace(/"/g, '&quot;')}" style="padding: 5px 10px; font-size: 0.8rem; cursor: pointer; border-radius: 4px; border: none;">Manage</button></td>
        `;
        monthlyArchiveBody.appendChild(trMonthly);
      }
    });

    // Update Overtime Badge
    const otBadge = document.getElementById('overtime-badge');
    if (otBadge) {
      if (overtimeCount > 0) {
        otBadge.textContent = overtimeCount;
        otBadge.classList.remove('hidden');
      } else {
        otBadge.classList.add('hidden');
      }
    }

    // Populate Pending Approvals
    pendingPinsBody.innerHTML = '';
    let hasPending = false;
    let pendingCount = 0;

    usersData.forEach(u => {
      // Account Approvals
      if (u.is_approved === false) {
        hasPending = true;
        pendingCount++;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.name}</td>
          <td><span style="color: var(--warning); font-weight: bold;">New Account (${u.role})</span></td>
          <td>PIN: ${u.pin}</td>
          <td>
            <button class="btn-success btn-approve-account" data-id="${u.id}" style="padding: 5px 10px; font-size: 0.8rem; border: none; border-radius: 4px; cursor: pointer;">Approve</button>
            <button class="btn-ghost btn-reject-account" data-id="${u.id}" style="padding: 5px 10px; font-size: 0.8rem; border: none; border-radius: 4px; cursor: pointer;">Reject</button>
          </td>
        `;
        pendingPinsBody.appendChild(tr);
      }

      // PIN Changes
      if (u.pending_pin) {
        hasPending = true;
        pendingCount++;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.name}</td>
          <td><span style="color: var(--primary); font-weight: bold;">PIN Change</span></td>
          <td>${u.pending_pin}</td>
          <td>
            <button class="btn-success btn-approve-pin" data-id="${u.id}" data-val="${u.pending_pin}" style="padding: 5px 10px; font-size: 0.8rem; border: none; border-radius: 4px; cursor: pointer;">Approve</button>
            <button class="btn-ghost btn-reject-pin" data-id="${u.id}" style="padding: 5px 10px; font-size: 0.8rem; border: none; border-radius: 4px; cursor: pointer;">Reject</button>
          </td>
        `;
        pendingPinsBody.appendChild(tr);
      }

      // Password Resets
      if (u.pending_password) {
        hasPending = true;
        pendingCount++;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.name}</td>
          <td><span style="color: var(--success); font-weight: bold;">Password Reset</span></td>
          <td>********</td>
          <td>
            <button class="btn-success btn-approve-pwd" data-id="${u.id}" data-val="${u.pending_password}" style="padding: 5px 10px; font-size: 0.8rem; border: none; border-radius: 4px; cursor: pointer;">Approve</button>
            <button class="btn-ghost btn-reject-pwd" data-id="${u.id}" style="padding: 5px 10px; font-size: 0.8rem; border: none; border-radius: 4px; cursor: pointer;">Reject</button>
          </td>
        `;
        pendingPinsBody.appendChild(tr);
      }
    });

    // Update Badge
    const badge = document.getElementById('approval-badge');
    if (badge) {
      if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (hasPending) {
      pendingPinsSection.classList.remove('hidden');
    } else {
      pendingPinsSection.classList.add('hidden');
    }

    // Fetch Time Off Requests
    const { data: timeoffData, error: timeoffError } = await window.supabaseClient.from('time_off_requests')
      .select('*')
      .eq('status', 'Pending');

    managerTimeoffBody.innerHTML = '';
    if (!timeoffError && timeoffData && timeoffData.length > 0) {
      pendingTimeoffSection.classList.remove('hidden');
      timeoffData.forEach(req => {
        pendingCount++; // add to approval badge
        if (badge) {
          badge.textContent = pendingCount;
          badge.classList.remove('hidden');
        }
        const empName = employeeMap[req.user_id] ? employeeMap[req.user_id].name : 'Unknown';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${empName}</td>
          <td>${req.start_date} to ${req.end_date}</td>
          <td>${req.reason}</td>
          <td>
            <button class="btn-success btn-approve-timeoff" data-id="${req.id}" style="padding: 5px 10px; font-size: 0.8rem; border: none; border-radius: 4px; cursor: pointer;">Approve</button>
            <button class="btn-danger btn-deny-timeoff" data-id="${req.id}" style="padding: 5px 10px; font-size: 0.8rem; border: none; border-radius: 4px; cursor: pointer;">Deny</button>
          </td>
        `;
        managerTimeoffBody.appendChild(tr);
      });
    } else {
      pendingTimeoffSection.classList.add('hidden');
    }

    if (managerAnalyticsSection && !managerAnalyticsSection.classList.contains('hidden')) {
      calculateAnalytics();
      initCharts();
    }

  } catch (err) {
    showToast('Error: ' + (err.message || 'Failed to load timesheets'), 'error');
  }
}

// --- Event Delegation for Dynamic Buttons ---
timesheetBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-manage-logs')) {
    window.openManageLogs(e.target.dataset.id, e.target.dataset.name);
  }
});

if (biweeklyHistoryBody) {
  biweeklyHistoryBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-manage-logs')) {
      window.openManageLogs(e.target.dataset.id, e.target.dataset.name);
    }
  });
}

if (monthlyArchiveBody) {
  monthlyArchiveBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-manage-logs')) {
      window.openManageLogs(e.target.dataset.id, e.target.dataset.name);
    }
  });
}

pendingPinsBody.addEventListener('click', async (e) => {
  if (e.target.classList.contains('btn-approve-pin')) {
    const id = e.target.dataset.id;
    const val = e.target.dataset.val;
    try {
      const { error } = await window.supabaseClient.from('users').update({ pin: val, pending_pin: null }).eq('id', id);
      if (error) throw error;
      showToast('PIN change approved');
      loadTimesheets();
    } catch (e) {
      showToast('Failed to approve PIN', 'error');
    }
  } else if (e.target.classList.contains('btn-reject-pin')) {
    const id = e.target.dataset.id;
    try {
      await window.supabaseClient.from('users').update({ pending_pin: null }).eq('id', id);
      showToast('PIN request rejected');
      loadTimesheets();
    } catch (e) { }
  } else if (e.target.classList.contains('btn-approve-pwd')) {
    const id = e.target.dataset.id;
    const val = e.target.dataset.val;
    try {
      await window.supabaseClient.from('users').update({ password: val, pending_password: null }).eq('id', id);
      showToast('Password reset approved!');
      loadTimesheets();
    } catch (e) {
      showToast('Failed to approve reset', 'error');
    }
  } else if (e.target.classList.contains('btn-reject-pwd')) {
    const id = e.target.dataset.id;
    try {
      await window.supabaseClient.from('users').update({ pending_password: null }).eq('id', id);
      showToast('Password reset rejected');
      loadTimesheets();
    } catch (e) { }
  } else if (e.target.classList.contains('btn-approve-account')) {
    const id = e.target.dataset.id;
    try {
      await window.supabaseClient.from('users').update({ is_approved: true }).eq('id', id);
      showToast('Account approved!');
      loadTimesheets();
    } catch (e) { }
  } else if (e.target.classList.contains('btn-reject-account')) {
    const id = e.target.dataset.id;
    try {
      await window.supabaseClient.from('users').delete().eq('id', id);
      showToast('Account request removed');
      loadTimesheets();
    } catch (e) { }
  }
});

// --- Manage Logs Logic ---
window.openManageLogs = async (userId, userName) => {
  selectedEmployeeForLogs = userId;
  const emp = employeeMap[userId];
  
  const editFirstName = document.getElementById('edit-employee-first-name');
  const editLastName = document.getElementById('edit-employee-last-name');
  const editLoginName = document.getElementById('edit-employee-login-name');
  const editPayRate = document.getElementById('edit-employee-pay-rate');
  const editIsSalary = document.getElementById('edit-employee-is-salary');
  
  if (editLoginName) editLoginName.value = emp ? emp.name : '';
  if (editPayRate) editPayRate.value = emp ? emp.pay_rate : '';
  if (editIsSalary) editIsSalary.checked = emp ? emp.is_salary : false;
  
  if (emp && emp.payroll_name && emp.payroll_name.includes(', ')) {
    const parts = emp.payroll_name.split(', ');
    if (editLastName) editLastName.value = parts[0] || '';
    if (editFirstName) editFirstName.value = parts[1] || '';
  } else {
    // Fallback if no payroll name or weird format
    if (editFirstName) editFirstName.value = emp ? emp.name : '';
    if (editLastName) editLastName.value = '';
  }
  
  manageLogsTitle.textContent = `Manage Logs: ${userName}`;
  modalManageLogs.classList.remove('hidden');
  await loadEmployeeLogs();
};

const btnSaveEmployeeDetails = document.getElementById('btn-save-employee-details');
if (btnSaveEmployeeDetails) {
  btnSaveEmployeeDetails.addEventListener('click', async () => {
    if (!selectedEmployeeForLogs) return;
    const firstName = document.getElementById('edit-employee-first-name').value.trim();
    const lastName = document.getElementById('edit-employee-last-name').value.trim();
    const loginName = document.getElementById('edit-employee-login-name').value.trim();
    const payRate = parseFloat(document.getElementById('edit-employee-pay-rate').value) || 0;
    const isSalary = document.getElementById('edit-employee-is-salary').checked;
    
    if (!firstName || !lastName || !loginName) {
      showToast('All fields are required', 'error');
      return;
    }
    
    const payrollName = `${lastName}, ${firstName}`;
    
    try {
      const { error } = await window.supabaseClient.from('users')
        .update({ 
          name: loginName,
          payroll_name: payrollName,
          pay_rate: payRate,
          is_salary: isSalary
        })
        .eq('id', selectedEmployeeForLogs);
        
      if (error) throw error;
      showToast('Employee details updated!', 'success');
      
      // Update local map
      if (employeeMap[selectedEmployeeForLogs]) {
        employeeMap[selectedEmployeeForLogs].name = loginName;
        employeeMap[selectedEmployeeForLogs].payroll_name = payrollName;
        employeeMap[selectedEmployeeForLogs].pay_rate = payRate;
        employeeMap[selectedEmployeeForLogs].is_salary = isSalary;
      }
      loadTimesheets();
    } catch (err) {
      showToast('Error updating details.', 'error');
    }
  });
}

btnCloseManage.addEventListener('click', () => {
  modalManageLogs.classList.add('hidden');
  selectedEmployeeForLogs = null;
  loadTimesheets(); // Refresh dashboard
});

btnDeleteEmployee.addEventListener('click', async () => {
  if (!selectedEmployeeForLogs) return;

  if (!confirm('Are you ABSOLUTELY sure you want to delete this employee? This will permanently remove them and all their time logs.')) return;

  try {
    // Delete time logs first to be safe, if cascade is not set
    await window.supabaseClient.from('time_logs').delete().eq('user_id', selectedEmployeeForLogs);

    // Delete the user
    const { error } = await window.supabaseClient.from('users').delete().eq('id', selectedEmployeeForLogs);

    if (error) throw error;

    showToast('Employee deleted successfully');
    modalManageLogs.classList.add('hidden');
    selectedEmployeeForLogs = null;
    loadTimesheets();
  } catch (err) {
    showToast('Failed to delete employee', 'error');
  }
});

async function loadEmployeeLogs() {
  if (!selectedEmployeeForLogs) return;
  try {
    const { data, error } = await window.supabaseClient
      .from('time_logs')
      .select('*')
      .eq('user_id', selectedEmployeeForLogs)
      .order('created_at', { ascending: false });

    if (error) throw error;

    manageLogsBody.innerHTML = '';
    data.forEach(log => {
      const tr = document.createElement('tr');
      const time = new Date(log.created_at).toLocaleString('en-US', { timeZone: 'America/Chicago' });

      let actionColor = 'var(--text)';
      if (log.action === 'IN' || log.action === 'CLOCK_IN') actionColor = 'var(--success)';
      if (log.action === 'OUT' || log.action === 'CLOCK_OUT') actionColor = 'var(--danger)';
      if (log.action === 'START_LUNCH') actionColor = 'var(--warning)';
      if (log.action === 'END_LUNCH') actionColor = 'var(--primary)';
      if (log.action === 'TIMESHEET_APPROVED') actionColor = '#00BCD4';

      const editedBy = log.edited_by_manager ? `<span style="font-size: 0.8rem; color: var(--warning);">✏️ ${log.edited_by_manager}</span>` : '-';

      const photoHtml = log.photo_base64
        ? `<img src="${log.photo_base64}" class="log-thumbnail" style="width: 40px; height: 40px; border-radius: 5px; object-fit: cover; cursor: pointer; border: 1px solid var(--border);" title="Click to view full photo"/>`
        : '<span style="color: var(--text-muted); font-size: 0.8rem;">No Photo</span>';

      tr.innerHTML = `
        <td>${photoHtml}</td>
        <td><span style="color: ${actionColor}; font-weight: bold;">${log.action.replace('_', ' ')}</span></td>
        <td>${time}</td>
        <td>${editedBy}</td>
        <td style="display: flex; gap: 5px;">
          <button class="btn-edit-log btn-ghost" data-id="${log.id}" data-action="${log.action}" data-time="${log.created_at}" style="padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border); font-size: 0.8rem; cursor: pointer;">Edit</button>
          <button class="btn-danger btn-delete-log" data-id="${log.id}" style="padding: 5px 10px; font-size: 0.8rem; border: none; cursor: pointer; border-radius: 4px;">Delete</button>
        </td>
      `;
      manageLogsBody.appendChild(tr);
    });

    // Attach photo viewers
    document.querySelectorAll('.log-thumbnail').forEach(img => {
      img.addEventListener('click', () => {
        const modal = document.getElementById('modal-view-photo');
        const fullImg = document.getElementById('full-size-photo');
        if (modal && fullImg) {
          fullImg.src = img.src;
          modal.classList.remove('hidden');
        }
      });
    });

    const btnClosePhoto = document.getElementById('btn-close-photo');
    if (btnClosePhoto) {
      btnClosePhoto.addEventListener('click', () => {
        document.getElementById('modal-view-photo').classList.add('hidden');
      });
    }
  } catch (err) {
    showToast('Error: ' + (err.message || 'Failed to load employee logs'), 'error');
  }
}

manageLogsBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-delete-log')) {
    window.deleteLog(e.target.dataset.id);
  } else if (e.target.classList.contains('btn-edit-log')) {
    currentEditingPunchId = e.target.dataset.id;
    editPunchAction.value = e.target.dataset.action;

    // Format UTC time for datetime-local
    const d = new Date(e.target.dataset.time);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d - tzOffset)).toISOString().slice(0, 16);
    editPunchDatetime.value = localISOTime;

    modalEditPunch.classList.remove('hidden');
  }
});

window.deleteLog = async (logId) => {
  if (!confirm('Are you sure you want to delete this punch?')) return;
  try {
    const { error } = await window.supabaseClient.from('time_logs').delete().eq('id', logId);
    if (error) throw error;
    showToast('Log deleted successfully');
    await loadEmployeeLogs();
  } catch (err) {
    showToast('Failed to delete log', 'error');
  }
};

if (btnCancelEditPunch) {
  btnCancelEditPunch.addEventListener('click', () => {
    modalEditPunch.classList.add('hidden');
    currentEditingPunchId = null;
  });
}

if (btnSaveEditPunch) {
  btnSaveEditPunch.addEventListener('click', async () => {
    if (!currentEditingPunchId) return;

    const localDate = new Date(editPunchDatetime.value);
    const utcDate = new Date(localDate.getTime()).toISOString();

    try {
      const { error } = await window.supabaseClient.from('time_logs')
        .update({
          action: editPunchAction.value,
          created_at: utcDate
        })
        .eq('id', currentEditingPunchId);

      if (error) throw error;
      showToast('Punch updated successfully!', 'success');
      modalEditPunch.classList.add('hidden');
      currentEditingPunchId = null;
      loadEmployeeLogs();
    } catch (err) {
      showToast('Failed to update punch', 'error');
    }
  });
}

btnAddLog.addEventListener('click', async () => {
  if (!selectedEmployeeForLogs) return;
  const action = newLogAction.value;
  const timeVal = newLogTime.value;
  if (!timeVal) {
    showToast('Please select a date and time', 'error');
    return;
  }

  // Convert local datetime-local value to Date object
  const logDate = new Date(timeVal);

  try {
    const { error } = await window.supabaseClient
      .from('time_logs')
      .insert([
        {
          user_id: selectedEmployeeForLogs,
          action: action,
          created_at: logDate.toISOString()
        }
      ]);

    if (error) throw error;
    showToast('Manual punch added');
    newLogTime.value = '';
    await loadEmployeeLogs();
  } catch (err) {
    showToast('Failed to add manual log', 'error');
  }
});

// --- Create User Logic ---
btnShowCreateUser.addEventListener('click', () => {
  modalCreateUser.classList.remove('hidden');
});

btnCancelCreate.addEventListener('click', () => {
  modalCreateUser.classList.add('hidden');
  if (newUserFirstName) newUserFirstName.value = '';
  if (newUserLastName) newUserLastName.value = '';
  if (newUserLoginName) newUserLoginName.value = '';
  newUserPin.value = '';
  newUserPassword.value = '';
});

btnConfirmCreate.addEventListener('click', async () => {
  const firstName = newUserFirstName.value.trim();
  const lastName = newUserLastName.value.trim();
  const name = newUserLoginName.value.trim();
  const pin = newUserPin.value;
  const role = document.querySelector('input[name="new-user-role"]:checked').value;
  const password = newUserPassword.value;

  if (!firstName || !lastName || !name || pin.length !== 4) {
    showToast('Please fill in all fields (First Name, Last Name, Username) and enter a 4-digit PIN', 'error');
    return;
  }
  if (role === 'Manager' && !password) {
    showToast('Managers must have a dashboard password', 'error');
    return;
  }

  const payrollName = `${lastName}, ${firstName}`;

  try {
    // Check if PIN already exists
    const { data: existing } = await window.supabaseClient
      .from('users')
      .select('id')
      .eq('pin', pin)
      .single();

    if (existing) {
      showToast('PIN is already in use.', 'error');
      return;
    }

    const { error } = await window.supabaseClient
      .from('users')
      .insert([{ 
        name, 
        payroll_name: payrollName,
        pin, 
        role, 
        password: role === 'Manager' ? password : null, 
        is_approved: false 
      }]);

    if (error) throw error;

    showToast(`Account request for ${firstName} ${lastName} submitted for approval.`);
    if (newUserFirstName) newUserFirstName.value = '';
    if (newUserLastName) newUserLastName.value = '';
    if (newUserLoginName) newUserLoginName.value = '';
    newUserPin.value = '';
    newUserPassword.value = '';
    modalCreateUser.classList.add('hidden');
    loadTimesheets();
  } catch (err) {
    showToast('Failed to create user. Make sure "payroll_name" column exists.', 'error');
  }
});

// --- Announcements Logic ---
async function fetchSettings() {
  try {
    const { data: announcementData, error: aError } = await window.supabaseClient
      .from('settings')
      .select('value')
      .eq('id', 'announcement')
      .limit(1);
    if (!aError && announcementData && announcementData.length > 0) {
      activeAnnouncement = announcementData[0].value;
      if (announcementInput) announcementInput.value = announcementData[0].value;
    }
  } catch (e) { }

  try {
    // Fetch radius
    const { data: geoData, error: gError } = await window.supabaseClient.from('settings').select('value').eq('id', 'geofence_radius').limit(1);
    if (!gError && geoData && geoData.length > 0) {
      ALLOWED_RADIUS_METERS = parseInt(geoData[0].value, 10);
    }
    if (geofenceInput) geofenceInput.value = ALLOWED_RADIUS_METERS;

    // Fetch coordinates
    const { data: latData, error: latError } = await window.supabaseClient.from('settings').select('value').eq('id', 'geofence_lat').limit(1);
    if (!latError && latData && latData.length > 0) {
      CAR_WASH_LAT = parseFloat(latData[0].value);
    }
    if (geofenceLatInput) geofenceLatInput.value = CAR_WASH_LAT;

    const { data: lonData, error: lonError } = await window.supabaseClient.from('settings').select('value').eq('id', 'geofence_lon').limit(1);
    if (!lonError && lonData && lonData.length > 0) {
      CAR_WASH_LON = parseFloat(lonData[0].value);
    }
    if (geofenceLonInput) geofenceLonInput.value = CAR_WASH_LON;

    // Fetch enabled status
    const { data: enabledData, error: enabledError } = await window.supabaseClient.from('settings').select('value').eq('id', 'geofence_enabled').limit(1);
    if (!enabledError && enabledData && enabledData.length > 0) {
      GEOFENCE_ENABLED = enabledData[0].value === 'true';
    }
    updateGeofenceUI();

    // Fetch Anti-Buddy
    const { data: abData, error: abError } = await window.supabaseClient.from('settings').select('value').eq('id', 'anti_buddy_enabled').limit(1);
    if (!abError && abData && abData.length > 0) {
      ANTI_BUDDY_ENABLED = abData[0].value === 'true';
    }
    updateAntiBuddyUI();

    // Fetch Revenue & Goals
    const { data: revData } = await window.supabaseClient.from('settings').select('value').eq('id', 'daily_revenue_goal').limit(1);
    if (revData && revData.length > 0) {
      dailyRevenueGoal = parseFloat(revData[0].value) || 0;
      if (dailyRevenueInput) dailyRevenueInput.value = dailyRevenueGoal;
    }
    const { data: goalData } = await window.supabaseClient.from('settings').select('value').eq('id', 'labor_cost_goal_percent').limit(1);
    if (goalData && goalData.length > 0) {
      laborCostGoalPercent = parseFloat(goalData[0].value) || 25;
      if (laborGoalInput) laborGoalInput.value = laborCostGoalPercent;
    }

  } catch (e) { }

  loadWeather(); // Load weather based on coordinates
}
fetchSettings();

async function saveSettingRobust(key, value) {
  try {
    const { data, error: updateErr } = await window.supabaseClient.from('settings').update({ value: value }).eq('id', key).select();
    if (!updateErr && data && data.length > 0) return true;

    // We didn't update any rows, so we either delete the old broken ones or just insert
    // Supabase will throw error if no RLS policy allows delete or insert
    const delRes = await window.supabaseClient.from('settings').delete().eq('id', key);
    if (delRes.error) console.warn("Delete warn:", delRes.error);

    const { error: insertErr } = await window.supabaseClient.from('settings').insert({ id: key, value: value });
    if (insertErr) throw insertErr;
    return true;
  } catch (e) {
    console.error('Failed to save setting:', e);
    throw e;
  }
}

btnPostAnnouncement.addEventListener('click', async () => {
  const msg = announcementInput.value.trim();
  if (!msg) return;
  try {
    await saveSettingRobust('announcement', msg);
    activeAnnouncement = msg;
    showToast('Announcement posted successfully!', 'success');
  } catch (e) {
    showToast('Failed to post. (Does "settings" table exist?)', 'error');
  }
});

btnClearAnnouncement.addEventListener('click', async () => {
  try {
    await saveSettingRobust('announcement', '');
    activeAnnouncement = '';
    announcementInput.value = '';
    showToast('Announcement cleared!', 'success');
  } catch (e) {
    showToast('Failed to clear announcement.', 'error');
  }
});

if (btnSaveGeofence) {
  btnSaveGeofence.addEventListener('click', async () => {
    const radius = parseInt(geofenceInput.value, 10);
    const lat = parseFloat(geofenceLatInput.value);
    const lon = parseFloat(geofenceLonInput.value);

    if (isNaN(radius) || radius <= 0 || isNaN(lat) || isNaN(lon)) {
      showToast('Please enter valid numbers for Radius, Latitude, and Longitude.', 'error');
      return;
    }
    try {
      await saveSettingRobust('geofence_radius', radius.toString());
      await saveSettingRobust('geofence_lat', lat.toString());
      await saveSettingRobust('geofence_lon', lon.toString());
      ALLOWED_RADIUS_METERS = radius;
      CAR_WASH_LAT = lat;
      CAR_WASH_LON = lon;

      showToast(`Geofence settings updated!`, 'success');
      loadWeather(); // Refresh weather for new location
    } catch (err) {
      showToast('Error: ' + (err.message || 'Check database table and RLS policies.'), 'error');
    }
  });
}

function updateGeofenceUI() {
  if (!btnToggleGeofence || !geofenceStatusText) return;
  if (GEOFENCE_ENABLED) {
    geofenceStatusText.textContent = 'Enabled';
    geofenceStatusText.style.color = 'var(--success)';
    btnToggleGeofence.textContent = 'Disable';
    btnToggleGeofence.className = 'btn-danger';
  } else {
    geofenceStatusText.textContent = 'Disabled';
    geofenceStatusText.style.color = 'var(--text-muted)';
    btnToggleGeofence.textContent = 'Enable';
    btnToggleGeofence.className = 'btn-success';
  }
}

const btnToggleAntiBuddy = document.getElementById('btn-toggle-anti-buddy');
const antiBuddyStatusText = document.getElementById('anti-buddy-status-text');

function updateAntiBuddyUI() {
  if (!btnToggleAntiBuddy || !antiBuddyStatusText) return;
  if (ANTI_BUDDY_ENABLED) {
    antiBuddyStatusText.textContent = 'Enabled';
    antiBuddyStatusText.style.color = 'var(--success)';
    btnToggleAntiBuddy.textContent = 'Disable';
    btnToggleAntiBuddy.className = 'btn-danger';
  } else {
    antiBuddyStatusText.textContent = 'Disabled';
    antiBuddyStatusText.style.color = 'var(--text-muted)';
    btnToggleAntiBuddy.textContent = 'Enable';
    btnToggleAntiBuddy.className = 'btn-success';
  }
}

if (btnToggleAntiBuddy) {
  btnToggleAntiBuddy.addEventListener('click', async () => {
    const newState = !ANTI_BUDDY_ENABLED;
    try {
      await saveSettingRobust('anti_buddy_enabled', newState.toString());
      ANTI_BUDDY_ENABLED = newState;
      updateAntiBuddyUI();
      showToast(`Anti-Buddy Verification is now ${newState ? 'Enabled' : 'Disabled'}`, 'success');
    } catch (e) {
      showToast('Error: ' + (e.message || 'Failed to toggle Anti-Buddy.'), 'error');
    }
  });
}

if (btnToggleGeofence) {
  btnToggleGeofence.addEventListener('click', async () => {
    const newState = !GEOFENCE_ENABLED;
    try {
      await saveSettingRobust('geofence_enabled', newState.toString());
      GEOFENCE_ENABLED = newState;
      updateGeofenceUI();
      showToast(`Geofence is now ${newState ? 'Enabled' : 'Disabled'}`, 'success');
    } catch (e) {
      showToast('Failed to toggle geofence', 'error');
    }
  });
}

const btnGetCurrentLocation = document.getElementById('btn-get-current-location');
if (btnGetCurrentLocation) {
  btnGetCurrentLocation.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported by browser.', 'error');
      return;
    }
    showToast('Fetching your location...', 'success');
    navigator.geolocation.getCurrentPosition(pos => {
      if (geofenceLatInput) geofenceLatInput.value = pos.coords.latitude;
      if (geofenceLonInput) geofenceLonInput.value = pos.coords.longitude;
      showToast('Coordinates populated! Click Save Settings to apply.', 'success');
    }, err => {
      showToast('Failed to get location. Check permissions.', 'error');
    }, { enableHighAccuracy: true });
  });
}

// --- Edit Payroll Format Logic ---
const btnEditPayrollFormat = document.getElementById('btn-edit-payroll-format');
const modalEditPayrollFormat = document.getElementById('modal-edit-payroll-format');
const btnCancelPayrollFormat = document.getElementById('btn-cancel-payroll-format');
const btnSavePayrollFormat = document.getElementById('btn-save-payroll-format');
const customCurrentFormatInput = document.getElementById('custom-current-format');
const customNextFormatInput = document.getElementById('custom-next-format');

let customPayrollFormat = { current: '', next: '' };

async function loadCustomPayrollFormat() {
  try {
    const { data, error } = await window.supabaseClient.from('settings').select('value').eq('id', 'custom_payroll_format').limit(1);
    if (!error && data && data.length > 0) {
      customPayrollFormat = JSON.parse(data[0].value);
      if (customCurrentFormatInput) customCurrentFormatInput.value = customPayrollFormat.current || '';
      if (customNextFormatInput) customNextFormatInput.value = customPayrollFormat.next || '';
    }
  } catch (e) { }
}
loadCustomPayrollFormat();

if (btnEditPayrollFormat) {
  btnEditPayrollFormat.addEventListener('click', () => {
    modalEditPayrollFormat.classList.remove('hidden');
  });
}

if (btnCancelPayrollFormat) {
  btnCancelPayrollFormat.addEventListener('click', () => {
    modalEditPayrollFormat.classList.add('hidden');
  });
}

if (btnSavePayrollFormat) {
  btnSavePayrollFormat.addEventListener('click', async () => {
    customPayrollFormat.current = customCurrentFormatInput.value.trim();
    customPayrollFormat.next = customNextFormatInput.value.trim();

    try {
      const val = JSON.stringify(customPayrollFormat);
      const { data, error: updateErr } = await window.supabaseClient.from('settings').update({ value: val }).eq('id', 'custom_payroll_format').select();
      if (updateErr || !data || data.length === 0) {
        await window.supabaseClient.from('settings').delete().eq('id', 'custom_payroll_format');
        await window.supabaseClient.from('settings').insert({ id: 'custom_payroll_format', value: val });
      }
      showToast('Payroll format saved!', 'success');
      modalEditPayrollFormat.classList.add('hidden');
    } catch (e) {
      showToast('Failed to save payroll format', 'error');
    }
  });
}

// --- Export Payroll Logic ---
const btnDownloadPayroll = document.getElementById('btn-download-payroll');
if (btnDownloadPayroll) {
  btnDownloadPayroll.addEventListener('click', async () => {
    try {
      showToast('Generating Payroll CSV...', 'success');
      const { data: usersData, error: usersError } = await window.supabaseClient.from('users').select('*');
      const { data: logsData, error: logsError } = await window.supabaseClient.from('time_logs').select('*').order('created_at', { ascending: true });

      if (usersError || logsError) throw new Error('Fetch failed');

      const startOfWeek = getStartOfWeek().getTime();
      const startOfLastWeek = startOfWeek - (7 * 24 * 60 * 60 * 1000);

      const employeeMap = {};
      usersData.forEach(u => {
        employeeMap[u.id] = { name: u.name, thisWeekMs: 0, lastWeekMs: 0, currentStatus: 'OUT', lastIn: null };
      });

      logsData.forEach(log => {
        const emp = employeeMap[log.user_id];
        if (!emp) return;

        const time = new Date(log.created_at).getTime();

        if (log.action === 'IN' || log.action === 'END_LUNCH') {
          emp.currentStatus = 'IN';
          emp.lastIn = time;
        } else if (log.action === 'OUT' || log.action === 'START_LUNCH') {
          if (emp.currentStatus === 'IN' && emp.lastIn) {
            const duration = time - emp.lastIn;
            if (emp.lastIn >= startOfWeek) {
              emp.thisWeekMs += duration;
            } else if (emp.lastIn >= startOfLastWeek && emp.lastIn < startOfWeek) {
              emp.lastWeekMs += duration;
            }
          }
          emp.currentStatus = log.action === 'START_LUNCH' ? 'LUNCH' : 'OUT';
          emp.lastIn = null;
        }
      });

      // Handle active clocks
      Object.values(employeeMap).forEach(emp => {
        if (emp.currentStatus === 'IN' && emp.lastIn) {
          const activeMs = Date.now() - emp.lastIn;
          if (emp.lastIn >= startOfWeek) {
            emp.thisWeekMs += activeMs;
          } else if (emp.lastIn >= startOfLastWeek && emp.lastIn < startOfWeek) {
            emp.lastWeekMs += activeMs;
          }
        }
      });

      // Generate CSV
      const formatDate = (dateObj) => {
        return `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear().toString().slice(-2)}`;
      };

      const currentStart = new Date(startOfWeek);
      const currentEnd = new Date(startOfWeek);
      currentEnd.setDate(currentStart.getDate() + 6);

      const nextStart = new Date(startOfWeek);
      nextStart.setDate(nextStart.getDate() + 7);
      const nextEnd = new Date(nextStart);
      nextEnd.setDate(nextStart.getDate() + 6);

      let currentLabel = `${formatDate(currentStart)} - ${formatDate(currentEnd)}`;
      let nextLabel = `${formatDate(nextStart)} - ${formatDate(nextEnd)}`;

      if (customPayrollFormat.current) currentLabel = customPayrollFormat.current;
      if (customPayrollFormat.next) nextLabel = customPayrollFormat.next;

      let csvContent = `#,Employee Name,${currentLabel},${nextLabel}\n`;
      let count = 1;
      Object.values(employeeMap).forEach(emp => {
        const twHrsVal = (emp.thisWeekMs / (1000 * 60 * 60));
        // Skip 0 hours
        if (twHrsVal === 0) return;

        const twHrs = twHrsVal.toFixed(2);
        const formattedName = formatNameLastFirst(emp.name);
        csvContent += `"${count++}","${formattedName}",${twHrs},0.00\n`;
      });

      // Download it
      let safeFilenameSuffix = currentLabel.replace(/[\/\\]/g, '-').replace(/\s*-\s*/g, '_').replace(/\s+/g, '_');
      safeFilenameSuffix = safeFilenameSuffix.replace(/[^a-zA-Z0-9_-]/g, '');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Payroll_Export_${safeFilenameSuffix}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      showToast('Error exporting payroll', 'error');
    }
  });
}

// --- Midnight Sweep (Auto-Clock Out) ---
async function performMidnightSweep() {
  try {
    const { data: users, error: uErr } = await window.supabaseClient.from('users').select('id');
    if (uErr || !users) return;

    for (const u of users) {
      const { data: latestLog, error: logErr } = await window.supabaseClient.from('time_logs')
        .select('*')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!logErr && latestLog && latestLog.length > 0) {
        const log = latestLog[0];
        if (log.action === 'IN' || log.action === 'START_LUNCH') {
          const logDate = new Date(log.created_at);
          const now = new Date();

          if (logDate.toLocaleDateString() !== now.toLocaleDateString()) {
            const autoOutDate = new Date(logDate);
            autoOutDate.setHours(23, 59, 59, 999);

            await window.supabaseClient.from('time_logs').insert({
              user_id: u.id,
              action: 'OUT',
              created_at: autoOutDate.toISOString(),
              edited_by_manager: 'System Auto-Sweep'
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Sweep failed:', e);
  }
}

// Run sweep every hour
setInterval(performMidnightSweep, 3600000);
performMidnightSweep();


// --- Schedule Logic ---
async function loadSchedules() {
  try {
    const { data: rawData, error } = await window.supabaseClient.from('schedules').select('*');
    if (error) throw error;

    // Sort by actual week start date
    const data = rawData.sort((a, b) => {
      const getStartDate = (sched) => {
        try {
          const content = JSON.parse(sched.content);
          const range = content.weekRange || '';
          const match = range.match(/(\d+)\/(\d+)/);
          if (match) {
            const m = parseInt(match[1]) - 1;
            const d = parseInt(match[2]);
            const year = new Date(sched.created_at).getFullYear();
            return new Date(year, m, d);
          }
        } catch (e) {}
        return new Date(sched.created_at); // Fallback
      };
      return getStartDate(a) - getStartDate(b); // Oldest to Newest (Calendar Order)
    });

    const scheduleSelector = document.getElementById('schedule-selector');
    if (scheduleSelector) scheduleSelector.innerHTML = '';
    scheduleList.innerHTML = '';

    if (!data || data.length === 0) {
      scheduleList.innerHTML = '<div style="background: var(--card); padding: 30px; border-radius: 15px; text-align: center; color: var(--text-muted);">No schedules posted yet.</div>';
      return;
    }

    data.forEach((sched, index) => {
      const parsed = JSON.parse(sched.content);
      const weekRange = parsed.weekRange || 'Weekly Schedule';
      
      // Add Selector Button
      if (scheduleSelector) {
        const btn = document.createElement('button');
        btn.className = 'btn-ghost';
        btn.style = 'padding: 8px 15px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;';
        btn.textContent = weekRange;
        btn.onclick = () => {
          // Hide all cards
          document.querySelectorAll('.schedule-card').forEach(card => card.classList.add('hidden'));
          
          // Show target card
          const target = document.getElementById(`schedule-card-${sched.id}`);
          if (target) target.classList.remove('hidden');
          
          // Highlight active button
          Array.from(scheduleSelector.children).forEach(b => {
            b.style.borderColor = 'var(--border)';
            b.style.background = 'none';
          });
          btn.style.borderColor = 'var(--primary)';
          btn.style.background = 'rgba(169, 59, 47, 0.1)';
        };
        scheduleSelector.appendChild(btn);
        
        // Initial highlight for the most recent one (last in ASC sort)
        if (index === data.length - 1) {
          btn.style.borderColor = 'var(--primary)';
          btn.style.background = 'rgba(169, 59, 47, 0.1)';
        }
      }

      const div = document.createElement('div');
      div.id = `schedule-card-${sched.id}`;
      div.className = 'schedule-card' + (index === data.length - 1 ? '' : ' hidden');
      div.style = 'background: var(--card); padding: 20px; border-radius: 12px; border: 1px solid var(--border); overflow-x: auto; margin-bottom: 20px;';
      const time = new Date(sched.created_at).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

      let contentHtml = '';
      try {
        const parsed = JSON.parse(sched.content);
        const headersHtml = parsed.headers.map(h => `<th>${h}</th>`).join('');
        const rowsHtml = parsed.rows.map(r => {
          // Check if employee has any entered shifts (not just '-' or empty)
          const hasShifts = r.shifts.some(s => s && s !== '-' && s.trim() !== '');
          if (!hasShifts) return ''; // Skip this employee if they have no entry for the week

          let rowTotal = 0;
          const cellsHtml = r.shifts.map(s => {
            rowTotal += parseShiftHours(s);
            return `<td style="text-align: center;">${s}</td>`;
          }).join('');

          // Encode the row data for the calendar generator
          const rowData = encodeURIComponent(JSON.stringify({
            employee: r.employee,
            shifts: r.shifts,
            weekRange: parsed.weekRange,
            headers: parsed.headers
          }));

          return `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <strong>${r.employee}</strong>
                    <div style="display: flex; gap: 5px; align-items: center;">
                      <button onclick="downloadCalendar('${rowData}')" style="background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 2px;" title="Add to Calendar">📅</button>
                      ${(currentPortalEmployee && r.employee.toLowerCase().includes(currentPortalEmployee.name.toLowerCase().split(' ')[0])) 
                        ? `<button class="btn-request-swap btn-ghost" data-employee="${r.employee}" data-week="${parsed.weekRange}" style="padding: 2px 5px; font-size: 0.7rem; border: 1px solid var(--border); border-radius: 4px;">Request Swap</button>` 
                        : ''}
                    </div>
                  </div>
                </td>
                ${cellsHtml}
                <td style="text-align: center; font-weight: bold; background: rgba(169, 59, 47, 0.05);">${rowTotal.toFixed(1)}</td>
              </tr>
            `;
        }).join('');

        contentHtml = `
          <h4 style="margin-bottom: 15px; color: var(--primary);">${parsed.weekRange || 'Weekly Schedule'}</h4>
          <table class="data-table" style="min-width: 800px;">
            <thead>
              <tr>
                <th>Employee</th>
                ${headersHtml}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `;
      } catch (err) {
        // Fallback for old plain text schedules
        contentHtml = `<div style="white-space: pre-wrap; line-height: 1.5;">${sched.content}</div>`;
      }

      div.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <span>Posted on ${time}</span>
          <div>
            ${managerLoggedIn ? `<button class="btn-primary btn-edit-schedule" data-id="${sched.id}" data-content="${encodeURIComponent(sched.content)}" style="padding: 5px 10px; font-size: 0.8rem; border: none; border-radius: 4px; cursor: pointer; margin-right: 5px;">Edit</button>` : ''}
            ${managerLoggedIn ? `<button class="btn-danger btn-delete-schedule" data-id="${sched.id}" style="padding: 5px 10px; font-size: 0.8rem; border: none; border-radius: 4px; cursor: pointer;">Delete</button>` : ''}
          </div>
        </div>
        ${contentHtml}
      `;
      scheduleList.appendChild(div);
    });
  } catch (e) {
    scheduleList.innerHTML = '<div style="background: var(--card); padding: 30px; border-radius: 15px; text-align: center; color: var(--danger);">Failed to load schedules. The "schedules" table might not exist in Supabase.</div>';
  }
}

const btnPrintSchedule = document.getElementById('btn-print-schedule');
if (btnPrintSchedule) {
  btnPrintSchedule.addEventListener('click', () => {
    window.print();
  });
}

btnShowPostSchedule.addEventListener('click', async () => {
  editingScheduleId = null;
  btnSubmitSchedule.textContent = 'Post Schedule';
  scheduleWeekRange.value = '';

  postScheduleSection.classList.toggle('hidden');
  if (!postScheduleSection.classList.contains('hidden')) {
    // Populate employees for editing
    try {
      const { data: users } = await window.supabaseClient
        .from('users')
        .select('name')
        .eq('is_approved', true) // Only active/approved employees
        .order('name', { ascending: true });

      scheduleEditorBody.innerHTML = '';
      if (users) {
        users.forEach(u => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${u.name}</strong></td>
            <td><input type="text" class="input-field sched-cell" placeholder="-" style="padding: 5px; text-align: center; margin-bottom: 0;"></td>
            <td><input type="text" class="input-field sched-cell" placeholder="-" style="padding: 5px; text-align: center; margin-bottom: 0;"></td>
            <td><input type="text" class="input-field sched-cell" placeholder="-" style="padding: 5px; text-align: center; margin-bottom: 0;"></td>
            <td><input type="text" class="input-field sched-cell" placeholder="-" style="padding: 5px; text-align: center; margin-bottom: 0;"></td>
            <td><input type="text" class="input-field sched-cell" placeholder="-" style="padding: 5px; text-align: center; margin-bottom: 0;"></td>
            <td><input type="text" class="input-field sched-cell" placeholder="-" style="padding: 5px; text-align: center; margin-bottom: 0;"></td>
            <td><input type="text" class="input-field sched-cell" placeholder="-" style="padding: 5px; text-align: center; margin-bottom: 0;"></td>
            <td style="text-align: center; font-weight: bold;">-</td>
          `;
          scheduleEditorBody.appendChild(tr);
        });
      }

      // Reset headers
      scheduleHeaderInputs.forEach((inp, idx) => {
        const days = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];
        inp.value = days[idx];
      });
    } catch (e) { }
  }
});

// --- Auto-populate dates in headers ---
scheduleWeekRange.addEventListener('input', () => {
  const val = scheduleWeekRange.value.trim();
  if (!val) return;

  try {
    // Try to extract the first date (e.g. "4/28" from "4/28 - 5/4")
    const match = val.match(/(\d+)\/(\d+)/);
    if (!match) return;

    const m = parseInt(match[1]) - 1;
    const d = parseInt(match[2]);
    const year = new Date().getFullYear();

    const startDate = new Date(year, m, d);
    if (isNaN(startDate.getTime())) return;

    const days = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];

    scheduleHeaderInputs.forEach((inp, idx) => {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + idx);

      const dayName = days[idx];
      const monthDay = `${current.getMonth() + 1}/${current.getDate()}`;
      inp.value = `${dayName} ${monthDay}`;
    });
  } catch (e) { }
});

btnSubmitSchedule.addEventListener('click', async () => {
  btnSubmitSchedule.disabled = true;
  btnSubmitSchedule.style.opacity = '0.5';

  const weekRange = scheduleWeekRange.value.trim() || 'Weekly Schedule';

  const headers = Array.from(document.querySelectorAll('.schedule-header-input')).map(inp => inp.value || '-');
  const rows = [];

  const trs = scheduleEditorBody.querySelectorAll('tr');
  trs.forEach(tr => {
    const employee = tr.querySelector('td strong').innerText;
    const shiftInputs = tr.querySelectorAll('.sched-cell');
    const shifts = Array.from(shiftInputs).map(inp => inp.value || '-');
    rows.push({ employee, shifts });
  });

  const scheduleData = { weekRange, headers, rows };

  // --- Conflict Detection ---
  try {
    const { data: timeoffs } = await window.supabaseClient.from('time_off_requests').select('*').eq('status', 'Approved');
    const conflicts = [];
    
    rows.forEach(row => {
      // Find employee in employeeMap
      const emp = Object.values(employeeMap).find(e => 
        e.name.toLowerCase() === row.employee.toLowerCase() || 
        (e.payroll_name && e.payroll_name.toLowerCase() === row.employee.toLowerCase())
      );
      
      if (emp) {
        const empTimeoffs = timeoffs.filter(to => to.user_id === emp.id);
        if (empTimeoffs.length > 0) {
          const hasShifts = row.shifts.some(s => s && s !== '-' && s.trim() !== '');
          if (hasShifts) {
            conflicts.push(row.employee);
          }
        }
      }
    });

    if (conflicts.length > 0) {
      if (!confirm(`Warning: The following employees have approved time-off requests: ${conflicts.join(', ')}. Proceed?`)) {
        btnSubmitSchedule.disabled = false;
        btnSubmitSchedule.style.opacity = '1';
        return;
      }
    }
  } catch (e) { }

  try {
    let error;
    if (editingScheduleId) {
      const res = await window.supabaseClient.from('schedules').update({ content: JSON.stringify(scheduleData) }).eq('id', editingScheduleId);
      error = res.error;
    } else {
      const res = await window.supabaseClient.from('schedules').insert([{ content: JSON.stringify(scheduleData) }]);
      error = res.error;
    }

    if (error) throw error;
    showToast(editingScheduleId ? 'Schedule updated!' : 'Schedule posted!');
    editingScheduleId = null;
    postScheduleSection.classList.add('hidden');
    loadSchedules();
  } catch (err) {
    showToast('Failed to save schedule.', 'error');
  } finally {
    btnSubmitSchedule.disabled = false;
    btnSubmitSchedule.style.opacity = '1';
  }
});

if (aiFab) {
  aiFab.addEventListener('click', () => {
    aiChatPanel.classList.toggle('hidden');
  });
  btnCloseAi.addEventListener('click', () => {
    aiChatPanel.classList.add('hidden');
  });

  // Image Upload Handlers
  btnUploadAi.addEventListener('click', () => {
    aiChatFile.click();
  });

  aiChatFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target.result;
        const [meta, base64] = result.split(',');
        aiSelectedImageMime = meta.match(/:(.*?);/)[1];
        aiSelectedImageBase64 = base64;

        aiImagePreviewName.textContent = file.name;
        aiImagePreviewContainer.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  btnRemoveAiImage.addEventListener('click', () => {
    aiSelectedImageBase64 = null;
    aiSelectedImageMime = null;
    aiChatFile.value = '';
    aiImagePreviewContainer.classList.add('hidden');
  });

  async function sendAiMessage(message) {
    const userMsg = document.createElement('div');
    userMsg.style = "background: var(--primary); padding: 10px; border-radius: 10px; color: white; align-self: flex-end; max-width: 85%; line-height: 1.4;";

    if (aiSelectedImageBase64) {
      userMsg.innerHTML = `<img src="data:${aiSelectedImageMime};base64,${aiSelectedImageBase64}" style="max-width: 100%; border-radius: 5px; margin-bottom: 5px;" /><br>` + message;
    } else {
      userMsg.textContent = message;
    }

    aiChatHistory.appendChild(userMsg);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;

    const typingMsg = document.createElement('div');
    typingMsg.style = "background: rgba(142, 68, 173, 0.1); border: 1px solid rgba(142, 68, 173, 0.3); padding: 10px; border-radius: 10px; color: var(--text-muted); align-self: flex-start; max-width: 85%; line-height: 1.4;";
    typingMsg.innerHTML = "<i>Thinking...</i>";
    aiChatHistory.appendChild(typingMsg);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;

    // Grab key & Context
    const apiKey = localStorage.getItem('gemini_api_key') || 'AIzaSyAqMshZjG5cWnnn8DpfzJvGJQyFec9rnsY';
    let context = "";
    if (postScheduleSection && !postScheduleSection.classList.contains('hidden')) {
      const headers = Array.from(document.querySelectorAll('.schedule-header-input')).map(inp => inp.value || '-');
      const employees = [];
      document.querySelectorAll('#schedule-editor-body tr').forEach(tr => {
        employees.push(tr.querySelector('td strong').innerText);
      });
      context = `CURRENT UI CONTEXT: The manager is viewing the Schedule Editor. Employees: ${employees.join(', ')}. Days: ${headers.join(', ')}. If asked to generate a schedule, return a JSON block in \`\`\`json format like [{"employee": "Name", "shifts": ["8:00-4:00", "-", "9:00-5:00", "9:00-5:00", "8:00-4:00", "-", "-"]}]. Give 30-40 hours total, 2 days off ("-").`;
    }

    const promptText = `You are a helpful AI assistant for Longhorn Car Wash.\n${context}\n\nUser says: ${message}`;

    // Prepare API Payload
    let parts = [{ text: promptText }];
    if (aiSelectedImageBase64) {
      parts.push({
        inline_data: {
          mime_type: aiSelectedImageMime,
          data: aiSelectedImageBase64
        }
      });
    }

    const currentImageBase64 = aiSelectedImageBase64; // preserve in case they remove it while sending

    // Clear attachment after sending
    btnRemoveAiImage.click();

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: parts }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      let aiText = data.candidates[0].content.parts[0].text;

      const jsonMatch = aiText.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          const trs = document.querySelectorAll('#schedule-editor-body tr');
          trs.forEach(tr => {
            const empName = tr.querySelector('td strong').innerText;
            const empData = parsed.find(s => s.employee === empName);
            if (empData && empData.shifts) {
              const shiftInputs = tr.querySelectorAll('.sched-cell');
              shiftInputs.forEach((inp, idx) => {
                if (empData.shifts[idx]) inp.value = empData.shifts[idx];
              });
            }
          });
          aiText = aiText.replace(/\`\`\`json\n[\s\S]*?\n\`\`\`/, "✅ I've populated the schedule editor for you.");
        } catch (e) { }
      }

      typingMsg.innerHTML = aiText.replace(/\n/g, '<br>');
      typingMsg.style.color = "var(--text)";
    } catch (err) {
      typingMsg.textContent = "Error: " + err.message;
      typingMsg.style.color = "var(--danger)";
    }
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
  }

  btnSendAi.addEventListener('click', () => {
    const msg = aiChatInput.value.trim();
    if (msg || aiSelectedImageBase64) {
      aiChatInput.value = '';
      sendAiMessage(msg || "Look at this image.");
    }
  });
  aiChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const msg = aiChatInput.value.trim();
      if (msg || aiSelectedImageBase64) {
        aiChatInput.value = '';
        sendAiMessage(msg || "Look at this image.");
      }
    }
  });
}

scheduleList.addEventListener('click', async (e) => {
  if (e.target.classList.contains('btn-edit-schedule')) {
    editingScheduleId = e.target.dataset.id;
    try {
      const parsed = JSON.parse(decodeURIComponent(e.target.dataset.content));

      scheduleWeekRange.value = parsed.weekRange || '';

      parsed.headers.forEach((h, idx) => {
        if (scheduleHeaderInputs[idx]) scheduleHeaderInputs[idx].value = h;
      });

      scheduleEditorBody.innerHTML = '';

      // Fetch LATEST employees so new ones show up in old schedules
      const { data: currentUsers } = await window.supabaseClient
        .from('users')
        .select('name')
        .eq('is_approved', true)
        .order('name', { ascending: true });

      (currentUsers || []).forEach(u => {
        // Try to find this employee in the saved schedule data
        const savedRow = parsed.rows.find(r => r.employee === u.name);
        const shifts = savedRow ? savedRow.shifts : ['-', '-', '-', '-', '-', '-', '-'];

        const tr = document.createElement('tr');
        let rowTotal = 0;
        const cellsHtml = shifts.map(s => {
          rowTotal += parseShiftHours(s);
          return `<td><input type="text" class="input-field sched-cell" value="${s}" style="padding: 5px; text-align: center; margin-bottom: 0;"></td>`;
        }).join('');

        tr.innerHTML = `<td><strong>${u.name}</strong></td>${cellsHtml}<td style="text-align: center; font-weight: bold;">${rowTotal.toFixed(1)}</td>`;
        scheduleEditorBody.appendChild(tr);
      });

      btnSubmitSchedule.textContent = 'Save Changes';
      postScheduleSection.classList.remove('hidden');
      postScheduleSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      showToast('Could not load schedule for editing.', 'error');
    }
  } else if (e.target.classList.contains('btn-delete-schedule')) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      const { error } = await window.supabaseClient.from('schedules').delete().eq('id', e.target.dataset.id);
      if (error) throw error;
      showToast('Schedule deleted');
      loadSchedules();
    } catch (err) {
      showToast('Failed to delete schedule', 'error');
    }
  }
});

btnScheduleManagerLogin.addEventListener('click', () => {
  scheduleManagerAuth.classList.toggle('hidden');
});

btnScheduleLoginSubmit.addEventListener('click', async () => {
  const username = scheduleManagerUsername.value;
  const password = scheduleManagerPassword.value;
  if (!username || !password) return;

  try {
    const { data: rawData, error } = await window.supabaseClient
      .from('users')
      .select('*')
      .eq('name', username)
      .eq('password', password)
      .eq('role', 'Manager')
      .eq('is_approved', true)
      .not('password', 'is', null)
      .limit(1);

    if (error || !rawData || rawData.length === 0) {
      if (error) console.error("Login Error:", error);
      showToast('Invalid Manager Username or Password', 'error');
      return;
    }

    const data = rawData[0];

    // Save login for next time
    if (managerRememberMe && managerRememberMe.checked) {
      localStorage.setItem('managerRememberUser', username);
      localStorage.setItem('managerRememberPass', password);
    } else {
      localStorage.removeItem('managerRememberUser');
      localStorage.removeItem('managerRememberPass');
    }

    // Success
    showToast(`Welcome back, ${data.name}!`, 'success');
    managerLoggedIn = true;
    currentManager = data;

    scheduleManagerAuth.classList.add('hidden');
    scheduleManagerUsername.value = '';
    scheduleManagerPassword.value = '';
    btnScheduleManagerLogin.classList.add('hidden');

    btnShowPostSchedule.classList.remove('hidden');
    managerAuth.classList.add('hidden');
    managerDashboard.classList.remove('hidden');

    loadSchedules(); // refresh to show delete buttons
  } catch (err) {
    showToast('Error during login.', 'error');
  }
});

const btnScrollApprovals = document.getElementById('btn-scroll-approvals');
if (btnScrollApprovals) {
  btnScrollApprovals.addEventListener('click', () => {
    pendingPinsSection.scrollIntoView({ behavior: 'smooth' });
  });
}

// --- Manager Forgot Password ---
btnForgotPwd.addEventListener('click', () => {
  modalForgotPwd.classList.remove('hidden');
});

btnCancelPwdReset.addEventListener('click', () => {
  modalForgotPwd.classList.add('hidden');
  forgotPwdName.value = '';
  forgotPwdNew.value = '';
});

btnSubmitPwdReset.addEventListener('click', async () => {
  const name = forgotPwdName.value;
  const newPwd = forgotPwdNew.value;
  if (!name || !newPwd) {
    showToast('Please enter username and new password', 'error');
    return;
  }

  try {
    const { data: user, error } = await window.supabaseClient.from('users').select('id').eq('name', name).eq('role', 'Manager').single();
    if (error || !user) {
      showToast('Manager username not found', 'error');
      return;
    }

    await window.supabaseClient.from('users').update({ pending_password: newPwd }).eq('id', user.id);
    showToast('Password reset requested! Another manager must approve it.');
    modalForgotPwd.classList.add('hidden');
    forgotPwdName.value = '';
    forgotPwdNew.value = '';
  } catch (err) {
    showToast('Failed to request password reset', 'error');
  }
});

// --- Security Settings Logic ---
btnShowSecurity.addEventListener('click', () => {
  if (!currentManager) return;
  enable2FA.checked = currentManager.two_factor_enabled || false;
  if (enable2FA.checked) {
    setup2FASection.classList.remove('hidden');
    setup2FAPin.value = currentManager.two_factor_pin || '';
  } else {
    setup2FASection.classList.add('hidden');
    setup2FAPin.value = '';
  }
  modalSecurity.classList.remove('hidden');
});

enable2FA.addEventListener('change', () => {
  if (enable2FA.checked) {
    setup2FASection.classList.remove('hidden');
  } else {
    setup2FASection.classList.add('hidden');
  }
});

btnCloseSecurity.addEventListener('click', () => {
  modalSecurity.classList.add('hidden');
});

btnSaveSecurity.addEventListener('click', async () => {
  if (!currentManager) return;

  const isEnabled = enable2FA.checked;
  const pin = setup2FAPin.value;

  if (isEnabled && pin.length !== 4) {
    showToast('2-Step PIN must be 4 digits', 'error');
    return;
  }

  try {
    const { error } = await window.supabaseClient.from('users').update({
      two_factor_enabled: isEnabled,
      two_factor_pin: isEnabled ? pin : null
    }).eq('id', currentManager.id);

    if (error) throw error;

    // Update local currentManager state
    currentManager.two_factor_enabled = isEnabled;
    currentManager.two_factor_pin = isEnabled ? pin : null;

    showToast('Security settings saved!');
    modalSecurity.classList.add('hidden');
  } catch (err) {
    showToast('Failed to save security settings', 'error');
  }
});

// --- Personal Schedule Logic ---
async function loadMySchedule() {
  if (!currentPortalEmployee) return;

  const empScheduleSection = document.getElementById('emp-schedule-section');
  const empScheduleContainer = document.getElementById('emp-schedule-container');
  const empScheduleWeek = document.getElementById('emp-schedule-week');
  const btnSyncCalendar = document.getElementById('btn-sync-calendar');
  const newScheduleAlert = document.getElementById('new-schedule-alert');

  try {
    // Fetch latest schedule
    const { data, error } = await window.supabaseClient
      .from('schedules')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      empScheduleSection.classList.add('hidden');
      if (newScheduleAlert) newScheduleAlert.classList.add('hidden');
      return;
    }

    // Check if this is a "new" schedule the user hasn't synced yet
    const lastSeenId = localStorage.getItem('last_seen_schedule_id');
    if (newScheduleAlert) {
      if (lastSeenId !== data.id) {
        newScheduleAlert.classList.remove('hidden');
      } else {
        newScheduleAlert.classList.add('hidden');
      }
    }

    const parsed = JSON.parse(data.content);
    const myRow = parsed.rows.find(r => r.employee === currentPortalEmployee.name);

    if (!myRow) {
      empScheduleSection.classList.add('hidden');
      return;
    }

    empScheduleSection.classList.remove('hidden');
    empScheduleWeek.textContent = `Schedule: ${parsed.weekRange || 'This Week'}`;

    empScheduleContainer.innerHTML = '';
    myRow.shifts.forEach((shift, idx) => {
      const dayName = parsed.headers[idx] || 'Day';
      const div = document.createElement('div');
      div.style = 'background: var(--bg); padding: 10px; border-radius: 8px; border: 1px solid var(--border);';
      div.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">${dayName}</div>
        <div style="font-weight: 700; font-size: 0.9rem;">${shift}</div>
      `;
      empScheduleContainer.appendChild(div);
    });

    const triggerSync = () => {
      const rowData = encodeURIComponent(JSON.stringify({
        employee: myRow.employee,
        shifts: myRow.shifts,
        weekRange: parsed.weekRange,
        headers: parsed.headers
      }));
      window.downloadCalendar(rowData);

      // Mark as seen
      localStorage.setItem('last_seen_schedule_id', data.id);
      if (newScheduleAlert) newScheduleAlert.classList.add('hidden');
    };

    // Set up buttons
    btnSyncCalendar.onclick = triggerSync;
    if (newScheduleAlert) newScheduleAlert.onclick = triggerSync;

  } catch (err) {
    empScheduleSection.classList.add('hidden');
    if (newScheduleAlert) newScheduleAlert.classList.add('hidden');
  }
}

// --- Calendar Export Logic ---
window.downloadCalendar = (encodedData) => {
  try {
    const data = JSON.parse(decodeURIComponent(encodedData));
    const { employee, shifts, weekRange } = data;

    // Robust date parsing for weekRange (e.g. "4/28 - 5/4" or "April 28 - May 4")
    const year = new Date().getFullYear();
    let baseDate = new Date(); // Fallback to today

    try {
      const parts = weekRange.split('-').map(p => p.trim());
      const startPart = parts[0];

      // Try M/D format
      if (startPart.includes('/')) {
        const [m, d] = startPart.split('/').map(Number);
        if (!isNaN(m) && !isNaN(d)) {
          baseDate = new Date(year, m - 1, d);
        }
      } else {
        // Try word format (e.g. "April 28")
        const parsed = new Date(`${startPart}, ${year}`);
        if (!isNaN(parsed.getTime())) {
          baseDate = parsed;
        }
      }
    } catch (e) {
      console.log('Using fallback date for calendar');
    }

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Longhorn Car Wash//Timeclock//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    shifts.forEach((s, idx) => {
      if (!s || s === '-' || s.toLowerCase() === 'off' || s.toLowerCase() === 'oc') return;

      const hours = s.split('-');
      if (hours.length < 2) return;

      const startTimeStr = hours[0].trim();
      const endTimeStr = hours[1].trim();

      function parseTime(timeStr) {
        let [h, m] = timeStr.split(':').map(Number);
        if (isNaN(m)) m = 0;
        return { h, m };
      }

      const start = parseTime(startTimeStr);
      const end = parseTime(endTimeStr);

      let startH = start.h;
      let endH = end.h;

      // Smart PM heuristic: 
      // If end is <= start, end is definitely PM.
      // If start is < 7 (and not 12), it's likely PM (e.g. 1-6).
      // Car wash typical shifts: 7am to 7pm.
      if (startH >= 1 && startH < 7) startH += 12;
      if (endH <= startH && endH !== 0) endH += 12;

      const formatDate = (offset, h, m) => {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + offset);
        d.setHours(h, m, 0);

        // Manual ISO-like format for ICS: YYYYMMDDTHHMMSSZ
        const pad = (n) => n.toString().padStart(2, '0');
        const Y = d.getUTCFullYear();
        const M = pad(d.getUTCMonth() + 1);
        const D = pad(d.getUTCDate());
        const H = pad(d.getUTCHours());
        const Min = pad(d.getUTCMinutes());
        const S = pad(d.getUTCSeconds());
        return `${Y}${M}${D}T${H}${Min}${S}Z`;
      };

      const dtStart = formatDate(idx, startH, start.m);
      const dtEnd = formatDate(idx, endH, end.m);
      const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const uid = `shift-${employee.replace(/\s+/g, '-')}-${idx}-${Date.now()}@longhorn.com`;

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${dtStamp}`);
      icsContent.push(`SUMMARY:Car Wash Shift: ${employee}`);
      icsContent.push(`DTSTART:${dtStart}`);
      icsContent.push(`DTEND:${dtEnd}`);
      icsContent.push(`LOCATION:Longhorn Car Wash`);
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');
    const content = icsContent.join('\r\n');

    const fileName = `${employee}_Schedule.ics`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      // iOS Safari handles "Add to Calendar" best if we NAVIGATE to the Data URI 
      // without a download attribute. This triggers the native Calendar import.
      const base64Content = btoa(unescape(encodeURIComponent(content)));
      const dataUri = `data:text/calendar;base64,${base64Content}`;
      window.location.href = dataUri;
    } else {
      // Android and Desktop work best with Blobs
      const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }

    showToast('Calendar file generated!');
  } catch (err) {
    console.error(err);
    showToast('Failed to generate calendar file', 'error');
  }
};

// --- Analytics Logic ---
if (btnShowAnalytics) {
  btnShowAnalytics.addEventListener('click', () => {
    managerAnalyticsSection.classList.remove('hidden');
    initCharts();
    calculateAnalytics();
  });
}

if (btnCloseAnalytics) {
  btnCloseAnalytics.addEventListener('click', () => {
    managerAnalyticsSection.classList.add('hidden');
  });
}

if (btnSaveRevenueGoals) {
  btnSaveRevenueGoals.addEventListener('click', async () => {
    const rev = parseFloat(dailyRevenueInput.value) || 0;
    const goal = parseFloat(laborGoalInput.value) || 25;
    
    try {
      await saveSettingRobust('daily_revenue_goal', rev.toString());
      await saveSettingRobust('labor_cost_goal_percent', goal.toString());
      dailyRevenueGoal = rev;
      laborCostGoalPercent = goal;
      showToast('Revenue metrics saved!', 'success');
      calculateAnalytics();
    } catch (e) {
      showToast('Failed to save metrics', 'error');
    }
  });
}

function initCharts() {
  if (!window.Chart) return;
  
  // 1. Labor Hours Chart
  const ctxLabor = document.getElementById('labor-hours-chart').getContext('2d');
  if (laborHoursChart) laborHoursChart.destroy();
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
  
  Object.values(employeeMap).forEach(emp => {
    emp.weekMs.forEach((ms, i) => {
      dailyTotals[i] += ms / (1000 * 60 * 60);
    });
  });

  laborHoursChart = new Chart(ctxLabor, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Total Hours',
        data: dailyTotals,
        backgroundColor: 'rgba(169, 59, 47, 0.6)',
        borderColor: 'rgba(169, 59, 47, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });

  // 2. Status Distribution Chart
  const ctxStatus = document.getElementById('status-distribution-chart').getContext('2d');
  if (statusDistributionChart) statusDistributionChart.destroy();
  
  let inCount = 0, outCount = 0, lunchCount = 0;
  Object.values(employeeMap).forEach(emp => {
    if (emp.currentStatus === 'IN') inCount++;
    else if (emp.currentStatus === 'LUNCH') lunchCount++;
    else outCount++;
  });

  statusDistributionChart = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Clocked In', 'On Lunch', 'Clocked Out'],
      datasets: [{
        data: [inCount, lunchCount, outCount],
        backgroundColor: ['#2e7d32', '#ffa000', '#c62828'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function calculateAnalytics() {
  let totalLaborCost = 0;
  Object.values(employeeMap).forEach(emp => {
    const totalMs = emp.weekMs.reduce((a, b) => a + b, 0);
    const hrs = totalMs / (1000 * 60 * 60);
    if (emp.is_salary) {
      totalLaborCost += emp.pay_rate / 2; // Est. weekly share of salary
    } else {
      totalLaborCost += hrs * emp.pay_rate;
    }
  });

  analyticsLaborCost.textContent = `$${totalLaborCost.toFixed(2)}`;
  
  if (dailyRevenueGoal > 0) {
    // Est. weekly revenue (daily * 7 for this simple view)
    const weeklyRevenue = dailyRevenueGoal * 7;
    const laborPercent = (totalLaborCost / weeklyRevenue) * 100;
    analyticsLaborPercent.textContent = `${laborPercent.toFixed(1)}%`;
    
    if (laborPercent > laborCostGoalPercent) {
      analyticsLaborPercent.style.color = 'var(--danger)';
    } else {
      analyticsLaborPercent.style.color = 'var(--success)';
    }
    
    const netProfit = weeklyRevenue - totalLaborCost;
    analyticsNetProfit.textContent = `$${netProfit.toFixed(2)}`;
  } else {
    analyticsLaborPercent.textContent = '--%';
    analyticsNetProfit.textContent = '--';
  }
}



// --- Digital Ops Logic ---
if (btnShowMaintenanceForm) {
  btnShowMaintenanceForm.addEventListener('click', () => modalMaintenance.classList.remove('hidden'));
}
if (btnShowIncidentForm) {
  btnShowIncidentForm.addEventListener('click', () => modalIncident.classList.remove('hidden'));
}
if (btnCancelMaint) {
  btnCancelMaint.addEventListener('click', () => modalMaintenance.classList.add('hidden'));
}
if (btnCancelIncident) {
  btnCancelIncident.addEventListener('click', () => modalIncident.classList.add('hidden'));
}

if (btnCreateChecklist) {
  btnCreateChecklist.addEventListener('click', () => {
    editingChecklistId = null;
    checklistTitleInput.value = '';
    checklistDescInput.value = '';
    checklistRoleInput.value = 'Employee';
    checklistTasksInputContainer.innerHTML = '<input type="text" class="input-field checklist-task-item-input" placeholder="Task 1" style="margin-bottom: 0;" />';
    document.querySelector('#modal-create-checklist h3').textContent = 'Create New Checklist';
    btnSaveChecklist.textContent = 'Create Checklist';
    modalCreateChecklist.classList.remove('hidden');
  });
}
if (btnCancelCreateChecklist) {
  btnCancelCreateChecklist.addEventListener('click', () => modalCreateChecklist.classList.add('hidden'));
}

if (btnAddTaskRow) {
  btnAddTaskRow.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-field checklist-task-item-input';
    input.placeholder = `Task ${document.querySelectorAll('.checklist-task-item-input').length + 1}`;
    input.style = 'margin-bottom: 0;';
    checklistTasksInputContainer.appendChild(input);
  });
}

if (btnSaveChecklist) {
  btnSaveChecklist.addEventListener('click', async () => {
    const title = checklistTitleInput.value.trim();
    const desc = checklistDescInput.value.trim();
    const role = checklistRoleInput.value;
    
    const taskInputs = document.querySelectorAll('.checklist-task-item-input');
    const tasks = Array.from(taskInputs).map(inp => inp.value.trim()).filter(t => t !== '');
    
    if (!title) {
      showToast('Please enter a title', 'error');
      return;
    }
    
    try {
      let error;
      const payload = {
        title,
        description: desc,
        role_required: role,
        tasks: tasks
      };

      if (editingChecklistId) {
        const res = await window.supabaseClient.from('checklists').update(payload).eq('id', editingChecklistId);
        error = res.error;
      } else {
        const res = await window.supabaseClient.from('checklists').insert([payload]);
        error = res.error;
      }

      if (error) throw error;
      showToast(editingChecklistId ? 'Checklist updated!' : 'Checklist created!', 'success');
      modalCreateChecklist.classList.add('hidden');
      editingChecklistId = null;
      loadChecklists();
    } catch (e) {
      showToast('Failed to save checklist', 'error');
    }
  });
}

async function deleteChecklist(id, title) {
  if (!confirm(`Are you sure you want to delete the "${title}" checklist?`)) return;
  try {
    const { error } = await window.supabaseClient.from('checklists').delete().eq('id', id);
    if (error) throw error;
    showToast('Checklist deleted', 'success');
    loadChecklists();
  } catch (e) {
    showToast('Failed to delete checklist', 'error');
  }
}

function editChecklist(list) {
  editingChecklistId = list.id;
  checklistTitleInput.value = list.title;
  checklistDescInput.value = list.description || '';
  checklistRoleInput.value = list.role_required;
  
  checklistTasksInputContainer.innerHTML = '';
  const tasks = list.tasks || [];
  if (tasks.length === 0) {
    checklistTasksInputContainer.innerHTML = '<input type="text" class="input-field checklist-task-item-input" placeholder="Task 1" style="margin-bottom: 0;" />';
  } else {
    tasks.forEach((task, idx) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input-field checklist-task-item-input';
      input.value = task;
      input.style = 'margin-bottom: 0;';
      checklistTasksInputContainer.appendChild(input);
    });
  }
  
  document.querySelector('#modal-create-checklist h3').textContent = 'Edit Checklist';
  btnSaveChecklist.textContent = 'Update Checklist';
  modalCreateChecklist.classList.remove('hidden');
}


if (btnSubmitMaint) {
  btnSubmitMaint.addEventListener('click', async () => {
    const equipment = document.getElementById('maint-equipment').value.trim();
    const desc = document.getElementById('maint-desc').value.trim();
    if (!equipment || !desc) {
      showToast('Please fill in both fields', 'error');
      return;
    }
    
    const photo = await getBase64(maintPhotoInput.files[0]);
    await submitSiteLog('Maintenance', { equipment_name: equipment, description: desc, photo_base64: photo });
    modalMaintenance.classList.add('hidden');
    document.getElementById('maint-equipment').value = '';
    document.getElementById('maint-desc').value = '';
    maintPhotoInput.value = '';
  });
}

if (btnSubmitIncident) {
  btnSubmitIncident.addEventListener('click', async () => {
    const customer = document.getElementById('incident-customer').value.trim();
    const desc = document.getElementById('incident-desc').value.trim();
    if (!customer || !desc) {
      showToast('Please fill in both fields', 'error');
      return;
    }
    
    const photo = await getBase64(incidentPhotoInput.files[0]);
    await submitSiteLog('Incident', { customer_name: customer, description: desc, photo_base64: photo });
    modalIncident.classList.add('hidden');
    document.getElementById('incident-customer').value = '';
    document.getElementById('incident-desc').value = '';
    incidentPhotoInput.value = '';
  });
}

async function getBase64(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function submitSiteLog(type, data) {
  try {
    const payload = {
      type: type,
      description: data.description,
      equipment_name: data.equipment_name || null,
      photo_base64: data.photo_base64 || null,
      user_id: currentUser ? currentUser.id : (currentManager ? currentManager.id : null)
    };
    
    const { error } = await window.supabaseClient.from('site_logs').insert([payload]);
    if (error) throw error;
    showToast(`${type} reported successfully!`, 'success');
    loadSiteLogs();
  } catch (e) {
    showToast(`Failed to submit report. (Does "site_logs" table exist?)`, 'error');
  }
}

async function loadOps() {
  // Show/Hide manager controls
  const opsManagerControls = document.getElementById('ops-manager-controls');
  if (opsManagerControls) {
    opsManagerControls.classList.toggle('hidden', !managerLoggedIn);
  }
  
  loadChecklists();
  loadSiteLogs();
  loadChecklistHistory();
}

async function loadChecklists() {
  try {
    const { data: checklists, error } = await window.supabaseClient.from('checklists').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    
    checklistsContainer.innerHTML = '';
    if (checklists.length === 0) {
      checklistsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">No checklists available.</div>';
      return;
    }
    
    checklists.forEach(list => {
      const div = document.createElement('div');
      div.className = 'action-card';
      div.style = 'background: var(--card); padding: 20px; border-radius: 12px; border: 1px solid var(--border); cursor: pointer; flex-direction: column; align-items: flex-start; position: relative;';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 10px;">
          <h4 style="margin: 0; color: var(--primary);">${list.title}</h4>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-size: 0.8rem; background: var(--surface); padding: 2px 8px; border-radius: 10px; border: 1px solid var(--border);">${list.role_required}</span>
            ${managerLoggedIn ? `
              <button class="btn-edit-checklist" style="background: none; border: none; cursor: pointer; font-size: 1rem;" title="Edit">✏️</button>
              <button class="btn-delete-checklist" style="background: none; border: none; cursor: pointer; font-size: 1rem;" title="Delete">🗑️</button>
            ` : ''}
          </div>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">${list.description || 'No description'}</p>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 5px;">Tasks: ${Array.isArray(list.tasks) ? list.tasks.length : 0}</p>
      `;
      
      div.onclick = (e) => {
        if (e.target.closest('.btn-edit-checklist')) {
          editChecklist(list);
        } else if (e.target.closest('.btn-delete-checklist')) {
          deleteChecklist(list.id, list.title);
        } else {
          showChecklistExecution(list);
        }
      };
      checklistsContainer.appendChild(div);
    });
  } catch (e) {
    checklistsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger);">Failed to load checklists.</div>';
  }
}

async function loadSiteLogs() {
  try {
    const { data: logs, error } = await window.supabaseClient.from('site_logs').select('*').order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    
    siteLogsContainer.innerHTML = '';
    if (logs.length === 0) {
      siteLogsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">No reports yet.</div>';
      return;
    }
    
    logs.forEach(log => {
      const date = new Date(log.created_at).toLocaleString();
      const typeColor = log.type === 'Maintenance' ? '#fb8c00' : '#e53935';
      const div = document.createElement('div');
      div.style = 'background: var(--surface); padding: 15px; border-radius: 10px; border-left: 4px solid ' + typeColor + ';';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <strong style="color: ${typeColor}">${log.type}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${date}</span>
        </div>
        <p style="font-size: 0.9rem; margin-bottom: 5px;">${log.equipment_name ? `<strong>${log.equipment_name}:</strong> ` : ''}${log.description}</p>
        ${log.photo_base64 ? `<img src="${log.photo_base64}" style="width: 100px; height: 60px; object-fit: cover; border-radius: 4px; margin-top: 5px; cursor: pointer;" onclick="window.openFullPhoto('${log.photo_base64}')" />` : ''}
      `;
      siteLogsContainer.appendChild(div);
    });
  } catch (e) { }
}

window.openFullPhoto = (src) => {
  const modal = document.getElementById('modal-view-photo');
  const fullImg = document.getElementById('full-size-photo');
  if (modal && fullImg) {
    fullImg.src = src;
    modal.classList.remove('hidden');
  }
};

function showChecklistExecution(list) {
  executeChecklistTitle.textContent = list.title;
  executeChecklistDesc.textContent = list.description || '';
  executeChecklistTasks.innerHTML = '';
  
  const tasks = list.tasks || [];
  if (tasks.length === 0) {
    executeChecklistTasks.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No tasks in this checklist.</p>';
  } else {
    tasks.forEach((task, idx) => {
      const div = document.createElement('div');
      div.style = 'display: flex; align-items: center; gap: 12px; background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border); transition: background 0.2s;';
      div.innerHTML = `
        <input type="checkbox" id="task-${idx}" class="checklist-checkbox" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary);" />
        <label for="task-${idx}" style="cursor: pointer; flex: 1; font-size: 0.95rem;">${task}</label>
      `;
      
      // Toggle background on check
      const cb = div.querySelector('input');
      cb.onchange = () => {
        div.style.background = cb.checked ? 'rgba(46, 204, 113, 0.1)' : 'var(--surface)';
      };
      
      executeChecklistTasks.appendChild(div);
    });
  }
  
  modalExecuteChecklist.dataset.listId = list.id;
  document.getElementById('execute-closers-names').value = '';
  modalExecuteChecklist.classList.remove('hidden');
}

if (btnCancelExecute) {
  btnCancelExecute.addEventListener('click', () => modalExecuteChecklist.classList.add('hidden'));
}

if (btnSubmitCompletion) {
  btnSubmitCompletion.addEventListener('click', async () => {
    const listId = modalExecuteChecklist.dataset.listId;
    const closers = document.getElementById('execute-closers-names').value.trim();
    const checkboxes = document.querySelectorAll('.checklist-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    if (!closers) {
      showToast('Please enter the names of the closers', 'error');
      return;
    }

    if (!allChecked) {
      if (!confirm('Not all tasks are checked. Complete anyway?')) return;
    }
    
    try {
      const payload = {
        checklist_id: listId,
        user_id: currentUser ? currentUser.id : (currentManager ? currentManager.id : (currentPortalEmployee ? currentPortalEmployee.id : null)),
        completed_at: new Date().toISOString(),
        closers_names: closers
      };
      
      const { error } = await window.supabaseClient.from('checklist_completions').insert([payload]);
      if (error) throw error;
      
      showToast('Checklist completed!', 'success');
      modalExecuteChecklist.classList.add('hidden');
      loadChecklistHistory();
    } catch (e) {
      showToast('Failed to save completion.', 'error');
    }
  });
}

 // --- Advanced Scheduling Logic ---
const scheduleListContainer = document.getElementById('schedule-list');
const modalShiftSwap = document.getElementById('modal-shift-swap');
const btnCancelSwap = document.getElementById('btn-cancel-swap');
const btnSubmitSwap = document.getElementById('btn-submit-swap');
const swapTargetEmployee = document.getElementById('swap-target-employee');
const swapDetails = document.getElementById('swap-details');

if (scheduleListContainer) {
  scheduleListContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-request-swap')) {
      const emp = e.target.dataset.employee;
      const week = e.target.dataset.week;
      
      // Populate target employees (everyone except current)
      const { data: users } = await window.supabaseClient.from('users').select('payroll_name').eq('is_approved', true);
      swapTargetEmployee.innerHTML = '<option value="">Select a teammate...</option>';
      users.forEach(u => {
        if (u.payroll_name !== emp) {
          const opt = document.createElement('option');
          opt.value = u.payroll_name;
          opt.textContent = u.payroll_name;
          swapTargetEmployee.appendChild(opt);
        }
      });
      
      modalShiftSwap.dataset.originator = emp;
      modalShiftSwap.dataset.week = week;
      modalShiftSwap.classList.remove('hidden');
    }
  });
}

if (btnCancelSwap) {
  btnCancelSwap.addEventListener('click', () => modalShiftSwap.classList.add('hidden'));
}

if (btnSubmitSwap) {
  btnSubmitSwap.addEventListener('click', async () => {
    const target = swapTargetEmployee.value;
    const details = swapDetails.value.trim();
    if (!target || !details) {
      showToast('Please select a teammate and provide details.', 'error');
      return;
    }
    
    try {
      const { error } = await window.supabaseClient.from('shift_swaps').insert([{
        original_user_id: currentPortalEmployee.id,
        target_user_id: null, // We'll look up by name or just store the name for now
        shift_date: new Date(), // Simplified for now
        status: 'Pending',
        created_at: new Date().toISOString()
      }]);
      
      if (error) throw error;
      showToast('Swap request sent to manager!', 'success');
      modalShiftSwap.classList.add('hidden');
    } catch (e) {
      showToast('Failed to send swap request.', 'error');
    }
  });
}

// --- Schedule Templates ---
const btnSaveTemplate = document.getElementById('btn-save-schedule-template');
const btnLoadTemplate = document.getElementById('btn-load-schedule-template');

if (btnSaveTemplate) {
  btnSaveTemplate.addEventListener('click', async () => {
    const rows = [];
    document.querySelectorAll('#schedule-editor-table tbody tr').forEach(tr => {
      const empName = tr.cells[0].textContent;
      const shifts = [];
      tr.querySelectorAll('.schedule-shift-input').forEach(input => {
        shifts.push(input.value);
      });
      rows.push({ employee: empName, shifts });
    });
    
    try {
      const template = JSON.stringify(rows);
      await saveSettingRobust('schedule_template_standard', template);
      showToast('Schedule saved as standard template!', 'success');
    } catch (e) {
      showToast('Failed to save template', 'error');
    }
  });
}

if (btnLoadTemplate) {
  btnLoadTemplate.addEventListener('click', async () => {
    try {
      const { data, error } = await window.supabaseClient.from('settings').select('value').eq('id', 'schedule_template_standard').limit(1);
      if (error || !data || data.length === 0) {
        showToast('No template found.', 'error');
        return;
      }
      
      const rows = JSON.parse(data[0].value);
      const tbody = document.querySelector('#schedule-editor-table tbody');
      tbody.innerHTML = '';
      
      rows.forEach(r => {
        const tr = document.createElement('tr');
        const cells = r.shifts.map(s => `<td><input type="text" class="input-field schedule-shift-input" value="${s}" style="width: 70px; margin-bottom: 0; text-align: center;" /></td>`).join('');
        tr.innerHTML = `<td>${r.employee}</td>${cells}`;
        tbody.appendChild(tr);
      });
      showToast('Template loaded!', 'success');
    } catch (e) {
      showToast('Failed to load template', 'error');
    }
  });
}

async function loadChecklistHistory() {
  if (!checklistHistoryContainer) return;
  try {
    const { data: completions, error } = await window.supabaseClient
      .from('checklist_completions')
      .select(`
        *,
        checklists (title),
        users (name)
      `)
      .order('completed_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    checklistHistoryContainer.innerHTML = '';
    if (completions.length === 0) {
      checklistHistoryContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">No completed checklists yet.</div>';
      return;
    }

    completions.forEach(comp => {
      const date = new Date(comp.completed_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      const title = comp.checklists ? comp.checklists.title : 'Deleted Checklist';
      const completedBy = comp.users ? comp.users.name : (comp.closers_names ? comp.closers_names.split(',')[0] : 'Unknown');
      
      const div = document.createElement('div');
      div.style = 'background: var(--surface); padding: 12px; border-radius: 10px; border: 1px solid var(--border);';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
          <strong style="color: var(--primary); font-size: 0.9rem;">${title}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${date}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text);">
          Completed by: <span style="font-weight: 600;">${completedBy}</span>
        </div>
        ${comp.closers_names ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Closers: ${comp.closers_names}</div>` : ''}
      `;
      checklistHistoryContainer.appendChild(div);
    });
  } catch (e) {
    console.error('History Error:', e);
  }
}

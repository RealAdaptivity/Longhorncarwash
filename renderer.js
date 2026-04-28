// Supabase client instance is available at window.supabaseClient

// --- DOM Elements ---
// Navigation
const navTimeclock = document.getElementById('nav-timeclock');
const navEmployee = document.getElementById('nav-employee');
const navManager = document.getElementById('nav-manager');
const navSchedule = document.getElementById('nav-schedule');
const viewTimeclock = document.getElementById('view-timeclock');
const viewEmployee = document.getElementById('view-employee');
const viewManager = document.getElementById('view-manager');
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
const btnClockOut = document.getElementById('btn-clock-out');
const btnCancelAction = document.getElementById('btn-cancel-action');

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

let currentPortalEmployee = null;

// Manager
const managerAuth = document.getElementById('manager-auth');
const managerUsernameInput = document.getElementById('manager-username-input');
const managerPasswordInput = document.getElementById('manager-password-input');
const btnManagerLogin = document.getElementById('btn-manager-login');
const managerDashboard = document.getElementById('manager-dashboard');
const timesheetBody = document.getElementById('timesheet-body');
const btnShowCreateUser = document.getElementById('btn-show-create-user');

// Create User Modal
const modalCreateUser = document.getElementById('modal-create-user');
const btnConfirmCreate = document.getElementById('btn-confirm-create');
const btnCancelCreate = document.getElementById('btn-cancel-create');
const newUserName = document.getElementById('new-user-name');
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
const scheduleList = document.getElementById('schedule-list');
const btnScheduleManagerLogin = document.getElementById('btn-schedule-manager-login');
const scheduleManagerAuth = document.getElementById('schedule-manager-auth');
const scheduleManagerUsername = document.getElementById('schedule-manager-username');
const scheduleManagerPassword = document.getElementById('schedule-manager-password');
const btnScheduleLoginSubmit = document.getElementById('btn-schedule-login-submit');

let selectedEmployeeForLogs = null;
let editingScheduleId = null;

// --- State ---
let currentPin = '';
let currentUser = null; // The employee currently using the terminal
let managerLoggedIn = false;

// --- Geofencing Configuration ---
// TO DO: Replace these with the actual Latitude and Longitude of the Car Wash building
const CAR_WASH_LAT = 33.06734; // Longhorn Car Wash Latitude
const CAR_WASH_LON = -97.29654; // Longhorn Car Wash Longitude
const ALLOWED_RADIUS_METERS = 100; // ~328 feet radius

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function checkLocation() {
  return new Promise((resolve, reject) => {
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
  viewTimeclock.classList.remove('active');
  viewManager.classList.remove('active');
  viewEmployee.classList.remove('active');
  viewSchedule.classList.remove('active');
  navTimeclock.classList.remove('active');
  navManager.classList.remove('active');
  navEmployee.classList.remove('active');
  navSchedule.classList.remove('active');

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
      loadTimesheets();
    }
  } else if (view === 'employee') {
    viewEmployee.classList.add('active');
    navEmployee.classList.add('active');
    if (currentPortalEmployee) {
      loadEmployeePortal(currentPortalEmployee.id, currentPortalEmployee.name);
    }
  } else if (view === 'schedule') {
    viewSchedule.classList.add('active');
    navSchedule.classList.add('active');
    loadSchedules();
  }
}

navTimeclock.addEventListener('click', () => switchView('timeclock'));
navEmployee.addEventListener('click', () => switchView('employee'));
navManager.addEventListener('click', () => switchView('manager'));
navSchedule.addEventListener('click', () => switchView('schedule'));

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
    actionButtons.classList.remove('hidden');

  } catch (err) {
    showToast('Network error. Check configuration.', 'error');
  }
});

function resetTimeclockState() {
  currentPin = '';
  currentUser = null;
  updatePinDisplay();
  const pp = document.querySelector('.pin-pad');
  if (pp) pp.classList.remove('hidden');
  if (pinDisplay) pinDisplay.classList.remove('hidden');
  if (actionButtons) actionButtons.classList.add('hidden');
}

btnCancelAction.addEventListener('click', resetTimeclockState);

// --- Clock In / Out Logic ---
async function logTime(action) {
  if (!currentUser) return;
  
  const btn = action === 'IN' ? btnClockIn : btnClockOut;
  btn.disabled = true;
  btn.style.opacity = '0.5';
  
  try {
    // 1. Check if the employee is physically at the location
    await checkLocation();
    
    // 2. If checkLocation didn't throw an error, proceed with clocking
    const { error } = await window.supabaseClient
      .from('time_logs')
      .insert([
        { user_id: currentUser.id, action: action }
      ]);
      
    if (error) throw error;
    
    showToast(`Successfully Clocked ${action === 'IN' ? 'In' : 'Out'}!`);
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

btnClockIn.addEventListener('click', () => logTime('IN'));
btnClockOut.addEventListener('click', () => logTime('OUT'));

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
  const username = managerUsernameInput.value;
  const password = managerPasswordInput.value;
  if (!username || !password) return;
  
  try {
    const { data, error } = await window.supabaseClient
      .from('users')
      .select('*')
      .eq('name', username)
      .eq('password', password)
      .eq('role', 'Manager')
      .single();
      
    if (error || !data) {
      showToast('Invalid Manager Username or Password', 'error');
      return;
    }
    
    managerLoggedIn = true;
    btnShowPostSchedule.classList.remove('hidden');
    btnScheduleManagerLogin.classList.add('hidden');
    managerAuth.classList.add('hidden');
    managerDashboard.classList.remove('hidden');
    managerUsernameInput.value = '';
    managerPasswordInput.value = '';
    loadTimesheets();
  } catch (err) {
    showToast('Error during login.', 'error');
  }
});

function logoutManager() {
  managerLoggedIn = false;
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
      if (log.action === 'IN') {
        currentStatus = 'IN';
        lastIn = time;
      } else if (log.action === 'OUT') {
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
        currentStatus = 'OUT';
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
    
  } catch (err) {
    showToast('Failed to load portal data', 'error');
  }
}

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
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
  } catch(e) { return 0; }
}

// --- Schedule Logic ---
async function loadTimesheets() {
  try {
    const { data: usersData, error: usersError } = await window.supabaseClient.from('users').select('*');
    const { data: logsData, error: logsError } = await window.supabaseClient.from('time_logs').select('*').order('created_at', { ascending: true });
    
    if (usersError || logsError) throw new Error('Fetch failed');

    const startOfWeek = getStartOfWeek().getTime();
    const startOfLastWeek = startOfWeek - (7 * 24 * 60 * 60 * 1000);
    const employeeMap = {};
    usersData.forEach(u => {
      employeeMap[u.id] = { id: u.id, name: u.name, weekMs: [0,0,0,0,0,0,0], lastWeekMs: 0, currentStatus: 'OUT', lastIn: null };
    });

    logsData.forEach(log => {
      const emp = employeeMap[log.user_id];
      if (!emp) return;

      const time = new Date(log.created_at).getTime();
      
      if (log.action === 'IN') {
        emp.currentStatus = 'IN';
        emp.lastIn = time;
      } else if (log.action === 'OUT') {
        if (emp.currentStatus === 'IN' && emp.lastIn) {
          const duration = time - emp.lastIn;
          if (emp.lastIn >= startOfWeek) {
            const dayIndex = (new Date(emp.lastIn).getDay() + 6) % 7;
            emp.weekMs[dayIndex] += duration;
          } else if (emp.lastIn >= startOfLastWeek && emp.lastIn < startOfWeek) {
            emp.lastWeekMs += duration;
          } else if (time >= startOfWeek) {
            emp.weekMs[0] += (time - startOfWeek);
          }
        }
        emp.currentStatus = 'OUT';
        emp.lastIn = null;
      }
    });

    timesheetBody.innerHTML = '';
    Object.values(employeeMap).forEach(emp => {
      if (emp.currentStatus === 'IN' && emp.lastIn) {
        const activeMs = Date.now() - emp.lastIn;
        if (emp.lastIn >= startOfWeek) {
          const dayIndex = (new Date(emp.lastIn).getDay() + 6) % 7;
          emp.weekMs[dayIndex] += activeMs;
        } else if (emp.lastIn >= startOfLastWeek && emp.lastIn < startOfWeek) {
          emp.lastWeekMs += activeMs;
        } else {
          emp.weekMs[0] += (Date.now() - startOfWeek);
        }
      }

      const daysStr = emp.weekMs.map(ms => {
        const hrs = ms / (1000 * 60 * 60);
        return `<td>${hrs > 0 ? hrs.toFixed(1) : '-'}</td>`;
      }).join('');
      
      const totalWeekMs = emp.weekMs.reduce((sum, val) => sum + val, 0);
      const totalWeekHrs = (totalWeekMs / (1000 * 60 * 60)).toFixed(2);
      const totalLastWeekHrs = (emp.lastWeekMs / (1000 * 60 * 60)).toFixed(2);
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${emp.name}</td>
        <td><span style="color: ${emp.currentStatus === 'IN' ? 'var(--success)' : 'var(--danger)'}; font-weight: bold;">${emp.currentStatus === 'IN' ? 'IN' : 'OUT'}</span></td>
        ${daysStr}
        <td style="font-weight: bold; color: var(--primary);">${totalWeekHrs}</td>
        <td style="color: var(--text-muted);">${totalLastWeekHrs}</td>
        <td><button class="btn-primary btn-manage-logs" data-id="${emp.id}" data-name="${emp.name.replace(/"/g, '&quot;')}" style="padding: 5px 10px; font-size: 0.8rem; cursor: pointer; border-radius: 4px; border: none;">Manage</button></td>
      `;
      timesheetBody.appendChild(tr);
    });

    // Populate Pending PINs
    const pendingPins = usersData.filter(u => u.pending_pin);
    if (pendingPins.length > 0) {
      pendingPinsSection.classList.remove('hidden');
      pendingPinsBody.innerHTML = '';
      pendingPins.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.name}</td>
          <td>${u.pending_pin}</td>
          <td>
            <button class="btn-success btn-approve-pin" data-id="${u.id}" data-pin="${u.pending_pin}" style="padding: 5px 10px; font-size: 0.8rem; cursor: pointer; border-radius: 4px; border: none; margin-right: 5px;">Approve</button>
            <button class="btn-danger btn-deny-pin" data-id="${u.id}" style="padding: 5px 10px; font-size: 0.8rem; cursor: pointer; border-radius: 4px; border: none;">Deny</button>
          </td>
        `;
        pendingPinsBody.appendChild(tr);
      });
    } else {
      pendingPinsSection.classList.add('hidden');
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

pendingPinsBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-approve-pin')) {
    window.approvePin(e.target.dataset.id, e.target.dataset.pin);
  } else if (e.target.classList.contains('btn-deny-pin')) {
    window.denyPin(e.target.dataset.id);
  }
});

window.approvePin = async (userId, newPin) => {
  try {
    const { error } = await window.supabaseClient.from('users').update({ pin: newPin, pending_pin: null }).eq('id', userId);
    if (error) throw error;
    showToast('PIN change approved');
    loadTimesheets();
  } catch(e) {
    showToast('Failed to approve PIN', 'error');
  }
};

window.denyPin = async (userId) => {
  try {
    const { error } = await window.supabaseClient.from('users').update({ pending_pin: null }).eq('id', userId);
    if (error) throw error;
    showToast('PIN change denied');
    loadTimesheets();
  } catch(e) {
    showToast('Failed to deny PIN', 'error');
  }
};

// --- Manage Logs Logic ---
window.openManageLogs = async (userId, userName) => {
  selectedEmployeeForLogs = userId;
  manageLogsTitle.textContent = `Manage Logs: ${userName}`;
  modalManageLogs.classList.remove('hidden');
  await loadEmployeeLogs();
};

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
      tr.innerHTML = `
        <td><span style="color: ${log.action === 'IN' ? 'var(--success)' : 'var(--danger)'}; font-weight: bold;">${log.action}</span></td>
        <td>${time}</td>
        <td><button class="btn-danger btn-delete-log" data-id="${log.id}" style="padding: 5px 10px; font-size: 0.8rem; border: none; cursor: pointer; border-radius: 4px;">Delete</button></td>
      `;
      manageLogsBody.appendChild(tr);
    });
  } catch (err) {
    showToast('Error: ' + (err.message || 'Failed to load employee logs'), 'error');
  }
}

manageLogsBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-delete-log')) {
    window.deleteLog(e.target.dataset.id);
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
        { user_id: selectedEmployeeForLogs, action: action, created_at: logDate.toISOString() }
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
  newUserName.value = '';
  newUserPin.value = '';
  newUserPassword.value = '';
});

btnConfirmCreate.addEventListener('click', async () => {
  const name = newUserName.value;
  const pin = newUserPin.value;
  const role = document.querySelector('input[name="new-user-role"]:checked').value;
  const password = newUserPassword.value;
  
  if (!name || pin.length !== 4) {
    showToast('Please enter a valid name and 4-digit PIN', 'error');
    return;
  }
  if (role === 'Manager' && !password) {
    showToast('Managers must have a dashboard password', 'error');
    return;
  }
  
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
      .insert([{ name, pin, role, password: role === 'Manager' ? password : null }]);
      
    if (error) throw error;
    
    showToast(`User ${name} created successfully!`);
    newUserName.value = '';
    newUserPin.value = '';
    newUserPassword.value = '';
    modalCreateUser.classList.add('hidden');
    loadTimesheets();
  } catch (err) {
    showToast('Failed to create user.', 'error');
  }
});

// --- Initialize Admin ---
async function initAdmin() {
  try {
    const { data } = await window.supabaseClient.from('users').select('id').eq('name', 'Admin').single();
    if (!data) {
      await window.supabaseClient.from('users').insert([{ name: 'Admin', pin: '0000', password: 'Longhornadmin', role: 'Manager' }]);
    }
  } catch(e) {
    console.log('Admin check failed', e);
  }
}
initAdmin();

// --- Schedule Logic ---
async function loadSchedules() {
  try {
    const { data, error } = await window.supabaseClient.from('schedules').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    
    scheduleList.innerHTML = '';
    if (!data || data.length === 0) {
      scheduleList.innerHTML = '<div style="background: var(--card); padding: 30px; border-radius: 15px; text-align: center; color: var(--text-muted);">No schedules posted yet.</div>';
      return;
    }

    data.forEach(sched => {
      const div = document.createElement('div');
      div.style = 'background: var(--card); padding: 20px; border-radius: 12px; border: 1px solid var(--border); overflow-x: auto;';
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
          return `<tr><td><strong>${r.employee}</strong></td>${cellsHtml}<td style="text-align: center; font-weight: bold; background: rgba(169, 59, 47, 0.05);">${rowTotal.toFixed(1)}</td></tr>`;
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

btnShowPostSchedule.addEventListener('click', async () => {
  editingScheduleId = null;
  btnSubmitSchedule.textContent = 'Post Schedule';
  scheduleWeekRange.value = '';
  
  postScheduleSection.classList.toggle('hidden');
  if (!postScheduleSection.classList.contains('hidden')) {
    // Populate employees for editing
    try {
      const { data: users } = await window.supabaseClient.from('users').select('name').order('name', { ascending: true });
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
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        inp.value = days[idx];
      });
    } catch(e) {}
  }
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
      parsed.rows.forEach(r => {
        const tr = document.createElement('tr');
        let rowTotal = 0;
        const cellsHtml = r.shifts.map(s => {
          rowTotal += parseShiftHours(s);
          return `<td><input type="text" class="input-field sched-cell" value="${s}" style="padding: 5px; text-align: center; margin-bottom: 0;"></td>`;
        }).join('');
        tr.innerHTML = `<td><strong>${r.employee}</strong></td>${cellsHtml}<td style="text-align: center; font-weight: bold;">${rowTotal.toFixed(1)}</td>`;
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
    const { data, error } = await window.supabaseClient
      .from('users')
      .select('*')
      .eq('name', username)
      .eq('password', password)
      .eq('role', 'Manager')
      .single();
      
    if (error || !data) {
      showToast('Invalid Manager Username or Password', 'error');
      return;
    }
    
    managerLoggedIn = true;
    scheduleManagerAuth.classList.add('hidden');
    scheduleManagerUsername.value = '';
    scheduleManagerPassword.value = '';
    btnScheduleManagerLogin.classList.add('hidden');
    
    btnShowPostSchedule.classList.remove('hidden');
    managerAuth.classList.add('hidden');
    managerDashboard.classList.remove('hidden');
    
    showToast('Logged in as Manager');
    loadSchedules(); // refresh to show delete buttons
  } catch (err) {
    showToast('Error during login.', 'error');
  }
});

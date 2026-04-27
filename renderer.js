// Supabase client instance is available at window.supabaseClient

// --- DOM Elements ---
// Navigation
const navTimeclock = document.getElementById('nav-timeclock');
const navEmployee = document.getElementById('nav-employee');
const navManager = document.getElementById('nav-manager');
const viewTimeclock = document.getElementById('view-timeclock');
const viewEmployee = document.getElementById('view-employee');
const viewManager = document.getElementById('view-manager');

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

// Create User Form
const createUserSection = document.getElementById('create-user-section');
const btnConfirmCreate = document.getElementById('btn-confirm-create');
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

let selectedEmployeeForLogs = null;

// --- State ---
let currentPin = '';
let currentUser = null; // The employee currently using the terminal
let managerLoggedIn = false;

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
  navTimeclock.classList.remove('active');
  navManager.classList.remove('active');
  navEmployee.classList.remove('active');

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
  }
}

navTimeclock.addEventListener('click', () => switchView('timeclock'));
navEmployee.addEventListener('click', () => switchView('employee'));
navManager.addEventListener('click', () => switchView('manager'));

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
  document.querySelector('.pin-pad').classList.remove('hidden');
  pinDisplay.classList.remove('hidden');
  actionButtons.classList.add('hidden');
}

btnCancelAction.addEventListener('click', resetTimeclockState);

// --- Clock In / Out Logic ---
async function logTime(action) {
  if (!currentUser) return;
  
  try {
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
    showToast('Error saving log.', 'error');
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
  managerDashboard.classList.add('hidden');
  managerAuth.classList.remove('hidden');
  managerUsernameInput.value = '';
  managerPasswordInput.value = '';
  createUserSection.classList.add('hidden');
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
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0,0,0,0);
  return monday;
}

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
  createUserSection.classList.toggle('hidden');
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
    createUserSection.classList.add('hidden');
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

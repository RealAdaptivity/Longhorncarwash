import {
  state,
  showToast,
  checkLocation,
  calculateTotalHoursForLogs,
  parseShiftStartTime,
} from './utils.js';

// --- Camera (Anti-Buddy Punching) ---
export function startCamera() {
  const photoVideo = document.getElementById('photo-video');
  const cameraContainer = document.getElementById('camera-container');
  if (!photoVideo || !state.ANTI_BUDDY_ENABLED) return;
  // navigator.mediaDevices is undefined in insecure contexts (http/file) and
  // some in-app webviews. Reading .getUserMedia off undefined throws
  // synchronously, so guard before touching it — otherwise this bubbles out of
  // the (often non-async) callers below and breaks the punch flow.
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    console.error('Camera unavailable in this environment');
    return;
  }
  try {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        state.cameraStream = stream;
        photoVideo.srcObject = stream;
        if (cameraContainer) cameraContainer.style.display = 'block';
      })
      .catch((err) => console.error('Camera access denied or unavailable', err));
  } catch (err) {
    console.error('Camera access denied or unavailable', err);
  }
}

export function stopCamera() {
  const cameraContainer = document.getElementById('camera-container');
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((t) => t.stop());
    state.cameraStream = null;
  }
  if (cameraContainer) cameraContainer.style.display = 'none';
}

function capturePhoto() {
  const photoVideo = document.getElementById('photo-video');
  const photoCanvas = document.getElementById('photo-canvas');
  if (!state.ANTI_BUDDY_ENABLED || !state.cameraStream || !photoVideo || !photoCanvas) return null;
  try {
    const ctx = photoCanvas.getContext('2d');
    if (!ctx) return null;
    photoCanvas.width = 320;
    photoCanvas.height = 240;
    ctx.drawImage(photoVideo, 0, 0, 320, 240);
    return photoCanvas.toDataURL('image/jpeg', 0.5);
  } catch (err) {
    // Never let a capture failure block the punch from being recorded.
    console.error('Photo capture failed', err);
    return null;
  }
}

// --- Clock Display ---
function updateClock() {
  const clockDisplay = document.getElementById('clock-display');
  const dateDisplay = document.getElementById('date-display');
  const now = new Date();
  if (clockDisplay)
    clockDisplay.textContent = now.toLocaleTimeString('en-US', {
      hour12: true,
      timeZone: 'America/Chicago',
    });
  if (dateDisplay)
    dateDisplay.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Chicago',
    });
}

// --- Idle Timeout ---
export function resetIdleTimeout() {
  if (state.idleTimeout) clearTimeout(state.idleTimeout);
  if (state.currentUser && !state.managerLoggedIn) {
    state.idleTimeout = setTimeout(() => {
      resetTimeclockState();
      showToast('Session expired due to inactivity', 'warning');
    }, 45000);
  }
}

async function updateClockActions() {
  if (!state.currentUser || state.currentUser.is_salary) return;

  const btnClockIn = document.getElementById('btn-clock-in');
  const btnClockOut = document.getElementById('btn-clock-out');
  const btnStartLunch = document.getElementById('btn-start-lunch');
  const btnEndLunch = document.getElementById('btn-end-lunch');
  const grid = document.getElementById('clock-action-grid');

  if (!btnClockIn || !btnClockOut || !btnStartLunch || !btnEndLunch) return;

  // Temporarily hide all while loading status
  btnClockIn.style.display = 'none';
  btnClockOut.style.display = 'none';
  btnStartLunch.style.display = 'none';
  btnEndLunch.style.display = 'none';

  try {
    const { data: logs, error } = await window.supabaseClient
      .from('time_logs')
      .select('action, created_at')
      .eq('user_id', state.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastAction = !error && logs && logs.length > 0 ? logs[0].action : 'OUT';
    let statusText = 'Clocked Out';
    let badgeClass = 'status-out';

    if (lastAction === 'IN' || lastAction === 'END_LUNCH' || lastAction === 'CLOCK_IN') {
      // Clocked In: can Clock Out or Start Lunch
      btnClockOut.style.display = 'flex';
      btnStartLunch.style.display = 'flex';

      const timeStr =
        logs && logs[0]
          ? new Date(logs[0].created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Chicago',
            })
          : '';
      statusText = `Clocked In since ${timeStr}`;
      badgeClass = 'status-in';
      if (grid) grid.className = 'clock-action-grid cols-2';
    } else if (lastAction === 'START_LUNCH') {
      // On Lunch: can only End Lunch
      btnEndLunch.style.display = 'flex';
      statusText = 'On Lunch Break';
      badgeClass = 'status-lunch';
      if (grid) grid.className = 'clock-action-grid cols-1';
    } else {
      // Clocked Out: can only Clock In
      btnClockIn.style.display = 'flex';
      statusText = 'Clocked Out';
      badgeClass = 'status-out';
      if (grid) grid.className = 'clock-action-grid cols-1';
    }

    // Remove any existing status badge
    const existingBadge = document.querySelector('.employee-status-badge');
    if (existingBadge) existingBadge.remove();

    // Insert new status badge into welcome card
    const welcomeCard = document.querySelector('.employee-welcome-card');
    if (welcomeCard) {
      const badgeHtml = `
        <div class="employee-status-badge ${badgeClass}">
          <span class="status-indicator"></span>
          <span>${statusText}</span>
        </div>
      `;
      welcomeCard.insertAdjacentHTML('beforeend', badgeHtml);
    }
  } catch (e) {
    console.error('Failed to update clock actions:', e);
    btnClockIn.style.display = 'flex'; // Safe fallback
  }
}

function showUserSession(userData) {
  state.currentUser = userData;
  const pinPad = document.querySelector('.pin-pad');
  const pinDisplay = document.getElementById('pin-display');
  const actionButtons = document.getElementById('action-buttons');
  const employeeWelcome = document.getElementById('employee-welcome');
  const clockGrid = document.getElementById('clock-action-grid');
  const salaryMsg = document.getElementById('salary-employee-msg');

  if (employeeWelcome) employeeWelcome.textContent = `Welcome, ${userData.name}`;
  if (pinPad) pinPad.classList.add('hidden');
  if (pinDisplay) pinDisplay.classList.add('hidden');
  if (clockGrid) clockGrid.style.display = userData.is_salary ? 'none' : '';
  if (salaryMsg) salaryMsg.style.display = userData.is_salary ? 'block' : 'none';
  if (actionButtons) actionButtons.classList.remove('hidden');
  document.body.classList.remove('logged-out');

  const btnGoToManager = document.getElementById('btn-go-to-manager');
  if (btnGoToManager) {
    const isManager =
      userData.role &&
      [
        'Admin',
        'Site Manager',
        'Assistant Site Manager',
        'Manager',
        'Supervisor',
        'Payroll',
      ].includes(userData.role);
    btnGoToManager.style.display = isManager ? 'flex' : 'none';
  }

  const isManager =
    userData.role &&
    [
      'Admin',
      'Site Manager',
      'Assistant Site Manager',
      'Manager',
      'Supervisor',
      'Payroll',
    ].includes(userData.role);
  const navManager = document.getElementById('nav-manager');
  if (navManager) {
    if (isManager) navManager.classList.remove('hidden');
    else navManager.classList.add('hidden');
  }

  const navTimesheet = document.getElementById('nav-timesheet');
  if (navTimesheet) {
    if (isManager) navTimesheet.classList.remove('hidden');
    else navTimesheet.classList.add('hidden');
  }

  // Hide login footer
  const loginFooter = document.getElementById('login-footer');
  if (loginFooter) loginFooter.classList.add('hidden');

  // Fetch status and update button states dynamically
  updateClockActions();
}

export function resetTimeclockState() {
  if (state.idleTimeout) {
    clearTimeout(state.idleTimeout);
    state.idleTimeout = null;
  }
  stopCamera();
  state.currentPin = '';

  const btnGoToManager = document.getElementById('btn-go-to-manager');
  if (btnGoToManager) btnGoToManager.style.display = 'none';

  const navManager = document.getElementById('nav-manager');
  if (navManager) navManager.classList.remove('hidden');

  const navTimesheet = document.getElementById('nav-timesheet');
  if (navTimesheet) navTimesheet.classList.remove('hidden');

  const modalAnnouncement = document.getElementById('modal-announcement');
  if (modalAnnouncement) modalAnnouncement.classList.add('hidden');

  const saved = localStorage.getItem('lcw_web_user');
  if (saved) {
    try {
      const userData = JSON.parse(saved);
      showUserSession(userData);
      if (
        userData.role &&
        [
          'Admin',
          'Site Manager',
          'Assistant Site Manager',
          'Manager',
          'Supervisor',
          'Payroll',
        ].includes(userData.role)
      ) {
        import('./manager.js').then(({ unlockManagerByPin }) => unlockManagerByPin(userData));
      }
      resetIdleTimeout();
      return;
    } catch {
      localStorage.removeItem('lcw_web_user');
    }
  }

  state.currentUser = null;
  const pinDisplay = document.getElementById('pin-display');
  const pinPad = document.querySelector('.pin-pad');
  const actionButtons = document.getElementById('action-buttons');

  if (pinDisplay) {
    pinDisplay.value = '';
  }
  if (pinPad) pinPad.classList.remove('hidden');
  if (pinDisplay) pinDisplay.classList.remove('hidden');
  if (actionButtons) actionButtons.classList.add('hidden');
  document.body.classList.add('logged-out');

  // Show login footer
  const loginFooter = document.getElementById('login-footer');
  if (loginFooter) loginFooter.classList.remove('hidden');

  // Clean status badge
  const existingBadge = document.querySelector('.employee-status-badge');
  if (existingBadge) existingBadge.remove();
}

export function signOut() {
  localStorage.removeItem('lcw_web_user');
  if (state.idleTimeout) {
    clearTimeout(state.idleTimeout);
    state.idleTimeout = null;
  }
  stopCamera();
  state.currentPin = '';
  state.currentUser = null;

  const pinDisplay = document.getElementById('pin-display');
  const pinPad = document.querySelector('.pin-pad');
  const actionButtons = document.getElementById('action-buttons');
  const modalAnnouncement = document.getElementById('modal-announcement');

  if (pinDisplay) {
    pinDisplay.value = '';
  }
  if (pinPad) pinPad.classList.remove('hidden');
  if (pinDisplay) pinDisplay.classList.remove('hidden');
  if (actionButtons) actionButtons.classList.add('hidden');
  if (modalAnnouncement) modalAnnouncement.classList.add('hidden');
  document.body.classList.add('logged-out');

  // Show login footer
  const loginFooter = document.getElementById('login-footer');
  if (loginFooter) loginFooter.classList.remove('hidden');

  // Clean status badge
  const existingBadge = document.querySelector('.employee-status-badge');
  if (existingBadge) existingBadge.remove();

  import('./manager.js').then(({ logoutManager }) => logoutManager());
}

// --- Log Time ---
export async function logTime(action, tips = 0) {
  if (!state.currentUser) return;

  const btnMap = {
    IN: 'btn-clock-in',
    OUT: 'btn-clock-out',
    START_LUNCH: 'btn-start-lunch',
    END_LUNCH: 'btn-end-lunch',
  };
  const btn = document.getElementById(btnMap[action]);
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
  }

  try {
    if (navigator.onLine) {
      const { data: lastLog, error: logErr } = await window.supabaseClient
        .from('time_logs')
        .select('action')
        .eq('user_id', state.currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!logErr && lastLog && lastLog.length > 0) {
        const last = lastLog[0].action;
        const isIn = last === 'IN' || last === 'END_LUNCH' || last === 'CLOCK_IN';
        const isOut = last === 'OUT' || last === 'CLOCK_OUT';
        const isLunch = last === 'START_LUNCH';

        if (action === 'IN' && isIn) throw new Error('You are already clocked in.');
        if (action === 'OUT' && isOut) throw new Error('You are already clocked out.');
        if (action === 'START_LUNCH' && isLunch) throw new Error('You are already on lunch.');
        if (action === 'END_LUNCH' && !isLunch)
          throw new Error('You must be on lunch to end lunch.');
        if ((action === 'START_LUNCH' || action === 'OUT') && !isIn && !isLunch) {
          throw new Error('You must clock in first.');
        }
      } else if (action !== 'IN') {
        throw new Error('You must clock in first.');
      }
    }

    const location = await checkLocation();

    if (!navigator.onLine) {
      const offlineLogs = JSON.parse(localStorage.getItem('offlineLogs') || '[]');
      const offlineEntry = {
        user_id: state.currentUser.id,
        action,
        created_at: new Date().toISOString(),
      };
      if (location) {
        offlineEntry.punch_lat = location.lat;
        offlineEntry.punch_lon = location.lon;
        offlineEntry.punch_accuracy = location.accuracy;
      }
      offlineLogs.push(offlineEntry);
      localStorage.setItem('offlineLogs', JSON.stringify(offlineLogs));
      showToast(`Offline: Saved ${action.replace('_', ' ')} locally.`);
      resetTimeclockState();
      return;
    }

    const photoData = capturePhoto();
    const payload = { user_id: state.currentUser.id, action };
    if (photoData) payload.photo_base64 = photoData;
    if (location) {
      payload.punch_lat = location.lat;
      payload.punch_lon = location.lon;
      payload.punch_accuracy = location.accuracy;
    }
    if (action === 'OUT' && tips > 0) payload.tips_declared = tips;

    const { error } = await window.supabaseClient.from('time_logs').insert([payload]);
    if (error) throw error;

    showToast(`Successfully Logged ${action.replace('_', ' ')}!`);
    resetTimeclockState();

    if (state.managerLoggedIn) {
      const { loadTimesheets } = await import('./manager.js');
      loadTimesheets();
    }
  } catch (err) {
    showToast(err.message || 'Error saving log.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }
}

// --- Offline Sync ---
export async function syncOfflineLogs() {
  const offlineLogs = JSON.parse(localStorage.getItem('offlineLogs') || '[]');
  if (offlineLogs.length === 0 || !navigator.onLine) return;

  showToast(`Syncing ${offlineLogs.length} offline punches...`);
  try {
    const { error } = await window.supabaseClient.from('time_logs').insert(offlineLogs);
    if (error) throw error;
    localStorage.removeItem('offlineLogs');
    showToast('Offline punches synced successfully!');
    if (state.managerLoggedIn) {
      const { loadTimesheets } = await import('./manager.js');
      loadTimesheets();
    }
  } catch (err) {
    console.error('Failed to sync offline logs:', err);
    showToast('Failed to sync offline punches. Will retry when online.', 'error');
  }
}

// --- Digital Timesheet Signing ---
function initTimesheetSigning() {
  const btnShowSignTimesheet = document.getElementById('btn-show-sign-timesheet');
  const modalSignTimesheet = document.getElementById('modal-sign-timesheet');
  const signTimesheetBody = document.getElementById('sign-timesheet-body');
  const signTimesheetLoading = document.getElementById('sign-timesheet-loading');
  const signTimesheetTotal = document.getElementById('sign-timesheet-total');
  const btnCancelSign = document.getElementById('btn-cancel-sign');
  const btnApproveSign = document.getElementById('btn-approve-sign');

  if (btnShowSignTimesheet) {
    btnShowSignTimesheet.addEventListener('click', async () => {
      if (!state.currentUser) return;
      modalSignTimesheet.classList.remove('hidden');
      signTimesheetBody.innerHTML = '';
      signTimesheetLoading.classList.remove('hidden');
      signTimesheetTotal.textContent = '0.00';
      stopCamera();

      try {
        const { getStartOfWeek } = await import('./utils.js');
        const weekStart = getStartOfWeek();
        const { data, error } = await window.supabaseClient
          .from('time_logs')
          .select(
            'id, user_id, action, created_at, edited_by_manager, punch_lat, punch_lon, punch_accuracy',
          )
          .eq('user_id', state.currentUser.id)
          .gte('created_at', weekStart.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;
        signTimesheetLoading.classList.add('hidden');

        let html = '';
        data.forEach((log) => {
          if (log.action === 'TIMESHEET_APPROVED') return;
          const d = new Date(log.created_at);
          const dateStr = d.toLocaleDateString('en-US');
          const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const colors = {
            IN: 'var(--success)',
            CLOCK_IN: 'var(--success)',
            OUT: 'var(--danger)',
            CLOCK_OUT: 'var(--danger)',
            START_LUNCH: 'var(--warning)',
            END_LUNCH: 'var(--primary)',
          };
          const color = colors[log.action] || 'var(--text)';
          html += `<tr style="border-bottom:1px solid var(--border);">
            <td style="padding:8px 5px;">${dateStr}</td>
            <td style="padding:8px 5px;color:${color};font-weight:bold;">${log.action.replace('_', ' ')}</td>
            <td style="padding:8px 5px;">${timeStr}</td>
          </tr>`;
        });

        signTimesheetBody.innerHTML =
          html ||
          '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted);">No logs found for this week.</td></tr>';
        signTimesheetTotal.textContent = calculateTotalHoursForLogs(data).toFixed(2);
      } catch (err) {
        if (signTimesheetLoading) signTimesheetLoading.textContent = 'Error loading logs.';
        showToast('Failed to load timesheet data.', 'error');
      }
    });
  }

  if (btnCancelSign) {
    btnCancelSign.addEventListener('click', () => {
      modalSignTimesheet.classList.add('hidden');
      startCamera();
    });
  }

  if (btnApproveSign) {
    btnApproveSign.addEventListener('click', async () => {
      if (!state.currentUser) return;
      btnApproveSign.disabled = true;
      btnApproveSign.textContent = 'Approving...';
      try {
        const { error } = await window.supabaseClient
          .from('time_logs')
          .insert([{ user_id: state.currentUser.id, action: 'TIMESHEET_APPROVED' }]);
        if (error) throw error;
        showToast('Timesheet Digitally Signed!');
        modalSignTimesheet.classList.add('hidden');
        resetTimeclockState();
      } catch (err) {
        showToast('Failed to sign timesheet.', 'error');
      } finally {
        btnApproveSign.disabled = false;
        btnApproveSign.textContent = 'Digitally Sign & Approve';
      }
    });
  }
}

// --- Module Init ---
export function init() {
  setInterval(updateClock, 1000);
  updateClock();

  window.addEventListener('online', syncOfflineLogs);
  window.addEventListener('load', syncOfflineLogs);
  document.addEventListener('click', () => {
    if (state.currentUser && !state.managerLoggedIn) resetIdleTimeout();
  });

  // PIN pad
  const pinDisplay = document.getElementById('pin-display');
  const pinBtns = document.querySelectorAll('.pin-btn:not(.btn-clear):not(.btn-primary)');
  const btnClear = document.getElementById('btn-clear');
  const btnSubmit = document.getElementById('btn-submit');
  const btnCancelAction = document.getElementById('btn-cancel-action');

  const btnGoToManager = document.getElementById('btn-go-to-manager');
  if (btnGoToManager) {
    btnGoToManager.addEventListener('click', async () => {
      if (state.currentUser) {
        const { unlockManagerByPin } = await import('./manager.js');
        unlockManagerByPin(state.currentUser);
        // Unlocking only reveals the dashboard element; we still need to make
        // the manager view active so it actually shows on screen.
        if (window.switchView) window.switchView('manager');
      }
    });
  }

  pinBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.currentPin.length < 4) {
        state.currentPin += btn.dataset.val;
        if (pinDisplay) pinDisplay.value = state.currentPin;
      }
    });
  });

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      state.currentPin = '';
      if (pinDisplay) pinDisplay.value = '';
    });
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', async () => {
      if (state.currentPin.length !== 4) {
        showToast('PIN must be 4 digits', 'error');
        return;
      }
      try {
        const { data, error } = await window.supabaseClient
          .from('users')
          .select('id, name, role, is_approved, is_salary, pay_rate, tax_status')
          .eq('pin', state.currentPin)
          .single();

        if (error || !data) {
          showToast('Invalid PIN', 'error');
          state.currentPin = '';
          if (pinDisplay) pinDisplay.value = '';
          return;
        }

        if (!data.is_approved) {
          showToast('Account not approved. Contact a manager.', 'error');
          state.currentPin = '';
          if (pinDisplay) pinDisplay.value = '';
          return;
        }

        localStorage.setItem('lcw_web_user', JSON.stringify(data));
        showUserSession(data);

        // Management roles unlock their sections via PIN (no username/password needed)
        if (
          data.role &&
          [
            'Admin',
            'Site Manager',
            'Assistant Site Manager',
            'Manager',
            'Supervisor',
            'Payroll',
          ].includes(data.role)
        ) {
          const { unlockManagerByPin } = await import('./manager.js');
          unlockManagerByPin(data);
        }

        if (!data.is_salary) {
          startCamera();
        }
        resetIdleTimeout();
      } catch (err) {
        showToast('Network error. Check configuration.', 'error');
        state.currentPin = '';
        if (pinDisplay) pinDisplay.value = '';
      }
    });
  }

  if (btnCancelAction) btnCancelAction.addEventListener('click', resetTimeclockState);

  // Clock in/out buttons
  const btnClockIn = document.getElementById('btn-clock-in');
  const btnClockOut = document.getElementById('btn-clock-out');
  const btnStartLunch = document.getElementById('btn-start-lunch');
  const btnEndLunch = document.getElementById('btn-end-lunch');
  const btnForgotPin = document.getElementById('btn-forgot-pin');

  // Early clock-in modal handlers
  const modalEarlyClockin = document.getElementById('modal-early-clockin');
  const btnCancelEarlyClockin = document.getElementById('btn-cancel-early-clockin');
  const btnRequestEarlyClockin = document.getElementById('btn-request-early-clockin');

  if (btnCancelEarlyClockin) {
    btnCancelEarlyClockin.addEventListener('click', () => {
      if (modalEarlyClockin) modalEarlyClockin.classList.add('hidden');
    });
  }

  if (btnRequestEarlyClockin) {
    btnRequestEarlyClockin.addEventListener('click', async () => {
      if (!state.currentUser || !modalEarlyClockin) return;
      btnRequestEarlyClockin.disabled = true;
      btnRequestEarlyClockin.textContent = 'Requesting...';
      try {
        const { error } = await window.supabaseClient.from('early_clockin_approvals').insert([
          {
            user_id: state.currentUser.id,
            employee_name: state.currentUser.name,
            shift_date: modalEarlyClockin.dataset.shiftDate,
            shift_start: modalEarlyClockin.dataset.shiftStart,
            status: 'pending',
          },
        ]);
        if (error) throw error;
        showToast('Request sent — check with your manager.', 'warning');
        modalEarlyClockin.classList.add('hidden');
      } catch (err) {
        showToast('Failed to send request.', 'error');
      } finally {
        btnRequestEarlyClockin.disabled = false;
        btnRequestEarlyClockin.textContent = 'Request Approval';
      }
    });
  }

  async function checkWifiLock() {
    if (!state.WIFI_LOCK_ENABLED) return true;
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      if (data && data.ip && state.WIFI_IP_ADDRESS) {
        if (data.ip.trim() === state.WIFI_IP_ADDRESS.trim()) return true;
      }
    } catch (e) {
      console.warn('IP check failed', e);
    }
    showToast('You must be connected to the shop WiFi to punch the clock.', 'error');
    return false;
  }

  async function checkAndClockIn() {
    if (!state.currentUser) return;
    const wifiOk = await checkWifiLock();
    if (!wifiOk) return;
    if (!state.EARLY_CLOCKIN_BLOCK_ENABLED) {
      logTime('IN');
      return;
    }
    try {
      const now = new Date();
      const chicagoNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      const currentTotalMin = chicagoNow.getHours() * 60 + chicagoNow.getMinutes();
      const todayStr = `${chicagoNow.getFullYear()}-${String(chicagoNow.getMonth() + 1).padStart(2, '0')}-${String(chicagoNow.getDate()).padStart(2, '0')}`;
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayAbbr = dayNames[chicagoNow.getDay()];

      const { data: schedules } = await window.supabaseClient
        .from('schedules')
        .select('content')
        .order('created_at', { ascending: false })
        .limit(5);

      if (schedules && schedules.length > 0) {
        for (const sched of schedules) {
          try {
            const parsed = JSON.parse(sched.content);
            const myRow = parsed.rows?.find((r) => r.employee === state.currentUser.name);
            if (!myRow) continue;

            const todayIdx = (parsed.headers || []).findIndex(
              (h) => h && h.toString().toUpperCase().startsWith(todayAbbr.toUpperCase()),
            );
            if (todayIdx < 0) continue;

            const shiftStr = myRow.shifts?.[todayIdx];
            if (!shiftStr) continue;

            const startTime = parseShiftStartTime(shiftStr);
            if (!startTime) break; // OFF — no restriction

            const shiftTotalMin = startTime.hour * 60 + startTime.minute;
            const GRACE_MIN = 5;

            if (currentTotalMin >= shiftTotalMin - GRACE_MIN) break; // On time

            // Early — check for existing approval
            const { data: approval } = await window.supabaseClient
              .from('early_clockin_approvals')
              .select('status')
              .eq('user_id', state.currentUser.id)
              .eq('shift_date', todayStr)
              .order('requested_at', { ascending: false })
              .limit(1);

            const approvalStatus = approval?.[0]?.status;
            if (approvalStatus === 'approved') break; // Approved — allow

            const ampm = startTime.hour >= 12 ? 'PM' : 'AM';
            const h12 = startTime.hour % 12 || 12;
            const shiftDisplay = `${h12}:${String(startTime.minute).padStart(2, '0')} ${ampm}`;

            if (approvalStatus === 'pending') {
              showToast(
                `Shift starts at ${shiftDisplay}. Approval pending — check with your manager.`,
                'warning',
              );
              return;
            }
            if (approvalStatus === 'denied') {
              showToast(
                `Early clock-in was denied. Your shift starts at ${shiftDisplay}.`,
                'error',
              );
              return;
            }

            // No request yet — prompt
            if (modalEarlyClockin) {
              const el = document.getElementById('early-clockin-shift-start');
              if (el) el.textContent = shiftDisplay;
              modalEarlyClockin.dataset.shiftDate = todayStr;
              modalEarlyClockin.dataset.shiftStart = shiftDisplay;
              modalEarlyClockin.classList.remove('hidden');
            } else {
              showToast(
                `Shift starts at ${shiftDisplay}. Request early clock-in from a manager.`,
                'error',
              );
            }
            return;
          } catch (e) {
            continue;
          }
        }
      }
    } catch (e) {
      console.error('Early clock-in check failed — allowing clock-in:', e);
    }
    logTime('IN');
  }

  if (btnClockIn) btnClockIn.addEventListener('click', () => checkAndClockIn());
  if (btnStartLunch)
    btnStartLunch.addEventListener('click', async () => {
      if (await checkWifiLock()) logTime('START_LUNCH');
    });
  if (btnEndLunch)
    btnEndLunch.addEventListener('click', async () => {
      if (await checkWifiLock()) logTime('END_LUNCH');
    });

  if (btnClockOut) {
    btnClockOut.addEventListener('click', async () => {
      if (!(await checkWifiLock())) return;
      const modal = document.getElementById('modal-tip-declaration');
      const tipInput = document.getElementById('tip-amount-input');
      if (modal && tipInput) {
        modal.classList.remove('hidden');
        tipInput.value = '';
        tipInput.focus();
        stopCamera();
      } else {
        logTime('OUT');
      }
    });
  }

  const btnSkipTips = document.getElementById('btn-skip-tips');
  const btnSubmitTips = document.getElementById('btn-submit-tips');
  const tipAmountInput = document.getElementById('tip-amount-input');
  const modalTipDeclaration = document.getElementById('modal-tip-declaration');

  if (btnSkipTips) {
    btnSkipTips.addEventListener('click', () => {
      if (modalTipDeclaration) modalTipDeclaration.classList.add('hidden');
      startCamera();
      logTime('OUT', 0);
    });
  }

  if (btnSubmitTips) {
    btnSubmitTips.addEventListener('click', () => {
      if (modalTipDeclaration) modalTipDeclaration.classList.add('hidden');
      startCamera();
      logTime('OUT', parseFloat(tipAmountInput ? tipAmountInput.value : '0') || 0);
    });
  }

  // Forgot PIN
  if (btnForgotPin) {
    const modalForgotPin = document.getElementById('modal-forgot-pin');
    const forgotPinName = document.getElementById('forgot-pin-name');
    const forgotPinNew = document.getElementById('forgot-pin-new');
    const btnCancelForgot = document.getElementById('btn-cancel-forgot');
    const btnSubmitForgot = document.getElementById('btn-submit-forgot');

    btnForgotPin.addEventListener('click', () => {
      if (modalForgotPin) modalForgotPin.classList.remove('hidden');
    });

    if (btnCancelForgot) {
      btnCancelForgot.addEventListener('click', () => {
        if (modalForgotPin) modalForgotPin.classList.add('hidden');
        if (forgotPinName) forgotPinName.value = '';
        if (forgotPinNew) forgotPinNew.value = '';
      });
    }

    if (btnSubmitForgot) {
      btnSubmitForgot.addEventListener('click', async () => {
        const name = forgotPinName ? forgotPinName.value.trim() : '';
        const newPin = forgotPinNew ? forgotPinNew.value : '';
        if (!name || newPin.length !== 4) {
          showToast('Enter your name and a 4-digit PIN', 'error');
          return;
        }
        try {
          const { data: user, error } = await window.supabaseClient
            .from('users')
            .select('id')
            .eq('name', name)
            .single();
          if (error || !user) {
            showToast('User not found', 'error');
            return;
          }

          const { data: existing } = await window.supabaseClient
            .from('users')
            .select('id')
            .eq('pin', newPin)
            .single();
          if (existing) {
            showToast('PIN is already in use', 'error');
            return;
          }

          const { error: updateError } = await window.supabaseClient
            .from('users')
            .update({ pending_pin: newPin })
            .eq('id', user.id);
          if (updateError) throw updateError;

          showToast('PIN change requested! Waiting for manager approval.');
          if (modalForgotPin) modalForgotPin.classList.add('hidden');
          if (forgotPinName) forgotPinName.value = '';
          if (forgotPinNew) forgotPinNew.value = '';
        } catch (err) {
          showToast('Failed to request PIN change.', 'error');
        }
      });
    }
  }

  // Midnight sweep + checklist purge
  async function performMidnightSweep() {
    try {
      const { data: users, error: uErr } = await window.supabaseClient.from('users').select('id');
      if (uErr || !users) return;
      for (const u of users) {
        const { data: latestLog, error: logErr } = await window.supabaseClient
          .from('time_logs')
          .select('action, created_at')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!logErr && latestLog && latestLog.length > 0) {
          const log = latestLog[0];
          // Any action that leaves the employee on the clock needs an auto
          // clock-out. END_LUNCH (returned from lunch) counts as clocked in
          // everywhere else in the app — see updateClockActions and the logTime
          // validation — so it must be swept too. Without it, an employee who
          // comes back from lunch and forgets to clock out is never closed out
          // and stays "Clocked In" across days, corrupting their hours and
          // hiding the Clock In button on their next shift.
          if (
            log.action === 'IN' ||
            log.action === 'END_LUNCH' ||
            log.action === 'CLOCK_IN' ||
            log.action === 'START_LUNCH'
          ) {
            const logDate = new Date(log.created_at);
            const now = new Date();
            if (logDate.toLocaleDateString() !== now.toLocaleDateString()) {
              const autoOut = new Date(logDate);
              autoOut.setHours(23, 59, 59, 999);
              await window.supabaseClient.from('time_logs').insert({
                user_id: u.id,
                action: 'OUT',
                created_at: autoOut.toISOString(),
                edited_by_manager: 'System Auto-Sweep',
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Sweep failed:', e);
    }
  }

  async function purgeOldChecklists() {
    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      await window.supabaseClient
        .from('checklist_completions')
        .delete()
        .lt('created_at', twoDaysAgo.toISOString());
    } catch (e) {
      console.error('Checklist purge failed:', e);
    }
  }

  setInterval(() => {
    performMidnightSweep();
    purgeOldChecklists();
  }, 3600000);
  performMidnightSweep();
  purgeOldChecklists();

  initTimesheetSigning();

  // Auto-restore persistent session on page load
  (async () => {
    const saved = localStorage.getItem('lcw_web_user');
    if (saved) {
      try {
        const userData = JSON.parse(saved);
        showUserSession(userData);
        if (userData.role && userData.role !== 'Employee') {
          const { unlockManagerByPin } = await import('./manager.js');
          unlockManagerByPin(userData);
        }
        resetIdleTimeout();
      } catch {
        localStorage.removeItem('lcw_web_user');
      }
    }
  })();
}

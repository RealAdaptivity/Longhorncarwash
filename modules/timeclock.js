import { state, showToast, checkLocation, calculateTotalHoursForLogs } from './utils.js';

// --- Camera (Anti-Buddy Punching) ---
export function startCamera() {
  const photoVideo = document.getElementById('photo-video');
  const cameraContainer = document.getElementById('camera-container');
  if (!photoVideo || !state.ANTI_BUDDY_ENABLED) return;
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    .then(stream => {
      state.cameraStream = stream;
      photoVideo.srcObject = stream;
      if (cameraContainer) cameraContainer.style.display = 'block';
    })
    .catch(err => console.error('Camera access denied or unavailable', err));
}

export function stopCamera() {
  const cameraContainer = document.getElementById('camera-container');
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(t => t.stop());
    state.cameraStream = null;
  }
  if (cameraContainer) cameraContainer.style.display = 'none';
}

function capturePhoto() {
  const photoVideo = document.getElementById('photo-video');
  const photoCanvas = document.getElementById('photo-canvas');
  if (!state.ANTI_BUDDY_ENABLED || !state.cameraStream || !photoVideo || !photoCanvas) return null;
  const ctx = photoCanvas.getContext('2d');
  photoCanvas.width = 320;
  photoCanvas.height = 240;
  ctx.drawImage(photoVideo, 0, 0, 320, 240);
  return photoCanvas.toDataURL('image/jpeg', 0.5);
}

// --- Clock Display ---
function updateClock() {
  const clockDisplay = document.getElementById('clock-display');
  const dateDisplay = document.getElementById('date-display');
  const now = new Date();
  if (clockDisplay) clockDisplay.textContent = now.toLocaleTimeString('en-US', { hour12: true, timeZone: 'America/Chicago' });
  if (dateDisplay) dateDisplay.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });
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

export function resetTimeclockState() {
  if (state.idleTimeout) { clearTimeout(state.idleTimeout); state.idleTimeout = null; }
  stopCamera();
  state.currentPin = '';
  state.currentUser = null;

  const pinDisplay = document.getElementById('pin-display');
  const pinPad = document.querySelector('.pin-pad');
  const actionButtons = document.getElementById('action-buttons');
  const modalAnnouncement = document.getElementById('modal-announcement');

  if (pinDisplay) { pinDisplay.value = ''; }
  if (pinPad) pinPad.classList.remove('hidden');
  if (pinDisplay) pinDisplay.classList.remove('hidden');
  if (actionButtons) actionButtons.classList.add('hidden');
  if (modalAnnouncement) modalAnnouncement.classList.add('hidden');
}

// --- Log Time ---
export async function logTime(action, tips = 0) {
  if (!state.currentUser) return;

  const btnMap = { IN: 'btn-clock-in', OUT: 'btn-clock-out', START_LUNCH: 'btn-start-lunch', END_LUNCH: 'btn-end-lunch' };
  const btn = document.getElementById(btnMap[action]);
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }

  try {
    if (navigator.onLine) {
      const { data: lastLog, error: logErr } = await window.supabaseClient
        .from('time_logs').select('action').eq('user_id', state.currentUser.id)
        .order('created_at', { ascending: false }).limit(1);

      if (!logErr && lastLog && lastLog.length > 0) {
        const last = lastLog[0].action;
        const isIn = last === 'IN' || last === 'END_LUNCH';
        const isOut = last === 'OUT';
        const isLunch = last === 'START_LUNCH';

        if (action === 'IN' && isIn) throw new Error('You are already clocked in.');
        if (action === 'OUT' && isOut) throw new Error('You are already clocked out.');
        if (action === 'START_LUNCH' && isLunch) throw new Error('You are already on lunch.');
        if (action === 'END_LUNCH' && !isLunch) throw new Error('You must be on lunch to end lunch.');
        if ((action === 'START_LUNCH' || action === 'OUT') && !isIn && !isLunch) {
          throw new Error('You must clock in first.');
        }
      } else if (action !== 'IN') {
        throw new Error('You must clock in first.');
      }
    }

    await checkLocation();

    if (!navigator.onLine) {
      const offlineLogs = JSON.parse(localStorage.getItem('offlineLogs') || '[]');
      offlineLogs.push({ user_id: state.currentUser.id, action, created_at: new Date().toISOString() });
      localStorage.setItem('offlineLogs', JSON.stringify(offlineLogs));
      showToast(`Offline: Saved ${action.replace('_', ' ')} locally.`);
      resetTimeclockState();
      return;
    }

    const photoData = capturePhoto();
    const payload = { user_id: state.currentUser.id, action };
    if (photoData) payload.photo_base64 = photoData;
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
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
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
        const { data, error } = await window.supabaseClient.from('time_logs')
          .select('id, user_id, action, created_at, edited_by_manager').eq('user_id', state.currentUser.id)
          .gte('created_at', weekStart.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;
        signTimesheetLoading.classList.add('hidden');

        let html = '';
        data.forEach(log => {
          if (log.action === 'TIMESHEET_APPROVED') return;
          const d = new Date(log.created_at);
          const dateStr = d.toLocaleDateString('en-US');
          const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const colors = { IN: 'var(--success)', CLOCK_IN: 'var(--success)', OUT: 'var(--danger)', CLOCK_OUT: 'var(--danger)', START_LUNCH: 'var(--warning)', END_LUNCH: 'var(--primary)' };
          const color = colors[log.action] || 'var(--text)';
          html += `<tr style="border-bottom:1px solid var(--border);">
            <td style="padding:8px 5px;">${dateStr}</td>
            <td style="padding:8px 5px;color:${color};font-weight:bold;">${log.action.replace('_', ' ')}</td>
            <td style="padding:8px 5px;">${timeStr}</td>
          </tr>`;
        });

        signTimesheetBody.innerHTML = html || '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted);">No logs found for this week.</td></tr>';
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
        const { error } = await window.supabaseClient.from('time_logs').insert([{ user_id: state.currentUser.id, action: 'TIMESHEET_APPROVED' }]);
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
  const actionButtons = document.getElementById('action-buttons');
  const employeeWelcome = document.getElementById('employee-welcome');
  const btnCancelAction = document.getElementById('btn-cancel-action');
  const announcementText = document.getElementById('announcement-text');
  const modalAnnouncement = document.getElementById('modal-announcement');
  const btnAcknowledgeAnnouncement = document.getElementById('btn-acknowledge-announcement');

  pinBtns.forEach(btn => {
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
          .select('id, name, role, is_approved')
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

        state.currentUser = data;
        if (employeeWelcome) employeeWelcome.textContent = `Welcome, ${data.name}`;
        const pinPad = document.querySelector('.pin-pad');
        if (pinPad) pinPad.classList.add('hidden');
        if (pinDisplay) pinDisplay.classList.add('hidden');

        if (state.activeAnnouncement && state.activeAnnouncement.trim() !== '') {
          if (announcementText) announcementText.textContent = state.activeAnnouncement;
          if (modalAnnouncement) modalAnnouncement.classList.remove('hidden');
        } else {
          if (actionButtons) actionButtons.classList.remove('hidden');
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

  if (btnAcknowledgeAnnouncement) {
    btnAcknowledgeAnnouncement.addEventListener('click', () => {
      if (modalAnnouncement) modalAnnouncement.classList.add('hidden');
      if (actionButtons) actionButtons.classList.remove('hidden');
      startCamera();
    });
  }

  // Clock in/out buttons
  const btnClockIn = document.getElementById('btn-clock-in');
  const btnClockOut = document.getElementById('btn-clock-out');
  const btnStartLunch = document.getElementById('btn-start-lunch');
  const btnEndLunch = document.getElementById('btn-end-lunch');
  const btnForgotPin = document.getElementById('btn-forgot-pin');

  if (btnClockIn) btnClockIn.addEventListener('click', () => logTime('IN'));
  if (btnStartLunch) btnStartLunch.addEventListener('click', () => logTime('START_LUNCH'));
  if (btnEndLunch) btnEndLunch.addEventListener('click', () => logTime('END_LUNCH'));

  if (btnClockOut) {
    btnClockOut.addEventListener('click', () => {
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

    btnForgotPin.addEventListener('click', () => { if (modalForgotPin) modalForgotPin.classList.remove('hidden'); });

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
          const { data: user, error } = await window.supabaseClient.from('users').select('id').eq('name', name).single();
          if (error || !user) { showToast('User not found', 'error'); return; }

          const { data: existing } = await window.supabaseClient.from('users').select('id').eq('pin', newPin).single();
          if (existing) { showToast('PIN is already in use', 'error'); return; }

          const { error: updateError } = await window.supabaseClient.from('users').update({ pending_pin: newPin }).eq('id', user.id);
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
        const { data: latestLog, error: logErr } = await window.supabaseClient.from('time_logs')
          .select('action, created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(1);
        if (!logErr && latestLog && latestLog.length > 0) {
          const log = latestLog[0];
          if (log.action === 'IN' || log.action === 'START_LUNCH') {
            const logDate = new Date(log.created_at);
            const now = new Date();
            if (logDate.toLocaleDateString() !== now.toLocaleDateString()) {
              const autoOut = new Date(logDate);
              autoOut.setHours(23, 59, 59, 999);
              await window.supabaseClient.from('time_logs').insert({
                user_id: u.id, action: 'OUT',
                created_at: autoOut.toISOString(),
                edited_by_manager: 'System Auto-Sweep'
              });
            }
          }
        }
      }
    } catch (e) { console.error('Sweep failed:', e); }
  }

  async function purgeOldChecklists() {
    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      await window.supabaseClient.from('checklist_completions').delete().lt('created_at', twoDaysAgo.toISOString());
    } catch (e) { console.error('Checklist purge failed:', e); }
  }

  setInterval(() => { performMidnightSweep(); purgeOldChecklists(); }, 3600000);
  performMidnightSweep();
  purgeOldChecklists();

  initTimesheetSigning();
}

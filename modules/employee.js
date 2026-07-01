import { state, showToast, getStartOfWeek, getBiweeklyWeeks, calculateEstimatedTaxes } from './utils.js';

export async function loadEmployeePortal(userId, name) {
  const employeePortalWelcome = document.getElementById('employee-portal-welcome');
  const empThisWeek = document.getElementById('emp-this-week');
  const empLastWeek = document.getElementById('emp-last-week');
  const empTimeoffBody = document.getElementById('emp-timeoff-body');

  if (employeePortalWelcome) employeePortalWelcome.textContent = `Welcome, ${name}`;

  try {
    const { data: logsData, error } = await window.supabaseClient.from('time_logs')
      .select('id, user_id, action, created_at').eq('user_id', userId).order('created_at', { ascending: true });
    if (error) throw error;

    const startOfWeek = getStartOfWeek().getTime();
    const startOfLastWeek = startOfWeek - 7 * 86400000;

    let currentStatus = 'OUT', lastIn = null, thisWeekMs = 0, lastWeekMs = 0;
    logsData.forEach(log => {
      const time = new Date(log.created_at).getTime();
      if (log.action === 'IN' || log.action === 'END_LUNCH') { currentStatus = 'IN'; lastIn = time; }
      else if (log.action === 'OUT' || log.action === 'START_LUNCH') {
        if (currentStatus === 'IN' && lastIn) {
          const d = time - lastIn;
          if (lastIn >= startOfWeek) thisWeekMs += d;
          else if (lastIn >= startOfLastWeek && lastIn < startOfWeek) lastWeekMs += d;
          else if (time >= startOfWeek) thisWeekMs += (time - startOfWeek);
        }
        currentStatus = log.action === 'START_LUNCH' ? 'LUNCH' : 'OUT';
        lastIn = null;
      }
    });

    if (currentStatus === 'IN' && lastIn) {
      const d = Date.now() - lastIn;
      if (lastIn >= startOfWeek) thisWeekMs += d;
      else if (lastIn >= startOfLastWeek) lastWeekMs += d;
      else thisWeekMs += (Date.now() - startOfWeek);
    }

    if (empThisWeek) empThisWeek.textContent = (thisWeekMs / 3600000).toFixed(2);
    if (empLastWeek) empLastWeek.textContent = (lastWeekMs / 3600000).toFixed(2);

    // Pay calculation
    let isSalary = false, payRate = 0, taxStatus = 'Single';
    if (state.currentPortalEmployee && state.currentPortalEmployee.id === userId && 'is_salary' in state.currentPortalEmployee) {
      isSalary = state.currentPortalEmployee.is_salary;
      payRate = state.currentPortalEmployee.pay_rate || 0;
      taxStatus = state.currentPortalEmployee.tax_status || 'Single';
    } else {
      try {
        const { data: uData } = await window.supabaseClient.from('users')
          .select('pay_rate, is_salary, tax_status').eq('id', userId).single();
        if (uData) { isSalary = uData.is_salary || false; payRate = uData.pay_rate || 0; taxStatus = uData.tax_status || 'Single'; }
      } catch (e) { console.error('Error fetching employee pay rate', e); }
    }

    const { week1Start, week2Start } = getBiweeklyWeeks(new Date());
    const bw1 = week1Start.getTime(), bw2 = week2Start.getTime();
    const bwNext = bw2 + 7 * 86400000;

    let bwW1Ms = 0, bwW2Ms = 0, bwStatus = 'OUT', bwLastIn = null;
    logsData.forEach(log => {
      const time = new Date(log.created_at).getTime();
      if (log.action === 'IN' || log.action === 'END_LUNCH') { bwStatus = 'IN'; bwLastIn = time; }
      else if (log.action === 'OUT' || log.action === 'START_LUNCH') {
        if (bwStatus === 'IN' && bwLastIn) {
          const d = time - bwLastIn;
          if (bwLastIn >= bw1 && bwLastIn < bw2) bwW1Ms += d;
          else if (bwLastIn >= bw2 && bwLastIn < bwNext) bwW2Ms += d;
        }
        bwStatus = 'OUT'; bwLastIn = null;
      }
    });

    if (bwStatus === 'IN' && bwLastIn) {
      const d = Date.now() - bwLastIn;
      if (bwLastIn >= bw1 && bwLastIn < bw2) bwW1Ms += d;
      else if (bwLastIn >= bw2 && bwLastIn < bwNext) bwW2Ms += d;
    }

    const w1Hrs = bwW1Ms / 3600000, w2Hrs = bwW2Ms / 3600000;
    const regHrs = Math.min(40, w1Hrs) + Math.min(40, w2Hrs);
    const otHrs = Math.max(0, w1Hrs - 40) + Math.max(0, w2Hrs - 40);
    const regPay = regHrs * payRate;
    const otPay = otHrs * payRate * 1.5;
    const estPay = isSalary ? payRate : (regPay + otPay);
    const estTaxes = calculateEstimatedTaxes(estPay, taxStatus, isSalary, 26);
    const netPay = Math.max(0, estPay - estTaxes);

    const empEstPay = document.getElementById('emp-est-pay');
    if (empEstPay) {
      empEstPay.textContent = `$${netPay.toFixed(2)}`;
      const desc = document.getElementById('emp-est-pay-desc');
      if (desc) desc.textContent = isSalary ? 'Biweekly salary' : 'Biweekly payout (Net)';
    }

    const ids = { 'breakdown-regular': `${regHrs.toFixed(2)} hrs`, 'breakdown-overtime': `${otHrs.toFixed(2)} hrs`, 'breakdown-gross': `$${estPay.toFixed(2)}`, 'breakdown-taxes': `-$${estTaxes.toFixed(2)}`, 'breakdown-net': `$${netPay.toFixed(2)}` };
    Object.entries(ids).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });

    const empNextPayday = document.getElementById('emp-next-payday');
    if (empNextPayday) {
      const payday = new Date(bwNext);
      empNextPayday.innerHTML = `Friday<br>${payday.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`;
    }

    // Time off requests
    if (empTimeoffBody) {
      const { data: timeoffs, error: toError } = await window.supabaseClient.from('time_off_requests')
        .select('id, start_date, end_date, reason, status').eq('user_id', userId).order('created_at', { ascending: false });
      if (!toError && timeoffs) {
        empTimeoffBody.innerHTML = '';
        timeoffs.forEach(req => {
          const colors = { Approved: 'var(--success)', Denied: 'var(--danger)', Pending: 'var(--warning)' };
          const tr = document.createElement('tr');
          const td1 = document.createElement('td');
          td1.textContent = `${req.start_date} to ${req.end_date}`;
          const td2 = document.createElement('td');
          td2.textContent = req.reason;
          const td3 = document.createElement('td');
          td3.style.cssText = `color:${colors[req.status] || 'var(--text-muted)'};font-weight:bold;`;
          td3.textContent = req.status;
          tr.appendChild(td1);
          tr.appendChild(td2);
          tr.appendChild(td3);
          empTimeoffBody.appendChild(tr);
        });
      }
    }

    // Checklists
    const empChecklistsContainer = document.getElementById('emp-checklists-container');
    if (empChecklistsContainer) {
      try {
        const { data: checklists, error: checkError } = await window.supabaseClient.from('checklists').select('id, title, description, role_required, tasks').order('created_at', { ascending: true });
        if (!checkError && checklists) {
          empChecklistsContainer.innerHTML = '';
          const myChecklists = checklists.filter(c => c.role_required === 'Employee');
          if (myChecklists.length === 0) {
            empChecklistsContainer.innerHTML = '<p style="color:var(--text-muted);">No checklists assigned to you.</p>';
          } else {
            const { showChecklistExecution } = await import('./ops.js');
            myChecklists.forEach(list => {
              const div = document.createElement('div');
              div.style.cssText = 'background:var(--surface);padding:15px;border-radius:10px;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:transform 0.2s;';
              div.innerHTML = `<div style="text-align:left;"><strong style="color:var(--primary);display:block;">${list.title}</strong><span style="font-size:0.8rem;color:var(--text-muted);">${list.description || 'No description'}</span></div><button class="btn-primary" style="padding:5px 15px;font-size:0.8rem;border-radius:6px;border:none;">Start</button>`;
              div.onmouseover = () => { div.style.transform = 'translateY(-2px)'; };
              div.onmouseout = () => { div.style.transform = 'translateY(0)'; };
              div.onclick = () => showChecklistExecution(list);
              empChecklistsContainer.appendChild(div);
            });
          }
        }
      } catch (e) { console.error('Error loading employee checklists', e); }
    }

  } catch (err) {
    showToast('Failed to load portal data.', 'error');
  }
}

export async function loadMySchedule() {
  if (!state.currentPortalEmployee) return;

  const empScheduleSection = document.getElementById('emp-schedule-section');
  const empScheduleContainer = document.getElementById('emp-schedule-container');
  const empScheduleWeek = document.getElementById('emp-schedule-week');
  const btnSyncCalendar = document.getElementById('btn-sync-calendar');
  const newScheduleAlert = document.getElementById('new-schedule-alert');

  try {
    const { data: schedules, error } = await window.supabaseClient.from('schedules')
      .select('id, content, created_at').order('created_at', { ascending: false }).limit(10);

    if (error || !schedules || schedules.length === 0) {
      if (empScheduleSection) empScheduleSection.classList.add('hidden');
      if (newScheduleAlert) newScheduleAlert.classList.add('hidden');
      return;
    }

    const latestSchedule = schedules[0];
    const now = new Date();
    let matchedSchedule = null;

    function parseWeekRange(weekRange) {
      if (!weekRange) return null;
      const parts = weekRange.split('-').map(p => p.trim());
      if (parts.length < 2) return null;
      const year = new Date().getFullYear();

      function parsePart(str) {
        if (str.includes('/')) {
          const [m, d] = str.split('/').map(Number);
          if (!isNaN(m) && !isNaN(d)) return new Date(year, m - 1, d);
        }
        const p = new Date(`${str}, ${year}`);
        return isNaN(p.getTime()) ? null : p;
      }

      const start = parsePart(parts[0]);
      const end = parsePart(parts[1]);
      if (!start || !end) return null;
      if (end.getMonth() < start.getMonth()) end.setFullYear(year + 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    for (const sched of schedules) {
      try {
        const parsed = JSON.parse(sched.content);
        const range = parseWeekRange(parsed.weekRange);
        if (range && now >= range.startDate && now <= range.endDate) {
          matchedSchedule = sched;
          break;
        }
      } catch (e) { console.error('Error matching schedule range', e); }
    }

    if (!matchedSchedule) matchedSchedule = latestSchedule;

    const lastSeenId = localStorage.getItem('last_seen_schedule_id');
    if (newScheduleAlert) newScheduleAlert.classList.toggle('hidden', lastSeenId === latestSchedule.id);

    const parsed = JSON.parse(matchedSchedule.content);
    const myRow = parsed.rows.find(r => r.employee === state.currentPortalEmployee.name);

    if (!myRow) { if (empScheduleSection) empScheduleSection.classList.add('hidden'); return; }

    if (empScheduleSection) empScheduleSection.classList.remove('hidden');
    if (empScheduleWeek) empScheduleWeek.textContent = `Schedule: ${parsed.weekRange || 'This Week'}`;

    if (empScheduleContainer) {
      empScheduleContainer.innerHTML = '';
      myRow.shifts.forEach((shift, idx) => {
        const dayName = parsed.headers[idx] || 'Day';
        const div = document.createElement('div');
        div.style.cssText = 'background:var(--bg);padding:10px;border-radius:8px;border:1px solid var(--border);';
        div.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:5px;">${dayName}</div><div style="font-weight:700;font-size:0.9rem;">${shift}</div>`;
        empScheduleContainer.appendChild(div);
      });
    }

    const triggerSync = () => {
      const rowData = encodeURIComponent(JSON.stringify({ employee: myRow.employee, shifts: myRow.shifts, weekRange: parsed.weekRange, headers: parsed.headers }));
      window.downloadCalendar(rowData);
      localStorage.setItem('last_seen_schedule_id', latestSchedule.id);
      if (newScheduleAlert) newScheduleAlert.classList.add('hidden');
    };

    if (btnSyncCalendar) btnSyncCalendar.onclick = triggerSync;
    if (newScheduleAlert) newScheduleAlert.onclick = triggerSync;
  } catch (err) {
    console.error('Error loading my schedule', err);
    if (empScheduleSection) empScheduleSection.classList.add('hidden');
  }
}

export function init() {
  const btnEmployeeLogin = document.getElementById('btn-employee-login');
  const btnEmployeeLogout = document.getElementById('btn-employee-logout');
  const employeeAuth = document.getElementById('employee-auth');
  const employeeDashboard = document.getElementById('employee-dashboard');
  const btnShowRequestTimeoff = document.getElementById('btn-show-request-timeoff');
  const modalRequestTimeoff = document.getElementById('modal-request-timeoff');
  const btnCancelTimeoff = document.getElementById('btn-cancel-timeoff');
  const btnSubmitTimeoff = document.getElementById('btn-submit-timeoff');

  if (btnEmployeeLogin) {
    btnEmployeeLogin.addEventListener('click', async () => {
      const username = document.getElementById('employee-username-input')?.value.trim();
      const pin = document.getElementById('employee-pin-input')?.value;
      if (!username || !pin) { showToast('Please enter Name and PIN', 'error'); return; }

      try {
        const { data: user, error } = await window.supabaseClient.from('users')
          .select('id, name, pay_rate, is_salary, tax_status').eq('name', username).eq('pin', pin).single();
        if (error || !user) { showToast('Invalid Name or PIN', 'error'); return; }

        state.currentPortalEmployee = user;
        const usernameEl = document.getElementById('employee-username-input');
        const pinEl = document.getElementById('employee-pin-input');
        if (usernameEl) usernameEl.value = '';
        if (pinEl) pinEl.value = '';
        if (employeeAuth) employeeAuth.classList.add('hidden');
        if (employeeDashboard) employeeDashboard.classList.remove('hidden');

        loadMySchedule();
        loadEmployeePortal(user.id, user.name);
      } catch (err) { showToast('Error logging in. Try again.', 'error'); }
    });
  }

  if (btnEmployeeLogout) {
    btnEmployeeLogout.addEventListener('click', () => {
      state.currentPortalEmployee = null;
      if (employeeDashboard) employeeDashboard.classList.add('hidden');
      if (employeeAuth) employeeAuth.classList.remove('hidden');
      const usernameEl = document.getElementById('employee-username-input');
      const pinEl = document.getElementById('employee-pin-input');
      if (usernameEl) usernameEl.value = '';
      if (pinEl) pinEl.value = '';
    });
  }

  // Time off request
  if (btnShowRequestTimeoff) {
    btnShowRequestTimeoff.addEventListener('click', () => {
      if (modalRequestTimeoff) modalRequestTimeoff.classList.remove('hidden');
    });
  }

  if (btnCancelTimeoff) {
    btnCancelTimeoff.addEventListener('click', () => {
      if (modalRequestTimeoff) modalRequestTimeoff.classList.add('hidden');
      ['timeoff-start', 'timeoff-end', 'timeoff-reason'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
    });
  }

  if (btnSubmitTimeoff) {
    btnSubmitTimeoff.addEventListener('click', async () => {
      if (!state.currentPortalEmployee) return;
      const start = document.getElementById('timeoff-start')?.value;
      const end = document.getElementById('timeoff-end')?.value;
      const reason = document.getElementById('timeoff-reason')?.value.trim();

      if (!start || !end || !reason) { showToast('Please fill in all fields', 'error'); return; }
      if (new Date(end) < new Date(start)) { showToast('End date must be after start date', 'error'); return; }

      try {
        const { error } = await window.supabaseClient.from('time_off_requests').insert([{
          user_id: state.currentPortalEmployee.id,
          start_date: start, end_date: end, reason, status: 'Pending'
        }]);
        if (error) throw error;
        showToast('Time off request submitted!');
        if (modalRequestTimeoff) modalRequestTimeoff.classList.add('hidden');
        ['timeoff-start', 'timeoff-end', 'timeoff-reason'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        loadEmployeePortal(state.currentPortalEmployee.id, state.currentPortalEmployee.name);
      } catch (err) { showToast('Failed to submit time off request.', 'error'); }
    });
  }
}

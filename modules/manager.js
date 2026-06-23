import { state, showToast, getStartOfWeek, getBiweeklyWeeks, formatNameLastFirst, calculateEstimatedTaxes, calculatePayWithOvertime, downloadCsv } from './utils.js';

// --- Manager Authentication ---
export function completeManagerLogin(data) {
  state.managerLoggedIn = true;
  state.currentManager = data;

  const btnShowPostSchedule = document.getElementById('btn-show-post-schedule');
  const btnScheduleManagerLogin = document.getElementById('btn-schedule-manager-login');
  if (btnShowPostSchedule) btnShowPostSchedule.classList.remove('hidden');
  if (btnScheduleManagerLogin) btnScheduleManagerLogin.classList.add('hidden');

  if (state.pendingLoginTarget === 'payroll') {
    const payrollAuth = document.getElementById('payroll-auth');
    const payrollDashboard = document.getElementById('payroll-dashboard');
    const payrollUsernameInput = document.getElementById('payroll-username-input');
    const payrollPasswordInput = document.getElementById('payroll-password-input');
    if (payrollAuth) payrollAuth.classList.add('hidden');
    if (payrollDashboard) payrollDashboard.classList.remove('hidden');
    if (payrollUsernameInput) payrollUsernameInput.value = '';
    if (payrollPasswordInput) payrollPasswordInput.value = '';
  } else {
    const managerAuth = document.getElementById('manager-auth');
    const managerDashboard = document.getElementById('manager-dashboard');
    const managerUsernameInput = document.getElementById('manager-username-input');
    const managerPasswordInput = document.getElementById('manager-password-input');
    if (managerAuth) managerAuth.classList.add('hidden');
    if (managerDashboard) managerDashboard.classList.remove('hidden');
    if (managerUsernameInput) managerUsernameInput.value = '';
    if (managerPasswordInput) managerPasswordInput.value = '';
  }
  loadTimesheets();
}

export function logoutManager() {
  state.managerLoggedIn = false;
  state.currentManager = null;
  state.pending2FAUser = null;

  const ids = ['btn-show-post-schedule', 'post-schedule-section', 'manager-dashboard'];
  const shows = ['btn-schedule-manager-login', 'manager-auth'];

  document.getElementById('btn-show-post-schedule')?.classList.add('hidden');
  document.getElementById('post-schedule-section')?.classList.add('hidden');
  document.getElementById('btn-schedule-manager-login')?.classList.remove('hidden');
  document.getElementById('schedule-manager-auth')?.classList.add('hidden');
  document.getElementById('manager-dashboard')?.classList.add('hidden');
  document.getElementById('manager-auth')?.classList.remove('hidden');
  document.getElementById('manager-username-input') && (document.getElementById('manager-username-input').value = '');
  document.getElementById('manager-password-input') && (document.getElementById('manager-password-input').value = '');
  document.getElementById('modal-create-user')?.classList.add('hidden');
}

async function attemptManagerLogin(username, password) {
  const { data: rawData, error } = await window.supabaseClient
    .from('users').select('id, name, role, is_approved, two_factor_enabled, two_factor_pin')
    .eq('name', username).eq('password', password)
    .eq('role', 'Manager').eq('is_approved', true)
    .not('password', 'is', null).limit(1);

  if (error || !rawData || rawData.length === 0) {
    showToast('Invalid Manager Username or Password', 'error');
    return null;
  }
  return rawData[0];
}

// --- Load Timesheets (main data fetch) ---
export async function loadTimesheets() {
  try {
    const { data: usersData, error: usersError } = await window.supabaseClient
      .from('users').select('id, name, payroll_name, pay_rate, is_salary, tax_status, role, is_approved');
    const { data: logsData, error: logsError } = await window.supabaseClient
      .from('time_logs').select('id, user_id, action, created_at, edited_by_manager, photo_base64')
      .order('created_at', { ascending: true });

    if (usersError || logsError) throw new Error('Failed to fetch timesheet data');

    const startOfWeek = getStartOfWeek().getTime();
    const startOfLastWeek = startOfWeek - (7 * 24 * 60 * 60 * 1000);
    const startOf2WeeksAgo = startOfWeek - (14 * 24 * 60 * 60 * 1000);
    const startOf3WeeksAgo = startOfWeek - (21 * 24 * 60 * 60 * 1000);
    const startOf4WeeksAgo = startOfWeek - (28 * 24 * 60 * 60 * 1000);

    const { week1Start, week2Start } = getBiweeklyWeeks(new Date());
    const biweeklyW1 = week1Start.getTime();
    const biweeklyW2 = week2Start.getTime();
    const biweeklyNextW = biweeklyW2 + (7 * 24 * 60 * 60 * 1000);

    const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    const w1Range = `${fmt(week1Start)} - ${fmt(new Date(biweeklyW2 - 86400000))}`;
    const w2Range = `${fmt(week2Start)} - ${fmt(new Date(biweeklyNextW - 86400000))}`;

    const headerW1 = document.getElementById('biweekly-header-w1');
    const headerW2 = document.getElementById('biweekly-header-w2');
    if (headerW1) headerW1.textContent = `Week 1 (${w1Range}) (Hrs)`;
    if (headerW2) headerW2.textContent = `Week 2 (${w2Range}) (Hrs)`;

    state.employeeMap = {};
    usersData.forEach(u => {
      state.employeeMap[u.id] = {
        id: u.id, name: u.name, payroll_name: u.payroll_name,
        pay_rate: u.pay_rate || 0, is_salary: u.is_salary || false,
        tax_status: u.tax_status || 'Single',
        weekMs: [0, 0, 0, 0, 0, 0, 0], lastWeekMs: 0,
        week2Ms: 0, week3Ms: 0, week4Ms: 0,
        biweeklyWeek1Ms: 0, biweeklyWeek2Ms: 0,
        currentStatus: 'OUT', lastIn: null
      };
    });

    // 30-day purge in background
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    window.supabaseClient.from('time_logs').delete().lt('created_at', thirtyDaysAgo.toISOString())
      .then(({ error }) => { if (error) console.error('Purge error', error); });

    logsData.forEach(log => {
      const emp = state.employeeMap[log.user_id];
      if (!emp) return;
      const time = new Date(log.created_at).getTime();

      if (log.action === 'IN' || log.action === 'END_LUNCH') {
        emp.currentStatus = 'IN';
        emp.lastIn = time;
      } else if (log.action === 'OUT' || log.action === 'START_LUNCH') {
        if (emp.currentStatus === 'IN' && emp.lastIn) {
          const d = time - emp.lastIn;
          if (emp.lastIn >= startOfWeek) {
            emp.weekMs[(new Date(emp.lastIn).getDay() + 5) % 7] += d;
          } else if (emp.lastIn >= startOfLastWeek) {
            emp.lastWeekMs += d;
          } else if (emp.lastIn >= startOf2WeeksAgo) {
            emp.week2Ms += d;
          } else if (emp.lastIn >= startOf3WeeksAgo) {
            emp.week3Ms += d;
          } else if (emp.lastIn >= startOf4WeeksAgo) {
            emp.week4Ms += d;
          } else if (time >= startOfWeek) {
            emp.weekMs[0] += (time - startOfWeek);
          }
          if (emp.lastIn >= biweeklyW1 && emp.lastIn < biweeklyW2) emp.biweeklyWeek1Ms += d;
          else if (emp.lastIn >= biweeklyW2 && emp.lastIn < biweeklyNextW) emp.biweeklyWeek2Ms += d;
        }
        emp.currentStatus = log.action === 'START_LUNCH' ? 'LUNCH' : 'OUT';
        emp.lastIn = null;
      }
    });

    const timesheetBody = document.getElementById('timesheet-body');
    const biweeklyHistoryBody = document.getElementById('biweekly-history-body-payroll');
    const monthlyArchiveBody = document.getElementById('monthly-archive-body-payroll');

    if (timesheetBody) timesheetBody.innerHTML = '';
    if (biweeklyHistoryBody) biweeklyHistoryBody.innerHTML = '';
    if (monthlyArchiveBody) monthlyArchiveBody.innerHTML = '';

    let overtimeCount = 0;
    let pendingCount = 0;

    Object.values(state.employeeMap).forEach(emp => {
      if (emp.currentStatus === 'IN' && emp.lastIn) {
        const activeMs = Date.now() - emp.lastIn;
        if (emp.lastIn >= startOfWeek) {
          emp.weekMs[(new Date(emp.lastIn).getDay() + 5) % 7] += activeMs;
        } else if (emp.lastIn >= startOfLastWeek) {
          emp.lastWeekMs += activeMs;
        } else if (emp.lastIn >= startOf2WeeksAgo) {
          emp.week2Ms += activeMs;
        } else if (emp.lastIn >= startOf3WeeksAgo) {
          emp.week3Ms += activeMs;
        } else if (emp.lastIn >= startOf4WeeksAgo) {
          emp.week4Ms += activeMs;
        } else {
          emp.weekMs[0] += (Date.now() - startOfWeek);
        }
        if (emp.lastIn >= biweeklyW1 && emp.lastIn < biweeklyW2) emp.biweeklyWeek1Ms += activeMs;
        else if (emp.lastIn >= biweeklyW2 && emp.lastIn < biweeklyNextW) emp.biweeklyWeek2Ms += activeMs;
      }

      const totalWeekMs = emp.weekMs.reduce((s, v) => s + v, 0);
      const totalWeekHrsVal = totalWeekMs / 3600000;
      const totalWeekHrs = totalWeekHrsVal.toFixed(2);
      const totalLastWeekHrs = (emp.lastWeekMs / 3600000).toFixed(2);

      let totalColor = 'var(--primary)';
      if (totalWeekHrsVal >= 40) { totalColor = 'var(--danger)'; overtimeCount++; }
      else if (totalWeekHrsVal >= 36) { totalColor = 'var(--warning)'; overtimeCount++; }

      const statusColors = { IN: 'var(--success)', LUNCH: 'var(--warning)', OUT: 'var(--danger)' };
      const statusColor = statusColors[emp.currentStatus] || 'var(--danger)';
      const displayName = emp.payroll_name || emp.name;
      const safeName = displayName.replace(/"/g, '&quot;');

      const weeklyPayVal = calculatePayWithOvertime([totalWeekHrsVal], emp.pay_rate);
      const estWeeklyPay = emp.is_salary ? (emp.pay_rate / 2).toFixed(2) : weeklyPayVal.toFixed(2);
      const rateText = emp.is_salary ? `$${emp.pay_rate.toFixed(2)} (Salary)` : `$${emp.pay_rate.toFixed(2)}/hr`;
      const daysStr = emp.weekMs.map(ms => {
        const h = ms / 3600000;
        return `<td>${h > 0 ? h.toFixed(1) : '-'}</td>`;
      }).join('');

      if (timesheetBody) {
        const tr = document.createElement('tr');
        tr.dataset.id = emp.id;
        tr.dataset.isSalary = emp.is_salary;
        tr.dataset.payRate = emp.pay_rate;
        tr.innerHTML = `
          <td>${displayName}</td>
          <td><span style="color:${statusColor};font-weight:bold;">${emp.currentStatus}</span></td>
          ${daysStr}
          <td style="font-weight:bold;color:${totalColor};">${totalWeekHrs}</td>
          <td style="font-weight:bold;color:var(--success);">${rateText}</td>
          <td style="font-weight:bold;color:var(--success);">$${estWeeklyPay}${emp.is_salary ? ' <span style="font-size:0.7rem;color:var(--text-muted)">(Fixed)</span>' : ''}</td>
          <td style="color:var(--text-muted);">${totalLastWeekHrs}</td>
          <td><button class="btn-primary btn-manage-logs" data-id="${emp.id}" data-name="${safeName}" style="padding:5px 10px;font-size:0.8rem;cursor:pointer;border-radius:4px;border:none;">Manage</button></td>
        `;
        timesheetBody.appendChild(tr);
      }

      if (biweeklyHistoryBody) {
        const w1Hrs = (emp.biweeklyWeek1Ms / 3600000).toFixed(2);
        const w2Hrs = (emp.biweeklyWeek2Ms / 3600000).toFixed(2);
        const biweeklyTotal = (Number(w1Hrs) + Number(w2Hrs)).toFixed(2);
        const biweeklyPay = emp.is_salary ? emp.pay_rate.toFixed(2) : calculatePayWithOvertime([Number(w1Hrs), Number(w2Hrs)], emp.pay_rate).toFixed(2);
        const trB = document.createElement('tr');
        trB.dataset.id = emp.id; trB.dataset.isSalary = emp.is_salary; trB.dataset.payRate = emp.pay_rate;
        trB.innerHTML = `
          <td>${displayName}</td>
          <td>${w1Hrs}</td><td>${w2Hrs}</td>
          <td style="font-weight:bold;color:var(--primary);">${biweeklyTotal}</td>
          <td style="font-weight:bold;color:var(--success);">$${biweeklyPay}${emp.is_salary ? ' <span style="font-size:0.7rem;color:var(--text-muted)">(Fixed)</span>' : ''}</td>
          <td><button class="btn-primary btn-manage-logs" data-id="${emp.id}" data-name="${safeName}" style="padding:5px 10px;font-size:0.8rem;cursor:pointer;border-radius:4px;border:none;">Manage</button></td>
        `;
        biweeklyHistoryBody.appendChild(trB);
      }

      if (monthlyArchiveBody) {
        const w2h = (emp.week2Ms / 3600000).toFixed(2);
        const w3h = (emp.week3Ms / 3600000).toFixed(2);
        const w4h = (emp.week4Ms / 3600000).toFixed(2);
        const monthlyTotal = (Number(totalWeekHrs) + Number(totalLastWeekHrs) + Number(w2h) + Number(w3h) + Number(w4h)).toFixed(2);
        const monthlyPay = emp.is_salary ? emp.pay_rate.toFixed(2)
          : calculatePayWithOvertime([Number(totalWeekHrs), Number(totalLastWeekHrs), Number(w2h), Number(w3h), Number(w4h)], emp.pay_rate).toFixed(2);
        const trM = document.createElement('tr');
        trM.dataset.id = emp.id; trM.dataset.isSalary = emp.is_salary; trM.dataset.payRate = emp.pay_rate;
        trM.innerHTML = `
          <td>${displayName}</td>
          <td>${w4h}</td><td>${w3h}</td><td>${w2h}</td><td>${totalLastWeekHrs}</td><td>${totalWeekHrs}</td>
          <td style="font-weight:bold;color:var(--primary);">${monthlyTotal}</td>
          <td style="font-weight:bold;color:var(--success);">$${monthlyPay}${emp.is_salary ? ' <span style="font-size:0.7rem;color:var(--text-muted)">(Fixed)</span>' : ''}</td>
          <td><button class="btn-primary btn-manage-logs" data-id="${emp.id}" data-name="${safeName}" style="padding:5px 10px;font-size:0.8rem;cursor:pointer;border-radius:4px;border:none;">Manage</button></td>
        `;
        monthlyArchiveBody.appendChild(trM);
      }
    });

    // Overtime badge
    const otBadge = document.getElementById('overtime-badge');
    if (otBadge) {
      otBadge.textContent = overtimeCount;
      otBadge.classList.toggle('hidden', overtimeCount === 0);
    }

    // Pending approvals
    const pendingPinsBody = document.getElementById('pending-pins-body');
    const pendingPinsSection = document.getElementById('pending-pins-section');
    if (pendingPinsBody) {
      pendingPinsBody.innerHTML = '';
      let hasPending = false;

      usersData.forEach(u => {
        if (u.is_approved === false) {
          hasPending = true;
          pendingCount++;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${u.name}</td>
            <td><span style="color:var(--warning);font-weight:bold;">New Account (${u.role})</span></td>
            <td>Pending</td>
            <td>
              <button class="btn-success btn-approve-account" data-id="${u.id}" style="padding:5px 10px;font-size:0.8rem;border:none;border-radius:4px;cursor:pointer;">Approve</button>
              <button class="btn-ghost btn-reject-account" data-id="${u.id}" style="padding:5px 10px;font-size:0.8rem;border:none;border-radius:4px;cursor:pointer;">Reject</button>
            </td>`;
          pendingPinsBody.appendChild(tr);
        }
        if (u.pending_pin) {
          hasPending = true;
          pendingCount++;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${u.name}</td>
            <td><span style="color:var(--primary);font-weight:bold;">PIN Change</span></td>
            <td>New PIN Requested</td>
            <td>
              <button class="btn-success btn-approve-pin" data-id="${u.id}" data-val="${u.pending_pin}" style="padding:5px 10px;font-size:0.8rem;border:none;border-radius:4px;cursor:pointer;">Approve</button>
              <button class="btn-ghost btn-reject-pin" data-id="${u.id}" style="padding:5px 10px;font-size:0.8rem;border:none;border-radius:4px;cursor:pointer;">Reject</button>
            </td>`;
          pendingPinsBody.appendChild(tr);
        }
        if (u.pending_password) {
          hasPending = true;
          pendingCount++;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${u.name}</td>
            <td><span style="color:var(--success);font-weight:bold;">Password Reset</span></td>
            <td>New Password Requested</td>
            <td>
              <button class="btn-success btn-approve-pwd" data-id="${u.id}" data-val="${u.pending_password}" style="padding:5px 10px;font-size:0.8rem;border:none;border-radius:4px;cursor:pointer;">Approve</button>
              <button class="btn-ghost btn-reject-pwd" data-id="${u.id}" style="padding:5px 10px;font-size:0.8rem;border:none;border-radius:4px;cursor:pointer;">Reject</button>
            </td>`;
          pendingPinsBody.appendChild(tr);
        }
      });
      if (pendingPinsSection) pendingPinsSection.classList.toggle('hidden', !hasPending);
    }

    // Time off requests
    const { data: timeoffData, error: timeoffError } = await window.supabaseClient
      .from('time_off_requests').select('id, user_id, start_date, end_date, reason, status, created_at').eq('status', 'Pending');
    const managerTimeoffBody = document.getElementById('manager-timeoff-body');
    const pendingTimeoffSection = document.getElementById('pending-timeoff-section');
    if (managerTimeoffBody) {
      managerTimeoffBody.innerHTML = '';
      if (!timeoffError && timeoffData && timeoffData.length > 0) {
        if (pendingTimeoffSection) pendingTimeoffSection.classList.remove('hidden');
        timeoffData.forEach(req => {
          pendingCount++;
          const empName = state.employeeMap[req.user_id] ? state.employeeMap[req.user_id].name : 'Unknown';
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${empName}</td>
            <td>${req.start_date} to ${req.end_date}</td>
            <td>${req.reason}</td>
            <td>
              <button class="btn-success btn-approve-timeoff" data-id="${req.id}" style="padding:5px 10px;font-size:0.8rem;border:none;border-radius:4px;cursor:pointer;">Approve</button>
              <button class="btn-danger btn-deny-timeoff" data-id="${req.id}" style="padding:5px 10px;font-size:0.8rem;border:none;border-radius:4px;cursor:pointer;">Deny</button>
            </td>`;
          managerTimeoffBody.appendChild(tr);
        });
      } else {
        if (pendingTimeoffSection) pendingTimeoffSection.classList.add('hidden');
      }
    }

    // Approval badge
    const badge = document.getElementById('approval-badge');
    if (badge) {
      badge.textContent = pendingCount;
      badge.classList.toggle('hidden', pendingCount === 0);
    }

    // Wire CSV exports
    wireExportButtons(w1Range, w2Range);

    // Analytics
    const { calculateAnalytics, initCharts } = await import('./analytics.js');
    const analyticsSection = document.getElementById('manager-analytics-section');
    if (analyticsSection) {
      calculateAnalytics();
      if (!analyticsSection.classList.contains('hidden')) initCharts();
    }
  } catch (err) {
    showToast('Error: ' + (err.message || 'Failed to load timesheets'), 'error');
  }
}

function wireExportButtons(w1Range, w2Range) {
  // Weekly CSV
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    const fresh = btnExportCsv.cloneNode(true);
    btnExportCsv.parentNode.replaceChild(fresh, btnExportCsv);
    fresh.addEventListener('click', () => exportWeeklyCsv());
  }
  // Biweekly CSV
  const btnExportBiweekly = document.getElementById('btn-export-biweekly');
  if (btnExportBiweekly) {
    const fresh = btnExportBiweekly.cloneNode(true);
    btnExportBiweekly.parentNode.replaceChild(fresh, btnExportBiweekly);
    fresh.addEventListener('click', () => exportBiweeklyCsv(w1Range, w2Range));
  }
  // Monthly CSV
  const btnExportMonthly = document.getElementById('btn-export-monthly');
  if (btnExportMonthly) {
    const fresh = btnExportMonthly.cloneNode(true);
    btnExportMonthly.parentNode.replaceChild(fresh, btnExportMonthly);
    fresh.addEventListener('click', () => exportMonthlyCsv());
  }
}

function exportWeeklyCsv() {
  const rows = document.querySelectorAll('#timesheet-body tr');
  if (rows.length === 0) { showToast('No data to export', 'warning'); return; }
  let csv = '#,Employee,Status,Tue,Wed,Thu,Fri,Sat,Sun,Mon,Total This Week,Rate,Est. Weekly Gross ($),Tax Status,Est. Taxes ($),Est. Net Pay ($),Last Week Total\n';
  let count = 1;
  rows.forEach(row => {
    const cols = row.querySelectorAll('td');
    const empId = row.dataset.id;
    const emp = state.employeeMap[empId];
    const isSalary = row.dataset.isSalary === 'true' || (emp && emp.is_salary) || false;
    const taxStatus = emp ? (emp.tax_status || 'Single') : 'Single';

    let rowData = [];
    cols.forEach((col, i) => {
      if (i === cols.length - 1) return;
      let text = col.textContent.replace(/[\r\n]+/g, '').trim();
      if (i === 0) text = formatNameLastFirst(text);
      rowData.push(`"${text.replace(/"/g, '""')}"`);
    });

    const estGross = parseFloat((rowData[11] || '').replace(/[^0-9.-]/g, '')) || 0;
    const estTaxes = calculateEstimatedTaxes(estGross, taxStatus, isSalary, 52);
    const estNet = Math.max(0, estGross - estTaxes);
    const lastWeek = rowData[12] || '"0"';

    rowData = rowData.slice(0, 11);
    rowData.push(`"${estGross.toFixed(2)}"`, `"${taxStatus}"`, `"${estTaxes.toFixed(2)}"`, `"${estNet.toFixed(2)}"`, lastWeek);

    const thisWeekVal = parseFloat((rowData[9] || '').replace(/"/g, '')) || 0;
    if (thisWeekVal === 0 && !isSalary) return;

    csv += `"${count++}",${rowData.join(',')}\n`;
  });
  downloadCsv(csv, `Payroll_Export_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
  showToast('Payroll CSV Downloaded!');
}

function exportBiweeklyCsv(w1Range, w2Range) {
  const rows = document.querySelectorAll('#biweekly-history-body-payroll tr');
  if (rows.length === 0) { showToast('No data to export', 'warning'); return; }
  let csv = `#,Employee,Week 1 (${w1Range}) (Hrs),Week 2 (${w2Range}) (Hrs),Biweekly Total (Hrs),Type,Rate/Salary,Est. Gross Pay,Tax Status,Est. Taxes,Est. Net Pay\n`;
  let count = 1;
  rows.forEach(row => {
    const cols = row.querySelectorAll('td');
    if (cols.length < 4) return;
    const empId = row.dataset.id;
    const emp = state.employeeMap[empId];
    const isSalary = row.dataset.isSalary === 'true' || (emp && emp.is_salary) || false;
    const payRate = parseFloat(row.dataset.payRate) || (emp ? emp.pay_rate : 0);
    const biweeklyTotal = parseFloat(cols[3].textContent.trim()) || 0;
    if (biweeklyTotal === 0 && !isSalary) return;

    const estGross = parseFloat(cols[4] ? cols[4].textContent.replace(/[^0-9.-]/g, '') : '0') || 0;
    const taxStatus = emp ? (emp.tax_status || 'Single') : 'Single';
    const estTaxes = calculateEstimatedTaxes(estGross, taxStatus, isSalary, 26);
    const estNet = Math.max(0, estGross - estTaxes);

    let rowData = [`"${count++}"`];
    for (let i = 0; i < 4; i++) {
      let text = cols[i].textContent.replace(/[\r\n]+/g, '').trim();
      if (i === 0) text = formatNameLastFirst(text);
      rowData.push(`"${text.replace(/"/g, '""')}"`);
    }
    rowData.push(`"${isSalary ? 'Salary' : 'Hourly'}"`, `"${payRate}"`, `"${estGross.toFixed(2)}"`, `"${taxStatus}"`, `"${estTaxes.toFixed(2)}"`, `"${estNet.toFixed(2)}"`);
    csv += rowData.join(',') + '\n';
  });
  downloadCsv(csv, `Biweekly_Payroll_Export_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
  showToast('Biweekly CSV Downloaded!');
}

function exportMonthlyCsv() {
  const rows = document.querySelectorAll('#monthly-archive-body-payroll tr');
  if (rows.length === 0) { showToast('No data to export', 'warning'); return; }
  let csv = '#,Employee,4 Weeks Ago,3 Weeks Ago,2 Weeks Ago,Last Week,This Week,Monthly Total (Hrs),Type,Rate/Salary,Est. Gross Pay,Tax Status,Est. Taxes,Est. Net Pay\n';
  let count = 1;
  rows.forEach(row => {
    const cols = row.querySelectorAll('td');
    if (cols.length < 7) return;
    const empId = row.dataset.id;
    const emp = state.employeeMap[empId];
    const isSalary = row.dataset.isSalary === 'true' || (emp && emp.is_salary) || false;
    const payRate = parseFloat(row.dataset.payRate) || (emp ? emp.pay_rate : 0);
    const monthlyTotal = parseFloat(cols[6].textContent.trim()) || 0;
    if (monthlyTotal === 0 && !isSalary) return;

    const estGross = parseFloat(cols[7] ? cols[7].textContent.replace(/[^0-9.-]/g, '') : '0') || 0;
    const taxStatus = emp ? (emp.tax_status || 'Single') : 'Single';
    const estTaxes = calculateEstimatedTaxes(estGross, taxStatus, isSalary, 12);
    const estNet = Math.max(0, estGross - estTaxes);

    let rowData = [`"${count++}"`];
    for (let i = 0; i < 7; i++) {
      let text = cols[i].textContent.replace(/[\r\n]+/g, '').trim();
      if (i === 0) text = formatNameLastFirst(text);
      rowData.push(`"${text.replace(/"/g, '""')}"`);
    }
    rowData.push(`"${isSalary ? 'Salary' : 'Hourly'}"`, `"${payRate}"`, `"${estGross.toFixed(2)}"`, `"${taxStatus}"`, `"${estTaxes.toFixed(2)}"`, `"${estNet.toFixed(2)}"`);
    csv += rowData.join(',') + '\n';
  });
  downloadCsv(csv, `Monthly_Payroll_Export_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
  showToast('Monthly CSV Downloaded!');
}

// --- Manage Logs Modal ---
async function loadEmployeeLogs() {
  const manageLogsBody = document.getElementById('manage-logs-body');
  if (!state.selectedEmployeeForLogs || !manageLogsBody) return;
  try {
    const { data, error } = await window.supabaseClient.from('time_logs')
      .select('id, user_id, action, created_at, edited_by_manager, photo_base64')
      .eq('user_id', state.selectedEmployeeForLogs)
      .order('created_at', { ascending: false });
    if (error) throw error;

    manageLogsBody.innerHTML = '';
    data.forEach(log => {
      const time = new Date(log.created_at).toLocaleString('en-US', { timeZone: 'America/Chicago' });
      const colors = { IN: 'var(--success)', CLOCK_IN: 'var(--success)', OUT: 'var(--danger)', CLOCK_OUT: 'var(--danger)', START_LUNCH: 'var(--warning)', END_LUNCH: 'var(--primary)', TIMESHEET_APPROVED: '#00BCD4' };
      const color = colors[log.action] || 'var(--text)';
      const editedBy = log.edited_by_manager
        ? `<span style="font-size:0.8rem;color:var(--warning);">✏️ ${log.edited_by_manager}</span>` : '-';

      const tr = document.createElement('tr');
      if (log.photo_base64) {
        const img = document.createElement('img');
        img.src = log.photo_base64;
        img.dataset.fullPhoto = 'true';
        img.style.cssText = 'width:40px;height:40px;border-radius:5px;object-fit:cover;cursor:pointer;border:1px solid var(--border);';
        img.title = 'Click to view full photo';
        const photoTd = document.createElement('td');
        photoTd.appendChild(img);
        tr.appendChild(photoTd);
      } else {
        const photoTd = document.createElement('td');
        photoTd.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;">No Photo</span>';
        tr.appendChild(photoTd);
      }

      const restHtml = `
        <td><span style="color:${color};font-weight:bold;">${log.action.replace('_', ' ')}</span></td>
        <td>${time}</td>
        <td>${editedBy}</td>
        <td style="display:flex;gap:5px;">
          <button class="btn-edit-log btn-ghost" data-id="${log.id}" data-action="${log.action}" data-time="${log.created_at}"
            style="padding:5px 10px;border-radius:4px;border:1px solid var(--border);font-size:0.8rem;cursor:pointer;">Edit</button>
          <button class="btn-danger btn-delete-log" data-id="${log.id}"
            style="padding:5px 10px;font-size:0.8rem;border:none;cursor:pointer;border-radius:4px;">Delete</button>
        </td>`;
      tr.insertAdjacentHTML('beforeend', restHtml);
      manageLogsBody.appendChild(tr);
    });
  } catch (err) {
    showToast('Failed to load employee logs: ' + (err.message || ''), 'error');
  }
}

// --- Module Init ---
export function init() {
  // Manager login
  const btnManagerLogin = document.getElementById('btn-manager-login');
  if (btnManagerLogin) {
    btnManagerLogin.addEventListener('click', async () => {
      const username = document.getElementById('manager-username-input')?.value.trim();
      const password = document.getElementById('manager-password-input')?.value;
      if (!username || !password) return;

      try {
        const data = await attemptManagerLogin(username, password);
        if (!data) return;

        if (data.two_factor_enabled) {
          state.pending2FAUser = data;
          const modal2FA = document.getElementById('modal-2fa-verify');
          const verify2FAPin = document.getElementById('verify-2fa-pin');
          if (modal2FA) modal2FA.classList.remove('hidden');
          if (verify2FAPin) { verify2FAPin.value = ''; verify2FAPin.focus(); }
          return;
        }

        // Save remember-me only after successful auth
        const rememberMe = document.getElementById('manager-remember-me');
        if (rememberMe && rememberMe.checked) {
          localStorage.setItem('managerRememberUser', username);
          localStorage.setItem('managerRememberPass', password);
        } else {
          localStorage.removeItem('managerRememberUser');
          localStorage.removeItem('managerRememberPass');
        }

        completeManagerLogin(data);
      } catch (err) {
        showToast('Error during login. Check your connection.', 'error');
      }
    });
  }

  // Payroll login
  const btnPayrollLogin = document.getElementById('btn-payroll-login');
  if (btnPayrollLogin) {
    btnPayrollLogin.addEventListener('click', async () => {
      const username = document.getElementById('payroll-username-input')?.value.trim();
      const password = document.getElementById('payroll-password-input')?.value;
      if (!username || !password) return;
      try {
        const data = await attemptManagerLogin(username, password);
        if (!data) return;
        if (data.two_factor_enabled) {
          state.pending2FAUser = data;
          const modal2FA = document.getElementById('modal-2fa-verify');
          const verify2FAPin = document.getElementById('verify-2fa-pin');
          if (modal2FA) modal2FA.classList.remove('hidden');
          if (verify2FAPin) { verify2FAPin.value = ''; verify2FAPin.focus(); }
          return;
        }
        completeManagerLogin(data);
      } catch (err) {
        showToast('Error during login. Check your connection.', 'error');
      }
    });
  }

  // 2FA verify
  const btnSubmit2FA = document.getElementById('btn-submit-2fa');
  const verify2FAPin = document.getElementById('verify-2fa-pin');
  const modal2FAVerify = document.getElementById('modal-2fa-verify');
  if (btnSubmit2FA) {
    btnSubmit2FA.addEventListener('click', () => {
      if (!state.pending2FAUser) return;
      if (verify2FAPin && verify2FAPin.value === state.pending2FAUser.two_factor_pin) {
        const user = state.pending2FAUser;
        state.pending2FAUser = null;
        if (modal2FAVerify) modal2FAVerify.classList.add('hidden');
        completeManagerLogin(user);
      } else {
        showToast('Invalid 2-Step PIN', 'error');
        if (verify2FAPin) verify2FAPin.value = '';
      }
    });
  }

  // Restore remember-me on load
  window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('managerRememberUser');
    const savedPass = localStorage.getItem('managerRememberPass');
    const managerUsernameInput = document.getElementById('manager-username-input');
    const managerPasswordInput = document.getElementById('manager-password-input');
    const managerRememberMe = document.getElementById('manager-remember-me');
    if (savedUser && savedPass) {
      if (managerUsernameInput) managerUsernameInput.value = savedUser;
      if (managerPasswordInput) managerPasswordInput.value = savedPass;
      if (managerRememberMe) managerRememberMe.checked = true;
    }
  });

  // Schedule page manager login
  const btnScheduleLoginSubmit = document.getElementById('btn-schedule-login-submit');
  if (btnScheduleLoginSubmit) {
    btnScheduleLoginSubmit.addEventListener('click', async () => {
      const username = document.getElementById('schedule-manager-username')?.value;
      const password = document.getElementById('schedule-manager-password')?.value;
      if (!username || !password) return;
      try {
        const data = await attemptManagerLogin(username, password);
        if (!data) return;

        // Save remember-me only after successful auth
        const rememberMe = document.getElementById('manager-remember-me');
        if (rememberMe && rememberMe.checked) {
          localStorage.setItem('managerRememberUser', username);
          localStorage.setItem('managerRememberPass', password);
        }

        showToast(`Welcome back, ${data.name}!`);
        state.managerLoggedIn = true;
        state.currentManager = data;
        document.getElementById('schedule-manager-auth')?.classList.add('hidden');
        document.getElementById('schedule-manager-username') && (document.getElementById('schedule-manager-username').value = '');
        document.getElementById('schedule-manager-password') && (document.getElementById('schedule-manager-password').value = '');
        document.getElementById('btn-schedule-manager-login')?.classList.add('hidden');
        document.getElementById('btn-show-post-schedule')?.classList.remove('hidden');
        document.getElementById('manager-auth')?.classList.add('hidden');
        document.getElementById('manager-dashboard')?.classList.remove('hidden');

        const { loadSchedules } = await import('./schedule.js');
        loadSchedules();
      } catch (err) {
        showToast('Error during login.', 'error');
      }
    });
  }

  // Timesheet body delegation
  const timesheetBody = document.getElementById('timesheet-body');
  const biweeklyHistoryBody = document.getElementById('biweekly-history-body-payroll');
  const monthlyArchiveBody = document.getElementById('monthly-archive-body-payroll');

  [timesheetBody, biweeklyHistoryBody, monthlyArchiveBody].forEach(tbody => {
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-manage-logs')) {
          openManageLogs(e.target.dataset.id, e.target.dataset.name);
        }
      });
    }
  });

  // Pending approvals delegation
  const pendingPinsBody = document.getElementById('pending-pins-body');
  if (pendingPinsBody) {
    pendingPinsBody.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const val = e.target.dataset.val;

      if (e.target.classList.contains('btn-approve-pin')) {
        try {
          const { error } = await window.supabaseClient.from('users').update({ pin: val, pending_pin: null }).eq('id', id);
          if (error) throw error;
          showToast('PIN change approved');
          loadTimesheets();
        } catch (err) { showToast('Failed to approve PIN change.', 'error'); }
      } else if (e.target.classList.contains('btn-reject-pin')) {
        try {
          await window.supabaseClient.from('users').update({ pending_pin: null }).eq('id', id);
          showToast('PIN request rejected');
          loadTimesheets();
        } catch (err) { showToast('Failed to reject PIN request.', 'error'); }
      } else if (e.target.classList.contains('btn-approve-pwd')) {
        try {
          await window.supabaseClient.from('users').update({ password: val, pending_password: null }).eq('id', id);
          showToast('Password reset approved!');
          loadTimesheets();
        } catch (err) { showToast('Failed to approve password reset.', 'error'); }
      } else if (e.target.classList.contains('btn-reject-pwd')) {
        try {
          await window.supabaseClient.from('users').update({ pending_password: null }).eq('id', id);
          showToast('Password reset rejected');
          loadTimesheets();
        } catch (err) { showToast('Failed to reject password reset.', 'error'); }
      } else if (e.target.classList.contains('btn-approve-account')) {
        try {
          await window.supabaseClient.from('users').update({ is_approved: true }).eq('id', id);
          showToast('Account approved!');
          loadTimesheets();
        } catch (err) { showToast('Failed to approve account.', 'error'); }
      } else if (e.target.classList.contains('btn-reject-account')) {
        try {
          await window.supabaseClient.from('users').delete().eq('id', id);
          showToast('Account request removed');
          loadTimesheets();
        } catch (err) { showToast('Failed to reject account.', 'error'); }
      }
    });
  }

  // Time off delegation
  const managerTimeoffBody = document.getElementById('manager-timeoff-body');
  if (managerTimeoffBody) {
    managerTimeoffBody.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if (e.target.classList.contains('btn-approve-timeoff')) {
        try {
          await window.supabaseClient.from('time_off_requests').update({ status: 'Approved' }).eq('id', id);
          showToast('Time off approved!');
          loadTimesheets();
        } catch (err) { showToast('Failed to approve time off.', 'error'); }
      } else if (e.target.classList.contains('btn-deny-timeoff')) {
        try {
          await window.supabaseClient.from('time_off_requests').update({ status: 'Denied' }).eq('id', id);
          showToast('Time off denied.');
          loadTimesheets();
        } catch (err) { showToast('Failed to deny time off.', 'error'); }
      }
    });
  }

  // Manage logs modal
  const modalManageLogs = document.getElementById('modal-manage-logs');
  const manageLogsBody = document.getElementById('manage-logs-body');
  const btnCloseManage = document.getElementById('btn-close-manage');
  const btnDeleteEmployee = document.getElementById('btn-delete-employee');
  const btnAddLog = document.getElementById('btn-add-log');
  const modalEditPunch = document.getElementById('modal-edit-punch');
  const editPunchAction = document.getElementById('edit-punch-action');
  const editPunchDatetime = document.getElementById('edit-punch-datetime');
  const btnCancelEditPunch = document.getElementById('btn-cancel-edit-punch');
  const btnSaveEditPunch = document.getElementById('btn-save-edit-punch');

  if (btnCloseManage) {
    btnCloseManage.addEventListener('click', () => {
      if (modalManageLogs) modalManageLogs.classList.add('hidden');
      state.selectedEmployeeForLogs = null;
      loadTimesheets();
    });
  }

  if (btnDeleteEmployee) {
    btnDeleteEmployee.addEventListener('click', async () => {
      if (!state.selectedEmployeeForLogs) return;
      if (!confirm('Are you ABSOLUTELY sure? This permanently removes the employee and all their time logs.')) return;
      try {
        await window.supabaseClient.from('time_logs').delete().eq('user_id', state.selectedEmployeeForLogs);
        const { error } = await window.supabaseClient.from('users').delete().eq('id', state.selectedEmployeeForLogs);
        if (error) throw error;
        showToast('Employee deleted successfully');
        if (modalManageLogs) modalManageLogs.classList.add('hidden');
        state.selectedEmployeeForLogs = null;
        loadTimesheets();
      } catch (err) { showToast('Failed to delete employee.', 'error'); }
    });
  }

  if (manageLogsBody) {
    manageLogsBody.addEventListener('click', async (e) => {
      if (e.target.classList.contains('btn-delete-log')) {
        const logId = e.target.dataset.id;
        if (!confirm('Delete this punch?')) return;
        try {
          const { error } = await window.supabaseClient.from('time_logs').delete().eq('id', logId);
          if (error) throw error;
          showToast('Log deleted successfully');
          await loadEmployeeLogs();
        } catch (err) { showToast('Failed to delete log.', 'error'); }
      } else if (e.target.classList.contains('btn-edit-log')) {
        state.currentEditingPunchId = e.target.dataset.id;
        if (editPunchAction) editPunchAction.value = e.target.dataset.action;
        const d = new Date(e.target.dataset.time);
        const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        if (editPunchDatetime) editPunchDatetime.value = localISO;
        if (modalEditPunch) modalEditPunch.classList.remove('hidden');
      } else if (e.target.dataset.fullPhoto === 'true') {
        openFullPhoto(e.target.src);
      }
    });
  }

  if (btnCancelEditPunch) {
    btnCancelEditPunch.addEventListener('click', () => {
      if (modalEditPunch) modalEditPunch.classList.add('hidden');
      state.currentEditingPunchId = null;
    });
  }

  if (btnSaveEditPunch) {
    btnSaveEditPunch.addEventListener('click', async () => {
      if (!state.currentEditingPunchId) return;
      const localDate = new Date(editPunchDatetime.value);
      if (isNaN(localDate.getTime())) { showToast('Invalid date/time', 'error'); return; }
      try {
        const { error } = await window.supabaseClient.from('time_logs')
          .update({ action: editPunchAction.value, created_at: localDate.toISOString() })
          .eq('id', state.currentEditingPunchId);
        if (error) throw error;
        showToast('Punch updated successfully!');
        if (modalEditPunch) modalEditPunch.classList.add('hidden');
        state.currentEditingPunchId = null;
        await loadEmployeeLogs();
      } catch (err) { showToast('Failed to update punch.', 'error'); }
    });
  }

  if (btnAddLog) {
    btnAddLog.addEventListener('click', async () => {
      if (!state.selectedEmployeeForLogs) return;
      const action = document.getElementById('new-log-action')?.value;
      const timeVal = document.getElementById('new-log-time')?.value;
      if (!timeVal) { showToast('Please select a date and time', 'error'); return; }
      try {
        const { error } = await window.supabaseClient.from('time_logs').insert([{
          user_id: state.selectedEmployeeForLogs,
          action,
          created_at: new Date(timeVal).toISOString()
        }]);
        if (error) throw error;
        showToast('Manual punch added');
        const newLogTime = document.getElementById('new-log-time');
        if (newLogTime) newLogTime.value = '';
        await loadEmployeeLogs();
      } catch (err) { showToast('Failed to add manual log.', 'error'); }
    });
  }

  // Save employee details
  const btnSaveEmployeeDetails = document.getElementById('btn-save-employee-details');
  if (btnSaveEmployeeDetails) {
    btnSaveEmployeeDetails.addEventListener('click', async () => {
      if (!state.selectedEmployeeForLogs) return;
      const firstName = document.getElementById('edit-employee-first-name')?.value.trim();
      const lastName = document.getElementById('edit-employee-last-name')?.value.trim();
      const loginName = document.getElementById('edit-employee-login-name')?.value.trim();
      const payRate = parseFloat(document.getElementById('edit-employee-pay-rate')?.value) || 0;
      const isSalary = document.getElementById('edit-employee-is-salary')?.checked || false;
      const taxStatusEl = document.getElementById('edit-employee-tax-status');
      const taxStatus = taxStatusEl ? taxStatusEl.value : null;

      if (!firstName || !lastName || !loginName) {
        showToast('All name fields are required', 'error');
        return;
      }

      const payrollName = `${lastName}, ${firstName}`;
      try {
        const payload = { name: loginName, payroll_name: payrollName, pay_rate: payRate, is_salary: isSalary };
        if (taxStatus !== null) payload.tax_status = taxStatus;

        const { error } = await window.supabaseClient.from('users').update(payload).eq('id', state.selectedEmployeeForLogs);
        if (error) {
          // Retry without optional columns
          const { error: retryError } = await window.supabaseClient.from('users')
            .update({ name: loginName, payroll_name: payrollName, pay_rate: payRate })
            .eq('id', state.selectedEmployeeForLogs);
          if (retryError) throw retryError;
          showToast('Saved (some optional fields skipped — check Supabase schema)', 'warning');
        } else {
          showToast('Employee details updated!');
        }

        if (state.employeeMap[state.selectedEmployeeForLogs]) {
          Object.assign(state.employeeMap[state.selectedEmployeeForLogs], { name: loginName, payroll_name: payrollName, pay_rate: payRate, is_salary: isSalary, tax_status: taxStatus });
        }
        loadTimesheets();
      } catch (err) { showToast('Error updating employee details.', 'error'); }
    });
  }

  // Create user
  const btnShowCreateUser = document.getElementById('btn-show-create-user');
  const modalCreateUser = document.getElementById('modal-create-user');
  const btnConfirmCreate = document.getElementById('btn-confirm-create');
  const btnCancelCreate = document.getElementById('btn-cancel-create');

  if (btnShowCreateUser) btnShowCreateUser.addEventListener('click', () => { if (modalCreateUser) modalCreateUser.classList.remove('hidden'); });
  if (btnCancelCreate) {
    btnCancelCreate.addEventListener('click', () => {
      if (modalCreateUser) modalCreateUser.classList.add('hidden');
      ['new-user-first-name', 'new-user-last-name', 'new-user-login-name', 'new-user-pin', 'new-user-password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    });
  }

  document.querySelectorAll('input[name="new-user-role"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const pwd = document.getElementById('new-user-password');
      if (pwd) {
        if (e.target.value === 'Manager') pwd.classList.remove('hidden');
        else { pwd.classList.add('hidden'); pwd.value = ''; }
      }
    });
  });

  if (btnConfirmCreate) {
    btnConfirmCreate.addEventListener('click', async () => {
      const firstName = document.getElementById('new-user-first-name')?.value.trim();
      const lastName = document.getElementById('new-user-last-name')?.value.trim();
      const name = document.getElementById('new-user-login-name')?.value.trim();
      const pin = document.getElementById('new-user-pin')?.value;
      const role = document.querySelector('input[name="new-user-role"]:checked')?.value;
      const password = document.getElementById('new-user-password')?.value;

      if (!firstName || !lastName || !name || !pin || pin.length !== 4) {
        showToast('Fill in all fields and enter a 4-digit PIN', 'error');
        return;
      }
      if (role === 'Manager' && !password) {
        showToast('Managers must have a dashboard password', 'error');
        return;
      }

      try {
        const { data: existing } = await window.supabaseClient.from('users').select('id').eq('pin', pin).single();
        if (existing) { showToast('PIN is already in use.', 'error'); return; }

        const { error } = await window.supabaseClient.from('users').insert([{
          name, payroll_name: `${lastName}, ${firstName}`, pin, role,
          password: role === 'Manager' ? password : null, is_approved: false
        }]);
        if (error) throw error;

        showToast(`Account request for ${firstName} ${lastName} submitted for approval.`);
        ['new-user-first-name', 'new-user-last-name', 'new-user-login-name', 'new-user-pin', 'new-user-password'].forEach(id => {
          const el = document.getElementById(id); if (el) el.value = '';
        });
        if (modalCreateUser) modalCreateUser.classList.add('hidden');
        loadTimesheets();
      } catch (err) { showToast('Failed to create user.', 'error'); }
    });
  }

  // Forgot password (manager)
  const btnForgotPwd = document.getElementById('btn-forgot-password');
  if (btnForgotPwd) {
    const modalForgotPwd = document.getElementById('modal-forgot-password');
    const forgotPwdName = document.getElementById('forgot-password-name');
    const forgotPwdNew = document.getElementById('forgot-password-new');
    const btnCancelPwdReset = document.getElementById('btn-cancel-password-reset');
    const btnSubmitPwdReset = document.getElementById('btn-submit-password-reset');

    btnForgotPwd.addEventListener('click', () => { if (modalForgotPwd) modalForgotPwd.classList.remove('hidden'); });
    if (btnCancelPwdReset) {
      btnCancelPwdReset.addEventListener('click', () => {
        if (modalForgotPwd) modalForgotPwd.classList.add('hidden');
        if (forgotPwdName) forgotPwdName.value = '';
        if (forgotPwdNew) forgotPwdNew.value = '';
      });
    }
    if (btnSubmitPwdReset) {
      btnSubmitPwdReset.addEventListener('click', async () => {
        const name = forgotPwdName?.value.trim();
        const newPwd = forgotPwdNew?.value;
        if (!name || !newPwd) { showToast('Enter username and new password', 'error'); return; }
        try {
          const { data: user, error } = await window.supabaseClient.from('users').select('id').eq('name', name).eq('role', 'Manager').single();
          if (error || !user) { showToast('Manager username not found', 'error'); return; }
          await window.supabaseClient.from('users').update({ pending_password: newPwd }).eq('id', user.id);
          showToast('Password reset requested! Another manager must approve it.');
          if (modalForgotPwd) modalForgotPwd.classList.add('hidden');
          if (forgotPwdName) forgotPwdName.value = '';
          if (forgotPwdNew) forgotPwdNew.value = '';
        } catch (err) { showToast('Failed to request password reset.', 'error'); }
      });
    }
  }

  // Scroll to approvals
  const btnScrollApprovals = document.getElementById('btn-scroll-approvals');
  if (btnScrollApprovals) {
    btnScrollApprovals.addEventListener('click', () => {
      document.getElementById('pending-pins-section')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Payroll download
  const btnDownloadPayroll = document.getElementById('btn-download-payroll');
  if (btnDownloadPayroll) {
    btnDownloadPayroll.addEventListener('click', async () => {
      try {
        showToast('Generating Payroll CSV...');
        const { data: usersData, error: uErr } = await window.supabaseClient
          .from('users').select('id, name, is_salary');
        const { data: logsData, error: lErr } = await window.supabaseClient
          .from('time_logs').select('user_id, action, created_at').order('created_at', { ascending: true });
        if (uErr || lErr) throw new Error('Fetch failed');

        const startOfWeek = getStartOfWeek().getTime();
        const startOfLastWeek = startOfWeek - 7 * 86400000;
        const empMap = {};
        usersData.forEach(u => { empMap[u.id] = { name: u.name, thisWeekMs: 0, lastWeekMs: 0, status: 'OUT', lastIn: null, is_salary: u.is_salary || false }; });

        logsData.forEach(log => {
          const emp = empMap[log.user_id]; if (!emp) return;
          const time = new Date(log.created_at).getTime();
          if (log.action === 'IN' || log.action === 'END_LUNCH') { emp.status = 'IN'; emp.lastIn = time; }
          else if (log.action === 'OUT' || log.action === 'START_LUNCH') {
            if (emp.status === 'IN' && emp.lastIn) {
              const d = time - emp.lastIn;
              if (emp.lastIn >= startOfWeek) emp.thisWeekMs += d;
              else if (emp.lastIn >= startOfLastWeek) emp.lastWeekMs += d;
            }
            emp.status = 'OUT'; emp.lastIn = null;
          }
        });

        Object.values(empMap).forEach(emp => {
          if (emp.status === 'IN' && emp.lastIn) {
            const d = Date.now() - emp.lastIn;
            if (emp.lastIn >= startOfWeek) emp.thisWeekMs += d;
            else if (emp.lastIn >= startOfLastWeek) emp.lastWeekMs += d;
          }
        });

        const { customPayrollFormat } = state;
        const startDate = new Date(startOfWeek);
        const endDate = new Date(startOfWeek + 6 * 86400000);
        const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
        let currentLabel = customPayrollFormat.current || `${fmt(startDate)} - ${fmt(endDate)}`;
        const nextS = new Date(startOfWeek + 7 * 86400000);
        const nextE = new Date(startOfWeek + 13 * 86400000);
        let nextLabel = customPayrollFormat.next || `${fmt(nextS)} - ${fmt(nextE)}`;

        let csv = `#,Employee Name,${currentLabel},${nextLabel}\n`;
        let count = 1;
        Object.values(empMap).forEach(emp => {
          const hrs = emp.thisWeekMs / 3600000;
          if (hrs === 0 && !emp.is_salary) return;
          csv += `"${count++}","${formatNameLastFirst(emp.name)}",${hrs.toFixed(2)},0.00\n`;
        });

        const safe = currentLabel.replace(/[\/\\]/g, '-').replace(/\s*-\s*/g, '_').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        downloadCsv(csv, `Payroll_Export_${safe}.csv`);
      } catch (err) { showToast('Error exporting payroll: ' + (err.message || ''), 'error'); }
    });
  }
}

function openFullPhoto(src) {
  const modal = document.getElementById('modal-view-photo');
  const fullImg = document.getElementById('full-size-photo');
  if (modal && fullImg) { fullImg.src = src; modal.classList.remove('hidden'); }
}

window.openManageLogs = async function openManageLogs(userId, userName) {
  state.selectedEmployeeForLogs = userId;
  const emp = state.employeeMap[userId];

  ['edit-employee-login-name', 'edit-employee-pay-rate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = emp ? (id === 'edit-employee-pay-rate' ? emp.pay_rate : emp.name) : '';
  });
  const salaryEl = document.getElementById('edit-employee-is-salary');
  if (salaryEl) salaryEl.checked = emp ? emp.is_salary : false;
  const taxEl = document.getElementById('edit-employee-tax-status');
  if (taxEl) taxEl.value = emp ? (emp.tax_status || '') : '';

  const firstEl = document.getElementById('edit-employee-first-name');
  const lastEl = document.getElementById('edit-employee-last-name');
  if (emp && emp.payroll_name && emp.payroll_name.includes(', ')) {
    const [last, first] = emp.payroll_name.split(', ');
    if (lastEl) lastEl.value = last || '';
    if (firstEl) firstEl.value = first || '';
  } else {
    if (firstEl) firstEl.value = emp ? emp.name : '';
    if (lastEl) lastEl.value = '';
  }

  const manageLogsTitle = document.getElementById('manage-logs-title');
  const modalManageLogs = document.getElementById('modal-manage-logs');
  if (manageLogsTitle) manageLogsTitle.textContent = `Manage Logs: ${userName}`;
  if (modalManageLogs) modalManageLogs.classList.remove('hidden');

  await loadEmployeeLogs();
};

// Photo viewer
document.getElementById('btn-close-photo')?.addEventListener('click', () => {
  document.getElementById('modal-view-photo')?.classList.add('hidden');
});

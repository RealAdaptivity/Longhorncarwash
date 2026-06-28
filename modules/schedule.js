import { state, showToast, parseShiftHours } from './utils.js';

export async function loadSchedules() {
  const scheduleList = document.getElementById('schedule-list');
  if (!scheduleList) return;

  try {
    const { data: rawData, error } = await window.supabaseClient.from('schedules').select('*');
    if (error) throw error;

    const data = rawData.sort((a, b) => {
      function getStart(sched) {
        try {
          const content = JSON.parse(sched.content);
          const match = (content.weekRange || '').match(/(\d+)\/(\d+)/);
          if (match) {
            const year = new Date(sched.created_at).getFullYear();
            return new Date(year, parseInt(match[1]) - 1, parseInt(match[2]));
          }
        } catch (e) { console.error('Failed to parse schedule date for sort:', e); }
        return new Date(sched.created_at);
      }
      return getStart(a) - getStart(b);
    });

    const scheduleSelector = document.getElementById('schedule-selector');
    if (scheduleSelector) scheduleSelector.innerHTML = '';
    scheduleList.innerHTML = '';

    if (!data || data.length === 0) {
      scheduleList.innerHTML = '<div style="background:var(--card);padding:30px;border-radius:15px;text-align:center;color:var(--text-muted);">No schedules posted yet.</div>';
      return;
    }

    data.forEach((sched, index) => {
      let parsed;
      try { parsed = JSON.parse(sched.content); } catch (e) { parsed = null; }
      const weekRange = parsed ? (parsed.weekRange || 'Weekly Schedule') : 'Weekly Schedule';

      if (scheduleSelector) {
        const btn = document.createElement('button');
        btn.className = 'btn-ghost';
        btn.style.cssText = 'padding:8px 15px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:0.9rem;transition:all 0.2s;';
        btn.textContent = weekRange;
        btn.onclick = () => {
          document.querySelectorAll('.schedule-card').forEach(c => c.classList.add('hidden'));
          document.getElementById(`schedule-card-${sched.id}`)?.classList.remove('hidden');
          Array.from(scheduleSelector.children).forEach(b => { b.style.borderColor = 'var(--border)'; b.style.background = 'none'; });
          btn.style.borderColor = 'var(--primary)';
          btn.style.background = 'rgba(169,59,47,0.1)';
        };
        if (index === data.length - 1) { btn.style.borderColor = 'var(--primary)'; btn.style.background = 'rgba(169,59,47,0.1)'; }
        scheduleSelector.appendChild(btn);
      }

      const div = document.createElement('div');
      div.id = `schedule-card-${sched.id}`;
      div.className = 'schedule-card' + (index === data.length - 1 ? '' : ' hidden');
      div.style.cssText = 'background:var(--card);padding:20px;border-radius:12px;border:1px solid var(--border);margin-bottom:20px;';

      const time = new Date(sched.created_at).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

      let contentHtml = '';
      if (parsed) {
        try {
          const headersHtml = parsed.headers.map(h => `<th class="sched-day-header">${h}</th>`).join('');
          const activeRows = parsed.rows.filter(r => r.shifts.some(s => s && s !== '-' && s.trim() !== ''));

          const rowsHtml = activeRows.map(r => {
            let rowTotal = 0;
            const cellsHtml = r.shifts.map(s => {
              rowTotal += parseShiftHours(s);
              const isOff = !s || s === '-' || s.trim().toUpperCase() === 'OFF';
              return `<td class="sched-shift-cell${isOff ? ' sched-off' : ''}">${s || '-'}</td>`;
            }).join('');
            const rowDataEncoded = encodeURIComponent(JSON.stringify({ employee: r.employee, shifts: r.shifts, weekRange: parsed.weekRange, headers: parsed.headers }));
            const swapBtn = (state.currentPortalEmployee && r.employee.toLowerCase().includes(state.currentPortalEmployee.name.toLowerCase().split(' ')[0]))
              ? `<button class="btn-request-swap btn-ghost" data-employee="${r.employee}" data-week="${parsed.weekRange}" style="padding:2px 5px;font-size:0.7rem;border:1px solid var(--border);border-radius:4px;">Request Swap</button>` : '';
            return `<tr>
              <td class="sched-emp-cell"><div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><strong>${r.employee}</strong>
              <div style="display:flex;gap:4px;align-items:center;flex-shrink:0;">
                <button data-calendar="${rowDataEncoded}" class="btn-calendar" style="background:none;border:none;cursor:pointer;font-size:1rem;padding:2px;" title="Add to Calendar">📅</button>
                ${swapBtn}
              </div></div></td>
              ${cellsHtml}
              <td class="sched-total-cell">${rowTotal.toFixed(1)}</td>
            </tr>`;
          }).join('');

          // Mobile cards — one per employee
          const cardsHtml = activeRows.map(r => {
            let rowTotal = 0;
            const shiftItems = r.shifts.map((s, i) => {
              rowTotal += parseShiftHours(s);
              const isOff = !s || s === '-' || s.trim().toUpperCase() === 'OFF';
              return `<div class="sched-card-day${isOff ? ' sched-off' : ''}">
                <span class="sched-card-day-label">${parsed.headers[i] || ''}</span>
                <span class="sched-card-shift">${s || '-'}</span>
              </div>`;
            }).join('');
            const rowDataEncoded = encodeURIComponent(JSON.stringify({ employee: r.employee, shifts: r.shifts, weekRange: parsed.weekRange, headers: parsed.headers }));
            const swapBtn = (state.currentPortalEmployee && r.employee.toLowerCase().includes(state.currentPortalEmployee.name.toLowerCase().split(' ')[0]))
              ? `<button class="btn-request-swap btn-ghost" data-employee="${r.employee}" data-week="${parsed.weekRange}" style="padding:4px 8px;font-size:0.75rem;border:1px solid var(--border);border-radius:4px;">Request Swap</button>` : '';
            return `<div class="sched-emp-card">
              <div class="sched-emp-card-header">
                <strong>${r.employee}</strong>
                <div style="display:flex;gap:6px;align-items:center;">
                  <span class="sched-emp-total-badge">${rowTotal.toFixed(1)} hrs</span>
                  <button data-calendar="${rowDataEncoded}" class="btn-calendar" style="background:none;border:none;cursor:pointer;font-size:1rem;padding:2px;" title="Add to Calendar">📅</button>
                  ${swapBtn}
                </div>
              </div>
              <div class="sched-card-days">${shiftItems}</div>
            </div>`;
          }).join('');

          contentHtml = `<h4 style="margin-bottom:15px;color:var(--primary);">${parsed.weekRange || 'Weekly Schedule'}</h4>
            <div class="schedule-desktop-table"><div class="sched-table-scroll"><table class="data-table schedule-full-table"><thead><tr><th>Employee</th>${headersHtml}<th>Total</th></tr></thead><tbody>${rowsHtml}</tbody></table></div></div>
            <div class="schedule-mobile-cards">${cardsHtml}</div>`;
        } catch (e) {
          contentHtml = `<div style="white-space:pre-wrap;line-height:1.5;">${sched.content}</div>`;
        }
      } else {
        contentHtml = `<div style="white-space:pre-wrap;line-height:1.5;">${sched.content}</div>`;
      }

      const editBtn = state.managerLoggedIn
        ? `<button class="btn-primary btn-edit-schedule" data-id="${sched.id}" data-content="${encodeURIComponent(sched.content)}" style="padding:5px 10px;font-size:0.8rem;border:none;border-radius:4px;cursor:pointer;margin-right:5px;">Edit</button>` : '';
      const deleteBtn = state.managerLoggedIn
        ? `<button class="btn-danger btn-delete-schedule" data-id="${sched.id}" style="padding:5px 10px;font-size:0.8rem;border:none;border-radius:4px;cursor:pointer;">Delete</button>` : '';

      div.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:15px;border-bottom:1px solid var(--border);padding-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <span>Posted on ${time}</span><div>${editBtn}${deleteBtn}</div></div>${contentHtml}`;

      scheduleList.appendChild(div);
    });

  } catch (e) {
    scheduleList.innerHTML = '<div style="background:var(--card);padding:30px;border-radius:15px;text-align:center;color:var(--danger);">Failed to load schedules.</div>';
  }
}

// --- Calendar Export ---
window.downloadCalendar = function downloadCalendar(encodedData) {
  try {
    const data = JSON.parse(decodeURIComponent(encodedData));
    const { employee, shifts, weekRange } = data;
    const year = new Date().getFullYear();
    let baseDate = new Date();

    try {
      const parts = weekRange.split('-').map(p => p.trim());
      const startPart = parts[0];
      if (startPart.includes('/')) {
        const [m, d] = startPart.split('/').map(Number);
        if (!isNaN(m) && !isNaN(d)) baseDate = new Date(year, m - 1, d);
      } else {
        const p = new Date(`${startPart}, ${year}`);
        if (!isNaN(p.getTime())) baseDate = p;
      }
    } catch (e) { console.error('Failed to parse week range for calendar:', e); }

    let icsContent = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Longhorn Car Wash//Timeclock//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];

    shifts.forEach((s, idx) => {
      if (!s || s === '-' || s.toLowerCase() === 'off' || s.toLowerCase() === 'oc') return;
      const hours = s.split('-');
      if (hours.length < 2) return;

      function parseTime(ts) {
        let [h, m] = ts.split(':').map(Number);
        if (isNaN(m)) m = 0;
        return { h, m };
      }

      const start = parseTime(hours[0].trim());
      const end = parseTime(hours[1].trim());
      let sh = start.h, eh = end.h;
      if (sh >= 1 && sh < 7) sh += 12;
      if (eh <= sh && eh !== 0) eh += 12;

      const formatDate = (offset, h, m) => {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + offset);
        d.setHours(h, m, 0);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
      };

      const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const uid = `shift-${employee.replace(/\s+/g, '-')}-${idx}-${Date.now()}@longhorn.com`;
      icsContent.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${dtStamp}`, `SUMMARY:Car Wash Shift: ${employee}`, `DTSTART:${formatDate(idx, sh, start.m)}`, `DTEND:${formatDate(idx, eh, end.m)}`, 'LOCATION:Longhorn Car Wash', 'END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');
    const content = icsContent.join('\r\n');
    const fileName = `${employee}_Schedule.ics`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      window.location.href = `data:text/calendar;base64,${btoa(unescape(encodeURIComponent(content)))}`;
    } else {
      const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    showToast('Calendar file generated!');
  } catch (err) {
    console.error(err);
    showToast('Failed to generate calendar file.', 'error');
  }
};

export function init() {
  const scheduleList = document.getElementById('schedule-list');
  const btnShowPostSchedule = document.getElementById('btn-show-post-schedule');
  const postScheduleSection = document.getElementById('post-schedule-section');
  const scheduleWeekRange = document.getElementById('schedule-week-range');
  const scheduleEditorBody = document.getElementById('schedule-editor-body');
  const btnSubmitSchedule = document.getElementById('btn-submit-schedule');
  const scheduleHeaderInputs = document.querySelectorAll('.schedule-header-input');
  const btnPrintSchedule = document.getElementById('btn-print-schedule');
  const btnScheduleManagerLogin = document.getElementById('btn-schedule-manager-login');
  const scheduleManagerAuth = document.getElementById('schedule-manager-auth');

  if (btnPrintSchedule) btnPrintSchedule.addEventListener('click', () => window.print());

  if (btnScheduleManagerLogin) {
    btnScheduleManagerLogin.addEventListener('click', () => {
      if (scheduleManagerAuth) scheduleManagerAuth.classList.toggle('hidden');
    });
  }

  if (btnShowPostSchedule) {
    btnShowPostSchedule.addEventListener('click', async () => {
      state.editingScheduleId = null;
      if (btnSubmitSchedule) btnSubmitSchedule.textContent = 'Post Schedule';
      if (scheduleWeekRange) scheduleWeekRange.value = '';
      if (postScheduleSection) postScheduleSection.classList.toggle('hidden');

      if (postScheduleSection && !postScheduleSection.classList.contains('hidden')) {
        try {
          const { data: users } = await window.supabaseClient.from('users').select('name').eq('is_approved', true).order('name', { ascending: true });
          if (scheduleEditorBody) scheduleEditorBody.innerHTML = '';
          if (users) {
            users.forEach(u => {
              const tr = document.createElement('tr');
              const inputs = Array(7).fill(0).map(() => `<td><input type="text" class="input-field sched-cell" placeholder="-" style="padding:5px;text-align:center;margin-bottom:0;"></td>`).join('');
              tr.innerHTML = `<td><strong>${u.name}</strong></td>${inputs}<td style="text-align:center;font-weight:bold;">-</td>`;
              scheduleEditorBody.appendChild(tr);
            });
          }
          scheduleHeaderInputs.forEach((inp, idx) => { inp.value = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'][idx]; });
        } catch (e) { showToast('Failed to load employees for schedule editor.', 'error'); }
      }
    });
  }

  if (scheduleWeekRange) {
    scheduleWeekRange.addEventListener('input', () => {
      const val = scheduleWeekRange.value.trim();
      if (!val) return;
      try {
        const match = val.match(/(\d+)\/(\d+)/);
        if (!match) return;
        const startDate = new Date(new Date().getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]));
        if (isNaN(startDate.getTime())) return;
        scheduleHeaderInputs.forEach((inp, idx) => {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + idx);
          inp.value = `${['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'][idx]} ${d.getMonth() + 1}/${d.getDate()}`;
        });
      } catch (e) { console.error('Failed to auto-fill schedule date headers:', e); }
    });
  }

  if (btnSubmitSchedule) {
    btnSubmitSchedule.addEventListener('click', async () => {
      btnSubmitSchedule.disabled = true;
      btnSubmitSchedule.style.opacity = '0.5';

      const weekRange = scheduleWeekRange ? (scheduleWeekRange.value.trim() || 'Weekly Schedule') : 'Weekly Schedule';
      const headers = Array.from(document.querySelectorAll('.schedule-header-input')).map(i => i.value || '-');
      const rows = [];
      scheduleEditorBody?.querySelectorAll('tr').forEach(tr => {
        const employee = tr.querySelector('td strong')?.innerText || '';
        const shifts = Array.from(tr.querySelectorAll('.sched-cell')).map(i => i.value || '-');
        rows.push({ employee, shifts });
      });

      const scheduleData = { weekRange, headers, rows };

      // Conflict detection
      try {
        const { data: timeoffs } = await window.supabaseClient.from('time_off_requests').select('*').eq('status', 'Approved');
        if (timeoffs) {
          const conflicts = rows.filter(row => {
            const emp = Object.values(state.employeeMap).find(e => e.name.toLowerCase() === row.employee.toLowerCase());
            if (!emp) return false;
            const hasShifts = row.shifts.some(s => s && s !== '-' && s.trim() !== '');
            return hasShifts && timeoffs.some(t => t.user_id === emp.id);
          }).map(r => r.employee);

          if (conflicts.length > 0 && !confirm(`Warning: These employees have approved time-off: ${conflicts.join(', ')}. Proceed?`)) {
            btnSubmitSchedule.disabled = false;
            btnSubmitSchedule.style.opacity = '1';
            return;
          }
        }
      } catch (e) { console.error('Conflict detection error', e); }

      try {
        let error;
        if (state.editingScheduleId) {
          ({ error } = await window.supabaseClient.from('schedules').update({ content: JSON.stringify(scheduleData) }).eq('id', state.editingScheduleId));
        } else {
          ({ error } = await window.supabaseClient.from('schedules').insert([{ content: JSON.stringify(scheduleData) }]));
        }
        if (error) throw error;
        
        // Notify employees about schedule update
        try {
          const employeeNames = rows.map(r => r.employee);
          const { data: users } = await window.supabaseClient.from('users').select('name, push_token').in('name', employeeNames).not('push_token', 'is', null);
          if (users && users.length > 0) {
            for (const u of users) {
              if (u.push_token) {
                await fetch('https://exp.host/--/api/v2/push/send', {
                  method: 'POST',
                  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: u.push_token,
                    sound: 'default',
                    title: 'Schedule Update',
                    body: `Your schedule for ${weekRange} has been posted/updated.`
                  })
                });
              }
            }
          }
        } catch (pushErr) {
          console.error('Failed to send push notifications', pushErr);
        }

        showToast(state.editingScheduleId ? 'Schedule updated!' : 'Schedule posted!');
        state.editingScheduleId = null;
        if (postScheduleSection) postScheduleSection.classList.add('hidden');
        loadSchedules();
      } catch (err) {
        showToast('Failed to save schedule.', 'error');
      } finally {
        btnSubmitSchedule.disabled = false;
        btnSubmitSchedule.style.opacity = '1';
      }
    });
  }

  // Schedule list delegation (edit, delete, calendar, swap)
  if (scheduleList) {
    scheduleList.addEventListener('click', async (e) => {
      if (e.target.classList.contains('btn-edit-schedule')) {
        state.editingScheduleId = e.target.dataset.id;
        try {
          const parsed = JSON.parse(decodeURIComponent(e.target.dataset.content));
          if (scheduleWeekRange) scheduleWeekRange.value = parsed.weekRange || '';
          parsed.headers.forEach((h, idx) => { if (scheduleHeaderInputs[idx]) scheduleHeaderInputs[idx].value = h; });
          if (scheduleEditorBody) scheduleEditorBody.innerHTML = '';

          const { data: currentUsers } = await window.supabaseClient.from('users').select('name').eq('is_approved', true).order('name', { ascending: true });
          (currentUsers || []).forEach(u => {
            const savedRow = parsed.rows.find(r => r.employee === u.name);
            const shifts = savedRow ? savedRow.shifts : ['-', '-', '-', '-', '-', '-', '-'];
            let rowTotal = 0;
            const cellsHtml = shifts.map(s => { rowTotal += parseShiftHours(s); return `<td><input type="text" class="input-field sched-cell" value="${s}" style="padding:5px;text-align:center;margin-bottom:0;"></td>`; }).join('');
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${u.name}</strong></td>${cellsHtml}<td style="text-align:center;font-weight:bold;">${rowTotal.toFixed(1)}</td>`;
            scheduleEditorBody?.appendChild(tr);
          });

          if (btnSubmitSchedule) btnSubmitSchedule.textContent = 'Save Changes';
          if (postScheduleSection) { postScheduleSection.classList.remove('hidden'); postScheduleSection.scrollIntoView({ behavior: 'smooth' }); }
        } catch (err) { showToast('Could not load schedule for editing.', 'error'); }

      } else if (e.target.classList.contains('btn-delete-schedule')) {
        if (!confirm('Delete this schedule?')) return;
        try {
          const { error } = await window.supabaseClient.from('schedules').delete().eq('id', e.target.dataset.id);
          if (error) throw error;
          showToast('Schedule deleted');
          loadSchedules();
        } catch (err) { showToast('Failed to delete schedule.', 'error'); }

      } else if (e.target.classList.contains('btn-calendar')) {
        window.downloadCalendar(e.target.dataset.calendar);

      } else if (e.target.classList.contains('btn-request-swap')) {
        const emp = e.target.dataset.employee;
        const week = e.target.dataset.week;
        const modalShiftSwap = document.getElementById('modal-shift-swap');
        const swapTargetEmployee = document.getElementById('swap-target-employee');

        if (swapTargetEmployee) {
          try {
            const { data: users } = await window.supabaseClient.from('users').select('name').eq('is_approved', true);
            swapTargetEmployee.innerHTML = '<option value="">Select a teammate...</option>';
            (users || []).forEach(u => {
              if (u.name !== emp) {
                const opt = document.createElement('option');
                opt.value = u.name; opt.textContent = u.name;
                swapTargetEmployee.appendChild(opt);
              }
            });
          } catch (e) { showToast('Failed to load employees for swap.', 'error'); }
        }

        if (modalShiftSwap) { modalShiftSwap.dataset.originator = emp; modalShiftSwap.dataset.week = week; modalShiftSwap.classList.remove('hidden'); }
      }
    });
  }

  // Shift swap modal
  const btnCancelSwap = document.getElementById('btn-cancel-swap');
  const btnSubmitSwap = document.getElementById('btn-submit-swap');
  const modalShiftSwap = document.getElementById('modal-shift-swap');

  if (btnCancelSwap) btnCancelSwap.addEventListener('click', () => { if (modalShiftSwap) modalShiftSwap.classList.add('hidden'); });
  if (btnSubmitSwap) {
    btnSubmitSwap.addEventListener('click', async () => {
      const target = document.getElementById('swap-target-employee')?.value;
      const details = document.getElementById('swap-details')?.value.trim();
      if (!target || !details) { showToast('Please select a teammate and provide details.', 'error'); return; }
      try {
        const { error } = await window.supabaseClient.from('shift_swaps').insert([{
          original_user_id: state.currentPortalEmployee?.id,
          target_user_id: null, shift_date: new Date(),
          status: 'Pending', created_at: new Date().toISOString()
        }]);
        if (error) throw error;
        showToast('Swap request sent to manager!');
        if (modalShiftSwap) modalShiftSwap.classList.add('hidden');
      } catch (e) { showToast('Failed to send swap request.', 'error'); }
    });
  }

  // Schedule templates
  const btnSaveTemplate = document.getElementById('btn-save-schedule-template');
  const btnLoadTemplate = document.getElementById('btn-load-schedule-template');

  if (btnSaveTemplate) {
    btnSaveTemplate.addEventListener('click', async () => {
      const rows = [];
      document.querySelectorAll('#schedule-editor-table tbody tr').forEach(tr => {
        const empName = tr.cells[0].textContent;
        const shifts = Array.from(tr.querySelectorAll('.schedule-shift-input')).map(i => i.value);
        rows.push({ employee: empName, shifts });
      });
      try {
        const { saveSettingRobust } = await import('./utils.js');
        await saveSettingRobust('schedule_template_standard', JSON.stringify(rows));
        showToast('Schedule saved as standard template!');
      } catch (e) { showToast('Failed to save template.', 'error'); }
    });
  }

  if (btnLoadTemplate) {
    btnLoadTemplate.addEventListener('click', async () => {
      try {
        const { data, error } = await window.supabaseClient.from('settings').select('value').eq('id', 'schedule_template_standard').limit(1);
        if (error || !data || data.length === 0) { showToast('No template found.', 'error'); return; }
        const rows = JSON.parse(data[0].value);
        const tbody = document.querySelector('#schedule-editor-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        rows.forEach(r => {
          const tr = document.createElement('tr');
          const cells = r.shifts.map(s => `<td><input type="text" class="input-field schedule-shift-input" value="${s}" style="width:70px;margin-bottom:0;text-align:center;" /></td>`).join('');
          tr.innerHTML = `<td>${r.employee}</td>${cells}`;
          tbody.appendChild(tr);
        });
        showToast('Template loaded!');
      } catch (e) { showToast('Failed to load template.', 'error'); }
    });
  }

}

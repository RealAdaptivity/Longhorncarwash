import { state, showToast, saveSettingRobust } from './utils.js';

const btnShowAnalytics = document.getElementById('btn-show-analytics');
const btnCloseAnalytics = document.getElementById('btn-close-analytics');
const managerAnalyticsSection = document.getElementById('manager-analytics-section');
const dailyRevenueInput = document.getElementById('daily-revenue-input');
const laborGoalInput = document.getElementById('labor-goal-input');
const btnSaveRevenueGoals = document.getElementById('btn-save-revenue-goals');
const analyticsLaborCost = document.getElementById('analytics-labor-cost');
const analyticsLaborPercent = document.getElementById('analytics-labor-percent');
const analyticsNetProfit = document.getElementById('analytics-net-profit');
const analyticsRevenueInput = document.getElementById('analytics-revenue-input');

export function initCharts() {
  if (!window.Chart) return;

  const ctxLabor = document.getElementById('labor-hours-chart');
  if (!ctxLabor) return;

  if (state.laborHoursChart) state.laborHoursChart.destroy();

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyTotals = [0, 0, 0, 0, 0, 0, 0];

  Object.values(state.employeeMap).forEach((emp) => {
    if (emp.weekMs) {
      emp.weekMs.forEach((ms, i) => {
        dailyTotals[i] += ms / (1000 * 60 * 60);
      });
    }
  });

  state.laborHoursChart = new window.Chart(ctxLabor.getContext('2d'), {
    type: 'bar',
    data: {
      labels: days,
      datasets: [
        {
          label: 'Total Hours',
          data: dailyTotals,
          backgroundColor: 'rgba(169, 59, 47, 0.6)',
          borderColor: 'rgba(169, 59, 47, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
    },
  });

  const ctxStatus = document.getElementById('status-distribution-chart');
  if (!ctxStatus) return;

  if (state.statusDistributionChart) state.statusDistributionChart.destroy();

  let inCount = 0,
    outCount = 0,
    lunchCount = 0;
  Object.values(state.employeeMap).forEach((emp) => {
    if (emp.currentStatus === 'IN') inCount++;
    else if (emp.currentStatus === 'LUNCH') lunchCount++;
    else outCount++;
  });

  state.statusDistributionChart = new window.Chart(ctxStatus.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Clocked In', 'On Lunch', 'Clocked Out'],
      datasets: [
        {
          data: [inCount, lunchCount, outCount],
          backgroundColor: ['#2e7d32', '#ffa000', '#c62828'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

export function calculateAnalytics() {
  let totalLaborCost = 0;
  let activeLaborCost = 0;
  let completedLaborCost = 0;
  let activeCount = 0;
  let offlineCount = 0;

  Object.values(state.employeeMap).forEach((emp) => {
    const totalMs = emp.weekMs ? emp.weekMs.reduce((a, b) => a + b, 0) : 0;
    const hrs = totalMs / (1000 * 60 * 60);
    let cost = 0;
    if (emp.is_salary) {
      cost = emp.pay_rate / 2;
    } else {
      cost = hrs * (emp.pay_rate || 0);
    }
    totalLaborCost += cost;

    if (emp.currentStatus === 'IN' || emp.currentStatus === 'LUNCH') {
      activeLaborCost += cost;
      activeCount++;
    } else {
      completedLaborCost += cost;
      offlineCount++;
    }
  });

  if (analyticsLaborCost) analyticsLaborCost.textContent = `$${totalLaborCost.toFixed(2)}`;

  const activeCostEl = document.getElementById('analytics-active-labor-cost');
  const completedCostEl = document.getElementById('analytics-completed-labor-cost');
  if (activeCostEl) {
    activeCostEl.textContent = `$${activeLaborCost.toFixed(2)} (${activeCount} Active)`;
  }
  if (completedCostEl) {
    completedCostEl.textContent = `$${completedLaborCost.toFixed(2)} (${offlineCount} Offline)`;
  }

  const goalDisplay = document.getElementById('analytics-labor-goal-display');
  if (goalDisplay) {
    goalDisplay.textContent = `${state.laborCostGoalPercent}%`;
  }

  let weeklyRevenue = 0;
  let hasRevenue = false;

  const customRevVal = analyticsRevenueInput ? parseFloat(analyticsRevenueInput.value.trim()) : NaN;
  if (!isNaN(customRevVal) && customRevVal >= 0) {
    weeklyRevenue = customRevVal;
    hasRevenue = true;
  } else if (state.dailyRevenueGoal > 0) {
    weeklyRevenue = state.dailyRevenueGoal * 7;
    hasRevenue = true;
  }

  if (hasRevenue) {
    if (weeklyRevenue > 0) {
      const laborPercent = (totalLaborCost / weeklyRevenue) * 100;
      if (analyticsLaborPercent) {
        analyticsLaborPercent.textContent = `${laborPercent.toFixed(1)}%`;
        analyticsLaborPercent.style.color =
          laborPercent > state.laborCostGoalPercent ? 'var(--danger)' : 'var(--success)';
      }
    } else {
      if (analyticsLaborPercent) {
        analyticsLaborPercent.textContent = totalLaborCost > 0 ? '--%' : '0.0%';
        analyticsLaborPercent.style.color = totalLaborCost > 0 ? 'var(--danger)' : 'var(--success)';
      }
    }
    const netProfit = weeklyRevenue - totalLaborCost;
    if (analyticsNetProfit) {
      analyticsNetProfit.textContent =
        netProfit < 0 ? `-$${Math.abs(netProfit).toFixed(2)}` : `$${netProfit.toFixed(2)}`;
    }
  } else {
    if (analyticsLaborPercent) analyticsLaborPercent.textContent = '--%';
    if (analyticsNetProfit) analyticsNetProfit.textContent = '--';
  }
}

export function init() {
  if (btnShowAnalytics) {
    btnShowAnalytics.addEventListener('click', () => {
      if (managerAnalyticsSection) managerAnalyticsSection.classList.remove('hidden');
      initCharts();
      calculateAnalytics();
    });
  }

  if (btnCloseAnalytics) {
    btnCloseAnalytics.addEventListener('click', () => {
      if (managerAnalyticsSection) managerAnalyticsSection.classList.add('hidden');
    });
  }

  if (btnSaveRevenueGoals) {
    btnSaveRevenueGoals.addEventListener('click', async () => {
      const rev = parseFloat(dailyRevenueInput ? dailyRevenueInput.value : '0') || 0;
      const goal = parseFloat(laborGoalInput ? laborGoalInput.value : '25') || 25;
      try {
        await saveSettingRobust('daily_revenue_goal', rev.toString());
        await saveSettingRobust('labor_cost_goal_percent', goal.toString());
        state.dailyRevenueGoal = rev;
        state.laborCostGoalPercent = goal;
        showToast('Revenue metrics saved!', 'success');
        calculateAnalytics();
      } catch (e) {
        showToast('Failed to save metrics', 'error');
      }
    });
  }

  if (analyticsRevenueInput) {
    analyticsRevenueInput.addEventListener('input', () => calculateAnalytics());
  }
}

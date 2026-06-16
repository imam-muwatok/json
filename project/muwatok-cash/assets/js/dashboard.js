window.renderDashboard = () => {
    const transactions = AppData.get('muwatok_cash_data').transactions || [];
    const savings = AppData.get('muwatok_cash_savings') || [];
    const now = new Date();
    const month = now.getMonth(), year = now.getFullYear();
    const budgetSource = localStorage.getItem('muwatok_cash_budget_source') || 'all_income';

    let stats = { bal: 0, inc: 0, exp: 0 };
    transactions.forEach(t => {
      const amt = parseFloat(t.amount);
      const d = new Date(t.date);
      const isCurrent = d.getMonth() === month && d.getFullYear() === year;
      if (t.type === 'pemasukan') {
        stats.bal += amt;
        if (isCurrent) {
          if (budgetSource === 'salary_only') {
            if (t.tag && t.tag.toLowerCase() === 'gaji') { // Assuming 'gaji' is the salary tag
              stats.inc += amt;
            }
          } else { // 'all_income'
            stats.inc += amt;
          }
        }
      } else {
        stats.bal -= amt;
        if (isCurrent && !t.excludeFromBudget) stats.exp += amt;
      }
    });

    const prevMonthDate = new Date(year, month - 1, 1);
    const pMonth = prevMonthDate.getMonth(), pYear = prevMonthDate.getFullYear();
    let prevStats = { inc: 0, exp: 0 };
    transactions.forEach(t => {
      const amt = parseFloat(t.amount);
      const d = new Date(t.date);
      if (d.getMonth() === pMonth && d.getFullYear() === pYear) {
        if (t.type === 'pemasukan') {
          if (budgetSource === 'salary_only') {
            if (t.tag && t.tag.toLowerCase() === 'gaji') {
              prevStats.inc += amt;
            }
          } else { // 'all_income'
            prevStats.inc += amt;
          }
        }
        else if (!t.excludeFromBudget) prevStats.exp += amt;
      }
    });

    const savingTrans = AppData.get('muwatok_cash_saving_transactions');
    savingTrans.forEach(st => { stats.bal -= parseFloat(st.amount) || 0; });

    const investmentTrans = AppData.get('muwatok_cash_investment_transactions');
    investmentTrans.forEach(it => { stats.bal -= parseFloat(it.amount) || 0; });

    // Calculate previous month's total balance
    let prevMonthTotalBalance = 0;
    const endOfPrevMonth = new Date(year, month, 0, 23, 59, 59, 999); // Last millisecond of previous month

    transactions.forEach(t => {
        const amt = parseFloat(t.amount);
        const d = new Date(t.date);
        if (d <= endOfPrevMonth) { // Only consider transactions up to the end of the previous month
            if (t.type === 'pemasukan') {
                prevMonthTotalBalance += amt;
            } else {
                prevMonthTotalBalance -= amt;
            }
        }
    });

    savingTrans.forEach(st => {
        const d = new Date(st.date);
        if (d <= endOfPrevMonth) { prevMonthTotalBalance -= parseFloat(st.amount) || 0; }
    });

    investmentTrans.forEach(it => {
        const d = new Date(it.date);
        if (d <= endOfPrevMonth) { prevMonthTotalBalance -= parseFloat(it.amount) || 0; }
    });
    const totalSavingsAmount = savings.reduce((acc, s) => acc + (parseFloat(s.current) || 0), 0);
    const totalSavingsTarget = savings.reduce((acc, s) => acc + (parseFloat(s.target) || 0), 0);

    const updateEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = AppData.formatIDR(val); };
    updateEl('totalBalance', stats.bal);
    updateEl('monthlyIncome', stats.inc);
    updateEl('monthlyExpenses', stats.exp);
    updateEl('totalSavings', totalSavingsAmount);
    updateEl('totalSpentLabel', stats.exp);

    // Update Savings Progress
    const sPercent = document.getElementById('savingsPercent');
    const sBar = document.getElementById('savingsProgressBar');
    const sTargetLabel = document.getElementById('savingsTargetLabel');
    if (sPercent && sBar && sTargetLabel) {
        const p = totalSavingsTarget > 0 ? Math.min((totalSavingsAmount / totalSavingsTarget) * 100, 100).toFixed(1) : 0;
        sPercent.textContent = `${p}%`;
        sBar.style.width = `${p}%`;
        sTargetLabel.textContent = `Goal: ${AppData.formatIDR(totalSavingsTarget)}`;
    }

    const updateTrend = (id, current, previous) => {
      const container = document.getElementById(id);
      const icon = document.getElementById(id + 'Icon');
      const value = document.getElementById(id + 'Value');
      if (!container || !icon || !value) return;
      
      let pct = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);
      const isPositive = pct >= 0;
      container.className = `inline-flex items-center gap-1 text-xs font-medium mt-2 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
      icon.className = `fas fa-arrow-trend-${isPositive ? 'up' : 'down'}`;
      value.textContent = `${isPositive ? '+' : ''}${pct.toFixed(1)}%`;
    };

    updateTrend('incomeTrend', stats.inc, prevStats.inc);
    updateTrend('expenseTrend', stats.exp, prevStats.exp);
    updateTrend('balanceTrend', stats.bal, prevMonthTotalBalance);

    const recentList = document.getElementById('recentTransactionsList');
    if (recentList) {
      const recent = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      recentList.innerHTML = recent.map(t => {
        const isInc = t.type === 'pemasukan';
        return `
          <div class="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-${isInc ? 'emerald' : 'rose'}-50 dark:bg-${isInc ? 'emerald' : 'rose'}-900/40 flex items-center justify-center text-${isInc ? 'emerald' : 'rose'}-600 dark:text-${isInc ? 'emerald' : 'rose'}-300">
                <i class="fas ${isInc ? 'fa-arrow-trend-up' : 'fa-shopping-cart'} text-lg"></i>
              </div>
              <div class="flex flex-col">
                <p class="font-medium leading-tight">${t.name}</p>
                ${t.description ? `<p class="text-[11px] text-gray-500 leading-tight mt-0.5 truncate max-w-[150px]">${t.description}</p>` : ''}
                <span class="text-xs text-gray-400 mt-1">${t.tag} · ${new Date(t.date).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
            <span class="font-semibold text-${isInc ? 'emerald' : 'rose'}-600 dark:text-${isInc ? 'emerald' : 'rose'}-400">${isInc ? '+' : '-'}${AppData.formatIDR(t.amount)}</span>
          </div>`;
      }).join('');
    }

    const catList = document.getElementById('spendingCategoriesList');
    if (catList) {
      const customTags = AppData.get('muwatok_cash_tags');
      const cats = {};
      transactions.filter(t => t.type === 'pengeluaran' && !t.excludeFromBudget && new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year).forEach(t => cats[t.tag] = (cats[t.tag] || 0) + parseFloat(t.amount));
      const sorted = Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0, 5);
      catList.innerHTML = sorted.map(([tag, amt]) => {
        const pInc = stats.inc > 0 ? ((amt / stats.inc) * 100).toFixed(1) : 0;
        const pVisual = stats.inc > 0 ? Math.min((amt / stats.inc) * 100, 100).toFixed(0) : 0;

        const tagInfo = customTags.find(ct => ct.name === tag);
        const iconBase = tagInfo ? tagInfo.icon : 'fa-tag';
        const iconClass = iconBase.startsWith('fa-') ? `fas ${iconBase}` : iconBase;
        return `<div><div class="flex justify-between text-sm"><span><i class="${iconClass} mr-2 text-indigo-400"></i>${tag} <span class="text-[10px] text-gray-400 font-medium ml-1">(${pInc}%)</span></span><span>${AppData.formatIDR(amt)}</span></div><div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"><div class="bg-indigo-500 h-2 rounded-full" style="width:${pVisual}%"></div></div></div>`;
      }).join('');
    }

    const budgetSettings = JSON.parse(localStorage.getItem('muwatok_cash_settings')) || { strategy: 'manual', limit: 0 };
    let targetExp = 0;
    let targetPercent = 0;

    const strategyRatios = {
      'extreme': 0.3,
      'hard': 0.5,
      'medium': 0.7,
      'normal': 0.8,
      'easy': 0.9,
      '503020': 0.8, // Fallback untuk versi lama
      '702010': 0.7  // Fallback untuk versi lama
    };

    const strategyLabels = {
      'manual': 'Manual',
      'autosaving': 'Auto Saving',
      'extreme': 'Extreme',
      'hard': 'Hard',
      'medium': 'Medium',
      'normal': 'Normal',
      'easy': 'Easy',
      '503020': '50/30/20',
      '702010': '70/20/10'
    };

    if (budgetSettings.strategy === 'manual') {
      targetPercent = budgetSettings.limit;
      targetExp = stats.inc * (targetPercent / 100);
    } else if (budgetSettings.strategy === 'autosaving') {
      const totalAllocation = savings.reduce((acc, s) => acc + (parseFloat(s.allocation) || 0), 0);
      targetPercent = Math.max(0, 100 - totalAllocation);
      targetExp = stats.inc * (targetPercent / 100);
    } else {
      const ratio = strategyRatios[budgetSettings.strategy] || 0;
      targetPercent = ratio * 100;
      targetExp = stats.inc * ratio;
    }

    const bTitle = document.getElementById('budgetTitle'), bTarget = document.getElementById('budgetTarget');
    const bProgress = document.getElementById('budgetProgress'), bPercent = document.getElementById('budgetPercent'), bDetail = document.getElementById('budgetDetail');

    if (bTarget) {
      const currentMode = strategyLabels[budgetSettings.strategy] || 'Manual';
      const spendPct = Number(targetPercent).toFixed(0);
      const savePct = (100 - targetPercent).toFixed(0);
      bTitle.textContent = `Spending Limit - ${spendPct}%(${currentMode} - ${savePct}%)`;
      bTarget.textContent = AppData.formatIDR(targetExp);

      const pRaw = targetExp > 0 ? (stats.exp / targetExp) * 100 : 0;
      const pVisual = Math.min(pRaw, 100).toFixed(0);
      const excess = stats.exp - targetExp;

      bProgress.style.width = `${pVisual}%`;
      bProgress.className = `h-full rounded-full transition-all duration-500 ${pRaw >= 90 ? 'bg-rose-500' : 'bg-indigo-500'}`;
      bPercent.textContent = `${pRaw.toFixed(0)}%`;
      bPercent.className = `text-xs font-medium ${pRaw > 100 ? 'text-rose-500' : 'text-indigo-600'}`;

      if (excess > 0) {
        bDetail.innerHTML = `${AppData.formatIDR(stats.exp)} of ${AppData.formatIDR(targetExp)} spent <span class="text-rose-500 font-bold block mt-1">(Over by ${AppData.formatIDR(excess)})</span>`;
      } else {
        bDetail.textContent = `${AppData.formatIDR(stats.exp)} of ${AppData.formatIDR(targetExp)} spent`;
      }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('totalBalance')) renderDashboard();
});
window.renderDashboard = () => {
    const transactions = AppData.get('muwatok_cash_data').transactions || [];
    const savings = AppData.get('muwatok_cash_savings') || [];
    const now = new Date();
    const month = now.getMonth(), year = now.getFullYear();

    let stats = { bal: 0, inc: 0, exp: 0 };
    transactions.forEach(t => {
      const amt = parseFloat(t.amount);
      const d = new Date(t.date);
      const isCurrent = d.getMonth() === month && d.getFullYear() === year;
      if (t.type === 'pemasukan') {
        stats.bal += amt;
        if (isCurrent) stats.inc += amt;
      } else {
        stats.bal -= amt;
        if (isCurrent && !t.excludeFromBudget) stats.exp += amt;
      }
    });

    const savingTrans = AppData.get('muwatok_cash_saving_transactions');
    savingTrans.forEach(st => { stats.bal -= parseFloat(st.amount) || 0; });

    const investmentTrans = AppData.get('muwatok_cash_investment_transactions');
    investmentTrans.forEach(it => { stats.bal -= parseFloat(it.amount) || 0; });

    const totalSavingsAmount = savings.reduce((acc, s) => acc + (parseFloat(s.current) || 0), 0);

    const updateEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = AppData.formatIDR(val); };
    updateEl('totalBalance', stats.bal);
    updateEl('monthlyIncome', stats.inc);
    updateEl('monthlyExpenses', stats.exp);
    updateEl('totalSavings', totalSavingsAmount);
    updateEl('totalSpentLabel', stats.exp);

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
        const p = stats.exp > 0 ? Math.min((amt/stats.exp)*100, 100).toFixed(0) : 0;
        const tagInfo = customTags.find(ct => ct.name === tag);
        const iconBase = tagInfo ? tagInfo.icon : 'fa-tag';
        const iconClass = iconBase.startsWith('fa-') ? `fas ${iconBase}` : iconBase;
        return `<div><div class="flex justify-between text-sm"><span><i class="${iconClass} mr-2 text-indigo-400"></i>${tag}</span><span>${AppData.formatIDR(amt)}</span></div><div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"><div class="bg-indigo-500 h-2 rounded-full" style="width:${p}%"></div></div></div>`;
      }).join('');
    }

    const budgetSettings = JSON.parse(localStorage.getItem('muwatok_cash_settings')) || { strategy: 'manual', limit: 0 };
    let targetExp = 0;
    if (budgetSettings.strategy === 'manual') targetExp = stats.inc * (budgetSettings.limit / 100);
    else if (budgetSettings.strategy === '503020') targetExp = stats.inc * 0.8;
    else if (budgetSettings.strategy === '702010') targetExp = stats.inc * 0.7;

    const bTitle = document.getElementById('budgetTitle'), bTarget = document.getElementById('budgetTarget');
    const bProgress = document.getElementById('budgetProgress'), bPercent = document.getElementById('budgetPercent'), bDetail = document.getElementById('budgetDetail');

    if (bTarget) {
      bTitle.textContent = budgetSettings.strategy === 'manual' ? 'Monthly Budget' : 'Spending Limit';
      bTarget.textContent = AppData.formatIDR(targetExp);
      const p = targetExp > 0 ? Math.min((stats.exp / targetExp) * 100, 100).toFixed(0) : 0;
      bProgress.style.width = `${p}%`;
      bProgress.className = `h-full rounded-full transition-all duration-500 ${p >= 90 ? 'bg-rose-500' : 'bg-indigo-500'}`;
      bPercent.textContent = `${p}%`;
      bDetail.textContent = `${AppData.formatIDR(stats.exp)} of ${AppData.formatIDR(targetExp)} spent`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('totalBalance')) renderDashboard();
});
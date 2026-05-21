(function() {
  /**
   * ==========================================
   * DATA & UTILITIES
   * ==========================================
   */
  const AppData = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || (['muwatok_cash_tags', 'muwatok_cash_savings', 'muwatok_cash_investments', 'muwatok_cash_saving_transactions', 'muwatok_cash_investment_transactions'].includes(key) ? [] : { transactions: [] }),
    save: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    formatIDR: (num) => {
      const isCensored = localStorage.getItem('muwatok_cash_censored') === 'true';
      if (isCensored) return 'Rp ••••••';
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: 'fas fa-tachometer-alt', link: 'index.html' },
    { name: 'Transactions', icon: 'fas fa-exchange-alt', link: 'transactions.html' },
    { name: 'Analytics', icon: 'fas fa-chart-line', link: 'analytics.html' },
    { name: 'Tags', icon: 'fas fa-tags', link: 'tags.html' },
    { name: 'Investment', icon: 'fas fa-money-bill', link: 'investment.html' },
    { name: 'Savings', icon: 'fas fa-piggy-bank', link: 'savings.html' },
    { name: 'Settings', icon: 'fas fa-cog', link: 'settings.html' },
  ];

  let state = {
    currentTypeFilter: 'all'
  };

  let activeCharts = {
    trend: null,
    pie: null,
    bar: null,
    daily: null
  };

  /**
   * ==========================================
   * GLOBAL UI COMPONENTS
   * ==========================================
   */
  const initSidebar = () => {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;
    const current = window.location.pathname.split("/").pop() || 'index.html';
    nav.innerHTML = menuItems.map(item => {
      const active = item.link === current;
      const isOngoing = item.link === '#';
      return `
        <a href="${item.link}" class="flex items-center gap-3 px-4 py-3 rounded-xl ${active ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition'} ${isOngoing ? 'opacity-60 cursor-not-allowed' : ''}">
          <i class="${item.icon} w-5"></i>
          <span class="flex-1">${item.name}</span>
          ${isOngoing ? '<i class="fas fa-hourglass-half text-[10px] text-gray-500 animate-pulse" title="Coming Soon"></i>' : ''}
        </a>`;
    }).join('');
  };

  const initMobileSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const openBtn = document.getElementById('openSidebarBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    if (!sidebar || !backdrop) return;

    const toggle = (show) => {
      sidebar.classList.toggle('-translate-x-full', !show);
      backdrop.classList.toggle('hidden', !show);
      document.body.style.overflow = show ? 'hidden' : '';
    };

    openBtn?.addEventListener('click', () => toggle(true));
    closeBtn?.addEventListener('click', () => toggle(false));
    backdrop?.addEventListener('click', () => toggle(false));
    window.addEventListener('resize', () => { if (window.innerWidth >= 1024) toggle(false); });
  };

  const initVisibilityToggle = () => {
    const btn = document.getElementById('toggleVisibilityBtn');
    if (!btn) return;

    const icon = btn.querySelector('i');
    
    const updateUI = () => {
      const isCensored = localStorage.getItem('muwatok_cash_censored') === 'true';
      icon.className = isCensored ? 'fas fa-eye-slash' : 'fas fa-eye';
      
      // Trigger re-render data pada halaman saat ini
      if (document.getElementById('totalBalance')) renderDashboard();
      if (document.getElementById('transactionsTableBody')) renderTransactionsPage();
      if (document.getElementById('tagsContainer')) renderTagsPage();
      if (document.getElementById('totalTransCount')) renderAnalytics();
      if (document.getElementById('savingsContainer')) renderSavingsPage();
      if (document.getElementById('investmentContainer')) renderInvestmentPage();
      if (document.getElementById('usdtPriceValue')) fetchUsdtPrice();
    };

    btn.addEventListener('click', () => {
      const current = localStorage.getItem('muwatok_cash_censored') === 'true';
      localStorage.setItem('muwatok_cash_censored', !current);
      updateUI();
    });

    updateUI();
  };

  const initCurrentDate = () => {
    const el = document.getElementById('currentDate');
    if (el) el.textContent = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // USDT PRICE LOGIC
  const fetchUsdtPrice = async () => {
    const priceEl = document.getElementById('usdtPriceValue');
    const changeEl = document.getElementById('usdtPriceChange');
    const updatedEl = document.getElementById('usdtLastUpdated');
    if (!priceEl) return;

    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=idr&include_24hr_change=true');
      const data = await response.json();
      const price = data.tether.idr;
      const change = data.tether.idr_24h_change || 0;

      priceEl.textContent = AppData.formatIDR(price);
      
      const isProfit = change >= 0;
      changeEl.textContent = `${isProfit ? '+' : ''}${change.toFixed(2)}%`;
      changeEl.className = `text-xs font-bold px-2 py-0.5 rounded-lg ${isProfit ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'}`;
      
      updatedEl.textContent = `Live: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (error) {
      priceEl.textContent = 'Connection Error';
    }
  };

  /**
   * ==========================================
   * DASHBOARD LOGIC
   * ==========================================
   */
  const renderDashboard = () => {
    const transactions = AppData.get('muwatok_cash_data').transactions || [];
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

    // Subtract saving transactions from total balance
    const savingTrans = AppData.get('muwatok_cash_saving_transactions');
    savingTrans.forEach(st => { stats.bal -= parseFloat(st.amount) || 0; });

    // Subtract investment transactions from total balance
    const investmentTrans = AppData.get('muwatok_cash_investment_transactions');
    investmentTrans.forEach(it => { stats.bal -= parseFloat(it.amount) || 0; });

    const updateEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = AppData.formatIDR(val); };
    updateEl('totalBalance', stats.bal);
    updateEl('monthlyIncome', stats.inc);
    updateEl('monthlyExpenses', stats.exp);
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

    // Budget Goal Logic
    const budgetSettings = JSON.parse(localStorage.getItem('muwatok_cash_settings')) || { strategy: 'manual', limit: 0 };
    let targetExp = 0;
    if (budgetSettings.strategy === 'manual') targetExp = stats.inc * (budgetSettings.limit / 100);
    else if (budgetSettings.strategy === '503020') targetExp = stats.inc * 0.8; // 50% needs + 30% wants
    else if (budgetSettings.strategy === '702010') targetExp = stats.inc * 0.7; // 70% living

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

  /**
   * ==========================================
   * TRANSACTIONS PAGE LOGIC
   * ==========================================
   */
  const initTransactionsPage = () => {
    const elTag = document.getElementById('filterTag');
    if (!elTag) return;
    const transactions = AppData.get('muwatok_cash_data').transactions || [];

    // Populate Tag filter
    const tags = [...new Set(transactions.map(t => t.tag))].sort();
    elTag.innerHTML = '<option value="">All Tags</option>' + tags.map(t => `<option value="${t}">${t}</option>`).join('');

    // Populate Year filter
    const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a,b) => b-a);
    const elYear = document.getElementById('filterYear');
    if (elYear) {
      elYear.innerHTML = '<option value="">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
      elYear.value = new Date().getFullYear();
    }
    const elMonth = document.getElementById('filterMonth');
    if (elMonth) elMonth.value = new Date().getMonth();

    // Type Filter Buttons
    const typeGroup = document.getElementById('typeFilterGroup');
    if (typeGroup) {
      typeGroup.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          state.currentTypeFilter = btn.dataset.type;
          typeGroup.querySelectorAll('button').forEach(b => b.className = "px-4 py-2 text-sm font-medium rounded-lg transition-all text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200");
          btn.className = "px-4 py-2 text-sm font-medium rounded-lg transition-all bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400";
          renderTransactionsPage();
        });
      });
    }
    ['filterName', 'filterTag', 'filterMonth', 'filterYear'].forEach(id => document.getElementById(id)?.addEventListener('input', renderTransactionsPage));
  };

  const renderTransactionsPage = () => {
    const tableBody = document.getElementById('transactionsTableBody');
    if (!tableBody) return;
    const data = AppData.get('muwatok_cash_data');
    const transactions = data.transactions || [];

    const fName = document.getElementById('filterName')?.value.toLowerCase() || '';
    const fTag = document.getElementById('filterTag')?.value || '';
    const fMonth = document.getElementById('filterMonth')?.value || '';
    const fYear = document.getElementById('filterYear')?.value || '';

    let filtered = transactions.map((t, index) => ({ ...t, idx: index }))
      .filter(t => (state.currentTypeFilter === 'all' || t.type === state.currentTypeFilter))
      .filter(t => t.name.toLowerCase().includes(fName))
      .filter(t => !fTag || t.tag === fTag)
      .filter(t => fMonth === '' || new Date(t.date).getMonth() === parseInt(fMonth))
      .filter(t => fYear === '' || new Date(t.date).getFullYear() === parseInt(fYear));

    let totals = { inc: 0, exp: 0 };
    filtered.forEach(t => { const a = parseFloat(t.amount); if (t.type === 'pemasukan') totals.inc += a; else totals.exp += a; });
    const updateEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = AppData.formatIDR(val); };
    updateEl('filteredIncome', totals.inc); updateEl('filteredExpense', totals.exp); updateEl('filteredBalance', totals.inc - totals.exp);

    const sorted = filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
    if (!sorted.length) { tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-gray-500">No data.</td></tr>'; return; }

    tableBody.innerHTML = sorted.map(t => {
      const isInc = t.type === 'pemasukan';
      return `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition border-b border-gray-100 dark:border-gray-800">
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-${isInc ? 'emerald' : 'rose'}-100 dark:bg-${isInc ? 'emerald' : 'rose'}-900/30 flex items-center justify-center text-${isInc ? 'emerald' : 'rose'}-600 dark:text-${isInc ? 'emerald' : 'rose'}-400"><i class="fas ${isInc ? 'fa-arrow-up' : 'fa-arrow-down'} text-xs"></i></div>
              <div class="flex flex-col"><span class="font-medium">${t.name}</span>${t.description ? `<span class="text-[11px] text-gray-500 truncate max-w-[200px]">${t.description}</span>` : ''}</div>
            </div>
          </td>
          <td class="px-6 py-4 text-sm"><span class="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium">${t.tag}</span></td>
          <td class="px-6 py-4 text-sm text-gray-500">${new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          <td class="px-6 py-4 text-right font-semibold ${isInc ? 'text-emerald-600' : 'text-rose-600'}">${isInc ? '+' : '-'}${AppData.formatIDR(t.amount)}</td>
          <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
            <button onclick="editTransaction(${t.idx})" class="text-indigo-400 hover:text-indigo-300">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteTransaction(${t.idx})" class="text-rose-400 hover:text-rose-300"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
    }).join('');
  };

  /**
   * ==========================================
   * TAGS PAGE LOGIC
   * ==========================================
   */
  const renderTagsPage = () => {
    const container = document.getElementById('tagsContainer');
    if (!container) return;
    const transactions = AppData.get('muwatok_cash_data').transactions || [];
    const customTags = AppData.get('muwatok_cash_tags');
    
    const map = {};
    customTags.forEach((ct, i) => map[ct.name] = { inc: 0, exp: 0, count: 0, color: ct.color, icon: ct.icon, oIdx: i });
    transactions.forEach(t => {
      if (!map[t.tag]) map[t.tag] = { inc: 0, exp: 0, count: 0, color: '#6366f1', icon: 'fa-tag' };
      const a = parseFloat(t.amount);
      if (t.type === 'pemasukan') map[t.tag].inc += a; else map[t.tag].exp += a;
      map[t.tag].count++;
    });

    const sorted = Object.entries(map).sort((a,b) => b[1].count - a[1].count);
    if (!sorted.length) { container.innerHTML = '<div class="col-span-full py-10 text-center text-gray-500">No tags.</div>'; return; }

    container.innerHTML = sorted.map(([tag, s]) => {
      const ic = s.icon.startsWith('fa-') ? `fas ${s.icon}` : s.icon;
      const isC = s.oIdx !== undefined;
      return `
        <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm relative group">
          <div class="absolute top-4 right-4 flex gap-2">
            <button onclick='editTag(${isC ? s.oIdx : -1}, "${tag}")' class="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 shadow-sm"><i class="fas fa-edit text-[10px]"></i></button>
            <button onclick="${isC ? `deleteTag(${s.oIdx})` : `Swal.fire({icon:'info', title:'Tag Transaksi', text:'Tag ini terdeteksi dari riwayat. Edit untuk kustomisasi.'})`}" class="w-7 h-7 rounded-full bg-rose-50 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center hover:bg-rose-100 shadow-sm"><i class="fas fa-trash text-[10px]"></i></button>
          </div>
          <div class="flex items-center mb-4 pr-14">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white" style="background-color: ${s.color}"><i class="${ic} text-xs"></i></div>
              <div class="flex flex-col"><span class="font-semibold text-sm leading-tight">${tag}</span><span class="text-[11px] text-gray-500 mt-0.5">${s.count} Transaksi</span></div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-xs text-gray-500"><span>Income</span><span class="text-emerald-500 font-medium">${AppData.formatIDR(s.inc)}</span></div>
            <div class="flex justify-between text-xs text-gray-500"><span>Outcome</span><span class="text-rose-500 font-medium">${AppData.formatIDR(s.exp)}</span></div>
          </div>
        </div>`;
    }).join('');
  };

  /**
   * ==========================================
   * SAVINGS PAGE LOGIC
   * ==========================================
   */
  const renderSavingsPage = () => {
    const container = document.getElementById('savingsContainer');
    if (!container) return;
    const savings = AppData.get('muwatok_cash_savings');
    
    if (!savings.length) { 
      container.innerHTML = '<div class="col-span-full py-20 text-center text-gray-500"><i class="fas fa-piggy-bank text-5xl mb-4 opacity-20"></i><p>No savings goals yet. Start planning your future!</p></div>'; 
      return; 
    }

    container.innerHTML = savings.map((s, i) => {
      const ic = s.icon.startsWith('fa-') ? `fas ${s.icon}` : s.icon;
      const progress = s.target > 0 ? Math.min((s.current / s.target) * 100, 100).toFixed(1) : 0;
      return `
        <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm relative group card-hover">
          <div class="absolute top-4 right-4 flex gap-2">
            <button onclick="addFundsToSaving(${i})" class="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 transition shadow-sm" title="Add funds from balance"><i class="fas fa-plus text-xs"></i></button>
            <button onclick="editSaving(${i})" class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-100 transition shadow-sm"><i class="fas fa-edit text-xs"></i></button>
            <button onclick="deleteSaving(${i})" class="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition shadow-sm"><i class="fas fa-trash text-xs"></i></button>
          </div>
          <div class="flex items-center mb-6 pr-14">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style="background-color: ${s.color}"><i class="${ic} text-xl"></i></div>
              <div class="flex flex-col">
                <span class="font-bold text-lg leading-tight">${s.name}</span>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Target: ${AppData.formatIDR(s.target)}</span>
                  ${s.allocation > 0 ? `<span class="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold">Auto: ${s.allocation}%</span>` : ''}
                </div>
              </div>
            </div>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between items-end">
              <div class="flex flex-col">
                <span class="text-[10px] text-gray-400 uppercase font-bold">Current Balance</span>
                <span class="text-base font-black text-indigo-500">${AppData.formatIDR(s.current)}</span>
              </div>
              <span class="text-sm font-black text-indigo-600 dark:text-indigo-400">${progress}%</span>
            </div>
            <div class="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-3 overflow-hidden">
              <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" style="width: ${progress}%"></div>
            </div>
          </div>
        </div>`;
    }).join('');
  };

  /**
   * ==========================================
   * INVESTMENT PAGE LOGIC
   * ==========================================
   */
  const renderInvestmentPage = () => {
    const container = document.getElementById('investmentContainer');
    if (!container) return;
    const investments = AppData.get('muwatok_cash_investments');
    const investmentTrans = AppData.get('muwatok_cash_investment_transactions');

    // 1. Hitung Total Modal dari seluruh riwayat deposit
    let totalInv = 0;
    investmentTrans.forEach(it => totalInv += parseFloat(it.amount) || 0);

    let totalInvInAssets = 0, totalCurInAssets = 0;
    investments.forEach(inv => {
      totalInvInAssets += parseFloat(inv.invested) || 0;
      totalCurInAssets += parseFloat(inv.currentValue) || 0;
    });

    // Nilai Saat Ini = Dana menganggur (belum dibelikan aset) + Nilai pasar aset yang ada
    const cashInPortfolio = Math.max(0, totalInv - totalInvInAssets);
    const totalCur = totalCurInAssets + cashInPortfolio;

    const totalPL = totalCur - totalInv;
    const totalROI = totalInv > 0 ? ((totalPL / totalInv) * 100).toFixed(2) : 0;
    const isProfit = totalPL >= 0;

    // Update Summary UI
    const elTotalInv = document.getElementById('totalInvested');
    const elTotalCur = document.getElementById('totalCurrentValue');
    const elTotalPL = document.getElementById('totalPL');
    const elTotalROI = document.getElementById('totalROI');

    if (elTotalInv) elTotalInv.textContent = AppData.formatIDR(totalInv);
    if (elTotalCur) elTotalCur.textContent = AppData.formatIDR(totalCur);
    if (elTotalPL) {
      elTotalPL.textContent = (isProfit ? '+' : '') + AppData.formatIDR(totalPL);
      elTotalPL.className = `text-2xl font-bold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`;
      // Update caret icon for total PL
      const caretIcon = elTotalPL.previousElementSibling;
      if (caretIcon && caretIcon.tagName === 'I') {
        caretIcon.className = `fas fa-caret-${isProfit ? 'up' : 'down'} text-${isProfit ? 'emerald' : 'rose'}-500`;
      }
    }
    if (elTotalROI) {
      elTotalROI.textContent = `${totalROI}%`;
      elTotalROI.className = `text-xs font-bold px-2 py-0.5 rounded-lg ${isProfit ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'}`;
    }

    // 3. Tampilkan pesan kosong hanya pada grid aset, bukan pada summary
    if (!investments.length) {
      container.innerHTML = '<div class="col-span-full py-20 text-center text-gray-500"><i class="fab fa-bitcoin text-5xl mb-4 opacity-20"></i><p>No crypto assets found. Start building your portfolio!</p></div>';
      return;
    }

    container.innerHTML = investments.map((inv, i) => {
      const ic = inv.icon.startsWith('fa-') ? `fas ${inv.icon}` : inv.icon;
      const profitLoss = inv.currentValue - inv.invested;
      const roi = inv.invested > 0 ? ((profitLoss / inv.invested) * 100).toFixed(2) : 0;
      const isProfit = profitLoss >= 0;

      return `
        <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm relative group card-hover">
          <div class="absolute top-4 right-4 flex gap-2">
            <button onclick="addFundsToInvestment(${i})" class="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 transition shadow-sm" title="Deposit from balance"><i class="fas fa-plus text-xs"></i></button>
            <button onclick="editInvestment(${i})" class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-100 transition shadow-sm"><i class="fas fa-edit text-xs"></i></button>
            <button onclick="deleteInvestment(${i})" class="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition shadow-sm"><i class="fas fa-trash text-xs"></i></button>
          </div>
          <div class="flex items-center mb-6 pr-14">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style="background-color: ${inv.color}"><i class="${ic} text-xl"></i></div>
              <div class="flex flex-col">
                <span class="font-bold text-lg leading-tight">${inv.name}</span>
                ${inv.units ? `<span class="text-[10px] text-indigo-400 font-bold">${inv.units} Units</span>` : ''}
                <span class="text-[10px] text-gray-400 uppercase font-bold mt-1 tracking-wider">Invested: ${AppData.formatIDR(inv.invested)}</span>
                ${inv.date ? `<span class="text-[10px] text-gray-400 font-medium">${new Date(inv.date).toLocaleDateString('id-ID')}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
            <div class="flex flex-col">
              <span class="text-[10px] text-gray-500 uppercase font-bold">Current Value</span>
              <span class="text-sm font-black text-indigo-500">${AppData.formatIDR(inv.currentValue)}</span>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-[10px] text-gray-500 uppercase font-bold">Profit/Loss</span>
              <div class="flex items-center gap-1">
                <i class="fas fa-caret-${isProfit ? 'up' : 'down'} text-${isProfit ? 'emerald' : 'rose'}-500"></i>
                <span class="text-sm font-black text-${isProfit ? 'emerald' : 'rose'}-500">${roi}%</span>
              </div>
              <span class="text-[9px] font-medium text-gray-400">${isProfit ? '+' : ''}${AppData.formatIDR(profitLoss)}</span>
            </div>
          </div>
        </div>`;
    }).join('');
  };

  /**
   * ==========================================
   * ANALYTICS LOGIC (RESTRUCTURED)
   * ==========================================
   */
  const initAnalyticsPage = () => {
    const elYear = document.getElementById('filterYear');
    const elMonth = document.getElementById('filterMonth');
    if (!elYear || !elMonth || !document.getElementById('totalTransCount')) return;

    const transactions = AppData.get('muwatok_cash_data').transactions || [];
    const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a,b) => b-a);
    
    elYear.innerHTML = '<option value="">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
    
    // Default to current date
    elYear.value = new Date().getFullYear();
    elMonth.value = new Date().getMonth();

    [elYear, elMonth].forEach(el => el.addEventListener('change', renderAnalytics));
  };

  const renderAnalytics = () => {
    const elCount = document.getElementById('totalTransCount');
    if (!elCount || typeof Chart === 'undefined') return;

    const transactions = AppData.get('muwatok_cash_data').transactions || [];
    const customTags = AppData.get('muwatok_cash_tags');

    const fMonth = document.getElementById('filterMonth')?.value || '';
    const fYear = document.getElementById('filterYear')?.value || '';

    // Calculations
    const monthLabels = [], incData = [], expData = [];
    
    if (fYear === '') {
      // Default: Last 6 months
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth(), y = d.getFullYear();
        monthLabels.push(new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d));
        const filtered = transactions.filter(t => { const td = new Date(t.date); return td.getMonth() === m && td.getFullYear() === y; });
        incData.push(filtered.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + parseFloat(t.amount), 0));
        expData.push(filtered.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + parseFloat(t.amount), 0));
      }
    } else {
      // Full Year trend
      const y = parseInt(fYear);
      for (let m = 0; m <= 11; m++) {
        const d = new Date(y, m, 1);
        monthLabels.push(new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d));
        const filtered = transactions.filter(t => { const td = new Date(t.date); return td.getMonth() === m && td.getFullYear() === y; });
        incData.push(filtered.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + parseFloat(t.amount), 0));
        expData.push(filtered.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + parseFloat(t.amount), 0));
      }
    }

    const remData = incData.map((inc, i) => inc - expData[i]);

    // Stats for cards (Filtered by Month AND Year)
    let filteredForStats = transactions;
    if (fYear !== '') filteredForStats = filteredForStats.filter(t => new Date(t.date).getFullYear() === parseInt(fYear));
    if (fMonth !== '') filteredForStats = filteredForStats.filter(t => new Date(t.date).getMonth() === parseInt(fMonth));

    const totalInc = filteredForStats.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const totalExp = filteredForStats.filter(t => t.type === 'pengeluaran' && !t.excludeFromBudget).reduce((acc, t) => acc + parseFloat(t.amount), 0);
    
    // Divisor for average: if month selected, it's 1 month. If year selected, 12 months.
    let divisor = (fMonth !== '') ? 1 : (fYear !== '' ? 12 : 6);

    document.getElementById('avgIncome').textContent = AppData.formatIDR(totalInc / divisor);
    document.getElementById('avgExpense').textContent = AppData.formatIDR(totalExp / divisor);
    document.getElementById('savingsRate').textContent = totalInc > 0 ? `${((totalInc - totalExp) / totalInc * 100).toFixed(1)}%` : '0%';
    elCount.textContent = filteredForStats.length;

    const trendCtx = document.getElementById('trendChart')?.getContext('2d');
    if (trendCtx) {
      if (activeCharts.trend) activeCharts.trend.destroy();
      activeCharts.trend = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: monthLabels,
          datasets: [
            { label: 'Income', data: incData, borderColor: '#10b981', backgroundColor: '#10b98122', fill: true, tension: 0.4 },
            { label: 'Expense', data: expData, borderColor: '#f43f5e', backgroundColor: '#f43f5e22', fill: true, tension: 0.4 }
          ]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { 
            legend: { labels: { color: '#94a3b8' } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${AppData.formatIDR(ctx.parsed.y)}` } }
          }, 
          scales: { 
            y: { ticks: { color: '#94a3b8', callback: (val) => AppData.formatIDR(val) }, grid: { color: '#334155' } }, 
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } } 
          } 
        }
      });
    }

    // Daily Trend Logic (for the selected month)
    const dailyContainer = document.getElementById('dailyTrendContainer');
    const dailyCtx = document.getElementById('dailyTrendChart')?.getContext('2d');
    
    if (dailyContainer && dailyCtx) {
      if (fMonth !== '' && fYear !== '') {
        dailyContainer.classList.remove('hidden');
        const y = parseInt(fYear), m = parseInt(fMonth);
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const dailyLabels = [], potData = [];
        
        const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(y, m, 1));
        document.getElementById('dailyTrendTitle').textContent = `Budget Depletion: ${monthName} ${y}`;

        // Hitung total pemasukan bulan ini sebagai titik awal (Pot)
        const totalMonthIncome = transactions
          .filter(t => { const td = new Date(t.date); return td.getMonth() === m && td.getFullYear() === y && t.type === 'pemasukan'; })
          .reduce((acc, t) => acc + parseFloat(t.amount), 0);

        let runningPot = totalMonthIncome;

        for (let d = 1; d <= daysInMonth; d++) {
          dailyLabels.push(d);
          const dayExp = transactions
            .filter(t => { const td = new Date(t.date); return td.getDate() === d && td.getMonth() === m && td.getFullYear() === y && t.type === 'pengeluaran' && !t.excludeFromBudget; })
            .reduce((acc, t) => acc + parseFloat(t.amount), 0);
          
          runningPot -= dayExp;
          potData.push(runningPot);
        }

        if (activeCharts.daily) activeCharts.daily.destroy();
        activeCharts.daily = new Chart(dailyCtx, {
          type: 'line',
          data: {
            labels: dailyLabels,
            datasets: [
              { 
                label: 'Sisa Pot Pemasukan', 
                data: potData, 
                borderColor: '#6366f1', 
                backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                fill: true, 
                tension: 0.3, 
                pointRadius: 3,
                pointBackgroundColor: '#6366f1'
              }
            ]
          },
          options: {
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${AppData.formatIDR(ctx.parsed.y)}` } }
            },
            scales: {
              y: { ticks: { color: '#94a3b8', callback: (val) => AppData.formatIDR(val) }, grid: { color: '#334155' } },
              x: { 
                title: { display: true, text: 'Day of Month', color: '#64748b', font: { size: 10 } },
                ticks: { color: '#94a3b8' }, grid: { display: false } 
              }
            }
          }
        });
      } else {
        dailyContainer.classList.add('hidden');
      }
    }

    const barCtx = document.getElementById('monthlyBarChart')?.getContext('2d');
    if (barCtx) {
      if (activeCharts.bar) activeCharts.bar.destroy();
      activeCharts.bar = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [
            { 
              label: 'Income', 
              data: incData, 
              backgroundColor: '#10b981', 
              borderRadius: 6,
              barPercentage: 0.6
            },
            { 
              label: 'Expense', 
              data: expData, 
              backgroundColor: '#f43f5e', 
              borderRadius: 6,
              barPercentage: 0.6
            },
            { 
              label: 'Sisa', 
              data: remData, 
              backgroundColor: 'rgba(255, 255, 255, 0.3)', 
              borderRadius: 6,
              barPercentage: 0.6
            }
          ]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { 
            legend: { labels: { color: '#94a3b8' } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${AppData.formatIDR(ctx.parsed.y)}` } }
          }, 
          scales: { 
            y: { ticks: { color: '#94a3b8', callback: (val) => AppData.formatIDR(val) }, grid: { color: '#334155' } }, 
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } } 
          } 
        }
      });
    }

    const pieCtx = document.getElementById('categoryPieChart')?.getContext('2d');
    if (pieCtx) {
      const cats = {};
      const expensesOnly = filteredForStats.filter(t => t.type === 'pengeluaran' && !t.excludeFromBudget);
      expensesOnly.forEach(t => cats[t.tag] = (cats[t.tag] || 0) + parseFloat(t.amount));
      const sorted = Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0, 5);

      const sisa = totalInc > totalExp ? totalInc - totalExp : 0;
      const totalDenominator = Math.max(totalInc, totalExp);

      const chartData = sorted.map(c => c[1]);
      const chartLabels = sorted.map(c => {
        const p = totalDenominator > 0 ? ((c[1] / totalDenominator) * 100).toFixed(1) : 0;
        return `${c[0]} (${p}%)`;
      });
      const chartColors = sorted.map(c => { 
        const ct = customTags.find(t => t.name === c[0]); 
        return ct ? ct.color : '#6366f1'; 
      });

      if (sisa > 0) {
        const p = ((sisa / totalDenominator) * 100).toFixed(1);
        chartLabels.push(`Sisa (${p}%)`);
        chartData.push(sisa);
        chartColors.push('#ffffff'); // Putih solid
      }

      if (activeCharts.pie) activeCharts.pie.destroy();
      activeCharts.pie = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: chartLabels,
          datasets: [{
            data: chartData,
            backgroundColor: chartColors,
            borderWidth: 0
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { 
            legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20, usePointStyle: true } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${AppData.formatIDR(ctx.raw)}` } }
          }, 
          cutout: '70%' 
        }
      });
    }
  };

  /**
   * ==========================================
   * TAG MODAL LOGIC
   * ==========================================
   */
  const initTagModal = () => {
    const modal = document.getElementById('tagModal'), form = document.getElementById('tagForm');
    if (!modal || !form) return;

    const iconGrid = document.getElementById('iconGrid'), colorGrid = document.getElementById('colorGrid');
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#71717a', '#78716c',
      '#991b1b', '#9a3412', '#92400e', '#854d0e', '#3f6212', '#166534', '#065f46', '#115e59', '#155e75', '#075985',
      '#fca5a5', '#fdba74', '#fcd34d', '#fde047', '#bef264', '#86efac', '#6ee7b7', '#5eead4', '#67e8f9', '#7dd3fc',
      '#93c5fd', '#a5b4fc', '#c4b5fd', '#d8b4fe', '#f0abfc', '#f9a8d4', '#fda4af', '#cbd5e1', '#d4d4d8', '#d6d3d1'
    ];
    const icons = [
      'fa-tag', 'fa-utensils', 'fa-shopping-cart', 'fa-car', 'fa-home', 'fa-heart', 'fa-briefcase', 'fa-graduation-cap', 'fa-dumbbell', 'fa-plane',
      'fa-gamepad', 'fa-music', 'fa-tv', 'fa-coffee', 'fa-beer', 'fa-gift', 'fa-medkit', 'fa-tools', 'fa-money-bill', 'fa-credit-card',
      'fa-piggy-bank', 'fa-chart-line', 'fa-laptop', 'fa-mobile-alt', 'fa-camera', 'fa-bicycle', 'fa-bus', 'fa-train', 'fa-ship', 'fa-pills',
      'fa-gas-pump', 'fa-book', 'fa-wrench', 'fa-lightbulb', 'fa-tshirt', 'fa-couch', 'fa-paw', 'fa-tree', 'fa-sun', 'fa-moon',
      'fa-umbrella', 'fa-cloud', 'fa-bolt', 'fa-key', 'fa-flask', 'fa-microchip', 'fa-headphones', 'fa-dice', 'fa-puzzle-piece', 'fa-landmark',
      'fa-smoking', 'fa-motorcycle', 'fa-baby', 'fa-bath', 'fa-bed', 'fa-calculator', 'fa-clock', 'fa-envelope', 'fa-file-invoice-dollar', 'fa-film',
      'fa-fire', 'fa-fish', 'fa-football-ball', 'fa-glass-cheers', 'fa-hamburger', 'fa-hospital', 'fa-ice-cream', 'fa-palette', 'fa-pizza-slice', 'fa-rocket',
      'fa-seedling', 'fa-store', 'fa-subway', 'fa-taxi', 'fa-ticket-alt', 'fa-tooth', 'fa-truck', 'fa-wifi', 'fa-wine-glass', 'fa-cloud-meatball'
    ];

    const toggle = (show) => {
      modal.classList.toggle('hidden', !show);
      if (!show) {
        form.reset();
        document.getElementById('editTagIndex').value = "-1";
        document.getElementById('tagModalTitle').textContent = "Add New Tag";
        document.getElementById('tagSubmitBtn').textContent = "Create Tag";
      }
    };

    const renderPickers = () => {
      iconGrid.innerHTML = icons.map(i => `<button type="button" data-icon="${i}" class="icon-opt w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-indigo-500"><i class="fas ${i}"></i></button>`).join('');
      colorGrid.innerHTML = colors.map(c => `<button type="button" data-color="${c}" class="color-opt w-6 h-6 rounded-full border-2 border-transparent" style="background-color: ${c}"></button>`).join('');

      iconGrid.querySelectorAll('.icon-opt').forEach(b => b.addEventListener('click', () => {
        iconGrid.querySelectorAll('.icon-opt').forEach(x => x.classList.remove('border-indigo-500', 'bg-indigo-50', 'text-indigo-600'));
        b.classList.add('border-indigo-500', 'bg-indigo-50', 'text-indigo-600');
        document.getElementById('selectedIcon').value = b.dataset.icon;
      }));

      colorGrid.querySelectorAll('.color-opt').forEach(b => b.addEventListener('click', () => {
        colorGrid.querySelectorAll('.color-opt').forEach(x => x.classList.remove('border-white', 'scale-125'));
        b.classList.add('border-white', 'scale-125');
        document.getElementById('selectedColor').value = b.dataset.color;
      }));

      iconGrid.querySelector(`[data-icon="${document.getElementById('selectedIcon').value}"]`)?.click();
      colorGrid.querySelector(`[data-color="${document.getElementById('selectedColor').value}"]`)?.click();
    };

    window.editTag = (idx, infName) => {
      const tags = AppData.get('muwatok_cash_tags');
      const t = idx > -1 ? tags[idx] : { name: infName, icon: 'fa-tag', color: '#6366f1' };
      document.getElementById('editTagIndex').value = idx;
      document.getElementById('tagModalTitle').textContent = idx > -1 ? "Edit Tag" : "Customize Tag";
      document.getElementById('tagName').value = t.name;
      document.getElementById('selectedIcon').value = t.icon;
      document.getElementById('selectedColor').value = t.color;
      renderPickers(); toggle(true);
    };

    document.getElementById('addTagBtn')?.addEventListener('click', () => { renderPickers(); toggle(true); });
    document.getElementById('closeModalBtn')?.addEventListener('click', () => toggle(false));
    document.getElementById('modalBackdrop')?.addEventListener('click', () => toggle(false));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('tagName').value.trim();
      const icon = document.getElementById('selectedIcon').value;
      const color = document.getElementById('selectedColor').value;
      const eIdx = parseInt(document.getElementById('editTagIndex').value);

      let tags = AppData.get('muwatok_cash_tags');
      if (tags.some((t, i) => t.name.toLowerCase() === name.toLowerCase() && i !== eIdx)) return Swal.fire({ icon: 'error', title: 'Duplicate Tag' });
      if (tags.some((t, i) => t.color === color && i !== eIdx)) return Swal.fire({ icon: 'error', title: 'Color Used' });

      if (eIdx > -1) {
        const old = tags[eIdx].name;
        if (old !== name) {
          const d = AppData.get('muwatok_cash_data');
          d.transactions = d.transactions.map(t => { if (t.tag === old) t.tag = name; return t; });
          AppData.save('muwatok_cash_data', d);
        }
        tags[eIdx] = { name, icon, color };
      } else { tags.push({ name, icon, color }); }

      AppData.save('muwatok_cash_tags', tags);
      toggle(false); renderTagsPage();
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
    });
  };

  /**
   * ==========================================
   * SAVINGS MODAL LOGIC
   * ==========================================
   */
  const initSavingsModal = () => {
    const modal = document.getElementById('savingsModal'), form = document.getElementById('savingsForm');
    if (!modal || !form) return;

    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#71717a', '#78716c'
    ];
    const icons = ['fa-piggy-bank', 'fa-car', 'fa-home', 'fa-plane', 'fa-laptop', 'fa-mobile-alt', 'fa-graduation-cap', 'fa-heart', 'fa-briefcase', 'fa-gem', 'fa-motorcycle', 'fa-gift'];

    const toggle = (show) => {
      modal.classList.toggle('hidden', !show);
      if (!show) {
        form.reset();
        document.getElementById('editSavingsIndex').value = "-1";
        document.getElementById('savingsModalTitle').textContent = "Add Saving Goal";
      }
    };

    const renderPickers = () => {
      const iGrid = document.getElementById('savingsIconGrid'), cGrid = document.getElementById('savingsColorGrid');
      iGrid.innerHTML = icons.map(i => `<button type="button" data-icon="${i}" class="s-icon-opt w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-indigo-500"><i class="fas ${i}"></i></button>`).join('');
      cGrid.innerHTML = colors.map(c => `<button type="button" data-color="${c}" class="s-color-opt w-6 h-6 rounded-full border-2 border-transparent" style="background-color: ${c}"></button>`).join('');

      iGrid.querySelectorAll('.s-icon-opt').forEach(b => b.addEventListener('click', () => {
        iGrid.querySelectorAll('.s-icon-opt').forEach(x => x.classList.remove('border-indigo-500', 'bg-indigo-50', 'text-indigo-600'));
        b.classList.add('border-indigo-500', 'bg-indigo-50', 'text-indigo-600');
        document.getElementById('selectedSavingsIcon').value = b.dataset.icon;
      }));

      cGrid.querySelectorAll('.s-color-opt').forEach(b => b.addEventListener('click', () => {
        cGrid.querySelectorAll('.s-color-opt').forEach(x => x.classList.remove('border-white', 'scale-125'));
        b.classList.add('border-white', 'scale-125');
        document.getElementById('selectedSavingsColor').value = b.dataset.color;
      }));

      iGrid.querySelector(`[data-icon="${document.getElementById('selectedSavingsIcon').value}"]`)?.click();
      cGrid.querySelector(`[data-color="${document.getElementById('selectedSavingsColor').value}"]`)?.click();
    };

    window.editSaving = (idx) => {
      const savings = AppData.get('muwatok_cash_savings');
      const s = savings[idx];
      document.getElementById('editSavingsIndex').value = idx;
      document.getElementById('savingsModalTitle').textContent = "Edit Saving Goal";
      document.getElementById('savingsName').value = s.name;
      document.getElementById('savingsTarget').value = s.target;
      document.getElementById('savingsCurrent').value = s.current;
      document.getElementById('selectedSavingsIcon').value = s.icon;
      document.getElementById('selectedSavingsColor').value = s.color;
      document.getElementById('savingsAllocation').value = s.allocation || 0;
      renderPickers(); toggle(true);
    };

    document.getElementById('addSavingsBtn')?.addEventListener('click', () => { renderPickers(); toggle(true); });
    document.getElementById('closeSavingsModalBtn')?.addEventListener('click', () => toggle(false));
    document.getElementById('savingsModalBackdrop')?.addEventListener('click', () => toggle(false));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('savingsName').value.trim();
      const target = parseFloat(document.getElementById('savingsTarget').value) || 0;
      const current = parseFloat(document.getElementById('savingsCurrent').value) || 0;
      const allocation = parseFloat(document.getElementById('savingsAllocation').value) || 0;
      const icon = document.getElementById('selectedSavingsIcon').value;
      const color = document.getElementById('selectedSavingsColor').value;
      const eIdx = parseInt(document.getElementById('editSavingsIndex').value);

      let savings = AppData.get('muwatok_cash_savings');
      const newSaving = { name, target, current, icon, color, allocation };

      if (eIdx > -1) savings[eIdx] = newSaving;
      else savings.push(newSaving);

      AppData.save('muwatok_cash_savings', savings);
      toggle(false); renderSavingsPage();
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
    });
  };

  /**
   * ==========================================
   * INVESTMENT MODAL LOGIC
   * ==========================================
   */
  // New function to fetch and display CoinGecko data for a specific asset
  const fetchCoinGeckoAssetData = async (apiId) => {
    const displayDiv = document.getElementById('coingeckoDataDisplay');
    const currentPriceEl = document.getElementById('cgCurrentPrice');
    const changeEl = document.getElementById('cg24hChange');
    const marketCapEl = document.getElementById('cgMarketCap');
    
    if (!displayDiv || !currentPriceEl || !changeEl || !marketCapEl) return;
    const applyPriceBtn = document.getElementById('applyCgPriceBtn'); // Get button if it exists

    if (!apiId) {
      displayDiv.classList.add('hidden');
      return;
    }

    displayDiv.classList.remove('hidden');
    currentPriceEl.textContent = 'Loading...';
    changeEl.textContent = 'Loading...';
    changeEl.className = 'text-sm font-semibold'; // Reset class
    marketCapEl.textContent = 'Loading...'; 
    if (applyPriceBtn) applyPriceBtn.classList.add('hidden'); // Hide button while loading

    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${apiId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
      const data = await response.json();

      if (data && data.market_data) {
        const currentPrice = data.market_data.current_price.idr;
        const priceChange24h = data.market_data.price_change_percentage_24h;
        const marketCap = data.market_data.market_cap.idr;

        currentPriceEl.textContent = AppData.formatIDR(currentPrice);
        
        if (priceChange24h !== undefined && priceChange24h !== null) {
          const isPositive = priceChange24h >= 0;
          changeEl.textContent = `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`;
          changeEl.className = `text-sm font-semibold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`;
        } else {
          changeEl.textContent = 'N/A';
          changeEl.className = 'text-sm font-semibold text-gray-500';
        }

        marketCapEl.textContent = AppData.formatIDR(marketCap);
        if (applyPriceBtn) {
          applyPriceBtn.classList.remove('hidden'); // Show button after data is loaded
          // Remove existing listener to prevent multiple bindings
          applyPriceBtn.onclick = null; 
        };

      } else {
        currentPriceEl.textContent = 'N/A';
        changeEl.textContent = 'N/A';
        changeEl.className = 'text-sm font-semibold text-gray-500';
        marketCapEl.textContent = 'N/A';
        if (applyPriceBtn) applyPriceBtn.classList.add('hidden');
        Swal.fire({ icon: 'warning', title: 'Data Not Found', text: 'Could not retrieve data for this CoinGecko ID.' });
      }
    } catch (error) {
      console.error('Error fetching CoinGecko data:', error);
      currentPriceEl.textContent = 'Error';
      changeEl.textContent = 'Error';
      changeEl.className = 'text-sm font-semibold text-rose-500';
      marketCapEl.textContent = 'Error';
      if (applyPriceBtn) applyPriceBtn.classList.add('hidden');
      Swal.fire({ icon: 'error', title: 'API Error', text: 'Failed to fetch data from CoinGecko.' });
    }
  };

  const initInvestmentModal = () => {
    const modal = document.getElementById('investmentModal'), form = document.getElementById('investmentForm');
    if (!modal || !form) return;

    const invNameSelect = $('#invName');

    // Initialize Select2 with CoinGecko Search API
    if (typeof jQuery !== 'undefined' && invNameSelect.length) {
      invNameSelect.select2({
        placeholder: 'Search for crypto (e.g. bitcoin, solana)',
        minimumInputLength: 2,
        width: '100%',
        ajax: {
          url: 'https://api.coingecko.com/api/v3/search',
          dataType: 'json',
          delay: 250,
          data: params => ({ query: params.term }),
          processResults: data => ({
            results: data.coins.map(coin => ({
              id: coin.name, // Menyimpan Nama sebagai value utama
              apiId: coin.id,
              text: `${coin.name} (${coin.symbol.toUpperCase()})`,
              thumb: coin.thumb
            }))
          }),
          cache: true
        },
        templateResult: (state) => {
          if (!state.id || !state.thumb) return state.text;
          return $(`<div class="coin-result"><img src="${state.thumb}"/><div class="coin-info"><span class="coin-name">${state.text}</span><span class="coin-id">${state.apiId}</span></div></div>`);
        },
        templateSelection: (state) => state.name || state.text
      });

      // Update apiId secara otomatis saat koin dipilih
      invNameSelect.on('select2:select', function (e) {
        const data = e.params.data;
        const apiIdInput = document.getElementById('invApiId');
        if (apiIdInput) {
          apiIdInput.value = data.apiId;
          // Panggil fungsi sinkronisasi data yang sudah ada
          fetchCoinGeckoAssetData(data.apiId);
        }
      });
    }

    const sourceGroup = document.getElementById('invSourceGroup');
    const updateInvSourceUI = (val) => {
      if (!sourceGroup) return;
      const input = document.getElementById('invSource');
      if (input) input.value = val;
      sourceGroup.querySelectorAll('button').forEach(btn => {
        const isActive = btn.dataset.val === val;
        btn.className = `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isActive ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`;
      });
    };
    sourceGroup?.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => updateInvSourceUI(btn.dataset.val)));

    const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'];

    const toggle = (show) => {
      modal.classList.toggle('hidden', !show);
      if (!show) {
        updateInvSourceUI('external');
        document.getElementById('invSourceContainer')?.classList.remove('hidden');
        // Reset Select2 saat modal ditutup
        invNameSelect.val(null).trigger('change');
        form.reset();
        const editIdx = document.getElementById('editInvIndex');
        const modalTitle = document.getElementById('invModalTitle');
        if (editIdx) editIdx.value = "-1";
        if (modalTitle) modalTitle.textContent = "Add Crypto Asset";
        // Reset hidden inputs to default
        document.getElementById('selectedInvColor').value = "#6366f1";
        // Hide CoinGecko data display when modal closes
        document.getElementById('coingeckoDataDisplay')?.classList.add('hidden');
      }
    };

    const renderPickers = () => {
      // ... (unchanged part of renderPickers)
      const cGrid = document.getElementById('invColorGrid');
      cGrid.innerHTML = colors.map(c => `<button type="button" data-color="${c}" class="inv-color-opt w-6 h-6 rounded-full border-2 border-transparent" style="background-color: ${c}"></button>`).join('');

      cGrid.querySelectorAll('.inv-color-opt').forEach(b => b.addEventListener('click', () => {
        cGrid.querySelectorAll('.inv-color-opt').forEach(x => x.classList.remove('border-white', 'scale-125'));
        b.classList.add('border-white', 'scale-125');
        document.getElementById('selectedInvColor').value = b.dataset.color;
      }));

      // Highlight selected without triggering a real click to avoid loops
      cGrid.querySelector(`[data-color="${document.getElementById('selectedInvColor').value}"]`)?.classList.add('border-white', 'scale-125');
    };

    const invApiIdInput = document.getElementById('invApiId');
    if (invApiIdInput) {
      invApiIdInput.addEventListener('input', (e) => {
        fetchCoinGeckoAssetData(e.target.value.trim().toLowerCase());
      });
    };

    window.editInvestment = (idx) => {
      const invs = AppData.get('muwatok_cash_investments');
      const inv = invs[idx];
      document.getElementById('invApiId').value = inv.apiId || ""; // Added this line back
      document.getElementById('invSourceContainer')?.classList.add('hidden');
      document.getElementById('editInvIndex').value = idx;
      
      // Set nilai Select2 saat mode edit
      if (invNameSelect.hasClass('select2-hidden-accessible')) {
        const newOption = new Option(inv.name, inv.name, true, true);
        invNameSelect.append(newOption).trigger('change');
      }

      document.getElementById('invModalTitle').textContent = "Edit Crypto Asset";
      document.getElementById('invName').value = inv.name;
      document.getElementById('invApiId').value = inv.apiId || "";
      document.getElementById('invUnits').value = inv.units || "";
      document.getElementById('invInvested').value = inv.invested;
      document.getElementById('invDate').value = inv.date ? inv.date.split(' ')[0] : new Date().toISOString().split('T')[0];
      document.getElementById('selectedInvColor').value = inv.color;
      renderPickers();
      toggle(true);
      // Fetch CoinGecko data immediately if apiId exists
      if (inv.apiId) {
        fetchCoinGeckoAssetData(inv.apiId);
      } else {
        document.getElementById('coingeckoDataDisplay')?.classList.add('hidden');
      }
    };

    document.getElementById('addInvBtn')?.addEventListener('click', () => { 
      renderPickers(); 
      toggle(true); 
      document.getElementById('invApiId').value = ''; 
      document.getElementById('coingeckoDataDisplay')?.classList.add('hidden'); 
      document.getElementById('invSourceContainer')?.classList.remove('hidden');
      updateInvSourceUI('external');
      document.getElementById('invDate').value = new Date().toISOString().split('T')[0];
    });
    document.getElementById('closeInvModalBtn')?.addEventListener('click', () => toggle(false));
    document.getElementById('invModalBackdrop')?.addEventListener('click', () => toggle(false));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('invName').value.trim();
      const apiId = document.getElementById('invApiId').value.trim().toLowerCase();
      const units = parseFloat(document.getElementById('invUnits').value) || 0;
      const invested = parseFloat(document.getElementById('invInvested').value) || 0;
      const date = document.getElementById('invDate').value + " 00:00:00";
      const color = document.getElementById('selectedInvColor').value;
      const eIdx = parseInt(document.getElementById('editInvIndex').value);
      const source = document.getElementById('invSource')?.value || 'external';
      let invs = AppData.get('muwatok_cash_investments');

      // Logic for Capital Source (Only for new assets)
      if (eIdx === -1) {
        if (source === 'external') {
          const it = AppData.get('muwatok_cash_investment_transactions');
          it.push({ name: `Initial Deposit: ${name}`, amount: invested, date: new Date().toISOString().replace('T', ' ').split('.')[0], description: `Automatic deposit when adding ${name}.` });
          AppData.save('muwatok_cash_investment_transactions', it);
        } else if (source === 'portfolio') {
          const investmentTrans = AppData.get('muwatok_cash_investment_transactions');
          let totalInvTotal = 0;
          investmentTrans.forEach(x => totalInvTotal += parseFloat(x.amount) || 0);
          let totalInvInAssets = 0;
          invs.forEach(inv => totalInvInAssets += parseFloat(inv.invested) || 0);
          const cashInPortfolio = totalInvTotal - totalInvInAssets;
          if (invested > cashInPortfolio) {
            return Swal.fire({ icon: 'error', title: 'Modal Tidak Cukup', text: `Saldo Dana Investasi menganggur hanya ${AppData.formatIDR(cashInPortfolio)}.` });
          }
        } else if (source === 'usdt') {
          const tetherIdx = invs.findIndex(i => i.apiId === 'tether');
          if (tetherIdx === -1) return Swal.fire({ icon: 'error', title: 'Aset USDT Tidak Ada', text: 'Anda tidak memiliki aset Tether (USDT) di portofolio untuk digunakan sebagai sumber.' });
          const tether = invs[tetherIdx];
          if (tether.currentValue < invested) return Swal.fire({ icon: 'error', title: 'Saldo USDT Kurang', text: `Saldo USDT Anda hanya ${AppData.formatIDR(tether.currentValue)}.` });
          
          const ratio = invested / tether.currentValue;
          
          // Simpan riwayat transaksi swap sebelum aset diupdate/dihapus
          const it = AppData.get('muwatok_cash_investment_transactions');
          it.push({ 
            name: `Swap USDT to ${name}`, 
            amount: 0, // 0 karena tidak menambah modal kapital baru dari luar (wallet)
            date: new Date().toISOString().replace('T', ' ').split('.')[0], 
            description: `Swapped ${AppData.formatIDR(invested)} worth of USDT into ${name}.` 
          });
          AppData.save('muwatok_cash_investment_transactions', it);

          tether.units -= (tether.units * ratio);
          tether.invested -= (tether.invested * ratio);
          tether.currentValue -= invested;

          // Jika saldo USDT habis atau mendekati 0, hapus dari daftar aset aktif agar "hilang"
          if (tether.currentValue < 1) {
            invs.splice(tetherIdx, 1);
          }
        }
      }

      // For new assets, currentValue is initially set to invested. It will be updated by syncInvestmentPrices.
      // For existing assets, currentValue retains its previous value until syncInvestmentPrices is called.
      const initialCurrentValue = (eIdx === -1) ? invested : invs[eIdx].currentValue;
      const newInv = { name, apiId, units, invested, currentValue: initialCurrentValue, date, icon: 'fa-bitcoin', color };

      if (eIdx > -1) invs[eIdx] = newInv;
      else invs.push(newInv);

      AppData.save('muwatok_cash_investments', invs);
      toggle(false); renderInvestmentPage();
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
    });
  };

  /**
   * ==========================================
   * TRANSACTION MODAL LOGIC
   * ==========================================
   */
  const initTransactionModal = () => {
    const modal = document.getElementById('transactionModal'), form = document.getElementById('transactionForm');
    if (!modal || !form) return;

    const tagSelect = form.querySelector('[name="tag"]');
    const populateTags = () => {
      if (!tagSelect) return;
      const transactions = AppData.get('muwatok_cash_data').transactions || [];
      const customTags = AppData.get('muwatok_cash_tags');
      const tags = new Set([
        ...customTags.map(t => t.name),
        ...transactions.map(t => t.tag)
      ]);
      tagSelect.innerHTML = '<option value="">Select Tag</option>' + 
        Array.from(tags).filter(t => t).sort().map(t => `<option value="${t}">${t}</option>`).join('');
    };

    const typeGroup = document.getElementById('modalTypeGroup');
    const updateTypeUI = (val) => {
      if (!typeGroup) return;
      const input = typeGroup.querySelector('input[name="type"]');
      if (input) input.value = val;
      typeGroup.querySelectorAll('button').forEach(btn => {
        const isActive = btn.dataset.val === val;
        const activeColor = val === 'pemasukan' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
        btn.className = `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isActive ? `bg-white dark:bg-gray-700 shadow-sm ${activeColor}` : 'text-gray-500 dark:text-gray-400'}`;
      });
    };

    typeGroup?.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => updateTypeUI(btn.dataset.val));
    });

    const toggle = (show) => {
      modal.classList.toggle('hidden', !show);
      if (!show) {
        form.reset();
        document.getElementById('editIndex').value = "-1";
        document.getElementById('modalTitle').textContent = "Add Transaction";
        document.getElementById('submitBtn').textContent = "Save Transaction";
        updateTypeUI('pengeluaran');
      } else {
        populateTags();
        updateTypeUI('pengeluaran');
        if (document.getElementById('editIndex').value === "-1") {
          form.querySelector('[name="date"]').value = new Date().toISOString().split('T')[0];
        }
      }
    };

    window.editTransaction = (idx) => {
      const t = AppData.get('muwatok_cash_data').transactions[idx];
      document.getElementById('editIndex').value = idx;
      document.getElementById('modalTitle').textContent = "Edit Transaction";
      toggle(true);
      form.querySelector('[name="name"]').value = t.name;
      form.querySelector('[name="amount"]').value = t.amount;
      form.querySelector('[name="tag"]').value = t.tag;
      form.querySelector('[name="date"]').value = t.date.split(' ')[0];
      form.querySelector('[name="description"]').value = t.description || "";
      updateTypeUI(t.type);
    };

    document.getElementById('addTransactionBtn')?.addEventListener('click', () => toggle(true));
    document.getElementById('closeModalBtn')?.addEventListener('click', () => toggle(false));
    document.getElementById('modalBackdrop')?.addEventListener('click', () => toggle(false));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form), eIdx = parseInt(document.getElementById('editIndex').value);
      const nt = { name: f.get('name'), type: f.get('type'), amount: parseFloat(f.get('amount')), tag: f.get('tag'), date: f.get('date') + " 00:00:00", description: f.get('description') || "" };
      const d = AppData.get('muwatok_cash_data');
      if (eIdx > -1) d.transactions[eIdx] = nt; else d.transactions.push(nt);
      AppData.save('muwatok_cash_data', d);

      // Logic Auto-Allocation Savings
      if (nt.type === 'pemasukan' && eIdx === -1) {
        let savings = AppData.get('muwatok_cash_savings');
        let savingLogs = AppData.get('muwatok_cash_saving_transactions');
        let wasUpdated = false;
        savings.forEach(s => {
          if (s.allocation && s.allocation > 0) {
            const allocatedAmount = nt.amount * (parseFloat(s.allocation) / 100);
            s.current = (parseFloat(s.current) || 0) + allocatedAmount;
            
            // Record internal saving transaction
            savingLogs.push({
              name: `Auto Saving: ${s.name}`,
              amount: allocatedAmount,
              date: new Date().toISOString().replace('T', ' ').split('.')[0],
              savingName: s.name
            });
            wasUpdated = true;
          }
        });
        if (wasUpdated) {
          AppData.save('muwatok_cash_savings', savings);
          AppData.save('muwatok_cash_saving_transactions', savingLogs);
          if (document.getElementById('savingsContainer')) renderSavingsPage();
        }
      }

      toggle(false);
      if (window.location.pathname.includes('index.html') || window.location.pathname === '/') renderDashboard();
      renderTransactionsPage();
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
    });
  };

  /**
   * ==========================================
   * GLOBAL HANDLERS (EXPOSED TO WINDOW)
   * ==========================================
   */
  window.deleteTransaction = (idx) => {
    Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then(r => {
      if (r.isConfirmed) {
        const d = AppData.get('muwatok_cash_data'); d.transactions.splice(idx, 1); AppData.save('muwatok_cash_data', d);
        renderTransactionsPage(); renderDashboard();
      }
    });
  };

  window.deleteTag = (idx) => {
    Swal.fire({ title: 'Hapus Tag?', icon: 'warning', showCancelButton: true }).then(r => {
      if (r.isConfirmed) {
        let t = AppData.get('muwatok_cash_tags'); t.splice(idx, 1); AppData.save('muwatok_cash_tags', t);
        renderTagsPage();
      }
    });
  };

  window.deleteSaving = (idx) => {
    Swal.fire({ title: 'Hapus Goal?', text: "Data tabungan ini akan hilang.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then(r => {
      if (r.isConfirmed) {
        let s = AppData.get('muwatok_cash_savings'); s.splice(idx, 1); AppData.save('muwatok_cash_savings', s);
        renderSavingsPage();
      }
    });
  };

  window.addFundsToSaving = (idx) => {
    const savings = AppData.get('muwatok_cash_savings');
    const s = savings[idx];
    const data = AppData.get('muwatok_cash_data');
    const transactions = data.transactions || [];
    
    // Hitung saldo utama saat ini
    let currentBalance = 0;
    transactions.forEach(t => { if (t.type === 'pemasukan') currentBalance += parseFloat(t.amount); else currentBalance -= parseFloat(t.amount); });
    // Also subtract already existing saving transactions
    const savingTrans = AppData.get('muwatok_cash_saving_transactions');
    savingTrans.forEach(st => { currentBalance -= parseFloat(st.amount) || 0; });

    Swal.fire({
      title: `Top Up: ${s.name}`,
      text: `Masukkan nominal dari Saldo Utama untuk ditabung. Tersedia: ${AppData.formatIDR(currentBalance)}`,
      input: 'number',
      inputAttributes: { min: 0, step: 1000 },
      showCancelButton: true,
      confirmButtonText: 'Pindahkan Dana',
      confirmButtonColor: '#10b981',
      inputValidator: (value) => {
        if (!value || value <= 0) return 'Nominal harus lebih dari 0';
        if (value > currentBalance) return 'Saldo utama tidak mencukupi';
      }
    }).then(result => {
      if (result.isConfirmed) {
        const amount = parseFloat(result.value);
        
        // 1. Update saldo di saving goal
        s.current = (parseFloat(s.current) || 0) + amount;
        AppData.save('muwatok_cash_savings', savings);

        // 2. Simpan ke storage transaksi tabungan yang terpisah
        const st = AppData.get('muwatok_cash_saving_transactions');
        st.push({ name: `Saving: ${s.name}`, amount: amount, date: new Date().toISOString().replace('T', ' ').split('.')[0], description: `Manual top-up from wallet balance.` });
        AppData.save('muwatok_cash_saving_transactions', st);

        renderSavingsPage();
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: `${AppData.formatIDR(amount)} dipindahkan ke tabungan.`, timer: 1500, showConfirmButton: false });
      }
    });
  };

  window.addFundsToInvestment = (idx) => {
    const invs = AppData.get('muwatok_cash_investments');

    // Jika diklik dari tombol ringkasan (-1) dan ada aset, minta pilih aset
    if (idx === -1 && invs.length > 0) {
      const options = {};
      invs.forEach((inv, i) => options[i] = inv.name);
      
      return Swal.fire({
        title: 'Pilih Aset Investasi',
        input: 'select',
        inputOptions: options,
        inputPlaceholder: 'Pilih tujuan deposit...',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
      }).then(res => {
        if (res.isConfirmed && res.value !== '') addFundsToInvestment(parseInt(res.value));
      });
      return;
    }

    const inv = (idx > -1) ? invs[idx] : null;
    const data = AppData.get('muwatok_cash_data');
    const transactions = data.transactions || [];
    const savingTrans = AppData.get('muwatok_cash_saving_transactions');
    const investmentTrans = AppData.get('muwatok_cash_investment_transactions');
    
    // Hitung saldo utama saat ini
    let currentBalance = 0;
    transactions.forEach(t => { if (t.type === 'pemasukan') currentBalance += parseFloat(t.amount); else currentBalance -= parseFloat(t.amount); });
    savingTrans.forEach(st => { currentBalance -= parseFloat(st.amount) || 0; });
    investmentTrans.forEach(it => { currentBalance -= parseFloat(it.amount) || 0; });

    Swal.fire({
      title: inv ? `Deposit: ${inv.name}` : 'Deposit Dana Investasi',
      text: `Pindahkan dana dari Total Balance ke Portofolio. Tersedia: ${AppData.formatIDR(currentBalance)}`,
      input: 'number',
      inputAttributes: { min: 0, step: 1000 },
      showCancelButton: true,
      confirmButtonText: 'Pindahkan Dana',
      confirmButtonColor: '#10b981',
      inputValidator: (value) => {
        if (!value || value <= 0) return 'Nominal harus lebih dari 0';
        if (value > currentBalance) return 'Saldo utama tidak mencukupi';
      }
    }).then(result => {
      if (result.isConfirmed) {
        const amount = parseFloat(result.value);
        
        // 1. Update data investasi jika mendeposit ke aset spesifik
        if (inv) {
          inv.invested = (parseFloat(inv.invested) || 0) + amount;
          inv.currentValue = (parseFloat(inv.currentValue) || 0) + amount;
          AppData.save('muwatok_cash_investments', invs);
        }
        
        // 2. Simpan ke storage transaksi investasi yang terpisah
        investmentTrans.push({ name: inv ? `Deposit: ${inv.name}` : 'General Portfolio Deposit', amount: amount, date: new Date().toISOString().replace('T', ' ').split('.')[0], description: `Manual deposit from wallet balance.` });
        AppData.save('muwatok_cash_investment_transactions', investmentTrans);

        renderInvestmentPage();
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: `${AppData.formatIDR(amount)} dipindahkan ke investasi.`, timer: 1500, showConfirmButton: false });
      }
    });
  };

  window.syncInvestmentPrices = async (btnElement) => {
    const invs = AppData.get('muwatok_cash_investments');
    const cryptoInvs = invs.filter(inv => inv.apiId);

    if (!cryptoInvs.length) {
      return Swal.fire({ icon: 'info', title: 'No Crypto Assets', text: 'Tambahkan "CoinGecko ID" pada aset Anda untuk sinkronisasi harga.' });
    }

    const icon = btnElement ? btnElement.querySelector('i') : null;
    icon.classList.add('fa-spin');
    
    try {
      const ids = cryptoInvs.map(inv => inv.apiId).join(',');
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=idr`);
      const prices = await response.json();

      const newInvs = invs.map(inv => {
        if (inv.apiId && prices[inv.apiId]) {
          const priceInIdr = prices[inv.apiId].idr;
          if (inv.units) {
            inv.currentValue = inv.units * priceInIdr;
          }
        }
        return inv;
      });

      AppData.save('muwatok_cash_investments', newInvs);
      renderInvestmentPage();
      
      // Also sync live USDT card
      await fetchUsdtPrice();

      // Untuk demonstrasi ini, saya tampilkan alert harga saja karena field 'units' belum tersedia
      const priceList = cryptoInvs.map(inv => `${inv.name}: ${AppData.formatIDR(prices[inv.apiId]?.idr || 0)}`).join('<br>');
      
      Swal.fire({ title: 'Latest Prices (IDR)', html: `<div class="text-left text-sm mt-2">${priceList}</div>`, icon: 'success' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Sync Failed', text: 'Gagal mengambil data dari CoinGecko.' });
    } finally {
      if (icon) icon.classList.remove('fa-spin');
    }
  };

  window.deleteInvestment = (idx) => {
    Swal.fire({ title: 'Hapus Aset?', text: "Data investasi ini akan dihapus permanen.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then(r => {
      if (r.isConfirmed) {
        let invs = AppData.get('muwatok_cash_investments'); invs.splice(idx, 1); AppData.save('muwatok_cash_investments', invs);
        renderInvestmentPage();
      }
    });
  };

  /**
   * ==========================================
   * INITIALIZATION
   * ==========================================
   */
  const init = () => {
    initSidebar();
    initMobileSidebar();
    initCurrentDate();

    // Inisialisasi per halaman dengan pengecekan elemen agar tidak error
    if (document.getElementById('totalBalance')) renderDashboard();
    if (document.getElementById('transactionsTableBody')) { initTransactionsPage(); renderTransactionsPage(); }
    if (document.getElementById('tagsContainer')) renderTagsPage();
    if (document.getElementById('savingsContainer')) renderSavingsPage();
    if (document.getElementById('investmentContainer')) renderInvestmentPage();
    if (document.getElementById('usdtPriceValue')) fetchUsdtPrice();
    if (document.getElementById('totalTransCount')) { initAnalyticsPage(); renderAnalytics(); }

    initVisibilityToggle();
    initTagModal();
    initSavingsModal();
    initInvestmentModal();
    initTransactionModal();
  };

  init();

})();
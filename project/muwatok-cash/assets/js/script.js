/**
 * ==========================================
 * DATA & UTILITIES (GLOBAL)
 * ==========================================
 */
const AppData = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || (['muwatok_cash_tags', 'muwatok_cash_savings', 'muwatok_cash_investments', 'muwatok_cash_saving_transactions', 'muwatok_cash_investment_transactions'].includes(key) ? [] : { transactions: [] }),
    save: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    formatIDR: (num) => {
        const isCensored = localStorage.getItem('muwatok_cash_censored') === 'true';
        if (isCensored) return 'Rp ••••••';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num || 0);
    },
    // New utility for formatting number inputs as Rupiah
    formatInputRupiah: (inputElement) => {
        let value = inputElement.value;
        // Hanya izinkan angka dan satu koma desimal
        let cleanValue = value.replace(/[^\d,]/g, '');
        let parts = cleanValue.split(',');
        
        let integerPart = parts[0];
        let decimalPart = parts.length > 1 ? ',' + parts.slice(1).join('').substring(0, 2) : '';

        if (integerPart === '' && decimalPart === '') {
            inputElement.value = '';
            return;
        }

        let formattedInteger = integerPart === '' ? '0' : new Intl.NumberFormat('id-ID').format(parseInt(integerPart, 10));
        inputElement.value = formattedInteger + decimalPart;
    },
    // New utility for parsing formatted Rupiah string back to a number
    parseRupiah: (formattedString) => {
        if (!formattedString) return 0;
        if (typeof formattedString !== 'string') return parseFloat(formattedString) || 0;
        // Hapus titik ribuan dan ganti koma desimal dengan titik standar agar bisa di-parse
        let normalized = formattedString.replace(/\./g, '').replace(',', '.');
        return parseFloat(normalized) || 0;
    }
  };
  window.menuItems = [
    { name: 'Dashboard', icon: 'fas fa-tachometer-alt', link: 'index.html' },
    { name: 'Transactions', icon: 'fas fa-exchange-alt', link: 'transactions.html' },
    { name: 'Analytics', icon: 'fas fa-chart-line', link: 'analytics.html' },
    { name: 'Tags', icon: 'fas fa-tags', link: 'tags.html' },
    { name: 'Investment', icon: 'fas fa-money-bill', link: 'investment.html' },
    { name: 'Savings', icon: 'fas fa-piggy-bank', link: 'savings.html' },
    { name: 'Settings', icon: 'fas fa-cog', link: 'settings.html' },
    { name: 'About', icon: 'fas fa-info-circle', link: 'about.html' },
  ];

  window.state = {
    currentTypeFilter: 'all'
  };

  window.activeCharts = {
    trend: null,
    pie: null,
    bar: null,
    daily: null,
    yearly: null,
    budgetVsActual: null,
    tagComparison: null,
    tagDetail: null
  };

  // Expose AppData globally
  window.AppData = AppData;

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
          <span class="flex-1 whitespace-nowrap">${item.name}</span>
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
      if (typeof renderDashboard === 'function' && document.getElementById('totalBalance')) renderDashboard();
      if (typeof renderTransactionsPage === 'function' && document.getElementById('transactionsTableBody')) renderTransactionsPage();
      if (typeof renderTagsPage === 'function' && document.getElementById('tagsContainer')) renderTagsPage();
      if (typeof renderTagComparisonChart === 'function' && document.getElementById('tagComparisonChart')) renderTagComparisonChart(); // Re-render tag comparison chart
      if (typeof renderAnalytics === 'function' && document.getElementById('totalTransCount')) renderAnalytics();
      if (typeof renderSavingsPage === 'function' && document.getElementById('savingsContainer')) renderSavingsPage();
      if (typeof renderInvestmentPage === 'function' && document.getElementById('investmentContainer')) renderInvestmentPage();
      if (typeof fetchUsdtPrice === 'function' && document.getElementById('usdtPriceValue')) fetchUsdtPrice();
    };

    btn.addEventListener('click', () => {
      const current = localStorage.getItem('muwatok_cash_censored') === 'true';
      localStorage.setItem('muwatok_cash_censored', !current);
      updateUI();
    });

    updateUI();
  };

  window.initBudgetSourceToggle = () => {
    const btn = document.getElementById('toggleBudgetSourceBtn');
    if (!btn) return;

    const updateButtonUI = () => {
        const budgetSource = localStorage.getItem('muwatok_cash_budget_source') || 'all_income'; // Default to 'all_income'
        if (budgetSource === 'salary_only') {
            btn.innerHTML = '<i class="fas fa-hand-holding-usd"></i>'; // Icon for salary
            btn.title = 'Sumber Anggaran: Gaji Saja';
        } else {
            btn.innerHTML = '<i class="fas fa-money-bill-wave"></i>'; // Icon for all income
            btn.title = 'Sumber Anggaran: Semua Pemasukan';
        }
    };

    btn.addEventListener('click', () => {
        const currentSource = localStorage.getItem('muwatok_cash_budget_source') || 'all_income';
        const newSource = currentSource === 'salary_only' ? 'all_income' : 'salary_only';
        localStorage.setItem('muwatok_cash_budget_source', newSource);
        updateButtonUI();
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderTransactionsPage === 'function' && document.getElementById('transactionsTableBody')) renderTransactionsPage();
        if (typeof renderAnalytics === 'function' && document.getElementById('totalTransCount')) renderAnalytics(); // Re-render analytics if open
    });

    updateButtonUI(); // Set initial UI
};


  const initCurrentDate = () => {
    const el = document.getElementById('currentDate');
    if (el) el.textContent = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  window.initSidebar = initSidebar;
  window.initMobileSidebar = initMobileSidebar;
  window.initVisibilityToggle = initVisibilityToggle;
  window.initBudgetSourceToggle = initBudgetSourceToggle;
  window.initCurrentDate = initCurrentDate;

  // USDT PRICE LOGIC
  window.fetchUsdtPrice = async () => {
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

  // INITIALIZATION (GLOBAL & COMMON)
  window.initMuwatokApp = () => {
    initSidebar();
    initMobileSidebar();
    initCurrentDate();
    initVisibilityToggle();
    initBudgetSourceToggle(); // Call the new function
    if (document.getElementById('usdtPriceValue')) fetchUsdtPrice();
  };

  document.addEventListener('DOMContentLoaded', initMuwatokApp);
/**
 * ==========================================
 * TAGS PAGE LOGIC
 * ==========================================
 */
window.renderTagsPage = () => {
    const container = document.getElementById('tagsContainer');
    if (!container) return;
    const transactions = AppData.get('muwatok_cash_data').transactions || [];
    const customTags = AppData.get('muwatok_cash_tags');

    // Ambil nilai filter dari UI
    const fYear = document.getElementById('filterYear')?.value || '';
    const fRange = document.getElementById('filterRange')?.value || '';
    const fSort = document.getElementById('sortTags')?.value || 'count';

    let filteredTransactions = [...transactions];
    const now = new Date();

    // Filter berdasarkan Tahun
    if (fYear !== '') {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date).getFullYear() === parseInt(fYear));
    }

    // Filter berdasarkan Rentang Bulan Terakhir
    if (fRange !== '') {
      const monthsAgo = parseInt(fRange);
      const cutoffDate = new Date();
      cutoffDate.setMonth(now.getMonth() - monthsAgo);
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= cutoffDate);
    }
    
    const map = {};
    customTags.forEach((ct, i) => map[ct.name] = { inc: 0, exp: 0, count: 0, color: ct.color, icon: ct.icon, oIdx: i });
    filteredTransactions.forEach(t => {
      if (!map[t.tag]) map[t.tag] = { inc: 0, exp: 0, count: 0, color: '#6366f1', icon: 'fa-tag' };
      const a = parseFloat(t.amount);
      if (t.type === 'pemasukan') map[t.tag].inc += a; else map[t.tag].exp += a;
      map[t.tag].count++;
    });

    let sorted = Object.entries(map);

    // Logika Pengurutan
    if (fSort === 'asc') sorted.sort((a, b) => a[0].localeCompare(b[0]));
    else if (fSort === 'desc') sorted.sort((a, b) => b[0].localeCompare(a[0]));
    else if (fSort === 'exp_high') sorted.sort((a, b) => b[1].exp - a[1].exp);
    else if (fSort === 'exp_low') sorted.sort((a, b) => a[1].exp - b[1].exp);
    else sorted.sort((a, b) => b[1].count - a[1].count); // Default: Terbanyak digunakan

    if (!sorted.length) { container.innerHTML = '<div class="col-span-full py-10 text-center text-gray-500">No tags.</div>'; return; }

    container.innerHTML = sorted.map(([tag, s]) => {
      const ic = s.icon.startsWith('fa-') ? `fas ${s.icon}` : s.icon;
      const isC = s.oIdx !== undefined;
      return `
        <div class="bg-white dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm relative group">
          <div class="absolute top-4 right-4 flex gap-2">
            <button onclick='showTagDetail("${tag}")' class="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center hover:bg-blue-100 shadow-sm" title="View Details"><i class="fas fa-chart-bar text-[10px]"></i></button>
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

window.renderTagComparisonChart = () => {
    const chartCanvas = document.getElementById('tagComparisonChart');
    if (!chartCanvas || typeof Chart === 'undefined') return;

    const transactions = AppData.get('muwatok_cash_data').transactions || [];
    const customTags = AppData.get('muwatok_cash_tags');

    const fYear = document.getElementById('filterYear')?.value || '';
    const fRange = document.getElementById('filterRange')?.value || '';

    let filteredTransactions = [...transactions];
    const now = new Date();

    if (fYear !== '') {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date).getFullYear() === parseInt(fYear));
    }
    if (fRange !== '') {
      const monthsAgo = parseInt(fRange);
      const cutoffDate = new Date();
      cutoffDate.setMonth(now.getMonth() - monthsAgo);
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= cutoffDate);
    }

    const expenseByTag = {};
    filteredTransactions.filter(t => t.type === 'pengeluaran').forEach(t => {
        expenseByTag[t.tag] = (expenseByTag[t.tag] || 0) + parseFloat(t.amount);
    });

    const chartLabels = Object.keys(expenseByTag);
    const chartData = Object.values(expenseByTag);
    const totalExpense = chartData.reduce((acc, val) => acc + val, 0);
    const chartLabelsFormatted = chartLabels.map((tag, i) => {
        const percent = totalExpense > 0 ? ((chartData[i] / totalExpense) * 100).toFixed(1) : 0;
        return `${tag} (${percent}%)`;
    });

    const chartColors = chartLabels.map(tag => {
        const customTag = customTags.find(ct => ct.name === tag);
        return customTag ? customTag.color : '#6366f1'; // Default color if not found
    });

    const ctx = chartCanvas.getContext('2d');
    if (window.activeCharts.tagComparison) {
        window.activeCharts.tagComparison.destroy();
    }
    window.activeCharts.tagComparison = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: chartLabelsFormatted, datasets: [{ data: chartData, backgroundColor: chartColors, borderWidth: 0 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#94a3b8', padding: 20, usePointStyle: true } },
                tooltip: { callbacks: { label: (context) => `${context.label}: ${AppData.formatIDR(context.raw)}` } }
            },
            cutout: '70%'
        }
    });
};

window.initTagsPage = () => {
    const transactions = AppData.get('muwatok_cash_data').transactions || [];
    const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a);
    const elYear = document.getElementById('filterYear');
    if (elYear) {
      elYear.innerHTML = '<option value="">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
    }

    // Tambahkan listener untuk setiap elemen filter
    ['filterYear', 'filterRange', 'sortTags'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        renderTagsPage();
        renderTagComparisonChart(); // Render chart juga saat filter berubah
      });
    });
};

window.initTagModal = () => {
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
      if (typeof renderTransactionsPage === 'function') renderTransactionsPage(); // Update transactions page if open
      if (typeof renderAnalytics === 'function') renderAnalytics(); // Update analytics page if open
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
    });
};

window.deleteTag = (idx) => {
    Swal.fire({ title: 'Hapus Tag?', icon: 'warning', showCancelButton: true }).then(r => {
      if (r.isConfirmed) {
        let t = AppData.get('muwatok_cash_tags'); t.splice(idx, 1); AppData.save('muwatok_cash_tags', t);
        renderTagsPage();
        if (typeof renderTransactionsPage === 'function') renderTransactionsPage(); // Update transactions page if open
        if (typeof renderAnalytics === 'function') renderAnalytics(); // Update analytics page if open
      }
    });
};

window.showTagDetail = (tagName) => {
    const modal = document.getElementById('tagDetailModal');
    const modalTitle = document.getElementById('tagDetailModalTitle');
    const chartCanvas = document.getElementById('tagDetailChart');
    if (!modal || !modalTitle || !chartCanvas || typeof Chart === 'undefined') return;

    modalTitle.textContent = `Details for: ${tagName}`;
    
    const transactions = AppData.get('muwatok_cash_data').transactions || [];
    const filteredTransactions = transactions.filter(t => t.tag === tagName);

    const monthlyData = {}; // { 'YYYY-MM': { income: 0, expense: 0 } }
    const now = new Date();
    
    // Initialize for last 12 months
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yearMonth = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyData[yearMonth] = { income: 0, expense: 0 };
    }

    filteredTransactions.forEach(t => {
        const date = new Date(t.date);
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        if (monthlyData[yearMonth]) { // Only consider months within our 12-month window
            const amount = parseFloat(t.amount);
            if (t.type === 'pemasukan') {
                monthlyData[yearMonth].income += amount;
            } else {
                monthlyData[yearMonth].expense += amount;
            }
        }
    });

    const labels = Object.keys(monthlyData).sort().map(ym => {
        const [year, month] = ym.split('-');
        return new Date(year, parseInt(month) - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    });
    const incomeData = Object.keys(monthlyData).sort().map(ym => monthlyData[ym].income);
    const expenseData = Object.keys(monthlyData).sort().map(ym => monthlyData[ym].expense);

    const ctx = chartCanvas.getContext('2d');
    if (window.activeCharts.tagDetail) {
        window.activeCharts.tagDetail.destroy();
    }
    window.activeCharts.tagDetail = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#10b981', // Emerald
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    borderColor: '#f43f5e', // Rose
                    backgroundColor: 'rgba(244, 63, 94, 0.2)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8' } },
                tooltip: { callbacks: { label: (context) => { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += AppData.formatIDR(context.parsed.y); } return label; } } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#94a3b8', callback: (value) => AppData.formatIDR(value) }, grid: { color: '#334155' } },
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            }
        }
    });

    modal.classList.remove('hidden');
};

document.getElementById('closeTagDetailModalBtn')?.addEventListener('click', () => { document.getElementById('tagDetailModal').classList.add('hidden'); });
document.getElementById('tagDetailModalBackdrop')?.addEventListener('click', () => { document.getElementById('tagDetailModal').classList.add('hidden'); });

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tagsContainer')) {
        initTagsPage();
        renderTagsPage();
        renderTagComparisonChart(); // Initial render for the chart
        initTagModal();
    }
});
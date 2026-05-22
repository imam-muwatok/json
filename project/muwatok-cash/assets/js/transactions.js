window.initTransactionsPage = () => {
    const elTag = document.getElementById('filterTag');
    if (!elTag) return;
    const transactions = AppData.get('muwatok_cash_data').transactions || [];

    const tags = [...new Set(transactions.map(t => t.tag))].sort();
    elTag.innerHTML = '<option value="">All Tags</option>' + tags.map(t => `<option value="${t}">${t}</option>`).join('');

    const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a,b) => b-a);
    const elYear = document.getElementById('filterYear');
    if (elYear) {
      elYear.innerHTML = '<option value="">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
      elYear.value = new Date().getFullYear();
    }
    const elMonth = document.getElementById('filterMonth');
    if (elMonth) elMonth.value = new Date().getMonth();

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

window.renderTransactionsPage = () => {
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

window.initTransactionModal = () => {
    const modal = document.getElementById('transactionModal'), form = document.getElementById('transactionForm');
    if (!modal || !form) return;

    const tagSelect = form.querySelector('[name="tag"]');
    const populateTags = () => {
      if (!tagSelect) return;
      const transactions = AppData.get('muwatok_cash_data').transactions || [];
      const customTags = AppData.get('muwatok_cash_tags');
      const tags = new Set([...customTags.map(t => t.name), ...transactions.map(t => t.tag)]);
      tagSelect.innerHTML = '<option value="">Select Tag</option>' + Array.from(tags).filter(t => t).sort().map(t => `<option value="${t}">${t}</option>`).join('');
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

    typeGroup?.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => updateTypeUI(btn.dataset.val)));

    const toggle = (show) => {
      modal.classList.toggle('hidden', !show);
      if (!show) {
        form.reset();
        document.getElementById('editIndex').value = "-1";
        document.getElementById('modalTitle').textContent = "Add Transaction";
        updateTypeUI('pengeluaran');
      } else {
        populateTags();
        updateTypeUI('pengeluaran');
        if (document.getElementById('editIndex').value === "-1") form.querySelector('[name="date"]').value = new Date().toISOString().split('T')[0];
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
      if (nt.type === 'pemasukan' && eIdx === -1) { // Only for new income transactions
        let savings = AppData.get('muwatok_cash_savings');
        let savingLogs = AppData.get('muwatok_cash_saving_transactions');
        let wasUpdated = false;
        savings.forEach(s => {
          if (s.allocation && s.allocation > 0) {
            const allocatedAmount = nt.amount * (parseFloat(s.allocation) / 100);
            s.current = (parseFloat(s.current) || 0) + allocatedAmount;
            
            savingLogs.push({ name: `Auto Saving: ${s.name}`, amount: allocatedAmount, date: new Date().toISOString().replace('T', ' ').split('.')[0], description: `Automatic allocation from income.` });
            wasUpdated = true;
          }
        });
        if (wasUpdated) {
          AppData.save('muwatok_cash_savings', savings);
          AppData.save('muwatok_cash_saving_transactions', savingLogs);
          if (typeof renderSavingsPage === 'function') renderSavingsPage(); // Update savings page if open
        }
      }
      toggle(false); renderTransactionsPage();
      if (typeof renderDashboard === 'function') renderDashboard();
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('transactionsTableBody')) { 
        initTransactionsPage(); 
        renderTransactionsPage(); 
        initTransactionModal(); 
    }
});

window.deleteTransaction = (idx) => {
    Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then(r => {
      if (r.isConfirmed) { const d = AppData.get('muwatok_cash_data'); d.transactions.splice(idx, 1); AppData.save('muwatok_cash_data', d); renderTransactionsPage(); if (typeof renderDashboard === 'function') renderDashboard(); }
    });
};
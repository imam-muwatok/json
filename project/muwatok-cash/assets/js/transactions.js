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
    const budgetSource = localStorage.getItem('muwatok_cash_budget_source') || 'all_income';

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
    filtered.forEach(t => { 
      const a = parseFloat(t.amount); 
      if (t.type === 'pemasukan') {
        if (budgetSource === 'salary_only' && (!t.tag || t.tag.toLowerCase() !== 'gaji')) return;
        totals.inc += a;
      } else { 
        totals.exp += a; 
      } 
    });
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

    const amountInput = form.querySelector('[name="amount"]');
    if (amountInput) {
      amountInput.addEventListener('input', () => AppData.formatInputRupiah(amountInput));
    }
    const tagSelect = form.querySelector('[name="tag"]');
    const transactionSourceInput = document.getElementById('transactionSource');
    const sourceOfFundsGroup = document.getElementById('sourceOfFundsGroup');
    const savingsGoalSelection = document.getElementById('savingsGoalSelection');
    const savingsGoalDropdown = document.getElementById('savingsGoalDropdown');

    const populateSavingsGoalsDropdown = () => {
        if (!savingsGoalDropdown) return;
        const savings = AppData.get('muwatok_cash_savings');
        savingsGoalDropdown.innerHTML = '<option value="">-- Select a goal --</option>';
        
        savings.forEach((s, index) => {
            const balance = parseFloat(s.current) || 0;
            // Tampilkan hanya saving yang memiliki saldo tidak nol
            if (balance > 0) {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${s.name} (${AppData.formatIDR(balance)})`;
                savingsGoalDropdown.appendChild(option);
            }
        });
    };

    const updateSourceUI = (val) => {
        if (!transactionSourceInput || !sourceOfFundsGroup) return;
        transactionSourceInput.value = val;
        sourceOfFundsGroup.querySelectorAll('button').forEach(btn => {
            const isActive = btn.dataset.val === val;
            btn.className = `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isActive ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`;
        });
        if (val === 'savings') {
            savingsGoalSelection.classList.remove('hidden');
            populateSavingsGoalsDropdown();
        } else {
            savingsGoalSelection.classList.add('hidden');
        }
    };

    sourceOfFundsGroup?.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => updateSourceUI(btn.dataset.val)));

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
        updateSourceUI('wallet'); // Set default ke wallet saat modal ditutup
      } else {
        populateTags();
        updateTypeUI('pengeluaran');
        if (document.getElementById('editIndex').value === "-1") {
          form.querySelector('[name="date"]').value = new Date().toISOString().split('T')[0];
          updateSourceUI('wallet'); // Set default ke wallet saat menambah transaksi baru
        }
      }
    };

    window.editTransaction = (idx) => {
      const t = AppData.get('muwatok_cash_data').transactions[idx];
      document.getElementById('editIndex').value = idx;
      document.getElementById('modalTitle').textContent = "Edit Transaction";
      toggle(true);
      form.querySelector('[name="name"]').value = t.name;
      amountInput.value = new Intl.NumberFormat('id-ID').format(t.amount); // Format for display
      form.querySelector('[name="tag"]').value = t.tag;
      form.querySelector('[name="date"]').value = t.date.split(' ')[0];
      form.querySelector('[name="description"]').value = t.description || "";
      updateTypeUI(t.type);
      if (t.source === 'savings') {
        updateSourceUI('savings');
        savingsGoalDropdown.value = t.savingsGoalIndex;
      } else {
        updateSourceUI('wallet');
      }
    };

    document.getElementById('addTransactionBtn')?.addEventListener('click', () => toggle(true));
    document.getElementById('closeModalBtn')?.addEventListener('click', () => toggle(false));
    document.getElementById('modalBackdrop')?.addEventListener('click', () => toggle(false));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form), eIdx = parseInt(document.getElementById('editIndex').value);
      const source = transactionSourceInput.value;
      const savingsGoalIndex = (source === 'savings' && savingsGoalDropdown.value !== '') ? parseInt(savingsGoalDropdown.value) : undefined;

      const nt = { 
        name: f.get('name'),
        type: f.get('type'),
        amount: AppData.parseRupiah(f.get('amount')), // Use parseRupiah
        tag: f.get('tag'), 
        date: f.get('date') + " 00:00:00", 
        description: f.get('description') || "",
        source: source,
        savingsGoalIndex: savingsGoalIndex
      };

      const d = AppData.get('muwatok_cash_data');
      let savings = AppData.get('muwatok_cash_savings');
      let savingLogs = AppData.get('muwatok_cash_saving_transactions');

      if (source === 'savings') {
        if (savingsGoalIndex === undefined) return Swal.fire({ icon: 'error', title: 'Error', text: 'Pilih tujuan tabungan!' });
        if (nt.type === 'pengeluaran' && nt.amount > 0) { // Only check if amount is positive
          const sGoal = savings[savingsGoalIndex];
          if (nt.amount > (parseFloat(sGoal.current) || 0)) return Swal.fire({ icon: 'error', title: 'Error', text: 'Saldo tabungan tidak mencukupi!' });
        }
      }

      if (eIdx > -1) {
        const ot = d.transactions[eIdx];
        if (ot.source === 'savings' && ot.savingsGoalIndex !== undefined) {
          const oldS = savings[ot.savingsGoalIndex];
          if (oldS) {
            if (ot.type === 'pengeluaran') {
              oldS.current = (parseFloat(oldS.current) || 0) + ot.amount;
              const lIdx = savingLogs.findIndex(l => l.name === `Withdrawal: ${ot.name}` && l.date === ot.date);
              if (lIdx > -1) savingLogs.splice(lIdx, 1);
            } else {
              oldS.current = (parseFloat(oldS.current) || 0) - ot.amount;
              const lIdx = savingLogs.findIndex(l => l.name === `Deposit: ${ot.name}` && l.date === ot.date);
              if (lIdx > -1) savingLogs.splice(lIdx, 1);
            }
          }
        }
        d.transactions[eIdx] = nt;
      } else {
        d.transactions.push(nt);
      }

      if (nt.source === 'savings' && nt.savingsGoalIndex !== undefined) {
        const newS = savings[nt.savingsGoalIndex];
        if (newS) {
          if (nt.type === 'pengeluaran') {
            newS.current = (parseFloat(newS.current) || 0) - nt.amount;
            savingLogs.push({ name: `Withdrawal: ${nt.name}`, amount: -nt.amount, date: nt.date, description: `Paid for "${nt.name}" from savings goal "${newS.name}".` });
          } else {
            newS.current = (parseFloat(newS.current) || 0) + nt.amount;
            savingLogs.push({ name: `Deposit: ${nt.name}`, amount: nt.amount, date: nt.date, description: `Direct deposit of "${nt.name}" into savings goal "${newS.name}".` });
          }
        }
      }

      AppData.save('muwatok_cash_savings', savings);
      AppData.save('muwatok_cash_saving_transactions', savingLogs);
      AppData.save('muwatok_cash_data', d);

      // Logic Auto-Allocation Savings
      const applyAutoAllocation = () => {
        const currentSavings = AppData.get('muwatok_cash_savings');
        const currentSavingLogs = AppData.get('muwatok_cash_saving_transactions');

        // Fungsi Rekursif untuk mendistribusikan dana (Waterfall Logic)
        const distributeWithOverflow = (amount, goalName, savingsArr, logsArr, percent, visited = new Set()) => {
          if (amount <= 0 || !goalName || visited.has(goalName)) return;
          visited.add(goalName); // Hindari infinite loop (A alihkan ke B, B alihkan ke A)

          const s = savingsArr.find(item => item.name === goalName);
          if (!s) return;

          const target = parseFloat(s.target) || 0;
          const current = parseFloat(s.current) || 0;
          const spaceLeft = Math.max(0, target - current);

          if (spaceLeft > 0) {
              const canTake = Math.min(amount, spaceLeft);
              s.current = current + canTake;
              logsArr.push({ 
                  name: `Auto Saving: ${s.name}`, 
                  amount: canTake, 
                  date: new Date().toISOString().replace('T', ' ').split('.')[0], 
                  description: `Automatic allocation from income.`,
                  sourceTransaction: nt.name,
                  allocationPercent: percent
              });
              const remaining = amount - canTake;
              // Jika masih ada sisa (overflow) dan ada tujuan pengalihan, jalankan rekursi
              if (remaining > 0 && s.redirectGoalName) {
                  distributeWithOverflow(remaining, s.redirectGoalName, savingsArr, logsArr, percent, visited);
              }
          } else if (s.redirectGoalName) {
              // Jika target ini sudah penuh sejak awal, alihkan seluruh dana
              distributeWithOverflow(amount, s.redirectGoalName, savingsArr, logsArr, percent, visited);
          }
        };

        let wasUpdated = false;
        currentSavings.forEach(s => {
          if (s.allocation && s.allocation > 0) {
            const allocatedAmount = nt.amount * (parseFloat(s.allocation) / 100);
            distributeWithOverflow(allocatedAmount, s.name, currentSavings, currentSavingLogs, s.allocation);
            wasUpdated = true;
          }
        });
        if (wasUpdated) {
          AppData.save('muwatok_cash_savings', currentSavings);
          AppData.save('muwatok_cash_saving_transactions', currentSavingLogs);
          if (typeof renderSavingsPage === 'function') renderSavingsPage();
        }
      };

      const finishSubmission = () => {
        toggle(false); renderTransactionsPage();
        if (typeof renderDashboard === 'function') renderDashboard();
        Swal.fire({ icon: 'success', title: 'Berhasil Simpan!', timer: 1500, showConfirmButton: false });
      };

      if (nt.type === 'pemasukan' && eIdx === -1) {
        if (nt.tag.toLowerCase() === 'gaji') {
          applyAutoAllocation();
          finishSubmission();
        } else {
          Swal.fire({
            title: 'Simpan ke Tabungan?',
            text: 'Pendapatan ini bukan gaji. Apakah Anda ingin mengalokasikan ke tabungan secara otomatis sesuai persentase?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Tabungkan',
            cancelButtonText: 'Tidak',
            confirmButtonColor: '#4f46e5'
          }).then((result) => {
            if (result.isConfirmed) applyAutoAllocation();
            finishSubmission();
          });
        }
      } else {
        finishSubmission();
      }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('transactionsTableBody')) {
        initTransactionsPage(); 
        renderTransactionsPage(); 
    }
    // Initialize the transaction modal if its HTML structure is present on the current page.
    // This covers both the dashboard (for adding) and the transactions page (for editing).
    if (document.getElementById('transactionModal')) {
        initTransactionModal();
    }
});

window.deleteTransaction = (idx) => {
    Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then(r => {
      if (r.isConfirmed) { 
        const d = AppData.get('muwatok_cash_data'); 
        const t = d.transactions[idx];
        if (t.source === 'savings' && t.savingsGoalIndex !== undefined) {
          let savings = AppData.get('muwatok_cash_savings');
          let savingLogs = AppData.get('muwatok_cash_saving_transactions');
          const sGoal = savings[t.savingsGoalIndex];
          if (sGoal) {
            if (t.type === 'pengeluaran') {
              sGoal.current = (parseFloat(sGoal.current) || 0) + t.amount;
              const lIdx = savingLogs.findIndex(l => l.name === `Withdrawal: ${t.name}` && l.date === t.date);
              if (lIdx > -1) savingLogs.splice(lIdx, 1);
            } else {
              sGoal.current = (parseFloat(sGoal.current) || 0) - t.amount;
              const lIdx = savingLogs.findIndex(l => l.name === `Deposit: ${t.name}` && l.date === t.date);
              if (lIdx > -1) savingLogs.splice(lIdx, 1);
            }
            AppData.save('muwatok_cash_savings', savings);
            AppData.save('muwatok_cash_saving_transactions', savingLogs);
          }
        }
        d.transactions.splice(idx, 1); 
        AppData.save('muwatok_cash_data', d); 
        renderTransactionsPage(); 
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderSavingsPage === 'function') renderSavingsPage();
      }
    });
};
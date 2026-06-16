/**
 * ==========================================
 * SAVINGS PAGE LOGIC
 * ==========================================
 */
window.renderSavingsPage = () => {
    const container = document.getElementById('savingsContainer');
    if (!container) return;
    const savings = AppData.get('muwatok_cash_savings');
    const savingTrans = AppData.get('muwatok_cash_saving_transactions');
    
    // 1. Hitung Ringkasan Distribusi Otomatis Bulan Ini (Tetap tampilkan bulan berjalan di header)
    const now = new Date();
    const month = now.getMonth(), year = now.getFullYear();
    
    const currentMonthTrans = savingTrans.filter(st => {
      const d = new Date(st.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const totalAutoMonthly = currentMonthTrans.filter(t => t.amount > 0).reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    
    const summaryEl = document.getElementById('autoSavingSummary');
    const totalAutoEl = document.getElementById('totalMonthlyAutoSaved');
    if (summaryEl && totalAutoEl) {
      if (totalAutoMonthly > 0) {
        summaryEl.classList.remove('hidden');
        totalAutoEl.textContent = AppData.formatIDR(totalAutoMonthly);
      } else {
        summaryEl.classList.add('hidden');
      }
    }

    // 2. Render Tabel Riwayat Distribusi (Berdasarkan Filter)
    const fGoal = document.getElementById('filterHistoryGoal')?.value || '';
    const fMonth = document.getElementById('filterHistoryMonth')?.value || '';
    const fYear = document.getElementById('filterHistoryYear')?.value || '';

    const filteredSavingTrans = savingTrans
      .map((st, index) => ({ ...st, originalIndex: index }))
      .filter(st => {
        const d = new Date(st.date);
        const goalMatch = !fGoal || st.name.includes(fGoal) || (st.description && st.description.includes(fGoal));
        const monthMatch = fMonth === '' || d.getMonth() === parseInt(fMonth);
        const yearMatch = fYear === '' || d.getFullYear() === parseInt(fYear);
        return goalMatch && monthMatch && yearMatch;
      });

    const historySection = document.getElementById('savingsHistorySection');
    const historyBody = document.getElementById('savingsHistoryBody');
    if (historySection && historyBody) {
      if (savingTrans.length > 0) {
        historySection.classList.remove('hidden');
        
        // Update list goal di filter dropdown jika sedang render
        updateHistoryFilters(savings, savingTrans);

        if (filteredSavingTrans.length > 0) {
          historyBody.innerHTML = filteredSavingTrans.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map(t => {
          const isInc = t.amount >= 0;
          const cleanName = t.name.replace('Auto Saving: ', '').replace('Withdrawal: ', '').replace('Saving: ', '');
          const sourceInfo = t.sourceTransaction || (t.name.startsWith('Auto Saving:') ? 'Distribusi Otomatis' : '');
          return `
          <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
            <td class="px-6 py-4 text-sm">
              <div class="flex flex-col">
                <span class="font-semibold">${cleanName} ${t.allocationPercent ? `<span class="text-[10px] text-indigo-500 font-bold">(${t.allocationPercent}%)</span>` : ''}</span>
                ${sourceInfo ? `<span class="text-[10px] text-gray-500 italic">${sourceInfo}</span>` : ''}
              </div>
            </td>
            <td class="px-6 py-4 text-xs text-gray-500">${new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td>
            <td class="px-6 py-4 text-right font-bold ${isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
              ${isInc ? '+' : '-'}${AppData.formatIDR(Math.abs(t.amount))}
            </td>
            <td class="px-6 py-4 text-right">
              <button onclick="deleteSavingTransaction(${t.originalIndex})" class="text-rose-400 hover:text-rose-600 transition"><i class="fas fa-trash-alt text-xs"></i></button>
            </td>
          </tr>`;
        }).join('');
        } else {
          historyBody.innerHTML = '<tr><td colspan="4" class="px-6 py-10 text-center text-gray-500 text-xs">Tidak ada riwayat untuk filter ini.</td></tr>';
        }
      } else {
        historySection.classList.add('hidden');
      }
    }
    
    if (!savings.length) { 
      container.innerHTML = '<div class="col-span-full py-20 text-center text-gray-500"><i class="fas fa-piggy-bank text-5xl mb-4 opacity-20"></i><p>No savings goals yet. Start planning your future!</p></div>'; 
      return; 
    }

    container.innerHTML = savings.map((s, i) => {
      const ic = s.icon.startsWith('fa-') ? `fas ${s.icon}` : s.icon;
      const progress = s.target > 0 ? Math.min((s.current / s.target) * 100, 100).toFixed(1) : 0;

      // Hitung akumulasi uang yang pernah masuk (Saldo sekarang + total penarikan yang pernah dilakukan)
      const totalWithdrawals = savingTrans
        .filter(st => st.amount < 0 && st.description && st.description.includes(`"${s.name}"`))
        .reduce((acc, st) => acc + Math.abs(parseFloat(st.amount) || 0), 0);
      const totalAccumulated = (parseFloat(s.current) || 0) + totalWithdrawals;

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
                <span class="text-[10px] text-gray-400 font-medium mt-1 block">Masuk: ${AppData.formatIDR(totalAccumulated)}</span>
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

const updateHistoryFilters = (savings, savingTrans) => {
    const elGoal = document.getElementById('filterHistoryGoal');
    const elYear = document.getElementById('filterHistoryYear');
    
    if (elGoal && elGoal.options.length <= 1) {
        elGoal.innerHTML = '<option value="">Semua Tabungan</option>' + savings.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }
    
    if (elYear && elYear.options.length <= 1) {
        const years = [...new Set(savingTrans.map(t => new Date(t.date).getFullYear()))].sort((a,b) => b-a);
        elYear.innerHTML = '<option value="">Semua Tahun</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
    }
};

window.initSavingsHistoryFilters = () => {
    const elGoal = document.getElementById('filterHistoryGoal');
    const elMonth = document.getElementById('filterHistoryMonth');
    const elYear = document.getElementById('filterHistoryYear');
    
    if (!elGoal || !elMonth || !elYear) return;

    // Set default value ke bulan dan tahun sekarang
    const now = new Date();
    elMonth.value = now.getMonth();
    elYear.value = now.getFullYear();

    [elGoal, elMonth, elYear].forEach(el => {
        el.addEventListener('change', () => {
            renderSavingsPage();
        });
    });
};

window.initSavingsModal = () => {
    const modal = document.getElementById('savingsModal'), form = document.getElementById('savingsForm');
    if (!modal || !form) return;

    const savingsTargetInput = document.getElementById('savingsTarget');
    const savingsCurrentInput = document.getElementById('savingsCurrent');
    const savingsAllocationInput = document.getElementById('savingsAllocation'); // This is percentage, not Rupiah

    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#71717a', '#78716c'
    ];
    const icons = ['fa-piggy-bank', 'fa-car', 'fa-home', 'fa-plane', 'fa-laptop', 'fa-mobile-alt', 'fa-graduation-cap', 'fa-heart', 'fa-briefcase', 'fa-gem', 'fa-motorcycle', 'fa-gift'];

    const toggle = (show) => {
      modal.classList.toggle('hidden', !show);
      if (!show) {
        form.reset();
        if (document.getElementById('editSavingsIndex')) document.getElementById('editSavingsIndex').value = "-1";
        if (document.getElementById('savingsModalTitle')) document.getElementById('savingsModalTitle').textContent = "Add Saving Goal";
        populateRedirectDropdown();
      }
    };

    const populateRedirectDropdown = (currentGoalName = "") => {
        const dropdown = document.getElementById('savingsRedirect');
        if (!dropdown) return;
        const savings = AppData.get('muwatok_cash_savings');
        dropdown.innerHTML = '<option value="">-- Tidak Ada (Berhenti) --</option>';
        savings.forEach(s => {
            if (s.name !== currentGoalName) {
                dropdown.innerHTML += `<option value="${s.name}">${s.name}</option>`;
            }
        });
    };
    
    // Add event listeners for Rupiah formatting
    if (savingsTargetInput) savingsTargetInput.addEventListener('input', () => AppData.formatInputRupiah(savingsTargetInput));
    if (savingsCurrentInput) savingsCurrentInput.addEventListener('input', () => AppData.formatInputRupiah(savingsCurrentInput));
    // savingsAllocationInput is percentage, no Rupiah formatting

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
      if (document.getElementById('savingsModalTitle')) document.getElementById('savingsModalTitle').textContent = "Edit Saving Goal";
      if (document.getElementById('savingsName')) document.getElementById('savingsName').value = s.name;
      
      const targetVal = parseFloat(s.target) || 0;
      const currentVal = parseFloat(s.current) || 0;

      if (savingsTargetInput) savingsTargetInput.value = new Intl.NumberFormat('id-ID').format(targetVal);
      if (savingsCurrentInput) savingsCurrentInput.value = new Intl.NumberFormat('id-ID').format(currentVal);
      
      if (document.getElementById('selectedSavingsIcon')) document.getElementById('selectedSavingsIcon').value = s.icon;
      if (document.getElementById('selectedSavingsColor')) document.getElementById('selectedSavingsColor').value = s.color;
      if (document.getElementById('savingsAllocation')) document.getElementById('savingsAllocation').value = s.allocation || 0;
      
      // Update dropdown pengalihan dan set nilainya
      populateRedirectDropdown(s.name);
      const redirectEl = document.getElementById('savingsRedirect');
      if (redirectEl) redirectEl.value = s.redirectGoalName || "";
      
      renderPickers(); 
      modal.classList.remove('hidden'); // Buka modal tanpa memicu fungsi toggle() yang melakukan reset
    };

    document.getElementById('addSavingsBtn')?.addEventListener('click', () => { populateRedirectDropdown(); renderPickers(); toggle(true); });
    document.getElementById('closeSavingsModalBtn')?.addEventListener('click', () => toggle(false));
    document.getElementById('savingsModalBackdrop')?.addEventListener('click', () => toggle(false));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('savingsName').value.trim();
      const target = AppData.parseRupiah(document.getElementById('savingsTarget').value); // Use parseRupiah
      const current = AppData.parseRupiah(document.getElementById('savingsCurrent').value); // Use parseRupiah
      const allocation = parseFloat(document.getElementById('savingsAllocation').value) || 0;
      const icon = document.getElementById('selectedSavingsIcon').value;
      const color = document.getElementById('selectedSavingsColor').value;
      const redirectGoalName = document.getElementById('savingsRedirect')?.value || "";
      const eIdx = parseInt(document.getElementById('editSavingsIndex').value);

      let savings = AppData.get('muwatok_cash_savings');
      const newSaving = { name, target, current, icon, color, allocation, redirectGoalName };

      if (eIdx > -1) {
        const oldName = savings[eIdx].name;
        if (oldName !== name) {
          // Perbarui referensi pengalihan di tabungan lain jika nama berubah
          savings.forEach(goal => {
            if (goal.redirectGoalName === oldName) goal.redirectGoalName = name;
          });
        }
        savings[eIdx] = newSaving;
      } else {
        savings.push(newSaving);
      }

      AppData.save('muwatok_cash_savings', savings);
      toggle(false); renderSavingsPage();
      if (typeof renderDashboard === 'function') renderDashboard(); // Update dashboard balance
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
    });
};

window.addFundsToSaving = (idx) => {
    const savings = AppData.get('muwatok_cash_savings');
    const s = savings[idx];
    const data = AppData.get('muwatok_cash_data');
    const transactions = data.transactions || [];
    const investmentTrans = AppData.get('muwatok_cash_investment_transactions') || [];
    const savingTrans = AppData.get('muwatok_cash_saving_transactions') || [];
    
    // Hitung saldo dompet (hanya transaksi yang bukan external)
    let walletBalance = 0;
    transactions.forEach(t => { if (t.type === 'pemasukan') walletBalance += parseFloat(t.amount); else walletBalance -= parseFloat(t.amount); });
    savingTrans.forEach(st => { if (!st.isExternal) walletBalance -= parseFloat(st.amount) || 0; });
    investmentTrans.forEach(it => { walletBalance -= parseFloat(it.amount) || 0; });

    Swal.fire({
      title: `Top Up: ${s.name}`,
      background: '#111827',
      color: '#f3f4f6',
      html: `
        <div class="text-left space-y-4 mt-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Nama Transaksi</label>
            <input id="swal-input-name" class="w-full px-4 py-2.5 rounded-xl border border-gray-700 bg-gray-800 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="Misal: Bunga Bank, Topup Gaji">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Nominal</label>
            <input id="swal-input-amount" class="w-full px-4 py-2.5 rounded-xl border border-gray-700 bg-gray-800 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="0" inputmode="numeric">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Sumber Dana</label>
            <select id="swal-input-source" class="w-full px-4 py-2.5 rounded-xl border border-gray-700 bg-gray-800 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition">
              <option value="wallet">Saldo Utama (Wallet)</option>
              <option value="external">Dana Luar (Bunga, Hibah, dll)</option>
            </select>
          </div>
          <p class="text-[11px] text-gray-500 italic">Saldo Utama Tersedia: ${AppData.formatIDR(walletBalance)}</p>
        </div>
      `,
      didOpen: () => {
        const amountInput = document.getElementById('swal-input-amount');
        amountInput.addEventListener('input', () => AppData.formatInputRupiah(amountInput));
      },
      showCancelButton: true,
      confirmButtonText: 'Pindahkan Dana',
      confirmButtonColor: '#10b981',
      preConfirm: () => {
        const name = document.getElementById('swal-input-name').value.trim();
        const amountStr = document.getElementById('swal-input-amount').value;
        const source = document.getElementById('swal-input-source').value;
        const amount = AppData.parseRupiah(amountStr);

        if (!name) { Swal.showValidationMessage('Nama transaksi harus diisi'); return false; }
        if (!amount || amount <= 0) { Swal.showValidationMessage('Nominal harus lebih dari 0'); return false; }
        if (source === 'wallet' && amount > walletBalance) { Swal.showValidationMessage('Saldo utama tidak mencukupi'); return false; }

        return { name, amount, source };
      }
    }).then(result => {
      if (result.isConfirmed) {
        const { name, amount, source } = result.value;
        const isExternal = source === 'external';
        
        s.current = (parseFloat(s.current) || 0) + amount;
        AppData.save('muwatok_cash_savings', savings);

        const st_list = AppData.get('muwatok_cash_saving_transactions');
        st_list.push({ 
          name: `Saving: ${s.name}`, 
          amount: amount, 
          date: new Date().toISOString().replace('T', ' ').split('.')[0], 
          description: `Deposit: ${name}`,
          sourceTransaction: name,
          isExternal: isExternal,
          allocationPercent: null
        });
        AppData.save('muwatok_cash_saving_transactions', st_list);

        renderSavingsPage();
        if (typeof renderDashboard === 'function') renderDashboard(); // Update dashboard balance
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: `${AppData.formatIDR(amount)} dipindahkan ke tabungan.`, timer: 1500, showConfirmButton: false });
      }
    });
};

window.deleteSavingTransaction = (idx) => {
    Swal.fire({
      title: 'Hapus Riwayat?',
      background: '#111827',
      color: '#f3f4f6',
      text: "Saldo di tabungan terkait akan dikurangi sesuai nominal ini.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    }).then(r => {
      if (r.isConfirmed) {
        let savingTrans = AppData.get('muwatok_cash_saving_transactions');
        let savings = AppData.get('muwatok_cash_savings');
        const tx = savingTrans[idx];
        
        const goalName = tx.name.replace('Auto Saving: ', '').replace('Saving: ', '');
        const goal = savings.find(s => s.name === goalName);
        
        if (goal) {
          goal.current = (parseFloat(goal.current) || 0) - (parseFloat(tx.amount) || 0);
          AppData.save('muwatok_cash_savings', savings);
        }
        
        savingTrans.splice(idx, 1);
        AppData.save('muwatok_cash_saving_transactions', savingTrans);
        
        renderSavingsPage();
        if (typeof renderDashboard === 'function') renderDashboard();
        Swal.fire({ icon: 'success', title: 'Berhasil Dihapus', timer: 1500, showConfirmButton: false });
      }
    });
};

window.deleteSaving = (idx) => {
    Swal.fire({ 
      title: 'Hapus Goal?', 
      background: '#111827',
      color: '#f3f4f6',
      text: "Data tabungan ini akan hilang.", 
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonColor: '#ef4444' 
    }).then(r => {
      if (r.isConfirmed) {
        let s = AppData.get('muwatok_cash_savings'); s.splice(idx, 1); AppData.save('muwatok_cash_savings', s);
        renderSavingsPage();
        if (typeof renderDashboard === 'function') renderDashboard(); // Update dashboard balance
      }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('savingsContainer')) {
        initSavingsHistoryFilters();
        renderSavingsPage();
        initSavingsModal();
    }
});
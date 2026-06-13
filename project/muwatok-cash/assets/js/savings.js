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
    
    // 1. Hitung Ringkasan Distribusi Otomatis Bulan Ini
    const now = new Date();
    const month = now.getMonth(), year = now.getFullYear();
    
    const monthlyAutoTrans = savingTrans
      .map((st, index) => ({ ...st, originalIndex: index }))
      .filter(st => {
        const d = new Date(st.date);
        return d.getMonth() === month && d.getFullYear() === year && st.name.startsWith('Auto Saving:');
      });

    const totalAutoMonthly = monthlyAutoTrans.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    
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

    // 2. Render Tabel Riwayat Distribusi
    const historySection = document.getElementById('savingsHistorySection');
    const historyBody = document.getElementById('savingsHistoryBody');
    if (historySection && historyBody) {
      if (monthlyAutoTrans.length > 0) {
        historySection.classList.remove('hidden');
        historyBody.innerHTML = monthlyAutoTrans.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(t => `
          <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
            <td class="px-6 py-4 text-sm font-semibold">${t.name.replace('Auto Saving: ', '')}</td>
            <td class="px-6 py-4 text-xs text-gray-500">${new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td>
            <td class="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">+${AppData.formatIDR(t.amount)}</td>
            <td class="px-6 py-4 text-right">
              <button onclick="deleteSavingTransaction(${t.originalIndex})" class="text-rose-400 hover:text-rose-600 transition"><i class="fas fa-trash-alt text-xs"></i></button>
            </td>
          </tr>
        `).join('');
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
        document.getElementById('editSavingsIndex').value = "-1";
        document.getElementById('savingsModalTitle').textContent = "Add Saving Goal";
      }
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
      document.getElementById('savingsModalTitle').textContent = "Edit Saving Goal"; // Title is text
      document.getElementById('savingsName').value = s.name; // Name is text
      savingsTargetInput.value = new Intl.NumberFormat('id-ID').format(s.target); // Format for display
      savingsCurrentInput.value = new Intl.NumberFormat('id-ID').format(s.current); // Format for display
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
      const target = AppData.parseRupiah(document.getElementById('savingsTarget').value); // Use parseRupiah
      const current = AppData.parseRupiah(document.getElementById('savingsCurrent').value); // Use parseRupiah
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
      if (typeof renderDashboard === 'function') renderDashboard(); // Update dashboard balance
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
    });
};

window.addFundsToSaving = (idx) => {
    const savings = AppData.get('muwatok_cash_savings');
    const s = savings[idx];
    const data = AppData.get('muwatok_cash_data');
    const transactions = data.transactions || [];
    
    let currentBalance = 0;
    transactions.forEach(t => { if (t.type === 'pemasukan') currentBalance += parseFloat(t.amount); else currentBalance -= parseFloat(t.amount); });
    const savingTrans = AppData.get('muwatok_cash_saving_transactions');
    savingTrans.forEach(st => { currentBalance -= parseFloat(st.amount) || 0; });

    Swal.fire({
      title: `Top Up: ${s.name}`,
      text: `Masukkan nominal dari Saldo Utama untuk ditabung. Tersedia: ${AppData.formatIDR(currentBalance)}`,
      input: 'text',
      inputAttributes: { inputmode: 'numeric' },
      didOpen: () => {
        const input = Swal.getInput();
        input.addEventListener('input', () => AppData.formatInputRupiah(input));
      },
      showCancelButton: true,
      confirmButtonText: 'Pindahkan Dana',
      confirmButtonColor: '#10b981',
      inputValidator: (value) => {
        const amount = AppData.parseRupiah(value);
        if (!amount || amount <= 0) return 'Nominal harus lebih dari 0';
        if (amount > currentBalance) return 'Saldo utama tidak mencukupi';
      }
    }).then(result => {
      if (result.isConfirmed) {
        const amount = AppData.parseRupiah(result.value);
        
        s.current = (parseFloat(s.current) || 0) + amount;
        AppData.save('muwatok_cash_savings', savings);

        const st = AppData.get('muwatok_cash_saving_transactions');
        st.push({ name: `Saving: ${s.name}`, amount: amount, date: new Date().toISOString().replace('T', ' ').split('.')[0], description: `Manual top-up from wallet balance.` });
        AppData.save('muwatok_cash_saving_transactions', st);

        renderSavingsPage();
        if (typeof renderDashboard === 'function') renderDashboard(); // Update dashboard balance
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: `${AppData.formatIDR(amount)} dipindahkan ke tabungan.`, timer: 1500, showConfirmButton: false });
      }
    });
};

window.deleteSavingTransaction = (idx) => {
    Swal.fire({
      title: 'Hapus Riwayat?',
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
    Swal.fire({ title: 'Hapus Goal?', text: "Data tabungan ini akan hilang.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then(r => {
      if (r.isConfirmed) {
        let s = AppData.get('muwatok_cash_savings'); s.splice(idx, 1); AppData.save('muwatok_cash_savings', s);
        renderSavingsPage();
        if (typeof renderDashboard === 'function') renderDashboard(); // Update dashboard balance
      }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('savingsContainer')) {
        renderSavingsPage();
        initSavingsModal();
    }
});
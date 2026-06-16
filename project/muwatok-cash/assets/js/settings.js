/**
 * ==========================================
 * SETTINGS PAGE LOGIC
 * ==========================================
 */
window.initSettingsPage = () => {
    // IMPORT DATA LOGIC
    document.getElementById('btnImport')?.addEventListener('click', function() {
      const fileInput = document.getElementById('importFile');
      const file = fileInput.files[0];

      if (!file) {
        Swal.fire({
          icon: 'warning',
          title: 'Oops...',
          text: 'Silakan pilih file JSON terlebih dahulu!',
          confirmButtonColor: '#4f46e5'
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          
          let importedData = {};
          if (data.muwatok_cash_data) {
            // Format Backup Lengkap (Full Backup)
            importedData = data;
          } else if (data.transactions) {
            // Format Legacy (Hanya Transaksi)
            importedData = { muwatok_cash_data: data };
          } else {
            throw new Error('Format file tidak dikenali atau tidak lengkap.');
          }

          // Logika Auto-Add Tags dari transaksi yang diimpor
          const importedTransactions = importedData.muwatok_cash_data.transactions || [];
          const uniqueImportedTags = [...new Set(importedTransactions.map(t => t.tag))];
          
          // Gunakan tag dari backup jika ada, jika tidak gunakan tag saat ini sebagai basis
          let tagsToStore = importedData.muwatok_cash_tags || AppData.get('muwatok_cash_tags');
          
          const colors = [
            '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
            '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#71717a', '#78716c',
            '#991b1b', '#9a3412', '#92400e', '#854d0e', '#3f6212', '#166534', '#065f46', '#115e59', '#155e75', '#075985',
            '#93c5fd', '#a5b4fc', '#c4b5fd', '#d8b4fe', '#f0abfc', '#f9a8d4', '#fda4af', '#cbd5e1', '#d4d4d8', '#d6d3d1'
          ];

          const icons = [
            'fa-tag', 'fa-utensils', 'fa-shopping-cart', 'fa-car', 'fa-home', 'fa-heart', 'fa-briefcase', 'fa-graduation-cap', 'fa-dumbbell', 'fa-plane',
            'fa-gamepad', 'fa-music', 'fa-tv', 'fa-coffee', 'fa-beer', 'fa-gift', 'fa-medkit', 'fa-tools', 'fa-money-bill', 'fa-credit-card',
            'fa-piggy-bank', 'fa-chart-line', 'fa-laptop', 'fa-mobile-alt', 'fa-camera', 'fa-bicycle', 'fa-bus', 'fa-train', 'fa-ship', 'fa-pills',
            'fa-umbrella', 'fa-cloud', 'fa-bolt', 'fa-key', 'fa-flask', 'fa-microchip', 'fa-headphones', 'fa-dice', 'fa-puzzle-piece', 'fa-landmark',
            'fa-smoking', 'fa-motorcycle', 'fa-baby', 'fa-bath', 'fa-bed', 'fa-calculator', 'fa-clock', 'fa-envelope', 'fa-file-invoice-dollar', 'fa-film',
            'fa-fire', 'fa-fish', 'fa-football-ball', 'fa-glass-cheers', 'fa-hamburger', 'fa-hospital', 'fa-ice-cream', 'fa-palette', 'fa-pizza-slice', 'fa-rocket',
            'fa-seedling', 'fa-store', 'fa-subway', 'fa-taxi', 'fa-ticket-alt', 'fa-tooth', 'fa-truck', 'fa-wifi', 'fa-wine-glass', 'fa-cloud-meatball'
          ];

          uniqueImportedTags.forEach(tagName => {
            const tagExists = tagsToStore.some(t => t.name.toLowerCase() === tagName.toLowerCase());
            if (!tagExists) {
              const usedColors = tagsToStore.map(t => t.color);
              const availableColors = colors.filter(c => !usedColors.includes(c));
              
              const randomColor = availableColors.length > 0 ? availableColors[Math.floor(Math.random() * availableColors.length)] : colors[Math.floor(Math.random() * colors.length)];
              const randomIcon = icons[Math.floor(Math.random() * icons.length)];

              tagsToStore.push({
                name: tagName,
                icon: randomIcon,
                color: randomColor
              });
            }
          });

          // Simpan seluruh kategori data
          AppData.save('muwatok_cash_tags', tagsToStore);
          AppData.save('muwatok_cash_data', importedData.muwatok_cash_data);
          AppData.save('muwatok_cash_savings', importedData.muwatok_cash_savings || []);
          AppData.save('muwatok_cash_investments', importedData.muwatok_cash_investments || []);
          AppData.save('muwatok_cash_saving_transactions', importedData.muwatok_cash_saving_transactions || []);
          AppData.save('muwatok_cash_investment_transactions', importedData.muwatok_cash_investment_transactions || []);
          AppData.save('muwatok_cash_settings', importedData.muwatok_cash_settings || { strategy: 'manual', limit: 0 });
          localStorage.setItem('muwatok_cash_censored', String(importedData.muwatok_cash_censored || 'false'));

          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Data keuangan telah berhasil diimpor.',
            confirmButtonColor: '#4f46e5'
          }).then(() => {
            window.location.href = 'index.html';
          });

        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Import Gagal',
            text: 'Terjadi kesalahan saat membaca file: ' + error.message,
            confirmButtonColor: '#4f46e5'
          });
        }
      };
      reader.readAsText(file);
    });

    // RESET DATA LOGIC
    document.getElementById('btnReset')?.addEventListener('click', function() {
      Swal.fire({
        title: 'Hapus Semua Data?',
        background: '#111827',
        color: '#f3f4f6',
        text: "Semua transaksi dan kustomisasi tag akan hilang selamanya!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4f46e5',
        confirmButtonText: 'Ya, Hapus Semua!',
        cancelButtonText: 'Batal'
      }).then((result) => {
        if (result.isConfirmed) {
          localStorage.removeItem('muwatok_cash_data');
          localStorage.removeItem('muwatok_cash_tags');
          localStorage.removeItem('muwatok_cash_savings');
          localStorage.removeItem('muwatok_cash_investments');
          localStorage.removeItem('muwatok_cash_saving_transactions');
          localStorage.removeItem('muwatok_cash_investment_transactions');
          localStorage.removeItem('muwatok_cash_settings');
          localStorage.removeItem('muwatok_cash_censored');
          // Menghapus semua data yang berkaitan dengan prefix muwatok_cash_
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('muwatok_cash_')) {
              localStorage.removeItem(key);
            }
          });
          
          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Semua data telah dibersihkan.',
            confirmButtonColor: '#4f46e5'
          }).then(() => {
            window.location.href = 'index.html';
          });
        }
      });
    });

    // EXPORT DATA LOGIC
    document.getElementById('btnExport')?.addEventListener('click', function() {
      const keys = [
        'muwatok_cash_data', 'muwatok_cash_tags', 'muwatok_cash_settings', 'muwatok_cash_censored',
        'muwatok_cash_savings', 'muwatok_cash_saving_transactions', 'muwatok_cash_investments', 'muwatok_cash_investment_transactions'
      ];

      const fullBackup = {};
      keys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) fullBackup[key] = JSON.parse(val);
      });

      if (Object.keys(fullBackup).length === 0) {
        Swal.fire({ icon: 'error', title: 'Ekspor Gagal', text: 'Tidak ada data untuk diekspor.', confirmButtonColor: '#4f46e5' });
        return;
      }

      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      a.href = url;
      a.download = `muwatok-cash-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Data telah berhasil diekspor sebagai file JSON.', timer: 1500, showConfirmButton: false });
    });

    // UPDATE DATA STRUCTURE LOGIC
    document.getElementById('btnUpdateData')?.addEventListener('click', function() {
      let savingTrans = AppData.get('muwatok_cash_saving_transactions');
      let savings = AppData.get('muwatok_cash_savings');
      let count = 0;

      const updatedTrans = savingTrans.map(t => {
        let changed = false;
        // Hanya perbarui jika ini adalah log alokasi otomatis
        if (t.name.startsWith('Auto Saving:')) {
          // Cek apakah data persentase atau sumber transaksi benar-benar kosong (undefined/null/empty)
          const isAllocationMissing = t.allocationPercent === undefined || t.allocationPercent === null;
          const isSourceMissing = !t.sourceTransaction || t.sourceTransaction.trim() === '';

          if (isAllocationMissing) {
            const goalName = t.name.replace('Auto Saving: ', '');
            const goal = savings.find(s => s.name === goalName);
            t.allocationPercent = goal ? goal.allocation : 0;
            changed = true;
          }
          if (isSourceMissing) {
            t.sourceTransaction = 'Distribusi Otomatis (Legacy)';
            changed = true;
          }
        } else if (t.name.startsWith('Saving:') && t.isExternal === undefined) {
            t.isExternal = false; // Default untuk top-up manual lama adalah dari wallet
            changed = true;
        }
        if (changed) count++;
        return t;
      });

      if (count > 0) {
        AppData.save('muwatok_cash_saving_transactions', updatedTrans);
        Swal.fire({
          icon: 'success',
          background: '#111827',
          color: '#f3f4f6',
          title: 'Berhasil!',
          text: `${count} riwayat tabungan telah diperbarui dengan informasi persentase dan sumber data.`,
          confirmButtonColor: '#4f46e5'
        });
      } else {
        Swal.fire({ 
          icon: 'info', 
          background: '#111827',
          color: '#f3f4f6',
          title: 'Sudah Terkini', 
          text: 'Semua data riwayat Anda sudah memiliki struktur terbaru.', 
          confirmButtonColor: '#4f46e5' 
        });
      }
    });

    // BUDGET SETTINGS LOGIC
    const strategySelect = document.getElementById('budgetStrategy');
    const manualContent = document.getElementById('manualBudgetContent');
    const budgetInput = document.getElementById('monthlyBudgetLimit');
    const btnSaveBudget = document.getElementById('btnSaveBudget');

    if (budgetInput) {
      budgetInput.addEventListener('input', () => AppData.formatInputRupiah(budgetInput));
    }

    const loadSettings = () => {
      const settings = JSON.parse(localStorage.getItem('muwatok_cash_settings')) || { strategy: 'manual', limit: 0 };
      if (strategySelect) strategySelect.value = settings.strategy;
      if (budgetInput) budgetInput.value = new Intl.NumberFormat('id-ID').format(settings.limit); // Format for display
      if (manualContent) manualContent.classList.toggle('hidden', settings.strategy !== 'manual');
    };

    strategySelect?.addEventListener('change', (e) => {
      if (manualContent) manualContent.classList.toggle('hidden', e.target.value !== 'manual');
    });

    btnSaveBudget?.addEventListener('click', () => {
      const settings = { strategy: strategySelect.value, limit: AppData.parseRupiah(budgetInput.value) }; // Use parseRupiah
      localStorage.setItem('muwatok_cash_settings', JSON.stringify(settings));
      Swal.fire({ icon: 'success', title: 'Saved!', text: 'Target anggaran telah diperbarui.', timer: 1500, showConfirmButton: false });
      if (typeof renderDashboard === 'function') renderDashboard(); // Update dashboard budget info
    });

    loadSettings();
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('budgetStrategy')) { // Check for an element unique to settings page
        initSettingsPage();
    }
});
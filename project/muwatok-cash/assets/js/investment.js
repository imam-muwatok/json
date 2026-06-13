/**
 * ==========================================
 * INVESTMENT PAGE LOGIC
 * ==========================================
 */
window.renderInvestmentPage = () => {
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
      const caretIcon = elTotalPL.previousElementSibling;
      if (caretIcon && caretIcon.tagName === 'I') {
        caretIcon.className = `fas fa-caret-${isProfit ? 'up' : 'down'} text-${isProfit ? 'emerald' : 'rose'}-500`;
      }
    }
    if (elTotalROI) {
      elTotalROI.textContent = `${totalROI}%`;
      elTotalROI.className = `text-xs font-bold px-2 py-0.5 rounded-lg ${isProfit ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'}`;
    }

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

window.fetchCoinGeckoAssetData = async (apiId) => {
    const displayDiv = document.getElementById('coingeckoDataDisplay');
    const currentPriceEl = document.getElementById('cgCurrentPrice');
    const changeEl = document.getElementById('cg24hChange');
    const marketCapEl = document.getElementById('cgMarketCap');
    
    if (!displayDiv || !currentPriceEl || !changeEl || !marketCapEl) return;
    const applyPriceBtn = document.getElementById('applyCgPriceBtn');

    if (!apiId) {
      displayDiv.classList.add('hidden');
      return;
    }

    displayDiv.classList.remove('hidden');
    currentPriceEl.textContent = 'Loading...';
    changeEl.textContent = 'Loading...';
    changeEl.className = 'text-sm font-semibold';
    marketCapEl.textContent = 'Loading...'; 
    if (applyPriceBtn) applyPriceBtn.classList.add('hidden');

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
          applyPriceBtn.classList.remove('hidden');
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

window.initInvestmentModal = () => {
    const modal = document.getElementById('investmentModal'), form = document.getElementById('investmentForm');
    if (!modal || !form) return;

    const invInvestedInput = document.getElementById('invInvested');
    if (invInvestedInput) {
      invInvestedInput.addEventListener('input', () => AppData.formatInputRupiah(invInvestedInput));
    }
    const invNameSelect = $('#invName');

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
              id: coin.name,
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

      invNameSelect.on('select2:select', function (e) {
        const data = e.params.data;
        const apiIdInput = document.getElementById('invApiId');
        if (apiIdInput) {
          apiIdInput.value = data.apiId;
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
        invNameSelect.val(null).trigger('change');
        form.reset();
        const editIdx = document.getElementById('editInvIndex');
        const modalTitle = document.getElementById('invModalTitle');
        if (editIdx) editIdx.value = "-1";
        if (modalTitle) modalTitle.textContent = "Add Crypto Asset";
        document.getElementById('selectedInvColor').value = "#6366f1";
        document.getElementById('coingeckoDataDisplay')?.classList.add('hidden');
      }
    };

    const renderPickers = () => {
      const cGrid = document.getElementById('invColorGrid');
      cGrid.innerHTML = colors.map(c => `<button type="button" data-color="${c}" class="inv-color-opt w-6 h-6 rounded-full border-2 border-transparent" style="background-color: ${c}"></button>`).join('');

      cGrid.querySelectorAll('.inv-color-opt').forEach(b => b.addEventListener('click', () => {
        cGrid.querySelectorAll('.inv-color-opt').forEach(x => x.classList.remove('border-white', 'scale-125'));
        b.classList.add('border-white', 'scale-125');
        document.getElementById('selectedInvColor').value = b.dataset.color;
      }));

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
      document.getElementById('invApiId').value = inv.apiId || "";
      document.getElementById('invSourceContainer')?.classList.add('hidden');
      document.getElementById('editInvIndex').value = idx;
      
      if (invNameSelect.hasClass('select2-hidden-accessible')) {
        const newOption = new Option(inv.name, inv.name, true, true);
        invNameSelect.append(newOption).trigger('change');
      }

      document.getElementById('invModalTitle').textContent = "Edit Crypto Asset";
      document.getElementById('invName').value = inv.name;
      document.getElementById('invApiId').value = inv.apiId || "";
      document.getElementById('invUnits').value = inv.units || ""; // Units are not Rupiah
      invInvestedInput.value = new Intl.NumberFormat('id-ID').format(inv.invested); // Format for display
      document.getElementById('invDate').value = inv.date ? inv.date.split(' ')[0] : new Date().toISOString().split('T')[0];
      document.getElementById('selectedInvColor').value = inv.color;
      renderPickers();
      toggle(true);
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
      const invested = AppData.parseRupiah(document.getElementById('invInvested').value); // Use parseRupiah
      const date = document.getElementById('invDate').value + " 00:00:00";
      const color = document.getElementById('selectedInvColor').value;
      const eIdx = parseInt(document.getElementById('editInvIndex').value);
      const source = document.getElementById('invSource')?.value || 'external';
      let invs = AppData.get('muwatok_cash_investments');

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
          
          const it = AppData.get('muwatok_cash_investment_transactions');
          it.push({ 
            name: `Swap USDT to ${name}`, 
            amount: 0,
            date: new Date().toISOString().replace('T', ' ').split('.')[0], 
            description: `Swapped ${AppData.formatIDR(invested)} worth of USDT into ${name}.` 
          });
          AppData.save('muwatok_cash_investment_transactions', it);

          tether.units -= (tether.units * ratio);
          tether.invested -= (tether.invested * ratio);
          tether.currentValue -= invested;

          if (tether.currentValue < 1) {
            invs.splice(tetherIdx, 1);
          }
        }
      }

      const initialCurrentValue = (eIdx === -1) ? invested : invs[eIdx].currentValue;
      const newInv = { name, apiId, units, invested, currentValue: initialCurrentValue, date, icon: 'fa-bitcoin', color };

      if (eIdx > -1) invs[eIdx] = newInv;
      else invs.push(newInv);

      AppData.save('muwatok_cash_investments', invs);
      toggle(false); renderInvestmentPage();
      if (typeof fetchUsdtPrice === 'function') fetchUsdtPrice(); // Update USDT price card
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
    });
};

window.addFundsToInvestment = (idx) => {
    const invs = AppData.get('muwatok_cash_investments');

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
    }

    const inv = (idx > -1) ? invs[idx] : null;
    const data = AppData.get('muwatok_cash_data');
    const transactions = data.transactions || [];
    const savingTrans = AppData.get('muwatok_cash_saving_transactions');
    const investmentTrans = AppData.get('muwatok_cash_investment_transactions');
    
    let currentBalance = 0;
    transactions.forEach(t => { if (t.type === 'pemasukan') currentBalance += parseFloat(t.amount); else currentBalance -= parseFloat(t.amount); });
    savingTrans.forEach(st => { currentBalance -= parseFloat(st.amount) || 0; });
    investmentTrans.forEach(it => { currentBalance -= parseFloat(it.amount) || 0; });

    Swal.fire({
      title: inv ? `Deposit: ${inv.name}` : 'Deposit Dana Investasi',
      text: `Pindahkan dana dari Total Balance ke Portofolio. Tersedia: ${AppData.formatIDR(currentBalance)}`,
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
        
        if (inv) {
          inv.invested = (parseFloat(inv.invested) || 0) + amount;
          inv.currentValue = (parseFloat(inv.currentValue) || 0) + amount;
          AppData.save('muwatok_cash_investments', invs);
        }
        
        investmentTrans.push({ name: inv ? `Deposit: ${inv.name}` : 'General Portfolio Deposit', amount: amount, date: new Date().toISOString().replace('T', ' ').split('.')[0], description: `Manual deposit from wallet balance.` });
        AppData.save('muwatok_cash_investment_transactions', investmentTrans);

        renderInvestmentPage();
        if (typeof renderDashboard === 'function') renderDashboard(); // Update dashboard balance
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
    if (icon) icon.classList.add('fa-spin');
    
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
      
      if (typeof fetchUsdtPrice === 'function') await fetchUsdtPrice();

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
        if (typeof renderDashboard === 'function') renderDashboard(); // Update dashboard balance
      }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('investmentContainer')) {
        renderInvestmentPage();
        initInvestmentModal();
    }
});
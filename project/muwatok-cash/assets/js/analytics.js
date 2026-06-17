/**
 * ==========================================
 * ANALYTICS LOGIC
 * ==========================================
 */
window.initAnalyticsPage = () => {
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

window.renderAnalytics = () => {
    const elCount = document.getElementById('totalTransCount');
    if (!elCount || typeof Chart === 'undefined') return;

    const transactions = AppData.get('muwatok_cash_data').transactions || [];
    const customTags = AppData.get('muwatok_cash_tags');
    const budgetSource = localStorage.getItem('muwatok_cash_budget_source') || 'all_income';

    const fMonth = document.getElementById('filterMonth')?.value || '';
    const fYear = document.getElementById('filterYear')?.value || '';

    // Calculations
    const monthLabels = [], incData = [], expData = [], budgetExpData = [];
    
    if (fYear === '') {
      // Default: Last 6 months
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth(), y = d.getFullYear();
        monthLabels.push(new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d));
        const filtered = transactions.filter(t => { const td = new Date(t.date); return td.getMonth() === m && td.getFullYear() === y; });
        incData.push(filtered.filter(t => t.type === 'pemasukan').reduce((acc, t) => {
          if (budgetSource === 'salary_only' && (!t.tag || t.tag.toLowerCase() !== 'gaji')) return acc;
          return acc + parseFloat(t.amount);
        }, 0));
        expData.push(filtered.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + parseFloat(t.amount), 0));
        budgetExpData.push(filtered.filter(t => t.type === 'pengeluaran' && !t.excludeFromBudget).reduce((acc, t) => acc + parseFloat(t.amount), 0));
      }
    } else {
      // Full Year trend
      const y = parseInt(fYear);
      for (let m = 0; m <= 11; m++) {
        const d = new Date(y, m, 1);
        monthLabels.push(new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d));
        const filtered = transactions.filter(t => { const td = new Date(t.date); return td.getMonth() === m && td.getFullYear() === y; });
        incData.push(filtered.filter(t => t.type === 'pemasukan').reduce((acc, t) => {
          if (budgetSource === 'salary_only' && (!t.tag || t.tag.toLowerCase() !== 'gaji')) return acc;
          return acc + parseFloat(t.amount);
        }, 0));
        expData.push(filtered.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + parseFloat(t.amount), 0));
        budgetExpData.push(filtered.filter(t => t.type === 'pengeluaran' && !t.excludeFromBudget).reduce((acc, t) => acc + parseFloat(t.amount), 0));
      }
    }

    const remData = incData.map((inc, i) => inc - expData[i]);

    // Stats for cards (Filtered by Month AND Year)
    let filteredForStats = transactions;
    if (fYear !== '') filteredForStats = filteredForStats.filter(t => new Date(t.date).getFullYear() === parseInt(fYear));
    if (fMonth !== '') filteredForStats = filteredForStats.filter(t => new Date(t.date).getMonth() === parseInt(fMonth));

    const totalInc = filteredForStats.filter(t => t.type === 'pemasukan').reduce((acc, t) => {
      if (budgetSource === 'salary_only' && (!t.tag || t.tag.toLowerCase() !== 'gaji')) return acc;
      return acc + parseFloat(t.amount);
    }, 0);
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

        const totalMonthIncome = transactions
          .filter(t => { const td = new Date(t.date); return td.getMonth() === m && td.getFullYear() === y && t.type === 'pemasukan'; })
          .reduce((acc, t) => {
            if (budgetSource === 'salary_only' && (!t.tag || t.tag.toLowerCase() !== 'gaji')) return acc;
            return acc + parseFloat(t.amount);
          }, 0);

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
                segment: {
                  borderColor: ctx => ctx.p1.parsed.y < 0 ? '#f43f5e' : '#6366f1',
                },
                fill: {
                  target: 'origin',
                  above: 'rgba(99, 102, 241, 0.1)', // Warna biru transparan di atas 0
                  below: 'rgba(244, 63, 94, 0.1)'   // Warna merah transparan di bawah 0
                },
                tension: 0.3, 
                pointRadius: 3,
                pointBackgroundColor: ctx => ctx.parsed.y < 0 ? '#f43f5e' : '#6366f1',
                pointBorderColor: ctx => ctx.parsed.y < 0 ? '#f43f5e' : '#6366f1'
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

    // Budget vs Actual Chart Logic
    const bvaCtx = document.getElementById('budgetVsActualChart')?.getContext('2d');
    if (bvaCtx) {
      const budgetSettings = JSON.parse(localStorage.getItem('muwatok_cash_settings')) || { strategy: 'manual', limit: 0 };
      const strategyRatios = {
        'extreme': 0.3, 'hard': 0.5, 'medium': 0.7, 'normal': 0.8, 'easy': 0.9, '503020': 0.8, '702010': 0.7
      };
      
      let autoSavingRatio = 0;
      if (budgetSettings.strategy === 'autosaving') {
        const savings = AppData.get('muwatok_cash_savings') || [];
        const totalAllocation = savings.reduce((acc, s) => acc + (parseFloat(s.allocation) || 0), 0);
        autoSavingRatio = Math.max(0, 1 - (totalAllocation / 100));
      }

      const targetData = incData.map(inc => {
        if (budgetSettings.strategy === 'manual') return inc * (budgetSettings.limit / 100);
        if (budgetSettings.strategy === 'autosaving') return inc * autoSavingRatio;
        const ratio = strategyRatios[budgetSettings.strategy] || 0;
        return inc * ratio;
      });

      if (activeCharts.budgetVsActual) activeCharts.budgetVsActual.destroy();
      activeCharts.budgetVsActual = new Chart(bvaCtx, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [
            {
              label: 'Budget Target',
              data: targetData,
              backgroundColor: 'rgba(148, 163, 184, 0.2)',
              borderColor: '#94a3b8',
              borderWidth: 1,
              borderRadius: 4,
              barPercentage: 0.8,
              categoryPercentage: 0.7
            },
            {
              label: 'Actual Spending',
              data: budgetExpData,
              backgroundColor: (ctx) => {
                const idx = ctx.dataIndex;
                return budgetExpData[idx] > targetData[idx] ? '#f43f5e' : '#10b981';
              },
              borderRadius: 4,
              barPercentage: 0.8,
              categoryPercentage: 0.7
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#94a3b8' } },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = AppData.formatIDR(ctx.parsed.y);
                  if (ctx.datasetIndex === 1) {
                    const target = targetData[ctx.dataIndex];
                    const diff = ctx.parsed.y - target;
                    return `${ctx.dataset.label}: ${val} (${diff > 0 ? 'Over' : 'Under'} ${AppData.formatIDR(Math.abs(diff))})`;
                  }
                  return `${ctx.dataset.label}: ${val}`;
                }
              }
            }
          },
          scales: {
            y: { ticks: { color: '#94a3b8', callback: (val) => AppData.formatIDR(val) }, grid: { color: '#334155' } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }

    const barCtx = document.getElementById('monthlyBarChart')?.getContext('2d');
    if (barCtx) {
      if (activeCharts.bar) activeCharts.bar.destroy();
      activeCharts.bar = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [
            { label: 'Income', data: incData, backgroundColor: '#10b981', borderRadius: 6, barPercentage: 0.6 },
            { label: 'Expense', data: expData, backgroundColor: '#f43f5e', borderRadius: 6, barPercentage: 0.6 },
            { label: 'Balance', data: remData, backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 6, barPercentage: 0.6 }
          ]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { 
            legend: { labels: { color: '#94a3b8' } },
            tooltip: { 
              callbacks: { 
                label: (ctx) => {
                  const val = ctx.parsed.y;
                  const income = incData[ctx.dataIndex];
                  let label = `${ctx.dataset.label}: ${AppData.formatIDR(val)}`;
                  if (ctx.datasetIndex > 0 && income > 0) {
                    const pct = ((val / income) * 100).toFixed(1);
                    label += ` (${pct}%)`;
                  }
                  return label;
                }
              } 
            }
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
        chartLabels.push(`Balance (${p}%)`);
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

    // Yearly Comparison Chart (Across all years in history)
    const yearlyCtx = document.getElementById('yearlyChart')?.getContext('2d');
    if (yearlyCtx) {
      const yearlyTotals = {};
      transactions.forEach(t => {
        const yr = new Date(t.date).getFullYear();
        if (!yearlyTotals[yr]) yearlyTotals[yr] = { inc: 0, exp: 0 };
        const val = parseFloat(t.amount) || 0;
        if (t.type === 'pemasukan') yearlyTotals[yr].inc += val;
        else yearlyTotals[yr].exp += val;
      });

      const sortedYrs = Object.keys(yearlyTotals).sort();
      const yIncData = sortedYrs.map(y => yearlyTotals[y].inc);
      const yExpData = sortedYrs.map(y => yearlyTotals[y].exp);
      const yRemData = sortedYrs.map(y => yearlyTotals[y].inc - yearlyTotals[y].exp);

      if (activeCharts.yearly) activeCharts.yearly.destroy();
      activeCharts.yearly = new Chart(yearlyCtx, {
        type: 'bar',
        plugins: [{
          id: 'barLabels',
          afterDatasetsDraw(chart) {
            const { ctx, data } = chart;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.font = 'bold 9px Inter';
            ctx.fillStyle = '#94a3b8';
            data.datasets.forEach((dataset, i) => {
              if (i === 0) return; // Lewati persentase untuk Income
              const meta = chart.getDatasetMeta(i);
              meta.data.forEach((bar, index) => {
                const income = data.datasets[0].data[index];
                if (income > 0) {
                  const val = dataset.data[index];
                  const pct = ((val / income) * 100).toFixed(0) + '%';
                  // Posisi teks: di atas bar jika positif, di bawah jika negatif
                  ctx.fillText(pct, bar.x, val >= 0 ? bar.y - 2 : bar.y + 10);
                }
              });
            });
            ctx.restore();
          }
        }],
        data: {
          labels: sortedYrs,
          datasets: [
            { label: 'Income', data: yIncData, backgroundColor: '#10b981', borderRadius: 6 },
            { label: 'Expense', data: yExpData, backgroundColor: '#f43f5e', borderRadius: 6 },
            { label: 'Balance', data: yRemData, backgroundColor: 'rgba(99, 102, 241, 0.6)', borderRadius: 6 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#94a3b8' } },
            tooltip: { 
              callbacks: { 
                label: (ctx) => {
                  const val = ctx.parsed.y;
                  const income = yIncData[ctx.dataIndex];
                  let label = `${ctx.dataset.label}: ${AppData.formatIDR(val)}`;
                  if (ctx.datasetIndex > 0 && income > 0) {
                    const pct = ((val / income) * 100).toFixed(1);
                    label += ` (${pct}%)`;
                  }
                  return label;
                }
              } 
            }
          },
          scales: {
            y: { ticks: { color: '#94a3b8', callback: (val) => AppData.formatIDR(val) }, grid: { color: '#334155' } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('totalTransCount')) {
        initAnalyticsPage();
        renderAnalytics();
    }
});
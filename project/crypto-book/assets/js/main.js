// main.js
        const LOCAL_STORAGE_KEY = 'crypto_book'; 

        class DepositRecord {
            constructor(idrAmount, usdtAmount, date = new Date(), type = 'deposit') { 
                this.date = date instanceof Date ? date : new Date(date);
                this.idrAmount = idrAmount;
                this.usdtAmount = usdtAmount;
                this.type = type; 
                this.exchangeRate = (this.usdtAmount > 0 && this.idrAmount > 0) ? this.idrAmount / this.usdtAmount : 0;
            }

            displayTableRowHtml() {
                const formattedDate = this.date.toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                let idrDisplay = `${this.idrAmount.toLocaleString('id-ID')} IDR`;
                let usdtDisplay = `${this.usdtAmount.toFixed(4)} USDT`;
                let rateDisplay = this.exchangeRate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                let typeClass = "";
                let typeText = this.type.charAt(0).toUpperCase() + this.type.slice(1);

                if (this.type === 'deposit') {
                    typeClass = "color: green;";
                } else if (this.type === 'withdraw') {
                    typeClass = "color: red;";
                    idrDisplay = `-${idrDisplay}`; 
                    usdtDisplay = `-${usdtDisplay}`; 
                }

                return `
                    <tr>
                        <td>${formattedDate}</td>
                        <td style="${typeClass}">${typeText}</td>
                        <td style="text-align: right; ${typeClass}">${idrDisplay}</td>
                        <td style="text-align: right; ${typeClass}">${usdtDisplay}</td>
                        <td style="text-align: right;">${rateDisplay}</td>
                    </tr>
                `;
            }

            toPlainObject() {
                return {
                    date: this.date.toISOString(),
                    idrAmount: this.idrAmount,
                    usdtAmount: this.usdtAmount,
                    type: this.type 
                };
            }
        }

        class CryptoTransaction {
            constructor(date, type, cryptoSymbol, cryptoAmount, usdtAmount, notes = '', usdtCostBasis = 0, profitLoss = 0) {
                this.date = date instanceof Date ? date : new Date(date);
                this.type = type; 
                this.cryptoSymbol = cryptoSymbol.toUpperCase();
                this.cryptoAmount = cryptoAmount;
                this.usdtAmount = usdtAmount;
                this.notes = notes;
                this.usdtCostBasis = usdtCostBasis;
                this.profitLoss = profitLoss;
            }

            displayTableRowHtml() {
                const formattedDate = this.date.toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                let usdtDisplay = `${this.usdtAmount.toFixed(4)} USDT`;
                let usdtClass = "";
                if (this.type === 'buy') {
                    usdtDisplay = `-${usdtDisplay}`;
                    usdtClass = "color: red;";
                } else if (this.type === 'sell' || this.type === 'convert') {
                    usdtDisplay = `+${usdtDisplay}`;
                    usdtClass = "color: green;";
                }
                
                const rate = this.cryptoAmount > 0 ? (this.usdtAmount / this.cryptoAmount).toFixed(4) : 'N/A';
                
                let profitLossHtml = '';
                if (this.type === 'sell' || this.type === 'convert') {
                    const profitLossClass = this.profitLoss > 0 ? 'profit' : (this.profitLoss < 0 ? 'loss' : 'even');
                    profitLossHtml = `
                        <span class="profit-loss ${profitLossClass}">
                            ${this.profitLoss.toFixed(4)} USDT
                        </span>
                    `;
                }

                return `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${this.type.charAt(0).toUpperCase() + this.type.slice(1)}</td>
                        <td>${this.cryptoAmount.toFixed(4)} ${this.cryptoSymbol}</td>
                        <td style="text-align: right; ${usdtClass}">${usdtDisplay}</td>
                        <td style="text-align: right;">${rate} USDT/${this.cryptoSymbol}</td>
                        <td>${this.notes}</td>
                        <td style="text-align: right;">${profitLossHtml}</td>
                    </tr>
                `;
            }

            toPlainObject() {
                return {
                    date: this.date.toISOString(),
                    type: this.type,
                    cryptoSymbol: this.cryptoSymbol,
                    cryptoAmount: this.cryptoAmount,
                    usdtAmount: this.usdtAmount,
                    notes: this.notes,
                    usdtCostBasis: this.usdtCostBasis,
                    profitLoss: this.profitLoss
                };
            }
        }

        class DepositLedger {
            constructor() {
                this.depositRecords = [];
                this.transactionRecords = [];
                this.cryptoBalances = {};
                this.loadFromLocalStorage();
            }

            addDeposit(idrAmount, usdtAmount, date, type = 'deposit') { 
                if (typeof idrAmount !== 'number' || idrAmount <= 0) {
                    return "Error: Jumlah IDR harus angka positif.";
                }
                if (typeof usdtAmount !== 'number' || usdtAmount <= 0) {
                    return "Error: Jumlah USDT harus angka positif.";
                }
                if (!date || isNaN(new Date(date).getTime())) {
                    return "Error: Tanggal transaksi tidak valid.";
                }

                if (type === 'withdraw') {
                    const currentTotalUSDT = this.getTotalUSDT(); 
                    if (usdtAmount > currentTotalUSDT) {
                        return `Error: Saldo USDT tidak cukup untuk withdraw. Tersedia: ${currentTotalUSDT.toFixed(4)} USDT.`;
                    }
                }

                const newRecord = new DepositRecord(idrAmount, usdtAmount, date, type);
                this.depositRecords.push(newRecord);
                this.saveToLocalStorage();
                return `${newRecord.type.charAt(0).toUpperCase() + newRecord.type.slice(1)} berhasil dicatat.`;
            }

            addTransaction(date, type, cryptoSymbol, cryptoAmount, usdtAmount, notes) {
                if (!date || isNaN(new Date(date).getTime())) {
                    return "Error: Tanggal transaksi tidak valid.";
                }
                if (!['buy', 'sell', 'convert'].includes(type)) {
                    return "Error: Tipe transaksi tidak valid (buy, sell, atau convert).";
                }
                if (typeof cryptoSymbol !== 'string' || cryptoSymbol.trim() === '') {
                    return "Error: Simbol crypto tidak boleh kosong.";
                }
                if (typeof cryptoAmount !== 'number' || cryptoAmount <= 0) {
                    return "Error: Jumlah crypto harus angka positif.";
                }
                if (typeof usdtAmount !== 'number' || usdtAmount <= 0) {
                    return "Error: Jumlah USDT harus angka positif.";
                }

                cryptoSymbol = cryptoSymbol.toUpperCase();

                let usdtCostBasisForTx = 0;
                let profitLossCalculated = 0;

                const currentBalance = this.cryptoBalances[cryptoSymbol] || { amount: 0, usdtCost: 0 };

                if (type === 'buy') {
                    if (currentBalance.amount === 0) { 
                        currentBalance.usdtCost = usdtAmount / cryptoAmount;
                    } else {
                        currentBalance.usdtCost = ((currentBalance.usdtCost * currentBalance.amount) + usdtAmount) / (currentBalance.amount + cryptoAmount);
                    }
                    currentBalance.amount += cryptoAmount;
                    this.cryptoBalances[cryptoSymbol] = currentBalance;
                    
                } else if (type === 'sell' || type === 'convert') {
                    if (currentBalance.amount < cryptoAmount && currentBalance.amount > 0) {
                        return `Error: Saldo ${cryptoSymbol} tidak cukup untuk transaksi ini. Tersedia: ${currentBalance.amount.toFixed(4)} ${cryptoSymbol}`;
                    }
                    
                    if (currentBalance.amount === 0) {
                        usdtCostBasisForTx = 0;
                        profitLossCalculated = usdtAmount; 
                    } else {
                        usdtCostBasisForTx = currentBalance.usdtCost * cryptoAmount; 
                        profitLossCalculated = usdtAmount - usdtCostBasisForTx;
                        currentBalance.amount -= cryptoAmount;
                        if (currentBalance.amount < 1e-9) { 
                            currentBalance.amount = 0;
                            currentBalance.usdtCost = 0; 
                        }
                    }
                    this.cryptoBalances[cryptoSymbol] = currentBalance;
                }

                const newTransaction = new CryptoTransaction(date, type, cryptoSymbol, cryptoAmount, usdtAmount, notes, usdtCostBasisForTx, profitLossCalculated);
                this.transactionRecords.push(newTransaction);
                this.saveToLocalStorage();
                return "Transaksi berhasil dicatat.";
            }

            getTotalUSDT() {
                let totalDepositedUSDT = this.depositRecords
                    .filter(record => record.type === 'deposit')
                    .reduce((total, record) => total + record.usdtAmount, 0);
                
                let totalWithdrawnUSDT = this.depositRecords
                    .filter(record => record.type === 'withdraw')
                    .reduce((total, record) => total + record.usdtAmount, 0);

                let totalUSDTFromSellConvert = this.transactionRecords
                    .filter(tx => tx.type === 'sell' || tx.type === 'convert')
                    .reduce((total, tx) => total + tx.usdtAmount, 0);

                let totalUSDTUsedForBuy = this.transactionRecords
                    .filter(tx => tx.type === 'buy')
                    .reduce((total, tx) => total + tx.usdtAmount, 0);

                return totalDepositedUSDT - totalWithdrawnUSDT + totalUSDTFromSellConvert - totalUSDTUsedForBuy;
            }

            getTotalIDRInvested() {
                let totalDepositedIDR = this.depositRecords
                    .filter(record => record.type === 'deposit')
                    .reduce((total, record) => total + record.idrAmount, 0);

                let totalWithdrawnIDR = this.depositRecords
                    .filter(record => record.type === 'withdraw')
                    .reduce((total, record) => total + record.idrAmount, 0);
                
                return totalDepositedIDR - totalWithdrawnIDR;
            }

            // Menghitung rata-rata kurs hanya dari deposit dan withdraw
            getAverageExchangeRateFromDepositWithdraw() {
                let totalIDRForRate = 0;
                let totalUSDTForRate = 0;

                this.depositRecords.forEach(record => {
                    if (record.type === 'deposit') {
                        totalIDRForRate += record.idrAmount;
                        totalUSDTForRate += record.usdtAmount;
                    } else if (record.type === 'withdraw') {
                        totalIDRForRate -= record.idrAmount; 
                        totalUSDTForRate -= record.usdtAmount; 
                    }
                });
                
                if (totalUSDTForRate > 0) {
                    return totalIDRForRate / totalUSDTForRate;
                }
                return 0;
            }

            // NEW: Menghitung total deposit USDT
            getTotalDepositUSDT() {
                return this.depositRecords
                    .filter(record => record.type === 'deposit')
                    .reduce((total, record) => total + record.usdtAmount, 0);
            }

            // NEW: Menghitung total withdraw USDT
            getTotalWithdrawUSDT() {
                return this.depositRecords
                    .filter(record => record.type === 'withdraw')
                    .reduce((total, record) => total + record.usdtAmount, 0);
            }

            // NEW: Menghitung rata-rata kurs dari deposit dan profit
            getAverageExchangeRateDepositAndProfit() {
                const totalIDRInvested = this.getTotalIDRInvested(); // Net IDR (Deposit - Withdraw)
                const totalUSDTFromDeposit = this.getTotalDepositUSDT(); // Total USDT yang masuk dari deposit
                const totalUSDTProfit = this.getTotalProfitLoss(); // Total profit/loss dari transaksi

                // Jumlahkan total USDT dari deposit dan profit
                const effectiveUSDT = totalUSDTFromDeposit + totalUSDTProfit;

                if (effectiveUSDT > 0) {
                    return totalIDRInvested / effectiveUSDT;
                }
                return 0;
            }

            getTotalProfitLoss() {
                return this.transactionRecords
                    .filter(tx => tx.type === 'sell' || tx.type === 'convert')
                    .reduce((total, tx) => total + tx.profitLoss, 0);
            }

            // New method to get aggregated data by year
            getYearlySummary() {
                const yearlyData = {};

                // Process Deposits/Withdraws
                this.depositRecords.forEach(record => {
                    const year = record.date.getFullYear();
                    if (!yearlyData[year]) {
                        yearlyData[year] = { totalIDRDeposit: 0, totalUSDTDeposit: 0, totalIDRWithdraw: 0, totalUSDTWithdraw: 0, profitLoss: 0 };
                    }
                    if (record.type === 'deposit') {
                        yearlyData[year].totalIDRDeposit += record.idrAmount;
                        yearlyData[year].totalUSDTDeposit += record.usdtAmount;
                    } else if (record.type === 'withdraw') {
                        yearlyData[year].totalIDRWithdraw += record.idrAmount;
                        yearlyData[year].totalUSDTWithdraw += record.usdtAmount;
                    }
                });

                // Process Crypto Transactions Profit/Loss
                this.transactionRecords.forEach(tx => {
                    const year = tx.date.getFullYear();
                    if (!yearlyData[year]) {
                        yearlyData[year] = { totalIDRDeposit: 0, totalUSDTDeposit: 0, totalIDRWithdraw: 0, totalUSDTWithdraw: 0, profitLoss: 0 };
                    }
                    if (tx.type === 'sell' || tx.type === 'convert') {
                        yearlyData[year].profitLoss += tx.profitLoss;
                    }
                });

                return yearlyData;
            }


            displayAllRecordsHtml() {
                const depositRecordsDiv = document.getElementById('depositRecords');
                const totalIDR = document.getElementById('totalIDR_deposit');
                const totalUSDT = document.getElementById('totalUSDT_deposit');
                const averageRate = document.getElementById('averageRate_deposit');

                if (this.depositRecords.length === 0) {
                    depositRecordsDiv.innerHTML = "<p>Belum ada catatan deposit/withdraw.</p>";
                } else {
                    const sortedRecords = [...this.depositRecords].sort((a, b) => b.date.getTime() - a.date.getTime());
                    const tableRowsHtml = sortedRecords.map(record => record.displayTableRowHtml()).join('');

                    depositRecordsDiv.innerHTML = `
                        <table>
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Tipe</th>
                                    <th>Jumlah IDR</th>
                                    <th>Jumlah USDT</th>
                                    <th>Kurs (IDR/USDT)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHtml}
                            </tbody>
                        </table>
                    `;
                }

                totalIDR.textContent = `${this.getTotalIDRInvested().toLocaleString('id-ID')} IDR`;
                totalUSDT.textContent = `${this.getTotalUSDT().toFixed(4)} USDT`;
                averageRate.textContent = `${this.getAverageExchangeRateFromDepositWithdraw().toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} IDR/USDT`;
            }

            displayAllTransactionsHtml() {
                const transactionRecordsDiv = document.getElementById('transactionRecords');
                const totalUsdtUsedForBuy = document.getElementById('totalUsdtUsedForBuy');
                const totalUsdtReceivedFromSellConvert = document.getElementById('totalUsdtReceivedFromSellConvert');
                const totalProfitLoss = document.getElementById('totalProfitLoss_transaction');

                if (this.transactionRecords.length === 0) {
                    transactionRecordsDiv.innerHTML = "<p>Belum ada riwayat transaksi.</p>";
                } else {
                    const sortedTransactions = [...this.transactionRecords].sort((a, b) => b.date.getTime() - a.date.getTime());
                    const tableRowsHtml = sortedTransactions.map(tx => tx.displayTableRowHtml()).join('');

                    transactionRecordsDiv.innerHTML = `
                        <table>
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Tipe</th>
                                    <th>Jumlah Crypto</th>
                                    <th>Jumlah USDT</th>
                                    <th>Kurs</th>
                                    <th>Catatan</th>
                                    <th>Profit/Loss</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHtml}
                            </tbody>
                        </table>
                    `;
                }

                totalUsdtUsedForBuy.textContent = `${this.transactionRecords.filter(tx => tx.type === 'buy').reduce((sum, tx) => sum + tx.usdtAmount, 0).toFixed(4)} USDT`;
                totalUsdtReceivedFromSellConvert.textContent = `${this.transactionRecords.filter(tx => tx.type === 'sell' || tx.type === 'convert').reduce((sum, tx) => sum + tx.usdtAmount, 0).toFixed(4)} USDT`;
                
                const totalPL = this.getTotalProfitLoss();
                const plClass = totalPL > 0 ? 'profit' : (totalPL < 0 ? 'loss' : 'even');
                totalProfitLoss.innerHTML = `<span class="${plClass}">${totalPL.toFixed(4)} USDT</span>`;
            }

            // New method to display home summary and balances
            displayHomeSummary() {
                document.getElementById('homeTotalUSDT').textContent = `${this.getTotalUSDT().toFixed(4)} USDT`;
                document.getElementById('homeTotalIDR').textContent = `${this.getTotalIDRInvested().toLocaleString('id-ID')} IDR`;
                
                const totalPL = this.getTotalProfitLoss();
                const plClass = totalPL > 0 ? 'profit' : (totalPL < 0 ? 'loss' : 'even');
                document.getElementById('homeTotalProfitLoss').className = plClass; // Update class
                document.getElementById('homeTotalProfitLoss').textContent = `${totalPL.toFixed(4)} USDT`;
                
                // Update average rate from deposit/withdraw
                document.getElementById('homeAverageRateDepositWithdraw').textContent = `${this.getAverageExchangeRateFromDepositWithdraw().toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} IDR/USDT`;

                // NEW: Update Total Deposit USDT
                document.getElementById('homeTotalDepositUSDT').textContent = `${this.getTotalDepositUSDT().toFixed(4)} USDT`;

                // NEW: Update Total Withdraw USDT
                document.getElementById('homeTotalWithdrawUSDT').textContent = `${this.getTotalWithdrawUSDT().toFixed(4)} USDT`;

                // NEW: Update Average Rate (Deposit + Profit)
                document.getElementById('homeAverageRateOverall').textContent = `${this.getAverageExchangeRateDepositAndProfit().toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} IDR/USDT`;


                // Display individual crypto balances
                const cryptoBalancesContainer = document.getElementById('cryptoBalancesContainer');
                let balancesHtml = '';
                const sortedCryptoSymbols = Object.keys(this.cryptoBalances).sort();

                if (sortedCryptoSymbols.length === 0) {
                    cryptoBalancesContainer.innerHTML = "<p>Belum ada saldo crypto yang dicatat.</p>";
                } else {
                    sortedCryptoSymbols.forEach(symbol => {
                        const balance = this.cryptoBalances[symbol];
                        if (balance.amount > 1e-9) { // Only show if amount is significant
                            balancesHtml += `
                                <div class="card crypto-balance-card">
                                    <h3>${symbol} Balance</h3>
                                    <p>${balance.amount.toFixed(4)} ${symbol}</p>
                                    <p style="font-size: 0.9em; color: #555;">Avg. Cost: ${balance.usdtCost.toFixed(4)} USDT/${symbol}</p>
                                </div>
                            `;
                        }
                    });
                    if (balancesHtml === '') {
                        cryptoBalancesContainer.innerHTML = "<p>Belum ada saldo crypto yang dicatat.</p>";
                    } else {
                        cryptoBalancesContainer.innerHTML = balancesHtml;
                    }
                }
            }

            // New method to display yearly summary table
            displayYearlySummary() {
                const yearlySummaryDiv = document.getElementById('yearlySummaryTable');
                const yearlyData = this.getYearlySummary();
                const years = Object.keys(yearlyData).sort();

                if (years.length === 0) {
                    yearlySummaryDiv.innerHTML = "<p>Belum ada data transaksi untuk direkap.</p>";
                    return;
                }

                let tableHtml = `
                    <table class="yearly-summary-table">
                        <thead>
                            <tr>
                                <th>Tahun</th>
                                <th>IDR Deposit</th>
                                <th>IDR Withdraw</th>
                                <th>Net IDR</th>
                                <th>USDT Deposit</th>
                                <th>USDT Withdraw</th>
                                <th>Net USDT Transaksi</th>
                                <th>Profit/Loss (USDT)</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                years.forEach(year => {
                    const data = yearlyData[year];
                    const netIDR = data.totalIDRDeposit - data.totalIDRWithdraw;
                    const netUSDT = data.totalUSDTDeposit - data.totalUSDTWithdraw; 
                    
                    const profitLossClass = data.profitLoss > 0 ? 'profit' : (data.profitLoss < 0 ? 'loss' : 'even');

                    tableHtml += `
                        <tr>
                            <td>${year}</td>
                            <td style="text-align: right; color: green;">${data.totalIDRDeposit.toLocaleString('id-ID')} IDR</td>
                            <td style="text-align: right; color: red;">-${data.totalIDRWithdraw.toLocaleString('id-ID')} IDR</td>
                            <td style="text-align: right;">${netIDR.toLocaleString('id-ID')} IDR</td>
                            <td style="text-align: right; color: green;">${data.totalUSDTDeposit.toFixed(4)} USDT</td>
                            <td style="text-align: right; color: red;">-${data.totalUSDTWithdraw.toFixed(4)} USDT</td>
                            <td style="text-align: right;">${netUSDT.toFixed(4)} USDT</td>
                            <td style="text-align: right;" class="${profitLossClass}">${data.profitLoss.toFixed(4)} USDT</td>
                        </tr>
                    `;
                });

                tableHtml += `
                        </tbody>
                    </table>
                `;
                yearlySummaryDiv.innerHTML = tableHtml;
            }

            // --- Local Storage Methods ---
            saveToLocalStorage() {
                try {
                    const allData = {
                        deposits: this.depositRecords.map(record => record.toPlainObject()),
                        transactions: this.transactionRecords.map(tx => tx.toPlainObject()),
                        cryptoBalances: this.cryptoBalances 
                    };
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allData));
                    console.log("All data saved to Local Storage under one key.");
                } catch (e) {
                    console.error("Error saving to Local Storage:", e);
                }
            }

            loadFromLocalStorage() {
                try {
                    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
                    if (storedData) {
                        const parsedData = JSON.parse(storedData);

                        if (parsedData.deposits && Array.isArray(parsedData.deposits)) {
                            this.depositRecords = parsedData.deposits.map(data => 
                                new DepositRecord(data.idrAmount, data.usdtAmount, data.date, data.type || 'deposit') 
                            );
                        } else {
                            console.warn("Invalid deposit data format in Local Storage. Initializing deposits.");
                            this.depositRecords = [];
                        }

                        if (parsedData.transactions && Array.isArray(parsedData.transactions) && 
                            parsedData.transactions.every(item => 
                                typeof item.date === 'string' && 
                                typeof item.type === 'string' && 
                                typeof item.cryptoSymbol === 'string' && 
                                typeof item.cryptoAmount === 'number' && 
                                typeof item.usdtAmount === 'number' &&
                                (typeof item.notes === 'string' || item.notes === undefined) &&
                                (typeof item.usdtCostBasis === 'number' || item.usdtCostBasis === undefined) &&
                                (typeof item.profitLoss === 'number' || item.profitLoss === undefined)
                            )) {
                            this.transactionRecords = parsedData.transactions.map(data => new CryptoTransaction(
                                data.date, data.type, data.cryptoSymbol, data.cryptoAmount, data.usdtAmount, 
                                data.notes || '', data.usdtCostBasis || 0, data.profitLoss || 0
                            ));
                        } else {
                            console.warn("Invalid transaction data format in Local Storage. Initializing transactions.");
                            this.transactionRecords = [];
                        }

                        if (parsedData.cryptoBalances && typeof parsedData.cryptoBalances === 'object' && parsedData.cryptoBalances !== null && 
                            Object.values(parsedData.cryptoBalances).every(bal => typeof bal === 'object' && typeof bal.amount === 'number' && typeof bal.usdtCost === 'number')) {
                            this.cryptoBalances = parsedData.cryptoBalances;
                        } else {
                            console.warn("Invalid crypto balances format in Local Storage. Initializing balances.");
                            this.cryptoBalances = {};
                        }
                        console.log("All data loaded from Local Storage.");
                    } else {
                        console.log("No data found in Local Storage. Initializing empty ledger.");
                    }
                } catch (e) {
                    console.error("Error loading from Local Storage:", e);
                    localStorage.removeItem(LOCAL_STORAGE_KEY); 
                    this.depositRecords = [];
                    this.transactionRecords = [];
                    this.cryptoBalances = {};
                    console.log("Local Storage data cleared due to error.");
                }

                const oldDepositKey = 'crypto_book'; 
                const oldTransactionKey = 'crypto_transactions';
                const oldBalanceKey = 'crypto_balances';

                let migrated = false;

                if (!localStorage.getItem(LOCAL_STORAGE_KEY) && 
                    (localStorage.getItem(oldDepositKey) || localStorage.getItem(oldTransactionKey) || localStorage.getItem(oldBalanceKey))) {
                    
                    if (localStorage.getItem(oldDepositKey)) {
                        try {
                            const oldDeposits = JSON.parse(localStorage.getItem(oldDepositKey));
                            if (Array.isArray(oldDeposits)) {
                                this.depositRecords = oldDeposits.map(data => new DepositRecord(data.idrAmount, data.usdtAmount, data.date));
                                console.log("Migrated old deposit data.");
                                migrated = true;
                            }
                        } catch (e) { console.warn("Error migrating old deposit data:", e); }
                    }

                    if (localStorage.getItem(oldTransactionKey)) {
                        try {
                            const oldTransactions = JSON.parse(localStorage.getItem(oldTransactionKey));
                            if (Array.isArray(oldTransactions)) {
                                this.transactionRecords = oldTransactions.map(data => new CryptoTransaction(
                                    data.date, data.type, data.cryptoSymbol, data.cryptoAmount, data.usdtAmount, 
                                    data.notes || '', data.usdtCostBasis || 0, data.profitLoss || 0
                                ));
                                console.log("Migrated old transaction data.");
                                migrated = true;
                            }
                        } catch (e) { console.warn("Error migrating old transaction data:", e); }
                    }

                    if (localStorage.getItem(oldBalanceKey)) {
                        try {
                            const oldBalances = JSON.parse(localStorage.getItem(oldBalanceKey));
                            if (typeof oldBalances === 'object' && oldBalances !== null) {
                                this.cryptoBalances = oldBalances;
                                console.log("Migrated old crypto balance data.");
                                migrated = true;
                            }
                        } catch (e) { console.warn("Error migrating old crypto balance data:", e); }
                    }

                    if (migrated) {
                        this.saveToLocalStorage(); 
                        localStorage.removeItem(oldDepositKey);
                        localStorage.removeItem(oldTransactionKey);
                        localStorage.removeItem(oldBalanceKey);
                        console.log("Old Local Storage keys cleared after migration.");
                    }
                }
            }

            exportData() {
                try {
                    const allData = {
                        deposits: this.depositRecords.map(record => record.toPlainObject()),
                        transactions: this.transactionRecords.map(tx => tx.toPlainObject()),
                        cryptoBalances: this.cryptoBalances 
                    };
                    const jsonString = JSON.stringify(allData, null, 2);

                    const blob = new Blob([jsonString], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'crypto_book.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    return { success: true, message: "Data berhasil diekspor." };
                } catch (e) {
                    console.error("Error exporting data:", e);
                    return { success: false, message: "Error: Gagal mengekspor data." };
                }
            }

            importData(jsonString) {
                try {
                    const parsedData = JSON.parse(jsonString);

                    if (!parsedData || typeof parsedData !== 'object' || 
                        !Array.isArray(parsedData.deposits) || 
                        !Array.isArray(parsedData.transactions) ||
                        typeof parsedData.cryptoBalances !== 'object' 
                    ) {
                        return { success: false, message: "Error: Format file JSON tidak valid. Pastikan berisi 'deposits', 'transactions', dan 'cryptoBalances'." };
                    }

                    const validDeposits = parsedData.deposits.every(item => typeof item.idrAmount === 'number' && typeof item.usdtAmount === 'number' && typeof item.date === 'string' && (item.type === 'deposit' || item.type === 'withdraw' || item.type === undefined));
                    const validTransactions = parsedData.transactions.every(item => 
                        typeof item.date === 'string' && 
                        typeof item.type === 'string' && 
                        typeof item.cryptoSymbol === 'string' && 
                        typeof item.cryptoAmount === 'number' && 
                        typeof item.usdtAmount === 'number' &&
                        (typeof item.notes === 'string' || item.notes === undefined) &&
                        (typeof item.usdtCostBasis === 'number' || item.usdtCostBasis === undefined) &&
                        (typeof item.profitLoss === 'number' || item.profitLoss === undefined)
                    );
                    const validCryptoBalances = Object.values(parsedData.cryptoBalances).every(bal => typeof bal === 'object' && typeof bal.amount === 'number' && typeof bal.usdtCost === 'number');


                    if (!validDeposits || !validTransactions || !validCryptoBalances) {
                        return { success: false, message: "Error: Data di dalam file JSON tidak valid." };
                    }

                    this.depositRecords = parsedData.deposits.map(data => new DepositRecord(data.idrAmount, data.usdtAmount, data.date, data.type || 'deposit'));
                    this.transactionRecords = parsedData.transactions.map(data => new CryptoTransaction(
                        data.date, data.type, data.cryptoSymbol, data.cryptoAmount, data.usdtAmount, 
                        data.notes || '', data.usdtCostBasis || 0, data.profitLoss || 0
                    ));
                    this.cryptoBalances = parsedData.cryptoBalances;
                    
                    this.saveToLocalStorage();
                    return { success: true, message: "Data berhasil diimpor dan disimpan." };
                } catch (e) {
                    console.error("Error importing data:", e);
                    return { success: false, message: "Error: Gagal mengimpor data. Pastikan file adalah JSON yang valid." };
                }
            }
        }

        const myLedger = new DepositLedger();

        function openDepositModal() {
            const modal = document.getElementById('depositModal');
            modal.style.display = 'block';
            setTodayDate('depositWithdrawDate'); 
            document.getElementById('idrAmount').value = '';
            document.getElementById('usdtAmount').value = ''; 
            document.getElementById('typeDeposit').checked = true; 
            updateDepositWithdrawFields(); 
            document.getElementById('modalErrorMessage').textContent = ''; 
        }

        function closeDepositModal() {
            const modal = document.getElementById('depositModal');
            modal.style.display = 'none';
        }

        function updateDepositWithdrawFields() {
            const typeDeposit = document.getElementById('typeDeposit').checked;
            const idrLabel = document.querySelector('label[for="idrAmount"]');
            const usdtLabel = document.querySelector('label[for="usdtAmount"]');
            
            if (typeDeposit) {
                idrLabel.textContent = "Jumlah IDR yang Disetorkan:";
                usdtLabel.textContent = "Jumlah USDT yang Diterima:";
            } else { 
                idrLabel.textContent = "Jumlah IDR yang Diterima:";
                usdtLabel.textContent = "Jumlah USDT yang Ditarik:";
            }
        }

        function openTransactionModal() {
            const modal = document.getElementById('transactionModal');
            modal.style.display = 'block';
            setTodayDate('transactionDate');
            document.getElementById('transactionType').value = '';
            document.getElementById('cryptoSymbol').value = '';
            document.getElementById('cryptoAmount').value = '';
            document.getElementById('usdtAmountTx').value = '';
            document.getElementById('transactionNotes').value = '';
            document.getElementById('transactionModalErrorMessage').textContent = ''; 
            document.getElementById('transactionDirectionInfo').textContent = '';
            updateTransactionFields();
        }

        function closeTransactionModal() {
            const modal = document.getElementById('transactionModal');
            modal.style.display = 'none';
        }

        window.onclick = function(event) {
            const depositModal = document.getElementById('depositModal');
            const transactionModal = document.getElementById('transactionModal');
            if (event.target == depositModal) {
                depositModal.style.display = 'none';
            }
            if (event.target == transactionModal) {
                transactionModal.style.display = 'none';
            }
        }

        async function addDepositWithdrawFromForm() { 
            const dateInput = document.getElementById('depositWithdrawDate');
            const idrAmountInput = document.getElementById('idrAmount');
            const usdtAmountInput = document.getElementById('usdtAmount'); 
            const selectedType = document.querySelector('input[name="depositType"]:checked').value;

            const date = dateInput.value;
            const idrAmount = parseFloat(idrAmountInput.value);
            const usdtAmount = parseFloat(usdtAmountInput.value); 

            const result = myLedger.addDeposit(idrAmount, usdtAmount, date, selectedType);

            if (result.startsWith("Error")) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Gagal Menambah Transaksi',
                    text: result,
                    confirmButtonText: 'Oke'
                });
            } else {
                await Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: result,
                    showConfirmButton: false,
                    timer: 1500
                });
                closeDepositModal(); 
                myLedger.displayAllRecordsHtml();
                myLedger.displayAllTransactionsHtml();
                myLedger.displayHomeSummary(); // Update home summary after changes
                myLedger.displayYearlySummary(); // Update yearly summary
            }
        }

        async function addTransactionFromForm() {
            const transactionDateInput = document.getElementById('transactionDate');
            const transactionTypeInput = document.getElementById('transactionType');
            const cryptoSymbolInput = document.getElementById('cryptoSymbol');
            const cryptoAmountInput = document.getElementById('cryptoAmount');
            const usdtAmountTxInput = document.getElementById('usdtAmountTx');
            const transactionNotesInput = document.getElementById('transactionNotes');

            const transactionDate = transactionDateDateInput.value;
            const transactionType = transactionTypeInput.value;
            const cryptoSymbol = cryptoSymbolInput.value;
            const cryptoAmount = parseFloat(cryptoAmountInput.value);
            const usdtAmount = parseFloat(usdtAmountTxInput.value);
            const notes = transactionNotesInput.value.trim();

            const result = myLedger.addTransaction(transactionDate, transactionType, cryptoSymbol, cryptoAmount, usdtAmount, notes);

            if (result.startsWith("Error")) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Gagal Menambah Transaksi',
                    text: result,
                    confirmButtonText: 'Oke'
                });
            } else {
                await Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: result,
                    showConfirmButton: false,
                    timer: 1500
                });
                closeTransactionModal(); 
                myLedger.displayAllTransactionsHtml();
                myLedger.displayAllRecordsHtml();
                myLedger.displayHomeSummary(); // Update home summary after changes
                myLedger.displayYearlySummary(); // Update yearly summary
            }
        }

        function setTodayDate(elementId) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            document.getElementById(elementId).value = `${year}-${month}-${day}`;
        }

        function updateTransactionFields() {
            const transactionType = document.getElementById('transactionType').value;
            const infoDiv = document.getElementById('transactionDirectionInfo');
            if (transactionType === 'buy') {
                infoDiv.textContent = "Anda menggunakan USDT untuk membeli crypto. USDT akan dikurangi dari total dan menjadi modal untuk crypto ini.";
                infoDiv.style.color = 'red';
            } else if (transactionType === 'sell' || transactionType === 'convert') {
                infoDiv.textContent = "Anda menerima USDT dari penjualan/konversi crypto. Profit/Loss akan dihitung berdasarkan modal USDT.";
                infoDiv.style.color = 'green';
            } else {
                infoDiv.textContent = "";
            }
        }

        async function exportDataToJson() {
            const importExportMessageDiv = document.getElementById('importExportMessage');
            const result = myLedger.exportData(); 
            
            if (result.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Ekspor Berhasil!',
                    text: result.message,
                    showConfirmButton: false,
                    timer: 2000
                });
                importExportMessageDiv.style.color = 'green';
                importExportMessageDiv.textContent = result.message;
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Ekspor Gagal!',
                    text: result.message,
                    confirmButtonText: 'Oke'
                });
                importExportMessageDiv.style.color = 'red';
                importExportMessageDiv.textContent = result.message;
            }
        }

        async function importDataFromJson() {
            const fileInput = document.getElementById('jsonFileInput');
            const importExportMessageDiv = document.getElementById('importExportMessage');
            const file = fileInput.files[0];

            if (!file) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Peringatan',
                    text: "Pilih file JSON terlebih dahulu.",
                    confirmButtonText: 'Oke'
                });
                importExportMessageDiv.style.color = 'red';
                importExportMessageDiv.textContent = "Error: Pilih file JSON terlebih dahulu.";
                return;
            }

            const reader = new FileReader();
            reader.onload = async function(e) { 
                const jsonString = e.target.result;
                const result = myLedger.importData(jsonString); 
                
                if (result.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Impor Berhasil!',
                        text: result.message,
                        showConfirmButton: false,
                        timer: 2000
                    });
                    importExportMessageDiv.style.color = 'green';
                    importExportMessageDiv.textContent = result.message;
                    myLedger.displayAllRecordsHtml();
                    myLedger.displayAllTransactionsHtml();
                    myLedger.displayHomeSummary(); // Update home summary after import
                    myLedger.displayYearlySummary(); // Update yearly summary after import
                    fileInput.value = ''; 
                } else {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Impor Gagal!',
                        text: result.message,
                        confirmButtonText: 'Oke'
                    });
                    importExportMessageDiv.style.color = 'red';
                    importExportMessageDiv.textContent = "Error: Gagal mengimpor data. Pastikan file adalah JSON yang valid.";
                }
            };
            reader.onerror = async function() { 
                await Swal.fire({
                    icon: 'error',
                    title: 'Gagal Membaca File',
                    text: "Error: Gagal membaca file.",
                    confirmButtonText: 'Oke'
                });
                importExportMessageDiv.style.color = 'red';
                importExportMessageDiv.textContent = "Error: Gagal membaca file.";
            };
            reader.readAsText(file);
        }

        // Fungsi untuk mengelola kelas 'active' pada navbar
        function showSection(sectionId, clickedElement) {
            // Sembunyikan semua section
            document.getElementById('home-section').classList.add('hidden');
            document.getElementById('deposit-withdraw-section').classList.add('hidden');
            document.getElementById('transactions-section').classList.add('hidden');
            document.getElementById('import-export').classList.add('hidden');

            // Tampilkan section yang dipilih
            document.getElementById(sectionId).classList.remove('hidden');

            // Hapus kelas 'active' dari semua link navbar
            const navLinks = document.querySelectorAll('.navbar a');
            navLinks.forEach(link => link.classList.remove('active'));

            // Tambahkan kelas 'active' ke link yang diklik
            if (clickedElement) {
                clickedElement.classList.add('active');
            } else {
                // Ini untuk inisialisasi awal, misalnya saat halaman dimuat
                const defaultActiveLink = document.querySelector(`.navbar a[data-section="${sectionId}"]`);
                if (defaultActiveLink) {
                    defaultActiveLink.classList.add('active');
                }
            }


            // Bersihkan pesan error/info di modal
            document.getElementById('modalErrorMessage').textContent = '';
            document.getElementById('transactionModalErrorMessage').textContent = '';
            document.getElementById('importExportMessage').textContent = '';

            // Perbarui tampilan untuk bagian yang aktif
            if (sectionId === 'home-section') {
                myLedger.displayHomeSummary();
                myLedger.displayYearlySummary();
            } else if (sectionId === 'deposit-withdraw-section') {
                myLedger.displayAllRecordsHtml();
            } else if (sectionId === 'transactions-section') {
                myLedger.displayAllTransactionsHtml();
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            myLedger.displayAllRecordsHtml();
            myLedger.displayAllTransactionsHtml();
            // Panggil showSection dengan 'home-section' sebagai default saat DOM dimuat
            showSection('home-section'); 
        });
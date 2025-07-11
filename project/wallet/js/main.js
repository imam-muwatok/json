const errorMessageDiv = document.getElementById('error-message');
        const transactionsTableBody = document.querySelector('#transactions-table tbody');
        const debtsListDiv = document.getElementById('debts-list');
        const paidDebtsListDiv = document.getElementById('paid-debts-list');
        const noTransactionsMessage = document.getElementById('no-transactions');
        const noDebtsMessage = document.getElementById('no-debts');
        const noPaidDebtsMessage = document.getElementById('no-paid-debts');
        const totalPemasukanSpan = document.getElementById('total-pemasukan');
        const totalPengeluaranSpan = document.getElementById('total-pengeluaran');
        const saldoSpan = document.getElementById('saldo');
        const saldoSetelahHutangSpan = document.getElementById('saldo-setelah-hutang');
        const importFile = document.getElementById('importFile');
        const monthFilter = document.getElementById('month-filter');
        const nameFilter = document.getElementById('name-filter');
        const tagFilter = document.getElementById('tag-filter');
        const typeFilter = document.getElementById('type-filter');
        const monthlyRecapDiv = document.getElementById('monthly-recap');
        const yearlyRecapDiv = document.getElementById('yearly-recap');
        const menuToggle = document.getElementById('menu-toggle');
        const navLinks = document.getElementById('nav-links');

        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('nav-active');
        });

        let appData = { transactions: [], debts: [] };

        // Fungsi untuk mendapatkan data dari localStorage
        function getData() {
            try {
                const storedData = localStorage.getItem('financialAppData');
                if (storedData) {
                    appData = JSON.parse(storedData);
                }
            } catch (error) {
                console.error("Gagal membaca data dari localStorage:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Gagal memuat data aplikasi!',
                });
                appData = { transactions: [], debts: [] };
            }
            populateNameFilter();
            populateTagFilter();
            renderHomeTab();
        }

        // Fungsi untuk menyimpan data ke localStorage
        function saveData() {
            try {
                localStorage.setItem('financialAppData', JSON.stringify(appData));
                updateUI();
                return true;
            } catch (error) {
                console.error("Gagal menyimpan data ke localStorage:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Gagal menyimpan data aplikasi!',
                });
                return false;
            }
        }

        // Fungsi untuk menghitung dan memperbarui ringkasan keuangan
        function updateSummary() {
            let pemasukan = 0;
            let pengeluaran = 0;
            let totalHutang = 0;

            appData.transactions.forEach(transaction => {
                if (transaction.type === 'pemasukan') {
                    pemasukan += transaction.amount;
                } else if (transaction.type === 'pengeluaran' || transaction.type === 'angsuran_hutang') {
                    pengeluaran += transaction.amount;
                }
            });

            appData.debts.forEach(debt => {
                totalHutang += debt.remaining_amount;
            });

            totalPemasukanSpan.textContent = formatCurrency(pemasukan);
            totalPengeluaranSpan.textContent = formatCurrency(pengeluaran);
            saldoSpan.textContent = formatCurrency(pemasukan - pengeluaran);
            saldoSetelahHutangSpan.textContent = formatCurrency((pemasukan - pengeluaran) - totalHutang);
        }

        function formatCurrency(amount) {
            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
        }

        function renderTransactions(selectedMonth = '', selectedName = '', selectedTag = '', selectedType = '') {
            transactionsTableBody.innerHTML = '';
            let pemasukan = 0;
            let pengeluaran = 0;

            const filteredTransactions = appData.transactions.filter(transaction => {
                const monthMatch = !selectedMonth || transaction.date.split('-')[1] === selectedMonth;
                const nameMatch = !selectedName || transaction.name === selectedName;
                const tagMatch = !selectedTag || transaction.tag === selectedTag;
                const typeMatch = !selectedType || transaction.type === selectedType;
                return monthMatch && nameMatch && tagMatch && typeMatch;
            });

            if (filteredTransactions.length === 0) {
                noTransactionsMessage.style.display = 'block';
            } else {
                noTransactionsMessage.style.display = 'none';
                filteredTransactions.forEach(transaction => {
                    const row = transactionsTableBody.insertRow();
                    const dateCell = row.insertCell();
                    const nameCell = row.insertCell();
                    const typeCell = row.insertCell();
                    const amountCell = row.insertCell();
                    const descriptionCell = row.insertCell();
                    const tagCell = row.insertCell();

                    dateCell.textContent = transaction.date.split(' ')[0];
                    nameCell.textContent = transaction.name;
                    typeCell.textContent = transaction.type.replace('_', ' ').charAt(0).toUpperCase() + transaction.type.replace('_', ' ').slice(1);
                    amountCell.textContent = formatCurrency(transaction.amount);
                    amountCell.style.textAlign = 'right';
                    descriptionCell.textContent = transaction.description || '-';
                    tagCell.textContent = transaction.tag || '-';

                    // Hitung total berdasarkan jenis
                    if (transaction.type === 'pemasukan') {
                        pemasukan += transaction.amount;
                    } else if (transaction.type === 'pengeluaran' || transaction.type === 'angsuran_hutang') {
                        pengeluaran += transaction.amount;
                    }
                });
            }

            // Update footer
            document.getElementById('filtered-total-pemasukan').textContent = formatCurrency(pemasukan);
            document.getElementById('filtered-total-pengeluaran').textContent = formatCurrency(pengeluaran);
            document.getElementById('filtered-total-saldo').textContent = formatCurrency(pemasukan - pengeluaran);
        }

        // Fungsi untuk merender daftar hutang aktif
        function renderDebts() {
            debtsListDiv.innerHTML = '';
            const activeDebts = appData.debts.filter(debt => debt.remaining_amount > 0);
            if (activeDebts.length === 0) {
                noDebtsMessage.style.display = 'block';
            } else {
                noDebtsMessage.style.display = 'none';
                activeDebts.forEach(debt => {
                    const debtItem = document.createElement('div');
                    debtItem.classList.add('debt-item');

                    const debtDetails = document.createElement('div');
                    debtDetails.classList.add('debt-details');
                    debtDetails.innerHTML = `
                        <strong>${escapeHtml(debt.name)}</strong>
                        <p>Hutang Asli: ${formatCurrency(debt.principal_amount)}</p>
                        <p>Total Hutang (Angsuran x Tenor): ${formatCurrency(debt.calculated_total_amount)}</p>
                        <p>Sisa Hutang: ${formatCurrency(debt.remaining_amount)}</p>
                        <p>Angsuran per Bulan: ${formatCurrency(debt.installment)}</p>
                        <p>Tenor: ${debt.total_installments} bulan</p>
                        <p>Jatuh Tempo: Tanggal ${debt.installment_due_day} setiap bulan</p>
                        <p>Tanggal Mulai Hutang: ${debt.due_date || '-'}</p>
                        <p>Bunga (Per Tahun): ${debt.annual_interest_rate}%</p>
                        ${debt.description ? `<p>Keterangan: ${escapeHtml(debt.description)}</p>` : ''}
                    `;

                    const payInstallmentForm = document.createElement('form');
                    payInstallmentForm.classList.add('pay-installment-form');
                    payInstallmentForm.innerHTML += `
                        <input type="hidden" name="debt_id_pay" value="${debt.id}">
                        <label for="installment_amount_${debt.id}">Bayar Angsuran:</label>
                        <input type="number" name="installment_amount" id="installment_amount_${debt.id}" step="0.01" placeholder="Rp" required>
                        <div>
                            <strong>Sumber Pembayaran:</strong>
                            <label><input type="radio" name="payment_source_${debt.id}" value="saldo" checked> Saldo</label>
                            <label><input type="radio" name="payment_source_${debt.id}" value="dana_lain"> Dana Lain</label>
                        </div>
                        <button type="submit">Bayar</button>
                    `;

                    const formElement = payInstallmentForm.querySelector('form') || payInstallmentForm;
                    formElement.addEventListener('submit', function(event) {
                        event.preventDefault();
                        const installmentAmountInput = this.querySelector(`#installment_amount_${debt.id}`);
                        const installmentPaid = parseFloat(installmentAmountInput.value);
                        const paymentSource = this.querySelector(`input[name="payment_source_${debt.id}"]:checked`).value;

                        if (installmentPaid > 0) {
                            const debtIdToPay = this.querySelector('input[name="debt_id_pay"]').value;
                            const debtToUpdate = appData.debts.find(debt => debt.id === debtIdToPay);
                            if (debtToUpdate) {
                                if (debtToUpdate.remaining_amount >= installmentPaid) {
                                    debtToUpdate.remaining_amount -= installmentPaid;
                                    debtToUpdate.installments_paid = (debtToUpdate.installments_paid || 0) + 1; // Increment paid installments

                                    const transactionType = (paymentSource === 'saldo') ? 'angsuran_hutang' : 'pembayaran_hutang_dana_lain';
                                    const transactionDescription = (paymentSource === 'saldo') ?
                                        `Angsuran ke-${debtToUpdate.installments_paid} dari ${debtToUpdate.total_installments} untuk hutang: ${debtToUpdate.name}` :
                                        `Pembayaran angsuran ke-${debtToUpdate.installments_paid} dari ${debtToUpdate.total_installments} untuk hutang: ${debtToUpdate.name} (Dana Lain)`;

                                    appData.transactions.push({
                                        name: `${debtToUpdate.name} - Angsuran ${debtToUpdate.installments_paid}/${debtToUpdate.total_installments}`,
                                        type: transactionType,
                                        amount: installmentPaid,
                                        description: transactionDescription,
                                        tag: 'hutang',
                                        date: new Date().toISOString().slice(0, 19).replace('T', ' ')
                                    });
                                    if (debtToUpdate.remaining_amount <= 0) {
                                        debtToUpdate.paid_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
                                    }
                                    saveData();
                                    Swal.fire({
                                        icon: 'success',
                                        title: 'Berhasil!',
                                        text: `Angsuran sebesar ${formatCurrency(installmentPaid)} untuk hutang ${debtToUpdate.name} telah dibayarkan.`,
                                    });
                                } else {
                                    Swal.fire({
                                        icon: 'error',
                                        title: 'Oops...',
                                        text: 'Jumlah angsuran yang dibayarkan melebihi sisa hutang!',
                                    });
                                }
                                installmentAmountInput.value = ''; // Reset input after payment
                            }
                        } else {
                            Swal.fire({
                                icon: 'warning',
                                title: 'Perhatian!',
                                text: 'Jumlah angsuran yang dibayarkan harus lebih besar dari 0!',
                            });
                        }
                    });

                    debtItem.appendChild(debtDetails);
                    debtItem.appendChild(formElement);
                    debtsListDiv.appendChild(debtItem);
                });
            }
        }

        // Fungsi untuk merender daftar hutang lunas
        function renderPaidDebts() {
            paidDebtsListDiv.innerHTML = '';
            const paidDebts = appData.debts.filter(debt => debt.remaining_amount <= 0);
            if (paidDebts.length === 0) {
                noPaidDebtsMessage.style.display = 'block';
            } else {
                noPaidDebtsMessage.style.display = 'none';
                paidDebts.forEach(debt => {
                    const debtItem = document.createElement('div');
                    debtItem.classList.add('debt-item');

                    const debtDetails = document.createElement('div');
                    debtDetails.classList.add('debt-details');
                    debtDetails.innerHTML = `
                        <strong>${escapeHtml(debt.name)}</strong>
                        <p>Hutang Asli: ${formatCurrency(debt.principal_amount)}</p>
                        <p>Total Hutang (Angsuran x Tenor): ${formatCurrency(debt.calculated_total_amount)}</p>
                        <p>Tanggal Lunas: ${debt.paid_date || 'Tidak Tercatat'}</p>
                        ${debt.description ? `<p>Keterangan: ${escapeHtml(debt.description)}</p>` : ''}
                    `;
                    debtItem.appendChild(debtDetails);
                    paidDebtsListDiv.appendChild(debtItem);
                });
            }
        }

        function renderHomeTab() {
            const currentYear = new Date().getFullYear();
            const monthlyData = {};
            const yearlyData = {};

            for (let i = 1; i <= 12; i++) {
                const month = String(i).padStart(2, '0');
                monthlyData[month] = { pemasukan: 0, pengeluaran: 0 };
            }

            appData.transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');

                if (year === currentYear) {
                    if (transaction.type === 'pemasukan') {
                        monthlyData[month].pemasukan += transaction.amount;
                    } else if (transaction.type === 'pengeluaran' || transaction.type === 'angsuran_hutang') {
                        monthlyData[month].pengeluaran += transaction.amount;
                    }
                }

                if (!yearlyData[year]) {
                    yearlyData[year] = { pemasukan: 0, pengeluaran: 0 };
                }
                if (transaction.type === 'pemasukan') {
                    yearlyData[year].pemasukan += transaction.amount;
                } else if (transaction.type === 'pengeluaran' || transaction.type === 'angsuran_hutang') {
                    yearlyData[year].pengeluaran += transaction.amount;
                }
            });

            let monthlyRecapHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Bulan</th>
                            <th>Pemasukan</th>
                            <th>Pengeluaran</th>
                            <th>Sisa</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
            ];
            for (const month in monthlyData) {
                const sisa = monthlyData[month].pemasukan - monthlyData[month].pengeluaran;
                const sisaClass = sisa > 0 ? 'saldo-positif' : sisa < 0 ? 'saldo-negatif' : 'saldo-nol';
                monthlyRecapHTML += `
                    <tr>
                        <td>${monthNames[parseInt(month) - 1]}</td>
                        <td>${formatCurrency(monthlyData[month].pemasukan)}</td>
                        <td>${formatCurrency(monthlyData[month].pengeluaran)}</td>
                        <td class="${sisaClass}">${formatCurrency(sisa)}</td>
                    </tr>
                `;
            }
            monthlyRecapHTML += `
                    </tbody>
                </table>
            `;
            monthlyRecapDiv.innerHTML = monthlyRecapHTML || '<p>Belum ada data untuk tahun ini.</p>';

            let yearlyRecapHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Tahun</th>
                            <th>Pemasukan</th>
                            <th>Pengeluaran</th>
                            <th>Sisa</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            const sortedYears = Object.keys(yearlyData).sort();
            sortedYears.forEach(year => {
                const sisa = yearlyData[year].pemasukan - yearlyData[year].pengeluaran;
                const sisaClass = sisa > 0 ? 'saldo-positif' : sisa < 0 ? 'saldo-negatif' : 'saldo-nol';
                yearlyRecapHTML += `
                    <tr>
                        <td>${year}</td>
                        <td>${formatCurrency(yearlyData[year].pemasukan)}</td>
                        <td>${formatCurrency(yearlyData[year].pengeluaran)}</td>
                        <td class="${sisaClass}">${formatCurrency(sisa)}</td>
                    </tr>
                `;
            });
            yearlyRecapHTML += `
                    </tbody>
                </table>
            `;
            yearlyRecapDiv.innerHTML = yearlyRecapHTML || '<p>Belum ada data transaksi.</p>';
        }


        // Fungsi untuk mengupdate seluruh UI
        function updateUI() {
            const selectedMonth = monthFilter.value;
            const selectedName = nameFilter.value;
            const selectedTag = tagFilter.value;
            const selectedType = typeFilter.value;

            renderTransactions(selectedMonth, selectedName, selectedTag, selectedType);
            renderDebts();
            renderPaidDebts();
            updateSummary();
            renderHomeTab();
        }


        // Fungsi untuk mengisi filter nama transaksi
        function populateNameFilter() {
            const names = [...new Set(appData.transactions.map(transaction => transaction.name))];
            nameFilter.innerHTML = '<option value="">Semua</option>';
            names.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                nameFilter.appendChild(option);
            });
        }

        // Fungsi untuk mengisi filter tag transaksi
        function populateTagFilter() {
            const tags = [...new Set(appData.transactions.map(transaction => transaction.tag).filter(tag => tag))];
            tagFilter.innerHTML = '<option value="">Semua</option>';
            tags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                tagFilter.appendChild(option);
            });
        }

        // Tambah Transaksi Event Listener
        document.getElementById('addTransactionForm').addEventListener('submit', function(event) {
            event.preventDefault();
            const transactionName = document.getElementById('transaction_name').value;
            const type = document.getElementById('type-transaction').value;
            const amount = parseFloat(document.getElementById('amount-transaction').value);
            const description = document.getElementById('description-transaction').value;
            const tag = document.getElementById('tag-transaction').value;

            if (amount > 0) {
                appData.transactions.push({
                    name: transactionName,
                    type: type,
                    amount: amount,
                    description: description,
                    tag: tag,
                    date: new Date().toISOString().slice(0, 19).replace('T', ' ')
                });
                saveData();
                populateNameFilter();
                populateTagFilter();
                closeModal('addTransactionModal');
                this.reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: 'Transaksi berhasil ditambahkan!',
                });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Perhatian!',
                    text: 'Jumlah transaksi harus lebih besar dari 0!',
                });
            }
        });

        // Tambah Hutang Event Listener
        document.getElementById('addDebtForm').addEventListener('submit', function(event) {
            event.preventDefault();
            const debtName = document.getElementById('debt_name').value;
            const principalAmount = parseFloat(document.getElementById('principal_amount').value);
            const installmentAmount = parseFloat(document.getElementById('debt_installment').value);
            const debtTotalInstallments = parseInt(document.getElementById('debt_total_installments').value);
            const debtInstallmentDueDay = parseInt(document.getElementById('debt_installment_due_day').value);
            const debtDueDate = document.getElementById('debt_due_date').value;
            const debtDescription = document.getElementById('debt_description').value;
            const debtId = generateUniqueId();

            const calculatedTotalAmount = installmentAmount * debtTotalInstallments;
            const totalInterest = calculatedTotalAmount - principalAmount;
            const loanDurationYears = debtTotalInstallments / 12;
            const annualInterestRate = (loanDurationYears > 0) ? ((totalInterest / principalAmount) / loanDurationYears) * 100 : 0;

            if (installmentAmount > 0 && debtTotalInstallments > 0 && debtInstallmentDueDay >= 1 && debtInstallmentDueDay <= 31 && principalAmount > 0) {
                const newDebt = {
                    id: debtId,
                    name: debtName,
                    principal_amount: principalAmount,
                    calculated_total_amount: calculatedTotalAmount,
                    remaining_amount: calculatedTotalAmount,
                    installment: installmentAmount,
                    total_installments: debtTotalInstallments,
                    installment_due_day: debtInstallmentDueDay,
                    due_date: debtDueDate,
                    description: debtDescription,
                    annual_interest_rate: parseFloat(annualInterestRate.toFixed(2)),
                    installments_paid: 0 // Initialize paid installments to 0
                };
                appData.debts.push(newDebt);
                saveData();
                closeModal('addDebtModal');
                this.reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: 'Hutang baru berhasil ditambahkan!',
                });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Perhatian!',
                    text: 'Pastikan semua informasi hutang terisi dengan benar (jumlah angsuran, total angsuran, tanggal jatuh tempo bulanan, dan jumlah hutang asli harus lebih dari 0 dan tanggal jatuh tempo bulanan antara 1-31).',
                });
            }
        });

        // Fungsi untuk membuat ID unik
        function generateUniqueId() {
            return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }

        // Fungsi untuk membuka modal
        function openModal(modalId) {
            const modal = document.getElementById(modalId);
            modal.style.display = "block";
        }

        // Fungsi untuk menutup modal
        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            modal.style.display = "none";
        }

        function openTab(tabId, event) {
            const tabcontent = document.getElementsByClassName("tab-content");
            for (let i = 0; i < tabcontent.length; i++) {
                tabcontent[i].classList.remove("active");
            }
            const tabbuttons = document.getElementsByClassName("tab-button");
            for (let i = 0; i < tabbuttons.length; i++) {
                tabbuttons[i].classList.remove("active");
            }
            document.getElementById(tabId).classList.add("active");
            if (event && event.currentTarget) {
                event.currentTarget.classList.add("active");
            } else {
                const button = document.querySelector(`.tab-button[onclick="openTab('${tabId}')"]`);
                if (button) {
                    button.classList.add('active');
                }
            }
            if (tabId === 'home') {
                renderHomeTab();
            } else if (tabId === 'paid-debts') {
                renderPaidDebts();
            } else if (tabId === 'debts') {
                renderDebts();
            } else if (tabId === 'transactions') {
                renderTransactions(monthFilter.value, nameFilter.value, tagFilter.value, typeFilter.value);
            }
        }

        // Fungsi untuk mengamankan string dari XSS
        function escapeHtml(unsafe) {
            return unsafe
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
         }

        // Fungsi untuk export data
        function exportData() {
            const dataStr = JSON.stringify(appData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileDefaultName = 'financial_data.json';

            let linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            document.body.appendChild(linkElement);
            linkElement.click();
            document.body.removeChild(linkElement);
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Data berhasil diekspor!',
            });
        }

        // Fungsi untuk import data
        importFile.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const jsonData = JSON.parse(e.target.result);
                        appData = jsonData;
                        populateNameFilter();
                        populateTagFilter();
                        saveData();
                        renderHomeTab(); // Update home tab after import
                        Swal.fire({
                            icon: 'success',
                            title: 'Berhasil!',
                            text: 'Data berhasil diimpor!',
                        });
                    } catch (error) {
                        console.error("Gagal memproses file JSON:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Oops...',
                            text: 'Terjadi kesalahan saat memproses file JSON!',
                        });
                    }
                };
                reader.readAsText(file);
            }
        });

        // Fungsi untuk delete data
        function clearAllData() {
            Swal.fire({
                title: 'Apakah Anda yakin?',
                text: "Semua data aplikasi akan dihapus!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Ya, hapus semua!',
                cancelButtonText: 'Batal'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.clear();
                    appData = { transactions: [], debts: [] }; // Reset appData
                    updateUI(); // Update the UI to show no data
                    populateNameFilter(); // Re-populate filters (they will be empty)
                    populateTagFilter();
                    renderHomeTab(); // Update home tab after clearing data
                    Swal.fire(
                        'Berhasil!',
                        'Semua data aplikasi telah dihapus.',
                        'success'
                    );
                }
            });
        }

        // Event listener untuk filter bulan
        monthFilter.addEventListener('change', function() {
            updateUI();
        });

        // Event listener untuk filter nama
        nameFilter.addEventListener('change', function() {
            updateUI();
        });

        // Event listener untuk filter tag
        tagFilter.addEventListener('change', function() {
            updateUI();
        });

        // Event listener untuk filter type
        typeFilter.addEventListener('change', function() {
            updateUI();
        });


        // Inisialisasi aplikasi
        getData();

        // Set default month filter to the current month
        const currentDate = new Date();
        const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // January is 0
        monthFilter.value = currentMonth;

        updateUI();

        // Set default tab to "transactions" on page load
        document.addEventListener('DOMContentLoaded', function() {
            openTab('home'); // Open Home tab by default
        });
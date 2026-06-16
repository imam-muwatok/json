# 💰 Muwatok Cash - Personal Finance Manager

Muwatok Cash adalah aplikasi manajemen keuangan pribadi berbasis web yang ringan, aman, dan berfokus pada privasi. Aplikasi ini membantu Anda melacak pendapatan, pengeluaran, target tabungan secara otomatis, serta portofolio investasi kripto dalam satu tempat.

## 🌟 Fitur Utama

### 1. Dashboard Interaktif
*   **Ringkasan Real-time:** Pantau Total Saldo, Total Tabungan, Pendapatan, dan Pengeluaran bulan berjalan.
*   **Indikator Tren:** Lihat persentase kenaikan atau penurunan dibandingkan bulan sebelumnya.
*   **Spending Limit:** Batas pengeluaran dinamis yang menampilkan persentase alokasi belanja terhadap strategi yang dipilih (misal: *Spending Limit - 70% (Auto Saving - 30%)*).
*   **Kategori Pengeluaran:** Visualisasi kategori belanja paling dominan beserta persentasenya terhadap pendapatan (Gaji atau Total Income).

### 2. Manajemen Transaksi Cerdas
*   **Multi-Source:** Catat transaksi yang diambil dari saldo utama (Wallet) atau langsung dari pos Tabungan tertentu.
*   **Auto-Allocation:** Setiap pendapatan (Gaji) dapat dipotong otomatis berdasarkan persentase yang Anda tentukan untuk mengisi pos-pos tabungan.
*   **Filter Powerfull:** Cari riwayat transaksi berdasarkan nama, kategori (tag), bulan, atau tahun.

### 3. Savings Waterfall (Tabungan Pintar)
*   **Auto-Redirect:** Jika sebuah target tabungan sudah tercapai (100%), alokasi otomatis akan dialihkan ke tabungan berikutnya yang Anda pilih.
*   **External Deposit:** Masukkan dana bunga bank atau hibah langsung ke tabungan tanpa memengaruhi saldo dompet utama.
*   **Accumulated Tracking:** Lihat total uang yang pernah masuk ke sebuah pos tabungan, memberikan perspektif seberapa konsisten Anda menyisihkan uang.
*   **History dengan Filter:** Pantau riwayat distribusi otomatis per bulan atau per tujuan tabungan.

### 4. Portofolio Investasi Kripto
*   **CoinGecko Integration:** Sinkronisasi harga aset kripto Anda secara real-time langsung dari API CoinGecko.
*   **Profit/Loss Tracking:** Pantau performa aset, ROI (Return on Investment), dan total nilai pasar portofolio Anda.
*   **USDT Swap:** Simulasi pembelian aset menggunakan saldo USDT yang sudah ada dalam portofolio.

### 5. Analitik Mendalam
*   **Trend Chart:** Grafik garis pendapatan vs pengeluaran antar bulan.
*   **Budget vs Actual:** Bandingkan rencana anggaran (berdasarkan strategi) dengan realita pengeluaran.
*   **Daily Depletion:** Lihat bagaimana "pot" uang Anda berkurang setiap harinya dalam satu bulan untuk menjaga ritme belanja.

### 6. Privasi & Keamanan Data
*   **Local Storage:** Data Anda 100% milik Anda dan hanya disimpan di browser Anda sendiri. Tidak ada server eksternal.
*   **Censor Mode:** Sembunyikan nominal angka dengan satu klik (ikon mata) di header saat ingin menunjukkan dashboard kepada orang lain.
*   **Data Management:** Ekspor dan Impor seluruh data dalam format JSON untuk cadangan (backup).

---

## 🚀 Panduan Penggunaan untuk Pengguna Baru

### Langkah 1: Pengaturan Awal
1.  Buka menu **Settings**.
2.  Tentukan **Budget Strategy**. 
    *   Pilih `Berdasarkan Alokasi Tabungan (Auto Saving)` jika Anda ingin batas belanja dihitung dari sisa uang setelah dipotong semua target tabungan.
    *   Atau pilih strategi preset seperti `Hard` (50%) atau `Normal` (80%).
3.  Pergi ke menu **Tags** untuk menambahkan kategori pengeluaran kustom Anda (misal: Makan, Listrik, Hiburan).

### Langkah 2: Membuat Target Tabungan
1.  Buka menu **Savings** dan klik **New Goal**.
2.  Masukkan nama (misal: Dana Darurat), target nominal, dan **Auto Allocation** (misal: 10%).
3.  Pilih **Target Pengalihan** jika Anda ingin uang otomatis pindah ke tabungan lain (misal: Tabungan Liburan) saat Dana Darurat sudah penuh.

### Langkah 3: Mencatat Pendapatan
1.  Klik **Add Transaction** di Dashboard.
2.  Pilih tipe **Income**. 
3.  **Penting:** Jika Anda menggunakan Tag **"Gaji"**, sistem akan otomatis membagi uang tersebut ke pos-pos tabungan sesuai persentase yang Anda buat di Langkah 2. Jika bukan gaji, sistem akan bertanya apakah Anda ingin tetap membaginya ke tabungan.

### Langkah 4: Mencatat Pengeluaran
1.  Klik **Add Transaction**.
2.  Pilih **Source of Funds**. 
    *   Pilih **Wallet** untuk pengeluaran sehari-hari menggunakan saldo utama.
    *   Pilih **Savings** jika Anda membeli sesuatu menggunakan uang yang sudah dikumpulkan di tabungan (misal: beli laptop dari tabungan "Gadget").

### Langkah 5: Memantau Investasi
1.  Di menu **Investment**, tambahkan aset kripto dengan memasukkan **CoinGecko ID** (misal: `bitcoin`, `solana`, `tether`).
2.  Gunakan tombol **Sync Prices** (ikon putar) untuk memperbarui nilai aset Anda ke harga pasar saat ini.

---

## 🛠 Tips Pro
*   **Budget Source Toggle:** Di header, gunakan ikon uang untuk beralih antara melihat laporan berdasarkan **Semua Pemasukan** atau hanya berdasarkan **Gaji**. Ini membantu Anda fokus pada anggaran dari gaji tetap tanpa terganggu pendapatan sampingan.
*   **Data Update:** Jika Anda baru saja memperbarui aplikasi, masuk ke **Settings** dan klik **Perbarui Struktur Data** untuk memastikan fitur-fitur baru (seperti log persentase tabungan) berfungsi pada data lama Anda.
*   **Live USDT:** Dashboard menampilkan harga Live USDT/IDR sebagai referensi kurs cepat untuk aset kripto Anda.
*   **External Savings:** Jika Anda mendapatkan bunga bank, gunakan fitur **Top Up** di menu Savings dan pilih sumber **Dana Luar (External)** agar saldo tabungan bertambah tanpa mengurangi isi dompet (Wallet) Anda.

---
*Muwatok Cash - Kelola uang dengan logika, nikmati hidup dengan tenang.*
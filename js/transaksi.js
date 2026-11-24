const categoryData = {
    'Pengeluaran': {
        'Makanan & Minuman': ['Sarapan', 'Makan Siang', 'Makan Malam', 'Ngopi / Jajan', 'Bahan Makanan'],
        'Transportasi': ['Bensin', 'Parkir', 'Ojek Online', 'Transportasi Umum'],
        'Belanja & Kebutuhan': ['Kebutuhan Harian', 'Pakaian', 'Skincare', 'Elektronik', 'Peralatan'],
        'Tagihan': ['Listrik', 'Air', 'Internet / Kuota', 'Kos / Kontrakan', 'Cicilan'],
        'Tabungan & Target': ['Tabungan Wishlist', 'Dana Darurat', 'Investasi'],
        'Kesehatan': ['Obat', 'Dokter', 'Vitamin'],
        'Pendidikan': ['Buku', 'Kursus', 'SPP / Kampus', 'Alat Tulis'],
        'Hiburan': ['Nonton', 'Jalan-jalan', 'Langganan Digital'],
        'Ibadah & Sosial': ['Sedekah', 'Zakat', 'Infaq', 'Hadiah'],
        'Lainnya': ['Lain-lain']
    },
    'Pemasukan': {
        'Gaji': ['Gaji Pokok', 'Tunjangan', 'Uang Lembur'],
        'Bonus': ['THR', 'Bonus', 'Cashback'],
        'Freelance / Usaha': ['Proyek', 'Jasa', 'Penjualan'],
        'Pemberian': ['Uang Saku', 'Hadiah'],
        'Investasi': ['Bunga / Bagi Hasil', 'Dividen'],
        'Lainnya': ['Lain-lain']
    }
};

const txType = document.getElementById('txType');
const txCategory = document.getElementById('txCategory');
const txSubCategory = document.getElementById('txSubCategory');
const txForm = document.getElementById('transaksiForm');
const transactionList = document.getElementById('transactionList');

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

function populateCategories() {
    const type = txType.value;
    const categories = Object.keys(categoryData[type]);
    txCategory.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    populateSubCategories();
}

function populateSubCategories() {
    const type = txType.value;
    const category = txCategory.value;
    const subCats = categoryData[type][category] || [];
    txSubCategory.innerHTML = subCats.map(sub => `<option value="${sub}">${sub}</option>`).join('');
}

txType.addEventListener('change', populateCategories);
txCategory.addEventListener('change', populateSubCategories);

window.switchTab = function (tabName) {
    document.getElementById('tabTambah').classList.toggle('active', tabName === 'tambah');
    document.getElementById('tabRiwayat').classList.toggle('active', tabName === 'riwayat');
    document.getElementById('btnTabTambah').classList.toggle('active', tabName === 'tambah');
    document.getElementById('btnTabRiwayat').classList.toggle('active', tabName === 'riwayat');

    if (tabName === 'riwayat') {
        renderTransactions();
    }
};

txForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const id = document.getElementById('txId').value;
    const dataUser = Storage.getUserData();
    let transactions = dataUser.transactions || [];

    const newTx = {
        id: id ? id : Date.now().toString(),
        type: txType.value,
        amount: parseInt(document.getElementById('txAmount').value, 10),
        category: txCategory.value,
        categoryDetail: txSubCategory.value,
        date: document.getElementById('txDate').value,
        description: document.getElementById('txDesc').value.trim()
    };

    if (id) {
        const index = transactions.findIndex(t => t.id === id);
        if (index !== -1) transactions[index] = newTx;
        AppToast('Transaksi diperbarui');
        cancelEdit();
    } else {
        transactions.push(newTx);
        AppToast('Transaksi disimpan');
        txForm.reset();
        document.getElementById('txDate').value = getLocalTodayStr();
        populateCategories();
    }

    dataUser.transactions = transactions;
    Storage.saveUserData(dataUser);
});

function renderTransactions() {
    const dataUser = Storage.getUserData();
    let transactions = dataUser.transactions || [];

    const fType = document.getElementById('filterType').value;
    const fMonth = document.getElementById('filterMonth').value;
    const fYear = document.getElementById('filterYear').value;
    const query = document.getElementById('searchTx').value.trim().toLowerCase();

    transactions = transactions.filter(tx => {
        const [txYear, txMonth] = tx.date.split('-');
        const matchType = fType === 'Semua' || tx.type === fType;
        const matchMonth = fMonth === 'Semua' || txMonth === fMonth;
        const matchYear = fYear === 'Semua' || txYear === fYear;
        const matchQuery = !query ||
            tx.description.toLowerCase().includes(query) ||
            tx.category.toLowerCase().includes(query) ||
            (tx.categoryDetail && tx.categoryDetail.toLowerCase().includes(query));

        return matchType && matchMonth && matchYear && matchQuery;
    });

    let sumIn = 0;
    let sumOut = 0;
    transactions.forEach(t => {
        if (t.type === 'Pemasukan') sumIn += Number(t.amount);
        else sumOut += Number(t.amount);
    });

    document.getElementById('filteredIncome').innerText = formatRupiah(sumIn);
    document.getElementById('filteredExpense').innerText = formatRupiah(sumOut);

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date) || Number(b.id) - Number(a.id));

    if (transactions.length === 0) {
        transactionList.innerHTML = '<p class="text-center" style="color:var(--grey); font-size:13px;">Tidak ada transaksi yang cocok.</p>';
        return;
    }

    transactionList.innerHTML = transactions.map(tx => {
        const isIncome = tx.type === 'Pemasukan';
        return `
            <div class="list-item" style="flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="font-size: 14px;">${tx.categoryDetail} <span style="font-size:11px; color:var(--grey); font-weight:400;">(${tx.category})</span></h4>
                        <p style="font-size: 12px; color: var(--grey);">${tx.date} • ${tx.description}</p>
                    </div>
                    <div class="item-amount ${isIncome ? 'text-success' : 'text-danger'}">
                        ${isIncome ? '+' : '-'}${formatRupiah(tx.amount)}
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" onclick="editTransaction('${tx.id}')">Edit</button>
                    <button class="btn-icon btn-delete" onclick="deleteTransaction('${tx.id}')">Hapus</button>
                </div>
            </div>
        `;
    }).join('');
}

window.deleteTransaction = function (id) {
    AppModal.show({
        title: 'Hapus Transaksi',
        message: 'Yakin ingin menghapus catatan transaksi ini?',
        type: 'confirm',
        icon: '🗑️',
        danger: true,
        confirmText: 'Hapus',
        onConfirm: () => {
            const dataUser = Storage.getUserData();
            dataUser.transactions = dataUser.transactions.filter(t => t.id !== id);
            Storage.saveUserData(dataUser);
            renderTransactions();
            AppToast('Transaksi dihapus');
        }
    });
};

window.editTransaction = function (id) {
    const dataUser = Storage.getUserData();
    const tx = dataUser.transactions.find(t => t.id === id);
    if (!tx) return;

    switchTab('tambah');
    document.getElementById('formTitle').innerText = 'Edit Transaksi';
    document.getElementById('btnSubmitForm').innerText = 'Simpan Perubahan';
    document.getElementById('btnCancelEdit').style.display = 'inline-flex';

    document.getElementById('txId').value = tx.id;
    document.getElementById('txType').value = tx.type;
    populateCategories();
    document.getElementById('txCategory').value = tx.category;
    populateSubCategories();
    document.getElementById('txSubCategory').value = tx.categoryDetail;

    document.getElementById('txAmount').value = tx.amount;
    document.getElementById('txDate').value = tx.date;
    document.getElementById('txDesc').value = tx.description;
};

window.cancelEdit = function () {
    document.getElementById('formTitle').innerText = 'Tambah Transaksi';
    document.getElementById('btnSubmitForm').innerText = 'Simpan Transaksi';
    document.getElementById('btnCancelEdit').style.display = 'none';
    document.getElementById('txId').value = '';
    txForm.reset();
    document.getElementById('txDate').value = getLocalTodayStr();
    populateCategories();
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('txDate').value = getLocalTodayStr();
    populateCategories();

    const now = new Date();
    const currentYear = now.getFullYear();
    const yearSelect = document.getElementById('filterYear');
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    }

    document.getElementById('filterMonth').value = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('filterYear').value = currentYear;

    document.getElementById('filterType').addEventListener('change', renderTransactions);
    document.getElementById('filterMonth').addEventListener('change', renderTransactions);
    document.getElementById('filterYear').addEventListener('change', renderTransactions);
    document.getElementById('searchTx').addEventListener('input', renderTransactions);

    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'riwayat') {
        switchTab('riwayat');
    }
});
const trxForm = document.getElementById('transaksiForm');
const trxListContainer = document.getElementById('transactionList');
const trxItemsContainer = document.getElementById('trxItemsContainer');
const searchInput = document.getElementById('searchTrx');
const filterTypeSelect = document.getElementById('filterType');
const filterMonthSelect = document.getElementById('filterMonth');
const filterYearSelect = document.getElementById('filterYear');

const CATEGORY_MAP = {
    Pengeluaran: {
        'Makanan & Minuman': ['Sarapan', 'Makan Siang', 'Makan Malam', 'Jajan / Kopi', 'Bahan Masakan'],
        'Belanja & Kebutuhan': ['Kebutuhan Harian', 'Pakaian', 'Elektronik', 'Perlengkapan Rumah'],
        'Transportasi': ['Bensin / BBM', 'Ojek / Taksi Online', 'Parkir & Tol', 'Servis Kendaraan'],
        'Tagihan & Utilitas': ['Listrik & Air', 'Internet / Paket Data', 'Pulsa', 'Kos / Kontrakan'],
        'Kesehatan': ['Obat-obatan', 'Periksa Dokter', 'Vitamin'],
        'Hiburan': ['Nonton / Wisata', 'Langganan Digital', 'Hobi'],
        'Pendidikan': ['Buku / Alat Tulis', 'Kursus / Pelatihan'],
        'Tabungan & Target': ['Tabungan Wishlist', 'Dana Darurat', 'Investasi'],
        'Lainnya': ['Keperluan Tak Terduga', 'Sedekah / Donasi']
    },
    Pemasukan: {
        'Gaji': ['Gaji Bulanan', 'Gaji Mingguan'],
        'Freelance / Proyek': ['Proyek Web', 'Jasa IT', 'Kerja Lepas'],
        'Bonus / THR': ['Bonus Kinerja', 'THR', 'Insentif'],
        'Hadiah': ['Pemberian Keluarga', 'Hadiah'],
        'Lainnya': ['Penjualan Barang', 'Pemasukan Lain']
    }
};

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
}).format(Number(num) || 0);

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function getCurrentTimeStr() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

window.updateCategoryOptions = function (selectedCat = null) {
    const type = document.getElementById('trxType').value;
    const catSelect = document.getElementById('trxCategory');
    const categories = Object.keys(CATEGORY_MAP[type] || {});

    catSelect.innerHTML = categories.map(cat =>
        `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
    ).join('');

    if (selectedCat && !categories.includes(selectedCat)) {
        catSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(selectedCat)}">${escapeHtml(selectedCat)}</option>`);
    }
    if (selectedCat) {
        catSelect.value = selectedCat;
    }

    updateSubCategorySuggestions();
};

window.updateSubCategorySuggestions = function () {
    const type = document.getElementById('trxType').value;
    const cat = document.getElementById('trxCategory').value;
    const dataList = document.getElementById('subCategoryList');
    const suggestions = (CATEGORY_MAP[type] && CATEGORY_MAP[type][cat]) ? CATEGORY_MAP[type][cat] : [];

    dataList.innerHTML = suggestions.map(item => `<option value="${escapeHtml(item)}">`).join('');
};

window.recalculateTrxTotal = function () {
    const rows = trxItemsContainer.querySelectorAll('.trx-item-row');
    let total = 0;
    let validCount = 0;

    rows.forEach(row => {
        const amt = parseInt(row.querySelector('.trx-item-amount').value, 10) || 0;
        if (amt > 0) {
            total += amt;
            validCount++;
        }
    });

    document.getElementById('trxTotalPreview').innerText = formatRupiah(total);
    document.getElementById('trxItemCountLabel').innerText = `${rows.length} item (${validCount} terisi)`;
};

window.removeTrxItemRow = function (btn) {
    const rows = trxItemsContainer.querySelectorAll('.trx-item-row');
    if (rows.length <= 1) {
        const row = rows[0];
        row.querySelector('.trx-item-name').value = '';
        row.querySelector('.trx-item-amount').value = '';
        row.querySelector('.trx-item-time').value = getCurrentTimeStr();
    } else {
        btn.closest('.trx-item-row').remove();
    }
    recalculateTrxTotal();
};

window.addTrxItemRow = function (name = '', amount = '', time = null, shouldFocus = false) {
    const effectiveTime = time === null ? getCurrentTimeStr() : time;
    const row = document.createElement('div');
    row.className = 'trx-item-row';
    row.innerHTML = `
        <div class="trx-item-top">
            <input type="text"
                   class="form-control trx-item-name"
                   style="flex: 1; padding: 8px 10px; font-size: 13px;"
                   value="${escapeHtml(name)}"
                   required
                   placeholder="Beli apa / keterangan (misal: Bakso)">
            <button type="button"
                    class="btn-icon btn-delete"
                    style="padding: 8px 10px;"
                    onclick="removeTrxItemRow(this)"
                    title="Hapus Item">✕</button>
        </div>
        <div class="trx-item-bottom">
            <div>
                <span class="mini-label">💵 Nominal (Rp)</span>
                <input type="number"
                       class="form-control trx-item-amount"
                       style="padding: 7px 9px; font-size: 13px;"
                       min="1"
                       inputmode="numeric"
                       value="${amount !== '' && amount !== null ? Number(amount) : ''}"
                       required
                       oninput="recalculateTrxTotal()"
                       placeholder="10000">
            </div>
            <div>
                <span class="mini-label">🕒 Jam Otomatis</span>
                <input type="time"
                       class="form-control trx-item-time"
                       style="padding: 7px 9px; font-size: 13px;"
                       value="${escapeHtml(effectiveTime)}">
            </div>
        </div>
    `;
    trxItemsContainer.appendChild(row);
    recalculateTrxTotal();

    if (shouldFocus) {
        setTimeout(() => {
            row.querySelector('.trx-item-name').focus();
        }, 60);
    }
};

window.switchTabTrx = function (tabName) {
    document.getElementById('tabCatat').classList.toggle('active', tabName === 'catat');
    document.getElementById('tabRiwayat').classList.toggle('active', tabName === 'riwayat');
    document.getElementById('btnTabCatat').classList.toggle('active', tabName === 'catat');
    document.getElementById('btnTabRiwayat').classList.toggle('active', tabName === 'riwayat');

    if (tabName === 'riwayat') {
        populateYearFilter();
        renderTransactions();
    } else if (!document.getElementById('trxId').value) {
        if (!document.getElementById('trxDate').value) {
            document.getElementById('trxDate').value = getLocalTodayStr();
        }
        if (trxItemsContainer.children.length === 0) {
            addTrxItemRow('', '', null, false);
        }
    }
};

function normalizeTransactionItems(trx) {
    if (Array.isArray(trx.items) && trx.items.length > 0) {
        return trx.items.map(it => ({
            name: String(it.name || '').trim() || 'Item',
            amount: Number(it.amount) || 0,
            time: it.time || ''
        }));
    }
    return [{
        name: String(trx.description || trx.categoryDetail || trx.category || 'Transaksi').trim(),
        amount: Number(trx.amount) || 0,
        time: trx.time || ''
    }];
}

function buildDescriptionFromItems(items) {
    return items.map(it => {
        const timePart = it.time ? ` [${it.time}]` : '';
        return `${it.name}${timePart} (${formatRupiah(it.amount)})`;
    }).join(', ');
}

trxForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const rows = trxItemsContainer.querySelectorAll('.trx-item-row');
    const items = [];
    rows.forEach(row => {
        const name = row.querySelector('.trx-item-name').value.trim();
        const amount = parseInt(row.querySelector('.trx-item-amount').value, 10) || 0;
        const time = row.querySelector('.trx-item-time').value || getCurrentTimeStr();
        if (name && amount > 0) {
            items.push({ name, amount, time });
        }
    });

    if (items.length === 0) {
        AppModal.show({
            title: 'Rincian Belum Lengkap',
            message: 'Isi minimal satu item belanja beserta nominal lebih dari Rp 0.',
            icon: '⚠️',
            type: 'alert'
        });
        return;
    }

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const id = document.getElementById('trxId').value;
    const type = document.getElementById('trxType').value;
    const date = document.getElementById('trxDate').value;
    const category = document.getElementById('trxCategory').value;
    const categoryDetail = document.getElementById('trxCategoryDetail').value.trim() || category;
    const description = buildDescriptionFromItems(items);

    const data = Storage.getUserData();
    if (!Array.isArray(data.transactions)) data.transactions = [];

    const trxPayload = {
        id: id ? id : Date.now().toString(),
        type: type,
        amount: totalAmount,
        category: category,
        categoryDetail: categoryDetail,
        date: date,
        time: items[0].time || getCurrentTimeStr(),
        description: description,
        items: items
    };

    if (id) {
        const idx = data.transactions.findIndex(t => String(t.id) === String(id));
        if (idx !== -1) {
            data.transactions[idx] = trxPayload;
        }
        cancelEditTrx();
        AppToast('Transaksi & rincian diperbarui');
    } else {
        data.transactions.push(trxPayload);
        resetTrxForm();
        AppToast('Transaksi tersimpan');
    }

    Storage.saveUserData(data);
    switchTabTrx('riwayat');
});

function resetTrxForm() {
    document.getElementById('trxId').value = '';
    document.getElementById('formTitleTrx').innerText = 'Catat Transaksi Baru';
    document.getElementById('btnSubmitTrx').innerText = 'Simpan Transaksi';
    document.getElementById('btnCancelEditTrx').style.display = 'none';
    trxForm.reset();
    document.getElementById('trxType').value = 'Pengeluaran';
    document.getElementById('trxDate').value = getLocalTodayStr();
    updateCategoryOptions();
    trxItemsContainer.innerHTML = '';
    addTrxItemRow('', '', null, false);
}

window.cancelEditTrx = function () {
    resetTrxForm();
};

window.editTransaction = function (id, appendNewItem = false) {
    const data = Storage.getUserData();
    const trx = (data.transactions || []).find(t => String(t.id) === String(id));
    if (!trx) return;

    switchTabTrx('catat');
    document.getElementById('formTitleTrx').innerText = 'Edit & Tambah Rincian Belanja';
    document.getElementById('btnSubmitTrx').innerText = 'Simpan Perubahan';
    document.getElementById('btnCancelEditTrx').style.display = 'inline-flex';

    document.getElementById('trxId').value = trx.id;
    document.getElementById('trxType').value = trx.type || 'Pengeluaran';
    updateCategoryOptions(trx.category);
    document.getElementById('trxCategoryDetail').value = trx.categoryDetail || trx.category || '';
    document.getElementById('trxDate').value = trx.date || getLocalTodayStr();

    trxItemsContainer.innerHTML = '';
    const existingItems = normalizeTransactionItems(trx);
    existingItems.forEach(item => {
        addTrxItemRow(item.name, item.amount, item.time || '', false);
    });

    if (appendNewItem) {
        addTrxItemRow('', '', null, true);
    }
};

window.deleteTransaction = function (id) {
    AppModal.show({
        title: 'Hapus Transaksi',
        message: 'Yakin ingin menghapus catatan transaksi ini?',
        type: 'confirm',
        icon: '🗑️',
        danger: true,
        confirmText: 'Hapus',
        onConfirm: () => {
            const data = Storage.getUserData();
            data.transactions = (data.transactions || []).filter(t => String(t.id) !== String(id));
            Storage.saveUserData(data);
            populateYearFilter();
            renderTransactions();
            AppToast('Transaksi dihapus');
        }
    });
};

function populateYearFilter() {
    const data = Storage.getUserData();
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set([currentYear]);

    (data.transactions || []).forEach(t => {
        if (t.date && /^\d{4}/.test(t.date)) {
            const yr = parseInt(t.date.slice(0, 4), 10);
            if (!isNaN(yr)) yearsSet.add(yr);
        }
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    const prevVal = filterYearSelect.value || String(currentYear);

    let html = `<option value="all">Semua Tahun</option>`;
    sortedYears.forEach(yr => {
        html += `<option value="${yr}">${yr}</option>`;
    });
    filterYearSelect.innerHTML = html;

    if (Array.from(filterYearSelect.options).some(opt => opt.value === prevVal)) {
        filterYearSelect.value = prevVal;
    } else {
        filterYearSelect.value = String(currentYear);
    }
}

function renderTransactions() {
    const data = Storage.getUserData();
    let list = [...(data.transactions || [])];

    const query = searchInput.value.trim().toLowerCase();
    const typeFilter = filterTypeSelect.value;
    const monthFilter = filterMonthSelect.value;
    const yearFilter = filterYearSelect.value;

    if (typeFilter !== 'all') {
        list = list.filter(t => t.type === typeFilter);
    }
    if (yearFilter !== 'all') {
        list = list.filter(t => t.date && t.date.startsWith(yearFilter));
    }
    if (monthFilter !== 'all') {
        list = list.filter(t => t.date && t.date.slice(5, 7) === monthFilter);
    }
    if (query) {
        list = list.filter(t => {
            const itemsText = Array.isArray(t.items)
                ? t.items.map(i => `${i.name} ${i.time || ''}`).join(' ').toLowerCase()
                : '';
            return (
                (t.category || '').toLowerCase().includes(query) ||
                (t.categoryDetail || '').toLowerCase().includes(query) ||
                (t.description || '').toLowerCase().includes(query) ||
                (t.date || '').includes(query) ||
                itemsText.includes(query)
            );
        });
    }

    list.sort((a, b) => new Date(b.date) - new Date(a.date) || Number(b.id) - Number(a.id));

    let totalMasuk = 0;
    let totalKeluar = 0;
    list.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'Pemasukan') totalMasuk += amt;
        if (t.type === 'Pengeluaran') totalKeluar += amt;
    });

    document.getElementById('filteredIncome').innerText = formatRupiah(totalMasuk);
    document.getElementById('filteredExpense').innerText = formatRupiah(totalKeluar);

    if (list.length === 0) {
        trxListContainer.innerHTML = '<p class="text-center" style="color:var(--grey); font-size:13px; padding: 12px 0;">Belum ada catatan transaksi pada filter ini.</p>';
        return;
    }

    trxListContainer.innerHTML = list.map(trx => {
        const isIncome = trx.type === 'Pemasukan';
        const items = normalizeTransactionItems(trx);
        const countBadge = items.length > 1
            ? `<span class="trx-count-pill">${items.length} item</span>`
            : '';

        const detailRowsHtml = items.map(item => `
            <div class="trx-detail-line">
                <div class="trx-detail-left">
                    ${item.time ? `<span class="trx-time-badge">🕒 ${escapeHtml(item.time)}</span>` : ''}
                    <span class="trx-item-title">${escapeHtml(item.name)}</span>
                </div>
                <span class="trx-item-price">${formatRupiah(item.amount)}</span>
            </div>
        `).join('');

        return `
            <div class="list-item" style="flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                    <div class="item-info">
                        <h4 style="font-size: 15px; margin-bottom: 3px;">
                            ${escapeHtml(trx.categoryDetail || trx.category)}
                            <span style="font-size: 12px; font-weight: 500; color: var(--grey);">(${escapeHtml(trx.category)})</span>
                            ${countBadge}
                        </h4>
                        <p style="font-size: 12px; color: var(--grey); margin: 0;">📅 ${escapeHtml(trx.date)}</p>
                    </div>
                    <div class="item-amount ${isIncome ? 'text-success' : 'text-danger'}" style="font-size: 15px; white-space: nowrap;">
                        ${isIncome ? '+' : '-'}${formatRupiah(trx.amount)}
                    </div>
                </div>

                <div class="trx-detail-box">
                    ${detailRowsHtml}
                </div>

                <div class="action-buttons" style="display: flex; flex-wrap: wrap; gap: 6px;">
                    <button type="button" class="btn-icon btn-edit" onclick="editTransaction('${trx.id}', false)">Edit</button>
                    <button type="button" class="btn-icon btn-save-money" onclick="editTransaction('${trx.id}', true)">+ Tambah Lagi</button>
                    <button type="button" class="btn-icon btn-delete" onclick="deleteTransaction('${trx.id}')">Hapus</button>
                </div>
            </div>
        `;
    }).join('');
}

searchInput.addEventListener('input', renderTransactions);
filterTypeSelect.addEventListener('change', renderTransactions);
filterMonthSelect.addEventListener('change', renderTransactions);
filterYearSelect.addEventListener('change', renderTransactions);

document.addEventListener('DOMContentLoaded', () => {
    const todayStr = getLocalTodayStr();
    filterMonthSelect.value = todayStr.slice(5, 7);
    populateYearFilter();
    filterYearSelect.value = todayStr.slice(0, 4);

    resetTrxForm();
    renderTransactions();
});
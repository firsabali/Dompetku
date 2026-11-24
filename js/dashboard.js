document.addEventListener('DOMContentLoaded', () => {
    const user = Storage.getCurrentUser();
    if (!user) return;

    document.getElementById('greeting').innerText = `Halo, ${user.name.split(' ')[0]}!`;
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('todayDateLabel').innerText = new Date().toLocaleDateString('id-ID', dateOptions);

    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
    };

    const periodSelect = document.getElementById('dashPeriod');
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    function populatePeriodOptions() {
        const data = Storage.getUserData();
        const currentYear = new Date().getFullYear();
        const yearsSet = new Set([currentYear]);

        (data.transactions || []).forEach(t => {
            if (t.date && /^\d{4}-\d{2}/.test(t.date)) {
                const yr = parseInt(t.date.slice(0, 4), 10);
                if (!isNaN(yr)) yearsSet.add(yr);
            }
        });

        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
        const previousValue = periodSelect.value || 'month';

        let html = `
            <option value="month">Bulan Ini</option>
            <option value="all">Semua Waktu</option>
        `;

        sortedYears.forEach(yr => {
            html += `<optgroup label="Tahun ${yr}">`;
            monthNames.forEach((name, idx) => {
                const monthNum = String(idx + 1).padStart(2, '0');
                html += `<option value="${yr}-${monthNum}">${name} ${yr}</option>`;
            });
            html += `</optgroup>`;
        });

        periodSelect.innerHTML = html;
        if (Array.from(periodSelect.options).some(opt => opt.value === previousValue)) {
            periodSelect.value = previousValue;
        }
    }

    function renderDashboard() {
        const data = Storage.getUserData();
        const todayStr = getLocalTodayStr();
        const currentYear = todayStr.slice(0, 4);
        const currentMonthPrefix = todayStr.slice(0, 7);
        const selectedPeriod = periodSelect.value;

        let transactions = data.transactions || [];
        if (selectedPeriod === 'month') {
            transactions = transactions.filter(t => t.date && t.date.startsWith(currentMonthPrefix));
        } else if (/^\d{4}-\d{2}$/.test(selectedPeriod)) {
            transactions = transactions.filter(t => t.date && t.date.startsWith(selectedPeriod));
        } else if (/^\d{2}$/.test(selectedPeriod)) {
            transactions = transactions.filter(t => t.date && t.date.startsWith(`${currentYear}-${selectedPeriod}`));
        }

        let totalPemasukan = 0;
        let totalPengeluaran = 0;

        transactions.forEach(trx => {
            if (trx.type === 'Pemasukan') totalPemasukan += Number(trx.amount) || 0;
            if (trx.type === 'Pengeluaran') totalPengeluaran += Number(trx.amount) || 0;
        });

        const saldo = totalPemasukan - totalPengeluaran;
        let persentase = totalPemasukan === 0 ? (totalPengeluaran > 0 ? 100 : 0) : (totalPengeluaran / totalPemasukan) * 100;
        if (persentase > 100) persentase = 100;

        document.getElementById('totalSaldo').innerText = formatRupiah(saldo);
        document.getElementById('totalPemasukan').innerText = formatRupiah(totalPemasukan);
        document.getElementById('totalPengeluaran').innerText = formatRupiah(totalPengeluaran);
        document.getElementById('persentasePengeluaran').innerText = `${persentase.toFixed(1)}%`;

        // Hitung Total Tabungan Terkumpul (Wishlist Finansial + Dana Darurat/Investasi)
        const wishlists = data.wishlists || [];
        const wishlistSavings = wishlists
            .filter(w => w.type !== 'Non-Finansial')
            .reduce((sum, w) => sum + (Number(w.collected) || 0), 0);

        const extraSavings = (data.transactions || [])
            .filter(t => t.type === 'Pengeluaran' && t.category === 'Tabungan & Target' && t.categoryDetail !== 'Tabungan Wishlist')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const totalTabungan = wishlistSavings + extraSavings;
        document.getElementById('totalTabungan').innerText = formatRupiah(totalTabungan);
        document.getElementById('tabunganBreakdown').innerText = `Wishlist: ${formatRupiah(wishlistSavings)} • Dana Darurat & Investasi: ${formatRupiah(extraSavings)}`;

        // Grafik Arus Kas
        const chartContainer = document.getElementById('simpleChart');
        const maxAmount = Math.max(totalPemasukan, totalPengeluaran, 1);
        const incomeHeight = (totalPemasukan / maxAmount) * 100;
        const expenseHeight = (totalPengeluaran / maxAmount) * 100;

        chartContainer.innerHTML = `
            <div class="bar-group">
                <span style="font-size: 10px; font-weight: 700; color: var(--success); margin-bottom: 4px;">${formatRupiah(totalPemasukan)}</span>
                <div class="bar income" style="height: ${incomeHeight}%"></div>
                <span class="bar-label">Pemasukan</span>
            </div>
            <div class="bar-group">
                <span style="font-size: 10px; font-weight: 700; color: var(--danger); margin-bottom: 4px;">${formatRupiah(totalPengeluaran)}</span>
                <div class="bar expense" style="height: ${expenseHeight}%"></div>
                <span class="bar-label">Pengeluaran</span>
            </div>
        `;

        // Ringkasan Aktivitas Hari Ini
        const todayActs = (data.activities || []).filter(a => a.date === todayStr);
        const doneActs = todayActs.filter(a => a.done).length;
        document.getElementById('todayActivitySummary').innerText = `${doneActs} / ${todayActs.length} Selesai`;

        // Ringkasan Habit Hari Ini
        const activeHabits = (data.habits || []).filter(h => h.startDate <= todayStr);
        const doneHabits = activeHabits.filter(h => h.records && h.records[todayStr] && h.records[todayStr].status === 'success').length;
        document.getElementById('todayHabitSummary').innerText = `${doneHabits} / ${activeHabits.length} Sukses`;

        // Kebutuhan Mendesak / Belum Dibeli
        const pendingNeeds = (data.needs || []).filter(n => !n.bought).slice(0, 4);
        const needsEl = document.getElementById('urgentNeedsList');
        if (pendingNeeds.length > 0) {
            needsEl.innerHTML = pendingNeeds.map(n => `
                <div class="list-item">
                    <div class="item-info">
                        <h4>${n.name} <span style="font-size:11px; color:var(--grey);">(${n.qty})</span></h4>
                        <p>${n.category} • ${n.priority}</p>
                    </div>
                    <div class="item-amount text-warning">
                        ${n.price > 0 ? formatRupiah(n.price) : '-'}
                    </div>
                </div>
            `).join('');
        } else {
            needsEl.innerHTML = '<p class="text-center" style="font-size: 12px; color: var(--grey);">Tidak ada daftar kebutuhan tertunda.</p>';
        }

        // 5 Transaksi Terbaru
        const allTx = data.transactions || [];
        const recentTxContainer = document.getElementById('recentTransactions');
        if (allTx.length > 0) {
            const sortedTx = [...allTx].sort((a, b) => new Date(b.date) - new Date(a.date) || Number(b.id) - Number(a.id)).slice(0, 5);
            recentTxContainer.innerHTML = sortedTx.map(trx => `
                <div class="list-item">
                    <div class="item-info">
                        <h4>${trx.categoryDetail || trx.category}</h4>
                        <p>${trx.date} • ${trx.description}</p>
                    </div>
                    <div class="item-amount ${trx.type === 'Pemasukan' ? 'text-success' : 'text-danger'}">
                        ${trx.type === 'Pemasukan' ? '+' : '-'}${formatRupiah(trx.amount)}
                    </div>
                </div>
            `).join('');
        }

        // 3 Target Terdekat
        const closestWsContainer = document.getElementById('closestWishlist');
        const activeWishlists = wishlists.filter(w => w.status === 'Berjalan')
            .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))
            .slice(0, 3);

        if (activeWishlists.length > 0) {
            closestWsContainer.innerHTML = activeWishlists.map(ws => {
                const isFin = ws.type !== 'Non-Finansial';
                const milestones = Array.isArray(ws.milestones) ? ws.milestones : [];

                if (isFin) {
                    const progress = Math.min(100, (ws.collected / ws.targetPrice) * 100);
                    return `
                        <div class="list-item" style="flex-direction: column; align-items: stretch;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <h4 style="font-size: 14px;">${ws.name}</h4>
                                <span style="font-size: 12px; font-weight: 700;">${formatRupiah(ws.targetPrice)}</span>
                            </div>
                            <div class="progress-container" style="margin: 4px 0;">
                                <div class="progress-bar" style="width: ${progress}%;"></div>
                            </div>
                            <p style="font-size: 11px; color: var(--grey); text-align: right;">
                                Terkumpul: ${formatRupiah(ws.collected)} (${progress.toFixed(0)}%)
                            </p>
                        </div>
                    `;
                } else if (milestones.length > 0) {
                    const passedSteps = milestones.filter(m => m.status === 'passed' || m.done).length;
                    const stepPct = (passedSteps / milestones.length) * 100;
                    return `
                        <div class="list-item" style="flex-direction: column; align-items: stretch;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <h4 style="font-size: 14px;">${ws.name}</h4>
                                <span style="font-size: 11px; font-weight: 700; color: var(--primary-blue);">${passedSteps}/${milestones.length} Lolos</span>
                            </div>
                            <div class="progress-container" style="margin: 4px 0;">
                                <div class="progress-bar" style="width: ${stepPct}%;"></div>
                            </div>
                            <p style="font-size: 11px; color: var(--grey); text-align: right;">
                                Batas waktu: ${ws.targetDate} (${stepPct.toFixed(0)}%)
                            </p>
                        </div>
                    `;
                } else {
                    return `
                        <div class="list-item" style="flex-direction: column; align-items: stretch;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <h4 style="font-size: 14px;">${ws.name}</h4>
                                <span style="font-size: 11px; font-weight: 700; color: var(--primary-blue);">Target Kerja & Pribadi</span>
                            </div>
                            <p style="font-size: 11px; color: var(--grey);">Batas waktu: ${ws.targetDate}</p>
                        </div>
                    `;
                }
            }).join('');
        }
    }

    populatePeriodOptions();
    periodSelect.addEventListener('change', renderDashboard);
    renderDashboard();
});
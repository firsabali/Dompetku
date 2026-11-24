(function () {
    const formatRupiah = (num) => new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(Number(num) || 0);

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getTodayDate() {
        if (typeof getLocalTodayStr === 'function') return getLocalTodayStr();
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Perpindahan Tab Aktivitas & List Kebutuhan
    window.switchTabAct = function (tabName) {
        const isKebutuhan = tabName === 'kebutuhan';

        const tabAkt = document.getElementById('tabAktivitas');
        const tabKeb = document.getElementById('tabKebutuhan');
        const btnAkt = document.getElementById('btnTabAktivitas');
        const btnKeb = document.getElementById('btnTabKebutuhan');

        if (tabAkt) tabAkt.classList.toggle('active', !isKebutuhan);
        if (tabKeb) tabKeb.classList.toggle('active', isKebutuhan);
        if (btnAkt) btnAkt.classList.toggle('active', !isKebutuhan);
        if (btnKeb) btnKeb.classList.toggle('active', isKebutuhan);

        if (isKebutuhan) {
            renderNeeds();
        } else {
            renderActivities();
        }
    };

    // ========================
    // BAGIAN 1: AKTIVITAS HARIAN
    // ========================
    function getSelectedJournalDate() {
        const input = document.getElementById('journalDate');
        if (!input) return getTodayDate();
        if (!input.value) input.value = getTodayDate();
        return input.value;
    }

    function renderActivities() {
        const selectedDate = getSelectedJournalDate();
        const data = Storage.getUserData();
        const allActivities = Array.isArray(data.activities) ? data.activities : [];

        const dayActivities = allActivities
            .filter(a => a.date === selectedDate)
            .sort((a, b) => {
                if (a.done !== b.done) return a.done ? 1 : -1;
                return (a.time || '99:99').localeCompare(b.time || '99:99');
            });

        const total = dayActivities.length;
        const doneCount = dayActivities.filter(a => a.done).length;
        const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

        const progressText = document.getElementById('actProgressText');
        const progressBar = document.getElementById('actProgressBar');
        if (progressText) progressText.innerText = `${doneCount} / ${total} Selesai`;
        if (progressBar) progressBar.style.width = `${pct}%`;

        const container = document.getElementById('activityListContainer');
        if (!container) return;

        if (dayActivities.length === 0) {
            container.innerHTML = '<p class="text-center" style="font-size: 13px; color: var(--grey); padding: 10px 0;">Belum ada aktivitas pada tanggal ini.</p>';
            return;
        }

        const priorityColor = {
            'Tinggi': 'var(--danger)',
            'Sedang': 'var(--warning)',
            'Rendah': 'var(--success)'
        };

        container.innerHTML = dayActivities.map(act => {
            const pColor = priorityColor[act.priority] || 'var(--grey)';
            const timeLabel = act.time ? `🕒 ${escapeHtml(act.time)} • ` : '';
            const noteHtml = act.note ? `<p style="font-size: 11px; color: var(--grey); margin-top: 2px;">${escapeHtml(act.note)}</p>` : '';

            return `
                <div class="list-item" style="align-items: flex-start; gap: 10px;">
                    <input type="checkbox"
                           style="width: 19px; height: 19px; margin-top: 2px; accent-color: var(--primary-blue); cursor: pointer;"
                           ${act.done ? 'checked' : ''}
                           onchange="toggleActivity('${act.id}')">
                    <div class="item-info" style="flex: 1;">
                        <h4 class="${act.done ? 'item-done' : ''}" style="font-size: 14px; margin-bottom: 3px;">
                            ${escapeHtml(act.title)}
                        </h4>
                        <p style="font-size: 11px; color: var(--grey);">
                            ${timeLabel}${escapeHtml(act.category)} •
                            <span style="font-weight: 700; color: ${pColor};">${escapeHtml(act.priority)}</span>
                        </p>
                        ${noteHtml}
                        <div class="action-buttons" style="margin-top: 8px; display: flex; gap: 6px;">
                            <button type="button" class="btn-icon btn-edit" onclick="editActivity('${act.id}')">Edit</button>
                            <button type="button" class="btn-icon btn-delete" onclick="deleteActivity('${act.id}')">Hapus</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.toggleActivity = function (id) {
        const data = Storage.getUserData();
        const idx = data.activities.findIndex(a => String(a.id) === String(id));
        if (idx === -1) return;

        data.activities[idx].done = !data.activities[idx].done;
        Storage.saveUserData(data);
        renderActivities();
        if (typeof AppToast === 'function') {
            AppToast(data.activities[idx].done ? 'Aktivitas selesai!' : 'Status aktivitas dikembalikan');
        }
    };

    window.editActivity = function (id) {
        const data = Storage.getUserData();
        const act = data.activities.find(a => String(a.id) === String(id));
        if (!act) return;

        document.getElementById('actId').value = act.id;
        document.getElementById('actTime').value = act.time || '';
        document.getElementById('actCategory').value = act.category || 'Kerja / Kuliah';
        document.getElementById('actTitle').value = act.title || '';
        document.getElementById('actPriority').value = act.priority || 'Sedang';
        document.getElementById('actNote').value = act.note || '';

        document.getElementById('formTitleAct').innerText = 'Edit Aktivitas';
        document.getElementById('btnSubmitAct').innerText = 'Simpan Perubahan';
        document.getElementById('btnCancelEditAct').style.display = 'inline-flex';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.cancelEditAct = function () {
        const form = document.getElementById('activityForm');
        if (form) form.reset();
        document.getElementById('actId').value = '';
        document.getElementById('formTitleAct').innerText = 'Catat Aktivitas';
        document.getElementById('btnSubmitAct').innerText = 'Simpan Aktivitas';
        document.getElementById('btnCancelEditAct').style.display = 'none';
    };

    window.deleteActivity = function (id) {
        AppModal.show({
            title: 'Hapus Aktivitas',
            message: 'Yakin ingin menghapus catatan aktivitas ini?',
            type: 'confirm',
            icon: '🗑️',
            danger: true,
            confirmText: 'Hapus',
            onConfirm: () => {
                const data = Storage.getUserData();
                data.activities = data.activities.filter(a => String(a.id) !== String(id));
                Storage.saveUserData(data);
                renderActivities();
                if (typeof AppToast === 'function') AppToast('Aktivitas dihapus');
            }
        });
    };

    // ========================
    // BAGIAN 2: LIST KEBUTUHAN
    // ========================
    function renderNeeds() {
        const data = Storage.getUserData();
        let needs = Array.isArray(data.needs) ? [...data.needs] : [];

        const pendingItems = needs.filter(n => !n.bought);
        const boughtItems = needs.filter(n => n.bought);
        const estimatedTotal = pendingItems.reduce((sum, n) => sum + (Number(n.price) || 0), 0);

        const elPending = document.getElementById('needPendingCount');
        const elBought = document.getElementById('needBoughtCount');
        const elTotal = document.getElementById('needEstimatedTotal');

        if (elPending) elPending.innerText = `${pendingItems.length} Item`;
        if (elBought) elBought.innerText = `${boughtItems.length} sudah dibeli`;
        if (elTotal) elTotal.innerText = formatRupiah(estimatedTotal);

        const statusFilter = document.getElementById('filterNeedStatus') ? document.getElementById('filterNeedStatus').value : 'all';
        const searchQuery = document.getElementById('searchNeed') ? document.getElementById('searchNeed').value.trim().toLowerCase() : '';

        if (statusFilter === 'pending') {
            needs = needs.filter(n => !n.bought);
        } else if (statusFilter === 'bought') {
            needs = needs.filter(n => n.bought);
        }

        if (searchQuery) {
            needs = needs.filter(n =>
                (n.name && n.name.toLowerCase().includes(searchQuery)) ||
                (n.category && n.category.toLowerCase().includes(searchQuery))
            );
        }

        const priorityWeight = { 'Tinggi': 1, 'Sedang': 2, 'Rendah': 3 };
        needs.sort((a, b) => {
            if (a.bought !== b.bought) return a.bought ? 1 : -1;
            const wa = priorityWeight[a.priority] || 9;
            const wb = priorityWeight[b.priority] || 9;
            if (wa !== wb) return wa - wb;
            return Number(b.id) - Number(a.id);
        });

        const container = document.getElementById('needsListContainer');
        if (!container) return;

        if (needs.length === 0) {
            container.innerHTML = '<p class="text-center" style="font-size: 13px; color: var(--grey); padding: 12px 0;">Belum ada daftar kebutuhan yang sesuai.</p>';
            return;
        }

        const priorityColor = {
            'Tinggi': 'var(--danger)',
            'Sedang': 'var(--warning)',
            'Rendah': 'var(--success)'
        };

        container.innerHTML = needs.map(item => {
            const price = Number(item.price) || 0;
            const pColor = priorityColor[item.priority] || 'var(--grey)';
            const noteHtml = item.note ? `<p style="font-size: 11px; color: var(--grey); margin-top: 2px;">${escapeHtml(item.note)}</p>` : '';
            const statusBadge = item.bought
                ? `<span class="badge badge-selesai">Sudah Dibeli</span>`
                : `<span class="badge badge-berjalan">Belum Dibeli</span>`;

            return `
                <div class="list-item" style="flex-direction: column; align-items: stretch;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
                        <div>
                            <h4 class="${item.bought ? 'item-done' : ''}" style="font-size: 15px; margin: 0;">
                                ${escapeHtml(item.name)}
                                <span style="font-size: 12px; font-weight: 500; color: var(--grey);">(${escapeHtml(item.qty || '1 pcs')})</span>
                            </h4>
                            <p style="font-size: 11px; color: var(--grey); margin-top: 3px;">
                                ${escapeHtml(item.category)} •
                                <span style="font-weight: 700; color: ${pColor};">${escapeHtml(item.priority)}</span>
                            </p>
                            ${noteHtml}
                        </div>
                        <div style="text-align: right; flex-shrink: 0;">
                            ${statusBadge}
                            <div style="font-size: 13px; font-weight: 700; color: ${item.bought ? 'var(--grey)' : 'var(--primary-blue)'}; margin-top: 4px;">
                                ${price > 0 ? formatRupiah(price) : 'Tanpa harga'}
                            </div>
                        </div>
                    </div>

                    <div class="action-buttons" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
                        ${item.bought
                    ? `<button type="button" class="btn-icon btn-edit" onclick="unmarkNeedBought('${item.id}')">↩ Batal Beli</button>`
                    : `<button type="button" class="btn-icon" style="background: var(--success); color: white;" onclick="markNeedBought('${item.id}')">✔ Sudah Dibeli</button>`
                }
                        <button type="button" class="btn-icon btn-edit" onclick="editNeed('${item.id}')">Edit</button>
                        <button type="button" class="btn-icon btn-delete" onclick="deleteNeed('${item.id}')">Hapus</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.markNeedBought = function (id) {
        const data = Storage.getUserData();
        const idx = data.needs.findIndex(n => String(n.id) === String(id));
        if (idx === -1) return;

        const item = data.needs[idx];
        const price = Number(item.price) || 0;

        if (price > 0) {
            AppModal.show({
                title: 'Catat ke Pengeluaran?',
                message: `"${item.name}" memiliki estimasi ${formatRupiah(price)}.\n\nCatat otomatis sebagai Pengeluaran di Keuangan hari ini?`,
                type: 'confirm',
                icon: '🧾',
                confirmText: 'Ya, Catat Pengeluaran',
                cancelText: 'Tandai Dibeli Saja',
                onConfirm: () => {
                    const fresh = Storage.getUserData();
                    const fIdx = fresh.needs.findIndex(n => String(n.id) === String(id));
                    if (fIdx !== -1) {
                        fresh.needs[fIdx].bought = true;
                        fresh.needs[fIdx].boughtDate = getTodayDate();
                        fresh.transactions.push({
                            id: Date.now().toString(),
                            type: 'Pengeluaran',
                            amount: price,
                            category: 'Kebutuhan Harian',
                            categoryDetail: item.category || 'Belanja Kebutuhan',
                            date: getTodayDate(),
                            description: `Beli kebutuhan: ${item.name} (${item.qty || '1 pcs'})`
                        });
                        Storage.saveUserData(fresh);
                        renderNeeds();
                        if (typeof AppToast === 'function') AppToast('Ditandai dibeli & dicatat ke Keuangan');
                    }
                },
                onCancel: () => {
                    const fresh = Storage.getUserData();
                    const fIdx = fresh.needs.findIndex(n => String(n.id) === String(id));
                    if (fIdx !== -1) {
                        fresh.needs[fIdx].bought = true;
                        fresh.needs[fIdx].boughtDate = getTodayDate();
                        Storage.saveUserData(fresh);
                        renderNeeds();
                        if (typeof AppToast === 'function') AppToast('Kebutuhan ditandai sudah dibeli');
                    }
                }
            });
        } else {
            item.bought = true;
            item.boughtDate = getTodayDate();
            Storage.saveUserData(data);
            renderNeeds();
            if (typeof AppToast === 'function') AppToast('Kebutuhan ditandai sudah dibeli');
        }
    };

    window.unmarkNeedBought = function (id) {
        const data = Storage.getUserData();
        const idx = data.needs.findIndex(n => String(n.id) === String(id));
        if (idx === -1) return;

        data.needs[idx].bought = false;
        delete data.needs[idx].boughtDate;
        Storage.saveUserData(data);
        renderNeeds();
        if (typeof AppToast === 'function') AppToast('Status dikembalikan ke Belum Dibeli');
    };

    window.editNeed = function (id) {
        const data = Storage.getUserData();
        const item = data.needs.find(n => String(n.id) === String(id));
        if (!item) return;

        document.getElementById('needId').value = item.id;
        document.getElementById('needName').value = item.name || '';
        document.getElementById('needQty').value = item.qty || '1 pcs';
        document.getElementById('needCategory').value = item.category || 'Kebutuhan Pokok';
        document.getElementById('needPriority').value = item.priority || 'Sedang';
        document.getElementById('needPrice').value = Number(item.price) || 0;
        document.getElementById('needNote').value = item.note || '';

        document.getElementById('formTitleNeed').innerText = 'Edit Kebutuhan';
        document.getElementById('btnSubmitNeed').innerText = 'Simpan Perubahan';
        document.getElementById('btnCancelEditNeed').style.display = 'inline-flex';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.cancelEditNeed = function () {
        const form = document.getElementById('needForm');
        if (form) form.reset();
        document.getElementById('needId').value = '';
        document.getElementById('needQty').value = '1 pcs';
        document.getElementById('needPrice').value = '0';
        document.getElementById('formTitleNeed').innerText = 'Tambah Kebutuhan';
        document.getElementById('btnSubmitNeed').innerText = 'Simpan ke List';
        document.getElementById('btnCancelEditNeed').style.display = 'none';
    };

    window.deleteNeed = function (id) {
        AppModal.show({
            title: 'Hapus Kebutuhan',
            message: 'Yakin ingin menghapus item ini dari daftar kebutuhan?',
            type: 'confirm',
            icon: '🗑️',
            danger: true,
            confirmText: 'Hapus',
            onConfirm: () => {
                const data = Storage.getUserData();
                data.needs = data.needs.filter(n => String(n.id) !== String(id));
                Storage.saveUserData(data);
                renderNeeds();
                if (typeof AppToast === 'function') AppToast('Item kebutuhan dihapus');
            }
        });
    };

    // ========================
    // INISIALISASI HALAMAN
    // ========================
    document.addEventListener('DOMContentLoaded', () => {
        const journalInput = document.getElementById('journalDate');
        if (journalInput) {
            journalInput.value = getTodayDate();
            journalInput.addEventListener('change', renderActivities);
        }

        const activityForm = document.getElementById('activityForm');
        if (activityForm) {
            activityForm.addEventListener('submit', function (e) {
                e.preventDefault();
                const id = document.getElementById('actId').value;
                const selectedDate = getSelectedJournalDate();
                const data = Storage.getUserData();
                if (!Array.isArray(data.activities)) data.activities = [];

                const payload = {
                    id: id ? id : Date.now().toString(),
                    date: selectedDate,
                    time: document.getElementById('actTime').value,
                    category: document.getElementById('actCategory').value,
                    title: document.getElementById('actTitle').value.trim(),
                    priority: document.getElementById('actPriority').value,
                    note: document.getElementById('actNote').value.trim(),
                    done: false
                };

                if (id) {
                    const idx = data.activities.findIndex(a => String(a.id) === String(id));
                    if (idx !== -1) {
                        payload.done = data.activities[idx].done;
                        payload.date = data.activities[idx].date;
                        data.activities[idx] = payload;
                    }
                    cancelEditAct();
                    if (typeof AppToast === 'function') AppToast('Aktivitas diperbarui');
                } else {
                    data.activities.push(payload);
                    activityForm.reset();
                    if (typeof AppToast === 'function') AppToast('Aktivitas disimpan');
                }

                Storage.saveUserData(data);
                renderActivities();
            });
        }

        const needForm = document.getElementById('needForm');
        if (needForm) {
            needForm.addEventListener('submit', function (e) {
                e.preventDefault();
                const id = document.getElementById('needId').value;
                const data = Storage.getUserData();
                if (!Array.isArray(data.needs)) data.needs = [];

                const payload = {
                    id: id ? id : Date.now().toString(),
                    name: document.getElementById('needName').value.trim(),
                    qty: document.getElementById('needQty').value.trim() || '1 pcs',
                    category: document.getElementById('needCategory').value,
                    priority: document.getElementById('needPriority').value,
                    price: parseInt(document.getElementById('needPrice').value, 10) || 0,
                    note: document.getElementById('needNote').value.trim(),
                    bought: false
                };

                if (id) {
                    const idx = data.needs.findIndex(n => String(n.id) === String(id));
                    if (idx !== -1) {
                        payload.bought = data.needs[idx].bought;
                        if (data.needs[idx].boughtDate) payload.boughtDate = data.needs[idx].boughtDate;
                        data.needs[idx] = payload;
                    }
                    cancelEditNeed();
                    if (typeof AppToast === 'function') AppToast('Kebutuhan diperbarui');
                } else {
                    data.needs.push(payload);
                    needForm.reset();
                    document.getElementById('needQty').value = '1 pcs';
                    document.getElementById('needPrice').value = '0';
                    if (typeof AppToast === 'function') AppToast('Ditambahkan ke List Kebutuhan');
                }

                Storage.saveUserData(data);
                renderNeeds();
            });
        }

        const filterNeed = document.getElementById('filterNeedStatus');
        if (filterNeed) filterNeed.addEventListener('change', renderNeeds);

        const searchNeed = document.getElementById('searchNeed');
        if (searchNeed) searchNeed.addEventListener('input', renderNeeds);

        const params = new URLSearchParams(window.location.search);
        if (params.get('tab') === 'kebutuhan') {
            switchTabAct('kebutuhan');
        } else {
            renderActivities();
        }
    });
})();
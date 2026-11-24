const wsForm = document.getElementById('wishlistForm');
const wishlistContainer = document.getElementById('wishlistContainer');
const searchInput = document.getElementById('searchWs');
const milestoneContainer = document.getElementById('milestoneInputsContainer');
let activeSavingId = null;
let activeRemainingAmount = 0;
let activeNextStageWsId = null;

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
}).format(Number(num) || 0);

function escapeAttr(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatIndoDate(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const mIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (mIdx >= 0 && mIdx < 12 && !isNaN(day)) {
        return `${day} ${months[mIdx]} ${parts[0]}`;
    }
    return dateStr;
}

function getStepStatus(m) {
    if (m.status === 'passed' || m.status === 'accepted' || m.status === 'failed' || m.status === 'pending') {
        return m.status;
    }
    return m.done ? 'passed' : 'pending';
}

function isStepCompleted(m) {
    const st = getStepStatus(m);
    return st === 'passed' || st === 'accepted';
}

window.handleMilestoneStatusSelect = function (selectEl) {
    const row = selectEl.closest('.milestone-row');
    if (!row) return;
    const resultWrap = row.querySelector('.milestone-result-wrap');
    const resultInput = row.querySelector('.milestone-result-date');
    if (!resultWrap || !resultInput) return;

    if (selectEl.value === 'pending') {
        resultWrap.style.display = 'none';
        resultInput.value = '';
    } else {
        resultWrap.style.display = 'block';
        if (!resultInput.value) {
            resultInput.value = getLocalTodayStr();
        }
    }
};

window.addMilestoneInput = function (text = '', date = '', status = 'pending', resultDate = '') {
    const row = document.createElement('div');
    row.className = 'milestone-row';
    const showResultDate = status !== 'pending';
    const effectiveResultDate = showResultDate ? (resultDate || getLocalTodayStr()) : '';

    row.innerHTML = `
        <div class="milestone-row-top">
            <input type="text" class="form-control milestone-text" style="flex: 1; padding: 8px 10px; font-size: 13px;" value="${escapeAttr(text)}" placeholder="Nama tahap (misal: Daftar / Interview)">
            <button type="button" class="btn-icon btn-delete" style="padding: 8px 10px;" onclick="this.closest('.milestone-row').remove()" title="Hapus Tahapan">✕</button>
        </div>
        <div class="milestone-row-grid">
            <div>
                <span class="mini-field-label">📅 Tanggal Jadwal</span>
                <input type="date" class="form-control milestone-date" style="padding: 7px 8px; font-size: 12px;" value="${escapeAttr(date)}">
            </div>
            <div>
                <span class="mini-field-label">📌 Status Tahap</span>
                <select class="form-control milestone-status" style="padding: 7px 8px; font-size: 12px;" onchange="handleMilestoneStatusSelect(this)">
                    <option value="pending" ${status === 'pending' ? 'selected' : ''}>⏳ Proses</option>
                    <option value="passed" ${status === 'passed' ? 'selected' : ''}>✅ Lolos</option>
                    <option value="accepted" ${status === 'accepted' ? 'selected' : ''}>🎉 Diterima</option>
                    <option value="failed" ${status === 'failed' ? 'selected' : ''}>❌ Tidak</option>
                </select>
            </div>
        </div>
        <div class="milestone-result-wrap" style="display: ${showResultDate ? 'block' : 'none'};">
            <span class="mini-field-label">🗓️ Tanggal Keputusan (Lolos / Diterima / Tidak)</span>
            <input type="date" class="form-control milestone-result-date" style="padding: 7px 8px; font-size: 12px;" value="${escapeAttr(effectiveResultDate)}">
        </div>
    `;
    milestoneContainer.appendChild(row);
};

window.toggleWsType = function () {
    const type = document.getElementById('wsType').value;
    const financialInputs = document.getElementById('financialInputs');
    const nonFinancialInputs = document.getElementById('nonFinancialInputs');
    const targetPrice = document.getElementById('wsTargetPrice');
    const collected = document.getElementById('wsCollected');

    if (type === 'Non-Finansial') {
        financialInputs.style.display = 'none';
        nonFinancialInputs.style.display = 'block';
        targetPrice.removeAttribute('required');
        collected.removeAttribute('required');

        if (milestoneContainer.children.length === 0) {
            addMilestoneInput('Daftar / Kirim Lamaran', getLocalTodayStr(), 'pending', '');
            addMilestoneInput('Interview', '', 'pending', '');
        }
    } else {
        financialInputs.style.display = 'block';
        nonFinancialInputs.style.display = 'none';
        targetPrice.setAttribute('required', 'required');
        collected.setAttribute('required', 'required');
    }
};

window.switchTabWs = function (tabName) {
    document.getElementById('tabDaftar').classList.toggle('active', tabName === 'daftar');
    document.getElementById('tabTambah').classList.toggle('active', tabName === 'tambah');
    document.getElementById('btnTabDaftar').classList.toggle('active', tabName === 'daftar');
    document.getElementById('btnTabTambah').classList.toggle('active', tabName === 'tambah');

    if (tabName === 'daftar') {
        renderWishlist(searchInput.value);
    } else {
        if (!document.getElementById('wsId').value) {
            document.getElementById('wsStartDate').value = getLocalTodayStr();
        }
        toggleWsType();
    }
};

wsForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const id = document.getElementById('wsId').value;
    const dataUser = Storage.getUserData();
    let wishlists = dataUser.wishlists || [];

    const type = document.getElementById('wsType').value;
    let targetPrice = 0;
    let collected = 0;
    let milestones = [];
    let status = document.getElementById('wsStatus').value;

    if (type === 'Finansial') {
        targetPrice = parseInt(document.getElementById('wsTargetPrice').value, 10) || 0;
        collected = parseInt(document.getElementById('wsCollected').value, 10) || 0;

        if (targetPrice > 0 && collected >= targetPrice) {
            collected = targetPrice;
            status = 'Selesai';
        }
    } else {
        const rows = milestoneContainer.querySelectorAll('.milestone-row');
        rows.forEach(row => {
            const text = row.querySelector('.milestone-text').value.trim();
            const stepDate = row.querySelector('.milestone-date').value || '';
            let stepStatus = row.querySelector('.milestone-status').value;
            let resultDate = row.querySelector('.milestone-result-date') ? row.querySelector('.milestone-result-date').value : '';

            if (text) {
                if (status === 'Selesai' && stepStatus === 'pending') {
                    stepStatus = 'passed';
                }
                if (stepStatus !== 'pending' && !resultDate) {
                    resultDate = getLocalTodayStr();
                } else if (stepStatus === 'pending') {
                    resultDate = '';
                }

                milestones.push({
                    text: text,
                    date: stepDate,
                    status: stepStatus,
                    resultDate: resultDate,
                    done: stepStatus === 'passed' || stepStatus === 'accepted'
                });
            }
        });

        if (milestones.some(m => m.status === 'accepted')) {
            status = 'Selesai';
        } else if (milestones.length > 0 && milestones.every(m => isStepCompleted(m))) {
            status = 'Selesai';
        }
    }

    const completedDate = (status === 'Selesai' || status === 'Gagal') ? getLocalTodayStr() : null;

    const newWs = {
        id: id ? id : 'ws_' + Date.now(),
        type: type,
        name: document.getElementById('wsName').value.trim(),
        targetPrice: targetPrice,
        collected: collected,
        milestones: milestones,
        startDate: document.getElementById('wsStartDate').value,
        targetDate: document.getElementById('wsTargetDate').value,
        completedDate: completedDate,
        status: status
    };

    if (id) {
        const index = wishlists.findIndex(w => String(w.id) === String(id));
        if (index !== -1) wishlists[index] = newWs;
        cancelEditWs();
        AppToast('Target diperbarui');
    } else {
        wishlists.push(newWs);
        wsForm.reset();
        milestoneContainer.innerHTML = '';
        toggleWsType();
        AppToast('Target baru disimpan');
    }

    dataUser.wishlists = wishlists;
    Storage.saveUserData(dataUser);
    switchTabWs('daftar');
});

function renderWishlist(searchQuery = '') {
    const dataUser = Storage.getUserData();
    let wishlists = dataUser.wishlists || [];

    if (searchQuery) {
        wishlists = wishlists.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    const statusOrder = { 'Berjalan': 1, 'Selesai': 2, 'Gagal': 3 };
    wishlists.sort((a, b) => {
        const oa = statusOrder[a.status] || 1;
        const ob = statusOrder[b.status] || 1;
        if (oa !== ob) return oa - ob;
        return new Date(a.targetDate) - new Date(b.targetDate);
    });

    if (wishlists.length === 0) {
        wishlistContainer.innerHTML = '<p class="text-center" style="color:var(--grey); font-size:13px; padding: 12px 0;">Belum ada wishlist atau target. Klik tab <strong>Tambah Baru</strong> untuk membuat.</p>';
        return;
    }

    wishlistContainer.innerHTML = wishlists.map(ws => {
        const isFinansial = ws.type !== 'Non-Finansial';
        const isSelesai = ws.status === 'Selesai';
        const isGagal = ws.status === 'Gagal';
        const isClosed = isSelesai || isGagal;
        const tglMulai = ws.startDate ? formatIndoDate(ws.startDate) : '-';
        const tglTarget = ws.targetDate ? formatIndoDate(ws.targetDate) : '-';
        const milestones = Array.isArray(ws.milestones) ? ws.milestones : [];
        const targetPrice = Number(ws.targetPrice) || 0;
        const collected = Number(ws.collected) || 0;

        let progress = 0;
        let completedCount = 0;
        if (isFinansial) {
            progress = targetPrice > 0 ? Math.min(100, (collected / targetPrice) * 100) : 0;
        } else if (milestones.length > 0) {
            completedCount = milestones.filter(m => isStepCompleted(m)).length;
            progress = isSelesai ? 100 : (completedCount / milestones.length) * 100;
        } else {
            progress = isSelesai ? 100 : 0;
        }

        const barClass = isSelesai ? 'progress-bar success' : 'progress-bar';
        let badgeClass = 'badge badge-berjalan';
        let badgeLabel = 'Berjalan';
        if (isSelesai) {
            badgeClass = 'badge badge-selesai';
            badgeLabel = isFinansial ? 'Tercapai' : 'Diterima / Lolos';
        } else if (isGagal) {
            badgeClass = 'badge badge-gagal';
            badgeLabel = 'Tidak Lolos';
        }

        let detailHtml = '';
        if (isFinansial) {
            detailHtml = `
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
                    <span>Terkumpul: ${formatRupiah(collected)}</span>
                    <span>Target: ${formatRupiah(targetPrice)}</span>
                </div>
            `;
        } else if (milestones.length > 0) {
            const stepsListHtml = milestones.map((m, idx) => {
                const st = getStepStatus(m);
                const labelClass = st === 'passed' ? 'is-passed' : (st === 'accepted' ? 'is-accepted' : (st === 'failed' ? 'is-failed' : ''));
                const decisionDateStr = m.resultDate ? formatIndoDate(m.resultDate) : '';

                let statusTagHtml = `<span class="step-result-tag tag-pending">⏳ Proses</span>`;
                if (st === 'passed') {
                    statusTagHtml = `<span class="step-result-tag tag-passed">✅ Lolos${decisionDateStr ? ` (${escapeAttr(decisionDateStr)})` : ''}</span>`;
                } else if (st === 'accepted') {
                    statusTagHtml = `<span class="step-result-tag tag-accepted">🎉 Diterima${decisionDateStr ? ` (${escapeAttr(decisionDateStr)})` : ''}</span>`;
                } else if (st === 'failed') {
                    statusTagHtml = `<span class="step-result-tag tag-failed">❌ Tidak Lolos${decisionDateStr ? ` (${escapeAttr(decisionDateStr)})` : ''}</span>`;
                }

                const scheduleHtml = m.date
                    ? `<div class="step-schedule-text">📅 Jadwal: ${escapeAttr(formatIndoDate(m.date))}</div>`
                    : `<div class="step-schedule-text" style="color: #94a3b8;">📅 Jadwal belum diatur</div>`;

                return `
                    <div class="step-row-item">
                        <div class="step-header-line">
                            <span class="step-label ${labelClass}">${idx + 1}. ${escapeAttr(m.text)}</span>
                            ${statusTagHtml}
                        </div>
                        ${scheduleHtml}
                        <div class="step-action-bar">
                            <button type="button"
                                    class="step-pill-btn ${st === 'passed' ? 'active-passed' : ''}"
                                    ${isClosed ? 'disabled' : `onclick="setMilestoneStatus('${ws.id}', ${idx}, 'passed')"`}>
                                ✔ Lolos
                            </button>
                            <button type="button"
                                    class="step-pill-btn ${st === 'accepted' ? 'active-accepted' : ''}"
                                    ${isClosed ? 'disabled' : `onclick="setMilestoneStatus('${ws.id}', ${idx}, 'accepted')"`}>
                                🎉 Diterima
                            </button>
                            <button type="button"
                                    class="step-pill-btn ${st === 'failed' ? 'active-failed' : ''}"
                                    ${isClosed ? 'disabled' : `onclick="setMilestoneStatus('${ws.id}', ${idx}, 'failed')"`}>
                                ✕ Tidak
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            const nextStageBtnHtml = !isClosed
                ? `<button type="button" class="btn-add-next-stage" onclick="openNextStageModal('${ws.id}')">+ Tambah Tahap Lanjutan</button>`
                : '';

            detailHtml = `
                <div class="step-list-box">
                    <div style="font-size: 11px; font-weight: 700; color: var(--primary-blue); margin-bottom: 4px;">
                        📋 Tahapan Seleksi / Pencapaian:
                    </div>
                    ${stepsListHtml}
                    ${nextStageBtnHtml}
                </div>
            `;
        } else {
            detailHtml = `<div style="font-size: 12px; font-weight: 600; color: var(--primary-blue); margin-bottom: 4px;">🎯 Target Pencapaian Kerja & Pribadi</div>`;
        }

        let dateHtml = `Mulai: ${tglMulai} • Tenggat: ${tglTarget}`;
        if (isSelesai) {
            const doneDate = formatIndoDate(ws.completedDate || ws.targetDate);
            dateHtml = `Mulai: ${tglMulai} • <span class="text-success" style="font-weight:700;">${isFinansial ? 'Tercapai' : 'Diterima'}: ${doneDate}</span>`;
        } else if (isGagal) {
            const failDate = formatIndoDate(ws.completedDate || ws.targetDate);
            dateHtml = `Mulai: ${tglMulai} • <span class="text-danger" style="font-weight:700;">Selesai: ${failDate}</span>`;
        }

        let actionButtons = '';
        if (isSelesai) {
            actionButtons = `<button type="button" class="btn-icon btn-delete" onclick="deleteWishlist('${ws.id}')">Hapus</button>`;
        } else if (isGagal) {
            actionButtons = `
                <button type="button" class="btn-icon btn-edit" onclick="reopenWishlist('${ws.id}')">↩ Coba Lagi</button>
                <button type="button" class="btn-icon btn-delete" onclick="deleteWishlist('${ws.id}')">Hapus</button>
            `;
        } else {
            actionButtons = `
                ${isFinansial ? `<button type="button" class="btn-icon btn-save-money" onclick="openSaveModal('${ws.id}')">+ Nabung</button>` : ''}
                <button type="button" class="btn-icon" style="color: white; background: var(--success);" onclick="markAsDone('${ws.id}')">${isFinansial ? '✔ Selesai' : '🎉 Diterima'}</button>
                ${!isFinansial ? `<button type="button" class="btn-icon" style="color: white; background: var(--danger);" onclick="markAsFailed('${ws.id}')">✕ Tidak Lolos</button>` : ''}
                <button type="button" class="btn-icon btn-edit" onclick="editWishlist('${ws.id}')">Edit</button>
                <button type="button" class="btn-icon btn-delete" onclick="deleteWishlist('${ws.id}')">Hapus</button>
            `;
        }

        const progressLabel = isFinansial
            ? `Progres Tabungan: ${progress.toFixed(1)}%`
            : (milestones.length > 0 ? `Tahap Selesai: ${completedCount}/${milestones.length} (${progress.toFixed(0)}%)` : '');

        return `
            <div class="list-item" style="flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <h4 style="font-size: 15px; margin: 0;">${escapeAttr(ws.name)}</h4>
                    <span class="${badgeClass}">${badgeLabel}</span>
                </div>
                <p style="font-size: 11px; color: var(--grey); margin-bottom: 8px;">${dateHtml}</p>
                ${detailHtml}
                <div class="progress-container">
                    <div class="${barClass}" style="width: ${progress}%;"></div>
                </div>
                ${progressLabel ? `<div style="text-align: right; font-size: 11px; color: var(--grey); margin-top: 2px;">${progressLabel}</div>` : ''}
                <div class="action-buttons" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">${actionButtons}</div>
            </div>
        `;
    }).join('');
}

window.setMilestoneStatus = function (wsId, mIndex, targetStatus) {
    const data = Storage.getUserData();
    const idx = data.wishlists.findIndex(w => String(w.id) === String(wsId));
    if (idx === -1) return;

    const ws = data.wishlists[idx];
    if (!Array.isArray(ws.milestones) || !ws.milestones[mIndex]) return;

    const step = ws.milestones[mIndex];
    const currentStatus = getStepStatus(step);
    const nextStatus = currentStatus === targetStatus ? 'pending' : targetStatus;
    const todayStr = getLocalTodayStr();
    const formattedToday = formatIndoDate(todayStr);

    step.status = nextStatus;
    step.done = nextStatus === 'passed' || nextStatus === 'accepted';
    step.resultDate = nextStatus === 'pending' ? '' : todayStr;

    Storage.saveUserData(data);
    renderWishlist(searchInput.value);

    if (nextStatus === 'accepted') {
        AppToast(`"${step.text}" Diterima (${formattedToday})`);
        if (ws.status === 'Berjalan') {
            AppModal.show({
                title: 'Selamat, Diterima!',
                message: `Tahap "${step.text}" ditandai Diterima (${formattedToday}).\nTandai target "${ws.name}" selesai sekarang?`,
                type: 'confirm',
                icon: '🎉',
                confirmText: 'Ya, Selesai',
                cancelText: 'Nanti Saja',
                onConfirm: () => {
                    const fresh = Storage.getUserData();
                    const fIdx = fresh.wishlists.findIndex(w => String(w.id) === String(wsId));
                    if (fIdx !== -1) {
                        fresh.wishlists[fIdx].status = 'Selesai';
                        fresh.wishlists[fIdx].completedDate = todayStr;
                        Storage.saveUserData(fresh);
                        renderWishlist(searchInput.value);
                        AppToast('Selamat! Target berhasil diraih!');
                    }
                }
            });
        }
    } else if (nextStatus === 'passed') {
        AppToast(`"${step.text}" Lolos (${formattedToday})`);
        if (ws.milestones.length > 0 && ws.milestones.every(m => isStepCompleted(m)) && ws.status === 'Berjalan') {
            AppModal.show({
                title: 'Semua Tahapan Lolos!',
                message: `Seluruh tahapan pada "${ws.name}" sudah Lolos (${formattedToday}).\nTandai target ini selesai atau masih ada tahap lanjutan?`,
                type: 'confirm',
                icon: '🏆',
                confirmText: 'Selesai / Diterima',
                cancelText: 'Masih Lanjut',
                onConfirm: () => {
                    const fresh = Storage.getUserData();
                    const fIdx = fresh.wishlists.findIndex(w => String(w.id) === String(wsId));
                    if (fIdx !== -1) {
                        fresh.wishlists[fIdx].status = 'Selesai';
                        fresh.wishlists[fIdx].completedDate = todayStr;
                        Storage.saveUserData(fresh);
                        renderWishlist(searchInput.value);
                        AppToast('Selamat! Target berhasil diraih!');
                    }
                }
            });
        }
    } else if (nextStatus === 'failed') {
        AppToast(`"${step.text}" Tidak Lolos (${formattedToday})`);
        if (ws.status === 'Berjalan') {
            AppModal.show({
                title: 'Tahap Tidak Lolos',
                message: `Tahap "${step.text}" ditandai Tidak Lolos (${formattedToday}).\nApakah target "${ws.name}" ditutup sebagai Tidak Lolos?`,
                type: 'confirm',
                icon: '📋',
                danger: true,
                confirmText: 'Ya, Tidak Lolos',
                cancelText: 'Tetap Berjalan',
                onConfirm: () => {
                    const fresh = Storage.getUserData();
                    const fIdx = fresh.wishlists.findIndex(w => String(w.id) === String(wsId));
                    if (fIdx !== -1) {
                        fresh.wishlists[fIdx].status = 'Gagal';
                        fresh.wishlists[fIdx].completedDate = todayStr;
                        Storage.saveUserData(fresh);
                        renderWishlist(searchInput.value);
                    }
                }
            });
        }
    }
};

// Modal Tambah Tahap Lanjutan langsung dari Daftar Target
window.openNextStageModal = function (wsId) {
    const data = Storage.getUserData();
    const ws = data.wishlists.find(w => String(w.id) === String(wsId));
    if (!ws) return;

    activeNextStageWsId = String(ws.id);
    document.getElementById('nextStageSubtitle').innerText = `Target: ${ws.name}`;
    document.getElementById('nextStageName').value = '';
    document.getElementById('nextStageDate').value = '';
    document.getElementById('nextStageModal').classList.add('active');

    setTimeout(() => {
        document.getElementById('nextStageName').focus();
    }, 100);
};

window.closeNextStageModal = function () {
    activeNextStageWsId = null;
    document.getElementById('nextStageModal').classList.remove('active');
};

window.submitNextStage = function () {
    const stageName = document.getElementById('nextStageName').value.trim();
    const stageDate = document.getElementById('nextStageDate').value || '';

    if (!stageName) {
        AppModal.show({
            title: 'Nama Tahap Kosong',
            message: 'Masukkan nama tahapan lanjutan terlebih dahulu.',
            icon: '⚠️',
            type: 'alert'
        });
        return;
    }

    const data = Storage.getUserData();
    const idx = data.wishlists.findIndex(w => String(w.id) === String(activeNextStageWsId));
    if (idx !== -1) {
        if (!Array.isArray(data.wishlists[idx].milestones)) {
            data.wishlists[idx].milestones = [];
        }
        data.wishlists[idx].milestones.push({
            text: stageName,
            date: stageDate,
            status: 'pending',
            resultDate: '',
            done: false
        });
        Storage.saveUserData(data);
        closeNextStageModal();
        renderWishlist(searchInput.value);
        AppToast('Tahap lanjutan ditambahkan');
    } else {
        closeNextStageModal();
    }
};

// Fitur Tambah Tabungan Cepat
window.openSaveModal = function (id) {
    const data = Storage.getUserData();
    const ws = data.wishlists.find(w => String(w.id) === String(id));
    if (!ws) return;

    activeSavingId = String(ws.id);
    const targetPrice = Number(ws.targetPrice) || 0;
    const collected = Number(ws.collected) || 0;
    const sisa = Math.max(0, targetPrice - collected);
    activeRemainingAmount = sisa;

    document.getElementById('saveModalTitle').innerText = `Tabung: ${ws.name}`;
    document.getElementById('saveModalSubtitle').innerText = `Terkumpul ${formatRupiah(collected)} • Sisa: ${formatRupiah(sisa)}`;
    document.getElementById('addSavingAmount').value = '';
    document.getElementById('btnFillRemaining').style.display = sisa > 0 ? 'inline-block' : 'none';
    document.getElementById('saveMoneyModal').classList.add('active');

    setTimeout(() => {
        document.getElementById('addSavingAmount').focus();
    }, 100);
};

window.setQuickSaving = function (nominal) {
    const input = document.getElementById('addSavingAmount');
    const current = parseInt(input.value, 10) || 0;
    input.value = current + nominal;
};

window.fillRemainingSaving = function () {
    if (activeRemainingAmount > 0) {
        document.getElementById('addSavingAmount').value = activeRemainingAmount;
    }
};

window.closeSaveModal = function () {
    activeSavingId = null;
    activeRemainingAmount = 0;
    document.getElementById('saveMoneyModal').classList.remove('active');
};

window.submitAddSaving = function () {
    const rawVal = document.getElementById('addSavingAmount').value;
    const amount = parseInt(String(rawVal).replace(/[^0-9]/g, ''), 10);

    if (!amount || amount <= 0) {
        AppModal.show({
            title: 'Nominal Tidak Valid',
            message: 'Masukkan nominal tabungan lebih dari Rp 0.',
            icon: '⚠️',
            type: 'alert'
        });
        return;
    }

    const data = Storage.getUserData();
    if (!Array.isArray(data.wishlists)) data.wishlists = [];
    if (!Array.isArray(data.transactions)) data.transactions = [];

    const idx = data.wishlists.findIndex(w => String(w.id) === String(activeSavingId));
    if (idx === -1) {
        closeSaveModal();
        AppModal.show({
            title: 'Target Tidak Ditemukan',
            message: 'Silakan pilih target finansial terlebih dahulu dengan menekan tombol "+ Nabung" pada kartu target.',
            icon: 'ℹ️',
            type: 'alert'
        });
        return;
    }

    const ws = data.wishlists[idx];
    const targetPrice = Number(ws.targetPrice) || 0;
    const currentCollected = Number(ws.collected) || 0;

    ws.collected = currentCollected + amount;
    if (targetPrice > 0 && ws.collected >= targetPrice) {
        ws.collected = targetPrice;
        ws.status = 'Selesai';
        ws.completedDate = getLocalTodayStr();
    }

    if (document.getElementById('recordAsExpense').checked) {
        data.transactions.push({
            id: Date.now().toString(),
            type: 'Pengeluaran',
            amount: amount,
            category: 'Tabungan & Target',
            categoryDetail: 'Tabungan Wishlist',
            date: getLocalTodayStr(),
            description: `Tabungan target: ${ws.name}`
        });
    }

    Storage.saveUserData(data);
    closeSaveModal();
    renderWishlist(searchInput.value);
    AppToast(ws.status === 'Selesai' ? '🎉 Selamat! Target tercapai!' : `Tabungan ${formatRupiah(amount)} tersimpan`);
};

searchInput.addEventListener('input', (e) => renderWishlist(e.target.value));

window.markAsDone = function (id) {
    const todayStr = getLocalTodayStr();
    AppModal.show({
        title: 'Tandai Diterima / Tercapai?',
        message: `Target akan ditandai selesai pada tanggal ${formatIndoDate(todayStr)}.`,
        type: 'confirm',
        icon: '🎉',
        confirmText: 'Ya, Selesai',
        onConfirm: () => {
            const dataUser = Storage.getUserData();
            const index = dataUser.wishlists.findIndex(w => String(w.id) === String(id));
            if (index !== -1) {
                dataUser.wishlists[index].status = 'Selesai';
                dataUser.wishlists[index].completedDate = todayStr;
                if (dataUser.wishlists[index].type !== 'Non-Finansial') {
                    dataUser.wishlists[index].collected = Number(dataUser.wishlists[index].targetPrice) || 0;
                } else if (Array.isArray(dataUser.wishlists[index].milestones)) {
                    const lastIdx = dataUser.wishlists[index].milestones.length - 1;
                    dataUser.wishlists[index].milestones.forEach((m, i) => {
                        if (getStepStatus(m) === 'pending') {
                            m.status = i === lastIdx ? 'accepted' : 'passed';
                            m.done = true;
                            m.resultDate = todayStr;
                        }
                    });
                }
                Storage.saveUserData(dataUser);
                renderWishlist(searchInput.value);
                AppToast('Target selesai!');
            }
        }
    });
};

window.markAsFailed = function (id) {
    const todayStr = getLocalTodayStr();
    AppModal.show({
        title: 'Tandai Tidak Lolos?',
        message: `Status target akan diubah menjadi Tidak Lolos (${formatIndoDate(todayStr)}).`,
        type: 'confirm',
        icon: '❌',
        danger: true,
        confirmText: 'Ya, Tidak Lolos',
        onConfirm: () => {
            const dataUser = Storage.getUserData();
            const index = dataUser.wishlists.findIndex(w => String(w.id) === String(id));
            if (index !== -1) {
                dataUser.wishlists[index].status = 'Gagal';
                dataUser.wishlists[index].completedDate = todayStr;
                Storage.saveUserData(dataUser);
                renderWishlist(searchInput.value);
                AppToast('Status diubah menjadi Tidak Lolos');
            }
        }
    });
};

window.reopenWishlist = function (id) {
    const dataUser = Storage.getUserData();
    const index = dataUser.wishlists.findIndex(w => String(w.id) === String(id));
    if (index !== -1) {
        dataUser.wishlists[index].status = 'Berjalan';
        dataUser.wishlists[index].completedDate = null;
        Storage.saveUserData(dataUser);
        renderWishlist(searchInput.value);
        AppToast('Target dibuka kembali');
    }
};

window.deleteWishlist = function (id) {
    AppModal.show({
        title: 'Hapus Target',
        message: 'Yakin ingin menghapus target ini dari daftar?',
        type: 'confirm',
        icon: '🗑️',
        danger: true,
        confirmText: 'Hapus',
        onConfirm: () => {
            const dataUser = Storage.getUserData();
            dataUser.wishlists = dataUser.wishlists.filter(w => String(w.id) !== String(id));
            Storage.saveUserData(dataUser);
            renderWishlist(searchInput.value);
            AppToast('Target dihapus');
        }
    });
};

window.editWishlist = function (id) {
    const dataUser = Storage.getUserData();
    const ws = dataUser.wishlists.find(w => String(w.id) === String(id));
    if (!ws) return;

    switchTabWs('tambah');
    document.getElementById('formTitleWs').innerText = 'Edit Target';
    document.getElementById('btnSubmitWs').innerText = 'Simpan Perubahan';
    document.getElementById('btnCancelEditWs').style.display = 'inline-flex';

    document.getElementById('wsId').value = ws.id;
    document.getElementById('wsType').value = ws.type || 'Finansial';
    document.getElementById('wsName').value = ws.name;
    document.getElementById('wsTargetPrice').value = ws.targetPrice || '';
    document.getElementById('wsCollected').value = ws.collected || 0;
    document.getElementById('wsStartDate').value = ws.startDate || '';
    document.getElementById('wsTargetDate').value = ws.targetDate;
    document.getElementById('wsStatus').value = ws.status || 'Berjalan';

    milestoneContainer.innerHTML = '';
    if (ws.type === 'Non-Finansial' && Array.isArray(ws.milestones) && ws.milestones.length > 0) {
        ws.milestones.forEach(m => addMilestoneInput(m.text, m.date || '', getStepStatus(m), m.resultDate || ''));
    }

    toggleWsType();
};

window.cancelEditWs = function () {
    document.getElementById('formTitleWs').innerText = 'Tambah Target Baru';
    document.getElementById('btnSubmitWs').innerText = 'Simpan Target';
    document.getElementById('btnCancelEditWs').style.display = 'none';
    document.getElementById('wsId').value = '';
    milestoneContainer.innerHTML = '';
    wsForm.reset();
    toggleWsType();
};

document.addEventListener('DOMContentLoaded', () => renderWishlist());
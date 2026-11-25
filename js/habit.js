(function () {
    let selectedHabitId = null;
    let viewYear = new Date().getFullYear();
    let viewMonth = new Date().getMonth();

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getTodayStr() {
        if (typeof getLocalTodayStr === 'function') return getLocalTodayStr();
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function parseYMD(dateStr) {
        const [y, m, d] = String(dateStr).split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function formatYMD(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function formatIndoDate(dateStr) {
        if (!dateStr) return '-';
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

    // Otomatis menandai hari sebelumnya yang tidak cek-in sebagai Gagal (merah permanen)
    function syncMissedDaysAsFailed() {
        const data = Storage.getUserData();
        const habits = Array.isArray(data.habits) ? data.habits : [];
        const todayStr = getTodayStr();
        const todayDate = parseYMD(todayStr);
        let changed = false;

        habits.forEach(habit => {
            if (!habit.records || typeof habit.records !== 'object') {
                habit.records = {};
            }
            if (!habit.startDate || habit.startDate >= todayStr) return;

            const cursor = parseYMD(habit.startDate);
            while (cursor < todayDate) {
                const dStr = formatYMD(cursor);
                if (!habit.records[dStr] || !habit.records[dStr].status) {
                    habit.records[dStr] = { status: 'failed', auto: true };
                    changed = true;
                }
                cursor.setDate(cursor.getDate() + 1);
            }
        });

        if (changed) {
            data.habits = habits;
            Storage.saveUserData(data);
        }
    }

    // Evaluasi status tanggal: hijau untuk berhasil, merah untuk gagal atau tidak cek-in harian
    function getEffectiveDayStatus(habit, dateStr, todayStr) {
        if (!habit.startDate || dateStr < habit.startDate) return 'before';
        if (dateStr > todayStr) return 'future';

        const rec = habit.records && habit.records[dateStr];
        if (rec && rec.status === 'success') return 'success';
        if (rec && rec.status === 'failed') return 'failed';

        if (dateStr < todayStr) return 'failed';
        return 'pending';
    }

    function calculateHabitStats(habit, todayStr) {
        let success = 0;
        let failed = 0;

        if (habit.startDate && habit.startDate <= todayStr) {
            const cursor = parseYMD(habit.startDate);
            const end = parseYMD(todayStr);

            while (cursor <= end) {
                const dStr = formatYMD(cursor);
                const st = getEffectiveDayStatus(habit, dStr, todayStr);
                if (st === 'success') success++;
                else if (st === 'failed') failed++;
                cursor.setDate(cursor.getDate() + 1);
            }
        }

        const total = success + failed;
        const pct = total > 0 ? Math.round((success / total) * 100) : 0;

        let streak = 0;
        if (habit.startDate && habit.startDate <= todayStr) {
            const cursor = parseYMD(todayStr);
            const start = parseYMD(habit.startDate);

            if (getEffectiveDayStatus(habit, todayStr, todayStr) === 'pending') {
                cursor.setDate(cursor.getDate() - 1);
            }

            while (cursor >= start) {
                const dStr = formatYMD(cursor);
                if (getEffectiveDayStatus(habit, dStr, todayStr) === 'success') {
                    streak++;
                    cursor.setDate(cursor.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        return { success, failed, pct, streak };
    }

    window.switchTabHabit = function (tabName) {
        const isBuat = tabName === 'buat';
        document.getElementById('tabTracker').classList.toggle('active', !isBuat);
        document.getElementById('tabBuat').classList.toggle('active', isBuat);
        document.getElementById('btnTabTracker').classList.toggle('active', !isBuat);
        document.getElementById('btnTabBuat').classList.toggle('active', isBuat);

        if (isBuat) {
            if (!document.getElementById('habitId').value) {
                document.getElementById('habitStartDate').value = getTodayStr();
            }
        } else {
            renderHabitPage();
        }
    };

    window.selectHabit = function (id) {
        selectedHabitId = String(id);
        renderHabitPage();
    };

    window.changeHabitMonth = function (delta) {
        viewMonth += delta;
        if (viewMonth < 0) {
            viewMonth = 11;
            viewYear -= 1;
        } else if (viewMonth > 11) {
            viewMonth = 0;
            viewYear += 1;
        }
        renderHabitPage();
    };

    window.setHabitDayStatus = function (habitId, dateStr, newStatus) {
        const todayStr = getTodayStr();
        const data = Storage.getUserData();
        const idx = (data.habits || []).findIndex(h => String(h.id) === String(habitId));
        if (idx === -1) return;

        const habit = data.habits[idx];
        const currentStatus = getEffectiveDayStatus(habit, dateStr, todayStr);

        // Status yang sudah hijau (success) atau merah (failed) bersifat paten dan tidak bisa diubah
        if (currentStatus === 'success' || currentStatus === 'failed') {
            if (typeof AppToast === 'function') {
                AppToast('Status sudah permanen dan tidak dapat diubah');
            }
            return;
        }

        if (currentStatus !== 'pending') return;

        if (!habit.records || typeof habit.records !== 'object') {
            habit.records = {};
        }

        habit.records[dateStr] = { status: newStatus };
        Storage.saveUserData(data);
        renderHabitPage();

        if (typeof AppToast === 'function') {
            AppToast(newStatus === 'success'
                ? `Berhasil tercatat (${formatIndoDate(dateStr)})`
                : `Gagal tercatat (${formatIndoDate(dateStr)})`
            );
        }
    };

    window.setTodayHabitStatus = function (status) {
        if (!selectedHabitId) return;
        setHabitDayStatus(selectedHabitId, getTodayStr(), status);
    };

    window.handleCalendarCellClick = function (dateStr) {
        if (!selectedHabitId) return;
        const data = Storage.getUserData();
        const habit = (data.habits || []).find(h => String(h.id) === String(selectedHabitId));
        if (!habit) return;

        const todayStr = getTodayStr();
        const current = getEffectiveDayStatus(habit, dateStr, todayStr);

        if (current === 'success' || current === 'failed') {
            if (typeof AppToast === 'function') {
                AppToast('Status tanggal ini sudah permanen');
            }
            return;
        }

        if (current === 'pending' && typeof AppToast === 'function') {
            AppToast('Gunakan tombol Berhasil atau Gagal untuk cek-in hari ini');
        }
    };

    function renderCalendar(habit, todayStr) {
        const monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        document.getElementById('calMonthYearLabel').innerText = `${monthNames[viewMonth]} ${viewYear}`;

        const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const grid = document.getElementById('habitCalendarGrid');

        let html = '';
        for (let i = 0; i < firstDayOfWeek; i++) {
            html += `<div class="cal-day-cell empty"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = getEffectiveDayStatus(habit, dateStr, todayStr);
            const isToday = dateStr === todayStr;

            let cls = 'cal-day-cell';
            let clickAttr = '';

            if (status === 'before' || status === 'future') {
                cls += ' disabled';
            } else {
                clickAttr = `onclick="handleCalendarCellClick('${dateStr}')"`;
                if (isToday) cls += ' is-today';
                if (status === 'success') cls += ' status-success';
                else if (status === 'failed') cls += ' status-failed';
            }

            html += `<div class="${cls}" ${clickAttr}>${day}</div>`;
        }

        grid.innerHTML = html;
    }

    function renderHabitPage() {
        syncMissedDaysAsFailed();

        const data = Storage.getUserData();
        const habits = Array.isArray(data.habits) ? data.habits : [];
        const todayStr = getTodayStr();

        const emptyEl = document.getElementById('habitEmptyState');
        const contentEl = document.getElementById('habitTrackerContent');

        if (habits.length === 0) {
            emptyEl.style.display = 'block';
            contentEl.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        contentEl.style.display = 'block';

        if (!selectedHabitId || !habits.some(h => String(h.id) === String(selectedHabitId))) {
            selectedHabitId = String(habits[0].id);
        }

        const selectorList = document.getElementById('habitSelectorList');
        selectorList.innerHTML = habits.map(h => {
            const isActive = String(h.id) === String(selectedHabitId);
            return `
                <button type="button" class="habit-chip ${isActive ? 'active' : ''}" onclick="selectHabit('${h.id}')">
                    <span>${escapeHtml(h.icon || '🏃')}</span>
                    <span>${escapeHtml(h.name)}</span>
                </button>
            `;
        }).join('');

        const activeHabit = habits.find(h => String(h.id) === String(selectedHabitId));
        document.getElementById('activeHabitIcon').innerText = activeHabit.icon || '🏃';
        document.getElementById('activeHabitName').innerText = activeHabit.name;
        document.getElementById('activeHabitStart').innerText = `Mulai: ${formatIndoDate(activeHabit.startDate)}`;

        // Status hari ini (terkunci setelah dipilih)
        const todayStatus = getEffectiveDayStatus(activeHabit, todayStr, todayStr);
        const isLockedToday = todayStatus === 'success' || todayStatus === 'failed';
        const isBeforeStart = todayStatus === 'before';

        const badgeEl = document.getElementById('todayStatusBadge');
        const btnOk = document.getElementById('btnCheckSuccess');
        const btnFail = document.getElementById('btnCheckFailed');

        btnOk.classList.toggle('selected', todayStatus === 'success');
        btnFail.classList.toggle('selected', todayStatus === 'failed');
        btnOk.disabled = isLockedToday || isBeforeStart;
        btnFail.disabled = isLockedToday || isBeforeStart;

        if (todayStatus === 'success') {
            badgeEl.className = 'habit-status-pill success';
            badgeEl.innerText = '✅ Berhasil (Permanen)';
        } else if (todayStatus === 'failed') {
            badgeEl.className = 'habit-status-pill failed';
            badgeEl.innerText = '❌ Gagal (Permanen)';
        } else if (isBeforeStart) {
            badgeEl.className = 'habit-status-pill pending';
            badgeEl.innerText = '📅 Belum Dimulai';
        } else {
            badgeEl.className = 'habit-status-pill pending';
            badgeEl.innerText = '⏳ Belum Cek-in';
        }

        // Statistik
        const stats = calculateHabitStats(activeHabit, todayStr);
        document.getElementById('statSuccessCount').innerText = stats.success;
        document.getElementById('statFailedCount').innerText = stats.failed;
        document.getElementById('statConsistencyPct').innerText = `${stats.pct}%`;
        document.getElementById('statStreakCount').innerText = `${stats.streak}h`;

        // Kalender
        renderCalendar(activeHabit, todayStr);

        // Daftar cek-in cepat semua habit
        const quickList = document.getElementById('allHabitsQuickList');
        quickList.innerHTML = habits.map(h => {
            const st = getEffectiveDayStatus(h, todayStr, todayStr);
            const hStats = calculateHabitStats(h, todayStr);
            const canCheck = h.startDate <= todayStr;
            const isLocked = st === 'success' || st === 'failed';

            return `
                <div class="quick-habit-row">
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; cursor: pointer;" onclick="selectHabit('${h.id}')">
                        <span style="font-size: 20px;">${escapeHtml(h.icon || '🏃')}</span>
                        <div style="min-width: 0;">
                            <div style="font-size: 13px; font-weight: 700; color: var(--dark-grey); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${escapeHtml(h.name)}
                            </div>
                            <div style="font-size: 11px; color: var(--grey);">
                                ✅ ${hStats.success} • ❌ ${hStats.failed} (${hStats.pct}%)
                            </div>
                        </div>
                    </div>
                    ${canCheck ? `
                        <div style="display: flex; gap: 5px; flex-shrink: 0;">
                            <button type="button" class="quick-mini-btn ok ${st === 'success' ? 'active' : ''}" ${isLocked ? 'disabled' : `onclick="setHabitDayStatus('${h.id}', '${todayStr}', 'success')"`}>✔</button>
                            <button type="button" class="quick-mini-btn no ${st === 'failed' ? 'active' : ''}" ${isLocked ? 'disabled' : `onclick="setHabitDayStatus('${h.id}', '${todayStr}', 'failed')"`}>✕</button>
                        </div>
                    ` : `<span style="font-size: 11px; color: var(--grey);">Mulai ${formatIndoDate(h.startDate)}</span>`}
                </div>
            `;
        }).join('');
    }

    window.editCurrentHabit = function () {
        if (!selectedHabitId) return;
        const data = Storage.getUserData();
        const habit = (data.habits || []).find(h => String(h.id) === String(selectedHabitId));
        if (!habit) return;

        switchTabHabit('buat');
        document.getElementById('formTitleHabit').innerText = 'Edit Habit';
        document.getElementById('btnSubmitHabit').innerText = 'Simpan Perubahan';
        document.getElementById('btnCancelEditHabit').style.display = 'inline-flex';

        document.getElementById('habitId').value = habit.id;
        document.getElementById('habitName').value = habit.name;
        document.getElementById('habitIcon').value = habit.icon || '🏃';
        document.getElementById('habitStartDate').value = habit.startDate || getTodayStr();
    };

    window.cancelEditHabit = function () {
        document.getElementById('habitId').value = '';
        document.getElementById('formTitleHabit').innerText = 'Buat Habit Baru';
        document.getElementById('btnSubmitHabit').innerText = 'Simpan Habit';
        document.getElementById('btnCancelEditHabit').style.display = 'none';
        document.getElementById('habitForm').reset();
        document.getElementById('habitIcon').value = '🏃';
        document.getElementById('habitStartDate').value = getTodayStr();
    };

    window.deleteCurrentHabit = function () {
        if (!selectedHabitId) return;
        AppModal.show({
            title: 'Hapus Habit',
            message: 'Yakin ingin menghapus habit beserta seluruh riwayat kalendernya?',
            type: 'confirm',
            icon: '🗑️',
            danger: true,
            confirmText: 'Hapus',
            onConfirm: () => {
                const data = Storage.getUserData();
                data.habits = (data.habits || []).filter(h => String(h.id) !== String(selectedHabitId));
                Storage.saveUserData(data);
                selectedHabitId = null;
                renderHabitPage();
                if (typeof AppToast === 'function') AppToast('Habit dihapus');
            }
        });
    };

    document.addEventListener('DOMContentLoaded', () => {
        const habitForm = document.getElementById('habitForm');
        if (habitForm) {
            habitForm.addEventListener('submit', function (e) {
                e.preventDefault();
                const id = document.getElementById('habitId').value;
                const name = document.getElementById('habitName').value.trim();
                const icon = document.getElementById('habitIcon').value.trim() || '🏃';
                const startDate = document.getElementById('habitStartDate').value || getTodayStr();

                const data = Storage.getUserData();
                if (!Array.isArray(data.habits)) data.habits = [];

                if (id) {
                    const idx = data.habits.findIndex(h => String(h.id) === String(id));
                    if (idx !== -1) {
                        data.habits[idx].name = name;
                        data.habits[idx].icon = icon;
                        data.habits[idx].startDate = startDate;
                        delete data.habits[idx].color;
                        selectedHabitId = String(id);
                    }
                    cancelEditHabit();
                    if (typeof AppToast === 'function') AppToast('Habit diperbarui');
                } else {
                    const newId = 'habit_' + Date.now();
                    data.habits.push({
                        id: newId,
                        name: name,
                        icon: icon,
                        startDate: startDate,
                        records: {}
                    });
                    selectedHabitId = newId;
                    cancelEditHabit();
                    if (typeof AppToast === 'function') AppToast('Habit baru ditambahkan');
                }

                Storage.saveUserData(data);
                const startParts = startDate.split('-').map(Number);
                if (startParts.length === 3) {
                    viewYear = startParts[0];
                    viewMonth = startParts[1] - 1;
                }
                switchTabHabit('tracker');
            });
        }

        document.getElementById('habitStartDate').value = getTodayStr();
        renderHabitPage();
    });
})();
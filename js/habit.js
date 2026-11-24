let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDateStr = '';

window.switchTabHabit = function (tabName) {
    document.getElementById('tabTracker').classList.toggle('active', tabName === 'tracker');
    document.getElementById('tabTambah').classList.toggle('active', tabName === 'tambah');
    document.getElementById('btnTabTracker').classList.toggle('active', tabName === 'tracker');
    document.getElementById('btnTabTambah').classList.toggle('active', tabName === 'tambah');

    if (tabName === 'tracker') {
        loadHabitSelect();
    }
};

function loadHabitSelect() {
    const dataUser = Storage.getUserData();
    const habits = dataUser.habits || [];
    const select = document.getElementById('habitSelect');

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Pilih Habit --</option>';
    habits.forEach(h => {
        select.innerHTML += `<option value="${h.id}">${h.emoji} ${h.name}</option>`;
    });

    if (currentVal && habits.find(h => h.id === currentVal)) {
        select.value = currentVal;
    } else if (habits.length > 0) {
        select.value = habits[0].id;
    } else {
        select.value = '';
    }
    renderHabitData();
}

document.getElementById('habitForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const dataUser = Storage.getUserData();
    let habits = dataUser.habits || [];

    const newHabit = {
        id: 'hab_' + Date.now(),
        name: document.getElementById('habitName').value.trim(),
        emoji: document.getElementById('habitEmoji').value.trim() || '✅',
        color: document.getElementById('habitColor').value || '#16a34a',
        startDate: document.getElementById('habitStartDate').value,
        records: {}
    };

    habits.push(newHabit);
    dataUser.habits = habits;
    Storage.saveUserData(dataUser);

    AppToast('Habit baru ditambahkan');
    this.reset();
    document.getElementById('habitStartDate').value = getLocalTodayStr();

    switchTabHabit('tracker');
    document.getElementById('habitSelect').value = newHabit.id;
    renderHabitData();
});

window.renderHabitData = function () {
    const habitId = document.getElementById('habitSelect').value;
    const content = document.getElementById('habitContent');
    const emptyMsg = document.getElementById('emptyHabitMsg');

    if (!habitId) {
        content.style.display = 'none';
        emptyMsg.style.display = 'block';
        return;
    }

    content.style.display = 'block';
    emptyMsg.style.display = 'none';

    const dataUser = Storage.getUserData();
    const habit = dataUser.habits.find(h => h.id === habitId);
    const themeColor = habit.color || '#16a34a';

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    document.getElementById('monthYearLabel').innerText = `${monthNames[currentMonth]} ${currentYear}`;

    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        calendarDays.innerHTML += '<div></div>';
    }

    const todayStr = getLocalTodayStr();

    for (let i = 1; i <= daysInMonth; i++) {
        const m = String(currentMonth + 1).padStart(2, '0');
        const d = String(i).padStart(2, '0');
        const dateStr = `${currentYear}-${m}-${d}`;

        let statusClass = '';
        let customStyle = '';
        let innerHtml = i;

        const isBeforeStart = dateStr < habit.startDate;
        const isFuture = dateStr > todayStr;
        const isToday = dateStr === todayStr;

        if (habit.records && habit.records[dateStr]) {
            if (habit.records[dateStr].status === 'success') {
                statusClass = 'success';
                customStyle = `background-color: ${themeColor};`;
                innerHtml = habit.emoji;
            } else if (habit.records[dateStr].status === 'failed') {
                statusClass = 'failed';
                innerHtml = '❌';
            }
        }

        const disabledClass = (isBeforeStart || isFuture) ? 'disabled' : '';
        const todayClass = isToday ? 'today' : '';

        calendarDays.innerHTML += `
            <div class="cal-day ${statusClass} ${disabledClass} ${todayClass}"
                 style="${customStyle}"
                 onclick="openCheckIn('${dateStr}', ${isBeforeStart}, ${isFuture})">
                ${innerHtml}
            </div>
        `;
    }
    calculateStats(habit, themeColor);
};

window.changeMonth = function (step) {
    currentMonth += step;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderHabitData();
};

window.quickCheckInToday = function () {
    const habitId = document.getElementById('habitSelect').value;
    if (!habitId) return;
    const dataUser = Storage.getUserData();
    const habit = dataUser.habits.find(h => h.id === habitId);
    const todayStr = getLocalTodayStr();

    if (todayStr < habit.startDate) {
        AppModal.show({ title: 'Belum Dimulai', message: `Habit ini dijadwalkan mulai pada ${habit.startDate}.`, icon: '📅', type: 'alert' });
        return;
    }
    openCheckIn(todayStr, false, false);
};

window.openCheckIn = function (dateStr, isBeforeStart, isFuture) {
    if (isBeforeStart || isFuture) return;

    const dataUser = Storage.getUserData();
    const habitId = document.getElementById('habitSelect').value;
    const habit = dataUser.habits.find(h => h.id === habitId);

    selectedDateStr = dateStr;
    document.getElementById('modalTitle').innerText = `${habit.emoji} ${habit.name}`;
    document.getElementById('modalDesc').innerText = `Tanggal: ${dateStr}`;
    document.getElementById('reasonBox').style.display = 'none';
    document.getElementById('failReason').value = '';
    document.getElementById('checkInModal').classList.add('active');
};

window.closeModal = function () {
    document.getElementById('checkInModal').classList.remove('active');
};

window.showReasonInput = function () {
    document.getElementById('reasonBox').style.display = 'block';
};

window.submitCheckIn = function (status) {
    let reason = '';
    if (status === 'failed') {
        reason = document.getElementById('failReason').value.trim();
        if (!reason) {
            AppModal.show({ title: 'Alasan Diperlukan', message: 'Tuliskan alasan singkat agar bisa menjadi bahan evaluasi.', icon: '✍️', type: 'alert' });
            return;
        }
    }

    const dataUser = Storage.getUserData();
    const habitId = document.getElementById('habitSelect').value;
    const habitIndex = dataUser.habits.findIndex(h => h.id === habitId);

    if (!dataUser.habits[habitIndex].records) {
        dataUser.habits[habitIndex].records = {};
    }
    dataUser.habits[habitIndex].records[selectedDateStr] = { status, reason };

    Storage.saveUserData(dataUser);
    closeModal();
    renderHabitData();
    AppToast(status === 'success' ? 'Check-in berhasil!' : 'Catatan evaluasi disimpan');
};

window.clearCheckIn = function () {
    const dataUser = Storage.getUserData();
    const habitId = document.getElementById('habitSelect').value;
    const habitIndex = dataUser.habits.findIndex(h => h.id === habitId);
    if (habitIndex !== -1 && dataUser.habits[habitIndex].records) {
        delete dataUser.habits[habitIndex].records[selectedDateStr];
        Storage.saveUserData(dataUser);
    }
    closeModal();
    renderHabitData();
};

window.deleteCurrentHabit = function () {
    const habitId = document.getElementById('habitSelect').value;
    if (!habitId) return;

    AppModal.show({
        title: 'Hapus Habit',
        message: 'Yakin ingin menghapus habit ini beserta seluruh riwayat kalendernya?',
        type: 'confirm',
        icon: '🗑️',
        danger: true,
        confirmText: 'Ya, Hapus',
        onConfirm: () => {
            const dataUser = Storage.getUserData();
            dataUser.habits = dataUser.habits.filter(h => h.id !== habitId);
            Storage.saveUserData(dataUser);
            loadHabitSelect();
            AppToast('Habit dihapus');
        }
    });
};

function parseLocalYMD(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatLocalYMD(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function calculateStats(habit, themeColor) {
    const records = habit.records || {};
    const dates = Object.keys(records).sort();

    let bestStreak = 0;
    let tempStreak = 0;
    let prevSuccessDate = null;
    let successCount = 0;
    let failedCount = 0;
    let historyHtml = '';

    dates.forEach(dateStr => {
        const rec = records[dateStr];
        const [recYear, recMonth] = dateStr.split('-').map(Number);

        if (rec.status === 'success') {
            successCount++;
            const curDate = parseLocalYMD(dateStr);
            if (prevSuccessDate) {
                const diffDays = Math.round((curDate - prevSuccessDate) / 86400000);
                tempStreak = (diffDays === 1) ? tempStreak + 1 : 1;
            } else {
                tempStreak = 1;
            }
            prevSuccessDate = curDate;
            if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
            failedCount++;
            tempStreak = 0;
            prevSuccessDate = null;
        }

        if ((recMonth - 1) === currentMonth && recYear === currentYear) {
            historyHtml = `
                <div class="list-item">
                    <div>
                        <h4 style="font-size: 13px;">${dateStr}</h4>
                        ${rec.status === 'failed' ? `<p style="font-size: 12px; color: var(--danger);">Alasan: ${rec.reason}</p>` : ''}
                    </div>
                    <div style="font-weight: 700; font-size: 13px;">
                        ${rec.status === 'success' ? '✅ Berhasil' : '❌ Gagal'}
                    </div>
                </div>
            ` + historyHtml;
        }
    });

    // Hitung Current Streak secara akurat mundur dari hari ini / kemarin
    let currentStreak = 0;
    const todayStr = getLocalTodayStr();
    const yesterdayObj = parseLocalYMD(todayStr);
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = formatLocalYMD(yesterdayObj);

    let pointerStr = todayStr;
    if (!records[pointerStr] || records[pointerStr].status !== 'success') {
        if (records[pointerStr] && records[pointerStr].status === 'failed') {
            pointerStr = null;
        } else {
            pointerStr = yesterdayStr;
        }
    }

    if (pointerStr && records[pointerStr] && records[pointerStr].status === 'success') {
        let cursor = parseLocalYMD(pointerStr);
        while (true) {
            const key = formatLocalYMD(cursor);
            if (records[key] && records[key].status === 'success') {
                currentStreak++;
                cursor.setDate(cursor.getDate() - 1);
            } else {
                break;
            }
        }
    }

    document.getElementById('currentStreak').innerText = currentStreak;
    document.getElementById('bestStreak').innerText = bestStreak;
    document.getElementById('statSuccess').innerText = successCount;
    document.getElementById('statFailed').innerText = failedCount;

    const totalFills = successCount + failedCount;
    const percent = totalFills === 0 ? 0 : (successCount / totalFills) * 100;

    const bar = document.getElementById('statProgressBar');
    bar.style.width = `${percent}%`;
    bar.style.backgroundColor = themeColor;
    document.getElementById('statPercent').innerText = `${percent.toFixed(0)}% Konsisten`;
    document.getElementById('historyList').innerHTML = historyHtml || '<p class="text-center" style="font-size:12px; color:var(--grey);">Belum ada riwayat check-in bulan ini.</p>';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('habitStartDate').value = getLocalTodayStr();
    loadHabitSelect();
});
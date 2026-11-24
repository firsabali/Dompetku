document.addEventListener('DOMContentLoaded', () => {
    const user = Storage.getCurrentUser();
    if (!user) return;

    document.getElementById('userName').innerText = user.name;
    document.getElementById('userEmail').innerText = user.email;
    document.getElementById('userAvatar').innerText = user.name.charAt(0).toUpperCase();

    const data = Storage.getUserData();
    const statsGrid = document.getElementById('accountStatsGrid');
    const items = [
        { label: 'Transaksi', count: data.transactions.length },
        { label: 'Aktivitas', count: data.activities.length },
        { label: 'Kebutuhan', count: data.needs.length },
        { label: 'Target', count: data.wishlists.length },
        { label: 'Habit', count: data.habits.length }
    ];

    statsGrid.innerHTML = items.map(i => `
        <div style="background: var(--bg-app); padding: 10px 6px; border-radius: 10px;">
            <div style="font-size: 16px; font-weight: 700; color: var(--primary-blue);">${i.count}</div>
            <div style="font-size: 11px; color: var(--grey);">${i.label}</div>
        </div>
    `).join('');

    document.getElementById('importFile').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const importedData = JSON.parse(event.target.result);
                if (importedData && Array.isArray(importedData.transactions)) {
                    AppModal.show({
                        title: 'Pulihkan Data Backup?',
                        message: 'Data saat ini akan digantikan dengan data dari berkas backup JSON.',
                        type: 'confirm',
                        icon: '⬆️',
                        confirmText: 'Ya, Pulihkan',
                        onConfirm: () => {
                            Storage.saveUserData({
                                transactions: importedData.transactions || [],
                                wishlists: importedData.wishlists || [],
                                habits: importedData.habits || [],
                                activities: importedData.activities || [],
                                needs: importedData.needs || []
                            });
                            AppModal.show({
                                title: 'Berhasil Dipulihkan',
                                message: 'Seluruh data berhasil dimuat kembali.',
                                icon: '✅',
                                type: 'alert',
                                onConfirm: () => window.location.reload()
                            });
                        }
                    });
                } else {
                    AppModal.show({ title: 'Berkas Tidak Valid', message: 'Pastikan Anda memilih berkas backup DompetKu yang benar.', icon: '❌', type: 'alert' });
                }
            } catch (error) {
                AppModal.show({ title: 'Gagal Membaca Berkas', message: 'Berkas rusak atau bukan format JSON.', icon: '⚠️', type: 'alert' });
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });
});

window.installFromProfile = function () {
    PWAInstaller.install();
};

window.exportData = function () {
    const data = Storage.getUserData();
    const dataString = JSON.stringify(data, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = `backup_dompetku_${getLocalTodayStr()}.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    AppToast('Berkas backup diunduh');
};

window.resetData = function () {
    AppModal.show({
        title: 'Reset Seluruh Data?',
        message: 'Semua catatan keuangan, aktivitas, kebutuhan, target, dan habit akan dihapus permanen.\n\nAkun login Anda tetap tersimpan.',
        type: 'confirm',
        icon: '⚠️',
        danger: true,
        confirmText: 'Ya, Reset Semua',
        onConfirm: () => {
            Storage.saveUserData({
                transactions: [],
                wishlists: [],
                habits: [],
                activities: [],
                needs: []
            });
            AppModal.show({
                title: 'Data Direset',
                message: 'Seluruh data catatan berhasil dikosongkan.',
                icon: '✅',
                type: 'alert',
                onConfirm: () => window.location.reload()
            });
        }
    });
};

window.confirmLogout = function () {
    AppModal.show({
        title: 'Keluar Akun',
        message: 'Apakah Anda ingin keluar dari sesi saat ini?',
        type: 'confirm',
        icon: '🚪',
        danger: true,
        confirmText: 'Keluar',
        onConfirm: () => Storage.logout()
    });
};
// js/profile.js

document.addEventListener('DOMContentLoaded', () => {
    const user = Storage.getCurrentUser();
    if (!user) return; // Proteksi halaman sudah diurus di storage.js

    // Tampilkan Data Profil
    document.getElementById('userName').innerText = user.name;
    document.getElementById('userEmail').innerText = user.email;
    document.getElementById('userAvatar').innerText = user.name.charAt(0).toUpperCase();

    // Event Listener untuk Import File JSON
    document.getElementById('importFile').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                // Parse isi file menjadi objek JSON
                const importedData = JSON.parse(event.target.result);

                // Validasi sederhana: Pastikan ada property transactions & wishlists
                if (importedData.hasOwnProperty('transactions') && importedData.hasOwnProperty('wishlists')) {

                    if (confirm('Yakin ingin menimpa data saat ini dengan data dari file backup?')) {
                        // Simpan ke LocalStorage
                        Storage.saveUserData(importedData);
                        alert('Data berhasil dipulihkan (Restore Sukses)!');
                        window.location.reload(); // Refresh halaman agar data baru termuat
                    }
                } else {
                    alert('Format file JSON tidak valid. Pastikan Anda mengupload file backup DompetKu yang benar.');
                }
            } catch (error) {
                alert('Terjadi kesalahan saat membaca file. File mungkin rusak atau bukan format JSON.');
            }
        };
        // Mulai membaca file
        reader.readAsText(file);

        // Reset input agar bisa pilih file yang sama dua kali jika perlu
        e.target.value = '';
    });
});

// Fungsi Export Data JSON (Download)
window.exportData = function () {
    const data = Storage.getUserData();

    // Ubah objek Javascript menjadi String JSON yang rapi
    const dataString = JSON.stringify(data, null, 2);

    // Buat Blob (file) dari string tersebut
    const blob = new window.Blob([dataString], { type: 'application/json' });

    // Buat URL sementara untuk di-download
    const url = URL.createObjectURL(blob);

    // Format nama file: backup_dompetku_YYYY-MM-DD.json
    const date = new Date().toISOString().split('T')[0];
    const filename = `backup_dompetku_${date}.json`;

    // Buat elemen <a> bohongan untuk trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Bersihkan kembali elemen dan URL sementara
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Fungsi Reset Data
window.resetData = function () {
    if (confirm('⚠️ PERINGATAN! Apakah Anda benar-benar yakin ingin menghapus SEMUA data Transaksi dan Wishlist?\n\nData tidak dapat dikembalikan kecuali Anda punya file Backup.')) {

        // Kosongkan array
        const emptyData = {
            transactions: [],
            wishlists: []
        };

        Storage.saveUserData(emptyData);
        alert('Seluruh data berhasil dihapus!');
        window.location.reload();
    }
};
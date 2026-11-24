window.getLoginUrl = function () {
    return window.location.protocol === 'file:' ? 'index.html' : './';
};

const Storage = {
    USERS_KEY: 'dompetku_users',
    CURRENT_USER_KEY: 'dompetku_current_user',
    LOGGED_OUT_FLAG: 'dompetku_logged_out',

    getUsers: function () {
        const users = localStorage.getItem(this.USERS_KEY);
        return users ? JSON.parse(users) : [];
    },

    saveUsers: function (users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    getCurrentUser: function () {
        const email = localStorage.getItem(this.CURRENT_USER_KEY);
        if (!email) return null;
        const users = this.getUsers();
        return users.find(u => u.email === email) || null;
    },

    login: function (email) {
        sessionStorage.removeItem(this.LOGGED_OUT_FLAG);
        localStorage.setItem(this.CURRENT_USER_KEY, email);
    },

    logout: function () {
        localStorage.removeItem(this.CURRENT_USER_KEY);
        sessionStorage.setItem(this.LOGGED_OUT_FLAG, '1');
        window.location.replace(getLoginUrl());
    },

    getUserData: function () {
        const user = this.getCurrentUser();
        const raw = (user && user.data) ? user.data : {};
        return {
            transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
            wishlists: Array.isArray(raw.wishlists) ? raw.wishlists : [],
            habits: Array.isArray(raw.habits) ? raw.habits : [],
            activities: Array.isArray(raw.activities) ? raw.activities : [],
            needs: Array.isArray(raw.needs) ? raw.needs : []
        };
    },

    saveUserData: function (data) {
        const currentUserEmail = localStorage.getItem(this.CURRENT_USER_KEY);
        let users = this.getUsers();
        const userIndex = users.findIndex(u => u.email === currentUserEmail);

        if (userIndex !== -1) {
            users[userIndex].data = {
                transactions: data.transactions || [],
                wishlists: data.wishlists || [],
                habits: data.habits || [],
                activities: data.activities || [],
                needs: data.needs || []
            };
            this.saveUsers(users);
        }
    }
};

function getCleanPageName() {
    const rawPage = window.location.pathname.split('/').pop().toLowerCase();
    return rawPage.replace(/\.html$/, '');
}

function checkAuth() {
    const cleanPage = getCleanPageName();
    const isAuthPage = cleanPage === '' || cleanPage === 'index' || cleanPage === 'register';
    const user = Storage.getCurrentUser();

    if (!user && !isAuthPage) {
        document.documentElement.style.visibility = 'hidden';
        window.location.replace(getLoginUrl());
    } else if (user && isAuthPage) {
        document.documentElement.style.visibility = 'hidden';
        window.location.replace('dashboard.html');
    } else {
        document.documentElement.style.visibility = '';
    }
}
checkAuth();

// Mencegah halaman lama terbuka kembali lewat tombol Kembali atau cache memori HP setelah logout
window.addEventListener('pageshow', () => {
    checkAuth();
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        checkAuth();
    }
});

(function preventBackAfterLogout() {
    const cleanPage = getCleanPageName();
    const isLoginPage = cleanPage === '' || cleanPage === 'index';
    if (isLoginPage && !Storage.getCurrentUser() && sessionStorage.getItem(Storage.LOGGED_OUT_FLAG) === '1') {
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', () => {
            if (!Storage.getCurrentUser() && sessionStorage.getItem(Storage.LOGGED_OUT_FLAG) === '1') {
                window.history.pushState(null, '', window.location.href);
                if (typeof AppToast === 'function') {
                    AppToast('Anda sudah keluar dari akun');
                }
            }
        });
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const user = Storage.getCurrentUser();
    const avatarEl = document.getElementById('headerAvatar');
    if (user && avatarEl) {
        avatarEl.innerText = user.name.charAt(0).toUpperCase();
    }
});

window.getLocalTodayStr = function () {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

window.AppModal = {
    init: function () {
        if (document.getElementById('appModalOverlay')) return;
        const html = `
            <div class="app-modal-overlay" id="appModalOverlay">
                <div class="app-modal-box">
                    <div class="app-modal-icon" id="appModalIcon">ℹ️</div>
                    <div class="app-modal-title" id="appModalTitle">Pemberitahuan</div>
                    <div class="app-modal-message" id="appModalMessage">Pesan</div>
                    <div class="app-modal-actions">
                        <button class="app-modal-btn app-modal-btn-cancel" id="appModalBtnCancel">Batal</button>
                        <button class="app-modal-btn" id="appModalBtnConfirm">OK</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },
    show: function (options) {
        this.init();
        const overlay = document.getElementById('appModalOverlay');
        const btnCancel = document.getElementById('appModalBtnCancel');
        const btnConfirm = document.getElementById('appModalBtnConfirm');

        document.getElementById('appModalTitle').innerText = options.title || 'Pemberitahuan';
        document.getElementById('appModalMessage').innerText = options.message || '';
        document.getElementById('appModalIcon').innerText = options.icon || 'ℹ️';

        const newBtnCancel = btnCancel.cloneNode(true);
        const newBtnConfirm = btnConfirm.cloneNode(true);
        btnCancel.replaceWith(newBtnCancel);
        btnConfirm.replaceWith(newBtnConfirm);

        if (options.type === 'confirm') {
            newBtnCancel.style.display = 'block';
            newBtnCancel.innerText = options.cancelText || 'Batal';
            newBtnConfirm.className = 'app-modal-btn ' + (options.danger ? 'app-modal-btn-danger' : 'app-modal-btn-confirm');
            newBtnConfirm.innerText = options.confirmText || 'Ya, Lanjutkan';
        } else {
            newBtnCancel.style.display = 'none';
            newBtnConfirm.className = 'app-modal-btn app-modal-btn-confirm';
            newBtnConfirm.innerText = options.confirmText || 'OK';
        }

        overlay.classList.add('show');

        newBtnCancel.addEventListener('click', () => {
            overlay.classList.remove('show');
            if (options.onCancel) options.onCancel();
        });

        newBtnConfirm.addEventListener('click', () => {
            overlay.classList.remove('show');
            if (options.onConfirm) options.onConfirm();
        });
    }
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

window.AppToast = function (msg) {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.className = 'app-toast';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => reg.update()).catch(() => { });
    });
}

window.PWAInstaller = {
    deferredPrompt: null,
    init: function () {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            const banner = document.getElementById('installBanner');
            if (banner) banner.style.display = 'flex';
        });
    },
    install: async function () {
        if (!this.deferredPrompt) {
            AppModal.show({
                title: 'Cara Pasang ke HP',
                message: '1. Buka menu titik tiga (⋮) di Chrome atau ikon Bagikan di Safari.\n2. Pilih "Tambahkan ke Layar Utama".\n3. Aplikasi akan terpasang di HP Anda.',
                icon: '📲',
                type: 'alert'
            });
            return;
        }
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            this.deferredPrompt = null;
            const banner = document.getElementById('installBanner');
            if (banner) banner.style.display = 'none';
        }
    }
};
PWAInstaller.init();
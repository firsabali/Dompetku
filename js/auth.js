window.togglePassword = function (inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerText = '🙈';
    } else {
        input.type = 'password';
        btn.innerText = '👁️';
    }
};

function generateSalt() {
    if (window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint8Array(16);
        window.crypto.getRandomValues(arr);
        return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function sha256Fallback(str) {
    const bytes = new TextEncoder().encode(str);
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const bitLen = bytes.length * 8;
    const totalLen = (((bytes.length + 8) >> 6) + 1) * 64;
    const buf = new Uint8Array(totalLen);
    buf.set(bytes);
    buf[bytes.length] = 0x80;
    const view = new DataView(buf.buffer);
    view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
    view.setUint32(totalLen - 4, bitLen >>> 0, false);

    const rotr = (n, x) => (x >>> n) | (x << (32 - n));
    const W = new Uint32Array(64);

    for (let offset = 0; offset < totalLen; offset += 64) {
        for (let i = 0; i < 16; i++) W[i] = view.getUint32(offset + i * 4, false);
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(7, W[i - 15]) ^ rotr(18, W[i - 15]) ^ (W[i - 15] >>> 3);
            const s1 = rotr(17, W[i - 2]) ^ rotr(19, W[i - 2]) ^ (W[i - 2] >>> 10);
            W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
        }
        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
            const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) >>> 0;
            h = g; g = f; f = e; e = (d + temp1) >>> 0;
            d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
        }
        H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
        H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
        H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(v => v.toString(16).padStart(8, '0')).join('');
}

async function hashPassword(password, salt = '') {
    const payload = `${salt}:${password}`;
    if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(payload);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return sha256Fallback(payload);
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim().toLowerCase();
            const password = document.getElementById('password').value;

            let users = Storage.getUsers();
            if (users.find(u => u.email.toLowerCase() === email)) {
                AppModal.show({
                    title: 'Email Terdaftar',
                    message: 'Email ini sudah digunakan. Silakan masuk.',
                    type: 'alert',
                    icon: '❌'
                });
                return;
            }

            const salt = generateSalt();
            const passwordHash = await hashPassword(password, salt);

            const newUser = {
                name: name,
                email: email,
                salt: salt,
                passwordHash: passwordHash,
                data: {
                    transactions: [],
                    wishlists: [],
                    habits: [],
                    activities: [],
                    needs: []
                }
            };

            users.push(newUser);
            Storage.saveUsers(users);

            const targetLogin = typeof getLoginUrl === 'function' ? getLoginUrl() : './';
            AppModal.show({
                title: 'Pendaftaran Berhasil',
                message: 'Akun Anda telah dibuat dengan enkripsi SHA-256. Silakan masuk sekarang.',
                type: 'alert',
                icon: '✅',
                onConfirm: () => {
                    window.location.href = targetLogin;
                }
            });
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = document.getElementById('email').value.trim().toLowerCase();
            const password = document.getElementById('password').value;
            const users = Storage.getUsers();
            const userIndex = users.findIndex(u => u.email.toLowerCase() === email);

            if (userIndex === -1) {
                AppModal.show({
                    title: 'Gagal Masuk',
                    message: 'Email atau password tidak sesuai.',
                    type: 'alert',
                    icon: '🔒'
                });
                return;
            }

            const user = users[userIndex];
            let isValid = false;

            if (user.passwordHash) {
                const inputHash = await hashPassword(password, user.salt || '');
                isValid = inputHash === user.passwordHash;
            } else if (user.password) {
                isValid = user.password === password;
                if (isValid) {
                    const newSalt = generateSalt();
                    users[userIndex].salt = newSalt;
                    users[userIndex].passwordHash = await hashPassword(password, newSalt);
                    delete users[userIndex].password;
                    Storage.saveUsers(users);
                }
            }

            if (isValid) {
                Storage.login(user.email);
                window.location.href = 'dashboard.html';
            } else {
                AppModal.show({
                    title: 'Gagal Masuk',
                    message: 'Email atau password tidak sesuai.',
                    type: 'alert',
                    icon: '🔒'
                });
            }
        });
    }
});
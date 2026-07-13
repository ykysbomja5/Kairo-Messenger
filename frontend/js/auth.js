async function updateProfileOnServer({ name, avatar }) {
    if (!authToken) throw new Error('Not authenticated');
    const payload = {};
    if (name) payload.name = name;
    if (avatar) payload.avatar = avatar;
    const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        let msg = 'Failed to update profile';
        try {
            const j = await res.json();
            if (j && j.error) msg = j.error;
        } catch (_) { }
        throw new Error(msg);
    }
    return true;
}




(function setupDynamicVH() {
    const docEl = document.documentElement;
    function setVH(px) { docEl.style.setProperty('--vh', (px / 100) + 'px'); }
    function recalc() {
        if (window.visualViewport) setVH(window.visualViewport.height);
        else setVH(window.innerHeight);
    }
    window.addEventListener('resize', recalc, { passive: true });
    window.addEventListener('orientationchange', recalc);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', recalc);
        window.visualViewport.addEventListener('scroll', recalc);
    }
    document.addEventListener('DOMContentLoaded', recalc);
    recalc();
})();


function updateProfileDisplay() {
    if (!currentUser) return;


    document.getElementById('profile-name').textContent = currentUser.email || 'N/A';
    document.getElementById('profile-email').textContent = currentUser.email || 'N/A';
    document.getElementById('profile-phone').textContent = currentUser.phone || 'Not set';
    document.getElementById('profile-status').textContent = currentUser.status || 'Online';

    const regDate = currentUser.regDate ? new Date(currentUser.regDate) : new Date();
    document.getElementById('profile-reg-date').textContent = regDate.toLocaleDateString();

    if (currentUser.avatar) {
        profileAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="Profile">`;
    } else {
        profileAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }


    document.getElementById('edit-name').value = currentUser.email || '';
    document.getElementById('edit-phone').value = currentUser.phone || '';
    document.getElementById('edit-status').value = currentUser.status || 'Online';
}



function initAuthEventListeners() {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleRegister();
    });

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });


    registerAvatarContainer.addEventListener('click', () => {
        registerAvatarInput.click();
    });

    registerAvatarInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                registrationAvatarUrl = event.target.result;
                registerAvatarPreview.innerHTML = `<img src="${registrationAvatarUrl}" alt="Avatar Preview">`;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}


function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, avatar: registrationAvatarUrl })
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Login failed') });
            }
            return response.json();
        })
        .then(async data => {
            if (data.token && data.user) {
                authToken = data.token;
                currentUser = data.user;
                myUserId = data.user.id;
                try { localStorage.setItem('kairotoken', data.token); localStorage.setItem('kairouser', JSON.stringify(data.user)); } catch (e) { console.warn('localStorage unavailable'); }


                if (registrationAvatarUrl && typeof registrationAvatarUrl === 'string' && registrationAvatarUrl.startsWith('data:')) {
                    try {
                        await updateProfileOnServer({ name: (data && data.user && data.user.email) ? data.user.email : email, avatar: registrationAvatarUrl });
                        registrationAvatarUrl = null;
                    } catch (e) {
                        console.warn('Avatar upload failed:', e);
                    }
                }
                initApp();
                if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            } else {
                alert('Login failed: Invalid data from server');
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            alert(`Login failed: ${error.message}`);
        });
}

function handleLogout() {
    try {
        localStorage.removeItem('kairotoken');
        localStorage.removeItem('kairouser');
    } catch (e) { }
    authToken = null;
    currentUser = { email: null, avatar: null, phone: null, status: 'Online', regDate: null };
    myUserId = null;
    if (typeof chatsList !== 'undefined') chatsList.innerHTML = '';
    if (typeof messagesContainer !== 'undefined') messagesContainer.innerHTML = '';
    if (typeof appContainer !== 'undefined') appContainer.style.display = 'none';
    if (typeof authModal !== 'undefined') {
        authModal.classList.add('active');
        const loginEmail = document.getElementById('login-email');
        const loginPassword = document.getElementById('login-password');
        if (loginEmail) loginEmail.value = '';
        if (loginPassword) loginPassword.value = '';
    }
}

function handleRegister() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!registrationAvatarUrl) {
        alert('Please select a profile avatar to register.');
        return;
    }

    fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(async response => {
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Registration failed');
        }
        return response.json();
    })
    .then(async data => {
        try {
            const loginRes = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, avatar: registrationAvatarUrl })
            });
            if (loginRes.ok) {
                const loginData = await loginRes.json();
                if (loginData.token) {
                    authToken = loginData.token;
                    currentUser = loginData.user;
                    myUserId = loginData.user.id;
                    try { localStorage.setItem('kairotoken', authToken); localStorage.setItem('kairouser', JSON.stringify(loginData.user)); } catch (e) { }
                    initApp();
                    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                        Notification.requestPermission();
                    }
                    return;
                }
            }
        } catch (e) {}
        alert('Registration successful. Please login.');
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    })
    .catch(error => alert(`Registration error: ${error.message}`));
}

function bindAuthSwitchLinks() {
    const registerLink = document.getElementById('show-register');
    const loginLink = document.getElementById('show-login');
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        });
    }
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }
}


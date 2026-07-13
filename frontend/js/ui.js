function applyMobileInitialLayout() {
    if (window.innerWidth <= 768) {

        sidebar.classList.add('active');
        sidebar.style.display = 'flex';
        if (mainContentEl) mainContentEl.classList.remove('active');
        mainContentEl.style.display = 'none';
    } else {

        sidebar.classList.add('active');
        sidebar.style.display = 'flex';
        if (mainContentEl) mainContentEl.classList.add('active');
    }
}
window.addEventListener('load', applyMobileInitialLayout);
window.addEventListener('resize', applyMobileInitialLayout);



const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const registerAvatarContainer = document.getElementById('register-avatar-container');
const registerAvatarPreview = document.getElementById('register-avatar-preview');
const registerAvatarInput = document.getElementById('register-avatar-input');


const settingsPage = document.getElementById('settings-page');
const contactsPage = document.getElementById('contacts-page');
const callsPage = document.getElementById('calls-page');
const profilePage = document.getElementById('profile-page');
const privacyPage = document.getElementById('privacy-page');
const securityPage = document.getElementById('security-page');
const storagePage = document.getElementById('storage-page');
const aboutPage = document.getElementById('about-page');
const contactProfilePage = document.getElementById('contact-profile-page');


const settingsBtn = document.getElementById('settings-btn');
const contactsBtn = document.getElementById('contacts-btn');
const callsBtn = document.getElementById('calls-btn');
const profileBtn = document.getElementById('profile-btn');
const privacyBtn = document.getElementById('privacy-btn');
const securityBtn = document.getElementById('security-btn');
const storageBtn = document.getElementById('storage-btn');
const aboutBtn = document.getElementById('about-btn');

const backFromSettings = document.getElementById('back-from-settings');
const backFromContacts = document.getElementById('back-from-contacts');
const backFromCalls = document.getElementById('back-from-calls');
const backFromProfile = document.getElementById('back-from-profile');
const backFromPrivacy = document.getElementById('back-from-privacy');
const backFromSecurity = document.getElementById('back-from-security');
const backFromStorage = document.getElementById('back-from-storage');
const backFromAbout = document.getElementById('back-from-about');
const backFromContactProfile = document.getElementById('back-from-contact-profile');

const editAvatarBtn = document.getElementById('edit-avatar');
const changeAvatarBtn = document.getElementById('change-avatar-btn');
const editProfileBtn = document.getElementById('edit-profile-btn');
const editForm = document.getElementById('edit-form');
const saveProfileBtn = document.getElementById('save-profile');
const cancelEditBtn = document.getElementById('cancel-edit');


const callContainer = document.getElementById('call-container');
const callName = document.getElementById('call-name');
const callAvatar = document.getElementById('call-avatar');
const callStatus = document.getElementById('call-status');
const callAnswer = document.getElementById('call-answer');
const callDecline = document.getElementById('call-decline');

function onDOMLoaded() {
    try {

        try {
            const savedToken = (typeof localStorage !== 'undefined') ? localStorage.getItem('kairotoken') : null;
            const savedUser = (typeof localStorage !== 'undefined') ? localStorage.getItem('kairouser') : null;
            if (savedToken) {
                authToken = savedToken;
                if (savedUser) {
                    try { currentUser = JSON.parse(savedUser); myUserId = currentUser && currentUser.id; } catch (_) { }
                }

                if (typeof splashScreen !== 'undefined' && splashScreen) splashScreen.style.display = 'none';
                if (typeof authModal !== 'undefined' && authModal) authModal.classList.remove('active');

                const __API = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE : '';
                fetch(`${__API}/api/profile`, { headers: { 'Authorization': `Bearer ${authToken}` } })
                    .then(r => r.ok ? r.json() : Promise.reject(new Error('Profile fetch failed')))
                    .then(profile => { currentUser = profile || currentUser; if (profile && profile.id) myUserId = profile.id; initApp(); })
                    .catch(() => { initApp(); });
                return;
            }
        } catch (e) { console.warn('Cannot read localStorage', e); }


        setTimeout(() => {
            try {
                if (typeof splashScreen !== 'undefined' && splashScreen) splashScreen.style.display = 'none';
                if (typeof authModal !== 'undefined' && authModal) authModal.classList.add('active');
            } catch (e) { console.warn('Splash/auth show failed', e); }
        }, 1200);


        setTimeout(() => {
            try {
                const stillVisible = (typeof splashScreen !== 'undefined' && splashScreen && splashScreen.style.display !== 'none');
                if (stillVisible) {
                    splashScreen.style.display = 'none';
                    if (typeof authModal !== 'undefined' && authModal) authModal.classList.add('active');
                }
            } catch (e) { }
        }, 4000);


        if (typeof initAuthEventListeners === 'function') initAuthEventListeners();
    } catch (err) {

        try {
            if (typeof splashScreen !== 'undefined' && splashScreen) splashScreen.style.display = 'none';
            if (typeof authModal !== 'undefined' && authModal) authModal.classList.add('active');
        } catch (_) { }
        console.error('onDOMLoaded crashed:', err);
    }
}





async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const duration = formatDuration((Date.now() - recordingStartTime) / 1000);
            
            stream.getTracks().forEach(track => track.stop());
            stopWaveAnimation();
            
            if (!currentChatId) return;
            
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                const base64data = reader.result;
                const messagePayload = {
                    conversation_id: currentChatId,
                    content: base64data,
                    type: 'voice'
                };
                
                fetch(`${API_BASE}/api/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify(messagePayload)
                }).catch(e => console.error("Error sending voice:", e));
            };
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();
        startRecordingTimer();
        startWaveAnimation();

        voiceBtn.innerHTML = '<i class="fas fa-square"></i>';
        voiceBtn.style.color = 'var(--accent-color)';
        isRecording = true;
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Failed to access microphone. Please check permissions.');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }

    clearInterval(recordingTimer);

    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceBtn.style.color = 'var(--text-primary)';
    isRecording = false;
}

function startRecordingTimer() {
    const timerDisplay = document.createElement('div');
    timerDisplay.className = 'recording-indicator';
    timerDisplay.innerHTML = `<div class="recording-dot"></div><div class="recording-timer">00:00</div>`;
    document.querySelector('.message-input-container').appendChild(timerDisplay);

    recordingTimer = setInterval(() => {
        const seconds = Math.floor((Date.now() - recordingStartTime) / 1000);
        timerDisplay.querySelector('.recording-timer').textContent = formatDuration(seconds);
    }, 1000);
}

function startWaveAnimation() { }
function stopWaveAnimation() {
    const indicator = document.querySelector('.recording-indicator');
    if (indicator) indicator.remove();
}


function playAudio(audioUrl) {
    if (currentAudio) {
        currentAudio.pause();
    }
    currentAudio = new Audio(audioUrl);
    currentAudio.play();

    const playBtn = document.querySelector(`.voice-play-btn[data-audio="${audioUrl}"]`);
    if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        currentAudio.onended = () => playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}


function applyTheme(theme) {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-theme', isLight);
    if (themeToggle) themeToggle.checked = isLight;
    try { localStorage.setItem('kairoTheme', isLight ? 'light' : 'dark'); } catch (e) { }
}

function closeAllPages() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
}


function initEventListeners() {
    if (menuBtn && dropdownMenu) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (menuBtn && dropdownMenu && !menuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('active');
        }
    });

    backBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.style.display = 'flex';
        }
        sidebar.classList.add('active');
        sidebar.style.display = 'flex';
        if (mainContentEl) {
            mainContentEl.classList.remove('active');
            mainContentEl.style.display = 'none';
            if (window.innerWidth <= 768) {
                mainContentEl.style.display = 'none';
            }
        }
    });

    homeLogo.addEventListener('click', () => {
        closeAllPages();
        sidebar.classList.add('active');
        sidebar.style.display = 'flex';
    });

    sendBtn.addEventListener('click', sendMessage);

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    voiceBtn.addEventListener('click', () => {
        isRecording ? stopRecording() : startRecording();
    });

    attachmentBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) sendImage(e.target.files[0]);
    });



    searchInput.addEventListener('input', (e) => searchChats(e.target.value));


    settingsBtn.addEventListener('click', () => { settingsPage.classList.add('active'); dropdownMenu.classList.remove('active'); });
    contactsBtn.addEventListener('click', () => { contactsPage.classList.add('active'); dropdownMenu.classList.remove('active'); });
    callsBtn.addEventListener('click', () => { callsPage.classList.add('active'); dropdownMenu.classList.remove('active'); });
    profileBtn.addEventListener('click', () => { updateProfileDisplay(); profilePage.classList.add('active'); dropdownMenu.classList.remove('active'); });


    backFromSettings.addEventListener('click', () => settingsPage.classList.remove('active'));
    backFromContacts.addEventListener('click', () => contactsPage.classList.remove('active'));
    backFromCalls.addEventListener('click', () => callsPage.classList.remove('active'));
    backFromProfile.addEventListener('click', () => profilePage.classList.remove('active'));
    backFromContactProfile.addEventListener('click', () => contactProfilePage.classList.remove('active'));


    audioCallBtn.addEventListener('click', () => startCall('audio'));
    videoCallBtn.addEventListener('click', () => startCall('video'));



    messagesContainer.addEventListener('click', (e) => {
        const playBtn = e.target.closest('.voice-play-btn');
        if (playBtn) playAudio(playBtn.dataset.audio);
    });


    editAvatarBtn.addEventListener('click', () => avatarInput.click());
    changeAvatarBtn.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = () => {
                currentUser.avatar = reader.result;
                updateProfileDisplay();
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    editProfileBtn.addEventListener('click', () => {
        updateProfileDisplay();
        editForm.classList.add('active');
    });

    saveProfileBtn.addEventListener('click', () => {
        currentUser.phone = document.getElementById('edit-phone').value;
        currentUser.status = document.getElementById('edit-status').value;
        updateProfileDisplay();
        editForm.classList.remove('active');


        (async () => {
            try {
                await updateProfileOnServer({
                    name: document.getElementById('edit-name').value || (currentUser && currentUser.email),
                    avatar: currentUser && currentUser.avatar
                });

                const resp = await fetch(`${API_BASE}/api/profile`, { headers: { 'Authorization': `Bearer ${authToken}` } });
                if (resp.ok) {
                    const prof = await resp.json();
                    currentUser = prof;
                }
                updateProfileDisplay();
            } catch (e) {
                console.warn(e);
                alert('Failed to update profile on server');
            }
        })();
    });

    cancelEditBtn.addEventListener('click', () => editForm.classList.remove('active'));


    createGroupBtn.addEventListener('click', () => { renderGroupContacts(); createGroupModal.classList.add('active'); });
    createChatBtn.addEventListener('click', () => createChatModal.classList.add('active'));


    closeGroupModal.addEventListener('click', () => createGroupModal.classList.remove('active'));
    closeChatModal.addEventListener('click', () => createChatModal.classList.remove('active'));
    cancelGroupBtn.addEventListener('click', () => createGroupModal.classList.remove('active'));
    cancelChatBtn.addEventListener('click', () => createChatModal.classList.remove('active'));
    closeGroupInfo.addEventListener('click', () => groupInfoModal.classList.remove('active'));


    createGroupBtnModal.addEventListener('click', createGroup);
    createChatBtnModal.addEventListener('click', createChat);


    groupAvatarContainer.addEventListener('click', () => groupAvatarInput.click());
    groupAvatarInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = () => {
                groupAvatarPreview.innerHTML = `<img src="${reader.result}" alt="Group Avatar">`;
                groupAvatarUrl = reader.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });


    chatMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chatDropdownMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!chatMenuBtn.contains(e.target) && !chatDropdownMenu.contains(e.target)) {
            chatDropdownMenu.classList.remove('active');
        }
    });

    showProfileBtn.addEventListener('click', () => {
        if (!currentChatId) return;
        const chat = chatData.find(c => c.id === currentChatId);
        if (chat && !chat.isGroup && chat.contactId) showContactProfile(chat.contactId);
    });


    sendMessageContactBtn.addEventListener('click', () => {
        if (currentContactProfile) openChatWithContact(currentContactProfile.id);
    });

    callContactProfileBtn.addEventListener('click', () => {
        if (currentContactProfile) startCallToContact(currentContactProfile.id);
    });
}


window.addEventListener('DOMContentLoaded', onDOMLoaded);


const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        try {
            localStorage.removeItem('kairotoken');
            localStorage.removeItem('kairouser');
        } catch (e) { console.warn('LocalStorage cleanup failed', e); }
        authToken = null;
        currentUser = { email: null, avatar: null, phone: null, status: 'Online', regDate: null };
        myUserId = null;
        appContainer.style.display = 'none';
        authModal.classList.add('active');
    });

    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            applyTheme(e.target.checked ? 'light' : 'dark');
        });
        try {
            if (localStorage.getItem('kairoTheme') === 'light') {
                applyTheme('light');
            }
        } catch (e) {}
    }


    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const chosen = btn.dataset.lang || 'en';
            changeLanguage(chosen);
        });
    });

    try {
        const savedLang = localStorage.getItem('kairoLang');
        if (savedLang) changeLanguage(savedLang); else changeLanguage(currentLang || 'en');
    } catch (e) {
        changeLanguage(currentLang || 'en');
    }
}

window.addEventListener('beforeunload', function () {
    if (CALL_SESSION_ACTIVE) {
        try {
            const resp = { type: 'call_response', action: 'end', chatId: (window.CALL_CHAT_ID || currentChatId), senderId: myUserId };
            if (typeof sendSocketMessage === 'function') sendSocketMessage(resp);
            else if (typeof sendMessageViaSocket === 'function') sendMessageViaSocket(resp);
        } catch (e) { }
        try { __cleanupRTC && __cleanupRTC(); } catch (e) { }
    }
});

let __RING_TIMEOUT_ID = null;

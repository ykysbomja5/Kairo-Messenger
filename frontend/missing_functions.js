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

function initWebSocket() {
    const wsProto = (location.protocol === 'https:') ? 'wss' : 'ws';
    const wsUrl = `${wsProto}://${location.host}/ws`;
    socket = new WebSocket(wsUrl);

    socket.addEventListener('open', (event) => {
        console.log('WebSocket connected');
        const authMessage = { type: 'auth', token: authToken };
        socket.send(JSON.stringify(authMessage));
    });

    socket.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            handleSocketMessage(data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    socket.addEventListener('close', (event) => {
        console.log('WebSocket disconnected. Attempting to reconnect...');
        setTimeout(initWebSocket, 3000);
    });

    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

function handleSocketMessage(data) {
    console.log('Received message:', data);
    switch (data.type) {
        case 'webrtc':
            handleWebRTCSignal(data);
            break;
        case 'connection':
            myUserId = data.userId || data.user_id;
            break;
        case 'auth_success':
            myUserId = data.userId;
            break;
        case 'auth_error':
            alert(`Authentication failed: ${data.message}`);
            window.location.reload();
            break;
        case 'message':
            if (!chatMessages[data.chatId]) chatMessages[data.chatId] = [];
            chatMessages[data.chatId].push({
                type: data.senderId === myUserId ? 'outgoing' : 'incoming',
                text: data.text,
                time: data.time
            });
            if (currentChatId === data.chatId) {
                renderMessage({
                    type: data.senderId === myUserId ? 'outgoing' : 'incoming',
                    text: data.text,
                    time: data.time
                });
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            const known = chatData.some(c => (c.id === data.chatId));
            if (!known) { fetchAndLoadConversations(); }
            break;
        case 'call':
            handleIncomingCall(data);
            break;
        case 'call_response':
            handleCallResponse(data);
            break;
        case 'error':
            alert(`Error: ${data.message}`);
            break;
    }
}

function handleIncomingCall(data) {
    CALL_ROLE = 'callee';
    CALL_MEDIA = (data && data.media === 'video') ? 'video' : 'audio';
    let name = (data && data.fromName) ? data.fromName : null;
    if (!name && typeof chatData !== 'undefined' && data && data.chatId) {
        const ch = chatData.find(c => c.id === data.chatId);
        if (ch) name = ch.name;
    }
    CALL_PEER_NAME = name || 'Incoming Call';
    if (callName) callName.textContent = CALL_PEER_NAME;
    if (callStatus) callStatus.textContent = (CALL_MEDIA === 'video') ? 'Incoming Video Call' : 'Incoming Call';
    if (callAvatar && data && data.fromAvatar) callAvatar.innerHTML = `<img src="${data.fromAvatar}" alt="${CALL_PEER_NAME}">`;
    if (callAnswer) callAnswer.style.display = '';
    if (callDecline) callDecline.style.display = '';
    if (callContainer) callContainer.classList.add('active');

    // Ringtone and Notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Incoming Call', {
            body: `Incoming call from ${CALL_PEER_NAME}`,
            icon: '/icons/icon-192.png'
        });
    }
    try { const ring = document.getElementById('ringtone'); if (ring) { ring.currentTime = 0; ring.play(); } } catch(e){}
}

async function handleCallResponse(data) {
    if (CALL_ROLE === 'caller') {
        if (data && data.action === 'accept') {
            if (typeof __clearRingTimeout === 'function') __clearRingTimeout();
            try { 
                if (!RTC_PC) __createPC(); 
                if (!RTC_LOCAL) { 
                    RTC_LOCAL = await __getMedia(CALL_MEDIA || 'audio'); 
                    RTC_LOCAL.getTracks().forEach(t => RTC_PC.addTrack(t, RTC_LOCAL)); 
                } 
                const offer = await RTC_PC.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: (CALL_MEDIA === 'video') }); 
                await RTC_PC.setLocalDescription(offer); 
                const msg = { type: 'webrtc', action: 'offer', chatId: currentChatId, senderId: myUserId, sdp: RTC_PC.localDescription }; 
                if (typeof sendSocketMessage === 'function') sendSocketMessage(msg); 
                else if (typeof sendMessageViaSocket === 'function') sendMessageViaSocket(msg); 
            } catch (e) { console.error('offer failed', e); }
            if (callStatus) callStatus.textContent = (CALL_MEDIA === 'video') ? 'Connecting Video...' : 'Connecting...';
            if (callAnswer) callAnswer.style.display = 'none';
        } else if (data && (data.action === 'decline' || data.action === 'end')) {
            __hangup(false); 
            if (typeof __stopCallTimer === 'function') __stopCallTimer(); 
            try { __cleanupRTC(); } catch (e) { }
            if (callContainer) callContainer.classList.remove('active');
            CALL_ROLE = CALL_MEDIA = CALL_PEER_NAME = null;
            if (callAnswer) callAnswer.style.display = '';
        }
    } else if (CALL_ROLE === 'callee') {
        if (data && (data.action === 'end' || data.action === 'decline')) {
            __hangup(false);
        }
    }
}

(function () {
    if (typeof callAnswer !== 'undefined' && callAnswer && !callAnswer.__bound) {
        callAnswer.addEventListener('click', function () {
            if (CALL_ROLE !== 'callee') return;
            if (callStatus) callStatus.textContent = (CALL_MEDIA === 'video') ? 'Connecting Video...' : 'Connecting...';
            callAnswer.style.display = 'none';
            const resp = { type: 'call_response', action: 'accept', chatId: currentChatId, senderId: myUserId };
            try {
                if (typeof sendSocketMessage === 'function') sendSocketMessage(resp);
                else if (typeof sendMessageViaSocket === 'function') sendMessageViaSocket(resp);
            } catch (e) { }
        });
        callAnswer.__bound = true;
    }

    if (typeof callDecline !== 'undefined' && callDecline && !callDecline.__bound) {
        callDecline.addEventListener('click', function () {
            const alreadyAccepted = CALL_SESSION_ACTIVE || (CALL_ROLE === 'caller') || (CALL_ROLE === 'callee' && callAnswer && callAnswer.style.display === 'none');
            if (alreadyAccepted) {
                __hangup(true);
            } else {
                try {
                    const resp = { type: 'call_response', action: 'decline', chatId: currentChatId, senderId: myUserId };
                    if (typeof sendSocketMessage === 'function') sendSocketMessage(resp);
                    else if (typeof sendMessageViaSocket === 'function') sendMessageViaSocket(resp);
                } catch (e) { }
                __hangup(false);
            }
        });
        callDecline.__bound = true;
    }
})();

let CALL_SESSION_ACTIVE = false;
let CALL_SENDING_END = false;

function __remoteAudioEl() {
    let el = document.getElementById('remote-audio');
    if (!el) {
        el = document.createElement('audio');
        el.id = 'remote-audio'; el.autoplay = true; el.playsInline = true; el.style.display = 'none';
        document.body.appendChild(el);
    }
    return el;
}

function __hangup(sendEnd) {
    try {
        if (sendEnd && !CALL_SENDING_END) {
            CALL_SENDING_END = true;
            const resp = { type: 'call_response', action: 'end', chatId: currentChatId, senderId: myUserId };
            try {
                if (typeof sendSocketMessage === 'function') sendSocketMessage(resp);
                else if (typeof sendMessageViaSocket === 'function') sendMessageViaSocket(resp);
            } catch (e) { }
        }
    } catch (e) { }
    try { if (typeof __stopCallTimer === 'function') __stopCallTimer(); } catch (e) { }
    try { if (typeof __clearRingTimeout === 'function') __clearRingTimeout(); } catch (e) { }
    try { __cleanupRTC(); } catch (e) { }
    const ra = document.getElementById('remote-audio');
    if (ra) { try { ra.pause(); ra.srcObject = null; } catch (e) { } }
    if (typeof callContainer !== 'undefined' && callContainer) callContainer.classList.remove('active');
    CALL_ROLE = CALL_MEDIA = CALL_PEER_NAME = null;
    CALL_SESSION_ACTIVE = false;
    CALL_SENDING_END = false;
    if (typeof callAnswer !== 'undefined' && callAnswer) callAnswer.style.display = '';
    if (typeof callStatus !== 'undefined' && callStatus) callStatus.textContent = 'Call Ended';
}

let RTC_PC = null;
let RTC_LOCAL = null;
let RTC_ROLE = null;

function __createPC() {
    RTC_PC = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    RTC_PC.onicecandidate = (ev) => {
        if (ev.candidate) {
            const msg = { type: 'webrtc', action: 'ice', chatId: currentChatId, senderId: myUserId, candidate: ev.candidate };
            try { if (typeof sendSocketMessage === 'function') sendSocketMessage(msg); else if (typeof sendMessageViaSocket === 'function') sendMessageViaSocket(msg); } catch (e) { }
        }
    };
    RTC_PC.ontrack = (ev) => {
        let el = __remoteAudioEl();
        if (ev.streams && ev.streams[0]) el.srcObject = ev.streams[0];
    };

    RTC_PC.onconnectionstatechange = () => {
        const st = RTC_PC.connectionState;
        console.log('PC connectionState:', st);
        if (st === 'connected') {
            if (callStatus) callStatus.textContent = (CALL_MEDIA === 'video') ? 'In Video Call' : 'In Call';
            if (callAnswer) callAnswer.style.display = 'none';
            if (typeof __startCallTimer === 'function') __startCallTimer();
        } else if (st === 'disconnected' || st === 'failed' || st === 'closed') {
            if (typeof __stopCallTimer === 'function') __stopCallTimer();
            if (callContainer) callContainer.classList.remove('active');
            try { __cleanupRTC(); } catch (e) { }
            CALL_ROLE = CALL_MEDIA = CALL_PEER_NAME = null;
            if (callAnswer) callAnswer.style.display = '';
        }
    };
    RTC_PC.oniceconnectionstatechange = () => {
        const st = RTC_PC.iceConnectionState;
        console.log('PC iceConnectionState:', st);
        if (st === 'connected' || st === 'completed') {
            if (callStatus) callStatus.textContent = (CALL_MEDIA === 'video') ? 'In Video Call' : 'In Call';
            if (callAnswer) callAnswer.style.display = 'none';
            if (typeof __startCallTimer === 'function') __startCallTimer();
        } else if (st === 'failed' || st === 'disconnected' || st === 'closed') {
            if (typeof __stopCallTimer === 'function') __stopCallTimer();
            if (callContainer) callContainer.classList.remove('active');
            try { __cleanupRTC(); } catch (e) { }
            CALL_ROLE = CALL_MEDIA = CALL_PEER_NAME = null;
            if (callAnswer) callAnswer.style.display = '';
        }
    };
}

async function __getMedia(kind) {
    const isVideo = (kind === 'video');
    const constraints = isVideo ? { audio: true, video: { width: 640, height: 480 } } : { audio: true, video: false };
    return await navigator.mediaDevices.getUserMedia(constraints);
}

function __cleanupRTC() {
    try { if (RTC_PC) { RTC_PC.ontrack = null; RTC_PC.onicecandidate = null; RTC_PC.onconnectionstatechange = null; RTC_PC.oniceconnectionstatechange = null; RTC_PC.close(); } } catch (e) { }
    try { if (RTC_LOCAL) { RTC_LOCAL.getTracks().forEach(t => { try { t.stop(); } catch (e) { } }); } } catch (e) { }
    RTC_PC = null; RTC_LOCAL = null; RTC_ROLE = null;

    try { const ra = document.getElementById('remote-audio'); if (ra) { ra.pause(); ra.srcObject = null; } } catch (e) { }
    try { const ringtone = document.getElementById('ringtone'); if (ringtone) { ringtone.pause(); ringtone.currentTime = 0; } } catch (e) { }
}

async function handleWebRTCSignal(data) {
    try {
        if (!data || !data.action) return;
        if (data.action === 'end') { __hangup(false); return; }
        if (data.action === 'offer') {
            RTC_ROLE = 'callee';
            if (!RTC_PC) __createPC();
            await RTC_PC.setRemoteDescription(new RTCSessionDescription(data.sdp));
            if (!RTC_LOCAL) { RTC_LOCAL = await __getMedia(CALL_MEDIA || 'audio'); RTC_LOCAL.getTracks().forEach(t => RTC_PC.addTrack(t, RTC_LOCAL)); }
            const answer = await RTC_PC.createAnswer();
            await RTC_PC.setLocalDescription(answer);
            const resp = { type: 'webrtc', action: 'answer', chatId: currentChatId, senderId: myUserId, sdp: RTC_PC.localDescription };
            if (typeof sendSocketMessage === 'function') sendSocketMessage(resp); else if (typeof sendMessageViaSocket === 'function') sendMessageViaSocket(resp);
        } else if (data.action === 'answer') {
            if (typeof __clearRingTimeout === 'function') __clearRingTimeout();
            if (!RTC_PC) __createPC();
            await RTC_PC.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.action === 'ice') {
            if (!RTC_PC) __createPC();
            if (data.candidate) {
                try { await RTC_PC.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) { console.warn('addIceCandidate failed', e); }
            }
        } else if (data.action === 'end') {
            __cleanupRTC();
        }
    } catch (e) {
        console.error('handleWebRTCSignal error:', e);
    }
}

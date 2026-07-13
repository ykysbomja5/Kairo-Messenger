function normalizeUploadPath(p) {
    if (!p || typeof p !== 'string') return null;
    p = p.trim().replace(/^"+|"+$/g, '');
    if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) return p;
    if (p.startsWith('/uploads/')) return p;
    if (p.startsWith('uploads/')) return '/' + p;
    return p;
}

function pickUserId(u) { return (u && (u.id || u.user_id || u.userId)) || null; }
function pickUserName(u) { return (u && (u.username || u.name || u.email)) || ''; }
function pickUserAvatar(u) {
    if (!u) return null;
    return normalizeUploadPath(u.avatar || u.avatar_url || u.avatarUrl || (u.profile && (u.profile.avatar || u.profile.avatar_url)) || null);
}

function chooseAvatarForConversation(conv, myId) {
    const groupAvatar = normalizeUploadPath(conv.group_avatar || conv.groupAvatar || conv.avatar_url || conv.avatar);
    if ((conv.is_group || conv.isGroup) && groupAvatar) return groupAvatar;
    const participants = Array.isArray(conv.participants || conv.members) ? (conv.participants || conv.members) : [];
    let other = participants.find(u => {
        const uid = pickUserId(u);
        return uid && String(uid) !== String(myId);
    }) || participants[0];
    return pickUserAvatar(other) || groupAvatar || null;
}

function chooseTitleForConversation(conv, myId) {
    let title = conv.group_name || conv.groupName || '';
    if (!title) {
        const participants = Array.isArray(conv.participants || conv.members) ? (conv.participants || conv.members) : [];
        let other = participants.find(u => {
            const uid = pickUserId(u);
            return uid && String(uid) !== String(myId);
        }) || participants[0];
        title = pickUserName(other);
    }
    return title || 'Chat';
}

function isUUID(v) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v));
}


function formatTime(timeStr) {

    try {
        function parseISOToDate(v) {
            if (!v && v !== 0) return null;
            if (v instanceof Date) return v;
            if (typeof v === 'number') {

                let ms = v < 1e12 ? v * 1000 : v;
                const d = new Date(ms);
                return isNaN(d) ? null : d;
            }
            if (typeof v !== 'string') return null;
            let s = v.trim();



            const m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?([zZ]|[+\-]\d{2}:\d{2})?$/);
            if (m) {
                let frac = '';
                if (m[2]) {
                    let ms = m[2].slice(1);
                    ms = ms.slice(0, 3);
                    while (ms.length < 3) ms += '0';
                    frac = '.' + ms;
                }
                const tz = m[3] || '';
                const rebuilt = m[1] + (frac ? frac : '') + tz;
                const d = new Date(rebuilt);
                if (!isNaN(d)) return d;
            }


            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) {
                const d = new Date(s.replace(' ', 'T'));
                if (!isNaN(d)) return d;
            }


            const d = new Date(s);
            return isNaN(d) ? null : d;
        }

        const d = parseISOToDate(timeStr);
        if (!d) return '';


        const now = new Date();
        const sameDay = d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate();


        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        const isYesterday = d.getFullYear() === y.getFullYear() &&
            d.getMonth() === y.getMonth() &&
            d.getDate() === y.getDate();

        const timePart = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(d);

        if (sameDay) return `сегодня, ${timePart}`;
        if (isYesterday) return `вчера, ${timePart}`;

        const yearSame = d.getFullYear() === now.getFullYear();
        const dateOpts = yearSame
            ? { day: '2-digit', month: 'short' }
            : { day: '2-digit', month: 'short', year: 'numeric' };

        const datePart = new Intl.DateTimeFormat('ru-RU', dateOpts).format(d).replace('.', '');
        return `${datePart}, ${timePart}`;
    } catch (e) {

        return (timeStr == null ? '' : String(timeStr));
    }
}


function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}


function formatDate(dateStr) { }
function getCurrentTime() {
    const now = new Date();
    return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
}



function fetchAndLoadConversations() {

    if (typeof authToken === 'undefined' || !authToken) {
        if (typeof chatData !== 'undefined' && Array.isArray(chatData)) chatData.length = 0;
        if (typeof renderChats === 'function') { try { renderChats(); } catch (e) { } }
        return Promise.resolve([]);
    }
    const base = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE : '';

    return fetch(`${base}/api/conversations`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
        .then(r => { if (!r.ok) throw new Error('Failed to load conversations'); return r.json(); })
        .then(convs => {
            try {
                if (typeof chatData !== 'undefined' && Array.isArray(chatData)) chatData.length = 0;
                const me = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
                const fallbackMeId = (typeof myUserId !== 'undefined') ? myUserId : null;
                const myId = (me && (me.id || me.user_id)) || fallbackMeId || null;

                (convs || []).forEach(conv => {
                    const title = (typeof chooseTitleForConversation === 'function')
                        ? chooseTitleForConversation(conv, myId)
                        : (conv.group_name || conv.groupName || 'Chat');

                    const chosenAvatar = (typeof chooseAvatarForConversation === 'function')
                        ? chooseAvatarForConversation(conv, myId)
                        : (conv.avatar || conv.avatar_url || null);

                    let lastMessage = '';
                    let lastTime = '';
                    if (Array.isArray(conv.last_message) && conv.last_message.length) {
                        const lm = conv.last_message[conv.last_message.length - 1];
                        lastMessage = (lm && (lm.content || lm.text)) || '';
                        lastTime = (lm && (lm.created_at || lm.time)) || '';
                    } else if (conv.last_message && typeof conv.last_message === 'object') {
                        lastMessage = conv.last_message.content || conv.last_message.text || '';
                        lastTime = conv.last_message.created_at || conv.last_message.time || '';
                    }

                    const normalizedAvatar = (typeof normalizeUploadPath === 'function')
                        ? (normalizeUploadPath(chosenAvatar) ||
                            normalizeUploadPath(me && (me.avatar || me.avatar_url)) ||
                            '')
                        : (chosenAvatar || '');

                    if (typeof chatData !== 'undefined' && Array.isArray(chatData)) {
                        chatData.push({
                            id: conv.id || conv.conversation_id || conv.uuid,
                            name: title,
                            lastMessage: lastMessage || '',
                            time: lastTime || '',
                            unread: conv.unread || 0,
                            avatar: normalizedAvatar,
                            isGroup: !!(conv.is_group || conv.isGroup),
                            members: conv.participants || conv.members || []
                        });
                    }
                });
            } catch (e) {
                console.warn('Failed to map conversations:', e);
            }

            if (typeof renderChats === 'function') { try { renderChats(); } catch (e) { } }
            return convs;
        })
        .catch(err => {
            console.error('fetchAndLoadConversations failed:', err);
            return [];
        });
}



function renderChats() {
    chatsList.innerHTML = '';

    chatData.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.id = chat.id;

        chatItem.innerHTML = `
            <div class="chat-avatar">
                <img src="${chat.avatar}" alt="${chat.name}">
            </div>
            <div class="chat-info">
                <div class="chat-name">${chat.name}</div>
                <div class="last-message">${chat.lastMessage}</div>
            </div>
            <div class="chat-time">${formatTime(chat.time)}</div>
        `;

        chatsList.appendChild(chatItem);

        chatItem.addEventListener('click', () => {
            closeAllPages();
            selectChat(chat.id);
            if (window.innerWidth <= 768) {

                sidebar.classList.remove('active');
                sidebar.style.display = 'none';
                if (mainContentEl) {
                    mainContentEl.classList.add('active');
                    mainContentEl.style.display = 'flex';
                }
            }
        });
    });
}


function renderContacts() {
    const contactsListEl = contactsPage.querySelector('.contacts-list');
    contactsListEl.innerHTML = '';

    contactsData.forEach(contact => {
        const contactItem = document.createElement('div');
        contactItem.className = 'chat-item';
        contactItem.dataset.id = contact.id;

        contactItem.innerHTML = `
            <div class="chat-avatar">
                <img src="${contact.avatar}" alt="${contact.name}">
            </div>
            <div class="chat-info">
                <div class="chat-name">${contact.name}</div>
                <div class="last-message">${contact.phone || contact.email}</div>
            </div>
            <div class="contact-actions">
                <button class="action-btn call-contact-btn" data-id="${contact.id}"><i class="fas fa-phone-alt"></i></button>
                <button class="action-btn message-contact-btn" data-id="${contact.id}"><i class="fas fa-comment-alt"></i></button>
            </div>
        `;

        contactsListEl.appendChild(contactItem);

        contactItem.querySelector('.call-contact-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            startCallToContact(contact.id);
        });

        contactItem.querySelector('.message-contact-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openChatWithContact(contact.id);
        });
    });
}


function renderGroupContacts() {
    groupContactsList.innerHTML = '';

    contactsData.forEach(contact => {
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-item';

        contactItem.innerHTML = `
            <label class="checkbox-container">
                <input type="checkbox" class="contact-checkbox" id="contact-${contact.id}" data-id="${contact.id}">
                <span class="checkmark"></span>
                <div class="chat-avatar">
                    <img src="${contact.avatar}" alt="${contact.name}">
                </div>
                <div class="chat-name">${contact.name}</div>
            </label>
        `;

        groupContactsList.appendChild(contactItem);

        const checkbox = contactItem.querySelector('.contact-checkbox');
        checkbox.addEventListener('change', () => {
            contactItem.classList.toggle('selected', checkbox.checked);
        });
    });
}


function renderCalls() {
    const callsListEl = callsPage.querySelector('.calls-list');
    callsListEl.innerHTML = '';

    callsData.forEach(call => {
        const callItem = document.createElement('div');
        callItem.className = 'chat-item';
        callItem.dataset.id = call.id;

        callItem.innerHTML = `
            <div class="chat-avatar">
                <i class="fas fa-${call.type === 'incoming' ? 'phone-alt' : 'phone'} ${call.missed ? 'missed' : ''}"></i>
            </div>
            <div class="chat-info">
                <div class="chat-name">${call.name}</div>
                <div class="last-message">
                    ${call.type === 'incoming' ? 'Incoming' : 'Outgoing'} 
                    ${call.missed ? '(Missed)' : ''}
                </div>
            </div>
            <div class="chat-time">
                ${formatTime(call.time)}
                ${!call.missed ? `<div>${call.duration}</div>` : ''}
            </div>
            <div class="call-actions">
                <button class="action-btn call-history-btn" data-name="${call.name}">
                    <i class="fas fa-phone-alt"></i>
                </button>
            </div>
        `;

        callsListEl.appendChild(callItem);

        callItem.querySelector('.call-history-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            startCallToContactByName(call.name);
        });
    });
}



function ensureServerConversationId(chat) {

    if (isUUID(chat.id)) return Promise.resolve(chat.id);

    if (chat.contactId) {
        const contact = contactsData.find(c => c.id === chat.contactId);
        if (contact && contact.email) {
            const payload = { partner_id: contact.email };
            return fetch(`${_API_BASE}/api/conversations/direct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(payload)
            }).then(r => r.json()).then(conv => {
                chat.id = conv.id;
                return conv.id;
            }).catch(e => { console.error('Failed to ensure conversation on server', e); return null; });
        }
    }
    return Promise.resolve(null);
}

function selectChat(chatId) {
    const chat = chatData.find(c => c.id === chatId);
    ensureServerConversationId(chat).then(serverId => {
        currentChatId = serverId || chatId;

        currentChatName.textContent = chat.name;
        currentChatAvatar.innerHTML = `<img src="${chat.avatar}" alt="${chat.name}">`;

        groupMembers.innerHTML = '';
        if (chat.isGroup && chat.members) {
            const maxMembers = 3;
            const visibleMembers = chat.members.slice(0, maxMembers);
            const extraMembers = chat.members.length - maxMembers;

            visibleMembers.forEach(memberId => {
                const contact = contactsData.find(c => c.id === memberId);
                if (contact) {
                    const memberAvatar = document.createElement('div');
                    memberAvatar.className = 'member-avatar';
                    memberAvatar.innerHTML = `<img src="${contact.avatar}" alt="${contact.name}">`;
                    groupMembers.appendChild(memberAvatar);
                }
            });

            if (extraMembers > 0) {
                const moreMembers = document.createElement('div');
                moreMembers.className = 'more-members';
                moreMembers.textContent = `+${extraMembers}`;
                groupMembers.appendChild(moreMembers);
            }
        }


        loadMessagesForCurrentChat();
        leaveGroupBtn.style.display = chat.isGroup ? 'flex' : 'none';
        groupInfoBtn.style.display = chat.isGroup ? 'flex' : 'none';
        showProfileBtn.style.display = !chat.isGroup ? 'flex' : 'none';
        blockContactBtn.style.display = !chat.isGroup ? 'flex' : 'none';

        messagesContainer.innerHTML = '';

        if (!chatMessages[chatId]) {
            chatMessages[chatId] = [];
        }

        if (chatMessages[chatId].length === 0) {
            messagesContainer.innerHTML = `
                <div class="no-messages">
                    <p>${t('noMessages')}</p>
                </div>
            `;
        } else {
            chatMessages[chatId].forEach(msg => renderMessage(msg));
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === chatId) {
                item.classList.add('active');
            }
        });
    });
}


function openChatWithContact(contactId) {
    const existingChat = chatData.find(chat => !chat.isGroup && chat.contactId === contactId);

    if (existingChat) {
        closeAllPages();
        selectChat(existingChat.id);
        contactsPage.classList.remove('active');
        return;
    }

    const contact = contactsData.find(c => c.id === contactId);
    if (!contact) {
        console.error("Contact not found for ID:", contactId);
        return;
    }

    const payload = { partner_id: contact.email };

    fetch(`${_API_BASE}/api/conversations/direct`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to create direct chat on server.');
            }
            return response.json();
        })
        .then(newChatFromServer => {
            console.log('Direct chat created on server:', newChatFromServer);

            const newChat = {
                id: newChatFromServer.id || Math.max(...chatData.map(c => c.id), 0) + 1,
                name: contact.name,
                lastMessage: t('newChat'),
                time: t('justNow'),
                unread: 0,
                avatar: contact.avatar,
                contactId: contact.id,
                isGroup: false
            };

            chatData.push(newChat);
            renderChats();
            closeAllPages();
            selectChat(newChat.id);
            contactsPage.classList.remove('active');
        })
        .catch(error => {
            console.error('Error creating direct chat:', error);
            alert('Failed to create chat. Please try again.');
        });
}


function loadMessagesForCurrentChat(limit = 100, offset = 0) {
    if (!authToken || !currentChatId || !isUUID(currentChatId)) { return; }
    messagesContainer.innerHTML = '';
    fetch(`${API_BASE}/api/messages?conversation_id=${encodeURIComponent(currentChatId)}&limit=${limit}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
        .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load messages')))
        .then(items => {

            items.sort((a, b) => new Date(a.created_at || a.createdAt).getTime() - new Date(b.created_at || b.createdAt).getTime());
            items.forEach(msg => {
                const sender = (msg.sender_id || msg.senderId);
                const content = msg.content || msg.text || '';
                const timeStr = msg.created_at || msg.createdAt || '';
                
                let msgType = sender === myUserId ? 'outgoing' : 'incoming';
                if (msg.type === 'image') msgType = 'image';
                else if (msg.type === 'voice') msgType = 'voice';

                renderMessage({ 
                    id: msg.id,
                    type: msgType, 
                    text: content, 
                    url: msg.type === 'image' ? content : undefined,
                    audioUrl: msg.type === 'voice' ? content : undefined,
                    duration: msg.type === 'voice' ? '0:00' : undefined,
                    sender: sender === myUserId ? 'outgoing' : 'incoming',
                    time: timeStr,
                    is_read: msg.is_read,
                    is_edited: msg.is_edited
                });
            });
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        })
        .catch(e => console.warn('Could not load history', e));
}
function renderMessage(msg) {
    let messageHtml = '';

    const isRead = msg.is_read ? 'read' : 'sent';
    const icon = msg.is_read ? '<i class="fa-solid fa-check-double"></i>' : '<i class="fa-solid fa-check"></i>';
    const ticksHtml = msg.type === 'outgoing' ? `<span class="msg-ticks ${isRead}">${icon}</span>` : '';
    const editedHtml = msg.is_edited ? '<i>(ред.)</i> ' : '';

    switch (msg.type) {
        case 'incoming':
        case 'outgoing':
            messageHtml = `
                <div class="message ${msg.type}">
                    <div class="message-text msg-text">${msg.text}</div>
                    <div class="message-time msg-time">${editedHtml}${formatTime(msg.time)}${ticksHtml}</div>
                </div>
            `;
            break;
        case 'image':
            messageHtml = `
                <div class="message image-message ${msg.sender === 'outgoing' ? 'outgoing' : 'incoming'}">
                    <img src="${msg.url}" alt="Image">
                    <div class="message-time msg-time">${editedHtml}${formatTime(msg.time)}${ticksHtml}</div>
                </div>
            `;
            break;
        case 'voice':
            messageHtml = `
                <div class="message voice-message-container ${msg.sender === 'outgoing' ? 'outgoing' : 'incoming'}">
                    <div class="voice-message">
                        <div class="voice-play-btn" data-audio="${msg.audioUrl}"><i class="fas fa-play"></i></div>
                        <div class="voice-wave">
                            ${Array(5).fill('<div class="wave-bar"></div>').join('')}
                        </div>
                        <div class="voice-duration">${msg.duration}</div>
                    </div>
                    <div class="message-time msg-time">${editedHtml}${formatTime(msg.time)}${ticksHtml}</div>
                </div>
            `;
            break;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = messageHtml.trim();
    const messageNode = tempDiv.firstChild;
    
    if (messageNode) {
        if (msg.id) messageNode.dataset.id = msg.id;
        if (msg.type === 'outgoing') {
            messageNode.addEventListener('dblclick', (e) => {
                e.preventDefault();
                startEditingMessage(msg);
            });
        }
        messagesContainer.appendChild(messageNode);
    }
}

function startEditingMessage(msg) {
    if (msg.type !== 'outgoing' || !msg.id) return;
    
    editingMessageId = msg.id;
    messageInput.value = msg.text;
    messageInput.focus();
    sendBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
}

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChatId) return;
    if (!isUUID(currentChatId)) {
        alert('Выберите чат, созданный на сервере.');
        return;
    }

    const originalText = text;
    messageInput.value = '';

    const messagePayload = {
        conversation_id: currentChatId,
        content: text,
        type: 'text'
    };

    fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(messagePayload)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to send message to server.');
            }
        })
        .catch(error => {
            console.error('Error sending message:', error);
            alert('Error sending message. Could not reach the server.');
            messageInput.value = originalText;
        });
}


function sendImage(file) {
    if (!file || !currentChatId) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const base64data = e.target.result;
        const messagePayload = {
            conversation_id: currentChatId,
            content: base64data,
            type: 'image'
        };
        fetch(`${API_BASE}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(messagePayload)
        }).catch(err => console.error("Error sending image:", err));
    };
    reader.readAsDataURL(file);
}


function searchChats(query) {
    const normalizedQuery = query.toLowerCase().trim();
    document.querySelectorAll('.chat-item').forEach(chatItem => {
        const chat = chatData.find(c => c.id == chatItem.dataset.id);
        if (!chat) return;

        const matches = chat.name.toLowerCase().includes(normalizedQuery) ||
            chat.lastMessage.toLowerCase().includes(normalizedQuery);
        chatItem.style.display = matches ? 'flex' : 'none';
    });
}

function createGroup() {
    const groupName = document.getElementById('group-name').value.trim();
    if (!groupName) {
        alert('Please enter a group name');
        return;
    }

    const selectedContactIds = Array.from(document.querySelectorAll('.contact-checkbox:checked'))
        .map(checkbox => parseInt(checkbox.dataset.id));

    if (selectedContactIds.length === 0) {
        alert('Please select at least one member');
        return;
    }

    const groupPayload = {
        name: groupName,
        members: selectedContactIds
            .map(id => (contactsData.find(c => c.id === id) || {}).email)
            .filter(Boolean)
    };

    fetch(`${_API_BASE}/api/conversations/group`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(groupPayload)
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to create group on server.');
            return response.json();
        })
        .then(newGroupFromServer => {
            console.log('Group created on server:', newGroupFromServer);

            const newGroup = {
                id: newGroupFromServer.id || Math.max(...chatData.map(c => c.id), 0) + 1,
                name: groupName,
                lastMessage: t('groupCreated'),
                time: t('justNow'),
                unread: 0,
                avatar: groupPayload.avatar,
                isGroup: true,
                createdDate: new Date().toISOString().split('T')[0],
                members: selectedContactIds
            };

            chatData.push(newGroup);
            renderChats();
            createGroupModal.classList.remove('active');

            groupAvatarUrl = null;
            groupAvatarPreview.innerHTML = '<i class="fas fa-users"></i>';
            document.getElementById('group-name').value = '';

            selectChat(newGroup.id);
        })
        .catch(error => {
            console.error('Error creating group:', error);
            alert('Failed to create group. Please try again.');
        });
}



function createChat() {
    const contactName = document.getElementById('contact-name').value.trim();
    const contactInfo = document.getElementById('contact-info').value.trim();
    if (!contactName || !contactInfo) {
        alert('Please fill all fields');
        return;
    }

    const newContactId = Math.max(...contactsData.map(c => c.id), 0) + 1;
    const isEmail = contactInfo.includes('@');

    const newContact = {
        id: newContactId,
        name: contactName,
        phone: isEmail ? "" : contactInfo,
        email: isEmail ? contactInfo : "",
        avatar: "https://randomuser.me/api/portraits/lego/2.jpg",
        status: t('newContact')
    };

    contactsData.push(newContact);
    renderContacts();


    openChatWithContact(newContactId);

    createChatModal.classList.remove('active');
}


function showContactProfile(contactId) {
    const contact = contactsData.find(c => c.id === contactId);
    if (!contact) return;

    currentContactProfile = contact;

    contactProfileName.textContent = contact.name;
    contactProfilePhone.textContent = contact.phone;
    contactProfileEmail.textContent = contact.email || "";
    contactProfileStatus.textContent = contact.status;
    contactProfileAvatar.innerHTML = `<img src="${contact.avatar}" alt="${contact.name}">`;

    closeAllPages();
    contactProfilePage.classList.add('active');
}

function leaveGroup() { }
function showGroupInfo() { }


// --- Typing Indicator Logic ---
let typingTimeout = null;

function showTypingIndicator() {
    let indicator = document.getElementById('typing-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <span>печатает</span>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        messagesContainer.appendChild(indicator);
    }
    indicator.style.display = 'flex';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        if (indicator) indicator.style.display = 'none';
    }, 2500);
}

// When input changes, send typing event
messageInput.addEventListener('input', () => {
    if (currentChatId && messageInput.value.trim().length > 0) {
        sendSocketMessage({ type: 'typing', chatId: currentChatId });
    }
});

// --- Read Status Logic ---
function markMessagesAsReadUI(chatId) {
    if (chatMessages[chatId]) {
        chatMessages[chatId].forEach(m => m.is_read = true);
    }
    const ticks = messagesContainer.querySelectorAll('.msg-ticks.sent');
    ticks.forEach(tick => {
        tick.classList.remove('sent');
        tick.classList.add('read');
        tick.innerHTML = '<i class="fa-solid fa-check-double"></i>';
    });
}

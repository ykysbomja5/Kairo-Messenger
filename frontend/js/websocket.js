
/**
 * Устанавливает WebSocket соединение с нашим Go сервером.
 * Отвечает за реал-тайм общение (передача сообщений, статусы онлайна и WebRTC сигналы).
 */
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


/**
 * Главный роутер для всех входящих WebSocket сообщений.
 * В зависимости от типа сообщения мы перенаправляем данные в чат или в WebRTC контроллер.
 */
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
                        case 'edit_message':
            if (chatMessages[data.chatId]) {
                const msg = chatMessages[data.chatId].find(m => m.id === data.messageId);
                if (msg) {
                    msg.text = data.newContent;
                    msg.is_edited = true;
                }
            }
            if (currentChatId === data.chatId) {
                const el = document.querySelector(`.message[data-id="${data.messageId}"] .msg-text`);
                if (el) el.textContent = data.newContent;
                const timeEl = document.querySelector(`.message[data-id="${data.messageId}"] .msg-time`);
                if (timeEl && !timeEl.innerHTML.includes('(ред.)')) {
                    timeEl.innerHTML = '<i>(ред.)</i> ' + timeEl.innerHTML;
                }
            }
            break;
        case 'typing':
            if (currentChatId === data.chatId && data.senderId !== myUserId) {
                showTypingIndicator();
            }
            break;
        case 'read':
            if (currentChatId === data.chatId) {
                markMessagesAsReadUI(data.chatId);
            }
            break;
        case 'message':
            if (!chatMessages[data.chatId]) chatMessages[data.chatId] = [];
            let msgType = data.senderId === myUserId ? 'outgoing' : 'incoming';
            if (data.msgType === 'image') msgType = 'image';
            else if (data.msgType === 'voice') msgType = 'voice';
            
            const newMsgObj = {
                id: data.id,
                type: msgType,
                text: data.text,
                url: data.msgType === 'image' ? data.text : undefined,
                audioUrl: data.msgType === 'voice' ? data.text : undefined,
                duration: data.msgType === 'voice' ? '0:00' : undefined,
                sender: data.senderId === myUserId ? 'outgoing' : 'incoming',
                time: data.time,
                is_edited: data.is_edited
            };
            
            chatMessages[data.chatId].push(newMsgObj);
            
            if (currentChatId === data.chatId) {
                sendSocketMessage({ type: 'read', chatId: currentChatId });
                renderMessage(newMsgObj);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            const known = chatData.find(c => (c.id === data.chatId));
            if (!known) { 
                fetchAndLoadConversations(); 
            } else if (currentChatId !== data.chatId) {
                known.unread_count = (known.unread_count || 0) + 1;
                renderChats();
            }
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

function sendSocketMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        return true;
    }
    return false;
}



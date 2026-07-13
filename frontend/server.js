

const http = require('http');
const WebSocket = require('ws');


const users = {}; 
const conversations = [];
let nextConvId = 1;


const server = http.createServer((req, res) => {
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method;

    
    if (method === 'POST' || method === 'PUT') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            let data;
            try {
                
                data = body ? JSON.parse(body) : {};
            } catch (error) {
                
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Неверный формат JSON в теле запроса.' }));
            }

            

            
            if (path === '/api/register' && method === 'POST') {
                console.log('Запрос на регистрацию:', data.email);
                if (users[data.email]) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Пользователь уже существует' }));
                }
                users[data.email] = { password: data.password, avatar: data.avatar };
                console.log('Зарегистрированные пользователи:', Object.keys(users));
                res.writeHead(201, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ message: 'Регистрация прошла успешно' }));
            }

            
            if (path === '/api/login' && method === 'POST') {
                console.log('Запрос на вход:', data.email);
                const user = users[data.email];
                if (!user || user.password !== data.password) {
                     res.writeHead(401, { 'Content-Type': 'application/json' });
                     return res.end(JSON.stringify({ error: 'Неверные учетные данные' }));
                }
                const response = {
                    token: "fake-jwt-token-for-" + data.email,
                    user: {
                        id: data.email,
                        email: data.email,
                        avatar: user.avatar,
                        phone: 'Не задан',
                        status: 'В сети',
                        regDate: new Date().toISOString()
                    }
                };
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify(response));
            }

            
            if (path === '/api/messages' && method === 'POST') {
                console.log('Получено новое сообщение:', data);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    id: `msg_${Date.now()}`,
                    ...data,
                    created_at: new Date().toISOString()
                }));
            }

            
            if (path === '/api/conversations/group' && method === 'POST') {
                console.log('Запрос на создание группы:', data);
                const newConv = { id: `group_${nextConvId++}`, ...data, is_group: true };
                conversations.push(newConv);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify(newConv));
            }
            
            
            if (path === '/api/conversations/direct' && method === 'POST') {
                console.log('Запрос на создание личного чата:', data);
                const newConv = { id: `direct_${nextConvId++}`, ...data, is_group: false };
                conversations.push(newConv);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify(newConv));
            }

            
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
        });
    } else {
        
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
    }
});


const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Клиент подключился к WebSocket');
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('WS получено =>', data);
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data)); 
                }
            });
        } catch (e) {
            console.error('Ошибка парсинга WS сообщения', e);
        }
    });
    ws.on('close', () => {
        console.log('Клиент отключился от WebSocket');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
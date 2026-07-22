# 🌌 Kairo Messenger🌌

[![Go Version](https://img.shields.io/badge/Go-1.24%2B-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://golang.org)
[![Gin Framework](https://img.shields.io/badge/Gin-v1.10.1-008080?style=for-the-badge&logo=go&logoColor=white)](https://gin-gonic.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Calls-FFA500?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org)
[![WebSocket](https://img.shields.io/badge/WebSocket-Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![PWA](https://img.shields.io/badge/PWA-Supported-5A29E4?style=for-the-badge&logo=progress&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

**Kairo Messenger** — это современное, быстрое и стильное веб-приложение для обмена сообщениями в реальном времени, поддерживающее голосовые и видеозвонки по технологии WebRTC, отправку медиафайлов, голосовых сообщений и встроенный перевод. Приложение построено на базе высокопроизводительного бэкенда на Go (Gin) и отзывчивого SPA-фронтенда на чистом JavaScript (без тяжелых фреймворков), что обеспечивает мгновенную загрузку и плавные микроанимации.

---

## ✨ Ключевые возможности

*   **⚡ Реальный времени (Realtime)**: Мгновенная доставка сообщений, индикация набора текста (typing...) и отметки о прочтении на базе WebSockets.
*   **📞 WebRTC Аудио/Видео звонки**: Прямые peer-to-peer звонки прямо в браузере с поддержкой STUN-серверов.
*   **🎙️ Голосовые сообщения**: Удобная запись аудиосообщений с визуальным отображением и отправкой в формате MP3.
*   **🖼️ Обмен медиафайлами**: Загрузка изображений, видео и документов.
*   **📝 Редактирование сообщений**: Возможность редактирования отправленных сообщений по двойному клику с отметкой *(ред.)*.
*   **🌐 Многоязычность (i18n)**: Полная локализация интерфейса (Русский, Английский) с автоматическим определением и сохранением выбора.
*   **📱 Адаптивный Glassmorphism UI**: Премиальный дизайн с эффектом матового стекла, темной темой, кастомными скроллбарами и плавной адаптацией под мобильные устройства.
*   **🔌 PWA (Offline-first)**: Поддержка Service Worker для кэширования статики и офлайн-доступа.

---

## 🏗️ Архитектура системы

```mermaid
graph TD
    %% Клиентская часть
    subgraph Client ["Клиент (Браузер)"]
        SPA["SPA (HTML5 / Vanilla JS / CSS)"]
        SW["Service Worker (PWA Cache)"]
        RTC["WebRTC (Peer-to-peer Calls)"]
    end

    %% Бэкенд
    subgraph Backend ["Go Backend (Gin Server)"]
        API["Gin API Gateway"]
        WS["WebSocket Hub (gorilla/websocket)"]
        Store["File Storage (Avatar/Voice/Media)"]
    end

    %% База данных
    subgraph Database ["Хранилище данных"]
        PG[(PostgreSQL 17)]
    end

    %% Связи
    SPA -->|HTTPS REST API| API
    SPA <-->|WebSockets /ws| WS
    SPA -->|Media Upload/Download| Store
    RTC <-->|Direct P2P Audio/Video| RTC
    API -->|pgxpool SQL| PG
    WS -->|Save & Read Messages| PG
```

---

## 📁 Структура проекта

```text
Kairo-Messenger/
├── cmd/
│   └── server/
│       └── main.go         # Точка входа в Go бэкенд
├── internal/
│   ├── config/             # Чтение конфигурации из окружения
│   ├── handlers/           # Контроллеры HTTP API и WebSocket
│   ├── middleware/         # JWT-авторизация и CORS
│   ├── models/             # Описание структур данных
│   ├── repository/         # Запросы к PostgreSQL через pgxpool
│   ├── storage/            # Хранение загружаемых медиафайлов
│   └── websocket/          # Менеджер WebSocket подключений (Hub / Client)
├── frontend/
│   ├── js/                 # Модули логики (auth, chat, webrtc, websocket, i18n, ui)
│   ├── icons/              # Иконки для PWA и интерфейса
│   ├── index.html          # Главная страница
│   ├── style.css           # Базовые стили Glassmorphism
│   ├── mobile-fixes.css    # Адаптивные стили для мобильных
│   └── sw.js               # Service Worker для PWA
├── uploads/                # Директория для загрузок (аватары, медиа, аудио)
├── messenger.sql           # Схема базы данных PostgreSQL
├── go.mod                  # Зависимости Go
└── go.sum
```

---

## 🚀 Быстрый старт (Локальный запуск)

### 1. Требования
*   **Go** 1.24 или выше
*   **PostgreSQL** 15+
*   **Браузер** с поддержкой WebRTC и WebSockets (Chrome, Firefox, Safari)

### 2. Подготовка базы данных
Создайте новую базу данных в PostgreSQL и импортируйте схему из файла `messenger.sql`:

```bash
# Создание базы данных
createdb kairo_messenger -U postgres

# Импорт схемы
psql -d kairo_messenger -U postgres -f messenger.sql
```

### 3. Переменные окружения (`.env`)
Создайте файл конфигурации или экспортируйте следующие переменные окружения:

```bash
export PORT=3000
export DATABASE_URL="postgres://postgres:password@localhost:5432/kairo_messenger?sslmode=disable"
export JWT_SECRET="your-super-secret-jwt-key"
export UPLOAD_DIR="./uploads"
export UPLOAD_URL="http://localhost:3000/uploads"
```

### 4. Запуск сервера бэкенда
Установите зависимости Go и запустите сервер:

```bash
# Загрузка зависимостей
go mod tidy

# Запуск сервера
go run ./cmd/server
```

После этого приложение будет доступно по адресу **`http://localhost:3000`**. Бэкенд автоматически раздает файлы фронтенда из папки `frontend` при переходе по корневому пути.

---

## 🛠️ API Эндпоинты

### Публичные маршруты (`/api`)
*   `POST /api/register` — регистрация нового пользователя.
*   `POST /api/login` — авторизация (выдает JWT-токен).

### WebSocket маршрут
*   `GET /ws` — эндпоинт для подключения WebSocket. Требует прохождения аутентификации внутри сокета.

### Приватные маршруты (требуют JWT в заголовке `Authorization: Bearer <token>`)
*   `GET /api/profile` — получение профиля текущего пользователя.
*   `PUT /api/profile` — обновление имени/аватара.
*   `GET /api/conversations` — список диалогов и групповых чатов пользователя.
*   `POST /api/conversations/direct` — создание приватного чата тет-а-тет.
*   `POST /api/conversations/group` — создание группового чата.
*   `GET /api/messages` — история сообщений чата.
*   `POST /api/messages` — отправка сообщений и файлов.

---

## 🔒 Безопасность и WebRTC звонки
*   **JWT авторизация**: Доступ к сокетам и API защищен токенами с ограниченным временем жизни.
*   **WebRTC Signaling**: Сигнальные сообщения (`offer`, `answer`, `ice-candidates`) передаются через изолированный канал WebSocket внутри диалогов только авторизованным участникам.
*   **Безопасный контекст (HTTPS)**: Для работы микрофона и камеры при звонках в продакшене браузеры требуют запуска приложения по протоколу HTTPS или на `localhost`.

---

## 🌟 Разработчики и Контрибьюторы
Приложение создано и оптимизировано для демонстрации современных подходов веб-разработки (PWA, WebRTC, чистый JavaScript). Ваши предложения по улучшению функционала звонков и интерфейса приветствуются через Pull Requests!

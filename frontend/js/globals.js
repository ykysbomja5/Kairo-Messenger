



(function () {
    try {
        var _tries = 0;
        function _hideSplashIfStuck() {
            try {
                var s = document.getElementById('splash-screen');
                var m = document.getElementById('auth-modal');
                if (s && s.style.display !== 'none') {
                    s.style.display = 'none';
                    if (m) m.classList.add('active');
                }
            } catch (e) { }
            if (++_tries < 3) setTimeout(_hideSplashIfStuck, 3000);
        }
        setTimeout(_hideSplashIfStuck, 3500);
    } catch (_) { }
})();





const chatData = [
];


const contactsData = [
];


const callsData = [
];


const splashScreen = document.getElementById('splash-screen');
const appContainer = document.getElementById('app-container');
const sidebar = document.querySelector('.sidebar');
const menuBtn = document.getElementById('menu-btn');
const dropdownMenu = document.getElementById('dropdown-menu');
const backBtn = document.getElementById('back-btn');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-btn');
const attachmentBtn = document.getElementById('attachment-btn');
const chatsList = document.getElementById('chats-list');
const currentChatName = document.getElementById('current-chat-name');
const currentChatAvatar = document.getElementById('current-chat-avatar');
const groupMembers = document.getElementById('group-members');

const langSwitcher = document.querySelector('.lang-switcher');
const themeToggle = document.getElementById('theme-toggle');
const searchInput = document.getElementById('search-input');
const fileInput = document.getElementById('file-input');
const homeLogo = document.getElementById('home-logo');
const avatarInput = document.getElementById('avatar-input');
const profileAvatar = document.getElementById('profile-avatar');


const _API_BASE = (window.API_BASE && typeof window.API_BASE === 'string')
    ? window.API_BASE.replace(/\/$/, '')
    : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000'
        : ''
    );



const mainContentEl = document.querySelector('.main-content');
let CALL_ROLE = null; let CALL_MEDIA = null; let CALL_PEER_NAME = null;

const audioCallBtn = document.getElementById('audio-call-btn');
const videoCallBtn = document.getElementById('video-call-btn');


const createGroupBtn = document.getElementById('create-group-btn');
const createChatBtn = document.getElementById('create-chat-btn');
const createGroupModal = document.getElementById('create-group-modal');
const createChatModal = document.getElementById('create-chat-modal');
const closeGroupModal = document.getElementById('close-group-modal');
const closeChatModal = document.getElementById('close-chat-modal');
const cancelGroupBtn = document.getElementById('cancel-group');
const cancelChatBtn = document.getElementById('cancel-chat');
const createGroupBtnModal = document.getElementById('create-group');
const createChatBtnModal = document.getElementById('create-chat');
const groupContactsList = document.getElementById('group-contacts-list');
const chatMenuBtn = document.getElementById('chat-menu-btn');
const chatDropdownMenu = document.getElementById('chat-dropdown-menu');
const showProfileBtn = document.getElementById('show-profile-btn');
const blockContactBtn = document.getElementById('block-contact-btn');
const leaveGroupBtn = document.getElementById('leave-group-btn');
const groupInfoBtn = document.getElementById('group-info-btn');
const groupInfoModal = document.getElementById('group-info-modal');
const closeGroupInfo = document.getElementById('close-group-info');
const groupInfoName = document.getElementById('group-info-name');
const groupInfoAvatar = document.getElementById('group-info-avatar');
const groupInfoCreated = document.getElementById('group-info-created');
const groupInfoMembersCount = document.getElementById('group-info-members-count');
const groupMembersList = document.getElementById('group-members-list');
const groupAvatarContainer = document.getElementById('group-avatar-container');
const groupAvatarPreview = document.getElementById('group-avatar-preview');
const groupAvatarInput = document.getElementById('group-avatar-input');
const sendMessageContactBtn = document.getElementById('send-message-contact-btn');
const callContactProfileBtn = document.getElementById('call-contact-profile-btn');
const contactProfileName = document.getElementById('contact-profile-name');
const contactProfileAvatar = document.getElementById('contact-profile-avatar');
const contactProfilePhone = document.getElementById('contact-profile-phone');
const contactProfileEmail = document.getElementById('contact-profile-email');
const contactProfileStatus = document.getElementById('contact-profile-status');


let currentChatId = null;
let isRecording = false;
let currentCall = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingStartTime = null;
let audioContext = null;
let audioAnalyser = null;
let waveBars = [];
let animationId = null;
let currentAudio = null;
let myUserId = null;
let socket = null;
let chatMessages = {};
let currentLang = 'en';
let groupAvatarUrl = null;
let currentContactProfile = null;
let authToken = null;
let registrationAvatarUrl = null;
let currentUser = { email: null, avatar: null, phone: null, status: 'Online', regDate: null };
const API_BASE = window.API_BASE || `${location.protocol}//${location.host}`;


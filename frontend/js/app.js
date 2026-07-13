function initApp() {

    authModal.classList.remove('active');
    appContainer.style.display = 'block';


    updateProfileDisplay();


    fetchAndLoadConversations();

    renderChats();
    renderContacts();
    renderCalls();


    initEventListeners();


    initWebSocket();
}



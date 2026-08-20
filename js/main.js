document.getElementById('loginBtn').addEventListener('click', doLogin);

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !document.getElementById('loginPage').classList.contains('hidden')) {
        doLogin();
    }
});

document.getElementById('logoutBtn').addEventListener('click', doLogout);

var navItems = document.querySelectorAll('.sidebar .nav > li');
for (var i = 0; i < navItems.length; i++) {
    navItems[i].addEventListener('click', function(e) {
        if (this.classList.contains('has-submenu')) return;
        if (this.classList.contains('nav-label')) return;
        var page = this.getAttribute('data-page');
        if (page) switchPage(page);
    });
}

document.getElementById('quickSolveBtn').addEventListener('click', function() {
    switchPage('solve');
});

document.getElementById('sendBtn').addEventListener('click', function() {
    sendMessage('chatInput', 'chatMessages');
});

document.getElementById('solveSendBtn').addEventListener('click', function() {
    if (currentSolveTab === 'camera') {
        solveImage();
    } else {
        sendSolve();
    }
});

document.getElementById('uploadBox').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});

document.getElementById('chatInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessage('chatInput', 'chatMessages');
});
// 下拉子菜单点击
// 下拉子菜单点击
var subListItems = document.querySelectorAll('.submenu-list li');
for (var i = 0; i < subListItems.length; i++) {
    subListItems[i].addEventListener('click', function(e) {
        e.stopPropagation();
        var page = this.getAttribute('data-page');
        if (page) switchPage(page);
    });
}
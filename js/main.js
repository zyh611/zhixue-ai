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

var subListItems = document.querySelectorAll('.submenu-list li');
for (var i = 0; i < subListItems.length; i++) {
    subListItems[i].addEventListener('click', function(e) {
        e.stopPropagation();
        var page = this.getAttribute('data-page');
        if (page) switchPage(page);
    });
}

function renderSynergyIfActive() {
    var panel = document.getElementById("page-synergy");
    if (panel && panel.classList.contains("active")) {
        var target = document.getElementById("synergyPanel");
        if (target) {
            target.innerHTML = renderSynergyPanel();
            setTimeout(function(){
                document.querySelectorAll('.m-fill').forEach(function(el){
                    el.style.width = el.getAttribute('data-value') + '%';
                });
            }, 300);
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    renderSynergyIfActive();
});

var synergyObserver = new MutationObserver(function() {
    renderSynergyIfActive();
});

var synergyPage = document.getElementById("page-synergy");
if (synergyPage) {
    synergyObserver.observe(synergyPage, {
        attributes: true,
        attributeFilter: ["class"]
    });
}

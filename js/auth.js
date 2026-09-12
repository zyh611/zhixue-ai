function doLogin() {
    var username = document.getElementById('loginUsername').value.trim();
    var password = document.getElementById('loginPassword').value.trim();

    if (!username || !password) {
        alert('请输入用户名和密码');
        return;
    }

    fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('psych_username', data.user.username);
            localStorage.setItem('psych_logged', 'true');

            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('app').classList.add('active');
            document.getElementById('sidebarUsername').textContent = data.user.username;
            document.getElementById('avatarLetter').textContent = data.user.username.charAt(0).toUpperCase();
            document.getElementById('modeUserName').textContent = data.user.username;
            switchPage('mode');
            updateStats(data.user);
        } else {
            alert(data.message || '登录失败');
        }
    })
    .catch(function(err) {
        console.error('登录失败:', err);
        alert('网络错误，请检查后端是否启动');
    });
}

function doLogout() {
    localStorage.removeItem('psych_logged');
    localStorage.removeItem('psych_username');
    localStorage.removeItem('token');
    document.getElementById('app').classList.remove('active');
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('loginUsername').value = 'student';
    document.getElementById('loginPassword').value = '123456';
}

function updateStats(user) {
    var stats = document.querySelectorAll('.stat-card .value');
    if (stats.length >= 4) {
        stats[0].innerHTML = user.solvedCount || '0';
        stats[1].innerHTML = (user.accuracy || 0) + '%';
    }
}

(function() {
    if (localStorage.getItem('psych_logged') === 'true') {
        var savedUser = localStorage.getItem('psych_username') || 'student';
        var token = localStorage.getItem('token');

        if (token) {
            fetch(API_BASE + '/auth/profile', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.success) {
                    document.getElementById('loginPage').classList.add('hidden');
                    document.getElementById('app').classList.add('active');
                    document.getElementById('sidebarUsername').textContent = data.user.username;
                    document.getElementById('avatarLetter').textContent = data.user.username.charAt(0).toUpperCase();
                    document.getElementById('modeUserName').textContent = data.user.username;
                    switchPage('mode');
                } else {
                    localStorage.removeItem('psych_logged');
                    localStorage.removeItem('token');
                }
            })
            .catch(function() {
                document.getElementById('loginPage').classList.add('hidden');
                document.getElementById('app').classList.add('active');
                document.getElementById('sidebarUsername').textContent = savedUser;
                document.getElementById('avatarLetter').textContent = savedUser.charAt(0).toUpperCase();
                document.getElementById('modeUserName').textContent = savedUser;
                switchPage('mode');
            });
        }
    }
})();
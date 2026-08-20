var currentSolveTab = 'camera';

function switchSolveTab(tab) {
    currentSolveTab = tab;
    document.getElementById('tabCamera').className = tab === 'camera' ? 'topbar-btn primary' : 'topbar-btn outline';
    document.getElementById('tabText').className = tab === 'text' ? 'topbar-btn primary' : 'topbar-btn outline';
    document.getElementById('solveCamera').style.display = tab === 'camera' ? 'block' : 'none';
    document.getElementById('solveText').style.display = tab === 'text' ? 'block' : 'none';
}

function fillInput(text) { document.getElementById('solveInput').value = text; }

function handleFileSelect(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('uploadBox').style.display = 'none';
        document.getElementById('previewBox').style.display = 'block';
        document.getElementById('ocrResult').innerHTML = '👆 上传成功 请点击识别并搜题...';
    };
    reader.readAsDataURL(file);
}

function clearImage() {
    document.getElementById('previewImg').src = '';
    document.getElementById('previewBox').style.display = 'none';
    document.getElementById('uploadBox').style.display = 'flex';
    document.getElementById('fileInput').value = '';
    document.getElementById('ocrResult').innerHTML = '💡 上传图片后 AI 将自动识别题目...';
}

function formatAnswer(rawAnswer) {
    return rawAnswer.replace(/\\\\/g,'\\').replace(/\\\(/g,'\\(').replace(/\\\)/g,'\\)').replace(/\\\[/g,'\\[').replace(/\\\]/g,'\\]').replace(/\n/g,'<br>');
}

function renderMath(element) { if(window.MathJax){ MathJax.typesetPromise([element]); } }

function saveSolveRecord(question, answer, duration) {
    var history = JSON.parse(localStorage.getItem("solve_history") || "[]");
    history.unshift({ question: question, answer: answer, duration: duration, correct: true, time: new Date().toISOString() });
    localStorage.setItem("solve_history", JSON.stringify(history.slice(0, 100)));
    var streak = parseInt(localStorage.getItem("solve_streak") || "0") + 1;
    localStorage.setItem("solve_streak", streak);
    updateAllStats();
}


function updateAllStats() {
    var history = JSON.parse(localStorage.getItem("solve_history") || "[]");
    var today = new Date().toDateString();
    var todayList = history.filter(function(h){ return new Date(h.time).toDateString() === today; });
    var todayCount = todayList.length;
    var total = history.length;

    var validDurations = history.filter(function(h){ return h.duration && h.duration > 0; });
    var avgTime = validDurations.length > 0 
        ? Math.round(validDurations.reduce(function(s,h){ return s + h.duration; }, 0) / validDurations.length) 
        : 0;

    document.getElementById("dashTotal").textContent = total;
    document.getElementById("dashToday").textContent = todayCount;
    document.getElementById("dashAvg").innerHTML = avgTime + "<small>秒</small>";

    document.getElementById("solveCamTotal").textContent = total;
    document.getElementById("solveCamToday").textContent = todayCount;
    document.getElementById("solveCamAvg").textContent = avgTime;

    document.getElementById("solveTextTotal").textContent = total;
    document.getElementById("solveTextToday").textContent = todayCount;
    document.getElementById("solveTextAvg").textContent = avgTime;

    document.getElementById("hisTotal").textContent = total;
    document.getElementById("hisToday").textContent = todayCount;
    document.getElementById("hisAvg").textContent = avgTime;

    var list = document.getElementById("historyList");
    if(list && history.length > 0){
        var html = "";
        for(var i=0;i<history.length&&i<20;i++){
            var h=history[i];
            html += "<div class='diary-card'><div style='display:flex;justify-content:space-between;'><div><div style='color:#fff;font-weight:600;'>"+h.question+"</div><div style='color:rgba(255,255,255,0.4);font-size:12px;'>⏱️ "+(h.duration||0)+"秒 · "+new Date(h.time).toLocaleString()+"</div></div><button style='background:rgba(255,82,82,0.1);border:none;color:#ff5252;padding:4px 10px;border-radius:8px;cursor:pointer;font-size:11px;' onclick='deleteHistory("+i+")'>✕</button></div></div>";
        }
        list.innerHTML = html;
    }
}

function addFavorite(question, answer) {
    var favs = JSON.parse(localStorage.getItem("solve_favorites") || "[]");
    var exists = favs.some(function(f){ return f.question === question; });
    if(exists){ alert("已经收藏过了"); return; }
    favs.unshift({ question: question, answer: answer, time: new Date().toISOString() });
    localStorage.setItem("solve_favorites", JSON.stringify(favs.slice(0, 50)));
    alert("✅ 已收藏");
    if(typeof updateFavList === 'function') updateFavList();
}

var solveCameraMode = 'solve';

function solveImage() {
    if (solveCameraMode === 'reset') {
        resetSolveCamera();
        return;
    }
    var fileInput = document.getElementById('fileInput');
    var file = fileInput.files[0];
    if (!file) { alert('请先上传图片'); return; }
    var resultDiv = document.getElementById('ocrResult');
    resultDiv.innerHTML = '👆请点击搜题...';
    var token = localStorage.getItem('token');
    if (!token) { alert('请先登录'); return; }
    var startTime = Date.now();
    var formData = new FormData();
    formData.append('image', file);
    fetch(API_BASE + '/solve/image', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
    })
    .then(function(res){ return res.json(); })
    .then(function(data){
        if (data.ocrText) {
            resultDiv.innerHTML = '🧠 AI 正在解题中...';
            return fetch(API_BASE + '/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ question: data.ocrText })
            });
        } else {
            resultDiv.innerHTML = '❌ ' + (data.message || '识别失败');
            throw new Error('OCR失败');
        }
    })
    .then(function(res){ return res.json(); })
    .then(function(data){
        if (data.success) {
            var duration = Math.round((Date.now() - startTime) / 1000);
            document.getElementById('uploadBox').style.display = 'none';
            document.getElementById('previewBox').style.display = 'none';
            resultDiv.style.width = '100%';
            resultDiv.style.minHeight = '400px';
            resultDiv.innerHTML = formatAnswer(data.answer);
            renderMath(resultDiv);
            saveSolveRecord("图片解题", data.answer, duration);

            solveCameraMode = 'reset';
            var btn = document.getElementById('solveImageBtn');
            if (btn) {
                btn.textContent = '← 返回重拍';
                btn.className = 'topbar-btn outline';
            }
        } else {
            resultDiv.innerHTML = '❌ 解题失败';
        }
    })
    .catch(function(err){ 
        if (err.message !== 'OCR失败') resultDiv.innerHTML = '❌ 网络错误'; 
    });
}

function resetSolveCamera() {
    solveCameraMode = 'solve';
    var uploadBox = document.getElementById('uploadBox');
    var previewBox = document.getElementById('previewBox');
    var previewImg = document.getElementById('previewImg');
    var fileInput = document.getElementById('fileInput');
    var resultDiv = document.getElementById('ocrResult');
    var btn = document.getElementById('solveImageBtn');
    if (uploadBox) uploadBox.style.display = 'flex';
    if (previewBox) previewBox.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (fileInput) fileInput.value = '';
    if (resultDiv) {
        resultDiv.innerHTML = '💡 上传图片后 AI 将自动识别题目...';
        resultDiv.style.width = '';
        resultDiv.style.minHeight = '';
    }
    if (btn) {
        btn.textContent = '🚀 识别并解题';
        btn.className = 'topbar-btn primary';
        btn.setAttribute('onclick', 'solveImage()');
    }
}

function sendSolve() {
    var input = document.getElementById('solveInput');
    var resultDiv = document.getElementById('solveResult');
    var text = input.value.trim();
    if(!text) return;
    var token = localStorage.getItem('token');
    if(!token){ alert('请先登录'); return; }
    var startTime = Date.now();
    resultDiv.innerHTML = '🧠 AI 正在思考中...';
    fetch(API_BASE + '/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ question: text })
    })
    .then(function(res){ return res.json(); })
    .then(function(data){
        var duration = Math.round((Date.now() - startTime) / 1000);
           if(data.success){
    resultDiv.innerHTML = "<div style='display:flex;justify-content:flex-end;margin-bottom:8px;'><button class='topbar-btn outline' style='font-size:11px;padding:4px 12px;border-color:rgba(255,215,0,0.3);color:#ffd700;' onclick='addFavorite(\"" + text.replace(/"/g,"\\\"") + "\",\"" + data.answer.replace(/"/g,"\\\"").replace(/\n/g,"\\n") + "\")'>☆ 收藏</button></div>" + formatAnswer(data.answer);
            renderMath(resultDiv);
            saveSolveRecord(text, data.answer, duration);
        } else { resultDiv.innerHTML = '❌ 解题失败'; }
    })
    .catch(function(){ resultDiv.innerHTML = '❌ 网络错误'; });
    input.value = '';
}

function sendMessage(inputId, messagesId) {
    var input = document.getElementById(inputId);
    var messages = document.getElementById(messagesId);
    var text = input.value.trim();
    if(!text) return;
    var userMsg = document.createElement('div');
    userMsg.className = 'msg user';
    userMsg.textContent = text;
    messages.appendChild(userMsg);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;
    var token = localStorage.getItem('token');
    if(!token) return;
    var startTime = Date.now();
    fetch(API_BASE + '/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ question: text })
    })
    .then(function(res){ return res.json(); })
    .then(function(data){
        var duration = Math.round((Date.now() - startTime) / 1000);
        var botMsg = document.createElement('div');
        botMsg.className = 'msg bot';
        if(data.success){
            botMsg.innerHTML = "<div style='display:flex;justify-content:flex-end;margin-bottom:4px;'><button class='topbar-btn outline' style='font-size:11px;padding:3px 10px;border-color:rgba(255,215,0,0.3);color:#ffd700;' onclick='addFavorite(\"" + text.replace(/"/g,"\\\"") + "\",\"" + data.answer.replace(/"/g,"\\\"").replace(/\n/g,"\\n") + "\")'>☆ 收藏</button></div><span class='ai-label'>🤖 AI 小智</span>" + formatAnswer(data.answer);
            renderMath(botMsg);
            saveSolveRecord(text, data.answer, duration);
        } else { botMsg.textContent = '解题失败'; }
        messages.appendChild(botMsg);
        messages.scrollTop = messages.scrollHeight;
    })
    .catch(function(){
        var botMsg = document.createElement('div');
        botMsg.className = 'msg bot';
        botMsg.textContent = '网络错误';
        messages.appendChild(botMsg);
    });
}

function deleteHistory(index) {
    var history = JSON.parse(localStorage.getItem("solve_history") || "[]");
    history.splice(index, 1);
    localStorage.setItem("solve_history", JSON.stringify(history));
    updateAllStats();
}


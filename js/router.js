var pageMap = {
    mode:          { title: '◈ 模式选择', sub: '请选择服务' },
    dashboard:     { title: '◉ 工作台', sub: '今日已解 3 题' },
    solve:         { title: '✦ 智解习题', sub: 'AI 深度解析' },
    'sport-plan':  { title: '◇ 运动计划', sub: 'AI 专属定制' },
    'sport-diet':  { title: '◆ 饮食推荐', sub: '科学营养搭配' },
    'sport-track': { title: '◎ 卡路里追踪', sub: '每日摄入消耗' },
    'sport-moves': { title: '◉ 动作库', sub: '标准动作教学' },
    'psych-chat':  { title: '♡ 心灵对话', sub: 'AI 心理倾听师' },
    'psych-diary': { title: '☽ 情绪日记', sub: '记录心情变化' },
    'psych-relax': { title: '♫ 放松减压', sub: '呼吸引导 · 白噪音' },
    'psych-know':  { title: '☯ 心理知识', sub: '了解自己关爱心灵' },
    wrong:         { title: '🔄 错题重练', sub: '回顾错题巩固薄弱' },
    history:       { title: '◷ 解题历史', sub: '共 23 条记录' },
    subjects:      { title: '☰ 学科题库', sub: '4 个学科' },
    favorites:     { title: '☆ 收藏夹', sub: '12 道收藏' },
    formulas:      { title: '∫ 公式手册', sub: '常用公式汇总' },
    settings:      { title: '⚙ 设置', sub: '个性化配置' }
};

function switchPage(pageId) {
    var panels = document.querySelectorAll('.page-panel');
    for (var i = 0; i < panels.length; i++) {
        panels[i].classList.remove('active');
    }
    var target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');

    var navItems = document.querySelectorAll('.sidebar .nav li');
    for (var j = 0; j < navItems.length; j++) {
        navItems[j].classList.remove('active');
    }
    if (pageId !== 'mode') {
        var navItem = document.querySelector('.sidebar .nav li[data-page="' + pageId + '"]');
        if (navItem) navItem.classList.add('active');
    }

    var sidebar = document.querySelector('.sidebar');
    var topbar = document.querySelector('.topbar');
    if (pageId === 'mode') {
        sidebar.style.display = 'none';
        topbar.style.display = 'none';
    } else {
        sidebar.style.display = '';
        topbar.style.display = '';
    }

    var quickBtn = document.getElementById('quickSolveBtn');
    if (quickBtn) {
        quickBtn.style.display = (pageId === 'solve' || pageId === 'dashboard') ? 'inline-block' : 'none';
    }

    var info = pageMap[pageId];
    if (info) {
        document.getElementById('pageTitle').innerHTML = info.title + ' <small>' + info.sub + '</small>';
    }
}
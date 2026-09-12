// ==================== 知行愈 · 学生身心协同动态评估算法 ====================
// 版本：M-TDIA v2.0
// 说明：基于行为序列计算状态、趋势、稳定性、持续性，
//      再用风险驱动的 Softmax 动态权重生成 0~100 综合成长指数。
//      本模块只做辅助评估，不进行心理疾病诊断。

(function () {
    'use strict';

    var HISTORY_KEY = 'synergy_daily_history';
    var FEEDBACK_KEY = 'synergy_feedback_history';
    var VERSION = 'M-TDIA-2.0';
    var DAY_MS = 24 * 60 * 60 * 1000;
    // M-TDIA 历史与反馈数据仅保存在当前浏览器本地 localStorage，不依赖服务器数据库。

    function getJSON(key, fallback) {
        try {
            var value = JSON.parse(localStorage.getItem(key) || 'null');
            return value == null ? (fallback || []) : value;
        } catch (e) {
            return fallback || [];
        }
    }

    function getNumber(key, defaultValue) {
        var val = parseFloat(localStorage.getItem(key));
        return isNaN(val) ? defaultValue : val;
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function round1(v) {
        return Math.round(v * 10) / 10;
    }

    function dateKey(date) {
        var d = date || new Date();
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    function daysBetween(a, b) {
        return Math.round((new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / DAY_MS);
    }

    // ---------- 原始三维状态 ----------
    function calcLearnScore() {
        var history = getJSON('solve_history');
        var wrong = getJSON('wrong_questions');
        var quizAccuracy = getNumber('quiz_accuracy', 0.70);
        var totalSolved = history.length + wrong.length;
        if (totalSolved === 0) return Math.round(clamp(quizAccuracy * 100, 0, 100));
        var activity = Math.min(30, totalSolved * 2);
        var accuracyScore = quizAccuracy * 70;
        return Math.round(clamp(activity + accuracyScore, 0, 100));
    }

    function calcSportScore() {
        var schedule = getJSON('sport_schedule');
        if (!schedule.length) return 58;
        var done = schedule.filter(function (s) { return s.done; }).length;
        var rate = done / schedule.length;
        return Math.round(clamp(45 + rate * 55, 0, 100));
    }

    function calcPsychScore() {
        var relaxCount = getNumber('relax_count', 0);
        var chatScore = getNumber('psych_chat_score', 65);
        var score = 65;
        if (relaxCount > 0) score += Math.min(20, relaxCount * 2);
        else score -= 5;
        score = score * 0.7 + chatScore * 0.3;
        return Math.round(clamp(score, 0, 100));
    }

    // ---------- 时序数据 ----------
    function getDailyHistory() {
        return getJSON(HISTORY_KEY, []).sort(function (a, b) {
            return new Date(a.date) - new Date(b.date);
        });
    }

    function saveDailyHistory(list) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-30)));
    }

    function ensureTodaySnapshot(raw) {
        var list = getDailyHistory();
        var today = dateKey();
        var snapshot = {
            date: today,
            timestamp: new Date().toISOString(),
            learn: raw.learn,
            sport: raw.sport,
            psych: raw.psych,
            indexRaw: round1((raw.learn + raw.sport + raw.psych) / 3),
            version: VERSION
        };
        var idx = list.findIndex(function (x) { return x.date === today; });
        if (idx >= 0) list[idx] = snapshot;
        else list.push(snapshot);
        saveDailyHistory(list);
        return list;
    }

    function buildSeries(dimension, current) {
        var list = getDailyHistory();
        var values = list.map(function (x) { return Number(x[dimension]); }).filter(function (x) { return isFinite(x); });
        if (!values.length || values[values.length - 1] !== current) values.push(current);
        return values.slice(-14);
    }

    // 近几天斜率，归一化到 -1~1
    function calcTrend(series) {
        if (series.length < 2) return 0;
        var n = series.length;
        var xMean = (n - 1) / 2;
        var yMean = series.reduce(function (s, v) { return s + v; }, 0) / n;
        var numerator = 0, denominator = 0;
        for (var i = 0; i < n; i++) {
            numerator += (i - xMean) * (series[i] - yMean);
            denominator += Math.pow(i - xMean, 2);
        }
        var slope = denominator ? numerator / denominator : 0;
        return clamp(slope / 5, -1, 1);
    }

    // 波动越小，稳定性越高
    function calcStability(series) {
        if (series.length < 2) return 0.75;
        var mean = series.reduce(function (s, v) { return s + v; }, 0) / series.length;
        var variance = series.reduce(function (s, v) { return s + Math.pow(v - mean, 2); }, 0) / series.length;
        var std = Math.sqrt(variance);
        return clamp(1 - std / 25, 0, 1);
    }

    // 连续低于基准线的程度
    function calcPersistence(series, threshold) {
        if (!series.length) return 0;
        var count = 0;
        for (var i = series.length - 1; i >= 0; i--) {
            if (series[i] < threshold) count++;
            else break;
        }
        return clamp(count / 7, 0, 1);
    }

    function calcStateScore(current, series) {
        var trend = calcTrend(series);
        var stability = calcStability(series);
        var persistence = calcPersistence(series, 60);

        // 当前水平、趋势、稳定性、持续性四项融合
        // 趋势映射为 0~100；稳定性与持续性对状态作轻量修正。
        var level = current;
        var trendScore = 50 + trend * 50;
        var stabilityScore = stability * 100;
        var persistencePenalty = persistence * 20;

        var score = 0.55 * level + 0.20 * trendScore + 0.15 * stabilityScore + 0.10 * (100 - persistencePenalty);
        return {
            score: round1(clamp(score, 0, 100)),
            trend: round1(trend * 100),
            stability: round1(stability * 100),
            persistence: round1(persistence * 100),
            series: series
        };
    }

    // ---------- 风险与动态权重 ----------
    function calcRisk(state) {
        // 风险越高，代表该维度越需要被优先干预。
        var levelRisk = (100 - state.score) / 100;
        var trendRisk = Math.max(0, -state.trend / 100);
        var persistenceRisk = state.persistence / 100;
        var volatilityRisk = 1 - state.stability / 100;
        return round1(clamp(100 * (
            0.45 * levelRisk +
            0.25 * trendRisk +
            0.20 * persistenceRisk +
            0.10 * volatilityRisk
        ), 0, 100));
    }

    function softmaxWeights(risks) {
        var temperature = 0.045;
        var maxR = Math.max(risks.learn, risks.sport, risks.psych);
        var eL = Math.exp((risks.learn - maxR) * temperature);
        var eS = Math.exp((risks.sport - maxR) * temperature);
        var eP = Math.exp((risks.psych - maxR) * temperature);
        var sum = eL + eS + eP;
        return { learn: eL / sum, sport: eS / sum, psych: eP / sum };
    }

    // 短期风险预测：无训练数据时采用可解释的规则预测器，接口保留后续接入 LR/XGBoost 的空间。
    function predictRisk(state) {
        var probability = clamp(
            0.50 +
            (50 - state.score) / 100 +
            Math.max(0, -state.trend) / 160 +
            state.persistence / 220 +
            (50 - state.stability) / 400,
            0.03, 0.97
        );
        return round1(probability * 100);
    }

    function selectInterventions(states, risks) {
        var items = [
            { key: 'learn', name: '学习', risk: risks.learn, action: '错题重练 + 25 分钟番茄学习', reason: '学习状态或趋势需要优先改善' },
            { key: 'sport', name: '运动', risk: risks.sport, action: '20~30 分钟低至中强度运动', reason: '运动完成度或连续性偏弱' },
            { key: 'psych', name: '心理支持', risk: risks.psych, action: '5 分钟呼吸放松 + 情绪记录', reason: '近期状态波动或压力信号较明显' }
        ];
        items.sort(function (a, b) { return b.risk - a.risk; });
        var top = items[0];
        var second = items[1];
        var advice = [top.name + '优先：' + top.action];
        if (second.risk >= 45) advice.push(second.name + '协同：' + second.action);
        if (top.risk >= 70) advice.push('连续风险较高，建议降低当日目标并增加休息；如出现明显心理危机，请及时联系学校心理中心或专业人员。');
        else if (top.risk >= 50) advice.push('建议未来 3 天持续记录该维度，观察干预后的变化。');
        else advice.push('当前三维状态较平稳，可维持现有节奏。');
        return { primary: top, secondary: second, advice: advice };
    }

    function getFeedbackHistory() {
        return getJSON(FEEDBACK_KEY, []);
    }

    function recordFeedback(previousIndex, currentIndex) {
        if (typeof previousIndex !== 'number' || typeof currentIndex !== 'number') return;
        var list = getFeedbackHistory();
        list.push({
            date: new Date().toISOString(),
            previous: round1(previousIndex),
            current: round1(currentIndex),
            reward: round1(currentIndex - previousIndex)
        });
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list.slice(-30)));
    }

    function hasActualUserData() {
        var solveHistory = getJSON('solve_history', []);
        var wrongQuestions = getJSON('wrong_questions', []);
        var sportSchedule = getJSON('sport_schedule', []);
        var relaxCount = getNumber('relax_count', 0);
        var hasPsychScore = localStorage.getItem('psych_chat_score') !== null;
        return solveHistory.length > 0 || wrongQuestions.length > 0 || sportSchedule.length > 0 || relaxCount > 0 || hasPsychScore;
    }

    function calculate() {
        // 首次使用且没有任何实际行为数据时，仅显示 0；有数据后完全沿用原 M-TDIA 计算公式。
        if (!hasActualUserData()) {
            return {
                version: VERSION,
                learn: 0,
                sport: 0,
                psych: 0,
                raw: { learn: 0, sport: 0, psych: 0 },
                states: {
                    learn: { score: 0, trend: 0, stability: 0, persistence: 0, series: [] },
                    sport: { score: 0, trend: 0, stability: 0, persistence: 0, series: [] },
                    psych: { score: 0, trend: 0, stability: 0, persistence: 0, series: [] }
                },
                risks: { learn: 0, sport: 0, psych: 0 },
                weights: { learn: 1/3, sport: 1/3, psych: 1/3 },
                prediction: { learn: 0, sport: 0, psych: 0 },
                index: 0,
                intervention: { advice: ['开始记录：完成一次学习、运动或心理活动后，系统将开始动态评估。'] },
                historyDays: getDailyHistory().length,
                feedbackCount: getFeedbackHistory().length
            };
        }

        var raw = { learn: calcLearnScore(), sport: calcSportScore(), psych: calcPsychScore() };
        var daily = ensureTodaySnapshot(raw);

        var states = {
            learn: calcStateScore(raw.learn, buildSeries('learn', raw.learn)),
            sport: calcStateScore(raw.sport, buildSeries('sport', raw.sport)),
            psych: calcStateScore(raw.psych, buildSeries('psych', raw.psych))
        };

        var risks = {
            learn: calcRisk(states.learn),
            sport: calcRisk(states.sport),
            psych: calcRisk(states.psych)
        };

        var weights = softmaxWeights(risks);
        var index = clamp(
            weights.learn * states.learn.score +
            weights.sport * states.sport.score +
            weights.psych * states.psych.score,
            0, 100
        );

        var prediction = {
            learn: predictRisk(states.learn),
            sport: predictRisk(states.sport),
            psych: predictRisk(states.psych)
        };

        var intervention = selectInterventions(states, risks);
        var previous = getNumber('synergy_last_index', NaN);
        if (isFinite(previous) && Math.abs(previous - index) > 0.01) recordFeedback(previous, index);
        localStorage.setItem('synergy_last_index', String(round1(index)));

        return {
            version: VERSION,
            learn: Math.round(states.learn.score),
            sport: Math.round(states.sport.score),
            psych: Math.round(states.psych.score),
            raw: raw,
            states: states,
            risks: risks,
            weights: weights,
            prediction: prediction,
            index: round1(index),
            intervention: intervention,
            historyDays: daily.length,
            feedbackCount: getFeedbackHistory().length
        };
    }

    function calcSynergyIndex() {
        return calculate();
    }

    function getSynergyAdvice(result) {
        return result.intervention ? result.intervention.advice : [];
    }

    function getSynergyLevel(index) {
        if (index >= 80) return { text: '优秀', color: '#00e676' };
        if (index >= 65) return { text: '良好', color: '#69f0ae' };
        if (index >= 50) return { text: '一般', color: '#ffab00' };
        return { text: '待改善', color: '#ff5252' };
    }

    function pct(v) { return Math.round(v) + '%'; }

    function renderSynergyPanel() {
        var result = calcSynergyIndex();
        var advice = getSynergyAdvice(result);
        var level = getSynergyLevel(result.index);
        var score = Math.round(result.index);
        var circumference = 2 * Math.PI * 84;
        var offset = circumference * (1 - score / 100);
        var html = '';
        var dims = [
            ['learn', '学习', '学习状态', '✦', '#6b8cff', '#45d7ff'],
            ['sport', '运动', '运动状态', '◈', '#20d98a', '#7af7c7'],
            ['psych', '心理', '心理状态', '◇', '#b38cff', '#ff9ecf']
        ];

        html += '<div class="synergy synergy-v2"><div class="synergy-orb orb-a"></div><div class="synergy-orb orb-b"></div><div class="synergy-grid"></div><div class="synergy-inner">';
        html += '<div class="synergy-header"><div><div class="eyebrow">KNOW · ACT · GROW</div><div class="title">身心协同指数</div><div class="subtitle">M-TDIA · MULTI-DIMENSIONAL TEMPORAL DYNAMIC ASSESSMENT</div></div>';
        html += '<div class="status-pill"><i></i><span>动态评估中</span><b>' + level.text + '</b></div></div>';

        html += '<div class="hero-score"><div class="score-ring" style="--score:' + score + ';--ring-color:' + level.color + '"><div class="ring-glow"></div><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="ring-bg" cx="100" cy="100" r="84"></circle><circle class="ring-progress" cx="100" cy="100" r="84" style="stroke-dasharray:' + circumference + ';stroke-dashoffset:' + offset + '"></circle></svg><div class="score-center"><span>综合成长指数</span><strong>' + score + '</strong><em>/ 100</em></div></div>';
        html += '<div class="hero-copy"><div class="hero-kicker">TODAY’S GROWTH SIGNAL</div><h2>' + (score >= 80 ? '状态优秀，继续保持你的节奏' : score >= 65 ? '整体状态良好，正在稳定成长' : score >= 50 ? '还有提升空间，系统已找到突破口' : '先稳住节奏，我们一起逐步改善') + '</h2>';
        html += '<p>系统结合近期行为序列、趋势、稳定性与持续性动态计算，不再使用固定三维权重。</p><div class="hero-chips"><span>◷ ' + Math.min(14, result.historyDays) + ' 天序列</span><span>↗ 动态权重</span><span>◎ 3日风险预测</span></div></div></div>';

        html += '<div class="dimension-grid">';
        dims.forEach(function (d) {
            var s = result.states[d[0]], r = result.risks[d[0]], pred = result.prediction[d[0]], w = result.weights[d[0]] * 100;
            var trendClass = s.trend > 1 ? 'up' : s.trend < -1 ? 'down' : 'flat';
            var trendText = s.trend > 1 ? '↗ 上升' : s.trend < -1 ? '↘ 下降' : '→ 稳定';
            html += '<div class="dimension-card" style="--accent:' + d[4] + ';--accent2:' + d[5] + '"><div class="dim-top"><div class="dim-icon">' + d[3] + '</div><div><span>' + d[1] + '</span><small>' + d[2] + '</small></div><strong>' + result[d[0]] + '</strong></div>';
            html += '<div class="dim-bar"><i style="width:' + result[d[0]] + '%"></i></div><div class="dim-meta"><span class="trend ' + trendClass + '">' + trendText + ' ' + Math.abs(s.trend) + '</span><span>稳定 ' + pct(s.stability) + '</span></div>';
            html += '<div class="dim-risk"><span>动态权重 <b>' + w.toFixed(0) + '%</b></span><span>风险 <b>' + r + '</b></span><span>3日 <b>' + pred + '%</b></span></div></div>';
        });
        html += '</div>';

        html += '<div class="insight-grid"><div class="insight-card weight-card"><div class="section-kicker">ADAPTIVE WEIGHT</div><h3>当前关注重点</h3><div class="weight-list">';
        dims.slice().sort(function(a,b){return result.weights[b[0]]-result.weights[a[0]];}).forEach(function(d){var w=result.weights[d[0]]*100; html += '<div class="weight-row"><span>' + d[1] + '</span><div><i style="width:' + w + '%;background:linear-gradient(90deg,' + d[4] + ',' + d[5] + ')"></i></div><b>' + w.toFixed(0) + '%</b></div>';});
        html += '</div></div>';
        html += '<div class="insight-card intervention-card"><div class="section-kicker">NEXT BEST ACTION</div><h3>今日个性化建议</h3><div class="action-main"><span>✦</span><div><b>' + advice[0].split('：')[0] + '</b><p>' + advice[0].split('：').slice(1).join('：') + '</p></div></div><div class="action-list">';
        advice.slice(1).forEach(function(a){html += '<div>✓ ' + a + '</div>';});
        html += '</div></div></div>';

        html += '<div class="algorithm-note"><div><span>ALGORITHM ENGINE</span><b>M-TDIA v2.0</b></div><p>状态水平 × 趋势 × 稳定性 × 持续性 → 风险估计 → Softmax 动态权重 → 综合成长指数 → 个性化干预 → 反馈闭环</p><div class="note-dot"><i></i> 数据仅用于成长辅助，不用于疾病诊断</div></div>';
        html += '</div></div>';
        return html;
    }

    function updatePsychScoreFromChat(text) {
        if (!text) return;
        var negativeWords = ['焦虑','忧虑','担心','紧张','不安','烦','烦躁','烦闷','闹心','压力','压抑','喘不过气','累','疲惫','疲倦','精疲力尽','难过','伤心','难受','想哭','哭','崩溃','撑不住','受不了','害怕','恐惧','慌张','孤独','孤单','寂寞','迷茫','困惑','不知道怎么办','失眠','睡不着','睡眠不好'];
        var positiveWords = ['开心','高兴','愉快','快乐','轻松','放松','舒缓','好多了','好受','舒服','平静','平和','谢谢','感谢','有希望','期待','信心','不错','挺好','很好'];
        var change = 0, i;
        for (i = 0; i < negativeWords.length; i++) if (text.indexOf(negativeWords[i]) !== -1) change -= 4;
        for (i = 0; i < positiveWords.length; i++) if (text.indexOf(positiveWords[i]) !== -1) change += 4;
        var current = parseInt(localStorage.getItem('psych_chat_score') || '65', 10);
        current = Math.round(clamp(current + change, 0, 100));
        localStorage.setItem('psych_chat_score', current);
        if (typeof window.recordSynergySnapshot === 'function') window.recordSynergySnapshot();
        return current;
    }

    function recordSynergySnapshot() {
        var raw = { learn: calcLearnScore(), sport: calcSportScore(), psych: calcPsychScore() };
        ensureTodaySnapshot(raw);
    }

    window.calcLearnScore = calcLearnScore;
    window.calcSportScore = calcSportScore;
    window.calcPsychScore = calcPsychScore;
    window.calcSynergyIndex = calcSynergyIndex;
    window.getSynergyAdvice = getSynergyAdvice;
    window.getSynergyLevel = getSynergyLevel;
    window.renderSynergyPanel = renderSynergyPanel;
    window.updatePsychScoreFromChat = updatePsychScoreFromChat;
    window.recordSynergySnapshot = recordSynergySnapshot;

})();

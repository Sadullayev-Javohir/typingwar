/* TypingWar — 5x5 jamoaviy musobaqa (SignalR)
   Typing maydoni /Practice bilan bir xil (karet, qator surilishi, ovoz, ko'r rejim,
   xatoda to'xtash, auto-repeat himoyasi). Natijada har jamoa uchun alohida WPM grafigi. */
(function () {
    "use strict";

    const root = document.getElementById("tw-team");
    if (!root || !window.signalR) return;

    const qs = new URLSearchParams(location.search);
    const code = (qs.get("code") || "").toUpperCase();
    let mySide = (qs.get("side") || "A").toUpperCase() === "B" ? "B" : "A";
    const isAuth = root.dataset.authenticated === "true";
    const username = root.dataset.username || "";
    const S = window.TWSettings;

    let displayName = username;
    if (!isAuth) {
        displayName = localStorage.getItem("tw_guest") || ("Mehmon-" + Math.floor(1000 + Math.random() * 9000));
        localStorage.setItem("tw_guest", displayName);
    }

    const $ = id => document.getElementById(id);
    $("tw-team-code").textContent = code;

    const listA = $("tw-team-a"), listB = $("tw-team-b"), scoreAEl = $("tw-score-a"), scoreBEl = $("tw-score-b"),
        startBtn = $("tw-team-start"), endBtn = $("tw-team-end"), waitEl = $("tw-team-wait"), errEl = $("tw-team-err"),
        cdEl = $("tw-team-countdown"), raceEl = $("tw-team-race"), wordsEl = $("tw-team-words"),
        resultEl = $("tw-team-result"), verdictEl = $("tw-team-verdict"), detailEl = $("tw-team-detail"),
        switchBtn = $("tw-switch"), restartBtn = $("tw-team-restart"), rrWait = $("tw-team-rr-wait");
    const wpmEl = $("tw-team-wpm"), accEl = $("tw-team-acc"), timerEl = $("tw-team-timer");

    let myConnId = null, isHost = false;
    let myFinishPayload = null;
    const players = new Map();

    // typing holati (Practice bilan bir xil)
    let chars = [], letterEls = [], status = [], pos = 0, keypresses = 0,
        startTime = null, finished = false, lastReport = 0;
    let wordsInner = null, caretEl = null, liveTimer = null;
    let keyEvents = [];

    function esc(s) { return String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

    function normChar(ch) {
        switch (ch) {
            case "‐": case "‑": case "‒": case "–": case "—": case "―": case "−": return "-";
            case "‘": case "’": case "ʻ": case "ʼ": case "´": case "`": return "'";
            case "“": case "”": case "«": case "»": return '"';
            case " ": case " ": case " ": return " ";
            default: return ch;
        }
    }

    // ── Rang palitrasi (har o'yinchiga grafikda alohida rang, mushuk rangiga mos) ──
    const CHART_COLORS = [
        "#0070f3", "#5aa0ff", "#40d870", "#c060ff", "#ff5566",
        "#40d8e8", "#ff5599", "#ff9933", "#2dd4bf", "#8b5cf6"
    ];
    function colorFor(idx) { return CHART_COLORS[(idx || 0) % CHART_COLORS.length]; }
    function colorOf(r) { return colorFor(r ? (r.colorIndex || 0) : 0); }

    // ── O'yinchilar ro'yxati (A va B jamoalari, har birida mushuk) ──
    function renderPlayers() {
        listA.innerHTML = ""; listB.innerHTML = "";
        players.forEach((p, id) => {
            const isMe = id === myConnId;
            const colorIdx = p.colorIndex || 0;
            const crown = p.isHost
                ? '<i class="bi bi-crown-fill me-1" style="color:var(--tw-gold)"></i>' : '';
            const me = isMe ? ' <small style="color:#8a8aa0">(siz)</small>' : '';
            const li = document.createElement("li");
            li.className = "tw-player" + (p.finished ? " tw-done" : "");
            const track = window.TwCheetah
                ? window.TwCheetah.makeHtml(colorIdx, p.progress || 0)
                : `<div class="tw-bar"><div class="tw-bar-fill" style="width:${p.progress || 0}%"></div></div>`;
            li.innerHTML = `<div class="tw-player-top">
                <span>${crown}${esc(p.name)}${me}</span>
                <span class="tw-player-wpm">${Math.round(p.wpm || 0)} <small>wpm</small></span>
            </div>${track}`;
            (p.side === "B" ? listB : listA).appendChild(li);
            li.dataset.conn = id;
            applyCheetahState(li, p);
        });
    }

    const RUN_IDLE_MS = 700;
    function applyCheetahState(li, p) {
        const ch = li.querySelector(".tw-cheetah-run");
        if (!ch || !window.TwCheetah) return;
        const running = !p.finished && p.lastType && (performance.now() - p.lastType < RUN_IDLE_MS);
        window.TwCheetah.setRunning(ch, running);
        if (running) window.TwCheetah.setSpeed(ch, p.wpm || 0);
    }

    function updateRow(id) {
        const p = players.get(id);
        const li = root.querySelector('[data-conn="' + id + '"]');
        if (!p || !li) { renderPlayers(); return; }
        const wpmRow = li.querySelector(".tw-player-wpm");
        if (wpmRow) wpmRow.innerHTML = Math.round(p.wpm || 0) + " <small>wpm</small>";
        const ch = li.querySelector(".tw-cheetah-run");
        if (ch && window.TwCheetah) { window.TwCheetah.setPos(ch, p.progress || 0); applyCheetahState(li, p); }
        else { const f = li.querySelector(".tw-bar-fill"); if (f) f.style.width = (p.progress || 0) + "%"; }
        li.classList.toggle("tw-done", !!p.finished);
    }

    setInterval(() => players.forEach((p, id) => {
        const li = root.querySelector('[data-conn="' + id + '"]');
        if (li) applyCheetahState(li, p);
    }), 250);

    function setScores(s) {
        if (!s) return;
        scoreAEl.textContent = Math.round(s.a || 0);
        scoreBEl.textContent = Math.round(s.b || 0);
    }

    function updateHostUi() {
        startBtn.classList.toggle("d-none", !isHost);
        waitEl.classList.toggle("d-none", isHost);
    }

    function applyStatVisibility() {
        if (!S) return;
        const map = {
            "tw-team-stat-wpm": S.get("showLiveWpm"),
            "tw-team-stat-acc": S.get("showLiveAcc"),
            "tw-team-stat-timer": S.get("showLiveTimer")
        };
        for (const id in map) {
            const el = $(id);
            if (el) el.style.display = map[id] === false ? "none" : "";
        }
        const panel = $("tw-team-statspanel");
        if (panel) panel.style.display = (S.get("showStatsPanel") === false) ? "none" : "";
    }

    // ── SignalR ──
    const conn = new signalR.HubConnectionBuilder().withUrl("/hubs/teamrace").withAutomaticReconnect().build();

    conn.on("Error", m => { errEl.textContent = m; });
    conn.on("TeamState", s => {
        isHost = s.isHost;
        players.clear();
        s.players.forEach(p => players.set(p.connId, p));
        const me = players.get(myConnId); if (me) mySide = me.side;
        updateHostUi(); renderPlayers(); setScores(s.scores);
        // Poyga davom etayotgan bo'lsa (kech qo'shilish yoki qayta ulanish) — matnni darrov
        // ko'rsat. Aks holda TeamRaceStarting xabarini o'tkazib yuborgan o'yinchida matn chiqmasdi.
        if (s.status === "InProgress" && s.text && !finished && raceEl.classList.contains("d-none")) {
            cdEl.classList.add("d-none");
            resultEl.classList.add("d-none");
            beginRace(s.text);
        }
    });
    conn.on("PlayerJoined", p => { players.set(p.connId, p); renderPlayers(); });
    conn.on("PlayerLeft", d => { players.delete(d.connId); renderPlayers(); setScores(d.scores); });
    conn.on("SideChanged", d => {
        const p = players.get(d.connId);
        if (p) { p.side = d.side; if (d.connId === myConnId) mySide = d.side; renderPlayers(); }
    });
    conn.on("ProgressUpdate", u => {
        const p = players.get(u.connId);
        if (p) { p.progress = u.progress; p.wpm = u.wpm; p.lastType = performance.now(); updateRow(u.connId); }
        setScores(u.scores);
    });
    conn.on("PlayerFinished", d => {
        const p = players.get(d.connId); if (p) { p.finished = true; p.progress = 100; updateRow(d.connId); }
        setScores(d.scores);
    });
    conn.on("TeamRaceStarting", d => startCountdown(d.text));
    conn.on("TeamRaceFinished", showResults);
    conn.on("TeamRaceClosed", d => showClosed(d && d.reason));

    conn.onreconnected(() => {
        myConnId = conn.connectionId;
        conn.invoke("JoinTeamRace", code, displayName, mySide)
            .then(() => {
                if (finished && myFinishPayload) {
                    const f = myFinishPayload;
                    conn.invoke("FinishRace", code, f.wpm, f.rawWpm, f.acc, f.series).catch(() => { });
                }
            })
            .catch(() => { });
    });

    conn.start()
        .then(() => { myConnId = conn.connectionId; return conn.invoke("JoinTeamRace", code, displayName, mySide); })
        .catch(() => { errEl.textContent = "Ulanishda xatolik."; });

    startBtn.addEventListener("click", () => conn.invoke("StartRace", code).catch(() => { }));
    if (endBtn) endBtn.addEventListener("click", () => {
        if (!confirm("Poygani hamma uchun yakunlaysizmi? Tugatmagan o'yinchilar joriy natijasi bilan qayd etiladi.")) return;
        endBtn.disabled = true;
        if (!finished) finish();
        conn.invoke("EndRace", code)
            .catch(() => { errEl.textContent = "Poygani yakunlashda xatolik."; })
            .finally(() => { endBtn.disabled = false; });
    });
    switchBtn.addEventListener("click", () =>
        conn.invoke("ChangeSide", code, mySide === "A" ? "B" : "A").catch(() => { }));
    $("tw-team-copy").addEventListener("click", () => navigator.clipboard?.writeText(code));
    if (restartBtn) restartBtn.addEventListener("click", () => {
        restartBtn.disabled = true;
        conn.invoke("StartRace", code)
            .catch(() => { errEl.textContent = "Yangi poygani boshlashda xatolik."; })
            .finally(() => { restartBtn.disabled = false; });
    });

    // ── Countdown ──
    function startCountdown(text) {
        resultEl.classList.add("d-none");
        raceEl.classList.add("d-none");
        cdEl.classList.remove("d-none");
        let n = 3; cdEl.textContent = n;
        const t = setInterval(() => {
            n--;
            if (n > 0) cdEl.textContent = n;
            else { clearInterval(t); cdEl.textContent = "BOSHLANDI!"; setTimeout(() => { cdEl.classList.add("d-none"); beginRace(text); }, 400); }
        }, 1000);
    }

    // ── Matnni chizish (Practice bilan bir xil) ──
    function render(text) {
        chars = Array.from(text);
        letterEls = [];
        status = new Array(chars.length);
        wordsEl.textContent = "";

        wordsInner = document.createElement("div");
        wordsInner.className = "tw-words-inner";

        const frag = document.createDocumentFragment();
        for (let i = 0; i < chars.length; i++) {
            const span = document.createElement("span");
            span.className = "tw-letter";
            span.textContent = chars[i];
            frag.appendChild(span);
            letterEls.push(span);
        }
        wordsInner.appendChild(frag);

        caretEl = document.createElement("span");
        caretEl.className = "tw-caret";
        wordsInner.appendChild(caretEl);

        wordsEl.appendChild(wordsInner);
        moveCaret();
    }

    function moveCaret() {
        if (!caretEl) return;
        let left, top, w, h;
        if (pos < letterEls.length) {
            const el = letterEls[pos];
            left = el.offsetLeft; top = el.offsetTop; w = el.offsetWidth; h = el.offsetHeight;
        } else if (letterEls.length) {
            const el = letterEls[letterEls.length - 1];
            left = el.offsetLeft + el.offsetWidth; top = el.offsetTop; w = el.offsetWidth; h = el.offsetHeight;
        } else { return; }

        const style = (S && S.get("caretStyle")) || "Line";
        const cw = Math.max(w, 6);
        let y = top;
        const BLOCK = ["Block", "Box", "Laser", "Wedge"];
        if (style === "Underline" || style === "Bottom") {
            const uh = style === "Bottom" ? 4 : 2;
            caretEl.style.width = cw + "px"; caretEl.style.height = uh + "px"; y = top + h - uh;
        } else if (BLOCK.indexOf(style) !== -1) {
            caretEl.style.width = cw + "px"; caretEl.style.height = h + "px";
        } else if (style === "Dot") {
            const d = Math.max(6, Math.round(h * 0.28));
            caretEl.style.width = d + "px"; caretEl.style.height = d + "px"; y = top + h - d - 1;
        } else {
            const lw = style === "Thick" ? 4 : style === "Double" ? 7
                : (style === "Pulse" || style === "Rainbow") ? 3 : 2;
            caretEl.style.width = lw + "px"; caretEl.style.height = h + "px";
        }
        caretEl.style.transform = `translate(${left}px, ${y}px)`;
        updateCurrentWord();
        updateScroll();
    }

    function updateScroll() {
        if (!wordsInner || !letterEls.length) return;
        const el = (pos < letterEls.length) ? letterEls[pos] : letterEls[letterEls.length - 1];
        if (!el) return;
        const offset = el.offsetTop - letterEls[0].offsetTop;
        wordsInner.style.transform = `translateY(${-offset}px)`;
    }

    function updateCurrentWord() {
        if (!chars.length) return;
        for (let i = 0; i < letterEls.length; i++)
            if (letterEls[i]) letterEls[i].classList.remove("tw-cur-word");
        const p = Math.min(pos, chars.length - 1);
        if (chars[p] === " ") return;
        let s = p; while (s > 0 && chars[s - 1] !== " ") s--;
        let e = p; while (e < chars.length - 1 && chars[e + 1] !== " ") e++;
        for (let i = s; i <= e; i++)
            if (letterEls[i]) letterEls[i].classList.add("tw-cur-word");
    }

    function updateLetterView(i) {
        const el = letterEls[i];
        if (!el) return;
        el.classList.remove("tw-correct", "tw-incorrect");
        if (S && S.get("blindMode")) return;
        if (status[i] === "correct") el.classList.add("tw-correct");
        else if (status[i] === "incorrect") el.classList.add("tw-incorrect");
    }

    function correctCount() {
        let c = 0;
        for (let i = 0; i < pos; i++) if (status[i] === "correct") c++;
        return c;
    }

    // ── Poyga (typing) ──
    function beginRace(text) {
        pos = 0; keypresses = 0; startTime = null; finished = false; lastReport = 0;
        keyEvents = []; myFinishPayload = null;
        if (liveTimer) clearInterval(liveTimer);
        liveTimer = null;
        if (wpmEl) wpmEl.textContent = "0";
        if (accEl) accEl.textContent = "100";
        if (timerEl) timerEl.textContent = "0";
        render(text);
        raceEl.classList.remove("d-none");
        if (endBtn) endBtn.classList.toggle("d-none", !isHost); // host poygani majburan yakunlay oladi
        applyStatVisibility();
        wordsEl.focus();
        players.forEach(p => { p.progress = 0; p.wpm = 0; p.finished = false; p.lastType = 0; });
        renderPlayers();

        // ⏱ Poyga soati HAMMA uchun shu umumiy lahzada (countdown tugagach) boshlanadi —
        // birinchi tugma bosilganda emas: bekor turish ham VAQT hisobiga ketadi (adolatli).
        startTime = performance.now();
        liveTimer = setInterval(tick, 150);
    }

    wordsEl.addEventListener("click", () => wordsEl.focus());
    wordsEl.addEventListener("keydown", onKey);

    const elapsed = () => startTime === null ? 0 : (performance.now() - startTime) / 1000;
    const wpmNow = () => { const e = elapsed(); return e > 0 ? (correctCount() / 5) / (e / 60) : 0; };

    function tick() {
        if (finished) return;
        const e = elapsed();
        const cc = correctCount();
        const wpm = e > 0 ? (cc / 5) / (e / 60) : 0;
        const acc = keypresses > 0 ? (cc / keypresses) * 100 : 100;
        if (wpmEl) wpmEl.textContent = Math.round(wpm);
        if (accEl) accEl.textContent = Math.round(acc);
        if (timerEl) timerEl.textContent = Math.floor(e);
    }

    function onKey(ev) {
        if (window.TWCaps) window.TWCaps.check(ev);
        if (finished || chars.length === 0) return;

        if (ev.key === "Backspace") {
            ev.preventDefault();
            if (pos > 0) { pos--; status[pos] = undefined; updateLetterView(pos); moveCaret(); }
            return;
        }

        if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        ev.preventDefault();

        // Aldash himoyasi: tugmani bosib turish (auto-repeat) — bitta bosish = bitta belgi
        if (ev.repeat) return;
        if (pos >= chars.length) return;

        const correct = normChar(ev.key) === normChar(chars[pos]);
        keypresses++;
        keyEvents.push({ t: elapsed(), correct });
        if (window.TWSound && S) window.TWSound.play(S.get("soundOnClick"), correct);

        const blind = !!(S && S.get("blindMode"));
        if (!correct && S && S.get("stopOnError") && !blind) {
            status[pos] = "incorrect";
            updateLetterView(pos);
            return;
        }

        status[pos] = correct ? "correct" : "incorrect";
        updateLetterView(pos);
        pos++;
        moveCaret();
        report();
        if (pos >= chars.length) finish();
    }

    function report() {
        const progress = (pos / chars.length) * 100;
        const me = players.get(myConnId);
        if (me) { me.progress = progress; me.wpm = wpmNow(); me.lastType = performance.now(); updateRow(myConnId); }
        const now = performance.now();
        if (now - lastReport > 400) {
            lastReport = now;
            conn.invoke("ReportProgress", code, progress, Math.round(wpmNow())).catch(() => { });
        }
    }

    function finish() {
        if (finished) return;
        finished = true;
        if (liveTimer) clearInterval(liveTimer);
        if (window.TWCaps) window.TWCaps.hide();
        const e = elapsed();
        const cc = correctCount();
        const minutes = e > 0 ? e / 60 : 1 / 60;
        const wpm = Math.round(((cc / 5) / minutes) * 100) / 100;
        const rawWpm = Math.round(((keypresses / 5) / minutes) * 100) / 100;
        const acc = keypresses > 0 ? Math.round((cc / keypresses) * 10000) / 100 : 0;
        const series = buildWpmSeries(e);
        myFinishPayload = { wpm, rawWpm, acc, series };
        conn.invoke("FinishRace", code, wpm, rawWpm, acc, series).catch(() => { });
    }

    function buildWpmSeries(duration) {
        const secs = Math.max(1, Math.ceil(duration));
        const corN = new Array(secs).fill(0);
        for (const ev of keyEvents) {
            if (!ev.correct) continue;
            let i = Math.floor(ev.t);
            if (i < 0) i = 0; if (i >= secs) i = secs - 1;
            corN[i]++;
        }
        const series = [];
        for (let i = 0; i < secs; i++) {
            let win = 1;
            if (i === secs - 1) win = Math.max(0.5, duration - (secs - 1));
            series.push(Math.round((corN[i] / 5) / (win / 60)));
        }
        return series;
    }

    // ── Natija: har jamoa uchun alohida grafik ──
    const TEAMS = {
        A: { players: [], geom: null, canvas: "tw-chart-a", tip: "tw-chart-a-tip", legend: "tw-legend-a", cards: "tw-cards-a" },
        B: { players: [], geom: null, canvas: "tw-chart-b", tip: "tw-chart-b-tip", legend: "tw-legend-b", cards: "tw-cards-b" }
    };

    function showResults(d) {
        if (liveTimer) clearInterval(liveTimer);
        raceEl.classList.add("d-none");
        cdEl.classList.add("d-none");
        if (endBtn) endBtn.classList.add("d-none");
        resultEl.classList.remove("d-none");

        setScores(d.scores);
        $("tw-tr-score-a").textContent = Math.round(d.scores.a || 0);
        $("tw-tr-score-b").textContent = Math.round(d.scores.b || 0);

        const w = d.winner;
        verdictEl.textContent = w ? `🏆 Jamoa ${w} g'olib!` : "🤝 Durrang!";
        verdictEl.classList.toggle("tw-win", !!w);
        const mine = w && w === mySide;
        detailEl.textContent = `Jamoa A: ${Math.round(d.scores.a)} · Jamoa B: ${Math.round(d.scores.b)}`
            + (mine ? " — tabriklaymiz!" : "");

        const all = Array.isArray(d.players) ? d.players : [];
        TEAMS.A.players = all.filter(p => p.side === "A");
        TEAMS.B.players = all.filter(p => p.side === "B");

        renderTeam(TEAMS.A);
        renderTeam(TEAMS.B);

        if (restartBtn) restartBtn.classList.toggle("d-none", !isHost);
        if (rrWait) rrWait.classList.toggle("d-none", isHost);
    }

    function renderTeam(t) {
        renderLegend(t);
        renderCards(t);
        requestAnimationFrame(() => drawChart(t));
    }

    function renderLegend(t) {
        const legend = $(t.legend);
        if (!legend) return;
        legend.innerHTML = t.players.map(r => {
            const me = (myConnId && r.connId === myConnId) ? " (siz)" : "";
            return `<span class="tw-rr-lg"><i class="tw-rr-dot" style="background:${colorOf(r)}"></i>${esc(r.name)}${me}</span>`;
        }).join("");
    }

    function renderCards(t) {
        const el = $(t.cards);
        if (!el) return;
        el.innerHTML = t.players.map(r => {
            const medal = r.place === 1 ? "🥇" : r.place === 2 ? "🥈" : r.place === 3 ? "🥉" : null;
            const place = medal ? `<span class="tw-rr-medal">${medal}</span>`
                : `<span class="tw-rr-place">${r.place || "—"}.</span>`;
            const mineCls = (myConnId && r.connId === myConnId) ? " tw-rr-me" : "";
            const crown = r.isHost ? '<i class="bi bi-crown-fill" style="color:var(--tw-gold)"></i> ' : '';
            const dot = `<i class="tw-rr-dot" style="background:${colorOf(r)}"></i>`;
            return `<div class="tw-rr-card${mineCls}">
                <div class="tw-rr-rank">${place}</div>
                ${dot}
                <div class="tw-rr-name">${crown}${esc(r.name)}${mineCls ? ' <small>(siz)</small>' : ''}</div>
                <div class="tw-rr-metrics">
                    <div class="tw-rr-m"><span>${Math.round(r.wpm || 0)}</span><label>wpm</label></div>
                    <div class="tw-rr-m"><span>${Math.round(r.rawWpm || 0)}</span><label>raw</label></div>
                    <div class="tw-rr-m"><span>${(r.accuracy || 0).toFixed(1)}<small>%</small></span><label>aniqlik</label></div>
                </div>
            </div>`;
        }).join("") || '<p class="text-secondary small text-center mb-0">A\'zo yo\'q</p>';
    }

    function drawChart(t, hoverIdx) {
        const canvas = $(t.canvas);
        if (!canvas) return;
        const list = t.players;
        const series = list.map(r => Array.isArray(r.wpmSeries) ? r.wpmSeries : []);
        const maxLen = Math.max(1, ...series.map(s => s.length));

        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || 400;
        const cssH = 200;
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const cs = getComputedStyle(document.documentElement);
        const sub = "#8a8aa0";
        const padL = 34, padR = 10, padT = 12, padB = 20;
        const plotW = Math.max(10, cssW - padL - padR);
        const plotH = cssH - padT - padB;
        const n = maxLen;

        let maxWpm = 10;
        series.forEach(s => s.forEach(v => { if (v > maxWpm) maxWpm = v; }));
        const maxY = Math.max(20, Math.ceil(maxWpm / 20) * 20);
        const xAt = i => n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW;
        const yAt = v => padT + plotH - (Math.max(0, v) / maxY) * plotH;

        t.geom = { padL, padT, plotW, plotH, n, xAt, maxY, cssW, cssH };

        ctx.font = "10px " + ((cs.getPropertyValue("--tw-ui-font") || "").trim() || "sans-serif");
        const steps = 4;
        for (let s = 0; s <= steps; s++) {
            const val = maxY * s / steps;
            const y = yAt(val);
            ctx.strokeStyle = "rgba(138,138,160,.14)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(cssW - padR, y); ctx.stroke();
            ctx.fillStyle = sub; ctx.fillText(String(Math.round(val)), 4, y + 3);
        }
        ctx.fillStyle = sub; ctx.textAlign = "center";
        const xStep = Math.max(1, Math.round(n / 8));
        for (let i = 0; i < n; i += xStep) ctx.fillText(String(i + 1), xAt(i), cssH - 5);
        ctx.textAlign = "start";

        if (hoverIdx != null && hoverIdx >= 0 && hoverIdx < n) {
            const hx = xAt(hoverIdx);
            ctx.strokeStyle = "rgba(232,160,32,.5)"; ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(hx, padT); ctx.lineTo(hx, padT + plotH); ctx.stroke();
            ctx.setLineDash([]);
        }

        series.forEach((s, idx) => {
            if (!s.length) return;
            ctx.strokeStyle = colorOf(list[idx]); ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.beginPath();
            let started = false;
            for (let i = 0; i < s.length; i++) {
                const x = xAt(i), y = yAt(s[i]);
                if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        if (hoverIdx != null && hoverIdx >= 0 && hoverIdx < n) {
            const hx = xAt(hoverIdx);
            series.forEach((s, idx) => {
                if (hoverIdx >= s.length) return;
                ctx.beginPath(); ctx.arc(hx, yAt(s[hoverIdx]), 4, 0, Math.PI * 2);
                ctx.fillStyle = colorOf(list[idx]); ctx.fill();
                ctx.lineWidth = 2; ctx.strokeStyle = (cs.getPropertyValue("--tw-bg") || "#0F0F1A").trim();
                ctx.stroke();
            });
        }
    }

    function onChartHover(ev, t) {
        if (!t.geom || !t.players.length) return;
        const canvas = $(t.canvas), tip = $(t.tip);
        if (!canvas || !tip) return;
        const rect = canvas.getBoundingClientRect();
        const mx = ev.clientX - rect.left;
        const g = t.geom, n = g.n;
        let idx = n <= 1 ? 0 : Math.round(((mx - g.padL) / g.plotW) * (n - 1));
        idx = Math.max(0, Math.min(n - 1, idx));

        drawChart(t, idx);

        let rows = "<div class='tw-tip-sec'>" + (idx + 1) + "-soniya</div>";
        t.players.forEach(r => {
            const s = Array.isArray(r.wpmSeries) ? r.wpmSeries : [];
            const v = idx < s.length ? Math.round(s[idx]) : "—";
            rows += "<div><i class='tw-lg-dot' style='background:" + colorOf(r) + "'></i>" +
                esc(r.name) + ": <b>" + v + "</b></div>";
        });
        tip.innerHTML = rows;

        const hx = g.xAt(idx);
        tip.style.display = "block";
        const tipW = tip.offsetWidth;
        let left = hx - tipW / 2;
        left = Math.max(0, Math.min(g.cssW - tipW, left));
        tip.style.left = left + "px";
        tip.style.top = "0px";
    }

    function onChartLeave(t) {
        const tip = $(t.tip);
        if (tip) tip.style.display = "none";
        if (t.players.length) drawChart(t);
    }

    [TEAMS.A, TEAMS.B].forEach(t => {
        const canvas = $(t.canvas);
        if (canvas) {
            canvas.addEventListener("mousemove", ev => onChartHover(ev, t));
            canvas.addEventListener("mouseleave", () => onChartLeave(t));
        }
    });

    // Host chiqib musobaqa yopilganda — xabardor qilib /Teams ga qaytarish
    let closed = false;
    function showClosed(reason) {
        if (closed) return;
        closed = true;
        finished = true;
        if (liveTimer) clearInterval(liveTimer);
        try { conn.stop(); } catch (e) { }
        root.innerHTML = `<div class="tw-room-closed">
            <i class="bi bi-door-closed-fill"></i>
            <h4>Musobaqa yopildi</h4>
            <p>${esc(reason || "Musobaqa egasi chiqdi — bu koddan boshqa foydalanib bo'lmaydi.")}</p>
            <a href="/Teams" class="tw-rbtn" style="text-decoration:none">
                <i class="bi bi-arrow-left-circle"></i><span>Musobaqalarga qaytish</span>
            </a>
        </div>`;
        setTimeout(() => { location.href = "/Teams"; }, 6000);
    }

    if (S && S.onChange) S.onChange(() => { applyStatVisibility(); moveCaret(); });
    window.addEventListener("resize", () => {
        moveCaret();
        if (!resultEl.classList.contains("d-none")) { drawChart(TEAMS.A); drawChart(TEAMS.B); }
    });
    applyStatVisibility();
})();

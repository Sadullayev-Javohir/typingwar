/* TypingWar — do'stlar xonasi (SignalR lobby + real-time poyga)
   Typing maydoni /Practice bilan bir xil: karet, qator surilishi, joriy so'z, ovoz. */
(function () {
    "use strict";

    const root = document.getElementById("tw-room");
    if (!root || !window.signalR) return;

    const code = (new URLSearchParams(location.search).get("code") || "").toUpperCase();
    const isAuth = root.dataset.authenticated === "true";
    const username = root.dataset.username || "";
    const S = window.TWSettings;

    let displayName = username;
    if (!isAuth) {
        displayName = localStorage.getItem("tw_guest") || ("Mehmon-" + Math.floor(1000 + Math.random() * 9000));
        localStorage.setItem("tw_guest", displayName);
    }

    const $ = id => document.getElementById(id);
    $("tw-room-code").textContent = code;

    const playersEl = $("tw-players"), startBtn = $("tw-start"), waitEl = $("tw-wait"),
        errEl = $("tw-room-err"), cdEl = $("tw-countdown"), raceEl = $("tw-race"),
        wordsEl = $("tw-room-words"), resultEl = $("tw-room-result"), cardsEl = $("tw-room-cards"),
        sabPanel = $("tw-sabotage"), sabBanner = $("tw-sab-banner"), sabFeed = $("tw-sab-feed");
    const wpmEl = $("tw-wpm"), accEl = $("tw-acc"), timerEl = $("tw-timer");

    const MIN_SABOTAGE_PLAYERS = 3;
    const SAB_CLASS = {
        Blackout: "sab-blackout", Shuffle: "sab-shuffle", Shake: "sab-shake",
        Mirror: "sab-mirror", Slowdown: "sab-slow"
    };
    const SAB_LABEL = {
        Blackout: "🌑 Blackout", Shuffle: "🔀 Shuffle", Shake: "📳 Shake",
        Mirror: "🪞 Mirror", Slowdown: "🐌 Slowdown"
    };

    let myConnId = null, isHost = false;
    let myFinishPayload = null;   // tugatgandan keyin qayta ulanishda natijani qayta yuborish uchun
    const players = new Map();

    // typing holati (Practice bilan bir xil)
    let chars = [], letterEls = [], status = [], pos = 0, keypresses = 0,
        startTime = null, finished = false, lastReport = 0;
    let wordsInner = null, caretEl = null, liveTimer = null;
    let keyEvents = [];   // har bosish: {t: soniya, correct} — natija grafigi uchun
    // natija grafigi holati (hover qayta chizish uchun)
    let lastResults = null, roomChartGeom = null;
    // sabotaj holati
    let mySabotageUsed = false, raceActive = false, sabBannerTimer = null;

    function esc(s) { return String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

    // Tipografik belgilarni klaviaturada yoziladigan ekvivalentga keltiradi (Practice bilan bir xil)
    function normChar(ch) {
        switch (ch) {
            case "‐": case "‑": case "‒": case "–": case "—": case "―": case "−": return "-";
            case "‘": case "’": case "ʻ": case "ʼ": case "´": case "`": return "'";
            case "“": case "”": case "«": case "»": return '"';
            case " ": case " ": case " ": return " ";
            default: return ch;
        }
    }

    // ── O'yinchilar ro'yxati (har birida mushuk) ──
    function renderPlayers() {
        playersEl.innerHTML = "";
        players.forEach((p, id) => {
            const isMe = id === myConnId;
            // Rang serverda barqaror tayinlanadi (host=0) — barcha brauzerlarda bir xil,
            // refreshda ham o'zgarmaydi. 10 tagacha alohida rang.
            const colorIdx = p.colorIndex || 0;
            const crown = p.isHost
                ? '<i class="bi bi-crown-fill me-1" style="color:var(--tw-gold)"></i>'
                : '';
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
            playersEl.appendChild(li);
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
        const li = playersEl.querySelector('[data-conn="' + id + '"]');
        if (!p || !li) { renderPlayers(); return; }
        const wpmRow = li.querySelector(".tw-player-wpm");
        if (wpmRow) wpmRow.innerHTML = Math.round(p.wpm || 0) + " <small>wpm</small>";
        const ch = li.querySelector(".tw-cheetah-run");
        if (ch && window.TwCheetah) { window.TwCheetah.setPos(ch, p.progress || 0); applyCheetahState(li, p); }
        else { const f = li.querySelector(".tw-bar-fill"); if (f) f.style.width = (p.progress || 0) + "%"; }
        li.classList.toggle("tw-done", !!p.finished);
    }

    setInterval(() => players.forEach((p, id) => {
        const li = playersEl.querySelector('[data-conn="' + id + '"]');
        if (li) applyCheetahState(li, p);
    }), 250);

    function updateHostUi() {
        startBtn.classList.toggle("d-none", !isHost);
        waitEl.classList.toggle("d-none", isHost);
    }

    // Tepa ko'rsatkichlar (WPM/Aniqlik/Soniya) — Practice sozlamalariga moslab ko'rsatish
    function applyStatVisibility() {
        if (!S) return;
        const map = {
            "tw-stat-wpm": S.get("showLiveWpm"),
            "tw-stat-acc": S.get("showLiveAcc"),
            "tw-stat-timer": S.get("showLiveTimer")
        };
        for (const id in map) {
            const el = $(id);
            if (el) el.style.display = map[id] === false ? "none" : "";
        }
        const statsPanel = $("tw-room-stats");
        if (statsPanel) statsPanel.style.display = (S.get("showStatsPanel") === false) ? "none" : "";
    }

    // ── SignalR ──
    const conn = new signalR.HubConnectionBuilder()
        .withUrl("/hubs/lobby")
        .withAutomaticReconnect()
        .build();

    conn.on("Error", m => { errEl.textContent = m; });
    conn.on("RoomState", s => {
        isHost = s.isHost;
        players.clear();
        s.players.forEach(p => players.set(p.connId, p));
        updateHostUi();
        renderPlayers();

        // Kech qo'shilgan / qayta ulangan o'yinchi: host "Boshlash"ni bosgan lahzada guruhda
        // bo'lmaganmiz — RaceStarting kelmagan. Poyga davom etayotgan bo'lsa (matn RoomState
        // bilan keladi) lobbyda qotib qolmasdan darrov poygaga ulanamiz. Allaqachon yozayotgan
        // (raceActive) yoki tugatgan (finished) bo'lsak — qaytib boshlamaymiz (reconnect holati).
        if ((s.status === "InProgress" || s.status === "Countdown") && s.text &&
            !raceActive && !finished && resultEl.classList.contains("d-none")) {
            cdEl.classList.add("d-none");
            beginRace(s.text);
        }
    });
    conn.on("PlayerJoined", p => { players.set(p.connId, p); renderPlayers(); updateSabotagePanel(); });
    conn.on("PlayerLeft", p => { players.delete(p.connId); renderPlayers(); updateSabotagePanel(); });
    conn.on("Sabotaged", d => applySabotage(d.type, d.durationSeconds, d.from));
    conn.on("SabotageUsed", d => {
        addSabFeed(d);
        if (d.fromConn === myConnId) { mySabotageUsed = true; updateSabotagePanel(); }
    });
    conn.on("ProgressUpdate", u => {
        const p = players.get(u.connId);
        if (p) { p.progress = u.progress; p.wpm = u.wpm; p.lastType = performance.now(); updateRow(u.connId); }
    });
    conn.on("PlayerFinished", p => {
        players.set(p.connId, Object.assign(players.get(p.connId) || {}, p));
        renderPlayers();
    });
    conn.on("RaceStarting", d => startCountdown(d.text, d.countdown));
    conn.on("RaceFinished", results => showResults(results));
    conn.on("RoomClosed", d => showRoomClosed(d && d.reason));

    // SignalR avto-qayta ulanish: ulanish tiklangach connId YANGI bo'ladi va eski guruh
    // obunasi yo'qoladi. Qayta JoinRoom qilmasak — o'yinchi hammaning ro'yxatidan tushib
    // qoladi va FinishRace e'tiborsiz qoladi (natija/linegraphdan yo'qoladi). Shuning uchun
    // qayta ulangach majburiy qayta qo'shilamiz (server eski connId ni grace bilan tozalaydi).
    conn.onreconnected(() => {
        myConnId = conn.connectionId;
        conn.invoke("JoinRoom", code, displayName)
            .then(() => {
                // Tugatib bo'lgan bo'lsak — server yangi (tugamagan) yozuv yaratdi, natijani qayta
                // yuboramiz, aks holda poyga bizni kutib "tugamay" qolardi.
                if (finished && myFinishPayload) {
                    const f = myFinishPayload;
                    conn.invoke("FinishRace", code, f.wpm, f.rawWpm, f.acc, f.series).catch(() => { });
                }
            })
            .catch(() => { });
    });

    conn.start()
        .then(() => { myConnId = conn.connectionId; return conn.invoke("JoinRoom", code, displayName); })
        .catch(() => { errEl.textContent = "Ulanishda xatolik."; });

    startBtn.addEventListener("click", () => conn.invoke("StartRace", code).catch(() => { }));
    $("tw-copy").addEventListener("click", () => { navigator.clipboard?.writeText(code); });

    // ── Countdown ──
    function startCountdown(text, seconds) {
        resultEl.classList.add("d-none");
        raceEl.classList.add("d-none");
        cdEl.classList.remove("d-none");
        let n = seconds;
        cdEl.textContent = n;
        const t = setInterval(() => {
            n--;
            if (n > 0) { cdEl.textContent = n; }
            else {
                clearInterval(t);
                cdEl.textContent = "BOSHLANDI!";
                setTimeout(() => { cdEl.classList.add("d-none"); beginRace(text); }, 400);
            }
        }, 1000);
    }

    // ── Matnni chizish (Practice bilan bir xil: ichki blok + karet) ──
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
        if (S && S.get("blindMode")) return; // ko'r rejim — xato ko'rsatilmaydi
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
        applyStatVisibility();
        wordsEl.focus();
        // barcha o'yinchilar holatini yangi poygaga tiklash
        players.forEach(p => { p.progress = 0; p.wpm = 0; p.finished = false; p.lastType = 0; });
        renderPlayers();
        // sabotaj — yangi poyga
        mySabotageUsed = false;
        raceActive = true;
        clearSabotageEffects();
        sabFeed.innerHTML = "";
        updateSabotagePanel();

        // ⏱ Poyga soati HAMMA uchun shu umumiy lahzada (countdown tugagach) boshlanadi —
        // birinchi tugma bosilganda emas. Shunday qilib kech boshlagan o'yinchining
        // bekor turgan vaqti ham hisoblanadi: musobaqa VAQTGA qarab adolatli baholanadi.
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
        if (window.TWCaps) window.TWCaps.check(ev);   // Caps Lock ogohlantirishi
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
        keyEvents.push({ t: elapsed(), correct });   // natija grafigi tarixi
        if (window.TWSound && S) window.TWSound.play(S.get("soundOnClick"), correct);

        // "Xatodan to'xtash" yoqilgan bo'lsa (ko'r rejimdan tashqari): xato belgida karet turadi
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
        raceActive = false;
        if (liveTimer) clearInterval(liveTimer);
        if (window.TWCaps) window.TWCaps.hide();
        updateSabotagePanel();
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

    // Har soniya uchun net WPM qatori (natija grafigi uchun) — Practice bilan bir xil mantiq
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
            if (i === secs - 1) win = Math.max(0.5, duration - (secs - 1)); // oxirgi to'liqsiz soniya
            series.push(Math.round((corN[i] / 5) / (win / 60)));
        }
        return series;
    }

    // ── Sabotaj ──
    function updateSabotagePanel() {
        const me = players.get(myConnId);
        const canShow = raceActive && me && !me.finished &&
            !mySabotageUsed && players.size >= MIN_SABOTAGE_PLAYERS;
        sabPanel.classList.toggle("d-none", !canShow);
    }

    function pickTarget() {
        let best = null;
        players.forEach((p, id) => {
            if (id === myConnId || p.finished) return;
            if (!best || (p.progress || 0) > (best.progress || 0)) best = { id, progress: p.progress || 0 };
        });
        return best ? best.id : null;
    }

    function sendSabotage(type) {
        if (mySabotageUsed || !raceActive) return;
        const targetConn = pickTarget();
        if (!targetConn) { errEl.textContent = "Sabotaj uchun nishon yo'q."; return; }
        errEl.textContent = "";
        mySabotageUsed = true;
        updateSabotagePanel();
        conn.invoke("SabotageAttack", code, targetConn, type).catch(() => {
            mySabotageUsed = false;
            updateSabotagePanel();
        });
    }

    sabPanel.querySelectorAll(".tw-sab-btn").forEach(btn =>
        btn.addEventListener("click", () => sendSabotage(btn.dataset.sab)));

    function applySabotage(type, durationSeconds, from) {
        const cls = SAB_CLASS[type];
        if (!cls) return;
        clearSabotageEffects();
        wordsEl.classList.add("sab-active", cls);
        showSabBanner(`💥 ${from} sizga ${SAB_LABEL[type] || type} yubordi!`, durationSeconds);
        setTimeout(() => wordsEl.classList.remove("sab-active", cls), durationSeconds * 1000);
    }

    function clearSabotageEffects() {
        wordsEl.classList.remove("sab-active");
        Object.values(SAB_CLASS).forEach(c => wordsEl.classList.remove(c));
    }

    function showSabBanner(text, seconds) {
        sabBanner.textContent = text;
        sabBanner.classList.remove("d-none");
        if (sabBannerTimer) clearTimeout(sabBannerTimer);
        sabBannerTimer = setTimeout(() => sabBanner.classList.add("d-none"), seconds * 1000);
    }

    function addSabFeed(d) {
        const mine = d.fromConn === myConnId;
        const li = document.createElement("li");
        li.innerHTML = `<span>${mine ? "Siz" : esc(d.from)}</span> → <span>${esc(d.to)}</span>
            <span class="tw-accent">${SAB_LABEL[d.type] || esc(d.type)}</span>`;
        sabFeed.prepend(li);
        while (sabFeed.children.length > 5) sabFeed.lastChild.remove();
    }

    // Host chiqib xona yopilganda (yoki 5 daqiqa tugaganda) — xabardor qilib /Rooms ga qaytarish
    let roomClosed = false;
    function showRoomClosed(reason) {
        if (roomClosed) return;
        roomClosed = true;
        finished = true; raceActive = false;
        if (liveTimer) clearInterval(liveTimer);
        try { conn.stop(); } catch (e) { }
        const r = document.getElementById("tw-room");
        if (!r) return;
        r.innerHTML = `<div class="tw-room-closed">
            <i class="bi bi-door-closed-fill"></i>
            <h4>Xona yopildi</h4>
            <p>${esc(reason || "Xona egasi chiqdi — bu koddan boshqa foydalanib bo'lmaydi.")}</p>
            <a href="/Rooms" class="tw-rbtn" style="text-decoration:none">
                <i class="bi bi-arrow-left-circle"></i><span>Xonalarga qaytish</span>
            </a>
        </div>`;
        setTimeout(() => { location.href = "/Rooms"; }, 6000);
    }

    // ── Rang palitrasi (har o'yinchiga grafikda alohida rang) ──
    // Mushuk ranglariga mos (site.css .tw-cheetah-*) — natija grafigi rangi == jonli mushuk rangi
    const CHART_COLORS = [
        "#0070f3", "#5aa0ff", "#40d870", "#c060ff", "#ff5566",
        "#40d8e8", "#ff5599", "#ff9933", "#2dd4bf", "#8b5cf6"
    ];
    function colorFor(idx) { return CHART_COLORS[(idx || 0) % CHART_COLORS.length]; }
    function colorOf(r) { return colorFor(r ? (r.colorIndex || 0) : 0); } // o'yinchining barqaror rangi

    // ── Natijalar oynasi (barcha o'yinchilar statistikasi bitta oynada) ──
    // Bu funksiya faqat oxirgi o'yinchi ham yozib bo'lgach (RaceFinished) chaqiriladi.
    function showResults(results) {
        raceActive = false;
        if (liveTimer) clearInterval(liveTimer);
        sabPanel.classList.add("d-none");
        clearSabotageEffects();
        raceEl.classList.add("d-none");
        cdEl.classList.add("d-none");
        resultEl.classList.remove("d-none");

        lastResults = results;

        const sub = $("tw-rr-sub");
        if (sub) sub.textContent = results.length + " o'yinchi · eng tez barmoqlar yuqorida";

        // Grafik: barcha o'yinchilarning soniyalik WPM chiziqlari + rangli izoh
        renderChartLegend(results);
        requestAnimationFrame(() => drawRoomChart(results)); // layoutdan keyin (clientWidth to'g'ri)

        // Host uchun "qaytadan boshlash" tugmasi (yangi o'yin), boshqalarga kutish matni
        const restartBtn = $("tw-restart"), waitMsg = $("tw-rr-wait");
        if (restartBtn) restartBtn.classList.toggle("d-none", !isHost);
        if (waitMsg) waitMsg.classList.toggle("d-none", isHost);

        cardsEl.innerHTML = results.map((r, i) => {
            const medal = r.place === 1 ? "🥇" : r.place === 2 ? "🥈" : r.place === 3 ? "🥉" : null;
            const place = medal ? `<span class="tw-rr-medal">${medal}</span>`
                : `<span class="tw-rr-place">${r.place}.</span>`;
            const mine = (myConnId && r.connId === myConnId) ? " tw-rr-me" : "";
            const winner = r.place === 1 ? " tw-rr-winner" : "";
            const crown = r.isHost
                ? '<i class="bi bi-crown-fill" style="color:var(--tw-gold)"></i> ' : '';
            const dot = `<i class="tw-rr-dot" style="background:${colorOf(r)}"></i>`;
            return `<div class="tw-rr-card${winner}${mine}">
                <div class="tw-rr-rank">${place}</div>
                ${dot}
                <div class="tw-rr-name">${crown}${esc(r.name)}${mine ? ' <small>(siz)</small>' : ''}</div>
                <div class="tw-rr-metrics">
                    <div class="tw-rr-m"><span>${Math.round(r.wpm || 0)}</span><label>wpm</label></div>
                    <div class="tw-rr-m"><span>${Math.round(r.rawWpm || 0)}</span><label>raw</label></div>
                    <div class="tw-rr-m"><span>${(r.accuracy || 0).toFixed(1)}<small>%</small></span><label>aniqlik</label></div>
                </div>
            </div>`;
        }).join("");
    }

    // Rangli izoh (legend) — har o'yinchi qaysi chiziq ekanini ko'rsatadi
    function renderChartLegend(results) {
        const legend = $("tw-room-legend");
        if (!legend) return;
        legend.innerHTML = results.map((r, i) => {
            const me = (myConnId && r.connId === myConnId) ? " (siz)" : "";
            return `<span class="tw-rr-lg"><i class="tw-rr-dot" style="background:${colorOf(r)}"></i>${esc(r.name)}${me}</span>`;
        }).join("");
    }

    // Barcha o'yinchilarning soniyalik WPM chiziqlarini bitta grafikda chizadi (Practice uslubida)
    function drawRoomChart(results, hoverIdx) {
        const canvas = $("tw-room-chart");
        if (!canvas) return;
        const series = results.map(r => Array.isArray(r.wpmSeries) ? r.wpmSeries : []);
        const maxLen = Math.max(1, ...series.map(s => s.length));
        if (maxLen < 1) return;

        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || 600;
        const cssH = 220;
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const cs = getComputedStyle(document.documentElement);
        const sub = "#8a8aa0";
        const padL = 38, padR = 12, padT = 14, padB = 22;
        const plotW = Math.max(10, cssW - padL - padR);
        const plotH = cssH - padT - padB;
        const n = maxLen;

        let maxWpm = 10;
        series.forEach(s => s.forEach(v => { if (v > maxWpm) maxWpm = v; }));
        const maxY = Math.max(20, Math.ceil(maxWpm / 20) * 20);
        const xAt = i => n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW;
        const yAt = v => padT + plotH - (Math.max(0, v) / maxY) * plotH;

        roomChartGeom = { padL, padT, plotW, plotH, n, xAt, maxY, cssW, cssH };

        // To'r va Y belgilar
        ctx.font = "10px " + ((cs.getPropertyValue("--tw-ui-font") || "").trim() || "sans-serif");
        const steps = 4;
        for (let s = 0; s <= steps; s++) {
            const val = maxY * s / steps;
            const y = yAt(val);
            ctx.strokeStyle = "rgba(138,138,160,.14)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(cssW - padR, y); ctx.stroke();
            ctx.fillStyle = sub; ctx.fillText(String(Math.round(val)), 6, y + 3);
        }
        // X belgilar (soniya)
        ctx.fillStyle = sub; ctx.textAlign = "center";
        const xStep = Math.max(1, Math.round(n / 8));
        for (let i = 0; i < n; i += xStep) ctx.fillText(String(i + 1), xAt(i), cssH - 6);
        ctx.textAlign = "start";

        // Hover ko'rsatkich chizig'i
        if (hoverIdx != null && hoverIdx >= 0 && hoverIdx < n) {
            const hx = xAt(hoverIdx);
            ctx.strokeStyle = "rgba(232,160,32,.5)"; ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(hx, padT); ctx.lineTo(hx, padT + plotH); ctx.stroke();
            ctx.setLineDash([]);
        }

        // Har o'yinchi chizig'i
        series.forEach((s, idx) => {
            if (!s.length) return;
            const col = colorOf(results[idx]);
            ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.beginPath();
            let started = false;
            for (let i = 0; i < s.length; i++) {
                const x = xAt(i), y = yAt(s[i]);
                if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        // Hover dagi nuqtalar
        if (hoverIdx != null && hoverIdx >= 0 && hoverIdx < n) {
            const hx = xAt(hoverIdx);
            series.forEach((s, idx) => {
                if (hoverIdx >= s.length) return;
                ctx.beginPath(); ctx.arc(hx, yAt(s[hoverIdx]), 4, 0, Math.PI * 2);
                ctx.fillStyle = colorOf(results[idx]); ctx.fill();
                ctx.lineWidth = 2; ctx.strokeStyle = (cs.getPropertyValue("--tw-bg") || "#0F0F1A").trim();
                ctx.stroke();
            });
        }
    }

    // Sichqoncha grafik ustida — eng yaqin soniyada barcha o'yinchilar WPM si
    function onRoomChartHover(ev) {
        if (!lastResults || !roomChartGeom) return;
        const canvas = $("tw-room-chart"), tip = $("tw-room-chart-tip");
        if (!canvas || !tip) return;
        const rect = canvas.getBoundingClientRect();
        const mx = ev.clientX - rect.left;
        const g = roomChartGeom, n = g.n;
        let idx = n <= 1 ? 0 : Math.round(((mx - g.padL) / g.plotW) * (n - 1));
        idx = Math.max(0, Math.min(n - 1, idx));

        drawRoomChart(lastResults, idx);

        let rows = "<div class='tw-tip-sec'>" + (idx + 1) + "-soniya</div>";
        lastResults.forEach((r, i) => {
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

    function onRoomChartLeave() {
        const tip = $("tw-room-chart-tip");
        if (tip) tip.style.display = "none";
        if (lastResults) drawRoomChart(lastResults);
    }

    const roomChartCanvas = $("tw-room-chart");
    if (roomChartCanvas) {
        roomChartCanvas.addEventListener("mousemove", onRoomChartHover);
        roomChartCanvas.addEventListener("mouseleave", onRoomChartLeave);
    }

    // Host "qaytadan boshlash" tugmasi — yangi poyga (StartRace hamma uchun yangi countdown beradi)
    const restartBtn = $("tw-restart");
    if (restartBtn) restartBtn.addEventListener("click", () => {
        restartBtn.disabled = true;
        conn.invoke("StartRace", code)
            .catch(() => { errEl.textContent = "Yangi poygani boshlashda xatolik."; })
            .finally(() => { restartBtn.disabled = false; });
    });

    // Sozlamalar o'zgarsa (tema/karet/ko'rsatkichlar) — darhol qo'llash
    if (S && S.onChange) S.onChange(() => { applyStatVisibility(); moveCaret(); });
    window.addEventListener("resize", () => {
        moveCaret();
        if (lastResults && !resultEl.classList.contains("d-none")) drawRoomChart(lastResults);
    });
    applyStatVisibility();
})();

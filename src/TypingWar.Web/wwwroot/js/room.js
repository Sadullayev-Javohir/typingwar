/* TypingWar — do'stlar xonasi (SignalR lobby + real-time poyga) */
(function () {
    "use strict";

    const root = document.getElementById("tw-room");
    if (!root || !window.signalR) return;

    const code = (new URLSearchParams(location.search).get("code") || "").toUpperCase();
    const isAuth = root.dataset.authenticated === "true";
    const username = root.dataset.username || "";

    let displayName = username;
    if (!isAuth) {
        displayName = localStorage.getItem("tw_guest") || ("Mehmon-" + Math.floor(1000 + Math.random() * 9000));
        localStorage.setItem("tw_guest", displayName);
    }

    const $ = id => document.getElementById(id);
    $("tw-room-code").textContent = code;

    const playersEl = $("tw-players"), startBtn = $("tw-start"), waitEl = $("tw-wait"),
        errEl = $("tw-room-err"), cdEl = $("tw-countdown"), raceEl = $("tw-race"),
        wordsEl = $("tw-room-words"), resultEl = $("tw-room-result"), ranksEl = $("tw-room-ranks"),
        sabPanel = $("tw-sabotage"), sabBanner = $("tw-sab-banner"), sabFeed = $("tw-sab-feed");

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
    const players = new Map();

    // typing holati
    let chars = [], pos = 0, correct = 0, keypresses = 0, startTime = null, finished = false, lastReport = 0;
    // sabotaj holati
    let mySabotageUsed = false, raceActive = false, sabBannerTimer = null;

    function esc(s) { return String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

    function renderPlayers() {
        playersEl.innerHTML = "";
        let idx = 0;
        players.forEach((p, id) => {
            const isMe = id === myConnId;
            const colorIdx = isMe ? 0 : idx + 1;
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
            idx++;
        });
    }

    // ── Mushuk yurishi (yozayotganda yuradi, WPM tezligida) ──
    const RUN_IDLE_MS = 700; // remote yangilanish ~400ms — biroz zaxira

    function applyCheetahState(li, p) {
        const ch = li.querySelector(".tw-cheetah-run");
        if (!ch || !window.TwCheetah) return;
        const running = !p.finished && p.lastType && (performance.now() - p.lastType < RUN_IDLE_MS);
        window.TwCheetah.setRunning(ch, running);
        if (running) window.TwCheetah.setSpeed(ch, p.wpm || 0);
    }

    // DOM ni qayta qurmasdan bitta o'yinchi qatorini yangilaydi (animatsiya uzilmaydi)
    function updateRow(id) {
        const p = players.get(id);
        const li = playersEl.querySelector('[data-conn="' + id + '"]');
        if (!p || !li) { renderPlayers(); return; }
        const wpmEl = li.querySelector(".tw-player-wpm");
        if (wpmEl) wpmEl.innerHTML = Math.round(p.wpm || 0) + " <small>wpm</small>";
        const ch = li.querySelector(".tw-cheetah-run");
        if (ch && window.TwCheetah) { window.TwCheetah.setPos(ch, p.progress || 0); applyCheetahState(li, p); }
        else { const f = li.querySelector(".tw-bar-fill"); if (f) f.style.width = (p.progress || 0) + "%"; }
        li.classList.toggle("tw-done", !!p.finished);
    }

    // Bo'sh turgan mushuklarni to'xtatish uchun davriy tekshiruv
    setInterval(() => players.forEach((p, id) => {
        const li = playersEl.querySelector('[data-conn="' + id + '"]');
        if (li) applyCheetahState(li, p);
    }), 250);

    function updateHostUi() {
        startBtn.classList.toggle("d-none", !isHost);
        waitEl.classList.toggle("d-none", isHost);
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

    // ── Poyga (typing) ──
    function beginRace(text) {
        chars = Array.from(text);
        pos = 0; correct = 0; keypresses = 0; startTime = null; finished = false; lastReport = 0;
        wordsEl.innerHTML = chars.map(c => `<span class="tw-letter">${esc(c)}</span>`).join("");
        raceEl.classList.remove("d-none");
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
    }

    const letterEls = () => wordsEl.querySelectorAll(".tw-letter");
    wordsEl.addEventListener("click", () => wordsEl.focus());
    wordsEl.addEventListener("keydown", onKey);

    function onKey(ev) {
        if (window.TWCaps) window.TWCaps.check(ev);   // Caps Lock ogohlantirishi
        if (finished || chars.length === 0) return;
        if (ev.key === "Backspace") {
            ev.preventDefault();
            if (pos > 0) { pos--; letterEls()[pos].classList.remove("tw-correct", "tw-incorrect"); }
            return;
        }
        if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        ev.preventDefault();
        if (pos >= chars.length) return;
        if (startTime === null) startTime = performance.now();

        const ok = ev.key === chars[pos];
        const el = letterEls()[pos];
        keypresses++;
        if (ok) { el.classList.add("tw-correct"); el.classList.remove("tw-incorrect"); correct++; }
        else { el.classList.add("tw-incorrect"); el.classList.remove("tw-correct"); }
        pos++;
        if (window.TWSound && window.TWSettings) window.TWSound.play(window.TWSettings.get("soundOnClick"), ok);
        report();
        if (pos >= chars.length) finish();
    }

    const elapsed = () => startTime === null ? 0 : (performance.now() - startTime) / 1000;
    const wpmNow = () => { const e = elapsed(); return e > 0 ? (correct / 5) / (e / 60) : 0; };

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
        if (window.TWCaps) window.TWCaps.hide();
        updateSabotagePanel();
        const e = elapsed();
        const wpm = e > 0 ? Math.round(((correct / 5) / (e / 60)) * 100) / 100 : 0;
        const acc = keypresses > 0 ? Math.round((correct / keypresses) * 10000) / 100 : 0;
        conn.invoke("FinishRace", code, wpm, acc).catch(() => { });
    }

    // ── Sabotaj ──
    function updateSabotagePanel() {
        const me = players.get(myConnId);
        const canShow = raceActive && me && !me.finished &&
            !mySabotageUsed && players.size >= MIN_SABOTAGE_PLAYERS;
        sabPanel.classList.toggle("d-none", !canShow);
    }

    // Nishon = tugatmagan, eng ko'p progressga ega raqib (yetakchiga hujum)
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
        mySabotageUsed = true;          // optimistik bloklash
        updateSabotagePanel();
        conn.invoke("SabotageAttack", code, targetConn, type).catch(() => {
            mySabotageUsed = false;     // xato bo'lsa qaytarish
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

    function showResults(results) {
        raceActive = false;
        sabPanel.classList.add("d-none");
        clearSabotageEffects();
        raceEl.classList.add("d-none");
        resultEl.classList.remove("d-none");
        ranksEl.innerHTML = results.map(r => {
            const medal = r.place === 1 ? "🥇" : r.place === 2 ? "🥈" : r.place === 3 ? "🥉" : (r.place + ".");
            return `<li><span>${medal} ${esc(r.name)}</span>
                <span class="tw-accent">${Math.round(r.wpm)} wpm · ${(r.accuracy || 0).toFixed(1)}%</span></li>`;
        }).join("");
    }
})();

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
        wordsEl = $("tw-room-words"), resultEl = $("tw-room-result"), ranksEl = $("tw-room-ranks");

    let myConnId = null, isHost = false;
    const players = new Map();

    // typing holati
    let chars = [], pos = 0, correct = 0, keypresses = 0, startTime = null, finished = false, lastReport = 0;

    function esc(s) { return String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

    function renderPlayers() {
        playersEl.innerHTML = "";
        players.forEach((p, id) => {
            const me = id === myConnId ? " (siz)" : "";
            const crown = p.isHost ? "👑 " : "";
            const li = document.createElement("li");
            li.className = "tw-player" + (p.finished ? " tw-done" : "");
            li.innerHTML = `<div class="tw-player-top"><span>${crown}${esc(p.name)}${me}</span>
                <span class="tw-player-wpm">${Math.round(p.wpm || 0)} wpm</span></div>
                <div class="tw-bar"><div class="tw-bar-fill" style="width:${p.progress || 0}%"></div></div>`;
            playersEl.appendChild(li);
        });
    }

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
    conn.on("PlayerJoined", p => { players.set(p.connId, p); renderPlayers(); });
    conn.on("PlayerLeft", p => { players.delete(p.connId); renderPlayers(); });
    conn.on("ProgressUpdate", u => {
        const p = players.get(u.connId);
        if (p) { p.progress = u.progress; p.wpm = u.wpm; renderPlayers(); }
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
        const me = players.get(myConnId);
        if (me) { me.progress = 0; me.wpm = 0; me.finished = false; renderPlayers(); }
    }

    const letterEls = () => wordsEl.querySelectorAll(".tw-letter");
    wordsEl.addEventListener("click", () => wordsEl.focus());
    wordsEl.addEventListener("keydown", onKey);

    function onKey(ev) {
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
        report();
        if (pos >= chars.length) finish();
    }

    const elapsed = () => startTime === null ? 0 : (performance.now() - startTime) / 1000;
    const wpmNow = () => { const e = elapsed(); return e > 0 ? (correct / 5) / (e / 60) : 0; };

    function report() {
        const progress = (pos / chars.length) * 100;
        const me = players.get(myConnId);
        if (me) { me.progress = progress; me.wpm = wpmNow(); renderPlayers(); }
        const now = performance.now();
        if (now - lastReport > 400) {
            lastReport = now;
            conn.invoke("ReportProgress", code, progress, Math.round(wpmNow())).catch(() => { });
        }
    }

    function finish() {
        if (finished) return;
        finished = true;
        const e = elapsed();
        const wpm = e > 0 ? Math.round(((correct / 5) / (e / 60)) * 100) / 100 : 0;
        const acc = keypresses > 0 ? Math.round((correct / keypresses) * 10000) / 100 : 0;
        conn.invoke("FinishRace", code, wpm, acc).catch(() => { });
    }

    function showResults(results) {
        raceEl.classList.add("d-none");
        resultEl.classList.remove("d-none");
        ranksEl.innerHTML = results.map(r => {
            const medal = r.place === 1 ? "🥇" : r.place === 2 ? "🥈" : r.place === 3 ? "🥉" : (r.place + ".");
            return `<li><span>${medal} ${esc(r.name)}</span>
                <span class="tw-accent">${Math.round(r.wpm)} wpm · ${(r.accuracy || 0).toFixed(1)}%</span></li>`;
        }).join("");
    }
})();

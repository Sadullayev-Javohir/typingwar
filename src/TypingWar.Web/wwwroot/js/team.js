/* TypingWar — 5x5 jamoaviy musobaqa (SignalR) */
(function () {
    "use strict";

    const root = document.getElementById("tw-team");
    if (!root || !window.signalR) return;

    const qs = new URLSearchParams(location.search);
    const code = (qs.get("code") || "").toUpperCase();
    let mySide = (qs.get("side") || "A").toUpperCase() === "B" ? "B" : "A";
    const isAuth = root.dataset.authenticated === "true";
    const username = root.dataset.username || "";

    let displayName = username;
    if (!isAuth) {
        displayName = localStorage.getItem("tw_guest") || ("Mehmon-" + Math.floor(1000 + Math.random() * 9000));
        localStorage.setItem("tw_guest", displayName);
    }

    const $ = id => document.getElementById(id);
    $("tw-team-code").textContent = code;

    const listA = $("tw-team-a"), listB = $("tw-team-b"), scoreA = $("tw-score-a"), scoreB = $("tw-score-b"),
        startBtn = $("tw-team-start"), waitEl = $("tw-team-wait"), errEl = $("tw-team-err"),
        cdEl = $("tw-team-countdown"), raceEl = $("tw-team-race"), wordsEl = $("tw-team-words"),
        resultEl = $("tw-team-result"), verdictEl = $("tw-team-verdict"), detailEl = $("tw-team-detail");

    let myConnId = null, isHost = false;
    const players = new Map();

    let chars = [], pos = 0, correct = 0, keypresses = 0, startTime = null, finished = false, lastReport = 0;

    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

    function renderPlayers() {
        listA.innerHTML = ""; listB.innerHTML = "";
        players.forEach((p, id) => {
            const isMe = id === myConnId;
            const colorIdx = p.side === "B" ? 1 : 0; // A=oltin, B=ko'k
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
            (p.side === "B" ? listB : listA).appendChild(li);
            li.dataset.conn = id;
            applyCheetahState(li, p);
        });
    }

    // ── Mushuk yurishi (yozayotganda yuradi, WPM tezligida) ──
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
        const wpmEl = li.querySelector(".tw-player-wpm");
        if (wpmEl) wpmEl.innerHTML = Math.round(p.wpm || 0) + " <small>wpm</small>";
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
        scoreA.textContent = Math.round(s.a || 0);
        scoreB.textContent = Math.round(s.b || 0);
    }

    function updateHostUi() {
        startBtn.classList.toggle("d-none", !isHost);
        waitEl.classList.toggle("d-none", isHost);
    }

    const conn = new signalR.HubConnectionBuilder().withUrl("/hubs/teamrace").withAutomaticReconnect().build();

    conn.on("Error", m => { errEl.textContent = m; });
    conn.on("TeamState", s => {
        isHost = s.isHost;
        players.clear();
        s.players.forEach(p => players.set(p.connId, p));
        const me = players.get(myConnId); if (me) mySide = me.side;
        updateHostUi(); renderPlayers(); setScores(s.scores);
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
        const p = players.get(d.connId); if (p) { p.finished = true; p.progress = 100; renderPlayers(); }
        setScores(d.scores);
    });
    conn.on("TeamRaceStarting", d => startCountdown(d.text));
    conn.on("TeamRaceFinished", showResults);

    conn.start()
        .then(() => { myConnId = conn.connectionId; return conn.invoke("JoinTeamRace", code, displayName, mySide); })
        .catch(() => { errEl.textContent = "Ulanishda xatolik."; });

    startBtn.addEventListener("click", () => conn.invoke("StartRace", code).catch(() => { }));
    $("tw-switch").addEventListener("click", () =>
        conn.invoke("ChangeSide", code, mySide === "A" ? "B" : "A").catch(() => { }));
    $("tw-team-copy").addEventListener("click", () => navigator.clipboard?.writeText(code));

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

    function beginRace(text) {
        chars = Array.from(text);
        pos = 0; correct = 0; keypresses = 0; startTime = null; finished = false; lastReport = 0;
        wordsEl.innerHTML = chars.map(c => `<span class="tw-letter">${esc(c)}</span>`).join("");
        raceEl.classList.remove("d-none");
        wordsEl.focus();
        // barcha o'yinchilar holatini yangi poygaga tiklash
        players.forEach(p => { p.progress = 0; p.wpm = 0; p.finished = false; p.lastType = 0; });
        renderPlayers();
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
        if (window.TWCaps) window.TWCaps.hide();
        const e = elapsed();
        const wpm = e > 0 ? Math.round(((correct / 5) / (e / 60)) * 100) / 100 : 0;
        const acc = keypresses > 0 ? Math.round((correct / keypresses) * 10000) / 100 : 0;
        conn.invoke("FinishRace", code, wpm, acc).catch(() => { });
    }

    function showResults(d) {
        raceEl.classList.add("d-none");
        resultEl.classList.remove("d-none");
        setScores(d.scores);
        const w = d.winner;
        verdictEl.textContent = w ? `🏆 Jamoa ${w} g'olib!` : "🤝 Durrang!";
        const mine = w && w === mySide;
        detailEl.textContent = `Jamoa A: ${Math.round(d.scores.a)} · Jamoa B: ${Math.round(d.scores.b)}`
            + (w ? (mine ? " — tabriklaymiz!" : "") : "");
    }
})();

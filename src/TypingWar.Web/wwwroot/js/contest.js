/* TypingWar — kunlik musobaqa */
(function () {
    "use strict";

    const root = document.getElementById("tw-contest");
    if (!root) return;

    const isAuth = root.dataset.authenticated === "true";
    const $ = id => document.getElementById(id);
    const wordsEl = $("tw-contest-words"), boardEl = $("tw-contest-board"),
        dateEl = $("tw-contest-date"), streakEl = $("tw-contest-streak"),
        errEl = $("tw-contest-err"), liveEl = $("tw-contest-live"),
        resultEl = $("tw-contest-result"), loginEl = $("tw-contest-login");

    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

    let chars = [], pos = 0, correct = 0, keypresses = 0, startTime = null, finished = false;

    if (!isAuth) loginEl.classList.remove("d-none");

    async function fetchData() {
        const r = await fetch("/api/contests/today", { credentials: "same-origin" });
        if (!r.ok) throw new Error("load");
        return r.json();
    }

    async function load() {
        try {
            const data = await fetchData();
            dateEl.textContent = data.contest.date;
            renderBoard(data.top);
            renderStreak(data.me);
            beginRace(data.contest.text);
        } catch { errEl.textContent = "Musobaqa yuklanmadi."; }
    }

    // Natijadan keyin — typing maydonini reset qilmasdan jadval/streakni yangilash
    async function refreshStatus() {
        try {
            const data = await fetchData();
            renderBoard(data.top);
            renderStreak(data.me);
        } catch { /* jim */ }
    }

    function renderBoard(top) {
        boardEl.innerHTML = (top || []).map(e => {
            const medal = e.place === 1 ? "🥇" : e.place === 2 ? "🥈" : e.place === 3 ? "🥉" : (e.place + ".");
            return `<li><span>${medal} ${esc(e.username)}</span>
                <span class="tw-accent">${Math.round(e.wpm)} wpm · ${(e.accuracy || 0).toFixed(1)}%</span></li>`;
        }).join("") || `<li class="text-secondary">Hali natija yo'q — birinchi bo'ling!</li>`;
    }

    function renderStreak(me) {
        if (!me || !isAuth) { streakEl.classList.add("d-none"); return; }
        streakEl.classList.remove("d-none");
        const badge = me.badge ? `<span class="tw-badge">${esc(me.badge)}</span>` : "";
        const played = me.played ? ` · Bugun: ${Math.round(me.wpm)} wpm (#${me.rank})` : "";
        streakEl.innerHTML = `🔥 Streak: <b>${me.streak}</b> kun ${badge}${played}`;
    }

    // ── Typing engine ──
    function beginRace(text) {
        chars = Array.from(text || "");
        pos = 0; correct = 0; keypresses = 0; startTime = null; finished = false;
        liveEl.textContent = "0 wpm";
        resultEl.classList.add("d-none");
        wordsEl.innerHTML = chars.map(c => `<span class="tw-letter">${esc(c)}</span>`).join("");
        wordsEl.focus();
    }

    const letterEls = () => wordsEl.querySelectorAll(".tw-letter");
    wordsEl.addEventListener("click", () => wordsEl.focus());
    wordsEl.addEventListener("keydown", onKey);
    $("tw-contest-reset").addEventListener("click", () => beginRace(chars.join("")));

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
        liveEl.textContent = Math.round(wpmNow()) + " wpm";
        if (pos >= chars.length) finish();
    }

    const elapsed = () => startTime === null ? 0 : (performance.now() - startTime) / 1000;
    const wpmNow = () => { const e = elapsed(); return e > 0 ? (correct / 5) / (e / 60) : 0; };

    async function finish() {
        if (finished) return;
        finished = true;
        const seconds = elapsed();
        const incorrect = keypresses - correct;

        if (!isAuth) {
            resultEl.classList.remove("d-none");
            resultEl.innerHTML = `<b>${Math.round(wpmNow())} wpm</b> — natija saqlanmadi (tizimga kiring).`;
            return;
        }
        try {
            const r = await fetch("/api/contests/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ correctChars: correct, incorrectChars: incorrect, elapsedSeconds: seconds })
            });
            if (!r.ok) {
                const b = await r.json().catch(() => ({}));
                resultEl.classList.remove("d-none");
                resultEl.textContent = b.error || "Natija saqlanmadi.";
                return;
            }
            const res = await r.json();
            resultEl.classList.remove("d-none");
            const win = res.isWinner ? " 🏆 Siz yetakchisiz!" : "";
            resultEl.innerHTML = `<b>${Math.round(res.wpm)} wpm</b> · ${res.accuracy.toFixed(1)}% · #${res.rank}${win}`;
            await refreshStatus();
        } catch {
            resultEl.classList.remove("d-none");
            resultEl.textContent = "Tarmoq xatosi.";
        }
    }

    load();
})();

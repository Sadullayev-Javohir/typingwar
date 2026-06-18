/* TypingWar — AI / Ghost / Blind Duel poygasi (raqib jadval bo'yicha animatsiya) */
(function () {
    "use strict";

    const root = document.getElementById("tw-racepage");
    if (!root) return;
    const $ = id => document.getElementById(id);

    let mode = "AI", conn = null;

    const startBtn = $("tw-race-start"), errEl = $("tw-race-err"), vsEl = $("tw-vs"),
        youBar = $("tw-you-bar"), oppBar = $("tw-opp-bar"), youWpm = $("tw-you-wpm"),
        oppWpm = $("tw-opp-wpm"), oppName = $("tw-opp-name"), cdEl = $("tw-race-countdown"),
        areaEl = $("tw-race-area"), wordsEl = $("tw-race-words"), resultEl = $("tw-race-result"),
        verdictEl = $("tw-race-verdict"), detailEl = $("tw-race-detail");

    root.querySelectorAll(".tw-opt[data-mode]").forEach(b => b.addEventListener("click", () => {
        root.querySelectorAll(".tw-opt[data-mode]").forEach(x => x.classList.remove("tw-active"));
        b.classList.add("tw-active");
        mode = b.dataset.mode;
    }));

    let chars = [], pos = 0, correct = 0, keypresses = 0, startTime = null, finished = false;
    let schedule = [], aiFinishMs = 0, textId = null, targetWpm = 0, blind = false, rafId = null;
    let lastKeyTime = 0;

    startBtn.addEventListener("click", begin);
    $("tw-race-again").addEventListener("click", begin);

    function esc(s) { return String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

    async function ensureConn() {
        if (conn && conn.state === "Connected") return;
        conn = new signalR.HubConnectionBuilder().withUrl("/hubs/race").withAutomaticReconnect().build();
        await conn.start();
    }

    // Klient tomon AiTypingSimulator (ghost — server hisoblamaydi)
    function buildSchedule(wpm, n) {
        const out = []; let cum = 0;
        for (let i = 0; i < n; i++) {
            const eff = Math.max(5, wpm + (Math.floor(Math.random() * 7) - 3));
            const per = 60000 / (eff * 5);
            const jit = Math.floor(Math.random() * 31) - 15;
            cum += Math.max(10, per + jit);
            out.push(Math.round(cum));
        }
        return out;
    }

    async function begin() {
        errEl.textContent = "";
        resultEl.classList.add("d-none");
        blind = (mode === "Blind");
        try {
            let data;
            if (mode === "Ghost") {
                const pbr = await fetch("/api/practice/personalbest?timeMode=Thirty", { credentials: "same-origin" });
                const pb = await pbr.json();
                const wpm = pb.bestWpm > 0 ? pb.bestWpm : 40;
                const tr = await fetch("/api/practice/text?mode=Sentences&language=Uzbek&difficulty=Normal", { credentials: "same-origin" });
                const t = await tr.json();
                data = { text: t.content, textId: t.textId, targetWpm: Math.round(wpm), schedule: buildSchedule(wpm, t.content.length) };
                oppName.textContent = "👻 Ghost (" + Math.round(wpm) + " wpm)";
            } else {
                await ensureConn();
                data = await conn.invoke("StartAiRace");
                oppName.textContent = (blind ? "🙈 Blind " : "🤖 AI ") + "(" + data.targetWpm + " wpm)";
            }
            schedule = data.schedule; textId = data.textId; targetWpm = data.targetWpm;
            aiFinishMs = schedule.length ? schedule[schedule.length - 1] : 0;
            prepare(data.text);
            startCountdown();
        } catch (e) {
            errEl.textContent = "Boshlashda xatolik.";
        }
    }

    const cheetahLeft = pct => (2 + Math.min(100, pct) * 0.82) + '%';

    function prepare(text) {
        chars = Array.from(text);
        pos = 0; correct = 0; keypresses = 0; startTime = null; finished = false; lastKeyTime = 0;
        wordsEl.innerHTML = chars.map(c => `<span class="tw-letter">${esc(c)}</span>`).join("");
        wordsEl.classList.toggle("tw-blind", blind);
        youBar.style.left = "2%"; oppBar.style.left = "2%";
        youWpm.textContent = "0"; oppWpm.textContent = "0";
        if (window.TwCheetah) { window.TwCheetah.setRunning(youBar, false); window.TwCheetah.setRunning(oppBar, false); }
        vsEl.classList.remove("d-none");
    }

    function startCountdown() {
        areaEl.classList.add("d-none");
        cdEl.classList.remove("d-none");
        let n = 3; cdEl.textContent = n;
        const t = setInterval(() => {
            n--;
            if (n > 0) cdEl.textContent = n;
            else { clearInterval(t); cdEl.textContent = "BOSHLANDI!"; setTimeout(() => { cdEl.classList.add("d-none"); go(); }, 400); }
        }, 1000);
    }

    function go() {
        areaEl.classList.remove("d-none");
        wordsEl.focus();
        startTime = performance.now();
        rafId = requestAnimationFrame(tick);
    }

    const letterEls = () => wordsEl.querySelectorAll(".tw-letter");
    wordsEl.addEventListener("click", () => wordsEl.focus());
    wordsEl.addEventListener("keydown", onKey);

    function onKey(ev) {
        if (finished || startTime === null || chars.length === 0) return;
        if (ev.key === "Backspace") {
            ev.preventDefault();
            if (pos > 0) { pos--; letterEls()[pos].classList.remove("tw-correct", "tw-incorrect"); }
            return;
        }
        if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        ev.preventDefault();
        if (pos >= chars.length) return;

        const ok = ev.key === chars[pos];
        const el = letterEls()[pos];
        keypresses++;
        if (ok) { correct++; if (!blind) el.classList.add("tw-correct"); }
        else if (!blind) el.classList.add("tw-incorrect");
        pos++;
        lastKeyTime = performance.now();
        if (window.TWSound && window.TWSettings) window.TWSound.play(window.TWSettings.get("soundOnClick"), ok);
        if (pos >= chars.length) finish();
    }

    const elapsedMs = () => startTime === null ? 0 : performance.now() - startTime;

    function tick() {
        if (finished) return;
        const e = elapsedMs();
        const youProg = (pos / chars.length) * 100;
        const youW = e > 0 ? (correct / 5) / (e / 60000) : 0;
        youBar.style.left = cheetahLeft(youProg);
        youWpm.textContent = Math.round(youW);

        let oi = 0; while (oi < schedule.length && schedule[oi] <= e) oi++;
        oppBar.style.left = cheetahLeft((oi / chars.length) * 100);
        oppWpm.textContent = Math.round(targetWpm);

        // Mushuklarni yurg'izish — siz yozayotganda, raqib hali tugatmaganda
        if (window.TwCheetah) {
            const youRun = (performance.now() - lastKeyTime) < 500;
            window.TwCheetah.setRunning(youBar, youRun);
            if (youRun) window.TwCheetah.setSpeed(youBar, youW);
            const oppRun = e < aiFinishMs;
            window.TwCheetah.setRunning(oppBar, oppRun);
            if (oppRun) window.TwCheetah.setSpeed(oppBar, targetWpm);
        }

        rafId = requestAnimationFrame(tick);
    }

    function finish() {
        if (finished) return;
        finished = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (window.TwCheetah) { window.TwCheetah.setRunning(youBar, false); window.TwCheetah.setRunning(oppBar, false); }
        const e = elapsedMs();
        youBar.style.left = cheetahLeft(100);
        const wpm = e > 0 ? Math.round(((correct / 5) / (e / 60000)) * 100) / 100 : 0;
        const acc = keypresses > 0 ? Math.round((correct / keypresses) * 10000) / 100 : 0;
        const won = e <= aiFinishMs;
        showResult(won, wpm, acc);
        if (mode !== "Ghost" && conn) {
            conn.invoke("FinishAiRace", 30, correct, Math.max(0, keypresses - correct), e / 1000, textId, won).catch(() => { });
        }
    }

    function showResult(won, wpm, acc) {
        areaEl.classList.add("d-none");
        resultEl.classList.remove("d-none");
        verdictEl.textContent = won ? "🏆 G'alaba!" : "😅 Mag'lubiyat";
        detailEl.textContent = `Sizning natijangiz: ${wpm} WPM · ${acc}% · raqib: ${targetWpm} WPM`;
    }
})();

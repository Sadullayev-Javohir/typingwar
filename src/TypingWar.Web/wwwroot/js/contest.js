/* TypingWar — kunlik musobaqa: /Practice typing engine + natija linegraph */
(function () {
    "use strict";

    const root = document.getElementById("tw-contest");
    if (!root) return;

    const S = window.TWSettings;
    const isAuth = root.dataset.authenticated === "true";
    // Aldash himoyasi: bundan past aniqlikdagi natija hisobga olinmaydi (server bilan bir xil).
    const MIN_ACCURACY = 50;
    const TIME_BUCKETS = [10, 15, 30, 60, 120];

    const $ = id => document.getElementById(id);

    // DOM — o'yin maydoni
    const game = $("tw-contest-game");
    const wordsEl = $("tw-c-words");
    const wpmEl = $("tw-c-wpm"), accEl = $("tw-c-acc"), timerEl = $("tw-c-timer");
    const resultEl = $("tw-c-result");
    const cheetahEl = $("tw-c-cheetah");
    const hintEl = game.querySelector(".tw-hint");

    // DOM — musobaqa atrofi
    const boardEl = $("tw-contest-board"), dateEl = $("tw-contest-date"),
        streakEl = $("tw-contest-streak"), errEl = $("tw-contest-err"),
        loginEl = $("tw-contest-login");

    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

    // Holat (typing engine)
    let raceText = "";
    let chars = [], letterEls = [], status = [], pos = 0, keypresses = 0;
    let startTime = null, finished = false, liveTimer = null;
    let caretEl = null, wordsInner = null;
    let lastKeyTime = 0;
    const RUN_IDLE_MS = 500;
    let keyEvents = [];
    let lastGraphData = null, chartGeom = null;
    let submitted = false;

    if (!isAuth) loginEl.classList.remove("d-none");

    // Tipografik belgilarni klaviaturada yoziladigan ekvivalentga keltiradi.
    function normChar(ch) {
        switch (ch) {
            case "‐": case "‑": case "‒": case "–":
            case "—": case "―": case "−": return "-";
            case "‘": case "’": case "ʻ": case "ʼ":
            case "´": case "`": return "'";
            case "“": case "”": case "«": case "»": return '"';
            case " ": case " ": case " ": return " ";
            default: return ch;
        }
    }

    function nearestTimeMode(elapsed) {
        return TIME_BUCKETS.reduce((a, b) => Math.abs(b - elapsed) < Math.abs(a - elapsed) ? b : a);
    }

    // ── Ma'lumot olish ──
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
            raceText = data.contest.text || "";
            beginRace();
        } catch { errEl.textContent = "Musobaqa yuklanmadi."; }
    }

    // Natijadan keyin — typing maydonini reset qilmasdan jadval/streakni yangilash
    async function refreshStatus() {
        try {
            const data = await fetchData();
            renderBoard(data.top);
            renderStreak(data.me);
            return data.me;
        } catch { return null; }
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

    // ── Sozlamaga qarab ko'rsatkichlarni ko'rsatish/yashirish ──
    function applyStatVisibility() {
        const statsPanel = game.querySelector(".tw-stats");
        const track = game.querySelector(".tw-practice-track");
        if (statsPanel) statsPanel.style.display = S.get("showStatsPanel") === false ? "none" : "";
        if (track) track.style.display = S.get("showCheetah") === false ? "none" : "";
        const map = {
            "tw-c-stat-wpm": S.get("showLiveWpm"),
            "tw-c-stat-acc": S.get("showLiveAcc"),
            "tw-c-stat-timer": S.get("showLiveTimer")
        };
        for (const id in map) {
            const el = $(id);
            if (el) el.style.display = map[id] === false ? "none" : "";
        }
    }

    // ── Render / karet ──
    function render(text) {
        chars = Array.from(text);
        letterEls = [];
        status = new Array(chars.length);
        keyEvents = [];
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

        const style = S.get("caretStyle") || "Line";
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

    // ── Mushuk ──
    function updateCheetah() {
        if (!cheetahEl || chars.length === 0) return;
        const pct = (pos / chars.length) * 100;
        cheetahEl.style.left = (2 + Math.min(100, pct) * 0.82) + '%';
    }
    function setCheetahRun(on, wpm) {
        if (!cheetahEl) return;
        if (window.TwCheetah) {
            window.TwCheetah.setRunning(cheetahEl, on);
            if (on) window.TwCheetah.setSpeed(cheetahEl, wpm || 0);
        } else {
            cheetahEl.classList.toggle("tw-running", on);
        }
    }

    function correctCount() {
        let c = 0;
        for (let i = 0; i < pos; i++) if (status[i] === "correct") c++;
        return c;
    }

    function updateLetterView(i) {
        const el = letterEls[i];
        if (!el) return;
        el.classList.remove("tw-correct", "tw-incorrect");
        if (S.get("blindMode")) return;
        if (status[i] === "correct") el.classList.add("tw-correct");
        else if (status[i] === "incorrect") el.classList.add("tw-incorrect");
    }

    function startIfNeeded() {
        if (startTime === null) {
            startTime = performance.now();
            liveTimer = setInterval(tick, 150);
        }
    }
    const elapsedSec = () => startTime === null ? 0 : (performance.now() - startTime) / 1000;

    function tick() {
        if (finished) return;
        const e = elapsedSec();
        const cc = correctCount();
        const wpm = e > 0 ? (cc / 5) / (e / 60) : 0;
        const acc = keypresses > 0 ? (cc / keypresses) * 100 : 100;
        if (S.get("showLiveWpm")) wpmEl.textContent = Math.round(wpm);
        accEl.textContent = Math.round(acc);
        timerEl.textContent = Math.floor(e);

        const idle = performance.now() - lastKeyTime > RUN_IDLE_MS;
        if (idle) setCheetahRun(false);
        else setCheetahRun(true, wpm);
    }

    function handleKey(ev) {
        if (window.TWCaps) window.TWCaps.check(ev);

        if (finished) {
            if (ev.key === "Tab") { ev.preventDefault(); restart(); }
            return;
        }
        if (ev.key === "Tab") { ev.preventDefault(); restart(); return; }

        if (ev.key === "Backspace") {
            ev.preventDefault();
            if (pos > 0) { pos--; status[pos] = undefined; updateLetterView(pos); moveCaret(); }
            return;
        }

        if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        ev.preventDefault();
        // Aldash himoyasi: tugmani bosib turish (auto-repeat) — bitta bosish = bitta belgi.
        if (ev.repeat) return;
        if (pos >= chars.length) return;
        startIfNeeded();

        const expected = chars[pos];
        const correct = normChar(ev.key) === normChar(expected);

        keypresses++;
        keyEvents.push({ t: elapsedSec(), correct });
        if (window.TWSound) window.TWSound.play(S.get("soundOnClick"), correct);
        lastKeyTime = performance.now();
        setCheetahRun(true);

        const blind = !!S.get("blindMode");
        if (!correct && S.get("stopOnError") && !blind) {
            status[pos] = "incorrect";
            updateLetterView(pos);
            return;
        }

        status[pos] = correct ? "correct" : "incorrect";
        updateLetterView(pos);
        pos++;
        moveCaret();
        updateCheetah();

        if (pos >= chars.length) finish();
    }

    // ── Yangi musobaqa boshlash / qayta urinish ──
    function beginRace() {
        finished = false; submitted = false;
        pos = 0; keypresses = 0; startTime = null; keyEvents = [];
        if (liveTimer) clearInterval(liveTimer);
        wpmEl.textContent = "0"; accEl.textContent = "100"; timerEl.textContent = "0";
        if (cheetahEl) cheetahEl.style.left = "2%";
        lastKeyTime = 0;
        setCheetahRun(false);
        game.classList.remove("tw-show-result");
        resultEl.classList.add("d-none");
        render(raceText);
        game.focus();
    }
    const restart = () => beginRace();

    // ── Tugatish + natija ──
    async function finish() {
        if (finished) return;
        finished = true;
        if (liveTimer) clearInterval(liveTimer);
        setCheetahRun(false);
        if (window.TWCaps) window.TWCaps.hide();

        const e = elapsedSec();
        const cc = correctCount();
        const raw = keypresses;
        const incorrect = Math.max(0, raw - cc);
        const minutes = e > 0 ? e / 60 : 1 / 60;
        const wpm = Math.round(((cc / 5) / minutes) * 100) / 100;
        const rawWpm = Math.round(((raw / 5) / minutes) * 100) / 100;
        const acc = raw > 0 ? Math.round((cc / raw) * 10000) / 100 : 0;

        showResult(wpm, rawWpm, acc, e, cc, raw);

        const msgEl = $("tw-c-r-msg");
        if (cc <= 0 || acc < MIN_ACCURACY) {
            msgEl.textContent = `Aniqlik juda past (${Math.round(acc)}%) — natija hisobga olinmadi.`;
            return;
        }
        if (!isAuth) {
            msgEl.innerHTML = "Natija saqlanmadi — <a href='/Login' class='tw-accent'>tizimga kiring</a>.";
            return;
        }
        await submit(cc, incorrect, e);
    }

    function showResult(wpm, rawWpm, acc, e, cc, raw) {
        const incorrect = Math.max(0, raw - cc);
        $("tw-c-r-wpm").textContent = Math.round(wpm);
        $("tw-c-r-acc").innerHTML = Math.round(acc) + "<small>%</small>";
        $("tw-c-r-raw").textContent = Math.round(rawWpm);
        $("tw-c-r-chars").textContent = cc + "/" + incorrect;
        $("tw-c-r-time").innerHTML = (Math.round(e * 10) / 10) + "<small>s</small>";
        $("tw-c-r-rank").textContent = "—";

        const data = buildGraphData(e);
        lastGraphData = data;
        $("tw-c-r-cons").innerHTML = consistency(data.rawWpm) + "<small>%</small>";

        game.classList.add("tw-show-result");
        resultEl.classList.remove("d-none");
        requestAnimationFrame(() => drawChart(data));
    }

    async function submit(correctChars, incorrectChars, elapsedSeconds) {
        if (submitted) return;
        submitted = true;
        const msgEl = $("tw-c-r-msg");
        try {
            const r = await fetch("/api/contests/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ correctChars, incorrectChars, elapsedSeconds })
            });
            if (!r.ok) {
                const b = await r.json().catch(() => ({}));
                msgEl.textContent = b.error || "Natija saqlanmadi.";
                return;
            }
            const res = await r.json();
            $("tw-c-r-rank").textContent = "#" + res.rank;
            const badge = res.badge ? ` ${res.badge}` : "";
            const win = res.isWinner ? " 🏆 Siz yetakchisiz!" : "";
            msgEl.innerHTML = `#${res.rank} · 🔥 ${res.streak} kun${badge}${win}`;
            await refreshStatus();
        } catch {
            msgEl.textContent = "Tarmoq xatosi — natija saqlanmadi.";
        }
    }

    // ── Grafik (Practice bilan bir xil) ──
    function buildGraphData(duration) {
        const secs = Math.max(1, Math.ceil(duration));
        const rawN = new Array(secs).fill(0), corN = new Array(secs).fill(0), errN = new Array(secs).fill(0);
        for (const ev of keyEvents) {
            let i = Math.floor(ev.t);
            if (i < 0) i = 0; if (i >= secs) i = secs - 1;
            rawN[i]++;
            if (ev.correct) corN[i]++; else errN[i]++;
        }
        const rawWpm = [], netWpm = [], errAt = [], accAt = [];
        for (let i = 0; i < secs; i++) {
            let win = 1;
            if (i === secs - 1) win = Math.max(0.5, duration - (secs - 1));
            rawWpm.push((rawN[i] / 5) / (win / 60));
            netWpm.push((corN[i] / 5) / (win / 60));
            errAt.push(errN[i]);
            accAt.push(rawN[i] > 0 ? Math.round((corN[i] / rawN[i]) * 100) : 100);
        }
        return { rawWpm, netWpm, errAt, accAt, secs };
    }

    function consistency(arr) {
        const v = arr.filter(x => x > 0);
        if (v.length < 2) return 100;
        const mean = v.reduce((a, b) => a + b, 0) / v.length;
        if (mean <= 0) return 0;
        const variance = v.reduce((a, b) => a + (b - mean) * (b - mean), 0) / v.length;
        const cv = Math.sqrt(variance) / mean;
        return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
    }

    function drawLine(ctx, arr, xAt, yAt, color, w) {
        ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.beginPath();
        let started = false;
        for (let i = 0; i < arr.length; i++) {
            const x = xAt(i), y = yAt(arr[i]);
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function drawChart(data, hoverIdx) {
        const canvas = $("tw-c-r-chart");
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || 600;
        const cssH = 200;
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const cs = getComputedStyle(document.documentElement);
        const gold = (cs.getPropertyValue("--tw-gold") || "").trim() || "#E8A020";
        const sub = "#8a8aa0";
        const rawCol = "rgba(138,138,160,.55)";
        const errCol = "#ff5555";

        const padL = 38, padR = 12, padT = 14, padB = 22;
        const plotW = Math.max(10, cssW - padL - padR);
        const plotH = cssH - padT - padB;
        const n = data.secs;

        const maxWpm = Math.max(10, ...data.rawWpm, ...data.netWpm);
        const maxY = Math.max(20, Math.ceil(maxWpm / 20) * 20);
        const xAt = i => n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW;
        const yAt = v => padT + plotH - (Math.max(0, v) / maxY) * plotH;
        chartGeom = { padL, padT, plotW, plotH, n, xAt, maxY, cssW, cssH };

        ctx.font = "10px " + ((cs.getPropertyValue("--tw-ui-font") || "").trim() || "sans-serif");
        const steps = 4;
        for (let s = 0; s <= steps; s++) {
            const val = maxY * s / steps;
            const y = yAt(val);
            ctx.strokeStyle = "rgba(138,138,160,.14)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(cssW - padR, y); ctx.stroke();
            ctx.fillStyle = sub; ctx.fillText(String(Math.round(val)), 6, y + 3);
        }
        ctx.fillStyle = sub; ctx.textAlign = "center";
        const xStep = Math.max(1, Math.round(n / 8));
        for (let i = 0; i < n; i += xStep) ctx.fillText(String(i + 1), xAt(i), cssH - 6);
        ctx.textAlign = "start";

        if (hoverIdx != null && hoverIdx >= 0 && hoverIdx < n) {
            const hx = xAt(hoverIdx);
            ctx.strokeStyle = "rgba(232,160,32,.5)"; ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(hx, padT); ctx.lineTo(hx, padT + plotH); ctx.stroke();
            ctx.setLineDash([]);
        }

        drawLine(ctx, data.rawWpm, xAt, yAt, rawCol, 1.5);
        drawLine(ctx, data.netWpm, xAt, yAt, gold, 2.5);

        for (let i = 0; i < n; i++) {
            if (data.errAt[i] > 0) {
                const x = xAt(i), y = yAt(data.netWpm[i] || 0);
                ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2);
                ctx.fillStyle = errCol; ctx.fill();
                ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.stroke();
            }
        }

        if (hoverIdx != null && hoverIdx >= 0 && hoverIdx < n) {
            const hx = xAt(hoverIdx);
            [[data.rawWpm[hoverIdx], rawCol], [data.netWpm[hoverIdx], gold]].forEach(([v, c]) => {
                ctx.beginPath(); ctx.arc(hx, yAt(v), 4, 0, Math.PI * 2);
                ctx.fillStyle = c; ctx.fill();
                ctx.lineWidth = 2; ctx.strokeStyle = (cs.getPropertyValue("--tw-bg") || "#0F0F1A").trim();
                ctx.stroke();
            });
        }
    }

    function onChartHover(ev) {
        if (!lastGraphData || !chartGeom) return;
        const canvas = $("tw-c-r-chart"), tip = $("tw-c-r-tooltip");
        if (!canvas || !tip) return;
        const rect = canvas.getBoundingClientRect();
        const mx = ev.clientX - rect.left;
        const g = chartGeom, n = g.n;
        let idx = n <= 1 ? 0 : Math.round(((mx - g.padL) / g.plotW) * (n - 1));
        idx = Math.max(0, Math.min(n - 1, idx));

        drawChart(lastGraphData, idx);
        const d = lastGraphData;
        tip.innerHTML =
            "<div class='tw-tip-sec'>" + (idx + 1) + "-soniya</div>" +
            "<div><i class='tw-lg-dot tw-lg-wpm'></i>wpm: <b>" + Math.round(d.netWpm[idx]) + "</b></div>" +
            "<div><i class='tw-lg-dot tw-lg-raw'></i>raw: <b>" + Math.round(d.rawWpm[idx]) + "</b></div>" +
            "<div><i class='tw-lg-dot tw-lg-err'></i>xato: <b>" + d.errAt[idx] + "</b></div>" +
            "<div>aniqlik: <b>" + d.accAt[idx] + "%</b></div>";

        const hx = g.xAt(idx);
        tip.style.display = "block";
        const tipW = tip.offsetWidth;
        let left = hx - tipW / 2;
        left = Math.max(0, Math.min(g.cssW - tipW, left));
        tip.style.left = left + "px";
        tip.style.top = "0px";
    }

    function onChartLeave() {
        const tip = $("tw-c-r-tooltip");
        if (tip) tip.style.display = "none";
        if (lastGraphData) drawChart(lastGraphData);
    }

    // ── Hodisalar ──
    game.addEventListener("keydown", handleKey);
    game.addEventListener("focus", () => { if (hintEl) hintEl.style.opacity = "0"; });
    game.addEventListener("blur", () => { if (hintEl) hintEl.style.opacity = "1"; });
    wordsEl.addEventListener("click", () => game.focus());
    $("tw-c-restart").addEventListener("click", restart);
    $("tw-c-again").addEventListener("click", restart);

    const chartCanvas = $("tw-c-r-chart");
    if (chartCanvas) {
        chartCanvas.addEventListener("mousemove", onChartHover);
        chartCanvas.addEventListener("mouseleave", onChartLeave);
    }

    S.onChange(() => { applyStatVisibility(); moveCaret(); });
    window.addEventListener("resize", () => {
        moveCaret();
        if (lastGraphData && !resultEl.classList.contains("d-none")) drawChart(lastGraphData);
    });

    // Init
    applyStatVisibility();
    load();
})();

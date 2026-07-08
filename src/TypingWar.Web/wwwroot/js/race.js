/* TypingWar — AI / Ghost / Blind Duel poygasi.
   /Practice kabi: oldin sozlama tanlanadi, "Boshlash" bosilgach sozlamalar yashirinadi,
   poygadan so'ng siz va raqibning statistikasi grafik bilan ko'rsatiladi. */
(function () {
    "use strict";

    const root = document.getElementById("tw-racepage");
    if (!root) return;
    const $ = id => document.getElementById(id);
    const S = window.TWSettings;

    let mode = "AI", conn = null;
    // Aldash himoyasi: bundan past aniqlikda g'alaba berilmaydi (server bilan bir xil).
    const MIN_ACCURACY = 50;

    const startBtn = $("tw-race-start"), errEl = $("tw-race-err"), vsEl = $("tw-vs"),
        youBar = $("tw-you-bar"), oppBar = $("tw-opp-bar"), youWpm = $("tw-you-wpm"),
        oppWpm = $("tw-opp-wpm"), oppName = $("tw-opp-name"), cdEl = $("tw-race-countdown"),
        areaEl = $("tw-race-area"), wordsEl = $("tw-race-words"), resultEl = $("tw-race-result"),
        verdictEl = $("tw-race-verdict");

    // ───── Holat ─────
    let chars = [], pos = 0, correct = 0, keypresses = 0, startTime = null, finished = false;
    let schedule = [], aiFinishMs = 0, textId = null, targetWpm = 0, blind = false, rafId = null;
    let lastKeyTime = 0, currentSource = null;
    let keyEvents = [];          // grafik uchun: har bosish {t: soniya, correct}
    let lastGraphData = null;    // qayta chizish/hover uchun
    let chartGeom = null;
    // /Practice kabi matn maydoni: harf spanlari, holati, karet va surma ichki blok
    let letterEls = [], status = [], caretEl = null, wordsInner = null;

    function num(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }

    // Tipografik belgilarni klaviaturada yoziladigan ekvivalentga keltiradi (/Practice bilan bir xil)
    function normChar(ch) {
        switch (ch) {
            case "‐": case "‑": case "‒": case "–":
            case "—": case "―": case "−":
                return "-";
            case "‘": case "’": case "ʻ": case "ʼ":
            case "´": case "`":
                return "'";
            case "“": case "”": case "«": case "»":
                return '"';
            case " ": case " ": case " ":
                return " ";
            default:
                return ch;
        }
    }

    // ───── Sozlama tugmalari (raqib rejimi + til/rejim/uzunlik) ─────
    function refreshConfigButtons() {
        // Raqib rejimi (AI/Ghost/Blind) — race-local
        root.querySelectorAll(".tw-opt[data-mode]").forEach(b =>
            b.classList.toggle("tw-active", b.dataset.mode === mode));

        // O'zbek tilida "kod" rejimi yo'q
        const codeBtn = root.querySelector('.tw-opt[data-key="textMode"][data-value="Code"]');
        const uzbek = S.get("language") === "Uzbek";
        if (codeBtn) codeBtn.style.display = uzbek ? "none" : "";
        if (uzbek && S.get("textMode") === "Code") S.set("textMode", "Words");

        root.querySelectorAll('.tw-opt[data-key]').forEach(btn => {
            const key = btn.dataset.key, val = btn.dataset.value, cur = S.get(key);
            const active = typeof cur === "number" ? (num(val, NaN) === cur) : (String(cur) === val);
            btn.classList.toggle("tw-active", !!active);
        });

        // Iqtibos rejimida "Uzunlik" ko'rinadi, "So'z" yashiriladi
        const isQuote = S.get("textMode") === "Sentences";
        const quoteGroup = root.querySelector('.tw-config-group[data-group="quote"]');
        const countGroup = root.querySelector('.tw-config-group[data-group="count"]');
        if (quoteGroup) quoteGroup.style.display = isQuote ? "" : "none";
        if (countGroup) countGroup.style.display = isQuote ? "none" : "";
    }

    root.querySelectorAll(".tw-opt[data-mode]").forEach(b => b.addEventListener("click", () => {
        mode = b.dataset.mode;
        refreshConfigButtons();
    }));

    root.querySelectorAll(".tw-opt[data-key]").forEach(btn => btn.addEventListener("click", e => {
        e.preventDefault();
        const key = btn.dataset.key, val = btn.dataset.value;
        if (key === "wordCount") S.set(key, num(val, 25));
        else S.set(key, val);
        refreshConfigButtons();
    }));

    if (S && S.onChange) S.onChange(() => { refreshConfigButtons(); moveCaret(); });

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
        root.classList.add("tw-racing");          // sozlamalar + boshlash tugmasi yashirinadi
        blind = (mode === "Blind");
        const lang = S.get("language"), tMode = S.get("textMode");
        const wc = S.get("wordCount") || 25, qLen = S.get("quoteLength") || "all";
        try {
            let data;
            if (mode === "Ghost") {
                const pbr = await fetch("/api/practice/personalbest?modeKey=time:30", { credentials: "same-origin" });
                const pb = await pbr.json();
                const wpm = pb.bestWpm > 0 ? pb.bestWpm : 40;
                let url = `/api/practice/text?mode=${tMode}&language=${lang}&difficulty=Normal&wordCount=${wc}`;
                if (tMode === "Sentences") url += `&quoteLength=${encodeURIComponent(qLen)}`;
                const tr = await fetch(url, { credentials: "same-origin" });
                const t = await tr.json();
                data = { text: t.content, textId: t.textId, targetWpm: Math.round(wpm),
                         schedule: buildSchedule(wpm, t.content.length), source: t.source };
                oppName.innerHTML = "👻 Ghost (" + Math.round(wpm) + " wpm)";
            } else {
                await ensureConn();
                data = await conn.invoke("StartAiRace",
                    { mode: tMode, language: lang, wordCount: wc, quoteLength: qLen });
                oppName.innerHTML = (blind ? "🙈 Blind " : "🤖 AI ") + "(" + data.targetWpm + " wpm)";
            }
            schedule = data.schedule; textId = data.textId; targetWpm = data.targetWpm;
            currentSource = data.source || null;
            aiFinishMs = schedule.length ? schedule[schedule.length - 1] : 0;
            prepare(data.text);
            startCountdown();
        } catch (e) {
            errEl.textContent = "Boshlashda xatolik.";
            root.classList.remove("tw-racing");
        }
    }

    const cheetahLeft = pct => (2 + Math.min(100, pct) * 0.82) + '%';

    function prepare(text) {
        pos = 0; correct = 0; keypresses = 0; startTime = null; finished = false; lastKeyTime = 0;
        keyEvents = [];
        render(text);
        wordsEl.classList.toggle("tw-blind", blind);
        youBar.style.left = "2%"; oppBar.style.left = "2%";
        youWpm.textContent = "0"; oppWpm.textContent = "0";
        if (window.TwCheetah) { window.TwCheetah.setRunning(youBar, false); window.TwCheetah.setRunning(oppBar, false); }
        vsEl.classList.remove("d-none");
    }

    // /Practice'dagi kabi matnni chizadi: ichki surma blok, harf spanlari va karet
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

        const style = S.get("caretStyle") || "Line";
        const cw = Math.max(w, 6);
        let y = top;
        const BLOCK = ["Block", "Box", "Laser", "Wedge"];
        if (style === "Underline" || style === "Bottom") {
            const uh = style === "Bottom" ? 4 : 2;
            caretEl.style.width = cw + "px";
            caretEl.style.height = uh + "px";
            y = top + h - uh;
        } else if (BLOCK.indexOf(style) !== -1) {
            caretEl.style.width = cw + "px";
            caretEl.style.height = h + "px";
        } else if (style === "Dot") {
            const d = Math.max(6, Math.round(h * 0.28));
            caretEl.style.width = d + "px";
            caretEl.style.height = d + "px";
            y = top + h - d - 1;
        } else {
            const lw = style === "Thick" ? 4
                     : style === "Double" ? 7
                     : (style === "Pulse" || style === "Rainbow") ? 3 : 2;
            caretEl.style.width = lw + "px";
            caretEl.style.height = h + "px";
        }
        caretEl.style.transform = `translate(${left}px, ${y}px)`;
        updateCurrentWord();
        updateScroll();
    }

    // Tugagan qatorlarni yuqoriga suradi — joriy qator doim tepada ko'rinadi
    function updateScroll() {
        if (!wordsInner || !letterEls.length) return;
        const el = (pos < letterEls.length) ? letterEls[pos] : letterEls[letterEls.length - 1];
        if (!el) return;
        const offset = el.offsetTop - letterEls[0].offsetTop;
        wordsInner.style.transform = `translateY(${-offset}px)`;
    }

    // Joriy so'zni belgilaydi
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
        if (blind) return; // ko'r rejim — xato ko'rsatilmaydi
        if (status[i] === "correct") el.classList.add("tw-correct");
        else if (status[i] === "incorrect") el.classList.add("tw-incorrect");
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
        moveCaret();              // maydon endi ko'rinadi — karet/surma o'lchovlari to'g'ri bo'lsin
        startTime = performance.now();
        rafId = requestAnimationFrame(tick);
    }

    wordsEl.addEventListener("click", () => wordsEl.focus());
    wordsEl.addEventListener("keydown", onKey);

    function onKey(ev) {
        if (finished || startTime === null || chars.length === 0) return;
        if (ev.key === "Backspace") {
            ev.preventDefault();
            if (pos > 0) {
                pos--;
                if (status[pos] === "correct") correct--;
                status[pos] = undefined;
                updateLetterView(pos);
                moveCaret();
            }
            return;
        }
        if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        ev.preventDefault();
        // Tugmani bosib turish (auto-repeat) — bitta bosish = bitta belgi (cheat oldini olish).
        if (ev.repeat) return;
        if (pos >= chars.length) return;

        const ok = normChar(ev.key) === normChar(chars[pos]);
        keypresses++;
        keyEvents.push({ t: elapsedMs() / 1000, correct: ok });
        lastKeyTime = performance.now();
        if (window.TWSound && window.TWSettings) window.TWSound.play(window.TWSettings.get("soundOnClick"), ok);

        // "Xatoda to'xtash" sozlamasi (boshqa sahifalar bilan bir xil): yoqilgan bo'lsa
        // xato belgida karet TURADI — to'g'ri yozmaguncha oldinga yurmaydi. O'chirilgan
        // bo'lsa xato belgi "incorrect" deb belgilanib oldinga o'tiladi (xato yozish mumkin).
        // Har holatda WPM faqat TO'G'RI belgilardan hisoblanadi (correct), shuning uchun xato
        // yozish WPM ni KO'TARMAYDI; aniqlik = correct/keypresses xatolarni aks ettiradi.
        // Blind Duel: ko'rmay yozadi, har doim oldinga o'tadi (xatoni ko'rmaydi/tuzatmaydi).
        const stopOnError = !!(S && S.get("stopOnError"));
        if (!ok && stopOnError && !blind) {
            status[pos] = "incorrect";
            updateLetterView(pos);
            return;
        }
        status[pos] = ok ? "correct" : "incorrect";
        if (ok) correct++;
        updateLetterView(pos);
        pos++;
        moveCaret();
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
        const minutes = e > 0 ? e / 60000 : 1 / 60;
        const wpm = Math.round(((correct / 5) / minutes) * 100) / 100;
        const rawWpm = Math.round(((keypresses / 5) / minutes) * 100) / 100;
        const acc = keypresses > 0 ? Math.round((correct / keypresses) * 10000) / 100 : 0;
        // G'olib faqat to'g'ri yozilgan belgilarga bog'liq: aniqlik juda past bo'lsa
        // (bitta tugmani bosib turish yoki tasodifiy belgilar) — raqibdan tez "tugatgan"
        // bo'lsa ham g'alaba berilmaydi. WPM ham faqat to'g'ri belgilardan hisoblanadi.
        const valid = correct > 0 && acc >= MIN_ACCURACY;
        const won = valid && e <= aiFinishMs;
        showResult(won, valid, wpm, rawWpm, acc, e / 1000);
        if (mode !== "Ghost" && conn) {
            conn.invoke("FinishAiRace", 30, correct, Math.max(0, keypresses - correct), e / 1000, textId, won).catch(() => { });
        }
    }

    // ───── Grafik ma'lumotlari ─────
    // Foydalanuvchi: har soniyada net/raw WPM va xatolar
    function buildUserGraph(durationSec) {
        const secs = Math.max(1, Math.ceil(durationSec));
        const rawN = new Array(secs).fill(0), corN = new Array(secs).fill(0), errN = new Array(secs).fill(0);
        for (const ev of keyEvents) {
            let i = Math.floor(ev.t); if (i < 0) i = 0; if (i >= secs) i = secs - 1;
            rawN[i]++; if (ev.correct) corN[i]++; else errN[i]++;
        }
        const rawWpm = [], netWpm = [], errAt = [], accAt = [];
        for (let i = 0; i < secs; i++) {
            let win = 1;
            if (i === secs - 1) win = Math.max(0.5, durationSec - (secs - 1));
            rawWpm.push((rawN[i] / 5) / (win / 60));
            netWpm.push((corN[i] / 5) / (win / 60));
            errAt.push(errN[i]);
            accAt.push(rawN[i] > 0 ? Math.round((corN[i] / rawN[i]) * 100) : 100);
        }
        return { rawWpm, netWpm, errAt, accAt, secs };
    }

    // Raqib: schedule (kümülativ ms) bo'yicha har soniyada yozilgan belgilar -> WPM
    function buildAiWpm(secs) {
        const perSec = new Array(secs).fill(0);
        for (const ms of schedule) {
            let i = Math.floor(ms / 1000);
            if (i < 0) i = 0; if (i >= secs) continue;   // poyga tugagandan keyingi belgilar hisobga olinmaydi
            perSec[i]++;
        }
        return perSec.map(c => (c / 5) / (1 / 60));   // belgilar/soniya -> wpm
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

    function drawLine(ctx, arr, xAt, yAt, color, w, dash) {
        ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = "round";
        ctx.setLineDash(dash || []); ctx.beginPath();
        let started = false;
        for (let i = 0; i < arr.length; i++) {
            const x = xAt(i), y = yAt(arr[i]);
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke(); ctx.setLineDash([]);
    }

    // Siz (oltin) va raqib (qizil) WPM chizig'i + xato nuqtalari
    function drawChart(data, hoverIdx) {
        const canvas = $("tw-rr-chart");
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || 600, cssH = 200;
        canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const cs = getComputedStyle(document.documentElement);
        const gold = (cs.getPropertyValue("--tw-gold") || "").trim() || "#E8A020";
        const sub = "#8a8aa0", rawCol = "rgba(138,138,160,.5)", errCol = "#ff5555", aiCol = "#ff7849";

        const padL = 38, padR = 12, padT = 14, padB = 22;
        const plotW = Math.max(10, cssW - padL - padR), plotH = cssH - padT - padB;
        const n = data.secs;

        const maxWpm = Math.max(10, ...data.rawWpm, ...data.netWpm, ...data.aiWpm);
        const maxY = Math.max(20, Math.ceil(maxWpm / 20) * 20);
        const xAt = i => n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW;
        const yAt = v => padT + plotH - (Math.max(0, v) / maxY) * plotH;
        chartGeom = { padL, padT, plotW, plotH, n, xAt, maxY, cssW, cssH };

        ctx.font = "10px " + ((cs.getPropertyValue("--tw-ui-font") || "").trim() || "sans-serif");
        const steps = 4;
        for (let s = 0; s <= steps; s++) {
            const val = maxY * s / steps, y = yAt(val);
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
            ctx.strokeStyle = "rgba(232,160,32,.5)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(hx, padT); ctx.lineTo(hx, padT + plotH); ctx.stroke(); ctx.setLineDash([]);
        }

        drawLine(ctx, data.rawWpm, xAt, yAt, rawCol, 1.5);
        drawLine(ctx, data.aiWpm, xAt, yAt, aiCol, 2, [6, 4]);
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
            [[data.rawWpm[hoverIdx], rawCol], [data.aiWpm[hoverIdx], aiCol], [data.netWpm[hoverIdx], gold]].forEach(([v, c]) => {
                ctx.beginPath(); ctx.arc(hx, yAt(v), 4, 0, Math.PI * 2);
                ctx.fillStyle = c; ctx.fill();
                ctx.lineWidth = 2; ctx.strokeStyle = (cs.getPropertyValue("--tw-bg") || "#0F0F1A").trim();
                ctx.stroke();
            });
        }
    }

    function onChartHover(ev) {
        if (!lastGraphData || !chartGeom) return;
        const canvas = $("tw-rr-chart"), tip = $("tw-rr-tooltip");
        if (!canvas || !tip) return;
        const rect = canvas.getBoundingClientRect();
        const mx = ev.clientX - rect.left, g = chartGeom, n = g.n;
        let idx = n <= 1 ? 0 : Math.round(((mx - g.padL) / g.plotW) * (n - 1));
        idx = Math.max(0, Math.min(n - 1, idx));
        drawChart(lastGraphData, idx);
        const d = lastGraphData;
        tip.innerHTML =
            "<div class='tw-tip-sec'>" + (idx + 1) + "-soniya</div>" +
            "<div><i class='tw-lg-dot tw-lg-wpm'></i>siz: <b>" + Math.round(d.netWpm[idx]) + "</b></div>" +
            "<div><i class='tw-lg-dot tw-lg-ai'></i>raqib: <b>" + Math.round(d.aiWpm[idx]) + "</b></div>" +
            "<div><i class='tw-lg-dot tw-lg-err'></i>xato: <b>" + d.errAt[idx] + "</b></div>";
        const hx = g.xAt(idx);
        tip.style.display = "block";
        const tipW = tip.offsetWidth;
        let left = hx - tipW / 2;
        left = Math.max(0, Math.min(g.cssW - tipW, left));
        tip.style.left = left + "px"; tip.style.top = "0px";
    }

    function onChartLeave() {
        const tip = $("tw-rr-tooltip");
        if (tip) tip.style.display = "none";
        if (lastGraphData) drawChart(lastGraphData);
    }

    function showResult(won, valid, wpm, rawWpm, acc, durationSec) {
        areaEl.classList.add("d-none");
        vsEl.classList.add("d-none");
        resultEl.classList.remove("d-none");

        // Aniqlik juda past bo'lsa — g'alaba/mag'lubiyat emas, "hisobga olinmadi" deb ko'rsatiladi
        if (!valid) {
            verdictEl.textContent = "⚠️ Aniqlik juda past — g'alaba hisobga olinmadi";
            verdictEl.classList.remove("tw-win");
            verdictEl.classList.add("tw-lose");
        } else {
            verdictEl.textContent = won ? "🏆 G'alaba!" : "😅 Mag'lubiyat";
            verdictEl.classList.toggle("tw-win", won);
            verdictEl.classList.toggle("tw-lose", !won);
        }

        const incorrect = Math.max(0, keypresses - correct);
        const oppLabel = mode === "Ghost" ? "Ghost" : (blind ? "Blind" : "AI");
        const aiTime = aiFinishMs / 1000;

        $("tw-rr-wpm").textContent = Math.round(wpm);
        $("tw-rr-acc").innerHTML = Math.round(acc) + "<small>%</small>";
        $("tw-rr-raw").textContent = Math.round(rawWpm);
        $("tw-rr-chars").textContent = correct + "/" + incorrect;
        $("tw-rr-mode").textContent = S.get("textMode") === "Sentences" ? "iqtibos"
            : (S.get("language") === "Uzbek" ? "uz" : "en") + " · " + modeLabel(S.get("textMode"));

        // VS kartalar
        $("tw-versus-opp-name").textContent = oppLabel;
        $("tw-rr-opp-legend").textContent = oppLabel.toLowerCase();
        $("tw-vs-you-wpm").textContent = Math.round(wpm);
        $("tw-vs-you-acc").innerHTML = Math.round(acc) + "<small>%</small>";
        $("tw-vs-you-time").innerHTML = (Math.round(durationSec * 10) / 10) + "<small>s</small>";
        $("tw-vs-opp-wpm").textContent = Math.round(targetWpm);
        $("tw-vs-opp-time").innerHTML = (Math.round(aiTime * 10) / 10) + "<small>s</small>";

        const yc = resultEl.querySelector(".tw-versus-you");
        const oc = resultEl.querySelector(".tw-versus-opp");
        if (yc) yc.classList.toggle("tw-winner", won);
        if (oc) oc.classList.toggle("tw-winner", !won);

        // Grafik — siz va raqib bir o'qda
        const user = buildUserGraph(durationSec);
        const aiWpm = buildAiWpm(user.secs);
        const data = Object.assign({}, user, { aiWpm });
        lastGraphData = data;
        $("tw-rr-cons").innerHTML = consistency(data.netWpm) + "<small>%</small>";

        requestAnimationFrame(() => drawChart(data));
    }

    function modeLabel(m) {
        return m === "Words" ? "so'z" : m === "Numbers" ? "raqam" : m === "Code" ? "kod" : "iqtibos";
    }

    // ───── Tugmalar ─────
    startBtn.addEventListener("click", begin);
    $("tw-race-again").addEventListener("click", begin);
    $("tw-race-config").addEventListener("click", () => {
        // Boshlang'ich ko'rinishga qaytish — sozlamalar va Boshlash tugmasi qaytadi
        resultEl.classList.add("d-none");
        vsEl.classList.add("d-none");
        areaEl.classList.add("d-none");
        root.classList.remove("tw-racing");
    });

    const chartCanvas = $("tw-rr-chart");
    if (chartCanvas) {
        chartCanvas.addEventListener("mousemove", onChartHover);
        chartCanvas.addEventListener("mouseleave", onChartLeave);
    }
    window.addEventListener("resize", () => {
        moveCaret();
        if (lastGraphData && !resultEl.classList.contains("d-none")) drawChart(lastGraphData);
    });

    // Init
    refreshConfigButtons();
})();

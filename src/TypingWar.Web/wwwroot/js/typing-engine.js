/* TypingWar — typing engine: keystroke handler, WPM/aniqlik, karet, natija */
(function () {
    "use strict";

    const root = document.getElementById("tw-practice");
    if (!root) return;

    const S = window.TWSettings;
    const TIME_BUCKETS = [10, 15, 30, 60, 120];

    // DOM
    const wordsEl = document.getElementById("tw-words");
    const wpmEl = document.getElementById("tw-wpm");
    const accEl = document.getElementById("tw-acc");
    const timerEl = document.getElementById("tw-timer");
    const resultEl = document.getElementById("tw-result");
    const hintEl = root.querySelector(".tw-hint");

    // Holat
    let chars = [];          // matnning belgilari (probel ham)
    let letterEls = [];      // har belgiga mos <span>
    let status = [];         // 'correct' | 'incorrect' | undefined
    let pos = 0;
    let keypresses = 0;      // belgi bosishlari (raw uchun; backspace kirmaydi)
    let startTime = null;
    let finished = false;
    let textId = null;
    let liveTimer = null;
    let caretEl = null;

    function num(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }

    function nearestTimeMode(elapsed) {
        return TIME_BUCKETS.reduce((a, b) => Math.abs(b - elapsed) < Math.abs(a - elapsed) ? b : a);
    }

    async function loadText() {
        const mode = S.get("textMode");
        const lang = S.get("language");
        const diff = S.get("difficulty");
        const count = S.get("wordCount");
        const url = `/api/practice/text?mode=${mode}&language=${lang}&difficulty=${diff}&wordCount=${count}`;
        try {
            const r = await fetch(url, { credentials: "same-origin" });
            const dto = await r.json();
            return dto;
        } catch (e) {
            return { textId: null, content: "matn yuklanmadi qayta urinib koring", wordCount: 5 };
        }
    }

    function render(text) {
        chars = Array.from(text);
        letterEls = [];
        status = new Array(chars.length);
        wordsEl.textContent = "";

        const frag = document.createDocumentFragment();
        for (let i = 0; i < chars.length; i++) {
            const span = document.createElement("span");
            span.className = "tw-letter";
            span.textContent = chars[i];
            frag.appendChild(span);
            letterEls.push(span);
        }
        wordsEl.appendChild(frag);

        caretEl = document.createElement("span");
        caretEl.className = "tw-caret";
        wordsEl.appendChild(caretEl);
        moveCaret();
    }

    function moveCaret() {
        if (!caretEl) return;
        let left, top, h;
        if (pos < letterEls.length) {
            const el = letterEls[pos];
            left = el.offsetLeft; top = el.offsetTop; h = el.offsetHeight;
        } else if (letterEls.length) {
            const el = letterEls[letterEls.length - 1];
            left = el.offsetLeft + el.offsetWidth; top = el.offsetTop; h = el.offsetHeight;
        } else { return; }
        caretEl.style.transform = `translate(${left}px, ${top}px)`;
        caretEl.style.height = h + "px";
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
        if (S.get("blindMode")) return; // ko'r rejim — xato ko'rsatilmaydi
        if (status[i] === "correct") el.classList.add("tw-correct");
        else if (status[i] === "incorrect") el.classList.add("tw-incorrect");
    }

    function startIfNeeded() {
        if (startTime === null) {
            startTime = performance.now();
            liveTimer = setInterval(tick, 150);
        }
    }

    function elapsedSec() {
        return startTime === null ? 0 : (performance.now() - startTime) / 1000;
    }

    function tick() {
        if (finished) return;
        const e = elapsedSec();
        const cc = correctCount();
        const wpm = e > 0 ? (cc / 5) / (e / 60) : 0;
        const acc = keypresses > 0 ? (cc / keypresses) * 100 : 100;

        if (S.get("showLiveWpm")) wpmEl.textContent = Math.round(wpm);
        accEl.textContent = Math.round(acc);

        if (S.get("timedMode")) {
            const limit = S.get("timeLimitSeconds");
            const remaining = Math.max(0, limit - e);
            timerEl.textContent = Math.ceil(remaining);
            if (e >= limit) finish();
        } else {
            timerEl.textContent = Math.floor(e);
        }
    }

    function handleKey(ev) {
        if (finished) {
            if (ev.key === "Tab") { ev.preventDefault(); restart(); }
            return;
        }

        if (ev.key === "Tab") { ev.preventDefault(); restart(); return; }

        if (ev.key === "Backspace") {
            ev.preventDefault();
            if (pos > 0) {
                pos--;
                status[pos] = undefined;
                updateLetterView(pos);
                moveCaret();
            }
            return;
        }

        // Faqat bitta belgi hosil qiluvchi tugmalar
        if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        ev.preventDefault();

        if (pos >= chars.length) return;
        startIfNeeded();

        const expected = chars[pos];
        const correct = ev.key === expected;

        if (!correct && S.get("stopOnError")) {
            // xato bo'lsa oldinga o'tkazmaydi
            status[pos] = "incorrect";
            updateLetterView(pos);
            return;
        }

        keypresses++;
        status[pos] = correct ? "correct" : "incorrect";
        updateLetterView(pos);
        pos++;
        moveCaret();

        // Ovozli typing (sozlama: Off/Soft/Mechanical/Typewriter)
        if (window.TWSound) window.TWSound.play(S.get("soundOnClick"), correct);

        if (pos >= chars.length && !S.get("timedMode")) finish();
    }

    async function finish() {
        if (finished) return;
        finished = true;
        if (liveTimer) clearInterval(liveTimer);

        const e = elapsedSec();
        const cc = correctCount();
        const raw = keypresses;
        const incorrect = Math.max(0, raw - cc);
        const minutes = e > 0 ? e / 60 : 1 / 60;
        const wpm = Math.round(((cc / 5) / minutes) * 100) / 100;
        const rawWpm = Math.round(((raw / 5) / minutes) * 100) / 100;
        const acc = raw > 0 ? Math.round((cc / raw) * 10000) / 100 : 0;

        showResult(wpm, rawWpm, acc, e);

        const timeMode = S.get("timedMode") ? S.get("timeLimitSeconds") : nearestTimeMode(e);
        await submit(timeMode, cc, incorrect, e);
    }

    function showResult(wpm, rawWpm, acc, e) {
        document.getElementById("tw-r-wpm").textContent = wpm;
        document.getElementById("tw-r-raw").textContent = rawWpm;
        document.getElementById("tw-r-acc").textContent = acc;
        document.getElementById("tw-r-time").textContent = Math.round(e * 10) / 10;
        resultEl.classList.remove("d-none");
    }

    async function submit(timeMode, correctChars, incorrectChars, elapsedSeconds) {
        const msgEl = document.getElementById("tw-r-msg");
        try {
            const r = await fetch("/api/practice/result", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ timeMode, correctChars, incorrectChars, elapsedSeconds, textId })
            });
            if (r.status === 401) {
                msgEl.textContent = "Natijani saqlash uchun tizimga kiring.";
            } else if (r.ok) {
                const dto = await r.json();
                msgEl.textContent = dto.isNewPersonalBest ? "🏆 Yangi shaxsiy rekord!" : "Natija saqlandi.";
            } else {
                const err = await r.json().catch(() => ({}));
                msgEl.textContent = err.error || "Saqlashda xatolik.";
            }
        } catch (e) {
            // Oflayn — natijani navbatga qo'yamiz, internet kelganda sinxron bo'ladi
            if (window.TWOffline)
                window.TWOffline.enqueue({ timeMode, correctChars, incorrectChars, elapsedSeconds, textId });
            msgEl.textContent = "Natija oflayn saqlandi — internet kelganda yuboriladi.";
        }
    }

    async function restart() {
        finished = false;
        pos = 0; keypresses = 0; startTime = null;
        if (liveTimer) clearInterval(liveTimer);
        wpmEl.textContent = "0"; accEl.textContent = "100"; timerEl.textContent = "0";
        resultEl.classList.add("d-none");
        const dto = await loadText();
        textId = dto.textId;
        render(dto.content);
        root.focus();
    }

    // Config tugmalari
    function refreshConfigButtons() {
        root.querySelectorAll(".tw-opt").forEach(btn => {
            const key = btn.dataset.key;
            let val = btn.dataset.value;
            const cur = S.get(key);
            let active;
            if (key === "timedMode") active = (val === "false" && cur === false);
            else if (typeof cur === "number") active = (num(val, NaN) === cur);
            else active = (String(cur) === val);
            btn.classList.toggle("tw-active", !!active);
        });
        // "Vaqt" guruhida yoqilgan rejim belgisi
        if (S.get("timedMode")) {
            root.querySelectorAll('.tw-opt[data-key="timeLimitSeconds"]').forEach(b => {
                b.classList.toggle("tw-active", num(b.dataset.value, -1) === S.get("timeLimitSeconds"));
            });
            const off = root.querySelector('.tw-opt[data-value="false"][data-key="timedMode"]');
            if (off) off.classList.remove("tw-active");
        }
    }

    root.querySelectorAll(".tw-opt").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const key = btn.dataset.key;
            let val = btn.dataset.value;
            if (key === "timedMode") {
                S.setAll({ timedMode: false });
            } else if (key === "timeLimitSeconds") {
                S.setAll({ timedMode: true, timeLimitSeconds: num(val, 30) });
            } else if (key === "wordCount") {
                S.set(key, num(val, 25));
            } else {
                S.set(key, val);
            }
            refreshConfigButtons();
            restart();
        });
    });

    // Klaviatura
    root.addEventListener("keydown", handleKey);
    root.addEventListener("focus", () => { if (hintEl) hintEl.style.opacity = "0"; });
    root.addEventListener("blur", () => { if (hintEl) hintEl.style.opacity = "1"; });
    wordsEl.addEventListener("click", () => root.focus());

    document.getElementById("tw-restart").addEventListener("click", restart);
    document.getElementById("tw-again").addEventListener("click", restart);

    S.onChange(refreshConfigButtons);
    window.addEventListener("resize", moveCaret);

    // Init
    refreshConfigButtons();
    restart();
})();

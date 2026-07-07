/* TypingWar — typing engine: keystroke handler, WPM/aniqlik, karet, natija */
(function () {
    "use strict";

    const root = document.getElementById("tw-practice");
    if (!root) return;

    const S = window.TWSettings;
    const TIME_BUCKETS = [10, 15, 30, 60, 120];
    // Aldash himoyasi: bundan past aniqlikdagi natija hisobga olinmaydi (server bilan bir xil).
    const MIN_ACCURACY = 50;

    // DOM
    const wordsEl = document.getElementById("tw-words");
    const wpmEl = document.getElementById("tw-wpm");
    const accEl = document.getElementById("tw-acc");
    const timerEl = document.getElementById("tw-timer");
    const resultEl = document.getElementById("tw-result");
    const hintEl = root.querySelector(".tw-hint");
    const cheetahEl = document.getElementById("tw-cheetah-pos");
    const KB = window.TWKeyboard;
    const kbEl = document.getElementById("tw-keyboard");

    // Holat
    let chars = [];          // matnning belgilari (probel ham)
    let letterEls = [];      // har belgiga mos <span>
    let status = [];         // 'correct' | 'incorrect' | undefined
    let pos = 0;
    let keypresses = 0;      // belgi bosishlari (raw uchun; backspace kirmaydi)
    let startTime = null;
    let finished = false;
    let textId = null;
    let currentSource = null; // iqtibos manbasi (natijada ko'rsatiladi)
    let liveTimer = null;
    let caretEl = null;
    let wordsInner = null;   // harflar va karet shu ichki blokda — qatorlarni surish uchun
    let lastKeyTime = 0;     // oxirgi bosish vaqti (mushuk to'xtashi uchun)
    const RUN_IDLE_MS = 500; // bundan ko'p yozilmasa — mushuk to'xtaydi
    let keyEvents = [];      // grafik uchun: har bosishning {t: soniya, correct} tarixi
    let appending = false;   // vaqt rejimida so'z qo'shish jarayoni davom etyaptimi
    let lastGraphData = null;// natija grafigini qayta chizish uchun
    let chartGeom = null;    // grafik geometriyasi (hover hisoblovi uchun)

    function num(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }

    // Tipografik belgilarni klaviaturada yoziladigan ekvivalentga keltiradi.
    // Masalan matnda uzun tire "—" bo'lsa, foydalanuvchi oddiy "-" bossa ham to'g'ri sanaladi.
    function normChar(ch) {
        switch (ch) {
            case "‐": case "‑": case "‒": case "–":
            case "—": case "―": case "−":            // turli tire/minus → "-"
                return "-";
            case "‘": case "’": case "ʻ": case "ʼ":
            case "´": case "`":                            // qiyshiq apostrof/urg'u → "'"
                return "'";
            case "“": case "”": case "«": case "»":
                return '"';                                          // qiyshiq qo'shtirnoq → '"'
            case " ": case " ": case " ":
                return " ";                                          // uzilmas/ingichka probel → " "
            default:
                return ch;
        }
    }

    // Iqtibos rejimi — to'liq iqtibos yoziladi (vaqt/so'z soni qo'llanmaydi)
    function isQuoteMode() { return S.get("textMode") === "Sentences"; }
    // Effektiv "vaqt rejimi" — iqtibos rejimida hech qachon yoqilmaydi
    function timedActive() { return !!S.get("timedMode") && !isQuoteMode(); }

    // Tepa ko'rsatkichlar (WPM / Aniqlik / Soniya) — sozlamaga qarab ko'rsatish/yashirish
    function applyStatVisibility() {
        // Butun statistika paneli (katta div) va mushuk+yo'lakcha — sozlamada yoqilsa ko'rinadi
        const statsPanel = root.querySelector(".tw-stats");
        const track = root.querySelector(".tw-practice-track");
        if (statsPanel) statsPanel.style.display = S.get("showStatsPanel") === false ? "none" : "";
        if (track) track.style.display = S.get("showCheetah") === false ? "none" : "";

        // Ekran klaviaturasi — sozlamada o'chirilsa ko'rinmaydi (va fokus rejimda
        // ko'rsatilmaydi, aks holda pastda joy egallaydi)
        const kbOff = S.get("showKeyboard") === false;
        if (kbEl) kbEl.style.display = kbOff ? "none" : "";
        if (kbOff && document.body.classList.contains("tw-focus")) exitFocus();

        const map = {
            "tw-stat-wpm": S.get("showLiveWpm"),
            "tw-stat-acc": S.get("showLiveAcc"),
            "tw-stat-timer": S.get("showLiveTimer")
        };
        for (const id in map) {
            const el = document.getElementById(id);
            if (el) el.style.display = map[id] === false ? "none" : "";
        }
    }

    // Keyingi yoziladigan belgini klaviaturada yoritadi
    function updateKeyboard() {
        if (!KB || S.get("showKeyboard") === false || finished) return;
        KB.highlight(pos < chars.length ? chars[pos] : null);
    }

    // Fokus rejim — yozish boshlanganda asosiy ekran kattalashadi, navbar yashirinadi,
    // klaviatura pastda mahkamlanadi. Sozlamada klaviatura o'chiq bo'lsa ham fokus ishlaydi.
    function enterFocus() {
        if (S.get("showKeyboard") === false) return;
        document.body.classList.add("tw-focus");
    }
    function exitFocus() {
        document.body.classList.remove("tw-focus");
    }

    function nearestTimeMode(elapsed) {
        return TIME_BUCKETS.reduce((a, b) => Math.abs(b - elapsed) < Math.abs(a - elapsed) ? b : a);
    }

    // Rejim kaliti — shaxsiy rekord qaysi bo'lim (vaqt/so'z/iqtibos) bo'yicha saqlanishini aniqlaydi.
    function currentModeKey() {
        if (timedActive()) return "time:" + S.get("timeLimitSeconds");
        if (isQuoteMode()) return "quote";
        return "words:" + S.get("wordCount");
    }

    async function loadText(count) {
        const mode = S.get("textMode");
        const lang = S.get("language");
        const diff = S.get("difficulty");
        const wc = count || S.get("wordCount");
        let url = `/api/practice/text?mode=${mode}&language=${lang}&difficulty=${diff}&wordCount=${wc}`;
        if (mode === "Sentences") url += `&quoteLength=${encodeURIComponent(S.get("quoteLength") || "all")}`;
        try {
            const r = await fetch(url, { credentials: "same-origin" });
            const dto = await r.json();
            return dto;
        } catch (e) {
            return { textId: null, content: "matn yuklanmadi qayta urinib koring", wordCount: 5 };
        }
    }

    // Vaqt rejimida matn tugamasin — oxiriga yetganda yana so'z qo'shamiz (monkeytype kabi)
    async function appendMoreWords() {
        if (appending || finished) return;
        appending = true;
        const dto = await loadText(50);
        if (!finished && dto && dto.content) appendChars(" " + dto.content);
        appending = false;
    }

    // Mavjud matn oxiriga yangi belgilarni (span bilan) qo'shadi
    function appendChars(text) {
        const newChars = Array.from(text);
        const frag = document.createDocumentFragment();
        for (let i = 0; i < newChars.length; i++) {
            const span = document.createElement("span");
            span.className = "tw-letter";
            span.textContent = newChars[i];
            frag.appendChild(span);
            letterEls.push(span);
            chars.push(newChars[i]);
            status.push(undefined);
        }
        const container = wordsInner || wordsEl;
        if (caretEl) container.insertBefore(frag, caretEl);
        else container.appendChild(frag);
    }

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

        // Karet uslubiga qarab o'lcham va joylashuv
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
            y = top + h - d - 1;            // tagiga yaqin
        } else {
            // chiziqsimon: Line, Thick, Neon, Pulse, Double, Rainbow, Off
            const lw = style === "Thick" ? 4
                     : style === "Double" ? 7
                     : (style === "Pulse" || style === "Rainbow") ? 3 : 2;
            caretEl.style.width = lw + "px";
            caretEl.style.height = h + "px";
        }
        caretEl.style.transform = `translate(${left}px, ${y}px)`;
        updateCurrentWord();
        updateScroll();
        updateKeyboard();
    }

    // Tugagan qatorlarni yuqoriga suradi — joriy qator doim eng tepada ko'rinadi
    // (foydalanuvchi bitta qatorda turib yozadi, yozib bo'lingan qator yo'qoladi)
    function updateScroll() {
        if (!wordsInner || !letterEls.length) return;
        const el = (pos < letterEls.length) ? letterEls[pos] : letterEls[letterEls.length - 1];
        if (!el) return;
        const offset = el.offsetTop - letterEls[0].offsetTop;
        wordsInner.style.transform = `translateY(${-offset}px)`;
    }

    // Joriy so'zni belgilaydi (ko'rsatkich qaysi so'zga kelganini bildiradi)
    function updateCurrentWord() {
        if (!chars.length) return;
        for (let i = 0; i < letterEls.length; i++)
            if (letterEls[i]) letterEls[i].classList.remove("tw-cur-word");
        const p = Math.min(pos, chars.length - 1);
        if (chars[p] === " ") return; // probelda — so'z belgilanmaydi
        let s = p; while (s > 0 && chars[s - 1] !== " ") s--;
        let e = p; while (e < chars.length - 1 && chars[e + 1] !== " ") e++;
        for (let i = s; i <= e; i++)
            if (letterEls[i]) letterEls[i].classList.add("tw-cur-word");
    }

    const CHEETAH_REF_WPM = 80; // vaqt rejimida finishga yetish uchun talab etiladigan sur'at
    function updateCheetah() {
        if (!cheetahEl) return;
        let pct;
        if (timedActive()) {
            // Mushuk YOZILGAN belgilarga qarab yuradi (vaqtga emas) — yozmasa joyida turadi
            const limit = S.get("timeLimitSeconds");
            const target = Math.max(1, (limit / 60) * CHEETAH_REF_WPM * 5);
            pct = (pos / target) * 100;
        } else {
            if (chars.length === 0) return;
            pct = (pos / chars.length) * 100;
        }
        cheetahEl.style.left = (2 + Math.min(100, pct) * 0.82) + '%';
    }

    // Mushukni yurg'izish/to'xtatish va tezligini WPM ga moslash
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
        if (S.get("blindMode")) return; // ko'r rejim — xato ko'rsatilmaydi
        if (status[i] === "correct") el.classList.add("tw-correct");
        else if (status[i] === "incorrect") el.classList.add("tw-incorrect");
    }

    function startIfNeeded() {
        if (startTime === null) {
            startTime = performance.now();
            liveTimer = setInterval(tick, 150);
            enterFocus();   // yozish boshlandi — fokus rejimga o'tamiz
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

        // Mushuk: yozayotgan bo'lsa WPM tezligida yuradi, bo'sh tursa to'xtaydi
        const idle = performance.now() - lastKeyTime > RUN_IDLE_MS;
        if (idle) setCheetahRun(false);
        else setCheetahRun(true, wpm);

        if (timedActive()) {
            const limit = S.get("timeLimitSeconds");
            const remaining = Math.max(0, limit - e);
            timerEl.textContent = Math.ceil(remaining);
            if (e >= limit) finish();        // mushuk pozitsiyasi yozish paytida (handleKey) yangilanadi
        } else {
            timerEl.textContent = Math.floor(e);
        }
    }

    function handleKey(ev) {
        if (window.TWCaps) window.TWCaps.check(ev);   // Caps Lock ogohlantirishi

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

        // Aldash himoyasi #1: tugmani bosib turish (klaviatura auto-repeat) — bitta bosish = bitta belgi.
        // Aks holda bitta tugmani bosib turib butun matnni "yozib" poygani yutib ketish mumkin edi.
        if (ev.repeat) return;

        if (pos >= chars.length) return;
        startIfNeeded();

        const expected = chars[pos];
        const correct = normChar(ev.key) === normChar(expected);

        // Har bosish (to'g'ri/xato) hisoblanadi — aniqlik va grafik to'g'ri bo'lsin
        keypresses++;
        keyEvents.push({ t: elapsedSec(), correct });   // grafik tarixi
        if (KB && S.get("showKeyboard") !== false) KB.flash(expected, correct);
        if (window.TWSound) window.TWSound.play(S.get("soundOnClick"), correct);
        lastKeyTime = performance.now();
        setCheetahRun(true);

        // "Xatodan to'xtash" yoqilgan bo'lsa: xato belgida karet oldinga o'tmaydi —
        // to'g'ri belgi yozilmaguncha shu yerda turadi (xato bosish hisoblanadi, vaqt o'tadi).
        // Ko'r rejim (blindMode) bundan mustasno: foydalanuvchi xatoni ko'rmaydi va tuzata olmaydi,
        // shuning uchun karet doim oldinga yuradi.
        // Eslatma: WPM faqat to'g'ri belgilarga qarab hisoblanadi va past aniqlikdagi natija
        // (auto-repeat allaqachon bloklangan, qolgan tasodifiy belgilar) finish()da rad etiladi —
        // shuning uchun karetni oldinga o'tkazadigan rejimlar ham xavfsiz.
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

        // Vaqt rejimida matn tugashiga oz qolsa — yana so'z qo'shamiz
        if (timedActive() && pos > chars.length - 40) appendMoreWords();

        if (pos >= chars.length && !timedActive()) finish();
    }

    async function finish() {
        if (finished) return;
        finished = true;
        if (liveTimer) clearInterval(liveTimer);
        setCheetahRun(false);   // poyga tugadi — mushuk to'xtaydi
        exitFocus();            // natija ekrani — navbar qaytadi, klaviatura yashirinadi
        if (KB) KB.clear();
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

        // Aldash himoyasi #2: aniqlik juda past bo'lsa (bitta tugmani bosib turish yoki turli xil
        // tasodifiy belgilarni yozish) natija haqiqiy emas — saqlanmaydi, poyga yutilmaydi.
        // Natija ekrani baribir ko'rsatiladi (foydalanuvchi statistikasini ko'rsin), lekin yuborilmaydi.
        if (cc <= 0 || acc < MIN_ACCURACY) {
            const msgEl = document.getElementById("tw-r-msg");
            if (msgEl) msgEl.textContent =
                `Aniqlik juda past (${Math.round(acc)}%) — natija hisobga olinmadi.`;
            return;
        }

        const timeMode = timedActive() ? S.get("timeLimitSeconds") : nearestTimeMode(e);
        await submit(timeMode, cc, incorrect, e, currentModeKey());
    }

    function showResult(wpm, rawWpm, acc, e, cc, raw) {
        const incorrect = Math.max(0, raw - cc);
        document.getElementById("tw-r-wpm").textContent = Math.round(wpm);
        document.getElementById("tw-r-acc").innerHTML = Math.round(acc) + "<small>%</small>";
        document.getElementById("tw-r-raw").textContent = Math.round(rawWpm);
        document.getElementById("tw-r-chars").textContent = cc + "/" + incorrect;
        document.getElementById("tw-r-time").innerHTML = (Math.round(e * 10) / 10) + "<small>s</small>";

        const data = buildGraphData(e);
        lastGraphData = data;
        document.getElementById("tw-r-cons").innerHTML = consistency(data.rawWpm) + "<small>%</small>";
        document.getElementById("tw-r-mode").textContent = isQuoteMode()
            ? "iqtibos"
            : timedActive()
                ? ("vaqt · " + S.get("timeLimitSeconds") + "s")
                : ("so'z · " + S.get("wordCount"));

        // Iqtibos manbasi — faqat iqtibos rejimida (manba bo'lsa) ko'rsatiladi
        const sourceEl = document.getElementById("tw-r-source");
        const sourceTextEl = document.getElementById("tw-r-source-text");
        if (sourceEl && sourceTextEl) {
            if (currentSource) {
                sourceTextEl.textContent = currentSource;
                sourceEl.classList.remove("d-none");
            } else {
                sourceEl.classList.add("d-none");
            }
        }

        // Yangi rekord — avvalgi eng yaxshi WPM dan oshsa toj va fon rangi o'zgaradi
        const isRecord = checkRecord(wpm);
        const crownEl = document.getElementById("tw-r-crown");
        if (crownEl) crownEl.classList.toggle("d-none", !isRecord);
        document.body.classList.toggle("tw-record", isRecord);

        root.classList.add("tw-show-result");       // typing UI yashirinadi
        resultEl.classList.remove("d-none");
        requestAnimationFrame(() => drawChart(data)); // layoutdan keyin (clientWidth to'g'ri bo'lsin)
    }

    // Avvalgi eng yaxshi WPM bilan solishtiradi (brauzerda saqlanadi); rekord bo'lsa true.
    // BIRINCHI natija (avvalgi rekord yo'q) ham rekord hisoblanadi — yangi foydalanuvchi
    // 1 wpm bilan yozsa ham bu uning birinchi darajasi, shuning uchun toj chiqadi.
    function checkRecord(wpm) {
        let prev = 0, hasPrev = false;
        try {
            const raw = localStorage.getItem("tw_best_wpm");
            hasPrev = raw !== null;
            prev = parseFloat(raw || "0") || 0;
        } catch (e) { }
        const isRecord = !hasPrev || wpm > prev;
        if (!hasPrev || wpm > prev) { try { localStorage.setItem("tw_best_wpm", String(wpm)); } catch (e) { } }
        return isRecord;
    }

    // Har soniya uchun WPM/raw/xato ma'lumotini tayyorlaydi (qayerda tez/sekin/xato)
    function buildGraphData(duration) {
        const secs = Math.max(1, Math.ceil(duration));
        const rawN = new Array(secs).fill(0);
        const corN = new Array(secs).fill(0);
        const errN = new Array(secs).fill(0);
        for (const ev of keyEvents) {
            let i = Math.floor(ev.t);
            if (i < 0) i = 0; if (i >= secs) i = secs - 1;
            rawN[i]++;
            if (ev.correct) corN[i]++; else errN[i]++;
        }
        const rawWpm = [], netWpm = [], errAt = [], accAt = [];
        for (let i = 0; i < secs; i++) {
            let win = 1;
            if (i === secs - 1) win = Math.max(0.5, duration - (secs - 1)); // oxirgi to'liqsiz soniya
            rawWpm.push((rawN[i] / 5) / (win / 60));
            netWpm.push((corN[i] / 5) / (win / 60));
            errAt.push(errN[i]);
            accAt.push(rawN[i] > 0 ? Math.round((corN[i] / rawN[i]) * 100) : 100);
        }
        return { rawWpm, netWpm, errAt, accAt, secs };
    }

    // Barqarorlik (consistency) — soniyalik raw WPM ning o'zgaruvchanligi
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

    // Natija grafigini canvas ga chizadi (WPM oltin, raw kulrang, xato qizil nuqta)
    // hoverIdx — sichqoncha ko'rsatgan soniya (ko'rsatkich chizig'i va nuqtalar uchun)
    function drawChart(data, hoverIdx) {
        const canvas = document.getElementById("tw-r-chart");
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

        // Grafik geometriyasi — hover hisoblovi uchun saqlanadi
        chartGeom = { padL, padT, plotW, plotH, n, xAt, maxY, cssW, cssH };

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

        drawLine(ctx, data.rawWpm, xAt, yAt, rawCol, 1.5);
        drawLine(ctx, data.netWpm, xAt, yAt, gold, 2.5);

        // Xato nuqtalari (o'sha soniyada xato bo'lsa) — qizil halqa bilan ajralib turadi
        for (let i = 0; i < n; i++) {
            if (data.errAt[i] > 0) {
                const x = xAt(i), y = yAt(data.netWpm[i] || 0);
                ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2);
                ctx.fillStyle = errCol; ctx.fill();
                ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.stroke();
            }
        }

        // Hover dagi nuqtalarni yoritamiz
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

    // Sichqoncha grafik ustida — eng yaqin soniyani topib, tooltip ko'rsatadi
    function onChartHover(ev) {
        if (!lastGraphData || !chartGeom) return;
        const canvas = document.getElementById("tw-r-chart");
        const tip = document.getElementById("tw-r-tooltip");
        if (!canvas || !tip) return;
        const rect = canvas.getBoundingClientRect();
        const mx = ev.clientX - rect.left;
        const g = chartGeom;
        const n = g.n;
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
        const tip = document.getElementById("tw-r-tooltip");
        if (tip) tip.style.display = "none";
        if (lastGraphData) drawChart(lastGraphData);
    }

    async function submit(timeMode, correctChars, incorrectChars, elapsedSeconds, modeKey) {
        const msgEl = document.getElementById("tw-r-msg");
        try {
            const r = await fetch("/api/practice/result", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ timeMode, correctChars, incorrectChars, elapsedSeconds, textId, modeKey })
            });
            if (r.status === 401) {
                msgEl.textContent = "Natijani saqlash uchun tizimga kiring.";
            } else if (r.ok) {
                const dto = await r.json();
                msgEl.textContent = dto.isNewPersonalBest ? "🏆 Yangi shaxsiy rekord!" : "Natija saqlandi.";
                // Server (rejim bo'yicha) shaxsiy rekordni tasdiqlasa — tojni ko'rsatamiz
                if (dto.isNewPersonalBest) {
                    const crownEl = document.getElementById("tw-r-crown");
                    if (crownEl) crownEl.classList.remove("d-none");
                    document.body.classList.add("tw-record");
                }
            } else {
                const err = await r.json().catch(() => ({}));
                msgEl.textContent = err.error || "Saqlashda xatolik.";
            }
        } catch (e) {
            // Oflayn — natijani navbatga qo'yamiz, internet kelganda sinxron bo'ladi
            if (window.TWOffline)
                window.TWOffline.enqueue({ timeMode, correctChars, incorrectChars, elapsedSeconds, textId, modeKey });
            msgEl.textContent = "Natija oflayn saqlandi — internet kelganda yuboriladi.";
        }
    }

    async function restart() {
        finished = false;
        pos = 0; keypresses = 0; startTime = null; keyEvents = []; appending = false;
        if (liveTimer) clearInterval(liveTimer);
        wpmEl.textContent = "0"; accEl.textContent = "100"; timerEl.textContent = "0";
        if (cheetahEl) cheetahEl.style.left = "2%";
        lastKeyTime = 0;
        setCheetahRun(false);   // yangi matn — mushuk turadi (yozilguncha)
        exitFocus();            // yangi matn — fokus rejimdan chiqamiz (yozilguncha)
        root.classList.remove("tw-show-result");   // typing UI qaytadi
        document.body.classList.remove("tw-record");
        resultEl.classList.add("d-none");
        // Vaqt rejimida matn yetarli bo'lsin (oxirida yana qo'shiladi)
        const dto = await loadText(timedActive() ? 60 : S.get("wordCount"));
        textId = dto.textId;
        currentSource = dto.source || null;
        render(dto.content);
        root.focus();
    }

    // Config tugmalari
    function refreshConfigButtons() {
        // O'zbek tilida "kod" rejimi yo'q — tugmani yashirish va kerak bo'lsa "so'z"ga qaytish
        const codeBtn = root.querySelector('.tw-opt[data-key="textMode"][data-value="Code"]');
        const uzbek = S.get("language") === "Uzbek";
        if (codeBtn) codeBtn.style.display = uzbek ? "none" : "";
        if (uzbek && S.get("textMode") === "Code") {
            S.set("textMode", "Words");
        }

        const timed = !!S.get("timedMode");

        root.querySelectorAll(".tw-opt").forEach(btn => {
            const key = btn.dataset.key;
            let val = btn.dataset.value;
            const cur = S.get(key);
            let active;
            if (key === "timedMode") active = ((val === "true") === timed);
            else if (typeof cur === "number") active = (num(val, NaN) === cur);
            else active = (String(cur) === val);
            btn.classList.toggle("tw-active", !!active);
        });

        const quote = isQuoteMode();
        const testGroup = root.querySelector('.tw-config-group[data-group="testmode"]');
        const countGroup = root.querySelector('.tw-config-group[data-group="count"]');
        const timedGroup = root.querySelector('.tw-config-group[data-group="timed"]');
        const quoteGroup = root.querySelector('.tw-config-group[data-group="quote"]');

        // Iqtibos rejimida "Tur/So'z/Vaqt" yashiriladi, o'rniga "Uzunlik" ko'rinadi
        if (quoteGroup) quoteGroup.style.display = quote ? "" : "none";
        if (testGroup) testGroup.style.display = quote ? "none" : "";
        if (countGroup) countGroup.style.display = quote ? "none" : (timed ? "none" : "");
        if (timedGroup) timedGroup.style.display = quote ? "none" : (timed ? "" : "none");
    }

    root.querySelectorAll(".tw-opt").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const key = btn.dataset.key;
            let val = btn.dataset.value;
            if (key === "timedMode") {
                S.setAll({ timedMode: val === "true" });
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
    // Ekran klaviaturasini bosish typing fokusini olib qo'ymasin (yozish davom etsin)
    if (kbEl) {
        kbEl.addEventListener("mousedown", (e) => e.preventDefault());
        kbEl.addEventListener("click", () => root.focus());
    }

    document.getElementById("tw-restart").addEventListener("click", restart);
    document.getElementById("tw-again").addEventListener("click", restart);

    // Grafik hover — tooltip va ko'rsatkich chizig'i
    const chartCanvas = document.getElementById("tw-r-chart");
    if (chartCanvas) {
        chartCanvas.addEventListener("mousemove", onChartHover);
        chartCanvas.addEventListener("mouseleave", onChartLeave);
    }

    S.onChange(() => { refreshConfigButtons(); applyStatVisibility(); moveCaret(); });
    window.addEventListener("resize", () => {
        moveCaret();
        if (lastGraphData && !resultEl.classList.contains("d-none")) drawChart(lastGraphData);
    });

    // Init
    if (KB && kbEl) KB.mount(kbEl);
    refreshConfigButtons();
    applyStatVisibility();
    restart();
})();

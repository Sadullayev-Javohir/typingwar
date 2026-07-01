/* TypingWar — turnir (live playoff, host boshqaruvi, tomoshabin)
   Typing maydoni /Practice bilan bir xil engine. */
(function () {
    "use strict";

    const root = document.getElementById("tw-tournament");
    if (!root) return;

    const id = new URLSearchParams(location.search).get("id");
    const $ = x => document.getElementById(x);
    if (!id) { $("tw-terr").textContent = "Turnir ko'rsatilmagan."; return; }

    const isAuth = root.dataset.authenticated === "true";
    const myUserId = (root.dataset.userid || "").toLowerCase();
    const S = window.TWSettings;
    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const eq = (a, b) => a && b && String(a).toLowerCase() === String(b).toLowerCase();

    const STATUS = { 0: "Ro'yxat ochiq", 1: "Davom etmoqda", 2: "Tugagan" };
    const STATUS_CLASS = { 0: "tw-st-reg", 1: "tw-st-live", 2: "tw-st-done" };

    // Bracket zoom/pan (Google Maps uslubi) — bir marta ulanadi, render orasida saqlanadi
    let bracketZoom = null;
    function ensureBracketZoom() {
        if (bracketZoom || !window.TWBracketZoom) return;
        const vp = $("tw-bracket-viewport"), cv = $("tw-bracket-canvas");
        if (!vp || !cv) return;
        bracketZoom = window.TWBracketZoom.attach(vp, cv, { tools: $("tw-bracket-tools") });
    }
    // Backend enumni STRING ("Registration"/"InProgress"/"Finished") qaytaradi — raqamga normallashtiramiz
    const statusKey = s => typeof s === "number" ? s
        : ({ Registration: 0, InProgress: 1, Finished: 2 }[s] ?? -1);

    // ── Kubok: chempion g'alabasini bildirish (3D trophy modulга) ──
    let trophyCelebrated = false;
    function celebrateTrophy(name) {
        if (trophyCelebrated) return;
        trophyCelebrated = true;
        const fire = () => {
            if (window.TWTrophy && window.TWTrophy.celebrate) window.TWTrophy.celebrate(name);
            else window.dispatchEvent(new CustomEvent("tw-trophy-champion", { detail: { name } }));
        };
        fire();
        // modul keyinroq yuklansa — biroz keyin yana bir bor
        setTimeout(fire, 400);
    }

    // ── Holat ──
    let detail = null, conn = null;
    let isHost = false, isRegistered = false;
    let roundActive = false, myMatch = null, eliminated = false;
    const live = {};   // matchId -> {p1:{prog,wpm,fin}, p2:{...}} (joriy round live)

    // typing holati (Practice bilan bir xil)
    let chars = [], letterEls = [], statusArr = [], pos = 0, keypresses = 0,
        startTime = null, finished = false, lastReport = 0;
    let wordsInner = null, caretEl = null, liveTimer = null, keyEvents = [];

    const wordsEl = $("tw-words"), wpmEl = $("tw-wpm"), accEl = $("tw-acc"), timerEl = $("tw-timer");

    function normChar(ch) {
        switch (ch) {
            case "‐": case "‑": case "‒": case "–": case "—": case "―": case "−": return "-";
            case "‘": case "’": case "ʻ": case "ʼ": case "´": case "`": return "'";
            case "“": case "”": case "«": case "»": return '"';
            case " ": case " ": case " ": return " ";
            default: return ch;
        }
    }

    // ═══════════════ REST holat ═══════════════
    async function loadDetail() {
        try {
            const r = await fetch("/api/tournaments/" + id, { credentials: "same-origin" });
            if (!r.ok) { $("tw-terr").textContent = "Turnir topilmadi."; return; }
            detail = await r.json();
            isHost = !!detail.isHost;
            isRegistered = !!detail.isRegistered;
            render();
            connectIfAllowed();
        } catch { $("tw-terr").textContent = "Tarmoq xatosi."; }
    }

    function render() {
        if (!detail) return;
        const info = detail.info;
        info.status = statusKey(info.status);   // string → raqam (barcha taqqoslashlar uchun)

        // ── Qulflangan ko'rinish: shaxsiy turnir, ruxsatsiz foydalanuvchi ──
        // Server bracket/o'yinchilarni bermaydi; faqat parol so'raymiz.
        if (detail.isLocked) { renderLocked(info); return; }
        $("tw-locked").classList.add("d-none");

        // Sarlavha
        $("tw-tname").textContent = info.name;
        const st = $("tw-tstatus");
        st.textContent = STATUS[info.status] || info.status;
        st.className = "tw-tbadge " + (STATUS_CLASS[info.status] || "");
        const when = new Date(info.startAt).toLocaleString();
        $("tw-tmeta").innerHTML = `<i class="bi bi-people"></i> ${info.playerCount}/${info.capacity} ishtirokchi
            &nbsp;·&nbsp; <i class="bi bi-clock"></i> ${esc(when)}`;

        // Chempion banner
        const champEl = $("tw-champion");
        champEl.classList.toggle("d-none", !info.champion);
        if (info.champion) {
            champEl.innerHTML = `<i class="bi bi-trophy-fill"></i> Chempion: <b>${esc(info.champion)}</b>`;
            celebrateTrophy(info.champion);   // chempion kubokni oladi
        }

        // Host: turnirni o'chirish tugmasi (istalgan bosqichda)
        $("tw-tdelete").classList.toggle("d-none", !isHost);

        renderRegistration(info);
        renderHostBar(info);
        renderBracket(info);
        renderStandings();
    }

    // ── Qulflangan (shaxsiy) turnir ko'rinishi — parol so'raladi ──
    function renderLocked(info) {
        // Boshqa barcha bo'limlarni yashiramiz
        ["tw-champion", "tw-reg", "tw-host-bar", "tw-stage", "tw-bracket-wrap", "tw-standings", "tw-tdelete"]
            .forEach(x => $(x).classList.add("d-none"));
        $("tw-tname").textContent = info.name || "Shaxsiy turnir";
        const st = $("tw-tstatus");
        st.textContent = "Qulflangan";
        st.className = "tw-tbadge tw-st-reg";
        $("tw-tmeta").innerHTML = `<i class="bi bi-shield-lock-fill"></i> Shaxsiy turnir`;
        $("tw-locked").classList.remove("d-none");
    }

    async function submitLockedPassword() {
        const inp = $("tw-locked-input");
        const err = $("tw-locked-err");
        const pw = inp.value;
        err.textContent = "";
        if (!isAuth) { window.location.href = "/Login"; return; }
        if (!pw) { err.textContent = "Parolni kiriting."; return; }
        const okBtn = $("tw-locked-ok");
        okBtn.disabled = true;
        try {
            const r = await fetch(`/api/tournaments/${id}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ password: pw })
            });
            if (r.status === 401) { window.location.href = "/Login"; return; }
            if (r.status === 403) { err.textContent = "Parol noto'g'ri. Qaytadan urinib ko'ring."; inp.select(); okBtn.disabled = false; return; }
            if (!r.ok) { err.textContent = "Xatolik yuz berdi."; okBtn.disabled = false; return; }
            // Parol to'g'ri — endi ruxsatimiz bor: qayta yuklaymiz va hubga ulanamiz
            await loadDetail();
            connectIfAllowed();
        } catch { err.textContent = "Tarmoq xatosi."; okBtn.disabled = false; }
    }

    // ── Ro'yxat bosqichi ──
    function renderRegistration(info) {
        const reg = $("tw-reg");
        const inReg = info.status === 0;
        reg.classList.toggle("d-none", !inReg);
        if (!inReg) return;

        $("tw-reg-count").textContent = `${info.playerCount}/${info.capacity}`;
        const list = $("tw-reg-list");
        list.innerHTML = (detail.players || []).map((p, i) => {
            const me = eq(p.userId, myUserId) ? ' <small class="tw-seed-me">(siz)</small>' : '';
            const ctrl = isHost ? `<span class="tw-seed-ctrl">
                <button class="tw-seed-up" data-uid="${p.userId}" title="Yuqoriga" ${i === 0 ? "disabled" : ""}><i class="bi bi-chevron-up"></i></button>
                <button class="tw-seed-down" data-uid="${p.userId}" title="Pastga" ${i === detail.players.length - 1 ? "disabled" : ""}><i class="bi bi-chevron-down"></i></button>
                <button class="tw-seed-drop" data-uid="${p.userId}" title="Chiqarish"><i class="bi bi-x-lg"></i></button>
            </span>` : '';
            return `<li class="tw-seed-item">
                <span class="tw-seed-no">${i + 1}</span>
                <span class="tw-seed-ava" style="--c:${avatarColor(p.username)}">${initials(p.username)}</span>
                <span class="tw-seed-name">${esc(p.username)}${me}</span>
                ${ctrl}
            </li>`;
        }).join("") || `<li class="tw-tlist-empty">Hali hech kim ro'yxatdan o'tmagan.</li>`;

        $("tw-host-seedhint").classList.toggle("d-none", !(isHost && detail.players.length > 1));

        if (isHost) {
            list.querySelectorAll(".tw-seed-up").forEach(b => b.addEventListener("click", () => moveSeed(b.dataset.uid, -1)));
            list.querySelectorAll(".tw-seed-down").forEach(b => b.addEventListener("click", () => moveSeed(b.dataset.uid, 1)));
            list.querySelectorAll(".tw-seed-drop").forEach(b => b.addEventListener("click", () => dropPlayer(b.dataset.uid)));
        }

        // Tugmalar
        const canRegister = isAuth && !isRegistered && info.playerCount < info.capacity;
        $("tw-register").classList.toggle("d-none", !canRegister);
        $("tw-registered").classList.toggle("d-none", !(isAuth && isRegistered));
        $("tw-login-hint").classList.toggle("d-none", isAuth);
        const canStart = isHost && info.playerCount >= 2;
        const startBtn = $("tw-start");
        startBtn.classList.toggle("d-none", !canStart);
        if (canStart) startBtn.querySelector("span").textContent =
            (new Date(info.startAt) > new Date()) ? "Hoziroq boshlash" : "Turnirni boshlash";
    }

    function dropPlayer(uid) {
        if (!confirm("Bu o'yinchini turnirdan chiqarmoqchimisiz?")) return;
        fetch(`/api/tournaments/${id}/drop`, {
            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
            body: JSON.stringify({ userId: uid })
        }).then(r => {
            if (r.ok) { conn && conn.invoke("Touch", id).catch(() => { }); loadDetail(); }
            else r.json().then(b => $("tw-terr").textContent = b.error || "Xatolik.").catch(() => { });
        });
    }

    // ── Avatar yordamchilari ──
    function initials(name) {
        const s = String(name || "?").trim();
        const parts = s.split(/\s+/);
        const a = (parts[0] || "")[0] || "?";
        const b = parts.length > 1 ? (parts[1] || "")[0] : (parts[0] || "")[1] || "";
        return (a + b).toUpperCase();
    }
    function avatarColor(name) {
        let h = 0; const s = String(name || "");
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffff;
        return `hsl(${h % 360}, 62%, 52%)`;
    }

    function moveSeed(uid, dir) {
        const arr = detail.players.map(p => p.userId);
        const i = arr.findIndex(x => eq(x, uid));
        const j = i + dir;
        if (i < 0 || j < 0 || j >= arr.length) return;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        fetch(`/api/tournaments/${id}/seed`, {
            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
            body: JSON.stringify({ orderedUserIds: arr })
        }).then(r => {
            if (r.ok) { conn && conn.invoke("Touch", id).catch(() => { }); loadDetail(); }
            else r.json().then(b => $("tw-terr").textContent = b.error || "Xatolik.").catch(() => { });
        });
    }

    // ── Host boshqaruv paneli ──
    function renderHostBar(info) {
        const bar = $("tw-host-bar");
        const show = isHost && info.status === 1;
        bar.classList.toggle("d-none", !show);
        if (!show) return;
        const btn = $("tw-startround");
        btn.classList.toggle("d-none", roundActive);
        $("tw-host-status").textContent = roundActive
            ? "Raund davom etmoqda…" : "Keyingi raundni boshlashga tayyor";
    }

    // ── Bracket (kuchli playoff xaritasi) ──
    function renderBracket(info) {
        const wrap = $("tw-bracket-wrap");
        const matches = detail.matches || [];
        const r = window.TWBracketLayout.build(matches, (m, isFinal) => matchHtml(m, isFinal), esc);
        wrap.classList.toggle("d-none", !r.has);
        if (!r.has) {
            $("tw-bracket-left").innerHTML = "";
            $("tw-bracket-right").innerHTML = "";
            $("tw-bracket-final").innerHTML = "";
            return;
        }
        $("tw-bracket-left").innerHTML = r.left;
        $("tw-bracket-right").innerHTML = r.right;
        $("tw-bracket-final").innerHTML = r.final;

        // Zoom/pan — birinchi marta ekranga sig'diradi, keyin foydalanuvchi holatini saqlaydi
        ensureBracketZoom();
        if (bracketZoom) bracketZoom.refresh();

        // Host force-winner tugmalari (faol round, hal qilinmagan o'yinlar)
        if (isHost && info.status === 1) {
            $("tw-bracket-wrap").querySelectorAll(".tw-bk-force").forEach(b =>
                b.addEventListener("click", () => forceWinner(b.dataset.match, b.dataset.uid)));
        }
    }

    function matchHtml(m, isFinal) {
        const lv = live[m.id];
        const decided = !!m.winnerId;
        const racing = roundActive && !decided && m.player1Id && m.player2Id;
        const liveBadge = racing ? `<span class="tw-bk-live">● LIVE</span>` : "";

        const side = (pid, pname, wpm, isP1) => {
            const slotNo = isP1 ? 1 : 2;
            if (!pid) return `<div class="tw-bk-side tw-bk-empty" data-slot="${slotNo}">
                <span class="tw-bk-ava">?</span><span class="tw-bk-pname">kutilmoqda…</span></div>`;
            const won = eq(m.winnerId, pid);
            const cls = "tw-bk-side" + (decided ? (won ? " tw-bk-won" : " tw-bk-lost") : "");
            const lvSlot = lv ? (isP1 ? lv.p1 : lv.p2) : null;
            let metricVal = 0, fin = false;
            if (decided) metricVal = wpm || 0;
            else if (racing && lvSlot) { metricVal = lvSlot.wpm || 0; fin = lvSlot.fin; }
            const prog = (racing && lvSlot) ? (lvSlot.prog || 0) : (decided && won ? 100 : 0);
            const showMetric = decided || racing;
            const metric = `<span class="tw-bk-wpm${fin ? " tw-bk-fin" : ""}"${showMetric ? "" : ' style="visibility:hidden"'}>${Math.round(metricVal)}<small>wpm</small></span>`;
            const force = (isHost && racing) ? `<button class="tw-bk-force" data-match="${m.id}" data-uid="${pid}" title="G'olib deb belgilash"><i class="bi bi-hand-thumbs-up-fill"></i></button>` : "";
            const crown = (decided && won) ? `<i class="bi bi-trophy-fill tw-bk-crown"></i>` : "";
            return `<div class="${cls}" data-slot="${slotNo}">
                <span class="tw-bk-ava" style="--c:${avatarColor(pname)}">${initials(pname)}</span>
                <span class="tw-bk-pname">${esc(pname || "?")}</span>
                ${crown}${metric}${force}
                <span class="tw-bk-bar"><span style="width:${prog}%"></span></span>
            </div>`;
        };

        return `<div class="tw-bk-match${racing ? " tw-bk-racing" : ""}${decided ? " tw-bk-decided" : ""}${isFinal ? " tw-bk-match--final" : ""}" id="tw-bk-${m.id}">
            ${liveBadge}
            ${side(m.player1Id, m.player1, m.player1Wpm, true)}
            <span class="tw-bk-vs">VS</span>
            ${side(m.player2Id, m.player2, m.player2Wpm, false)}
        </div>`;
    }

    function forceWinner(matchId, winnerId) {
        if (conn) conn.invoke("ForceWinner", id, matchId, winnerId).catch(() => { });
    }

    // ── Yakuniy joylar ──
    function renderStandings() {
        const sec = $("tw-standings");
        const st = (detail.standings || []);
        const show = detail.info.status === 2 && st.length > 0;
        sec.classList.toggle("d-none", !show);
        if (!show) return;
        const maxWpm = Math.max(1, ...st.map(s => s.bestWpm || 0));
        $("tw-standings-body").innerHTML = `<div class="tw-stand-list">` + st.map(s => {
            const medal = s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : `<span class="tw-stand-rank">${s.rank}</span>`;
            const me = eq(s.userId, myUserId) ? ' <small>(siz)</small>' : '';
            const w = Math.round((s.bestWpm || 0) / maxWpm * 100);
            return `<div class="tw-stand-row${s.isChampion ? " tw-stand-champ" : ""}">
                <span class="tw-stand-medal">${medal}</span>
                <span class="tw-stand-name">${esc(s.username)}${me}<small>${esc(s.eliminatedRoundName)}</small></span>
                <span class="tw-stand-bar"><span style="width:${w}%"></span></span>
                <span class="tw-stand-wpm">${Math.round(s.bestWpm || 0)}<small>wpm</small></span>
                <span class="tw-stand-acc">${(s.bestAccuracy || 0).toFixed(0)}%</span>
            </div>`;
        }).join("") + `</div>`;
    }

    // ═══════════════ Poyga (typing engine) ═══════════════
    function applyStatVisibility() {
        if (!S) return;
        const map = { "tw-stat-wpm": S.get("showLiveWpm"), "tw-stat-acc": S.get("showLiveAcc"), "tw-stat-timer": S.get("showLiveTimer") };
        for (const k in map) { const el = $(k); if (el) el.style.display = map[k] === false ? "none" : ""; }
        const sp = $("tw-tstats"); if (sp) sp.style.display = (S.get("showStatsPanel") === false) ? "none" : "";
    }

    function renderText(text) {
        chars = Array.from(text); letterEls = []; statusArr = new Array(chars.length);
        wordsEl.textContent = "";
        wordsInner = document.createElement("div");
        wordsInner.className = "tw-words-inner";
        const frag = document.createDocumentFragment();
        for (let i = 0; i < chars.length; i++) {
            const span = document.createElement("span");
            span.className = "tw-letter"; span.textContent = chars[i];
            frag.appendChild(span); letterEls.push(span);
        }
        wordsInner.appendChild(frag);
        caretEl = document.createElement("span"); caretEl.className = "tw-caret";
        wordsInner.appendChild(caretEl);
        wordsEl.appendChild(wordsInner);
        moveCaret();
    }

    function moveCaret() {
        if (!caretEl) return;
        let left, top, w, h;
        if (pos < letterEls.length) { const el = letterEls[pos]; left = el.offsetLeft; top = el.offsetTop; w = el.offsetWidth; h = el.offsetHeight; }
        else if (letterEls.length) { const el = letterEls[letterEls.length - 1]; left = el.offsetLeft + el.offsetWidth; top = el.offsetTop; w = el.offsetWidth; h = el.offsetHeight; }
        else return;
        const style = (S && S.get("caretStyle")) || "Line";
        const cw = Math.max(w, 6); let y = top;
        const BLOCK = ["Block", "Box", "Laser", "Wedge"];
        if (style === "Underline" || style === "Bottom") { const uh = style === "Bottom" ? 4 : 2; caretEl.style.width = cw + "px"; caretEl.style.height = uh + "px"; y = top + h - uh; }
        else if (BLOCK.indexOf(style) !== -1) { caretEl.style.width = cw + "px"; caretEl.style.height = h + "px"; }
        else if (style === "Dot") { const d = Math.max(6, Math.round(h * 0.28)); caretEl.style.width = d + "px"; caretEl.style.height = d + "px"; y = top + h - d - 1; }
        else { const lw = style === "Thick" ? 4 : style === "Double" ? 7 : (style === "Pulse" || style === "Rainbow") ? 3 : 2; caretEl.style.width = lw + "px"; caretEl.style.height = h + "px"; }
        caretEl.style.transform = `translate(${left}px, ${y}px)`;
        updateCurrentWord(); updateScroll();
    }

    function updateScroll() {
        if (!wordsInner || !letterEls.length) return;
        const el = (pos < letterEls.length) ? letterEls[pos] : letterEls[letterEls.length - 1];
        if (!el) return;
        wordsInner.style.transform = `translateY(${-(el.offsetTop - letterEls[0].offsetTop)}px)`;
    }

    function updateCurrentWord() {
        if (!chars.length) return;
        for (let i = 0; i < letterEls.length; i++) if (letterEls[i]) letterEls[i].classList.remove("tw-cur-word");
        const p = Math.min(pos, chars.length - 1);
        if (chars[p] === " ") return;
        let s = p; while (s > 0 && chars[s - 1] !== " ") s--;
        let e = p; while (e < chars.length - 1 && chars[e + 1] !== " ") e++;
        for (let i = s; i <= e; i++) if (letterEls[i]) letterEls[i].classList.add("tw-cur-word");
    }

    function updateLetterView(i) {
        const el = letterEls[i]; if (!el) return;
        el.classList.remove("tw-correct", "tw-incorrect");
        if (S && S.get("blindMode")) return;
        if (statusArr[i] === "correct") el.classList.add("tw-correct");
        else if (statusArr[i] === "incorrect") el.classList.add("tw-incorrect");
    }

    function correctCount() { let c = 0; for (let i = 0; i < pos; i++) if (statusArr[i] === "correct") c++; return c; }
    const elapsed = () => startTime === null ? 0 : (performance.now() - startTime) / 1000;
    const wpmNow = () => { const e = elapsed(); return e > 0 ? (correctCount() / 5) / (e / 60) : 0; };

    function beginRace(text) {
        pos = 0; keypresses = 0; startTime = null; finished = false; lastReport = 0; keyEvents = [];
        if (liveTimer) clearInterval(liveTimer); liveTimer = null;
        if (wpmEl) wpmEl.textContent = "0"; if (accEl) accEl.textContent = "100"; if (timerEl) timerEl.textContent = "0";
        renderText(text);
        $("tw-race").classList.remove("d-none");
        $("tw-wait-round").classList.add("d-none");
        applyStatVisibility();
        wordsEl.focus();
        startTime = performance.now();
        liveTimer = setInterval(tick, 150);
    }

    function tick() {
        if (finished) return;
        const e = elapsed(), cc = correctCount();
        const wpm = e > 0 ? (cc / 5) / (e / 60) : 0;
        const acc = keypresses > 0 ? (cc / keypresses) * 100 : 100;
        if (wpmEl) wpmEl.textContent = Math.round(wpm);
        if (accEl) accEl.textContent = Math.round(acc);
        if (timerEl) timerEl.textContent = Math.floor(e);
        updateMyLane((pos / Math.max(1, chars.length)) * 100, wpm, false);
    }

    function onKey(ev) {
        if (window.TWCaps) window.TWCaps.check(ev);
        if (finished || chars.length === 0) return;
        if (ev.key === "Backspace") { ev.preventDefault(); if (pos > 0) { pos--; statusArr[pos] = undefined; updateLetterView(pos); moveCaret(); } return; }
        if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        ev.preventDefault();
        if (ev.repeat) return;
        if (pos >= chars.length) return;
        const correct = normChar(ev.key) === normChar(chars[pos]);
        keypresses++;
        keyEvents.push({ t: elapsed(), correct });
        if (window.TWSound && S) window.TWSound.play(S.get("soundOnClick"), correct);
        const blind = !!(S && S.get("blindMode"));
        if (!correct && S && S.get("stopOnError") && !blind) { statusArr[pos] = "incorrect"; updateLetterView(pos); return; }
        statusArr[pos] = correct ? "correct" : "incorrect";
        updateLetterView(pos); pos++; moveCaret(); report();
        if (pos >= chars.length) finish();
    }

    function report() {
        const progress = (pos / chars.length) * 100;
        updateMyLane(progress, wpmNow(), false);
        const now = performance.now();
        if (now - lastReport > 350) {
            lastReport = now;
            conn && conn.invoke("ReportProgress", id, progress, Math.round(wpmNow())).catch(() => { });
        }
    }

    function finish() {
        if (finished) return;
        finished = true;
        if (liveTimer) clearInterval(liveTimer);
        if (window.TWCaps) window.TWCaps.hide();
        const e = elapsed(), cc = correctCount();
        const minutes = e > 0 ? e / 60 : 1 / 60;
        const wpm = Math.round(((cc / 5) / minutes) * 100) / 100;
        const rawWpm = Math.round(((keypresses / 5) / minutes) * 100) / 100;
        const acc = keypresses > 0 ? Math.round((cc / keypresses) * 10000) / 100 : 0;
        updateMyLane(100, wpm, true);
        conn && conn.invoke("FinishMatch", id, wpm, rawWpm, acc, buildWpmSeries(e)).catch(() => { });
    }

    function buildWpmSeries(duration) {
        const secs = Math.max(1, Math.ceil(duration));
        const corN = new Array(secs).fill(0);
        for (const ev of keyEvents) { if (!ev.correct) continue; let i = Math.floor(ev.t); if (i < 0) i = 0; if (i >= secs) i = secs - 1; corN[i]++; }
        const series = [];
        for (let i = 0; i < secs; i++) { let win = 1; if (i === secs - 1) win = Math.max(0.5, duration - (secs - 1)); series.push(Math.round((corN[i] / 5) / (win / 60))); }
        return series;
    }

    // ── Lanes (mening + raqib mushuk yo'lakchasi) ──
    function laneHtml(name, colorIdx, prog) {
        const track = window.TwCheetah ? window.TwCheetah.makeHtml(colorIdx, prog)
            : `<div class="tw-bar"><div class="tw-bar-fill" style="width:${prog}%"></div></div>`;
        return `<div class="tw-lane-top"><span>${esc(name)}</span><span class="tw-lane-wpm">0 <small>wpm</small></span></div>${track}`;
    }
    function setupLanes() {
        if (!myMatch) return;
        $("tw-me-name").textContent = "Siz";
        $("tw-opp-name").textContent = myMatch.oppName || "Raqib";
        $("tw-lane-me").innerHTML = laneHtml("Siz", 0, 0);
        $("tw-lane-opp").innerHTML = laneHtml(myMatch.oppName || "Raqib", 1, 0);
    }
    function updateLane(laneEl, prog, wpm, fin) {
        if (!laneEl) return;
        const ch = laneEl.querySelector(".tw-cheetah-run");
        if (ch && window.TwCheetah) { window.TwCheetah.setPos(ch, prog); window.TwCheetah.setRunning(ch, !fin); if (!fin) window.TwCheetah.setSpeed(ch, wpm); }
        else { const f = laneEl.querySelector(".tw-bar-fill"); if (f) f.style.width = prog + "%"; }
        const w = laneEl.querySelector(".tw-lane-wpm"); if (w) w.innerHTML = Math.round(wpm || 0) + " <small>wpm</small>";
    }
    function updateMyLane(prog, wpm, fin) { updateLane($("tw-lane-me"), prog, wpm, fin); }
    function updateOppLane(prog, wpm, fin) { updateLane($("tw-lane-opp"), prog, wpm, fin); }

    // ═══════════════ SignalR ═══════════════
    // Faqat ruxsat bo'lsa (qulflanmagan) hubga ulanamiz — shaxsiy turnir live ma'lumoti himoyalangan.
    function connectIfAllowed() {
        if (conn) return;
        if (detail && detail.isLocked) return;
        setupConn();
    }

    function setupConn() {
        conn = new signalR.HubConnectionBuilder().withUrl("/hubs/tournament").withAutomaticReconnect().build();

        conn.on("Error", m => { $("tw-terr").textContent = m; });
        // Server hubda qulfni majburladi (shaxsiy, ruxsatsiz) — qayta yuklab parol so'raymiz
        conn.on("Locked", () => loadDetail());
        conn.on("StateChanged", () => loadDetail());
        conn.on("TournamentStarted", () => loadDetail());

        conn.on("RoundStarting", d => onRoundStarting(d));
        conn.on("RoundSnapshot", d => onRoundSnapshot(d));
        conn.on("LiveProgress", d => onLiveProgress(d));
        conn.on("PlayerFinished", d => onPlayerFinished(d));
        conn.on("MatchDecided", d => onMatchDecided(d));
        conn.on("RoundComplete", () => { roundActive = false; if (!eliminated && !iAmInActiveMatch()) showWaiting("Raund tugadi. Keyingisini kuting…"); if (detail) renderHostBar(detail.info); });
        conn.on("TournamentFinished", d => onFinished(d));
        conn.on("TournamentDeleted", () => {
            $("tw-terr").textContent = "Bu turnir o'chirildi. Turnirlar ro'yxatiga qaytmoqda…";
            setTimeout(() => window.location.href = "/Tournaments", 1800);
        });

        conn.onreconnected(() => conn.invoke("JoinTournament", id).catch(() => { }));
        conn.start().then(() => conn.invoke("JoinTournament", id)).catch(() => { $("tw-terr").textContent = "Ulanishda xatolik."; });
    }

    function findMyMatch(matches) {
        for (const m of matches) {
            if (eq(m.p1Id, myUserId)) return { matchId: m.matchId, oppId: m.p2Id, oppName: m.p2Name, iAmP1: true };
            if (eq(m.p2Id, myUserId)) return { matchId: m.matchId, oppId: m.p1Id, oppName: m.p1Name, iAmP1: false };
        }
        return null;
    }
    function iAmInActiveMatch() { return !!myMatch && roundActive; }

    function onRoundStarting(d) {
        roundActive = true;
        eliminated = false;
        // live progress'ni tozalash
        d.matches.forEach(m => { live[m.matchId] = { p1: { prog: 0, wpm: 0, fin: false }, p2: { prog: 0, wpm: 0, fin: false } }; });

        myMatch = findMyMatch(d.matches);
        $("tw-stage").classList.remove("d-none");

        if (myMatch && isAuth) {
            setupLanes();
            $("tw-wait-round").classList.add("d-none");
            $("tw-advance-toast").classList.add("d-none");
            if (d.countdown > 0) startCountdown(d.text, d.countdown);
            else { $("tw-countdown").classList.add("d-none"); beginRace(d.text); }
        } else {
            // Tomoshabin / tushib qolgan — faqat kuzatadi
            $("tw-race").classList.add("d-none");
            $("tw-countdown").classList.add("d-none");
            showWaiting(eliminated ? "Tomoshabin sifatida kuzatyapsiz." : "Raund boshlandi — bracketdan kuzating.");
        }
        if (detail) { renderHostBar(detail.info); }
    }

    function onRoundSnapshot(d) {
        roundActive = true;
        d.matches.forEach(m => {
            live[m.matchId] = {
                p1: { prog: m.p1.progress, wpm: m.p1.wpm, fin: m.p1.finished },
                p2: { prog: m.p2.progress, wpm: m.p2.wpm, fin: m.p2.finished }
            };
        });
        if (detail) renderBracket(detail.info);
    }

    function startCountdown(text, seconds) {
        const cd = $("tw-countdown");
        $("tw-race").classList.add("d-none");
        cd.classList.remove("d-none");
        let n = seconds; cd.textContent = n;
        const t = setInterval(() => {
            n--;
            if (n > 0) cd.textContent = n;
            else { clearInterval(t); cd.textContent = "BOSHLANDI!"; setTimeout(() => { cd.classList.add("d-none"); beginRace(text); }, 400); }
        }, 1000);
    }

    function onLiveProgress(d) {
        const lv = live[d.matchId]; if (!lv) return;
        const m = (detail.matches || []).find(x => eq(x.id, d.matchId));
        const isP1 = m ? eq(m.player1Id, d.userId) : false;
        const slot = isP1 ? lv.p1 : lv.p2;
        slot.prog = d.progress; slot.wpm = d.wpm;
        // mening raqibim bo'lsa — opp lane
        if (myMatch && eq(d.matchId, myMatch.matchId) && eq(d.userId, myMatch.oppId)) updateOppLane(d.progress, d.wpm, false);
        updateBracketMatch(d.matchId);
    }

    function onPlayerFinished(d) {
        const lv = live[d.matchId]; if (!lv) return;
        const m = (detail.matches || []).find(x => eq(x.id, d.matchId));
        const isP1 = m ? eq(m.player1Id, d.userId) : false;
        const slot = isP1 ? lv.p1 : lv.p2;
        slot.fin = true; slot.prog = 100; slot.wpm = d.wpm;
        if (myMatch && eq(d.matchId, myMatch.matchId) && eq(d.userId, myMatch.oppId)) updateOppLane(100, d.wpm, true);
        updateBracketMatch(d.matchId);
    }

    // Live progress — faqat o'zgargan o'yinni joyida yangilaymiz (to'liq qayta chizmaymiz, silliq bo'lsin)
    function updateBracketMatch(matchId) {
        const lv = live[matchId]; if (!lv) return;
        const el = $("tw-bk-" + matchId);
        if (!el) { if (detail) renderBracket(detail.info); return; }
        [["1", lv.p1], ["2", lv.p2]].forEach(([slot, s]) => {
            if (!s) return;
            const side = el.querySelector(`.tw-bk-side[data-slot="${slot}"]`);
            if (!side) return;
            const bar = side.querySelector(".tw-bk-bar > span");
            if (bar) bar.style.width = (s.prog || 0) + "%";
            const wpm = side.querySelector(".tw-bk-wpm");
            if (wpm) {
                wpm.style.visibility = "";
                wpm.classList.toggle("tw-bk-fin", !!s.fin);
                wpm.firstChild ? wpm.firstChild.textContent = Math.round(s.wpm || 0) : wpm.textContent = Math.round(s.wpm || 0);
            }
        });
    }

    function onMatchDecided(d) {
        // bracket loadDetail (StateChanged) bilan yangilanadi; bu yerda mening o'yinim natijasi
        if (myMatch && eq(d.matchId, myMatch.matchId)) {
            const iWon = eq(d.winnerId, myUserId);
            if (iWon) showAdvance(d);
            else showEliminated(d);
            myMatch = null;
        }
    }

    function showAdvance(d) {
        $("tw-race").classList.add("d-none");
        $("tw-countdown").classList.add("d-none");
        const toast = $("tw-advance-toast");
        $("tw-advance-sub").textContent = "Keyingi raundni kuting.";
        toast.classList.remove("d-none");
        setTimeout(() => toast.classList.add("d-none"), 5000);
        showWaiting("Ajoyib! Keyingi raundga o'tdingiz. Host raundni boshlashini kuting…");
    }

    function showWaiting(msg) {
        $("tw-stage").classList.remove("d-none");
        $("tw-race").classList.add("d-none");
        $("tw-countdown").classList.add("d-none");
        const w = $("tw-wait-round");
        w.classList.remove("d-none");
        $("tw-wait-msg").textContent = msg;
    }

    function showEliminated(d) {
        eliminated = true;
        finished = true;
        if (liveTimer) clearInterval(liveTimer);
        $("tw-race").classList.add("d-none");
        $("tw-countdown").classList.add("d-none");
        // statistikani topish
        const mine = eq(d.p1.userId, myUserId) ? d.p1 : d.p2;
        const opp = eq(d.p1.userId, myUserId) ? d.p2 : d.p1;
        $("tw-elim-text").textContent = `${esc(d.winnerName || "Raqibingiz")} bu raundda g'olib bo'ldi.`;
        $("tw-elim-stats").innerHTML = `
            <div class="tw-elim-stat"><span>${Math.round(mine.wpm || 0)}</span><label>Sizning WPM</label></div>
            <div class="tw-elim-stat"><span>${(mine.accuracy || 0).toFixed(0)}%</span><label>Aniqlik</label></div>
            <div class="tw-elim-stat tw-elim-opp"><span>${Math.round(opp.wpm || 0)}</span><label>Raqib WPM</label></div>`;
        $("tw-elim-overlay").classList.remove("d-none");
    }

    function onFinished(d) {
        roundActive = false;
        $("tw-stage").classList.add("d-none");
        $("tw-host-bar").classList.add("d-none");
        if (d && d.champion) celebrateTrophy(d.champion);   // chempion kubokni oladi
        loadDetail(); // standings + champion
    }

    // ── Hodisalar ──
    $("tw-register").addEventListener("click", async () => {
        if (!isAuth) { window.location.href = "/Login"; return; }
        const r = await fetch(`/api/tournaments/${id}/register`, { method: "POST", credentials: "same-origin" });
        if (r.status === 401) { window.location.href = "/Login"; return; }
        if (r.ok) { conn && conn.invoke("Touch", id).catch(() => { }); loadDetail(); }
        else { const b = await r.json().catch(() => ({})); $("tw-terr").textContent = b.error || "Xatolik."; }
    });
    $("tw-start").addEventListener("click", () => conn && conn.invoke("StartTournament", id).catch(() => { }));
    $("tw-startround").addEventListener("click", () => { $("tw-terr").textContent = ""; conn && conn.invoke("StartRound", id).catch(() => { }); });
    $("tw-tdelete").addEventListener("click", async () => {
        if (!confirm("Turnirni butunlay o'chirmoqchimisiz? Bu amalni bekor qilib bo'lmaydi.")) return;
        try {
            const r = await fetch("/api/tournaments/" + id, { method: "DELETE", credentials: "same-origin" });
            if (r.ok) { window.location.href = "/Tournaments"; return; }
            if (r.status === 401) { window.location.href = "/Login"; return; }
            const b = await r.json().catch(() => ({}));
            $("tw-terr").textContent = b.error || "O'chirishda xatolik.";
        } catch { $("tw-terr").textContent = "Tarmoq xatosi."; }
    });
    $("tw-tshare").addEventListener("click", () => {
        const url = location.origin + "/Tournament?id=" + id;
        navigator.clipboard?.writeText(url);
        const b = $("tw-tshare"); const old = b.innerHTML;
        b.innerHTML = '<i class="bi bi-check2"></i><span>Nusxalandi!</span>';
        setTimeout(() => b.innerHTML = old, 1800);
    });
    $("tw-elim-watch").addEventListener("click", () => $("tw-elim-overlay").classList.add("d-none"));

    wordsEl.addEventListener("click", () => wordsEl.focus());
    wordsEl.addEventListener("keydown", onKey);
    if (S && S.onChange) S.onChange(() => { applyStatVisibility(); moveCaret(); });
    window.addEventListener("resize", () => moveCaret());

    // Qulflangan turnir parol darvozasi
    $("tw-locked-ok").addEventListener("click", submitLockedPassword);
    $("tw-locked-input").addEventListener("keydown", e => { if (e.key === "Enter") submitLockedPassword(); });

    loadDetail();   // ruxsat bo'lsa connectIfAllowed() ichkarida chaqiriladi
})();

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
        } catch { $("tw-terr").textContent = "Tarmoq xatosi."; }
    }

    function render() {
        if (!detail) return;
        const info = detail.info;

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
        if (info.champion) champEl.innerHTML = `<i class="bi bi-trophy-fill"></i> Chempion: <b>${esc(info.champion)}</b>`;

        renderRegistration(info);
        renderHostBar(info);
        renderBracket(info);
        renderStandings();
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
                <button class="tw-seed-up" data-uid="${p.userId}" ${i === 0 ? "disabled" : ""}><i class="bi bi-chevron-up"></i></button>
                <button class="tw-seed-down" data-uid="${p.userId}" ${i === detail.players.length - 1 ? "disabled" : ""}><i class="bi bi-chevron-down"></i></button>
            </span>` : '';
            return `<li class="tw-seed-item">
                <span class="tw-seed-no">${i + 1}</span>
                <span class="tw-seed-name">${esc(p.username)}${me}</span>
                ${ctrl}
            </li>`;
        }).join("") || `<li class="tw-tlist-empty">Hali hech kim ro'yxatdan o'tmagan.</li>`;

        $("tw-host-seedhint").classList.toggle("d-none", !(isHost && detail.players.length > 1));

        if (isHost) {
            list.querySelectorAll(".tw-seed-up").forEach(b => b.addEventListener("click", () => moveSeed(b.dataset.uid, -1)));
            list.querySelectorAll(".tw-seed-down").forEach(b => b.addEventListener("click", () => moveSeed(b.dataset.uid, 1)));
        }

        // Tugmalar
        const canRegister = isAuth && !isRegistered && info.playerCount < info.capacity;
        $("tw-register").classList.toggle("d-none", !canRegister);
        $("tw-registered").classList.toggle("d-none", !(isAuth && isRegistered));
        $("tw-login-hint").classList.toggle("d-none", isAuth);
        $("tw-start").classList.toggle("d-none", !(isHost && info.playerCount >= 2));
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

    // ── Bracket ──
    function renderBracket(info) {
        const wrap = $("tw-bracket-wrap");
        const matches = detail.matches || [];
        const has = matches.length > 0;
        wrap.classList.toggle("d-none", !has);
        if (!has) { $("tw-bracket").innerHTML = ""; return; }

        const rounds = {};
        matches.forEach(m => { (rounds[m.round] = rounds[m.round] || []).push(m); });

        $("tw-bracket").innerHTML = Object.keys(rounds).sort((a, b) => a - b).map(rk => {
            const ms = rounds[rk].sort((a, b) => a.slot - b.slot);
            return `<div class="tw-tround">
                <div class="tw-tround-name">${esc(ms[0].roundName)}</div>
                ${ms.map(matchHtml).join("")}
            </div>`;
        }).join("");

        // Host force-winner tugmalari (faol round, hal qilinmagan o'yinlar)
        if (isHost && info.status === 1) {
            $("tw-bracket").querySelectorAll(".tw-force").forEach(b =>
                b.addEventListener("click", () => forceWinner(b.dataset.match, b.dataset.uid)));
        }
    }

    function matchHtml(m) {
        const lv = live[m.id];
        const decided = !!m.winnerId;
        const racing = roundActive && !decided && m.player1Id && m.player2Id;

        const side = (pid, pname, wpm, isP1) => {
            if (!pid) return `<div class="tw-tslot tw-tempty">—</div>`;
            const won = eq(m.winnerId, pid);
            const cls = "tw-tslot" + (decided ? (won ? " tw-twon" : " tw-tlost") : "");
            let metric = "";
            if (decided) metric = `<span class="tw-tslot-wpm">${Math.round(wpm || 0)}</span>`;
            else if (racing && lv) {
                const sl = isP1 ? lv.p1 : lv.p2;
                if (sl) metric = `<span class="tw-tslot-wpm${sl.fin ? " tw-tfin" : ""}">${Math.round(sl.wpm || 0)}</span>`;
            }
            const prog = (racing && lv) ? ((isP1 ? lv.p1 : lv.p2) || {}).prog || 0 : (decided ? 100 : 0);
            const bar = racing ? `<span class="tw-tslot-bar"><span style="width:${prog}%"></span></span>` : "";
            const force = (isHost && racing) ? `<button class="tw-force" data-match="${m.id}" data-uid="${pid}" title="G'olib deb belgilash"><i class="bi bi-hand-thumbs-up"></i></button>` : "";
            return `<div class="${cls}">
                <span class="tw-tslot-name">${esc(pname || "?")}</span>${metric}${force}${bar}
            </div>`;
        };
        const liveBadge = racing ? `<span class="tw-tmatch-live">LIVE</span>` : "";
        return `<div class="tw-tmatch${racing ? " tw-tmatch-racing" : ""}">
            ${liveBadge}
            ${side(m.player1Id, m.player1, m.player1Wpm, true)}
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
    function setupConn() {
        conn = new signalR.HubConnectionBuilder().withUrl("/hubs/tournament").withAutomaticReconnect().build();

        conn.on("Error", m => { $("tw-terr").textContent = m; });
        conn.on("StateChanged", () => loadDetail());
        conn.on("TournamentStarted", () => loadDetail());

        conn.on("RoundStarting", d => onRoundStarting(d));
        conn.on("RoundSnapshot", d => onRoundSnapshot(d));
        conn.on("LiveProgress", d => onLiveProgress(d));
        conn.on("PlayerFinished", d => onPlayerFinished(d));
        conn.on("MatchDecided", d => onMatchDecided(d));
        conn.on("RoundComplete", () => { roundActive = false; if (!eliminated && !iAmInActiveMatch()) showWaiting("Raund tugadi. Keyingisini kuting…"); if (detail) renderHostBar(detail.info); });
        conn.on("TournamentFinished", d => onFinished(d));

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

    function updateBracketMatch(matchId) { if (detail) renderBracket(detail.info); }

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

    loadDetail();
    setupConn();
})();

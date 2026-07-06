// Turnir simulyatsiyasi — 64 soxta o'yinchi bilan bracket jarayonini boshqarish/kuzatish.
// Barcha o'yinlar server tomonida simulyatsiya qilinadi (TournamentDemoController).
(function () {
    "use strict";
    const $ = (id) => document.getElementById(id);
    const root = $("tw-demo");
    if (!root) return;

    let tid = null;        // joriy turnir id
    let busy = false;      // bir vaqtda bitta amal
    let finished = false;
    let live = {};         // matchId -> { p1:{prog,curWpm,fin}, p2:{...}, racing, decided, winnerId } (jonli animatsiya)

    // Bracket zoom/pan (Google Maps uslubi) — bir marta ulanadi, render orasida saqlanadi
    let bracketZoom = null;
    function ensureBracketZoom() {
        if (bracketZoom || !window.TWBracketZoom) return;
        const vp = $("tw-d-bracket-viewport"), cv = $("tw-d-bracket-canvas");
        if (!vp || !cv) return;
        bracketZoom = window.TWBracketZoom.attach(vp, cv, { tools: $("tw-d-bracket-tools") });
    }

    const elCreate = $("tw-d-create"), elStart = $("tw-d-start"),
          elRound = $("tw-d-round"), elAuto = $("tw-d-auto"), elReset = $("tw-d-reset"),
          elCount = $("tw-d-count");

    // ── O'yinchilar soni (1–64) ──
    const MIN_PLAYERS = 1, MAX_PLAYERS = 64;
    function playerCount() {
        let n = parseInt(elCount && elCount.value, 10);
        if (!Number.isFinite(n)) n = 8;
        return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, n));
    }
    // Tugma yozuvini kiritilgan songa moslab turadi
    function syncCreateLabel() {
        const span = elCreate.querySelector("span");
        if (span) span.textContent = `${playerCount()} o'yinchili turnir yaratish`;
    }
    if (elCount) {
        elCount.addEventListener("input", syncCreateLabel);
        // Maydondan chiqqanda chegaraga moslab to'g'irlaymiz (bo'sh/chegaradan tashqari)
        elCount.addEventListener("change", () => { elCount.value = playerCount(); syncCreateLabel(); });
        syncCreateLabel();
    }

    // ── Yordamchilar ──
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    function initials(name) {
        const t = String(name || "?").trim();
        return (t[0] || "?").toUpperCase();
    }
    function avatarColor(name) {
        let h = 0; const s = String(name || "");
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
        return `hsl(${h} 60% 45%)`;
    }
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    function status(msg) { $("tw-d-status").textContent = msg; }
    function showErr(msg) {
        const e = $("tw-d-err");
        e.textContent = msg || "";
        e.style.display = msg ? "block" : "none";
    }
    function setBusy(b) {
        busy = b;
        elCreate.disabled = b;
        elStart.disabled = b || !tid || started();
        elRound.disabled = b || !tid || !started() || finished;
        elAuto.disabled = b || !tid || !started() || finished;
        elReset.disabled = b || !tid;
        // O'yinchilar sonini faqat turnir yo'q paytida o'zgartirsa bo'ladi
        if (elCount) elCount.disabled = b || !!tid;
    }
    // turnir boshlanganmi (bracketda o'yinlar bormi) — detail keshidan
    let lastDetail = null;
    function started() { return lastDetail && lastDetail.info && lastDetail.info.status !== "Registration"; }

    // ── Jurnal ──
    function log(html, kind) {
        const box = $("tw-d-log");
        const empty = box.querySelector(".tw-demo-log-empty");
        if (empty) empty.remove();
        const div = document.createElement("div");
        div.className = "tw-demo-log-item" + (kind ? " tw-demo-log-" + kind : "");
        const time = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        div.innerHTML = `<span class="tw-demo-log-time">${time}</span><span class="tw-demo-log-text">${html}</span>`;
        box.prepend(div);
    }

    // ── API ──
    async function api(method, url, body) {
        const opt = { method, headers: {} };
        if (body !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
        const res = await fetch(url, opt);
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
        if (!res.ok) throw new Error((data && data.error) || `Xatolik (${res.status})`);
        return data;
    }
    const getDetail = () => api("GET", `/api/tournaments/${tid}`);

    // ── Render: o'yinchilar (ro'yxat bosqichi) — host kabi tartibni o'zgartirish mumkin ──
    function renderSeeds(detail) {
        const box = $("tw-d-seeds");
        if (!detail.players || !detail.players.length) { box.innerHTML = ""; return; }
        // Tartibni faqat turnir boshlanmaganda (Registration) o'zgartirsa bo'ladi
        const canReorder = !started() && detail.players.length > 1;
        const n = detail.players.length;
        const hint = canReorder
            ? `<span class="tw-demo-h3-hint">(joylashuvni strelkalar bilan o'zgartiring)</span>` : "";
        box.innerHTML = `<h3 class="tw-demo-h3"><i class="bi bi-person-badge"></i> Ishtirokchilar (${n}) ${hint}</h3>
            <div class="tw-demo-seedgrid">` +
            detail.players.map((p, i) => {
                const ctrl = canReorder ? `<span class="tw-demo-seed-ctrl">
                    <button class="tw-demo-seed-up" data-uid="${p.userId}" title="Yuqoriga" ${i === 0 ? "disabled" : ""}><i class="bi bi-chevron-up"></i></button>
                    <button class="tw-demo-seed-down" data-uid="${p.userId}" title="Pastga" ${i === n - 1 ? "disabled" : ""}><i class="bi bi-chevron-down"></i></button>
                </span>` : "";
                return `<div class="tw-demo-seed">
                    <span class="tw-demo-seedno">#${p.seed}</span>
                    <span class="tw-bk-ava" style="--c:${avatarColor(p.username)}">${initials(p.username)}</span>
                    <span class="tw-demo-seedname">${esc(p.username)}</span>
                    ${ctrl}
                </div>`;
            }).join("") + `</div>`;

        if (canReorder) {
            box.querySelectorAll(".tw-demo-seed-up").forEach(b => b.addEventListener("click", () => moveSeed(b.dataset.uid, -1)));
            box.querySelectorAll(".tw-demo-seed-down").forEach(b => b.addEventListener("click", () => moveSeed(b.dataset.uid, 1)));
        }
    }

    // O'yinchini ro'yxatda bir pog'ona yuqori/pastga suradi (host reseed kabi)
    async function moveSeed(uid, dir) {
        if (busy || !tid || !lastDetail) return;
        const arr = lastDetail.players.map(p => p.userId);
        const i = arr.indexOf(uid);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= arr.length) return;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        setBusy(true); showErr("");
        try {
            await api("POST", `/api/tournamentdemo/${tid}/seed`, { orderedUserIds: arr });
            await refresh();
        } catch (e) { showErr(e.message); }
        finally { setBusy(false); }
    }

    // ── Render: bracket (jonli "yozish" animatsiyasini ham qo'llab-quvvatlaydi) ──
    function matchSideHtml(m, slot, ls) {
        const pid = slot === 1 ? m.player1Id : m.player2Id;
        const pname = slot === 1 ? m.player1 : m.player2;
        const finalWpm = slot === 1 ? m.player1Wpm : m.player2Wpm;
        if (!pid) return `<div class="tw-bk-side tw-bk-empty" data-slot="${slot}">
            <span class="tw-bk-ava">?</span><span class="tw-bk-pname">kutilmoqda…</span>
            <span class="tw-bk-bar"><span style="width:0"></span></span></div>`;

        const s = ls ? (slot === 1 ? ls.p1 : ls.p2) : null;
        const racing = !!(ls && ls.racing);
        const decided = !!m.winnerId || !!(ls && ls.decided);
        const winnerId = (ls && ls.winnerId) || m.winnerId;
        const won = decided && winnerId === pid;
        const cls = "tw-bk-side" + (decided ? (won ? " tw-bk-won" : " tw-bk-lost") : "");
        const crown = won ? `<i class="bi bi-trophy-fill tw-bk-crown"></i>` : "";

        // Metr: poyga vaqtida jonli (curWpm), tugagach yakuniy WPM, aks holda yashirin
        let metricVal = 0, fin = false, prog = 0, showMetric = decided || racing;
        if (racing && s) { metricVal = s.curWpm || 0; fin = s.fin; prog = s.prog || 0; }
        else if (decided) { metricVal = Math.round(finalWpm || 0); prog = won ? 100 : (s ? s.prog : 0); }
        const metric = `<span class="tw-bk-wpm${fin ? " tw-bk-fin" : ""}"${showMetric ? "" : ' style="visibility:hidden"'}>${Math.round(metricVal)}<small>wpm</small></span>`;

        return `<div class="${cls}" data-slot="${slot}">
            <span class="tw-bk-ava" style="--c:${avatarColor(pname)}">${initials(pname)}</span>
            <span class="tw-bk-pname">${esc(pname || "?")}</span>
            ${crown}${metric}
            <span class="tw-bk-bar"><span style="width:${prog}%"></span></span>
        </div>`;
    }
    function matchHtml(m, isFinal) {
        const ls = live[m.id];
        const racing = !!(ls && ls.racing);
        const decided = !!m.winnerId || !!(ls && ls.decided);
        const liveBadge = racing ? `<span class="tw-bk-live">● LIVE</span>` : "";
        return `<div class="tw-bk-match${racing ? " tw-bk-racing" : ""}${decided ? " tw-bk-decided" : ""}${isFinal ? " tw-bk-match--final" : ""}" id="tw-dbk-${m.id}">
            ${liveBadge}
            ${matchSideHtml(m, 1, ls)}
            <span class="tw-bk-vs">VS</span>
            ${matchSideHtml(m, 2, ls)}
        </div>`;
    }

    // Jonli animatsiya: bitta o'yin kartasini to'liq qayta chizmasdan joyida yangilaydi
    function updateLiveCard(matchId) {
        const ls = live[matchId]; if (!ls) return;
        const el = $("tw-dbk-" + matchId); if (!el) return;
        [["1", ls.p1], ["2", ls.p2]].forEach(([slot, s]) => {
            if (!s) return;
            const side = el.querySelector(`.tw-bk-side[data-slot="${slot}"]`);
            if (!side) return;
            const bar = side.querySelector(".tw-bk-bar > span");
            if (bar) bar.style.width = (s.prog || 0) + "%";
            const wpm = side.querySelector(".tw-bk-wpm");
            if (wpm) {
                wpm.style.visibility = "";
                wpm.classList.toggle("tw-bk-fin", !!s.fin);
                if (wpm.firstChild) wpm.firstChild.textContent = Math.round(s.curWpm || 0);
                else wpm.textContent = Math.round(s.curWpm || 0);
            }
        });
    }

    // Bir raundni "jonli poyga" qilib animatsiya qiladi: progress barlar 0→100,
    // tezroq WPM'li o'yinchi oldin yetib boradi; WPM raqami ham o'sib boradi.
    function animateRound(matches) {
        return new Promise(resolve => {
            const D = 2600;          // poyga davomiyligi (ms)
            live = {};               // yangi raund — eski jonli holatni tozalaymiz
            matches.forEach(m => {
                live[m.matchId] = {
                    p1: { wpm: m.p1Wpm, curWpm: 0, prog: 0, fin: false },
                    p2: { wpm: m.p2Wpm, curWpm: 0, prog: 0, fin: false },
                    racing: true, decided: false, winnerId: m.winnerId
                };
            });
            // LIVE belgilari + barlarni bir marta chizamiz (keyin joyida yangilanadi)
            if (lastDetail) renderBracket(lastDetail);

            const start = performance.now();
            function frame(now) {
                const t = Math.min(D, now - start);
                const tf = t / D;
                matches.forEach(m => {
                    const ls = live[m.matchId];
                    const wMax = Math.max(ls.p1.wpm, ls.p2.wpm, 1);
                    ["p1", "p2"].forEach(k => {
                        const s = ls[k];
                        s.prog = Math.min(100, tf * (s.wpm / wMax) * 100);
                        s.curWpm = Math.round(s.wpm * Math.min(1, 0.35 + 0.65 * tf));
                        if (s.prog >= 100) s.fin = true;
                    });
                    updateLiveCard(m.matchId);
                });
                if (t < D) requestAnimationFrame(frame);
                else {
                    // Poyga tugadi — g'oliblarni belgilaymiz (toj), so'ng keyingi raundga
                    matches.forEach(m => {
                        const ls = live[m.matchId];
                        ls.racing = false; ls.decided = true;
                    });
                    if (lastDetail) renderBracket(lastDetail);
                    setTimeout(resolve, 650);
                }
            }
            requestAnimationFrame(frame);
        });
    }
    function renderBracket(detail) {
        const matches = detail.matches || [];
        const r = window.TWBracketLayout.build(matches, (m, isFinal) => matchHtml(m, isFinal), esc);
        if (!r.has) {
            $("tw-d-bracket-left").innerHTML = "";
            $("tw-d-bracket-right").innerHTML = "";
            $("tw-d-bracket-final").innerHTML = "";
            $("tw-d-bracket-wrap").classList.add("d-none");
            return;
        }
        $("tw-d-bracket-wrap").classList.remove("d-none");
        $("tw-d-bracket-left").innerHTML = r.left;
        $("tw-d-bracket-right").innerHTML = r.right;
        $("tw-d-bracket-final").innerHTML = r.final;
        // Bir tomonlama bracket (3 kishilik turnir kabi): o'ng yarm umuman ko'rinmaydi
        $("tw-d-bracket-right").classList.toggle("d-none", !r.twoSided);
        const canvas = $("tw-d-bracket-canvas");
        if (canvas) canvas.classList.toggle("tw-bk2--single", !r.twoSided);

        // Zoom/pan — birinchi marta ekranga sig'diradi, keyin foydalanuvchi holatini saqlaydi
        ensureBracketZoom();
        if (bracketZoom) bracketZoom.refresh();
    }

    // ── Render: yakuniy joylar ──
    function renderStandings(detail) {
        const box = $("tw-d-standings");
        const st = detail.standings || [];
        if (!st.length) { box.classList.add("d-none"); return; }
        box.classList.remove("d-none");
        box.innerHTML = `<h3 class="tw-demo-h3"><i class="bi bi-bar-chart-fill"></i> Yakuniy natijalar</h3>
            <div class="tw-demo-stand-list">` +
            st.slice(0, 8).map(s => `
                <div class="tw-demo-stand${s.isChampion ? " tw-demo-stand--champ" : ""}">
                    <span class="tw-demo-stand-rank">${s.isChampion ? "🏆" : s.rank}</span>
                    <span class="tw-bk-ava" style="--c:${avatarColor(s.username)}">${initials(s.username)}</span>
                    <span class="tw-demo-stand-name">${esc(s.username)}</span>
                    <span class="tw-demo-stand-stage">${esc(s.eliminatedRoundName)}</span>
                    <span class="tw-demo-stand-wpm">${Math.round(s.bestWpm)} wpm</span>
                </div>`).join("") + `</div>`;
    }

    function showChampion(name) {
        const el = $("tw-d-champion");
        el.classList.remove("d-none");
        el.innerHTML = `<i class="bi bi-trophy-fill"></i>
            <div><span class="tw-champion-label">CHEMPION</span>
            <span class="tw-champion-name">${esc(name)}</span></div>`;
        // Markazdagi 3D kubokni chempionga "topshirish" (portlash + konfetti + ism)
        if (window.TWTrophy && window.TWTrophy.celebrate) window.TWTrophy.celebrate(name);
        else window.dispatchEvent(new CustomEvent("tw-trophy-champion", { detail: { name } }));
    }

    // ── Holatni qayta yuklash ──
    async function refresh() {
        const detail = await getDetail();
        lastDetail = detail;
        renderSeeds(detail);
        renderBracket(detail);
        renderStandings(detail);
        return detail;
    }

    // ── Amallar ──
    async function doCreate() {
        if (busy) return;
        setBusy(true); showErr("");
        try {
            // mavjud demo bo'lsa — avval o'chiramiz
            if (tid) { try { await api("DELETE", `/api/tournamentdemo/${tid}`); } catch { } }
            tid = null; finished = false; lastDetail = null; live = {};
            $("tw-d-champion").classList.add("d-none");
            $("tw-d-log").innerHTML = "";
            $("tw-d-standings").classList.add("d-none");

            const count = playerCount();
            const r = await api("POST", "/api/tournamentdemo", { playerCount: count });
            tid = r.id;
            const d = await refresh();
            log(`<b>Turnir yaratildi</b> — ${d.players.length} ta soxta o'yinchi ro'yxatga olindi.`, "ok");
            status(d.players.length < 2
                ? "Bitta o'yinchi bilan turnir boshlanmaydi — kamida 2 ta kerak."
                : "Turnir yaratildi. Endi «Turnirni boshlash»ni bosing — bracket quriladi.");
        } catch (e) { showErr(e.message); }
        finally { setBusy(false); }
    }

    async function doStart() {
        if (busy || !tid) return;
        setBusy(true); showErr("");
        try {
            await api("POST", `/api/tournamentdemo/${tid}/start`);
            const d = await refresh();
            const r1 = (d.matches || []).filter(m => m.round === 1).length;
            log(`<b>Turnir boshlandi</b> — bracket qurildi: 1-raundda ${r1} ta o'yin.`, "ok");
            status("Bracket tayyor. Har bir raundni «Keyingi raundni o'ynash» bilan o'ynang yoki «Avtomatik».");
        } catch (e) { showErr(e.message); }
        finally { setBusy(false); }
    }

    async function playRound() {
        const res = await api("POST", `/api/tournamentdemo/${tid}/round`);
        // O'ynalgan o'yinlar bo'lsa — JONLI poyga animatsiyasi, so'ng jurnalga yozamiz
        if (res.matches && res.matches.length) {
            log(`<b>${esc(res.roundName)}</b> boshlandi — ${res.matches.length} ta o'yin jonli o'ynalmoqda…`, "round");
            status(`${res.roundName}: raqiblar yozmoqda…`);
            await animateRound(res.matches);
            res.matches.forEach(m => {
                log(`${esc(m.player1)} <span class="tw-demo-sc">${Math.round(m.p1Wpm)}</span> — ` +
                    `<span class="tw-demo-sc">${Math.round(m.p2Wpm)}</span> ${esc(m.player2)} ` +
                    `→ <b class="tw-demo-hl">${esc(m.winner)}</b>`, "match");
            });
        }
        live = {};                 // animatsiya tugadi — keyingi render toza holatdan
        const d = await refresh();
        if (res.finished) {
            finished = true;
            const champ = res.championName || (d.info && d.info.champion) || "—";
            log(`<b>Turnir tugadi!</b> Chempion: <b class="tw-demo-hl">${esc(champ)}</b> 🏆`, "champ");
            status("Turnir yakunlandi. Yakuniy natijalar pastda.");
            showChampion(champ);
            return true;
        }
        return false;
    }

    async function doRound() {
        if (busy || !tid) return;
        setBusy(true); showErr("");
        try { await playRound(); }
        catch (e) { showErr(e.message); }
        finally { setBusy(false); }
    }

    async function doAuto() {
        if (busy || !tid) return;
        setBusy(true); showErr("");
        try {
            status("Avtomatik o'ynalmoqda…");
            for (let guard = 0; guard < 10 && !finished; guard++) {
                const done = await playRound();
                if (done) break;
                await sleep(900);
            }
        } catch (e) { showErr(e.message); }
        finally { setBusy(false); }
    }

    async function doReset() {
        if (busy || !tid) return;
        setBusy(true); showErr("");
        try {
            await api("DELETE", `/api/tournamentdemo/${tid}`);
            log("Turnir o'chirildi.", "");
            tid = null; finished = false; lastDetail = null; live = {};
            $("tw-d-bracket-left").innerHTML = "";
            $("tw-d-bracket-right").innerHTML = "";
            $("tw-d-bracket-final").innerHTML = "";
            $("tw-d-bracket-wrap").classList.add("d-none");
            $("tw-d-seeds").innerHTML = "";
            $("tw-d-standings").classList.add("d-none");
            $("tw-d-champion").classList.add("d-none");
            if (window.TWTrophy && window.TWTrophy.reset) window.TWTrophy.reset();
            status("O'chirildi. Yangi turnir yaratish uchun tugmani bosing.");
        } catch (e) { showErr(e.message); }
        finally { setBusy(false); }
    }

    elCreate.addEventListener("click", doCreate);
    elStart.addEventListener("click", doStart);
    elRound.addEventListener("click", doRound);
    elAuto.addEventListener("click", doAuto);
    elReset.addEventListener("click", doReset);
})();

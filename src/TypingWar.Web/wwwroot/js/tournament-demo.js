// Turnir simulyatsiyasi — 64 soxta o'yinchi bilan bracket jarayonini boshqarish/kuzatish.
// Barcha o'yinlar server tomonida simulyatsiya qilinadi (TournamentDemoController).
(function () {
    "use strict";
    const $ = (id) => document.getElementById(id);
    const root = $("tw-demo");
    if (!root) return;

    const DEMO_PLAYERS = 64;
    let tid = null;        // joriy turnir id
    let busy = false;      // bir vaqtda bitta amal
    let finished = false;

    // Bracket zoom/pan (Google Maps uslubi) — bir marta ulanadi, render orasida saqlanadi
    let bracketZoom = null;
    function ensureBracketZoom() {
        if (bracketZoom || !window.TWBracketZoom) return;
        const vp = $("tw-d-bracket-viewport"), cv = $("tw-d-bracket-canvas");
        if (!vp || !cv) return;
        bracketZoom = window.TWBracketZoom.attach(vp, cv, { tools: $("tw-d-bracket-tools") });
    }

    const elCreate = $("tw-d-create"), elStart = $("tw-d-start"),
          elRound = $("tw-d-round"), elAuto = $("tw-d-auto"), elReset = $("tw-d-reset");

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

    // ── Render: o'yinchilar (ro'yxat bosqichi) ──
    function renderSeeds(detail) {
        const box = $("tw-d-seeds");
        if (!detail.players || !detail.players.length) { box.innerHTML = ""; return; }
        box.innerHTML = `<h3 class="tw-demo-h3"><i class="bi bi-person-badge"></i> Ishtirokchilar (${detail.players.length})</h3>
            <div class="tw-demo-seedgrid">` +
            detail.players.map(p => `
                <div class="tw-demo-seed">
                    <span class="tw-demo-seedno">#${p.seed}</span>
                    <span class="tw-bk-ava" style="--c:${avatarColor(p.username)}">${initials(p.username)}</span>
                    <span class="tw-demo-seedname">${esc(p.username)}</span>
                </div>`).join("") + `</div>`;
    }

    // ── Render: bracket ──
    function matchSideHtml(m, slot) {
        const pid = slot === 1 ? m.player1Id : m.player2Id;
        const pname = slot === 1 ? m.player1 : m.player2;
        const wpm = slot === 1 ? m.player1Wpm : m.player2Wpm;
        const decided = !!m.winnerId;
        if (!pid) return `<div class="tw-bk-side tw-bk-empty">
            <span class="tw-bk-ava">?</span><span class="tw-bk-pname">kutilmoqda…</span></div>`;
        const won = decided && m.winnerId === pid;
        const cls = "tw-bk-side" + (decided ? (won ? " tw-bk-won" : " tw-bk-lost") : "");
        const crown = won ? ` <i class="bi bi-trophy-fill tw-bk-crown"></i>` : "";
        const metric = decided
            ? `<span class="tw-bk-wpm">${Math.round(wpm)}<small>wpm</small></span>`
            : `<span class="tw-bk-wpm" style="visibility:hidden">0</span>`;
        return `<div class="${cls}">
            <span class="tw-bk-ava" style="--c:${avatarColor(pname)}">${initials(pname)}</span>
            <span class="tw-bk-pname">${esc(pname || "?")}${crown}</span>
            ${metric}
        </div>`;
    }
    function matchHtml(m, isFinal) {
        const decided = !!m.winnerId;
        return `<div class="tw-bk-match${decided ? " tw-bk-decided" : ""}${isFinal ? " tw-bk-match--final" : ""}" id="tw-dbk-${m.id}">
            ${matchSideHtml(m, 1)}
            <span class="tw-bk-vs">VS</span>
            ${matchSideHtml(m, 2)}
        </div>`;
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
            tid = null; finished = false; lastDetail = null;
            $("tw-d-champion").classList.add("d-none");
            $("tw-d-log").innerHTML = "";
            $("tw-d-standings").classList.add("d-none");

            const r = await api("POST", "/api/tournamentdemo", { playerCount: DEMO_PLAYERS });
            tid = r.id;
            const d = await refresh();
            log(`<b>Turnir yaratildi</b> — ${d.players.length} ta soxta o'yinchi ro'yxatga olindi (sig'im ${DEMO_PLAYERS}).`, "ok");
            status("Turnir yaratildi. Endi «Turnirni boshlash»ni bosing — bracket quriladi.");
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
        // O'ynalgan o'yinlar bo'lsa — jurnalga yozamiz (finished bilan birga kelishi mumkin)
        if (res.matches && res.matches.length) {
            log(`<b>${esc(res.roundName)}</b> o'ynaldi — ${res.matches.length} ta o'yin:`, "round");
            res.matches.forEach(m => {
                log(`${esc(m.player1)} <span class="tw-demo-sc">${Math.round(m.p1Wpm)}</span> — ` +
                    `<span class="tw-demo-sc">${Math.round(m.p2Wpm)}</span> ${esc(m.player2)} ` +
                    `→ <b class="tw-demo-hl">${esc(m.winner)}</b>`, "match");
            });
        }
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
            tid = null; finished = false; lastDetail = null;
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

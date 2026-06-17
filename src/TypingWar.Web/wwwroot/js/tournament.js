/* TypingWar — turnir bracket (live, tomoshabin rejimi) */
(function () {
    "use strict";

    const root = document.getElementById("tw-tournament");
    if (!root) return;

    const id = new URLSearchParams(location.search).get("id");
    if (!id) { document.getElementById("tw-tourn-err").textContent = "Turnir ko'rsatilmagan."; return; }
    const isAuth = root.dataset.authenticated === "true";

    const $ = x => document.getElementById(x);
    const nameEl = $("tw-tourn-name"), metaEl = $("tw-tourn-meta"), errEl = $("tw-tourn-err"),
        champEl = $("tw-tourn-champion"), regBtn = $("tw-tourn-register"), startBtn = $("tw-tourn-start"),
        playersEl = $("tw-tourn-players"), bracketEl = $("tw-bracket"),
        bracketTitle = $("tw-bracket-title"), hintEl = $("tw-tourn-hint");

    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const STATUS = { 0: "Ro'yxat ochiq", 1: "Davom etmoqda", 2: "Tugagan" };

    let conn = null, currentStatus = 0;

    async function load() {
        try {
            const r = await fetch("/api/tournaments/" + id, { credentials: "same-origin" });
            if (!r.ok) { errEl.textContent = "Turnir topilmadi."; return; }
            render(await r.json());
        } catch { errEl.textContent = "Tarmoq xatosi."; }
    }

    function render(d) {
        const info = d.info;
        currentStatus = info.status;
        nameEl.textContent = info.name;
        metaEl.textContent = `${STATUS[info.status] || info.status} · ${info.playerCount}/${info.capacity} o'yinchi`;

        champEl.classList.toggle("d-none", !info.champion);
        if (info.champion) champEl.innerHTML = `🏆 G'olib: <b>${esc(info.champion)}</b>`;

        // tugmalar
        regBtn.classList.toggle("d-none", !(isAuth && info.status === 0 && !d.isRegistered && info.playerCount < info.capacity));
        startBtn.classList.toggle("d-none", !(isAuth && info.status === 0 && info.playerCount >= 2));

        // o'yinchilar
        playersEl.innerHTML = (d.players || []).map((p, i) =>
            `<span class="tw-tourn-chip">${i + 1}. ${esc(p)}</span>`).join("");

        renderBracket(d.matches, info.status);
    }

    function renderBracket(matches, status) {
        const has = matches && matches.length > 0;
        bracketTitle.classList.toggle("d-none", !has);
        hintEl.classList.toggle("d-none", !(has && isAuth && status === 1));
        if (!has) { bracketEl.innerHTML = ""; return; }

        const rounds = {};
        matches.forEach(m => { (rounds[m.round] = rounds[m.round] || []).push(m); });

        bracketEl.innerHTML = Object.keys(rounds).sort((a, b) => a - b).map(rk => {
            const ms = rounds[rk].sort((a, b) => a.slot - b.slot);
            const col = ms.map(m => matchHtml(m, status)).join("");
            return `<div class="tw-round">
                <div class="tw-round-name">${esc(ms[0].roundName)}</div>${col}</div>`;
        }).join("");

        if (isAuth && status === 1) {
            bracketEl.querySelectorAll(".tw-pick").forEach(el =>
                el.addEventListener("click", () => report(el.dataset.match, el.dataset.player)));
        }
    }

    function matchHtml(m, status) {
        const actionable = isAuth && status === 1 && m.player1Id && m.player2Id && !m.winnerId;
        const row = (pid, pname) => {
            if (!pid) return `<div class="tw-slot tw-empty">—</div>`;
            const won = m.winnerId === pid ? " tw-won" : (m.winnerId ? " tw-lost" : "");
            const cls = actionable ? "tw-slot tw-pick" : "tw-slot";
            const attr = actionable ? ` data-match="${m.id}" data-player="${pid}"` : "";
            return `<div class="${cls}${won}"${attr}>${esc(pname || "?")}</div>`;
        };
        return `<div class="tw-match">${row(m.player1Id, m.player1)}${row(m.player2Id, m.player2)}</div>`;
    }

    async function report(matchId, winnerId) {
        errEl.textContent = "";
        if (conn && conn.state === "Connected") {
            conn.invoke("ReportResult", id, matchId, winnerId).catch(() => { });
        }
    }

    regBtn.addEventListener("click", () => act("register"));
    startBtn.addEventListener("click", () => act("start"));

    async function act(path) {
        errEl.textContent = "";
        try {
            const r = await fetch(`/api/tournaments/${id}/${path}`, { method: "POST", credentials: "same-origin" });
            if (r.status === 401) { window.location.href = "/Login"; return; }
            if (!r.ok) {
                const b = await r.json().catch(() => ({}));
                errEl.textContent = b.error || "Amal bajarilmadi.";
            } else {
                await load();
            }
        } catch { errEl.textContent = "Tarmoq xatosi."; }
    }

    // ── SignalR (live + tomoshabin) ──
    if (window.signalR) {
        conn = new signalR.HubConnectionBuilder().withUrl("/hubs/tournament").withAutomaticReconnect().build();
        conn.on("Error", m => { errEl.textContent = m; });
        conn.on("MatchUpdated", () => load());
        conn.on("TournamentFinished", () => load());
        conn.start().then(() => conn.invoke("JoinTournament", id)).catch(() => { });
    }

    load();
})();

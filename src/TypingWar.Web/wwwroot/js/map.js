/* TypingWar — O'zbekiston typing xaritasi (heat map + live) */
(function () {
    "use strict";

    const root = document.getElementById("tw-map");
    if (!root) return;

    const isAuth = root.dataset.authenticated === "true";
    const $ = id => document.getElementById(id);
    const detailEl = $("tw-region-detail"), errEl = $("tw-map-err");
    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

    const stats = new Map(); // code -> {code,name,avgWpm,playerCount}
    let maxWpm = 0;

    // Sovuq (kulrang) → issiq (oltin → qizil)
    function colorFor(avg) {
        if (!avg || avg <= 0) return "#23233a";
        const t = maxWpm > 0 ? Math.min(1, avg / maxWpm) : 0;
        // t: 0 → #6a5a2a (xira), 1 → #ff3c2a (issiq), oraliqda oltin
        const r = Math.round(120 + t * 135);
        const g = Math.round(90 + (t < 0.5 ? t * 120 : (1 - t) * 120));
        const b = Math.round(40 + (1 - t) * 20);
        return `rgb(${r},${g},${b})`;
    }

    function shape(g) { return g.querySelector("polygon, circle, path"); }

    function paint() {
        document.querySelectorAll(".tw-region").forEach(g => {
            const code = g.dataset.region;
            const s = stats.get(code);
            const el = shape(g);
            if (el) el.setAttribute("fill", colorFor(s ? s.avgWpm : 0));
        });
    }

    function showDetail(code) {
        const s = stats.get(code);
        if (!s) { detailEl.innerHTML = `<p class="text-secondary">Ma'lumot yo'q.</p>`; return; }
        detailEl.innerHTML = `<h5 class="tw-accent">${esc(s.name)}</h5>
            <div class="tw-region-wpm">${s.avgWpm > 0 ? Math.round(s.avgWpm) : "—"} <small>wpm</small></div>
            <p class="text-secondary mb-0">${s.playerCount} natija</p>`;
    }

    function setStat(s) {
        stats.set(s.code, s);
        maxWpm = Math.max(0, ...Array.from(stats.values()).map(x => x.avgWpm || 0));
    }

    async function load() {
        try {
            const r = await fetch("/api/regions", { credentials: "same-origin" });
            if (!r.ok) { errEl.textContent = "Xarita yuklanmadi."; return; }
            const data = await r.json();
            data.regions.forEach(s => stats.set(s.code, s));
            maxWpm = data.maxAvgWpm || 0;
            paint();
        } catch { errEl.textContent = "Tarmoq xatosi."; }
    }

    document.querySelectorAll(".tw-region").forEach(g =>
        g.addEventListener("click", () => showDetail(g.dataset.region)));

    // ── Live (SignalR) ──
    let conn = null;
    if (window.signalR) {
        conn = new signalR.HubConnectionBuilder().withUrl("/hubs/uzmap").withAutomaticReconnect().build();
        conn.on("RegionUpdated", s => { setStat(s); paint(); });
        conn.start().then(() => conn.invoke("JoinMap")).catch(() => { });
    }

    // ── Hissa qo'shish (mini typing test) ──
    const wordsEl = $("tw-map-words"), liveEl = $("tw-map-live");
    if (isAuth && wordsEl) {
        const TEXT = "Vatanim O'zbekiston, tinch va obod yurt, sening tezliging bilan faxrlanaman.";
        let chars = [], pos = 0, correct = 0, startTime = null, finished = false;

        function begin() {
            chars = Array.from(TEXT); pos = 0; correct = 0; startTime = null; finished = false;
            wordsEl.innerHTML = chars.map(c => `<span class="tw-letter">${esc(c)}</span>`).join("");
            if (liveEl) liveEl.textContent = "0";
        }
        const letterEls = () => wordsEl.querySelectorAll(".tw-letter");
        const elapsed = () => startTime === null ? 0 : (performance.now() - startTime) / 1000;
        const wpmNow = () => { const e = elapsed(); return e > 0 ? (correct / 5) / (e / 60) : 0; };

        wordsEl.addEventListener("click", () => wordsEl.focus());
        wordsEl.addEventListener("keydown", ev => {
            if (finished || chars.length === 0) return;
            if (ev.key === "Backspace") {
                ev.preventDefault();
                if (pos > 0) { pos--; letterEls()[pos].classList.remove("tw-correct", "tw-incorrect"); }
                return;
            }
            if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
            ev.preventDefault();
            if (pos >= chars.length) return;
            if (startTime === null) startTime = performance.now();
            const ok = ev.key === chars[pos];
            const el = letterEls()[pos];
            if (ok) { el.classList.add("tw-correct"); correct++; } else el.classList.add("tw-incorrect");
            pos++;
            if (liveEl) liveEl.textContent = Math.round(wpmNow());
            if (pos >= chars.length) finish();
        });

        function finish() {
            if (finished) return;
            finished = true;
            const wpm = Math.round(wpmNow());
            if (conn && conn.state === "Connected" && wpm > 0)
                conn.invoke("ReportResult", wpm).catch(() => { });
            setTimeout(begin, 1500);
        }
        begin();
    }

    load();
})();

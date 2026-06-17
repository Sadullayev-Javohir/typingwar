/* TypingWar — profil */
(function () {
    "use strict";

    const root = document.getElementById("tw-profile");
    if (!root || root.dataset.authenticated !== "true") return;

    const $ = id => document.getElementById(id);
    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const TIME = { Ten: "10s", Fifteen: "15s", Thirty: "30s", Sixty: "60s", OneTwenty: "120s" };
    const tm = k => TIME[k] || k;

    async function load() {
        try {
            const r = await fetch("/api/profile", { credentials: "same-origin" });
            if (!r.ok) { $("tw-p-err").textContent = "Profil yuklanmadi."; return; }
            render(await r.json());
        } catch { $("tw-p-err").textContent = "Tarmoq xatosi."; }
    }

    function render(p) {
        $("tw-p-name").textContent = p.username;
        $("tw-p-region").textContent = p.region;
        $("tw-p-elo").textContent = p.elo;
        $("tw-p-joined").textContent = new Date(p.joinedAt).toLocaleDateString();

        $("tw-p-pbs").innerHTML = (p.personalBests || []).map(b =>
            `<li><span>${tm(b.timeMode)}</span>
                <span class="tw-accent">${Math.round(b.bestWpm)} wpm · ${(b.accuracy || 0).toFixed(1)}%</span></li>`
        ).join("") || `<li class="text-secondary">Hali rekord yo'q.</li>`;

        $("tw-p-recent").innerHTML = (p.recent || []).map(r =>
            `<li><span>${tm(r.timeMode)} · ${new Date(r.playedAt).toLocaleDateString()}</span>
                <span class="tw-accent">${Math.round(r.wpm)} wpm</span></li>`
        ).join("") || `<li class="text-secondary">Hali natija yo'q.</li>`;
    }

    load();
})();

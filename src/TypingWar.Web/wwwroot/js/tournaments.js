/* TypingWar — turnirlar ro'yxati + yaratish */
(function () {
    "use strict";

    const root = document.getElementById("tw-tournaments");
    if (!root) return;

    const listEl = document.getElementById("tw-tourn-list");
    const form = document.getElementById("tw-tourn-create");
    const createErr = document.getElementById("tw-tourn-createerr");

    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const STATUS = { 0: "Ro'yxat", 1: "Davom etmoqda", 2: "Tugagan" };

    async function load() {
        try {
            const r = await fetch("/api/tournaments", { credentials: "same-origin" });
            if (!r.ok) return;
            const items = await r.json();
            listEl.innerHTML = items.map(t => {
                const when = new Date(t.startAt).toLocaleString();
                return `<li>
                    <span><a class="tw-accent" href="/Tournament?id=${t.id}">${esc(t.name)}</a>
                        <small class="text-secondary">· ${STATUS[t.status] || t.status} · ${t.playerCount}/${t.capacity}</small></span>
                    <span class="text-secondary small">${esc(when)}</span>
                </li>`;
            }).join("") || `<li class="text-secondary">Hali turnir yo'q.</li>`;
        } catch { /* jim */ }
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            createErr.textContent = "";
            const body = {
                name: form.name.value.trim(),
                capacity: parseInt(form.capacity.value, 10),
                startAt: new Date(form.startAt.value).toISOString()
            };
            try {
                const r = await fetch("/api/tournaments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify(body)
                });
                if (r.status === 401) { window.location.href = "/Login"; return; }
                if (r.ok) {
                    const { id } = await r.json();
                    window.location.href = "/Tournament?id=" + id;
                } else {
                    const b = await r.json().catch(() => ({}));
                    createErr.textContent = b.error || "Xatolik.";
                }
            } catch { createErr.textContent = "Tarmoq xatosi."; }
        });
    }

    load();
})();

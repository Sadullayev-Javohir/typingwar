/* TypingWar — admin paneli */
(function () {
    "use strict";

    const root = document.getElementById("tw-admin");
    if (!root) return;

    const $ = id => document.getElementById(id);
    const errEl = $("tw-admin-err"), statsEl = $("tw-admin-stats"),
        form = $("tw-admin-addtext"), msgEl = $("tw-admin-msg");

    const CARDS = [
        ["users", "Foydalanuvchilar"], ["texts", "Matnlar"], ["results", "Natijalar"],
        ["contests", "Musobaqalar"], ["tournaments", "Turnirlar"], ["rooms", "Xonalar"]
    ];

    async function loadStats() {
        try {
            const r = await fetch("/api/admin/stats", { credentials: "same-origin" });
            if (r.status === 403 || r.status === 401) { errEl.textContent = "Ruxsat yo'q (faqat admin)."; return; }
            if (!r.ok) { errEl.textContent = "Statistika yuklanmadi."; return; }
            const s = await r.json();
            statsEl.innerHTML = CARDS.map(([k, label]) =>
                `<div class="col-4 col-md-2"><div class="tw-room-card">
                    <div class="tw-admin-num">${s[k] ?? 0}</div>
                    <div class="text-secondary small">${label}</div></div></div>`).join("");
        } catch { errEl.textContent = "Tarmoq xatosi."; }
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        msgEl.textContent = "";
        const body = { content: form.content.value.trim(), difficulty: form.difficulty.value };
        try {
            const r = await fetch("/api/admin/texts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(body)
            });
            if (!r.ok) {
                const b = await r.json().catch(() => ({}));
                msgEl.textContent = b.error || "Qo'shilmadi.";
                return;
            }
            form.reset();
            msgEl.textContent = "✓ qo'shildi";
            loadStats();
        } catch { msgEl.textContent = "Tarmoq xatosi."; }
    });

    loadStats();
})();

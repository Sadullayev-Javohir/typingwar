/* TypingWar — leaderboard: tablar + top 50 + joriy foydalanuvchi qatori */
(function () {
    "use strict";

    const body = document.getElementById("tw-lb-body");
    const tabs = document.querySelectorAll(".tw-tab");
    let mode = "Thirty";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function row(e) {
        const cls = e.isCurrentUser ? ' class="tw-me"' : "";
        const medal = e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : e.rank;
        return `<tr${cls}>
            <td>${medal}</td>
            <td>${esc(e.username)}</td>
            <td class="tw-region">${esc(e.regionCode || "—")}</td>
            <td class="text-end tw-wpm">${Math.round(e.wpm)}</td>
            <td class="text-end">${e.accuracy.toFixed(1)}%</td>
        </tr>`;
    }

    function separator() {
        return `<tr class="tw-sep"><td colspan="5" class="text-center">···</td></tr>`;
    }

    async function load() {
        body.innerHTML = `<tr><td colspan="5" class="text-center text-secondary">Yuklanmoqda…</td></tr>`;
        try {
            const r = await fetch(`/api/leaderboard?timeMode=${mode}`, { credentials: "same-origin" });
            const dto = await r.json();
            let html = "";

            if (!dto.top || dto.top.length === 0) {
                html = `<tr><td colspan="5" class="text-center text-secondary">
                    Hali natijalar yo'q. Birinchi bo'ling!</td></tr>`;
            } else {
                html = dto.top.map(row).join("");
                // Joriy foydalanuvchi top 50 da bo'lmasa — ajratuvchi + uning qatori
                if (dto.currentUser && !dto.currentUserInTop) {
                    html += separator() + row(dto.currentUser);
                }
            }
            body.innerHTML = html;
        } catch (e) {
            body.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Yuklashda xatolik.</td></tr>`;
        }
    }

    tabs.forEach(t => t.addEventListener("click", () => {
        tabs.forEach(x => x.classList.remove("tw-active"));
        t.classList.add("tw-active");
        mode = t.dataset.mode;
        load();
    }));

    load();
})();

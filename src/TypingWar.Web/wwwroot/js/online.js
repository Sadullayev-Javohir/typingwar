/* TypingWar — /Online sahifasi: onlayn foydalanuvchilar ro'yxati + invite */
(function () {
    "use strict";
    const grid = document.getElementById("tw-online-grid");
    if (!grid || !window.TWPresence) return;

    const countEl = document.getElementById("tw-online-count");
    const emptyEl = document.getElementById("tw-online-empty");

    const REGIONS = {
        TASHKENT_CITY: "Toshkent sh.", TASHKENT_REGION: "Toshkent v.", ANDIJAN: "Andijon",
        FERGANA: "Farg'ona", NAMANGAN: "Namangan", SAMARKAND: "Samarqand",
        BUKHARA: "Buxoro", NAVOI: "Navoiy", KASHKADARYA: "Qashqadaryo",
        SURKHANDARYA: "Surxondaryo", JIZZAKH: "Jizzax", SYRDARYA: "Sirdaryo",
        KHOREZM: "Xorazm", KARAKALPAKSTAN: "Qoraqalpog'iston"
    };
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"]/g, c =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    }
    function regionName(c) { return c ? (REGIONS[c] || c) : ""; }
    function avatar(url, name) {
        if (url) return `<img class="tw-online-av" src="${esc(url)}" alt="" onerror="this.style.display='none'"/>`;
        const ch = (name || "?").trim().charAt(0).toUpperCase();
        return `<div class="tw-online-av tw-online-av--txt">${esc(ch)}</div>`;
    }

    // Joriy foydalanuvchi ID si (invite o'ziga ketmasligi uchun)
    const myId = (window.TWAuth && window.TWAuth.userId) || null;

    function card(u) {
        const mine = myId && u.userId === myId;
        return `<div class="tw-online-card glass" data-uid="${esc(u.userId)}">
            ${avatar(u.avatarUrl, u.username)}
            <div class="tw-online-info">
                <div class="tw-online-name">${esc(u.username)}</div>
                <div class="tw-online-meta">
                    <span class="tw-online-wpm"><i class="bi bi-speedometer2"></i> ${esc(u.avgWpm)} WPM</span>
                    ${regionName(u.regionCode) ? `<span class="tw-online-region"><i class="bi bi-geo-alt"></i> ${esc(regionName(u.regionCode))}</span>` : ""}
                </div>
            </div>
            ${mine ? `<span class="tw-online-you">Siz</span>`
                   : `<button type="button" class="tw-rbtn tw-rbtn--sm tw-online-invite" data-uid="${esc(u.userId)}"><i class="bi bi-person-plus"></i> Invite</button>`}
        </div>`;
    }

    function render(list) {
        const arr = Array.isArray(list) ? list : [];
        if (countEl) countEl.textContent = arr.length;
        if (!arr.length) {
            grid.innerHTML = "";
            if (emptyEl) { grid.appendChild(emptyEl); emptyEl.style.display = ""; }
            return;
        }
        if (emptyEl) emptyEl.style.display = "none";
        grid.innerHTML = arr.map(card).join("");
    }

    grid.addEventListener("click", async (e) => {
        const btn = e.target.closest(".tw-online-invite");
        if (!btn) return;
        btn.disabled = true;
        const prev = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Yuborildi…';
        try {
            await window.TWPresence.invite(btn.dataset.uid);
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Yuborildi';
            setTimeout(() => { btn.innerHTML = prev; btn.disabled = false; }, 2500);
        } catch {
            btn.innerHTML = prev; btn.disabled = false;
        }
    });

    // Global presence'dan joriy ro'yxat + o'zgarishlar
    render(window.TWPresence.getOnline());
    window.TWPresence.onOnlineChange(render);
})();

/* TypingWar — /Duel sahifasi: do'stlar partiyasi (hangout) + chat + duel */
(function () {
    "use strict";
    const root = document.getElementById("tw-duel");
    if (!root || !window.TWPresence) return;

    const membersEl = document.getElementById("tw-duel-members");
    const msgsEl = document.getElementById("tw-duel-msgs");
    const form = document.getElementById("tw-duel-form");
    const input = document.getElementById("tw-duel-input");

    const code = (new URLSearchParams(location.search).get("code") || "").toUpperCase();
    if (!code) {
        membersEl.innerHTML = '<div class="tw-duel-empty">Partiya kodi ko\'rsatilmagan.</div>';
        return;
    }

    const myId = (window.TWAuth && window.TWAuth.userId) || null;

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
        if (url) return `<img class="tw-duel-av" src="${esc(url)}" alt="" onerror="this.style.display='none'"/>`;
        const ch = (name || "?").trim().charAt(0).toUpperCase();
        return `<div class="tw-duel-av tw-duel-av--txt">${esc(ch)}</div>`;
    }

    function renderMembers(list) {
        const arr = Array.isArray(list) ? list : [];
        if (!arr.length) {
            membersEl.innerHTML = '<div class="tw-duel-empty">Hali hech kim yo\'q.</div>';
            return;
        }
        // Egasi birinchi, keyin WPM bo'yicha
        arr.sort((a, b) => (b.isOwner - a.isOwner) || (b.avgWpm - a.avgWpm));
        membersEl.innerHTML = arr.map(m => {
            const mine = myId && m.userId === myId;
            return `<div class="tw-duel-member" data-uid="${esc(m.userId)}">
                ${avatar(m.avatarUrl, m.username)}
                <div class="tw-duel-m-info">
                    <div class="tw-duel-m-name">${esc(m.username)} ${m.isOwner ? '<span class="tw-duel-owner">egasi</span>' : ""}</div>
                    <div class="tw-duel-m-meta">
                        <span><i class="bi bi-speedometer2"></i> ${esc(m.avgWpm)} WPM</span>
                        ${regionName(m.regionCode) ? `<span><i class="bi bi-geo-alt"></i> ${esc(regionName(m.regionCode))}</span>` : ""}
                    </div>
                </div>
                ${mine ? "" : `<button type="button" class="tw-rbtn tw-rbtn--sm tw-duel-duel" data-uid="${esc(m.userId)}"><i class="bi bi-lightning-charge"></i> Duel</button>`}
            </div>`;
        }).join("");
    }

    function addMsg(m) {
        const el = document.createElement("div");
        el.className = "tw-duel-msg";
        el.innerHTML = `${avatar(m.avatar, m.name)}
            <div class="tw-duel-msg-body">
                <div class="tw-duel-msg-head"><b>${esc(m.name)}</b> <span class="tw-duel-msg-at">${esc(m.at)}</span></div>
                <div class="tw-duel-msg-text">${esc(m.text)}</div>
            </div>`;
        msgsEl.appendChild(el);
        msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    // ── SignalR voqealari ──
    const conn = () => window.TWPresence.connection;
    if (conn()) {
        conn().on("PartyMembers", renderMembers);
        conn().on("PartyMessage", addMsg);
        conn().on("DuelCreated", d => { window.location.href = "/Room?code=" + encodeURIComponent(d.roomCode); });
    }

    membersEl.addEventListener("click", async (e) => {
        const btn = e.target.closest(".tw-duel-duel");
        if (!btn) return;
        btn.disabled = true;
        try { await window.TWPresence.startDuel(btn.dataset.uid, code); }
        finally { setTimeout(() => btn.disabled = false, 1500); }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = "";
        const c = conn();
        if (c) await c.invoke("SendPartyMessage", code, text).catch(() => {});
    });

    // ── Ulanish tayyor bo'lgach partiyaga qo'shilamiz ──
    function joinWhenReady(tries) {
        const c = conn();
        if (c && c.state === "Connected") {
            c.invoke("JoinParty", code).catch(() => {});
            return;
        }
        if (tries > 50) return; // ~5s
        setTimeout(() => joinWhenReady(tries + 1), 100);
    }
    joinWhenReady(0);
})();

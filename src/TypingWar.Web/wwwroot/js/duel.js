/* TypingWar — /Duel sahifasi: do'stlar partiyasi (hangout) + chat + duel */
(function () {
    "use strict";
    const root = document.getElementById("tw-duel");
    if (!root || !window.TWPresence) return;

    const membersEl = document.getElementById("tw-duel-members");
    const msgsEl = document.getElementById("tw-duel-msgs");
    const form = document.getElementById("tw-duel-form");
    const input = document.getElementById("tw-duel-input");

    let code = (new URLSearchParams(location.search).get("code") || "").toUpperCase();
    const myId = (window.TWAuth && window.TWAuth.userId) || null;

    // Tizimga kirmagan bo'lsa presence umuman ulanmaydi — aniq xabar ko'rsatamiz.
    if (!window.TWPresence.isEnabled) {
        membersEl.innerHTML =
            '<div class="tw-duel-empty">Partiyaga qo\'shilish uchun avval <a href="/Login">tizimga kiring</a>.</div>';
        if (input) { input.disabled = true; input.placeholder = "Chat uchun tizimga kiring…"; }
        return;
    }

    // Kod bo'lmasa — o'z partiyangizni yaratishni taklif qilamiz (dead-end bo'lmasin).
    function showNoCode(msg) {
        membersEl.innerHTML =
            '<div class="tw-duel-empty">' + esc(msg) +
            '<div class="tw-duel-empty-actions">' +
            '<button type="button" class="tw-rbtn tw-rbtn--sm" id="tw-duel-create"><i class="bi bi-plus-lg"></i> Yangi partiya yaratish</button> ' +
            '<a class="tw-rbtn tw-rbtn--ghost tw-rbtn--sm" href="/Online"><i class="bi bi-people"></i> Onlayn ro\'yxat</a>' +
            '</div></div>';
        const btn = document.getElementById("tw-duel-create");
        if (btn) btn.addEventListener("click", createMyParty);
    }

    async function createMyParty() {
        try {
            const newCode = await window.TWPresence.createParty();
            if (newCode) {
                // URL ni yangilaymiz va partiyaga qo'shilamiz (sahifani qayta yuklamasdan)
                code = String(newCode).toUpperCase();
                history.replaceState(null, "", "/Duel?code=" + encodeURIComponent(code));
                membersEl.innerHTML = '<div class="tw-duel-empty">Partiya tayyorlanmoqda…</div>';
                joinAttempted = false;
                rejoin();
            }
        } catch { showNoCode("Partiya yaratib bo'lmadi. Qaytadan urinib ko'ring."); }
    }

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
        const others = arr.filter(m => !(myId && m.userId === myId)).length;
        const hint = others
            ? '<div class="tw-duel-hint"><i class="bi bi-lightning-charge"></i> Duelni boshlash uchun a\'zo yonidagi <b>Duel</b> tugmasini bosing.</div>'
            : '<div class="tw-duel-hint"><i class="bi bi-hourglass-split"></i> Do\'stingiz qo\'shilishini kuting yoki <a href="/Online">Onlayn ro\'yxat</a>dan chaqiring.</div>';
        membersEl.innerHTML = hint + arr.map(m => {
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
    function wire(c) {
        c.on("PartyMembers", renderMembers);
        c.on("PartyMessage", addMsg);
        c.on("DuelCreated", d => { window.location.href = "/Room?code=" + encodeURIComponent(d.roomCode); });
        c.on("Error", msg => {
            if (msg && /partiya/i.test(msg)) {
                showNoCode("Partiya topilmadi yoki tugatilgan (havola eskirgan bo'lishi mumkin).");
            }
        });
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
        if (!text || !code) return;
        input.value = "";
        const c = window.TWPresence.connection;
        if (c) await c.invoke("SendPartyMessage", code, text).catch(() => {});
    });

    // ── Ulanish ──
    // MUHIM: JoinParty ni ulanish HAQIQATAN "Connected" bo'lgach chaqiramiz
    // (aks holda invoke "not connected" xatosi bilan yiqilib, a'zolar yuklanmaydi).
    // whenConnected har reconnect'da ham qayta ishga tushadi → guruhga qayta qo'shilamiz.
    let joinAttempted = false;
    function rejoin() {
        const c = window.TWPresence.connection;
        if (!c || !code) return;
        joinAttempted = true;
        c.invoke("JoinParty", code).catch(() => {});
    }

    window.TWPresence.onConnection(wire);      // .on handlerlarini bir marta ro'yxatga olamiz
    window.TWPresence.whenConnected(rejoin);   // tayyor bo'lgach (+ reconnect) partiyaga qo'shilamiz

    if (!code) {
        showNoCode("Partiya kodi ko'rsatilmagan. ");
    }

    // Ulanib, JoinParty yuborilgan bo'lsa-yu, hech qanday a'zo kelmasa —
    // "Yuklanmoqda…" da qotib qolmasin.
    setTimeout(() => {
        if (code && joinAttempted && !membersEl.querySelector(".tw-duel-member")
            && !membersEl.querySelector(".tw-duel-empty-actions")) {
            showNoCode("Partiyaga ulanib bo'lmadi yoki partiya tugatilgan. ");
        } else if (code && !joinAttempted) {
            // Ulanish umuman tayyor bo'lmadi (tarmoq muammosi)
            membersEl.innerHTML = '<div class="tw-duel-empty">Serverga ulanib bo\'lmadi. Sahifani yangilang.</div>';
        }
    }, 7000);
})();

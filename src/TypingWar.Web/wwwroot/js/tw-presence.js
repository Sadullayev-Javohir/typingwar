/* TypingWar — global onlayn-presence + notification tizimi.
   _Layout da yuklanadi (faqat /Tournament sahifasidan tashqari).
   Barcha sahifalarda:
     • onlayn ro'yxatni saqlaydi (TWPresence.getOnline)
     • invite / duel xabarlarini PAST-O'NG burchakda notification ko'rsatadi
     •TWPresence.orqali invite/duel yuborish imkonini beradi */
(function () {
    "use strict";

    // O'zbekiston hududlari (kod → nom) — RegionCode ni chiroyli ko'rsatish uchun
    const REGIONS = {
        TASHKENT_CITY: "Toshkent sh.", TASHKENT_REGION: "Toshkent v.", ANDIJAN: "Andijon",
        FERGANA: "Farg'ona", NAMANGAN: "Namangan", SAMARKAND: "Samarqand",
        BUKHARA: "Buxoro", NAVOI: "Navoiy", KASHKADARYA: "Qashqadaryo",
        SURKHANDARYA: "Surxondaryo", JIZZAKH: "Jizzax", SYRDARYA: "Sirdaryo",
        KHOREZM: "Xorazm", KARAKALPAKSTAN: "Qoraqalpog'iston"
    };
    function regionName(code) {
        if (!code) return "";
        return REGIONS[code] || code;
    }

    const me = {
        online: [],
        conn: null,
        started: false,
        listeners: [],
        connListeners: []
    };

    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"]/g, c =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    }
    function avatarHtml(url, name) {
        if (url) return `<img class="tw-ntfy-av" src="${esc(url)}" alt="" onerror="this.style.display='none'"/>`;
        const ch = (name || "?").trim().charAt(0).toUpperCase();
        return `<div class="tw-ntfy-av tw-ntfy-av--txt">${esc(ch)}</div>`;
    }

    // ── Notification stack (past-o'ng) ──
    let stack = null;
    function ensureStack() {
        if (stack) return stack;
        stack = document.createElement("div");
        stack.id = "tw-ntfy-stack";
        stack.setAttribute("aria-live", "polite");
        document.body.appendChild(stack);
        return stack;
    }

    function notify(opts) {
        const s = ensureStack();
        const el = document.createElement("div");
        el.className = "tw-ntfy glass";
        const accent = opts.kind === "duel"
            ? '<i class="bi bi-lightning-charge-fill"></i>'
            : '<i class="bi bi-person-plus-fill"></i>';
        const title = opts.kind === "duel" ? "Duel taklifi!" : "Do'stlik taklifi";
        el.innerHTML = `
            <div class="tw-ntfy-icon">${accent}</div>
            <div class="tw-ntfy-av-wrap">${avatarHtml(opts.avatar, opts.name)}</div>
            <div class="tw-ntfy-body">
                <div class="tw-ntfy-title">${esc(title)}</div>
                <div class="tw-ntfy-from"><b>${esc(opts.name)}</b> sizni chaqiryapti</div>
                <div class="tw-ntfy-meta">
                    ${opts.avgWpm ? `<span><i class="bi bi-speedometer2"></i> ${esc(opts.avgWpm)} WPM</span>` : ""}
                    ${regionName(opts.region) ? `<span><i class="bi bi-geo-alt"></i> ${esc(regionName(opts.region))}</span>` : ""}
                </div>
                <div class="tw-ntfy-actions">
                    <button type="button" class="tw-rbtn tw-rbtn--sm tw-ntfy-accept">Qabul qilish</button>
                    <button type="button" class="tw-rbtn tw-rbtn--ghost tw-rbtn--sm tw-ntfy-decline">Rad etish</button>
                </div>
            </div>
            <button type="button" class="tw-ntfy-x" aria-label="Yopish"><i class="bi bi-x-lg"></i></button>`;

        el.querySelector(".tw-ntfy-accept").addEventListener("click", () => {
            if (opts.onAccept) opts.onAccept();
            el.remove();
        });
        el.querySelector(".tw-ntfy-decline").addEventListener("click", () => el.remove());
        el.querySelector(".tw-ntfy-x").addEventListener("click", () => el.remove());

        s.appendChild(el);
        // 12s dan keyin avtomatik yopiladi
        setTimeout(() => { if (el.parentNode) el.remove(); }, 12000);
    }

    // ── SignalR ulanishi ──
    function init() {
        if (me.started || !window.signalR) return;
        if (typeof TWAuth === "undefined" || !TWAuth.isAuthenticated) return; // faqat tizimga kirganlar
        me.started = true;

        const conn = new signalR.HubConnectionBuilder()
            .withUrl("/hubs/presence")
            .withAutomaticReconnect()
            .build();
        me.conn = conn;

        // Ulanish tayyor bo'lgach kutayotgan callback'larni chaqiramiz
        me.connListeners.splice(0).forEach(cb => { try { cb(conn); } catch (e) { } });

        conn.on("OnlineList", list => {
            me.online = Array.isArray(list) ? list : [];
            me.listeners.forEach(cb => { try { cb(me.online); } catch (e) {} });
        });

        conn.on("InviteReceived", d => {
            notify({
                kind: "invite", name: d.fromName, avatar: d.fromAvatar,
                avgWpm: d.fromAvgWpm, region: d.fromRegion,
                onAccept: () => { window.location.href = "/Duel?code=" + encodeURIComponent(d.partyCode); }
            });
        });

        conn.on("DuelInvite", d => {
            notify({
                kind: "duel", name: d.fromName, avatar: d.fromAvatar,
                avgWpm: d.fromAvgWpm, region: d.fromRegion,
                onAccept: () => { window.location.href = "/Room?code=" + encodeURIComponent(d.roomCode); }
            });
        });

        conn.on("InviteSent", d => {
            const code = d && d.partyCode;
            if (!code) return;
            // Chaqiruvchini o'zi yaratgan partiyaga (hangout) yo'naltiramiz.
            // Agar allaqachon shu partiyada bo'lsa — sahifani yangilamaymiz.
            const cur = new URLSearchParams(location.search).get("code");
            if (location.pathname === "/Duel" && cur && cur.toUpperCase() === code.toUpperCase()) return;
            window.location.href = "/Duel?code=" + encodeURIComponent(code);
        });

        conn.on("Error", msg => console.warn("[presence]", msg));

        conn.start().catch(() => { me.started = false; });
    }

    // ── Public API ──
    window.TWPresence = {
        get connection() { return me.conn; },
        getOnline: () => me.online.slice(),
        onOnlineChange: (cb) => {
            me.listeners.push(cb);
            // Darhol joriy ro'yxat bilan chaqiramiz — agar OnlineList ulanish
            // boshlang'ichda (listener ro'yxatga yozilishidan oldin) kelgan bo'lsa
            // ham, ro'yxat bo'sh qolib ketmaydi (race oldini oladi).
            try { cb(me.online.slice()); } catch (e) { }
            return () => {
                const i = me.listeners.indexOf(cb); if (i >= 0) me.listeners.splice(i, 1);
            };
        },
        invite: (userId) => me.conn && me.conn.invoke("Invite", String(userId)),
        startDuel: (userId, partyCode) => me.conn && me.conn.invoke("InviteToDuel", String(userId), partyCode),
        onConnection: (cb) => {
            if (me.conn) { try { cb(me.conn); } catch (e) { } }
            else me.connListeners.push(cb);
        },
        init
    };

    // Sahifa tayyor bo'lgach ishga tushiramiz (faqat /Tournament dan tashqari)
    if (document.readyState !== "loading") {
        if (location.pathname !== "/Tournament") init();
    } else {
        document.addEventListener("DOMContentLoaded", () => {
            if (location.pathname !== "/Tournament") init();
        });
    }
})();

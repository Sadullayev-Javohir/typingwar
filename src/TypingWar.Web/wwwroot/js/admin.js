/* TypingWar — admin paneli (statistika, foydalanuvchilar, turnirlar, matn) */
(function () {
    "use strict";

    const root = document.getElementById("tw-admin");
    if (!root) return;

    const isSuper = root.dataset.super === "1";
    const $ = id => document.getElementById(id);
    const errEl = $("tw-admin-err"), statsEl = $("tw-admin-stats");

    const REGIONS = {
        TASHKENT_CITY: "Toshkent sh.", TASHKENT_REGION: "Toshkent vil.",
        ANDIJAN: "Andijon", FERGANA: "Farg'ona", NAMANGAN: "Namangan",
        SAMARKAND: "Samarqand", BUKHARA: "Buxoro", NAVOI: "Navoiy",
        KASHKADARYA: "Qashqadaryo", SURKHANDARYA: "Surxondaryo",
        JIZZAKH: "Jizzax", SYRDARYA: "Sirdaryo", KHOREZM: "Xorazm",
        KARAKALPAKSTAN: "Qoraqalpog'iston"
    };
    const regionName = c => (c && REGIONS[c]) ? REGIONS[c] : "—";

    const esc = s => String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const initials = n => { const t = String(n || "?").trim(); return t ? t.charAt(0).toUpperCase() : "?"; };
    const fmtDate = s => { const d = new Date(s); return isNaN(d) ? "—" : d.toLocaleDateString("uz-UZ"); };

    const STATUS = {
        Registration: ["Ro'yxat", "reg"], InProgress: ["Jonli", "live"], Finished: ["Tugagan", "done"]
    };

    async function api(url, opts) {
        const r = await fetch(url, Object.assign({ credentials: "same-origin" }, opts || {}));
        if (r.status === 401 || r.status === 403) throw new Error("Ruxsat yo'q.");
        if (!r.ok) {
            const b = await r.json().catch(() => ({}));
            throw new Error(b.error || b.title || "Xatolik yuz berdi.");
        }
        return r.status === 204 ? null : r.json().catch(() => null);
    }

    /* ── Statistika ── */
    const CARDS = [
        ["users", "Foydalanuvchilar", "bi-people-fill"], ["texts", "Matnlar", "bi-card-text"],
        ["results", "Natijalar", "bi-flag-fill"], ["contests", "Musobaqalar", "bi-calendar-check-fill"],
        ["tournaments", "Turnirlar", "bi-trophy-fill"], ["rooms", "Xonalar", "bi-door-open-fill"]
    ];
    async function loadStats() {
        try {
            const s = await api("/api/admin/stats");
            statsEl.innerHTML = CARDS.map(([k, label, icon]) =>
                `<div class="tw-admin-stat">
                    <i class="bi ${icon}"></i>
                    <div class="tw-admin-num">${s[k] ?? 0}</div>
                    <div class="tw-admin-stat-label">${label}</div>
                </div>`).join("");
        } catch (e) { errEl.textContent = e.message; }
    }

    /* ── Foydalanuvchilar ── */
    const usersBody = $("tw-admin-users"), uCount = $("tw-admin-ucount"), uSearch = $("tw-admin-usearch");
    let searchTimer = null;

    function roleBadges(roles) {
        if (!roles || !roles.length) return '<span class="tw-role tw-role--user">User</span>';
        const order = { SuperAdmin: 0, Admin: 1 };
        return roles.slice().sort((a, b) => (order[a] ?? 9) - (order[b] ?? 9)).map(r => {
            const cls = r === "SuperAdmin" ? "super" : r === "Admin" ? "admin" : "user";
            return `<span class="tw-role tw-role--${cls}">${esc(r)}</span>`;
        }).join(" ");
    }

    function userActions(u) {
        if (!isSuper) return "";
        const isUserSuper = (u.roles || []).includes("SuperAdmin");
        if (isUserSuper) return '<span class="text-secondary small">himoyalangan</span>';
        const isAdmin = (u.roles || []).includes("Admin");
        const roleBtn = isAdmin
            ? `<button class="tw-mini-btn" data-role="0" data-id="${u.id}" title="Adminlikdan olish"><i class="bi bi-shield-minus"></i></button>`
            : `<button class="tw-mini-btn tw-mini-btn--gold" data-role="1" data-id="${u.id}" title="Admin qilish"><i class="bi bi-shield-plus"></i></button>`;
        const delBtn = `<button class="tw-mini-btn tw-mini-btn--danger" data-del="${u.id}" data-name="${esc(u.username)}" title="O'chirish"><i class="bi bi-trash3"></i></button>`;
        return roleBtn + delBtn;
    }

    function renderUsers(list) {
        uCount.textContent = `${list.length} ta foydalanuvchi`;
        if (!list.length) { usersBody.innerHTML = `<tr><td colspan="8" class="tw-admin-empty">Foydalanuvchi topilmadi.</td></tr>`; return; }
        usersBody.innerHTML = list.map(u => `<tr>
            <td><div class="tw-admin-user">
                <span class="tw-admin-ava">${esc(initials(u.username))}</span>
                <div><div class="tw-admin-uname">${esc(u.username)}</div>
                <div class="tw-admin-uemail">${esc(u.email)}</div></div>
            </div></td>
            <td>${esc(regionName(u.regionCode))}</td>
            <td class="tw-num">${u.eloRating}</td>
            <td class="tw-num">${u.raceCount}</td>
            <td class="tw-num">${Math.round(u.bestWpm)}</td>
            <td>${roleBadges(u.roles)}</td>
            <td class="tw-admin-date">${fmtDate(u.createdAt)}</td>
            <td class="tw-admin-actions">${userActions(u)}</td>
        </tr>`).join("");
    }

    async function loadUsers(search) {
        try {
            const q = search ? `?search=${encodeURIComponent(search)}` : "";
            renderUsers(await api("/api/admin/users" + q));
        } catch (e) { usersBody.innerHTML = `<tr><td colspan="8" class="tw-admin-empty">${esc(e.message)}</td></tr>`; }
    }

    usersBody.addEventListener("click", async (e) => {
        const del = e.target.closest("[data-del]");
        const roleBtn = e.target.closest("[data-role]");
        if (del) {
            if (!confirm(`"${del.dataset.name}" foydalanuvchisini va uning barcha ma'lumotlarini butunlay o'chirasizmi?`)) return;
            try { await api(`/api/admin/users/${del.dataset.del}`, { method: "DELETE" }); loadUsers(uSearch.value.trim()); loadStats(); }
            catch (err) { alert(err.message); }
        } else if (roleBtn) {
            try {
                await api(`/api/admin/users/${roleBtn.dataset.id}/role`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isAdmin: roleBtn.dataset.role === "1" })
                });
                loadUsers(uSearch.value.trim());
            } catch (err) { alert(err.message); }
        }
    });

    uSearch.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadUsers(uSearch.value.trim()), 300);
    });

    /* ── Turnirlar ── */
    const toursBody = $("tw-admin-tours"), tCount = $("tw-admin-tcount");

    function renderTours(list) {
        tCount.textContent = `${list.length} ta turnir`;
        if (!list.length) { toursBody.innerHTML = `<tr><td colspan="7" class="tw-admin-empty">Turnir yo'q.</td></tr>`; return; }
        toursBody.innerHTML = list.map(t => {
            const [label, cls] = STATUS[t.status] || [t.status, "reg"];
            return `<tr>
                <td><div class="tw-admin-uname">${esc(t.name)}</div></td>
                <td>${esc(t.hostName)}</td>
                <td><span class="tw-tstatus tw-tstatus--${cls}">${label}</span></td>
                <td class="tw-num">${t.playerCount} / ${t.capacity}</td>
                <td>${t.isPrivate ? '<i class="bi bi-lock-fill" title="Shaxsiy"></i> Shaxsiy' : '<i class="bi bi-unlock"></i> Ochiq'}</td>
                <td class="tw-admin-date">${fmtDate(t.createdAt)}</td>
                <td class="tw-admin-actions">
                    <button class="tw-mini-btn tw-mini-btn--danger" data-deltour="${t.id}" data-name="${esc(t.name)}" title="O'chirish"><i class="bi bi-trash3"></i></button>
                </td>
            </tr>`;
        }).join("");
    }

    async function loadTours() {
        try { renderTours(await api("/api/admin/tournaments")); }
        catch (e) { toursBody.innerHTML = `<tr><td colspan="7" class="tw-admin-empty">${esc(e.message)}</td></tr>`; }
    }

    toursBody.addEventListener("click", async (e) => {
        const del = e.target.closest("[data-deltour]");
        if (!del) return;
        if (!confirm(`"${del.dataset.name}" turnirini o'chirasizmi?`)) return;
        try { await api(`/api/admin/tournaments/${del.dataset.deltour}`, { method: "DELETE" }); loadTours(); loadStats(); }
        catch (err) { alert(err.message); }
    });

    /* ── Matn qo'shish ── */
    const form = $("tw-admin-addtext"), msgEl = $("tw-admin-msg");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        msgEl.textContent = "";
        try {
            await api("/api/admin/texts", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: form.content.value.trim(), source: form.source.value.trim(),
                    language: form.language.value, difficulty: form.difficulty.value
                })
            });
            form.reset();
            msgEl.textContent = "✓ qo'shildi";
            loadStats();
        } catch (err) { msgEl.textContent = err.message; }
    });

    /* ── Tablar ── */
    const loaded = { users: false, tournaments: false };
    function ensureLoaded(tab) {
        if (tab === "users" && !loaded.users) { loaded.users = true; loadUsers(""); }
        if (tab === "tournaments" && !loaded.tournaments) { loaded.tournaments = true; loadTours(); }
    }
    root.querySelectorAll(".tw-admin-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;
            root.querySelectorAll(".tw-admin-tab").forEach(b => b.classList.toggle("is-active", b === btn));
            root.querySelectorAll(".tw-admin-panel").forEach(p => p.classList.toggle("is-active", p.dataset.panel === tab));
            ensureLoaded(tab);
        });
    });

    /* ── Boshlash ── */
    loadStats();
    ensureLoaded("users");
})();

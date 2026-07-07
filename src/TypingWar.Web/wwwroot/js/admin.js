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
    // Sana + vaqt + "necha vaqt oldin" (oxirgi kirish uchun)
    function fmtDateTime(s) {
        if (!s) return '<span class="tw-srv-muted">hech qachon</span>';
        const d = new Date(s);
        if (isNaN(d)) return "—";
        const abs = d.toLocaleString("uz-UZ", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
        return `${abs}<small class="tw-admin-ago">${timeAgo(d)}</small>`;
    }
    function timeAgo(d) {
        const sec = Math.max(0, (Date.now() - d.getTime()) / 1000);
        if (sec < 60) return "hozirgina";
        const m = sec / 60; if (m < 60) return Math.floor(m) + " daqiqa oldin";
        const h = m / 60; if (h < 24) return Math.floor(h) + " soat oldin";
        const days = h / 24; if (days < 30) return Math.floor(days) + " kun oldin";
        const mo = days / 30; if (mo < 12) return Math.floor(mo) + " oy oldin";
        return Math.floor(mo / 12) + " yil oldin";
    }
    function fmtBytes(b) {
        if (!b || b <= 0) return "0";
        const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0; let v = b;
        while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
        return (v >= 100 ? Math.round(v) : v.toFixed(1)) + " " + u[i];
    }
    function fmtUptime(sec) {
        sec = Math.floor(sec || 0);
        const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600),
            m = Math.floor((sec % 3600) / 60);
        const parts = [];
        if (d) parts.push(d + " kun");
        if (h) parts.push(h + " soat");
        parts.push(m + " daqiqa");
        return parts.join(" ");
    }

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
        if (!list.length) { usersBody.innerHTML = `<tr><td colspan="9" class="tw-admin-empty">Foydalanuvchi topilmadi.</td></tr>`; return; }
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
            <td class="tw-admin-date tw-admin-login">${fmtDateTime(u.lastLoginAt)}</td>
            <td class="tw-admin-actions">${userActions(u)}</td>
        </tr>`).join("");
    }

    async function loadUsers(search) {
        try {
            const q = search ? `?search=${encodeURIComponent(search)}` : "";
            renderUsers(await api("/api/admin/users" + q));
        } catch (e) { usersBody.innerHTML = `<tr><td colspan="9" class="tw-admin-empty">${esc(e.message)}</td></tr>`; }
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

    /* ── Server holati (CPU / RAM / disk) ── */
    const serverEl = $("tw-admin-server"), srvUpdated = $("tw-srv-updated");
    let srvTimer = null;

    function gaugeClass(p) { return p >= 90 ? "crit" : p >= 70 ? "warn" : "ok"; }
    function gauge(label, icon, percent, sub) {
        const p = Math.max(0, Math.min(100, percent || 0));
        const cls = gaugeClass(p);
        return `<div class="tw-srv-gauge tw-srv-gauge--${cls}">
            <div class="tw-srv-gauge-head"><span><i class="bi ${icon}"></i> ${label}</span><b>${p.toFixed(p < 10 ? 1 : 0)}%</b></div>
            <div class="tw-srv-bar"><i style="width:${p}%"></i></div>
            <div class="tw-srv-gauge-sub">${sub}</div>
        </div>`;
    }
    function infoRow(label, value) {
        return `<div class="tw-srv-info-row"><span>${label}</span><b>${esc(value)}</b></div>`;
    }
    function renderServer(s) {
        serverEl.innerHTML = `
            <div class="tw-srv-gauges">
                ${gauge("Protsessor (CPU)", "bi-cpu-fill", s.cpuUsagePercent, `${s.cpuCores} yadro`)}
                ${gauge("Operativ xotira (RAM)", "bi-memory", s.ramUsedPercent, `${fmtBytes(s.ramUsedBytes)} / ${fmtBytes(s.ramTotalBytes)}`)}
                ${gauge("Disk", "bi-hdd-fill", s.diskUsedPercent, `${fmtBytes(s.diskUsedBytes)} / ${fmtBytes(s.diskTotalBytes)}`)}
            </div>
            <div class="tw-srv-info">
                ${infoRow("Operatsion tizim", s.os)}
                ${infoRow("Server nomi", s.machineName)}
                ${infoRow(".NET versiyasi", s.dotnetVersion)}
                ${infoRow("Protsessor yadrolari", String(s.cpuCores))}
                ${infoRow("Ilova xotirasi (jarayon)", fmtBytes(s.processRamBytes))}
                ${infoRow("Ilova ish vaqti", fmtUptime(s.uptimeSeconds))}
            </div>`;
        srvUpdated.textContent = "Yangilandi: " + new Date().toLocaleTimeString("uz-UZ");
    }
    async function loadServer() {
        try { renderServer(await api("/api/admin/server")); }
        catch (e) { serverEl.innerHTML = `<div class="tw-srv-loading">${esc(e.message)}</div>`; }
    }
    function startServerPolling() {
        loadServer();
        if (srvTimer) clearInterval(srvTimer);
        srvTimer = setInterval(() => {
            if (document.hidden) return;
            const panel = root.querySelector('.tw-admin-panel[data-panel="server"]');
            if (panel && panel.classList.contains("is-active")) loadServer();
        }, 4000);
    }
    function stopServerPolling() { if (srvTimer) { clearInterval(srvTimer); srvTimer = null; } }

    /* ── Tablar ── */
    const loaded = { users: false, tournaments: false };
    function ensureLoaded(tab) {
        if (tab === "users" && !loaded.users) { loaded.users = true; loadUsers(""); }
        if (tab === "tournaments" && !loaded.tournaments) { loaded.tournaments = true; loadTours(); }
        if (tab === "server") startServerPolling(); else stopServerPolling();
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

/* TypingWar — turnirlar ro'yxati + yaratish (poyga sozlamalari bilan) */
(function () {
    "use strict";

    const root = document.getElementById("tw-tournaments");
    if (!root) return;

    const listEl = document.getElementById("tw-tourn-list");
    const createBtn = document.getElementById("tw-t-create");
    const createErr = document.getElementById("tw-t-createerr");
    const nameEl = document.getElementById("tw-t-name");
    const startEl = document.getElementById("tw-t-start");
    const configEl = document.getElementById("tw-t-config");
    const capGroup = root.querySelector('.tw-config-group[data-group="capacity"]');

    const S = window.TWSettings;
    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const STATUS = { 0: "Ro'yxat ochiq", 1: "Davom etmoqda", 2: "Tugagan" };
    const STATUS_CLASS = { 0: "tw-st-reg", 1: "tw-st-live", 2: "tw-st-done" };
    // Backend enumni STRING qaytaradi — raqamga normallashtiramiz
    const statusKey = s => typeof s === "number" ? s
        : ({ Registration: 0, InProgress: 1, Finished: 2 }[s] ?? -1);

    let capacity = 16;

    // ── Poyga matni sozlamalari (Practice'dan boshlanadi) ──
    const cfg = {
        language: (S && S.get("language")) || "Uzbek",
        textMode: (S && S.get("textMode")) || "Sentences",
        wordCount: (S && S.get("wordCount")) || 25,
        quoteLength: (S && S.get("quoteLength")) || "all"
    };
    const num = (v, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };

    function refreshConfig() {
        if (!configEl) return;
        const uzbek = cfg.language === "Uzbek";
        const codeBtn = configEl.querySelector('.tw-opt[data-key="textMode"][data-value="Code"]');
        if (codeBtn) codeBtn.style.display = uzbek ? "none" : "";
        if (uzbek && cfg.textMode === "Code") cfg.textMode = "Words";

        configEl.querySelectorAll(".tw-opt").forEach(btn => {
            const key = btn.dataset.key, val = btn.dataset.value, cur = cfg[key];
            const active = typeof cur === "number" ? (num(val, NaN) === cur) : (String(cur) === val);
            btn.classList.toggle("tw-active", active);
        });

        const quote = cfg.textMode === "Sentences";
        const qg = configEl.querySelector('.tw-config-group[data-group="quote"]');
        const cg = configEl.querySelector('.tw-config-group[data-group="count"]');
        if (qg) qg.style.display = quote ? "" : "none";
        if (cg) cg.style.display = quote ? "none" : "";
    }

    if (configEl) {
        configEl.querySelectorAll(".tw-opt").forEach(btn => {
            btn.addEventListener("click", e => {
                e.preventDefault();
                cfg[btn.dataset.key] = (btn.dataset.key === "wordCount") ? num(btn.dataset.value, 25) : btn.dataset.value;
                refreshConfig();
            });
        });
        refreshConfig();
    }

    if (capGroup) {
        capGroup.querySelectorAll(".tw-opt").forEach(btn => {
            btn.addEventListener("click", () => {
                capacity = num(btn.dataset.cap, 16);
                capGroup.querySelectorAll(".tw-opt").forEach(b => b.classList.toggle("tw-active", b === btn));
            });
        });
    }

    const isAuth = root.dataset.authenticated === "true";

    function actionFor(t) {
        const full = t.playerCount >= t.capacity;
        if (t.status === 0) {   // statusKey orqali normallashtirilgan
            if (full) return `<a class="tw-titem-btn tw-titem-btn--watch" href="/Tournament?id=${t.id}"><i class="bi bi-eye"></i> To'lgan — ko'rish</a>`;
            return `<button type="button" class="tw-titem-btn tw-titem-btn--join" data-join="${t.id}"><i class="bi bi-person-plus-fill"></i> Qatnashish</button>`;
        }
        if (t.status === 1) return `<a class="tw-titem-btn tw-titem-btn--live" href="/Tournament?id=${t.id}"><i class="bi bi-broadcast"></i> Jonli kuzatish</a>`;
        return `<a class="tw-titem-btn tw-titem-btn--watch" href="/Tournament?id=${t.id}"><i class="bi bi-bar-chart-line"></i> Natijalar</a>`;
    }

    async function joinTournament(tid) {
        if (!isAuth) { window.location.href = "/Login"; return; }
        try {
            const r = await fetch(`/api/tournaments/${tid}/register`, { method: "POST", credentials: "same-origin" });
            if (r.status === 401) { window.location.href = "/Login"; return; }
            // Muvaffaqiyatli yoki allaqachon ro'yxatda — bracket sahifasiga o'tamiz
            window.location.href = "/Tournament?id=" + tid;
        } catch { window.location.href = "/Tournament?id=" + tid; }
    }

    async function load() {
        try {
            const r = await fetch("/api/tournaments", { credentials: "same-origin" });
            if (!r.ok) return;
            const items = await r.json();
            if (!items.length) { listEl.innerHTML = `<li class="tw-tlist-empty">Hali turnir yo'q. Birinchi bo'lib yarating!</li>`; return; }
            listEl.innerHTML = items.map(t => {
                t.status = statusKey(t.status);
                const when = new Date(t.startAt).toLocaleString();
                const sc = STATUS_CLASS[t.status] || "";
                const pct = Math.min(100, Math.round((t.playerCount / Math.max(1, t.capacity)) * 100));
                return `<li class="tw-titem">
                    <a class="tw-titem-link" href="/Tournament?id=${t.id}">
                        <span class="tw-titem-top">
                            <span class="tw-titem-name"><i class="bi bi-trophy"></i> ${esc(t.name)}</span>
                            <span class="tw-tbadge ${sc}">${STATUS[t.status] || t.status}</span>
                        </span>
                        <span class="tw-titem-meta">
                            <span><i class="bi bi-people"></i> ${t.playerCount}/${t.capacity}</span>
                            <span><i class="bi bi-clock"></i> ${esc(when)}</span>
                        </span>
                        <span class="tw-titem-cap"><span style="width:${pct}%"></span></span>
                    </a>
                    <div class="tw-titem-action">${actionFor(t)}</div>
                </li>`;
            }).join("");

            listEl.querySelectorAll("[data-join]").forEach(b =>
                b.addEventListener("click", e => { e.preventDefault(); joinTournament(b.dataset.join); }));
        } catch { /* jim */ }
    }

    if (createBtn) {
        createBtn.addEventListener("click", async () => {
            createErr.textContent = "";
            const name = (nameEl.value || "").trim();
            if (!name) { createErr.textContent = "Turnir nomini kiriting."; return; }
            const startAt = startEl.value
                ? new Date(startEl.value).toISOString()
                : new Date(Date.now() + 6 * 3600 * 1000).toISOString(); // standart: 6 soatdan keyin
            createBtn.disabled = true;
            try {
                const r = await fetch("/api/tournaments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({ name, capacity, startAt, settings: cfg })
                });
                if (r.status === 401) { window.location.href = "/Login"; return; }
                if (r.ok) {
                    const { id } = await r.json();
                    window.location.href = "/Tournament?id=" + id;
                } else {
                    const b = await r.json().catch(() => ({}));
                    createErr.textContent = b.error || "Xatolik.";
                    createBtn.disabled = false;
                }
            } catch { createErr.textContent = "Tarmoq xatosi."; createBtn.disabled = false; }
        });
    }

    load();
})();

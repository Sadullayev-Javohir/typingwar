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
    const privacyGroup = root.querySelector('.tw-config-group[data-group="privacy"]');
    const pwWrap = document.getElementById("tw-t-pwwrap");
    const pwEl = document.getElementById("tw-t-password");

    const S = window.TWSettings;
    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const STATUS = { 0: "Ro'yxat ochiq", 1: "Davom etmoqda", 2: "Tugagan" };
    const STATUS_CLASS = { 0: "tw-st-reg", 1: "tw-st-live", 2: "tw-st-done" };
    // Backend enumni STRING qaytaradi — raqamga normallashtiramiz
    const statusKey = s => typeof s === "number" ? s
        : ({ Registration: 0, InProgress: 1, Finished: 2 }[s] ?? -1);

    let capacity = 16;
    let isPrivate = false;

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

    if (privacyGroup) {
        privacyGroup.querySelectorAll(".tw-opt").forEach(btn => {
            btn.addEventListener("click", () => {
                isPrivate = btn.dataset.private === "true";
                privacyGroup.querySelectorAll(".tw-opt").forEach(b => b.classList.toggle("tw-active", b === btn));
                if (pwWrap) pwWrap.style.display = isPrivate ? "" : "none";
                if (!isPrivate && pwEl) pwEl.value = "";
            });
        });
    }

    const isAuth = root.dataset.authenticated === "true";

    function actionFor(t) {
        const full = t.playerCount >= t.capacity;
        const pv = t.isPrivate ? ' data-private="1"' : '';
        if (t.status === 0) {   // statusKey orqali normallashtirilgan
            if (full) return `<a class="tw-titem-btn tw-titem-btn--watch" href="/Tournament?id=${t.id}"><i class="bi bi-eye"></i> To'lgan — ko'rish</a>`;
            if (!isAuth) return `<a class="tw-titem-btn tw-titem-btn--login" href="/Login"><i class="bi bi-lock-fill"></i> Kirish kerak</a>`;
            const ic = t.isPrivate ? "bi-shield-lock-fill" : "bi-person-plus-fill";
            return `<button type="button" class="tw-titem-btn tw-titem-btn--join" data-join="${t.id}"${pv}><i class="bi ${ic}"></i> Qatnashish</button>`;
        }
        // Shaxsiy turnirni faqat parol orqali ochish mumkin — ro'yxatdan tashqarida "qulf" tugmasi
        if (t.isPrivate) return `<button type="button" class="tw-titem-btn tw-titem-btn--watch" data-join="${t.id}"${pv}><i class="bi bi-shield-lock-fill"></i> Parol bilan kirish</button>`;
        if (t.status === 1) return `<a class="tw-titem-btn tw-titem-btn--live" href="/Tournament?id=${t.id}"><i class="bi bi-broadcast"></i> Jonli kuzatish</a>`;
        return `<a class="tw-titem-btn tw-titem-btn--watch" href="/Tournament?id=${t.id}"><i class="bi bi-bar-chart-line"></i> Natijalar</a>`;
    }

    async function joinTournament(tid, priv) {
        if (!isAuth) { window.location.href = "/Login"; return; }
        // Shaxsiy turnir — parolni so'raymiz; server tomonida ham majburlanadi
        const password = priv ? await promptPassword() : null;
        if (priv && password === null) return;   // bekor qilindi
        try {
            const r = await fetch(`/api/tournaments/${tid}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ password })
            });
            if (r.status === 401) { window.location.href = "/Login"; return; }
            if (r.status === 403) {
                // Parol noto'g'ri — qayta so'raymiz
                if (priv) { showPwError(); return joinTournament(tid, priv); }
                return;
            }
            // Muvaffaqiyatli yoki allaqachon ro'yxatda — bracket sahifasiga o'tamiz
            window.location.href = "/Tournament?id=" + tid;
        } catch { /* tarmoq xatosi — jim */ }
    }

    // ── Parol so'rov oynasi (input + OK) ──
    let pwResolve = null;
    function promptPassword() {
        return new Promise(resolve => {
            pwResolve = resolve;
            const ov = ensurePwModal();
            ov.querySelector(".tw-pwm-err").textContent = "";
            const inp = ov.querySelector("#tw-pwm-input");
            inp.value = "";
            ov.classList.remove("d-none");
            setTimeout(() => inp.focus(), 30);
        });
    }
    function showPwError() {
        const ov = document.getElementById("tw-pw-modal");
        if (ov) ov.querySelector(".tw-pwm-err").textContent = "Parol noto'g'ri. Qaytadan urinib ko'ring.";
    }
    function closePwModal(value) {
        const ov = document.getElementById("tw-pw-modal");
        if (ov) ov.classList.add("d-none");
        const r = pwResolve; pwResolve = null;
        if (r) r(value);
    }
    function ensurePwModal() {
        let ov = document.getElementById("tw-pw-modal");
        if (ov) return ov;
        ov = document.createElement("div");
        ov.id = "tw-pw-modal";
        ov.className = "tw-pw-modal d-none";
        ov.innerHTML = `
            <div class="tw-pwm-card">
                <div class="tw-pwm-icon"><i class="bi bi-shield-lock-fill"></i></div>
                <h3>Shaxsiy turnir</h3>
                <p>Bu turnir parol bilan himoyalangan. Qatnashish uchun turnir egasidan parolni oling.</p>
                <input id="tw-pwm-input" class="tw-tinput" type="password" maxlength="64" placeholder="Parol" autocomplete="off">
                <div class="tw-pwm-err"></div>
                <div class="tw-pwm-actions">
                    <button type="button" class="tw-rbtn tw-rbtn--outline tw-rbtn--sm" data-pwm="cancel"><i class="bi bi-x-lg"></i><span>Bekor</span></button>
                    <button type="button" class="tw-rbtn tw-rbtn--sm" data-pwm="ok"><i class="bi bi-check-lg"></i><span>OK</span></button>
                </div>
            </div>`;
        document.body.appendChild(ov);
        const inp = ov.querySelector("#tw-pwm-input");
        const submit = () => closePwModal(inp.value);
        ov.querySelector('[data-pwm="ok"]').addEventListener("click", submit);
        ov.querySelector('[data-pwm="cancel"]').addEventListener("click", () => closePwModal(null));
        inp.addEventListener("keydown", e => { if (e.key === "Enter") submit(); if (e.key === "Escape") closePwModal(null); });
        ov.addEventListener("mousedown", e => { if (e.target === ov) closePwModal(null); });
        return ov;
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
                const lock = t.isPrivate ? ' <i class="bi bi-shield-lock-fill tw-titem-lock" title="Shaxsiy turnir"></i>' : '';
                return `<li class="tw-titem${t.isPrivate ? " tw-titem--private" : ""}">
                    <a class="tw-titem-link" href="/Tournament?id=${t.id}">
                        <span class="tw-titem-top">
                            <span class="tw-titem-name"><i class="bi bi-trophy"></i> ${esc(t.name)}${lock}</span>
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
                b.addEventListener("click", e => { e.preventDefault(); joinTournament(b.dataset.join, b.dataset.private === "1"); }));
        } catch { /* jim */ }
    }

    if (createBtn) {
        createBtn.addEventListener("click", async () => {
            createErr.textContent = "";
            const name = (nameEl.value || "").trim();
            if (!name) { createErr.textContent = "Turnir nomini kiriting."; return; }
            const password = isPrivate && pwEl ? pwEl.value : null;
            if (isPrivate && (!password || password.length < 4)) {
                createErr.textContent = "Shaxsiy turnir uchun kamida 4 belgili parol kiriting."; return;
            }
            const startAt = startEl.value
                ? new Date(startEl.value).toISOString()
                : new Date(Date.now() + 6 * 3600 * 1000).toISOString(); // standart: 6 soatdan keyin
            createBtn.disabled = true;
            try {
                const r = await fetch("/api/tournaments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({ name, capacity, startAt, settings: cfg, isPrivate, password })
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

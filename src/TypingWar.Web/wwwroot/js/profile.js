/* TypingWar — profil (shaxsiy /Profile va ommaviy /share/{username}) */
(function () {
    "use strict";

    const root = document.getElementById("tw-profile-root");
    if (!root) return;

    const endpoint = root.dataset.endpoint;
    const own = root.dataset.own === "true";

    const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    // /Profile da ko'rsatiladigan rekord rejimlari — vaqt (s) va so'z sonlari alohida.
    const TIME_MODES = ["time:15", "time:30", "time:60", "time:120"];
    const WORD_MODES = ["words:10", "words:25", "words:50", "words:100"];
    const ORDER = TIME_MODES.concat(WORD_MODES);
    // ModeKey -> insonbop yorliq ("time:30" -> "30s", "words:50" -> "50 so'z")
    function tm(k) {
        if (k == null) return "—";
        if (k === "quote") return "Iqtibos";
        const i = k.indexOf(":");
        if (i < 0) return k;
        const kind = k.slice(0, i), val = k.slice(i + 1);
        if (kind === "time") return val + "s";
        if (kind === "words") return val + " so'z";
        return k;
    }

    function fmtDate(s) { try { return new Date(s).toLocaleDateString("uz-UZ"); } catch { return s; } }
    function fmtDur(sec) {
        sec = Math.round(sec || 0);
        if (sec < 60) return sec + "s";
        const m = Math.floor(sec / 60);
        if (m < 60) return m + "m";
        const h = Math.floor(m / 60);
        return h + "s " + (m % 60) + "m";
    }
    function avatarColor(name) {
        let h = 0;
        for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
        return h;
    }

    async function load() {
        try {
            const r = await fetch(endpoint, { credentials: "same-origin" });
            if (r.status === 404) { root.innerHTML = notFound(); return; }
            if (!r.ok) { root.innerHTML = `<div class="tw-profile-loading">Profil yuklanmadi.</div>`; return; }
            render(await r.json());
        } catch {
            root.innerHTML = `<div class="tw-profile-loading">Tarmoq xatosi.</div>`;
        }
    }

    function notFound() {
        return `<div class="tw-profile-empty">
            <div class="tw-profile-empty-ic">🔍</div>
            <h2>Profil topilmadi</h2>
            <p>Bunday foydalanuvchi nomi mavjud emas.</p>
            <a href="/Leaderboard" class="tw-rbtn tw-rbtn--sm tw-rbtn--gold">Reytingni ko'rish</a>
        </div>`;
    }

    function render(p) {
        const s = p.stats || {};
        const name = p.username || "—";
        const hue = avatarColor(name);
        const initial = name.charAt(0).toUpperCase();

        // eng kuchli PB (toj uchun)
        const pbs = (p.personalBests || []).slice().sort((a, b) => ORDER.indexOf(a.modeKey) - ORDER.indexOf(b.modeKey));
        let bestPb = null;
        for (const b of pbs) if (!bestPb || b.bestWpm > bestPb.bestWpm) bestPb = b;

        const shareAbs = location.origin + (p.shareUrl || ("/share/" + name));

        const headerActions = own
            ? `<div class="tw-profile-actions">
                   <button class="tw-rbtn tw-rbtn--sm tw-rbtn--gold" id="tw-share-btn"
                       data-url="${esc(shareAbs)}"><i class="bi bi-share-fill"></i> Profilni ulashish</button>
                   <a href="/Fingerprint" class="tw-rbtn tw-rbtn--sm tw-rbtn--outline"><i class="bi bi-fingerprint"></i> Yozish pasporti</a>
                   <a href="/Review" class="tw-rbtn tw-rbtn--sm tw-rbtn--outline"><i class="bi bi-arrow-repeat"></i> Takroriy mashq</a>
               </div>`
            : `<div class="tw-profile-actions">
                   <a href="/Practice" class="tw-rbtn tw-rbtn--sm tw-rbtn--gold"><i class="bi bi-keyboard"></i> Sen ham sinab ko'r</a>
                   <button class="tw-rbtn tw-rbtn--sm tw-rbtn--outline" id="tw-share-btn"
                       data-url="${esc(shareAbs)}"><i class="bi bi-link-45deg"></i> Havolani nusxalash</button>
               </div>`;

        const statCards = [
            { label: "Eng yuqori WPM", value: Math.round(s.bestWpm || 0), accent: true, ic: "bi-lightning-charge-fill" },
            { label: "O'rtacha WPM", value: Math.round(s.avgWpm || 0), ic: "bi-speedometer2" },
            { label: "O'rtacha aniqlik", value: (s.avgAccuracy || 0).toFixed(1) + "%", ic: "bi-bullseye" },
            { label: "Jami poyga", value: s.totalRaces || 0, ic: "bi-flag-fill" },
            { label: "Jami vaqt", value: fmtDur(s.totalSeconds), ic: "bi-clock-history" },
            { label: "Rekordlar", value: s.pbCount || 0, ic: "bi-trophy-fill" }
        ].map(c => `
            <div class="tw-stat-card${c.accent ? " tw-stat-card--accent" : ""}">
                <i class="bi ${c.ic} tw-stat-ic"></i>
                <div class="tw-stat-val">${c.value}</div>
                <div class="tw-stat-lbl">${c.label}</div>
            </div>`).join("");

        // Rejimlar bo'yicha PB jadvali — vaqt va so'z bo'limlari (yo'q rejim — bo'sh)
        const pbMap = {};
        for (const b of pbs) pbMap[b.modeKey] = b;
        const pbRowHtml = mode => {
            const b = pbMap[mode];
            const isTop = bestPb && b && b.modeKey === bestPb.modeKey && b.bestWpm === bestPb.bestWpm;
            if (!b) return `
                <div class="tw-pb-row tw-pb-row--empty">
                    <span class="tw-pb-mode">${tm(mode)}</span>
                    <span class="tw-pb-wpm">—</span>
                    <span class="tw-pb-acc"></span>
                    <span class="tw-pb-date"></span>
                </div>`;
            return `
                <div class="tw-pb-row${isTop ? " tw-pb-row--top" : ""}">
                    <span class="tw-pb-mode">${tm(mode)}${isTop ? ` <span class="tw-crown" title="Eng yaxshi natija">👑</span>` : ""}</span>
                    <span class="tw-pb-wpm">${Math.round(b.bestWpm)} <small>wpm</small></span>
                    <span class="tw-pb-acc">${(b.accuracy || 0).toFixed(1)}%</span>
                    <span class="tw-pb-date">${fmtDate(b.achievedAt)}</span>
                </div>`;
        };
        const groupHead = label => `
            <div class="tw-pb-row tw-pb-group"><span>${label}</span><span></span><span></span><span></span></div>`;
        const pbRows = groupHead("Vaqt") + TIME_MODES.map(pbRowHtml).join("")
            + groupHead("So'z") + WORD_MODES.map(pbRowHtml).join("");

        const recent = (p.recent || []).map(r => `
            <li class="tw-recent-row">
                <span class="tw-recent-mode">${tm(r.modeKey)}</span>
                <span class="tw-recent-wpm">${Math.round(r.wpm)} <small>wpm</small></span>
                <span class="tw-recent-acc">${(r.accuracy || 0).toFixed(1)}%</span>
                <span class="tw-recent-date">${fmtDate(r.playedAt)}</span>
            </li>`).join("") || `<li class="tw-recent-row tw-recent-empty">Hali natija yo'q.</li>`;

        root.innerHTML = `
            <div class="tw-profile-card">
                <div class="tw-profile-banner"></div>
                <div class="tw-profile-head2">
                    <div class="tw-profile-avatar" style="--h:${hue}">${esc(initial)}</div>
                    <div class="tw-profile-id">
                        <h1 class="tw-profile-name">
                            <span class="tw-profile-name-text">${esc(name)}</span>${bestPb ? ` <span class="tw-crown-sm" title="Rekordchi">👑</span>` : ""}${own ? ` <button class="tw-name-edit" id="tw-name-edit" title="Foydalanuvchi nomini o'zgartirish" data-name="${esc(name)}"><i class="bi bi-pencil-fill"></i></button>` : ""}
                        </h1>
                        <div class="tw-profile-meta">
                            <span><i class="bi bi-geo-alt-fill"></i> ${esc(p.region || "—")}</span>
                            <span><i class="bi bi-graph-up-arrow"></i> ELO ${p.elo}</span>
                            <span><i class="bi bi-calendar3"></i> ${fmtDate(p.joinedAt)} dan beri</span>
                        </div>
                    </div>
                    ${headerActions}
                </div>
            </div>

            <div class="tw-stat-grid">${statCards}</div>

            <div class="tw-profile-cols">
                <section class="tw-profile-panel">
                    <h3 class="tw-panel-title"><i class="bi bi-trophy-fill"></i> Shaxsiy rekordlar</h3>
                    <div class="tw-pb-table">
                        <div class="tw-pb-row tw-pb-head">
                            <span>Rejim</span><span>WPM</span><span>Aniqlik</span><span>Sana</span>
                        </div>
                        ${pbRows}
                    </div>
                </section>
                <section class="tw-profile-panel">
                    <h3 class="tw-panel-title"><i class="bi bi-clock-history"></i> So'nggi natijalar</h3>
                    <ul class="tw-recent-list">${recent}</ul>
                </section>
            </div>`;

        bindShare();
        if (own) bindRename();
    }

    const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

    // /Profile — foydalanuvchi nomini joyida (inline) o'zgartirish + jonli band tekshiruvi.
    function bindRename() {
        const editBtn = document.getElementById("tw-name-edit");
        if (!editBtn) return;
        const h1 = editBtn.closest(".tw-profile-name");
        const currentName = editBtn.dataset.name;

        editBtn.addEventListener("click", () => openEditor(h1, currentName));
    }

    function openEditor(h1, currentName) {
        if (document.getElementById("tw-name-form")) return; // allaqachon ochiq
        const original = h1.innerHTML;

        h1.innerHTML = `
            <form class="tw-name-form" id="tw-name-form" autocomplete="off">
                <div class="tw-name-input-wrap">
                    <span class="tw-name-at">@</span>
                    <input type="text" id="tw-name-input" class="tw-name-input" maxlength="32"
                        value="${esc(currentName)}" spellcheck="false" />
                    <span class="tw-name-state" id="tw-name-state"></span>
                </div>
                <div class="tw-name-actions">
                    <button type="submit" class="tw-rbtn tw-rbtn--sm tw-rbtn--gold" id="tw-name-save">Saqlash</button>
                    <button type="button" class="tw-rbtn tw-rbtn--sm tw-rbtn--outline" id="tw-name-cancel">Bekor</button>
                </div>
                <div class="tw-name-help" id="tw-name-help">Faqat harf, raqam va _ (3–32 belgi).</div>
            </form>`;

        const form = document.getElementById("tw-name-form");
        const input = document.getElementById("tw-name-input");
        const stateEl = document.getElementById("tw-name-state");
        const helpEl = document.getElementById("tw-name-help");
        const saveBtn = document.getElementById("tw-name-save");

        let checkTimer = null, lastChecked = "", available = true;

        const setState = (cls, txt) => { stateEl.className = "tw-name-state tw-name-state--" + cls; stateEl.textContent = txt; };
        const setHelp = (cls, txt) => { helpEl.className = "tw-name-help" + (cls ? " tw-name-help--" + cls : ""); helpEl.textContent = txt; };

        function validateLocal() {
            const v = input.value.trim();
            if (v === currentName) { setState("none", ""); setHelp("", "Joriy nomingiz."); return true; }
            if (!v) { setState("none", ""); setHelp("", "Faqat harf, raqam va _ (3–32 belgi)."); return false; }
            if (!USERNAME_RE.test(v)) { setState("bad", "✗"); setHelp("bad", "Faqat harf, raqam va _ (3–32 belgi)."); return false; }
            setHelp("", "Nom takrorlanmas (unique) bo'lishi kerak.");
            return true;
        }

        async function checkAvailability() {
            const v = input.value.trim();
            if (v === currentName) { available = true; return; }
            if (!validateLocal()) { available = false; return; }
            if (v === lastChecked) return;
            lastChecked = v;
            setState("checking", "…");
            try {
                const r = await fetch("/api/auth/username-available?username=" + encodeURIComponent(v), { credentials: "same-origin" });
                const data = await r.json();
                if (input.value.trim() !== v) return; // input o'zgargan bo'lsa — e'tiborsiz
                available = !!data.available;
                if (available) { setState("ok", "✓"); setHelp("", "Bo'sh — ishlatish mumkin."); }
                else { setState("bad", "band"); setHelp("bad", "Bu foydalanuvchi nomi band."); }
            } catch {
                setState("none", "");
                available = true; // tarmoq xatosi — serverda baribir tekshiriladi
            }
        }

        input.addEventListener("input", () => {
            validateLocal();
            clearTimeout(checkTimer);
            checkTimer = setTimeout(checkAvailability, 350);
        });

        const close = () => { h1.innerHTML = original; bindRename(); };
        document.getElementById("tw-name-cancel").addEventListener("click", close);
        input.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

        form.addEventListener("submit", async e => {
            e.preventDefault();
            const username = input.value.trim();
            if (username === currentName) { close(); return; }
            if (!USERNAME_RE.test(username)) { setHelp("bad", "Foydalanuvchi nomi noto'g'ri (3–32 belgi, harf/raqam/_)."); return; }
            if (!available) { setHelp("bad", "Bu foydalanuvchi nomi band."); return; }

            saveBtn.disabled = true;
            saveBtn.textContent = "…";
            try {
                const r = await fetch("/api/auth/rename-username", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username })
                });
                if (r.ok) {
                    toast("Foydalanuvchi nomi o'zgartirildi.");
                    load(); // profilni qayta yuklab, nav cookie ham yangilangan holda ko'rsatamiz
                } else {
                    const body = await r.json().catch(() => ({}));
                    setHelp("bad", body.error || "Saqlashda xatolik.");
                    setState("bad", "✗");
                    saveBtn.disabled = false;
                    saveBtn.textContent = "Saqlash";
                }
            } catch {
                setHelp("bad", "Tarmoq xatosi.");
                saveBtn.disabled = false;
                saveBtn.textContent = "Saqlash";
            }
        });

        input.focus();
        input.select();
    }

    function bindShare() {
        const btn = document.getElementById("tw-share-btn");
        if (!btn) return;
        btn.addEventListener("click", async () => {
            const url = btn.dataset.url;
            try {
                if (navigator.share && !own) { await navigator.share({ title: "TypingWar profil", url }); return; }
                await navigator.clipboard.writeText(url);
                toast("Havola nusxalandi: " + url);
            } catch {
                // clipboard ishlamasa — prompt
                window.prompt("Profil havolasi:", url);
            }
        });
    }

    function toast(msg) {
        let t = document.getElementById("tw-toast");
        if (!t) {
            t = document.createElement("div");
            t.id = "tw-toast";
            t.className = "tw-toast";
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add("tw-toast--show");
        clearTimeout(toast._t);
        toast._t = setTimeout(() => t.classList.remove("tw-toast--show"), 2600);
    }

    load();
})();

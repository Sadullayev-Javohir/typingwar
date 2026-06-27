/* TypingWar — profil (shaxsiy /Profile va ommaviy /share/{username}) */
(function () {
    "use strict";

    const root = document.getElementById("tw-profile-root");
    if (!root) return;

    const endpoint = root.dataset.endpoint;
    const own = root.dataset.own === "true";

    const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const TIME = { Ten: "10s", Fifteen: "15s", Thirty: "30s", Sixty: "60s", OneTwenty: "120s" };
    const ORDER = ["Ten", "Fifteen", "Thirty", "Sixty", "OneTwenty"];
    const tm = k => TIME[k] || k;

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
        const pbs = (p.personalBests || []).slice().sort((a, b) => ORDER.indexOf(a.timeMode) - ORDER.indexOf(b.timeMode));
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

        // 5 rejim bo'yicha PB jadvali (yo'q rejim — bo'sh)
        const pbMap = {};
        for (const b of pbs) pbMap[b.timeMode] = b;
        const pbRows = ORDER.map(mode => {
            const b = pbMap[mode];
            const isTop = bestPb && b && b.timeMode === bestPb.timeMode && b.bestWpm === bestPb.bestWpm;
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
        }).join("");

        const recent = (p.recent || []).map(r => `
            <li class="tw-recent-row">
                <span class="tw-recent-mode">${tm(r.timeMode)}</span>
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
                        <h1 class="tw-profile-name">${esc(name)}${bestPb ? ` <span class="tw-crown-sm" title="Rekordchi">👑</span>` : ""}</h1>
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

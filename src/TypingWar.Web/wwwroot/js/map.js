/* TypingWar — O'zbekiston typing xaritasi (heat map + jonli reyting, yozish maydonisiz) */
(function () {
    "use strict";

    const root = document.getElementById("tw-map");
    if (!root) return;

    const $ = id => document.getElementById(id);
    const detailEl = $("tw-region-detail"), errEl = $("tw-map-err"),
        labelsEl = $("tw-region-labels"), rankEl = $("tw-rank-list");
    const SVGNS = "http://www.w3.org/2000/svg";
    const esc = s => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

    // Hudud yorliqlari (markaz koordinatalari + qisqa nom). big=true → WPM ham xaritada ko'rsatiladi.
    const LABELS = {
        KARAKALPAKSTAN: { x: 205, y: 158, t: "Qoraqalpog'iston", big: true },
        NAVOI: { x: 498, y: 232, t: "Navoiy", big: true },
        BUKHARA: { x: 350, y: 422, t: "Buxoro", big: true },
        KASHKADARYA: { x: 560, y: 466, t: "Qashqadaryo", big: true },
        SAMARKAND: { x: 545, y: 372, t: "Samarqand", big: true },
        TASHKENT_REGION: { x: 793, y: 162, t: "Toshkent vil.", big: true },
        KHOREZM: { x: 212, y: 333, t: "Xorazm", big: false },
        JIZZAKH: { x: 650, y: 250, t: "Jizzax", big: false },
        SYRDARYA: { x: 731, y: 250, t: "Sirdaryo", big: false },
        TASHKENT_CITY: { x: 803, y: 208, t: "Toshkent sh.", big: false },
        NAMANGAN: { x: 921, y: 180, t: "Namangan", big: false },
        ANDIJAN: { x: 950, y: 263, t: "Andijon", big: false },
        FERGANA: { x: 862, y: 290, t: "Farg'ona", big: false },
        SURKHANDARYA: { x: 678, y: 516, t: "Surxondaryo", big: false }
    };

    const stats = new Map();   // code -> {code,name,bestWpm,avgWpm,playerCount}
    let maxBest = 0, selected = null;

    // Sovuq (sekin) → issiq (tez): ko'k → ko'kimtir → yashil → sariq → to'q sariq → qizil
    function colorFor(wpm) {
        if (!wpm || wpm <= 0) return "#191c28";
        const t = maxBest > 0 ? Math.min(1, Math.max(0, wpm / maxBest)) : 0;
        const hue = 212 - t * 202;          // 212 (ko'k) → 10 (qizil)
        const sat = 58 + t * 34;            // to'yinganlik oshadi
        const light = 40 + t * 13;
        return `hsl(${hue} ${sat}% ${light}%)`;
    }

    function shapeOf(g) { return g.querySelector("path, circle, polygon"); }

    function paint() {
        document.querySelectorAll(".tw-region").forEach(g => {
            const s = stats.get(g.dataset.region);
            const el = shapeOf(g);
            const wpm = s ? s.bestWpm : 0;
            if (el) {
                el.setAttribute("fill", colorFor(wpm));
                el.style.setProperty("--reg-color", colorFor(wpm || 1));
            }
            g.classList.toggle("tw-reg-active", wpm > 0);
            g.classList.toggle("tw-reg-leader", wpm > 0 && wpm === maxBest);
        });
    }

    function renderLabels() {
        labelsEl.innerHTML = "";
        Object.keys(LABELS).forEach(code => {
            const L = LABELS[code], s = stats.get(code);
            const grp = document.createElementNS(SVGNS, "g");
            grp.setAttribute("class", "tw-reg-label");
            grp.dataset.region = code;

            const name = document.createElementNS(SVGNS, "text");
            name.setAttribute("x", L.x);
            name.setAttribute("y", L.y);
            name.setAttribute("class", "tw-lbl-name");
            name.textContent = L.t;
            grp.appendChild(name);

            if (L.big && s && s.bestWpm > 0) {
                const v = document.createElementNS(SVGNS, "text");
                v.setAttribute("x", L.x);
                v.setAttribute("y", L.y + 19);
                v.setAttribute("class", "tw-lbl-wpm");
                v.textContent = Math.round(s.bestWpm) + " wpm";
                grp.appendChild(v);
            }
            labelsEl.appendChild(grp);
        });
    }

    function showDetail(code) {
        selected = code;
        document.querySelectorAll(".tw-region").forEach(g =>
            g.classList.toggle("tw-reg-sel", g.dataset.region === code));
        document.querySelectorAll(".tw-rank-row").forEach(r =>
            r.classList.toggle("tw-rank-sel", r.dataset.region === code));

        const s = stats.get(code);
        const name = s ? s.name : (LABELS[code] ? LABELS[code].t : code);
        detailEl.classList.remove("tw-detail-empty");

        if (!s || s.playerCount <= 0) {
            detailEl.innerHTML =
                `<div class="tw-detail-top"><span class="tw-detail-dot" style="background:#2a2f40"></span>
                    <h4>${esc(name)}</h4></div>
                 <p class="tw-detail-none">Hali natija yo'q. Birinchi bo'lib 30s testni yozing!</p>`;
            return;
        }
        detailEl.innerHTML =
            `<div class="tw-detail-top"><span class="tw-detail-dot" style="background:${colorFor(s.bestWpm)}"></span>
                <h4>${esc(name)}</h4></div>
             <div class="tw-detail-best">${Math.round(s.bestWpm)}<small>wpm · eng tez</small></div>
             <div class="tw-detail-grid">
                <div class="tw-detail-cell"><span class="tw-detail-num">${s.playerCount}</span><span class="tw-detail-cap">ishtirokchi</span></div>
                <div class="tw-detail-cell"><span class="tw-detail-num">${Math.round(s.avgWpm)}</span><span class="tw-detail-cap">o'rtacha wpm</span></div>
             </div>`;
    }

    function renderRank() {
        const all = Array.from(stats.values());
        all.sort((a, b) => (b.bestWpm - a.bestWpm) || (b.playerCount - a.playerCount) || a.name.localeCompare(b.name));
        rankEl.innerHTML = all.map((s, i) => {
            const has = s.playerCount > 0;
            const pct = has && maxBest > 0 ? Math.max(6, Math.round((s.bestWpm / maxBest) * 100)) : 0;
            const col = colorFor(s.bestWpm);
            return `<div class="tw-rank-row${i === 0 && has ? " tw-rank-top" : ""}${s.code === selected ? " tw-rank-sel" : ""}" data-region="${s.code}">
                <span class="tw-rank-no">${i + 1}</span>
                <span class="tw-rank-dot" style="background:${has ? col : "#2a2f40"}"></span>
                <span class="tw-rank-name">${esc(s.name)}</span>
                <span class="tw-rank-bar"><i style="width:${pct}%;background:${col}"></i></span>
                <span class="tw-rank-wpm">${has ? Math.round(s.bestWpm) : "—"}</span>
                <span class="tw-rank-meta">${has ? "o'rt " + Math.round(s.avgWpm) + " · " + s.playerCount + " kishi" : "natija yo'q"}</span>
            </div>`;
        }).join("");
        rankEl.querySelectorAll(".tw-rank-row").forEach(r =>
            r.addEventListener("click", () => showDetail(r.dataset.region)));
    }

    function renderAll() { paint(); renderLabels(); renderRank(); if (selected) showDetail(selected); }

    function flash(code) {
        const g = document.querySelector(`.tw-region[data-region="${code}"]`);
        if (g) { g.classList.remove("tw-reg-flash"); void g.offsetWidth; g.classList.add("tw-reg-flash"); }
    }

    async function load() {
        try {
            const r = await fetch("/api/regions", { credentials: "same-origin" });
            if (!r.ok) { errEl.textContent = "Xarita yuklanmadi."; return; }
            const data = await r.json();
            stats.clear();
            data.regions.forEach(s => stats.set(s.code, s));
            maxBest = data.maxBestWpm || 0;
            renderAll();
        } catch { errEl.textContent = "Tarmoq xatosi."; }
    }

    // Hudud bosish (shakl yoki yorliq)
    document.querySelectorAll(".tw-region").forEach(g =>
        g.addEventListener("click", () => showDetail(g.dataset.region)));
    labelsEl.addEventListener("click", e => {
        const grp = e.target.closest(".tw-reg-label");
        if (grp) showDetail(grp.dataset.region);
    });

    // Jonli yangilanish (kimdir 30s testni tugatganda)
    if (window.signalR) {
        const conn = new signalR.HubConnectionBuilder()
            .withUrl("/hubs/uzmap").withAutomaticReconnect().build();
        conn.on("RegionUpdated", s => {
            stats.set(s.code, s);
            maxBest = Math.max(0, ...Array.from(stats.values()).map(x => x.bestWpm || 0));
            renderAll();
            flash(s.code);
        });
        conn.start().then(() => conn.invoke("JoinMap")).catch(() => { });
    }

    load();
})();

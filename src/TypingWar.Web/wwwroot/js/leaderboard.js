/* TypingWar — leaderboard: tablar + podium (top 3) + top 50 + joriy foydalanuvchi qatori */
(function () {
    "use strict";

    const podium = document.getElementById("tw-lb-podium");
    const list = document.getElementById("tw-lb-list");
    const tabs = document.querySelectorAll(".tw-tab");
    let mode = "Thirty";

    // Hudud kodi → o'qiladigan nom (CLAUDE.md §7)
    const REGIONS = {
        TASHKENT_CITY: "Toshkent sh.", TASHKENT_REGION: "Toshkent vil.",
        ANDIJAN: "Andijon", FERGANA: "Farg'ona", NAMANGAN: "Namangan",
        SAMARKAND: "Samarqand", BUKHARA: "Buxoro", NAVOI: "Navoiy",
        KASHKADARYA: "Qashqadaryo", SURKHANDARYA: "Surxondaryo",
        JIZZAKH: "Jizzax", SYRDARYA: "Sirdaryo", KHOREZM: "Xorazm",
        KARAKALPAKSTAN: "Qoraqalpog'iston"
    };

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function regionName(code) {
        return code && REGIONS[code] ? REGIONS[code] : "—";
    }

    function initials(name) {
        const n = String(name || "?").trim();
        return n ? n.charAt(0).toUpperCase() : "?";
    }

    function avatar(e, size) {
        if (e.avatarUrl) {
            return `<img class="tw-av" style="width:${size}px;height:${size}px" src="${esc(e.avatarUrl)}" alt="">`;
        }
        return `<span class="tw-av tw-av-i" style="width:${size}px;height:${size}px">${esc(initials(e.username))}</span>`;
    }

    // Top 3 — vizual podium kartochkalari (tartib: 2 · 1 · 3)
    function renderPodium(top) {
        const slots = [top[1], top[0], top[2]];          // chap·markaz·o'ng
        const places = ["second", "first", "third"];
        const icons = ["bi-award-fill", "bi-trophy-fill", "bi-award"];
        podium.innerHTML = slots.map((e, i) => {
            if (!e) return `<div class="tw-pod tw-pod-empty tw-pod-${places[i]}"></div>`;
            const me = e.isCurrentUser ? " tw-me" : "";
            return `<div class="tw-pod tw-pod-${places[i]}${me}">
                <div class="tw-pod-rank"><i class="bi ${icons[i]}"></i><span>${e.rank}</span></div>
                ${avatar(e, places[i] === "first" ? 64 : 52)}
                <div class="tw-pod-name" title="${esc(e.username)}">${esc(e.username)}</div>
                <div class="tw-pod-region"><i class="bi bi-geo-alt-fill"></i>${esc(regionName(e.regionCode))}</div>
                <div class="tw-pod-wpm">${Math.round(e.wpm)}<small>wpm</small></div>
                <div class="tw-pod-acc"><i class="bi bi-bullseye"></i>${e.accuracy.toFixed(1)}%</div>
            </div>`;
        }).join("");
    }

    // 4-o'rindan keyingi qatorlar (ro'yxat)
    function row(e) {
        const me = e.isCurrentUser ? " tw-me" : "";
        return `<div class="tw-lb-row${me}">
            <span class="c-rank">${e.rank}</span>
            <span class="c-user">${avatar(e, 32)}<span class="tw-uname">${esc(e.username)}${e.isCurrentUser ? ' <i class="bi bi-star-fill tw-you"></i>' : ""}</span></span>
            <span class="c-region">${esc(regionName(e.regionCode))}</span>
            <span class="c-acc">${e.accuracy.toFixed(1)}%</span>
            <span class="c-wpm">${Math.round(e.wpm)}</span>
        </div>`;
    }

    function separator() {
        return `<div class="tw-lb-sep"><i class="bi bi-three-dots"></i></div>`;
    }

    async function load() {
        podium.innerHTML = "";
        list.innerHTML = `<div class="tw-lb-loading"><i class="bi bi-arrow-repeat tw-spin"></i> Yuklanmoqda…</div>`;
        try {
            const r = await fetch(`/api/leaderboard?timeMode=${mode}`, { credentials: "same-origin" });
            const dto = await r.json();

            if (!dto.top || dto.top.length === 0) {
                podium.innerHTML = "";
                list.innerHTML = `<div class="tw-lb-empty">
                    <i class="bi bi-emoji-smile"></i>
                    <p>Hali natijalar yo'q. Birinchi bo'ling!</p></div>`;
                return;
            }

            renderPodium(dto.top.slice(0, 3));

            let html = dto.top.slice(3).map(row).join("");
            // Joriy foydalanuvchi top 50 da bo'lmasa — ajratuvchi + faqat uning qatori
            if (dto.currentUser && !dto.currentUserInTop) {
                html += separator() + row(dto.currentUser);
            }
            list.innerHTML = html || "";
        } catch (e) {
            podium.innerHTML = "";
            list.innerHTML = `<div class="tw-lb-empty tw-lb-err">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <p>Yuklashda xatolik.</p></div>`;
        }
    }

    tabs.forEach(t => t.addEventListener("click", () => {
        tabs.forEach(x => x.classList.remove("tw-active"));
        t.classList.add("tw-active");
        mode = t.dataset.mode;
        load();
    }));

    load();
})();

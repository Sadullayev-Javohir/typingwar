/* TypingWar — xona yaratish (poyga sozlamalari bilan) / qo'shilish */
(function () {
    "use strict";

    const createBtn = document.getElementById("tw-create");
    const createErr = document.getElementById("tw-create-err");
    const joinForm = document.getElementById("tw-join");
    const configEl = document.getElementById("tw-room-config");

    const S = window.TWSettings;

    // ── Poyga sozlamalari (host tanlaydi) — global Practice sozlamalaridan boshlanadi ──
    const cfg = {
        language: (S && S.get("language")) || "Uzbek",
        textMode: (S && S.get("textMode")) || "Sentences",
        wordCount: (S && S.get("wordCount")) || 25,
        quoteLength: (S && S.get("quoteLength")) || "all"
    };

    function num(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }

    function refreshConfig() {
        if (!configEl) return;
        const uzbek = cfg.language === "Uzbek";

        // O'zbek tilida "kod" rejimi yo'q — tugmani yashiramiz va kerak bo'lsa "so'z"ga qaytamiz
        const codeBtn = configEl.querySelector('.tw-opt[data-key="textMode"][data-value="Code"]');
        if (codeBtn) codeBtn.style.display = uzbek ? "none" : "";
        if (uzbek && cfg.textMode === "Code") cfg.textMode = "Words";

        // Aktiv tugmalarni belgilash
        configEl.querySelectorAll(".tw-opt").forEach(btn => {
            const key = btn.dataset.key;
            const val = btn.dataset.value;
            const cur = cfg[key];
            const active = typeof cur === "number" ? (num(val, NaN) === cur) : (String(cur) === val);
            btn.classList.toggle("tw-active", active);
        });

        // Iqtibos rejimida "So'z soni" o'rniga "Uzunlik" ko'rinadi
        const quote = cfg.textMode === "Sentences";
        const quoteGroup = configEl.querySelector('.tw-config-group[data-group="quote"]');
        const countGroup = configEl.querySelector('.tw-config-group[data-group="count"]');
        if (quoteGroup) quoteGroup.style.display = quote ? "" : "none";
        if (countGroup) countGroup.style.display = quote ? "none" : "";
    }

    if (configEl) {
        configEl.querySelectorAll(".tw-opt").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const key = btn.dataset.key;
                const val = btn.dataset.value;
                cfg[key] = (key === "wordCount") ? num(val, 25) : val;
                refreshConfig();
            });
        });
        refreshConfig();
    }

    if (createBtn) {
        createBtn.addEventListener("click", async () => {
            createErr.textContent = "";
            createBtn.disabled = true;
            try {
                const r = await fetch("/api/rooms", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cfg)
                });
                if (r.status === 401) {
                    window.location.href = "/Login";
                    return;
                }
                if (r.ok) {
                    const dto = await r.json();
                    window.location.href = "/Room?code=" + encodeURIComponent(dto.code);
                } else {
                    const b = await r.json().catch(() => ({}));
                    createErr.textContent = b.error || "Xatolik.";
                    createBtn.disabled = false;
                }
            } catch (e) {
                createErr.textContent = "Tarmoq xatosi.";
                createBtn.disabled = false;
            }
        });
    }

    if (joinForm) {
        // Kod faqat 4 ta raqamdan iborat — boshqa belgilarni kiritishga yo'l qo'ymaymiz
        joinForm.code.addEventListener("input", () => {
            joinForm.code.value = joinForm.code.value.replace(/\D/g, "").slice(0, 4);
        });
        joinForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const code = joinForm.code.value.replace(/\D/g, "");
            if (code.length === 4) window.location.href = "/Room?code=" + encodeURIComponent(code);
        });
    }
})();

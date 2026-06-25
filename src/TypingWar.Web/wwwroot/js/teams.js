/* TypingWar — jamoaviy musobaqa yaratish (poyga sozlamalari bilan) / qo'shilish */
(function () {
    "use strict";

    const createBtn = document.getElementById("tw-tcreate");
    const createErr = document.getElementById("tw-tcreate-err");
    const joinForm = document.getElementById("tw-tjoin");
    const configEl = document.getElementById("tw-team-config");

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

        // O'zbek tilida "kod" rejimi yo'q — tugmani yashiramiz
        const codeBtn = configEl.querySelector('.tw-opt[data-key="textMode"][data-value="Code"]');
        if (codeBtn) codeBtn.style.display = uzbek ? "none" : "";
        if (uzbek && cfg.textMode === "Code") cfg.textMode = "Words";

        configEl.querySelectorAll(".tw-opt").forEach(btn => {
            const key = btn.dataset.key, val = btn.dataset.value, cur = cfg[key];
            const active = typeof cur === "number" ? (num(val, NaN) === cur) : (String(cur) === val);
            btn.classList.toggle("tw-active", active);
        });

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
                const key = btn.dataset.key, val = btn.dataset.value;
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
                const r = await fetch("/api/teamraces", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cfg)
                });
                if (r.status === 401) { window.location.href = "/Login"; return; }
                if (r.ok) {
                    const dto = await r.json();
                    window.location.href = "/Team?code=" + encodeURIComponent(dto.code) + "&side=A";
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
        joinForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const code = joinForm.code.value.trim().toUpperCase();
            const side = joinForm.side.value;
            if (code.length === 8)
                window.location.href = "/Team?code=" + encodeURIComponent(code) + "&side=" + side;
        });
    }
})();

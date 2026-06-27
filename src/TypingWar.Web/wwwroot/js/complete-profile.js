/* TypingWar — Google'dan keyin profilni to'ldirish (username + hudud) */
(function () {
    "use strict";

    const root = document.getElementById("tw-cp");
    if (!root) return;

    const form = document.getElementById("tw-cp-form");
    const userEl = document.getElementById("tw-cp-username");
    const statusEl = document.getElementById("tw-cp-status");
    const helpEl = document.getElementById("tw-cp-help");
    const regionEl = document.getElementById("tw-cp-region");
    const errEl = document.getElementById("tw-cp-err");
    const btn = document.getElementById("tw-cp-submit");

    const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
    let checkTimer = null;
    let lastChecked = "";
    let available = false;

    function setStatus(state, text) {
        statusEl.className = "tw-cp-status tw-cp-status--" + state;
        statusEl.textContent = text;
    }

    function validateLocal() {
        const v = userEl.value.trim();
        if (!v) { setStatus("none", ""); return false; }
        if (!USERNAME_RE.test(v)) {
            setStatus("bad", "✗");
            helpEl.textContent = "Faqat harf, raqam va _ (3–32 belgi).";
            return false;
        }
        helpEl.textContent = "Faqat harf, raqam va _ . Nom takrorlanmas (unique) bo'lishi kerak.";
        return true;
    }

    async function checkAvailability() {
        const v = userEl.value.trim();
        if (!validateLocal()) { available = false; return; }
        if (v === lastChecked) return;
        lastChecked = v;
        setStatus("checking", "…");
        try {
            const r = await fetch("/api/auth/username-available?username=" + encodeURIComponent(v), { credentials: "same-origin" });
            const data = await r.json();
            // input shu orada o'zgargan bo'lsa — natijani e'tiborsiz qoldiramiz
            if (userEl.value.trim() !== v) return;
            available = !!data.available;
            if (available) setStatus("ok", "✓");
            else { setStatus("bad", "band"); }
        } catch {
            setStatus("none", "");
            available = true; // tarmoq xatosi bo'lsa serverda baribir tekshiriladi
        }
    }

    userEl.addEventListener("input", () => {
        validateLocal();
        clearTimeout(checkTimer);
        checkTimer = setTimeout(checkAvailability, 350);
    });

    // boshlang'ich taklif qilingan username ni tekshiramiz
    if (userEl.value.trim()) checkAvailability();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errEl.textContent = "";
        const username = userEl.value.trim();
        const regionCode = regionEl.value;

        if (!USERNAME_RE.test(username)) { errEl.textContent = "Foydalanuvchi nomi noto'g'ri (3–32 belgi, harf/raqam/_)."; return; }
        if (!regionCode) { errEl.textContent = "Hududingizni tanlang."; return; }

        btn.disabled = true;
        btn.textContent = "Saqlanmoqda…";
        try {
            const r = await fetch("/api/auth/complete-profile", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, regionCode })
            });
            if (r.ok) {
                window.location.href = "/Profile";
            } else {
                const body = await r.json().catch(() => ({}));
                errEl.textContent = body.error || "Saqlashda xatolik.";
                btn.disabled = false;
                btn.textContent = "Profilni saqlash va boshlash";
            }
        } catch {
            errEl.textContent = "Tarmoq xatosi.";
            btn.disabled = false;
            btn.textContent = "Profilni saqlash va boshlash";
        }
    });
})();

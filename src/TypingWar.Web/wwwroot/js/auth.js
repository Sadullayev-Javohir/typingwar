/* TypingWar — auth formalari (login/register) va chiqish */
(function () {
    "use strict";

    const form = document.getElementById("tw-auth-form");
    if (form) {
        const errEl = form.querySelector(".tw-auth-err");
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            errEl.textContent = "";
            const btn = form.querySelector("button[type=submit]");
            btn.disabled = true;

            const data = {};
            new FormData(form).forEach((v, k) => { data[k] = v === "" ? null : v; });

            try {
                const r = await fetch(form.dataset.endpoint, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });
                if (r.ok) {
                    // sozlamalarni serverga sinxronlash uchun bir oz kutamiz, so'ng o'tamiz
                    window.location.href = "/Practice";
                } else {
                    const body = await r.json().catch(() => ({}));
                    errEl.textContent = body.error || "Xatolik yuz berdi.";
                    btn.disabled = false;
                }
            } catch (ex) {
                errEl.textContent = "Tarmoq xatosi.";
                btn.disabled = false;
            }
        });
    }
})();

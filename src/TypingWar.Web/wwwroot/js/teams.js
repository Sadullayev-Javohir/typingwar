/* TypingWar — jamoaviy musobaqa yaratish / qo'shilish */
(function () {
    "use strict";

    const createBtn = document.getElementById("tw-tcreate");
    const createErr = document.getElementById("tw-tcreate-err");
    const joinForm = document.getElementById("tw-tjoin");

    if (createBtn) {
        createBtn.addEventListener("click", async () => {
            createErr.textContent = "";
            createBtn.disabled = true;
            try {
                const r = await fetch("/api/teamraces", { method: "POST", credentials: "same-origin" });
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

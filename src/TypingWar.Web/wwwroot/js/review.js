/* TypingWar — takroriy mashq (drill) */
(function () {
    "use strict";

    const root = document.getElementById("tw-review");
    if (!root || root.dataset.authenticated !== "true") return;

    const $ = id => document.getElementById(id);
    const wordsEl = $("tw-rv-words"), liveEl = $("tw-rv-live"), focusEl = $("tw-rv-focus"), errEl = $("tw-rv-err");
    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

    let chars = [], pos = 0, correct = 0, startTime = null, finished = false;

    function begin(text) {
        chars = Array.from(text || ""); pos = 0; correct = 0; startTime = null; finished = false;
        liveEl.textContent = "0 wpm";
        wordsEl.innerHTML = chars.map(c => `<span class="tw-letter">${esc(c)}</span>`).join("");
        wordsEl.focus();
    }
    const letterEls = () => wordsEl.querySelectorAll(".tw-letter");
    const elapsed = () => startTime === null ? 0 : (performance.now() - startTime) / 1000;
    const wpmNow = () => { const e = elapsed(); return e > 0 ? (correct / 5) / (e / 60) : 0; };

    wordsEl.addEventListener("click", () => wordsEl.focus());
    wordsEl.addEventListener("keydown", ev => {
        if (window.TWCaps) window.TWCaps.check(ev);
        if (finished || chars.length === 0) return;
        if (ev.key === "Backspace") {
            ev.preventDefault();
            if (pos > 0) { pos--; letterEls()[pos].classList.remove("tw-correct", "tw-incorrect"); }
            return;
        }
        if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        ev.preventDefault();
        if (pos >= chars.length) return;
        if (startTime === null) startTime = performance.now();
        const ok = ev.key === chars[pos];
        const el = letterEls()[pos];
        if (ok) { el.classList.add("tw-correct"); correct++; } else el.classList.add("tw-incorrect");
        if (window.TWSound) window.TWSound.play(window.TWSettings?.get("soundOnClick"), ok);
        pos++;
        liveEl.textContent = Math.round(wpmNow()) + " wpm";
        if (pos >= chars.length) finished = true;
    });

    async function load() {
        errEl.textContent = "";
        try {
            const r = await fetch("/api/review/text", { credentials: "same-origin" });
            if (!r.ok) { errEl.textContent = "Mashq yuklanmadi."; return; }
            const dto = await r.json();
            focusEl.innerHTML = dto.fromFingerprint && dto.focusKeys.length
                ? "Fokus: " + dto.focusKeys.map(k => `<span class="tw-badge">${esc(k)}</span>`).join(" ")
                : `<span class="text-secondary small">Umumiy mashq — pasport to'planganda fokuslanadi.</span>`;
            begin(dto.text);
        } catch { errEl.textContent = "Tarmoq xatosi."; }
    }

    $("tw-rv-new").addEventListener("click", load);
    load();
})();

/* TypingWar — Yozish Pasporti (keystroke timing + heat map) */
(function () {
    "use strict";

    const root = document.getElementById("tw-fp");
    if (!root || root.dataset.authenticated !== "true") return;

    const $ = id => document.getElementById(id);
    const sampleEl = $("tw-fp-sample"), saveBtn = $("tw-fp-save"), savedEl = $("tw-fp-saved"),
        kbEl = $("tw-keyboard"), slowKeysEl = $("tw-slow-keys"), slowBigramsEl = $("tw-slow-bigrams"),
        metaEl = $("tw-fp-meta"), errEl = $("tw-fp-err");

    const esc = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

    const ROWS = [
        "q w e r t y u i o p".split(" "),
        "a s d f g h j k l".split(" "),
        "z x c v b n m".split(" ")
    ];

    let keyTimings = {};   // server profili: key -> ms
    let maxMs = 0;

    function colorForMs(ms) {
        if (!ms || ms <= 0) return "#23233a";
        const t = maxMs > 0 ? Math.min(1, ms / maxMs) : 0; // sekinroq = issiqroq (qizil)
        const r = Math.round(80 + t * 175);
        const g = Math.round(150 - t * 110);
        const b = Math.round(90 - t * 60);
        return `rgb(${r},${g},${b})`;
    }

    function renderKeyboard() {
        maxMs = Math.max(0, ...Object.values(keyTimings));
        kbEl.innerHTML = ROWS.map(row =>
            `<div class="tw-kb-row">` + row.map(k => {
                const ms = keyTimings[k] || 0;
                return `<span class="tw-key" style="background:${colorForMs(ms)}" title="${ms ? Math.round(ms) + ' ms' : "ma'lumot yo'q"}">${k}</span>`;
            }).join("") + `</div>`
        ).join("");
    }

    function renderSlow(el, items, unit) {
        el.innerHTML = (items && items.length)
            ? items.map(i => `<li><span>${esc(i.key)}</span><span class="tw-accent">${Math.round(i.ms)} ${unit}</span></li>`).join("")
            : `<li class="text-secondary">Hali ma'lumot yo'q.</li>`;
    }

    function render(fp) {
        keyTimings = fp.keyTimings || {};
        renderKeyboard();
        renderSlow(slowKeysEl, fp.slowKeys, "ms");
        renderSlow(slowBigramsEl, fp.slowBigrams, "ms");
        metaEl.textContent = fp.hasData
            ? `O'rtacha tezlik: ${Math.round(fp.avgWpm)} wpm · yangilangan: ${fp.updatedAt ? new Date(fp.updatedAt).toLocaleString() : "—"}`
            : "Hali pasport yo'q — namunani yozib boshlang.";
    }

    async function load() {
        try {
            const r = await fetch("/api/fingerprint", { credentials: "same-origin" });
            if (!r.ok) { errEl.textContent = "Pasport yuklanmadi."; return; }
            render(await r.json());
        } catch { errEl.textContent = "Tarmoq xatosi."; }
    }

    // ── Namuna matnni yozish + timing yig'ish ──
    const SAMPLE = "tez yozish uchun barmoqlar joyini bilish va muntazam mashq qilish juda muhim";
    let chars = [], pos = 0, lastTime = null, lastChar = null, started = false;
    const keySum = {}, keyCnt = {}, biSum = {}, biCnt = {};

    function beginSample() {
        chars = Array.from(SAMPLE); pos = 0; lastTime = null; lastChar = null;
        sampleEl.innerHTML = chars.map(c => `<span class="tw-letter">${esc(c)}</span>`).join("");
    }
    const letterEls = () => sampleEl.querySelectorAll(".tw-letter");

    sampleEl.addEventListener("click", () => sampleEl.focus());
    sampleEl.addEventListener("keydown", ev => {
        if (window.TWCaps) window.TWCaps.check(ev);
        if (chars.length === 0) return;
        if (ev.key === "Backspace") {
            ev.preventDefault();
            if (pos > 0) { pos--; letterEls()[pos].classList.remove("tw-correct", "tw-incorrect"); }
            return;
        }
        if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        ev.preventDefault();
        if (pos >= chars.length) return;

        const now = performance.now();
        const expected = chars[pos];
        const ok = ev.key === expected;
        const el = letterEls()[pos];
        if (ok) el.classList.add("tw-correct"); else el.classList.add("tw-incorrect");

        // tugmalararo vaqt (faqat to'g'ri, ketma-ket harflar uchun)
        const ch = ev.key.toLowerCase();
        if (lastTime !== null && ok) {
            const dt = now - lastTime;
            if (dt > 0 && dt < 2000) {
                keySum[ch] = (keySum[ch] || 0) + dt; keyCnt[ch] = (keyCnt[ch] || 0) + 1;
                if (lastChar && /[a-z']/.test(lastChar) && /[a-z']/.test(ch)) {
                    const bg = lastChar + ch;
                    biSum[bg] = (biSum[bg] || 0) + dt; biCnt[bg] = (biCnt[bg] || 0) + 1;
                }
            }
        }
        lastTime = now; lastChar = ch;
        pos++;
        started = true;
        saveBtn.disabled = Object.keys(keyCnt).length < 3;
        if (pos >= chars.length) saveBtn.disabled = Object.keys(keyCnt).length < 1;
    });

    function avgMap(sum, cnt) {
        const out = {};
        Object.keys(sum).forEach(k => { out[k] = sum[k] / cnt[k]; });
        return out;
    }

    saveBtn.addEventListener("click", async () => {
        if (!started) return;
        savedEl.textContent = "";
        const body = {
            keyTimings: avgMap(keySum, keyCnt),
            bigramTimings: avgMap(biSum, biCnt),
            avgWpm: 0
        };
        try {
            const r = await fetch("/api/fingerprint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(body)
            });
            if (!r.ok) { errEl.textContent = "Saqlanmadi."; return; }
            render(await r.json());
            savedEl.textContent = "✓ saqlandi";
            for (const k in keySum) delete keySum[k];
            for (const k in keyCnt) delete keyCnt[k];
            for (const k in biSum) delete biSum[k];
            for (const k in biCnt) delete biCnt[k];
            started = false; saveBtn.disabled = true;
            beginSample();
        } catch { errEl.textContent = "Tarmoq xatosi."; }
    });

    beginSample();
    load();
})();

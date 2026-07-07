/* TypingWar — ekran klaviaturasi (virtual keyboard).
   Keyingi bosiladigan tugmani yoritib, foydalanuvchiga qaysi klavishani bosishni
   ko'rsatib turadi. Ranglar tema (--tw-surface/--tw-gold) o'zgaruvchilaridan olinadi,
   shuning uchun tema/fon o'zgartirilganda klaviatura ham qayta bo'yaladi.
   Global API: window.TWKeyboard.{ mount, highlight, flash, clear, setVisible } */
(function () {
    "use strict";

    // Tugma qatorlari — har bir element keyId (harf/belgi) yoki maxsus tugma nomi
    const ROWS = [
        ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
        ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
        ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
        ["ShiftL", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "ShiftR"],
        ["Space"]
    ];

    // Maxsus tugmalar — ko'rinadigan yorliq va nisbiy kenglik (flex-grow birligi)
    const SPECIAL = {
        Backspace: { label: "⌫", w: 2.0 },
        Tab:       { label: "Tab", w: 1.5 },
        Caps:      { label: "Caps", w: 1.75 },
        Enter:     { label: "Enter", w: 1.9 },
        ShiftL:    { label: "Shift", w: 2.25 },
        ShiftR:    { label: "Shift", w: 2.25 },
        Space:     { label: "probel", w: 0 }   // probel alohida — eng keng
    };

    // Shift bilan kiritiladigan belgi → asosiy tugma (highlightda Shift ham yonadi)
    const SHIFT_MAP = {
        "~": "`", "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6",
        "&": "7", "*": "8", "(": "9", ")": "0", "_": "-", "+": "=",
        "{": "[", "}": "]", "|": "\\", ":": ";", "\"": "'", "<": ",", ">": ".", "?": "/"
    };

    // Tipografik belgilarni klaviatura ekvivalentiga keltiradi (engine bilan mos)
    function normChar(ch) {
        switch (ch) {
            case "‐": case "‑": case "‒": case "–":
            case "—": case "―": case "−": return "-";
            case "‘": case "’": case "ʻ": case "ʼ":
            case "´": case "`": return "'";
            case "“": case "”": case "«": case "»": return "\"";
            case " ": case " ": case " ": return " ";
            default: return ch;
        }
    }

    const keyEls = {};   // keyId (lowercase) -> <button> elementi
    let container = null;
    let active = [];     // hozir yoritilgan elementlar

    function buildKey(id) {
        const el = document.createElement("div");
        el.className = "tw-key";
        const sp = SPECIAL[id];
        if (sp) {
            el.classList.add("tw-key-wide", "tw-key-special");
            el.dataset.kid = id;
            if (id === "Space") el.classList.add("tw-key-space");
            else el.style.flexGrow = String(sp.w);
            el.textContent = sp.label;
        } else {
            el.dataset.kid = id;
            el.textContent = id === " " ? "" : id;
            keyEls[id] = el;
            // Home row barmoq tayanchi (f va j) — kichik chiziqcha
            if (id === "f" || id === "j") el.classList.add("tw-key-home");
        }
        return el;
    }

    function mount(target) {
        container = typeof target === "string" ? document.getElementById(target) : target;
        if (!container) return;
        container.innerHTML = "";
        container.classList.add("tw-keyboard");
        for (const row of ROWS) {
            const rowEl = document.createElement("div");
            rowEl.className = "tw-kb-row";
            for (const id of row) {
                const k = buildKey(id);
                if (id === "Space") { keyEls["Space"] = k; }
                rowEl.appendChild(k);
            }
            container.appendChild(rowEl);
        }
    }

    function clear() {
        for (const el of active) el.classList.remove("tw-key-next", "tw-key-next-mod");
        active = [];
    }

    // Keyingi yoziladigan belgini ko'rsatadi
    function highlight(ch) {
        clear();
        if (!container || ch == null) return;
        const c = normChar(ch);

        if (c === " ") {
            const sp = keyEls["Space"];
            if (sp) { sp.classList.add("tw-key-next"); active.push(sp); }
            return;
        }

        let base = c, shift = false;
        if (c.length === 1 && c >= "A" && c <= "Z") { base = c.toLowerCase(); shift = true; }
        else if (SHIFT_MAP[c]) { base = SHIFT_MAP[c]; shift = true; }
        else base = c.toLowerCase();

        const el = keyEls[base];
        if (el) { el.classList.add("tw-key-next"); active.push(el); }

        if (shift) {
            ["ShiftL", "ShiftR"].forEach(sid => {
                const sEl = container.querySelector('.tw-key[data-kid="' + sid + '"]');
                if (sEl) { sEl.classList.add("tw-key-next-mod"); active.push(sEl); }
            });
        }
    }

    // Bosilgan tugmaga qisqa vizual javob (to'g'ri/xato)
    function flash(ch, correct) {
        if (!container || ch == null) return;
        const c = normChar(ch);
        let base = c === " " ? "Space" : c;
        if (c.length === 1 && c >= "A" && c <= "Z") base = c.toLowerCase();
        else if (SHIFT_MAP[c]) base = SHIFT_MAP[c];
        else if (c !== " ") base = c.toLowerCase();
        const el = keyEls[base];
        if (!el) return;
        const cls = correct ? "tw-key-hit" : "tw-key-miss";
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 130);
    }

    function setVisible(on) {
        if (container) container.style.display = on ? "" : "none";
    }

    window.TWKeyboard = { mount, highlight, flash, clear, setVisible };
})();

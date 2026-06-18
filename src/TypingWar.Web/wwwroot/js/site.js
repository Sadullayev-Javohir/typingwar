// TypingWar — global utilities

// Cheetah runner helper: creates track HTML with animated cheetah SVG
window.TwCheetah = (function () {
    const COLORS = [
        'tw-cheetah-gold',   // 0 — foydalanuvchi
        'tw-cheetah-blue',   // 1
        'tw-cheetah-green',  // 2
        'tw-cheetah-purple', // 3
        'tw-cheetah-red',    // 4
        'tw-cheetah-cyan'    // 5
    ];

    function calcLeft(pct) {
        return 2 + Math.min(100, pct || 0) * 0.82;
    }

    function makeHtml(colorIdx, progress, runnerId) {
        const tpl = document.getElementById('tw-ch-tpl');
        const color = COLORS[colorIdx % COLORS.length] || 'tw-cheetah-gold';
        const left = calcLeft(progress || 0);

        if (tpl) {
            const tmp = document.createElement('div');
            tmp.appendChild(tpl.content.cloneNode(true));
            const run = tmp.querySelector('.tw-cheetah-run');
            if (run) {
                run.classList.add(color);
                if (runnerId) run.setAttribute('data-rid', runnerId);
                run.style.left = left + '%';
            }
            return `<div class="tw-track">${tmp.innerHTML}<span class="tw-track-finish">&#127937;</span></div>`;
        }
        // fallback — eski bar
        return `<div class="tw-bar"><div class="tw-bar-fill" style="width:${progress || 0}%"></div></div>`;
    }

    function setPos(el, pct) {
        if (el) el.style.left = calcLeft(pct) + '%';
    }

    // Yurish holati — faqat yozayotganda oyoqlar harakatlanadi (yozmasa turadi)
    function setRunning(el, on) {
        if (el) el.classList.toggle('tw-running', !!on);
    }

    // Yurish tezligi — WPM ga qarab gallop davomiyligi (tez yozsa = tez yuradi)
    function setSpeed(el, wpm) {
        if (!el) return;
        const w = Math.max(0, Math.min(150, wpm || 0));
        const dur = (0.70 - (w / 150) * 0.54).toFixed(3); // 0 wpm → .70s, 150 wpm → .16s
        el.style.setProperty('--tw-gallop-dur', dur + 's');
    }

    return { makeHtml, setPos, setRunning, setSpeed, calcLeft, COLORS };
})();

// Caps Lock ogohlantirishi — har typing sahifasida qayta ishlatiladi
window.TWCaps = (function () {
    let el = null;
    function ensure() {
        if (!el) {
            el = document.createElement('div');
            el.className = 'tw-caps-warn';
            el.innerHTML = '<i class="bi bi-capslock-fill"></i> Caps Lock yoniq';
            document.body.appendChild(el);
        }
        return el;
    }
    function show(on) { ensure().classList.toggle('tw-show', !!on); }
    // keydown hodisasidan Caps Lock holatini tekshiradi
    function check(ev) {
        if (ev && typeof ev.getModifierState === 'function') show(ev.getModifierState('CapsLock'));
    }
    return { check, hide: () => show(false) };
})();

// TypingWar — global utilities

// Umumiy rang palitrasi — bir xil colorIndex har doim bir xil rangni qaytaradi,
// va 100+ o'yinchi uchun ham farqli (ajralib turadigan) ranglar generatsiya qiladi.
// Muhim: bu rang SERVER tomonidan tayinlangan colorIndex ga bog'liq — shuning uchun
// bir xonadagi barcha foydalanuvchilarning oynalarida bir xil o'yinchi bir xil rangda ko'rinadi.
window.TWColors = (function () {
    function hslToHex(h, s, l) {
        h = ((h % 360) + 360) % 360;
        s /= 100; l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        const toHex = v => {
            const s = Math.round((v + m) * 255).toString(16);
            return s.length === 1 ? "0" + s : s;
        };
        return "#" + toHex(r) + toHex(g) + toHex(b);
    }

    // "Oltin nisbat" (golden ratio) bo'yicha aylana bo'ylab joylashtirish — qo'shni
    // indekslar ham bir-biridan ancha uzoq rangga ega bo'ladi (ajralib turishi uchun).
    const GOLDEN = 0.618033988749895;
    function colorFor(idx) {
        const i = (idx == null || idx < 0) ? 0 : (idx | 0);
        const hue = (i * GOLDEN * 360) % 360;
        const sat = 70 + (i % 2) * 8;          // 70 / 78 — to'yinganlik
        const light = 60 - ((i >> 1) % 2) * 6;  // 60 / 54 — yorug'lik (qorong'i fonda ko'rinishi)
        return hslToHex(hue, sat, light);
    }

    // Oldingi (cheklangan) ranglar — faqat TWColors yuklanmasa fallback uchun
    const LEGACY = ['#40d870', '#c060ff', '#ff5566', '#40d8e8', '#ff5599',
        '#ff9933', '#2dd4bf', '#8b5cf6', '#5aa0ff', '#40d8e8'];

    return { colorFor, hslToHex, LEGACY };
})();

// Cheetah runner helper: creates track HTML with animated cheetah SVG
window.TwCheetah = (function () {
    // Eski, cheklangan (10 ta) klass-ga asoslangan palitra — endi ishlatilmaydi,
    // lekin TWColors mavjud bo'lmasa fallback sifatida saqlanadi.
    const COLORS = [
        'tw-cheetah-green',   // 0
        'tw-cheetah-purple',  // 1
        'tw-cheetah-red',     // 2
        'tw-cheetah-cyan',    // 3
        'tw-cheetah-pink',    // 4
        'tw-cheetah-orange',  // 5
        'tw-cheetah-teal',    // 6
        'tw-cheetah-violet',  // 7
        'tw-cheetah-blue',    // 8
        'tw-cheetah-cyan'     // 9 (varag'i)
    ];

    function calcLeft(pct) {
        return 2 + Math.min(100, pct || 0) * 0.82;
    }

    // Rangni colorIndex orqali oladi (serverda barqaror tayinlanadi). Muhim: isMe
    // parametri endi rangga ta'sir qilmaydi — shuning uchun bir o'yinchi barcha
    // oynalarda bir xil rangda ko'rinadi (oldingi kabi "o'zim" har doim oltin emas).
    function colorForIdx(colorIdx) {
        if (window.TWColors) return window.TWColors.colorFor(colorIdx);
        return COLORS[colorIdx % COLORS.length] || 'tw-cheetah-blue';
    }

    function makeHtml(colorIdx, progress, runnerId, isMe) {
        const tpl = document.getElementById('tw-ch-tpl');
        const left = calcLeft(progress || 0);
        const useInline = !!window.TWColors;          // inline color barcha brauzerda bir xil
        const color = useInline ? colorForIdx(colorIdx) : colorForIdx(colorIdx);

        if (tpl) {
            const tmp = document.createElement('div');
            tmp.appendChild(tpl.content.cloneNode(true));
            const run = tmp.querySelector('.tw-cheetah-run');
            if (run) {
                if (useInline) {
                    run.style.color = color;           // SVG currentColor orqali bo'yaladi
                    run.classList.add('tw-cheetah-colored');
                } else {
                    run.classList.add(color);          // eski klass-based fallback
                }
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

    return { makeHtml, setPos, setRunning, setSpeed, calcLeft, colorForIdx, COLORS, ME_COLOR };
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

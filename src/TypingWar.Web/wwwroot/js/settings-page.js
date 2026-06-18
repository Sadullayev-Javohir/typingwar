/* TypingWar — Sozlamalar sahifasi (vizual boshqaruvlar) */
(function () {
    "use strict";

    const S = window.TWSettings;
    if (!S) return;

    /* ─── Ma'lumotlar ─── */
    const THEMES = [
        { id: 'Dark',      name: 'Black',  bg: '#000000', surface: '#0a0a0a', text: '#ededed', gold: '#0070f3' },
        { id: 'Light',     name: 'Light',  bg: '#fafafa', surface: '#ffffff', text: '#111111', gold: '#0070f3' },
        { id: 'Sepia',     name: 'Sand',   bg: '#faf8f4', surface: '#ffffff', text: '#1a1410', gold: '#c2410c' },
        { id: 'Nord',      name: 'Blue',   bg: '#00040d', surface: '#0b1322', text: '#ededed', gold: '#0070f3' },
        { id: 'Monokai',   name: 'Amber',  bg: '#0d0900', surface: '#171206', text: '#ededed', gold: '#f5a623' },
        { id: 'Solarized', name: 'Teal',   bg: '#00090b', surface: '#0a181c', text: '#ededed', gold: '#00bfa5' },
        { id: 'Ocean',     name: 'Cyan',   bg: '#00060d', surface: '#0a1420', text: '#ededed', gold: '#00dfd8' },
        { id: 'Forest',    name: 'Green',  bg: '#000d06', surface: '#0a1a10', text: '#ededed', gold: '#00c853' },
        { id: 'Rose',      name: 'Pink',   bg: '#0d0008', surface: '#1a0a14', text: '#ededed', gold: '#ff2d92' },
        { id: 'Terminal',  name: 'Violet', bg: '#07030f', surface: '#130a1f', text: '#ededed', gold: '#8b5cf6' },
    ];

    /* Fon variantlari — `prev` = swatch ko'rinishi (mini). Birinchisi (nextjs) standart. */
    const BACKGROUNDS = [
        { id: 'nextjs',      name: 'Next.js',  prev: 'background-image:radial-gradient(circle at 50% -30%,rgba(0,112,243,.7),transparent 60%),linear-gradient(rgba(255,255,255,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.18) 1px,transparent 1px);background-size:cover,9px 9px,9px 9px' },
        { id: 'dots',        name: 'Nuqta',    prev: 'background-image:radial-gradient(circle at 50% -30%,rgba(0,112,243,.55),transparent 60%),radial-gradient(rgba(255,255,255,.45) 1px,transparent 1px);background-size:cover,7px 7px' },
        { id: 'grid-lg',     name: 'Katta to\'r', prev: 'background-image:radial-gradient(circle at 50% -30%,rgba(0,112,243,.55),transparent 60%),linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px);background-size:cover,18px 18px,18px 18px' },
        { id: 'grid-fade',   name: 'So\'nuvchi', prev: 'background-image:linear-gradient(rgba(255,255,255,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.22) 1px,transparent 1px);background-size:9px 9px;-webkit-mask-image:linear-gradient(to bottom,#000,transparent);mask-image:linear-gradient(to bottom,#000,transparent)' },
        { id: 'aurora',      name: 'Aurora',   prev: 'background-image:radial-gradient(50% 50% at 20% 20%,rgba(0,112,243,.85),transparent 70%),radial-gradient(50% 50% at 80% 30%,rgba(121,40,202,.75),transparent 70%),radial-gradient(50% 50% at 60% 85%,rgba(255,45,146,.6),transparent 70%)' },
        { id: 'conic',       name: 'Konus',    prev: 'background:conic-gradient(from 180deg at 50% 0%,rgba(0,112,243,.85),rgba(121,40,202,.65),rgba(0,200,255,.7),transparent 65%)' },
        { id: 'spotlight',   name: 'Projektor', prev: 'background-image:radial-gradient(52% 56% at 50% 40%,rgba(0,112,243,.65),transparent 70%)' },
        { id: 'mesh',        name: 'Mesh',     prev: 'background-image:radial-gradient(at 0 0,rgba(0,112,243,.75),transparent 50%),radial-gradient(at 100% 0,rgba(121,40,202,.65),transparent 50%),radial-gradient(at 0 100%,rgba(0,200,255,.55),transparent 50%),radial-gradient(at 100% 100%,rgba(255,45,146,.5),transparent 50%)' },
        { id: 'beams',       name: 'Nurlar',   prev: 'background-image:repeating-linear-gradient(115deg,transparent 0 7px,rgba(0,112,243,.4) 7px 8px)' },
        { id: 'dual',        name: 'Ikki yog\'du', prev: 'background-image:radial-gradient(50% 60% at 15% 0,rgba(0,112,243,.7),transparent 70%),radial-gradient(50% 60% at 85% 10%,rgba(255,45,146,.6),transparent 70%)' },
        { id: 'vignette',    name: 'Vinetka',  prev: 'background-image:radial-gradient(120% 120% at 50% 50%,transparent 45%,rgba(0,0,0,.92)),radial-gradient(60% 50% at 50% 0,rgba(0,112,243,.5),transparent 70%)' },
        { id: 'stripes',     name: 'Chiziq',   prev: 'background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.13) 0 4px,transparent 4px 8px)' },
        { id: 'radial-dots', name: 'Radial nuqta', prev: 'background-image:radial-gradient(rgba(255,255,255,.5) 1px,transparent 1px);background-size:6px 6px;-webkit-mask-image:radial-gradient(circle at 50% 45%,#000 10%,transparent 75%);mask-image:radial-gradient(circle at 50% 45%,#000 10%,transparent 75%)' },
        { id: 'rings',       name: 'Halqa',    prev: 'background-image:repeating-radial-gradient(circle at 50% 0,transparent 0 7px,rgba(0,112,243,.45) 7px 8px)' },
        { id: 'sunset',      name: 'Botish',   prev: 'background-image:radial-gradient(60% 70% at 50% 100%,rgba(255,153,0,.8),transparent 70%),radial-gradient(50% 60% at 28% 100%,rgba(255,45,146,.6),transparent 70%)' },
        { id: 'ocean',       name: 'Okean',    prev: 'background-image:radial-gradient(circle at 50% -20%,rgba(0,200,255,.75),transparent 60%),linear-gradient(rgba(255,255,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.12) 1px,transparent 1px);background-size:cover,9px 9px,9px 9px' },
        { id: 'violet',      name: 'Binafsha', prev: 'background-image:radial-gradient(circle at 50% -20%,rgba(121,40,202,.85),transparent 60%)' },
        { id: 'emerald',     name: 'Zumrad',   prev: 'background-image:radial-gradient(circle at 50% -20%,rgba(0,200,131,.75),transparent 60%)' },
        { id: 'crimson',     name: 'Qizil',    prev: 'background-image:radial-gradient(circle at 50% -20%,rgba(255,45,90,.75),transparent 60%)' },
        { id: 'glow-bottom', name: 'Pastki yog\'du', prev: 'background-image:radial-gradient(60% 70% at 50% 100%,rgba(0,112,243,.7),transparent 70%)' },
        { id: 'mono',        name: 'Sof',      prev: 'background:#0a0a0a' },
    ];

    const FONTS = [
        { id: 'JetBrains Mono',  name: 'JetBrains Mono'  },
        { id: 'Fira Code',       name: 'Fira Code'        },
        { id: 'IBM Plex Mono',   name: 'IBM Plex Mono'    },
        { id: 'Source Code Pro', name: 'Source Code Pro'  },
        { id: 'Space Mono',      name: 'Space Mono'       },
        { id: 'Roboto Mono',     name: 'Roboto Mono'      },
        { id: 'Ubuntu Mono',     name: 'Ubuntu Mono'      },
    ];

    /* ─── Tema grid yasash ─── */
    const themeGrid = document.getElementById('tw-theme-grid');
    if (themeGrid) {
        THEMES.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'tw-theme-opt';
            btn.dataset.theme = t.id;
            btn.title = t.name;
            btn.innerHTML = `
                <span class="tw-theme-swatch" style="background:${t.bg};border-color:${t.gold}">
                    <span class="tw-theme-swatch-top" style="background:${t.surface}"></span>
                    <span class="tw-theme-swatch-label" style="color:${t.text}">Aa</span>
                </span>
                <span class="tw-theme-name">${t.name}</span>
            `;
            btn.addEventListener('click', () => { S.set('theme', t.id); refresh(); });
            themeGrid.appendChild(btn);
        });
    }

    /* ─── Fon grid yasash ─── */
    const bgGrid = document.getElementById('tw-bg-grid');
    if (bgGrid) {
        BACKGROUNDS.forEach(b => {
            const btn = document.createElement('button');
            btn.className = 'tw-bg-opt';
            btn.dataset.bg = b.id;
            btn.title = b.name;
            const sw = document.createElement('span');
            sw.className = 'tw-bg-swatch';
            sw.style.cssText = b.prev;
            const nm = document.createElement('span');
            nm.className = 'tw-bg-name';
            nm.textContent = b.name;
            btn.appendChild(sw);
            btn.appendChild(nm);
            btn.addEventListener('click', () => { S.set('background', b.id); refresh(); });
            bgGrid.appendChild(btn);
        });
    }

    /* ─── Shrift grid yasash ─── */
    const fontGrid = document.getElementById('tw-font-grid');
    if (fontGrid) {
        FONTS.forEach(f => {
            const btn = document.createElement('button');
            btn.className = 'tw-font-opt';
            btn.dataset.font = f.id;
            btn.style.fontFamily = `'${f.id}', monospace`;
            btn.textContent = f.name;
            btn.addEventListener('click', () => { S.set('fontFamily', f.id); refresh(); });
            fontGrid.appendChild(btn);
        });
    }

    /* ─── Karet tugmalari ─── */
    document.querySelectorAll('.tw-caret-opt').forEach(btn => {
        btn.addEventListener('click', () => { S.set('caretStyle', btn.dataset.caret); refresh(); });
    });

    /* ─── Ovoz tugmalari ─── */
    document.querySelectorAll('.tw-sound-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            S.set('soundOnClick', btn.dataset.sound);
            refresh();
            // Tanlangan ovozni darhol eshittirib ko'rsatamiz (Off — jim)
            if (window.TWSound) window.TWSound.play(btn.dataset.sound, true);
        });
    });

    /* ─── Tugma guruhlari (til, rejim, so'z soni, qiyinlik, vaqt) ─── */
    document.querySelectorAll('.tw-sg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tw       = btn.dataset.tw;
            const val      = btn.dataset.value;
            const type     = btn.dataset.type;
            const timedVal = btn.dataset.twTimed;

            if (timedVal === 'off') {
                S.setAll({ timedMode: false });
            } else if (timedVal === 'on' && val) {
                S.setAll({ timedMode: true, timeLimitSeconds: parseInt(val, 10) });
            } else if (tw && val !== undefined) {
                S.set(tw, type === 'int' ? parseInt(val, 10) : val);
            }
            refresh();
        });
    });

    /* ─── Toggle (checkbox) ─── */
    document.querySelectorAll('input[data-tw][type="checkbox"]').forEach(el => {
        el.addEventListener('change', () => S.set(el.dataset.tw, el.checked));
    });

    /* ─── Font size range ─── */
    const fsEl  = document.getElementById('fontSize');
    const fsVal = document.getElementById('fsVal');
    if (fsEl) {
        fsEl.addEventListener('input', () => {
            const v = parseInt(fsEl.value, 10);
            S.set('fontSize', v);
            if (fsVal) fsVal.textContent = v;
            updatePreview();
        });
    }

    /* ─── Reset ─── */
    document.getElementById('tw-reset-settings')?.addEventListener('click', () => {
        if (confirm('Barcha sozlamalar standart holatga qaytarilsinmi?')) {
            S.reset();
            refresh();
        }
    });

    /* ─── Barcha boshqaruvlarni hozirgi sozlamaga moslashtirish ─── */
    function refresh() {
        const c = S.current;

        document.querySelectorAll('.tw-theme-opt').forEach(btn =>
            btn.classList.toggle('tw-active', btn.dataset.theme === c.theme));

        document.querySelectorAll('.tw-bg-opt').forEach(btn =>
            btn.classList.toggle('tw-active', btn.dataset.bg === (c.background || 'nextjs')));

        document.querySelectorAll('.tw-font-opt').forEach(btn =>
            btn.classList.toggle('tw-active', btn.dataset.font === c.fontFamily));

        document.querySelectorAll('.tw-caret-opt').forEach(btn =>
            btn.classList.toggle('tw-active', btn.dataset.caret === c.caretStyle));

        document.querySelectorAll('.tw-sound-opt').forEach(btn =>
            btn.classList.toggle('tw-active', btn.dataset.sound === c.soundOnClick));

        document.querySelectorAll('.tw-sg-btn').forEach(btn => {
            const tw       = btn.dataset.tw;
            const val      = btn.dataset.value;
            const timedVal = btn.dataset.twTimed;
            let active = false;

            if (timedVal === 'off')     active = !c.timedMode;
            else if (timedVal === 'on') active = c.timedMode && String(c.timeLimitSeconds) === val;
            else if (tw && val !== undefined) active = String(c[tw]) === val;

            btn.classList.toggle('tw-active', active);
        });

        document.querySelectorAll('input[data-tw][type="checkbox"]').forEach(el =>
            (el.checked = !!S.get(el.dataset.tw)));

        if (fsEl)  fsEl.value = c.fontSize;
        if (fsVal) fsVal.textContent = c.fontSize;

        updatePreview();
    }

    /* ─── Jonli preview yangilash ─── */
    function updatePreview() {
        const p      = document.getElementById('tw-preview-text');
        const fLabel = document.getElementById('tw-preview-font-label');
        const sLabel = document.getElementById('tw-preview-size-label');
        const tLabel = document.getElementById('tw-preview-theme-label');

        if (p) {
            p.style.fontFamily = `'${S.get('fontFamily')}', monospace`;
            p.style.fontSize   = S.get('fontSize') + 'px';
        }
        if (fLabel) fLabel.textContent = S.get('fontFamily');
        if (sLabel) sLabel.textContent = S.get('fontSize') + 'px';
        if (tLabel) tLabel.textContent = S.get('theme');
    }

    S.onChange(refresh);
    refresh();
})();

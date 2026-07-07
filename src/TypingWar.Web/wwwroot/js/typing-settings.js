/* TypingWar — sozlamalar (LocalStorage + DB sinxronlash, tema/shrift qo'llash) */
(function () {
    "use strict";

    const KEY = "tw_settings";
    const DEFAULTS = {
        textMode: "Words", wordCount: 25, timedMode: false, timeLimitSeconds: 30,
        quoteLength: "all",
        difficulty: "Normal", language: "Uzbek",
        theme: "Monokai", fontFamily: "JetBrains Mono", fontSize: 18,
        caretStyle: "Line", smoothCaret: true,
        background: "nextjs",
        showLiveWpm: true, showLiveAcc: true, showLiveTimer: true,
        showStatsPanel: true, showCheetah: true, showKeyboard: true,
        blindMode: false, stopOnError: false, soundOnClick: "Off"
    };

    /* Vercel-style themes — every background near-black tinted toward its accent
       (or a clean light), with a distinct Vercel accent color. The page glow
       (body::after) follows `gold`, so each theme glows in its own color. */
    const THEME_MAP = {
        Dark:      { bg: '#000000', surface: '#0a0a0a', text: '#ededed', sub: '#525252', gold: '#0070f3', accent: '#00c8ff' }, // Black
        Light:     { bg: '#fafafa', surface: '#ffffff', text: '#111111', sub: '#999999', gold: '#0070f3', accent: '#7928ca' }, // Light
        Sepia:     { bg: '#faf8f4', surface: '#ffffff', text: '#1a1410', sub: '#a08c78', gold: '#c2410c', accent: '#f5a623' }, // Sand
        Nord:      { bg: '#00040d', surface: '#0b1322', text: '#ededed', sub: '#56607a', gold: '#0070f3', accent: '#00c8ff' }, // Blue
        Monokai:   { bg: '#0d0900', surface: '#171206', text: '#ededed', sub: '#6a5f4a', gold: '#f5a623', accent: '#ffd24d' }, // Amber
        Solarized: { bg: '#00090b', surface: '#0a181c', text: '#ededed', sub: '#4a6065', gold: '#00bfa5', accent: '#22d3ee' }, // Teal
        Ocean:     { bg: '#00060d', surface: '#0a1420', text: '#ededed', sub: '#54648a', gold: '#00dfd8', accent: '#0070f3' }, // Cyan
        Forest:    { bg: '#000d06', surface: '#0a1a10', text: '#ededed', sub: '#5a7a60', gold: '#00c853', accent: '#50e3c2' }, // Green
        Rose:      { bg: '#0d0008', surface: '#1a0a14', text: '#ededed', sub: '#7a5070', gold: '#ff2d92', accent: '#ff7eb6' }, // Pink
        Terminal:  { bg: '#07030f', surface: '#130a1f', text: '#ededed', sub: '#6a5a85', gold: '#8b5cf6', accent: '#c084fc' }, // Violet
        // Qo'shimcha Vercel uslubidagi mavzular
        Indigo:    { bg: '#04030d', surface: '#0d0b20', text: '#ededed', sub: '#5d5a85', gold: '#6366f1', accent: '#818cf8' }, // Indigo
        Sky:       { bg: '#00060d', surface: '#081320', text: '#ededed', sub: '#4f6480', gold: '#38bdf8', accent: '#7dd3fc' }, // Sky
        Lime:      { bg: '#060d00', surface: '#111a06', text: '#ededed', sub: '#5f7a4a', gold: '#84cc16', accent: '#bef264' }, // Lime
        Tangerine: { bg: '#0d0600', surface: '#1a0e04', text: '#ededed', sub: '#806045', gold: '#f97316', accent: '#fdba74' }, // Orange
        Ruby:      { bg: '#0d0305', surface: '#1a080c', text: '#ededed', sub: '#805058', gold: '#ff3b3b', accent: '#ff8a8a' }, // Red
        Fuchsia:   { bg: '#0b000d', surface: '#160a1a', text: '#ededed', sub: '#785080', gold: '#d946ef', accent: '#f0abfc' }, // Fuchsia
        Mint:      { bg: '#000d0a', surface: '#061a16', text: '#ededed', sub: '#4a7a70', gold: '#2dd4bf', accent: '#5eead4' }, // Mint
        Gold:      { bg: '#0d0b00', surface: '#1a1604', text: '#ededed', sub: '#807545', gold: '#facc15', accent: '#fde047' }, // Gold
        Slate:     { bg: '#05070a', surface: '#0d1117', text: '#ededed', sub: '#5b6473', gold: '#94a3b8', accent: '#cbd5e1' }, // Slate
        Magenta:   { bg: '#0d0207', surface: '#1a060e', text: '#ededed', sub: '#805065', gold: '#e60a64', accent: '#ff6ba6' }, // Magenta
    };

    function load() {
        try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || "{}")); }
        catch (e) { return Object.assign({}, DEFAULTS); }
    }
    function persist(s) {
        try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { }
    }

    const TW = {
        current: load(),
        themes: THEME_MAP,
        _listeners: [],

        get(k) { return this.current[k]; },

        set(k, v) {
            this.current[k] = v;
            persist(this.current);
            this.apply();
            this._notify();
            this.pushToServer();
        },

        setAll(obj, push) {
            Object.assign(this.current, obj);
            persist(this.current);
            this.apply();
            this._notify();
            if (push !== false) this.pushToServer();
        },

        reset() {
            this.setAll(Object.assign({}, DEFAULTS));
        },

        onChange(fn) { this._listeners.push(fn); },
        _notify() { this._listeners.forEach(f => { try { f(this.current); } catch (e) { } }); },

        apply() {
            const s = this.current;
            const root = document.documentElement;
            const theme = THEME_MAP[s.theme] || THEME_MAP.Monokai;

            // Tema CSS o'zgaruvchilari (:root ga o'rnatiladi)
            root.style.setProperty('--tw-bg',          theme.bg);
            root.style.setProperty('--tw-surface',     theme.surface);
            root.style.setProperty('--tw-text',        theme.text);
            root.style.setProperty('--tw-gold',        theme.gold);
            root.style.setProperty('--tw-accent',      theme.accent);
            root.style.setProperty('--tw-words-color', theme.sub);
            document.body.style.backgroundColor = theme.bg;
            document.body.style.color           = theme.text;
            document.body.dataset.twTheme       = s.theme;

            // Shrift
            root.style.setProperty('--tw-font',       '"' + s.fontFamily + '", monospace');
            root.style.setProperty('--tw-fontsize',    s.fontSize + 'px');
            root.style.setProperty('--tw-caret-anim', s.smoothCaret ? '0.1s' : '0s');
            document.body.dataset.twCaret = s.caretStyle;

            // Fon (sahifa orqa foni) — Vercel uslubidagi variant
            document.body.dataset.twBg = s.background || 'nextjs';
        },

        async syncFromServer() {
            try {
                const r = await fetch("/api/settings", { credentials: "same-origin" });
                if (r.status === 200) {
                    // Serverda saqlangan sozlamalar bor — ularni qo'llaymiz
                    const dto = await r.json();
                    if (dto && typeof dto === "object") this.setAll(dto, false);
                } else if (r.status === 204) {
                    // Kirgan, lekin hali saqlanmagan — LocalStorage ni serverga yuboramiz
                    this.pushToServer();
                }
                // Aks holda (401 — anonim) LocalStorage o'zgarishsiz qoladi
            } catch (e) { }
        },

        async pushToServer() {
            try {
                await fetch("/api/settings", {
                    method: "PUT",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(this.current)
                });
            } catch (e) { }
        }
    };

    TW.apply();
    TW.syncFromServer();

    window.TWSettings = TW;
})();

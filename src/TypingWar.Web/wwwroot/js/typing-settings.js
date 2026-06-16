/* TypingWar — sozlamalar (LocalStorage + DB sinxronlash, tema/shrift qo'llash) */
(function () {
    "use strict";

    const KEY = "tw_settings";
    const DEFAULTS = {
        textMode: "Words", wordCount: 25, timedMode: false, timeLimitSeconds: 30,
        difficulty: "Normal", language: "Uzbek",
        theme: "Dark", fontFamily: "JetBrains Mono", fontSize: 18,
        caretStyle: "Line", smoothCaret: true,
        showLiveWpm: true, blindMode: false, stopOnError: false, soundOnClick: "Off"
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

        onChange(fn) { this._listeners.push(fn); },
        _notify() { this._listeners.forEach(f => { try { f(this.current); } catch (e) { } }); },

        apply() {
            const s = this.current;
            const root = document.documentElement;
            document.body.dataset.twTheme = s.theme;
            root.style.setProperty("--tw-font", '"' + s.fontFamily + '", monospace');
            root.style.setProperty("--tw-fontsize", s.fontSize + "px");
            root.style.setProperty("--tw-caret-anim", s.smoothCaret ? "0.1s" : "0s");
            document.body.dataset.twCaret = s.caretStyle;
        },

        async syncFromServer() {
            try {
                const r = await fetch("/api/settings", { credentials: "same-origin" });
                if (r.ok) {
                    const dto = await r.json();
                    if (dto && typeof dto === "object") this.setAll(dto, false);
                }
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
            } catch (e) { /* anonim foydalanuvchi — 401, e'tibor bermaymiz */ }
        }
    };

    TW.apply();
    // Tizimga kirgan bo'lsa server qiymatlari ustun (sahifa yuklanganda)
    TW.syncFromServer();

    window.TWSettings = TW;
})();

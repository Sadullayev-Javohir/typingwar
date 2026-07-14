// ═══════════════════════════════════════════════════════════════════
// tw-appearance.js — Ko'rinish sozlamalari (yorug'lik / karta) modali
// ───────────────────────────────────────────────────────────────────
//   • Yorug'lik (video fon)  : 0–100%  (standart 40%, 100% = asl video)
//   • Karta xiralashuvi      : 0–1     (standart 0.5, 0 = shaffof)
//   • Fon yorug'ligi (karta) : 0–1     (standart 0.5, 0 = qora karta)
// Qiymatlar localStorage'da saqlanadi; CSS o'zgaruvchilariga qo'llanadi.
// (Boshlang'ich qo'llash _Layout head'idagi inline skriptda — miltillash yo'q.)
// ═══════════════════════════════════════════════════════════════════
(function () {
    "use strict";

    var DEFAULTS = { video: 0.4, alpha: 0.5, bright: 0.5 };
    var root = document.documentElement;
    var LS = window.localStorage;

    function getNum(key, def) {
        try { var v = LS.getItem(key); return v === null ? def : parseFloat(v); }
        catch (e) { return def; }
    }
    function save(key, val) { try { LS.setItem(key, String(val)); } catch (e) { } }

    // Joriy holat (saqlangan yoki standart)
    var state = {
        video: getNum("tw-video-scale", DEFAULTS.video),
        alpha: getNum("tw-card-alpha", DEFAULTS.alpha),
        bright: getNum("tw-card-bright", DEFAULTS.bright)
    };

    function apply() {
        root.style.setProperty("--tw-video-scale", state.video);
        root.style.setProperty("--tw-card-alpha", state.alpha);
        root.style.setProperty("--tw-card-bright", state.bright);
    }

    function el(id) { return document.getElementById(id); }

    document.addEventListener("DOMContentLoaded", function () {
        var modal = el("tw-appr-modal");
        var openBtn = el("tw-appr-open");
        var closeBtn = el("tw-appr-close");
        var resetBtn = el("tw-appr-reset");
        if (!modal || !openBtn) return;

        var vid = el("tw-appr-video"), vidVal = el("tw-appr-video-val");
        var alp = el("tw-appr-alpha"), alpVal = el("tw-appr-alpha-val");
        var bri = el("tw-appr-bright"), briVal = el("tw-appr-bright-val");

        function syncInputs() {
            vid.value = Math.round(state.video * 100);
            alp.value = state.alpha;
            bri.value = state.bright;
            vidVal.textContent = Math.round(state.video * 100) + "%";
            alpVal.textContent = state.alpha.toFixed(2);
            briVal.textContent = state.bright.toFixed(2);
        }

        function open() { syncInputs(); modal.hidden = false; document.body.classList.add("tw-appr-open"); }
        function close() { modal.hidden = true; document.body.classList.remove("tw-appr-open"); }

        openBtn.addEventListener("click", function (e) { e.preventDefault(); open(); });
        closeBtn.addEventListener("click", close);
        modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
        document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });

        vid.addEventListener("input", function () {
            state.video = Math.max(0, Math.min(100, parseInt(vid.value, 10) || 0)) / 100;
            vidVal.textContent = Math.round(state.video * 100) + "%";
            apply(); save("tw-video-scale", state.video);
        });
        alp.addEventListener("input", function () {
            state.alpha = parseFloat(alp.value) || 0;
            alpVal.textContent = state.alpha.toFixed(2);
            apply(); save("tw-card-alpha", state.alpha);
        });
        bri.addEventListener("input", function () {
            state.bright = parseFloat(bri.value) || 0;
            briVal.textContent = state.bright.toFixed(2);
            apply(); save("tw-card-bright", state.bright);
        });

        resetBtn.addEventListener("click", function () {
            state.video = DEFAULTS.video;
            state.alpha = DEFAULTS.alpha;
            state.bright = DEFAULTS.bright;
            apply(); syncInputs();
            save("tw-video-scale", state.video);
            save("tw-card-alpha", state.alpha);
            save("tw-card-bright", state.bright);
        });
    });

    apply();
})();

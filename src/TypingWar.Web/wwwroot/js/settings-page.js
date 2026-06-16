/* TypingWar — sozlamalar sahifasi: boshqaruvlarni TWSettings ga bog'lash */
(function () {
    "use strict";
    const S = window.TWSettings;
    if (!S) return;

    const controls = document.querySelectorAll("[data-tw]");
    const fsVal = document.getElementById("fsVal");

    function readControl(el) {
        const type = el.dataset.type;
        if (el.type === "checkbox") return el.checked;
        if (type === "int") return parseInt(el.value, 10);
        return el.value;
    }

    function writeControl(el, value) {
        if (el.type === "checkbox") el.checked = !!value;
        else el.value = String(value);
    }

    function syncFromSettings() {
        controls.forEach(el => writeControl(el, S.get(el.dataset.tw)));
        if (fsVal) fsVal.textContent = S.get("fontSize");
    }

    controls.forEach(el => {
        const ev = (el.tagName === "SELECT" || el.type === "checkbox") ? "change" : "input";
        el.addEventListener(ev, () => {
            S.set(el.dataset.tw, readControl(el));
            if (el.dataset.tw === "fontSize" && fsVal) fsVal.textContent = S.get("fontSize");
        });
    });

    S.onChange(syncFromSettings);
    syncFromSettings();
})();

// tw-bracket-layout.js — Ikki tomonlama (chap/o'ng) playoff bracket joylashuvi.
// Futboldagi playoff kabi: ishtirokchilar CHAP va O'NG yarmlarga bo'linadi,
// MARKAZDA esa final o'yini + oltin kubok turadi. Har ikki yarm markazga
// (finalga) qarab "yaqinlashadi".
//
// Foydalanish:
//   const r = TWBracketLayout.build(matches, renderMatch, esc);
//   if (!r.has) { ...yashir... }
//   leftEl.innerHTML  = r.left;
//   rightEl.innerHTML = r.right;
//   finalEl.innerHTML = r.final;
//
//  matches      — [{ round, slot, roundName, ... }]
//  renderMatch  — (m, isFinal) => bitta o'yin kartasining HTML'i
//  esc          — (s) => xavfsiz matn (ixtiyoriy)
(function () {
    "use strict";

    function group(matches) {
        const rounds = {};
        matches.forEach(m => { (rounds[m.round] = rounds[m.round] || []).push(m); });
        return rounds;
    }

    function column(roundName, innerHtml, extraClass) {
        return `<div class="tw-bk-round${extraClass ? " " + extraClass : ""}">
            <div class="tw-bk-rname">${roundName}</div>
            <div class="tw-bk-col">${innerHtml}</div>
        </div>`;
    }

    function build(matches, renderMatch, esc) {
        const e = esc || ((s) => String(s == null ? "" : s));
        const has = !!(matches && matches.length);
        if (!has) return { has: false, left: "", right: "", final: "" };

        const rounds = group(matches);
        const keys = Object.keys(rounds).map(Number).sort((a, b) => a - b);
        const lastKey = keys[keys.length - 1];   // eng oxirgi raund = FINAL (markazda)

        let left = "", right = "";
        keys.forEach(rk => {
            if (rk === lastKey) return;          // final markazda alohida chiziladi
            const ms = rounds[rk].slice().sort((a, b) => a.slot - b.slot);
            const half = Math.ceil(ms.length / 2);
            const leftMs = ms.slice(0, half);    // yuqori slotlar → chap yarm
            const rightMs = ms.slice(half);       // qolgani → o'ng yarm
            const rname = e(ms[0].roundName);

            if (leftMs.length) {
                left += column(rname, leftMs.map(m => renderMatch(m, false)).join(""));
            }
            if (rightMs.length) {
                // O'ng tomon markazdan tashqariga: semifinal markazga eng yaqin bo'lishi
                // uchun har bir keyingi (kattaroq) raundni boshiga qo'shamiz (prepend).
                right = column(rname, rightMs.map(m => renderMatch(m, false)).join(""), "tw-bk-round--r") + right;
            }
        });

        const finalMs = rounds[lastKey].slice().sort((a, b) => a.slot - b.slot);
        const finalLabel = `<div class="tw-bk-rname">${e(finalMs[0].roundName)}</div>`;
        const final = finalLabel + finalMs.map(m => renderMatch(m, true)).join("");

        return { has: true, left, right, final };
    }

    window.TWBracketLayout = { build };
})();

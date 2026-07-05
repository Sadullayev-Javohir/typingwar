// tw-bracket-layout.js — Ikki tomonlama (chap/o'ng) playoff bracket joylashuvi.
// Futboldagi playoff kabi: ishtirokchilar CHAP va O'NG yarmlarga bo'linadi,
// MARKAZDA esa final o'yini + oltin kubok turadi. Har ikki yarm markazga
// (finalga) qarab "yaqinlashadi".
//
// MUHIM qoidalar:
//   • Raqibsiz "bye" o'yinlari (avtomatik o'tgan) alohida karta sifatida
//     KO'RSATILMAYDI — o'yinchi to'g'ridan-to'g'ri keyingi raundda chiqadi.
//   • O'yin qaysi tomonga tushishi bracket GEOMETRIYASIga qarab aniqlanadi
//     (slot pozitsiyasi), shuning uchun byelar olib tashlangach ham tartib to'g'ri.
//   • Agar haqiqiy o'yinlar faqat bitta yarmga sig'sa (masalan 3 kishilik turnir),
//     bracket BIR TOMONLAMA bo'ladi: hammasi CHAPda, o'ng yarm umuman ko'rinmaydi.
//
// Foydalanish:
//   const r = TWBracketLayout.build(matches, renderMatch, esc);
//   if (!r.has) { ...yashir... }
//   leftEl.innerHTML  = r.left;
//   rightEl.innerHTML = r.right;
//   finalEl.innerHTML = r.final;
//   rightEl.classList.toggle("d-none", !r.twoSided);  // bir tomonlama bo'lsa yashir
//
//  matches      — [{ round, slot, roundName, player1Id, player2Id, winnerId, ... }]
//  renderMatch  — (m, isFinal) => bitta o'yin kartasining HTML'i
//  esc          — (s) => xavfsiz matn (ixtiyoriy)
(function () {
    "use strict";

    // Raqibsiz avtomatik o'tgan ("bye") o'yin — bitta o'yinchi bor va g'olib allaqachon belgilangan.
    function isBye(m) {
        const hasP1 = !!m.player1Id, hasP2 = !!m.player2Id;
        return (hasP1 !== hasP2) && !!m.winnerId;
    }

    function column(roundName, innerHtml) {
        return `<div class="tw-bk-round">
            <div class="tw-bk-rname">${roundName}</div>
            <div class="tw-bk-col">${innerHtml}</div>
        </div>`;
    }

    function build(matches, renderMatch, esc) {
        const e = esc || ((s) => String(s == null ? "" : s));
        const all = matches || [];
        if (!all.length) return { has: false, left: "", right: "", final: "", twoSided: false };

        // Byelarni yashiramiz — ular keyingi raundda o'yinchi sifatida ko'rinadi.
        const real = all.filter(m => !isBye(m));

        // Eng oxirgi raund = FINAL (markazda). Geometriya ham shunga tayanadi.
        const maxRound = all.reduce((mx, m) => Math.max(mx, m.round), 0);

        // round → { left:[matches], right:[matches] }  (geometrik tomon: slot pozitsiyasi)
        const byRound = {};
        real.forEach(m => {
            if (m.round === maxRound) return;                 // final alohida
            const boundary = Math.pow(2, maxRound - m.round - 1);  // shu rounddagi yarim slotlar soni
            const side = m.slot < boundary ? "left" : "right";
            (byRound[m.round] = byRound[m.round] || { left: [], right: [] })[side].push(m);
        });

        const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
        const leftCols = [], rightCols = [];   // { round, html }
        rounds.forEach(r => {
            const g = byRound[r];
            if (g.left.length) {
                g.left.sort((a, b) => a.slot - b.slot);
                leftCols.push({ round: r, html: column(e(g.left[0].roundName), g.left.map(m => renderMatch(m, false)).join("")) });
            }
            if (g.right.length) {
                g.right.sort((a, b) => a.slot - b.slot);
                rightCols.push({ round: r, html: column(e(g.right[0].roundName), g.right.map(m => renderMatch(m, false)).join("")) });
            }
        });

        // Final (markaz)
        const finalMs = real.filter(m => m.round === maxRound).sort((a, b) => a.slot - b.slot);
        let final = "";
        if (finalMs.length) {
            final = `<div class="tw-bk-rname">${e(finalMs[0].roundName)}</div>` +
                finalMs.map(m => renderMatch(m, true)).join("");
        }

        const twoSided = leftCols.length > 0 && rightCols.length > 0;
        let left = "", right = "";

        if (twoSided) {
            left = leftCols.map(c => c.html).join("");
            // O'ng yarm: kattaroq raund (yarim final) markazga eng yaqin → kamayish bo'yicha.
            right = rightCols.slice().sort((a, b) => b.round - a.round).map(c => c.html).join("");
        } else {
            // BIR TOMONLAMA: barcha o'yinlar CHAP tomonda, raund bo'yicha o'sish tartibida.
            const single = leftCols.concat(rightCols).sort((a, b) => a.round - b.round);
            left = single.map(c => c.html).join("");
            right = "";
        }

        const has = !!(left || right || final);
        return { has, left, right, final, twoSided };
    }

    window.TWBracketLayout = { build };
})();

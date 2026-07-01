// tw-bracket-zoom.js — Playoff bracket uchun Google Maps uslubidagi zoom/pan.
// Ko'p o'yinchili (32/64) bracket ekranga sig'maydi — shuning uchun bracketni
// "xarita" sifatida ko'rsatamiz: sichqoncha g'ildiragi bilan kattalashtirish
// (kursor ostiga qarab), sudrab surish (drag-pan), mobil pinch-zoom va
// tugmalar (+/−/markazga). "Sig'dirish" butun bracketni ekranga moslaydi.
//
// Foydalanish:
//   const z = TWBracketZoom.attach(viewportEl, canvasEl, { tools: toolsEl });
//   z.fit();          // butun bracketni ekranga sig'dirib markazlash
//   z.refresh();      // kontent o'zgargach (yangi raund) — birinchi marta avtomatik fit
//
//   viewportEl — overflow:hidden bo'lgan "deraza" (position:relative)
//   canvasEl   — ichidagi transform qilinadigan qatlam (.tw-bk2)
//   tools.*    — [data-bkz="in|out|fit"] tugmalari (ixtiyoriy)
(function () {
    "use strict";

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function attach(viewport, canvas, opts) {
        opts = opts || {};
        const minScale = opts.minScale || 0.12;
        const maxScale = opts.maxScale || 2.2;
        const pad = opts.pad || 28;

        let scale = 1, tx = 0, ty = 0;
        let fittedOnce = false;

        canvas.style.transformOrigin = "0 0";
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.margin = "0";
        canvas.style.willChange = "transform";

        function apply() {
            canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        }

        // Kontentning tabiiy (masshtabsiz) o'lchami
        function natural() {
            return { w: canvas.offsetWidth, h: canvas.offsetHeight };
        }

        function fit() {
            const vw = viewport.clientWidth, vh = viewport.clientHeight;
            const { w, h } = natural();
            if (!w || !h || !vw || !vh) return false;
            const s = clamp(Math.min((vw - pad) / w, (vh - pad) / h), minScale, maxScale);
            scale = s;
            tx = (vw - w * s) / 2;
            ty = (vh - h * s) / 2;
            apply();
            fittedOnce = true;
            return true;
        }

        // (cx,cy) — viewportga nisbatan nuqta atrofida masshtablash
        function zoomAt(factor, cx, cy) {
            const ns = clamp(scale * factor, minScale, maxScale);
            const k = ns / scale;
            tx = cx - (cx - tx) * k;
            ty = cy - (cy - ty) * k;
            scale = ns;
            apply();
        }
        function zoomCenter(factor) {
            zoomAt(factor, viewport.clientWidth / 2, viewport.clientHeight / 2);
        }

        // ── G'ildirak bilan zoom (kursor ostiga qarab) ──
        viewport.addEventListener("wheel", (e) => {
            e.preventDefault();
            const r = viewport.getBoundingClientRect();
            const factor = e.deltaY < 0 ? 1.14 : 1 / 1.14;
            zoomAt(factor, e.clientX - r.left, e.clientY - r.top);
        }, { passive: false });

        // ── Pan (sudrab surish) + pinch (ikki barmoq) ──
        const pointers = new Map();
        let dragging = false, moved = false, lastX = 0, lastY = 0;
        let pinchDist = 0;

        function isControl(t) {
            return t && t.closest && t.closest("button, a, input, textarea, select, [data-bkz]");
        }

        viewport.addEventListener("pointerdown", (e) => {
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.size === 2) { dragging = false; pinchDist = 0; return; }
            if (isControl(e.target)) return;          // tugma/havola bosilsa pan boshlamaymiz
            dragging = true; moved = false;
            lastX = e.clientX; lastY = e.clientY;
            try { viewport.setPointerCapture(e.pointerId); } catch (_) { }
            viewport.classList.add("tw-bkz-grab");
        });

        viewport.addEventListener("pointermove", (e) => {
            if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (pointers.size === 2) {
                const p = [...pointers.values()];
                const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
                if (pinchDist) {
                    const r = viewport.getBoundingClientRect();
                    const cx = (p[0].x + p[1].x) / 2 - r.left;
                    const cy = (p[0].y + p[1].y) / 2 - r.top;
                    zoomAt(dist / pinchDist, cx, cy);
                }
                pinchDist = dist;
                return;
            }

            if (!dragging) return;
            const dx = e.clientX - lastX, dy = e.clientY - lastY;
            if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
            tx += dx; ty += dy;
            lastX = e.clientX; lastY = e.clientY;
            apply();
        });

        function endPointer(e) {
            pointers.delete(e.pointerId);
            if (pointers.size < 2) pinchDist = 0;
            if (pointers.size === 0) {
                dragging = false;
                viewport.classList.remove("tw-bkz-grab");
            }
        }
        viewport.addEventListener("pointerup", endPointer);
        viewport.addEventListener("pointercancel", endPointer);
        viewport.addEventListener("pointerleave", (e) => { if (!dragging) endPointer(e); });

        // Sudrab surishdan keyingi "click"ni bostiramiz (match tugmalari xato ishlamasin)
        viewport.addEventListener("click", (e) => {
            if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
        }, true);

        // ── Tugmalar ──
        const tools = opts.tools;
        if (tools) {
            tools.addEventListener("click", (e) => {
                const btn = e.target.closest("[data-bkz]");
                if (!btn) return;
                const a = btn.dataset.bkz;
                if (a === "in") zoomCenter(1.3);
                else if (a === "out") zoomCenter(1 / 1.3);
                else if (a === "fit") fit();
            });
        }

        // Oyna o'lchami o'zgarsa — hali qo'lda zoom qilinmagan bo'lsa qayta sig'diramiz
        let userInteracted = false;
        ["wheel", "pointerdown"].forEach(ev =>
            viewport.addEventListener(ev, () => { userInteracted = true; }, { passive: true }));
        let rT = 0;
        window.addEventListener("resize", () => {
            clearTimeout(rT);
            rT = setTimeout(() => { if (!userInteracted) fit(); }, 150);
        });

        return {
            fit,
            zoomIn: () => zoomCenter(1.3),
            zoomOut: () => zoomCenter(1 / 1.3),
            // Kontent yangilangach chaqiriladi: birinchi marta avtomatik fit
            refresh() {
                if (!fittedOnce) requestAnimationFrame(() => fit());
            },
            // Tashqaridan majburiy qayta sig'dirish (masalan bracket yangi ko'rinsa)
            reset() { userInteracted = false; requestAnimationFrame(() => fit()); },
            get scale() { return scale; }
        };
    }

    window.TWBracketZoom = { attach };
})();

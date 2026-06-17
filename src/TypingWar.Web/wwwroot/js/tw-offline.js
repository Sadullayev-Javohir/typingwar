/* TypingWar — oflayn natija navbati (IndexedDB), internet kelganda sinxron */
(function () {
    "use strict";

    const DB = "tw-offline", STORE = "results";

    function open() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB, 1);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(STORE))
                    req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function tx(db, mode) { return db.transaction(STORE, mode).objectStore(STORE); }

    async function enqueue(payload) {
        try {
            const db = await open();
            await new Promise((res, rej) => {
                const r = tx(db, "readwrite").add({ payload, at: Date.now() });
                r.onsuccess = res; r.onerror = () => rej(r.error);
            });
        } catch (e) { /* IndexedDB yo'q — e'tibor bermaymiz */ }
    }

    async function all(db) {
        return new Promise((res, rej) => {
            const r = tx(db, "readonly").getAll();
            r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error);
        });
    }
    function remove(db, id) {
        return new Promise((res) => { const r = tx(db, "readwrite").delete(id); r.onsuccess = res; r.onerror = res; });
    }

    let flushing = false;
    async function flush() {
        if (flushing || !navigator.onLine) return;
        flushing = true;
        try {
            const db = await open();
            const items = await all(db);
            for (const item of items) {
                try {
                    const r = await fetch("/api/practice/result", {
                        method: "POST",
                        credentials: "same-origin",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(item.payload)
                    });
                    // 401 (anonim) yoki muvaffaqiyat — navbatdan o'chiramiz (qayta urinishdan ma'no yo'q)
                    if (r.ok || r.status === 401) await remove(db, item.id);
                } catch (e) { break; } // hali oflayn — keyingi safar
            }
        } catch (e) { /* jim */ }
        flushing = false;
    }

    window.TWOffline = { enqueue, flush };

    window.addEventListener("online", flush);
    window.addEventListener("load", flush);
})();

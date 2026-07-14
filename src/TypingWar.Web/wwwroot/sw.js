/* TypingWar — Service Worker (offline app shell) */
const CACHE = "tw-cache-v82";
const MEDIA_CACHE = "tw-media-v82";     // video/media — alohida (katta, kamdan-kam o'zgaradi)
const SHELL = [
    "/",
    "/Practice",
    "/css/site.css",
    "/css/theme-pro.css",
    "/css/global-theme.css",
    "/css/landing.css",
    "/js/site.js",
    "/js/tw-sound.js",
    "/js/typing-settings.js",
    "/js/tw-appearance.js",
    "/js/typing-engine.js",
    "/js/tw-keyboard.js",
    "/js/tw-offline.js",
    "/js/tournament-trophy.js",
    "/js/tw-bracket-layout.js",
    "/js/tw-bracket-zoom.js",
    "/lib/three/three.module.min.js",
    "/lib/bootstrap/dist/css/bootstrap.min.css",
    "/img/typingwar-logo.png",
    "/manifest.webmanifest"
];

self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE && k !== MEDIA_CACHE).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET") return;               // API yozuvlari cache qilinmaydi
    const url = new URL(req.url);
    // Tashqi (cross-origin) resurslarni — Google Fonts, CDN (jsdelivr/cdnjs),
    // Cloudflare beacon — SW ushlamaydi: brauzer to'g'ridan-to'g'ri yuklasin
    // (CSP connect-src emas, balki style-src/font-src/script-src qo'llaniladi).
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/hubs/")) return;

    // Video/media — cache-first + Range so'rovlarini qo'llab-quvvatlash.
    // Video BIR MARTA to'liq yuklanadi, keyin har sahifada cache'dan darhol o'ynaydi.
    if (/\.(mp4|webm|ogg)$/.test(url.pathname)) {
        e.respondWith(mediaResponse(req, url));
        return;
    }

    // Statik resurslar — cache-first; sahifalar — network-first + cache fallback
    const isStatic = /\.(css|js|png|ico|webmanifest|woff2?)$/.test(url.pathname);
    if (isStatic) {
        e.respondWith(caches.match(req).then(hit => hit || fetchAndCache(req)));
    } else {
        e.respondWith(
            fetch(req).then(res => { putCache(req, res.clone()); return res; })
                .catch(() => caches.match(req).then(hit => hit || caches.match("/")))
        );
    }
});

function fetchAndCache(req) {
    return fetch(req).then(res => { putCache(req, res.clone()); return res; });
}
function putCache(req, res) {
    if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res));
}

// ─── Video/media: to'liq faylni bir marta cache'ga oladi, Range so'rovga
//     cache'dagi to'liq body'dan 206 (partial) javob yasaydi ───
async function mediaResponse(req, url) {
    const cache = await caches.open(MEDIA_CACHE);
    // Diapazonsiz kalit bilan qidiramiz (Range header cache kalitiga kirmasin)
    const keyReq = new Request(url.href, { method: "GET" });
    let full = await cache.match(keyReq);

    if (!full) {
        try {
            // To'liq faylni (Range'siz) yuklab, cache'ga saqlaymiz
            const netRes = await fetch(keyReq);
            if (netRes && netRes.ok && netRes.status === 200) {
                cache.put(keyReq, netRes.clone());
                full = netRes;
            } else {
                // Server 206/boshqa qaytarsa — to'g'ridan-to'g'ri original so'rovni bajaramiz
                return fetch(req);
            }
        } catch (_) {
            return fetch(req).catch(() => new Response("", { status: 504 }));
        }
    }

    const range = req.headers.get("range");
    if (!range) return full.clone();

    // Range so'rovi: cache'dagi to'liq body'dan kerakli bo'lakni kesib beramiz
    const buf = await full.clone().arrayBuffer();
    const total = buf.byteLength;
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
    if (isNaN(start)) start = 0;
    if (isNaN(end) || end >= total) end = total - 1;
    if (start > end || start >= total) {
        return new Response(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${total}` }
        });
    }
    const chunk = buf.slice(start, end + 1);
    return new Response(chunk, {
        status: 206,
        statusText: "Partial Content",
        headers: {
            "Content-Type": full.headers.get("Content-Type") || "video/mp4",
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Content-Length": String(chunk.byteLength),
            "Accept-Ranges": "bytes"
        }
    });
}

/* TypingWar — Service Worker (offline app shell) */
const CACHE = "tw-cache-v66";
const SHELL = [
    "/",
    "/Practice",
    "/css/site.css",
    "/js/site.js",
    "/js/tw-sound.js",
    "/js/typing-settings.js",
    "/js/typing-engine.js",
    "/js/tw-keyboard.js",
    "/js/tw-offline.js",
    "/js/tai-lung.js",
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
        caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET") return;               // API yozuvlari cache qilinmaydi
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/hubs/")) return;

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

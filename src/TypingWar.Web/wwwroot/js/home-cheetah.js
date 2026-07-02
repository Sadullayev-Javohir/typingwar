// home-cheetah.js — Bosh sahifa: JUDA TEZ chopayotgan (full gallop) 3D gepard (Three.js)
// Gepard to'liq sprint tezlikda yuguradi: umurtqa egilib-cho'ziladi (gepard gallopi),
// 4 oyoq navbatma-navbat zarba beradi, dum shamolda hilpiraydi, oyoq ostidan chang
// ko'tariladi, orqa fonda oltin tezlik chiziqlari uchib o'tadi, yer tagidan surilib ketadi.
// WebGL bo'lmasa — jim chiqib ketadi (fallback logo qoladi).
import * as THREE from "/lib/three/three.module.min.js";

const GOLD = 0xe8a020;
const ACCENT = 0xff9900;

(function () {
    const mount = document.getElementById("tw-cheetah-3d");
    if (!mount) return;

    const loaderEl = document.getElementById("tw-cheetah-loader");
    function hideLoader() { loaderEl && loaderEl.classList.add("tw-hide"); }

    try {
        const test = document.createElement("canvas");
        if (!(test.getContext("webgl") || test.getContext("experimental-webgl"))) { hideLoader(); return; }
    } catch (e) { hideLoader(); return; }

    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const W = () => mount.clientWidth || 480;
    const H = () => mount.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0f0f1a, 9, 26);

    const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.1, 100);
    camera.position.set(5.6, 2.7, 6.8);
    camera.lookAt(0.2, 1.45, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W(), H());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    mount.appendChild(renderer.domElement);
    mount.querySelector(".tw-cheetah-fallback")?.remove();

    // ───── Yorug'lik ─────
    scene.add(new THREE.AmbientLight(0xaeb8ff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.55);
    key.position.set(4, 8, 6); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1; key.shadow.camera.far = 30;
    key.shadow.camera.left = -8; key.shadow.camera.right = 8;
    key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
    scene.add(key);
    const rim = new THREE.DirectionalLight(ACCENT, 1.25);   // orqadan oltin kontur nuri
    rim.position.set(-6, 4, -5); scene.add(rim);
    const glow = new THREE.PointLight(GOLD, 1.0, 18);
    glow.position.set(2, 2.4, 3); scene.add(glow);

    // ───── Gepard terisi teksturasi (xollar bilan) ─────
    function furTexture() {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const g = c.getContext("2d");
        const grd = g.createLinearGradient(0, 0, 0, 256);
        grd.addColorStop(0, "#f3bd52"); grd.addColorStop(0.55, "#e8a020"); grd.addColorStop(1, "#bf7a10");
        g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
        g.fillStyle = "rgba(22,14,6,0.85)";
        for (let i = 0; i < 110; i++) {
            const x = Math.random() * 256, y = Math.random() * 256, r = 3 + Math.random() * 6;
            g.beginPath();
            g.ellipse(x, y, r, r * (0.6 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
            g.fill();
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
        return tex;
    }
    const furMat = new THREE.MeshStandardMaterial({ map: furTexture(), roughness: 0.72, metalness: 0.05 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a120a, roughness: 0.6 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xf6e3bf, roughness: 0.8 });

    function part(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; }

    // ═════════ Gepard — yon profil, +X tomonga chopadi ═════════
    // root → bob/surge;  spine → flex pivot (front + rear yarim);
    const root = new THREE.Group();
    root.position.set(0, 1.45, 0);
    root.rotation.y = -0.32;                 // 3/4 ko'rinish (yuz + cho'zilish ko'rinsin)
    scene.add(root);

    const spine = new THREE.Group();
    root.add(spine);
    const front = new THREE.Group();         // ko'krak, bo'yin, bosh, old oyoqlar
    const rear = new THREE.Group();          // dumba, orqa oyoqlar, dum
    spine.add(front); spine.add(rear);

    // ── Tana (oldinga +X) ──
    const torsoF = part(new THREE.CapsuleGeometry(0.46, 0.95, 10, 18), furMat);
    torsoF.rotation.z = Math.PI / 2; torsoF.position.set(0.55, 0, 0); torsoF.scale.set(1, 0.92, 0.92);
    front.add(torsoF);
    const torsoR = part(new THREE.CapsuleGeometry(0.52, 0.8, 10, 18), furMat);
    torsoR.rotation.z = Math.PI / 2; torsoR.position.set(-0.5, 0.02, 0); torsoR.scale.set(1, 1.0, 1.0);
    rear.add(torsoR);
    // ingichka bel (gepard belgisi)
    const waist = part(new THREE.SphereGeometry(0.4, 14, 14), furMat);
    waist.position.set(0.02, -0.02, 0); waist.scale.set(0.9, 0.78, 0.86); spine.add(waist);
    // ko'krak (oq tuk)
    const chest = part(new THREE.SphereGeometry(0.42, 16, 16), creamMat);
    chest.position.set(1.0, -0.12, 0); chest.scale.set(0.7, 0.9, 0.85); front.add(chest);

    // ── Bo'yin + bosh (oldinga cho'zilgan, ufqqa qaragan) ──
    const neck = part(new THREE.CylinderGeometry(0.26, 0.36, 0.62, 14), furMat);
    neck.position.set(1.18, 0.22, 0); neck.rotation.z = -1.15; front.add(neck);

    const head = new THREE.Group();
    head.position.set(1.55, 0.45, 0); front.add(head);
    const skull = part(new THREE.SphereGeometry(0.34, 16, 16), furMat);
    skull.scale.set(1.05, 0.95, 0.95); head.add(skull);
    const snout = part(new THREE.CylinderGeometry(0.16, 0.24, 0.42, 12), furMat);
    snout.rotation.z = -Math.PI / 2; snout.position.set(0.38, -0.08, 0); head.add(snout);
    const nose = part(new THREE.SphereGeometry(0.09, 10, 10), darkMat);
    nose.position.set(0.6, -0.06, 0); head.add(nose);
    [-1, 1].forEach((s) => {
        const ear = part(new THREE.SphereGeometry(0.15, 12, 12), furMat);
        ear.scale.set(0.5, 1, 0.85); ear.position.set(-0.1, 0.34, 0.18 * s); head.add(ear);
        const inEar = part(new THREE.SphereGeometry(0.08, 10, 10), darkMat);
        inEar.scale.set(0.5, 1, 0.85); inEar.position.set(-0.07, 0.34, 0.2 * s); head.add(inEar);
        // ko'z (oldinga qaragan) + chaqnoq
        const eye = part(new THREE.SphereGeometry(0.075, 12, 12), new THREE.MeshStandardMaterial({ color: 0x140a02, roughness: 0.2 }));
        eye.position.set(0.18, 0.08, 0.18 * s); head.add(eye);
        const spark = part(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        spark.position.set(0.24, 0.12, 0.19 * s); head.add(spark);
        // gepard ko'z yoshi chizig'i
        const tear = part(new THREE.BoxGeometry(0.3, 0.045, 0.035), darkMat);
        tear.position.set(0.32, -0.06, 0.16 * s); tear.rotation.z = -0.7; head.add(tear);
    });

    // ── Oyoqlar (hip → knee → paw), gallop uchun ──
    function makeLeg(parent, x, z, front_) {
        const hip = new THREE.Group();
        hip.position.set(x, -0.18, z);
        parent.add(hip);
        const upLen = front_ ? 0.6 : 0.66;
        const upper = part(new THREE.CylinderGeometry(0.13, 0.1, upLen, 10), furMat);
        upper.position.y = -upLen / 2; hip.add(upper);
        const knee = new THREE.Group();
        knee.position.y = -upLen; hip.add(knee);
        const loLen = front_ ? 0.52 : 0.58;
        const lower = part(new THREE.CylinderGeometry(0.09, 0.06, loLen, 10), furMat);
        lower.position.y = -loLen / 2; knee.add(lower);
        const paw = part(new THREE.SphereGeometry(0.11, 12, 12), creamMat);
        paw.position.set(0.04, -loLen, 0); paw.scale.set(1.3, 0.7, 1.1); knee.add(paw);
        return { hip, knee, paw, world: new THREE.Vector3() };
    }
    // front group lokalida old oyoqlar; rear group lokalida orqa oyoqlar
    const legFL = makeLeg(front, 0.92, 0.26, true);
    const legFR = makeLeg(front, 0.92, -0.26, true);
    const legHL = makeLeg(rear, -0.7, 0.3, false);
    const legHR = makeLeg(rear, -0.7, -0.3, false);

    // ── Dum (uzun, orqaga oqib, hilpiraydi) ──
    const tailSegs = [];
    let tailPrev = rear;
    const TAIL_N = 9;
    for (let i = 0; i < TAIL_N; i++) {
        const r = 0.16 - i * 0.013;
        const seg = new THREE.Group();
        seg.position.set(i === 0 ? -1.0 : -0.26, i === 0 ? 0.1 : 0, 0);
        const m = part(new THREE.SphereGeometry(Math.max(0.04, r), 10, 10), i >= TAIL_N - 3 ? darkMat : furMat);
        m.scale.set(1.4, 0.9, 0.9); seg.add(m);
        tailPrev.add(seg); tailPrev = seg; tailSegs.push(seg);
    }

    // ═════════ Yer — tez surilib ketadigan tezlik teksturasi ═════════
    function groundTexture() {
        const c = document.createElement("canvas");
        c.width = 512; c.height = 128;
        const g = c.getContext("2d");
        g.fillStyle = "#10101f"; g.fillRect(0, 0, 512, 128);
        for (let i = 0; i < 70; i++) {
            const y = Math.random() * 128, len = 60 + Math.random() * 200, x = Math.random() * 512;
            g.strokeStyle = `rgba(232,160,32,${0.05 + Math.random() * 0.18})`;
            g.lineWidth = 1 + Math.random() * 2;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 2);
        return tex;
    }
    const groundTex = groundTexture();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 10),
        new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0.05 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -1.45, 0); ground.receiveShadow = true;
    scene.add(ground);

    // ═════════ Tezlik chiziqlari (orqaga uchadi) ═════════
    const LINES = 46;
    const speedLines = [];
    const lineMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.5 });
    function resetLine(s, initial) {
        s.position.set(4 + Math.random() * 9, -0.6 + Math.random() * 4.2, -2.5 + Math.random() * 5.5);
        s.userData.speed = 14 + Math.random() * 16;
        const len = 0.8 + Math.random() * 2.6;
        s.scale.set(len, 1, 1);
        s.material.opacity = 0.18 + Math.random() * 0.5;
        s.material.color.setHex(Math.random() < 0.5 ? GOLD : ACCENT);
        if (initial) s.position.x = -6 + Math.random() * 14;
    }
    for (let i = 0; i < LINES; i++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02, 0.02), lineMat.clone());
        s.userData = {}; resetLine(s, true); scene.add(s); speedLines.push(s);
    }

    // ═════════ Chang zarralari (oyoq ostidan) ═════════
    const dust = [];
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xcaa86a, transparent: true });
    for (let i = 0; i < 40; i++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), dustMat.clone());
        d.visible = false; d.userData = { life: 0, vx: 0, vy: 0, vz: 0 };
        scene.add(d); dust.push(d);
    }
    function emitDust(x, y, z) {
        for (const d of dust) {
            if (d.userData.life <= 0) {
                d.position.set(x, y, z);
                d.userData.life = 0.5 + Math.random() * 0.3;
                d.userData.vx = -1.8 - Math.random() * 2.2;     // orqaga
                d.userData.vy = 0.4 + Math.random() * 1.0;
                d.userData.vz = (Math.random() - 0.5) * 1.2;
                const sc = 0.6 + Math.random() * 1.4; d.scale.setScalar(sc);
                d.visible = true; d.material.opacity = 0.7;
                return;
            }
        }
    }

    // ═════════ Animatsiya ═════════
    const STRIDE = 2.7;                 // soniyasiga gallop tsikllari (juda tez)
    let t = 0;
    const clock = new THREE.Clock();
    let firstFrame = true;
    const groundY = -1.45;
    const legState = [
        { leg: legFL, off: 0.62, struck: false },
        { leg: legFR, off: 0.52, struck: false },
        { leg: legHL, off: 0.10, struck: false },
        { leg: legHR, off: 0.00, struck: false },
    ];

    function frame() {
        const dt = Math.min(clock.getDelta(), 0.05);
        t += dt;
        const p = (t * STRIDE) % 1;          // gallop fazasi [0,1)
        const ph = p * Math.PI * 2;

        // ── umurtqa egilishi (gather ↔ extend) ──
        const flex = Math.sin(ph);           // +1 yig'ilgan, -1 cho'zilgan
        front.rotation.z = -flex * 0.16;
        rear.rotation.z = flex * 0.20;
        front.position.x = -flex * 0.12;      // cho'zilganda yarimlar ajraladi
        rear.position.x = flex * 0.12;
        spine.scale.x = 1 + (-flex) * 0.06;

        // ── tana sakrashi (ikki suspension) ──
        root.position.y = 1.42 + Math.max(0, -Math.cos(ph)) * 0.34 + Math.max(0, Math.cos(ph)) * 0.12;
        root.position.z = Math.sin(ph) * 0.05;
        root.rotation.z = Math.sin(ph) * 0.04;

        // ── oyoqlar gallopi ──
        for (const st of legState) {
            const a = (p - st.off) * Math.PI * 2;
            const swing = Math.cos(a);
            st.leg.hip.rotation.z = swing * 0.95;                 // oldinga-orqaga zarba
            const fold = Math.max(0, Math.sin(a));               // recovery'da tizza bukiladi
            st.leg.knee.rotation.z = 0.35 + fold * 1.5;
            // yerga zarba lahzasida chang
            const contact = Math.cos(a) < -0.55;
            if (contact && !st.struck) {
                st.struck = true;
                st.leg.paw.getWorldPosition(st.leg.world);
                if (st.leg.world.y < groundY + 0.6)
                    emitDust(st.leg.world.x, groundY + 0.08, st.leg.world.z);
            } else if (!contact) st.struck = false;
        }

        // ── dum hilpirashi (orqaga oqib, to'lqinlanadi) ──
        tailSegs.forEach((seg, i) => {
            if (i === 0) { seg.rotation.z = -0.5 + Math.sin(ph) * 0.15; return; }
            seg.rotation.z = Math.sin(t * 9 - i * 0.55) * 0.28 + 0.06;
            seg.rotation.y = Math.sin(t * 7 - i * 0.4) * 0.18;
        });

        // ── bosh barqaror, ufqqa intiladi ──
        head.rotation.z = flex * 0.05 + Math.sin(t * 11) * 0.015;

        // ── yer surilishi ──
        groundTex.offset.x = (t * 1.6) % 1;

        // ── tezlik chiziqlari ──
        for (const s of speedLines) {
            s.position.x -= s.userData.speed * dt;
            if (s.position.x < -7) resetLine(s, false);
        }

        // ── chang ──
        for (const d of dust) {
            if (d.userData.life > 0) {
                d.userData.life -= dt;
                d.position.x += d.userData.vx * dt;
                d.position.y += d.userData.vy * dt;
                d.position.z += d.userData.vz * dt;
                d.userData.vy -= dt * 1.2;
                d.material.opacity = Math.max(0, d.userData.life) * 0.9;
                d.scale.multiplyScalar(1 + dt * 1.5);
                if (d.userData.life <= 0) d.visible = false;
            }
        }

        // ── kameraning yengil tebranishi (dinamika) ──
        camera.position.y = 2.7 + Math.sin(t * STRIDE * Math.PI * 2) * 0.07;
        camera.position.x = 5.6 + Math.sin(t * 0.3) * 0.4;
        camera.lookAt(0.2, 1.5, 0);

        renderer.render(scene, camera);
        if (firstFrame) { firstFrame = false; hideLoader(); }
    }

    let raf;
    function loop() { frame(); raf = requestAnimationFrame(loop); }
    if (reduce) frame(); else loop();

    function onResize() {
        camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H());
    }
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = null; }
        else if (!reduce && !raf) { clock.getDelta(); loop(); }
    });
})();

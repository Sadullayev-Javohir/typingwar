// tournament-trophy.js — Playoff markazidagi 3D OLTIN GEPARD KUBOGI (Three.js)
// Chalice (kubok) ustida sakrab turgan oltin gepard. Doimo aylanib turadi, o'zidan
// oltin yorug'lik taratadi (point light + emissive puls + uchqunlar). Turnir tugagach
// chempion "kubokni oladi" — yorqin nur portlashi, konfetti va chempion ismi.
// WebGL bo'lmasa — jim chiqib ketadi (CSS fallback 🏆 qoladi).
import * as THREE from "/lib/three/three.module.min.js";

const GOLD = 0xe8a020;
const BRIGHT = 0xffcc55;
const ACCENT = 0xff9900;

(function () {
    const mount = document.getElementById("tw-trophy-3d");
    if (!mount) return;

    try {
        const test = document.createElement("canvas");
        if (!(test.getContext("webgl") || test.getContext("experimental-webgl"))) return;
    } catch (e) { return; }

    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const W = () => mount.clientWidth || 300;
    const H = () => mount.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, W() / H(), 0.1, 100);
    // Butun kubok (poydevordan gepard boshigacha, ~y 0..4.1) kadrga sig'sin
    camera.position.set(0, 2.35, 9.6);
    camera.lookAt(0, 2.05, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W(), H());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    mount.appendChild(renderer.domElement);
    mount.querySelector(".tw-trophy-fallback")?.remove();

    // ───── Yorug'lik ─────
    scene.add(new THREE.AmbientLight(0x88611f, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 6, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(ACCENT, 1.1);
    rim.position.set(-4, 2, -3); scene.add(rim);
    // Kubokdan TARALADIGAN oltin nur
    const glow = new THREE.PointLight(GOLD, 2.2, 18, 1.6);
    glow.position.set(0, 2.4, 0.8); scene.add(glow);
    const glow2 = new THREE.PointLight(BRIGHT, 1.3, 12, 2);
    glow2.position.set(0, 3.7, 0.5); scene.add(glow2);
    // Aylanuvchi spot (yuzaga uchqunlar o'ynashi uchun)
    const spot = new THREE.SpotLight(BRIGHT, 1.6, 16, Math.PI / 6, 0.6, 1.2);
    spot.position.set(2.5, 5.5, 3.5); spot.target.position.set(0, 2.6, 0);
    scene.add(spot); scene.add(spot.target);

    // ───── Materiallar ─────
    const goldMat = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.96, roughness: 0.22, emissive: GOLD, emissiveIntensity: 0.18 });
    const brightMat = new THREE.MeshStandardMaterial({ color: BRIGHT, metalness: 1.0, roughness: 0.14, emissive: ACCENT, emissiveIntensity: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x6e4a10, metalness: 0.9, roughness: 0.45, emissive: 0x2a1c05, emissiveIntensity: 0.2 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1205, metalness: 0.4, roughness: 0.3 });
    const emissives = [goldMat, brightMat]; // pulsatsiya uchun

    function part(geo, mat) { return new THREE.Mesh(geo, mat); }

    // ═════════ Butun kubok (aylanadigan) ═════════
    const trophy = new THREE.Group();
    scene.add(trophy);

    // ── Poydevor (pedestal) ──
    const base = new THREE.Group(); trophy.add(base);
    base.add(part(new THREE.CylinderGeometry(1.15, 1.35, 0.34, 40), goldMat)); // pastki disk
    const plinth = part(new THREE.BoxGeometry(1.7, 0.42, 1.7), darkMat);       // qora-oltin marmar blok
    plinth.position.y = 0.34; base.add(plinth);
    const ring = part(new THREE.TorusGeometry(0.86, 0.07, 16, 48), brightMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.56; base.add(ring);
    // chempion nomi uchun oltin plaketka (old yuzada)
    const plaque = part(new THREE.BoxGeometry(1.1, 0.26, 0.05), brightMat);
    plaque.position.set(0, 0.34, 0.86); base.add(plaque);

    // ── Oyoq (stem) ──
    const stem = part(new THREE.CylinderGeometry(0.16, 0.26, 0.85, 24), goldMat);
    stem.position.y = 1.05; trophy.add(stem);
    const knob = part(new THREE.SphereGeometry(0.24, 20, 16), brightMat);
    knob.position.y = 1.5; trophy.add(knob);

    // ── Kosa (chalice) — lathe profili ──
    const prof = [
        [0.18, 0.00], [0.55, 0.05], [0.78, 0.22], [0.86, 0.55],
        [0.80, 0.92], [0.66, 1.18], [0.70, 1.30], [0.74, 1.40]
    ].map(p => new THREE.Vector2(p[0], p[1]));
    const bowl = part(new THREE.LatheGeometry(prof, 48), goldMat);
    bowl.position.y = 1.62; trophy.add(bowl);
    // kosa labi (yorqin halqa)
    const lip = part(new THREE.TorusGeometry(0.74, 0.045, 14, 48), brightMat);
    lip.rotation.x = Math.PI / 2; lip.position.y = 1.62 + 1.40; trophy.add(lip);

    // ── Ikki dasta (handles) ──
    function handle(side) {
        const h = part(new THREE.TorusGeometry(0.34, 0.06, 14, 32, Math.PI * 1.15), goldMat);
        h.position.set(0.82 * side, 2.55, 0);
        h.rotation.z = side > 0 ? -0.5 : Math.PI + 0.5;
        trophy.add(h);
    }
    handle(1); handle(-1);

    // ═════════ G'URUR BILAN O'TIRGAN OLTIN GEPARD (kosa ustida, kameraga qaragan) ═════════
    // +Z = kameraga qarab. Bosh aniq ko'rinadi: quloqlar, ko'zlar, tumshuq,
    // gepardning belgisi — ko'z yoshi chiziqlari, va tanada qora xollar.
    const cat = new THREE.Group();
    cat.position.set(0, 2.98, 0);   // kosa labida o'tiradi
    cat.scale.setScalar(0.95);
    trophy.add(cat);

    // ── dumba / o'tirgan tag qismi (orqada) ──
    const rump = part(new THREE.SphereGeometry(0.46, 22, 18), goldMat);
    rump.position.set(0, 0.42, -0.34); rump.scale.set(1, 0.92, 1.05); cat.add(rump);
    // bukilgan orqa oyoq (har ikki yon) — o'tirgan holat
    [-1, 1].forEach(s => {
        const thigh = part(new THREE.SphereGeometry(0.27, 16, 14), goldMat);
        thigh.position.set(0.34 * s, 0.34, -0.05); thigh.scale.set(0.85, 0.95, 1.25); cat.add(thigh);
        const shin = part(new THREE.CapsuleGeometry(0.1, 0.34, 8, 14), goldMat);
        shin.position.set(0.36 * s, 0.16, 0.28); shin.rotation.x = 0.5; cat.add(shin);
        const hpaw = part(new THREE.SphereGeometry(0.13, 12, 10), goldMat);
        hpaw.position.set(0.36 * s, 0.06, 0.46); hpaw.scale.set(1, 0.7, 1.3); cat.add(hpaw);
    });

    // ── tana (dumbadan ko'kragacha ko'tarilgan) ──
    const torso = part(new THREE.CapsuleGeometry(0.36, 0.5, 12, 20), goldMat);
    torso.position.set(0, 0.72, -0.02); torso.rotation.x = 0.36; cat.add(torso);
    // ko'krak (oldinga, kameraga) — tik o'tirgan gepardning kuchli ko'kragi
    const chest = part(new THREE.SphereGeometry(0.36, 20, 18), goldMat);
    chest.position.set(0, 0.96, 0.2); chest.scale.set(0.92, 1.05, 0.95); cat.add(chest);

    // ── tik old oyoqlar (kosa labiga tushadi) ──
    [-1, 1].forEach(s => {
        const fore = part(new THREE.CapsuleGeometry(0.11, 0.66, 10, 16), goldMat);
        fore.position.set(0.2 * s, 0.46, 0.42); fore.rotation.x = 0.08; cat.add(fore);
        const fpaw = part(new THREE.SphereGeometry(0.14, 14, 12), brightMat);
        fpaw.position.set(0.2 * s, 0.1, 0.5); fpaw.scale.set(1, 0.7, 1.35); cat.add(fpaw);
    });

    // ── bo'yin + bosh (g'urur bilan tik, kameraga qaragan) ──
    const neck = part(new THREE.CylinderGeometry(0.2, 0.27, 0.42, 18), goldMat);
    neck.position.set(0, 1.24, 0.16); neck.rotation.x = 0.18; cat.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 1.5, 0.24);
    cat.add(head);
    const skull = part(new THREE.SphereGeometry(0.3, 22, 18), goldMat);
    skull.scale.set(1, 0.96, 0.98); head.add(skull);
    // tumshuq (kameraga, +Z)
    const muzzle = part(new THREE.CylinderGeometry(0.15, 0.2, 0.26, 16), goldMat);
    muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, -0.1, 0.24); muzzle.scale.set(1, 1, 0.9); head.add(muzzle);
    const nose = part(new THREE.SphereGeometry(0.08, 12, 12), darkMat);
    nose.position.set(0, -0.07, 0.38); nose.scale.set(1.2, 0.8, 1); head.add(nose);
    // og'iz chizig'i
    const mouth = part(new THREE.BoxGeometry(0.16, 0.025, 0.03), darkMat);
    mouth.position.set(0, -0.2, 0.34); head.add(mouth);

    [-1, 1].forEach((s) => {
        // dumaloq quloqlar (gepardga xos)
        const ear = part(new THREE.SphereGeometry(0.12, 14, 12), goldMat);
        ear.position.set(0.16 * s, 0.28, -0.02); ear.scale.set(0.8, 1, 0.55); head.add(ear);
        const earIn = part(new THREE.SphereGeometry(0.07, 12, 10), darkMat);
        earIn.position.set(0.16 * s, 0.28, 0.03); earIn.scale.set(0.7, 0.9, 0.5); head.add(earIn);
        // ko'zlar (oldinga qaragan)
        const eye = part(new THREE.SphereGeometry(0.06, 14, 12), eyeMat);
        eye.position.set(0.13 * s, 0.07, 0.27); head.add(eye);
        const glint = part(new THREE.SphereGeometry(0.018, 8, 8), brightMat);
        glint.position.set(0.15 * s, 0.1, 0.31); head.add(glint);
        // GEPARD BELGISI — ko'z yoshi chizig'i (ko'zdan tumshuqgacha qora yo'l)
        const tear = part(new THREE.BoxGeometry(0.035, 0.26, 0.02), darkMat);
        tear.position.set(0.1 * s, -0.1, 0.3); tear.rotation.z = 0.18 * s; head.add(tear);
    });

    // ── uzun dum (gepardning uzun dumi — yonidan yuqoriga jingalak) ──
    const tailCurve = [
        [-0.05, 0.42, -0.4], [0.34, 0.24, -0.5], [0.66, 0.22, -0.5],
        [0.86, 0.46, -0.42], [0.9, 0.82, -0.3], [0.74, 1.06, -0.18]
    ];
    const tailSegs = [];
    tailCurve.forEach((p, i) => {
        const seg = part(new THREE.SphereGeometry(0.15 - i * 0.013, 14, 12), i >= 4 ? darkMat : goldMat);
        seg.position.set(p[0], p[1], p[2]); cat.add(seg); tailSegs.push(seg);
    });

    // ── gepard xollari (tanada qora dog'lar — oltin yuzada urg'u) ──
    const spotMat = new THREE.MeshStandardMaterial({ color: 0x3a2607, metalness: 0.85, roughness: 0.5 });
    function spot3d(parent, r, count) {
        for (let i = 0; i < count; i++) {
            const u = Math.random() * Math.PI - Math.PI * 0.15;   // old/yon tomonga
            const v = (Math.random() - 0.2) * Math.PI * 0.8;
            const sp = part(new THREE.SphereGeometry(0.035 + Math.random() * 0.02, 8, 8), spotMat);
            sp.position.set(Math.sin(v) * Math.cos(u) * r, Math.cos(v) * r * 0.9, Math.abs(Math.sin(u)) * r);
            sp.scale.set(1, 1, 0.4);
            parent.add(sp);
        }
    }
    spot3d(rump, 0.46, 7);
    spot3d(chest, 0.36, 5);
    spot3d(torso, 0.36, 4);

    // ───── Uchqunlar (kubok atrofida orbitada uchadi) ─────
    const sparks = [];
    for (let i = 0; i < 26; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6),
            new THREE.MeshBasicMaterial({ color: i % 2 ? BRIGHT : ACCENT, transparent: true, opacity: 0.9 }));
        s.userData = {
            r: 1.4 + Math.random() * 1.7, a: Math.random() * Math.PI * 2,
            y: 0.5 + Math.random() * 4.0, sp: 0.4 + Math.random() * 0.8, ph: Math.random() * 6
        };
        scene.add(s); sparks.push(s);
    }

    // ───── Konfetti (chempion portlashi) ─────
    const confetti = [];
    const confColors = [GOLD, BRIGHT, ACCENT, 0xffffff, 0xffd700];
    for (let i = 0; i < 90; i++) {
        const c = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.18),
            new THREE.MeshBasicMaterial({ color: confColors[i % confColors.length], side: THREE.DoubleSide, transparent: true }));
        c.visible = false; c.userData = { life: 0, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0 };
        scene.add(c); confetti.push(c);
    }
    function burst() {
        for (const c of confetti) {
            c.position.set((Math.random() - 0.5) * 0.6, 4.1, (Math.random() - 0.5) * 0.6);
            c.userData.life = 2.4 + Math.random() * 1.4;
            c.userData.vx = (Math.random() - 0.5) * 4.5;
            c.userData.vy = 3.5 + Math.random() * 3.5;
            c.userData.vz = (Math.random() - 0.5) * 4.5;
            c.userData.rx = (Math.random() - 0.5) * 10;
            c.userData.rz = (Math.random() - 0.5) * 10;
            c.visible = true; c.material.opacity = 1;
        }
    }

    // ───── Chempion rejimi ─────
    let champ = false, champPulse = 0;
    function celebrate(name) {
        champ = true; champPulse = 1;
        burst();
        const cap = document.getElementById("tw-trophy-caption");
        if (cap && name) {
            cap.innerHTML = `<i class="bi bi-trophy-fill"></i> Chempion: <b>${String(name).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</b>`;
            cap.classList.add("tw-trophy-won");
        }
        mount.classList.add("tw-trophy-celebrate");
    }
    // Tashqaridan boshqarish (tournament.js → CustomEvent)
    window.TWTrophy = { celebrate };
    window.addEventListener("tw-trophy-champion", (e) => celebrate(e.detail && e.detail.name));

    // ───── Animatsiya ─────
    let t = 0, raf = null;
    const clock = new THREE.Clock();

    function frame() {
        const dt = Math.min(clock.getDelta(), 0.05);
        t += dt;

        if (mount.clientWidth === 0) { return; } // ko'rinmas — chizmaymiz

        const spin = champ ? 0.9 : 0.45;
        trophy.rotation.y += dt * spin;
        trophy.position.y = Math.sin(t * 1.4) * 0.06;

        // emissive + nur pulsatsiyasi
        const base = champ ? 0.5 : 0.18;
        const pulse = base + Math.sin(t * 3) * 0.12 + champPulse * 0.6;
        emissives.forEach(m => m.emissiveIntensity = pulse);
        glow.intensity = (champ ? 3.4 : 2.2) + Math.sin(t * 3) * 0.5 + champPulse * 3;
        glow2.intensity = (champ ? 2.2 : 1.2) + Math.sin(t * 4 + 1) * 0.3;
        if (champPulse > 0) champPulse = Math.max(0, champPulse - dt * 0.5);

        // aylanuvchi spot
        spot.position.set(Math.cos(t * 0.8) * 3.2, 5, Math.sin(t * 0.8) * 3.2);

        // dum silkinishi
        tailSegs.forEach((seg, i) => { if (i >= 2) seg.position.x = tailCurve[i][0] + Math.sin(t * 3 - i) * 0.05; });
        // bosh tirik harakati (atrofga nazar) + nafas
        head.rotation.y = Math.sin(t * 0.7) * 0.14;
        head.position.y = 1.5 + Math.sin(t * 1.6) * 0.016;

        // uchqunlar orbitada
        for (const s of sparks) {
            const u = s.userData;
            u.a += dt * u.sp * (champ ? 1.8 : 1);
            s.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 1.5 + u.ph) * 0.25, Math.sin(u.a) * u.r);
            s.material.opacity = 0.5 + Math.sin(t * 4 + u.ph) * 0.4;
            const sc = champ ? 1.5 : 1; s.scale.setScalar(sc);
        }

        // konfetti
        for (const c of confetti) {
            if (c.userData.life > 0) {
                c.userData.life -= dt;
                c.userData.vy -= 6 * dt; // gravitatsiya
                c.position.x += c.userData.vx * dt;
                c.position.y += c.userData.vy * dt;
                c.position.z += c.userData.vz * dt;
                c.rotation.x += c.userData.rx * dt;
                c.rotation.z += c.userData.rz * dt;
                c.material.opacity = Math.min(1, c.userData.life);
                if (c.userData.life <= 0) c.visible = false;
            }
        }

        renderer.render(scene, camera);
    }

    function loop() { frame(); raf = requestAnimationFrame(loop); }
    if (reduce) frame(); else loop();

    function onResize() {
        if (!W() || !H()) return;
        camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H());
    }
    window.addEventListener("resize", onResize);
    // bracket ko'rinib qolganda o'lcham 0 dan tiklanishi uchun
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(mount);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = null; }
        else if (!reduce && !raf) { clock.getDelta(); loop(); }
    });
})();

// home-cheetah.js — Bosh sahifa: klaviaturada JUDA TEZ yozayotgan 3D gepard (Three.js)
// Gepard klaviatura ortida o'tiradi, ikki panja klavishlarni gupillatib bosadi,
// bosilgan klavish oltin rangda yonadi + uchqun chiqadi. Dizayn ranglariga mos.
// WebGL bo'lmasa — jim chiqib ketadi (fallback logo qoladi).
import * as THREE from "/lib/three/three.module.min.js";

const GOLD = 0xe8a020;
const ACCENT = 0xff9900;

(function () {
    const mount = document.getElementById("tw-cheetah-3d");
    if (!mount) return;

    // Loader — gepard sahnasi tayyor bo'lguncha ko'rsatiladi (faqat /home da bor)
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
    const camera = new THREE.PerspectiveCamera(36, W() / H(), 0.1, 100);
    camera.position.set(1.9, 4.0, 4.6);
    camera.lookAt(0, 1.15, 0.9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W(), H());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);
    mount.querySelector(".tw-cheetah-fallback")?.remove();

    // ───── Yorug'lik ─────
    scene.add(new THREE.AmbientLight(0xb9c2ff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.45);
    key.position.set(3, 7, 5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1; key.shadow.camera.far = 25;
    key.shadow.camera.left = -6; key.shadow.camera.right = 6;
    key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
    scene.add(key);
    const rim = new THREE.DirectionalLight(ACCENT, 1.0);
    rim.position.set(-5, 3, -4); scene.add(rim);
    const glow = new THREE.PointLight(GOLD, 0.8, 14);
    glow.position.set(0, 1.4, 2.6); scene.add(glow);
    // klaviaturaga fokus nuri (bosish aniq ko'rinishi uchun)
    const kbSpot = new THREE.SpotLight(0xfff2d8, 2.4, 8, Math.PI / 5, 0.5, 1.2);
    kbSpot.position.set(0.5, 3.6, 3.2);
    kbSpot.target.position.set(0, 1.15, 0.95);
    scene.add(kbSpot); scene.add(kbSpot.target);

    // ───── Gepard terisi teksturasi ─────
    function furTexture() {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const g = c.getContext("2d");
        const grd = g.createLinearGradient(0, 0, 0, 256);
        grd.addColorStop(0, "#f0b84a"); grd.addColorStop(0.6, "#e8a020"); grd.addColorStop(1, "#c47e12");
        g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
        g.fillStyle = "rgba(20,14,6,0.82)";
        for (let i = 0; i < 90; i++) {
            const x = Math.random() * 256, y = Math.random() * 256, r = 4 + Math.random() * 7;
            g.beginPath();
            g.ellipse(x, y, r, r * (0.6 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
            g.fill();
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
        return tex;
    }
    const furMat = new THREE.MeshStandardMaterial({ map: furTexture(), roughness: 0.75, metalness: 0.05 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a120a, roughness: 0.6 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xf6e3bf, roughness: 0.8 });

    function part(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; }

    // ═════════ Gepard (o'tirgan, oldinga engashgan) ═════════
    const cheetah = new THREE.Group();
    cheetah.position.set(0, 0, -0.2);
    scene.add(cheetah);

    // O'tirgan dumba
    const haunch = part(new THREE.SphereGeometry(0.95, 18, 18), furMat);
    haunch.position.set(0, 0.85, -0.9); haunch.scale.set(1.15, 0.9, 1.1);
    cheetah.add(haunch);

    // Tana (vertikal, oldinga engashgan)
    const torso = part(new THREE.CapsuleGeometry(0.62, 1.0, 8, 16), furMat);
    torso.position.set(0, 1.65, -0.15); torso.rotation.x = 0.45; torso.scale.set(1, 1, 0.85);
    cheetah.add(torso);

    // Ko'krak (oq tukli)
    const chest = part(new THREE.SphereGeometry(0.5, 16, 16), creamMat);
    chest.position.set(0, 1.55, 0.42); chest.scale.set(0.85, 1.1, 0.7);
    cheetah.add(chest);

    // Bo'yin
    const neck = part(new THREE.CylinderGeometry(0.3, 0.42, 0.7, 14), furMat);
    neck.position.set(0, 2.3, 0.18); neck.rotation.x = 0.55;
    cheetah.add(neck);

    // ───── Bosh (klaviaturaga qarab pastga egilgan) ─────
    const head = new THREE.Group();
    head.position.set(0, 2.62, 0.45); head.rotation.x = 0.62;
    cheetah.add(head);
    const skull = part(new THREE.SphereGeometry(0.42, 16, 16), furMat);
    skull.scale.set(1, 0.96, 0.95); head.add(skull);
    const snout = part(new THREE.CylinderGeometry(0.2, 0.3, 0.4, 12), furMat);
    snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.12, 0.42); head.add(snout);
    const nose = part(new THREE.SphereGeometry(0.1, 10, 10), darkMat);
    nose.position.set(0, -0.08, 0.64); head.add(nose);
    [-1, 1].forEach((s) => {
        const ear = part(new THREE.ConeGeometry(0.17, 0.28, 12), furMat);
        ear.position.set(0.24 * s, 0.38, -0.05); ear.rotation.z = -0.2 * s; head.add(ear);
        const inEar = part(new THREE.ConeGeometry(0.09, 0.18, 10), darkMat);
        inEar.position.set(0.24 * s, 0.36, 0.0); inEar.rotation.z = -0.2 * s; head.add(inEar);
    });
    // Ko'zlar (diqqat bilan klaviaturaga qaragan) + ko'z yoshi chizig'i
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x120a02, roughness: 0.2 });
    [-1, 1].forEach((s) => {
        const eye = part(new THREE.SphereGeometry(0.09, 12, 12), eyeMat);
        eye.position.set(0.18 * s, 0.06, 0.34); head.add(eye);
        const spark = part(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        spark.position.set(0.18 * s + 0.02, 0.1, 0.41); head.add(spark);
        const tear = part(new THREE.BoxGeometry(0.05, 0.34, 0.04), darkMat);
        tear.position.set(0.16 * s, -0.16, 0.36); tear.rotation.x = -0.5; head.add(tear);
    });

    // ───── Dum (yon tomonga jingalak) ─────
    let tp = cheetah, prevSegs = [];
    let curve = [[0.0, 0.9, -1.7], [0.8, 0.7, -1.6], [1.3, 0.9, -1.0], [1.4, 1.2, -0.3], [1.1, 1.4, 0.2]];
    for (let i = 0; i < curve.length; i++) {
        const r = 0.18 - i * 0.025;
        const seg = part(new THREE.SphereGeometry(r, 10, 10), i >= 3 ? darkMat : furMat);
        seg.position.set(curve[i][0], curve[i][1], curve[i][2]);
        cheetah.add(seg); prevSegs.push(seg);
    }
    const tailTip = prevSegs;

    // ───── Qo'llar (yelka → tirsak → panja), tez bosish uchun ─────
    function makeArm(side) {
        const shoulder = new THREE.Group();
        shoulder.position.set(0.5 * side, 2.05, 0.35);
        cheetah.add(shoulder);
        const upLen = 0.6;
        const upper = part(new THREE.CylinderGeometry(0.16, 0.13, upLen, 10), furMat);
        upper.position.y = -upLen / 2; shoulder.add(upper);
        shoulder.rotation.x = -1.05;          // oldinga-pastga cho'zilgan
        shoulder.rotation.z = 0.12 * side;
        const elbow = new THREE.Group();
        elbow.position.y = -upLen; shoulder.add(elbow);
        const foLen = 0.55;
        const fore = part(new THREE.CylinderGeometry(0.12, 0.09, foLen, 10), furMat);
        fore.position.y = -foLen / 2; elbow.add(fore);
        elbow.rotation.x = -1.1;              // tirsak bukilgan, panja klaviaturaga
        const paw = part(new THREE.SphereGeometry(0.18, 14, 14), creamMat);
        paw.position.set(0, -foLen, 0.04); paw.scale.set(1.35, 0.7, 1.5);
        elbow.add(paw);
        // barmoq yostiqchalari (bosayotgani aniq ko'rinishi uchun)
        for (let i = -1; i <= 1; i++) {
            const toe = part(new THREE.SphereGeometry(0.075, 8, 8), creamMat);
            toe.position.set(i * 0.13, -foLen - 0.03, 0.2);
            elbow.add(toe);
        }
        return { shoulder, elbow, paw, side };
    }
    const arms = [makeArm(-1), makeArm(1)];

    // ═════════ Noutbuk (laptop) — klaviatura paneli ═════════
    const kb = new THREE.Group();
    kb.position.set(0, 1.05, 0.95); kb.rotation.x = -0.16;
    scene.add(kb);
    const COLS = 9, ROWS = 3, SP = 0.34, SPZ = 0.36, KW = 0.3;
    const base = part(new THREE.BoxGeometry(COLS * SP + 0.34, 0.12, ROWS * SPZ + 0.5),
        new THREE.MeshStandardMaterial({ color: 0x16162a, roughness: 0.5, metalness: 0.45 }));
    base.position.set(0, 0, 0.1); base.receiveShadow = true; kb.add(base);
    // oltin ramka chizig'i
    const kbFrame = part(new THREE.BoxGeometry(COLS * SP + 0.36, 0.06, ROWS * SPZ + 0.36),
        new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 0.25, roughness: 0.4 }));
    kbFrame.position.y = -0.07; kb.add(kbFrame);

    const keys = [], keyWorld = [];
    const tmp = new THREE.Vector3();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const km = new THREE.MeshStandardMaterial({ color: 0x3c3c60, emissive: GOLD, emissiveIntensity: 0, roughness: 0.35, metalness: 0.2 });
            const k = part(new THREE.BoxGeometry(KW, 0.16, KW), km);
            const x = (c - (COLS - 1) / 2) * SP;
            const z = (r - (ROWS - 1) / 2) * SPZ;
            k.position.set(x, 0.1, z);
            k.userData = { restY: 0.1, press: 0 };
            kb.add(k); keys.push(k);
            k.getWorldPosition(tmp); keyWorld.push(tmp.clone());
        }
    }

    // ───── Noutbuk ekrani (qopqoq) — orqa qirrada, gepardga qaragan ─────
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.0, (ROWS - 1) / 2 * SPZ + 0.32);   // kameraga yaqin (uzoq) qirra
    lidPivot.rotation.x = 0.32;                                   // tepasi orqaga egiladi
    kb.add(lidPivot);
    const lidW = COLS * SP + 0.34, lidH = 0.82;
    const lid = part(new THREE.BoxGeometry(lidW, lidH, 0.07),
        new THREE.MeshStandardMaterial({ color: 0x14142a, roughness: 0.5, metalness: 0.5 }));
    lid.position.y = lidH / 2; lidPivot.add(lid);
    // ekran paneli (gepardga qaragan -z yuzi — yoniq)
    const screen = part(new THREE.PlaneGeometry(lidW - 0.16, lidH - 0.16),
        new THREE.MeshStandardMaterial({ color: 0x0f0f1a, emissive: GOLD, emissiveIntensity: 0.55, roughness: 0.3, side: THREE.DoubleSide }));
    screen.position.set(0, lidH / 2, -0.045); screen.rotation.y = Math.PI;
    lidPivot.add(screen);
    // orqa qopqoqdagi yongan logo (kameraga qaraydi)
    const emblem = part(new THREE.CircleGeometry(0.17, 28),
        new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 0.9, roughness: 0.3 }));
    emblem.position.set(0, lidH * 0.56, 0.05); lidPivot.add(emblem);
    // ekran nuri — gepard yuziga tushadi
    const screenLight = new THREE.PointLight(GOLD, 1.1, 5);
    screenLight.position.set(0, lidH * 0.5, -0.5); lidPivot.add(screenLight);

    // ───── Uchqunlar (klavish bosilganda otiladi) ─────
    const sparks = [];
    const sparkMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true });
    for (let i = 0; i < 30; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), sparkMat.clone());
        s.visible = false; s.userData = { life: 0, vy: 0, vx: 0, vz: 0 };
        scene.add(s); sparks.push(s);
    }
    function emitSpark(pos) {
        for (const s of sparks) {
            if (s.userData.life <= 0) {
                s.position.copy(pos); s.position.y += 0.12;
                s.userData.life = 0.32;
                s.userData.vy = 1.2 + Math.random() * 1.0;
                s.userData.vx = (Math.random() - 0.5) * 1.2;
                s.userData.vz = (Math.random() - 0.5) * 1.2;
                s.visible = true; s.material.opacity = 1;
                return;
            }
        }
    }

    // bosilgan klavishni yondirish
    function pressKeyNear(worldPos, side) {
        let best = -1, bd = 1e9;
        for (let i = 0; i < keyWorld.length; i++) {
            // panja tomoniga mos klavishlarni afzal ko'rish
            if (side < 0 && keyWorld[i].x > 0.4) continue;
            if (side > 0 && keyWorld[i].x < -0.4) continue;
            const dx = keyWorld[i].x - worldPos.x, dz = keyWorld[i].z - worldPos.z;
            const d = dx * dx + dz * dz;
            if (d < bd) { bd = d; best = i; }
        }
        if (best >= 0) {
            keys[best].userData.press = 1;
            emitSpark(keyWorld[best]);
        }
    }

    // ───── Yer ─────
    const ground = new THREE.Mesh(new THREE.CircleGeometry(7, 48),
        new THREE.MeshStandardMaterial({ color: 0x121224, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
    scene.add(ground);

    // ───── Stol (desk) — noutbuk ustida turadi ─────
    const desk = new THREE.Group();
    scene.add(desk);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.65, metalness: 0.1 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1b1b2a, roughness: 0.5, metalness: 0.5 });
    const deskTop = part(new THREE.BoxGeometry(5.6, 0.16, 2.9), deskMat);
    deskTop.position.set(0, 0.91, 0.7); deskTop.receiveShadow = true; desk.add(deskTop);
    const legGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.91, 12);
    [[-2.5, -0.5], [2.5, -0.5], [-2.5, 1.8], [2.5, 1.8]].forEach(([lx, lz]) => {
        const leg = part(legGeo, legMat); leg.position.set(lx, 0.455, lz); desk.add(leg);
    });

    // ───── Stul suyanchig'i (gepard ortida — "o'tirgan" hissi) ─────
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x20202e, roughness: 0.6, metalness: 0.3 });
    const chairBack = part(new THREE.BoxGeometry(1.7, 1.7, 0.16), chairMat);
    chairBack.position.set(0, 1.55, -2.0); desk.add(chairBack);
    const chairTop = part(new THREE.CylinderGeometry(0.13, 0.13, 1.7, 12), chairMat);
    chairTop.rotation.z = Math.PI / 2; chairTop.position.set(0, 2.45, -2.0); desk.add(chairTop);

    // ───── Animatsiya ─────
    const FREQ = 17;            // bosish tezligi — tez, lekin aniq ko'rinadi
    const HIT = [0, 1];         // har panja uchun oxirgi yarim-davr indeksi
    let t = 0;
    const clock = new THREE.Clock();
    const pawWorld = new THREE.Vector3();
    let firstFrame = true;

    function frame() {
        const dt = Math.min(clock.getDelta(), 0.05);
        t += dt;

        // panjalar gupillatib bosadi (chap/o'ng navbatma-navbat)
        arms.forEach((arm, idx) => {
            const ang = t * FREQ + idx * Math.PI;     // chap-o'ng faza
            const lift = Math.max(0, Math.cos(ang));         // 0 = klavishni urgan payt
            // panja klaviaturaga pastga-oldinga cho'ziladi; lift bo'lsa ko'tariladi
            arm.shoulder.rotation.x = -0.8 - lift * 0.28;
            arm.elbow.rotation.x = 0.15 + lift * 0.65;       // tirsak aniq ko'tarilib-tushadi
            // gorizontal mayda siljish (turli klavishlarni bosgandek)
            arm.shoulder.rotation.z = 0.12 * arm.side + Math.sin(t * 6 + idx) * 0.14;

            // pastki nuqtaga yetganda klavish bos + uchqun
            const half = Math.floor((ang) / Math.PI);
            if (half !== HIT[idx] && Math.cos(ang) < -0.3) {
                HIT[idx] = half;
                arm.paw.getWorldPosition(pawWorld);
                pressKeyNear(pawWorld, arm.side);
            }
        });

        // klavishlar bosilishi va oltin nuri so'nishi
        for (const k of keys) {
            if (k.userData.press > 0) {
                k.userData.press = Math.max(0, k.userData.press - dt * 6);
                const p = k.userData.press;
                k.position.y = k.userData.restY - p * 0.09;
                k.material.emissiveIntensity = p * 1.3;
                const s = 1 + p * 0.12; k.scale.set(s, 1, s);
            }
        }

        // uchqunlar
        for (const s of sparks) {
            if (s.userData.life > 0) {
                s.userData.life -= dt;
                s.position.x += s.userData.vx * dt;
                s.position.y += s.userData.vy * dt;
                s.position.z += s.userData.vz * dt;
                s.material.opacity = Math.max(0, s.userData.life / 0.32);
                if (s.userData.life <= 0) s.visible = false;
            }
        }

        // bosh va tana yengil tebranishi (diqqat bilan yozyapti)
        head.rotation.x = 0.62 + Math.sin(t * 9) * 0.03;
        cheetah.rotation.z = Math.sin(t * 12) * 0.012;
        torso.position.y = 1.65 + Math.sin(t * 12) * 0.015;

        // dum uchining hayajonli silkinishi
        tailTip.forEach((seg, i) => {
            if (i >= 2) seg.position.y = curve[i][1] + Math.sin(t * 6 - i) * 0.12;
        });

        // kameraning juda yumshoq tebranishi
        camera.position.x = 1.9 + Math.sin(t * 0.22) * 0.55;
        camera.lookAt(0, 1.15, 0.9);

        renderer.render(scene, camera);

        // birinchi kadr chizilgach loader yashiriladi (gepard endi ko'rinadi)
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

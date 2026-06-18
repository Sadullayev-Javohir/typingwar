/* TypingWar — klaviatura ovozi (WebAudio sintez, audio fayl kerak emas).
   Har bir profil: noise (korpus "clack"), body (thock tanasi), click (o'tkir
   transient) bo'laklaridan tashkil topadi. Qimmat mexanik switch'lar shu
   bo'laklarning nisbati/filtri orqali taqlid qilinadi. */
(function () {
    "use strict";

    let ctx = null;
    let master = null;
    function audio() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
                ctx = new AC();
                master = ctx.createGain();
                master.gain.value = 0.9;
                master.connect(ctx.destination);
            }
        }
        if (ctx && ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    // Oq shovqin buferi (har xil davomiylik uchun kichik bufer)
    function noiseBuffer(ac, dur) {
        const len = Math.max(1, Math.floor(ac.sampleRate * dur));
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return buf;
    }

    // Shovqin bo'lagi — korpus/plastik "clack"
    function playNoise(ac, now, n) {
        const src = ac.createBufferSource();
        src.buffer = noiseBuffer(ac, n.dur);
        const g = ac.createGain();
        let node = src;
        if (n.hp) { const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = n.hp; node.connect(f); node = f; }
        if (n.lp) { const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = n.lp; node.connect(f); node = f; }
        node.connect(g).connect(master);
        g.gain.setValueAtTime(n.gain, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + n.dur);
        src.start(now);
        src.stop(now + n.dur + 0.01);
    }

    // Tonli bo'lak — thock tanasi yoki o'tkir click
    function playOsc(ac, now, o) {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = o.type || "sine";
        osc.frequency.setValueAtTime(o.freq, now);
        if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, now + o.dur);
        g.gain.setValueAtTime(o.gain, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + o.dur);
        osc.connect(g).connect(master);
        osc.start(now);
        osc.stop(now + o.dur + 0.01);
    }

    /* Profillar — bo'laklar massivi orqali. ok=false (xato bosish) → pastroq, jimroq. */
    const PROFILES = {
        // Asl 3 profil (yangi dvigatelda qayta sozlangan)
        Soft:        { body: { type: "sine", freq: 320, dur: 0.04, gain: 0.05 } },
        Mechanical:  { noise: { dur: 0.03, gain: 0.12, hp: 1500, lp: 6000 }, body: { type: "square", freq: 180, dur: 0.03, gain: 0.05 } },
        Typewriter:  { click: { type: "square", freq: 2500, dur: 0.015, gain: 0.09 }, noise: { dur: 0.05, gain: 0.18, hp: 800 }, body: { type: "triangle", freq: 110, dur: 0.06, gain: 0.08 } },

        // ── Qimmat mexanik switch'lar ──
        // Cherry MX Blue — clicky, o'tkir "click jacket"
        CherryBlue:  { click: { type: "square", freq: 3200, dur: 0.012, gain: 0.14 }, noise: { dur: 0.02, gain: 0.10, hp: 2500 }, body: { type: "square", freq: 200, dur: 0.02, gain: 0.04 } },
        // Cherry MX Brown — tactile bump, click yo'q
        CherryBrown: { noise: { dur: 0.025, gain: 0.09, hp: 1200, lp: 5000 }, body: { type: "triangle", freq: 170, dur: 0.03, gain: 0.06 } },
        // Cherry MX Red — linear, yumshoq
        CherryRed:   { noise: { dur: 0.02, gain: 0.05, hp: 900 }, body: { type: "sine", freq: 150, dur: 0.035, gain: 0.07 } },
        // Holy Panda — premium tactile, chuqur thock
        HolyPanda:   { noise: { dur: 0.03, gain: 0.08, hp: 1500, lp: 4000 }, body: { type: "sine", freq: 120, freqEnd: 90, dur: 0.06, gain: 0.12 } },
        // Gateron Ink Black — silliq, chuqur
        GateronInk:  { noise: { dur: 0.02, gain: 0.04, hp: 1000 }, body: { type: "sine", freq: 100, freqEnd: 80, dur: 0.07, gain: 0.11 } },
        // Box Jade — juda clicky, baland
        BoxJade:     { click: { type: "square", freq: 3500, dur: 0.015, gain: 0.18 }, noise: { dur: 0.025, gain: 0.14, hp: 3000 }, body: { type: "square", freq: 220, dur: 0.02, gain: 0.05 } },
        // Topre (HHKB) — dumaloq, chuqur "thock"
        Topre:       { noise: { dur: 0.035, gain: 0.07, hp: 700, lp: 3000 }, body: { type: "sine", freq: 90, freqEnd: 70, dur: 0.07, gain: 0.12 } },
        // IBM Model M — buckling spring, prujina "ping"
        ModelM:      { click: { type: "square", freq: 4000, dur: 0.01, gain: 0.13 }, ping: { type: "triangle", freq: 2600, freqEnd: 1800, dur: 0.04, gain: 0.06 }, noise: { dur: 0.03, gain: 0.12, hp: 2000 }, body: { type: "square", freq: 180, dur: 0.02, gain: 0.04 } },
        // Creamy — premium "creamy" linear
        Creamy:      { noise: { dur: 0.025, gain: 0.06, hp: 1100, lp: 4500 }, body: { type: "sine", freq: 130, freqEnd: 110, dur: 0.05, gain: 0.10 } },
        // Alps (vintage) — clicky, biroz bo'sh jarang
        Alps:        { click: { type: "triangle", freq: 2800, dur: 0.014, gain: 0.12 }, noise: { dur: 0.02, gain: 0.10, hp: 2000 }, body: { type: "triangle", freq: 200, dur: 0.025, gain: 0.05 } }
    };

    function click(profileName, ok) {
        const p = PROFILES[profileName];
        if (!p) return; // "Off" yoki noma'lum
        const ac = audio();
        if (!ac) return;
        const now = ac.currentTime;
        const pf = ok ? 1 : 0.78;   // xato bosishda biroz pastroq/jimroq
        const gf = ok ? 1 : 0.85;

        if (p.click) playOsc(ac, now, { type: p.click.type, freq: p.click.freq * pf, freqEnd: p.click.freqEnd ? p.click.freqEnd * pf : undefined, dur: p.click.dur, gain: p.click.gain * gf });
        if (p.ping)  playOsc(ac, now + 0.004, { type: p.ping.type, freq: p.ping.freq * pf, freqEnd: p.ping.freqEnd ? p.ping.freqEnd * pf : undefined, dur: p.ping.dur, gain: p.ping.gain * gf });
        if (p.noise) playNoise(ac, now, { dur: p.noise.dur, gain: p.noise.gain * gf, hp: p.noise.hp, lp: p.noise.lp });
        if (p.body)  playOsc(ac, now, { type: p.body.type, freq: p.body.freq * pf, freqEnd: p.body.freqEnd ? p.body.freqEnd * pf : undefined, dur: p.body.dur, gain: p.body.gain * gf });
    }

    window.TWSound = {
        /// <summary>Sozlamadagi profil bo'yicha ovoz chiqaradi (Off → jim).</summary>
        play(profileName, ok) {
            try { click(profileName, ok !== false); } catch (e) { /* jim */ }
        }
    };
})();

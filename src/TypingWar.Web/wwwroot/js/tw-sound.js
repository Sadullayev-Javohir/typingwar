/* TypingWar — klaviatura ovozi (WebAudio sintez, audio fayl kerak emas) */
(function () {
    "use strict";

    let ctx = null;
    function audio() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) ctx = new AC();
        }
        if (ctx && ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    // profil → ton parametrlari
    const PROFILES = {
        Soft: { type: "sine", freq: 320, dur: 0.04, gain: 0.05 },
        Mechanical: { type: "square", freq: 180, dur: 0.03, gain: 0.06 },
        Typewriter: { type: "triangle", freq: 110, dur: 0.05, gain: 0.08 }
    };

    function click(profileName, ok) {
        const p = PROFILES[profileName];
        if (!p) return; // "Off" yoki noma'lum
        const ac = audio();
        if (!ac) return;

        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = p.type;
        // xato bosishda biroz pastroq ton
        osc.frequency.value = ok ? p.freq : p.freq * 0.7;
        gain.gain.value = p.gain;
        osc.connect(gain).connect(ac.destination);

        const now = ac.currentTime;
        gain.gain.setValueAtTime(p.gain, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);
        osc.start(now);
        osc.stop(now + p.dur);
    }

    window.TWSound = {
        /// <summary>Sozlamadagi profil bo'yicha ovoz chiqaradi (Off → jim).</summary>
        play(profileName, ok) {
            try { click(profileName, ok !== false); } catch (e) { /* jim */ }
        }
    };
})();

/* Reel kit · scheda tribe ufficiale in movimento.
   Legge window.CONFIG (vedi reels/NOME/config.js) e costruisce window.REEL per il motore reel-director.
   Geometria identica a cardDefaults() della console, con due adattamenti per i Reel:
   - `lift`: i testi salgono per restare nell'area sicura (la UI di Instagram copre il bordo inferiore);
   - `logoY`: il logo scende sotto la barra superiore di Instagram. */
(() => {
  const W = 1080, H = 1920, FPS = 30, TR = 14;               // TR: durata dello stacco tra due scene (frame)
  const C = window.CONFIG;
  const TRIBES = {
    'The Stage': { cat: 'STREET ROCK', color: '#ff4a3d', tag: 'For the ones who stay after the last song.' },
    'The Iron': { cat: 'GYM', color: '#e8e1cf', tag: 'For the ones who train when no one is watching.' },
    'The Grid': { cat: 'CYBER TECH', color: '#3fe6ea', tag: 'For the ones who live inside the machine.' },
  };
  const tribe = TRIBES[C.tribe] || TRIBES['The Stage'];
  const lift = C.lift ?? 160, logoY = C.logoY ?? 190;
  // posizioni del template (calibrate su 1750 px di altezza, riportate a 1920)
  const Y = (pct) => 1750 * pct / 100 + (H - 1750) - lift;
  const G = { catX: 5.16 * W / 100, catY: Y(65.3), titleX: 5.16 * W / 100, titleY: Y(68.2), subY: Y(83),
    titleSize: 219.857, titleSpacing: -1.099, mediaH: H * .66, grad0: H * .363, grad1: H * .66 };

  const $ = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ---------- scene (tempi cumulativi) ----------
  let t = 0;
  const scenes = C.scenes.map((s, i) => { const o = { ...s, i, start: t, end: t + (s.frames || 90), end_: false }; t = o.end; return o; });
  if (C.end) { const e = C.end; scenes.push({ ...e, i: scenes.length, start: t, end: t + (e.frames || 90), isEnd: true }); t += e.frames || 90; }
  const total = t;
  scenes.forEach((s) => { s.last = s.i === scenes.length - 1; });

  // ---------- DOM ----------
  const stage = $('div'); stage.id = 'stage'; document.body.appendChild(stage);
  const mediaEls = scenes.map((s) => {
    const m = $('div', 'media' + (s.isEnd ? ' logo-scene' : ''), stage); m.style.height = G.mediaH + 'px'; m.style.zIndex = 1 + s.i;
    const img = $('img', '', m); img.src = s.isEnd ? '/assets/brand-logo.png' : s.media; img.alt = ''; img.decoding = 'sync';
    if (!s.isEnd) img.style.objectPosition = `${s.x ?? 50}% ${s.y ?? 20}%`;
    return { m, img };
  });
  const shade = $('div', 'shade', stage); shade.style.top = G.grad0 + 'px'; shade.style.height = (H - G.grad0) + 'px'; shade.style.zIndex = 40;
  { const stop = (G.grad1 - G.grad0) / (H - G.grad0) * 100; shade.style.background = `linear-gradient(180deg, rgba(3,4,4,0) 0%, rgba(3,3,4,${C.shadeA ?? .8}) ${stop}%)`; }
  const glow = $('div', 'glow', stage); glow.style.zIndex = 41; glow.style.top = '0'; glow.style.height = H + 'px';
  const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
  const setGlow = (a) => { glow.style.background = `radial-gradient(ellipse ${W * .9}px ${H * .34}px at ${W * .22}px ${H * (C.glowY ?? .79)}px, rgba(${hexRGB(tribe.color)},${a.toFixed(3)}) 0%, rgba(${hexRGB(tribe.color)},0) 70%)`; };

  // titolo: stessa logica di adattamento della console (una riga ridotta, altrimenti due righe)
  const meas = document.createElement('canvas').getContext('2d');
  function fitTitle(text) {
    text = String(text).toUpperCase(); const nominal = G.titleSize, maxW = W - G.titleX - W * .04;
    const wAt = (str, sz) => { meas.font = `400 ${sz}px "VS Anton"`; let w = 0; for (const ch of str) w += meas.measureText(ch).width + G.titleSpacing * sz / nominal; return w - G.titleSpacing * sz / nominal; };
    const natural = wAt(text, nominal);
    if (natural <= maxW) return { lines: [text], size: nominal };
    const one = nominal * maxW / natural;
    if (one >= nominal * .5 || !text.includes(' ')) return { lines: [text], size: Math.max(one, nominal * .25) };
    for (let sz = nominal * .55; sz >= nominal * .25; sz *= .97) {
      const words = text.split(' '), lines = []; let line = '';
      for (const w of words) { const nx = line ? line + ' ' + w : w; if (line && wAt(nx, sz) > maxW) { lines.push(line); line = w; } else line = nx; }
      lines.push(line);
      if (lines.length <= 2 && lines.every((l) => wAt(l, sz) <= maxW)) return { lines, size: sz };
    }
    return { lines: [text], size: Math.max(one, nominal * .25) };
  }

  const textEls = scenes.map((s) => {
    const box = $('div', 'text', stage); box.style.zIndex = 50 + s.i;
    const cat = $('div', 'cat', box, esc(s.category || tribe.cat)); cat.style.left = G.catX + 'px'; cat.style.top = G.catY + 'px'; cat.style.color = tribe.color;
    const fit = fitTitle(s.title || '');
    const title = $('div', 'title', box, fit.lines.map(esc).join('<br>')); title.style.left = G.titleX + 'px'; title.style.top = G.titleY + 'px';
    title.style.fontSize = fit.size + 'px'; title.style.letterSpacing = (G.titleSpacing * fit.size / G.titleSize) + 'px'; title.style.lineHeight = '1';
    const sub = $('div', 'sub', box, esc(s.subtitle || tribe.tag)); sub.style.left = G.titleX + 'px'; sub.style.top = G.subY + 'px';
    let pill = null;
    if (s.cta) { pill = $('div', 'pill', box, esc(s.cta)); pill.style.left = G.titleX + 'px'; pill.style.top = (G.subY + 105) + 'px'; pill.style.color = tribe.color; }
    return { box, cat, title, sub, pill };
  });
  const frame = $('div', 'frame', stage); frame.style.zIndex = 70;
  const brand = $('img', 'brand', stage); brand.src = '/assets/brand-logo.png'; brand.style.left = (W * .0667) + 'px'; brand.style.top = logoY + 'px'; brand.style.zIndex = 60;
  const grain = $('canvas', 'rl-grain', stage); grain.style.zIndex = 80;

  // ---------- suono ----------
  const cues = [];
  const cue = (f, type, o = {}) => cues.push({ f: Math.round(f), type, ...o });
  scenes.forEach((s) => {
    cue(s.start, 'tick', { gain: .5 });
    if (s.i > 0) cue(s.start, 'whoosh', { dur: TR, gain: .55 });
    cue(s.start + 4, 'swish', { gain: .7 });
    if (s.i === 0) cue(s.start + 4, 'impact', { gain: .6 });
    cue(s.start + 12, 'swish', { gain: .35 });
    if (s.cta) cue(s.start + 30, 'chime', { hz: 880, gain: .55 });
  });

  // ---------- render(f): tutto dipende solo dal frame ----------
  const { interp, Ease, spring, revealWords } = RL;
  function render(f) {
    setGlow((C.glowA ?? .3) + .06 * Math.max(0, 1 - ((f % 15) / 10)));
    scenes.forEach((s, i) => {
      const me = mediaEls[i], tx = textEls[i];
      const on = f >= s.start && f < (s.last ? s.end + 1 : s.end + TR);
      me.m.style.display = on ? 'block' : 'none';
      if (on) {
        const p = i === 0 ? 1 : interp(f, [s.start, s.start + TR], [0, 1], Ease.inOut);
        me.m.style.clipPath = p >= 1 ? 'none' : `inset(${((1 - p) * 100).toFixed(2)}% 0 0 0)`;
        const z = s.zoom || [1, 1.1], k = (f - s.start) / (s.end - s.start + TR);
        const scale = (z[0] + (z[1] - z[0]) * Math.min(1, Math.max(0, k))) * (1 + (1 - p) * .07);
        if (s.isEnd) { const pop = spring(f - s.start, { damping: 14, stiffness: 120 }); me.img.style.transform = `scale(${(.82 + .18 * pop).toFixed(4)})`; me.img.style.opacity = String(Math.min(1, pop)); }
        else me.img.style.transform = `scale(${scale.toFixed(4)})`;
      }
      const ton = f >= s.start && f < s.end;
      tx.box.style.display = ton ? 'block' : 'none';
      if (ton) {
        const out = s.last ? null : s.end - 12;
        revealWords(tx.title, f, s.start + 4, { stagger: 4, dur: 16, out });
        revealWords(tx.sub, f, s.start + 12, { stagger: 2, dur: 14, out });
        const a = interp(f, [s.start + 2, s.start + 14], [0, 1], Ease.in), exit = s.last ? 0 : interp(f, [s.end - 10, s.end - 2], [0, 1], Ease.out);
        tx.cat.style.opacity = (a * (1 - exit)).toFixed(3); tx.cat.style.transform = `translateY(${((1 - a) * 18 - exit * 14).toFixed(2)}px)`;
        if (tx.pill) { const pp = spring(f - (s.start + 28), { damping: 12, stiffness: 150 }), pulse = 1 + .025 * Math.sin((f - s.start) / 15 * Math.PI); tx.pill.style.transform = `scale(${(Math.max(0, pp) * pulse).toFixed(4)})`; tx.pill.style.opacity = String(Math.min(1, Math.max(0, pp))); }
      }
    });
    const endStart = scenes.length && scenes[scenes.length - 1].isEnd ? scenes[scenes.length - 1].start : Infinity;
    brand.style.display = f >= endStart + 2 ? 'none' : 'block';
    RL.grain(f, { el: grain, opacity: .07 });
  }

  window.REEL = {
    width: W, height: H, fps: FPS, durationInFrames: total, render,
    ready: Promise.all([document.fonts.load('400 220px "VS Anton"'), document.fonts.load('italic 400 48px "VS Instrument Serif"'), document.fonts.load('500 25px "VS Inter Tight"')]).then(() => document.fonts.ready).then(() => {
      /* la misura dei titoli richiede i font caricati: adattamento calcolato qui, prima del frame 0 */
      scenes.forEach((s, i) => { const fit = fitTitle(s.title || ''), el = textEls[i].title; el.innerHTML = fit.lines.map(esc).join('<br>'); el.style.fontSize = fit.size + 'px'; el.style.letterSpacing = (G.titleSpacing * fit.size / G.titleSize) + 'px'; });
      return Promise.all([...document.images].map((im) => im.decode().catch(() => {})));
    }),
    scenes: scenes.map((s) => ({ id: 's' + s.i, name: s.isEnd ? 'chiusura' : (s.title || 'scena ' + s.i), from: s.start, to: s.end - 1 })),
    music: { bpm: C.bpm || 120, ranges: [[0, total]], bass: C.bass || [45, 45, 41, 43] },
    cues, stateful: false,
  };
})();

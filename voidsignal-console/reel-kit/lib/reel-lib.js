// reel-director · composition helpers (global RL)
// Every helper is a pure function of the frame number: no internal state, no
// wall-clock time. That is what makes any frame renderable in any order.
(() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;

  // CSS-equivalent cubic-bezier, solved with Newton + bisection fallback
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-6) return sy(t); const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
      let lo = 0, hi = 1; t = x;
      for (let i = 0; i < 30; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      return sy(t);
    };
  }
  const Ease = {
    in: bezier(0.16, 1, 0.3, 1),     // entrances (fast out of the gate, long settle)
    out: bezier(0.7, 0, 0.84, 0),    // exits
    inOut: bezier(0.83, 0, 0.17, 1), // wipes, camera moves
    linear: (x) => x,
    bezier,
  };

  // Remotion-style interpolate, clamped by default
  function interp(f, [i0, i1], [o0, o1], ease = Ease.linear, extrapolate = 'clamp') {
    let t = (f - i0) / (i1 - i0);
    if (extrapolate === 'clamp') t = clamp(t);
    return lerp(o0, o1, ease(t));
  }

  // Damped spring, integrated at a fixed 1/240 s step from frame 0 → deterministic
  function spring(f, { fps = 30, damping = 11, stiffness = 140, mass = 1, from = 0, to = 1 } = {}) {
    if (f <= 0) return from;
    const dt = 1 / 240, steps = Math.round((f / fps) / dt);
    let x = 0, v = 0;
    for (let i = 0; i < steps; i++) { const a = (-stiffness * (x - 1) - damping * v) / mass; v += a * dt; x += v * dt; }
    return from + (to - from) * x;
  }

  // Ball bounce: drop from height, n bounces losing energy (returns 0 = on surface, 1 = top)
  function bounceY(f, start, { dur = 20, bounces = 2, decay = 0.4 } = {}) {
    let t = f - start; if (t < 0) return 1;
    let seg = dur, h = 1;
    if (t < seg) return 1 - (t / seg) ** 2;       // first fall
    t -= seg;
    for (let i = 0; i < bounces; i++) {
      h *= decay; const s = 2 * seg * Math.sqrt(h);   // flight time scales with sqrt(height)
      if (t < s) { const u = t / s; return h * 4 * u * (1 - u); }
      t -= s;
    }
    return 0;
  }

  // ---------- mask-reveal kinetic type ----------
  // Turns  <h1 data-words>One <em>idea</em></h1>  into masked word spans.
  function splitWords(root) {
    if (root.__split) return root.__split;
    const words = [];
    const walk = (node, parentTag) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const m = document.createElement('span'); m.className = 'rl-mask';
            const i = document.createElement('span'); i.className = 'rl-word'; i.textContent = part;
            m.appendChild(i); frag.appendChild(m); words.push(i);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n, n.tagName);
      }
    };
    walk(root);
    root.__split = words;
    return words;
  }
  // in: frame the first word starts; out: frame the exit starts (optional)
  function revealWords(root, f, start, { stagger = 4, dur = 14, out = null, outDur = 10 } = {}) {
    const words = splitWords(root);
    words.forEach((w, i) => {
      const s = start + i * stagger;
      let p = interp(f, [s, s + dur], [0, 1], Ease.in);
      let y = (1 - p) * 115, r = (1 - p) * 7;
      if (out != null) {
        const so = out + i * Math.max(1, stagger - 2);
        const q = interp(f, [so, so + outDur], [0, 1], Ease.out);
        y -= q * 115; r -= q * 4;
      }
      w.style.transform = `translateY(${y.toFixed(2)}%) rotate(${r.toFixed(2)}deg)`;
      w.style.filter = '';
    });
  }
  // number of words in the element (to schedule cues)
  const wordCount = (root) => splitWords(root).length;

  // ---------- motion blur proportional to speed (px/frame) ----------
  const blurFor = (pxPerFrame, k = 0.06, max = 14) => Math.min(max, Math.abs(pxPerFrame) * k);

  // ---------- pendulum ----------
  // theta = A·sin(2π(f − H/2)/(2H)): at f = 0 the ball sits at the left extreme.
  function pendulum(f, { pivot = [540, -620], L = 1700, A = 0.33, H = 30 } = {}) {
    const th = (g) => A * Math.sin((2 * Math.PI * (g - H / 2)) / (2 * H));
    const theta = th(f), prev = th(f - 1);
    const ball = [pivot[0] + L * Math.sin(theta), pivot[1] + L * Math.cos(theta)];
    const pb = [pivot[0] + L * Math.sin(prev), pivot[1] + L * Math.cos(prev)];
    return { theta, ball, prevBall: pb, dir: Math.sign(theta - prev) || 1, speed: Math.hypot(ball[0] - pb[0], ball[1] - pb[1]), half: Math.floor(f / H) };
  }
  // clip-path polygon for the area the string has already swept.
  // The edge is the infinite line pivot→ball, so the seam hides under the string.
  function sweptClip(pivot, ball, dir, W = 1080, Ht = 1920) {
    const xAt = (y) => pivot[0] + ((ball[0] - pivot[0]) * (y - pivot[1])) / (ball[1] - pivot[1]);
    const xt = xAt(0).toFixed(1), xb = xAt(Ht).toFixed(1);
    return dir > 0
      ? `polygon(0px 0px, ${xt}px 0px, ${xb}px ${Ht}px, 0px ${Ht}px)`
      : `polygon(${xt}px 0px, ${W}px 0px, ${W}px ${Ht}px, ${xb}px ${Ht}px)`;
  }

  // ---------- torch (conic mask) ----------
  // aim: degrees, 0 = straight down, positive = towards screen-right
  function torchMask(x, y, aim, w, F = 3) {
    const from = 180 - aim - w - F;
    return `conic-gradient(from ${from.toFixed(2)}deg at ${x}px ${y}px, transparent 0deg, #000 ${F}deg, #000 ${F + 2 * w}deg, transparent ${2 * F + 2 * w}deg)`;
  }
  // aim angle (deg) from source to a target point, in the same convention
  const aimAt = (sx, sy, tx, ty) => (Math.atan2(tx - sx, ty - sy) * 180) / Math.PI;

  // ---------- film grain + vignette ----------
  let grainCanvas = null, grainCtx = null, grainImg = null;
  function grain(f, { el, opacity = 0.1, w = 270, h = 480 } = {}) {
    if (!grainCanvas) {
      grainCanvas = el || document.querySelector('canvas.rl-grain');
      grainCanvas.width = w; grainCanvas.height = h;
      grainCtx = grainCanvas.getContext('2d');
      grainImg = grainCtx.createImageData(w, h);
    }
    let s = (f + 1) * 9301 + 49297;           // per-frame seed → new grain every frame, same every render
    const d = grainImg.data;
    for (let i = 0; i < d.length; i += 4) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const v = (s >> 16) & 255;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    grainCtx.putImageData(grainImg, 0, 0);
    grainCanvas.style.opacity = opacity;
  }

  // ---------- scenes ----------
  // show only the scenes whose [from, to) contains f (plus an overlap margin for transitions)
  function sceneVisibility(scenes, f) {
    for (const sc of scenes) {
      const el = document.getElementById(sc.id); if (!el) continue;
      const on = f >= sc.from - (sc.preroll || 0) && f < sc.to + (sc.tail || 0);
      el.style.display = on ? '' : 'none';
    }
  }

  // ---------- fit text to a width ----------
  // Shrinks font-size so the element's text fits maxWidth (px). Measures an inline clone, so it
  // works on block elements and ignores transforms. Call once after fonts load, not per frame.
  function fitText(el, maxWidth, maxSize) {
    const probe = document.createElement('span');
    const cs = getComputedStyle(el);
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing};text-transform:${cs.textTransform}`;
    probe.textContent = el.textContent;
    document.body.appendChild(probe);
    const size = parseFloat(cs.fontSize), w = probe.getBoundingClientRect().width;
    probe.remove();
    const next = Math.min(maxSize || size, size * Math.min(1, maxWidth / w));
    el.style.fontSize = next.toFixed(1) + 'px';
    return next;
  }

  window.RL = { fitText, clamp, lerp, Ease, bezier, interp, spring, bounceY, splitWords, revealWords, wordCount, blurFor,
    pendulum, sweptClip, torchMask, aimAt, grain, sceneVisibility };
})();

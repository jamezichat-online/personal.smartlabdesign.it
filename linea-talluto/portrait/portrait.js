/* SmartLab CWE · Mainframe portrait runtime (vanilla port of app/Subject.tsx + lib/cwe + lib/pose-*).
   240 transparent 1280×720 frames, measured yaw/pitch per frame, shortest-path pose graph,
   premultiplied two-frame blend, bounded LRU (18 frames), 4 concurrent fetches, no speculative preload.
   Desktop: cursor-driven gaze. Mobile: 24 fps loop. Reduced motion: poster frame.
   API: LineaPortrait.mount(el, { base, isActive, zone }) → { wake, dispose }. Outside `zone` the gaze returns frontal. */
(function () {
  'use strict';
  var POINTS = [[0.00281,-0.0036],[0.0014,-0.0018],[0.0,0.0],[-0.00384,0.0],[-0.00467,0.00156],[-0.00607,0.0065],[-0.00748,0.00839],[-0.00825,0.01065],[-0.00888,0.01357],[-0.01675,0.02658],[-0.03046,0.04953],[-0.06056,0.05055],[-0.09666,0.05298],[-0.13602,0.07276],[-0.17741,0.07911],[-0.22089,0.08664],[-0.26163,0.09676],[-0.30892,0.11213],[-0.34974,0.13235],[-0.3961,0.13273],[-0.43465,0.14421],[-0.46559,0.14582],[-0.48864,0.15591],[-0.50217,0.16008],[-0.51739,0.16008],[-0.52806,0.16008],[-0.54158,0.15482],[-0.56327,0.15254],[-0.60536,0.12077],[-0.64452,0.12077],[-0.69021,0.12077],[-0.73285,0.14183],[-0.81726,0.23815],[-0.85249,0.28389],[-0.91366,0.38571],[-0.95454,0.50268],[-0.97194,0.53623],[-0.98548,0.54639],[-0.99547,0.58939],[-1.00843,0.63637],[-1.00843,0.64955],[-0.99693,0.66345],[-0.99693,0.66491],[-0.99466,0.70609],[-0.99466,0.74947],[-0.99466,0.79124],[-0.99632,0.83734],[-1.00084,0.8479],[-1.00442,0.8479],[-1.00696,0.8479],[-1.00696,0.84614],[-1.00696,0.84147],[-1.00295,0.81253],[-1.00034,0.81253],[-0.99829,0.80791],[-0.98664,0.79591],[-0.98614,0.79538],[-0.97445,0.70717],[-0.9592,0.6381],[-0.95872,0.58275],[-0.95871,0.53234],[-0.95162,0.39654],[-0.95084,0.35205],[-0.9456,0.32673],[-0.9456,0.22519],[-0.94254,0.1833],[-0.94029,0.17062],[-0.93531,0.08253],[-0.91817,-0.09475],[-0.90339,-0.25453],[-0.89293,-0.28786],[-0.887,-0.38917],[-0.88063,-0.52349],[-0.87722,-0.56385],[-0.87602,-0.60453],[-0.87602,-0.73959],[-0.87503,-0.73959],[-0.87503,-0.73959],[-0.87602,-0.71456],[-0.87882,-0.71456],[-0.87951,-0.70432],[-0.87961,-0.69932],[-0.87961,-0.69932],[-0.87961,-0.70432],[-0.87961,-0.70432],[-0.87201,-0.71598],[-0.84587,-0.91619],[-0.79382,-0.99192],[-0.74765,-0.99192],[-0.68733,-0.99192],[-0.63797,-0.81606],[-0.56524,-0.72355],[-0.49421,-0.61442],[-0.43768,-0.57365],[-0.37473,-0.55191],[-0.31358,-0.52032],[-0.25073,-0.49965],[-0.21128,-0.42514],[-0.1768,-0.3954],[-0.13827,-0.38841],[-0.10426,-0.32445],[-0.08159,-0.30851],[-0.06514,-0.28091],[-0.05066,-0.25908],[-0.04298,-0.25588],[-0.03987,-0.25099],[-0.0368,-0.23633],[-0.03568,-0.22021],[-0.03546,-0.19685],[-0.03307,-0.1629],[-0.03267,-0.13401],[-0.02899,-0.12287],[-0.0241,-0.11899],[-0.01982,-0.11185],[0.00277,-0.08584],[0.04422,-0.06335],[0.08476,-0.04821],[0.16326,0.01754],[0.24516,0.02304],[0.32809,0.05802],[0.40328,0.06077],[0.47437,0.06549],[0.55856,0.06894],[0.64008,0.07984],[0.70808,0.10228],[0.76997,0.10912],[0.81809,0.11347],[0.86166,0.11841],[0.88921,0.12038],[0.91957,0.1661],[0.93267,0.18812],[0.94098,0.22857],[0.94144,0.22857],[0.9417,0.22857],[0.94246,0.22827],[0.94246,0.22385],[0.942,0.22256],[0.942,0.2146],[0.94246,0.20244],[0.9452,0.19675],[0.9452,0.19529],[0.9452,0.19529],[0.94402,0.19529],[0.93391,0.21991],[0.93261,0.25813],[0.92039,0.30246],[0.90071,0.38963],[0.88097,0.49014],[0.87963,0.5628],[0.87963,0.63439],[0.87963,0.71616],[0.89821,0.74213],[0.89821,0.80222],[0.89821,0.83257],[0.89112,0.848],[0.89085,0.86062],[0.8849,0.88523],[0.88403,0.89031],[0.88067,0.89139],[0.8771,0.90149],[0.87176,0.90149],[0.82934,0.89432],[0.77098,0.89432],[0.67945,0.847],[0.57635,0.78592],[0.46455,0.77362],[0.3666,0.75414],[0.25438,0.72746],[0.13664,0.68867],[0.03957,0.64569],[-0.06145,0.61971],[-0.17428,0.54646],[-0.2617,0.49576],[-0.33864,0.47894],[-0.41797,0.41773],[-0.48159,0.38915],[-0.52921,0.38898],[-0.5991,0.36755],[-0.65453,0.30156],[-0.69661,0.24567],[-0.73904,0.14275],[-0.76488,0.08962],[-0.80526,0.0382],[-0.82492,-0.02433],[-0.84731,-0.04842],[-0.86711,-0.13046],[-0.89812,-0.14229],[-0.91615,-0.28119],[-0.92123,-0.3494],[-0.92239,-0.35824],[-0.92408,-0.37265],[-0.92239,-0.37613],[-0.92273,-0.39349],[-0.92273,-0.4108],[-0.92273,-0.4108],[-0.92273,-0.4186],[-0.92457,-0.4108],[-0.92516,-0.4108],[-0.92516,-0.42752],[-0.92457,-0.4422],[-0.90276,-0.593],[-0.88117,-0.63188],[-0.82777,-0.70199],[-0.77991,-0.70199],[-0.71899,-0.70199],[-0.64401,-0.64565],[-0.58309,-0.46636],[-0.51731,-0.38051],[-0.4673,-0.37748],[-0.40696,-0.29041],[-0.35008,-0.27543],[-0.2926,-0.21087],[-0.24134,-0.20932],[-0.20575,-0.20932],[-0.16682,-0.20932],[-0.12259,-0.21012],[-0.09104,-0.21012],[-0.06562,-0.21012],[-0.05336,-0.18209],[-0.04137,-0.16427],[-0.02951,-0.11524],[-0.02291,-0.1056],[-0.00921,-0.09315],[-0.0016,-0.08596],[-0.0016,-0.08532],[-0.0016,-0.07546],[-0.00174,-0.07472],[-0.00345,-0.07164],[-0.00669,-0.07164],[-0.00847,-0.06832],[-0.0099,-0.06822],[-0.01052,-0.06822],[-0.01196,-0.06751],[-0.01247,-0.06751],[-0.013,-0.06724],[-0.01367,-0.05808],[-0.01391,-0.05437],[-0.01426,-0.04775],[-0.01479,-0.04675],[-0.01531,-0.04576]];
  var CFG = { w: 1280, h: 720, fps: 24, frames: 240, cacheSize: 18, concurrency: 4, pointerResponse: 44, minimumPoseStep: .009 };
  var EYE = { x: 0.4918, y: 0.2521 };
  var N = POINTS.length;

  /* ---- pose map (lib/pose-map.ts) ---- */
  function frameForGaze(x, y, previous) {
    previous = previous || 0;
    if (Math.hypot(x, y) < 0.012) return 0;
    var best = previous, score = Infinity;
    for (var i = 0; i < N - 1; i++) {
      var a = POINTS[i], b = POINTS[i + 1];
      if (x > .08 && Math.max(a[0], b[0]) < -.025) continue;
      if (x < -.08 && Math.min(a[0], b[0]) > .025) continue;
      var dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy;
      var f = len > 1e-8 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len)) : 0;
      var px = a[0] + f * dx, py = a[1] + f * dy;
      if (x > .08 && px < -.025) continue;
      if (x < -.08 && px > .025) continue;
      var d = 2.4 * Math.pow(x - px, 2) + Math.pow(y - py, 2);
      var cand = i + f, cont = Math.min(Math.abs(cand - previous), 24) * 0.000035;
      if (d + cont < score) { score = d + cont; best = cand; }
    }
    return best;
  }

  /* ---- pose route (lib/pose-route.ts) ---- */
  function poseDistance(a, b) { return Math.hypot((POINTS[a][0] - POINTS[b][0]) * 1.55, POINTS[a][1] - POINTS[b][1]); }
  var GRAPH = POINTS.map(function (_, a) {
    var out = [];
    for (var b = 0; b < N; b++) {
      if (a === b) continue;
      var dist = poseDistance(a, b), adj = Math.abs(a - b) === 1;
      if (adj || dist < .075) out.push({ node: b, cost: dist + .006 + (adj ? 0 : Math.abs(a - b) <= 4 ? .008 : .025) });
    }
    return out;
  });
  function routeToPose(start, goal) {
    if (start === goal) return [];
    var dist = new Float64Array(N).fill(Infinity), prev = new Int16Array(N).fill(-1), seen = new Uint8Array(N);
    dist[start] = 0;
    for (var step = 0; step < N; step++) {
      var node = -1, best = Infinity;
      for (var i = 0; i < N; i++) if (!seen[i] && dist[i] < best) { best = dist[i]; node = i; }
      if (node < 0 || node === goal) break;
      seen[node] = 1;
      GRAPH[node].forEach(function (e) { var nx = best + e.cost; if (nx < dist[e.node]) { dist[e.node] = nx; prev[e.node] = node; } });
    }
    var path = [];
    for (var k = goal; k !== start && k >= 0; k = prev[k]) path.unshift(k);
    return path;
  }

  /* ---- pointer velocity (lib/cwe/pointer-velocity.ts) ---- */
  function cursorSpeed(dx, dy, ms, scale) {
    if (ms <= 0 || !isFinite(ms) || scale <= 0) return 0;
    var s = (ms > 80 ? 1000 / 60 : Math.max(4, ms)) / 1000;
    return Math.min(4, Math.hypot(dx, dy) / scale / s);
  }
  function movementRate(v, active) { return active ? Math.min(16, 1.6 + 7.2 * Math.max(0, v)) : 6.8; }

  /* ---- bounded frame loader (lib/cwe/FrameCache.ts + SubjectFrames.ts) ---- */
  function Frames(base, onReady) {
    var cache = new Map(), queue = [], active = new Map(), failed = new Map(), disposed = false;
    function close(it) { if (it && typeof it.close === 'function') it.close(); }
    function put(k, v) {
      if (cache.has(k)) cache.delete(k);
      cache.set(k, v);
      while (cache.size > CFG.cacheSize) { var old = cache.keys().next().value; close(cache.get(old)); cache.delete(old); }
    }
    function get(k) { var v = cache.get(k); if (v) put(k, v); return v; }
    function pump() {
      while (!disposed && active.size < CFG.concurrency && queue.length) {
        var i = queue.shift(), c = new AbortController(); active.set(i, c);
        (function (i, c) { load(i, c).finally(function () { active.delete(i); pump(); }); })(i, c);
      }
    }
    function load(i, c) {
      return fetch(base + 'frames/' + String(i).padStart(3, '0') + '.webp', { signal: c.signal })
        .then(function (r) { if (!r.ok) throw new Error('frame'); return r.blob(); })
        .then(function (blob) {
          if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
          var url = URL.createObjectURL(blob), img = new Image(); img.src = url;
          return img.decode().then(function () { URL.revokeObjectURL(url); return img; });
        })
        .then(function (f) { if (disposed) { close(f); return; } put(i, f); onReady(); })
        .catch(function () { if (!disposed && !c.signal.aborted) failed.set(i, Date.now() + 10000); });
    }
    return {
      get: get,
      request: function (idx) {
        var seenSet = new Set();
        queue = idx.filter(function (i) {
          if (seenSet.has(i)) return false; seenSet.add(i);
          return i >= 0 && i < CFG.frames && !cache.has(i) && !active.has(i) && (failed.get(i) || 0) < Date.now();
        }).slice(0, 12);
        pump();
      },
      reset: function () { queue = []; active.forEach(function (c) { c.abort(); }); active.clear(); cache.forEach(close); cache.clear(); },
      dispose: function () { disposed = true; this.reset(); }
    };
  }

  /* ---- Subject (app/Subject.tsx) ---- */
  function mount(root, opts) {
    opts = opts || {};
    var base = opts.base || '', isActive = opts.isActive || function () { return true; }, zone = opts.zone || null;
    root.classList.add('portrait-panel');
    var poster = document.createElement('img'); poster.src = base + 'poster.webp'; poster.alt = ''; poster.setAttribute('aria-hidden', 'true'); poster.className = 'portrait-media';
    var surface = document.createElement('canvas'); surface.width = CFG.w; surface.height = CFG.h; surface.setAttribute('aria-hidden', 'true'); surface.className = 'portrait-media'; surface.hidden = true;
    root.append(poster, surface);
    var ctx = surface.getContext('2d', { alpha: true });
    if (!ctx) return { dispose: function () {} };
    var desktop = matchMedia('(min-width:1024px)'), reduced = matchMedia('(prefers-reduced-motion:reduce)');
    var disposed = false, raf = 0, last = 0, visible = true, playStart = 0;
    var from = 0, to = 0, mix = 0, goal = 0, lastGoal = -1, route = [], lastPaint = '', shown = false;
    var velocity = 0, rate = 6.8, lastInput = 0;
    var pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 }, lastPointer = null, bounds = root.getBoundingClientRect();
    var geo = { scale: 1, x: 0, y: 0 };
    function start() { if (!disposed && !raf && visible && !document.hidden && isActive()) raf = requestAnimationFrame(tick); }
    var frames = Frames(base, start);
    function draw(a, b, f) {
      var A = frames.get(a), B = frames.get(b);
      if (!A || !B) return false;
      var sig = a + ':' + b + ':' + f.toFixed(3);
      if (sig === lastPaint) return true;
      ctx.clearRect(0, 0, CFG.w, CFG.h); ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1 - f; ctx.drawImage(A, 0, 0);
      if (f > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f; ctx.drawImage(B, 0, 0); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; lastPaint = sig;
      surface.dataset.frame = (a + (b - a) * f).toFixed(2);
      if (!shown) { shown = true; surface.hidden = false; poster.style.visibility = 'hidden'; }
      return true;
    }
    function outsideZone(p) {
      if (!zone) return false;
      var z = zone.getBoundingClientRect();
      return p.x < z.left || p.x > z.right || p.y < z.top || p.y > z.bottom;
    }
    function updatePointer() {
      /* no cursor, or cursor outside the hero: settle back to the frontal pose (frame 0) */
      if (!lastPointer || outsideZone(lastPointer)) { pointer = { x: 0, y: 0 }; return; }
      var s = geo.scale;
      var cx = bounds.left + geo.x + EYE.x * CFG.w * s, cy = bounds.top + geo.y + EYE.y * CFG.h * s;
      var depth = Math.max(240, CFG.h * s * .55);
      pointer = { x: Math.max(-1, Math.min(1, Math.atan2(lastPointer.x - cx, depth) / .64)), y: Math.max(-1, Math.min(1, Math.atan2(lastPointer.y - cy, depth) / .64)) };
    }
    function tick(now) {
      raf = 0; if (disposed || !visible || document.hidden || !isActive()) return;
      var dt = Math.min((now - (last || now - 16.67)) / 1000, .04); last = now;
      if (reduced.matches) { frames.request([0]); draw(0, 0, 0); return; }
      if (!desktop.matches) {
        var fr = ((now - playStart) / 1000 * CFG.fps) % N, a = Math.floor(fr), b = (a + 1) % N, look = [a, b];
        for (var k = 0; k < 6; k++) look.push((b + k + 1) % N);
        frames.request(look); draw(a, b, fr - a); start(); return;
      }
      var resp = 1 - Math.exp(-dt * CFG.pointerResponse);
      eased.x += (pointer.x - eased.x) * resp; eased.y += (pointer.y - eased.y) * resp;
      goal = Math.round(frameForGaze(eased.x, eased.y, goal));
      if (goal !== lastGoal) { route = routeToPose(to, goal); lastGoal = goal; }
      var anticipated = Math.round(frameForGaze(pointer.x, pointer.y, goal));
      frames.request([from, to].concat(route.slice(0, 2), [anticipated], route.slice(2, 9)));
      var activeInput = lastInput > 0 && now - lastInput < 90;
      if (now - lastInput > 40) velocity *= Math.exp(-dt / 0.085);
      rate += (movementRate(velocity, activeInput) - rate) * (1 - Math.exp(-dt * 42));
      var budget = dt * rate;
      for (var step = 0; step < 12 && budget > 0; step++) {
        if (from === to) {
          if (!route.length) break;
          var nx = route[0]; if (!frames.get(nx)) break;
          route.shift(); from = to; to = nx; mix = 0;
        }
        if (!frames.get(from) || !frames.get(to)) break;
        var length = Math.max(CFG.minimumPoseStep, poseDistance(from, to)), remaining = (1 - mix) * length;
        if (budget < remaining) { mix += budget / length; budget = 0; } else { budget -= remaining; from = to; mix = 0; }
      }
      draw(from, to, mix);
      if (Math.hypot(pointer.x - eased.x, pointer.y - eased.y) > .0008 || from !== to || route.length) start();
    }
    function reset() { lastPointer = null; velocity = 0; lastInput = 0; updatePointer(); last = 0; start(); }
    function move(e) {
      if (!desktop.matches || reduced.matches || e.pointerType === 'touch') return;
      var now = performance.now();
      if (lastPointer) {
        var el = now - lastInput;
        var m = cursorSpeed(e.clientX - lastPointer.x, e.clientY - lastPointer.y, el, Math.max(360, Math.min(bounds.width, bounds.height)));
        velocity += (m - velocity) * (1 - Math.exp(-Math.min(el, 50) / 25));
      }
      lastInput = now; lastPointer = { x: e.clientX, y: e.clientY }; updatePointer(); start();
    }
    function resize() {
      bounds = root.getBoundingClientRect();
      /* desktop: same fit as the original panel (keeps the gaze calibration);
         mobile: fill the slot height and crop the transparent sides */
      var s = desktop.matches ? Math.min(bounds.height / CFG.h, bounds.width / CFG.h) : bounds.height / CFG.h;
      geo = { scale: s, x: (bounds.width - CFG.w * s) / 2, y: bounds.height - CFG.h * s };
      root.style.setProperty('--subject-w', CFG.w * s + 'px'); root.style.setProperty('--subject-h', CFG.h * s + 'px');
      root.style.setProperty('--subject-x', geo.x + 'px'); root.style.setProperty('--subject-y', geo.y + 'px');
      updatePointer(); start();
    }
    function mode() {
      cancelAnimationFrame(raf); raf = 0; last = 0; lastPointer = null; pointer = { x: 0, y: 0 }; eased = { x: 0, y: 0 };
      from = to = goal = 0; mix = 0; lastGoal = -1; route = []; lastPaint = ''; playStart = performance.now(); velocity = 0; rate = 6.8; lastInput = 0;
      frames.reset(); frames.request([0, 1, 2]); resize(); start();
    }
    function visibility() { cancelAnimationFrame(raf); raf = 0; last = 0; if (document.hidden) frames.reset(); else { playStart = performance.now(); start(); } }
    var ro = new ResizeObserver(resize); ro.observe(root);
    var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { last = 0; start(); } else { cancelAnimationFrame(raf); raf = 0; } }, { rootMargin: '100px' }); io.observe(root);
    addEventListener('pointermove', move, { passive: true }); document.documentElement.addEventListener('pointerleave', reset);
    addEventListener('blur', reset); addEventListener('scroll', resize, { passive: true }); document.addEventListener('visibilitychange', visibility);
    desktop.addEventListener('change', mode); reduced.addEventListener('change', mode); mode();
    return {
      wake: function () { last = 0; resize(); },
      dispose: function () {
        disposed = true; frames.dispose(); cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', reset);
        removeEventListener('blur', reset); removeEventListener('scroll', resize); document.removeEventListener('visibilitychange', visibility);
        desktop.removeEventListener('change', mode); reduced.removeEventListener('change', mode);
      }
    };
  }

  window.LineaPortrait = { mount: mount, frameForGaze: frameForGaze, EYE: EYE, CFG: CFG };
})();

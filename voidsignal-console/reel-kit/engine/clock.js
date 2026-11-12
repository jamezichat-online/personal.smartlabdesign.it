// reel-director · virtual clock
// Injected with page.addInitScript BEFORE any page script runs.
// Replaces every time source the page can read, so a frame's pixels depend
// only on the frame number — never on wall-clock time, machine speed or load.
(() => {
  if (window.__reelClock) return;

  let now = 0;                         // virtual milliseconds since composition start
  const EPOCH = 1767225600000;         // fixed wall date: 2026-01-01T00:00:00Z
  const RealDate = Date;

  // ---- seeded PRNG (mulberry32). Reseeded per frame by the renderer. ----
  let seed = 1;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Math.random = rand;

  // ---- performance.now / Date ----
  performance.now = () => now;
  function VDate(...a) {
    if (!(this instanceof VDate)) return new RealDate(EPOCH + now).toString();
    return a.length ? new RealDate(...a) : new RealDate(EPOCH + now);
  }
  VDate.prototype = RealDate.prototype;
  VDate.now = () => EPOCH + now;
  VDate.parse = RealDate.parse;
  VDate.UTC = RealDate.UTC;
  window.Date = VDate;

  // ---- timers ----
  let nextTimer = 1;
  const timers = new Map();
  window.setTimeout = (fn, ms = 0, ...args) => {
    const id = nextTimer++;
    timers.set(id, { fn, at: now + Math.max(0, +ms || 0), args, every: 0 });
    return id;
  };
  window.setInterval = (fn, ms = 0, ...args) => {
    const id = nextTimer++;
    const every = Math.max(1, +ms || 0);
    timers.set(id, { fn, at: now + every, args, every });
    return id;
  };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };

  const call = (fn, args) => {
    try { typeof fn === 'function' ? fn(...args) : (0, eval)(String(fn)); }
    catch (e) { console.error('[reel] timer error', e); }
  };
  const runTimersUntil = (t) => {
    for (let guard = 0; guard < 1e5; guard++) {
      let pick = null, pickId = 0;
      for (const [id, tm] of timers) {
        if (tm.at <= t && (!pick || tm.at < pick.at || (tm.at === pick.at && id < pickId))) { pick = tm; pickId = id; }
      }
      if (!pick) return;
      now = pick.at;
      if (pick.every) pick.at += pick.every; else timers.delete(pickId);
      call(pick.fn, pick.args);
    }
    console.error('[reel] timer loop guard hit');
  };

  // ---- requestAnimationFrame: queued, flushed once per rendered frame ----
  let nextRaf = 1;
  let rafQueue = new Map();
  window.requestAnimationFrame = (cb) => { const id = nextRaf++; rafQueue.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { rafQueue.delete(id); };

  window.__reelClock = {
    get now() { return now; },
    seed(s) { seed = (s >>> 0) || 1; },
    // Forward: fire due timers in order, then one rAF tick at exactly t.
    // Backward (stills, verification in shuffled order): jump. Pure render(frame)
    // compositions are unaffected; stateful ones must render frames in order.
    advanceTo(t) {
      if (t < now) { now = t; }
      else { runTimersUntil(t); now = t; }
      const q = rafQueue; rafQueue = new Map();
      for (const cb of q.values()) { try { cb(t); } catch (e) { console.error('[reel] rAF error', e); } }
    },
  };
})();

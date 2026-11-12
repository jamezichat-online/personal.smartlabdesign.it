#!/usr/bin/env node
// reel-director · deterministic HTML → MP4 renderer (Playwright + ffmpeg)
//
//   node render.mjs <comp.html> [options]
//
//   --out <dir>         output folder                              [out]
//   --workers <n>       parallel browser contexts                  [min(4, cpus)]
//   --frames a-b        render only this inclusive frame range
//   --stills <list>     comma list of frames, or "auto" (scene boundaries + transitions)
//   --scale <s>         scale for stills / contact sheet           [0.25]
//   --verify <n>        render n sample frames twice, in different orders and
//                       fresh browsers, and compare SHA-256 hashes
//   --no-audio          skip sound synthesis
//   --keep-frames       keep the PNG sequence after encoding
//
// Run from the reel project root (the folder that holds package.json, comp/ and lib/).
// The project root is served over a local HTTP server so fonts and assets load
// exactly as on the web (file:// blocks some font loads).

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();

// ---------- args ----------
const argv = process.argv.slice(2);
const opt = { out: 'out', workers: Math.max(1, Math.min(4, os.cpus().length)), scale: 0.25, audio: true, keep: false };
let comp = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const next = () => argv[++i];
  if (a === '--out') opt.out = next();
  else if (a === '--workers') opt.workers = Math.max(1, +next());
  else if (a === '--frames') { const [x, y] = next().split('-').map(Number); opt.range = [x, y ?? x]; }
  else if (a === '--stills') opt.stills = next();
  else if (a === '--scale') opt.scale = +next();
  else if (a === '--verify') opt.verify = +next();
  else if (a === '--no-audio') opt.audio = false;
  else if (a === '--keep-frames') opt.keep = true;
  else if (!a.startsWith('--')) comp = a;
}
if (!comp) { console.error('usage: node render.mjs <comp.html> [--stills auto] [--verify 12] [--workers 4]'); process.exit(1); }

// ---------- playwright (resolved from the project, then from the engine) ----------
function loadPlaywright() {
  for (const base of [path.join(ROOT, 'x.js'), path.join(ENGINE, 'x.js')]) {
    try { return createRequire(base)('playwright'); } catch {}
    try { return createRequire(base)('playwright-core'); } catch {}
  }
  console.error('Playwright not found. In the project run:\n  npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}
const { chromium } = loadPlaywright();

// ---------- static server ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

// ---------- browser ----------
// Flags chosen for pixel-stable output: software raster (no GPU variance),
// no LCD/subpixel text, fixed sRGB, every compositor stage finished before capture.
const ARGS = ['--disable-gpu', '--disable-gpu-rasterization', '--disable-gpu-compositing', '--disable-oop-rasterization', '--force-color-profile=srgb', '--font-render-hinting=none',
  '--disable-lcd-text', '--disable-font-subpixel-positioning', '--run-all-compositor-stages-before-draw',
  '--disable-partial-raster', '--disable-skia-runtime-opts', '--hide-scrollbars', '--mute-audio',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
const CLOCK = fs.readFileSync(path.join(ENGINE, 'clock.js'), 'utf8');

async function openPage(browser, url, meta) {
  const ctx = await browser.newContext({ viewport: { width: meta.width, height: meta.height }, deviceScaleFactor: 1 });
  await ctx.addInitScript({ content: CLOCK });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(async () => {
    if (!window.REEL) throw new Error('composition must define window.REEL');
    if (window.REEL.ready) await window.REEL.ready;
    await document.fonts.ready;
  });
  return { ctx, page };
}

// One frame = advance clock → seed PRNG → user render → GSAP → WAAPI/CSS → media → fonts/images.
async function seek(page, f) {
  return page.evaluate(async (f) => {
    const R = window.REEL, fps = R.fps, t = (f * 1000) / fps;
    let h = (f + 1) * 2654435761; h ^= h >>> 16;
    window.__reelClock.seed(h);
    window.__reelClock.advanceTo(t);
    if (window.gsap) { const tl = window.gsap.globalTimeline; tl.paused(true); tl.time(t / 1000, false); }
    if (typeof R.render === 'function') R.render(f);
    // Tear down and rebuild the layout/paint-layer tree every frame. Chromium's compositing
    // heuristics (layer squashing, overlap testing, "was recently transformed") remember earlier
    // frames, which can shift glyphs by a sub-pixel depending on render ORDER. A fresh layer tree
    // per frame makes each frame depend on f alone.
    const de = document.documentElement;
    de.style.display = 'none'; void de.offsetHeight; de.style.display = ''; void de.offsetHeight;
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
    const vids = [...document.querySelectorAll('video')];
    await Promise.all(vids.map((v) => new Promise((ok) => {
      const from = +(v.dataset.from || 0), rate = +(v.dataset.rate || 1);
      const target = Math.max(0, ((f - from) / fps) * rate);
      v.pause();
      if (Math.abs(v.currentTime - target) < 1e-4 && v.readyState >= 2) return ok();
      v.addEventListener('seeked', () => ok(), { once: true });
      v.currentTime = target;
    })));
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))));
    return true;
  }, f);
}

// Capture through Playwright, not raw CDP: page.screenshot waits for a fresh compositor frame
// (a real rAF in Playwright's isolated world, untouched by our virtual clock) before reading pixels.
// A raw Page.captureScreenshot can race the compositor and return a frame with stale tiles when
// consecutive frames differ a lot (out-of-order stills, verification, scene cuts).
async function capture(page, meta, scale = 1) {
  const buf = await page.screenshot({ type: 'png', animations: 'allow', caret: 'initial' });
  if (scale === 1) return buf;
  const w = Math.round(meta.width * scale), h = Math.round(meta.height * scale);
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'png_pipe', '-i', '-', '-vf', `scale=${w}:${h}:flags=lanczos`, '-f', 'image2pipe', '-c:v', 'png', '-'], { input: buf, maxBuffer: 1 << 28 });
  return r.stdout;
}

const pad = (n) => String(n).padStart(5, '0');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) { console.error(`${cmd} failed`); process.exit(1); }
}

// ---------- main ----------
const srv = await serve();
const url = `http://127.0.0.1:${srv.address().port}/${comp.replace(/^\.\//, '')}`;
const browser = await chromium.launch({ args: ARGS });
const out = path.resolve(ROOT, opt.out);
fs.mkdirSync(out, { recursive: true });

// read composition metadata
const probe = await openPage(browser, url, { width: 1080, height: 1920 });
const meta = await probe.page.evaluate(() => {
  const R = window.REEL;
  return { width: R.width || 1080, height: R.height || 1920, fps: R.fps || 30, frames: R.durationInFrames,
    stateful: !!R.stateful, scenes: R.scenes || [], cues: R.cues || [], music: R.music || null };
});
await probe.ctx.close();
if (!meta.frames) { console.error('REEL.durationInFrames is required'); process.exit(1); }
console.log(`composition ${meta.width}x${meta.height} @${meta.fps}fps · ${meta.frames} frames (${(meta.frames / meta.fps).toFixed(2)}s)`);

try {
  if (opt.verify) await verify();
  else if (opt.stills) await stills();
  else await full();
} finally {
  await browser.close();
  srv.close();
}

async function verify() {
  const n = Math.min(opt.verify, meta.frames);
  const frames = [...new Set(Array.from({ length: n }, (_, i) => Math.round((i * (meta.frames - 1)) / Math.max(1, n - 1))))];
  const pass = async (order) => {
    const b = await chromium.launch({ args: ARGS });
    const { ctx, page } = await openPage(b, url, meta);
    const map = {};
    for (const f of order) { await seek(page, f); map[f] = sha(await capture(page, meta)); }
    await ctx.close(); await b.close();
    return map;
  };
  if (meta.stateful) console.log('note: stateful composition — shuffled-order check skipped, both passes in order');
  const a = await pass(frames);
  const b = await pass(meta.stateful ? frames : [...frames].reverse());
  let bad = 0;
  for (const f of frames) { const ok = a[f] === b[f]; if (!ok) bad++; console.log(`frame ${pad(f)}  ${ok ? 'OK  ' : 'DIFF'}  ${a[f].slice(0, 16)}`); }
  console.log(bad ? `\nNOT DETERMINISTIC: ${bad}/${frames.length} frames differ` : `\nDETERMINISTIC: ${frames.length}/${frames.length} frames bit-identical across fresh browsers and render order`);
  if (bad) process.exitCode = 2;
}

async function stills() {
  let list;
  if (opt.stills === 'auto') {
    const s = new Set();
    for (const sc of meta.scenes) {
      const a = sc.from, b = sc.to ?? sc.from + sc.duration;
      [a, a + 8, Math.round((a + b) / 2), b - 8].forEach((f) => f >= 0 && f < meta.frames && s.add(f));
    }
    if (!s.size) for (let f = 0; f < meta.frames; f += 30) s.add(f);
    list = [...s].sort((x, y) => x - y);
  } else list = opt.stills.split(',').map(Number);
  const dir = path.join(out, 'stills');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const { ctx, page } = await openPage(browser, url, meta);
  if (meta.stateful) { list.sort((a, b) => a - b); }
  let k = 0, last = -1;
  for (const f of list) {
    if (meta.stateful) for (let p = last + 1; p < f; p++) await seek(page, p);
    await seek(page, f); last = f;
    fs.writeFileSync(path.join(dir, `${pad(k++)}_f${pad(f)}.png`), await capture(page, meta, opt.scale));
  }
  await ctx.close();
  // contact sheet (files are named <index>_f<frame>.png, in sheet order)
  const cols = Math.min(6, list.length), rows = Math.ceil(list.length / cols);
  const sheet = path.join(out, 'contact-sheet.png');
  run('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '1', '-pattern_type', 'glob', '-i', path.join(dir, '*.png'),
    '-vf', `pad=iw+8:ih+8:4:4:color=0x222222,tile=${cols}x${rows}`, '-frames:v', '1', sheet]);
  console.log(`stills: ${list.join(', ')}\ncontact sheet → ${sheet}`);
}

async function full() {
  const [a, b] = opt.range || [0, meta.frames - 1];
  const dir = path.join(out, 'frames');
  if (!opt.range) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const total = b - a + 1, W = Math.min(opt.workers, total);
  const chunk = Math.ceil(total / W);
  let done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: W }, async (_, w) => {
    const s = a + w * chunk, e = Math.min(b, s + chunk - 1);
    if (s > e) return;
    const { ctx, page } = await openPage(browser, url, meta);
    if (meta.stateful) for (let p = 0; p < s; p++) await seek(page, p);   // pre-roll stateful code
    for (let f = s; f <= e; f++) {
      await seek(page, f);
      fs.writeFileSync(path.join(dir, `${pad(f)}.png`), await capture(page, meta));
      if (++done % 30 === 0 || done === total) {
        const fps = done / ((Date.now() - t0) / 1000);
        process.stdout.write(`\rframes ${done}/${total} · ${fps.toFixed(1)} fps · eta ${Math.round((total - done) / fps)}s   `);
      }
    }
    await ctx.close();
  }));
  console.log();
  if (opt.range) { console.log(`frames ${a}-${b} → ${dir}`); return; }

  // ---- audio ----
  let wav = null;
  if (opt.audio && meta.cues.length) {
    const cuesFile = path.join(out, 'cues.json');
    fs.writeFileSync(cuesFile, JSON.stringify({ fps: meta.fps, durationInFrames: meta.frames, music: meta.music, cues: meta.cues }, null, 1));
    wav = path.join(out, 'audio.wav');
    run('python3', [path.join(ENGINE, 'sfx.py'), cuesFile, wav]);
  }

  // ---- encode: master (near-lossless) + social (Instagram/TikTok ready) ----
  const color = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
  const vf = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p';
  const input = ['-framerate', String(meta.fps), '-i', path.join(dir, '%05d.png')];
  const aIn = wav ? ['-i', wav] : [];
  const master = path.join(out, 'master.mp4');
  run('ffmpeg', ['-loglevel', 'error', '-y', ...input, ...aIn, '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', '14',
    ...color, ...(wav ? ['-c:a', 'aac', '-b:a', '320k', '-shortest'] : []), master]);
  const social = path.join(out, 'reel.mp4');
  run('ffmpeg', ['-loglevel', 'error', '-y', '-i', master, '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-profile:v', 'high',
    '-level', '4.2', '-pix_fmt', 'yuv420p', ...color, '-movflags', '+faststart', ...(wav ? ['-c:a', 'copy'] : []), social]);
  if (!opt.keep) fs.rmSync(dir, { recursive: true, force: true });
  const mb = (p) => (fs.statSync(p).size / 1048576).toFixed(1) + ' MB';
  console.log(`master → ${master} (${mb(master)})\nreel   → ${social} (${mb(social)}) · ${((Date.now() - t0) / 1000).toFixed(0)}s total`);
}

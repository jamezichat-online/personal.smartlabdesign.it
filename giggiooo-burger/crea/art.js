/* Giggiooo Burger — Configuratore
 * Libreria di art procedurale (placeholder vettoriali).
 * Ogni renderer restituisce { h, top, below, svg }:
 *   h      spessore che il layer aggiunge allo stack (unità = px logici)
 *   top    estensione dell'art sopra la baseline
 *   below  estensione sotto la baseline (fronte dell'ellisse, colature)
 * La baseline (y = 0) coincide con il centro della faccia superiore del layer sottostante.
 * Per passare agli sprite fotografici basta sostituire il renderer con un <image> che rispetti gli stessi metadati.
 */
window.GGArt = (() => {
  const K = 0.24;            // rapporto ellisse = elevazione camera (~14°)
  const VBX = -210, VBW = 420;

  /* ---------- utilità ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f = n => Math.round(n * 10) / 10;
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const lerp = (a, b, t) => a + (b - a) * t;

  function harm(r, freqs) {
    const ph = freqs.map(() => r() * Math.PI * 2);
    const am = freqs.map((_, i) => (0.5 + r() * 0.5) / (1 + i * 0.5));
    const norm = am.reduce((s, v) => s + v, 0);
    return t => freqs.reduce((s, fq, i) => s + am[i] * Math.sin(fq * t + ph[i]), 0) / norm;
  }

  function smooth(pts, closed = true) {
    const n = pts.length;
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const q0 = closed || i > 0 ? p0 : p1;
      const q3 = closed || i < n - 2 ? p3 : p2;
      d += `C${f(p1[0] + (p2[0] - q0[0]) / 6)},${f(p1[1] + (p2[1] - q0[1]) / 6)} ${f(p2[0] - (q3[0] - p1[0]) / 6)},${f(p2[1] - (q3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
    }
    return closed ? d + 'Z' : d;
  }

  function cylPts(R, h, ry, nz, jit, bulge = 0, N = 36) {
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = Math.PI + Math.PI * i / N, j = 1 + jit * nz(t);
      pts.push([R * j * Math.cos(t), -h + ry * j * Math.sin(t)]);
    }
    if (bulge) pts.push([R * (1 + jit * nz(0)) + bulge, -h / 2]);
    for (let i = 0; i <= N; i++) {
      const t = Math.PI * i / N, j = 1 + jit * nz(t);
      pts.push([R * j * Math.cos(t), ry * j * Math.sin(t)]);
    }
    if (bulge) pts.push([-R * (1 + jit * nz(Math.PI)) - bulge, -h / 2]);
    return pts;
  }

  function ellPts(cx, cy, rx, ry, nz, jit, N = 48) {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const t = Math.PI * 2 * i / N, j = 1 + jit * (nz ? nz(t) : 0);
      pts.push([cx + rx * j * Math.cos(t), cy + ry * j * Math.sin(t)]);
    }
    return pts;
  }

  const stops = s => s.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
  const linV = (id, s, y1, y2) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y1)}" x2="0" y2="${f(y2)}">${stops(s)}</linearGradient>`;
  const linBox = (id, s, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(s)}</linearGradient>`;
  const radU = (id, s, cx, cy, r) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">${stops(s)}</radialGradient>`;
  const blur = (id, sd) => `<filter id="${id}" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
  const clip = (id, d) => `<clipPath id="${id}"><path d="${d}"/></clipPath>`;

  function inEll(r, cx, cy, rx, ry) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    return [cx + rx * d * Math.cos(a), cy + ry * d * Math.sin(a)];
  }

  function dots(r, n, sample, colors, rmin, rmax, opA = .5, opB = 1, sq = 1) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const [x, y] = sample();
      const rr = lerp(rmin, rmax, r());
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr)}" ry="${f(rr * sq * lerp(.6, 1, r()))}" fill="${pick(r, colors)}" opacity="${f(lerp(opA, opB, r()) * 100) / 100}"/>`;
    }
    return s;
  }

  function shadow(P, R, ry, op = .5) {
    return `<ellipse cx="0" cy="${f(ry * .3)}" rx="${f(R * .99)}" ry="${f(ry * .95)}" fill="#0b0302" opacity="${op}" filter="url(#${P}sh)"/>`;
  }

  /* ---------- disco generico (pane base, carni) ---------- */
  function disc(P, r, o) {
    const { R, h } = o, ry = R * K;
    const nz = harm(r, o.freqs);
    const out = smooth(cylPts(R, h, ry, nz, o.jit, o.bulge || 0));
    const top = smooth(ellPts(0, -h, R * (o.topScale || .97), ry * (o.topScale || .97) * .96, nz, o.jit));
    const defs = [
      blur(P + 'sh', 5), blur(P + 'b2', 2.2),
      linV(P + 's', o.side, -h - ry, ry),
      clip(P + 'k', out), clip(P + 't', top),
      o.topGrad ? radU(P + 'c', o.topGrad, -R * .15, -h - ry * .3, R * 1.05) : ''
    ];
    let body = shadow(P, R, ry, o.shadow ?? .5);
    body += `<path d="${out}" fill="url(#${P}s)"/>`;
    if (o.sideDots) body += `<g clip-path="url(#${P}k)">${o.sideDots.map(sd => dots(r, sd.n, () => [(r() * 2 - 1) * R * 1.05, lerp(-h - ry, ry, r())], sd.colors, sd.rmin, sd.rmax, sd.op[0], sd.op[1], sd.sq || 1)).join('')}</g>`;
    if (o.sheen) body += `<path d="M${f(-R * .92)},${f(-h * .45)} Q0,${f(ry * 1.2 - h * .45)} ${f(R * .92)},${f(-h * .45)}" fill="none" stroke="#fff" stroke-opacity="${o.sheen}" stroke-width="5" filter="url(#${P}b2)"/>`;
    body += `<path d="${top}" fill="${o.topGrad ? `url(#${P}c)` : o.topFill}"/>`;
    if (o.topDots) body += `<g clip-path="url(#${P}t)">${o.topDots.map(sd => dots(r, sd.n, () => inEll(r, 0, -h, R, ry), sd.colors, sd.rmin, sd.rmax, sd.op[0], sd.op[1], sd.sq || 1)).join('')}</g>`;
    if (o.rim) body += `<path d="${top}" fill="none" stroke="${o.rim}" stroke-width="${o.rimW || 2}" opacity="${o.rimOp || .6}"/>`;
    if (o.lace) {
      const nzL = harm(r, [7, 13]);
      let lace = '';
      for (let i = 0; i < o.lace.n; i++) {
        const t = r() * Math.PI, j = 1 + o.jit * nz(t) + .015 + r() * .03;
        const x = R * j * Math.cos(t), y = lerp(-h, 0, r() * .8) + ry * j * Math.sin(t);
        const rr = 1.6 + r() * 3.4 * (1 + nzL(t) * .3);
        lace += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr * 1.4)}" ry="${f(rr)}" fill="${pick(r, o.lace.colors)}"/>`;
      }
      body += lace;
    }
    return { h, top: h + ry + 10, below: ry + 14, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  /* ---------- pane ---------- */
  const BUN = {
    brioche: { side: [[0, '#e8a957'], [.45, '#c46d25'], [1, '#6e3310']], crumb: [[0, '#f8e8c4'], [.72, '#efd29c'], [1, '#c48a49']], toast: '#9a5a24', dome: ['#f7c46e', '#e08e34', '#b05d1c', '#5c2709'], gloss: .42, seeds: false },
    sesamo: { side: [[0, '#eab466'], [.45, '#c97a30'], [1, '#76391a']], crumb: [[0, '#f7e8c6'], [.72, '#eed4a0'], [1, '#c9914f']], toast: '#9a5a24', dome: ['#f4c97f', '#dd963f', '#ae6424', '#5e2b0c'], gloss: .3, seeds: true },
    nero: { side: [[0, '#45403c'], [.45, '#272220'], [1, '#0d0b0a']], crumb: [[0, '#5a524c'], [.72, '#433c38'], [1, '#221d1b']], toast: '#141110', dome: ['#6a6561', '#34302d', '#1a1716', '#060505'], gloss: .22, seeds: false }
  };

  function bunBottom(P, r, v) {
    const p = BUN[v] || BUN.brioche;
    return disc(P, r, {
      R: 150, h: 30, freqs: [2, 5, 9], jit: .012, bulge: 5, side: p.side, topGrad: p.crumb, sheen: .16,
      topDots: [{ n: 150, colors: v === 'nero' ? ['#6a625b', '#1c1817'] : ['#fff6dc', '#d9b273', '#c6904e'], rmin: .7, rmax: 2.2, op: [.35, .8] }],
      sideDots: [{ n: 40, colors: [p.side[2][1]], rmin: 3, rmax: 9, op: [.06, .16] }],
      rim: p.toast, rimW: 3, rimOp: .5, shadow: .55
    });
  }

  function bunTop(P, r, v) {
    const p = BUN[v] || BUN.brioche;
    const R = 156, H = 96, ry = R * K;
    const d = `M${-R},0 C${-R},${f(-H * .8)} ${f(-R * .6)},${-H} 0,${-H} C${f(R * .6)},${-H} ${R},${f(-H * .8)} ${R},0 A${R},${f(ry)} 0 0 1 ${-R},0 Z`;
    const defs = [
      blur(P + 'sh', 5), blur(P + 'g', 7), blur(P + 'g2', 1.6),
      radU(P + 'd', [[0, p.dome[0]], [.38, p.dome[1]], [.78, p.dome[2]], [1, p.dome[3]]], -R * .28, -H * .72, R * 1.32),
      linV(P + 'v', [[0, '#3c1404', 0], [.65, '#3c1404', .18], [1, '#2a0d03', .62]], -H * .3, ry),
      clip(P + 'k', d)
    ];
    let body = shadow(P, R, ry, .55);
    body += `<path d="${d}" fill="url(#${P}d)"/>`;
    body += `<g clip-path="url(#${P}k)" filter="url(#${P}g)">${dots(r, 40, () => [(r() * 2 - 1) * R, -r() * H], [p.dome[2], p.dome[3]], 8, 20, .04, .1)}</g>`;
    body += `<path d="${d}" fill="url(#${P}v)"/>`;
    body += `<ellipse cx="${f(-R * .27)}" cy="${f(-H * .72)}" rx="${f(R * .34)}" ry="${f(H * .13)}" transform="rotate(-11 ${f(-R * .27)} ${f(-H * .72)})" fill="#fff" opacity="${p.gloss}" filter="url(#${P}g)"/>`;
    body += `<ellipse cx="${f(-R * .36)}" cy="${f(-H * .8)}" rx="16" ry="4.5" transform="rotate(-14 ${f(-R * .36)} ${f(-H * .8)})" fill="#fff" opacity="${p.gloss + .2}" filter="url(#${P}g2)"/>`;
    if (p.seeds) {
      let s = '';
      const seeds = [];
      for (let i = 0; i < 52; i++) {
        const x = (r() * 2 - 1) * R * .84;
        const yd = -H * Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(x) / R, 2.3)));
        seeds.push([x, yd * (.22 + .74 * r())]);
      }
      seeds.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => {
        const a = f(-50 + r() * 100), sc = .75 + .35 * (1 + y / H);
        s += `<g transform="translate(${f(x)} ${f(y)}) rotate(${a}) scale(${f(sc * 100) / 100})"><ellipse cx=".8" cy="1.2" rx="4.8" ry="2.4" fill="#4a1d06" opacity=".35"/><ellipse rx="4.8" ry="2.4" fill="#f7edd2"/><ellipse cx="-1.2" cy="-.6" rx="2" ry=".8" fill="#fff" opacity=".7"/></g>`;
      });
      body += s;
    }
    return { h: 0, top: H + 12, below: ry + 14, crown: H, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  /* ---------- carni ---------- */
  const manzo = (P, r) => disc(P, r, {
    R: 160, h: 24, freqs: [6, 11, 17, 27, 41], jit: .03, bulge: 3,
    side: [[0, '#6a3a20'], [.45, '#40200f'], [1, '#1d0d06']], topFill: '#4a2412',
    sideDots: [
      { n: 340, colors: ['#8b5332', '#2a140a', '#a8693f', '#170a05', '#6b3a20'], rmin: 1.1, rmax: 3.6, op: [.45, .95] },
      { n: 40, colors: ['#ffd9b0'], rmin: .7, rmax: 1.5, op: [.2, .5] }
    ],
    topDots: [{ n: 80, colors: ['#7a4426', '#2b150b'], rmin: 1, rmax: 3, op: [.5, .9] }],
    rim: '#9a5a34', rimW: 1.4, rimOp: .5,
    lace: { n: 70, colors: ['#3a1c0c', '#5a2e15', '#24100a'] }
  });

  const pollo = (P, r) => disc(P, r, {
    R: 152, h: 32, freqs: [4, 9, 15, 23], jit: .05, bulge: 6,
    side: [[0, '#eaae5a'], [.5, '#c77d2c'], [1, '#7c4313']], topFill: '#d89a48',
    sideDots: [
      { n: 260, colors: ['#f4c674', '#b0692a', '#7a4214', '#f8d991', '#d48a35'], rmin: 1.6, rmax: 4.8, op: [.55, 1] },
      { n: 30, colors: ['#fff1c8'], rmin: .8, rmax: 1.8, op: [.4, .8] }
    ],
    topDots: [{ n: 90, colors: ['#f4c674', '#b0692a', '#f8d991'], rmin: 1.6, rmax: 4.2, op: [.6, 1] }],
    rim: '#f8d991', rimW: 1.4, rimOp: .5,
    lace: { n: 50, colors: ['#d48a35', '#f4c674', '#a25a1d'] }
  });

  const veg = (P, r) => disc(P, r, {
    R: 150, h: 28, freqs: [5, 9, 14, 22], jit: .03, bulge: 4,
    side: [[0, '#6e6136'], [.5, '#4a3f20'], [1, '#231d0d']], topFill: '#5b4f2a',
    sideDots: [
      { n: 220, colors: ['#7d9a3c', '#c56a2c', '#a8913f', '#2b2310', '#8a7a44'], rmin: 1.2, rmax: 3.6, op: [.55, 1] },
      { n: 24, colors: ['#e9d79a'], rmin: .8, rmax: 1.6, op: [.3, .6] }
    ],
    topDots: [{ n: 70, colors: ['#7d9a3c', '#c56a2c', '#2b2310'], rmin: 1, rmax: 3, op: [.6, 1] }],
    rim: '#9c8a50', rimW: 1.2, rimOp: .5,
    lace: { n: 30, colors: ['#3a3016', '#5a4c24'] }
  });

  /* ---------- tende (formaggi, salse) ---------- */
  function curtain(r, R, ry, h, o) {
    const drips = [];
    for (let i = 0; i < o.drips; i++) drips.push({ x: (r() * 2 - 1) * R * .86, L: lerp(o.Lmin, o.Lmax, r()), w: lerp(o.wmin, o.wmax, r()) });
    const top = [], bot = [];
    for (let i = 0; i <= 40; i++) {
      const t = Math.PI * i / 40;
      top.push([R * Math.cos(t), -h + ry * Math.sin(t)]);
    }
    for (let i = 0; i <= 90; i++) {
      const x = -R + 2 * R * i / 90;
      const s = Math.sqrt(Math.max(0, 1 - (x / R) ** 2));
      let y = -h + ry * s + o.base * (0.4 + .6 * s);
      for (const d of drips) {
        const u = (x - d.x) / d.w;
        if (Math.abs(u) < 1) y += d.L * Math.pow(1 - u * u, .38) * s;
      }
      bot.push([x, y]);
    }
    return { d: smooth(top.concat(bot)), drips };
  }

  const CHEESE = {
    cheddar: { c: ['#ffd04a', '#f7a516', '#d97806'], drips: 7, Lmin: 8, Lmax: 32, wmin: 11, wmax: 22, base: 7, corners: true, rind: null, strings: false },
    scamorza: { c: ['#f6e6bd', '#e8cd92', '#c99a55'], drips: 5, Lmin: 8, Lmax: 30, wmin: 12, wmax: 22, base: 6, corners: false, rind: '#b2783a', strings: false },
    fontina: { c: ['#fbefc4', '#f2d98f', '#d9b25a'], drips: 9, Lmin: 10, Lmax: 40, wmin: 7, wmax: 14, base: 6, corners: false, rind: null, strings: true }
  };

  function cheese(P, r, v) {
    const p = CHEESE[v], R = 156, ry = R * K, h = 4;
    const nz = harm(r, [3, 5, 8]);
    const sheet = smooth(ellPts(0, -h, R * 1.02, ry * 1.04, nz, .03));
    const c = curtain(r, R * 1.02, ry * 1.04, h, p);
    const defs = [
      blur(P + 'sh', 4), blur(P + 'g', 1.4),
      linV(P + 'f', [[0, p.c[0]], [.5, p.c[1]], [1, p.c[2]]], -h - ry, ry + p.Lmax),
      radU(P + 't', [[0, p.c[0]], [1, p.c[1]]], -R * .2, -h - ry * .4, R)
    ];
    let melt = `<path d="${c.d}" fill="url(#${P}f)"/>`;
    if (p.corners) {
      [-1, 1].forEach(s => {
        const pts = [[s * R * .86, -h - ry * .05], [s * R * 1.12, -h + ry * .35], [s * R * 1.09, -h + ry * .35 + 14 + r() * 8], [s * R * .98, -h + ry * .9]];
        melt += `<path d="${smooth(pts)}" fill="url(#${P}f)"/>`;
      });
    }
    let gl = '';
    c.drips.forEach(d => {
      if (d.L > 16) {
        const s = Math.sqrt(Math.max(0, 1 - (d.x / R) ** 2));
        const y0 = -h + ry * s + 4;
        gl += `<path d="M${f(d.x - d.w * .25)},${f(y0)} L${f(d.x - d.w * .2)},${f(y0 + d.L * .7)}" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".55" filter="url(#${P}g)"/>`;
      }
    });
    melt += gl;
    if (p.strings) {
      c.drips.forEach(d => {
        if (r() > .45) {
          const s = Math.sqrt(Math.max(0, 1 - (d.x / R) ** 2));
          const y0 = -h + ry * s + p.base + d.L * s * .9;
          melt += `<path d="M${f(d.x)},${f(y0)} q${f(-3 + r() * 6)},${f(10 + r() * 8)} ${f(-2 + r() * 4)},${f(18 + r() * 16)}" stroke="${p.c[1]}" stroke-width="1.3" fill="none" opacity=".75"/>`;
        }
      });
    }
    let body = shadow(P, R, ry, .3);
    body += `<g class="melt">${melt}</g>`;
    body += `<path d="${sheet}" fill="url(#${P}t)"/>`;
    if (p.rind) body += `<path d="${sheet}" fill="none" stroke="${p.rind}" stroke-width="5" opacity=".55"/>`;
    body += `<ellipse cx="${f(-R * .3)}" cy="${f(-h - ry * .35)}" rx="${f(R * .3)}" ry="${f(ry * .18)}" fill="#fff" opacity=".35" filter="url(#${P}g)"/>`;
    return { h, top: h + ry + 14, below: ry + p.Lmax + 26, melt: true, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  const SAUCE = {
    signature: ['#f2a868', '#e07f3c', '#b85a22', false],
    bbq: ['#7a2c14', '#561a0a', '#2c0b04', false],
    honey: ['#f4cc58', '#e2a72a', '#b9780f', false],
    tartufo: ['#f1e6cd', '#e0d0ac', '#b8a57c', true]
  };

  function sauce(P, r, v) {
    const p = SAUCE[v], R = 150, ry = R * K, h = 3;
    const nz = harm(r, [3, 6, 11]);
    const pool = smooth(ellPts(R * .08, -h + ry * .25, R * .62, ry * .55, nz, .12));
    const c = curtain(r, R * .97, ry * .97, h, { drips: 7, Lmin: 10, Lmax: 32, wmin: 6, wmax: 11, base: 5 });
    const defs = [blur(P + 'sh', 3), blur(P + 'g', 1.2), linV(P + 'f', [[0, p[0]], [.5, p[1]], [1, p[2]]], -h - ry, ry + 30)];
    let melt = `<path d="${c.d}" fill="url(#${P}f)"/>`;
    c.drips.forEach(d => {
      const s = Math.sqrt(Math.max(0, 1 - (d.x / R) ** 2));
      melt += `<ellipse cx="${f(d.x - d.w * .2)}" cy="${f(-h + ry * s + 3 + d.L * s * .75)}" rx="1.6" ry="2.8" fill="#fff" opacity=".6"/>`;
    });
    let body = `<g class="melt">${melt}</g><path d="${pool}" fill="url(#${P}f)" opacity=".96"/>`;
    body += `<path d="M${f(-R * .55)},${f(-h - ry * .45)} q${f(R * .3)},-6 ${f(R * .6)},-2" stroke="#fff" stroke-width="2.4" fill="none" opacity=".45" stroke-linecap="round" filter="url(#${P}g)"/>`;
    if (p[3]) body += dots(r, 60, () => inEll(r, 0, -h, R * .85, ry * .85), ['#1b140f', '#3a2c20'], .6, 1.6, .6, 1);
    return { h, top: h + ry + 10, below: ry + 40, melt: true, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  function sauceIcon(P, r, v) {
    const p = SAUCE[v];
    const defs = [radU(P + 'f', [[0, p[0]], [.6, p[1]], [1, p[2]]], -20, -60, 110)];
    let body = `<ellipse cx="0" cy="22" rx="120" ry="20" fill="#000" opacity=".35"/>`;
    body += `<path d="M-110,10 C-120,-20 -70,-30 -40,-34 C-60,-60 -20,-86 6,-74 C10,-100 50,-96 52,-70 C90,-70 120,-30 110,6 C100,26 -96,30 -110,10Z" fill="url(#${P}f)"/>`;
    body += `<path d="M-60,-36 C-40,-50 -10,-52 10,-46" stroke="#fff" stroke-width="7" fill="none" opacity=".45" stroke-linecap="round"/>`;
    if (p[3]) body += dots(r, 40, () => inEll(r, 0, -30, 90, 34), ['#1b140f'], 1.5, 3, .7, 1);
    return { h: 0, top: 104, below: 46, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  /* ---------- extra ---------- */
  function bacon(P, r) {
    const R = 150, ry = R * K, h = 10;
    const defs = [blur(P + 'sh', 4), linBox(P + 'm', [[0, '#5a140c'], [.35, '#a32e22'], [.6, '#c8503a'], [1, '#6e1a10']])];
    let body = shadow(P, R * .95, ry, .35);
    const strips = [{ y: -h - ry * .3, th: 22 }, { y: -h + ry * .5, th: 25 }];
    strips.forEach((st, si) => {
      const A = 3 + r() * 3, fq = .025 + r() * .02, ph = r() * 6, x0 = -178 - r() * 12, x1 = 178 + r() * 12;
      const top = [], bot = [];
      for (let i = 0; i <= 40; i++) {
        const x = lerp(x0, x1, i / 40);
        const droop = Math.max(0, Math.abs(x) - R * .8) ** 2 * .006;
        const y = st.y + A * Math.sin(fq * x + ph) + droop;
        const th = st.th * (0.85 + .3 * Math.sin(x * .05 + ph));
        top.push([x, y - th / 2]); bot.unshift([x, y + th / 2]);
      }
      const d = smooth(top.concat(bot));
      body += `<path d="${d}" fill="url(#${P}m)" stroke="#3a0c06" stroke-width="1.6"/>`;
      [-.15, .22].forEach(off => {
        const pts = top.map(([x, y], i) => [x, y + st.th * (0.5 + off) + Math.sin(i * .9 + si) * 1.5]);
        body += `<path d="${smooth(pts, false)}" fill="none" stroke="#f3cdb0" stroke-width="${f(2.2 + r() * 1.8)}" opacity=".75" stroke-linecap="round"/>`;
      });
      body += dots(r, 30, () => { const p = pick(r, top); return [p[0], p[1] + r() * st.th]; }, ['#3a0c06', '#2a0703'], 1, 2.6, .5, .9);
    });
    return { h, top: h + ry + 30, below: ry + 40, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  function cipolla(P, r) {
    const R = 150, ry = R * K, h = 8;
    const defs = [blur(P + 'sh', 4)];
    let body = shadow(P, R * .9, ry, .3);
    const strands = [];
    for (let i = 0; i < 90; i++) strands.push(inEll(r, 0, -h * .5, R * .96, ry * 1.05));
    strands.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => {
      const len = 18 + r() * 26, a = r() * Math.PI;
      const dx = Math.cos(a) * len, dy = Math.sin(a) * len * .35;
      body += `<path d="M${f(x - dx / 2)},${f(y - dy / 2)} q${f(dx / 2 + (r() - .5) * 12)},${f(dy / 2 - 6 - r() * 6)} ${f(dx)},${f(dy)}" stroke="${pick(r, ['#9a5a1f', '#c2803a', '#6e3a12', '#b36d28', '#d89a50'])}" stroke-width="${f(2.4 + r() * 2.6)}" fill="none" stroke-linecap="round"/>`;
    });
    body += dots(r, 26, () => inEll(r, 0, -h * .6, R * .8, ry * .8), ['#ffe2b0'], .8, 1.8, .4, .8);
    return { h, top: h + ry + 18, below: ry + 18, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  function rings(P, r) {
    const R = 150, ry = R * K, h = 22;
    const defs = [blur(P + 'sh', 5), linBox(P + 'sd', [[0, '#d9963f'], [1, '#8c4f15']]), radU(P + 'tp', [[0, '#f6cf7c'], [.7, '#e3a24a'], [1, '#b8742a']], -20, -h - 20, 120)];
    let body = shadow(P, R * 1.05, ry, .45);
    const items = [{ x: 4, y: -ry * .45 }, { x: -78, y: ry * .2 }, { x: 80, y: ry * .28 }].sort((a, b) => a.y - b.y);
    items.forEach((it, i) => {
      const ox = 78 + r() * 6, oy = ox * K * 1.25, ix = 40 + r() * 5, iy = ix * K * 1.15, th = 18;
      const cx = it.x, cy = it.y - h * .4;
      const side = `M${f(cx - ox)},${f(cy)} A${f(ox)},${f(oy)} 0 0 1 ${f(cx + ox)},${f(cy)} L${f(cx + ox)},${f(cy + th)} A${f(ox)},${f(oy)} 0 0 1 ${f(cx - ox)},${f(cy + th)} Z`;
      const topf = `M${f(cx - ox)},${f(cy)} a${f(ox)},${f(oy)} 0 1 0 ${f(ox * 2)},0 a${f(ox)},${f(oy)} 0 1 0 ${f(-ox * 2)},0 Z M${f(cx - ix)},${f(cy)} a${f(ix)},${f(iy)} 0 1 1 ${f(ix * 2)},0 a${f(ix)},${f(iy)} 0 1 1 ${f(-ix * 2)},0 Z`;
      body += `<clipPath id="${P}c${i}"><path d="${side}"/><path d="${topf}" fill-rule="evenodd"/></clipPath>`;
      body += `<path d="${side}" fill="url(#${P}sd)"/>`;
      body += `<path d="${topf}" fill="url(#${P}tp)" fill-rule="evenodd"/>`;
      body += `<path d="M${f(cx - ix)},${f(cy)} A${f(ix)},${f(iy)} 0 0 1 ${f(cx + ix)},${f(cy)}" stroke="#6e3a10" stroke-width="5" fill="none" opacity=".75"/>`;
      body += `<g clip-path="url(#${P}c${i})">${dots(r, 120, () => inEll(r, cx, cy + th * .4, ox, oy + th * .6), ['#f8d98e', '#b36d28', '#fff0c4', '#8c4f15'], 1.4, 3.6, .5, 1)}</g>`;
    });
    return { h, top: h + ry + 34, below: ry + 30, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  function funghi(P, r) {
    const R = 150, ry = R * K, h = 10;
    const defs = [blur(P + 'sh', 4)];
    let body = shadow(P, R * .95, ry, .3);
    const pts = [];
    for (let i = 0; i < 12; i++) pts.push(inEll(r, 0, -h * .5, R * 1.02, ry * 1.1));
    pts.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => {
      const w = 30 + r() * 14, a = f(-30 + r() * 60);
      const cap = `M${-w},0 C${-w},${f(-w * .95)} ${w},${f(-w * .95)} ${w},0 L${f(w * .32)},0 L${f(w * .28)},${f(w * .5)} L${f(-w * .28)},${f(w * .5)} L${f(-w * .32)},0 Z`;
      body += `<g transform="translate(${f(x)} ${f(y)}) scale(1 .5) rotate(${a})"><path d="${cap}" fill="#c9a77e" stroke="#4e321c" stroke-width="5"/><path d="M${f(-w * .8)},-4 C${f(-w * .6)},${f(-w * .6)} ${f(w * .6)},${f(-w * .6)} ${f(w * .8)},-4" fill="none" stroke="#9b7550" stroke-width="2.5"/><path d="M${f(-w * .2)},4 L${f(-w * .18)},${f(w * .42)} M${f(w * .1)},4 L${f(w * .12)},${f(w * .42)}" stroke="#a88660" stroke-width="2"/><ellipse cx="${f(-w * .3)}" cy="${f(-w * .4)}" rx="${f(w * .25)}" ry="3" fill="#fff" opacity=".3"/></g>`;
    });
    return { h, top: h + ry + 22, below: ry + 24, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  function scalogno(P, r) {
    const R = 150, ry = R * K, h = 6;
    const defs = [blur(P + 'sh', 3)];
    let body = shadow(P, R * .85, ry, .25);
    for (let i = 0; i < 90; i++) {
      const [x, y] = inEll(r, 0, -h * .6, R * .92, ry * 1.05);
      const rr = 3 + r() * 4, a0 = r() * Math.PI * 2, a1 = a0 + 1.6 + r() * 3;
      const p0 = [x + rr * Math.cos(a0), y + rr * .6 * Math.sin(a0)], p1 = [x + rr * Math.cos(a1), y + rr * .6 * Math.sin(a1)];
      body += `<path d="M${f(p0[0])},${f(p0[1])} A${f(rr)},${f(rr * .6)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(p1[0])},${f(p1[1])}" stroke="${pick(r, ['#c98a3a', '#e0aa55', '#8a5520', '#f0c574'])}" stroke-width="${f(1.6 + r() * 1.4)}" fill="none" stroke-linecap="round"/>`;
    }
    return { h, top: h + ry + 12, below: ry + 12, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  /* ---------- verdure ---------- */
  function lattuga(P, r) {
    const R = 170, ry = R * K, h = 10;
    const nz = harm(r, [9, 14, 21, 29, 37]);
    const out = smooth(cylPts(R, h, ry, nz, .055, 10, 48));
    const defs = [blur(P + 'sh', 5), linV(P + 'g', [[0, '#d4ef8c'], [.4, '#9ccc4e'], [1, '#4f8a24']], -h - ry, ry * 1.1), clip(P + 'k', out)];
    let body = shadow(P, R * .96, ry, .4) + `<path d="${out}" fill="url(#${P}g)"/>`;
    let v = '';
    for (let i = 0; i < 26; i++) {
      const t = Math.PI * (i + .5) / 26, x = R * Math.cos(t), y = ry * Math.sin(t) * 1.05;
      v += `<path d="M${f(x * .55)},${f(-h + y * .3)} Q${f(x * .8)},${f(y * .6 - h * .3)} ${f(x * 1.02)},${f(y + 4)}" stroke="#eaf8c0" stroke-width="${f(.8 + r() * 1)}" fill="none" opacity=".3"/>`;
      v += `<path d="M${f(x * 1.01)},${f(y - 2)} q${f(-6 + r() * 12)},${f(4 + r() * 4)} ${f(-8 + r() * 16)},${f(-2 + r() * 6)}" stroke="#3d7019" stroke-width="2.2" fill="none" opacity=".5"/>`;
    }
    body += `<g clip-path="url(#${P}k)">${v}</g>`;
    return { h, top: h + ry + 20, below: ry + 26, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  function pomodoro(P, r) {
    const R = 150, ry = R * K, h = 10;
    const defs = [blur(P + 'sh', 4), radU(P + 'r', [[0, '#ff8a6a'], [.55, '#ec4a36'], [1, '#c22a1c']], 0, -10, 80)];
    let body = shadow(P, R, ry, .35);
    const sl = [{ x: 0, y: -ry * .38 }, { x: -82, y: ry * .3 }, { x: 84, y: ry * .26 }];
    sl.forEach((s, i) => {
      const rx = 72 + r() * 6, sy = rx * K * 1.15, th = 9, cx = s.x, cy = s.y - h * .4;
      body += `<path d="M${f(cx - rx)},${f(cy)} A${f(rx)},${f(sy)} 0 0 0 ${f(cx + rx)},${f(cy)} L${f(cx + rx)},${f(cy + th)} A${f(rx)},${f(sy)} 0 0 1 ${f(cx - rx)},${f(cy + th)} Z" fill="#a51f15"/>`;
      body += `<g transform="translate(${f(cx)} ${f(cy)})"><ellipse rx="${f(rx)}" ry="${f(sy)}" fill="url(#${P}r)" stroke="#a51f15" stroke-width="3"/>`;
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * Math.PI * 2 + r() * .3, ca = Math.cos(a), sa = Math.sin(a);
        body += `<ellipse cx="${f(ca * rx * .5)}" cy="${f(sa * sy * .5)}" rx="${f(rx * .2)}" ry="${f(sy * .26)}" transform="rotate(${f(a * 57.3 * .2)} ${f(ca * rx * .5)} ${f(sa * sy * .5)})" fill="#ffb07a" opacity=".85"/>`;
        for (let q = 0; q < 3; q++) body += `<ellipse cx="${f(ca * rx * (.42 + q * .07))}" cy="${f(sa * sy * (.42 + q * .07))}" rx="2.6" ry="1.5" fill="#f7e27a"/>`;
      }
      body += `<ellipse rx="${f(rx * .16)}" ry="${f(sy * .2)}" fill="#ffc0a0" opacity=".8"/><ellipse cx="${f(-rx * .35)}" cy="${f(-sy * .45)}" rx="${f(rx * .25)}" ry="3" fill="#fff" opacity=".4"/></g>`;
    });
    return { h, top: h + ry + 20, below: ry + 24, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  function cavolo(P, r) {
    const R = 156, ry = R * K, h = 9;
    const defs = [blur(P + 'sh', 4)];
    let body = shadow(P, R, ry, .3);
    body += `<ellipse cx="0" cy="${f(-h * .4)}" rx="${f(R * .9)}" ry="${f(ry * .9)}" fill="#efe6dc" opacity=".7"/>`;
    const sh = [];
    for (let i = 0; i < 170; i++) sh.push(inEll(r, 0, -h * .5, R * 1.02, ry * 1.12));
    sh.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => {
      const len = 10 + r() * 16, a = r() * Math.PI, dx = Math.cos(a) * len, dy = Math.sin(a) * len * .4;
      body += `<path d="M${f(x)},${f(y)} q${f(dx / 2)},${f(dy / 2 - 3)} ${f(dx)},${f(dy)}" stroke="${pick(r, ['#6b1f5e', '#9a3f88', '#c27ab5', '#f2e6ef', '#7d2a70'])}" stroke-width="${f(1.6 + r() * 1.6)}" fill="none" stroke-linecap="round"/>`;
    });
    return { h, top: h + ry + 16, below: ry + 18, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  function cetrioli(P, r) {
    const R = 150, ry = R * K, h = 7;
    const defs = [blur(P + 'sh', 3), radU(P + 'g', [[0, '#cfdc86'], [.6, '#a6bd4e'], [1, '#6d8a2a']], 0, 0, 30)];
    let body = shadow(P, R * .9, ry, .25);
    const pts = [[-96, ry * .25], [-30, -ry * .3], [36, ry * .45], [100, ry * .05], [-10, ry * .75]].sort((a, b) => a[1] - b[1]);
    pts.forEach(([x, y]) => {
      const rx = 27 + r() * 4, sy = rx * .36;
      const nz = harm(r, [12, 17]);
      const edge = smooth(ellPts(0, 0, rx, sy, nz, .06, 40));
      body += `<g transform="translate(${f(x)} ${f(y - h * .5)})"><ellipse cy="3.5" rx="${f(rx)}" ry="${f(sy)}" fill="#3f5a14"/><path d="${edge}" fill="url(#${P}g)" stroke="#4d6a1a" stroke-width="2.6"/>`;
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283; body += `<ellipse cx="${f(Math.cos(a) * rx * .45)}" cy="${f(Math.sin(a) * sy * .45)}" rx="2.2" ry="1.2" fill="#eef2c4"/>`; }
      body += `<ellipse cx="${f(-rx * .3)}" cy="${f(-sy * .4)}" rx="${f(rx * .3)}" ry="1.6" fill="#fff" opacity=".45"/></g>`;
    });
    return { h, top: h + ry + 12, below: ry + 18, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  function rucola(P, r) {
    const R = 150, ry = R * K, h = 9;
    const defs = [blur(P + 'sh', 4)];
    let body = shadow(P, R * .9, ry, .3);
    const leaves = [];
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2, d = .15 + r() * .6;
      const back = Math.sin(a) < 0 ? .55 : 1;
      leaves.push({ x: Math.cos(a) * R * d, y: Math.sin(a) * ry * d - h * .5, a, L: (48 + r() * 42) * back, w: 10 + r() * 8 });
    }
    leaves.sort((p, q) => p.y - q.y).forEach(l => {
      const top = [], bot = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, lob = .65 + .35 * Math.abs(Math.sin(t * Math.PI * 3.5));
        top.push([t * l.L, -l.w * Math.sin(Math.PI * Math.pow(t, .8)) * lob]);
        bot.unshift([t * l.L, l.w * .8 * Math.sin(Math.PI * Math.pow(t, .8)) * lob]);
      }
      const ang = f(Math.atan2(Math.sin(l.a) * K * 2.2, Math.cos(l.a)) * 57.3 + (r() - .5) * 30);
      const col = pick(r, ['#3e7a25', '#5a9a34', '#2e5f1c', '#4b8a2c']);
      body += `<g transform="translate(${f(l.x)} ${f(l.y)}) rotate(${ang}) scale(1 ${f(.55 + r() * .3)})"><path d="${smooth(top.concat(bot))}" fill="${col}" stroke="#244d14" stroke-width="1"/><path d="M2,0 L${f(l.L * .92)},0" stroke="#a9d27a" stroke-width="1.3" opacity=".7"/></g>`;
    });
    return { h, top: h + ry + 40, below: ry + 44, svg: `<defs>${defs.join('')}</defs>${body}` };
  }

  /* ---------- registro ---------- */
  const R_ = {
    'bun-brioche': (P, r) => bunBottom(P, r, 'brioche'),
    'bun-sesamo': (P, r) => bunBottom(P, r, 'sesamo'),
    'bun-nero': (P, r) => bunBottom(P, r, 'nero'),
    'top-brioche': (P, r) => bunTop(P, r, 'brioche'),
    'top-sesamo': (P, r) => bunTop(P, r, 'sesamo'),
    'top-nero': (P, r) => bunTop(P, r, 'nero'),
    manzo, pollo, veg,
    cheddar: (P, r) => cheese(P, r, 'cheddar'),
    scamorza: (P, r) => cheese(P, r, 'scamorza'),
    fontina: (P, r) => cheese(P, r, 'fontina'),
    bacon, cipolla, rings, funghi, scalogno,
    lattuga, pomodoro, cavolo, cetrioli, rucola,
    signature: (P, r) => sauce(P, r, 'signature'),
    bbq: (P, r) => sauce(P, r, 'bbq'),
    honey: (P, r) => sauce(P, r, 'honey'),
    tartufo: (P, r) => sauce(P, r, 'tartufo')
  };
  const ICON = {
    signature: (P, r) => sauceIcon(P, r, 'signature'),
    bbq: (P, r) => sauceIcon(P, r, 'bbq'),
    honey: (P, r) => sauceIcon(P, r, 'honey'),
    tartufo: (P, r) => sauceIcon(P, r, 'tartufo'),
    brioche: (P, r) => bunTop(P, r, 'brioche'),
    sesamo: (P, r) => bunTop(P, r, 'sesamo'),
    nero: (P, r) => bunTop(P, r, 'nero')
  };

  function render(key, prefix, seed) {
    return R_[key](prefix, rng(seed));
  }

  function icon(key, prefix) {
    const a = ICON[key] ? ICON[key](prefix, rng(7)) : R_[key](prefix, rng(11));
    const pad = 6;
    return `<svg viewBox="-190 ${f(-a.top - pad)} 380 ${f(a.top + a.below + pad * 2)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${a.svg}</svg>`;
  }

  return { K, VBX, VBW, render, icon, rng };
})();

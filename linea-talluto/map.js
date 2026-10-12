/* Linea Talluto: shared transit-map engine (SmartLabDesign).
   Builds the octilinear "face" network into an <svg>, resolves station lengths
   and exposes a piecewise hold/range timeline (CWE-03 model) usable for
   scroll-scrub (home) or time-based autoplay (founder page).
   Semantic copy lives in each page's HTML; this file only draws. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  var RING = [[200,316],[182,316],[124,258],[124,212],[104,192],[104,128],[114,118],[114,64],[166,12],[236,12],[290,66],[290,118],[302,130],[302,184],[292,194],[292,236],[212,316],[200,316]];
  var AI = [[200,316],[200,226],[222,226],[236,212],[214,190],[186,190],[164,212],[178,226],[200,226],[200,132],[208,124],[262,124],[270,116],[260,106],[216,106],[208,114],[192,114],[184,106],[140,106],[130,116],[138,124],[158,124]];

  /* label: [x, y, anchor]; inner labels sit inside the face and are hidden on narrow screens */
  var STATIONS = [
    { p:[200,316], route:'ring', type:'x', name:'Caltanissetta ⇄ AI line', lab:[200,338,'middle'], wide:true },
    { p:[124,232], route:'ring', name:'Crea Comunicazione', year:'2006', lab:[110,235,'end'] },
    { p:[104,160], route:'ring', name:'PFE · Technical bids', year:'2009', lab:[90,163,'end'] },
    { p:[200,12],  route:'ring', name:'PFE · Graphic design', year:'2012', lab:[200,-6,'middle'] },
    { p:[302,157], route:'ring', name:'PFE · Social media', year:'2019', lab:[316,160,'start'] },
    { p:[292,224], route:'ring', name:'Navest', year:'2024', lab:[306,227,'start'] },
    { p:[200,316], route:'ring', end:true, shareWith:0 },
    { p:[200,226], route:'ai', type:'x', name:'Prompt', lab:[212,262,'start'], inner:true, ai:true },
    { p:[234,124], route:'ai', type:'x', name:'Visual gen.', lab:[240,90,'middle'], inner:true, ai:true },
    { p:[158,124], route:'ai', type:'t', name:'Today · AI', lab:[156,90,'middle'], inner:true, ai:true, big:true }
  ];

  var CSS = [
    '.lm-grid{stroke:rgba(0,191,196,.08);stroke-width:1}',
    '.lm-river{fill:none;stroke:var(--aqua,#00bfc4);stroke-opacity:.2;stroke-width:22;stroke-linejoin:round;stroke-linecap:round}',
    '.lm-ghost{fill:none;stroke:var(--cream,#fff0ce);stroke-opacity:.1;stroke-width:7;stroke-linejoin:round;stroke-linecap:round}',
    '.lm-line{fill:none;stroke-width:7;stroke-linejoin:round;stroke-linecap:round;transition:stroke .6s}',
    '.lm-ring{stroke:var(--coral,#ff6848)}',
    '.lm-ai{stroke:var(--pink,#ff2d87)}',
    '.lm-charge{fill:none;stroke:var(--pink,#ff2d87);stroke-width:7.4;stroke-linejoin:round;stroke-linecap:round;filter:drop-shadow(0 0 4px rgba(255,45,135,.9))}',
    '.lm-spark .halo{fill:var(--pink,#ff2d87);opacity:.45}',
    '.lm-spark .core{fill:var(--cream,#fff0ce)}',
    '.lm-pulse{fill:none;stroke:var(--sun,#ffbc42);stroke-width:3;stroke-linecap:round;stroke-dasharray:2 26;opacity:0;transition:opacity .6s}',
    '.lm-charged .lm-pulse{opacity:.95;animation:lm-run 2.4s linear infinite}',
    '@keyframes lm-run{to{stroke-dashoffset:-56}}',
    '.lm-st .core{fill:var(--cream,#fff0ce);stroke:#04211f;stroke-width:3;transition:fill .3s}',
    '.lm-st.pending .core{fill:#0a3a3f}',
    '.lm-st.term .core{fill:var(--pink,#ff2d87);stroke:var(--cream,#fff0ce)}',
    '.lm-st.term.pending .core{fill:#0a3a3f}',
    '.lm-st .ping{fill:none;stroke:var(--cream,#fff0ce);stroke-width:1.5;opacity:0;transform-box:fill-box;transform-origin:center}',
    '.lm-st.on .ping{animation:lm-ping 1.6s ease-out infinite}',
    '.lm-live .lm-st.term .ping{stroke:var(--pink,#ff2d87);animation:lm-ping 1.8s ease-out infinite}',
    '@keyframes lm-ping{from{transform:scale(1);opacity:.9}to{transform:scale(2.6);opacity:0}}',
    '.lm-lab{font:500 8.6px "DM Mono",ui-monospace,monospace;letter-spacing:.12em;fill:rgba(255,240,206,.6);text-transform:uppercase;transition:fill .3s}',
    '.lm-lab.yr{fill:var(--sun,#ffbc42);font-size:7.6px}',
    '.lm-lab.ai{fill:var(--pink,#ff2d87)}',
    '.lm-lab.big{font-size:10.4px}',
    '.lm-lab.on{fill:var(--cream,#fff0ce)}',
    '.lm-lab.ai.on{fill:var(--pink,#ff2d87)}',
    '.lm-train .halo{fill:var(--sun,#ffbc42);opacity:.25}',
    '.lm-train .car{fill:var(--sun,#ffbc42)}',
    '@media (max-width:640px){.lm-lab.inner{display:none}}',
    '@media (prefers-reduced-motion:reduce){.lm-charged .lm-pulse,.lm-st.on .ping,.lm-live .lm-st.term .ping{animation:none}}'
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('lm-css')) return;
    var s = document.createElement('style'); s.id = 'lm-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  var fmt = function (n) { return +n.toFixed(2); };
  function roundedD(pts, R) {
    R = R || 6;
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var px = pts[i-1][0], py = pts[i-1][1], cx = pts[i][0], cy = pts[i][1], nx = pts[i+1][0], ny = pts[i+1][1];
      var l1 = Math.hypot(cx-px, cy-py), l2 = Math.hypot(nx-cx, ny-cy), r = Math.min(R, l1/2, l2/2);
      d += ' L' + fmt(cx-(cx-px)/l1*r) + ' ' + fmt(cy-(cy-py)/l1*r) + ' Q' + cx + ' ' + cy + ' ' + fmt(cx+(nx-cx)/l2*r) + ' ' + fmt(cy+(ny-cy)/l2*r);
    }
    var L = pts[pts.length-1];
    return d + ' L' + L[0] + ' ' + L[1];
  }

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function lenAt(svg, route, pt) {
    for (var k = 0; k < route.length - 1; k++) {
      var a = route[k], b = route[k+1];
      var cross = (b[0]-a[0])*(pt[1]-a[1]) - (b[1]-a[1])*(pt[0]-a[0]);
      var within = Math.min(a[0],b[0])-.01 <= pt[0] && pt[0] <= Math.max(a[0],b[0])+.01 && Math.min(a[1],b[1])-.01 <= pt[1] && pt[1] <= Math.max(a[1],b[1])+.01;
      if (Math.abs(cross) < .01 && within) {
        if (k === 0 && pt[0] === a[0] && pt[1] === a[1]) return 0;
        var tmp = el('path', { d: roundedD(route.slice(0, k+1).concat([pt])) }, svg);
        var L = tmp.getTotalLength(); tmp.remove();
        return L;
      }
    }
    return 0;
  }

  function mount(svg, opts) {
    opts = opts || {};
    injectCSS();
    svg.setAttribute('viewBox', '-58 -30 496 380');
    var g = el('g', { 'aria-hidden': 'true' }, svg);
    var grid = el('g', {}, g), x, y;
    for (x = -48; x <= 438; x += 24) el('line', { x1:x, x2:x, y1:-30, y2:350, 'class':'lm-grid' }, grid);
    for (y = -18; y <= 350; y += 24) el('line', { x1:-58, x2:438, y1:y, y2:y, 'class':'lm-grid' }, grid);
    el('path', { 'class':'lm-river', d:'M-58 344 H36 L112 268 M288 268 L364 344 H438' }, g);
    var ringD = roundedD(RING), aiD = roundedD(AI);
    el('path', { 'class':'lm-ghost', d: ringD + ' ' + aiD }, g);
    var ring = el('path', { 'class':'lm-line lm-ring', d: ringD }, g);
    var ai = el('path', { 'class':'lm-line lm-ai', d: aiD }, g);
    /* electrification wave: same geometry reversed, so it runs from the terminus back to the origin */
    var chAI = el('path', { 'class':'lm-charge', d: roundedD(AI.slice().reverse()) }, g);
    var chRing = el('path', { 'class':'lm-charge', d: roundedD(RING.slice().reverse()) }, g);
    el('path', { 'class':'lm-pulse', d: ringD }, g);
    el('path', { 'class':'lm-pulse', d: aiD }, g);
    var gS = el('g', {}, g), gL = el('g', {}, g);
    var train = el('g', { 'class':'lm-train' }, g);
    el('circle', { r:10, 'class':'halo' }, train); el('circle', { r:4.6, 'class':'car' }, train);
    var spark = el('g', { 'class':'lm-spark' }, g);
    el('circle', { r:11, 'class':'halo' }, spark); el('circle', { r:4, 'class':'core' }, spark);
    spark.style.opacity = 0;

    var LR = ring.getTotalLength(), LA = ai.getTotalLength(), LT = LR + LA;
    ring.style.strokeDasharray = LR + ' ' + LR;
    ai.style.strokeDasharray = LA + ' ' + LA;
    chAI.style.strokeDasharray = LA + ' ' + LA; chRing.style.strokeDasharray = LR + ' ' + LR;

    var rmq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var CHARGE_MS = opts.chargeMs || 3000;
    var charging = false, charged = false, chargeRaf = 0, chargeT0 = 0, chargedFns = [];
    function setCharge(c) {
      var a = Math.min(c, LA), r = Math.max(0, c - LA);
      chAI.style.strokeDashoffset = LA - a;
      chRing.style.strokeDashoffset = LR - r;
      if (c > 0 && c < LT) {
        var pt = c <= LA ? chAI.getPointAtLength(a) : chRing.getPointAtLength(r);
        spark.setAttribute('transform', 'translate(' + fmt(pt.x) + ' ' + fmt(pt.y) + ')');
        spark.style.opacity = 1;
      } else spark.style.opacity = 0;
    }
    function finishCharge() {
      charging = false; charged = true; setCharge(LT);
      svg.classList.add('lm-charged');
      chargedFns.forEach(function (fn) { try { fn(); } catch (e) {} });
    }
    function startCharge() {
      charging = true;
      if (rmq.matches) { finishCharge(); return; }
      chargeT0 = 0;
      var step = function (ts) {
        if (!charging) return;
        if (!chargeT0) chargeT0 = ts;
        var t = Math.min(1, (ts - chargeT0) / CHARGE_MS);
        var e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        setCharge(e * LT);
        if (t < 1) chargeRaf = requestAnimationFrame(step); else finishCharge();
      };
      chargeRaf = requestAnimationFrame(step);
    }
    function resetCharge() {
      cancelAnimationFrame(chargeRaf); charging = false; charged = false;
      setCharge(0); svg.classList.remove('lm-charged');
    }
    setCharge(0);

    var st = STATIONS.map(function (s) {
      var o = { def: s };
      o.L = s.route === 'ring' ? (s.end ? LR : lenAt(svg, RING, s.p)) : LR + lenAt(svg, AI, s.p);
      return o;
    });
    st.forEach(function (o, i) {
      var s = o.def;
      if (s.shareWith !== undefined) { o.g = st[s.shareWith].g; o.labs = st[s.shareWith].labs; return; }
      var cls = 'lm-st pending' + (s.type === 't' ? ' term' : '');
      o.g = el('g', { 'class': cls, transform: 'translate(' + s.p[0] + ' ' + s.p[1] + ')' }, gS);
      el('circle', { r: s.type === 't' ? 8 : 6, 'class':'ping' }, o.g);
      if (s.type === 'x') el('rect', { x:-11, y:-5.5, width:22, height:11, rx:5.5, 'class':'core' }, o.g);
      else el('circle', { r: s.type === 't' ? 7.5 : 5.2, 'class':'core' }, o.g);
      o.labs = [];
      if (opts.labels !== false && s.lab) {
        var lx = s.lab[0], ly = s.lab[1], a = s.lab[2];
        var base = 'lm-lab' + (s.inner ? ' inner' : '') + (s.ai ? ' ai' : '') + (s.big ? ' big' : '');
        var t = el('text', { x:lx, y:ly, 'text-anchor':a, 'class': base }, gL); t.textContent = s.name; o.labs.push(t);
        if (s.year) {
          var yy = a === 'middle' ? ly - 12 : ly + 10;
          var t2 = el('text', { x:lx, y:yy, 'text-anchor':a, 'class':'lm-lab yr' }, gL); t2.textContent = s.year; o.labs.push(t2);
        }
      }
    });

    var active = -1;
    function activeAt(L) { var a = 0; st.forEach(function (o, i) { if (o.L <= L + .5) a = i; }); return a; }
    function draw(L) {
      L = Math.max(0, Math.min(LT, L));
      var lr = Math.min(L, LR), la = Math.max(0, L - LR);
      ring.style.strokeDashoffset = LR - lr;
      ai.style.strokeDashoffset = LA - la;
      var pt = L <= LR ? ring.getPointAtLength(lr) : ai.getPointAtLength(la);
      train.setAttribute('transform', 'translate(' + fmt(pt.x) + ' ' + fmt(pt.y) + ')');
      train.style.opacity = (L >= LT - .5 || L <= .5) ? 0 : 1;
      st.forEach(function (o) {
        var reached = st.some(function (t) { return t.g === o.g && t.L <= L + .5; });
        o.g.classList.toggle('pending', !reached);
      });
      var atEnd = L >= LT - .5;
      svg.classList.toggle('lm-live', atEnd);
      if (atEnd) { if (!charging && !charged) startCharge(); }
      else if (charging || charged) resetCharge();
      var a = activeAt(L);
      if (a !== active) {
        active = a;
        st.forEach(function (o) { o.g.classList.remove('on'); o.labs.forEach(function (t) { t.classList.remove('on'); }); });
        st[a].g.classList.add('on');
        st[a].labs.forEach(function (t) { t.classList.add('on'); });
      }
      return a;
    }

    /* piecewise timeline: hold at each station, range between (CWE-03).
       weight(i) gives the relative length of the travel segment i -> i+1 */
    function timeline(hold, weight) {
      weight = weight || function () { return 1; };
      var w = [], total = 0, i;
      for (i = 0; i < st.length; i++) {
        w.push({ type:'hold', w:hold, v:st[i].L, i:i }); total += hold;
        if (i < st.length - 1) { var tw = weight(i, st[i].L, st[i+1].L); w.push({ type:'range', w:tw, from:st[i].L, to:st[i+1].L, i:i }); total += tw; }
      }
      var u = 0;
      w.forEach(function (s) { s.start = u / total; u += s.w; s.end = u / total; });
      var ease = function (t) { return t < .5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; };
      return {
        resolve: function (p) {
          p = Math.max(0, Math.min(1, p));
          var s = null;
          for (var k = 0; k < w.length; k++) { if (p >= w[k].start && (p < w[k].end || k === w.length - 1)) { s = w[k]; break; } }
          if (!s) s = w[w.length - 1];
          if (s.type === 'hold') return s.v;
          var t = ease(Math.max(0, Math.min(1, (p - s.start) / (s.end - s.start))));
          return s.from + (s.to - s.from) * t;
        },
        holdCenter: function (i) { for (var k = 0; k < w.length; k++) if (w[k].type === 'hold' && w[k].i === i) return (w[k].start + w[k].end) / 2; return 0; }
      };
    }

    return { svg: svg, LR: LR, LA: LA, LT: LT, stations: st, count: st.length, draw: draw, activeAt: activeAt, timeline: timeline,
      onCharged: function (fn) { chargedFns.push(fn); }, isCharged: function () { return charged; },
      /* static render (no-JS-like resting state): fully drawn and already electrified */
      drawCharged: function () { draw(LT); cancelAnimationFrame(chargeRaf); finishCharge(); } };
  }

  window.LineaMap = { mount: mount, STATIONS: STATIONS };
})();

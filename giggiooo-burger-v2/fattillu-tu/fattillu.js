/* Fattillu tu — configuratore Giggiooo Burger (v2)
 * Stack fotografico con fisica (gravità, molle, squash), ingredienti dei tre signature,
 * comanda per il locale (immagine + testo) con invio WhatsApp o simulato.
 */
(() => {
  'use strict';
  const SP = window.FT_SPRITES, CFG = window.FT_CONFIG || { locations: {}, prices: null };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
  const $ = (q, r = document) => r.querySelector(q);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k, f) { try { return localStorage.getItem(k) ?? f; } catch { return f; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

  /* ---------------- ingredienti: solo quelli dei tre signature ---------------- */
  const CATS = [
    { id: 'carne', label: 'Carne' }, { id: 'formaggi', label: 'Formaggi' }, { id: 'extra', label: 'Bacon' },
    { id: 'verdure', label: 'Verdure' }, { id: 'salse', label: 'Salse' }
  ];
  const ING = {
    manzo: { cat: 'carne', name: 'Burger di manzo', max: 3, kind: 'protein', v: ['manzo-a'], flip: 1 },
    pollo: { cat: 'carne', name: 'Pollo impanato croccante', max: 2, kind: 'protein', v: ['pollo-a'], flip: 1 },
    cheddar: { cat: 'formaggi', name: 'Cheddar', max: 3, kind: 'cheese', v: ['cheddar-a'], flip: 1, drape: 1 },
    chiaro: { cat: 'formaggi', name: 'Formaggio chiaro', max: 3, kind: 'cheese', v: ['bianco-a'], flip: 1, drape: 1 },
    bacon: { cat: 'extra', name: 'Bacon', max: 3, rank: 10, v: ['bacon-a', 'bacon-b', 'bacon-c'], flip: 1 },
    pomodoro: { cat: 'verdure', name: 'Pomodoro', max: 2, rank: 40, v: ['pomodoro-a'], flip: 1 },
    lattuga: { cat: 'verdure', name: 'Lattuga', max: 2, rank: 41, v: ['lattuga-a', 'lattuga-b', 'lattuga-c'], flip: 1 },
    salsaGiu: { cat: 'salse', name: 'Salsa cremosa · inferiore', chip: 'Salsa cremosa · sulla base', max: 1, rank: 5, v: ['signature-b'], drape: 1 },
    salsaSu: { cat: 'salse', name: 'Salsa cremosa · superiore', chip: 'Salsa cremosa · sotto il pane', max: 1, rank: 60, v: ['signature-a'], drape: 1 }
  };
  const BUN = { bunB: { v: ['bun-brioche'] }, bunT: { v: ['top-brioche'] } };
  // ricette in ordine di montaggio, dal basso (come gli esplosi del menù)
  const PRESETS = {
    'neon-bacon': { name: 'Neon Bacon', items: ['salsaGiu', 'bacon', 'manzo', 'cheddar', 'pomodoro', 'lattuga', 'salsaSu'] },
    'double-melt': { name: 'Double Melt', items: ['salsaGiu', 'bacon', 'manzo', 'cheddar', 'manzo', 'chiaro', 'pomodoro', 'lattuga', 'salsaSu'] },
    'golden-double': { name: 'Golden Burger', items: ['salsaGiu', 'bacon', 'pollo', 'cheddar', 'lattuga', 'salsaSu'] }
  };
  const MAX_LAYERS = 13;

  /* ---------------- contorni e bibite (catalogo V2) ---------------- */
  const XS = window.FT_EXTRAS || {};
  const catalogDrinks = (window.GB_CATALOG && window.GB_CATALOG.drinks) || [];
  const fact = (d, k) => ((d.facts || []).find(f => f[0] === k) || [])[1] || '';
  const EXTRAS = [
    { id: 'patatine', kind: 'side', name: 'Patatine', sub: 'Fry box Giggiooo', max: 3 },
    { id: 'onion-rings', kind: 'side', name: 'Onion rings', sub: 'Fry box Giggiooo', max: 3 },
    ...catalogDrinks.filter(d => XS[d.id]).map(d => ({ id: d.id, kind: 'drink', name: d.name, sub: fact(d, 'Formato'), max: 4 }))
  ].filter(x => XS[x.id]);
  const XBY = Object.fromEntries(EXTRAS.map(x => [x.id, x]));

  const state = { items: [], seq: 0, phase: 'build', cat: 'carne', preset: null, code: '', extras: {}, lastSide: null, lastDrink: null };

  /* ---------------- DOM ---------------- */
  const stage = $('.stage'), fitEl = $('.stack-fit'), zoomEl = $('.stack-zoom'), flag = $('.flag');
  const tabs = $('.tabs'), grid = $('#chips'), cta = $('.cta'), ctaLabel = $('.cta-label'), ctaMeta = $('.cta-meta'), delta = $('.delta');
  const insideList = $('.inside-list'), statLayers = $('[data-stat="layers"]'), statPrice = $('[data-stat="price"]');
  const live = $('.sr-live'), status = $('.stage-status'), smoke = $('.smoke'), form = $('#order-form'), toastEl = $('.toast');
  const ticket = $('#ticket');
  const STACK_W = 420, STACK_H = 600, FLOOR = 530, GAP = 70, SINK = 10; // SINK: quanto il bun chiuso affonda sugli ingredienti

  /* ---------------- sprite ---------------- */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const IMG = {};
  const loadInto = (key, src) => new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(); i.decoding = 'async'; i.src = src; IMG[key] = i; });
  const preload = Promise.all(Object.entries(SP).map(([k, s]) => loadInto(k, s.src)));
  const preloadX = () => Promise.all(Object.entries(XS).map(([k, s]) => IMG['x:' + k] ? null : loadInto('x:' + k, s.src)));
  const preloadWrap = () => IMG.wrap ? Promise.resolve() : loadInto('wrap', 'extras/incarto.webp');

  function artFor(key, seed) {
    const d = ING[key] || BUN[key], r = rng(seed);
    const name = d.v[Math.floor(r() * d.v.length)], s = SP[name];
    return { name, s, flip: !!d.flip && r() > .5, drape: !!d.drape, h: s.h, top: s.H - s.below, below: s.below };
  }

  /* ---------------- motore stack ---------------- */
  const layers = new Map();
  let uidN = 0, bunB, bunT, totalH = 0;

  function makeLayer(uid, key, seed) {
    const a = artFor(key, seed);
    const el = document.createElement('div');
    el.className = 'layer' + (a.drape ? ' is-drape' : '');
    el.style.height = a.s.H + 'px';
    el.style.transformOrigin = `50% ${a.top}px`;
    el.innerHTML = `<div class="art"><span class="shadow" style="top:${a.top - 9}px;width:${Math.round(a.s.w * .9)}px;margin-left:${-Math.round(a.s.w * .45)}px"></span><img src="${a.s.src}" alt="" draggable="false" style="width:${a.s.w}px;height:${a.s.H}px;margin-left:${-a.s.w / 2}px${a.flip ? ';transform:scaleX(-1)' : ''}"></div>`;
    zoomEl.appendChild(el);
    const L = { uid, key, el, art: a, y: 0, vy: 0, target: 0, sq: 0, vsq: 0, fall: false, lastT: '' };
    layers.set(uid, L);
    return L;
  }

  function stackOrder() {
    const items = state.items.slice();
    const prot = items.filter(i => ING[i.id].kind === 'protein');
    const chs = items.filter(i => ING[i.id].kind === 'cheese');
    const rest = items.filter(i => !ING[i.id].kind).sort((a, b) => ING[a.id].rank - ING[b.id].rank || a.seq - b.seq);
    const out = [{ uid: 'bunB' }];
    rest.filter(i => ING[i.id].rank < 30).forEach(i => out.push(i));
    const n = Math.max(prot.length, chs.length);
    for (let k = 0; k < n; k++) { if (prot[k]) out.push(prot[k]); if (chs[k]) out.push(chs[k]); }
    rest.filter(i => ING[i.id].rank > 31).forEach(i => out.push(i));
    return out;
  }

  function relayout(spawn) {
    const order = stackOrder();
    const alive = new Set(order.map(o => o.uid));
    layers.forEach((L, uid) => { if (uid !== 'bunT' && !alive.has(uid)) remove(L); });
    let b = 0;
    order.forEach((o, i) => {
      let L = layers.get(o.uid);
      if (!L) {
        L = makeLayer(o.uid, o.id, o.seed);
        L.y = reduced ? b : b + 300; L.fall = !reduced;
        L.el.classList.add('enter');
      }
      L.target = b;
      L.el.style.zIndex = i + 1;
      b += L.art.h;
    });
    totalH = b;
    // aperto: il bun sta davanti (esploso); chiuso: dietro agli strati, che ne coprono la faccia interna
    bunT.el.style.zIndex = state.phase === 'build' ? 60 : 0;
    bunT.target = state.phase === 'build' ? totalH + GAP : totalH - SINK;
    if (spawn && !reduced && state.phase === 'build') bunT.vy += 240;
    setZoom();
    kick();
  }

  let zoomVal = 1;
  function setZoom() {
    const need = Math.max(totalH + GAP + bunT.art.top + 40, extraNeedH);
    zoomVal = Math.min(1, (FLOOR - 30) / need);
    zoomEl.style.setProperty('--zoom', zoomVal.toFixed(3));
    if (typeof fit === 'function') fit();
  }

  function remove(L) {
    layers.delete(L.uid);
    const dir = Math.random() > .5 ? 1 : -1;
    L.el.style.setProperty('--dx', dir * 220 + 'px');
    L.el.style.setProperty('--rot', dir * 14 + 'deg');
    L.el.classList.add('out');
    setTimeout(() => L.el.remove(), reduced ? 0 : 480);
  }

  function impact(L, power) {
    L.vsq += power;
    [...layers.values()].filter(o => o !== L && o.target < L.target).sort((a, b) => b.target - a.target)
      .forEach((o, i) => setTimeout(() => { o.vsq += power * .45 * Math.pow(.7, i); kick(); }, 25 * (i + 1)));
  }

  let raf = 0, last = 0, time = 0;
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    const dt = Math.min(.033, (now - last) / 1000); last = now; time += dt;
    let moving = false;
    layers.forEach(L => {
      if (L.fall) {
        L.vy -= 2900 * dt; L.y += L.vy * dt;
        if (L.y <= L.target) {
          const imp = -L.vy; L.y = L.target;
          if (imp > 260) { L.vy = imp * .17; impact(L, Math.min(imp, 1800) / 1800 * (L === bunT ? 6 : 4)); }
          else { L.vy = 0; L.fall = false; }
        }
        moving = true;
      } else {
        const k = 230, c = 2 * Math.sqrt(k) * .78;
        L.vy += (k * (L.target - L.y) - c * L.vy) * dt; L.y += L.vy * dt;
        if (Math.abs(L.target - L.y) > .05 || Math.abs(L.vy) > .5) moving = true;
      }
      L.vsq += (-560 * L.sq - 15 * L.vsq) * dt; L.sq += L.vsq * dt;
      if (Math.abs(L.sq) > .0008 || Math.abs(L.vsq) > .01) moving = true;
      let bob = 0;
      if (L === bunT && state.phase === 'build' && !reduced) { bob = Math.sin(time * 2.1) * 3.2; moving = true; }
      const sq = Math.max(-.22, Math.min(.26, L.sq));
      const Y = FLOOR - (L.y + bob) - L.art.top;
      const t = `translate3d(0,${Y.toFixed(1)}px,0) scale(${(1 + sq * .5).toFixed(4)},${(1 - sq).toFixed(4)})`;
      if (t !== L.lastT) { L.el.style.transform = t; L.lastT = t; }
    });
    if (bunT) flag.style.transform = `translate3d(-50%,${(FLOOR - bunT.y - bunT.art.top - 128).toFixed(1)}px,0)`;
    if (moving) raf = requestAnimationFrame(tick); else raf = 0;
  }

  /* ---------------- stato e azioni ---------------- */
  const count = id => state.items.filter(i => i.id === id).length;
  const proteins = () => state.items.filter(i => ING[i.id].kind === 'protein').length;
  const priced = () => CFG.prices && typeof CFG.prices.base === 'number';
  function price() { if (!priced()) return null; return state.items.reduce((s, i) => s + (CFG.prices[i.id] || 0), CFG.prices.base); }

  function reopen() {
    if (state.phase === 'build') return;
    state.phase = 'build';
    document.body.classList.remove('is-done', 'is-grilling');
    flag.classList.remove('in');
    bunT.fall = false; bunT.vy = 380; bunT.el.style.zIndex = 60;
  }

  function add(id, silent) {
    const ing = ING[id];
    if (state.phase === 'grilling') return;
    reopen();
    if (count(id) >= ing.max || state.items.length >= MAX_LAYERS) { shake(id); say(`${ing.name}: hai raggiunto il massimo`); return; }
    if (ing.kind === 'protein' && proteins() >= 3) { shake(id); say('Massimo tre carni per burger'); return; }
    state.items.push({ id, uid: 'u' + (++uidN), seq: ++state.seq, seed: 1000 + uidN * 97 });
    if (!silent) { markCustom(); pulse('+ ' + shortName(id)); say(`${ing.name} aggiunto`); }
    relayout(true); update();
  }

  function removeOne(id) {
    if (state.phase === 'grilling') return;
    reopen();
    for (let i = state.items.length - 1; i >= 0; i--) if (state.items[i].id === id) { state.items.splice(i, 1); break; }
    markCustom(); pulse('− ' + shortName(id)); say(`${ING[id].name} rimosso`);
    relayout(false); update();
  }

  const shortName = id => ING[id].chip ? 'Salsa' : ING[id].name;

  function markCustom() {
    if (!state.preset) return;
    state.preset = null;
    document.querySelectorAll('.preset').forEach(b => b.setAttribute('aria-pressed', 'false'));
  }

  function loadPreset(key) {
    if (state.phase === 'grilling') return;
    const p = PRESETS[key];
    reopen();
    state.items = []; relayout(false); update();
    state.preset = key;
    document.querySelectorAll('.preset').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.preset === key)));
    p.items.forEach((id, i) => setTimeout(() => {
      if (state.preset !== key) return;
      add(id, true);
      if (i === p.items.length - 1) say(`${p.name} caricato. Cambialo come vuoi.`);
    }, reduced ? 0 : 200 + i * 170));
  }

  function reset() {
    if (state.phase === 'grilling') return;
    reopen(); markCustom(); state.items = []; relayout(false); update(); say('Ripartiamo da zero');
  }

  async function closeBurger() {
    if (!proteins()) { shake(null); say('Aggiungi almeno una carne'); state.cat = 'carne'; renderTabs(); renderChips(); return; }
    state.phase = 'grilling';
    document.body.classList.add('is-grilling');
    update();
    bunT.target = totalH - SINK;
    bunT.el.style.zIndex = 0;
    if (!reduced) { bunT.fall = true; bunT.vy = 120; } else bunT.y = totalH - SINK;
    kick();
    status.textContent = 'Sulla piastra · fuoco vivo';
    if (!reduced) runGrill(GRILL_MS);
    await wait(reduced ? 150 : GRILL_MS);
    flag.classList.add('in');
    state.phase = 'done';
    document.body.classList.remove('is-grilling');
    document.body.classList.add('is-done');
    status.textContent = 'Pronto. Manca solo la comanda.';
    update();
    setTimeout(() => form.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }), 300);
    say('Burger chiuso. Compila la comanda e invia al locale.');
  }

  function onCta() {
    if (state.phase === 'build') return closeBurger();
    if (state.phase === 'done') return openTicket();
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const GRILL_MS = 3000;

  /* ---------------- contorni e bibite ---------------- */
  const xCount = id => state.extras[id] || 0;
  const xList = kind => EXTRAS.filter(x => x.kind === kind && xCount(x.id));
  const xTotal = () => Object.values(state.extras).reduce((a, b) => a + b, 0);

  function xAdd(id) {
    const x = XBY[id]; if (!x) return;
    if (xCount(id) >= x.max) { shakeEl(document.querySelector(`.xchip[data-id="${id}"]`)); say(`${x.name}: massimo ${x.max}`); return; }
    state.extras[id] = xCount(id) + 1;
    if (x.kind === 'side') state.lastSide = id; else state.lastDrink = id;
    pulse('+ ' + x.name); say(`${x.name} aggiunto all’ordine`);
    renderStageExtras(true); update();
  }
  function xRemove(id) {
    const x = XBY[id]; if (!x || !xCount(id)) return;
    state.extras[id]--; if (!state.extras[id]) delete state.extras[id];
    if (state.lastSide === id && !xCount(id)) state.lastSide = (xList('side')[0] || {}).id || null;
    if (state.lastDrink === id && !xCount(id)) state.lastDrink = (xList('drink')[0] || {}).id || null;
    pulse('− ' + x.name); say(`${x.name} rimosso`);
    renderStageExtras(false); update();
  }

  function xChip(x) {
    const s = XS[x.id];
    return `<div class="chip xchip ${x.kind}" data-id="${x.id}">
      <button type="button" class="chip-main" data-xadd="${x.id}" aria-label="Aggiungi ${esc(x.name)}">
        <span class="chip-icon"><img src="${s.src}" alt="" draggable="false" loading="lazy"></span>
        <span class="chip-name">${esc(x.name)}</span>
        <span class="chip-meta">${esc(x.sub)}</span>
      </button>
      <span class="chip-badge" aria-hidden="true"></span>
      <button type="button" class="chip-minus" data-xremove="${x.id}" aria-label="Rimuovi ${esc(x.name)}">−</button>
    </div>`;
  }
  function renderExtras() {
    $('.extras-sides').innerHTML = EXTRAS.filter(x => x.kind === 'side').map(xChip).join('');
    $('.extras-drinks').innerHTML = EXTRAS.filter(x => x.kind === 'drink').map(xChip).join('');
  }
  function syncExtras() {
    document.querySelectorAll('.xchip').forEach(c => {
      const n = xCount(c.dataset.id);
      c.classList.toggle('active', n > 0);
      c.querySelector('.chip-badge').textContent = n > 1 ? '×' + n : n ? '✓' : '';
    });
  }

  // misure reali tarate sul bun (≈ 12 cm = 312 u → 26 u/cm); fry box ≈ 0,78 × bun come nella hero
  const UCM = 26, BURGER_HALF = 185;
  const REAL = { patatine: { wcm: 9.4 }, 'onion-rings': { wcm: 9.4 }, 'ceres-premium-lager': { hcm: 22.5 }, 'fontalba-naturale': { hcm: 21 } };
  function xDims(id) {
    const s = XS[id], r = REAL[id] || { hcm: s.h / s.w > 2.15 ? 14.6 : 11.5 }; // lattine: sleek 33 cl o standard
    if (r.wcm) { const w = r.wcm * UCM; return { w, h: w * s.h / s.w }; }
    const h = r.hcm * UCM; return { w: h * s.w / s.h, h };
  }
  function xPlace(kind, id) {
    const d = xDims(id), sign = kind === 'side' ? -1 : 1;
    return { ...d, x: sign * (BURGER_HALF + d.w / 2 + 4) };
  }
  let extraNeedH = 0, extraNeedW = STACK_W;
  const stageX = {};
  function renderStageExtras(animate) {
    ['side', 'drink'].forEach(kind => {
      const id = kind === 'side' ? state.lastSide : state.lastDrink;
      const cur = stageX[kind];
      if (cur && cur.id === id) { cur.badge.textContent = xCount(id) > 1 ? '×' + xCount(id) : ''; return; }
      if (cur) { const el = cur.el; el.classList.add('leave'); setTimeout(() => el.remove(), 320); delete stageX[kind]; }
      if (!id) return;
      const s = XS[id], p = xPlace(kind, id), h = Math.round(p.h), w = Math.round(p.w);
      const el = document.createElement('div');
      el.className = 'xitem ' + kind + (animate && !reduced ? ' drop' : '');
      el.style.cssText = `width:${w}px;height:${h}px;left:${210 + p.x - w / 2}px;top:${FLOOR - 16 - h}px`;
      el.innerHTML = `<span class="xshadow"></span><img src="${s.src}" alt="" draggable="false"><b class="xbadge"></b>`;
      zoomEl.appendChild(el);
      const badge = el.querySelector('.xbadge'); badge.textContent = xCount(id) > 1 ? '×' + xCount(id) : '';
      stageX[kind] = { id, el, badge };
    });
    document.body.classList.toggle('has-extras', !!(state.lastSide || state.lastDrink));
    const ps = ['side', 'drink'].map(k => { const id = k === 'side' ? state.lastSide : state.lastDrink; return id ? xPlace(k, id) : null; });
    extraNeedH = Math.max(0, ...ps.filter(Boolean).map(p => p.h + 56));
    extraNeedW = 2 * Math.max(STACK_W / 2, ...ps.filter(Boolean).map(p => Math.abs(p.x) + p.w / 2)) + 20;
    setZoom(); fit();
  }

  /* ---------------- UI ---------------- */
  function renderTabs() {
    tabs.innerHTML = CATS.map(c => `<button type="button" role="tab" class="tab" data-cat="${c.id}" aria-selected="${c.id === state.cat}" aria-controls="chips">${c.label}<span class="tab-count" data-tabcount="${c.id}"></span></button>`).join('');
    syncCatNav();
  }
  // navigazione tra categorie: frecce, sfumature ai bordi, "Categoria n di 5", pulsante Avanti, swipe
  const catIdx = () => CATS.findIndex(c => c.id === state.cat);
  function goCat(i, focusTab) {
    i = Math.max(0, Math.min(CATS.length - 1, i));
    if (CATS[i].id === state.cat) return;
    const dir = i > catIdx() ? 1 : -1;
    state.cat = CATS[i].id;
    tabs.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.cat === state.cat)));
    renderChips();
    grid.classList.remove('slide-l', 'slide-r'); void grid.offsetWidth; grid.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
    const t = tabs.querySelector(`.tab[data-cat="${state.cat}"]`);
    if (t) { t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' }); if (focusTab) t.focus(); }
    syncCatNav();
  }
  function syncCatNav() {
    const i = catIdx(), n = CATS.length;
    $('.cat-step').textContent = `Categoria ${i + 1} di ${n}`;
    const next = $('.cat-next');
    if (i < n - 1) { next.innerHTML = `Avanti: ${CATS[i + 1].label} <span aria-hidden="true">→</span>`; next.dataset.go = i + 1; }
    else { next.innerHTML = 'Contorno e bibita <span aria-hidden="true">↓</span>'; next.dataset.go = 'extras'; }
    $('.tab-arrow.prev').disabled = i === 0; $('.tab-arrow.next').disabled = i === n - 1;
    $('.cat-dots').innerHTML = CATS.map((c, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    syncFades();
  }
  function syncFades() {
    const w = $('.tabs-wrap'); if (!w) return;
    w.classList.toggle('more-l', tabs.scrollLeft > 4);
    w.classList.toggle('more-r', tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 4);
  }

  function renderChips() {
    grid.innerHTML = Object.keys(ING).filter(id => ING[id].cat === state.cat).map(id => {
      const ing = ING[id], s = SP[ing.v[0]];
      return `<div class="chip" data-id="${id}">
        <button type="button" class="chip-main" data-add="${id}" aria-label="Aggiungi ${esc(ing.name)}">
          <span class="chip-icon"><img src="${s.src}" alt="" draggable="false"></span>
          <span class="chip-name">${esc(ing.chip || ing.name)}</span>
          <span class="chip-meta">max ${ing.max}</span>
        </button>
        <span class="chip-badge" aria-hidden="true"></span>
        <button type="button" class="chip-minus" data-remove="${id}" aria-label="Rimuovi ${esc(ing.name)}">−</button>
      </div>`;
    }).join('');
    syncChips();
  }

  function syncChips() {
    grid.querySelectorAll('.chip').forEach(c => {
      const n = count(c.dataset.id);
      c.classList.toggle('active', n > 0);
      c.querySelector('.chip-badge').textContent = n > 1 ? '×' + n : n ? '✓' : '';
    });
    CATS.forEach(cat => {
      const el = tabs.querySelector(`[data-tabcount="${cat.id}"]`);
      if (el) { const n = state.items.filter(i => ING[i.id].cat === cat.id).length; el.textContent = n || ''; }
    });
  }

  // elenco dall'alto verso il basso, con la stessa nomenclatura delle schede del menù
  function layerNames() {
    const order = stackOrder().slice(1).reverse().map(o => ING[o.id].name);
    const tally = {}; order.forEach(n => (tally[n] = (tally[n] || 0) + 1));
    const seen = {};
    const named = order.map(n => { if (tally[n] < 2) return n; seen[n] = (seen[n] || 0) + 1; return `${n} · ${seen[n]} di ${tally[n]}`; });
    return ['Pane brioche · parte superiore', ...named, 'Pane brioche · base'];
  }

  function update() {
    const names = layerNames();
    insideList.innerHTML = names.map((n, i) => `<li><span class="num">${String(i + 1).padStart(2, '0')}</span><span>${esc(n)}</span></li>`).join('');
    statLayers.textContent = `${names.length} livelli`;
    const p = price();
    statPrice.innerHTML = p == null ? '<span class="pending">Prezzo da definire</span>' : `${eur.format(p)} <small>PREZZO DEMO</small>`;
    const xt = xTotal();
    ctaMeta.textContent = (p == null ? `${names.length} livelli` : eur.format(p)) + (xt ? ` · ${xt} extra` : '');
    syncExtras();
    if (state.phase === 'build') ctaLabel.textContent = proteins() ? 'Chiudi il panino' : 'Scegli una carne';
    if (state.phase === 'grilling') ctaLabel.textContent = 'Sulla piastra…';
    if (state.phase === 'done') ctaLabel.textContent = 'Invia al locale';
    cta.classList.toggle('is-disabled', state.phase === 'build' && !proteins());
    syncChips();
    if (state.phase === 'build') status.textContent = state.items.length ? 'Tocca un ingrediente per aggiungerlo, − per toglierlo.' : 'Parti da un signature o componilo da zero.';
  }

  let deltaT;
  function pulse(txt) {
    delta.textContent = txt;
    delta.classList.remove('show'); void delta.offsetWidth; delta.classList.add('show');
    clearTimeout(deltaT); deltaT = setTimeout(() => delta.classList.remove('show'), 1100);
  }
  function shake(id) { shakeEl(id ? grid.querySelector(`.chip[data-id="${id}"]`) : cta); }
  function shakeEl(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  function say(msg) { live.textContent = ''; setTimeout(() => (live.textContent = msg), 30); }
  let toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('visible'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('visible'), 3200); }

  /* ---------------- fumo ---------------- */
  // cottura: bagliore sotto il burger, fumo che sale dai bordi, braci e sfrigolio delle carni
  function runGrill(ms) {
    const ctx = smoke.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    const w = smoke.clientWidth, h = smoke.clientHeight;
    smoke.width = w * dpr; smoke.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sr = stage.getBoundingClientRect(), tr = bunT.el.getBoundingClientRect(), br = bunB.el.getBoundingClientRect();
    const cx = w / 2, top = tr.top - sr.top + tr.height * .35, base = br.top - sr.top + br.height * .2, half = Math.max(60, tr.width * .36);
    const k = Math.max(.5, Math.min(1.1, half / 160));
    const smokeP = [], embers = [], start = performance.now();
    const sizzle = setInterval(() => layers.forEach(L => { if (ING[L.key] && ING[L.key].kind === 'protein') L.vsq += .35 + Math.random() * .35; }), 260);
    setTimeout(() => clearInterval(sizzle), ms * .8);
    (function frame(now) {
      const el = now - start, active = el < ms * .85;
      if (active) {
        for (let i = 0; i < 2; i++) {
          const side = Math.random();
          const x = side < .7 ? cx + (Math.random() - .5) * half * 1.8 : cx + (Math.random() < .5 ? -1 : 1) * half * (1 + Math.random() * .2);
          const y = side < .7 ? top + Math.random() * 20 : top + Math.random() * (base - top);
          smokeP.push({ x, y, r: (22 + Math.random() * 28) * k, vx: (Math.random() - .5) * 16 * k, vy: -(36 + Math.random() * 46) * k, life: 0, max: 1.8 + Math.random() * 1.4, seed: Math.random() * 6 });
        }
        for (let q = 0; q < 2; q++) if (Math.random() < .8) embers.push({ x: cx + (Math.random() - .5) * half * 2.4, y: base + Math.random() * 18, vx: (Math.random() - .5) * 40 * k, vy: -(90 + Math.random() * 120) * k, life: 0, max: .8 + Math.random() * 1, r: 1.6 + Math.random() * 2.4 });
      }
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      for (let i = smokeP.length - 1; i >= 0; i--) {
        const p = smokeP[i]; p.life += 1 / 60;
        if (p.life > p.max) { smokeP.splice(i, 1); continue; }
        p.x += p.vx / 60 + Math.sin(p.life * 2.4 + p.seed) * .5; p.y += p.vy / 60; p.r += .55 * k;
        const a = Math.sin(Math.PI * Math.min(1, p.life / p.max)) * .38;
        // nucleo scuro sotto + velo chiaro sopra: il fumo si legge anche sulle luci del bancone
        const d = ctx.createRadialGradient(p.x + 4, p.y + 6, 0, p.x + 4, p.y + 6, p.r * 1.1);
        d.addColorStop(0, `rgba(40,28,20,${a * .35})`); d.addColorStop(1, 'rgba(40,28,20,0)');
        ctx.fillStyle = d; ctx.beginPath(); ctx.arc(p.x + 4, p.y + 6, p.r * 1.1, 0, Math.PI * 2); ctx.fill();
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(245,238,226,${a})`); g.addColorStop(.55, `rgba(222,212,198,${a * .5})`); g.addColorStop(1, 'rgba(222,212,198,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]; e.life += 1 / 60;
        if (e.life > e.max) { embers.splice(i, 1); continue; }
        e.x += e.vx / 60 + Math.sin(e.life * 14) * .4; e.y += e.vy / 60; e.vy *= .985;
        const a = (1 - e.life / e.max) * (.6 + Math.random() * .4);
        ctx.fillStyle = `rgba(255,${150 + Math.random() * 60 | 0},60,${a})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,140,40,${a * .25})`; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (el < ms + 3200 || smokeP.length || embers.length) requestAnimationFrame(frame); else ctx.clearRect(0, 0, w, h);
    })(start);
  }

  function fit() {
    const r = stage.getBoundingClientRect(), head = innerWidth <= 820 ? 70 : 0;
    const needW = Math.max(STACK_W, extraNeedW * zoomVal);
    const f = Math.min(r.width * .96 / needW, (r.height - head) * .97 / STACK_H);
    fitEl.style.setProperty('--fit', f.toFixed(4));
    placeCounter(r, f);
  }

  // bancone agganciato alle coordinate del burger: il punto d’appoggio cade sempre al 90% dell’immagine,
  // dentro il piano; l'immagine si allarga quanto serve per coprire lo stage
  const counter = $('.counter'), BG_RATIO = 1340 / 2400, BG_FLOOR = .9;
  function placeCounter(r, f) {
    if (!counter) return;
    const bottomPad = parseFloat(getComputedStyle(fitEl).bottom) || 0;
    const floorY = r.height - bottomPad - (STACK_H - FLOOR) * f, cx = r.width / 2;
    let W = Math.max(1150 * f, 2 * Math.max(cx, r.width - cx) + 4,
      floorY / BG_FLOOR / BG_RATIO + 4, (r.height - floorY) / (1 - BG_FLOOR) / BG_RATIO + 4);
    const wu = W / f, hu = wu * BG_RATIO;
    counter.style.cssText = `width:${wu.toFixed(1)}px;height:${hu.toFixed(1)}px;left:${(STACK_W / 2 - wu / 2).toFixed(1)}px;top:${(FLOOR - BG_FLOOR * hu).toFixed(1)}px`;
  }

  /* ---------------- comanda ---------------- */
  function locations() { return Object.entries(CFG.locations || {}); }
  function fillLocations() {
    const sel = form.elements.location, saved = store.get('gb-concept-location', 'studio');
    sel.innerHTML = locations().map(([id, l]) => `<option value="${id}" ${id === saved ? 'selected' : ''}>${esc(l.name)}${l.whatsapp ? '' : ' · demo'}</option>`).join('');
  }

  function orderData() {
    const f = form.elements;
    const loc = CFG.locations[f.location.value] || { name: f.location.value, whatsapp: '' };
    return {
      burger: f.burger.value.trim() || 'Il mio Giggiooo', client: f.client.value.trim(), location: f.location.value, loc,
      service: f.service.value === 'sala' ? 'Al tavolo' : 'Asporto', notes: f.notes.value.trim(),
      layers: layerNames(), price: price(), code: state.code, when: new Date(),
      extras: EXTRAS.filter(x => xCount(x.id)).map(x => ({ ...x, qty: xCount(x.id) }))
    };
  }

  // scena della comanda: burger + contorno + bibita nelle stesse proporzioni dello stage
  function sceneCanvas(scale, d) {
    const order = stackOrder().map(o => layers.get(o.uid)).filter(Boolean);
    const all = [{ L: bunT, base: totalH - SINK }, ...order.map(L => ({ L, base: L.target }))];
    const side = d.extras.find(e => e.id === state.lastSide) || d.extras.find(e => e.kind === 'side');
    const drink = d.extras.find(e => e.id === state.lastDrink) || d.extras.find(e => e.kind === 'drink');
    const xs = [side && { e: side, ...xPlace('side', side.id) }, drink && { e: drink, ...xPlace('drink', drink.id) }].filter(Boolean);
    const L = Math.max(330, ...xs.map(p => -p.x + p.w / 2 + 10)), Rr = Math.max(330, ...xs.map(p => p.x + p.w / 2 + 10));
    const top = Math.max(totalH + bunT.art.top + 8, ...xs.map(p => p.h + 30)), bot = 90;
    const c = document.createElement('canvas'); c.width = Math.round((L + Rr) * scale); c.height = Math.round((top + bot) * scale);
    const x = c.getContext('2d'); x.scale(scale, scale); x.translate(L, top);
    const wi = IMG.wrap; if (wi && wi.width) { const ww = Math.min(640, L + Rr - 20), wh = ww * wi.height / wi.width; x.drawImage(wi, -ww / 2, 6 - wh / 2, ww, wh); }
    xs.forEach(p => {
      const im = IMG['x:' + p.e.id]; if (!im || !im.width) return;
      x.save(); x.translate(p.x, -14); x.scale(1, .1);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, p.w * .5); g.addColorStop(0, 'rgba(10,4,2,.5)'); g.addColorStop(1, 'rgba(10,4,2,0)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, p.w * .5, 0, Math.PI * 2); x.fill(); x.restore();
      x.drawImage(im, p.x - p.w / 2, -16 - p.h, p.w, p.h);
    });
    all.forEach(({ L: Ly, base }) => {
      const a = Ly.art, y = -base - a.top;
      x.save(); x.translate(0, -base); x.scale(1, .08);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, a.s.w * .46);
      g.addColorStop(0, `rgba(10,4,2,${a.drape ? .28 : .45})`); g.addColorStop(1, 'rgba(10,4,2,0)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, a.s.w * .46, 0, Math.PI * 2); x.fill(); x.restore();
      x.save(); if (a.flip) x.scale(-1, 1);
      x.drawImage(IMG[a.name], -a.s.w / 2, y, a.s.w, a.s.H); x.restore();
    });
    return c;
  }

  async function ticketImage(d) {
    await preload;
    await document.fonts.ready;
    const logo = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = '../assets/logo.webp'; });
    const W = 1080, rowH = 46, listH = d.layers.length * rowH;
    const xH = d.extras.length ? 70 + d.extras.length * rowH : 0;
    const H = 1240 + listH + xH + (d.notes ? 90 : 0);
    await preloadX(); await preloadWrap();
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a170f'); bg.addColorStop(1, '#160c08');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(228,174,85,.4)'; x.lineWidth = 2; x.strokeRect(34, 34, W - 68, H - 68);
    if (logo) x.drawImage(logo, 70, 66, 170, 114);
    x.textAlign = 'right'; x.fillStyle = '#dca655'; x.font = '700 22px Arial, Helvetica, sans-serif';
    x.fillText('COMANDA · FATTILLU TU', W - 70, 100);
    x.fillStyle = '#fff5e5'; x.font = '800 44px Arial, Helvetica, sans-serif'; x.fillText(d.code, W - 70, 150);
    x.fillStyle = '#c7b7a5'; x.font = '400 22px Arial, Helvetica, sans-serif';
    x.fillText(d.when.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), W - 70, 184);
    // burger
    const b = sceneCanvas(2, d), maxW = 940, maxH = 560, sc = Math.min(maxW / b.width, maxH / b.height);
    const bw = b.width * sc, bh = b.height * sc;
    const glow = x.createRadialGradient(W / 2, 560, 20, W / 2, 560, 420); glow.addColorStop(0, 'rgba(255,170,80,.16)'); glow.addColorStop(1, 'rgba(255,170,80,0)');
    x.fillStyle = glow; x.fillRect(0, 220, W, 680);
    x.drawImage(b, (W - bw) / 2, 230 + (maxH - bh), bw, bh);
    // titolo
    x.textAlign = 'left'; x.fillStyle = '#fff5e5'; x.font = '800 58px Arial, Helvetica, sans-serif';
    x.fillText(d.burger.slice(0, 28), 70, 880);
    x.fillStyle = '#c7b7a5'; x.font = '400 24px Arial, Helvetica, sans-serif';
    x.fillText(`${d.client} · ${d.loc.name} · ${d.service}`, 70, 922);
    // elenco
    x.strokeStyle = 'rgba(228,174,85,.5)'; x.beginPath(); x.moveTo(70, 962); x.lineTo(W - 70, 962); x.stroke();
    x.fillStyle = '#dca655'; x.font = '700 20px Arial, Helvetica, sans-serif'; x.fillText('DENTRO IL BURGER · DALL’ALTO VERSO IL BASSO', 70, 1000);
    d.layers.forEach((n, i) => {
      const y = 1050 + i * rowH;
      x.fillStyle = '#e4ae55'; x.font = '700 22px Arial, Helvetica, sans-serif'; x.fillText(String(i + 1).padStart(2, '0'), 70, y);
      x.fillStyle = '#fff5e5'; x.font = '400 28px Arial, Helvetica, sans-serif'; x.fillText(n, 130, y);
      x.strokeStyle = 'rgba(228,174,85,.14)'; x.beginPath(); x.moveTo(70, y + 16); x.lineTo(W - 70, y + 16); x.stroke();
    });
    let y = 1050 + listH + 20;
    if (d.extras.length) {
      x.fillStyle = '#dca655'; x.font = '700 20px Arial, Helvetica, sans-serif'; x.fillText('CONTORNI E BIBITE', 70, y + 14);
      d.extras.forEach((e, i) => {
        const yy = y + 64 + i * rowH;
        x.fillStyle = '#e4ae55'; x.font = '700 22px Arial, Helvetica, sans-serif'; x.fillText('×' + e.qty, 70, yy);
        x.fillStyle = '#fff5e5'; x.font = '400 28px Arial, Helvetica, sans-serif'; x.fillText(e.name, 130, yy);
        x.fillStyle = '#c7b7a5'; x.font = '400 20px Arial, Helvetica, sans-serif'; x.textAlign = 'right'; x.fillText(e.sub, W - 70, yy); x.textAlign = 'left';
        x.strokeStyle = 'rgba(228,174,85,.14)'; x.beginPath(); x.moveTo(70, yy + 16); x.lineTo(W - 70, yy + 16); x.stroke();
      });
      y += xH;
    }
    if (d.notes) {
      x.fillStyle = '#dca655'; x.font = '700 20px Arial, Helvetica, sans-serif'; x.fillText('NOTE PER LA CUCINA', 70, y + 10);
      x.fillStyle = '#fff5e5'; x.font = 'italic 28px Georgia, serif'; x.fillText(d.notes.slice(0, 60), 70, y + 52); y += 90;
    }
    x.fillStyle = '#c7b7a5'; x.font = '700 20px Arial, Helvetica, sans-serif';
    x.fillText(d.price == null ? 'PREZZO DA DEFINIRE' : `TOTALE ${eur.format(d.price)} · PREZZO DEMO`, 70, H - 70);
    x.textAlign = 'right'; x.fillText('GIGGIOOO BURGER · MORE THAN A BURGER', W - 70, H - 70);
    return c;
  }

  function ticketText(d) {
    return [`*Comanda ${d.code} · Fattillu tu*`, `${d.burger} — ${d.client}`, `${d.loc.name} · ${d.service}`, '', 'Dall’alto verso il basso:',
      ...d.layers.map((n, i) => `${String(i + 1).padStart(2, '0')}. ${n}`),
      d.extras.length ? '\nContorni e bibite:' : '', ...d.extras.map(e => `×${e.qty} ${e.name}${e.sub ? ' (' + e.sub + ')' : ''}`),
      d.notes ? `\nNote: ${d.notes}` : '',
      d.price == null ? 'Prezzo da definire' : `Totale ${eur.format(d.price)}`].filter(l => l !== '').join('\n');
  }

  let lastBlob = null, lastData = null;
  let lastKey = '';
  async function buildTicket(requireName) {
    const f = form.elements, err = $('.form-error', form);
    if (requireName && !f.client.value.trim()) { err.textContent = 'Inserisci il tuo nome per la comanda.'; f.client.focus(); shake(null); return null; }
    err.textContent = '';
    store.set('gb-concept-location', f.location.value);
    if (!state.code) state.code = 'FT-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const d = orderData();
    if (!d.client) d.client = 'Cliente';
    const key = JSON.stringify({ ...d, when: 0 });
    if (lastBlob && key === lastKey) return lastData;
    const c = await ticketImage(d);
    lastBlob = await new Promise(r => c.toBlob(r, 'image/png'));
    lastData = d; lastKey = key;
    return d;
  }
  const ticketFile = () => new File([lastBlob], `comanda-${lastData.code}.png`, { type: 'image/png' });
  const canShareFiles = (() => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })); } catch { return false; } })();

  async function downloadNow(btn) {
    btn.disabled = true;
    try { if (await buildTicket(false)) { downloadTicket(); toast(`Comanda ${lastData.code} scaricata · puoi inviarla tu al locale`); } }
    finally { btn.disabled = false; }
  }
  async function shareNow(btn) {
    btn.disabled = true;
    try {
      const d = await buildTicket(false); if (!d) return;
      try { await navigator.share({ files: [ticketFile()], text: ticketText(d), title: `Comanda ${d.code}` }); } catch (_) {}
    } finally { btn.disabled = false; }
  }

  async function openTicket() {
    cta.disabled = true;
    try {
      const d = await buildTicket(true); if (!d) return;
      $('#ticket-img').src = URL.createObjectURL(lastBlob);
      $('#ticket-code').textContent = d.code;
      const xt = d.extras.reduce((a, e) => a + e.qty, 0);
      $('#ticket-text').textContent = `${d.layers.length} livelli${xt ? ` + ${xt} tra contorni e bibite` : ''} · ${d.loc.name} · ${d.service}. La cucina riceve l’immagine del burger e gli ingredienti nell’ordine di montaggio.`;
      const live = !!d.loc.whatsapp;
      $('#ticket-demo').hidden = live;
      $('#ticket-send').textContent = live ? 'Invia su WhatsApp' : 'Simula l’invio';
      ticket.showModal();
    } finally { cta.disabled = false; }
  }

  async function sendTicket() {
    const d = lastData; if (!d) return;
    const text = ticketText(d);
    if (!d.loc.whatsapp) {
      ticket.close();
      toast(`Comanda ${d.code} inviata a ${d.loc.name} · simulazione`);
      say('Invio simulato completato');
      return;
    }
    const file = ticketFile();
    if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ files: [file], text }); return; } catch (_) {}
    }
    window.open(`https://wa.me/${encodeURIComponent(d.loc.whatsapp)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  function downloadTicket() {
    if (!lastBlob) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(lastBlob); a.download = `comanda-${lastData.code}.png`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ---------------- eventi ---------------- */
  tabs.addEventListener('click', e => {
    const b = e.target.closest('.tab'); if (!b) return;
    goCat(CATS.findIndex(c => c.id === b.dataset.cat));
  });
  tabs.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    goCat(catIdx() + (e.key === 'ArrowRight' ? 1 : -1), true);
  });
  grid.addEventListener('click', e => {
    const r = e.target.closest('[data-remove]'), a = e.target.closest('[data-add]');
    if (r) return removeOne(r.dataset.remove);
    if (a) add(a.dataset.add);
  });
  $('#extras').addEventListener('click', e => {
    const r = e.target.closest('[data-xremove]'), a = e.target.closest('[data-xadd]');
    if (r) return xRemove(r.dataset.xremove);
    if (a) xAdd(a.dataset.xadd);
  });
  $('.tab-arrow.prev').addEventListener('click', () => goCat(catIdx() - 1));
  $('.tab-arrow.next').addEventListener('click', () => goCat(catIdx() + 1));
  $('.cat-next').addEventListener('click', e => {
    const g = e.currentTarget.dataset.go;
    if (g === 'extras') $('#extras').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    else goCat(+g);
  });
  tabs.addEventListener('scroll', syncFades, { passive: true });
  addEventListener('resize', syncFades, { passive: true });
  // swipe orizzontale sui chip per cambiare categoria
  let sx = 0, sy = 0;
  grid.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  grid.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) goCat(catIdx() + (dx < 0 ? 1 : -1));
  }, { passive: true });
  document.querySelectorAll('.preset').forEach(b => b.addEventListener('click', () => loadPreset(b.dataset.preset)));
  $('.btn-reset').addEventListener('click', reset);
  $('.btn-edit').addEventListener('click', () => { reopen(); relayout(false); update(); $('.tabs').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
  cta.addEventListener('click', onCta);
  form.addEventListener('submit', e => { e.preventDefault(); onCta(); });
  $('#ticket-send').addEventListener('click', sendTicket);
  $('#ticket-download').addEventListener('click', downloadTicket);
  $('.btn-download').addEventListener('click', e => downloadNow(e.currentTarget));
  const shareBtn = $('.btn-share');
  if (canShareFiles) { shareBtn.hidden = false; shareBtn.addEventListener('click', e => shareNow(e.currentTarget)); }
  $('.dialog-close', ticket).addEventListener('click', () => ticket.close());
  ticket.addEventListener('click', e => { if (e.target === ticket) ticket.close(); });
  addEventListener('resize', fit, { passive: true });
  new ResizeObserver(fit).observe(stage);

  /* ---------------- init ---------------- */
  bunB = makeLayer('bunB', 'bunB', 3);
  bunT = makeLayer('bunT', 'bunT', 5);
  bunT.y = GAP;
  fillLocations(); renderTabs(); renderChips(); renderExtras(); fit(); relayout(false); update();
  const q = new URLSearchParams(location.search).get('burger');
  preload.then(() => setTimeout(() => loadPreset(PRESETS[q] ? q : 'neon-bacon'), reduced ? 0 : 350));
})();

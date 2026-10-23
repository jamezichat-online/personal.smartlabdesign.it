/* Giggiooo Burger — Configuratore "Crea il tuo"
 * Motore stack con fisica (gravità + molle), ordine canonico degli strati,
 * pricing live, allergeni, preset dal menu, finale "griglia" e share card.
 */
(() => {
  const A = window.GGArt;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- dati (prezzi e valori dimostrativi) ---------------- */
  const BASE = 4.9;
  const CATS = [
    { id: 'pane', label: 'Pane' }, { id: 'carne', label: 'Carne' }, { id: 'formaggi', label: 'Formaggi' },
    { id: 'extra', label: 'Extra' }, { id: 'verdure', label: 'Verdure' }, { id: 'salse', label: 'Salse' }
  ];
  const ING = {
    brioche: { cat: 'pane', name: 'Brioche', price: 0, kcal: 230, all: ['glutine', 'latte', 'uova'] },
    sesamo: { cat: 'pane', name: 'Sesamo', price: 0, kcal: 245, all: ['glutine', 'sesamo'] },
    nero: { cat: 'pane', name: 'Nero al carbone', price: .5, kcal: 235, all: ['glutine'] },

    manzo: { cat: 'carne', name: 'Smash di manzo', price: 3.5, kcal: 290, all: [], max: 3, kind: 'protein', rank: 30 },
    pollo: { cat: 'carne', name: 'Pollo croccante', price: 3.2, kcal: 330, all: ['glutine', 'uova'], max: 2, kind: 'protein', rank: 30 },
    veg: { cat: 'carne', name: 'Burger vegetale', price: 3.8, kcal: 240, all: ['soia', 'sedano'], max: 2, kind: 'protein', rank: 30 },

    cheddar: { cat: 'formaggi', name: 'Cheddar', price: 1, kcal: 80, all: ['latte'], max: 3, kind: 'cheese', rank: 31 },
    scamorza: { cat: 'formaggi', name: 'Scamorza affumicata', price: 1.2, kcal: 90, all: ['latte'], max: 2, kind: 'cheese', rank: 31 },
    fontina: { cat: 'formaggi', name: 'Fontina filante', price: 1.4, kcal: 100, all: ['latte'], max: 2, kind: 'cheese', rank: 31 },

    bacon: { cat: 'extra', name: 'Bacon croccante', price: 1.5, kcal: 110, all: [], max: 2, rank: 40 },
    cipolla: { cat: 'extra', name: 'Cipolla caramellata', price: .9, kcal: 60, all: [], max: 1, rank: 41 },
    funghi: { cat: 'extra', name: 'Funghi grigliati', price: 1.2, kcal: 35, all: [], max: 1, rank: 42 },
    rings: { cat: 'extra', name: 'Onion rings', price: 1.3, kcal: 140, all: ['glutine', 'latte'], max: 1, rank: 43 },
    scalogno: { cat: 'extra', name: 'Scalogno crispy', price: .8, kcal: 70, all: ['glutine'], max: 1, rank: 44 },

    lattuga: { cat: 'verdure', name: 'Lattuga', price: .4, kcal: 5, all: [], max: 1, rank: 20 },
    pomodoro: { cat: 'verdure', name: 'Pomodoro', price: .5, kcal: 10, all: [], max: 1, rank: 21 },
    cavolo: { cat: 'verdure', name: 'Cavolo viola', price: .5, kcal: 25, all: ['uova'], max: 1, rank: 22 },
    cetrioli: { cat: 'verdure', name: 'Cetrioli', price: .5, kcal: 5, all: ['senape'], max: 1, rank: 45 },
    rucola: { cat: 'verdure', name: 'Rucola', price: .6, kcal: 5, all: [], max: 1, rank: 50 },

    signature: { cat: 'salse', name: 'Salsa signature', price: .6, kcal: 90, all: ['uova', 'senape'], max: 1, rank: 60 },
    bbq: { cat: 'salse', name: 'BBQ affumicata', price: .6, kcal: 60, all: ['senape'], max: 1, rank: 61 },
    honey: { cat: 'salse', name: 'Honey mustard', price: .6, kcal: 70, all: ['senape'], max: 1, rank: 62 },
    tartufo: { cat: 'salse', name: 'Crema al tartufo', price: 1.2, kcal: 110, all: ['latte'], max: 1, rank: 63 }
  };
  const PRESETS = {
    originale: { name: "L'Originale", bun: 'brioche', items: ['manzo', 'cheddar', 'manzo', 'cheddar', 'bacon', 'cipolla', 'signature'] },
    fume: { name: 'Il Fumé', bun: 'sesamo', items: ['manzo', 'scamorza', 'rings', 'scalogno', 'bbq'] },
    dorato: { name: 'Il Dorato', bun: 'brioche', items: ['lattuga', 'cavolo', 'pollo', 'cheddar', 'honey'] },
    bosco: { name: 'Il Bosco', bun: 'brioche', items: ['manzo', 'fontina', 'funghi', 'rucola', 'tartufo'] }
  };
  const MAX_LAYERS = 13;
  const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  /* ---------------- stato ---------------- */
  const state = { bun: 'brioche', items: [], seq: 0, phase: 'build', cat: 'carne', name: '' };

  /* ---------------- DOM ---------------- */
  const $ = s => document.querySelector(s);
  const stage = $('.stage'), fitEl = $('.stack-fit'), zoomEl = $('.stack-zoom'), flag = $('.flag');
  const tabs = $('.tabs'), grid = $('.chips'), cta = $('.cta'), ctaLabel = $('.cta-label'), ctaPrice = $('.cta-price'), delta = $('.delta');
  const statPrice = $('[data-stat="price"]'), statKcal = $('[data-stat="kcal"]'), statLayers = $('[data-stat="layers"]'), allergens = $('.allergens');
  const live = $('.sr-live'), status = $('.stage-status'), done = $('.done-panel'), nameInput = $('#burger-name');
  const smoke = $('.smoke');

  const STACK_W = 420, STACK_H = 600, FLOOR = 530, GAP = 64;

  /* ---------------- layer engine ---------------- */
  const layers = new Map();
  let uidN = 0;

  function makeLayer(uid, key, seed) {
    const el = document.createElement('div');
    el.className = 'layer';
    el.innerHTML = '<div class="art"></div>';
    zoomEl.appendChild(el);
    const L = { uid, key, el, art: null, y: 0, vy: 0, target: 0, sq: 0, vsq: 0, fall: false, x: 0, bob: 0, seed, dead: false, lastT: '' };
    setArt(L, key);
    layers.set(uid, L);
    return L;
  }

  function setArt(L, key) {
    L.key = key;
    L.art = A.render(key, `${L.uid}_${key}_`, L.seed);
    const H = L.art.top + L.art.below;
    L.el.style.height = H + 'px';
    L.el.style.transformOrigin = `50% ${L.art.top}px`;
    L.el.firstChild.innerHTML = `<svg viewBox="${A.VBX} ${-L.art.top} ${A.VBW} ${H}" width="${STACK_W}" height="${H}" aria-hidden="true">${L.art.svg}</svg>`;
    const m = L.el.querySelector('.melt');
    if (m && !reduced) requestAnimationFrame(() => setTimeout(() => m.classList.add('on'), 360));
    else if (m) m.classList.add('on');
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

  let bunB, bunT, totalH = 0, zoom = 1;

  function relayout(spawn) {
    const order = stackOrder();
    const alive = new Set(order.map(o => o.uid));
    layers.forEach((L, uid) => {
      if (uid !== 'bunT' && !alive.has(uid) && !L.dead) remove(L);
    });
    let b = 0;
    order.forEach((o, i) => {
      let L = layers.get(o.uid);
      if (!L) {
        L = makeLayer(o.uid, o.id, o.seed);
        L.y = b + 300; L.fall = !reduced; L.vy = 0;
        if (reduced) L.y = b;
        L.el.classList.add('enter');
      }
      L.target = b;
      L.el.style.zIndex = i + 1;
      b += L.art.h;
    });
    totalH = b;
    bunT.el.style.zIndex = 60;
    bunT.target = totalH + (state.phase === 'build' ? GAP : 0);
    if (spawn && !reduced && state.phase === 'build') bunT.vy += 240;
    const need = totalH + GAP + bunT.art.top + 40;
    zoom = Math.min(1, (FLOOR - 30) / need);
    zoomEl.style.setProperty('--zoom', zoom.toFixed(3));
    kick();
  }

  function remove(L) {
    L.dead = true;
    layers.delete(L.uid);
    const dir = Math.random() > .5 ? 1 : -1;
    L.el.style.setProperty('--dx', dir * 220 + 'px');
    L.el.style.setProperty('--rot', dir * 16 + 'deg');
    L.el.classList.add('out');
    setTimeout(() => L.el.remove(), reduced ? 0 : 480);
  }

  function impact(L, power) {
    L.vsq += power;
    const below = [...layers.values()].filter(o => o !== L && o.target < L.target).sort((a, b) => b.target - a.target);
    below.forEach((o, i) => { setTimeout(() => { o.vsq += power * .45 * Math.pow(.7, i); kick(); }, 25 * (i + 1)); });
  }

  /* ---------------- loop ---------------- */
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
          if (imp > 260) { L.vy = imp * .17; impact(L, Math.min(imp, 1800) / 1800 * (L === bunT ? 7 : 4.5)); }
          else { L.vy = 0; L.fall = false; }
        }
        moving = true;
      } else {
        const k = 230, c = 2 * Math.sqrt(k) * .78;
        const a = k * (L.target - L.y) - c * L.vy;
        L.vy += a * dt; L.y += L.vy * dt;
        if (Math.abs(L.target - L.y) > .05 || Math.abs(L.vy) > .5) moving = true;
      }
      const sa = -560 * L.sq - 15 * L.vsq;
      L.vsq += sa * dt; L.sq += L.vsq * dt;
      if (Math.abs(L.sq) > .0008 || Math.abs(L.vsq) > .01) moving = true;
      let bob = 0;
      if (L === bunT && state.phase === 'build' && !reduced) { bob = Math.sin(time * 2.1) * 3.2; moving = true; }
      const sq = Math.max(-.25, Math.min(.3, L.sq));
      const Y = FLOOR - (L.y + bob) - L.art.top;
      const t = `translate3d(0,${Y.toFixed(1)}px,0) scale(${(1 + sq * .55).toFixed(4)},${(1 - sq).toFixed(4)})`;
      if (t !== L.lastT) { L.el.style.transform = t; L.lastT = t; }
    });
    placeFlag();
    if (moving) raf = requestAnimationFrame(tick); else raf = 0;
  }

  function placeFlag() {
    if (!bunT) return;
    const y = FLOOR - bunT.y - bunT.art.crown;
    flag.style.transform = `translate3d(-50%,${(y - 128).toFixed(1)}px,0)`;
  }

  /* ---------------- calcoli ---------------- */
  function totals() {
    const list = [state.bun, ...state.items.map(i => i.id)];
    const price = BASE + list.reduce((s, id) => s + ING[id].price, 0);
    const kcal = list.reduce((s, id) => s + ING[id].kcal, 0);
    const all = [...new Set(list.flatMap(id => ING[id].all))].sort();
    return { price, kcal, all, layers: state.items.length + 2 };
  }
  const count = id => state.items.filter(i => i.id === id).length;
  const proteins = () => state.items.filter(i => ING[i.id].kind === 'protein').length;

  /* ---------------- azioni ---------------- */
  function reopen() {
    if (state.phase === 'build') return;
    state.phase = 'build';
    document.body.classList.remove('is-done', 'is-grilling');
    flag.classList.remove('in');
    bunT.fall = false; bunT.vy = 380;
    zoomEl.querySelectorAll('.melt.hot').forEach(m => m.classList.remove('hot'));
  }

  function add(id, silent) {
    const ing = ING[id];
    if (ing.cat === 'pane') return setBun(id);
    if (state.phase === 'grilling') return;
    reopen();
    if (count(id) >= ing.max || state.items.length >= MAX_LAYERS) { shake(id); say(`${ing.name}: hai raggiunto il massimo`); return; }
    if (ing.kind === 'protein' && proteins() >= 3) { shake(id); say('Massimo tre carni per burger'); return; }
    state.items.push({ id, uid: 'u' + (++uidN), seq: ++state.seq, seed: 1000 + uidN * 97 });
    relayout(true);
    if (!silent) { pulseDelta(ing.price); say(`${ing.name} aggiunto. Totale ${eur.format(totals().price)}`); }
    update();
  }

  function removeOne(id) {
    if (state.phase === 'grilling') return;
    reopen();
    for (let i = state.items.length - 1; i >= 0; i--) {
      if (state.items[i].id === id) { state.items.splice(i, 1); break; }
    }
    relayout(false);
    pulseDelta(-ING[id].price);
    say(`${ING[id].name} rimosso. Totale ${eur.format(totals().price)}`);
    update();
  }

  function setBun(id) {
    if (state.phase === 'grilling' || state.bun === id) return;
    reopen();
    const d = ING[id].price - ING[state.bun].price;
    state.bun = id;
    setArt(bunB, 'bun-' + id); setArt(bunT, 'top-' + id);
    bunB.vsq += 3; bunT.vy += 300; bunT.vsq += 3;
    relayout(false);
    if (d) pulseDelta(d);
    say(`Pane ${ING[id].name}`);
    update();
  }

  function loadPreset(key) {
    if (state.phase === 'grilling') return;
    const p = PRESETS[key];
    reopen();
    state.items = [];
    relayout(false);
    if (state.bun !== p.bun) { state.bun = p.bun; setArt(bunB, 'bun-' + p.bun); setArt(bunT, 'top-' + p.bun); }
    update();
    p.items.forEach((id, i) => setTimeout(() => { add(id, true); if (i === p.items.length - 1) say(`${p.name} caricato. Personalizzalo come vuoi.`); }, reduced ? 0 : 240 + i * 190));
    document.querySelectorAll('.preset').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.preset === key)));
  }

  function reset() {
    if (state.phase === 'grilling') return;
    reopen();
    state.items = [];
    relayout(false);
    update();
    document.querySelectorAll('.preset').forEach(b => b.setAttribute('aria-pressed', 'false'));
    say('Ripartiamo da zero');
  }

  async function grill() {
    if (state.phase !== 'build') return;
    if (!proteins()) { shake(null); say('Aggiungi almeno una carne'); state.cat = 'carne'; renderTabs(); renderChips(); return; }
    state.phase = 'grilling';
    document.body.classList.add('is-grilling');
    update();
    bunT.target = totalH;
    if (!reduced) { bunT.fall = true; bunT.vy = 120; } else bunT.y = totalH;
    kick();
    status.textContent = 'Si chiude. Sulla piastra, a fuoco vivo.';
    zoomEl.querySelectorAll('.melt').forEach(m => m.classList.add('hot'));
    if (!reduced) runSmoke(2600);
    await wait(reduced ? 200 : 2600);
    flag.classList.add('in');
    state.phase = 'done';
    document.body.classList.remove('is-grilling');
    document.body.classList.add('is-done');
    status.textContent = 'Pronto. Il tuo Giggiooo è servito.';
    update();
    say(`Aggiunto all'ordine. Totale ${eur.format(totals().price)}`);
    setTimeout(() => done.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }), 350);
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------------- UI ---------------- */
  function renderTabs() {
    tabs.innerHTML = CATS.map(c => `<button type="button" role="tab" class="tab" data-cat="${c.id}" aria-selected="${c.id === state.cat}" aria-controls="chips">${c.label}<span class="tab-count" data-tabcount="${c.id}"></span></button>`).join('');
  }

  const iconCache = {};
  function renderChips() {
    const ids = Object.keys(ING).filter(id => ING[id].cat === state.cat);
    grid.innerHTML = ids.map(id => {
      const ing = ING[id];
      const key = ing.cat === 'pane' ? id : id;
      if (!iconCache[key]) iconCache[key] = A.icon(key, 'ic_' + key + '_');
      const priceTxt = ing.price ? '+' + eur.format(ing.price) : 'incluso';
      return `<div class="chip" data-id="${id}">
        <button type="button" class="chip-main" data-add="${id}" aria-label="${ing.cat === 'pane' ? 'Scegli' : 'Aggiungi'} ${ing.name}, ${priceTxt}">
          <span class="chip-icon">${iconCache[key]}</span>
          <span class="chip-name">${ing.name}</span>
          <span class="chip-price">${priceTxt}</span>
        </button>
        <span class="chip-badge" aria-hidden="true"></span>
        ${ing.cat === 'pane' ? '' : `<button type="button" class="chip-minus" data-remove="${id}" aria-label="Rimuovi ${ing.name}">−</button>`}
      </div>`;
    }).join('');
    syncChips();
  }

  function syncChips() {
    grid.querySelectorAll('.chip').forEach(c => {
      const id = c.dataset.id, ing = ING[id];
      const n = ing.cat === 'pane' ? (state.bun === id ? 1 : 0) : count(id);
      c.classList.toggle('active', n > 0);
      c.querySelector('.chip-badge').textContent = ing.cat === 'pane' ? (n ? '✓' : '') : (n > 1 ? '×' + n : n ? '✓' : '');
      if (ing.cat === 'pane') c.querySelector('.chip-main').setAttribute('aria-pressed', String(n > 0));
    });
    CATS.forEach(cat => {
      const el = tabs.querySelector(`[data-tabcount="${cat.id}"]`);
      if (!el) return;
      const n = cat.id === 'pane' ? 0 : state.items.filter(i => ING[i.id].cat === cat.id).length;
      el.textContent = n ? n : '';
    });
  }

  function update() {
    const t = totals();
    statPrice.textContent = eur.format(t.price);
    statKcal.textContent = t.kcal + ' kcal';
    statLayers.textContent = t.layers + ' strati';
    allergens.innerHTML = t.all.length ? t.all.map(a => `<li>${a}</li>`).join('') : '<li class="none">nessuno</li>';
    ctaPrice.textContent = eur.format(t.price);
    if (state.phase === 'build') ctaLabel.textContent = proteins() ? 'Griglia e chiudi' : 'Scegli una carne';
    if (state.phase === 'grilling') ctaLabel.textContent = 'Sulla piastra…';
    if (state.phase === 'done') ctaLabel.textContent = '✓ Aggiunto al tuo ordine';
    cta.classList.toggle('is-disabled', state.phase === 'build' && !proteins());
    syncChips();
    if (state.phase === 'build') status.textContent = state.items.length ? 'Tocca un ingrediente per aggiungerlo, − per toglierlo.' : 'Parti da un classico o costruiscilo da zero.';
  }

  let deltaT;
  function pulseDelta(v) {
    if (!v) return;
    delta.textContent = (v > 0 ? '+' : '−') + eur.format(Math.abs(v));
    delta.classList.remove('show'); void delta.offsetWidth; delta.classList.add('show');
    clearTimeout(deltaT); deltaT = setTimeout(() => delta.classList.remove('show'), 1100);
  }

  function shake(id) {
    const el = id ? grid.querySelector(`.chip[data-id="${id}"]`) : cta;
    if (!el) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }

  function say(msg) { live.textContent = ''; setTimeout(() => (live.textContent = msg), 30); }

  /* ---------------- fumo ---------------- */
  function runSmoke(ms) {
    const ctx = smoke.getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = smoke.clientWidth, h = smoke.clientHeight;
    smoke.width = w * dpr; smoke.height = h * dpr; ctx.scale(dpr, dpr);
    const parts = [];
    const start = performance.now();
    const cx = w / 2, cy = h * .55, k = Math.max(.45, Math.min(1, w / 900)), rate = Math.min(1, w / 700);
    function frame(now) {
      const el = now - start;
      if (el < ms * .75 && Math.random() < rate) parts.push({ x: cx + (Math.random() - .5) * w * .3, y: cy + Math.random() * 20, r: (12 + Math.random() * 18) * k, vx: (Math.random() - .5) * 14 * k, vy: -(30 + Math.random() * 40) * k, life: 0, max: 1.6 + Math.random() * 1.4 });
      ctx.clearRect(0, 0, w, h);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += 1 / 60; p.x += p.vx / 60 + Math.sin(p.life * 3 + i) * .3; p.y += p.vy / 60; p.r += .4 * k;
        const a = Math.sin(Math.PI * Math.min(1, p.life / p.max)) * .11;
        if (p.life > p.max) { parts.splice(i, 1); continue; }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(244,232,213,${a})`); g.addColorStop(1, 'rgba(244,232,213,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      if (el < ms + 2600 || parts.length) requestAnimationFrame(frame); else ctx.clearRect(0, 0, w, h);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- fit stage ---------------- */
  function fit() {
    const r = stage.getBoundingClientRect();
    const s = Math.min(r.width * .96 / STACK_W, r.height * .97 / STACK_H);
    fitEl.style.setProperty('--fit', s.toFixed(4));
  }

  /* ---------------- share card ---------------- */
  async function shareCard() {
    const btn = $('.btn-card'); btn.disabled = true;
    try {
      await document.fonts.load('600 84px "Playfair Display"');
      await document.fonts.load('700 26px "DM Sans"');
      const order = stackOrder().map(o => layers.get(o.uid)).filter(Boolean);
      let g = '';
      order.forEach(L => { g += `<g transform="translate(0 ${-L.target})">${L.art.svg}</g>`; });
      g += `<g transform="translate(0 ${-totalH})">${bunT.art.svg}</g>`;
      const top = totalH + bunT.art.top + 10, bot = 112;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-230 ${-top} 460 ${top + bot}" width="${460 * 2}" height="${(top + bot) * 2}"><ellipse cx="0" cy="44" rx="226" ry="54" fill="#efe6d6"/><ellipse cx="0" cy="44" rx="226" ry="54" fill="none" stroke="#d5a95e" stroke-opacity=".6" stroke-width="2"/>${g}</svg>`;
      const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
      const logo = await loadImg('../assets/giggiooo-logo-v2.png');
      const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d');
      const bg = x.createRadialGradient(W / 2, H * .5, 40, W / 2, H * .5, H * .75);
      bg.addColorStop(0, '#4a2214'); bg.addColorStop(.55, '#24100a'); bg.addColorStop(1, '#140805');
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(213,169,94,.35)'; x.lineWidth = 2; x.strokeRect(36, 36, W - 72, H - 72);
      x.drawImage(logo, W / 2 - 110, 70, 220, 156);
      const maxW = 860, maxH = 640, sc = Math.min(maxW / img.width, maxH / img.height);
      const iw = img.width * sc, ih = img.height * sc;
      x.drawImage(img, (W - iw) / 2, 260 + (maxH - ih), iw, ih);
      const name = (state.name || 'Il mio Giggiooo').slice(0, 28);
      x.textAlign = 'center'; x.fillStyle = '#f4e8d5';
      x.font = '600 84px "Playfair Display", Georgia, serif';
      x.fillText(name, W / 2, 1010);
      x.fillStyle = '#d5a95e'; x.font = '700 22px "DM Sans", Arial, sans-serif';
      const list = state.items.map(i => ING[i.id].name);
      const uniq = []; list.forEach(n => { const u = uniq.find(q => q.n === n); u ? u.c++ : uniq.push({ n, c: 1 }); });
      const line = [ING[state.bun].name, ...uniq.map(u => (u.c > 1 ? u.c + '× ' : '') + u.n)].join('  ·  ').toUpperCase();
      wrap(x, line, W / 2, 1070, 900, 34);
      x.fillStyle = '#f4d398'; x.font = '700 24px "DM Sans", Arial, sans-serif';
      x.fillText(`${eur.format(totals().price)}   ·   ${totals().kcal} KCAL`, W / 2, 1210);
      x.fillStyle = '#af9581'; x.font = '700 18px "DM Sans", Arial, sans-serif';
      x.fillText('CREATO SU GIGGIOOO BURGER  ✳  MORE THAN A BURGER', W / 2, 1270);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const file = new File([blob], 'giggiooo-' + slug(name) + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
        try { await navigator.share({ files: [file], title: name, text: 'Il mio Giggiooo Burger' }); return; } catch (_) {}
      }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } finally { btn.disabled = false; }
  }
  function wrap(x, text, cx, y, maxW, lh) {
    const words = text.split(' '); let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > maxW && line) { x.fillText(line, cx, y); y += lh; line = w; } else line = t;
    }
    if (line) x.fillText(line, cx, y);
  }
  const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'burger';
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  /* ---------------- eventi ---------------- */
  tabs.addEventListener('click', e => {
    const b = e.target.closest('.tab'); if (!b) return;
    state.cat = b.dataset.cat;
    tabs.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t === b)));
    renderChips();
  });
  tabs.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const all = [...tabs.querySelectorAll('.tab')], i = all.findIndex(t => t.dataset.cat === state.cat);
    const n = all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
    n.click(); n.focus();
  });
  grid.addEventListener('click', e => {
    const a = e.target.closest('[data-add]'), r = e.target.closest('[data-remove]');
    if (r) return removeOne(r.dataset.remove);
    if (a) {
      const id = a.dataset.add, ing = ING[id];
      if (ing.cat !== 'pane' && ing.max === 1 && count(id)) return removeOne(id);
      add(id);
    }
  });
  document.querySelectorAll('.preset').forEach(b => b.addEventListener('click', () => loadPreset(b.dataset.preset)));
  $('.btn-reset').addEventListener('click', reset);
  cta.addEventListener('click', grill);
  $('.btn-card').addEventListener('click', shareCard);
  $('.btn-edit').addEventListener('click', () => { reopen(); relayout(false); update(); });
  nameInput.addEventListener('input', () => { state.name = nameInput.value.trim(); });
  addEventListener('resize', fit, { passive: true });
  new ResizeObserver(fit).observe(stage);

  /* ---------------- init ---------------- */
  bunB = makeLayer('bunB', 'bun-brioche', 3);
  bunT = makeLayer('bunT', 'top-brioche', 5);
  bunB.y = 0; bunT.y = GAP;
  renderTabs(); renderChips(); fit(); relayout(false); update();
  const q = new URLSearchParams(location.search).get('burger');
  setTimeout(() => loadPreset(PRESETS[q] ? q : 'originale'), reduced ? 0 : 450);
})();

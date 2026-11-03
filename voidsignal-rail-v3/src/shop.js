import {SHOP,SIZES,TRIBE,products as P} from './products.js';
const N=P.length;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const root=document.getElementById('vsr');
const $=(s,r=root)=>r.querySelector(s);
const sheet=$('.vsr-sheet'),scrim=$('.vsr-scrim'),cartEl=$('.vsr-cart'),bagBtn=$('.vsr-bag'),live=$('.vsr-sr');
const S={open:null};
let onClose=null;
const deepLink=(p,sizeId)=>`${p.url}?sellable=${p.sellable}&appearance=${p.appearance}&size=${sizeId}`;
const pic=(p,view)=>`<span class="vsr-pic"><img src="${view==='back'?p.imageBack:p.src}" alt="" draggable="false" decoding="async"></span>`;
/* =====================================================================
   SHOP SYNC — the cart lives in a real Spreadshop basket
   ===================================================================== */
const sizeById = id => SIZES.find(z => z.id === id);
const ALL = P.flatMap(p => p.variants.map(v => ({ ...p, ...v })));
const productBy = sellable => ALL.find(p => p.sellable === sellable);
const cur = () => ALL.find(x => x.name === P[sh.i].name && x.k === sh.k);
async function api(method, path, body){
  const r = await fetch(`${SHOP.api}${path}${path.includes('?') ? '&' : '?'}mediaType=json&locale=${SHOP.locale}`, {
    method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok){ const e = new Error('shop ' + r.status); e.status = r.status; throw e; }
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
const itemBody = (p, sizeId, qty) => ({ shop:{ id:SHOP.id }, quantity:qty,
  element:{ id:p.sellable, href:`/api/v1/shops/${SHOP.id}/sellables/${p.sellable}`, type:'sprd:sellable',
    properties:[{ key:'size', value:String(sizeId) }, { key:'appearance', value:String(p.appearance) }], shop:{ id:SHOP.id } }, links:[] });

let cart = { basketId: null, lines: [] };            // lines: { pid, sizeId, qty, itemId }
let pending = 0, syncError = false, chain = Promise.resolve();
try { const s = JSON.parse(localStorage.getItem('vsr-basket-v2') || 'null'); if (s && s.basketId) cart = s; } catch (_) {}
const save = () => { try { localStorage.setItem('vsr-basket-v2', JSON.stringify(cart)); } catch (_) {} };
const count = () => cart.lines.reduce((a, l) => a + l.qty, 0);
const emit = (name, detail) => window.dispatchEvent(new CustomEvent('vsr:' + name, { detail }));
const checkoutUrl = () => cart.basketId ? `${SHOP.checkout}?basketId=${cart.basketId}&shopId=${SHOP.id}` : null;
const resetCart = () => { cart = { basketId: null, lines: [] }; save(); badge(); };

function enqueue(fn){
  pending++; syncError = false; paintSync();
  const run = chain.then(fn).then(r => { pending--; save(); badge(); paintSync(); return r; },
    e => { pending--; syncError = true; paintSync(); throw e; });
  chain = run.catch(() => {});
  return run;
}
async function ensureBasket(){
  if (cart.basketId) return;
  const b = await api('POST', '/baskets', { shop: { id: SHOP.id } });
  cart.basketId = b.id; save();
}
async function withBasket(fn){
  await ensureBasket();
  try { return await fn(); }
  catch (e){
    if (e.status === 404 || e.status === 410 || e.status === 403){          // basket expired or already ordered
      const keep = cart.lines.map(l => ({ ...l, itemId: null }));
      cart = { basketId: null, lines: keep }; await ensureBasket();
      for (const l of cart.lines){ const r = await api('POST', `/baskets/${cart.basketId}/items`, itemBody(productBy(l.pid), l.sizeId, l.qty)); l.itemId = r.id; }
      return fn();
    }
    throw e;
  }
}
function addToCart(p, sizeId){
  return enqueue(() => withBasket(async () => {
    let l = cart.lines.find(x => x.pid === p.sellable && x.sizeId === sizeId);
    if (l && l.itemId){ await api('PUT', `/baskets/${cart.basketId}/items/${l.itemId}`, itemBody(p, sizeId, l.qty + 1)); l.qty++; }
    else {
      const r = await api('POST', `/baskets/${cart.basketId}/items`, itemBody(p, sizeId, 1));
      l ? (l.itemId = r.id, l.qty++) : cart.lines.push({ pid: p.sellable, sizeId, qty: 1, itemId: r.id });
    }
    emit('add', { product: p.name, size: sizeById(sizeId).l, basketId: cart.basketId });
  }));
}
function setQty(k, qty){
  const l = cart.lines[k]; if (!l) return;
  const p = productBy(l.pid), old = l.qty;
  if (qty < 1) cart.lines.splice(k, 1); else l.qty = qty;
  save(); badge(); renderCart();
  enqueue(() => withBasket(async () => {
    if (!l.itemId) return;
    if (qty < 1) await api('DELETE', `/baskets/${cart.basketId}/items/${l.itemId}`);
    else await api('PUT', `/baskets/${cart.basketId}/items/${l.itemId}`, itemBody(p, l.sizeId, qty));
    emit('cart-change', { product: p.name, size: sizeById(l.sizeId).l, quantity: qty });
  })).catch(() => { if (qty >= 1) l.qty = old; });
}
async function reconcile(){
  if (!cart.basketId) return;
  try {
    const b = await api('GET', `/baskets/${cart.basketId}`);
    if (!b || b.readOnly){ resetCart(); return; }
    const lines = [];
    (b.basketItems || []).forEach(it => {
      const pr = k => (it.element.properties.find(x => x.key === k) || {}).value;
      const p = productBy(pr('sellable') || it.element.id); if (!p) return;
      lines.push({ pid: p.sellable, sizeId: +pr('size'), qty: it.quantity, itemId: it.id });
    });
    cart.lines = lines; save(); badge();
  } catch (e){ if (e.status === 404 || e.status === 410) resetCart(); }
}

/* =====================================================================
   PRODUCT SHEET
   ===================================================================== */
const ICON_X = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 2l12 12M14 2L2 14"/></svg>';
let sh = null, ctaTimer;

function panelHTML(i){
  const p = cur();
  const types = P[i].variants.map(v => `<button class="vsr-type" type="button" data-act="type" data-k="${v.k}" aria-pressed="${v.k === sh.k}">${v.label}</button>`).join('');
  return `<button class="vsr-close" type="button" data-act="close">Close ${ICON_X}</button>
    <div class="vsr-fig" data-fig>
      <span class="vsr-fv${sh.view === 'front' ? ' is-on' : ''}" data-v="front">${pic(p, 'front')}</span>
      <span class="vsr-fv${sh.view === 'back' ? ' is-on' : ''}" data-v="back">${pic(p, 'back')}</span>
    </div>
    <p class="vsr-count">${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}</p>
    <h2 class="vsr-name">${p.name}</h2>
    <p class="vsr-meta" style="--c:${TRIBE[p.tribe].c}">${TRIBE[p.tribe].name} · ${p.color}</p>
    <div class="vsr-types" role="group" aria-label="Style">${types}</div>
    <div class="vsr-tabs" role="tablist">
      <button class="vsr-tab" role="tab" type="button" data-act="view" data-v="front" aria-selected="${sh.view === 'front'}">Front</button>
      <button class="vsr-tab" role="tab" type="button" data-act="view" data-v="back" aria-selected="${sh.view === 'back'}">Back</button>
    </div>
    <p class="vsr-lab">Size</p>
    <div class="vsr-sizes" role="group" aria-label="Size">
      ${p.sizes.map(z => `<button class="vsr-size" type="button" data-act="size" data-s="${z.id}" aria-pressed="${z.id === sh.sizeId}">${z.l}</button>`).join('')}
    </div>
    <p class="vsr-fit">${p.fit}</p>
    <button class="vsr-cta" type="button" data-act="add" data-state="idle"><span class="spin"></span><span class="t">Add to cart</span></button>
    <button class="vsr-viewcart" type="button" data-act="viewcart" tabindex="-1"><span>View cart &rarr;</span></button>`;
}
function openSheet(i, k0){
  sh = { i, sizeId: 3, view: 'front', k: P[i].variants.some(v => v.k === k0) ? k0 : 'tee' };
  S.open = i;
  sheet.innerHTML = `<div class="vsr-panel">${panelHTML(i)}</div>`;
  lock(true);
  root.classList.add('is-covered');
  requestAnimationFrame(() => { sheet.classList.add('is-open'); $('.vsr-close', sheet).focus({ preventScroll: true }); });
}
function closeSheet(){
  if (S.open === null) return;
  const i = S.open; S.open = null; sh = null;
  clearTimeout(ctaTimer);
  sheet.classList.remove('is-open');
  if (!cartOpen){ root.classList.remove('is-covered'); lock(false); }
  onClose && onClose();
}
sheet.addEventListener('pointermove', e => {          // gentle parallax on the hero piece
  const f = e.target.closest('[data-fig]'); if (!f || reduce) return;
  const r = f.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  sheet.querySelectorAll('.vsr-fv .vsr-pic').forEach(el => {
    el.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg'); el.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
    el.style.setProperty('--sh', (50 + x * 70).toFixed(1) + '%');
  });
});
sheet.addEventListener('click', e => {
  if (e.target === sheet){ closeSheet(); return; }
  const b = e.target.closest('[data-act]'); if (!b || !sh) return;
  const act = b.dataset.act, p = cur();
  if (act === 'close') closeSheet();
  if (act === 'type'){
    if (b.dataset.k === sh.k) return;
    sh.k = b.dataset.k; clearTimeout(ctaTimer);
    if (!cur().sizes.some(z => z.id === sh.sizeId)) sh.sizeId = 3;
    $('.vsr-panel', sheet).innerHTML = panelHTML(sh.i);
    const nb = sheet.querySelector(`.vsr-type[data-k="${sh.k}"]`); nb && nb.focus({ preventScroll: true });
    return;
  }
  if (act === 'view'){
    sh.view = b.dataset.v;
    sheet.querySelectorAll('.vsr-tab').forEach(t => t.setAttribute('aria-selected', String(t === b)));
    sheet.querySelectorAll('.vsr-fv').forEach(f => f.classList.toggle('is-on', f.dataset.v === sh.view));
  }
  if (act === 'size'){
    sh.sizeId = +b.dataset.s;
    sheet.querySelectorAll('.vsr-size').forEach(z => z.setAttribute('aria-pressed', String(z === b)));
    setCta('idle');
  }
  if (act === 'add'){
    if (b.dataset.state === 'error'){ window.open(deepLink(p, sh.sizeId), '_blank', 'noopener'); return; }
    setCta('loading');
    const started = performance.now(), sizeId = sh.sizeId, idx = sh.i;
    addToCart(p, sizeId).then(
      () => setTimeout(() => { if (sh && sh.i === idx && sh.sizeId === sizeId) setCta('done'); }, Math.max(0, 600 - (performance.now() - started))),
      () => { if (sh && sh.i === idx) setCta('error'); });
  }
  if (act === 'viewcart'){ closeSheet(); openCart(); }
});
function setCta(state){
  clearTimeout(ctaTimer);
  const c = $('.vsr-cta', sheet), v = $('.vsr-viewcart', sheet);
  if (!c) return;
  c.dataset.state = state;
  $('.t', c).textContent = state === 'done' ? 'Added to cart' : state === 'error' ? 'Open in the shop' : 'Add to cart';
  v.classList.toggle('is-on', state === 'done');
  v.tabIndex = state === 'done' ? 0 : -1;
}

/* =====================================================================
   CART DRAWER
   ===================================================================== */
let cartOpen = false;
function badge(){
  const n = count();
  bagBtn.classList.toggle('has', n > 0);
  bagBtn.lastElementChild.textContent = n;
  bagBtn.setAttribute('aria-label', `Open cart, ${n} item${n === 1 ? '' : 's'}`);
}
function paintSync(){
  const el = $('.vsr-sync', cartEl); if (!el) return;
  if (pending) el.innerHTML = '<i></i>Syncing with the shop';
  else if (syncError) el.innerHTML = 'Couldn’t reach the shop. <button type="button" data-c="retry">Try again</button>';
  else el.textContent = '';
  const out = $('.vsr-out', cartEl); if (out) out.disabled = !count() || !!pending;
}
function renderCart(){
  const n = count();
  const lines = cart.lines.map((l, k) => {
    const p = productBy(l.pid), z = sizeById(l.sizeId);
    return `<div class="vsr-line" data-k="${k}">
      <div class="vsr-thumb"><img src="${p.src}" alt="" draggable="false"></div>
      <div class="vsr-li"><b>${p.name}</b><span>${TRIBE[p.tribe].name}</span><span>Size ${z ? z.l : '—'} · ${p.color}</span></div>
      <div class="vsr-step" style="grid-column:2">
        <div class="vsr-qty"><button type="button" data-c="dec" aria-label="Decrease quantity">−</button><output>${l.qty}</output><button type="button" data-c="inc" aria-label="Increase quantity">+</button></div>
        <button class="vsr-trash" type="button" data-c="del" aria-label="Remove ${p.name}">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.6 9h6.8L12 4M6.5 6.5v4M9.5 6.5v4"/></svg>
        </button>
      </div></div>`;
  }).join('');
  cartEl.innerHTML = `
    <div class="vsr-cart-h"><h2>Cart <b>${n}</b></h2><button class="vsr-cx" type="button" data-c="close" aria-label="Close cart">${ICON_X}</button></div>
    <div class="vsr-lines">${lines || `<div class="vsr-empty">Nothing here yet.<button type="button" data-c="close">Keep browsing</button></div>`}</div>
    <div class="vsr-sum">
      <p class="vsr-sync" aria-live="polite"></p>
      <p class="vsr-note">Your pieces are already waiting in the shop. Shipping and taxes are calculated there.</p>
      <button class="vsr-out" type="button" data-c="out" ${n ? '' : 'disabled'}>Check out</button>
    </div>`;
  paintSync();
}
function openCart(){
  renderCart();
  cartOpen = true;
  lock(true); root.classList.add('is-covered');
  scrim.classList.add('is-open'); cartEl.classList.add('is-open');
  requestAnimationFrame(() => $('.vsr-cx', cartEl)?.focus({ preventScroll: true }));
  reconcile().then(() => { if (cartOpen) renderCart(); });
}
function closeCart(){
  if (!cartOpen) return;
  cartOpen = false;
  scrim.classList.remove('is-open'); cartEl.classList.remove('is-open');
  if (S.open === null){ root.classList.remove('is-covered'); lock(false); }
  bagBtn.focus({ preventScroll: true });
}
cartEl.addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b) return;
  const c = b.dataset.c, line = b.closest('.vsr-line'), k = line ? +line.dataset.k : -1, l = cart.lines[k];
  if (c === 'close') closeCart();
  if (c === 'inc' && l) setQty(k, l.qty + 1);
  if (c === 'dec' && l) setQty(k, l.qty - 1);
  if (c === 'del' && l) setQty(k, 0);
  if (c === 'retry'){ reconcile().then(renderCart); }
  if (c === 'out'){
    const url = checkoutUrl(); if (!url) return;
    emit('checkout', { basketId: cart.basketId, url });
    window.open(url, '_blank', 'noopener');
  }
});
scrim.addEventListener('click', closeCart);
bagBtn.addEventListener('click', openCart);

/* ---------- shared ---------- */
function lock(on){ document.documentElement.style.overflow = on ? 'hidden' : ''; }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){ if (cartOpen) closeCart(); else if (S.open !== null) closeSheet(); }
  if (e.key === 'Tab'){
    const host = cartOpen ? cartEl : (S.open !== null ? sheet : null); if (!host) return;
    const f = [...host.querySelectorAll('button:not([disabled]):not([tabindex="-1"]),input')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a){ z.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === z){ a.focus(); e.preventDefault(); }
  }
});


export function initShop(opts={}){onClose=opts.onClose||null;badge();reconcile();}
export {openSheet};

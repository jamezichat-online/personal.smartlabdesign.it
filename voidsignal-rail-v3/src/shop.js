import {TRIBE,products as P} from './products.js';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const root=document.getElementById('vsr');
const $=(s,r=root)=>r.querySelector(s);
const sheet=$('.vsr-sheet');
const S={open:null};
let onClose=null,sh=null;
const ICON_X='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 2l12 12M14 2L2 14"/></svg>';
const ICON_OUT='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11l6-6M6 5h5v5"/></svg>';
const cur=()=>P[sh.i].variants.find(v=>v.k===sh.k);
const VIEWS=[['front','Front'],['back','Back'],['detail','Detail']];

/* The product page in the shop (size, colour and checkout happen there). */
function panelHTML(i){
  const p=P[i],v=cur(),t=TRIBE[p.tribe];
  const types=p.variants.map(x=>`<button class="vsr-type" type="button" data-act="type" data-k="${x.k}" aria-pressed="${x.k===sh.k}">${x.label}</button>`).join('');
  const tabs=VIEWS.map(([k,l])=>`<button class="vsr-tab" role="tab" type="button" data-act="view" data-v="${k}" aria-selected="${sh.view===k}">${l}</button>`).join('');
  const fv=(k,src)=>`<span class="vsr-fv${sh.view===k?' is-on':''}" data-v="${k}"><span class="vsr-pic"><img src="${src}" alt="${k==='back'?'Back of ':k==='detail'?'Print detail of ':'Front of '}${p.name}" draggable="false" decoding="async"></span></span>`;
  return `<button class="vsr-close" type="button" data-act="close" aria-label="Close">${ICON_X}</button>
    <div class="vsr-fig" data-fig>${fv('front',v.src)}${fv('back',v.imageBack)}${fv('detail',v.src)}</div>
    <div class="vsr-tabs" role="tablist" aria-label="View">${tabs}</div>
    <div class="vsr-head">
      <h2 class="vsr-name">${p.name}</h2>
      <p class="vsr-meta" style="--c:${t.c}"><b>${t.name}</b><span>${v.color}</span></p>
    </div>
    <div class="vsr-types" role="group" aria-label="Style">${types}</div>
    <a class="vsr-cta" href="${v.shop}" target="_blank" rel="noopener" data-act="shop"><span>Shop it</span>${ICON_OUT}</a>`;
}
/* Detail view: zoom on the print, centred, sized so the artwork fills the frame. */
function fitDetail(){
  if(!sh)return;
  const fig=$('[data-fig]',sheet),d=$('.vsr-fv[data-v="detail"] .vsr-pic',sheet);if(!fig||!d)return;
  const z=cur().zoom||[.5,.38,.26,.3],W=fig.clientWidth,H=fig.clientHeight,pw=d.offsetWidth;if(!pw)return;
  const k=Math.max(1.2,Math.min(3.4,.9*W/(z[2]*pw),.84*H/(z[3]*pw)));
  d.style.setProperty('--dk',k.toFixed(3));
  d.style.setProperty('--dx',(-(z[0]-.5)*pw*k).toFixed(1)+'px');d.style.setProperty('--dy',(-(z[1]-.5)*pw*k).toFixed(1)+'px');
}
addEventListener('resize',fitDetail);
function paint(){
  const p=P[sh.i];
  $('.vsr-panel',sheet).style.setProperty('--tc',TRIBE[p.tribe].rgb);
  $('.vsr-panel',sheet).innerHTML=panelHTML(sh.i);
  fitDetail();$$('img').forEach(im=>im.addEventListener('load',fitDetail,{once:true}));
}
const $$=s=>sheet.querySelectorAll(s);
function openSheet(i,k0){
  sh={i,view:'front',k:P[i].variants.some(v=>v.k===k0)?k0:'tee'};
  S.open=i;
  sheet.innerHTML='<div class="vsr-panel" tabindex="-1"></div>';
  paint();
  lock(true);root.classList.add('is-covered');
  requestAnimationFrame(()=>{sheet.classList.add('is-open');fitDetail();$('.vsr-panel',sheet).focus({preventScroll:true})});
}
function closeSheet(){
  if(S.open===null)return;
  S.open=null;sh=null;
  sheet.classList.remove('is-open');
  root.classList.remove('is-covered');lock(false);
  onClose&&onClose();
}
sheet.addEventListener('pointermove',e=>{          // gentle parallax on the hero piece (front/back only)
  const f=e.target.closest('[data-fig]');if(!f||reduce||!sh||sh.view==='detail')return;
  const r=f.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
  $$('.vsr-fv:not([data-v="detail"]) .vsr-pic').forEach(el=>{el.style.setProperty('--ry',(x*10).toFixed(2)+'deg');el.style.setProperty('--rx',(-y*4).toFixed(2)+'deg')});
});
sheet.addEventListener('click',e=>{
  if(e.target===sheet){closeSheet();return}
  const b=e.target.closest('[data-act]');if(!b||!sh)return;
  const act=b.dataset.act;
  if(act==='close')closeSheet();
  if(act==='type'){
    if(b.dataset.k===sh.k)return;
    sh.k=b.dataset.k;paint();
    const nb=sheet.querySelector(`.vsr-type[data-k="${sh.k}"]`);nb&&nb.focus({preventScroll:true});
  }
  if(act==='view'){
    sh.view=b.dataset.v;
    $$('.vsr-tab').forEach(t=>t.setAttribute('aria-selected',String(t===b)));
    $$('.vsr-fv').forEach(f=>f.classList.toggle('is-on',f.dataset.v===sh.view));
    if(sh.view==='detail')fitDetail();
  }
});
function lock(on){document.documentElement.style.overflow=on?'hidden':''}
document.addEventListener('keydown',e=>{
  if(S.open===null)return;
  if(e.key==='Escape')closeSheet();
  if(e.key==='Tab'){
    const f=[...sheet.querySelectorAll('button:not([disabled]),a[href]')].filter(x=>x.offsetParent!==null);
    if(!f.length)return;
    const a=f[0],z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){z.focus();e.preventDefault()}
    else if(!e.shiftKey&&document.activeElement===z){a.focus();e.preventDefault()}
  }
});
export function initShop(opts={}){onClose=opts.onClose||null}
export {openSheet};

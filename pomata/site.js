'use strict';
const catalog=window.PomataCatalog;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function goToSection(id){if(detailOpen)closeDetail(false);document.getElementById(id)?.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'})}
function retailForLook(id){return catalog.products.find(p=>p.look===id)}
function renderEditorialProducts(kind='all'){
 const products=catalog.products.filter(p=>kind==='all'||p.gender===kind);
 const grid=document.getElementById('editorialProducts');
 grid.replaceChildren(...products.map(p=>{
  const article=document.createElement('article');article.className=`editorial-product${p.kind==='more'?' retail':''}`;
  const a=document.createElement('a');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',`${p.title}, scopri e acquista nello shop ufficiale`);
  const visual=document.createElement('div');visual.className='product-visual';const img=document.createElement('img');img.src=p.image;img.alt=p.kind==='more'?`T-shirt POMATA ${p.title}, immagine del prodotto nello shop`:`La t-shirt ${p.title} nella campagna POMATA`;img.width=600;img.height=600;img.loading='lazy';img.decoding='async';visual.append(img);
  const title=document.createElement('h3');title.textContent=p.title;const note=document.createElement('p');note.textContent=p.note;const arrow=document.createElement('span');arrow.className='product-link-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';a.append(visual,title,note,arrow);article.append(a);return article;
 }));
 document.querySelectorAll('[data-catalog-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.catalogFilter===kind)));
}
renderEditorialProducts();
document.querySelectorAll('[data-catalog-filter]').forEach(b=>b.addEventListener('click',()=>renderEditorialProducts(b.dataset.catalogFilter)));
const baseRenderDetail=renderDetail;
renderDetail=function(){
 baseRenderDetail();const product=retailForLook(selected);const buy=document.getElementById('addBag');buy.onclick=null;buy.href=product?.url||catalog.shop;buy.innerHTML=product?'Acquista nello shop <span>↗</span>':'Esplora le altre t-shirt <span>↗</span>';
 document.getElementById('detailPrice').textContent=product?'Prezzo e disponibilità nello shop':'Questo design non è nel catalogo attuale.';
 document.querySelector('#detailPanel .demo-note').textContent=product?'Scegli taglia e colore nello shop. Per stampa e vestibilità fa riferimento la scheda prodotto. Gli altri capi sono abbinamenti di styling.':'Questo look resta nella campagna POMATA. La sua grafica non è attualmente collegata a un prodotto in vendita.';
};
document.getElementById('addBag').onclick=null;
document.getElementById('home').onclick=()=>goToSection('site-content');
document.getElementById('runwayNav').onclick=()=>goToSection('passerella');
document.getElementById('collectionNav').onclick=()=>goToSection('collezione');
document.getElementById('worldNav').onclick=()=>goToSection('mondo');
document.getElementById('bagButton').onclick=()=>window.open(catalog.shop,'_blank','noopener,noreferrer');
// A collection tile still opens its look; ensure the runway is in view on a long page.
const baseOpenDetail=openDetail;
openDetail=function(){document.getElementById('passerella').scrollIntoView({behavior:'instant',block:'start'});baseOpenDetail()};
document.getElementById('discover').onclick=()=>openDetail();
document.getElementById('hotspot').onclick=()=>openDetail();
// The favorites dialog shares the product cards, but never advertises old demo prices.
const baseCollection=collection;
collection=function(onlyFavorites=false){baseCollection(onlyFavorites);document.querySelectorAll('#collectionGrid .collection-card p').forEach((p,i)=>{const l=(onlyFavorites?looks.filter(l=>favorites.includes(l.id)):looks)[i];p.textContent=retailForLook(l.id)?'Scopri la t-shirt ↗':'Look della campagna';})};
document.getElementById('favoritesButton').onclick=()=>collection(true);
document.getElementById('privacyButton').onclick=()=>document.getElementById('privacyDialog').showModal();
document.getElementById('clearPreferences').onclick=()=>{favorites=[];persist();render();toast('Preferiti cancellati da questo browser.')};
// Keep the main navigation oriented to the chapter actually being read.
const chapters=[['collezione','collectionNav'],['passerella','runwayNav'],['mondo','worldNav']];
function updateChapter(){let active='';for(const [id,nav] of chapters){const el=document.getElementById(id);if(el.getBoundingClientRect().top<=innerHeight*.4)active=nav;}if(document.getElementById('acquisti').getBoundingClientRect().top<innerHeight*.5)active='';document.querySelectorAll('.header .nav-link').forEach(b=>{b.classList.toggle('active',b.id===active);if(b.id===active)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current')})}
let scrollPending=false;addEventListener('scroll',()=>{if(scrollPending)return;scrollPending=true;requestAnimationFrame(()=>{updateChapter();scrollPending=false})},{passive:true});updateChapter();
// Content remains visible if JS is missing; observe individual parts, never a whole blank chapter.
if('IntersectionObserver' in window&&!reduced.matches){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target)}})},{threshold:.08});document.querySelectorAll('.hero-copy h1,.hero-copy>div,.section-opening h2,.section-opening p,.editorial-product,.brand-copy h2,.brand-copy p,.journal-layout figure,.purchase-section>h2,.purchase-intro,.purchase-questions,.footer-top>p').forEach((el,i)=>{el.classList.add('reveal');el.style.animationDelay=`${Math.min(i%3,2)*70}ms`;observer.observe(el)})}

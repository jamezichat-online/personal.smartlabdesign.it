'use strict';
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
const safeStore = {get(k,f){try{return localStorage.getItem(k) ?? f;}catch{return f;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
const state = {category:'burger',location:safeStore.get('gb-concept-location','studio'),cart:[],club:{first:'Alex',last:'Demo',email:'alex@example.test',phone:'0000000000',birth:'1990-01-01',variant:'Club',consent:false},cardStyle:'brown',feedback:{receipt:'DEMO-001',food:'5',service:'5',clean:'5',overall:'5',comment:'',consent:false},preferences:{comfort:safeStore.get('gb-concept-comfort','no')==='yes'}};
if(!['studio','lab'].includes(state.location))state.location='studio';
const products = window.GB_CATALOG.products;
const drinks = window.GB_CATALOG.drinks;
const merch = window.GB_CATALOG.merch;
const productById = id => products.find(p=>p.id===id);
const productTitle = p => `${esc(p.title[0])} <em>${esc(p.title[1])}</em>`;
const productPrice = p => p.price?`${euro(p.price.amount)}<small>PREZZO DEMO</small>`:'<span class="pending-price">Prezzo da definire</span>';
let dialogCleanup = () => {}, lastFocus = null, toastTimer;
const dialog = $('#dialog');
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200);}
function openDialog(html,wide=false){dialogCleanup();dialogCleanup=()=>{};if(!dialog.open)lastFocus=document.activeElement;$('#dialog-content').innerHTML=html;dialog.classList.toggle('wide',wide);document.body.classList.add('modal-open');if(!dialog.open)dialog.showModal();dialog.scrollTop=0;$('.dialog-close').focus();}
function closeDialog(){dialog.close();}
dialog.addEventListener('close',()=>{dialogCleanup();dialogCleanup=()=>{};document.body.classList.remove('modal-open');$('#dialog-content').innerHTML='';lastFocus?.focus({preventScroll:true});});
$('.dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
function plain(title,body,eyebrow='GIGGIOOO BURGER'){return `<div class="plain-dialog"><span class="eyebrow">${eyebrow}</span><h2 id="dialog-title">${title}</h2>${body}</div>`;}
const demoBanner = '<div class="demo-banner">Demo dimostrativa: nessuna richiesta viene inviata. Usa soltanto dati fittizi.</div>';
function renderCatalog(){
 const c=$('#catalog');
 if(state.category==='burger') c.innerHTML=`<div class="burger-grid">${products.map((p,i)=>`<article class="burger-card"><button class="burger-card-photo" data-product="${p.id}" aria-label="Scopri ${esc(p.name)} e i suoi ingredienti"><img src="${p.media.catalogPhoto}" width="1254" height="1254" loading="lazy" alt="${esc(p.name)}, burger di concept Giggiooo"><span class="image-label">${p.layers.length} LIVELLI DA SCOPRIRE</span></button><div class="burger-card-copy"><span class="eyebrow">SIGNATURE / ${String(i+1).padStart(2,'0')}</span><h3>${productTitle(p)}</h3><p>${esc(p.description)}</p><div class="recipe-tags">${p.tags.map(tag=>`<span>${esc(tag)}</span>`).join('')}</div><div class="price-row"><span>${productPrice(p)}</span><button class="button gold" data-product="${p.id}">Apri il burger</button></div><span class="subtle">Ricetta di concept · ingredienti e allergeni da validare.</span></div></article>`).join('')}</div>`;
 if(state.category==='drinks') c.innerHTML=`<div class="drink-intro"><div><span class="eyebrow">DA BERE / SEI SCELTE</span><h3>Il sorso giusto.</h3></div><p>Dalla cola al tè freddo, dall’aperitivo analcolico alla lager.<br>Scegli cosa accompagna il tuo burger.</p></div><div class="burger-grid drink-grid">${drinks.map(d=>`<article class="burger-card drink-card"><button class="burger-card-photo" data-drink="${d.id}" aria-label="Scopri ${esc(d.name)}"><img src="${d.image}" width="1254" height="1254" loading="lazy" alt="${esc(d.name)}, con ghiaccio e spruzzi nell’ambiente del concept"><span class="image-label">${esc(d.categoryLabel)}</span></button><div class="burger-card-copy"><span class="eyebrow">${esc(d.categoryLabel)}</span><h3>${productTitle(d)}</h3><p>${esc(d.description)}</p><div class="recipe-tags">${d.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="price-row"><span class="pending-price">Prezzo da definire</span><button class="button gold" data-drink="${d.id}">Scopri la bevanda</button></div></div></article>`).join('')}</div>`;
 if(state.category==='sauce') c.innerHTML=`<article class="merch-product"><img src="assets/box.webp" width="1672" height="941" alt="Nella box Giggiooo, due coppette di salsa dorata e scura"><div><span class="eyebrow">SALSE / CONCEPT</span><h3>Il dettaglio<br><em>che completa.</em></h3><p>Due accenti, uno dorato e uno scuro. Le salse accompagnano il racconto visivo della box; ricette e schede dedicate sono ancora da definire.</p><button class="button gold" data-action="sauces">Scopri il concept</button></div></article>`;
 if(state.category==='merch') c.innerHTML=merchCards('menu')+`<button class="text-button merch-cart-link" data-action="cart">Carrello demo <span data-cart-count>(${cartCount()})</span></button><p class="subtle">Prezzi e taglie dimostrativi · preordine simulato, senza pagamento.</p>`;
 const note=$('#menu-note');if(note){const drinkMode=state.category==='drinks';note.innerHTML=state.category==='merch'?'<span>LA FIRMA GIGGIOOO.</span><p>Burger Heritage, Golden Crew e Burger Icons.</p>':drinkMode?'<span>SEI BEVANDE. IL TUO ABBINAMENTO.</span><p>Ceres, Mojito, Fontalba, Coca-Cola, Fuze Tea e Spritz. Apri le schede per formati, caratteristiche e ingredienti.</p>':state.category==='burger'?'<span>TRE BURGER. TRE CARATTERI.</span><p>Neon Bacon, Double Melt e Golden Burger. Apri ogni burger per scoprire i suoi ingredienti nell’ordine dell’esploso.</p>':'<span>IL DETTAGLIO CHE COMPLETA.</span><p>Le salse del concept Giggiooo accompagnano il tuo burger.</p>';}
 $$('.categories button').forEach(b=>{const active=b.dataset.category===state.category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
$('#location').value=state.location;
$('#location').addEventListener('change',e=>{state.location=e.target.value;safeStore.set('gb-concept-location',state.location);toast('Locale demo selezionato');});
renderCatalog();
renderMerch();
const navToggle=$('#nav-toggle');
function closeNav(){ document.body.classList.remove('nav-open');$('#header').classList.remove('menu-open');navToggle.setAttribute('aria-expanded','false');navToggle.setAttribute('aria-label','Apri navigazione'); }
navToggle.addEventListener('click',()=>{const open=$('#header').classList.toggle('menu-open');document.body.classList.toggle('nav-open',open);navToggle.setAttribute('aria-expanded',String(open));navToggle.setAttribute('aria-label',open?'Chiudi navigazione':'Apri navigazione');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNav();});
document.addEventListener('click',e=>{
 const productButton=e.target.closest('[data-product]');if(productButton){openBurger(productButton.dataset.product);return;}
 const drinkButton=e.target.closest('[data-drink]');if(drinkButton){openDrink(drinkButton.dataset.drink);return;}
 const add=e.target.closest('[data-merch-add]');if(add){addMerch(add.dataset.merchAdd,$('#'+add.dataset.sizeInput).value);return;}
 const change=e.target.closest('[data-cart-change]');if(change){const i=Number(change.dataset.cartIndex),item=state.cart[i];if(item){if(change.dataset.cartChange==='remove')state.cart.splice(i,1);else{item.qty=Math.min(5,item.qty+Number(change.dataset.cartChange));if(item.qty<=0)state.cart.splice(i,1);}updateCart();cart();}return;}
 const cat=e.target.closest('[data-category]');if(cat){state.category=cat.dataset.category;renderCatalog();return;}
 if(e.target.closest('nav a'))closeNav();
 const loc=e.target.closest('[data-location]');if(loc){openLocation(loc.dataset.location);return;}
 const a=e.target.closest('[data-action]');if(a){const fn=actions[a.dataset.action];if(fn)fn();}
});
// Original Giggiooo composition: full-screen stage and left-centered chapters.
const hero=$('#hero'),heroVideo=$('#hero-video'),heroSticky=$('.hero-sticky'),motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
const heroScenes=[
 {time:0,label:'01 / BURGER & PATATINE',title:'Il gusto, al completo.',description:'Burger e patatine. Il tuo prossimo morso.'},
 {time:2.2,label:'02 / L’INCARTO',title:'Ogni dettaglio ha carattere.',description:'Il burger si veste di marrone e oro.'},
 {time:4.7,label:'03 / DENTRO LA BOX',title:'Tutto trova il suo posto.',description:'Burger e patatine entrano nella box Giggiooo.'},
 {time:7.8,label:'04 / PRONTA DA PORTARE',title:'Il mondo Giggiooo. Con te.',description:'La box si chiude. Il gusto è pronto da portare.'}
];
let manualReduced=false,heroFrame=0,heroTarget=0,heroAvailable=false,heroLast=-1,heroPhase=-1;
function reduceHero(){return manualReduced||motionQuery.matches;}
function updateHeroCaption(time){
 let phase=0;for(let i=1;i<heroScenes.length;i++)if(time>=heroScenes[i].time)phase=i;
 if(phase!==heroPhase){
  heroPhase=phase;heroSticky.dataset.scene=String(phase);
  $$('.hero-chapter',hero).forEach((chapter,i)=>{const active=i===phase;chapter.classList.toggle('is-active',active);chapter.setAttribute('aria-hidden',String(!active));$$('a,button',chapter).forEach(control=>control.tabIndex=active?0:-1);});
  $('#hero-eyebrow').innerHTML=`GIGGIOOO BURGER <i></i> 0${phase+1} / 04`;
  $('#hero-step').textContent=`0${phase+1} — 04 / ${heroScenes[phase].label.split(' / ')[1]}`;
 }
 const end=Math.max(.001,(heroVideo.duration||10)-1/24);$('#hero-progress').style.width=`${Math.min(100,time/end*100)}%`;
}

function updateHero(){
 const reduced=reduceHero();hero.classList.toggle('reduced',reduced);
 const stickyHeight=heroSticky.offsetHeight||innerHeight;
 hero.style.height=`${reduced?stickyHeight:stickyHeight+innerHeight*(matchMedia('(max-width:700px)').matches?2.3:2.9)}px`;
 const span=Math.max(1,hero.offsetHeight-stickyHeight),rect=hero.getBoundingClientRect();
 const p=Math.max(0,Math.min(1,-rect.top/span));
 $('#header').classList.toggle('after-hero',rect.top<0&&rect.bottom<=stickyHeight+2);
 heroTarget=reduced?0:p*Math.max(0,(heroVideo.duration||10)-1/24);
 if(!heroFrame&&heroAvailable&&!reduced&&!document.hidden&&rect.bottom>0)heroFrame=requestAnimationFrame(seekHero);
 $('#hero-motion').textContent=reduced?'Attiva movimento':'Riduci movimento';$('#hero-motion').setAttribute('aria-pressed',String(reduced));
 heroVideo.hidden=reduced||hero.classList.contains('media-failed');
 if(reduced){heroVideo.pause();updateHeroCaption(0);}else if(!heroAvailable)updateHeroCaption(0);
}
function seekHero(){
 heroFrame=0;if(reduceHero()||document.hidden||!heroAvailable)return;
 const delta=heroTarget-heroVideo.currentTime;
 if(Math.abs(delta)>.018&&!heroVideo.seeking){const next=Math.abs(delta)<.06?heroTarget:heroVideo.currentTime+delta*.32;try{heroVideo.currentTime=next;heroLast=next;}catch{}}
 if(Math.abs(heroTarget-heroVideo.currentTime)>.018&&hero.getBoundingClientRect().bottom>0)heroFrame=requestAnimationFrame(seekHero);
}
heroVideo.addEventListener('loadedmetadata',updateHero);
heroVideo.addEventListener('loadeddata',()=>{heroAvailable=true;updateHero();});
heroVideo.addEventListener('seeked',()=>{updateHeroCaption(heroVideo.currentTime);if(!heroFrame&&!reduceHero()&&Math.abs(heroTarget-heroVideo.currentTime)>.018)heroFrame=requestAnimationFrame(seekHero);});
// Mobile (iOS Safari e molti Android): il browser non decodifica i fotogrammi di un video mai avviato e ignora preload,
// quindi loadeddata non arriva e lo scrub resta fermo sul poster. Un play() muto seguito da pause() sblocca la decodifica.
let heroPrimed=false;
function primeHero(){
 if(heroPrimed||reduceHero())return;heroPrimed=true;heroVideo.muted=true;heroVideo.playsInline=true;
 let pr;try{pr=heroVideo.play();}catch{heroPrimed=false;return;}
 if(pr&&pr.then)pr.then(()=>{heroVideo.pause();if(heroVideo.readyState>=2)heroAvailable=true;updateHero();}).catch(()=>{heroPrimed=false;});
}
heroVideo.addEventListener('canplay',()=>{heroAvailable=true;updateHero();});
['touchstart','pointerdown','keydown'].forEach(ev=>addEventListener(ev,primeHero,{passive:true}));
addEventListener('scroll',primeHero,{passive:true});
primeHero();
heroVideo.addEventListener('error',()=>{heroAvailable=false;heroVideo.hidden=true;hero.classList.add('media-failed');updateHeroCaption(0);});
$('#hero-motion').addEventListener('click',()=>{manualReduced=!reduceHero();if(motionQuery.matches&&!manualReduced)toast('Il movimento resta ridotto secondo le preferenze del dispositivo.');updateHero();});
addEventListener('scroll',updateHero,{passive:true});addEventListener('resize',updateHero);motionQuery.addEventListener('change',updateHero);document.addEventListener('visibilitychange',updateHero);updateHero();
if(typeof ResizeObserver!=='undefined')new ResizeObserver(updateHero).observe(heroSticky);

// Keep both decoded video surfaces: switching sources discarded the final frame.
const burgerMediaCache = new Map();
function prepareBurgerMedia(product, includeClose=false){
 let pair=burgerMediaCache.get(product.id);
 if(!pair){pair={};burgerMediaCache.set(product.id,pair);}
 for(const direction of (includeClose?['open','close']:['open'])){
  if(pair[direction])continue;
  const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
  video.setAttribute('aria-label',`${direction==='open'?'Esplosione':'Ricomposizione'} di ${product.name}`);
  video.src=product.media[direction];video.style.opacity='0';video.load();pair[direction]=video;
 }
 return pair;
}
for(const event of ['pointerover','focusin','touchstart'])document.addEventListener(event,e=>{
 const button=e.target.closest('[data-product]');const product=button&&productById(button.dataset.product);
 if(product)prepareBurgerMedia(product,true);
},{passive:true});
if(typeof IntersectionObserver!=='undefined'){
 const warmer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){
  const product=productById(entry.target.dataset.product);if(product)prepareBurgerMedia(product);warmer.unobserve(entry.target);
 }},{rootMargin:'300px'});
 $$('[data-product].burger-card-photo').forEach(card=>warmer.observe(card));
}
function openBurger(id='golden-double'){
 const product=productById(id);if(!product){toast('Prodotto non disponibile.');return;}
 const media=product.media,layers=product.layers.map(l=>({name:l.name,note:l.note,y:l.yPercent}));
 openDialog(`<div class="product-detail"><div class="detail-scene"><span class="scene-label">${esc(product.name.toUpperCase())} / IN OGNI DETTAGLIO</span><div class="video-wrap"><img id="burger-poster" src="${media.poster}" alt="${esc(product.name)} composto"><div id="burger-video-slots"></div><div class="layer-marker" id="layer-marker" aria-hidden="true"></div></div><div class="video-controls"><button id="burger-explode">Esplodi</button><button id="burger-compose">Ricomponi</button></div></div><div class="detail-info"><span class="eyebrow">SIGNATURE / ${layers.length} LIVELLI</span><h2 id="dialog-title">${productTitle(product)}</h2><span class="detail-price">${productPrice(product)}</span><p>${esc(product.description)}</p><div class="ingredient-heading"><h3>Dentro il burger</h3><span>DALL’ALTO VERSO IL BASSO</span></div><ol class="ingredient-list">${layers.map((l,i)=>`<li><button data-layer="${i}" aria-pressed="false"><span class="num">${String(i+1).padStart(2,'0')}</span><span>${esc(l.name)}</span></button></li>`).join('')}</ol><p class="allergen-note" id="layer-description" aria-live="polite">Seleziona una voce per individuare il livello nella vista esplosa. Denominazioni di concept; ricetta e allergeni da validare.</p><div class="inline-actions"><a class="button gold" href="fattillu-tu/?burger=${esc(product.id)}">Personalizzalo · Fattillu tu</a><button class="text-button" data-action="order">Vai al servizio ordini</button></div><span class="subtle">Demo · comanda e invio simulati.</span></div></div>`,true);
 const poster=$('#burger-poster'),marker=$('#layer-marker'),explode=$('#burger-explode'),compose=$('#burger-compose');
 const pair=prepareBurgerMedia(product,true),slots=$('#burger-video-slots'),events=new AbortController();
 const staticMode=reduceHero();let disposed=false,desired='close',active=null,busy=false,sequence=0,pendingLayer=null,loadTimer;
 for(const video of Object.values(pair)){video.pause();video.style.opacity='0';slots.appendChild(video);}
 function resetMarkers(){marker.classList.remove('visible');$$('[data-layer]',dialog).forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});}
 function controls(){explode.disabled=busy||desired==='open';compose.disabled=busy||desired==='close';}
 function markLayer(i){resetMarkers();const b=$$('[data-layer]',dialog)[i];b.classList.add('active');b.setAttribute('aria-pressed','true');marker.style.top=`${layers[i].y}%`;marker.classList.add('visible');$('#layer-description').textContent=`${String(i+1).padStart(2,'0')} · ${layers[i].name}. ${layers[i].note}. Il riferimento indica la posizione nella vista esplosa.`;}
 function complete(video){if(disposed||video!==pair[desired]||!busy)return;video.pause();clearTimeout(loadTimer);busy=false;controls();if(pendingLayer!==null&&desired==='open'){markLayer(pendingLayer);pendingLayer=null;}else if(pendingLayer!==null)playState('open');}
 function showFallback(next){
  clearTimeout(loadTimer);const image=new Image();image.src=next==='open'?media.explodedPoster:media.poster;
  image.onload=()=>{if(disposed||desired!==next)return;poster.src=image.src;poster.hidden=false;for(const video of Object.values(pair))video.style.opacity='0';busy=false;controls();if(pendingLayer!==null&&next==='open'){markLayer(pendingLayer);pendingLayer=null;}};
  if(image.complete&&image.naturalWidth)image.onload();
 }
 function playState(next){
  if(disposed||busy)return;desired=next;busy=true;controls();resetMarkers();const token=++sequence;clearTimeout(loadTimer);
  if(staticMode){showFallback(next);return;}
  const video=pair[next];video.pause();loadTimer=setTimeout(()=>{if(!disposed&&token===sequence&&busy&&active!==video)showFallback(next);},12000);
  const reveal=()=>{if(disposed||token!==sequence)return;clearTimeout(loadTimer);video.style.opacity='1';if(active&&active!==video){active.pause();active.style.opacity='0';}active=video;poster.hidden=true;};
  const start=()=>{
   if(disposed||token!==sequence)return;
   // Reveal only after a decoded frame is presented, retaining the outgoing frame meanwhile.
   if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(reveal);
   video.play().then(()=>{if(!video.requestVideoFrameCallback)requestAnimationFrame(()=>requestAnimationFrame(reveal));}).catch(()=>{if(!disposed&&token===sequence)showFallback(next);});
  };
  if(video.currentTime>.01){video.addEventListener('seeked',start,{once:true,signal:events.signal});video.currentTime=0;}
  else if(video.readyState>=2)start();
  else if(video.error)showFallback(next);
  else video.addEventListener('loadeddata',start,{once:true,signal:events.signal});
 }
 for(const video of Object.values(pair)){
  video.addEventListener('ended',()=>complete(video),{signal:events.signal});
  video.addEventListener('error',()=>{if(busy&&video===pair[desired])showFallback(desired);},{signal:events.signal});
 }
 explode.addEventListener('click',()=>playState('open'));compose.addEventListener('click',()=>playState('close'));
 $$('[data-layer]',dialog).forEach(b=>b.addEventListener('click',()=>{
  const i=Number(b.dataset.layer);if(busy){pendingLayer=i;return;}
  if(desired==='open')markLayer(i);else{pendingLayer=i;playState('open');}
 }));
 dialogCleanup=()=>{disposed=true;sequence++;clearTimeout(loadTimer);events.abort();for(const video of Object.values(pair))video.pause();};
 controls();playState('open');
}

function openDrink(id){
 const d=drinks.find(item=>item.id===id);if(!d){toast('Bevanda non disponibile.');return;}
 openDialog(`<div class="drink-detail"><div class="drink-detail-image"><img src="${d.image}" width="1254" height="1254" alt="${esc(d.name)}"></div><div class="detail-info drink-detail-info"><span class="eyebrow">${esc(d.categoryLabel)}</span><h2 id="dialog-title">${productTitle(d)}</h2><div class="recipe-tags">${d.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><p>${esc(d.description)}</p><dl class="drink-facts">${d.facts.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><details class="drink-extra" open><summary>Ingredienti</summary><p>${esc(d.ingredients)}</p></details>${d.nutrition.length?`<details class="drink-extra"><summary>Valori nutrizionali · per 100 ml</summary><table class="drink-nutrition"><caption>Valori riportati per 100 ml</caption><tbody>${d.nutrition.map(([label,value])=>`<tr><th scope="row">${esc(label)}</th><td>${esc(value)}</td></tr>`).join('')}</tbody></table></details>`:''}<details class="drink-extra"><summary>Informazioni sul prodotto</summary><p>Le informazioni possono variare con la confezione. Consulta l’etichetta del prodotto.</p><ul class="drink-sources">${d.sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)}</a></li>`).join('')}</ul></details><div class="drink-price"><span class="pending-price">Prezzo da definire</span><button class="button gold" data-action="order">Vai al servizio ordini</button></div></div></div>`,true);
}

function openFilm(){openDialog(`<div class="film-dialog"><h2 id="dialog-title">More than a burger.</h2><video controls playsinline preload="metadata" poster="assets/hero-packaging-poster.webp" src="assets/hero-packaging-film.mp4"></video></div>`,true);const v=$('video',dialog);dialogCleanup=()=>v.pause();}
function openBox(){openDialog(plain('Il gusto, <em>al completo.</em>',`<img class="content-image" src="assets/box.webp" alt="Box Giggiooo con burger, bevanda e salse"><p>Il visual di concept riunisce burger, shake e due salse nella confezione marrone e oro Giggiooo. È il riferimento per la famiglia visiva del menù.</p><details><summary>Burger</summary><p>Golden Burger è il burger con pollo croccante del catalogo. La sua scheda presenta video e ingredienti nell’ordine dell’esploso.</p><button class="text-button" data-action="burger">Apri Golden Burger</button></details><details><summary>Bevanda</summary><p>Shake di concept con topping chiaro, cioccolato e accenti dorati. Nome, ricetta, formato e allergeni da definire con i materiali dedicati.</p></details><details><summary>Salse</summary><p>Due coppette nel visual: una salsa dorata e una scura. Colori e presentazione definiscono la direzione creativa; le ricette non sono ancora definite.</p></details><span class="subtle">Il prezzo della box e gli eventuali supplementi non sono ancora definiti.</span>`,'BOX / CONCEPT'));}
function openLocation(id){const lab=id==='lab';openDialog(plain(lab?'Giggiooo <em>Lab.</em>':'Giggiooo <em>Studio.</em>',`<div class="demo-banner">Sede immaginaria per la proposta. Nessun indirizzo, contatto o mappa di un locale reale.</div><p>${lab?'Spazio di concept dedicato alle nuove combinazioni.':'Punto d’incontro di concept del mondo Giggiooo.'}</p><h3>Orari dimostrativi</h3><p>Tutti i giorni · ${lab?'19:00 – 23:30':'18:00 – 23:00'}</p><h3>Il menù della sede</h3><p>Neon Bacon, Double Melt e Golden Burger sono disponibili nella demo di entrambe le sedi.</p><button class="button gold" id="select-location">Seleziona questa sede e vedi il menù</button><span class="subtle">Indicazioni stradali disponibili quando sarà definita una sede.</span>`,'LOCALE / DEMO'));$('#select-location').addEventListener('click',()=>{state.location=id;$('#location').value=id;safeStore.set('gb-concept-location',id);closeDialog();$('#menu').scrollIntoView({behavior:reduceHero()?'auto':'smooth'});});}
function field(label,key,value,type='text',required=true){return `<label class="field">${label}<input name="${key}" type="${type}" value="${esc(value)}" ${required?'required':''} ${type==='email'?'autocomplete="off"':''}></label>`;}
function readForm(form,target){new FormData(form).forEach((v,k)=>target[k]=typeof v==='string'?v:target[k]);}
function clubForm(){const c=state.club;openDialog(plain('Il tuo posto<br><em>nel Club.</em>',`${demoBanner}<div class="step-label">01 / I TUOI DATI DEMO</div><form id="club-form"><div class="form-grid">${field('Nome','first',c.first)}${field('Cognome','last',c.last)}${field('Data di nascita','birth',c.birth,'date')}${field('Telefono demo','phone',c.phone,'tel')}</div>${field('Email demo','email',c.email,'email')}<label class="field">Il tuo Club<select name="variant"><option ${c.variant==='Club'?'selected':''}>Club</option><option ${c.variant==='Crew'?'selected':''}>Crew</option><option ${c.variant==='Team'?'selected':''}>Team</option><option ${c.variant==='Friends'?'selected':''}>Friends</option></select></label><label class="checkbox"><input type="checkbox" name="consent" required ${c.consent?'checked':''}><span>Ho letto le regole demo e uso dati fittizi.</span></label><p class="form-error" id="form-error" role="alert"></p><button class="button gold" type="submit">Continua</button><button class="text-button form-back" type="button" data-action="rules">Leggi le regole demo</button></form>`,'GIGGIOOO CLUB'));const f=$('#club-form');f.addEventListener('input',()=>{readForm(f,state.club);state.club.consent=f.elements.consent.checked;});f.addEventListener('submit',e=>{e.preventDefault();readForm(f,state.club);state.club.consent=f.elements.consent.checked;clubCode(false);});}
function clubCode(cardOnly){openDialog(plain('Un ultimo<br><em>passaggio.</em>',`${demoBanner}<div class="step-label">02 / VERIFICA SIMULATA</div><p>Non inviamo email. Per provare questo passaggio, usa il codice demo <strong>000000</strong>.</p><form id="code-form"><label class="field">Codice demo<input name="code" class="code-input" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required aria-describedby="code-error"></label><p id="code-error" class="form-error" role="alert"></p><button class="button gold" type="submit">Verifica il codice</button><button class="text-button form-back" type="button" id="code-back">Indietro</button></form>`,'GIGGIOOO CLUB'));$('#code-back').addEventListener('click',cardOnly?cardAccess:clubForm);$('#code-form').addEventListener('submit',e=>{e.preventDefault();if(new FormData(e.target).get('code')!=='000000'){$('#code-error').textContent='Codice non valido. Il codice dimostrativo è 000000.';return;}$('#code-error').textContent='Verifica in corso…';const b=$('button[type="submit"]',e.target);b.disabled=true;const timer=setTimeout(()=>{if(dialog.open)cardPreview(!cardOnly);},450);dialogCleanup=()=>clearTimeout(timer);});}
function cardMarkup(){return `<div class="membership-card ${state.cardStyle==='gold'?'gold-card':''}"><span class="card-caption">GIGGIOOO ${esc(state.club.variant.toUpperCase())}</span><img src="assets/logo.webp" alt="Logo Giggiooo"><div class="card-bottom"><span>${esc((state.club.first+' '+state.club.last).toUpperCase())}</span><span>DEMO / 0001</span></div></div>`;}
function cardPreview(joined=false){openDialog(plain(joined?'Benvenuto<br><em>nel concept.</em>':'La carta.<br><em>Il tuo stile.</em>',`${demoBanner}${joined?'<p>Percorso demo completato. Nessuna iscrizione è stata registrata.</p>':''}<div id="card-preview">${cardMarkup()}</div><div class="card-options" role="group" aria-label="Stile della tessera"><button data-card-style="brown" aria-pressed="${state.cardStyle==='brown'}" class="${state.cardStyle==='brown'?'active':''}">Brown & Gold</button><button data-card-style="gold" aria-pressed="${state.cardStyle==='gold'}" class="${state.cardStyle==='gold'?'active':''}">Gold Edition</button></div><button class="button gold" id="save-card">Salva stile demo</button><p class="subtle" id="card-result" role="status">Anteprima locale · nessuna tessera o Wallet reale.</p>`,'GIGGIOOO CLUB'));$$('[data-card-style]').forEach(b=>b.addEventListener('click',()=>{state.cardStyle=b.dataset.cardStyle;$('#card-preview').innerHTML=cardMarkup();$$('[data-card-style]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});}));$('#save-card').addEventListener('click',()=>{$('#card-result').textContent='Stile salvato per questa sessione demo. Nessun Wallet è stato generato.';toast('Stile demo salvato');});}
function cardAccess(){openDialog(plain('La tua carta,<br><em>di nuovo.</em>',`${demoBanner}<form id="card-access">${field('Email demo','email',state.club.email,'email')}<button class="button gold" type="submit">Continua con il codice demo</button></form>`,'GIGGIOOO CLUB'));$('#card-access').addEventListener('submit',e=>{e.preventDefault();state.club.email=new FormData(e.target).get('email');clubCode(true);});}
function merchCards(scope){return `<div class="burger-grid merch-grid">${merch.map(m=>`<article class="burger-card merch-card"><div class="burger-card-photo"><img src="${m.image}" width="1254" height="1254" loading="lazy" decoding="async" alt="${esc(m.name)} con grafica Giggiooo Burger"></div><div class="burger-card-copy"><span class="eyebrow">${esc(m.type)}</span><h3>${productTitle(m)}</h3><div class="price-row"><span>${euro(m.price)}<small>PREZZO DEMO</small></span></div><label class="merch-size" for="${scope}-${m.id}">Taglia<select id="${scope}-${m.id}">${m.sizes.map(size=>`<option value="${esc(size)}">${size==='unica'?'Taglia unica':esc(size)}</option>`).join('')}</select></label><button class="button gold" data-merch-add="${m.id}" data-size-input="${scope}-${m.id}">Aggiungi al carrello demo</button></div></article>`).join('')}</div>`;}
function renderMerch(){const c=$('#merch-catalog');if(c)c.innerHTML=merchCards('section');}
function cartCount(){return state.cart.reduce((n,item)=>n+item.qty,0);}
function cartTotal(){return state.cart.reduce((n,item)=>n+merch.find(m=>m.id===item.id).price*item.qty,0);}
function updateCart(){ $$('[data-cart-count]').forEach(el=>el.textContent=`(${cartCount()})`);}
function merchDetail(){closeDialog();$('#merch').scrollIntoView({behavior:reduceHero()?'auto':'smooth'});}
function addMerch(id,size){const product=merch.find(m=>m.id===id);if(!product||!product.sizes.includes(size))return;const item=state.cart.find(m=>m.id===id&&m.size===size);if(item&&item.qty>=5){toast('Massimo 5 articoli per taglia nella demo.');return;}if(item)item.qty++;else state.cart.push({id,size,qty:1});updateCart();toast('Aggiunto al carrello demo');}
function cartLines(editable=false){return state.cart.map((item,i)=>{const m=merch.find(p=>p.id===item.id);return `<div class="cart-line"><div><h3>${esc(m.name)}</h3><p>${item.size==='unica'?'Taglia unica':'Taglia '+esc(item.size)} · ${euro(m.price)}</p></div>${editable?`<div class="qty"><button data-cart-index="${i}" data-cart-change="-1" aria-label="Riduci quantità di ${esc(m.name)}">−</button><span>${item.qty}</span><button data-cart-index="${i}" data-cart-change="1" aria-label="Aumenta quantità di ${esc(m.name)}">+</button></div><button class="text-button" data-cart-index="${i}" data-cart-change="remove">Rimuovi</button>`:`<span>× ${item.qty}</span>`}<strong>${euro(m.price*item.qty)}</strong></div>`;}).join('');}
function cart(){openDialog(plain('Il tuo<br><em>carrello demo.</em>',`${demoBanner}${!state.cart.length?'<p>Il carrello è vuoto.</p><button class="button gold" data-action="merch-detail">Vedi il merchandising</button>':`${cartLines(true)}<div class="cart-total"><span>Totale demo</span><strong>${euro(cartTotal())}</strong></div><button class="button gold" data-action="checkout">Preordine demo</button><button class="text-button form-back" data-action="merch-detail">Continua a scegliere</button>`}`,'MERCH / DEMO'));}
const checkoutData={name:'Alex Demo',email:'alex@example.test',notes:''};
function checkout(){if(!state.cart.length){cart();return;}openDialog(plain('Il tuo<br><em>preordine demo.</em>',`${demoBanner}<form id="checkout-form">${field('Nome demo','name',checkoutData.name)}${field('Email demo','email',checkoutData.email,'email')}<label class="field">Note demo<textarea name="notes">${esc(checkoutData.notes)}</textarea></label><label class="checkbox"><input name="consent" type="checkbox" required><span>Comprendo che il preordine è soltanto una simulazione.</span></label><button class="button gold" type="submit">Vedi il riepilogo</button><button class="text-button form-back" type="button" data-action="cart">Torna al carrello</button></form>`,'MERCH / DEMO'));$('#checkout-form').addEventListener('input',e=>readForm(e.currentTarget,checkoutData));$('#checkout-form').addEventListener('submit',e=>{e.preventDefault();readForm(e.target,checkoutData);checkoutSummary();});}
function checkoutSummary(){openDialog(plain('Controlla il<br><em>riepilogo.</em>',`${demoBanner}<p>${esc(checkoutData.name)}<br>${esc(checkoutData.email)}</p>${cartLines()}<div class="cart-total"><span>Totale demo</span><strong>${euro(cartTotal())}</strong></div><p>${esc(checkoutData.notes)}</p><button class="button gold" id="confirm-preorder">Conferma simulazione</button><button class="text-button form-back" data-action="checkout">Modifica dati</button>`,'MERCH / DEMO'));$('#confirm-preorder').addEventListener('click',()=>{state.cart=[];updateCart();openDialog(plain('Simulazione<br><em>completata.</em>','<p>Nessun preordine è stato inviato. Non è stato effettuato alcun pagamento.</p><button class="button gold" id="finish-preorder">Torna al merchandising</button>','MERCH / DEMO'));$('#finish-preorder').addEventListener('click',()=>{closeDialog();$('#merch').scrollIntoView({behavior:reduceHero()?'auto':'smooth'});});});}
function feedbackAccess(){openDialog(plain('Com’è<br><em>andata?</em>',`${demoBanner}<p>Per provare il feedback inserisci il riferimento scontrino demo <strong>DEMO-001</strong>.</p><form id="receipt-form">${field('Riferimento scontrino demo','receipt',state.feedback.receipt)}<p class="form-error" id="receipt-error" role="alert"></p><button class="button gold" type="submit">Continua</button></form>`,'FEEDBACK / DEMO'));$('#receipt-form').addEventListener('submit',e=>{e.preventDefault();const r=new FormData(e.target).get('receipt').trim();state.feedback.receipt=r;if(r!=='DEMO-001'){$('#receipt-error').textContent='Riferimento non valido. Usa DEMO-001 per continuare.';return;}feedbackForm();});}
function feedbackForm(){const f=state.feedback;openDialog(plain('Il tuo punto<br><em>di vista.</em>',`${demoBanner}<form id="feedback-form"><div class="rating-grid">${[['Cibo','food'],['Servizio','service'],['Pulizia','clean'],['Esperienza generale','overall']].map(([l,k])=>`<label class="field">${l}<select name="${k}">${[5,4,3,2,1].map(n=>`<option value="${n}" ${String(n)===f[k]?'selected':''}>${n} / 5</option>`).join('')}</select></label>`).join('')}</div><label class="field">Commento demo<textarea name="comment" required>${esc(f.comment)}</textarea></label><label class="field">Foto facoltativa<input type="file" id="feedback-photo" accept="image/*"><span class="subtle" id="photo-info">La foto viene soltanto selezionata sul dispositivo. Nessun caricamento.</span></label><label class="checkbox"><input name="consent" type="checkbox" required ${f.consent?'checked':''}><span>Uso dati fittizi e confermo l’invio simulato.</span></label><label class="checkbox"><input name="contact" type="checkbox"><span>Vorrei essere ricontattato (opzione demo, nessun contatto reale).</span></label><button class="button gold" type="submit">Invia feedback demo</button><button class="text-button form-back" data-action="feedback" type="button">Indietro</button></form>`,'FEEDBACK / DEMO'));$('#feedback-form').addEventListener('input',e=>{readForm(e.currentTarget,state.feedback);state.feedback.consent=e.currentTarget.elements.consent.checked;});$('#feedback-photo').addEventListener('change',e=>{$('#photo-info').textContent=e.target.files[0]?`Selezionato: ${e.target.files[0].name}. Nessun caricamento.`:'Nessuna foto selezionata.';});$('#feedback-form').addEventListener('submit',e=>{e.preventDefault();readForm(e.target,state.feedback);openDialog(plain('Grazie per<br><em>il tuo tempo.</em>','<p>Il percorso di feedback è stato completato nella demo. Nessun messaggio o fotografia è stato inviato.</p><button class="button gold" id="feedback-finish">Chiudi</button>','FEEDBACK / DEMO'));$('#feedback-finish').addEventListener('click',closeDialog);});}
function order(){openDialog(plain('Scegli il gusto.<br><em>Il resto, dopo.</em>',`<div class="demo-banner">Il servizio ordini è rappresentato solo come passaggio dimostrativo. Nessun collegamento a sistemi o locali reali.</div><h3>${state.location==='lab'?'Giggiooo Lab':'Giggiooo Studio'} · sede demo</h3><p>Nella piattaforma definitiva questo punto porterà al servizio di asporto o consegna della sede selezionata.</p><p>Puoi continuare a esplorare il menù, senza creare un ordine.</p><button class="button gold" id="back-menu">Torna al menù</button>`,'ORDINI / DEMO'));$('#back-menu').addEventListener('click',()=>{closeDialog();$('#menu').scrollIntoView({behavior:reduceHero()?'auto':'smooth'});});}
function preferences(){openDialog(plain('Le tue<br><em>preferenze.</em>',`<p>La demo non usa analytics o tracciamento pubblicitario. La sede selezionata viene ricordata nel browser; puoi cancellare questa scelta.</p><div class="preferences-row"><span>Preferenze facoltative demo<br><small>Memorizza la scelta di questo pannello</small></span><input id="comfort-preference" type="checkbox" aria-label="Memorizza preferenze facoltative demo" ${state.preferences.comfort?'checked':''}></div><div class="inline-actions" style="margin-top:25px"><button class="button gold" id="save-preferences">Salva preferenze</button><button class="text-button" id="reset-preferences">Cancella scelte locali</button></div>`,'PREFERENZE / DEMO'));$('#save-preferences').addEventListener('click',()=>{state.preferences.comfort=$('#comfort-preference').checked;safeStore.set('gb-concept-comfort',state.preferences.comfort?'yes':'no');toast('Preferenze salvate');closeDialog();});$('#reset-preferences').addEventListener('click',()=>{try{localStorage.removeItem('gb-concept-location');localStorage.removeItem('gb-concept-comfort');}catch{}state.location='studio';state.preferences.comfort=false;$('#location').value='studio';toast('Scelte locali cancellate');closeDialog();});}
const actions={burger:openBurger,film:openFilm,box:openBox,sauces:()=>openDialog(plain('Due colori.<br><em>Un carattere.</em>','<p>Le salse dorata e scura completano il visual Giggiooo. Ricette, nomi e informazioni alimentari saranno definiti insieme ai nuovi materiali.</p><img class="content-image" src="assets/box.webp" alt="Due salse nel packaging Giggiooo">','SALSE / CONCEPT')),story:()=>openDialog(plain('Dentro<br><em>Giggiooo.</em>','<p>Un’identità originale, costruita intorno a marrone e oro. Il marchio firma il packaging, il tovagliolo, la bevanda e il modo di presentare il burger.</p><h3>01 · L’identità</h3><p>Un logo dorato e un contrasto deciso tra prodotto e scena.</p><h3>02 · Il prodotto</h3><p>Il primo burger pilota apre il racconto, con una lettura degli ingredienti dall’alto verso il basso.</p><h3>03 · L’esperienza</h3><p>Menù, box e Club condividono lo stesso linguaggio. Questa è una storia di concept, senza aperture o cronologie reali.</p>','IL NOSTRO MONDO')),club:clubForm,card:cardAccess,'merch-detail':merchDetail,cart,checkout,feedback:feedbackAccess,order,cookies:preferences,privacy:()=>openDialog(plain('Informazioni<br><em>sulla demo.</em>','<p>Questo ambiente è una proposta di design Giggiooo Burger. I contenuti commerciali, le sedi e i prezzi sono dimostrativi.</p><h3>Moduli</h3><p>I dati inseriti restano nella memoria della pagina e si perdono ricaricandola. Non vengono trasmessi attraverso i moduli. Usa soltanto dati fittizi. Le foto del feedback non vengono caricate.</p><h3>Preferenze locali</h3><p>La scelta della sede e le preferenze di questo pannello possono essere salvate nel browser. Puoi eliminarle dalle preferenze.</p><h3>Servizi</h3><p>Registrazione, verifica codice, carta Club, preordine e feedback sono simulazioni. Non vengono inviate email, generati Wallet, effettuati pagamenti o creati ordini reali.</p><p class="subtle">Testo informativo della demo, non informativa legale di un’attività commerciale. Le informative della versione definitiva richiederanno contenuti approvati.</p>','PRIVACY / DEMO')),rules:()=>openDialog(plain('Le regole<br><em>del Club demo.</em>','<p>Il Club è un percorso dimostrativo. Non attribuisce sconti, vantaggi o diritti commerciali.</p><p>Il codice 000000 serve soltanto a provare la verifica. La carta resta un’anteprima nella pagina e non viene aggiunta a un Wallet.</p><p>Club, Crew, Team e Friends sono varianti grafiche di concept. Non rappresentano programmi o convenzioni reali.</p><button class="button gold" data-action="club">Torna al modulo</button>','CLUB / DEMO'))};

// Optional browser tool registry; actions share the same state as the visible UI.
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const tools=[
  {name:'read_demo_menu',title:'Leggi il menù demo',description:'Restituisce burger, bevande, categorie e sede demo selezionata. Prezzi da definire o dimostrativi.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw new Error('Nessun parametro ammesso.');return {location:state.location,category:state.category,products:window.GB_CATALOG.products,drinks:window.GB_CATALOG.drinks,merch:window.GB_CATALOG.merch};}},
  {name:'select_demo_category',title:'Seleziona categoria demo',description:'Seleziona la categoria visibile del catalogo. Non crea ordini.',inputSchema:{type:'object',properties:{category:{type:'string',enum:['burger','drinks','merch','sauce']}},required:['category'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||Object.keys(input).some(k=>k!=='category')||!['burger','drinks','merch','sauce'].includes(input.category))throw new Error('Categoria non valida.');state.category=input.category;renderCatalog();return {category:state.category};}},
  {name:'open_demo_product',title:'Apri il burger demo',description:'Apre la scheda del burger selezionato con video e ingredienti in ordine visivo. Non configura o acquista prodotti.',inputSchema:{type:'object',properties:{productId:{type:'string',enum:products.map(p=>p.id)}},required:['productId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||!productById(input.productId)||Object.keys(input).some(k=>k!=='productId'))throw new Error('Prodotto demo non valido.');openBurger(input.productId);return {productId:input.productId,view:'detail',demo:true};}}
 ];
 for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

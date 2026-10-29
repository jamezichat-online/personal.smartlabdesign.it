'use strict';
const looks = [
 {id:0,name:'Poco seria, molto POMATA',short:'Poco seria.',gender:'donna',mood:'Il tramonto non aspetta.',color:'Giallo limone',hex:'#f0df81',price:36,description:'La crop tee con lo spritz più disinvolto del guardaroba.',story:'Un giro in Vespa, il mare sullo sfondo e zero voglia di prendersi troppo sul serio.'},
 {id:1,name:'Fari, POMATA',short:'Fari, POMATA',gender:'uomo',mood:'L’ora dell’aperitivo.',color:'Bianco',hex:'#f8f7f0',price:39,description:'La t-shirt con un brindisi sul cuore. Il resto può aspettare.',story:'Tavolino sul lungomare, ghiaccio nel bicchiere e un tramonto da far durare. Il tuo aperitivo, da indossare.'},
 {id:2,name:'Sabato sera = POMATA',short:'Sabato sera.',gender:'donna',mood:'Nessun programma. Tutti i programmi.',color:'Avorio',hex:'#e9e3d1',price:36,description:'Una t-shirt, un calendario innamorato e l’attitudine giusta per uscire.',story:'Dal mercato all’ultimo tavolo della serata. Alcuni sabati cominciano molto prima del tramonto.'},
 {id:3,name:'Class is forever',short:'Class is forever.',gender:'uomo',mood:'Le cose belle restano.',color:'Bianco',hex:'#f8f7f0',price:39,description:'La t-shirt con la tasca disegnata e una dichiarazione di stile.',story:'Il tempo passa. Certe attitudini restano: un dettaglio da osservare da vicino, senza guardare l’ora.'},
 {id:4,name:'Bedda e spavalda',short:'Bedda e spavalda.',gender:'donna',mood:'Sole in faccia. Testa alta.',color:'Bianco',hex:'#f8f7f0',price:36,description:'Il limone con gli occhiali e tutta la sfacciataggine dell’estate.',story:'La luce bianca della costa, il blu del mare e quell’aria di chi si sente esattamente al posto giusto.'},
 {id:5,name:'Mai senza POMATA',short:'Mai senza.',gender:'uomo',mood:'Un carattere un po’ pungente.',color:'Rosa',hex:'#eebacb',price:39,description:'La t-shirt rosa con il fico d’India. Dolce, ma con carattere.',story:'Le piazze si riempiono, le ombre si allungano. Il fico d’India ha già scelto cosa mettersi.'},
 {id:6,name:'Struscio mode ON',short:'Struscio mode ON.',gender:'uomo',mood:'La notte è appena cominciata.',color:'Blu notte',hex:'#252b41',price:39,description:'Un interruttore acceso sulla t-shirt. E sulla tua prossima serata.',story:'Una passeggiata che non finisce mai, gli amici fuori dal bar e nessuna fretta di tornare.'},
 {"id": 7, "name": "Granita e spavalderia", "short": "Granita e spavalderia", "gender": "donna", "mood": "La giornata comincia così.", "color": "Rosa", "hex": "#eab6c6", "price": 0, "description": "Una granita con gli occhiali, una brioche e tutta la voglia di prendersela comoda.", "story": "Una pausa in pasticceria, gli amici al tavolo e la Sicilia che si gusta un cucchiaino alla volta."},
 {"id": 8, "name": "POMATA H24", "short": "POMATA H24", "gender": "donna", "mood": "Sempre nell’umore giusto.", "color": "Nero", "hex": "#171719", "price": 0, "description": "La luna, un cocktail e una sveglia: l’attitudine POMATA non guarda l’ora.", "story": "Le luci della città si accendono. La terrazza è quella giusta, il primo brindisi arriva adesso."},
 {"id": 9, "name": "POMATA Club", "short": "POMATA Club", "gender": "uomo", "mood": "La compagnia giusta.", "color": "Bianco", "hex": "#f8f7f0", "price": 0, "description": "Granita, arancina, cannolo e limone. La compagnia più siciliana del guardaroba.", "story": "Un giro al mare con gli amici. Si comincia con una granita, poi si vede: il club è già al completo."},
 {"id": 10, "name": "The Gold Rush", "short": "The Gold Rush", "gender": "uomo", "mood": "Il tempo è dalla tua parte.", "color": "Bianco", "hex": "#f8f7f0", "price": 0, "description": "Un orologio d’oro nel taschino disegnato. Il tuo tempo, a modo tuo.", "story": "La luce calda sulle facciate barocche e una passeggiata senza fretta. Certe ore meritano di essere indossate."},
 {"id": 11, "name": "Cu nesci, arrinesci", "short": "Cu nesci, arrinesci", "gender": "uomo", "mood": "Esci. Il bello è fuori.", "color": "Nero", "hex": "#171719", "price": 0, "description": "Una porta aperta, la luce della serata e un invito tutto siciliano: Cu nesci, arrinesci.", "story": "Tra i vicoli, una Vespa e i panni stesi, ogni uscita può diventare una storia. Basta aprire la porta."}
];
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
function readStorage(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
let favorites=readStorage('pomata-favorites',[]);if(!Array.isArray(favorites))favorites=[];favorites=favorites.filter(id=>looks.some(l=>l.id===id));
let bag=readStorage('pomata-bag',[]);if(!Array.isArray(bag))bag=[];bag=bag.filter(x=>looks.some(l=>l.id===x.id)&&['XS','S','M','L','XL'].includes(x.size)&&Number.isInteger(x.qty)&&x.qty>0&&x.qty<=99);
let selected=1,filter='all',size=null,detailOpen=false,toastTimer,lastTrigger=null;
const money=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
const original=l=>`assets/original-${l.id}.webp`;const model=l=>`assets/model-hq-${l.id}.webp`;
const visible=()=>looks.filter(l=>filter==='all'||filter==='favorites'&&favorites.includes(l.id)||l.gender===filter);
function persist(){try{localStorage.setItem('pomata-favorites',JSON.stringify(favorites));localStorage.setItem('pomata-bag',JSON.stringify(bag))}catch{}updateCounts()}
function updateCounts(){$('#bagCount').textContent=bag.reduce((n,x)=>n+x.qty,0);$('#favCount').textContent=favorites.length||'';$('#favoritesButton').setAttribute('aria-label',`Mostra ${favorites.length} look preferiti`)}
function announce(msg){$('#announcement').textContent=msg}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600)}
const Orbit=PomataOrbit;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const sceneInfo=[
 ['Cefalù','Il sole si prende il suo tempo.'],
 ['Ortigia, Siracusa','L’ora d’oro.'],
 ['Ballarò, Palermo','La città ha un altro sapore.'],
 ['Noto','La bellezza, senza fretta.'],
 ['Scala dei Turchi','Il blu che ti porti addosso.'],
 ['Noto al tramonto','Ancora cinque minuti.'],
 ['Catania, di notte','La serata è tutta da scrivere.'],
 ['Palermo, in pasticceria','Il buongiorno ha un altro sapore.'],
 ['Sicilia, rooftop','La città accende la serata.'],
 ['Sicilia, al mare','La compagnia giusta.'],
 ['Cefalù','La luce si prende il suo tempo.'],
 ['Sicilia, tra i vicoli','Esci. Il bello è fuori.']
];
let orbitItems=[],orbitKey='',phase=1,target=1,orbitVelocity=0,frame=0,lastFrame=0;
let dragging=null,suppressClick=false,stageWidth=1,stageHeight=1;
const stage=$('#runway');
const modelElements=[],shadowElements=[],sceneElements=[];
function render(){
 const items=visible();if(items.length&&!items.some(l=>l.id===selected))selected=items[0].id;
 const key=items.map(l=>l.id).join(',');
 if(key!==orbitKey){orbitKey=key;orbitItems=items;phase=Math.max(0,items.findIndex(l=>l.id===selected));target=phase;orbitVelocity=0;}
 renderInfo();measureOrbit();drawOrbit();
}
function renderInfo(){
 const items=orbitItems,current=looks[selected],position=items.findIndex(l=>l.id===selected),count=items.length;
 $('#emptyState').hidden=count>0;['#saveLook','#hotspot','#discover','#photoButton'].forEach(s=>{$(s).hidden=count===0});$('#prev').disabled=count<2;$('#next').disabled=count<2;
 $('#lookIndex').textContent=count?`${String(position+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`:'0 / 0';$('#lookName').textContent=count?current.short:'I tuoi colpi di cuore';$('#lookMood').textContent=count?current.mood:'Tutto comincia da un look.';
 $('#saveLook').setAttribute('aria-pressed',String(favorites.includes(selected)));$('#saveLook').setAttribute('aria-label',favorites.includes(selected)?'Rimuovi questo look dai preferiti':'Salva questo look');
 $('#progress').replaceChildren(...items.map((l,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',`Look ${i+1}: ${l.name}`);b.setAttribute('aria-pressed',String(l.id===selected));b.onclick=()=>select(l.id);return b}));
 $$('.filters button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
 $('#scenePlace').textContent=sceneInfo[selected][0];$('#sceneTime').textContent=sceneInfo[selected][1];
 modelElements.forEach((el,id)=>{const active=id===selected;el.setAttribute('aria-current',String(active));el.setAttribute('aria-label',`${looks[id].name}${active?', selezionato, apri il dettaglio':''}`);el.tabIndex=active?0:-1;});
 if(detailOpen&&count)renderDetail();if(!count&&detailOpen)closeDetail(false);
}
function measureOrbit(){stageWidth=stage.clientWidth;stageHeight=stage.clientHeight;}
function syncSelected(){
 if(!orbitItems.length)return;
 const l=orbitItems[Orbit.mod(Math.round(phase),orbitItems.length)];
 if(l.id!==selected){selected=l.id;size=null;renderInfo();}
}
function drawOrbit(){
 const count=orbitItems.length;
 for(let id=0;id<looks.length;id++){
  const el=modelElements[id],shadow=shadowElements[id];if(!el)continue;
  const i=orbitItems.findIndex(l=>l.id===id);el.hidden=i<0;shadow.hidden=i<0;if(i<0)continue;
  const p=Orbit.pose(i,phase,count,stageWidth,stageHeight);
  el.style.transform=`translate3d(calc(-50% + ${p.x.toFixed(3)}px),${p.y.toFixed(3)}px,0) scale(${p.scale.toFixed(5)})`;
  el.style.filter=p.blur<.01?'none':`blur(${p.blur.toFixed(2)}px) saturate(${(1-p.depth*.18).toFixed(3)})`;
  el.style.opacity=p.opacity.toFixed(3);el.style.zIndex=p.z;
  el.style.pointerEvents=p.opacity<.02?'none':'';el.setAttribute('aria-hidden',String(p.opacity<.02));
  shadow.style.transform=`translate3d(calc(-50% + ${p.x.toFixed(3)}px),${p.shadowY.toFixed(3)}px,0) scale(${p.scale.toFixed(5)})`;
  shadow.style.opacity=p.shadowOpacity.toFixed(3);shadow.style.zIndex=p.z-1;
  shadow.style.filter=`blur(${(2.8+p.depth*3).toFixed(2)}px)`;
 }
 drawScene();
 const focus=1-Math.cos((phase-Math.round(phase))*2*Math.PI/Math.max(count,1));
 $('#hotspot').style.opacity=String(dragging?0:Orbit.clamp(1-focus*4,0,1));
 $('#hotspot').style.pointerEvents=dragging?'none':'';
}
function drawScene(){
 if(!orbitItems.length)return;
 const base=Math.floor(phase),mix=phase-base;
 const from=orbitItems[Orbit.mod(base,orbitItems.length)].id,to=orbitItems[Orbit.mod(base+1,orbitItems.length)].id;
 sceneElements.forEach((el,id)=>{el.style.opacity=id===from?'1':id===to?String(mix):'0';el.style.zIndex=id===to&&from!==to?'1':'0';});
 const drift=Math.sin(phase*Math.PI*2/Math.max(orbitItems.length,1))*12;
 $('#sceneBackdrop').style.setProperty('--scene-drift',`${drift.toFixed(2)}px`);
}
function tick(now){
 frame=0;if(document.hidden)return;
 const dt=lastFrame?Math.min((now-lastFrame)/1000,.05):1/60;lastFrame=now;
 if(!dragging){
  const next=Orbit.settle(phase,orbitVelocity,target,dt);phase=next.phase;orbitVelocity=next.velocity;
  if(Math.abs(phase-target)<.0001&&Math.abs(orbitVelocity)<.001){phase=target;orbitVelocity=0;lastFrame=0;}
 }
 syncSelected();drawOrbit();
 if(!dragging&&(Math.abs(phase-target)>.0001||Math.abs(orbitVelocity)>.001))frame=requestAnimationFrame(tick);
}
function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
function rotateTo(next,immediate=false){
 target=next;
 if(reducedMotion.matches||immediate){phase=target;orbitVelocity=0;syncSelected();drawOrbit();return;}
 lastFrame=0;schedule();
}
function select(id){
 const index=orbitItems.findIndex(l=>l.id===id);if(index<0)return;
 const destination=Orbit.nearestTarget(phase,index,orbitItems.length);
 rotateTo(destination);announce(`Look ${looks[id].name}. ${looks[id].mood}`);
}
function move(delta){if(orbitItems.length<2)return;rotateTo(Math.round(target)+delta);}
function changeFilter(value){
 cancelDrag();filter=value;size=null;orbitKey=null;render();
 announce(`${visible().length} look ${value==='all'?'nella passerella':value==='favorites'?'preferiti':value==='donna'?'per lei':'per lui'}`);
}
function renderDetail(){const l=looks[selected];$('#detailPhoto').src=original(l);$('#detailPhoto').alt=`Foto originale della t-shirt ${l.name}`;$('#detailHeading').textContent=l.name;$('#detailPrice').textContent=money(l.price);$('#detailDescription').textContent=l.description;$('#detailColor').textContent=l.color;$('#colorSwatch').style.background=l.hex;$('#detailStory').textContent=l.story;$('#sizeError').textContent='';$('#sizes').replaceChildren(...['XS','S','M','L','XL'].map(s=>{const b=document.createElement('button');b.textContent=s;b.setAttribute('aria-pressed',String(size===s));b.onclick=()=>{size=s;$$('#sizes button').forEach(x=>x.setAttribute('aria-pressed',String(x.textContent===s)));$('#sizeError').textContent=''};return b}))}
function openDetail(){if(!visible().length)return;lastTrigger=document.activeElement;detailOpen=true;document.body.classList.add('detail-open');$('#detailPanel').inert=false;$('#detailPanel').setAttribute('aria-hidden','false');$('#panelScrim').hidden=innerWidth>700;renderDetail();setTimeout(()=>{render();$('#closeDetail').focus()},80)}
function closeDetail(focus=true){detailOpen=false;document.body.classList.remove('detail-open');$('#detailPanel').inert=true;$('#detailPanel').setAttribute('aria-hidden','true');$('#panelScrim').hidden=true;if(focus)$('#discover').focus();setTimeout(render,650)}
function showDialog(id){$(id).showModal()}
function photo(){const l=looks[selected];$('#originalPhoto').src=original(l);$('#originalPhoto').alt=`Campagna originale POMATA: ${l.name}`;$('#photoCaption').textContent=l.name;showDialog('#photoDialog')}
function collection(onlyFavorites=false){const data=onlyFavorites?looks.filter(l=>favorites.includes(l.id)):looks;$('#collectionTitle').textContent=onlyFavorites?'I tuoi colpi di cuore.':'La collezione.';$('#collectionDescription').textContent=onlyFavorites?(data.length?`${data.length} look da ritrovare, quando vuoi.`:'Nessun preferito, per ora. Tocca il cuore nella passerella per salvare un look.'):'Sette personalità. Una sola attitudine.';$('#collectionGrid').replaceChildren(...data.map(l=>{const b=document.createElement('button');b.className='collection-card';const img=document.createElement('img');img.src=original(l);img.alt=l.name;img.loading='lazy';const title=document.createElement('h3');title.textContent=l.name;const p=document.createElement('p');p.textContent=`${l.color} · ${money(l.price)}`;b.append(img,title,p);if(favorites.includes(l.id)){const heart=document.createElement('span');heart.className='card-heart';heart.textContent='♥';b.append(heart)}b.onclick=()=>{$('#collectionDialog').close();filter='all';selected=l.id;size=null;orbitKey=null;render();openDetail()};return b}));showDialog('#collectionDialog')}
function renderBag(){const area=$('#bagItems');area.replaceChildren();if(!bag.length){const div=document.createElement('div');div.className='bag-empty';div.innerHTML='<p>La tua prossima POMATA ti aspetta.</p><button class="text-button" id="continueShopping">Torna alla passerella ↗</button>';area.append(div);$('#continueShopping').onclick=()=>$('#bagDialog').close();$('#bagSummary').textContent='';return}
 bag.forEach((item,i)=>{const l=looks[item.id],row=document.createElement('div');row.className='bag-row';row.innerHTML=`<img src="${original(l)}" alt="${l.name}"><div><h3>${l.name}</h3><p>${l.color} · Taglia ${item.size}</p><div class="quantity"><button data-q="-1" aria-label="Riduci quantità di ${l.name}">−</button><span>${item.qty}</span><button data-q="1" aria-label="Aumenta quantità di ${l.name}" ${item.qty>=99?'disabled':''}>+</button><button class="remove" aria-label="Rimuovi ${l.name}">Rimuovi</button></div></div><span>${money(l.price*item.qty)}</span>`;row.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{item.qty+=Number(b.dataset.q);if(item.qty<1)bag.splice(i,1);persist();renderBag()});row.querySelector('.remove').onclick=()=>{bag.splice(i,1);persist();renderBag()};area.append(row)});
 $('#bagSummary').innerHTML=`<span>Subtotale demo</span><span>${money(bag.reduce((n,x)=>n+looks[x.id].price*x.qty,0))}</span>`;
}
// Normalize the alpha bounds with CSS so every shoe meets the same virtual floor.
// Original source artwork is preserved; these are layout metrics, not raster alterations.
const bodyBounds=[
 [1024,1536,278,20,827,1498],[1024,1536,280,18,784,1503],
 [1024,1536,294,19,739,1502],[1024,1536,262,5,784,1508],
 [1024,1536,307,16,714,1459],[949,1658,223,13,748,1589],
 [1024,1536,256,34,762,1489],
 [1024, 1536, 317, 11, 720, 1519],
 [1024, 1536, 269, 26, 835, 1520],
 [1024, 1536, 278, 11, 797, 1517],
 [1024, 1536, 254, 10, 766, 1493],
 [1020, 1541, 264, 20, 812, 1492]
];
const orbitNodes=[];
looks.forEach(l=>{
 const b=document.createElement('button');b.className='model';b.dataset.id=l.id;
 const [w,h,left,top,right,bottom]=bodyBounds[l.id],bodyHeight=bottom-top;
 b.style.setProperty('--body-ratio',String((right-left)/bodyHeight));
 b.style.setProperty('--image-scale',String(h/bodyHeight));
 b.style.setProperty('--image-bottom',`${-(h-bottom)/bodyHeight*100}%`);
 b.style.setProperty('--image-center',`${-(left+right)/(2*w)*100}%`);
 const img=document.createElement('img');img.src=model(l);img.alt=`${l.name}, figura intera nella passerella`;img.draggable=false;img.decoding='async';b.append(img);
 b.onclick=e=>{if(suppressClick||e.detail!==0)return;if(selected===l.id)openDetail();else select(l.id)};
 const shadow=document.createElement('div');shadow.className='model-shadow';shadow.setAttribute('aria-hidden','true');shadow.dataset.id=l.id;
 modelElements[l.id]=b;shadowElements[l.id]=shadow;orbitNodes.push(shadow,b);
 const scene=document.createElement('img');scene.src=`assets/scene-${l.id}.webp`;scene.alt='';scene.className='scene-layer';scene.decoding='async';scene.draggable=false;sceneElements[l.id]=scene;
});
$('#models').replaceChildren(...orbitNodes);$('#sceneBackdrop').replaceChildren(...sceneElements);
$('#prev').onclick=()=>move(-1);$('#next').onclick=()=>move(1);$('#discover').onclick=openDetail;$('#hotspot').onclick=openDetail;$('#closeDetail').onclick=()=>closeDetail();$('#panelScrim').onclick=()=>closeDetail();$('#photoButton').onclick=photo;$('#expandPhoto').onclick=photo;$('#sizeGuide').onclick=()=>showDialog('#sizeDialog');$('#collectionNav').onclick=()=>collection();$('#worldNav').onclick=()=>showDialog('#worldDialog');$('#worldExplore').onclick=()=>{$('#worldDialog').close();changeFilter('all')};$('#favoritesButton').onclick=()=>collection(true);$('#resetFilter').onclick=()=>changeFilter('all');
function home(){if(detailOpen)closeDetail(false);changeFilter('all')}$('#home').onclick=home;$('#runwayNav').onclick=home;$$('[data-filter]').forEach(b=>b.onclick=()=>changeFilter(b.dataset.filter));
$('#saveLook').onclick=()=>{if(favorites.includes(selected)){favorites=favorites.filter(id=>id!==selected);toast('Look rimosso dai preferiti')}else{favorites.push(selected);toast('Un colpo di cuore salvato.')}persist();render()};
$('#bagButton').onclick=()=>{renderBag();showDialog('#bagDialog')};
$('#addBag').onclick=()=>{if(!size){$('#sizeError').textContent='Scegli prima la tua taglia.';$('#sizes button').focus();return}const existing=bag.find(x=>x.id===selected&&x.size===size);if(existing&&existing.qty>=99){toast('Hai raggiunto il limite di 99 capi per taglia.');return}if(existing)existing.qty++;else bag.push({id:selected,size,qty:1});persist();toast(`${looks[selected].short} aggiunta alla bag · ${size}`);$('#addBag').innerHTML='Aggiunta alla bag <span>✓</span>';setTimeout(()=>{$('#addBag').innerHTML='Aggiungi alla bag <span>↗</span>'},1600)};
$$('dialog').forEach(d=>{d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})});
document.addEventListener('keydown',e=>{if($('dialog[open]'))return;if(e.key==='Escape'&&detailOpen){closeDetail();return}if(e.target.closest('input,select,textarea,#detailPanel')&&e.key!=='Escape')return;if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&(!e.target.closest('#main')||stage.getBoundingClientRect().bottom<100))return;if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}});
// Keep keyboard focus within the mobile product sheet; native dialogs handle their own focus.
document.addEventListener('keydown',e=>{if(e.key!=='Tab'||!detailOpen||innerWidth>700||$('dialog[open]'))return;const targets=$$('#detailPanel button, #detailPanel summary, #detailPanel a[href]').filter(el=>!el.disabled);const first=targets[0],last=targets[targets.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});
function dragStep(){return Orbit.clamp(stageWidth*.29,160,380);}
function cancelDrag(){
 if(!dragging)return;
 const pointer=dragging.pointer,moved=dragging.moved;dragging=null;document.body.classList.remove('is-dragging');
 if(moved){suppressClick=true;setTimeout(()=>suppressClick=false,120);}else suppressClick=false;
 if(stage.hasPointerCapture(pointer))stage.releasePointerCapture(pointer);
 rotateTo(Math.round(phase));
}
stage.addEventListener('pointerdown',e=>{
 if(dragging||e.isPrimary===false||e.button!==0||e.target.closest('#saveLook,#hotspot,#emptyState')||!orbitItems.length)return;
 if(frame){cancelAnimationFrame(frame);frame=0;}
 dragging={pointer:e.pointerId,x:e.clientX,y:e.clientY,start:phase,lastX:e.clientX,lastTime:e.timeStamp,velocity:0,moved:false,model:e.target.closest('.model')?.dataset.id};
 orbitVelocity=0;target=phase;suppressClick=false;
 stage.setPointerCapture(e.pointerId);document.body.classList.add('is-dragging');
});
stage.addEventListener('pointermove',e=>{
 if(!dragging||e.pointerId!==dragging.pointer||orbitItems.length<2)return;
 const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;
 if(!dragging.moved&&Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)*1.25){cancelDrag();return;}
 if(Math.abs(dx)>5){dragging.moved=true;suppressClick=true;}
 if(!dragging.moved)return;
 const samples=e.getCoalescedEvents?.()||[],sample=samples[samples.length-1]||e;
 const dt=Math.max(4,sample.timeStamp-dragging.lastTime)/1000;
 const instant=-(sample.clientX-dragging.lastX)/dragStep()/dt;
 dragging.velocity=dragging.velocity*.6+Orbit.clamp(instant,-12,12)*.4;
 dragging.lastX=sample.clientX;dragging.lastTime=sample.timeStamp;
 phase=dragging.start-dx/dragStep();target=phase;schedule();
});
function finishDrag(e){
 if(!dragging||e.pointerId!==dragging.pointer)return;
 const drag=dragging;dragging=null;document.body.classList.remove('is-dragging');
 if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
 if(drag.moved){
  // A pause before release cancels a stale fling.
  const speed=e.timeStamp-drag.lastTime>100?0:drag.velocity;
  orbitVelocity=Orbit.clamp(speed,-4,4);
  rotateTo(Orbit.releaseTarget(phase,speed,orbitItems.length));
  setTimeout(()=>suppressClick=false,120);
 }else{
  orbitVelocity=0;rotateTo(Math.round(phase));
  if(drag.model!==undefined){const id=Number(drag.model);if(selected===id)openDetail();else select(id);}
 }
}
stage.addEventListener('pointerup',finishDrag);
stage.addEventListener('pointercancel',cancelDrag);
stage.addEventListener('lostpointercapture',()=>{if(dragging)cancelDrag()});
let wheelTimer;
stage.addEventListener('wheel',e=>{
 if(Math.abs(e.deltaX)<Math.abs(e.deltaY)||Math.abs(e.deltaX)<1||orbitItems.length<2)return;
 e.preventDefault();if(dragging)return;
 phase+=e.deltaX/dragStep();target=phase;orbitVelocity=0;syncSelected();drawOrbit();
 clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>rotateTo(Math.round(phase)),140);
},{passive:false});
const orbitObserver=new ResizeObserver(()=>{measureOrbit();drawOrbit()});orbitObserver.observe(stage);
window.addEventListener('resize',()=>{$('#panelScrim').hidden=!detailOpen||innerWidth>700;});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;if(dragging)cancelDrag();}
 else{lastFrame=0;schedule();}
});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)rotateTo(target,true)});
updateCounts();render();

(function(){
  function zoomAt(view,factor,x,y){const z=Math.min(6,Math.max(.25,view.z*factor)),ratio=z/view.z;return {z,x:x-(x-view.x)*ratio,y:y-(y-view.y)*ratio}}
  if(typeof module!=='undefined'&&module.exports){module.exports={zoomAt};return}
  const viewport=document.getElementById('workspace'),paper=document.getElementById('paper'),readout=document.getElementById('zoomValue');const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');let displayed={z:1,x:0,y:0},motionFrame=null,lastTime=null;let view={z:1,x:0,y:0},baseWidth=800,drag=null,pointers=new Map(),pinch=null;
  // During a gesture only the compositor transform changes. Re-size the SVG once
  // at rest so the final view is rasterized at the selected resolution.
  let rasterWidth=0,settleTimer=0;
  function setRasterWidth(width){
    if(width===rasterWidth)return;
    rasterWidth=width;
    paper.style.setProperty('--paper-width',width+'px');
  }
  function paint(){
    const width=baseWidth*displayed.z;
    if(!rasterWidth)setRasterWidth(width);
    paper.style.transform=`translate(-50%,-50%) translate(${displayed.x}px,${displayed.y}px) scale(${width/rasterWidth})`;
    const value=Math.round(width/1600*100)+'%';
    if(readout.textContent!==value)readout.textContent=value;
  }
  function settle(){
    if(pointers.size||motionFrame!==null)return;
    setRasterWidth(baseWidth*displayed.z);
    paint();
    paper.style.willChange='';
  }
  function tick(now){
    motionFrame=null;
    const dt=lastTime===null?1/60:Math.min(.08,(now-lastTime)/1000);
    const direct=pointers.size||directFrame||reduced?.matches;
    directFrame=false;
    const weight=direct?1:-Math.expm1(-dt/.047);
    for(const key of ['x','y','z'])displayed[key]+=(view[key]-displayed[key])*weight;
    const error=Math.max(Math.abs(displayed.x-view.x),Math.abs(displayed.y-view.y),baseWidth*Math.abs(displayed.z-view.z));
    if(error>.15){lastTime=now;motionFrame=requestAnimationFrame(tick)}
    else {displayed={...view};lastTime=null;if(!pointers.size)settleTimer=setTimeout(settle,100)}
    paint();
  }
  let directFrame=false;
  function apply(){
    clearTimeout(settleTimer);
    if(paper.style.willChange!=='transform')paper.style.willChange='transform';
    if(motionFrame===null)motionFrame=requestAnimationFrame(tick);
  }
  function fittedWidth(){return Math.max(40,Math.min(1100,viewport.clientWidth-32,(viewport.clientHeight-32)*1600/(globalThis.cardHeight||1000)))}
  function fit(){baseWidth=fittedWidth();view={z:1,x:0,y:0};apply()}
  const exploreButton=document.getElementById('exploreView');
  let exploring=false;
  function setExploring(active){
    if(exploring===active)return;
    exploring=active;
    if(active)viewport.addEventListener('wheel',wheel,{passive:false});
    else viewport.removeEventListener('wheel',wheel);
    viewport.classList.toggle('exploring',active);
    exploreButton.setAttribute('aria-pressed',String(active));
    exploreButton.textContent=active?'Done':'Explore';
    viewport.setAttribute('aria-label',active?'Dedication preview. Scroll to zoom, drag to move. Press Escape to finish.':'Dedication preview');
    if(active){viewport.focus({preventScroll:true});return}
    const ids=[...pointers.keys()];
    pointers.clear();
    if(ids.length)apply();
    drag=pinch=null;
    viewport.classList.remove('dragging');
    for(const id of ids)if(viewport.hasPointerCapture(id))viewport.releasePointerCapture(id);
  }
  exploreButton.onclick=()=>setExploring(!exploring);
  function relative(x,y){const r=viewport.getBoundingClientRect();return {x:x-r.left-r.width/2,y:y-r.top-r.height/2}}
  new ResizeObserver(()=>{const width=fittedWidth();if(width!==baseWidth){baseWidth=width;apply()}}).observe(viewport);
  function wheel(e){
    if(e.metaKey)return;
    e.preventDefault();
    const p=relative(e.clientX,e.clientY), units=e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1;
    view=zoomAt(view,Math.exp(-e.deltaY*units*(e.ctrlKey?.008:.0015)),p.x,p.y);
    apply();
  }
  function pinchInfo(){let a=[...pointers.values()];return {distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2}}
  viewport.addEventListener('pointerdown',e=>{if(!exploring)return;if(e.pointerType==='mouse'&&e.button!==0&&e.button!==1)return;if(pointers.size>=2)return;if(!pointers.size)view={...displayed};e.preventDefault();viewport.focus({preventScroll:true});viewport.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY};viewport.classList.add('dragging');if(pointers.size===2)pinch=pinchInfo()});
  viewport.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){let current=pinchInfo();if(pinch&&pinch.distance>0){let p=relative(pinch.x,pinch.y);view=zoomAt(view,current.distance/pinch.distance,p.x,p.y);view.x+=current.x-pinch.x;view.y+=current.y-pinch.y}pinch=current}else if(drag){view.x+=e.clientX-drag.x;view.y+=e.clientY-drag.y}drag={x:e.clientX,y:e.clientY};directFrame=true;apply()});
  function end(e){if(!pointers.delete(e.pointerId))return;apply();pinch=null;drag=pointers.size?[...pointers.values()][0]:null;if(!pointers.size)viewport.classList.remove('dragging')}
  viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);viewport.addEventListener('lostpointercapture',end);viewport.addEventListener('dblclick',()=>{if(exploring)fit()});
  document.getElementById('zoomIn').onclick=()=>{view=zoomAt(view,1.25,0,0);apply()};document.getElementById('zoomOut').onclick=()=>{view=zoomAt(view,.8,0,0);apply()};document.getElementById('fitView').onclick=()=>{setExploring(false);fit()};
  window.addEventListener('rose:fit-paper',()=>{
    setExploring(false);
    fit();
    displayed={...view};
    paint();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&exploring){setExploring(false);exploreButton.focus({preventScroll:true})}
  });
  document.addEventListener('pointerdown',event=>{
    if(exploring&&!viewport.contains(event.target)&&!event.target.closest?.('.zoom-controls'))setExploring(false);
  });
  viewport.addEventListener('keydown',e=>{if(!exploring)return;if(e.key==='+'||e.key==='=')view=zoomAt(view,1.25,0,0);else if(e.key==='-')view=zoomAt(view,.8,0,0);else if(e.key==='0'||e.key==='Home'){fit();e.preventDefault();return}else if(e.key.startsWith('Arrow')){view.x+=e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0;view.y+=e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0}else return;e.preventDefault();apply()});
  const stem=document.getElementById('stem'),hex=document.getElementById('stemHex');stem.addEventListener('input',()=>hex.textContent=stem.value.toUpperCase());document.querySelectorAll('[data-stem]').forEach(button=>button.onclick=()=>{stem.value=button.dataset.stem;hex.textContent=stem.value.toUpperCase()});apply();
})();

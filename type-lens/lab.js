import {STORIES,secretInFocus,readDiscoveries,discoveryAnnouncement} from './story-model.mjs';
import {specimenLines,safeMagnification,lensRadius,DEFAULT_TEXT} from './lab-model.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const scene=$('#scene'),stone=$('#stone'),shadow=$('#lens-shadow'),light=$('#light');let lens=$('#optics');
const colours=[{name:'Clear',tint:[.92,.96,.92]},{name:'Aqua',tint:[.25,.82,.83]},{name:'Coral',tint:[1,.52,.39]},{name:'Pink',tint:[1,.32,.63]},{name:'Sun',tint:[1,.77,.32]}];
const themes={cream:{paper:'#fff0ce',ink:'#062d31',accent:'#ff2d87'},petrol:{paper:'#062d31',ink:'#fff0ce',accent:'#00bfc4'},coral:{paper:'#ff6848',ink:'#062d31',accent:'#fff0ce'}};
const fonts={archivo:{family:'Archivo Black',weight:400,tracking:-.055},barlow:{family:'Barlow Condensed',weight:800,tracking:-.025},mono:{family:'DM Mono',weight:500,tracking:-.045}};
let w=1,h=1,dpr=1,colour=0,theme='cream',font='archivo',magnification=1.5,diameter=260,x=0,y=0,tx=0,ty=0,r=130,targetR=130,vx=0,vy=0,dragging=false,down=null,dirty=true,texDirty=true,ready=false,lastTime=0,frame=0,started=false;
let tint=[...colours[0].tint],offset={x:0,y:0};
let mode='type',storyIndex=0,discoveryTimer=0,discoveryCandidate=null;const storyImages=new Map(),storyLoads=new Map();let discovered=new Set();try{discovered=new Set(readDiscoveries(localStorage.getItem('smartlab-type-lens-discoveries-v1')))}catch{}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const source=document.createElement('canvas'),ctx=source.getContext('2d'),bg=light.getContext('2d');
let gl=lens.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true}),program,texture,uniforms={};
const vertex=`attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;uniform vec2 resolution;uniform vec2 centre;uniform float radius;uniform sampler2D page;uniform vec3 tint;uniform vec2 velocity;uniform float magnification;uniform float reflectionFactor;
vec3 samplePage(vec2 p){return texture2D(page,vec2(p.x/resolution.x,p.y/resolution.y)).rgb;}
float pane(vec2 p,vec2 c,vec2 s){vec2 d=abs(p-c)-s;return 1.-smoothstep(-.014,.014,max(d.x,d.y));}
void main(){
 vec2 pixel=vec2(uv.x*resolution.x,(1.-uv.y)*resolution.y);vec2 q=(pixel-centre)/radius;float d=length(q);if(d>1.005)discard;
 float edge=smoothstep(.80,1.,d);float z=sqrt(max(0.,1.-d*d));
 float scale=1./magnification+.035*d*d+(1.-1./magnification-.05)*pow(d,8.);vec2 refracted=centre+q*radius*scale;
 vec2 dispersion=q*radius*.0025*pow(d,3.);vec3 image=vec3(samplePage(refracted+dispersion).r,samplePage(refracted).g,samplePage(refracted-dispersion).b);
 float thickness=pow(z,.6);image*=mix(vec3(1.),tint*.43+.57,.42+thickness*.25);
 image=mix(image,tint,thickness*.10);image*=1.-.22*pow(d,16.);
 vec2 reflection=vec2(q.x*.86+q.y*.28,-q.x*.22+q.y*.9)+velocity*.0005;
 vec2 bend=reflection/(.65+z*.60);
 float window=0.;
 window+=pane(bend,vec2(-.31,-.40),vec2(.125,.15));window+=pane(bend,vec2(-.035,-.40),vec2(.125,.15));
 window+=pane(bend,vec2(-.31,-.07),vec2(.125,.15));window+=pane(bend,vec2(-.035,-.07),vec2(.125,.15));
 float reflectionStrength=(.39+.20*pow(d,2.))*reflectionFactor;image=mix(image,vec3(.995,.993,.97),min(window,1.)*reflectionStrength);
 float arc=exp(-pow((d-.91)/.035,2.))*smoothstep(.05,.8,q.x+q.y)*.64;
 float broad=exp(-pow((d-.79)/.11,2.))*smoothstep(.4,1.,q.x+q.y)*.22;
 image=mix(image,vec3(1.),arc+broad);
 float fresnel=pow(d,25.);image=mix(image,vec3(.25,.29,.24),fresnel*.32);
 float rim=exp(-pow((d-.974)/.009,2.));image+=rim*.34*smoothstep(-.6,.8,-q.x-q.y);
 image+=exp(-pow((d-.995)/.004,2.))*.16;
 float alpha=1.-smoothstep(.995,1.005,d);gl_FragColor=vec4(image,alpha);
}`;
function initGL(){if(!gl)return false;try{const shader=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Optics unavailable');gl.useProgram(program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);let a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);['resolution','centre','radius','tint','velocity','magnification','reflectionFactor'].forEach(k=>uniforms[k]=gl.getUniformLocation(program,k));return true}catch(e){console.warn(e);return false}}
ready=initGL();
const cpuCanvas=document.createElement('canvas');cpuCanvas.id='cpu-optics';cpuCanvas.setAttribute('aria-hidden','true');lens.after(cpuCanvas);cpuCanvas.hidden=ready;lens.hidden=!ready;
const cpu=cpuCanvas.getContext('2d'),tile=document.createElement('canvas'),tc=tile.getContext('2d');
let sourcePixels=null,map=null,mapKey='',out=null;
function renderCPU(){
 const quality=Math.min(dpr,1.5),n=Math.ceil(r*2*quality),key=mode+':'+n+':'+magnification+':'+tint.map(v=>v.toFixed(2)).join(',');
 if(key!==mapKey){
 mapKey=key;tile.width=tile.height=n;out=tc.createImageData(n,n);map=new Float32Array(n*n*5);
 const smooth=(a,b,v)=>{let t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  let k=(j*n+i)*5,qx=(i+.5)/n*2-1,qy=(j+.5)/n*2-1,d=Math.hypot(qx,qy);if(d>1){map[k+4]=-1;continue}
  let z=Math.sqrt(1-d*d),scale=1/magnification+.035*d*d+(1-1/magnification-.05)*Math.pow(d,8),thick=Math.pow(z,.6);
  map[k]=qx*scale;map[k+1]=qy*scale;
  let bx=(qx*.86+qy*.28)/(.65+z*.60),by=(-qx*.22+qy*.9)/(.65+z*.60);
  let window=0;for(const xx of [-.31,-.035])for(const yy of [-.40,-.07])window+=1-smooth(-.014,.014,Math.max(Math.abs(bx-xx)-.125,Math.abs(by-yy)-.15));
  const reflect=Math.min(window,1)*(.39+.20*d*d)*(mode==='stories'?.55:1);
  const arc=Math.exp(-Math.pow((d-.91)/.035,2))*smooth(.05,.8,qx+qy)*.64;
  const broad=Math.exp(-Math.pow((d-.79)/.11,2))*smooth(.4,1,qx+qy)*.22;
  const fresnel=Math.pow(d,25)*.32;
  const rim=Math.exp(-Math.pow((d-.974)/.009,2))*.34*smooth(-.6,.8,-qx-qy)+Math.exp(-Math.pow((d-.995)/.004,2))*.16;
  map[k+2]=(1-reflect)*(1-arc-broad)*(1-fresnel)*(1-.22*Math.pow(d,16));
  map[k+3]=(reflect*(1-arc-broad)*(1-fresnel)+arc+broad+fresnel*.26+rim)*255;
  map[k+4]=thick;
 }
 }
 const data=sourcePixels,sw=source.width,sh=source.height,p=out.data;
 for(let i=0;i<n*n;i++){
  const k=i*5,o=i*4,thick=map[k+4];if(thick<0){p[o+3]=0;continue}
  const sx=clamp((x+map[k]*r)*dpr,0,sw-2),sy=clamp((y+map[k+1]*r)*dpr,0,sh-2),ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,s=(iy*sw+ix)*4;
  const mult=map[k+2],add=map[k+3];
  for(let c=0;c<3;c++){const factor=1-(1-tint[c])*.43*(.42+thick*.25);const sample=(data[s+c]*(1-fx)+data[s+4+c]*fx)*(1-fy)+(data[s+sw*4+c]*(1-fx)+data[s+sw*4+4+c]*fx)*fy;p[o+c]=(sample*factor*(1-thick*.10)+tint[c]*255*thick*.10)*mult+add}
  p[o+3]=255;
 }
 tc.putImageData(out,0,0);cpu.clearRect(0,0,cpuCanvas.width,cpuCanvas.height);cpu.drawImage(tile,(x-r)*dpr,(y-r)*dpr,r*2*dpr,r*2*dpr);
}

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rgb(hex){return hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16))}
function local(px,py){const b=scene.getBoundingClientRect();return{x:px-b.left,y:py-b.top}}
function bounds(el){const b=el.getBoundingClientRect(),s=scene.getBoundingClientRect();return{x:b.left-s.left,y:b.top-s.top,width:b.width,height:b.height}}
function invalidate(texture=false){dirty=true;if(texture)texDirty=true;if(started&&!frame)frame=requestAnimationFrame(render)}
function home(){if(mode==='stories')return{x:w*.42,y:h*.55};const b=bounds($('#specimen'));return{x:b.x+b.width*.62,y:b.y+b.height*.53}}
function fitSpecimen(){
 const el=$('#specimen'),f=fonts[font],maxWidth=el.clientWidth;let fs=clamp(w*.175,45,192);
 el.style.fontFamily=`'${f.family}',sans-serif`;el.style.fontWeight=f.weight;el.style.letterSpacing=f.tracking+'em';el.style.fontSize=fs+'px';
 for(let n=0;n<3;n++){const widths=[...el.children].map(line=>{const range=document.createRange();range.selectNodeContents(line);const width=range.getBoundingClientRect().width;range.detach();return width});const width=Math.max(...widths,1);if(width<=maxWidth)break;fs*=maxWidth/width;el.style.fontSize=Math.max(1,fs)+'px'}
}
function updateText(){const lines=specimenLines($('#text-input').value),el=$('#specimen');el.replaceChildren(...lines.map(line=>{const span=document.createElement('span');span.textContent=line||' ';return span}));el.setAttribute('aria-label',lines.join(' '));$('#text-count').textContent=($('#text-input').value.trim()?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(lines.join(''))].length:0)+' / 48';fitSpecimen();invalidate(true)}
function resize(){const oldW=w,oldH=h;w=scene.clientWidth;h=scene.clientHeight;dpr=Math.min(devicePixelRatio||1,2);[lens,cpuCanvas,light,source].forEach(c=>{c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)});bg.setTransform(dpr,0,0,dpr,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);if(ready)gl.viewport(0,0,lens.width,lens.height);const maxDiameter=Math.min(360,Math.floor((Math.min(w,h)-20)/10)*10);if(oldW===1&&w<500)diameter=180;diameter=Math.min(diameter,maxDiameter);$('#diameter').max=maxDiameter;$('#diameter').value=diameter;$('#diameter-value').textContent=diameter+' px';if(mode==='type')fitSpecimen();targetR=lensRadius(diameter,w,h);r=targetR;const p=oldW===1?home():{x:tx/oldW*w,y:ty/oldH*h};const margin=mode==='stories'?r*.28:r+6;x=tx=clamp(p.x,margin,w-margin);y=ty=clamp(p.y,margin,h-margin);invalidate(true)}
function paintLight(c){
 if(mode==='stories'){c.clearRect(0,0,w,h);c.fillStyle='#062d31';c.fillRect(0,0,w,h);const image=storyImages.get(STORIES[storyIndex].id);if(image)c.drawImage(image,0,0,w,h);return}
 c.clearRect(0,0,w,h);c.fillStyle=themes[theme].paper;c.fillRect(0,0,w,h);c.save();c.translate(w*.28,h*.10);c.transform(1,.18,.25,1,0,0);c.filter=`blur(${Math.max(4,w*.008)}px)`;const pw=w*.21,ph=h*.36,gap=w*.014;c.fillStyle=theme==='petrol'?'#fff0ce09':'#ffffff30';c.fillRect(-pw,-ph*.08,pw,ph);c.fillRect(gap,-ph*.08,pw,ph);c.fillStyle=theme==='petrol'?'#fff0ce06':'#ffffff23';c.fillRect(-pw,ph+gap,pw,ph*.65);c.fillRect(gap,ph+gap,pw,ph*.65);c.restore();
}
function snapshot(){paintLight(bg);ctx.clearRect(0,0,w,h);ctx.drawImage(light,0,0,w,h);if(mode==='stories'){drawSecret(ctx);uploadSnapshot();return}const s=scene.getBoundingClientRect(),bottom=bounds($('.artboard-bottom'));ctx.fillStyle=themes[theme].ink+'3d';ctx.fillRect(bottom.x,bottom.y,bottom.width,1);
 const walker=document.createTreeWalker(scene,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.textContent.trim()&&n.parentElement.closest('#specimen,[data-snapshot],.artboard-top')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});let node;
 while(node=walker.nextNode()){
  const el=node.parentElement,cs=getComputedStyle(el);if(!el.getClientRects().length||cs.display==='none')continue;
  ctx.font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;ctx.fillStyle=cs.color;ctx.textBaseline='alphabetic';if('letterSpacing'in ctx)ctx.letterSpacing=cs.letterSpacing==='normal'?'0px':cs.letterSpacing;
  const text=node.textContent,range=document.createRange();let line='',left=0,top=0,prevTop=-999;const metric=ctx.measureText('Hg'),ascent=metric.fontBoundingBoxAscent||parseFloat(cs.fontSize)*.88;
  const flush=()=>{if(line)ctx.fillText(line,left-s.left,top-s.top+ascent)};
  for(const part of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)){range.setStart(node,part.index);range.setEnd(node,part.index+part.segment.length);const b=range.getBoundingClientRect();if(!b.width&&!b.height)continue;if(Math.abs(b.top-prevTop)>2){flush();line='';left=b.left;top=b.top;prevTop=b.top}else left=Math.min(left,b.left);line+=part.segment}flush();range.detach();
 }
 uploadSnapshot();
}
function uploadSnapshot(){if(ready){gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source)}else sourcePixels=ctx.getImageData(0,0,source.width,source.height).data;
 texDirty=false;
}
function render(t){frame=0;const dt=Math.min((t-lastTime)/16.667||1,3);lastTime=t;let active=false;
 const follow=reduced?1:1-Math.pow(dragging?.50:.80,dt),dx=tx-x,dy=ty-y;vx=dx*follow;vy=dy*follow;
 if(Math.abs(dx)+Math.abs(dy)>.08){x+=vx;y+=vy;active=true}else{x=tx;y=ty;vx=vy=0}
 if(Math.abs(r-targetR)>.1){r+=(targetR-r)*(reduced?1:Math.min(1,.16*dt));active=true}else r=targetR;
 for(let i=0;i<3;i++){const target=colours[colour].tint[i];if(Math.abs(tint[i]-target)>.001){tint[i]+=(target-tint[i])*(reduced?1:Math.min(1,.15*dt));active=true}else tint[i]=target}
 if(texDirty){snapshot();dirty=true}
 if(active||dirty){
 stone.style.width=stone.style.height=r*2+'px';stone.style.transform=`translate(${x-r}px,${y-r}px)`;shadow.style.width=shadow.style.height=r*1.86+'px';shadow.style.transform=`translate(${x-r*.92+8}px,${y-r*.88+22}px) scaleY(.94)`;
 if(ready){gl.useProgram(program);gl.uniform2f(uniforms.resolution,w,h);gl.uniform2f(uniforms.centre,x,y);gl.uniform1f(uniforms.radius,r);gl.uniform1f(uniforms.magnification,magnification);gl.uniform1f(uniforms.reflectionFactor,mode==='stories'?.55:1);gl.uniform3fv(uniforms.tint,tint);gl.uniform2f(uniforms.velocity,vx,vy);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6)}else if(sourcePixels&&cpu){renderCPU()}
 dirty=false;
 }
 checkDiscovery();if(active)frame=requestAnimationFrame(render)
}
function move(px,py){const margin=mode==='stories'?targetR*.28:targetR+5;tx=clamp(px,margin,w-margin);ty=clamp(py,margin,h-margin);invalidate()}
stone.addEventListener('pointerdown',e=>{const p=local(e.clientX,e.clientY);dragging=true;offset={x:p.x-x,y:p.y-y};stone.setPointerCapture(e.pointerId);e.preventDefault()});
stone.addEventListener('pointermove',e=>{if(!dragging)return;const p=local(e.clientX,e.clientY);move(p.x-offset.x,p.y-offset.y)});
const release=()=>{dragging=false;invalidate()};stone.addEventListener('pointerup',release);stone.addEventListener('pointercancel',release);stone.addEventListener('lostpointercapture',release);
scene.addEventListener('pointerdown',e=>{if(!e.target.closest('button,a'))down={x:e.clientX,y:e.clientY}});scene.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<8){const p=local(e.clientX,e.clientY);move(p.x,p.y)}down=null});
stone.addEventListener('keydown',e=>{const step=e.shiftKey?50:16,keys={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};if(keys[e.key]){e.preventDefault();move(tx+keys[e.key][0],ty+keys[e.key][1])}if(e.key==='Home'){e.preventDefault();const p=home();move(p.x,p.y)}});
$('#text-input').addEventListener('input',e=>{if(!e.isComposing)updateText()});$('#text-input').addEventListener('compositionend',updateText);
$$('[data-font]').forEach(b=>b.onclick=()=>{font=b.dataset.font;$$('[data-font]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));fitSpecimen();invalidate(true)});
$$('.swatch').forEach(b=>b.onclick=()=>{colour=+b.dataset.colour;$$('.swatch').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));$('#glass-name').textContent=colours[colour].name;invalidate()});
$$('.theme-options button').forEach(b=>b.onclick=()=>{theme=b.dataset.theme;scene.dataset.theme=theme;$$('.theme-options button').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));invalidate(true)});
$('#magnify').oninput=e=>{magnification=safeMagnification(e.target.value);$('#magnify-value').textContent=magnification.toFixed(1)+'×';invalidate()};
$('#diameter').oninput=e=>{diameter=Number(e.target.value);$('#diameter-value').textContent=diameter+' px';targetR=lensRadius(diameter,w,h);move(tx,ty)};
$('#reset').onclick=()=>{font='archivo';colour=0;theme='cream';magnification=1.5;diameter=w<500?180:260;scene.dataset.theme=theme;$('#text-input').value=DEFAULT_TEXT;$('#magnify').value='1.5';$('#magnify-value').textContent='1.5×';$('#diameter').value=diameter;$('#diameter-value').textContent=diameter+' px';$('#glass-name').textContent='Clear';$$('[data-font]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.font===font)));$$('.swatch').forEach(el=>el.setAttribute('aria-pressed',String(+el.dataset.colour===colour)));$$('.theme-options button').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.theme===theme)));updateText();targetR=lensRadius(diameter,w,h);const p=home();move(p.x,p.y);invalidate(true)};
const help=$('#help-dialog');$('#help').onclick=()=>help.showModal();$('#close-help').onclick=()=>help.close();help.onclick=e=>{if(e.target===help){const b=help.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)help.close()}};
lens.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;lens.hidden=true;cpuCanvas.hidden=false;invalidate(true)});lens.addEventListener('webglcontextrestored',()=>{ready=initGL();lens.hidden=!ready;cpuCanvas.hidden=ready;invalidate(true)});
await document.fonts.ready;started=true;updateText();resize();new ResizeObserver(()=>resize()).observe(scene);updateDiscoveries();
function drawSecret(c){const story=STORIES[storyIndex];if(!storyImages.has(story.id))return;c.save();c.translate(story.target.x*w,story.target.y*h);c.rotate(story.rotation);c.textAlign='center';c.textBaseline='middle';if('letterSpacing'in c)c.letterSpacing='0px';const fs=w*story.fontScale;c.font=`400 ${fs}px 'Archivo Black',sans-serif`;c.fillStyle=story.ink;story.message.forEach((line,i)=>c.fillText(line,0,(i-(story.message.length-1)/2)*fs*1.06));c.restore()}
function cancelDiscovery(){clearTimeout(discoveryTimer);discoveryTimer=0;discoveryCandidate=null}
function saveDiscoveries(){try{localStorage.setItem('smartlab-type-lens-discoveries-v1',JSON.stringify([...discovered]))}catch{}}
function updateDiscoveries(){
 $('#discovery-count').textContent=discovered.size+' / '+STORIES.length;
 $$('.story-choice').forEach(b=>{const found=discovered.has(b.dataset.story);b.querySelector('.discovery-mark').textContent=found?'✓':'○';b.setAttribute('aria-label',STORIES.find(s=>s.id===b.dataset.story).name+(found?', messaggio scoperto':''))});
 const story=STORIES[storyIndex];$('#story-live').textContent=discoveryAnnouncement(story,discovered);
}
function checkDiscovery(){
 const story=STORIES[storyIndex];if(mode!=='stories'||!storyImages.has(story.id)||discovered.has(story.id)||!secretInFocus({x,y},{x:story.target.x*w,y:story.target.y*h},r)){cancelDiscovery();return}
 if(discoveryCandidate===story.id)return;cancelDiscovery();discoveryCandidate=story.id;
 discoveryTimer=setTimeout(()=>{discoveryTimer=0;discoveryCandidate=null;if(mode!=='stories'||STORIES[storyIndex].id!==story.id||!secretInFocus({x,y},{x:story.target.x*w,y:story.target.y*h},r))return;discovered.add(story.id);saveDiscoveries();updateDiscoveries()},650);
}
async function loadStory(index){
 const story=STORIES[index];if(!storyLoads.has(story.id))storyLoads.set(story.id,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{storyImages.set(story.id,image);resolve(image)};image.onerror=()=>{storyLoads.delete(story.id);reject(new Error('Scena non disponibile'))};image.src=story.src}));
 if(mode==='stories'&&storyIndex===index){$('#story-status').textContent='Caricamento della scena…';$('#story-status').classList.remove('error');$('#story-status').hidden=false}
 try{const image=await storyLoads.get(story.id);if(mode==='stories'&&storyIndex===index){scene.style.setProperty('--story-ratio',image.naturalWidth/image.naturalHeight);$('#story-status').hidden=true;resize();invalidate(true)}}catch{if(mode==='stories'&&storyIndex===index){$('#story-status').textContent='La scena non si è caricata. Selezionala di nuovo per riprovare.';$('#story-status').classList.add('error');$('#story-status').hidden=false}}
}
function selectStory(index){cancelDiscovery();storyIndex=index;const story=STORIES[index];$$('.story-choice').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.story===story.id)));scene.setAttribute('aria-label',story.name+'. '+story.description);$('#hint').setAttribute('aria-expanded','false');$('#hint-text').hidden=true;$('#hint-text').textContent=story.hint;updateDiscoveries();const p=home();move(p.x,p.y);loadStory(index);invalidate(true)}
let storiesVisited=false;
function switchMode(next){
 if(next===mode)return;cancelDiscovery();mode=next;document.body.dataset.mode=mode;
 $$('[data-type-only]').forEach(el=>el.hidden=mode==='stories');$('.story-controls').hidden=mode!=='stories';
 $$('.experience-switch [role=tab]').forEach(b=>{const selected=b.dataset.mode===mode;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1});$('#lab-panel').setAttribute('aria-labelledby',mode==='type'?'type-tab':'stories-tab');
 $('#panel-title').textContent=mode==='type'?'Fai spazio alle idee.':'Ogni scena, un segreto.';$('#reset').setAttribute('aria-label',mode==='type'?'Ripristina esperimento':'Ricomincia le scoperte');$('#reset').title=mode==='type'?'Ripristina tutti i valori':'Azzera le scoperte e ricomincia';
 if(mode==='stories'){
  if(!storiesVisited){storiesVisited=true;diameter=scene.clientWidth<500?160:240;magnification=1.8;$('#magnify').value=magnification;$('#magnify-value').textContent='1.8×'}
  selectStory(storyIndex);
 }else{scene.setAttribute('aria-label','Tavola tipografica interattiva');$('#story-status').hidden=true}
 resize();const p=home();move(p.x,p.y);invalidate(true);
}
$$('.experience-switch [role=tab]').forEach(b=>{b.onclick=()=>switchMode(b.dataset.mode);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'type':e.key==='End'?'stories':mode==='type'?'stories':'type';switchMode(next);$('#'+(next==='type'?'type-tab':'stories-tab')).focus()}}});
$$('.story-choice').forEach(b=>b.onclick=()=>selectStory(STORIES.findIndex(story=>story.id===b.dataset.story)));
$('#hint').onclick=()=>{const expanded=$('#hint').getAttribute('aria-expanded')==='true';$('#hint').setAttribute('aria-expanded',String(!expanded));$('#hint-text').textContent=STORIES[storyIndex].hint;$('#hint-text').hidden=expanded};
const resetType=$('#reset').onclick;$('#reset').onclick=()=>{if(mode==='type'){resetType();return}cancelDiscovery();discovered.clear();saveDiscoveries();diameter=w<500?160:240;magnification=1.8;$('#magnify').value=magnification;$('#magnify-value').textContent='1.8×';colour=0;$$('.swatch').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.colour===0)));$('#glass-name').textContent='Clear';resize();selectStory(0);invalidate(true)};
// A shareable entry point opens the image use case directly.
if(location.hash==='#stories')switchMode('stories');

addEventListener('hashchange',()=>{if(location.hash==='#stories')switchMode('stories');else if(location.hash==='#type')switchMode('type')});

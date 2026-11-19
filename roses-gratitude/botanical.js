
let transparent=false;const $=id=>document.getElementById(id),canvas=$('canvas');const metrics=document.createElement('canvas').getContext('2d'),scene=new SVGScene(canvas,metrics),NativePath=globalThis.Path2D;let ctx=scene,Path2D=SVGPath;const uploadedFonts=new Map();let seed=3485,start=performance.now(),raf;const ids=['text','font','size','flower','style','density','bloomSize','petal','stem','leaf','ink','bg','motion','speed','wind','habit','leafShape','foliage'];function randFactory(s){const initial=s;const random=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};random.seed=initial;return random}function ellipse(x,y,rx,ry,rot,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),rot,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}function tint(hex,amount){let n=parseInt(hex.slice(1),16);return '#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(amount>0?v+(255-v)*amount:v*(1+amount)).toString(16).padStart(2,'0')).join('')}
// Each whorl has fixed geometry. Opening changes only its local transform.
function roseWhorl(layer, seed, color, line) {
  const random = randFactory(seed + layer * 7919);
  const count = [7, 5, 3][layer], radius = [1, .69, .38][layer];
  const offset = layer * 2.4 + random() * .48;
  for (let i = 0; i < count; i++) {
    const width = radius * (.54 + random() * .13 + layer * .055);
    const height = radius * (.91 + random() * .13);
    const curl = .08 + random() * .14;
    ctx.save();
    ctx.rotate(offset + i * 2 * Math.PI / count + (random() - .5) * .2);
    ctx.scale(width, height);
    const cup = new Path2D();
    cup.moveTo(-.35,-.13);
    cup.bezierCurveTo(-.99,-.32,-1.17,-.74,-.71,-.91);
    cup.bezierCurveTo(-.33,-1.09,-.02,-.91,.34,-1);
    cup.bezierCurveTo(.88,-1.1,1.07,-.8,.88,-.54);
    cup.bezierCurveTo(.65,-.27,.13,-.26,-.35,-.13);
    cup.closePath();
    if (!line) {
      const velvet = ctx.createLinearGradient(-.35,-1,.22,-.22);
      velvet.addColorStop(0,tint(color,.26-layer*.045));
      velvet.addColorStop(.32,tint(color,.04-layer*.05));
      velvet.addColorStop(.78,tint(color,-.21-layer*.07));
      velvet.addColorStop(1,tint(color,-.49));
      ctx.fillStyle=velvet;
      ctx.fill(cup);
    }
    ctx.strokeStyle=tint(color,line?-.36:-.27);
    ctx.lineWidth=line?.021:.009;
    ctx.stroke(cup);
    const lip = new Path2D();
    lip.moveTo(-.71,-.91);
    lip.bezierCurveTo(-.33,-1.09,-.02,-.91,.34,-1);
    lip.bezierCurveTo(.63,-1.05,.8,-.99,.89,-.89);
    lip.bezierCurveTo(.54,-1.03,.12,-.91+curl,-.29,-.94+curl*.4);
    lip.quadraticCurveTo(-.58,-.97,-.71,-.91);
    if(line){ctx.lineWidth=.011;ctx.stroke(lip)}
    else {ctx.fillStyle=tint(color,.32-layer*.055);ctx.fill(lip)}
    ctx.restore();
  }
  if(layer===2){
    const heart=new Path2D();
    heart.moveTo(-.11,.03);
    heart.bezierCurveTo(-.15,-.08,-.03,-.15,.075,-.096);
    heart.bezierCurveTo(.17,-.032,.085,.096,-.018,.081);
    heart.bezierCurveTo(-.09,.067,-.085,-.021,-.019,-.036);
    heart.quadraticCurveTo(.044,-.048,.036,.008);
    ctx.strokeStyle=tint(color,-.52);ctx.lineWidth=.024;
    if(!line){ctx.fillStyle=tint(color,-.24);ctx.fill(heart)}
    ctx.stroke(heart);
  }
}
function flower(x,y,r,type,rnd,progress,phase,color) {
  if(progress<=0)return;
  const photo=type==='rose' && globalThis.photoRoseSource?.();
  if(type!=='rose') {
    if(!ctx.symbol)return drawFlower(x,y,r,type,rnd,progress,phase,color);
    ctx.save();ctx.translate(x,y);ctx.rotate(type==='tulip'?Math.sin(phase)*.25:phase);ctx.scale(progress,progress);
    ctx.symbol([rnd.seed,r,type,color,$('style').value].join('|'),()=>drawFlower(0,0,r,type,rnd,1,0,color));
    ctx.restore();return;
  }
  const opening=easeGrowth(progress), line=$('style').value==='line';
  ctx.save();ctx.translate(x,y);
  ctx.rotate((photo?Math.sin(phase)*.32:phase)+(1-opening)*.16);
  if(photo && ctx.add) {
    ctx.scale(r*2*opening*(.68+.32*opening),r*2*opening);
    ctx.add('<use href="#catalog-flower" xlink:href="#catalog-flower" transform="'+ctx.matrix()+'"/>');
  } else {
    ctx.scale(r,r*(.84+.13*Math.abs(Math.sin(phase))));
    for(let layer=0;layer<3;layer++) {
      const spread=easeGrowth((progress-layer*.1)/(1-layer*.1));
      if(!spread)continue;
      ctx.save();
      ctx.rotate((1-spread)*(.22-layer*.18));
      ctx.scale(spread*(.54+.46*spread),spread);
      const paint=()=>roseWhorl(layer,rnd.seed,color,line);
      if(ctx.symbol)ctx.symbol(['whorl',rnd.seed,layer,color,line].join('|'),paint);
      else paint();
      ctx.restore();
    }
  }
  ctx.restore();
}
function drawFlower(x,y,r,type,rnd,progress,phase,color){if(progress<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(type==='tulip'?Math.sin(phase)*.25:phase);ctx.scale(progress,progress*(.75+rnd()*.25));let line=$('style').value==='line';ctx.lineWidth=.65;ctx.lineJoin='round';
function finish(path,shade=0){ctx.strokeStyle=petalEdge(color);if(!line){let g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,tint(color,Math.min(.8,.35+shade)));g.addColorStop(.5,tint(color,shade));g.addColorStop(1,tint(color,-.38+shade*.3));ctx.fillStyle=g;ctx.fill(path)}ctx.stroke(path)}
if(type==='blossom'){
// Five broad overlapping petals; each has an independent outline and throat shading.
const petalCount=5,offset=rnd()*.4;for(let i=0;i<petalCount;i++){ctx.save();ctx.rotate(offset+i*Math.PI*2/5+(rnd()-.5)*.1);let length=r*(.9+rnd()*.16),w=r*(.57+rnd()*.09),tip=rnd()*.05;let path=new Path2D();path.moveTo(-r*.055,r*.08);path.bezierCurveTo(-w*.66,-length*.12,-w*1.12,-length*.53,-w*.72,-length*.86);path.bezierCurveTo(-w*.44,-length*1.09,-w*.04,-length*1.04,0,-length*(.96-tip));path.bezierCurveTo(w*.36,-length*1.12,w*.85,-length*.91,w*.89,-length*.64);path.bezierCurveTo(w*1.01,-length*.33,w*.37,-length*.04,r*.05,r*.08);path.closePath();if(!line){let gradient=ctx.createRadialGradient(0,0,r*.04,0,-r*.12,r*1.13);gradient.addColorStop(0,tint(color,-.12));gradient.addColorStop(.18,'#f63691');gradient.addColorStop(.56,color);gradient.addColorStop(1,tint(color,.3));ctx.fillStyle=gradient;ctx.fill(path)}ctx.strokeStyle=petalEdge(color);ctx.lineWidth=Math.max(.65,r*.009);ctx.stroke(path);
// Fine, slightly irregular veins radiate from the throat into each petal.
ctx.save();ctx.clip(path);for(let v=-2;v<=2;v++){let destination=v*w*.25;ctx.beginPath();ctx.moveTo(v*r*.018,-r*.03);ctx.bezierCurveTo(destination*.25,-length*.2,destination*.7,-length*.55,destination,-length*(.77+rnd()*.1));ctx.strokeStyle=line?tint(color,-.24):tint(color,-.1)+'55';ctx.lineWidth=Math.max(.45,r*.006);ctx.stroke();ctx.beginPath();ctx.moveTo(v*r*.018+r*.008,-r*.05);ctx.quadraticCurveTo(destination*.4,-length*.4,destination+r*.008,-length*.79);ctx.strokeStyle=line?'transparent':'#ffffff22';ctx.lineWidth=Math.max(.4,r*.008);ctx.stroke()}ctx.restore();ctx.restore()}
// Filaments remain light, with warm golden anthers at varied radii.
let n=13+Math.floor(rnd()*5);for(let i=0;i<n;i++){let a=i*6.28/n+rnd()*.13,len=r*(.36+rnd()*.23),ex=Math.cos(a)*len,ey=Math.sin(a)*len;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(ex*.42-r*.025,ey*.5,ex,ey);ctx.strokeStyle=line?tint(color,-.38):'#f9a7b0';ctx.lineWidth=Math.max(.7,r*.011);ctx.stroke();ellipse(ex,ey,r*.025,r*.034,a,line?null:'#efb133',line?tint(color,-.38):null)}ellipse(0,0,r*.038,r*.038,0,line?null:'#e8a32e',null);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(r*.04,-r*.12,r*.01,-r*.17);ctx.strokeStyle='#f4b6cf';ctx.lineWidth=r*.017;ctx.stroke();ellipse(r*.01,-r*.17,r*.018,r*.024,0,line?null:'#ffd1e5',null);
}else if(type==='tulip'){// Six tepals in two whorls: three rear, three cupped in front.
ctx.translate(0,-r*.18);for(let i=0;i<6;i++){let front=i>=3,k=i%3,px=(k-1)*r*.36,top=-r*(.75+rnd()*.35),w=r*(.38+rnd()*.11);let path=new Path2D();path.moveTo(0,r*.68);path.bezierCurveTo(px-w*1.2,r*.4,px-w,top+r*.14,px,top);path.bezierCurveTo(px+w,top+r*.09,px+w*1.15,r*.38,0,r*.68);finish(path,front?.06:-.14);ctx.strokeStyle=tint(color,.42);ctx.lineWidth=.7;for(let v=-1;v<=1;v++){ctx.beginPath();ctx.moveTo(0,r*.63);ctx.quadraticCurveTo(px+v*w*.6,-r*.1,px+v*w*.4,top+r*.18);ctx.stroke()}}
}else{let daisy=type==='daisy',n=daisy?24+Math.floor(rnd()*9):8,offset=rnd()*.4;for(let i=0;i<n;i++){ctx.save();ctx.rotate(offset+i*6.28/n+(rnd()-.5)*.08);let len=r*(.82+rnd()*.22),w=r*(daisy?.10+rnd()*.035:.31+rnd()*.07);let path=new Path2D();path.moveTo(-w*.26,-r*.14);path.bezierCurveTo(-w,-len*.55,-w,-len*.92,-w*.55,-len);if(daisy){path.quadraticCurveTo(0,-len*1.05,w*.55,-len)}else{for(let k=0;k<4;k++)path.lineTo(-w*.55+w*1.1*(k+1)/4,-len+(k%2?r*.035:-r*.04))}path.bezierCurveTo(w,-len*.8,w,-len*.44,w*.26,-r*.14);path.closePath();finish(path,(rnd()-.5)*.15);ctx.strokeStyle=tint(color,-.18);ctx.lineWidth=.45;for(let v=-1;v<=1;v++){ctx.beginPath();ctx.moveTo(0,-r*.22);ctx.quadraticCurveTo(v*w*.45,-len*.6,v*w*.55,-len*.89);ctx.stroke()}ctx.restore()}let cr=r*(daisy?.24:.22);ellipse(0,0,cr,cr,0,line?null:'#b47d17',line?color:null);for(let i=0;i<125;i++){let a=i*2.399963,rr=cr*Math.sqrt(i/125);ellipse(Math.cos(a)*rr,Math.sin(a)*rr,cr*.075,cr*.055,a,line?null:(i%3?'#efbc3d':'#ffe281'),line?color:'#a67a25')}}ctx.restore()}
const profiles=new Map();function glyphProfile(char,font,size,advance){const fs=240,w=advance*fs/size,key=char+font;const scale=size/fs;const scaleProfile=rows=>rows.map(([a,b])=>[a*scale,b*scale]);if(profiles.has(key))return scaleProfile(profiles.get(key));let c=document.createElement('canvas');c.width=Math.ceil(w+50);c.height=Math.ceil(fs*1.5);let g=c.getContext('2d',{willReadFrequently:true});g.font=fs+'px '+font;g.fillText(char,25,fs);let d=g.getImageData(0,0,c.width,c.height).data,rows=[];for(let i=0;i<60;i++){let yy=Math.round(fs*.27+fs*.73*i/59),lo=c.width,hi=0;for(let xx=0;xx<c.width;xx++)if(d[(yy*c.width+xx)*4+3]>80){lo=Math.min(lo,xx);hi=xx}rows.push(hi?[(lo-25),(hi-25)]:[w*.35,w*.65])}let smooth=rows.map((v,i)=>{let nearby=rows.slice(Math.max(0,i-3),Math.min(rows.length,i+4));return [0,1].map(k=>nearby.reduce((a,b)=>a+b[k],0)/nearby.length)});if(profiles.size>=256)profiles.delete(profiles.keys().next().value);profiles.set(key,smooth);return scaleProfile(smooth)}
// Each letter owns its seed and clock; edits preserve unchanged prefix/suffix entities.
let serial=0,letters=[];
function syncLetters(text,now){const next=Array.from(text),old=letters;let prefix=0,suffix=0;while(prefix<old.length&&prefix<next.length&&old[prefix].char===next[prefix])prefix++;while(suffix<old.length-prefix&&suffix<next.length-prefix&&old[old.length-1-suffix].char===next[next.length-1-suffix])suffix++;letters=next.map((char,i)=>i<prefix?old[i]:i>=next.length-suffix?old[old.length-next.length+i]:{char,id:++serial,born:now,seed:(seed+Math.imul(serial,2654435761))>>>0});return letters}
const naturalPalettes={blossom:['#ef83c5','#f5b1d6','#f3a4c9','#f9d3e4'],rose:['#b91f46','#e96e8d','#f2b7a5','#fff1da'],daisy:['#fffdf1','#f4f0df','#fff7e4'],cosmos:['#a83882','#cf58a0','#843c83','#f5d5e8'],tulip:['#ee6334','#f5bb38','#dc3427','#e88e35']};
function specimenColor(kind,id){if($('colorMode').value==='custom'&&$('flower').value!=='mix')return $('petal').value;let palette=naturalPalettes[kind],variant=$('variant').value;return palette[variant==='mixed'?id%palette.length:Number(variant)%palette.length]}
function cubicAt(c,t){let u=1-t;return [0,1].map(k=>u*u*u*c[0][k]+3*u*u*t*c[1][k]+3*u*t*t*c[2][k]+t*t*t*c[3][k])}
function smoothCurve(points){return points.slice(0,-1).map((p,i)=>{let before=points[Math.max(0,i-1)],end=points[i+1],after=points[Math.min(points.length-1,i+2)];return [p,[p[0]+(end[0]-before[0])/6,p[1]+(end[1]-before[1])/6],[end[0]-(after[0]-p[0])/6,end[1]-(after[1]-p[1])/6],end]})}
function partialCubic(c,t){let lerp=(a,b)=>a.map((v,k)=>v+(b[k]-v)*t),a=lerp(c[0],c[1]),b=lerp(c[1],c[2]),d=lerp(c[2],c[3]),e=lerp(a,b),f=lerp(b,d);return[c[0],a,e,lerp(e,f)]}
function cubicTangent(c,t){let u=1-t;return [0,1].map(k=>3*u*u*(c[1][k]-c[0][k])+6*u*t*(c[2][k]-c[1][k])+3*t*t*(c[3][k]-c[2][k]))}
function branchFrom(parent,segment,t,end,continuation,variation=0){if(continuation){let c=parent[segment],previous=c[0],joint=c[3],span=end[1]-previous[1],ratio=Math.max(.1,Math.min(.9,(joint[1]-previous[1])/(span||1)));joint[0]=joint[0]*.25+(previous[0]+(end[0]-previous[0])*ratio)*.75;let dx=end[0]-previous[0],dy=end[1]-previous[1],length=Math.hypot(dx,dy)||1,h=Math.min(22,Math.hypot(joint[0]-previous[0],joint[1]-previous[1])*.3);c[2]=[joint[0]-dx/length*h,joint[1]-dy/length*h]}let root=cubicAt(parent[segment],t),tan=cubicTangent(parent[segment],t),length=Math.hypot(...tan)||1,dir=tan.map(v=>v/length),dx=end[0]-root[0],dy=end[1]-root[1],distance=Math.hypot(dx,dy)||1,axis=[dx/distance,dy/distance],normal=[-axis[1],axis[0]],sign=variation%2?1:-1,bow=Math.min(48,Math.max(12,distance*(.16+(variation%11)*.006)))*sign,mid=[root[0]+dx*.52+normal[0]*bow,root[1]+dy*.52+normal[1]*bow],h=distance*.22,startHandle=Math.min(distance*.25,length/3),exit=[end[0]-mid[0],end[1]-mid[1]],exitLength=Math.hypot(...exit)||1,tipHandle=Math.min(52,distance*.24);return [[root,[root[0]+dir[0]*startHandle,root[1]+dir[1]*startHandle],[mid[0]-axis[0]*h,mid[1]-axis[1]*h],mid],[mid,[mid[0]+axis[0]*h,mid[1]+axis[1]*h],[end[0]-exit[0]/exitLength*tipHandle,end[1]-exit[1]/exitLength*tipHandle],end]]}
function branchWidth(t,base,tip){return tip+(base-tip)*Math.pow(1-Math.max(0,Math.min(1,t)),.85)}
function petalEdge(hex){let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2,h=0;if(d){if(max===r)h=((g-b)/d+6)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60}let saturation=d?d/(1-Math.abs(2*l-1)):0;return 'hsl('+Math.round(h)+','+Math.round(Math.max(.4,saturation)*100)+'%,'+Math.round(Math.max(.24,Math.min(.56,l*.65))*100)+'%)'}
function joinStem(main,extension){const combined=main.concat(extension),split=main.length/combined.length;combined.baseWidth=main.baseWidth;combined.tipWidth=extension.tipWidth;combined.split=split;combined.clock={start:main.clock.start,span:extension.clock.start+extension.clock.span-main.clock.start};combined.widthAt=u=>u<=split?branchWidth(u/split,main.baseWidth,main.tipWidth):branchWidth((u-split)/(1-split),extension.baseWidth,extension.tipWidth);combined.frontAt=u=>u>=split||Math.sin(u/split*Math.PI*2+.6)>=0;return combined}
function drawRoot(stem,front){if(!stem.curve.extension){drawCurve(stem.curve,easeGrowth(stem.growth),front);return}if(!stem.composite)stem.composite=joinStem(stem.curve,stem.curve.extension);const split=stem.composite.split,progress=split*easeGrowth(stem.growth)+(1-split)*easeGrowth(Math.min(1,stem.curve.extensionProgress/.63));drawCurve(stem.composite,progress,front)}
// Keep sampled outlines across frames. Only the growing tip needs a new sample.
const ribbonCache=new Map();
function vectorRibbon(curve,progress,front){
  const color=$('stem').value;
  const key=JSON.stringify(curve)+'|'+[curve.baseWidth,curve.tipWidth,curve.split,front,color].join('|');
  let mesh=ribbonCache.get(key);
  if(!mesh){
    const count=curve.length*(curve.length>10?4:16);
    const sample=u=>{
      const at=u*curve.length,i=Math.min(curve.length-1,Math.floor(at)),t=at-i;
      const [x,y]=cubicAt(curve[i],t),[dx,dy]=cubicTangent(curve[i],t);
      const radius=(curve.widthAt?curve.widthAt(u):branchWidth(u,curve.baseWidth,curve.tipWidth))/(2*(Math.hypot(dx,dy)||1));
      const edge=k=>[(x-dy*radius*k).toFixed(3),(y+dx*radius*k).toFixed(3)].join(' ');
      return [edge(1),edge(-1),edge(-.11),edge(-.45)];
    };
    const runs=[];
    for(let i=0;i<=count;i++){
      const u=i/count;
      if(front && !(curve.frontAt?curve.frontAt(u):Math.sin(u*Math.PI*2+.6)>=0))continue;
      let run=runs[runs.length-1];
      if(!run||run.end!==i-1){run={start:i,end:i,points:[[],[],[],[]]};runs.push(run)}
      run.end=i;
      sample(u).forEach((point,j)=>run.points[j].push(point));
    }
    mesh={count,runs,sample,whole:null};
    if(ribbonCache.size>=384)ribbonCache.delete(ribbonCache.keys().next().value);
    ribbonCache.set(key,mesh);
  }
  const limit=Math.min(1,progress)*mesh.count;
  let paths=mesh.whole && progress>=1?mesh.whole:null;
  if(!paths){
    paths=['',''];
    for(const run of mesh.runs){
      if(limit<=run.start)break;
      const n=Math.min(run.end,Math.floor(limit))-run.start+1;
      const tip=limit<run.end && limit%1?mesh.sample(limit/mesh.count):null;
      for(let side=0;side<2;side++){
        const a=side*2,b=a+1;
        const forward=run.points[a].slice(0,n),back=run.points[b].slice(0,n);
        if(tip){forward.push(tip[a]);back.push(tip[b])}
        paths[side]+='M'+forward.join('L')+'L'+back.reverse().join('L')+'Z';
      }
    }
    if(progress>=1)mesh.whole=paths;
  }
  if(!paths[0])return;
  if(motionPlan && curve.clock)motionPlan.stem(curve,ctx.nodes.length);
  const start=curve[0][0],end=curve[curve.length-1][3];
  const shade=ctx.createLinearGradient(start[0]-4,start[1],end[0]+4,end[1]);
  shade.addColorStop(0,tint(color,-.22));shade.addColorStop(.5,color);shade.addColorStop(1,tint(color,.06));
  ctx.save();ctx.fillStyle=shade;ctx.fill(paths[0]);
  ctx.fillStyle=tint(color,.3)+'95';ctx.fill(paths[1]);ctx.restore();
}
function drawCurve(curve,progress,front){if(progress<=0)return;if(ctx===scene)return vectorRibbon(curve,progress,front);let base=curve.baseWidth||6.2,tip=curve.tipWidth||1.7,count=curve.length*(curve.length>10?4:16),limit=Math.min(1,progress),samples=[];for(let n=0;n<=Math.ceil(limit*count);n++){let u=Math.min(limit,n/count),scaled=u*curve.length,index=Math.min(curve.length-1,Math.floor(scaled)),t=Math.min(1,scaled-index),point=cubicAt(curve[index],t),derivative=cubicTangent(curve[index],t),len=Math.hypot(...derivative)||1; samples.push({point,normal:[-derivative[1]/len,derivative[0]/len],radius:(curve.widthAt?curve.widthAt(u):branchWidth(u,base,tip))/2,u})}function ribbon(points,scale,offset){if(points.length<2)return;ctx.beginPath();points.forEach((s,i)=>{let q=s.radius*(scale+offset),x=s.point[0]+s.normal[0]*q,y=s.point[1]+s.normal[1]*q;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});for(let i=points.length-1;i>=0;i--){let s=points[i],q=s.radius*(-scale+offset);ctx.lineTo(s.point[0]+s.normal[0]*q,s.point[1]+s.normal[1]*q)}ctx.closePath();ctx.fill()}
let runs=[],run=[];for(let s of samples){let visible=!front||(curve.frontAt?curve.frontAt(s.u):Math.sin(s.u*Math.PI*2+.6)>=0);if(visible)run.push(s);else if(run.length){runs.push(run);run=[]}}if(run.length)runs.push(run);ctx.save();let start=curve[0][0],end=curve[curve.length-1][3],shade=ctx.createLinearGradient(start[0]-4,start[1],end[0]+4,end[1]);shade.addColorStop(0,tint($('stem').value,-.22));shade.addColorStop(.5,$('stem').value);shade.addColorStop(1,tint($('stem').value,.06));ctx.fillStyle=shade;runs.forEach(points=>ribbon(points,1,0));ctx.fillStyle=tint($('stem').value,.3)+'95';runs.forEach(points=>ribbon(points,.17,-.28));ctx.restore()}
function branchDirection(id,j,habit){if(habit==='up')return false;if(habit==='down')return true;return j>0&&(id+j)%3!==0}
const leafShapes=new Map();
function leafGeometry(shape){if(leafShapes.has(shape))return leafShapes.get(shape);const width=shape==='lance'?.15:shape==='oval'?.35:.3,commands=[['moveTo',0,0]],points=[[0,0]];let current=[0,0];function line(x,y){commands.push(['lineTo',x,y]);current=[x,y];points.push(current)}function cubic(...v){commands.push(['bezierCurveTo',...v]);let curve=[current,v.slice(0,2),v.slice(2,4),v.slice(4,6)];for(let i=1;i<=32;i++)points.push(cubicAt(curve,i/32));current=v.slice(4,6)}function quadratic(...v){commands.push(['quadraticCurveTo',...v]);let start=current;for(let i=1;i<=24;i++){let t=i/24,u=1-t;points.push([u*u*start[0]+2*u*t*v[0]+t*t*v[2],u*u*start[1]+2*u*t*v[1]+t*t*v[3]])}current=v.slice(2,4)}
if(shape==='heart'){cubic(-.06,-width*.9,.28,-width*1.5,.55,-width*.6);quadratic(.85,-width*.25,1,0);quadratic(.85,width*.25,.55,width*.6);cubic(.28,width*1.5,-.06,width*.9,0,0)}else if(shape==='serrated'){for(let side of [-1,1])for(let i=side===-1?1:15;side===-1?i<=16:i>=0;side===-1?i++:i--){let t=i/16;line(t,side*Math.sin(t*Math.PI)*width*(i%2?.76:1))}}else{cubic(.12,-width,.68,-width,1,0);cubic(.68,width,.12,width,0,0)}commands.push(['closePath']);const geometry={commands,points,width};leafShapes.set(shape,geometry);return geometry}
function leafSection(geometry,x){let crossings=[];for(let i=0;i<geometry.points.length;i++){let a=geometry.points[i],b=geometry.points[(i+1)%geometry.points.length];if(Math.abs(b[0]-a[0])<1e-9)continue;if(x>=Math.min(a[0],b[0])&&x<=Math.max(a[0],b[0]))crossings.push(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]))}return crossings.length?[Math.min(...crossings),Math.max(...crossings)]:[0,0]}
function leafVeins(geometry){return Array.from({length:5},(_,i)=>{let start=.1+i*.145,end=start+.14,bounds=leafSection(geometry,end);return {start,end,top:bounds[0]*.73,bottom:bounds[1]*.73}})}
function paintLeaf(shape, color, painted) {
  const geometry=leafGeometry(shape), path=new Path2D();
  for(const [method,...args] of geometry.commands)path[method](...args);
  if(painted){
    const fold=ctx.createLinearGradient(.5,-geometry.width,.54,geometry.width);
    fold.addColorStop(0,tint(color,.19));
    fold.addColorStop(.48,tint(color,.06));
    fold.addColorStop(.52,tint(color,-.13));
    fold.addColorStop(1,tint(color,-.26));
    ctx.fillStyle=fold;ctx.fill(path);
  }
  ctx.save();ctx.clip(path);ctx.beginPath();ctx.moveTo(.035,0);
  ctx.quadraticCurveTo(.46,-geometry.width*.035,.95,0);
  geometry.veins ||= leafVeins(geometry);
  for(const v of geometry.veins){
    ctx.moveTo(v.start,0);ctx.quadraticCurveTo(v.start+.075,v.top*.36,v.end,v.top);
    ctx.moveTo(v.start,0);ctx.quadraticCurveTo(v.start+.075,v.bottom*.36,v.end,v.bottom);
  }
  ctx.strokeStyle=tint(color,painted?.31:-.16);ctx.lineWidth=.016;ctx.stroke();ctx.restore();
  ctx.lineWidth=.018;ctx.strokeStyle=tint(color,-.25);ctx.stroke(path);
}
function foliateCurve(curve,progress,seed,kind) {
  const rnd=randFactory(seed),count=+$('foliage').value,painted=$('style').value==='paint';
  for(let i=0;i<count;i++){
    const t=.1+(i+.3+rnd()*.3)/(count+1)*.75;
    const turn=.7+rnd()*.7, size=14+rnd()*22, variant=Math.floor(rnd()*1000);
    if(progress<=t)continue;
    const opening=easeGrowth((progress-t)/.18),at=t*curve.length;
    const index=Math.floor(at),local=at-index,point=cubicAt(curve[index],local), tangent=cubicTangent(curve[index],local);
    const side=i%2?1:-1;
    let shape=$('leafShape').value;
    if(shape==='mix')shape=['oval','lance','heart','serrated'][variant%4];
    const color=tint($('leaf').value,((variant%7)-3)*.025);
    ctx.save();ctx.translate(...point);
    ctx.rotate(Math.atan2(tangent[1],tangent[0])+side*turn*(.35+.65*opening));
    ctx.scale(size*opening,size*opening*(.3+.7*opening)*(.72+variant%5*.08));
    const paint=()=>paintLeaf(shape,color,painted);
    if(motionPlan)motionPlan.open(ctx.nodes.length,curve.clock.start+curve.clock.span*growthArrival(t),curve.clock.span*.24,-side*.32);
    if(ctx.symbol)ctx.symbol(['leaf',shape,color,painted].join('|'),paint);
    else paint();
    ctx.restore();
  }
}
function tendril(curve,progress,seed){if(progress<.6||seed%3!==0)return;let at=.55*curve.length,index=Math.min(curve.length-1,Math.floor(at)),point=cubicAt(curve[index],at-index),tan=cubicTangent(curve[index],at-index),angle=Math.atan2(tan[1],tan[0])+Math.PI/2,points=[];for(let i=0;i<=14;i++){let t=i/14,a=Math.PI+t*Math.PI*2.1,r=18*(1-t*.78),x=18+r*Math.cos(a),y=r*Math.sin(a);points.push([point[0]+x*Math.cos(angle)-y*Math.sin(angle),point[1]+x*Math.sin(angle)+y*Math.cos(angle)])}let spiral=smoothCurve(points);spiral.clock={start:curve.clock.start+curve.clock.span*.58,span:curve.clock.span*.42};spiral.baseWidth=1.6;spiral.tipWidth=.45;drawCurve(spiral,Math.min(1,(progress-.6)*2.5),false)}
function growthArrival(u){return .5-Math.sin(Math.asin(1-2*Math.max(0,Math.min(1,u)))/3)}
function easeGrowth(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
const letterEntranceDuration=480;
const letterEntrance=[
  {offset:0,y:.065,opacity:0,easing:'cubic-bezier(.18,.68,.32,1)'},
  {offset:.62,y:-.012,opacity:1,easing:'cubic-bezier(.35,0,.4,1)'},
  {offset:1,y:0,opacity:1}
];
function entranceLetters(text,entities){
  const segments=typeof Intl.Segmenter==='function'
    ? Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),item=>item.segment)
    : Array.from(text);
  let prefix='',index=0;
  return segments.map(char=>{
    const start=entities[index].born;
    index+=Array.from(char).length;
    prefix+=char;
    const x=ctx.measureText(prefix).width-ctx.measureText(char).width;
    return {char,x,start};
  }).filter(letter=>/\S/.test(letter.char));
}
function entrancePosition(progress){
  const from=progress<letterEntrance[1].offset?0:1;
  const a=letterEntrance[from],b=letterEntrance[from+1];
  const t=easeGrowth((progress-a.offset)/(b.offset-a.offset));
  return {y:a.y+(b.y-a.y)*t,opacity:a.opacity+(b.opacity-a.opacity)*t};
}
let motionPlan=null,activeBloom=null;
function stopBloomPlayback(){
  if(activeBloom){activeBloom.stop();activeBloom=null}
}
// Construct the complete vector scene once. The browser animates only local
// transforms, opacity and stem reveals, including during simultaneous blooms.
class BloomPlayback {
  constructor(now){this.now=now;this.jobs=[];this.effects=[];this.cleanup=[]}
  element(tag,attrs){
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [name,value] of Object.entries(attrs))node.setAttribute(name,value);
    return node;
  }
  animate(node,frames,start,duration,easing='ease-in-out'){
    const animation=node.animate(frames,{duration,delay:start-this.epoch,easing,fill:'backwards'});
    this.effects.push(animation);
    return animation;
  }
  open(index,start,duration,twist){
    if(start+duration<=this.now)return;
    this.jobs.push(items=>{
      const node=items[index].node;
      const m=node.transform.baseVal.consolidate().matrix;
      const cos=Math.cos(twist),sin=Math.sin(twist);
      const matrix=(a,b,c,d)=>'matrix('+[a,b,c,d,m.e,m.f].join(',')+')';
      const bud=matrix((m.a*cos+m.c*sin)*.001,(m.b*cos+m.d*sin)*.001,(-m.a*sin+m.c*cos)*.002,(-m.b*sin+m.d*cos)*.002);
      this.animate(node,[{transform:bud},{transform:matrix(m.a,m.b,m.c,m.d)}],start,duration,'cubic-bezier(.32,.08,.26,1)');
    });
  }
  stem(curve,index){
    const {start,span}=curve.clock;
    if(start+span<=this.now)return;
    this.jobs.push((items,defs)=>{
      const id='growth-stem-'+index;
      const points=curve.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      const x=Math.min(...xs)-8,y=Math.min(...ys)-8;
      const mask=this.element('mask',{id,maskUnits:'userSpaceOnUse',x,y,width:Math.max(...xs)-x+8,height:Math.max(...ys)-y+8});
      const path=this.element('path',{d:'M'+curve[0][0].join(' ')+curve.map(c=>'C'+c.slice(1).flat().join(' ')).join(''),fill:'none',stroke:'white','stroke-width':Math.max(12,(curve.baseWidth||4)+6),'stroke-linejoin':'round',pathLength:1,'stroke-dasharray':'1 1'});
      mask.appendChild(path);defs.appendChild(mask);
      for(const item of items.slice(index,index+2))this.attach(item.node,'mask',id);
      const reveal=this.animate(path,[{strokeDashoffset:'1'},{strokeDashoffset:'0'}],start,span);
      // Remove completed masks before the costliest part of a dense bloom.
      reveal.onfinish=()=>{
        if(activeBloom!==this)return;
        for(const item of items.slice(index,index+2))item.node.removeAttribute('mask');
        mask.remove();
      };
    });
  }
  attach(node,attr,id){node.setAttribute(attr,'url(#'+id+')');this.cleanup.push(()=>node.removeAttribute(attr))}
  lettering(index,text,entities,size){
    if(entities.every(e=>e.born+letterEntranceDuration<=this.now))return;
    const letters=entranceLetters(text,entities);
    this.jobs.push(items=>{
      const original=items[index].node;
      const group=this.element('g',{'aria-hidden':'true',transform:original.getAttribute('transform')});
      const glyphStyle={y:original.getAttribute('y'),fill:original.getAttribute('fill'),
        'font-family':original.getAttribute('font-family'),'font-size':size};
      original.after(group);
      original.style.opacity='0';
      const restore=()=>{original.style.removeProperty('opacity');group.remove()};
      this.cleanup.push(restore);
      const motions=[];
      for(const {char,x,start} of letters){
        const glyph=this.element('text',{...glyphStyle,x});
        glyph.textContent=char;
        group.appendChild(glyph);
        if(start+letterEntranceDuration<=this.now)continue;
        const frames=letterEntrance.map(({offset,y,opacity,easing})=>({
          offset,transform:'translateY('+size*y+'px)',opacity,easing:easing||'linear'
        }));
        motions.push(this.animate(glyph,frames,start,letterEntranceDuration,'linear').finished);
      }
      Promise.all(motions).then(()=>{if(activeBloom===this)restore()},()=>{});
    });
  }
  play(scene){
    const defs=this.element('defs',{});scene.element.appendChild(defs);
    this.cleanup.push(()=>defs.remove());
    activeBloom=this;
    this.epoch=this.now;
    for(const job of this.jobs)job(scene.live.items,defs);
    this.jobs=[];
    Promise.all(this.effects.map(effect=>effect.finished.catch(()=>{}))).then(()=>{
      if(activeBloom===this)stopBloomPlayback();
    });
  }
  stop(){for(const run of this.effects)run.cancel();for(const clear of this.cleanup)clear()}
}

const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');let layout={fs:null,x:null,last:null};
function render(now,force,preview=false){stopBloomPlayback();const text=$('text').value,font=$('font').value,entities=syncLetters(text,now);const cardLayout=globalThis.getCardLayout?.()||{scale:.82,centerY:(globalThis.cardHeight||1000)/2};let fs=+$('size').value*1.8;ctx.clearRect(0,0,1600,1000);ctx.fillStyle=$('bg').value;if(preview||!force||!transparent)ctx.fillRect(0,0,1600,globalThis.cardHeight||1000);if(globalThis.drawPaper)globalThis.drawPaper(ctx);const photo=globalThis.photoRoseSource?.();
if(photo&&ctx.defs)ctx.defs.push('<image id="catalog-flower" x="-.5" y="-.5" width="1" height="1" href="'+photo+'" xlink:href="'+photo+'"/>');
const rows=[[]];
for(const entity of entities){
  if(entity.char==='\n')rows.push([]);
  else rows[rows.length-1].push(entity);
}
ctx.font=fs+'px '+font;
const widths=rows.map(row=>ctx.measureText(row.map(e=>e.char).join('')).width);
const top=cardLayout.tagY+cardLayout.tagSize+14,bottom=cardLayout.messageY-cardLayout.messageSize-18;
const half=Math.min(cardLayout.centerY-top,bottom-cardLayout.centerY);
const slot=2*half/rows.length;
const scale=Math.min(cardLayout.scale,1270/Math.max(1,...widths),slot/(fs*1.55+105));
rows.forEach((entities,i)=>{
 const text=entities.map(e=>e.char).join('');
 const centerY=cardLayout.centerY+(i-(rows.length-1)/2)*slot;
 drawFloralRow(text,entities,widths[i],fs,scale,centerY,now,force);
});
if(globalThis.decorateCard)globalThis.decorateCard(ctx);if(ctx.commit)ctx.commit()}
function drawFloralRow(text,entities,width,fs,scale,centerY,now,force){
const origin=0;let x=0,base=600,mode=reducedMotion?.matches?'still':$('motion').value,duration=6000/(+$('speed').value*.45+.4),specimens=[],roots=[];
ctx.save();ctx.font=fs+'px '+$('font').value;ctx.textBaseline='alphabetic';
const font=$('font').value,metrics=ctx.measureText(text);
const mid=base+((metrics.actualBoundingBoxDescent||0)-(metrics.actualBoundingBoxAscent||fs*.72))/2;
ctx.translate(800-width*scale/2,centerY-scale*mid);ctx.scale(scale,scale);
entities.forEach(entity=>{const char=entity.char,w=ctx.measureText(char).width,gx=x;x+=w;if(/\s/.test(char))return;let rnd=randFactory(entity.seed),profile=glyphProfile(char,font,fs,w),age=now-entity.born,count=entity.id<=14||entity.id%3===0?+$('density').value:1;const growth=force||mode!=='grow'?1:Math.max(0,Math.min(1,age/duration));let phase=rnd()*6.28;let anchors=[];for(let k=0;k<=7;k++){let t=k/7,row=profile[Math.round((1-t)*59)],cx=gx+(row[0]+row[1])/2,rad=Math.max(17,(row[1]-row[0])/2)+9;anchors.push([cx+Math.cos(t*Math.PI*1.6+phase)*rad+Math.sin(t*Math.PI*2+phase*.5)*Math.min(24,fs*.065),base-fs*.76*t])}let main=smoothCurve(anchors);main.baseWidth=5.8+(entity.seed%15)/10;main.tipWidth=2.1;main.clock={start:entity.born,span:duration*.4};roots.push({curve:main,seed:entity.seed,growth:force||mode!=='grow'?1:Math.max(0,Math.min(1,age/(duration*.4)))});for(let j=0;j<count;j++){let kind=$('flower').value;if(kind==='mix')kind=['blossom','rose','daisy','cosmos','tulip'][(entity.id+j)%5];let down=branchDirection(entity.id,j,$('habit').value),continuation=j===0&&!down;let attach=continuation?1:down?.18+j*.065:.4+(j-1)*.12;attach=Math.min(.88,attach);if(continuation)attach=1;let seg=Math.min(main.length-1,Math.floor(attach*(main.length-1))),root=cubicAt(main[seg],continuation?1:.65),side=j%2?-1:1;let wind=mode==='breathe'&&!force?Math.sin(now/1100+phase+j)*+$('wind').value*2.1:0;let ex=gx+w*(.35+rnd()*.4)+side*(j?25+rnd()*35:0)+wind,ey=down?base+fs*(.14+rnd()*.26):base-fs*(j===0?.9+rnd()*.22:.53+rnd()*.28),end=[ex,ey];let curve=branchFrom(main,seg,continuation?1:.65,end,continuation,entity.seed+j*137);curve.baseWidth=continuation?main.tipWidth:branchWidth((seg+.65)/main.length,main.baseWidth,main.tipWidth)*.72;curve.tipWidth=.95+(entity.seed%5)*.12;let p=force||mode!=='grow'?1:Math.max(0,Math.min(1,(age/duration-growthArrival((seg+(continuation?1:.65))/main.length)*.4-j*.02)/.59));curve.clock={start:entity.born+duration*(growthArrival((seg+(continuation?1:.65))/main.length)*.4+j*.02),span:duration*.59*.63};
if(continuation){main.extension=curve;main.extensionProgress=p}let specimen=Math.floor(rnd()*2147483647);specimens.push({continuation,curve,root,end,kind,p,attach,growth,down,r:(kind==='blossom'?(j===0&&!down?(entity.id%3===1?108:65)+rnd()*20:23+rnd()*17):28+rnd()*31)*+$('bloomSize').value/100,angle:rnd()*6.28,seed:specimen,color:specimenColor(kind,specimen),j})}});
ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=$('stem').value;ctx.lineWidth=2.7;roots.forEach(s=>drawRoot(s,false));ctx.fillStyle=$('ink').value;
// Keep a shaped text run at rest and animate individual graphemes on entry.
if(force||mode!=='grow'||entities.every(e=>now-e.born>=letterEntranceDuration)){
  if(motionPlan)motionPlan.lettering(ctx.nodes.length,text,entities,fs);
  ctx.fillText(text,origin,base);
}else{
  for(const {char,x,start} of entranceLetters(text,entities)){
    if(now<=start)continue;
    const {y,opacity}=entrancePosition((now-start)/letterEntranceDuration);
    if(ctx===scene)ctx.fillText(char,x,base+y*fs,opacity);
    else{
      ctx.globalAlpha=opacity;
      ctx.fillText(char,x,base+y*fs);
      ctx.globalAlpha=1;
    }
  }
}
ctx.strokeStyle=$('stem').value;roots.forEach(s=>{drawRoot(s,true);foliateCurve(s.curve,easeGrowth(s.growth),s.seed,'mixed');tendril(s.curve,easeGrowth(s.growth),s.seed)});specimens.forEach(s=>{if(!s.continuation)drawCurve(s.curve,easeGrowth(Math.min(1,s.p/.63)),false);foliateCurve(s.curve,easeGrowth(Math.min(1,s.p/.63)),s.seed,s.kind);tendril(s.curve,easeGrowth(Math.min(1,s.p/.63)),s.seed)});
// Blossoms are a final pass: neither stems nor text can overpaint their own corollas.
for(const s of specimens){
 const first=motionPlan?ctx.nodes.length:0;
 flower(...s.end,s.r,s.kind,randFactory(s.seed),Math.max(0,Math.min(1,(s.p-.63)/.37)),s.angle+(mode==='breathe'?Math.sin(now/1000)*.06:0),s.color);
 if(motionPlan){
   for(let i=first;i<ctx.nodes.length;i++){
     const layer=i-first,start=s.curve.clock.start+s.curve.clock.span;
     motionPlan.open(i,start+layer*65,duration*.59*.37-layer*65,.18-layer*.09);
   }
 }
}
ctx.restore()}
function restart(){let now=performance.now();letters.forEach((e,i)=>e.born=now+i*Math.min(85,900/Math.max(1,letters.length-1)));requestPreview()}
ids.forEach(id=>$(id).addEventListener('input',()=>{if(id==='text')syncLetters($('text').value,performance.now());for(const k of ['size','density','bloomSize','speed','wind','foliage'])$(k+'V').textContent=$(k).value}));
$('transparent').onclick=()=>{transparent=!transparent;$('transparent').textContent='Sfondo: '+(transparent?'trasparente':'pieno');$('transparent').setAttribute('aria-pressed',transparent)};
$('random').onclick=()=>{seed=Math.floor(Math.random()*2147483647);letters.forEach(e=>e.seed=(seed+Math.imul(e.id,2654435761))>>>0);restart()};
$('replay').onclick=()=>{if($('motion').value==='still')$('motion').value='grow';restart()};
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.download=name;a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
$('download').onclick=()=>{cancelPreview();const raster=document.createElement('canvas');raster.width=1600;raster.height=1000;const previous=ctx;try{ctx=raster.getContext('2d');Path2D=NativePath;render(performance.now(),true);raster.toBlob(blob=>{if(blob)saveBlob(blob,'floral-type.png')},'image/png')}finally{ctx=previous;Path2D=SVGPath;requestPreview()}};
const fontFiles={Georgia:'editorial',Baskerville:'italic',Palatino:'bookman',Classic:'classic',Arial:'sans',Script:'script'};
async function fontStyle(){const family=$('font').value;let data=uploadedFonts.get(family);if(!data&&fontFiles[family]){const response=await fetch('fonts/'+fontFiles[family]+'.otf');if(!response.ok)throw new Error('Font non disponibile');data=await response.arrayBuffer();uploadedFonts.set(family,data)}if(!data)return '';let binary='';for(const byte of new Uint8Array(data))binary+=String.fromCharCode(byte);return '<style>@font-face{font-family:'+family+';src:url(data:font/otf;base64,'+btoa(binary)+')}</style>'}
$('downloadSVG').onclick=async()=>{const button=$('downloadSVG');button.disabled=true;button.textContent='Preparo SVG…';try{const style=await fontStyle();cancelPreview();render(performance.now(),true);saveBlob(new Blob([scene.toSVG(style)],{type:'image/svg+xml;charset=utf-8'}),'floral-type.svg')}catch(e){alert('Esportazione SVG non riuscita. Riprova.')}finally{button.disabled=false;button.textContent='Esporta SVG';cancelPreview();requestPreview()}};
for(const k of ['size','density','bloomSize','speed','wind','foliage'])$(k+'V').textContent=$(k).value;
$('fontUpload').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let face=await new FontFace('CustomFont',await f.arrayBuffer()).load();document.fonts.add(face);uploadedFonts.set('CustomFont',await f.arrayBuffer());let old=$('font').querySelector('[value=CustomFont]');if(old)old.remove();$('font').add(new Option(f.name,'CustomFont'));$('font').value='CustomFont';profiles.clear()}catch(e){alert('Impossibile leggere questo font. Prova un file OTF, TTF o WOFF valido.')}};
function cancelPreview(){
  if(raf!=null)cancelAnimationFrame(raf);
  raf=null;
}
let previewVisible=!globalThis.IntersectionObserver, previewDirty=true;
function schedulePreview(){
  if(previewDirty && previewVisible && !document.hidden && raf==null)raf=requestAnimationFrame(frame);
}
function requestPreview(){
  previewDirty=true;
  schedulePreview();
}
function frame(now){
  raf=null;
  previewDirty=false;
  const mode=$('motion').value;
  const duration=6000/(+$('speed').value*.45+.4);
  const still=reducedMotion?.matches||mode==='still'||(mode==='grow'&&letters.every(letter=>now-letter.born>=Math.max(letterEntranceDuration,duration)));
  // Keep the completed card static until an edit or replay requests another frame.
  if(!still && mode==='grow' && typeof canvas.animate==='function'){
    const plan=new BloomPlayback(now);
    motionPlan=plan;
    try{render(now,true,true)}finally{motionPlan=null}
    plan.play(scene);
    return;
  }
  render(now,still,true);
  if(still){layout.fs=null;layout.x=null;layout.last=null}
  else requestPreview();
}
if(globalThis.IntersectionObserver){
  new IntersectionObserver(([entry])=>{
    previewVisible=entry.isIntersecting;
    if(previewVisible)schedulePreview();else cancelPreview();
  }).observe($('workspace'));
}
document.addEventListener?.('visibilitychange',()=>{if(document.hidden)cancelPreview();else schedulePreview()});
document.fonts.ready.then(()=>{profiles.clear();requestPreview()});
reducedMotion?.addEventListener?.('change',requestPreview);
document.fonts.addEventListener?.('loadingdone',()=>{profiles.clear();requestPreview()});
requestPreview();


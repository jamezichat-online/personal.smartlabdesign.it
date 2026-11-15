/* ===== live layers: run while a spread is open (canvas drawn every frame, or a GLSL lens). Engine glue is in wow_engine.py ===== */
const LK=(()=>{
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mod=(v,n)=>((v%n)+n)%n,lerp=(a,b,t)=>a+(b-a)*t;
const eio=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const outBack=t=>{const c=1.9;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
const MONO='"DM Mono",ui-monospace,monospace',DISP='"Archivo Black",sans-serif';

/* ---------------------------------------------------------------- 3D Frames: one clock drives stack, popped frame and playback bar */
const FR={N:72,DUR:10,HOLD:1.8,KEYS:[37,55,69,89,101,109],SPD:6,JS:11,J:34};
const frTL=(()=>{const seg=[];let t=0;FR.KEYS.forEach((a,i)=>{seg.push({t0:t,t1:t+FR.HOLD,f0:a,f1:a,h:1});t+=FR.HOLD;
  if(i<FR.KEYS.length-1){const b=FR.KEYS[i+1],d=Math.max(1.5,(b-a)/FR.SPD);seg.push({t0:t,t1:t+d,f0:a,f1:b,h:0});t+=d}});
  // glide from the last key back to the first (same frame, one clip later)
  seg.push({t0:t,t1:t+1.5,f0:FR.KEYS[FR.KEYS.length-1],f1:FR.KEYS[0]+FR.N,h:0});t+=1.5;return {seg,T:t}})();
function frClock(t){
  const tt=mod(t,frTL.T);let s=frTL.seg.find(q=>tt>=q.t0&&tt<q.t1)||frTL.seg[0];
  const u=(tt-s.t0)/(s.t1-s.t0);let f,pop=0;
  if(s.h){f=s.f0;const a=tt-s.t0,b=s.t1-tt;pop=a<.5?clamp(outBack(a/.5),0,1.12):b<.4?b/.4:1}
  else f=lerp(s.f0,s.f1,eio(u));
  return {f,pop,n:mod(Math.round(f),FR.N),hold:!!s.h};
}
const tc=n=>{const s=(n+.5)/FR.N*FR.DUR,m=Math.floor(s/60);return String(m).padStart(2,'0')+':'+(s%60).toFixed(3).padStart(6,'0')};
function frCam(o){
  if(o._cam)return o._cam;
  const C=o.cam||{x:-3.1,y:2.45,z:3.2,tx:.9,ty:.55,tz:-3.2,F:900,cx:.34,cy:.62};
  const f=[C.tx-C.x,C.ty-C.y,C.tz-C.z],fl=Math.hypot(...f);f.forEach((_,i)=>f[i]/=fl);
  let r=[-f[2],0,f[0]];const rl=Math.hypot(...r);r=r.map(v=>v/rl);
  const u=[r[1]*f[2]-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]-r[1]*f[0]];
  o._cam=(x,y,z)=>{const v=[x-C.x,y-C.y,z-C.z],X=v[0]*r[0]+v[1]*r[1]+v[2]*r[2],Y=v[0]*u[0]+v[1]*u[1]+v[2]*u[2],Z=v[0]*f[0]+v[1]*f[1]+v[2]*f[2];
    return [o.w*C.cx+C.F*X/Z,o.h*C.cy-C.F*Y/Z,C.F/Z]};
  return o._cam;
}
const FW=.8,FY0=.12,FY1=1.02,DZ=.2;
function frQuad(P,z,dy,sc,dz){ // projected corners of a frame at depth z, raised by dy, scaled about its base centre
  const cy=FY0,w=FW*sc,b=cy+dy,t=cy+dy+(FY1-FY0)*sc;
  return [P(-w,t,z+dz),P(w,t,z+dz),P(-w,b,z+dz),P(w,b,z+dz)];
}
function fit(ctx,im,sx,sy,sw,sh,q){ // draw an image cell onto a projected parallelogram (TL,TR,BL)
  const [a,b,c]=q;ctx.save();ctx.setTransform((b[0]-a[0])/sw,(b[1]-a[1])/sw,(c[0]-a[0])/sh,(c[1]-a[1])/sh,a[0],a[1]);
  ctx.drawImage(im,sx,sy,sw,sh,0,0,sw,sh);ctx.restore();
}
const mir=(q,X0)=>{const m=p=>[2*X0-p[0],p[1],p[2]];return [m(q[1]),m(q[0]),m(q[3]),m(q[2])]};
const quadPath=(ctx,q)=>{ctx.beginPath();ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[1][0],q[1][1]);ctx.lineTo(q[3][0],q[3][1]);ctx.lineTo(q[2][0],q[2][1]);ctx.closePath()};
const cell=(im,n,cols,cw,ch)=>[(n%cols)*cw,Math.floor(n/cols)*ch,cw,ch];

const fstack={init(L,A,o){},
  draw(ctx,t,L){const o=L.o,P=frCam(o),ck=frClock(L.still?0:t),th=L.A.im.thumbs;if(!th)return;
    ctx.lineJoin='round';
    const hero=.2+.8*ck.pop,X0=P(0,0,-FR.JS*DZ)[0];
    for(let s=FR.J;s>=-3;s--){ // slots, back to front
      const n=Math.round(ck.f)+s-FR.JS,sl=s-(ck.f-Math.round(ck.f)),z=-sl*DZ-0;
      const far=clamp((FR.J-sl)/7,0,1),near=clamp((sl-4)/5,0,1),al=far*near;if(al<=.01)continue;
      const q=mir(frQuad(P,z,0,1,0),X0),m=mod(n,FR.N),[sx,sy,sw,sh]=cell(th,m,12,256,144);
      const isA=Math.abs(sl-FR.JS)<.5;
      ctx.globalAlpha=al*(isA?1-hero*.92:1);
      ctx.save();quadPath(ctx,q);ctx.fillStyle='rgba(120,235,235,.13)';ctx.fill();ctx.restore();
      ctx.globalAlpha=al*(isA?1-hero*.92:1)*.62;fit(ctx,th,sx,sy,sw,sh,q);
      ctx.globalAlpha=al*(isA?1-hero*.92:1);ctx.strokeStyle='rgba(150,250,250,.85)';ctx.lineWidth=Math.max(1,q[0][2]*.012);quadPath(ctx,q);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }};
const fhero={init(L,A,o){},
  draw(ctx,t,L){const o=L.o,P=frCam(o),ck=frClock(L.still?0:t),bg=L.A.im.big;if(!bg)return;
    const pop=ck.pop,rise=.2+.8*pop,sc=1+.34*pop,dy=.12+.62*rise*1.0,dz=.55*pop;
    const z=-FR.JS*DZ,q=frQuad(P,z,dy,sc,dz),[sx,sy,sw,sh]=cell(bg,ck.n,8,448,252);
    // soft ground shadow where the frame left the stack
    {const g=frQuad(P,z,0,1,0),cx=(g[2][0]+g[3][0])/2,cy=(g[2][1]+g[3][1])/2,rr=Math.max(4,Math.abs(g[3][0]-g[2][0])*.55);
      ctx.save();ctx.translate(cx,cy);ctx.scale(1,.3);const rg=ctx.createRadialGradient(0,0,2,0,0,rr);rg.addColorStop(0,'rgba(0,10,12,'+(.45*rise)+')');rg.addColorStop(1,'rgba(0,10,12,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(0,0,rr,0,7);ctx.fill();ctx.restore()}
    ctx.save();ctx.shadowColor='rgba(255,70,160,'+(.35+.5*pop)+')';ctx.shadowBlur=28+30*pop;quadPath(ctx,q);ctx.fillStyle='#0c2224';ctx.fill();ctx.restore();
    fit(ctx,bg,sx,sy,sw,sh,q);
    const gr=ctx.createLinearGradient(q[0][0],q[0][1],q[3][0],q[3][1]);gr.addColorStop(0,'#ffc83a');gr.addColorStop(1,'#ff3d9a');
    ctx.save();ctx.shadowColor=pop>.5?'rgba(255,170,60,.9)':'rgba(255,100,160,.6)';ctx.shadowBlur=10+16*pop;ctx.strokeStyle=gr;ctx.lineWidth=3+2*pop;ctx.lineJoin='round';quadPath(ctx,q);ctx.stroke();ctx.restore();
    // tag sits on the frame plane, skewed with it
    const a=q[0],b=q[1],c=q[2],iw=448,ih=252;
    ctx.save();ctx.setTransform((b[0]-a[0])/iw,(b[1]-a[1])/iw,(c[0]-a[0])/ih,(c[1]-a[1])/ih,a[0],a[1]);
    const lbl='F '+String(ck.n+1).padStart(3,'0')+' · '+tc(ck.n);ctx.font='500 21px '+MONO;const w=ctx.measureText(lbl).width+34,h=38,x0=10,y0=-h-12;
    ctx.fillStyle='#ff3d9a';ctx.fillRect(x0+6,y0+7,w,h);ctx.fillStyle='#ffc83a';ctx.fillRect(x0,y0,w,h);ctx.fillStyle='#04211f';ctx.textBaseline='middle';ctx.fillText(lbl,x0+17,y0+h/2+1);
    ctx.restore();
  }};
const fbar={init(L,A,o){},
  draw(ctx,t,L){const ck=frClock(L.still?0:t),s=L.w/818;ctx.save();ctx.scale(s,s);
    const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r)};
    ctx.fillStyle='#ff3d9a';rr(13,14,800,78,34);ctx.fill();
    ctx.fillStyle='#071f1f';rr(8,8,800,78,34);ctx.fill();
    const g=ctx.createLinearGradient(8,10,808,86);g.addColorStop(0,'#ffc83a');g.addColorStop(.55,'#ffe9b0');g.addColorStop(1,'#ff3d9a');ctx.strokeStyle=g;ctx.lineWidth=3;rr(8,8,800,78,34);ctx.stroke();
    const cy=47,circ=(x,r)=>{ctx.beginPath();ctx.arc(x,cy,r,0,7)};
    ctx.strokeStyle='rgba(255,246,220,.55)';ctx.lineWidth=1.6;circ(44,19);ctx.stroke();circ(152,19);ctx.stroke();circ(272,19);ctx.stroke();circ(322,19);ctx.stroke();
    ctx.fillStyle='#fff6dc';
    ctx.fillRect(36,39,2.6,16);ctx.beginPath();ctx.moveTo(52,39);ctx.lineTo(40,47);ctx.lineTo(52,55);ctx.fill();            // prev
    ctx.beginPath();ctx.moveTo(144,39);ctx.lineTo(156,47);ctx.lineTo(144,55);ctx.fill();ctx.fillRect(157,39,2.6,16);        // next
    ctx.fillStyle='#ff3d9a';circ(101,25);ctx.fill();ctx.fillStyle='#ffc83a';circ(98,cy);ctx.fill();ctx.fillStyle='#04211f';           // play / pause
    if(ck.hold){ctx.beginPath();ctx.moveTo(92,36);ctx.lineTo(108,47);ctx.lineTo(92,58);ctx.fill()}else{ctx.fillRect(90,37,6,20);ctx.fillRect(101,37,6,20)}
    ctx.strokeStyle='rgba(255,246,220,.55)';rr(176,31,76,32,16);ctx.stroke();ctx.fillStyle='#fff6dc';ctx.font='500 15px '+MONO;ctx.textBaseline='middle';ctx.fillText('1×',191,48);
    ctx.fillStyle='#ffc83a';ctx.beginPath();ctx.moveTo(229,44);ctx.lineTo(241,44);ctx.lineTo(235,52);ctx.fill();
    ctx.strokeStyle='#fff6dc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(262,43);ctx.lineTo(281,43);ctx.moveTo(278,39);ctx.lineTo(282,43);ctx.lineTo(278,47);ctx.moveTo(282,52);ctx.lineTo(263,52);ctx.moveTo(266,48);ctx.lineTo(262,52);ctx.lineTo(266,56);ctx.stroke(); // loop
    const st=(x,y,R,r2)=>{ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r2:R;ctx.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}ctx.closePath()};
    if(ck.pop>.3){ctx.save();ctx.shadowColor='#ffc83a';ctx.shadowBlur=18*ck.pop;ctx.fillStyle='#ffc83a';st(322,cy,10,4.2);ctx.fill();ctx.restore()}else{ctx.fillStyle='#fff6dc';st(322,cy,10,4.2);ctx.fill()}
    // playback slider, synced to the flow
    const x0=358,x1=590,p=mod(ck.f+.5,FR.N)/FR.N;
    ctx.fillStyle='#1d4543';ctx.fillRect(x0,45,x1-x0,4);ctx.fillStyle='#ffc83a';ctx.fillRect(x0,45,(x1-x0)*p,4);
    const tx=x0+(x1-x0)*p;ctx.fillStyle='#ff3d9a';ctx.fillRect(tx-7,36,18,22);ctx.fillStyle='#ffc83a';ctx.fillRect(tx-9,34,18,22);
    ctx.fillStyle='#fff6dc';ctx.font='500 17px '+MONO;ctx.textAlign='right';ctx.fillText(tc(ck.n)+' / 00:10.000',792,36);
    ctx.fillStyle='rgba(255,246,220,.6)';ctx.font='500 12px '+MONO;ctx.fillText('SAMPLE '+String(ck.n+1).padStart(3,'0'),792,60);
    ctx.restore();
  }};

/* ---------------------------------------------------------------- POMATA: the site's own runway orbit, in perspective */
const orbitPose=(index,phase,count,width,height)=>{
  const angle=count<=1?0:(index-phase)*Math.PI*2/count,depth=(1-Math.cos(angle))/2,scale=1.13/(1+depth*1.45),radius=width*.35;
  const fade=clamp((depth-.43)/.35,0,1),vis=1-fade*fade*(3-2*fade);
  return {x:Math.sin(angle)*radius*scale,y:-depth*Math.min(height*.22,115),depth,scale,op:(1-depth*.39)*vis,so:(.82-depth*.3)*vis};
};
const carousel={init(L,A,o){L.st={phase:0,vel:0,target:0,next:.9,last:0};L.ims=(o.keys||[]).map(k=>A.im[k]).filter(Boolean)},
  draw(ctx,t,L){const o=L.o,st=L.st,N=L.ims.length;if(!N)return;
    if(!L.still){const dt=clamp(t-st.last,0,.05);st.last=t;
      if(t>st.next){st.target+=1;st.next=t+(o.every||2.7)}
      const om=12,dsp=st.phase-st.target,term=st.vel+om*dsp,dc=Math.exp(-om*dt);st.phase=st.target+(dsp+term*dt)*dc;st.vel=(st.vel-om*term*dt)*dc}
    const W=L.w,H=L.h,base=H-44,items=L.ims.map((im,i)=>({im,p:orbitPose(i,st.phase+(o.start||0),N,W,H)})).sort((a,b)=>b.p.depth-a.p.depth);
    items.forEach(({im,p})=>{
      if(p.op<=.01)return;const h=(o.mh||800)*p.scale,w=im.width*h/im.height,x=W/2+p.x,yb=base+p.y;
      ctx.save();ctx.globalAlpha=p.so;ctx.translate(x,yb);ctx.scale(1,.18);const g=ctx.createRadialGradient(0,0,4,0,0,w*.55);g.addColorStop(0,'rgba(42,32,22,.55)');g.addColorStop(1,'rgba(42,32,22,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,w*.55,0,7);ctx.fill();ctx.restore();
      ctx.globalAlpha=p.op;ctx.drawImage(im,x-w/2,yb-h,w,h);ctx.globalAlpha=1});
  }};

/* ---------------------------------------------------------------- VOID SIGNAL: the animated rack (The Hanging Collection) */
const rack={init(L,A,o){L.ims=(o.keys||[]).map(k=>A.im[k]).filter(Boolean);L.st={ph:0,last:0,v:0}},
  draw(ctx,t,L){const o=L.o,N=L.ims.length,W=L.w,H=L.h,st=L.st;if(!N)return;
    const dt=L.still?0:clamp(t-st.last,0,.05);st.last=t;
    // slow drift that eases into a short pause every piece, like a hand pushing the rail
    const cyc=mod(t,3.2),push=cyc<1.4?Math.sin(cyc/1.4*Math.PI):0;st.v=push*(o.speed||.9);st.ph+=st.v*dt;
    const railY=o.railY||46;
    // rail
    const rg=ctx.createLinearGradient(0,railY-6,0,railY+6);rg.addColorStop(0,'#6b6672');rg.addColorStop(.5,'#d8d3dc');rg.addColorStop(1,'#59545f');
    ctx.fillStyle=rg;ctx.beginPath();ctx.roundRect(12,railY-5,W-24,10,5);ctx.fill();
    const items=[];for(let i=0;i<N;i++){const a=(i-st.ph)*Math.PI*2/N,dep=(1-Math.cos(a))/2;items.push({i,a,dep})}
    items.sort((p,q)=>q.dep-p.dep);
    items.forEach(({i,a,dep})=>{
      const sc=1/(1+dep*.55),x=W/2+Math.sin(a)*W*.43*sc,al=1-dep*.5;if(al<=.02)return;
      const swing=Math.sin(t*1.7+i*1.9)*.035+(-st.v*.16)+Math.sin(t*.8+i)*.012,th=o.th||330*sc;
      const im=L.ims[i],tw=th*im.width/im.height;
      ctx.save();ctx.globalAlpha=al;ctx.translate(x,railY);ctx.rotate(swing);ctx.scale(sc,sc);
      ctx.strokeStyle='#bdb7c4';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(9,-10,-9,-26,-9,-18);ctx.stroke();   // hook
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,30);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,30);ctx.lineTo(-tw*.42*(o.th?1:1),52);ctx.lineTo(tw*.42,52);ctx.closePath();ctx.stroke();                              // hanger
      ctx.drawImage(im,-tw/2,36,tw,th);
      ctx.restore();
    });
    ctx.globalAlpha=1;
    // sit it behind the subjects: tint and dim
    ctx.globalCompositeOperation='source-atop';ctx.fillStyle='rgba(18,4,40,'+(o.dim!=null?o.dim:.38)+')';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over';
  }};

/* ---------------------------------------------------------------- TYPE LENS: the tool's own glass lens, GLSL, magnifying the scene underneath */
const lensV='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const lensF=`precision highp float;varying vec2 vUv;uniform vec2 res;uniform vec2 cen;uniform float R,mag,pad,reveal;uniform sampler2D page,sec;uniform vec3 tint;uniform vec2 vel;
vec3 sp(vec2 p){vec2 u=vec2(p.x/res.x,1.-p.y/res.y);vec3 c=texture2D(page,u).rgb;vec4 s=texture2D(sec,u);return mix(c,s.rgb,s.a*reveal);}
float pane(vec2 p,vec2 c,vec2 s){vec2 d=abs(p-c)-s;return 1.-smoothstep(-.014,.014,max(d.x,d.y));}
void main(){
 vec2 q=vec2(vUv.x*2.-1.,1.-vUv.y*2.)*pad;float d=length(q);
 if(d>1.005){vec2 sq=q-vec2(.07,.16);float sh=.5*(1.-smoothstep(.55,1.42,length(sq)));gl_FragColor=vec4(.04,0.,.1,sh*(1.-smoothstep(1.,1.12,d)*0.)*.9);return;}
 float z=sqrt(max(0.,1.-d*d));
 float scale=1./mag+.035*d*d+(1.-1./mag-.05)*pow(d,8.);vec2 refr=cen+q*R*scale;
 vec2 disp=q*R*.0025*pow(d,3.);
 vec3 image=vec3(sp(refr+disp).r,sp(refr).g,sp(refr-disp).b);
 float th=pow(z,.6);image*=mix(vec3(1.),tint*.43+.57,.42+th*.25);image=mix(image,tint,th*.10);image*=1.-.22*pow(d,16.);
 vec2 rf=vec2(q.x*.86+q.y*.28,-q.x*.22+q.y*.9)+vel*.0005;vec2 bend=rf/(.65+z*.60);
 float w=0.;w+=pane(bend,vec2(-.31,-.40),vec2(.125,.15));w+=pane(bend,vec2(-.035,-.40),vec2(.125,.15));w+=pane(bend,vec2(-.31,-.07),vec2(.125,.15));w+=pane(bend,vec2(-.035,-.07),vec2(.125,.15));
 image=mix(image,vec3(.995,.993,.97),min(w,1.)*(.39+.20*pow(d,2.))*.8);
 float arc=exp(-pow((d-.91)/.035,2.))*smoothstep(.05,.8,q.x+q.y)*.64,broad=exp(-pow((d-.79)/.11,2.))*smoothstep(.4,1.,q.x+q.y)*.22;image=mix(image,vec3(1.),arc+broad);
 image=mix(image,vec3(.25,.29,.24),pow(d,25.)*.32);
 float rim=exp(-pow((d-.974)/.009,2.));image+=rim*.34*smoothstep(-.6,.8,-q.x-q.y);image+=exp(-pow((d-.995)/.004,2.))*.16;
 gl_FragColor=vec4(image,1.-smoothstep(.995,1.005,d));}`;
const lens={gl:1,
  init(L,A,o){
    const R=o.R||150,pad=1.55,size=Math.ceil(R*2*pad);L.w=L.h=size;
    const pg=new THREE.Texture(A.bg);pg.minFilter=pg.magFilter=THREE.LinearFilter;pg.generateMipmaps=false;pg.needsUpdate=true;
    const sc=mk(PW*2,PH),x=sc.getContext('2d');
    // the hidden story: the sign only lights up inside the lens
    x.save();x.translate(o.tx,o.ty);x.rotate((o.trot!=null?o.trot:-5)*Math.PI/180);x.textAlign='center';x.textBaseline='middle';
    const ln=o.msg||['SMARTLAB','DESIGN'],fs=o.fs||52;x.font='400 '+fs+'px '+DISP;
    ln.forEach((t,i)=>{const y=(i-(ln.length-1)/2)*fs*1.05;x.shadowColor='#ff4f8b';x.shadowBlur=26;x.fillStyle='#ff4f8b';x.fillText(t,0,y);x.shadowBlur=10;x.shadowColor='#ffd166';x.fillStyle='#fff0ce';x.fillText(t,0,y)});x.restore();
    const st=new THREE.CanvasTexture(sc);st.minFilter=THREE.LinearFilter;st.generateMipmaps=false;
    L.mat=new THREE.ShaderMaterial({uniforms:{res:{value:new THREE.Vector2(PW*2,PH)},cen:{value:new THREE.Vector2(o.x,o.y)},R:{value:R},mag:{value:o.mag||1.8},pad:{value:pad},reveal:{value:0},page:{value:pg},sec:{value:st},tint:{value:new THREE.Vector3(.92,.96,.92)},vel:{value:new THREE.Vector2()}},
      vertexShader:lensV,fragmentShader:lensF,transparent:true,depthWrite:false});
    L.R=R;L.pos={x:o.x,y:o.y};L.rev=0;L.dw=0;L.pi=0;L.pt=0;L.noPop=1;
  },
  update(L,t,sx,sy,ctx){
    const o=L.o,p=L.pos,path=o.path||[];
    let tx=p.x,ty=p.y,follow=false;
    if(ctx.ptrActive&&ctx.px>o.zone[0]&&ctx.px<o.zone[2]&&ctx.py>o.zone[1]&&ctx.py<o.zone[3]){tx=ctx.px;ty=ctx.py;follow=true}
    else if(path.length){ // patrol: glide between points, rest on each
      L.pt+=ctx.dt;const w=path[L.pi%path.length];
      if(L.pt>(w[2]||1.2)){L.pi++;L.pt=0}
      const n=path[L.pi%path.length];tx=n[0];ty=n[1];
    }
    const k=1-Math.exp(-ctx.dt*(follow?9:2.2)),px0=p.x,py0=p.y;p.x+=(tx-p.x)*k;p.y+=(ty-p.y)*k;
    const u=L.mat.uniforms;
    // the lens sees what is underneath where it is drawn (parallax-corrected)
    u.cen.value.set(p.x+L.sx,p.y+L.sy);u.vel.value.set((p.x-px0)/ctx.dt*.5,(p.y-py0)/ctx.dt*.5);
    const near=Math.hypot(p.x-o.tx,p.y-o.ty)<L.R*.45;L.rev+=((near?1:0)-L.rev)*(1-Math.exp(-ctx.dt*(near?3.2:1.6)));u.reveal.value=L.rev;
    // quad is centred on the lens; entrance scales it from nothing
    L.bx=((p.x+0)/(2*PW)-.5)*2*W;L.bz=(p.y/PH-.5)*H;
    L.scl=outBack(clamp(L.e,0,1));
  }};

return {fstack,fhero,fbar,carousel,rack,lens,FR};
})();

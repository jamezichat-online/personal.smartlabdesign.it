"""Engine upgrades for the 'wow' copy of Made This Way. Applied on top of the native build, so native/ never changes.

  * pop-up layers  - when the spread settles every layer eases into its depth, staggered back to front, with a small "pop" around its own base
  * deeper parallax - stronger pointer / gyro shift, more overscan so no edge is ever revealed, each floating layer on its own phase
  * hand-written notes are written on after the objects land (left-to-right wipe) instead of being baked into the page
  * stacked titles  - '\\n' in a word gives a two-line poster title, with per-spread centre / size / alignment
  * objects         - rot (tilt), stk (paper-sticker outline, for collage spreads), glow (rim light), per-object shadow colour
  * text            - scrim spans the whole spread (no seam at the gutter) and takes the spread's own colour; light spreads get dark text
  * links           - a real "Open the project" link for the current spread, and every project on the back cover
"""
import re

SHADER_NEW = """const LFS=`uniform sampler2D map;uniform vec2 shift,rad,pv;uniform float m,gain,sc,wipe;varying vec2 vUv;
float cut(vec2 p,vec2 c){return length((p-c)/rad)>1.?0.:1.;}
void main(){vec2 u=(vUv-shift-pv)/sc+pv;vec4 c=texture2D(map,(u+m)/(1.+2.*m));float a=c.a*(1.-smoothstep(wipe-.045,wipe,u.x));vec2 p=vUv;"""

BIGWORD = r"""function bigWord(x,word,cx,cy,maxW,maxH,{fill,sh,ol,al},rot=-0.04){
  const L=word.split('\n');x.save();x.translate(cx,cy);x.rotate(rot);
  let fs=400;x.font=`400 ${fs}px "Archivo Black"`;LS(x,`${-fs*.045}px`);
  const m=Math.max(...L.map(l=>x.measureText(l).width));fs=Math.min(fs*maxW/m,maxH/(L.length>1?L.length*.9:1));x.font=`400 ${fs}px "Archivo Black"`;LS(x,`${-fs*.045}px`);
  x.textAlign=al||'center';x.textBaseline='middle';
  const o=fs*.06,lh=fs*.9,y0=-(L.length-1)*lh/2,ax=al==='left'?-maxW/2:al==='right'?maxW/2:0;
  x.lineJoin='round';x.strokeStyle=ol;x.lineWidth=fs*.022;L.forEach((l,i)=>x.strokeText(l,ax+o*2.2,y0+i*lh+o*2.4));
  x.fillStyle=sh;L.forEach((l,i)=>x.fillText(l,ax+o,y0+i*lh+o*1.1));
  x.fillStyle=fill;L.forEach((l,i)=>x.fillText(l,ax,y0+i*lh));
  x.restore();
}
"""

COVER_JS = r"""  {const pick=(k,n)=>{const sp=SPREADS.find(q=>q.k===k),o=sp&&sp.art&&sp.art.objs&&sp.art.objs.find(q=>q.src.indexOf(n)>=0);return o&&o.img};
    const stick=(img,cx,cy,h,rot,p=7)=>{if(!img)return;const w=img.width*h/img.height,r=img.height/h,c2=mk(Math.ceil(w+p*4),Math.ceil(h+p*4)),q=c2.getContext('2d');
      for(let a=0;a<28;a++)q.drawImage(img,p*2+Math.cos(a*.2244)*p,p*2+Math.sin(a*.2244)*p,w,h);q.globalCompositeOperation='source-in';q.fillStyle='#fff8ea';q.fillRect(0,0,c2.width,c2.height);
      x.save();x.translate(cx,cy);x.rotate(rot*Math.PI/180);x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=18;x.shadowOffsetX=8;x.shadowOffsetY=12;x.drawImage(c2,-w/2-p*2,-h/2-p*2);x.shadowColor='transparent';x.drawImage(img,-w/2,-h/2,w,h);x.restore()};
    stick(pick('frames','hero'),930,566,170,9);stick(pick('right','jack'),640,612,200,-14);stick(pick('creative','lens'),892,716,210,0,5);stick(pick('giggi','burger'),742,792,300,-4)}
"""

CSS = """
.go{white-space:nowrap;position:absolute;right:max(26px,env(safe-area-inset-right,0px));bottom:calc(58px + env(safe-area-inset-bottom,0px));pointer-events:auto;display:inline-flex;align-items:center;gap:10px;min-height:46px;padding:0 20px 0 22px;
  border:1.5px solid var(--fg);border-radius:999px;background:rgba(2,26,25,.62);color:var(--cream);font:500 11px var(--fm);letter-spacing:.14em;text-transform:uppercase;text-decoration:none;
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .35s,transform .35s cubic-bezier(.2,0,0,1),visibility 0s .35s,background-color .2s,color .2s,border-color .2s,box-shadow .2s}
.go b{font-weight:500;color:var(--sun);transition:color .2s}
.go svg{width:14px;height:14px;transition:transform .25s cubic-bezier(.2,0,0,1)}
.go:hover{background:var(--sun);color:var(--ink);border-color:var(--sun);box-shadow:5px 5px 0 var(--pink)}.go:hover b{color:var(--ink)}.go:hover svg{transform:translate(2px,-2px)}
.go:active{transform:scale(.96)}
.go:focus-visible{outline:2px solid var(--sun);outline-offset:3px}
body.has-go .go{opacity:1;visibility:visible;transform:none;transition:opacity .45s .5s,transform .45s .5s cubic-bezier(.2,0,0,1),visibility 0s .5s,background-color .2s,color .2s,border-color .2s,box-shadow .2s}
.cta.all{width:min(420px,calc(100% - 32px));display:grid;grid-template-columns:1fr 1fr;gap:14px 16px}
.cta.all h2{grid-column:1/-1;margin:0 0 2px;font:400 clamp(26px,2.5vw,36px)/1 "Archivo Black",sans-serif;letter-spacing:-.03em;color:var(--cream);text-wrap:balance}
.cta.all h2 span{color:var(--sun)}
.cta.all p{grid-column:1/-1;margin:0 0 6px;font:600 17px/1.3 "Barlow Condensed",sans-serif;color:var(--fgm,rgba(255,248,225,.7))}
.cta.all .btn{min-height:46px;font-size:15px;padding:0 12px;background:transparent;color:var(--cream);border-color:rgba(255,248,225,.45);box-shadow:none;transition:background-color .2s,color .2s,border-color .2s,box-shadow .2s,transform .2s}
.cta.all .btn:hover{background:var(--cream);color:var(--ink);border-color:var(--cream);box-shadow:5px 5px 0 var(--pink);transform:translate(-2px,-2px)}
.cta.all .btn:active{transform:scale(.96)}
.cta.all .btn.main{grid-column:1/-1;min-height:54px;font-size:18px;background:var(--sun);color:var(--ink);border-color:var(--ink);box-shadow:6px 6px 0 var(--pink)}
.cta.all .btn.main:hover{background:var(--sun);color:var(--ink);box-shadow:9px 9px 0 var(--pink);transform:translate(-3px,-3px)}
@media (max-aspect-ratio:17/20){.go{right:auto;left:50%;bottom:calc(128px + env(safe-area-inset-bottom,0px));transform:translate(-50%,8px)}body.has-go .go{transform:translateX(-50%)}.go:active{transform:translateX(-50%) scale(.96)}
  .cta.all{width:min(420px,calc(100% - 40px));gap:10px 12px}.cta.all h2{font-size:24px}.cta.all p{display:none}.cta.all .btn{min-height:44px;font-size:14px}}
@media (max-height:520px){.go{bottom:calc(8px + env(safe-area-inset-bottom,0px));min-height:36px;padding:0 14px;font-size:10px}.cta.all{width:min(340px,44vw);gap:7px 9px}.cta.all h2{font-size:18px}.cta.all p{display:none}.cta.all .btn{min-height:32px;font-size:12px}.cta.all .btn.main{min-height:36px;font-size:13px}}
@media (prefers-reduced-motion:reduce){.go,.go svg,.cta.all .btn{transition:none}}
"""


def patch(s, D, rep):
    # ---------------------------------------------------------------- parallax + pop-up layers
    s = rep(s, 'const LM=.04;', 'const LM=.075;')
    a = s.index('const LFS=`'); b = s.index('vec2 p=vUv;', a) + len('vec2 p=vUv;')
    s = s[:a] + SHADER_NEW + s[b:]
    s = rep(s, "rad:{value:new THREE.Vector2(RAD/(PW*2),RAD/PH)},gain:{value:1.04}}",
            "rad:{value:new THREE.Vector2(RAD/(PW*2),RAD/PH)},gain:{value:1.04},pv:{value:new THREE.Vector2(.5,.5)},sc:{value:1},wipe:{value:9}}")
    s = rep(s, "layers.forEach(l=>{book.remove(l.mesh);", "layers.forEach(l=>{gsap.killTweensOf(l);gsap.killTweensOf(l.mat.uniforms.wipe);book.remove(l.mesh);")
    s = rep(s, "layers.push({mesh,mat,d,k,float:!!fl});", """const L={mesh,mat,d,k,float:!!fl,e:RM?1:0,pop:0};
    if(md==='title'){mat.uniforms.pv.value.set((s.art.tcx||1210)/(PW*2),1-(s.art.tcy||300)/PH);L.pop=.45}
    else if(/^o\\d+$/.test(md)){const o=s.art.objs[+md.slice(1)];if(o&&o.img){const w=o.img.width*o.sh/o.img.height;mat.uniforms.pv.value.set((o.sx+w/2)/(PW*2),1-(o.sy+o.sh)/PH);L.pop=o.pop!=null?o.pop:1}}
    else if(md==='notes'&&!RM){const xs=s.art.notes.map(n=>n.x),w0=Math.min(...xs)/(PW*2)-.03,w1=Math.max(...xs)/(PW*2)+.32;mat.uniforms.wipe.value=w0;
      gsap.to(mat.uniforms.wipe,{value:w1,duration:1.5,delay:.55+k*.06,ease:'power1.inOut',onComplete(){mat.uniforms.wipe.value=9}})}
    if(!RM)gsap.to(L,{e:1,duration:1.25,delay:.08+k*.085,ease:'power3.out'});
    layers.push(L);""")
    s = rep(s, "layers.forEach(l=>{const f=live.v*k*l.d;l.mat.uniforms.shift.value.set(tilt.x*.02*f,-tilt.y*.018*f+(l.float?Math.sin(tm*1.4)*.003*live.v*k:0))});",
            """layers.forEach(l=>{const e=l.e,f=e*k*l.d,ph=l.k*1.9;
    l.mat.uniforms.shift.value.set(tilt.x*.034*f+(l.float?Math.cos(tm*.9+ph)*.0012*e*k:0),-tilt.y*.03*f+(l.float?Math.sin(tm*1.3+ph)*.0036*e*k:0));
    l.mat.uniforms.sc.value=1+.045*l.pop*Math.sin(Math.PI*Math.min(1,e*1.15))*k});""")
    s = rep(s, 'const live={v:0};', 'const live={v:0};gsap.ticker.lagSmoothing(0); // slow devices skip ahead instead of playing the entrance in slow motion')
    s = rep(s, "const amt=cur===0?1:.55;", "const amt=cur===0?1:.8;")
    # notes are written on live, never baked into the flipping page
    s = rep(s, "if(A.notes&&(F||mode==='notes'))drawNotes(x,A.notes)", "if(A.notes&&mode==='notes')drawNotes(x,A.notes)")

    # ---------------------------------------------------------------- objects: tilt, sticker outline, rim glow
    s = rep(s, "OBJ.forEach((o,i)=>{if(!(MO||mode==='o'+i))return;", "const drawO=o=>{")
    s = rep(s, "x.globalAlpha=1;x.drawImage(o.img,o.sx,o.sy,w,h)});",
            """x.globalAlpha=1;x.drawImage(o.img,o.sx,o.sy,w,h)};
      OBJ.forEach((o,i)=>{if(!(MO||mode==='o'+i))return;x.save();
        if(o.rot){const w=o.img.width*o.sh/o.img.height,cx=o.sx+w/2,cy=o.sy+o.sh/2;x.translate(cx,cy);x.rotate(o.rot*Math.PI/180);x.translate(-cx,-cy)}
        drawO(o);x.restore()});""")
    s = rep(s, "if(o.fly){x.save();x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=36;x.shadowOffsetY=26;x.drawImage(o.img,o.sx,o.sy,w,h);x.restore();return}",
            """if(o.stk){if(!o.sk){const p=o.stk,c2=mk(o.img.width+p*2,o.img.height+p*2),q=c2.getContext('2d');for(let a=0;a<28;a++)q.drawImage(o.img,p+Math.cos(a*.2244)*p,p+Math.sin(a*.2244)*p);q.drawImage(o.img,p,p);q.globalCompositeOperation='source-in';q.fillStyle=o.stkC||'#fff8ea';q.fillRect(0,0,c2.width,c2.height);o.sk=c2}
          const r=w/o.img.width,p=o.stk*r;x.save();x.shadowColor=o.shc||'rgba(60,30,0,.5)';x.shadowBlur=20;x.shadowOffsetX=10;x.shadowOffsetY=16;x.drawImage(o.sk,o.sx-p,o.sy-p,w+2*p,h+2*p);x.restore();x.drawImage(o.img,o.sx,o.sy,w,h);return}
        if(o.glow){x.save();x.shadowColor=o.glow;x.shadowBlur=o.glowB||70;x.drawImage(o.img,o.sx,o.sy,w,h);x.restore()}
        if(o.fly){x.save();x.shadowColor=o.shc||'rgba(0,0,0,.55)';x.shadowBlur=o.shb||36;x.shadowOffsetY=o.sho!=null?o.sho:26;x.drawImage(o.img,o.sx,o.sy,w,h);x.restore();return}""")

    # ---------------------------------------------------------------- titles + text
    a = s.index('function bigWord('); b = s.index('function block(', a)
    s = s[:a] + BIGWORD + s[b:]
    s = rep(s, "bigWord(x,s.word,s.art.tcx||(L?PW*2-1210:1210),300,s.art.tw||1620,390,(s.pal&&s.pal.word)||{fill:C,sh:I,ol:PK},L?0.035:-0.04);return}",
            "bigWord(x,s.word,s.art.tcx||(L?PW*2-1210:1210),s.art.tcy||300,s.art.tw||1620,s.art.th||390,{...((s.pal&&s.pal.word)||{fill:C,sh:I,ol:PK}),al:s.art.ta},s.art.trot!=null?s.art.trot:(L?0.035:-0.04));return}")
    a = s.index("const ox=L?0:PW*2,g=x.createLinearGradient(ox,PH,PW,PH*.12);"); b = s.index("x.fillStyle=g;x.fillRect(L?0:PW,0,PW,PH);", a) + len("x.fillStyle=g;x.fillRect(L?0:PW,0,PW,PH);")
    s = s[:a] + """const ox=L?0:PW*2,g=x.createLinearGradient(ox,PH,PW,PH*.12),SC=(s.pal&&s.pal.scrim)||'3,22,24',SK=(s.pal&&s.pal.scrimK)||1;
  [[0,.95],[.3,.76],[.5,.36],[.62,.07],[.68,0]].forEach(([p,al])=>g.addColorStop(p,`rgba(${SC},${Math.min(1,al*SK)})`));
  x.fillStyle=g;x.fillRect(0,0,PW*2,PH);""" + s[b:]
    s = rep(s, "x.save();x.shadowColor='rgba(4,28,30,.85)';x.shadowBlur=18;x.fillStyle='rgba(6,45,49,.85)';x.fillText(t,X+3,Y+3);x.restore();x.fillStyle='rgba(6,45,49,.85)';x.fillText(t,X+3,Y+3);",
            "const TS=(s.pal&&s.pal.txtSh)||'rgba(6,45,49,.85)';x.save();x.shadowColor=(s.pal&&s.pal.txtGlow)||'rgba(4,28,30,.85)';x.shadowBlur=18;x.fillStyle=TS;x.fillText(t,X+3,Y+3);x.restore();x.fillStyle=TS;x.fillText(t,X+3,Y+3);")
    s = rep(s, "pal:{word:{fill:'%s'" % D.SPREADS_DATA[0]['pal']['fill'], "pal:{word:{fill:'%s'" % D.SPREADS_DATA[0]['pal']['fill'])  # sanity: palette block present
    # extra palette keys (txt, scrim, txtSh...) are appended per spread
    for d in D.SPREADS_DATA:
        ex = {k: v for k, v in d['pal'].items() if k in ('txt', 'scrim', 'scrimK', 'txtSh', 'txtGlow')}
        if ex and d['k'] in D.ENABLED:
            key = "{type:'rule',k:\"%s\"" % d['k']
            i = s.index(key); j = s.index("tipSh:'%s'}," % d['pal']['tipSh'], i)
            s = s[:j] + "tipSh:'%s',%s}," % (d['pal']['tipSh'], ','.join("%s:%s" % (k, repr(v)) for k, v in ex.items())) + s[j + len("tipSh:'%s'}," % d['pal']['tipSh']):]

    # ---------------------------------------------------------------- real links
    s = rep(s, '</style>', CSS + '</style>')
    s = rep(s, '<button class="bgbtn" id="bgbtn"', '<a class="go" id="go" href="/" target="_blank" rel="noopener"><span>Open <b id="gon"></b></span><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 11 3M5 3h6v6"/></svg></a>\n  <button class="bgbtn" id="bgbtn"')
    s = rep(s, "document.getElementById('live').textContent=names[cur];",
            "document.getElementById('live').textContent=names[cur];\n  {const sp=SPREADS[cur-1],g=document.getElementById('go'),on=!!(sp&&sp.url);document.body.classList.toggle('has-go',on);if(on){g.href=sp.url;document.getElementById('gon').textContent=sp.name;g.setAttribute('aria-label','Open the '+sp.name+' project in a new tab')}}")
    btns = ''.join('\n    <a class="btn" href="%s" target="_blank" rel="noopener">%s ↗</a>' % (d['url'], d['name']) for d in D.SPREADS_DATA if d['k'] in D.ENABLED)
    s = re.sub(r'<div class="cta">.*?</div>', '''<div class="cta all">
    <h2>Six projects. <span>Yours next?</span></h2>
    <p>Brand, web, motion and interactive tools, designed and built in one studio.</p>%s
    <a class="btn main" href="/#contact" target="_blank" rel="noopener">Start a project ↗</a>
  </div>''' % btns, s, count=1, flags=re.S)
    # ---------------------------------------------------------------- cover: the projects already popping out of the sun
    s = rep(s, "    x.fillStyle=PK;x.beginPath();x.roundRect(102,102,500,58,4);x.fill();", COVER_JS + "    x.fillStyle=PK;x.beginPath();x.roundRect(102,102,500,58,4);x.fill();")
    s = rep(s, 'Projects the studio shipped, and how they were made.<br>Project edition', 'Six projects the studio shipped,<br>and how they were made.')
    s = s.replace('Made This Way (Project Edition) — SmartLabDesign', 'Made This Way — SmartLabDesign projects, as a pop-up book')
    return s

"""Builds projects-book/native/index.html from ideas-into-worlds/index.html.

Native edition only: every spread keeps the fixed layer engine (bg + objects + notes + fg, parallax) and
adds two engine extensions, both patched in here so the original stays untouched:
  * ART[k].objs  - any number of separate transparent objects, each with its own depth `d`, so they can overlap
  * ART[k].notes - hand-written floating annotations (Caveat), drawn on their own parallax layer
Projects follow the order of the site's "Selected projects" grid.
"""
import re, json, sys
R = '/home/claude/personal.smartlabdesign.it/'
src = open(R + 'ideas-into-worlds/index.html', encoding='utf-8').read()

def rep(s, a, b):
    assert a in s, ('missing', a[:70])
    return s.replace(a, b, 1)

DEF = dict(shK=.45, shD=-.04, shY=14, shX=.5, dF=1.35)

# ----------------------------------------------------------------- content, in site order
from book_data import SPREADS_DATA, ART_DATA, ENABLED

def pal(p):
    return "pal:{word:{fill:'%s',sh:'%s',ol:'%s'},tipBg:'%s',tipSh:'%s'}," % (p['fill'], p['sh'], p['ol'], p['tip'], p['tipSh'])

def js_spreads():
    out = []
    for d in SPREADS_DATA:
        if d['k'] not in ENABLED: continue
        side = "side:'L'," if d.get('side') == 'L' else ''
        out.append("{type:'rule',k:%s,word:%s,%s%skicker:%s,tipLabel:'OPEN THE PROJECT',title:%s,body:%s,tip:%s}" % (
            json.dumps(d['k']), json.dumps(d['word']), pal(d['pal']), '', json.dumps(d['kicker']), json.dumps(d['title']), json.dumps(d['body']), json.dumps(d['tip'])))
    return 'const RULES=[];\nconst SPREADS=[\n ' + ',\n '.join(out) + '\n];\nconst ART=' + json.dumps({k: {**DEF, **v} for k, v in ART_DATA.items() if k in ENABLED}, indent=0) + ';\n'

s = src
a = s.index('const RULES=['); b = s.index('const loadImg')
s = s[:a] + js_spreads() + s[b:]

# ---------- engine extension 1: loader accepts bg-only art, separate objects and notes
s = rep(s, 'const [bg,subj,fg]=await Promise.all([a.bg,a.subj,a.fg].map(loadImg));if(bg&&subj&&fg)s.art={...a,bg,subj,fg}',
        'const [bg,subj,fg]=await Promise.all([a.bg,a.subj,a.fg].map(u=>u?loadImg(u):null));const objs=a.objs?await Promise.all(a.objs.map(async o=>({...o,img:await loadImg(o.src)}))):null;if(bg)s.art={...a,bg,subj,fg,objs}')

# ---------- engine extension 2: objects drawn one by one, notes layer
i0 = s.index('if(MO){const w=A.subj.width*A.sh/A.subj.height')
i1 = s.index('x.globalAlpha=1;x.drawImage(A.subj,A.sx,A.sy,w,h)}', i0) + len('x.globalAlpha=1;x.drawImage(A.subj,A.sx,A.sy,w,h)}')
OBJ_JS = r"""{const OBJ=A.objs?A.objs.filter(o=>o.img):(A.subj?[{img:A.subj,sx:A.sx,sy:A.sy,sh:A.sh,shX:A.shX,shY:A.shY,shK:A.shK,shD:A.shD}]:[]);
      OBJ.forEach((o,i)=>{if(!(MO||mode==='o'+i))return;
        const w=o.img.width*o.sh/o.img.height,h=o.sh,fx0=o.sx+w*(o.shX||A.shX||.5),fy0=o.sy+h-(o.shY!=null?o.shY:(A.shY||6));
        if(o.flat){x.drawImage(o.img,o.sx,o.sy,w,h);return}
        if(o.fly){x.save();x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=36;x.shadowOffsetY=26;x.drawImage(o.img,o.sx,o.sy,w,h);x.restore();return}
        if(!o.sil){const c2=mk(o.img.width,o.img.height),q=c2.getContext('2d');q.drawImage(o.img,0,0);q.globalCompositeOperation='source-in';q.fillStyle=A.shC||'#1a0f24';q.fillRect(0,0,c2.width,c2.height);o.sil=c2}
        if(o.shK!==0){x.save();x.translate(fx0,fy0);x.transform(1,0,o.shK||A.shK||.6,o.shD||A.shD||-.2,0,0);
          for(let k=0;k<7;k++){x.globalAlpha=.1;const q=(k-3)*5;x.drawImage(o.sil,-w/2+q,-h+Math.abs(q),w,h)}
          x.restore()}
        const g=x.createRadialGradient(fx0,fy0,4,fx0,fy0,w*.42);g.addColorStop(0,'rgba(20,10,30,.7)');g.addColorStop(1,'rgba(20,10,30,0)');
        x.save();x.translate(fx0,fy0);x.scale(1,.18);x.translate(-fx0,-fy0);x.fillStyle=g;x.beginPath();x.arc(fx0,fy0,w*.42,0,7);x.fill();x.restore();
        x.globalAlpha=1;x.drawImage(o.img,o.sx,o.sy,w,h)});
      if(A.notes&&(F||mode==='notes'))drawNotes(x,A.notes)}"""
s = s[:i0] + OBJ_JS + s[i1:]
s = rep(s, 'if(WO){const gx=A.fgx', 'if(WO&&A.fg){const gx=A.fgx')

NOTES_FN = r"""function drawNotes(x,ns){ns.forEach(n=>{
  const sz=n.size||46,col=n.col||'#fff7e6',halo='rgba(8,4,16,.82)';
  x.save();x.lineCap='round';x.lineJoin='round';
  if(n.ar){const [x1,y1,cx,cy,x2,y2]=n.ar,pth=()=>{x.beginPath();x.moveTo(x1,y1);x.quadraticCurveTo(cx,cy,x2,y2)},an=Math.atan2(y2-cy,x2-cx),hd=()=>{x.beginPath();x.moveTo(x2+Math.cos(an+2.7)*26,y2+Math.sin(an+2.7)*26);x.lineTo(x2,y2);x.lineTo(x2+Math.cos(an-2.7)*26,y2+Math.sin(an-2.7)*26)};
    x.strokeStyle=halo;x.lineWidth=11;pth();x.stroke();hd();x.stroke();x.strokeStyle=col;x.lineWidth=5;pth();x.stroke();hd();x.stroke()}
  x.translate(n.x,n.y);x.rotate((n.rot||0)*Math.PI/180);x.font='700 '+sz+'px Caveat,"Segoe Script","Bradley Hand",cursive';x.textAlign=n.align||'left';
  const L=n.t.split('\n');
  L.forEach((ln,i)=>{const y=i*sz*.92,f=i===0?sz:sz*.78;x.font='700 '+f+'px Caveat,"Segoe Script","Bradley Hand",cursive';x.strokeStyle=halo;x.lineWidth=f*.24;x.strokeText(ln,0,y);x.fillStyle=i===0?col:'#fff7e6';x.fillText(ln,0,y)});
  if(n.ul){x.font='700 '+sz+'px Caveat,cursive';const w=x.measureText(L[0]).width,x0=n.align==='center'?-w/2:n.align==='right'?-w:0;
    x.strokeStyle=halo;x.lineWidth=10;x.beginPath();x.moveTo(x0,sz*.18);x.quadraticCurveTo(x0+w*.5,sz*.3,x0+w,sz*.12);x.stroke();
    x.strokeStyle=col;x.lineWidth=4.5;x.beginPath();x.moveTo(x0,sz*.18);x.quadraticCurveTo(x0+w*.5,sz*.3,x0+w,sz*.12);x.stroke()}
  x.restore()})}
"""
s = rep(s, 'function drawSpread(s,mode=', NOTES_FN + 'function drawSpread(s,mode=')

# ---------- plan: one layer per object, then notes, then foreground
s = rep(s, "const plan=s.art?[['title',s.art.dT||.35,1],['motif',s.art.dS,0],['word',s.art.dF,0]]:",
        "const plan=s.art?[['title',s.art.dT||.35,1],...(s.art.objs?s.art.objs.map((o,i)=>['o'+i,o.d,o.fl?1:0]):[['motif',s.art.dS||.6,0]]),...(s.art.fg?[['word',s.art.dF,0]]:[]),...(s.art.notes?[['notes',s.art.nd||1.6,1]]:[])]:")

# ---------- fonts: handwriting for the notes
s = rep(s, 'family=DM+Mono:wght@400;500&display=swap', 'family=DM+Mono:wght@400;500&family=Caveat:wght@600;700&display=swap')
s = rep(s, "'italic 700 100px \"Barlow Condensed\"'", "'italic 700 100px \"Barlow Condensed\"','700 40px \"Caveat\"'")

# ---------- palette overrides + book chrome (same as the first version of the script)
s = rep(s, 'x.fillStyle=C;x.fillText(t,X,Y)};', 'x.fillStyle=(s.pal&&s.pal.txt)||C;x.fillText(t,X,Y)};')
s = rep(s, 'x.fillStyle=PK;x.beginPath();x.roundRect(x0+10,y+10,bw,bh', 'x.fillStyle=(s.pal&&s.pal.tipSh)||PK;x.beginPath();x.roundRect(x0+10,y+10,bw,bh')
s = rep(s, 'x.fillStyle=SU;x.strokeStyle=I;x.lineWidth=3;x.beginPath();x.roundRect(x0,y,bw,bh', 'x.fillStyle=(s.pal&&s.pal.tipBg)||SU;x.strokeStyle=I;x.lineWidth=3;x.beginPath();x.roundRect(x0,y,bw,bh')
s = rep(s, "{fill:C,sh:I,ol:PK},L?0.035:-0.04", "(s.pal&&s.pal.word)||{fill:C,sh:I,ol:PK},L?0.035:-0.04")
s = rep(s, "const names=['Cover','Introduction',...RULES.map(r=>r.title),'Let’s build','Back cover'];", "const names=['Cover',...SPREADS.map(s=>s.title),'Back cover'];")
LAB = 'PROJECT EDITION'
s = rep(s, "'A FIELD GUIDE BY SMARTLABDESIGN'", "'%s ✦ SMARTLABDESIGN'" % LAB)
s = rep(s, "x.fillText('IDEAS',104,416);x.fillStyle=C;x.fillText('IDEAS',90,400);", "x.fillText('MADE',104,416);x.fillStyle=C;x.fillText('MADE',90,400);")
s = rep(s, "x.fillStyle=SU;x.fillText('INTO',94,500);", "x.fillStyle=SU;x.fillText('THIS',94,500);")
s = s.replace("'WORLDS.'", "'WAY.'")
s = rep(s, "'IDEAS INTO WORLDS BY'", "'MADE THIS WAY BY'")
s = s.replace("'STUDIO HANDBOOK ✦ 2026'", "'%s ✦ 2026'" % LAB)
s = rep(s, '<button class="logo" id="home" aria-label="Close the book">Ideas <span>into</span><br>worlds</button>', '<button class="logo" id="home" aria-label="Close the book">Made <span>this</span><br>way</button>')
s = rep(s, '<p class="ded">For everyone who ever walked in with a scribble.<br>Keep drawing. The world part comes later.<small>Alessio, SmartLabDesign</small></p>',
        '<p class="ded">Projects the studio shipped, and how they were made.<br>Project edition<small>Alessio, SmartLabDesign</small></p>')
s = re.sub(r'<div class="cta">.*?</div>', '''<div class="cta">
    <a class="btn" href="/" target="_blank" rel="noopener">All the projects ↗</a>
    <a class="btn alt" href="/voidsignal/" target="_blank" rel="noopener">Void Signal ↗</a>
    <a class="btn" href="/giggiooo-burger-v2/" target="_blank" rel="noopener">Giggiooo Burger ↗</a>
  </div>''', s, count=1, flags=re.S)
s = s.replace('Ideas Into Worlds — SmartLabDesign', 'Made This Way (Project Edition) — SmartLabDesign')
s = s.replace('Ideas Into Worlds, an interactive 3D book by SmartLabDesign', 'Made This Way, an interactive 3D book of SmartLabDesign projects')
s = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Made This Way: SmartLabDesign projects and how they were made, as an interactive 3D book.">', s)
s = s.replace("fs=Math.min(fs*860/mw,330);", "fs=Math.min(fs*860/mw,210);").replace("x.strokeText('WAY.',92,690)", "x.strokeText('WAY.',92,700)")
s = s.replace("const copy=document.getElementById('copy');\ncopy.onclick", "const copy=document.getElementById('copy');\nif(copy)copy.onclick")
s = s.replace('  <script src="/assets/consent.js" defer></script>\n', '')
open(R + 'projects-book/native/index.html', 'w', encoding='utf-8').write(s)
print('native ok', len([d for d in SPREADS_DATA if d['k'] in ENABLED]), 'spreads')

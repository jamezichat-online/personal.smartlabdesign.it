import re,sys
R='/home/claude/personal.smartlabdesign.it/'
src=open(R+'ideas-into-worlds/index.html',encoding='utf-8').read()
def rep(s,a,b,n=1):
    assert s.count(a)>=1,('missing',a[:60]); return s.replace(a,b) if n==0 else s.replace(a,b,n)
VOID_BODY='It began as a myth: three tribes, The Stage, The Iron and The Grid, each with its own marks, colours and voice. From that story came the graphics, a storefront, a scroll-tuned website and an Instagram that invites people in.'
GIGGI_BODY='A demo brand built to show a burger restaurant what its site could be: cinematic packaging, burgers that come apart layer by layer on scroll, six drinks and a merch line, all in one warm, appetising system.'
def spreads(ed):
    native=ed=='native'
    vp="pal:{word:{fill:C,sh:'#000',ol:'#a98bff'},tipBg:'#a98bff',tipSh:'#000'}," if native else ''
    gp="pal:{word:{fill:'#f6e7c8',sh:'#2a1208',ol:'#e7b25a'},tipBg:'#e7b25a',tipSh:'#2a1208'}," if native else ''
    E='Project edition' if native else 'Brand edition'
    return f"""const RULES=[];
const SPREADS=[
 {{type:'rule',k:'void',word:'VOID SIGNAL',{vp}kicker:'Project 01 ✦ Brand · Shop · Web · Social',tipLabel:'OPEN THE PROJECT',title:'A streetwear label, built end to end.',body:'{VOID_BODY}',tip:'sites.smartlabdesign.it/voidsignal: the tribes, the drops and the shop.'}},
 {{type:'rule',k:'giggi',word:'GIGGIOOO',{gp}kicker:'Project 02 ✦ Brand experience',tipLabel:'OPEN THE PROJECT',title:'A burger you can take apart.',body:'{GIGGI_BODY}',tip:'sites.smartlabdesign.it/giggiooo-burger-v2: scroll the burger open.'}},
 {{type:'final',bg:I,word:'THE WORK',fill:SU,sh:PK,ol:CO,kicker:'Last page ✦ {E}',tipLabel:'OPEN THE PROJECTS',title:'Every project, one tap away.',body:'Each page in this book is a live project. Open it, scroll it, take it apart.',tip:'Void Signal ✦ Giggiooo Burger ✦ all the work at sites.smartlabdesign.it'}}
];
const ART={{
  void:{{bg:'assets/void-bg.webp',subj:'assets/void-subj.webp',fg:'assets/void-fg.webp',tcx:1390,tw:1160,sx:100,sy:190,sh:790,fgx:-120,shK:.55,shD:-.045,shY:20,shX:.5,dS:.6,dF:1.35}},
  giggi:{{bg:'assets/giggi-bg.webp',subj:'assets/giggi-subj.webp',fg:'assets/giggi-fg.webp',sx:90,sy:330,sh:640,fgx:-120,shK:.35,shD:-.03,shY:30,shX:.5,dS:.6,dF:1.35}},
  final:{{bg:'assets/final-bg.webp',subj:'assets/void-subj.webp',fg:'assets/void-fg.webp',sx:80,sy:210,sh:780,tcx:1420,tw:1160,fgx:-120,shK:.55,shD:-.045,shY:20,shX:.5,dS:.6,dF:1.35}}
}};
"""
for ed in ['brand','native']:
    s=src
    a=s.index('const RULES=[');b=s.index('const loadImg')
    s=s[:a]+spreads(ed)+s[b:]
    s=rep(s,'if(bg&&subj&&fg)s.art={...a,bg,subj,fg}','if(bg)s.art={...a,bg,subj,fg}')
    s=rep(s,'if(MO){const w=A.subj.width','if(MO&&A.subj){const w=A.subj.width')
    s=rep(s,'if(WO){const gx=A.fgx','if(WO&&A.fg){const gx=A.fgx')
    s=rep(s,'x.fillStyle=C;x.fillText(t,X,Y)};','x.fillStyle=(s.pal&&s.pal.txt)||C;x.fillText(t,X,Y)};')
    s=rep(s,'x.fillStyle=PK;x.beginPath();x.roundRect(x0+10,y+10,bw,bh','x.fillStyle=(s.pal&&s.pal.tipSh)||PK;x.beginPath();x.roundRect(x0+10,y+10,bw,bh')
    s=rep(s,'x.fillStyle=SU;x.strokeStyle=I;x.lineWidth=3;x.beginPath();x.roundRect(x0,y,bw,bh','x.fillStyle=(s.pal&&s.pal.tipBg)||SU;x.strokeStyle=I;x.lineWidth=3;x.beginPath();x.roundRect(x0,y,bw,bh')
    s=rep(s,"{fill:C,sh:I,ol:PK},L?0.035:-0.04","(s.pal&&s.pal.word)||{fill:C,sh:I,ol:PK},L?0.035:-0.04")
    # final spread without art: links instead of contacts
    s=rep(s,"kicker:'Last page ✦ your turn',title:'Got an idea?',body:'The studio is open to brand identities, cinematic websites, motion and interactive tools. Bring the scribble.',",
          "kicker:s.kicker,title:s.title,body:s.body,")
    s=rep(s,"lines:['sites.smartlabdesign.it','linkedin.com/in/alessio-talluto','jamez.ichat@gmail.com']","lines:['sites.smartlabdesign.it/voidsignal','sites.smartlabdesign.it/giggiooo-burger-v2','sites.smartlabdesign.it']")
    s=rep(s,'bigWord(x,"LET\'S BUILD",1024,300,1760,380,{fill:SU,sh:PK,ol:CO})','bigWord(x,s.word,1024,300,1760,380,{fill:SU,sh:PK,ol:CO})')
    s=rep(s,"const names=['Cover','Introduction',...RULES.map(r=>r.title),'Let’s build','Back cover'];","const names=['Cover',...SPREADS.map(s=>s.title),'Back cover'];")
    lab='BRAND EDITION' if ed=='brand' else 'PROJECT EDITION'
    s=rep(s,"'A FIELD GUIDE BY SMARTLABDESIGN'",f"'{lab} ✦ SMARTLABDESIGN'")
    s=rep(s,"x.fillText('IDEAS',104,416);x.fillStyle=C;x.fillText('IDEAS',90,400);","x.fillText('MADE',104,416);x.fillStyle=C;x.fillText('MADE',90,400);")
    s=rep(s,"x.fillStyle=SU;x.fillText('INTO',94,500);","x.fillStyle=SU;x.fillText('THIS',94,500);")
    s=s.replace("'WORLDS.'","'WAY.'")
    s=rep(s,"'IDEAS INTO WORLDS BY'","'MADE THIS WAY BY'")
    s=s.replace("'STUDIO HANDBOOK ✦ 2026'",f"'{lab} ✦ 2026'")
    s=rep(s,'<button class="logo" id="home" aria-label="Close the book">Ideas <span>into</span><br>worlds</button>','<button class="logo" id="home" aria-label="Close the book">Made <span>this</span><br>way</button>')
    s=rep(s,'<p class="ded">For everyone who ever walked in with a scribble.<br>Keep drawing. The world part comes later.<small>Alessio, SmartLabDesign</small></p>',
          f'<p class="ded">Projects the studio shipped, and how they were made.<br>{lab.title()}<small>Alessio, SmartLabDesign</small></p>')
    s=re.sub(r'<div class="cta">.*?</div>','''<div class="cta">
    <a class="btn" href="/voidsignal/" target="_blank" rel="noopener">Void Signal ↗</a>
    <a class="btn alt" href="/giggiooo-burger-v2/" target="_blank" rel="noopener">Giggiooo Burger ↗</a>
    <a class="btn" href="/" target="_blank" rel="noopener">All the work ↗</a>
  </div>''',s,count=1,flags=re.S)
    s=s.replace('Ideas Into Worlds — SmartLabDesign',f'Made This Way ({lab.title()}) — SmartLabDesign')
    s=s.replace('Ideas Into Worlds, an interactive 3D book by SmartLabDesign','Made This Way, an interactive 3D book of SmartLabDesign projects')
    s=re.sub(r'<meta name="description" content="[^"]*">','<meta name="description" content="Made This Way: SmartLabDesign projects and how they were made, as an interactive 3D book.">',s)
    s=s.replace("fs=Math.min(fs*860/mw,330);","fs=Math.min(fs*860/mw,210);").replace("x.strokeText('WAY.',92,690)","x.strokeText('WAY.',92,700)")
    s=s.replace("const copy=document.getElementById('copy');\ncopy.onclick","const copy=document.getElementById('copy');\nif(copy)copy.onclick")
    s=s.replace('  <script src="/assets/consent.js" defer></script>\n','')
    open(R+f'projects-book/{ed}/index.html','w',encoding='utf-8').write(s)
    print(ed,'ok')

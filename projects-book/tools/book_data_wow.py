"""'wow' copy of Made This Way: same six projects in site order, re-composed.
Coordinates are page pixels on the 2048 x 1004 spread. d = depth (higher = closer to the viewer, rises further off the page)."""
ENABLED = ['right', 'giggi', 'frames', 'void', 'creative', 'pomata']

SPREADS_DATA = [
  dict(k='right', url='/the-right-one/', name='The Right One', word='THE RIGHT\nONE', side='L', kicker='Project ✦ Short film',
       title='A small disaster, a worried child, and Jack.',
       body='A loose bolt, a broken bicycle and JACK, the tiny multi-tool brave enough to become the hero. A cinematic short written, shot and cut with generative tools for a Runway contest.',
       tip='sites.smartlabdesign.it/the-right-one ↗',
       pal=dict(fill='#f1eee6', sh='#080808', ol='#ff3b24', tip='#ff5a3c', tipSh='#080808', scrim='10,6,4')),
  dict(k='giggi', url='/giggiooo-burger-v2/', name='Giggiooo Burger', word='GIGGIOOO', kicker='Project ✦ Brand experience',
       title='A burger you can take apart.',
       body='A demo brand built to show a burger restaurant what its site could be: cinematic packaging, burgers that come apart layer by layer on scroll, six drinks and a merch line, all in one warm, appetising system.',
       tip='sites.smartlabdesign.it/giggiooo-burger-v2 ↗',
       pal=dict(fill='#f6e7c8', sh='#2a1208', ol='#e7b25a', tip='#e7b25a', tipSh='#2a1208', scrim='16,9,4')),
  dict(k='frames', url='/3d-frames/', name='3D Frames', word='3D\nFRAMES', kicker='Project ✦ WebGL tool',
       title='A clip, exploded into space.',
       body='A WebGL tool that explodes any clip into a navigable space of frames, built for temporal QA of AI video, keyframe picking and motion assets.',
       tip='sites.smartlabdesign.it/3d-frames ↗',
       pal=dict(fill='#eafffe', sh='#021417', ol='#ff3d9a', tip='#ffc83a', tipSh='#ff3d9a', scrim='2,18,22')),
  dict(k='void', url='/voidsignal/', name='Void Signal', word='VOID\nSIGNAL', kicker='Project ✦ Brand · Shop · Web · Social',
       title='A streetwear label, end to end.',
       body='It began as a myth: three tribes, The Stage, The Iron and The Grid, each with its own marks, colours and voice. From that story came the graphics, a storefront, a scroll-tuned website and an Instagram that invites people in.',
       tip='sites.smartlabdesign.it/voidsignal ↗',
       pal=dict(fill='#fff1ce', sh='#000000', ol='#a98bff', tip='#a98bff', tipSh='#000000', scrim='10,3,20')),
  dict(k='creative', url='/type-lens/', name='Type Lens', word='TYPE\nLENS', kicker='Creative development ✦ Type Lab',
       title='Type that reveals its story.',
       body='Two experiments in seeing. Type Lab bends live type under a real-time glass lens; Hidden Stories hides a secret in every scene, and only the lens can find it.',
       tip='sites.smartlabdesign.it/type-lens ↗',
       pal=dict(fill='#fff3e0', sh='#2a0a3a', ol='#ff4f8b', tip='#ffd166', tipSh='#ff4f8b', scrim='24,5,40', scrimK=1.2)),
  dict(k='pomata', url='/pomata/', name='POMATA', word='POMATA', kicker='Project ✦ Fashion brand',
       title='Sicilian swagger, wearable.',
       body='Illustrated T-shirts, sun and Sicilian swagger: the POMATA collection, a runway you can explore and an official shop.',
       tip='sites.smartlabdesign.it/pomata ↗',
       pal=dict(fill='#1d2f6b', sh='#fff6dc', ol='#f2b705', tip='#f2b705', tipSh='#c4472b',
                txt='#1d2f6b', txtSh='rgba(255,246,222,.9)', txtGlow='rgba(255,246,222,.95)', scrim='255,243,214', scrimK=.98)),
]

GOLD = '#f2c46a'
CY, YL = '#59eef1', '#ffc83a'
AMBER, EMBER = '#ffb25b', '#ff6a48'
STAGE, IRON, GRID = '#ff6a58', '#efe6d0', '#4cecef'
T2 = dict(ta='left', th=400, tcy=292)          # two-line poster title, left edge on the text column
ART_DATA = {
  'right': dict(
    bg='assets/right-bg.webp', fg='assets/right-fgn.webp', side='L', tcx=118 + 450, tw=900, th=330, tcy=250, ta='left', dF=1.5, fgx=60,
    objs=[
      dict(src='assets/right-girl.webp', sx=1160, sy=262, sh=690, d=.5),
      dict(src='assets/right-bike.webp', sx=1330, sy=612, sh=350, d=.85),
      dict(src='assets/right-jack.webp', sx=1730, sy=300, sh=270, d=1.25, fly=1, fl=1, rot=9, glow='rgba(255,170,70,.75)', glowB=60),
    ],
    notes=[
      dict(t='a worried child', x=1150, y=190, size=56, rot=-4, col=AMBER, ul=1, ar=[1262, 222, 1290, 240, 1280, 272]),
      dict(t='a broken bike', x=1670, y=760, size=52, rot=3, col=AMBER, ul=1, ar=[1700, 800, 1680, 840, 1640, 850]),
      dict(t='JACK, the 12-in-1 hero', x=1500, y=232, size=54, rot=-3, col=EMBER, ul=1, ar=[1760, 256, 1800, 268, 1800, 300]),
    ]),
  'giggi': dict(
    bg='assets/giggi-bg.webp', fg='assets/giggi-fgn.webp', tcx=1500, tw=930, th=260, tcy=300, dF=1.5, fgx=-60,
    objs=[
      dict(src='assets/giggi-liner.webp',  sx=10, sy=560, sh=430, d=.3, flat=1, pop=0),
      dict(src='assets/giggi-burger.webp', sx=300, sy=330, sh=600, d=.6),
      dict(src='assets/giggi-can.webp',    sx=700, sy=520, sh=420, d=.9),
      dict(src='assets/giggi-fries.webp',  sx=70,  sy=560, sh=380, d=1.15),
    ],
    notes=[
      dict(t='scroll to take it apart', x=270, y=270, size=58, rot=-4, col=GOLD, ul=1, ar=[330, 300, 330, 330, 372, 350]),
      dict(t='six drinks', x=730, y=470, size=54, rot=4, col=GOLD, ul=1),
      dict(t='custom packaging', x=50, y=520, size=54, rot=-5, col=GOLD, ul=1),
    ]),
  'frames': dict(
    bg='assets/frames-bg.webp', fg='assets/frames-fg.webp', tcx=1090 + 430, tw=860, dF=1.5, fgx=-60, **T2,
    objs=[
      dict(src='assets/frames-deck.webp',  sx=44,  sy=170, sh=690, d=.35, fly=1, glow='rgba(89,238,241,.55)', glowB=44),
      dict(src='assets/frames-stack.webp', sx=470, sy=300, sh=430, d=.6, fly=1),
      dict(src='assets/frames-hero.webp',  sx=392, sy=452, sh=330, d=1.2, fly=1, fl=1),
      dict(src='assets/frames-bar.webp',   sx=400, sy=868, sh=80, d=.95, fly=1),
    ],
    notes=[
      dict(t='the control deck', x=50, y=128, size=54, rot=-3, col=YL, ul=1),
      dict(t='72 frames, one clip', x=560, y=226, size=58, rot=-4, col=CY, ul=1, ar=[700, 260, 750, 280, 760, 330]),
      dict(t='pick the keyframe', x=420, y=830, size=50, rot=-2, col=YL, ul=1),
    ]),
  'void': dict(
    bg='assets/void-bg.webp', fg='assets/void-fgn.webp', tcx=1030 + 430, tw=860, dF=1.5, fgx=-60, ta='left', th=350, tcy=262,
    objs=[
      dict(src='assets/void-stage.webp', sx=84,  sy=232, sh=744, d=.5),
      dict(src='assets/void-grid.webp',  sx=530, sy=232, sh=744, d=.75),
      dict(src='assets/void-iron.webp',  sx=300, sy=190, sh=794, d=1.1),
    ],
    notes=[
      dict(t='THE STAGE\nstreet rock', x=60, y=140, size=62, rot=-5, col=STAGE, ul=1, ar=[150, 206, 196, 226, 214, 246]),
      dict(t='THE IRON\ngym', x=392, y=98, size=62, rot=-2, col=IRON, ul=1, ar=[470, 160, 498, 174, 466, 202]),
      dict(t='THE GRID\ncyber tech', x=690, y=140, size=62, rot=4, col=GRID, ul=1, ar=[746, 206, 776, 222, 734, 252]),
    ]),
  'creative': dict(
    bg='assets/creative-bg.webp', fg=None, tcx=1110 + 400, tw=800, **T2,
    objs=[
      dict(src='assets/creative-card.webp', sx=36,  sy=44,  sh=250, d=.6, fly=1, rot=-5, fl=1),
      dict(src='assets/creative-lens.webp', sx=764, sy=296, sh=370, d=1.2, fly=1, fl=1, shc='rgba(20,0,40,.6)', shb=50, sho=34),
    ],
    notes=[
      dict(t='Type Lab', x=74, y=356, size=58, rot=-4, col=CY, ul=1, ar=[150, 330, 170, 318, 176, 296]),
      dict(t='real-time glass lens', x=720, y=250, size=52, rot=3, col=YL, ul=1, ar=[930, 274, 956, 284, 950, 310]),
      dict(t='the hidden story', x=790, y=740, size=52, rot=-3, col=CY, ul=1, ar=[900, 702, 912, 688, 930, 672]),
    ]),
  'pomata': dict(
    bg='assets/pomata-bg.webp', fg=None, tcx=1500, tw=900, th=250, tcy=300,
    objs=[
      dict(src='assets/pomata-m1.webp', sx=470, sy=176, sh=770, d=.45, stk=12, rot=2),
      dict(src='assets/pomata-m3.webp', sx=712, sy=206, sh=750, d=.7, stk=12, rot=-2),
      dict(src='assets/pomata-m0.webp', sx=40,  sy=206, sh=770, d=.95, stk=12, rot=-3),
      dict(src='assets/pomata-m2.webp', sx=256, sy=156, sh=820, d=1.2, stk=12, rot=2),
    ],
    notes=[
      dict(t='illustrated tees', x=60, y=130, size=56, rot=-4, col='#fff1c4', ul=1),
      dict(t='four looks', x=600, y=120, size=52, rot=3, col='#ffd166', ul=1),
    ]),
}

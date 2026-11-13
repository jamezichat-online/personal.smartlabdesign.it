"""Content + layer layout for every spread of the native edition, in the order of the site's project grid.
Coordinates are page pixels on the 2048 x 1004 spread. d = parallax depth (higher = closer to the viewer)."""
ENABLED = ['right', 'giggi', 'frames', 'void', 'creative', 'pomata']

SPREADS_DATA = [
  dict(k='right', word='THE RIGHT ONE', side='L', kicker='Project ✦ Short film',
       title='A small disaster, a worried child, and Jack.',
       body='A loose bolt, a broken bicycle and JACK, the tiny multi-tool brave enough to become the hero. A cinematic short written, shot and cut with generative tools for a Runway contest.',
       tip='sites.smartlabdesign.it/the-right-one: watch the film.',
       pal=dict(fill='#f1eee6', sh='#080808', ol='#ff3b24', tip='#ff5a3c', tipSh='#080808')),
  dict(k='giggi', word='GIGGIOOO', kicker='Project ✦ Brand experience',
       title='A burger you can take apart.',
       body='A demo brand built to show a burger restaurant what its site could be: cinematic packaging, burgers that come apart layer by layer on scroll, six drinks and a merch line, all in one warm, appetising system.',
       tip='sites.smartlabdesign.it/giggiooo-burger-v2: scroll the burger open.',
       pal=dict(fill='#f6e7c8', sh='#2a1208', ol='#e7b25a', tip='#e7b25a', tipSh='#2a1208')),
  dict(k='frames', word='3D FRAMES', kicker='Project ✦ WebGL tool',
       title='A clip, exploded into space.',
       body='A WebGL tool that explodes any clip into a navigable space of frames, built for temporal QA of AI video, keyframe picking and motion assets.',
       tip='sites.smartlabdesign.it/3d-frames: fly through a clip.',
       pal=dict(fill='#eafffe', sh='#021417', ol='#ff3d9a', tip='#ffc83a', tipSh='#ff3d9a')),
  dict(k='void', word='VOID SIGNAL', kicker='Project ✦ Brand · Shop · Web · Social',
       title='A streetwear label, end to end.',
       body='It began as a myth: three tribes, The Stage, The Iron and The Grid, each with its own marks, colours and voice. From that story came the graphics, a storefront, a scroll-tuned website and an Instagram that invites people in.',
       tip='sites.smartlabdesign.it/voidsignal: the tribes, the drops and the shop.',
       pal=dict(fill='#fff1ce', sh='#000000', ol='#a98bff', tip='#a98bff', tipSh='#000000')),
  dict(k='creative', word='TYPE LENS', kicker='Creative development ✦ Type Lab',
       title='Type that reveals its story.',
       body='Creative development around type: a Type Lab and Hidden Stories, where a real-time glass lens reveals the story under the letters.',
       tip='sites.smartlabdesign.it/type-lens: move the lens over the type.',
       pal=dict(fill='#fff3e0', sh='#2a0a3a', ol='#ff4f8b', tip='#ffd166', tipSh='#ff4f8b')),
  dict(k='pomata', word='POMATA', kicker='Project ✦ Fashion brand',
       title='Sicilian swagger, wearable.',
       body='Illustrated T-shirts, sun and Sicilian swagger: the POMATA collection, a runway you can explore and an official shop.',
       tip='sites.smartlabdesign.it/pomata: the collection and the shop.',
       pal=dict(fill='#1d2f6b', sh='#fff1c4', ol='#f2b705', tip='#f2b705', tipSh='#c4472b')),
]

GOLD = '#f2c46a'
CY, YL = '#59eef1', '#ffc83a'
AMBER, EMBER = '#ffb25b', '#ff6a48'
STAGE, IRON, GRID = '#ff6a58', '#efe6d0', '#4cecef'
ART_DATA = {
  'void': dict(
    bg='assets/void-bg.webp', fg='assets/void-fgn.webp', tcx=1430, tw=1100, dF=1.5, fgx=-60,
    objs=[
      dict(src='assets/void-stage.webp', sx=84,  sy=196, sh=780, d=.45),
      dict(src='assets/void-grid.webp',  sx=520, sy=196, sh=780, d=.7),
      dict(src='assets/void-iron.webp',  sx=296, sy=150, sh=830, d=1.05),
    ],
    notes=[
      dict(t='THE STAGE\nstreet rock', x=64, y=112, size=62, rot=-5, col=STAGE, ul=1, ar=[150, 176, 196, 196, 214, 214]),
      dict(t='THE IRON\ngym', x=392, y=66, size=62, rot=-2, col=IRON, ul=1, ar=[470, 128, 498, 142, 466, 168]),
      dict(t='THE GRID\ncyber tech', x=668, y=112, size=62, rot=4, col=GRID, ul=1, ar=[726, 176, 756, 192, 712, 222]),
    ]),
  'giggi': dict(
    bg='assets/giggi-bg.webp', fg='assets/giggi-fgn.webp', tcx=1450, tw=1120, dF=1.5, fgx=-60,
    objs=[
      dict(src='assets/giggi-liner.webp',  sx=10, sy=560, sh=430, d=.35, flat=1),
      dict(src='assets/giggi-burger.webp', sx=300, sy=330, sh=600, d=.55),
      dict(src='assets/giggi-can.webp',    sx=700, sy=520, sh=420, d=.8),
      dict(src='assets/giggi-fries.webp',  sx=70,  sy=560, sh=380, d=1.0),
    ],
    notes=[
      dict(t='scroll to take it apart', x=270, y=270, size=58, rot=-4, col=GOLD, ul=1, ar=[330, 300, 330, 330, 372, 350]),
      dict(t='six drinks', x=720, y=470, size=54, rot=4, col=GOLD, ul=1),
      dict(t='custom packaging', x=60, y=520, size=54, rot=-5, col=GOLD, ul=1),
    ]),
  'right': dict(
    bg='assets/right-bg.webp', fg='assets/right-fgn.webp', side='L', tcx=590, tw=930, dF=1.5, fgx=60,
    objs=[
      dict(src='assets/right-girl.webp', sx=1200, sy=250, sh=700, d=.5),
      dict(src='assets/right-jack.webp', sx=1735, sy=500, sh=370, d=.8, fly=1, fl=1),
      dict(src='assets/right-bike.webp', sx=1360, sy=620, sh=340, d=1.0),
    ],
    notes=[
      dict(t='a worried child', x=1130, y=190, size=58, rot=-4, col=AMBER, ul=1, ar=[1290, 222, 1330, 240, 1318, 270]),
      dict(t='a broken bike', x=1400, y=540, size=52, rot=3, col=AMBER, ul=1, ar=[1470, 572, 1500, 588, 1488, 624]),
      dict(t='JACK, 12-in-1', x=1650, y=390, size=58, rot=4, col=EMBER, ul=1, ar=[1790, 426, 1830, 440, 1818, 492]),
    ]),
  'frames': dict(
    bg='assets/frames-bg.webp', fg='assets/frames-fg.webp', tcx=1500, tw=980, dF=1.5, fgx=-60,
    objs=[
      dict(src='assets/frames-deck.webp', sx=40, sy=190, sh=640, d=.3, fly=1, fl=1),
      dict(src='assets/frames-stack.webp', sx=400, sy=330, sh=430, d=.5, fly=1),
      dict(src='assets/frames-hero.webp',  sx=250, sy=430, sh=340, d=1.1, fly=1, fl=1),
      dict(src='assets/frames-bar.webp',   sx=300, sy=850, sh=96, d=.9, fly=1),
    ],
    notes=[
      dict(t='72 frames, one clip', x=470, y=250, size=58, rot=-4, col=CY, ul=1, ar=[590, 286, 640, 310, 650, 360]),
      dict(t='pick the keyframe', x=290, y=372, size=50, rot=-3, col=YL, ul=1),
      dict(t='the control deck', x=40, y=150, size=52, rot=-3, col=YL, ul=1),
      dict(t='temporal QA for AI video', x=330, y=800, size=50, rot=2, col=CY, ul=1),
    ]),
  'creative': dict(
    bg='assets/creative-bg.webp', fg=None, tcx=1500, tw=980, dF=1.4, fgx=-60,
    objs=[
      dict(src='assets/creative-car.webp',  sx=330, sy=590, sh=300, d=.45, fly=1),
      dict(src='assets/creative-lens.webp', sx=50,  sy=250, sh=540, d=.9, fly=1, fl=1),
      dict(src='assets/creative-type.webp', sx=640, sy=300, sh=560, d=1.1, fly=1),
    ],
    notes=[
      dict(t='real-time glass lens', x=70, y=200, size=54, rot=-4, col=YL, ul=1, ar=[220, 236, 260, 250, 250, 300]),
      dict(t='Type Lab', x=700, y=250, size=58, rot=3, col='#59eef1', ul=1),
      dict(t='hidden stories', x=330, y=930, size=50, rot=-2, col=YL, ul=1),
    ]),
  'pomata': dict(
    bg='assets/pomata-bg.webp', fg=None, tcx=1500, tw=960, dF=1.3, fgx=-60,
    objs=[
      dict(src='assets/pomata-m1.webp', sx=470, sy=170, sh=780, d=.4, fly=1),
      dict(src='assets/pomata-m3.webp', sx=700, sy=200, sh=760, d=.65, fly=1),
      dict(src='assets/pomata-m0.webp', sx=40,  sy=200, sh=780, d=.9, fly=1),
      dict(src='assets/pomata-m2.webp', sx=250, sy=150, sh=830, d=1.15, fly=1),
    ],
    notes=[
      dict(t='illustrated tees', x=60, y=130, size=56, rot=-4, col='#fff1c4', ul=1),
      dict(t='four looks', x=560, y=120, size=52, rot=3, col='#ffd166', ul=1),
    ]),
}

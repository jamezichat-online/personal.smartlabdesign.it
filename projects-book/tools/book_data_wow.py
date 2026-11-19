"""'wow' copy of Made This Way: same projects in site order, re-composed.
Coordinates are page pixels on the 2048 x 1004 spread. d = depth (higher = closer to the viewer, rises further off the page)."""
ENABLED = ['right', 'giggi', 'frames', 'void', 'creative', 'pomata', 'rose']

SPREADS_DATA = [
  dict(k='right', url='/the-right-one/', name='The Right One', word='THE RIGHT\nONE', side='L', kicker='Project ✦ Short film',
       title='A small disaster, a worried child, and Jack.',
       body='A loose bolt, a broken bicycle and JACK, the tiny multi-tool brave enough to become the hero. A cinematic short written, shot and cut with generative tools for a Runway contest.',
       tip='sites.smartlabdesign.it/the-right-one ↗',
       pal=dict(fill='#f1eee6', sh='#080808', ol='#ff3b24', tip='#ff5a3c', tipSh='#080808', scrim='10,6,4')),
  dict(k='giggi', url='/giggiooo-burger-v2/', name='Giggiooo Burger', word='GIGGIOOO\nBURGER', kicker='Project ✦ Brand experience',
       title='A burger you can take apart.',
       body='A demo brand built to show a burger restaurant what its site could be: cinematic packaging, burgers that come apart layer by layer on scroll, a build-your-own configurator and a merch line, all in one warm, appetising system.',
       tip='sites.smartlabdesign.it/giggiooo-burger-v2 ↗',
       pal=dict(fill='#f6e7c8', sh='#2a1208', ol='#e7b25a', tip='#e7b25a', tipSh='#2a1208', scrim='16,9,4')),
  dict(k='frames', url='/3d-frames/', name='3D Frames', word='3D\nFRAMES', kicker='Project ✦ WebGL tool',
       title='A clip, exploded into space.',
       body='A WebGL tool that splits any video into its frames and lays them out in a space you can walk through: temporal QA for AI video, keyframe picking and motion assets, with a player that scrubs the whole stack.',
       tip='sites.smartlabdesign.it/3d-frames ↗',
       pal=dict(fill='#eafffe', sh='#021417', ol='#ff3d9a', tip='#ffc83a', tipSh='#ff3d9a', scrim='2,18,22')),
  dict(k='void', url='/voidsignal/', name='Void Signal', word='VOID\nSIGNAL', kicker='Project ✦ Brand · Shop · Web · Social',
       title='A streetwear label, end to end.',
       body='It began as a myth: three tribes, The Stage, The Iron and The Grid, each with its own marks, colours and voice. From that story came the graphics, a storefront, a website with an animated 3D rack of hanging pieces, and an Instagram that invites people in.',
       tip='sites.smartlabdesign.it/voidsignal ↗',
       pal=dict(fill='#fff1ce', sh='#000000', ol='#a98bff', tip='#a98bff', tipSh='#000000', scrim='10,3,20')),
  dict(k='creative', url='/type-lens/', name='Type Lens', word='TYPE\nLENS', kicker='Creative development ✦ Type Lab',
       title='Type that reveals its story.',
       body='Three experiments in seeing, all through one real-time glass lens. Type Lab bends live type, Hidden Stories hides a secret in every scene, and Hidden Layers peels an image back to its blueprint, palette and prompt.',
       tip='sites.smartlabdesign.it/type-lens ↗',
       pal=dict(fill='#fff3e0', sh='#2a0a3a', ol='#ff4f8b', tip='#ffd166', tipSh='#ff4f8b', scrim='24,5,40', scrimK=1.2)),
  dict(k='pomata', url='/pomata/', name='POMATA', word='POMATA', kicker='Project ✦ Fashion brand',
       title='Sicilian swagger, wearable.',
       body='POMATA takes its name from the Sicilian “fare pomata”: going out, having fun, showing off with a grin. A T-shirt label of ironic illustrations and one-line jokes, built as a whole world: graphics, a collection, an interactive runway and an official shop. More than a style. A state of mind.',
       tip='sites.smartlabdesign.it/pomata ↗',
       pal=dict(fill='#c2342a', sh='#fff6dc', ol='#f2b705', tip='#f2b705', tipSh='#c4472b',
                txt='#111111', txtSh='rgba(255,246,222,.9)', txtGlow='rgba(255,246,222,.95)', scrim='255,243,214', scrimK=.98)),
  dict(k='rose', url='/roses-gratitude/', name="Rose's Gratitude Bloom", word='GRATITUDE\nBLOOM', kicker="Project ✦ Interactive tool ✦ Rose's Flower Shop",
       title='A thank-you that blooms.',
       body="A message composer for Rose's Flower Shop, a personal tribute to Derrick Rose. Write a thank-you and watch vines and roses grow along the lettering, then choose the hand, the paper and the arrangement and export it as PNG, PDF, SVG, video or a shareable link.",
       tip='sites.smartlabdesign.it/roses-gratitude ↗',
       pal=dict(fill='#f3e7c8', sh='#1c0d08', ol='#c0392b', tip='#e9c9a0', tipSh='#7a1f15', scrim='20,8,4', scrimK=1.1)),
]

GOLD = '#f2c46a'
CY, YL = '#59eef1', '#ffc83a'
AMBER, EMBER = '#ffb25b', '#ff6a48'
STAGE, IRON, GRID = '#ff6a58', '#efe6d0', '#4cecef'
CAM = dict(F=1180, cx=.436, cy=.588)           # 3D Frames block: bigger, a little to the right
T2 = dict(ta='left', th=400, tcy=292)          # two-line poster title, left edge on the text column
# giggiooo: ingredient sprites (logical height from the configurator), stacked as an exploded burger
GX = [('top-brioche', 148.8), ('signature-a', 77.7), ('lattuga-a', 88.7), ('pomodoro-a', 58.4), ('bacon-a', 76.6), ('cheddar-a', 84.9), ('manzo-a', 67.3), ('bun-brioche', 105.8)]
def exploded(cx, bottom, u=.8, gap=22):
    out, y = [], bottom
    n = len(GX)
    for i, (nm, h) in enumerate(reversed(GX)):
        sh = h * u; y -= sh
        out.append(dict(src='assets/gx-%s.webp' % nm, sx=0, sy=round(y), sh=round(sh), d=round(.5 + i * .12, 2), fly=1, fl=1 if i > 2 else 0, shb=22, sho=14, _nm=nm))
        y -= gap
    return out
def centred(objs, cx, widths):
    for o in objs: o['sx'] = round(cx - widths[o.pop('_nm')] * .8 / 2)
    return objs
GW = {'top-brioche': 318.6, 'signature-a': 278.4, 'lattuga-a': 358.9, 'pomodoro-a': 265.7, 'bacon-a': 382.0, 'cheddar-a': 308.7, 'manzo-a': 297.7, 'bun-brioche': 318.6}
ART_DATA = {
  'right': dict(
    bg='assets/right-bg.webp', fg='assets/right-fgn.webp', side='L', tcx=118 + 450, tw=900, th=330, tcy=250, ta='left', dF=1.5, fgx=-90,
    objs=[
      dict(src='assets/right-girl.webp', sx=1130, sy=262, sh=690, d=.5),
      dict(src='assets/right-bike.webp', sx=1290, sy=482, sh=480, d=.85),
      dict(src='assets/right-jack.webp', sx=1760, sy=290, sh=270, d=1.25, fly=1, fl=1, rot=9, glow='rgba(255,170,70,.75)', glowB=60),
    ],
    notes=[
      dict(t='a worried child', x=1120, y=190, size=56, rot=-4, col=AMBER, ul=1, ar=[1232, 222, 1260, 240, 1250, 272]),
      dict(t='a broken bike', x=1440, y=462, size=54, rot=-3, col=AMBER, ul=1, ar=[1560, 484, 1590, 500, 1566, 528]),
      dict(t='JACK, the 12-in-1 hero', x=1500, y=232, size=54, rot=-3, col=EMBER, ul=1, ar=[1790, 256, 1830, 268, 1830, 296]),
    ]),
  'giggi': dict(
    bg='assets/giggi-bg.webp', fg='assets/giggi-fgn.webp', tcx=1500, tw=900, th=360, tcy=270, ta='left', dF=1.5, fgx=-60,
    objs=[
      dict(src='assets/giggi-panel.webp', sx=22, sy=290, sh=490, d=.25, fly=1, fl=1, rot=-3, glow='rgba(231,178,90,.35)', glowB=40),
      dict(src='assets/giggi-liner.webp', sx=270, sy=664, sh=250, d=.3, flat=1, pop=0),
      dict(src='assets/giggi-fries.webp', sx=700, sy=476, sh=360, d=1.15),
      *centred(exploded(545, 852), 545, GW),
    ],
    notes=[
      dict(t='scroll to take it apart', x=640, y=190, size=54, rot=3, col=GOLD, ul=1, ar=[690, 246, 660, 262, 640, 290]),
      dict(t='custom packaging', x=640, y=915, size=52, rot=-3, col=GOLD, ul=1),
      dict(t='pick every ingredient', x=40, y=205, size=54, rot=-3, col=GOLD, ul=1, ar=[200, 252, 220, 270, 216, 292]),
    ]),
  'frames': dict(
    bg='assets/frames-bg.webp', fg='assets/frames-fg.webp', tcx=1090 + 430, tw=860, dF=1.5, fgx=-60, **T2,
    imgs=dict(thumbs='assets/frames-thumbs.webp', big='assets/frames-big.webp'),
    objs=[
      dict(src='assets/frames-deck.webp', sx=8, sy=70, sh=910, d=.35, fly=1, glow='rgba(89,238,241,.55)', glowB=44),
    ],
    live=[
      dict(kind='fstack', x=250, y=90, w=840, h=860, d=.6, cam=CAM),
      dict(kind='fhero',  x=250, y=90, w=840, h=860, d=1.15, fl=1, cam=CAM),
      dict(kind='fbar',   x=330, y=868, w=680, h=80, d=.95, fl=1),
    ],
    notes=[
      dict(t='the control deck', x=40, y=62, size=54, rot=-3, col=YL, ul=1),
      dict(t='the video, split into frames', x=470, y=96, size=54, rot=-3, col=CY, ul=1),
      dict(t='pick the keyframe', x=560, y=832, size=50, rot=-2, col=YL, ul=1),
    ]),
  'void': dict(
    bg='assets/void-bg.webp', fg='assets/void-fgn.webp', tcx=1030 + 430, tw=860, dF=1.5, fgx=-30, fgk=1.25, fgy=70, ta='left', th=350, tcy=262,
    objs=[
      dict(src='assets/void-grid.webp',  sx=660, sy=262, sh=692, d=.45),
      dict(src='assets/void-stage.webp', sx=236, sy=222, sh=748, d=.9),
      dict(src='assets/void-iron.webp',  sx=452, sy=172, sh=812, d=1.4),
    ],
    notes=[
      dict(t='THE STAGE\nstreet rock', x=150, y=140, size=62, rot=-5, col=STAGE, ul=1, ar=[250, 206, 292, 226, 306, 246]),
      dict(t='THE IRON\ngym', x=470, y=104, size=62, rot=-2, col=IRON, ul=1, ar=[548, 166, 576, 180, 546, 208]),
      dict(t='THE GRID\ncyber tech', x=770, y=150, size=62, rot=4, col=GRID, ul=1, ar=[826, 216, 856, 232, 818, 262]),
    ]),
  'creative': dict(
    bg='assets/creative-bg.webp', fg=None, tcx=1030 + 430, tw=860, th=380, tcy=270, ta='left',
    objs=[
      dict(src='assets/creative-c0.webp', sx=60, sy=736, sh=210, d=.6, fly=1, rot=-5, fl=1),
      dict(src='assets/creative-c1.webp', sx=368, sy=752, sh=210, d=.8, fly=1, rot=2, fl=1),
      dict(src='assets/creative-c2.webp', sx=676, sy=736, sh=210, d=1.0, fly=1, rot=-3, fl=1),
    ],
    live=[
      dict(kind='lens', x=780, y=330, R=150, mag=1.8, d=1.25, tx=1751, ty=334, trot=-5, fs=40, msg=['SMARTLAB', 'DESIGN'], zone=[10, 30, 2038, 700],
           path=[[780, 330, 1.7], [520, 470, 1.4], [1751, 336, 3.6], [1300, 560, 1.3], [400, 200, 1.4]]),
    ],
    notes=[
      dict(t='Type Lab', x=72, y=700, size=52, rot=-4, col=CY, ul=1),
      dict(t='Hidden Stories', x=380, y=716, size=52, rot=2, col=YL, ul=1),
      dict(t='Hidden Layers', x=688, y=700, size=52, rot=-3, col=CY, ul=1),
      dict(t='drag the real lens', x=90, y=100, size=54, rot=-3, col=YL, ul=1),
    ]),
  'pomata': dict(
    bg='assets/pomata-bg.webp', fg=None, tcx=1500, tw=900, th=250, tcy=300,
    imgs={'r%d' % i: 'assets/pm-ring-%d.webp' % i for i in (0, 1, 2, 4, 6, 7, 9, 11)},
    live=[
      dict(kind='carousel', x=12, y=100, w=1000, h=904, d=.8, keys=['r%d' % i for i in (0, 1, 2, 4, 6, 7, 9, 11)], mh=700, every=2.8, pop=.3),
    ],
    notes=[
      dict(t='illustrated tees', x=60, y=130, size=56, rot=-4, col='#b73225', ul=1),
      dict(t='the runway turns', x=640, y=130, size=52, rot=3, col='#b73225', ul=1),
    ]),
  'rose': dict(
    bg='assets/rose-bg.webp', fg=None, tcx=1500, tw=900, th=330, tcy=300,
    imgs={'post': 'assets/rose-bloom-post.webp'},
    live=[
      dict(kind='video', x=210, y=470, w=810, h=534, d=1.0, fl=1, src='assets/rose-bloom.webm', srcs=['assets/rose-bloom.webm', 'assets/rose-bloom.mp4'], post='post', cw=700, ch=436, rot=-2.5, pop=.5),
    ],
    notes=[
      dict(t='type it, watch it bloom', x=40, y=70, size=52, rot=-4, col='#f0c27b', ul=1),
    ]),
}

SPECS = []
SPECS += [
  ('obj', 'mtw-12-void-stage-tee.png', 'void-stage.webp', dict(maxw=900)),
]
SPECS += [('fg', 'mtw-13-void-fg-near.png', 'void-fgn.webp', dict(soft=[(230, 520, 760, 1004, .8, 120)]))]
SPECS += [
  ('obj', 'mtw-14-giggi-burger.png', 'giggi-burger.webp', dict(maxw=1200)),
  ('split', 'mtw-15-giggi-fries-can.png', ['giggi-fries.webp', 'giggi-can.webp']),
  ('bg', 'mtw-7-giggi-native-bg.png', 'giggi-bg.webp', dict(bias=.6)),
  ('fg', 'mtw-8-giggi-native-fg.png', 'giggi-fgn.webp', dict(erase=(1500, 640))),
]
SPECS += [('obj', 'mtw-16-giggi-liner.png', 'giggi-liner.webp', dict(maxw=1500))]
SPECS += [('split', 'mtw-17-right-objs.png', ['right-girl.webp', 'right-bike.webp', 'right-jack.webp'])]
SPECS += [('bg', 'mtw-18-right-bg.png', 'right-bg.webp', dict(flip=True))]
SPECS += [('fg', 'mtw-19-right-fg.png', 'right-fgn.webp', dict(flip=True, soft=[(1380, 520, 1980, 1004, .4, 220), (1660, 470, 1990, 900, .8, 90)]))]
_S = 1.672
HERO = (20, 40, 305, 340); BAR = (486, 468, 975, 525)
def _b(b): return tuple(int(v * _S) for v in b)
SPECS += [
  ('region', 'mtw-20-frames-objs.png', 'frames-hero.webp', dict(box=_b(HERO))),
  ('region', 'mtw-20-frames-objs.png', 'frames-bar.webp', dict(box=_b(BAR))),
  ('region', 'mtw-20-frames-objs.png', 'frames-stack.webp', dict(box=_b((270, 55, 870, 500)), erase=[_b(HERO), _b(BAR)])),
]
SPECS += [('bg', 'mtw-21-frames-bg.png', 'frames-bg.webp')]
SPECS += [('fg', 'mtw-22-frames-fg.png', 'frames-fg.webp', dict(soft=[(0,540,700,1004,.55,120)]))]
SPECS += [('obj', 'mtw-23-frames-deck.png', 'frames-deck.webp', dict(maxw=700))]
SPECS += [
  ('bg', 'mtw-24-creative-bg.png', 'creative-bg.webp'),
  ('split', 'mtw-25-creative-objs.png', ['creative-lens.webp', 'creative-car.webp', 'creative-type.webp'], dict(gap=8)),
]
SPECS += [('obj', f'pomata-model-{i}.webp', f'pomata-m{i}.webp', dict(maxw=700)) for i in range(4)]
SPECS += [('bg', 'mtw-26-pomata-bg.png', 'pomata-bg.webp')]

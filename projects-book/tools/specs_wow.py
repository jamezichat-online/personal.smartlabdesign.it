"""Layer files that differ from the native edition (everything else in wow/assets is a straight copy of native/assets)."""
SPECS = [
  # The Right One: the blurred pliers sat on the bike; only the wrench and the sparks stay, far right
  ('fg', 'mtw-19-right-fg.png', 'right-fgn.webp', dict(flip=True, soft=[(1150, 560, 1760, 1100, 1, 70)])),
  # 3D Frames: keep the glass shards off the control deck
  ('fg', 'mtw-22-frames-fg.png', 'frames-fg.webp', dict(soft=[(-200, 120, 470, 930, .92, 110), (0, 540, 700, 1004, .5, 120)])),
]

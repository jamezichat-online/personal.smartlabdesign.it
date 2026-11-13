"""Native edition layer files. Every object is its own trimmed transparent webp (assets/<spread>-<name>.webp)."""
import os
from assetlib import *
NA = R + 'projects-book/native/assets/'
def A(n): return NA + n

def build(spec):
    for kind, src, dst, *opt in spec:
        o = opt[0] if opt else {}
        if kind == 'bg': bg(src, A(dst), **o)
        elif kind == 'fg': fg(src, A(dst), **o)
        elif kind == 'obj': subj(src, A(dst), **o)
        elif kind == 'region': region(src, A(dst), **o)
        elif kind == 'split': split_columns(src, [A(d) for d in dst], **o)

SPEC = [
  # Void Signal: three separate people (one tribe each) + street + foreground
  ('obj', 'mtw-10-void-grid-ghost.png', 'void-grid.webp', dict(maxw=900)),
  ('obj', 'mtw-11-void-iron-hoodie.png', 'void-iron.webp', dict(maxw=900)),
]
import sys
for extra in ('spec_void', 'spec_giggi', 'spec_p3'):
    pass
if __name__ == '__main__':
    from specs import SPECS
    build(SPEC + SPECS)

"""Turn the raw ChatGPT renders in projects-book/source/ into the layer files used by the two books.

Layers per spread: bg (opaque, exactly 2048x1004), subj (trimmed transparent), fg (transparent, 2048x1004).
Nothing here is taken from ideas-into-worlds: every layer comes from this book's own sources.
"""
import os, shutil
from PIL import Image, ImageOps

R = '/home/claude/personal.smartlabdesign.it/'
S = R + 'projects-book/source/'
W, H = 2048, 1004


def cover(im, w=W, h=H, bias=0.5):
    """Scale to cover w x h and crop (bias 0..1 = how much of the crop is taken from the top)."""
    k = max(w / im.width, h / im.height)
    nw, nh = round(im.width * k), round(im.height * k)
    im = im.resize((nw, nh), Image.LANCZOS)
    x0 = (nw - w) // 2
    y0 = round((nh - h) * bias)
    return im.crop((x0, y0, x0 + w, y0 + h))


def save(im, path, q=88):
    im.save(path, 'WEBP', quality=q, method=6)
    print(os.path.relpath(path, R), im.size, os.path.getsize(path) // 1024, 'KB')


def bg(src, dst, bias=0.5):
    save(cover(Image.open(S + src).convert('RGB'), bias=bias), dst, 86)


def fg(src, dst, erase=None, feather=90):
    """erase=(x0, y0) clears the lower-right block x>=x0, y>=y0 (with a soft edge) so the layer never sits on the tip box."""
    im = cover(Image.open(S + src).convert('RGBA'), bias=0.5)
    if erase:
        import numpy as np
        a = np.asarray(im.getchannel('A'), dtype='float32')
        xs = np.arange(W, dtype='float32')[None, :]
        ys = np.arange(H, dtype='float32')[:, None]
        mx = np.clip((xs - erase[0]) / feather, 0, 1)
        my = np.clip((ys - erase[1]) / feather, 0, 1)
        a = a * (1 - mx * my)
        im.putalpha(Image.fromarray(a.astype('uint8')))
    save(im, dst, 88)


def subj(src, dst, pad=8, maxw=1500):
    im = Image.open(src if os.path.isabs(src) else S + src).convert('RGBA')
    a = im.getchannel('A').point(lambda v: 255 if v > 12 else 0)
    bb = a.getbbox()
    im = im.crop((max(bb[0] - pad, 0), max(bb[1] - pad, 0), min(bb[2] + pad, im.width), min(bb[3] + pad, im.height)))
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    save(im, dst, 90)


def mirror(src, dst, q=86):
    im = ImageOps.mirror(Image.open(src).convert('RGBA' if src.endswith('fg.webp') else 'RGB'))
    save(im, dst, q)


for ed in ('brand', 'native'):
    os.makedirs(R + f'projects-book/{ed}/assets', exist_ok=True)
A = lambda ed, n: R + f'projects-book/{ed}/assets/{n}'

# ---- brand edition (SmartLabDesign Miami-sunset illustration) ----
bg('mtw-1-sld-giggi-bg-diner.png', A('brand', 'giggi-bg.webp'), bias=0.55)
subj('mtw-2-sld-giggi-subj.png', A('brand', 'giggi-subj.webp'))
fg('mtw-3-sld-giggi-fg-diner.png', A('brand', 'giggi-fg.webp'), erase=(1500, 640))
fg('mtw-4b-sld-void-fg.png', A('brand', 'void-fg.webp'))

# ---- native edition (each project's own look) ----
bg('mtw-5-void-native-bg.png', A('native', 'void-bg.webp'), bias=0.6)
subj('mtw-6-void-native-subj.png', A('native', 'void-subj.webp'))
if os.path.exists(S + 'mtw-9-void-native-fg.png'):
    fg('mtw-9-void-native-fg.png', A('native', 'void-fg.webp'))
bg('mtw-7-giggi-native-bg.png', A('native', 'giggi-bg.webp'), bias=0.6)
subj(R + 'giggiooo-burger-v2/assets/fattillu-scene.webp', A('native', 'giggi-subj.webp'))  # the project's own real packshot
fg('mtw-8-giggi-native-fg.png', A('native', 'giggi-fg.webp'), erase=(1500, 640))

# ---- last spread: the Void Signal world; only the background is mirrored so page 3 does not repeat page 1 ----
for ed in ('brand', 'native'):
    mirror(A(ed, 'void-bg.webp'), A(ed, 'final-bg.webp'))

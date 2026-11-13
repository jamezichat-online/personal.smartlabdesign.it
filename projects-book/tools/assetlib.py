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


def bg(src, dst, bias=0.5, flip=False):
    im = cover(Image.open(S + src).convert('RGB'), bias=bias)
    save(ImageOps.mirror(im) if flip else im, dst, 86)


def fg(src, dst, erase=None, feather=90, soft=None, flip=False):
    """erase=(x0, y0) clears the lower-right block x>=x0, y>=y0 (with a soft edge) so the layer never sits on the tip box."""
    im = cover(Image.open(S + src).convert('RGBA'), bias=0.5)
    if flip: im = ImageOps.mirror(im)
    if erase:
        import numpy as np
        a = np.asarray(im.getchannel('A'), dtype='float32')
        xs = np.arange(W, dtype='float32')[None, :]
        ys = np.arange(H, dtype='float32')[:, None]
        mx = np.clip((xs - erase[0]) / feather, 0, 1)
        my = np.clip((ys - erase[1]) / feather, 0, 1)
        a = a * (1 - mx * my)
        im.putalpha(Image.fromarray(a.astype('uint8')))
    if soft:
        import numpy as np
        a = np.asarray(im.getchannel('A'), dtype='float32')
        xs = np.arange(W, dtype='float32')[None, :]
        ys = np.arange(H, dtype='float32')[:, None]
        for x0, y0, x1, y1, k, f in soft:   # soften alpha inside a box (feathered), keeps the layer present but off the subject
            m = np.clip((xs - x0) / f, 0, 1) * np.clip((x1 - xs) / f, 0, 1) * np.clip((ys - y0) / f, 0, 1) * np.clip((y1 - ys) / f, 0, 1)
            a = a * (1 - k * m)
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



def split_columns(src, dsts, pad=8, maxw=1500, gap=24):
    """Split a sheet of separate transparent objects (left -> right) into one trimmed webp each."""
    import numpy as np
    im = Image.open(S + src).convert('RGBA')
    a = np.array(im.getchannel('A')) > 12
    cols = a.any(axis=0)
    runs, start = [], None
    for x, v in enumerate(cols):
        if v and start is None: start = x
        if not v and start is not None:
            runs.append([start, x]); start = None
    if start is not None: runs.append([start, len(cols)])
    merged = []
    for r in runs:                      # bridge tiny gaps inside one object
        if merged and r[0] - merged[-1][1] < gap: merged[-1][1] = r[1]
        else: merged.append(r)
    merged = [r for r in merged if r[1] - r[0] > 40]
    assert len(merged) == len(dsts), ('objects found', len(merged), merged)
    for (x0, x1), dst in zip(merged, dsts):
        part = im.crop((x0, 0, x1, im.height))
        tmp = S + '_part.png'; part.save(tmp)
        subj(tmp, dst, pad=pad, maxw=maxw)
        os.remove(tmp)


def region(src, dst, box, erase=(), pad=8, maxw=1500):
    """Cut one object out of a sheet by pixel box (sheet coords); other boxes in `erase` are cleared first."""
    from PIL import ImageDraw
    im = Image.open(S + src).convert('RGBA')
    d = ImageDraw.Draw(im)
    for e in erase: d.rectangle(e, fill=(0, 0, 0, 0))
    part = im.crop(box)
    tmp = S + '_part.png'; part.save(tmp)
    subj(tmp, dst, pad=pad, maxw=maxw)
    os.remove(tmp)

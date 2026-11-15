"""Type Lens spread, rebuilt from the project's own graphics (type-lens/): the Ocean Drive scene of Hidden Stories as the background
(the real GLSL lens is a live layer, see wow_live.js) and one card per experiment: Type Lab, Hidden Stories, Hidden Layers."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from assetlib import R, save
T = R + 'type-lens/'; O = R + 'projects-book/wow/assets/'
W, H = 2048, 1004

# ---- background: the scene sits on the right-hand art page (so the hidden sign is reachable), the text page continues it out of focus
src = Image.open(T + 'assets/ocean.webp').convert('RGB')
k = H / src.height; sw = round(src.width * k)
sc = src.resize((sw, H), Image.LANCZOS)
x0 = W - sw
bg = Image.new('RGB', (W, H))
ext = sc.crop((0, 0, x0 + 60, H)).transpose(Image.FLIP_LEFT_RIGHT)
bg.paste(ext, (0, 0)); bg.paste(sc, (x0, 0))
soft = bg.filter(ImageFilter.GaussianBlur(24))
m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
for x in range(W): d.line([(x, 0), (x, H)], fill=max(0, min(255, int((1120 - x) / 340 * 255))))
bg = Image.composite(soft, bg, m)
save(bg, O + 'creative-bg.webp', 86)
print('sign at', x0 + round(.855 * sw), round(.245 * H))

# ---- one card per experiment, straight from the published tool
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
def card(img, label, dst, size=(560, 400), crop=None):
    im = img.convert('RGB')
    if crop: im = im.crop(crop)
    k = max(size[0] / im.width, size[1] / im.height); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im = im.crop(((im.width - size[0]) // 2, (im.height - size[1]) // 2, (im.width + size[0]) // 2, (im.height + size[1]) // 2))
    pad = 10; c = Image.new('RGBA', (size[0] + pad * 2, size[1] + pad * 2 + 34), (0, 0, 0, 0))
    m = Image.new('L', c.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 30, c.width - 1, c.height - 1), 22, fill=255)
    fr = Image.new('RGBA', c.size, (255, 244, 214, 255)); c.paste(fr, (0, 0), m)
    mi = Image.new('L', size, 0); ImageDraw.Draw(mi).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), 14, fill=255)
    c.paste(im.convert('RGBA'), (pad, 30 + pad), mi)
    q = ImageDraw.Draw(c); f = ImageFont.truetype(FONT, 22); tw = q.textlength(label, font=f) + 34
    q.rectangle((26 + 6, 0 + 6, 26 + tw + 6, 40 + 6), fill=(255, 61, 154, 255)); q.rectangle((26, 0, 26 + tw, 40), fill=(255, 200, 58, 255))
    q.text((26 + 17, 8), label, font=f, fill=(4, 33, 31, 255))
    save(c, dst, 90)
cv = Image.open(T + 'cover.jpg'); cs = Image.open(T + 'cover-stories.jpg'); lb = Image.open(T + 'assets/layers-blueprint.webp')
card(cv, 'TYPE LAB', O + 'creative-c0.webp', crop=(40, 190, 1000, 880))
card(cs, 'HIDDEN STORIES', O + 'creative-c1.webp', crop=(30, 190, 1000, 880))
card(lb, 'HIDDEN LAYERS', O + 'creative-c2.webp')

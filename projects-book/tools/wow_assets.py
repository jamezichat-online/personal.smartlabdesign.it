"""Type Lens spread, rebuilt from the project's own graphics (type-lens/): the Ocean Drive scene, the Type Lab specimen and
the 'Creative Force' secret that the glass lens reveals in Hidden Stories."""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops
from assetlib import R, save
T = R + 'type-lens/'; O = R + 'projects-book/wow/assets/'
W, H = 2048, 1004

# ---- background: whole scene at full height on the art page; the text page continues it out of focus
src = Image.open(T + 'assets/ocean.webp').convert('RGB')
k = H / src.height; sw = round(src.width * k)
sc = src.resize((sw, H), Image.LANCZOS)
bg = Image.new('RGB', (W, H))
ext = sc.crop((sw - (W - sw) - 40, 0, sw, H)).transpose(Image.FLIP_LEFT_RIGHT)
bg.paste(ext, (sw - 40, 0)); bg.paste(sc, (0, 0))
soft = bg.filter(ImageFilter.GaussianBlur(26))
m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
for x in range(W): d.line([(x, 0), (x, H)], fill=max(0, min(255, int((x - 1050) / 230 * 255))))
bg = Image.composite(soft, bg, m)
save(bg, O + 'creative-bg.webp', 86)

# ---- the lens: magnified scene + the hidden graffiti, glass rim, highlight
S = 2; D = 520; r = 236; c = D // 2
cx, cy = 949, 481                                        # where the lens floats on the spread
crop = bg.crop((cx - 190, cy - 190, cx + 190, cy + 190)).resize((D * S, D * S), Image.LANCZOS)
crop = ImageEnhance.Brightness(crop.filter(ImageFilter.GaussianBlur(3 * S))).enhance(.5)
g = Image.open(T + 'assets/secret-graffiti.webp').convert('RGBA'); gw = int(D * S * .86); g = g.resize((gw, round(g.height * gw / g.width)), Image.LANCZOS).rotate(7, expand=True, resample=Image.BICUBIC)
inner = crop.convert('RGBA'); inner.alpha_composite(g, ((D * S - g.width) // 2, (D * S - g.height) // 2))
mask = Image.new('L', (D * S, D * S), 0); ImageDraw.Draw(mask).ellipse((S * (c - r), S * (c - r), S * (c + r), S * (c + r)), fill=255)
lens = Image.new('RGBA', (D * S, D * S), (0, 0, 0, 0)); lens.paste(inner, (0, 0), mask)
ov = Image.new('RGBA', (D * S, D * S), (0, 0, 0, 0)); q = ImageDraw.Draw(ov)
for i, (wd, col) in enumerate([(22, (10, 30, 34, 150)), (20, (255, 250, 238, 240)), (4, (120, 235, 240, 220))]):
    rr = r + 9 - i * 5
    q.ellipse((S * (c - rr), S * (c - rr), S * (c + rr), S * (c + rr)), outline=col, width=wd * S // 2)
q.arc((S * (c - r + 26), S * (c - r + 26), S * (c + r - 26), S * (c + r - 26)), 200, 262, fill=(255, 255, 255, 190), width=7 * S)
q.arc((S * (c - r + 26), S * (c - r + 26), S * (c + r - 26), S * (c + r - 26)), 30, 58, fill=(255, 255, 255, 90), width=4 * S)
lens.alpha_composite(ov)
save(lens.resize((D, D), Image.LANCZOS), O + 'creative-lens.webp', 92)

# ---- Type Lab specimen card, straight from the tool
cv = Image.open(T + 'cover.jpg').convert('RGB')
print('cover', cv.size)
card = cv.crop((40, 200, 992, 874)).convert('RGBA')
cm = Image.new('L', card.size, 0); ImageDraw.Draw(cm).rounded_rectangle((0, 0, card.width - 1, card.height - 1), 14, fill=255); card.putalpha(cm)
save(card, O + 'creative-card.webp', 92)

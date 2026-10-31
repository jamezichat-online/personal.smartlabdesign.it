import numpy as np, soundfile as sf, json, os
SR = 48000
rng = np.random.default_rng(7)
t_ = lambda d: np.arange(int(SR*d))/SR

def adsr(n, a, peak_pos=None, k=6.0):
    t = np.arange(n)/SR; d = n/SR
    p = peak_pos if peak_pos is not None else a
    up = np.clip(t/max(p,1e-4), 0, 1)**2
    down = np.exp(-k*np.clip(t-p, 0, None)/max(d-p,1e-4))
    return np.where(t < p, up, down)

def svf_bp(x, fc, q=0.6):  # bandpass a frequenza variabile
    lo = bp = 0.0; y = np.empty_like(x)
    for i, s in enumerate(x):
        f = 2*np.sin(np.pi*min(fc[i], SR/6)/SR)
        lo += f*bp; hi = s - lo - q*bp; bp += f*hi; y[i] = bp
    return y

def chirp(f0, f1, d, curve='exp'):
    t = t_(d); f = f0*(f1/f0)**(t/d) if curve=='exp' else np.linspace(f0, f1, len(t))
    return np.sin(2*np.pi*np.cumsum(f)/SR)

def pop(v):  d=0.35; s=chirp(900+120*v, 180, d)*adsr(int(SR*d), 0.002, k=14); return s
def tick(v): d=0.25; n=rng.standard_normal(int(SR*d)); s=svf_bp(n, np.full(len(n), 3000+600*v), 0.3)*adsr(len(n), 0.001, k=40); return s
def sub(v):  d=0.95; return chirp(62-3*v, 30, d)*adsr(int(SR*d), 0.004, k=5)
def whoosh(v):
    d=1.1; n=len(t_(d)); pk=0.4+0.05*v
    fc=np.interp(np.arange(n)/SR, [0, pk, d], [300, 2800+300*v, 600])
    return svf_bp(rng.standard_normal(n), fc, 0.5)*adsr(n, pk, pk, k=7)
def hit(v):
    d=0.75; n=len(t_(d))
    body=chirp(110-8*v, 45, d)*adsr(n, 0.002, k=9)
    crack=svf_bp(rng.standard_normal(n), np.full(n, 1800+300*v), 0.9)*adsr(n, 0.001, k=30)
    return body+0.6*crack
def riser(v):
    d=1.6+0.2*v; n=len(t_(d))
    tone=chirp(180, 1800+200*v, d)
    air=svf_bp(rng.standard_normal(n), np.interp(np.arange(n)/SR, [0,d], [400, 6000]), 0.5)
    return (0.5*tone+air)*adsr(n, d*0.98, d*0.98, k=40)

def rms_norm(x, db=-20):
    r = np.sqrt(np.mean(x**2)) + 1e-12
    y = x*(10**(db/20)/r); m = np.max(np.abs(y))
    return y*(0.89/m) if m > 0.89 else y

def peak_s(x):
    w = int(0.005*SR); e = np.convolve(x**2, np.ones(w)/w, 'same')
    return float(np.argmax(e)/SR)

os.makedirs('sfx_lib', exist_ok=True); index = []
for name, fn in dict(pop=pop, tick=tick, sub=sub, whoosh=whoosh, hit=hit, riser=riser).items():
    os.makedirs(f'sfx_lib/{name}', exist_ok=True)
    for v in range(4):
        x = rms_norm(fn(v)); x[-int(0.1*SR):] *= np.linspace(1, 0, int(0.1*SR))
        p = f'sfx_lib/{name}/{name}_{v+1:02d}.wav'; sf.write(p, x, SR, subtype='PCM_24')
        index.append(dict(file=p, type=name, peak_s=round(peak_s(x), 4), dur_s=round(len(x)/SR, 3)))
json.dump(index, open('sfx_lib/index.json', 'w'), indent=2)

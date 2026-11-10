"""Synthesised sound bed for the 911 motion piece (no external samples).
Usage: python3 scripts/sound.py out.wav"""
import sys, wave, numpy as np
SR, DUR = 48000, 17.5
n = int(SR*DUR); t = np.arange(n)/SR
rng = np.random.default_rng(911)
out = np.zeros((n, 2))

def env(t0, a, d, length=None):
    e = np.zeros(n); i0 = int(t0*SR); L = int((length or a+d)*SR)
    tt = np.arange(L)/SR
    seg = np.where(tt < a, tt/max(a,1e-4), np.exp(-(tt-a)/max(d,1e-4)))
    seg = seg[:max(0, min(L, n-i0))]; e[i0:i0+len(seg)] = seg; return e

def lowpass(x, a):  # one-pole
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a*(v-acc); y[i] = acc
    return y

noise = rng.standard_normal(n)
bright = noise - lowpass(noise, .05)          # hissy
dark = lowpass(noise, .02)                     # rumbly

# ambient pad: low drone (D minor-ish), slow swell
pad = sum(np.sin(2*np.pi*f*t + p)*w for f, p, w in [(73.4,0,.5),(110,1,.3),(146.8,2,.22),(220.4,3,.08)])
pad *= (0.5+0.5*np.sin(2*np.pi*0.12*t))*np.clip(t/1.5,0,1)*np.clip((DUR-t)/1.2,0,1)
out += (pad*0.10)[:,None]

# whooshes (L/R pan sweep)
def whoosh(t0, length=.55, gain=.5, pan=1):
    e = env(t0-length*.7, length*.7, length*.3)
    sig = (bright*.6+dark*3)*e*gain
    pn = np.clip((t-(t0-length*.7))/length, 0, 1)
    l = 0.5-0.5*pan*(pn*2-1); out[:,0] += sig*l; out[:,1] += sig*(1-l)
for tw, pn in [(2.15,1),(3.4,-1),(4.32,-1),(6.4,1),(9.2,-1),(10.1,1),(10.8,-1),(12.5,1),(13.5,-1),(15.5,1)]:
    whoosh(tw, pan=pn)

# riser into the burst
r = np.clip((t-0.4)/1.8,0,1)**3*(t<2.2)
out += ((bright*.5)*r*.35 + np.sin(2*np.pi*(200+600*r)*t)*r*.05)[:,None]

# sub hits / impacts
def hit(t0, f0=55, gain=.9, decay=.6):
    e = env(t0, .005, decay); ph = 2*np.pi*np.cumsum(f0*(1+2*np.exp(-(t-t0).clip(0)*25)))/SR
    s = np.sin(ph)*e*gain + dark*2*env(t0,.002,.08)*gain*.6
    out[:] += s[:,None]
hit(2.2, gain=1.0, decay=.9); hit(6.35,gain=.5,decay=.4); hit(9.2,gain=.6,decay=.5)
hit(12.5,gain=.5,decay=.4); hit(15.6, gain=1.0, decay=1.4)

# UI ticks: typing + clicks
def tick(t0, f=3200, g=.12):
    e = env(t0,.001,.012); out[:] += (np.sin(2*np.pi*f*t)*e*g)[:,None]
for k in np.arange(4.55,5.55,0.045): tick(k + rng.uniform(0,.01), f=rng.uniform(2500,4200), g=.06)
for k in np.arange(13.55,14.15,0.045): tick(k, f=rng.uniform(2500,4200), g=.06)
for k in [5.65,5.85,6.05, 6.95,7.55,8.15, 11.6, 14.4,14.75,14.9,15.05,15.12]: tick(k, f=1800, g=.18)
# confirmation chime + counter rattle
for f in (880,1318.5): out[:] += (np.sin(2*np.pi*f*t)*env(12.2,.01,.5)*.08)[:,None]
for k in np.arange(9.2,9.85,0.03): tick(k, f=5000, g=.04)
# final shimmer
out[:] += ((sum(np.sin(2*np.pi*f*t) for f in (587.3,880,1174.7)))*env(15.7,.3,1.2)*.03)[:,None]

out /= np.max(np.abs(out))*1.12
pcm = (out*32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

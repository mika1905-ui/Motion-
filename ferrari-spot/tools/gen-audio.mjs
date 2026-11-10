// Procedural soundtrack (13 s, 48 kHz stereo), locked to the timing in index.html.
// Usage: node tools/gen-audio.mjs  ->  audio/soundtrack.wav
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SR = 48000, DUR = 13, N = SR * DUR, TAU = Math.PI * 2;
const BEAT = .325, INTRO_END = 1.6, SCENE_D = 1.3, OUTRO = INTRO_END + 6 * SCENE_D, LOGO = OUTRO + 1.15;
const L = new Float32Array(N), R = new Float32Array(N);
const DUCK = new Float32Array(N).fill(1);        // sidechain envelope for music bus
const ML = new Float32Array(N), MR = new Float32Array(N); // music bus (ducked)

let seed = 987654;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const inv = (a, b, v) => clamp((v - a) / (b - a));
const addTo = (bl, br) => (i, v, pan = 0) => { if (i < 0 || i >= N) return; const p = (pan + 1) * Math.PI / 4; bl[i] += v * Math.cos(p); br[i] += v * Math.sin(p); };
const fx = addTo(L, R), mus = addTo(ML, MR);
function biquad(type) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, f, q = .7) => {
    const w = TAU * clamp(f, 20, SR * .45) / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    let n0, n1, n2;
    if (type === 'lp') { n0 = (1 - c) / 2; n1 = 1 - c; n2 = n0; } else if (type === 'hp') { n0 = (1 + c) / 2; n1 = -(1 + c); n2 = n0; } else { n0 = al; n1 = 0; n2 = -al; }
    const a0 = 1 + al, y = (n0 * x + n1 * x1 + n2 * x2 - (-2 * c) * y1 - (1 - al) * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y; return y;
  };
}
const S = t => Math.floor(t * SR);

// ---------- drums ----------
function kick(t0, g = 1, f0 = 160, f1 = 45, dec = 7, out = fx, duck = true) {
  let ph = 0;
  for (let k = 0; k < SR * 1.4; k++) {
    const t = k / SR, f = f1 + (f0 - f1) * Math.exp(-t * 30); ph += TAU * f / SR;
    const env = Math.exp(-t * dec) * Math.min(1, t * 3000);
    const click = k < 200 ? rnd() * (1 - k / 200) * .4 : 0;
    out(S(t0) + k, (Math.tanh(Math.sin(ph) * 2) * env + click) * g);
  }
  if (duck) for (let k = 0; k < SR * .25; k++) { const i = S(t0) + k; if (i < N) DUCK[i] = Math.min(DUCK[i], .25 + .75 * (k / (SR * .25)) ** 1.5); }
}
function clap(t0, g = .35) {
  const bp = biquad('bp');
  for (let k = 0; k < SR * .25; k++) {
    const t = k / SR;
    const env = (t < .03 ? (Math.exp(-((t % .01) * 300))) : Math.exp(-(t - .03) * 18));
    mus(S(t0) + k, bp(rnd(), 1500, 1.2) * env * g, (k % 2 ? .25 : -.25));
  }
}
function hat(t0, g = .05, pan = 0, open = false) {
  const hp = biquad('hp');
  for (let k = 0; k < SR * (open ? .2 : .05); k++) mus(S(t0) + k, hp(rnd(), 8000, .8) * Math.exp(-k / SR * (open ? 14 : 70)) * g, pan);
}
function snareRoll(a, b, g) {      // accelerating
  let t = a, step = .09;
  while (t < b) { clap(t, g * (.4 + .6 * inv(a, b, t))); t += step; step = Math.max(.035, step * .86); }
}
function whoosh(t0, dur, g, fA, fB, pA = -.8, pB = .8, out = fx) {
  const bp = biquad('bp'), n = S(dur);
  for (let k = 0; k < n; k++) { const u = k / n, env = Math.sin(Math.PI * u ** .8) ** 2; out(S(t0) + k, bp(rnd(), fA * (fB / fA) ** u, 1.4) * env * g, pA + (pB - pA) * u); }
}
function impact(t0, g = 1, tail = 2.2) {
  kick(t0, 1.5 * g, 140, 32, 2.2);
  const lpL = biquad('lp'), lpR = biquad('lp');
  for (let k = 0; k < SR * tail; k++) {
    const t = k / SR, env = Math.exp(-t * 2.2) * Math.min(1, t * 500), f = 3000 * Math.exp(-t * 1.5) + 150;
    if (S(t0) + k < N) { L[S(t0) + k] += lpL(rnd(), f) * env * .45 * g; R[S(t0) + k] += lpR(rnd(), f) * env * .45 * g; }
  }
  // metallic ring
  for (let k = 0; k < SR * tail; k++) { const t = k / SR; fx(S(t0) + k, (Math.sin(TAU * 523 * t) * .5 + Math.sin(TAU * 1307 * t) * .3 + Math.sin(TAU * 2113 * t) * .2) * Math.exp(-t * 3.5) * .06 * g); }
}

// ---------- engines ----------
// type: 'v8t' twin-turbo V8 (F40), 'v12', 'hyb12' (V12 + e-whine), 'v6h' (V6 hybrid)
function engine(t0, dur, type, g = .3) {
  const lp1 = biquad('lp'), lp2 = biquad('lp');
  let ph = 0, phw = 0;
  const cyl = type === 'v8t' ? 8 : type === 'v6h' ? 6 : 12;
  for (let k = 0; k < S(dur); k++) {
    const lt = k / SR, u = lt / dur;
    // rpm: launch, shift at 2 beats, scream to the redline
    let rpm = 3500 + 4500 * inv(0, .55, lt);
    if (lt > .62) rpm = 6200 + (type === 'v8t' ? 1600 : 2800) * inv(.62, dur * .92, lt);
    if (lt > .55 && lt < .62) rpm = 8000 - 2000 * inv(.55, .62, lt);
    const f = rpm / 60 * cyl / 2 * .5;
    ph += TAU * f / SR; phw += TAU * (f * 7.3) / SR;
    let v = 0;
    for (let h = 1; h <= 10; h++) v += Math.sin(ph * h + h * .9) / h * (type === 'v12' || type === 'hyb12' ? (h % 2 ? 1 : .8) : (h === 2 ? 1.4 : 1));
    v += rnd() * (.35 + .25 * Math.sin(ph));
    const env = Math.min(1, lt * 25) * (1 - inv(.88, 1, u)) * (.6 + .4 * inv(0, .5, lt));
    const cut = 900 + 4200 * inv(0, dur, lt) * (type === 'v12' || type === 'hyb12' ? 1.2 : 1);
    let s = lp2(lp1(Math.tanh(v * 1.6), cut, .9), cut * 1.4, .8);
    if (type === 'hyb12' || type === 'v6h') s += Math.sin(phw * .35) * .18 * inv(0, .4, lt);
    fx(S(t0) + k, s * env * g, -.5 + u);
  }
  if (type === 'v8t') {   // turbo flutter / blow-off on the lift
    const bp = biquad('bp');
    for (let k = 0; k < SR * .35; k++) { const t = k / SR; const fl = .5 + .5 * Math.sign(Math.sin(t * TAU * 22)); fx(S(t0 + .55) + k, bp(rnd(), 2400 - t * 2000, 2) * Math.exp(-t * 6) * fl * .5, .3); }
  }
}

// ================= INTRO =================
{ // drone + ticking
  const lp = biquad('lp');
  for (let i = 0; i < S(INTRO_END); i++) {
    const t = i / SR;
    const v = lp(Math.sin(TAU * 41.2 * t) * .6 + Math.sin(TAU * 61.7 * t) * .3 + rnd() * .1, 300) * .3 * inv(0, .3, t);
    fx(i, v, Math.sin(t * 3) * .2);
  }
  for (let t = .05; t < 1.1; t += (t < .55 ? .1625 : .08125)) hat(t, .09, t % .3 < .15 ? -.4 : .4);
  // reverse swell into the cut at 0.55
  whoosh(.15, .42, .35, 300, 4000, -.6, 0);
  impact(.55, .55, 1.2);
  // riser into the drop
  const bp = biquad('bp'); let ph = 0;
  for (let i = S(.6); i < S(1.52); i++) {
    const t = i / SR, u = inv(.6, 1.52, t);
    ph += TAU * (90 * 8 ** u) / SR;
    fx(i, bp(rnd(), 300 * 25 ** u, 2) * u ** 2 * .55 + Math.sin(ph) * u ** 3 * .1, Math.sin(t * 20) * .3 * u);
  }
  // year strobe: a hit on each flash
  for (let k = 0; k < 6; k++) { kick(1.1 + k * .07, .35 + k * .08, 220, 70, 18); hat(1.1 + k * .07, .12); }
  snareRoll(1.1, 1.5, .4);
}

// ================= DROP + MODEL SCENES =================
const ENG = ['v8t', 'v12', 'v12', 'hyb12', 'v12', 'v6h'];
const ROOTS = [55, 43.65, 49, 41.2, 55, 61.74];   // A1, F1, G1, E1, A1, B1
impact(INTRO_END, .8, 1.0);
for (let m = 0; m < 6; m++) {
  const T = INTRO_END + m * SCENE_D;
  for (let b = 0; b < 4; b++) {
    const tb = T + b * BEAT;
    kick(tb, b === 0 ? 1.25 : 1.0, 170, 44, 7, fx, true);
    if (b % 2 === 1) clap(tb, .32);
    hat(tb + BEAT / 2, .07, .3, b === 3);
    hat(tb + BEAT / 4, .035, -.3); hat(tb + 3 * BEAT / 4, .035, -.3);
  }
  // 808 bass with slide into next root
  { let ph = 0; const lp = biquad('lp');
    const nxt = ROOTS[(m + 1) % 6];
    for (let k = 0; k < S(SCENE_D); k++) {
      const lt = k / SR;
      const f = lt > SCENE_D - .08 ? ROOTS[m] + (nxt - ROOTS[m]) * inv(SCENE_D - .08, SCENE_D, lt) : ROOTS[m];
      ph += TAU * f / SR;
      const lb = lt % BEAT, env = Math.exp(-lb * 3) * .9 + .1;
      mus(S(T) + k, lp(Math.tanh(Math.sin(ph) * 2.5 + Math.sin(ph * 2) * .4), 400) * env * .4);
    }
  }
  // stab chord on the downbeat (minor)
  { const f0 = ROOTS[m] * 4, ch = [1, 1.189, 1.498, 2];
    for (let k = 0; k < SR * .35; k++) { const t = k / SR; let v = 0; ch.forEach((r, j) => v += Math.sign(Math.sin(TAU * f0 * r * t * (1 + j * .003))) * .25); mus(S(T) + k, v * Math.exp(-t * 9) * .07, 0); } }
  engine(T + .02, SCENE_D - .05, ENG[m], m === 3 || m === 5 ? .3 : .34);
  whoosh(T + 1.0, .3, .5, 600, 6000, -.4, .4);       // zoom-through
}

// ================= OUTRO =================
for (let k = 0; k < 6; k++) { kick(OUTRO + k * .11, .9, 200, 50, 10); hat(OUTRO + k * .11, .1); }
whoosh(OUTRO + .65, .5, .45, 6000, 200, .6, -.6);   // collapse
// silence 10.4 – 10.55, then reverse breath into the hit
whoosh(LOGO - .14, .16, .4, 400, 6000, 0, 0);
impact(LOGO, 1.25, 2.4);
// final V12 rev: blip up and down
{ const lp = biquad('lp'); let ph = 0;
  for (let k = 0; k < SR * 1.6; k++) {
    const t = k / SR, rpm = 2500 + 6000 * Math.exp(-((t - .35) ** 2) / .03);
    ph += TAU * (rpm / 60 * 6 * .5) / SR;
    let v = 0; for (let h = 1; h <= 9; h++) v += Math.sin(ph * h + h) / h;
    fx(S(LOGO + .05) + k, lp(Math.tanh(v * 1.5 + rnd() * .3), 1200 + rpm * .3) * Math.min(1, t * 20) * Math.exp(-t * 1.6) * .3, .1);
  } }
// shimmering D-major-ish chord to close
{ const notes = [146.8, 220, 293.7, 370, 440, 587.3];
  for (let k = 0; k < S(DUR - LOGO); k++) { const t = k / SR; let v = 0; notes.forEach((f, j) => v += Math.sin(TAU * f * t * (1 + .002 * Math.sin(t * 4 + j))) / (1 + j * .35));
    fx(S(LOGO) + k, v * Math.min(1, t * 2.5) * Math.exp(-t * .45) * .045, Math.sin(t * 1.7) * .4); } }

// ================= MIX =================
const hpL = biquad('hp'), hpR = biquad('hp');
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(hpL(L[i] + ML[i] * DUCK[i], 28) * 1.15);
  R[i] = Math.tanh(hpR(R[i] + MR[i] * DUCK[i], 28) * 1.15);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
// hard silence before drop and before logo (dramatic gaps)
for (const [a, b] of [[1.52, INTRO_END - .004], [OUTRO + 1.0, LOGO - .16]]) for (let i = S(a); i < S(b); i++) { const f = Math.min(1, (i - S(a)) / 240); L[i] *= 1 - f; R[i] *= 1 - f; }
const gn = .9 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const t = i / SR, f = Math.min(1, t / .01) * (1 - inv(DUR - .35, DUR, t));
  buf.writeInt16LE(Math.round(clamp(L[i] * gn * f, -1, 1) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(clamp(R[i] * gn * f, -1, 1) * 32767), 46 + i * 4);
}
writeFileSync(resolve(root, 'audio/soundtrack.wav'), buf);
console.log('audio/soundtrack.wav written');

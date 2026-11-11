// Procedural soundtrack (13 s, 48 kHz stereo), locked to the timing in index.html.
// Usage: node tools/gen-audio.mjs  ->  audio/soundtrack.wav
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SR = 48000, DUR = 15, N = SR * DUR, TAU = Math.PI * 2;
const BEAT = .3, INTRO_END = 2.4, SCENE_D = 1.2, PING = INTRO_END + 8 * SCENE_D, END = PING + 1.0;
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
// 'i6' NA straight-six, 'i4' high-revving four, 'i6t' twin-turbo six (pops), 'v8t' twin-turbo V8, 'v8h' V8 hybrid
function engine(t0, dur, type, g = .3, pan0 = -.6, pan1 = .6) {
  const lp1 = biquad('lp'), lp2 = biquad('lp');
  let ph = 0, phw = 0;
  const cyl = type === 'i4' ? 4 : type.startsWith('i6') ? 6 : 8;
  const red = type === 'i4' ? 8200 : type === 'i6' ? 7600 : 7200;
  for (let k = 0; k < S(dur); k++) {
    const lt = k / SR, u = lt / dur;
    let rpm = 3200 + (red - 3200) * inv(0, .55, lt);
    if (lt > .6) rpm = red * .72 + red * .28 * inv(.6, dur * .9, lt);
    if (lt > .55 && lt < .6) rpm = red - red * .28 * inv(.55, .6, lt);
    const f = rpm / 60 * cyl / 2 * .5;
    ph += TAU * f / SR; phw += TAU * f * 6.1 / SR;
    let v = 0;
    for (let h = 1; h <= 9; h++) v += Math.sin(ph * h + h * .8) / h * (cyl === 8 && h === 1 ? 1.8 : 1) * (cyl === 6 && h === 3 ? 1.4 : 1);
    if (cyl === 8) v += Math.sin(ph * .5) * .9;   // cross-plane burble
    v += rnd() * (.3 + .3 * Math.sin(ph));
    const env = Math.min(1, lt * 25) * (1 - inv(.9, 1, u)) * (.65 + .35 * inv(0, .45, lt));
    const cut = (type === 'i4' ? 1400 : 1000) + 3800 * inv(0, dur, lt);
    let s = lp2(lp1(Math.tanh(v * 1.7), cut, .9), cut * 1.4, .8);
    if (type === 'v8h') s += Math.sin(phw * .4) * .14 * inv(0, .4, lt);
    // overrun pops & crackles on the lift (gear change and end)
    if ((type === 'i6t' || type === 'v8t' || type === 'v8h') && ((lt > .55 && lt < .64) || u > .88) && rnd() > .9985) s += rnd() * 3;
    fx(S(t0) + k, s * env * g, pan0 + (pan1 - pan0) * u);
  }
}

// ================= INTRO =================
{ const lp = biquad('lp');
  for (let i = 0; i < S(2.25); i++) { const t = i / SR; fx(i, lp(Math.sin(TAU * 36.7 * t) * .7 + Math.sin(TAU * 55 * t) * .3 + rnd() * .08, 260) * .32 * inv(0, .05, t), Math.sin(t * 2) * .2); } }
// three word slams
[0, BEAT, 2 * BEAT].forEach((T, k) => { kick(T, 1.1, 150, 38, 5); whoosh(Math.max(0, T - .08), .16, .25, 3000, 400, k % 2 ? .6 : -.6, 0); });
// letters fall away → BMW
whoosh(.85, .4, .35, 500, 5000, -.7, .7);
for (let k = 0; k < 3; k++) hat(.9 + k * .1, .12, (k - 1) * .6);
// roundel spin + hit
whoosh(1.15, .35, .4, 300, 7000, .8, -.8);
impact(1.5, .7, .9);
// stripe wipe + M slam
whoosh(1.66, .36, .5, 6000, 300, -.9, .9);
impact(1.92, .9, .5);
{ const bp = biquad('bp'); for (let i = S(1.55); i < S(2.25); i++) { const t = i / SR, u = inv(1.55, 2.25, t); fx(i, bp(rnd(), 400 * 18 ** u, 2) * u * u * .4, 0); } }
snareRoll(1.95, 2.24, .35);

// ================= MODEL SCENES =================
const ENG = ['i6', 'i4', 'i6t', 'i6t', 'i6t', 'v8t', 'v8h', 'v8h'];
const ROOTS = [41.2, 46.25, 49, 55, 41.2, 46.25, 49, 55];   // E1 F#1 G1 A1 ...
impact(INTRO_END, .9, .9);
for (let m = 0; m < 8; m++) {
  const T = INTRO_END + m * SCENE_D, dir = m % 2 ? -1 : 1;
  for (let b = 0; b < 4; b++) {
    const tb = T + b * BEAT;
    kick(tb, b === 0 ? 1.3 : 1.0, 170, 44, 7, fx, true);
    if (b % 2 === 1) clap(tb, .34);
    hat(tb + BEAT / 2, .07, .3, b === 3); hat(tb + BEAT / 4, .03, -.3); hat(tb + 3 * BEAT / 4, .03, -.3);
  }
  { let ph = 0; const lp = biquad('lp'), nxt = ROOTS[(m + 1) % 8];
    for (let k = 0; k < S(SCENE_D); k++) { const lt = k / SR;
      const f = lt > SCENE_D - .07 ? ROOTS[m] + (nxt - ROOTS[m]) * inv(SCENE_D - .07, SCENE_D, lt) : ROOTS[m];
      ph += TAU * f / SR; const env = Math.exp(-(lt % BEAT) * 3.5) * .9 + .1;
      mus(S(T) + k, lp(Math.tanh(Math.sin(ph) * 2.6 + Math.sin(ph * 2) * .35), 380) * env * .42); } }
  { const f0 = ROOTS[m] * 4, ch = [1, 1.189, 1.498];   // minor stab
    for (let k = 0; k < SR * .25; k++) { const t = k / SR; let v = 0; ch.forEach((r, j) => v += Math.sign(Math.sin(TAU * f0 * r * t * (1 + j * .004))) * .25); mus(S(T) + k, v * Math.exp(-t * 12) * .07); } }
  engine(T + .02, SCENE_D - .05, ENG[m], .32, -.6 * dir, .6 * dir);
  whoosh(T + SCENE_D - .16, .24, .55, 700, 7000, .6 * dir, -.6 * dir);   // whip
  // hit on the jump cuts
  kick(T + 2 * BEAT, .4, 260, 80, 22, fx, false); kick(T + 3 * BEAT, .4, 260, 80, 22, fx, false);
}

// ================= PING-PONG =================
{ const step = .075; let n = 0;
  for (let t = PING; t < END - .06; t += step, n++) { kick(t, .45 + .4 * inv(PING, END, t), 240, 70, 20, fx, false); hat(t, .1, n % 2 ? .7 : -.7); }
  const bp = biquad('bp'); let ph = 0;
  for (let i = S(PING); i < S(END - .03); i++) { const t = i / SR, u = inv(PING, END, t); ph += TAU * (110 * 6 ** u) / SR;
    fx(i, bp(rnd(), 500 * 16 ** u, 2) * u * .5 + Math.sin(ph) * u ** 2 * .09, Math.sin(t * 40) * .5); } }

// ================= END =================
impact(END, 1.3, 2.0);
engine(END + .05, 1.2, 'v8t', .26, 0, 0);
{ const notes = [164.8, 246.9, 329.6, 392, 493.9, 659.3];   // E minor add9 shimmer
  for (let k = 0; k < S(DUR - END); k++) { const t = k / SR; let v = 0; notes.forEach((f, j) => v += Math.sin(TAU * f * t * (1 + .002 * Math.sin(t * 4 + j))) / (1 + j * .35));
    fx(S(END) + k, v * Math.min(1, t * 2.5) * Math.exp(-t * .5) * .045, Math.sin(t * 1.7) * .4); } }
whoosh(END + .85, .6, .2, 2000, 9000, -.7, .7);

// ================= MIX =================
const hpL = biquad('hp'), hpR = biquad('hp');
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(hpL(L[i] + ML[i] * DUCK[i], 28) * 1.15);
  R[i] = Math.tanh(hpR(R[i] + MR[i] * DUCK[i], 28) * 1.15);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
// hard silence before drop and before logo (dramatic gaps)
for (const [a, b] of [[2.25, INTRO_END - .004]]) for (let i = S(a); i < S(b); i++) { const f = Math.min(1, (i - S(a)) / 240); L[i] *= 1 - f; R[i] *= 1 - f; }
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

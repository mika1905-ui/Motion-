// Prozeduraler Soundtrack (13 s, 48 kHz, Stereo) – synchron zum Timing in index.html.
// Aufruf: node tools/gen-audio.mjs  ->  audio/soundtrack.wav
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SR = 48000, DUR = 13, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const INTRO_END = 1.8, SCENE_D = 1.4, OUTRO = INTRO_END + 6 * SCENE_D;
const ELECTRIC = [false, true, false, false, false, false];
const TAU = Math.PI * 2;

let seed = 1234567;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const inv = (a, b, v) => clamp((v - a) / (b - a));
const add = (i, v, pan = 0) => { if (i < 0 || i >= N) return; const p = (pan + 1) * Math.PI / 4; L[i] += v * Math.cos(p); R[i] += v * Math.sin(p); };

// Zustandsbehafteter Biquad (RBJ) mit zeitvariabler Frequenz
function biquad(type) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0, b1, b2, a1, a2;
  return (x, f, q = .7) => {
    const w = TAU * clamp(f, 20, SR * .45) / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    let n0, n1, n2;
    if (type === 'lp') { n0 = (1 - c) / 2; n1 = 1 - c; n2 = n0; }
    else if (type === 'hp') { n0 = (1 + c) / 2; n1 = -(1 + c); n2 = n0; }
    else { n0 = al; n1 = 0; n2 = -al; }
    const a0 = 1 + al; b0 = n0 / a0; b1 = n1 / a0; b2 = n2 / a0; a1 = -2 * c / a0; a2 = (1 - al) / a0;
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y; return y;
  };
}

// --- Kick / Impact ---
function kick(t0, gain = 1, f0 = 150, f1 = 42, decay = 7, pan = 0) {
  let ph = 0; const s0 = Math.floor(t0 * SR);
  for (let k = 0; k < SR * 1.2; k++) {
    const t = k / SR, f = f1 + (f0 - f1) * Math.exp(-t * 28);
    ph += TAU * f / SR;
    const env = Math.exp(-t * decay) * Math.min(1, t * 2000);
    const click = k < 240 ? rnd() * (1 - k / 240) * .35 : 0;
    add(s0 + k, (Math.tanh(Math.sin(ph) * 1.6) * env + click) * gain, pan);
  }
}
// --- Hi-Hat ---
function hat(t0, gain = .06, pan = 0) {
  const hp = biquad('hp'), s0 = Math.floor(t0 * SR);
  for (let k = 0; k < SR * .08; k++) add(s0 + k, hp(rnd(), 7000, .9) * Math.exp(-k / SR * 60) * gain, pan);
}
// --- Whoosh (Rauschen durch wanderndes Bandpass) ---
function whoosh(t0, dur, gain, fA, fB, panA, panB) {
  const bp = biquad('bp'), s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  for (let k = 0; k < n; k++) {
    const u = k / n, env = Math.sin(Math.PI * Math.pow(u, .7)) ** 2;
    const f = fA * Math.pow(fB / fA, u);
    add(s0 + k, bp(rnd(), f, 1.6) * env * gain, panA + (panB - panA) * u);
  }
}

// --- Drone / Bett ---
{
  const lp = biquad('lp');
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const env = inv(0, 1.6, t) * (1 - inv(DUR - .5, DUR, t)) * (.55 + .45 * inv(OUTRO, OUTRO + .9, t));
    const v = Math.sin(TAU * 55 * t) * .5 + Math.sin(TAU * 82.4 * t + 1) * .25 + Math.sin(TAU * 110.3 * t) * .18 + Math.sin(TAU * 27.5 * t) * .35;
    const s = lp(v, 400) * env * .16;
    add(i, s, Math.sin(t * .7) * .3);
  }
}

// --- Intro: Herzschlag + Riser ---
kick(.5, .9, 120, 38, 9); kick(.68, .55, 110, 38, 10);
kick(1.1, 1.0, 120, 38, 9); kick(1.28, .6, 110, 38, 10);
{
  const bp = biquad('bp'); let ph = 0;
  for (let i = 0; i < INTRO_END * SR; i++) {
    const t = i / SR, u = inv(.2, INTRO_END, t);
    const n = bp(rnd(), 200 * Math.pow(25, u), 2.5) * Math.pow(u, 2.2) * .5;
    ph += TAU * (110 * Math.pow(4, u)) / SR;
    add(i, n + Math.sin(ph) * Math.pow(u, 3) * .07, Math.sin(t * 9) * .2 * u);
  }
}

// --- Modell-Szenen ---
const carX = lt => { // normierte Bildschirmposition des Autos (-1 links … +1 rechts)
  const a = .42, b = 1.08;
  const ease4o = x => 1 - (1 - x) ** 4, ease4i = x => x ** 4;
  if (lt < a) return -2.2 + 2.2 * ease4o(lt / a);
  if (lt < b) return .05 * (lt - a) / (b - a);
  return .05 + 2.6 * ease4i(inv(b, SCENE_D, lt));
};
for (let m = 0; m < 6; m++) {
  const T = INTRO_END + m * SCENE_D;
  // Rhythmus: Kick auf jeder Viertel (0.35 s), Akzent beim Schnitt
  kick(T, 1.15, 170, 40, 6);
  kick(T + .7, .6, 140, 42, 9);
  for (let k = 0; k < 8; k++) hat(T + .175 + k * .175, k % 2 ? .05 : .03, k % 2 ? .35 : -.35);
  whoosh(T - .1, .55, .55, 500, 3800, -.9, .1);           // Einfahrt
  whoosh(T + 1.02, .45, .5, 2500, 300, .1, .95);          // Ausfahrt

  const lp = biquad('lp'), lp2 = biquad('lp');
  let ph = 0, ph2 = 0, ph3 = 0;
  const s0 = Math.floor((T - .05) * SR), n = Math.floor((SCENE_D + .25) * SR);
  for (let k = 0; k < n; k++) {
    const lt = k / SR - .05;
    const x = carX(clamp(lt, 0, SCENE_D));
    const x2 = carX(clamp(lt + .01, 0, SCENE_D));
    const vel = (x2 - x) / .01;                          // Bildschirmbreiten/s
    const doppler = 1 + clamp(-x * .09, -.12, .12) + clamp(vel * .004, -.03, .03);
    const env = clamp(1 - Math.abs(x) / 2.3) * inv(-.05, .08, lt) * (1 - inv(SCENE_D + .05, SCENE_D + .2, lt));
    const pan = clamp(x * .8, -.95, .95);
    if (!ELECTRIC[m]) {
      // Boxer-/V-Motor: Drehzahl steigt, kurzer Schaltknick in der Mitte
      let rpm = 2800 + 4200 * inv(0, .6, lt);
      if (lt > .62) rpm = 4300 + 3600 * inv(.62, SCENE_D, lt);
      const f = rpm / 60 * 3 / 2 * .5 * doppler;          // Zündfrequenz (gestaucht)
      ph += TAU * f / SR; ph2 += TAU * f * .5 / SR;
      let v = 0;
      for (let h = 1; h <= 9; h++) v += Math.sin(ph * h + h * .7) / (h === 3 ? 1.2 : h) * (h % 2 ? 1 : .6);
      v += Math.sin(ph2) * .8;
      const growl = rnd() * (.5 + .5 * Math.sin(ph)) * .6;
      const cut = 600 + 2400 * env * inv(-.05, .5, lt);
      let s = lp(lp2(Math.tanh((v + growl) * 1.3), cut, .9), cut * 1.3, .7);
      // Fehlzündungs-Knallen beim Gaswegnehmen
      if (lt > .55 && lt < .62 && rnd() > .9993) s += rnd() * 2.5;
      add(s0 + k, s * env * .34, pan);
    } else {
      // Taycan: E-Motor-Surren + futuristischer Sweep
      const f = (520 + 900 * inv(0, SCENE_D, lt)) * doppler;
      ph += TAU * f / SR; ph3 += TAU * (f * 1.5) / SR; ph2 += TAU * (48 + 40 * inv(0, SCENE_D, lt)) / SR;
      const s = Math.sin(ph) * .22 + Math.sin(ph3) * .1 + Math.sin(ph * 2.01) * .06 + Math.tanh(Math.sin(ph2) * 2) * .35;
      add(s0 + k, lp(s, 3000) * env * .42, pan);
    }
  }
}

// --- Outro: Reverse-Swell, Impact, Akkord ---
{
  const bp = biquad('bp');
  const a = Math.floor(OUTRO * SR), b = Math.floor((OUTRO + .78) * SR);
  for (let i = a; i < b; i++) { const u = (i - a) / (b - a); add(i, bp(rnd(), 300 + 5000 * u * u, 1.2) * u ** 3 * .55, 0); }
}
kick(OUTRO, .9, 160, 40, 6);
const IMP = OUTRO + .8;
kick(IMP, 1.4, 120, 32, 2.6);
{
  const lpL = biquad('lp'), lpR = biquad('lp');
  const s0 = Math.floor(IMP * SR);
  for (let k = 0; k < (DUR - IMP) * SR; k++) {
    const t = k / SR, env = Math.exp(-t * 1.6) * Math.min(1, t * 400);
    L[s0 + k] += lpL(rnd(), 1800 * Math.exp(-t * .8) + 200) * env * .35;
    R[s0 + k] += lpR(rnd(), 1800 * Math.exp(-t * .8) + 200) * env * .35;
  }
  // Schimmernder A-Dur-Akkord
  const notes = [220, 277.18, 329.63, 440, 554.37];
  for (let k = 0; k < (DUR - IMP) * SR; k++) {
    const t = k / SR, env = Math.min(1, t * 3) * Math.exp(-t * .55) * .05;
    let v = 0; notes.forEach((f, j) => { v += Math.sin(TAU * f * t * (1 + .002 * Math.sin(t * 5 + j))) / (1 + j * .3); });
    add(s0 + k, v * env, Math.sin(t * 2) * .4);
  }
}
// Glanz-Sweep über der Wortmarke
whoosh(OUTRO + 1.6, .7, .22, 2000, 9000, -.7, .7);

// --- Master: Hochpass gegen DC, Soft-Clip, Normalisieren, Fades ---
const hpL = biquad('hp'), hpR = biquad('hp');
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(hpL(L[i], 25) * 1.1); R[i] = Math.tanh(hpR(R[i], 25) * 1.1);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = .89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const t = i / SR, f = Math.min(1, t / .02) * (1 - inv(DUR - .3, DUR, t));
  buf.writeInt16LE(Math.round(clamp(L[i] * g * f, -1, 1) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(clamp(R[i] * g * f, -1, 1) * 32767), 46 + i * 4);
}
writeFileSync(resolve(root, 'audio/soundtrack.wav'), buf);
console.log('audio/soundtrack.wav geschrieben, Peak-Gain', g.toFixed(3));

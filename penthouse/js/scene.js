/* ==========================================================================
   Scene builder — generates the isometric tower and the penthouse interior
   as crisp, resolution-independent SVG. No image assets required.
   ========================================================================== */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  /* Deterministic PRNG so the skyline looks the same on every load */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f1 = (n) => Math.round(n * 10) / 10;

  /* ───────────────────────────── Isometric tower ───────────────────────────── */

  const W = 220;   // footprint along x
  const D = 150;   // footprint along y
  const C = Math.cos(Math.PI / 6);
  const S = Math.sin(Math.PI / 6);
  const P = (x, y, z) => [(x - y) * C, (x + y) * S - z];
  const pts = (list) => list.map((p) => P(p[0], p[1], p[2]).map(f1).join(',')).join(' ');
  const line = (a, b, cls) => {
    const p = P(...a), q = P(...b);
    return `<line class="${cls}" x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}" pathLength="1"/>`;
  };

  const FLOORS = [
    { id: 'g',  name: 'Ground Floor', meta: 'Lobby · Concierge · Spa', status: 'amenity', h: 58, nL: 6, nR: 4 },
    { id: 'l1', name: 'Level 01', meta: 'Residence · 240 m² · Sold', status: 'Sold', h: 42 },
    { id: 'l2', name: 'Level 02', meta: 'Residence · 240 m² · Sold', status: 'Sold', h: 42 },
    { id: 'l3', name: 'Level 03', meta: 'Residence · 280 m² · Sold', status: 'Sold', h: 42 },
    { id: 'l4', name: 'Level 04', meta: 'Residence · 280 m² · Reserved', status: 'Reserved', h: 42 },
    { id: 'l5', name: 'Level 05', meta: 'Residence · 310 m² · Sold', status: 'Sold', h: 42 },
    { id: 'l6', name: 'Level 06', meta: 'Residence · 310 m² · Sold', status: 'Sold', h: 42 },
    { id: 'l7', name: 'Level 07', meta: 'Sky Residence · 380 m² · Reserved', status: 'Reserved', h: 42 },
    { id: 'ph', name: 'Penthouse', meta: '620 m² · 360° Terrace · Available', status: 'Available', h: 58, inset: 18, nL: 10, nR: 6 }
  ];

  function buildTower(svg) {
    const r = rng(42);
    let z = 0;
    const floors = FLOORS.map((f) => {
      const i = f.inset || 0;
      const o = Object.assign({}, f, { x0: i, y0: i, x1: W - i, y1: D - i, z0: z, z1: z + f.h });
      z += f.h;
      return o;
    });
    const topZ = z;

    /* Ground grid */
    let grid = '';
    for (let t = -260; t <= 480; t += 30) {
      grid += line([t, -260, 0], [t, 480, 0], '');
      grid += line([-260, t, 0], [480, t, 0], '');
    }
    const gc = P(W / 2, D / 2, 0);

    /* One floor */
    function floorSVG(f) {
      const { x0, y0, x1, y1, z0, z1 } = f;
      const isPH = f.id === 'ph';
      const nL = f.nL || 8, nR = f.nR || 5;
      const s = z0 + 3; // slab line height
      let panes = '', mulls = '';

      for (let k = 0; k < nL; k++) { // face y = y1
        const a = x0 + ((x1 - x0) * k) / nL, b = x0 + ((x1 - x0) * (k + 1)) / nL;
        const lit = isPH ? 0.34 : r() < 0.28 ? 0.1 + r() * 0.22 : 0;
        if (lit) panes += `<polygon class="pane" points="${pts([[a, y1, s], [b, y1, s], [b, y1, z1], [a, y1, z1]])}" fill="#f3dcae" fill-opacity="${lit.toFixed(2)}"/>`;
        if (k) mulls += line([a, y1, s], [a, y1, z1], 'mull');
      }
      for (let k = 0; k < nR; k++) { // face x = x1
        const a = y0 + ((y1 - y0) * k) / nR, b = y0 + ((y1 - y0) * (k + 1)) / nR;
        const lit = isPH ? 0.22 : r() < 0.22 ? 0.06 + r() * 0.16 : 0;
        if (lit) panes += `<polygon class="pane" points="${pts([[x1, a, s], [x1, b, s], [x1, b, z1], [x1, a, z1]])}" fill="#f3dcae" fill-opacity="${lit.toFixed(2)}"/>`;
        if (k) mulls += line([x1, a, s], [x1, a, z1], 'mull');
      }

      const body =
        `<polygon class="face face-l" points="${pts([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])}" pathLength="1"/>` +
        `<polygon class="face face-r" points="${pts([[x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [x1, y1, z1]])}" pathLength="1"/>` +
        `<polygon class="face face-t" points="${pts([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])}" pathLength="1"/>` +
        panes + mulls +
        `<polyline class="slab" points="${pts([[x0, y1, s], [x1, y1, s], [x1, y0, s]])}" pathLength="1"/>`;

      let extra = '';
      if (isPH) {
        const below = floors[floors.length - 2];
        const rz = below.z1, rh = 9;
        // glass balustrade around the terrace (front edges)
        extra +=
          `<polygon class="rail" points="${pts([[0, D, rz], [W, D, rz], [W, D, rz + rh], [0, D, rz + rh]])}"/>` +
          `<polygon class="rail" points="${pts([[W, D, rz], [W, 0, rz], [W, 0, rz + rh], [W, D, rz + rh]])}"/>`;
        // crown slab with overhang + mast
        const c0 = 12, c1z = z1 + 5;
        extra +=
          `<polygon class="crown" points="${pts([[c0, D - c0, z1], [W - c0, D - c0, z1], [W - c0, D - c0, c1z], [c0, D - c0, c1z]])}"/>` +
          `<polygon class="crown" points="${pts([[W - c0, D - c0, z1], [W - c0, c0, z1], [W - c0, c0, c1z], [W - c0, D - c0, c1z]])}"/>` +
          `<polygon class="crown" points="${pts([[c0, c0, c1z], [W - c0, c0, c1z], [W - c0, D - c0, c1z], [c0, D - c0, c1z]])}"/>`;
        const m0 = P(W / 2, D / 2, c1z), m1 = P(W / 2, D / 2, c1z + 64);
        extra += `<line class="mast" x1="${f1(m0[0])}" y1="${f1(m0[1])}" x2="${f1(m1[0])}" y2="${f1(m1[1])}"/>` +
                 `<circle class="beacon" cx="${f1(m1[0])}" cy="${f1(m1[1])}" r="2.4"/>`;
        // glow outline used during the zoom
        const glow = `<polygon class="ph-glow" id="ph-glow" filter="url(#soft)" points="${pts([[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z1]])}"/>`;
        return `<g class="floor" id="floor-ph" data-id="ph" tabindex="0" role="button" aria-label="Penthouse — available. Enter the penthouse.">
          ${glow}<g id="ph-body">${body}</g>${extra}</g>`;
      }
      return `<g class="floor" id="floor-${f.id}" data-id="${f.id}" tabindex="0" role="button" aria-label="${f.name} — ${f.meta}">${body}</g>`;
    }

    /* Labels */
    const LX = 250;
    function labelSVG(f) {
      const zm = (f.z0 + f.z1) / 2;
      const a = P(f.x1, f.y0, zm);
      const isPH = f.id === 'ph';
      const y = f1(a[1]);
      return `<g class="label ${isPH ? 'label-ph' : ''}" id="label-${f.id}" data-id="${f.id}">
        <line class="leader" x1="${f1(a[0] + 6)}" y1="${y}" x2="${LX - 4}" y2="${y}" pathLength="1"/>
        ${isPH ? `<circle class="ph-ring" cx="${LX}" cy="${y}" r="2.6"/>` : ''}
        <circle class="ldot" cx="${LX}" cy="${y}" r="${isPH ? 2.6 : 2}"/>
        <text class="lname" x="${LX + 12}" y="${f1(a[1] - (isPH ? 3 : 2))}">${f.name}</text>
        <text class="lmeta" x="${LX + 12}" y="${f1(a[1] + (isPH ? 12 : 11))}">${f.meta}</text>
      </g>`;
    }

    const foot = 6;
    const scan = `<polygon class="scan" points="${pts([[-foot, -foot, 0], [W + foot, -foot, 0], [W + foot, D + foot, 0], [-foot, D + foot, 0]])}"/>`;

    svg.setAttribute('viewBox', '-200 -440 720 680');
    svg.innerHTML = `
      <defs>
        <radialGradient id="gridFade" cx="${f1(gc[0])}" cy="${f1(gc[1])}" r="330" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
        <mask id="gridMask"><rect x="-400" y="-600" width="1200" height="1200" fill="url(#gridFade)"/></mask>
        <radialGradient id="shadow"><stop offset="0" stop-color="#d4b483" stop-opacity=".22"/><stop offset="1" stop-color="#d4b483" stop-opacity="0"/></radialGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      <g id="grid" class="grid" mask="url(#gridMask)">${grid}</g>
      <ellipse id="tower-shadow" cx="${f1(gc[0])}" cy="${f1(gc[1])}" rx="260" ry="120" fill="url(#shadow)"/>
      <g id="scanline">${scan}</g>
      <g id="floors">${floors.map(floorSVG).join('')}</g>
      <g id="labels">${floors.map(labelSVG).join('')}</g>`;

    return { floors, topZ };
  }

  /* ───────────────────────────── Interior layers ───────────────────────────── */

  const VB = 'viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"';
  const SUN = { x: 1000, y: 640 };

  function sky() {
    const r = rng(5);
    let stars = '';
    for (let i = 0; i < 70; i++) {
      stars += `<circle cx="${f1(r() * 1600)}" cy="${f1(r() * 260)}" r="${f1(0.4 + r() * 0.9)}" fill="#fff" opacity="${(0.15 + r() * 0.5).toFixed(2)}"/>`;
    }
    return `<svg ${VB} aria-hidden="true">
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#090a1c"/>
          <stop offset=".28" stop-color="#1d1535"/>
          <stop offset=".46" stop-color="#4a2349"/>
          <stop offset=".6" stop-color="#93364a"/>
          <stop offset=".7" stop-color="#d7593f"/>
          <stop offset=".77" stop-color="#f28d3f"/>
          <stop offset=".83" stop-color="#ffbf6a"/>
          <stop offset="1" stop-color="#ffe0a8"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#skyG)"/>
      <g>${stars}</g>
    </svg>`;
  }

  function sun() {
    return `<svg ${VB} aria-hidden="true">
      <defs>
        <radialGradient id="halo"><stop offset="0" stop-color="#ffcf86" stop-opacity=".75"/><stop offset=".35" stop-color="#ff9a52" stop-opacity=".28"/><stop offset="1" stop-color="#ff6a3c" stop-opacity="0"/></radialGradient>
        <radialGradient id="disc"><stop offset="0" stop-color="#fffaf0"/><stop offset=".55" stop-color="#ffe2a6"/><stop offset="1" stop-color="#ffb05a"/></radialGradient>
      </defs>
      <g id="sun">
        <ellipse cx="${SUN.x}" cy="${SUN.y}" rx="620" ry="300" fill="url(#halo)"/>
        <circle cx="${SUN.x}" cy="${SUN.y}" r="58" fill="url(#disc)"/>
      </g>
    </svg>`;
  }

  function clouds() {
    const r = rng(9);
    let c = '';
    for (let i = 0; i < 16; i++) {
      const y = 180 + r() * 380;
      const warm = y > 380;
      const col = warm ? (r() < 0.5 ? '#ffb27a' : '#f2846a') : (r() < 0.5 ? '#8a4a7a' : '#5a3a6e');
      c += `<ellipse cx="${f1(-200 + r() * 2000)}" cy="${f1(y)}" rx="${f1(160 + r() * 340)}" ry="${f1(8 + r() * (warm ? 14 : 26))}" fill="${col}" opacity="${(0.25 + r() * 0.35).toFixed(2)}"/>`;
    }
    return `<svg ${VB} aria-hidden="true" style="overflow:visible">
      <defs><filter id="cloudBlur" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="14"/></filter></defs>
      <g filter="url(#cloudBlur)">${c}</g>
    </svg>`;
  }

  /* Procedural skyline */
  function skyline(o) {
    const r = rng(o.seed);
    let bodies = '', rims = '', lights = '';
    const win = { '#ffd9a0': '', '#ffc272': '', '#fff1d6': '', '#f7a95c': '' };
    const cols = Object.keys(win);
    let x = -280, tallest = [];
    while (x < 1880) {
      const bw = o.minW + r() * (o.maxW - o.minW);
      let maxH = o.maxH;
      const cx = x + bw / 2;
      if (o.corridor && Math.abs(cx - SUN.x) < o.corridor) maxH = o.corridorH;
      const bh = o.minH + Math.pow(r(), 1.3) * (maxH - o.minH);
      const top = o.base - bh;
      bodies += `<rect x="${f1(x)}" y="${f1(top)}" width="${f1(bw)}" height="${f1(bh + 200)}"/>`;
      let crownTop = top;
      if (r() < 0.38) { // setback crown
        const sw = bw * (0.4 + r() * 0.35), sh = 12 + r() * 46;
        bodies += `<rect x="${f1(x + (bw - sw) / 2)}" y="${f1(top - sh)}" width="${f1(sw)}" height="${f1(sh + 1)}"/>`;
        crownTop = top - sh;
        if (r() < 0.55) {
          const ah = 24 + r() * 60;
          bodies += `<rect x="${f1(x + bw / 2 - 1)}" y="${f1(crownTop - ah)}" width="2" height="${f1(ah)}"/>`;
          crownTop -= ah;
        }
      }
      tallest.push({ x: x + bw / 2, y: crownTop });

      if (o.rim) {
        const right = cx < SUN.x;
        const strength = o.rim * Math.max(0.25, 1 - Math.abs(cx - SUN.x) / 1100);
        rims += `<rect x="${f1(right ? x + bw - 2 : x)}" y="${f1(top)}" width="2" height="${f1(bh)}" opacity="${strength.toFixed(2)}"/>`;
      }
      if (o.win) {
        const cw = o.cell[0], ch = o.cell[1];
        const nc = Math.floor((bw - 8) / cw), nr = Math.floor((bh - 14) / ch);
        const ox = x + (bw - nc * cw) / 2 + 1;
        for (let rr = 0; rr < nr; rr++) {
          for (let cc = 0; cc < nc; cc++) {
            if (r() < o.win) {
              const col = cols[(r() * cols.length) | 0];
              win[col] += `<rect x="${f1(ox + cc * cw)}" y="${f1(top + 10 + rr * ch)}" width="${o.wsize[0]}" height="${o.wsize[1]}" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
            }
          }
        }
      }
      x += bw + r() * o.gap;
    }
    if (o.beacons) {
      tallest.sort((a, b) => a.y - b.y).slice(0, o.beacons).forEach((t, i) => {
        lights += `<circle class="sky-beacon" cx="${f1(t.x)}" cy="${f1(t.y)}" r="2.6" fill="#ff4b3a" style="animation-delay:${(i * 0.7).toFixed(1)}s"/>`;
      });
    }
    const windows = cols.map((c) => `<g fill="${c}">${win[c]}</g>`).join('');
    return `<svg ${VB} aria-hidden="true">
      <defs>
        <linearGradient id="rim-${o.seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9a0"/><stop offset="1" stop-color="#ff8a4c" stop-opacity="0"/></linearGradient>
        <linearGradient id="haze-${o.seed}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${o.haze}" stop-opacity="0"/><stop offset="1" stop-color="${o.haze}" stop-opacity="${o.hazeOp}"/>
        </linearGradient>
      </defs>
      <g fill="${o.fill}" opacity="${o.opacity || 1}">${bodies}</g>
      <g fill="url(#rim-${o.seed})">${rims}</g>
      ${windows}${lights}
      <rect x="-100" y="${o.base - o.hazeH}" width="1800" height="${o.hazeH + 200}" fill="url(#haze-${o.seed})"/>
    </svg>`;
  }

  function glass() {
    return `<svg ${VB} aria-hidden="true">
      <defs>
        <linearGradient id="streak" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="glare" cx=".2" cy=".85" r=".6"><stop offset="0" stop-color="#ffb380" stop-opacity=".12"/><stop offset="1" stop-color="#ffb380" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#glare)"/>
      <polygon points="260,0 420,0 120,900 -40,900" fill="url(#streak)"/>
      <polygon points="520,0 560,0 260,900 220,900" fill="url(#streak)"/>
      <polygon points="1180,0 1340,0 1040,900 880,900" fill="url(#streak)" opacity=".7"/>
      <polygon points="1420,0 1450,0 1150,900 1120,900" fill="url(#streak)"/>
    </svg>`;
  }

  /* Room shell: ceiling, walls, floor, floor-to-ceiling glazing */
  const WIN = { l: 140, r: 1460, t: 86, b: 756 };
  function room() {
    const mx = [];
    for (let i = 0; i <= 6; i++) mx.push(WIN.l + ((WIN.r - WIN.l) * i) / 6);
    let mulls = '', reflections = '', downlights = '';
    mx.forEach((x, i) => {
      const edge = i === 0 || i === 6;
      if (!edge) {
        mulls += `<rect x="${f1(x - 3)}" y="${WIN.t}" width="6" height="${WIN.b - WIN.t}" fill="#0a090c"/>` +
                 `<rect x="${f1(x + 2)}" y="${WIN.t}" width="1" height="${WIN.b - WIN.t}" fill="url(#mullLight)"/>`;
      }
      const fx = 800 + (x - 800) * 1.9;
      reflections += `<line x1="${f1(x)}" y1="${WIN.b}" x2="${f1(fx)}" y2="1000" stroke="#fff" stroke-opacity=".05" stroke-width="2"/>`;
    });
    [330, 640, 960, 1270].forEach((x) => {
      downlights += `<ellipse cx="${x}" cy="44" rx="14" ry="3" fill="#fff4dc" opacity=".85"/>` +
                    `<polygon points="${x - 12},46 ${x + 12},46 ${x + 90},420 ${x - 90},420" fill="url(#cone)"/>`;
    });
    return `<svg ${VB} aria-hidden="true">
      <defs>
        <linearGradient id="ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050506"/><stop offset="1" stop-color="#121014"/></linearGradient>
        <linearGradient id="wallL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#060506"/><stop offset=".8" stop-color="#141015"/><stop offset="1" stop-color="#2a1a1c"/></linearGradient>
        <linearGradient id="wallR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#060506"/><stop offset=".8" stop-color="#1a1214"/><stop offset="1" stop-color="#3a221d"/></linearGradient>
        <linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a16"/><stop offset=".25" stop-color="#140e0e"/><stop offset="1" stop-color="#060506"/></linearGradient>
        <linearGradient id="sunPool" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb46a" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a4c" stop-opacity="0"/></linearGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc98a" stop-opacity="0"/><stop offset=".6" stop-color="#ffc98a" stop-opacity=".07"/><stop offset="1" stop-color="#ffc98a" stop-opacity="0"/></linearGradient>
        <linearGradient id="mullLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4b483" stop-opacity=".1"/><stop offset=".85" stop-color="#ffc98a" stop-opacity=".55"/><stop offset="1" stop-color="#ffc98a" stop-opacity=".2"/></linearGradient>
        <linearGradient id="cove" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3dcae" stop-opacity="0"/><stop offset=".5" stop-color="#f3dcae"/><stop offset="1" stop-color="#f3dcae" stop-opacity="0"/></linearGradient>
        <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2d8" stop-opacity=".09"/><stop offset="1" stop-color="#fff2d8" stop-opacity="0"/></linearGradient>
        <filter id="blur8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
        <filter id="blur30" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="26"/></filter>
      </defs>

      <!-- floor -->
      <polygon points="${WIN.l},${WIN.b} ${WIN.r},${WIN.b} 1900,1100 -300,1100" fill="url(#floorG)"/>
      <polygon points="${SUN.x - 70},${WIN.b} ${SUN.x + 70},${WIN.b} ${SUN.x + 260},1000 ${SUN.x - 260},1000" fill="url(#sunPool)" filter="url(#blur8)"/>
      <ellipse cx="${SUN.x}" cy="${WIN.b + 18}" rx="380" ry="22" fill="#ff9a52" opacity=".35" filter="url(#blur30)"/>
      ${reflections}

      <!-- light beam across the room -->
      <polygon points="${SUN.x - 160},${WIN.t + 200} ${SUN.x + 160},${WIN.t + 200} ${SUN.x + 520},1000 ${SUN.x - 600},1000" fill="url(#beam)"/>

      <!-- walls & ceiling -->
      <polygon points="-300,-200 ${WIN.l},${WIN.t} ${WIN.l},${WIN.b} -300,1100" fill="url(#wallL)"/>
      <polygon points="1900,-200 ${WIN.r},${WIN.t} ${WIN.r},${WIN.b} 1900,1100" fill="url(#wallR)"/>
      <polygon points="-300,-200 1900,-200 ${WIN.r},${WIN.t} ${WIN.l},${WIN.t}" fill="url(#ceil)"/>
      ${downlights}
      <line x1="${WIN.l}" y1="${WIN.t - 1}" x2="${WIN.r}" y2="${WIN.t - 1}" stroke="url(#cove)" stroke-width="1.4"/>
      <line x1="${WIN.l}" y1="${WIN.t - 1}" x2="${WIN.r}" y2="${WIN.t - 1}" stroke="url(#cove)" stroke-width="10" opacity=".25" filter="url(#blur8)"/>

      <!-- glazing frame -->
      <rect x="${WIN.l - 4}" y="${WIN.t}" width="${WIN.r - WIN.l + 8}" height="6" fill="#0a090c"/>
      <rect x="${WIN.l - 4}" y="${WIN.b - 8}" width="${WIN.r - WIN.l + 8}" height="8" fill="#0a090c"/>
      <rect x="${WIN.l - 4}" y="${WIN.b - 9}" width="${WIN.r - WIN.l + 8}" height="1" fill="#ffc98a" opacity=".35"/>
      <rect x="${WIN.l - 6}" y="${WIN.t}" width="8" height="${WIN.b - WIN.t}" fill="#0a090c"/>
      <rect x="${WIN.r - 2}" y="${WIN.t}" width="8" height="${WIN.b - WIN.t}" fill="#0a090c"/>
      ${mulls}
    </svg>`;
  }

  /* Furniture — silhouettes rim-lit by the sunset */
  function furniture() {
    let leaves = '';
    const r = rng(77);
    for (let i = 0; i < 11; i++) {
      const a = -70 + r() * 140, len = 90 + r() * 110;
      leaves += `<ellipse cx="0" cy="${f1(-len / 2)}" rx="${f1(9 + r() * 8)}" ry="${f1(len / 2)}" transform="rotate(${f1(a)})" fill="#0b0d0a"/>`;
    }
    return `<svg ${VB} aria-hidden="true">
      <defs>
        <linearGradient id="rimL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d4b483" stop-opacity=".2"/><stop offset=".75" stop-color="#ffd59a"/><stop offset="1" stop-color="#ffd59a" stop-opacity=".6"/></linearGradient>
        <linearGradient id="sofaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1716"/><stop offset="1" stop-color="#0a0909"/></linearGradient>
        <radialGradient id="lampG"><stop offset="0" stop-color="#fff6e0"/><stop offset=".5" stop-color="#ffd696"/><stop offset="1" stop-color="#d48a40"/></radialGradient>
        <radialGradient id="lampHalo"><stop offset="0" stop-color="#ffd696" stop-opacity=".45"/><stop offset="1" stop-color="#ffd696" stop-opacity="0"/></radialGradient>
        <radialGradient id="shadowG"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
        <linearGradient id="rug" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2c24" stop-opacity=".55"/><stop offset="1" stop-color="#1a1411" stop-opacity=".2"/></linearGradient>
      </defs>

      <!-- rug -->
      <polygon points="330,812 1240,812 1420,960 160,960" fill="url(#rug)"/>
      <polygon points="330,812 1240,812" stroke="#d4b483" stroke-opacity=".25" fill="none"/>

      <!-- pendant lamp -->
      <line x1="1236" y1="-40" x2="1236" y2="296" stroke="#2a2522" stroke-width="1.2"/>
      <circle cx="1236" cy="318" r="150" fill="url(#lampHalo)"/>
      <circle cx="1236" cy="318" r="24" fill="url(#lampG)"/>

      <!-- plant -->
      <g transform="translate(250 700)">${leaves}</g>
      <path d="M210 700 h80 l-10 120 h-60z" fill="#121011"/>
      <path d="M288 700 l-10 120" stroke="url(#rimL)" stroke-width="1.5"/>

      <!-- sofa (seen from behind, facing the view) -->
      <ellipse cx="760" cy="868" rx="470" ry="40" fill="url(#shadowG)"/>
      <rect x="388" y="742" width="740" height="118" rx="26" fill="url(#sofaG)"/>
      <rect x="350" y="720" width="96" height="140" rx="30" fill="#141110"/>
      <rect x="1070" y="720" width="96" height="140" rx="30" fill="#141110"/>
      <path d="M414 742 H1102" stroke="url(#rimL)" stroke-width="2" stroke-linecap="round"/>
      <path d="M372 721 H426" stroke="url(#rimL)" stroke-width="2" stroke-linecap="round"/>
      <path d="M1092 721 H1146" stroke="#ffd59a" stroke-width="2" stroke-linecap="round" opacity=".9"/>
      <rect x="520" y="716" width="150" height="40" rx="18" fill="#1a1514"/>
      <rect x="860" y="712" width="160" height="44" rx="20" fill="#1a1514"/>
      <path d="M540 716 H650" stroke="url(#rimL)" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M882 712 H1000" stroke="#ffd59a" stroke-width="1.5" stroke-linecap="round" opacity=".8"/>

      <!-- side table + lounge chair -->
      <ellipse cx="1300" cy="880" rx="120" ry="18" fill="url(#shadowG)"/>
      <path d="M1210 760 q60 -40 150 -10 q40 14 46 60 l-4 70 h-200 z" fill="#100e0e"/>
      <path d="M1214 758 q60 -40 150 -10" stroke="#ffd59a" stroke-width="1.6" fill="none" opacity=".85"/>
    </svg>`;
  }

  /* Map 1600×900 slice-coordinates to pixel positions inside a layer */
  function sliceMap(layerEl) {
    const w = layerEl.clientWidth, h = layerEl.clientHeight;
    const s = Math.max(w / 1600, h / 900);
    const ox = (w - 1600 * s) / 2, oy = (h - 900 * s) / 2;
    return (x, y) => [ox + x * s, oy + y * s];
  }

  function buildInterior() {
    const $ = (id) => document.getElementById(id);
    $('l-sky').innerHTML = sky();
    $('l-sun').innerHTML = sun();
    $('l-clouds').innerHTML = clouds();
    $('l-far').innerHTML = skyline({ seed: 3, base: 735, minH: 40, maxH: 190, minW: 26, maxW: 80, gap: 8, fill: '#5a2e4a', opacity: 0.8, haze: '#ff9e6a', hazeOp: 0.55, hazeH: 160, win: 0, rim: 0 });
    $('l-mid').innerHTML = skyline({ seed: 7, base: 748, minH: 70, maxH: 310, minW: 40, maxW: 110, gap: 18, fill: '#25172a', haze: '#d8704f', hazeOp: 0.35, hazeH: 120, win: 0.1, cell: [8, 11], wsize: [3, 5], rim: 0.45, corridor: 120, corridorH: 140 });
    $('l-near').innerHTML = skyline({ seed: 11, base: 770, minH: 150, maxH: 500, minW: 70, maxW: 160, gap: 46, fill: '#0e0b11', haze: '#2a1520', hazeOp: 0.5, hazeH: 60, win: 0.17, cell: [10, 13], wsize: [4, 6], rim: 0.7, corridor: 190, corridorH: 120, beacons: 3 });
    $('l-glass').innerHTML = glass();
    $('l-room').innerHTML = room();
    $('l-furniture').innerHTML = furniture();
  }

  /* Hotspots live inside their parallax layer so they move with the scene */
  const HOTSPOTS = [
    { layer: 'l-room', x: 620, y: 300, title: 'Panoramic glazing', text: '6.2 m floor-to-ceiling, low-iron glass. West-facing for golden hour, every evening.' },
    { layer: 'l-near', x: 1380, y: 470, title: 'Protected skyline', text: 'Air rights secured — nothing will ever rise in front of this view.' },
    { layer: 'l-furniture', x: 760, y: 700, title: 'The Lounge', text: 'Bespoke walnut & bouclé seating, curated by Atelier Aurum.' },
    { layer: 'l-furniture', x: 1236, y: 318, title: 'Hand-blown glass', text: 'Pendant lighting mouth-blown in Murano, dimmable to candlelight.' }
  ];

  function placeHotspots() {
    document.querySelectorAll('.hotspot').forEach((el) => {
      const layer = el.parentElement;
      const map = sliceMap(layer);
      const [x, y] = map(+el.dataset.x, +el.dataset.y);
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    });
  }
  function buildHotspots() {
    HOTSPOTS.forEach((h, i) => {
      const b = document.createElement('button');
      b.className = 'hotspot';
      b.dataset.x = h.x; b.dataset.y = h.y; b.dataset.title = h.title; b.dataset.text = h.text; b.dataset.index = i;
      b.setAttribute('aria-label', h.title + ': ' + h.text);
      document.getElementById(h.layer).appendChild(b);
    });
    placeHotspots();
  }

  window.Scene = { buildTower, buildInterior, buildHotspots, placeHotspots, sliceMap, HOTSPOTS, FLOORS };
})();

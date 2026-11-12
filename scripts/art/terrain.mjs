// Terrain auto-tiles and wall (border / fence / hedge) auto-tiles.
//
// Style: bright, flat cartoon colours with fine speckled texture, no black
// outlines (edges are darker shades of the same colour).
//
// Terrain sheets are 16 columns (one per neighbour mask) x 3 rows (texture variants).
// Mask bits: N=1, E=2, S=4, W=8 — a bit is set when that neighbour is the same layer.
import { Pix, rng, save, sheet } from './pix.mjs';

const T = 16;

/**
 * Shape of a tile given which sides are open. `corner` is 'round', 'chamfer'
 * (45° cut, like the putting greens) or 'square' (stepped, blocky edges).
 */
function makeMaskFns(mask, inset, corner, size) {
  const open = { n: !(mask & 1), e: !(mask & 2), s: !(mask & 4), w: !(mask & 8) };
  const iN = open.n ? inset : 0, iS = open.s ? inset : 0, iE = open.e ? inset : 0, iW = open.w ? inset : 0;
  const inCore = (x, y) => {
    if (x < iW || x >= T - iE || y < iN || y >= T - iS) return false;
    if (corner === 'square' || !size) return true;
    const cut = (dx, dy) => {
      // dx, dy = distance in px from the corner along each edge (0-based)
      if (corner === 'chamfer') return dx + dy >= size;
      const cx = size - dx - 0.5, cy = size - dy - 0.5;
      return cx <= 0 || cy <= 0 || cx * cx + cy * cy <= size * size + 0.3;
    };
    if (open.n && open.w && x < iW + size && y < iN + size && !cut(x - iW, y - iN)) return false;
    if (open.n && open.e && x >= T - iE - size && y < iN + size && !cut(T - iE - 1 - x, y - iN)) return false;
    if (open.s && open.w && x < iW + size && y >= T - iS - size && !cut(x - iW, T - iS - 1 - y)) return false;
    if (open.s && open.e && x >= T - iE - size && y >= T - iS - size && !cut(T - iE - 1 - x, T - iS - 1 - y)) return false;
    return true;
  };
  // Membership including virtual pixels just beyond the tile on connected sides.
  const inside = (x, y) => {
    if (x < 0 && open.w) return false;
    if (x >= T && open.e) return false;
    if (y < 0 && open.n) return false;
    if (y >= T && open.s) return false;
    return inCore(Math.min(T - 1, Math.max(0, x)), Math.min(T - 1, Math.max(0, y)));
  };
  return { open, inside };
}

/** Distance (1..max) to the nearest outside pixel in direction (dx,dy), or Infinity. */
function distTo(inside, x, y, dx, dy, max) {
  for (let k = 1; k <= max; k++) if (!inside(x + dx * k, y + dy * k)) return k;
  return Infinity;
}

function edgeDist(inside, x, y, max) {
  return Math.min(distTo(inside, x, y, 0, 1, max), distTo(inside, x, y, 0, -1, max), distTo(inside, x, y, 1, 0, max), distTo(inside, x, y, -1, 0, max));
}

/** Fine 3-tone speckle. */
const speckle = (base, dark, light, pd = 0.16, pl = 0.12) => (x, y, r) => {
  const v = r();
  return v < pd ? dark : v < pd + pl ? light : base;
};

const LAYERS = {
  sand: {
    inset: 1, corner: 'round', size: 3,
    tex: speckle('#e6c582', '#d4ae6a', '#f2d89e', 0.18, 0.12),
    edge(x, y, ins, col) {
      return edgeDist(ins, x, y, 1) === 1 ? '#f4e0b0' : col;
    },
  },
  grass: {
    inset: 0, corner: 'square', size: 0,
    tex: speckle('#5a9c3e', '#4c8b34', '#68ab48', 0.2, 0.16),
    // A tan sandy rim wherever grass meets water or beach (like the pond banks).
    edge(x, y, ins, col) {
      const d = edgeDist(ins, x, y, 2);
      if (d === 1) return '#d8b06a';
      if (d === 2) return (x + y) % 3 ? '#c99e5a' : '#e2bf7e';
      return col;
    },
  },
  dirt: {
    inset: 0, corner: 'square', size: 0,
    tex: speckle('#c98d55', '#b07745', '#dca06a', 0.22, 0.12),
    edge(x, y, ins, col) {
      return edgeDist(ins, x, y, 1) === 1 ? '#b07745' : col;
    },
  },
  stone: {
    // Grey gravel path.
    inset: 0, corner: 'square', size: 0,
    tex: speckle('#a9a9a7', '#949492', '#bdbdbb', 0.24, 0.16),
    edge(x, y, ins, col) {
      return edgeDist(ins, x, y, 1) === 1 ? '#9a9a98' : col;
    },
  },
  brick: {
    inset: 0, corner: 'square', size: 0,
    tex(x, y) {
      const row = Math.floor(y / 4);
      const off = row % 2 ? 4 : 0;
      const lx = (x + off) % 8;
      if (y % 4 === 3 || lx === 7) return '#a8553f';
      if (y % 4 === 0) return '#d98466';
      return ((Math.floor((x + off) / 8) + row) % 3) === 0 ? '#c0654b' : '#c96f54';
    },
    edge(x, y, ins, col) {
      return edgeDist(ins, x, y, 1) === 1 ? '#a8553f' : col;
    },
  },
  green: {
    // Lime putting green with diagonal mowing stripes and cut corners.
    inset: 0, corner: 'chamfer', size: 5,
    tex(x, y, r) {
      const stripe = Math.floor((x + y) / 4) % 2 === 0;
      const v = r();
      if (v < 0.06) return stripe ? '#93cf45' : '#86c23a';
      return stripe ? '#8ccb3f' : '#7fbd36';
    },
    edge(x, y, ins, col) {
      return edgeDist(ins, x, y, 1) === 1 ? '#6fa82e' : col;
    },
  },
  bunker: {
    inset: 0, corner: 'chamfer', size: 4,
    tex: speckle('#ecd59a', '#dcc082', '#f6e3b2', 0.18, 0.14),
    edge(x, y, ins, col) {
      const dN = distTo(ins, x, y, 0, -1, 2);
      if (edgeDist(ins, x, y, 1) === 1) return '#c9a86a';
      if (dN === 2) return '#d8bd84';
      return col;
    },
  },
};

function terrainTile(name, mask, variant) {
  const L = LAYERS[name];
  const { inside } = makeMaskFns(mask, L.inset, L.corner, L.size);
  const p = new Pix(T, T);
  const r = rng(1000 * variant + name.length * 77 + 13);
  const tex = [];
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) tex.push(L.tex(x, y, r));
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (!inside(x, y)) continue;
      p.set(x, y, L.edge(x, y, inside, tex[y * T + x]));
    }
  }
  if (name === 'sand') {
    // Thin light rim on the water side of the beach.
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (inside(x, y)) continue;
      if (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1)) p.set(x, y, '#bfeaf8b0');
    }
  }
  return p;
}

function waterFrames() {
  // Flat, bright cyan with a few soft glints.
  const frames = [];
  const r = rng(4242);
  const glints = [];
  for (let i = 0; i < 9; i++) glints.push({ x: Math.floor(r() * 32), y: Math.floor(r() * 32), len: 2 + Math.floor(r() * 2), ph: Math.floor(r() * 4) });
  for (let f = 0; f < 4; f++) {
    const p = new Pix(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const n = Math.sin((x + f * 2) * 0.35) + Math.sin((y * 0.6 + x * 0.15) * 0.5 + f * 0.5);
      p.set(x, y, n > 1.4 ? '#22b4ea' : '#19ade6');
    }
    for (const g of glints) {
      if ((f + g.ph) % 4 === 3) continue;
      const shift = (f + g.ph) % 4;
      for (let k = 0; k < g.len; k++) p.set((g.x + k + shift) % 32, g.y, '#6fd2f4');
    }
    frames.push(p);
  }
  return frames;
}

// ---- Walls ---------------------------------------------------------------
// Frames are 16x24: the bottom 16 rows line up with the map cell, the top
// 8 rows give walls room to stand up (2.5D).
export const WALLS = {
  // The brown cobble border around the greens.
  rail_wood: { t: 12, h: 2, kind: 'cobble', top: ['#b5744a', '#a3653d', '#c98b5c'], side: ['#8a5232', '#7a4629'], out: '#6e3f24' },
  rail_brick: { t: 12, h: 2, kind: 'cobble', top: ['#c9624a', '#b5543e', '#dd7a60'], side: ['#9a4330', '#843727'], out: '#7a3426' },
  rail_stone: { t: 12, h: 2, kind: 'cobble', top: ['#b9b6ae', '#a6a39b', '#cfccc4'], side: ['#8c8982', '#7a7770'], out: '#6e6b64' },
  fence_white: { t: 2, h: 9, kind: 'picket', top: ['#ffffff', '#f2f2f2'], side: ['#f0f0f2', '#d8d9e0'], out: '#b8bac6' },
  fence_wood: { t: 2, h: 9, kind: 'rail', top: ['#8a5232', '#7a4629'], side: ['#8a5232', '#6e3f24'], out: '#5a321c' },
  hedge: { t: 12, h: 7, kind: 'leafy', top: ['#2f8a48', '#26773d'], side: ['#22703a', '#1b5e30'], out: '#185228' },
};

function wallFootprint(t, ext) {
  const c0 = Math.floor((T - t) / 2), c1 = c0 + t;
  return (mask) => (x, y) => {
    const inC = (v) => v >= c0 && v < c1;
    if (inC(x) && inC(y)) return true;
    if ((mask & 1) && inC(x) && y < c0 && y >= -ext) return true;
    if ((mask & 4) && inC(x) && y >= c1 && y < T + ext) return true;
    if ((mask & 8) && inC(y) && x < c0 && x >= -ext) return true;
    if ((mask & 2) && inC(y) && x >= c1 && x < T + ext) return true;
    return false;
  };
}

function wallTile(spec, mask) {
  const PAD = 3;
  const W = T + PAD * 2, H = 24 + PAD * 2;
  const p = new Pix(W, H);
  const fp = wallFootprint(spec.t, PAD)(mask);
  const c0 = Math.floor((T - spec.t) / 2);
  const inC = (v) => v >= c0 && v < c0 + spec.t;
  const OY = 8 + PAD, OX = PAD;
  const r = rng(mask * 7 + spec.t * 131);
  // sides (front faces)
  for (let y = -PAD; y < T + PAD; y++) {
    for (let x = -PAD; x < T + PAD; x++) {
      if (!fp(x, y)) continue;
      for (let k = 0; k < spec.h; k++) {
        let c = k < spec.h / 2 ? spec.side[1] : spec.side[0];
        if (spec.kind === 'picket' && (x & 3) === 3 && k > 1 && k < spec.h - 1) c = null;
        if (spec.kind === 'picket' && k === spec.h - 3) c = spec.side[0];
        // Post-and-rail fence: posts every 4px, two rails.
        // Post-and-rail fence: posts every 6px along the run, two rails between.
        if (spec.kind === 'rail') {
          const along = inC(y) ? x : y;
          const post = ((along + 64) % 6) === 1;
          c = post ? (k === spec.h - 1 ? '#a8704a' : spec.side[0]) : (k === 3 || k === spec.h - 3) ? spec.side[1] : null;
        }
        if (spec.kind === 'leafy' && r() < 0.25) c = '#2a7d42';
        if (c) p.set(OX + x, OY + y - k, c);
      }
    }
  }
  // top face
  for (let y = -PAD; y < T + PAD; y++) {
    for (let x = -PAD; x < T + PAD; x++) {
      if (!fp(x, y)) continue;
      let c = spec.top[0];
      if (spec.kind === 'cobble') {
        // Rounded cobbles: 4x4 stones with dark gaps and a lit top-left.
        const ox = (Math.floor((y + 64) / 4) % 2) * 2;
        const lx = (x + 64 + ox) % 4, ly = (y + 64) % 4;
        const id = Math.floor((x + 64 + ox) / 4) * 7 + Math.floor((y + 64) / 4) * 3;
        if (lx === 3 || ly === 3) c = spec.side[0];
        else if (lx === 0 && ly === 0) c = spec.top[2];
        else c = id % 3 === 0 ? spec.top[1] : spec.top[0];
      } else if (spec.kind === 'leafy') {
        const v = r();
        c = v < 0.2 ? '#3fa25a' : v < 0.45 ? spec.top[1] : spec.top[0];
      } else if (spec.kind === 'rail') {
        const along = inC(y) ? x : y;
        c = ((along + 64) % 6) === 1 ? '#a8704a' : spec.top[0];
      }
      if (c && !fp(x, y - 1) && spec.kind !== 'cobble' && spec.kind !== 'rail') c = spec.kind === 'leafy' ? '#4fb468' : spec.top[0];
      if (c) p.set(OX + x, OY + y - spec.h, c);
    }
  }
  p.outline(spec.out);
  const out = new Pix(T, 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < T; x++) {
    const c = p.get(x + PAD, y + PAD);
    if (c[3]) out.set(x, y, c);
  }
  return out;
}

export function generateTerrain() {
  for (const name of Object.keys(LAYERS)) {
    const frames = [];
    for (let v = 0; v < 3; v++) for (let m = 0; m < 16; m++) frames.push(terrainTile(name, m, v));
    save(sheet(frames, T, T, 16), `assets/terrain/${name}.png`);
  }
  save(sheet(waterFrames(), 32, 32), 'assets/terrain/water.png');
  for (const [name, spec] of Object.entries(WALLS)) {
    const frames = [];
    for (let m = 0; m < 16; m++) frames.push(wallTile(spec, m));
    save(sheet(frames, T, 24, 16), `assets/walls/${name}.png`);
  }
}

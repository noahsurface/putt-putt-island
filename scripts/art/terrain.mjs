// Terrain auto-tiles and wall (rail / fence / hedge) auto-tiles.
//
// Terrain sheets are 16 columns (one per neighbour mask) x 3 rows (texture variants).
// Mask bits: N=1, E=2, S=4, W=8 — a bit is set when that neighbour is the same layer.
import { Pix, rng, save, sheet } from './pix.mjs';

const T = 16;

function makeMaskFns(mask, inset, round) {
  const open = { n: !(mask & 1), e: !(mask & 2), s: !(mask & 4), w: !(mask & 8) };
  const iN = open.n ? inset : 0, iS = open.s ? inset : 0, iE = open.e ? inset : 0, iW = open.w ? inset : 0;
  const r = round;
  const inCore = (x, y) => {
    if (x < iW || x >= T - iE || y < iN || y >= T - iS) return false;
    const corner = (cx, cy) => {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      return dx * dx + dy * dy <= r * r + 0.3;
    };
    if (open.n && open.w && x < iW + r && y < iN + r) return corner(iW + r, iN + r);
    if (open.n && open.e && x >= T - iE - r && y < iN + r) return corner(T - iE - r, iN + r);
    if (open.s && open.w && x < iW + r && y >= T - iS - r) return corner(iW + r, T - iS - r);
    if (open.s && open.e && x >= T - iE - r && y >= T - iS - r) return corner(T - iE - r, T - iS - r);
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

const LAYERS = {
  sand: {
    inset: 2, round: 4,
    tex(x, y, r) {
      const v = r();
      if (v < 0.07) return '#dcb877';
      if (v < 0.12) return '#fbe9c2';
      return '#f0d49a';
    },
    edge(x, y, ins, col) {
      const d = Math.min(distTo(ins, x, y, 0, 1, 3), distTo(ins, x, y, 0, -1, 3), distTo(ins, x, y, 1, 0, 3), distTo(ins, x, y, -1, 0, 3));
      if (d === 1) return '#d1a865';
      if (d === 2) return '#dfbb7a';
      return col;
    },
  },
  grass: {
    inset: 0, round: 4,
    tex(x, y, r) {
      const v = r();
      if (v < 0.05 && y > 0 && y < 15) return 'blade';
      if (v < 0.1) return '#6fbb45';
      if (v < 0.13) return '#4f9a34';
      return '#5aa83c';
    },
    edge(x, y, ins, col) {
      const dS = distTo(ins, x, y, 0, 1, 4);
      if (dS === 1) return '#4a2c16';
      if (dS === 2) return '#6b4122';
      if (dS === 3) return '#8a5a30';
      if (dS === 4) return '#3d7d2a';
      const d = Math.min(distTo(ins, x, y, 0, -1, 1), distTo(ins, x, y, 1, 0, 1), distTo(ins, x, y, -1, 0, 1));
      if (d === 1) return '#36702a';
      return col;
    },
  },
  dirt: {
    inset: 0, round: 3,
    tex(x, y, r) {
      const v = r();
      if (v < 0.06) return '#9c6c3c';
      if (v < 0.12) return '#dcb07a';
      return '#c9995f';
    },
    edge(x, y, ins, col) {
      const d = Math.min(distTo(ins, x, y, 0, 1, 1), distTo(ins, x, y, 0, -1, 1), distTo(ins, x, y, 1, 0, 1), distTo(ins, x, y, -1, 0, 1));
      if (d === 1) return '#9c6c3c';
      return col;
    },
  },
  stone: {
    inset: 0, round: 2,
    tex(x, y) {
      // Seamless cobble pattern: three courses of 16 rows, alternate offset.
      const rows = [[0, 5], [5, 11], [11, 16]];
      const ri = rows.findIndex(([a, b]) => y >= a && y < b);
      const [y0, y1] = rows[ri];
      const off = ri === 1 ? 4 : 0;
      const lx = (x + off) % 8;
      const stoneId = Math.floor(((x + off) % 16) / 8) + ri * 2;
      if (lx === 7 || y === y1 - 1) return '#857e72';
      if (lx === 0 || y === y0) return '#dcd5c7';
      if (lx === 6 || y === y1 - 2) return '#a39c8e';
      return stoneId % 3 === 0 ? '#bdb6a8' : stoneId % 3 === 1 ? '#c7c0b2' : '#b4ad9f';
    },
    edge(x, y, ins, col) {
      const d = Math.min(distTo(ins, x, y, 0, 1, 1), distTo(ins, x, y, 0, -1, 1), distTo(ins, x, y, 1, 0, 1), distTo(ins, x, y, -1, 0, 1));
      if (d === 1) return '#6e685e';
      return col;
    },
  },
  brick: {
    inset: 0, round: 2,
    tex(x, y) {
      const row = Math.floor(y / 4);
      const off = row % 2 ? 4 : 0;
      const lx = (x + off) % 8;
      if (y % 4 === 3 || lx === 7) return '#8e4a37';
      if (y % 4 === 0 || lx === 0) return '#d98466';
      return ((Math.floor((x + off) / 8) + row) % 3) === 0 ? '#b45d44' : '#c56a4f';
    },
    edge(x, y, ins, col) {
      const d = Math.min(distTo(ins, x, y, 0, 1, 1), distTo(ins, x, y, 0, -1, 1), distTo(ins, x, y, 1, 0, 1), distTo(ins, x, y, -1, 0, 1));
      if (d === 1) return '#6e3527';
      return col;
    },
  },
  green: {
    inset: 0, round: 2,
    tex(x, y, r) {
      const stripe = Math.floor(y / 4) % 2 === 0;
      const v = r();
      if (v < 0.05) return stripe ? '#5ccc69' : '#53c060';
      return stripe ? '#4fbe5d' : '#46b154';
    },
    edge(x, y, ins, col) {
      const d = Math.min(distTo(ins, x, y, 0, 1, 1), distTo(ins, x, y, 0, -1, 1), distTo(ins, x, y, 1, 0, 1), distTo(ins, x, y, -1, 0, 1));
      if (d === 1) return '#2f7d3c';
      return col;
    },
  },
  bunker: {
    inset: 0, round: 4,
    tex(x, y, r) {
      const wobble = Math.round(Math.sin((x + 3) * 0.7) * 0.6);
      if ((y + wobble) % 4 === 0) return '#f8e7bd';
      return r() < 0.06 ? '#e0c88f' : '#efd9a4';
    },
    edge(x, y, ins, col) {
      const dN = distTo(ins, x, y, 0, -1, 2);
      const d = Math.min(distTo(ins, x, y, 0, 1, 1), dN, distTo(ins, x, y, 1, 0, 1), distTo(ins, x, y, -1, 0, 1));
      if (d === 1) return '#b48f55';
      if (dN === 2) return '#cfb27a';
      if (distTo(ins, x, y, -1, 0, 2) === 2) return '#dcc28b';
      return col;
    },
  },
};

function terrainTile(name, mask, variant) {
  const L = LAYERS[name];
  const { inside } = makeMaskFns(mask, L.inset, L.round);
  const p = new Pix(T, T);
  const r = rng(1000 * variant + name.length * 77 + 13);
  // Interior texture first (pattern is independent of mask so tiles join seamlessly).
  const tex = [];
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) tex.push(L.tex(x, y, r));
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      let c = tex[y * T + x];
      if (c === 'blade') c = '#5aa83c';
      if (!inside(x, y)) continue;
      p.set(x, y, L.edge(x, y, inside, c));
    }
  }
  // Grass blades: little dark "v" tufts.
  if (name === 'grass') {
    const rb = rng(500 + variant * 31);
    for (let i = 0; i < 5; i++) {
      const bx = 2 + Math.floor(rb() * 12), by = 2 + Math.floor(rb() * 9);
      if (!inside(bx, by) || !inside(bx + 2, by + 1) || !inside(bx, by + 5)) continue;
      p.set(bx, by, '#3f7f2c');
      p.set(bx + 2, by, '#3f7f2c');
      p.set(bx + 1, by + 1, '#3f7f2c');
      p.set(bx, by - 1, '#78c24c');
    }
  }
  if (name === 'dirt') {
    const rb = rng(900 + variant * 17);
    for (let i = 0; i < 3; i++) {
      const bx = 2 + Math.floor(rb() * 12), by = 2 + Math.floor(rb() * 12);
      if (!inside(bx, by) || !inside(bx + 1, by + 1)) continue;
      p.set(bx, by, '#e3c08f');
      p.set(bx + 1, by, '#9c6c3c');
      p.set(bx, by + 1, '#9c6c3c');
    }
  }
  if (name === 'sand') {
    // Foam just outside the sand on open sides.
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        if (inside(x, y)) continue;
        const near1 = inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1);
        if (near1 && (x * 3 + y * 5) % 7 !== 0) p.set(x, y, '#f4fbffd0');
        else if (!near1) {
          const near2 = inside(x + 2, y) || inside(x - 2, y) || inside(x, y + 2) || inside(x, y - 2);
          if (near2 && (x + y * 2) % 4 === 0) p.set(x, y, '#e6f6ff90');
        }
      }
    }
  }
  return p;
}

function waterFrames() {
  const frames = [];
  const r = rng(4242);
  const dashes = [];
  for (let i = 0; i < 14; i++) dashes.push({ x: Math.floor(r() * 32), y: Math.floor(r() * 32), len: 2 + Math.floor(r() * 3), ph: Math.floor(r() * 4) });
  const sparkles = [];
  for (let i = 0; i < 4; i++) sparkles.push({ x: Math.floor(r() * 32), y: Math.floor(r() * 32), ph: i });
  for (let f = 0; f < 4; f++) {
    const p = new Pix(32, 32);
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const n = Math.sin((x + f * 2) * 0.4) + Math.sin((y * 0.7 + x * 0.2) * 0.5 + f * 0.6);
        p.set(x, y, n > 1.1 ? '#4a94d2' : n < -1.2 ? '#3576b3' : '#3d86c6');
      }
    }
    for (const d of dashes) {
      const shift = (f + d.ph) % 4;
      for (let k = 0; k < d.len; k++) p.set((d.x + k + shift) % 32, d.y, '#6ab3e6');
    }
    for (const s of sparkles) if (s.ph === f) {
      p.set(s.x, s.y, '#d8f3ff');
      p.set((s.x + 1) % 32, s.y, '#9fd3f5');
      p.set((s.x + 31) % 32, s.y, '#9fd3f5');
    }
    frames.push(p);
  }
  return frames;
}

// ---- Walls ---------------------------------------------------------------
// Frames are 16x24: the bottom 16 rows line up with the map cell, the top
// 8 rows give walls room to stand up (2.5D).
export const WALLS = {
  rail_wood: { t: 4, h: 3, top: ['#e0a96a', '#c98f52'], side: ['#a3693a', '#7c4b26'], out: '#4a2c17' },
  rail_brick: { t: 6, h: 4, top: ['#d4775a', '#b85f45'], side: ['#9e4c37', '#7a3828'], out: '#4f2219', brick: true },
  rail_stone: { t: 6, h: 4, top: ['#d0cabd', '#b3ad9f'], side: ['#958f82', '#757064'], out: '#3f3b35', brick: true },
  fence_white: { t: 2, h: 9, top: ['#ffffff', '#f2f2f2'], side: ['#e6e8ee', '#c9ccd6'], out: '#6c7084', picket: true },
  hedge: { t: 12, h: 7, top: ['#5fae43', '#4c9a35'], side: ['#3f8530', '#2f6b25'], out: '#1f4a17', leafy: true },
};

function wallFootprint(t, ext) {
  // Returns fn(x,y) for footprint membership in cell coords, extending `ext`
  // pixels beyond the cell on connected sides (for seamless outlines).
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
  const OY = 8 + PAD, OX = PAD;
  const r = rng(mask * 7 + spec.t * 131);
  // sides
  for (let y = -PAD; y < T + PAD; y++) {
    for (let x = -PAD; x < T + PAD; x++) {
      if (!fp(x, y)) continue;
      for (let k = 0; k < spec.h; k++) {
        let c = k < spec.h / 2 ? spec.side[1] : spec.side[0];
        if (spec.picket && (x & 3) === 3 && k > 1 && k < spec.h - 1) c = null;
        if (spec.picket && k === spec.h - 3) c = spec.side[0];
        if (spec.brick && (k === Math.floor(spec.h / 2) || ((x + (k > spec.h / 2 ? 2 : 0)) % 4 === 0))) c = spec.out + '90';
        if (spec.leafy && r() < 0.25) c = '#4f9a3a';
        if (c) p.set(OX + x, OY + y - k, c);
      }
    }
  }
  // top face
  for (let y = -PAD; y < T + PAD; y++) {
    for (let x = -PAD; x < T + PAD; x++) {
      if (!fp(x, y)) continue;
      let c = spec.top[(x + y) % 5 === 0 ? 1 : 0];
      if (spec.leafy) {
        const v = r();
        c = v < 0.2 ? '#76c454' : v < 0.4 ? spec.top[1] : spec.top[0];
      }
      if (spec.brick && ((y % 3 === 0) || (x + (Math.floor(y / 3) % 2) * 2) % 4 === 0)) c = spec.top[1];
      // highlight on the northern edge of the top face
      if (!fp(x, y - 1)) c = spec.leafy ? '#86d062' : spec.top[0];
      p.set(OX + x, OY + y - spec.h, c);
    }
  }
  p.outline(spec.out);
  // Crop the padded tile.
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

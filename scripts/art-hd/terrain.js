// Terrain auto-tiles, water and walls (borders, fences, hedge) at 64 px/tile.
//
// Terrain sheets: 16 columns (neighbour mask N=1,E=2,S=4,W=8 — bit set when the
// neighbour is the same layer) × 3 rows (texture variants). Wall sheets: 16
// frames of 64×96 (bottom 64 rows = the map cell, top 32 rows = headroom).

/** Path of a terrain tile's shape. Connected sides extend far past the tile so edges only appear on open sides. */
function tilePath(g, mask, inset, corner, size) {
  const T = TILE, X = 60;
  const open = { n: !(mask & 1), e: !(mask & 2), s: !(mask & 4), w: !(mask & 8) };
  const x0 = open.w ? inset : -X, x1 = open.e ? T - inset : T + X;
  const y0 = open.n ? inset : -X, y1 = open.s ? T - inset : T + X;
  const c = (a, b) => (open[a] && open[b] && corner !== 'square' ? size : 0);
  const nw = c('n', 'w'), ne = c('n', 'e'), se = c('s', 'e'), sw = c('s', 'w');
  const turn = (cx, cy, ex, ey, r) => {
    if (!r) return g.lineTo(cx, cy);
    if (corner === 'chamfer') return g.lineTo(ex, ey);
    g.arcTo(cx, cy, ex, ey, r);
  };
  g.beginPath();
  g.moveTo(x0 + nw, y0);
  g.lineTo(x1 - ne, y0);
  turn(x1, y0, x1, y0 + ne, ne);
  g.lineTo(x1, y1 - se);
  turn(x1, y1, x1 - se, y1, se);
  g.lineTo(x0 + sw, y1);
  turn(x0, y1, x0, y1 - sw, sw);
  g.lineTo(x0, y0 + nw);
  turn(x0, y0, x0 + nw, y0, nw);
  g.closePath();
}

/** Diagonal mowing stripes, anti-aliased, seamless across 64 px tiles (6 stripe pairs per tile). */
function stripes(g, w, h, a, b, seed) {
  const img = g.createImageData(w, h);
  const A = hexToRgb(a), B = hexToRgb(b);
  const P = TILE / 6;
  const r = rng(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (((x + y + 0.5) % P) + P) % P / P; // 0..1
    // smooth band edges at u=0.5 and u=0/1
    const d = Math.min(Math.abs(u - 0.5), Math.min(u, 1 - u));
    const aa = Math.min(1, d * P / 1.2);
    let t = u < 0.5 ? 1 : 0;
    t = 0.5 + (t - 0.5) * aa;
    const n = (r() - 0.5) * 6;
    const i = (y * w + x) * 4;
    img.data[i] = A[0] * t + B[0] * (1 - t) + n;
    img.data[i + 1] = A[1] * t + B[1] * (1 - t) + n;
    img.data[i + 2] = A[2] * t + B[2] * (1 - t) + n;
    img.data[i + 3] = 255;
  }
  const c = makeCanvas(w, h);
  c.getContext('2d').putImageData(img, 0, 0);
  g.drawImage(c, 0, 0);
}

const TERRAIN = {
  sand: {
    inset: 4, corner: 'round', size: 14,
    fill: (g, s) => speckle(g, 0, 0, TILE, TILE, '#e6c582', '#d6b16e', '#f2d79e', s, { grain: 2 }),
    edge: [{ w: 3, c: 'rgba(255,248,220,0.9)' }],
    foam: true,
  },
  grass: {
    inset: 0, corner: 'square', size: 0,
    fill: (g, s) => {
      speckle(g, 0, 0, TILE, TILE, '#4f9139', '#41802f', '#5fa345', s, { grain: 3, pd: 0.28, pl: 0.22 });
      speckle(g, 0, 0, TILE, TILE, 'rgba(0,0,0,0)', 'rgba(50,110,35,0.6)', 'rgba(120,180,80,0.35)', s + 11, { grain: 2, pd: 0.12, pl: 0.08 });
      speckle2(g, s + 7, 'rgba(35,90,25,0.4)', 'rgba(120,185,85,0.3)');
    },
    edge: [{ w: 9, c: '#d3aa66', speck: ['#c39a58', '#e0bc7c'] }, { w: 2, c: '#b8904f', at: 9 }],
  },
  dirt: {
    inset: 0, corner: 'square', size: 0,
    fill: (g, s) => speckle(g, 0, 0, TILE, TILE, '#c98d55', '#b27746', '#dba06a', s, { grain: 3 }),
    edge: [{ w: 2, c: '#a96f3e' }],
  },
  stone: {
    // grey gravel path
    inset: 0, corner: 'square', size: 0,
    fill: (g, s) => {
      speckle(g, 0, 0, TILE, TILE, '#a8a8a6', '#909090', '#c0c0be', s, { grain: 2, pd: 0.3, pl: 0.22 });
      const r = rng(s + 3);
      for (let i = 0; i < 14; i++) ellipse(g, r() * TILE, r() * TILE, 1.5 + r() * 2, 1.2 + r() * 1.5, r() < 0.5 ? '#8a8a88' : '#cacac8');
    },
    edge: [{ w: 2, c: '#929290' }],
  },
  brick: {
    inset: 0, corner: 'square', size: 0,
    fill: (g, s) => {
      g.fillStyle = '#9e4c36';
      g.fillRect(0, 0, TILE, TILE);
      const r = rng(s);
      for (let row = 0; row < 8; row++) for (let col = -1; col < 4; col++) {
        const x = col * 16 + (row % 2 ? 8 : 0), y = row * 8;
        roundRect(g, x + 1, y + 1, 14, 6, 2, r() < 0.3 ? '#c0654b' : '#cc7056');
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.fillRect(x + 2, y + 1.5, 12, 1.5);
      }
    },
    edge: [{ w: 2, c: '#8a3e2c' }],
  },
  green: {
    inset: 0, corner: 'chamfer', size: 20,
    fill: (g, s) => stripes(g, TILE, TILE, '#88c43c', '#7ab433', s),
    edge: [{ w: 2, c: '#6a9f2a' }],
  },
  bunker: {
    inset: 0, corner: 'chamfer', size: 16,
    fill: (g, s) => {
      speckle(g, 0, 0, TILE, TILE, '#ecd59a', '#dcc082', '#f6e4b4', s, { grain: 2 });
      const grd = g.createLinearGradient(0, 0, 0, 14);
      grd.addColorStop(0, 'rgba(150,110,50,0.35)');
      grd.addColorStop(1, 'rgba(150,110,50,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, TILE, 14);
    },
    edge: [{ w: 3, c: '#c4a466' }],
  },
};

/** Extra soft blotches to break up the grass speckle. */
function speckle2(g, seed, dark, light) {
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    ellipse(g, r() * TILE, r() * TILE, 1.5 + r() * 2.5, 1 + r() * 1.5, r() < 0.5 ? dark : light);
  }
}

function terrainTile(name, mask, variant) {
  const L = TERRAIN[name];
  return (g) => {
    const seed = 1000 + variant * 97 + name.length * 13;
    if (L.foam) {
      // light foam just outside the beach on the water side
      g.save();
      tilePath(g, mask, L.inset, L.corner, L.size);
      g.strokeStyle = 'rgba(220,246,255,0.75)';
      g.lineWidth = 7;
      g.stroke();
      g.restore();
    }
    g.save();
    tilePath(g, mask, L.inset, L.corner, L.size);
    g.clip();
    L.fill(g, seed);
    // inner edge bands on open sides
    for (const e of L.edge) {
      tilePath(g, mask, L.inset + (e.at ?? 0), L.corner, L.size);
      g.strokeStyle = e.c;
      g.lineWidth = e.w * 2;
      g.stroke();
      if (e.speck) {
        // dapple the band so it reads as sandy soil: clip to the ring between
        // the outer shape and the shape inset by the band width
        g.save();
        tilePath(g, mask, L.inset, L.corner, L.size);
        tilePathInto(g, mask, L.inset + e.w, L.corner, L.size);
        g.clip('evenodd');
        speckle(g, 0, 0, TILE, TILE, e.c, e.speck[0], e.speck[1], seed + 5, { grain: 2, pd: 0.25, pl: 0.2 });
        g.restore();
      }
    }
    g.restore();
  };
}

/** Same as tilePath but appends to the current path (for even-odd ring clips). */
function tilePathInto(g, mask, inset, corner, size) {
  const T = TILE, X = 60;
  const open = { n: !(mask & 1), e: !(mask & 2), s: !(mask & 4), w: !(mask & 8) };
  const x0 = open.w ? inset : -X, x1 = open.e ? T - inset : T + X;
  const y0 = open.n ? inset : -X, y1 = open.s ? T - inset : T + X;
  g.moveTo(x0, y0);
  g.lineTo(x1, y0);
  g.lineTo(x1, y1);
  g.lineTo(x0, y1);
  g.closePath();
}

function waterFrame(f) {
  return (g, w, h) => {
    g.fillStyle = '#18ace5';
    g.fillRect(0, 0, w, h);
    const r = rng(4242);
    for (let i = 0; i < 10; i++) {
      const x = r() * w, y = r() * h, len = 10 + r() * 14, ph = r() * Math.PI * 2;
      const a = 0.18 + 0.18 * Math.sin(ph + f * Math.PI / 2);
      g.strokeStyle = `rgba(150,225,250,${a})`;
      g.lineWidth = 2;
      g.lineCap = 'round';
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
        g.beginPath();
        g.moveTo(x + ox + f * 3, y + oy);
        g.quadraticCurveTo(x + ox + f * 3 + len / 2, y + oy - 3, x + ox + f * 3 + len, y + oy);
        g.stroke();
      }
    }
  };
}

// ---------------------------------------------------------------- walls
const WALL_STYLES = {
  rail_wood: { t: 16, h: 2, kind: 'cobble', brick: '#a8693e', brickLight: '#c48552', grout: '#6e3f24', face: '#7a4628' },
  rail_brick: { t: 16, h: 2, kind: 'cobble', brick: '#c25a42', brickLight: '#da7860', grout: '#7a3426', face: '#8a3a2a' },
  rail_stone: { t: 16, h: 2, kind: 'cobble', brick: '#aaa79f', brickLight: '#c8c5bd', grout: '#6e6b64', face: '#7a776f' },
  fence_white: { t: 2, h: 9, kind: 'picket', wood: '#f6f6f4', shadow: '#c9cbd4' },
  fence_wood: { t: 2, h: 9, kind: 'fence', wood: '#8a5232', shadow: '#5e3620' },
  hedge: { t: 12, h: 7, kind: 'hedge' },
};

/** Rectangles (texture px, cell-local) making up a wall's footprint. */
function wallRectsHD(t, mask) {
  const T = TILE, w = t * S, c0 = (T - w) / 2, c1 = c0 + w, X = 8;
  const rects = [[c0, c0, w, w]];
  if (mask & 1) rects.push([c0, -X, w, c0 + X]);
  if (mask & 4) rects.push([c0, c1, w, T - c1 + X]);
  if (mask & 8) rects.push([-X, c0, c0 + X, w]);
  if (mask & 2) rects.push([c1, c0, T - c1 + X, w]);
  return rects;
}

/** True for straight north–south runs (bricks then run vertically). */
function vertical(mask) {
  return (mask & 5) && !(mask & 10);
}

/** Long, flat rounded bricks in a running bond, like the mock-up borders. */
function drawBricks(g, st, seed, oy, vert) {
  const r = rng(seed * 17 + 3);
  const L = TILE / 3, Wd = TILE / 5; // brick length and depth
  g.save();
  if (vert) {
    // rotate the pattern 90° around the cell centre
    g.translate(TILE / 2, oy + TILE / 2);
    g.rotate(Math.PI / 2);
    g.translate(-TILE / 2, -(oy + TILE / 2));
  }
  for (let row = -1; row < 6; row++) {
    for (let col = -1; col < 5; col++) {
      const x = col * L + (row % 2 ? L / 2 : 0);
      const y = oy + row * Wd;
      const tone = r() < 0.3 ? shade(st.brick, 0.9) : r() < 0.2 ? shade(st.brick, 1.06) : st.brick;
      const grd = g.createLinearGradient(0, y, 0, y + Wd);
      grd.addColorStop(0, st.brickLight);
      grd.addColorStop(0.35, tone);
      grd.addColorStop(1, shade(tone, 0.82));
      roundRect(g, x + 1.4, y + 1.4, L - 2.8, Wd - 2.8, 4, grd);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(70,35,15,0.22)' : 'rgba(255,230,200,0.18)';
        g.fillRect(x + 3 + r() * (L - 6), y + 3 + r() * (Wd - 6), 1.6, 1.6);
      }
    }
  }
  g.restore();
}

/**
 * Brick triangles that fill a putting green's cut (chamfered) corner where it
 * meets two borders. Frames: NW, NE, SE, SW.
 */
function cornerFrame(name, which) {
  const st = WALL_STYLES[name];
  return (g) => {
    const c = 20 + 2; // green chamfer size + overlap
    const pts = [[[0, 0], [c, 0], [0, c]], [[TILE, 0], [TILE - c, 0], [TILE, c]], [[TILE, TILE], [TILE - c, TILE], [TILE, TILE - c]], [[0, TILE], [c, TILE], [0, TILE - c]]][which];
    g.save();
    g.beginPath();
    g.moveTo(...pts[0]);
    g.lineTo(...pts[1]);
    g.lineTo(...pts[2]);
    g.closePath();
    g.clip();
    g.fillStyle = st.grout;
    g.fillRect(0, 0, TILE, TILE);
    drawBricks(g, st, which + 40, 0, false);
    g.restore();
    g.beginPath();
    g.moveTo(...pts[1]);
    g.lineTo(...pts[2]);
    g.strokeStyle = shade(st.grout, 0.85);
    g.lineWidth = 2;
    g.stroke();
  };
}

/** Outline only the outside edges of a wall footprint (no seams between tiles). */
function strokeFootprint(g, t, mask, oy, color, lw = 2) {
  const T = TILE, w = t * S, c0 = (T - w) / 2, c1 = c0 + w, X = 8;
  const seg = [];
  if (!(mask & 1)) seg.push([c0, c0, c1, c0]);
  if (!(mask & 4)) seg.push([c0, c1, c1, c1]);
  if (!(mask & 8)) seg.push([c0, c0, c0, c1]);
  if (!(mask & 2)) seg.push([c1, c0, c1, c1]);
  if (c0 > 0) {
    if (mask & 1) seg.push([c0, -X, c0, c0], [c1, -X, c1, c0]);
    if (mask & 4) seg.push([c0, c1, c0, T + X], [c1, c1, c1, T + X]);
    if (mask & 8) seg.push([-X, c0, c0, c0], [-X, c1, c0, c1]);
    if (mask & 2) seg.push([c1, c0, T + X, c0], [c1, c1, T + X, c1]);
  }
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.beginPath();
  for (const [x0, y0, x1, y1] of seg) { g.moveTo(x0, y0 + oy); g.lineTo(x1, y1 + oy); }
  g.stroke();
}

function rectsPath(g, rects, dy) {
  g.beginPath();
  for (const [x, y, w, h] of rects) g.rect(x, y + dy, w, h);
}

function wallFrame(name, mask) {
  const st = WALL_STYLES[name];
  const OY = 32; // frame row where the map cell starts
  return (g) => {
    const rects = wallRectsHD(st.t, mask);
    const H = st.h * S;
    if (st.kind === 'cobble' || st.kind === 'hedge') {
      // extruded front face
      for (let k = 0; k <= H; k++) {
        rectsPath(g, rects, OY - k);
        g.fillStyle = st.kind === 'hedge' ? '#1a5e30' : st.face;
        g.fill();
      }
      if (st.kind === 'hedge') {
        g.save();
        rectsPath(g, rects, OY - H);
        g.clip();
        speckle(g, 0, 0, TILE, TILE + 32, '#227a43', '#145a30', '#3a9a5a', mask * 31 + 7, { grain: 3, pd: 0.3, pl: 0.25 });
        leafTexture(g, 0, 0, TILE, TILE + 32, 'rgba(15,70,35,0.6)', 'rgba(90,170,110,0.5)', mask * 11, 0.08);
        g.restore();
        strokeFootprint(g, st.t, mask, OY - H, '#124a28');
        return;
      }
      // top: grout then rounded bricks laid in the cell's own grid
      g.save();
      rectsPath(g, rects, OY - H);
      g.clip();
      g.fillStyle = st.grout;
      g.fillRect(-10, 0, TILE + 20, 96);
      drawBricks(g, st, mask, OY - H, vertical(mask));
      g.restore();
      strokeFootprint(g, st.t, mask, OY - H, shade(st.grout, 0.85));
      return;
    }
    // Fences: rails between posts. Horizontal runs get a front view,
    // vertical runs are seen from above.
    const T = TILE, cx = T / 2, base = OY + T / 2 + 4, top = base - H;
    const wood = st.wood, dark = st.shadow, light = shade(wood, 1.25);
    const hx0 = mask & 8 ? 0 : cx, hx1 = mask & 2 ? T : cx;
    const vy0 = mask & 1 ? OY : OY + cx, vy1 = mask & 4 ? OY + T : OY + cx;
    // vertical run (top-down): a rail strip with post caps
    if (vy1 > vy0) {
      roundRect(g, cx - 4, vy0 - H, 8, vy1 - vy0, 2, dark);
      roundRect(g, cx - 3, vy0 - H, 6, vy1 - vy0, 2, wood);
      for (let y = OY + 8; y < OY + T; y += 32) if (y >= vy0 - 2 && y <= vy1 + 2) roundRect(g, cx - 5, y - H - 4, 10, 10, 2, light, dark, 1.5);
    }
    if (hx1 > hx0 || (!(mask & 1) && !(mask & 4) && mask === 0)) {
      const x0 = hx1 > hx0 ? hx0 : cx - 6, x1 = hx1 > hx0 ? hx1 : cx + 6;
      if (st.kind === 'picket') {
        for (let x = 4; x < T; x += 10) {
          if (x + 6 < x0 || x > x1) continue;
          g.beginPath();
          g.moveTo(x, base);
          g.lineTo(x, top + 4);
          g.lineTo(x + 3, top);
          g.lineTo(x + 6, top + 4);
          g.lineTo(x + 6, base);
          g.closePath();
          g.fillStyle = wood;
          g.fill();
          g.strokeStyle = dark;
          g.lineWidth = 1.5;
          g.stroke();
        }
        roundRect(g, x0, top + 10, x1 - x0, 5, 1, wood, dark, 1.2);
      } else {
        roundRect(g, x0, top + 7, x1 - x0, 6, 2, wood, dark, 1.5);
        roundRect(g, x0, top + 20, x1 - x0, 6, 2, wood, dark, 1.5);
        for (let x = 8; x < T; x += 32) {
          if (x < x0 - 4 || x > x1 + 4) continue;
          roundRect(g, x - 4, top - 2, 8, H + 4, 2, wood, dark, 1.5);
          g.fillStyle = light;
          g.fillRect(x - 2, top, 2, H);
        }
      }
    }
    if (mask & (1 | 4) && !(mask & (2 | 8))) roundRect(g, cx - 5, OY + cx - H - 4, 10, H + 6, 2, wood, dark, 1.5);
  };
}

for (const name of Object.keys(TERRAIN)) {
  const frames = [];
  for (let v = 0; v < 3; v++) for (let m = 0; m < 16; m++) frames.push(terrainTile(name, m, v));
  ART.sheet(`assets/terrain/${name}.png`, TILE, TILE, frames, 16);
}
ART.sheet('assets/terrain/water.png', 128, 128, [0, 1, 2, 3].map(waterFrame));
for (const name of Object.keys(WALL_STYLES)) {
  const frames = [];
  for (let m = 0; m < 16; m++) frames.push(wallFrame(name, m));
  ART.sheet(`assets/walls/${name}.png`, TILE, 96, frames, 16);
  if (WALL_STYLES[name].kind === 'cobble') ART.sheet(`assets/walls/${name}_corner.png`, TILE, TILE, [0, 1, 2, 3].map((k) => cornerFrame(name, k)));
}

// Shared drawing toolkit for the HD art generator. Runs inside a headless
// browser page (see render.mjs) so it can use the full Canvas 2D API:
// anti-aliased paths, gradients and per-pixel textures.
//
// World units: 1 map tile = 16 world px. World art is drawn at S = 4 texture
// px per world px (64 px tiles). Characters use CS = 8 so they stay sharp in
// the wardrobe close-up.
/* eslint-disable no-unused-vars */
const S = 4;
const CS = 8;
const TILE = 16 * S;

const ART = { assets: [] };
/** Register a single image. draw(g, w, h) paints into a w×h canvas. */
ART.add = (path, w, h, draw) => ART.assets.push({ path, w, h, draw });
/** Register a sprite sheet: frames laid out left-to-right, wrapping after `cols`. */
ART.sheet = (path, fw, fh, frames, cols = frames.length) => {
  const rows = Math.ceil(frames.length / cols);
  ART.add(path, fw * cols, fh * rows, (g) => {
    frames.forEach((f, i) => {
      g.save();
      g.translate((i % cols) * fw, Math.floor(i / cols) * fh);
      g.beginPath();
      g.rect(0, 0, fw, fh);
      g.clip();
      f(g, fw, fh);
      g.restore();
    });
  });
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(h) {
  const n = parseInt(h.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Darken (f<1) or lighten (f>1) a colour. */
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  if (f <= 1) return rgbToHex([r * f, g * f, b * f]);
  const t = f - 1;
  return rgbToHex([r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t]);
}

function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function ellipse(g, cx, cy, rx, ry, fill, stroke, lw = 2) {
  g.beginPath();
  g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}

function circle(g, cx, cy, r, fill, stroke, lw) {
  ellipse(g, cx, cy, r, r, fill, stroke, lw);
}

function roundRect(g, x, y, w, h, r, fill, stroke, lw = 2) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}

/** Soft dark ground shadow under trees, people and props. */
function groundShadow(g, cx, cy, rx, ry, a = 0.42) {
  ellipse(g, cx, cy, rx, ry, `rgba(18,40,14,${a})`);
}

/**
 * Fill the current clip with a speckled texture (fine dots of a darker and
 * lighter shade over a base colour), like the grass and gravel in the mock-ups.
 */
function speckle(g, x, y, w, h, base, dark, light, seed, opts = {}) {
  const { pd = 0.22, pl = 0.16, grain = 2 } = opts;
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  const r = rng(seed);
  for (let yy = y; yy < y + h; yy += grain) {
    for (let xx = x; xx < x + w; xx += grain) {
      const v = r();
      if (v < pd) { g.fillStyle = dark; g.fillRect(xx, yy, grain, grain); }
      else if (v < pd + pl) { g.fillStyle = light; g.fillRect(xx, yy, grain, grain); }
    }
  }
}

/** Leafy texture: many tiny arcs, for tree canopies and bushes. */
function leafTexture(g, x, y, w, h, dark, light, seed, density = 0.02) {
  const r = rng(seed);
  const n = Math.floor(w * h * density);
  g.lineWidth = 1.4;
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const px = x + r() * w, py = y + r() * h;
    g.strokeStyle = r() < 0.55 ? dark : light;
    g.beginPath();
    g.arc(px, py, 1.6 + r() * 1.6, Math.PI * (0.1 + r() * 0.3), Math.PI * (0.8 + r() * 0.3));
    g.stroke();
  }
}

/**
 * Draw a union of circles ("puffs") with a darker outline around the whole
 * silhouette, a base fill, top-left highlights and leaf texture. Used for
 * tree canopies, bushes and hedges.
 */
function puffs(g, list, cols, seed, opts = {}) {
  const { outline = shade(cols.base, 0.6), lw = 3, texture = true } = opts;
  // outline: draw every puff slightly larger in the outline colour first
  for (const [x, y, r] of list) circle(g, x, y, r + lw * 0.6, outline);
  // base + shading per puff, bottom puffs first
  const sorted = [...list].sort((a, b) => a[1] - b[1]);
  for (const [x, y, r] of sorted) {
    const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.15, x, y, r * 1.05);
    grd.addColorStop(0, cols.light);
    grd.addColorStop(0.55, cols.base);
    grd.addColorStop(1, cols.dark);
    circle(g, x, y, r, grd);
  }
  if (texture) {
    g.save();
    g.beginPath();
    for (const [x, y, r] of list) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); }
    g.clip();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y, r] of list) { minX = Math.min(minX, x - r); minY = Math.min(minY, y - r); maxX = Math.max(maxX, x + r); maxY = Math.max(maxY, y + r); }
    leafTexture(g, minX, minY, maxX - minX, maxY - minY, rgba(cols.dark, 0.55), rgba(cols.light, 0.5), seed, opts.density ?? 0.05);
    g.restore();
  }
}

const LEAF = { base: '#227a43', light: '#3a9a5a', dark: '#145a30' };

/** Pixel-font free text for signs (uses a bundled web font if available). */
function signText(g, str, x, y, size, color, weight = 'bold') {
  g.fillStyle = color;
  g.font = `${weight} ${size}px "Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(str, x, y);
}

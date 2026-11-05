// Tiny pixel-art drawing toolkit used by the placeholder art generator.
// Everything here is deterministic so regenerating art produces identical PNGs.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

/** Parse '#rrggbb' / '#rrggbbaa' / [r,g,b,a] into [r,g,b,a]. */
export function rgba(c) {
  if (Array.isArray(c)) return c.length === 4 ? c : [...c, 255];
  const h = c.replace('#', '');
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

export function mix(a, b, t) {
  const A = rgba(a), B = rgba(b);
  return [0, 1, 2, 3].map((i) => Math.round(A[i] + (B[i] - A[i]) * t));
}

export function shade(c, f) {
  const [r, g, b, a] = rgba(c);
  return [Math.min(255, Math.round(r * f)), Math.min(255, Math.round(g * f)), Math.min(255, Math.round(b * f)), a];
}

/** Mulberry32 seeded RNG. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x, y) {
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }

  alpha(x, y) {
    return this.inside(x, y) ? this.d[(y * this.w + x) * 4 + 3] : 0;
  }

  /** Set a pixel; colours with alpha < 255 are blended over what is there. */
  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inside(x, y) || c == null) return;
    const [r, g, b, a] = rgba(c);
    const i = (y * this.w + x) * 4;
    if (a >= 255 || this.d[i + 3] === 0) {
      this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = a;
      return;
    }
    const t = a / 255;
    this.d[i] = this.d[i] + (r - this.d[i]) * t;
    this.d[i + 1] = this.d[i + 1] + (g - this.d[i + 1]) * t;
    this.d[i + 2] = this.d[i + 2] + (b - this.d[i + 2]) * t;
    this.d[i + 3] = Math.max(this.d[i + 3], a);
  }

  clear(x, y) {
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = this.d[i + 1] = this.d[i + 2] = this.d[i + 3] = 0;
  }

  rect(x, y, w, h, c) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
    return this;
  }

  /** Filled ellipse centred on (cx,cy) using pixel centres. */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, typeof c === 'function' ? c(x, y, dx, dy) : c);
      }
    }
    return this;
  }

  circle(cx, cy, r, c) {
    return this.ellipse(cx, cy, r, r, c);
  }

  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
    return this;
  }

  /** Draw ASCII art. `pal` maps characters to colours; '.' and ' ' are skipped. */
  ascii(rows, pal, ox = 0, oy = 0, flipX = false) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ' || pal[ch] == null) continue;
        const px = flipX ? ox + row.length - 1 - x : ox + x;
        this.set(px, oy + y, pal[ch]);
      }
    });
    return this;
  }

  /** Paint `c` on every transparent pixel 4-adjacent to an opaque one. */
  outline(c, diagonal = false) {
    const pts = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 0) continue;
        let n = this.alpha(x - 1, y) > 200 || this.alpha(x + 1, y) > 200 || this.alpha(x, y - 1) > 200 || this.alpha(x, y + 1) > 200;
        if (!n && diagonal) n = this.alpha(x - 1, y - 1) > 200 || this.alpha(x + 1, y - 1) > 200 || this.alpha(x - 1, y + 1) > 200 || this.alpha(x + 1, y + 1) > 200;
        if (n) pts.push([x, y]);
      }
    }
    for (const [x, y] of pts) this.set(x, y, c);
    return this;
  }

  /** Recolour edge pixels of the opaque region (inner outline). */
  innerEdge(fn) {
    const pts = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) < 200) continue;
        const up = this.alpha(x, y - 1) < 200, dn = this.alpha(x, y + 1) < 200, lf = this.alpha(x - 1, y) < 200, rt = this.alpha(x + 1, y) < 200;
        if (up || dn || lf || rt) pts.push([x, y, { up, dn, lf, rt }]);
      }
    }
    for (const [x, y, s] of pts) {
      const c = fn(x, y, s, this.get(x, y));
      if (c) this.set(x, y, c);
    }
    return this;
  }

  blit(src, dx, dy, { flipX = false, rot = 0 } = {}) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y);
        if (c[3] === 0) continue;
        let sx = flipX ? src.w - 1 - x : x, sy = y;
        if (rot === 1) [sx, sy] = [src.h - 1 - y, x];
        else if (rot === 2) [sx, sy] = [src.w - 1 - x, src.h - 1 - y];
        else if (rot === 3) [sx, sy] = [y, src.w - 1 - x];
        this.set(dx + sx, dy + sy, c);
      }
    }
    return this;
  }

  /** Map every pixel through fn(x,y,color) -> color|null. */
  map(fn) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c[3] === 0) continue;
        const n = fn(x, y, c);
        if (n === null) this.clear(x, y);
        else if (n) {
          const i = (y * this.w + x) * 4;
          const v = rgba(n);
          this.d[i] = v[0]; this.d[i + 1] = v[1]; this.d[i + 2] = v[2]; this.d[i + 3] = v[3];
        }
      }
    }
    return this;
  }

  clone() {
    const p = new Pix(this.w, this.h);
    p.d.set(this.d);
    return p;
  }
}

/** Lay frames out left-to-right (wrapping after `cols`) into one sheet. */
export function sheet(frames, fw, fh, cols = frames.length) {
  const rows = Math.ceil(frames.length / cols);
  const s = new Pix(fw * cols, fh * rows);
  frames.forEach((f, i) => s.blit(f, (i % cols) * fw, Math.floor(i / cols) * fh));
  return s;
}

const written = [];
const skipped = [];
let FORCE = false;
let ROOT = '.';
export function configureOutput(root, force) {
  ROOT = root;
  FORCE = force;
}

/** Write a PNG unless it already exists (so hand-made art is never overwritten without --force). */
export function save(pix, rel) {
  const file = path.join(ROOT, rel);
  if (!FORCE && fs.existsSync(file)) {
    skipped.push(rel);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const png = new PNG({ width: pix.w, height: pix.h });
  png.data = Buffer.from(pix.d.buffer);
  fs.writeFileSync(file, PNG.sync.write(png));
  written.push(rel);
}

export function report() {
  return { written, skipped };
}

// 3x5 pixel font for numbers and short labels baked into art (flags, signs).
const FONT = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  ' ': ['...', '...', '...', '...', '...'],
};

export function text(pix, str, x, y, c) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const g = FONT[ch];
    if (g) g.forEach((row, yy) => [...row].forEach((v, xx) => v === '#' && pix.set(cx + xx, y + yy, c)));
    cx += 4;
  }
  return cx - x - 1;
}

export function textWidth(str) {
  return str.length * 4 - 1;
}

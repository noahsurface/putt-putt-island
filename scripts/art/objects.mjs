// Decorations, mini-golf course pieces, buildings, pro-shop interior and UI art.
import { Pix, rng, save, sheet, shade, text, textWidth } from './pix.mjs';

const SHADOW = '#14300c70';

/** Ellipse shaded as if lit from the top-left. cols = [highlight, mid, shadow]. */
function blob(p, cx, cy, rx, ry, cols, seed = 1) {
  const r = rng(seed);
  p.ellipse(cx, cy, rx, ry, (x, y, dx, dy) => {
    const l = -dx * 0.55 - dy * 0.8 + (r() - 0.5) * 0.35;
    return l > 0.45 ? cols[0] : l < -0.35 ? cols[2] : cols[1];
  });
}

function groundShadow(p, cx, cy, rx, ry) {
  p.ellipse(cx, cy, rx, ry, SHADOW);
}

// ---------------------------------------------------------------- nature
const LEAF = ['#35914f', '#257a40', '#1a6332'];

function leafSpeckle(c, seed, n = 60) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * c.w), y = Math.floor(r() * c.h);
    if (c.alpha(x, y) > 200) c.set(x, y, r() < 0.5 ? '#1d6a36' : '#3a9a56');
  }
}

function trunk(p, x, y, w, h) {
  const t = new Pix(p.w, p.h);
  t.rect(x, y, w, h, '#9a6a45');
  t.rect(x + Math.ceil(w / 2), y, Math.floor(w / 2), h, '#80553a');
  t.rect(x + 1, y + 2, 1, Math.max(1, h - 5), '#b5845a');
  t.rect(x - 2, y + h - 2, 2, 2, '#9a6a45');
  t.rect(x + w, y + h - 2, 2, 2, '#80553a');
  t.outline();
  p.blit(t, 0, 0);
}

function apple(p, x, y) {
  p.circle(x, y, 1.7, '#e2302c');
  p.set(x - 1, y - 1, '#ff8a7a');
  p.set(x, y - 2, '#5a3a1c');
}

/** Round, clumpy cartoon tree (optionally with apples). */
function roundTree(apples) {
  const p = new Pix(32, 48);
  groundShadow(p, 16, 43, 13, 4.5);
  trunk(p, 13, 28, 6, 15);
  const c = new Pix(32, 48);
  const clumps = [[16, 16, 9, 9], [16, 7, 6, 5], [9, 11, 5, 5], [23, 11, 5, 5], [6, 18, 5, 5], [26, 18, 5, 5], [9, 25, 6, 4.5], [23, 25, 6, 4.5], [16, 26, 6, 4.5]];
  clumps.forEach(([x, y, rx, ry], i) => blob(c, x, y, rx, ry, LEAF, 20 + i));
  // scalloped highlights on the upper-left of each clump
  clumps.forEach(([x, y, rx]) => {
    for (let a = -2.7; a < -1.0; a += 0.22) c.set(Math.round(x + Math.cos(a) * (rx - 1.6)), Math.round(y + Math.sin(a) * (rx - 1.6)), '#46a862');
  });
  leafSpeckle(c, apples ? 91 : 92, 70);
  c.outline();
  p.blit(c, 0, 0);
  if (apples) [[16, 6], [9, 15], [23, 15], [12, 24], [21, 23]].forEach(([x, y]) => apple(p, x, y));
  return p;
}

function treeOak() {
  return roundTree(false);
}

function treeApple() {
  return roundTree(true);
}

function treePine() {
  const p = new Pix(32, 48);
  groundShadow(p, 16, 43, 12, 4.5);
  trunk(p, 14, 35, 4, 9);
  const c = new Pix(32, 48);
  const tiers = [[2, 12, 6], [6, 19, 9], [12, 28, 12], [18, 37, 14]];
  tiers.forEach(([top, bottom, half], ti) => {
    for (let y = top; y <= bottom; y++) {
      const w = Math.round(((y - top) / (bottom - top)) * half) + 1;
      for (let x = 16 - w; x < 16 + w; x++) {
        const rel = (x - 16) / w;
        let col = rel < -0.35 ? '#2f8a50' : rel > 0.45 ? '#1a5e34' : '#237443';
        // scalloped hem on each tier
        if (y === bottom && (x + ti) % 3 === 0) col = null;
        if (col) c.set(x, y, col);
      }
    }
    // a lighter band under each tier's hem of the tier above
    for (let x = 16 - half + 2; x < 16 + half - 2; x += 2) if (c.alpha(x, top + 2)) c.set(x, top + 2, '#2f8a50');
  });
  leafSpeckle(c, 77, 50);
  c.outline();
  p.blit(c, 0, 0);
  return p;
}

function treePalm() {
  const p = new Pix(32, 48);
  groundShadow(p, 17, 44, 9, 3);
  const t = new Pix(32, 48);
  for (let y = 16; y < 44; y++) {
    const x = Math.round(14 + Math.sin((y - 16) / 9) * 3);
    const ring = y % 3 === 0;
    t.rect(x, y, 4, 1, ring ? '#9c7445' : '#c4955a');
    t.set(x + 3, y, ring ? '#7d5a33' : '#a37a47');
  }
  t.outline('#4a3219');
  p.blit(t, 0, 0);
  const f = new Pix(32, 48);
  const fronds = [
    [-1, -0.2], [1, -0.25], [-0.75, 0.55], [0.8, 0.5], [0, -1], [-0.2, 0.9],
  ];
  const cx = 17, cy = 15;
  fronds.forEach(([dx, dy], i) => {
    for (let s = 0; s <= 13; s++) {
      const droop = (s * s) / 50;
      const x = cx + dx * s, y = cy + dy * s + droop;
      const w = s < 3 ? 1.5 : s > 10 ? 0.8 : 2;
      f.ellipse(x, y, w, w, s % 2 ? '#4f9e3a' : (i % 2 ? '#67b84a' : '#5cae42'));
    }
  });
  f.circle(cx - 1, cy + 1, 1.6, '#6b4426');
  f.circle(cx + 2, cy + 2, 1.6, '#5a3820');
  f.outline('#22481a');
  p.blit(f, 0, 0);
  return p;
}

const FLOWER = { white: ['#ffffff', '#e8e8e8'], red: ['#ee3a3a', '#c42a2a'], orange: ['#ff922e', '#e07418'], yellow: ['#ffd23a', '#e0b020'], pink: ['#ff9ad0', '#e06aa8'], blue: ['#6aa8ff', '#3f7fd0'] };

function flower(p, x, y, color) {
  const [a, b] = FLOWER[color];
  p.set(x, y - 1, a); p.set(x - 1, y, a); p.set(x + 1, y, a); p.set(x, y + 1, b);
  p.set(x, y, '#ffd23a');
}

/** Dark round bush. `extra`: 'berry' or a flower colour name. */
function bush(extra) {
  const p = new Pix(16, 16);
  groundShadow(p, 8, 13, 7.5, 2.8);
  const c = new Pix(16, 16);
  blob(c, 8, 9.5, 7, 5, LEAF, 3);
  blob(c, 4.5, 7.5, 3.2, 3, LEAF, 4);
  blob(c, 8, 5.5, 3.6, 3.2, LEAF, 5);
  blob(c, 11.5, 7.5, 3.2, 3, LEAF, 6);
  for (const [x, y] of [[3, 6], [7, 4], [11, 6], [5, 9], [10, 9]]) c.set(x, y, '#46a862');
  leafSpeckle(c, 33, 14);
  c.outline();
  p.blit(c, 0, 0);
  if (extra === 'berry') [[5, 8], [9, 6], [11, 10], [7, 11], [12, 7]].forEach(([x, y]) => { p.set(x, y, '#e03030'); p.set(x, y - 1, '#ff8a8a'); });
  else if (extra) [[5, 7], [10, 6], [8, 10]].forEach(([x, y]) => flower(p, x, y, extra));
  return p;
}

function flowers(petal, petalDark) {
  const p = new Pix(16, 16);
  const r = rng(petal.length * 9 + petal.charCodeAt(1));
  for (let i = 0; i < 8; i++) {
    const x = 2 + Math.floor(r() * 12), y = 8 + Math.floor(r() * 6);
    p.set(x, y, '#2f7d38');
    p.set(x, y - 1, '#3f9a48');
  }
  [[4, 6], [10, 4], [8, 10], [12, 11], [3, 12]].forEach(([x, y]) => {
    p.set(x, y + 2, '#2f7d38');
    p.set(x, y - 1, petal); p.set(x - 1, y, petal); p.set(x + 1, y, petal); p.set(x, y + 1, petalDark);
    p.set(x, y, '#ffd23a');
  });
  return p;
}

function flowerBed() {
  // 2x2 tiles: tilled soil with rows of flowers.
  const p = new Pix(32, 32);
  const s = new Pix(32, 32);
  const r = rng(808);
  for (let y = 1; y < 31; y++) for (let x = 1; x < 31; x++) {
    const furrow = (y + 1) % 7 === 0;
    const v = r();
    s.set(x, y, furrow ? '#a86a38' : v < 0.15 ? '#b8784a' : v < 0.25 ? '#dc9a5e' : '#c98552');
  }
  s.outline();
  p.blit(s, 0, 0);
  const rows = ['white', 'red', 'yellow', 'orange'];
  rows.forEach((col, ri) => {
    for (let i = 0; i < 7; i++) {
      const x = 3 + i * 4 + (ri % 2), y = 4 + ri * 7;
      p.set(x, y + 2, '#2f7d38');
      p.set(x - 1, y + 2, '#3f9a48');
      flower(p, x, y, col);
    }
  });
  return p;
}

function gardenPlot() {
  // 2x2 tiles of tilled soil ridges.
  const p = new Pix(32, 32);
  const r = rng(909);
  for (let y = 1; y < 31; y++) for (let x = 1; x < 31; x++) {
    const ph = (y + Math.round(Math.sin(x * 0.9) * 0.7)) % 4;
    const v = r();
    const c = ph === 0 ? '#e0a46a' : ph === 3 ? '#a96e3e' : v < 0.15 ? '#bc7d48' : '#c98d55';
    p.set(x, y, c);
  }
  p.outline();
  return p;
}

function holeSign() {
  const p = new Pix(16, 24);
  groundShadow(p, 8, 21.5, 4, 1.8);
  const c = new Pix(16, 24);
  c.rect(7, 10, 2, 11, '#6e4a30');
  c.rect(7, 10, 1, 11, '#8a5f3e');
  c.rect(0, 2, 16, 9, '#4e3a2a');
  c.rect(1, 3, 14, 7, '#5e4632');
  c.outline();
  p.blit(c, 0, 0);
  text(p, 'HOLE', 1, 4, '#e8d6a8');
  return p;
}

function tallGrass() {
  const p = new Pix(16, 16);
  const r = rng(321);
  for (let i = 0; i < 9; i++) {
    const x = 2 + Math.floor(r() * 12), h = 3 + Math.floor(r() * 5);
    for (let k = 0; k < h; k++) p.set(x + (k > h - 2 ? (i % 2 ? 1 : -1) : 0), 14 - k, k > h - 3 ? '#7cc44c' : '#4c9a34');
  }
  return p;
}

function rock(big) {
  const w = big ? 32 : 16, h = big ? 24 : 16;
  const p = new Pix(w, h);
  groundShadow(p, w / 2, h - 3, w / 2 - 2, 2.5);
  const c = new Pix(w, h);
  if (big) {
    blob(c, 13, 14, 10, 7, ['#d5d0c5', '#a9a396', '#7f796e'], 6);
    blob(c, 21, 15, 7, 5, ['#d5d0c5', '#a9a396', '#7f796e'], 7);
  } else {
    blob(c, 8, 10, 6, 4.5, ['#d5d0c5', '#a9a396', '#7f796e'], 8);
  }
  c.outline('#45413a');
  p.blit(c, 0, 0);
  return p;
}

function stump() {
  const p = new Pix(16, 16);
  groundShadow(p, 8, 13, 6, 2);
  const c = new Pix(16, 16);
  c.rect(3, 7, 10, 6, '#8a5a32');
  c.rect(10, 7, 3, 6, '#6b4426');
  c.ellipse(8, 7, 5, 2.5, '#d9a86a');
  c.ellipse(8, 7, 3, 1.5, '#c08c50');
  c.set(8, 7, '#d9a86a');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  return p;
}

function bench() {
  const p = new Pix(32, 24);
  groundShadow(p, 16, 21, 14, 2);
  const c = new Pix(32, 24);
  // back rest
  c.rect(2, 4, 28, 3, '#c98f52');
  c.rect(2, 4, 28, 1, '#e0a96a');
  c.rect(2, 8, 28, 2, '#c98f52');
  // seat
  c.rect(2, 11, 28, 6, '#d69c5c');
  c.rect(2, 13, 28, 1, '#b07a42');
  c.rect(2, 16, 28, 1, '#a06a38');
  // legs
  [3, 27].forEach((x) => { c.rect(x, 17, 2, 4, '#4a4a55'); c.rect(x, 4, 2, 7, '#4a4a55'); });
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  return p;
}

function lamp() {
  const p = new Pix(16, 32);
  groundShadow(p, 8, 30, 4, 1.5);
  const c = new Pix(16, 32);
  c.rect(7, 8, 2, 21, '#3b4a46');
  c.rect(5, 27, 6, 2, '#3b4a46');
  c.rect(4, 3, 8, 6, '#3b4a46');
  c.rect(5, 4, 6, 4, '#ffe38a');
  c.rect(5, 4, 2, 2, '#fff6cf');
  c.rect(3, 2, 10, 1, '#2c3835');
  c.outline('#1c2422');
  p.blit(c, 0, 0);
  return p;
}

function sign(label) {
  const p = new Pix(16, 24);
  groundShadow(p, 8, 22, 4, 1.5);
  const c = new Pix(16, 24);
  c.rect(7, 12, 2, 10, '#8a5a32');
  c.rect(1, 3, 14, 10, '#c98f52');
  c.rect(1, 3, 14, 1, '#e0a96a');
  c.rect(1, 12, 14, 1, '#9a6337');
  if (label) text(c, label, 8 - Math.floor(textWidth(label) / 2), 5, '#4a2c17');
  else { c.rect(3, 6, 10, 1, '#7c4b26'); c.rect(3, 9, 8, 1, '#7c4b26'); }
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  return p;
}

function barrel() {
  const p = new Pix(16, 20);
  groundShadow(p, 8, 18, 6, 2);
  const c = new Pix(16, 20);
  c.rect(3, 5, 10, 12, '#b07a42');
  c.rect(10, 5, 3, 12, '#8a5a32');
  c.rect(3, 5, 1, 12, '#c98f52');
  [7, 13].forEach((y) => c.rect(3, y, 10, 1, '#5a5a66'));
  c.ellipse(8, 5, 5, 2, '#d69c5c');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  return p;
}

function crate() {
  const p = new Pix(16, 16);
  groundShadow(p, 8, 14, 7, 2);
  const c = new Pix(16, 16);
  c.rect(2, 3, 12, 11, '#c98f52');
  c.rect(2, 3, 12, 3, '#e0a96a');
  c.rect(2, 6, 12, 1, '#8a5a32');
  c.line(3, 7, 12, 13, '#a06a38');
  c.rect(2, 13, 12, 1, '#8a5a32');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  return p;
}

function umbrella() {
  const p = new Pix(32, 32);
  groundShadow(p, 16, 29, 9, 2);
  const pole = new Pix(32, 32);
  pole.rect(15, 12, 2, 17, '#e8e8e8');
  pole.outline('#5a5a66');
  p.blit(pole, 0, 0);
  const c = new Pix(32, 32);
  c.ellipse(16, 10, 14, 8, (x, y) => {
    const a = Math.atan2(y - 10, (x - 16) * 0.6);
    const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8);
    const base = seg % 2 ? '#f2f2f2' : '#e0483e';
    return y > 12 ? shade(base, 0.82) : base;
  });
  c.set(16, 2, '#e8e8e8');
  c.outline('#5a2a26');
  p.blit(c, 0, 0);
  return p;
}

function deckChair() {
  const p = new Pix(16, 24);
  groundShadow(p, 8, 22, 6, 2);
  const c = new Pix(16, 24);
  c.rect(3, 3, 10, 18, '#c98f52');
  for (let y = 4; y < 20; y++) c.rect(4, y, 8, 1, Math.floor(y / 3) % 2 ? '#3fa0d8' : '#ffffff');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  return p;
}

function shell() {
  const p = new Pix(16, 16);
  const c = new Pix(16, 16);
  c.ellipse(8, 9, 4, 3, (x) => (x % 2 ? '#f7c6c0' : '#f0a8a0'));
  c.rect(7, 12, 3, 1, '#e08f86');
  c.outline('#a0574f');
  p.blit(c, 0, 0);
  return p;
}

function starfish() {
  const p = new Pix(16, 16);
  const c = new Pix(16, 16);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    for (let s = 0; s < 5; s++) c.set(8 + Math.cos(a) * s, 9 + Math.sin(a) * s, s < 2 ? '#ffb15c' : '#f28a3a');
  }
  c.rect(7, 8, 3, 3, '#ffb15c');
  c.outline('#9a4a1c');
  p.blit(c, 0, 0);
  return p;
}

function tikiTorch() {
  const p = new Pix(16, 32);
  groundShadow(p, 8, 30, 3, 1.5);
  const c = new Pix(16, 32);
  c.rect(7, 10, 2, 19, '#c4955a');
  for (let y = 11; y < 29; y += 4) c.rect(7, y, 2, 1, '#8a5a32');
  c.rect(5, 7, 6, 4, '#8a5a32');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  const fl = new Pix(16, 32);
  fl.ellipse(8, 4, 2.5, 3.5, '#ff9a3a');
  fl.ellipse(8, 5, 1.3, 2, '#ffe066');
  p.blit(fl, 0, 0);
  return p;
}

function ballStatue() {
  const p = new Pix(16, 32);
  groundShadow(p, 8, 30, 6, 2);
  const c = new Pix(16, 32);
  c.rect(3, 18, 10, 11, '#bdb6a8');
  c.rect(10, 18, 3, 11, '#9b9486');
  c.rect(2, 17, 12, 2, '#d6d0c4');
  c.rect(2, 27, 12, 2, '#9b9486');
  blob(c, 8, 11, 6, 6, ['#ffffff', '#e8edf2', '#bcc6d0'], 9);
  [[6, 9], [9, 8], [8, 12], [11, 11], [5, 13]].forEach(([x, y]) => c.set(x, y, '#c4ccd6'));
  c.outline('#4a4a55');
  p.blit(c, 0, 0);
  return p;
}

function mailbox() {
  const p = new Pix(16, 24);
  groundShadow(p, 8, 22, 4, 1.5);
  const c = new Pix(16, 24);
  c.rect(7, 12, 2, 10, '#8a5a32');
  c.rect(3, 5, 10, 8, '#3f7fd0');
  c.ellipse(8, 5, 5, 2, '#5a98e6');
  c.rect(11, 3, 1, 5, '#e0483e');
  c.rect(11, 3, 3, 2, '#e0483e');
  c.outline('#1f3a66');
  p.blit(c, 0, 0);
  return p;
}

function picnicTable() {
  const p = new Pix(32, 24);
  groundShadow(p, 16, 21, 14, 2);
  const c = new Pix(32, 24);
  c.rect(2, 3, 28, 4, '#c98f52');
  c.rect(4, 8, 24, 8, '#d69c5c');
  for (let x = 4; x < 28; x += 4) c.rect(x, 8, 1, 8, '#b07a42');
  c.rect(2, 17, 28, 4, '#c98f52');
  c.rect(4, 8, 24, 2, '#e7b278');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  // checkered cloth
  for (let y = 9; y < 15; y++) for (let x = 9; x < 23; x++) if ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) p.set(x, y, '#e0483e');
  return p;
}

function starterBoard() {
  const p = new Pix(32, 32);
  groundShadow(p, 16, 30, 12, 2);
  const c = new Pix(32, 32);
  c.rect(5, 16, 2, 13, '#8a5a32');
  c.rect(25, 16, 2, 13, '#8a5a32');
  c.rect(2, 4, 28, 15, '#f3e6c4');
  c.rect(2, 4, 28, 3, '#2f7d3c');
  c.rect(2, 18, 28, 1, '#c9b98f');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  text(p, 'PLAY', 14 - Math.floor(textWidth('PLAY') / 2), 8, '#2f7d3c');
  // tiny flag + cup and a golf ball
  p.line(25, 9, 25, 16, '#5a5a66');
  p.rect(26, 9, 3, 2, '#e0483e');
  p.ellipse(25, 16.5, 2, 1, '#2b2b2b');
  p.circle(7, 15, 1.6, '#ffffff');
  p.set(8, 16, '#c4ccd6');
  return p;
}

// ---------------------------------------------------------------- course
function teeMat() {
  // Dark green tee square with three dots (like a little starting mat).
  const p = new Pix(16, 16);
  const c = new Pix(16, 16);
  c.rect(2, 2, 12, 12, '#178a4a');
  c.rect(2, 2, 12, 1, '#22a05a');
  c.rect(2, 2, 1, 12, '#1d9653');
  c.clear(2, 2); c.clear(13, 2); c.clear(2, 13); c.clear(13, 13);
  c.outline();
  p.blit(c, 0, 0);
  [4, 7, 10].forEach((y) => p.rect(7, y, 2, 2, '#0b2416'));
  return p;
}

function cup() {
  const p = new Pix(16, 16);
  p.ellipse(8, 8.5, 3, 2.6, '#2b2b2b');
  p.ellipse(8, 8.5, 2.3, 1.9, '#0d0d0d');
  return p;
}

function flags() {
  const frames = [];
  for (let n = 1; n <= 18; n++) {
    const p = new Pix(24, 32);
    p.rect(6, 4, 1, 25, '#f2f2f2');
    p.rect(7, 4, 1, 25, '#b8bcc4');
    const label = String(n);
    const w = Math.max(9, textWidth(label) + 5);
    const f = new Pix(24, 32);
    for (let y = 4; y < 13; y++) {
      const taper = Math.floor(Math.abs(y - 8) / 2);
      f.rect(8, y, w - taper, 1, y < 7 ? '#f05a50' : '#e0403a');
    }
    f.outline('#7a1f1a');
    p.blit(f, 0, 0);
    text(p, label, 9 + Math.floor((w - 3 - textWidth(label)) / 2), 6, '#ffffff');
    p.set(6, 3, '#ffd34a');
    p.set(7, 3, '#e0a830');
    frames.push(p);
  }
  return sheet(frames, 24, 32, 18);
}

function bumper(lit) {
  const p = new Pix(16, 16);
  groundShadow(p, 8, 12, 6, 2.5);
  const c = new Pix(16, 16);
  c.circle(8, 8, 6, lit ? '#ffe066' : '#e84a4a');
  c.circle(8, 8, 4.5, lit ? '#fff3b0' : '#f7f7f7');
  c.circle(8, 8, 3, lit ? '#ffcc33' : '#e84a4a');
  c.circle(7, 7, 1, '#ffffff');
  c.outline(lit ? '#8a6a10' : '#6a1a1a');
  p.blit(c, 0, 0);
  return p;
}

function boostPads() {
  // 4 directions (N,E,S,W) x 2 animation frames. Drawn pointing east then rotated.
  const frames = [];
  for (let d = 0; d < 4; d++) {
    for (let f = 0; f < 2; f++) {
      const base = new Pix(16, 16);
      base.rect(1, 1, 14, 14, '#3b3b52');
      base.rect(2, 2, 12, 12, '#4a4a66');
      const chev = (ox, col) => {
        for (let i = 0; i < 4; i++) {
          base.set(ox + i, 4 + i, col); base.set(ox + i + 1, 4 + i, col);
          base.set(ox + i, 11 - i, col); base.set(ox + i + 1, 11 - i, col);
        }
      };
      chev(3, f ? '#ffe066' : '#c8a530');
      chev(8, f ? '#c8a530' : '#ffe066');
      base.outline('#1d1d2a');
      const rot = (d + 3) % 4; // east-pointing art -> N,E,S,W
      const p = new Pix(16, 16);
      p.blit(base, 0, 0, { rot });
      frames.push(p);
    }
  }
  return sheet(frames, 16, 16, 8);
}

function spinnerBase() {
  const p = new Pix(16, 16);
  groundShadow(p, 8, 10, 5, 3);
  const c = new Pix(16, 16);
  c.circle(8, 8, 4, '#8a5a32');
  c.circle(8, 8, 2.5, '#c98f52');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  return p;
}

function spinnerBlades() {
  const p = new Pix(48, 48);
  const c = new Pix(48, 48);
  const plank = (horizontal) => {
    for (let i = 3; i < 45; i++) {
      for (let t = -2; t < 2; t++) {
        const col = t === -2 ? '#f0f0f0' : t === 1 ? '#c8c8d0' : (Math.floor(i / 4) % 2 ? '#e0483e' : '#f7f7f7');
        if (horizontal) c.set(i, 24 + t, col); else c.set(24 + t, i, col);
      }
    }
  };
  plank(true);
  plank(false);
  c.circle(24, 24, 3, '#8a5a32');
  c.circle(24, 24, 1.5, '#e0a96a');
  c.outline('#3a2020');
  p.blit(c, 0, 0);
  return p;
}

function ball() {
  const p = new Pix(8, 8);
  const c = new Pix(8, 8);
  c.circle(4, 4, 2.6, (x, y) => (x + y > 8 ? '#cfd8e2' : '#ffffff'));
  c.set(3, 3, '#ffffff');
  c.outline('#55606e');
  p.blit(c, 0, 0);
  return p;
}

function ballShadow() {
  const p = new Pix(8, 4);
  p.ellipse(4, 2, 3, 1.3, '#00000055');
  return p;
}

// ---------------------------------------------------------------- buildings
function proShopBuilding() {
  // White clapboard building with a teal shingle roof and a green sign.
  const p = new Pix(80, 80);
  groundShadow(p, 40, 77, 39, 3);
  const b = new Pix(80, 80);
  // walls
  b.rect(4, 42, 72, 34, '#f6f6f2');
  for (let y = 45; y < 74; y += 4) b.rect(4, y, 72, 1, '#dedfd8');
  b.rect(4, 42, 2, 34, '#e2e3dc');
  b.rect(74, 42, 2, 34, '#d8d9d2');
  b.rect(4, 73, 72, 3, '#cfd0c8');
  // windows
  [[11, 52], [55, 52]].forEach(([x, y]) => {
    b.rect(x, y, 14, 12, '#e2e3dc');
    b.rect(x + 1, y + 1, 12, 10, '#8fd6f2');
    b.rect(x + 1, y + 1, 5, 4, '#c8ecfb');
    b.rect(x + 7, y + 1, 1, 10, '#e2e3dc');
    b.rect(x + 1, y + 6, 12, 1, '#e2e3dc');
  });
  // door
  b.rect(33, 52, 14, 24, '#5e3b22');
  b.rect(34, 53, 12, 23, '#176a4a');
  b.rect(35, 54, 10, 1, '#20845c');
  b.rect(43, 64, 2, 2, '#ffd34a');
  // roof: wide, shallow, teal shingles
  for (let y = 10; y < 44; y++) {
    const t = (y - 10) / 34;
    const half = Math.round(30 + t * 10);
    for (let x = 40 - half; x < 40 + half; x++) {
      const row = Math.floor((y - 10) / 4);
      const off = row % 2 ? 3 : 0;
      let c = '#1f7466';
      if ((y - 10) % 4 === 3) c = '#165a50';
      else if ((x + off) % 6 === 0) c = '#185f54';
      else if ((y - 10) % 4 === 0) c = '#2a8a7a';
      b.set(x, y, c);
    }
  }
  b.rect(10, 8, 60, 3, '#165a50');
  b.rect(10, 8, 60, 1, '#2f9686');
  b.outline();
  p.blit(b, 0, 0);
  // sign
  const s = new Pix(80, 80);
  s.rect(19, 38, 42, 11, '#14653c');
  s.rect(20, 39, 40, 9, '#1a7a46');
  s.outline();
  p.blit(s, 0, 0);
  text(p, 'PRO SHOP', 40 - Math.floor(textWidth('PRO SHOP') / 2), 41, '#ffffff');
  return p;
}

// ---------------------------------------------------------------- interior
function floorTile(kind) {
  const p = new Pix(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let c;
    if (kind === 'wood') {
      // short light planks laid in a staggered (brick) pattern
      const row = Math.floor(y / 4);
      const off = row % 2 ? 4 : 0;
      const lx = (x + off) % 8;
      const id = Math.floor((x + off) / 8) + row * 3;
      if (y % 4 === 3) c = '#c08550';
      else if (lx === 7) c = '#c8905a';
      else if (y % 4 === 0) c = '#ebb87c';
      else c = id % 3 === 0 ? '#d99f60' : id % 3 === 1 ? '#e2ab6c' : '#deA566';
      if (lx === 3 && y % 4 === 1 && id % 2) c = '#d39858';
    } else if (kind === 'checker') {
      c = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? '#1f7a48' : '#eef4e0';
    } else if (kind === 'carpet') {
      c = (x * 7 + y * 13) % 11 === 0 ? '#3e8a68' : '#357a5c';
    } else {
      c = x % 8 === 7 || y % 8 === 7 ? '#b8b8b4' : ((x * 5 + y * 3) % 7 === 0 ? '#cacac6' : '#d8d8d4');
    }
    p.set(x, y, c);
  }
  return p;
}

function wallTile(kind) {
  // 16x32 wall strip: wallpaper above a dark wood wainscot band.
  const p = new Pix(16, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
    let c;
    if (kind === 'cream') c = '#e8f3d8';
    else if (kind === 'stripe') c = x % 8 < 4 ? '#cfe8c0' : '#e2f2d6';
    else if (kind === 'panel') c = x % 8 === 0 ? '#8a5634' : y % 12 === 0 ? '#8a5634' : '#a5683f';
    else c = (x + y) % 12 === 0 ? '#2f4a78' : '#26406a';
    if (y >= 24 && y < 30) c = y === 24 ? '#8a5634' : '#6b3f22';
    if (y >= 30) c = '#4a2a16';
    p.set(x, y, c);
  }
  return p;
}

function counter() {
  // Dark wood shelving counter with a ball basket and clubs.
  const p = new Pix(48, 32);
  groundShadow(p, 24, 30, 23, 2);
  const c = new Pix(48, 32);
  c.rect(1, 10, 46, 19, '#5e3820');
  c.rect(1, 8, 46, 4, '#7a4a2c');
  c.rect(1, 8, 46, 1, '#94603c');
  for (let x = 2; x < 46; x += 6) {
    c.rect(x, 14, 5, 6, '#4a2a16');
    c.rect(x, 22, 5, 5, '#4a2a16');
    c.rect(x + 1, 24, 3, 1, '#6b4228');
  }
  c.outline();
  p.blit(c, 0, 0);
  // basket of colourful balls
  p.ellipse(14, 7, 4, 2.5, '#c8a06a');
  [[12, 6, '#ff5a5a'], [14, 5, '#5ab0ff'], [16, 6, '#ffd23a'], [13, 7, '#7ad06a'], [15, 7, '#ffffff']].forEach(([x, y, col]) => p.set(x, y, col));
  // clubs
  [[38, '#e0483e'], [40, '#3fa0d8'], [42, '#6fbf5a'], [44, '#ffd34a']].forEach(([x, col]) => {
    p.line(x, 1, x, 8, '#d8dce4');
    p.rect(x - 1, 0, 2, 2, '#4a4a55');
    p.rect(x, 6, 1, 2, col);
  });
  return p;
}

function shelfBalls() {
  const p = new Pix(32, 32);
  const c = new Pix(32, 32);
  c.rect(1, 2, 30, 28, '#8a5a32');
  c.rect(3, 4, 26, 24, '#6b4426');
  [10, 19].forEach((y) => c.rect(3, y, 26, 2, '#b07a42'));
  c.rect(3, 27, 26, 1, '#b07a42');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  const cols = ['#ffffff', '#ffe066', '#ff8ab0', '#8fd0f0', '#ff9a3a', '#ffffff'];
  [5, 14, 23].forEach((y, row) => {
    for (let i = 0; i < 4; i++) {
      p.rect(4 + i * 6, y, 5, 5, cols[(i + row) % cols.length]);
      p.rect(4 + i * 6, y, 5, 1, '#3d2614');
      p.rect(5 + i * 6, y + 2, 3, 1, '#5a5a66');
    }
  });
  return p;
}

function clubRack() {
  const p = new Pix(32, 32);
  groundShadow(p, 16, 30, 14, 2);
  const c = new Pix(32, 32);
  c.rect(2, 24, 28, 5, '#8a5a32');
  c.rect(2, 24, 28, 1, '#c98f52');
  c.rect(2, 6, 28, 2, '#8a5a32');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 4;
    p.line(x, 4, x, 24, '#c8ccd6');
    p.rect(x - 1, 2, 3, 3, i % 2 ? '#3a3a44' : '#b8bcc4');
    p.rect(x, 20, 1, 4, '#3a3a44');
  }
  return p;
}

function bagStand() {
  const p = new Pix(16, 32);
  groundShadow(p, 8, 30, 5, 1.5);
  const c = new Pix(16, 32);
  c.rect(4, 10, 8, 19, '#d0483e');
  c.rect(4, 10, 2, 19, '#e8705a');
  c.rect(10, 10, 2, 19, '#a8362e');
  c.rect(4, 16, 8, 2, '#f3e6c4');
  c.rect(4, 26, 8, 2, '#3a3a44');
  c.outline('#4a1a16');
  p.blit(c, 0, 0);
  [[5, 3], [8, 2], [11, 4]].forEach(([x, y]) => { p.line(x, y + 2, x, 10, '#c8ccd6'); p.rect(x - 1, y, 3, 2, '#3a3a44'); });
  return p;
}

function trophyCase() {
  const p = new Pix(32, 32);
  groundShadow(p, 16, 30, 14, 2);
  const c = new Pix(32, 32);
  c.rect(2, 2, 28, 27, '#7c4b26');
  c.rect(4, 4, 24, 22, '#bfe6f5');
  c.rect(4, 15, 24, 1, '#7c4b26');
  c.rect(4, 4, 6, 3, '#e6f7fd');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  const trophy = (x, y) => {
    p.rect(x, y, 5, 3, '#ffd34a');
    p.rect(x + 1, y + 3, 3, 1, '#e0a830');
    p.rect(x + 2, y + 4, 1, 2, '#e0a830');
    p.rect(x + 1, y + 6, 3, 1, '#c08a20');
    p.set(x - 1, y + 1, '#ffd34a');
    p.set(x + 5, y + 1, '#ffd34a');
  };
  trophy(8, 7); trophy(19, 7); trophy(13, 17);
  p.circle(8, 22, 1.5, '#ffffff');
  p.circle(23, 22, 1.5, '#ffffff');
  return p;
}

function pottedPlant() {
  const p = new Pix(16, 32);
  groundShadow(p, 8, 30, 5, 1.5);
  const c = new Pix(16, 32);
  c.rect(4, 22, 8, 7, '#c86a3a');
  c.rect(3, 21, 10, 2, '#e08a5a');
  c.outline('#5a2a16');
  p.blit(c, 0, 0);
  const l = new Pix(16, 32);
  const leaves = [[8, 6, 2, 6], [4, 12, 3, 5], [12, 12, 3, 5], [6, 16, 3, 4], [10, 17, 3, 4]];
  leaves.forEach(([x, y, rx, ry], i) => blob(l, x, y, rx, ry, ['#78c24a', '#509b36', '#3a7a28'], 40 + i));
  l.outline('#25491a');
  p.blit(l, 0, 0);
  return p;
}

function braidedOval(w, h, cols) {
  const p = new Pix(w, h);
  const n = cols.length;
  for (let i = 0; i < 6; i++) {
    p.ellipse(w / 2, h / 2, w / 2 - 1 - i * (w / 14), h / 2 - 1 - i * (h / 14), cols[i % n]);
  }
  p.outline();
  return p;
}

function rug() {
  return braidedOval(48, 32, ['#2f5e4a', '#3a6e58', '#28524a']);
}

function armchair() {
  const p = new Pix(16, 24);
  groundShadow(p, 8, 22, 7, 1.5);
  const c = new Pix(16, 24);
  c.rect(2, 3, 12, 9, '#3a8f47');
  c.rect(2, 3, 12, 2, '#5ab268');
  c.rect(1, 10, 14, 10, '#2f7d3c');
  c.rect(3, 11, 10, 5, '#46a356');
  c.rect(2, 20, 2, 2, '#5e3b20');
  c.rect(12, 20, 2, 2, '#5e3b20');
  c.outline('#173f1f');
  p.blit(c, 0, 0);
  return p;
}

function coffeeTable() {
  const p = new Pix(32, 24);
  groundShadow(p, 16, 21, 14, 2);
  const c = new Pix(32, 24);
  c.rect(2, 6, 28, 10, '#c98f52');
  c.rect(2, 6, 28, 2, '#e0a96a');
  c.rect(2, 16, 28, 2, '#8a5a32');
  [3, 27].forEach((x) => c.rect(x, 18, 2, 3, '#6b4426'));
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  p.rect(8, 9, 7, 5, '#f3e6c4');
  p.rect(9, 10, 5, 1, '#5a5a66');
  p.rect(9, 12, 4, 1, '#5a5a66');
  p.circle(22, 11, 2, '#ffffff');
  return p;
}

function mirror() {
  const p = new Pix(16, 32);
  groundShadow(p, 8, 30, 6, 1.5);
  const c = new Pix(16, 32);
  c.rect(2, 2, 12, 26, '#c08a20');
  c.rect(3, 3, 10, 24, '#ffd34a');
  c.rect(4, 4, 8, 22, '#b8e2f2');
  c.rect(5, 5, 3, 7, '#e6f7fd');
  c.rect(9, 14, 2, 5, '#e6f7fd');
  c.rect(3, 28, 2, 2, '#7c4b26');
  c.rect(11, 28, 2, 2, '#7c4b26');
  c.outline('#5a3a10');
  p.blit(c, 0, 0);
  return p;
}

function puttingMat() {
  // A 4x3-tile indoor practice green with a cobble border, tee and cup.
  const p = new Pix(64, 48);
  const c = new Pix(64, 48);
  for (let y = 1; y < 47; y++) for (let x = 1; x < 63; x++) {
    const border = x < 6 || x > 56 || y < 6 || y > 41;
    if (border) {
      const ox = (Math.floor(y / 4) % 2) * 2;
      const lx = (x + ox) % 4, ly = y % 4;
      c.set(x, y, lx === 3 || ly === 3 ? '#8a5232' : lx === 0 && ly === 0 ? '#c98b5c' : '#a8693e');
    } else {
      c.set(x, y, Math.floor((x + y) / 4) % 2 ? '#8ccb3f' : '#7fbd36');
    }
  }
  c.outline();
  p.blit(c, 0, 0);
  p.rect(43, 18, 10, 12, '#178a4a');
  [20, 23, 26].forEach((y) => p.rect(47, y, 2, 2, '#0b2416'));
  p.ellipse(13, 24, 2.4, 2, '#0d0d0d');
  return p;
}

function wallPoster() {
  const p = new Pix(16, 16);
  const c = new Pix(16, 16);
  c.rect(2, 1, 12, 14, '#f3e6c4');
  c.rect(3, 2, 10, 8, '#8fd0f0');
  c.rect(3, 7, 10, 3, '#4fbe5d');
  c.line(9, 3, 9, 8, '#ffffff');
  c.rect(10, 3, 2, 2, '#e0483e');
  c.rect(4, 11, 8, 1, '#5a5a66');
  c.rect(4, 13, 6, 1, '#5a5a66');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  return p;
}

function wallClock() {
  const p = new Pix(16, 16);
  const c = new Pix(16, 16);
  c.circle(8, 8, 6, '#8a5a32');
  c.circle(8, 8, 5, '#fffaf0');
  c.line(8, 8, 8, 4, '#3a3a44');
  c.line(8, 8, 11, 8, '#3a3a44');
  c.outline('#3d2614');
  p.blit(c, 0, 0);
  return p;
}

function wallWindow() {
  const p = new Pix(32, 16);
  const c = new Pix(32, 16);
  c.rect(1, 1, 30, 14, '#ffffff');
  c.rect(2, 2, 28, 12, '#8fd0f0');
  c.rect(2, 2, 10, 5, '#c8ecfb');
  c.rect(16, 2, 1, 12, '#ffffff');
  c.rect(2, 8, 28, 1, '#ffffff');
  c.outline('#5e3b20');
  p.blit(c, 0, 0);
  return p;
}

function wallPennant() {
  const p = new Pix(16, 16);
  const c = new Pix(16, 16);
  c.rect(2, 3, 1, 10, '#8a5a32');
  for (let y = 3; y < 10; y++) c.rect(3, y, 11 - Math.abs(y - 6) * 2, 1, '#2f7d3c');
  c.outline('#173f1f');
  p.blit(c, 0, 0);
  p.set(6, 6, '#ffd34a'); p.set(7, 6, '#ffd34a');
  return p;
}

function neonOpen() {
  const p = new Pix(32, 16);
  const c = new Pix(32, 16);
  c.rect(1, 2, 30, 12, '#2a2440');
  c.outline('#111018');
  p.blit(c, 0, 0);
  text(p, 'OPEN', 16 - Math.floor(textWidth('OPEN') / 2), 5, '#ff6ac1');
  return p;
}

function doorMat() {
  return braidedOval(32, 16, ['#8a3a3e', '#a04a4e', '#7a3034']);
}

function lockerDoor() {
  // Green door that sits on the back wall (decorative).
  const p = new Pix(16, 28);
  const c = new Pix(16, 28);
  c.rect(1, 0, 14, 28, '#5e3b22');
  c.rect(3, 2, 10, 26, '#176a4a');
  c.rect(3, 2, 10, 1, '#20845c');
  c.rect(10, 14, 2, 2, '#ffd34a');
  c.outline();
  p.blit(c, 0, 0);
  return p;
}

function lockerSign() {
  const p = new Pix(32, 16);
  const c = new Pix(32, 16);
  c.rect(3, 1, 26, 14, '#1a6e48');
  c.rect(4, 2, 24, 12, '#1f7a50');
  c.outline();
  p.blit(c, 0, 0);
  text(p, 'LOCKER', 16 - Math.floor(textWidth('LOCKER') / 2), 3, '#ffffff');
  text(p, 'ROOM', 16 - Math.floor(textWidth('ROOM') / 2), 9, '#ffffff');
  return p;
}

function lockersBackdrop() {
  // 120x130 backdrop for the wardrobe: a row of lockers over a tiled floor.
  const p = new Pix(120, 130);
  for (let y = 0; y < 130; y++) for (let x = 0; x < 120; x++) {
    if (y < 84) {
      const lx = x % 24;
      let c = '#136352';
      if (y < 6) c = '#0d4a3e';
      else if (lx === 0 || lx === 23) c = '#0c4337';
      else if (lx === 1) c = '#1b7a66';
      if (y >= 80) c = '#0c4337';
      p.set(x, y, c);
    } else {
      const gx = x % 20, gy = (y - 84) % 20;
      const v = (x * 7 + y * 13) % 17;
      p.set(x, y, gx === 0 || gy === 0 ? '#b8b8b4' : v === 0 ? '#c6c6c2' : '#dcdcd8');
    }
  }
  for (let i = 0; i < 5; i++) {
    const x0 = i * 24;
    // vents
    for (const vy of [16, 19, 22, 62, 65, 68]) p.rect(x0 + 6, vy, 12, 1, '#2a9a80');
    // number plate
    p.rect(x0 + 7, 9, 10, 6, '#e8e8e2');
    text(p, String(40 + i), x0 + 9, 10, '#2a2a2a');
    // handle
    p.rect(x0 + 18, 34, 2, 2, '#2a3a36');
    p.rect(x0 + 18, 37, 2, 6, '#2a3a36');
  }
  return p;
}

// ---------------------------------------------------------------- UI
function panel(dark) {
  // 48x48, 16px corners for 9-slice.
  const p = new Pix(48, 48);
  const outer = dark ? '#141a28' : '#5a2f14';
  const mid = dark ? '#2a3550' : '#b4682e';
  const hi = dark ? '#3d4c70' : '#e89a52';
  const fill = dark ? '#1d2538e8' : '#f7e3b5';
  const fill2 = dark ? '#1d2538e8' : '#ecd29a';
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const d = Math.min(x, y, 47 - x, 47 - y);
    const corner = (x < 3 || x > 44) && (y < 3 || y > 44);
    if (corner && (x + y < 3 || (47 - x) + y < 3 || x + (47 - y) < 3 || (47 - x) + (47 - y) < 3)) continue;
    let c;
    if (d < 2) c = outer;
    else if (d < 4) c = (y < 24 && d === 2) ? hi : mid;
    else if (d < 5) c = outer;
    else if (d < 7) c = fill2;
    else c = fill;
    p.set(x, y, c);
  }
  // rivets
  if (!dark) [[3, 3], [44, 3], [3, 44], [44, 44]].forEach(([x, y]) => p.set(x, y, '#ffd34a'));
  return p;
}

function cursor() {
  const frames = [0, 1].map((f) => {
    const p = new Pix(16, 16);
    const c = f ? '#ffe066' : '#ffffff';
    const o = f ? 1 : 0;
    [[0 + o, 0 + o, 1, 1], [15 - o, 0 + o, -1, 1], [0 + o, 15 - o, 1, -1], [15 - o, 15 - o, -1, -1]].forEach(([x, y, dx, dy]) => {
      for (let i = 0; i < 4; i++) { p.set(x + dx * i, y, c); p.set(x, y + dy * i, c); }
    });
    return p;
  });
  return sheet(frames, 16, 16);
}

function icons() {
  // 32x32 app icons for the PuttPad menu.
  const make = (fn, bg) => {
    const p = new Pix(32, 32);
    const b = new Pix(32, 32);
    for (let y = 1; y < 31; y++) for (let x = 1; x < 31; x++) {
      const cx = Math.min(x - 1, 30 - x), cy = Math.min(y - 1, 30 - y);
      if (cx + cy < 3) continue;
      b.set(x, y, y < 16 ? shade(bg, 1.1) : bg);
    }
    b.outline('#2a1a10');
    p.blit(b, 0, 0);
    fn(p);
    return p;
  };
  const list = [
    // 0 island designer: palm + shovel
    make((p) => {
      p.rect(9, 12, 3, 14, '#c4955a');
      p.ellipse(10, 11, 7, 3, '#4f9e3a');
      p.ellipse(10, 10, 4, 2, '#67b84a');
      p.line(20, 8, 20, 22, '#8a5a32');
      p.rect(18, 21, 5, 5, '#b8bcc4');
      p.rect(18, 6, 5, 2, '#8a5a32');
    }, '#4fa0d8'),
    // 1 play: flag
    make((p) => {
      p.ellipse(16, 25, 9, 3, '#3a8f47');
      p.ellipse(16, 25, 2, 1, '#141414');
      p.rect(16, 6, 1, 19, '#ffffff');
      p.rect(17, 6, 8, 6, '#e0403a');
      p.circle(10, 23, 2, '#ffffff');
    }, '#6fbf5a'),
    // 2 customize: shirt
    make((p) => {
      p.rect(10, 10, 12, 14, '#e0483e');
      p.rect(6, 10, 5, 6, '#e0483e');
      p.rect(21, 10, 5, 6, '#e0483e');
      p.rect(14, 10, 4, 2, '#f7e3b5');
      p.rect(10, 16, 12, 2, '#b8392f');
    }, '#d88ad0'),
    // 3 shop: little building
    make((p) => {
      p.rect(7, 15, 18, 11, '#f3e6c4');
      for (let y = 8; y < 16; y++) p.rect(16 - (y - 6), y, (y - 6) * 2, 1, '#d0583e');
      p.rect(14, 19, 4, 7, '#7c4b26');
    }, '#f0b050'),
    // 4 save: notebook
    make((p) => {
      p.rect(9, 7, 14, 18, '#3f7fd0');
      p.rect(11, 9, 10, 4, '#f3e6c4');
      p.rect(9, 7, 2, 18, '#2c5aa0');
      p.rect(13, 20, 6, 2, '#ffd34a');
    }, '#8fa8c8'),
    // 5 controls: gamepad
    make((p) => {
      p.ellipse(16, 17, 11, 6, '#3a3a44');
      p.rect(9, 15, 5, 1, '#e8e8e8');
      p.rect(11, 13, 1, 5, '#e8e8e8');
      p.circle(21, 14, 1.2, '#6fdc6f');
      p.circle(23, 16, 1.2, '#ff6a6a');
      p.circle(19, 16, 1.2, '#6aaaff');
      p.circle(21, 18, 1.2, '#ffe066');
    }, '#a0a0b8'),
    // 6 home / title
    make((p) => {
      p.rect(9, 15, 14, 10, '#f3e6c4');
      for (let y = 7; y < 16; y++) p.rect(16 - (y - 5), y, (y - 5) * 2, 1, '#3f7fd0');
      p.rect(14, 19, 4, 6, '#7c4b26');
    }, '#c8a870'),
    // 7 course builder: flag + hammer
    make((p) => {
      p.rect(10, 6, 1, 18, '#ffffff');
      p.rect(11, 6, 7, 5, '#ffd34a');
      p.line(17, 25, 25, 15, '#8a5a32');
      p.rect(22, 11, 6, 4, '#b8bcc4');
      p.ellipse(11, 25, 6, 2, '#3a8f47');
    }, '#58b8a0'),
  ];
  return sheet(list, 32, 32);
}

export function generateObjects() {
  const out = {
    'objects/tree_oak': treeOak(),
    'objects/tree_pine': treePine(),
    'objects/tree_palm': treePalm(),
    'objects/tree_apple': treeApple(),
    'objects/bush': bush(null),
    'objects/bush_berry': bush('berry'),
    'objects/bush_flowers_white': bush('white'),
    'objects/bush_flowers_red': bush('red'),
    'objects/bush_flowers_orange': bush('orange'),
    'objects/flower_bed': flowerBed(),
    'objects/garden_plot': gardenPlot(),
    'objects/hole_sign': holeSign(),
    'objects/flowers_red': flowers('#ee3a3a', '#c42a2a'),
    'objects/flowers_yellow': flowers('#ffd34a', '#d8a828'),
    'objects/flowers_blue': flowers('#6aa8ff', '#3f7fd0'),
    'objects/flowers_pink': flowers('#ff9ad0', '#e06aa8'),
    'objects/tall_grass': tallGrass(),
    'objects/rock': rock(false),
    'objects/boulder': rock(true),
    'objects/stump': stump(),
    'objects/bench': bench(),
    'objects/lamp': lamp(),
    'objects/sign': sign(''),
    'objects/barrel': barrel(),
    'objects/crate': crate(),
    'objects/umbrella': umbrella(),
    'objects/deck_chair': deckChair(),
    'objects/shell': shell(),
    'objects/starfish': starfish(),
    'objects/tiki_torch': tikiTorch(),
    'objects/ball_statue': ballStatue(),
    'objects/mailbox': mailbox(),
    'objects/picnic_table': picnicTable(),
    'objects/starter_board': starterBoard(),
    'course/tee': teeMat(),
    'course/cup': cup(),
    'course/flag': flags(),
    'course/bumper': sheet([bumper(false), bumper(true)], 16, 16),
    'course/boost': boostPads(),
    'course/spinner_base': spinnerBase(),
    'course/spinner_blades': spinnerBlades(),
    'course/ball': ball(),
    'course/ball_shadow': ballShadow(),
    'buildings/proshop': proShopBuilding(),
    'interior/floor_wood': floorTile('wood'),
    'interior/floor_checker': floorTile('checker'),
    'interior/floor_carpet': floorTile('carpet'),
    'interior/floor_tile': floorTile('tile'),
    'interior/wall_cream': wallTile('cream'),
    'interior/wall_stripe': wallTile('stripe'),
    'interior/wall_panel': wallTile('panel'),
    'interior/wall_navy': wallTile('navy'),
    'interior/counter': counter(),
    'interior/shelf_balls': shelfBalls(),
    'interior/club_rack': clubRack(),
    'interior/bag_stand': bagStand(),
    'interior/trophy_case': trophyCase(),
    'interior/potted_plant': pottedPlant(),
    'interior/rug': rug(),
    'interior/armchair': armchair(),
    'interior/coffee_table': coffeeTable(),
    'interior/mirror': mirror(),
    'interior/putting_mat': puttingMat(),
    'interior/poster': wallPoster(),
    'interior/clock': wallClock(),
    'interior/window': wallWindow(),
    'interior/pennant': wallPennant(),
    'interior/neon_open': neonOpen(),
    'interior/door_mat': doorMat(),
    'interior/locker_door': lockerDoor(),
    'interior/sign_locker': lockerSign(),
    'ui/lockers': lockersBackdrop(),
    'ui/panel': panel(false),
    'ui/panel_dark': panel(true),
    'ui/cursor': cursor(),
    'ui/icons': icons(),
  };
  for (const [k, v] of Object.entries(out)) save(v, `assets/${k}.png`);
}

// The golfer: layered, tintable, 8-direction character (CS = 8 px per world px).
//
// Each layer is a 768×960 sheet: 6 columns × 5 rows of 128×192 frames.
//   rows    = facing: 0 down, 1 down-right, 2 right, 3 up-right, 4 up
//             (left-facing frames are mirrored in the game)
//   columns = 0 idle, 1–4 walk cycle (stride, pass, stride, pass), 5 putting stance
// Feet rest on y = 184. Layers are greyscale (white = full tint colour) except `face`.
//
// The figure is posed in simple 3D (head sphere, torso, limbs) and projected,
// so features stay consistent as it turns.

const FW = 128, FH = 192, CX = 64;
const FACINGS = [0, 45, 90, 135, 180];
const POSES = ['idle', 'w1', 'w2', 'w3', 'w4', 'putt'];
const GREY = { hi: '#ffffff', base: '#e6e6e6', mid: '#c8c8c8', dark: '#a2a2a2', line: '#7c7c7c' };
const HEAD = { cy: 52, r: 35 };

/** Character pose for a facing (degrees) and pose name. */
function pose(theta, name) {
  const t = (theta * Math.PI) / 180;
  const F = { x: Math.sin(t), z: Math.cos(t) }; // facing direction (z toward viewer)
  const R = { x: Math.cos(t), z: -Math.sin(t) }; // body "right-to-left" axis
  const stride = { idle: 0, w1: 1, w2: 0, w3: -1, w4: 0, putt: 0 }[name];
  const bob = name === 'w2' || name === 'w4' ? -3 : 0;
  return { t, F, R, stride, bob, name };
}

const project = (p, x, y, z) => ({ x: CX + x, y: y + z * 0.22 + p.bob, z });

/** Vertical gradient helper for greyscale body parts. */
function greyFill(g, x0, x1, light = 0.0) {
  const grd = g.createLinearGradient(x0, 0, x1, 0);
  grd.addColorStop(0, GREY.hi);
  grd.addColorStop(0.35 + light, GREY.base);
  grd.addColorStop(1, GREY.dark);
  return grd;
}

/** A tapered limb (capsule) from a to b. */
function limb(g, a, b, w0, w1, fill) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  g.beginPath();
  g.moveTo(a.x + nx * w0, a.y + ny * w0);
  g.lineTo(b.x + nx * w1, b.y + ny * w1);
  g.arc(b.x, b.y, w1, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
  g.lineTo(a.x - nx * w0, a.y - ny * w0);
  g.arc(a.x, a.y, w0, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
  g.closePath();
  g.fillStyle = fill ?? greyFill(g, Math.min(a.x, b.x) - w0, Math.max(a.x, b.x) + w0);
  g.fill();
  g.strokeStyle = GREY.line;
  g.lineWidth = 2.6;
  g.stroke();
}

function torsoBox(p) {
  const halfW = 25 - Math.abs(Math.sin(p.t)) * 8;
  return { x0: CX - halfW, x1: CX + halfW, y0: 86 + p.bob, y1: 136 + p.bob, halfW };
}

/** Shoulder, hand, hip and foot positions for both sides; side 'n' = nearer the viewer. */
function limbs(p) {
  const tb = torsoBox(p);
  const out = [];
  for (const s of [-1, 1]) {
    const sx = s * (tb.halfW + 2) / Math.max(0.35, Math.abs(p.R.x) || 0.35);
    const sz = s * p.R.z * (tb.halfW + 2);
    const shoulder = project(p, s * p.R.x * (tb.halfW - 5), 99, sz);
    // arm swing is opposite to the leg on the same side
    const swing = -s * p.stride * 13;
    let hand;
    if (p.name === 'putt') {
      hand = project(p, p.F.x * 16 + s * p.R.x * 3, 128, p.F.z * 16 + s * p.R.z * 3);
    } else {
      hand = project(p, shoulder.x - CX + p.F.x * swing + s * p.R.x * 3, 134 - Math.abs(swing) * 0.2, sz + p.F.z * swing);
    }
    const hip = project(p, s * p.R.x * 11, 134, s * p.R.z * 11);
    const legSwing = s * p.stride * 14;
    const foot = project(p, s * p.R.x * 12 + p.F.x * legSwing, 176 - (p.bob ? 2 : 0), s * p.R.z * 12 + p.F.z * legSwing * 1.8);
    foot.y -= p.bob; // feet stay planted during the bob
    hip.y -= 0;
    out.push({ s, shoulder, hand, hip, foot, z: sz, near: sz >= -1 });
    void sx;
  }
  // legs: draw the far one first
  return out.sort((a, b) => a.z - b.z);
}

// ---------------------------------------------------------------- parts
function drawLeg(g, L, len, w) {
  const knee = { x: (L.hip.x + L.foot.x) / 2, y: (L.hip.y + L.foot.y) / 2 };
  const end = len >= 1 ? L.foot : { x: L.hip.x + (L.foot.x - L.hip.x) * len, y: L.hip.y + (L.foot.y - L.hip.y) * len };
  void knee;
  limb(g, L.hip, { x: end.x, y: end.y - (len >= 1 ? 4 : 0) }, w, w * 0.9);
}

function drawShoe(g, L, p) {
  const dir = p.F.x;
  const cx = L.foot.x + dir * 4, cy = L.foot.y + 4;
  const rx = 9 + Math.abs(dir) * 5, ry = 6.5;
  const grd = g.createLinearGradient(0, cy - ry, 0, cy + ry);
  grd.addColorStop(0, GREY.hi);
  grd.addColorStop(1, GREY.mid);
  ellipse(g, cx, cy, rx, ry, grd, GREY.line, 2.4);
}

function drawArm(g, L, sleeve) {
  // sleeve: 0 = bare arm, 0.45 = short sleeve, 0.85 = long sleeve
  if (sleeve > 0) {
    const e = { x: L.shoulder.x + (L.hand.x - L.shoulder.x) * sleeve, y: L.shoulder.y + (L.hand.y - L.shoulder.y) * sleeve };
    limb(g, L.shoulder, e, 11, 9.5);
    // round the top of the sleeve into the shoulder
    circle(g, L.shoulder.x, L.shoulder.y + 2, 9.5, greyFill(g, L.shoulder.x - 10, L.shoulder.x + 10));
  } else {
    limb(g, L.shoulder, L.hand, 6.5, 6);
    circle(g, L.hand.x, L.hand.y, 7.5, greyFill(g, L.hand.x - 8, L.hand.x + 8), GREY.line, 2.4);
  }
}

function torsoPath(g, p) {
  const tb = torsoBox(p);
  g.beginPath();
  g.moveTo(tb.x0 + 6, tb.y0);
  g.lineTo(tb.x1 - 6, tb.y0);
  g.quadraticCurveTo(tb.x1 + 1, tb.y0 + 2, tb.x1, tb.y0 + 12);
  g.lineTo(tb.x1 - 1, tb.y1);
  g.lineTo(tb.x0 + 1, tb.y1);
  g.lineTo(tb.x0, tb.y0 + 12);
  g.quadraticCurveTo(tb.x0 - 1, tb.y0 + 2, tb.x0 + 6, tb.y0);
  g.closePath();
  return tb;
}

function drawTorso(g, p) {
  const tb = torsoPath(g, p);
  g.fillStyle = greyFill(g, tb.x0, tb.x1);
  g.fill();
  g.strokeStyle = GREY.line;
  g.lineWidth = 2.6;
  g.stroke();
}

/** Untinted white stripes over a region (striped shirts stay red-and-white whatever the colour). */
function whiteStripes(g, x0, x1, y0, y1) {
  for (let y = y0 + 5; y < y1 - 2; y += 11) {
    const grd = g.createLinearGradient(x0, 0, x1, 0);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(1, '#d8d8de');
    g.fillStyle = grd;
    g.fillRect(x0 - 4, y, x1 - x0 + 8, 5.5);
  }
}

function drawSkirt(g, p) {
  const tb = torsoBox(p);
  g.beginPath();
  g.moveTo(tb.x0 + 1, 128 + p.bob);
  g.lineTo(tb.x1 - 1, 128 + p.bob);
  g.lineTo(tb.x1 + 8, 158 + p.bob);
  g.lineTo(tb.x0 - 8, 158 + p.bob);
  g.closePath();
  g.fillStyle = greyFill(g, tb.x0 - 8, tb.x1 + 8);
  g.fill();
  g.strokeStyle = GREY.line;
  g.lineWidth = 2.6;
  g.stroke();
}

// ---------------------------------------------------------------- head
/** Rotate a face-space direction into view space for facing angle t. */
function rotY(v, t) {
  return { x: v.x * Math.cos(t) + v.z * Math.sin(t), y: v.y, z: -v.x * Math.sin(t) + v.z * Math.cos(t) };
}

function headPoint(p, v) {
  const q = rotY(v, p.t);
  return { x: CX + q.x * HEAD.r, y: HEAD.cy + q.y * HEAD.r + p.bob, z: q.z };
}

function drawHead(g, p) {
  const cy = HEAD.cy + p.bob;
  // ear on the side of the head (opposite the face direction when turned)
  if (Math.abs(Math.sin(p.t)) > 0.3) {
    const e = headPoint(p, { x: -0.98, y: 0.12, z: -0.05 });
    if (e.z > -0.6) ellipse(g, e.x, e.y, 6, 9, greyFill(g, e.x - 6, e.x + 6), GREY.line, 2.2);
  }
  const grd = g.createRadialGradient(CX - 12, cy - 14, 4, CX, cy, HEAD.r + 2);
  grd.addColorStop(0, GREY.hi);
  grd.addColorStop(0.6, GREY.base);
  grd.addColorStop(1, GREY.mid);
  circle(g, CX, cy, HEAD.r, grd, GREY.line, 2.6);
  // neck
  roundRect(g, CX - 8, cy + HEAD.r - 6, 16, 12, 4, GREY.mid);
}

function drawFace(g, p) {
  const eyes = [{ x: -0.34, y: 0.04, z: 0.94 }, { x: 0.34, y: 0.04, z: 0.94 }];
  for (const v of eyes) {
    const e = headPoint(p, v);
    if (e.z < 0.2) continue;
    const sq = Math.max(0.35, e.z);
    ellipse(g, e.x, e.y, 6.5 * sq, 9, '#ffffff', '#3a2a24', 1.6);
    const px = e.x + Math.sin(p.t) * 2.2;
    ellipse(g, px, e.y + 1.5, 4.2 * sq, 5.5, '#1c1410');
    circle(g, px - 1.2, e.y - 1, 1.3, '#ffffff');
  }
  const n = headPoint(p, { x: 0, y: 0.3, z: 0.95 });
  if (n.z > 0.15) ellipse(g, n.x + Math.sin(p.t) * 2, n.y, 4.5 * Math.max(0.5, n.z), 3.6, 'rgba(200,80,70,0.35)');
  const m = headPoint(p, { x: 0, y: 0.52, z: 0.85 });
  if (m.z > 0.2) {
    g.strokeStyle = '#9a3a34';
    g.lineWidth = 2.4;
    g.lineCap = 'round';
    g.beginPath();
    const w = 8 * Math.max(0.4, m.z);
    g.arc(m.x, m.y - 5, w, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
  }
  for (const v of [{ x: -0.55, y: 0.36, z: 0.76 }, { x: 0.55, y: 0.36, z: 0.76 }]) {
    const b = headPoint(p, v);
    if (b.z > 0.25) ellipse(g, b.x, b.y, 6 * b.z, 4, 'rgba(255,110,110,0.35)');
  }
}

// ---------------------------------------------------------------- hair
/** Coverage tests in face space (x right, y down, z toward the face direction). */
const HAIR_STYLES = {
  short: (x, y, z) => y < -0.36 + 0.06 * Math.cos(x * 9) || (z < -0.1 && y < 0.5) || (Math.abs(x) > 0.8 && y < 0.12 && z < 0.5) || (z > 0 && y < -0.2 + 0.07 * Math.sin(x * 13)),
  spiky: (x, y, z) => HAIR_STYLES.short(x, y, z),
  long: (x, y, z) => y < -0.4 + 0.05 * Math.cos(x * 8) || z < 0.1 || (Math.abs(x) > 0.62 && z < 0.75) || (z > 0 && y < -0.22 + 0.05 * Math.sin(x * 11)),
  ponytail: (x, y, z) => y < -0.4 || (z < -0.1 && y < 0.45) || (Math.abs(x) > 0.82 && y < 0.1 && z < 0.5) || (z > 0 && y < -0.26 + 0.04 * Math.sin(x * 10)),
  bob: (x, y, z) => y < -0.42 || (z < 0.05 && y < 0.62) || (Math.abs(x) > 0.66 && y < 0.6 && z < 0.8) || (z > 0 && y < -0.24),
  curly: (x, y, z) => y < -0.3 + 0.08 * Math.cos(x * 14) || (z < -0.05 && y < 0.5) || (Math.abs(x) > 0.78 && y < 0.25 && z < 0.55),
};

function drawHair(g, p, style, scale) {
  const test = HAIR_STYLES[style];
  const cy = HEAD.cy + p.bob;
  const r = HEAD.r + 1.5;
  // extra volume outside the head silhouette, drawn first
  const extra = new Path2D();
  if (style === 'curly') {
    for (let a = Math.PI * 0.95; a <= Math.PI * 2.05; a += 0.32) extra.arc(CX + Math.cos(a) * r, cy + Math.sin(a) * r * 0.98, 11, 0, Math.PI * 2);
  }
  if (style === 'spiky') {
    for (let a = Math.PI * 1.08; a <= Math.PI * 1.95; a += 0.21) {
      extra.moveTo(CX + Math.cos(a - 0.1) * (r - 4), cy + Math.sin(a - 0.1) * (r - 4));
      extra.lineTo(CX + Math.cos(a) * (r + 13), cy + Math.sin(a) * (r + 13));
      extra.lineTo(CX + Math.cos(a + 0.1) * (r - 4), cy + Math.sin(a + 0.1) * (r - 4));
      extra.closePath();
    }
  }
  if (style === 'long' || style === 'bob') {
    const len = style === 'long' ? 48 : 22;
    const back = Math.cos(p.t) < -0.3; // seen from behind: a full panel of hair
    if (back) extra.roundRect(CX - r * 0.98, cy, r * 1.96, r * 0.4 + len, 14);
    else {
      for (const sx of [-1, 1]) {
        const q = rotY({ x: sx * 0.9, y: 0, z: 0.1 }, p.t);
        if (q.z < -0.55) continue;
        extra.roundRect(CX + q.x * r - 10, cy - 4, 20, r * 0.4 + len, 9);
      }
    }
  }
  if (style === 'ponytail') {
    const q = rotY({ x: 0, y: 0, z: -1.05 }, p.t);
    if (q.z > -0.5) {
      const x = CX + q.x * r, y = cy - 6;
      extra.ellipse(x, y + 26, 10, 22, 0, 0, Math.PI * 2);
    }
  }
  // per-pixel coverage on the head sphere (supersampled by the caller's scale)
  const W = FW * scale, H = FH * scale;
  const mask = makeCanvas(W, H);
  const mg = mask.getContext('2d');
  const img = mg.createImageData(W, H);
  const rr = HEAD.r + 2;
  for (let py = Math.floor((cy - rr) * scale); py < Math.ceil((cy + rr) * scale); py++) {
    for (let px = Math.floor((CX - rr) * scale); px < Math.ceil((CX + rr) * scale); px++) {
      const x = (px / scale - CX) / rr, y = (py / scale - cy) / rr;
      const d = x * x + y * y;
      if (d > 1) continue;
      const z = Math.sqrt(1 - d);
      // back into face space
      const fx = x * Math.cos(p.t) - z * Math.sin(p.t);
      const fz = x * Math.sin(p.t) + z * Math.cos(p.t);
      if (!test(fx, y, fz)) continue;
      const i = (py * W + px) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }
  mg.putImageData(img, 0, 0);
  mg.scale(scale, scale);
  mg.fillStyle = '#ffffff';
  mg.fill(extra);
  // colour the mask: outline (dilated, dark) under a shaded fill with strands
  const col = makeCanvas(W, H);
  const cg = col.getContext('2d');
  for (const [dx, dy] of [[-2.4, 0], [2.4, 0], [0, -2.4], [0, 2.4], [-1.7, -1.7], [1.7, 1.7], [-1.7, 1.7], [1.7, -1.7]]) cg.drawImage(mask, dx * scale, dy * scale);
  cg.globalCompositeOperation = 'source-in';
  cg.fillStyle = GREY.line;
  cg.fillRect(0, 0, W, H);
  cg.globalCompositeOperation = 'source-over';
  const fill = makeCanvas(W, H);
  const fg = fill.getContext('2d');
  fg.drawImage(mask, 0, 0);
  fg.globalCompositeOperation = 'source-in';
  const grd = fg.createRadialGradient((CX - 14) * scale, (cy - 20) * scale, 4, CX * scale, cy * scale, (HEAD.r + 30) * scale);
  grd.addColorStop(0, GREY.hi);
  grd.addColorStop(0.5, GREY.base);
  grd.addColorStop(1, GREY.dark);
  fg.fillStyle = grd;
  fg.fillRect(0, 0, W, H);
  // strands
  fg.globalCompositeOperation = 'source-atop';
  fg.strokeStyle = 'rgba(120,120,120,0.35)';
  fg.lineWidth = 1.6 * scale;
  const rs = rng(style.length * 7 + Math.round(p.t * 10));
  for (let i = 0; i < 22; i++) {
    const a = Math.PI * (1.05 + rs() * 0.9);
    const x0 = CX + Math.cos(a) * HEAD.r * 0.9, y0 = cy + Math.sin(a) * HEAD.r * 0.9;
    fg.beginPath();
    fg.moveTo(x0 * scale, y0 * scale);
    fg.quadraticCurveTo((x0 + (CX - x0) * 0.3) * scale, (y0 + 8) * scale, (x0 + (CX - x0) * 0.5) * scale, (y0 + 18) * scale);
    fg.stroke();
  }
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(col, 0, 0);
  g.drawImage(fill, 0, 0);
  g.restore();
}

// ---------------------------------------------------------------- hats
function drawHat(g, p, style) {
  const cy = HEAD.cy + p.bob, r = HEAD.r;
  const s = Math.sin(p.t), c = Math.cos(p.t);
  const dome = (top, bottomY, widen = 1.04) => {
    g.beginPath();
    g.ellipse(CX, bottomY, r * widen, (bottomY - top), 0, Math.PI, Math.PI * 2);
    g.closePath();
    g.fillStyle = greyFill(g, CX - r, CX + r);
    g.fill();
    g.strokeStyle = GREY.line;
    g.lineWidth = 2.6;
    g.stroke();
  };
  const brim = (x, y, rx, ry) => ellipse(g, x, y, rx, ry, greyFill(g, x - rx, x + rx, 0.1), GREY.line, 2.4);
  if (style === 'cap' || style === 'visor') {
    const bx = CX + s * r * 0.8, by = cy - r * 0.32 + c * 6;
    const brx = r * (0.5 + 0.42 * Math.abs(c)), bry = r * (0.2 + 0.08 * Math.abs(s));
    if (c < -0.2) brim(bx, by, brx, bry); // brim behind when facing away
    if (style === 'cap') dome(cy - r - 4, cy - r * 0.28);
    else roundRect(g, CX - r * 1.02, cy - r * 0.55, r * 2.04, r * 0.28, 6, greyFill(g, CX - r, CX + r), GREY.line, 2.4);
    if (c >= -0.2) brim(bx, by, brx, bry);
  } else if (style === 'bucket') {
    dome(cy - r - 6, cy - r * 0.25, 0.92);
    brim(CX, cy - r * 0.22, r * 1.25, r * 0.32);
    dome(cy - r - 6, cy - r * 0.3, 0.86);
  } else if (style === 'beanie') {
    dome(cy - r - 6, cy - r * 0.1, 1.06);
    roundRect(g, CX - r * 1.06, cy - r * 0.36, r * 2.12, r * 0.3, 8, GREY.mid, GREY.line, 2.4);
    for (let x = CX - r + 6; x < CX + r; x += 8) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, cy - r * 0.34, 3, r * 0.26); }
    circle(g, CX, cy - r - 8, 9, greyFill(g, CX - 9, CX + 9), GREY.line, 2.4);
  } else if (style === 'straw') {
    brim(CX, cy - r * 0.3, r * 1.55, r * 0.42);
    dome(cy - r - 4, cy - r * 0.32, 0.82);
    roundRect(g, CX - r * 0.82, cy - r * 0.5, r * 1.64, 8, 3, GREY.dark);
  }
}

// ---------------------------------------------------------------- layers
const SLEEVE = { tee: 0.42, long: 0.86, striped: 0.86, tank: 0 };

function layerFrame(layer, theta, poseName) {
  return (g) => {
    const SS = 2; // supersample
    const off = makeCanvas(FW * SS, FH * SS);
    const o = off.getContext('2d');
    o.scale(SS, SS);
    o.lineJoin = 'round';
    const p = pose(theta, poseName);
    const L = limbs(p);
    const far = L.filter((l) => !l.near), near = L.filter((l) => l.near);
    const [kind, style] = layer.split(':');
    switch (kind) {
      case 'body':
        for (const l of L) drawLeg(o, l, 1, 9);
        for (const l of far) drawArm(o, l, 0);
        drawHead(o, p);
        break;
      case 'arms':
        for (const l of near) drawArm(o, l, 0);
        break;
      case 'pants':
        if (style === 'skirt') drawSkirt(o, p);
        else {
          for (const l of L) drawLeg(o, l, style === 'shorts' ? 0.5 : 1, 10.5);
          const tb = torsoBox(p);
          roundRect(o, tb.x0 + 1, 126 + p.bob, tb.x1 - tb.x0 - 2, 14, 4, greyFill(o, tb.x0, tb.x1), GREY.line, 2.4);
        }
        break;
      case 'shoes':
        for (const l of L) drawShoe(o, l, p);
        break;
      case 'shirt':
        if (SLEEVE[style]) for (const l of far) drawArm(o, l, SLEEVE[style]);
        drawTorso(o, p, style);
        break;
      case 'sleeves':
        for (const l of near) drawArm(o, l, SLEEVE[style]);
        break;
      case 'shirtfx': {
        o.save();
        const tb = torsoPath(o, p);
        o.clip();
        whiteStripes(o, tb.x0, tb.x1, tb.y0, tb.y1);
        o.restore();
        break;
      }
      case 'sleevesfx':
        for (const l of near) {
          // stripes clipped to the near sleeve
          const tmp = makeCanvas(FW, FH);
          const tg = tmp.getContext('2d');
          drawArm(tg, l, SLEEVE[style]);
          tg.globalCompositeOperation = 'source-in';
          whiteStripes(tg, 0, FW, l.shoulder.y - 6, l.hand.y);
          o.drawImage(tmp, 0, 0);
        }
        break;
      case 'face':
        drawFace(o, p);
        break;
      case 'hair':
        drawHair(o, p, style, SS);
        break;
      case 'hat':
        drawHat(o, p, style);
        break;
    }
    g.imageSmoothingQuality = 'high';
    g.drawImage(off, 0, 0, FW, FH);
  };
}

function layerSheet(path, layer) {
  const frames = [];
  for (const th of FACINGS) for (const ps of POSES) frames.push(layerFrame(layer, th, ps));
  ART.sheet(path, FW, FH, frames, POSES.length);
}

layerSheet('assets/character/body.png', 'body');
layerSheet('assets/character/arms.png', 'arms');
layerSheet('assets/character/face.png', 'face');
layerSheet('assets/character/shoes.png', 'shoes');
for (const s of ['tee', 'long', 'striped', 'tank']) {
  layerSheet(`assets/character/shirt_${s}.png`, `shirt:${s}`);
  if (s !== 'tank') layerSheet(`assets/character/sleeves_${s}.png`, `sleeves:${s}`);
}
// untinted overlays (white stripes) for the striped top
layerSheet('assets/character/shirtfx_striped.png', 'shirtfx:striped');
layerSheet('assets/character/sleevesfx_striped.png', 'sleevesfx:striped');
for (const s of ['shorts', 'long', 'skirt']) layerSheet(`assets/character/pants_${s}.png`, `pants:${s}`);
for (const s of Object.keys(HAIR_STYLES)) layerSheet(`assets/character/hair_${s}.png`, `hair:${s}`);
for (const s of ['cap', 'visor', 'bucket', 'beanie', 'straw']) layerSheet(`assets/character/hat_${s}.png`, `hat:${s}`);
ART.add('assets/character/shadow.png', 96, 32, (g) => ellipse(g, 48, 16, 44, 13, 'rgba(24,34,20,0.55)'));

// Trees, bushes, flowers and garden pieces (S = 4 texture px per world px).

function trunkHD(g, cx, top, bottom, w) {
  const bark = '#9a6640', barkDark = '#7a4c2c', barkLight = '#b57d52';
  g.beginPath();
  g.moveTo(cx - w / 2, top);
  g.lineTo(cx + w / 2, top);
  g.lineTo(cx + w / 2 + 2, bottom - 10);
  g.quadraticCurveTo(cx + w / 2 + 12, bottom, cx + w / 2 + 16, bottom + 2);
  g.lineTo(cx - w / 2 - 16, bottom + 2);
  g.quadraticCurveTo(cx - w / 2 - 12, bottom, cx - w / 2 - 2, bottom - 10);
  g.closePath();
  const grd = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  grd.addColorStop(0, barkLight);
  grd.addColorStop(0.45, bark);
  grd.addColorStop(1, barkDark);
  g.fillStyle = grd;
  g.fill();
  g.strokeStyle = '#5e3a20';
  g.lineWidth = 2.5;
  g.stroke();
  // bark spots
  const r = rng(cx * 7 + top);
  for (let i = 0; i < 9; i++) ellipse(g, cx - w / 2 + 4 + r() * (w - 8), top + 6 + r() * (bottom - top - 18), 2 + r() * 2.5, 3 + r() * 3, 'rgba(90,55,30,0.45)');
}

function appleHD(g, x, y, r = 7) {
  const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  grd.addColorStop(0, '#ff6a5a');
  grd.addColorStop(0.5, '#e62a26');
  grd.addColorStop(1, '#b01616');
  circle(g, x, y, r, grd, '#7a1010', 1.5);
  ellipse(g, x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.18, 'rgba(255,255,255,0.75)');
  g.strokeStyle = '#5a3a1c';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, y - r + 1);
  g.lineTo(x + 1.5, y - r - 4);
  g.stroke();
}

/** Round, clumpy canopy tree (the mock-up's main tree), optionally with apples. */
function roundTreeHD(apples) {
  return (g) => {
    groundShadow(g, 64, 176, 52, 15, 0.45);
    trunkHD(g, 64, 108, 172, 26);
    const P = [];
    // lower ring of puffs
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.05 + (i / 8) * 0.9);
      P.push([64 - Math.cos(a) * 44, 104 + Math.sin(a) * 6, 19]);
    }
    // middle ring
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (i / 6);
      P.push([64 - Math.cos(a) * 36, 74 - Math.sin(a) * 4, 21]);
    }
    // top crown
    P.push([64, 72, 30], [64, 40, 22], [46, 50, 18], [82, 50, 18], [64, 24, 16]);
    puffs(g, P, LEAF, apples ? 91 : 92, { density: 0.06 });
    // scalloped highlight arcs on the upper puffs
    g.strokeStyle = 'rgba(110,190,120,0.55)';
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    for (const [x, y, r] of P) {
      if (y > 90) continue;
      g.beginPath();
      g.arc(x, y, r - 5, Math.PI * 1.1, Math.PI * 1.55);
      g.stroke();
    }
    if (apples) [[64, 22], [36, 64], [92, 64], [48, 96], [82, 94]].forEach(([x, y]) => appleHD(g, x, y, 8));
  };
}

function pineHD() {
  return (g) => {
    groundShadow(g, 64, 176, 46, 14, 0.45);
    trunkHD(g, 64, 140, 172, 18);
    const tiers = [[10, 58, 26], [34, 92, 38], [62, 124, 48], [92, 156, 56]];
    const cols = { base: '#1f7340', light: '#358f55', dark: '#11532b' };
    // outline pass, then fills, bottom tier first so upper tiers overlap
    const path = (top, bottom, half, grow = 0) => {
      g.beginPath();
      g.moveTo(64, top - grow);
      g.quadraticCurveTo(64 + half * 0.35, top + (bottom - top) * 0.35, 64 + half + grow, bottom - 6);
      // scalloped hem
      const n = Math.max(4, Math.round(half / 9));
      for (let i = 0; i <= n; i++) {
        const x = 64 + half - (i * 2 * half) / n;
        g.quadraticCurveTo(x + half / n, bottom + 8 + grow, x, bottom - 4 + grow * 0.5);
      }
      g.quadraticCurveTo(64 - half * 0.35, top + (bottom - top) * 0.35, 64, top - grow);
      g.closePath();
    };
    for (let i = tiers.length - 1; i >= 0; i--) {
      const [top, bottom, half] = tiers[i];
      path(top, bottom, half, 2.5);
      g.fillStyle = shade(cols.dark, 0.75);
      g.fill();
      path(top, bottom, half);
      const grd = g.createLinearGradient(64 - half, 0, 64 + half, 0);
      grd.addColorStop(0, cols.light);
      grd.addColorStop(0.5, cols.base);
      grd.addColorStop(1, cols.dark);
      g.fillStyle = grd;
      g.fill();
      g.save();
      g.clip();
      leafTexture(g, 64 - half, top, half * 2, bottom - top + 10, 'rgba(10,60,30,0.6)', 'rgba(90,170,110,0.45)', 300 + i, 0.07);
      // darker band under the hem of the tier above
      if (i > 0) {
        const grd2 = g.createLinearGradient(0, top + 8, 0, top + 26);
        grd2.addColorStop(0, 'rgba(10,50,25,0.5)');
        grd2.addColorStop(1, 'rgba(10,50,25,0)');
        g.fillStyle = grd2;
        g.fillRect(0, top, 128, 30);
      }
      g.restore();
    }
  };
}

function palmHD() {
  return (g) => {
    groundShadow(g, 70, 176, 36, 11, 0.4);
    // curved ringed trunk
    for (let y = 172; y > 60; y -= 2) {
      const t = (172 - y) / 112;
      const x = 62 + Math.sin(t * 2.2) * 12;
      const w = 15 - t * 4;
      const ring = Math.floor(y / 7) % 2;
      roundRect(g, x - w / 2, y - 3, w, 5, 2, ring ? '#b98a54' : '#d0a066');
    }
    g.strokeStyle = 'rgba(90,60,30,0.6)';
    g.lineWidth = 1.5;
    const fronds = [-2.9, -2.3, -1.6, -0.9, -0.3, 0.35, 2.6];
    for (const [i, a] of fronds.entries()) {
      const len = 46 + (i % 2) * 8;
      const cx = 70, cy = 58;
      const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * 0.55 + 18;
      const mx = cx + Math.cos(a) * len * 0.5, my = cy + Math.sin(a) * len * 0.3 - 10;
      g.beginPath();
      g.moveTo(cx, cy);
      g.quadraticCurveTo(mx, my - 8, ex, ey);
      g.quadraticCurveTo(mx, my + 8, cx, cy + 4);
      g.closePath();
      const grd = g.createLinearGradient(cx, cy, ex, ey);
      grd.addColorStop(0, '#3c9a4a');
      grd.addColorStop(1, '#22783a');
      g.fillStyle = grd;
      g.fill();
      g.strokeStyle = '#155a2a';
      g.lineWidth = 2;
      g.stroke();
      // leaflet notches
      g.strokeStyle = 'rgba(20,80,35,0.7)';
      g.lineWidth = 1.2;
      for (let k = 0.25; k < 1; k += 0.15) {
        const px = cx + (ex - cx) * k, py = cy + (ey - cy) * k - 4 * Math.sin(k * Math.PI);
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + 3, py + 5);
        g.stroke();
      }
    }
    circle(g, 66, 62, 5, '#6b4426', '#3e2614', 1.5);
    circle(g, 75, 64, 5, '#5a3820', '#3e2614', 1.5);
  };
}

const FLOWER_COL = {
  white: ['#ffffff', '#e2e2e2'], red: ['#f03a3a', '#c22626'], orange: ['#ff9a2e', '#e07418'],
  yellow: ['#ffd83a', '#e2b020'], pink: ['#ff9ad0', '#e06aa8'], blue: ['#6aa8ff', '#3f7fd0'],
};

function flowerHD(g, x, y, color, r = 5) {
  const [a, b] = FLOWER_COL[color];
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
    circle(g, x + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.8, r * 0.62, a, b, 1);
  }
  circle(g, x, y, r * 0.45, '#ffd23a', '#d89a10', 1);
}

/** Low round bush; extra = 'berry' or a flower colour. */
function bushHD(extra) {
  return (g) => {
    groundShadow(g, 32, 56, 30, 8, 0.45);
    const P = [[14, 40, 13], [32, 42, 15], [50, 40, 13], [22, 28, 13], [42, 28, 13], [32, 20, 12]];
    puffs(g, P, LEAF, extra ? extra.length * 13 : 5, { density: 0.08 });
    if (extra === 'berry') [[18, 30], [34, 22], [46, 34], [26, 42], [40, 44]].forEach(([x, y]) => appleHD(g, x, y, 3.5));
    else if (extra) [[20, 30], [42, 26], [32, 42], [50, 40]].forEach(([x, y], i) => flowerHD(g, x, y, extra, i === 3 ? 4.5 : 6));
  };
}

function flowerPatchHD(color) {
  return (g) => {
    const r = rng(color.length * 31);
    for (let i = 0; i < 14; i++) {
      const x = 8 + r() * 48, y = 26 + r() * 30;
      g.strokeStyle = '#2f7d38';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (r() - 0.5) * 6, y - 6, x + (r() - 0.5) * 4, y - 10);
      g.stroke();
    }
    [[16, 24], [40, 18], [32, 40], [50, 44], [12, 48]].forEach(([x, y]) => flowerHD(g, x, y, color, 6));
  };
}

function flowerBedHD() {
  return (g) => {
    roundRect(g, 4, 4, 120, 120, 4, '#c98552', '#9a5e34', 3);
    g.save();
    g.beginPath();
    g.roundRect(4, 4, 120, 120, 4);
    g.clip();
    speckle(g, 4, 4, 120, 120, '#c98552', '#b06e40', '#dc9a62', 808, { grain: 2 });
    for (let y = 30; y < 124; y += 28) {
      g.fillStyle = 'rgba(120,70,35,0.45)';
      g.fillRect(4, y, 120, 3);
    }
    g.restore();
    ['white', 'red', 'yellow', 'orange'].forEach((col, row) => {
      for (let i = 0; i < 7; i++) {
        const x = 14 + i * 16 + (row % 2) * 6, y = 18 + row * 28;
        g.strokeStyle = '#2f7d38';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(x, y + 4);
        g.lineTo(x, y + 12);
        g.stroke();
        ellipse(g, x - 4, y + 10, 4, 2, '#3f9a48');
        flowerHD(g, x, y, col, 5.5);
      }
    });
  };
}

function gardenPlotHD() {
  return (g) => {
    roundRect(g, 4, 4, 120, 120, 6, '#c98d55', '#9a6438', 3);
    g.save();
    g.beginPath();
    g.roundRect(4, 4, 120, 120, 6);
    g.clip();
    speckle(g, 4, 4, 120, 120, '#c98d55', '#b27746', '#dca06a', 909, { grain: 2 });
    // wavy furrow ridges
    for (let y = 12; y < 124; y += 12) {
      g.beginPath();
      for (let x = 0; x <= 128; x += 4) {
        const yy = y + Math.sin(x * 0.18 + y) * 1.8;
        x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
      }
      g.strokeStyle = 'rgba(120,70,35,0.55)';
      g.lineWidth = 3;
      g.stroke();
      g.translate(0, -3);
      g.strokeStyle = 'rgba(240,190,130,0.45)';
      g.lineWidth = 2;
      g.stroke();
      g.translate(0, 3);
    }
    g.restore();
  };
}

function tallGrassHD() {
  return (g) => {
    const r = rng(321);
    for (let i = 0; i < 16; i++) {
      const x = 10 + r() * 44, h = 16 + r() * 22, lean = (r() - 0.5) * 14;
      g.beginPath();
      g.moveTo(x - 2.5, 58);
      g.quadraticCurveTo(x + lean * 0.4, 58 - h * 0.6, x + lean, 58 - h);
      g.quadraticCurveTo(x + lean * 0.4 + 2, 58 - h * 0.6, x + 2.5, 58);
      g.closePath();
      g.fillStyle = r() < 0.5 ? '#4a9a3a' : '#6ab84e';
      g.fill();
    }
  };
}

function rockHD(big) {
  return (g, w, h) => {
    groundShadow(g, w / 2, h - 8, w / 2 - 6, 8, 0.4);
    const blobs = big ? [[52, 54, 40, 28], [86, 60, 28, 20]] : [[32, 40, 24, 17]];
    for (const [x, y, rx, ry] of blobs) {
      const grd = g.createRadialGradient(x - rx * 0.4, y - ry * 0.5, 2, x, y, rx);
      grd.addColorStop(0, '#e2ddd2');
      grd.addColorStop(0.6, '#aca699');
      grd.addColorStop(1, '#827c70');
      ellipse(g, x, y, rx, ry, grd, '#5e594f', 2.5);
      ellipse(g, x - rx * 0.3, y - ry * 0.45, rx * 0.3, ry * 0.18, 'rgba(255,255,255,0.4)');
    }
  };
}

function stumpHD() {
  return (g) => {
    groundShadow(g, 32, 54, 26, 7, 0.4);
    roundRect(g, 12, 26, 40, 26, 6, '#8a5a32', '#5e3a20', 2.5);
    ellipse(g, 32, 26, 20, 8, '#d9a86a', '#8a5a32', 2);
    ellipse(g, 32, 26, 12, 4.5, null, '#b98450', 1.5);
    ellipse(g, 32, 26, 5, 2, null, '#b98450', 1.5);
  };
}

ART.add('assets/objects/tree_oak.png', 128, 192, roundTreeHD(false));
ART.add('assets/objects/tree_apple.png', 128, 192, roundTreeHD(true));
ART.add('assets/objects/tree_pine.png', 128, 192, pineHD());
ART.add('assets/objects/tree_palm.png', 128, 192, palmHD());
ART.add('assets/objects/bush.png', 64, 64, bushHD(null));
ART.add('assets/objects/bush_berry.png', 64, 64, bushHD('berry'));
for (const c of ['white', 'red', 'orange']) ART.add(`assets/objects/bush_flowers_${c}.png`, 64, 64, bushHD(c));
for (const c of ['red', 'yellow', 'blue', 'pink']) ART.add(`assets/objects/flowers_${c}.png`, 64, 64, flowerPatchHD(c));
ART.add('assets/objects/flower_bed.png', 128, 128, flowerBedHD());
ART.add('assets/objects/garden_plot.png', 128, 128, gardenPlotHD());
ART.add('assets/objects/tall_grass.png', 64, 64, tallGrassHD());
ART.add('assets/objects/rock.png', 64, 64, rockHD(false));
ART.add('assets/objects/boulder.png', 128, 96, rockHD(true));
ART.add('assets/objects/stump.png', 64, 64, stumpHD());

// Decorations, course pieces, the pro shop building, interior furniture and
// the wardrobe backdrop (S = 4 texture px per world px).

const WOOD = { base: '#c98f52', light: '#e2ae72', dark: '#8a5a32', line: '#5e3a20' };

function woodGrad(g, x0, y0, x1, y1, w = WOOD) {
  const grd = g.createLinearGradient(x0, y0, x1, y1);
  grd.addColorStop(0, w.light);
  grd.addColorStop(0.5, w.base);
  grd.addColorStop(1, w.dark);
  return grd;
}

function plank(g, x, y, w, h, wood = WOOD) {
  roundRect(g, x, y, w, h, Math.min(4, h / 2), woodGrad(g, x, y, x, y + h, wood), wood.line, 2);
}

// ---------------------------------------------------------------- decor
function benchHD(g) {
  groundShadow(g, 64, 88, 58, 8);
  for (const x of [12, 108]) { roundRect(g, x, 22, 8, 32, 2, '#4a4a55', '#2a2a32', 1.5); roundRect(g, x, 60, 8, 28, 2, '#4a4a55', '#2a2a32', 1.5); }
  plank(g, 6, 16, 116, 12);
  plank(g, 6, 32, 116, 10);
  plank(g, 6, 48, 116, 14);
  plank(g, 6, 64, 116, 12);
}

function lampHD(g) {
  groundShadow(g, 32, 124, 16, 5);
  roundRect(g, 22, 112, 20, 10, 3, '#33403c', '#1c2422', 2);
  roundRect(g, 28, 34, 8, 82, 3, '#3b4a46', '#1c2422', 2);
  roundRect(g, 14, 10, 36, 28, 6, '#3b4a46', '#1c2422', 2.5);
  const glow = g.createRadialGradient(32, 24, 2, 32, 24, 14);
  glow.addColorStop(0, '#fff6cf');
  glow.addColorStop(1, '#ffd35a');
  roundRect(g, 19, 15, 26, 18, 4, glow);
  roundRect(g, 10, 6, 44, 6, 3, '#2c3835', '#1c2422', 2);
}

function signHD(label) {
  return (g) => {
    groundShadow(g, 32, 90, 14, 5);
    roundRect(g, 28, 44, 8, 46, 2, woodGrad(g, 28, 0, 36, 0), WOOD.line, 2);
    roundRect(g, 4, 10, 56, 38, 5, woodGrad(g, 0, 10, 0, 48), WOOD.line, 2.5);
    if (label) signText(g, label, 32, 30, 15, '#4a2c17');
    else { roundRect(g, 12, 22, 40, 4, 2, 'rgba(90,55,25,0.5)'); roundRect(g, 12, 32, 30, 4, 2, 'rgba(90,55,25,0.5)'); }
  };
}

function holeSignHD(g) {
  groundShadow(g, 32, 90, 13, 5);
  ellipse(g, 32, 86, 9, 4, '#3a3a3a');
  roundRect(g, 29, 40, 6, 46, 2, '#5e4632', '#3a2a1c', 2);
  roundRect(g, 6, 6, 52, 36, 5, '#4e3a2a', '#2e2218', 2.5);
  roundRect(g, 10, 10, 44, 28, 3, '#5e4632');
  signText(g, 'HOLE', 32, 24, 14, '#ecdcb0');
}

function barrelHD(g) {
  groundShadow(g, 32, 76, 22, 6);
  roundRect(g, 12, 18, 40, 56, 10, woodGrad(g, 12, 0, 52, 0), WOOD.line, 2.5);
  for (const y of [28, 56]) roundRect(g, 11, y, 42, 6, 2, '#6a6a76', '#3a3a44', 1.5);
  ellipse(g, 32, 18, 20, 7, '#d69c5c', WOOD.line, 2);
}

function crateHD(g) {
  groundShadow(g, 32, 58, 28, 6);
  roundRect(g, 8, 12, 48, 44, 4, woodGrad(g, 8, 12, 8, 56), WOOD.line, 2.5);
  g.strokeStyle = WOOD.dark;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(12, 16); g.lineTo(52, 52); g.moveTo(52, 16); g.lineTo(12, 52);
  g.stroke();
  roundRect(g, 8, 12, 48, 44, 4, null, WOOD.line, 2.5);
}

function umbrellaHD(g) {
  groundShadow(g, 64, 120, 40, 9);
  roundRect(g, 61, 46, 6, 74, 3, '#eeeeee', '#8a8a96', 1.5);
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
    g.beginPath();
    g.moveTo(64, 40);
    g.ellipse(64, 40, 58, 32, 0, a0, a1);
    g.closePath();
    g.fillStyle = i % 2 ? '#f6f6f6' : '#e84a40';
    g.fill();
  }
  const sh = g.createLinearGradient(0, 8, 0, 72);
  sh.addColorStop(0, 'rgba(255,255,255,0.25)');
  sh.addColorStop(1, 'rgba(0,0,0,0.18)');
  ellipse(g, 64, 40, 58, 32, sh, '#7a2a24', 2.5);
  circle(g, 64, 40, 4, '#eeeeee', '#8a8a96', 1.5);
}

function deckChairHD(g) {
  groundShadow(g, 32, 92, 24, 6);
  roundRect(g, 10, 10, 44, 78, 6, '#c98f52', WOOD.line, 2.5);
  g.save();
  g.beginPath();
  g.roundRect(15, 14, 34, 70, 4);
  g.clip();
  for (let y = 14; y < 84; y += 12) { g.fillStyle = (y / 12) % 2 < 1 ? '#3fa0d8' : '#ffffff'; g.fillRect(15, y, 34, 6); g.fillStyle = (y / 12) % 2 < 1 ? '#ffffff' : '#3fa0d8'; g.fillRect(15, y + 6, 34, 6); }
  g.restore();
}

function shellHD(g) {
  g.save();
  g.translate(32, 38);
  for (let i = -3; i <= 3; i++) {
    g.beginPath();
    g.moveTo(0, 8);
    g.lineTo(i * 5 - 3, -12 + Math.abs(i) * 2);
    g.lineTo(i * 5 + 3, -12 + Math.abs(i) * 2);
    g.closePath();
    g.fillStyle = i % 2 ? '#f7c6c0' : '#f0a8a0';
    g.fill();
  }
  ellipse(g, 0, -4, 18, 13, null, '#b0605a', 2);
  roundRect(g, -6, 6, 12, 5, 2, '#e08f86', '#b0605a', 1.5);
  g.restore();
}

function starfishHD(g) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 7 : 20;
    g.lineTo(32 + Math.cos(a) * r, 36 + Math.sin(a) * r);
  }
  g.closePath();
  const grd = g.createRadialGradient(32, 36, 2, 32, 36, 20);
  grd.addColorStop(0, '#ffc070');
  grd.addColorStop(1, '#f07a2a');
  g.fillStyle = grd;
  g.fill();
  g.strokeStyle = '#a04a18';
  g.lineWidth = 2;
  g.stroke();
}

function tikiHD(g) {
  groundShadow(g, 32, 124, 12, 4);
  roundRect(g, 27, 40, 10, 82, 3, woodGrad(g, 27, 0, 37, 0, { base: '#c4955a', light: '#e0b47a', dark: '#8a6232', line: '#5e3a20' }), '#5e3a20', 2);
  for (let y = 48; y < 120; y += 14) g.fillRect(27, y, 10, 2);
  roundRect(g, 20, 28, 24, 16, 4, '#8a5a32', '#5e3a20', 2);
  const fl = g.createRadialGradient(32, 18, 2, 32, 20, 14);
  fl.addColorStop(0, '#fff2a0');
  fl.addColorStop(0.5, '#ffb03a');
  fl.addColorStop(1, 'rgba(255,90,30,0.2)');
  g.beginPath();
  g.moveTo(32, 2);
  g.quadraticCurveTo(46, 18, 40, 28);
  g.lineTo(24, 28);
  g.quadraticCurveTo(18, 18, 32, 2);
  g.fillStyle = fl;
  g.fill();
}

function ballStatueHD(g) {
  groundShadow(g, 32, 124, 26, 6);
  roundRect(g, 12, 72, 40, 46, 4, woodGrad(g, 12, 0, 52, 0, { base: '#bdb6a8', light: '#ddd6c8', dark: '#9b9486', line: '#5e594f' }), '#5e594f', 2.5);
  roundRect(g, 8, 66, 48, 10, 3, '#d6d0c4', '#5e594f', 2);
  const grd = g.createRadialGradient(24, 34, 3, 32, 44, 24);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(1, '#bcc6d0');
  circle(g, 32, 42, 24, grd, '#6a7480', 2.5);
  const r = rng(9);
  for (let i = 0; i < 14; i++) circle(g, 18 + r() * 28, 28 + r() * 28, 1.6, 'rgba(140,150,165,0.6)');
}

function mailboxHD(g) {
  groundShadow(g, 32, 92, 14, 5);
  roundRect(g, 28, 44, 8, 48, 2, woodGrad(g, 28, 0, 36, 0), WOOD.line, 2);
  roundRect(g, 10, 16, 44, 32, 14, '#3f7fd0', '#1f3a66', 2.5);
  roundRect(g, 44, 10, 4, 20, 1, '#e0483e', '#7a2018', 1.2);
  roundRect(g, 44, 10, 12, 8, 1, '#e0483e', '#7a2018', 1.2);
}

function picnicHD(g) {
  groundShadow(g, 64, 90, 58, 8);
  plank(g, 6, 8, 116, 14);
  plank(g, 12, 30, 104, 34);
  plank(g, 6, 70, 116, 14);
  g.save();
  g.beginPath();
  g.roundRect(30, 32, 68, 30, 3);
  g.clip();
  for (let y = 32; y < 62; y += 6) for (let x = 30; x < 98; x += 6) if (((x - 30) / 6 + (y - 32) / 6) % 2 === 0) { g.fillStyle = '#e0483e'; g.fillRect(x, y, 6, 6); }
  g.restore();
}

function starterBoardHD(g) {
  groundShadow(g, 64, 122, 48, 8);
  for (const x of [20, 100]) roundRect(g, x, 60, 8, 62, 2, woodGrad(g, x, 0, x + 8, 0), WOOD.line, 2);
  roundRect(g, 6, 14, 116, 62, 6, '#f6ecd0', '#5e3a20', 3);
  roundRect(g, 6, 14, 116, 14, { upperLeft: 6, upperRight: 6, lowerLeft: 0, lowerRight: 0 }, '#1f7a48');
  signText(g, 'PLAY', 52, 50, 24, '#1f7a48');
  g.strokeStyle = '#5a5a66';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(100, 36); g.lineTo(100, 66); g.stroke();
  g.beginPath();
  g.moveTo(102, 36); g.lineTo(114, 41); g.lineTo(102, 46); g.closePath();
  g.fillStyle = '#e0403a';
  g.fill();
  ellipse(g, 100, 67, 7, 3, '#222');
  circle(g, 22, 58, 6, '#ffffff', '#8a96a4', 1.5);
}

// ---------------------------------------------------------------- course
function teeHD(g) {
  roundRect(g, 4, 4, 56, 56, 6, '#178a4a', '#0f6a38', 2.5);
  const grd = g.createLinearGradient(0, 4, 0, 60);
  grd.addColorStop(0, 'rgba(255,255,255,0.12)');
  grd.addColorStop(1, 'rgba(0,0,0,0.08)');
  roundRect(g, 5, 5, 54, 54, 5, grd);
  for (const y of [18, 32, 46]) circle(g, 32, y, 3.5, '#0b2416');
}

function cupHD(g) {
  ellipse(g, 32, 33, 10, 9, '#262626');
  ellipse(g, 32, 34, 8, 7, '#060606');
}

function flagHD(n) {
  return (g) => {
    // pole base at (24, 112) in a 96x128 frame
    roundRect(g, 22, 18, 5, 96, 2, '#f4f4f4', '#9aa0aa', 1.2);
    g.beginPath();
    g.moveTo(27, 20);
    g.quadraticCurveTo(52, 24, 74, 34);
    g.quadraticCurveTo(52, 44, 27, 50);
    g.closePath();
    const grd = g.createLinearGradient(27, 20, 74, 50);
    grd.addColorStop(0, '#f45a50');
    grd.addColorStop(1, '#c8302a');
    g.fillStyle = grd;
    g.fill();
    g.strokeStyle = '#7a1f1a';
    g.lineWidth = 2;
    g.stroke();
    signText(g, String(n), 45, 35, 18, '#ffffff');
    circle(g, 24.5, 17, 4, '#ffd34a', '#c09010', 1.2);
  };
}

function bumperHD(lit) {
  return (g) => {
    groundShadow(g, 32, 50, 24, 8, 0.4);
    const outer = lit ? '#ffe066' : '#e84a4a';
    circle(g, 32, 32, 25, outer, lit ? '#8a6a10' : '#6a1a1a', 2.5);
    circle(g, 32, 32, 18, lit ? '#fff3b0' : '#f7f7f7');
    const grd = g.createRadialGradient(28, 27, 2, 32, 32, 12);
    grd.addColorStop(0, lit ? '#fff' : '#ff8a8a');
    grd.addColorStop(1, outer);
    circle(g, 32, 32, 12, grd);
  };
}

function boostHD(dir, f) {
  return (g) => {
    roundRect(g, 4, 4, 56, 56, 8, '#3b3b52', '#1d1d2a', 2.5);
    g.save();
    g.translate(32, 32);
    g.rotate([-Math.PI / 2, 0, Math.PI / 2, Math.PI][dir]);
    for (const [ox, on] of [[-10, f === 0], [6, f === 1]]) {
      g.beginPath();
      g.moveTo(ox - 6, -14);
      g.lineTo(ox + 8, 0);
      g.lineTo(ox - 6, 14);
      g.strokeStyle = on ? '#ffe066' : '#b89530';
      g.lineWidth = 6;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.stroke();
    }
    g.restore();
  };
}

function spinnerBaseHD(g) {
  groundShadow(g, 32, 40, 20, 10, 0.4);
  circle(g, 32, 32, 16, '#8a5a32', '#5e3a20', 2.5);
  circle(g, 32, 32, 10, '#c98f52');
}

function spinnerBladesHD(g) {
  for (const horiz of [true, false]) {
    g.save();
    g.translate(96, 96);
    if (!horiz) g.rotate(Math.PI / 2);
    roundRect(g, -84, -8, 168, 16, 6, '#f7f7f7', '#7a2a24', 2.5);
    for (let x = -84; x < 84; x += 32) { g.fillStyle = '#e0483e'; g.fillRect(x + 16, -6.5, 16, 13); }
    g.restore();
  }
  circle(g, 96, 96, 12, '#8a5a32', '#5e3a20', 2.5);
  circle(g, 96, 96, 5, '#e0a96a');
}

function ballHD(g) {
  const grd = g.createRadialGradient(13, 12, 1, 16, 16, 11);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.7, '#eef2f6');
  grd.addColorStop(1, '#b8c4d0');
  circle(g, 16, 16, 10, grd, '#6a7684', 1.5);
}

function ballShadowHD(g) {
  ellipse(g, 16, 8, 12, 5, 'rgba(0,0,0,0.35)');
}

// ---------------------------------------------------------------- building
function proShopHD(g) {
  groundShadow(g, 160, 308, 156, 12, 0.4);
  // walls: white clapboard
  roundRect(g, 16, 166, 288, 138, 4, '#f7f7f3', '#a8aaa0', 2.5);
  for (let y = 178; y < 298; y += 12) { g.fillStyle = '#dfe0d8'; g.fillRect(18, y, 284, 2.5); }
  g.fillStyle = 'rgba(0,0,0,0.06)';
  g.fillRect(250, 166, 54, 138);
  roundRect(g, 16, 292, 288, 12, 3, '#cfd0c8', '#a8aaa0', 2);
  // windows
  for (const x of [44, 220]) {
    roundRect(g, x, 206, 56, 48, 4, '#ecede6', '#a8aaa0', 2.5);
    const gl = g.createLinearGradient(x, 210, x + 50, 250);
    gl.addColorStop(0, '#c8ecfb');
    gl.addColorStop(1, '#7ccaee');
    roundRect(g, x + 5, 211, 46, 38, 3, gl);
    g.fillStyle = '#ecede6';
    g.fillRect(x + 26, 211, 4, 38);
    g.fillRect(x + 5, 228, 46, 4);
  }
  // door
  roundRect(g, 132, 206, 56, 98, 4, '#5e3b22', '#3a2412', 2.5);
  roundRect(g, 138, 212, 44, 92, 3, '#176a4a');
  roundRect(g, 144, 220, 32, 30, 3, '#1f845c');
  circle(g, 174, 262, 3.5, '#ffd34a', '#a07a10', 1);
  // roof: teal shingles
  g.save();
  g.beginPath();
  g.moveTo(40, 36);
  g.lineTo(280, 36);
  g.lineTo(314, 174);
  g.lineTo(6, 174);
  g.closePath();
  g.clip();
  g.fillStyle = '#1b6a5c';
  g.fillRect(0, 30, 320, 150);
  for (let row = 0; row < 12; row++) {
    const y = 36 + row * 12;
    for (let x = -20 + (row % 2) * 12; x < 330; x += 24) {
      const grd = g.createLinearGradient(0, y, 0, y + 12);
      grd.addColorStop(0, '#2e8e7e');
      grd.addColorStop(1, '#1d7264');
      roundRect(g, x + 1, y + 1, 22, 11, { upperLeft: 1, upperRight: 1, lowerLeft: 5, lowerRight: 5 }, grd);
    }
  }
  g.restore();
  g.beginPath();
  g.moveTo(40, 36); g.lineTo(280, 36); g.lineTo(314, 174); g.lineTo(6, 174); g.closePath();
  g.strokeStyle = '#11483f';
  g.lineWidth = 3;
  g.stroke();
  roundRect(g, 34, 28, 252, 12, 4, '#165a50', '#11483f', 2);
  // sign
  roundRect(g, 76, 150, 168, 40, 5, '#14653c', '#0c4426', 3);
  roundRect(g, 81, 155, 158, 30, 3, '#1a7a46');
  signText(g, 'PRO SHOP', 160, 171, 24, '#ffffff');
}

// ---------------------------------------------------------------- interior
function floorHD(kind) {
  return (g) => {
    if (kind === 'wood') {
      const r = rng(55);
      for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) {
        const x = col * 32 + (row % 2 ? 16 : 0), y = row * 16;
        const tones = ['#e2ab6c', '#d99f60', '#e6b276', '#dca464'];
        const base = tones[Math.floor(r() * 4)];
        const grd = g.createLinearGradient(0, y, 0, y + 16);
        grd.addColorStop(0, shade(base, 1.06));
        grd.addColorStop(1, shade(base, 0.94));
        g.fillStyle = grd;
        g.fillRect(x, y, 32, 16);
        g.strokeStyle = '#c08550';
        g.lineWidth = 1.5;
        g.strokeRect(x + 0.75, y + 0.75, 30.5, 14.5);
        g.strokeStyle = 'rgba(160,100,50,0.25)';
        g.beginPath();
        g.moveTo(x + 4, y + 6 + r() * 4); g.lineTo(x + 28, y + 6 + r() * 4);
        g.stroke();
      }
    } else if (kind === 'checker') {
      for (let y = 0; y < 64; y += 32) for (let x = 0; x < 64; x += 32) { g.fillStyle = ((x + y) / 32) % 2 ? '#1f7a48' : '#eef4e0'; g.fillRect(x, y, 32, 32); }
    } else if (kind === 'carpet') {
      speckle(g, 0, 0, 64, 64, '#357a5c', '#2c6a4f', '#3e8a68', 66, { grain: 2 });
    } else {
      for (let y = 0; y < 64; y += 32) for (let x = 0; x < 64; x += 32) {
        speckle(g, x, y, 32, 32, '#dcdcd8', '#cacac6', '#e6e6e2', x + y, { grain: 2, pd: 0.15, pl: 0.1 });
        g.strokeStyle = '#b8b8b4';
        g.lineWidth = 2;
        g.strokeRect(x + 1, y + 1, 30, 30);
      }
    }
  };
}

function wallHD(kind) {
  return (g) => {
    const top = { cream: '#e9f3da', stripe: '#e2f2d6', panel: '#a5683f', navy: '#26406a' }[kind];
    g.fillStyle = top;
    g.fillRect(0, 0, 64, 96);
    if (kind === 'stripe') for (let x = 0; x < 64; x += 16) { g.fillStyle = '#cfe8c0'; g.fillRect(x, 0, 8, 96); }
    if (kind === 'panel') for (let x = 0; x < 64; x += 32) { g.fillStyle = '#8a5634'; g.fillRect(x, 0, 3, 96); }
    if (kind === 'navy') speckle(g, 0, 0, 64, 96, top, '#203860', '#2f4a78', 7, { grain: 3, pd: 0.1, pl: 0.1 });
    // dark wood wainscot band + baseboard
    const grd = g.createLinearGradient(0, 96, 0, 120);
    grd.addColorStop(0, '#8a5634');
    grd.addColorStop(0.2, '#6b3f22');
    grd.addColorStop(1, '#5a321a');
    g.fillStyle = grd;
    g.fillRect(0, 96, 64, 24);
    g.fillStyle = '#4a2a16';
    g.fillRect(0, 120, 64, 8);
  };
}

function counterHD(g) {
  groundShadow(g, 96, 122, 92, 6);
  roundRect(g, 4, 36, 184, 84, 4, '#5e3820', '#3a2010', 2.5);
  roundRect(g, 4, 30, 184, 14, 4, '#7a4a2c', '#3a2010', 2.5);
  for (let x = 10; x < 182; x += 24) {
    roundRect(g, x, 54, 20, 26, 2, '#4a2a16');
    roundRect(g, x, 86, 20, 26, 2, '#4a2a16');
    roundRect(g, x + 4, 96, 12, 3, 1, '#6b4228');
  }
  ellipse(g, 56, 26, 18, 9, '#c8a06a', '#8a6a3a', 2);
  const r = rng(3);
  for (let i = 0; i < 12; i++) circle(g, 44 + r() * 24, 18 + r() * 10, 3.5, ['#ff5a5a', '#5ab0ff', '#ffd23a', '#7ad06a', '#ffffff'][i % 5], 'rgba(0,0,0,0.3)', 1);
  for (const [x, c] of [[150, '#e0483e'], [158, '#3fa0d8'], [166, '#6fbf5a'], [174, '#ffd34a']]) {
    g.strokeStyle = '#d8dce4'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x, 4); g.lineTo(x, 32); g.stroke();
    roundRect(g, x - 4, 0, 8, 6, 2, '#4a4a55');
    roundRect(g, x - 2, 24, 4, 8, 1, c);
  }
}

function shelfBallsHD(g) {
  roundRect(g, 4, 8, 120, 112, 4, '#8a5a32', '#5e3a20', 2.5);
  roundRect(g, 12, 16, 104, 96, 3, '#6b4426');
  const cols = ['#ffffff', '#ffe066', '#ff8ab0', '#8fd0f0', '#ff9a3a'];
  [22, 56, 90].forEach((y, row) => {
    roundRect(g, 12, y + 22, 104, 6, 2, '#b07a42', '#5e3a20', 1.5);
    for (let i = 0; i < 4; i++) {
      roundRect(g, 16 + i * 25, y, 21, 22, 3, cols[(i + row) % 5], '#3d2614', 1.5);
      roundRect(g, 20 + i * 25, y + 9, 13, 4, 1, '#5a5a66');
    }
  });
}

function clubRackHD(g) {
  groundShadow(g, 64, 122, 56, 6);
  roundRect(g, 8, 96, 112, 20, 4, woodGrad(g, 0, 96, 0, 116), WOOD.line, 2);
  roundRect(g, 8, 24, 112, 8, 3, WOOD.dark, WOOD.line, 2);
  for (let i = 0; i < 6; i++) {
    const x = 20 + i * 18;
    g.strokeStyle = '#c8ccd6'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 98); g.stroke();
    roundRect(g, x - 5, 8, 10, 10, 3, i % 2 ? '#3a3a44' : '#b8bcc4', '#22222a', 1.5);
    roundRect(g, x - 2, 82, 4, 16, 1, '#3a3a44');
  }
}

function bagStandHD(g) {
  groundShadow(g, 32, 122, 20, 5);
  for (const [x, y] of [[20, 10], [32, 4], [44, 14]]) {
    g.strokeStyle = '#c8ccd6'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x, 44); g.stroke();
    roundRect(g, x - 5, y, 10, 8, 3, '#3a3a44');
  }
  roundRect(g, 14, 38, 36, 82, 8, woodGrad(g, 14, 0, 50, 0, { base: '#d0483e', light: '#e8705a', dark: '#a8362e', line: '#4a1a16' }), '#4a1a16', 2.5);
  roundRect(g, 14, 62, 36, 8, 2, '#f3e6c4');
  roundRect(g, 14, 104, 36, 8, 2, '#3a3a44');
}

function trophyCaseHD(g) {
  groundShadow(g, 64, 122, 58, 6);
  roundRect(g, 6, 6, 116, 112, 5, '#7c4b26', '#3d2614', 2.5);
  const gl = g.createLinearGradient(14, 14, 110, 104);
  gl.addColorStop(0, '#e6f7fd');
  gl.addColorStop(1, '#a8daf0');
  roundRect(g, 14, 14, 100, 92, 3, gl);
  roundRect(g, 14, 58, 100, 5, 1, '#7c4b26');
  const trophy = (x, y) => {
    const gd = g.createLinearGradient(x - 10, 0, x + 10, 0);
    gd.addColorStop(0, '#ffe680');
    gd.addColorStop(1, '#d8a020');
    g.beginPath();
    g.moveTo(x - 11, y); g.lineTo(x + 11, y); g.quadraticCurveTo(x + 10, y + 16, x, y + 18); g.quadraticCurveTo(x - 10, y + 16, x - 11, y);
    g.fillStyle = gd; g.fill();
    roundRect(g, x - 3, y + 17, 6, 8, 1, '#d8a020');
    roundRect(g, x - 9, y + 25, 18, 5, 1, '#b08018');
  };
  trophy(38, 22); trophy(90, 22); trophy(64, 70);
}

function plantHD(g) {
  groundShadow(g, 32, 122, 20, 5);
  roundRect(g, 16, 88, 32, 32, { upperLeft: 2, upperRight: 2, lowerLeft: 8, lowerRight: 8 }, '#c86a3a', '#5a2a16', 2.5);
  roundRect(g, 12, 84, 40, 10, 3, '#e08a5a', '#5a2a16', 2);
  const P = [[32, 30, 14], [18, 50, 13], [46, 50, 13], [26, 70, 12], [40, 72, 12], [32, 52, 14]];
  puffs(g, P, { base: '#3e9a4a', light: '#6fc070', dark: '#22703a' }, 44, { density: 0.07 });
}

function rugHD(g, w, h, cols) {
  for (let i = 0; i < 7; i++) ellipse(g, w / 2, h / 2, w / 2 - 2 - i * (w / 16), h / 2 - 2 - i * (h / 16), cols[i % cols.length]);
  ellipse(g, w / 2, h / 2, w / 2 - 2, h / 2 - 2, null, shade(cols[0], 0.7), 2);
  // braid texture
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    g.setLineDash([3, 4]);
    ellipse(g, w / 2, h / 2, w / 2 - 6 - i * (w / 16), h / 2 - 6 - i * (h / 16), null, 'rgba(0,0,0,0.15)', 1);
  }
  g.setLineDash([]);
}

function armchairHD(g) {
  groundShadow(g, 32, 92, 28, 5);
  roundRect(g, 8, 10, 48, 40, 10, '#3a8f47', '#173f1f', 2.5);
  roundRect(g, 4, 40, 56, 44, 10, '#2f7d3c', '#173f1f', 2.5);
  roundRect(g, 14, 44, 36, 22, 6, '#46a356');
}

function coffeeTableHD(g) {
  groundShadow(g, 64, 90, 56, 6);
  roundRect(g, 6, 24, 116, 42, 6, woodGrad(g, 0, 24, 0, 66), WOOD.line, 2.5);
  for (const x of [12, 108]) roundRect(g, x, 64, 8, 22, 2, WOOD.dark, WOOD.line, 2);
  roundRect(g, 30, 34, 30, 20, 2, '#f3e6c4', '#a89a7a', 1.5);
  circle(g, 88, 44, 7, '#ffffff', '#a0a8b4', 1.5);
}

function mirrorHD(g) {
  groundShadow(g, 32, 122, 24, 5);
  roundRect(g, 8, 6, 48, 108, 8, '#c08a20', '#5a3a10', 2.5);
  roundRect(g, 13, 11, 38, 98, 5, '#ffd34a');
  const gl = g.createLinearGradient(16, 14, 48, 106);
  gl.addColorStop(0, '#eefaff');
  gl.addColorStop(1, '#9ccfe6');
  roundRect(g, 17, 15, 30, 90, 4, gl);
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(22, 30); g.lineTo(30, 22); g.moveTo(22, 46); g.lineTo(38, 30); g.stroke();
}

function indoorGreenHD(g) {
  // 4×3 tiles: practice green with a brick border, tee and cup
  const st = WALL_STYLES.rail_wood;
  roundRect(g, 2, 2, 252, 188, 8, st.grout);
  g.save();
  g.beginPath();
  g.roundRect(2, 2, 252, 188, 8);
  g.clip();
  for (let ty = 0; ty < 192; ty += 64) for (let tx = 0; tx < 256; tx += 64) {
    g.save();
    g.translate(tx, 0);
    drawBricks(g, st, 7 + tx + ty, ty, false);
    g.restore();
  }
  g.restore();
  g.save();
  g.beginPath();
  const x0 = 22, y0 = 22, x1 = 234, y1 = 170, c = 14;
  g.moveTo(x0 + c, y0); g.lineTo(x1 - c, y0); g.lineTo(x1, y0 + c); g.lineTo(x1, y1 - c); g.lineTo(x1 - c, y1); g.lineTo(x0 + c, y1); g.lineTo(x0, y1 - c); g.lineTo(x0, y0 + c); g.closePath();
  g.clip();
  stripes(g, 256, 192, '#88c43c', '#7ab433', 5);
  g.restore();
  roundRect(g, 168, 70, 40, 48, 5, '#178a4a', '#0f6a38', 2);
  for (const y of [82, 94, 106]) circle(g, 188, y, 3, '#0b2416');
  ellipse(g, 56, 96, 9, 8, '#060606', '#262626', 2);
}

function lockerDoorHD(g) {
  roundRect(g, 4, 0, 56, 112, 3, '#5e3b22', '#3a2412', 2.5);
  roundRect(g, 12, 8, 40, 104, 2, '#176a4a', '#0f4a32', 2);
  roundRect(g, 18, 16, 28, 34, 2, '#1f845c');
  circle(g, 44, 62, 3.5, '#ffd34a', '#a07a10', 1);
}

function lockerSignHD(g) {
  roundRect(g, 10, 4, 108, 56, 5, '#155f3e', '#0c3e28', 2.5);
  roundRect(g, 15, 9, 98, 46, 3, '#1c7a50');
  signText(g, 'LOCKER', 64, 22, 18, '#ffffff');
  signText(g, 'ROOM', 64, 42, 18, '#ffffff');
}

function posterHD(g) {
  roundRect(g, 8, 4, 48, 56, 3, '#f3e6c4', '#5e3a20', 2.5);
  const sky = g.createLinearGradient(0, 10, 0, 40);
  sky.addColorStop(0, '#8fd0f0'); sky.addColorStop(1, '#c8ecfb');
  roundRect(g, 13, 9, 38, 32, 2, sky);
  ellipse(g, 32, 40, 22, 9, '#4fbe5d');
  g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(36, 16); g.lineTo(36, 36); g.stroke();
  g.fillStyle = '#e0483e'; g.fillRect(37, 16, 8, 5);
  roundRect(g, 14, 46, 32, 3, 1, '#5a5a66');
  roundRect(g, 14, 52, 22, 3, 1, '#5a5a66');
}

function clockHD(g) {
  circle(g, 32, 32, 24, '#8a5a32', '#3d2614', 2.5);
  circle(g, 32, 32, 19, '#fffaf0');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; circle(g, 32 + Math.cos(a) * 15, 32 + Math.sin(a) * 15, 1.2, '#3a3a44'); }
  g.strokeStyle = '#3a3a44'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(32, 32); g.lineTo(32, 18); g.moveTo(32, 32); g.lineTo(42, 32); g.stroke();
}

function windowHD(g) {
  roundRect(g, 4, 4, 120, 56, 4, '#ffffff', '#5e3b20', 2.5);
  const gl = g.createLinearGradient(10, 10, 118, 56);
  gl.addColorStop(0, '#d6f2fd'); gl.addColorStop(1, '#8fd0f0');
  roundRect(g, 10, 10, 108, 44, 2, gl);
  g.fillStyle = '#ffffff';
  g.fillRect(62, 10, 4, 44);
  g.fillRect(10, 30, 108, 4);
}

function pennantHD(g) {
  roundRect(g, 8, 10, 4, 44, 1, '#8a5a32');
  g.beginPath(); g.moveTo(12, 12); g.lineTo(58, 26); g.lineTo(12, 40); g.closePath();
  g.fillStyle = '#2f7d3c'; g.fill();
  g.strokeStyle = '#173f1f'; g.lineWidth = 2; g.stroke();
  circle(g, 26, 26, 4, '#ffd34a');
}

function neonHD(g) {
  roundRect(g, 4, 6, 120, 52, 8, '#2a2440', '#111018', 2.5);
  g.shadowColor = '#ff6ac1';
  g.shadowBlur = 8;
  signText(g, 'OPEN', 64, 33, 26, '#ff8ad0');
  g.shadowBlur = 0;
}

function doorMatHD(g) {
  rugHD(g, 128, 64, ['#8a3a3e', '#a04a4e', '#7a3034']);
}

function lockersHD(g) {
  // 480×520 wardrobe backdrop: lockers over a tiled floor (shown at 1× in the UI)
  const H = 336;
  g.fillStyle = '#0d4a3e';
  g.fillRect(0, 0, 480, H);
  for (let i = 0; i < 5; i++) {
    const x = i * 96;
    const grd = g.createLinearGradient(x, 0, x + 96, 0);
    grd.addColorStop(0, '#1a7a66');
    grd.addColorStop(0.15, '#13665a');
    grd.addColorStop(1, '#0f5a4c');
    roundRect(g, x + 4, 24, 88, H - 30, 4, grd, '#0a3a30', 3);
    for (const vy of [64, 76, 88, 250, 262, 274]) roundRect(g, x + 22, vy, 52, 5, 2, '#2a9a80');
    roundRect(g, x + 28, 36, 40, 20, 3, '#ececE6', '#9a9a94', 1.5);
    signText(g, String(40 + i), x + 48, 47, 15, '#2a2a2a');
    roundRect(g, x + 72, 140, 8, 34, 3, '#2a3a36');
    circle(g, x + 76, 128, 6, '#2a3a36', '#1a2624', 1.5);
  }
  g.fillStyle = '#0a3a30';
  g.fillRect(0, H - 8, 480, 8);
  for (let y = H; y < 520; y += 60) for (let x = 0; x < 480; x += 60) {
    speckle(g, x, y, 60, 60, '#dcdcd8', '#cacac6', '#e8e8e4', x * 3 + y, { grain: 3, pd: 0.12, pl: 0.1 });
    g.strokeStyle = '#b4b4b0';
    g.lineWidth = 3;
    g.strokeRect(x + 1.5, y + 1.5, 57, 57);
  }
}

// ---------------------------------------------------------------- register
const add = (p, w, h, f) => ART.add(p, w, h, f);
add('assets/objects/bench.png', 128, 96, benchHD);
add('assets/objects/lamp.png', 64, 128, lampHD);
add('assets/objects/sign.png', 64, 96, signHD(''));
add('assets/objects/hole_sign.png', 64, 96, holeSignHD);
add('assets/objects/barrel.png', 64, 80, barrelHD);
add('assets/objects/crate.png', 64, 64, crateHD);
add('assets/objects/umbrella.png', 128, 128, umbrellaHD);
add('assets/objects/deck_chair.png', 64, 96, deckChairHD);
add('assets/objects/shell.png', 64, 64, shellHD);
add('assets/objects/starfish.png', 64, 64, starfishHD);
add('assets/objects/tiki_torch.png', 64, 128, tikiHD);
add('assets/objects/ball_statue.png', 64, 128, ballStatueHD);
add('assets/objects/mailbox.png', 64, 96, mailboxHD);
add('assets/objects/picnic_table.png', 128, 96, picnicHD);
add('assets/objects/starter_board.png', 128, 128, starterBoardHD);
add('assets/course/tee.png', 64, 64, teeHD);
add('assets/course/cup.png', 64, 64, cupHD);
ART.sheet('assets/course/flag.png', 96, 128, Array.from({ length: 18 }, (_, i) => flagHD(i + 1)));
ART.sheet('assets/course/bumper.png', 64, 64, [bumperHD(false), bumperHD(true)]);
ART.sheet('assets/course/boost.png', 64, 64, [0, 1, 2, 3].flatMap((d) => [boostHD(d, 0), boostHD(d, 1)]));
add('assets/course/spinner_base.png', 64, 64, spinnerBaseHD);
add('assets/course/spinner_blades.png', 192, 192, spinnerBladesHD);
add('assets/course/ball.png', 32, 32, ballHD);
add('assets/course/ball_shadow.png', 32, 16, ballShadowHD);
add('assets/buildings/proshop.png', 320, 320, proShopHD);
for (const k of ['wood', 'checker', 'carpet', 'tile']) add(`assets/interior/floor_${k}.png`, 64, 64, floorHD(k));
for (const k of ['cream', 'stripe', 'panel', 'navy']) add(`assets/interior/wall_${k}.png`, 64, 128, wallHD(k));
add('assets/interior/counter.png', 192, 128, counterHD);
add('assets/interior/shelf_balls.png', 128, 128, shelfBallsHD);
add('assets/interior/club_rack.png', 128, 128, clubRackHD);
add('assets/interior/bag_stand.png', 64, 128, bagStandHD);
add('assets/interior/trophy_case.png', 128, 128, trophyCaseHD);
add('assets/interior/potted_plant.png', 64, 128, plantHD);
add('assets/interior/rug.png', 192, 128, (g) => rugHD(g, 192, 128, ['#2f5e4a', '#3a6e58', '#28524a']));
add('assets/interior/armchair.png', 64, 96, armchairHD);
add('assets/interior/coffee_table.png', 128, 96, coffeeTableHD);
add('assets/interior/mirror.png', 64, 128, mirrorHD);
add('assets/interior/putting_mat.png', 256, 192, indoorGreenHD);
add('assets/interior/locker_door.png', 64, 112, lockerDoorHD);
add('assets/interior/sign_locker.png', 128, 64, lockerSignHD);
add('assets/interior/poster.png', 64, 64, posterHD);
add('assets/interior/clock.png', 64, 64, clockHD);
add('assets/interior/window.png', 128, 64, windowHD);
add('assets/interior/pennant.png', 64, 64, pennantHD);
add('assets/interior/neon_open.png', 128, 64, neonHD);
add('assets/interior/door_mat.png', 128, 64, doorMatHD);
add('assets/ui/lockers.png', 480, 520, lockersHD);

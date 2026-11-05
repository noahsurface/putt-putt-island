// Layered, tintable character art (16x32 frames).
//
// Every layer sheet has 9 frames: [down, side(right), up] x [stand, walkA, walkB].
// Layers are drawn in greyscale; the game multiplies them by the chosen colour
// (skin tone, hair colour, shirt colour...). Only the `face` layer is full colour.
import { Pix, save, sheet } from './pix.mjs';

const G = { O: '#505050', S: '#aaaaaa', M: '#d6d6d6', H: '#ffffff' };
const DIRS = ['down', 'side', 'up'];
const FRAMES = [0, 1, 2];

// ---------------------------------------------------------------- heads
const HEAD = {
  down: [
    '................',
    '................',
    '....OOOOOOOO....',
    '...OHHHHHHHHO...',
    '..OHHHHHHHHHHO..',
    '..OHHHHHHHHHHO..',
    '.OHHHHHHHHHHHHO.',
    '.OHHHHHHHHHHHHO.',
    '.OHHHHHHHHHHHHO.',
    '.OMHHHHHHHHHHMO.',
    '.OMMHHHHHHHHMMO.',
    '..OMMHHHHHHMMO..',
    '...OOMMMMMMOO...',
    '.....OOOOOO.....',
  ],
  side: [
    '................',
    '................',
    '....OOOOOOO.....',
    '...OHHHHHHHO....',
    '..OHHHHHHHHHO...',
    '..OHHHHHHHHHHO..',
    '.OHHHHHHHHHHHO..',
    '.OHHHHHHHHHHHHO.',
    '.OHHHHHHHHHHHHO.',
    '.OMHHHHHHHHHHO..',
    '.OMMHHHHHHHHHO..',
    '..OMMHHHHHHHO...',
    '...OOMMMMMMO....',
    '.....OOOOOO.....',
  ],
};
HEAD.up = HEAD.down;

const FACE = {
  down: { e: [[5, 8], [5, 9], [10, 8], [10, 9]], b: [[3, 10], [4, 10], [11, 10], [12, 10]] },
  side: { e: [[11, 8], [11, 9]], b: [[12, 10]] },
  up: { e: [], b: [] },
};

// ---------------------------------------------------------------- hair
const HAIR = {
  short: {
    down: [
      '................',
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHHO.',
      '.OHMMHHMHHMMHMO.',
      '.OMMMSMMSMMSMMO.',
      '.OMSO.OSO.OSOMO.',
      '.OSO........OSO.',
      '.OO..........OO.',
    ],
    side: [
      '................',
      '....OOOOOOO.....',
      '...OHHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHO..',
      '.OHMMHHMHHMMSO..',
      '.OMMMSMMSMSOO...',
      '.OMMMMSOO.......',
      '.OMMMSO.........',
      '.OSMSO..........',
      '..OSO...........',
      '...O............',
    ],
    up: [
      '................',
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHHO.',
      '.OHMMHHMHHMMHMO.',
      '.OMMMMMMMMMMMMO.',
      '.OMMSMMMMMMSMMO.',
      '.OSMMSMMMMSMMSO.',
      '.OSSMMSSSSMMSSO.',
      '.OOSSOSSSSOSSOO.',
      '...OO.OOOO.OO...',
    ],
  },
  spiky: {
    down: [
      '...O..O...O..O..',
      '..OHOOHO.OHOOHO.',
      '..OHHHHHOHHHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OHHMHHHHHHMHHO.',
      '.OHMMHHMHHMMHMO.',
      '.OMMSMMSMMSMMMO.',
      '.OMSOMSOOSMOSMO.',
      '.OSO.OO..OO.OSO.',
      '.OO..........OO.',
    ],
    side: [
      '..O..O..O.......',
      '.OHOOHOOHO......',
      '.OHHHHHHHHOO....',
      'OHHHHHHHHHHHO...',
      '.OHHMHHHHHHMHO..',
      'OHMMHHMHHMMSO...',
      '.OMMMSMMSMSOO...',
      'OMMMMMSOO.......',
      '.OMMMSO.........',
      '.OSMSO..........',
      '..OSO...........',
      '...O............',
    ],
    up: [
      '...O..O...O..O..',
      '..OHOOHO.OHOOHO.',
      '..OHHHHHOHHHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OHHMHHHHHHMHHO.',
      '.OHMMHHMHHMMHMO.',
      '.OMMMMMMMMMMMMO.',
      '.OMMSMMMMMMSMMO.',
      '.OSMMSMMMMSMMSO.',
      '.OSSMMSSSSMMSSO.',
      '.OOSSOSSSSOSSOO.',
      '...OO.OOOO.OO...',
    ],
  },
  long: {
    down: [
      '................',
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHHO.',
      '.OHMMHHMHHMMHMO.',
      '.OMMMMMMSMMMMMO.',
      'OMMSOSSO.OSSOSMO',
      'OMMO........OMMO',
      'OMMO........OMMO',
      'OMSO........OSMO',
      'OMSO........OSMO',
      'OSSO........OSSO',
      'OSSSO......OSSSO',
      '.OSSO......OSSO.',
      '..OO........OO..',
    ],
    side: [
      '................',
      '....OOOOOOO.....',
      '...OHHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHO..',
      '.OHMMHHMHHMMSO..',
      '.OMMMSMMSMSOO...',
      'OMMMMMMSOO......',
      'OMMMMMSO........',
      'OMMMMSO.........',
      'OMMMMSO.........',
      'OMSMMSO.........',
      'OSSMSSO.........',
      'OSSSSO..........',
      '.OSSO...........',
      '..OO............',
    ],
    up: [
      '................',
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHHO.',
      '.OHMMHHMHHMMHMO.',
      'OMMMMMMMMMMMMMMO',
      'OMMSMMMMMMMMSMMO',
      'OMMSMMMMMMMMSMMO',
      'OMSMMSMMMMSMMSMO',
      'OMSMMSMMMMSMMSMO',
      'OSSMMSMMMMSMMSSO',
      'OSSMSSMSSMSSMSSO',
      'OSSSSSSSSSSSSSSO',
      '.OSSOSSSSSSOSSO.',
      '..OO.OOOOOO.OO..',
    ],
  },
  ponytail: {
    down: [
      '................',
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHHO.',
      '.OHMMHHMHHMMHMO.',
      '.OMMMMSMMSMMMMO.',
      '.OMMSO.OO.OSMMO.',
      '.OMSO......OSMO.',
      '.OSO........OSO.',
      '.OO..........OO.',
    ],
    side: [
      '................',
      '....OOOOOOO.....',
      '...OHHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHO..',
      'OOHMMHHMHHMMSO..',
      'OHOMMSMMSMSOO...',
      'OMOMMMSOO.......',
      'OMMOMSO.........',
      'OMSOSO..........',
      'OSSO............',
      'OSSO............',
      '.OSO............',
      '..O.............',
    ],
    up: [
      '................',
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHHO.',
      '.OHMMHHMHHMMHMO.',
      '.OMMMMMMMMMMMMO.',
      '.OMMSMMMMMMSMMO.',
      '.OSMMSOOOOSMMSO.',
      '.OSSMOHHHHOMSSO.',
      '.OOSSOMMMMOSSOO.',
      '...OOOMMMMOOO...',
      '......OSSO......',
      '......OSSO......',
      '.......OO.......',
    ],
  },
  bob: {
    down: [
      '................',
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHHO.',
      '.OHMMHHMHHMMHMO.',
      '.OMMMMMMMMMMMMO.',
      '.OMMSSSSSSSSMMO.',
      '.OMMO......OMMO.',
      '.OMSO......OSMO.',
      '.OMSO......OSMO.',
      '.OSSO......OSSO.',
      '.OOOO......OOOO.',
    ],
    side: [
      '................',
      '....OOOOOOO.....',
      '...OHHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHO..',
      '.OHMMHHMHHMMSO..',
      '.OMMMMMMMSSSO...',
      '.OMMMMMMSO......',
      '.OMMMMMSO.......',
      '.OMMMMSO........',
      '.OMSMMSO........',
      '.OSSSSSO........',
      '.OOOOOO.........',
    ],
    up: [
      '................',
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHMHHHHHHMHHO.',
      '.OHMMHHMHHMMHMO.',
      '.OMMMMMMMMMMMMO.',
      '.OMMSMMMMMMSMMO.',
      '.OMMSMMMMMMSMMO.',
      '.OMSMMSMMSMMSMO.',
      '.OSMMSMMMMSMMSO.',
      '.OSSSSSSSSSSSSO.',
      '.OOOOOOOOOOOOOO.',
    ],
  },
  curly: {
    down: [
      '....OOOOOOOO....',
      '..OOHHMHHMHHOO..',
      '.OHHMHHHHHHMHHO.',
      'OHMHHHMHHMHHHMHO',
      'OHHMHHHHHHHHMHHO',
      'OMHHMHHMHHMHHMMO',
      'OMMSMMSMMSMMSMMO',
      'OMSOSO.OO.OSOSMO',
      'OMO..........OMO',
      'OSO..........OSO',
      '.O............O.',
    ],
    side: [
      '...OOOOOOOO.....',
      '.OOHHMHHMHHOO...',
      'OHHMHHHHHHMHHO..',
      'OMHHHMHHMHHHMHO.',
      'OHHMHHHHHHHHMHO.',
      'OMHHMHHMHHMHSO..',
      'OMMSMMSMSSOO....',
      'OMMMMSMSO.......',
      'OMSMMMSO........',
      'OSMMSSO.........',
      '.OSSO...........',
      '..OO............',
    ],
    up: [
      '....OOOOOOOO....',
      '..OOHHMHHMHHOO..',
      '.OHHMHHHHHHMHHO.',
      'OHMHHHMHHMHHHMHO',
      'OHHMHHHHHHHHMHHO',
      'OMHHMHHMHHMHHMMO',
      'OMMSMMSMMSMMSMMO',
      'OMSMMSMMSMMSMSMO',
      'OSMMSMMSMMSMMSSO',
      'OSSMSSMSSMSSMSSO',
      '.OSSOSSOSSOSSSO.',
      '..OO.OO.OO.OOO..',
    ],
  },
};

// ---------------------------------------------------------------- hats
const CAP = [
  '................',
  '....OOOOOOOO....',
  '...OHHHHHHHHO...',
  '..OHHHHMMHHHHO..',
  '..OHHHMMMMHHHO..',
  '.OMMMMMMMMMMMMO.',
];
const HATS = {
  cap: {
    oy: 0,
    down: [...CAP, 'OSSSSSSSSSSSSSSO', '.OOOOOOOOOOOOOO.'],
    side: [
      '................',
      '...OOOOOOOO.....',
      '..OHHHHHHHHO....',
      '.OHHHHMMHHHHO...',
      '.OHHHMMMMHHHO...',
      '.OMMMMMMMMMMOOO.',
      '.OSSSSSSSSSSSSSO',
      '..OOOOOOOOOOOOO.',
    ],
    up: [...CAP, '.OSSSSOOOOSSSSO.', '..OOOO....OOOO..'],
  },
  visor: {
    oy: 4,
    down: ['.OOOOOOOOOOOOOO.', '.OHHHHHHHHHHHHO.', 'OSSSSSSSSSSSSSSO', '.OOOOOOOOOOOOOO.'],
    side: ['.OOOOOOOOOOOO...', '.OHHHHHHHHHHOOO.', '.OSSSSSSSSSSSSSO', '..OOOOOOOOOOOOO.'],
    up: ['.OOOOOOOOOOOOOO.', '.OHHHHHHHHHHHHO.', '.OSSSSSSSSSSSSO.', '.OOOOOOOOOOOOOO.'],
  },
  bucket: {
    oy: 0,
    all: [
      '................',
      '....OOOOOOOO....',
      '...OHHHHHHHHO...',
      '..OHHHHHHHHHHO..',
      '..OHHMHHHHMHHO..',
      '..OMMMMMMMMMMO..',
      '.OSSSSSSSSSSSSO.',
      'OSMMMMMMMMMMMMSO',
      'OOOOOOOOOOOOOOOO',
    ],
  },
  beanie: {
    oy: -1,
    all: [
      '......OOOO......',
      '.....OHHHHO.....',
      '....OOOHHOOO....',
      '...OHHHHHHHHO...',
      '..OHHMHHHHMHHO..',
      '.OHHMMHHHHMMHHO.',
      '.OSMSMSMSMSMSMO.',
      '.OSSSSSSSSSSSSO.',
      '.OOOOOOOOOOOOOO.',
    ],
  },
  straw: {
    oy: -2,
    all: [
      '................',
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '...OMMMMMMMMO...',
      '..OSSSSSSSSSSO..',
      'OOHHHHHHHHHHHHOO',
      'OMMMMMMMMMMMMMMO',
      '.OOOOOOOOOOOOOO.',
    ],
  },
};

// ---------------------------------------------------------------- body parts
// A part is a rectangle (inclusive coords) or a set of rectangles that are
// outlined together. Each part is outlined and shaded on its own so arms,
// legs and torso stay readable as separate shapes.
function drawPart(target, rects, opts = {}) {
  const p = new Pix(16, 32);
  for (const [x0, y0, x1, y1] of rects) p.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, G.M);
  const edge = new Set();
  for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
    if (!p.alpha(x, y)) continue;
    const up = !p.alpha(x, y - 1) && !opts.openTop;
    const dn = !p.alpha(x, y + 1) && !opts.openBottom;
    if (up || dn || !p.alpha(x - 1, y) || !p.alpha(x + 1, y)) edge.add(y * 16 + x);
  }
  const out = p.clone();
  for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
    if (!p.alpha(x, y)) continue;
    if (edge.has(y * 16 + x)) { out.set(x, y, G.O); continue; }
    const lit = edge.has(y * 16 + x - 1) || edge.has((y - 1) * 16 + x);
    const dark = edge.has(y * 16 + x + 1) || edge.has((y + 1) * 16 + x);
    let c = lit && !dark ? G.H : dark && !lit ? G.S : G.M;
    if (opts.stripes && y % 2 === 0) c = G.S;
    out.set(x, y, c);
  }
  target.blit(out, 0, 0);
}

/** Geometry of the body for a direction/frame. */
function body(dir, f) {
  const bob = f === 0 ? 0 : 1;
  const sw = f === 1 ? 1 : f === 2 ? -1 : 0;
  if (dir === 'side') {
    const armLower = f === 1 ? [7, 19 + bob, 9, 21 + bob] : f === 2 ? [5, 19 + bob, 7, 21 + bob] : [6, 19 + bob, 8, 21 + bob];
    const legs = f === 0
      ? [[5, 22, 9, 28]]
      : f === 1 ? [[3, 22, 6, 27], [7, 22, 10, 28]] : [[4, 22, 7, 28], [6, 22, 9, 27]];
    const shoes = f === 0
      ? [[5, 28, 10, 30]]
      : f === 1 ? [[2, 27, 6, 29], [7, 28, 11, 30]] : [[4, 28, 8, 30], [6, 27, 10, 29]];
    return {
      bob,
      neck: [6, 13 + bob, 9, 14 + bob],
      torso: [4, 14 + bob, 10, 22 + bob],
      arms: [[[6, 15 + bob, 8, 18 + bob], armLower]],
      sleeves: (len) => [[[6, 15 + bob, 8, 14 + len + bob], ...(len > 4 ? [[armLower[0], armLower[1], armLower[2], Math.min(armLower[3], 14 + len + bob)]] : [])]],
      legs,
      shoes,
      waist: [4, 21 + bob, 10, 23 + bob],
    };
  }
  const legL = f === 1 ? [4, 22, 7, 27] : [4, 22, 7, 28];
  const legR = f === 2 ? [8, 22, 11, 27] : [8, 22, 11, 28];
  const shoeL = f === 1 ? [3, 27, 7, 29] : [3, 28, 7, 30];
  const shoeR = f === 2 ? [8, 27, 12, 29] : [8, 28, 12, 30];
  const armL = [1, 15 + bob + sw, 3, 21 + bob + sw];
  const armR = [12, 15 + bob - sw, 14, 21 + bob - sw];
  return {
    bob,
    neck: [6, 13 + bob, 9, 14 + bob],
    torso: [4, 14 + bob, 11, 22 + bob],
    arms: [[armL], [armR]],
    sleeves: (len) => [[[armL[0], armL[1], armL[2], armL[1] + len - 1]], [[armR[0], armR[1], armR[2], armR[1] + len - 1]]],
    legs: [legL, legR],
    shoes: [shoeL, shoeR],
    waist: [4, 21 + bob, 11, 23 + bob],
  };
}

function frame(dir, f, draw) {
  const p = new Pix(16, 32);
  draw(p, body(dir, f), dir, f);
  return p;
}

function layerSheet(draw) {
  const frames = [];
  for (const d of DIRS) for (const f of FRAMES) frames.push(frame(d, f, draw));
  return sheet(frames, 16, 32, 9);
}

function skinLayer() {
  return layerSheet((p, b, dir) => {
    for (const leg of b.legs) drawPart(p, [leg]);
    drawPart(p, [b.neck]);
    p.ascii(HEAD[dir], G, 0, b.bob);
  });
}

function faceLayer() {
  return layerSheet((p, b, dir) => {
    const f = FACE[dir];
    f.e.forEach(([x, y]) => p.set(x, y + b.bob, '#2b1d14'));
    f.b.forEach(([x, y]) => p.set(x, y + b.bob, '#ff8a8a70'));
  });
}

// Arms are their own (skin-tinted) layer so they can sit on top of the shirt
// torso in the side view; sleeves are a separate shirt-tinted layer on top.
function armsLayer() {
  return layerSheet((p, b) => {
    for (const arm of b.arms) drawPart(p, arm);
  });
}

function shirtLayer(style) {
  return layerSheet((p, b) => {
    drawPart(p, [b.torso], { stripes: style === 'striped' });
  });
}

function sleevesLayer(style) {
  return layerSheet((p, b) => {
    const len = style === 'long' ? 6 : 3;
    for (const s of b.sleeves(len)) drawPart(p, s, { stripes: style === 'striped' });
  });
}

function pantsLayer(style) {
  return layerSheet((p, b) => {
    if (style === 'skirt') {
      const rows = [];
      for (let y = b.waist[1]; y <= b.waist[1] + 5; y++) {
        const flare = Math.floor((y - b.waist[1]) / 2);
        rows.push([b.waist[0] - flare, y, b.waist[2] + flare, y]);
      }
      drawPart(p, rows);
      return;
    }
    for (const leg of b.legs) {
      const r = [...leg];
      if (style === 'shorts') r[3] = Math.min(r[3], 25);
      drawPart(p, [r], { openTop: true });
    }
    drawPart(p, [b.waist]);
  });
}

function shoesLayer() {
  return layerSheet((p, b) => {
    for (const s of b.shoes) drawPart(p, [s]);
  });
}

function hairLayer(style) {
  return layerSheet((p, b, dir) => {
    p.ascii(HAIR[style][dir], G, 0, b.bob);
  });
}

function hatLayer(style) {
  const h = HATS[style];
  return layerSheet((p, b, dir) => {
    p.ascii(h.all || h[dir], G, 0, (h.oy || 0) + b.bob);
  });
}

function shadowSprite() {
  const p = new Pix(16, 6);
  p.ellipse(8, 3, 6, 2, '#00000048');
  return p;
}

export const CHARACTER_OPTIONS = {
  hair: ['none', ...Object.keys(HAIR)],
  hat: ['none', ...Object.keys(HATS)],
  shirt: ['tee', 'long', 'striped', 'tank'],
  pants: ['shorts', 'long', 'skirt'],
};

export function generateCharacter() {
  save(skinLayer(), 'assets/character/body.png');
  save(faceLayer(), 'assets/character/face.png');
  save(shoesLayer(), 'assets/character/shoes.png');
  save(armsLayer(), 'assets/character/arms.png');
  save(shadowSprite(), 'assets/character/shadow.png');
  for (const s of CHARACTER_OPTIONS.shirt) {
    save(shirtLayer(s), `assets/character/shirt_${s}.png`);
    if (s !== 'tank') save(sleevesLayer(s), `assets/character/sleeves_${s}.png`);
  }
  for (const s of CHARACTER_OPTIONS.pants) save(pantsLayer(s), `assets/character/pants_${s}.png`);
  for (const s of Object.keys(HAIR)) save(hairLayer(s), `assets/character/hair_${s}.png`);
  for (const s of Object.keys(HATS)) save(hatLayer(s), `assets/character/hat_${s}.png`);
}

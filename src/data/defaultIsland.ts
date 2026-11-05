// Builds the starter island: beach, pond, paths, the Pro Shop and a 6-hole course.
import { IslandMap } from '../world/IslandMap';
import { OBJECTS } from './catalog';
import { Terrain, Wall } from './terrain';
import type { IslandData, PlacedObject, ShopData } from './types';

export const ISLAND_W = 80;
export const ISLAND_H = 60;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type R = [x: number, y: number, w: number, h: number];

interface HoleSpec {
  par: number;
  greens: R[];
  tee: [number, number];
  cup: [number, number];
  water?: R[];
  bunkers?: R[];
  objects?: { id: string; x: number; y: number; rot?: number }[];
  rail?: Wall;
}

const HOLES: HoleSpec[] = [
  // 1 — The Warm-Up: a straight shot to get the feel.
  { par: 2, greens: [[14, 20, 14, 3]], tee: [15, 21], cup: [26, 21] },
  // 2 — Dogleg Left: down the chute, then turn the corner past a bumper.
  {
    par: 3, greens: [[14, 26, 4, 12], [18, 34, 11, 4]], tee: [15, 27], cup: [27, 36],
    objects: [{ id: 'bumper', x: 21, y: 35 }], bunkers: [[14, 36, 2, 2]],
  },
  // 3 — The Windmill: time your putt through the spinning blades.
  { par: 3, greens: [[32, 40, 15, 5]], tee: [33, 42], cup: [45, 42], objects: [{ id: 'spinner', x: 39, y: 42 }], rail: Wall.RailBrick },
  // 4 — Bridge Over Water: a one-tile bridge across the pond.
  { par: 3, greens: [[50, 34, 15, 5]], tee: [51, 36], cup: [63, 36], water: [[56, 34, 2, 2], [56, 37, 2, 2]], rail: Wall.RailStone },
  // 5 — Boost Alley: ride the boost pads and dodge the bumpers.
  {
    par: 3, greens: [[50, 26, 15, 4]], tee: [51, 27], cup: [63, 28],
    objects: [
      { id: 'boost', x: 54, y: 27, rot: 1 }, { id: 'boost', x: 54, y: 28, rot: 1 },
      { id: 'bumper', x: 58, y: 26 }, { id: 'bumper', x: 60, y: 29 }, { id: 'bumper', x: 61, y: 27 },
    ],
  },
  // 6 — The Zig-Zag: a long par 4 finishing by the clubhouse.
  {
    par: 4, greens: [[32, 22, 13, 3], [41, 25, 4, 7], [32, 32, 13, 3]], tee: [33, 23], cup: [33, 33],
    bunkers: [[42, 32, 3, 1]], objects: [{ id: 'bumper', x: 37, y: 33 }], rail: Wall.RailBrick,
  },
];

export function createDefaultIsland(): IslandData {
  const W = ISLAND_W, H = ISLAND_H;
  const terrain = new Array(W * H).fill(Terrain.Water);
  const walls = new Array(W * H).fill(Wall.None);
  const cx = W / 2, cy = H / 2;
  const noise = (x: number, y: number) =>
    Math.sin(x * 0.45) * 0.04 + Math.cos(y * 0.5) * 0.04 + Math.sin((x + y) * 0.23) * 0.05 + Math.cos((x - y) * 0.31) * 0.03;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x + 0.5 - cx) / 37, (y + 0.5 - cy) / 27) + noise(x, y);
    terrain[y * W + x] = d < 0.86 ? Terrain.Grass : d < 1.0 ? Terrain.Sand : Terrain.Water;
  }
  const set = (x: number, y: number, t: Terrain) => { if (x >= 0 && y >= 0 && x < W && y < H) terrain[y * W + x] = t; };
  const fill = ([x, y, w, h]: R, t: Terrain) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, t); };

  // Pond in the north-east.
  for (let y = 15; y <= 21; y++) for (let x = 56; x <= 66; x++) {
    if (Math.hypot((x - 61) / 4.6, (y - 18) / 2.9) < 1) set(x, y, Terrain.Water);
  }

  // Paths
  fill([18, 17, 19, 2], Terrain.Dirt); // west path to the starter board
  fill([47, 17, 2, 31], Terrain.Dirt); // central north-south path
  fill([45, 17, 4, 2], Terrain.Dirt);
  fill([20, 47, 41, 2], Terrain.Dirt); // southern beach path
  fill([49, 31, 17, 2], Terrain.Dirt); // east path between holes 4 and 5
  fill([30, 24, 1, 23], Terrain.Dirt); // path between holes 2 and 6
  fill([36, 16, 9, 3], Terrain.Stone); // plaza in front of the shop

  const data: IslandData = {
    version: 1,
    name: 'Putt-Putt Island',
    width: W,
    height: H,
    terrain,
    walls,
    objects: [],
    course: { name: 'Island Classic', holes: [] },
  };

  // Course greens, hazards and rails.
  for (const h of HOLES) {
    const isGreen = new Set<number>();
    for (const g of h.greens) {
      fill(g, Terrain.Green);
      for (let y = g[1]; y < g[1] + g[3]; y++) for (let x = g[0]; x < g[0] + g[2]; x++) isGreen.add(y * W + x);
    }
    for (const b of h.bunkers ?? []) fill(b, Terrain.Bunker);
    for (const wtr of h.water ?? []) fill(wtr, Terrain.Water);
    // Rails on every cell touching the green (8-neighbourhood) that isn't green itself.
    for (const i of isGreen) {
      const gx = i % W, gy = Math.floor(i / W);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx, ny = gy + dy;
        const ni = ny * W + nx;
        if (isGreen.has(ni)) continue;
        if (terrain[ni] === Terrain.Water) continue;
        walls[ni] = h.rail ?? Wall.RailWood;
      }
    }
    data.course.holes.push({ tee: { x: h.tee[0], y: h.tee[1] }, cup: { x: h.cup[0], y: h.cup[1] }, par: h.par });
  }
  const map = new IslandMap(data);
  const place = (id: string, x: number, y: number, rot?: number) => map.placeObject(id, x, y, rot) === null;

  place('proshop', 38, 13);
  for (const h of HOLES) for (const o of h.objects ?? []) place(o.id, o.x, o.y, o.rot);
  place('starter_board', 15, 17);
  place('ball_statue', 45, 14);
  place('mailbox', 36, 15);
  place('tiki_torch', 36, 17);
  place('tiki_torch', 44, 17);
  place('bench', 58, 22);
  place('lamp', 46, 19);
  place('lamp', 46, 30);
  place('lamp', 46, 38);
  place('lamp', 28, 30);
  place('sign', 19, 16);
  place('bench', 31, 46);
  place('picnic_table', 24, 14);
  place('umbrella', 24, 52);
  place('deck_chair', 25, 52);
  place('deck_chair', 22, 52);
  place('umbrella', 56, 52);
  place('deck_chair', 57, 52);

  // Scatter nature with a fixed seed so the island is the same every time.
  const r = rng(20261105);
  const reserved = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const t = map.terrain(x + dx, y + dy);
      if (t === Terrain.Green || t === Terrain.Dirt || t === Terrain.Stone || t === Terrain.Bunker) return true;
      if (map.wall(x + dx, y + dy)) return true;
      if (map.standingAt(x + dx, y + dy)) return true;
    }
    return false;
  };
  const nearBeach = (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (map.terrain(x + dx, y + dy) === Terrain.Sand) return true;
    return false;
  };
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H);
    const t = map.terrain(x, y);
    const roll = r();
    if (t === Terrain.Sand) {
      if (roll < 0.03) place(r() < 0.5 ? 'shell' : 'starfish', x, y);
      else if (roll < 0.05 && !map.standingAt(x, y - 1) && !map.standingAt(x, y + 1)) place('tree_palm', x, y);
      continue;
    }
    if (t !== Terrain.Grass || reserved(x, y)) continue;
    if (nearBeach(x, y)) {
      if (roll < 0.12) place('tree_palm', x, y);
      else if (roll < 0.16) place('tall_grass', x, y);
      continue;
    }
    if (roll < 0.05) place(r() < 0.6 ? 'tree_oak' : 'tree_pine', x, y);
    else if (roll < 0.08) place(['flowers_red', 'flowers_yellow', 'flowers_blue', 'flowers_pink'][Math.floor(r() * 4)], x, y);
    else if (roll < 0.095) place(r() < 0.5 ? 'bush' : 'bush_berry', x, y);
    else if (roll < 0.1) place('rock', x, y);
    else if (roll < 0.11) place('tall_grass', x, y);
  }
  // Keep only valid objects (placeObject already validated) and sort for stable saves.
  data.objects = data.objects.filter((o: PlacedObject) => OBJECTS[o.id]);
  return data;
}

export function createDefaultShop(): ShopData {
  return {
    floor: 'wood',
    wall: 'cream',
    objects: [
      { id: 'counter', x: 10, y: 3 },
      { id: 'shelf_balls', x: 1, y: 2 },
      { id: 'club_rack', x: 4, y: 2 },
      { id: 'trophy_case', x: 13, y: 2 },
      { id: 'potted_plant', x: 0, y: 8 },
      { id: 'potted_plant', x: 15, y: 8 },
      { id: 'bag_stand', x: 7, y: 2 },
      { id: 'mirror', x: 15, y: 5 },
      { id: 'rug', x: 6, y: 6 },
      { id: 'armchair', x: 2, y: 6 },
      { id: 'coffee_table', x: 2, y: 7 },
      { id: 'putting_mat', x: 11, y: 7 },
      { id: 'window', x: 2, y: 0 },
      { id: 'window', x: 12, y: 0 },
      { id: 'poster', x: 5, y: 0 },
      { id: 'clock', x: 8, y: 0 },
      { id: 'neon_open', x: 9, y: 0 },
      { id: 'pennant', x: 15, y: 0 },
    ],
  };
}

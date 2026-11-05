import { describe, expect, it } from 'vitest';
import { createDefaultIsland } from '../src/data/defaultIsland';
import { Terrain, Wall } from '../src/data/terrain';
import { BallSim } from '../src/world/golfPhysics';
import { IslandMap, T } from '../src/world/IslandMap';

describe('default island', () => {
  const map = new IslandMap(createDefaultIsland());

  it('has a pro shop and a 6-hole course', () => {
    expect(map.find('proshop')).toBeTruthy();
    expect(map.find('starter_board')).toBeTruthy();
    expect(map.playableHoles()).toHaveLength(6);
  });

  it('every tee and cup sits on open ground', () => {
    for (const h of map.playableHoles()) {
      expect(map.canMarkHole(h.tee.x, h.tee.y)).toBeNull();
      expect(map.canMarkHole(h.cup.x, h.cup.y)).toBeNull();
      expect(map.terrain(h.cup.x, h.cup.y)).toBe(Terrain.Green);
    }
  });

  it('the pro shop door is reachable on foot', () => {
    const door = map.doorCell(map.find('proshop')!)!;
    const feet = { x: door.x * T + 3, y: door.y * T + 8, w: 10, h: 5 };
    expect(map.blocksWalk(feet)).toBe(false);
    expect(map.blocksWalk({ ...feet, y: feet.y + T })).toBe(false);
  });

  it('a simple bot can finish every hole (no unwinnable holes)', () => {
    for (const h of map.playableHoles()) {
      const cup = { x: h.cup.x * T + 8, y: h.cup.y * T + 8 };
      // Aim along the walkable route: steer toward the next cell on a BFS path.
      const path = bfsPath(map, h.tee, h.cup);
      expect(path.length).toBeGreaterThan(0);
      const ball = new BallSim(h.tee.x * T + 8, h.tee.y * T + 8);
      let strokes = 0;
      let t = 0;
      while (!ball.holed && strokes < 40) {
        // Nearest point on the route (favouring later points on ties).
        let idx = 0, best = Infinity;
        path.forEach((p, i) => {
          const dd = Math.hypot(p.x * T + 8 - ball.x, p.y * T + 8 - ball.y);
          if (dd <= best) { best = dd; idx = i; }
        });
        // Aim at a point a few cells further along the route, straight at the cup when close.
        const target = path[Math.min(path.length - 1, idx + 3)];
        const tx = target.x * T + 8, ty = target.y * T + 8;
        const d = Math.hypot(cup.x - ball.x, cup.y - ball.y);
        const aim = d < 40 ? Math.atan2(cup.y - ball.y, cup.x - ball.x) : Math.atan2(ty - ball.y, tx - ball.x);
        const safe = { x: ball.x, y: ball.y };
        const inSand = map.terrainAtPx(ball.x, ball.y) === Terrain.Bunker;
        ball.hit(aim, inSand ? 0.7 : d < 40 ? 0.12 + d / 400 : 0.28);
        strokes++;
        let guard = 0;
        while (ball.moving && guard++ < 60 * 30) {
          const ev = ball.step(1 / 60, map, t, cup);
          t += 1 / 60;
          if (ev.some((e) => e.type === 'water')) ball.place(safe.x, safe.y);
        }
      }
      expect(ball.holed, `hole ${h.index + 1} finished in ${strokes}`).toBe(true);
    }
  });
});

describe('editing rules', () => {
  it('rejects objects on water and rails under objects', () => {
    const map = new IslandMap(createDefaultIsland());
    expect(map.placeObject('bench', 0, 0)).toMatch(/water/i);
    const shop = map.find('proshop')!;
    expect(map.setWall(shop.x, shop.y, Wall.RailWood)).toMatch(/Pro Shop/);
  });

  it('places, connects and removes rails', () => {
    const map = new IslandMap(createDefaultIsland());
    const spot = findGrass(map);
    expect(map.setWall(spot.x, spot.y, Wall.Hedge)).toBeNull();
    expect(map.setWall(spot.x + 1, spot.y, Wall.Hedge)).toBeNull();
    expect(map.wallMask(spot.x, spot.y) & 2).toBe(2); // connected east
    expect(map.removeAt(spot.x, spot.y)).toBe('Hedge');
    expect(map.wall(spot.x, spot.y)).toBe(Wall.None);
  });

  it('moves a hole tee and recomputes par', () => {
    const map = new IslandMap(createDefaultIsland());
    const h = map.holes[0];
    expect(h.par).toBe(2);
    expect(map.setHoleMarker(0, 'tee', { x: h.tee!.x + 1, y: h.tee!.y })).toBeNull();
    expect(map.holes[0].par).toBeUndefined();
    expect(map.playableHoles()[0].par).toBeGreaterThanOrEqual(2);
  });

  it('cannot cover the pro shop with water', () => {
    const map = new IslandMap(createDefaultIsland());
    const shop = map.find('proshop')!;
    expect(map.setTerrain(shop.x, shop.y, Terrain.Water)).not.toBeNull();
  });
});

function findGrass(map: IslandMap) {
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w - 1; x++) {
    if (map.terrain(x, y) === Terrain.Grass && map.terrain(x + 1, y) === Terrain.Grass && !map.objectAt(x, y) && !map.objectAt(x + 1, y) && !map.wall(x, y) && !map.wall(x + 1, y)) return { x, y };
  }
  throw new Error('no grass');
}

function bfsPath(map: IslandMap, a: { x: number; y: number }, b: { x: number; y: number }) {
  const prev = new Map<number, number>();
  const key = (x: number, y: number) => y * map.w + x;
  const q = [key(a.x, a.y)];
  prev.set(q[0], -1);
  for (let i = 0; i < q.length; i++) {
    const k = q[i];
    if (k === key(b.x, b.y)) break;
    const x = k % map.w, y = Math.floor(k / map.w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, nk = key(nx, ny);
      if (!map.inBounds(nx, ny) || prev.has(nk) || map.wall(nx, ny) || map.terrain(nx, ny) === Terrain.Water) continue;
      const o = map.standingAt(nx, ny);
      if (o && o.id !== 'boost') continue;
      prev.set(nk, k);
      q.push(nk);
    }
  }
  const out: { x: number; y: number }[] = [];
  let k = key(b.x, b.y);
  if (!prev.has(k)) return out;
  while (k !== -1) {
    out.unshift({ x: k % map.w, y: Math.floor(k / map.w) });
    k = prev.get(k)!;
  }
  return out;
}

// The island's data model: terrain grid, walls, placed objects and course holes,
// plus the queries the renderer, walking and golf physics need.
import { OBJECTS, objectDef, objectRects, type ObjectDef, type Rect } from '../data/catalog';
import { TERRAINS, Terrain, WALLS, Wall, wallRects } from '../data/terrain';
import type { HoleData, IslandData, PlacedObject, Point } from '../data/types';
import type { Collider, CourseQuery } from './golfPhysics';

export const T = 16;
export const MAX_HOLES = 18;
export const SPINNER_LEN = 20;

export type MapChange =
  | { type: 'terrain'; x: number; y: number }
  | { type: 'wall'; x: number; y: number }
  | { type: 'object-add'; obj: PlacedObject }
  | { type: 'object-remove'; obj: PlacedObject }
  | { type: 'holes' };

export interface PlayableHole {
  index: number; // 0-based hole slot
  tee: Point;
  cup: Point;
  par: number;
}

const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export class IslandMap implements CourseQuery {
  readonly data: IslandData;
  readonly w: number;
  readonly h: number;
  private standing: (PlacedObject | null)[];
  private ground: (PlacedObject | null)[];
  private colliders: Collider[][] = [];
  private listeners: ((c: MapChange) => void)[] = [];

  constructor(data: IslandData) {
    this.data = data;
    this.w = data.width;
    this.h = data.height;
    this.standing = new Array(this.w * this.h).fill(null);
    this.ground = new Array(this.w * this.h).fill(null);
    for (const o of data.objects) this.occupy(o, true);
    this.rebuildColliders();
  }

  onChange(fn: (c: MapChange) => void) {
    this.listeners.push(fn);
    return () => (this.listeners = this.listeners.filter((l) => l !== fn));
  }

  private emit(c: MapChange) {
    for (const l of this.listeners) l(c);
  }

  idx(x: number, y: number) {
    return y * this.w + x;
  }

  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  terrain(x: number, y: number): Terrain {
    return this.inBounds(x, y) ? this.data.terrain[this.idx(x, y)] : Terrain.Water;
  }

  wall(x: number, y: number): Wall {
    return this.inBounds(x, y) ? this.data.walls[this.idx(x, y)] : Wall.None;
  }

  wallMask(x: number, y: number) {
    let m = 0;
    DIRS.forEach(([dx, dy], i) => {
      if (this.wall(x + dx, y + dy) !== Wall.None) m |= 1 << i;
    });
    return m;
  }

  standingAt(x: number, y: number) {
    return this.inBounds(x, y) ? this.standing[this.idx(x, y)] : null;
  }

  groundAt(x: number, y: number) {
    return this.inBounds(x, y) ? this.ground[this.idx(x, y)] : null;
  }

  objectAt(x: number, y: number) {
    return this.standingAt(x, y) ?? this.groundAt(x, y);
  }

  private occupy(o: PlacedObject, on: boolean) {
    const def = OBJECTS[o.id];
    if (!def) return;
    const grid = def.ground ? this.ground : this.standing;
    for (let yy = 0; yy < def.h; yy++) for (let xx = 0; xx < def.w; xx++) {
      if (this.inBounds(o.x + xx, o.y + yy)) grid[this.idx(o.x + xx, o.y + yy)] = on ? o : null;
    }
  }

  // ------------------------------------------------------------- holes
  get holes(): HoleData[] {
    return this.data.course.holes;
  }

  hole(i: number): HoleData {
    while (this.data.course.holes.length <= i) this.data.course.holes.push({ tee: null, cup: null });
    return this.data.course.holes[i];
  }

  holeMarkerAt(x: number, y: number): { hole: number; kind: 'tee' | 'cup' } | null {
    const hs = this.data.course.holes;
    for (let i = 0; i < hs.length; i++) {
      if (hs[i].tee && hs[i].tee!.x === x && hs[i].tee!.y === y) return { hole: i, kind: 'tee' };
      if (hs[i].cup && hs[i].cup!.x === x && hs[i].cup!.y === y) return { hole: i, kind: 'cup' };
    }
    return null;
  }

  private trimHoles() {
    const hs = this.data.course.holes;
    while (hs.length && !hs[hs.length - 1].tee && !hs[hs.length - 1].cup) hs.pop();
  }

  canMarkHole(x: number, y: number): string | null {
    if (!this.inBounds(x, y)) return 'Off the map';
    if (TERRAINS[this.terrain(x, y)].hazard) return 'Not on water';
    if (this.wall(x, y)) return 'Blocked by a rail';
    const s = this.standingAt(x, y);
    if (s) return `Blocked by ${OBJECTS[s.id].name}`;
    return null;
  }

  setHoleMarker(i: number, kind: 'tee' | 'cup', p: Point): string | null {
    const err = this.canMarkHole(p.x, p.y);
    if (err) return err;
    const other = this.holeMarkerAt(p.x, p.y);
    if (other && !(other.hole === i && other.kind === kind)) return `Hole ${other.hole + 1} ${other.kind} is here`;
    this.hole(i)[kind] = { x: p.x, y: p.y };
    delete this.hole(i).par;
    this.emit({ type: 'holes' });
    return null;
  }

  removeHoleMarkerAt(x: number, y: number) {
    const m = this.holeMarkerAt(x, y);
    if (!m) return false;
    this.data.course.holes[m.hole][m.kind] = null;
    this.trimHoles();
    this.emit({ type: 'holes' });
    return true;
  }

  playableHoles(): PlayableHole[] {
    const out: PlayableHole[] = [];
    this.data.course.holes.forEach((h, index) => {
      if (h.tee && h.cup) out.push({ index, tee: h.tee, cup: h.cup, par: h.par ?? this.computePar(h.tee, h.cup) });
    });
    return out;
  }

  /** Par from the shortest walkable route between tee and cup (rails block, hazards don't count as route). */
  computePar(tee: Point, cup: Point): number {
    const dist = new Int32Array(this.w * this.h).fill(-1);
    const q: number[] = [this.idx(tee.x, tee.y)];
    dist[q[0]] = 0;
    const target = this.idx(cup.x, cup.y);
    for (let qi = 0; qi < q.length; qi++) {
      const cur = q[qi];
      if (cur === target) break;
      const cx = cur % this.w, cy = Math.floor(cur / this.w);
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.inBounds(nx, ny)) continue;
        const ni = this.idx(nx, ny);
        if (dist[ni] >= 0) continue;
        if (this.wall(nx, ny) || TERRAINS[this.terrain(nx, ny)].hazard) continue;
        const s = this.standingAt(nx, ny);
        if (s && !OBJECTS[s.id].special && OBJECTS[s.id].solid) continue;
        dist[ni] = dist[cur] + 1;
        q.push(ni);
      }
    }
    const L = dist[target];
    if (L < 0) return 3;
    if (L <= 12) return 2;
    if (L <= 24) return 3;
    if (L <= 36) return 4;
    return 5;
  }

  // ------------------------------------------------------------- editing
  canSetTerrain(x: number, y: number, t: Terrain): string | null {
    if (!this.inBounds(x, y)) return 'Off the map';
    const s = this.standingAt(x, y);
    if (s && OBJECTS[s.id].fixed) return `Can't dig under the ${OBJECTS[s.id].name}`;
    if (t === Terrain.Water) {
      if (s || this.groundAt(x, y)) return 'Remove the item first';
      if (this.wall(x, y)) return 'Remove the rail first';
      if (this.holeMarkerAt(x, y)) return 'Remove the tee/cup first';
    }
    return null;
  }

  setTerrain(x: number, y: number, t: Terrain): string | null {
    const err = this.canSetTerrain(x, y, t);
    if (err) return err;
    if (this.terrain(x, y) === t) return null;
    this.data.terrain[this.idx(x, y)] = t;
    this.rebuildColliders();
    this.emit({ type: 'terrain', x, y });
    return null;
  }

  canSetWall(x: number, y: number): string | null {
    if (!this.inBounds(x, y)) return 'Off the map';
    if (TERRAINS[this.terrain(x, y)].hazard) return 'Not on water';
    const s = this.standingAt(x, y);
    if (s) return `Blocked by ${OBJECTS[s.id].name}`;
    if (this.holeMarkerAt(x, y)) return 'A tee or cup is here';
    return null;
  }

  setWall(x: number, y: number, w: Wall): string | null {
    if (w !== Wall.None) {
      const err = this.canSetWall(x, y);
      if (err) return err;
    }
    if (this.wall(x, y) === w) return null;
    this.data.walls[this.idx(x, y)] = w;
    this.rebuildColliders();
    this.emit({ type: 'wall', x, y });
    return null;
  }

  canPlace(def: ObjectDef, x: number, y: number): string | null {
    for (let yy = 0; yy < def.h; yy++) for (let xx = 0; xx < def.w; xx++) {
      const cx = x + xx, cy = y + yy;
      if (!this.inBounds(cx, cy)) return 'Off the map';
      if (TERRAINS[this.terrain(cx, cy)].hazard) return 'Not on water';
      if (def.ground) {
        if (this.groundAt(cx, cy)) return 'Something is already here';
        if (this.standingAt(cx, cy)?.id === 'proshop') return 'Blocked by the Pro Shop';
      } else {
        const s = this.standingAt(cx, cy);
        if (s) return `Blocked by ${OBJECTS[s.id].name}`;
        if (this.wall(cx, cy)) return 'Blocked by a rail';
        if (this.holeMarkerAt(cx, cy) && def.solid) return 'A tee or cup is here';
      }
    }
    return null;
  }

  placeObject(id: string, x: number, y: number, rot = 0): string | null {
    const def = objectDef(id);
    const err = this.canPlace(def, x, y);
    if (err) return err;
    const o: PlacedObject = { id, x, y };
    if (def.special === 'boost') o.rot = rot;
    this.data.objects.push(o);
    this.occupy(o, true);
    this.rebuildColliders();
    this.emit({ type: 'object-add', obj: o });
    return null;
  }

  removeObject(o: PlacedObject) {
    const i = this.data.objects.indexOf(o);
    if (i < 0) return;
    this.data.objects.splice(i, 1);
    this.occupy(o, false);
    this.rebuildColliders();
    this.emit({ type: 'object-remove', obj: o });
  }

  /** Remove the top-most removable thing at a cell. Returns a description, or null. */
  removeAt(x: number, y: number): string | null {
    const s = this.standingAt(x, y);
    if (s && !OBJECTS[s.id].fixed) {
      this.removeObject(s);
      return OBJECTS[s.id].name;
    }
    if (this.removeHoleMarkerAt(x, y)) return 'Hole marker';
    const g = this.groundAt(x, y);
    if (g) {
      this.removeObject(g);
      return OBJECTS[g.id].name;
    }
    if (this.wall(x, y)) {
      const name = WALLS[this.wall(x, y) as Exclude<Wall, Wall.None>].name;
      this.setWall(x, y, Wall.None);
      return name;
    }
    return null;
  }

  // ------------------------------------------------------------- collision
  rebuildColliders() {
    const grid: Collider[][] = Array.from({ length: this.w * this.h }, () => []);
    const addTo = (c: Collider, x0: number, y0: number, x1: number, y1: number) => {
      for (let cy = Math.floor(y0 / T); cy <= Math.floor(y1 / T); cy++) {
        for (let cx = Math.floor(x0 / T); cx <= Math.floor(x1 / T); cx++) {
          if (this.inBounds(cx, cy)) grid[this.idx(cx, cy)].push(c);
        }
      }
    };
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const w = this.wall(x, y);
      if (!w) continue;
      const info = WALLS[w as Exclude<Wall, Wall.None>];
      for (const r of wallRects(info.thickness, this.wallMask(x, y))) {
        const c: Collider = { kind: 'rect', x: x * T + r.x, y: y * T + r.y, w: r.w, h: r.h, e: info.restitution };
        addTo(c, c.x, c.y, c.x + c.w, c.y + c.h);
      }
    }
    for (const o of this.data.objects) {
      const def = OBJECTS[o.id];
      if (!def || !def.solid) continue;
      const ox = o.x * T, oy = o.y * T;
      if (def.special === 'spinner') {
        const cx = ox + 8, cy = oy + 8;
        const c: Collider = { kind: 'spinner', x: cx, y: cy, len: SPINNER_LEN, thick: 2, phase: (o.x * 0.7 + o.y * 1.3) % Math.PI, omega: 1.5, tag: o };
        addTo(c, cx - SPINNER_LEN - 2, cy - SPINNER_LEN - 2, cx + SPINNER_LEN + 2, cy + SPINNER_LEN + 2);
        const hub: Collider = { kind: 'circle', x: cx, y: cy, r: 4, e: 0.6, tag: o };
        addTo(hub, cx - 4, cy - 4, cx + 4, cy + 4);
      } else if (def.circle) {
        const c: Collider = { kind: 'circle', x: ox + def.circle.x, y: oy + def.circle.y, r: def.circle.r, e: def.special === 'bumper' ? 0.9 : 0.6, bumper: def.special === 'bumper', tag: o };
        addTo(c, c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r);
      } else {
        for (const r of objectRects(def)) {
          const c: Collider = { kind: 'rect', x: ox + r.x, y: oy + r.y, w: r.w, h: r.h, e: 0.55 };
          addTo(c, c.x, c.y, c.x + c.w, c.y + c.h);
        }
      }
    }
    this.colliders = grid;
  }

  terrainAtPx(x: number, y: number): Terrain {
    return this.terrain(Math.floor(x / T), Math.floor(y / T));
  }

  collidersNear(x: number, y: number, r: number): Collider[] {
    const out = new Set<Collider>();
    for (let cy = Math.floor((y - r) / T); cy <= Math.floor((y + r) / T); cy++) {
      for (let cx = Math.floor((x - r) / T); cx <= Math.floor((x + r) / T); cx++) {
        if (this.inBounds(cx, cy)) for (const c of this.colliders[this.idx(cx, cy)]) out.add(c);
      }
    }
    return [...out];
  }

  boostAtPx(x: number, y: number) {
    const g = this.groundAt(Math.floor(x / T), Math.floor(y / T));
    if (!g || OBJECTS[g.id]?.special !== 'boost') return null;
    const d = DIRS[g.rot ?? 1];
    return { x: d[0], y: d[1] };
  }

  /** Is a walking body (feet box in world px) blocked? */
  blocksWalk(r: Rect): boolean {
    const x0 = Math.floor(r.x / T), x1 = Math.floor((r.x + r.w - 0.01) / T);
    const y0 = Math.floor(r.y / T), y1 = Math.floor((r.y + r.h - 0.01) / T);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      if (!this.inBounds(cx, cy) || !TERRAINS[this.terrain(cx, cy)].walkable) return true;
      for (const c of this.colliders[this.idx(cx, cy)]) {
        let b: Rect;
        if (c.kind === 'rect') b = c;
        else if (c.kind === 'circle') b = { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
        else continue; // spinner blades swing overhead
        if (r.x < b.x + b.w && r.x + r.w > b.x && r.y < b.y + b.h && r.y + r.h > b.y) return true;
      }
    }
    return false;
  }

  /** Object with an interaction whose footprint (or door) touches the cell. */
  interactableAt(x: number, y: number): PlacedObject | null {
    const s = this.standingAt(x, y);
    if (s && OBJECTS[s.id].interact) return s;
    return null;
  }

  doorCell(o: PlacedObject): Point | null {
    const d = OBJECTS[o.id].door;
    return d ? { x: o.x + d.x, y: o.y + d.y } : null;
  }

  find(id: string): PlacedObject | undefined {
    return this.data.objects.find((o) => o.id === id);
  }
}

// Draws an IslandMap into a Phaser scene and keeps it in sync with edits.
//
// All art is high resolution (ART_SCALE texture px per world unit); sprites are
// scaled down into world units so game logic keeps using 16-unit tiles.
import Phaser from 'phaser';
import { ART_SCALE } from '../config';
import { OBJECTS } from '../data/catalog';
import { TERRAIN_LAYERS, Terrain, WALLS, Wall } from '../data/terrain';
import type { PlacedObject } from '../data/types';
import { spinnerAngle } from './golfPhysics';
import { IslandMap, T, type MapChange } from './IslandMap';

let uid = 0;

export const DEPTH_GROUND = -50000;
export const DEPTH_TERRAIN = -90000;
/** World-unit scale for HD world textures. */
export const WS = 1 / ART_SCALE;
/** Texture px per tile. */
const TP = T * ART_SCALE;
/** Terrain is drawn into square canvas chunks of this many tiles (1024 px textures). */
const CHUNK = 16;
/** Flag pole base inside the 96×128 flag frame. */
export const FLAG_ORIGIN = { x: 24 / 96, y: 112 / 128 };

export function objectSpriteDepth(o: PlacedObject) {
  const def = OBJECTS[o.id];
  const bottom = (o.y + def.h) * T;
  return def.ground ? DEPTH_GROUND + bottom : bottom - 3;
}

export function spinnerPhase(o: PlacedObject) {
  return (o.x * 0.7 + o.y * 1.3) % Math.PI;
}

interface HoleSprites {
  tee?: Phaser.GameObjects.Image;
  cup?: Phaser.GameObjects.Image;
  flag?: Phaser.GameObjects.Sprite;
}

interface Chunk {
  key: string;
  tex: Phaser.Textures.CanvasTexture;
  img: Phaser.GameObjects.Image;
  cx: number;
  cy: number;
}

/** Corner frames in the *_corner sheets: NW, NE, SE, SW. */
const CORNERS: [number, number, number, number][] = [[0, -1, -1, 0], [0, -1, 1, 0], [0, 1, 1, 0], [0, 1, -1, 0]];

export class WorldRenderer {
  readonly scene: Phaser.Scene;
  readonly map: IslandMap;
  private layer: Phaser.GameObjects.Layer;
  private water: Phaser.GameObjects.TileSprite;
  private chunks: Chunk[] = [];
  private walls = new Map<number, Phaser.GameObjects.Image>();
  private corners = new Map<number, Phaser.GameObjects.Image[]>();
  private objects = new Map<PlacedObject, Phaser.GameObjects.GameObject[]>();
  private spinners = new Map<PlacedObject, Phaser.GameObjects.Image>();
  private boosts = new Map<PlacedObject, Phaser.GameObjects.Sprite>();
  private bumpers = new Map<PlacedObject, Phaser.GameObjects.Sprite>();
  private holeSprites: HoleSprites[] = [];
  private unsubscribe: () => void;
  showHoles = true;
  /** Highlight only this hole's flag (others dim) — used while playing. */
  focusHole: number | null = null;

  constructor(scene: Phaser.Scene, map: IslandMap, layer: Phaser.GameObjects.Layer) {
    this.scene = scene;
    this.map = map;
    this.layer = layer;
    const W = map.w * T, H = map.h * T;
    const pad = 900;
    this.water = scene.add.tileSprite(-pad, -pad, W + pad * 2, H + pad * 2, 'water', 0).setOrigin(0).setDepth(DEPTH_TERRAIN - 10).setTileScale(WS);
    layer.add(this.water);
    const id = uid++;
    for (let cy = 0; cy < Math.ceil(map.h / CHUNK); cy++) {
      for (let cx = 0; cx < Math.ceil(map.w / CHUNK); cx++) {
        const tw = Math.min(CHUNK, map.w - cx * CHUNK), th = Math.min(CHUNK, map.h - cy * CHUNK);
        const key = `terrain-${id}-${cx}-${cy}`;
        const tex = scene.textures.createCanvas(key, tw * TP, th * TP)!;
        const img = scene.add.image(cx * CHUNK * T, cy * CHUNK * T, key).setOrigin(0).setScale(WS).setDepth(DEPTH_TERRAIN);
        layer.add(img);
        this.chunks.push({ key, tex, img, cx, cy });
      }
    }
    this.redrawTerrain(0, 0, map.w - 1, map.h - 1);
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) { this.syncWall(x, y); this.syncCorners(x, y); }
    for (const o of map.data.objects) this.addObject(o);
    this.syncHoles();
    this.unsubscribe = map.onChange((c) => this.onChange(c));
  }

  private onChange(c: MapChange) {
    switch (c.type) {
      case 'terrain':
        this.redrawTerrain(c.x - 1, c.y - 1, c.x + 1, c.y + 1);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this.syncCorners(c.x + dx, c.y + dy);
        break;
      case 'wall':
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx || !dy) this.syncWall(c.x + dx, c.y + dy);
          this.syncCorners(c.x + dx, c.y + dy);
        }
        break;
      case 'object-add':
        this.addObject(c.obj);
        break;
      case 'object-remove':
        this.removeObject(c.obj);
        break;
      case 'holes':
        this.syncHoles();
        break;
    }
  }

  // ----------------------------------------------------------------- terrain
  redrawTerrain(x0: number, y0: number, x1: number, y1: number) {
    const m = this.map;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(m.w - 1, x1); y1 = Math.min(m.h - 1, y1);
    for (const ch of this.chunks) {
      const bx0 = ch.cx * CHUNK, by0 = ch.cy * CHUNK;
      const ax0 = Math.max(x0, bx0), ay0 = Math.max(y0, by0);
      const ax1 = Math.min(x1, bx0 + CHUNK - 1), ay1 = Math.min(y1, by0 + CHUNK - 1);
      if (ax0 > ax1 || ay0 > ay1) continue;
      const ctx = ch.tex.getContext();
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect((ax0 - bx0) * TP, (ay0 - by0) * TP, (ax1 - ax0 + 1) * TP, (ay1 - ay0 + 1) * TP);
      for (const L of TERRAIN_LAYERS) {
        const src = this.scene.textures.get(L.texture).getSourceImage() as HTMLImageElement;
        const cols = Math.floor(src.width / TP);
        const rows = Math.floor(src.height / TP);
        for (let y = ay0; y <= ay1; y++) for (let x = ax0; x <= ax1; x++) {
          if (!L.member(m.terrain(x, y))) continue;
          let mask = 0;
          if (m.inBounds(x, y - 1) && L.member(m.terrain(x, y - 1))) mask |= 1;
          if (m.inBounds(x + 1, y) && L.member(m.terrain(x + 1, y))) mask |= 2;
          if (m.inBounds(x, y + 1) && L.member(m.terrain(x, y + 1))) mask |= 4;
          if (m.inBounds(x - 1, y) && L.member(m.terrain(x - 1, y))) mask |= 8;
          const variant = (((x * 73856093) ^ (y * 19349663)) >>> 0) % rows;
          const frame = variant * 16 + mask;
          ctx.drawImage(src, (frame % cols) * TP, Math.floor(frame / cols) * TP, TP, TP, (x - bx0) * TP, (y - by0) * TP, TP, TP);
        }
      }
      ch.tex.refresh();
    }
  }

  // ----------------------------------------------------------------- walls
  private syncWall(x: number, y: number) {
    const m = this.map;
    if (!m.inBounds(x, y)) return;
    const i = m.idx(x, y);
    const w = m.wall(x, y);
    const existing = this.walls.get(i);
    if (!w) {
      existing?.destroy();
      this.walls.delete(i);
      return;
    }
    const info = WALLS[w as Exclude<Wall, Wall.None>];
    const mask = m.wallMask(x, y);
    if (existing && existing.texture.key === info.texture) {
      existing.setFrame(mask);
      return;
    }
    existing?.destroy();
    const img = this.scene.add.image(x * T, y * T - 8, info.texture, mask).setOrigin(0).setScale(WS).setDepth(y * T + 8 + info.thickness / 2);
    this.layer.add(img);
    this.walls.set(i, img);
  }

  /** Brick triangles filling a putting green's cut corners where it meets two borders. */
  private syncCorners(x: number, y: number) {
    const m = this.map;
    if (!m.inBounds(x, y)) return;
    const i = m.idx(x, y);
    for (const img of this.corners.get(i) ?? []) img.destroy();
    this.corners.delete(i);
    if (m.terrain(x, y) !== Terrain.Green || m.wall(x, y)) return;
    const imgs: Phaser.GameObjects.Image[] = [];
    CORNERS.forEach(([ax, ay, bx, by], frame) => {
      const wa = m.wall(x + ax, y + ay), wb = m.wall(x + bx, y + by);
      if (!wa || !wb) return;
      const key = `${WALLS[wa as Exclude<Wall, Wall.None>].texture}_corner`;
      if (!this.scene.textures.exists(key)) return;
      const img = this.scene.add.image(x * T, y * T, key, frame).setOrigin(0).setScale(WS).setDepth(DEPTH_GROUND - 1);
      this.layer.add(img);
      imgs.push(img);
    });
    if (imgs.length) this.corners.set(i, imgs);
  }

  // ----------------------------------------------------------------- objects
  private addObject(o: PlacedObject) {
    const def = OBJECTS[o.id];
    if (!def) return;
    const s = this.scene;
    const px = (o.x + def.w / 2) * T;
    const py = (o.y + def.h) * T + (def.offsetY ?? 0);
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (def.special === 'boost') {
      const spr = s.add.sprite(o.x * T, o.y * T, 'boost', (o.rot ?? 1) * 2).setOrigin(0).setScale(WS).setDepth(objectSpriteDepth(o));
      this.boosts.set(o, spr);
      parts.push(spr);
    } else if (def.special === 'bumper') {
      const spr = s.add.sprite(px, py, 'bumper', 0).setOrigin(0.5, 1).setScale(WS).setDepth(objectSpriteDepth(o));
      this.bumpers.set(o, spr);
      parts.push(spr);
    } else if (def.special === 'spinner') {
      const base = s.add.image(o.x * T, o.y * T, 'spinner_base').setOrigin(0).setScale(WS).setDepth(objectSpriteDepth(o));
      const blades = s.add.image(o.x * T + 8, o.y * T + 8, 'spinner_blades').setScale(WS).setDepth(o.y * T + 40);
      this.spinners.set(o, blades);
      parts.push(base, blades);
    } else {
      const img = s.add.image(px, py, def.texture).setOrigin(0.5, 1).setScale(WS).setDepth(objectSpriteDepth(o));
      parts.push(img);
    }
    for (const p of parts) this.layer.add(p);
    this.objects.set(o, parts);
  }

  private removeObject(o: PlacedObject) {
    for (const p of this.objects.get(o) ?? []) p.destroy();
    this.objects.delete(o);
    this.spinners.delete(o);
    this.boosts.delete(o);
    this.bumpers.delete(o);
  }

  objectSprites(o: PlacedObject) {
    return this.objects.get(o) ?? [];
  }

  flashBumper(o: unknown) {
    const spr = this.bumpers.get(o as PlacedObject);
    if (!spr) return;
    spr.setFrame(1);
    this.scene.tweens.add({ targets: spr, scaleX: WS * 1.25, scaleY: WS * 1.25, duration: 70, yoyo: true, onComplete: () => spr.setFrame(0) });
  }

  // ----------------------------------------------------------------- holes
  syncHoles() {
    for (const h of this.holeSprites) {
      h.tee?.destroy();
      h.cup?.destroy();
      h.flag?.destroy();
    }
    this.holeSprites = [];
    if (!this.showHoles) return;
    this.map.holes.forEach((h, i) => {
      const hs: HoleSprites = {};
      if (h.tee) {
        hs.tee = this.scene.add.image(h.tee.x * T, h.tee.y * T, 'tee').setOrigin(0).setScale(WS).setDepth(DEPTH_GROUND + h.tee.y * T);
        this.layer.add(hs.tee);
      }
      if (h.cup) {
        const cx = h.cup.x * T + 8, cy = h.cup.y * T + 8;
        hs.cup = this.scene.add.image(cx, cy, 'cup').setScale(WS).setDepth(DEPTH_GROUND + cy);
        hs.flag = this.scene.add.sprite(cx, cy + 1, 'flag', Math.min(17, i)).setOrigin(FLAG_ORIGIN.x, FLAG_ORIGIN.y).setScale(WS).setDepth(cy + 3);
        this.layer.add([hs.cup, hs.flag]);
      }
      this.holeSprites.push(hs);
    });
    this.applyFocus();
  }

  setFocusHole(i: number | null) {
    this.focusHole = i;
    this.applyFocus();
  }

  private applyFocus() {
    this.holeSprites.forEach((h, i) => {
      const dim = this.focusHole !== null && this.focusHole !== i;
      h.flag?.setAlpha(dim ? 0.35 : 1);
      h.tee?.setAlpha(dim ? 0.5 : 1);
    });
  }

  flagSprite(i: number) {
    return this.holeSprites[i]?.flag;
  }

  setShowHoles(v: boolean) {
    this.showHoles = v;
    this.syncHoles();
  }

  // ----------------------------------------------------------------- per-frame
  update(timeSec: number) {
    this.water.setFrame(Math.floor(timeSec * 2) % 4);
    for (const [o, blades] of this.spinners) blades.setRotation(spinnerAngle({ phase: spinnerPhase(o), omega: 1.5 }, timeSec));
    const f = Math.floor(timeSec * 6) % 2;
    for (const [o, spr] of this.boosts) spr.setFrame((o.rot ?? 1) * 2 + f);
  }

  destroy() {
    this.unsubscribe();
    for (const ch of this.chunks) this.scene.textures.remove(ch.key);
  }
}

// Draws an IslandMap into a Phaser scene and keeps it in sync with edits.
import Phaser from 'phaser';
import { OBJECTS } from '../data/catalog';
import { TERRAIN_LAYERS, WALLS, Wall } from '../data/terrain';
import type { PlacedObject } from '../data/types';
import { spinnerAngle } from './golfPhysics';
import { IslandMap, T, type MapChange } from './IslandMap';

let uid = 0;

export const DEPTH_GROUND = -50000;
export const DEPTH_TERRAIN = -90000;

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

export class WorldRenderer {
  readonly scene: Phaser.Scene;
  readonly map: IslandMap;
  private layer: Phaser.GameObjects.Layer;
  private water: Phaser.GameObjects.TileSprite;
  private terrainKey: string;
  private terrainTex: Phaser.Textures.CanvasTexture;
  private terrainImg: Phaser.GameObjects.Image;
  private walls = new Map<number, Phaser.GameObjects.Image>();
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
    this.water = scene.add.tileSprite(-pad, -pad, W + pad * 2, H + pad * 2, 'water', 0).setOrigin(0).setDepth(DEPTH_TERRAIN - 10);
    layer.add(this.water);
    this.terrainKey = `terrain-canvas-${uid++}`;
    this.terrainTex = scene.textures.createCanvas(this.terrainKey, W, H)!;
    this.terrainImg = scene.add.image(0, 0, this.terrainKey).setOrigin(0).setDepth(DEPTH_TERRAIN);
    layer.add(this.terrainImg);
    this.redrawTerrain(0, 0, map.w - 1, map.h - 1);
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) this.syncWall(x, y);
    for (const o of map.data.objects) this.addObject(o);
    this.syncHoles();
    this.unsubscribe = map.onChange((c) => this.onChange(c));
  }

  private onChange(c: MapChange) {
    switch (c.type) {
      case 'terrain':
        this.redrawTerrain(c.x - 1, c.y - 1, c.x + 1, c.y + 1);
        break;
      case 'wall':
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!dx || !dy) this.syncWall(c.x + dx, c.y + dy);
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
    const ctx = this.terrainTex.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T);
    for (const L of TERRAIN_LAYERS) {
      const tex = this.scene.textures.get(L.texture);
      const src = tex.getSourceImage() as HTMLImageElement;
      const cols = Math.floor(src.width / T);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!L.member(m.terrain(x, y))) continue;
        let mask = 0;
        if (m.inBounds(x, y - 1) && L.member(m.terrain(x, y - 1))) mask |= 1;
        if (m.inBounds(x + 1, y) && L.member(m.terrain(x + 1, y))) mask |= 2;
        if (m.inBounds(x, y + 1) && L.member(m.terrain(x, y + 1))) mask |= 4;
        if (m.inBounds(x - 1, y) && L.member(m.terrain(x - 1, y))) mask |= 8;
        const rows = Math.floor(src.height / T);
        const variant = (((x * 73856093) ^ (y * 19349663)) >>> 0) % rows;
        const frame = variant * 16 + mask;
        ctx.drawImage(src, (frame % cols) * T, Math.floor(frame / cols) * T, T, T, x * T, y * T, T, T);
      }
    }
    this.terrainTex.refresh();
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
    const img = this.scene.add.image(x * T, y * T - 8, info.texture, mask).setOrigin(0).setDepth(y * T + 8 + info.thickness / 2);
    this.layer.add(img);
    this.walls.set(i, img);
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
      const spr = s.add.sprite(o.x * T, o.y * T, 'boost', (o.rot ?? 1) * 2).setOrigin(0).setDepth(objectSpriteDepth(o));
      this.boosts.set(o, spr);
      parts.push(spr);
    } else if (def.special === 'bumper') {
      const spr = s.add.sprite(px, py, 'bumper', 0).setOrigin(0.5, 1).setDepth(objectSpriteDepth(o));
      this.bumpers.set(o, spr);
      parts.push(spr);
    } else if (def.special === 'spinner') {
      const base = s.add.image(o.x * T, o.y * T, 'spinner_base').setOrigin(0).setDepth(objectSpriteDepth(o));
      const blades = s.add.image(o.x * T + 8, o.y * T + 8, 'spinner_blades').setDepth(o.y * T + 40);
      this.spinners.set(o, blades);
      parts.push(base, blades);
    } else {
      const img = s.add.image(px, py, def.texture).setOrigin(0.5, 1).setDepth(objectSpriteDepth(o));
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
    this.scene.tweens.add({ targets: spr, scaleX: 1.25, scaleY: 1.25, duration: 70, yoyo: true, onComplete: () => spr.setFrame(0) });
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
        hs.tee = this.scene.add.image(h.tee.x * T, h.tee.y * T, 'tee').setOrigin(0).setDepth(DEPTH_GROUND + h.tee.y * T);
        this.layer.add(hs.tee);
      }
      if (h.cup) {
        const cx = h.cup.x * T + 8, cy = h.cup.y * T + 8;
        hs.cup = this.scene.add.image(cx, cy, 'cup').setDepth(DEPTH_GROUND + cy);
        hs.flag = this.scene.add.sprite(cx, cy + 1, 'flag', Math.min(17, i)).setOrigin(6 / 24, 28 / 32).setDepth(cy + 3);
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
    this.water.setFrame(Math.floor(timeSec * 3) % 4);
    this.water.tilePositionX = Math.sin(timeSec * 0.4) * 3;
    for (const [o, blades] of this.spinners) blades.setRotation(spinnerAngle({ phase: spinnerPhase(o), omega: 1.5 }, timeSec));
    const f = Math.floor(timeSec * 6) % 2;
    for (const [o, spr] of this.boosts) spr.setFrame((o.rot ?? 1) * 2 + f);
  }

  destroy() {
    this.unsubscribe();
    this.scene.textures.remove(this.terrainKey);
  }
}

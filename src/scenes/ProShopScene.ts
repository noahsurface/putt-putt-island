import Phaser from 'phaser';
import { GAME_HEIGHT, TILE } from '../config';
import { ICON } from '../data/assets';
import { OBJECTS, SHOP_FLOORS, SHOP_FURNITURE, SHOP_WALL_ITEMS, SHOP_WALLS, objectRects, type ObjectDef } from '../data/catalog';
import type { PlacedObject } from '../data/types';
import { Input } from '../systems/Input';
import { Save } from '../systems/Save';
import { Session } from '../systems/Session';
import { Sfx } from '../systems/Sfx';
import { EditorHud, type HudCategory } from '../ui/editorHud';
import { showControls } from '../ui/help';
import { IconGrid } from '../ui/iconGrid';
import { PromptBar, text, toast, type PromptItem } from '../ui/widgets';
import { CharacterSprite } from '../world/CharacterSprite';
import { BaseScene } from './BaseScene';

const ROOM_W = 16;
const ROOM_H = 11;
const WALL_ROWS = 2;
const DOOR = { x: 7, w: 2 };

type Mode = 'walk' | 'pad' | 'decorate' | 'modal';

const CATS: (HudCategory & { kind: 'furniture' | 'wall' | 'floor' | 'paper'; ids: string[] })[] = [
  { name: 'Furniture', kind: 'furniture', ids: SHOP_FURNITURE, tools: SHOP_FURNITURE.map((id) => ({ name: OBJECTS[id].name, icon: OBJECTS[id].texture })) },
  { name: 'Wall Decor', kind: 'wall', ids: SHOP_WALL_ITEMS, tools: SHOP_WALL_ITEMS.map((id) => ({ name: OBJECTS[id].name, icon: OBJECTS[id].texture })) },
  { name: 'Flooring', kind: 'floor', ids: SHOP_FLOORS, tools: SHOP_FLOORS.map((id) => ({ name: `${id[0].toUpperCase()}${id.slice(1)} Floor`, icon: `floor_${id}` })) },
  { name: 'Wallpaper', kind: 'paper', ids: SHOP_WALLS, tools: SHOP_WALLS.map((id) => ({ name: `${id[0].toUpperCase()}${id.slice(1)} Wallpaper`, icon: `wall_${id}` })) },
];

export class ProShopScene extends BaseScene {
  private mode: Mode = 'walk';
  private player!: CharacterSprite;
  private floorImgs: Phaser.GameObjects.Image[] = [];
  private wallImgs: Phaser.GameObjects.Image[] = [];
  private objSprites = new Map<PlacedObject, Phaser.GameObjects.Image>();
  private prompts!: PromptBar;
  private pad: IconGrid | null = null;
  private hud!: EditorHud;
  private cat = 0;
  private toolIdx = CATS.map(() => 0);
  private cursor = { x: 7, y: 5 };
  private cursorSprite!: Phaser.GameObjects.Sprite;
  private ghost: Phaser.GameObjects.Image | null = null;
  private footprint!: Phaser.GameObjects.Graphics;
  private t = 0;
  private style: boolean | null = null;
  private title!: Phaser.GameObjects.Text;

  constructor() {
    super('ProShop');
  }

  private get shop() {
    return Save.data.shop;
  }

  create() {
    this.setupLayers();
    this.mode = 'walk';
    this.pad = null;
    this.objSprites.clear();
    const cam = this.cameras.main;
    cam.setBackgroundColor('#1b1410');
    cam.centerOn((ROOM_W * TILE) / 2, (ROOM_H * TILE) / 2 + 6);

    // room frame
    const frame = this.w(this.add.graphics().setDepth(-9000));
    frame.fillStyle(0x3d2614, 1).fillRect(-6, -6, ROOM_W * TILE + 12, ROOM_H * TILE + 12);
    frame.fillStyle(0x5e3b20, 1).fillRect(-3, -3, ROOM_W * TILE + 6, ROOM_H * TILE + 6);
    frame.fillStyle(0x1b1410, 1).fillRect(DOOR.x * TILE, ROOM_H * TILE, DOOR.w * TILE, 8);
    this.w(this.add.image(DOOR.x * TILE, (ROOM_H - 1) * TILE, 'door_mat').setOrigin(0).setDepth(-7000));
    this.drawRoom();
    for (const o of this.shop.objects) this.addSprite(o);

    this.player = this.w(new CharacterSprite(this, (DOOR.x + 1) * TILE, (ROOM_H - 1) * TILE + 6, Save.data.characters[0]));
    this.player.setFacing('up');
    this.cursorSprite = this.w(this.add.sprite(0, 0, 'ui_cursor').setOrigin(0).setDepth(1e6).setVisible(false));
    this.footprint = this.w(this.add.graphics().setDepth(1e6 - 1));

    this.title = this.u(text(this, 24, 24, `${Save.data.island.name} Pro Shop`, 26, '#ffffff', { stroke: '#2a1a10', strokeThickness: 6, fontStyle: 'bold' }));
    this.hud = new EditorHud(this, this.ui, 'Shop Decorator', CATS);
    this.hud.setVisible(false);
    this.prompts = new PromptBar(this, this.ui);
    this.setWalkPrompts('');
  }

  private drawRoom() {
    for (const i of [...this.floorImgs, ...this.wallImgs]) i.destroy();
    this.floorImgs = [];
    this.wallImgs = [];
    for (let y = WALL_ROWS; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) {
      this.floorImgs.push(this.w(this.add.image(x * TILE, y * TILE, `floor_${this.shop.floor}`).setOrigin(0).setDepth(-8000)));
    }
    for (let x = 0; x < ROOM_W; x++) this.wallImgs.push(this.w(this.add.image(x * TILE, 0, `wall_${this.shop.wall}`).setOrigin(0).setDepth(-8000)));
  }

  private addSprite(o: PlacedObject) {
    const def = OBJECTS[o.id];
    const bottom = (o.y + def.h) * TILE;
    const depth = def.placement === 'shop-wall' ? -7500 : def.ground ? -7000 + bottom : bottom - 3;
    const img = this.w(this.add.image((o.x + def.w / 2) * TILE, bottom + (def.offsetY ?? 0), def.texture).setOrigin(0.5, 1).setDepth(depth));
    this.objSprites.set(o, img);
  }

  private setWalkPrompts(action: string) {
    const items: PromptItem[] = [];
    if (action) items.push({ btns: 'A', label: action });
    items.push({ btns: 'START', label: 'Shop menu' }, { btns: 'B', label: 'Hold to run' });
    this.prompts.set(items);
  }

  // ------------------------------------------------------------------ rules
  private solidRects() {
    const out: { x: number; y: number; w: number; h: number }[] = [];
    for (const o of this.shop.objects) {
      const def = OBJECTS[o.id];
      if (def.placement === 'shop-wall') continue;
      for (const r of objectRects(def)) out.push({ x: o.x * TILE + r.x, y: o.y * TILE + r.y, w: r.w, h: r.h });
    }
    return out;
  }

  private blocked(x: number, y: number) {
    const r = { x: x - 5, y: y - 4, w: 10, h: 5 };
    if (r.x < 0 || r.x + r.w > ROOM_W * TILE || r.y < WALL_ROWS * TILE + 4) return true;
    const inDoor = r.x >= DOOR.x * TILE && r.x + r.w <= (DOOR.x + DOOR.w) * TILE;
    if (r.y + r.h > ROOM_H * TILE && !inDoor) return true;
    return this.solidRects().some((b) => r.x < b.x + b.w && r.x + r.w > b.x && r.y < b.y + b.h && r.y + r.h > b.y);
  }

  private objectAt(x: number, y: number, wall: boolean) {
    return [...this.shop.objects].reverse().find((o) => {
      const d = OBJECTS[o.id];
      if ((d.placement === 'shop-wall') !== wall) return false;
      return x >= o.x && x < o.x + d.w && y >= o.y && y < o.y + d.h;
    });
  }

  private canPlace(def: ObjectDef, x: number, y: number): string | null {
    if (x < 0 || x + def.w > ROOM_W) return 'Doesn\'t fit there';
    if (def.placement === 'shop-wall') {
      if (y !== 0) return 'Wall decor goes on the wall';
      for (let xx = x; xx < x + def.w; xx++) if (this.objectAt(xx, 0, true)) return 'Something is already hanging there';
      return null;
    }
    if (y < WALL_ROWS || y + def.h > ROOM_H) return 'Place furniture on the floor';
    for (let yy = y; yy < y + def.h; yy++) for (let xx = x; xx < x + def.w; xx++) {
      if (def.solid && yy === ROOM_H - 1 && xx >= DOOR.x && xx < DOOR.x + DOOR.w) return 'Keep the doorway clear';
      const other = this.shop.objects.find((o) => {
        const d = OBJECTS[o.id];
        if (d.placement === 'shop-wall' || !!d.ground !== !!def.ground) return false;
        return xx >= o.x && xx < o.x + d.w && yy >= o.y && yy < o.y + d.h;
      });
      if (other) return `Blocked by ${OBJECTS[other.id].name}`;
    }
    const px = this.player.x, py = this.player.y;
    if (def.solid && px >= x * TILE - 5 && px <= (x + def.w) * TILE + 5 && py >= y * TILE && py <= (y + def.h) * TILE + 4) return 'You\'re standing there!';
    return null;
  }

  // ------------------------------------------------------------------ update
  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;
    this.prompts.update();
    this.player.tick(delta);
    if (this.isLeaving) return;
    if (this.mode === 'walk') this.updateWalk(dt);
    else if (this.mode === 'pad') this.pad?.update();
    else if (this.mode === 'decorate') this.updateDecorate();
  }

  private updateWalk(dt: number) {
    const mv = Input.move();
    const moving = Math.hypot(mv.x, mv.y) > 0.15;
    const p = this.player;
    if (moving) {
      const sp = Input.held('B') ? 110 : 66;
      const nx = p.x + mv.x * sp * dt, ny = p.y + mv.y * sp * dt;
      if (!this.blocked(nx, p.y)) p.x = nx;
      if (!this.blocked(p.x, ny)) p.y = ny;
      p.faceVector(mv.x, mv.y);
      p.setDepth(p.y);
    }
    p.setWalking(moving);
    if (p.y > ROOM_H * TILE + 2) {
      this.leave();
      return;
    }
    // interactions
    const v = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[p.facing];
    const fx = Math.floor((p.x + v[0] * 12) / TILE), fy = Math.floor((p.y - 3 + v[1] * 12) / TILE);
    const o = this.objectAt(fx, fy, false);
    const mirror = o && OBJECTS[o.id].interact === 'mirror';
    const counter = o && o.id === 'counter';
    this.setWalkPrompts(mirror ? 'Change outfit' : counter ? 'Ring the bell' : '');
    if (Input.pressed('A')) {
      if (mirror) this.go('Customize', { slot: 0, back: 'ProShop' });
      else if (counter) { Sfx.cup(); toast(this, this.ui, 'Ding! Welcome to the Pro Shop!'); }
    }
    if (Input.pressed('START') || Input.pressed('SELECT')) this.openPad();
  }

  private leave() {
    Sfx.door();
    const map = Session.map();
    const shop = map.find('proshop');
    if (shop) {
      const d = map.doorCell(shop)!;
      Session.spawn = { x: d.x * TILE + 8, y: (d.y + 1) * TILE + 10 };
    }
    this.go('Island');
  }

  private openPad() {
    Sfx.select();
    this.player.setWalking(false);
    this.mode = 'pad';
    this.prompts.set([{ btns: 'A', label: 'Open' }, { btns: 'B', label: 'Close' }]);
    this.pad = new IconGrid(this, this.ui, 'Shop Menu', [
      { icon: ICON.designer, label: 'Decorate\nShop', onSelect: () => { this.closePad(); this.enterDecorate(); } },
      { icon: ICON.customize, label: 'Customize\nGolfer', onSelect: () => this.go('Customize', { slot: 0, back: 'ProShop' }) },
      { icon: ICON.save, label: 'Save', onSelect: () => { this.closePad(); toast(this, this.ui, Save.save() ? 'Saved!' : 'Could not save'); } },
      { icon: ICON.controls, label: 'How to\nPlay', onSelect: () => { this.closePad(); this.mode = 'modal'; showControls(this, this.ui, () => (this.mode = 'walk')); } },
      { icon: ICON.home, label: 'Leave\nShop', onSelect: () => { this.closePad(); this.leave(); } },
    ], 3);
    this.pad.onClose = () => this.closePad();
  }

  private closePad() {
    this.pad?.destroy();
    this.pad = null;
    if (this.mode === 'pad') this.mode = 'walk';
    this.setWalkPrompts('');
  }

  // ------------------------------------------------------------------ decorate
  private enterDecorate() {
    this.mode = 'decorate';
    this.player.setWalking(false);
    this.cursor = { x: Phaser.Math.Clamp(Math.floor(this.player.x / TILE), 0, ROOM_W - 1), y: Phaser.Math.Clamp(Math.floor(this.player.y / TILE) - 1, 0, ROOM_H - 1) };
    this.cursorSprite.setVisible(true);
    this.hud.setVisible(true);
    this.title.setVisible(false);
    // Zoom out a touch so the room sits above the decorator HUD.
    this.cameras.main.setZoom(2.25).centerOn((ROOM_W * TILE) / 2, (ROOM_H * TILE) / 2 + 31);
    this.prompts.container.setY(GAME_HEIGHT - 204);
    this.refreshDecorate(true);
  }

  private exitDecorate() {
    this.mode = 'walk';
    this.cursorSprite.setVisible(false);
    this.ghost?.destroy();
    this.ghost = null;
    this.footprint.clear();
    this.hud.setVisible(false);
    this.title.setVisible(true);
    this.cameras.main.setZoom(3).centerOn((ROOM_W * TILE) / 2, (ROOM_H * TILE) / 2 + 6);
    this.prompts.container.setY(GAME_HEIGHT - 44);
    this.setWalkPrompts('');
    Save.save();
    toast(this, this.ui, 'Shop saved!');
  }

  private refreshDecorate(force = false) {
    const cat = CATS[this.cat];
    const id = cat.ids[this.toolIdx[this.cat]];
    const tool = cat.tools[this.toolIdx[this.cat]];
    const { x, y } = this.cursor;
    let sub = '';
    if (cat.kind === 'floor' || cat.kind === 'paper') sub = 'A: apply to the whole shop';
    else if (cat.kind === 'wall') sub = 'Hangs on the back wall';
    const under = this.objectAt(x, y, y < WALL_ROWS) ?? this.objectAt(x, y, false);
    if (under) sub += `${sub ? '   ·   ' : ''}Here: ${OBJECTS[under.id].name}`;
    if (force || this.style !== Input.isGamepadStyle()) {
      this.style = Input.isGamepadStyle();
      this.prompts.set([{ btns: 'A', label: cat.kind === 'floor' || cat.kind === 'paper' ? 'Apply' : 'Place' }, { btns: 'B', label: 'Remove' }, { btns: 'START', label: 'Done' }]);
    }
    this.hud.select(this.cat, this.toolIdx[this.cat], tool.name, sub, Input.isGamepadStyle());
    this.ghost?.destroy();
    this.ghost = null;
    this.footprint.clear();
    if (cat.kind === 'furniture' || cat.kind === 'wall') {
      const def = OBJECTS[id];
      const gy = cat.kind === 'wall' ? 0 : y;
      const err = this.canPlace(def, x, gy);
      this.ghost = this.w(this.add.image((x + def.w / 2) * TILE, (gy + def.h) * TILE + (def.offsetY ?? 0), def.texture).setOrigin(0.5, 1).setAlpha(0.7).setDepth(1e6 - 2));
      if (err) this.ghost.setTint(0xff7070);
      this.footprint.lineStyle(1, err ? 0xff5050 : 0xffffff, 0.9).strokeRect(x * TILE + 0.5, gy * TILE + 0.5, def.w * TILE - 1, def.h * TILE - 1);
    }
  }

  private updateDecorate() {
    const c = this.cursor;
    let changed = false;
    if (Input.repeat('LEFT') && c.x > 0) { c.x--; changed = true; }
    if (Input.repeat('RIGHT') && c.x < ROOM_W - 1) { c.x++; changed = true; }
    if (Input.repeat('UP') && c.y > 0) { c.y--; changed = true; }
    if (Input.repeat('DOWN') && c.y < ROOM_H - 1) { c.y++; changed = true; }
    this.cursorSprite.setPosition(c.x * TILE, c.y * TILE).setFrame(Math.floor(this.t * 3) % 2);
    if (Input.pressed('RT')) { this.cat = (this.cat + 1) % CATS.length; changed = true; Sfx.move(); }
    if (Input.pressed('LT')) { this.cat = (this.cat - 1 + CATS.length) % CATS.length; changed = true; Sfx.move(); }
    const n = CATS[this.cat].ids.length;
    if (Input.repeat('RB')) { this.toolIdx[this.cat] = (this.toolIdx[this.cat] + 1) % n; changed = true; Sfx.move(); }
    if (Input.repeat('LB')) { this.toolIdx[this.cat] = (this.toolIdx[this.cat] - 1 + n) % n; changed = true; Sfx.move(); }
    const cat = CATS[this.cat];
    const id = cat.ids[this.toolIdx[this.cat]];
    if (Input.pressed('A')) {
      changed = true;
      if (cat.kind === 'floor') { this.shop.floor = id; this.drawRoom(); Sfx.place(); }
      else if (cat.kind === 'paper') { this.shop.wall = id; this.drawRoom(); Sfx.place(); }
      else {
        const def = OBJECTS[id];
        const gy = cat.kind === 'wall' ? 0 : c.y;
        const err = this.canPlace(def, c.x, gy);
        if (err) { Sfx.error(); toast(this, this.ui, err, '#ffb0a0'); }
        else {
          const o = { id, x: c.x, y: gy };
          this.shop.objects.push(o);
          this.addSprite(o);
          Sfx.place();
        }
      }
    }
    if (Input.pressed('B')) {
      const o = this.objectAt(c.x, c.y, c.y < WALL_ROWS) ?? this.objectAt(c.x, c.y, false);
      if (o) {
        this.shop.objects.splice(this.shop.objects.indexOf(o), 1);
        this.objSprites.get(o)?.destroy();
        this.objSprites.delete(o);
        Sfx.erase();
        changed = true;
      }
    }
    if (Input.pressed('START') || Input.pressed('SELECT')) {
      Sfx.back();
      this.exitDecorate();
      return;
    }
    if (changed || this.style !== Input.isGamepadStyle()) this.refreshDecorate();
  }
}


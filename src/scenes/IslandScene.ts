import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, TILE, ZOOM } from '../config';
import { ICON } from '../data/assets';
import { ISLAND_CATEGORIES, OBJECTS, type DesignerTool } from '../data/catalog';
import { WALLS, Wall } from '../data/terrain';
import { Input } from '../systems/Input';
import { Save } from '../systems/Save';
import { Session } from '../systems/Session';
import { Sfx } from '../systems/Sfx';
import { EditorHud } from '../ui/editorHud';
import { showControls } from '../ui/help';
import { IconGrid } from '../ui/iconGrid';
import { PromptBar, text, toast, type PromptItem } from '../ui/widgets';
import { CharacterSprite } from '../world/CharacterSprite';
import { IslandMap } from '../world/IslandMap';
import { WorldRenderer } from '../world/WorldRenderer';
import { BaseScene } from './BaseScene';

type Mode = 'explore' | 'pad' | 'design' | 'modal';

const DIR_NAMES = ['North', 'East', 'South', 'West'];
const WALK = 72;
const RUN = 124;

export class IslandScene extends BaseScene {
  private map!: IslandMap;
  private worldView!: WorldRenderer;
  private player!: CharacterSprite;
  private mode: Mode = 'explore';
  private prompts!: PromptBar;
  private hint!: Phaser.GameObjects.Text;
  private place!: Phaser.GameObjects.Text;
  private pad: IconGrid | null = null;
  private t = 0;
  private stepTimer = 0;

  // designer state
  private hud!: EditorHud;
  private cat = 0;
  private toolIdx: number[] = ISLAND_CATEGORIES.map(() => 0);
  private rot = 1;
  private holeNum = 0;
  private cursor = { x: 0, y: 0 };
  private cursorSprite!: Phaser.GameObjects.Sprite;
  private ghost: Phaser.GameObjects.Image | null = null;
  private ghostKey = '';
  private footprint!: Phaser.GameObjects.Graphics;
  private lastPaint = '';
  private courseInfo!: Phaser.GameObjects.Text;
  private courseDirty = true;
  private unsub: (() => void) | null = null;

  constructor() {
    super('Island');
  }

  create() {
    this.setupLayers();
    this.mode = 'explore';
    this.pad = null;
    this.map = Session.map();
    this.worldView = new WorldRenderer(this, this.map, this.world);
    this.unsub = this.map.onChange(() => (this.courseDirty = true));
    this.events.once('shutdown', () => {
      this.worldView.destroy();
      this.unsub?.();
    });

    const spawn = Session.spawn ?? this.defaultSpawn();
    Session.spawn = null;
    this.player = this.w(new CharacterSprite(this, spawn.x, spawn.y, Save.data.characters[0]));
    this.player.setDepth(spawn.y);

    const cam = this.cameras.main;
    cam.setBounds(-TILE * 4, -TILE * 4, (this.map.w + 8) * TILE, (this.map.h + 8) * TILE);
    cam.startFollow(this.player, true, 0.12, 0.12);

    this.cursorSprite = this.w(this.add.sprite(0, 0, 'ui_cursor', 0).setOrigin(0).setDepth(1e6).setVisible(false));
    this.footprint = this.w(this.add.graphics().setDepth(1e6 - 1));

    this.hud = new EditorHud(this, this.ui, 'Island Designer', ISLAND_CATEGORIES);
    this.hud.setVisible(false);
    this.courseInfo = this.u(text(this, GAME_WIDTH - 20, 24, '', 20, '#ffffff', { stroke: '#2a1a10', strokeThickness: 5, align: 'right' }).setOrigin(1, 0));
    this.place = this.u(text(this, 24, 24, Save.data.island.name, 26, '#ffffff', { stroke: '#2a1a10', strokeThickness: 6, fontStyle: 'bold' }));
    this.hint = this.u(text(this, GAME_WIDTH / 2, 600, '', 24, '#ffffff', { stroke: '#2a1a10', strokeThickness: 6 }).setOrigin(0.5));
    this.prompts = new PromptBar(this, this.ui);
    this.setExplorePrompts();
    if (Save.fresh) {
      Save.fresh = false;
      Save.save();
      this.time.delayedCall(500, () => toast(this, this.ui, 'Welcome to Putt-Putt Island! Press START / Tab for your PuttPad.'));
    }
  }

  private defaultSpawn() {
    const shop = this.map.find('proshop');
    if (shop) {
      const d = this.map.doorCell(shop)!;
      return { x: d.x * TILE + 8, y: (d.y + 1) * TILE + 10 };
    }
    return { x: (this.map.w * TILE) / 2, y: (this.map.h * TILE) / 2 };
  }

  private setExplorePrompts() {
    this.prompts.set([
      { btns: 'START', label: 'PuttPad' },
      { btns: 'B', label: 'Hold to run' },
    ]);
  }

  // =================================================================== update
  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;
    this.worldView.update(this.t);
    this.prompts.update();
    this.player.tick(delta);
    if (this.courseDirty) this.refreshCourseInfo();

    switch (this.mode) {
      case 'explore':
        this.updateExplore(dt);
        break;
      case 'pad':
        this.pad?.update();
        break;
      case 'design':
        this.updateDesign();
        break;
      case 'modal':
        break;
    }
  }

  private refreshCourseInfo() {
    this.courseDirty = false;
    const holes = this.map.playableHoles();
    const par = holes.reduce((s, h) => s + h.par, 0);
    this.courseInfo.setText(holes.length ? `⛳ ${Save.data.island.course.name}\n${holes.length} holes · Par ${par}` : '⛳ No holes yet — build one in the Designer!');
  }

  // =================================================================== explore
  private feetRect(x: number, y: number) {
    return { x: x - 5, y: y - 4, w: 10, h: 5 };
  }

  private updateExplore(dt: number) {
    if (this.isLeaving) return;
    const mv = Input.move();
    const moving = Math.hypot(mv.x, mv.y) > 0.15;
    const speed = Input.held('B') ? RUN : WALK;
    if (moving) {
      const p = this.player;
      const dx = mv.x * speed * dt, dy = mv.y * speed * dt;
      if (!this.map.blocksWalk(this.feetRect(p.x + dx, p.y))) p.x += dx;
      else this.nudge(dx, 0);
      if (!this.map.blocksWalk(this.feetRect(p.x, p.y + dy))) p.y += dy;
      else this.nudge(0, dy);
      p.faceVector(mv.x, mv.y);
      p.walkRate = speed === RUN ? 12 : 8;
      p.setDepth(p.y);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        Sfx.step();
        this.stepTimer = speed === RUN ? 0.2 : 0.3;
      }
    }
    this.player.setWalking(moving);

    // Walk through the Pro Shop door.
    const shop = this.map.find('proshop');
    if (shop && mv.y < -0.3) {
      const d = this.map.doorCell(shop)!;
      const fx = Math.floor(this.player.x / TILE), fy = Math.floor((this.player.y - 3) / TILE);
      if (fx === d.x && fy === d.y) {
        this.enterShop();
        return;
      }
    }

    // What's in front of us?
    const f = this.facingCell();
    const obj = this.map.interactableAt(f.x, f.y);
    let hint = '';
    if (obj && OBJECTS[obj.id].interact === 'starter') hint = 'Play a round';
    if (obj && OBJECTS[obj.id].interact === 'proshop') hint = 'Enter the Pro Shop';
    const tee = this.map.holeMarkerAt(Math.floor(this.player.x / TILE), Math.floor((this.player.y - 3) / TILE));
    const holeHint = tee ? `Hole ${tee.hole + 1} ${tee.kind === 'tee' ? 'tee' : 'cup'}` : '';
    this.hint.setText(hint ? '' : holeHint);
    if (hint) {
      this.prompts.set([{ btns: 'A', label: hint }, { btns: 'START', label: 'PuttPad' }]);
      if (Input.pressed('A')) {
        Sfx.select();
        if (OBJECTS[obj!.id].interact === 'starter') this.startRound();
        else this.enterShop();
        return;
      }
    } else this.setExplorePrompts();

    if (Input.pressed('START') || Input.pressed('SELECT')) this.openPad();
  }

  /** Slide around corners when walking into the edge of an obstacle. */
  private nudge(dx: number, dy: number) {
    const p = this.player;
    for (const off of [2, -2, 4, -4]) {
      if (dx && !this.map.blocksWalk(this.feetRect(p.x + dx, p.y + off))) {
        p.y += Math.sign(off) * 0.8;
        return;
      }
      if (dy && !this.map.blocksWalk(this.feetRect(p.x + off, p.y + dy))) {
        p.x += Math.sign(off) * 0.8;
        return;
      }
    }
  }

  private facingCell() {
    const v = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.player.facing];
    return { x: Math.floor((this.player.x + v[0] * 12) / TILE), y: Math.floor((this.player.y - 3 + v[1] * 12) / TILE) };
  }

  private rememberSpawn() {
    Session.spawn = { x: this.player.x, y: this.player.y };
  }

  private enterShop() {
    Sfx.door();
    this.player.setWalking(false);
    this.go('ProShop');
  }

  private startRound() {
    this.rememberSpawn();
    if (!this.map.playableHoles().length) {
      toast(this, this.ui, 'Your course has no holes yet! Use the Island Designer.', COLORS.gold);
      return;
    }
    this.go('Join', { back: 'Island' });
  }

  // =================================================================== PuttPad
  private openPad() {
    Sfx.select();
    this.player.setWalking(false);
    this.mode = 'pad';
    this.hint.setText('');
    this.prompts.set([{ btns: 'A', label: 'Open' }, { btns: 'B', label: 'Close' }]);
    this.pad = new IconGrid(this, this.ui, 'PuttPad', [
      { icon: ICON.designer, label: 'Island\nDesigner', onSelect: () => { this.closePad(); this.enterDesign(); } },
      { icon: ICON.play, label: 'Play a\nRound', onSelect: () => { this.closePad(); this.startRound(); } },
      { icon: ICON.customize, label: 'Customize\nGolfer', onSelect: () => { this.rememberSpawn(); this.go('Customize', { slot: 0, back: 'Island' }); } },
      { icon: ICON.shop, label: 'Go to\nPro Shop', onSelect: () => { this.closePad(); this.enterShop(); } },
      { icon: ICON.save, label: 'Save\nIsland', onSelect: () => { this.closePad(); toast(this, this.ui, Save.save() ? 'Island saved!' : 'Could not save (storage full?)'); } },
      { icon: ICON.controls, label: 'How to\nPlay', onSelect: () => { this.closePad(); this.mode = 'modal'; showControls(this, this.ui, () => (this.mode = 'explore')); } },
      { icon: ICON.home, label: 'Title\nScreen', onSelect: () => { this.rememberSpawn(); Save.save(); this.go('Title'); } },
    ], 4);
    this.pad.onClose = () => this.closePad();
  }

  private closePad() {
    this.pad?.destroy();
    this.pad = null;
    if (this.mode === 'pad') this.mode = 'explore';
    this.setExplorePrompts();
  }

  // =================================================================== designer
  private get tool(): DesignerTool {
    return ISLAND_CATEGORIES[this.cat].tools[this.toolIdx[this.cat]];
  }

  private enterDesign() {
    this.mode = 'design';
    this.player.setWalking(false);
    const f = this.facingCell();
    this.cursor = { x: Phaser.Math.Clamp(f.x, 0, this.map.w - 1), y: Phaser.Math.Clamp(f.y, 0, this.map.h - 1) };
    this.cursorSprite.setVisible(true);
    this.cameras.main.startFollow(this.cursorSprite, true, 0.2, 0.2, -8, -8);
    this.hud.setVisible(true);
    this.place.setVisible(false);
    this.hint.setText('');
    this.prompts.container.setY(this.scale.height - 204);
    this.refreshGhost(true);
    this.refreshDesignHud();
  }

  private exitDesign() {
    this.mode = 'explore';
    this.cursorSprite.setVisible(false);
    this.ghost?.destroy();
    this.ghost = null;
    this.ghostKey = '';
    this.footprint.clear();
    this.hud.setVisible(false);
    this.place.setVisible(true);
    this.cameras.main.setZoom(ZOOM);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.prompts.container.setY(this.scale.height - 44);
    this.setExplorePrompts();
    Save.save();
    toast(this, this.ui, 'Island saved!');
  }

  private refreshDesignHud() {
    this.lastStyle = Input.isGamepadStyle();
    const tool = this.tool;
    let sub = '';
    if (tool.kind === 'tee' || tool.kind === 'cup') sub = `Hole ${this.holeNum + 1}   ·   X: change hole`;
    else if (tool.kind === 'object' && OBJECTS[tool.id].special === 'boost') sub = `Pushes ${DIR_NAMES[this.rot]}   ·   X: rotate`;
    else if (tool.kind === 'terrain' || tool.kind === 'wall') sub = 'Hold A and move to paint';
    const under = this.describeCell(this.cursor.x, this.cursor.y);
    if (under) sub = sub ? `${sub}   ·   Here: ${under}` : `Here: ${under}`;
    this.hud.select(this.cat, this.toolIdx[this.cat], tool.name, sub, Input.isGamepadStyle());
    const items: PromptItem[] = [
      { btns: 'A', label: 'Place' },
      { btns: 'B', label: 'Remove' },
    ];
    if (tool.kind === 'tee' || tool.kind === 'cup') items.push({ btns: 'X', label: 'Hole #' });
    if (tool.kind === 'object' && OBJECTS[tool.id].special === 'boost') items.push({ btns: 'X', label: 'Rotate' });
    items.push({ btns: 'Y', label: 'Zoom' }, { btns: 'START', label: 'Done' });
    this.prompts.set(items);
  }

  private describeCell(x: number, y: number): string {
    const m = this.map;
    const marker = m.holeMarkerAt(x, y);
    if (marker) return `Hole ${marker.hole + 1} ${marker.kind === 'tee' ? 'tee' : 'cup'}`;
    const o = m.objectAt(x, y);
    if (o) return OBJECTS[o.id].name;
    const w = m.wall(x, y);
    if (w) return WALLS[w as Exclude<Wall, Wall.None>].name;
    return '';
  }

  private updateDesign() {
    let moved = false;
    const c = this.cursor;
    if (Input.repeat('LEFT', undefined, 220, 60) && c.x > 0) { c.x--; moved = true; }
    if (Input.repeat('RIGHT', undefined, 220, 60) && c.x < this.map.w - 1) { c.x++; moved = true; }
    if (Input.repeat('UP', undefined, 220, 60) && c.y > 0) { c.y--; moved = true; }
    if (Input.repeat('DOWN', undefined, 220, 60) && c.y < this.map.h - 1) { c.y++; moved = true; }
    this.cursorSprite.setPosition(c.x * TILE, c.y * TILE).setFrame(Math.floor(this.t * 3) % 2);

    let changed = moved;
    const cats = ISLAND_CATEGORIES;
    if (Input.pressed('RT')) { this.cat = (this.cat + 1) % cats.length; changed = true; Sfx.move(); }
    if (Input.pressed('LT')) { this.cat = (this.cat - 1 + cats.length) % cats.length; changed = true; Sfx.move(); }
    const n = cats[this.cat].tools.length;
    if (Input.repeat('RB')) { this.toolIdx[this.cat] = (this.toolIdx[this.cat] + 1) % n; changed = true; Sfx.move(); }
    if (Input.repeat('LB')) { this.toolIdx[this.cat] = (this.toolIdx[this.cat] - 1 + n) % n; changed = true; Sfx.move(); }
    if (Input.pressed('X')) {
      const tool = this.tool;
      if (tool.kind === 'tee' || tool.kind === 'cup') this.holeNum = (this.holeNum + 1) % 18;
      else this.rot = (this.rot + 1) % 4;
      changed = true;
      Sfx.move();
    }
    if (Input.pressed('Y')) {
      const cam = this.cameras.main;
      cam.setZoom(cam.zoom === ZOOM ? 2 : ZOOM);
    }

    const key = `${c.x},${c.y}`;
    if (Input.pressed('A')) {
      this.applyTool(false);
      this.lastPaint = key;
      changed = true;
    } else if (Input.held('A') && moved && this.lastPaint !== key) {
      this.applyTool(true);
      this.lastPaint = key;
      changed = true;
    }
    if (Input.pressed('B') || (Input.held('B') && moved)) {
      const removed = this.map.removeAt(c.x, c.y);
      if (removed) {
        Sfx.erase();
        changed = true;
      }
    }
    if (!Input.held('A')) this.lastPaint = '';

    if (Input.pressed('START') || Input.pressed('SELECT')) {
      Sfx.back();
      this.exitDesign();
      return;
    }
    this.refreshGhost(changed);
    if (changed || this.lastStyle !== Input.isGamepadStyle()) this.refreshDesignHud();
  }

  private lastStyle: boolean | null = null;

  private applyTool(dragging: boolean) {
    const { x, y } = this.cursor;
    const tool = this.tool;
    let err: string | null = null;
    switch (tool.kind) {
      case 'terrain':
        err = this.map.setTerrain(x, y, tool.terrain);
        break;
      case 'wall':
        err = this.map.setWall(x, y, tool.wall);
        break;
      case 'object':
        if (dragging) return;
        err = this.map.placeObject(tool.id, x, y, this.rot);
        break;
      case 'tee':
      case 'cup':
        if (dragging) return;
        err = this.map.setHoleMarker(this.holeNum, tool.kind, { x, y });
        if (!err) toast(this, this.ui, `Hole ${this.holeNum + 1} ${tool.kind === 'tee' ? 'tee' : 'cup'} placed`);
        break;
    }
    if (err) {
      if (!dragging) {
        Sfx.error();
        toast(this, this.ui, err, '#ffb0a0');
      }
    } else Sfx.place();
  }

  /** Semi-transparent preview of the current tool under the cursor. */
  private refreshGhost(force: boolean) {
    const tool = this.tool;
    const { x, y } = this.cursor;
    const m = this.map;
    let key = '', frame = 0, px = x * TILE, py = y * TILE, ox = 0, oy = 0, fw = 1, fh = 1;
    let err: string | null = null;
    switch (tool.kind) {
      case 'terrain':
        key = tool.icon; frame = tool.frame ?? 0;
        err = m.canSetTerrain(x, y, tool.terrain);
        break;
      case 'wall': {
        key = WALLS[tool.wall as Exclude<Wall, Wall.None>].texture;
        let mask = 0;
        [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], i) => { if (m.wall(x + dx, y + dy)) mask |= 1 << i; });
        frame = mask; py -= 8;
        err = m.canSetWall(x, y);
        break;
      }
      case 'object': {
        const def = OBJECTS[tool.id];
        fw = def.w; fh = def.h;
        if (def.special === 'boost') { key = 'boost'; frame = this.rot * 2; }
        else if (def.special === 'spinner') { key = 'spinner_blades'; px += 8; py += 8; ox = 0.5; oy = 0.5; }
        else { key = def.texture; px = (x + def.w / 2) * TILE; py = (y + def.h) * TILE; ox = 0.5; oy = 1; }
        err = m.canPlace(def, x, y);
        break;
      }
      case 'tee':
        key = 'tee';
        err = m.canMarkHole(x, y);
        break;
      case 'cup':
        key = 'flag'; frame = Math.min(17, this.holeNum); px += 8; py += 9; ox = 6 / 24; oy = 28 / 32;
        err = m.canMarkHole(x, y);
        break;
    }
    const gk = `${key}:${frame}`;
    if (force || gk !== this.ghostKey || !this.ghost) {
      this.ghost?.destroy();
      this.ghost = this.w(this.add.image(0, 0, key, frame).setAlpha(0.7).setDepth(1e6 - 2));
      this.ghostKey = gk;
    }
    this.ghost.setOrigin(ox, oy).setPosition(px, py);
    if (err) this.ghost.setTint(0xff7070);
    else this.ghost.clearTint();
    this.footprint.clear();
    this.footprint.lineStyle(1, err ? 0xff5050 : 0xffffff, 0.9).strokeRect(x * TILE + 0.5, y * TILE + 0.5, fw * TILE - 1, fh * TILE - 1);
  }
}

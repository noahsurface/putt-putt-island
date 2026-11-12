// Reusable UI pieces. All of these live on a scene's UI layer (zoom 1, screen space).
import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, UI_SCALE } from '../config';
import { Input, KEY_LABELS, type Btn, type DeviceId } from '../systems/Input';
import { Sfx } from '../systems/Sfx';

export type Parent = Phaser.GameObjects.Layer | Phaser.GameObjects.Container;

export function text(
  scene: Phaser.Scene, x: number, y: number, str: string, size = 22, color = COLORS.ink,
  opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
) {
  // Render text at the UI scale so it stays crisp on the 1920×1080 canvas.
  return scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, resolution: UI_SCALE * 1.25, ...opts });
}

/** Wooden 9-slice panel (drawn at 2x so the pixel border stays chunky). */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, dark = false) {
  const p = scene.add.nineslice(x, y, dark ? 'ui_panel_dark' : 'ui_panel', undefined, Math.round(w / 2), Math.round(h / 2), 16, 16, 16, 16);
  p.setOrigin(0).setScale(2);
  return p;
}

const PAD_COLORS: Partial<Record<Btn, number>> = { A: 0x4caf50, B: 0xe0483e, X: 0x3f7fd0, Y: 0xe8b830 };
const PAD_LABELS: Partial<Record<Btn, string>> = { START: '≡', SELECT: '⧉', UP: '▲', DOWN: '▼', LEFT: '◀', RIGHT: '▶' };

/** A controller button or keyboard key glyph. */
export function glyph(scene: Phaser.Scene, btn: Btn, x: number, y: number, gamepad = Input.isGamepadStyle()) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  let label: string;
  let w: number;
  if (gamepad) {
    label = PAD_LABELS[btn] ?? btn;
    const face = PAD_COLORS[btn];
    if (face !== undefined) {
      w = 26;
      g.fillStyle(0x000000, 0.35).fillCircle(13, 15, 13);
      g.fillStyle(face, 1).fillCircle(13, 13, 13);
      g.lineStyle(2, 0xffffff, 0.5).strokeCircle(13, 13, 11);
    } else {
      w = Math.max(30, label.length * 12 + 12);
      g.fillStyle(0x000000, 0.35).fillRoundedRect(0, 2, w, 26, 8);
      g.fillStyle(0x3a3a44, 1).fillRoundedRect(0, 0, w, 26, 8);
    }
  } else {
    label = KEY_LABELS[btn];
    w = Math.max(28, label.length * 11 + 14);
    g.fillStyle(0x000000, 0.35).fillRoundedRect(0, 3, w, 26, 5);
    g.fillStyle(0xf4f0e6, 1).fillRoundedRect(0, 0, w, 26, 5);
    g.lineStyle(2, 0x8a7a66, 1).strokeRoundedRect(1, 1, w - 2, 24, 5);
  }
  const t = text(scene, w / 2, 13, label, 16, gamepad ? '#ffffff' : '#3a2414', { fontStyle: 'bold' }).setOrigin(0.5);
  c.add([g, t]);
  c.setSize(w, 26);
  return { container: c, width: w };
}

export interface PromptItem {
  btns: Btn | Btn[];
  label: string;
}

/** Row of "[A] Place  [B] Remove" hints that redraws when the input device changes. */
export class PromptBar {
  readonly container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private items: PromptItem[] = [];
  private style: boolean | null = null;
  private align: 'left' | 'center' | 'right';
  private bg: boolean;

  constructor(scene: Phaser.Scene, parent: Parent, x = GAME_WIDTH / 2, y = GAME_HEIGHT - 44, align: 'left' | 'center' | 'right' = 'center', bg = true) {
    this.scene = scene;
    this.align = align;
    this.bg = bg;
    this.container = scene.add.container(x, y);
    parent.add(this.container);
  }

  set(items: PromptItem[]) {
    const same = JSON.stringify(items) === JSON.stringify(this.items) && this.style === Input.isGamepadStyle();
    this.items = items;
    if (!same) this.redraw();
    return this;
  }

  update() {
    if (this.style !== Input.isGamepadStyle()) this.redraw();
  }

  private redraw() {
    this.style = Input.isGamepadStyle();
    this.container.removeAll(true);
    let x = 0;
    const parts: Phaser.GameObjects.GameObject[] = [];
    for (const it of this.items) {
      const btns = Array.isArray(it.btns) ? it.btns : [it.btns];
      btns.forEach((b, i) => {
        const gl = glyph(this.scene, b, x, -13);
        parts.push(gl.container);
        x += gl.width + (i < btns.length - 1 ? 3 : 6);
      });
      const t = text(this.scene, x, 0, it.label, 19, '#ffffff', { stroke: '#2a1a10', strokeThickness: 4 }).setOrigin(0, 0.5);
      parts.push(t);
      x += t.width + 22;
    }
    const total = Math.max(0, x - 22);
    const offset = this.align === 'center' ? -total / 2 : this.align === 'right' ? -total : 0;
    if (this.bg && this.items.length) {
      const g = this.scene.add.graphics();
      g.fillStyle(0x1d1410, 0.55).fillRoundedRect(offset - 14, -22, total + 28, 44, 12);
      this.container.add(g);
    }
    for (const p of parts) (p as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject).x += offset;
    this.container.add(parts);
  }

  setVisible(v: boolean) {
    this.container.setVisible(v);
  }

  destroy() {
    this.container.destroy();
  }
}

export interface MenuItem {
  label: string | (() => string);
  onSelect?: () => void;
  /** Left/right changes the value (for option rows). */
  onLeft?: () => void;
  onRight?: () => void;
  disabled?: boolean;
  hint?: string;
}

/** A vertical menu in a wooden panel, driven by stick/d-pad + A/B. */
export class Menu {
  readonly container: Phaser.GameObjects.Container;
  private items: MenuItem[];
  private rows: Phaser.GameObjects.Text[] = [];
  private arrow: Phaser.GameObjects.Text;
  private hintText?: Phaser.GameObjects.Text;
  index = 0;
  onCancel: (() => void) | null = null;
  device?: DeviceId;
  private rowH: number;
  private width: number;
  private baseColor: string = COLORS.ink;
  active = true;

  constructor(scene: Phaser.Scene, parent: Parent, x: number, y: number, items: MenuItem[], opts: { width?: number; title?: string; rowH?: number; size?: number; dark?: boolean } = {}) {
    this.items = items;
    this.rowH = opts.rowH ?? 46;
    this.width = opts.width ?? 360;
    const titleH = opts.title ? 52 : 0;
    const hasHints = items.some((i) => i.hint);
    const h = titleH + items.length * this.rowH + 40 + (hasHints ? 36 : 0);
    this.container = scene.add.container(x - this.width / 2, y - h / 2);
    parent.add(this.container);
    this.container.add(panel(scene, 0, 0, this.width, h, opts.dark));
    const color = opts.dark ? '#ffffff' : COLORS.ink;
    this.baseColor = color;
    if (opts.title) {
      this.container.add(text(scene, this.width / 2, 34, opts.title, 28, opts.dark ? COLORS.gold : COLORS.green, { fontStyle: 'bold' }).setOrigin(0.5));
    }
    items.forEach((_it, i) => {
      const t = text(scene, 58, titleH + 22 + i * this.rowH + this.rowH / 2, '', opts.size ?? 24, color).setOrigin(0, 0.5);
      this.rows.push(t);
      this.container.add(t);
    });
    this.arrow = text(scene, 26, 0, '▶', 22, COLORS.highlight).setOrigin(0, 0.5);
    this.container.add(this.arrow);
    if (hasHints) {
      this.hintText = text(scene, this.width / 2, h - 40, '', 17, opts.dark ? '#c8c8d8' : COLORS.inkSoft, { align: 'center', wordWrap: { width: this.width - 50 } }).setOrigin(0.5, 0.5);
      this.container.add(this.hintText);
    }
    while (this.items[this.index]?.disabled) this.index++;
    this.refresh();
  }

  refresh() {
    this.items.forEach((it, i) => {
      const label = typeof it.label === 'function' ? it.label() : it.label;
      const opt = it.onLeft || it.onRight;
      this.rows[i].setText(opt && i === this.index ? `◀ ${label} ▶` : label);
      this.rows[i].setAlpha(it.disabled ? 0.4 : 1);
      this.rows[i].setColor(i === this.index ? COLORS.highlight : this.baseColor);
    });
    const r = this.rows[this.index];
    if (r) this.arrow.setY(r.y);
    this.hintText?.setText(this.items[this.index]?.hint ?? '');
  }

  setItems(items: MenuItem[]) {
    this.items = items;
    this.refresh();
  }

  update() {
    if (!this.active || !this.container.visible) return;
    const dev = this.device;
    const n = this.items.length;
    const move = (d: number) => {
      let i = this.index;
      for (let k = 0; k < n; k++) {
        i = (i + d + n) % n;
        if (!this.items[i].disabled) break;
      }
      if (i !== this.index) {
        this.index = i;
        Sfx.move();
        this.refresh();
      }
    };
    if (Input.repeat('UP', dev)) move(-1);
    if (Input.repeat('DOWN', dev)) move(1);
    const it = this.items[this.index];
    if (it?.onLeft && Input.repeat('LEFT', dev)) { it.onLeft(); Sfx.move(); this.refresh(); }
    if (it?.onRight && Input.repeat('RIGHT', dev)) { it.onRight(); Sfx.move(); this.refresh(); }
    if (Input.pressed('A', dev) && it && !it.disabled && it.onSelect) {
      Sfx.select();
      Input.consume();
      it.onSelect();
      this.refresh();
      return;
    }
    if (Input.pressed('B', dev) && this.onCancel) {
      Sfx.back();
      Input.consume();
      this.onCancel();
    }
  }

  destroy() {
    this.container.destroy();
  }
}

/** Short message that floats near the top of the screen. */
export function toast(scene: Phaser.Scene, parent: Parent, msg: string, color = '#ffffff') {
  const t = text(scene, GAME_WIDTH / 2, 92, msg, 24, color, { stroke: '#2a1a10', strokeThickness: 5 }).setOrigin(0.5);
  parent.add(t);
  scene.tweens.add({ targets: t, y: 72, alpha: { from: 1, to: 0 }, delay: 1100, duration: 500, onComplete: () => t.destroy() });
  return t;
}

/** Big centered announcement ("Hole in one!"). */
export function banner(scene: Phaser.Scene, parent: Parent, msg: string, sub = '', color = COLORS.gold, hold = 1400) {
  const c = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80);
  const t = text(scene, 0, 0, msg, 64, color, { stroke: '#2a1a10', strokeThickness: 10, fontStyle: 'bold' }).setOrigin(0.5);
  c.add(t);
  if (sub) c.add(text(scene, 0, 56, sub, 28, '#ffffff', { stroke: '#2a1a10', strokeThickness: 6 }).setOrigin(0.5));
  parent.add(c);
  c.setScale(0.2);
  scene.tweens.add({ targets: c, scale: 1, duration: 260, ease: 'Back.Out' });
  scene.tweens.add({ targets: c, alpha: 0, delay: hold, duration: 350, onComplete: () => c.destroy() });
  return c;
}

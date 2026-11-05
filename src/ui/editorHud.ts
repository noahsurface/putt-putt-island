import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { glyph, panel, text, type Parent } from './widgets';

export interface HudTool {
  name: string;
  icon: string;
  frame?: number;
}

export interface HudCategory {
  name: string;
  tools: HudTool[];
}

const SLOT = 62;

/** Category tabs along the top and a tool strip along the bottom. */
export class EditorHud {
  readonly container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private cats: HudCategory[];
  private tabs: Phaser.GameObjects.Container;
  private strip: Phaser.GameObjects.Container;
  private info: Phaser.GameObjects.Text;
  private sub: Phaser.GameObjects.Text;
  private glyphStyle: boolean | null = null;
  private cat = -1;
  private tool = -1;
  private title: string;

  constructor(scene: Phaser.Scene, parent: Parent, title: string, cats: HudCategory[]) {
    this.scene = scene;
    this.cats = cats;
    this.title = title;
    this.container = scene.add.container(0, 0);
    parent.add(this.container);
    this.tabs = scene.add.container(0, 0);
    this.strip = scene.add.container(0, 0);
    this.info = text(scene, GAME_WIDTH / 2, GAME_HEIGHT - 156, '', 26, '#ffffff', { stroke: '#2a1a10', strokeThickness: 6, fontStyle: 'bold' }).setOrigin(0.5);
    this.sub = text(scene, GAME_WIDTH / 2, GAME_HEIGHT - 127, '', 19, '#ffe9a8', { stroke: '#2a1a10', strokeThickness: 5 }).setOrigin(0.5);
    this.container.add([this.tabs, this.strip, this.info, this.sub]);
  }

  setVisible(v: boolean) {
    this.container.setVisible(v);
  }

  /** Re-render if selection or input device style changed. */
  select(cat: number, tool: number, info: string, sub: string, gamepad: boolean) {
    if (cat !== this.cat || gamepad !== this.glyphStyle) this.drawTabs(cat, gamepad);
    if (cat !== this.cat || tool !== this.tool || gamepad !== this.glyphStyle) this.drawStrip(cat, tool, gamepad);
    this.cat = cat;
    this.tool = tool;
    this.glyphStyle = gamepad;
    this.info.setText(info);
    this.sub.setText(sub);
  }

  private drawTabs(cat: number, gamepad: boolean) {
    const s = this.scene;
    this.tabs.removeAll(true);
    let x = 20;
    const lt = glyph(s, 'LT', x, 22, gamepad);
    this.tabs.add(lt.container);
    x += lt.width + 10;
    this.cats.forEach((c, i) => {
      const t = text(s, 0, 0, c.name, 21, i === cat ? COLORS.ink : '#ffffff', { fontStyle: i === cat ? 'bold' : 'normal' }).setOrigin(0, 0.5);
      const w = t.width + 28;
      const g = s.add.graphics();
      if (i === cat) g.fillStyle(0xf7e3b5, 1).fillRoundedRect(x, 14, w, 42, 10).lineStyle(3, 0x5a2f14, 1).strokeRoundedRect(x, 14, w, 42, 10);
      else g.fillStyle(0x1d1410, 0.6).fillRoundedRect(x, 18, w, 34, 10);
      t.setPosition(x + 14, 35);
      this.tabs.add([g, t]);
      x += w + 6;
    });
    const rt = glyph(s, 'RT', x + 4, 22, gamepad);
    this.tabs.add(rt.container);
    this.tabs.add(text(s, x + rt.width + 14, 35, this.title, 19, '#ffffffcc', { stroke: '#2a1a10', strokeThickness: 4 }).setOrigin(0, 0.5));
  }

  private drawStrip(cat: number, tool: number, gamepad: boolean) {
    const s = this.scene;
    this.strip.removeAll(true);
    const tools = this.cats[cat].tools;
    const W = tools.length * SLOT + 24;
    const x0 = GAME_WIDTH / 2 - W / 2, y0 = GAME_HEIGHT - 106;
    this.strip.add(panel(s, x0, y0, W, 92));
    tools.forEach((t, i) => {
      const cx = x0 + 12 + i * SLOT + SLOT / 2, cy = y0 + 46;
      if (i === tool) {
        const g = s.add.graphics();
        g.fillStyle(0xffd34a, 0.55).fillRoundedRect(cx - 28, cy - 30, 56, 60, 8);
        g.lineStyle(3, 0xe0483e, 1).strokeRoundedRect(cx - 28, cy - 30, 56, 60, 8);
        this.strip.add(g);
      }
      const img = s.add.image(cx, cy, t.icon, t.frame ?? 0);
      const fit = Math.min(44 / img.width, 48 / img.height);
      img.setScale(fit >= 1 ? Math.min(3, Math.floor(fit)) : fit);
      this.strip.add(img);
    });
    const lb = glyph(s, 'LB', x0 - 44, y0 + 33, gamepad);
    const rb = glyph(s, 'RB', x0 + W + 10, y0 + 33, gamepad);
    this.strip.add([lb.container, rb.container]);
  }

  destroy() {
    this.container.destroy();
  }
}

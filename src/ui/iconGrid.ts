import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Input } from '../systems/Input';
import { Sfx } from '../systems/Sfx';
import { panel, text, type Parent } from './widgets';

export interface AppIcon {
  icon: number; // frame in ui_icons
  label: string;
  onSelect: () => void;
}

/** The "PuttPad": a phone-style grid of app icons. */
export class IconGrid {
  readonly container: Phaser.GameObjects.Container;
  private apps: AppIcon[];
  private cells: Phaser.GameObjects.Container[] = [];
  private cols: number;
  index = 0;
  onClose: (() => void) | null = null;

  constructor(scene: Phaser.Scene, parent: Parent, title: string, apps: AppIcon[], cols = 3) {
    this.apps = apps;
    this.cols = cols;
    const rows = Math.ceil(apps.length / cols);
    const cw = 150, ch = 132;
    const W = cols * cw + 60, H = rows * ch + 120;
    this.container = scene.add.container(GAME_WIDTH / 2 - W / 2, GAME_HEIGHT / 2 - H / 2);
    parent.add(this.container);
    const shade = scene.add.rectangle(-GAME_WIDTH, -GAME_HEIGHT, GAME_WIDTH * 3, GAME_HEIGHT * 3, 0x000000, 0.35).setOrigin(0);
    this.container.add([shade, panel(scene, 0, 0, W, H, true)]);
    this.container.add(text(scene, W / 2, 40, title, 30, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5));
    const clock = text(scene, W - 30, 40, '', 18, '#c8c8d8').setOrigin(1, 0.5);
    const now = new Date();
    clock.setText(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
    this.container.add(clock);
    apps.forEach((a, i) => {
      const cx = 30 + (i % cols) * cw + cw / 2, cy = 84 + Math.floor(i / cols) * ch + 50;
      const cell = scene.add.container(cx, cy);
      const hi = scene.add.graphics();
      hi.fillStyle(0xffffff, 0.12).fillRoundedRect(-62, -52, 124, 118, 14);
      hi.lineStyle(3, 0xffd34a, 1).strokeRoundedRect(-62, -52, 124, 118, 14);
      hi.setName('hi');
      const icon = scene.add.image(0, -8, 'ui_icons', a.icon).setScale(2);
      const label = text(scene, 0, 48, a.label, 17, '#ffffff', { align: 'center' }).setOrigin(0.5);
      cell.add([hi, icon, label]);
      this.cells.push(cell);
      this.container.add(cell);
    });
    this.container.setScale(0.9).setAlpha(0);
    scene.tweens.add({ targets: this.container, scale: 1, alpha: 1, duration: 140, ease: 'Back.Out' });
    this.refresh();
  }

  private refresh() {
    this.cells.forEach((c, i) => {
      (c.getByName('hi') as Phaser.GameObjects.Graphics).setVisible(i === this.index);
      c.setScale(i === this.index ? 1.06 : 1);
    });
  }

  update() {
    const n = this.apps.length;
    let i = this.index;
    if (Input.repeat('LEFT')) i = (i - 1 + n) % n;
    if (Input.repeat('RIGHT')) i = (i + 1) % n;
    if (Input.repeat('UP')) i = (i - this.cols + n) % n;
    if (Input.repeat('DOWN')) i = (i + this.cols) % n;
    if (i !== this.index) {
      this.index = i;
      Sfx.move();
      this.refresh();
    }
    if (Input.pressed('A')) {
      Sfx.select();
      Input.consume();
      this.apps[this.index].onSelect();
      return;
    }
    if (Input.pressed('B') || Input.pressed('START')) {
      Sfx.back();
      Input.consume();
      this.onClose?.();
    }
  }

  destroy() {
    this.container.destroy();
  }
}

import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, COLORS, FONT } from '../config';
import { ASSET_IMAGES } from '../data/assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const bar = this.add.graphics();
    const label = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 70, 'Putt-Putt Island', { fontFamily: FONT, fontSize: '72px', color: COLORS.gold, stroke: '#2a1a10', strokeThickness: 8 }).setOrigin(0.5);
    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0x000000, 0.4).fillRoundedRect(CANVAS_WIDTH / 2 - 306, CANVAS_HEIGHT / 2 + 9, 612, 42, 12);
      bar.fillStyle(0x6fbf5a, 1).fillRoundedRect(CANVAS_WIDTH / 2 - 300, CANVAS_HEIGHT / 2 + 15, 600 * v, 30, 9);
    });
    this.load.on('loaderror', (f: Phaser.Loader.File) => console.warn('Missing asset', f.key, f.url));
    for (const a of ASSET_IMAGES) {
      if (a.frame) this.load.spritesheet(a.key, a.path, { frameWidth: a.frame.w, frameHeight: a.frame.h });
      else this.load.image(a.key, a.path);
    }
    this.load.once('complete', () => label.destroy());
  }

  create() {
    // The UI frame/cursor/icon art is deliberately chunky pixel art: keep it crisp.
    for (const key of ['ui_panel', 'ui_panel_dark', 'ui_cursor', 'ui_icons']) {
      if (this.textures.exists(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.scene.start('Title');
  }
}

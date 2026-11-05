import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ASSET_IMAGES } from '../data/assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const bar = this.add.graphics();
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'Putt-Putt Island', { fontFamily: FONT, fontSize: '48px', color: COLORS.gold, stroke: '#2a1a10', strokeThickness: 8 }).setOrigin(0.5);
    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0x000000, 0.4).fillRoundedRect(GAME_WIDTH / 2 - 204, GAME_HEIGHT / 2 + 6, 408, 28, 8);
      bar.fillStyle(0x6fbf5a, 1).fillRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 + 10, 400 * v, 20, 6);
    });
    this.load.on('loaderror', (f: Phaser.Loader.File) => console.warn('Missing asset', f.key, f.url));
    for (const a of ASSET_IMAGES) {
      if (a.frame) this.load.spritesheet(a.key, a.path, { frameWidth: a.frame.w, frameHeight: a.frame.h });
      else this.load.image(a.key, a.path);
    }
    this.load.once('complete', () => label.destroy());
  }

  create() {
    this.scene.start('Title');
  }
}

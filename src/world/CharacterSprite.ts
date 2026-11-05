// A layered, tinted character built from the grayscale layer sheets.
import Phaser from 'phaser';
import type { CharacterLook } from '../data/types';

export type Facing = 'down' | 'up' | 'left' | 'right';

const DIR_ROW: Record<Facing, number> = { down: 0, right: 1, left: 1, up: 2 };
const WALK_SEQ = [1, 0, 2, 0];

export class CharacterSprite extends Phaser.GameObjects.Container {
  private layers: Phaser.GameObjects.Image[] = [];
  private shadow: Phaser.GameObjects.Image;
  facing: Facing = 'down';
  walking = false;
  private animTime = 0;
  private look!: CharacterLook;
  /** Steps per second while walking. */
  walkRate = 8;

  constructor(scene: Phaser.Scene, x: number, y: number, look: CharacterLook) {
    super(scene, x, y);
    this.shadow = scene.add.image(0, 0, 'char_shadow').setOrigin(0.5, 0.5);
    this.add(this.shadow);
    this.setLook(look);
  }

  setLook(look: CharacterLook) {
    this.look = { ...look };
    for (const l of this.layers) l.destroy();
    this.layers = [];
    const add = (key: string, tint?: number) => {
      if (!this.scene.textures.exists(key)) return;
      const img = this.scene.add.image(0, 0, key, 0).setOrigin(0.5, 30 / 32);
      if (tint !== undefined) img.setTint(tint);
      this.layers.push(img);
      this.add(img);
    };
    add('char_body', look.skin);
    add(`char_pants_${look.pants}`, look.pantsColor);
    add('char_shoes', look.shoesColor);
    add(`char_shirt_${look.shirt}`, look.shirtColor);
    add('char_arms', look.skin);
    add(`char_sleeves_${look.shirt}`, look.shirtColor);
    add('char_face');
    if (look.hair !== 'none') add(`char_hair_${look.hair}`, look.hairColor);
    if (look.hat !== 'none') add(`char_hat_${look.hat}`, look.hatColor);
    this.applyFrame();
  }

  getLook() {
    return this.look;
  }

  setFacing(f: Facing) {
    if (f !== this.facing) {
      this.facing = f;
      this.applyFrame();
    }
    return this;
  }

  /** Face toward a direction vector. */
  faceVector(dx: number, dy: number) {
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return this;
    return this.setFacing(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
  }

  setWalking(w: boolean) {
    if (w !== this.walking) {
      this.walking = w;
      if (!w) this.animTime = 0;
      this.applyFrame();
    }
    return this;
  }

  tick(dtMs: number) {
    if (!this.walking) return;
    const before = Math.floor(this.animTime * this.walkRate);
    this.animTime += dtMs / 1000;
    if (Math.floor(this.animTime * this.walkRate) !== before) this.applyFrame();
  }

  private applyFrame() {
    const step = this.walking ? WALK_SEQ[Math.floor(this.animTime * this.walkRate) % WALK_SEQ.length] : 0;
    const frame = DIR_ROW[this.facing] * 3 + step;
    const flip = this.facing === 'left';
    for (const l of this.layers) l.setFrame(frame).setFlipX(flip);
  }
}

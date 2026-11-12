// A layered, tinted character built from the greyscale HD layer sheets.
//
// Sheets are 6 columns × 5 rows of 128×192 frames (see scripts/art-hd/character.js):
//   rows: down, down-right, right, up-right, up (left-facing rows are mirrored)
//   cols: idle, walk ×4, putting stance
import Phaser from 'phaser';
import { ART_SCALE, CHAR_SCALE } from '../config';
import type { CharacterLook } from '../data/types';

export type Facing = 'down' | 'downRight' | 'right' | 'upRight' | 'up' | 'upLeft' | 'left' | 'downLeft';
export type Pose = 'stand' | 'walk' | 'putt';

const COLS = 6;
const FEET_Y = 184 / 192;
const ROW: Record<Facing, [row: number, flip: boolean]> = {
  down: [0, false], downRight: [1, false], right: [2, false], upRight: [3, false], up: [4, false],
  upLeft: [3, true], left: [2, true], downLeft: [1, true],
};
const ORDER: Facing[] = ['right', 'downRight', 'down', 'downLeft', 'left', 'upLeft', 'up', 'upRight'];

/** Unit vector for each facing (screen space, +y down). */
export const FACING_VECTORS: Record<Facing, [number, number]> = {
  right: [1, 0], downRight: [Math.SQRT1_2, Math.SQRT1_2], down: [0, 1], downLeft: [-Math.SQRT1_2, Math.SQRT1_2],
  left: [-1, 0], upLeft: [-Math.SQRT1_2, -Math.SQRT1_2], up: [0, -1], upRight: [Math.SQRT1_2, -Math.SQRT1_2],
};

/** Nearest of the 8 facings to a direction. */
export function facingFromVector(dx: number, dy: number): Facing {
  const a = Math.atan2(dy, dx);
  const i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  return ORDER[i];
}

export const FACINGS_CLOCKWISE: Facing[] = ['down', 'downLeft', 'left', 'upLeft', 'up', 'upRight', 'right', 'downRight'];

/** Walk cycle: 4 poses at 10 per second, like the reference recording. */
const WALK_FPS = 10;

export class CharacterSprite extends Phaser.GameObjects.Container {
  private layers: Phaser.GameObjects.Image[] = [];
  private shadow: Phaser.GameObjects.Image;
  facing: Facing = 'down';
  pose: Pose = 'stand';
  private animTime = 0;
  private look!: CharacterLook;
  /** Multiplier for the walk animation speed (e.g. faster when running). */
  walkRate = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, look: CharacterLook) {
    super(scene, x, y);
    this.shadow = scene.add.image(0, 0, 'char_shadow').setScale(0.65 / ART_SCALE);
    this.add(this.shadow);
    this.setLook(look);
  }

  setLook(look: CharacterLook) {
    this.look = { ...look };
    for (const l of this.layers) l.destroy();
    this.layers = [];
    const add = (key: string, tint?: number) => {
      if (!this.scene.textures.exists(key)) return;
      const img = this.scene.add.image(0, 0, key, 0).setOrigin(0.5, FEET_Y).setScale(1 / CHAR_SCALE);
      if (tint !== undefined) img.setTint(tint);
      this.layers.push(img);
      this.add(img);
    };
    add('char_body', look.skin);
    add(`char_pants_${look.pants}`, look.pantsColor);
    add('char_shoes', look.shoesColor);
    add(`char_shirt_${look.shirt}`, look.shirtColor);
    add(`char_shirtfx_${look.shirt}`);
    add('char_arms', look.skin);
    add(`char_sleeves_${look.shirt}`, look.shirtColor);
    add(`char_sleevesfx_${look.shirt}`);
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

  /** Face toward a direction vector (8 directions). */
  faceVector(dx: number, dy: number) {
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return this;
    return this.setFacing(facingFromVector(dx, dy));
  }

  setPose(p: Pose) {
    if (p !== this.pose) {
      if (p === 'walk' && this.pose !== 'walk') this.animTime = 0;
      this.pose = p;
      this.applyFrame();
    }
    return this;
  }

  setWalking(w: boolean) {
    if (w) return this.setPose('walk');
    return this.pose === 'walk' ? this.setPose('stand') : this;
  }

  get walking() {
    return this.pose === 'walk';
  }

  tick(dtMs: number) {
    if (this.pose !== 'walk') return;
    const before = Math.floor(this.animTime * WALK_FPS * this.walkRate);
    this.animTime += dtMs / 1000;
    if (Math.floor(this.animTime * WALK_FPS * this.walkRate) !== before) this.applyFrame();
  }

  private applyFrame() {
    const col = this.pose === 'putt' ? 5 : this.pose === 'walk' ? 1 + (Math.floor(this.animTime * WALK_FPS * this.walkRate) % 4) : 0;
    const [row, flip] = ROW[this.facing];
    const frame = row * COLS + col;
    for (const l of this.layers) l.setFrame(frame).setFlipX(flip);
  }
}

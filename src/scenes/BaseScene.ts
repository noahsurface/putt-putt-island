import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, ZOOM } from '../config';
import { Input } from '../systems/Input';

/**
 * Every gameplay scene has two cameras:
 *  - the main camera, zoomed 3x, showing the pixel-art world layer
 *  - a UI camera at 1x showing the UI layer (crisp text and panels)
 */
export abstract class BaseScene extends Phaser.Scene {
  world!: Phaser.GameObjects.Layer;
  ui!: Phaser.GameObjects.Layer;
  uiCam!: Phaser.Cameras.Scene2D.Camera;
  private leaving = false;

  protected setupLayers(zoom = ZOOM) {
    this.leaving = false;
    this.world = this.add.layer();
    this.ui = this.add.layer();
    const main = this.cameras.main;
    main.setZoom(zoom);
    main.setRoundPixels(true);
    main.setBackgroundColor('#2d6fa8');
    this.uiCam = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
    main.ignore(this.ui);
    this.uiCam.ignore(this.world);
    main.fadeIn(250, 0, 0, 0);
    this.uiCam.fadeIn(250, 0, 0, 0);
  }

  w<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.world.add(o);
    return o;
  }

  u<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.ui.add(o);
    return o;
  }

  /** Fade out and switch scenes. */
  go(key: string, data?: object) {
    if (this.leaving) return;
    this.leaving = true;
    Input.consume();
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.uiCam.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(240, () => this.scene.start(key, data));
  }

  get isLeaving() {
    return this.leaving;
  }
}

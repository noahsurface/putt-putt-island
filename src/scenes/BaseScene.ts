import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, UI_SCALE, ZOOM } from '../config';
import { Input } from '../systems/Input';

/**
 * Every gameplay scene has two cameras:
 *  - the main camera showing the world layer (zoom 4: a tile is 64 screen px)
 *  - a UI camera showing the UI layer, laid out on a 1280×720 grid and
 *    scaled to the 1920×1080 canvas
 */
export abstract class BaseScene extends Phaser.Scene {
  world!: Phaser.GameObjects.Layer;
  ui!: Phaser.GameObjects.Layer;
  uiCam!: Phaser.Cameras.Scene2D.Camera;
  private leaving = false;

  /**
   * @param zoom world camera zoom, or 'ui' to line the world layer up with UI
   *             coordinates (for menu scenes that draw backgrounds in the world layer)
   */
  protected setupLayers(zoom: number | 'ui' = ZOOM) {
    this.leaving = false;
    this.world = this.add.layer();
    this.ui = this.add.layer();
    const main = this.cameras.main;
    if (zoom === 'ui') {
      main.setOrigin(0, 0).setZoom(UI_SCALE);
    } else main.setZoom(zoom);
    main.setRoundPixels(false);
    main.setBackgroundColor('#2d6fa8');
    this.uiCam = this.cameras.add(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).setOrigin(0, 0).setZoom(UI_SCALE);
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

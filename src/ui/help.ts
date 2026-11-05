import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Input, type Btn } from '../systems/Input';
import { Sfx } from '../systems/Sfx';
import { glyph, panel, text, type Parent } from './widgets';

const ROWS: [Btn[], string, string][] = [
  [['LEFT', 'RIGHT'], 'Move / aim', 'Left stick or D-pad · WASD / arrows'],
  [['A'], 'Interact, place, hold to putt', ''],
  [['B'], 'Back / remove · hold to run', 'Shift also runs'],
  [['X'], 'Rotate item · next hole number', ''],
  [['Y'], 'Look around the course', 'Right stick or IJKL pans the camera'],
  [['LB', 'RB'], 'Previous / next item', 'Fine aim while putting'],
  [['LT', 'RT'], 'Previous / next category', ''],
  [['START'], 'PuttPad menu / pause', ''],
];

/** Modal controls reference. Closes on A or B. */
export function showControls(scene: Phaser.Scene, parent: Parent, onClose: () => void) {
  const c = scene.add.container(0, 0);
  parent.add(c);
  const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0);
  const W = 760, H = 560;
  const x0 = (GAME_WIDTH - W) / 2, y0 = (GAME_HEIGHT - H) / 2;
  c.add([shade, panel(scene, x0, y0, W, H)]);
  c.add(text(scene, GAME_WIDTH / 2, y0 + 42, 'How to Play', 34, COLORS.green, { fontStyle: 'bold' }).setOrigin(0.5));
  const pad = Input.isGamepadStyle();
  c.add(text(scene, GAME_WIDTH / 2, y0 + 80, pad ? 'Showing controller buttons (press a key to see keyboard)' : 'Showing keyboard keys (press a controller button to see pad)', 17, COLORS.inkSoft).setOrigin(0.5));
  ROWS.forEach(([btns, what, extra], i) => {
    const y = y0 + 126 + i * 50;
    let x = x0 + 50;
    for (const b of btns) {
      const g = glyph(scene, b, x, y - 13, pad);
      c.add(g.container);
      x += g.width + 4;
    }
    c.add(text(scene, x0 + 230, y, what, 22, COLORS.ink).setOrigin(0, 0.5));
    if (extra) c.add(text(scene, x0 + W - 50, y, extra, 16, COLORS.inkSoft).setOrigin(1, 0.5));
  });
  c.add(text(scene, GAME_WIDTH / 2, y0 + H - 34, 'Golf: tilt the stick to aim, hold A to charge, release to putt.', 18, COLORS.highlight).setOrigin(0.5));
  const onUpdate = () => {
    if (Input.pressed('A') || Input.pressed('B') || Input.pressed('START')) {
      Sfx.back();
      Input.consume();
      scene.events.off('update', onUpdate);
      c.destroy();
      onClose();
    }
  };
  scene.events.on('update', onUpdate);
  return c;
}

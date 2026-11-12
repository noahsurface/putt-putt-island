import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { CustomizeScene } from './scenes/CustomizeScene';
import { GolfScene } from './scenes/GolfScene';
import { IslandScene } from './scenes/IslandScene';
import { JoinScene } from './scenes/JoinScene';
import { ProShopScene } from './scenes/ProShopScene';
import { TitleScene } from './scenes/TitleScene';
import { Input } from './systems/Input';

async function start() {
  // Make sure the pixel font is ready before any text is drawn.
  try {
    await Promise.all([document.fonts.load('24px "Pixelify Sans"'), document.fonts.load('bold 24px "Pixelify Sans"')]);
  } catch {
    /* fall back to the default font */
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#1d2b3a',
    // Smooth, high-resolution art: linear filtering with mipmaps for zoomed-out views.
    pixelArt: false,
    antialias: true,
    roundPixels: false,
    render: { mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { gamepad: false },
    scene: [BootScene, TitleScene, IslandScene, ProShopScene, CustomizeScene, JoinScene, GolfScene],
  });

  // Poll keyboard + gamepads once per frame, before scenes update.
  game.events.on(Phaser.Core.Events.PRE_STEP, (time: number) => Input.update(time));

  (window as unknown as { game: Phaser.Game }).game = game;
}

void start();

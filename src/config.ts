/** Size of one map tile in world units (all game logic uses these). */
export const TILE = 16;
/** World art is drawn at 4 texture px per world unit (64 px tiles). */
export const ART_SCALE = 4;
/** Characters are drawn at 8 texture px per world unit so close-ups stay sharp. */
export const CHAR_SCALE = 8;
/** The game renders at full HD. */
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
/** World camera zoom: a 16-unit tile is 64 screen px (about 30 × 17 tiles visible). */
export const ZOOM = 4;
/** UI is laid out on a 1280×720 grid and scaled up to the canvas. */
export const UI_SCALE = CANVAS_WIDTH / 1280;
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const FONT = '"Pixelify Sans", "Trebuchet MS", sans-serif';

export const COLORS = {
  ink: '#3a2414',
  inkSoft: '#6b4a2e',
  paper: '#f7e3b5',
  highlight: '#e0483e',
  gold: '#ffd34a',
  white: '#ffffff',
  green: '#2f7d3c',
  sky: '#1d2b3a',
};

export const MAX_PLAYERS = 4;

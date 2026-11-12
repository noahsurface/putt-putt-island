// Every image the game loads. Replace any PNG in public/assets with your own art
// (same size / frame layout) and it will be picked up automatically.

export interface ImageAsset {
  key: string;
  path: string;
  /** If set, the file is a sprite sheet with frames of this size. */
  frame?: { w: number; h: number };
}

// The ?v= fingerprint changes whenever any art file changes, so browsers always
// fetch matching art after an update instead of reusing stale cached images.
const img = (key: string, path: string, frame?: { w: number; h: number }): ImageAsset => ({ key, path: `${path}?v=${__ASSET_VERSION__}`, frame });

const OBJECT_IMAGES = [
  'tree_oak', 'tree_apple', 'tree_pine', 'tree_palm', 'bush', 'bush_berry', 'bush_flowers_white', 'bush_flowers_red',
  'bush_flowers_orange', 'flower_bed', 'garden_plot', 'hole_sign', 'flowers_red', 'flowers_yellow', 'flowers_blue', 'flowers_pink',
  'tall_grass', 'rock', 'boulder', 'stump', 'bench', 'lamp', 'sign', 'barrel', 'crate', 'umbrella', 'deck_chair', 'shell',
  'starfish', 'tiki_torch', 'ball_statue', 'mailbox', 'picnic_table', 'starter_board',
];

const INTERIOR_IMAGES = [
  'counter', 'shelf_balls', 'club_rack', 'bag_stand', 'trophy_case', 'potted_plant', 'rug', 'armchair', 'coffee_table',
  'mirror', 'putting_mat', 'poster', 'clock', 'window', 'pennant', 'neon_open', 'door_mat', 'locker_door', 'sign_locker',
  'floor_wood', 'floor_checker', 'floor_carpet', 'floor_tile', 'wall_cream', 'wall_stripe', 'wall_panel', 'wall_navy',
];

export const CHARACTER_LAYERS = {
  hair: ['none', 'short', 'spiky', 'long', 'ponytail', 'bob', 'curly'],
  hat: ['none', 'cap', 'visor', 'bucket', 'beanie', 'straw'],
  shirt: ['tee', 'long', 'striped', 'tank'],
  pants: ['shorts', 'long', 'skirt'],
};

const CHAR = { w: 128, h: 192 };

export const ASSET_IMAGES: ImageAsset[] = [
  ...['sand', 'grass', 'dirt', 'stone', 'brick', 'green', 'bunker'].map((t) => img(`terrain_${t}`, `assets/terrain/${t}.png`, { w: 64, h: 64 })),
  img('water', 'assets/terrain/water.png', { w: 128, h: 128 }),
  ...['rail_wood', 'rail_brick', 'rail_stone', 'fence_white', 'fence_wood', 'hedge'].map((w) => img(`wall_${w}`, `assets/walls/${w}.png`, { w: 64, h: 96 })),
  ...['rail_wood', 'rail_brick', 'rail_stone'].map((w) => img(`wall_${w}_corner`, `assets/walls/${w}_corner.png`, { w: 64, h: 64 })),
  ...OBJECT_IMAGES.map((o) => img(o, `assets/objects/${o}.png`)),
  ...INTERIOR_IMAGES.map((o) => img(o, `assets/interior/${o}.png`)),
  img('proshop', 'assets/buildings/proshop.png'),
  img('tee', 'assets/course/tee.png'),
  img('cup', 'assets/course/cup.png'),
  img('flag', 'assets/course/flag.png', { w: 96, h: 128 }),
  img('bumper', 'assets/course/bumper.png', { w: 64, h: 64 }),
  img('boost', 'assets/course/boost.png', { w: 64, h: 64 }),
  img('spinner_base', 'assets/course/spinner_base.png'),
  img('spinner_blades', 'assets/course/spinner_blades.png'),
  img('ball', 'assets/course/ball.png'),
  img('ball_shadow', 'assets/course/ball_shadow.png'),
  img('ui_panel', 'assets/ui/panel.png'),
  img('ui_panel_dark', 'assets/ui/panel_dark.png'),
  img('ui_cursor', 'assets/ui/cursor.png', { w: 16, h: 16 }),
  img('ui_icons', 'assets/ui/icons.png', { w: 32, h: 32 }),
  img('ui_lockers', 'assets/ui/lockers.png'),
  img('char_body', 'assets/character/body.png', CHAR),
  img('char_arms', 'assets/character/arms.png', CHAR),
  img('char_face', 'assets/character/face.png', CHAR),
  img('char_shoes', 'assets/character/shoes.png', CHAR),
  img('char_shadow', 'assets/character/shadow.png'),
  ...CHARACTER_LAYERS.shirt.map((s) => img(`char_shirt_${s}`, `assets/character/shirt_${s}.png`, CHAR)),
  ...CHARACTER_LAYERS.shirt.filter((s) => s !== 'tank').map((s) => img(`char_sleeves_${s}`, `assets/character/sleeves_${s}.png`, CHAR)),
  img('char_shirtfx_striped', 'assets/character/shirtfx_striped.png', CHAR),
  img('char_sleevesfx_striped', 'assets/character/sleevesfx_striped.png', CHAR),
  ...CHARACTER_LAYERS.pants.map((s) => img(`char_pants_${s}`, `assets/character/pants_${s}.png`, CHAR)),
  ...CHARACTER_LAYERS.hair.filter((s) => s !== 'none').map((s) => img(`char_hair_${s}`, `assets/character/hair_${s}.png`, CHAR)),
  ...CHARACTER_LAYERS.hat.filter((s) => s !== 'none').map((s) => img(`char_hat_${s}`, `assets/character/hat_${s}.png`, CHAR)),
];

/** Icon frames in ui_icons. */
export const ICON = { designer: 0, play: 1, customize: 2, shop: 3, save: 4, controls: 5, home: 6, course: 7 };

// Everything that can be placed on the island or in the pro shop.
//
// To add your own item: drop a PNG into public/assets/objects (or interior/),
// add it to ASSET_IMAGES in assets.ts, then add an entry here.
import { Terrain, Wall } from './terrain';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Placement = 'island' | 'shop' | 'shop-wall';

export interface ObjectDef {
  id: string;
  name: string;
  texture: string;
  /** Footprint size in tiles. */
  w: number;
  h: number;
  placement: Placement;
  /** Flat on the ground: drawn under characters and never blocks. */
  ground?: boolean;
  solid: boolean;
  /** Collision boxes in px, relative to the footprint's top-left. Defaults to the full footprint. */
  rects?: Rect[];
  circle?: { x: number; y: number; r: number };
  interact?: 'proshop' | 'starter' | 'mirror';
  special?: 'bumper' | 'boost' | 'spinner';
  /** Cannot be picked up / removed in the editor. */
  fixed?: boolean;
  /** Extra vertical offset in px for the sprite (positive = lower). */
  offsetY?: number;
  /** Walkable cell inside a solid footprint, relative to the footprint (doors). */
  door?: { x: number; y: number };
}

const defs: ObjectDef[] = [
  // ---- nature
  { id: 'tree_oak', name: 'Oak Tree', texture: 'tree_oak', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 3, y: 4, w: 10, h: 12 }] },
  { id: 'tree_apple', name: 'Apple Tree', texture: 'tree_apple', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 3, y: 4, w: 10, h: 12 }] },
  { id: 'tree_pine', name: 'Pine Tree', texture: 'tree_pine', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 3, y: 4, w: 10, h: 12 }] },
  { id: 'tree_palm', name: 'Palm Tree', texture: 'tree_palm', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 4, y: 6, w: 8, h: 10 }] },
  { id: 'bush', name: 'Bush', texture: 'bush', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 1, y: 3, w: 14, h: 12 }] },
  { id: 'bush_berry', name: 'Berry Bush', texture: 'bush_berry', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 1, y: 3, w: 14, h: 12 }] },
  { id: 'bush_flowers_white', name: 'White Flower Bush', texture: 'bush_flowers_white', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 1, y: 3, w: 14, h: 12 }] },
  { id: 'bush_flowers_red', name: 'Red Flower Bush', texture: 'bush_flowers_red', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 1, y: 3, w: 14, h: 12 }] },
  { id: 'bush_flowers_orange', name: 'Orange Flower Bush', texture: 'bush_flowers_orange', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 1, y: 3, w: 14, h: 12 }] },
  { id: 'flower_bed', name: 'Flower Bed', texture: 'flower_bed', w: 2, h: 2, placement: 'island', solid: false, ground: true },
  { id: 'garden_plot', name: 'Garden Plot', texture: 'garden_plot', w: 2, h: 2, placement: 'island', solid: false, ground: true },
  { id: 'flowers_red', name: 'Red Flowers', texture: 'flowers_red', w: 1, h: 1, placement: 'island', solid: false },
  { id: 'flowers_yellow', name: 'Yellow Flowers', texture: 'flowers_yellow', w: 1, h: 1, placement: 'island', solid: false },
  { id: 'flowers_blue', name: 'Blue Flowers', texture: 'flowers_blue', w: 1, h: 1, placement: 'island', solid: false },
  { id: 'flowers_pink', name: 'Pink Flowers', texture: 'flowers_pink', w: 1, h: 1, placement: 'island', solid: false },
  { id: 'tall_grass', name: 'Tall Grass', texture: 'tall_grass', w: 1, h: 1, placement: 'island', solid: false },
  { id: 'rock', name: 'Rock', texture: 'rock', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 2, y: 5, w: 12, h: 10 }] },
  { id: 'boulder', name: 'Boulder', texture: 'boulder', w: 2, h: 1, placement: 'island', solid: true, rects: [{ x: 2, y: 0, w: 28, h: 15 }] },
  { id: 'stump', name: 'Stump', texture: 'stump', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 3, y: 4, w: 10, h: 10 }] },
  // ---- decor
  { id: 'bench', name: 'Bench', texture: 'bench', w: 2, h: 1, placement: 'island', solid: true, rects: [{ x: 1, y: 2, w: 30, h: 12 }] },
  { id: 'lamp', name: 'Lamp Post', texture: 'lamp', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 5, y: 9, w: 6, h: 6 }] },
  { id: 'hole_sign', name: 'Hole Sign', texture: 'hole_sign', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 5, y: 9, w: 6, h: 6 }] },
  { id: 'sign', name: 'Signpost', texture: 'sign', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 5, y: 9, w: 6, h: 6 }] },
  { id: 'barrel', name: 'Barrel', texture: 'barrel', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 2, y: 2, w: 12, h: 13 }] },
  { id: 'crate', name: 'Crate', texture: 'crate', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 2, y: 2, w: 12, h: 12 }] },
  { id: 'umbrella', name: 'Beach Umbrella', texture: 'umbrella', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 6, y: 9, w: 4, h: 6 }] },
  { id: 'deck_chair', name: 'Deck Chair', texture: 'deck_chair', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 3, y: 0, w: 10, h: 15 }] },
  { id: 'shell', name: 'Seashell', texture: 'shell', w: 1, h: 1, placement: 'island', solid: false, ground: true },
  { id: 'starfish', name: 'Starfish', texture: 'starfish', w: 1, h: 1, placement: 'island', solid: false, ground: true },
  { id: 'tiki_torch', name: 'Tiki Torch', texture: 'tiki_torch', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 5, y: 10, w: 6, h: 5 }] },
  { id: 'ball_statue', name: 'Golf Ball Statue', texture: 'ball_statue', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 2, y: 2, w: 12, h: 13 }] },
  { id: 'mailbox', name: 'Mailbox', texture: 'mailbox', w: 1, h: 1, placement: 'island', solid: true, rects: [{ x: 5, y: 9, w: 6, h: 6 }] },
  { id: 'picnic_table', name: 'Picnic Table', texture: 'picnic_table', w: 2, h: 1, placement: 'island', solid: true, rects: [{ x: 1, y: 0, w: 30, h: 15 }] },
  { id: 'starter_board', name: 'Course Starter Board', texture: 'starter_board', w: 2, h: 1, placement: 'island', solid: true, interact: 'starter', rects: [{ x: 3, y: 8, w: 26, h: 7 }] },
  // ---- course pieces
  { id: 'bumper', name: 'Bumper', texture: 'bumper', w: 1, h: 1, placement: 'island', solid: true, special: 'bumper', circle: { x: 8, y: 8, r: 6 } },
  { id: 'boost', name: 'Boost Pad', texture: 'boost', w: 1, h: 1, placement: 'island', solid: false, ground: true, special: 'boost' },
  { id: 'spinner', name: 'Windmill Spinner', texture: 'spinner_base', w: 1, h: 1, placement: 'island', solid: true, special: 'spinner', circle: { x: 8, y: 8, r: 4 } },
  // ---- buildings
  {
    id: 'proshop', name: 'Pro Shop', texture: 'proshop', w: 5, h: 3, placement: 'island', solid: true, interact: 'proshop', fixed: true,
    rects: [{ x: 2, y: 0, w: 76, h: 32 }, { x: 2, y: 32, w: 30, h: 16 }, { x: 48, y: 32, w: 30, h: 16 }],
    door: { x: 2, y: 2 },
  },
  // ---- pro shop furniture
  { id: 'counter', name: 'Shop Counter', texture: 'counter', w: 3, h: 1, placement: 'shop', solid: true },
  { id: 'shelf_balls', name: 'Ball Shelf', texture: 'shelf_balls', w: 2, h: 1, placement: 'shop', solid: true },
  { id: 'club_rack', name: 'Club Rack', texture: 'club_rack', w: 2, h: 1, placement: 'shop', solid: true },
  { id: 'bag_stand', name: 'Golf Bag', texture: 'bag_stand', w: 1, h: 1, placement: 'shop', solid: true },
  { id: 'trophy_case', name: 'Trophy Case', texture: 'trophy_case', w: 2, h: 1, placement: 'shop', solid: true },
  { id: 'potted_plant', name: 'Potted Plant', texture: 'potted_plant', w: 1, h: 1, placement: 'shop', solid: true },
  { id: 'rug', name: 'Round Rug', texture: 'rug', w: 3, h: 2, placement: 'shop', solid: false, ground: true },
  { id: 'armchair', name: 'Armchair', texture: 'armchair', w: 1, h: 1, placement: 'shop', solid: true },
  { id: 'coffee_table', name: 'Coffee Table', texture: 'coffee_table', w: 2, h: 1, placement: 'shop', solid: true },
  { id: 'mirror', name: 'Dressing Mirror', texture: 'mirror', w: 1, h: 1, placement: 'shop', solid: true, interact: 'mirror' },
  { id: 'putting_mat', name: 'Indoor Green', texture: 'putting_mat', w: 4, h: 3, placement: 'shop', solid: false, ground: true },
  { id: 'poster', name: 'Course Poster', texture: 'poster', w: 1, h: 1, placement: 'shop-wall', solid: false, offsetY: 10 },
  { id: 'clock', name: 'Wall Clock', texture: 'clock', w: 1, h: 1, placement: 'shop-wall', solid: false, offsetY: 9 },
  { id: 'window', name: 'Window', texture: 'window', w: 2, h: 1, placement: 'shop-wall', solid: false, offsetY: 10 },
  { id: 'pennant', name: 'Pennant', texture: 'pennant', w: 1, h: 1, placement: 'shop-wall', solid: false, offsetY: 10 },
  { id: 'neon_open', name: 'Neon Sign', texture: 'neon_open', w: 2, h: 1, placement: 'shop-wall', solid: false, offsetY: 10 },
  { id: 'locker_door', name: 'Locker Room Door', texture: 'locker_door', w: 1, h: 1, placement: 'shop-wall', solid: false, offsetY: 16 },
  { id: 'sign_locker', name: 'Locker Room Sign', texture: 'sign_locker', w: 2, h: 1, placement: 'shop-wall', solid: false, offsetY: 8 },
];

export const OBJECTS: Record<string, ObjectDef> = Object.fromEntries(defs.map((d) => [d.id, d]));

export function objectDef(id: string): ObjectDef {
  const d = OBJECTS[id];
  if (!d) throw new Error(`Unknown object '${id}'`);
  return d;
}

/** Walk/ball collision boxes for a definition (px, relative to footprint top-left). */
export function objectRects(def: ObjectDef): Rect[] {
  if (!def.solid) return [];
  if (def.rects) return def.rects;
  if (def.circle) {
    const { x, y, r } = def.circle;
    return [{ x: x - r, y: y - r, w: r * 2, h: r * 2 }];
  }
  return [{ x: 1, y: 1, w: def.w * 16 - 2, h: def.h * 16 - 2 }];
}

// ---------------------------------------------------------------- editor palettes

export type DesignerTool =
  | { kind: 'terrain'; terrain: Terrain; name: string; icon: string; frame?: number }
  | { kind: 'wall'; wall: Wall; name: string; icon: string; frame?: number }
  | { kind: 'object'; id: string; name: string; icon: string; frame?: number }
  | { kind: 'tee'; name: string; icon: string; frame?: number }
  | { kind: 'cup'; name: string; icon: string; frame?: number };

export interface DesignerCategory {
  name: string;
  tools: DesignerTool[];
}

const obj = (id: string): DesignerTool => ({ kind: 'object', id, name: OBJECTS[id].name, icon: OBJECTS[id].texture });

export const ISLAND_CATEGORIES: DesignerCategory[] = [
  {
    name: 'Terrain',
    tools: [
      { kind: 'terrain', terrain: Terrain.Grass, name: 'Grass', icon: 'terrain_grass', frame: 15 },
      { kind: 'terrain', terrain: Terrain.Sand, name: 'Beach Sand', icon: 'terrain_sand', frame: 15 },
      { kind: 'terrain', terrain: Terrain.Water, name: 'Water', icon: 'water', frame: 0 },
      { kind: 'terrain', terrain: Terrain.Dirt, name: 'Dirt Path', icon: 'terrain_dirt', frame: 15 },
      { kind: 'terrain', terrain: Terrain.Stone, name: 'Stone Path', icon: 'terrain_stone', frame: 15 },
      { kind: 'terrain', terrain: Terrain.Brick, name: 'Brick Path', icon: 'terrain_brick', frame: 15 },
    ],
  },
  {
    name: 'Course',
    tools: [
      { kind: 'terrain', terrain: Terrain.Green, name: 'Putting Green', icon: 'terrain_green', frame: 15 },
      { kind: 'terrain', terrain: Terrain.Bunker, name: 'Sand Trap', icon: 'terrain_bunker', frame: 15 },
      { kind: 'tee', name: 'Tee', icon: 'tee' },
      { kind: 'cup', name: 'Cup & Flag', icon: 'flag', frame: 0 },
      obj('bumper'),
      { ...(obj('boost') as { kind: 'object'; id: string; name: string; icon: string }), frame: 2 },
      obj('spinner'),
      obj('starter_board'),
    ],
  },
  {
    name: 'Borders',
    tools: [
      { kind: 'wall', wall: Wall.RailWood, name: 'Cobble Border', icon: 'wall_rail_wood', frame: 10 },
      { kind: 'wall', wall: Wall.RailBrick, name: 'Brick Border', icon: 'wall_rail_brick', frame: 10 },
      { kind: 'wall', wall: Wall.RailStone, name: 'Stone Border', icon: 'wall_rail_stone', frame: 10 },
      { kind: 'wall', wall: Wall.FenceWhite, name: 'White Fence', icon: 'wall_fence_white', frame: 10 },
      { kind: 'wall', wall: Wall.FenceWood, name: 'Wood Fence', icon: 'wall_fence_wood', frame: 10 },
      { kind: 'wall', wall: Wall.Hedge, name: 'Hedge', icon: 'wall_hedge', frame: 10 },
    ],
  },
  {
    name: 'Nature',
    tools: ['tree_oak', 'tree_apple', 'tree_pine', 'tree_palm', 'bush', 'bush_berry', 'bush_flowers_white', 'bush_flowers_red', 'bush_flowers_orange', 'flower_bed', 'garden_plot', 'flowers_red', 'flowers_yellow', 'flowers_blue', 'flowers_pink', 'tall_grass', 'rock', 'boulder', 'stump'].map(obj),
  },
  {
    name: 'Decor',
    tools: ['hole_sign', 'bench', 'lamp', 'sign', 'barrel', 'crate', 'umbrella', 'deck_chair', 'shell', 'starfish', 'tiki_torch', 'ball_statue', 'mailbox', 'picnic_table'].map(obj),
  },
];

export const SHOP_FLOORS = ['wood', 'checker', 'carpet', 'tile'];
export const SHOP_WALLS = ['cream', 'stripe', 'panel', 'navy'];

export const SHOP_FURNITURE = ['counter', 'shelf_balls', 'club_rack', 'bag_stand', 'trophy_case', 'potted_plant', 'rug', 'armchair', 'coffee_table', 'mirror', 'putting_mat'];
export const SHOP_WALL_ITEMS = ['locker_door', 'sign_locker', 'poster', 'clock', 'window', 'pennant', 'neon_open'];

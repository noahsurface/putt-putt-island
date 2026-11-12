// Terrain types, how they draw, and how a golf ball behaves on them.

export enum Terrain {
  Water = 0,
  Sand = 1,
  Grass = 2,
  Dirt = 3,
  Stone = 4,
  Brick = 5,
  Green = 6,
  Bunker = 7,
}

export interface TerrainInfo {
  id: Terrain;
  name: string;
  /** Rolling deceleration in px/s² (higher = stops sooner). */
  friction: number;
  walkable: boolean;
  hazard?: boolean;
}

export const TERRAINS: Record<Terrain, TerrainInfo> = {
  [Terrain.Water]: { id: Terrain.Water, name: 'Water', friction: 0, walkable: false, hazard: true },
  [Terrain.Sand]: { id: Terrain.Sand, name: 'Beach Sand', friction: 520, walkable: true },
  [Terrain.Grass]: { id: Terrain.Grass, name: 'Grass', friction: 260, walkable: true },
  [Terrain.Dirt]: { id: Terrain.Dirt, name: 'Dirt Path', friction: 150, walkable: true },
  [Terrain.Stone]: { id: Terrain.Stone, name: 'Stone Path', friction: 115, walkable: true },
  [Terrain.Brick]: { id: Terrain.Brick, name: 'Brick Path', friction: 115, walkable: true },
  [Terrain.Green]: { id: Terrain.Green, name: 'Putting Green', friction: 72, walkable: true },
  [Terrain.Bunker]: { id: Terrain.Bunker, name: 'Sand Trap', friction: 760, walkable: true },
};

/**
 * Draw layers, bottom to top. Water is the animated background under everything.
 * A cell belongs to a layer if `member(terrain)` is true; tiles then auto-connect
 * to neighbours in the same layer.
 */
export const TERRAIN_LAYERS: { texture: string; member: (t: Terrain) => boolean }[] = [
  { texture: 'terrain_sand', member: (t) => t !== Terrain.Water },
  { texture: 'terrain_grass', member: (t) => t >= Terrain.Grass },
  { texture: 'terrain_dirt', member: (t) => t === Terrain.Dirt },
  { texture: 'terrain_stone', member: (t) => t === Terrain.Stone },
  { texture: 'terrain_brick', member: (t) => t === Terrain.Brick },
  { texture: 'terrain_green', member: (t) => t === Terrain.Green },
  { texture: 'terrain_bunker', member: (t) => t === Terrain.Bunker },
];

export enum Wall {
  None = 0,
  RailWood = 1,
  RailBrick = 2,
  RailStone = 3,
  FenceWhite = 4,
  Hedge = 5,
  FenceWood = 6,
}

export interface WallInfo {
  id: Wall;
  name: string;
  texture: string;
  /** Thickness in px of the wall's footprint (centred in the tile). */
  thickness: number;
  /** Bounciness when a ball hits it. */
  restitution: number;
}

export const WALLS: Record<Exclude<Wall, Wall.None>, WallInfo> = {
  [Wall.RailWood]: { id: Wall.RailWood, name: 'Cobble Border', texture: 'wall_rail_wood', thickness: 16, restitution: 0.75 },
  [Wall.RailBrick]: { id: Wall.RailBrick, name: 'Brick Border', texture: 'wall_rail_brick', thickness: 16, restitution: 0.7 },
  [Wall.RailStone]: { id: Wall.RailStone, name: 'Stone Border', texture: 'wall_rail_stone', thickness: 16, restitution: 0.68 },
  [Wall.FenceWhite]: { id: Wall.FenceWhite, name: 'White Fence', texture: 'wall_fence_white', thickness: 2, restitution: 0.6 },
  [Wall.FenceWood]: { id: Wall.FenceWood, name: 'Wood Fence', texture: 'wall_fence_wood', thickness: 2, restitution: 0.6 },
  [Wall.Hedge]: { id: Wall.Hedge, name: 'Hedge', texture: 'wall_hedge', thickness: 12, restitution: 0.35 },
};

/** Collision rectangles (cell-local px) for a wall given its neighbour mask (N=1,E=2,S=4,W=8). */
export function wallRects(thickness: number, mask: number): { x: number; y: number; w: number; h: number }[] {
  const c0 = Math.floor((16 - thickness) / 2);
  const c1 = c0 + thickness;
  const rects = [{ x: c0, y: c0, w: thickness, h: thickness }];
  if (mask & 1) rects.push({ x: c0, y: 0, w: thickness, h: c0 });
  if (mask & 4) rects.push({ x: c0, y: c1, w: thickness, h: 16 - c1 });
  if (mask & 8) rects.push({ x: 0, y: c0, w: c0, h: thickness });
  if (mask & 2) rects.push({ x: c1, y: c0, w: 16 - c1, h: thickness });
  return rects;
}

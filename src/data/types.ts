export interface Point {
  x: number;
  y: number;
}

/** A placed object instance. Coordinates are the top-left tile of its footprint. */
export interface PlacedObject {
  id: string; // catalog key
  x: number;
  y: number;
  /** 0..3 = N,E,S,W (used by boost pads). */
  rot?: number;
}

export interface HoleData {
  tee: Point | null;
  cup: Point | null;
  /** Optional par override; otherwise par is computed from the layout. */
  par?: number;
}

export interface IslandData {
  version: 1;
  name: string;
  width: number;
  height: number;
  terrain: number[];
  walls: number[];
  objects: PlacedObject[];
  course: { name: string; holes: HoleData[] };
}

export interface ShopData {
  floor: string;
  wall: string;
  objects: PlacedObject[];
}

export interface CharacterLook {
  name: string;
  skin: number;
  hair: string;
  hairColor: number;
  hat: string;
  hatColor: number;
  shirt: string;
  shirtColor: number;
  pants: string;
  pantsColor: number;
  shoesColor: number;
  ballColor: number;
}

export interface Settings {
  sfx: boolean;
  aimAssist: boolean;
}

export interface SaveData {
  version: 1;
  island: IslandData;
  shop: ShopData;
  /** characters[0] is the island owner; 1..3 are guest golfers. */
  characters: CharacterLook[];
  settings: Settings;
  bestScores: Record<string, number>;
}

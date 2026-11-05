// Shared state that lives across scene changes.
import type { Point } from '../data/types';
import { IslandMap } from '../world/IslandMap';
import { Save } from './Save';

let map: IslandMap | null = null;
let mapData: unknown = null;

export const Session = {
  /** The live island model (wraps Save.data.island, so edits are saved with it). */
  map(): IslandMap {
    if (!map || mapData !== Save.data.island) {
      map = new IslandMap(Save.data.island);
      mapData = Save.data.island;
    }
    return map;
  },
  /** Where the player should appear when returning to the island (world px). */
  spawn: null as Point | null,
};

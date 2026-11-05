// Persists the island, pro shop and characters in the browser's localStorage.
import { DEFAULT_LOOKS } from '../data/character';
import { createDefaultIsland, createDefaultShop } from '../data/defaultIsland';
import type { SaveData } from '../data/types';

const KEY = 'putt-putt-island/save/v1';

export function createNewSave(): SaveData {
  return {
    version: 1,
    island: createDefaultIsland(),
    shop: createDefaultShop(),
    characters: DEFAULT_LOOKS.map((l) => ({ ...l })),
    settings: { sfx: true, aimAssist: true },
    bestScores: {},
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isValid(d: unknown): d is SaveData {
  const s = d as SaveData;
  return !!s && s.version === 1 && !!s.island && Array.isArray(s.island.terrain) && s.island.terrain.length === s.island.width * s.island.height && !!s.shop && Array.isArray(s.characters);
}

class SaveStore {
  data: SaveData;
  /** True when this session started from a fresh island (no save found). */
  fresh = false;

  constructor() {
    this.data = this.load();
  }

  load(): SaveData {
    const raw = storage()?.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (isValid(parsed)) {
          // Fill in fields added after the save was made.
          const base = createNewSave();
          parsed.settings = { ...base.settings, ...parsed.settings };
          parsed.bestScores ??= {};
          while (parsed.characters.length < 4) parsed.characters.push({ ...DEFAULT_LOOKS[parsed.characters.length] });
          return parsed;
        }
      } catch {
        /* fall through to a new save */
      }
    }
    this.fresh = true;
    return createNewSave();
  }

  save() {
    try {
      storage()?.setItem(KEY, JSON.stringify(this.data));
      return true;
    } catch {
      return false;
    }
  }

  reset() {
    this.data = createNewSave();
    this.save();
  }

  /** The course id used for best scores (changes whenever holes are edited). */
  courseSignature() {
    return JSON.stringify(this.data.island.course.holes);
  }

  exportJson() {
    return JSON.stringify(this.data);
  }

  importJson(json: string) {
    const parsed = JSON.parse(json);
    if (!isValid(parsed)) throw new Error('Not a Putt-Putt Island save');
    this.data = parsed;
    this.save();
  }
}

export const Save = new SaveStore();

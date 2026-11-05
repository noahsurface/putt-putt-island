import { CHARACTER_LAYERS } from './assets';
import type { CharacterLook } from './types';

export const SKIN_TONES = [0xffe0c4, 0xf2c49b, 0xe0a878, 0xc68c5a, 0x9a6440, 0x6e4430, 0x4a2c1e];
export const HAIR_COLORS = [0x2a1a10, 0x5a3418, 0x8a5a2a, 0xc8903a, 0xf0d070, 0xe8e8e8, 0xc84a2a, 0xe05a8a, 0x4a7ae0, 0x3aa070, 0x7a4ac8];
export const CLOTH_COLORS = [0xe0483e, 0xff8a3a, 0xffd34a, 0x6fbf5a, 0x2f7d3c, 0x3fa0d8, 0x3f5fa0, 0x7a4ac8, 0xff8ab0, 0xffffff, 0xd8c8a0, 0x8a5a32, 0x3a3a44];
export const BALL_COLORS = [0xffffff, 0xff6a6a, 0x6ad0ff, 0xffe066, 0x8aff8a, 0xff9ad0, 0xffa64a, 0xb08aff];

export const NAME_IDEAS = ['Birdie', 'Bogey', 'Chip', 'Ace', 'Sandy', 'Fairway', 'Eagle', 'Putter', 'Divot', 'Tee', 'Wedge', 'Links', 'Mulligan', 'Caddie'];

export const DEFAULT_LOOKS: CharacterLook[] = [
  { name: 'Player 1', skin: 0xf2c49b, hair: 'short', hairColor: 0x5a3418, hat: 'cap', hatColor: 0xe0483e, shirt: 'tee', shirtColor: 0xffffff, pants: 'shorts', pantsColor: 0x3f5fa0, shoesColor: 0x8a5a32, ballColor: 0xffffff },
  { name: 'Player 2', skin: 0x9a6440, hair: 'curly', hairColor: 0x2a1a10, hat: 'none', hatColor: 0x2f7d3c, shirt: 'striped', shirtColor: 0x3fa0d8, pants: 'long', pantsColor: 0xd8c8a0, shoesColor: 0xffffff, ballColor: 0x6ad0ff },
  { name: 'Player 3', skin: 0xffe0c4, hair: 'long', hairColor: 0xf0d070, hat: 'straw', hatColor: 0xd8c8a0, shirt: 'tank', shirtColor: 0xff8ab0, pants: 'skirt', pantsColor: 0xffffff, shoesColor: 0xe0483e, ballColor: 0xff9ad0 },
  { name: 'Player 4', skin: 0xc68c5a, hair: 'ponytail', hairColor: 0xc84a2a, hat: 'visor', hatColor: 0xffffff, shirt: 'long', shirtColor: 0xffd34a, pants: 'shorts', pantsColor: 0x2f7d3c, shoesColor: 0x3a3a44, ballColor: 0xffe066 },
];

const pick = <T>(arr: readonly T[], r: () => number) => arr[Math.floor(r() * arr.length)];

export function randomLook(name: string, r: () => number = Math.random): CharacterLook {
  return {
    name,
    skin: pick(SKIN_TONES, r),
    hair: pick(CHARACTER_LAYERS.hair.filter((h) => h !== 'none'), r),
    hairColor: pick(HAIR_COLORS, r),
    hat: r() < 0.45 ? 'none' : pick(CHARACTER_LAYERS.hat.filter((h) => h !== 'none'), r),
    hatColor: pick(CLOTH_COLORS, r),
    shirt: pick(CHARACTER_LAYERS.shirt, r),
    shirtColor: pick(CLOTH_COLORS, r),
    pants: pick(CHARACTER_LAYERS.pants, r),
    pantsColor: pick(CLOTH_COLORS, r),
    shoesColor: pick(CLOTH_COLORS, r),
    ballColor: pick(BALL_COLORS, r),
  };
}

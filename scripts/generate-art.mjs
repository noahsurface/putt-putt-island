#!/usr/bin/env node
// Generates the placeholder pixel art into public/assets/.
//
//   npm run art         -> writes only files that don't exist yet (your own art is safe)
//   npm run art:force   -> regenerates everything, overwriting existing PNGs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureOutput, report } from './art/pix.mjs';
import { generateTerrain } from './art/terrain.mjs';
import { generateObjects } from './art/objects.mjs';
import { generateCharacter } from './art/character.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const force = process.argv.includes('--force');
configureOutput(root, force);
generateTerrain();
generateObjects();
generateCharacter();
const { written, skipped } = report();
console.log(`Wrote ${written.length} PNGs${skipped.length ? `, kept ${skipped.length} existing (use --force to overwrite)` : ''}.`);

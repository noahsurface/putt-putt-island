# Art Guide: replacing the placeholder graphics

Every image in the game is a PNG in `public/assets/`. The current files are
smooth, high-resolution placeholders drawn by `scripts/art-hd/` (Canvas 2D code
run in a headless browser). To use your own art, **overwrite a PNG with a file
of the same name, size and frame layout** and reload the game. No code changes
are needed.

> `npm run art` only creates files that are missing, so it never touches your
> art. `npm run art:force` redraws everything and **will** overwrite it.
> Both need Playwright: `npm i -D playwright && npx playwright install chromium`.

## Resolution

The game logic uses **16-unit tiles**, but the art is drawn at higher
resolution and scaled down:

| Kind | Texture px per world unit | One tile is |
| --- | --- | --- |
| World art (terrain, walls, objects, course, buildings, interior) | 4 | 64 × 64 px |
| Characters | 8 | 128 px wide |

The game renders at 1920×1080 with the camera at 4×, so world art appears at
exactly 1:1 (about 30 × 17 tiles on screen). Draw at the sizes below and
everything lines up.

## Style

Bright, flat cartoon art with soft speckled textures. Edges are a darker shade
of each colour rather than black lines, and trees and props cast big dark oval
shadows. Putting greens are lime with diagonal stripes and cut corners, ringed
by full-tile brown brick borders.

## Terrain: `assets/terrain/`

`sand`, `grass`, `dirt`, `stone` (grey gravel), `brick`, `green` and `bunker`.

* **1024×192** sheets: 16 columns × 3 rows of **64×64** tiles.
* The **column** is the neighbour mask: add N=1, E=2, S=4, W=8 for each side
  whose neighbour is the *same* terrain. Column 15 is the fully surrounded tile,
  column 0 an isolated one.
* The **row** is a texture variant, picked at random per tile.
* Layers stack: sand under everything, grass under paths and greens. Edges only
  need to look right over the layer beneath (grass over water gets the tan bank).

`water.png` is **512×128**: four seamless 128×128 animation frames.

## Walls: `assets/walls/`

`rail_wood` (the brown brick border), `rail_brick`, `rail_stone`, `fence_white`,
`fence_wood`, `hedge`.

* **1024×96** sheets: 16 frames of **64×96**, using the same N/E/S/W mask
  (a bit is set when that neighbour also has a wall).
* The bottom 64 rows are the map tile; the top 32 rows let the wall stand up.
  Borders fill the whole tile; fences are thin and centred. Collision thickness
  lives in `src/data/terrain.ts` (`WALLS[...].thickness`, in world units).
* `rail_*_corner.png` (**256×64**, four 64×64 frames: NW, NE, SE, SW) are brick
  triangles that fill a green's cut corner where it meets two borders.

## Objects: `assets/objects/`, `assets/interior/`, `assets/buildings/`

Single images, anchored at the **bottom centre** of their footprint (a 128×192
tree on a 1×1 footprint stands on its tile and overhangs upward). Footprints,
solidity and collision boxes are in `src/data/catalog.ts`.

| File | Size | Footprint |
| --- | --- | --- |
| tree_oak / tree_apple / tree_pine / tree_palm | 128×192 | 1×1 |
| bush, bush_berry, bush_flowers_*, flowers_*, tall_grass, rock, stump, crate, shell, starfish | 64×64 | 1×1 |
| flower_bed, garden_plot | 128×128 | 2×2 (flat, walkable) |
| boulder, bench, picnic_table | 128×96 | 2×1 |
| lamp, tiki_torch, ball_statue | 64×128 | 1×1 |
| sign, hole_sign, mailbox, deck_chair | 64×96 | 1×1 |
| barrel | 64×80 | 1×1 |
| umbrella, starter_board | 128×128 | 1×1 / 2×1 |
| buildings/proshop | 320×320 | 5×3 (door in the bottom-middle tile) |

Pro shop interior (`assets/interior/`): `floor_*` 64×64 tiles; `wall_*` 64×128
wall strips (dark wainscot at the bottom); `counter` 192×128; `shelf_balls`,
`club_rack`, `trophy_case` 128×128; `rug` 192×128; `putting_mat` (indoor green)
256×192; `bag_stand`, `potted_plant`, `mirror` 64×128; `armchair` 64×96;
`coffee_table` 128×96; wall decor `poster`, `clock`, `pennant` 64×64,
`window`, `neon_open`, `sign_locker` 128×64, `locker_door` 64×112;
`door_mat` 128×64.

## Course pieces: `assets/course/`

| File | Layout |
| --- | --- |
| `ball.png` | 32×32, drawn **white**: the game tints it to each player's ball colour |
| `ball_shadow.png` | 32×16 |
| `tee.png`, `cup.png` | 64×64 |
| `flag.png` | 18 frames of 96×128, one per hole number; the pole base is at (24, 112) |
| `bumper.png` | 2 frames of 64×64 (normal, lit when hit) |
| `boost.png` | 8 frames of 64×64: N, E, S, W × 2 animation frames |
| `spinner_base.png` | 64×64 hub |
| `spinner_blades.png` | 192×192, rotated around its centre |

## Characters: `assets/character/`

The golfer is built from **layers**. Each layer is a **768×960** sheet of
**128×192** frames, 6 columns × 5 rows:

```
           col 0   col 1   col 2   col 3   col 4   col 5
row 0  ↓   idle    stride  pass    stride  pass    putting stance
row 1  ↘   …
row 2  →   …
row 3  ↗   …
row 4  ↑   …
```

Left-facing directions (↙ ← ↖) mirror rows 1–3. Feet rest on **y = 184**. The
walk cycle plays columns 1–4 at 10 frames per second.

**Draw tintable layers in greyscale.** The game multiplies them by the
player's chosen colour: white becomes the chosen colour and greys become
shades of it.

| Layer | Tinted by |
| --- | --- |
| `body.png` (head, neck, legs, far arm) | skin tone |
| `arms.png` (near arm) | skin tone |
| `face.png` (eyes, mouth, blush) | **not tinted**: draw in full colour |
| `shirt_<style>.png`, `sleeves_<style>.png` | top colour |
| `shirtfx_striped.png`, `sleevesfx_striped.png` | **not tinted**: the white stripes |
| `pants_<style>.png` | bottoms colour |
| `shoes.png` | shoe colour |
| `hair_<style>.png` | hair colour |
| `hat_<style>.png` | hat colour |
| `shadow.png` (96×32) | not tinted |

Draw order (back to front): shadow, body, pants, shoes, shirt, shirtfx, arms,
sleeves, sleevesfx, face, hair, hat.

To **add a new style** (say `hair_mohawk.png`), add the PNG and then add
`'mohawk'` to `CHARACTER_LAYERS.hair` in `src/data/assets.ts`.

## UI: `assets/ui/`

* `panel.png`, `panel_dark.png`: 48×48 nine-slice frames with 16 px corners
  (deliberately chunky pixel art, kept crisp)
* `cursor.png`: two 16×16 frames for the editor cursor (pixel art)
* `icons.png`: 32×32 PuttPad app icons (pixel art). Order: designer, play,
  customize, shop, save, controls, home, course
* `lockers.png`: 480×520 wardrobe backdrop, shown at 1×

## Adding a brand-new decoration

1. Draw `public/assets/objects/my_thing.png` at 4 px per world unit
   (64 px per tile).
2. Add `'my_thing'` to `OBJECT_IMAGES` in `src/data/assets.ts`.
3. Add an entry to `defs` in `src/data/catalog.ts` with its footprint and
   whether it is solid.
4. Add `'my_thing'` to a category in `ISLAND_CATEGORIES` (same file).

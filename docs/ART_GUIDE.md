# Art Guide: replacing the placeholder graphics

Every image in the game is a PNG in `public/assets/`. The current files were
drawn by `scripts/generate-art.mjs`. To use your own art, **overwrite the PNG
with a file of the same name, size and frame layout**, then reload the game.
No code changes are needed.

> `npm run art` only creates files that are missing, so it never touches your
> art. `npm run art:force` regenerates everything and **will** overwrite it.

## Ground rules

* **Tile size is 16×16 px.** The game draws everything at 3× zoom with
  nearest-neighbour scaling, so keep it crisp pixel art at 1×.
* Transparent backgrounds (PNG alpha).
* **Sprite sheets** are frames laid out left to right with no padding.
* Objects are anchored at the **bottom centre** of their footprint, so a 32×48
  tree on a 1×1 footprint stands on its tile and overhangs upward.
* Shadows are baked into the sprites (soft translucent black ellipses).

## Terrain: `assets/terrain/`

`sand.png`, `grass.png`, `dirt.png`, `stone.png`, `brick.png`, `green.png`
(putting green) and `bunker.png` (sand trap).

* **256×48** sheet: 16 columns × 3 rows of 16×16 tiles.
* The **column** is the neighbour mask: add N=1, E=2, S=4, W=8 for each side
  whose neighbour is the *same* terrain. Column 15 is the fully surrounded
  middle tile, and column 0 is an isolated single tile.
* The **row** is a texture variant (the game picks one per tile at random so
  large areas don't look repetitive).
* Terrain stacks in layers: sand under everything, grass under paths and
  greens. Edges only need to look good over the layer beneath (grass over
  sand/water, sand over water, paths and greens over grass).

`water.png` is a **128×32** sheet of four 32×32 seamless animation frames that
tile across the whole sea.

## Walls: `assets/walls/`

`rail_wood.png`, `rail_brick.png`, `rail_stone.png`, `fence_white.png`,
`hedge.png`

* **256×24** sheet: 16 frames of 16×24, using the same N/E/S/W mask as terrain
  (a bit is set when that neighbour also has a wall).
* The bottom 16 rows line up with the map tile; the top 8 rows let the wall
  stand up. Keep the footprint centred: the ball collides with a centred bar
  whose thickness is set in `src/data/terrain.ts` (`WALLS[...].thickness`).

## Objects: `assets/objects/`, `assets/interior/`, `assets/buildings/`

Single images. Their footprint (in tiles), whether they block, and their
collision boxes are defined in `src/data/catalog.ts`. If you change an object's
size a lot, update its `w`/`h` and `rects` there too.

| File | Size | Footprint |
| --- | --- | --- |
| tree_oak / tree_pine / tree_palm | 32×48 | 1×1 |
| bush, bush_berry, flowers_*, tall_grass, rock, stump, crate, shell, starfish | 16×16 | 1×1 |
| boulder | 32×24 | 2×1 |
| bench, picnic_table | 32×24 | 2×1 |
| lamp, tiki_torch, ball_statue | 16×32 | 1×1 |
| sign, mailbox, deck_chair | 16×24 | 1×1 |
| barrel | 16×20 | 1×1 |
| umbrella, starter_board | 32×32 | 1×1 / 2×1 |
| buildings/proshop | 80×80 | 5×3 (door at the bottom-middle tile) |

Pro shop interior (`assets/interior/`): `floor_*.png` 16×16 tiles,
`wall_*.png` 16×32 wall strips (baseboard at the bottom), furniture such as
`counter` (48×32), `shelf_balls` / `club_rack` / `trophy_case` (32×32),
`rug` (48×32) and `putting_mat` (48×16), and wall decor (`poster`, `clock`,
`pennant` 16×16; `window`, `neon_open` 32×16).

## Course pieces: `assets/course/`

| File | Layout |
| --- | --- |
| `ball.png` | 8×8, drawn **white**: the game tints it to each player's ball colour |
| `ball_shadow.png` | 8×4 |
| `tee.png`, `cup.png` | 16×16 |
| `flag.png` | 18 frames of 24×32, one per hole number. The pole base sits at x=6, y=28 |
| `bumper.png` | 2 frames of 16×16 (normal, lit when hit) |
| `boost.png` | 8 frames of 16×16: direction N, E, S, W × 2 animation frames |
| `spinner_base.png` | 16×16 hub |
| `spinner_blades.png` | 48×48, rotated around its centre by the game |

## Characters: `assets/character/`

Characters are built from **layers**, each a **144×32** sheet of nine 16×32
frames:

```
frame:  0      1       2       3      4       5       6     7       8
        down   down    down    side   side    side    up    up      up
        stand  walk A  walk B  stand  walk A  walk B  stand walk A  walk B
```

Side frames face **right**; the game mirrors them for left. Feet touch row 30.

**Draw tintable layers in greyscale.** The game multiplies them by the
player's chosen colour, so white becomes the chosen colour and greys become
shades of it. Use white for highlights, light greys for midtones, mid grey for
shadows and dark grey for outlines.

| Layer | Tinted by |
| --- | --- |
| `body.png` (head, neck, legs) | skin tone |
| `arms.png` | skin tone |
| `face.png` (eyes, blush) | **not tinted**: draw in full colour |
| `shirt_<style>.png`, `sleeves_<style>.png` | top colour |
| `pants_<style>.png` | bottoms colour |
| `shoes.png` | shoe colour |
| `hair_<style>.png` | hair colour |
| `hat_<style>.png` | hat colour |
| `shadow.png` (16×6) | not tinted |

Draw order (back to front): shadow, body, pants, shoes, shirt, arms, sleeves,
face, hair, hat.

To **add a new style** (say `hair_mohawk.png`), add the PNG and then add
`'mohawk'` to `CHARACTER_LAYERS.hair` in `src/data/assets.ts`. It will then
appear in the wardrobe.

## UI: `assets/ui/`

* `panel.png`, `panel_dark.png`: 48×48 nine-slice frames with 16 px corners
  (drawn at 2×)
* `cursor.png`: two 16×16 frames for the editor cursor
* `icons.png`: 32×32 PuttPad app icons. Order: designer, play, customize,
  shop, save, controls, home, course

## Adding a brand-new decoration

1. Draw `public/assets/objects/my_thing.png`.
2. Add `'my_thing'` to `OBJECT_IMAGES` in `src/data/assets.ts`.
3. Add an entry to `defs` in `src/data/catalog.ts` with its footprint and
   whether it is solid.
4. Add `'my_thing'` to a category in `ISLAND_CATEGORIES` (same file).

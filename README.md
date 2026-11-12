# ⛳ Putt-Putt Island

A cozy, top-down island mini-golf game. Build your island, design your own
mini-golf course, decorate your pro shop, dress up your golfer, then play a
round with up to four friends on one screen.

* **Explore** your island, Stardew-style.
* **Island Designer**: paint terrain (grass, beach, water, paths), build rails,
  fences and hedges, and place trees, flowers and decorations, Animal Crossing
  style.
* **Course builder**: lay putting greens and sand traps, then add tees, cups,
  bumpers, boost pads and windmill spinners for up to 18 holes. Par is
  worked out for you.
* **Pro Shop**: walk inside and decorate it with furniture, wall decor,
  flooring and wallpaper.
* **Customize your golfer**: skin tone, hair, hats, outfits, shoes and ball
  colour.
* **Local multiplayer**: 1–4 players, each on their own controller (or one on
  the keyboard). Turn order follows golf etiquette: whoever is farthest from
  the cup goes next.
* **Fully gamepad-driven.** Every screen works with a controller, and the
  on-screen prompts switch between controller buttons and keyboard keys
  automatically.

The game runs at **1920×1080** with smooth, high-resolution art. All of it is
**placeholder art** drawn by a script, so you can replace any image with your own.
See [docs/ART_GUIDE.md](docs/ART_GUIDE.md).

## Play it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173), then press a button
on your controller so the browser detects it.

## Controls

| Action | Controller (Xbox layout) | Keyboard |
| --- | --- | --- |
| Move / aim / menus | Left stick, D-pad | WASD / arrow keys |
| Interact, place, **hold to putt** | A | Space / Enter |
| Back, remove · hold to run | B | Esc / Backspace · Shift runs |
| Rotate boost pad / next hole number | X | R |
| Look around (golf) · zoom (designer) | Y | F |
| Previous / next item · fine aim | LB / RB | Q / E |
| Previous / next category | LT / RT | Z / C |
| PuttPad menu / pause | Start (≡) | Tab or P |
| Pan camera | Right stick | I J K L |
| Toggle zoom while golfing | View / Back | M |

**Putting:** tilt the stick to aim (LB/RB for fine adjustments), hold **A**
to charge the power meter, and release to putt. Press **B** while charging to
cancel. Water adds a one-stroke penalty and returns the ball to where you hit
it from, and each hole is capped at 8 strokes.

## Building a course

1. Press **Start** to open the PuttPad and choose **Island Designer**.
2. **Course** tab: paint **Putting Green** (hold A and move to paint).
3. **Borders** tab: surround it with rails so the ball stays in.
4. **Course** tab again: choose **Tee**, press **X** to pick the hole number,
   and place it; do the same with **Cup & Flag**.
5. Add **bumpers**, **boost pads** (X rotates them), **windmill spinners** and
   **sand traps** for spice.
6. Press **Start** to finish. The island saves automatically.

Walk up to the **PLAY** starter board (or use the PuttPad) to start a round.

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm test` | Run unit tests (physics, map rules, a bot that plays every default hole) |
| `npm run build` | Type-check and build a static site into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run art` | Draw any missing placeholder PNGs (never overwrites your art; needs Playwright) |
| `npm run art:force` | Redraw **all** placeholder PNGs (overwrites!) |

Built with [Phaser 3](https://phaser.io), TypeScript and Vite. Saves are kept
in the browser's localStorage.

### Project layout

```
public/assets/       PNG art (terrain, walls, objects, course, character, interior, ui)
scripts/art-hd/      HD placeholder art generator (Canvas 2D code rendered in headless Chromium)
src/
  config.ts          tile size, zoom, screen size, fonts
  data/              catalogue of placeable items, terrain types, default island, characters
  systems/           input (keyboard + 4 gamepads), save, sound effects, session state
  world/             island model, golf physics, map renderer, layered character sprite
  scenes/            Title, Island (explore + designer), ProShop, Customize, Join, Golf
  ui/                panels, menus, button prompts, PuttPad, editor HUD
tests/               Vitest unit tests
```

### Hosting on GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the game and publishes it
whenever `main` changes. Turn it on once under **Settings → Pages → Build and
deployment → Source: GitHub Actions**. The game will then be at
`https://<your-user>.github.io/putt-putt-island/`.

## Roadmap ideas

* Hand-drawn art (see the art guide) and music
* Slopes and ramps, moving obstacles, teleporters
* Multiple saved courses, plus sharing courses as codes
* A shop economy where you earn coins from rounds to unlock decorations
* Simultaneous (non-turn-based) party mode
* Desktop build (Electron/Tauri) for Steam Deck and couch play

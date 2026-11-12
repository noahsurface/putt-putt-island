import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, MAX_PLAYERS } from '../config';
import { Input, deviceLabel, type DeviceId } from '../systems/Input';
import { Save } from '../systems/Save';
import { Session } from '../systems/Session';
import { Sfx } from '../systems/Sfx';
import { glyph, panel, PromptBar, text } from '../ui/widgets';
import { CharacterSprite } from '../world/CharacterSprite';
import { BaseScene } from './BaseScene';

export interface RoundPlayer {
  device: DeviceId;
  char: number;
}

export interface RoundSetup {
  players: RoundPlayer[];
  holes: number[];
  back: string;
}

interface JoinState {
  slots: (RoundPlayer | null)[];
  courseOpt: number;
  back: string;
}

// Kept between visits so customizing a golfer doesn't reset the lobby.
let saved: JoinState | null = null;

const CARD_W = 270;
const CARD_H = 380;

export class JoinScene extends BaseScene {
  private state!: JoinState;
  private cards: Phaser.GameObjects.Container[] = [];
  private courseText!: Phaser.GameObjects.Text;
  private prompts!: PromptBar;
  private options: { label: string; holes: number[] }[] = [];
  private style: boolean | null = null;

  constructor() {
    super('Join');
  }

  init(data: { back?: string; resume?: boolean }) {
    if (data.resume && saved) this.state = saved;
    else this.state = { slots: [null, null, null, null], courseOpt: 0, back: data.back ?? 'Island' };
    saved = this.state;
  }

  create() {
    this.setupLayers('ui');
    this.cameras.main.setBackgroundColor('#4f9a5a');
    const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'terrain_grass', 15).setOrigin(0).setTileScale(0.75);
    this.w(bg);
    this.u(text(this, GAME_WIDTH / 2, 50, 'Round Setup', 52, COLORS.gold, { stroke: '#2a1a10', strokeThickness: 10, fontStyle: 'bold' }).setOrigin(0.5));
    this.u(text(this, GAME_WIDTH / 2, 98, 'Each golfer presses A on their own controller (or Space on the keyboard) to join', 21, '#ffffff', { stroke: '#2a1a10', strokeThickness: 5 }).setOrigin(0.5));

    const holes = Session.map().playableHoles();
    const n = holes.length;
    const idx = holes.map((h) => h.index);
    this.options = [{ label: `All ${n} holes`, holes: idx }];
    if (n >= 4) {
      this.options.push({ label: `Front ${Math.ceil(n / 2)}`, holes: idx.slice(0, Math.ceil(n / 2)) });
      this.options.push({ label: `Back ${Math.floor(n / 2)}`, holes: idx.slice(Math.ceil(n / 2)) });
    }
    holes.forEach((h) => this.options.push({ label: `Hole ${h.index + 1} only (par ${h.par})`, holes: [h.index] }));
    this.state.courseOpt = Math.min(this.state.courseOpt, this.options.length - 1);

    const cp = this.u(this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 128));
    cp.add(panel(this, -300, -34, 600, 68, true));
    this.courseText = text(this, 0, 0, '', 26, '#ffffff').setOrigin(0.5);
    cp.add(this.courseText);
    this.prompts = new PromptBar(this, this.ui);
    this.buildCards();
  }

  private buildCards() {
    for (const c of this.cards) c.destroy();
    this.cards = [];
    this.style = Input.isGamepadStyle();
    const gap = 26;
    const total = MAX_PLAYERS * CARD_W + (MAX_PLAYERS - 1) * gap;
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const x = GAME_WIDTH / 2 - total / 2 + i * (CARD_W + gap);
      const c = this.u(this.add.container(x, 140));
      const slot = this.state.slots[i];
      c.add(panel(this, 0, 0, CARD_W, CARD_H, !slot));
      c.add(text(this, CARD_W / 2, 34, `Player ${i + 1}`, 26, slot ? COLORS.green : '#c8c8d8', { fontStyle: 'bold' }).setOrigin(0.5));
      if (!slot) {
        const anyPad = Input.connected().length > 1;
        const g = glyph(this, 'A', 0, 160, anyPad);
        g.container.setX(CARD_W / 2 - g.width / 2);
        c.add(g.container);
        c.add(text(this, CARD_W / 2, 220, anyPad ? 'Press to join\n(Space on keyboard)' : 'Press to join', 22, '#ffffff', { align: 'center' }).setOrigin(0.5, 0));
      } else {
        const look = Save.data.characters[slot.char];
        const ch = new CharacterSprite(this, CARD_W / 2, 230, look);
        ch.setScale(7);
        c.add(ch);
        c.add(text(this, CARD_W / 2, 252, look.name, 26, COLORS.ink, { fontStyle: 'bold' }).setOrigin(0.5));
        c.add(text(this, CARD_W / 2, 282, deviceLabel(slot.device), 17, COLORS.inkSoft).setOrigin(0.5));
        const ball = this.add.image(CARD_W / 2 - 60, 282, 'ball').setScale(0.75).setTint(look.ballColor);
        c.add(ball);
        const pad = slot.device !== 'kb';
        const g1 = glyph(this, 'X', 26, 312, pad);
        c.add(g1.container);
        c.add(text(this, 30 + g1.width, 325, 'Switch golfer', 17, COLORS.ink).setOrigin(0, 0.5));
        const g2 = glyph(this, 'Y', 26, 344, pad);
        c.add(g2.container);
        c.add(text(this, 30 + g2.width, 357, 'Customize', 17, COLORS.ink).setOrigin(0, 0.5));
      }
      this.cards.push(c);
    }
  }

  private joined() {
    return this.state.slots.filter((s): s is RoundPlayer => !!s);
  }

  private nextFreeChar(from: number) {
    const used = new Set(this.joined().map((p) => p.char));
    for (let k = 0; k < Save.data.characters.length; k++) {
      const c = (from + k) % Save.data.characters.length;
      if (!used.has(c)) return c;
    }
    return from;
  }

  update() {
    if (this.isLeaving) return;
    const s = this.state;
    let dirty = this.style !== Input.isGamepadStyle();

    for (const dev of Input.devicesPressing('A')) {
      if (s.slots.some((p) => p?.device === dev)) continue;
      const free = s.slots.findIndex((p) => !p);
      if (free < 0) continue;
      s.slots[free] = { device: dev, char: this.nextFreeChar(free) };
      Sfx.select();
      dirty = true;
    }
    s.slots.forEach((p, i) => {
      if (!p) return;
      if (Input.pressed('X', p.device)) {
        const used = new Set(this.joined().filter((q) => q !== p).map((q) => q.char));
        let c = p.char;
        do c = (c + 1) % Save.data.characters.length; while (used.has(c) && c !== p.char);
        p.char = c;
        Sfx.move();
        dirty = true;
      }
      if (Input.pressed('Y', p.device)) {
        Sfx.select();
        this.go('Customize', { slot: p.char, back: 'Join', backData: { resume: true } });
      }
      if (Input.pressed('B', p.device)) {
        s.slots[i] = null;
        Sfx.back();
        dirty = true;
        Input.consume();
      }
    });
    if (!this.joined().length && Input.pressed('B')) {
      Sfx.back();
      this.go(s.back);
      return;
    }
    if (Input.repeat('RB') || Input.repeat('RT')) { s.courseOpt = (s.courseOpt + 1) % this.options.length; Sfx.move(); }
    if (Input.repeat('LB') || Input.repeat('LT')) { s.courseOpt = (s.courseOpt - 1 + this.options.length) % this.options.length; Sfx.move(); }
    this.courseText.setText(`⛳  ${this.options[s.courseOpt]?.label ?? 'No holes'}`);

    const ready = this.joined().length > 0 && this.options.length > 0;
    this.prompts.set([
      { btns: 'A', label: 'Join' },
      { btns: 'B', label: ready ? 'Leave' : 'Back' },
      { btns: ['LB', 'RB'], label: 'Holes' },
      ...(ready ? [{ btns: 'START' as const, label: 'Tee off!' }] : []),
    ]);
    this.prompts.update();
    if (ready && Input.pressed('START')) {
      Sfx.select();
      const setup: RoundSetup = { players: this.joined().map((p) => ({ ...p })), holes: this.options[s.courseOpt].holes, back: s.back };
      saved = null;
      this.go('Golf', setup);
      return;
    }
    if (dirty) this.buildCards();
  }
}

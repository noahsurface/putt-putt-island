import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CHARACTER_LAYERS } from '../data/assets';
import { BALL_COLORS, CLOTH_COLORS, HAIR_COLORS, NAME_IDEAS, SKIN_TONES, randomLook } from '../data/character';
import type { CharacterLook } from '../data/types';
import { Input } from '../systems/Input';
import { Save } from '../systems/Save';
import { Sfx } from '../systems/Sfx';
import { Menu, panel, PromptBar, text, type MenuItem } from '../ui/widgets';
import { CharacterSprite, FACINGS_CLOCKWISE, type Facing } from '../world/CharacterSprite';
import { BaseScene } from './BaseScene';

const NICE: Record<string, string> = {
  none: 'None', short: 'Short', spiky: 'Spiky', long: 'Long', ponytail: 'Ponytail', bob: 'Bob', curly: 'Curly',
  cap: 'Cap', visor: 'Visor', bucket: 'Bucket Hat', beanie: 'Beanie', straw: 'Sun Hat',
  tee: 'T-Shirt', striped: 'Striped Tee', tank: 'Tank Top', shorts: 'Shorts', skirt: 'Skirt',
};
const nice = (s: string, kind?: string) => (kind === 'pants' && s === 'long' ? 'Long Pants' : kind === 'shirt' && s === 'long' ? 'Long Sleeves' : NICE[s] ?? s);

const KEYS = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ-\'!?', 'abcdefghij', 'klmnopqrst', 'uvwxyz0123'];
const MAX_NAME = 10;

export class CustomizeScene extends BaseScene {
  private slot = 0;
  private back = 'Title';
  private backData: object | undefined;
  private look!: CharacterLook;
  private preview!: CharacterSprite;
  private menu!: Menu;
  private prompts!: PromptBar;
  private facing: Facing = 'down';
  private walking = false;
  private kb: Phaser.GameObjects.Container | null = null;
  private kbPos = { r: 0, c: 0 };
  private kbName = '';
  private kbText!: Phaser.GameObjects.Text;
  private kbCells: Phaser.GameObjects.Text[][] = [];
  private ballImg!: Phaser.GameObjects.Image;

  constructor() {
    super('Customize');
  }

  init(data: { slot?: number; back?: string; backData?: object }) {
    this.slot = data.slot ?? 0;
    this.back = data.back ?? 'Title';
    this.backData = data.backData;
  }

  create() {
    this.setupLayers('ui');
    this.kb = null;
    this.cameras.main.setBackgroundColor('#0b0d10');
    this.look = { ...Save.data.characters[this.slot] };

    this.u(text(this, 330, 52, this.slot === 0 ? 'Your Golfer' : `Golfer ${this.slot + 1}`, 44, COLORS.gold, { stroke: '#2a1a10', strokeThickness: 9, fontStyle: 'bold' }).setOrigin(0.5));
    // Locker-room backdrop (assets/ui/lockers.png) behind the preview.
    this.u(this.add.image(90, 100, 'ui_lockers').setOrigin(0));
    const frame = this.u(this.add.graphics());
    frame.lineStyle(6, 0x0b0d10, 1).strokeRoundedRect(90, 100, 480, 520, 18);
    this.preview = this.u(new CharacterSprite(this, 330, 560, this.look)).setScale(17);
    this.ballImg = this.u(this.add.image(486, 556, 'ball').setScale(1.5));

    const opt = (label: string, get: () => string, list: readonly unknown[], key: keyof CharacterLook): MenuItem => ({
      label: () => `${label}: ${get()}`,
      onLeft: () => this.cycle(key, list, -1),
      onRight: () => this.cycle(key, list, 1),
    });
    const colorIdx = (list: number[], v: number) => `${list.indexOf(v) + 1}/${list.length}`;
    const items: MenuItem[] = [
      { label: () => `Name: ${this.look.name}`, onSelect: () => this.openKeyboard() },
      opt('Skin', () => colorIdx(SKIN_TONES, this.look.skin), SKIN_TONES, 'skin'),
      opt('Hair', () => nice(this.look.hair), CHARACTER_LAYERS.hair, 'hair'),
      opt('Hair colour', () => colorIdx(HAIR_COLORS, this.look.hairColor), HAIR_COLORS, 'hairColor'),
      opt('Hat', () => nice(this.look.hat), CHARACTER_LAYERS.hat, 'hat'),
      opt('Hat colour', () => colorIdx(CLOTH_COLORS, this.look.hatColor), CLOTH_COLORS, 'hatColor'),
      opt('Top', () => nice(this.look.shirt, 'shirt'), CHARACTER_LAYERS.shirt, 'shirt'),
      opt('Top colour', () => colorIdx(CLOTH_COLORS, this.look.shirtColor), CLOTH_COLORS, 'shirtColor'),
      opt('Bottoms', () => nice(this.look.pants, 'pants'), CHARACTER_LAYERS.pants, 'pants'),
      opt('Bottoms colour', () => colorIdx(CLOTH_COLORS, this.look.pantsColor), CLOTH_COLORS, 'pantsColor'),
      opt('Shoes colour', () => colorIdx(CLOTH_COLORS, this.look.shoesColor), CLOTH_COLORS, 'shoesColor'),
      opt('Golf ball', () => colorIdx(BALL_COLORS, this.look.ballColor), BALL_COLORS, 'ballColor'),
      { label: 'Surprise me!', onSelect: () => { this.look = randomLook(this.look.name); this.apply(); } },
      { label: 'Done', onSelect: () => this.finish() },
    ];
    this.menu = new Menu(this, this.ui, 930, GAME_HEIGHT / 2 - 10, items, { width: 520, rowH: 38, size: 22, title: 'Wardrobe' });
    this.menu.onCancel = () => this.finish();
    this.prompts = new PromptBar(this, this.ui);
    this.prompts.set([
      { btns: ['UP', 'DOWN'], label: 'Choose' },
      { btns: ['LEFT', 'RIGHT'], label: 'Change' },
      { btns: ['LB', 'RB'], label: 'Turn' },
      { btns: 'Y', label: 'Walk' },
      { btns: 'B', label: 'Done' },
    ]);
    this.apply();
  }

  private cycle(key: keyof CharacterLook, list: readonly unknown[], d: number) {
    const cur = list.indexOf(this.look[key] as never);
    const next = list[(cur + d + list.length) % list.length];
    (this.look as unknown as Record<string, unknown>)[key] = next;
    this.apply();
  }

  private apply() {
    this.preview.setLook(this.look);
    this.preview.setFacing(this.facing).setWalking(this.walking);
    this.ballImg.setTint(this.look.ballColor);
    this.menu?.refresh();
  }

  private finish() {
    Save.data.characters[this.slot] = { ...this.look };
    Save.save();
    Sfx.select();
    this.go(this.back, this.backData);
  }

  // ------------------------------------------------------------------ keyboard
  private openKeyboard() {
    this.menu.active = false;
    this.kbName = this.look.name;
    this.kbPos = { r: 0, c: 0 };
    const c = this.u(this.add.container(0, 0));
    this.kb = c;
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0));
    const W = 640, H = 470, x0 = GAME_WIDTH / 2 - W / 2, y0 = GAME_HEIGHT / 2 - H / 2;
    c.add(panel(this, x0, y0, W, H));
    c.add(text(this, GAME_WIDTH / 2, y0 + 40, 'Golfer name', 28, COLORS.green, { fontStyle: 'bold' }).setOrigin(0.5));
    const field = this.add.graphics();
    field.fillStyle(0xffffff, 0.8).fillRoundedRect(x0 + 120, y0 + 66, W - 240, 50, 10);
    c.add(field);
    this.kbText = text(this, GAME_WIDTH / 2, y0 + 91, '', 30, COLORS.ink).setOrigin(0.5);
    c.add(this.kbText);
    this.kbCells = [];
    const rows = [...KEYS.map((r) => [...r]), ['␣', '⌫', '🎲', 'OK']];
    rows.forEach((row, r) => {
      const cells: Phaser.GameObjects.Text[] = [];
      const cw = r === rows.length - 1 ? 120 : 52;
      row.forEach((ch, i) => {
        const x = GAME_WIDTH / 2 - (row.length * cw) / 2 + i * cw + cw / 2;
        const t = text(this, x, y0 + 152 + r * 40, ch, 24, COLORS.ink).setOrigin(0.5);
        cells.push(t);
        c.add(t);
      });
      this.kbCells.push(cells);
    });
    c.add(text(this, GAME_WIDTH / 2, y0 + H - 26, 'Type on your keyboard, or pick letters with the stick.  B: delete · START: done', 16, COLORS.inkSoft).setOrigin(0.5));
    this.refreshKeyboard();
  }

  private refreshKeyboard() {
    this.kbText.setText(this.kbName + (Math.floor(this.time.now / 400) % 2 ? '_' : ' '));
    this.kbCells.forEach((row, r) => row.forEach((t, i) => {
      const on = r === this.kbPos.r && i === this.kbPos.c;
      t.setColor(on ? '#ffffff' : COLORS.ink).setBackgroundColor(on ? '#e0483e' : 'rgba(0,0,0,0)').setPadding(6, 2, 6, 2);
    }));
  }

  private closeKeyboard(save: boolean) {
    if (save && this.kbName.trim()) this.look.name = this.kbName.trim();
    this.kb?.destroy();
    this.kb = null;
    this.menu.active = true;
    Input.consume();
    this.apply();
  }

  private updateKeyboard() {
    const typed = Input.typedChars();
    if (typed.length) {
      for (const ch of typed) {
        if (ch === '\b') this.kbName = this.kbName.slice(0, -1);
        else if (ch === '\n') { this.closeKeyboard(true); return; }
        else if (this.kbName.length < MAX_NAME) this.kbName += ch;
      }
      Sfx.move();
      Input.consume();
      this.refreshKeyboard();
      return;
    }
    const rows = this.kbCells.length;
    const p = this.kbPos;
    if (Input.repeat('UP')) p.r = (p.r - 1 + rows) % rows;
    if (Input.repeat('DOWN')) p.r = (p.r + 1) % rows;
    if (Input.repeat('LEFT')) p.c--;
    if (Input.repeat('RIGHT')) p.c++;
    const len = this.kbCells[p.r].length;
    p.c = (p.c + len) % len;
    if (Input.pressed('A')) {
      const ch = this.kbCells[p.r][p.c].text;
      if (ch === 'OK') { Sfx.select(); this.closeKeyboard(true); return; }
      if (ch === '⌫') this.kbName = this.kbName.slice(0, -1);
      else if (ch === '🎲') this.kbName = NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)];
      else if (this.kbName.length < MAX_NAME) this.kbName += ch === '␣' ? ' ' : ch;
      Sfx.move();
    }
    if (Input.pressed('B')) {
      if (this.kbName.length) this.kbName = this.kbName.slice(0, -1);
      else { Sfx.back(); this.closeKeyboard(false); return; }
    }
    if (Input.pressed('START')) { Sfx.select(); this.closeKeyboard(true); return; }
    this.refreshKeyboard();
  }

  update(_t: number, delta: number) {
    this.prompts.update();
    this.preview.tick(delta);
    if (this.isLeaving) return;
    if (this.kb) {
      this.updateKeyboard();
      return;
    }
    // Turn through all 8 directions.
    const order = FACINGS_CLOCKWISE;
    if (Input.repeat('RB')) { this.facing = order[(order.indexOf(this.facing) + 1) % 8]; this.apply(); }
    if (Input.repeat('LB')) { this.facing = order[(order.indexOf(this.facing) + 7) % 8]; this.apply(); }
    if (Input.pressed('Y')) { this.walking = !this.walking; this.apply(); }
    this.menu.update();
  }
}

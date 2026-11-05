import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TILE, ZOOM } from '../config';
import type { CharacterLook } from '../data/types';
import { Input, deviceLabel, type DeviceId } from '../systems/Input';
import { Save } from '../systems/Save';
import { Session } from '../systems/Session';
import { Sfx } from '../systems/Sfx';
import { banner, Menu, panel, PromptBar, text } from '../ui/widgets';
import { CharacterSprite } from '../world/CharacterSprite';
import { BallSim, traceAim, type BallEvent } from '../world/golfPhysics';
import { IslandMap, type PlayableHole } from '../world/IslandMap';
import { WorldRenderer } from '../world/WorldRenderer';
import { BaseScene } from './BaseScene';
import type { RoundSetup } from './JoinScene';

const MAX_STROKES = 8;
const CHARGE_RATE = 0.85; // full power sweeps per second
const MAX_ROLL_TIME = 25;

type Phase = 'intro' | 'aim' | 'charge' | 'rolling' | 'wait' | 'card' | 'final' | 'paused';

interface Golfer {
  device: DeviceId;
  look: CharacterLook;
  ball: BallSim;
  ballImg: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  sprite: CharacterSprite;
  scores: (number | null)[];
  strokes: number;
  done: boolean;
  teed: boolean;
  lastSafe: { x: number; y: number };
  aim: number;
  hidden: boolean;
}

function scoreName(strokes: number, par: number) {
  if (strokes === 1) return 'Hole in One!';
  const d = strokes - par;
  return d <= -3 ? 'Albatross!' : d === -2 ? 'Eagle!' : d === -1 ? 'Birdie!' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : d === 2 ? 'Double Bogey' : `+${d}`;
}

function relPar(n: number) {
  return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`;
}

export class GolfScene extends BaseScene {
  private setup!: RoundSetup;
  private map!: IslandMap;
  private worldView!: WorldRenderer;
  private holes: PlayableHole[] = [];
  private holeIdx = 0;
  private golfers: Golfer[] = [];
  private current = 0;
  private phase: Phase = 'intro';
  private prevPhase: Phase = 'aim';
  private simTime = 0;
  private power = 0;
  private powerDir = 1;
  private rollTime = 0;
  private camTarget!: Phaser.GameObjects.Zone;
  private lookOffset = new Phaser.Math.Vector2();
  private guide!: Phaser.GameObjects.Graphics;
  private putter!: Phaser.GameObjects.Graphics;
  private prompts!: PromptBar;
  private holeText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private board!: Phaser.GameObjects.Container;
  private meter!: Phaser.GameObjects.Container;
  private meterFill!: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Container | null = null;
  private menu: Menu | null = null;
  private introTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super('Golf');
  }

  init(data: RoundSetup) {
    this.setup = data;
  }

  create() {
    this.setupLayers();
    this.map = Session.map();
    this.worldView = new WorldRenderer(this, this.map, this.world);
    this.events.once('shutdown', () => this.worldView.destroy());
    const all = this.map.playableHoles();
    this.holes = this.setup.holes.map((i) => all.find((h) => h.index === i)).filter((h): h is PlayableHole => !!h);
    if (!this.holes.length) {
      this.go(this.setup.back);
      return;
    }
    this.golfers = this.setup.players.map((p) => {
      const look = Save.data.characters[p.char];
      const ball = new BallSim(0, 0);
      const shadow = this.w(this.add.image(0, 0, 'ball_shadow'));
      const ballImg = this.w(this.add.image(0, 0, 'ball').setTint(look.ballColor));
      const sprite = this.w(new CharacterSprite(this, 0, 0, look)).setVisible(false);
      return { device: p.device, look, ball, ballImg, shadow, sprite, scores: this.holes.map(() => null), strokes: 0, done: false, teed: false, lastSafe: { x: 0, y: 0 }, aim: 0, hidden: false };
    });
    this.guide = this.w(this.add.graphics().setDepth(1e5));
    this.putter = this.w(this.add.graphics());
    this.camTarget = this.w(this.add.zone(0, 0, 1, 1));
    const cam = this.cameras.main;
    cam.setBounds(-TILE * 6, -TILE * 6, (this.map.w + 12) * TILE, (this.map.h + 12) * TILE);
    cam.startFollow(this.camTarget, true, 0.1, 0.1);

    // HUD
    const hp = this.u(this.add.container(16, 14));
    hp.add(panel(this, 0, 0, 300, 96, true));
    this.holeText = text(this, 24, 18, '', 26, COLORS.gold, { fontStyle: 'bold' });
    this.turnText = text(this, 24, 52, '', 20, '#ffffff');
    hp.add([this.holeText, this.turnText]);
    this.board = this.u(this.add.container(GAME_WIDTH - 16, 14));
    this.meter = this.u(this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 120).setVisible(false));
    this.meter.add(panel(this, -230, -30, 460, 60, true));
    const mg = this.add.graphics();
    mg.fillStyle(0x000000, 0.5).fillRect(-200, -11, 400, 22);
    this.meterFill = this.add.graphics();
    this.meter.add([mg, this.meterFill, text(this, -214, 0, 'POWER', 14, '#ffffff').setOrigin(1, 0.5).setVisible(false)]);
    this.prompts = new PromptBar(this, this.ui);

    this.startHole(0);
  }

  // =================================================================== flow
  private get hole() {
    return this.holes[this.holeIdx];
  }

  private cupPx() {
    return { x: this.hole.cup.x * TILE + 8, y: this.hole.cup.y * TILE + 8 };
  }

  private teePx() {
    return { x: this.hole.tee.x * TILE + 8, y: this.hole.tee.y * TILE + 8 };
  }

  private startHole(i: number) {
    this.holeIdx = i;
    this.worldView.setFocusHole(this.hole.index);
    const tee = this.teePx();
    const cup = this.cupPx();
    for (const g of this.golfers) {
      g.ball.holed = false;
      g.ball.place(tee.x, tee.y);
      g.strokes = 0;
      g.done = false;
      g.teed = false;
      g.lastSafe = { ...tee };
      g.aim = Math.atan2(cup.y - tee.y, cup.x - tee.x);
      g.hidden = false;
      g.ballImg.setScale(1).setAlpha(1);
      g.shadow.setScale(1).setAlpha(1);
    }
    this.syncBalls();
    this.refreshHud();
    this.phase = 'intro';
    this.prompts.set([{ btns: 'A', label: 'Skip' }]);
    banner(this, this.ui, `Hole ${this.hole.index + 1}`, `Par ${this.hole.par}${this.holes.length > 1 ? `  ·  ${i + 1} of ${this.holes.length}` : ''}`, COLORS.gold, 1500);
    // Fly the camera from the cup back to the tee.
    this.camTarget.setPosition(cup.x, cup.y);
    this.cameras.main.centerOn(cup.x, cup.y);
    this.introTween = this.tweens.add({
      targets: this.camTarget, x: tee.x, y: tee.y, delay: 700, duration: 1500, ease: 'Sine.InOut',
      onComplete: () => this.endIntro(),
    });
  }

  private endIntro() {
    if (this.phase !== 'intro') return;
    this.introTween?.stop();
    this.introTween = null;
    this.beginTurn(this.pickNext());
  }

  /** Golf etiquette: whoever is farthest from the cup plays next. */
  private pickNext(): number {
    const cup = this.cupPx();
    let best = -1, bestD = -1;
    this.golfers.forEach((g, i) => {
      if (g.done) return;
      const d = Math.hypot(g.ball.x - cup.x, g.ball.y - cup.y) + (g.teed ? 0 : 1e4 - i);
      if (d > bestD + 0.01) { bestD = d; best = i; }
    });
    return best;
  }

  private beginTurn(i: number) {
    this.current = i;
    const g = this.golfers[i];
    g.teed = true;
    this.phase = 'aim';
    this.power = 0;
    this.lookOffset.set(0, 0);
    this.golfers.forEach((o, k) => o.sprite.setVisible(k === i));
    this.syncBalls();
    this.refreshHud();
    if (this.golfers.length > 1) {
      // Show the active golfer's own buttons in the prompts.
      Input.lastDevice = g.device;
      banner(this, this.ui, `${g.look.name}'s turn`, deviceLabel(g.device), '#ffffff', 900);
    }
    this.setAimPrompts();
  }

  private setAimPrompts() {
    this.prompts.set([
      { btns: ['LEFT', 'RIGHT'], label: 'Aim' },
      { btns: ['LB', 'RB'], label: 'Fine aim' },
      { btns: 'A', label: 'Hold to putt' },
      { btns: 'Y', label: 'Look' },
      { btns: 'START', label: 'Pause' },
    ]);
  }

  private shoot() {
    const g = this.golfers[this.current];
    g.strokes++;
    g.lastSafe = { x: g.ball.x, y: g.ball.y };
    g.ball.hit(g.aim, this.power);
    Sfx.putt(this.power);
    this.phase = 'rolling';
    this.rollTime = 0;
    this.guide.clear();
    this.meter.setVisible(false);
    this.prompts.set([{ btns: 'Y', label: 'Look' }]);
    this.tweens.add({ targets: g.sprite, alpha: 0.85, duration: 120, yoyo: true });
    this.refreshHud();
  }

  private finishShot(events: BallEvent[]) {
    const g = this.golfers[this.current];
    if (events.some((e) => e.type === 'cup')) {
      g.done = true;
      g.scores[this.holeIdx] = g.strokes;
      Sfx.cup();
      const name = scoreName(g.strokes, this.hole.par);
      if (g.strokes < this.hole.par || g.strokes === 1) Sfx.cheer();
      banner(this, this.ui, name, `${g.look.name} · ${g.strokes} stroke${g.strokes === 1 ? '' : 's'}`, g.strokes <= this.hole.par ? COLORS.gold : '#ffffff', 1300);
      this.tweens.add({ targets: [g.ballImg, g.shadow], scale: 0.3, alpha: 0, duration: 260 });
      this.wait(1700);
      return;
    }
    if (events.some((e) => e.type === 'water')) {
      Sfx.splash();
      g.strokes++;
      this.splash(g.ball.x, g.ball.y);
      banner(this, this.ui, 'Splash!', '+1 stroke penalty', '#8fd0f0', 900);
      g.hidden = true;
      this.time.delayedCall(900, () => {
        g.ball.place(g.lastSafe.x, g.lastSafe.y);
        g.hidden = false;
        this.afterStroke(g);
      });
      this.phase = 'wait';
      return;
    }
    this.afterStroke(g);
  }

  private afterStroke(g: Golfer) {
    if (!g.done && g.strokes >= MAX_STROKES) {
      g.done = true;
      g.scores[this.holeIdx] = MAX_STROKES;
      banner(this, this.ui, 'Picked up', `Max ${MAX_STROKES} strokes`, '#ffffff', 900);
      g.ballImg.setAlpha(0);
      g.shadow.setAlpha(0);
      this.wait(1200);
      return;
    }
    this.wait(this.golfers.length > 1 ? 650 : 250);
  }

  private wait(ms: number) {
    this.phase = 'wait';
    this.refreshHud();
    this.time.delayedCall(ms, () => {
      if (this.phase !== 'wait') return;
      const next = this.pickNext();
      if (next < 0) this.showCard(false);
      else this.beginTurn(next);
    });
  }

  private splash(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      const d = this.w(this.add.rectangle(x, y, 2, 2, 0xd8f3ff).setDepth(y + 2));
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({ targets: d, x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 6 - 6, alpha: 0, duration: 500, onComplete: () => d.destroy() });
    }
    const ring = this.w(this.add.ellipse(x, y, 4, 2).setStrokeStyle(1, 0xffffff, 0.9).setDepth(y + 1));
    this.tweens.add({ targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
  }

  // =================================================================== scorecard
  private totals(g: Golfer) {
    let strokes = 0, par = 0;
    g.scores.forEach((s, i) => {
      if (s !== null) { strokes += s; par += this.holes[i].par; }
    });
    return { strokes, rel: strokes - par };
  }

  private showCard(fromPause: boolean) {
    this.overlay?.destroy();
    const last = this.holeIdx >= this.holes.length - 1;
    if (!fromPause) this.phase = last ? 'final' : 'card';
    const c = this.u(this.add.container(0, 0));
    this.overlay = c;
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5).setOrigin(0));
    const cols = this.holes.length;
    const colW = Math.min(64, Math.floor(700 / Math.max(1, cols)));
    const W = 260 + cols * colW + 150, H = 190 + this.golfers.length * 52 + (fromPause ? 0 : 50);
    const x0 = GAME_WIDTH / 2 - W / 2, y0 = GAME_HEIGHT / 2 - H / 2 - 20;
    c.add(panel(this, x0, y0, W, H));
    const done = this.phase === 'final' && !fromPause;
    c.add(text(this, GAME_WIDTH / 2, y0 + 40, done ? 'Final Scores' : 'Scorecard', 34, COLORS.green, { fontStyle: 'bold' }).setOrigin(0.5));
    const hy = y0 + 90;
    c.add(text(this, x0 + 40, hy, 'Hole', 20, COLORS.inkSoft).setOrigin(0, 0.5));
    c.add(text(this, x0 + 40, hy + 30, 'Par', 20, COLORS.inkSoft).setOrigin(0, 0.5));
    this.holes.forEach((h, i) => {
      const x = x0 + 250 + i * colW + colW / 2;
      c.add(text(this, x, hy, `${h.index + 1}`, 20, i === this.holeIdx ? COLORS.highlight : COLORS.ink, { fontStyle: 'bold' }).setOrigin(0.5));
      c.add(text(this, x, hy + 30, `${h.par}`, 18, COLORS.inkSoft).setOrigin(0.5));
    });
    const tx = x0 + 250 + cols * colW + 70;
    c.add(text(this, tx, hy, 'Total', 20, COLORS.ink, { fontStyle: 'bold' }).setOrigin(0.5));
    const ranking = [...this.golfers].sort((a, b) => this.totals(a).strokes - this.totals(b).strokes);
    this.golfers.forEach((g, r) => {
      const y = hy + 80 + r * 52;
      const lead = done && ranking[0] === g && this.golfers.length > 1;
      c.add(this.add.image(x0 + 52, y, 'ball').setScale(3).setTint(g.look.ballColor));
      c.add(text(this, x0 + 72, y, `${lead ? '🏆 ' : ''}${g.look.name}`, 22, COLORS.ink, { fontStyle: lead ? 'bold' : 'normal' }).setOrigin(0, 0.5));
      g.scores.forEach((s, i) => {
        const x = x0 + 250 + i * colW + colW / 2;
        if (s === null) return;
        const d = s - this.holes[i].par;
        const col = d < 0 ? '#2f7d3c' : d === 0 ? COLORS.ink : '#b8392f';
        c.add(text(this, x, y, `${s}`, 22, col, { fontStyle: s === 1 ? 'bold' : 'normal' }).setOrigin(0.5));
      });
      const t = this.totals(g);
      c.add(text(this, tx, y, `${t.strokes} (${relPar(t.rel)})`, 21, COLORS.ink, { fontStyle: 'bold' }).setOrigin(0.5));
    });
    if (fromPause) return;
    if (done) {
      const winner = ranking[0];
      if (this.golfers.length > 1) banner(this, this.ui, `${winner.look.name} wins!`, '', COLORS.gold, 2200);
      Sfx.cheer();
      this.confetti();
      if (this.holes.length === this.map.playableHoles().length) {
        const key = Save.courseSignature();
        const best = Save.data.bestScores[key];
        const score = this.totals(winner).strokes;
        if (best === undefined || score < best) {
          Save.data.bestScores[key] = score;
          Save.save();
          c.add(text(this, GAME_WIDTH / 2, y0 + H - 40, `New course record: ${score}!`, 22, COLORS.highlight, { fontStyle: 'bold' }).setOrigin(0.5));
        } else c.add(text(this, GAME_WIDTH / 2, y0 + H - 40, `Course record: ${best}`, 20, COLORS.inkSoft).setOrigin(0.5));
      }
      this.prompts.set([{ btns: 'A', label: 'Continue' }]);
    } else {
      this.prompts.set([{ btns: 'A', label: `On to hole ${this.holes[this.holeIdx + 1].index + 1}` }]);
    }
  }

  private confetti() {
    const colors = [0xffd34a, 0xe0483e, 0x6fbf5a, 0x3fa0d8, 0xff8ab0];
    for (let i = 0; i < 80; i++) {
      const p = this.u(this.add.rectangle(Math.random() * GAME_WIDTH, -20 - Math.random() * 200, 8, 12, colors[i % colors.length]));
      this.tweens.add({ targets: p, y: GAME_HEIGHT + 40, x: p.x + (Math.random() - 0.5) * 200, angle: 720 * Math.random(), duration: 2200 + Math.random() * 1800, onComplete: () => p.destroy() });
    }
  }

  private showFinalMenu() {
    this.overlay?.destroy();
    this.overlay = null;
    this.phase = 'paused';
    this.menu = new Menu(this, this.ui, GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      { label: 'Play again', onSelect: () => this.scene.restart(this.setup) },
      { label: this.setup.back === 'Title' ? 'Back to title' : 'Back to the island', onSelect: () => this.go(this.setup.back) },
    ], { title: 'Round complete!', width: 420 });
  }

  // =================================================================== pause
  private pause() {
    this.prevPhase = this.phase;
    this.phase = 'paused';
    this.meter.setVisible(false);
    this.prompts.set([{ btns: 'A', label: 'Select' }, { btns: 'B', label: 'Resume' }]);
    this.menu = new Menu(this, this.ui, GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      { label: 'Resume', onSelect: () => this.resume() },
      { label: 'Scorecard', onSelect: () => { this.menu?.destroy(); this.menu = null; this.showCard(true); this.prompts.set([{ btns: 'B', label: 'Back' }]); } },
      { label: 'Skip this hole', onSelect: () => this.skipHole(), hint: 'Everyone still playing takes the max score.' },
      { label: 'Quit round', onSelect: () => this.go(this.setup.back) },
    ], { title: 'Paused', width: 400 });
    this.menu.onCancel = () => this.resume();
  }

  private resume() {
    this.menu?.destroy();
    this.menu = null;
    this.overlay?.destroy();
    this.overlay = null;
    this.phase = this.prevPhase === 'charge' ? 'aim' : this.prevPhase;
    if (this.phase === 'aim') this.setAimPrompts();
    else this.prompts.set([]);
  }

  private skipHole() {
    this.menu?.destroy();
    this.menu = null;
    for (const g of this.golfers) if (!g.done) { g.done = true; g.scores[this.holeIdx] = MAX_STROKES; }
    this.showCard(false);
  }

  // =================================================================== update
  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.phase !== 'paused') this.simTime += dt;
    this.worldView.update(this.simTime);
    this.prompts.update();
    for (const g of this.golfers) g.sprite.tick(delta);
    if (!this.holes.length || this.isLeaving) return;
    const g = this.golfers[this.current];
    const dev = this.golfers.length > 1 ? g.device : undefined;

    switch (this.phase) {
      case 'intro':
        if (Input.pressed('A') || Input.pressed('START')) this.endIntro();
        break;
      case 'aim':
        this.updateLook(dt, dev);
        if (!Input.held('Y', dev)) this.updateAim(dt, dev);
        if (Input.pressed('A', dev)) {
          this.phase = 'charge';
          this.power = 0;
          this.powerDir = 1;
          this.meter.setVisible(true);
          this.prompts.set([{ btns: 'A', label: 'Release to putt' }, { btns: 'B', label: 'Cancel' }]);
        }
        if (Input.pressed('START', dev) || (this.golfers.length > 1 && Input.pressed('START'))) this.pause();
        break;
      case 'charge':
        this.updateLook(dt, dev);
        this.power += this.powerDir * CHARGE_RATE * dt;
        if (this.power >= 1) { this.power = 1; this.powerDir = -1; }
        if (this.power <= 0) { this.power = 0; this.powerDir = 1; }
        this.drawMeter();
        if (Input.pressed('B', dev)) {
          this.phase = 'aim';
          this.meter.setVisible(false);
          this.setAimPrompts();
        } else if (!Input.held('A', dev)) this.shoot();
        break;
      case 'rolling': {
        this.updateLook(dt, dev);
        this.rollTime += dt;
        const ev = g.ball.step(dt, this.map, this.simTime, this.cupPx());
        for (const e of ev) {
          if (e.type === 'wall') Sfx.wall(e.speed);
          if (e.type === 'bumper') { Sfx.bumper(); this.worldView.flashBumper(e.tag); }
          if (e.type === 'spinner') Sfx.wall(e.speed);
        }
        if (this.rollTime > MAX_ROLL_TIME && g.ball.moving) {
          g.ball.vx = g.ball.vy = 0;
          g.ball.moving = false;
          ev.push({ type: 'stopped' });
        }
        if (ev.some((e) => e.type === 'cup' || e.type === 'water' || e.type === 'stopped')) this.finishShot(ev);
        break;
      }
      case 'card':
      case 'final':
        if (Input.pressed('A')) {
          Sfx.select();
          Input.consume();
          if (this.phase === 'final') this.showFinalMenu();
          else {
            this.overlay?.destroy();
            this.overlay = null;
            this.startHole(this.holeIdx + 1);
          }
        }
        break;
      case 'paused':
        if (this.menu) this.menu.update();
        else if (this.overlay && (Input.pressed('B') || Input.pressed('A'))) {
          Input.consume();
          this.overlay.destroy();
          this.overlay = null;
          this.pause();
        }
        break;
      case 'wait':
        break;
    }
    this.syncBalls();
    this.drawAim();
    if (this.phase !== 'intro') {
      const b = g.ball;
      this.camTarget.setPosition(b.x + this.lookOffset.x, b.y + this.lookOffset.y);
    }
  }

  private updateAim(dt: number, dev?: DeviceId) {
    const g = this.golfers[this.current];
    const a = Input.analog(dev);
    if (Math.hypot(a.x, a.y) > 0.4) {
      const target = Math.atan2(a.y, a.x);
      g.aim = Phaser.Math.Angle.RotateTo(g.aim, target, 8 * dt);
    } else {
      if (Input.held('LEFT', dev) || Input.held('UP', dev)) g.aim -= 1.9 * dt;
      if (Input.held('RIGHT', dev) || Input.held('DOWN', dev)) g.aim += 1.9 * dt;
    }
    if (Input.held('LB', dev)) g.aim -= 0.3 * dt;
    if (Input.held('RB', dev)) g.aim += 0.3 * dt;
    g.aim = Phaser.Math.Angle.Wrap(g.aim);
  }

  private updateLook(dt: number, dev?: DeviceId) {
    let l = Input.look(dev);
    if (Input.held('Y', dev)) {
      const m = Input.move(dev);
      if (Math.hypot(m.x, m.y) > Math.hypot(l.x, l.y)) l = m;
    }
    if (Math.hypot(l.x, l.y) > 0.1) {
      this.lookOffset.x = Phaser.Math.Clamp(this.lookOffset.x + l.x * 260 * dt, -260, 260);
      this.lookOffset.y = Phaser.Math.Clamp(this.lookOffset.y + l.y * 260 * dt, -160, 160);
    } else if (this.phase !== 'aim' || !Input.held('Y', dev)) {
      this.lookOffset.scale(Math.pow(0.02, dt));
    }
    if (Input.pressed('SELECT', dev)) {
      const cam = this.cameras.main;
      cam.setZoom(cam.zoom === ZOOM ? 2 : ZOOM);
    }
  }

  private syncBalls() {
    this.golfers.forEach((g, i) => {
      const visible = (g.teed || i === this.current) && !g.hidden;
      g.ballImg.setVisible(visible);
      g.shadow.setVisible(visible);
      g.ballImg.setPosition(g.ball.x, g.ball.y - 0.5).setDepth(g.ball.y + 1);
      g.shadow.setPosition(g.ball.x + 0.5, g.ball.y + 1.5).setDepth(g.ball.y);
    });
    const g = this.golfers[this.current];
    if (!g) return;
    const s = g.sprite;
    if (this.phase === 'aim' || this.phase === 'charge') {
      const back = 9 + (this.phase === 'charge' ? this.power * 2 : 0);
      s.setPosition(Math.round(g.ball.x - Math.cos(g.aim) * back), Math.round(g.ball.y - Math.sin(g.aim) * back + 2));
      s.faceVector(Math.cos(g.aim), Math.sin(g.aim));
      s.setDepth(s.y);
      s.setVisible(true);
    }
  }

  private drawAim() {
    this.guide.clear();
    this.putter.clear();
    const g = this.golfers[this.current];
    if (!g || (this.phase !== 'aim' && this.phase !== 'charge')) return;
    const { x, y } = g.ball;
    const len = this.phase === 'charge' ? 24 + this.power * 90 : 52;
    const bounces = Save.data.settings.aimAssist ? 1 : 0;
    const pts = traceAim(this.map, x, y, g.aim, len, this.simTime, bounces);
    pts.forEach((p, i) => {
      const a = 1 - i / (pts.length + 2);
      this.guide.fillStyle(0xffffff, 0.9 * a).fillRect(Math.round(p.x) - 0.5, Math.round(p.y) - 0.5, 1.5, 1.5);
    });
    // Putter: shaft from the golfer's hands to just behind the ball.
    const pull = this.phase === 'charge' ? 3 + this.power * 7 : 3;
    const hx = x - Math.cos(g.aim) * pull, hy = y - Math.sin(g.aim) * pull;
    const s = g.sprite;
    this.putter.setDepth(Math.max(s.depth, g.ball.y) + 0.5);
    this.putter.lineStyle(1, 0xb8bcc4, 1).lineBetween(s.x + 2, s.y - 9, hx, hy);
    this.putter.fillStyle(0x3a3a44, 1).fillRect(hx - 1.5, hy - 1, 3, 2);
  }

  private drawMeter() {
    const f = this.meterFill;
    f.clear();
    const w = 400 * this.power;
    const col = this.power < 0.5 ? 0x6fbf5a : this.power < 0.8 ? 0xffd34a : 0xe0483e;
    f.fillStyle(col, 1).fillRect(-200, -11, w, 22);
    f.fillStyle(0xffffff, 0.35).fillRect(-200, -11, w, 6);
    for (let i = 1; i < 4; i++) f.fillStyle(0x000000, 0.35).fillRect(-200 + i * 100, -11, 2, 22);
  }

  private refreshHud() {
    if (!this.hole) return;
    const g = this.golfers[this.current];
    this.holeText.setText(`Hole ${this.hole.index + 1}  ·  Par ${this.hole.par}`);
    this.turnText.setText(g ? `${g.look.name}  ·  Stroke ${Math.max(1, g.strokes + (this.phase === 'aim' || this.phase === 'charge' ? 1 : 0))}` : '');
    this.board.removeAll(true);
    if (this.golfers.length < 2) return;
    const H = 26 + this.golfers.length * 34;
    this.board.add(panel(this, -250, 0, 250, H, true));
    this.golfers.forEach((o, i) => {
      const y = 30 + i * 34;
      const t = this.totals(o);
      this.board.add(this.add.image(-226, y, 'ball').setScale(2.5).setTint(o.look.ballColor));
      this.board.add(text(this, -206, y, o.look.name, 19, i === this.current ? COLORS.gold : '#ffffff', { fontStyle: i === this.current ? 'bold' : 'normal' }).setOrigin(0, 0.5));
      const status = o.done ? '✓' : `${o.strokes}`;
      this.board.add(text(this, -24, y, `${relPar(t.rel)}  ${status}`, 18, '#c8c8d8').setOrigin(1, 0.5));
    });
  }
}

import { COLORS, GAME_HEIGHT, GAME_WIDTH, TILE } from '../config';
import { Input, deviceLabel } from '../systems/Input';
import { Save } from '../systems/Save';
import { Session } from '../systems/Session';
import { showControls } from '../ui/help';
import { Menu, PromptBar, text, toast } from '../ui/widgets';
import { WorldRenderer } from '../world/WorldRenderer';
import { BaseScene } from './BaseScene';

export class TitleScene extends BaseScene {
  private worldView!: WorldRenderer;
  private menu!: Menu;
  private prompts!: PromptBar;
  private padText!: Phaser.GameObjects.Text;
  private t = 0;

  constructor() {
    super('Title');
  }

  create() {
    this.setupLayers(2);
    const map = Session.map();
    this.worldView = new WorldRenderer(this, map, this.world);
    this.events.once('shutdown', () => this.worldView.destroy());
    this.cameras.main.centerOn((map.w * TILE) / 2, (map.h * TILE) / 2);

    const logo = this.u(text(this, GAME_WIDTH / 2, 120, 'Putt-Putt Island', 92, COLORS.gold, { stroke: '#2a1a10', strokeThickness: 14, fontStyle: 'bold' }).setOrigin(0.5));
    logo.setShadow(0, 8, '#00000088', 0, true, true);
    this.tweens.add({ targets: logo, y: 128, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.u(text(this, GAME_WIDTH / 2, 198, 'Build your island · Design your course · Putt with friends', 26, '#ffffff', { stroke: '#2a1a10', strokeThickness: 6 }).setOrigin(0.5));

    this.menu = new Menu(this, this.ui, GAME_WIDTH / 2, 430, [
      { label: Save.fresh ? 'Start Island Life' : 'Continue to Island', onSelect: () => this.go('Island'), hint: 'Walk around, decorate and build your course.' },
      { label: 'Play a Round', onSelect: () => this.go('Join', { back: 'Title' }), hint: '1–4 players. Each player uses their own controller.' },
      { label: 'Customize Golfer', onSelect: () => this.go('Customize', { slot: 0, back: 'Title' }), hint: 'Change your look, outfit and ball colour.' },
      { label: 'How to Play', onSelect: () => this.openHelp(), hint: 'Controller and keyboard controls.' },
      { label: 'Start New Island', onSelect: () => this.confirmReset(), hint: 'Replace your island with the starter island.' },
    ], { width: 440 });

    this.prompts = new PromptBar(this, this.ui);
    this.prompts.set([{ btns: ['UP', 'DOWN'], label: 'Choose' }, { btns: 'A', label: 'Select' }]);
    this.padText = this.u(text(this, GAME_WIDTH - 20, GAME_HEIGHT - 20, '', 17, '#ffffff', { stroke: '#2a1a10', strokeThickness: 4, align: 'right' }).setOrigin(1, 1));
    this.u(text(this, 20, GAME_HEIGHT - 20, 'v0.1 · placeholder art', 15, '#ffffffaa').setOrigin(0, 1));
  }

  private openHelp() {
    this.menu.active = false;
    showControls(this, this.ui, () => (this.menu.active = true));
  }

  private confirmReset() {
    this.menu.active = false;
    const m = new Menu(this, this.ui, GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      { label: 'Keep my island', onSelect: () => close() },
      { label: 'Yes, start over', onSelect: () => { Save.reset(); close(); toast(this, this.ui, 'A brand new island awaits!'); this.scene.restart(); } },
    ], { title: 'Start over?', width: 420 });
    const close = () => { m.destroy(); this.menu.active = true; this.events.off('update', upd); };
    m.onCancel = close;
    const upd = () => m.update();
    this.events.on('update', upd);
  }

  update(_time: number, delta: number) {
    this.t += delta / 1000;
    const map = Session.map();
    const cx = (map.w * TILE) / 2, cy = (map.h * TILE) / 2;
    this.cameras.main.centerOn(cx + Math.cos(this.t * 0.07) * 260, cy + Math.sin(this.t * 0.11) * 160);
    this.worldView.update(this.t);
    this.menu.update();
    this.prompts.update();
    const pads = Input.connected().filter((p) => p.id !== 'kb');
    this.padText.setText(pads.length ? pads.map((p) => `🎮 ${deviceLabel(p.id)} connected`).join('\n') : 'Press any button on a controller to connect it');
  }
}

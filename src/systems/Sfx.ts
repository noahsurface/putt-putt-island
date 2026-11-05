// Tiny synthesized sound effects (no audio files needed). Swap these for real
// samples later by loading audio in BootScene and calling scene.sound.play().
import { Save } from './Save';

type Wave = OscillatorType;

class SfxPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private ensure() {
    if (!Save.data.settings.sfx) return null;
    if (!this.ctx) {
      const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: Wave = 'square', vol = 0.3, slideTo?: number, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.3, freq = 800) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  move() { this.tone(660, 0.04, 'square', 0.08); }
  select() { this.tone(520, 0.06, 'square', 0.12); this.tone(780, 0.08, 'square', 0.1, undefined, 0.05); }
  back() { this.tone(400, 0.07, 'square', 0.1, 260); }
  error() { this.tone(160, 0.15, 'sawtooth', 0.12); }
  place() { this.tone(300, 0.08, 'triangle', 0.25, 520); }
  erase() { this.tone(420, 0.08, 'triangle', 0.22, 180); }
  putt(power: number) { this.tone(220 + power * 120, 0.09, 'triangle', 0.35, 90); this.noise(0.04, 0.15, 2000); }
  wall(speed: number) { this.tone(180 + Math.min(speed, 300) * 0.6, 0.05, 'square', Math.min(0.25, 0.05 + speed / 1200)); }
  bumper() { this.tone(300, 0.18, 'sine', 0.35, 900); }
  cup() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.25, undefined, i * 0.07)); }
  splash() { this.noise(0.45, 0.45, 900); this.tone(300, 0.2, 'sine', 0.15, 80); }
  cheer() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'square', 0.12, undefined, i * 0.09)); }
  step() { this.noise(0.03, 0.04, 500); }
  door() { this.tone(240, 0.1, 'triangle', 0.2, 330); this.tone(330, 0.12, 'triangle', 0.15, 440, 0.1); }
}

export const Sfx = new SfxPlayer();

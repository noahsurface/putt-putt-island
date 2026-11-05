// Unified input for keyboard and up to four gamepads.
//
// Buttons use Xbox-style names (A = bottom face button). Every device keeps its
// own state so local multiplayer can tell players apart, while menus can simply
// ask "did anyone press A?" by leaving the device out.

export type Btn =
  | 'A' | 'B' | 'X' | 'Y'
  | 'LB' | 'RB' | 'LT' | 'RT'
  | 'START' | 'SELECT'
  | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type DeviceId = string; // 'kb' or 'pad0'..'pad3'

export const KEYBOARD: DeviceId = 'kb';

const KEYMAP: Record<string, Btn> = {
  Space: 'A', Enter: 'A', NumpadEnter: 'A',
  Escape: 'B', Backspace: 'B', ShiftLeft: 'B', ShiftRight: 'B',
  KeyR: 'X',
  KeyF: 'Y',
  KeyQ: 'LB',
  KeyE: 'RB',
  KeyZ: 'LT',
  KeyC: 'RT',
  Tab: 'START', KeyP: 'START',
  KeyM: 'SELECT',
  ArrowUp: 'UP', KeyW: 'UP',
  ArrowDown: 'DOWN', KeyS: 'DOWN',
  ArrowLeft: 'LEFT', KeyA: 'LEFT',
  ArrowRight: 'RIGHT', KeyD: 'RIGHT',
};

/** Key labels shown in on-screen prompts when the keyboard is in use. */
export const KEY_LABELS: Record<Btn, string> = {
  A: 'Space', B: 'Esc', X: 'R', Y: 'F', LB: 'Q', RB: 'E', LT: 'Z', RT: 'C',
  START: 'Tab', SELECT: 'M', UP: 'W', DOWN: 'S', LEFT: 'A', RIGHT: 'D',
};

// Standard gamepad mapping (https://w3c.github.io/gamepad/#remapping).
const PAD_BUTTONS: Btn[] = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START'];
const PAD_DPAD: Record<number, Btn> = { 12: 'UP', 13: 'DOWN', 14: 'LEFT', 15: 'RIGHT' };
const DEADZONE = 0.22;
const RIGHT_STICK_KEYS: Record<string, [number, number]> = {
  KeyI: [0, -1], KeyK: [0, 1], KeyJ: [-1, 0], KeyL: [1, 0],
};

interface DeviceState {
  held: Set<Btn>;
  prev: Set<Btn>;
  lx: number; ly: number; // analog left stick (sticks only)
  rx: number; ry: number;
  repeatAt: Map<Btn, number>;
  lastActive: number;
}

function newState(): DeviceState {
  return { held: new Set(), prev: new Set(), lx: 0, ly: 0, rx: 0, ry: 0, repeatAt: new Map(), lastActive: 0 };
}

function dz(v: number) {
  return Math.abs(v) < DEADZONE ? 0 : (v - Math.sign(v) * DEADZONE) / (1 - DEADZONE);
}

export interface PadInfo {
  id: DeviceId;
  name: string;
}

class InputManager {
  private devices = new Map<DeviceId, DeviceState>();
  private keysDown = new Set<string>();
  private typed: string[] = [];
  private typedThisFrame: string[] = [];
  private consumed = false;
  private now = 0;
  /** Device most recently used — drives which button glyphs prompts show. */
  lastDevice: DeviceId = KEYBOARD;
  /** Called whenever lastDevice switches between keyboard and gamepad. */
  onDeviceStyleChange: (() => void) | null = null;
  /** Lets tests inject a fake navigator.getGamepads(). */
  getPads: () => (Gamepad | null)[] = () => (typeof navigator !== 'undefined' && navigator.getGamepads ? Array.from(navigator.getGamepads()) : []);

  constructor() {
    this.devices.set(KEYBOARD, newState());
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Backspace') e.preventDefault();
        this.keysDown.add(e.code);
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) this.typed.push(e.key);
        else if (e.code === 'Backspace') this.typed.push('\b');
        else if (e.code === 'Enter' || e.code === 'NumpadEnter') this.typed.push('\n');
      });
      window.addEventListener('keyup', (e) => this.keysDown.delete(e.code));
      window.addEventListener('blur', () => this.keysDown.clear());
    }
  }

  /** Poll all devices. Called once per game step before scenes update. */
  update(time: number) {
    this.now = time;
    this.consumed = false;
    this.typedThisFrame = this.typed;
    this.typed = [];
    const prevStyle = this.isGamepadStyle();

    // keyboard
    const kb = this.devices.get(KEYBOARD)!;
    kb.prev = kb.held;
    kb.held = new Set();
    for (const code of this.keysDown) {
      const b = KEYMAP[code];
      if (b) kb.held.add(b);
    }
    let rx = 0, ry = 0;
    for (const code of this.keysDown) {
      const v = RIGHT_STICK_KEYS[code];
      if (v) { rx += v[0]; ry += v[1]; }
    }
    kb.rx = rx; kb.ry = ry;
    if (kb.held.size || rx || ry) this.touch(KEYBOARD, kb);

    // gamepads
    const pads = this.getPads();
    const seen = new Set<DeviceId>();
    pads.forEach((pad, i) => {
      if (!pad || !pad.connected) return;
      const id = `pad${i}`;
      seen.add(id);
      let st = this.devices.get(id);
      if (!st) { st = newState(); this.devices.set(id, st); }
      st.prev = st.held;
      st.held = new Set();
      PAD_BUTTONS.forEach((b, bi) => {
        const btn = pad.buttons[bi];
        if (btn && (btn.pressed || btn.value > 0.5)) st!.held.add(b);
      });
      for (const [bi, b] of Object.entries(PAD_DPAD)) if (pad.buttons[+bi]?.pressed) st.held.add(b);
      st.lx = dz(pad.axes[0] ?? 0);
      st.ly = dz(pad.axes[1] ?? 0);
      st.rx = dz(pad.axes[2] ?? 0);
      st.ry = dz(pad.axes[3] ?? 0);
      // Left stick also drives the virtual d-pad (menus, editor cursor).
      if (st.lx < -0.5) st.held.add('LEFT');
      if (st.lx > 0.5) st.held.add('RIGHT');
      if (st.ly < -0.5) st.held.add('UP');
      if (st.ly > 0.5) st.held.add('DOWN');
      if (st.held.size || Math.abs(st.rx) > 0.3 || Math.abs(st.ry) > 0.3) this.touch(id, st);
    });
    for (const id of [...this.devices.keys()]) if (id !== KEYBOARD && !seen.has(id)) this.devices.delete(id);

    if (prevStyle !== this.isGamepadStyle()) this.onDeviceStyleChange?.();
  }

  private touch(id: DeviceId, st: DeviceState) {
    // Only count *new* activity as a device switch, so a resting key doesn't flip prompts.
    const fresh = [...st.held].some((b) => !st.prev.has(b)) || Math.abs(st.rx) > 0.3 || Math.abs(st.ry) > 0.3;
    if (fresh) {
      st.lastActive = this.now;
      this.lastDevice = id;
    }
  }

  isGamepadStyle() {
    return this.lastDevice !== KEYBOARD;
  }

  private states(dev?: DeviceId): DeviceState[] {
    if (dev === undefined) return [...this.devices.values()];
    const s = this.devices.get(dev);
    return s ? [s] : [];
  }

  /** Swallow presses for the rest of this frame (e.g. after a menu closes). */
  consume() {
    this.consumed = true;
  }

  held(b: Btn, dev?: DeviceId) {
    return this.states(dev).some((s) => s.held.has(b));
  }

  pressed(b: Btn, dev?: DeviceId) {
    if (this.consumed) return false;
    return this.states(dev).some((s) => s.held.has(b) && !s.prev.has(b));
  }

  released(b: Btn, dev?: DeviceId) {
    return this.states(dev).some((s) => !s.held.has(b) && s.prev.has(b));
  }

  /** Pressed, then auto-repeating while held (for menu / cursor navigation). */
  repeat(b: Btn, dev?: DeviceId, first = 320, rate = 90) {
    if (this.consumed) return false;
    let fire = false;
    for (const s of this.states(dev)) {
      if (!s.held.has(b)) { s.repeatAt.delete(b); continue; }
      if (!s.prev.has(b)) {
        s.repeatAt.set(b, this.now + first);
        fire = true;
      } else if (this.now >= (s.repeatAt.get(b) ?? Infinity)) {
        s.repeatAt.set(b, this.now + rate);
        fire = true;
      }
    }
    return fire;
  }

  /** Movement vector from left stick, d-pad and WASD/arrows, length <= 1. */
  move(dev?: DeviceId): { x: number; y: number } {
    let x = 0, y = 0;
    for (const s of this.states(dev)) {
      let sx = s.lx, sy = s.ly;
      if (s.held.has('LEFT') && !sx) sx = -1;
      if (s.held.has('RIGHT') && !sx) sx = 1;
      if (s.held.has('UP') && !sy) sy = -1;
      if (s.held.has('DOWN') && !sy) sy = 1;
      if (Math.hypot(sx, sy) > Math.hypot(x, y)) { x = sx; y = sy; }
    }
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  /** Analog left stick only (no d-pad), used for absolute aiming. */
  analog(dev?: DeviceId): { x: number; y: number } {
    let best = { x: 0, y: 0 };
    for (const s of this.states(dev)) if (Math.hypot(s.lx, s.ly) > Math.hypot(best.x, best.y)) best = { x: s.lx, y: s.ly };
    return best;
  }

  /** Right stick (IJKL on keyboard). */
  look(dev?: DeviceId): { x: number; y: number } {
    let best = { x: 0, y: 0 };
    for (const s of this.states(dev)) if (Math.hypot(s.rx, s.ry) > Math.hypot(best.x, best.y)) best = { x: s.rx, y: s.ry };
    const len = Math.hypot(best.x, best.y);
    return len > 1 ? { x: best.x / len, y: best.y / len } : best;
  }

  /** Characters typed on the physical keyboard this frame ('\b' = backspace, '\n' = enter). */
  typedChars(): string[] {
    return this.typedThisFrame;
  }

  /** Devices that pressed `b` this frame (used by the join screen). */
  devicesPressing(b: Btn): DeviceId[] {
    if (this.consumed) return [];
    const out: DeviceId[] = [];
    for (const [id, s] of this.devices) if (s.held.has(b) && !s.prev.has(b)) out.push(id);
    return out;
  }

  connected(): PadInfo[] {
    const pads = this.getPads();
    const out: PadInfo[] = [{ id: KEYBOARD, name: 'Keyboard' }];
    pads.forEach((p, i) => p && p.connected && out.push({ id: `pad${i}`, name: p.id }));
    return out;
  }
}

export const Input = new InputManager();

export function deviceLabel(dev: DeviceId) {
  return dev === KEYBOARD ? 'Keyboard' : `Controller ${Number(dev.replace('pad', '')) + 1}`;
}

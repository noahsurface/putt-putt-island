// Mini-golf ball simulation. Pure TypeScript (no Phaser) so it can be unit tested.
import { TERRAINS, Terrain } from '../data/terrain';

export const BALL_RADIUS = 2.5;
export const MAX_SHOT_SPEED = 340;
export const MIN_SHOT_SPEED = 18;
const STOP_SPEED = 6;
const CUP_CAPTURE = 3.8;
const CUP_MAX_SPEED = 175;
const CUP_PULL_RADIUS = 9;
const CUP_PULL = 240;
const BOOST_ACCEL = 900;
const BOOST_MAX = 360;
const BUMPER_KICK = 110;
const MAX_SPEED = 460;

export type Collider =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; e: number }
  | { kind: 'circle'; x: number; y: number; r: number; e: number; bumper?: boolean; tag?: unknown }
  | { kind: 'spinner'; x: number; y: number; len: number; thick: number; phase: number; omega: number; tag?: unknown };

export interface CourseQuery {
  /** Terrain under a world-pixel position (outside the map = Water). */
  terrainAtPx(x: number, y: number): Terrain;
  /** Colliders that might touch a circle at (x,y) with radius r. */
  collidersNear(x: number, y: number, r: number): Collider[];
  /** Unit direction of a boost pad under (x,y), or null. */
  boostAtPx(x: number, y: number): { x: number; y: number } | null;
}

export type BallEvent =
  | { type: 'wall'; speed: number }
  | { type: 'bumper'; tag?: unknown }
  | { type: 'spinner'; speed: number }
  | { type: 'water' }
  | { type: 'cup' }
  | { type: 'lipout' }
  | { type: 'stopped' };

export function spinnerAngle(c: { phase: number; omega: number }, time: number) {
  return c.phase + c.omega * time;
}

export class BallSim {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  moving = false;
  holed = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  /** Strike the ball. `power` is 0..1, `angle` in radians (0 = east, +y = down). */
  hit(angle: number, power: number) {
    const s = MIN_SHOT_SPEED + (MAX_SHOT_SPEED - MIN_SHOT_SPEED) * Math.max(0, Math.min(1, power));
    this.vx = Math.cos(angle) * s;
    this.vy = Math.sin(angle) * s;
    this.moving = true;
  }

  place(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = this.vy = 0;
    this.moving = false;
  }

  /**
   * Advance the simulation. Uses sub-steps so the ball never moves more than
   * ~1px per step (no tunnelling through thin rails).
   */
  step(dt: number, q: CourseQuery, time: number, cup: { x: number; y: number } | null): BallEvent[] {
    const events: BallEvent[] = [];
    if (!this.moving || this.holed) return events;
    const steps = Math.max(1, Math.ceil((this.speed * dt) / 0.8));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const t = time + h * i;
      const ter = q.terrainAtPx(this.x, this.y);
      if (TERRAINS[ter].hazard) {
        this.moving = false;
        events.push({ type: 'water' });
        return events;
      }
      // boost pads
      const boost = q.boostAtPx(this.x, this.y);
      if (boost) {
        this.vx += boost.x * BOOST_ACCEL * h;
        this.vy += boost.y * BOOST_ACCEL * h;
        const s = this.speed;
        if (s > BOOST_MAX) {
          this.vx *= BOOST_MAX / s;
          this.vy *= BOOST_MAX / s;
        }
      }
      // rolling friction
      let s = this.speed;
      if (s > 0) {
        const ns = Math.max(0, s - TERRAINS[ter].friction * h);
        this.vx *= ns / s;
        this.vy *= ns / s;
        s = ns;
      }
      // the cup
      if (cup) {
        const dx = cup.x - this.x, dy = cup.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d < CUP_CAPTURE) {
          if (s < CUP_MAX_SPEED) {
            this.holed = true;
            this.moving = false;
            this.place(cup.x, cup.y);
            this.holed = true;
            events.push({ type: 'cup' });
            return events;
          }
          // Too fast: the ball skims across and gets nudged off line.
          if (!events.some((e) => e.type === 'lipout')) {
            const side = (dx * this.vy - dy * this.vx) > 0 ? 1 : -1;
            const nx = -this.vy / s, ny = this.vx / s;
            this.vx = this.vx * 0.82 + nx * side * 22;
            this.vy = this.vy * 0.82 + ny * side * 22;
            events.push({ type: 'lipout' });
          }
        } else if (d < CUP_PULL_RADIUS && s < 90) {
          this.vx += (dx / d) * CUP_PULL * h;
          this.vy += (dy / d) * CUP_PULL * h;
        }
      }
      this.x += this.vx * h;
      this.y += this.vy * h;
      this.collide(q, t, events);
    }
    const s = this.speed;
    if (s > MAX_SPEED) {
      this.vx *= MAX_SPEED / s;
      this.vy *= MAX_SPEED / s;
    }
    if (s < STOP_SPEED && !q.boostAtPx(this.x, this.y)) {
      // Don't settle on a slope toward the cup lip: just stop.
      this.vx = this.vy = 0;
      this.moving = false;
      if (TERRAINS[q.terrainAtPx(this.x, this.y)].hazard) events.push({ type: 'water' });
      else events.push({ type: 'stopped' });
    }
    return events;
  }

  collide(q: CourseQuery, time: number, events: BallEvent[]) {
    const R = BALL_RADIUS;
    for (const c of q.collidersNear(this.x, this.y, R)) {
      if (c.kind === 'rect') {
        const cx = Math.max(c.x, Math.min(this.x, c.x + c.w));
        const cy = Math.max(c.y, Math.min(this.y, c.y + c.h));
        let dx = this.x - cx, dy = this.y - cy;
        let d = Math.hypot(dx, dy);
        if (d >= R) continue;
        if (d === 0) {
          // Centre inside the box: push out along the shallowest axis.
          const left = this.x - c.x, right = c.x + c.w - this.x, top = this.y - c.y, bottom = c.y + c.h - this.y;
          const m = Math.min(left, right, top, bottom);
          if (m === left) { dx = -1; dy = 0; this.x = c.x - R; }
          else if (m === right) { dx = 1; dy = 0; this.x = c.x + c.w + R; }
          else if (m === top) { dx = 0; dy = -1; this.y = c.y - R; }
          else { dx = 0; dy = 1; this.y = c.y + c.h + R; }
          d = 1;
        } else {
          this.x += (dx / d) * (R - d);
          this.y += (dy / d) * (R - d);
        }
        const nx = dx / d, ny = dy / d;
        const vn = this.vx * nx + this.vy * ny;
        if (vn < 0) {
          this.vx -= (1 + c.e) * vn * nx;
          this.vy -= (1 + c.e) * vn * ny;
          if (-vn > 25) events.push({ type: 'wall', speed: -vn });
        }
      } else if (c.kind === 'circle') {
        const dx = this.x - c.x, dy = this.y - c.y;
        const d = Math.hypot(dx, dy);
        if (d >= R + c.r || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        this.x = c.x + nx * (R + c.r);
        this.y = c.y + ny * (R + c.r);
        const vn = this.vx * nx + this.vy * ny;
        if (vn < 0) {
          this.vx -= (1 + c.e) * vn * nx;
          this.vy -= (1 + c.e) * vn * ny;
          if (c.bumper) {
            this.vx += nx * BUMPER_KICK;
            this.vy += ny * BUMPER_KICK;
            events.push({ type: 'bumper', tag: c.tag });
          } else if (-vn > 25) events.push({ type: 'wall', speed: -vn });
        }
      } else {
        // Two crossed blades rotating around (x,y).
        const a = spinnerAngle(c, time);
        for (const ang of [a, a + Math.PI / 2]) {
          const ux = Math.cos(ang), uy = Math.sin(ang);
          const px = this.x - c.x, py = this.y - c.y;
          const along = Math.max(-c.len, Math.min(c.len, px * ux + py * uy));
          const qx = c.x + ux * along, qy = c.y + uy * along;
          const dx = this.x - qx, dy = this.y - qy;
          const d = Math.hypot(dx, dy);
          const min = R + c.thick;
          if (d >= min) continue;
          let nx: number, ny: number;
          if (d === 0) { nx = -uy; ny = ux; } else { nx = dx / d; ny = dy / d; }
          this.x = qx + nx * min;
          this.y = qy + ny * min;
          // velocity of the blade at the contact point
          const bvx = -c.omega * (qy - c.y), bvy = c.omega * (qx - c.x);
          const rvx = this.vx - bvx, rvy = this.vy - bvy;
          const vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            const nrx = rvx - 1.6 * vn * nx, nry = rvy - 1.6 * vn * ny;
            this.vx = nrx + bvx;
            this.vy = nry + bvy;
            this.moving = true;
            events.push({ type: 'spinner', speed: -vn });
          }
        }
      }
    }
  }
}

/**
 * Preview dots for the aim guide: follows the putt line for `length` px,
 * reflecting off the first obstacle it meets (friction is ignored).
 */
export function traceAim(q: CourseQuery, x: number, y: number, angle: number, length: number, time: number, maxBounces = 1) {
  const b = new BallSim(x, y);
  b.vx = Math.cos(angle) * 100;
  b.vy = Math.sin(angle) * 100;
  const pts: { x: number; y: number }[] = [];
  let bounces = 0;
  for (let i = 1; i <= length; i++) {
    const s = Math.hypot(b.vx, b.vy) || 1;
    b.x += b.vx / s;
    b.y += b.vy / s;
    const ev: BallEvent[] = [];
    const before = Math.atan2(b.vy, b.vx);
    b.collide(q, time, ev);
    const after = Math.atan2(b.vy, b.vx);
    if (Math.abs(after - before) > 0.01) {
      bounces++;
      const s2 = Math.hypot(b.vx, b.vy) || 1;
      b.vx = (b.vx / s2) * 100;
      b.vy = (b.vy / s2) * 100;
    }
    if (TERRAINS[q.terrainAtPx(b.x, b.y)].hazard) break;
    if (i % 4 === 0) pts.push({ x: b.x, y: b.y });
    if (bounces > maxBounces) break;
  }
  return pts;
}

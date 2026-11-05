import { describe, expect, it } from 'vitest';
import { Terrain } from '../src/data/terrain';
import { BallSim, traceAim, type BallEvent, type Collider, type CourseQuery } from '../src/world/golfPhysics';

/** A flat test course: putting green everywhere inside a 400x200 box, water outside. */
function flatCourse(colliders: Collider[] = [], terrain: (x: number, y: number) => Terrain = () => Terrain.Green): CourseQuery {
  return {
    terrainAtPx: (x, y) => (x < 0 || y < 0 || x > 400 || y > 200 ? Terrain.Water : terrain(x, y)),
    collidersNear: () => colliders,
    boostAtPx: () => null,
  };
}

function run(ball: BallSim, q: CourseQuery, cup: { x: number; y: number } | null = null, seconds = 30) {
  const events: BallEvent[] = [];
  let t = 0;
  while (ball.moving && t < seconds) {
    events.push(...ball.step(1 / 60, q, t, cup));
    t += 1 / 60;
  }
  return events;
}

describe('BallSim', () => {
  it('rolls and comes to rest on a green', () => {
    const b = new BallSim(20, 100);
    b.hit(0, 0.5);
    const ev = run(b, flatCourse());
    expect(b.moving).toBe(false);
    expect(ev.at(-1)?.type).toBe('stopped');
    expect(b.x).toBeGreaterThan(100);
    expect(Math.abs(b.y - 100)).toBeLessThan(0.001);
  });

  it('stops sooner in a sand trap than on the green', () => {
    const green = new BallSim(20, 100);
    green.hit(0, 0.4);
    run(green, flatCourse());
    const sand = new BallSim(20, 100);
    sand.hit(0, 0.4);
    run(sand, flatCourse([], () => Terrain.Bunker));
    expect(sand.x - 20).toBeLessThan((green.x - 20) / 4);
  });

  it('bounces off a rail', () => {
    const wall: Collider = { kind: 'rect', x: 100, y: 0, w: 4, h: 200, e: 0.8 };
    const b = new BallSim(50, 100);
    b.hit(0, 0.6);
    const ev = run(b, flatCourse([wall]));
    expect(ev.some((e) => e.type === 'wall')).toBe(true);
    expect(b.x).toBeLessThan(100);
  });

  it('never tunnels through a thin rail at full power', () => {
    const wall: Collider = { kind: 'rect', x: 100, y: 0, w: 2, h: 200, e: 0.8 };
    const b = new BallSim(90, 100);
    b.hit(0, 1);
    run(b, flatCourse([wall]));
    expect(b.x).toBeLessThan(100);
  });

  it('drops into the cup when slow enough', () => {
    const b = new BallSim(20, 100);
    b.hit(0, 0.25);
    const ev = run(b, flatCourse(), { x: 60, y: 100 });
    expect(ev.some((e) => e.type === 'cup')).toBe(true);
    expect(b.holed).toBe(true);
  });

  it('lips out when the ball is moving too fast', () => {
    const b = new BallSim(20, 100);
    b.hit(0, 1);
    const ev = run(b, flatCourse(), { x: 60, y: 100 });
    expect(ev.some((e) => e.type === 'lipout')).toBe(true);
    expect(ev.some((e) => e.type === 'cup')).toBe(false);
  });

  it('reports water hazards', () => {
    const b = new BallSim(380, 100);
    b.hit(0, 0.8);
    const ev = run(b, flatCourse());
    expect(ev.at(-1)?.type).toBe('water');
  });

  it('bumpers kick the ball away', () => {
    const bumper: Collider = { kind: 'circle', x: 100, y: 100, r: 6, e: 0.9, bumper: true };
    const b = new BallSim(60, 100);
    b.hit(0, 0.4);
    const ev = run(b, flatCourse([bumper]));
    expect(ev.some((e) => e.type === 'bumper')).toBe(true);
    expect(b.x).toBeLessThan(60);
  });

  it('aim guide reflects off the first wall', () => {
    const wall: Collider = { kind: 'rect', x: 50, y: 0, w: 4, h: 200, e: 0.8 };
    const pts = traceAim(flatCourse([wall]), 20, 100, 0, 80, 0);
    expect(Math.max(...pts.map((p) => p.x))).toBeLessThan(50);
    expect(pts.at(-1)!.x).toBeLessThan(45);
  });
});

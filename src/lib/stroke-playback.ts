import type { ExpressiveStroke } from './expressive-painter';
import type { Vec2 } from './stroke-engine';

export const bristleFade = (elapsed: number) => Math.max(0, Math.min(1, 1 - elapsed / 3000));
export const lightSpeedCount = (total: number, elapsed: number) => Math.min(total, Math.max(0, Math.floor(total * elapsed / 8000)));

export function brushTravelDuration(distance: number, speed: number) {
  const pace = .45 + Math.max(0, speed) / 140 * .55;
  return Math.max(20, Math.min(320, (30 + Math.sqrt(Math.max(0, distance)) * 9) * pace));
}

/** 抬笔期间只移动笔形，起落点和朝向与实际笔迹衔接。 */
export function brushTravelFrame(from: Vec2, to: Vec2, fromAngle: number, toAngle: number, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const t = p * p * (3 - 2 * p);
  const turn = ((toAngle - fromAngle) % 360 + 540) % 360 - 180;
  return {
    tip: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
    angle: fromAngle + turn * t,
    lift: Math.sin(p * Math.PI),
  };
}

/** Arc-length progress keeps the brush speed independent of point spacing. */
export function strokeFrame(stroke: ExpressiveStroke, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const lengths = stroke.points.slice(1).map((point, i) => Math.hypot(point.x - stroke.points[i].x, point.y - stroke.points[i].y));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const points = [stroke.points[0]];
  const radii = [stroke.radii[0]];
  let remaining = total * p;
  let angle = 0;
  for (let i = 0; i < lengths.length; i++) {
    const a = stroke.points[i], b = stroke.points[i + 1];
    if (lengths[i] === 0) continue;
    angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const fraction = Math.min(1, remaining / lengths[i]);
    points.push({ x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction });
    radii.push(stroke.radii[i] + (stroke.radii[i + 1] - stroke.radii[i]) * fraction);
    remaining -= lengths[i];
    if (remaining <= 0) break;
  }
  return { stroke: p === 1 ? stroke : { ...stroke, points, radii }, tip: points.at(-1)!, angle, length: total };
}

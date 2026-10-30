import type { Vec2 } from './stroke-engine';
import { constrainMaterial, type MaterialInstance } from './material-layout';

export type MaterialGestureKind = 'move' | 'scale' | 'rotate';
const angleDelta = (from: number, to: number) => ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

/** 指针均先转换为画布坐标；增减手指时以当前布局重新建立基准。 */
export function transformMaterial(item: MaterialInstance, from: Vec2[], to: Vec2[], kind: MaterialGestureKind) {
  const next = { ...item };
  if (from.length >= 2 && to.length >= 2) {
    const startAngle = Math.atan2(from[1].y - from[0].y, from[1].x - from[0].x);
    const endAngle = Math.atan2(to[1].y - to[0].y, to[1].x - to[0].x);
    const rotation = angleDelta(startAngle, endAngle);
    const scale = Math.hypot(to[1].x - to[0].x, to[1].y - to[0].y) / Math.max(1, Math.hypot(from[1].x - from[0].x, from[1].y - from[0].y));
    const start = { x: (from[0].x + from[1].x) / 2, y: (from[0].y + from[1].y) / 2 };
    const end = { x: (to[0].x + to[1].x) / 2, y: (to[0].y + to[1].y) / 2 };
    const dx = item.x - start.x, dy = item.y - start.y;
    next.x = end.x + scale * (dx * Math.cos(rotation) - dy * Math.sin(rotation));
    next.y = end.y + scale * (dx * Math.sin(rotation) + dy * Math.cos(rotation));
    next.width *= scale;
    next.rotation += rotation * 180 / Math.PI;
  } else if (from[0] && to[0]) {
    if (kind === 'move') { next.x += to[0].x - from[0].x; next.y += to[0].y - from[0].y; }
    if (kind === 'scale') next.width *= Math.hypot(to[0].x - item.x, to[0].y - item.y) / Math.max(1, Math.hypot(from[0].x - item.x, from[0].y - item.y));
    if (kind === 'rotate') next.rotation += angleDelta(Math.atan2(from[0].y - item.y, from[0].x - item.x), Math.atan2(to[0].y - item.y, to[0].x - item.x)) * 180 / Math.PI;
  }
  return constrainMaterial(next);
}

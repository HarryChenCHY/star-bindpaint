export type CanvasView = { x: number; y: number; scale: number };
export function viewportPoint(bounds: { left: number; top: number; width: number; height: number }, point: { x: number; y: number }) {
  return { x: point.x - bounds.left - bounds.width / 2, y: point.y - bounds.top - bounds.height / 2 };
}
export function viewportGesture(view: CanvasView, start: { x: number; y: number }, end: { x: number; y: number }, ratio: number): CanvasView {
  const scale = Math.max(1, Math.min(4, view.scale * ratio));
  const applied = scale / view.scale;
  return { scale, x: end.x - (start.x - view.x) * applied, y: end.y - (start.y - view.y) * applied };
}

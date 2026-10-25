import type { MaterialPlacement } from './co-create';

export interface MaterialInstance extends MaterialPlacement {
  id: string;
  rotation: number;
  variation: number;
  harmonize: boolean;
  softEdges?: boolean;
  src: string;
}

export function materialBounds(p: MaterialPlacement & { rotation: number }) {
  const angle = p.rotation * Math.PI / 180;
  const width = Math.abs(Math.cos(angle)) * p.width + Math.abs(Math.sin(angle)) * p.height;
  const height = Math.abs(Math.sin(angle)) * p.width + Math.abs(Math.cos(angle)) * p.height;
  return { x: p.x - width / 2, y: p.y - height / 2, width, height };
}

export function constrainMaterial<T extends MaterialPlacement & { rotation: number }>(p: T, w = 640, h = 480): T {
  const rotation = ((p.rotation + 180) % 360 + 360) % 360 - 180;
  const width = Math.max(40, p.width);
  const size = { ...p, rotation, width, height: width / p.material.ratio };
  const bounds = materialBounds(size);
  const scale = Math.min(1, w / bounds.width, h / bounds.height);
  size.width *= scale; size.height *= scale;
  const fitted = materialBounds(size);
  return { ...size, x: Math.max(fitted.width / 2, Math.min(w - fitted.width / 2, p.x)), y: Math.max(fitted.height / 2, Math.min(h - fitted.height / 2, p.y)) };
}

export function layoutBounds(items: MaterialInstance[], w = 640, h = 480) {
  const boxes = items.map(materialBounds);
  const x = Math.max(0, Math.min(...boxes.map(b => b.x)) - 12);
  const y = Math.max(0, Math.min(...boxes.map(b => b.y)) - 12);
  return { x, y, width: Math.min(w, Math.max(...boxes.map(b => b.x + b.width)) + 12) - x, height: Math.min(h, Math.max(...boxes.map(b => b.y + b.height)) + 12) - y };
}

export function drawMaterial(ctx: CanvasRenderingContext2D, image: CanvasImageSource, item: MaterialInstance) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation * Math.PI / 180);
  ctx.drawImage(image, -item.width / 2, -item.height / 2, item.width, item.height);
  ctx.restore();
}

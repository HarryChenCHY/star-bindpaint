import type { MaterialInstance } from './material-layout';
export type MaskStroke = { restore: boolean; size: number; points: { x: number; y: number }[] };
export function objectPoint(item: MaterialInstance, point: { x: number; y: number }) {
  const angle = -item.rotation * Math.PI / 180, dx = point.x - item.x, dy = point.y - item.y;
  return { x: (dx * Math.cos(angle) - dy * Math.sin(angle)) / item.width * 1000 + 500,
    y: (dx * Math.sin(angle) + dy * Math.cos(angle)) / item.width * 1000 + 500 / item.material.ratio };
}
export function reorderMaterial<T extends { id: string }>(items: T[], id: string, direction: number) {
  const from = items.findIndex(item => item.id === id), to = Math.max(0, Math.min(items.length - 1, from + direction));
  const next = [...items];
  if (from >= 0) [next[from], next[to]] = [next[to], next[from]];
  return next;
}
export function maskStrokePath(mark: MaskStroke) {
  return mark.points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + (mark.points.length === 1 ? ' l0.001 0' : '');
}
export function maskedMaterialSource(item: MaterialInstance) {
  if (!item.mask?.length) return item.src;
  const height = 1000 / item.material.ratio;
  const marks = item.mask.map(mark => `<path d="${maskStrokePath(mark)}" fill="none" stroke="${mark.restore ? 'white' : 'black'}" stroke-width="${mark.size}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const src = item.src.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}"><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="${height}" style="mask-type:luminance"><rect width="1000" height="${height}" fill="white"/>${marks}</mask></defs><image href="${src}" width="1000" height="${height}" preserveAspectRatio="none" mask="url(#m)"/></svg>`)}`;
}

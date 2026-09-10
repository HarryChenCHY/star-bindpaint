export type BrushColor = [number, number, number];
export const FREE_BRUSH_OPACITY = 0.96;
const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export function rgbToHsv(r: number, g: number, b: number): BrushColor {
  r = clamp(r); g = clamp(g); b = clamp(b);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / delta + 2) / 6;
    else h = ((r - g) / delta + 4) / 6;
  }
  return [h, max ? delta / max : 0, max];
}
export function hsvToRgb(h: number, s: number, v: number): BrushColor {
  h = ((h % 1) + 1) % 1; s = clamp(s); v = clamp(v);
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6] as BrushColor;
}
/** 预览、拖动中的笔迹与最终风格笔迹使用同一调色口径。 */
export function resolveBrushColor(base: BrushColor, saturation = 1, brightness = 1): BrushColor {
  const [h, s, v] = rgbToHsv(...base);
  return hsvToRgb(h, s * saturation, v * brightness);
}
export function brushColorCss(base: BrushColor, saturation = 1, brightness = 1) {
  return `rgb(${resolveBrushColor(base, saturation, brightness).map(c => Math.round(c * 255)).join(',')})`;
}

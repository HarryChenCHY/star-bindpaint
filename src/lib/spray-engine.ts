/**
 * spray-engine.ts — 喷雾/喷枪工具
 *
 * 以指针位置为中心喷洒随机色点，模拟喷枪效果。
 * 区别于 DrawingEngine 的连续笔触管线，喷雾是离散的点散布。
 */

import { MasterStyleProfile } from './style-transfer';

/**
 * 在 base canvas 上喷洒一次喷雾
 */
export function renderSprayDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pressure: number,
  baseColor: [number, number, number],
  size: number,
  style?: MasterStyleProfile | null
): void {
  const dotCount = Math.round(12 + pressure * 20);     // 12–32 个点
  const radius = size * 2 * (0.4 + pressure * 0.6);    // 喷雾半径（放大 2 倍）
  const colorJitter = style?.colorJitter ?? 5;          // hue 抖动
  const baseOpacity = style?.opacity ?? 0.55;           // 基础透明度

  for (let i = 0; i < dotCount; i++) {
    // 在半径内随机分布（高斯加权，中心密边缘疏）
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.abs(gaussianRandom()) * radius;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    // 颜色抖动
    const [r, g, b] = jitterHue(baseColor, colorJitter);

    // 随机透明度
    const alpha = baseOpacity * (0.3 + Math.random() * 0.7);

    // 随机点大小
    const dotSize = 0.5 + Math.random() * (2 + pressure * 2);

    ctx.fillStyle = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha})`;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 对颜色做 hue 抖动（只改 hue，不改饱和度和亮度）
 */
function jitterHue(color: [number, number, number], jitterDeg: number): [number, number, number] {
  const [h, s, v] = rgbToHsv(color[0], color[1], color[2]);
  const newH = (h + ((Math.random() - 0.5) * 2 * jitterDeg) / 360 + 1) % 1;
  return hsvToRgb(newH, s, v);
}

/**
 * 高斯随机数（均值 0，标准差 0.35，绝大部份落在 ±1 内）
 */
function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * 0.35;
}

// ── HSV ↔ RGB ──────────────────────────────────────────────────────

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return [h, s, v];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r: number, g: number, b: number;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }

  return [r, g, b];
}

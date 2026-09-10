/**
 * spray-engine.ts — 喷雾/喷枪工具
 *
 * 以指针位置为中心喷洒随机色点，模拟喷枪效果。
 * 区别于 DrawingEngine 的连续笔触管线，喷雾是离散的点散布。
 */

import { resolveBrushColor, rgbToHsv, hsvToRgb } from './brush-color';
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
  style?: MasterStyleProfile | null,
  userSat?: number,
  userVal?: number
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
    const [r, g, b] = jitterHue(baseColor, colorJitter, userSat, userVal);

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
function jitterHue(color: [number, number, number], jitterDeg: number, userSat?: number, userVal?: number): [number, number, number] {
  const [h, newS, newV] = rgbToHsv(...resolveBrushColor(color, userSat, userVal));
  const newH = (h + ((Math.random() - 0.5) * 2 * Math.min(2, jitterDeg)) / 360 + 1) % 1;
  return hsvToRgb(newH, newS, newV);
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

/**
 * style-transfer.ts — 实时笔触风格化引擎
 *
 * 将用户自由绘制的笔迹实时转换为大师油画风格。
 * 核心思路：保留用户笔迹的路径（内容是用户的），
 * 但改变渲染方式（宽度变化、颜色抖动、边缘粗糙度 = 风格是大师的）。
 */

import { Vec2 } from './stroke-engine';

// ── 类型 ────────────────────────────────────────────────────────────

export interface MasterStyleProfile {
  id: string;
  name: string;
  nameEn: string;
  color: string;              // 代表色 hex
  description: string;        // 一句话描述
  widthCurve: 'taper' | 'bulge' | 'uniform' | 'pressure';
  widthBase: number;          // 基础宽度 px
  widthVariation: number;     // 变化幅度 0-1
  colorJitter: number;        // hue 抖动 ±度
  saturationBoost: number;    // 饱和度增强 -1 到 1
  opacity: number;            // 0-1
  roughness: number;          // 边缘粗糙度 0-1
  strokeSplit: number;        // 笔触分割数 1=整笔
  texture: 'smooth' | 'dry' | 'thick' | 'broken';
}

export interface StylizedSegment {
  points: Vec2[];
  widths: number[];
  colors: [number, number, number][];
  opacity: number;
  texture: MasterStyleProfile['texture'];
}

// ── 6 种大师风格预设 ─────────────────────────────────────────────────

export const MASTER_STYLES: MasterStyleProfile[] = [
  {
    id: 'monet',
    name: '莫奈',
    nameEn: 'Monet',
    color: '#7BA7CC',
    description: '柔和渐细的印象派短笔触，光影跳跃',
    widthCurve: 'taper',
    widthBase: 6,
    widthVariation: 0.5,
    colorJitter: 8,
    saturationBoost: 0.05,
    opacity: 0.8,
    roughness: 0.1,
    strokeSplit: 3,
    texture: 'smooth',
  },
  {
    id: 'vangogh',
    name: '梵高',
    nameEn: 'Van Gogh',
    color: '#F9B801',
    description: '旋转厚涂，大胆色彩，充满能量',
    widthCurve: 'bulge',
    widthBase: 8,
    widthVariation: 0.7,
    colorJitter: 15,
    saturationBoost: 0.2,
    opacity: 0.9,
    roughness: 0.3,
    strokeSplit: 1,
    texture: 'thick',
  },
  {
    id: 'gauguin',
    name: '高更',
    nameEn: 'Gauguin',
    color: '#F302C9',
    description: '大色块平涂，饱和鲜艳，原始力量',
    widthCurve: 'uniform',
    widthBase: 10,
    widthVariation: 0.15,
    colorJitter: 5,
    saturationBoost: 0.3,
    opacity: 0.92,
    roughness: 0.05,
    strokeSplit: 1,
    texture: 'smooth',
  },
  {
    id: 'rembrandt',
    name: '伦勃朗',
    nameEn: 'Rembrandt',
    color: '#8B6914',
    description: '明暗对比强烈的干笔触，沉稳深邃',
    widthCurve: 'pressure',
    widthBase: 5,
    widthVariation: 0.6,
    colorJitter: 3,
    saturationBoost: -0.1,
    opacity: 0.85,
    roughness: 0.4,
    strokeSplit: 1,
    texture: 'dry',
  },
  {
    id: 'picasso',
    name: '毕加索',
    nameEn: 'Picasso',
    color: '#7A51EC',
    description: '几何断笔，大胆变色，解构重组',
    widthCurve: 'uniform',
    widthBase: 5,
    widthVariation: 0.3,
    colorJitter: 20,
    saturationBoost: 0.15,
    opacity: 0.88,
    roughness: 0.2,
    strokeSplit: 2,
    texture: 'broken',
  },
  {
    id: 'sargent',
    name: '萨金特',
    nameEn: 'Sargent',
    color: '#7DC353',
    description: '流畅渐细水彩笔触，轻盈透明',
    widthCurve: 'taper',
    widthBase: 7,
    widthVariation: 0.6,
    colorJitter: 6,
    saturationBoost: 0.0,
    opacity: 0.7,
    roughness: 0.05,
    strokeSplit: 1,
    texture: 'smooth',
  },
];

// ── 核心函数：风格化笔触 ─────────────────────────────────────────────

/**
 * 将用户自由绘制的笔迹转换为大师风格化笔触
 */
export function stylizeStroke(
  userPoints: Vec2[],
  pressures: number[],
  userColor: [number, number, number],
  style: MasterStyleProfile,
  userWidthBase?: number
): StylizedSegment[] {
  if (userPoints.length < 2) return [];

  // 1. 路径平滑 & 重采样
  const smoothed = resamplePath(userPoints, 4); // 每 4px 一个点
  const smoothPressures = resamplePressures(pressures, smoothed.length);

  // 2. 笔触分割
  const segments = splitStroke(smoothed, smoothPressures, style.strokeSplit);

  // 3. 对每段应用风格化
  return segments.map(seg => {
    const n = seg.points.length;
    const widths: number[] = [];
    const colors: [number, number, number][] = [];

    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0.5;
      const pressure = seg.pressures[i] || 0.5;

      // 宽度
      widths.push(computeWidth(t, pressure, style, userWidthBase));

      // 颜色抖动
      colors.push(jitterColor(userColor, style, i));
    }

    // 边缘粗糙
    const roughPoints = applyRoughness(seg.points, style.roughness);

    return {
      points: roughPoints,
      widths,
      colors,
      opacity: style.opacity,
      texture: style.texture,
    };
  });
}

/**
 * 渲染风格化笔触到 Canvas
 */
export function drawStylizedStroke(
  ctx: CanvasRenderingContext2D,
  segments: StylizedSegment[]
): void {
  for (const seg of segments) {
    if (seg.points.length < 2) continue;

    const pts = seg.points;
    const n = pts.length;

    // 'thick' 纹理：画两层
    const layers = seg.texture === 'thick' ? 2 : 1;

    for (let layer = 0; layer < layers; layer++) {
      const offsetX = layer === 1 ? (Math.random() - 0.5) * 2 : 0;
      const offsetY = layer === 1 ? (Math.random() - 0.5) * 2 : 0;
      const widthScale = layer === 1 ? 0.5 : 1;
      const alphaScale = layer === 1 ? 0.6 : 1;

      for (let i = 0; i < n - 1; i++) {
        // 'dry' 纹理：随机跳过一些段
        if (seg.texture === 'dry' && Math.random() < 0.15) continue;
        // 'broken' 纹理：每隔几段断开
        if (seg.texture === 'broken' && i % 7 === 5) continue;

        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(n - 1, i + 2)];

        const w = seg.widths[i] * widthScale;
        const [r, g, b] = seg.colors[i];
        const a = seg.opacity * alphaScale;

        ctx.beginPath();
        ctx.lineWidth = Math.max(1, w);
        ctx.strokeStyle = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Catmull-Rom to Bezier
        const cp1x = p1.x + (p2.x - p0.x) / 6 + offsetX;
        const cp1y = p1.y + (p2.y - p0.y) / 6 + offsetY;
        const cp2x = p2.x - (p3.x - p1.x) / 6 + offsetX;
        const cp2y = p2.y - (p3.y - p1.y) / 6 + offsetY;

        ctx.moveTo(p1.x + offsetX, p1.y + offsetY);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x + offsetX, p2.y + offsetY);
        ctx.stroke();
      }
    }
  }
}

// ── 内部工具函数 ──────────────────────────────────────────────────────

/** 路径重采样：等距插值 */
function resamplePath(points: Vec2[], stepPx: number): Vec2[] {
  if (points.length < 2) return [...points];

  const result: Vec2[] = [points[0]];
  let accumulated = 0;
  let prevPt = points[0];

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - prevPt.x;
    const dy = points[i].y - prevPt.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.5) continue;

    accumulated += dist;

    while (accumulated >= stepPx) {
      const overshoot = accumulated - stepPx;
      const t = 1 - overshoot / dist;
      const nx = prevPt.x + dx * t;
      const ny = prevPt.y + dy * t;
      result.push({ x: nx, y: ny });
      accumulated = overshoot;
      prevPt = { x: nx, y: ny };
    }

    prevPt = points[i];
  }

  // 确保最后一个点包含在内
  const last = points[points.length - 1];
  const lastResult = result[result.length - 1];
  if (Math.abs(last.x - lastResult.x) > 1 || Math.abs(last.y - lastResult.y) > 1) {
    result.push(last);
  }

  return result.length >= 2 ? result : [...points];
}

/** 重采样压感数组到目标长度 */
function resamplePressures(pressures: number[], targetLen: number): number[] {
  if (pressures.length === 0) return Array(targetLen).fill(0.5);
  if (pressures.length === targetLen) return pressures;

  const result: number[] = [];
  for (let i = 0; i < targetLen; i++) {
    const t = pressures.length > 1 ? i / (targetLen - 1) : 0;
    const srcIdx = t * (pressures.length - 1);
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, pressures.length - 1);
    const frac = srcIdx - lo;
    result.push(pressures[lo] * (1 - frac) + pressures[hi] * frac);
  }
  return result;
}

/** 笔触分割 */
function splitStroke(
  points: Vec2[],
  pressures: number[],
  splitCount: number
): { points: Vec2[]; pressures: number[] }[] {
  if (splitCount <= 1 || points.length < 6) {
    return [{ points, pressures }];
  }

  const segments: { points: Vec2[]; pressures: number[] }[] = [];
  const segLen = Math.max(3, Math.floor(points.length / splitCount));

  for (let i = 0; i < points.length; i += segLen) {
    const end = Math.min(i + segLen + 1, points.length); // +1 overlap
    const segPts = points.slice(i, end);
    const segPressures = pressures.slice(i, end);
    if (segPts.length >= 2) {
      segments.push({ points: segPts, pressures: segPressures });
    }
  }

  return segments;
}

/** 计算宽度 */
function computeWidth(t: number, pressure: number, style: MasterStyleProfile, userBase?: number): number {
  const base = userBase ?? style.widthBase;
  const v = style.widthVariation;

  switch (style.widthCurve) {
    case 'taper': {
      // 两头细，中间保持 → 模拟毛笔提按
      const taper = Math.max(0.3, 1 - 0.7 * Math.pow(Math.abs(2 * t - 1), 1.5));
      return base * taper;
    }
    case 'bulge': {
      // 中间最粗 → 梵高厚涂效果
      const bulge = 1 + v * Math.sin(Math.PI * t);
      return base * bulge;
    }
    case 'uniform': {
      // 等宽 + 微小随机
      return base * (1 + (Math.random() - 0.5) * v * 0.3);
    }
    case 'pressure': {
      // 完全跟随压感
      return base * (0.3 + 0.7 * pressure) * (1 + (Math.random() - 0.5) * v * 0.2);
    }
  }
}

/** 颜色抖动 */
function jitterColor(
  baseColor: [number, number, number],
  style: MasterStyleProfile,
  pointIndex: number
): [number, number, number] {
  // 每 3-5 个点才抖动一次（避免太碎）
  const jitterFreq = 4;
  const seed = Math.floor(pointIndex / jitterFreq);

  // 简易伪随机
  const rand1 = Math.sin(seed * 12.9898 + 78.233) * 43758.5453 % 1;
  const rand2 = Math.sin(seed * 4.898 + 7.23) * 23421.631 % 1;

  // RGB → HSV
  let [h, s, v] = rgbToHsv(baseColor[0], baseColor[1], baseColor[2]);

  // hue 抖动
  h += (rand1 - 0.5) * 2 * style.colorJitter / 360;
  if (h < 0) h += 1;
  if (h > 1) h -= 1;

  // 饱和度增强
  s = Math.max(0, Math.min(1, s + style.saturationBoost + (rand2 - 0.5) * 0.05));

  // HSV → RGB
  return hsvToRgb(h, s, v);
}

/** 边缘粗糙 */
function applyRoughness(points: Vec2[], roughness: number): Vec2[] {
  if (roughness <= 0.01) return points;

  const amplitude = roughness * 2.5; // 最大偏移 px
  return points.map((pt, i) => {
    // 正弦噪声 + 伪随机
    const noise = Math.sin(i * 0.8) * Math.cos(i * 1.3) * amplitude;
    const noise2 = Math.cos(i * 1.1) * Math.sin(i * 0.7) * amplitude;
    return {
      x: pt.x + noise,
      y: pt.y + noise2,
    };
  });
}

// ── 颜色空间转换 ─────────────────────────────────────────────────────

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

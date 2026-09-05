/**
 * stroke-engine.ts — Hertzmann 1998 油画笔触规划算法
 *
 * 基于论文：Aaron Hertzmann, "Painterly Rendering with Curved Brush Strokes
 * of Multiple Sizes", SIGGRAPH 1998
 *
 * 算法思路：多层从粗到细，每层找误差大的区域画曲线笔触。
 * 完全独立实现，不依赖任何第三方代码。
 *
 * 纯 CPU / JavaScript，无需 GPU，浏览器内 ~1-3s 完成。
 */

// ── 类型定义 ────────────────────────────────────────────────────────────

export interface Vec2 { x: number; y: number }

export interface ImageSource {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface StrokeDrawData {
  width: number;
  color: [number, number, number];
  points: Vec2[];
}

export interface DecomposeOptions {
  roughness?: number;   // 1-4, 控制笔刷层数和大小
  lloydIter?: number;   // 保留接口兼容（本算法不使用）
  pixelStep?: number;   // 路径插值步长
  padding?: number;     // 保留接口兼容
  palette?: string;
}

// ── 公共工具函数 ────────────────────────────────────────────────────────

export function imageSourceFromCanvas(canvas: HTMLCanvasElement): ImageSource {
  const ctx = canvas.getContext('2d')!;
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: id.data };
}

export function imageSourceFromImage(img: HTMLImageElement, maxSize = 512): ImageSource {
  const canvas = document.createElement('canvas');
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (Math.max(w, h) > maxSize) {
    const scale = maxSize / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  return { width: w, height: h, data: id.data };
}

// ── 主入口 ──────────────────────────────────────────────────────────────

/**
 * 将图像拆解为油画笔触序列（Hertzmann 1998 多层绘画算法）
 */
export async function decomposeImage(
  src: ImageSource,
  canvasW: number,
  canvasH: number,
  opts: DecomposeOptions = {}
): Promise<StrokeDrawData[]> {
  const { roughness = 2, palette = 'original' } = opts;

  await new Promise(r => setTimeout(r, 10));

  // 确定笔刷层级（从大到小）
  // roughness 1 = 4层(精细), 2 = 3层, 3 = 2层, 4 = 1层(粗犷)
  const layerCount = Math.max(1, 5 - roughness);
  const brushSizes: number[] = [];
  for (let i = 0; i < layerCount; i++) {
    // 从大到小：最大笔刷 = 图像短边/8, 最小 = 2
    const maxBrush = Math.max(4, Math.round(Math.min(canvasW, canvasH) / 8));
    const t = layerCount > 1 ? i / (layerCount - 1) : 0;
    const size = Math.round(maxBrush * (1 - t * 0.85));
    brushSizes.push(Math.max(2, size));
  }

  // 缩放源图到画布尺寸
  const refImage = resizeImage(src, canvasW, canvasH);

  // 虚拟画布（RGB float，模拟当前已画的内容）
  const currentCanvas = new Float32Array(canvasW * canvasH * 3).fill(1); // 白色背景

  const allStrokes: StrokeDrawData[] = [];

  // 多层绘制（从大笔刷到小笔刷）
  for (let layer = 0; layer < brushSizes.length; layer++) {
    const brushRadius = brushSizes[layer];
    const sigma = brushRadius * 0.5; // 高斯模糊核

    await new Promise(r => setTimeout(r, 5));

    // 模糊参考图到当前笔刷尺度
    const blurredRef = gaussianBlur(refImage, canvasW, canvasH, sigma);

    // 找误差大的区域，生成笔触
    const layerStrokes = paintLayer(
      currentCanvas, blurredRef, refImage,
      canvasW, canvasH, brushRadius
    );

    // 将笔触"画"到虚拟画布上
    for (const stroke of layerStrokes) {
      renderStrokeToBuffer(currentCanvas, canvasW, canvasH, stroke);
    }

    allStrokes.push(...layerStrokes);
  }

  if (palette && palette !== 'original') {
    applyPaletteShift(allStrokes, palette);
  }

  return allStrokes;
}

// ── Hertzmann 核心：单层绘制 ─────────────────────────────────────────────

function paintLayer(
  canvas: Float32Array,     // 当前画布状态 [H*W*3] RGB 0-1
  blurredRef: Float32Array, // 模糊后的参考图
  originalRef: Float32Array, // 原始参考图（用于取色）
  w: number, h: number,
  brushRadius: number
): StrokeDrawData[] {
  const strokes: StrokeDrawData[] = [];
  const gridSize = Math.max(1, Math.round(brushRadius * 0.8)); // 采样网格间距
  const errorThreshold = 25 / 255; // 误差阈值

  // 在网格上找误差大的点
  for (let gy = 0; gy < h; gy += gridSize) {
    for (let gx = 0; gx < w; gx += gridSize) {
      // 计算该网格区域的平均误差
      let maxError = 0;
      let maxX = gx, maxY = gy;

      for (let dy = 0; dy < gridSize && gy + dy < h; dy++) {
        for (let dx = 0; dx < gridSize && gx + dx < w; dx++) {
          const x = gx + dx, y = gy + dy;
          const idx = (y * w + x) * 3;
          const er = Math.abs(canvas[idx] - blurredRef[idx]);
          const eg = Math.abs(canvas[idx + 1] - blurredRef[idx + 1]);
          const eb = Math.abs(canvas[idx + 2] - blurredRef[idx + 2]);
          const error = (er + eg + eb) / 3;
          if (error > maxError) {
            maxError = error;
            maxX = x; maxY = y;
          }
        }
      }

      // 误差超阈值才画
      if (maxError > errorThreshold) {
        const stroke = makeSplineStroke(
          maxX, maxY, blurredRef, originalRef, w, h, brushRadius
        );
        if (stroke.points.length >= 2) {
          strokes.push(stroke);
        }
      }
    }
  }

  // 随机打乱笔触顺序（避免机械感）
  shuffleArray(strokes);
  return strokes;
}

// ── 曲线笔触生成（Hertzmann 论文 Section 4）────────────────────────────

function makeSplineStroke(
  startX: number, startY: number,
  blurredRef: Float32Array,
  originalRef: Float32Array,
  w: number, h: number,
  brushRadius: number
): StrokeDrawData {
  const maxStrokeLen = Math.round(brushRadius * 6);
  const minStrokeLen = Math.round(brushRadius * 1.5);

  // 取笔触颜色（从原始参考图采样）
  const cIdx = (startY * w + startX) * 3;
  const color: [number, number, number] = [
    originalRef[cIdx],
    originalRef[cIdx + 1],
    originalRef[cIdx + 2],
  ];

  const points: Vec2[] = [{ x: startX, y: startY }];
  let cx = startX, cy = startY;
  let lastDx = 0, lastDy = 0;

  for (let i = 1; i < maxStrokeLen; i++) {
    // 超出边界
    if (cx < 1 || cx >= w - 1 || cy < 1 || cy >= h - 1) break;

    // 颜色差异检测（防止跨物体边界）
    const curIdx = (Math.round(cy) * w + Math.round(cx)) * 3;
    const refR = originalRef[curIdx], refG = originalRef[curIdx + 1], refB = originalRef[curIdx + 2];
    const colorDiff = Math.abs(refR - color[0]) + Math.abs(refG - color[1]) + Math.abs(refB - color[2]);
    if (i > minStrokeLen && colorDiff > 0.3) break;

    // 计算梯度方向（Sobel 3x3）
    const { gx, gy } = sobelAt(blurredRef, w, h, Math.round(cx), Math.round(cy));

    // 笔触方向 = 梯度的垂直方向（沿等值线走）
    let dx = -gy;
    let dy = gx;

    // 归一化
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-6) {
      // 梯度为零（平坦区域），继续上一次方向
      dx = lastDx || 1;
      dy = lastDy || 0;
    } else {
      dx /= len;
      dy /= len;
    }

    // 方向一致性（和上一步方向点积为负则翻转）
    if (lastDx * dx + lastDy * dy < 0) {
      dx = -dx;
      dy = -dy;
    }

    // 曲率滤波（和上一方向混合，使曲线更平滑）
    const filterWeight = 0.5;
    if (i > 1) {
      dx = filterWeight * dx + (1 - filterWeight) * lastDx;
      dy = filterWeight * dy + (1 - filterWeight) * lastDy;
      const l2 = Math.sqrt(dx * dx + dy * dy);
      if (l2 > 1e-6) { dx /= l2; dy /= l2; }
    }

    // 步进
    cx += dx * 1.5;
    cy += dy * 1.5;
    lastDx = dx;
    lastDy = dy;

    points.push({ x: Math.round(cx), y: Math.round(cy) });
  }

  return {
    width: brushRadius * 1.2,
    color,
    points,
  };
}

// ── 图像处理工具 ────────────────────────────────────────────────────────

/** Sobel 梯度计算（单点） */
function sobelAt(img: Float32Array, w: number, h: number, x: number, y: number): { gx: number; gy: number } {
  x = Math.max(1, Math.min(w - 2, x));
  y = Math.max(1, Math.min(h - 2, y));

  // 用亮度通道计算梯度
  const L = (px: number, py: number) => {
    const i = (py * w + px) * 3;
    return 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
  };

  const gx = -L(x-1,y-1) + L(x+1,y-1)
           - 2*L(x-1,y) + 2*L(x+1,y)
           - L(x-1,y+1) + L(x+1,y+1);

  const gy = -L(x-1,y-1) - 2*L(x,y-1) - L(x+1,y-1)
           + L(x-1,y+1) + 2*L(x,y+1) + L(x+1,y+1);

  return { gx, gy };
}

/** 高斯模糊（可分离，水平+垂直） */
function gaussianBlur(img: Float32Array, w: number, h: number, sigma: number): Float32Array {
  if (sigma < 0.5) return new Float32Array(img);

  const radius = Math.min(Math.ceil(sigma * 2.5), 15);
  const kernel = makeGaussKernel(radius, sigma);
  const tmp = new Float32Array(w * h * 3);
  const out = new Float32Array(w * h * 3);

  // 水平
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.max(0, Math.min(w - 1, x + k));
        const idx = (y * w + sx) * 3;
        const wt = kernel[k + radius];
        r += img[idx] * wt;
        g += img[idx + 1] * wt;
        b += img[idx + 2] * wt;
      }
      const oi = (y * w + x) * 3;
      tmp[oi] = r; tmp[oi + 1] = g; tmp[oi + 2] = b;
    }
  }

  // 垂直
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.max(0, Math.min(h - 1, y + k));
        const idx = (sy * w + x) * 3;
        const wt = kernel[k + radius];
        r += tmp[idx] * wt;
        g += tmp[idx + 1] * wt;
        b += tmp[idx + 2] * wt;
      }
      const oi = (y * w + x) * 3;
      out[oi] = r; out[oi + 1] = g; out[oi + 2] = b;
    }
  }

  return out;
}

function makeGaussKernel(radius: number, sigma: number): Float32Array {
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-x * x / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  return kernel;
}

/** 缩放图像到目标尺寸，返回 RGB float [H*W*3] 0-1 */
function resizeImage(src: ImageSource, dw: number, dh: number): Float32Array {
  const { width: sw, height: sh, data } = src;
  const out = new Float32Array(dw * dh * 3);

  for (let dy = 0; dy < dh; dy++) {
    for (let dx = 0; dx < dw; dx++) {
      const sx = (dx + 0.5) * sw / dw - 0.5;
      const sy = (dy + 0.5) * sh / dh - 0.5;
      const x0 = Math.max(0, Math.min(sw - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(sh - 1, Math.floor(sy)));
      const x1 = Math.min(sw - 1, x0 + 1);
      const y1 = Math.min(sh - 1, y0 + 1);
      const fx = sx - x0, fy = sy - y0;

      for (let c = 0; c < 3; c++) {
        const v = data[(y0 * sw + x0) * 4 + c] * (1-fx) * (1-fy)
                + data[(y0 * sw + x1) * 4 + c] * fx * (1-fy)
                + data[(y1 * sw + x0) * 4 + c] * (1-fx) * fy
                + data[(y1 * sw + x1) * 4 + c] * fx * fy;
        out[(dy * dw + dx) * 3 + c] = v / 255;
      }
    }
  }
  return out;
}

/** 将笔触渲染到虚拟画布缓冲区 */
function renderStrokeToBuffer(
  canvas: Float32Array, w: number, h: number,
  stroke: StrokeDrawData
) {
  const [cr, cg, cb] = stroke.color;
  const alpha = 0.85;

  for (const pt of stroke.points) {
    const px = Math.round(pt.x), py = Math.round(pt.y);
    // 虚拟画布只记录中心线，用于估算下一层误差；最终输出仍使用完整笔刷宽度。
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = px + dx, y = py + dy;
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const idx = (y * w + x) * 3;
        canvas[idx]     = canvas[idx]     * (1 - alpha) + cr * alpha;
        canvas[idx + 1] = canvas[idx + 1] * (1 - alpha) + cg * alpha;
        canvas[idx + 2] = canvas[idx + 2] * (1 - alpha) + cb * alpha;
      }
    }
  }
}

function shuffleArray<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── 配色色调偏移 ────────────────────────────────────────────────────────

function applyPaletteShift(strokes: StrokeDrawData[], palette: string) {
  for (const s of strokes) {
    const [r, g, b] = s.color;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, sat = max === 0 ? 0 : d / max, v = max;
    if (d > 0) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }

    switch (palette) {
      case 'warm':
        h = (h + 15 / 360 + 1) % 1;
        sat = Math.min(1, sat + 0.1);
        break;
      case 'calm':
        h = (h - 20 / 360 + 1) % 1;
        sat = Math.max(0, sat - 0.1);
        v = Math.min(1, v + 0.05);
        break;
      case 'vivid':
        sat = Math.min(1, sat + 0.25);
        break;
      case 'dreamy':
        h = (h + 30 / 360 + 1) % 1;
        sat = Math.max(0, sat - 0.15);
        v = Math.min(1, v + 0.15);
        break;
    }

    // HSV → RGB
    const i = Math.floor(h * 6), f = h * 6 - i;
    const p = v * (1 - sat), q = v * (1 - f * sat), t2 = v * (1 - (1 - f) * sat);
    switch (i % 6) {
      case 0: s.color = [v, t2, p]; break;
      case 1: s.color = [q, v, p]; break;
      case 2: s.color = [p, v, t2]; break;
      case 3: s.color = [p, q, v]; break;
      case 4: s.color = [t2, p, v]; break;
      default: s.color = [v, p, q]; break;
    }
  }
}

// ── Canvas 绘制函数 ─────────────────────────────────────────────────────

/**
 * 在 Canvas 上绘制单笔（Catmull-Rom 平滑）
 */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeDrawData, alpha = 0.85) {
  const pts = stroke.points;
  if (pts.length < 2) return;

  const [r, g, b] = stroke.color;
  ctx.strokeStyle = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha})`;
  ctx.lineWidth = Math.max(1, stroke.width);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }
  ctx.stroke();
}

/**
 * 绘制引导线（紫色虚线 + 绿色起点 + 红色终点）
 */
export type GuidanceLevel = 'full' | 'balanced' | 'light';

export function drawGuideStroke(
  ctx: CanvasRenderingContext2D,
  stroke: StrokeDrawData,
  guidanceLevel: GuidanceLevel = 'full',
) {
  const pts = stroke.points;
  if (pts.length < 2) return;

  ctx.save();
  ctx.setLineDash(guidanceLevel === 'full' ? [8, 6] : [3, 9]);
  ctx.lineWidth = Math.min(
    guidanceLevel === 'full' ? 7 : 5,
    Math.max(2, stroke.width * (guidanceLevel === 'full' ? 0.36 : 0.24)),
  );
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.shadowColor = '#6558D9';
  ctx.shadowBlur = guidanceLevel === 'full' ? 9 : 4;
  ctx.strokeStyle = guidanceLevel === 'full' ? 'rgba(101, 88, 217, 0.78)' : 'rgba(101, 88, 217, 0.42)';

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (guidanceLevel === 'light') {
    const directionPoint = pts[Math.min(2, pts.length - 1)];
    const dx = directionPoint.x - pts[0].x;
    const dy = directionPoint.y - pts[0].y;
    const length = Math.hypot(dx, dy) || 1;
    const hintLength = Math.min(28, length);
    ctx.lineTo(pts[0].x + dx / length * hintLength, pts[0].y + dy / length * hintLength);
  } else if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  const start = pts[0];
  const starRadius = Math.max(7, Math.min(12, stroke.width * 0.75));
  ctx.fillStyle = 'rgba(255, 209, 102, 0.28)';
  ctx.beginPath();
  ctx.arc(start.x, start.y, starRadius + 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFD166';
  ctx.strokeStyle = '#17233F';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? starRadius : starRadius * 0.46;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const x = start.x + Math.cos(angle) * radius;
    const y = start.y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (guidanceLevel === 'full') {
    const last = pts[pts.length - 1];
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#6558D9';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 序列化笔触数据为文本
 */
export function serializeStrokes(strokes: StrokeDrawData[]): string {
  return strokes
    .filter(s => s.points.length >= 2)
    .map(s => {
      const r = Math.round(s.color[0] * 255);
      const g = Math.round(s.color[1] * 255);
      const b = Math.round(s.color[2] * 255);
      const pts = s.points.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join(' ');
      return `WIDTH=${Math.round(s.width)} R=${r} G=${g} B=${b} POINTS=${pts}`;
    })
    .join('\n');
}

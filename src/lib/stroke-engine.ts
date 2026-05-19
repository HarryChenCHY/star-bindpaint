/**
 * stroke-engine.ts — 封装 stroke-sequence-planner 算法
 * 直接在主线程运行（算法纯CPU，~1-5s）
 * 后续可移入 Web Worker
 */

// ── 类型定义（从原库复制核心类型，避免 DOM 依赖问题）──────────────────

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
  roughness?: number;   // 1-5
  lloydIter?: number;   // 1-15
  pixelStep?: number;   // 路径插值步长
  padding?: number;     // ETF padding
  mood?: string;        // 情绪色调：warm/calm/vivid/dreamy/original
}

// ── 算法核心（从 stroke-sequence-planner 内联）──────────────────────────

// 由于 stroke-sequence-planner 依赖 DOM (document.createElement)，
// 我们在这里直接接受 ImageData/Canvas 提取后的数据

/**
 * 从 Canvas 元素提取 ImageSource
 */
export function imageSourceFromCanvas(canvas: HTMLCanvasElement): ImageSource {
  const ctx = canvas.getContext('2d')!;
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: id.data };
}

/**
 * 从 HTMLImageElement 提取 ImageSource
 */
export function imageSourceFromImage(img: HTMLImageElement, maxSize = 512): ImageSource {
  const canvas = document.createElement('canvas');
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  // 限制尺寸
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

// ── ETF 算法 ────────────────────────────────────────────────────────────

function bilinearResize(src: Float32Array, sw: number, sh: number, dw: number, dh: number): Float32Array {
  const dst = new Float32Array(dw * dh);
  for (let dy = 0; dy < dh; dy++) {
    for (let dx = 0; dx < dw; dx++) {
      const sx = (dx + 0.5) * sw / dw - 0.5;
      const sy = (dy + 0.5) * sh / dh - 0.5;
      const x0 = Math.max(0, Math.min(sw - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(sh - 1, Math.floor(sy)));
      const x1 = Math.min(sw - 1, x0 + 1);
      const y1 = Math.min(sh - 1, y0 + 1);
      const fx = sx - x0, fy = sy - y0;
      dst[dy * dw + dx] =
        src[y0 * sw + x0] * (1 - fx) * (1 - fy) +
        src[y0 * sw + x1] * fx * (1 - fy) +
        src[y1 * sw + x0] * (1 - fx) * fy +
        src[y1 * sw + x1] * fx * fy;
    }
  }
  return dst;
}

function replicatePad(src: Float32Array, sw: number, sh: number, pad: number): Float32Array {
  const pw = sw + pad * 2, ph = sh + pad * 2;
  const dst = new Float32Array(pw * ph);
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const sy = Math.max(0, Math.min(sh - 1, y - pad));
      const sx = Math.max(0, Math.min(sw - 1, x - pad));
      dst[y * pw + x] = src[sy * sw + sx];
    }
  }
  return dst;
}

function separableConv(src: Float32Array, w: number, h: number, kRow: number[], kCol: number[]): Float32Array {
  const r = (kRow.length / 2) | 0;
  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) {
        s += src[y * w + Math.max(0, Math.min(w - 1, x + k))] * kRow[k + r];
      }
      tmp[y * w + x] = s;
    }
  }
  const dst = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) {
        s += tmp[Math.max(0, Math.min(h - 1, y + k)) * w + x] * kCol[k + r];
      }
      dst[y * w + x] = s;
    }
  }
  return dst;
}

function computeETF(grayPixels: Float32Array, width: number, height: number, kernelRadius = 5, iterTime = 15) {
  let newW: number, newH: number;
  if (height > width) { newW = Math.round(512 * width / height); newH = 512; }
  else { newW = 512; newH = Math.round(512 * height / width); }

  const resized = bilinearResize(grayPixels, width, height, newW, newH);
  const pad = kernelRadius;
  const padW = newW + pad * 2;
  const padH = newH + pad * 2;
  const padded = replicatePad(resized, newW, newH, pad);

  // Sobel 5x5
  const kRow = [-1, -2, 0, 2, 1];
  const kCol = [1, 4, 6, 4, 1];
  const gx = separableConv(padded, padW, padH, kRow, kCol);
  const gy = separableConv(padded, padW, padH, kCol, kRow);

  const total = padW * padH;
  const mag = new Float32Array(total);
  let maxMag = 0;
  for (let i = 0; i < total; i++) {
    mag[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
    if (mag[i] > maxMag) maxMag = mag[i];
  }
  if (maxMag > 1e-6) for (let i = 0; i < total; i++) mag[i] /= maxMag;

  const tx = new Float32Array(total);
  const ty = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const m = Math.max(mag[i], 1e-12);
    tx[i] = -gy[i] / m;
    ty[i] = gx[i] / m;
  }

  // ETF iteration
  for (let iter = 0; iter < iterTime; iter++) {
    const newTX = new Float32Array(padW * padH);
    const newTY = new Float32Array(padW * padH);

    for (let py = pad; py < padH - pad; py++) {
      for (let px = pad; px < padW - pad; px++) {
        const ci = py * padW + px;
        const txC = tx[ci], tyC = ty[ci], gC = mag[ci];
        let sumX = 0, sumY = 0;

        for (let ky = -pad; ky <= pad; ky++) {
          for (let kx = -pad; kx <= pad; kx++) {
            const ni = (py + ky) * padW + (px + kx);
            const txN = tx[ni], tyN = ty[ni], gN = mag[ni];
            const wm = 0.5 * (1 + Math.tanh(gN - gC));
            const dot = txC * txN + tyC * tyN;
            const wd = Math.abs(dot);
            const phi = dot >= 0 ? 1 : -1;
            const w = wm * wd;
            sumX += phi * txN * w;
            sumY += phi * tyN * w;
          }
        }

        const len = Math.max(Math.sqrt(sumX * sumX + sumY * sumY), 1e-12);
        newTX[ci] = sumX / len;
        newTY[ci] = sumY / len;
      }
    }

    for (let py = pad; py < padH - pad; py++) {
      for (let px = pad; px < padW - pad; px++) {
        const ci = py * padW + px;
        tx[ci] = newTX[ci];
        ty[ci] = newTY[ci];
      }
    }
  }

  const angle = new Float32Array(newW * newH);
  const RAD2DEG = 180 / Math.PI;
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const pi = (y + pad) * padW + (x + pad);
      const txv = tx[pi] || 1e-12;
      const tyv = ty[pi];
      angle[y * newW + x] = Math.atan(-tyv / txv) * RAD2DEG;
    }
  }

  return { angle, workW: newW, workH: newH, gradient: mag, padW, padH, pad };
}

// ── HSV 工具 ────────────────────────────────────────────────────────────

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max, v = max;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, v];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

// ── 完整分析 ────────────────────────────────────────────────────────────

interface AnalysisResult {
  width: number;
  height: number;
  angleETF: Float32Array;
  angleHatch: Float32Array;
  gradient: Float32Array;
  hsv: Float32Array;
  density: Float32Array;
}

function analyze(src: ImageSource, padding = 5): AnalysisResult {
  const { width: origW, height: origH, data } = src;

  // Extract gray
  const gray = new Float32Array(origW * origH);
  for (let i = 0; i < origW * origH; i++) {
    gray[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
  }

  // Extract HSV
  const hsv = new Float32Array(origW * origH * 3);
  for (let i = 0; i < origW * origH; i++) {
    const [h, s, v] = rgbToHsv(data[i * 4] / 255, data[i * 4 + 1] / 255, data[i * 4 + 2] / 255);
    hsv[i * 3] = h * 180;
    hsv[i * 3 + 1] = s * 255;
    hsv[i * 3 + 2] = v * 255;
  }

  // Pad gray
  const grayPad = replicatePad(gray, origW, origH, padding);
  const padW = origW + padding * 2;
  const padH = origH + padding * 2;

  // ETF
  const etf = computeETF(grayPad, padW, padH, 5, 15);
  const { angle: angleETF, workW, workH } = etf;

  // Hatch = ETF + 90
  const angleHatch = new Float32Array(angleETF.length);
  for (let i = 0; i < angleETF.length; i++) {
    let h = angleETF[i] + 90;
    if (h > 90) h -= 180;
    if (h < -90) h += 180;
    angleHatch[i] = h;
  }

  // Gradient at work resolution
  const grayWork = bilinearResize(grayPad, padW, padH, workW, workH);
  const gradMag = new Float32Array(workW * workH);
  for (let y = 1; y < workH - 1; y++) {
    for (let x = 1; x < workW - 1; x++) {
      const gx =
        -grayWork[(y - 1) * workW + (x - 1)] + grayWork[(y - 1) * workW + (x + 1)]
        - 2 * grayWork[y * workW + (x - 1)] + 2 * grayWork[y * workW + (x + 1)]
        - grayWork[(y + 1) * workW + (x - 1)] + grayWork[(y + 1) * workW + (x + 1)];
      const gy =
        -grayWork[(y - 1) * workW + (x - 1)] - 2 * grayWork[(y - 1) * workW + x] - grayWork[(y - 1) * workW + (x + 1)]
        + grayWork[(y + 1) * workW + (x - 1)] + 2 * grayWork[(y + 1) * workW + x] + grayWork[(y + 1) * workW + (x + 1)];
      gradMag[y * workW + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // Density
  const DENSITY_P_MAX = 0.25;
  const DENSITY_P_MIN = 0.0025;
  let maxGrad = 0;
  for (let i = 0; i < gradMag.length; i++) if (gradMag[i] > maxGrad) maxGrad = gradMag[i];
  const invMax = maxGrad > 1e-6 ? 1 / maxGrad : 1;
  const density = new Float32Array(workW * workH);
  for (let i = 0; i < density.length; i++) {
    const g = grayWork[i];
    const gr = gradMag[i] * invMax;
    const d = (1 - g + gr) * 0.5;
    density[i] = DENSITY_P_MIN + d * (DENSITY_P_MAX - DENSITY_P_MIN);
  }

  // HSV resize
  const hsvWork = new Float32Array(workW * workH * 3);
  for (let dy = 0; dy < workH; dy++) {
    for (let dx = 0; dx < workW; dx++) {
      const sx = (dx + 0.5) * origW / workW - 0.5;
      const sy = (dy + 0.5) * origH / workH - 0.5;
      const x0 = Math.max(0, Math.min(origW - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(origH - 1, Math.floor(sy)));
      const x1 = Math.min(origW - 1, x0 + 1), y1 = Math.min(origH - 1, y0 + 1);
      const fx = sx - x0, fy = sy - y0;
      for (let c = 0; c < 3; c++) {
        hsvWork[(dy * workW + dx) * 3 + c] =
          hsv[(y0 * origW + x0) * 3 + c] * (1 - fx) * (1 - fy) + hsv[(y0 * origW + x1) * 3 + c] * fx * (1 - fy) +
          hsv[(y1 * origW + x0) * 3 + c] * (1 - fx) * fy + hsv[(y1 * origW + x1) * 3 + c] * fx * fy;
      }
    }
  }

  return { width: workW, height: workH, angleETF, angleHatch, gradient: gradMag, hsv: hsvWork, density };
}

// ── 泊松采样 ────────────────────────────────────────────────────────────

function sampleAnchors(density: Float32Array, width: number, height: number, nIter = 15): Vec2[] {
  let sum = 0;
  for (let i = 0; i < density.length; i++) sum += density[i];
  const pointNum = Math.max(1, Math.round(sum));

  // Rejection sampling
  let maxD = 0;
  for (let i = 0; i < density.length; i++) if (density[i] > maxD) maxD = density[i];
  if (maxD < 1e-8) maxD = 1;

  let points: Vec2[] = [];
  const maxTry = pointNum * 100;
  let tryCount = 0;
  while (points.length < pointNum && tryCount < maxTry) {
    tryCount++;
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    const ix = Math.min(width - 1, Math.floor(rx));
    const iy = Math.min(height - 1, Math.floor(ry));
    if (Math.random() < density[iy * width + ix] / maxD) {
      points.push({ x: rx, y: ry });
    }
  }
  while (points.length < pointNum) {
    points.push({ x: Math.random() * width, y: Math.random() * height });
  }

  // Lloyd iteration
  for (let iter = 0; iter < nIter; iter++) {
    const n = points.length;
    if (n === 0) break;
    const cellSize = Math.max(1, Math.sqrt(width * height / n));
    const gcW = Math.ceil(width / cellSize) + 1;
    const gcH = Math.ceil(height / cellSize) + 1;

    const buckets: number[][] = Array.from({ length: gcW * gcH }, () => []);
    for (let i = 0; i < n; i++) {
      const gx = Math.min(gcW - 1, Math.floor(points[i].x / cellSize));
      const gy = Math.min(gcH - 1, Math.floor(points[i].y / cellSize));
      buckets[gy * gcW + gx].push(i);
    }

    const sumX = new Float64Array(n);
    const sumY = new Float64Array(n);
    const sumW = new Float64Array(n);

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const dv = density[py * width + px];
        if (dv < 1e-10) continue;
        const gcx = Math.min(gcW - 1, Math.floor(px / cellSize));
        const gcy = Math.min(gcH - 1, Math.floor(py / cellSize));

        let minDist2 = Infinity, nearest = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = gcx + dx, ny = gcy + dy;
            if (nx < 0 || nx >= gcW || ny < 0 || ny >= gcH) continue;
            for (const idx of buckets[ny * gcW + nx]) {
              const ex = px - points[idx].x, ey = py - points[idx].y;
              const d2 = ex * ex + ey * ey;
              if (d2 < minDist2) { minDist2 = d2; nearest = idx; }
            }
          }
        }
        sumX[nearest] += px * dv;
        sumY[nearest] += py * dv;
        sumW[nearest] += dv;
      }
    }

    points = points.map((p, i) =>
      sumW[i] > 1e-10 ? { x: sumX[i] / sumW[i], y: sumY[i] / sumW[i] } : p
    );
  }
  return points;
}

// ── 路径规划 ────────────────────────────────────────────────────────────

interface StrokePatch {
  coordinate: Vec2;
  angleETF: number;
  pathETF: Vec2[];
  lengthPositive: number;
  lengthNegative: number;
  angleHatch: number;
  widthPositive: number;
  widthNegative: number;
  grayscale: number;
  hsv: [number, number, number];
  gradient: number;
  density: number;
  importance: number;
}

function getHSV(r: AnalysisResult, x: number, y: number): [number, number, number] {
  const i = (y * r.width + x) * 3;
  return [r.hsv[i], r.hsv[i + 1], r.hsv[i + 2]];
}

function getRGB(r: AnalysisResult, x: number, y: number): [number, number, number] {
  const [h, s, v] = getHSV(r, x, y);
  return hsvToRgb(h / 180, s / 255, v / 255);
}

function findPath(
  analysis: AnalysisResult, startX: number, startY: number,
  angleField: Float32Array, minLength: number, maxLength: number
): { path: Vec2[]; negLen: number; posLen: number } {
  const { width: w, height: h } = analysis;
  const path: Vec2[] = [{ x: startY, y: startX }];
  const angleRad = angleField[startY * w + startX] * (Math.PI / 180);
  const hsv0 = getHSV(analysis, startX, startY);

  let px = startX, py = startY;
  let nx = startX, ny = startY;
  let goPos = true, goNeg = true;
  let posLen = 0, negLen = 0;
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);

  while (goPos || goNeg) {
    if (goPos) {
      px += dx; py -= dy;
      if (px < 0 || px >= w || py < 0 || py >= h) { goPos = false; }
      else {
        const ix = Math.max(0, Math.min(w - 1, Math.round(px)));
        const iy = Math.max(0, Math.min(h - 1, Math.round(py)));
        const hsvN = getHSV(analysis, ix, iy);
        let dH = Math.abs(hsv0[0] - hsvN[0]);
        dH = Math.min(dH, Math.abs(dH - 180));
        const colorOk = dH <= 30 && Math.abs(hsv0[2] - hsvN[2]) <= 15;
        if (posLen < minLength || (colorOk && posLen < maxLength)) {
          path.push({ x: iy, y: ix }); posLen++;
        } else { goPos = false; }
      }
    }
    if (goNeg) {
      nx -= dx; ny += dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) { goNeg = false; }
      else {
        const ix = Math.max(0, Math.min(w - 1, Math.round(nx)));
        const iy = Math.max(0, Math.min(h - 1, Math.round(ny)));
        const hsvN = getHSV(analysis, ix, iy);
        let dH = Math.abs(hsv0[0] - hsvN[0]);
        dH = Math.min(dH, Math.abs(dH - 180));
        const colorOk = dH <= 30 && Math.abs(hsv0[2] - hsvN[2]) <= 15;
        if (negLen < minLength || (colorOk && negLen < maxLength)) {
          path.unshift({ x: iy, y: ix }); negLen++;
        } else { goNeg = false; }
      }
    }
  }
  return { path, negLen, posLen };
}

function planStrokes(analysis: AnalysisResult, roughness = 1, lloydIter = 15): StrokePatch[] {
  const { width: w, height: h } = analysis;
  const pSize = (roughness + 1) ** 2;
  const pMax = 1 / pSize;
  const pMin = pMax / 100;
  const ratio = 3;
  const maxWidth = Math.sqrt(1 / pMin);
  const minWidth = Math.sqrt(1 / pMax) - 1;
  const maxLen = Math.round(ratio * maxWidth);
  const minLen = Math.round(ratio * minWidth);
  const iMinW = Math.round(minWidth);

  const anchors = sampleAnchors(analysis.density, w, h, lloydIter);
  const patches: StrokePatch[] = [];

  for (const anchor of anchors) {
    const ix = Math.max(0, Math.min(w - 1, Math.round(anchor.x)));
    const iy = Math.max(0, Math.min(h - 1, Math.round(anchor.y)));

    const patch: StrokePatch = {
      coordinate: { x: iy, y: ix },
      angleETF: analysis.angleETF[iy * w + ix],
      pathETF: [],
      lengthPositive: 0,
      lengthNegative: 0,
      angleHatch: analysis.angleHatch[iy * w + ix],
      widthPositive: 0,
      widthNegative: 0,
      grayscale: 0,
      hsv: getHSV(analysis, ix, iy),
      gradient: analysis.gradient[iy * w + ix],
      density: analysis.density[iy * w + ix],
      importance: 0,
    };

    const etfResult = findPath(analysis, ix, iy, analysis.angleETF, minLen, maxLen);
    patch.pathETF = etfResult.path;
    patch.lengthNegative = etfResult.negLen;
    patch.lengthPositive = etfResult.posLen;

    const hatchResult = findPath(analysis, ix, iy, analysis.angleHatch, iMinW, Math.round(maxWidth));
    patch.widthNegative = hatchResult.negLen;
    patch.widthPositive = hatchResult.posLen;

    const [r, g, b] = getRGB(analysis, ix, iy);
    patch.grayscale = Math.round((0.299 * r + 0.587 * g + 0.114 * b) * 255);

    const maxLocalW = Math.sqrt(1 / Math.max(patch.density, 1e-6));
    patch.widthNegative = Math.max(iMinW, Math.min(patch.widthNegative, Math.round(maxLocalW)));
    patch.widthPositive = Math.max(iMinW, Math.min(patch.widthPositive, Math.round(maxLocalW)));
    patch.lengthNegative = Math.max(minLen, Math.min(patch.lengthNegative, Math.round(ratio * maxLocalW)));
    patch.lengthPositive = Math.max(minLen, Math.min(patch.lengthPositive, Math.round(ratio * maxLocalW)));

    const totalW = patch.widthPositive + patch.widthNegative + 1;
    const totalL = patch.lengthPositive + patch.lengthNegative + 1;
    patch.importance = totalW * totalL + (Math.random() - 0.5);
    patches.push(patch);
  }

  patches.sort((a, b) => b.importance - a.importance);
  return patches;
}

// ── Patch → DrawData 转换 ───────────────────────────────────────────────

function patchToDrawData(
  patch: StrokePatch, analysisW: number, analysisH: number,
  canvasW: number, canvasH: number, pixelStep = 10
): StrokeDrawData {
  const scaleX = canvasW / analysisW;
  const scaleY = canvasH / analysisH;
  const totalW = patch.widthPositive + patch.widthNegative + 1;
  const [r, g, b] = hsvToRgb(patch.hsv[0] / 180, patch.hsv[1] / 255, patch.hsv[2] / 255);

  const data: StrokeDrawData = {
    width: totalW * scaleX,
    color: [r, g, b],
    points: [],
  };

  const path = patch.pathETF;
  if (!path || path.length < 2) return data;

  let totalLen = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x, dy = path[i].y - path[i - 1].y;
    totalLen += Math.sqrt(dx * dx + dy * dy);
  }

  const numPts = Math.max(2, Math.round(totalLen / pixelStep));
  for (let j = 0; j < numPts; j++) {
    const t = j / (numPts - 1);
    const pathPos = t * (path.length - 1);
    const idx = Math.min(Math.floor(pathPos), path.length - 2);
    const frac = pathPos - idx;

    const colF = path[idx].y + (path[idx + 1].y - path[idx].y) * frac;
    const rowF = path[idx].x + (path[idx + 1].x - path[idx].x) * frac;

    const cx = Math.round(colF * scaleX);
    const cy = Math.round(rowF * scaleY);
    if (cx < 0 || cx >= canvasW || cy < 0 || cy >= canvasH) continue;
    data.points.push({ x: cx, y: cy });
  }
  return data;
}

// ── 公共 API ────────────────────────────────────────────────────────────

/**
 * 完整流水线：图像 → 笔触序列
 */
export async function decomposeImage(
  src: ImageSource,
  canvasW = 512,
  canvasH = 512,
  opts: DecomposeOptions = {}
): Promise<StrokeDrawData[]> {
  const { roughness = 1, lloydIter = 8, pixelStep = 10, padding = 5, mood = 'original' } = opts;

  // 让 UI 有机会刷新
  await new Promise(r => setTimeout(r, 10));

  const analysis = analyze(src, padding);

  await new Promise(r => setTimeout(r, 10));

  const patches = planStrokes(analysis, roughness, lloydIter);

  const strokes: StrokeDrawData[] = [];
  for (const p of patches) {
    const sd = patchToDrawData(p, analysis.width, analysis.height, canvasW, canvasH, pixelStep);
    if (sd.points.length >= 2) strokes.push(sd);
  }

  // 根据 mood 对颜色做 HSV 偏移
  if (mood && mood !== 'original') {
    applyMoodShift(strokes, mood);
  }

  return strokes;
}

/**
 * 对笔触颜色做情绪色调偏移
 * warm: 色相偏暖(+15°)，饱和度+10%
 * calm: 色相偏冷蓝(-20°)，饱和度-10%，亮度+5%
 * vivid: 饱和度+25%
 * dreamy: 亮度+15%，饱和度-15%，色相偏紫(+30°)
 */
function applyMoodShift(strokes: StrokeDrawData[], mood: string) {
  for (const s of strokes) {
    let [r, g, b] = s.color; // 0-1 范围
    // RGB → HSV
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, sat = max === 0 ? 0 : d / max, v = max;
    if (d > 0) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }

    // 应用偏移
    switch (mood) {
      case 'warm':
        h = (h + 15 / 360 + 1) % 1;   // 色相 +15°（偏暖）
        sat = Math.min(1, sat + 0.1);
        break;
      case 'calm':
        h = (h - 20 / 360 + 1) % 1;   // 色相 -20°（偏冷蓝）
        sat = Math.max(0, sat - 0.1);
        v = Math.min(1, v + 0.05);
        break;
      case 'vivid':
        sat = Math.min(1, sat + 0.25); // 高饱和
        break;
      case 'dreamy':
        h = (h + 30 / 360 + 1) % 1;   // 色相 +30°（偏紫）
        sat = Math.max(0, sat - 0.15);
        v = Math.min(1, v + 0.15);
        break;
    }

    // HSV → RGB
    const [nr, ng, nb] = hsvToRgb(h, sat, v);
    s.color = [nr, ng, nb];
  }
}

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
 * 绘制引导线（虚线 + 发光效果）
 */
export function drawGuideStroke(ctx: CanvasRenderingContext2D, stroke: StrokeDrawData) {
  const pts = stroke.points;
  if (pts.length < 2) return;

  // Glow layer
  ctx.save();
  ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = Math.max(2, stroke.width + 4);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([8, 6]);

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
  ctx.restore();
}

/**
 * 序列化笔触为 DrawData.txt 格式
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

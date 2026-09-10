import type { ImageSource, StrokeDrawData } from './stroke-engine';
import { STROKE_CONFIG, type PlanningProgress } from './stroke-config';

export const BUDGET_ENGINE_VERSION = STROKE_CONFIG.version;
/** Greedy full-footprint least-squares painting. No contour pass, truncation,
 * palette quantization or reference-image underlay. Matches drawStroke's .85 alpha.
 * Search is deterministic so an approved study material can be reproduced. */
export async function planBudgetStrokes(
  source: ImageSource,
  canvasW: number,
  canvasH: number,
  budget: number = STROKE_CONFIG.defaultBudget,
  roughness = 2,
  opacity = 0.85,
  onProgress?: (progress: PlanningProgress) => void,
): Promise<StrokeDrawData[]> {
  if (
    !Number.isFinite(budget) ||
    budget < 1 ||
    budget > STROKE_CONFIG.maxBudget ||
    !Number.isInteger(budget)
  )
    throw new Error('笔触预算必须是 1—1000 的整数');
  if (!Number.isFinite(opacity) || opacity <= 0 || opacity > 1)
    throw new Error('笔刷透明度无效');
  if (
    !Number.isInteger(source.width) ||
    !Number.isInteger(source.height) ||
    source.width < 1 ||
    source.height < 1 ||
    source.data.length !== source.width * source.height * 4 ||
    !Number.isFinite(canvasW) ||
    !Number.isFinite(canvasH) ||
    canvasW < 1 ||
    canvasH < 1
  )
    throw new Error('图像尺寸或像素无效');
  const scale = Math.min(1, (budget > 200 ? STROKE_CONFIG.analysisSize : STROKE_CONFIG.comparisonSize) / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const target = new Float32Array(w * h * 3);
  // Area sampling preserves narrow features and composites transparent uploads on white.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const fromX = Math.floor((x * source.width) / w),
        toX = Math.ceil(((x + 1) * source.width) / w);
      const fromY = Math.floor((y * source.height) / h),
        toY = Math.ceil(((y + 1) * source.height) / h);
      let count = 0;
      for (let sy = fromY; sy < toY; sy++)
        for (let sx = fromX; sx < toX; sx++) {
          const i = (sy * source.width + sx) * 4,
            a = source.data[i + 3] / 255;
          for (let c = 0; c < 3; c++)
            target[(y * w + x) * 3 + c] +=
              (source.data[i + c] / 255) * a + 1 - a;
          count++;
        }
      for (let c = 0; c < 3; c++) target[(y * w + x) * 3 + c] /= count;
    }
  const canvas = new Float32Array(target.length).fill(1);
  const weights = new Float32Array(w * h).fill(1);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      let edge = 0;
      for (let c = 0; c < 3; c++)
        edge +=
          Math.abs(
            target[(y * w + x + 1) * 3 + c] - target[(y * w + x - 1) * 3 + c],
          ) +
          Math.abs(
            target[((y + 1) * w + x) * 3 + c] -
              target[((y - 1) * w + x) * 3 + c],
          );
      weights[y * w + x] = 1 + Math.min(2, edge);
    }
  let seed = 74921;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
  type Candidate = {
    x: number;
    y: number;
    angle: number;
    length: number;
    width: number;
  };
  type Fit = {
    stroke: StrokeDrawData;
    gain: number;
    indices: number[];
    alphas: number[];
  };
  function fit(p: Candidate): Fit {
    const dx = (Math.cos(p.angle) * p.length) / 2,
      dy = (Math.sin(p.angle) * p.length) / 2;
    const x1 = clamp(p.x - dx, w - 0.001),
      y1 = clamp(p.y - dy, h - 0.001);
    const x2 = clamp(p.x + dx, w - 0.001),
      y2 = clamp(p.y + dy, h - 0.001);
    const vx = x2 - x1,
      vy = y2 - y1,
      len2 = vx * vx + vy * vy;
    const r = p.width / 2;
    const indices: number[] = [],
      alphas: number[] = [];
    const color: [number, number, number] = [0, 0, 0];
    let denominator = 0;
    for (
      let y = Math.max(0, Math.floor(Math.min(y1, y2) - r));
      y < Math.min(h, Math.ceil(Math.max(y1, y2) + r));
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(Math.min(x1, x2) - r));
        x < Math.min(w, Math.ceil(Math.max(x1, x2) + r));
        x++
      ) {
        const t = len2
          ? clamp(((x + 0.5 - x1) * vx + (y + 0.5 - y1) * vy) / len2, 1)
          : 0;
        const distance = Math.hypot(
          x + 0.5 - x1 - t * vx,
          y + 0.5 - y1 - t * vy,
        );
        const a = opacity * clamp(r + 0.5 - distance, 1);
        if (!a) continue;
        const index = y * w + x,
          weight = weights[index];
        indices.push(index);
        alphas.push(a);
        denominator += weight * a * a;
        for (let c = 0; c < 3; c++)
          color[c] +=
            weight *
            a *
            (target[index * 3 + c] - (1 - a) * canvas[index * 3 + c]);
      }
    }
    for (let c = 0; c < 3; c++)
      color[c] = clamp(color[c] / (denominator || 1), 1);
    let gain = 0;
    for (let j = 0; j < indices.length; j++) {
      const index = indices[j],
        a = alphas[j];
      for (let c = 0; c < 3; c++) {
        const before = target[index * 3 + c] - canvas[index * 3 + c];
        const after =
          target[index * 3 + c] -
          ((1 - a) * canvas[index * 3 + c] + a * color[c]);
        gain += weights[index] * (before * before - after * after);
      }
    }
    if (Math.hypot(vx, vy) <= 0.006 * Math.hypot(w, h)) gain = -1;
    return {
      stroke: {
        points: [
          { x: x1, y: y1 },
          { x: x2, y: y2 },
        ],
        width: p.width,
        color,
      },
      gain,
      indices,
      alphas,
    };
  }
  const strokes: StrokeDrawData[] = [];
  const cumulative = new Float64Array(w * h);
  for (let n = 0; n < budget; n++) {
    if (n % 20 === 0) onProgress?.({ completed: n, total: budget, strokes: strokes.length });
    if (n % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    let total = 0;
    for (let i = 0; i < cumulative.length; i++) {
      let error = 0;
      for (let c = 0; c < 3; c++)
        error += (target[i * 3 + c] - canvas[i * 3 + c]) ** 2;
      total += error * weights[i];
      cumulative[i] = total;
    }
    if (total < 1e-6) break;
    let best: Fit | undefined, bestCandidate: Candidate | undefined;
    const maxWidth = Math.max(
      2,
      Math.min(w, h) * (0.3 * Math.max(0, 1 - n / Math.min(budget, 300)) ** 1.5 + (budget > 200 ? 0.012 : 0.035)),
    );
    for (let trial = 0; trial < 64; trial++) {
      const choice = random() * total;
      let lo = 0,
        hi = cumulative.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (cumulative[mid] < choice) lo = mid + 1;
        else hi = mid;
      }
      const width = Math.max(
        1,
        maxWidth * (0.1 + 0.9 * random() ** (roughness <= 1 ? 1.4 : roughness >= 3 ? 0.45 : 0.8)),
      );
      const p: Candidate = {
        x: (lo % w) + 0.5,
        y: Math.floor(lo / w) + 0.5,
        width,
        angle: random() * Math.PI,
        length: Math.min(
          Math.hypot(w, h) * 0.55,
          Math.max(2, width * (0.5 + random() * 4)),
        ),
      };
      const result = fit(p);
      if (!best || result.gain > best.gain) {
        best = result;
        bestCandidate = p;
      }
    }
    // Local parameter refinement can turn a sampled stroke into a boundary-aligned one.
    for (let trial = 0; trial < 36; trial++) {
      const p = bestCandidate!;
      const amount = trial < 18 ? 0.5 : 0.18;
      const candidate = {
        x: clamp(p.x + (random() - 0.5) * p.width * amount, w - 0.001),
        y: clamp(p.y + (random() - 0.5) * p.width * amount, h - 0.001),
        angle: p.angle + (random() - 0.5) * amount,
        width: Math.max(
          1,
          Math.min(
            Math.min(w, h) * 0.33,
            p.width * (1 + (random() - 0.5) * amount),
          ),
        ),
        length: Math.max(
          2,
          Math.min(
            Math.hypot(w, h) * 0.55,
            p.length * (1 + (random() - 0.5) * amount),
          ),
        ),
      };
      const result = fit(candidate);
      if (result.gain > best!.gain) {
        best = result;
        bestCandidate = candidate;
      }
    }
    // A coarse search failure must not discard the reserved fine-scale budget.
    if (!best || best.gain <= 1e-7) continue;
    for (let j = 0; j < best.indices.length; j++) {
      const i = best.indices[j] * 3,
        a = best.alphas[j];
      for (let c = 0; c < 3; c++)
        canvas[i + c] = canvas[i + c] * (1 - a) + best.stroke.color[c] * a;
    }
    strokes.push({
      ...best.stroke,
      width: best.stroke.width * Math.min(canvasW / w, canvasH / h),
      points: best.stroke.points.map((p) => ({
        x: (p.x * canvasW) / w,
        y: (p.y * canvasH) / h,
      })),
    });
  }
  onProgress?.({ completed: budget, total: budget, strokes: strokes.length });
  return strokes;
}

import type { ImageSource, Vec2 } from './stroke-engine';
import { blurPaintingReference, PaintingNeighborhoods, type PaintingBounds } from './expressive-scheduling';

export const EXPRESSIVE_VERSION = 'local-curved-painter-3-coherent';
export const CO_CREATION_BUDGET = 2000;
export type ColorMood = 'original' | 'sunlit' | 'dusk' | 'vivid' | 'morandi' | 'dopamine';
export interface ExpressionSettings { abstraction: number; mood: ColorMood }
export const DEFAULT_EXPRESSION: ExpressionSettings = { abstraction: 60, mood: 'original' };
export interface ExpressiveStroke {
  points: Vec2[];
  radii: number[];
  color: [number, number, number];
  opacity: number;
  planning?: { pass: number; region: number; visit: number };
}
export interface PaintRegion { x: number; y: number; width: number; height: number }
const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
function validate(image: ImageSource) {
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.data.length !== image.width * image.height * 4) throw new Error('绘画图像无效');
}
function resize(image: ImageSource, w: number, h: number): Float32Array {
  validate(image);
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let count = 0;
    for (let sy = Math.floor(y * image.height / h); sy < Math.ceil((y + 1) * image.height / h); sy++) {
      for (let sx = Math.floor(x * image.width / w); sx < Math.ceil((x + 1) * image.width / w); sx++) {
        const j = (sy * image.width + sx) * 4, a = image.data[j + 3] / 255;
        for (let c = 0; c < 3; c++) out[(y * w + x) * 3 + c] += image.data[j + c] / 255 * a + 1 - a;
        count++;
      }
    }
    for (let c = 0; c < 3; c++) out[(y * w + x) * 3 + c] /= count;
  }
  return out;
}

/** Edge-aware simplification and a shared, image-derived palette. Never mutates the source. */
export function prepareExpressiveTarget(source: ImageSource, settings: ExpressionSettings) {
  validate(source);
  const amount = clamp(Number.isFinite(settings.abstraction) ? settings.abstraction / 100 : .6);
  const scale = Math.min(1, 320 / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale)), h = Math.max(1, Math.round(source.height * scale));
  const raw = resize(source, w, h), target = raw.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3;
    if (Math.min(raw[i], raw[i + 1], raw[i + 2]) > .985) continue;
    const sum = [0, 0, 0]; let mass = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const j = (clamp(y + dy, 0, h - 1) * w + clamp(x + dx, 0, w - 1)) * 3;
      const diff = (raw[i] - raw[j]) ** 2 + (raw[i + 1] - raw[j + 1]) ** 2 + (raw[i + 2] - raw[j + 2]) ** 2;
      const weight = Math.exp(-diff / .025 - (dx * dx + dy * dy) / 5);
      mass += weight;
      for (let c = 0; c < 3; c++) sum[c] += raw[j + c] * weight;
    }
    for (let c = 0; c < 3; c++) target[i + c] = raw[i + c] * (1 - amount) + sum[c] / mass * amount;
  }
  // Farthest-point initialization avoids a palette dominated by white backgrounds.
  const samples: number[][] = [];
  const stride = Math.max(1, Math.floor(w * h / 1800));
  for (let p = 0; p < w * h; p += stride) {
    const c = Array.from(target.slice(p * 3, p * 3 + 3));
    if (Math.min(...c) < .97) samples.push(c);
  }
  const palette = samples.length ? [samples[Math.floor(samples.length / 2)].slice()] : [[1, 1, 1]];
  const distance = (a: number[], b: number[]) => a.reduce((s, v, c) => s + (v - b[c]) ** 2, 0);
  for (let k = 1; k < Math.round(24 - amount * 12) && samples.length; k++) {
    let best = samples[0], farthest = 0;
    for (const sample of samples) {
      const d = Math.min(...palette.map(p => distance(sample, p)));
      if (d > farthest) { best = sample; farthest = d; }
    }
    if (farthest < .0003) break;
    palette.push(best.slice());
  }
  for (let iteration = 0; iteration < 4; iteration++) {
    const sums = palette.map(() => [0, 0, 0, 0]);
    for (const sample of samples) {
      let nearest = 0;
      for (let k = 1; k < palette.length; k++) if (distance(sample, palette[k]) < distance(sample, palette[nearest])) nearest = k;
      for (let c = 0; c < 3; c++) sums[nearest][c] += sample[c];
      sums[nearest][3]++;
    }
    sums.forEach((sum, k) => { if (sum[3]) palette[k] = sum.slice(0, 3).map(v => v / sum[3]); });
  }
  for (let i = 0; i < target.length; i += 3) {
    if (Math.min(raw[i], raw[i + 1], raw[i + 2]) > .985) continue;
    const color = [target[i], target[i + 1], target[i + 2]];
    let nearest = palette[0];
    for (const p of palette) if (distance(color, p) < distance(color, nearest)) nearest = p;
    const luminance = color[0] * .299 + color[1] * .587 + color[2] * .114;
    const tint = settings.mood === 'sunlit' ? [1, .70, .38] : settings.mood === 'dusk' ? [.57, .61, .91] : color;
    const tintAmount = settings.mood === 'original' ? 0 : .16 * (.45 + luminance);
    for (let c = 0; c < 3; c++) {
      const simplified = color[c] * (1 - amount * .78) + nearest[c] * amount * .78;
      let toned = simplified * (1 - tintAmount) + tint[c] * tintAmount;
      if (settings.mood === 'vivid') toned = (luminance + (simplified - luminance) * 1.5 - .5) * 1.12 + .5;
      if (settings.mood === 'morandi') toned = (luminance + (simplified - luminance) * .42) * .78 + [.16, .15, .14][c];
      if (settings.mood === 'dopamine') toned = (luminance + (simplified - luminance) * 1.9) * .92 + .08;
      target[i + c] = clamp(toned);
    }
  }
  return { width: w, height: h, pixels: target };
}

/** Real curved brush marks; shared geometry is used for planning and canvas playback. */
export function drawExpressiveStroke(ctx: CanvasRenderingContext2D, stroke: ExpressiveStroke, bristlesOnly = false, fade = 1) {
  const p = stroke.points;
  if (p.length < 2) return;
  const left: Vec2[] = [], right: Vec2[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    const angle = Math.atan2(b.y - a.y, b.x - a.x), r = stroke.radii[i];
    left.push({ x: p[i].x - Math.sin(angle) * r, y: p[i].y + Math.cos(angle) * r });
    right.push({ x: p[i].x + Math.sin(angle) * r, y: p[i].y - Math.cos(angle) * r });
  }
  // White correction strokes must stay white; shading them would leave grey marks on paper.
  const pigment = clamp((1 - Math.min(...stroke.color) - .025) * 5);
  const rgb = (factor: number) => `rgb(${stroke.color.map(v => Math.round(clamp(v * (1 + (factor - 1) * pigment)) * 255)).join(',')})`;
  ctx.save(); ctx.globalAlpha = stroke.opacity;
  const mid = Math.floor(p.length / 2);
  const gradient = ctx.createLinearGradient(left[mid].x, left[mid].y, right[mid].x, right[mid].y);
  gradient.addColorStop(0, rgb(.97)); gradient.addColorStop(.45, rgb(1.015)); gradient.addColorStop(1, rgb(.99));
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.moveTo(left[0].x, left[0].y);
  left.slice(1).forEach(q => ctx.lineTo(q.x, q.y));
  const end = p.length - 1, endAngle = Math.atan2(p[end].y - p[end - 1].y, p[end].x - p[end - 1].x);
  ctx.arc(p[end].x, p[end].y, stroke.radii[end], endAngle + Math.PI / 2, endAngle - Math.PI / 2, true);
  right.slice(0, -1).reverse().forEach(q => ctx.lineTo(q.x, q.y));
  const startAngle = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
  ctx.arc(p[0].x, p[0].y, stroke.radii[0], startAngle - Math.PI / 2, startAngle + Math.PI / 2, true);
  ctx.closePath();
  if (!bristlesOnly) { ctx.fill(); ctx.restore(); return; }
  // Temporary bristle highlights are rendered only on the separate fading overlay.
  ctx.clip();
  ctx.strokeStyle = '#fff';
  ctx.globalAlpha = fade * .60 * pigment;
  ctx.lineCap = 'round';
  for (let strand = 0; strand < 7; strand++) {
    const offset = -.78 + strand * .25;
    ctx.lineWidth = .7 + (strand % 3) * .23;
    ctx.beginPath();
    p.forEach((point, i) => {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const r = stroke.radii[i] * offset;
      const x = point.x - Math.sin(angle) * r, y = point.y + Math.cos(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.restore();
}

export async function planExpressivePainting(source: ImageSource, current: ImageSource, settings: ExpressionSettings, options: {
  budget?: number;
  priority?: PaintRegion;
  origin?: Vec2;
  resumePass?: number;
  onBatch?: (strokes: ExpressiveStroke[]) => void;
  onProgress?: (progress: { completed: number; total: number }) => void;
}) {
  validate(current);
  const budget = options.budget ?? CO_CREATION_BUDGET;
  if (!Number.isInteger(budget) || budget < 1 || budget > CO_CREATION_BUDGET) throw new Error('笔触预算无效');
  const { width: w, height: h, pixels: target } = prepareExpressiveTarget(source, settings);
  const canvas = resize(current, w, h), sx = current.width / w, sy = current.height / h;
  const amount = clamp(Number.isFinite(settings.abstraction) ? settings.abstraction / 100 : .6);
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h), edges = new Float32Array(w * h);
  let seed = 19790517;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const index = (x: number, y: number) => Math.round(clamp(y, 0, h - 1)) * w + Math.round(clamp(x, 0, w - 1));
  const region = options.priority;
  if (region && (![region.x, region.y, region.width, region.height].every(Number.isFinite) || region.width <= 0 || region.height <= 0)) throw new Error('续绘区域无效');
  if (options.resumePass !== undefined && (!Number.isInteger(options.resumePass) || options.resumePass < 0 || options.resumePass > 3)) throw new Error('续绘阶段无效');
  const widths = [25, 14, 7, 3.8].map(v => Math.max(1.2, v * Math.min(w, h) / 240));
  const startPass = region ? options.resumePass ?? (Math.min(region.width / sx, region.height / sy) < widths[1] * 2 ? 2 : 1) : 0;
  const padding = Math.ceil(Math.max(widths[startPass] * 1.5, Math.min(w, h) * .035));
  const focus: PaintingBounds | undefined = region ? {
    left: clamp(Math.floor(region.x / sx) - padding, 0, w), top: clamp(Math.floor(region.y / sy) - padding, 0, h),
    right: clamp(Math.ceil((region.x + region.width) / sx) + padding, 0, w), bottom: clamp(Math.ceil((region.y + region.height) / sy) + padding, 0, h),
  } : undefined;
  // 已完成的画只局部续绘；中途介入则在原尺度上接着完成全图。
  const scope: PaintingBounds = focus && options.resumePass === undefined ? focus : { left: 0, top: 0, right: w, bottom: h };
  let reference: Float32Array = target;
  const priority = (p: number) => region && p % w * sx >= region.x && p % w * sx <= region.x + region.width
    && Math.floor(p / w) * sy >= region.y && Math.floor(p / w) * sy <= region.y + region.height ? 4 : 1;
  const error = (p: number) => {
    let e = 0;
    for (let c = 0; c < 3; c++) e += (reference[p * 3 + c] - canvas[p * 3 + c]) ** 2;
    return e;
  };
  const strokes: ExpressiveStroke[] = [], batch: ExpressiveStroke[] = [];
  let initialError = 0;
  for (let y = scope.top; y < scope.bottom; y++) for (let x = scope.left; x < scope.right; x++) initialError += error(y * w + x);
  if (initialError < .00001) { options.onProgress?.({ completed: budget, total: budget }); return strokes; }
  const residual = new Float64Array(w * h), sampleIndices = new Int32Array(w * h);
  const passShares = [.25, .45, .25, .05];
  const totalShare = passShares.slice(startPass).reduce((sum, v) => sum + v, 0);
  let share = 0;
  let lastTip: Vec2 | null = options.origin && Number.isFinite(options.origin.x) && Number.isFinite(options.origin.y)
    ? { x: options.origin.x / sx, y: options.origin.y / sy } : null;
  let lastColor: number[] | null = null;
  let lastAngle: number | null = null;
  let cursor = 0;
  for (let pass = startPass; pass < passShares.length; pass++) {
    share += passShares[pass];
    const end = pass === passShares.length - 1 ? budget : Math.round(budget * share / totalShare);
    reference = blurPaintingReference(target, w, h, pass < 2 ? Math.max(1, Math.round(widths[pass] * .18)) : pass === 2 ? Math.floor(widths[pass] * .15) : 0);
    if (reference !== target) for (let p = 0; p < w * h; p++) {
      // 参考尺度不向未着色的纸面扩散颜色，避免照片留白出现模糊光晕。
      if (Math.min(target[p * 3], target[p * 3 + 1], target[p * 3 + 2]) > .985) reference.fill(1, p * 3, p * 3 + 3);
    }
    gx.fill(0); gy.fill(0); edges.fill(0);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      let strongest = 0;
      for (let c = 0; c < 3; c++) {
        const dx = reference[(p + 1) * 3 + c] - reference[(p - 1) * 3 + c];
        const dy = reference[(p + w) * 3 + c] - reference[(p - w) * 3 + c];
        const strength = dx * dx + dy * dy;
        if (strength > strongest) { gx[p] = dx; gy[p] = dy; strongest = strength; }
      }
      edges[p] = Math.sqrt(strongest);
    }
    const weights = new Float64Array(w * h);
    const weightAt = (p: number) => {
      const x = p % w, y = Math.floor(p / w);
      if (x < scope.left || x >= scope.right || y < scope.top || y >= scope.bottom) return 0;
      const e = error(p);
      return e < .0003 ? 0 : e * (1 + edges[p] * (pass > 1 ? 2 : .5)) * priority(p);
    };
    for (let p = 0; p < weights.length; p++) weights[p] = weightAt(p);
    const neighborhoods = new PaintingNeighborhoods(w, h, weights, scope, focus);
    for (; cursor < end; cursor++) {
      const window = neighborhoods.window(end - cursor, lastTip);
      if (!window) break;
      let total = 0, count = 0;
      for (let y = window.top; y < window.bottom; y++) for (let x = window.left; x < window.right; x++) {
        const p = y * w + x;
        if (!weights[p]) continue;
        total += weights[p]; residual[count] = total; sampleIndices[count++] = p;
      }
      if (total < .00001) { neighborhoods.recordAttempt(false); continue; }
      let best: { stroke: ExpressiveStroke; indices: number[]; alphas: number[]; gain: number; score: number } | undefined;
      for (let trial = 0; trial < 10; trial++) {
        const pick = random() * total;
        let lo = 0, hi = count - 1;
        while (lo < hi) { const mid = (lo + hi) >>> 1; if (residual[mid] < pick) lo = mid + 1; else hi = mid; }
        let x = sampleIndices[lo] % w, y = Math.floor(sampleIndices[lo] / w);
        let center = index(x, y);
        const width = widths[pass] * (edges[center] > .15 ? .65 : 1) * (.85 + random() * .3);
        const margin = Math.min(width / 2 + 1, Math.max(0, (Math.min(scope.right - scope.left, scope.bottom - scope.top) - 1) / 2));
        const left = scope.left > 0 ? scope.left + margin : 0, right = scope.right < w ? scope.right - 1 - margin : w - 1;
        const top = scope.top > 0 ? scope.top + margin : 0, bottom = scope.bottom < h ? scope.bottom - 1 - margin : h - 1;
        x = clamp(x, left, right); y = clamp(y, top, bottom);
        center = index(x, y);
        const color = [reference[center * 3], reference[center * 3 + 1], reference[center * 3 + 2]] as [number, number, number];
        const opacity = Math.min(...color) > .985 ? 1 : .94;
        const fallback = .6 * Math.sin(x / 48) + .5 * Math.cos(y / 57) + .4;
        const angle = edges[center] > .015 ? Math.atan2(gy[center], gx[center]) + Math.PI / 2 : fallback;
        const trace = (sign: number) => {
          const points: Vec2[] = []; let px = x, py = y, dx = Math.cos(angle) * sign, dy = Math.sin(angle) * sign;
          for (let step = 0; step < 5; step++) {
            const p = index(px, py);
            if (edges[p] > .015) {
              let tx = -gy[p], ty = gx[p]; const norm = Math.hypot(tx, ty);
              tx /= norm; ty /= norm;
              if (tx * dx + ty * dy < 0) { tx = -tx; ty = -ty; }
              dx = dx * .65 + tx * .35; dy = dy * .65 + ty * .35;
            }
            const norm = Math.hypot(dx, dy); dx /= norm; dy /= norm;
            const nx = px + dx * Math.max(.7, width * .48), ny = py + dy * Math.max(.7, width * .48);
            if (nx < left || ny < top || nx > right || ny > bottom) break;
            const next = index(nx, ny);
            const diff = color.reduce((s, v, c) => s + (v - reference[next * 3 + c]) ** 2, 0);
            if (diff > .035 + amount * .055) break;
            points.push({ x: nx, y: ny }); px = nx; py = ny;
          }
          return points;
        };
        const points = [...trace(-1).reverse(), { x, y }, ...trace(1)];
        if (points.length < 2) points.push({ x: clamp(x + .5, left, right), y: clamp(y + .5, top, bottom) });
        if (lastTip && Math.hypot(points.at(-1)!.x - lastTip.x, points.at(-1)!.y - lastTip.y) < Math.hypot(points[0].x - lastTip.x, points[0].y - lastTip.y)) points.reverse();
        const radii = points.map((_, i) => width / 2 * (.68 + .32 * Math.sin(Math.PI * i / (points.length - 1))));
        const indices: number[] = [], alphas: number[] = [];
        const minX = Math.max(0, Math.floor(Math.min(...points.map(p => p.x)) - width / 2 - 1));
        const maxX = Math.min(w - 1, Math.ceil(Math.max(...points.map(p => p.x)) + width / 2 + 1));
        const minY = Math.max(0, Math.floor(Math.min(...points.map(p => p.y)) - width / 2 - 1));
        const maxY = Math.min(h - 1, Math.ceil(Math.max(...points.map(p => p.y)) + width / 2 + 1));
        let gain = 0;
        for (let yy = minY; yy <= maxY; yy++) for (let xx = minX; xx <= maxX; xx++) {
          let coverage = 0;
          for (let k = 1; k < points.length; k++) {
            const a = points[k - 1], b = points[k], vx = b.x - a.x, vy = b.y - a.y;
            const t = clamp(((xx - a.x) * vx + (yy - a.y) * vy) / (vx * vx + vy * vy || 1));
            const r = radii[k - 1] * (1 - t) + radii[k] * t;
            coverage = Math.max(coverage, clamp(r + .5 - Math.hypot(xx - a.x - t * vx, yy - a.y - t * vy)));
          }
          const alpha = coverage * opacity;
          if (!alpha) continue;
          const p = yy * w + xx;
          for (let c = 0; c < 3; c++) {
            const before = reference[p * 3 + c] - canvas[p * 3 + c];
            const after = reference[p * 3 + c] - (canvas[p * 3 + c] * (1 - alpha) + color[c] * alpha);
            gain += (before * before - after * after) * priority(p);
          }
          indices.push(p); alphas.push(alpha);
        }
        const distance = lastTip ? Math.hypot(points[0].x - lastTip.x, points[0].y - lastTip.y) / neighborhoods.cellSize : 0;
        const colorChange = lastColor ? Math.hypot(...color.map((v, c) => v - lastColor![c])) : 0;
        const startAngle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
        const directionChange = lastAngle === null ? 0 : (1 - Math.cos(startAngle - lastAngle)) / 2;
        const score = gain / (1 + distance * .55 + colorChange * .2 + directionChange * .12);
        if (!best || score > best.score) best = { stroke: { points, radii, color, opacity, planning: { pass, region: window.region, visit: window.visit } }, indices, alphas, gain, score };
      }
      neighborhoods.recordAttempt(!!best && best.gain > .000001);
      if (best && best.gain > .000001) {
        best.indices.forEach((p, j) => {
          for (let c = 0; c < 3; c++) canvas[p * 3 + c] = canvas[p * 3 + c] * (1 - best!.alphas[j]) + best!.stroke.color[c] * best!.alphas[j];
          neighborhoods.update(p, weightAt(p));
        });
        lastTip = best.stroke.points.at(-1)!;
        lastColor = best.stroke.color;
        const previous = best.stroke.points.at(-2)!;
        lastAngle = Math.atan2(lastTip.y - previous.y, lastTip.x - previous.x);
        const stroke = { ...best.stroke, points: best.stroke.points.map(p => ({ x: p.x * sx, y: p.y * sy })), radii: best.stroke.radii.map(r => r * Math.min(sx, sy)) };
        strokes.push(stroke); batch.push(stroke);
      }
      if (batch.length >= 8) options.onBatch?.(batch.splice(0));
      if (cursor % 12 === 0) { options.onProgress?.({ completed: cursor, total: budget }); await new Promise(resolve => setTimeout(resolve, 0)); }
    }
  }
  if (batch.length) options.onBatch?.(batch);
  options.onProgress?.({ completed: budget, total: budget });
  return strokes;
}

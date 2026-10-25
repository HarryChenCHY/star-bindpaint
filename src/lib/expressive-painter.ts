import type { ImageSource, Vec2 } from './stroke-engine';

export const EXPRESSIVE_VERSION = 'local-curved-painter-2';
export const CO_CREATION_BUDGET = 2000;
export type ColorMood = 'original' | 'sunlit' | 'dusk' | 'vivid' | 'morandi' | 'dopamine';
export interface ExpressionSettings { abstraction: number; mood: ColorMood }
export const DEFAULT_EXPRESSION: ExpressionSettings = { abstraction: 60, mood: 'original' };
export interface ExpressiveStroke {
  points: Vec2[];
  radii: number[];
  color: [number, number, number];
  opacity: number;
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
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    let strongest = 0;
    for (let c = 0; c < 3; c++) {
      const dx = target[(p + 1) * 3 + c] - target[(p - 1) * 3 + c];
      const dy = target[(p + w) * 3 + c] - target[(p - w) * 3 + c];
      const strength = dx * dx + dy * dy;
      if (strength > strongest) { gx[p] = dx; gy[p] = dy; strongest = strength; }
    }
    edges[p] = Math.sqrt(strongest);
  }
  let seed = 19790517;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const index = (x: number, y: number) => Math.round(clamp(y, 0, h - 1)) * w + Math.round(clamp(x, 0, w - 1));
  const priority = (p: number) => {
    const r = options.priority;
    return r && p % w * sx >= r.x && p % w * sx <= r.x + r.width && Math.floor(p / w) * sy >= r.y && Math.floor(p / w) * sy <= r.y + r.height ? 4 : 1;
  };
  const error = (p: number) => {
    let e = 0;
    for (let c = 0; c < 3; c++) e += (target[p * 3 + c] - canvas[p * 3 + c]) ** 2;
    return e;
  };
  const strokes: ExpressiveStroke[] = [], batch: ExpressiveStroke[] = [];
  const residual = new Float32Array(w * h);
  // Spend most of the budget on coherent color masses; keep final accents sparse.
  const passEnds = [.22, .52, .82, 1];
  const widths = [25, 14, 7, 3.8].map(v => Math.max(1.2, v * Math.min(w, h) / 240));
  let cursor = 0;
  for (let pass = 0; pass < passEnds.length; pass++) {
    const end = Math.round(budget * passEnds[pass]);
    for (; cursor < end; cursor++) {
      // One residual scan per stroke replaces the legacy 100-candidate stochastic fit.
      let total = 0;
      for (let p = 0; p < residual.length; p++) {
        total += error(p) * (1 + edges[p] * (pass > 1 ? 2 : .5)) * priority(p);
        residual[p] = total;
      }
      if (total < .00001) break;
      let best: { stroke: ExpressiveStroke; indices: number[]; alphas: number[]; gain: number } | undefined;
      for (let trial = 0; trial < 10; trial++) {
        const pick = random() * total;
        let lo = 0, hi = residual.length - 1;
        while (lo < hi) { const mid = (lo + hi) >>> 1; if (residual[mid] < pick) lo = mid + 1; else hi = mid; }
        const x = lo % w, y = Math.floor(lo / w), center = index(x, y);
        const width = widths[pass] * (edges[center] > .15 ? .65 : 1) * (.85 + random() * .3);
        const color = [target[center * 3], target[center * 3 + 1], target[center * 3 + 2]] as [number, number, number];
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
            if (nx < 0 || ny < 0 || nx >= w - 1 || ny >= h - 1) break;
            const next = index(nx, ny);
            const diff = color.reduce((s, v, c) => s + (v - target[next * 3 + c]) ** 2, 0);
            if (diff > .035 + amount * .055) break;
            points.push({ x: nx, y: ny }); px = nx; py = ny;
          }
          return points;
        };
        const points = [...trace(-1).reverse(), { x, y }, ...trace(1)];
        if (points.length < 2) points.push({ x: clamp(x + .5, 0, w - .001), y: clamp(y + .5, 0, h - .001) });
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
            const before = target[p * 3 + c] - canvas[p * 3 + c];
            const after = target[p * 3 + c] - (canvas[p * 3 + c] * (1 - alpha) + color[c] * alpha);
            gain += (before * before - after * after) * priority(p);
          }
          indices.push(p); alphas.push(alpha);
        }
        if (!best || gain > best.gain) best = { stroke: { points, radii, color, opacity }, indices, alphas, gain };
      }
      if (best && best.gain > .000001) {
        best.indices.forEach((p, j) => {
          for (let c = 0; c < 3; c++) canvas[p * 3 + c] = canvas[p * 3 + c] * (1 - best!.alphas[j]) + best!.stroke.color[c] * best!.alphas[j];
        });
        const stroke = { ...best.stroke, points: best.stroke.points.map(p => ({ x: p.x * sx, y: p.y * sy })), radii: best.stroke.radii.map(r => r * Math.min(sx, sy)) };
        strokes.push(stroke); batch.push(stroke);
      }
      if (batch.length >= 8) options.onBatch?.(batch.splice(0));
      if (cursor % 12 === 0) { options.onProgress?.({ completed: cursor, total: budget }); await new Promise(resolve => setTimeout(resolve, 0)); }
    }
  }
  if (batch.length) options.onBatch?.(batch);
  options.onProgress?.({ completed: 1, total: 1 });
  return strokes;
}

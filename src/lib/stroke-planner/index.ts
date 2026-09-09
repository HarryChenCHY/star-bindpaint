import type { PlannedStroke, StrokePlan } from '../study/protocol';

export interface Raster { width: number; height: number; data: Uint8ClampedArray }
const VERSION = 'regions-budget-1';
const distance = (a: number[], b: number[]) => a.reduce((v, c, i) => v + (c - b[i]) ** 2, 0);

/** Complete region plans are regenerated at coarser resolution when over budget; never truncated. */
export function planSimplifiedImage(src: Raster, budget = 180): { plan: StrokePlan; simplified: Raster } {
  if (!Number.isInteger(budget) || budget < 40 || budget > 200) throw new Error('笔触预算必须为 40—200');
  if (src.width < 1 || src.height < 1 || src.data.length !== src.width * src.height * 4) throw new Error('图像数据无效');
  for (const grid of [40, 32, 26, 22, 18, 14]) {
    const w = Math.max(4, Math.round(grid * src.width / Math.max(src.width, src.height)));
    const h = Math.max(4, Math.round(grid * src.height / Math.max(src.width, src.height)));
    const colors: number[][] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = [0, 0, 0]; let n = 0;
      const x0 = Math.floor(x * src.width / w), x1 = Math.max(x0 + 1, Math.floor((x + 1) * src.width / w));
      const y0 = Math.floor(y * src.height / h), y1 = Math.max(y0 + 1, Math.floor((y + 1) * src.height / h));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (yy * src.width + xx) * 4, a = src.data[i + 3] / 255;
        for (let j = 0; j < 3; j++) c[j] += src.data[i + j] * a + 255 * (1 - a);
        n++;
      }
      colors.push(c.map(v => Math.round(v / n)));
    }
    // Deterministic farthest-point palette seeding followed by Lloyd iterations.
    const palette: number[][] = [[255, 255, 255]];
    for (let k = 1; k < 8; k++) {
      let best = -1, pick = colors[0];
      for (const c of colors) { const d = Math.min(...palette.map(p => distance(c, p))); if (d > best) { best = d; pick = c; } }
      palette.push([...pick]);
    }
    let labels = new Int32Array(w * h);
    for (let iter = 0; iter < 6; iter++) {
      const sums = palette.map(() => [0, 0, 0, 0]);
      labels = Int32Array.from(colors.map(c => {
        let k = 0; palette.forEach((p, i) => { if (distance(c, p) < distance(c, palette[k])) k = i; });
        c.forEach((v, j) => sums[k][j] += v); sums[k][3]++; return k;
      }));
      sums.forEach((s, k) => { if (s[3]) palette[k] = s.slice(0, 3).map(v => Math.round(v / s[3])); });
    }
    // Remove isolated texture before extracting connected regions.
    for (let pass = 0; pass < 2; pass++) {
      const next = labels.slice();
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x, near = [labels[i - 1], labels[i + 1], labels[i - w], labels[i + w]];
        for (const k of near) if (near.filter(n => n === k).length >= 3) next[i] = k;
      }
      labels = next;
    }
    const regionAt = new Int32Array(w * h).fill(-1);
    const regions: { cells: number[]; color: number; id: number }[] = [];
    for (let i = 0; i < labels.length; i++) {
      if (regionAt[i] !== -1) continue;
      const region = { id: regions.length, color: labels[i], cells: [i] }; regionAt[i] = region.id;
      for (let q = 0; q < region.cells.length; q++) {
        const a = region.cells[q];
        for (const b of [a % w ? a - 1 : -1, a % w < w - 1 ? a + 1 : -1, a - w, a + w]) {
          if (b >= 0 && b < labels.length && regionAt[b] === -1 && labels[b] === region.color) { regionAt[b] = region.id; region.cells.push(b); }
        }
      }
      regions.push(region);
    }
    const scaleX = src.width / w, scaleY = src.height / h;
    const strokes: PlannedStroke[] = [];
    const colorHex = (k: number) => '#' + palette[k].map(v => v.toString(16).padStart(2, '0')).join('');
    const add = (phase: PlannedStroke['phase'], regionId: number, color: string, width: number, points: PlannedStroke['points']) => {
      // Bound independent actions to 65% of the diagonal, splitting before the final budget check.
      let chain = [points[0]], length = 0;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], d = Math.hypot(b.x - a.x, b.y - a.y);
        const pieces = Math.max(1, Math.ceil(d / (Math.hypot(src.width, src.height) * .65)));
        for (let p = 1; p <= pieces; p++) {
          const point = { x: a.x + (b.x - a.x) * p / pieces, y: a.y + (b.y - a.y) * p / pieces };
          if (length + d / pieces > Math.hypot(src.width, src.height) * .65 && chain.length > 1) { strokes.push({ id: '', phase, regionId, color, width, points: chain }); chain = [chain[chain.length - 1]]; length = 0; }
          chain.push(point); length += d / pieces;
        }
      }
      if (chain.length > 1) strokes.push({ id: '', phase, regionId, color, width, points: chain });
    };
    const ordered = [...regions].sort((a, b) => b.cells.length - a.cells.length || a.id - b.id);
    for (const r of ordered) {
      if (palette[r.color].every(v => v > 244)) continue;
      // Row coverage covers every retained region, instead of residual sampling of a prefix.
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (regionAt[y * w + x] !== r.id) continue;
        const start = x; while (x + 1 < w && regionAt[y * w + x + 1] === r.id) x++;
        add(r.cells.length >= w * h * .03 ? 'large_color' : 'small_color', r.id, colorHex(r.color), scaleY * 1.03,
          [{ x: (start + .5) * scaleX, y: (y + .5) * scaleY }, { x: (x + .5) * scaleX + .01, y: (y + .5) * scaleY }]);
      }
      // Trace the complete outer boundary of substantial regions; merge collinear edges.
      if (r.cells.length < w * h * .025) continue;
      const edges = new Map<string, [number, number]>();
      for (const i of r.cells) {
        const x = i % w, y = Math.floor(i / w);
        if (y === 0 || regionAt[i - w] !== r.id) edges.set(`${x},${y}`, [x + 1, y]);
        if (x === w - 1 || regionAt[i + 1] !== r.id) edges.set(`${x + 1},${y}`, [x + 1, y + 1]);
        if (y === h - 1 || regionAt[i + w] !== r.id) edges.set(`${x + 1},${y + 1}`, [x, y + 1]);
        if (x === 0 || regionAt[i - 1] !== r.id) edges.set(`${x},${y + 1}`, [x, y]);
      }
      while (edges.size) {
        const first = edges.keys().next().value!; let key = first;
        const pts = [first.split(',').map(Number)];
        while (edges.has(key)) { const p = edges.get(key)!; edges.delete(key); pts.push(p); key = p.join(','); }
        const simple = pts.filter((p, i) => i === 0 || i === pts.length - 1 || (p[0] - pts[i - 1][0]) * (pts[i + 1][1] - p[1]) !== (p[1] - pts[i - 1][1]) * (pts[i + 1][0] - p[0]));
        // At most six turns per action.
        for (let i = 0; i < simple.length - 1; i += 6) add('outline', r.id, '#273648', Math.max(1, Math.min(src.width, src.height) / 220), simple.slice(i, i + 7).map(p => ({ x: p[0] * scaleX, y: p[1] * scaleY })));
      }
    }
    if (strokes.length > budget || !strokes.length) continue;
    const phases = ['outline', 'large_color', 'small_color'];
    strokes.sort((a, b) => phases.indexOf(a.phase) - phases.indexOf(b.phase));
    strokes.forEach((s, i) => s.id = `s${i + 1}`);
    const data = new Uint8ClampedArray(src.width * src.height * 4);
    for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
      const color = palette[labels[Math.min(h - 1, Math.floor(y / scaleY)) * w + Math.min(w - 1, Math.floor(x / scaleX))]];
      data.set([...color, 255], (y * src.width + x) * 4);
    }
    return { plan: { version: VERSION, width: src.width, height: src.height, strokes, quality: { coverage: 1, regions: regions.length, simplified: true, notes: ['coverage 为保留区域计划覆盖率，不是作品完成度。', `区域网格 ${w} × ${h}；请审核细小结构。`] } }, simplified: { width: src.width, height: src.height, data } };
  }
  throw new Error('这张图的区域过于复杂，当前预算无法生成完整计划。请裁剪主体或换一张背景更简单的图片。');
}

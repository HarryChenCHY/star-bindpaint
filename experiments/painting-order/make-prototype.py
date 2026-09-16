"""Isolated fork of the production fitter; never writes src/."""
from pathlib import Path

source = Path('experiments/painting-order/baseline-planner.ts').read_text()
source = source.replace("'./stroke-engine'", "'../../src/lib/stroke-engine'").replace("'./stroke-config'", "'../../src/lib/stroke-config'")
source = source.replace('export async function planBudgetStrokes(', 'export async function planOrderedStrokes(')
source = source.replace('): Promise<StrokeDrawData[]> {', ') {\n  void roughness; // Fixed brush-width layers replace random roughness sampling in this prototype.')
source = source.replace('  onProgress?: (progress: PlanningProgress) => void,', "  onProgress?: (progress: PlanningProgress) => void,\n  order: 'raster' | 'regions' = 'raster',")
start = source.index('  const cumulative = new Float64Array(w * h);')
end = source.index('    if (n % 20 === 0)', start)
source = source[:start] + '''  type Task = { width: number; count: number; grid: number; region?: number; label: string };
  // 手工区域仅用于《日出·印象》概念验证，不是自动分割。
  const regionAt = (x: number, y: number) => {
    x /= w; y /= h;
    if (Math.hypot((x - .607) / .037, (y - .286) / .045) < 1 || (x > .56 && x < .65 && y > .48 && y < .85)) return 4;
    if ((x > .38 && x < .57 && y > .65 && y < .83) || (x > .2 && x < .37 && y > .52 && y < .65)) return 3;
    if (y < .39) return 0;
    if (y < .53) return 1;
    return 2;
  };
  const tasks: Task[] = [
    { width: 30, count: 60, grid: 3, label: '第1遍 · 大色块' },
    { width: 16, count: 120, grid: 4, label: '第2遍 · 中色块' },
  ];
  if (order === 'raster') tasks.push(
    { width: 8, count: 220, grid: 5, label: '第3遍 · 形体' },
    { width: 4, count: 280, grid: 6, label: '第4遍 · 小笔触' },
    { width: 2.2, count: 320, grid: 6, label: '第5遍 · 细节' },
  );
  else {
    const names = ['天空远景', '港口雾带', '水面', '两处船只区域', '太阳与倒影'];
    [100, 150, 290, 160, 120].forEach((count, region) => {
      [8, 4, 2.2].forEach((width, layer) => tasks.push({
        width, count: layer === 2 ? count - Math.floor(count * .25) - Math.floor(count * .3) : Math.floor(count * (layer === 0 ? .25 : .3)),
        grid: 1, region, label: `${names[region]} · ${['塑形', '修整', '细化'][layer]}`,
      }));
    });
  }
  const cumulative = new Float64Array(w * h);
  const centers: { x: number; y: number; width: number; label: string; cell: number }[] = [];
  let n = 0;
  for (const task of tasks) {
    // 每遍从左上至右下按网格访问；残差高的网格分配更多笔数。
    const masses = new Array(task.grid * task.grid).fill(0);
    for (let i = 0; i < w * h; i++) {
      const x = i % w, y = Math.floor(i / w);
      if (task.region !== undefined && regionAt(x, y) !== task.region) continue;
      let error = 0;
      for (let c = 0; c < 3; c++) error += (target[i * 3 + c] - canvas[i * 3 + c]) ** 2;
      const cell = Math.min(task.grid - 1, Math.floor(y / h * task.grid)) * task.grid + Math.min(task.grid - 1, Math.floor(x / w * task.grid));
      masses[cell] += (error + .00001) * weights[i];
    }
    const mass = masses.reduce((a, b) => a + b, 0) || 1;
    const raw = masses.map(v => v / mass * task.count);
    const quotas = raw.map(Math.floor);
    const remainder = task.count - quotas.reduce((a, b) => a + b, 0);
    raw.map((v, i) => ({ i, fraction: v - quotas[i] })).sort((a, b) => b.fraction - a.fraction).slice(0, remainder).forEach(({ i }) => quotas[i]++);
    for (let cell = 0; cell < quotas.length; cell++) for (let slot = 0; slot < quotas[cell]; slot++, n++) {
    const inRegion = (x: number, y: number) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return false;
      if (task.region !== undefined && regionAt(x, y) !== task.region) return false;
      return Math.min(task.grid - 1, Math.floor(y / h * task.grid)) * task.grid + Math.min(task.grid - 1, Math.floor(x / w * task.grid)) === cell;
    };
''' + source[end:]
source = source.replace('      total += error * weights[i];', '      total += inRegion(i % w, Math.floor(i / w)) ? error * weights[i] : 0;')
source = source.replace('    if (total < 1e-6) break;', '    if (total < 1e-6) continue;')
start = source.index('    const maxWidth = Math.max(')
end = source.index('    for (let trial = 0; trial < 64;', start)
source = source[:start] + source[end:]
start = source.index('      const width = Math.max(', source.index('const inRegion'))
end = source.index('      const p: Candidate', start)
source = source[:start] + '      const width = task.width * Math.min(w, h) / 200;\n' + source[end:]
start = source.index('        width: Math.max(', source.index('// Local parameter'))
end = source.index('        length: Math.max(', start)
source = source[:start] + '        width: p.width,\n' + source[end:]
source = source.replace('      const result = fit(candidate);', '      if (!inRegion(candidate.x, candidate.y)) continue;\n      const result = fit(candidate);')
source = source.replace('    strokes.push({', '    centers.push({ x: bestCandidate!.x / w, y: bestCandidate!.y / h, width: best.stroke.width, label: task.label, cell });\n    strokes.push({')
source = source.replace('  onProgress?.({ completed: budget,', '  }\n  onProgress?.({ completed: budget,')
source = source.replace('  return strokes;\n}', '  return { strokes, centers };\n}')
Path('experiments/painting-order/ordered-planner.ts').write_text('// GENERATED isolated experiment; make-prototype.py documents all changes.\n' + source)

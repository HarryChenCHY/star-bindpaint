/** Shared by browser workers, study protocol and server validation. */
export const STROKE_CONFIG = {
  version: 'layered-raster-3-five-pass',
  defaultRoughness: 1,
  defaultBudget: 1000,
  maxBudget: 1000,
  analysisSize: 256,
  comparisonSize: 128,
  experienceOpacity: 0.85,
  studyOpacity: 1,
} as const;
export const STROKE_PASSES = [
  { width: 30, share: 60, grid: 3, label: '第1遍 · 大色块', hint: '从左上向右下铺大色块，先建立整幅画的底色。' },
  { width: 16, share: 120, grid: 4, label: '第2遍 · 中色块', hint: '再扫描一遍，用中等笔触丰富整体色彩。' },
  { width: 8, share: 220, grid: 5, label: '第3遍 · 形体', hint: '沿着各区域的星迹，逐步明确画面的形体。' },
  { width: 4, share: 280, grid: 6, label: '第4遍 · 小笔触', hint: '用更小的笔触修整边缘和颜色过渡。' },
  { width: 2.2, share: 320, grid: 6, label: '第5遍 · 细节', hint: '最后一遍补充细节，按照自己的节奏完成。' },
] as const;

/** Largest remainders keep every integer budget exact, without truncating a plan. */
export function allocatePassBudgets(budget: number): number[] {
  const raw = STROKE_PASSES.map(pass => budget * pass.share / 1000);
  const counts = raw.map(Math.floor);
  raw.map((value, index) => ({ index, remainder: value - counts[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .slice(0, budget - counts.reduce((a, b) => a + b, 0))
    .forEach(({ index }) => counts[index]++);
  return counts;
}

export interface PlanningProgress { completed: number; total: number; strokes: number; passIndex?: number }

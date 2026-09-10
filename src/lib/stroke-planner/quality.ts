import type { Phase, StrokePlan } from '../study/protocol';

export function inspectPlan(plan: StrokePlan) {
  const issues: string[] = [];
  const counts: Record<Phase, number> = {
    outline: 0,
    large_color: 0,
    small_color: 0,
  };
  const phases: Phase[] = ['outline', 'large_color', 'small_color'];
  if (
    !Number.isInteger(plan.width) ||
    !Number.isInteger(plan.height) ||
    plan.width < 4 ||
    plan.height < 4
  )
    issues.push('画布尺寸无效');
  if (!plan.strokes.length || plan.strokes.length > 200)
    issues.push('最终笔数不在 1—200 范围');
  if (new Set(plan.strokes.map((s) => s.id)).size !== plan.strokes.length)
    issues.push('笔触编号重复');
  let phase = 0,
    maxLengthRatio = 0,
    maxPoints = 0,
    shortActions = 0;
  for (const s of plan.strokes) {
    const rank = phases.indexOf(s.phase);
    if (rank < phase || rank < 0) issues.push(`${s.id}：阶段顺序错误`);
    phase = rank;
    if (rank >= 0) counts[s.phase]++;
    if (!Number.isFinite(s.width) || s.width < 1 || s.width > 128)
      issues.push(`${s.id}：宽度无效`);
    if (!/^#[0-9a-f]{6}$/i.test(s.color)) issues.push(`${s.id}：颜色无效`);
    if (s.points.length < 2 || s.points.length > 8)
      issues.push(`${s.id}：单笔路径复杂度超限`);
    if (
      s.points.some(
        (p) =>
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          p.x < 0 ||
          p.y < 0 ||
          p.x > plan.width ||
          p.y > plan.height,
      )
    )
      issues.push(`${s.id}：坐标越界`);
    const length = s.points
      .slice(1)
      .reduce(
        (sum, p, i) =>
          sum + Math.hypot(p.x - s.points[i].x, p.y - s.points[i].y),
        0,
      );
    const ratio = length / Math.hypot(plan.width, plan.height);
    maxLengthRatio = Math.max(maxLengthRatio, ratio);
    maxPoints = Math.max(maxPoints, s.points.length);
    if (ratio > 0.66) issues.push(`${s.id}：单笔过长`);
    if (ratio <= 0.005) shortActions++;
  }
  return {
    passed: !issues.length,
    issues: [...new Set(issues)],
    counts,
    total: plan.strokes.length,
    maxLengthRatio,
    maxPoints,
    shortActions,
    warnings: shortActions
      ? [`${shortActions} 笔接近点状动作；需核对指导推进及“有效绘画”阈值。`]
      : [],
    humanReview: 'pending' as const,
  };
}

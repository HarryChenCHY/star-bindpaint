import { metrics } from './metrics';
import { PROTOCOL } from './protocol';
import type { Participant, Session, StudyConfig } from './types';

const summary = (values: Array<number | null>) => {
  const xs = values.filter((v): v is number => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  const middle = Math.floor(xs.length / 2);
  return { n: xs.length, median: xs.length ? xs.length % 2 ? xs[middle] : (xs[middle - 1] + xs[middle]) / 2 : null };
};
/** Operational pilot review, not an efficacy test. Missing data stays null. */
export function pilotWorkload(c: StudyConfig, people: Participant[], sessions: Session[]) {
  const ids = new Set(c.plan?.strokes.map(s => s.id) ?? []);
  function measure(s: Session | undefined, withdrawn: boolean) {
    if (!s) return null;
    const m = metrics(s, c.essentialItems);
    const eligible = !withdrawn && !!s.finalizedAt && ['submitted', 'timeout'].includes(s.state) && s.inclusion !== 'exclude';
    const unique = (type: string, matched = false) => new Set(s.events.filter(e => e.type === type && (!matched || e.payload.matched === true)).map(e => e.payload.planStrokeId).filter((id): id is string => typeof id === 'string' && ids.has(id)));
    const advanced = unique('guide_advanced'), skipped = unique('guide_skipped');
    const visited = new Set([...advanced, ...skipped]);
    const unknownGuideEvents = s.events.filter(e => ['guide_evaluated', 'guide_advanced', 'guide_skipped'].includes(e.type) && !ids.has(String(e.payload.planStrokeId))).length;
    const hasEnd = m.elapsedMs !== null && Number.isFinite(m.elapsedMs);
    return { sessionId: s.id, state: s.state, eligible, hasEnd, inclusion: s.inclusion,
      reason: withdrawn ? '已撤回' : s.inclusion === 'exclude' ? '已排除' : !s.finalizedAt ? '尚未持久结束' : !['submitted', 'timeout'].includes(s.state) ? '技术故障或中止' : !hasEnd ? '缺少结束事件' : '',
      elapsedMs: m.elapsedMs, validStrokes: m.validStrokes, attempts: m.attempts,
      idleCount: m.idleCount, idleMs: m.idleMs, breakMs: m.breakMs, hiddenMs: m.hiddenMs, undoCount: m.undoCount,
      completion: m.completion, qualifiedTimeMs: m.qualifiedTimeMs,
      guidance: s.condition === 'guided' && ids.size ? { visited: visited.size, matched: unique('guide_evaluated', true).size, skipped: skipped.size, total: ids.size,
        ratio: unknownGuideEvents ? null : visited.size / ids.size, unknownGuideEvents } : null };
  }
  const rows = people.filter(p => p.studyId === c.id).map(p => {
    const tasks = sessions.filter(s => s.studyId === c.id && s.pairId === p.pairId);
    const latest = (condition: string) => tasks.filter(s => s.condition === condition).sort((a, b) => b.attempt - a.attempt)[0];
    return { id: p.researchCode ?? p.id, order: p.order, control: measure(latest('control'), !!p.withdrawnAt), guided: measure(latest('guided'), !!p.withdrawnAt) };
  });
  const groups = (['control', 'guided'] as const).map(condition => {
    const tasks = rows.map(r => r[condition]).filter((s): s is NonNullable<typeof s> => s !== null && s.eligible && s.hasEnd);
    return { condition, n: tasks.length, timeouts: tasks.filter(s => s.state === 'timeout').length,
      elapsedMs: summary(tasks.map(s => s.elapsedMs)), validStrokes: summary(tasks.map(s => s.validStrokes)),
      idleCount: summary(tasks.map(s => s.idleCount)), completion: summary(tasks.map(s => s.completion)),
      qualifiedTimeMs: summary(tasks.map(s => s.qualifiedTimeMs)),
      guidanceRatio: summary(tasks.map(s => s.guidance?.ratio ?? null)) };
  });
  const paired = rows.filter(r => r.control?.eligible && r.guided?.eligible && r.control.hasEnd && r.guided.hasEnd);
  return { version: 'pilot-workload-1', planVersion: c.plan?.version ?? null, planHash: c.planHash,
    plannedStrokes: ids.size, timeLimitMs: PROTOCOL.timeLimitMs, rows, groups,
    pairedElapsedDifferenceMs: summary(paired.map(r => r.guided!.elapsedMs! - r.control!.elapsedMs!)),
    orderCounts: { AB: paired.filter(r => r.order === 'AB').length, BA: paired.filter(r => r.order === 'BA').length },
    notes: ['仅汇总每个条件的最新尝试；未结束、技术故障、撤回、排除或缺少结束事件的记录不进入组汇总。',
      '用时是任务持续时间，不是达标速度；指导推进包含跳过，不等于真实绘画完成度。',
      '中位数旁的 n 是该指标有效人数；零与缺失分开，未齐双人评分的完成度为空。',
      '预试样本只用于检查任务负担，不据此自动判断算法有效或自动修改实验时限。'] };
}

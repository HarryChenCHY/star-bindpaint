import { randomUUID } from 'node:crypto';
import type { Participant, Session } from '../types';
import { config } from './service';
import type { StudyRepository } from './repository';
import { pilotWorkload } from '../pilot-workload';
import { STUDY_IDS } from '../protocol';

export const PILOT_CHECKS = ['device', 'workload', 'rating', 'storage'] as const;
export interface PilotReview { id: string; revision: number; planHash: string; checks: Record<string, boolean>; note: string; updatedAt: string }
export interface PilotIssue { id: string; studyId: string; planHash: string; title: string; severity: 'blocking' | 'general'; status: 'open' | 'resolved'; resolution: string; revision: number; createdAt: string; updatedAt: string }
export function pilotSnapshot(repo: StudyRepository) {
  const c = config(repo, STUDY_IDS.pilot);
  const people = repo.all<Participant>('participant').filter(p => p.studyId === c.id);
  const all = repo.all<Session>('session');
  const participants = people.map(p => {
    const tasks = all.filter(s => s.pairId === p.pairId);
    const latest = (condition: string) => tasks.filter(s => s.condition === condition).sort((a, b) => b.attempt - a.attempt)[0];
    const a = latest('control'), b = latest('guided');
    const finished = (s?: Session) => !!s?.finalizedAt && !!s.post && ['submitted', 'timeout'].includes(s.state);
    const rated = (s?: Session) => !!s && ['rater1', 'rater2'].every(r => s.ratings.some(v => v.rater === r));
    return { id: p.researchCode ?? p.id, withdrawn: !!p.withdrawnAt, practice: !!p.practiceAt,
      control: finished(a), guided: finished(b), interview: !!p.interview,
      rated: rated(a) && rated(b), complete: !p.withdrawnAt && !!p.practiceAt && finished(a) && finished(b) && !!p.interview };
  });
  const issues = repo.all<PilotIssue>('pilot_issue').filter(i => i.studyId === c.id);
  const review = repo.get<PilotReview>('pilot_review', c.id);
  const reviewCurrent = !!review && !!c.planHash && review.planHash === c.planHash;
  const complete = participants.filter(p => p.complete).length;
  const rated = participants.filter(p => p.complete && p.rated).length;
  const blocking = issues.filter(i => i.status === 'open' && i.severity === 'blocking').length;
  const checksPassed = reviewCurrent && PILOT_CHECKS.every(k => review.checks[k] === true);
  return { planHash: c.planHash, participants, complete, rated, target: 6, issues, review, reviewCurrent, blocking,
    exports: repo.all<{ id: string; studyId: string; createdAt: string; sha256: string }>('pilot_export').filter(e => e.studyId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10).map(({ id, createdAt, sha256 }) => ({ id, createdAt, sha256 })),
    workload: pilotWorkload(c, people, all),
    ready: complete >= 6 && rated >= 6 && blocking === 0 && checksPassed && c.materialReviewed };
}
export function savePilotReview(repo: StudyRepository, body: Record<string, unknown>) {
  return repo.transaction(() => {
    const c = config(repo, STUDY_IDS.pilot);
    const prior = repo.get<PilotReview>('pilot_review', c.id);
    if (!c.planHash || body.planHash !== c.planHash) throw new Error('材料已变化，请刷新后重新复核');
    if (body.revision !== (prior?.revision ?? 0)) throw new Error('复核记录已更新，请刷新后重试');
    const checks = body.checks as Record<string, unknown>;
    if (!checks || !PILOT_CHECKS.every(k => typeof checks[k] === 'boolean')) throw new Error('复核项目无效');
    if (typeof body.note !== 'string' || body.note.trim().length < 2 || body.note.length > 2000) throw new Error('请填写实际复核说明（2—2000 字）');
    const value: PilotReview = { id: c.id, revision: (prior?.revision ?? 0) + 1, planHash: c.planHash,
      checks: Object.fromEntries(PILOT_CHECKS.map(k => [k, checks[k] === true])), note: body.note.trim(), updatedAt: new Date().toISOString() };
    repo.put('pilot_review', c.id, value); repo.audit('pilot_review', c.id, { prior, value });
    return value;
  });
}
export function savePilotIssue(repo: StudyRepository, body: Record<string, unknown>) {
  return repo.transaction(() => {
    const c = config(repo, STUDY_IDS.pilot);
    const prior = body.id ? repo.get<PilotIssue>('pilot_issue', String(body.id)) : null;
    if (body.id && !prior) throw new Error('问题不存在');
    if (body.revision !== (prior?.revision ?? 0)) throw new Error('问题已更新，请刷新后重试');
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 500 || !['blocking', 'general'].includes(String(body.severity)) || !['open', 'resolved'].includes(String(body.status))) throw new Error('问题内容或状态无效');
    if (typeof body.resolution !== 'string' || body.resolution.length > 2000 || (body.status === 'resolved' && body.resolution.trim().length < 2)) throw new Error('解决问题时必须填写修复与复验说明');
    const now = new Date().toISOString();
    const value: PilotIssue = { id: prior?.id ?? randomUUID(), studyId: c.id, planHash: prior?.planHash ?? c.planHash,
      title: body.title.trim(), severity: body.severity as PilotIssue['severity'], status: body.status as PilotIssue['status'],
      resolution: body.resolution.trim(), revision: (prior?.revision ?? 0) + 1, createdAt: prior?.createdAt ?? now, updatedAt: now };
    repo.put('pilot_issue', value.id, value); repo.audit('pilot_issue', c.id, { prior, value });
    return value;
  });
}

import { randomInt, randomBytes, randomUUID } from 'node:crypto';
import {
  PROTOCOL,
  RUBRIC,
  STUDY_IDS,
  assertAnswers,
  conditionAt,
  type StudyEvent,
} from '../protocol';
import type { Participant, Session, StudyConfig } from '../types';
import { hash, StudyRepository } from './repository';
import { exactSign, holm, metrics, questionnaireScores } from '../metrics';

export const freshConfig = (
  stage: 'pilot' | 'formal',
  id: string = stage === 'pilot' ? STUDY_IDS.pilot : STUDY_IDS.formal,
): StudyConfig => ({
  id,
  stage,
  published: false,
  materialReviewed: false,
  protocolVersion: id.endsWith('-v1') ? 'novice-paired-1.0' : PROTOCOL.version,
  material: null,
  plan: null,
  materialHash: '',
  planHash: '',
  rubric: [...RUBRIC],
  essentialItems: [0, 3],
  checks: {},
  governance: {
    researcherContact: '',
    compensation: '',
    ethicsStatement: '',
  },
  createdAt: new Date().toISOString(),
});
export function config(repo: StudyRepository, id: string = STUDY_IDS.pilot) {
  const c = repo.get<StudyConfig>('config', id);
  if (c)
    return {
      ...c,
      governance: c.governance ?? {
        researcherContact: '',
        compensation: '',
        ethicsStatement: '',
      },
    };
  if (!Object.values(STUDY_IDS).includes(id as (typeof STUDY_IDS)[keyof typeof STUDY_IDS]))
    throw new Error('研究不存在');
  const created = freshConfig(id.includes('formal') ? 'formal' : 'pilot', id);
  repo.put('config', id, created);
  return created;
}
export function enroll(
  repo: StudyRepository,
  studyId: string,
  code?: string,
  details?: {
    profile?: Participant['profile'];
    consent?: Participant['consent'];
  },
) {
  return repo.transaction(() => {
    const researchCode = code?.normalize('NFKC').trim();
    if (code !== undefined && (!researchCode || !/^[\p{L}\p{N}_-]{1,64}$/u.test(researchCode)))
      throw new Error('研究码请使用 1–64 个文字、数字、下划线或短横线');
    const codeKey = researchCode ? hash(researchCode.toLowerCase()) : null;
    if (codeKey && (repo.get('research_code', codeKey) || repo.all<Participant>('participant').some(p => (p.researchCode ?? p.id).normalize('NFKC').toLowerCase() === researchCode?.toLowerCase())))
      throw new Error('研究码已存在，请换一个新的研究码');
    const c = config(repo, studyId);
    if (!c.published || !c.plan || !c.material)
      throw new Error('研究尚未开放，请联系研究者');
    const people = repo
      .all<Participant>('participant')
      .filter((p) => p.studyId === studyId);
    if (people.length >= (c.stage === 'pilot' ? 6 : PROTOCOL.maxParticipants))
      throw new Error('本研究已达到入组上限');
    if (
      c.stage === 'formal' &&
      report(repo, studyId).pairs.filter(
        (p) =>
          p.control?.inclusion === 'include' &&
          p.guided?.inclusion === 'include',
      ).length >= PROTOCOL.targetPairs
    )
      throw new Error('已达到预设配对目标');
    const blockId = `${studyId}-${Math.floor(people.length / 4)}`;
    let block = repo.get<('AB' | 'BA')[]>('block', blockId);
    if (!block) {
      block = ['AB', 'AB', 'BA', 'BA'];
      for (let i = 3; i > 0; i--) {
        const j = randomInt(i + 1);
        [block[i], block[j]] = [block[j], block[i]];
      }
      repo.put('block', blockId, block);
    }
    const token = randomBytes(32).toString('hex');
    const p: Participant = {
      ...(researchCode ? { researchCode } : {}),
      id: `${c.stage === 'pilot' ? 'T' : 'P'}${String(people.length + 1).padStart(3, '0')}`,
      pairId: randomUUID(),
      studyId,
      order: block[people.length % 4],
      tokenHash: hash(token),
      createdAt: new Date().toISOString(),
      consentVersion: PROTOCOL.consentVersion,
      ...(details?.consent ? { consent: details.consent } : {}),
      ...(details?.profile ? { profile: details.profile } : {}),
      researchLogConsent: true,
      researchArtworkConsent: true,
      eligible: true,
      practiceAt: null,
      interview: null,
      withdrawnAt: null,
    };
    repo.put('participant', p.pairId, p);
    if (codeKey) repo.put('research_code', codeKey, { pairId: p.pairId });
    repo.audit('enrolled', p.pairId, {
      studyId,
      consentVersion: PROTOCOL.consentVersion,
    });
    return { participant: p, token };
  });
}
export function sessions(repo: StudyRepository, p: Participant) {
  return repo
    .all<Session>('session')
    .filter((s) => s.pairId === p.pairId)
    .sort((a, b) => a.period - b.period || a.attempt - b.attempt);
}
export function createSession(
  repo: StudyRepository,
  p: Participant,
  period: number,
) {
  return repo.transaction(() => {
    if (!p.practiceAt || p.withdrawnAt || ![1, 2].includes(period))
      throw new Error('请先完成操作练习');
    const all = sessions(repo, p),
      existing = all.filter((s) => s.period === period).at(-1);
    if (existing) return existing;
    const prev = all.filter((s) => s.period === 1).at(-1);
    if (
      period === 2 &&
      (!prev?.finalizedAt ||
        !prev.post ||
        !['submitted', 'timeout'].includes(prev.state) ||
        Date.now() - Date.parse(prev.finalizedAt) < PROTOCOL.restMs)
    )
      throw new Error('请先保存首轮及后测，并完成轮间休息');
    const s: Session = {
      id: randomUUID(),
      participantId: p.id,
      pairId: p.pairId,
      studyId: p.studyId,
      period,
      condition: conditionAt(p.order, period),
      attempt: 1,
      supersedes: null,
      state: 'created',
      pageId: null,
      startedAt: null,
      endedAt: null,
      finalizedAt: null,
      pre: null,
      post: null,
      events: [],
      artifact: null,
      artifactHash: null,
      rawHash: null,
      ratings: [],
      quality: [],
      inclusion: 'pending',
      inclusionReason: '',
    };
    repo.put('session', s.id, s);
    return s;
  });
}
const eventTypes = new Set([
  'task_started',
  'task_ended',
  'stroke_started',
  'stroke_ended',
  'stroke_cancelled',
  'guide_evaluated',
  'guide_advanced',
  'guide_skipped',
  'guide_revisited',
  'tool_changed',
  'parameter_changed',
  'layer_changed',
  'undo',
  'redo',
  'canvas_clear',
  'hidden_started',
  'hidden_ended',
  'break_started',
  'break_ended',
  'system_block_started',
  'system_block_ended',
  'capability_violation',
]);
const allowedKeys = new Set([
  'strokeId',
  'startedMs',
  'lengthRatio',
  'valid',
  'tool',
  'layer',
  'reason',
  'planStrokeId',
  'matched',
  'phase',
  'source',
  'observedAfterDeadlineMs',
]);
export function appendEvents(s: Session, input: unknown) {
  if (
    !Array.isArray(input) ||
    input.length > 500 ||
    s.events.length + input.length > 50000
  )
    throw new Error('事件批量大小无效');
  if (!s.startedAt) throw new Error('任务尚未开始');
  for (const raw of input) {
    const e = raw as StudyEvent;
    if (
      !e ||
      !Number.isInteger(e.seq) ||
      e.seq < 1 ||
      !eventTypes.has(e.type) ||
      typeof e.offsetMs !== 'number' ||
      !Number.isFinite(e.offsetMs) ||
      e.offsetMs < 0 ||
      e.offsetMs > PROTOCOL.timeLimitMs ||
      typeof e.clientAt !== 'string' ||
      !Number.isFinite(Date.parse(e.clientAt)) ||
      !e.payload ||
      typeof e.payload !== 'object' ||
      Array.isArray(e.payload)
    )
      throw new Error('事件格式无效');
    if (
      Object.entries(e.payload).some(
        ([k, v]) =>
          !allowedKeys.has(k) ||
          (!['string', 'number', 'boolean'].includes(typeof v) && v !== null) ||
          (typeof v === 'string' && v.length > 120) ||
          (typeof v === 'number' && !Number.isFinite(v)),
      )
    )
      throw new Error('事件包含不允许的字段');
    const previous = s.events[e.seq - 1];
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(e))
        throw new Error('事件序号内容冲突');
      continue;
    }
    if (e.seq !== s.events.length + 1)
      throw new Error(`事件缺口：需要序号 ${s.events.length + 1}`);
    if (s.finalizedAt || s.events.at(-1)?.type === 'task_ended')
      throw new Error('任务已终止，不能追加绘画');
    if (e.offsetMs < (s.events.at(-1)?.offsetMs ?? 0))
      throw new Error('事件时间倒退');
    if (
      (e.seq === 1 && (e.type !== 'task_started' || e.offsetMs !== 0)) ||
      (e.seq > 1 && e.type === 'task_started')
    )
      throw new Error('开始事件必须唯一');
    if (s.condition === 'control' && e.type.startsWith('guide_'))
      throw new Error('对照条件不能执行指导');
    if (
      e.type === 'stroke_ended' &&
      (typeof e.payload.startedMs !== 'number' ||
        e.payload.startedMs > e.offsetMs ||
        e.payload.startedMs < 0 ||
        typeof e.payload.valid !== 'boolean' ||
        typeof e.payload.lengthRatio !== 'number' ||
        e.payload.lengthRatio < 0)
    )
      throw new Error('笔迹摘要无效');
    if (e.type === 'task_ended') {
      if (
        !['submitted', 'timeout', 'withdrawn', 'technical_error'].includes(
          String(e.payload.reason),
        )
      )
        throw new Error('终止原因无效');
      if (e.payload.reason === 'timeout' && e.offsetMs !== PROTOCOL.timeLimitMs)
        throw new Error('超时截止点无效');
    }
    s.events.push({
      seq: e.seq,
      type: e.type,
      offsetMs: e.offsetMs,
      clientAt: e.clientAt,
      payload: e.payload,
    });
  }
  return s.events.length;
}
export function saveQuestionnaire(
  repo: StudyRepository,
  s: Session,
  phase: string,
  value: unknown,
) {
  if (!['pre', 'post'].includes(phase)) throw new Error('问卷阶段无效');
  const legacy = s.studyId === STUDY_IDS.legacyPilot || s.studyId === STUDY_IDS.legacyFormal;
  assertAnswers(value, phase === 'post', legacy);
  if (phase === 'pre' && s.state !== 'created')
    throw new Error('开始后不能修改前测');
  if (phase === 'post' && !s.finalizedAt) throw new Error('请先完成并保存绘画');
  if (s[phase as 'pre' | 'post']) throw new Error('问卷已提交');
  s[phase as 'pre' | 'post'] = value;
  repo.put('session', s.id, s);
  repo.audit(`questionnaire_${phase}`, s.id, {
    version: PROTOCOL.questionnaireVersion,
  });
}
export function finish(repo: StudyRepository, s: Session) {
  if (s.finalizedAt) return s;
  const end = s.events.at(-1);
  if (end?.type !== 'task_ended') throw new Error('尚未收到结束事件');
  if (
    !s.artifact &&
    !['technical_error', 'withdrawn'].includes(String(end.payload.reason))
  )
    throw new Error('作品尚未可靠保存');
  s.state = end.payload.reason as Session['state'];
  s.endedAt = new Date(Date.parse(s.startedAt!) + end.offsetMs).toISOString();
  s.finalizedAt = new Date().toISOString();
  if (s.state === 'technical_error') s.quality.push('technical_error');
  if (end.offsetMs > Date.now() - Date.parse(s.startedAt!) + 5000)
    s.quality.push('client_clock_ahead');
  if (s.events.some((e) => e.type === 'capability_violation'))
    s.quality.push('capability_violation');
  const raw = JSON.stringify(
    {
      schemaVersion: PROTOCOL.schemaVersion,
      protocol: PROTOCOL,
      materialHash: config(repo, s.studyId).materialHash,
      planHash:
        s.condition === 'guided' ? config(repo, s.studyId).planHash : null,
      session: s,
    },
    null,
    2,
  );
  s.rawHash = repo.write(`raw/${s.id}.json`, raw);
  repo.put('session', s.id, s);
  repo.audit('session_finalized', s.id, { hash: s.rawHash });
  return s;
}
export function report(repo: StudyRepository, studyId: string) {
  const c = config(repo, studyId),
    people = repo
      .all<Participant>('participant')
      .filter((p) => p.studyId === studyId);
  const all = repo.all<Session>('session').filter((s) => s.studyId === studyId);
  const pairs = people.map((p) => {
    const own = all
      .filter((s) => s.pairId === p.pairId)
      .sort((a, b) => a.attempt - b.attempt);
    const entry = (condition: Session['condition']) => {
      const s = own.filter((s) => s.condition === condition).at(-1);
      return s ? { ...s, metrics: metrics(s, c.essentialItems) } : null;
    };
    return {
      participantId: p.id,
      researchCode: p.researchCode ?? p.id,
      pairId: p.pairId,
      order: p.order,
      enrollment: {
        eligible: p.eligible,
        consentVersion: p.consentVersion,
        consentedAt: p.createdAt,
        researchLogConsent: p.researchLogConsent,
        researchArtworkConsent: p.researchArtworkConsent,
        practiceStartedAt: p.practiceStartedAt ?? null,
        practiceEndedAt: p.practiceAt,
        profile: p.profile ?? null,
        consent: p.consent ?? null,
      },
      withdrawnAt: p.withdrawnAt,
      interview: p.interview,
      interviewSource: p.interview ? p.interviewSource ?? 'participant' : null,
      interviewRecordedAt: p.interviewRecordedAt ?? null,
      attempts: own,
      audit: { participant: repo.auditFor(p.pairId), sessions: Object.fromEntries(own.map(s => [s.id, repo.auditFor(s.id)])) },
      control: entry('control'),
      guided: entry('guided'),
    };
  });
  const included = pairs.filter(
    (p) =>
      !p.withdrawnAt &&
      p.control?.inclusion === 'include' &&
      p.guided?.inclusion === 'include',
  );
  const scores = included.flatMap((p) =>
    p.control!.metrics.completion !== null &&
    p.guided!.metrics.completion !== null
      ? [p.guided!.metrics.completion - p.control!.metrics.completion]
      : [],
  );
  const willingness = included.flatMap((p) => {
    const a = p.control!.post?.willingness,
      b = p.guided!.post?.willingness;
    return typeof a === 'number' && typeof b === 'number' ? [b - a] : [];
  });
  const pairedScale = (
    select: (scores: ReturnType<typeof questionnaireScores>) => number | null,
    reverse = false,
  ) =>
    included.flatMap((p) => {
      const control = select(questionnaireScores(p.control!.post));
      const guided = select(questionnaireScores(p.guided!.post));
      return typeof control === 'number' && typeof guided === 'number'
        ? [reverse ? control - guided : guided - control]
        : [];
    });
  const pairedMetric = (
    select: (pair: (typeof included)[number]) => [number | null, number | null],
    reverse = false,
  ) =>
    included.flatMap((p) => {
      const [control, guided] = select(p);
      return typeof control === 'number' && typeof guided === 'number'
        ? [reverse ? control - guided : guided - control]
        : [];
    });
  const completion = exactSign(scores),
    satisfaction = exactSign(pairedScale((v) => v.satisfaction)),
    intention = exactSign(willingness),
    interestEnjoyment = exactSign(pairedScale((v) => v.interestEnjoyment)),
    perceivedCompetence = exactSign(pairedScale((v) => v.perceivedCompetence)),
    perceivedChoice = exactSign(pairedScale((v) => v.perceivedChoice)),
    pressureTension = exactSign(pairedScale((v) => v.pressureTension, true)),
    sus = exactSign(pairedScale((v) => v.sus)),
    ownership = exactSign(pairedScale((v) => v.ownership)),
    firstMarkSpeed = exactSign(
      pairedMetric((p) => [p.control!.metrics.firstMarkMs, p.guided!.metrics.firstMarkMs], true),
    ),
    drawingTime = exactSign(
      pairedMetric((p) => [p.control!.metrics.drawingMs, p.guided!.metrics.drawingMs]),
    ),
    activeSpan = exactSign(
      pairedMetric((p) => [p.control!.metrics.activeSpanMs, p.guided!.metrics.activeSpanMs]),
    ),
    activeMinutes = exactSign(
      pairedMetric((p) => [p.control!.metrics.activeMinutes, p.guided!.metrics.activeMinutes]),
    );
  const byOrder = (['AB', 'BA'] as const).map((order) => ({
    order,
    completion: exactSign(
      included
        .filter((p) => p.order === order)
        .flatMap((p) =>
          p.control!.metrics.completion !== null &&
          p.guided!.metrics.completion !== null
            ? [p.guided!.metrics.completion - p.control!.metrics.completion]
            : [],
        ),
    ),
  }));
  const qualification = {
    both: 0,
    controlOnly: 0,
    guidedOnly: 0,
    neither: 0,
    missing: 0,
  };
  included.forEach((p) => {
    const a = p.control!.metrics.qualified,
      b = p.guided!.metrics.qualified;
    qualification[
      a === null || b === null
        ? 'missing'
        : a && b
          ? 'both'
          : a
            ? 'controlOnly'
            : b
              ? 'guidedOnly'
              : 'neither'
    ]++;
  });
  const firstPeriod = (['control', 'guided'] as const).map((condition) => {
    const values = pairs
      .filter((p) => !p.withdrawnAt)
      .flatMap((p) => {
        const s = p[condition];
        return s?.period === 1 &&
          s.inclusion === 'include' &&
          s.metrics.completion !== null
          ? [s.metrics.completion]
          : [];
      });
    return {
      condition,
      n: values.length,
      mean: values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null,
    };
  });
  return {
    studyId,
    protocol: PROTOCOL,
    pairs,
    totalParticipants: people.length,
    includedPairs: included.length,
    analysis: {
      completion,
      satisfaction,
      willingness: intention,
      interestEnjoyment,
      perceivedCompetence,
      perceivedChoice,
      pressureTension,
      sus,
      ownership,
      behavior: { firstMarkSpeed, drawingTime, activeSpan, activeMinutes },
      primaryHolmP: holm([completion.p, satisfaction.p]),
      byOrder,
      qualification,
      firstPeriod,
    },
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { getRepository, hash, StudyStorageUnavailableError } from '@/lib/study/server/repository';
import {
  config,
  enroll,
  sessions,
  createSession,
  appendEvents,
  saveQuestionnaire,
  finish,
  report,
} from '@/lib/study/server/service';
import { PROTOCOL, type StrokePlan } from '@/lib/study/protocol';
import type { Participant, Session } from '@/lib/study/types';
import { createHandoff } from '@/lib/study/server/handoff';
import { pilotSnapshot, savePilotIssue, savePilotReview } from '@/lib/study/server/pilot';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookieName = 'startrace-study';
const equal = (a: string, b?: string) =>
  !!b && timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
function role(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (equal(token, process.env.ANALYTICS_ADMIN_TOKEN)) return 'admin';
  if (equal(token, process.env.STUDY_RATER_1_TOKEN)) return 'rater1';
  if (equal(token, process.env.STUDY_RATER_2_TOKEN)) return 'rater2';
  return 'participant';
}
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
function own(req: NextRequest) {
  const token = req.cookies.get(cookieName)?.value;
  if (!token) return null;
  return (
    getRepository()
      .all<Participant>('participant')
      .find((p) => p.tokenHash === hash(token)) ?? null
  );
}
function publicParticipant(p: Participant | null) {
  if (!p) return null;
  const { tokenHash: _tokenHash, ...safe } = p;
  void _tokenHash;
  return safe;
}
function png(value: unknown) {
  if (
    typeof value !== 'string' ||
    value.length > 3_000_000 ||
    !value.startsWith('data:image/png;base64,')
  )
    throw new Error('需要有效 PNG 作品');
  const data = Buffer.from(value.slice(22), 'base64');
  if (
    data.length < 33 ||
    data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    data.readUInt32BE(16) > 1024 ||
    data.readUInt32BE(20) > 1024 ||
    !data.readUInt32BE(16) ||
    !data.readUInt32BE(20)
  )
    throw new Error('PNG 尺寸或格式无效');
  return data;
}
function validatePlan(value: unknown): asserts value is StrokePlan {
  const p = value as StrokePlan,
    phases = ['outline', 'large_color', 'small_color', 'paint'];
  if (
    !p ||
    !Number.isInteger(p.width) ||
    !Number.isInteger(p.height) ||
    p.width < 4 ||
    p.height < 4 ||
    p.width > 1024 ||
    p.height > 1024 ||
    !Array.isArray(p.strokes) ||
    p.strokes.length < 1 ||
    p.strokes.length > PROTOCOL.maxStrokes ||
    new Set(p.strokes.map((s) => s.id)).size !== p.strokes.length
  )
    throw new Error('计划笔数或尺寸无效');
  let phase = 0;
  for (const s of p.strokes) {
    const next = phases.indexOf(s.phase);
    if (
      next < phase ||
      !Array.isArray(s.points) ||
      s.points.length < 2 ||
      s.points.length > 8 ||
      !Number.isFinite(s.width) ||
      s.width < 1 ||
      s.width > 128 ||
      !/^#[0-9a-f]{6}$/i.test(s.color) ||
      typeof s.id !== 'string' ||
      s.id.length > 80
    )
      throw new Error('计划阶段或笔触无效');
    phase = next;
    if (
      s.points.some(
        (pt) =>
          !Number.isFinite(pt.x + pt.y) ||
          pt.x < 0 ||
          pt.y < 0 ||
          pt.x > p.width ||
          pt.y > p.height,
      )
    )
      throw new Error('笔触越界');
    const length = s.points
      .slice(1)
      .reduce(
        (v, pt, i) =>
          v + Math.hypot(pt.x - s.points[i].x, pt.y - s.points[i].y),
        0,
      );
    if (length > Math.hypot(p.width, p.height) * 0.66)
      throw new Error('单笔过长');
  }
}
export async function GET(req: NextRequest) {
  try {
    const repo = getRepository(),
      access = role(req),
      p = own(req),
      action = req.nextUrl.searchParams.get('action');
    const studyId =
      req.nextUrl.searchParams.get('studyId') ||
      p?.studyId ||
      'novice-pilot-v1';
    if (action === 'admin') {
      if (access !== 'admin')
        return json({ error: '研究者口令无效或未配置' }, 401);
      return json({
        config: config(repo, studyId),
        report: report(repo, studyId),
        tests: repo.all<Participant>('participant').map(person => ({ pairId: person.pairId, researchCode: person.researchCode ?? person.id, studyId: person.studyId, createdAt: person.createdAt, withdrawnAt: person.withdrawnAt })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        handoffs: repo.all<{ id: string; studyId: string; createdAt: string; status: string; sha256: string }>('handoff').filter(e => e.studyId === studyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10).map(({ id, createdAt, status, sha256 }) => ({ id, createdAt, status, sha256 })),
      });
    }
    if (action === 'pilot') {
      if (access !== 'admin') return json({ error: '需要研究者权限' }, 403);
      return json(pilotSnapshot(repo));
    }
    if (action === 'pilotDownload') {
      if (access !== 'admin') return json({ error: '需要研究者权限' }, 403);
      const item = repo.get<{ path: string }>('pilot_export', req.nextUrl.searchParams.get('id') || '');
      if (!item) return json({ error: '复盘报告不存在' }, 404);
      return new NextResponse(new Uint8Array(repo.read(item.path)), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    if (action === 'handoffDownload') {
      if (access !== 'admin') return json({ error: '需要研究者权限' }, 403);
      const item = repo.get<{ path: string; sha256: string }>('handoff', req.nextUrl.searchParams.get('id') || '');
      if (!item) return json({ error: '交接包不存在' }, 404);
      const bytes = repo.read(item.path);
      if (hash(bytes) !== item.sha256) return json({ error: '交接包完整性校验失败' }, 409);
      return new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-SHA256': item.sha256 } });
    }
    if (action === 'ratings') {
      if (!access.startsWith('rater'))
        return json({ error: '需要评分者口令' }, 401);
      const items = repo
        .all<Session>('session')
        .filter(
          (s) =>
            s.studyId === studyId &&
            s.artifact &&
            s.finalizedAt &&
            !repo.get<Participant>('participant', s.pairId)?.withdrawnAt,
        )
        .sort((a, b) => hash(a.id + access).localeCompare(hash(b.id + access)));
      return json({
        rater: access,
        rubric: config(repo, studyId).rubric,
        artworks: items.map((s, i) => ({
          id: s.id,
          label: `作品 ${String(i + 1).padStart(3, '0')}`,
          rating: s.ratings.filter((r) => r.rater === access).at(-1) ?? null,
        })),
      });
    }
    if (action === 'artwork') {
      const s = repo.get<Session>(
        'session',
        req.nextUrl.searchParams.get('id') || '',
      );
      if (
        !s ||
        !s.artifact ||
        (access === 'participant' && p?.pairId !== s.pairId) ||
        repo.get<Participant>('participant', s.pairId)?.withdrawnAt
      )
        return json({ error: '作品不可访问' }, 403);
      return new NextResponse(new Uint8Array(repo.read(s.artifact)), {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
      });
    }
    if (action === 'download') {
      if (access !== 'admin') return json({ error: '需要研究者权限' }, 401);
      const id = req.nextUrl.searchParams.get('id') || '',
        format =
          req.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'json';
      if (!/^[a-f0-9-]{36}$/.test(id) || !repo.get('export', id))
        throw new Error('导出不存在');
      return new NextResponse(
        new Uint8Array(repo.read(`exports/${id}/dataset.${format}`)),
        {
          headers: {
            'Content-Type':
              format === 'json'
                ? 'application/json'
                : 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="startrace-${id}.${format}"`,
            'Cache-Control': 'no-store',
          },
        },
      );
    }
    if (!p)
      return json({
        participant: null,
        protocol: PROTOCOL,
        config: {
          published: config(repo, studyId).published,
          stage: config(repo, studyId).stage,
        },
      });
    const c = config(repo, p.studyId),
      ownSessions = sessions(repo, p);
    const completed = [1, 2].every(
      (n) => ownSessions.filter((s) => s.period === n).at(-1)?.post,
    );
    const pairReport = completed
      ? report(repo, p.studyId).pairs.find((pair) => pair.pairId === p.pairId)
      : null;
    return json({
      participant: publicParticipant(p),
      protocol: PROTOCOL,
      config: c,
      sessions: ownSessions.map((s) => ({
        ...s,
        ratings: completed ? s.ratings : [],
        events: [],
      })),
      report: pairReport,
    });
  } catch (e) {
    if (e instanceof StudyStorageUnavailableError)
      return json({ error: e.message, code: 'STUDY_UNAVAILABLE' }, 503);
    return json({ error: e instanceof Error ? e.message : '读取失败' }, 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (
      req.headers.get('origin') &&
      new URL(req.headers.get('origin')!).host !== req.headers.get('host')
    )
      return json({ error: '请求来源无效' }, 403);
    if (Number(req.headers.get('content-length') || 0) > 4_000_000)
      throw new Error('请求过大');
    const raw = await req.text();
    if (raw.length > 4_000_000) throw new Error('请求过大');
    const b = JSON.parse(raw),
      repo = getRepository(),
      access = role(req),
      p = own(req);
    if (b.action === 'enroll') {
      if (p && !p.withdrawnAt)
        return json({ participant: publicParticipant(p) });
      if (
        b.eligible !== true ||
        b.logs !== true ||
        b.artwork !== true ||
        b.adult !== true
      )
        throw new Error('请完成筛选与两项研究同意');
      const result = enroll(repo, String(b.studyId || 'novice-pilot-v1'), String(b.code || ''));
      const response = json({
        participant: publicParticipant(result.participant),
      });
      response.cookies.set(cookieName, result.token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: req.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: 86400 * 30,
      });
      return response;
    }
    if (b.action === 'logout') {
      const r = json({ ok: true });
      r.cookies.delete(cookieName);
      return r;
    }
    if (b.action === 'purge_withdrawal') {
      if (access !== 'admin') return json({ error: '需要研究者权限' }, 403);
      const person = repo.get<Participant>('participant', String(b.pairId));
      if (!person?.withdrawnAt) throw new Error('只能处理已申请撤回的参与者');
      for (const record of sessions(repo, person)) {
        if (record.artifact) repo.remove(record.artifact);
        repo.remove(`raw/${record.id}.json`);
        repo.delete('session', record.id);
      }
      for (const item of repo
        .all<{ id: string; studyId: string }>('export')
        .filter((e) => e.studyId === person.studyId)) {
        repo.remove(`exports/${item.id}`);
        repo.delete('export', item.id);
      }
      person.interview = null;
      for (const item of repo.all<{ id: string; studyId: string; path: string }>('pilot_export').filter(e => e.studyId === person.studyId)) {
        repo.remove(item.path);
        repo.delete('pilot_export', item.id);
      }
      repo.put('participant', person.pairId, person);
      repo.audit('withdrawal_purged', person.pairId, {
        offlineBackupsRequireReview: true,
      });
      return json({
        ok: true,
        message:
          '已删除在线作品、会话及关联批次导出；请按备份清单处理离线副本。',
      });
    }
    if (b.action === 'handoffExport') {
      if (access !== 'admin') return json({ error: '需要研究者权限' }, 403);
      return json(createHandoff(repo, String(b.studyId)));
    }
    if (b.action === 'pilotExport') {
      if (access !== 'admin') return json({ error: '需要研究者权限' }, 403);
      const id = randomUUID(), path = `pilot-reviews/${id}.json`;
      const snapshot = { exportedAt: new Date().toISOString(), ...pilotSnapshot(repo) };
      const sha256 = repo.write(path, JSON.stringify(snapshot, null, 2));
      repo.put('pilot_export', id, { id, studyId: 'novice-pilot-v1', path, sha256, createdAt: snapshot.exportedAt });
      repo.audit('pilot_export', 'novice-pilot-v1', { id, sha256 });
      return json({ id, sha256 });
    }
    if (b.action === 'pilotIssue' || b.action === 'pilotReview') {
      if (access !== 'admin') return json({ error: '需要研究者权限' }, 403);
      return json(b.action === 'pilotIssue' ? savePilotIssue(repo, b) : savePilotReview(repo, b));
    }
    if (b.action === 'configure' || b.action === 'publish') {
      if (access !== 'admin') return json({ error: '需要研究者权限' }, 403);
      return repo.transaction(() => {
        const c = config(repo, String(b.studyId));
        if (
          repo.all<Participant>('participant').some((v) => v.studyId === c.id)
        )
          throw new Error('已经入组的研究版本不可修改材料或协议');
        if (b.action === 'configure') {
          validatePlan(b.plan);
          const data = png(b.material);
          if (
            data.readUInt32BE(16) !== b.plan.width ||
            data.readUInt32BE(20) !== b.plan.height
          )
            throw new Error('任务图与计划尺寸不一致');
          if (
            !Array.isArray(b.rubric) ||
            b.rubric.length !== 10 ||
            b.rubric.some(
              (x: unknown) =>
                typeof x !== 'string' || !x.trim() || x.length > 120,
            )
          )
            throw new Error('需要 10 个评分项目');
          c.material = b.material;
          c.materialHash = hash(data);
          c.plan = b.plan;
          c.planHash = hash(JSON.stringify(b.plan));
          c.rubric = b.rubric;
          c.materialReviewed = b.materialReviewed === true;
        } else {
          if (!c.materialReviewed || !c.plan || !c.material)
            throw new Error('请先审核材料、计划和评分清单');
          if (c.stage === 'formal') {
            if (!pilotSnapshot(repo).ready) throw new Error('请先完成预试看板：6 人完整流程与双人评分、实际复核，以及阻断问题修复');
            const required = [
              'pilotReviewed',
              'backupRestored',
              'deviceChecked',
              'protocolApproved',
            ];
            if (
              !required.every((k) => b.checks?.[k] === true) ||
              report(repo, 'novice-pilot-v1').pairs.filter(
                (pair) => pair.control?.finalizedAt && pair.guided?.finalizedAt,
              ).length < 6
            )
              throw new Error('正式发布需要 6 个完整预试配对及全部发布检查');
            c.checks = Object.fromEntries(required.map((k) => [k, true]));
          }
          c.published = true;
        }
        repo.put('config', c.id, c);
        repo.audit(b.action, c.id, {
          materialHash: c.materialHash,
          planHash: c.planHash,
        });
        return json({ ok: true, config: c });
      });
    }
    if (b.action === 'freeze') {
      if (access !== 'admin') return json({ error: '需要研究者权限' }, 403);
      const snapshot = report(repo, String(b.studyId)),
        id = randomUUID(),
        files: { name: string; path: string; hash: string }[] = [];
      for (const pair of snapshot.pairs.filter((pair) => !pair.withdrawnAt)) {
        for (const s of [pair.control, pair.guided]) {
          if (!s?.finalizedAt) continue;
          const date = new Date(Date.parse(s.startedAt!) + 8 * 3600000)
            .toISOString()
            .replace(/[-:]/g, '')
            .replace('.', '')
            .replace('Z', '+0800');
          const name = `${pair.researchCode}-${date}-${s.condition}.json`;
          const data = JSON.stringify(
            {
              schemaVersion: PROTOCOL.schemaVersion,
              researchCode: pair.researchCode,
              protocol: PROTOCOL,
              assignment: { pairId: pair.pairId, order: pair.order },
              enrollment: pair.enrollment,
              materialHash: config(repo, s.studyId).materialHash,
              planHash:
                s.condition === 'guided'
                  ? config(repo, s.studyId).planHash
                  : null,
              ...s,
            },
            null,
            2,
          );
          files.push({
            name,
            path: `${s.id}/${name}`,
            hash: repo.write(`exports/${id}/${s.id}/${name}`, data),
          });
        }
        const name = `${pair.researchCode}-pair.json`;
        files.push({
          name,
          path: name,
          hash: repo.write(
            `exports/${id}/${name}`,
            JSON.stringify(pair, null, 2),
          ),
        });
      }
      const output = {
        ...snapshot,
        pairs: snapshot.pairs.filter((p) => !p.withdrawnAt),
        withdrawnParticipants: snapshot.pairs.filter((p) => p.withdrawnAt)
          .length,
        exportId: id,
        createdAt: new Date().toISOString(),
        files,
      };
      repo.write(`exports/${id}/dataset.json`, JSON.stringify(output, null, 2));
      const csv = [
        'participant,order,control_score,guided_score,difference,control_ms,guided_ms,control_status,guided_status,control_inclusion,guided_inclusion,research_code',
        ...snapshot.pairs
          .filter((p) => !p.withdrawnAt)
          .map((p) =>
            [
              p.participantId,
              p.order,
              p.control?.metrics.completion ?? '',
              p.guided?.metrics.completion ?? '',
              p.control?.metrics.completion != null &&
              p.guided?.metrics.completion != null
                ? p.guided.metrics.completion - p.control.metrics.completion
                : '',
              p.control?.metrics.elapsedMs ?? '',
              p.guided?.metrics.elapsedMs ?? '',
              p.control?.state ?? 'missing',
              p.guided?.state ?? 'missing',
              p.control?.inclusion ?? '',
              p.guided?.inclusion ?? '',
              p.researchCode.startsWith('-') ? "'" + p.researchCode : p.researchCode,
            ].join(','),
          ),
      ].join('\n');
      repo.write(`exports/${id}/dataset.csv`, '\uFEFF' + csv);
      repo.write(
        `exports/${id}/manifest.json`,
        JSON.stringify({ exportId: id, files, protocol: PROTOCOL }, null, 2),
      );
      repo.put('export', id, { id, studyId: b.studyId, at: output.createdAt });
      repo.audit('dataset_frozen', id);
      return json({ exportId: id, files });
    }
    const s = b.sessionId
      ? repo.get<Session>('session', String(b.sessionId))
      : null;
    if (b.action === 'rate') {
      if (
        !access.startsWith('rater') ||
        !s?.artifact ||
        !s.finalizedAt ||
        repo.get<Participant>('participant', s.pairId)?.withdrawnAt
      )
        return json({ error: '无评分权限' }, 403);
      if (
        !Array.isArray(b.scores) ||
        b.scores.length !== 10 ||
        b.scores.some(
          (v: unknown) =>
            !Number.isInteger(v) || Number(v) < 0 || Number(v) > 2,
        )
      )
        throw new Error('请完成全部 10 项评分');
      const prior = s.ratings.filter((r) => r.rater === access);
      if (prior.length && (typeof b.reason !== 'string' || !b.reason.trim()))
        throw new Error('修订评分需要填写原因');
      s.ratings.push({
        rater: access,
        scores: b.scores,
        revision: prior.length + 1,
        at: new Date().toISOString(),
        reason: String(b.reason || '').slice(0, 500),
      });
      repo.put('session', s.id, s);
      repo.audit('rating_submitted', s.id, {
        rater: access,
        revision: prior.length + 1,
      });
      return json({ ok: true });
    }
    if (b.action === 'include' || b.action === 'retest') {
      if (access !== 'admin' || !s)
        return json({ error: '需要研究者权限' }, 403);
      if (typeof b.reason !== 'string' || !b.reason.trim())
        throw new Error('请填写处理原因');
      if (b.action === 'include') {
        if (!['include', 'exclude'].includes(b.decision))
          throw new Error('纳入决定无效');
        if (
          b.decision === 'include' &&
          (!s.finalizedAt ||
            s.quality.length ||
            !['submitted', 'timeout'].includes(s.state))
        )
          throw new Error('故障或未完成保存的记录不能纳入');
        s.inclusion = b.decision;
        s.inclusionReason = b.reason.slice(0, 500);
        repo.put('session', s.id, s);
      } else {
        if (
          s.state !== 'technical_error' ||
          repo.all<Session>('session').some((x) => x.supersedes === s.id)
        )
          throw new Error('只允许为技术故障创建一次关联重测');
        const retry: Session = {
          ...s,
          id: randomUUID(),
          attempt: s.attempt + 1,
          supersedes: s.id,
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
        s.inclusion = 'exclude';
        s.inclusionReason = `技术重测：${b.reason.slice(0, 400)}`;
        repo.put('session', s.id, s);
        repo.put('session', retry.id, retry);
      }
      repo.audit(b.action, s.id, { reason: b.reason.slice(0, 500) });
      return json({ ok: true });
    }
    if (!p || p.withdrawnAt) return json({ error: '请先进入研究' }, 401);
    if (b.action === 'practice_start') {
      p.practiceStartedAt = new Date().toISOString();
      repo.put('participant', p.pairId, p);
      repo.audit('practice_started', p.pairId);
      return json({ ok: true });
    }
    if (b.action === 'practice') {
      if (
        !p.practiceStartedAt ||
        Date.now() - Date.parse(p.practiceStartedAt) < PROTOCOL.practiceMs
      )
        throw new Error('请完成 90 秒操作练习');
      p.practiceAt = new Date().toISOString();
      repo.put('participant', p.pairId, p);
      repo.audit('practice_ended', p.pairId);
      return json({ ok: true });
    }
    if (b.action === 'session')
      return json({ session: createSession(repo, p, Number(b.period)) });
    if (b.action === 'interview') {
      if (
        !Array.isArray(b.answers) ||
        b.answers.length !== 3 ||
        b.answers.some((v: unknown) => typeof v !== 'string' || v.length > 2000)
      )
        throw new Error('访谈答案无效');
      p.interview = b.answers;
      repo.put('participant', p.pairId, p);
      repo.audit('interview_submitted', p.pairId);
      return json({ ok: true });
    }
    if (b.action === 'withdraw') {
      p.withdrawnAt = new Date().toISOString();
      repo.put('participant', p.pairId, p);
      repo.audit('withdrawal_requested', p.pairId);
      return json({ ok: true });
    }
    if (!s || s.pairId !== p.pairId)
      return json({ error: '会话不可访问' }, 403);
    return repo.transaction(() => {
      // Re-read under the write transaction to serialize tabs, checkpoints and finalization.
      const current = repo.get<Session>('session', s.id)!;
      if (b.action === 'questionnaire') {
        saveQuestionnaire(repo, current, b.phase, b.answers);
        return json({ ok: true });
      }
      if (b.action === 'start') {
        if (
          !current.pre ||
          !b.pageId ||
          typeof b.pageId !== 'string' ||
          b.pageId.length > 80
        )
          throw new Error('请先完成前测');
        if (current.state === 'running' && current.pageId === b.pageId)
          return json({ startedAt: current.startedAt });
        if (current.state !== 'created')
          throw new Error('本轮已经开始，不能在另一页面重复开始');
        current.state = 'running';
        current.pageId = b.pageId;
        current.startedAt = new Date().toISOString();
        current.lastSeenAt = current.startedAt;
        repo.put('session', current.id, current);
        return json({ startedAt: current.startedAt });
      }
      if (b.action === 'recover') {
        if (current.state !== 'running') return json({ session: current });
        if (
          Date.now() - Date.parse(current.lastSeenAt || current.startedAt!) <
          15000
        )
          throw new Error(
            '原页面最近仍在同步，请返回原页；关闭原页后等待 15 秒再恢复',
          );
        if (b.pageId === current.pageId && Array.isArray(b.events))
          for (let i = 0; i < b.events.length; i += 200)
            appendEvents(current, b.events.slice(i, i + 200));
        current.quality.push('page_lost');
        if (current.events.at(-1)?.type !== 'task_ended')
          current.events.push({
            seq: current.events.length + 1,
            type: 'task_ended',
            offsetMs: current.events.at(-1)?.offsetMs ?? 0,
            clientAt: new Date().toISOString(),
            payload: { reason: 'technical_error' },
          });
        return json({ session: finish(repo, current) });
      }
      if (current.pageId !== b.pageId)
        throw new Error('此页面不是任务输入页面，请回到原页面');
      if (b.action === 'checkpoint') {
        const seq = appendEvents(current, b.events);
        current.lastSeenAt = new Date().toISOString();
        repo.put('session', current.id, current);
        repo.audit('checkpoint_received', current.id, { ackedThroughSeq: seq });
        return json({ ackedThroughSeq: seq });
      }
      if (b.action === 'artifact') {
        if (current.finalizedAt)
          return json({ stored: true, hash: current.artifactHash });
        if (current.events.at(-1)?.type !== 'task_ended')
          throw new Error('请先冻结画布并同步结束事件');
        const data = png(b.png);
        current.artifact = `artworks/${current.id}.png`;
        current.artifactHash = repo.write(current.artifact, data);
        repo.put('session', current.id, current);
        return json({ stored: true, hash: current.artifactHash });
      }
      if (b.action === 'finish')
        return json({ stored: true, session: finish(repo, current) });
      throw new Error('未知研究操作');
    });
  } catch (e) {
    if (e instanceof StudyStorageUnavailableError)
      return json({ error: e.message, code: 'STUDY_UNAVAILABLE' }, 503);
    return json(
      { error: e instanceof Error ? e.message : '保存失败，请重试' },
      400,
    );
  }
}

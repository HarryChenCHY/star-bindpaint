import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

type RawSession = Record<string, unknown>;

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function boundedRate(value: number | null) {
  return value === null ? null : Math.max(0, Math.min(100, value));
}

function hasValidAdminToken(req: NextRequest) {
  const expected = process.env.ANALYTICS_ADMIN_TOKEN;
  if (!expected) return null;
  const authorization = req.headers.get('authorization') || '';
  const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  const providedHash = crypto.createHash('sha256').update(provided).digest();
  return crypto.timingSafeEqual(expectedHash, providedHash);
}

function normalizeSession(raw: RawSession) {
  const totalStrokes = numberOrNull(raw.totalStrokes) ?? 0;
  const manualAcceptedCount = numberOrNull(raw.manualAcceptedCount) ?? numberOrNull(raw.completedStrokes) ?? 0;
  const aiRenderedCount = numberOrNull(raw.aiRenderedCount) ?? numberOrNull(raw.batchedStrokes) ?? 0;
  const skippedStrokes = numberOrNull(raw.skippedStrokes) ?? 0;
  const manualContributionRate = boundedRate(
    numberOrNull(raw.manualContributionRate) ?? (totalStrokes > 0 ? manualAcceptedCount / totalStrokes * 100 : manualAcceptedCount > 0 ? 100 : null),
  );
  const aiAssistanceRate = boundedRate(
    numberOrNull(raw.aiAssistanceRate) ?? (totalStrokes > 0 ? aiRenderedCount / totalStrokes * 100 : null),
  );
  const contentCoverageRate = boundedRate(
    numberOrNull(raw.contentCoverageRate)
      ?? numberOrNull(raw.completionRate)
      ?? (totalStrokes > 0 ? (manualAcceptedCount + aiRenderedCount) / totalStrokes * 100 : null),
  );
  const firstPointerAt = numberOrNull(raw.firstPointerAt);
  const canvasReadyAt = numberOrNull(raw.canvasReadyAt) ?? numberOrNull(raw.startTime);
  const firstStrokeLatencySec = numberOrNull(raw.firstStrokeLatencySec)
    ?? (firstPointerAt !== null && canvasReadyAt !== null ? Math.max(0, (firstPointerAt - canvasReadyAt) / 1000) : null);
  const schemaVersion = numberOrNull(raw.schemaVersion) ?? 1;

  return {
    participantId: String(raw.participantId || 'legacy'),
    sessionId: String(raw.sessionId || raw.id || ''),
    startedAt: raw.startedAt || null,
    durationSec: numberOrNull(raw.durationSec) ?? 0,
    outcome: String(raw.outcome || (numberOrNull(raw.endTime) ? 'completed' : 'legacy_unknown')),
    initialMode: String(raw.initialMode || raw.mode || 'unknown'),
    finalMode: String(raw.mode || 'unknown'),
    guidanceLevel: String(raw.initialGuidanceLevel || raw.guidanceLevel || 'unknown'),
    difficulty: String(raw.difficulty || 'unknown'),
    totalStrokes,
    manualAttemptCount: numberOrNull(raw.manualAttemptCount),
    manualAcceptedCount,
    manualRejectedCount: numberOrNull(raw.manualRejectedCount),
    aiRenderedCount,
    skippedStrokes,
    firstStrokeLatencySec,
    manualContributionRate,
    aiAssistanceRate,
    contentCoverageRate,
    averageStartIntervalSec: numberOrNull(raw.avgWaitTimeSec),
    averageStrokeDurationSec: numberOrNull(raw.avgDrawDurationSec),
    autoStartCount: numberOrNull(raw.autoStartCount) ?? 0,
    schemaVersion,
    dataQuality: schemaVersion >= 2 ? String(raw.dataQuality || 'complete') : 'legacy',
    studyCondition: String(raw.studyCondition || 'unassigned'),
    sessionKind: String(raw.sessionKind || 'voluntary'),
    studyPhase: String(raw.studyPhase || 'exploration'),
  };
}

function mean(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return valid.length > 0 ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function countBy(sessions: ReturnType<typeof normalizeSession>[], field: 'outcome' | 'initialMode' | 'guidanceLevel' | 'difficulty') {
  return sessions.reduce<Record<string, number>>((result, session) => {
    const value = session[field];
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

export async function GET(req: NextRequest) {
  const authorized = hasValidAdminToken(req);
  if (authorized === null) return NextResponse.json({ error: '研究后台访问口令尚未配置' }, { status: 503 });
  if (!authorized) return NextResponse.json({ error: '研究后台访问口令无效' }, { status: 401 });

  const bucket = process.env.OSS_BUCKET;
  const region = process.env.OSS_REGION || 'oss-cn-shanghai';
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;

  if (!bucket || !accessKeyId || !accessKeySecret) {
    return NextResponse.json({ error: '研究数据存储尚未配置' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const requestedDate = searchParams.get('date') || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    return NextResponse.json({ error: '日期格式无效' }, { status: 400 });
  }

  const prefix = `sessions/${requestedDate}/`;

  try {
    const fileList = (await listOssObjects(bucket, region, accessKeyId, accessKeySecret, prefix))
      .filter(key => key.endsWith('.json') && !key.endsWith('-render.json'));
    const rawSessions: RawSession[] = [];

    for (const key of fileList) {
      try {
        const json = await getOssObject(bucket, region, accessKeyId, accessKeySecret, key);
        const parsed = JSON.parse(json) as RawSession;
        if (parsed.recordType !== 'render') rawSessions.push(parsed);
      } catch {
        // 单条损坏记录不影响其余会话统计。
      }
    }

    const sessions = rawSessions.map(normalizeSession);
    const startedSessions = sessions.filter(session => session.firstStrokeLatencySec !== null);
    const completedSessions = sessions.filter(session => session.outcome === 'completed');
    const summary = {
      totalSessions: sessions.length,
      startedSessions: startedSessions.length,
      completedSessions: completedSessions.length,
      startRate: sessions.length > 0 ? startedSessions.length / sessions.length * 100 : null,
      completionRate: sessions.length > 0 ? completedSessions.length / sessions.length * 100 : null,
      avgDurationSec: mean(sessions.map(session => session.durationSec)),
      avgFirstStrokeLatencySec: mean(sessions.map(session => session.firstStrokeLatencySec)),
      avgManualContributionRate: mean(sessions.map(session => session.manualContributionRate)),
      avgAiAssistanceRate: mean(sessions.map(session => session.aiAssistanceRate)),
      avgContentCoverageRate: mean(sessions.map(session => session.contentCoverageRate)),
      avgManualAcceptedCount: mean(sessions.map(session => session.manualAcceptedCount)),
      byOutcome: countBy(sessions, 'outcome'),
      byInitialMode: countBy(sessions, 'initialMode'),
      byGuidance: countBy(sessions, 'guidanceLevel'),
      byDifficulty: countBy(sessions, 'difficulty'),
      legacyRecords: sessions.filter(session => session.dataQuality === 'legacy').length,
    };

    return NextResponse.json({ date: requestedDate, total: sessions.length, sessions, summary });
  } catch (error) {
    console.error('[/api/analytics/stats] query failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: '研究数据查询失败' }, { status: 500 });
  }
}

async function listOssObjects(bucket: string, region: string, keyId: string, keySecret: string, prefix: string): Promise<string[]> {
  const endpoint = `https://${bucket}.${region}.aliyuncs.com/?prefix=${encodeURIComponent(prefix)}`;
  const date = new Date().toUTCString();
  const signature = ossSign('GET', '', '', date, `/${bucket}/`, keySecret);
  const response = await fetch(endpoint, { headers: { Date: date, Authorization: `OSS ${keyId}:${signature}` } });
  if (!response.ok) throw new Error(`list:${response.status}`);
  const xml = await response.text();
  const keys: string[] = [];
  const keyPattern = /<Key>([^<]+)<\/Key>/g;
  let match: RegExpExecArray | null;
  while ((match = keyPattern.exec(xml)) !== null) keys.push(match[1]);
  return keys;
}

async function getOssObject(bucket: string, region: string, keyId: string, keySecret: string, key: string): Promise<string> {
  const endpoint = `https://${bucket}.${region}.aliyuncs.com/${encodeURIComponent(key)}`;
  const date = new Date().toUTCString();
  const signature = ossSign('GET', '', '', date, `/${bucket}/${key}`, keySecret);
  const response = await fetch(endpoint, { headers: { Date: date, Authorization: `OSS ${keyId}:${signature}` } });
  if (!response.ok) throw new Error(`get:${response.status}`);
  return response.text();
}

function ossSign(method: string, contentMd5: string, contentType: string, date: string, resource: string, secret: string): string {
  const value = `${method}\n${contentMd5}\n${contentType}\n${date}\n${resource}`;
  return crypto.createHmac('sha1', secret).update(value).digest('base64');
}

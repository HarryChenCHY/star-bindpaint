import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

type UnknownRecord = Record<string, unknown>;

const MAX_BODY_BYTES = 64 * 1024;
const PARTICIPANT_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f-]{27}|p_[a-z0-9_]{8,40})$/i;
const SESSION_PATTERN = /^[a-z0-9_-]{6,80}$/i;

function numberOrNull(value: unknown, minimum = 0, maximum = 1_000_000) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : null;
}

function stringFrom(value: unknown, allowed: string[], fallback: string) {
  const normalized = String(value || '');
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeSession(body: UnknownRecord) {
  const recordType = body.recordType === 'render' || body.renderedAt ? 'render' : 'session';
  const participantId = typeof body.participantId === 'string' && PARTICIPANT_PATTERN.test(body.participantId) ? body.participantId : '';
  const sessionId = typeof body.sessionId === 'string' && SESSION_PATTERN.test(body.sessionId) ? body.sessionId : '';
  if (!participantId || !sessionId || body.researchConsent !== true) return null;

  const base = {
    schemaVersion: 3,
    recordType,
    participantId,
    sessionId,
    researchConsent: true,
    consentVersion: typeof body.consentVersion === 'string' ? body.consentVersion.slice(0, 40) : 'unknown',
    consentedAt: typeof body.consentedAt === 'string' ? body.consentedAt.slice(0, 40) : null,
    studyId: typeof body.studyId === 'string' ? body.studyId.slice(0, 60) : 'startrace-novice-pilot',
    studyCondition: stringFrom(body.studyCondition, ['unassigned', 'full', 'balanced', 'light', 'control'], 'unassigned'),
    sessionKind: stringFrom(body.sessionKind, ['voluntary', 'research_task'], 'voluntary'),
    studyPhase: stringFrom(body.studyPhase, ['exploration', 'baseline', 'intervention', 'posttest', 'transfer'], 'exploration'),
  };

  if (recordType === 'render') {
    return {
      ...base,
      renderedAt: typeof body.renderedAt === 'string' ? body.renderedAt.slice(0, 40) : new Date().toISOString(),
      durationMs: numberOrNull(body.durationMs, 0, 180_000),
    };
  }

  return {
    ...base,
    dataQuality: 'complete',
    startedAt: typeof body.startedAt === 'string' ? body.startedAt.slice(0, 40) : null,
    endedAt: typeof body.endedAt === 'string' ? body.endedAt.slice(0, 40) : null,
    outcome: stringFrom(body.outcome, ['completed', 'abandoned', 'in_progress'], 'in_progress'),
    durationSec: numberOrNull(body.durationSec, 0, 86_400) ?? 0,
    mode: stringFrom(body.mode, ['follow', 'auto', 'free'], 'follow'),
    initialMode: stringFrom(body.initialMode, ['follow', 'auto', 'free'], 'follow'),
    guideSubMode: stringFrom(body.guideSubMode, ['assist', 'real'], 'assist'),
    guidanceLevel: stringFrom(body.guidanceLevel, ['full', 'balanced', 'light'], 'full'),
    initialGuidanceLevel: stringFrom(body.initialGuidanceLevel, ['full', 'balanced', 'light'], 'full'),
    difficulty: stringFrom(body.difficulty, ['sticker', 'tracing', 'free', 'unknown'], 'unknown'),
    sourceType: body.isCustomUpload === true ? 'upload' : 'library',
    roughness: numberOrNull(body.roughness, 0, 10),
    totalStrokes: numberOrNull(body.totalStrokes, 0, 100_000) ?? 0,
    completedStrokes: numberOrNull(body.completedStrokes, 0, 100_000) ?? 0,
    manualAttemptCount: numberOrNull(body.manualAttemptCount, 0, 100_000) ?? 0,
    manualAcceptedCount: numberOrNull(body.manualAcceptedCount, 0, 100_000) ?? 0,
    manualRejectedCount: numberOrNull(body.manualRejectedCount, 0, 100_000) ?? 0,
    skippedStrokes: numberOrNull(body.skippedStrokes, 0, 100_000) ?? 0,
    batchedStrokes: numberOrNull(body.batchedStrokes, 0, 100_000) ?? 0,
    aiRenderedCount: numberOrNull(body.aiRenderedCount, 0, 100_000) ?? 0,
    autoStartCount: numberOrNull(body.autoStartCount, 0, 10_000) ?? 0,
    firstStrokeLatencySec: numberOrNull(body.firstStrokeLatencySec, 0, 86_400),
    manualContributionRate: numberOrNull(body.manualContributionRate, 0, 100),
    aiAssistanceRate: numberOrNull(body.aiAssistanceRate, 0, 100),
    contentCoverageRate: numberOrNull(body.contentCoverageRate, 0, 100),
    starTraceProgressRate: numberOrNull(body.starTraceProgressRate, 0, 100),
    avgWaitTimeSec: numberOrNull(body.avgWaitTimeSec, 0, 86_400),
    avgDrawDurationSec: numberOrNull(body.avgDrawDurationSec, 0, 86_400),
  };
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: '请求内容过大' }, { status: 413 });
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) return NextResponse.json({ error: '请求内容过大' }, { status: 413 });
    let body: UnknownRecord;
    try { body = JSON.parse(rawBody) as UnknownRecord; } catch { return NextResponse.json({ error: '请求格式无效' }, { status: 400 }); }
    const record = normalizeSession(body);
    if (!record) return NextResponse.json({ error: '缺少有效的研究授权或匿名编号' }, { status: 403 });

    const storage = getStorageConfig();
    if (!storage) return NextResponse.json({ ok: true, stored: false });
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
    const suffix = record.recordType === 'render' ? '-render' : '';
    const path = `sessions/${date}/${record.participantId}/${record.sessionId}${suffix}.json`;
    await putObject(storage, path, JSON.stringify(record), 'application/json');
    return NextResponse.json({ ok: true, stored: true });
  } catch (error) {
    console.error('[/api/analytics] request failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: '研究数据服务暂不可用' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 4_096) return NextResponse.json({ error: '请求内容过大' }, { status: 413 });
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, 'utf8') > 4_096) return NextResponse.json({ error: '请求内容过大' }, { status: 413 });
    let body: { participantId?: unknown; confirm?: unknown };
    try { body = JSON.parse(rawBody) as typeof body; } catch { return NextResponse.json({ error: '请求格式无效' }, { status: 400 }); }
    const participantId = typeof body.participantId === 'string' && PARTICIPANT_PATTERN.test(body.participantId) ? body.participantId : '';
    if (!participantId || body.confirm !== true) return NextResponse.json({ error: '删除请求无效' }, { status: 400 });

    const storage = getStorageConfig();
    if (!storage) return NextResponse.json({ ok: true, deleted: 0, storageConfigured: false });
    const sessionKeys = (await listObjects(storage, 'sessions/')).filter(key => key.includes(`/${participantId}/`));
    const galleryKeys = await listObjects(storage, `gallery/${participantId}/`);
    const keys = [...sessionKeys, ...galleryKeys];
    for (const key of keys) await deleteObject(storage, key);
    return NextResponse.json({ ok: true, deleted: keys.length });
  } catch (error) {
    console.error('[/api/analytics] deletion failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: '云端删除失败，请稍后重试' }, { status: 500 });
  }
}

type StorageConfig = { bucket: string; region: string; keyId: string; keySecret: string };

function getStorageConfig(): StorageConfig | null {
  const bucket = process.env.OSS_BUCKET;
  const region = process.env.OSS_REGION || 'oss-cn-shanghai';
  const keyId = process.env.OSS_ACCESS_KEY_ID;
  const keySecret = process.env.OSS_ACCESS_KEY_SECRET;
  return bucket && keyId && keySecret ? { bucket, region, keyId, keySecret } : null;
}

function sign(method: string, contentType: string, date: string, resource: string, secret: string) {
  return crypto.createHmac('sha1', secret).update(`${method}\n\n${contentType}\n${date}\n${resource}`).digest('base64');
}

async function putObject(storage: StorageConfig, path: string, body: string, contentType: string) {
  const date = new Date().toUTCString();
  const authorization = sign('PUT', contentType, date, `/${storage.bucket}/${path}`, storage.keySecret);
  const response = await fetch(`https://${storage.bucket}.${storage.region}.aliyuncs.com/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, Date: date, Authorization: `OSS ${storage.keyId}:${authorization}` },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`put:${response.status}`);
}

async function listObjects(storage: StorageConfig, prefix: string) {
  const keys: string[] = [];
  let marker = '';
  for (let page = 0; page < 20; page++) {
    const query = `prefix=${encodeURIComponent(prefix)}${marker ? `&marker=${encodeURIComponent(marker)}` : ''}`;
    const date = new Date().toUTCString();
    const authorization = sign('GET', '', date, `/${storage.bucket}/`, storage.keySecret);
    const response = await fetch(`https://${storage.bucket}.${storage.region}.aliyuncs.com/?${query}`, {
      headers: { Date: date, Authorization: `OSS ${storage.keyId}:${authorization}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`list:${response.status}`);
    const xml = await response.text();
    const matches = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(match => match[1]);
    keys.push(...matches);
    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml) || matches.length === 0) break;
    marker = matches[matches.length - 1];
  }
  return keys;
}

async function deleteObject(storage: StorageConfig, path: string) {
  const date = new Date().toUTCString();
  const authorization = sign('DELETE', '', date, `/${storage.bucket}/${path}`, storage.keySecret);
  const response = await fetch(`https://${storage.bucket}.${storage.region}.aliyuncs.com/${path}`, {
    method: 'DELETE',
    headers: { Date: date, Authorization: `OSS ${storage.keyId}:${authorization}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok && response.status !== 404) throw new Error(`delete:${response.status}`);
}

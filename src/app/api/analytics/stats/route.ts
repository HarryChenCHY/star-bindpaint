import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GET /api/analytics/stats?date=2026-05-28
 * 拉取指定日期的所有埋点 JSON，返回汇总统计
 */
export async function GET(req: NextRequest) {
  const bucket = process.env.OSS_BUCKET;
  const region = process.env.OSS_REGION || 'oss-cn-shenzhen';
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;

  if (!bucket || !accessKeyId || !accessKeySecret) {
    return NextResponse.json({ error: 'OSS 未配置' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const prefix = `sessions/${date}/`;

  try {
    // 1. 列出当天所有 session 文件
    const fileList = await listOssObjects(bucket, region, accessKeyId, accessKeySecret, prefix);
    if (fileList.length === 0) {
      return NextResponse.json({ date, total: 0, sessions: [], summary: null });
    }

    // 2. 下载每个文件并解析
    const sessions: Record<string, unknown>[] = [];
    for (const key of fileList) {
      try {
        const json = await getOssObject(bucket, region, accessKeyId, accessKeySecret, key);
        sessions.push(JSON.parse(json));
      } catch {
        // 跳过解析失败的文件
      }
    }

    // 3. 汇总统计
    const durations = sessions.map(s => s.durationSec as number).filter(d => d > 0);
    const summary = {
      totalSessions: sessions.length,
      avgDurationSec: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      maxDurationSec: durations.length > 0 ? Math.max(...durations) : 0,
      minDurationSec: durations.length > 0 ? Math.min(...durations) : 0,
      byMode: countBy(sessions, 'mode'),
      byDifficulty: countBy(sessions, 'difficulty'),
      byEmotionBefore: countBy(sessions, 'emotionBefore'),
      byEmotionAfter: countBy(sessions, 'emotionAfter'),
      avgStrokes: Math.round(sessions.reduce((sum, s) => sum + (s.completedStrokes as number || 0), 0) / sessions.length),
    };

    return NextResponse.json({ date, total: sessions.length, sessions: sessions.slice(0, 20), summary });
  } catch (err) {
    console.error('[/api/analytics/stats] 错误:', err);
    return NextResponse.json({ error: '查询失败', detail: String(err) }, { status: 500 });
  }
}

// ── OSS 工具函数 ─────────────────────────────────────────────────

async function listOssObjects(
  bucket: string, region: string, keyId: string, keySecret: string, prefix: string
): Promise<string[]> {
  const endpoint = `https://${bucket}.${region}.aliyuncs.com/?prefix=${encodeURIComponent(prefix)}`;
  const dateStr = new Date().toUTCString();
  const sign = ossSign('GET', '', '', dateStr, `/${bucket}/`, keySecret);

  const res = await fetch(endpoint, {
    headers: { 'Date': dateStr, 'Authorization': `OSS ${keyId}:${sign}` },
  });

  if (!res.ok) return [];
  const xml = await res.text();
  // 简易 XML 解析 — 提取所有 <Key> 值
  const keys: string[] = [];
  const keyRe = /<Key>([^<]+)<\/Key>/g;
  let m: RegExpExecArray | null;
  while ((m = keyRe.exec(xml)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

async function getOssObject(
  bucket: string, region: string, keyId: string, keySecret: string, key: string
): Promise<string> {
  const endpoint = `https://${bucket}.${region}.aliyuncs.com/${encodeURIComponent(key)}`;
  const dateStr = new Date().toUTCString();
  const sign = ossSign('GET', '', '', dateStr, `/${bucket}/${key}`, keySecret);

  const res = await fetch(endpoint, {
    headers: { 'Date': dateStr, 'Authorization': `OSS ${keyId}:${sign}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function ossSign(method: string, _contentMd5: string, contentType: string, date: string, resource: string, secret: string): string {
  const str = `${method}\n${_contentMd5}\n${contentType}\n${date}\n${resource}`;
  return crypto.createHmac('sha1', secret).update(str).digest('base64');
}

function countBy(arr: Record<string, unknown>[], field: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const val = String(item[field] ?? '未知');
    result[val] = (result[val] || 0) + 1;
  }
  return result;
}

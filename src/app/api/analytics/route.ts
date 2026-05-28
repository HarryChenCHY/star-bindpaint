import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/analytics
 * body: 完整埋点 JSON（含 sessionId 时作为文件名关联键）
 * OSS 未配置时降级为仅返回 ok
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bucket = process.env.OSS_BUCKET;
    const region = process.env.OSS_REGION || 'oss-cn-shanghai';
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;

    if (!bucket || !accessKeyId || !accessKeySecret) {
      console.log('[/api/analytics] OSS 未配置');
      return NextResponse.json({ ok: true, fallback: true, data: body });
    }

    // 如果是渲染更新（有 renderedAt），写为 {sessionId}-render.json，和主文件关联
    const dateIso = new Date().toISOString().slice(0, 10);
    const isRenderUpdate = 'renderedAt' in body && body.sessionId;
    const prefix = isRenderUpdate ? `${body.sessionId}-render` : (body.sessionId || genId());
    const ossPath = `sessions/${dateIso}/${prefix}.json`;
    const contentType = 'application/json';
    const payload = Buffer.from(JSON.stringify(body), 'utf-8');

    const dateStr = new Date().toUTCString();
    const stringToSign = `PUT\n\n${contentType}\n${dateStr}\n/${bucket}/${ossPath}`;
    const signature = crypto
      .createHmac('sha1', accessKeySecret)
      .update(stringToSign)
      .digest('base64');

    const endpoint = `https://${bucket}.${region}.aliyuncs.com/${ossPath}`;
    const uploadRes = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Date': dateStr,
        'Authorization': `OSS ${accessKeyId}:${signature}`,
      },
      body: payload,
    });

    if (!uploadRes.ok) {
      console.error('[/api/analytics] OSS 上传失败:', uploadRes.status);
      return NextResponse.json({ error: '上传失败' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, path: ossPath });
  } catch (err) {
    console.error('[/api/analytics] 错误:', err);
    return NextResponse.json({ ok: false, detail: String(err) }, { status: 500 });
  }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

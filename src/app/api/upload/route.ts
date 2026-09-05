import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_BODY_BYTES = 8_500_000;
const IMAGE_PATTERN = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;
const PARTICIPANT_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f-]{27}|p_[a-z0-9_]{8,40})$/i;

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: '图片过大，请压缩后重试' }, { status: 413 });

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) return NextResponse.json({ error: '图片过大，请压缩后重试' }, { status: 413 });
    let body: { imageBase64?: unknown; participantId?: unknown };
    try { body = JSON.parse(rawBody) as typeof body; } catch { return NextResponse.json({ error: '请求格式无效' }, { status: 400 }); }
    if (typeof body.imageBase64 !== 'string') return NextResponse.json({ error: '缺少图片数据' }, { status: 400 });
    const match = body.imageBase64.match(IMAGE_PATTERN);
    if (!match) return NextResponse.json({ error: '仅支持 PNG、JPEG 或 WebP 图片' }, { status: 415 });

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: '图片大小需在 6 MB 以内' }, { status: 413 });
    }

    const bucket = process.env.OSS_BUCKET;
    const region = process.env.OSS_REGION || 'oss-cn-shanghai';
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
    if (!bucket || !accessKeyId || !accessKeySecret) return NextResponse.json({ fallback: true });

    const participantId = typeof body.participantId === 'string' && PARTICIPANT_PATTERN.test(body.participantId)
      ? body.participantId
      : 'unlinked';
    const contentType = match[1];
    const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
    const fileId = crypto.randomBytes(12).toString('hex');
    const path = `gallery/${participantId}/${date}/${fileId}.${extension}`;
    const dateHeader = new Date().toUTCString();
    const signature = crypto.createHmac('sha1', accessKeySecret)
      .update(`PUT\n\n${contentType}\n${dateHeader}\n/${bucket}/${path}`)
      .digest('base64');
    const endpoint = `https://${bucket}.${region}.aliyuncs.com/${path}`;

    const uploadResponse = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        Date: dateHeader,
        Authorization: `OSS ${accessKeyId}:${signature}`,
      },
      body: buffer,
      signal: AbortSignal.timeout(20_000),
    });
    if (!uploadResponse.ok) {
      console.error('[/api/upload] upstream status:', uploadResponse.status);
      return NextResponse.json({ error: '作品保存服务暂不可用' }, { status: 502 });
    }

    const expires = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
    const signed = crypto.createHmac('sha1', accessKeySecret)
      .update(`GET\n\n\n${expires}\n/${bucket}/${path}`)
      .digest('base64');
    const url = `${endpoint}?OSSAccessKeyId=${encodeURIComponent(accessKeyId)}&Expires=${expires}&Signature=${encodeURIComponent(signed)}`;
    return NextResponse.json({ url, path });
  } catch (error) {
    console.error('[/api/upload] request failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: '作品保存服务暂不可用' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/upload
 * 将 base64 图片上传到阿里云 OSS（无需 SDK，纯 REST API）
 * 返回公开访问 URL
 */
export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: '缺少图片数据' }, { status: 400 });
    }

    const bucket = process.env.OSS_BUCKET;
    const region = process.env.OSS_REGION || 'oss-cn-shanghai';
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;

    if (!bucket || !accessKeyId || !accessKeySecret) {
      // OSS 未配置 → 降级：直接压缩后返回 base64
      return NextResponse.json({ url: imageBase64, fallback: true });
    }

    // 解析 base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const contentType = imageBase64.includes('image/png') ? 'image/png' : 'image/jpeg';
    const ext = contentType === 'image/png' ? 'png' : 'jpg';

    // 生成文件路径
    const date = new Date().toISOString().slice(0, 10);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ossPath = `gallery/${date}/${id}.${ext}`;

    // OSS REST API 签名
    const dateStr = new Date().toUTCString();
    const stringToSign = `PUT\n\n${contentType}\n${dateStr}\n/${bucket}/${ossPath}`;
    const signature = crypto
      .createHmac('sha1', accessKeySecret)
      .update(stringToSign)
      .digest('base64');

    // 上传
    const endpoint = `https://${bucket}.${region}.aliyuncs.com/${ossPath}`;
    const uploadRes = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Date': dateStr,
        'Authorization': `OSS ${accessKeyId}:${signature}`,
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('[/api/upload] OSS 上传失败:', uploadRes.status, errText);
      return NextResponse.json({ error: 'OSS 上传失败', detail: errText }, { status: 502 });
    }

    // 生成带签名的访问 URL（有效期 1 年）
    const expires = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
    const signStr = `GET\n\n\n${expires}\n/${bucket}/${ossPath}`;
    const urlSignature = crypto
      .createHmac('sha1', accessKeySecret)
      .update(signStr)
      .digest('base64');
    const signedUrl = `${endpoint}?OSSAccessKeyId=${encodeURIComponent(accessKeyId)}&Expires=${expires}&Signature=${encodeURIComponent(urlSignature)}`;

    return NextResponse.json({ url: signedUrl, path: ossPath });
  } catch (err) {
    console.error('[/api/upload] 错误:', err);
    return NextResponse.json(
      { error: '上传失败', detail: String(err) },
      { status: 500 }
    );
  }
}

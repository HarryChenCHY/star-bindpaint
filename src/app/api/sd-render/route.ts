import { NextRequest, NextResponse } from 'next/server';

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_BODY_BYTES = 8_500_000;
const IMAGE_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

const STYLE_PROMPTS: Record<string, string> = {
  monet: 'impressionist oil painting, soft light, feathery brushstrokes, atmospheric haze, luminous palette',
  vangogh: 'post-impressionist oil painting, swirling expressive brushstrokes, vivid colors, thick impasto texture',
  gauguin: 'post-impressionist oil painting, large flat areas of bold saturated color, symbolic shapes, vibrant palette',
  rembrandt: 'baroque oil painting, dramatic chiaroscuro lighting, rich dark tones with golden highlights',
  picasso: 'cubist oil painting, geometric abstract forms, multiple perspectives, bold colors, fragmented shapes',
  sargent: 'realist oil painting, elegant fluid brushwork, luminous tones, confident expressive strokes',
};

type RenderResult = { imageBase64: string; style: 'generated'; duration: number };

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: '图片过大，请压缩后重试' }, { status: 413 });

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) return NextResponse.json({ error: '图片过大，请压缩后重试' }, { status: 413 });
    let body: { imageBase64?: unknown; style?: unknown; mode?: unknown; themePrompt?: unknown };
    try { body = JSON.parse(rawBody) as typeof body; } catch { return NextResponse.json({ error: '请求格式无效' }, { status: 400 }); }
    if (typeof body.imageBase64 !== 'string') return NextResponse.json({ error: '缺少图片数据' }, { status: 400 });
    const match = body.imageBase64.match(IMAGE_PATTERN);
    if (!match) return NextResponse.json({ error: '仅支持 PNG、JPEG 或 WebP 图片' }, { status: 415 });
    if (Buffer.from(match[1], 'base64').byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: '图片大小需在 6 MB 以内' }, { status: 413 });
    }

    const style = typeof body.style === 'string' && body.style in STYLE_PROMPTS ? body.style : 'vangogh';
    const themePrompt = typeof body.themePrompt === 'string' ? body.themePrompt.slice(0, 240) : '';
    const mode = body.mode === 'doodle' ? 'doodle' : 'stylization';
    const prompt = themePrompt ? `${themePrompt}, ${STYLE_PROMPTS[style]}` : STYLE_PROMPTS[style];
    const primaryKey = process.env.HUNYUAN_API_KEY;
    const fallbackKey = process.env.DASHSCOPE_API_KEY;

    if (!primaryKey && !fallbackKey) {
      return NextResponse.json({ error: '图像生成服务暂不可用' }, { status: 503 });
    }

    if (primaryKey) {
      const result = await renderWithPrimary(primaryKey, body.imageBase64, prompt);
      if (result) return NextResponse.json(result);
    }
    if (fallbackKey) {
      const result = await renderWithFallback(fallbackKey, body.imageBase64, prompt, Boolean(themePrompt), mode);
      if (result) return NextResponse.json(result);
    }
    return NextResponse.json({ error: '图像生成服务暂不可用，请稍后重试' }, { status: 502 });
  } catch (error) {
    console.error('[/api/sd-render] request failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: '图像生成服务暂不可用' }, { status: 500 });
  }
}

async function renderWithPrimary(apiKey: string, imageBase64: string, prompt: string): Promise<RenderResult | null> {
  const startTime = Date.now();
  try {
    const submitResponse = await fetch('https://tokenhub.tencentmaas.com/v1/api/image/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'hy-image-v3.0',
        prompt: `Use the supplied drawing as the source composition. Preserve its shapes and layout while rendering it as: ${prompt}.`,
        images: [imageBase64],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!submitResponse.ok) {
      console.error('[/api/sd-render] primary submit status:', submitResponse.status);
      return null;
    }
    const submitted = await submitResponse.json();
    const taskId = submitted.id;
    if (typeof taskId !== 'string' || !taskId) return null;

    while (Date.now() - startTime < 60_000) {
      await new Promise(resolve => setTimeout(resolve, 2_000));
      const queryResponse = await fetch('https://tokenhub.tencentmaas.com/v1/api/image/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'hy-image-v3.0', id: taskId }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!queryResponse.ok) continue;
      const result = await queryResponse.json();
      if (result.status === 'failed') return null;
      if (result.status === 'completed' && typeof result.data?.[0]?.url === 'string') {
        const imageBase64Result = await downloadImage(result.data[0].url);
        return imageBase64Result ? { imageBase64: imageBase64Result, style: 'generated', duration: Date.now() - startTime } : null;
      }
    }
    return null;
  } catch (error) {
    console.error('[/api/sd-render] primary failure:', error instanceof Error ? error.name : 'unknown');
    return null;
  }
}

async function renderWithFallback(apiKey: string, imageBase64: string, prompt: string, hasTheme: boolean, mode: string): Promise<RenderResult | null> {
  const startTime = Date.now();
  try {
    const submitResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'X-DashScope-Async': 'enable' },
      body: JSON.stringify({
        model: 'wanx2.1-imageedit',
        input: { prompt, base_image_url: imageBase64, function: hasTheme || mode === 'doodle' ? 'doodle' : 'stylization_all' },
        parameters: { n: 1 },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!submitResponse.ok) {
      console.error('[/api/sd-render] fallback submit status:', submitResponse.status);
      return null;
    }
    const submitted = await submitResponse.json();
    const taskId = submitted.output?.task_id;
    if (typeof taskId !== 'string' || !taskId) return null;

    while (Date.now() - startTime < 60_000) {
      await new Promise(resolve => setTimeout(resolve, 2_000));
      const pollResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!pollResponse.ok) continue;
      const result = await pollResponse.json();
      if (result.output?.task_status === 'FAILED') return null;
      const resultUrl = result.output?.task_status === 'SUCCEEDED' ? result.output?.results?.[0]?.url : null;
      if (typeof resultUrl === 'string') {
        const imageBase64Result = await downloadImage(resultUrl);
        return imageBase64Result ? { imageBase64: imageBase64Result, style: 'generated', duration: Date.now() - startTime } : null;
      }
    }
    return null;
  } catch (error) {
    console.error('[/api/sd-render] fallback failure:', error instanceof Error ? error.name : 'unknown');
    return null;
  }
}

async function downloadImage(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') return null;
  const response = await fetch(parsed, { signal: AbortSignal.timeout(15_000), redirect: 'follow' });
  if (!response.ok) return null;
  const contentType = response.headers.get('content-type') || 'image/png';
  if (!contentType.startsWith('image/')) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0 || buffer.byteLength > 12 * 1024 * 1024) return null;
  return `data:${contentType.split(';')[0]};base64,${buffer.toString('base64')}`;
}

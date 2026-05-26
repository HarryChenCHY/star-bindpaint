import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/sd-render
 * 将用户的简笔画通过 AI 渲染成大师油画风格
 *
 * 优先使用腾讯混元生图（hy-image-v3.0），降级到阿里云百炼（wanx2.1-imageedit）
 */

// 大师风格 prompt 映射
const STYLE_PROMPTS: Record<string, string> = {
  monet: 'impressionism oil painting, Claude Monet style, soft light and color, feathery brushstrokes, atmospheric haze, luminous palette',
  vangogh: 'post-impressionism oil painting, Vincent van Gogh style, swirling expressive brushstrokes, vivid bold colors, thick impasto texture, dynamic energy',
  gauguin: 'post-impressionism oil painting, Paul Gauguin style, large flat areas of bold saturated color, primitive and symbolic, tropical vibrant palette',
  rembrandt: 'baroque oil painting, Rembrandt style, dramatic chiaroscuro lighting, rich dark tones with golden highlights, deep shadows',
  picasso: 'cubism oil painting, Pablo Picasso style, geometric abstract forms, multiple perspectives, bold colors, fragmented shapes',
  sargent: 'realism oil painting, John Singer Sargent style, elegant fluid brushwork, luminous tones, confident expressive strokes',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, style = 'vangogh', mode = 'stylization', themePrompt = '' } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: '缺少图片数据' }, { status: 400 });
    }

    const hunyuanKey = process.env.HUNYUAN_API_KEY;
    const dashscopeKey = process.env.DASHSCOPE_API_KEY;
    console.log('[sd-render] HUNYUAN_API_KEY:', hunyuanKey ? `${hunyuanKey.slice(0, 10)}...` : '未设置');
    console.log('[sd-render] DASHSCOPE_API_KEY:', dashscopeKey ? `${dashscopeKey.slice(0, 10)}...` : '未设置');

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.vangogh;
    const finalPrompt = themePrompt ? `${themePrompt}, ${stylePrompt}` : stylePrompt;

    if (!hunyuanKey && !dashscopeKey) {
      return NextResponse.json({ error: 'API Key 未配置，请在 .env.local 中设置 HUNYUAN_API_KEY 或 DASHSCOPE_API_KEY' }, { status: 500 });
    }

    // 优先使用腾讯混元生图
    if (hunyuanKey) {
      console.log('[sd-render] 尝试腾讯混元...');
      const result = await renderWithHunyuan(hunyuanKey, imageBase64, finalPrompt);
      if (result) return NextResponse.json(result);
      console.log('[sd-render] 腾讯混元失败，降级到百炼');
    }

    // 降级：阿里云百炼
    if (dashscopeKey) {
      console.log('[sd-render] 尝试阿里百炼...');
      const result = await renderWithDashScope(dashscopeKey, imageBase64, finalPrompt, themePrompt, mode);
      if (result) return NextResponse.json(result);
      console.log('[sd-render] 阿里百炼也失败了');
    }

    return NextResponse.json({ error: '所有 AI 服务调用失败，请检查 API Key 是否正确或网络是否可达' }, { status: 500 });
  } catch (err) {
    console.error('[/api/sd-render] 错误:', err);
    return NextResponse.json({ error: '服务端错误', detail: String(err) }, { status: 500 });
  }
}

// ── 腾讯混元生图 ──────────────────────────────────────────────────

async function renderWithHunyuan(apiKey: string, imageBase64: string, prompt: string): Promise<{ imageBase64: string; style: string; duration: number } | null> {
  const startTime = Date.now();

  // 将 base64 图片转为可访问的 data URL（混元支持 base64 data URI）
  const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;

  try {
    // Step 1: 提交生图任务（图生图模式：传入用户画作作为参考）
    const submitRes = await fetch('https://tokenhub.tencentmaas.com/v1/api/image/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'hy-image-v3.0',
        prompt: `Based on this sketch/drawing, render it as: ${prompt}. Keep the composition, shapes and layout of the original drawing intact, only apply artistic style.`,
        images: [imageUrl],
      }),
    });

    if (!submitRes.ok) {
      console.error('[Hunyuan Image] 提交失败:', await submitRes.text());
      return null;
    }

    const submitData = await submitRes.json();
    const taskId = submitData.id;
    if (!taskId) return null;

    // Step 2: 轮询结果（最多 60 秒）
    const maxWait = 60000;
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const queryRes = await fetch('https://tokenhub.tencentmaas.com/v1/api/image/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: 'hy-image-v3.0', id: taskId }),
      });

      if (!queryRes.ok) continue;

      const queryData = await queryRes.json();
      if (queryData.status === 'completed' && queryData.data?.[0]?.url) {
        // 下载图片并转为 base64
        const imgRes = await fetch(queryData.data[0].url);
        const imgBuffer = await imgRes.arrayBuffer();
        const imgBase64 = `data:image/png;base64,${Buffer.from(imgBuffer).toString('base64')}`;

        return {
          imageBase64: imgBase64,
          style: 'hunyuan',
          duration: Date.now() - startTime,
        };
      }

      if (queryData.status === 'failed') {
        console.error('[Hunyuan Image] 生成失败:', queryData);
        return null;
      }
    }

    return null; // 超时
  } catch (err) {
    console.error('[Hunyuan Image] 错误:', err);
    return null;
  }
}

// ── 阿里云百炼降级 ────────────────────────────────────────────────

async function renderWithDashScope(apiKey: string, imageBase64: string, finalPrompt: string, themePrompt: string, mode: string): Promise<{ imageBase64: string; style: string; duration: number } | null> {
  const startTime = Date.now();
  const functionType = themePrompt ? 'doodle' : (mode === 'doodle' ? 'doodle' : 'stylization_all');
  const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;

  try {
    const submitRes = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wanx2.1-imageedit',
        input: { prompt: finalPrompt, base_image_url: imageUrl, function: functionType },
        parameters: { n: 1 },
      }),
    });

    if (!submitRes.ok) return null;

    const submitData = await submitRes.json();
    const taskId = submitData.output?.task_id;
    if (!taskId) return null;

    // 轮询
    const maxWait = 60000;
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const pollRes = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();

      if (pollData.output?.task_status === 'SUCCEEDED') {
        const resultUrl = pollData.output?.results?.[0]?.url;
        if (!resultUrl) return null;

        const imgRes = await fetch(resultUrl);
        const imgBuffer = await imgRes.arrayBuffer();
        const imgBase64 = `data:image/png;base64,${Buffer.from(imgBuffer).toString('base64')}`;

        return { imageBase64: imgBase64, style: 'dashscope', duration: Date.now() - startTime };
      }

      if (pollData.output?.task_status === 'FAILED') return null;
    }

    return null;
  } catch {
    return null;
  }
}

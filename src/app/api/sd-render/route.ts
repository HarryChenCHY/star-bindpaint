import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/sd-render
 * 将用户的简笔画/涂鸦通过 AI 渲染成大师油画风格
 *
 * 使用 DashScope wanx2.1-imageedit 的两种模式：
 * - stylization_all: 全图风格迁移（保留结构，改变风格）
 * - doodle: 涂鸦转完整图（简笔画→油画）
 */

// 大师风格 prompt 映射
const STYLE_PROMPTS: Record<string, string> = {
  monet: 'impressionism oil painting, Claude Monet style, soft light and color, feathery brushstrokes, atmospheric haze, luminous palette, water reflections',
  vangogh: 'post-impressionism oil painting, Vincent van Gogh style, swirling expressive brushstrokes, vivid bold colors, thick impasto texture, dynamic energy, starry night palette',
  gauguin: 'post-impressionism oil painting, Paul Gauguin style, large flat areas of bold saturated color, primitive and symbolic, tropical vibrant palette, strong outlines',
  rembrandt: 'baroque oil painting, Rembrandt style, dramatic chiaroscuro lighting, rich dark tones with golden highlights, deep shadows, masterful light and dark contrast',
  picasso: 'cubism oil painting, Pablo Picasso style, geometric abstract forms, multiple perspectives simultaneously, bold colors, fragmented shapes, artistic deconstruction',
  sargent: 'realism oil painting, John Singer Sargent style, elegant fluid brushwork, luminous skin tones, dramatic portraiture lighting, confident expressive strokes',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, style = 'vangogh', mode = 'stylization', themePrompt = '' } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: '缺少图片数据' }, { status: 400 });
    }

    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key 未配置' }, { status: 500 });
    }

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.vangogh;

    // 组合 prompt：主题内容（如果有）+ 大师风格（始终注入）
    const finalPrompt = themePrompt
      ? `${themePrompt}, ${stylePrompt}`
      : stylePrompt;

    // 模式选择：
    // - 有主题 prompt（用户画的是简笔画）→ 用 doodle 模式（AI 根据草图重新生成完整画作）
    // - 无主题（纯风格化）→ 用 stylization_all（保留原图结构，改变风格）
    const functionType = themePrompt ? 'doodle' : (mode === 'doodle' ? 'doodle' : 'stylization_all');
    const imageUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

    // Step 1: 提交任务
    const submitRes = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wanx2.1-imageedit',
        input: {
          prompt: finalPrompt,
          base_image_url: imageUrl,
          function: functionType,
        },
        parameters: { n: 1 },
      }),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      console.error('[/api/sd-render] 提交任务失败:', errText);
      return NextResponse.json({ error: '提交渲染任务失败', detail: errText }, { status: 502 });
    }

    const submitData = await submitRes.json();
    const taskId = submitData.output?.task_id;

    if (!taskId) {
      return NextResponse.json({ error: '未获取到任务 ID', detail: JSON.stringify(submitData) }, { status: 502 });
    }

    // Step 2: 轮询等待结果（最多 60 秒）
    const maxWait = 60000;
    const pollInterval = 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const pollRes = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();
      const status = pollData.output?.task_status;

      if (status === 'SUCCEEDED') {
        const resultUrl = pollData.output?.results?.[0]?.url;
        if (!resultUrl) {
          return NextResponse.json({ error: '渲染成功但未获取到图片 URL' }, { status: 502 });
        }

        // 下载图片并转为 base64 返回给前端
        const imgRes = await fetch(resultUrl);
        const imgBuffer = await imgRes.arrayBuffer();
        const imgBase64 = `data:image/png;base64,${Buffer.from(imgBuffer).toString('base64')}`;

        return NextResponse.json({
          imageBase64: imgBase64,
          style,
          mode: functionType,
          duration: Date.now() - startTime,
        });
      }

      if (status === 'FAILED') {
        const errMsg = pollData.output?.message || '渲染失败';
        console.error('[/api/sd-render] 任务失败:', errMsg);
        return NextResponse.json({ error: `渲染失败: ${errMsg}` }, { status: 502 });
      }
      // PENDING 或 RUNNING 继续轮询
    }

    return NextResponse.json({ error: '渲染超时（超过60秒）' }, { status: 504 });
  } catch (err) {
    console.error('[/api/sd-render] 错误:', err);
    return NextResponse.json({ error: '服务端错误', detail: String(err) }, { status: 500 });
  }
}

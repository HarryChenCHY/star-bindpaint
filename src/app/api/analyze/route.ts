import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/analyze
 * 接收绘画 session 数据，调用腾讯混元大模型生成疗愈观察报告
 * 降级：如果混元不可用，fallback 到阿里云百炼
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, imageBase64 } = body;

    if (!prompt) {
      return NextResponse.json({ error: '缺少 prompt' }, { status: 400 });
    }

    // 构造消息：文本 + 图片（多模态，OpenAI 兼容格式）
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];

    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`,
            },
          },
        ],
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    // 优先使用腾讯混元
    const hunyuanKey = process.env.HUNYUAN_API_KEY;
    const dashscopeKey = process.env.DASHSCOPE_API_KEY;

    let response: Response;

    if (hunyuanKey) {
      // 腾讯混元（TokenHub OpenAI 兼容接口）
      response = await fetch('https://tokenhub.tencentmaas.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hunyuanKey}`,
        },
        body: JSON.stringify({
          model: imageBase64 ? 'hunyuan-vision' : 'hy3-preview',
          messages,
          max_tokens: 1024,
          temperature: 0.7,
          stream: false,
        }),
      });

      // 如果混元失败且有 dashscope key，降级
      if (!response.ok && dashscopeKey) {
        console.warn('[/api/analyze] 混元失败，降级到百炼');
        response = await callDashScope(dashscopeKey, messages, imageBase64);
      }
    } else if (dashscopeKey) {
      // 降级：阿里云百炼
      response = await callDashScope(dashscopeKey, messages, imageBase64);
    } else {
      return NextResponse.json({ error: 'API Key 未配置（HUNYUAN_API_KEY 或 DASHSCOPE_API_KEY）' }, { status: 500 });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('[/api/analyze] API 错误:', response.status, errText);
      return NextResponse.json(
        { error: `LLM API 调用失败: ${response.status}`, detail: errText },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '未能生成分析报告';

    return NextResponse.json({
      report: content,
      model: data.model || 'unknown',
      usage: data.usage,
    });
  } catch (err) {
    console.error('[/api/analyze] 错误:', err);
    return NextResponse.json(
      { error: '服务端错误', detail: String(err) },
      { status: 500 }
    );
  }
}

// 阿里云百炼降级调用
async function callDashScope(apiKey: string, messages: unknown[], hasImage: boolean): Promise<Response> {
  // 百炼需要特定的消息格式
  return fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: hasImage ? 'qwen-vl-plus' : 'qwen-turbo',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });
}

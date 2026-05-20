import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/analyze
 * 接收绘画 session 数据，调用阿里云百炼（通义千问 VL）生成观察报告
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, imageBase64 } = body;

    if (!prompt) {
      return NextResponse.json({ error: '缺少 prompt' }, { status: 400 });
    }

    // 构造消息：文本 + 图片（多模态）
    const messages: Array<{ role: string; content: Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
        ],
      },
    ];

    // 如果有画作图片，加入多模态内容
    if (imageBase64) {
      messages[0].content.push({
        type: 'image_url',
        image_url: {
          url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`,
        },
      });
    }

    // 调用阿里云百炼 OpenAI 兼容接口
    const apiKey = process.env.DASHSCOPE_API_KEY;

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[/api/analyze] 百炼 API 错误:', response.status, errText);
      return NextResponse.json(
        { error: `LLM API 调用失败: ${response.status}`, detail: errText },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '未能生成分析报告';

    return NextResponse.json({
      report: content,
      model: data.model,
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

import { NextRequest, NextResponse } from 'next/server';

type MetricInput = {
  mode?: unknown;
  guidanceLevel?: unknown;
  totalStrokes?: unknown;
  userStrokes?: unknown;
  aiAssistedStrokes?: unknown;
  skippedStrokes?: unknown;
  completionRate?: unknown;
  manualContributionRate?: unknown;
  aiAssistanceRate?: unknown;
  firstStrokeLatencySec?: unknown;
  averageWaitSec?: unknown;
  durationSec?: unknown;
};

function numberOrNull(value: unknown, minimum = 0, maximum = 1_000_000): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : null;
}

function normalizeMetrics(input: MetricInput) {
  return {
    mode: ['follow', 'auto', 'free'].includes(String(input.mode)) ? String(input.mode) : 'follow',
    guidanceLevel: ['full', 'balanced', 'light'].includes(String(input.guidanceLevel)) ? String(input.guidanceLevel) : 'full',
    totalStrokes: numberOrNull(input.totalStrokes, 0, 100_000) ?? 0,
    userStrokes: numberOrNull(input.userStrokes, 0, 100_000) ?? 0,
    aiAssistedStrokes: numberOrNull(input.aiAssistedStrokes, 0, 100_000) ?? 0,
    skippedStrokes: numberOrNull(input.skippedStrokes, 0, 100_000) ?? 0,
    completionRate: numberOrNull(input.completionRate, 0, 100),
    manualContributionRate: numberOrNull(input.manualContributionRate, 0, 100),
    aiAssistanceRate: numberOrNull(input.aiAssistanceRate, 0, 100),
    firstStrokeLatencySec: numberOrNull(input.firstStrokeLatencySec, 0, 86_400),
    averageWaitSec: numberOrNull(input.averageWaitSec, 0, 86_400),
    durationSec: numberOrNull(input.durationSec, 0, 86_400) ?? 0,
  };
}

function buildPrompt(work: string, metrics: ReturnType<typeof normalizeMetrics>) {
  return `你是“月亮伙伴”，请把以下一次绘画交互数据写成 3—4 句简洁中文学习反馈，并给出 1 条下一次可执行的小建议。

必须遵守：只解释提供的数据；不推断主观状态、性格、天赋或健康状况；不使用医疗化或心理改善表述；不宣称产品带来因果效果；不把完成率或贴合度说成能力评分；不提及任何机构、团队、模型或厂商。

作品：${work}
模式：${metrics.mode}
引导等级：${metrics.guidanceLevel}
练习时长：${metrics.durationSec.toFixed(0)} 秒
首次动笔时延：${metrics.firstStrokeLatencySec === null ? '未记录' : `${metrics.firstStrokeLatencySec.toFixed(1)} 秒`}
规划笔触：${metrics.totalStrokes}
亲手笔触：${metrics.userStrokes}
AI 辅助笔触：${metrics.aiAssistedStrokes}
跳过笔触：${metrics.skippedStrokes}
内容覆盖率：${metrics.completionRate === null ? '不适用' : `${metrics.completionRate.toFixed(1)}%`}
亲手完成率：${metrics.manualContributionRate === null ? '不适用' : `${metrics.manualContributionRate.toFixed(1)}%`}
AI 辅助率：${metrics.aiAssistanceRate === null ? '不适用' : `${metrics.aiAssistanceRate.toFixed(1)}%`}
平均笔间停留：${metrics.averageWaitSec === null ? '未记录' : `${metrics.averageWaitSec.toFixed(1)} 秒`}`;
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 16_384) {
      return NextResponse.json({ error: '请求内容过大' }, { status: 413 });
    }

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, 'utf8') > 16_384) return NextResponse.json({ error: '请求内容过大' }, { status: 413 });
    let body: { metrics?: MetricInput; work?: unknown };
    try { body = JSON.parse(rawBody) as typeof body; } catch { return NextResponse.json({ error: '请求格式无效' }, { status: 400 }); }
    if (!body.metrics || typeof body.metrics !== 'object') {
      return NextResponse.json({ error: '缺少学习指标' }, { status: 400 });
    }

    const metrics = normalizeMetrics(body.metrics);
    const work = typeof body.work === 'string' ? body.work.slice(0, 120) : '本次绘画练习';
    const prompt = buildPrompt(work, metrics);
    const messages = [{ role: 'user', content: prompt }];
    const primaryKey = process.env.HUNYUAN_API_KEY;
    const fallbackKey = process.env.DASHSCOPE_API_KEY;

    if (!primaryKey && !fallbackKey) {
      return NextResponse.json({ error: '文字生成服务暂不可用' }, { status: 503 });
    }

    let response: Response;
    if (primaryKey) {
      response = await fetch('https://tokenhub.tencentmaas.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${primaryKey}` },
        body: JSON.stringify({ model: 'hy3-preview', messages, max_tokens: 600, temperature: 0.45, stream: false }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok && fallbackKey) response = await callFallback(fallbackKey, messages);
    } else {
      response = await callFallback(fallbackKey!, messages);
    }

    if (!response.ok) {
      console.error('[/api/analyze] upstream status:', response.status);
      return NextResponse.json({ error: '文字生成服务暂不可用' }, { status: 502 });
    }

    const data = await response.json();
    const report = String(data.choices?.[0]?.message?.content || '').trim().slice(0, 1_500);
    if (!report) return NextResponse.json({ error: '未生成有效反馈' }, { status: 502 });

    return NextResponse.json({ schemaVersion: 2, report, generatedBy: 'ai' });
  } catch (error) {
    console.error('[/api/analyze] request failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: '文字生成服务暂不可用' }, { status: 500 });
  }
}

async function callFallback(apiKey: string, messages: Array<{ role: string; content: string }>): Promise<Response> {
  return fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'qwen-turbo', messages, max_tokens: 600, temperature: 0.45 }),
    signal: AbortSignal.timeout(15_000),
  });
}

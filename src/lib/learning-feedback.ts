import type { PaintingSession, StrokeRecord } from '@/lib/painting-tracker';

export type ResearchMetricKey =
  | 'firstStrokeLatencySec'
  | 'manualContributionRate'
  | 'aiAssistanceRate'
  | 'completionRate'
  | 'durationSec'
  | 'practiceFrequency';

export interface LearningMetrics {
  totalStrokes: number;
  userStrokes: number;
  aiAssistedStrokes: number;
  skippedStrokes: number;
  accountedStrokes: number;
  completionRate: number | null;
  manualContributionRate: number | null;
  aiAssistanceRate: number | null;
  firstStrokeLatencySec: number | null;
  averageWaitSec: number | null;
  averageDrawSec: number | null;
  durationSec: number;
  mode: PaintingSession['mode'];
  guidanceLevel: PaintingSession['guidanceLevel'];
}

export interface LocalLearningFeedback {
  eyebrow: string;
  headline: string;
  observations: string[];
  nextStep: string;
}

export const RESEARCH_METRIC_DEFINITIONS: Array<{
  key: ResearchMetricKey;
  label: string;
  definition: string;
  role: '核心结果' | '过程指标' | '控制变量';
}> = [
  {
    key: 'firstStrokeLatencySec',
    label: '首次动笔时延',
    definition: '进入可绘画状态到第一次在画布输入之间的秒数，用于观察启动绘画的阻力。',
    role: '核心结果',
  },
  {
    key: 'practiceFrequency',
    label: '动笔频次',
    definition: '按匿名会话记录的练习次数、活跃日期与连续练习天数，用于观察持续使用变化。',
    role: '核心结果',
  },
  {
    key: 'manualContributionRate',
    label: '亲手完成率',
    definition: '用户亲手完成笔触数 ÷ 规划总笔触数，用于区分用户练习与 AI 代画。',
    role: '过程指标',
  },
  {
    key: 'aiAssistanceRate',
    label: 'AI 辅助率',
    definition: 'AI 自动补全笔触数 ÷ 规划总笔触数，用于记录本次练习的辅助强度。',
    role: '控制变量',
  },
  {
    key: 'completionRate',
    label: '作品完成率',
    definition: '已完成与 AI 辅助笔触数 ÷ 规划总笔触数，只表示流程进度，不评价绘画能力。',
    role: '过程指标',
  },
  {
    key: 'durationSec',
    label: '单次练习时长',
    definition: '从星迹准备完成到保存作品的总时长，用于描述参与过程。',
    role: '过程指标',
  },
];

function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function validUserStrokes(strokes: StrokeRecord[] | undefined): StrokeRecord[] {
  return Array.isArray(strokes)
    ? strokes.filter(stroke => !stroke.skipped && !stroke.autoBatched)
    : [];
}

export function deriveLearningMetrics(session: PaintingSession): LearningMetrics {
  const totalStrokes = Math.max(0, finiteNumber(session.totalStrokes));
  const userStrokes = Math.max(0, finiteNumber(session.completedStrokes));
  const aiAssistedStrokes = Math.max(0, finiteNumber(session.batchedStrokes));
  const skippedStrokes = Math.max(0, finiteNumber(session.skippedStrokes));
  const accountedStrokes = Math.min(
    totalStrokes || userStrokes + aiAssistedStrokes,
    userStrokes + aiAssistedStrokes,
  );
  const denominator = totalStrokes > 0 ? totalStrokes : null;
  const strokes = validUserStrokes(session.strokes);
  const waitValues = strokes.map(stroke => Math.max(0, finiteNumber(stroke.waitTimeMs)) / 1000);
  const drawValues = strokes.map(stroke => Math.max(0, finiteNumber(stroke.drawDurationMs)) / 1000);

  const firstInputAt = finiteNumber(session.firstInputAt);
  const startTime = finiteNumber(session.startTime);
  const fallbackFirstStroke = strokes.length > 0
    ? finiteNumber(strokes[0].timestamp) - finiteNumber(strokes[0].drawDurationMs)
    : 0;
  const firstTimestamp = firstInputAt > 0 ? firstInputAt : fallbackFirstStroke;
  const firstStrokeLatencySec = startTime > 0 && firstTimestamp >= startTime
    ? (firstTimestamp - startTime) / 1000
    : null;

  const endTime = finiteNumber(session.endTime) || Date.now();
  const durationSec = startTime > 0 ? Math.max(0, (endTime - startTime) / 1000) : 0;

  return {
    totalStrokes,
    userStrokes,
    aiAssistedStrokes,
    skippedStrokes,
    accountedStrokes,
    completionRate: denominator ? Math.min(100, accountedStrokes / denominator * 100) : null,
    manualContributionRate: denominator
      ? Math.min(100, userStrokes / denominator * 100)
      : userStrokes > 0 ? 100 : null,
    aiAssistanceRate: denominator ? Math.min(100, aiAssistedStrokes / denominator * 100) : null,
    firstStrokeLatencySec,
    averageWaitSec: mean(waitValues),
    averageDrawSec: mean(drawValues),
    durationSec,
    mode: session.mode || 'follow',
    guidanceLevel: session.guidanceLevel || 'full',
  };
}

function rounded(value: number | null): number {
  return Math.round(value ?? 0);
}

export function buildLocalLearningFeedback(metrics: LearningMetrics): LocalLearningFeedback {
  if (metrics.mode === 'free') {
    return {
      eyebrow: '自由星域记录',
      headline: `你用 ${metrics.userStrokes} 次画布输入完成了这次自由创作`,
      observations: [
        metrics.firstStrokeLatencySec === null
          ? '本次没有记录到首次动笔时延。'
          : `从画布准备好到第一次动笔用了 ${rounded(metrics.firstStrokeLatencySec)} 秒。`,
        `这次创作持续约 ${Math.max(1, Math.round(metrics.durationSec / 60))} 分钟，作品已进入你的星图。`,
      ],
      nextStep: '下一次可以先定一个很小的目标，例如只画轮廓或只尝试一种笔触，让开始更轻松。',
    };
  }

  const manualRate = rounded(metrics.manualContributionRate);
  const aiRate = rounded(metrics.aiAssistanceRate);
  const observations = [
    metrics.firstStrokeLatencySec === null
      ? '本次没有记录到首次动笔时延。'
      : `从星迹准备好到第一次动笔用了 ${rounded(metrics.firstStrokeLatencySec)} 秒。`,
    `你亲手完成 ${metrics.userStrokes} 条星迹，占规划笔触的 ${manualRate}%；AI 辅助完成 ${metrics.aiAssistedStrokes} 条，占 ${aiRate}%。`,
  ];

  if (metrics.averageWaitSec !== null && metrics.userStrokes > 1) {
    observations.push(`每条星迹之间平均停留 ${metrics.averageWaitSec.toFixed(1)} 秒，这是本次练习节奏的客观记录。`);
  }

  let nextStep = '下一次保持当前引导等级，再亲手多完成 3 条星迹，观察开始是否比这次更顺畅。';
  if (manualRate >= 75) {
    nextStep = '下一次可以把引导调低一级，尝试在更少提示下完成相近题材。';
  } else if (aiRate >= 70) {
    nextStep = '下一次先设定“亲手完成前 5 条星迹”的小目标，再决定是否请月亮伙伴续画。';
  }

  return {
    eyebrow: '本次星迹反馈',
    headline: metrics.completionRate === null
      ? '你完成了一次绘画练习'
      : `这幅作品已完成 ${rounded(metrics.completionRate)}%`,
    observations,
    nextStep,
  };
}

export function buildLearningFeedbackPrompt(session: PaintingSession, metrics = deriveLearningMetrics(session)): string {
  const work = session.masterwork
    ? `${session.masterwork.artist}《${session.masterwork.title}》`
    : session.isCustomUpload ? '用户自选参考图' : '自由创作';

  return `你是“月亮伙伴”，负责为零基础绘画学习者解释一次绘画练习的数据。请写 3—4 句简洁中文反馈，再给出 1 条下一次可执行的小建议。

严格规则：
- 只描述提供的数据，不推断主观状态、性格、天赋或健康状况。
- 不使用医疗化或心理改善表述，不声称产品造成了某种效果。
- 完成率与匹配数据只代表本次交互过程，不是绘画能力评分。
- 语气平等、具体，面向零基础成人与青少年，不使用幼儿化称呼。
- 不提及任何模型、学校、团队或厂商名称。

练习数据：
- 作品：${work}
- 模式：${metrics.mode}
- 引导等级：${metrics.guidanceLevel || '未记录'}
- 总时长：${Math.round(metrics.durationSec)} 秒
- 首次动笔时延：${metrics.firstStrokeLatencySec === null ? '未记录' : `${metrics.firstStrokeLatencySec.toFixed(1)} 秒`}
- 规划笔触：${metrics.totalStrokes}
- 亲手完成：${metrics.userStrokes}
- AI 辅助：${metrics.aiAssistedStrokes}
- 跳过：${metrics.skippedStrokes}
- 作品完成率：${metrics.completionRate === null ? '不适用' : `${metrics.completionRate.toFixed(1)}%`}
- 亲手完成率：${metrics.manualContributionRate === null ? '不适用' : `${metrics.manualContributionRate.toFixed(1)}%`}
- 平均笔间停留：${metrics.averageWaitSec === null ? '未记录' : `${metrics.averageWaitSec.toFixed(1)} 秒`}`;
}

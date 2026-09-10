export const PROTOCOL = {
  version: 'novice-paired-1.0',
  appVersion: '0.2.0-study-preview',
  schemaVersion: 1,
  metricsVersion: 'paired-metrics-1',
  questionnaireVersion: 'brief-1',
  rubricVersion: 'plant-1',
  analysisVersion: 'paired-sign-1',
  timeLimitMs: 720_000,
  restMs: 120_000,
  practiceMs: 90_000,
  idleThresholdMs: 5_000,
  validLengthRatio: 0.005,
  maxStrokes: 200,
  targetStrokes: 180,
  targetPairs: 24,
  maxParticipants: 30,
  qualificationScore: 80,
  consentVersion: 'research-1',
  retentionDays: 365,
  analysis:
    '完成度和意愿采用预设双侧精确符号检验（比较差值方向，平分单列），两项 Holm 校正；平均差仅作描述。',
} as const;

export type Condition = 'control' | 'guided';
export type Phase = 'outline' | 'large_color' | 'small_color';
export type EndReason =
  | 'submitted'
  | 'timeout'
  | 'withdrawn'
  | 'technical_error';
export type Answers = Record<string, number | null>;
export interface StudyEvent {
  seq: number;
  type: string;
  offsetMs: number;
  clientAt: string;
  payload: Record<string, string | number | boolean | null>;
}
export interface PlannedStroke {
  id: string;
  phase: Phase;
  regionId: number;
  color: string;
  width: number;
  points: { x: number; y: number }[];
}
export interface StrokePlan {
  version: string;
  width: number;
  height: number;
  strokes: PlannedStroke[];
  quality: {
    coverage: number;
    regions: number;
    simplified: boolean;
    notes: string[];
  };
}
export const PHASE_LABEL: Record<Phase, string> = {
  outline: '轮廓',
  large_color: '大色块',
  small_color: '小色块',
};
export const QUESTIONS = [
  { id: 'willingness', text: '如果接下来有空闲时间，我愿意再画一张图。' },
  { id: 'concern', text: '想到再画一张图，我担心自己画不好。' },
  { id: 'satisfaction', text: '我对刚才这次绘画体验感到满足。' },
  { id: 'confidence', text: '我觉得自己能够完成类似的绘画任务。' },
] as const;
export const INTERVIEW = [
  '哪种方式更容易开始，为什么？',
  '过程中最想停下来的时刻是什么？',
  '哪一幅更让你有“这是我画的”的感觉，为什么？',
];
export const RUBRIC = [
  '盆栽主体可辨认',
  '花盆外形完整',
  '盆口有所呈现',
  '主茎连接花盆与叶片',
  '左侧叶片有所呈现',
  '右侧叶片有所呈现',
  '顶部叶片有所呈现',
  '叶片绿色区域',
  '花盆暖色区域',
  '桌面与主体位置关系',
];
export const CAPABILITIES = {
  control: {
    guide: false,
    autoPaint: false,
    replaceStroke: false,
    tools: ['brush', 'eraser', 'undo', 'redo', 'layers'],
  },
  guided: {
    guide: true,
    autoPaint: false,
    replaceStroke: false,
    tools: ['brush', 'eraser', 'undo', 'redo', 'layers'],
  },
} as const;
export function conditionAt(order: 'AB' | 'BA', period: number): Condition {
  return (order === 'AB') === (period === 1) ? 'control' : 'guided';
}
export function assertAnswers(
  value: unknown,
  post: boolean,
): asserts value is Answers {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('问卷格式无效');
  const obj = value as Answers;
  const keys = QUESTIONS.slice(0, post ? 4 : 2).map((q) => q.id);
  if (
    Object.keys(obj).length !== keys.length ||
    keys.some(
      (k) =>
        !(k in obj) ||
        (obj[k] !== null &&
          (!Number.isInteger(obj[k]) || obj[k]! < 1 || obj[k]! > 7)),
    )
  )
    throw new Error('请逐项作答或选择不回答');
}

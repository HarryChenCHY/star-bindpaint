import { STROKE_CONFIG } from '../stroke-config';
export const PROTOCOL = {
  version: 'novice-paired-2.0',
  appVersion: '0.3.0-study-imi-sus',
  schemaVersion: 2,
  metricsVersion: 'paired-metrics-2',
  questionnaireVersion: 'paired-imi22-sus10-1',
  rubricVersion: 'plant-1',
  analysisVersion: 'paired-sign-1',
  timeLimitMs: 720_000,
  restMs: 120_000,
  practiceMs: 90_000,
  idleThresholdMs: 5_000,
  validLengthRatio: 0.005,
  maxStrokes: STROKE_CONFIG.maxBudget,
  targetStrokes: STROKE_CONFIG.defaultBudget,
  targetPairs: 24,
  maxParticipants: 30,
  qualificationScore: 80,
  consentVersion: 'research-information-2',
  retentionDays: 365,
  analysis:
    '共同主要结局为作品完成度与创作满足感，采用预设双侧精确符号检验（比较同一人的指导条件−自由绘画条件，平分单列），两项 Holm 校正；IMI、SUS、再次绘画意愿和行为过程指标为次要/探索性结局，平均差仅作描述。',
} as const;

export const STUDY_IDS = {
  pilot: 'novice-pilot-v2',
  formal: 'novice-formal-v2',
  legacyPilot: 'novice-pilot-v1',
  legacyFormal: 'novice-formal-v1',
} as const;

export type Condition = 'control' | 'guided';
export type Phase = 'outline' | 'large_color' | 'small_color' | 'paint';
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
  paint: '笔触绘画',
  outline: '轮廓',
  large_color: '大色块',
  small_color: '小色块',
};
export interface QuestionnaireItem {
  id: string;
  text: string;
  min: 1;
  max: 5 | 7;
  reverse?: boolean;
  subscale?: 'interestEnjoyment' | 'perceivedCompetence' | 'perceivedChoice' | 'pressureTension';
}

export const PRE_QUESTIONS: readonly QuestionnaireItem[] = [
  { id: 'willingness', text: '如果接下来有空闲时间，我愿意再画一张图。' },
  { id: 'concern', text: '想到再画一张图，我担心自己画不好。' },
] .map((item) => ({ ...item, min: 1 as const, max: 7 as const }));

export const OUTCOME_QUESTIONS: readonly QuestionnaireItem[] = [
  ...PRE_QUESTIONS,
  { id: 'satisfaction', text: '我对刚才这次绘画体验感到满足。' },
  { id: 'confidence', text: '我觉得自己能够完成类似的绘画任务。' },
  { id: 'ownership', text: '我觉得刚才完成的作品是由我亲手创作出来的。' },
].map((item) => ({ ...item, min: 1 as const, max: 7 as const }));

const imi = (
  number: number,
  text: string,
  subscale: NonNullable<QuestionnaireItem['subscale']>,
  reverse = false,
): QuestionnaireItem => ({
  id: `imi${String(number).padStart(2, '0')}`,
  text,
  min: 1,
  max: 7,
  subscale,
  reverse,
});

/** 参考论文附录采用的 22 项 IMI：兴趣/享受、感知能力、感知选择、压力/紧张。 */
export const IMI_QUESTIONS = [
  imi(1, '做这项绘画任务时，我一直在想自己有多喜欢它。', 'interestEnjoyment'),
  imi(2, '做这项绘画任务时，我一点也不紧张。', 'pressureTension', true),
  imi(3, '我觉得做这项绘画任务是我自己的选择。', 'perceivedChoice'),
  imi(4, '我认为自己很擅长这项绘画任务。', 'perceivedCompetence'),
  imi(5, '我觉得这项绘画任务非常有趣。', 'interestEnjoyment'),
  imi(6, '做这项绘画任务时，我感到很紧张。', 'pressureTension'),
  imi(7, '与其他绘画初学者相比，我觉得自己完成得不错。', 'perceivedCompetence'),
  imi(8, '完成这项绘画任务的过程很有趣。', 'interestEnjoyment'),
  imi(9, '做这项绘画任务时，我感到很放松。', 'pressureTension', true),
  imi(10, '我非常喜欢做这项绘画任务。', 'interestEnjoyment'),
  imi(11, '我对是否做这项绘画任务没有什么选择。', 'perceivedChoice', true),
  imi(12, '我对自己在这项绘画任务中的表现感到满意。', 'perceivedCompetence'),
  imi(13, '做这项绘画任务时，我感到焦虑。', 'pressureTension'),
  imi(14, '我认为这项绘画任务非常无聊。', 'interestEnjoyment', true),
  imi(15, '做任务时，我觉得自己正在做想做的事。', 'perceivedChoice'),
  imi(16, '我觉得自己已经能够熟练应对这项绘画任务。', 'perceivedCompetence'),
  imi(17, '我认为这项绘画任务很有吸引力。', 'interestEnjoyment'),
  imi(18, '做这项绘画任务时，我感到有压力。', 'pressureTension'),
  imi(19, '我觉得自己必须完成这项绘画任务。', 'perceivedChoice', true),
  imi(20, '我认为这次绘画体验非常愉快。', 'interestEnjoyment'),
  imi(21, '我做这项绘画任务是因为别无选择。', 'perceivedChoice', true),
  imi(22, '完成一段时间后，我觉得自己有能力继续画下去。', 'perceivedCompetence'),
] as const;

const sus = (number: number, text: string, reverse = false): QuestionnaireItem => ({
  id: `sus${String(number).padStart(2, '0')}`,
  text,
  min: 1,
  max: 5,
  reverse,
});

export const SUS_QUESTIONS = [
  sus(1, '我愿意经常使用这种绘画方式。'),
  sus(2, '我觉得这种绘画方式没必要这么复杂。', true),
  sus(3, '我觉得这种绘画方式容易使用。'),
  sus(4, '我需要技术人员帮助才能使用这种绘画方式。', true),
  sus(5, '这种绘画方式中的不同功能整合得很好。'),
  sus(6, '我觉得这种绘画方式有太多不一致之处。', true),
  sus(7, '我认为大多数人能很快学会使用这种绘画方式。'),
  sus(8, '我觉得这种绘画方式使用起来很笨拙。', true),
  sus(9, '使用这种绘画方式时，我感到很自信。'),
  sus(10, '在使用这种绘画方式前，我需要先学习很多东西。', true),
] as const;

export const POST_QUESTIONS: readonly QuestionnaireItem[] = [
  ...OUTCOME_QUESTIONS,
  ...IMI_QUESTIONS,
  ...SUS_QUESTIONS,
];

/** 保留旧名称，供交接包及既有调用读取完整 v2 题目。 */
export const QUESTIONS = POST_QUESTIONS;

export const LEGACY_PRE_QUESTIONS = PRE_QUESTIONS;
export const LEGACY_POST_QUESTIONS = OUTCOME_QUESTIONS.slice(0, 4);

export const CONSENT_SECTIONS = [
  ['研究目的', '比较传统自由绘画画布与笔触拆解指导，考察绘画初学者是否更容易开始、持续推进并完成作品，以及其创作满足感、内在动机和感知可用性。'],
  ['参与内容', '先完成 90 秒统一练习，再以随机平衡的 AB/BA 顺序完成两轮同图绘画。每轮最多 12 分钟，轮后填写感受、IMI 与 SUS；两轮之间休息 2 分钟，最后接受约 10 分钟口头访谈。全程约 50–60 分钟。'],
  ['记录内容', '记录匿名研究码、年龄段与绘画经验分组、操作事件摘要、问卷、结束状态和作品。作品仅供两位评分者按固定清单评分；默认不记录姓名、联系方式、原始触点坐标或颜色轨迹。'],
  ['可能风险与不适', '可能出现手部疲劳、视觉疲劳、对作品不满意或问卷疲劳。你可以休息、跳过问卷题、提前结束或退出，不会受到惩罚。研究不提供绘画能力、人格或心理诊断。'],
  ['可能受益', '你可能更了解自己的绘画体验，但不保证绘画能力或情绪一定改善。研究结果可能帮助改进面向初学者的绘画交互设计。'],
  ['自愿参与与撤回', '参与完全自愿。可在任何时刻停止；凭当前浏览器研究凭证申请撤回。研究者将处理在线记录与可定位副本，但已经形成且无法回溯个人的匿名汇总可能无法撤回。'],
  ['隐私与保存', `数据私有保存，默认保留至采集后 ${PROTOCOL.retentionDays} 天，仅供获授权研究人员访问。论文与展示只使用去标识汇总或另行取得授权的材料。`],
  ['研究联系与审批', '正式招募前，研究者必须向参与者提供负责人联系方式、补偿办法和适用的导师/伦理审批信息。本系统中的电子同意记录不能替代所在机构要求的签字文件。'],
] as const;
export const INTERVIEW = [
  '哪种方式更容易开始，为什么？',
  '两种方式中，哪些时刻让你想继续画，哪些时刻最想停下来？',
  '哪一次完成后更有满足感，为什么？',
  '笔触提示在哪些时候有帮助、打扰或限制了你？',
  '哪一幅更让你有“这是我画的”的感觉？如果继续使用，你最希望改进什么？',
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
  legacy = false,
): asserts value is Answers {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('问卷格式无效');
  const obj = value as Answers;
  const questions = legacy
    ? post
      ? LEGACY_POST_QUESTIONS
      : LEGACY_PRE_QUESTIONS
    : post
      ? POST_QUESTIONS
      : PRE_QUESTIONS;
  const keys = questions.map((q) => q.id);
  if (
    Object.keys(obj).length !== keys.length ||
    questions.some(
      (q) =>
        !(q.id in obj) ||
        (obj[q.id] !== null &&
          (!Number.isInteger(obj[q.id]) || obj[q.id]! < q.min || obj[q.id]! > q.max)),
    )
  )
    throw new Error('请逐项作答或选择不回答');
}

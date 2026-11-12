import { IMI_QUESTIONS, SUS_QUESTIONS } from './protocol';

export const VERSION = 'expression-2x2-v4';
export const LIMITS = { pilot: 6, formal: 24 };
export const PRACTICE_MS = 90_000;
export const ROUND_MS = 600_000;
export const REST_MS = 120_000;

export const PHOTOS = {
  a: { title: '公园场景 A', path: '/study/expression/park-a.jpg', author: 'Robin Webster', source: 'https://www.geograph.org.uk/photo/4313811' },
  b: { title: '公园场景 B', path: '/study/expression/park-b.jpg', author: 'Gerald England', source: 'https://www.geograph.org.uk/photo/1128583' },
  reserve: { title: '备用公园场景', path: '/study/expression/reserve.jpg', author: 'Nigel Davies', source: 'https://www.geograph.org.uk/photo/468588' },
} as const;
export const PHOTO_LICENSE = 'https://creativecommons.org/licenses/by-sa/2.0/';
export const PRACTICE_PHOTO = '/study/practice.svg';
export const TASK_PROMPT = '请从参考照片出发，用本轮提供的工具表达你想呈现的内容。你可以保留、突出、调整或补充画面内容。时间到时保留当前画面。';

export const IMI_SOURCE = 'https://selfdeterminationtheory.org/wp-content/uploads/2022/02/IMI_Complete.pdf';
export const SUS_SOURCE = 'https://hci-studies.org/methods-and-measures/downloads/SUS_Brooke1996.pdf';
export const IMI = IMI_QUESTIONS.map(item => ({
  ...item,
  text: item.id === 'imi22' ? '做了一会儿这项创作任务后，我觉得自己能够胜任。' : item.text.replaceAll('绘画任务', '创作任务').replace('绘画体验', '创作体验'),
}));
export const SUS = SUS_QUESTIONS.map(item => ({
  ...item,
  text: item.text.replaceAll('这种绘画方式', '这个系统').replace('这个系统使用起来很笨拙', '这个系统使用起来很繁琐'),
}));

const LEGACY_OUTCOME_QUESTIONS = [
  { id:'expressionRealized', text:'刚才的作品体现了我想表达的内容。', max:7 },
  { id:'interactionEffort', text:'为了操作工具并做出想要的效果，我付出了很多努力。', max:7 },
] as const;

export const OUTCOME_QUESTIONS = [
  { ...LEGACY_OUTCOME_QUESTIONS[0], text:'这轮创作让我能够表达我想表达的内容。' },
  { id:'creativeControl', text:'这轮创作中，我能够决定画面里对我重要的内容或布局。', max:7 },
  LEGACY_OUTCOME_QUESTIONS[1],
] as const;

const LEGACY_INTERVIEW_PROMPTS = [
  { id: 'decisions', text: '两轮中，你希望突出什么？成品中哪些地方体现了你的想法，哪些没有？' },
  { id: 'changes', text: '操作或观看过程中，有没有改变过最初的想法？如果有，是什么促使你改变？' },
  { id: 'difficulty', text: '哪些步骤让你停下来、等待或需要帮助？请描述当时发生了什么。' },
  { id: 'comparison', text: '两种方式分别给你留下了哪些选择？还有什么是你想调整却做不到的？' },
] as const;
export const INTERVIEW_PROMPTS = [
  { id:'decisions', text:'比较刚才有素材和无素材的两轮，哪一步让你觉得自己在做创作决定？能举个例子吗？' },
  { id:'changes', text:'有没有想做却做不到的地方？你当时想怎么调整，后来怎么处理？' },
  { id:'difficulty', text:'哪些操作或等待让你停下来或需要帮助？当时发生了什么？' },
  { id:'comparison', text:'哪一轮更容易表达你想呈现的内容，或者两轮差不多？哪些操作让你有这种感受？' },
] as const;

export function experienceQuestions(version: string) {
  return version === VERSION
    ? { outcomes: OUTCOME_QUESTIONS, interview: INTERVIEW_PROMPTS }
    : { outcomes: LEGACY_OUTCOME_QUESTIONS, interview: LEGACY_INTERVIEW_PROMPTS };
}

export const RUBRIC = [
  { id: 'content', title: '内容落实', anchors: '1 关键内容缺失或相反 · 3 部分可辨认，有明显遗漏 · 5 所述关键内容清楚可辨' },
  { id: 'relations', title: '关系组织', anchors: '1 重要位置、主次或尺度与意图冲突 · 3 部分关系可辨认 · 5 对意图重要的关系清楚一致' },
  { id: 'expression', title: '表达线索', anchors: '1 缺少支持主题的线索 · 3 有相关线索但不充分 · 5 相关线索连贯地支持主题' },
] as const;

export type Mode = 'demo' | 'pilot' | 'formal';
export type RecruitmentStage = Exclude<Mode, 'demo'>;
export const GROUP_LABEL = { manual: '手绘组', auto: '自动转绘组' } as const;
export type StudyGroup = keyof typeof GROUP_LABEL;
export type Photo = 'a' | 'b';
export type Step = 'intent' | 'practice' | 'plan1' | 'round1' | 'survey1' | 'rest' | 'plan2' | 'round2' | 'survey2' | 'interview' | 'done';
export type DrawingStep = 'practice' | 'round1' | 'round2';
export type Form = Record<string, string | number | null>;
export type StudyEvent = { type: string; at: number; detail?: string };
export type Round = { photo: Photo; materials: boolean; auto: boolean };
export type Artifact = { at: number; sha256: string; bytes: number };
export type RecordState = {
  id: string; mode: Mode; sequence: number; assignment?: StudyAssignment; status: 'active' | 'completed' | 'exited';
  version: string; createdAt: number; updatedAt: number; step: Step; enteredAt: number; revision: number;
  consent: { acceptedAt: number; version: string; config: StudySetup };
  profile: { age: number; experience: string; device: string; gender: string };
  rounds: [Round, Round]; forms: Partial<Record<Step, Form>>;
  events: Partial<Record<Step, StudyEvent[]>>;
  artwork: Partial<Record<DrawingStep, Artifact>>; reference: Partial<Record<DrawingStep, Artifact>>; draftArtwork?: Partial<Record<DrawingStep, Artifact>>;
  layouts: Partial<Record<DrawingStep, string>>;
  rest?: { elapsedMs: number; endedEarly: boolean };
  ended: Partial<Record<DrawingStep, { at: number; reason: 'submitted' | 'timeout' | 'exited'; elapsedMs: number }>>;
};
export type StudySetup = { researcher: string; contact: string; ethics: string; compensation: string; retentionDays: number };
export const DEFAULT_SETUP: StudySetup = { researcher: '', contact: '', ethics: '', compensation: '', retentionDays: 365 };

export const STEPS: Step[] = ['intent','practice','plan1','round1','survey1','rest','plan2','round2','survey2','interview','done'];
export const STEP_LABEL: Record<Step, string> = {
  intent: '记录初始想法', practice: '熟悉操作', plan1: '第一轮准备', round1: '第一轮创作',
  survey1: '第一轮问卷', rest: '休息', plan2: '第二轮准备', round2: '第二轮创作',
  survey2: '第二轮问卷', interview: '访谈文字记录', done: '测试完成',
};

export function roundsFor(sequence: number): [Round, Round] {
  const auto = sequence >= 4;
  const firstMaterials = sequence % 4 >= 2;
  const firstPhoto = sequence % 2 === 0 ? 'a' : 'b';
  return [
    { auto, materials: firstMaterials, photo: firstPhoto },
    { auto, materials: !firstMaterials, photo: firstPhoto === 'a' ? 'b' : 'a' },
  ];
}
export const PILOT_SLOTS = [0, 2, 3, 4, 5, 7];
export const FORMAL_SLOTS = Array.from({ length: LIMITS.formal }, (_, i) => Math.floor(i / 3));

export function describeRound(round: Round) {
  return `${round.auto ? '自动转绘' : '手绘'} · ${round.materials ? '有素材' : '无素材'} · 照片 ${round.photo.toUpperCase()}`;
}

export function studyAssignments(stage: RecruitmentStage) {
  const prefix = stage === 'formal' ? 'F' : 'P';
  const slots = stage === 'formal' ? FORMAL_SLOTS : PILOT_SLOTS;
  return slots.map((sequence, index) => ({
    code: prefix + String(index + 1).padStart(2, '0'),
    stage,
    group: (sequence >= 4 ? 'auto' : 'manual') as StudyGroup,
    sequence,
    groupSequence: sequence % 4 + 1,
    rounds: roundsFor(sequence).map(round => ({
      ...round,
      condition: `${round.auto ? 'auto' : 'manual'}-${round.materials ? 'materials' : 'no-materials'}`,
      photoPath: PHOTOS[round.photo].path,
    })),
  }));
}
export type StudyAssignment = ReturnType<typeof studyAssignments>[number];

export function findStudyAssignment(stage: RecruitmentStage, code: string) {
  return studyAssignments(stage).find(slot => slot.code === code.trim().toUpperCase());
}
export function drawingStep(step: string): step is DrawingStep {
  return step === 'practice' || step === 'round1' || step === 'round2';
}
export function limitFor(step: Step) {
  return step === 'practice' ? PRACTICE_MS : step === 'rest' ? REST_MS : drawingStep(step) ? ROUND_MS : 0;
}
export function scoreSurveys(form: Form = {}) {
  const answered = (id: string) => typeof form[id] === 'number';
  const imi = Object.fromEntries(['interestEnjoyment','perceivedCompetence','perceivedChoice','pressureTension'].map(name => {
    const items = IMI.filter(item => item.subscale === name);
    const value = items.every(item => answered(item.id))
      ? items.reduce((sum, item) => sum + (item.reverse ? 8 - Number(form[item.id]) : Number(form[item.id])), 0) / items.length
      : null;
    return [name, value];
  }));
  const sus = SUS.every(item => answered(item.id))
    ? 2.5 * SUS.reduce((sum, item) => sum + (item.reverse ? 5 - Number(form[item.id]) : Number(form[item.id]) - 1), 0)
    : null;
  return { imi, sus };
}

export function consentSections(setup: StudySetup, demo = false) {
  return [
    ['研究目的', '本研究考察不同绘制方式和素材编排条件下，参与者如何感受表达、创作决定和工具使用。参与者须年满18周岁。'],
    ['研究过程', '同意后填写基本信息与两张照片的初始构思，完成最多90秒的练习、两轮各最多10分钟的创作及每轮问卷，中间建议休息2分钟，也可提前结束。最后进行简短文字访谈。预计35至45分钟。预试和正式测试按研究者分配的编号进行，编号确定绘制组别与任务顺序。'],
    ['可能的不适与收益', '可能出现视觉疲劳、手部疲劳、等待或对作品不满意。你可以休息、跳过问卷或访谈题目，或随时停止。研究不保证改善绘画能力，也不提供诊断。'],
    ['记录与保密', '系统保存姓名、基本信息、意图、操作摘要、问卷、访谈文字及成品或未完成画面。姓名单独存放，画面可在访谈时回看。研究不采集音视频。论文使用去标识的汇总结果，公开展示个别作品须另行取得同意。'],
    ['自愿退出与撤回', '保存并退出会保留已收集的数据及当前画面。你也可以撤回数据，系统会清除在线身份、记录和作品。已经导出的副本可通过研究者和研究编号申请清理，无法回溯个人的汇总结果可能无法撤回。退出不会受到惩罚。'],
    ['保存期限与联系', `资料计划保存 ${setup.retentionDays} 天，到期由研究者清理。研究者：${setup.researcher || (demo ? '演示模式' : '由研究组织者提供')}。联系方式：${setup.contact || (demo ? '演示不招募参与者' : '由研究组织者提供')}。补偿：${setup.compensation || (demo ? '演示不涉及补偿' : '由研究组织者说明')}。伦理审核信息：${setup.ethics || (demo ? '演示不代表已获伦理审查' : '由研究组织者提供')}。`],
  ];
}

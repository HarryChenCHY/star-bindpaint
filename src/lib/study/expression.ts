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

export const INTERVIEW_VERSION = 'experience-review-v2';
const REVIEW_PROMPTS = [
  { id:'overall', text:'两轮做完后，你对这套工具的整体感受是什么？哪一步给你印象最深，为什么？' },
  { id:'expression', text:'回看两轮画面，哪一轮更顺利地表达了你原先的想法，还是差不多？请指一个表达出来或没有表达出来的地方。' },
  { id:'drawingEffort', text:'为了得到想要的画面，哪一轮更省力、更费力，还是差不多？最明显的是描画、操作工具、等待，还是别的原因？' },
  { id:'composition', text:'比较有素材和无素材的两轮，画面中有哪些决定是你自己做的？请举一个例子，也可以说说有什么想调整却做不到。' },
] as const;
const REFLECTION_PROMPTS = {
  auto: { id:'reflection', text:'看系统逐步画出画面时，你有没有改变原先的想法？如果有，你看到了什么，后来做了什么？如果没有，你当时在关注什么？' },
  manual: { id:'reflection', text:'看着自己画的画面逐渐成形时，你有没有改变原先的想法？如果有，你看到了什么，后来做了什么？如果没有，你当时在关注什么？' },
} as const;
const USE_AGAIN_PROMPT = { id:'useAgain', text:'以后如果你想用图像记录或表达一件事，什么情况下你会考虑用这套工具？什么情况下不会？' } as const;

export function experienceQuestions(version: string, interviewVersion?: string, automatic = false) {
  if (version !== VERSION) return { outcomes: LEGACY_OUTCOME_QUESTIONS, interview: LEGACY_INTERVIEW_PROMPTS };
  return {
    outcomes: OUTCOME_QUESTIONS,
    interview: interviewVersion === INTERVIEW_VERSION
      ? [...REVIEW_PROMPTS, REFLECTION_PROMPTS[automatic ? 'auto' : 'manual'], USE_AGAIN_PROMPT]
      : INTERVIEW_PROMPTS,
  };
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
  version: string; interviewVersion?: string; createdAt: number; updatedAt: number; step: Step; enteredAt: number; revision: number;
  consent: { acceptedAt: number; signedDate?: string; version: string; config: StudySetup };
  profile: { age: number; experience: string; device: string; gender: string };
  rounds: [Round, Round]; forms: Partial<Record<Step, Form>>;
  events: Partial<Record<Step, StudyEvent[]>>;
  artwork: Partial<Record<DrawingStep, Artifact>>; reference: Partial<Record<DrawingStep, Artifact>>; draftArtwork?: Partial<Record<DrawingStep, Artifact>>;
  layouts: Partial<Record<DrawingStep, string>>;
  rest?: { elapsedMs: number; endedEarly: boolean };
  ended: Partial<Record<DrawingStep, { at: number; reason: 'submitted' | 'timeout' | 'exited'; elapsedMs: number }>>;
};
export type StudySetup = { researcher: string; contact: string; ethics?: string; compensation?: string; retentionDays?: number; retentionYears?: number };
export const DEFAULT_SETUP: StudySetup = { researcher: '陈皓宇｜上海交通大学国际文化创意产业学院', contact: 'haharrychen@qq.com', retentionYears: 3 };

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

export const CONSENT_VERSION = 'expression-consent-v3';
export function consentDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(timestamp);
}

export const CONSENT_CONFIRMATION = '我已年满 18 周岁。我已阅读并理解上述研究目的、参与过程、可能的风险与收益、资料使用方式及退出和撤回途径。我知道可以在同意前向研究者提问。我自愿参加本研究，并同意研究者按本同意书所述方式收集、保存和使用本次测试数据。';

export const CONSENT_SECTIONS = [
  { title: '一、研究邀请与目的', paragraphs: [
    '您好！我们邀请您参加「星迹智绘」用户测试。本研究面向年满 18 周岁的参与者，了解不同绘制方式和素材编排功能对数字绘画创作体验的影响。研究关注您怎样把想法变成画面、能否决定画面中对您重要的内容，以及哪些操作让您感到轻松或困难。问卷和访谈请按实际体验填写，作品用于回看和说明创作过程。',
  ] },
  { title: '二、研究过程与方法', paragraphs: [
    '测试预计用时 35 至 45 分钟，包括登记、看图、练习、两轮创作、问卷和书面访谈。',
  ], steps: [
    ['阅读同意书并登记。','请先阅读本同意书。如决定参加，按研究者提供的信息选择测试阶段、绘制组别和参与者编号，填写姓名、年龄、性别、数字绘画经验和本次使用的设备。'],
    ['观看参考照片并记录初始想法。','您将看到两张参考照片，分别写下看图时的感受，以及希望在作品中呈现的内容。例如，您可以写想保留的对象、想突出的位置，或想表现的气氛。'],
    ['熟悉创作工具。','您将使用一张单独的练习图熟悉界面。练习最多 90 秒，准备好后可提前结束练习，进入第一轮准备。'],
    ['完成两轮创作。','您按分配顺序完成两轮，每轮使用一张不同的参考照片。每轮开始前填写简短的创作计划，每轮最多创作 10 分钟。您的绘制方式在两轮中保持一致，一轮提供素材编排功能，另一轮使用该条件下可用的工具完成创作。手绘组在画布上亲自落笔，有素材的一轮可以把图形贴入作品，与手绘笔迹一起构成画面。自动转绘组由系统逐步绘制笔触，有素材的一轮可以自行选择和调整素材，确认后由系统转绘。您可以根据自己的想法决定保留、突出或补充哪些内容。时间到时，系统将尝试保存当前画面。'],
    ['填写每轮问卷。','每轮结束后，您将根据刚完成的那一轮作答，评价自己的表达情况、创作决定、操作负担、兴趣、压力和工具可用性。两轮之间建议休息约 2 分钟，准备好后可以提前进入第二轮。'],
    ['回看作品并完成书面访谈。','两轮结束后，您可以回看已保存的画面，用文字说明整体感受、表达顺畅程度、遇到的困难、自己作出的创作决定，以及观察画面变化后是否改变了想法。'],
  ], after: '按流程完成测试需要填写各阶段的题目。若有不愿回答的问题，您可以停止参与。填写看图感受、创作计划和访谈时，可以围绕作品与操作体验作答，无需写入私人经历或他人的个人信息。' },
  { title: '三、可能的风险与不适', bullets: [
    ['视觉和手部疲劳。','持续看屏幕、使用鼠标、触控板或触屏，可能引起眼睛疲劳或手部不适。您可以休息或停止测试。'],
    ['任务压力或挫折感。','倒计时、陌生的操作、等待系统绘制，或画面效果与预期不一致，可能让您感到紧张、烦躁或失望。您可以提前结束当前轮次，也可以停止参与。测试关注您使用工具的体验，您可以如实报告不满意的地方。'],
    ['网络或设备异常。','断网、浏览器异常关闭或设备故障可能中断测试。系统会保留最近一次成功保存的内容，尚未成功上传的文字或画面可能丢失。发生异常后，您可以联系研究者核对记录。'],
    ['隐私泄露的可能性。','测试包含姓名等个人信息。未经授权的访问、导出文件误传，或在开放题和作品中写入可识别个人的内容，都可能造成隐私泄露。研究者将按第五节所述方式管理资料。'],
  ] },
  { title: '四、研究收益', paragraphs: [
    '参加测试可让您体验不同的数字绘画创作方式，并通过回看两轮作品了解自己在构图、描画和使用素材时的偏好。您可能感受到某种方式更适合自己的表达，也可能觉得两轮差别不大。本研究无法保证提高个人绘画技能、改善作品质量或降低操作负担。',
    '您的反馈将帮助研究者了解，哪些操作能支持绘画初学者表达想法，哪些操作会增加困难，并为改进素材编排、系统绘制反馈和画布交互提供依据。',
  ] },
  { title: '五、隐私保护与资料保存', bullets: [
    ['收集范围。','测试记录包括姓名、年龄、性别、数字绘画经验、操作设备、参与者编号、实验组别和任务顺序。系统还会保存看图感受、创作想法、任务用时、操作记录、问卷答案、书面访谈及已保存的作品或未完成画面。测试程序不采集录音或录像。'],
    ['身份信息与研究资料。','系统将姓名与作答记录分开存放。管理员核对或导出记录时，仍可按参与者编号关联身份与测试资料。研究分析和论文呈现将使用参与者编号，能够识别个人身份的信息将在用于分析或写作的材料中移除。'],
    ['访问与使用。','研究后台设有登录权限，原始记录和导出文件由获授权的研究人员管理，用于本研究的数据核对、分析及学位论文写作。论文可呈现去标识的汇总结果或文字摘录。若文字摘录包含可能识别您的细节，研究者会删除或隐去这些细节。公开展示您的个别作品前，研究者将另行征得您的同意。'],
    ['保存期限。','研究资料自您填写本同意书之日起保存 3 年。保存期限届满后，由研究者清理所掌管的原始记录、作品及导出副本。'],
  ] },
  { title: '六、自愿参加、退出与撤回', paragraphs: [
    '参加本研究由您自行决定。您可以拒绝参加，也可以在测试中随时停止。拒绝或退出不会受到处罚。退出后，服务器保留此前已成功保存的记录和画面。',
    '如希望撤回已提交的数据，请发送邮件至 haharrychen@qq.com，并提供您的参与者编号。研究者核对后，将处理可关联至该编号的测试记录、作品和已导出的副本。已纳入汇总结果且无法关联到个人的数据，可能无法单独撤回。对测试流程、个人资料使用或退出方式有疑问，也可以通过该邮箱联系研究者。',
  ] },
];

/**
 * feedback-engine.ts — 具象化反馈生成器
 * 替代抽象表扬，用 ASD 儿童能理解的方式给反馈
 */

interface FeedbackContext {
  strokeIndex: number;
  totalStrokes: number;
  color: string;
  artistName?: string;
  difficulty: 1 | 2 | 3;
  calmMode: boolean;
  completedToday?: number;  // 今天已完成的笔触数
}

/**
 * 生成具象化反馈文案
 * 安静模式下返回空字符串（UI 只显示 ✓）
 */
export function generateFeedback(ctx: FeedbackContext): string {
  if (ctx.calmMode) return '';

  const remaining = ctx.totalStrokes - ctx.strokeIndex - 1;
  const colorName = classifyColorName(ctx.color);

  // 难度 1：极简描述
  if (ctx.difficulty === 1) {
    const messages = [
      '你画了一笔。',
      `第 ${ctx.strokeIndex + 1} 笔完成了。`,
      `你用了${colorName}。`,
      remaining > 0 ? `还剩 ${remaining} 笔。` : '全部画完了！',
    ];
    return messages[ctx.strokeIndex % messages.length];
  }

  // 难度 2-3：更丰富但仍具体
  const templates = [
    `第 ${ctx.strokeIndex + 1} 笔！你用了${colorName}。`,
    remaining > 0 ? `还剩 ${remaining} 笔就完成了。` : '最后一笔！',
    ctx.artistName ? `你用了${colorName}，${ctx.artistName}也喜欢这个颜色。` : `你用了${colorName}。`,
    `已经完成 ${Math.round((ctx.strokeIndex + 1) / ctx.totalStrokes * 100)}% 了。`,
    '这一笔从这里画到了那里。',
    ctx.completedToday ? `今天已经画了 ${ctx.completedToday} 笔了。` : `第 ${ctx.strokeIndex + 1} 笔。`,
  ];

  return templates[ctx.strokeIndex % templates.length];
}

/**
 * 生成情绪检测触发后的温柔提示
 */
export function generateCalmPrompt(level: 'mild' | 'moderate' | 'severe'): string {
  switch (level) {
    case 'mild':
      return '慢慢来，不着急。';
    case 'moderate':
      return '我们可以休息一下，或者换一笔试试。';
    case 'severe':
      return '没关系，我们休息一下。';
  }
}

/**
 * 共同注意模式的问题生成
 */
export function generateAttentionQuestion(strokeColor: [number, number, number], strokeRegion: { x: number; y: number }, canvasSize: { w: number; h: number }): {
  question: string;
  options: { label: string; correct: boolean }[];
} {
  const colorName = classifyColorFromRGB(strokeColor);
  const isTop = strokeRegion.y < canvasSize.h / 2;
  const isLeft = strokeRegion.x < canvasSize.w / 2;
  const posName = `${isTop ? '上' : '下'}面${isLeft ? '左' : '右'}边`;

  // 随机选一种问题类型（不问颜色——跟画模式下笔触被紫色高亮覆盖，用户看不到原色）
  const type = Math.random();

  if (type < 0.5) {
    // 位置判断
    return {
      question: '刚才画在哪里？',
      options: shuffle([
        { label: posName, correct: true },
        { label: `${isTop ? '下' : '上'}面${isLeft ? '右' : '左'}边`, correct: false },
        { label: '中间', correct: false },
      ]),
    };
  } else {
    // 情感联想 — 没有对错之分，用 "selected" 标记用户选的
    const feelings: Record<string, string> = {
      '红色': '热情', '蓝色': '安静', '绿色': '自然',
      '黄色': '开心', '紫色': '神秘', '橙色': '温暖',
      '青色': '清凉', '白色': '纯净', '黑色': '沉默',
      '灰色': '平静', '粉色': '甜蜜',
    };
    const feeling = feelings[colorName] || '有趣';
    return {
      question: `${colorName}让你想到什么感觉？`,
      options: [
        { label: feeling, correct: false }, // 不用 correct 标记，让回调处理
        { label: '不确定', correct: false },
        { label: '其他感觉', correct: false },
      ],
    };
  }
}

// ── 工具函数 ────────────────────────────────────────────────────────

function classifyColorName(cssColor: string): string {
  const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '彩色';
  return classifyColorFromRGB([parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]);
}

function classifyColorFromRGB(rgb: [number, number, number] | number[]): string {
  const [r, g, b] = rgb.map(v => Math.round(v * (rgb[0] > 1 ? 1 : 255))); // 处理 0-1 和 0-255 两种
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max - min < 30) return max > 180 ? '白色' : max < 80 ? '黑色' : '灰色';

  let h = 0;
  const d = max - min;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;

  if (h < 15 || h >= 345) return '红色';
  if (h < 45) return '橙色';
  if (h < 70) return '黄色';
  if (h < 160) return '绿色';
  if (h < 200) return '青色';
  if (h < 260) return '蓝色';
  if (h < 290) return '紫色';
  return '粉色';
}

// ── SD 渲染等待文案生成 ────────────────────────────────────────────────

import { MASTER_DIALOGUES } from './master-dialogues';

interface CommentaryOpts {
  masterId?: string;
  colorDistribution: { color: string; percentage: number }[];
  strokeRhythm: string;
  durationMinutes: number;
  emotionBefore: string;
  totalStrokes: number;
  freeThemeSteps?: string[];
}

/**
 * 生成 SD 渲染等待期间的动态轮播文案
 * 混合绘画数据 + 大师故事/名言 + 鼓励语
 */
export function generateSDRenderCommentary(opts: CommentaryOpts): string[] {
  const messages: string[] = [];
  const dialogues = opts.masterId ? MASTER_DIALOGUES[opts.masterId] : null;

  // 1. 颜色偏好
  if (opts.colorDistribution.length > 0) {
    const top = opts.colorDistribution[0];
    messages.push(`你最喜欢用${top.color}画画，有${top.percentage}%的笔触都是${top.color}～`);
  }

  // 2. 大师名言
  if (dialogues?.quote) {
    messages.push(`${dialogues.quote}`);
  }

  // 3. 大师鼓励
  if (dialogues?.encouragements?.length) {
    const pick = dialogues.encouragements[Math.floor(Math.random() * dialogues.encouragements.length)];
    messages.push(pick);
  }

  // 4. 绘画时长
  if (opts.durationMinutes > 0) {
    messages.push(`你已经专注地画了${opts.durationMinutes}分钟，每一分钟都在和色彩做朋友～`);
  } else {
    messages.push('每一笔都在和色彩做朋友，慢慢来～');
  }

  // 5. 笔画节奏
  if (opts.strokeRhythm !== '数据不足') {
    messages.push(`你的笔触${opts.strokeRhythm}，大师也是这样找到自己的节奏的。`);
  }

  // 6. 主题引导（如果有）
  if (opts.freeThemeSteps && opts.freeThemeSteps.length > 0) {
    const step = opts.freeThemeSteps[Math.min(opts.freeThemeSteps.length - 1, Math.floor(Math.random() * opts.freeThemeSteps.length))];
    if (step) messages.push(step);
  }

  // 7. 情绪关怀
  const emotionMap: Record<string, string> = {
    happy: '带着开心的心情来画画，画里一定也有阳光的味道。',
    calm: '平静的心情是最好的画布，每一笔都安安静静的。',
    anxious: 'Starry 会用心对待你的每一笔，把焦虑变成温柔的颜色。',
    sad: '画画是一个温暖的朋友，陪着你慢慢变好。',
  };
  if (opts.emotionBefore && emotionMap[opts.emotionBefore]) {
    messages.push(emotionMap[opts.emotionBefore]);
  }

  // 8. 大师故事（如果有）
  if (dialogues?.workStories) {
    const stories = Object.values(dialogues.workStories);
    const pick = stories[Math.floor(Math.random() * stories.length)];
    messages.push(pick);
  }

  return messages;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

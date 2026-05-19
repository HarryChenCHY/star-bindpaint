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

  // 随机选一种问题类型
  const type = Math.random();

  if (type < 0.4) {
    // 颜色识别
    const wrongColors = ['红色', '蓝色', '绿色', '黄色', '紫色', '橙色'].filter(c => c !== colorName);
    const wrong1 = wrongColors[Math.floor(Math.random() * wrongColors.length)];
    const wrong2 = wrongColors.filter(c => c !== wrong1)[Math.floor(Math.random() * (wrongColors.length - 1))];
    return {
      question: '刚才那条线是什么颜色？',
      options: shuffle([
        { label: colorName, correct: true },
        { label: wrong1, correct: false },
        { label: wrong2, correct: false },
      ]),
    };
  } else if (type < 0.7) {
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
    // 情感联想
    const feelings: Record<string, string> = {
      '红色': '热情', '蓝色': '安静', '绿色': '自然',
      '黄色': '开心', '紫色': '神秘', '橙色': '温暖',
    };
    const feeling = feelings[colorName] || '有趣';
    return {
      question: `${colorName}让你想到什么感觉？`,
      options: [
        { label: feeling, correct: true },
        { label: '不确定', correct: true }, // 情感题没有错误答案
        { label: '其他感觉', correct: true },
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

import { MASTER_DIALOGUES } from './master-dialogues';

interface CommentaryOptions {
  masterId?: string;
  colorDistribution: { color: string; percentage: number }[];
  strokeRhythm: string;
  durationMinutes: number;
  totalStrokes: number;
  freeThemeSteps?: string[];
}

/** 生成图像处理期间展示的客观进度提示，不推断用户状态。 */
export function generateSDRenderCommentary(options: CommentaryOptions): string[] {
  const messages: string[] = ['正在保留原画构图，把笔触转换成新的画面质感。'];
  const dialogues = options.masterId ? MASTER_DIALOGUES[options.masterId] : null;

  if (options.totalStrokes > 0) messages.push(`这次作品记录了 ${options.totalStrokes} 笔亲手绘制的笔触。`);
  if (options.colorDistribution.length > 0) {
    const top = options.colorDistribution[0];
    messages.push(`画面中使用最多的是${top.color}，约占已记录笔触的 ${top.percentage}%。`);
  }
  if (options.durationMinutes > 0) messages.push(`本次练习已持续约 ${options.durationMinutes} 分钟。`);
  if (options.strokeRhythm !== '数据不足') messages.push(`本次笔间节奏：${options.strokeRhythm}。`);
  if (dialogues?.quote) messages.push(dialogues.quote);
  if (options.freeThemeSteps?.length) {
    const index = Math.floor(Math.random() * options.freeThemeSteps.length);
    if (options.freeThemeSteps[index]) messages.push(options.freeThemeSteps[index]);
  }
  return messages;
}
